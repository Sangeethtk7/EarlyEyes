package com.earlyeyes.app.features.clinician.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.earlyeyes.app.core.auth.TokenManager
import com.earlyeyes.app.core.network.ApiService
import com.earlyeyes.app.core.network.QueueItemResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface ClinicianDashboardUiState {
    object Loading : ClinicianDashboardUiState
    data class Success(
        val queue: List<QueueItemResponse>,
        val userName: String
    ) : ClinicianDashboardUiState
    data class Error(val message: String) : ClinicianDashboardUiState
}

@HiltViewModel
class ClinicianDashboardViewModel @Inject constructor(
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _uiState = MutableStateFlow<ClinicianDashboardUiState>(ClinicianDashboardUiState.Loading)
    val uiState: StateFlow<ClinicianDashboardUiState> = _uiState.asStateFlow()

    init {
        loadQueue()
    }

    fun loadQueue() {
        viewModelScope.launch {
            _uiState.value = ClinicianDashboardUiState.Loading
            val userName = tokenManager.getUserName() ?: "Clinician"
            try {
                val response = apiService.getQueue()
                if (response.isSuccessful && response.body()?.success == true) {
                    val queue = response.body()!!.data ?: emptyList()
                    _uiState.value = ClinicianDashboardUiState.Success(queue, userName)
                } else {
                    _uiState.value = ClinicianDashboardUiState.Error(
                        response.body()?.message ?: "Failed to load queue."
                    )
                }
            } catch (e: Exception) {
                _uiState.value = ClinicianDashboardUiState.Error("Network error. Check your connection.")
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            try { apiService.logout() } catch (_: Exception) {}
            tokenManager.clearTokens()
        }
    }
}
