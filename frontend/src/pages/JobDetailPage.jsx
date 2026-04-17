import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { ROUTES } from "../routes";
import { useAuth } from "../context/AuthContext";
import { Skeleton, SkeletonText } from "../components/Skeleton";

export default function JobDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [form, setForm] = useState({ resume_id: "", cover_letter: "" });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [applying, setApplying] = useState(false);
  const [existingApplication, setExistingApplication] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoadingJob(true);
      setMessage("");

      try {
        const detail = await api.jobs.detail(id);
        if (!mounted) return;
        setJob(detail);
      } catch {
        if (!mounted) return;
        setJob(null);
      } finally {
        if (mounted) setLoadingJob(false);
      }

      if (user?.role !== "candidate") {
        if (!mounted) return;
        setResumes([]);
        setExistingApplication(null);
        setLoadingResumes(false);
        return;
      }

      setLoadingResumes(true);
      try {
        const [resumeList, checkResult] = await Promise.all([
          api.resumes.list(),
          api.applications.checkForJob(id),
        ]);
        if (!mounted) return;

        const normalizedResumes = Array.isArray(resumeList) ? resumeList : [];
        setResumes(normalizedResumes);

        const appliedApplication = checkResult?.application || null;
        setExistingApplication(appliedApplication);
        if (appliedApplication?.resume_id) {
          setForm((prev) => ({
            ...prev,
            resume_id: String(appliedApplication.resume_id),
            cover_letter: appliedApplication.cover_letter || prev.cover_letter,
          }));
        } else if (normalizedResumes.length) {
          const primaryResume = normalizedResumes.find((resume) => resume.is_primary) || normalizedResumes[0];
          setForm((prev) => ({ ...prev, resume_id: String(primaryResume.id) }));
        }
      } catch {
        if (!mounted) return;
        setResumes([]);
        setExistingApplication(null);
      } finally {
        if (mounted) setLoadingResumes(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [id, user]);

  const apply = async (event) => {
    event.preventDefault();

    if (!form.resume_id) {
      setMessageType("error");
      setMessage("Vui lòng chọn một CV trước khi nộp hồ sơ.");
      return;
    }

    setApplying(true);
    setMessage("");
    try {
      const created = await api.applications.create({
        job_id: Number(id),
        resume_id: Number(form.resume_id),
        cover_letter: form.cover_letter,
      });
      setExistingApplication(created);
      setMessageType("success");
      setMessage("Ứng tuyển thành công.");
    } catch (error) {
      setMessageType("error");
      setMessage(error.message);
    } finally {
      setApplying(false);
    }
  };

  if (loadingJob) {
    return (
      <section className="panel job-detail-shell">
        <div className="job-hero job-detail-hero">
          <div className="job-detail-hero-main" style={{ width: "100%" }}>
            <Skeleton className="skeleton-pill" width="180px" height="26px" />
            <Skeleton className="skeleton-line" width="54%" height="36px" />
            <Skeleton className="skeleton-line" width="46%" height="18px" />
            <div className="job-detail-chip-row">
              <Skeleton className="skeleton-pill" width="100px" height="28px" />
              <Skeleton className="skeleton-pill" width="130px" height="28px" />
              <Skeleton className="skeleton-pill" width="120px" height="28px" />
            </div>
          </div>
          <div className="salary-box job-detail-salary">
            <Skeleton className="skeleton-line skeleton-line--short" width="90px" height="12px" />
            <Skeleton className="skeleton-line" width="150px" height="20px" />
          </div>
        </div>

        <div className="detail-grid job-detail-grid">
          <article className="card job-detail-content">
            {Array.from({ length: 4 }, (_, index) => (
              <section key={index} className="job-detail-block">
                <Skeleton className="skeleton-line" width="180px" height="24px" />
                <SkeletonText lines={3} />
              </section>
            ))}
          </article>

          <article className="card job-apply-card">
            <div className="job-apply-head">
              <Skeleton className="skeleton-line" width="220px" height="28px" />
              <Skeleton className="skeleton-line" width="90%" height="16px" />
            </div>
            <SkeletonText lines={5} />
          </article>
        </div>
      </section>
    );
  }

  if (!job) {
    return <section className="panel"><div className="card">Không tìm thấy tin tuyển dụng.</div></section>;
  }

  const canApply = user?.role === "candidate" && !existingApplication;
  const hasTags = Array.isArray(job.tags) && job.tags.length > 0;

  return (
    <div className="job-detail-page">
      <section className="panel job-detail-shell">
        <div className="job-hero job-detail-hero">
          <div className="job-detail-hero-main">
            <div className="card-badge">{job.company?.company_name || "Nhà tuyển dụng"}</div>
            <h1>{job.title || "Chưa có tiêu đề"}</h1>
            <p className="muted">
              {job.location || "Không giới hạn địa điểm"} · {labelWorkplace(job.workplace_type)} · {labelExperience(job.experience_level)}
            </p>
            <div className="job-detail-chip-row">
              <span className="chip">{labelEmployment(job.employment_type)}</span>
              <span className="chip">{labelWorkplace(job.workplace_type)}</span>
              <span className="chip">{labelExperience(job.experience_level)}</span>
            </div>
          </div>
          <div className="salary-box job-detail-salary">
            <span>Mức lương</span>
            <strong>{formatSalary(job)}</strong>
          </div>
        </div>

        <div className="detail-grid job-detail-grid">
          <article className="card job-detail-content">
            <section className="job-detail-block">
              <h2>Mô tả công việc</h2>
              <p>{job.description || "Nhà tuyển dụng chưa cập nhật mô tả chi tiết."}</p>
            </section>

            <section className="job-detail-block">
              <h2>Yêu cầu ứng viên</h2>
              <p>{job.requirements || "Nhà tuyển dụng chưa cập nhật yêu cầu cụ thể."}</p>
            </section>

            <section className="job-detail-block">
              <h2>Trách nhiệm chính</h2>
              <p>{job.responsibilities || "Nhà tuyển dụng chưa cập nhật phần trách nhiệm."}</p>
            </section>

            <section className="job-detail-block">
              <h2>Thẻ kỹ năng</h2>
              {hasTags ? (
                <div className="tag-strip">
                  {job.tags.map((tag) => (
                    <span key={tag.id} className="tag">
                      {tag.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted">Chưa có thẻ kỹ năng cho tin tuyển dụng này.</p>
              )}
            </section>
          </article>

          <article className="card job-apply-card" id="ung-tuyen">
            <div className="job-apply-head">
              <h2>Nộp hồ sơ ứng tuyển</h2>
              <p>Chọn CV phù hợp nhất và gửi hồ sơ trực tiếp cho nhà tuyển dụng.</p>
            </div>

            {user?.role === "candidate" ? loadingResumes ? (
              <div className="candidate-empty-state">
                <SkeletonText lines={4} />
              </div>
            ) : existingApplication ? (
              <div className="form-grid job-apply-existing">
                <p>Bạn đã ứng tuyển công việc này vào {formatDate(existingApplication.applied_at)}.</p>
                <p>
                  Trạng thái hiện tại: <strong>{labelApplicationStatus(existingApplication.status || "submitted")}</strong>
                </p>
                <Link
                  className="btn btn-ghost btn-small"
                  to={`${ROUTES.candidate.applications}?applicationId=${existingApplication.id}`}
                >
                  Xem hồ sơ đã nộp
                </Link>
              </div>
            ) : resumes.length === 0 ? (
              <div className="form-grid">
                <p>Bạn chưa có CV để nộp hồ sơ.</p>
                <Link className="btn btn-small" to={ROUTES.candidate.resumeCreate}>
                  Tạo CV ngay
                </Link>
              </div>
            ) : (
              <form className="form-grid" onSubmit={apply}>
                <label>Chọn CV
                  <select value={form.resume_id} onChange={(e) => setForm({ ...form, resume_id: e.target.value })}>
                    <option value="">-- Chọn CV --</option>
                    {resumes.map((resume) => (
                      <option key={resume.id} value={resume.id}>{resume.title} {resume.is_primary ? "(primary)" : ""}</option>
                    ))}
                  </select>
                </label>
                <label className="span-2">
                  Thư giới thiệu
                  <textarea
                    rows="5"
                    placeholder="Viết ngắn gọn điểm mạnh của bạn và lý do bạn phù hợp với vị trí này..."
                    value={form.cover_letter}
                    onChange={(e) => setForm({ ...form, cover_letter: e.target.value })}
                  />
                </label>
                <button className="btn" type="submit" disabled={!canApply || applying}>
                  {applying ? "Đang nộp..." : "Nộp hồ sơ"}
                </button>
                {message ? (
                  <div className={messageType === "error" ? "auth-alert auth-alert--error span-2" : "auth-alert auth-alert--success span-2"}>
                    {message}
                  </div>
                ) : null}
              </form>
            ) : (
              <div className="candidate-empty-state candidate-empty-state--large">
                <strong>Bạn cần đăng nhập tài khoản ứng viên để nộp hồ sơ.</strong>
                <Link className="btn btn-small" to={ROUTES.auth}>Đăng nhập ngay</Link>
              </div>
            )}
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Việc làm liên quan</h2>
          <Link to={ROUTES.jobs}>Tất cả việc làm</Link>
        </div>
      </section>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSalary(job) {
  if (!job) return "Thoả thuận";
  const salaryMin = Number(job.salary_min || 0);
  const salaryMax = Number(job.salary_max || 0);
  const currency = job.salary_currency || "VND";

  if (salaryMin > 0 && salaryMax > 0) {
    return `${salaryMin.toLocaleString("vi-VN")} - ${salaryMax.toLocaleString("vi-VN")} ${currency}`;
  }
  if (salaryMax > 0) {
    return `Tối đa ${salaryMax.toLocaleString("vi-VN")} ${currency}`;
  }
  if (salaryMin > 0) {
    return `Từ ${salaryMin.toLocaleString("vi-VN")} ${currency}`;
  }
  return "Thoả thuận";
}

function labelWorkplace(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "remote") return "Làm việc từ xa";
  if (normalized === "hybrid") return "Làm việc kết hợp";
  return "Làm tại văn phòng";
}

function labelEmployment(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "part-time") return "Bán thời gian";
  if (normalized === "contract") return "Hợp đồng";
  if (normalized === "internship") return "Thực tập";
  return "Toàn thời gian";
}

function labelExperience(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "intern") return "Thực tập sinh";
  if (normalized === "junior") return "Mới đi làm";
  if (normalized === "mid") return "Trung cấp";
  if (normalized === "senior") return "Cấp cao";
  if (normalized === "lead") return "Trưởng nhóm";
  return "Không yêu cầu cụ thể";
}

function labelApplicationStatus(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "reviewing") return "Đang xem xét";
  if (normalized === "interview") return "Mời phỏng vấn";
  if (normalized === "accepted") return "Được nhận";
  if (normalized === "rejected") return "Từ chối";
  if (normalized === "withdrawn") return "Đã rút hồ sơ";
  return "Đã nộp";
}
