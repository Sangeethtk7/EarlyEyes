package com.earlyeyes.app.features.parent.upload

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.earlyeyes.app.core.network.ApiService
import com.earlyeyes.app.core.network.ChildResponse
import com.earlyeyes.app.core.network.CreateChildRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject

sealed interface UploadUiState {
    object Loading : UploadUiState
    data class ChildrenLoaded(val children: List<ChildResponse>) : UploadUiState
    object Uploading : UploadUiState
    object Success : UploadUiState
    data class Error(val message: String) : UploadUiState
}

@HiltViewModel
class UploadViewModel @Inject constructor(
    private val apiService: ApiService,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow<UploadUiState>(UploadUiState.Loading)
    val uiState: StateFlow<UploadUiState> = _uiState.asStateFlow()

    private val _uploadProgress = MutableStateFlow(0)
    val uploadProgress: StateFlow<Int> = _uploadProgress.asStateFlow()

    private val _selectedChild = MutableStateFlow<ChildResponse?>(null)
    val selectedChild: StateFlow<ChildResponse?> = _selectedChild.asStateFlow()

    init {
        loadChildren()
    }

    fun loadChildren() {
        viewModelScope.launch {
            _uiState.value = UploadUiState.Loading
            try {
                val response = apiService.getChildren()
                if (response.isSuccessful && response.body()?.success == true) {
                    _uiState.value = UploadUiState.ChildrenLoaded(response.body()!!.data ?: emptyList())
                } else {
                    _uiState.value = UploadUiState.Error("Failed to load children.")
                }
            } catch (e: Exception) {
                _uiState.value = UploadUiState.Error("Network error. Check your connection.")
            }
        }
    }

    fun selectChild(child: ChildResponse) {
        _selectedChild.value = child
    }

    fun createChild(name: String, dob: String, gender: String?) {
        viewModelScope.launch {
            _uiState.value = UploadUiState.Loading
            try {
                val response = apiService.createChild(CreateChildRequest(name, dob, gender, null))
                if (response.isSuccessful && response.body()?.success == true) {
                    response.body()!!.data?.let { _selectedChild.value = it }
                    loadChildren()
                } else {
                    _uiState.value = UploadUiState.Error("Failed to create child profile.")
                }
            } catch (e: Exception) {
                _uiState.value = UploadUiState.Error("Network error.")
            }
        }
    }

    fun uploadVideo(uri: Uri, childId: String) {
        viewModelScope.launch {
            _uiState.value = UploadUiState.Uploading
            _uploadProgress.value = 0
            try {
                val file = uriToFile(uri)
                val requestFile = file.asRequestBody("video/*".toMediaTypeOrNull())
                val videoPart   = MultipartBody.Part.createFormData("file", file.name, requestFile)
                val childIdBody = childId.toRequestBody("text/plain".toMediaTypeOrNull())

                // Simulate progress (real progress needs OkHttp interceptor with CountingRequestBody)
                for (i in 1..90) {
                    _uploadProgress.value = i
                    kotlinx.coroutines.delay(20)
                }

                val response = apiService.uploadVideo(videoPart, childIdBody)
                _uploadProgress.value = 100

                if (response.isSuccessful && response.body()?.success == true) {
                    _uiState.value = UploadUiState.Success
                } else {
                    _uiState.value = UploadUiState.Error(
                        response.body()?.message ?: "Upload failed."
                    )
                }
                file.delete()
            } catch (e: Exception) {
                _uiState.value = UploadUiState.Error("Upload failed: ${e.localizedMessage}")
            }
        }
    }

    private fun uriToFile(uri: Uri): File {
        val inputStream = context.contentResolver.openInputStream(uri)!!
        val tempFile = File(context.cacheDir, "upload_${System.currentTimeMillis()}.mp4")
        FileOutputStream(tempFile).use { out -> inputStream.copyTo(out) }
        return tempFile
    }
}
