"""
EarlyEyes — Gaze Analyzer
Analyzes eye contact and social gaze patterns using MediaPipe Face Mesh.
High score (0-100) = more eye contact = lower developmental concern.
"""

import numpy as np
import mediapipe as mp
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from utils.logger import get_logger

logger = get_logger("gaze_analyzer")


class GazeAnalyzer:
    """
    Analyzes gaze and eye contact patterns frame-by-frame using
    MediaPipe Face Mesh 478-landmark model with iris refinement.

    Scoring:
        gaze_score >= 70  → typical eye contact
        gaze_score 40-69  → variable, worth monitoring
        gaze_score < 40   → reduced eye contact, flag for review
    """

    # Eye landmark indices (MediaPipe Face Mesh)
    LEFT_EYE_INNER  = 133
    LEFT_EYE_OUTER  = 33
    LEFT_EYE_TOP    = 159
    LEFT_EYE_BOTTOM = 145
    RIGHT_EYE_INNER = 362
    RIGHT_EYE_OUTER = 263
    RIGHT_EYE_TOP   = 386
    RIGHT_EYE_BOTTOM= 374

    # Iris landmark indices (only with refine_landmarks=True)
    LEFT_IRIS_CENTER  = 468
    RIGHT_IRIS_CENTER = 473

    def __repr__(self) -> str:
        return "GazeAnalyzer(model=MediaPipe FaceMesh, iris_refinement=True)"

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #

    def _eye_aspect_ratio(
        self, lm, top_idx: int, bottom_idx: int,
        inner_idx: int, outer_idx: int
    ) -> float:
        """
        Eye Aspect Ratio (EAR) — classic metric for detecting open eyes.
        EAR < 0.15 typically means closed/blinking.
        """
        top    = np.array([lm[top_idx].x,    lm[top_idx].y])
        bottom = np.array([lm[bottom_idx].x,  lm[bottom_idx].y])
        inner  = np.array([lm[inner_idx].x,   lm[inner_idx].y])
        outer  = np.array([lm[outer_idx].x,   lm[outer_idx].y])

        vertical   = np.linalg.norm(top - bottom)
        horizontal = np.linalg.norm(inner - outer) + 1e-9
        return float(vertical / horizontal)

    def _iris_gaze_ratio(
        self, lm, iris_idx: int,
        inner_idx: int, outer_idx: int
    ) -> float:
        """
        Returns iris position as a ratio [0-1] within the eye width.
        ~0.5 = looking straight ahead (social gaze).
        Close to 0 or 1 = looking to the side.
        """
        iris_x  = lm[iris_idx].x
        inner_x = lm[inner_idx].x
        outer_x = lm[outer_idx].x
        eye_width = abs(outer_x - inner_x) + 1e-9
        return float((iris_x - min(inner_x, outer_x)) / eye_width)

    def _is_social_gaze(self, lm) -> bool:
        """
        Returns True if the child appears to be looking at the camera.
        Uses iris center position within each eye's horizontal span.
        Social gaze = both irises roughly centered (ratio 0.30–0.70).
        """
        try:
            left_ratio  = self._iris_gaze_ratio(
                lm, self.LEFT_IRIS_CENTER,
                self.LEFT_EYE_INNER, self.LEFT_EYE_OUTER
            )
            right_ratio = self._iris_gaze_ratio(
                lm, self.RIGHT_IRIS_CENTER,
                self.RIGHT_EYE_INNER, self.RIGHT_EYE_OUTER
            )
            return 0.28 <= left_ratio <= 0.72 and 0.28 <= right_ratio <= 0.72
        except Exception:
            return False

    def _face_orientation_deviation(self, lm) -> float:
        """
        Measures how far the face is turned away from the camera.
        Uses nose tip x-position relative to face center.
        0.0 = perfectly centered, higher = turned away.
        """
        nose_x      = lm[1].x   # nose tip
        left_cheek  = lm[234].x
        right_cheek = lm[454].x
        face_center = (left_cheek + right_cheek) / 2
        return float(abs(nose_x - face_center))

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def analyze(self, frames: list) -> dict:
        """
        Analyze gaze patterns across all sampled frames.

        Args:
            frames: List of RGB numpy arrays from VideoLoader.

        Returns:
            dict with gaze_score, eye_contact stats, and interpretation.
        """
        mp_face_mesh = mp.solutions.face_mesh

        frames_with_face       = 0
        frames_with_eye_contact= 0
        frames_eyes_open       = 0
        gaze_deviations        = []
        left_ear_values        = []
        right_ear_values       = []

        with mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,          # enables iris landmarks 468-477
            min_detection_confidence=0.45,
        ) as face_mesh:

            for idx, frame in enumerate(frames):
                try:
                    result = face_mesh.process(frame)
                    if not result.multi_face_landmarks:
                        continue

                    frames_with_face += 1
                    lm = result.multi_face_landmarks[0].landmark

                    # Eye openness
                    left_ear = self._eye_aspect_ratio(
                        lm,
                        self.LEFT_EYE_TOP, self.LEFT_EYE_BOTTOM,
                        self.LEFT_EYE_INNER, self.LEFT_EYE_OUTER,
                    )
                    right_ear = self._eye_aspect_ratio(
                        lm,
                        self.RIGHT_EYE_TOP, self.RIGHT_EYE_BOTTOM,
                        self.RIGHT_EYE_INNER, self.RIGHT_EYE_OUTER,
                    )
                    left_ear_values.append(left_ear)
                    right_ear_values.append(right_ear)
                    eyes_open = (left_ear + right_ear) / 2 > 0.14

                    if eyes_open:
                        frames_eyes_open += 1

                    # Social gaze
                    if eyes_open and self._is_social_gaze(lm):
                        frames_with_eye_contact += 1

                    # Face orientation
                    dev = self._face_orientation_deviation(lm)
                    gaze_deviations.append(dev)

                except Exception as e:
                    logger.warning(f"Gaze frame {idx} error: {e}")
                    continue

        # ── Aggregate metrics ──────────────────────────────────────────
        total          = max(len(frames), 1)
        face_rate      = frames_with_face / total
        eyes_open_rate = frames_eyes_open / max(frames_with_face, 1)
        ec_pct         = frames_with_eye_contact / max(frames_eyes_open, 1)
        social_gaze_ratio = frames_with_eye_contact / max(frames_with_face, 1)
        avg_deviation  = float(np.mean(gaze_deviations)) if gaze_deviations else 0.5
        avg_ear        = float(np.mean(left_ear_values + right_ear_values)) if left_ear_values else 0.2

        # Score: weighted combination
        gaze_score = float(np.clip(
            ec_pct * 55 + social_gaze_ratio * 30 + eyes_open_rate * 15,
            0, 1
        ) * 100)

        # ── Interpretation ────────────────────────────────────────────
        if gaze_score >= 70:
            interpretation = (
                "Eye contact and social gaze patterns were within the typical range. "
                "The child frequently oriented toward the camera with sustained visual "
                "engagement — a positive developmental indicator."
            )
        elif gaze_score >= 40:
            interpretation = (
                "Eye contact was present but variable across the recording. "
                "Social gaze was inconsistent, which may reflect developmental "
                "variation or situational factors. Clinical discussion is recommended."
            )
        else:
            interpretation = (
                "Reduced eye contact and limited social gaze were observed. "
                "The child infrequently oriented toward the camera during the recording. "
                "Clinical review of these gaze patterns is recommended."
            )

        logger.info(f"Gaze complete — score={gaze_score:.1f}, ec%={ec_pct*100:.1f}")

        return {
            "gaze_score":             round(gaze_score, 2),
            "frames_with_face":       frames_with_face,
            "frames_with_eye_contact":frames_with_eye_contact,
            "eye_contact_percentage": round(ec_pct * 100, 2),
            "social_gaze_ratio":      round(social_gaze_ratio, 3),
            "avg_gaze_deviation":     round(avg_deviation, 3),
            "avg_eye_aspect_ratio":   round(avg_ear, 3),
            "face_detection_rate":    round(face_rate * 100, 2),
            "interpretation":         interpretation,
        }