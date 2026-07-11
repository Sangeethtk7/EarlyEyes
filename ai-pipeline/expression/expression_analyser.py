"""
EarlyEyes — Expression Analyzer
Analyzes facial expression variety and social smiling using DeepFace.
High score (0-100) = rich, responsive expressions = lower concern.
Samples every 10th frame — DeepFace is computationally expensive.
"""

import numpy as np
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from utils.logger import get_logger

logger = get_logger("expression_analyzer")


class ExpressionAnalyzer:
    """
    Analyzes facial expression richness using DeepFace emotion detection.

    Key metrics:
        - social_smile_ratio: proportion of frames with clear happy expression
        - emotional_range_score: variety of distinct emotions shown
        - flat_affect_ratio: proportion of frames with no clear expression

    Scoring:
        expression_score >= 70  → rich, socially engaged expressions
        expression_score 40-69  → present but limited range
        expression_score < 40   → reduced variety / flat affect
    """

    # Emotions tracked by DeepFace
    ALL_EMOTIONS    = {"happy", "neutral", "sad", "angry", "surprise", "fear", "disgust"}
    SOCIAL_EMOTIONS = {"happy", "surprise"}   # positive social signals

    # Thresholds
    SMILE_THRESHOLD     = 28.0   # % happy confidence = social smile
    FLAT_AFFECT_THRESHOLD = 22.0 # max emotion % below this = flat affect

    def __repr__(self) -> str:
        return "ExpressionAnalyzer(model=DeepFace, backend=opencv)"

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #

    def _safe_deepface(self, frame) -> dict | None:
        """
        Run DeepFace on a single frame, returning emotion dict or None.
        Catches all DeepFace exceptions gracefully.
        """
        try:
            from deepface import DeepFace
            result = DeepFace.analyze(
                frame,
                actions=["emotion"],
                enforce_detection=False,
                detector_backend="opencv",
                silent=True,
            )
            if isinstance(result, list):
                result = result[0]
            return result
        except Exception as e:
            logger.debug(f"DeepFace error: {e}")
            return None

    def _empty_result(self, reason: str) -> dict:
        """Safe fallback result when analysis cannot proceed."""
        logger.warning(f"Expression analysis unavailable: {reason}")
        return {
            "expression_score":    50.0,
            "frames_analyzed":     0,
            "social_smile_ratio":  0.0,
            "emotional_range_score": 0.5,
            "flat_affect_ratio":   0.0,
            "dominant_emotions":   {},
            "emotion_timeline":    [],
            "interpretation":      f"Expression analysis was unavailable: {reason}",
        }

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def analyze(self, frames: list, sample_every: int = 10) -> dict:
        """
        Analyze facial expression patterns across sampled frames.

        Args:
            frames:       List of RGB numpy arrays from VideoLoader.
            sample_every: Analyze every Nth frame (default 10 — DeepFace is slow).

        Returns:
            dict with expression_score, smile ratio, emotional range,
            flat affect indicator, and clinical interpretation.
        """
        # Check DeepFace is importable
        try:
            from deepface import DeepFace  # noqa: F401
        except ImportError:
            return self._empty_result("DeepFace not installed (pip install deepface)")

        sampled_frames = frames[::sample_every]
        if not sampled_frames:
            return self._empty_result("No frames available")

        emotion_counts:  dict[str, int] = {}
        happy_frames     = 0
        flat_frames      = 0
        frames_analyzed  = 0
        emotion_timeline = []

        for i, frame in enumerate(sampled_frames):
            result = self._safe_deepface(frame)
            if result is None:
                continue

            emotions: dict = result.get("emotion", {})
            dominant: str  = result.get("dominant_emotion", "neutral")

            if not emotions:
                continue

            frames_analyzed += 1

            # Tally dominant emotion
            emotion_counts[dominant] = emotion_counts.get(dominant, 0) + 1

            # Social smile check
            happy_pct = float(emotions.get("happy", 0))
            if happy_pct >= self.SMILE_THRESHOLD:
                happy_frames += 1

            # Flat affect check — no emotion above threshold
            max_pct = max(float(v) for v in emotions.values())
            if max_pct < self.FLAT_AFFECT_THRESHOLD:
                flat_frames += 1

            # Timeline entry (keep first 25 for storage efficiency)
            if len(emotion_timeline) < 25:
                emotion_timeline.append({
                    "frame_index":  i * sample_every,
                    "dominant":     dominant,
                    "happy_pct":    round(happy_pct, 1),
                    "neutral_pct":  round(float(emotions.get("neutral", 0)), 1),
                })

        if frames_analyzed == 0:
            return self._empty_result("No faces detected in sampled frames")

        # ── Aggregate metrics ──────────────────────────────────────────
        social_smile_ratio   = happy_frames  / frames_analyzed
        flat_affect_ratio    = flat_frames   / frames_analyzed
        emotion_variety      = len(emotion_counts)
        # Normalise variety: 5+ distinct emotions = full score
        emotional_range_score = float(np.clip(emotion_variety / 5.0, 0.0, 1.0))

        # ── Expression score ───────────────────────────────────────────
        # Reward smiling + variety, penalise flat affect
        expression_score = float(np.clip(
            social_smile_ratio   * 50 +
            emotional_range_score* 30 +
            (1 - flat_affect_ratio) * 20,
            0.0, 100.0
        ))

        # ── Interpretation ─────────────────────────────────────────────
        if expression_score >= 70:
            interpretation = (
                "A healthy range of facial expressions was observed throughout "
                "the recording, including social smiling and varied emotional "
                "responsiveness. Expression patterns were within typical "
                "developmental range."
            )
        elif expression_score >= 40:
            interpretation = (
                "Facial expressions were present but the range was narrower than "
                "typical. Social smiling was observed in some frames. This pattern "
                "warrants clinical discussion to determine whether it represents a "
                "consistent characteristic."
            )
        else:
            interpretation = (
                "Reduced facial expression variety was observed. Social smiling was "
                "infrequent and a reduced-affect pattern was noted across multiple "
                "frames. Clinical review of expressive communication development "
                "is recommended."
            )

        logger.info(
            f"Expression complete — score={expression_score:.1f}, "
            f"smile={social_smile_ratio:.2f}, flat={flat_affect_ratio:.2f}, "
            f"variety={emotion_variety}"
        )

        return {
            "expression_score":     round(expression_score, 2),
            "frames_analyzed":      frames_analyzed,
            "social_smile_ratio":   round(social_smile_ratio, 3),
            "emotional_range_score":round(emotional_range_score, 3),
            "flat_affect_ratio":    round(flat_affect_ratio, 3),
            "emotion_variety_count":emotion_variety,
            "dominant_emotions":    emotion_counts,
            "emotion_timeline":     emotion_timeline,
            "interpretation":       interpretation,
        }