import { Link } from "react-router-dom";
import { ROUTES } from "../../routes";

export default function LandingEmployerCard({ employer }) {
  const name = employer.name || employer.company_name || "Nhà tuyển dụng";
  const logo = employer.logo || employer.logo_url || null;
  const openings = employer.openings ?? 0;
  const industry = employer.industry || employer.category_name || "Đang tuyển dụng";
  const location = employer.location || employer.address || "Chưa cập nhật";

  return (
    <article className="landing-employer-card panel-tile">
      <div className="landing-employer-top">
        {employer.badge ? <span className="employer-top-badge">{employer.badge}</span> : <span />}
      </div>
      <div className="employer-logo landing-employer-logo">
        {logo ? <img src={logo} alt={name} /> : name.slice(0, 2).toUpperCase()}
      </div>
      <div className="landing-employer-body">
        <strong>{name}</strong>
        <p>{industry}</p>
        <span>{location}</span>
      </div>
      <div className="landing-employer-foot">
        <div className="employer-count">{openings} vị trí</div>
        <Link className="text-link" to={ROUTES.jobs}>
          Xem công ty
        </Link>
      </div>
    </article>
  );
}
