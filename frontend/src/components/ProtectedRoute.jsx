import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../routes";

export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to={ROUTES.auth} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={ROUTES.home} replace />;
  }
  return children;
}
