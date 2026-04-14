export default function EmployerSection({ eyebrow, title, description, action, children }) {
  return (
    <section className="landing-section panel rw-section-accent">
      <div className="rw-section-head">
        <div>
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h2 style={{ marginTop: "0.5rem", fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.025em", color: "#0f172a" }}>{title}</h2>
          {description ? <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", lineHeight: "1.5rem", color: "#475569" }}>{description}</p> : null}
        </div>
        {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}