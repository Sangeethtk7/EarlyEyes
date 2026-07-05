"""
Clinician router — /api/clinician endpoints (all clinician-only).
"""
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.clinician import service
from api.deps import require_clinician
from core.database import get_db
from db.models import User

router = APIRouter(prefix="/api/clinician", tags=["Clinician"])


def _ok(data, message: str = "Success") -> dict:
    """Build a standardised success response envelope."""
    return {"success": True, "data": data, "message": message}


@router.get("/queue")
async def get_queue(
    clinician: User = Depends(require_clinician),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Return all pending reports in the clinician's review queue.

    Reports are sorted oldest-first so higher-priority (older) cases
    are surfaced at the top.

    Returns:
        Success envelope with a list of pending report summaries.
    """
    results = await service.get_queue(clinician, db)
    return _ok(results, "Queue retrieved.")


@router.get("/patients")
async def get_patients(
    clinician: User = Depends(require_clinician),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Return all parent–child pairs assigned to the clinician.

    Returns:
        Success envelope with a list of patient records.
    """
    results = await service.get_patients(clinician, db)
    return _ok(results, "Patients retrieved.")


@router.post("/patients/{parent_id}/assign")
async def assign_patient(
    parent_id: uuid.UUID,
    clinician: User = Depends(require_clinician),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Assign a parent (and their children) to the clinician.

    This operation is idempotent — assigning an already-assigned parent
    returns a success response without creating a duplicate record.

    Args:
        parent_id: UUID of the parent account to assign.

    Returns:
        Success envelope confirming the assignment.
    """
    result = await service.assign_patient(parent_id, clinician, db)
    return _ok(result, result.get("message", "Patient assigned."))
