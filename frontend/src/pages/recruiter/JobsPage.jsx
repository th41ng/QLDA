import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";

const DEFAULT_FORM = {
  title: "",
  summary: "",
  description: "",
  responsibilities: "",
  requirements: "",
  location: "",
  status: "published",
};

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "draft", label: "Nháp" },
  { value: "published", label: "Đang đăng" },
  { value: "closed", label: "Đã đóng" },
];

export default function RecruiterJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [viewingJob, setViewingJob] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const loadJobs = async (status = statusFilter) => {
    setLoading(true);
    setError("");
    try {
      const suffix = status && status !== "all" ? `?status=${status}` : "";
      const data = await api.jobs.mine(suffix);
      setJobs(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setJobs([]);
      setError(loadError.message || "Không thể tải danh sách bài tuyển dụng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs(statusFilter);
  }, [statusFilter]);

  const locationOptions = useMemo(() => {
    const values = [...new Set(jobs.map((job) => job.location).filter(Boolean))];
    return values.sort((left, right) => left.localeCompare(right, "vi"));
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const keyword = normalize(query);
    return jobs.filter((job) => {
      const haystack = normalize([job.title, job.summary, job.location, job.description].join(" "));
      const locationMatches = locationFilter === "all" || (job.location || "") === locationFilter;
      return (!keyword || haystack.includes(keyword)) && locationMatches;
    });
  }, [jobs, locationFilter, query]);

  const openCreateForm = () => {
    setEditingJobId(null);
    setForm(DEFAULT_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (job) => {
    setEditingJobId(job.id);
    setForm({
      title: job.title || "",
      summary: job.summary || "",
      description: job.description || "",
      responsibilities: job.responsibilities || "",
      requirements: job.requirements || "",
      location: job.location || "",
      status: job.status || "published",
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingJobId(null);
    setForm(DEFAULT_FORM);
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitForm = async (statusOverride) => {
    const payload = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      description: form.description.trim(),
      responsibilities: form.responsibilities.trim(),
      requirements: form.requirements.trim(),
      location: form.location.trim(),
      status: statusOverride || form.status,
    };

    try {
      setSubmitting(true);
      setMessage("");
      if (editingJobId) {
        await api.jobs.update(editingJobId, payload);
        setMessage("Đã cập nhật bài tuyển dụng.");
      } else {
        await api.jobs.create(payload);
        setMessage(payload.status === "draft" ? "Đã lưu bài tuyển dụng ở trạng thái nháp." : "Đã đăng bài tuyển dụng.");
      }
      closeForm();
      loadJobs(statusFilter);
    } catch (submitError) {
      setMessage(submitError.message || "Không thể lưu bài tuyển dụng.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (job) => {
    const confirmed = window.confirm(`Xóa bài tuyển dụng \"${job.title}\"?`);
    if (!confirmed) return;

    try {
      await api.jobs.delete(job.id);
      setMessage("Đã xóa bài tuyển dụng.");
      if (viewingJob?.id === job.id) setViewingJob(null);
      loadJobs(statusFilter);
    } catch (deleteError) {
      setMessage(deleteError.message || "Không thể xóa bài tuyển dụng.");
    }
  };

  const handleStatusChange = async (job, nextStatus) => {
    if (!nextStatus || nextStatus === job.status) return;
    try {
      await api.jobs.update(job.id, { status: nextStatus });
      setMessage("Đã cập nhật trạng thái bài tuyển dụng.");
      if (viewingJob?.id === job.id) {
        setViewingJob((current) => (current ? { ...current, status: nextStatus } : current));
      }
      loadJobs(statusFilter);
    } catch (statusError) {
      setMessage(statusError.message || "Không thể cập nhật trạng thái.");
    }
  };

  return (
    <div className="landing-page recruiter-jobs-page">
      <section className="landing-section panel rw-card-lg">
        <div className="rw-hero-layout">
          <div className="rw-hero-text">
            <span className="eyebrow">Recruiter workspace</span>
            <h1 className="rw-heading-xl">Quản lý bài tuyển dụng</h1>
            <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", lineHeight: "1.75rem", color: "#475569" }}>
              Tạo, chỉnh sửa và theo dõi các bài đăng tuyển dụng của công ty. Giao diện ưu tiên thao tác nhanh, rõ trạng thái và dễ rà lại nội dung.
            </p>
          </div>
          <button type="button" className="btn" onClick={openCreateForm}>
            + Đăng tuyển dụng
          </button>
        </div>
      </section>

      <section className="landing-section panel rw-card">
        <div className="rw-filter-grid">
          <label className="rw-field">
            <span className="rw-label-sm">Tìm theo tiêu đề</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nhập tiêu đề bài tuyển dụng"
              className="rw-input"
            />
          </label>
          <label className="rw-field">
            <span className="rw-label-sm">Lọc theo location</span>
            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              className="rw-input"
            >
              <option value="all">Tất cả location</option>
              {locationOptions.map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </label>
          <label className="rw-field">
            <span className="rw-label-sm">Lọc theo status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rw-input"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {message ? <div className="rw-alert-info">{message}</div> : null}

      {loading ? <StateCard title="Đang tải bài tuyển dụng" description="Hệ thống đang lấy danh sách bài đăng của công ty." /> : null}
      {!loading && error ? <StateCard title="Không thể tải dữ liệu" description={error} tone="error" /> : null}
      {!loading && !error && !filteredJobs.length ? <StateCard title="Chưa có bài tuyển dụng phù hợp" description="Thử thay đổi bộ lọc hoặc tạo bài tuyển dụng mới để bắt đầu." tone="empty" /> : null}

      {!loading && !error && filteredJobs.length ? (
        <section className="rw-jobs-grid">
          {filteredJobs.map((job) => (
            <article key={job.id} className="rw-job-article">
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="rw-job-header">
                  <div style={{ minWidth: 0 }}>
                    <div className="rw-job-title-wrap">
                      <h3 className="rw-truncate" style={{ fontSize: "1.25rem", fontWeight: 600, color: "#0f172a" }}>{job.title || "Chưa có tiêu đề"}</h3>
                      <StatusBadge status={job.status} />
                    </div>
                    <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", lineHeight: "1.5rem", color: "#475569" }}>{job.summary || "Chưa có tóm tắt cho bài tuyển dụng này."}</p>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <select
                      value={job.status || "draft"}
                      onChange={(event) => handleStatusChange(job, event.target.value)}
                      className="rw-input-sm"
                      style={{ height: "2.5rem" }}
                    >
                      {STATUS_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rw-meta-grid">
                  <MetaItem label="Location" value={job.location || "Chưa cập nhật"} />
                  <MetaItem label="Tạo lúc" value={formatDate(job.created_at)} />
                  <MetaItem label="Cập nhật" value={formatDate(job.updated_at)} />
                  <MetaItem label="Trạng thái" value={mapStatusLabel(job.status)} />
                </div>

                <div className="rw-job-actions">
                  <button type="button" className="rw-btn-outline" onClick={() => setViewingJob(job)}>Xem</button>
                  <button type="button" className="rw-btn-outline" onClick={() => openEditForm(job)}>Sửa</button>
                  <button type="button" className="rw-btn-danger" onClick={() => handleDelete(job)}>Xóa</button>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {isFormOpen ? (
        <JobFormModal
          form={form}
          editing={Boolean(editingJobId)}
          submitting={submitting}
          onClose={closeForm}
          onChange={updateField}
          onSubmit={() => submitForm()}
          onSaveDraft={() => submitForm("draft")}
        />
      ) : null}

      {viewingJob ? <JobDetailModal job={viewingJob} onClose={() => setViewingJob(null)} /> : null}
    </div>
  );
}

function JobFormModal({ form, editing, submitting, onClose, onChange, onSubmit, onSaveDraft }) {
  return (
    <div className="rw-modal-backdrop">
      <div className="rw-modal">
        <div className="rw-modal-head">
          <div>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: "#1d4ed8" }}>Recruiter editor</p>
            <h2 className="rw-heading-2xl">{editing ? "Chỉnh sửa bài tuyển dụng" : "Tạo bài tuyển dụng mới"}</h2>
            <p style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "#64748b" }}>Chỉ dùng các trường đang có trong API hiện tại để tránh lệch dữ liệu backend.</p>
          </div>
          <button type="button" className="rw-btn-close" onClick={onClose}>Đóng</button>
        </div>

        <form
          className="rw-modal-body"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <FormSection title="Thông tin cơ bản" description="Thiết lập tiêu đề, tóm tắt ngắn và location để bài đăng dễ scan hơn trong danh sách.">
            <div className="rw-grid-2">
              <Field label="Title">
                <input value={form.title} onChange={(event) => onChange("title", event.target.value)} placeholder="Ví dụ: Frontend Developer" />
              </Field>
              <Field label="Location">
                <input value={form.location} onChange={(event) => onChange("location", event.target.value)} placeholder="TP. Hồ Chí Minh" />
              </Field>
              <Field label="Summary" full>
                <textarea rows="3" value={form.summary} onChange={(event) => onChange("summary", event.target.value)} placeholder="Mô tả ngắn về vị trí để hiển thị ở danh sách bài tuyển dụng" />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Nội dung công việc" description="Tập trung vào mô tả công việc và trách nhiệm chính của vị trí đang tuyển.">
            <div style={{ display: "grid", gap: "1rem" }}>
              <Field label="Description">
                <textarea rows="6" value={form.description} onChange={(event) => onChange("description", event.target.value)} placeholder="Mô tả công việc chi tiết" />
              </Field>
              <Field label="Responsibilities">
                <textarea rows="5" value={form.responsibilities} onChange={(event) => onChange("responsibilities", event.target.value)} placeholder="Các đầu việc hoặc trách nhiệm chính" />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Yêu cầu ứng viên" description="Chỉ điền các yêu cầu đang được backend hỗ trợ qua trường requirements.">
            <Field label="Requirements">
              <textarea rows="6" value={form.requirements} onChange={(event) => onChange("requirements", event.target.value)} placeholder="Yêu cầu kỹ năng, kinh nghiệm hoặc điều kiện ứng tuyển" />
            </Field>
          </FormSection>

          <div className="rw-form-actions">
            {!editing ? (
              <button type="button" className="rw-btn-outline-lg" onClick={onSaveDraft}>Lưu nháp</button>
            ) : null}
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? "Đang lưu..." : editing ? "Cập nhật" : "Đăng job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JobDetailModal({ job, onClose }) {
  return (
    <div className="rw-modal-backdrop">
      <div className="rw-modal">
        <div className="rw-modal-head">
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#020617" }}>{job.title}</h2>
              <StatusBadge status={job.status} />
            </div>
            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#64748b" }}>{job.location || "Chưa cập nhật location"}</p>
          </div>
          <button type="button" className="rw-btn-close" onClick={onClose}>Đóng</button>
        </div>

        <div className="rw-modal-body">
          <DetailSection title="Summary" content={job.summary} />
          <DetailSection title="Description" content={job.description} />
          <DetailSection title="Responsibilities" content={job.responsibilities} />
          <DetailSection title="Requirements" content={job.requirements} />
          <section className="rw-card-subtle">
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>Thông tin hệ thống</h3>
            <div className="rw-meta-grid" style={{ marginTop: "0.75rem" }}>
              <MetaItem label="Location" value={job.location || "Chưa cập nhật"} />
              <MetaItem label="Status" value={mapStatusLabel(job.status)} />
              <MetaItem label="Tạo lúc" value={formatDate(job.created_at)} />
              <MetaItem label="Cập nhật" value={formatDate(job.updated_at)} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, description, children }) {
  return (
    <section className="rw-form-section">
      <div className="rw-section-divider">
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0f172a" }}>{title}</h3>
        <p style={{ marginTop: "0.25rem", fontSize: "0.875rem", lineHeight: "1.5rem", color: "#64748b" }}>{description}</p>
      </div>
      {children}
    </section>
  );
}

function DetailSection({ title, content }) {
  return (
    <section className="rw-card-subtle">
      <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>{title}</h3>
      <p className="rw-pre-wrap" style={{ marginTop: "0.75rem", fontSize: "0.875rem", lineHeight: "1.75rem", color: "#475569" }}>{content || "Chưa có nội dung"}</p>
    </section>
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

function MetaItem({ label, value }) {
  return (
    <div className="rw-meta-item">
      <span className="rw-muted-xs">{label}</span>
      <strong className="rw-meta-sm">{value}</strong>
    </div>
  );
}

function StateCard({ title, description, tone = "default" }) {
  const toneClass = tone === "error" ? "rw-state-error" : tone === "empty" ? "rw-state-empty" : "rw-state-default";
  return (
    <section className={toneClass}>
      <h3 style={{ fontSize: "1.125rem", fontWeight: 600 }}>{title}</h3>
      <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", lineHeight: "1.5rem" }}>{description}</p>
    </section>
  );
}

function StatusBadge({ status }) {
  const cls = status === "published" ? "rw-status-published" : status === "closed" ? "rw-status-closed" : "rw-status-draft";
  return <span className={cls}>{mapStatusLabel(status)}</span>;
}

function mapStatusLabel(status) {
  if (status === "published") return "Đang đăng";
  if (status === "closed") return "Đã đóng";
  return "Nháp";
}

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  try {
    return new Date(value).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Chưa cập nhật";
  }
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
