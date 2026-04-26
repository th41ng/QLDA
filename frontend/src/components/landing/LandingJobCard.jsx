import { Link } from "react-router-dom";
import { ROUTES } from "../../routes";

function formatSalary(job) {
  if (job.salary_min && job.salary_max) {
    return `${job.salary_min.toLocaleString("vi-VN")} - ${job.salary_max.toLocaleString("vi-VN")} ${job.salary_currency || "VND"}`;
  }
  return "Thoả thuận";
}

export default function LandingJobCard({ job }) {
  const isNew = isNewJob(job?.created_at);

  return (
    <article className="landing-job-card">
      <div className="landing-job-head">
        <div>
          <div className="landing-job-company">
            <span className="landing-job-company-logo" aria-hidden="true">
              {job.company?.logo_url ? <img src={job.company.logo_url} alt="" /> : <span>{getCompanyInitial(job.company?.company_name)}</span>}
            </span>
            <span className="company-pill">{job.company?.company_name || "Nhà tuyển dụng"}</span>
          </div>
          <h3>{job.title}</h3>
          <p className="landing-job-meta">
            {job.location} · {job.employment_type} · {job.experience_level}
          </p>
        </div>
        {isNew ? <span className="tag tag--soft">Mới</span> : null}
      </div>

      <p className="landing-job-summary">{job.summary}</p>

      <div className="landing-job-tags">
        {(job.tags || []).slice(0, 4).map((tag) => (
          <span key={tag.id} className="tag tag--soft">
            {tag.name}
          </span>
        ))}
      </div>

      <div className="landing-job-footer">
        <div className="salary-box salary-box--soft">
          <span className="salary-label">Mức lương</span>
          <strong>{formatSalary(job)}</strong>
        </div>
        <div className="landing-job-actions">
          <Link className="btn btn-ghost btn-small" to={ROUTES.jobDetail(job.id)}>
            Xem chi tiết
          </Link>
          <Link className="btn btn-small" to={ROUTES.jobDetail(job.id)}>
            Ứng tuyển ngay
          </Link>
        </div>
      </div>
    </article>
  );
}

function getCompanyInitial(name) {
  const value = String(name || "NTD").trim();
  return value.charAt(0).toUpperCase();
}

function isNewJob(createdAt) {
  if (!createdAt) return false;
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return false;
  const ageMs = Date.now() - createdTime;
  return ageMs >= 0 && ageMs < 3 * 24 * 60 * 60 * 1000;
}
