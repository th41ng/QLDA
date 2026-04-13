import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROUTES } from "../../routes";

export default function CandidateProfilePage() {
  const { user } = useAuth();

  return (
    <section className="panel">
      <div className="card">
        <h1>Trang ung vien</h1>
        <p>Tai khoan: {user?.full_name || user?.email}</p>
        <p>Vai tro hien tai: candidate.</p>
        <Link className="btn" to={ROUTES.auth}>Quan ly tai khoan</Link>
      </div>
    </section>
  );
}
