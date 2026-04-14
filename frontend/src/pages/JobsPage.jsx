import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { ROUTES } from "../routes";
import LandingJobCard from "../components/landing/LandingJobCard";

const PAGE_SIZE = 8;
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
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

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

  const locations = useMemo(() => {
    return [...new Set(jobs.map((job) => job.location).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  }, [jobs]);

  const experiences = useMemo(() => {
    return [...new Set(jobs.map((job) => job.experience_level).filter(Boolean))].sort((left, right) =>
      left.localeCompare(right)
    );
  }, [jobs]);

  const workplaces = useMemo(() => {
    return [...new Set(jobs.map((job) => job.workplace_type).filter(Boolean))].sort((left, right) =>
      left.localeCompare(right)
    );
  }, [jobs]);

  const employmentTypes = useMemo(() => {
    return [...new Set(jobs.map((job) => job.employment_type).filter(Boolean))].sort((left, right) =>
      left.localeCompare(right)
    );
  }, [jobs]);

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
    return categories
      .filter((category) => category?.is_active !== false)
      .map((category) => ({ value: category.slug, label: category.name }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [categories]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const companyName = job.company?.company_name || job.company || "";
      const tags = (job.tags || []).map((tag) => tag.name).join(" ");
      const haystack = normalizeText(
        [job.title, job.summary, job.description, job.requirements, job.location, job.experience_level, companyName, tags].join(" ")
      );
      const query = normalizeText(filters.q);
      const matchesQuery = !query || haystack.includes(query);
      const matchesLocation = !filters.location || normalizeText(job.location || "") === normalizeText(filters.location);
      const matchesExperience = !filters.experience || normalizeText(job.experience_level || "").includes(normalizeText(filters.experience));
      const matchesWorkplace = !filters.workplace || normalizeText(job.workplace_type || "").includes(normalizeText(filters.workplace));
      const matchesEmployment = !filters.employment || normalizeText(job.employment_type || "").includes(normalizeText(filters.employment));
      const matchesIndustry = !filters.industry || (job.tags || []).some((tag) => tag.category === filters.industry);
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

  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageJobs = sortedJobs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

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
            <strong>{loading ? "..." : sortedJobs.length}</strong>
            <span>Việc làm phù hợp</span>
          </article>
          <article>
            <strong>{loading ? "..." : industryOptions.length}</strong>
            <span>Ngành nghề</span>
          </article>
          <article>
            <strong>{loading ? "..." : tagOptions.length}</strong>
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
          <div className="jobs-toolbar panel">
            <div>
              <span className="eyebrow">Kết quả</span>
              <h2>{loading ? "Đang tải việc làm..." : `${sortedJobs.length} tin tuyển dụng`}</h2>
              <p>{activeFilterCount ? `Đang áp dụng ${activeFilterCount} bộ lọc.` : "Khám phá các việc làm mới nhất từ database."}</p>
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
            <div className="jobs-empty panel">Đang tải dữ liệu tin tuyển dụng...</div>
          ) : pageJobs.length ? (
            <>
              <div className="jobs-results-grid">
                {pageJobs.map((job) => (
                  <LandingJobCard key={job.id} job={job} />
                ))}
              </div>

              <div className="jobs-pagination panel">
                <button type="button" className="btn btn-ghost btn-small" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1}>
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
