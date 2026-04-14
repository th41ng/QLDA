import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import { ROUTES } from "../../routes";
import {
  CURRENCY_OPTIONS,
  DEFAULT_JOB_FORM,
  EMPLOYMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  WORKPLACE_OPTIONS,
  buildJobFormFromJob,
  buildJobPayload,
  formatSalary,
  mapEmploymentLabel,
  mapExperienceLabel,
  mapStatusLabel,
  mapWorkplaceLabel,
  slugifyText,
} from "./jobWorkspaceData";

export default function RecruiterJobEditorPage() {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const isEditing = Boolean(jobId);

  const [company, setCompany] = useState(null);
  const [tags, setTags] = useState([]);
  const [form, setForm] = useState(DEFAULT_JOB_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const [companyData, tagsData, jobData] = await Promise.all([
          api.companies.me().catch(() => null),
          api.tags.list().catch(() => []),
          isEditing ? api.jobs.detail(jobId).catch(() => null) : Promise.resolve(null),
        ]);

        if (!mounted) return;

        const nextTags = Array.isArray(tagsData) ? tagsData : [];
        const nextJob = jobData || null;

        setCompany(companyData);
        setTags(nextTags);
        if (isEditing && !nextJob) {
          setForm({ ...DEFAULT_JOB_FORM });
          setMessage("Không tìm thấy tin tuyển dụng thật để chỉnh sửa.");
        } else {
          setForm(nextJob ? buildJobFormFromJob(nextJob) : { ...DEFAULT_JOB_FORM });
          setMessage("");
        }
      } catch {
        if (!mounted) return;
        setCompany(null);
        setTags([]);
        setForm({ ...DEFAULT_JOB_FORM });
        setMessage("Không thể tải dữ liệu thật từ database.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [isEditing, jobId]);

  const selectedTagIds = useMemo(() => new Set(form.tag_ids || []), [form.tag_ids]);
  const selectedTags = useMemo(() => tags.filter((tag) => selectedTagIds.has(tag.id)), [selectedTagIds, tags]);

  const preview = useMemo(
    () => ({
      title: form.title || "Tiêu đề job",
      summary: form.summary || "Tóm tắt công việc sẽ hiện ở đây.",
      location: form.location || "Chưa cập nhật",
      salary: formatSalary(form),
      workplace: mapWorkplaceLabel(form.workplace_type),
      employment: mapEmploymentLabel(form.employment_type),
      experience: mapExperienceLabel(form.experience_level),
      status: mapStatusLabel(form.status),
    }),
    [form],
  );

  const updateField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "title" && !current.slug) {
        next.slug = slugifyText(value);
      }
      return next;
    });
  };

  const toggleTag = (tagId) => {
    setForm((current) => {
      const currentIds = new Set(current.tag_ids || []);
      if (currentIds.has(tagId)) {
        currentIds.delete(tagId);
      } else {
        currentIds.add(tagId);
      }
      return { ...current, tag_ids: Array.from(currentIds) };
    });
  };

  const handleSubmit = async (nextStatus = form.status) => {
    const payload = buildJobPayload({ ...form, status: nextStatus });
    if (!payload.title || !payload.description || !payload.requirements || !payload.location) {
      setMessage("Vui lòng điền các trường bắt buộc: tiêu đề, mô tả, yêu cầu và địa điểm.");
      return;
    }
    if (!isEditing && !company?.id) {
      setMessage("Chưa có company thật từ database nên không thể tạo job.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      if (isEditing) {
        await api.jobs.update(jobId, payload);
        navigate(ROUTES.recruiter.jobs, { state: { flash: "Đã cập nhật tin tuyển dụng." } });
      } else {
        await api.jobs.create(payload);
        navigate(ROUTES.recruiter.jobs, { state: { flash: payload.status === "draft" ? "Đã lưu tin ở trạng thái nháp." : "Đã đăng tin tuyển dụng." } });
      }
    } catch (error) {
      setMessage(error.message || "Không thể lưu tin tuyển dụng.");
    } finally {
      setSubmitting(false);
    }
  };

  const tagSummary = tags.filter((tag) => selectedTagIds.has(tag.id)).slice(0, 4);

  return (
    <section className="recruiter-job-editor-page">
      <section className="recruiter-job-editor-hero rw-card-lg">
        <div>
          <span className="eyebrow">Recruiter workspace</span>
          <h1 className="rw-heading-xl">{isEditing ? "Chỉnh sửa tin tuyển dụng" : "Đăng tin tuyển dụng"}</h1>
          <p className="recruiter-job-editor-lead">
            Trang riêng cho việc tạo tin mới hoặc chỉnh sửa tin cũ, khớp với schema `job_postings` và chạy song song với luồng quản lý tin.
          </p>
        </div>
        <div className="recruiter-job-editor-actions">
          <Link className="rw-btn-outline-lg" to={ROUTES.recruiter.jobs}>
            Quay lại danh sách
          </Link>
          <button type="button" className="rw-btn-outline-lg" onClick={() => handleSubmit("draft")} disabled={submitting}>
            Lưu nháp
          </button>
          <button type="button" className="btn" onClick={() => handleSubmit("published")} disabled={submitting}>
            {submitting ? "Đang lưu..." : isEditing ? "Cập nhật tin" : "Đăng tin ngay"}
          </button>
        </div>
      </section>

      <section className="recruiter-job-editor-summary rw-card">
        <div className="recruiter-job-editor-summary-grid">
          <div className="recruiter-editor-summary-item">
            <span>Công ty</span>
            <strong>{company?.company_name || "Chưa có công ty"}</strong>
          </div>
          <div className="recruiter-editor-summary-item">
            <span>Trạng thái</span>
            <strong>{mapStatusLabel(form.status)}</strong>
          </div>
          <div className="recruiter-editor-summary-item">
            <span>Workplace</span>
            <strong>{mapWorkplaceLabel(form.workplace_type)}</strong>
          </div>
          <div className="recruiter-editor-summary-item">
            <span>Tags đã chọn</span>
            <strong>{selectedTags.length}</strong>
          </div>
          <div className="recruiter-editor-summary-item">
            <span>Lương</span>
            <strong>{preview.salary}</strong>
          </div>
          <div className="recruiter-editor-summary-item">
            <span>Loại hình</span>
            <strong>{mapEmploymentLabel(form.employment_type)}</strong>
          </div>
        </div>
      </section>

      {loading ? <div className="rw-alert-info">Đang nạp dữ liệu từ database.</div> : null}
      {message ? <div className="rw-alert-info">{message}</div> : null}

      <div className="recruiter-job-editor-layout">
        <form
          className="recruiter-job-editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <EditorSection
            title="Thông tin cơ bản"
            description="Tiêu đề, mô tả ngắn và slug là phần đầu tiên backend sẽ lưu vào `job_postings`."
          >
            <div className="recruiter-editor-grid">
              <Field label="Tiêu đề job" full>
                <input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Ví dụ: Frontend Developer React" />
              </Field>
              <Field label="Slug">
                <input value={form.slug} onChange={(event) => updateField("slug", event.target.value)} placeholder="tu-dong-hoac-tu-nhap" />
              </Field>
              <Field label="Địa điểm">
                <input value={form.location} onChange={(event) => updateField("location", event.target.value)} placeholder="TP. Hồ Chí Minh" />
              </Field>
              <Field label="Tóm tắt" full>
                <textarea rows="3" value={form.summary} onChange={(event) => updateField("summary", event.target.value)} placeholder="Mô tả ngắn sẽ hiển thị trên danh sách job" />
              </Field>
            </div>
          </EditorSection>

          <EditorSection
            title="Nội dung công việc"
            description="Ba khối chính backend đang lưu là `description`, `responsibilities` và `requirements`."
          >
            <div className="recruiter-editor-stack">
              <Field label="Mô tả công việc">
                <textarea rows="7" value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Mô tả chi tiết về vai trò và phạm vi công việc" />
              </Field>
              <Field label="Trách nhiệm">
                <textarea rows="6" value={form.responsibilities} onChange={(event) => updateField("responsibilities", event.target.value)} placeholder="Những đầu việc chính ứng viên sẽ đảm nhận" />
              </Field>
              <Field label="Yêu cầu ứng viên">
                <textarea rows="6" value={form.requirements} onChange={(event) => updateField("requirements", event.target.value)} placeholder="Kỹ năng, kinh nghiệm, công cụ..." />
              </Field>
            </div>
          </EditorSection>

          <EditorSection title="Chế độ làm việc và lương" description="Các field này đều có trong model `JobPosting` và serializer hiện tại.">
            <div className="recruiter-editor-grid">
              <Field label="Workplace type">
                <select value={form.workplace_type} onChange={(event) => updateField("workplace_type", event.target.value)}>
                  {WORKPLACE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Employment type">
                <select value={form.employment_type} onChange={(event) => updateField("employment_type", event.target.value)}>
                  {EMPLOYMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Experience level">
                <select value={form.experience_level} onChange={(event) => updateField("experience_level", event.target.value)}>
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Lương tối thiểu">
                <input type="number" min="0" value={form.salary_min} onChange={(event) => updateField("salary_min", event.target.value)} placeholder="12000000" />
              </Field>
              <Field label="Lương tối đa">
                <input type="number" min="0" value={form.salary_max} onChange={(event) => updateField("salary_max", event.target.value)} placeholder="18000000" />
              </Field>
              <Field label="Đơn vị tiền tệ">
                <select value={form.salary_currency} onChange={(event) => updateField("salary_currency", event.target.value)}>
                  {CURRENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Số lượng tuyển">
                <input type="number" min="1" value={form.vacancy_count} onChange={(event) => updateField("vacancy_count", event.target.value)} />
              </Field>
              <Field label="Deadline">
                <input type="date" value={form.deadline} onChange={(event) => updateField("deadline", event.target.value)} />
              </Field>
            </div>
          </EditorSection>

          <EditorSection title="Tags và trạng thái" description="Dữ liệu tag sẽ được gửi qua `tag_ids` đúng như backend đang nhận.">
            <div className="recruiter-editor-stack">
              <div className="recruiter-tag-grid">
                {tags.map((tag) => {
                  const active = selectedTagIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={active ? "recruiter-tag-chip recruiter-tag-chip--active" : "recruiter-tag-chip"}
                      onClick={() => toggleTag(tag.id)}
                    >
                      <strong>{tag.name}</strong>
                      <span>{tag.category_name || tag.category || "Tag"}</span>
                    </button>
                  );
                })}
              </div>
              <div className="recruiter-editor-grid">
                <Field label="Trạng thái">
                  <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                    <option value="draft">Nháp</option>
                    <option value="published">Đang đăng</option>
                    <option value="closed">Đã đóng</option>
                  </select>
                </Field>
                <Field label="Nổi bật">
                  <label className="recruiter-toggle">
                    <input type="checkbox" checked={Boolean(form.is_featured)} onChange={(event) => updateField("is_featured", event.target.checked)} />
                    <span>Đánh dấu tin nổi bật trên danh sách</span>
                  </label>
                </Field>
              </div>
            </div>
          </EditorSection>
        </form>

        <aside className="recruiter-job-editor-sidebar">
          <section className="recruiter-editor-sidecard">
            <div className="recruiter-editor-sidehead">
              <span className="rw-muted-xs--blue">Preview live</span>
              <h2 className="rw-heading-2xl">{preview.title}</h2>
              <p className="recruiter-editor-preview-summary">{preview.summary}</p>
            </div>
            <div className="recruiter-editor-preview-grid">
              <PreviewItem label="Công ty" value={company?.company_name || "Chưa có công ty"} />
              <PreviewItem label="Địa điểm" value={preview.location} />
              <PreviewItem label="Lương" value={preview.salary} />
              <PreviewItem label="Workplace" value={preview.workplace} />
              <PreviewItem label="Loại hình" value={preview.employment} />
              <PreviewItem label="Kinh nghiệm" value={preview.experience} />
              <PreviewItem label="Trạng thái" value={preview.status} />
              <PreviewItem label="Deadline" value={form.deadline ? form.deadline : "Chưa chọn"} />
            </div>
          </section>

          <section className="recruiter-editor-sidecard">
            <div className="recruiter-editor-sidehead">
              <span className="rw-muted-xs--blue">Dữ liệu khớp DB</span>
              <h3 className="rw-heading-2xl">Checklist</h3>
            </div>
            <ul className="recruiter-editor-checklist">
              <li>Tiêu đề, mô tả, yêu cầu và trách nhiệm đều map vào `job_postings`.</li>
              <li>Lương, deadline, số lượng tuyển và trạng thái đi đúng field backend.</li>
              <li>Tags được gửi qua `tag_ids` để backend gắn quan hệ many-to-many.</li>
              <li>Công ty được lấy từ `/companies/me`, đúng với rule tạo job hiện tại.</li>
            </ul>
          </section>

          {tagSummary.length ? (
            <section className="recruiter-editor-sidecard">
              <div className="recruiter-editor-sidehead">
                <span className="rw-muted-xs--blue">Tags đã chọn</span>
                <h3 className="rw-heading-2xl">{tagSummary.length}</h3>
              </div>
              <div className="rw-resume-chip-row">
                {tagSummary.map((tag) => (
                  <span key={tag.id} className="rw-resume-chip">{tag.name}</span>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function EditorSection({ title, description, children }) {
  return (
    <section className="recruiter-editor-section rw-card">
      <div className="recruiter-editor-section-head">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, full }) {
  return (
    <label className={full ? "recruiter-editor-field recruiter-editor-field--full" : "recruiter-editor-field"}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function PreviewItem({ label, value }) {
  return (
    <div className="recruiter-editor-preview-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
