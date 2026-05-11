import type { ReactNode } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback";

import DashboardPage from "./pages/app/DashboardPage";
import ProfilePage from "./pages/app/ProfilePage";
import HistoryPage from "./pages/app/HistoryPage";
import PatientAnalysisPage from "./pages/app/PatientAnalysisPage";
import PredictionResultsPage from "./pages/app/PredictionResultsPage";
import KnowledgeAssistantPage from "./pages/app/KnowledgeAssistantPage";
import PlantLibraryPage from "./pages/app/PlantLibraryPage";
import SettingsPage from "./pages/app/SettingsPage";
import ModelStatusPage from "./pages/app/ModelStatusPage";
import PlaceholderPage from "./pages/app/PlaceholderPage";
import PatientReportPage from "./pages/app/PatientReportPage";
import NewPatientPage from "./pages/app/NewPatientPage";

const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-herbal-forest border-t-transparent" />
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
      <Route path="/signup" element={<AuthLayout><Signup /></AuthLayout>} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Navigate to="/app/dashboard" replace />
          </PrivateRoute>
        }
      />
      <Route
        path="/history"
        element={
          <PrivateRoute>
            <Navigate to="/app/history" replace />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Navigate to="/app/profile" replace />
          </PrivateRoute>
        }
      />

      {/* New AI dashboard (sidebar + top bar layout) */}
      <Route
        path="/app"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="patient-analysis" element={<PatientAnalysisPage />} />
        <Route path="patients/new" element={<NewPatientPage />} />
        <Route path="prediction-results" element={<PredictionResultsPage />} />
        <Route path="patient-report" element={<PatientReportPage />} />
        <Route path="knowledge-assistant" element={<KnowledgeAssistantPage />} />
        <Route path="plant-library" element={<PlantLibraryPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="model-status" element={<ModelStatusPage />} />
        <Route path="prakriti" element={<PlaceholderPage />} />
        <Route path="disease-prediction" element={<PlaceholderPage />} />
        <Route path="dosha-analysis" element={<PlaceholderPage />} />
        <Route path="herbal-recommendations" element={<PlaceholderPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
