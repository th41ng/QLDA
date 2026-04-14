import { Link } from "react-router-dom";

export default function LandingQuickActionCard({ title, description, cta, icon, href }) {
  return (
    <article className="landing-action-card panel-tile">
      <div className="landing-action-icon">{icon}</div>
      <div className="landing-action-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <Link className="text-link text-link--cta" to={href}>
        {cta}
      </Link>
    </article>
  );
}
