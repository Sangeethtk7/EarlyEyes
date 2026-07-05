"""
Video router — upload and retrieval endpoints under /api/videos.
All routes require authentication.
"""
import uuid

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user, require_parent
from api.videos import service
from core.database import get_db
from db.models import User

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/videos", tags=["Videos"])


def _ok(data, message: str = "Success") -> dict:
    """Build a standardised success response envelope."""
    return {"success": True, "data": data, "message": message}


@router.post("/upload")
async def upload_video(
    request: Request,
    file: UploadFile = File(...),
    child_id: uuid.UUID = Form(...),
    current_user: User = Depends(require_parent),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Upload a screening video for a child (parent only).

    Accepts a multipart form with the video file and the child's UUID.
    Validates the file type and size, saves it to disk, and enqueues
    processing.

    Returns:
        Success envelope with :class:`~api.videos.schemas.VideoUploadResponse`.
    """
    result = await service.upload_video(file, child_id, current_user, db)
    return _ok(result.model_dump(), "Video uploaded and queued for processing.")


@router.get("/{video_id}/status")
async def get_video_status(
    video_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Poll the processing status of a video.

    Returns progress percentage and a flag indicating whether AI analysis
    results are ready.

    Returns:
        Success envelope with :class:`~api.videos.schemas.VideoStatusResponse`.
    """
    result = await service.get_video_status(video_id, current_user, db)
    return _ok(result.model_dump(), "Video status retrieved.")


@router.get("/{video_id}")
async def get_video(
    video_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Retrieve full details for a single video.

    Returns:
        Success envelope with :class:`~api.videos.schemas.VideoDetailResponse`.
    """
    result = await service.get_video(video_id, current_user, db)
    return _ok(result.model_dump(), "Video retrieved.")


@router.get("/")
async def list_videos(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    List all videos accessible to the authenticated user.

    Parents see their own children's videos; clinicians see videos from
    their assigned parents.

    Returns:
        Success envelope with a list of
        :class:`~api.videos.schemas.VideoDetailResponse` objects.
    """
    results = await service.list_videos(current_user, db)
    return _ok([r.model_dump() for r in results], "Videos retrieved.")
