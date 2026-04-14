import { Link } from "react-router-dom";
import { ROUTES } from "../../routes";

export default function EmployerCard({ company, followed, onToggleFollow, onViewCompany }) {
  const logo = company.logo_url || company.logo || null;
  const name = company.company_name || company.name || "Nhà tuyển dụng";
  const rating = Number(company.rating || 4.5).toFixed(1);
  const matchScore = company.match_score || 80;
  const tags = Array.isArray(company.tags) ? company.tags.slice(0, 4) : [];
  const highlights = Array.isArray(company.hiring_focus) ? company.hiring_focus.slice(0, 2) : [];
  const viewCompanyProps = company.website
    ? { as: "a", href: company.website, target: "_blank", rel: "noreferrer" }
    : { as: Link, to: ROUTES.jobs };

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
        <span className="rw-badge rw-badge-green">{matchScore}% fit</span>
      </div>

      <div className="rw-meta-grid">
        <Info label="Địa điểm" value={company.location || company.address || "Chưa cập nhật"} />
        <Info label="Quy mô" value={company.size || "50-100 nhân sự"} />
        <Info label="Đánh giá" value={`★ ${rating}/5`} />
        <Info label="Đang tuyển" value={`${company.openings ?? 0} vị trí`} />
      </div>

      {company.summary ? <p style={{ fontSize: "0.875rem", lineHeight: "1.5rem", color: "#475569" }}>{company.summary}</p> : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {tags.map((tag) => (
          <span key={tag} className="rw-employer-tag">{tag}</span>
        ))}
        {highlights.map((tag) => (
          <span key={tag} className="rw-employer-tag-blue">{tag}</span>
        ))}
      </div>

      <div className="rw-employer-card-foot">
        <span className="rw-badge rw-badge-blue">{company.openings ?? 0} việc mở</span>
        <div className="rw-employer-card-actions">
          <Link className="btn" style={{ borderRadius: "0.75rem", padding: "0.5rem 1rem", fontSize: "0.875rem" }} to={ROUTES.jobs} onClick={() => onViewCompany(company)}>
            Xem việc làm
          </Link>
          <EmployerLink viewCompanyProps={viewCompanyProps} onClick={() => onViewCompany(company)} />
          <button
            type="button"
            onClick={() => onToggleFollow(company.id)}
            className={followed ? "rw-btn-follow rw-btn-follow--active" : "rw-btn-follow"}
          >
            {followed ? "Đang theo dõi" : "Theo dõi"}
          </button>
        </div>
      </div>
    </article>
  );
}

function EmployerLink({ viewCompanyProps, onClick }) {
  if (viewCompanyProps.as === "a") {
    return (
      <a
        className="rw-employer-link"
        href={viewCompanyProps.href}
        target={viewCompanyProps.target}
        rel={viewCompanyProps.rel}
        onClick={onClick}
      >
        Xem công ty
      </a>
    );
  }
  return (
    <Link className="rw-employer-link" to={viewCompanyProps.to} onClick={onClick}>
      Xem công ty
    </Link>
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
  return String(name || "JT")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}