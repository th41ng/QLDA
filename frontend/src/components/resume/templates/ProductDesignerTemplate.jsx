const styles = `
  .cv-template--product-designer {
    max-width: 794px;
    min-height: 1123px;
    margin: 0 auto;
    border: 1px solid #dbeafe;
    background: #ffffff;
    color: #0f172a;
    font-family: "Segoe UI", Tahoma, sans-serif;
  }
  .pd-head {
    padding: 18px 20px;
    background: linear-gradient(135deg, #0f172a, #1e293b);
    color: #f8fafc;
  }
  .pd-head h1 { margin: 0; font-size: 28px; }
  .pd-role { margin: 6px 0 0; color: #cbd5e1; }
  .pd-meta { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; }
  .pd-meta span { border: 1px solid rgba(148,163,184,0.5); border-radius: 999px; padding: 3px 10px; font-size: 11px; }
  .pd-grid { display: grid; grid-template-columns: 1.25fr 0.75fr; }
  .pd-main { padding: 16px 20px; display: grid; gap: 14px; }
  .pd-side { padding: 16px; background: #f8fafc; border-left: 1px solid #e2e8f0; display: grid; gap: 14px; }
  .pd-sec h2 { margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: #334155; }
  .pd-project { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; background: #fff; }
  .pd-project strong { display: block; margin-bottom: 4px; }
  .pd-list { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
  .pd-skills { display: flex; flex-wrap: wrap; gap: 6px; }
  .pd-skills span { border-radius: 999px; background: #e2e8f0; color: #1e293b; font-size: 11px; padding: 4px 8px; }
`;

function text(value, fallback = "Chưa cập nhật") {
  const raw = String(value ?? "").trim();
  return raw || fallback;
}

function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return String(value ?? "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ProductDesignerTemplate({ data = {} }) {
  const skills = list(data.skills);
  const experienceRows = String(data.experience ?? "")
    .split(/\n{2,}/)
    .map((row) => row.trim())
    .filter(Boolean);
  const hasAdditionalInfo = Boolean(String(data.additional_info ?? "").trim());

  return (
    <>
      <style>{styles}</style>
      <article className="cv-template cv-template--product-designer">
        <header className="pd-head">
          <h1>{text(data.full_name, "Ứng viên")}</h1>
          <p className="pd-role">
            {text(data.headline, "Nhà thiết kế sản phẩm")}
          </p>
          <div className="pd-meta">
            <span>{text(data.email, "email@domain.com")}</span>
            <span>{text(data.phone, "0900 000 003")}</span>
            <span>{text(data.desired_location, "TP. Hồ Chí Minh")}</span>
          </div>
        </header>

        <div className="pd-grid">
          <main className="pd-main">
            <section className="pd-sec">
              <h2>Tóm tắt</h2>
              <p className="cv-pre-wrap">{text(data.summary)}</p>
            </section>

            <section className="pd-sec">
              <h2>Dự án tiêu biểu</h2>
              {experienceRows.length ? (
                <div className="pd-project">
                  <strong>Dự án nổi bật</strong>
                  <p className="cv-pre-wrap">{experienceRows[0]}</p>
                </div>
              ) : (
                <p className="cv-pre-wrap">{text(data.experience)}</p>
              )}
            </section>

            <section className="pd-sec">
              <h2>Kinh nghiệm</h2>
              <p className="cv-pre-wrap">{text(data.experience)}</p>
            </section>

            {hasAdditionalInfo ? (
              <section className="pd-sec">
                <h2>Thông tin thêm</h2>
                <p className="cv-pre-wrap">{text(data.additional_info)}</p>
              </section>
            ) : null}
          </main>

          <aside className="pd-side">
            <section className="pd-sec">
              <h2>Kỹ năng</h2>
              <div className="pd-skills">
                {(skills.length
                  ? skills
                  : ["Figma", "UX", "Design System"]
                ).map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
            </section>

            <section className="pd-sec">
              <h2>Học vấn</h2>
              <p className="cv-pre-wrap">{text(data.education)}</p>
            </section>
          </aside>
        </div>
      </article>
    </>
  );
}
