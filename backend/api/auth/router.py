"""
Auth router — all authentication endpoints under /api/auth.
Rate-limited to 10 requests/minute per IP via slowapi.
"""
from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

import redis.asyncio as aioredis

from api.auth import schemas, service
from api.deps import get_current_user
from core.database import get_db
from core.redis import get_redis
from db.models import User

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# ── Response helpers ──────────────────────────────────────────────────────────


def _ok(data: dict | object, message: str = "Success") -> dict:
    """Build a standardised success response envelope."""
    return {"success": True, "data": data, "message": message}


def _err(error_code: str, message: str) -> dict:
    """Build a standardised error response envelope."""
    return {"success": False, "error": error_code, "message": message}


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("/signup/parent")
@limiter.limit("10/minute")
async def signup_parent(
    request: Request,
    payload: schemas.ParentSignupRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Register a new parent account.

    Rate limited to 10 requests per minute per IP address.

    Returns:
        Success envelope with the created user's basic information.
    """
    user = await service.signup_parent(payload, db)
    return _ok(
        schemas.UserResponse.model_validate(user).model_dump(),
        "Parent account created successfully.",
    )


@router.post("/signup/clinician")
@limiter.limit("10/minute")
async def signup_clinician(
    request: Request,
    payload: schemas.ClinicianSignupRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Register a new clinician account.

    Clinician accounts start unverified and must be approved by an admin.

    Returns:
        Success envelope with the created user's basic information.
    """
    user = await service.signup_clinician(payload, db)
    return _ok(
        schemas.UserResponse.model_validate(user).model_dump(),
        "Clinician account created. Awaiting verification.",
    )


@router.post("/login")
@limiter.limit("10/minute")
async def login(
    request: Request,
    payload: schemas.LoginRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> dict:
    """
    Authenticate a user and return access + refresh JWT tokens.

    Returns:
        Success envelope containing both tokens and user details.
    """
    token_response = await service.login(payload, db, redis)
    return _ok(token_response.model_dump(), "Login successful.")


@router.post("/refresh")
@limiter.limit("10/minute")
async def refresh(
    request: Request,
    payload: schemas.RefreshRequest,
    redis: aioredis.Redis = Depends(get_redis),
) -> dict:
    """
    Exchange a valid refresh token for a new access token.

    Returns:
        Success envelope with the new access token.
    """
    result = await service.refresh_token(payload, redis)
    return _ok(result, "Token refreshed successfully.")


@router.post("/logout")
@limiter.limit("10/minute")
async def logout(
    request: Request,
    payload: schemas.RefreshRequest,
    current_user: User = Depends(get_current_user),
    redis: aioredis.Redis = Depends(get_redis),
) -> dict:
    """
    Revoke the provided refresh token, effectively logging the user out.

    Requires a valid access token in the Authorization header.

    Returns:
        Success envelope with a logout confirmation message.
    """
    await service.logout(payload.refresh_token, redis)
    return _ok({}, "Logged out successfully.")


@router.post("/forgot-password")
@limiter.limit("10/minute")
async def forgot_password(
    request: Request,
    payload: schemas.ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Initiate a password-reset flow for the given email address.

    The endpoint always returns 200 to prevent user enumeration.

    Returns:
        Success envelope with an informational message.
    """
    await service.forgot_password(payload.email, db)
    return _ok(
        {},
        "If an account with that email exists, a reset link has been sent.",
    )


@router.post("/reset-password")
@limiter.limit("10/minute")
async def reset_password(
    request: Request,
    payload: schemas.ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Complete the password-reset flow using the token from the reset email.

    Returns:
        Success envelope confirming the password has been updated.
    """
    await service.reset_password(payload.token, payload.new_password, db)
    return _ok({}, "Password reset successfully. Please log in.")
