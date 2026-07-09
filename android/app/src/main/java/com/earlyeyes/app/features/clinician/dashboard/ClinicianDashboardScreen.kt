package com.earlyeyes.app.features.clinician.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.earlyeyes.app.core.network.QueueItemResponse
import com.earlyeyes.app.core.theme.ClinicianPrimary
import com.earlyeyes.app.core.theme.RiskHigh
import com.earlyeyes.app.core.theme.RiskLow
import com.earlyeyes.app.core.theme.RiskModerate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClinicianDashboardScreen(
    onNavigateToReview: (String) -> Unit,
    onLogout: () -> Unit,
    viewModel: ClinicianDashboardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("EarlyEyes", fontWeight = FontWeight.Bold)
                        Text(
                            "Clinical Portal",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.55f)
                            )
                        )
                    }
                },
                actions = {
                    IconButton(onClick = {
                        viewModel.logout()
                        onLogout()
                    }) {
                        Icon(Icons.Default.Logout, contentDescription = "Logout")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        }
    ) { innerPadding ->
        when (val state = uiState) {
            is ClinicianDashboardUiState.Loading -> {
                Box(
                    Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentAlignment = Alignment.Center
                ) { CircularProgressIndicator() }
            }

            is ClinicianDashboardUiState.Error -> {
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
                        Button(onClick = { viewModel.loadQueue() }) {
                            Text("Retry")
                        }
                    }
                }
            }

            is ClinicianDashboardUiState.Success -> {
                LazyColumn(
                    modifier            = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.background)
                        .padding(innerPadding),
                    contentPadding      = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // ── Stats row ─────────────────────────────────────────────
                    item {
                        StatsRow(queue = state.queue)
                        Spacer(Modifier.height(8.dp))
                    }

                    // ── Queue header ──────────────────────────────────────────
                    item {
                        Row(
                            modifier              = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment     = Alignment.CenterVertically
                        ) {
                            Text(
                                "Review Queue",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                            )
                            if (state.queue.isNotEmpty()) {
                                Surface(
                                    shape = RoundedCornerShape(50.dp),
                                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                                ) {
                                    Text(
                                        "${state.queue.size} pending",
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                        style    = MaterialTheme.typography.labelSmall.copy(
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    )
                                }
                            }
                        }
                    }

                    // ── Queue items ───────────────────────────────────────────
                    if (state.queue.isEmpty()) {
                        item {
                            EmptyQueue()
                        }
                    } else {
                        items(state.queue) { item ->
                            QueueItemCard(
                                item     = item,
                                onReview = { onNavigateToReview(item.report_id) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatsRow(queue: List<QueueItemResponse>) {
    val pending   = queue.size
    val thisWeek  = queue.count { true } // simplified — all are "this week"
    val total     = queue.size

    Row(
        modifier              = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatCard(label = "Pending",       value = "$pending",  modifier = Modifier.weight(1f), tint = RiskModerate)
        StatCard(label = "This week",     value = "$thisWeek", modifier = Modifier.weight(1f), tint = ClinicianPrimary)
        StatCard(label = "Total",         value = "$total",    modifier = Modifier.weight(1f), tint = RiskLow)
    }
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier, tint: androidx.compose.ui.graphics.Color) {
    Card(
        modifier  = modifier,
        shape     = RoundedCornerShape(12.dp),
        colors    = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier            = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                value,
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color      = tint
                )
            )
            Text(
                label,
                style = MaterialTheme.typography.labelSmall.copy(
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
                )
            )
        }
    }
}

@Composable
private fun QueueItemCard(
    item: QueueItemResponse,
    onReview: () -> Unit
) {
    Card(
        modifier  = Modifier.fillMaxWidth(),
        shape     = RoundedCornerShape(12.dp),
        colors    = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier          = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar
            Box(
                modifier         = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text  = item.child_name.first().uppercaseChar().toString(),
                    style = MaterialTheme.typography.titleMedium.copy(
                        color      = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                )
            }

            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    item.child_name,
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold)
                )
                Text(
                    "Age ${item.child_age} · ${item.parent_name}",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
                    )
                )
                Spacer(Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item.risk_level?.let { RiskChip(it) }
                    Text(
                        formatTimeAgo(item.uploaded_at),
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                        )
                    )
                }
            }

            Spacer(Modifier.width(8.dp))

            FilledTonalButton(
                onClick = onReview,
                shape   = RoundedCornerShape(8.dp)
            ) {
                Text("Review", style = MaterialTheme.typography.labelMedium)
            }
        }
    }
}

@Composable
private fun RiskChip(riskLevel: String) {
    val (label, color) = when (riskLevel.lowercase()) {
        "high"     -> "High"     to RiskHigh
        "moderate" -> "Moderate" to RiskModerate
        else       -> "Low"      to RiskLow
    }
    Surface(
        shape = RoundedCornerShape(50.dp),
        color = color.copy(alpha = 0.13f)
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            style    = MaterialTheme.typography.labelSmall.copy(color = color, fontWeight = FontWeight.SemiBold)
        )
    }
}

@Composable
private fun EmptyQueue() {
    Column(
        modifier            = Modifier
            .fillMaxWidth()
            .padding(vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(
            Icons.Default.CheckCircle, null,
            modifier = Modifier.size(56.dp),
            tint     = RiskLow.copy(alpha = 0.5f)
        )
        Text(
            "Queue is clear!",
            style = MaterialTheme.typography.titleMedium.copy(
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)
            )
        )
        Text(
            "No pending reviews at this time",
            style = MaterialTheme.typography.bodyMedium.copy(
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.35f)
            )
        )
    }
}

private fun formatTimeAgo(dateStr: String): String {
    return try {
        // Simple approximation — full date parsing would require java.time
        val datePart = dateStr.take(10)
        datePart
    } catch (_: Exception) {
        dateStr
    }
}
