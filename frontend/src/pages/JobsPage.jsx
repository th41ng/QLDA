import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import LandingJobCard from "../components/landing/LandingJobCard";
import { Skeleton, SkeletonJobCard } from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../routes";

const PAGE_SIZE = 6;
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

export default function JobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");
  const [hasResume, setHasResume] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([api.jobs.list("?status=published"), api.tags.categories()])
      .then(([jobData, categoryData]) => {
        if (!active) return;
        setJobs(Array.isArray(jobData) ? jobData : []);
        setCategories(Array.isArray(categoryData) ? categoryData : []);
      })
      .catch(() => {
        if (!active) return;
        setJobs([]);
        setCategories([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    if (user?.role !== "candidate") {
      setRecommendations([]);
      setRecommendationsLoading(false);
      setRecommendationsError("");
      setHasResume(false);
      return undefined;
    }

    let active = true;
    setRecommendationsLoading(true);
    setRecommendationsError("");

    Promise.all([api.resumes.recommendations(), api.resumes.list().catch(() => [])])
      .then(([recommendationData, resumesData]) => {
        if (!active) return;
        setRecommendations(Array.isArray(recommendationData) ? recommendationData : []);
        setHasResume(Array.isArray(resumesData) && resumesData.length > 0);
      })
      .catch((error) => {
        if (!active) return;
        setRecommendations([]);
        setRecommendationsError(error?.message || "Không thể tải gợi ý phù hợp lúc này.");
        setHasResume(false);
      })
      .finally(() => {
        if (active) setRecommendationsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id, user?.role]);

  const locations = useMemo(
    () => [...new Set(jobs.map((job) => job.location).filter(Boolean))].sort((left, right) => left.localeCompare(right)),
    [jobs],
  );

  const experiences = useMemo(
    () => [...new Set(jobs.map((job) => job.experience_level).filter(Boolean))].sort((left, right) => left.localeCompare(right)),
    [jobs],
  );

  const workplaces = useMemo(
    () => [...new Set(jobs.map((job) => job.workplace_type).filter(Boolean))].sort((left, right) => left.localeCompare(right)),
    [jobs],
  );

  const employmentTypes = useMemo(
    () => [...new Set(jobs.map((job) => job.employment_type).filter(Boolean))].sort((left, right) => left.localeCompare(right)),
    [jobs],
  );

  const tagOptions = useMemo(() => {
    const map = new Map();
    jobs.forEach((job) => {
      (job.tags || []).forEach((tag) => {
        if (!map.has(tag.slug)) {
          map.set(tag.slug, { ...tag, count: 0 });
        }
        map.get(tag.slug).count += 1;
      });
    });
    return [...map.values()].sort((left, right) => right.count - left.count).slice(0, 12);
  }, [jobs]);

  const industryOptions = useMemo(() => {
    const map = new Map();
    jobs.forEach((job) => {
      (job.tags || []).forEach((tag) => {
        if (tag.category === "industry" && !map.has(tag.slug)) {
          map.set(tag.slug, { value: tag.slug, label: tag.name });
        }
      });
    });
    return [...map.values()].sort((left, right) => left.label.localeCompare(right.label));
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const companyName = job.company?.company_name || job.company || "";
      const tags = (job.tags || []).map((tag) => tag.name).join(" ");
      const haystack = normalizeText(
        [job.title, job.summary, job.description, job.requirements, job.location, job.experience_level, companyName, tags].join(" "),
      );
      const query = normalizeText(filters.q);
      const matchesQuery = !query || haystack.includes(query);
      const matchesLocation = !filters.location || normalizeText(job.location || "") === normalizeText(filters.location);
      const matchesExperience = !filters.experience || normalizeText(job.experience_level || "").includes(normalizeText(filters.experience));
      const matchesWorkplace = !filters.workplace || normalizeText(job.workplace_type || "").includes(normalizeText(filters.workplace));
      const matchesEmployment = !filters.employment || normalizeText(job.employment_type || "").includes(normalizeText(filters.employment));
      const matchesIndustry = !filters.industry || (job.tags || []).some((tag) => tag.slug === filters.industry && tag.category === "industry");
      const matchesTag = !filters.tag || (job.tags || []).some((tag) => tag.slug === filters.tag);

      return matchesQuery && matchesLocation && matchesExperience && matchesWorkplace && matchesEmployment && matchesIndustry && matchesTag;
    });
  }, [filters, jobs]);

  const sortedJobs = useMemo(() => {
    const list = [...filteredJobs];
    const salaryValue = (job) => Number(job.salary_max || job.salary_min || 0);
    list.sort((left, right) => {
      if (filters.sort === "newest") {
        return new Date(right.created_at || 0) - new Date(left.created_at || 0);
      }
      if (filters.sort === "salary_desc") {
        return salaryValue(right) - salaryValue(left);
      }
      if (filters.sort === "salary_asc") {
        return salaryValue(left) - salaryValue(right);
      }
      const featured = Number(right.is_featured) - Number(left.is_featured);
      if (featured !== 0) return featured;
      return new Date(right.created_at || 0) - new Date(left.created_at || 0);
    });
    return list;
  }, [filteredJobs, filters.sort]);

  const recommendedJobs = useMemo(() => {
    if (!recommendations.length || !jobs.length) return [];

    const jobsById = new Map(jobs.map((job) => [Number(job.id), job]));
    const bestMatches = new Map();

    recommendations.forEach((item) => {
      const jobId = Number(item.job_id);
      const job = jobsById.get(jobId);
      if (!job) return;

      const score = Number(item.score || 0);
      const current = bestMatches.get(jobId);
      if (!current || score > current.match_score) {
        bestMatches.set(jobId, {
          ...job,
          match_score: score,
          match_breakdown: item.breakdown || {},
          resume_id: item.resume_id,
        });
      }
    });

    return [...bestMatches.values()]
      .sort((left, right) => {
        const scoreDiff = Number(right.match_score || 0) - Number(left.match_score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        const featured = Number(right.is_featured) - Number(left.is_featured);
        if (featured !== 0) return featured;
        return new Date(right.created_at || 0) - new Date(left.created_at || 0);
      })
      .slice(0, 3);
  }, [jobs, recommendations]);

  const suitableRecommendedJobs = useMemo(
    () => recommendedJobs.filter((job) => Number(job.match_score || 0) >= MIN_SUITABLE_MATCH_SCORE),
    [recommendedJobs],
  );

  const referenceRecommendedJobs = useMemo(
    () => recommendedJobs.filter((job) => Number(job.match_score || 0) < MIN_SUITABLE_MATCH_SCORE),
    [recommendedJobs],
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

  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageJobs = sortedJobs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
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
            <strong>{loading ? <Skeleton className="skeleton-line" width="72px" height="20px" /> : sortedJobs.length}</strong>
            <span>Việc làm phù hợp</span>
          </article>
          <article>
            <strong>{loading ? <Skeleton className="skeleton-line" width="72px" height="20px" /> : industryOptions.length}</strong>
            <span>Ngành nghề</span>
          </article>
          <article>
            <strong>{loading ? <Skeleton className="skeleton-line" width="72px" height="20px" /> : tagOptions.length}</strong>
            <span>Tag nổi bật</span>
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
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>

            <label className="jobs-field">
              <span>Ngành nghề</span>
              <select value={filters.industry} onChange={(event) => updateFilter("industry", event.target.value)}>
                <option value="">Tất cả ngành nghề</option>
                {industryOptions.map((item) => (
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
                {experiences.map((experience) => (
                  <option key={experience} value={experience}>
                    {experience}
                  </option>
                ))}
              </select>
            </label>

            <label className="jobs-field">
              <span>Hình thức</span>
              <select value={filters.workplace} onChange={(event) => updateFilter("workplace", event.target.value)}>
                <option value="">Tất cả</option>
                {workplaces.map((workplace) => (
                  <option key={workplace} value={workplace}>
                    {workplace}
                  </option>
                ))}
              </select>
            </label>

            <label className="jobs-field">
              <span>Loại hình</span>
              <select value={filters.employment} onChange={(event) => updateFilter("employment", event.target.value)}>
                <option value="">Tất cả</option>
                {employmentTypes.map((employment) => (
                  <option key={employment} value={employment}>
                    {employment}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="jobs-filter-section">
            <h3>Tag nổi bật</h3>
            <div className="jobs-tag-list">
              {tagOptions.map((tag) => (
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
                      ? "Gợi ý này được chấm từ tag kỹ năng, địa điểm mong muốn, kinh nghiệm và phần nội dung CV đã được làm sạch."
                      : `Những tin dưới đây chưa đạt ngưỡng ${MIN_SUITABLE_MATCH_SCORE} điểm để gắn nhãn phù hợp, nên chỉ được hiển thị như danh sách tham khảo.`}
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
                          : "Tin này có một số tín hiệu trùng với CV, nhưng chưa đạt ngưỡng để xem là phù hợp cao.")}
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
                  <h3>Chưa có đủ dữ liệu để gợi ý việc làm.</h3>
                  <p>Bạn chưa có CV nào, nên hệ thống chưa thể đề xuất công việc phù hợp với hồ sơ của bạn.</p>
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
              <h2>{loading ? "Đang tải việc làm..." : `${sortedJobs.length} tin tuyển dụng`}</h2>
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
          ) : pageJobs.length ? (
            <>
              <div className="jobs-results-grid">
                {pageJobs.map((job) => (
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

function normalizeText(value) {
  return stripDiacritics(String(value || "").toLowerCase().trim());
}

function stripDiacritics(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getCompanyInitial(name) {
  const value = String(name || "NTD").trim();
  return value.charAt(0).toUpperCase();
}

function formatBetterMetricDetail(key, detail) {
  if (!detail) return null;
  if (key === "text") {
    const skillTerms = (detail.matched_skill_terms || []).slice(0, 6);
    return skillTerms.length ? `Kỹ năng tự do hỗ trợ: ${skillTerms.join(", ")}` : "Chưa có cụm từ nội dung sạch nào đủ mạnh để hiển thị.";
  }
  if (key === "tags") {
    const tags = detail.matched_tags || [];
    const skillsText = String(detail.skills_text || "").trim();
    if (tags.length && skillsText) {
      return `Tag kỹ năng trùng: ${tags.join(", ")}\nKỹ năng tự do đã khai báo: ${skillsText}`;
    }
    if (tags.length) {
      return `Tag kỹ năng trùng: ${tags.join(", ")}`;
    }
    return skillsText ? `Chưa có tag trùng. Kỹ năng tự do đã khai báo: ${skillsText}` : "Chưa có tag kỹ năng nào trùng.";
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
    text: "Nội dung CV chỉ là tín hiệu hỗ trợ. Chỉ hiển thị cụm từ kỹ năng tự do đã được làm sạch, không hiển thị token thô.",
    tags: "Tag kỹ năng là tín hiệu chính để chấm độ phù hợp. Càng nhiều tag trùng với job, điểm càng cao.",
    location: "Địa điểm mong muốn trong CV có khớp với địa điểm làm việc hay không. Công việc remote luôn đạt điểm tối đa.",
    experience: "So sánh số năm kinh nghiệm trong CV với mức kinh nghiệm tối thiểu của công việc.",
  };

  return [
    { key: "text", label: "Nội dung CV", value: Number(breakdown?.text || 0), max: 35 },
    { key: "tags", label: "Tag kỹ năng", value: Number(breakdown?.tags || 0), max: 45 },
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
