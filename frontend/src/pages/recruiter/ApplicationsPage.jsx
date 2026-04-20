import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import ResumePreviewModal from "../../components/resume/ResumePreviewModal";

const STATUS_OPTIONS = [
  { value: "submitted", label: "Đã gửi" },
  { value: "reviewing", label: "Đang xem xét" },
  { value: "interview", label: "Mời phỏng vấn" },
  { value: "accepted", label: "Đã chấp nhận" },
  { value: "rejected", label: "Từ chối" },
  { value: "withdrawn", label: "Đã rút" },
];

export default function RecruiterApplicationsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [activeApp, setActiveApp] = useState(null);
  const [resumeDetail, setResumeDetail] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [previewAppId, setPreviewAppId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.applications.recruiterApplications();
      const nextApps = Array.isArray(data) ? data : [];
      setApps(nextApps);
      setActiveApp((current) => {
        if (!nextApps.length) return null;
        if (!current) return nextApps[0];
        return nextApps.find((item) => item.id === current.id) || nextApps[0];
      });
    } catch (loadError) {
      setApps([]);
      setActiveApp(null);
      setResumeDetail(null);
      setError(loadError.message || "Không thể tải danh sách hồ sơ từ database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!activeApp?.id) return;
    if (!apps.some((app) => app.id === activeApp.id)) {
      setActiveApp(apps[0] || null);
      setResumeDetail(null);
    }
  }, [activeApp?.id, apps]);

  useEffect(() => {
    if (!activeApp?.id) return;

    let cancelled = false;

    const loadResumeDetail = async () => {
      setResumeDetail(null);
      try {
        const detail = await api.applications.recruiterApplicationResume(activeApp.id);
        if (!cancelled) {
          setResumeDetail(detail);
        }
      } catch {
        if (!cancelled) {
          setResumeDetail({ application: activeApp, resume: activeApp.resume || null });
        }
      }
    };

    loadResumeDetail();
    return () => {
      cancelled = true;
    };
  }, [activeApp?.id]);

  const jobOptions = useMemo(() => {
    const seen = new Map();
    apps.forEach((app) => {
      if (app.job?.id && !seen.has(app.job.id)) {
        seen.set(app.job.id, {
          value: String(app.job.id),
          label: app.job.title || `Tin #${app.job.id}`,
        });
      }
    });
    return Array.from(seen.values());
  }, [apps]);

  const filteredApps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return apps
      .filter((app) => {
        if (statusFilter === "all") return true;
        return (app.status || "").toLowerCase() === statusFilter;
      })
      .filter((app) => {
        if (jobFilter === "all") return true;
        return String(app.job?.id || "") === jobFilter;
      })
      .filter((app) => {
        if (!normalizedQuery) return true;
        const candidateName = (app.candidate?.full_name || "").toLowerCase();
        const candidateEmail = (app.candidate?.email || "").toLowerCase();
        const jobTitle = (app.job?.title || "").toLowerCase();
        return candidateName.includes(normalizedQuery) || candidateEmail.includes(normalizedQuery) || jobTitle.includes(normalizedQuery);
      });
  }, [apps, jobFilter, query, statusFilter]);

  const stats = useMemo(() => {
    const total = apps.length;
    const reviewing = apps.filter((app) => (app.status || "").toLowerCase() === "reviewing").length;
    const interview = apps.filter((app) => (app.status || "").toLowerCase() === "interview").length;
    return [
      { label: "Tổng hồ sơ", value: String(total) },
      { label: "Đang xem xét", value: String(reviewing) },
      { label: "Phỏng vấn", value: String(interview) },
    ];
  }, [apps]);

  const updateStatus = async (id, payload) => {
    try {
      setBusyId(id);
      await api.applications.updateStatus(id, payload);
      await load();
    } catch {
      setError("Không thể cập nhật trạng thái hồ sơ. Vui lòng thử lại.");
    } finally {
      setBusyId(null);
    }
  };

  const selectApplication = (app) => {
    setActiveApp(app);
    setError("");
  };

  const downloadResume = async (resume, applicationId) => {
    const remoteUrl = resume?.generated_pdf_path || resume?.stored_path;
    if (remoteUrl && /^https?:\/\//i.test(remoteUrl)) {
      window.open(remoteUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const token = localStorage.getItem("auth_token");
    const base = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5001/api";
    const response = await fetch(`${base}/applications/${applicationId}/resume/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new Error("Không thể tải PDF.");
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${resume?.title || `resume-${applicationId}`}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
  };

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow">Recruiter workspace</span>
          <h1>Quản lý hồ sơ ứng viên</h1>
          <p>Theo dõi, lọc và cập nhật trạng thái hồ sơ ứng tuyển.</p>
        </div>

        <div className="dashboard-hero-stats">
          {stats.map((item) => (
            <div key={item.label} className="dashboard-stat">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-toolbar">
        <div className="dashboard-search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên ứng viên, email hoặc vị trí..."
          />
        </div>

        <div className="dashboard-filter">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {jobOptions.length ? (
          <div className="dashboard-filter">
            <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
              <option value="all">Tất cả vị trí</option>
              {jobOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <button className="btn btn-ghost" type="button" onClick={load} disabled={loading}>
          {loading ? "Đang tải..." : "Tải lại"}
        </button>
      </div>

      {error ? (
        <div className="dashboard-empty-state recruiter-error-state">
          <strong>Không thể tải danh sách hồ sơ</strong>
          <p>Vui lòng thử lại hoặc kiểm tra bộ lọc.</p>
          <div>
            <button className="btn btn-small" type="button" onClick={load}>
              Thử lại
            </button>
          </div>
        </div>
      ) : null}

      <div className="recruiter-apps-layout">
        <article className="dashboard-card recruiter-apps-list">
          <div className="dashboard-card-head">
            <h2>Danh sách hồ sơ</h2>
            <span className="dashboard-muted">{filteredApps.length} kết quả</span>
          </div>

          {loading ? (
            <div className="dashboard-empty">Đang tải danh sách hồ sơ...</div>
          ) : filteredApps.length ? (
            <div className="recruiter-apps-items">
              {filteredApps.map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  selected={activeApp?.id === app.id}
                  onSelect={selectApplication}
                  resumeDetail={resumeDetail}
                />
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-state recruiter-empty-state">
              <strong>Chưa có hồ sơ phù hợp</strong>
              <p>Hiện chưa có hồ sơ ứng tuyển nào khớp với điều kiện tìm kiếm hoặc bộ lọc của bạn.</p>
            </div>
          )}
        </article>

        <aside className="dashboard-card recruiter-apps-detail">
          <div className="dashboard-card-head">
            <h2>Chi tiết hồ sơ</h2>
          </div>

          {!activeApp ? (
            <div className="dashboard-empty recruiter-detail-empty">Chọn một hồ sơ để xem chi tiết</div>
          ) : (
            <ApplicationDetail
              application={activeApp}
              resumeDetail={resumeDetail}
              busy={busyId === activeApp.id}
              onUpdateStatus={updateStatus}
              onPreview={() => setPreviewAppId(activeApp.id)}
            />
          )}
        </aside>
      </div>

      {previewAppId ? (
        <ResumePreviewModal
          resume={resumeDetail?.resume || activeApp?.resume || null}
          onClose={() => setPreviewAppId(null)}
          onDownload={(resume) => downloadResume(resume, previewAppId)}
        />
      ) : null}
    </section>
  );
}

function ApplicationCard({ application, selected, onSelect, resumeDetail }) {
  const resumeFile = resumeDetail?.application?.id === application.id ? resumeDetail?.resume : null;

  return (
    <article className={selected ? "recruiter-app-card recruiter-app-card--active" : "recruiter-app-card"}>
      <button type="button" className="recruiter-app-card-button" onClick={() => onSelect(application)}>
        <div className="recruiter-app-card-top">
          <div>
            <strong>{application.candidate?.full_name || "Ứng viên"}</strong>
            <div className="recruiter-app-muted">{application.candidate?.email || "Chưa có email"}</div>
          </div>
          <StatusPill status={application.status} />
        </div>

        <div className="recruiter-app-card-mid">
          <div>
            <span className="recruiter-app-label">Vị trí</span>
            <div>{application.job?.title || "Chưa có vị trí"}</div>
          </div>
          <div>
            <span className="recruiter-app-label">Địa điểm</span>
            <div>{application.job?.location || "Chưa cập nhật"}</div>
          </div>
        </div>

        <div className="recruiter-app-card-bottom">
          <span className="recruiter-app-muted">CV: {application.resume?.title || "CV online"}</span>
          <span className="recruiter-app-muted">Nộp: {formatDate(application.applied_at)}</span>
        </div>
      </button>

      <div className="recruiter-app-card-actions">
        <button type="button" className="icon-btn" onClick={() => onSelect(application)}>
          Xem chi tiết
        </button>
        {resumeFile?.stored_path ? (
          <a className="icon-btn" href={resumeFile.stored_path} target="_blank" rel="noreferrer">
            Tải CV
          </a>
        ) : null}
      </div>
    </article>
  );
}

function ApplicationDetail({ application, resumeDetail, busy, onUpdateStatus, onPreview }) {
  const resume = resumeDetail?.resume || application.resume || null;
  const cvName = resume?.title || "CV online";
  const cvLink = resume?.stored_path || null;
  const isStructuredResume = resume?.source_type === "manual" && Boolean(resume?.structured_json);
  const status = (application.status || "").toLowerCase();
  const isInterview = status === "interview";
  const isRejected = status === "rejected";
  const [decisionReason, setDecisionReason] = useState(application.recruiter_note || "");

  useEffect(() => {
    setDecisionReason(application.recruiter_note || "");
  }, [application.id, application.recruiter_note]);

  const submitDecision = (nextStatus) => {
    const reason = decisionReason.trim();
    if (!reason) return;
    onUpdateStatus(application.id, { status: nextStatus, reason });
  };

  return (
    <div className="recruiter-detail-body">
      <section className="recruiter-detail-section">
        <div className="recruiter-detail-title">
          <strong>{application.candidate?.full_name || "Ứng viên"}</strong>
          <StatusPill status={application.status} />
        </div>
        <div className="recruiter-app-muted">{application.candidate?.email || "Chưa có email"}</div>
      </section>

      <section className="recruiter-detail-section recruiter-detail-card">
        <h3>Thông tin ứng tuyển</h3>
        <div className="recruiter-detail-grid">
          <DetailItem label="Ứng viên" value={application.candidate?.full_name || "Ứng viên"} />
          <DetailItem label="Email" value={application.candidate?.email || "Chưa có email"} />
          <DetailItem label="Vị trí" value={application.job?.title || "Chưa có vị trí"} />
          <DetailItem label="Địa điểm" value={application.job?.location || "Chưa cập nhật"} />
          <DetailItem label="Ngày nộp" value={formatDate(application.applied_at)} />
        </div>
      </section>

      <section className="recruiter-detail-section recruiter-detail-card">
        <div className="dashboard-card-head recruiter-detail-inline-head">
          <h3>Hồ sơ CV</h3>
          <div style={{ display: "flex", gap: "8px" }}>
            {resume ? (
              <button type="button" className="icon-btn" onClick={onPreview}>
                Xem CV
              </button>
            ) : null}
            {cvLink && !isStructuredResume ? (
              <a className="icon-btn" href={cvLink} target="_blank" rel="noreferrer">Tải CV</a>
            ) : null}
          </div>
        </div>
        <div className="recruiter-detail-grid recruiter-detail-grid--single">
          <DetailItem label="Tên CV" value={cvName} />
          <DetailItem label="Loại" value={isStructuredResume ? "CV tạo từ mẫu" : "CV tải lên"} />
        </div>
      </section>

      <section className="recruiter-detail-section recruiter-detail-card">
        <h3>Quyết định tuyển dụng</h3>
        {status === "submitted" ? (
          <div className="recruiter-detail-actions">
            <button
              className="btn btn-small"
              type="button"
              onClick={() => onUpdateStatus(application.id, "reviewing")}
              disabled={busy}
            >
              {busy ? "Đang cập nhật..." : "Chuyển sang Đang xem xét"}
            </button>
          </div>
        ) : (
          <>
            <label className="recruiter-editor-field recruiter-editor-field--full" style={{ marginBottom: "12px" }}>
              <span>Lý do / nội dung gửi ứng viên</span>
              <textarea
                value={decisionReason}
                onChange={(event) => setDecisionReason(event.target.value)}
                rows={4}
                placeholder="Ví dụ: Hồ sơ phù hợp, mời bạn tham gia phỏng vấn vào tuần này..."
              />
            </label>
            <div className="recruiter-app-muted" style={{ marginBottom: "12px" }}>
              Nội dung này sẽ được lưu trong database, hiển thị trên web ứng viên và gửi qua email.
            </div>
            <div className="recruiter-detail-actions">
              <button
                className={isInterview ? "recruiter-action-btn recruiter-action-btn--interview recruiter-action-btn--active" : "recruiter-action-btn recruiter-action-btn--interview"}
                type="button"
                onClick={() => submitDecision("interview")}
                disabled={busy || isInterview || !decisionReason.trim()}
              >
                {busy && !isRejected ? "Đang cập nhật..." : isInterview ? "Đã mời phỏng vấn" : "Mời phỏng vấn"}
              </button>
              <button
                className={isRejected ? "recruiter-action-btn recruiter-action-btn--reject recruiter-action-btn--active" : "recruiter-action-btn recruiter-action-btn--reject"}
                type="button"
                onClick={() => submitDecision("rejected")}
                disabled={busy || isRejected || !decisionReason.trim()}
              >
                {busy && !isInterview ? "Đang cập nhật..." : isRejected ? "Đã từ chối" : "Từ chối"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <span className="recruiter-app-label">{label}</span>
      <div>{value}</div>
    </div>
  );
}

function StatusPill({ status }) {
  const normalized = (status || "").toLowerCase();
  const label = STATUS_OPTIONS.find((item) => item.value === normalized)?.label || "Đã gửi";
  const toneMap = {
    submitted: "new",
    reviewing: "reviewing",
    interview: "contacted",
    accepted: "open",
    rejected: "closed",
    withdrawn: "hidden",
  };

  return <span className={`status-badge status-badge--${toneMap[normalized] || "hidden"}`}>{label}</span>;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
