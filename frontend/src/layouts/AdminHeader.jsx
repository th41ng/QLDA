import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTES, ROLE_NAV } from "../routes";
import styles from "./AdminHeader.module.css";

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const roleNav = ROLE_NAV.admin || [];

  const handleLogout = () => {
    logout();
    navigate(ROUTES.admin.login);
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link className={styles.brand} to={ROUTES.admin.dashboard} aria-label="JOBPORTAL Admin">
          <span className={styles.brandJob}>JOB</span>
          <span className={styles.brandPortal}>PORTAL</span>
          <span className={styles.adminBadge}>Admin</span>
        </Link>

        <nav className={styles.nav} aria-label="Điều hướng Admin">
          {roleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.full_name || user?.email}</span>
            <span className={styles.userRole}>Administrator</span>
          </div>
          <button
            onClick={handleLogout}
            className={styles.logoutBtn}
            title="Đăng xuất"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
