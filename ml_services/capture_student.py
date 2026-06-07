"""
Face capture for registration — same pipeline as capture/capture_faces.py:
RetinaFace detection → crop → save to dataset/<student_name>/.

Embeddings are computed later by training/train_svm.py (FaceNet + SVM), not at capture time.
"""
from __future__ import annotations

import os
import threading
from typing import Callable, Optional

import cv2
from retinaface import RetinaFace

MAX_IMAGES_DEFAULT = 40
IMG_SIZE = 160
PADDING = 10


def _dataset_path(base_dir: str, student_name: str) -> str:
    safe = student_name.strip().lower().replace(" ", "_")
    return os.path.join(base_dir, "dataset", safe)


def run_capture(
    student_name: str,
    *,
    base_dir: str,
    max_images: int = MAX_IMAGES_DEFAULT,
    on_status: Optional[Callable[[str], None]] = None,
    stop_event: Optional[threading.Event] = None,
) -> dict:
    """
    Blocking webcam capture loop. Call from a background thread.

    Returns {"success": bool, "saved": int, "path": str, "error": str|None}
    """
    def log(msg: str) -> None:
        if on_status:
            on_status(msg)

    safe_name = student_name.strip().lower().replace(" ", "_")
    if not safe_name:
        return {"success": False, "saved": 0, "path": "", "error": "student_name is required"}

    data_path = _dataset_path(base_dir, safe_name)
    os.makedirs(data_path, exist_ok=True)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        return {"success": False, "saved": 0, "path": data_path, "error": "Webcam not accessible"}

    count = len(os.listdir(data_path))
    log(f"Saving to {data_path} ({count} existing images)")

    try:
        while True:
            if stop_event and stop_event.is_set():
                log("Capture stopped by server")
                break

            ret, frame = cap.read()
            if not ret:
                log("Failed to grab frame")
                break

            frame = cv2.flip(frame, 1)
            display_frame = frame.copy()
            cv2.putText(
                display_frame,
                f"Saved: {count}/{max_images}",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2,
            )
            cv2.imshow("Ocular — Register (s save, q quit)", display_frame)

            key = cv2.waitKey(1) & 0xFF

            if key == ord("s"):
                faces = RetinaFace.detect_faces(frame)
                if isinstance(faces, dict):
                    largest_face = None
                    max_area = 0
                    for face in faces.values():
                        x1, y1, x2, y2 = face["facial_area"]
                        area = (x2 - x1) * (y2 - y1)
                        if area > max_area:
                            max_area = area
                            largest_face = face

                    if largest_face is not None:
                        x1, y1, x2, y2 = largest_face["facial_area"]
                        h, w, _ = frame.shape
                        x1 = max(0, x1 - PADDING)
                        y1 = max(0, y1 - PADDING)
                        x2 = min(w, x2 + PADDING)
                        y2 = min(h, y2 + PADDING)
                        face_crop = frame[y1:y2, x1:x2]
                        if face_crop.size > 0:
                            face_crop = cv2.resize(face_crop, (IMG_SIZE, IMG_SIZE))
                            file_path = os.path.join(data_path, f"{safe_name}_{count}.jpg")
                            cv2.imwrite(file_path, face_crop)
                            count += 1
                            log(f"Saved image {count}/{max_images}")
                        else:
                            log("Face crop failed")
                else:
                    log("No face detected")

            if key == ord("q") or count >= max_images:
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()

    return {
        "success": True,
        "saved": count,
        "path": data_path,
        "error": None,
    }
