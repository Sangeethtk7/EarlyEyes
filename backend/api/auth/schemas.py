"""
Pydantic v2 schemas for the authentication endpoints.
"""
import uuid
from typing import Literal

from pydantic import BaseModel, EmailStr, field_validator, model_validator


# ── Shared validators ─────────────────────────────────────────────────────────
def _validate_password_strength(password: str) -> str:
    """
    Enforce a minimum password policy:
    - At least 8 characters
    - At least one uppercase letter
    - At least one digit

    Args:
        password: Plain-text password to validate.

    Returns:
        The validated password (unchanged).

    Raises:
        ValueError: If any policy rule is violated.
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not any(c.isupper() for c in password):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not any(c.isdigit() for c in password):
        raise ValueError("Password must contain at least one digit.")
    return password


# ── Signup schemas ────────────────────────────────────────────────────────────
class ParentSignupRequest(BaseModel):
    """
    Registration payload for a parent account.
    Password strength and confirmation are validated on the model.
    """

    full_name: str
    email: EmailStr
    password: str
    confirm_password: str
    agreed_to_disclaimer: bool

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        return _validate_password_strength(v)

    @field_validator("agreed_to_disclaimer")
    @classmethod
    def must_agree(cls, v: bool) -> bool:
        """The user must explicitly accept the disclaimer."""
        if not v:
            raise ValueError(
                "You must agree to the disclaimer to create an account."
            )
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "ParentSignupRequest":
        """Ensure password and confirm_password are identical."""
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


class ClinicianSignupRequest(BaseModel):
    """
    Registration payload for a clinician account.
    Clinicians require additional professional information.
    """

    full_name: str
    email: EmailStr
    password: str
    confirm_password: str
    medical_license: str
    specialty: str
    institution: str
    agreed_to_disclaimer: bool

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        return _validate_password_strength(v)

    @field_validator("agreed_to_disclaimer")
    @classmethod
    def must_agree(cls, v: bool) -> bool:
        """The user must explicitly accept the disclaimer."""
        if not v:
            raise ValueError(
                "You must agree to the disclaimer to create an account."
            )
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "ClinicianSignupRequest":
        """Ensure password and confirm_password are identical."""
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


# ── Login / token schemas ─────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    """Credentials submitted at the login endpoint."""

    email: EmailStr
    password: str
    role: Literal["parent", "clinician"]


class UserResponse(BaseModel):
    """Public-safe representation of a user record."""

    id: uuid.UUID
    email: str
    role: str
    full_name: str
    is_verified: bool

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Response body returned after a successful login or token refresh."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Refresh / logout schemas ──────────────────────────────────────────────────
class RefreshRequest(BaseModel):
    """Payload for the token-refresh endpoint."""

    refresh_token: str


# ── Password reset schemas ────────────────────────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    """Payload for initiating a password-reset flow."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Payload for completing a password-reset flow."""

    token: str
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate new password strength."""
        return _validate_password_strength(v)

    @model_validator(mode="after")
    def passwords_match(self) -> "ResetPasswordRequest":
        """Ensure new_password and confirm_password are identical."""
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self
