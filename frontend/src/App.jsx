import { Route, Routes, Navigate } from "react-router-dom";
import { MainLayout } from "./layouts";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { ROUTES, roleHome } from "./routes";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import JobsPage from "./pages/JobsPage";
import JobDetailPage from "./pages/JobDetailPage";
import CandidateProfilePage from "./pages/candidate/ProfilePage";
import CandidateResumesPage from "./pages/candidate/ResumesPage";
import CandidateResumeBuilderPage from "./pages/candidate/ResumeBuilderPage";
import CandidateTemplatesPage from "./pages/candidate/TemplatesPage";
import CandidateApplicationsPage from "./pages/candidate/ApplicationsPage";
import CandidateEmployersPage from "./pages/candidate/EmployersPage";
import RecruiterDashboardPage from "./pages/recruiter/DashboardPage";
import RecruiterJobsPage from "./pages/recruiter/JobsPage";
import RecruiterJobEditorPage from "./pages/recruiter/JobEditorPage";
import RecruiterCvScreeningPage from "./pages/recruiter/CvScreeningPage";
import RecruiterApplicationsPage from "./pages/recruiter/ApplicationsPage";
import RecruiterCompanyPage from "./pages/recruiter/CompanyPage";
import RecruiterProfilePage from "./pages/recruiter/ProfilePage";

export default function App() {
  const { user } = useAuth();

  return (
    <MainLayout>
      <Routes>
        <Route path={ROUTES.home} element={<LandingPage />} />
        <Route path={ROUTES.auth} element={user ? <Navigate to={roleHome(user.role)} replace /> : <AuthPage />} />
        <Route path={ROUTES.jobs} element={<JobsPage />} />
        <Route path={ROUTES.jobDetail()} element={<JobDetailPage />} />
        <Route path={ROUTES.candidate.profile} element={<ProtectedRoute roles={["candidate"]}><CandidateProfilePage /></ProtectedRoute>} />
        <Route path={ROUTES.candidate.resumes} element={<ProtectedRoute roles={["candidate"]}><CandidateResumesPage /></ProtectedRoute>} />
        <Route path={ROUTES.candidate.resumeCreate} element={<ProtectedRoute roles={["candidate"]}><CandidateResumeBuilderPage /></ProtectedRoute>} />
        <Route path={ROUTES.candidate.templates} element={<ProtectedRoute roles={["candidate"]}><CandidateTemplatesPage /></ProtectedRoute>} />
        <Route path={ROUTES.candidate.applications} element={<ProtectedRoute roles={["candidate"]}><CandidateApplicationsPage /></ProtectedRoute>} />
        <Route path={ROUTES.candidate.employers} element={<ProtectedRoute roles={["candidate"]}><CandidateEmployersPage /></ProtectedRoute>} />
        <Route path={ROUTES.recruiter.dashboard} element={<ProtectedRoute roles={["recruiter"]}><RecruiterDashboardPage /></ProtectedRoute>} />
        <Route path={ROUTES.recruiter.jobs} element={<ProtectedRoute roles={["recruiter"]}><RecruiterJobsPage /></ProtectedRoute>} />
        <Route path={ROUTES.recruiter.jobCreate} element={<ProtectedRoute roles={["recruiter"]}><RecruiterJobEditorPage /></ProtectedRoute>} />
        <Route path={ROUTES.recruiter.jobEdit()} element={<ProtectedRoute roles={["recruiter"]}><RecruiterJobEditorPage /></ProtectedRoute>} />
        <Route path={ROUTES.recruiter.screening} element={<ProtectedRoute roles={["recruiter"]}><RecruiterCvScreeningPage /></ProtectedRoute>} />
        <Route path={ROUTES.recruiter.applications} element={<ProtectedRoute roles={["recruiter"]}><RecruiterApplicationsPage /></ProtectedRoute>} />
        <Route path={ROUTES.recruiter.company} element={<ProtectedRoute roles={["recruiter"]}><RecruiterCompanyPage /></ProtectedRoute>} />
        <Route path={ROUTES.recruiter.profile} element={<ProtectedRoute roles={["recruiter"]}><RecruiterProfilePage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}
