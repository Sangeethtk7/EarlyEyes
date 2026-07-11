"""
EarlyEyes — Feature Engineer
Combines gaze, pose, and expression module outputs into a
normalised 15-feature numpy vector for the risk classifier.
All features are scaled to [0, 1] where higher = more typical.
"""

import numpy as np
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from utils.logger import get_logger

logger = get_logger("feature_engineer")


class FeatureEngineer:
    """
    Transforms raw module outputs into a fixed-length feature vector.

    Feature layout (15 features, all in [0, 1]):
        0  gaze_score_norm
        1  eye_contact_pct_norm
        2  social_gaze_ratio
        3  gaze_deviation_inv      (inverted: low deviation = high score)
        4  pose_score_norm
        5  hand_flapping_inv       (inverted: low flapping = high score)
        6  repetitive_seq_inv      (inverted: few sequences = high score)
        7  expression_score_norm
        8  social_smile_ratio
        9  emotional_range_score
        10 flat_affect_inv         (inverted: low flat affect = high score)
        11 combined_social         (composite: gaze + expression + smile)
        12 combined_repetitive     (composite: flapping + rep sequences)
        13 overall_engagement      (weighted: gaze 40%, pose 30%, expr 30%)
        14 module_agreement        (how consistent the 3 modules are)
    """

    FEATURE_NAMES = [
        "gaze_score_norm",
        "eye_contact_pct_norm",
        "social_gaze_ratio",
        "gaze_deviation_inv",
        "pose_score_norm",
        "hand_flapping_inv",
        "repetitive_seq_inv",
        "expression_score_norm",
        "social_smile_ratio",
        "emotional_range_score",
        "flat_affect_inv",
        "combined_social",
        "combined_repetitive",
        "overall_engagement",
        "module_agreement",
    ]

    def __repr__(self) -> str:
        return f"FeatureEngineer(n_features={len(self.FEATURE_NAMES)})"

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    def _s(self, val, default: float = 0.5) -> float:
        """
        Safe float coercion with NaN/None guard.
        Returns default if value cannot be converted or is NaN.
        """
        try:
            v = float(val)
            return v if not (np.isnan(v) or np.isinf(v)) else default
        except (TypeError, ValueError):
            return default

    def _norm(self, val, lo: float = 0.0, hi: float = 100.0) -> float:
        """Normalise a value from [lo, hi] range to [0, 1]."""
        return float(np.clip((self._s(val) - lo) / (hi - lo + 1e-9), 0.0, 1.0))

    def _cap_norm(self, val, cap: float) -> float:
        """Normalise a count-based value capped at `cap`, then to [0, 1]."""
        return float(np.clip(self._s(val, 0.0) / cap, 0.0, 1.0))

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def build_feature_vector(
        self,
        gaze:       dict,
        pose:       dict,
        expression: dict,
    ) -> np.ndarray:
        """
        Build the 15-feature normalised vector from module output dicts.

        Args:
            gaze:       Output from GazeAnalyzer.analyze()
            pose:       Output from PoseAnalyzer.analyze()
            expression: Output from ExpressionAnalyzer.analyze()

        Returns:
            numpy float32 array of shape (15,), all values in [0, 1].
        """

        # ── Gaze features (0-3) ───────────────────────────────────────
        f0 = self._norm(gaze.get("gaze_score", 50))
        f1 = self._norm(gaze.get("eye_contact_percentage", 50))
        f2 = self._s(gaze.get("social_gaze_ratio", 0.5))
        f3 = float(np.clip(
            1.0 - self._s(gaze.get("avg_gaze_deviation", 0.3)) * 3.0,
            0.0, 1.0
        ))

        # ── Pose features (4-6) ───────────────────────────────────────
        f4 = self._norm(pose.get("pose_score", 50))
        f5 = float(np.clip(
            1.0 - self._s(pose.get("hand_flapping_likelihood", 0.0)),
            0.0, 1.0
        ))
        f6 = float(np.clip(
            1.0 - self._cap_norm(pose.get("repetitive_movement_sequences", 0), cap=10.0),
            0.0, 1.0
        ))

        # ── Expression features (7-10) ────────────────────────────────
        f7  = self._norm(expression.get("expression_score", 50))
        f8  = self._s(expression.get("social_smile_ratio",    0.0))
        f9  = self._s(expression.get("emotional_range_score", 0.5))
        f10 = float(np.clip(
            1.0 - self._s(expression.get("flat_affect_ratio", 0.0)),
            0.0, 1.0
        ))

        # ── Composite features (11-14) ────────────────────────────────
        # 11: combined social signal (gaze + expression + smile)
        f11 = float(np.mean([f0, f7, f8]))

        # 12: combined repetitive signal (higher = MORE repetitive = worse)
        f12 = float(np.mean([
            1.0 - f5,      # hand flapping present
            1.0 - f6,      # repetitive sequences present
        ]))

        # 13: overall engagement (weighted across all 3 modules)
        f13 = float(f0 * 0.40 + f4 * 0.30 + f7 * 0.30)

        # 14: module agreement (low std = all modules agree = higher confidence)
        module_typical_scores = [f0, f4, f7]
        std = float(np.std(module_typical_scores))
        f14 = float(np.clip(1.0 - std * 2.5, 0.0, 1.0))

        vector = np.array(
            [f0, f1, f2, f3, f4, f5, f6, f7, f8, f9, f10, f11, f12, f13, f14],
            dtype=np.float32,
        )

        logger.info(
            f"Feature vector: gaze={f0:.2f} pose={f4:.2f} expr={f7:.2f} "
            f"social={f11:.2f} repetitive={f12:.2f} engagement={f13:.2f}"
        )

        return vector

    def feature_dict(self, vector: np.ndarray) -> dict:
        """
        Returns a named dict for logging / debugging.
        Maps each feature index to its human-readable name.
        """
        return {
            name: round(float(vector[i]), 4)
            for i, name in enumerate(self.FEATURE_NAMES)
        }