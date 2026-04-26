import { Link } from "react-router-dom";
import { ROUTES } from "../../routes";

export default function EmployerCard({ company, followed, onToggleFollow, onViewCompany }) {
  const logo = company.logo_url || company.logo || null;
  const name = company.company_name || company.name || "Nhà tuyển dụng";
  const openingCount = Number(company.openings || 0);
  const activeJobsCount = Number(company.active_jobs_count || 0);
  const locationText = Array.isArray(company.locations) && company.locations.length ? company.locations.slice(0, 2).join(", ") : company.location || company.address;
  const tags = Array.isArray(company.tags) ? company.tags.slice(0, 4) : [];
  const highlights = Array.isArray(company.hiring_focus) ? company.hiring_focus.slice(0, 2) : [];
  const jobSearchUrl = `${ROUTES.jobs}?q=${encodeURIComponent(name)}`;

  return (
    <article className="rw-employer-card landing-employer-card panel-tile">
      <div className="rw-employer-card-head">
        <div className="rw-employer-card-identity">
          <div className="rw-employer-logo">
            {logo ? <img src={logo} alt={name} /> : <span>{getInitials(name)}</span>}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
              <strong className="rw-truncate" style={{ display: "block", fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>{name}</strong>
              {company.badge ? <span className="rw-badge rw-badge-blue" style={{ fontSize: "11px" }}>{company.badge}</span> : null}
            </div>
            <p style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "#475569" }}>{company.industry || "Đang tuyển dụng"}</p>
          </div>
        </div>
        <span className="rw-badge rw-badge-green">{openingCount} vị trí</span>
      </div>

      <div className="rw-meta-grid">
        <Info label="Địa điểm" value={locationText || "Chưa cập nhật"} />
        <Info label="Tin tuyển" value={`${activeJobsCount} tin`} />
        <Info label="Ngành" value={company.industry || "Chưa cập nhật"} />
        <Info label="Số lượng" value={`${openingCount} vị trí`} />
      </div>

      <p style={{ fontSize: "0.875rem", lineHeight: "1.5rem", color: "#475569", margin: 0 }}>
        {company.summary || company.description || "Công ty đang cập nhật thông tin giới thiệu. Bạn có thể xem các vị trí đang tuyển hoặc mở thông tin công ty để kiểm tra thêm."}
      </p>

      {(tags.length || highlights.length) ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {tags.map((tag) => (
            <span key={tag} className="rw-employer-tag">{tag}</span>
          ))}
          {highlights.map((tag) => (
            <span key={tag} className="rw-employer-tag-blue">{tag}</span>
          ))}
        </div>
      ) : null}

      <div className="rw-employer-card-foot">
        <span className="rw-badge rw-badge-blue">{openingCount} việc đang tuyển</span>
        <div className="rw-employer-card-actions">
          <Link className="btn" style={{ borderRadius: "0.75rem", padding: "0.5rem 1rem", fontSize: "0.875rem" }} to={jobSearchUrl}>
            Xem việc làm
          </Link>
          <button type="button" className="rw-employer-link" onClick={() => onViewCompany(company)}>
            Xem công ty
          </button>
          <button
            type="button"
            onClick={() => onToggleFollow(company.id)}
            className={followed ? "rw-btn-follow rw-btn-follow--active" : "rw-btn-follow"}
          >
            {followed ? "Đã lưu" : "Lưu công ty"}
          </button>
        </div>
      </div>
    </article>
  );
}

function Info({ label, value }) {
  return (
    <div className="rw-meta-item">
      <span className="rw-muted-xs">{label}</span>
      <strong className="rw-meta-sm">{value}</strong>
    </div>
  );
}

function getInitials(name) {
  return String(name || "NTD")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}
