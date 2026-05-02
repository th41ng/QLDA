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
  const [relatedJobs, setRelatedJobs] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

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

  useEffect(() => {
    if (!job) return;
    let mounted = true;
    setLoadingRelated(true);

    const params = new URLSearchParams({ status: "published", per_page: "5" });
    if (job.location) params.set("location", job.location);

    api.jobs.list(`?${params.toString()}`)
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setRelatedJobs(list.filter((j) => String(j.id) !== String(id)).slice(0, 4));
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingRelated(false); });

    return () => { mounted = false; };
  }, [job, id]);

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
            <div className="job-detail-company-bar">
              <span className="job-detail-company-logo">
                {job.company?.logo_url
                  ? <img src={job.company.logo_url} alt="" />
                  : <span>{(job.company?.company_name || "?")[0].toUpperCase()}</span>}
              </span>
              <div className="job-detail-company-info">
                <span className="job-detail-company-name">{job.company?.company_name || "Nhà tuyển dụng"}</span>
                {job.company?.industry && (
                  <span className="job-detail-company-industry">{job.company.industry}</span>
                )}
              </div>
            </div>

            <h1>{job.title || "Chưa có tiêu đề"}</h1>
            <p className="muted">
              {job.location || "Không giới hạn địa điểm"} · {labelWorkplace(job.workplace_type)} · {labelExperience(job.experience_level)}
            </p>

            <div className="job-detail-chip-row">
              <span className="chip">{labelEmployment(job.employment_type)}</span>
              <span className="chip">{labelWorkplace(job.workplace_type)}</span>
              <span className="chip">{labelExperience(job.experience_level)}</span>
              {job.education_level && job.education_level !== "any" && (
                <span className="chip chip--edu">{labelEducation(job.education_level)}</span>
              )}
            </div>

            <div className="job-detail-meta-bar">
              <span className="job-detail-meta-item">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="1" y="2" width="14" height="13" rx="2" />
                  <line x1="1" y1="6" x2="15" y2="6" />
                  <line x1="5" y1="1" x2="5" y2="4" />
                  <line x1="11" y1="1" x2="11" y2="4" />
                </svg>
                {postedLabel(job.created_at)}
              </span>
              {job.deadline && (
                <span className="job-detail-meta-item job-detail-meta-item--deadline">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="8" cy="8" r="7" />
                    <polyline points="8,4 8,8 11,10" />
                  </svg>
                  Hạn nộp: {formatDateShort(job.deadline)}
                </span>
              )}
              {job.vacancy_count > 0 && (
                <span className="job-detail-meta-item">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="6" cy="5" r="2.5" />
                    <path d="M1 13c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5" />
                    <circle cx="12" cy="5" r="2" />
                    <path d="M14 13c0-1.8-1-3-2.5-3.5" />
                  </svg>
                  {job.vacancy_count} vị trí tuyển
                </span>
              )}
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
              {job.description
                ? job.description.split(/\n\n+/).map((para, i) => (
                    <p key={i}>{para.trim()}</p>
                  ))
                : <p className="muted">Nhà tuyển dụng chưa cập nhật mô tả chi tiết.</p>}
            </section>

            <section className="job-detail-block">
              <h2>Yêu cầu ứng viên</h2>
              {job.requirements
                ? <ul className="job-detail-list">
                    {job.requirements.split("\n").filter(l => l.trim()).map((line, i) => (
                      <li key={i}>{line.trim()}</li>
                    ))}
                  </ul>
                : <p className="muted">Nhà tuyển dụng chưa cập nhật yêu cầu cụ thể.</p>}
            </section>

            <section className="job-detail-block">
              <h2>Trách nhiệm chính</h2>
              {job.responsibilities
                ? <ul className="job-detail-list">
                    {job.responsibilities.split("\n").filter(l => l.trim()).map((line, i) => (
                      <li key={i}>{line.trim()}</li>
                    ))}
                  </ul>
                : <p className="muted">Nhà tuyển dụng chưa cập nhật phần trách nhiệm.</p>}
            </section>

            {job.benefits && (
              <section className="job-detail-block job-detail-block--benefits">
                <h2>Phúc lợi</h2>
                <ul className="job-benefits-list">
                  {job.benefits.split("\n").filter((line) => line.trim()).map((line, i) => (
                    <li key={i} className="job-benefit-item">
                      <svg viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="8" fill="#dbeafe" />
                        <path d="M5 8l2.5 2.5L11 5.5" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {line.trim()}
                    </li>
                  ))}
                </ul>
              </section>
            )}

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
                <div className="resume-pick-section span-2">
                  <span className="resume-pick-label">Chọn CV của bạn</span>
                  <div className="resume-pick-list">
                    {resumes.map((resume) => {
                      const isSelected = form.resume_id === String(resume.id);
                      const hasThumb = Boolean(resume.template_preview_url);
                      const sourceLabel =
                        resume.source_type === "uploaded"
                          ? "PDF đã tải lên"
                          : resume.template_name || "CV thủ công";
                      return (
                        <label
                          key={resume.id}
                          className={`resume-pick-card${isSelected ? " resume-pick-card--active" : ""}`}
                        >
                          <input
                            type="radio"
                            name="resume_id"
                            value={String(resume.id)}
                            checked={isSelected}
                            onChange={(e) => setForm({ ...form, resume_id: e.target.value })}
                          />
                          <div className={`resume-pick-thumb${hasThumb ? "" : " resume-pick-thumb--fallback"}`}>
                            {hasThumb ? (
                              <img src={resume.template_preview_url} alt="" />
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14,2 14,8 20,8" />
                                <line x1="8" y1="13" x2="16" y2="13" />
                                <line x1="8" y1="17" x2="16" y2="17" />
                              </svg>
                            )}
                          </div>
                          <div className="resume-pick-info">
                            <strong className="resume-pick-title">{resume.title}</strong>
                            <span className="resume-pick-type">{sourceLabel}</span>
                            <span className="resume-pick-date">Cập nhật: {formatDateShort(resume.updated_at)}</span>
                          </div>
                          {resume.is_primary && <span className="resume-pick-badge">Chính</span>}
                          <div className="resume-pick-check" aria-hidden="true">
                            {isSelected && (
                              <svg viewBox="0 0 20 20" fill="none">
                                <circle cx="10" cy="10" r="10" fill="#1d4ed8" />
                                <path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="resume-cover-section span-2">
                  <div className="resume-cover-header">
                    <span className="resume-cover-label">Thư giới thiệu</span>
                    <span className="resume-cover-optional">Không bắt buộc</span>
                  </div>
                  <textarea
                    className="resume-cover-textarea"
                    rows="4"
                    maxLength={1500}
                    placeholder="Viết ngắn gọn điểm mạnh của bạn và lý do bạn phù hợp với vị trí này..."
                    value={form.cover_letter}
                    onChange={(e) => setForm({ ...form, cover_letter: e.target.value })}
                  />
                  <div className="resume-cover-footer">
                    <div className="resume-cover-hints">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="8" cy="8" r="7" />
                        <line x1="8" y1="7" x2="8" y2="11" />
                        <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none" />
                      </svg>
                      <span>Nêu lý do phù hợp · Kỹ năng nổi bật · Mong muốn phát triển</span>
                    </div>
                    <span className={
                      (form.cover_letter || "").length > 1400
                        ? "resume-cover-count resume-cover-count--danger"
                        : (form.cover_letter || "").length > 1200
                          ? "resume-cover-count resume-cover-count--warn"
                          : "resume-cover-count"
                    }>
                      {(form.cover_letter || "").length} / 1500
                    </span>
                  </div>
                </div>

                <button className="btn span-2" type="submit" disabled={!canApply || applying}>
                  {applying ? "Đang nộp hồ sơ..." : "Nộp hồ sơ ứng tuyển"}
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

      {(loadingRelated || relatedJobs.length > 0) && (
        <section className="panel related-jobs-section">
          <div className="section-head">
            <h2>Việc làm liên quan</h2>
            <Link to={ROUTES.jobs}>Xem tất cả</Link>
          </div>

          <div className="related-jobs-grid">
            {loadingRelated
              ? Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="related-job-card related-job-card--skeleton">
                    <Skeleton width="40px" height="40px" style={{ borderRadius: 10 }} />
                    <div style={{ flex: 1, display: "grid", gap: 6 }}>
                      <Skeleton width="60%" height="14px" />
                      <Skeleton width="80%" height="18px" />
                      <Skeleton width="50%" height="12px" />
                    </div>
                  </div>
                ))
              : relatedJobs.map((rj) => (
                  <Link key={rj.id} className="related-job-card" to={ROUTES.jobDetail(rj.id)}>
                    <div className="related-job-logo">
                      {rj.company?.logo_url
                        ? <img src={rj.company.logo_url} alt="" />
                        : <span>{(rj.company?.company_name || "?")[0].toUpperCase()}</span>}
                    </div>
                    <div className="related-job-body">
                      <span className="related-job-company">{rj.company?.company_name || "Nhà tuyển dụng"}</span>
                      <strong className="related-job-title">{rj.title}</strong>
                      <span className="related-job-meta">
                        {rj.location || "Toàn quốc"} · {labelEmployment(rj.employment_type)}
                      </span>
                      <span className="related-job-salary">{formatSalary(rj)}</span>
                    </div>
                    <svg className="related-job-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 3l5 5-5 5" />
                    </svg>
                  </Link>
                ))}
          </div>
        </section>
      )}
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

function formatDateShort(value) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function postedLabel(value) {
  if (!value) return "Vừa đăng";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return "Đăng hôm nay";
  if (days === 1) return "Đăng hôm qua";
  return `Đăng ${days} ngày trước`;
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

function labelEducation(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "highschool") return "THPT";
  if (normalized === "college") return "Cao đẳng";
  if (normalized === "university") return "Đại học";
  if (normalized === "postgraduate") return "Thạc sĩ trở lên";
  return null;
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
