package com.earlyeyes.app.core.network

import com.google.gson.annotations.SerializedName

// ── Response wrapper ──────────────────────────────────────────────────────────
data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val message: String
)

// ── Auth ───────────────────────────────────────────────────────────────────────
data class LoginRequest(
    val email: String,
    val password: String,
    val role: String
)

data class TokenResponse(
    val access_token: String,
    val refresh_token: String,
    val user: UserResponse
)

data class UserResponse(
    val id: String,
    val email: String,
    val role: String,
    val full_name: String,
    val is_verified: Boolean
)

data class SignupParentRequest(
    val full_name: String,
    val email: String,
    val password: String,
    val confirm_password: String,
    val agreed_to_disclaimer: Boolean
)

// ── Video ──────────────────────────────────────────────────────────────────────
data class VideoResponse(
    val id: String,
    val status: String,
    val uploaded_at: String,
    val child_name: String?
)

data class VideoUploadResponse(
    val id: String,
    val status: String,
    val message: String
)

data class VideoStatusResponse(
    val id: String,
    val status: String,
    val progress_pct: Int,
    val analysis_ready: Boolean
)

// ── Child ──────────────────────────────────────────────────────────────────────
data class ChildResponse(
    val id: String,
    val name: String,
    val date_of_birth: String,
    val gender: String?
)

data class CreateChildRequest(
    val name: String,
    val date_of_birth: String,
    val gender: String?,
    val notes: String?
)

// ── Analysis & Report ─────────────────────────────────────────────────────────
data class AnalysisResult(
    val gaze_score: Float,
    val pose_score: Float,
    val expression_score: Float,
    val fusion_risk_score: Float,
    val risk_level: String,
    val confidence: Float
)

data class ReportResponse(
    val id: String,
    val child_name: String?,
    val analysis: AnalysisResult?,
    val ai_summary: String?,
    val clinician_notes: String?,
    val status: String,
    val created_at: String,
    val risk_level: String?
)

// ── Clinician queue ────────────────────────────────────────────────────────────
data class QueueItemResponse(
    val report_id: String,
    val child_name: String,
    val child_age: String,
    val parent_name: String,
    val uploaded_at: String,
    val risk_level: String?
)

data class ReviewRequest(
    val clinician_notes: String,
    val risk_override: String?
)

// ── Refresh token ──────────────────────────────────────────────────────────────
data class RefreshTokenRequest(
    val refresh_token: String
)
