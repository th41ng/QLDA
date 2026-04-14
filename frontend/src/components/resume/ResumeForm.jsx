export default function ResumeForm({
  values,
  onChange,
  onSaveDraft,
  onPreview,
  onSubmit,
  saving,
  editingTitle,
  templates = [],
  lockTemplate = false,
  submitLabel,
}) {
  return (
    <form
      className="rw-form-stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <section className="rw-card rw-form-section-card">
        <div className="rw-flex-between rw-form-section-head">
          <div>
            <h3 className="rw-form-section-title">{editingTitle || "Tạo CV từ dữ liệu thật"}</h3>
            <p className="rw-form-section-desc">
              Điền thông tin cơ bản, chọn một mẫu PDF thật, rồi hệ thống sẽ tạo CV và xuất file cho bạn.
            </p>
          </div>
          <span className="rw-badge rw-badge-blue">Candidate CV</span>
        </div>

        <SectionTitle title="Thông tin cá nhân" description="Dữ liệu thật lấy từ tài khoản và hồ sơ ứng viên." />
        <div className="rw-grid-2">
          <Field label="Họ và tên">
            <input value={values.full_name} onChange={(event) => onChange("full_name", event.target.value)} placeholder="Nguyễn Văn A" />
          </Field>
          <Field label="Email">
            <input value={values.email} onChange={(event) => onChange("email", event.target.value)} placeholder="email@domain.com" />
          </Field>
          <Field label="Số điện thoại">
            <input value={values.phone} onChange={(event) => onChange("phone", event.target.value)} placeholder="0912 345 678" />
          </Field>
          {!lockTemplate ? (
            <Field label="Mẫu CV">
              <select value={values.template_slug || values.template_name || ""} onChange={(event) => onChange("template_slug", event.target.value)}>
                <option value="">Chọn template</option>
                {templates.map((template) => (
                  <option key={template.id || template.slug || template.name} value={template.slug || template.name}>
                    {template.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Mẫu CV">
              <input value={values.template_name || "Chưa chọn"} disabled />
            </Field>
          )}
        </div>
      </section>

      <section className="rw-card rw-form-section-card">
        <SectionTitle title="Thông tin nghề nghiệp" description="Các trường này giúp tạo ra CV phù hợp với template đã chọn." />
        <div className="rw-grid-2">
          <Field label="Headline" full>
            <input value={values.headline} onChange={(event) => onChange("headline", event.target.value)} placeholder="Frontend Developer | React | 2 năm kinh nghiệm" />
          </Field>
          <Field label="Chức danh hiện tại">
            <input value={values.current_title} onChange={(event) => onChange("current_title", event.target.value)} placeholder="Frontend Developer" />
          </Field>
          <Field label="Số năm kinh nghiệm">
            <input type="number" min="0" step="1" value={values.years_experience ?? 0} onChange={(event) => onChange("years_experience", event.target.value)} placeholder="2" />
          </Field>
          <Field label="Khu vực mong muốn">
            <input value={values.desired_location} onChange={(event) => onChange("desired_location", event.target.value)} placeholder="TP. Hồ Chí Minh / Remote" />
          </Field>
          <Field label="Mức lương mong muốn">
            <input value={values.expected_salary} onChange={(event) => onChange("expected_salary", event.target.value)} placeholder="18,000,000 VND" />
          </Field>
          <Field label="Ngày sinh">
            <input type="date" value={values.dob || ""} onChange={(event) => onChange("dob", event.target.value)} />
          </Field>
          <Field label="Giới tính">
            <select value={values.gender || ""} onChange={(event) => onChange("gender", event.target.value)}>
              <option value="">Chọn giới tính</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </Field>
          <Field label="Địa chỉ">
            <input value={values.address} onChange={(event) => onChange("address", event.target.value)} placeholder="TP. Hồ Chí Minh" />
          </Field>
        </div>
      </section>

      <section className="rw-card rw-form-section-card">
        <SectionTitle title="Nội dung CV" description="Nội dung này sẽ được đẩy lên PDF và có thể chỉnh sửa trước khi xuất file." />
        <Field label="Tóm tắt bản thân">
          <textarea rows="5" value={values.summary} onChange={(event) => onChange("summary", event.target.value)} placeholder="Giới thiệu ngắn về kinh nghiệm, thế mạnh và mục tiêu nghề nghiệp..." />
        </Field>
        <Field label="Kỹ năng" full>
          <input value={values.skills} onChange={(event) => onChange("skills", event.target.value)} placeholder="React, JavaScript, CSS, REST API" />
        </Field>
        <Field label="Kinh nghiệm">
          <textarea rows="6" value={values.experience} onChange={(event) => onChange("experience", event.target.value)} placeholder="Frontend Developer | ABC Company | 2023-2025..." />
        </Field>
        <Field label="Học vấn">
          <textarea rows="5" value={values.education} onChange={(event) => onChange("education", event.target.value)} placeholder="Đại học..., chuyên ngành..., chứng chỉ..." />
        </Field>
        <Field label="Thông tin thêm">
          <textarea rows="4" value={values.additional_info || ""} onChange={(event) => onChange("additional_info", event.target.value)} placeholder="Link portfolio, github, chứng chỉ, giải thưởng hoặc ghi chú thêm..." />
        </Field>
      </section>

      <section className="rw-card rw-form-section-card">
        <div className="rw-flex-between rw-form-footer-row">
          <label className="rw-toggle-field">
            <input type="checkbox" checked={Boolean(values.is_primary)} onChange={(event) => onChange("is_primary", event.target.checked)} />
            <span>Đặt CV này làm CV chính</span>
          </label>
          <span className="rw-badge rw-badge-white">Lưu vào database</span>
        </div>
      </section>

      <div className="rw-form-actions">
        <button type="button" className="rw-btn-outline-lg" onClick={onSaveDraft}>
          Lưu nháp
        </button>
        <button type="button" className="rw-btn-preview" onClick={onPreview}>
          Xem trước
        </button>
        <button type="submit" className="btn" disabled={saving}>
          {saving ? "Đang lưu..." : submitLabel || "Tạo / cập nhật CV"}
        </button>
      </div>
    </form>
  );
}

function SectionTitle({ title, description }) {
  return (
    <div className="rw-section-divider">
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <label className={full ? "rw-field-full" : "rw-field"}>
      <span className="rw-label-sm">{label}</span>
      {children}
    </label>
  );
}
