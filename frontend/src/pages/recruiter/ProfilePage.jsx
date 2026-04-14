import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { ROUTES } from "../../routes";

const EMPTY_COMPANY = {
  company_name: "",
  tax_code: "",
  website: "",
  address: "",
  description: "",
  logo_url: "",
  industry: "",
  status: "",
};

export default function RecruiterProfilePage() {
  const { user } = useAuth();
  const [company, setCompany] = useState(EMPTY_COMPANY);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    full_name: "",
    email: "",
    role: "",
    status: "",
    auth_method_preference: "",
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [companyData, jobsData, appsData] = await Promise.all([
          api.companies.me().catch(() => null),
          api.jobs.mine().catch(() => []),
          api.applications.recruiterApplications().catch(() => []),
        ]);

        if (!mounted) return;
        setCompany(companyData || EMPTY_COMPANY);
        setJobs(Array.isArray(jobsData) ? jobsData : []);
        setApplications(Array.isArray(appsData) ? appsData : []);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Không thể tải dữ liệu hồ sơ.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (user?.role === "recruiter" || user?.role === "admin") {
      load();
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [user?.role]);

  useEffect(() => {
    setProfileDraft({
      full_name: user?.full_name || "",
      email: user?.email || "",
      role: user?.role || "recruiter",
      status: user?.status || "active",
      auth_method_preference: formatAuthMethod(user?.auth_method_preference),
    });
  }, [user?.auth_method_preference, user?.email, user?.full_name, user?.role, user?.status]);

  const stats = useMemo(() => {
    const totalJobs = jobs.length;
    const totalApplicants = applications.length;
    const totalCompanies = company?.company_name ? 1 : 0;
    return [
      { label: "Số bài tuyển dụng", value: totalJobs },
      { label: "Số ứng viên đã nhận", value: totalApplicants },
      { label: "Số công ty quản lý", value: totalCompanies },
    ];
  }, [applications.length, company?.company_name, jobs.length]);

  const createdAtLabel = formatDateTime(user?.created_at || user?.createdAt);

  const resetDraft = () => {
    setProfileDraft({
      full_name: user?.full_name || "",
      email: user?.email || "",
      role: user?.role || "recruiter",
      status: user?.status || "active",
      auth_method_preference: formatAuthMethod(user?.auth_method_preference),
    });
    setEditingProfile(false);
  };

  return (
    <section className="dashboard-page recruiter-profile-page">
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow">Recruiter workspace</span>
          <h1>Hồ sơ tài khoản</h1>
          <p>Quản lý thông tin tài khoản, bảo mật và liên kết công ty tuyển dụng.</p>
        </div>
      </div>

      <article className="dashboard-card recruiter-profile-header">
        <div className="recruiter-profile-header-main">
          <div className="recruiter-profile-avatar">
            {user?.avatar_url ? <img src={user.avatar_url} alt={user?.full_name || "Recruiter"} /> : <span>{getInitials(user?.full_name || user?.email)}</span>}
          </div>
          <div className="recruiter-profile-title">
            <div className="recruiter-profile-title-row">
              <div>
                <h2>{user?.full_name || "Recruiter"}</h2>
                <p>{user?.email || ""}</p>
              </div>
              <div className="recruiter-profile-badges">
                <span className="status-badge status-badge--open">Nhà tuyển dụng</span>
                <span className="status-badge status-badge--new">{String(user?.status || "active").toLowerCase() === "active" ? "Active" : user?.status || "Active"}</span>
              </div>
            </div>
            {loading ? <div className="dashboard-muted">Đang đồng bộ dữ liệu...</div> : null}
          </div>
        </div>

        <div className="recruiter-profile-header-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => setEditingProfile((current) => !current)}>
            {editingProfile ? "Xem hồ sơ" : "Chỉnh sửa hồ sơ"}
          </button>
          <button className="btn btn-small" type="button" onClick={() => window.alert("Chức năng đổi mật khẩu cần endpoint riêng.")}>
            Đổi mật khẩu
          </button>
        </div>
      </article>

      {error ? <div className="auth-alert auth-alert--error">{error}</div> : null}

      <div className="recruiter-profile-layout">
        <div className="recruiter-profile-left">
          <section className="dashboard-card">
            <div className="dashboard-card-head">
              <h2>Thông tin tài khoản</h2>
              <span className="dashboard-muted">{editingProfile ? "Chế độ chỉnh sửa" : "Chế độ xem"}</span>
            </div>

            <div className="recruiter-account-form">
              <div className="recruiter-profile-grid">
                <FormField label="Họ tên">
                  <input
                    value={profileDraft.full_name}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, full_name: event.target.value }))}
                    disabled={!editingProfile}
                  />
                </FormField>
                <FormField label="Email">
                  <input
                    value={profileDraft.email}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, email: event.target.value }))}
                    disabled={!editingProfile}
                  />
                </FormField>
                <FormField label="Vai trò">
                  <input value={profileDraft.role} disabled />
                </FormField>
                <FormField label="Trạng thái">
                  <input value={profileDraft.status} disabled />
                </FormField>
                <FormField label="Phương thức đăng nhập">
                  <input value={profileDraft.auth_method_preference} disabled />
                </FormField>
                {createdAtLabel ? (
                  <FormField label="Tạo lúc">
                    <input value={createdAtLabel} disabled />
                  </FormField>
                ) : null}
              </div>

              <div className="recruiter-account-actions">
                {editingProfile ? (
                  <>
                    <button className="btn btn-ghost btn-small" type="button" onClick={resetDraft}>
                      Hủy chỉnh sửa
                    </button>
                    <button className="btn btn-small" type="button" onClick={() => window.alert("Chưa có endpoint cập nhật hồ sơ recruiter.")}>
                      Lưu thay đổi
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </section>

          <section className="dashboard-card">
            <div className="dashboard-card-head">
              <h2>Công ty liên kết</h2>
              <Link className="dashboard-card-link" to={ROUTES.recruiter.company}>
                Cập nhật hồ sơ doanh nghiệp
              </Link>
            </div>

            {loading ? (
              <div className="dashboard-empty">Đang tải thông tin công ty...</div>
            ) : company?.company_name ? (
              <div className="recruiter-company-card">
                <div className="recruiter-company-head">
                  <div className="company-summary-logo">
                    {company?.logo_url ? <img src={company.logo_url} alt={company.company_name || "Company logo"} /> : <span>{getInitials(company?.company_name)}</span>}
                  </div>
                  <div>
                    <strong>{company.company_name}</strong>
                    <p className="dashboard-muted">{company.industry || "Chưa cập nhật ngành nghề"}</p>
                  </div>
                </div>

                <div className="recruiter-company-form recruiter-profile-grid">
                  <FormField label="Tên công ty">
                    <input value={company.company_name || "Chưa cập nhật"} disabled />
                  </FormField>
                  <FormField label="Ngành nghề">
                    <input value={company.industry || "Chưa cập nhật"} disabled />
                  </FormField>
                  <FormField label="Địa chỉ">
                    <input value={company.address || "Chưa cập nhật"} disabled />
                  </FormField>
                  <FormField label="Trạng thái hồ sơ">
                    <input value={company.status || "Đang cập nhật"} disabled />
                  </FormField>
                </div>
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <strong>Bạn chưa liên kết công ty</strong>
                <p>Hoàn thiện hồ sơ doanh nghiệp để tăng độ tin cậy và thu hút ứng viên.</p>
                <Link className="btn btn-small" to={ROUTES.recruiter.company}>
                  Tạo / Cập nhật công ty
                </Link>
              </div>
            )}
          </section>

          <section className="dashboard-card">
            <div className="dashboard-card-head">
              <h2>Bảo mật tài khoản</h2>
            </div>

            <div className="recruiter-profile-grid">
              <FormField label="Phương thức đăng nhập">
                <input value={formatAuthMethod(user?.auth_method_preference)} disabled />
              </FormField>
              <FormField label="Mật khẩu">
                <input value="••••••••" disabled />
              </FormField>
            </div>

            <div className="recruiter-security-actions">
              <button className="btn btn-small" type="button" onClick={() => window.alert("Chức năng đổi mật khẩu cần endpoint riêng.")}> 
                Đổi mật khẩu
              </button>
            </div>
          </section>
        </div>

        <aside className="recruiter-profile-right">
          <section className="dashboard-card dashboard-card--compact">
            <div className="dashboard-card-head">
              <h2>Điều hướng nhanh</h2>
            </div>

            <div className="recruiter-action-list">
              <ActionItem
                to={ROUTES.recruiter.dashboard}
                title="Về dashboard"
                description="Quay lại tổng quan tuyển dụng"
                icon={<IconDashboard />}
              />
              <ActionItem
                to={ROUTES.recruiter.jobs}
                title="Quản lý bài tuyển dụng"
                description="Tạo, cập nhật, theo dõi tin tuyển"
                icon={<IconBriefcase />}
              />
              <ActionItem
                to={ROUTES.recruiter.company}
                title="Quản lý công ty"
                description="Cập nhật hồ sơ doanh nghiệp"
                icon={<IconBuilding />}
              />
              <ActionItem
                to={ROUTES.recruiter.applications}
                title="Xem ứng viên"
                description="Theo dõi hồ sơ ứng tuyển"
                icon={<IconUsers />}
              />
            </div>
          </section>

          {!loading ? (
            <section className="dashboard-card dashboard-card--compact">
              <div className="dashboard-card-head">
                <h2>Thống kê nhanh</h2>
              </div>

              <div className="recruiter-quick-stats">
                {stats.map((item) => (
                  <div key={item.label} className="recruiter-quick-stat">
                    <span>{item.label}</span>
                    <strong>{item.value ?? 0}</strong>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function getInitials(name) {
  const raw = (name || "RJ").trim();
  return raw
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function formatAuthMethod(method) {
  if (method === "otp") return "OTP";
  if (method === "password") return "Mật khẩu";
  return "Mật khẩu";
}

function FormField({ label, children }) {
  return (
    <label className="recruiter-form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ActionItem({ to, title, description, icon }) {
  return (
    <Link className="recruiter-action-item" to={to}>
      <span className="recruiter-action-icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </Link>
  );
}

function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12a9 9 0 1 1 18 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 12l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 21v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 8.5C3 7.12 4.12 6 5.5 6h13C19.88 6 21 7.12 21 8.5V18a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8.5Z" stroke="currentColor" strokeWidth="2" />
      <path d="M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" stroke="currentColor" strokeWidth="2" />
      <path d="M9 7h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 11h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 15h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 21v-8a2 2 0 0 0-2-2h-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" stroke="currentColor" strokeWidth="2" />
      <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
