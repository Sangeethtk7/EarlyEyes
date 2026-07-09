package com.earlyeyes.app.core.network

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // ── Auth ──────────────────────────────────────────────────────────────────
    @POST("/api/auth/login")
    suspend fun login(@Body body: LoginRequest): Response<ApiResponse<TokenResponse>>

    @POST("/api/auth/signup/parent")
    suspend fun signupParent(@Body body: SignupParentRequest): Response<ApiResponse<UserResponse>>

    @POST("/api/auth/logout")
    suspend fun logout(): Response<ApiResponse<Unit>>

    @POST("/api/auth/refresh")
    suspend fun refreshToken(@Body body: RefreshRequest): Response<ApiResponse<TokenResponse>>

    // ── Videos ───────────────────────────────────────────────────────────────
    @Multipart
    @POST("/api/videos/upload")
    suspend fun uploadVideo(
        @Part file: MultipartBody.Part,
        @Part("child_id") childId: RequestBody
    ): Response<ApiResponse<VideoUploadResponse>>

    @GET("/api/videos/{id}/status")
    suspend fun getVideoStatus(@Path("id") id: String): Response<ApiResponse<VideoStatusResponse>>

    @GET("/api/videos")
    suspend fun getVideos(): Response<ApiResponse<List<VideoResponse>>>

    // ── Reports ───────────────────────────────────────────────────────────────
    @GET("/api/reports/{id}")
    suspend fun getReport(@Path("id") id: String): Response<ApiResponse<ReportResponse>>

    // ── Children ──────────────────────────────────────────────────────────────
    @GET("/api/children")
    suspend fun getChildren(): Response<ApiResponse<List<ChildResponse>>>

    @POST("/api/children")
    suspend fun createChild(@Body body: CreateChildRequest): Response<ApiResponse<ChildResponse>>

    // ── Clinician ─────────────────────────────────────────────────────────────
    @GET("/api/clinician/queue")
    suspend fun getQueue(): Response<ApiResponse<List<QueueItemResponse>>>

    @PATCH("/api/reports/{id}/review")
    suspend fun reviewReport(
        @Path("id") id: String,
        @Body body: ReviewRequest
    ): Response<ApiResponse<ReportResponse>>

    @POST("/api/reports/{id}/send")
    suspend fun sendReport(@Path("id") id: String): Response<ApiResponse<Unit>>
}
