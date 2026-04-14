function getText(value, fallback = "Chưa cập nhật") {
  const text = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || fallback;
}

function getList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return String(value ?? "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getParagraphs(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ModernBlueTemplate({ data = {} }) {
  const skills = getList(data.skills);
  const expBlocks = getParagraphs(data.experience);
  const eduBlocks = getParagraphs(data.education);
  const hasAdditionalInfo = Boolean(String(data.additional_info ?? "").trim());
  const contact = [
    { label: "Ngày sinh", value: data.dob },
    { label: "Giới tính", value: data.gender },
    { label: "Số điện thoại", value: data.phone },
    { label: "Email", value: data.email },
    { label: "Địa chỉ", value: data.address },
  ];
  const goals = [
    { label: "Vị trí hiện tại", value: data.current_title },
    {
      label: "Số năm kinh nghiệm",
      value: data.years_experience
        ? `${data.years_experience} năm`
        : "Chưa cập nhật",
    },
    { label: "Mức lương mong muốn", value: data.expected_salary },
    { label: "Khu vực mong muốn", value: data.desired_location },
  ];

  return (
    <article className="cv-template cv-template--modern-blue">
      <div className="cv-modern-topline">
        <span>Modern Blue</span>
        <span>{getText(data.current_title, "Hồ sơ ứng viên")}</span>
      </div>

      <header className="cv-modern-header">
        <div className="cv-modern-avatar-wrap">
          <div className="cv-modern-avatar" aria-hidden="true" />
        </div>
        <div className="cv-modern-header-main">
          <h1>{getText(data.full_name, "Họ và tên")}</h1>
          <p className="cv-modern-headline">
            {getText(data.headline, "Vị trí ứng tuyển")}
          </p>
          <div className="cv-modern-contact-grid">
            {contact.map((item) => (
              <p key={item.label}>
                <strong>{item.label}:</strong> {getText(item.value)}
              </p>
            ))}
          </div>

          <div className="cv-modern-chip-row">
            <span>{getText(data.expected_salary, "Lương thỏa thuận")}</span>
            <span>{getText(data.desired_location, "Linh hoạt địa điểm")}</span>
            <span>
              {data.years_experience
                ? `${data.years_experience} năm kinh nghiệm`
                : "Đang cập nhật kinh nghiệm"}
            </span>
          </div>
        </div>
      </header>

      <div className="cv-modern-grid">
        <aside className="cv-modern-aside">
          <h3>Mục tiêu nghề nghiệp</h3>
          <p className="cv-pre-wrap">{getText(data.summary)}</p>

          <h3>Thông tin bổ sung</h3>
          <div className="cv-modern-meta-list">
            {goals.map((item) => (
              <p key={item.label}>
                <strong>{item.label}:</strong> {getText(item.value)}
              </p>
            ))}
          </div>

          <h3>Kỹ năng</h3>
          {skills.length ? (
            <ul className="cv-skill-list">
              {skills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          ) : (
            <p>Chưa cập nhật</p>
          )}
        </aside>

        <section className="cv-modern-main">
          <section className="cv-modern-block">
            <h2>Kinh nghiệm làm việc</h2>
            {expBlocks.length ? (
              <div className="cv-modern-stack">
                {expBlocks.map((block, index) => (
                  <article key={`${block}-${index}`} className="cv-modern-item">
                    <span className="cv-modern-item-dot" />
                    <p className="cv-pre-wrap">{block}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="cv-pre-wrap">{getText(data.experience)}</p>
            )}
          </section>

          <section className="cv-modern-block">
            <h2>Học vấn</h2>
            {eduBlocks.length ? (
              <div className="cv-modern-stack">
                {eduBlocks.map((block, index) => (
                  <article key={`${block}-${index}`} className="cv-modern-item">
                    <span className="cv-modern-item-dot" />
                    <p className="cv-pre-wrap">{block}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="cv-pre-wrap">{getText(data.education)}</p>
            )}
          </section>

          {hasAdditionalInfo ? (
            <section className="cv-modern-block">
              <h2>Thông tin thêm</h2>
              <p className="cv-pre-wrap">{getText(data.additional_info)}</p>
            </section>
          ) : null}
        </section>
      </div>
    </article>
  );
}
