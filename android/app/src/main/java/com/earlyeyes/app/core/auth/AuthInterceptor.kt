package com.earlyeyes.app.core.auth

import com.earlyeyes.app.core.network.RefreshRequest
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenManager: TokenManager
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val token = runBlocking { tokenManager.getAccessToken() }

        val requestWithAuth = chain.request().newBuilder().apply {
            if (token != null) {
                header("Authorization", "Bearer $token")
            }
        }.build()

        val response = chain.proceed(requestWithAuth)

        if (response.code == 401) {
            response.close()
            // Attempt token refresh
            val refreshed = runBlocking { attemptTokenRefresh() }
            return if (refreshed != null) {
                val retryRequest = chain.request().newBuilder()
                    .header("Authorization", "Bearer $refreshed")
                    .build()
                chain.proceed(retryRequest)
            } else {
                runBlocking { tokenManager.clearTokens() }
                chain.proceed(chain.request())
            }
        }

        return response
    }

    private suspend fun attemptTokenRefresh(): String? {
        val refreshToken = tokenManager.getRefreshToken() ?: return null
        return try {
            // Minimal Retrofit instance (no auth interceptor to avoid recursion)
            val retrofit = Retrofit.Builder()
                .baseUrl("http://10.0.2.2:8000")
                .addConverterFactory(GsonConverterFactory.create())
                .build()

            val service = retrofit.create(com.earlyeyes.app.core.network.ApiService::class.java)
            val response = service.refreshToken(RefreshRequest(refreshToken))
            if (response.isSuccessful) {
                val tokenResponse = response.body()?.data
                if (tokenResponse != null) {
                    val userName = tokenManager.getUserName() ?: ""
                    val userRole = tokenManager.getUserRole() ?: ""
                    tokenManager.saveTokens(
                        tokenResponse.access_token,
                        tokenResponse.refresh_token,
                        userRole,
                        userName
                    )
                    tokenResponse.access_token
                } else null
            } else null
        } catch (e: Exception) {
            null
        }
    }
}
