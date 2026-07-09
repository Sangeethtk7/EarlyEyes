package com.earlyeyes.app.features.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.earlyeyes.app.R
import com.earlyeyes.app.components.EarlyEyesButton
import com.earlyeyes.app.components.EarlyEyesTextField

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignupParentScreen(
    onSignupSuccess: () -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: SignupParentViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var agreedToDisclaimer by remember { mutableStateOf(false) }

    LaunchedEffect(uiState) {
        if (uiState is SignupUiState.Success) onSignupSuccess()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.signup_title)) },
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
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            EarlyEyesTextField(
                value         = fullName,
                onValueChange = { fullName = it },
                label         = stringResource(R.string.label_full_name),
                imeAction     = ImeAction.Next
            )

            EarlyEyesTextField(
                value         = email,
                onValueChange = { email = it },
                label         = stringResource(R.string.label_email),
                keyboardType  = KeyboardType.Email,
                imeAction     = ImeAction.Next
            )

            EarlyEyesTextField(
                value         = password,
                onValueChange = { password = it },
                label         = stringResource(R.string.label_password),
                isPassword    = true,
                imeAction     = ImeAction.Next
            )

            EarlyEyesTextField(
                value         = confirmPassword,
                onValueChange = { confirmPassword = it },
                label         = stringResource(R.string.label_confirm_password),
                isPassword    = true,
                imeAction     = ImeAction.Done,
                isError       = confirmPassword.isNotBlank() && password != confirmPassword,
                supportingText = if (confirmPassword.isNotBlank() && password != confirmPassword)
                    "Passwords do not match" else null
            )

            Spacer(modifier = Modifier.height(4.dp))

            // ── Disclaimer checkbox ───────────────────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top
            ) {
                Checkbox(
                    checked         = agreedToDisclaimer,
                    onCheckedChange = { agreedToDisclaimer = it },
                    colors          = CheckboxDefaults.colors(
                        checkedColor = MaterialTheme.colorScheme.primary
                    )
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text      = stringResource(R.string.disclaimer_checkbox),
                    style     = MaterialTheme.typography.bodyMedium.copy(
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.8f)
                    ),
                    modifier  = Modifier
                        .padding(top = 12.dp)
                        .clickable { agreedToDisclaimer = !agreedToDisclaimer }
                )
            }

            // ── Error card ────────────────────────────────────────────────────
            if (uiState is SignupUiState.Error) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors   = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.error.copy(alpha = 0.1f)
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text     = (uiState as SignupUiState.Error).message,
                        modifier = Modifier.padding(12.dp),
                        style    = MaterialTheme.typography.bodySmall.copy(
                            color = MaterialTheme.colorScheme.error
                        )
                    )
                }
            }

            EarlyEyesButton(
                text      = stringResource(R.string.btn_sign_up),
                onClick   = {
                    viewModel.signup(fullName, email, password, confirmPassword, agreedToDisclaimer)
                },
                isLoading = uiState is SignupUiState.Loading
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text     = stringResource(R.string.btn_back_to_login),
                style    = MaterialTheme.typography.bodyMedium.copy(
                    color      = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Medium
                ),
                modifier = Modifier.clickable { onNavigateBack() }
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
