"""
EarlyEyes AI Pipeline
Orchestrates: video loading → gaze → pose → expression → fusion → risk score
Usage: python main.py path/to/video.mp4
"""
import sys
import json
import time
from datetime import datetime, timezone

from utils.logger import get_logger
from preprocess.video_loader import VideoLoader
from gaze.gaze_analyser import GazeAnalyzer
from pose.pose_analyser import PoseAnalyzer
from expression.expression_analyser import ExpressionAnalyzer
from fusion.feature_engineer import FeatureEngineer
from fusion.risk_classifier import RiskClassifier

logger = get_logger("pipeline")

def analyze_video(video_path: str) -> dict:
    """
    Run the full EarlyEyes analysis pipeline on a video file.

    Args:
        video_path: Absolute or relative path to the video file.

    Returns:
        Complete nested result dict with gaze, pose, expression,
        fusion scores and pipeline metadata.
    """
    pipeline_start = time.time()
    logger.info(f"Pipeline started for: {video_path}")

    # ── Step 1: Load video ──────────────────────────────────
    loader = VideoLoader(video_path, sample_every_n_frames=5)
    frames = loader.load()
    metadata = loader.get_metadata()
    logger.info(f"Loaded {len(frames)} frames ({metadata['duration_seconds']}s video)")

    if not frames:
        raise ValueError(f"No frames could be extracted from: {video_path}")

    # ── Step 2: Gaze analysis ───────────────────────────────
    logger.info("Starting gaze analysis...")
    gaze_result = GazeAnalyzer().analyze(frames)
    logger.info(f"Gaze complete. Score: {gaze_result['gaze_score']}")

    # ── Step 3: Pose analysis ───────────────────────────────
    logger.info("Starting pose analysis...")
    pose_result = PoseAnalyzer().analyze(frames)
    logger.info(f"Pose complete. Score: {pose_result['pose_score']}")

    # ── Step 4: Expression analysis ─────────────────────────
    logger.info("Starting expression analysis...")
    expression_result = ExpressionAnalyzer().analyze(frames, sample_every=10)
    logger.info(f"Expression complete. Score: {expression_result['expression_score']}")

    # ── Step 5: Feature engineering ─────────────────────────
    logger.info("Building feature vector...")
    feature_vector = FeatureEngineer().build_feature_vector(
        gaze_result, pose_result, expression_result
    )

    # ── Step 6: Risk classification ─────────────────────────
    logger.info("Running fusion classifier...")
    fusion_result = RiskClassifier().classify(feature_vector)
    logger.info(
        f"Classification complete: {fusion_result['risk_level'].upper()} "
        f"(score={fusion_result['fusion_risk_score']})"
    )

    processing_time = round(time.time() - pipeline_start, 2)

    result = {
        "gaze": gaze_result,
        "pose": pose_result,
        "expression": expression_result,
        "fusion": fusion_result,
        "metadata": {
            "video_path": video_path,
            "processing_time_seconds": processing_time,
            "pipeline_version": "1.0.0",
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "video_metadata": metadata,
            "frames_analyzed": len(frames),
        },
    }

    logger.info(f"Pipeline complete in {processing_time}s")
    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python main.py <path_to_video>")
        sys.exit(1)

    path = sys.argv[1]
    try:
        output = analyze_video(path)
        print(json.dumps(output, indent=2, default=str))
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        print(json.dumps({"error": str(e)}, indent=2))
        sys.exit(1)
