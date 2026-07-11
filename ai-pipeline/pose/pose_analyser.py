"""
EarlyEyes — Pose Analyzer
Detects body pose and repetitive movement patterns using MediaPipe Holistic.
High score (0-100) = more typical, varied movement = lower concern.
"""

import numpy as np
import mediapipe as mp
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from utils.logger import get_logger

logger = get_logger("pose_analyzer")


class PoseAnalyzer:
    """
    Analyzes body movement patterns using MediaPipe Holistic.

    Detects:
        - Wrist velocity and oscillation (hand-flapping proxy)
        - Repetitive movement sequences
        - Overall movement variety

    Scoring:
        pose_score >= 70  → typical movement patterns
        pose_score 40-69  → some elevated movement, monitor
        pose_score < 40   → elevated repetitive patterns, flag for review
    """

    # MediaPipe Pose landmark indices
    LEFT_WRIST       = 15
    RIGHT_WRIST      = 16
    LEFT_SHOULDER    = 11
    RIGHT_SHOULDER   = 12
    LEFT_ELBOW       = 13
    RIGHT_ELBOW      = 14

    # Thresholds
    VELOCITY_THRESHOLD   = 0.025   # movement per frame that counts as "fast"
    OSCILLATION_THRESHOLD= 0.018   # direction-reversal velocity
    MIN_SEQ_LENGTH       = 3       # min consecutive fast frames = repetitive sequence

    def __repr__(self) -> str:
        return "PoseAnalyzer(model=MediaPipe Holistic)"

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #

    def _euclidean(self, p1: tuple, p2: tuple) -> float:
        """2D Euclidean distance between two (x, y) landmark points."""
        return float(np.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2))

    def _calc_velocities(self, positions: list) -> list:
        """
        Calculate frame-to-frame velocity for a sequence of (x,y) positions.
        None entries (no detection) yield 0.0 velocity.
        """
        velocities = []
        for i in range(1, len(positions)):
            if positions[i] is not None and positions[i - 1] is not None:
                velocities.append(self._euclidean(positions[i], positions[i - 1]))
            else:
                velocities.append(0.0)
        return velocities

    def _detect_oscillation(self, positions: list) -> tuple:
        """
        Detect rapid back-and-forth (oscillatory) wrist movement.
        Classic proxy for hand-flapping behaviour.

        Returns:
            (detected: bool, sequence_count: int, max_streak: int)
        """
        if len(positions) < self.MIN_SEQ_LENGTH + 1:
            return False, 0, 0

        # Direction changes: +1 = moving right/down, -1 = left/up
        directions_x = []
        for i in range(1, len(positions)):
            if positions[i] is not None and positions[i - 1] is not None:
                dx = positions[i][0] - positions[i - 1][0]
                directions_x.append(1 if dx > 0 else -1)
            else:
                directions_x.append(0)

        # Count direction reversals within a short window
        reversals    = 0
        sequences    = 0
        streak       = 0
        max_streak   = 0

        for i in range(1, len(directions_x)):
            if directions_x[i] != 0 and directions_x[i - 1] != 0:
                if directions_x[i] != directions_x[i - 1]:
                    reversals += 1
                    streak    += 1
                    max_streak = max(max_streak, streak)
                    if streak >= self.MIN_SEQ_LENGTH:
                        sequences += 1
                        streak     = 0
                else:
                    streak = 0

        detected = sequences > 0
        return detected, sequences, max_streak

    def _movement_variety_score(self, all_velocities: list) -> float:
        """
        Score for how varied the movement is.
        High variance (not all fast, not all still) = more typical.
        Completely still OR all fast oscillation both score lower.
        """
        if not all_velocities:
            return 0.5
        vel_array = np.array(all_velocities)
        mean_vel  = float(np.mean(vel_array))
        std_vel   = float(np.std(vel_array))
        # Reward moderate mean + healthy std (variety)
        variety = min(1.0, std_vel / (mean_vel + 1e-6))
        return float(np.clip(variety, 0, 1))

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def analyze(self, frames: list) -> dict:
        """
        Analyze pose and movement patterns across sampled frames.

        Args:
            frames: List of RGB numpy arrays from VideoLoader.

        Returns:
            dict with pose_score, repetitive movement indicators,
            wrist velocity timeline, and clinical interpretation.
        """
        mp_holistic = mp.solutions.holistic

        left_positions  = []
        right_positions = []
        frames_with_pose  = 0
        frames_with_hands = 0
        arm_positions_left  = []   # elbow y for arm-level analysis
        arm_positions_right = []

        with mp_holistic.Holistic(
            static_image_mode=True,
            min_detection_confidence=0.45,
            min_tracking_confidence=0.45,
        ) as holistic:

            for idx, frame in enumerate(frames):
                try:
                    result = holistic.process(frame)

                    if result.pose_landmarks:
                        frames_with_pose += 1
                        lm = result.pose_landmarks.landmark

                        lw = (lm[self.LEFT_WRIST].x,  lm[self.LEFT_WRIST].y)
                        rw = (lm[self.RIGHT_WRIST].x, lm[self.RIGHT_WRIST].y)
                        left_positions.append(lw)
                        right_positions.append(rw)

                        le = lm[self.LEFT_ELBOW].y
                        re = lm[self.RIGHT_ELBOW].y
                        arm_positions_left.append(le)
                        arm_positions_right.append(re)
                    else:
                        left_positions.append(None)
                        right_positions.append(None)
                        arm_positions_left.append(None)
                        arm_positions_right.append(None)

                    if result.left_hand_landmarks or result.right_hand_landmarks:
                        frames_with_hands += 1

                except Exception as e:
                    logger.warning(f"Pose frame {idx} error: {e}")
                    left_positions.append(None)
                    right_positions.append(None)
                    continue

        # ── Velocity calculation ───────────────────────────────────────
        left_vels  = self._calc_velocities(left_positions)
        right_vels = self._calc_velocities(right_positions)
        combined   = [max(l, r) for l, r in zip(left_vels, right_vels)]

        # ── Oscillation detection ──────────────────────────────────────
        l_detected, l_seqs, l_streak = self._detect_oscillation(left_positions)
        r_detected, r_seqs, r_streak = self._detect_oscillation(right_positions)

        rep_detected  = l_detected or r_detected
        rep_sequences = l_seqs + r_seqs
        max_streak    = max(l_streak, r_streak)

        # ── High velocity ratio ────────────────────────────────────────
        high_vel_count  = sum(1 for v in combined if v > self.VELOCITY_THRESHOLD)
        high_vel_ratio  = high_vel_count / max(len(combined), 1)

        # ── Hand flapping likelihood ───────────────────────────────────
        # Combines oscillation sequences + high velocity proportion
        hand_flapping_likelihood = float(np.clip(
            (rep_sequences * 0.08) + (high_vel_ratio * 0.6),
            0.0, 1.0
        ))

        # ── Movement variety ───────────────────────────────────────────
        variety = self._movement_variety_score(combined)

        # ── Pose score ─────────────────────────────────────────────────
        # Higher = more typical: penalise flapping + reward variety
        pose_score = float(np.clip(
            100 - (hand_flapping_likelihood * 55)
                - (min(rep_sequences, 10) * 3)
                + (variety * 10),
            0, 100
        ))

        # ── Interpretation ─────────────────────────────────────────────
        if pose_score >= 70:
            interpretation = (
                "Movement patterns were varied and appeared age-appropriate. "
                "No significant repetitive motor behaviours were identified. "
                "Limb movements and body orientation were within typical range."
            )
        elif pose_score >= 40:
            interpretation = (
                "Some elevated movement activity was observed. Occasional rapid "
                "or repetitive wrist movement sequences were detected. Clinical "
                "context is important — active play can produce similar patterns."
            )
        else:
            interpretation = (
                "Elevated repetitive movement patterns were observed across "
                "multiple sequences in this recording. Rapid oscillatory wrist "
                "movements were detected at a rate above typical baselines. "
                "Clinical review of motor patterns is recommended."
            )

        avg_vel = float(np.mean(combined)) if combined else 0.0
        max_vel = float(np.max(combined))  if combined else 0.0

        logger.info(
            f"Pose complete — score={pose_score:.1f}, "
            f"rep_seqs={rep_sequences}, flapping={hand_flapping_likelihood:.2f}"
        )

        return {
            "pose_score":                   round(pose_score, 2),
            "frames_with_pose":             frames_with_pose,
            "frames_with_hands":            frames_with_hands,
            "repetitive_movement_detected": rep_detected,
            "repetitive_movement_sequences":rep_sequences,
            "hand_flapping_likelihood":     round(hand_flapping_likelihood, 3),
            "max_oscillation_streak":       max_streak,
            "avg_wrist_velocity":           round(avg_vel, 4),
            "max_wrist_velocity":           round(max_vel, 4),
            "high_velocity_ratio":          round(high_vel_ratio, 3),
            "movement_variety_score":       round(variety, 3),
            "wrist_velocity_timeline":      [round(v, 4) for v in combined],
            "interpretation":               interpretation,
        }