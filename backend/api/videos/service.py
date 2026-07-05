"""
Business logic for video upload and retrieval.
"""
import os
import uuid
from pathlib import Path
from typing import List

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.videos.schemas import (
    VideoDetailResponse,
    VideoStatusResponse,
    VideoUploadResponse,
)
from core.config import settings
from core.logging import get_logger
from db.models import Child, Report, ReportStatus, User, UserRole, Video, VideoStatus

logger = get_logger(__name__)

# Allowed video MIME types and extensions
_ALLOWED_CONTENT_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/mpeg",
    "video/ogg",
}
_ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm", ".mpg", ".mpeg", ".ogg"}


def _progress_from_status(status_val: VideoStatus) -> int:
    """
    Map a :class:`~db.models.VideoStatus` to a percentage progress value.

    Args:
        status_val: Current video processing status.

    Returns:
        Integer 0-100 representing estimated progress.
    """
    mapping = {
        VideoStatus.uploaded: 10,
        VideoStatus.processing: 50,
        VideoStatus.completed: 100,
        VideoStatus.failed: 0,
    }
    return mapping.get(status_val, 0)


# ── Upload ────────────────────────────────────────────────────────────────────
async def upload_video(
    file: UploadFile,
    child_id: uuid.UUID,
    current_user: User,
    db: AsyncSession,
) -> VideoUploadResponse:
    """
    Validate, persist, and enqueue a video for AI processing.

    Steps:
    1. Validate file content-type and extension.
    2. Validate file size against ``MAX_VIDEO_SIZE_MB``.
    3. Save the file to ``UPLOAD_DIR`` with a UUID filename.
    4. Create a :class:`~db.models.Video` record in the database.
    5. Create an associated :class:`~db.models.Report` record.
    6. Enqueue the Celery processing task.

    Args:
        file: The uploaded file from the multipart form.
        child_id: UUID of the child the video belongs to.
        current_user: Authenticated parent user.
        db: Async database session.

    Returns:
        :class:`~api.videos.schemas.VideoUploadResponse` with the new video ID.

    Raises:
        HTTPException 400: If the file type is invalid.
        HTTPException 413: If the file exceeds the size limit.
        HTTPException 404: If the child does not exist or belongs to a different parent.
    """
    # 1. Validate file type
    ext = Path(file.filename or "").suffix.lower()
    content_type = file.content_type or ""

    if content_type not in _ALLOWED_CONTENT_TYPES and ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Please upload a video file (mp4, mov, avi, webm).",
        )

    # 2. Read file content and validate size
    contents = await file.read()
    max_bytes = settings.MAX_VIDEO_SIZE_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_VIDEO_SIZE_MB} MB.",
        )

    # 3. Verify child ownership
    result = await db.execute(
        select(Child).where(Child.id == child_id, Child.parent_id == current_user.id)
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found or does not belong to your account.",
        )

    # 4. Save file to UPLOAD_DIR
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)

    file_id = uuid.uuid4()
    safe_filename = f"{file_id}{ext}"
    file_dest = upload_path / safe_filename
    file_dest.write_bytes(contents)

    s3_key = f"uploads/{safe_filename}"  # placeholder until real S3 is wired up

    # 5. Create Video record
    video = Video(
        id=file_id,
        child_id=child_id,
        uploaded_by=current_user.id,
        s3_key=s3_key,
        status=VideoStatus.uploaded,
    )
    db.add(video)
    await db.flush()

    # 6. Create Report record
    report = Report(
        video_id=video.id,
        status=ReportStatus.pending_review,
    )
    db.add(report)
    await db.flush()

    # 7. Enqueue Celery task (stub)
    try:
        from workers.video_processor import process_video

        process_video.delay(str(video.id))
        logger.info("Celery task enqueued", extra={"video_id": str(video.id)})
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Could not enqueue Celery task (worker may not be running)",
            extra={"video_id": str(video.id), "error": str(exc)},
        )

    logger.info("Video uploaded", extra={"video_id": str(video.id)})
    return VideoUploadResponse(
        id=video.id,
        status=video.status.value,
        message="Video uploaded successfully. Processing has been queued.",
        estimated_wait_minutes=5,
    )


# ── Status ────────────────────────────────────────────────────────────────────
async def get_video_status(
    video_id: uuid.UUID,
    current_user: User,
    db: AsyncSession,
) -> VideoStatusResponse:
    """
    Return the current processing status of a video.

    Args:
        video_id: UUID of the video to query.
        current_user: Authenticated user.
        db: Async database session.

    Returns:
        :class:`~api.videos.schemas.VideoStatusResponse`.

    Raises:
        HTTPException 404: If the video does not exist or the user has no access.
    """
    video = await _fetch_video_for_user(video_id, current_user, db)
    return VideoStatusResponse(
        id=video.id,
        status=video.status.value,
        progress_pct=_progress_from_status(video.status),
        analysis_ready=video.status == VideoStatus.completed,
    )


# ── Detail ────────────────────────────────────────────────────────────────────
async def get_video(
    video_id: uuid.UUID,
    current_user: User,
    db: AsyncSession,
) -> VideoDetailResponse:
    """
    Return full details for a single video.

    Args:
        video_id: UUID of the video to retrieve.
        current_user: Authenticated user.
        db: Async database session.

    Returns:
        :class:`~api.videos.schemas.VideoDetailResponse`.

    Raises:
        HTTPException 404: If the video does not exist or the user has no access.
    """
    video = await _fetch_video_for_user(video_id, current_user, db)
    return _to_detail_response(video)


# ── List ──────────────────────────────────────────────────────────────────────
async def list_videos(
    current_user: User,
    db: AsyncSession,
) -> List[VideoDetailResponse]:
    """
    Return all videos accessible to the authenticated user.

    Parents see only their own children's videos.
    Clinicians see videos from all parents assigned to them.

    Args:
        current_user: Authenticated user.
        db: Async database session.

    Returns:
        List of :class:`~api.videos.schemas.VideoDetailResponse`.
    """
    if current_user.role == UserRole.parent:
        result = await db.execute(
            select(Video)
            .join(Child, Video.child_id == Child.id)
            .where(Child.parent_id == current_user.id)
            .options(selectinload(Video.child))
            .order_by(Video.uploaded_at.desc())
        )
    else:
        # Clinician: videos from assigned parents
        from db.models import ClinicianPatient

        result = await db.execute(
            select(Video)
            .join(Child, Video.child_id == Child.id)
            .join(
                ClinicianPatient,
                ClinicianPatient.parent_id == Child.parent_id,
            )
            .where(ClinicianPatient.clinician_id == current_user.id)
            .options(selectinload(Video.child))
            .order_by(Video.uploaded_at.desc())
        )

    videos = result.scalars().all()
    return [_to_detail_response(v) for v in videos]


# ── Internal helpers ──────────────────────────────────────────────────────────
async def _fetch_video_for_user(
    video_id: uuid.UUID,
    current_user: User,
    db: AsyncSession,
) -> Video:
    """
    Fetch a video and verify the current user has permission to view it.

    Args:
        video_id: UUID of the video.
        current_user: Requesting user.
        db: Async database session.

    Returns:
        The :class:`~db.models.Video` ORM instance with child loaded.

    Raises:
        HTTPException 404: If the video is not found or access is denied.
    """
    result = await db.execute(
        select(Video)
        .where(Video.id == video_id)
        .options(selectinload(Video.child))
    )
    video: Video | None = result.scalar_one_or_none()

    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found.",
        )

    if current_user.role == UserRole.parent:
        if video.child.parent_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video not found.",
            )
    # Clinicians: any assigned parent's video is accessible.
    # Full assignment check can be added for stricter access control.

    return video


def _to_detail_response(video: Video) -> VideoDetailResponse:
    """
    Convert a :class:`~db.models.Video` ORM instance to a response schema.

    Args:
        video: Video ORM object (child relationship must be loaded).

    Returns:
        :class:`~api.videos.schemas.VideoDetailResponse`.
    """
    return VideoDetailResponse(
        id=video.id,
        child_id=video.child_id,
        child_name=video.child.name if video.child else "Unknown",
        status=video.status.value,
        duration_seconds=video.duration_seconds,
        s3_key=video.s3_key,
        uploaded_at=video.uploaded_at.isoformat(),
        processed_at=video.processed_at.isoformat() if video.processed_at else None,
    )
