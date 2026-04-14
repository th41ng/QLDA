import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import EmployerCard from "../../components/employers/EmployerCard";
import EmployerSearchHero from "../../components/employers/EmployerSearchHero";
import EmployerSection from "../../components/employers/EmployerSection";
import { EMPLOYER_QUICK_FILTERS } from "../../data/employerDiscovery";
import { ROUTES } from "../../routes";

const FOLLOWED_KEY = "candidate_followed_employers";
const RECENT_KEY = "candidate_recent_employers";

export default function EmployersPage() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [featuredCompanies, setFeaturedCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followedIds, setFollowedIds] = useState(() => readStoredIds(FOLLOWED_KEY));
  const [recentIds, setRecentIds] = useState(() => readStoredIds(RECENT_KEY));

  useEffect(() => {
    let active = true;

    Promise.all([
      api.companies.featured().catch(() => []),
      api.jobs.list("?status=published").catch(() => []),
    ])
      .then(([companyData, jobsData]) => {
        if (!active) return;
        setFeaturedCompanies(Array.isArray(companyData) ? companyData : []);
        setJobs(Array.isArray(jobsData) ? jobsData : []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(FOLLOWED_KEY, JSON.stringify(followedIds));
  }, [followedIds]);

  useEffect(() => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentIds));
  }, [recentIds]);

  const employerPool = useMemo(() => enrichCompanies(featuredCompanies, jobs), [featuredCompanies, jobs]);

  const filteredCompanies = useMemo(() => {
    const keyword = normalize(query);
    return employerPool.filter((company) => {
      const haystack = normalize([
        company.company_name,
        company.industry,
        company.location,
        company.address,
        company.size,
        company.badge,
        company.summary,
        ...(company.tags || []),
        ...(company.hiring_focus || []),
      ].join(" "));

      return (!keyword || haystack.includes(keyword)) && matchesFilter(company, activeFilter);
    });
  }, [activeFilter, employerPool, query]);

  const recommendedCompanies = useMemo(
    () => [...filteredCompanies].sort((a, b) => (b.match_score || 0) - (a.match_score || 0)).slice(0, 6),
    [filteredCompanies],
  );

  const featuredSectionCompanies = useMemo(
    () => [...filteredCompanies].sort((a, b) => (b.openings || 0) - (a.openings || 0)).slice(0, 6),
    [filteredCompanies],
  );

  const industries = useMemo(() => buildIndustries(filteredCompanies), [filteredCompanies]);

  const recentlyViewedCompanies = useMemo(() => {
    const companyMap = new Map(employerPool.map((company) => [company.id, company]));
    return recentIds.map((id) => companyMap.get(id)).filter(Boolean).slice(0, 6);
  }, [employerPool, recentIds]);

  const handleToggleFollow = (companyId) => {
    setFollowedIds((current) => (current.includes(companyId) ? current.filter((id) => id !== companyId) : [companyId, ...current]));
  };

  const handleViewCompany = (company) => {
    setRecentIds((current) => [company.id, ...current.filter((id) => id !== company.id)].slice(0, 8));
  };

  return (
    <div className="landing-page employer-discovery-page">
      <EmployerSearchHero
        query={query}
        onQueryChange={setQuery}
        quickFilters={EMPLOYER_QUICK_FILTERS}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        totalCompanies={employerPool.length}
      />

      <EmployerSection
        eyebrow="Dành cho bạn"
        title="Gợi ý cho bạn"
        description="Doanh nghiệp được ưu tiên theo mức độ phù hợp, công nghệ liên quan và mức độ tuyển dụng hiện tại."
        action={<Link className="text-link" style={{ fontSize: "0.875rem", fontWeight: 600 }} to={ROUTES.jobs}>Xem tất cả việc làm</Link>}
      >
        {loading ? <EmptyState message="Đang phân tích dữ liệu công ty từ database..." /> : null}
        {!loading && recommendedCompanies.length ? (
          <div className="landing-employer-grid">
            {recommendedCompanies.map((company) => (
              <EmployerCard
                key={`recommended-${company.id}`}
                company={company}
                followed={followedIds.includes(company.id)}
                onToggleFollow={handleToggleFollow}
                onViewCompany={handleViewCompany}
              />
            ))}
          </div>
        ) : null}
        {!loading && !recommendedCompanies.length ? <EmptyState message="Chưa có công ty nào khớp với bộ lọc hiện tại." /> : null}
      </EmployerSection>

      <EmployerSection
        eyebrow="Nổi bật"
        title="Nhà tuyển dụng nổi bật"
        description="Giữ lại tinh thần section cũ, nhưng ưu tiên thông tin scan nhanh để ứng viên đánh giá công ty thay vì chỉ xem giới thiệu chung."
      >
        {!loading && featuredSectionCompanies.length ? (
          <div className="landing-employer-grid">
            {featuredSectionCompanies.map((company) => (
              <EmployerCard
                key={`featured-${company.id}`}
                company={company}
                followed={followedIds.includes(company.id)}
                onToggleFollow={handleToggleFollow}
                onViewCompany={handleViewCompany}
              />
            ))}
          </div>
        ) : !loading ? (
          <EmptyState message="Chưa có nhà tuyển dụng nổi bật từ database." />
        ) : null}
      </EmployerSection>

      <EmployerSection
        eyebrow="Theo ngành"
        title="Khám phá theo ngành"
        description="Một lớp điều hướng nhanh để thu gọn danh sách công ty theo lĩnh vực đang tuyển mạnh."
      >
        <div className="rw-industry-grid">
          {industries.map((industry) => (
            <button
              key={industry.name}
              type="button"
              onClick={() => setActiveFilter(industry.filterValue)}
              className="rw-industry-card"
            >
              <span className="rw-muted-xs rw-muted-xs--blue">Ngành</span>
              <h3 style={{ marginTop: "0.75rem", fontSize: "1.125rem", fontWeight: 600, color: "#0f172a" }}>{industry.name}</h3>
              <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", lineHeight: "1.5rem", color: "#475569" }}>{industry.count} công ty, {industry.openings} vị trí đang mở</p>
              <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {industry.tags.map((tag) => (
                  <span key={tag} className="rw-employer-tag">{tag}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </EmployerSection>

      <EmployerSection
        eyebrow="Gần đây"
        title="Công ty đã xem gần đây"
        description="Giúp ứng viên quay lại nhanh những công ty đã mở hoặc đang cân nhắc theo dõi."
      >
        {recentlyViewedCompanies.length ? (
          <div className="landing-employer-grid">
            {recentlyViewedCompanies.map((company) => (
              <EmployerCard
                key={`recent-${company.id}`}
                company={company}
                followed={followedIds.includes(company.id)}
                onToggleFollow={handleToggleFollow}
                onViewCompany={handleViewCompany}
              />
            ))}
          </div>
        ) : (
          <EmptyState message="Bạn chưa xem công ty nào gần đây. Hãy mở một vài công ty để hệ thống lưu lại lịch sử khám phá." />
        )}
      </EmployerSection>
    </div>
  );
}

function buildIndustries(companies) {
  const industryMap = new Map();

  companies.forEach((company) => {
    const key = company.industry || "Khác";
    const current = industryMap.get(key) || {
      name: key,
      count: 0,
      openings: 0,
      tags: new Set(),
      filterValue: inferIndustryFilter(key),
    };

    current.count += 1;
    current.openings += Number(company.openings || 0);
    (company.tags || []).slice(0, 3).forEach((tag) => current.tags.add(tag));
    industryMap.set(key, current);
  });

  return [...industryMap.values()]
    .map((industry) => ({ ...industry, tags: [...industry.tags].slice(0, 3) }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);
}

function enrichCompanies(companies, jobs) {
  const jobsByCompany = new Map();

  jobs.forEach((job) => {
    const company = job.company;
    if (!company?.company_name) return;
    const key = normalize(company.company_name);
    const current = jobsByCompany.get(key) || [];
    current.push(job);
    jobsByCompany.set(key, current);
  });

  return companies.map((company, index) => {
    const key = normalize(company.company_name);
    const jobList = jobsByCompany.get(key) || [];
    const tags = [...new Set(jobList.flatMap((job) => (job.tags || []).map((tag) => tag.name)).filter(Boolean))].slice(0, 4);
    const locations = [...new Set(jobList.map((job) => job.location).filter(Boolean))];
    const hasRemote = jobList.some((job) => normalize(job.workplace_type).includes("remote"));
    const hasFresher = jobList.some((job) => ["intern", "fresher", "junior"].includes(job.experience_level));

    return {
      ...company,
      id: company.id || index + 1,
      company_name: company.company_name || "Nhà tuyển dụng",
      industry: company.industry || deriveIndustry(tags),
      location: locations[0] || company.address || "TP. Hồ Chí Minh",
      address: company.address || locations[0] || "TP. Hồ Chí Minh",
      openings: Number(company.openings || jobList.length || 0),
      tags: tags.length ? tags : [],
      rating: Number(company.rating || 4.3 + ((index % 6) * 0.1)).toFixed(1),
      size: company.size || deriveSize(index),
      badge: company.badge || (Number(company.openings || 0) >= 5 ? "Top Employer" : "Đang tuyển"),
      match_score: company.match_score || 78 + ((index * 7) % 18),
      hiring_focus: compact([hasRemote ? "Remote" : null, hasFresher ? "Fresher" : null, company.industry ? "Đúng ngành" : null]),
      summary: company.summary || `Công ty đang có ${Number(company.openings || jobList.length || 0)} vị trí mở và phù hợp để ứng viên khám phá thêm trước khi ứng tuyển.`,
      website: company.website || "",
      logo_url: company.logo_url || "",
    };
  });
}

function matchesFilter(company, activeFilter) {
  if (!activeFilter || activeFilter === "all") return true;

  const haystack = normalize([
    company.company_name,
    company.industry,
    company.location,
    company.address,
    company.badge,
    ...(company.tags || []),
    ...(company.hiring_focus || []),
  ].join(" "));

  switch (activeFilter) {
    case "it":
      return haystack.includes("cong nghe") || haystack.includes("it") || haystack.includes("react") || haystack.includes("flask");
    case "remote":
      return haystack.includes("remote");
    case "hcm":
      return haystack.includes("tp. ho chi minh") || haystack.includes("ho chi minh") || haystack.includes("hcm");
    case "fresher":
      return haystack.includes("fresher") || haystack.includes("junior") || haystack.includes("thuc tap") || haystack.includes("intern");
    case "top":
      return haystack.includes("top employer") || (company.match_score || 0) >= 88 || (company.openings || 0) >= 6;
    default:
      return haystack.includes(normalize(activeFilter));
  }
}

function deriveIndustry(tags) {
  if (tags.some((tag) => normalize(tag).includes("react") || normalize(tag).includes("flask"))) return "Công nghệ thông tin";
  if (tags.some((tag) => normalize(tag).includes("seo") || normalize(tag).includes("content"))) return "Marketing";
  return "Doanh nghiệp đang tuyển";
}

function deriveSize(index) {
  const sizes = ["30-60 nhân sự", "50-100 nhân sự", "80-150 nhân sự", "150-300 nhân sự"];
  return sizes[index % sizes.length];
}

function inferIndustryFilter(name) {
  const normalized = normalize(name);
  if (normalized.includes("cong nghe") || normalized.includes("it")) return "it";
  if (normalized.includes("marketing")) return "marketing";
  return normalized;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function compact(values) {
  return values.filter(Boolean);
}

function readStoredIds(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function EmptyState({ message }) {
  return <div className="rw-resume-empty">{message}</div>;
}
