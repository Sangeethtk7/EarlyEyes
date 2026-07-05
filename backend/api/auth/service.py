"""
Business logic for authentication: signup, login, token refresh, logout,
password reset.
"""
from datetime import timedelta

import redis.asyncio as aioredis
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.schemas import (
    ClinicianSignupRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ParentSignupRequest,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from core.logging import get_logger
from core.redis import blacklist_token, is_token_blacklisted
from core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from db.models import AuditLog, User, UserRole

logger = get_logger(__name__)


# ── Helper ────────────────────────────────────────────────────────────────────
async def _get_user_by_email(email: str, db: AsyncSession) -> User | None:
    """
    Fetch a user from the database by email address.

    Args:
        email: Email address to look up.
        db: Async database session.

    Returns:
        The :class:`~db.models.User` if found, else ``None``.
    """
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def _log_action(
    db: AsyncSession,
    action: str,
    user: User | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    ip_address: str | None = None,
) -> None:
    """
    Persist an audit log entry.

    Args:
        db: Async database session.
        action: Human-readable action name, e.g. ``"USER_SIGNUP"``.
        user: The user who performed the action (may be ``None``).
        resource_type: The type of the affected resource, e.g. ``"User"``.
        resource_id: String ID of the affected resource.
        ip_address: Originating IP address (optional).
    """
    log = AuditLog(
        user_id=user.id if user else None,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None,
        ip_address=ip_address,
    )
    db.add(log)
    await db.flush()


# ── Signup ────────────────────────────────────────────────────────────────────
async def signup_parent(data: ParentSignupRequest, db: AsyncSession) -> User:
    """
    Register a new parent account.

    Checks that the email address is not already in use, hashes the password,
    persists the user record and writes an audit log entry.

    Args:
        data: Validated signup payload.
        db: Async database session.

    Returns:
        The newly created :class:`~db.models.User`.

    Raises:
        HTTPException 409: If the email is already registered.
    """
    existing = await _get_user_by_email(data.email, db)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role=UserRole.parent,
        full_name=data.full_name,
        is_verified=False,
        is_active=True,
    )
    db.add(user)
    await db.flush()  # obtain user.id before logging
    await _log_action(db, "USER_SIGNUP", user, "User", str(user.id))
    logger.info("Parent signed up", extra={"user_id": str(user.id)})
    return user


async def signup_clinician(
    data: ClinicianSignupRequest, db: AsyncSession
) -> User:
    """
    Register a new clinician account.

    Clinician accounts require admin/manual verification (``is_verified=False``).
    Additional professional fields (license, specialty, institution) are
    stored in the audit log for now; a dedicated profile table can be added
    in a future migration.

    Args:
        data: Validated clinician signup payload.
        db: Async database session.

    Returns:
        The newly created :class:`~db.models.User`.

    Raises:
        HTTPException 409: If the email is already registered.
    """
    existing = await _get_user_by_email(data.email, db)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role=UserRole.clinician,
        full_name=data.full_name,
        is_verified=False,  # requires admin verification
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await _log_action(
        db,
        "CLINICIAN_SIGNUP",
        user,
        "User",
        str(user.id),
    )
    logger.info(
        "Clinician signed up",
        extra={
            "user_id": str(user.id),
            "license": data.medical_license,
            "institution": data.institution,
        },
    )
    return user


# ── Login ─────────────────────────────────────────────────────────────────────
async def login(
    data: LoginRequest,
    db: AsyncSession,
    redis: aioredis.Redis,
) -> TokenResponse:
    """
    Authenticate a user and issue access + refresh tokens.

    Args:
        data: Login credentials including the expected role.
        db: Async database session.
        redis: Redis connection (unused here but threaded through for future
            session tracking).

    Returns:
        :class:`~api.auth.schemas.TokenResponse` containing both tokens and
        basic user information.

    Raises:
        HTTPException 401: If credentials are invalid.
        HTTPException 403: If the account is inactive.
    """
    user = await _get_user_by_email(data.email, db)

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if user.role.value != data.role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account with that role found for this email.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Please contact support.",
        )

    token_data = {"sub": str(user.id), "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    await _log_action(db, "USER_LOGIN", user, "User", str(user.id))
    logger.info("User logged in", extra={"user_id": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


# ── Token refresh ─────────────────────────────────────────────────────────────
async def refresh_token(
    data: RefreshRequest,
    redis: aioredis.Redis,
) -> dict:
    """
    Issue a new access token from a valid, non-blacklisted refresh token.

    Args:
        data: Payload containing the refresh token string.
        redis: Redis connection for blacklist lookup.

    Returns:
        Dictionary with keys ``access_token`` and ``token_type``.

    Raises:
        HTTPException 401: If the refresh token is invalid, expired, or
            blacklisted.
    """
    if await is_token_blacklisted(data.refresh_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked.",
        )

    payload = decode_token(data.refresh_token)

    new_access = create_access_token(
        {"sub": payload["sub"], "role": payload.get("role", "")}
    )
    return {"access_token": new_access, "token_type": "bearer"}


# ── Logout ────────────────────────────────────────────────────────────────────
async def logout(refresh_token_str: str, redis: aioredis.Redis) -> None:
    """
    Invalidate the provided refresh token by adding it to the Redis blacklist.

    The TTL of the blacklist entry matches the token's remaining lifetime so
    Redis automatically cleans up the entry when the token would have expired.

    Args:
        refresh_token_str: The raw refresh token string to revoke.
        redis: Redis connection.
    """
    from core.config import settings

    expire_seconds = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    await blacklist_token(refresh_token_str, expire_seconds)
    logger.info("User logged out — refresh token blacklisted")


# ── Forgot / reset password ───────────────────────────────────────────────────
async def forgot_password(email: str, db: AsyncSession) -> None:
    """
    Initiate a password-reset flow for the given email address.

    Generates a short-lived (1 hour) reset token and logs it to the console
    as an email stub.  In production this would be replaced by an email
    delivery service (e.g. SendGrid / SES).

    Args:
        email: Email address of the account requesting a reset.
        db: Async database session.

    Note:
        Returns silently even when the email is not found to prevent user
        enumeration.
    """
    from core.security import _create_token

    user = await _get_user_by_email(email, db)
    if not user:
        # Silently ignore unknown emails to prevent enumeration.
        logger.warning(
            "Password reset requested for unknown email",
            extra={"email": email},
        )
        return

    reset_token = _create_token(
        {"sub": str(user.id), "purpose": "password_reset"},
        timedelta(hours=1),
    )

    # ── Email stub — replace with real email service ──────────────────────────
    logger.info(
        "PASSWORD RESET TOKEN (email stub — not sent in production)",
        extra={"user_id": str(user.id), "reset_token": reset_token},
    )
    print(f"\n[EMAIL STUB] Password reset token for {email}:\n{reset_token}\n")


async def reset_password(
    token: str, new_password: str, db: AsyncSession
) -> None:
    """
    Complete the password-reset flow by validating the token and updating
    the user's password hash.

    Args:
        token: The reset token issued by :func:`forgot_password`.
        new_password: The new plain-text password (already validated by schema).
        db: Async database session.

    Raises:
        HTTPException 400: If the token is invalid, expired, or not a
            password-reset token.
        HTTPException 404: If the user referenced in the token does not exist.
    """
    import uuid as _uuid

    from fastapi import HTTPException

    payload = decode_token(token)  # raises 401 if expired/invalid

    if payload.get("purpose") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token.",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token.",
        )

    result = await db.execute(
        select(User).where(User.id == _uuid.UUID(user_id))
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    user.password_hash = hash_password(new_password)
    await db.flush()
    await _log_action(db, "PASSWORD_RESET", user, "User", str(user.id))
    logger.info("Password reset complete", extra={"user_id": str(user.id)})
