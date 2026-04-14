import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../routes";

export default function CandidateHeader() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(null);
  const rootRef = useRef(null);

  const activePath = location.pathname;
  const isCvActive = useMemo(
    () => activePath.startsWith(ROUTES.candidate.resumes) || activePath.startsWith(ROUTES.candidate.templates),
    [activePath],
  );
  const isEmployersActive = activePath.startsWith(ROUTES.candidate.employers);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setOpenMenu(null);
  }, [location.pathname]);

  const closeMenus = () => setOpenMenu(null);

  const handleLogout = () => {
    closeMenus();
    logout();
    navigate(ROUTES.home);
  };

  return (
    <header className="topbar topbar--clean topbar--candidate" ref={rootRef}>
      <div className="container candidate-topbar-row">
        <Link className="brand brand--jobportal candidate-brand" to={ROUTES.home} aria-label="JOBPORTAL home">
          <span className="brand-job">JOB</span>
          <span className="brand-portal">PORTAL</span>
        </Link>

        <nav className="candidate-nav" aria-label="Điều hướng ứng viên">
          <NavLink to={ROUTES.jobs} className={({ isActive }) => `candidate-nav-link ${isActive ? "candidate-nav-link--active" : ""}`}>
            Việc làm
          </NavLink>

          <NavLink to={ROUTES.candidate.resumes} className={() => `candidate-nav-link ${isCvActive ? "candidate-nav-link--active" : ""}`}>
            CV
          </NavLink>

          <NavLink
            to={ROUTES.candidate.employers}
            className={() => `candidate-nav-link ${isEmployersActive ? "candidate-nav-link--active" : ""}`}
          >
            Nhà tuyển dụng
          </NavLink>

          <NavLink
            to={ROUTES.candidate.profile}
            className={({ isActive }) => `candidate-nav-link ${isActive ? "candidate-nav-link--active" : ""}`}
          >
            Hồ sơ
          </NavLink>
        </nav>

        <div className="candidate-actions">
          <div className="candidate-user">
            <button
              type="button"
              className="candidate-user-button"
              onClick={() => setOpenMenu((current) => (current === "user" ? null : "user"))}
              aria-haspopup="menu"
              aria-expanded={openMenu === "user"}
            >
              <span className="candidate-avatar">{getInitials(user?.full_name || user?.email || "U")}</span>
              <span className="candidate-user-meta">
                <strong>{user?.full_name || "User"}</strong>
                <span>{user?.email}</span>
              </span>
            </button>

            {openMenu === "user" ? (
              <div className="candidate-user-menu" role="menu" aria-label="Tài khoản ứng viên">
                <Link role="menuitem" to={ROUTES.candidate.profile} onClick={closeMenus}>
                  Hồ sơ
                </Link>
                <Link role="menuitem" to={ROUTES.candidate.resumes} onClick={closeMenus}>
                  CV của tôi
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

function getInitials(name) {
  const raw = (name || "U").trim();
  return raw
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}