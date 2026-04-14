function getText(value, fallback = "Chưa cập nhật") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function getRows(value) {
  return String(value ?? "")
    .split(/\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ATSCleanTemplate({ data = {} }) {
  const skillRows = getRows(data.skills);
  const expRows = getRows(data.experience);
  const eduRows = getRows(data.education);
  const hasAdditionalInfo = Boolean(String(data.additional_info ?? "").trim());
  const metaItems = [
    { label: "Ngày sinh", value: getText(data.dob) },
    { label: "Giới tính", value: getText(data.gender) },
    {
      label: "Kinh nghiệm",
      value: data.years_experience
        ? `${data.years_experience} năm`
        : "Chưa cập nhật",
    },
    { label: "Mức lương", value: getText(data.expected_salary) },
    { label: "Khu vực", value: getText(data.desired_location) },
    { label: "Chức danh", value: getText(data.current_title) },
  ];

  return (
    <>
      <style>{`
        .cv-template--ats.cv-ats-enhanced {
          --ats-ink: #0f172a;
          --ats-subtle: #475569;
          --ats-border: #dbe5ef;
          --ats-primary: #0b5fff;
          --ats-primary-soft: #ecf3ff;
          --ats-surface: #ffffff;
          --ats-bg-soft: #f7fbff;
          border: 1px solid var(--ats-border);
          border-radius: 18px;
          background:
            radial-gradient(1200px 420px at 100% -10%, #e9f1ff 0%, transparent 52%),
            radial-gradient(800px 360px at -10% 110%, #f5f8ff 0%, transparent 48%),
            var(--ats-surface);
          box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
          padding: 22px;
          color: var(--ats-ink);
          font-family: "Manrope", "IBM Plex Sans", "Segoe UI", sans-serif;
          animation: atsFadeIn 0.35s ease-out;
        }

        .cv-template--ats.cv-ats-enhanced .cv-ats-header {
          border-bottom: 1px solid var(--ats-border);
          padding-bottom: 14px;
          margin-bottom: 14px;
        }

        .cv-template--ats.cv-ats-enhanced .cv-ats-title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 6px;
        }

        .cv-template--ats.cv-ats-enhanced .cv-ats-title-row h1 {
          margin: 0;
          font-size: clamp(26px, 3vw, 34px);
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .cv-template--ats.cv-ats-enhanced .cv-ats-chip {
          border: 1px solid #cfe1ff;
          border-radius: 999px;
          background: var(--ats-primary-soft);
          color: var(--ats-primary);
          padding: 5px 11px;
          font-size: 11px;
          letter-spacing: 0.09em;
          font-weight: 800;
          white-space: nowrap;
        }

        .cv-template--ats.cv-ats-enhanced .cv-ats-role {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #1e3a8a;
        }

        .cv-template--ats.cv-ats-enhanced .cv-ats-contact {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .cv-template--ats.cv-ats-enhanced .cv-ats-contact span {
          font-size: 12px;
          color: #334155;
          background: var(--ats-bg-soft);
          border: 1px solid #e4edf8;
          border-radius: 999px;
          padding: 4px 10px;
        }

        .cv-template--ats.cv-ats-enhanced .cv-ats-meta-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 12px;
        }

        .cv-template--ats.cv-ats-enhanced .cv-ats-meta-item {
          margin: 0;
          border: 1px solid var(--ats-border);
          border-radius: 12px;
          padding: 9px 10px;
          background: #fff;
          min-height: 58px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
        }

        .cv-template--ats.cv-ats-enhanced .cv-ats-meta-item strong {
          font-size: 11px;
          color: var(--ats-subtle);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .cv-template--ats.cv-ats-enhanced .cv-ats-meta-value {
          font-size: 13px;
          font-weight: 600;
          color: var(--ats-ink);
          line-height: 1.25;
        }

        .cv-template--ats.cv-ats-enhanced .cv-ats-section {
          margin-top: 12px;
          border: 1px solid var(--ats-border);
          border-radius: 14px;
          background: #fff;
          padding: 11px 12px;
        }

        .cv-template--ats.cv-ats-enhanced .cv-ats-section h2 {
          margin: 0 0 8px;
          font-size: 14px;
          line-height: 1.3;
          letter-spacing: 0.02em;
          color: var(--ats-ink);
        }

        .cv-template--ats.cv-ats-enhanced .cv-ats-list {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 6px;
        }

        .cv-template--ats.cv-ats-enhanced .cv-ats-list li {
          color: #1f2937;
          line-height: 1.45;
        }

        .cv-template--ats.cv-ats-enhanced .cv-pre-wrap {
          margin: 0;
          color: #334155;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        @keyframes atsFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 880px) {
          .cv-template--ats.cv-ats-enhanced {
            padding: 16px;
            border-radius: 14px;
          }

          .cv-template--ats.cv-ats-enhanced .cv-ats-meta-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .cv-template--ats.cv-ats-enhanced .cv-ats-title-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .cv-template--ats.cv-ats-enhanced .cv-ats-meta-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <article className="cv-template cv-template--ats cv-ats-enhanced">
        <header className="cv-ats-header">
          <div className="cv-ats-title-row">
            <h1>{getText(data.full_name, "Họ và tên")}</h1>
            <span className="cv-ats-chip">ATS CLEAN</span>
          </div>
          <p className="cv-ats-role">
            {getText(data.headline, "Vị trí ứng tuyển")}
          </p>
          <div className="cv-ats-contact">
            <span>{getText(data.email, "Email")}</span>
            <span>{getText(data.phone, "Số điện thoại")}</span>
            <span>{getText(data.address, "Địa chỉ")}</span>
          </div>
        </header>

        <section className="cv-ats-meta-grid">
          {metaItems.map((item) => (
            <p className="cv-ats-meta-item" key={item.label}>
              <strong>{item.label}</strong>
              <span className="cv-ats-meta-value">{item.value}</span>
            </p>
          ))}
        </section>

        <AtsSection
          title="Mục tiêu nghề nghiệp"
          rows={getRows(data.summary)}
          fallback={getText(data.summary)}
        />
        <AtsSection
          title="Kinh nghiệm làm việc"
          rows={expRows}
          fallback={getText(data.experience)}
        />
        <AtsSection
          title="Học vấn"
          rows={eduRows}
          fallback={getText(data.education)}
        />
        <AtsSection
          title="Kỹ năng"
          rows={skillRows}
          fallback={getText(data.skills)}
          compact
        />
        {hasAdditionalInfo ? (
          <AtsSection
            title="Thông tin thêm"
            rows={getRows(data.additional_info)}
            fallback={getText(data.additional_info)}
          />
        ) : null}
      </article>
    </>
  );
}

function AtsSection({ title, rows, fallback, compact = false }) {
  return (
    <section
      className={
        compact ? "cv-ats-section cv-ats-section--compact" : "cv-ats-section"
      }
    >
      <h2>{title}</h2>
      {rows.length ? (
        <ul className="cv-ats-list">
          {rows.map((row, index) => (
            <li key={`${row}-${index}`}>{row}</li>
          ))}
        </ul>
      ) : (
        <p className="cv-pre-wrap">{fallback}</p>
      )}
    </section>
  );
}
