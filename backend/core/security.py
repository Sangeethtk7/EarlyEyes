"""
Security utilities: password hashing and JWT token management.
"""
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from core.config import settings

# ── Password hashing context ──────────────────────────────────────────────────
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Password helpers ──────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    """
    Hash *password* using bcrypt and return the digest string.

    Args:
        password: Plain-text password supplied by the user.

    Returns:
        A bcrypt hash string safe to store in the database.
    """
    return _pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """
    Verify that *plain* matches the stored *hashed* password.

    Args:
        plain: Plain-text password to verify.
        hashed: Bcrypt hash retrieved from the database.

    Returns:
        ``True`` if the passwords match, ``False`` otherwise.
    """
    return _pwd_context.verify(plain, hashed)


# ── Token creation ────────────────────────────────────────────────────────────
def _create_token(data: dict[str, Any], expires_delta: timedelta) -> str:
    """
    Internal helper that encodes a JWT with the given payload and expiry.

    Args:
        data: Arbitrary claims to embed in the token payload.
        expires_delta: Token lifetime from the current UTC time.

    Returns:
        Signed JWT string.
    """
    payload = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    payload["exp"] = expire
    payload["iat"] = datetime.now(timezone.utc)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(data: dict[str, Any]) -> str:
    """
    Create a short-lived access token (default: 15 minutes).

    Args:
        data: Claims to include (typically ``{"sub": user_id, "role": role}``).

    Returns:
        Signed JWT access token string.
    """
    return _create_token(
        data, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )


def create_refresh_token(data: dict[str, Any]) -> str:
    """
    Create a long-lived refresh token (default: 7 days).

    Args:
        data: Claims to include (typically ``{"sub": user_id, "role": role}``).

    Returns:
        Signed JWT refresh token string.
    """
    return _create_token(
        data, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )


# ── Token decoding ────────────────────────────────────────────────────────────
def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and validate *token*, returning its payload.

    Raises:
        HTTPException 401: If the token is expired, malformed, or the
            signature cannot be verified.

    Args:
        token: Raw JWT string (without the ``Bearer `` prefix).

    Returns:
        Decoded payload dictionary.
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
