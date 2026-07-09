package com.earlyeyes.app.features.parent.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.earlyeyes.app.core.auth.TokenManager
import com.earlyeyes.app.core.network.ApiService
import com.earlyeyes.app.core.network.VideoResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface DashboardUiState {
    object Loading : DashboardUiState
    data class Success(val videos: List<VideoResponse>, val userName: String) : DashboardUiState
    data class Error(val message: String) : DashboardUiState
}

@HiltViewModel
class ParentDashboardViewModel @Inject constructor(
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _uiState = MutableStateFlow<DashboardUiState>(DashboardUiState.Loading)
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        loadVideos()
    }

    fun loadVideos() {
        viewModelScope.launch {
            _uiState.value = DashboardUiState.Loading
            val userName = tokenManager.getUserName() ?: "there"
            try {
                val response = apiService.getVideos()
                if (response.isSuccessful && response.body()?.success == true) {
                    val videos = response.body()!!.data ?: emptyList()
                    _uiState.value = DashboardUiState.Success(videos, userName)
                } else {
                    _uiState.value = DashboardUiState.Error(
                        response.body()?.message ?: "Failed to load videos."
                    )
                }
            } catch (e: Exception) {
                _uiState.value = DashboardUiState.Error("Network error. Check your connection.")
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
