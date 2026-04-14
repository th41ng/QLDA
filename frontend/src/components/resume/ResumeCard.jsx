function toSkillList(skills) {
  if (Array.isArray(skills)) return skills.filter(Boolean).map(String);
  if (typeof skills === "string") {
    return skills
      .split(/,|\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  try {
    return new Date(value).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "Chưa cập nhật";
  }
}

function getTemplateVariant(resume, template) {
  if (resume.source_type === "upload") return "upload";
  const key = String(template?.slug || template?.name || resume.template_name || "")
    .toLowerCase()
    .trim();
  if (key.includes("ats")) return "ats";
  if (key.includes("creative") || key.includes("minimal")) return "creative";
  return "modern";
}

export default function ResumeCard({ resume, active, onPreview, onEdit, onDownload, onSetPrimary, onDelete }) {
  const structured = resume.structured_json || {};
  const template = structured.template || {};
  const skills = toSkillList(structured.skills).slice(0, 3);
  const tags = (resume.tags || []).map((tag) => tag.name).filter(Boolean).slice(0, 3);
  const isUpload = resume.source_type === "upload";
  const variant = getTemplateVariant(resume, template);
  const previewName = isUpload ? resume.original_filename || resume.title : template.name || resume.template_name || resume.title;
  const previewHeadline = isUpload ? "CV upload" : structured.headline || structured.current_title || structured.full_name || resume.title;
  const previewSummary = isUpload
    ? (resume.raw_text ? `${resume.raw_text.slice(0, 120)}${resume.raw_text.length > 120 ? "..." : ""}` : "File PDF, DOC hoặc DOCX đã upload")
    : structured.summary || "CV tạo từ mẫu với dữ liệu thật từ hồ sơ ứng viên.";

  return (
    <article className={active ? `rw-cv-card rw-cv-card--${variant} rw-cv-card--primary` : `rw-cv-card rw-cv-card--${variant}`}>
      <div className={isUpload ? "rw-cv-card-preview rw-cv-card-preview--upload" : `rw-cv-card-preview rw-cv-card-preview--manual rw-cv-card-preview--${variant}`}>
        {isUpload ? (
          <>
            <div className="rw-cv-card-upload-icon">
              <span>PDF</span>
            </div>
            <div className="rw-cv-card-preview-copy">
              <strong>{previewName}</strong>
              <p>{previewSummary}</p>
            </div>
          </>
        ) : (
          <>
            <div className="rw-cv-card-preview-topline" />
            <div className="rw-cv-card-preview-copy">
              <span className="rw-cv-card-preview-kicker">{template.name || resume.template_name || "Tạo từ mẫu"}</span>
              <strong>{structured.full_name || resume.title}</strong>
              <p>{previewHeadline}</p>
              <div className="rw-cv-card-preview-lines">
                <span>{structured.email || "Email chưa cập nhật"}</span>
                <span>{structured.phone || "SĐT chưa cập nhật"}</span>
                <span>{previewSummary}</span>
              </div>
              <div className="rw-cv-card-preview-tags">
                {skills.length ? skills.map((skill) => <span key={skill}>{skill}</span>) : <span>Chưa có kỹ năng</span>}
              </div>
            </div>
          </>
        )}

        <div className="rw-cv-card-preview-badge-row">
          <span className="rw-badge rw-badge-white">{isUpload ? "Upload" : "Tạo từ mẫu"}</span>
          {!isUpload ? <span className={`rw-badge rw-cv-variant-badge rw-cv-variant-badge--${variant}`}>{variant.toUpperCase()}</span> : null}
          {resume.is_primary ? <span className="rw-badge rw-badge-blue">CV chính</span> : null}
        </div>
      </div>

      <div className="rw-cv-card-body">
        <div className="rw-cv-card-head">
          <div>
            <h4>{resume.title}</h4>
            <p>{template.name || resume.template_name || (isUpload ? resume.original_filename : "Chưa chọn template")}</p>
          </div>
          <div className="rw-cv-card-head-meta">
            <span className={resume.is_primary ? "rw-badge rw-badge-blue" : "rw-badge rw-badge-slate"}>
              {resume.is_primary ? "CV chính" : "CV đã lưu"}
            </span>
            <span className="rw-cv-card-date">{formatDate(resume.updated_at)}</span>
          </div>
        </div>

        <div className="rw-cv-card-meta">
          <span>{isUpload ? "Upload PDF" : "Tạo từ mẫu"}</span>
          <span>{resume.file_ext || (isUpload ? ".pdf" : "pdf")}</span>
          <span>{tags.length ? tags.join(" · ") : "Chưa gán tag"}</span>
        </div>

        <div className="rw-cv-card-actions">
          <button type="button" className="rw-btn-outline-lg rw-btn-outline-lg--ghost" onClick={() => onPreview?.(resume)}>
            Xem
          </button>
          <button type="button" className="rw-btn-outline-lg rw-btn-outline-lg--ghost" onClick={() => onEdit?.(resume)}>
            Sửa
          </button>
          <button type="button" className="rw-btn-outline-lg rw-btn-outline-lg--ghost" onClick={() => onDownload?.(resume)}>
            Tải PDF
          </button>
          {!resume.is_primary ? (
            <button type="button" className="rw-btn-outline-lg" onClick={() => onSetPrimary?.(resume)}>
              Đặt làm CV chính
            </button>
          ) : null}
          <button type="button" className="rw-btn-danger" onClick={() => onDelete?.(resume)}>
            Xóa
          </button>
        </div>
      </div>
    </article>
  );
}
