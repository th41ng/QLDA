const styles = `
  .cv-template--data-analyst {
    max-width: 794px;
    min-height: 1123px;
    margin: 0 auto;
    border: 1px solid #bfdbfe;
    background: #ffffff;
    color: #0f172a;
    font-family: "Segoe UI", Tahoma, sans-serif;
  }
  .da-head {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    padding: 16px 18px;
    border-bottom: 1px solid #dbeafe;
    background: linear-gradient(180deg, #eff6ff, #ffffff);
  }
  .da-head h1 { margin: 0; font-size: 26px; }
  .da-head p { margin: 4px 0 0; color: #1d4ed8; }
  .da-pill { align-self: start; border-radius: 999px; padding: 6px 10px; background: #1d4ed8; color: #fff; font-size: 11px; font-weight: 700; }
  .da-kpi { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 12px 18px; }
  .da-kpi div { border-radius: 10px; border: 1px solid #dbeafe; background: #f8fbff; padding: 8px; }
  .da-kpi span { display: block; color: #64748b; font-size: 11px; }
  .da-kpi strong { display: block; margin-top: 4px; color: #1e40af; }
  .da-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .da-col { padding: 14px 18px; display: grid; gap: 12px; }
  .da-col + .da-col { border-left: 1px solid #e2e8f0; }
  .da-sec h2 { margin: 0 0 6px; font-size: 14px; color: #1e3a8a; }
  .da-list { margin: 0; padding-left: 16px; display: grid; gap: 4px; }
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

export default function DataAnalystTemplate({ data = {} }) {
  const skills = list(data.skills);
  const exp = list(data.experience);
  const edu = list(data.education);
  const hasAdditionalInfo = Boolean(String(data.additional_info ?? "").trim());

  return (
    <>
      <style>{styles}</style>
      <article className="cv-template cv-template--data-analyst">
        <header className="da-head">
          <div>
            <h1>{text(data.full_name, "Ứng viên")}</h1>
            <p>{text(data.headline, "Chuyên viên phân tích dữ liệu")}</p>
          </div>
          <span className="da-pill">METRICS</span>
        </header>

        <div className="da-kpi">
          <div>
            <span>Kinh nghiệm</span>
            <strong>
              {data.years_experience ? `${data.years_experience} năm` : "2 năm"}
            </strong>
          </div>
          <div>
            <span>Khu vực</span>
            <strong>{text(data.desired_location, "TP. Hồ Chí Minh")}</strong>
          </div>
          <div>
            <span>Mức lương</span>
            <strong>{text(data.expected_salary, "18M")}</strong>
          </div>
        </div>

        <div className="da-grid">
          <section className="da-col">
            <div className="da-sec">
              <h2>Tóm tắt</h2>
              <p className="cv-pre-wrap">{text(data.summary)}</p>
            </div>
            <div className="da-sec">
              <h2>Kinh nghiệm</h2>
              <ul className="da-list">
                {(exp.length
                  ? exp
                  : ["Xây dựng dashboard", "Theo dõi KPI", "Làm sạch dữ liệu"]
                ).map((item, idx) => (
                  <li key={`${item}-${idx}`}>{item}</li>
                ))}
              </ul>
            </div>
            {hasAdditionalInfo ? (
              <div className="da-sec">
                <h2>Thông tin thêm</h2>
                <p className="cv-pre-wrap">{text(data.additional_info)}</p>
              </div>
            ) : null}
          </section>

          <section className="da-col">
            <div className="da-sec">
              <h2>Kỹ năng</h2>
              <ul className="da-list">
                {(skills.length ? skills : ["SQL", "Python", "Power BI"]).map(
                  (item, idx) => (
                    <li key={`${item}-${idx}`}>{item}</li>
                  ),
                )}
              </ul>
            </div>
            <div className="da-sec">
              <h2>Học vấn</h2>
              <ul className="da-list">
                {(edu.length ? edu : [text(data.education)]).map(
                  (item, idx) => (
                    <li key={`${item}-${idx}`}>{item}</li>
                  ),
                )}
              </ul>
            </div>
          </section>
        </div>
      </article>
    </>
  );
}
