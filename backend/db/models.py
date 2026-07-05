"""
SQLAlchemy ORM models for EarlyEyes.
All primary keys are UUID values generated on the Python side.
"""
import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


# ── Helper ────────────────────────────────────────────────────────────────────
def _utcnow() -> datetime:
    """Return the current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)


# ── Enumerations ──────────────────────────────────────────────────────────────
class UserRole(str, enum.Enum):
    """Allowed user roles."""

    parent = "parent"
    clinician = "clinician"


class VideoStatus(str, enum.Enum):
    """Processing lifecycle of an uploaded video."""

    uploaded = "uploaded"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class RiskLevel(str, enum.Enum):
    """AI-derived autism screening risk levels."""

    low = "low"
    moderate = "moderate"
    high = "high"


class ReportStatus(str, enum.Enum):
    """Lifecycle of a clinical report."""

    pending_review = "pending_review"
    reviewed = "reviewed"
    sent_to_parent = "sent_to_parent"


# ── Models ────────────────────────────────────────────────────────────────────
class User(Base):
    """
    Platform user — either a parent or a clinician.

    Parents upload videos of their children; clinicians review AI-generated
    analysis results and issue clinical reports.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(320), unique=True, index=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=_utcnow, nullable=True
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    children: Mapped[list["Child"]] = relationship(
        "Child", back_populates="parent", cascade="all, delete-orphan"
    )
    uploaded_videos: Mapped[list["Video"]] = relationship(
        "Video", foreign_keys="Video.uploaded_by", back_populates="uploader"
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(
        "AuditLog", back_populates="user"
    )
    clinician_assignments: Mapped[list["ClinicianPatient"]] = relationship(
        "ClinicianPatient",
        foreign_keys="ClinicianPatient.clinician_id",
        back_populates="clinician",
    )
    patient_assignments: Mapped[list["ClinicianPatient"]] = relationship(
        "ClinicianPatient",
        foreign_keys="ClinicianPatient.parent_id",
        back_populates="parent",
    )
    clinician_reports: Mapped[list["Report"]] = relationship(
        "Report", foreign_keys="Report.clinician_id", back_populates="clinician"
    )


class Child(Base):
    """
    A child whose screening videos are uploaded by their parent.
    Deleting the parent cascades to all child records.
    """

    __tablename__ = "children"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    parent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[datetime] = mapped_column(Date, nullable=False)
    gender: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    parent: Mapped["User"] = relationship("User", back_populates="children")
    videos: Mapped[list["Video"]] = relationship(
        "Video", back_populates="child", cascade="all, delete-orphan"
    )


class Video(Base):
    """
    A video file uploaded for AI screening analysis.
    Tracks the S3/local storage key, processing status, and timestamps.
    """

    __tablename__ = "videos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("children.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    s3_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[VideoStatus] = mapped_column(
        Enum(VideoStatus, name="video_status"),
        default=VideoStatus.uploaded,
        nullable=False,
    )
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    child: Mapped["Child"] = relationship("Child", back_populates="videos")
    uploader: Mapped["User"] = relationship(
        "User", foreign_keys=[uploaded_by], back_populates="uploaded_videos"
    )
    analysis_results: Mapped[list["AnalysisResult"]] = relationship(
        "AnalysisResult", back_populates="video", cascade="all, delete-orphan"
    )
    reports: Mapped[list["Report"]] = relationship(
        "Report", back_populates="video", cascade="all, delete-orphan"
    )


class AnalysisResult(Base):
    """
    AI pipeline output for a single video.
    Stores per-modality scores and the fused risk assessment.
    """

    __tablename__ = "analysis_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    video_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("videos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    gaze_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    gaze_details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    pose_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    pose_details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    expression_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    expression_details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    fusion_risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    risk_level: Mapped[RiskLevel | None] = mapped_column(
        Enum(RiskLevel, name="risk_level"), nullable=True
    )
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    processing_time_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    video: Mapped["Video"] = relationship("Video", back_populates="analysis_results")
    reports: Mapped[list["Report"]] = relationship(
        "Report", back_populates="analysis"
    )


class Report(Base):
    """
    Clinical report generated from an AI analysis.
    A clinician reviews the AI summary and may add their own notes.
    """

    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    video_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("videos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    analysis_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("analysis_results.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    clinician_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    clinician_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    clinician_risk_override: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, name="report_status"),
        default=ReportStatus.pending_review,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    video: Mapped["Video"] = relationship("Video", back_populates="reports")
    analysis: Mapped["AnalysisResult | None"] = relationship(
        "AnalysisResult", back_populates="reports"
    )
    clinician: Mapped["User | None"] = relationship(
        "User", foreign_keys=[clinician_id], back_populates="clinician_reports"
    )


class ClinicianPatient(Base):
    """
    Association table linking clinicians to the parents (patients) they manage.
    Composite primary key: (clinician_id, parent_id).
    """

    __tablename__ = "clinician_patients"

    clinician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    parent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    clinician: Mapped["User"] = relationship(
        "User",
        foreign_keys=[clinician_id],
        back_populates="clinician_assignments",
    )
    parent: Mapped["User"] = relationship(
        "User",
        foreign_keys=[parent_id],
        back_populates="patient_assignments",
    )


class AuditLog(Base):
    """
    Immutable audit trail of user actions on sensitive resources.
    Used for compliance and forensic investigation.
    """

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    resource_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    user: Mapped["User | None"] = relationship("User", back_populates="audit_logs")
