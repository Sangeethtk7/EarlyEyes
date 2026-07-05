"""
Pydantic v2 schemas for the video endpoints.
"""
import uuid
from typing import Optional

from pydantic import BaseModel


class VideoUploadResponse(BaseModel):
    """Returned immediately after a video is accepted for processing."""

    id: uuid.UUID
    status: str
    message: str
    estimated_wait_minutes: int


class VideoStatusResponse(BaseModel):
    """Polling response for checking video processing progress."""

    id: uuid.UUID
    status: str
    progress_pct: int  # 0-100
    analysis_ready: bool


class VideoDetailResponse(BaseModel):
    """Full video record including associated child name."""

    id: uuid.UUID
    child_id: uuid.UUID
    child_name: str
    status: str
    duration_seconds: Optional[float]
    s3_key: str
    uploaded_at: str
    processed_at: Optional[str]

    model_config = {"from_attributes": True}
