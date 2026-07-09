package com.earlyeyes.app.core.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf

// ── Parent color scheme ───────────────────────────────────────────────────────
private val ParentColorScheme = lightColorScheme(
    primary           = ParentPrimary,
    onPrimary         = ParentSurface,
    primaryContainer  = Color(0xFFD4E8DA),
    onPrimaryContainer= ParentText,
    secondary         = ParentAccent,
    onSecondary       = ParentSurface,
    background        = ParentBackground,
    onBackground      = ParentText,
    surface           = ParentSurface,
    onSurface         = ParentText,
    surfaceVariant    = Color(0xFFF0F0EC),
    outline           = ParentOutline,
    error             = Color(0xFFB91C1C),
    onError           = ParentSurface
)

// ── Clinician color scheme ────────────────────────────────────────────────────
private val ClinicianColorScheme = lightColorScheme(
    primary           = ClinicianPrimary,
    onPrimary         = ClinicianBackground,
    primaryContainer  = Color(0xFFEEF2FF),
    onPrimaryContainer= ClinicianText,
    secondary         = ClinicianSecondary,
    onSecondary       = ClinicianBackground,
    background        = ClinicianBackground,
    onBackground      = ClinicianText,
    surface           = ClinicianSurface,
    onSurface         = ClinicianText,
    surfaceVariant    = Color(0xFFF1F5F9),
    outline           = ClinicianOutline,
    error             = Color(0xFFDC2626),
    onError           = ClinicianBackground
)

// ── Portal type ───────────────────────────────────────────────────────────────
enum class Portal { PARENT, CLINICIAN }

val LocalPortal = staticCompositionLocalOf { Portal.PARENT }

@Composable
fun EarlyEyesTheme(
    portal: Portal = Portal.PARENT,
    content: @Composable () -> Unit
) {
    val colorScheme = when (portal) {
        Portal.PARENT    -> ParentColorScheme
        Portal.CLINICIAN -> ClinicianColorScheme
    }

    CompositionLocalProvider(LocalPortal provides portal) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography  = AppTypography,
            content     = content
        )
    }
}

// Convenience alias for Color import avoidance
private fun Color(value: Long) = androidx.compose.ui.graphics.Color(value.toUInt())
