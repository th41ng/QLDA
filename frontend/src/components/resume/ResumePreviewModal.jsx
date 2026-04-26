import { resolveTemplateComponent } from "./templates";

function getTemplateVariant(slugOrName) {
  const key = String(slugOrName || "").toLowerCase().trim();
  if (key.includes("ats")) return "ats";
  if (key.includes("creative") || key.includes("minimal")) return "creative";
  return "modern";
}

export default function ResumePreviewModal({ resume, onClose, onDownload }) {
  const structured = resume.structured_json || {};
  const template = structured.template || {};
  const sourceLabel = resume.source_type === "upload" ? "CV tải lên" : "Tạo từ mẫu";
  const templateKey = template.slug || template.name || resume.template_name;
  const TemplateComponent = resolveTemplateComponent(templateKey);
  const variant = getTemplateVariant(templateKey);

  return (
    <div className="rw-modal-backdrop">
      <div className={`rw-preview-modal rw-preview-modal--${variant}`}>
        <div className="rw-modal-head">
          <div>
            <p className="rw-modal-kicker">Xem trước CV</p>
            <h3 className="rw-heading-2xl">{resume.title}</h3>
            <p className="rw-modal-subtitle">
              Mẫu: {resume.template_name || template.name || "Chưa chọn"} • {sourceLabel}
            </p>
          </div>
          <div className="rw-modal-actions">
            <button type="button" className="rw-btn-outline-lg" onClick={() => onDownload?.(resume)}>
              Tải PDF
            </button>
            <button type="button" className="rw-btn-close" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>

        <div className="rw-modal-body">
          <div className="candidate-live-template-wrap">
            <TemplateComponent data={structured} />
          </div>
        </div>
      </div>
    </div>
  );
}
