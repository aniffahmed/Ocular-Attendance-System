import pickle
import logging
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

def test_model_accuracy():
    logger.info("Loading AI model...")
    
    # 1. Load your trained SVM model (Make sure the path matches where your .pkl is saved)
    # with open("models/svm_model.pkl", "rb") as file:
    #     model = pickle.load(file)
    
    # 2. Provide the "Ground Truth" (The actual names of the people in your test photos)
    # In a real scenario, you would load these from a testing folder.
    y_true = ["Anif", "Anif", "Stranger", "Anif", "Stranger"]
    
    # 3. Provide the "Predictions" (What your AI guessed when looking at those photos)
    # y_pred = model.predict(test_face_embeddings) 
    
    # --- FOR TESTING NOW: Let's use fake predictions so you can see how the math works ---
    y_pred = ["Anif", "Stranger", "Stranger", "Anif", "Anif"] 

    # 4. Generate the Report
    logger.info("--- AI PERFORMANCE REPORT ---")
    logger.info("Overall Accuracy: %.2f%%", accuracy_score(y_true, y_pred) * 100)

    logger.info("Detailed Classification Report:")
    logger.info("%s", classification_report(y_true, y_pred))

    logger.info("Confusion Matrix:")
    logger.info("%s", confusion_matrix(y_true, y_pred))

if __name__ == "__main__":
    test_model_accuracy()