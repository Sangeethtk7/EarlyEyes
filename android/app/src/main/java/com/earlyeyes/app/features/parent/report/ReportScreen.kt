package com.earlyeyes.app.features.parent.report

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.earlyeyes.app.R
import com.earlyeyes.app.components.RiskScoreRing
import com.earlyeyes.app.core.network.AnalysisResult
import com.earlyeyes.app.core.network.ReportResponse
import com.earlyeyes.app.core.theme.RiskHigh
import com.earlyeyes.app.core.theme.RiskLow
import com.earlyeyes.app.core.theme.RiskModerate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportScreen(
    reportId: String,
    onNavigateBack: () -> Unit,
    viewModel: ReportViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(reportId) { viewModel.loadReport(reportId) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.report_title)) },
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
            is ReportUiState.Loading -> {
                Box(
                    modifier         = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentAlignment = Alignment.Center
                ) { CircularProgressIndicator() }
            }

            is ReportUiState.Error -> {
                Box(
                    modifier         = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.ErrorOutline, null,
                            tint     = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(Modifier.height(12.dp))
                        Text(state.message, textAlign = TextAlign.Center)
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadReport(reportId) }) {
                            Text(stringResource(R.string.btn_retry))
                        }
                    }
                }
            }

            is ReportUiState.Success -> ReportContent(
                report    = state.report,
                modifier  = Modifier.padding(innerPadding)
            )
        }
    }
}

@Composable
private fun ReportContent(report: ReportResponse, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // ── Header gradient card ──────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                            MaterialTheme.colorScheme.background
                        )
                    )
                )
                .padding(horizontal = 24.dp, vertical = 20.dp)
        ) {
            Column {
                report.child_name?.let {
                    Text(it, style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold))
                }
                Text(
                    text  = "Screening completed · ${report.created_at.take(10)}",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.55f)
                    )
                )
                Spacer(Modifier.height(12.dp))
                RiskBadge(riskLevel = report.risk_level ?: report.analysis?.risk_level ?: "low")
            }
        }

        // ── Risk score rings ──────────────────────────────────────────────────
        report.analysis?.let { analysis ->
            Column(modifier = Modifier.padding(horizontal = 24.dp)) {
                Text(
                    text  = stringResource(R.string.report_section_scores),
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                )
                Spacer(Modifier.height(16.dp))
                Row(
                    modifier              = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    RiskScoreRing(
                        score = (analysis.gaze_score * 100f).coerceIn(0f, 100f),
                        label = stringResource(R.string.score_gaze)
                    )
                    RiskScoreRing(
                        score = (analysis.pose_score * 100f).coerceIn(0f, 100f),
                        label = stringResource(R.string.score_movement)
                    )
                    RiskScoreRing(
                        score = (analysis.expression_score * 100f).coerceIn(0f, 100f),
                        label = stringResource(R.string.score_expressions)
                    )
                }
            }

            // ── AI summary expandable cards ────────────────────────────────────
            report.ai_summary?.let { summary ->
                Column(modifier = Modifier.padding(horizontal = 24.dp)) {
                    Text(
                        text  = stringResource(R.string.report_section_summary),
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                    )
                    Spacer(Modifier.height(8.dp))
                    ExpandableCard(
                        title   = "Observation summary",
                        content = summary
                    )
                }
            }

            // ── Next steps ────────────────────────────────────────────────────
            Column(modifier = Modifier.padding(horizontal = 24.dp)) {
                Text(
                    text  = stringResource(R.string.report_section_next_steps),
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                )
                Spacer(Modifier.height(8.dp))
                NextStepsCard(riskLevel = analysis.risk_level)
            }
        }

        // ── Clinician notes ───────────────────────────────────────────────────
        report.clinician_notes?.takeIf { it.isNotBlank() }?.let { notes ->
            Column(modifier = Modifier.padding(horizontal = 24.dp)) {
                Text(
                    text  = stringResource(R.string.report_section_clinician_notes),
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                )
                Spacer(Modifier.height(8.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape    = RoundedCornerShape(12.dp),
                    colors   = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                ) {
                    Row(modifier = Modifier.padding(16.dp)) {
                        Icon(
                            Icons.Default.MedicalServices, null,
                            tint     = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(Modifier.width(12.dp))
                        Text(notes, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }

        // ── Legal disclaimer ──────────────────────────────────────────────────
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            shape  = RoundedCornerShape(8.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant
            )
        ) {
            Row(
                modifier          = Modifier.padding(12.dp),
                verticalAlignment = Alignment.Top
            ) {
                Icon(
                    Icons.Default.Info, null,
                    tint     = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                    modifier = Modifier.size(14.dp).padding(top = 2.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text  = stringResource(R.string.legal_disclaimer),
                    style = MaterialTheme.typography.bodySmall.copy(
                        color    = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        fontSize = 11.sp
                    )
                )
            }
        }

        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun RiskBadge(riskLevel: String) {
    val (label, color) = when (riskLevel.lowercase()) {
        "high"     -> "We Recommend Follow-up" to RiskHigh
        "moderate" -> "Worth Discussing"        to RiskModerate
        else       -> "Low Concern"             to RiskLow
    }
    Surface(
        shape = RoundedCornerShape(50.dp),
        color = color.copy(alpha = 0.15f)
    ) {
        Row(
            modifier          = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(RoundedCornerShape(50.dp))
                    .background(color)
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text  = label,
                style = MaterialTheme.typography.labelMedium.copy(
                    color      = color,
                    fontWeight = FontWeight.SemiBold
                )
            )
        }
    }
}

@Composable
private fun ExpandableCard(title: String, content: String) {
    var expanded by remember { mutableStateOf(true) }
    Card(
        modifier  = Modifier.fillMaxWidth(),
        shape     = RoundedCornerShape(12.dp),
        colors    = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column {
            Row(
                modifier          = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded }
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment     = Alignment.CenterVertically
            ) {
                Text(title, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold))
                Icon(
                    imageVector        = if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = if (expanded) "Collapse" else "Expand"
                )
            }
            AnimatedVisibility(
                visible = expanded,
                enter   = expandVertically(),
                exit    = shrinkVertically()
            ) {
                Column(modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 16.dp)) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
                    Spacer(Modifier.height(12.dp))
                    Text(content, style = MaterialTheme.typography.bodyMedium.copy(
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                    ))
                }
            }
        }
    }
}

@Composable
private fun NextStepsCard(riskLevel: String) {
    val steps = when (riskLevel.lowercase()) {
        "high" -> listOf(
            "Share this report with your child's paediatrician at your next visit.",
            "Consider requesting a referral to a developmental specialist.",
            "Keep a journal of behaviours you observe at home.",
            "Our team is available to answer questions — contact us anytime."
        )
        "moderate" -> listOf(
            "Discuss these results with your child's GP or paediatrician.",
            "Continue monitoring your child's development over the coming weeks.",
            "Consider uploading another video in 4–6 weeks for comparison.",
            "Reach out to your local child development centre for guidance."
        )
        else -> listOf(
            "Continue supporting your child's development through play and interaction.",
            "Attend regular developmental check-ups with your paediatrician.",
            "You can upload another video in 3–6 months as your child grows.",
            "Contact us if you have any concerns or questions."
        )
    }
    Card(
        modifier  = Modifier.fillMaxWidth(),
        shape     = RoundedCornerShape(12.dp),
        colors    = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            steps.forEachIndexed { index, step ->
                Row(verticalAlignment = Alignment.Top) {
                    Box(
                        modifier = Modifier
                            .size(22.dp)
                            .clip(RoundedCornerShape(50.dp))
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text  = "${index + 1}",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color      = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                    Text(
                        step,
                        style    = MaterialTheme.typography.bodySmall.copy(
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                        ),
                        modifier = Modifier.padding(top = 3.dp)
                    )
                }
            }
        }
    }
}
