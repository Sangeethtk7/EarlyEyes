package com.earlyeyes.app.features.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.earlyeyes.app.core.auth.TokenManager
import com.earlyeyes.app.core.network.ApiService
import com.earlyeyes.app.core.network.LoginRequest
import com.earlyeyes.app.core.network.SignupParentRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface SignupUiState {
    object Idle : SignupUiState
    object Loading : SignupUiState
    object Success : SignupUiState
    data class Error(val message: String) : SignupUiState
}

@HiltViewModel
class SignupParentViewModel @Inject constructor(
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _uiState = MutableStateFlow<SignupUiState>(SignupUiState.Idle)
    val uiState: StateFlow<SignupUiState> = _uiState.asStateFlow()

    fun signup(
        fullName: String,
        email: String,
        password: String,
        confirmPassword: String,
        agreedToDisclaimer: Boolean
    ) {
        when {
            fullName.isBlank() || email.isBlank() || password.isBlank() ->
                _uiState.value = SignupUiState.Error("Please fill in all fields.")
            password != confirmPassword ->
                _uiState.value = SignupUiState.Error("Passwords do not match.")
            password.length < 8 ->
                _uiState.value = SignupUiState.Error("Password must be at least 8 characters.")
            !agreedToDisclaimer ->
                _uiState.value = SignupUiState.Error("Please agree to the disclaimer to continue.")
            else -> viewModelScope.launch {
                _uiState.value = SignupUiState.Loading
                try {
                    val signupResponse = apiService.signupParent(
                        SignupParentRequest(
                            full_name           = fullName.trim(),
                            email               = email.trim(),
                            password            = password,
                            confirm_password    = confirmPassword,
                            agreed_to_disclaimer = agreedToDisclaimer
                        )
                    )
                    if (signupResponse.isSuccessful && signupResponse.body()?.success == true) {
                        // Auto-login after signup
                        val loginResponse = apiService.login(
                            LoginRequest(email.trim(), password, "parent")
                        )
                        if (loginResponse.isSuccessful && loginResponse.body()?.success == true) {
                            val tokenData = loginResponse.body()!!.data!!
                            tokenManager.saveTokens(
                                accessToken  = tokenData.access_token,
                                refreshToken = tokenData.refresh_token,
                                role         = tokenData.user.role,
                                name         = tokenData.user.full_name
                            )
                        }
                        _uiState.value = SignupUiState.Success
                    } else {
                        val msg = signupResponse.body()?.message ?: "Signup failed. Please try again."
                        _uiState.value = SignupUiState.Error(msg)
                    }
                } catch (e: Exception) {
                    _uiState.value = SignupUiState.Error("Network error. Check your connection.")
                }
            }
        }
    }

    fun resetState() {
        _uiState.value = SignupUiState.Idle
    }
}
