import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { ROUTES } from "../routes";
import LandingSearchBar from "../components/landing/LandingSearchBar";
import LandingJobCard from "../components/landing/LandingJobCard";
import LandingEmployerCard from "../components/landing/LandingEmployerCard";
import { Skeleton, SkeletonJobCard } from "../components/Skeleton";

const CHIP_OPTIONS = ["Tất cả", "IT", "Marketing", "Kế toán", "Junior", "Middle", "Senior", "Remote"];
const LEVELS = ["Junior", "Middle", "Senior", "Lead"];

export default function LandingPage() {
  const [jobs, setJobs] = useState([]);
  const [industryTags, setIndustryTags] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedChip, setSelectedChip] = useState("Tất cả");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [filters, setFilters] = useState({
    keyword: "",
    location: "",
    level: "",
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      api.jobs.list("?status=published"),
      api.tags.list("?category=industry"),
      api.companies.featured(),
    ])
      .then(([jobData, tagData, companyData]) => {
        if (!active) return;
        setJobs(Array.isArray(jobData) ? jobData : []);
        setIndustryTags(Array.isArray(tagData) ? tagData : []);
        setCompanies(Array.isArray(companyData) ? companyData : []);
      })
      .catch(() => {
        if (!active) return;
        setJobs([]);
        setIndustryTags([]);
        setCompanies([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setStatsLoading(true);
    setStatsError(false);

    api.statistics
      .landing()
      .then((data) => {
        if (!active) return;
        setStats({
          total_jobs: Number(data?.total_jobs || 0),
          total_employers: Number(data?.total_employers || 0),
          total_categories: Number(data?.total_categories || 0),
          total_cv_templates: Number(data?.total_cv_templates || 0),
        });
      })
      .catch(() => {
        if (!active) return;
        setStats(null);
        setStatsError(true);
      })
      .finally(() => {
        if (active) setStatsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const orderedJobs = useMemo(() => {
    return [...jobs].sort((left, right) => Number(right.is_featured) - Number(left.is_featured));
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const keyword = normalizeText(filters.keyword);

    return orderedJobs.filter((job) => {
      const companyName = job.company?.company_name || job.company || "";
      const tags = (job.tags || []).map((tag) => tag.name).join(" ");
      const haystack = normalizeText(
        [job.title, companyName, job.location, job.summary, tags, job.experience_level, job.workplace_type].join(" ")
      );

      return (
        (!keyword || haystack.includes(keyword)) &&
        (!filters.location || normalizeText(job.location || "") === normalizeText(filters.location)) &&
        (!filters.level || normalizeText(job.experience_level || "").includes(normalizeText(filters.level))) &&
        matchesChip(job, selectedChip)
      );
    });
  }, [filters, orderedJobs, selectedChip]);

  const locations = useMemo(() => {
    const values = jobs.map((job) => job.location).filter(Boolean);
    return [...new Set(values)].slice(0, 8);
  }, [jobs]);

  const industrySource = useMemo(() => {
    return industryTags.map((tag) => ({
      name: tag.name,
      summary: tag.description || tag.category_name || "Xem việc làm liên quan",
    }));
  }, [industryTags]);

  const employerSource = useMemo(() => {
    return [...companies].sort((left, right) => Number(right.openings || 0) - Number(left.openings || 0));
  }, [companies]);

  const statCards = [
    { label: "Tin tuyển dụng", value: getStatValue(stats, statsLoading, statsError, "total_jobs") },
    { label: "Nhà tuyển dụng", value: getStatValue(stats, statsLoading, statsError, "total_employers") },
    { label: "Ngành nghề", value: getStatValue(stats, statsLoading, statsError, "total_categories") },
    { label: "CV mẫu", value: getStatValue(stats, statsLoading, statsError, "total_cv_templates") },
  ];

  const heroHighlights = [
    { label: "Tin mới", value: "Cập nhật liên tục" },
    { label: "Lọc nhanh", value: "Theo ngành và địa điểm" },
    { label: "Ứng tuyển", value: "Một bước rõ ràng" },
  ];

  const handleSearchChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    document.getElementById("jobs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleIndustryClick = (name) => {
    setSelectedChip(name);
    document.getElementById("jobs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="landing-page">
      <section className="landing-hero panel" id="home">
        <div className="landing-hero-copy">
          <span className="eyebrow">JOBPORTAL</span>
          <h1>Khám phá việc làm phù hợp với bạn</h1>
          <p className="lead">
            Tìm kiếm công việc theo kỹ năng, địa điểm và cấp bậc trên một nền tảng gọn gàng, rõ ràng và dễ dùng.
          </p>
          <p className="landing-subtitle">
            Tin tuyển dụng, công ty nổi bật và bộ lọc nhanh giúp bạn chạm đúng cơ hội trong vài thao tác.
          </p>

          <LandingSearchBar
            keyword={filters.keyword}
            location={filters.location}
            level={filters.level}
            locations={locations}
            levels={LEVELS}
            onChange={handleSearchChange}
            onSubmit={handleSearchSubmit}
          />

          <div className="hero-actions hero-actions--landing">
            <Link className="btn" to={ROUTES.jobs}>
              Tìm việc ngay
            </Link>
            <Link className="btn btn-ghost" to={ROUTES.auth}>
              Đăng nhập / Đăng ký
            </Link>
          </div>

          <div className="landing-hero-bullets">
            {heroHighlights.map((item) => (
              <div key={item.label} className="landing-bullet">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="landing-hero-panel">
          <div className="hero-radar-card hero-radar-card--soft">
            <div className="hero-radar-header">
              <span className="card-badge card-badge--soft">Tổng quan nhanh</span>
              <h3>Hệ sinh thái việc làm đang hoạt động</h3>
            </div>
            <div className="hero-radar-stats">
              {statCards.map((item) => (
                <div key={item.label} className="hero-radar-stat">
                  <span>{item.label}</span>
                  <strong>{statsLoading ? <Skeleton className="skeleton-line" width="96px" height="20px" /> : item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="feature-list feature-list--landing">
            <div className="feature-list-head">
              <strong>Ngành nghề nổi bật</strong>
              <p>Lấy trực tiếp từ dữ liệu công khai trong database.</p>
            </div>

            {industrySource.length ? (
              <div className="feature-tag-grid">
                {industrySource.slice(0, 8).map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    className={`feature-tag-chip ${selectedChip === item.name ? "feature-tag-chip--active" : ""}`}
                    onClick={() => handleIndustryClick(item.name)}
                  >
                    <span>{item.name}</span>
                    <small>{item.summary}</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state--hero">Chưa có ngành nghề nào được cấu hình.</div>
            )}
          </div>
        </aside>
      </section>

      <section className="stats-row stats-row--landing" aria-label="Thống kê nổi bật">
        {statCards.map((item) => (
          <article key={item.label} className="stat-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="landing-section panel" id="jobs">
        <div className="section-head section-head--landing">
          <div>
            <span className="eyebrow">Việc làm nổi bật</span>
            <h2>Tin tuyển dụng mới nhất</h2>
            <p>Những cơ hội việc làm đang mở, được sắp xếp để người dùng lướt và ứng tuyển nhanh.</p>
          </div>
          <Link to={ROUTES.jobs}>Xem tất cả</Link>
        </div>

        <div className="filter-pills filter-pills--landing">
          {CHIP_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              className={`chip ${selectedChip === item ? "active-chip" : ""}`}
              onClick={() => setSelectedChip(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="skeleton-grid skeleton-grid--jobs">
            {Array.from({ length: 4 }, (_, index) => (
              <SkeletonJobCard key={index} />
            ))}
          </div>
        ) : filteredJobs.length ? (
          <div className="landing-job-grid">
            {filteredJobs.map((job) => (
              <LandingJobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="empty-state empty-state--hero">Không tìm thấy tin tuyển dụng phù hợp.</div>
        )}
      </section>

      <section className="landing-section panel" id="employers">
        <div className="section-head section-head--landing">
          <div>
            <span className="eyebrow">Nhà tuyển dụng</span>
            <h2>Nổi bật</h2>
            <p>Các doanh nghiệp đang có nhu cầu tuyển dụng cao và mức độ hiện diện tốt trên hệ thống.</p>
          </div>
          <Link to={ROUTES.jobs}>Xem việc làm</Link>
        </div>

        {employerSource.length ? (
          <div className="landing-employer-grid">
            {employerSource.slice(0, 6).map((employer) => (
              <LandingEmployerCard key={employer.id} employer={employer} />
            ))}
          </div>
        ) : (
          <div className="empty-state empty-state--hero">Chưa có nhà tuyển dụng nào được hiển thị.</div>
        )}
      </section>
    </div>
  );
}

function getStatValue(stats, loading, errored, key) {
  if (loading) return "";
  if (errored) return "N/A";
  const value = stats?.[key];
  return Number.isFinite(value) ? value : 0;
}

function matchesChip(job, chip) {
  if (chip === "Tất cả") return true;

  const companyName = job.company?.company_name || job.company || "";
  const tagNames = (job.tags || []).map((tag) => tag.name.toLowerCase()).join(" ");
  const haystack = [job.title, companyName, job.location, job.summary, tagNames, job.experience_level, job.workplace_type]
    .join(" ")
    .toLowerCase();

  if (chip === "Junior" || chip === "Middle" || chip === "Senior") {
    return haystack.includes(chip.toLowerCase());
  }
  if (chip === "Remote") {
    return haystack.includes("remote");
  }
  if (chip === "Kế toán") {
    return haystack.includes("kế toán") || haystack.includes("ke toan") || haystack.includes("finance");
  }
  if (chip === "IT") {
    return ["it", "react", "flask", "frontend", "backend", "ui/ux", "qa", "data", "developer", "software"].some((item) =>
      haystack.includes(item)
    );
  }
  if (chip === "Marketing") {
    return ["marketing", "content", "brand", "digital", "seo", "performance"].some((item) => haystack.includes(item));
  }
  return haystack.includes(chip.toLowerCase());
}

function normalizeText(value) {
  return stripDiacritics(String(value || "").toLowerCase().trim());
}

function stripDiacritics(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
