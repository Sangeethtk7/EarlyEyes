"""
Children router — child profile management endpoints under /api/children.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.children import schemas, service
from api.deps import require_parent
from core.database import get_db
from db.models import User

router = APIRouter(prefix="/api/children", tags=["Children"])


def _ok(data, message: str = "Success") -> dict:
    """Build a standardised success response envelope."""
    return {"success": True, "data": data, "message": message}


@router.post("")
async def create_child(
    payload: schemas.ChildCreateRequest,
    current_user: User = Depends(require_parent),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Register a new child profile for the authenticated parent.
    """
    child = await service.create_child(current_user.id, payload, db)
    return _ok(
        schemas.ChildResponse.model_validate(child).model_dump(),
        "Child profile created successfully.",
    )


@router.get("")
async def list_children(
    current_user: User = Depends(require_parent),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Retrieve all children profiles associated with the authenticated parent.
    """
    children = await service.get_children(current_user.id, db)
    return _ok(
        [schemas.ChildResponse.model_validate(c).model_dump() for c in children],
        "Children profiles retrieved successfully.",
    )
