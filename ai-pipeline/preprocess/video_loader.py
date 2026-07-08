import cv2
import numpy as np
from utils.logger import get_logger

logger = get_logger("video_loader")

class VideoLoader:
    """
    Loads a video file and extracts frames for pipeline processing.
    Samples every Nth frame to balance accuracy vs performance.
    """
    def __init__(self, video_path: str, sample_every_n_frames: int = 5):
        self.video_path = video_path
        self.sample_every = sample_every_n_frames
        self._cap = None
        self._metadata = None

    def __repr__(self):
        return f"VideoLoader(path={self.video_path}, sample_every={self.sample_every})"

    def load(self) -> list[np.ndarray]:
        """
        Extract sampled frames from the video.
        Returns list of RGB numpy arrays resized to max 640x480.
        """
        cap = cv2.VideoCapture(self.video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {self.video_path}")

        frames = []
        frame_count = 0

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = total_frames / fps if fps > 0 else 0

        self._metadata = {
            "fps": fps,
            "total_frames": total_frames,
            "duration_seconds": round(duration, 2),
            "width": width,
            "height": height,
        }

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_count += 1
            if frame_count % self.sample_every != 0:
                continue

            # Resize if larger than 640x480
            if frame.shape[1] > 640 or frame.shape[0] > 480:
                frame = cv2.resize(frame, (640, 480))

            # BGR to RGB
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(rgb)

        cap.release()
        self._metadata["sampled_frame_count"] = len(frames)
        logger.info(f"Loaded {len(frames)} frames from {self.video_path}")
        return frames

    def get_metadata(self) -> dict:
        """Returns video metadata. Call after load()."""
        if self._metadata is None:
            raise RuntimeError("Call load() before get_metadata()")
        return self._metadata