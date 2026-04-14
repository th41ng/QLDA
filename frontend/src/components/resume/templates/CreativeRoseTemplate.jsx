const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap');

  .cv-template--creative-rose {
    font-family: 'DM Sans', sans-serif;
    max-width: 794px;
    min-height: 1123px;
    margin: 0 auto;
    padding: 0 0 2rem;
    font-size: 13px;
    line-height: 1.6;
    color: #1a1a1a;
    background: #fff;
  }

  .cv-creative-header {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: end;
    padding: 2.5rem 2rem 1.8rem;
    border-bottom: 2px solid #1a1a1a;
    gap: 2rem;
  }

  .cv-creative-kicker {
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #888;
    margin: 0 0 8px;
    font-weight: 400;
  }

  .cv-creative-header h1 {
    font-family: 'Playfair Display', serif;
    font-size: 38px;
    font-weight: 600;
    margin: 0 0 6px;
    line-height: 1.1;
    letter-spacing: -0.5px;
  }

  .cv-creative-role {
    font-size: 13px;
    color: #555;
    margin: 0;
    font-weight: 400;
    letter-spacing: 0.02em;
  }

  .cv-creative-contact {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .cv-creative-contact p {
    margin: 0;
    font-size: 12px;
    color: #666;
    font-weight: 300;
  }

  .cv-creative-contact a {
    color: #1a6fcf;
    text-decoration: none;
    font-size: 12px;
  }

  .cv-creative-body {
    display: grid;
    grid-template-columns: 1fr 260px;
  }

  .cv-creative-main {
    padding: 1.8rem 2rem;
    border-right: 0.5px solid #ddd;
  }

  .cv-creative-sidebar {
    padding: 1.8rem 1.5rem;
    background: #f8f8f6;
  }

  .cv-creative-section {
    margin-bottom: 2rem;
  }

  .cv-creative-section:last-child {
    margin-bottom: 0;
  }

  .cv-creative-section-title {
    font-family: 'Playfair Display', serif;
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 12px;
    padding-bottom: 6px;
    border-bottom: 0.5px solid #ddd;
    letter-spacing: -0.2px;
  }

  .cv-pre-wrap {
    font-size: 13px;
    color: #555;
    line-height: 1.75;
    margin: 0;
    white-space: pre-wrap;
  }

  .cv-exp-item {
    margin-bottom: 1.4rem;
  }

  .cv-exp-item:last-child {
    margin-bottom: 0;
  }

  .cv-exp-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 3px;
    gap: 8px;
  }

  .cv-exp-company {
    font-weight: 500;
    font-size: 13px;
  }

  .cv-exp-period {
    font-size: 11px;
    color: #999;
    white-space: nowrap;
    font-style: italic;
  }

  .cv-exp-role {
    font-size: 12px;
    color: #666;
    margin: 0 0 6px;
    font-style: italic;
  }

  .cv-exp-bullets {
    margin: 0;
    padding-left: 14px;
    color: #555;
    font-size: 12.5px;
  }

  .cv-exp-bullets li {
    margin-bottom: 3px;
  }

  .cv-divider {
    border: none;
    border-top: 0.5px solid #eee;
    margin: 1.2rem 0;
  }

  .cv-creative-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  }

  .cv-creative-chip-list span {
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 20px;
    border: 0.5px solid #ccc;
    background: #fff;
    color: #555;
    font-weight: 400;
  }

  .cv-info-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    padding: 5px 0;
    border-bottom: 0.5px solid #eee;
    gap: 8px;
  }

  .cv-info-row:last-child {
    border-bottom: none;
  }

  .cv-info-label {
    color: #999;
    font-weight: 400;
    flex-shrink: 0;
  }

  .cv-info-value {
    text-align: right;
    color: #555;
    font-weight: 400;
  }

  .cv-project-item {
    margin-bottom: 1rem;
  }

  .cv-project-name {
    font-weight: 500;
    font-size: 12.5px;
    margin: 0 0 3px;
  }

  .cv-project-tech {
    font-size: 11px;
    color: #999;
    font-style: italic;
    margin: 0 0 4px;
  }

  .cv-project-desc {
    font-size: 12px;
    color: #555;
    margin: 0;
    padding-left: 10px;
    border-left: 2px solid #ddd;
    line-height: 1.6;
  }

  .cv-link {
    font-size: 12px;
    color: #1a6fcf;
    text-decoration: none;
    word-break: break-all;
  }
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

export default function CreativeRoseTemplate({ data = {} }) {
  const skills = list(data.skills);

  const experiences = Array.isArray(data.experience_list)
    ? data.experience_list
    : null;

  const projects = Array.isArray(data.project_list) ? data.project_list : null;

  const personalInfo = [
    { label: "Ngày sinh", value: data.dob },
    { label: "Giới tính", value: data.gender },
    { label: "Địa điểm", value: data.address },
    { label: "Khu vực", value: data.desired_location },
    { label: "Mức lương", value: data.desired_salary || data.expected_salary },
  ].filter((item) => item.value);
  const hasAdditionalInfo = Boolean(String(data.additional_info ?? "").trim());

  return (
    <>
      <style>{styles}</style>
      <article className="cv-template cv-template--creative-rose">
        <header className="cv-creative-header">
          <div>
            <p className="cv-creative-kicker">Hồ sơ ứng viên · 2025</p>
            <h1>{text(data.full_name, "Họ và tên")}</h1>
            <p className="cv-creative-role">
              {text(data.headline, "Vị trí ứng tuyển")}
            </p>
          </div>
          <div className="cv-creative-contact">
            {data.email && <p>{data.email}</p>}
            {data.phone && <p>{data.phone}</p>}
            {data.address && <p>{data.address}</p>}
            {data.github && (
              <a
                href={data.github}
                className="cv-link"
                target="_blank"
                rel="noreferrer"
              >
                {data.github.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </header>

        <div className="cv-creative-body">
          <main className="cv-creative-main">
            <section className="cv-creative-section">
              <h2 className="cv-creative-section-title">Tóm tắt bản thân</h2>
              <p className="cv-pre-wrap">{text(data.summary)}</p>
            </section>

            <section className="cv-creative-section">
              <h2 className="cv-creative-section-title">
                Kinh nghiệm làm việc
              </h2>

              {experiences ? (
                experiences.map((exp, idx) => (
                  <div key={idx}>
                    {idx > 0 && <hr className="cv-divider" />}
                    <div className="cv-exp-item">
                      <div className="cv-exp-header">
                        <span className="cv-exp-company">{exp.company}</span>
                        <span className="cv-exp-period">{exp.period}</span>
                      </div>
                      <p className="cv-exp-role">{exp.role}</p>
                      {Array.isArray(exp.bullets) && exp.bullets.length > 0 && (
                        <ul className="cv-exp-bullets">
                          {exp.bullets.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="cv-pre-wrap">{text(data.experience)}</p>
              )}
            </section>

            {projects && (
              <section className="cv-creative-section">
                <h2 className="cv-creative-section-title">Dự án cá nhân</h2>
                {projects.map((proj, idx) => (
                  <div className="cv-project-item" key={idx}>
                    <p className="cv-project-name">{proj.name}</p>
                    {proj.tech && (
                      <p className="cv-project-tech">{proj.tech}</p>
                    )}
                    {proj.desc && (
                      <p className="cv-project-desc">{proj.desc}</p>
                    )}
                  </div>
                ))}
                {data.github && (
                  <p
                    style={{
                      marginTop: 10,
                      marginBottom: 0,
                      fontSize: 12,
                      color: "#999",
                    }}
                  >
                    GitHub:{" "}
                    <a
                      href={data.github}
                      className="cv-link"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {data.github.replace(/^https?:\/\//, "")}
                    </a>
                  </p>
                )}
              </section>
            )}

            {hasAdditionalInfo ? (
              <section className="cv-creative-section">
                <h2 className="cv-creative-section-title">Thông tin thêm</h2>
                <p className="cv-pre-wrap">{text(data.additional_info)}</p>
              </section>
            ) : null}
          </main>

          <aside className="cv-creative-sidebar">
            <section className="cv-creative-section">
              <h2 className="cv-creative-section-title">Kỹ năng</h2>
              <div className="cv-creative-chip-list">
                {skills.length ? (
                  skills.map((item) => <span key={item}>{item}</span>)
                ) : (
                  <span>Chưa cập nhật</span>
                )}
              </div>
            </section>

            {personalInfo.length > 0 && (
              <section className="cv-creative-section">
                <h2 className="cv-creative-section-title">Thông tin cá nhân</h2>
                <div>
                  {personalInfo.map(({ label, value }) => (
                    <div className="cv-info-row" key={label}>
                      <span className="cv-info-label">{label}</span>
                      <span className="cv-info-value">{value}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="cv-creative-section">
              <h2 className="cv-creative-section-title">Chức danh</h2>
              <p style={{ margin: 0, fontSize: 12.5, color: "#555" }}>
                {text(data.current_title, "Nhân viên phát triển phần mềm")}
              </p>
              {(data.years_of_experience || data.years_experience) && (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#999" }}>
                  {data.years_of_experience || data.years_experience} năm kinh
                  nghiệm
                </p>
              )}
            </section>

            <section className="cv-creative-section">
              <h2 className="cv-creative-section-title">Học vấn</h2>
              <p className="cv-pre-wrap">{text(data.education)}</p>
            </section>
          </aside>
        </div>
      </article>
    </>
  );
}
