import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { ROUTES } from "../../routes";
import { Skeleton, SkeletonText } from "../../components/Skeleton";

const STATUS_META = {
  submitted: {
    label: "Đã gửi",
    tone: "new",
    description: "Hồ sơ đã đến tay nhà tuyển dụng.",
  },
  reviewing: {
    label: "Đang xem xét",
    tone: "reviewing",
    description: "Recruiter đang đọc CV và đánh giá độ phù hợp.",
  },
  interview: {
    label: "Phỏng vấn",
    tone: "contacted",
    description: "Bạn đã vào vòng trao đổi trực tiếp.",
  },
  accepted: {
    label: "Đã chấp nhận",
    tone: "open",
    description: "Nhà tuyển dụng đã xác nhận kết quả tích cực.",
  },
  rejected: {
    label: "Từ chối",
    tone: "closed",
    description: "Hồ sơ chưa phù hợp cho đợt tuyển dụng này.",
  },
  withdrawn: {
    label: "Đã rút",
    tone: "hidden",
    description: "Ứng viên đã rút hồ sơ khỏi quy trình.",
  },
};

const TIMELINE = [
  { key: "submitted", label: "Đã gửi hồ sơ" },
  { key: "reviewing", label: "Đang xem xét" },
  { key: "interview", label: "Phỏng vấn" },
  { key: "accepted", label: "Kết quả cuối" },
];

export default function CandidateApplicationsPage() {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [applications, setApplications] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const preferredApplicationId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("applicationId");
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [location.search]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api.applications.myApplications();
        if (!mounted) return;
        setApplications(Array.isArray(data) ? data : []);
      } catch (err) {
        if (mounted) {
          setApplications([]);
          setError(err.message || "Không thể tải dữ liệu ứng tuyển.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredApplications = useMemo(() => {
    const normalizedQuery = normalize(query);

    return applications.filter((application) => {
      if (statusFilter !== "all" && application.status !== statusFilter) return false;
      if (!normalizedQuery) return true;

      const title = normalize(application.job?.title);
      const company = normalize(application.job?.company?.company_name);
      const resume = normalize(application.resume?.title);
      const location = normalize(application.job?.location);
      const status = normalize(getStatusMeta(application.status).label);

      return [title, company, resume, location, status].some((value) => value.includes(normalizedQuery));
    });
  }, [applications, query, statusFilter]);

  useEffect(() => {
    if (!filteredApplications.length) {
      setSelectedId(null);
      return;
    }

    if (preferredApplicationId) {
      const preferredExists = filteredApplications.some((application) => application.id === preferredApplicationId);
      if (preferredExists) {
        if (selectedId !== preferredApplicationId) {
          setSelectedId(preferredApplicationId);
        }
        return;
      }
    }

    const exists = filteredApplications.some((application) => application.id === selectedId);
    if (!exists) {
      setSelectedId(filteredApplications[0].id);
    }
  }, [filteredApplications, selectedId, preferredApplicationId]);

  const selectedApplication = useMemo(() => {
    if (!filteredApplications.length) return null;
    return filteredApplications.find((application) => application.id === selectedId) || filteredApplications[0];
  }, [filteredApplications, selectedId]);

  const stats = useMemo(() => {
    const total = applications.length;
    const active = applications.filter((application) => ["submitted", "reviewing", "interview"].includes(application.status)).length;
    const done = applications.filter((application) => ["accepted", "rejected", "withdrawn"].includes(application.status)).length;
    return [
      { label: "Tổng hồ sơ", value: total },
      { label: "Đang xử lý", value: active },
      { label: "Kết thúc", value: done },
      { label: "CV đã lưu", value: applications.filter((application) => application.resume?.id).length },
    ];
  }, [applications]);

  const statusChips = useMemo(
    () => [
      { value: "all", label: "Tất cả" },
      ...Object.entries(STATUS_META).map(([value, meta]) => ({ value, label: meta.label })),
    ],
    [],
  );

  return (
    <section className="candidate-applications-page">
      <article className="dashboard-card candidate-applications-hero">
        <div className="candidate-applications-hero-copy">
          <span className="eyebrow">ỨNG VIÊN / JOBPORTAL</span>
          <h1>Việc đã ứng tuyển</h1>
          <p>
            Theo dõi toàn bộ hồ sơ đã nộp, trạng thái xử lý, CV đang dùng và ghi chú từ nhà tuyển dụng trong
            một màn hình.
          </p>
          <div className="candidate-applications-hero-actions">
            <Link className="btn btn-small" to={ROUTES.jobs}>
              Khám phá việc làm
            </Link>
            <Link className="btn btn-ghost btn-small" to={ROUTES.candidate.resumes}>
              Quản lý CV
            </Link>
          </div>
        </div>

        <div className="candidate-applications-hero-stats">
          {stats.map((item) => (
            <div key={item.label} className="candidate-applications-stat">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="dashboard-card candidate-application-toolbar">
        <label className="candidate-application-search">
          <span>Tìm hồ sơ, công ty, CV hoặc địa điểm</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ví dụ: React, MyApp, Remote..."
          />
        </label>

        <div className="candidate-filter-chips" role="tablist" aria-label="Lọc trạng thái ứng tuyển">
          {statusChips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={statusFilter === chip.value ? "candidate-filter-chip candidate-filter-chip--active" : "candidate-filter-chip"}
              onClick={() => setStatusFilter(chip.value)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </article>

      {error ? <div className="auth-alert auth-alert--error">{error}</div> : null}

      <div className="candidate-applications-layout">
        <article className="dashboard-card candidate-application-list-panel">
          <div className="dashboard-card-head">
            <h2>Danh sách hồ sơ</h2>
            <span className="dashboard-card-link">{filteredApplications.length} kết quả</span>
          </div>

          {loading ? (
            <div className="candidate-application-list">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="candidate-application-card skeleton-card" aria-hidden="true">
                  <div className="candidate-application-card-head">
                    <div className="candidate-company-mark">
                      <Skeleton circle width="40px" height="40px" />
                    </div>
                    <div className="candidate-application-title-block">
                      <div className="candidate-application-title-row">
                        <div className="skeleton-text-group">
                          <Skeleton className="skeleton-line" width="220px" height="20px" />
                          <Skeleton className="skeleton-line skeleton-line--short" width="150px" height="14px" />
                        </div>
                        <Skeleton className="skeleton-pill" width="90px" height="24px" />
                      </div>
                      <div className="candidate-application-meta">
                        <Skeleton className="skeleton-line" width="120px" height="12px" />
                        <Skeleton className="skeleton-line" width="80px" height="12px" />
                        <Skeleton className="skeleton-line" width="100px" height="12px" />
                      </div>
                    </div>
                  </div>

                  <div className="candidate-application-card-body">
                    <div className="candidate-application-chip-row">
                      <Skeleton className="skeleton-pill" width="86px" height="24px" />
                      <Skeleton className="skeleton-pill" width="96px" height="24px" />
                      <Skeleton className="skeleton-pill" width="132px" height="24px" />
                    </div>
                    <SkeletonText lines={2} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredApplications.length ? (
            <div className="candidate-application-list">
              {filteredApplications.map((application) => (
                <button
                  key={application.id}
                  type="button"
                  className={
                    selectedApplication?.id === application.id
                      ? "candidate-application-card candidate-application-card--active"
                      : "candidate-application-card"
                  }
                  onClick={() => setSelectedId(application.id)}
                >
                  <div className="candidate-application-card-head">
                    <div className="candidate-company-mark">
                      {application.job?.company?.logo_url ? (
                        <img src={application.job.company.logo_url} alt={application.job.company.company_name} />
                      ) : (
                        getInitials(application.job?.company?.company_name || "JP")
                      )}
                    </div>

                    <div className="candidate-application-title-block">
                      <div className="candidate-application-title-row">
                        <div>
                          <h3>{application.job?.title || "Chưa có tiêu đề"}</h3>
                          <p>{application.job?.company?.company_name || "Chưa có công ty"}</p>
                        </div>
                        <StatusBadge status={application.status} />
                      </div>
                      <div className="candidate-application-meta">
                        <span>{application.job?.location || "Chưa có địa điểm"}</span>
                        <span>{formatSalary(application.job)}</span>
                        <span>{formatDate(application.applied_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="candidate-application-card-body">
                    <div className="candidate-application-chip-row">
                      <span className="candidate-info-chip">{labelWorkplace(application.job?.workplace_type)}</span>
                      <span className="candidate-info-chip">{labelEmployment(application.job?.employment_type)}</span>
                      <span className="candidate-info-chip">CV: {application.resume?.title || "Chưa chọn"}</span>
                    </div>

                    <div className="candidate-match-meter">
                      <div className="candidate-match-meter-top">
                        <span>CV đang dùng</span>
                        <strong>{application.resume?.source_type === "upload" ? "Upload" : "Manual"}</strong>
                      </div>
                      <div className="candidate-match-track">
                        <div className="candidate-match-fill" style={{ width: "100%" }} />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="candidate-empty-state candidate-empty-state--large">
              <strong>Không tìm thấy hồ sơ phù hợp</strong>
              <p>Thử đổi từ khóa hoặc bỏ bộ lọc trạng thái để xem toàn bộ danh sách ứng tuyển.</p>
            </div>
          )}
        </article>

        <aside className="dashboard-card candidate-application-detail-panel">
          <div className="dashboard-card-head">
            <h2>Chi tiết ứng tuyển</h2>
            {selectedApplication ? (
              <Link className="dashboard-card-link" to={ROUTES.jobDetail(selectedApplication.job_id)}>
                Mở tin tuyển dụng
              </Link>
            ) : null}
          </div>

          {!selectedApplication ? (
            <div className="candidate-empty-state">
              <strong>Chọn một hồ sơ</strong>
              <p>Chi tiết ứng tuyển sẽ hiển thị ở đây sau khi bạn chọn một card bên trái.</p>
            </div>
          ) : (
            <div className="candidate-application-detail">
              <section className="candidate-detail-hero">
                <div className="candidate-detail-hero-main">
                  <div className="candidate-company-mark candidate-company-mark--lg">
                    {selectedApplication.job?.company?.logo_url ? (
                      <img src={selectedApplication.job.company.logo_url} alt={selectedApplication.job.company.company_name} />
                    ) : (
                      getInitials(selectedApplication.job?.company?.company_name || "JP")
                    )}
                  </div>

                  <div>
                    <div className="candidate-detail-title-row">
                      <h3>{selectedApplication.job?.title || "Chưa có tiêu đề"}</h3>
                      <StatusBadge status={selectedApplication.status} />
                    </div>
                    <p>{selectedApplication.job?.company?.company_name || "Chưa có công ty"}</p>
                    <div className="candidate-application-meta">
                      <span>{selectedApplication.job?.location || "Chưa có địa điểm"}</span>
                      <span>{selectedApplication.job?.company?.industry || "Chưa có ngành"}</span>
                      <span>{selectedApplication.job?.company?.address || "Chưa có địa chỉ"}</span>
                    </div>
                  </div>
                </div>

                <div className="candidate-score-card">
                  <span>Trạng thái hiện tại</span>
                  <strong>{getStatusMeta(selectedApplication.status).label}</strong>
                  <p>{getStatusMeta(selectedApplication.status).description}</p>
                </div>
              </section>

              <section className="candidate-detail-grid">
                <InfoTile label="Ngày ứng tuyển" value={formatDate(selectedApplication.applied_at)} />
                <InfoTile label="Cập nhật gần nhất" value={formatDate(selectedApplication.updated_at)} />
                <InfoTile label="Mức lương" value={formatSalary(selectedApplication.job)} />
                <InfoTile label="CV đang dùng" value={selectedApplication.resume?.title} />
                <InfoTile label="Loại hình" value={labelEmployment(selectedApplication.job?.employment_type)} />
                <InfoTile label="Môi trường" value={labelWorkplace(selectedApplication.job?.workplace_type)} />
              </section>

              <section className="candidate-detail-block">
                <div className="candidate-detail-block-head">
                  <h4>Lộ trình xử lý hồ sơ</h4>
                  <span className="candidate-detail-hint">Theo trạng thái hiện tại của ứng tuyển</span>
                </div>
                <div className="candidate-timeline">
                  {TIMELINE.map((step) => (
                    <TimelineStep
                      key={step.key}
                      step={step}
                      current={selectedApplication.status}
                    />
                  ))}
                </div>
              </section>

              <section className="candidate-detail-block">
                <div className="candidate-detail-block-head">
                  <h4>Thư ứng tuyển</h4>
                  <span className="candidate-detail-hint">Nội dung đã lưu trong database</span>
                </div>
                <p className="candidate-cover-letter">{selectedApplication.cover_letter || "Chưa có thư ứng tuyển."}</p>
              </section>

              <section className="candidate-detail-block">
                <div className="candidate-detail-block-head">
                  <h4>Ghi chú từ nhà tuyển dụng</h4>
                  <span className="candidate-detail-hint">Phản hồi nhà tuyển dụng gửi cho hồ sơ của bạn</span>
                </div>
                {selectedApplication.recruiter_note ? (
                  <div className="candidate-note">{selectedApplication.recruiter_note}</div>
                ) : (
                  <div className="candidate-empty-state candidate-empty-state--solid">
                    Chưa có ghi chú nào từ nhà tuyển dụng cho hồ sơ này.
                  </div>
                )}
              </section>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function TimelineStep({ step, current }) {
  const order = ["submitted", "reviewing", "interview", "accepted"];
  const currentIndex = order.indexOf(current);
  const stepIndex = order.indexOf(step.key);
  const isActive = stepIndex <= currentIndex && current !== "rejected";
  const isRejected = current === "rejected";
  const isFinalState = step.key === "accepted" && (current === "accepted" || current === "rejected");

  return (
    <div
      className={
        isActive || isFinalState
          ? "candidate-timeline-step candidate-timeline-step--active"
          : "candidate-timeline-step"
      }
    >
      <span className="candidate-timeline-dot" />
      <div>
        <strong>{step.label}</strong>
        <p>
          {step.key === "submitted" && "Hồ sơ đã được tạo và gửi đi."}
          {step.key === "reviewing" && "Recruiter mở hồ sơ và đối chiếu CV."}
          {step.key === "interview" && "Ứng viên được mời trao đổi thêm."}
          {step.key === "accepted" && "Đây là mốc kết quả cuối cùng của hồ sơ."}
        </p>
        {isRejected && step.key === "accepted" ? (
          <span className="candidate-timeline-status">
            Kết quả: từ chối
          </span>
        ) : null}
      </div>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="candidate-info-tile">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = getStatusMeta(status);
  return <span className={`status-badge status-badge--${meta.tone}`}>{meta.label}</span>;
}

function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.submitted;
}

function labelEmployment(value) {
  const map = {
    "full-time": "Toàn thời gian",
    "part-time": "Bán thời gian",
    contract: "Hợp đồng",
    internship: "Thực tập",
  };
  return map[value] || value || "Không rõ";
}

function labelWorkplace(value) {
  const map = {
    onsite: "Làm tại văn phòng",
    hybrid: "Hybrid",
    remote: "Remote",
  };
  return map[value] || value || "Không rõ";
}

function formatSalary(job) {
  if (!job?.salary_min && !job?.salary_max) return "Thỏa thuận";

  const currency = job.salary_currency === "VND" ? "triệu" : job.salary_currency || "";
  const min = formatMoney(job.salary_min);
  const max = formatMoney(job.salary_max);

  if (min && max) return `${min} - ${max} ${currency}`.trim();
  if (min) return `${min} ${currency}`.trim();
  return `${max} ${currency}`.trim();
}

function formatMoney(value) {
  if (!value && value !== 0) return "";
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value) / 1000000));
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

function getInitials(value) {
  const raw = (value || "UV").trim();
  return raw
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function normalize(value) {
  return stripDiacritics(String(value || "").toLowerCase().trim());
}

function stripDiacritics(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
