import { Route, Routes, Navigate } from "react-router-dom";
import { MainLayout } from "./layouts";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { ROUTES, roleHome } from "./routes";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import CandidateProfilePage from "./pages/candidate/ProfilePage";
import RecruiterDashboardPage from "./pages/recruiter/DashboardPage";

export default function App() {
  const { user } = useAuth();

  return (
    <MainLayout>
      <Routes>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.auth} element={user ? <Navigate to={roleHome(user.role)} replace /> : <AuthPage />} />
        <Route path={ROUTES.candidate.profile} element={<ProtectedRoute roles={["candidate"]}><CandidateProfilePage /></ProtectedRoute>} />
        <Route path={ROUTES.recruiter.dashboard} element={<ProtectedRoute roles={["recruiter"]}><RecruiterDashboardPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
    </MainLayout>
  );
}
