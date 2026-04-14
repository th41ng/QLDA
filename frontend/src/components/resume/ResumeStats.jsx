export default function ResumeStats({ resumes }) {
  const manualCount = resumes.filter((resume) => resume.source_type === "manual").length;
  const uploadCount = resumes.filter((resume) => resume.source_type === "upload").length;
  const primaryCount = resumes.filter((resume) => resume.is_primary).length;

  const cards = [
    { label: "CV đã tạo", value: manualCount, cls: "rw-stat-blue" },
    { label: "CV đã upload", value: uploadCount, cls: "rw-stat-green" },
    { label: "CV đang dùng ứng tuyển", value: primaryCount, cls: "rw-stat-violet" },
  ];

  return (
    <section className="rw-stats-grid">
      {cards.map((card) => (
        <article key={card.label} className={card.cls}>
          <span style={{ fontSize: "0.875rem", fontWeight: 500, opacity: 0.8 }}>{card.label}</span>
          <strong style={{ marginTop: "0.75rem", display: "block", fontSize: "1.875rem", fontWeight: 600, letterSpacing: "-0.025em" }}>
            {String(card.value).padStart(2, "0")}
          </strong>
        </article>
      ))}
    </section>
  );
}
