package com.earlyeyes.app.features.parent.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.earlyeyes.app.R
import com.earlyeyes.app.core.network.VideoResponse
import com.earlyeyes.app.core.theme.ParentAccent
import com.earlyeyes.app.core.theme.ParentPrimary
import com.earlyeyes.app.core.theme.RiskHigh
import com.earlyeyes.app.core.theme.RiskModerate
import java.util.Calendar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ParentDashboardScreen(
    onNavigateToUpload: () -> Unit,
    onNavigateToReport: (String) -> Unit,
    onLogout: () -> Unit,
    viewModel: ParentDashboardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("EarlyEyes", fontWeight = FontWeight.Bold) },
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
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick           = onNavigateToUpload,
                containerColor    = MaterialTheme.colorScheme.primary,
                contentColor      = MaterialTheme.colorScheme.onPrimary,
                icon              = { Icon(Icons.Default.Add, contentDescription = null) },
                text              = { Text(stringResource(R.string.btn_upload_video)) }
            )
        }
    ) { innerPadding ->
        when (val state = uiState) {
            is DashboardUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            }

            is DashboardUiState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(state.message, style = MaterialTheme.typography.bodyMedium)
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadVideos() }) {
                            Text(stringResource(R.string.btn_retry))
                        }
                    }
                }
            }

            is DashboardUiState.Success -> {
                LazyColumn(
                    modifier            = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.background)
                        .padding(innerPadding),
                    contentPadding      = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // ── Greeting card ─────────────────────────────────────────
                    item {
                        GreetingCard(userName = state.userName)
                        Spacer(Modifier.height(8.dp))
                    }

                    // ── Section title ─────────────────────────────────────────
                    item {
                        Text(
                            text  = stringResource(R.string.label_recent_videos),
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                        )
                    }

                    // ── Video cards ───────────────────────────────────────────
                    if (state.videos.isEmpty()) {
                        item { EmptyState() }
                    } else {
                        items(state.videos) { video ->
                            VideoCard(
                                video              = video,
                                onViewReport       = { onNavigateToReport(video.id) }
                            )
                        }
                    }

                    item { Spacer(Modifier.height(80.dp)) } // FAB clearance
                }
            }
        }
    }
}

@Composable
private fun GreetingCard(userName: String) {
    val greeting = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
        in 5..11  -> "Good morning"
        in 12..16 -> "Good afternoon"
        else      -> "Good evening"
    }
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(
                Brush.horizontalGradient(
                    listOf(ParentPrimary, ParentPrimary.copy(alpha = 0.7f))
                )
            )
            .padding(20.dp)
    ) {
        Column {
            Text(
                text  = "$greeting,",
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.85f)
                )
            )
            Text(
                text  = userName.split(" ").firstOrNull() ?: userName,
                style = MaterialTheme.typography.headlineSmall.copy(
                    color      = MaterialTheme.colorScheme.onPrimary,
                    fontWeight = FontWeight.Bold
                )
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text  = "Track your child's development journey",
                style = MaterialTheme.typography.bodySmall.copy(
                    color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.75f)
                )
            )
        }
    }
}

@Composable
private fun VideoCard(
    video: VideoResponse,
    onViewReport: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape    = RoundedCornerShape(12.dp),
        colors   = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier            = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment     = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                video.child_name?.let {
                    Text(
                        text  = it,
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold)
                    )
                }
                Spacer(Modifier.height(4.dp))
                StatusChip(status = video.status)
                Spacer(Modifier.height(4.dp))
                Text(
                    text  = formatDate(video.uploaded_at),
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
                    )
                )
            }

            if (video.status.equals("ready", ignoreCase = true)) {
                Spacer(Modifier.width(12.dp))
                TextButton(onClick = onViewReport) {
                    Text(
                        text  = "View report",
                        style = MaterialTheme.typography.labelMedium.copy(
                            color      = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.SemiBold
                        )
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusChip(status: String) {
    val (label, color) = when (status.lowercase()) {
        "uploaded"  -> "Uploaded" to MaterialTheme.colorScheme.secondary.copy(alpha = 0.8f)
        "analysing", "processing" -> "Analysing…" to RiskModerate
        "ready"     -> "Ready" to ParentPrimary
        "failed"    -> "Failed" to RiskHigh
        else        -> status to MaterialTheme.colorScheme.onSurface
    }
    Surface(
        shape = RoundedCornerShape(50.dp),
        color = color.copy(alpha = 0.15f)
    ) {
        Text(
            text     = label,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style    = MaterialTheme.typography.labelSmall.copy(color = color)
        )
    }
}

@Composable
private fun EmptyState() {
    Column(
        modifier            = Modifier
            .fillMaxWidth()
            .padding(vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(
            imageVector = Icons.Default.VideoLibrary,
            contentDescription = null,
            modifier = Modifier.size(56.dp),
            tint = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.25f)
        )
        Text(
            text  = "No videos yet",
            style = MaterialTheme.typography.titleMedium.copy(
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)
            )
        )
        Text(
            text  = "Upload your first video to get started",
            style = MaterialTheme.typography.bodyMedium.copy(
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.35f)
            )
        )
    }
}

private fun formatDate(dateStr: String): String {
    return try {
        dateStr.take(10) // ISO date prefix YYYY-MM-DD
    } catch (_: Exception) {
        dateStr
    }
}
