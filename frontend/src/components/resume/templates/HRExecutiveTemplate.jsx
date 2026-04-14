const styles = `
  .cv-template--hr-executive {
    max-width: 794px;
    min-height: 1123px;
    margin: 0 auto;
    border: 1px solid #fecdd3;
    background: #ffffff;
    color: #1f2937;
    font-family: Georgia, "Times New Roman", serif;
  }
  .hr-head { padding: 20px; border-bottom: 2px solid #fda4af; background: linear-gradient(180deg, #fff1f2, #ffffff); }
  .hr-head h1 { margin: 0; font-size: 30px; letter-spacing: 0.02em; }
  .hr-head p { margin: 6px 0 0; color: #be123c; }
  .hr-contact { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; color: #6b7280; }
  .hr-wrap { display: grid; grid-template-columns: 1.05fr 0.95fr; }
  .hr-main { padding: 16px 20px; display: grid; gap: 14px; }
  .hr-side { padding: 16px; background: #fff7f8; border-left: 1px solid #fbcfe8; display: grid; gap: 14px; }
  .hr-sec h2 { margin: 0 0 6px; font-size: 15px; color: #9f1239; }
  .hr-timeline { margin: 0; padding-left: 18px; display: grid; gap: 6px; }
  .hr-card { border: 1px solid #fbcfe8; border-radius: 10px; background: #fff; padding: 10px; }
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

export default function HRExecutiveTemplate({ data = {} }) {
  const skills = list(data.skills);
  const exp = list(data.experience);
  const hasAdditionalInfo = Boolean(String(data.additional_info ?? "").trim());

  return (
    <>
      <style>{styles}</style>
      <article className="cv-template cv-template--hr-executive">
        <header className="hr-head">
          <h1>{text(data.full_name, "Ứng viên")}</h1>
          <p>{text(data.headline, "Chuyên viên nhân sự")}</p>
          <div className="hr-contact">
            <span>{text(data.email, "email@domain.com")}</span>
            <span>{text(data.phone, "0900 000 003")}</span>
            <span>{text(data.address, "TP. Hồ Chí Minh")}</span>
          </div>
        </header>

        <div className="hr-wrap">
          <main className="hr-main">
            <section className="hr-sec">
              <h2>Tóm tắt chuyên môn</h2>
              <p className="cv-pre-wrap">{text(data.summary)}</p>
            </section>
            <section className="hr-sec">
              <h2>Hành trình sự nghiệp</h2>
              <ul className="hr-timeline">
                {(exp.length
                  ? exp
                  : [
                      "Dẫn dắt tuyển dụng nhân sự",
                      "Phát triển chương trình giữ chân nhân sự",
                      "Vận hành hoạt động nhân sự",
                    ]
                ).map((item, idx) => (
                  <li key={`${item}-${idx}`}>{item}</li>
                ))}
              </ul>
            </section>
            {hasAdditionalInfo ? (
              <section className="hr-sec">
                <h2>Thông tin thêm</h2>
                <div className="hr-card">
                  <p className="cv-pre-wrap">{text(data.additional_info)}</p>
                </div>
              </section>
            ) : null}
          </main>

          <aside className="hr-side">
            <section className="hr-sec">
              <h2>Định hướng vai trò</h2>
              <div className="hr-card">
                <p className="cv-pre-wrap">
                  {text(data.current_title, "Trưởng nhóm vận hành nhân sự")}
                </p>
                <p
                  style={{ margin: "8px 0 0", fontSize: 12, color: "#9ca3af" }}
                >
                  {data.years_experience
                    ? `${data.years_experience} năm kinh nghiệm`
                    : "Hồ sơ chuyên môn cao"}
                </p>
              </div>
            </section>
            <section className="hr-sec">
              <h2>Kỹ năng cốt lõi</h2>
              <div className="hr-card">
                <p className="cv-pre-wrap">
                  {skills.length
                    ? skills.join(", ")
                    : "Tuyển dụng, Luật lao động, Đào tạo, Đánh giá hiệu suất"}
                </p>
              </div>
            </section>
            <section className="hr-sec">
              <h2>Học vấn</h2>
              <div className="hr-card">
                <p className="cv-pre-wrap">{text(data.education)}</p>
              </div>
            </section>
          </aside>
        </div>
      </article>
    </>
  );
}
