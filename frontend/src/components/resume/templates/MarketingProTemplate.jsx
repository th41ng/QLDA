const styles = `
  .cv-template--marketing-pro {
    max-width: 794px;
    min-height: 1123px;
    margin: 0 auto;
    border: 1px solid #fde68a;
    background: #ffffff;
    color: #1f2937;
    font-family: "Segoe UI", Tahoma, sans-serif;
  }
  .mk-head {
    padding: 16px 18px;
    background: linear-gradient(135deg, #f59e0b, #f97316);
    color: #fff;
  }
  .mk-head h1 { margin: 0; font-size: 28px; }
  .mk-head p { margin: 4px 0 0; opacity: 0.95; }
  .mk-tag-row { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; }
  .mk-tag-row span { border: 1px solid rgba(255,255,255,0.45); border-radius: 999px; padding: 3px 9px; font-size: 11px; }
  .mk-body { padding: 16px 18px; display: grid; gap: 14px; }
  .mk-sec h2 { margin: 0 0 7px; font-size: 14px; color: #92400e; text-transform: uppercase; letter-spacing: 0.08em; }
  .mk-campaign { border: 1px solid #fde68a; border-radius: 10px; background: #fffbeb; padding: 10px; }
  .mk-campaign strong { display: block; margin-bottom: 4px; color: #92400e; }
  .mk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .mk-box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; background: #fff; }
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

export default function MarketingProTemplate({ data = {} }) {
  const skills = list(data.skills);
  const hasAdditionalInfo = Boolean(String(data.additional_info ?? "").trim());

  return (
    <>
      <style>{styles}</style>
      <article className="cv-template cv-template--marketing-pro">
        <header className="mk-head">
          <h1>{text(data.full_name, "Ứng viên")}</h1>
          <p>{text(data.headline, "Chuyên viên marketing")}</p>
          <div className="mk-tag-row">
            <span>{text(data.email, "email@domain.com")}</span>
            <span>{text(data.phone, "0900 000 003")}</span>
            <span>{text(data.desired_location, "TP. Hồ Chí Minh")}</span>
          </div>
        </header>

        <div className="mk-body">
          <section className="mk-sec">
            <h2>Tóm tắt cá nhân</h2>
            <p className="cv-pre-wrap">{text(data.summary)}</p>
          </section>

          <section className="mk-sec">
            <h2>Chiến dịch nổi bật</h2>
            <div className="mk-campaign">
              <strong>Chiến dịch chính</strong>
              <p className="cv-pre-wrap">{text(data.experience)}</p>
            </div>
          </section>

          {hasAdditionalInfo ? (
            <section className="mk-sec">
              <h2>Thông tin thêm</h2>
              <p className="cv-pre-wrap">{text(data.additional_info)}</p>
            </section>
          ) : null}

          <div className="mk-grid">
            <section className="mk-sec mk-box">
              <h2>Kênh triển khai</h2>
              <p className="cv-pre-wrap">
                {skills.length
                  ? skills.join(", ")
                  : "SEO, Social, Quảng cáo hiệu suất, Email"}
              </p>
            </section>
            <section className="mk-sec mk-box">
              <h2>Học vấn</h2>
              <p className="cv-pre-wrap">{text(data.education)}</p>
            </section>
          </div>
        </div>
      </article>
    </>
  );
}
