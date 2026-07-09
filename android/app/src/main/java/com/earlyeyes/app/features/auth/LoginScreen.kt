package com.earlyeyes.app.features.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.earlyeyes.app.R
import com.earlyeyes.app.components.EarlyEyesButton
import com.earlyeyes.app.components.EarlyEyesTextField
import com.earlyeyes.app.core.theme.ParentPrimary
import com.earlyeyes.app.core.theme.ClinicianPrimary

@Composable
fun LoginScreen(
    onLoginSuccess: (String) -> Unit,
    onNavigateToSignup: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var selectedRole by remember { mutableStateOf("parent") }

    LaunchedEffect(uiState) {
        if (uiState is LoginUiState.Success) {
            onLoginSuccess((uiState as LoginUiState.Success).role)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(72.dp))

            // ── Logo ──────────────────────────────────────────────────────────
            Text(
                text  = "EarlyEyes",
                style = MaterialTheme.typography.displayMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color      = MaterialTheme.colorScheme.primary
                )
            )
            Text(
                text  = "Early detection. Better outcomes.",
                style = MaterialTheme.typography.bodyMedium.copy(
                    color      = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
                    fontStyle  = FontStyle.Italic
                )
            )

            Spacer(modifier = Modifier.height(48.dp))

            // ── Role Toggle ───────────────────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                horizontalArrangement = Arrangement.spacedBy(0.dp)
            ) {
                listOf("parent" to stringResource(R.string.role_parent),
                       "clinician" to stringResource(R.string.role_clinician)).forEach { (role, label) ->
                    val isSelected = selectedRole == role
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                if (isSelected) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.surfaceVariant
                            )
                            .clickable { selectedRole = role }
                            .padding(vertical = 12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text  = label,
                            style = MaterialTheme.typography.labelLarge.copy(
                                color      = if (isSelected) MaterialTheme.colorScheme.onPrimary
                                             else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal
                            )
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // ── Fields ────────────────────────────────────────────────────────
            EarlyEyesTextField(
                value          = email,
                onValueChange  = { email = it },
                label          = stringResource(R.string.label_email),
                keyboardType   = KeyboardType.Email,
                imeAction      = ImeAction.Next
            )

            Spacer(modifier = Modifier.height(12.dp))

            EarlyEyesTextField(
                value         = password,
                onValueChange = { password = it },
                label         = stringResource(R.string.label_password),
                isPassword    = true,
                imeAction     = ImeAction.Done,
                onImeAction   = { viewModel.login(email, password, selectedRole) }
            )

            Spacer(modifier = Modifier.height(24.dp))

            // ── Error ─────────────────────────────────────────────────────────
            if (uiState is LoginUiState.Error) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors   = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.error.copy(alpha = 0.1f)
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text      = (uiState as LoginUiState.Error).message,
                        modifier  = Modifier.padding(12.dp),
                        style     = MaterialTheme.typography.bodySmall.copy(
                            color = MaterialTheme.colorScheme.error
                        )
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            // ── Sign in button ────────────────────────────────────────────────
            EarlyEyesButton(
                text      = stringResource(R.string.btn_sign_in),
                onClick   = { viewModel.login(email, password, selectedRole) },
                isLoading = uiState is LoginUiState.Loading
            )

            Spacer(modifier = Modifier.height(20.dp))

            // ── Create account link ───────────────────────────────────────────
            if (selectedRole == "parent") {
                Text(
                    text      = stringResource(R.string.link_create_account),
                    style     = MaterialTheme.typography.bodyMedium.copy(
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Medium
                    ),
                    modifier  = Modifier.clickable { onNavigateToSignup() },
                    textAlign = TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}
