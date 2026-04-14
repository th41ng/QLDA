import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AUTH_ACTIONS, FOOTER_LINKS, HEADER_NAV, ROLE_NAV, ROUTES, authRoute } from "../routes";
import CandidateHeader from "./CandidateHeader";
import RecruiterHeader from "./RecruiterHeader";

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const authSearch = new URLSearchParams(location.search);
  const onAuthPage = location.pathname === ROUTES.auth;
  const authMode = onAuthPage && authSearch.get("mode") === "register" ? "register" : "login";
  const authRole = onAuthPage && authSearch.get("role") === "recruiter" ? "recruiter" : "candidate";
  const useCandidateHeader = user?.role === "candidate";
  const useRecruiterHeader = user?.role === "recruiter";
  const roleNav = ROLE_NAV[user?.role] || [];
  const headerNav = user ? [...HEADER_NAV, ...roleNav] : HEADER_NAV;

  return (
    <div className="app-shell">
      {useRecruiterHeader ? (
        <RecruiterHeader />
      ) : useCandidateHeader ? (
        <CandidateHeader />
      ) : (
        <header className="topbar topbar--clean">
          <div className="container topbar-row">
            <Link className="brand brand--jobportal" to={ROUTES.home} aria-label="JOBPORTAL home">
              <span className="brand-job">JOB</span>
              <span className="brand-portal">PORTAL</span>
            </Link>

            <nav className="topbar-nav topbar-nav--main" aria-label="Điều hướng chính">
              {headerNav.map((item) => {
                const isAnchor = typeof item.to === "string" && item.to.includes("#");
                const className = ({ isActive }) => `topbar-link ${isActive ? "topbar-link--active" : ""}`;

                if (isAnchor) {
                  return (
                    <a key={item.to} href={item.to} className="topbar-link">
                      {item.label}
                    </a>
                  );
                }

                return (
                  <NavLink key={item.to} to={item.to} className={className}>
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <div className="topbar-actions">
              {user ? (
                <>
                  <span className="user-pill">{user.full_name || user.email}</span>
                  <button className="btn btn-ghost btn-small" type="button" onClick={logout}>
                    Đăng xuất
                  </button>
                </>
              ) : (
                AUTH_ACTIONS.map((item) => {
                  const isActiveAction = onAuthPage && authMode === item.mode;
                  const className = onAuthPage
                    ? isActiveAction
                      ? "btn btn-small"
                      : "btn btn-ghost btn-small"
                    : item.variant === "primary"
                      ? "btn btn-small"
                      : "btn btn-ghost btn-small";

                  return (
                    <Link key={item.label} to={authRoute(item.mode, authRole)} state={{ focusAuth: true }} className={className}>
                      {item.label}
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </header>
      )}

      <main className="container app-main">{children}</main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand-block">
            <Link className="brand brand--jobportal footer-brand" to={ROUTES.home}>
              <span className="brand-job">JOB</span>
              <span className="brand-portal">PORTAL</span>
            </Link>
            <p>Nền tảng kết nối ứng viên và nhà tuyển dụng với trải nghiệm hiện đại, rõ ràng và dễ dùng.</p>
            <span className="footer-copyright">© 2026 JOBPORTAL</span>
            <div className="footer-socials" aria-label="Mạng xã hội">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
                f
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                in
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
                ig
              </a>
            </div>
          </div>

          <FooterColumn title="Liên kết nhanh" items={FOOTER_LINKS.quick} />
          <FooterColumn title="Hỗ trợ" items={FOOTER_LINKS.support} />
          <FooterColumn title="Liên hệ" items={FOOTER_LINKS.contact} />
          <FooterNewsletter />
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, items }) {
  return (
    <div className="footer-column">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => {
          if (item.to.startsWith("mailto:") || item.to.startsWith("tel:")) {
            return (
              <li key={item.label}>
                <a href={item.to}>{item.label}</a>
              </li>
            );
          }
          return (
            <li key={item.label}>
              <Link to={item.to}>{item.label}</Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FooterNewsletter() {
  return (
    <div className="footer-column footer-newsletter">
      <h3>Nhận việc mới</h3>
      <p>Nhận việc làm mới qua email mỗi tuần.</p>
      <div className="newsletter-form">
        <input type="email" placeholder="Email của bạn" aria-label="Email của bạn" />
        <button type="button" className="btn btn-small">
          Đăng ký
        </button>
      </div>
    </div>
  );
}
