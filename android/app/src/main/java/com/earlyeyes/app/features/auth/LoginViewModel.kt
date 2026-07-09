package com.earlyeyes.app.features.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.earlyeyes.app.core.auth.TokenManager
import com.earlyeyes.app.core.network.ApiService
import com.earlyeyes.app.core.network.LoginRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface LoginUiState {
    object Idle : LoginUiState
    object Loading : LoginUiState
    data class Success(val role: String) : LoginUiState
    data class Error(val message: String) : LoginUiState
}

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun login(email: String, password: String, role: String) {
        if (email.isBlank() || password.isBlank()) {
            _uiState.value = LoginUiState.Error("Please enter your email and password.")
            return
        }
        viewModelScope.launch {
            _uiState.value = LoginUiState.Loading
            try {
                val response = apiService.login(LoginRequest(email.trim(), password, role))
                if (response.isSuccessful && response.body()?.success == true) {
                    val tokenData = response.body()!!.data!!
                    tokenManager.saveTokens(
                        accessToken  = tokenData.access_token,
                        refreshToken = tokenData.refresh_token,
                        role         = tokenData.user.role,
                        name         = tokenData.user.full_name
                    )
                    _uiState.value = LoginUiState.Success(tokenData.user.role)
                } else {
                    val msg = response.body()?.message ?: "Login failed. Please check your credentials."
                    _uiState.value = LoginUiState.Error(msg)
                }
            } catch (e: Exception) {
                _uiState.value = LoginUiState.Error("Network error. Check your connection.")
            }
        }
    }

    fun resetState() {
        _uiState.value = LoginUiState.Idle
    }
}
