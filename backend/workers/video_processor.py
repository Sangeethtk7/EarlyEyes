"""
Celery application and video processing task.

The Celery app uses Redis as both broker and result backend.
The ``process_video`` task simulates AI processing; the real pipeline
will be connected here in Week 2.
"""
import asyncio
import time

from celery import Celery

from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)

# ── Celery application ────────────────────────────────────────────────────────
celery_app = Celery(
    "earlyeyes",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)


# ── Task ──────────────────────────────────────────────────────────────────────
@celery_app.task(bind=True, name="workers.video_processor.process_video")
def process_video(self, video_id: str) -> dict:
    """
    Simulate AI processing of a screening video.

    Workflow (stub — real AI pipeline connects here in Week 2):
    1. Log the start of processing.
    2. Update the video status to ``processing`` in the database.
    3. Sleep 5 seconds to simulate computation.
    4. Update the video status to ``completed``.
    5. Log completion.

    Args:
        video_id: String UUID of the video record to process.

    Returns:
        Dictionary with ``video_id`` and ``status`` keys.
    """
    logger.info("Starting processing for video", extra={"video_id": video_id})

    # Run the async DB update in a new event loop (Celery workers are sync).
    asyncio.run(_update_video_status(video_id, "processing"))

    logger.info(
        "Video status set to processing", extra={"video_id": video_id}
    )

    # ── Stub: simulate AI workload ────────────────────────────────────────────
    # Replace this block with actual gaze / pose / expression analysis calls.
    time.sleep(5)

    asyncio.run(_update_video_status(video_id, "completed"))

    logger.info("Processing complete for video", extra={"video_id": video_id})
    return {"video_id": video_id, "status": "completed"}


async def _update_video_status(video_id: str, new_status: str) -> None:
    """
    Open an async database session and update the video's processing status.

    This helper is called from the synchronous Celery task using
    ``asyncio.run()``.

    Args:
        video_id: String UUID of the video to update.
        new_status: Target status string (``"processing"`` or ``"completed"``).
    """
    import uuid
    from datetime import datetime, timezone

    from sqlalchemy import select

    from core.database import AsyncSessionLocal
    from db.models import Video, VideoStatus

    status_map = {
        "processing": VideoStatus.processing,
        "completed": VideoStatus.completed,
        "failed": VideoStatus.failed,
    }

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Video).where(Video.id == uuid.UUID(video_id))
        )
        video: Video | None = result.scalar_one_or_none()

        if video:
            video.status = status_map.get(new_status, VideoStatus.processing)
            if new_status == "completed":
                video.processed_at = datetime.now(timezone.utc)
            await session.commit()
            logger.info(
                "Video status updated in DB",
                extra={"video_id": video_id, "status": new_status},
            )
        else:
            logger.warning(
                "Video not found during status update",
                extra={"video_id": video_id},
            )
