import logging
import cv2
import mediapipe as mp
import math

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
# refine_landmarks=True gives us even better accuracy around the eyes
face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True, min_detection_confidence=0.5, min_tracking_confidence=0.5)

cap = cv2.VideoCapture(0)

# Simple math to calculate the distance between two points
def euclidean_distance(p1, p2):
    return math.dist(p1, p2)

def get_ear(landmarks, top, bottom, left, right, img_w, img_h):
    # Get exact pixel coordinates of the eyelids
    p_top = (landmarks[top].x * img_w, landmarks[top].y * img_h)
    p_bottom = (landmarks[bottom].x * img_w, landmarks[bottom].y * img_h)
    p_left = (landmarks[left].x * img_w, landmarks[left].y * img_h)
    p_right = (landmarks[right].x * img_w, landmarks[right].y * img_h)

    # Calculate height and width of the eye
    height = euclidean_distance(p_top, p_bottom)
    width = euclidean_distance(p_left, p_right)

    # Return the Eye Aspect Ratio (EAR)
    if width == 0:
        return 0

    return height / width

logger.info("Starting blink detection test")

blink_status = "Waiting for blink..."
color = (0, 0, 255) # Red

while cap.isOpened():
    success, image = cap.read()
    if not success:
        break

    # The Hardware Fix
    image = cv2.flip(image, 1)
    img_h, img_w, _ = image.shape
    
    # Process the frame
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(image_rgb)

    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            # Right Eye MediaPipe points: 159 (top), 145 (bottom), 33 (outer), 133 (inner)
            right_ear = get_ear(face_landmarks.landmark, 159, 145, 33, 133, img_w, img_h)
            
            # Left Eye MediaPipe points: 386 (top), 374 (bottom), 362 (inner), 263 (outer)
            left_ear = get_ear(face_landmarks.landmark, 386, 374, 362, 263, img_w, img_h)

            # Average the two eyes together
            avg_ear = (right_ear + left_ear) / 2.0

            # 0.22 is the industry standard threshold for a closed eye
            if avg_ear < 0.22:
                blink_status = "Blink Detected! (Live Human)"
                color = (0, 255, 0) # Green

            # Draw the status on the screen
            cv2.putText(image, blink_status, (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3)
            # Show the live math so you can see it working
            cv2.putText(image, f"Eye Aspect Ratio: {avg_ear:.2f}", (20, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

    cv2.imshow('Ocular - Blink Test', image)

    if cv2.waitKey(5) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()