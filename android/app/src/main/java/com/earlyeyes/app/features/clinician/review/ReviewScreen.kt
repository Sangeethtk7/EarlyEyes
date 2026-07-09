package com.earlyeyes.app.features.clinician.review

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.earlyeyes.app.R
import com.earlyeyes.app.components.EarlyEyesButton
import com.earlyeyes.app.components.EarlyEyesTextField
import com.earlyeyes.app.core.network.AnalysisResult
import com.earlyeyes.app.core.network.ReportResponse
import com.earlyeyes.app.core.theme.ClinicianPrimary
import com.earlyeyes.app.core.theme.RiskHigh
import com.earlyeyes.app.core.theme.RiskLow
import com.earlyeyes.app.core.theme.RiskModerate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReviewScreen(
    reportId: String,
    onNavigateBack: () -> Unit,
    onSentSuccessfully: () -> Unit,
    viewModel: ReviewViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    var clinicianNotes by remember { mutableStateOf("") }
    var selectedRiskOverride by remember { mutableStateOf<String?>(null) }
    var showSendDialog by remember { mutableStateOf(false) }

    LaunchedEffect(reportId) { viewModel.loadReport(reportId) }
    LaunchedEffect(uiState) {
        if (uiState is ReviewUiState.Sent) onSentSuccessfully()
    }

    // ── Send confirmation dialog ───────────────────────────────────────────────
    if (showSendDialog) {
        AlertDialog(
            onDismissRequest = { showSendDialog = false },
            icon   = { Icon(Icons.Default.Send, null, tint = MaterialTheme.colorScheme.primary) },
            title  = { Text(stringResource(R.string.dialog_send_title)) },
            text   = { Text(stringResource(R.string.dialog_send_body)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showSendDialog = false
                        viewModel.submitReview(reportId, clinicianNotes, selectedRiskOverride)
                    }
                ) { Text(stringResource(R.string.btn_confirm)) }
            },
            dismissButton = {
                TextButton(onClick = { showSendDialog = false }) {
                    Text(stringResource(R.string.btn_cancel))
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.review_title)) },
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
        when (val state = uiState) {
            is ReviewUiState.Loading -> {
                Box(
                    Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentAlignment = Alignment.Center
                ) { CircularProgressIndicator() }
            }

            is ReviewUiState.Error -> {
                Box(
                    Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(state.message, textAlign = TextAlign.Center)
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadReport(reportId) }) {
                            Text(stringResource(R.string.btn_retry))
                        }
                    }
                }
            }

            is ReviewUiState.Submitting -> {
                Box(
                    Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        CircularProgressIndicator()
                        Text("Sending report to parent…", style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }

            is ReviewUiState.Success -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.background)
                        .padding(innerPadding)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    ReviewContent(
                        report               = state.report,
                        clinicianNotes       = clinicianNotes,
                        onNotesChange        = { clinicianNotes = it },
                        selectedRiskOverride = selectedRiskOverride,
                        onRiskOverride       = { selectedRiskOverride = it },
                        onSendClick          = { showSendDialog = true }
                    )
                }
            }

            is ReviewUiState.Sent -> {
                // Navigation handled by LaunchedEffect
            }
        }
    }
}

@Composable
private fun ReviewContent(
    report: ReportResponse,
    clinicianNotes: String,
    onNotesChange: (String) -> Unit,
    selectedRiskOverride: String?,
    onRiskOverride: (String?) -> Unit,
    onSendClick: () -> Unit
) {
    // ── Video info header (placeholder — no actual player) ────────────────────
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 4.dp),
        shape    = RoundedCornerShape(12.dp),
        colors   = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(
            modifier          = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier         = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.PlayCircle, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(28.dp))
            }
            Spacer(Modifier.width(14.dp))
            Column {
                Text(
                    report.child_name ?: "Child",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold)
                )
                Text(
                    "Uploaded ${report.created_at.take(10)}",
                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f))
                )
                Spacer(Modifier.height(4.dp))
                Surface(
                    shape = RoundedCornerShape(50.dp),
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                ) {
                    Text(
                        "Video available — open in file manager",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        style    = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.primary)
                    )
                }
            }
        }
    }

    // ── AI Findings ───────────────────────────────────────────────────────────
    report.analysis?.let { analysis ->
        Column(modifier = Modifier.padding(horizontal = 20.dp)) {
            Text(
                stringResource(R.string.review_section_findings),
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
            )
            Spacer(Modifier.height(12.dp))
            ScoreBar(label = "Gaze attention",    score = analysis.gaze_score)
            Spacer(Modifier.height(8.dp))
            ScoreBar(label = "Movement patterns", score = analysis.pose_score)
            Spacer(Modifier.height(8.dp))
            ScoreBar(label = "Facial expressions",score = analysis.expression_score)
            Spacer(Modifier.height(12.dp))
            // Overall risk
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape    = RoundedCornerShape(10.dp),
                colors   = CardDefaults.cardColors(
                    containerColor = riskColor(analysis.risk_level).copy(alpha = 0.1f)
                )
            ) {
                Row(
                    modifier          = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("AI Risk Assessment", style = MaterialTheme.typography.labelMedium.copy(
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        ))
                        Text(
                            analysis.risk_level.replaceFirstChar { it.uppercase() },
                            style = MaterialTheme.typography.titleMedium.copy(
                                color = riskColor(analysis.risk_level),
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                    Text(
                        "${(analysis.confidence * 100).toInt()}% confidence",
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                        )
                    )
                }
            }
        }
    }

    // ── Clinician notes ───────────────────────────────────────────────────────
    Column(modifier = Modifier.padding(horizontal = 20.dp)) {
        Text(
            stringResource(R.string.review_section_notes),
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
        )
        Spacer(Modifier.height(8.dp))
        EarlyEyesTextField(
            value         = clinicianNotes,
            onValueChange = onNotesChange,
            label         = stringResource(R.string.review_notes_hint),
            singleLine    = false,
            maxLines      = 8,
            minLines      = 4
        )
    }

    // ── Risk override ─────────────────────────────────────────────────────────
    Column(modifier = Modifier.padding(horizontal = 20.dp)) {
        Text(
            stringResource(R.string.review_section_risk),
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
        )
        Spacer(Modifier.height(4.dp))
        Text(
            "Override the AI assessment if your clinical judgement differs",
            style = MaterialTheme.typography.bodySmall.copy(
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.55f)
            )
        )
        Spacer(Modifier.height(12.dp))
        val options = listOf(
            "no_override" to "Keep AI assessment",
            "low"         to "Low Concern",
            "moderate"    to "Worth Discussing",
            "high"        to "Recommend Follow-up"
        )
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { (value, label) ->
                val isSelected = when {
                    value == "no_override" && selectedRiskOverride == null -> true
                    else -> selectedRiskOverride == value
                }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .then(
                            if (isSelected)
                                Modifier.border(
                                    2.dp,
                                    MaterialTheme.colorScheme.primary,
                                    RoundedCornerShape(10.dp)
                                )
                            else
                                Modifier.border(
                                    1.dp,
                                    MaterialTheme.colorScheme.outline.copy(alpha = 0.4f),
                                    RoundedCornerShape(10.dp)
                                )
                        )
                        .background(
                            if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.06f)
                            else Color.Transparent
                        )
                        .clickable {
                            onRiskOverride(if (value == "no_override") null else value)
                        }
                        .padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RadioButton(
                        selected = isSelected,
                        onClick  = { onRiskOverride(if (value == "no_override") null else value) },
                        colors   = RadioButtonDefaults.colors(
                            selectedColor = MaterialTheme.colorScheme.primary
                        )
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        label,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal
                        )
                    )
                }
            }
        }
    }

    // ── Send button ───────────────────────────────────────────────────────────
    Column(modifier = Modifier.padding(horizontal = 20.dp)) {
        EarlyEyesButton(
            text    = stringResource(R.string.btn_send_to_parent),
            onClick = onSendClick,
            enabled = clinicianNotes.isNotBlank()
        )
        if (clinicianNotes.isBlank()) {
            Spacer(Modifier.height(4.dp))
            Text(
                "Add your clinical notes before sending",
                style = MaterialTheme.typography.bodySmall.copy(
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.45f)
                )
            )
        }
    }

    // ── Legal disclaimer ──────────────────────────────────────────────────────
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
        shape  = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
            Icon(
                Icons.Default.Info, null,
                tint     = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                modifier = Modifier.size(14.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text(
                stringResource(R.string.legal_disclaimer),
                style = MaterialTheme.typography.bodySmall.copy(
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            )
        }
    }

    Spacer(Modifier.height(32.dp))
}

@Composable
private fun ScoreBar(label: String, score: Float) {
    val pct = (score * 100f).coerceIn(0f, 100f).toInt()
    Column {
        Row(
            modifier              = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(label, style = MaterialTheme.typography.bodyMedium)
            Text(
                "$pct%",
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = FontWeight.SemiBold,
                    color      = scoreColor(score)
                )
            )
        }
        Spacer(Modifier.height(4.dp))
        LinearProgressIndicator(
            progress   = { score.coerceIn(0f, 1f) },
            modifier   = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp)),
            color      = scoreColor(score),
            trackColor = MaterialTheme.colorScheme.surfaceVariant
        )
    }
}

@Composable
private fun scoreColor(score: Float) = when {
    score >= 0.7f -> RiskLow
    score >= 0.4f -> RiskModerate
    else          -> RiskHigh
}

@Composable
private fun riskColor(riskLevel: String) = when (riskLevel.lowercase()) {
    "high"     -> RiskHigh
    "moderate" -> RiskModerate
    else       -> RiskLow
}
