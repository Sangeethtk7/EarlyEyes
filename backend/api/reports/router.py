"""
Reports router — /api/reports endpoints.
"""
import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user, require_clinician
from api.reports import service
from api.reports.schemas import ReviewRequest
from core.database import get_db
from db.models import User

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def _ok(data, message: str = "Success") -> dict:
    """Build a standardised success response envelope."""
    return {"success": True, "data": data, "message": message}


@router.get("/")
async def list_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    List all reports accessible to the authenticated user.

    Parents see their children's reports; clinicians see reports from
    assigned parents ordered by creation date (oldest first) to form
    their work queue.

    Returns:
        Success envelope with a list of report summaries.
    """
    results = await service.list_reports(current_user, db)
    return _ok([r.model_dump() for r in results], "Reports retrieved.")


@router.get("/{report_id}")
async def get_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Retrieve the full detail for a single report including AI scores
    and the mandatory legal disclaimer.

    Returns:
        Success envelope with full report detail.
    """
    result = await service.get_report(report_id, current_user, db)
    return _ok(result.model_dump(), "Report retrieved.")


@router.patch("/{report_id}/review")
async def review_report(
    report_id: uuid.UUID,
    payload: ReviewRequest,
    clinician: User = Depends(require_clinician),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Record a clinician's notes and optional risk override on a report
    (clinician only).

    Returns:
        Success envelope with the updated report detail.
    """
    result = await service.review_report(report_id, payload, clinician, db)
    return _ok(result.model_dump(), "Report reviewed successfully.")


@router.post("/{report_id}/send")
async def send_report(
    report_id: uuid.UUID,
    clinician: User = Depends(require_clinician),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Mark a reviewed report as sent to the parent (clinician only).

    Returns:
        Success envelope with the updated report detail.
    """
    result = await service.send_report(report_id, clinician, db)
    return _ok(result.model_dump(), "Report sent to parent.")


@router.get("/{report_id}/pdf")
async def get_report_pdf(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    PDF generation stub — returns a placeholder message.

    Full PDF generation (using WeasyPrint or ReportLab) will be implemented
    in a future sprint.

    Returns:
        Success envelope with an informational message.
    """
    return _ok(
        {"message": "PDF generation coming soon"},
        "PDF generation is not yet implemented.",
    )
