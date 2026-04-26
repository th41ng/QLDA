import { resolveTemplateComponent } from "./templates";

function getTemplateVariant(template) {
  const key = String(template?.slug || template?.name || "")
    .toLowerCase()
    .trim();
  if (key.includes("ats")) return "ats";
  if (key.includes("creative") || key.includes("minimal")) return "creative";
  return "modern";
}

function getTemplateSkin(template) {
  const key = String(template?.slug || template?.name || "")
    .toLowerCase()
    .trim();
  if (key.includes("modern-blue")) return "modern-blue";
  if (key.includes("ats-clean")) return "ats-clean";
  if (key.includes("creative-minimal")) return "creative-minimal";
  if (key.includes("product-designer")) return "product-designer";
  if (key.includes("data-analyst")) return "data-analyst";
  if (key.includes("hr-executive")) return "hr-executive";
  if (key.includes("marketing-pro")) return "marketing-pro";
  if (key.includes("minimal") || key.includes("executive")) return "minimal-slate";
  return "generic";
}

function getSkinMeta(skin) {
  const meta = {
    "modern-blue": { title: "Công nghệ", cue: "2 cột" },
    "ats-clean": { title: "Gọn gàng", cue: "dễ đọc" },
    "creative-minimal": { title: "Sáng tạo", cue: "hồ sơ cá nhân" },
    "product-designer": { title: "Thiết kế", cue: "dự án" },
    "data-analyst": { title: "Phân tích", cue: "số liệu" },
    "hr-executive": { title: "Nhân sự", cue: "quản lý" },
    "marketing-pro": { title: "Marketing", cue: "chiến dịch" },
    "minimal-slate": { title: "Tối giản", cue: "sạch" },
    generic: { title: "Mẫu CV", cue: "linh hoạt" },
  };
  return meta[skin] || meta.generic;
}

function buildPreviewData(template, skin) {
  const titleBySkin = {
    "modern-blue": "Frontend Developer",
    "ats-clean": "Business Analyst",
    "creative-minimal": "Creative Designer",
    "product-designer": "Product Designer",
    "data-analyst": "Data Analyst",
    "hr-executive": "HR Executive",
    "marketing-pro": "Digital Marketer",
    "minimal-slate": "Software Engineer",
    generic: "Candidate",
  };

  const headline = titleBySkin[skin] || titleBySkin.generic;
  return {
    full_name: "Tien Candidate",
    headline,
    email: "candidate@email.com",
    phone: "0900 000 003",
    address: "TP. Ho Chi Minh",
    desired_location: "Ho Chi Minh",
    expected_salary: "18.000.000 VND",
    current_title: headline,
    years_experience: 2,
    summary:
      "Ung vien co kha nang hoc nhanh, lam viec nhom tot va da tham gia cac du an thuc te trong moi truong linh hoat.",
    experience:
      "2024 - Nay\nCong ty ABC\n- Phat trien tinh nang moi\n- Phoi hop team de dat KPI",
    education:
      "Dai hoc Mo TP.HCM\nChuyen nganh CNTT\n2020 - 2024",
    skills: "React, JavaScript, SQL, UI/UX",
    template_name: template.name,
    template_slug: template.slug,
  };
}

function TemplateLivePreview({ template, skin }) {
  const TemplateComponent = resolveTemplateComponent(template.slug || template.name);
  const previewData = buildPreviewData(template, skin);

  return (
    <div className={`rw-template-live-preview rw-template-live-preview--${skin}`} aria-label={`Xem trước mẫu CV ${template.name}`}>
      <div className="rw-template-live-canvas">
        <TemplateComponent data={previewData} />
      </div>
    </div>
  );
}

function getVariantLabel(variant) {
  if (variant === "ats") return "ATS Pro";
  if (variant === "creative") return "Creative";
  return "Modern";
}

export default function ResumeTemplateGrid({ templates, onUseTemplate, selectedSlug = "" }) {
  return (
    <section className="rw-card rw-template-grid-shell">
      <div className="rw-template-grid-head">
        <div>
          <h3 className="rw-template-grid-title">Mẫu CV có sẵn</h3>
          <p className="rw-template-grid-desc">
            Chọn một mẫu phù hợp, sau đó kiểm tra nội dung trong bản xem trước.
          </p>
        </div>
        <div className="rw-template-grid-note">
          <strong>{templates.length}</strong>
          <span>mẫu đang hoạt động</span>
        </div>
      </div>

      {templates.length ? (
        <div className="rw-template-grid">
          {templates.map((template) => {
            const selected = selectedSlug && template.slug === selectedSlug;
            const variant = getTemplateVariant(template);
            const skin = getTemplateSkin(template);
            const skinMeta = getSkinMeta(skin);
            return (
              <article
                key={template.id || template.slug || template.name}
                className={selected ? `rw-template-card rw-template-card--gallery rw-template-card--${variant} rw-template-card--skin-${skin} rw-template-card--selected` : `rw-template-card rw-template-card--gallery rw-template-card--${variant} rw-template-card--skin-${skin}`}
              >
                <div className="rw-template-thumb rw-template-thumb--gallery">
                  <TemplateLivePreview template={template} skin={skin} />
                  <div className="rw-template-thumb-overlay">
                    <div className="rw-template-thumb-badge">
                      <span>{selected ? "Đang chọn" : "Mẫu CV"}</span>
                    </div>
                    <span className={`rw-template-variant rw-template-variant--${variant}`}>{getVariantLabel(variant)}</span>
                  </div>
                  <div className="rw-template-motif-row">
                    <span className="rw-template-motif">{skinMeta.title}</span>
                    <span className="rw-template-motif">{skinMeta.cue}</span>
                  </div>
                </div>

                <div className="rw-template-body rw-template-body--gallery">
                  <div className="rw-template-copy">
                    <h4>{template.name}</h4>
                    <p>{template.summary || template.description || "Chưa có mô tả"}</p>
                  </div>

                  <div className="rw-template-meta">
                    <span className="rw-badge rw-badge-white">Mẫu {getVariantLabel(variant)}</span>
                    <span className="rw-template-meta-link">Xem trước {getVariantLabel(variant)}</span>
                  </div>

                  <div className="rw-template-actions">
                    <button
                      type="button"
                      className={selected ? "rw-btn-outline-lg rw-btn-outline-lg--selected rw-template-action-btn" : "rw-btn-outline-lg rw-template-action-btn"}
                      onClick={() => onUseTemplate(template)}
                    >
                      {selected ? "Đã chọn" : "Chọn mẫu này"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rw-state-empty">
          <h3>Chưa có mẫu CV nào</h3>
          <p>Hiện tại chưa có mẫu CV nào để chọn.</p>
        </div>
      )}
    </section>
  );
}
