"""
Business logic for clinician-specific views: queue, patients, assignment.
"""
import uuid
from typing import List

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.logging import get_logger
from db.models import (
    AuditLog,
    Child,
    ClinicianPatient,
    Report,
    ReportStatus,
    User,
    UserRole,
    Video,
)

logger = get_logger(__name__)


# ── Queue ─────────────────────────────────────────────────────────────────────
async def get_queue(clinician: User, db: AsyncSession) -> list[dict]:
    """
    Return all reports pending clinician review, sorted oldest-first.

    This forms the clinician's working queue — they process reports in
    the order they were created to ensure no case is overlooked.

    Args:
        clinician: Authenticated clinician user.
        db: Async database session.

    Returns:
        List of report summary dictionaries for the clinician's queue.
    """
    result = await db.execute(
        select(Report)
        .join(Video, Report.video_id == Video.id)
        .join(Child, Video.child_id == Child.id)
        .join(ClinicianPatient, ClinicianPatient.parent_id == Child.parent_id)
        .where(
            ClinicianPatient.clinician_id == clinician.id,
            Report.status == ReportStatus.pending_review,
        )
        .options(
            selectinload(Report.video).selectinload(Video.child),
            selectinload(Report.analysis),
        )
        .order_by(Report.created_at.asc())
    )
    reports = result.scalars().all()

    queue = []
    for r in reports:
        risk = None
        if r.analysis and r.analysis.risk_level:
            risk = r.analysis.risk_level.value

        queue.append(
            {
                "report_id": str(r.id),
                "child_name": r.video.child.name if (r.video and r.video.child) else "Unknown",
                "status": r.status.value,
                "risk_level": risk,
                "created_at": r.created_at.isoformat(),
            }
        )

    return queue


# ── Patients ──────────────────────────────────────────────────────────────────
async def get_patients(clinician: User, db: AsyncSession) -> list[dict]:
    """
    Return all parent/child pairs assigned to the clinician.

    Args:
        clinician: Authenticated clinician user.
        db: Async database session.

    Returns:
        List of dictionaries with parent and child information.
    """
    result = await db.execute(
        select(ClinicianPatient)
        .where(ClinicianPatient.clinician_id == clinician.id)
        .options(
            selectinload(ClinicianPatient.parent).selectinload(User.children),
        )
        .order_by(ClinicianPatient.assigned_at.desc())
    )
    assignments = result.scalars().all()

    patients = []
    for assignment in assignments:
        parent = assignment.parent
        for child in parent.children:
            patients.append(
                {
                    "parent_id": str(parent.id),
                    "parent_name": parent.full_name,
                    "parent_email": parent.email,
                    "child_id": str(child.id),
                    "child_name": child.name,
                    "child_dob": child.date_of_birth.isoformat(),
                    "assigned_at": assignment.assigned_at.isoformat(),
                }
            )

    return patients


# ── Assign ────────────────────────────────────────────────────────────────────
async def assign_patient(
    parent_id: uuid.UUID,
    clinician: User,
    db: AsyncSession,
) -> dict:
    """
    Create a clinician–parent assignment.

    Verifies that the target user exists and holds the ``parent`` role.
    Silently succeeds if the assignment already exists (idempotent).

    Args:
        parent_id: UUID of the parent to assign.
        clinician: Authenticated clinician user.
        db: Async database session.

    Returns:
        Dictionary confirming the assignment details.

    Raises:
        HTTPException 404: If the parent account does not exist.
        HTTPException 400: If the target is not a parent.
    """
    result = await db.execute(select(User).where(User.id == parent_id))
    parent: User | None = result.scalar_one_or_none()

    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent account not found.",
        )

    if parent.role != UserRole.parent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The specified user is not a parent account.",
        )

    # Check for existing assignment (idempotent)
    existing = await db.execute(
        select(ClinicianPatient).where(
            ClinicianPatient.clinician_id == clinician.id,
            ClinicianPatient.parent_id == parent_id,
        )
    )
    if existing.scalar_one_or_none():
        return {
            "clinician_id": str(clinician.id),
            "parent_id": str(parent_id),
            "message": "Assignment already exists.",
        }

    assignment = ClinicianPatient(
        clinician_id=clinician.id,
        parent_id=parent_id,
    )
    db.add(assignment)

    audit = AuditLog(
        user_id=clinician.id,
        action="PATIENT_ASSIGNED",
        resource_type="ClinicianPatient",
        resource_id=str(parent_id),
    )
    db.add(audit)
    await db.flush()

    logger.info(
        "Patient assigned to clinician",
        extra={"clinician_id": str(clinician.id), "parent_id": str(parent_id)},
    )

    return {
        "clinician_id": str(clinician.id),
        "parent_id": str(parent_id),
        "message": "Patient assigned successfully.",
    }
