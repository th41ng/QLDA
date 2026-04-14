import { Navigate } from "react-router-dom";
import { ROUTES } from "../../routes";

export default function TemplatesPage() {
  return <Navigate to={ROUTES.candidate.resumeCreate} replace />;
}
