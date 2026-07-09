package com.earlyeyes.app.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.earlyeyes.app.core.theme.RiskHigh
import com.earlyeyes.app.core.theme.RiskLow
import com.earlyeyes.app.core.theme.RiskModerate

/**
 * Animated circular ring that fills from 0 → [score] over 1200ms on first composition.
 *
 * @param score  0–100 float
 * @param label  Caption displayed below the ring
 */
@Composable
fun RiskScoreRing(
    score: Float,
    label: String,
    modifier: Modifier = Modifier,
    ringSize: Dp = 96.dp,
    strokeWidth: Dp = 8.dp
) {
    var animationStarted by remember { mutableStateOf(false) }

    val animatedSweep by animateFloatAsState(
        targetValue = if (animationStarted) (score / 100f) * 360f else 0f,
        animationSpec = tween(durationMillis = 1200, easing = androidx.compose.animation.core.FastOutSlowInEasing),
        label = "ring_sweep"
    )

    LaunchedEffect(Unit) { animationStarted = true }

    val arcColor = when {
        score >= 70f -> RiskLow
        score >= 40f -> RiskModerate
        else         -> RiskHigh
    }

    val trackColor = MaterialTheme.colorScheme.surfaceVariant

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Canvas(modifier = Modifier.size(ringSize)) {
                val stroke = Stroke(width = strokeWidth.toPx(), cap = StrokeCap.Round)
                val inset = strokeWidth.toPx() / 2f
                val topLeft = Offset(inset, inset)
                val arcSize = Size(size.width - strokeWidth.toPx(), size.height - strokeWidth.toPx())

                // Track (gray background arc)
                drawArc(
                    color      = trackColor,
                    startAngle = -90f,
                    sweepAngle = 360f,
                    useCenter  = false,
                    topLeft    = topLeft,
                    size       = arcSize,
                    style      = stroke
                )

                // Animated filled arc
                drawArc(
                    color      = arcColor,
                    startAngle = -90f,
                    sweepAngle = animatedSweep,
                    useCenter  = false,
                    topLeft    = topLeft,
                    size       = arcSize,
                    style      = stroke
                )
            }

            // Score text inside ring
            Text(
                text  = score.toInt().toString(),
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color      = arcColor,
                    fontSize   = 20.sp
                )
            )
        }

        Text(
            text  = label,
            style = MaterialTheme.typography.labelMedium.copy(
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
            )
        )
    }
}
