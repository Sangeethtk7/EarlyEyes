"""
Reusable FastAPI dependency functions for authentication and authorisation.
"""
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.redis import get_redis, is_token_blacklisted
from core.security import decode_token
from db.models import User

# OAuth2 scheme — clients send the token as ``Authorization: Bearer <token>``
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Validate the Bearer token and return the authenticated user.

    Steps:
    1. Decode and verify the JWT signature / expiry.
    2. Check the token is not on the Redis blacklist (post-logout).
    3. Fetch the user from the database.
    4. Verify the account is active.

    Args:
        token: Raw JWT extracted from the ``Authorization`` header.
        db: Async database session (injected).

    Returns:
        The authenticated :class:`~db.models.User` ORM instance.

    Raises:
        HTTPException 401: If the token is invalid, expired, blacklisted,
            or the user does not exist.
        HTTPException 403: If the user account is inactive.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Decode JWT (raises 401 if invalid/expired)
    payload = decode_token(token)

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    # 2. Check blacklist
    if await is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Fetch user from DB
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == uid))
    user: User | None = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    # 4. Account active check
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Please contact support.",
        )

    return user


async def require_parent(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency that asserts the authenticated user holds the *parent* role.

    Args:
        current_user: Authenticated user (injected via :func:`get_current_user`).

    Returns:
        The same user if they are a parent.

    Raises:
        HTTPException 403: If the user is not a parent.
    """
    if current_user.role.value != "parent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to parent accounts.",
        )
    return current_user


async def require_clinician(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency that asserts the authenticated user holds the *clinician* role.

    Args:
        current_user: Authenticated user (injected via :func:`get_current_user`).

    Returns:
        The same user if they are a clinician.

    Raises:
        HTTPException 403: If the user is not a clinician.
    """
    if current_user.role.value != "clinician":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to clinician accounts.",
        )
    return current_user
