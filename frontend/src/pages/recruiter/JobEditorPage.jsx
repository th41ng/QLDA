import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import { ROUTES } from "../../routes";
import {
  CURRENCY_OPTIONS,
  DEFAULT_JOB_FORM,
  EDUCATION_OPTIONS,
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

// Validation rules
const VALIDATION_RULES = {
  title: { maxLength: 180, minLength: 5 },
  slug: { maxLength: 220 },
  summary: { maxLength: 255 },
  description: { minLength: 20 },
  requirements: { minLength: 20 },
  responsibilities: { minLength: 20 },
  location: { minLength: 3 },
};

export default function RecruiterJobEditorPage() {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const isEditing = Boolean(jobId);

  const [company, setCompany] = useState(null);
  const [tags, setTags] = useState([]);
  const [form, setForm] = useState(DEFAULT_JOB_FORM);
  const [originalForm, setOriginalForm] = useState(DEFAULT_JOB_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info"); // "info", "success", "error"
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({}); // Track which fields have been touched

  // Check if form has unsaved changes
  const hasChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(originalForm), [form, originalForm]);

  // Validation function
  const validateField = useCallback((fieldName, value) => {
    const rules = VALIDATION_RULES[fieldName];
    if (!rules) return null;

    const strValue = String(value || "").trim();

    if (fieldName === "title" || fieldName === "description" || fieldName === "requirements" || fieldName === "responsibilities") {
      if (rules.minLength && strValue.length > 0 && strValue.length < rules.minLength) {
        return `Tối thiểu ${rules.minLength} ký tự`;
      }
      if (rules.maxLength && strValue.length > rules.maxLength) {
        return `Tối đa ${rules.maxLength} ký tự`;
      }
    } else if (fieldName === "location") {
      if (rules.minLength && strValue.length > 0 && strValue.length < rules.minLength) {
        return `Vui lòng nhập địa điểm hợp lệ`;
      }
    }

    return null;
  }, []);

  // Validate form
  const validateForm = useCallback((formData = form) => {
    const newErrors = {};

    // Required fields
    if (!formData.title?.trim()) newErrors.title = "Tiêu đề không được để trống";
    if (!formData.description?.trim()) newErrors.description = "Mô tả công việc không được để trống";
    if (!formData.requirements?.trim()) newErrors.requirements = "Yêu cầu ứng viên không được để trống";
    if (!formData.location?.trim()) newErrors.location = "Địa điểm không được để trống";

    // Validate field lengths
    Object.entries(formData).forEach(([key, value]) => {
      if (!newErrors[key]) {
        const error = validateField(key, value);
        if (error) newErrors[key] = error;
      }
    });

    // Salary validation
    if (formData.salary_min && formData.salary_max) {
      const min = Number(formData.salary_min);
      const max = Number(formData.salary_max);
      if (min > max) {
        newErrors.salary_min = "Lương tối thiểu không được lớn hơn lương tối đa";
      }
    }

    // Deadline validation - no past dates
    if (formData.deadline) {
      const deadline = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadline < today) {
        newErrors.deadline = "Deadline không được là ngày trong quá khứ";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form, validateField]);

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "Bạn có thay đổi chưa lưu. Bạn chắc chắn muốn rời khỏi?";
        return "Bạn có thay đổi chưa lưu. Bạn chắc chắn muốn rời khỏi?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

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
          setOriginalForm({ ...DEFAULT_JOB_FORM });
          setMessage("Không tìm thấy tin tuyển dụng để chỉnh sửa.");
          setMessageType("error");
        } else {
          const formData = nextJob ? buildJobFormFromJob(nextJob) : { ...DEFAULT_JOB_FORM };
          setForm(formData);
          setOriginalForm(formData);
          setMessage("");
        }
      } catch (error) {
        if (!mounted) return;
        setCompany(null);
        setTags([]);
        const formData = { ...DEFAULT_JOB_FORM };
        setForm(formData);
        setOriginalForm(formData);
        const errorMessage = error?.message || "Không thể tải dữ liệu từ database.";
        setMessage(errorMessage);
        setMessageType("error");
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
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleFieldBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, form[field]);
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
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
    // Validate form before submit
    if (!validateForm({ ...form, status: nextStatus })) {
      setMessage("Vui lòng sửa các lỗi trên biểu mẫu trước khi lưu.");
      setMessageType("error");
      return;
    }

    const payload = buildJobPayload({ ...form, status: nextStatus });
    
    if (!isEditing && !company?.id) {
      setMessage("Chưa có công ty từ database nên không thể tạo job.");
      setMessageType("error");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      if (isEditing) {
        await api.jobs.update(jobId, payload);
        setOriginalForm({ ...form, status: nextStatus });
        setMessage("✓ Đã cập nhật tin tuyển dụng thành công.");
        setMessageType("success");
        setTimeout(() => {
          navigate(ROUTES.recruiter.jobs, { state: { flash: "Đã cập nhật tin tuyển dụng." } });
        }, 800);
      } else {
        const result = await api.jobs.create(payload);
        setOriginalForm({ ...form, status: nextStatus });
        setMessage("✓ Đã " + (nextStatus === "draft" ? "lưu tin ở trạng thái nháp" : "đăng tin tuyển dụng") + " thành công.");
        setMessageType("success");
        setTimeout(() => {
          navigate(ROUTES.recruiter.jobs, { 
            state: { 
              flash: nextStatus === "draft" ? "Đã lưu tin ở trạng thái nháp." : "Đã đăng tin tuyển dụng thành công." 
            } 
          });
        }, 800);
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.message || error?.message || "Không thể lưu tin tuyển dụng. Vui lòng thử lại.";
      setMessage(errorMsg);
      setMessageType("error");
      console.error("Job submission error:", error);
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
          <h1 className="rw-heading-xl">
            {isEditing ? "Chỉnh sửa tin tuyển dụng" : "Đăng tin tuyển dụng"}
            {hasChanges && <span className="unsaved-indicator" title="Có thay đổi chưa lưu">*</span>}
          </h1>
          <p className="recruiter-job-editor-lead">
            {isEditing 
              ? "Cập nhật thông tin tin tuyển dụng của bạn. Tất cả thay đổi sẽ được lưu vào database."
              : "Tạo tin tuyển dụng mới. Điền đầy đủ thông tin bắt buộc trước khi đăng."
            }
          </p>
        </div>
        <div className="recruiter-job-editor-actions">
          <Link 
            className="rw-btn-outline-lg" 
            to={ROUTES.recruiter.jobs}
            onClick={(e) => {
              if (hasChanges && !window.confirm("Bạn có thay đổi chưa lưu. Bạn chắc chắn muốn rời khỏi?")) {
                e.preventDefault();
              }
            }}
          >
            Quay lại danh sách
          </Link>
          <button 
            type="button" 
            className="rw-btn-outline-lg" 
            onClick={() => handleSubmit("draft")} 
            disabled={submitting || loading}
            title={loading ? "Đang tải dữ liệu..." : "Lưu tin ở trạng thái nháp"}
          >
            Lưu nháp
          </button>
          <button 
            type="button" 
            className="btn" 
            onClick={() => handleSubmit("published")} 
            disabled={submitting || loading}
            title={loading ? "Đang tải dữ liệu..." : isEditing ? "Cập nhật tin tuyển dụng" : "Đăng tin ngay lập tức"}
          >
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

      {loading ? <div className="rw-alert-info">Đang nạp dữ liệu từ database...</div> : null}
      {message && (
        <div className={`rw-alert-${messageType}`} role="alert">
          {message}
        </div>
      )}

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
              <Field label="Tiêu đề job *" error={errors.title && touched.title} hint="5-180 ký tự">
                <input 
                  value={form.title} 
                  onChange={(event) => updateField("title", event.target.value)}
                  onBlur={() => handleFieldBlur("title")}
                  placeholder="Ví dụ: Frontend Developer React" 
                  maxLength="180"
                  aria-required="true"
                  aria-invalid={!!(errors.title && touched.title)}
                  aria-describedby={errors.title && touched.title ? "title-error" : undefined}
                />
                <div className="field-meta">
                  <span className="char-count">{form.title.length}/180</span>
                  {errors.title && touched.title && <span className="field-error" id="title-error">{errors.title}</span>}
                </div>
              </Field>
              <Field label="Slug" hint="Tự động tạo hoặc tùy chỉnh">
                <input 
                  value={form.slug} 
                  onChange={(event) => updateField("slug", event.target.value)}
                  onBlur={() => handleFieldBlur("slug")}
                  placeholder="tu-dong-hoac-tu-nhap" 
                  maxLength="220"
                  aria-describedby="slug-hint"
                />
                <div className="field-meta">
                  <span className="char-count">{form.slug.length}/220</span>
                </div>
              </Field>
              <Field label="Địa điểm *" error={errors.location && touched.location} hint="Thành phố hoặc quốc gia">
                <input 
                  value={form.location} 
                  onChange={(event) => updateField("location", event.target.value)}
                  onBlur={() => handleFieldBlur("location")}
                  placeholder="TP. Hồ Chí Minh" 
                  aria-required="true"
                  aria-invalid={!!(errors.location && touched.location)}
                  aria-describedby={errors.location && touched.location ? "location-error" : undefined}
                />
                {errors.location && touched.location && <span className="field-error" id="location-error">{errors.location}</span>}
              </Field>
              <Field label="Tóm tắt *" full error={errors.summary && touched.summary} hint="255 ký tự tối đa">
                <textarea 
                  rows="3" 
                  value={form.summary} 
                  onChange={(event) => updateField("summary", event.target.value)}
                  onBlur={() => handleFieldBlur("summary")}
                  placeholder="Mô tả ngắn sẽ hiển thị trên danh sách job" 
                  maxLength="255"
                  aria-required="true"
                  aria-invalid={!!(errors.summary && touched.summary)}
                  aria-describedby={errors.summary && touched.summary ? "summary-error" : undefined}
                />
                <div className="field-meta">
                  <span className="char-count">{form.summary.length}/255</span>
                  {errors.summary && touched.summary && <span className="field-error" id="summary-error">{errors.summary}</span>}
                </div>
              </Field>
            </div>
          </EditorSection>

          <EditorSection
            title="Nội dung công việc"
            description="Ba khối chính backend đang lưu là `description`, `responsibilities` và `requirements`. Điền đầy đủ để thu hút ứng viên phù hợp."
          >
            <div className="recruiter-editor-stack">
              <Field label="Mô tả công việc *" error={errors.description && touched.description} hint="Tối thiểu 20 ký tự">
                <textarea 
                  rows="7" 
                  value={form.description} 
                  onChange={(event) => updateField("description", event.target.value)}
                  onBlur={() => handleFieldBlur("description")}
                  placeholder="Mô tả chi tiết về vai trò và phạm vi công việc" 
                  aria-required="true"
                  aria-invalid={!!(errors.description && touched.description)}
                  aria-describedby={errors.description && touched.description ? "description-error" : undefined}
                />
                <div className="field-meta">
                  <span className="word-count">~{Math.ceil(form.description.split(/\s+/).filter(w => w).length)} từ</span>
                  {errors.description && touched.description && <span className="field-error" id="description-error">{errors.description}</span>}
                </div>
              </Field>
              <Field label="Trách nhiệm *" error={errors.responsibilities && touched.responsibilities} hint="Tối thiểu 20 ký tự">
                <textarea 
                  rows="6" 
                  value={form.responsibilities} 
                  onChange={(event) => updateField("responsibilities", event.target.value)}
                  onBlur={() => handleFieldBlur("responsibilities")}
                  placeholder="Những đầu việc chính ứng viên sẽ đảm nhận"
                  aria-required="true"
                  aria-invalid={!!(errors.responsibilities && touched.responsibilities)}
                  aria-describedby={errors.responsibilities && touched.responsibilities ? "responsibilities-error" : undefined}
                />
                <div className="field-meta">
                  <span className="word-count">~{Math.ceil(form.responsibilities.split(/\s+/).filter(w => w).length)} từ</span>
                  {errors.responsibilities && touched.responsibilities && <span className="field-error" id="responsibilities-error">{errors.responsibilities}</span>}
                </div>
              </Field>
              <Field label="Yêu cầu ứng viên *" error={errors.requirements && touched.requirements} hint="Tối thiểu 20 ký tự">
                <textarea 
                  rows="6" 
                  value={form.requirements} 
                  onChange={(event) => updateField("requirements", event.target.value)}
                  onBlur={() => handleFieldBlur("requirements")}
                  placeholder="Kỹ năng, kinh nghiệm, công cụ..." 
                  aria-required="true"
                  aria-invalid={!!(errors.requirements && touched.requirements)}
                  aria-describedby={errors.requirements && touched.requirements ? "requirements-error" : undefined}
                />
                <div className="field-meta">
                  <span className="word-count">~{Math.ceil(form.requirements.split(/\s+/).filter(w => w).length)} từ</span>
                  {errors.requirements && touched.requirements && <span className="field-error" id="requirements-error">{errors.requirements}</span>}
                </div>
              </Field>
              <Field label="Phúc lợi" hint="Mỗi dòng một mục — VD: Thưởng hiệu suất, Bảo hiểm sức khoẻ, Laptop">
                <textarea
                  rows="5"
                  value={form.benefits}
                  onChange={(event) => updateField("benefits", event.target.value)}
                  placeholder="Thưởng hiệu suất hàng quý
Bảo hiểm sức khoẻ cao cấp
Laptop + thiết bị công việc
Lịch làm việc linh hoạt
..."
                />
                <div className="field-meta">
                  <span className="word-count">~{Math.ceil((form.benefits || "").split(/\n/).filter(l => l.trim()).length)} mục</span>
                </div>
              </Field>
              <Field label="Yêu cầu học vấn">
                <select
                  value={form.education_level}
                  onChange={(event) => updateField("education_level", event.target.value)}
                >
                  {EDUCATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </EditorSection>

          <EditorSection title="Chế độ làm việc và lương" description="Các field này đều có trong model `JobPosting` và serializer hiện tại.">
            <div className="recruiter-editor-grid">
              <Field label="Workplace type">
                <select 
                  value={form.workplace_type} 
                  onChange={(event) => updateField("workplace_type", event.target.value)}
                  aria-label="Loại hình nơi làm việc"
                >
                  {WORKPLACE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Employment type">
                <select 
                  value={form.employment_type} 
                  onChange={(event) => updateField("employment_type", event.target.value)}
                  aria-label="Loại hình hợp đồng"
                >
                  {EMPLOYMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Experience level">
                <select 
                  value={form.experience_level} 
                  onChange={(event) => updateField("experience_level", event.target.value)}
                  aria-label="Cấp độ kinh nghiệm"
                >
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Lương tối thiểu" error={errors.salary_min && touched.salary_min} hint="Để trống nếu không công bố">
                <input 
                  type="number" 
                  min="0" 
                  value={form.salary_min} 
                  onChange={(event) => updateField("salary_min", event.target.value)}
                  onBlur={() => handleFieldBlur("salary_min")}
                  placeholder="12000000"
                  aria-describedby={errors.salary_min && touched.salary_min ? "salary_min-error" : undefined}
                />
                {errors.salary_min && touched.salary_min && <span className="field-error" id="salary_min-error">{errors.salary_min}</span>}
              </Field>
              <Field label="Lương tối đa" error={errors.salary_max && touched.salary_max} hint="Để trống nếu không công bố">
                <input 
                  type="number" 
                  min="0" 
                  value={form.salary_max} 
                  onChange={(event) => updateField("salary_max", event.target.value)}
                  onBlur={() => handleFieldBlur("salary_max")}
                  placeholder="18000000"
                  aria-describedby={errors.salary_max && touched.salary_max ? "salary_max-error" : undefined}
                />
                {errors.salary_max && touched.salary_max && <span className="field-error" id="salary_max-error">{errors.salary_max}</span>}
              </Field>
              <Field label="Đơn vị tiền tệ">
                <select 
                  value={form.salary_currency} 
                  onChange={(event) => updateField("salary_currency", event.target.value)}
                  aria-label="Đơn vị tiền tệ"
                >
                  {CURRENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Số lượng tuyển" hint="Ít nhất 1 vị trí">
                <input 
                  type="number" 
                  min="1" 
                  value={form.vacancy_count} 
                  onChange={(event) => updateField("vacancy_count", event.target.value)}
                  aria-label="Số lượng vị trí tuyển dụng"
                />
              </Field>
              <Field label="Deadline" error={errors.deadline && touched.deadline} hint="Ngày hết hạn tiếp nhận hồ sơ">
                <input 
                  type="date" 
                  value={form.deadline} 
                  onChange={(event) => updateField("deadline", event.target.value)}
                  onBlur={() => handleFieldBlur("deadline")}
                  aria-describedby={errors.deadline && touched.deadline ? "deadline-error" : undefined}
                />
                {errors.deadline && touched.deadline && <span className="field-error" id="deadline-error">{errors.deadline}</span>}
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

function Field({ label, children, full, error, hint }) {
  return (
    <label className={`recruiter-editor-field ${full ? "recruiter-editor-field--full" : ""} ${error ? "recruiter-editor-field--error" : ""}`}>
      <div className="field-label-row">
        <span>{label}</span>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
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
