export default function LandingStepCard({ index, title, description }) {
  return (
    <article className="landing-step-card panel-tile">
      <div className="landing-step-index">{String(index).padStart(2, "0")}</div>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </article>
  );
}
