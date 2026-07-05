"""
Pydantic v2 schemas for the reports endpoints.
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

LEGAL_DISCLAIMER = (
    "EarlyEyes is a screening tool, not a diagnostic instrument. "
    "Results should be interpreted by a qualified clinician and must not be "
    "used as the sole basis for any clinical decision. Parents and caregivers "
    "should consult a licensed healthcare professional for formal diagnosis "
    "and treatment planning."
)


class ReportSummary(BaseModel):
    """Lightweight report listing used on dashboard/queue views."""

    id: uuid.UUID
    child_name: str
    status: str
    risk_level: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportDetail(BaseModel):
    """
    Full report detail including AI analysis scores, clinical notes,
    and the mandatory legal disclaimer.
    """

    id: uuid.UUID
    video_id: uuid.UUID
    child_name: str
    status: str

    # AI analysis fields (may be None if analysis is not yet complete)
    fusion_risk_score: Optional[float]
    risk_level: Optional[str]
    confidence: Optional[float]
    gaze_score: Optional[float]
    pose_score: Optional[float]
    expression_score: Optional[float]
    processing_time_seconds: Optional[float]
    model_version: Optional[str]

    # Narrative fields
    ai_summary: Optional[str]
    clinician_notes: Optional[str]
    clinician_risk_override: Optional[str]

    # Timestamps
    created_at: datetime
    reviewed_at: Optional[datetime]
    sent_at: Optional[datetime]

    # Always present
    legal_disclaimer: str = LEGAL_DISCLAIMER

    model_config = {"from_attributes": True}


class ReviewRequest(BaseModel):
    """Payload for a clinician reviewing a report."""

    clinician_notes: str
    risk_override: Optional[str] = None
