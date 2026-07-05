"""
Application configuration using pydantic-settings.
Reads all settings from environment variables / .env file.
"""
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central configuration class.
    All fields are populated from environment variables or the .env file
    located at the project root.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = (
        "postgresql+asyncpg://earlyeyes:earlyeyes123@localhost:5432/earlyeyes_db"
    )

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── JWT / Security ────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production-use-a-256-bit-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Application ───────────────────────────────────────────────────────────
    APP_NAME: str = "EarlyEyes"
    APP_ENV: str = "development"

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Stored as a comma-separated string in .env, parsed to list below.
    ALLOWED_ORIGINS_STR: str = "http://localhost:3000,http://localhost:5173"

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        """Return CORS origins as a list."""
        return [o.strip() for o in self.ALLOWED_ORIGINS_STR.split(",") if o.strip()]

    # ── File uploads ──────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    MAX_VIDEO_SIZE_MB: int = 500


# Singleton settings instance used throughout the application.
settings = Settings()
