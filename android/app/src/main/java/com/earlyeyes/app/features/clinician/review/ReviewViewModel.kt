package com.earlyeyes.app.features.clinician.review

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.earlyeyes.app.core.network.ApiService
import com.earlyeyes.app.core.network.ReportResponse
import com.earlyeyes.app.core.network.ReviewRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface ReviewUiState {
    object Loading : ReviewUiState
    data class Success(val report: ReportResponse) : ReviewUiState
    object Submitting : ReviewUiState
    object Sent : ReviewUiState
    data class Error(val message: String) : ReviewUiState
}

@HiltViewModel
class ReviewViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow<ReviewUiState>(ReviewUiState.Loading)
    val uiState: StateFlow<ReviewUiState> = _uiState.asStateFlow()

    fun loadReport(reportId: String) {
        viewModelScope.launch {
            _uiState.value = ReviewUiState.Loading
            try {
                val response = apiService.getReport(reportId)
                if (response.isSuccessful && response.body()?.success == true) {
                    _uiState.value = ReviewUiState.Success(response.body()!!.data!!)
                } else {
                    _uiState.value = ReviewUiState.Error(
                        response.body()?.message ?: "Failed to load report."
                    )
                }
            } catch (e: Exception) {
                _uiState.value = ReviewUiState.Error("Network error. Check your connection.")
            }
        }
    }

    fun submitReview(
        reportId: String,
        clinicianNotes: String,
        riskOverride: String?
    ) {
        viewModelScope.launch {
            _uiState.value = ReviewUiState.Submitting
            try {
                val reviewResponse = apiService.reviewReport(
                    reportId,
                    ReviewRequest(clinician_notes = clinicianNotes, risk_override = riskOverride)
                )
                if (reviewResponse.isSuccessful && reviewResponse.body()?.success == true) {
                    // Immediately send to parent
                    val sendResponse = apiService.sendReport(reportId)
                    if (sendResponse.isSuccessful) {
                        _uiState.value = ReviewUiState.Sent
                    } else {
                        _uiState.value = ReviewUiState.Error(
                            sendResponse.body()?.message ?: "Review saved but failed to send."
                        )
                    }
                } else {
                    _uiState.value = ReviewUiState.Error(
                        reviewResponse.body()?.message ?: "Failed to submit review."
                    )
                }
            } catch (e: Exception) {
                _uiState.value = ReviewUiState.Error("Network error. Check your connection.")
            }
        }
    }
}
