import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_NAV, ROUTES } from "../routes";

const DEFAULT_NAV = ROLE_NAV.recruiter;

export default function RecruiterHeader() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navItems = useMemo(() => DEFAULT_NAV, []);
  const activePath = location.pathname;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate(ROUTES.home);
  };

  return (
    <header className="topbar topbar--recruiter">
      <div className="container recruiter-topbar-row">
        <Link className="brand brand--jobportal recruiter-brand" to={ROUTES.recruiter.dashboard} aria-label="JOBPORTAL recruiter home">
          <span className="brand-job">JOB</span>
          <span className="brand-portal">PORTAL</span>
        </Link>

        <nav className="recruiter-nav" aria-label="Điều hướng recruiter">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `recruiter-nav-link ${isActive || activePath === item.to ? "recruiter-nav-link--active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="recruiter-actions">
          <Link className="btn btn-small recruiter-cta" to={ROUTES.recruiter.jobCreate}>
            + Đăng tin tuyển dụng
          </Link>

          <div className="recruiter-user" ref={menuRef}>
            <button
              type="button"
              className="recruiter-user-button"
              onClick={() => setOpen((current) => !current)}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <span className="recruiter-avatar">{(user?.full_name || user?.email || "R").slice(0, 1).toUpperCase()}</span>
              <span className="recruiter-user-meta">
                <strong>{user?.full_name || "Recruiter"}</strong>
                <span>{user?.email}</span>
              </span>
            </button>

            {open ? (
              <div className="recruiter-user-menu" role="menu" aria-label="Tài khoản recruiter">
                <Link role="menuitem" to={ROUTES.recruiter.profile} onClick={() => setOpen(false)}>
                  Hồ sơ
                </Link>
                <Link role="menuitem" to={ROUTES.recruiter.company} onClick={() => setOpen(false)}>
                  Cài đặt
                </Link>
                <button role="menuitem" type="button" onClick={handleLogout}>
                  Đăng xuất
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
