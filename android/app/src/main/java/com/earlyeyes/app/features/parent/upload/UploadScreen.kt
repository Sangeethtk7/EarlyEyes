package com.earlyeyes.app.features.parent.upload

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.earlyeyes.app.R
import com.earlyeyes.app.components.EarlyEyesButton
import com.earlyeyes.app.components.EarlyEyesOutlinedButton
import com.earlyeyes.app.core.network.ChildResponse
import com.earlyeyes.app.core.theme.ParentPrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UploadScreen(
    onUploadComplete: () -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: UploadViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val uploadProgress by viewModel.uploadProgress.collectAsStateWithLifecycle()
    val selectedChild by viewModel.selectedChild.collectAsStateWithLifecycle()

    var currentStep by remember { mutableIntStateOf(0) }
    var selectedUri by remember { mutableStateOf<Uri?>(null) }

    val videoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri -> selectedUri = uri }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.upload_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(innerPadding)
        ) {
            // ── Step indicator ────────────────────────────────────────────────
            StepIndicator(
                steps       = listOf("Child", "Tips", "Upload", "Done"),
                currentStep = currentStep,
                modifier    = Modifier.padding(horizontal = 24.dp, vertical = 16.dp)
            )

            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))

            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                when (currentStep) {
                    0 -> Step1SelectChild(
                        uiState       = uiState,
                        selectedChild = selectedChild,
                        onSelect      = viewModel::selectChild,
                        onRetry       = viewModel::loadChildren,
                        onNext        = { if (selectedChild != null) currentStep = 1 }
                    )

                    1 -> Step2Tips(
                        onNext = { currentStep = 2 }
                    )

                    2 -> Step3Upload(
                        uiState        = uiState,
                        uploadProgress = uploadProgress,
                        selectedUri    = selectedUri,
                        onPickVideo    = { videoPickerLauncher.launch("video/*") },
                        onUpload       = {
                            selectedUri?.let { uri ->
                                selectedChild?.let { child ->
                                    viewModel.uploadVideo(uri, child.id)
                                }
                            }
                        },
                        onNext = { currentStep = 3 }
                    )

                    3 -> Step4Done(onGoToDashboard = onUploadComplete)
                }
            }
        }
    }

    // Auto-advance to step 4 on success
    LaunchedEffect(uiState) {
        if (uiState is UploadUiState.Success && currentStep == 2) {
            currentStep = 3
        }
    }
}

// ── Step indicator ─────────────────────────────────────────────────────────────
@Composable
private fun StepIndicator(
    steps: List<String>,
    currentStep: Int,
    modifier: Modifier = Modifier
) {
    Row(
        modifier            = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment   = Alignment.CenterVertically
    ) {
        steps.forEachIndexed { index, label ->
            val isDone    = index < currentStep
            val isCurrent = index == currentStep

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                isDone    -> ParentPrimary
                                isCurrent -> MaterialTheme.colorScheme.primary
                                else      -> MaterialTheme.colorScheme.surfaceVariant
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (isDone) {
                        Icon(
                            imageVector        = Icons.Default.Check,
                            contentDescription = null,
                            tint               = Color.White,
                            modifier           = Modifier.size(16.dp)
                        )
                    } else {
                        Text(
                            text  = "${index + 1}",
                            style = MaterialTheme.typography.labelMedium.copy(
                                color      = if (isCurrent) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    text  = label,
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = if (isCurrent || isDone)
                            MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                    )
                )
            }

            if (index < steps.lastIndex) {
                HorizontalDivider(
                    modifier  = Modifier
                        .weight(1f)
                        .padding(horizontal = 8.dp, vertical = 16.dp),
                    color     = if (index < currentStep) ParentPrimary else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                    thickness = 1.5.dp
                )
            }
        }
    }
}

// ── Step 1: Select child ───────────────────────────────────────────────────────
@Composable
private fun Step1SelectChild(
    uiState: UploadUiState,
    selectedChild: ChildResponse?,
    onSelect: (ChildResponse) -> Unit,
    onRetry: () -> Unit,
    onNext: () -> Unit
) {
    Text(
        text  = "Who is this video for?",
        style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold)
    )

    when (uiState) {
        is UploadUiState.Loading -> {
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        is UploadUiState.Error -> {
            Text(uiState.message, color = MaterialTheme.colorScheme.error)
            EarlyEyesOutlinedButton(text = "Retry", onClick = onRetry)
        }
        is UploadUiState.ChildrenLoaded -> {
            if (uiState.children.isEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors   = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Text(
                        text      = "No child profiles yet. Please add a child profile first.",
                        modifier  = Modifier.padding(16.dp),
                        textAlign = TextAlign.Center,
                        style     = MaterialTheme.typography.bodyMedium
                    )
                }
            } else {
                uiState.children.forEach { child ->
                    val isSelected = selectedChild?.id == child.id
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelect(child) }
                            .then(
                                if (isSelected)
                                    Modifier.border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(12.dp))
                                else Modifier
                            ),
                        shape  = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected)
                                MaterialTheme.colorScheme.primary.copy(alpha = 0.08f)
                            else MaterialTheme.colorScheme.surface
                        )
                    ) {
                        Row(
                            modifier          = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier         = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text  = child.name.first().uppercaseChar().toString(),
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        color = MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.Bold
                                    )
                                )
                            }
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text(child.name, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold))
                                Text(
                                    text  = "DOB: ${child.date_of_birth}",
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
                                    )
                                )
                            }
                            if (isSelected) {
                                Spacer(Modifier.weight(1f))
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(8.dp))
            EarlyEyesButton(
                text    = "Next",
                onClick = onNext,
                enabled = selectedChild != null
            )
        }
        else -> {}
    }
}

// ── Step 2: Tips ───────────────────────────────────────────────────────────────
@Composable
private fun Step2Tips(onNext: () -> Unit) {
    Text(
        text  = "Recording tips",
        style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold)
    )
    Text(
        text  = "For best results, please follow these guidelines:",
        style = MaterialTheme.typography.bodyMedium.copy(
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)
        )
    )

    val tips = listOf(
        Triple(Icons.Default.LightMode,  "Good lighting", "Record in a well-lit room. Natural light works best. Avoid harsh shadows on the face."),
        Triple(Icons.Default.PhotoCamera,"Camera distance", "Position camera 1–2 metres away. The child's full upper body should be visible."),
        Triple(Icons.Default.Timer,      "Recording duration", "Aim for 2–5 minutes of natural play. Longer clips give more accurate results."),
        Triple(Icons.Default.FaceRetouchingNatural, "Face visibility", "Keep the child's face visible throughout. Avoid hats or items that obscure eyes.")
    )

    tips.forEach { (icon, title, body) ->
        TipCard(icon = icon, title = title, body = body)
    }

    Spacer(Modifier.height(8.dp))
    EarlyEyesButton(text = "I'm ready — continue", onClick = onNext)
}

@Composable
private fun TipCard(icon: ImageVector, title: String, body: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape    = RoundedCornerShape(12.dp),
        colors   = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(
            modifier          = Modifier.padding(16.dp),
            verticalAlignment = Alignment.Top
        ) {
            Box(
                modifier         = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column {
                Text(title, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold))
                Spacer(Modifier.height(4.dp))
                Text(body, style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)))
            }
        }
    }
}

// ── Step 3: Upload ─────────────────────────────────────────────────────────────
@Composable
private fun Step3Upload(
    uiState: UploadUiState,
    uploadProgress: Int,
    selectedUri: Uri?,
    onPickVideo: () -> Unit,
    onUpload: () -> Unit,
    onNext: () -> Unit
) {
    Text(
        text  = "Select your video",
        style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold)
    )

    // File picker area
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(160.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .border(
                width  = if (selectedUri != null) 2.dp else 1.dp,
                color  = if (selectedUri != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f),
                shape  = RoundedCornerShape(16.dp)
            )
            .clickable(enabled = uiState !is UploadUiState.Uploading) { onPickVideo() },
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(
                imageVector        = if (selectedUri != null) Icons.Default.VideoFile else Icons.Default.VideoLibrary,
                contentDescription = null,
                tint               = if (selectedUri != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.35f),
                modifier           = Modifier.size(40.dp)
            )
            Text(
                text  = if (selectedUri != null) "Video selected ✓" else "Tap to select video",
                style = MaterialTheme.typography.bodyMedium.copy(
                    color      = if (selectedUri != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                    fontWeight = if (selectedUri != null) FontWeight.SemiBold else FontWeight.Normal
                )
            )
            if (selectedUri == null) {
                Text(
                    text  = "MP4, MOV, AVI — up to 500 MB",
                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.35f))
                )
            }
        }
    }

    // Upload progress
    if (uiState is UploadUiState.Uploading) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier              = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Uploading…", style = MaterialTheme.typography.bodyMedium)
                Text("$uploadProgress%", style = MaterialTheme.typography.bodyMedium.copy(
                    color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold
                ))
            }
            LinearProgressIndicator(
                progress  = { uploadProgress / 100f },
                modifier  = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color     = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )
        }
    }

    // Error
    if (uiState is UploadUiState.Error) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors   = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.error.copy(alpha = 0.1f)),
            shape    = RoundedCornerShape(8.dp)
        ) {
            Text(
                text     = uiState.message,
                modifier = Modifier.padding(12.dp),
                style    = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.error)
            )
        }
    }

    EarlyEyesButton(
        text      = "Upload video",
        onClick   = onUpload,
        enabled   = selectedUri != null && uiState !is UploadUiState.Uploading,
        isLoading = uiState is UploadUiState.Uploading
    )
}

// ── Step 4: Done ───────────────────────────────────────────────────────────────
@Composable
private fun Step4Done(onGoToDashboard: () -> Unit) {
    Column(
        modifier            = Modifier
            .fillMaxWidth()
            .padding(vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        val infiniteTransition = rememberInfiniteTransition(label = "pulse")
        val scale by infiniteTransition.animateFloat(
            initialValue   = 1f,
            targetValue    = 1.08f,
            animationSpec  = infiniteRepeatable(
                animation = tween(800, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "scale"
        )

        Box(
            modifier         = Modifier
                .size(96.dp)
                .clip(CircleShape)
                .background(ParentPrimary.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector        = Icons.Default.CheckCircle,
                contentDescription = null,
                tint               = ParentPrimary,
                modifier           = Modifier.size(56.dp)
            )
        }

        Text(
            text      = "Video uploaded!",
            style     = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
            textAlign = TextAlign.Center
        )
        Text(
            text      = "Our screening system will process your video.\nYou'll be able to view the report once analysis is complete.",
            style     = MaterialTheme.typography.bodyMedium.copy(
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)
            ),
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(8.dp))
        EarlyEyesButton(text = "Go to dashboard", onClick = onGoToDashboard)
    }
}
