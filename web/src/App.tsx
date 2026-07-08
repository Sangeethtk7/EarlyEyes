import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import RoleRoute from "./components/shared/RoleRoute";

// Import all pages
import Login from "./pages/auth/Login";
import SignupParent from "./pages/auth/SignupParent";
import SignupClinician from "./pages/auth/SignupClinician";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ParentDashboard from "./pages/parent/Dashboard";
import Children from "./pages/parent/Children";
import VideoUpload from "./pages/parent/VideoUpload";
import ReportDetail from "./pages/parent/Reports";
import History from "./pages/parent/History";
import ClinicianDashboard from "./pages/clinician/Dashboard";
import ClinicianReview from "./pages/clinician/Review";
import Patients from "./pages/clinician/Patients";
import Profile from "./pages/clinician/Profile";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup/parent" element={<SignupParent />} />
          <Route path="/signup/clinician" element={<SignupClinician />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Parent Routes */}
          <Route
            path="/parent/dashboard"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRole="parent">
                  <ParentDashboard />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/children"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRole="parent">
                  <Children />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/upload"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRole="parent">
                  <VideoUpload />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/reports/:reportId"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRole="parent">
                  <ReportDetail />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/history"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRole="parent">
                  <History />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          {/* Clinician Routes */}
          <Route
            path="/clinician/dashboard"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRole="clinician">
                  <ClinicianDashboard />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinician/patients"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRole="clinician">
                  <Patients />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinician/review/:reportId"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRole="clinician">
                  <ClinicianReview />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinician/profile"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRole="clinician">
                  <Profile />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          {/* 404 Route */}
          <Route
            path="*"
            element={
              <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAF7] text-center p-4">
                <h1 className="text-4xl font-serif text-[#1E293B] mb-4">
                  404 — Page not found
                </h1>
                <p className="text-gray-600 mb-6">
                  The page you are looking for does not exist or has been moved.
                </p>
                <Link
                  to="/login"
                  className="text-[#7C9E87] hover:text-[#6B8D76] font-medium underline transition-colors"
                >
                  Back to login
                </Link>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
