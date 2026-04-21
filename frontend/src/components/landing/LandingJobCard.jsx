import { Link } from "react-router-dom";
import { ROUTES } from "../../routes";

function formatSalary(job) {
  if (job.salary_min && job.salary_max) {
    return `${job.salary_min.toLocaleString("vi-VN")} - ${job.salary_max.toLocaleString("vi-VN")} ${job.salary_currency || "VND"}`;
  }
  return "Thoả thuận";
}

export default function LandingJobCard({ job }) {
  return (
    <article className="landing-job-card">
      <div className="landing-job-head">
        <div>
          <span className="company-pill">{job.company?.company_name || "Nhà tuyển dụng"}</span>
          <h3>{job.title}</h3>
          <p className="landing-job-meta">
            {job.location} · {job.employment_type} · {job.experience_level}
          </p>
        </div>
        {job.is_featured ? (
          <span className="match-pill match-pill--featured">Nổi bật</span>
        ) : (
          <span className="tag tag--soft">Mới</span>
        )}
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
