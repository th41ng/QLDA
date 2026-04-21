import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HEADER_NAV, ROLE_NAV, ROUTES } from "../routes";

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const roleNav = ROLE_NAV[user?.role] || [];
  const headerNav = [...HEADER_NAV, ...roleNav];

  return (
    <header className="topbar topbar--admin">
      <div className="container topbar-row">
        <Link className="brand brand--jobportal" to={ROUTES.admin.dashboard} aria-label="JOBPORTAL Admin">
          <span className="brand-job">JOB</span>
          <span className="brand-portal">PORTAL</span>
        </Link>

        <nav className="topbar-nav topbar-nav--main" aria-label="Admin Navigation">
          {headerNav.map((item) => (
            <a
              key={item.to}
              href={item.to}
              className={`topbar-link ${location.pathname === item.to ? "topbar-link--active" : ""}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="topbar-actions">
          {user && (
            <>
              <span className="user-name">{user.username}</span>
              <button onClick={logout} className="btn btn--logout">
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
