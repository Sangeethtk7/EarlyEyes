package com.earlyeyes.app.features.parent.report

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.earlyeyes.app.core.network.ApiService
import com.earlyeyes.app.core.network.ReportResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface ReportUiState {
    object Loading : ReportUiState
    data class Success(val report: ReportResponse) : ReportUiState
    data class Error(val message: String) : ReportUiState
}

@HiltViewModel
class ReportViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow<ReportUiState>(ReportUiState.Loading)
    val uiState: StateFlow<ReportUiState> = _uiState.asStateFlow()

    fun loadReport(reportId: String) {
        viewModelScope.launch {
            _uiState.value = ReportUiState.Loading
            try {
                val response = apiService.getReport(reportId)
                if (response.isSuccessful && response.body()?.success == true) {
                    val report = response.body()!!.data!!
                    _uiState.value = ReportUiState.Success(report)
                } else {
                    _uiState.value = ReportUiState.Error(
                        response.body()?.message ?: "Failed to load report."
                    )
                }
            } catch (e: Exception) {
                _uiState.value = ReportUiState.Error("Network error. Check your connection.")
            }
        }
    }
}
