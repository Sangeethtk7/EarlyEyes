"""
Business logic for clinical report retrieval, review, and sending.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.reports.schemas import LEGAL_DISCLAIMER, ReportDetail, ReportSummary, ReviewRequest
from core.logging import get_logger
from db.models import (
    AuditLog,
    AnalysisResult,
    Child,
    ClinicianPatient,
    Report,
    ReportStatus,
    User,
    UserRole,
    Video,
)

logger = get_logger(__name__)


# ── Internal helpers ──────────────────────────────────────────────────────────
async def _fetch_report_with_access(
    report_id: uuid.UUID,
    current_user: User,
    db: AsyncSession,
) -> Report:
    """
    Fetch a report and verify the requesting user has permission to access it.

    Parents may only view reports for their own children.
    Clinicians may view reports they are assigned to or any pending report.

    Args:
        report_id: UUID of the report.
        current_user: Authenticated user.
        db: Async database session.

    Returns:
        The :class:`~db.models.Report` ORM instance.

    Raises:
        HTTPException 404: If the report does not exist or access is denied.
    """
    result = await db.execute(
        select(Report)
        .where(Report.id == report_id)
        .options(
            selectinload(Report.video).selectinload(Video.child),
            selectinload(Report.analysis),
        )
    )
    report: Optional[Report] = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    if current_user.role == UserRole.parent:
        if report.video.child.parent_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    # Clinicians can access any report (stricter per-assignment checks can be added)

    return report


def _to_summary(report: Report) -> ReportSummary:
    """Convert a Report ORM object to ReportSummary schema."""
    risk_level = None
    if report.analysis:
        risk_level = report.analysis.risk_level.value if report.analysis.risk_level else None

    child_name = "Unknown"
    if report.video and report.video.child:
        child_name = report.video.child.name

    return ReportSummary(
        id=report.id,
        child_name=child_name,
        status=report.status.value,
        risk_level=risk_level,
        created_at=report.created_at,
    )


def _to_detail(report: Report) -> ReportDetail:
    """Convert a Report ORM object to ReportDetail schema."""
    analysis = report.analysis

    child_name = "Unknown"
    if report.video and report.video.child:
        child_name = report.video.child.name

    return ReportDetail(
        id=report.id,
        video_id=report.video_id,
        child_name=child_name,
        status=report.status.value,
        fusion_risk_score=analysis.fusion_risk_score if analysis else None,
        risk_level=analysis.risk_level.value if (analysis and analysis.risk_level) else None,
        confidence=analysis.confidence if analysis else None,
        gaze_score=analysis.gaze_score if analysis else None,
        pose_score=analysis.pose_score if analysis else None,
        expression_score=analysis.expression_score if analysis else None,
        processing_time_seconds=analysis.processing_time_seconds if analysis else None,
        model_version=analysis.model_version if analysis else None,
        ai_summary=report.ai_summary,
        clinician_notes=report.clinician_notes,
        clinician_risk_override=report.clinician_risk_override,
        created_at=report.created_at,
        reviewed_at=report.reviewed_at,
        sent_at=report.sent_at,
        legal_disclaimer=LEGAL_DISCLAIMER,
    )


# ── Service functions ─────────────────────────────────────────────────────────
async def get_report(
    report_id: uuid.UUID,
    current_user: User,
    db: AsyncSession,
) -> ReportDetail:
    """
    Retrieve full details for a single report.

    Args:
        report_id: UUID of the report.
        current_user: Authenticated user.
        db: Async database session.

    Returns:
        :class:`~api.reports.schemas.ReportDetail`.
    """
    report = await _fetch_report_with_access(report_id, current_user, db)
    return _to_detail(report)


async def list_reports(
    current_user: User,
    db: AsyncSession,
) -> List[ReportSummary]:
    """
    List all reports visible to the authenticated user.

    Parents see reports for their own children.
    Clinicians see reports from assigned parents, ordered oldest first
    (to prioritise the review queue).

    Args:
        current_user: Authenticated user.
        db: Async database session.

    Returns:
        List of :class:`~api.reports.schemas.ReportSummary`.
    """
    if current_user.role == UserRole.parent:
        result = await db.execute(
            select(Report)
            .join(Video, Report.video_id == Video.id)
            .join(Child, Video.child_id == Child.id)
            .where(Child.parent_id == current_user.id)
            .options(
                selectinload(Report.video).selectinload(Video.child),
                selectinload(Report.analysis),
            )
            .order_by(Report.created_at.desc())
        )
    else:
        result = await db.execute(
            select(Report)
            .join(Video, Report.video_id == Video.id)
            .join(Child, Video.child_id == Child.id)
            .join(ClinicianPatient, ClinicianPatient.parent_id == Child.parent_id)
            .where(ClinicianPatient.clinician_id == current_user.id)
            .options(
                selectinload(Report.video).selectinload(Video.child),
                selectinload(Report.analysis),
            )
            .order_by(Report.created_at.asc())
        )

    reports = result.scalars().all()
    return [_to_summary(r) for r in reports]


async def review_report(
    report_id: uuid.UUID,
    data: ReviewRequest,
    clinician: User,
    db: AsyncSession,
) -> ReportDetail:
    """
    Record a clinician's review notes and optional risk override on a report.

    Only clinicians may call this function.

    Args:
        report_id: UUID of the report to review.
        data: Clinician notes and optional risk override.
        clinician: Authenticated clinician user.
        db: Async database session.

    Returns:
        Updated :class:`~api.reports.schemas.ReportDetail`.

    Raises:
        HTTPException 404: If the report is not found.
        HTTPException 409: If the report has already been reviewed.
    """
    report = await _fetch_report_with_access(report_id, clinician, db)

    if report.status == ReportStatus.sent_to_parent:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Report has already been sent to the parent and cannot be re-reviewed.",
        )

    report.clinician_id = clinician.id
    report.clinician_notes = data.clinician_notes
    report.clinician_risk_override = data.risk_override
    report.status = ReportStatus.reviewed
    report.reviewed_at = datetime.now(timezone.utc)

    audit = AuditLog(
        user_id=clinician.id,
        action="REPORT_REVIEWED",
        resource_type="Report",
        resource_id=str(report.id),
    )
    db.add(audit)
    await db.flush()

    logger.info("Report reviewed", extra={"report_id": str(report.id), "clinician_id": str(clinician.id)})
    return _to_detail(report)


async def send_report(
    report_id: uuid.UUID,
    clinician: User,
    db: AsyncSession,
) -> ReportDetail:
    """
    Mark a reviewed report as sent to the parent.

    Only a clinician who has reviewed the report (or any clinician, depending
    on policy) may trigger this action.

    Args:
        report_id: UUID of the report.
        clinician: Authenticated clinician user.
        db: Async database session.

    Returns:
        Updated :class:`~api.reports.schemas.ReportDetail`.

    Raises:
        HTTPException 400: If the report has not been reviewed yet.
    """
    report = await _fetch_report_with_access(report_id, clinician, db)

    if report.status == ReportStatus.pending_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report must be reviewed before it can be sent to the parent.",
        )

    if report.status == ReportStatus.sent_to_parent:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Report has already been sent.",
        )

    report.status = ReportStatus.sent_to_parent
    report.sent_at = datetime.now(timezone.utc)

    audit = AuditLog(
        user_id=clinician.id,
        action="REPORT_SENT",
        resource_type="Report",
        resource_id=str(report.id),
    )
    db.add(audit)
    await db.flush()

    logger.info("Report sent to parent", extra={"report_id": str(report.id)})
    return _to_detail(report)
