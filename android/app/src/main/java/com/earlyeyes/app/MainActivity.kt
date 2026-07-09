package com.earlyeyes.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.earlyeyes.app.core.auth.TokenManager
import com.earlyeyes.app.core.theme.EarlyEyesTheme
import com.earlyeyes.app.features.auth.LoginScreen
import com.earlyeyes.app.features.auth.SignupParentScreen
import com.earlyeyes.app.features.clinician.dashboard.ClinicianDashboardScreen
import com.earlyeyes.app.features.clinician.review.ReviewScreen
import com.earlyeyes.app.features.parent.dashboard.ParentDashboardScreen
import com.earlyeyes.app.features.parent.report.ReportScreen
import com.earlyeyes.app.features.parent.upload.UploadScreen
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

object Routes {
    const val LOGIN = "login"
    const val SIGNUP_PARENT = "signup_parent"
    const val PARENT_DASHBOARD = "parent_dashboard"
    const val PARENT_UPLOAD = "parent_upload"
    const val PARENT_REPORT = "parent_report/{reportId}"
    const val CLINICIAN_DASHBOARD = "clinician_dashboard"
    const val CLINICIAN_REVIEW = "clinician_review/{reportId}"

    fun parentReport(reportId: String) = "parent_report/$reportId"
    fun clinicianReview(reportId: String) = "clinician_review/$reportId"
}

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var tokenManager: TokenManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EarlyEyesTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    val navController = rememberNavController()
                    var startDestination by remember { mutableStateOf<String?>(null) }

                    LaunchedEffect(Unit) {
                        val token = tokenManager.getAccessToken()
                        val role = tokenManager.getUserRole()
                        startDestination = when {
                            token != null && role == "clinician" -> Routes.CLINICIAN_DASHBOARD
                            token != null && role == "parent" -> Routes.PARENT_DASHBOARD
                            else -> Routes.LOGIN
                        }
                    }

                    if (startDestination != null) {
                        NavHost(
                            navController = navController,
                            startDestination = startDestination!!
                        ) {
                            composable(Routes.LOGIN) {
                                LoginScreen(
                                    onLoginSuccess = { role ->
                                        val dest = if (role == "clinician")
                                            Routes.CLINICIAN_DASHBOARD
                                        else
                                            Routes.PARENT_DASHBOARD
                                        navController.navigate(dest) {
                                            popUpTo(Routes.LOGIN) { inclusive = true }
                                        }
                                    },
                                    onNavigateToSignup = {
                                        navController.navigate(Routes.SIGNUP_PARENT)
                                    }
                                )
                            }

                            composable(Routes.SIGNUP_PARENT) {
                                SignupParentScreen(
                                    onSignupSuccess = {
                                        navController.navigate(Routes.PARENT_DASHBOARD) {
                                            popUpTo(Routes.LOGIN) { inclusive = true }
                                        }
                                    },
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            composable(Routes.PARENT_DASHBOARD) {
                                ParentDashboardScreen(
                                    onNavigateToUpload = {
                                        navController.navigate(Routes.PARENT_UPLOAD)
                                    },
                                    onNavigateToReport = { reportId ->
                                        navController.navigate(Routes.parentReport(reportId))
                                    },
                                    onLogout = {
                                        navController.navigate(Routes.LOGIN) {
                                            popUpTo(0) { inclusive = true }
                                        }
                                    }
                                )
                            }

                            composable(Routes.PARENT_UPLOAD) {
                                UploadScreen(
                                    onUploadComplete = {
                                        navController.navigate(Routes.PARENT_DASHBOARD) {
                                            popUpTo(Routes.PARENT_DASHBOARD) { inclusive = true }
                                        }
                                    },
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            composable(Routes.PARENT_REPORT) { backStackEntry ->
                                val reportId = backStackEntry.arguments?.getString("reportId") ?: ""
                                ReportScreen(
                                    reportId = reportId,
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            composable(Routes.CLINICIAN_DASHBOARD) {
                                ClinicianDashboardScreen(
                                    onNavigateToReview = { reportId ->
                                        navController.navigate(Routes.clinicianReview(reportId))
                                    },
                                    onLogout = {
                                        navController.navigate(Routes.LOGIN) {
                                            popUpTo(0) { inclusive = true }
                                        }
                                    }
                                )
                            }

                            composable(Routes.CLINICIAN_REVIEW) { backStackEntry ->
                                val reportId = backStackEntry.arguments?.getString("reportId") ?: ""
                                ReviewScreen(
                                    reportId = reportId,
                                    onNavigateBack = { navController.popBackStack() },
                                    onSentSuccessfully = { navController.popBackStack() }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
