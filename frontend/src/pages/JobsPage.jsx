import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { api } from "../api";
import LandingJobCard from "../components/landing/LandingJobCard";
import { Skeleton, SkeletonJobCard } from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../routes";

const PAGE_SIZE = 6;
const DEBOUNCE_MS = 400;
const MIN_SUITABLE_MATCH_SCORE = 55;
const SORT_OPTIONS = [
  { value: "featured", label: "Nổi bật trước" },
  { value: "newest", label: "Mới nhất" },
  { value: "salary_desc", label: "Lương cao nhất" },
  { value: "salary_asc", label: "Lương thấp nhất" },
];

const DEFAULT_FILTERS = {
  q: "",
  location: "",
  industry: "",
  experience: "",
  workplace: "",
  employment: "",
  tag: "",
  sort: "featured",
};

const EMPTY_OPTIONS = { locations: [], experiences: [], workplaces: [], employments: [], industries: [], tags: [] };

export default function JobsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const initialQuery = useMemo(() => new URLSearchParams(location.search).get("q") || "", [location.search]);

  const [filterOptions, setFilterOptions] = useState(EMPTY_OPTIONS);
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, q: initialQuery });
  const [page, setPage] = useState(1);
  const [debouncedQ, setDebouncedQ] = useState(initialQuery);

  const [enrichedRecommendations, setEnrichedRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");
  const [hasResume, setHasResume] = useState(false);

  useEffect(() => {
    api.jobs.filterOptions()
      .then((data) => { if (data && typeof data === "object") setFilterOptions({ ...EMPTY_OPTIONS, ...data }); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.q]);

  useEffect(() => {
    setPage(1);
  }, [filters.location, filters.industry, filters.experience, filters.workplace, filters.employment, filters.tag, filters.sort, debouncedQ]);

  useEffect(() => {
    setFilters((current) => {
      if (current.q === initialQuery) return current;
      return { ...current, q: initialQuery };
    });
  }, [initialQuery]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    api.jobs.list({
      status: "published",
      q: debouncedQ,
      location: filters.location,
      industry: filters.industry,
      experience: filters.experience,
      workplace: filters.workplace,
      employment: filters.employment,
      tag: filters.tag,
      sort: filters.sort,
      page,
      per_page: PAGE_SIZE,
    })
      .then((data) => {
        if (!active) return;
        setJobs(Array.isArray(data?.items) ? data.items : []);
        setTotal(Number(data?.total) || 0);
        setTotalPages(Number(data?.total_pages) || 1);
      })
      .catch(() => {
        if (!active) return;
        setJobs([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [debouncedQ, filters.location, filters.industry, filters.experience, filters.workplace, filters.employment, filters.tag, filters.sort, page]);

  useEffect(() => {
    if (user?.role !== "candidate") {
      setEnrichedRecommendations([]);
      setRecommendationsLoading(false);
      setRecommendationsError("");
      setHasResume(false);
      return undefined;
    }

    let active = true;
    setRecommendationsLoading(true);
    setRecommendationsError("");

    Promise.all([api.resumes.recommendations(), api.resumes.list().catch(() => [])])
      .then(async ([recommendationData, resumesData]) => {
        if (!active) return;
        setHasResume(Array.isArray(resumesData) && resumesData.length > 0);

        const recs = Array.isArray(recommendationData) ? recommendationData : [];
        const bestByJob = new Map();
        recs.forEach((item) => {
          const jobId = Number(item.job_id);
          const score = Number(item.score || 0);
          const curr = bestByJob.get(jobId);
          if (!curr || score > curr.score) bestByJob.set(jobId, item);
        });
        const topItems = [...bestByJob.values()].sort((a, b) => b.score - a.score).slice(0, 3);

        const jobDetails = await Promise.all(
          topItems.map((item) => api.jobs.detail(item.job_id).catch(() => null))
        );

        if (!active) return;
        const enriched = topItems
          .map((item, i) => jobDetails[i] ? ({
            ...jobDetails[i],
            match_score: item.score,
            match_breakdown: item.breakdown || {},
            resume_id: item.resume_id,
          }) : null)
          .filter(Boolean);

        setEnrichedRecommendations(enriched);
      })
      .catch((error) => {
        if (!active) return;
        setEnrichedRecommendations([]);
        setRecommendationsError(error?.message || "Không thể tải gợi ý phù hợp lúc này.");
        setHasResume(false);
      })
      .finally(() => { if (active) setRecommendationsLoading(false); });

    return () => { active = false; };
  }, [user?.id, user?.role]);

  const suitableRecommendedJobs = useMemo(
    () => enrichedRecommendations.filter((job) => Number(job.match_score || 0) >= MIN_SUITABLE_MATCH_SCORE),
    [enrichedRecommendations],
  );

  const referenceRecommendedJobs = useMemo(
    () => enrichedRecommendations.filter((job) => Number(job.match_score || 0) < MIN_SUITABLE_MATCH_SCORE),
    [enrichedRecommendations],
  );

  const recommendationMode = suitableRecommendedJobs.length ? "suitable" : "reference";
  const recommendationDisplayJobs = useMemo(() => {
    const suitableItems = suitableRecommendedJobs.map((job) => ({ ...job, recommendation_label: "suitable" }));
    const remainingSlots = Math.max(0, 3 - suitableItems.length);
    const referenceItems = referenceRecommendedJobs
      .slice(0, remainingSlots)
      .map((job) => ({ ...job, recommendation_label: "reference" }));
    return [...suitableItems, ...referenceItems];
  }, [referenceRecommendedJobs, suitableRecommendedJobs]);

  const safePage = Math.min(page, totalPages);
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => key !== "sort" && Boolean(value)).length;
  const showRecommendations = user?.role === "candidate";

  const updateFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <div className="jobs-page">
      <section className="jobs-hero panel">
        <div>
          <span className="eyebrow">JOBPORTAL</span>
          <h1>Tin tuyển dụng</h1>
          <p>Khám phá hàng trăm cơ hội việc làm theo ngành nghề, địa điểm, kinh nghiệm và hình thức làm việc.</p>
        </div>
        <div className="jobs-hero-metrics">
          <article>
            <strong>{loading ? <Skeleton className="skeleton-line" width="72px" height="20px" /> : total}</strong>
            <span>Việc làm phù hợp</span>
          </article>
          <article>
            <strong>{loading ? <Skeleton className="skeleton-line" width="72px" height="20px" /> : filterOptions.industries.length}</strong>
            <span>Ngành nghề</span>
          </article>
          <article>
            <strong>{loading ? <Skeleton className="skeleton-line" width="72px" height="20px" /> : filterOptions.tags.length}</strong>
            <span>Kỹ năng nổi bật</span>
          </article>
        </div>
      </section>

      <div className="jobs-layout">
        <aside className="jobs-sidebar panel">
          <div className="jobs-sidebar-head">
            <div>
              <span className="eyebrow">Bộ lọc</span>
              <h2>Tìm việc nhanh</h2>
            </div>
            <button type="button" className="text-link" onClick={clearFilters}>
              Xóa lọc
            </button>
          </div>

          <div className="jobs-filter-group">
            <label className="jobs-field">
              <span>Từ khóa</span>
              <input
                type="text"
                placeholder="Chức danh, kỹ năng, công ty..."
                value={filters.q}
                onChange={(event) => updateFilter("q", event.target.value)}
              />
            </label>

            <label className="jobs-field">
              <span>Địa điểm</span>
              <select value={filters.location} onChange={(event) => updateFilter("location", event.target.value)}>
                <option value="">Tất cả địa điểm</option>
                {filterOptions.locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </label>

            <label className="jobs-field">
              <span>Ngành nghề</span>
              <select value={filters.industry} onChange={(event) => updateFilter("industry", event.target.value)}>
                <option value="">Tất cả ngành nghề</option>
                {filterOptions.industries.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="jobs-field">
              <span>Kinh nghiệm</span>
              <select value={filters.experience} onChange={(event) => updateFilter("experience", event.target.value)}>
                <option value="">Tất cả mức</option>
                {filterOptions.experiences.map((exp) => (
                  <option key={exp} value={exp}>
                    {exp}
                  </option>
                ))}
              </select>
            </label>

            <label className="jobs-field">
              <span>Hình thức</span>
              <select value={filters.workplace} onChange={(event) => updateFilter("workplace", event.target.value)}>
                <option value="">Tất cả</option>
                {filterOptions.workplaces.map((wp) => (
                  <option key={wp} value={wp}>
                    {wp}
                  </option>
                ))}
              </select>
            </label>

            <label className="jobs-field">
              <span>Loại hình</span>
              <select value={filters.employment} onChange={(event) => updateFilter("employment", event.target.value)}>
                <option value="">Tất cả</option>
                {filterOptions.employments.map((emp) => (
                  <option key={emp} value={emp}>
                    {emp}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="jobs-filter-section">
            <h3>Kỹ năng nổi bật</h3>
            <div className="jobs-tag-list">
              {filterOptions.tags.map((tag) => (
                <button
                  key={tag.slug}
                  type="button"
                  className={`jobs-tag-chip ${filters.tag === tag.slug ? "jobs-tag-chip--active" : ""}`}
                  onClick={() => updateFilter("tag", filters.tag === tag.slug ? "" : tag.slug)}
                >
                  <span>{tag.name}</span>
                  <small>{tag.count}</small>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="jobs-main">
          {showRecommendations ? (
            <section className="jobs-recommendations panel">
              <div className="jobs-recommendations-head">
                <div>
                  <span className="eyebrow">Dành cho bạn</span>
                  <h2>{recommendationMode === "suitable" ? "Việc làm phù hợp với CV của bạn" : "Việc làm nên tham khảo thêm"}</h2>
                  <p>
                    {recommendationMode === "suitable"
                      ? "Gợi ý này dựa trên kỹ năng, địa điểm mong muốn, kinh nghiệm và nội dung CV của bạn."
                      : "Những tin dưới đây có một số điểm tương đồng với CV của bạn và có thể dùng để tham khảo thêm."}
                  </p>
                </div>
                <Link className="btn btn-ghost btn-small" to={ROUTES.candidate.resumes}>
                  Quản lý CV
                </Link>
              </div>

              {recommendationsLoading ? (
                <div className="jobs-recommendation-grid">
                  {Array.from({ length: 3 }, (_, index) => (
                    <SkeletonJobCard key={`recommendation-skeleton-${index}`} />
                  ))}
                </div>
              ) : recommendationsError ? (
                <div className="jobs-recommendation-empty">
                  <h3>Chưa tải được gợi ý cá nhân hóa.</h3>
                  <p>{recommendationsError}</p>
                </div>
              ) : recommendationDisplayJobs.length ? (
                <div className="jobs-recommendation-grid">
                  {recommendationDisplayJobs.map((job) => (
                    <article key={`recommended-${job.id}`} className="jobs-recommendation-card">
                      <div className="jobs-recommendation-top">
                        <div className="jobs-recommendation-company">
                          <span className="jobs-company-logo" aria-hidden="true">
                            {job.company?.logo_url ? (
                              <img src={job.company.logo_url} alt="" />
                            ) : (
                              <span>{getCompanyInitial(job.company?.company_name)}</span>
                            )}
                          </span>
                          <span className="jobs-recommendation-company-name">{job.company?.company_name || "Nhà tuyển dụng"}</span>
                        </div>
                        <div className="jobs-recommendation-headline">
                          <div className="jobs-recommendation-title-row">
                            <h3 className="jobs-recommendation-title">{job.title}</h3>
                            <div className="jobs-match-badge">
                              <span>{job.recommendation_label === "suitable" ? "Độ phù hợp" : "Tham khảo"}</span>
                              <strong>{Number(job.match_score || 0).toFixed(1)}</strong>
                            </div>
                          </div>
                          <p className="jobs-recommendation-meta">
                            {job.location} / {job.employment_type} / {job.experience_level}
                          </p>
                        </div>
                      </div>

                      <p className="jobs-recommendation-summary">
                        {job.summary || (job.recommendation_label === "suitable"
                          ? "Công việc này có nhiều tín hiệu trùng với thông tin hồ sơ và CV bạn đã lưu."
                          : "Tin này có một số điểm tương đồng với CV, bạn có thể xem thêm trước khi quyết định ứng tuyển.")}
                      </p>

                      <div className="jobs-match-breakdown">
                        {buildBetterMatchMetrics(job.match_breakdown).map((metric) => (
                          <div key={`${job.id}-${metric.key}`} className="jobs-match-metric">
                            <div className="jobs-match-metric-head">
                              <span>{metric.label}</span>
                              <span className="jobs-match-score-wrap">
                                <strong>{metric.value}</strong>
                                <span className="jobs-match-score-max">/{metric.max}</span>
                                <span className="jobs-match-score-info" aria-hidden="true">ⓘ</span>
                                <span className="jobs-match-score-tooltip" role="tooltip">
                                  <strong>{metric.label}</strong>
                                  <span>{metric.hint}</span>
                                  {metric.detailText && (
                                    <span className="jobs-match-tooltip-detail">{metric.detailText}</span>
                                  )}
                                  <em>{metric.value} / {metric.max} điểm tối đa</em>
                                </span>
                              </span>
                            </div>
                            <div className="jobs-match-meter">
                              <div className="jobs-match-meter-fill" style={{ width: `${metric.percent}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="jobs-recommendation-actions">
                        <Link className="btn btn-ghost btn-small" to={ROUTES.jobDetail(job.id)}>
                          Xem chi tiết
                        </Link>
                        <Link className="btn btn-small" to={ROUTES.jobDetail(job.id)}>
                          {job.recommendation_label === "suitable" ? "Ứng tuyển ngay" : "Xem thêm"}
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : hasResume ? (
                <div className="jobs-recommendation-empty">
                  <h3>Chưa tìm thấy việc phù hợp từ CV hiện tại.</h3>
                  <p>Bạn có thể cập nhật kỹ năng, kinh nghiệm, địa điểm mong muốn hoặc bổ sung thêm CV để nhận gợi ý sát hơn.</p>
                  <div className="jobs-recommendation-actions">
                    <Link className="btn btn-ghost btn-small" to={ROUTES.candidate.profile}>
                      Cập nhật hồ sơ
                    </Link>
                    <Link className="btn btn-small" to={ROUTES.candidate.resumes}>
                      Quản lý CV
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="jobs-recommendation-empty">
                  <h3>Chưa có đủ thông tin để gợi ý việc làm.</h3>
                  <p>Bạn chưa có CV nào. Hãy tạo hoặc tải CV lên để nhận gợi ý sát hơn với hồ sơ của bạn.</p>
                  <div className="jobs-recommendation-actions">
                    <Link className="btn btn-small" to={ROUTES.candidate.resumes}>
                      Tạo CV ngay
                    </Link>
                  </div>
                </div>
              )}
            </section>
          ) : null}

          <div className="jobs-toolbar panel">
            <div>
              <span className="eyebrow">Kết quả</span>
              <h2>{loading ? "Đang tải việc làm..." : `${total} tin tuyển dụng`}</h2>
              {activeFilterCount ? <p>{`Đang áp dụng ${activeFilterCount} bộ lọc.`}</p> : null}
            </div>

            <div className="jobs-toolbar-actions">
              <label className="jobs-sort">
                <span>Sắp xếp</span>
                <select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
                  {SORT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="jobs-results-grid">
              {Array.from({ length: 6 }, (_, index) => (
                <SkeletonJobCard key={index} />
              ))}
            </div>
          ) : jobs.length ? (
            <>
              <div className="jobs-results-grid">
                {jobs.map((job) => (
                  <LandingJobCard key={job.id} job={job} />
                ))}
              </div>

              <div className="jobs-pagination panel">
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={safePage === 1}
                >
                  Trang trước
                </button>
                <div className="jobs-pagination-pages">
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`jobs-page-btn ${item === safePage ? "jobs-page-btn--active" : ""}`}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={safePage === totalPages}
                >
                  Trang sau
                </button>
              </div>
            </>
          ) : (
            <div className="jobs-empty panel">
              <h3>Không tìm thấy tin tuyển dụng phù hợp.</h3>
              <p>Thử bỏ bớt bộ lọc hoặc đặt lại để xem nhiều cơ hội hơn.</p>
              <button type="button" className="btn btn-small" onClick={clearFilters}>
                Đặt lại bộ lọc
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function getCompanyInitial(name) {
  const value = String(name || "NTD").trim();
  return value.charAt(0).toUpperCase();
}

function formatBetterMetricDetail(key, detail) {
  if (!detail) return null;
  if (key === "text") {
    const skillTerms = (detail.matched_skill_terms || []).slice(0, 6);
    return skillTerms.length ? `Kỹ năng tìm thấy trong CV: ${skillTerms.join(", ")}` : "Chưa tìm thấy kỹ năng nổi bật trong nội dung CV.";
  }
  if (key === "tags") {
    const tags = detail.matched_tags || [];
    const skillsText = String(detail.skills_text || "").trim();
    if (tags.length && skillsText) {
      return `Kỹ năng liên quan trùng: ${tags.join(", ")}\nKỹ năng hiển thị trên CV: ${skillsText}`;
    }
    if (tags.length) {
      return `Kỹ năng liên quan trùng: ${tags.join(", ")}`;
    }
    return skillsText ? `Chưa có kỹ năng liên quan trùng. Kỹ năng hiển thị trên CV: ${skillsText}` : "Chưa có kỹ năng liên quan nào trùng.";
  }
  if (key === "location") {
    if (detail.is_remote) return "Công việc remote nên đạt điểm tối đa ở tiêu chí địa điểm.";
    if (!detail.desired_location) return "CV chưa khai báo địa điểm mong muốn.";
    return `CV mong muốn: ${detail.desired_location}\nCông việc tại: ${detail.job_location}`;
  }
  if (key === "experience") {
    const matched = Number(detail.resume_years || 0) >= Number(detail.required_years || 0);
    return matched
      ? `Đạt yêu cầu kinh nghiệm: ${detail.resume_years} năm / tối thiểu ${detail.required_years} năm`
      : `Chưa đạt yêu cầu kinh nghiệm: ${detail.resume_years} năm / tối thiểu ${detail.required_years} năm`;
  }
  return null;
}

function buildBetterMatchMetrics(breakdown) {
  const detail = breakdown?.detail || {};
  const hints = {
    text: "Đối chiếu nội dung CV với mô tả công việc để tìm các kỹ năng và kinh nghiệm liên quan.",
    tags: "Kỹ năng trong CV càng gần với yêu cầu công việc thì mức phù hợp càng cao.",
    location: "Ưu tiên các công việc gần với khu vực bạn mong muốn. Công việc remote thường phù hợp với nhiều địa điểm hơn.",
    experience: "So sánh số năm kinh nghiệm của bạn với yêu cầu trong tin tuyển dụng.",
  };

  return [
    { key: "text", label: "Nội dung CV", value: Number(breakdown?.text || 0), max: 35 },
    { key: "tags", label: "Kỹ năng liên quan", value: Number(breakdown?.tags || 0), max: 45 },
    { key: "location", label: "Địa điểm", value: Number(breakdown?.location || 0), max: 10 },
    { key: "experience", label: "Kinh nghiệm", value: Number(breakdown?.experience || 0), max: 10 },
  ].map((metric) => ({
    ...metric,
    hint: hints[metric.key] || "",
    detailText: formatBetterMetricDetail(metric.key, detail),
    value: metric.value.toFixed(1),
    percent: metric.max ? Math.min(100, (metric.value / metric.max) * 100) : 0,
  }));
}
