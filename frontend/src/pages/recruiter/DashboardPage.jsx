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
};

export default function RecruiterDashboardPage() {
  const { user } = useAuth();
  const [company, setCompany] = useState(EMPTY_COMPANY);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
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

  const stats = useMemo(() => {
    const totalJobs = jobs.length;
    const openJobs = jobs.filter((job) => job.status === "published" || job.status === "open").length;
    const totalApplications = applications.length;
    const newApplications = applications.filter((app) => {
      if (!app.applied_at) return app.status === "submitted";
      const applied = new Date(app.applied_at);
      const limit = new Date();
      limit.setDate(limit.getDate() - 7);
      return applied >= limit;
    }).length;

    return [
      { label: "Tổng tin tuyển dụng", value: totalJobs, hint: "Toàn bộ bài đã tạo", tone: "blue" },
      { label: "Tin đang mở", value: openJobs, hint: "Đang nhận hồ sơ", tone: "green" },
      { label: "Tổng ứng viên", value: totalApplications, hint: "Hồ sơ ứng tuyển", tone: "indigo" },
      { label: "Ứng viên mới", value: newApplications, hint: "7 ngày gần nhất", tone: "amber" },
    ];
  }, [jobs, applications]);

  const recentJobs = useMemo(() => jobs.slice(0, 5), [jobs]);
  const recentApplicants = useMemo(() => applications.slice(0, 5), [applications]);
  const activities = useMemo(() => buildActivities(jobs, applications), [jobs, applications]);

  const openJobIds = new Set(jobs.filter((job) => job.status === "published" || job.status === "open").map((job) => job.id));

  const updateJobStatus = async (jobId, nextStatus) => {
    await api.jobs.update(jobId, { status: nextStatus });
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: nextStatus,
            }
          : job,
      ),
    );
  };

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow">Recruiter workspace</span>
          <h1>Dashboard nhà tuyển dụng</h1>
          <p>Theo dõi tin tuyển dụng, ứng viên và thông tin công ty của bạn tại một nơi.</p>
        </div>
        <div className="dashboard-hero-meta">
          <span className="dashboard-muted">Cập nhật gần nhất</span>
          <strong>{loading ? "Đang tải..." : "Hôm nay"}</strong>
        </div>
      </div>

      <div className="dashboard-stats">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <div className="dashboard-quick-actions">
        <DashboardActionCard
          title="Đăng tin tuyển dụng mới"
          description="Tạo bài tuyển mới và tiếp cận ứng viên phù hợp."
          to={ROUTES.recruiter.jobs}
          cta="Đăng tin ngay"
        />
        <DashboardActionCard
          title="Xem hồ sơ ứng viên"
          description="Theo dõi các hồ sơ đã ứng tuyển vào tin của bạn."
          to={ROUTES.recruiter.applications}
          cta="Mở hồ sơ"
        />
        <DashboardActionCard
          title="Chỉnh sửa hồ sơ công ty"
          description="Cập nhật thông tin doanh nghiệp và thương hiệu tuyển dụng."
          to={ROUTES.recruiter.company}
          cta="Chỉnh sửa"
        />
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-main">
          <CardSection
            title="Tin tuyển dụng gần đây"
            actionLabel="Xem tất cả"
            actionTo={ROUTES.recruiter.jobs}
            emptyTitle="Bạn chưa có tin tuyển dụng nào"
            emptyBody="Tạo tin đầu tiên để bắt đầu nhận hồ sơ ứng tuyển."
            emptyActionLabel="Đăng tin đầu tiên"
            emptyActionTo={ROUTES.recruiter.jobs}
            empty={recentJobs.length === 0}
          >
            <div className="dashboard-job-list">
              {recentJobs.map((job) => (
                <JobRowCard
                  key={job.id}
                  job={job}
                  applicantCount={applications.filter((app) => app.job_id === job.id).length}
                  onStatusChange={updateJobStatus}
                  isOpen={openJobIds.has(job.id)}
                />
              ))}
            </div>
          </CardSection>

          <CardSection
            title="Ứng viên gần đây"
            actionLabel="Xem tất cả"
            actionTo={ROUTES.recruiter.applications}
            emptyTitle="Chưa có ứng viên nào mới"
            emptyBody="Khi ứng viên nộp hồ sơ, danh sách sẽ xuất hiện tại đây."
            emptyActionLabel="Xem hồ sơ"
            emptyActionTo={ROUTES.recruiter.applications}
            empty={recentApplicants.length === 0}
          >
            <div className="dashboard-applicant-list">
              {recentApplicants.map((application) => (
                <ApplicantRowCard key={application.id} application={application} />
              ))}
            </div>
          </CardSection>
        </div>

        <aside className="dashboard-side">
          <CardSection title="Thông tin công ty" compact actionLabel="Chỉnh sửa thông tin" actionTo={ROUTES.recruiter.company}>
            <CompanySummary company={company} />
          </CardSection>

          <CardSection title="Hoạt động gần đây" compact>
            {activities.length ? (
              <ul className="dashboard-activity-list">
                {activities.map((item) => (
                  <li key={item.id}>
                    <span className="dashboard-activity-dot" />
                    <div>
                      <strong>{item.text}</strong>
                      <span>{item.timeLabel}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="dashboard-empty-inline">
                Hoàn thiện hồ sơ công ty và đăng thêm tin tuyển dụng để thấy các hoạt động gần đây ở đây.
              </div>
            )}
          </CardSection>
        </aside>
      </div>
    </section>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <article className="dashboard-stat-card">
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
      <p>{hint}</p>
    </article>
  );
}

function DashboardActionCard({ title, description, to, cta }) {
  return (
    <Link className="dashboard-action-card" to={to}>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <span>{cta}</span>
    </Link>
  );
}

function CardSection({ title, actionLabel, actionTo, children, empty, emptyTitle, emptyBody, emptyActionLabel, emptyActionTo, compact = false }) {
  return (
    <section className={compact ? "dashboard-card dashboard-card--compact" : "dashboard-card"}>
      <div className="dashboard-card-head">
        <h2>{title}</h2>
        {actionLabel && actionTo ? (
          <Link to={actionTo} className="dashboard-card-link">
            {actionLabel}
          </Link>
        ) : null}
      </div>
      {empty ? (
        <div className="dashboard-empty-state">
          <strong>{emptyTitle}</strong>
          <p>{emptyBody}</p>
          {emptyActionLabel && emptyActionTo ? (
            <Link className="btn btn-small" to={emptyActionTo}>
              {emptyActionLabel}
            </Link>
          ) : null}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function JobRowCard({ job, applicantCount, onStatusChange, isOpen }) {
  const status = normalizeJobStatus(job.status);
  return (
    <article className="dashboard-row-card">
      <div className="dashboard-row-main">
        <div className="dashboard-row-top">
          <div>
            <h3>{job.title}</h3>
            <p>{job.location || "Chưa cập nhật địa điểm"}</p>
          </div>
          <StatusBadge status={status} />
        </div>
        <div className="dashboard-row-meta">
          <span>{applicantCount} ứng viên</span>
          <span>{formatDate(job.created_at)}</span>
          <span>{job.workplace_type || "onsite"}</span>
        </div>
      </div>
      <div className="dashboard-row-actions">
        <Link className="icon-btn" to={`/jobs/${job.id}`} title="Xem">
          Xem
        </Link>
        <Link className="icon-btn" to={ROUTES.recruiter.jobs} title="Sửa">
          Sửa
        </Link>
        <button
          className="icon-btn"
          type="button"
          onClick={() => onStatusChange(job.id, isOpen ? "hidden" : "published")}
          title={isOpen ? "Ẩn" : "Mở"}
        >
          {isOpen ? "Ẩn" : "Mở"}
        </button>
      </div>
    </article>
  );
}

function ApplicantRowCard({ application }) {
  const status = normalizeApplicantStatus(application.status);
  return (
    <article className="dashboard-row-card dashboard-row-card--applicant">
      <div className="dashboard-row-main">
        <div className="dashboard-row-top">
          <div>
            <h3>{application.candidate?.full_name || "Ứng viên"}</h3>
            <p>{application.job?.title || "Chưa có vị trí"}</p>
          </div>
          <StatusBadge status={status} />
        </div>
        <div className="dashboard-row-meta">
          <span>{formatDate(application.applied_at)}</span>
          <span>{application.resume?.title || "CV online"}</span>
        </div>
      </div>
      <div className="dashboard-row-actions">
        <Link className="icon-btn" to={ROUTES.recruiter.applications} title="Xem hồ sơ">
          Hồ sơ
        </Link>
      </div>
    </article>
  );
}

function CompanySummary({ company }) {
  const fields = [
    ["Tên công ty", company?.company_name],
    ["Website", company?.website],
    ["Mã số thuế", company?.tax_code],
    ["Địa chỉ", company?.address],
    ["Ngành", company?.industry],
  ];

  return (
    <div className="company-summary">
      <div className="company-summary-head">
        <div className="company-summary-logo">
          {company?.logo_url ? <img src={company.logo_url} alt={company.company_name || "Company logo"} /> : <span>{getInitials(company?.company_name)}</span>}
        </div>
        <div>
          <strong>{company?.company_name || "Chưa có thông tin công ty"}</strong>
          <p>{company?.description || "Hoàn thiện hồ sơ công ty để tăng độ tin cậy với ứng viên."}</p>
        </div>
      </div>

      <dl className="company-summary-list">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || "Chưa cập nhật"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function StatusBadge({ status }) {
  const label = {
    open: "Đang mở",
    hidden: "Tạm ẩn",
    closed: "Đã đóng",
    new: "Mới",
    reviewing: "Đang xem xét",
    contacted: "Đã liên hệ",
    rejected: "Từ chối",
  }[status] || status;

  return <span className={`status-badge status-badge--${status}`}>{label}</span>;
}

function normalizeJobStatus(status) {
  const normalized = (status || "").toLowerCase();
  if (["published", "open", "active"].includes(normalized)) return "open";
  if (["hidden", "draft", "paused"].includes(normalized)) return "hidden";
  if (["closed", "archived", "expired"].includes(normalized)) return "closed";
  return normalized || "hidden";
}

function normalizeApplicantStatus(status) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "submitted") return "new";
  return normalized || "new";
}

function formatDate(value) {
  if (!value) return "Hôm nay";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Hôm nay";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function getInitials(name) {
  const raw = (name || "JT").trim();
  return raw
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function buildActivities(jobs, applications) {
  const items = [];
  const latestJobs = [...jobs].slice(0, 2);
  const latestApps = [...applications].slice(0, 2);

  latestJobs.forEach((job) => {
    items.push({
      id: `job-${job.id}`,
      text: `Bạn đã cập nhật tin "${job.title}"`,
      timeLabel: formatDate(job.updated_at || job.created_at),
    });
  });

  latestApps.forEach((app) => {
    items.push({
      id: `app-${app.id}`,
      text: `${app.candidate?.full_name || "Một ứng viên"} vừa ứng tuyển vào "${app.job?.title || "tin tuyển dụng"}"`,
      timeLabel: formatDate(app.applied_at),
    });
  });

  return items.slice(0, 4);
}
