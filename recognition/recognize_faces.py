import logging
import os
import cv2
import numpy as np
import pickle
import sqlite3
import math
from datetime import datetime
from keras_facenet import FaceNet
from retinaface import RetinaFace
import mediapipe as mp

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# ================= PATH SETUP =================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "..", "models", "svm", "svm_face_model.pkl")
LABEL_PATH = os.path.join(BASE_DIR, "..", "models", "svm", "label_encoder.pkl")
DB_PATH = os.path.join(BASE_DIR, "..", "database", "attendance.db")
ACTIVE_DEPARTMENT_CODE = (os.getenv("OCULAR_DEPARTMENT_CODE", "").strip().upper() or None)
ACTIVE_PERIOD_NUMBER = (os.getenv("OCULAR_PERIOD_NUMBER", "").strip() or None)
if ACTIVE_PERIOD_NUMBER is not None:
    try:
        ACTIVE_PERIOD_NUMBER = int(ACTIVE_PERIOD_NUMBER)
    except ValueError:
        ACTIVE_PERIOD_NUMBER = None

CONFIDENCE_THRESHOLD = 0.70
EAR_THRESHOLD = 0.22
BLINK_FRAMES = 2
# ==============================================


# ================= DATABASE ===================
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    department_code TEXT,
    period_number INTEGER
)
""")

cols = {r[1] for r in cursor.execute("PRAGMA table_info(attendance)").fetchall()}
if "department_code" not in cols:
    cursor.execute("ALTER TABLE attendance ADD COLUMN department_code TEXT")
if "period_number" not in cols:
    cursor.execute("ALTER TABLE attendance ADD COLUMN period_number INTEGER")

conn.commit()

marked_attendance = set()

def mark_attendance(name):
    if name in marked_attendance:
        return

    now = datetime.now()
    date = now.strftime("%Y-%m-%d")
    time = now.strftime("%H:%M:%S")

    cursor.execute(
        "INSERT INTO attendance (name, date, time, department_code, period_number) VALUES (?, ?, ?, ?, ?)",
        (name, date, time, ACTIVE_DEPARTMENT_CODE, ACTIVE_PERIOD_NUMBER),
    )

    conn.commit()

    marked_attendance.add(name)

    clean_name = name.replace("_", " ").title()

    if ACTIVE_DEPARTMENT_CODE:
        logger.info("Attendance marked for %s at %s [%s]", clean_name, time, ACTIVE_DEPARTMENT_CODE)
    else:
        logger.info("Attendance marked for %s at %s", clean_name, time)

# ==============================================


# ================= EAR FUNCTION ===============
def euclidean_distance(p1, p2):
    return math.dist(p1, p2)

def get_ear(landmarks, top, bottom, left, right, img_w, img_h):

    p_top = (landmarks[top].x * img_w, landmarks[top].y * img_h)
    p_bottom = (landmarks[bottom].x * img_w, landmarks[bottom].y * img_h)
    p_left = (landmarks[left].x * img_w, landmarks[left].y * img_h)
    p_right = (landmarks[right].x * img_w, landmarks[right].y * img_h)

    height = euclidean_distance(p_top, p_bottom)
    width = euclidean_distance(p_left, p_right)

    if width == 0:
        return 0

    return height / width
# ==============================================


logger.info("Loading FaceNet...")
embedder = FaceNet()

logger.info("Loading SVM model...")
with open(MODEL_PATH, "rb") as f:
    svm_model = pickle.load(f)

logger.info("Loading Label Encoder...")
with open(LABEL_PATH, "rb") as f:
    encoder = pickle.load(f)

logger.info("Loading MediaPipe FaceMesh...")
mp_face_mesh = mp.solutions.face_mesh

face_mesh = mp_face_mesh.FaceMesh(
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

logger.info("System ready. Starting camera...")

cap = cv2.VideoCapture(0)

blink_counter = 0

while True:

    ret, frame = cap.read()

    if not ret:
        break

    frame = cv2.flip(frame, 1)

    img_h, img_w, _ = frame.shape


    # ================= LIVENESS =================

    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mesh_results = face_mesh.process(frame_rgb)

    blink_detected = False

    if mesh_results.multi_face_landmarks:

        for face_landmarks in mesh_results.multi_face_landmarks:

            right_ear = get_ear(face_landmarks.landmark,159,145,33,133,img_w,img_h)
            left_ear = get_ear(face_landmarks.landmark,386,374,362,263,img_w,img_h)

            avg_ear = (right_ear + left_ear) / 2.0

            if avg_ear < EAR_THRESHOLD:
                blink_counter += 1
            else:
                if blink_counter >= BLINK_FRAMES:
                    blink_detected = True
                blink_counter = 0


    # ================= FACE DETECTION =================

    faces = RetinaFace.detect_faces(frame)

    if isinstance(faces, dict):

        for face in faces.values():

            x1, y1, x2, y2 = face["facial_area"]

            face_crop = frame[y1:y2, x1:x2]

            if face_crop.size == 0:
                continue

            face_crop = cv2.resize(face_crop,(160,160))

            face_crop_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)

            face_crop_rgb = np.expand_dims(face_crop_rgb, axis=0)

            embedding = embedder.embeddings(face_crop_rgb)

            prediction = svm_model.predict(embedding)

            probabilities = svm_model.predict_proba(embedding)

            confidence = np.max(probabilities)

            raw_name = encoder.inverse_transform(prediction)[0]

            display_name = raw_name.replace("_"," ").title()


            # ================= LOGIC =================

            if confidence < CONFIDENCE_THRESHOLD:

                label = f"Unknown ({confidence:.2f})"
                color = (0,0,255)

            else:

                if raw_name in marked_attendance:

                    label = f"{display_name} - Already Marked"
                    color = (255,165,0)

                else:

                    if blink_detected:

                        mark_attendance(raw_name)

                        label = f"{display_name} - Attendance Logged"
                        color = (0,255,0)

                    else:

                        label = f"{display_name} - Blink to Verify"
                        color = (0,255,255)


            # ================= UI =================

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

            cv2.putText(
                frame,
                label,
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                color,
                2,
            )


    cv2.imshow("Smart Attendance System", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break


cap.release()
cv2.destroyAllWindows()
conn.close()
