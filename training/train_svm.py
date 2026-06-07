import os
import logging
import cv2
import numpy as np
import pickle
from sklearn.svm import SVC
from sklearn.preprocessing import LabelEncoder
from keras_facenet import FaceNet

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# ================= CONFIGURATION =================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATASET_PATH = os.path.join(BASE_DIR, "..", "dataset")
MODEL_SAVE_PATH = os.path.join(BASE_DIR, "..", "models", "svm", "svm_face_model.pkl")
LABEL_SAVE_PATH = os.path.join(BASE_DIR, "..", "models", "svm", "label_encoder.pkl")
# =================================================

logger.info("Initializing FaceNet extractor")
embedder = FaceNet()

X = []  # embeddings
y = []  # labels (student names)

logger.info("Scanning dataset folder: %s", DATASET_PATH)

# ================= DATASET LOOP =================
for student_name in os.listdir(DATASET_PATH):

    student_dir = os.path.join(DATASET_PATH, student_name)

    if not os.path.isdir(student_dir):
        continue

    logger.info("Processing images for: %s", student_name)

    for image_name in os.listdir(student_dir):

        image_path = os.path.join(student_dir, image_name)

        img = cv2.imread(image_path)

        if img is None:
            continue

        # Convert BGR → RGB (required for FaceNet)
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # Expand dimensions
        img_rgb = np.expand_dims(img_rgb, axis=0)

        # Extract embedding
        embedding = embedder.embeddings(img_rgb)[0]

        X.append(embedding)
        y.append(student_name)

# ================= DATA CHECK =================

# Convert to numpy array
X = np.array(X)

logger.info("Total images processed: %d", len(X))
logger.info("Total students: %d", len(set(y)))

if len(X) == 0:
    logger.error("No embeddings extracted. Check dataset.")
    exit()

# ================= LABEL ENCODING =================

encoder = LabelEncoder()
y_encoded = encoder.fit_transform(y)

# ================= TRAIN SVM =================

logger.info("Training the SVM classifier")

svm_model = SVC(kernel='linear', probability=True)
svm_model.fit(X, y_encoded)

# ================= SAVE MODELS =================

os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)

with open(MODEL_SAVE_PATH, 'wb') as f:
    pickle.dump(svm_model, f)

with open(LABEL_SAVE_PATH, 'wb') as f:
    pickle.dump(encoder, f)

logger.info("Training complete")
logger.info("Models saved to: %s", os.path.dirname(MODEL_SAVE_PATH))