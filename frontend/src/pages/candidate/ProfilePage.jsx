import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { ROUTES } from "../../routes";
import CandidateApplicationsPage from "./ApplicationsPage";

const PROFILE_TABS = [
  { value: "profile", label: "Hồ sơ" },
  { value: "applications", label: "Việc đã ứng tuyển" },
];

const EMPTY_PROFILE = {
  dob: "",
  gender: "",
  address: "",
  headline: "",
  summary: "",
  current_title: "",
  years_experience: 0,
  expected_salary: "",
  desired_location: "",
  education: "",
  experience: "",
};

const EMPTY_APPLICATIONS = [];
const EMPTY_RESUMES = [];

export default function CandidateProfilePage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [initialProfile, setInitialProfile] = useState(EMPTY_PROFILE);
  const [applications, setApplications] = useState(EMPTY_APPLICATIONS);
  const [resumes, setResumes] = useState(EMPTY_RESUMES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const [profileData, applicationsData, resumesData] = await Promise.all([
          api.resumes.getProfile().catch(() => null),
          api.applications.myApplications().catch(() => []),
          api.resumes.list().catch(() => []),
        ]);

        if (!mounted) return;
        const nextProfile = normalizeProfile(profileData);
        setProfile(nextProfile);
        setInitialProfile(nextProfile);
        setApplications(Array.isArray(applicationsData) ? applicationsData : []);
        setResumes(Array.isArray(resumesData) ? resumesData : []);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const primaryResume = useMemo(() => resumes.find((resume) => resume.is_primary) || resumes[0] || null, [resumes]);

  const stats = useMemo(
    () => [
      { label: "CV chính", value: primaryResume ? primaryResume.title : "Chưa có" },
      { label: "Hồ sơ ứng tuyển", value: String(applications.length) },
      { label: "Kinh nghiệm", value: profile.years_experience ? `${profile.years_experience} năm` : "0 năm" },
    ],
    [applications.length, primaryResume, profile.years_experience],
  );

  const completionItems = useMemo(
    () => [
      Boolean(profile.headline),
      Boolean(profile.summary),
      Boolean(profile.education),
      Boolean(profile.experience),
      Boolean(profile.desired_location),
    ],
    [profile.desired_location, profile.education, profile.experience, profile.headline, profile.summary],
  );

  const completionRate = Math.round((completionItems.filter(Boolean).length / completionItems.length) * 100);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...profile,
        years_experience: Number(profile.years_experience) || 0,
      };
      const data = await api.resumes.updateProfile(payload);
      const nextProfile = normalizeProfile(data);
      setProfile(nextProfile);
      setInitialProfile(nextProfile);
      setToast("Đã lưu hồ sơ thành công.");
    } catch (err) {
      setError(err.message || "Không thể lưu hồ sơ.");
    } finally {
      setSaving(false);
    }
  };

  const resetProfile = () => {
    setProfile(initialProfile);
    setError("");
  };

  return (
    <section className="candidate-profile-page">
      <div className="candidate-page-head">
        <div>
          <span className="eyebrow">JOBPORTAL</span>
          <h1>Hồ sơ ứng viên</h1>
          <p>Cập nhật thông tin hồ sơ, CV và trạng thái ứng tuyển trong cùng một dashboard.</p>
        </div>
      </div>

      <article className="dashboard-card candidate-profile-hero">
        <div className="candidate-profile-hero-main">
          <div className="candidate-profile-avatar">{getInitials(profile.headline || profile.current_title || "UV")}</div>
          <div className="candidate-profile-hero-copy">
            <div className="candidate-profile-hero-top">
              <div>
                <h2>{profile.current_title || profile.headline || "Ứng viên"}</h2>
                <p>{profile.desired_location || profile.address || "Chưa cập nhật địa chỉ / khu vực làm việc"}</p>
              </div>
              <div className="candidate-profile-badges">
                <span className="status-badge status-badge--open">Ứng viên</span>
                <span className="status-badge status-badge--new">Hoàn thiện {completionRate}%</span>
              </div>
            </div>
            <p className="candidate-profile-summary-text">{profile.summary || "Bổ sung mô tả bản thân để tăng khả năng được nhà tuyển dụng tìm thấy."}</p>
          </div>
        </div>

        <div className="candidate-page-meta candidate-page-meta--hero">
          {stats.map((item) => (
            <div key={item.label} className="candidate-meta-chip">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </article>

      <div className="candidate-profile-tabs" role="tablist" aria-label="Điều hướng hồ sơ ứng viên">
        {PROFILE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            className={activeTab === tab.value ? "candidate-tab candidate-tab--active" : "candidate-tab"}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <article className="candidate-profile-card">
        {activeTab === "profile" ? (
          <div className="candidate-dashboard-layout">
            <form className="candidate-form" onSubmit={submit} noValidate>
              {error ? <div className="auth-alert auth-alert--error">{error}</div> : null}
              <ProfileSection
                index="01"
                title="Thông tin cá nhân"
                description="Cập nhật dữ liệu cơ bản để hồ sơ của bạn rõ ràng và chuyên nghiệp hơn."
              >
                <div className="candidate-form-grid">
                  <ProfileField
                    label="Ngày sinh"
                    input={
                      <input
                        type="date"
                        value={profile.dob || ""}
                        onChange={(event) => setProfile((prev) => ({ ...prev, dob: event.target.value }))}
                      />
                    }
                  />
                  <ProfileField
                    label="Giới tính"
                    input={
                      <select
                        value={profile.gender || ""}
                        onChange={(event) => setProfile((prev) => ({ ...prev, gender: event.target.value }))}
                      >
                        <option value="">Chọn giới tính</option>
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                        <option value="other">Khác</option>
                      </select>
                    }
                  />
                  <ProfileField
                    label="Địa chỉ"
                    input={
                      <input
                        value={profile.address || ""}
                        onChange={(event) => setProfile((prev) => ({ ...prev, address: event.target.value }))}
                        placeholder="Ví dụ: TP. Hồ Chí Minh"
                      />
                    }
                  />
                  <ProfileField
                    label="Headline"
                    input={
                      <input
                        value={profile.headline || ""}
                        onChange={(event) => setProfile((prev) => ({ ...prev, headline: event.target.value }))}
                        placeholder="Ví dụ: Frontend Developer / React"
                      />
                    }
                  />
                </div>
              </ProfileSection>

              <ProfileSection
                index="02"
                title="Thông tin nghề nghiệp"
                description="Giúp nhà tuyển dụng nắm rõ định hướng công việc và mức độ kinh nghiệm của bạn."
              >
                <div className="candidate-form-grid">
                  <ProfileField
                    label="Current title"
                    input={
                      <input
                        value={profile.current_title || ""}
                        onChange={(event) => setProfile((prev) => ({ ...prev, current_title: event.target.value }))}
                        placeholder="Ví dụ: Junior Web Developer"
                      />
                    }
                  />
                  <ProfileField
                    label="Years exp"
                    input={
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={profile.years_experience ?? 0}
                        onChange={(event) =>
                          setProfile((prev) => ({
                            ...prev,
                            years_experience: event.target.value === "" ? "" : Number(event.target.value),
                          }))
                        }
                        placeholder="0"
                      />
                    }
                  />
                  <ProfileField
                    label="Expected salary"
                    input={
                      <input
                        value={profile.expected_salary || ""}
                        onChange={(event) => setProfile((prev) => ({ ...prev, expected_salary: event.target.value }))}
                        placeholder="Ví dụ: 12 - 18 triệu"
                      />
                    }
                  />
                  <ProfileField
                    label="Desired location"
                    input={
                      <input
                        value={profile.desired_location || ""}
                        onChange={(event) => setProfile((prev) => ({ ...prev, desired_location: event.target.value }))}
                        placeholder="Ví dụ: TP. Hồ Chí Minh"
                      />
                    }
                  />
                </div>
              </ProfileSection>

              <ProfileSection
                index="03"
                title="Hồ sơ chuyên môn"
                description="Mô tả ngắn gọn năng lực, học vấn và kinh nghiệm của bạn."
              >
                <div className="candidate-form-stack">
                  <ProfileField
                    label="Summary"
                    fullWidth
                    input={
                      <textarea
                        rows="5"
                        value={profile.summary || ""}
                        onChange={(event) => setProfile((prev) => ({ ...prev, summary: event.target.value }))}
                        placeholder="Tóm tắt điểm mạnh, kỹ năng nổi bật và mục tiêu nghề nghiệp của bạn."
                      />
                    }
                  />
                  <ProfileField
                    label="Education"
                    fullWidth
                    input={
                      <textarea
                        rows="4"
                        value={profile.education || ""}
                        onChange={(event) => setProfile((prev) => ({ ...prev, education: event.target.value }))}
                        placeholder="Ví dụ: Đại học ... / Chuyên ngành / Bằng cấp / Chứng chỉ..."
                      />
                    }
                  />
                  <ProfileField
                    label="Experience"
                    fullWidth
                    input={
                      <textarea
                        rows="4"
                        value={profile.experience || ""}
                        onChange={(event) => setProfile((prev) => ({ ...prev, experience: event.target.value }))}
                        placeholder="Mô tả kinh nghiệm làm việc, dự án, thành tựu nổi bật..."
                      />
                    }
                  />
                </div>
              </ProfileSection>

              <div className="candidate-form-actions">
                <button className="btn btn-ghost btn-small candidate-secondary-btn" type="button" onClick={resetProfile} disabled={saving || loading}>
                  Đặt lại
                </button>
                <button className="btn candidate-primary-btn" type="submit" disabled={saving || loading}>
                  {saving ? "Đang lưu..." : "Lưu hồ sơ"}
                </button>
              </div>
            </form>

            <aside className="candidate-profile-side">
              <section className="dashboard-card dashboard-card--compact">
                <div className="dashboard-card-head">
                  <h2>CV chính</h2>
                  <Link className="dashboard-card-link" to={ROUTES.candidate.resumes}>
                    Quản lý CV
                  </Link>
                </div>

                {loading ? (
                  <div className="dashboard-empty">Đang tải CV...</div>
                ) : primaryResume ? (
                  <div className="candidate-side-summary">
                    <strong>{primaryResume.title || "CV online"}</strong>
                    <p>{primaryResume.template_name || primaryResume.source_type || "manual"}</p>
                    <div className="candidate-side-meta">
                      <span>{primaryResume.is_primary ? "CV mặc định" : "CV đã lưu"}</span>
                      <span>{primaryResume.updated_at ? formatDate(primaryResume.updated_at) : "Mới cập nhật"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="dashboard-empty-state">
                    <strong>Bạn chưa có CV nào</strong>
                    <p>Tạo CV để tăng khả năng ứng tuyển và hiển thị chuyên nghiệp hơn với nhà tuyển dụng.</p>
                    <Link className="btn btn-small" to={ROUTES.candidate.resumes}>
                      Tạo CV ngay
                    </Link>
                  </div>
                )}
              </section>

              <section className="dashboard-card dashboard-card--compact">
                <div className="dashboard-card-head">
                  <h2>Điều hướng nhanh</h2>
                </div>

                <div className="recruiter-action-list">
                  <Link className="recruiter-action-item" to={ROUTES.candidate.resumes}>
                    <span className="recruiter-action-icon">CV</span>
                    <div>
                      <strong>CV của tôi</strong>
                      <p>Tạo mới, chỉnh sửa và tải CV đã lưu</p>
                    </div>
                  </Link>
                  <Link className="recruiter-action-item" to={ROUTES.candidate.applications}>
                    <span className="recruiter-action-icon">HS</span>
                    <div>
                      <strong>Việc đã ứng tuyển</strong>
                      <p>Theo dõi trạng thái hồ sơ đã nộp</p>
                    </div>
                  </Link>
                  <Link className="recruiter-action-item" to={ROUTES.jobs}>
                    <span className="recruiter-action-icon">VL</span>
                    <div>
                      <strong>Tìm việc làm</strong>
                      <p>Khám phá các cơ hội phù hợp hơn</p>
                    </div>
                  </Link>
                </div>
              </section>

              <section className="dashboard-card dashboard-card--compact">
                <div className="dashboard-card-head">
                  <h2>Bảo mật tài khoản</h2>
                </div>

                <div className="recruiter-profile-grid candidate-security-grid">
                  <InfoChip label="Phương thức đăng nhập" value="Mật khẩu" />
                  <InfoChip label="Mật khẩu" value="••••••••" />
                </div>

                <div className="recruiter-security-actions">
                  <button className="btn btn-small" type="button" onClick={() => window.alert("Chức năng đổi mật khẩu cần endpoint riêng.")}>
                    Đổi mật khẩu
                  </button>
                </div>
              </section>
            </aside>
          </div>
        ) : (
          <CandidateApplicationsPage />
        )}
      </article>

      {toast ? <div className="candidate-toast" role="status">{toast}</div> : null}
    </section>
  );
}

function ProfileSection({ index, title, description, children }) {
  return (
    <section className="candidate-section">
      <div className="candidate-section-head">
        <div className="candidate-section-title">
          <span>{index}</span>
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

function ProfileField({ label, input, fullWidth = false }) {
  return (
    <label className={fullWidth ? "candidate-field candidate-field--full" : "candidate-field"}>
      <span>{label}</span>
      {input}
    </label>
  );
}

function InfoChip({ label, value }) {
  return (
    <div className="recruiter-info-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = (status || "").toLowerCase();
  const labelMap = {
    submitted: "Đã gửi",
    reviewing: "Đang xem xét",
    interview: "Phỏng vấn",
    accepted: "Đã chấp nhận",
    rejected: "Từ chối",
    withdrawn: "Đã rút",
  };
  const toneMap = {
    submitted: "new",
    reviewing: "reviewing",
    interview: "contacted",
    accepted: "open",
    rejected: "closed",
    withdrawn: "hidden",
  };

  return (
    <span className={`status-badge status-badge--${toneMap[normalized] || "hidden"}`}>
      {labelMap[normalized] || "Đã gửi"}
    </span>
  );
}

function normalizeProfile(profile) {
  return {
    ...EMPTY_PROFILE,
    ...(profile || {}),
    years_experience: profile?.years_experience ?? 0,
  };
}

function formatDate(value) {
  if (!value) return "Hôm nay";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Hôm nay";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function getInitials(value) {
  const raw = (value || "UV").trim();
  return raw
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}
