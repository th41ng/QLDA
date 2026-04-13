import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authRoute, roleHome } from "../routes";

export default function HomePage() {
  const { user } = useAuth();

  if (user) {
    return (
      <section className="panel">
        <div className="card">
          <h1>Chao mung, {user.full_name || user.email}</h1>
          <p>Ban da dang nhap voi vai tro: {user.role}.</p>
          <Link className="btn" to={roleHome(user.role)}>
            Vao trang vai tro
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="card">
        <h1>He thong dang nhap / dang ky</h1>
        <p>Dang nhap hoac tao tai khoan bang mat khau hoac OTP.</p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link className="btn" to={authRoute("login", "candidate")}>Dang nhap</Link>
          <Link className="btn btn-ghost" to={authRoute("register", "candidate")}>Dang ky ung vien</Link>
          <Link className="btn btn-ghost" to={authRoute("register", "recruiter")}>Dang ky nha tuyen dung</Link>
        </div>
      </div>
    </section>
  );
}
