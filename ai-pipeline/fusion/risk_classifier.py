import numpy as np
from utils.logger import get_logger

logger = get_logger("risk_classifier")

class RiskClassifier:
    """
    Rule-based risk classifier (Month 2: replace with trained PyTorch model).
    Combines social, repetitive, and expression component scores into
    a single fusion risk score with clinical risk level.
    """

    VERSION = "rule-based-v1.0"

    LOW_THRESHOLD = 35
    HIGH_THRESHOLD = 65

    def __repr__(self):
        return f"RiskClassifier(version={self.VERSION})"

    def classify(self, feature_vector: np.ndarray) -> dict:
        """
        Classify developmental risk from 15-feature vector.
        Returns score, level, confidence, and clinical summary.
        """
        f = feature_vector

        # Component scores (all in [0,1], higher = more typical)
        social_score = float(np.mean([f[0], f[1], f[2], f[8]]))       # gaze + eye contact + social smile
        repetitive_score = float(np.mean([1 - f[5], 1 - f[6]]))       # hand flapping + rep sequences (inverted)
        expression_score = float(np.mean([f[7], f[9], f[10]]))         # expression + range + no flat affect

        # Risk formula: weighted sum of inverted component scores
        raw_risk = (
            (1 - social_score) * 0.45 +
            repetitive_score * 0.35 +
            (1 - expression_score) * 0.20
        )
        fusion_risk_score = float(np.clip(raw_risk * 100, 0, 100))

        # Risk level
        if fusion_risk_score < self.LOW_THRESHOLD:
            risk_level = "low"
        elif fusion_risk_score < self.HIGH_THRESHOLD:
            risk_level = "moderate"
        else:
            risk_level = "high"

        # Confidence: agreement across components
        component_values = [social_score, 1 - repetitive_score, expression_score]
        confidence = float(np.clip(1 - np.std(component_values) * 2, 0.3, 0.95))

        # Clinical AI summary
        summary = self._generate_summary(
            risk_level, fusion_risk_score,
            social_score, repetitive_score, expression_score
        )

        logger.info(
            f"Risk classification: {risk_level.upper()} "
            f"(score={fusion_risk_score:.1f}, confidence={confidence:.2f})"
        )

        return {
            "fusion_risk_score": round(fusion_risk_score, 2),
            "risk_level": risk_level,
            "confidence": round(confidence, 3),
            "component_scores": {
                "social": round(social_score, 3),
                "repetitive_behaviour": round(repetitive_score, 3),
                "expression": round(expression_score, 3),
            },
            "model_version": self.VERSION,
            "ai_summary": summary,
        }

    def _generate_summary(
        self, level: str, score: float,
        social: float, repetitive: float, expression: float
    ) -> str:
        """Generate professional clinical summary paragraph."""
        if level == "low":
            return (
                f"Automated analysis of this recording yielded a fusion risk score of "
                f"{score:.0f}/100, indicating low developmental concern. "
                f"Social engagement indicators were strong (score: {social:.0%}), "
                f"repetitive behaviour markers were within normal range "
                f"(score: {repetitive:.0%}), and expressive communication patterns "
                f"appeared typical (score: {expression:.0%}). "
                f"Routine developmental monitoring is recommended."
            )
        elif level == "moderate":
            return (
                f"Automated analysis yielded a fusion risk score of {score:.0f}/100, "
                f"indicating moderate developmental indicators warranting clinical review. "
                f"Social gaze and engagement showed variability (score: {social:.0%}). "
                f"Some repetitive movement patterns were noted (score: {repetitive:.0%}). "
                f"Expressive range was present but variable (score: {expression:.0%}). "
                f"A formal developmental assessment is recommended to provide clinical context."
            )
        else:
            return (
                f"Automated analysis yielded a fusion risk score of {score:.0f}/100, "
                f"indicating elevated developmental indicators requiring clinical attention. "
                f"Social engagement was below typical baselines (score: {social:.0%}). "
                f"Elevated repetitive movement patterns were detected (score: {repetitive:.0%}). "
                f"Expressive communication showed reduced variety (score: {expression:.0%}). "
                f"Formal developmental evaluation is strongly recommended. "
                f"Clinical judgment should take precedence over these automated findings."
            )