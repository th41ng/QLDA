const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Outfit:wght@300;400;500&display=swap');

  .cv-template--minimal-slate {
    font-family: 'Outfit', sans-serif;
    max-width: 794px;
    min-height: 1123px;
    margin: 0 auto;
    padding: 3rem 3.5rem;
    font-size: 13px;
    line-height: 1.7;
    color: #1c1c1c;
    background: #fff;
  }

  .cv-minimal-header {
    margin-bottom: 1rem;
  }

  .cv-minimal-header h1 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 42px;
    font-weight: 600;
    margin: 0 0 6px;
    line-height: 1.05;
    letter-spacing: -0.5px;
    color: #1c1c1c;
  }

  .cv-minimal-header p {
    font-size: 13px;
    color: #777;
    margin: 0;
    font-weight: 300;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .cv-minimal-meta {
    display: flex;
    gap: 0;
    margin: 1.4rem 0 2rem;
    padding: 10px 0;
    border-top: 1px solid #1c1c1c;
    border-bottom: 1px solid #1c1c1c;
    flex-wrap: wrap;
  }

  .cv-minimal-meta span {
    font-size: 11.5px;
    color: #555;
    font-weight: 400;
    letter-spacing: 0.02em;
    padding-right: 20px;
    margin-right: 20px;
    border-right: 0.5px solid #ccc;
    line-height: 1.4;
  }

  .cv-minimal-meta span:last-child {
    border-right: none;
    padding-right: 0;
    margin-right: 0;
  }

  .cv-minimal-meta a {
    color: #1c1c1c;
    text-decoration: none;
  }

  .cv-minimal-section {
    display: grid;
    grid-template-columns: 130px 1fr;
    gap: 0 2rem;
    margin-bottom: 1.6rem;
    padding-bottom: 1.6rem;
    border-bottom: 0.5px solid #e8e8e8;
  }

  .cv-minimal-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .cv-minimal-section h2 {
    font-family: 'Outfit', sans-serif;
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: #999;
    margin: 4px 0 0;
    padding: 0;
  }

  .cv-pre-wrap {
    font-size: 13px;
    color: #444;
    line-height: 1.75;
    margin: 0;
    white-space: pre-wrap;
  }

  .cv-minimal-exp-item {
    margin-bottom: 1.2rem;
  }

  .cv-minimal-exp-item:last-child {
    margin-bottom: 0;
  }

  .cv-minimal-exp-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 2px;
  }

  .cv-minimal-exp-company {
    font-weight: 500;
    font-size: 13px;
    color: #1c1c1c;
  }

  .cv-minimal-exp-period {
    font-size: 11px;
    color: #aaa;
    font-style: italic;
    white-space: nowrap;
  }

  .cv-minimal-exp-role {
    font-size: 12px;
    color: #888;
    margin: 0 0 6px;
  }

  .cv-minimal-exp-bullets {
    margin: 0;
    padding-left: 14px;
    color: #555;
    font-size: 12.5px;
  }

  .cv-minimal-exp-bullets li {
    margin-bottom: 3px;
  }

  .cv-minimal-exp-divider {
    border: none;
    border-top: 0.5px solid #eee;
    margin: 1rem 0;
  }

  .cv-minimal-skills-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 6px;
  }

  .cv-minimal-skill-tag {
    font-size: 11.5px;
    padding: 5px 10px;
    border: 0.5px solid #ddd;
    border-radius: 3px;
    color: #555;
    background: #fafafa;
    text-align: center;
  }

  .cv-minimal-edu-item {
    margin-bottom: 0.8rem;
  }

  .cv-minimal-edu-item:last-child {
    margin-bottom: 0;
  }

  .cv-minimal-edu-school {
    font-weight: 500;
    font-size: 13px;
    margin: 0 0 2px;
  }

  .cv-minimal-edu-degree {
    font-size: 12px;
    color: #777;
    margin: 0;
  }

  .cv-minimal-project-item {
    margin-bottom: 1rem;
  }

  .cv-minimal-project-item:last-child {
    margin-bottom: 0;
  }

  .cv-minimal-project-name {
    font-weight: 500;
    font-size: 13px;
    margin: 0 0 2px;
  }

  .cv-minimal-project-tech {
    font-size: 11px;
    color: #aaa;
    font-style: italic;
    margin: 0 0 4px;
  }

  .cv-minimal-project-desc {
    font-size: 12.5px;
    color: #555;
    margin: 0;
    line-height: 1.65;
  }
`;

function text(value, fallback = "Chưa cập nhật") {
  const raw = String(value ?? "").trim();
  return raw || fallback;
}

function splitLines(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return String(value ?? "")
    .split(/\n+|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function MinimalSlateTemplate({ data = {} }) {
  const skills = splitLines(data.skills);
  const experiences = Array.isArray(data.experience_list)
    ? data.experience_list
    : null;
  const projects = Array.isArray(data.project_list) ? data.project_list : null;
  const educations = Array.isArray(data.education_list)
    ? data.education_list
    : null;

  const metaItems = [
    data.email,
    data.phone,
    data.desired_location || data.address,
    data.github,
  ].filter(Boolean);
  const hasAdditionalInfo = Boolean(String(data.additional_info ?? "").trim());

  return (
    <>
      <style>{styles}</style>
      <article className="cv-template cv-template--minimal-slate">
        <header className="cv-minimal-header">
          <h1>{text(data.full_name, "Họ và tên")}</h1>
          <p>{text(data.headline, "Vị trí ứng tuyển")}</p>
        </header>

        <div className="cv-minimal-meta">
          {metaItems.map((item, idx) => {
            const value = String(item);
            return (
              <span key={idx}>
                {value.startsWith("http") ? (
                  <a href={value} target="_blank" rel="noreferrer">
                    {value.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  value
                )}
              </span>
            );
          })}
        </div>

        {data.summary && (
          <section className="cv-minimal-section">
            <h2>Tóm tắt</h2>
            <p className="cv-pre-wrap">{text(data.summary)}</p>
          </section>
        )}

        <section className="cv-minimal-section">
          <h2>Kinh nghiệm</h2>
          <div>
            {experiences ? (
              experiences.map((exp, idx) => (
                <div key={idx}>
                  {idx > 0 && <hr className="cv-minimal-exp-divider" />}
                  <div className="cv-minimal-exp-item">
                    <div className="cv-minimal-exp-header">
                      <span className="cv-minimal-exp-company">
                        {exp.company}
                      </span>
                      <span className="cv-minimal-exp-period">
                        {exp.period}
                      </span>
                    </div>
                    <p className="cv-minimal-exp-role">{exp.role}</p>
                    {Array.isArray(exp.bullets) && exp.bullets.length > 0 && (
                      <ul className="cv-minimal-exp-bullets">
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
          </div>
        </section>

        {(projects || data.project_text) && (
          <section className="cv-minimal-section">
            <h2>Dự án</h2>
            <div>
              {projects ? (
                projects.map((proj, idx) => (
                  <div className="cv-minimal-project-item" key={idx}>
                    <p className="cv-minimal-project-name">{proj.name}</p>
                    {proj.tech && (
                      <p className="cv-minimal-project-tech">{proj.tech}</p>
                    )}
                    {proj.desc && (
                      <p className="cv-minimal-project-desc">{proj.desc}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="cv-pre-wrap">{text(data.project_text)}</p>
              )}
            </div>
          </section>
        )}

        <section className="cv-minimal-section">
          <h2>Học vấn</h2>
          <div>
            {educations ? (
              educations.map((edu, idx) => (
                <div className="cv-minimal-edu-item" key={idx}>
                  <p className="cv-minimal-edu-school">{edu.school}</p>
                  <p className="cv-minimal-edu-degree">
                    {edu.degree}
                    {edu.period ? ` · ${edu.period}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="cv-pre-wrap">{text(data.education)}</p>
            )}
          </div>
        </section>

        <section className="cv-minimal-section">
          <h2>Kỹ năng</h2>
          <div>
            {skills.length ? (
              <div className="cv-minimal-skills-grid">
                {skills.map((item) => (
                  <div className="cv-minimal-skill-tag" key={item}>
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <p>Chưa cập nhật</p>
            )}
          </div>
        </section>

        {hasAdditionalInfo ? (
          <section className="cv-minimal-section">
            <h2>Thông tin thêm</h2>
            <p className="cv-pre-wrap">{text(data.additional_info)}</p>
          </section>
        ) : null}
      </article>
    </>
  );
}
