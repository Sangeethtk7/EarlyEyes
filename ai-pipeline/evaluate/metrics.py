import numpy as np
from utils.logger import get_logger

logger = get_logger("metrics")

def calculate_sensitivity(y_true: list, y_pred: list) -> float:
    """True positive rate — proportion of actual positives correctly identified."""
    tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)
    return tp / (tp + fn + 1e-9)

def calculate_specificity(y_true: list, y_pred: list) -> float:
    """True negative rate — proportion of actual negatives correctly identified."""
    tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)
    fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
    return tn / (tn + fp + 1e-9)

def calculate_auc_roc(y_true: list, y_scores: list) -> float:
    """Calculate AUC-ROC using trapezoidal rule."""
    from sklearn.metrics import roc_auc_score
    try:
        return float(roc_auc_score(y_true, y_scores))
    except Exception as e:
        logger.warning(f"AUC-ROC failed: {e}")
        return 0.0

def generate_report(y_true: list, y_pred: list, y_scores: list) -> dict:
    """Generate full evaluation report with all metrics."""
    sensitivity = calculate_sensitivity(y_true, y_pred)
    specificity = calculate_specificity(y_true, y_pred)
    auc = calculate_auc_roc(y_true, y_scores)
    accuracy = sum(t == p for t, p in zip(y_true, y_pred)) / len(y_true)
    report = {
        "sensitivity": round(sensitivity, 4),
        "specificity": round(specificity, 4),
        "auc_roc": round(auc, 4),
        "accuracy": round(accuracy, 4),
        "n_samples": len(y_true),
    }
    logger.info(f"Evaluation report: {report}")
    return report
