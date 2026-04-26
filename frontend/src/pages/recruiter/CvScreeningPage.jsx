import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { ROUTES } from "../../routes";
import {
  formatDate,
  formatDateTime,
  mapStatusLabel,
  normalizeText,
} from "./jobWorkspaceData";

function scoreBand(score) {
  if (score >= 90) return { label: "Rất phù hợp", tone: "green" };
  if (score >= 75) return { label: "Cân nhắc phỏng vấn", tone: "blue" };
  if (score >= 60) return { label: "Theo dõi thêm", tone: "amber" };
  return { label: "Dự phòng", tone: "slate" };
}

function shortlistLabel(score) {
  if (score >= 85) return "Ưu tiên";
  if (score >= 70) return "Xem tiếp";
  return "Dự phòng";
}

function skillText(tags) {
  return (tags || []).slice(0, 4).map((tag) => tag.name).join(", ");
}

function parseStructuredSkills(skills) {
  if (Array.isArray(skills)) {
    return skills.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof skills === "string") {
    return skills
      .split(/,|;|\n|\|/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function mapResumeSourceLabel(sourceType) {
  const normalized = String(sourceType || "").trim().toLowerCase();
  if (normalized === "upload") return "Tải lên";
  if (normalized === "generated") return "Tạo tự động";
  return "Tự tạo";
}

function cleanInsightText(value) {
  return String(value || "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanInsightList(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((item) => cleanInsightText(item))
    .filter(Boolean);
}

export default function RecruiterCvScreeningPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [company, setCompany] = useState(null);
  const [applications, setApplications] = useState([]);
  const [screening, setScreening] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingScreen, setLoadingScreen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [shortlistedIds, setShortlistedIds] = useState([]);
  const [shortlistBusyId, setShortlistBusyId] = useState(null);

  const selectedJobId = Number(searchParams.get("job") || 0) || null;

  useEffect(() => {
    let mounted = true;

    const loadJobs = async () => {
      setLoadingJobs(true);
      setError("");
      try {
        const [jobData, appData, companyData] = await Promise.all([
          api.jobs.mine().catch(() => []),
          api.applications.recruiterApplications().catch(() => []),
          api.companies.me().catch(() => null),
        ]);

        if (!mounted) return;

        const nextJobs = Array.isArray(jobData) ? jobData : [];
        setJobs(nextJobs);
        setApplications(Array.isArray(appData) ? appData : []);
        setCompany(companyData || null);

        if (!selectedJobId && nextJobs.length) {
          setSearchParams({ job: String(nextJobs[0].id) }, { replace: true });
        }
      } catch (loadError) {
        if (!mounted) return;
        setJobs([]);
        setApplications([]);
        setCompany(null);
        setError(loadError.message || "Không thể tải dữ liệu sàng lọc.");
      } finally {
        if (mounted) setLoadingJobs(false);
      }
    };

    loadJobs();

    return () => {
      mounted = false;
    };
  }, [selectedJobId, setSearchParams]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) || jobs[0] || null,
    [jobs, selectedJobId],
  );

  useEffect(() => {
    if (selectedJob?.id && Number(searchParams.get("job") || 0) !== selectedJob.id) {
      setSearchParams({ job: String(selectedJob.id) }, { replace: true });
    }
  }, [searchParams, selectedJob, setSearchParams]);

  useEffect(() => {
    let mounted = true;

    const loadScreening = async () => {
      if (!selectedJob?.id) {
        setScreening([]);
        return;
      }

      setLoadingScreen(true);
      setError("");
      try {
        const data = await api.jobs.screen(selectedJob.id);
        if (!mounted) return;
        const nextScreening = Array.isArray(data) ? data : [];
        setScreening(nextScreening);
        setShortlistedIds(
          nextScreening
            .filter((item) => Boolean(item.is_shortlisted))
            .map((item) => item.application_id),
        );
        setSelectedResumeId((current) => current || nextScreening[0]?.resume?.id || null);
        setMessage(nextScreening.length ? "" : "Chưa có CV để sàng lọc.");
      } catch (loadError) {
        if (!mounted) return;
        setScreening([]);
        setSelectedResumeId(null);
        setError(loadError.message || "Không thể tải dữ liệu phân tích CV.");
      } finally {
        if (mounted) setLoadingScreen(false);
      }
    };

    loadScreening();

    return () => {
      mounted = false;
    };
  }, [selectedJob?.id]);

  const filteredScreening = useMemo(() => {
    const keyword = normalizeText(query);
    return screening
      .filter((item) => {
        const score = Number(item.score || 0);
        const scoreMatch =
          scoreFilter === "all" ||
          (scoreFilter === "90" && score >= 90) ||
          (scoreFilter === "80" && score >= 80) ||
          (scoreFilter === "70" && score >= 70);

        const resume = item.resume || {};
        const haystack = normalizeText(
          [
            resume.candidate_name,
            resume.title,
            resume.template_name,
            resume.structured_json?.headline,
            resume.structured_json?.summary,
            skillText(resume.tags),
          ].join(" "),
        );
        return (!keyword || haystack.includes(keyword)) && scoreMatch;
      })
      .sort((left, right) => {
        const leftShortlisted = shortlistedIds.includes(left.application_id) ? 1 : 0;
        const rightShortlisted = shortlistedIds.includes(right.application_id) ? 1 : 0;
        if (rightShortlisted !== leftShortlisted) {
          return rightShortlisted - leftShortlisted;
        }

        const scoreDiff = Number(right.score || 0) - Number(left.score || 0);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }

        const rightShortlistedAt = right.shortlisted_at ? Date.parse(right.shortlisted_at) : 0;
        const leftShortlistedAt = left.shortlisted_at ? Date.parse(left.shortlisted_at) : 0;
        return rightShortlistedAt - leftShortlistedAt;
      });
  }, [query, scoreFilter, screening, shortlistedIds]);

  useEffect(() => {
    if (!filteredScreening.length) {
      setSelectedResumeId(null);
      return;
    }
    if (!filteredScreening.some((item) => item.resume?.id === selectedResumeId)) {
      setSelectedResumeId(filteredScreening[0].resume?.id || null);
    }
  }, [filteredScreening, selectedResumeId]);

  const selectedResult = useMemo(
    () => filteredScreening.find((item) => item.resume?.id === selectedResumeId) || filteredScreening[0] || null,
    [filteredScreening, selectedResumeId],
  );

  const selectedStructuredSkills = useMemo(
    () => parseStructuredSkills(selectedResult?.resume?.structured_json?.skills),
    [selectedResult],
  );

  const aiRecommendation = useMemo(
    () => cleanInsightText(selectedResult?.insights?.recommendation),
    [selectedResult],
  );

  const aiStrengths = useMemo(
    () => cleanInsightList(selectedResult?.insights?.strengths),
    [selectedResult],
  );

  const aiConcerns = useMemo(
    () => cleanInsightList(selectedResult?.insights?.concerns),
    [selectedResult],
  );

  const jobApplicantCount = useMemo(
    () => applications.filter((app) => app.job_id === selectedJob?.id).length,
    [applications, selectedJob?.id],
  );

  const metrics = useMemo(() => {
    const scores = filteredScreening.map((item) => Number(item.score || 0));
    const average = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
    const shortlisted = filteredScreening.filter((item) => Number(item.score || 0) >= 80).length;
    const premium = filteredScreening.filter((item) => Number(item.score || 0) >= 90).length;
    return [
      { label: "CV đã chấm", value: filteredScreening.length, hint: "Kết quả theo tin đang chọn" },
      { label: "Điểm trung bình", value: average ? average.toFixed(1) : "0.0", hint: "Mức phù hợp tổng quan" },
      { label: "Nên phỏng vấn", value: shortlisted, hint: "Điểm từ 80 trở lên" },
      { label: "Rất phù hợp", value: premium, hint: "Điểm từ 90 trở lên" },
    ];
  }, [filteredScreening]);

  const skillInsights = useMemo(() => {
    const counter = new Map();
    filteredScreening.forEach((item) => {
      (item.resume?.tags || []).forEach((tag) => {
        const next = (counter.get(tag.name) || 0) + 1;
        counter.set(tag.name, next);
      });
    });
    return [...counter.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 6);
  }, [filteredScreening]);

  const averageScore = metrics[1]?.value || "0.0";

  const handleSelectJob = (job) => {
    if (!job?.id) return;
    setSearchParams({ job: String(job.id) }, { replace: true });
    setSelectedResumeId(null);
  };

  const toggleShortlist = async (resultItem) => {
    const applicationId = resultItem?.application_id;
    if (!applicationId) return;

    const isCurrentlyShortlisted = shortlistedIds.includes(applicationId);
    setShortlistBusyId(applicationId);
    try {
      const response = await api.applications.setShortlist(applicationId, !isCurrentlyShortlisted);
      const isShortlistedNext = Boolean(response?.is_shortlisted);
      setShortlistedIds((current) =>
        isShortlistedNext
          ? (current.includes(applicationId) ? current : [...current, applicationId])
          : current.filter((id) => id !== applicationId),
      );
      setScreening((current) =>
        current.map((item) =>
          item.application_id === applicationId
            ? {
                ...item,
                is_shortlisted: isShortlistedNext,
                shortlisted_at: response?.shortlisted_at || null,
              }
            : item,
        ),
      );
    } catch (err) {
      setError(err.message || "Không thể cập nhật trạng thái ưu tiên.");
    } finally {
      setShortlistBusyId(null);
    }
  };

  return (
    <section className="cv-screening-page">
      <section className="cv-screening-hero rw-card-lg">
        <div>
          <span className="eyebrow">Nhà tuyển dụng</span>
          <h1 className="rw-heading-xl">Phân tích sàng lọc CV</h1>
          <p className="cv-screening-hero-lead">
            Chọn một tin tuyển dụng để xem danh sách CV đã được hệ thống chấm điểm, sau đó lọc nhanh theo điểm và mở chi tiết từng hồ sơ.
          </p>
          <div className="cv-screening-hero-actions">
            <Link className="btn" to={ROUTES.recruiter.jobs}>Quay lại tin tuyển dụng</Link>
            <Link className="rw-btn-outline-lg" to={ROUTES.recruiter.jobCreate}>Đăng tin mới</Link>
          </div>
        </div>
        <article className="cv-screening-focus-card">
          <span className="rw-muted-xs--blue">Tin đang sàng lọc</span>
          <h2 className="rw-heading-2xl" style={{ marginTop: "0.35rem" }}>{selectedJob?.title || "Chưa chọn tin"}</h2>
          <p className="cv-screening-focus-summary">
            {selectedJob?.summary || "Chọn một tin tuyển dụng để xem kết quả phân tích CV."}
          </p>
          <div className="cv-screening-focus-meta">
            <div><span>Công ty</span><strong>{company?.company_name || "Chưa có"}</strong></div>
            <div><span>Số hồ sơ</span><strong>{String(jobApplicantCount).padStart(2, "0")}</strong></div>
            <div><span>Trạng thái</span><strong>{mapStatusLabel(selectedJob?.status)}</strong></div>
            <div><span>Điểm trung bình</span><strong>{averageScore}</strong></div>
          </div>
        </article>
      </section>

      {error ? <div className="rw-alert-error">{error}</div> : null}
      {message ? <div className="rw-alert-info">{message}</div> : null}

      <div className="cv-screening-toolbar rw-card">
        <div className="cv-screening-toolbar-search">
          <label>
            <span>Tìm hồ sơ</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên ứng viên, kỹ năng, tiêu đề..." />
          </label>
          <label>
            <span>Ngưỡng điểm</span>
            <select value={scoreFilter} onChange={(event) => setScoreFilter(event.target.value)}>
              <option value="all">Tất cả</option>
              <option value="90">Từ 90+</option>
              <option value="80">Từ 80+</option>
              <option value="70">Từ 70+</option>
            </select>
          </label>
        </div>
        <div className="cv-screening-toolbar-note">
          <strong>Dữ liệu hệ thống</strong>
          <span>
            {loadingJobs || loadingScreen
              ? "Đang tải dữ liệu..."
              : "Sẵn sàng sàng lọc"}
          </span>
        </div>
      </div>

      <div className="cv-screening-layout">
        <aside className="cv-screening-sidebar">
          <section className="rw-card cv-screening-card">
            <div className="rw-flex-between">
              <div>
                <h3 className="cv-screening-card-title">Danh sách tin tuyển dụng</h3>
                <p className="cv-screening-card-desc">Chọn tin để xem CV phù hợp nhất.</p>
              </div>
              <span className="rw-badge rw-badge-slate">{jobs.length} tin tuyển dụng</span>
            </div>
            <div className="cv-screening-job-list">
              {jobs.map((job) => {
                const active = selectedJob?.id === job.id;
                const count = applications.filter((app) => app.job_id === job.id).length;
                return (
                  <button
                    key={job.id}
                    type="button"
                    className={active ? "cv-screening-job-item cv-screening-job-item--active" : "cv-screening-job-item"}
                    onClick={() => handleSelectJob(job)}
                  >
                    <strong>{job.title}</strong>
                    <span>{job.company?.company_name || company?.company_name || "Chưa có công ty"}</span>
                    <div className="cv-screening-job-item-meta">
                      <span>{mapStatusLabel(job.status)}</span>
                      <span>{count} CV</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        <main className="cv-screening-main">
          <section className="cv-screening-metrics">
            {metrics.map((metric) => (
              <article key={metric.label} className="cv-screening-metric-card">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <p>{metric.hint}</p>
              </article>
            ))}
          </section>

          <section className="rw-card cv-screening-card">
            <div className="rw-flex-between" style={{ marginBottom: "0.75rem" }}>
              <div>
                <h3 className="cv-screening-card-title">Kết quả sàng lọc</h3>
                <p className="cv-screening-card-desc">Danh sách CV đã được chấm điểm theo tin hiện tại.</p>
              </div>
              <span className="rw-badge rw-badge-blue">{filteredScreening.length} kết quả</span>
            </div>

            <div className="cv-screening-result-list">
              {filteredScreening.length ? (
                filteredScreening.map((item) => {
                  const resume = item.resume || {};
                  const band = scoreBand(Number(item.score || 0));
                  const selected = selectedResumeId === resume.id;
                  const shortlisted = shortlistedIds.includes(item.application_id);
                  return (
                    <article
                      key={resume.id}
                      className={selected ? "cv-screening-result-card cv-screening-result-card--active" : "cv-screening-result-card"}
                      onClick={() => setSelectedResumeId(resume.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="cv-screening-result-top">
                        <div>
                          <div className="cv-screening-result-head">
                            <h4>{resume.candidate_name || resume.title}</h4>
                            <span className={`cv-screening-score cv-screening-score--${band.tone}`}>{Number(item.score || 0).toFixed(1)}</span>
                          </div>
                          <p>{resume.structured_json?.headline || resume.title || "Chưa có tiêu đề"}</p>
                        </div>
                        <span className="rw-badge rw-badge-slate">{shortlisted ? "Đã ưu tiên" : shortlistLabel(Number(item.score || 0))}</span>
                      </div>

                      <div className="cv-screening-result-meta">
                        <span>CV: {resume.title || "Chưa có"}</span>
                        <span>Kinh nghiệm: {resume.structured_json?.years_experience ?? 0} năm</span>
                        <span>Địa điểm: {resume.structured_json?.desired_location || "Chưa có"}</span>
                        <span>Cập nhật: {formatDateTime(resume.updated_at)}</span>
                      </div>

                      <div className="cv-screening-tags">
                        {(resume.tags || []).slice(0, 5).map((tag) => (
                          <span key={tag.id || tag.slug} className="cv-screening-tag">{tag.name}</span>
                        ))}
                      </div>

                      <div className="cv-screening-breakdown">
                        {Object.entries(item.breakdown || {}).map(([key, value]) => (
                          <div key={key}>
                            <span>{key}</span>
                            <strong>{Number(value || 0).toFixed(1)}</strong>
                          </div>
                        ))}
                      </div>

                      <div className="cv-screening-result-actions">
                        <button
                          type="button"
                          className={shortlisted ? "rw-btn-outline-lg cv-screening-shortlist cv-screening-shortlist--active" : "rw-btn-outline-lg cv-screening-shortlist"}
                          disabled={shortlistBusyId === item.application_id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void toggleShortlist(item);
                          }}
                        >
                          {shortlistBusyId === item.application_id ? "Đang lưu..." : shortlisted ? "Đã ưu tiên" : "Ưu tiên"}
                        </button>
                        <span className={`cv-screening-band cv-screening-band--${band.tone}`}>{band.label}</span>
                      </div>
                    </article>
                  );
                })
              ) : loadingScreen ? (
                <div className="cv-screening-empty">Đang tải kết quả sàng lọc...</div>
              ) : (
                <div className="cv-screening-empty">Chưa có CV phù hợp cho tin này.</div>
              )}
            </div>
          </section>
        </main>

        <aside className="cv-screening-insights">
          <section className="rw-card cv-screening-card">
            <h3 className="cv-screening-card-title">Hồ sơ đang xem</h3>
            {selectedResult ? (
              <>
                <div className="cv-screening-detail-score">
                  <span>{Number(selectedResult.score || 0).toFixed(1)}</span>
                  <div>
                    <strong>{selectedResult.resume?.candidate_name || selectedResult.resume?.title}</strong>
                    <p>{selectedResult.resume?.structured_json?.headline || selectedResult.resume?.title}</p>
                  </div>
                </div>
                <div className="cv-screening-detail-grid">
                  <div><span>Loại CV</span><strong>{mapResumeSourceLabel(selectedResult.resume?.source_type)}</strong></div>
                  <div><span>Mẫu CV</span><strong>{selectedResult.resume?.template_name || "Chưa có"}</strong></div>
                  <div><span>Ngày cập nhật</span><strong>{formatDate(selectedResult.resume?.updated_at)}</strong></div>
                  <div><span>Kỹ năng</span><strong>{selectedStructuredSkills.length}</strong></div>
                </div>
                <div className="cv-screening-detail-block">
                  <span>Tóm tắt</span>
                  <p>{selectedResult.resume?.structured_json?.summary || "Chưa có tóm tắt."}</p>
                </div>
                <div className="cv-screening-detail-block">
                  <span>Kỹ năng</span>
                  <div className="cv-screening-tags">
                    {selectedStructuredSkills.length
                      ? selectedStructuredSkills.map((skill) => (
                          <span key={skill} className="cv-screening-tag">{skill}</span>
                        ))
                      : <span>Chưa có kỹ năng</span>}
                  </div>
                </div>
                <div className="cv-screening-detail-block">
                  <span>Học vấn</span>
                  <p>{selectedResult.resume?.structured_json?.education || "Chưa có"}</p>
                </div>
                <div className="cv-screening-detail-block">
                  <span>Nhận định AI</span>
                  <p>{aiRecommendation || "Chưa có nhận định"}</p>
                  <p style={{ marginTop: "0.5rem" }}>
                    Điểm mạnh: {aiStrengths.join(", ") || "Chưa có"}
                  </p>
                  <p style={{ marginTop: "0.35rem" }}>
                    Rủi ro: {aiConcerns.join(", ") || "Chưa có"}
                  </p>
                </div>
              </>
            ) : (
              <div className="cv-screening-empty">Chọn một hồ sơ để xem chi tiết.</div>
            )}
          </section>

          <section className="rw-card cv-screening-card">
            <h3 className="cv-screening-card-title">Lưu ý phân tích</h3>
            <div className="cv-screening-notes">
              <div>
                <strong>Điểm cao</strong>
                <span>Ưu tiên mời phỏng vấn.</span>
              </div>
              <div>
                <strong>Nút Ưu tiên</strong>
                <span>Lưu hồ sơ vào danh sách ứng viên nổi bật của tin tuyển dụng và giữ lại sau khi tải lại trang.</span>
              </div>
              <div>
                <strong>Điểm trung bình</strong>
                <span>Đọc kỹ tóm tắt và kinh nghiệm.</span>
              </div>
              <div>
                <strong>Điểm thấp</strong>
                <span>Đối chiếu lại thẻ kỹ năng và cấp độ kinh nghiệm.</span>
              </div>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <div className="cv-screening-detail-block">
                <span>Kỹ năng nổi bật</span>
                <p>{skillInsights.length ? skillInsights.map((item) => `${item.name} (${item.count})`).join(", ") : "Chưa có dữ liệu"}</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

