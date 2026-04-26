import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import EmployerCard from "../../components/employers/EmployerCard";
import { getStoredUser } from "../../lib/api";

const FOLLOWED_KEY = "candidate_followed_employers";
const PER_PAGE = 6;

export default function EmployersPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [followedIds, setFollowedIds] = useState(() => readStoredIds(FOLLOWED_KEY));
  const [followedCompanies, setFollowedCompanies] = useState([]);
  const [showFollowedOnly, setShowFollowedOnly] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [message, setMessage] = useState("");
  const debounceRef = useRef(null);
  const isCandidate = getStoredUser()?.role === "candidate";

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.companies
      .featured({ q: debouncedQuery, page, perPage: PER_PAGE })
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.companies) ? data.companies : Array.isArray(data) ? data : [];
        setCompanies(list);
        setTotal(Number(data?.total ?? list.length));
      })
      .catch(() => {
        if (active) {
          setCompanies([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedQuery, page]);

  useEffect(() => {
    localStorage.setItem(FOLLOWED_KEY, JSON.stringify(followedIds));
  }, [followedIds]);

  useEffect(() => {
    if (isCandidate) return;
    setFollowedCompanies((prev) => {
      const known = new Map(prev.map((company) => [company.id, company]));
      companies.forEach((company) => {
        if (followedIds.includes(company.id)) known.set(company.id, company);
      });
      return followedIds.map((id) => known.get(id)).filter(Boolean);
    });
  }, [companies, followedIds, isCandidate]);

  useEffect(() => {
    if (!isCandidate) return;
    let active = true;
    api.companies
      .followed()
      .then((data) => {
        if (!active) return;
        const ids = Array.isArray(data?.company_ids) ? data.company_ids : [];
        const list = Array.isArray(data?.companies) ? data.companies : [];
        setFollowedIds(ids);
        setFollowedCompanies(list);
      })
      .catch(() => {
        if (active) setFollowedCompanies([]);
      });
    return () => {
      active = false;
    };
  }, [isCandidate]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), 2400);
    return () => window.clearTimeout(timer);
  }, [message]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const openJobs = useMemo(() => companies.reduce((sum, company) => sum + Number(company.openings || 0), 0), [companies]);
  const industryCount = useMemo(() => new Set(companies.map((company) => company.industry).filter(Boolean)).size, [companies]);
  const currentPageFollowedCompanies = useMemo(
    () => companies.filter((company) => followedIds.includes(company.id)),
    [companies, followedIds],
  );
  const visibleFollowedCompanies = followedCompanies.length ? followedCompanies : currentPageFollowedCompanies;
  const displayedCompanies = showFollowedOnly ? visibleFollowedCompanies : companies;

  const handleToggleFollow = useCallback((companyId) => {
    if (!companyId) return;
    const company = companies.find((item) => item.id === companyId) || selectedCompany;
    const exists = followedIds.includes(companyId);
    const nextFollowed = !exists;
    const companyName = company?.company_name || "công ty";

    setFollowedIds((prev) => (nextFollowed ? [companyId, ...prev.filter((id) => id !== companyId)] : prev.filter((id) => id !== companyId)));
    setFollowedCompanies((prev) => {
      if (nextFollowed && company && !prev.some((item) => item.id === companyId)) return [company, ...prev];
      if (!nextFollowed) return prev.filter((item) => item.id !== companyId);
      return prev;
    });

    if (!isCandidate) {
      setMessage(nextFollowed ? `Đã lưu ${companyName}.` : `Đã bỏ lưu ${companyName}.`);
      return;
    }

    setMessage(nextFollowed ? `Đã lưu ${companyName}.` : `Đã bỏ lưu ${companyName}.`);
    const request = nextFollowed ? api.companies.follow(companyId) : api.companies.unfollow(companyId);
    request.catch(() => {
      setMessage("Chưa lưu được thay đổi. Vui lòng thử lại.");
    });
  }, [companies, followedIds, isCandidate, selectedCompany]);

  const paginationPages = useMemo(() => buildPageRange(page, totalPages), [page, totalPages]);

  return (
    <div className="landing-page employer-discovery-page" style={{ paddingBottom: "48px" }}>
      <section className="landing-section panel rw-employer-hero" style={{ maxWidth: "1100px", margin: "24px auto 0" }}>
        <div className="rw-employer-hero-bg" />
        <div className="rw-employer-hero-layout">
          <div>
            <span className="eyebrow">Nhà tuyển dụng</span>
            <h1 className="rw-heading-xl" style={{ marginBottom: "10px" }}>Khám phá công ty đang tuyển dụng</h1>
            <p className="lead" style={{ marginBottom: "18px" }}>
              Tìm công ty theo tên, ngành hoặc địa chỉ; xem nhanh số vị trí đang tuyển và lưu lại công ty bạn quan tâm.
            </p>

            <label className="rw-search-wrap" style={{ maxWidth: "560px" }}>
              <span>Tìm kiếm công ty</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tên công ty, ngành, địa chỉ..."
              />
            </label>
          </div>

          <div className="rw-employer-hero-card">
            <div>
              <span>Đang hiển thị</span>
              <strong>{loading ? "..." : total}</strong>
              <p>công ty phù hợp tìm kiếm</p>
            </div>
            <div>
              <span>Việc đang tuyển</span>
              <strong>{loading ? "..." : openJobs}</strong>
              <p>vị trí đang mở</p>
            </div>
            <div>
              <span>Đã lưu</span>
              <strong>{followedIds.length}</strong>
              <p>Công ty bạn quan tâm</p>
            </div>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: "1100px", margin: "24px auto 0", padding: "0 16px" }}>
        {message ? <div className="rw-alert-info" style={{ marginBottom: "16px" }}>{message}</div> : null}

        {followedCompanies.length ? (
          <section className="rw-card rw-followed-company-strip" style={{ marginBottom: "16px" }}>
            <div>
              <strong>Công ty đã lưu</strong>
              <p className="rw-muted-sm" style={{ margin: "4px 0 0" }}>
                {isCandidate ? "Các công ty bạn muốn xem lại sau." : "Đăng nhập để giữ danh sách này trên mọi thiết bị."}
              </p>
            </div>
            <div className="rw-followed-company-list">
              {followedCompanies.slice(0, 4).map((company) => (
                <button key={company.id} type="button" className="rw-followed-company-chip" onClick={() => setSelectedCompany(company)}>
                  {company.logo_url ? <img src={company.logo_url} alt={company.company_name || "Company logo"} /> : <span>{getInitials(company.company_name)}</span>}
                  <strong>{company.company_name || "Nhà tuyển dụng"}</strong>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <div className="candidate-cv-toolbar rw-card" style={{ marginBottom: "16px" }}>
          <div>
            <strong>{showFollowedOnly ? `${followedIds.length} công ty đã lưu` : total > 0 ? `${total} công ty đang tuyển dụng` : "Danh sách công ty"}</strong>
            <p className="rw-muted-sm" style={{ margin: "4px 0 0" }}>
              {showFollowedOnly
                ? "Đang xem các công ty bạn đã lưu để quay lại sau."
                : industryCount
                  ? `${industryCount} ngành trong kết quả`
                  : "Tìm kiếm công ty theo nhu cầu của bạn."}
            </p>
          </div>
          {query ? (
            <button type="button" className="rw-btn-outline-lg" onClick={() => setQuery("")}>
              Xóa tìm kiếm
            </button>
          ) : null}
        </div>

        <div className="rw-employer-list-switch" style={{ marginBottom: "16px" }}>
          <button
            type="button"
            className={showFollowedOnly ? "rw-btn-outline-lg rw-btn-outline-lg--selected" : "rw-btn-outline-lg"}
            onClick={() => setShowFollowedOnly((value) => !value)}
          >
            {showFollowedOnly ? "Xem tất cả công ty" : `Công ty đã lưu (${followedIds.length})`}
          </button>
          {showFollowedOnly ? (
            <span>{isCandidate ? "Các công ty bạn quan tâm." : "Đăng nhập để lưu danh sách trên mọi thiết bị."}</span>
          ) : null}
        </div>

        {loading ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "#64748b" }}>Đang tải danh sách công ty...</div>
        ) : displayedCompanies.length ? (
          <div className="landing-employer-grid">
            {displayedCompanies.map((company) => (
              <EmployerCard
                key={company.id}
                company={company}
                followed={followedIds.includes(company.id)}
                onToggleFollow={handleToggleFollow}
                onViewCompany={setSelectedCompany}
              />
            ))}
          </div>
        ) : (
          <div style={{ padding: "48px 0", textAlign: "center", color: "#64748b" }}>
            {showFollowedOnly ? "Bạn chưa lưu công ty nào." : "Không tìm thấy công ty nào phù hợp."}
          </div>
        )}

        {!showFollowedOnly && totalPages > 1 ? (
          <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "32px", flexWrap: "wrap" }}>
            <PageBtn label="‹" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} />
            {paginationPages.map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} style={{ padding: "6px 4px", color: "#94a3b8", lineHeight: "32px" }}>…</span>
              ) : (
                <PageBtn key={p} label={String(p)} active={p === page} onClick={() => setPage(p)} />
              ),
            )}
            <PageBtn label="›" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} />
          </div>
        ) : null}
      </div>

      {selectedCompany ? (
        <CompanyDetailModal
          company={selectedCompany}
          followed={followedIds.includes(selectedCompany.id)}
          onToggleFollow={handleToggleFollow}
          onClose={() => setSelectedCompany(null)}
        />
      ) : null}
    </div>
  );
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

function buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

function PageBtn({ label, onClick, active = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: "32px", height: "32px", padding: "0 8px",
        border: `1px solid ${active ? "#3b82f6" : "#e2e8f0"}`,
        borderRadius: "6px", cursor: disabled ? "default" : "pointer",
        background: active ? "#3b82f6" : "#fff",
        color: active ? "#fff" : disabled ? "#cbd5e1" : "#374151",
        fontSize: "13px", fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}

function CompanyDetailModal({ company, followed, onToggleFollow, onClose }) {
  const name = company.company_name || company.name || "Nhà tuyển dụng";
  const website = normalizeWebsite(company.website);
  const latestJobs = Array.isArray(company.latest_jobs) ? company.latest_jobs : [];
  const tags = Array.isArray(company.tags) ? company.tags : [];
  const locations = Array.isArray(company.locations) && company.locations.length ? company.locations.join(", ") : company.address;
  const subtitle = [company.industry, locations].filter(Boolean).join(" · ");
  return (
    <div className="rw-modal-backdrop">
      <div className="rw-modal" style={{ maxWidth: "760px" }}>
        <div className="rw-modal-head">
          <div className="rw-company-modal-title">
            <div className="rw-employer-logo rw-employer-logo--lg">
              {company.logo_url ? <img src={company.logo_url} alt={name} /> : <span>{getInitials(name)}</span>}
            </div>
            <div>
              <p className="rw-modal-kicker">Thông tin công ty</p>
              <h3 className="rw-heading-2xl">{name}</h3>
              <p className="rw-modal-subtitle">{subtitle || "Chưa cập nhật ngành và địa chỉ"}</p>
            </div>
          </div>
          <button type="button" className="rw-btn-close" onClick={onClose}>Đóng</button>
        </div>

        <div className="rw-modal-body">
          <div className="rw-meta-grid">
            <Info label="Tin đang tuyển" value={`${Number(company.active_jobs_count || 0)} tin`} />
            <Info label="Số lượng tuyển" value={`${Number(company.openings || 0)} vị trí`} />
            <Info label="Mã số thuế" value={company.tax_code || "Chưa cập nhật"} />
            <Info label="Website" value={company.website || "Chưa cập nhật"} />
            <Info label="Địa chỉ" value={company.address || "Chưa cập nhật"} />
            <Info label="Cập nhật" value={formatDate(company.updated_at)} />
          </div>
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.7 }}>
            {company.description || company.summary || "Công ty đang cập nhật mô tả. Bạn vẫn có thể xem các vị trí đang tuyển hoặc lưu công ty để quay lại sau."}
          </p>

          {tags.length ? (
            <div className="rw-employer-modal-tags">
              {tags.map((tag) => (
                <span key={tag} className="rw-employer-tag">{tag}</span>
              ))}
            </div>
          ) : null}

          {latestJobs.length ? (
            <section className="rw-company-jobs">
              <div className="rw-company-jobs-head">
                <strong>Việc đang tuyển gần đây</strong>
                <span>{latestJobs.length} tin</span>
              </div>
              <div className="rw-company-job-list">
                {latestJobs.map((job) => (
                  <a key={job.id} className="rw-company-job-item" href={`/jobs/${job.id}`}>
                    <strong>{job.title}</strong>
                    <span>{[job.location, job.employment_type, `${Number(job.vacancy_count || 1)} vị trí`].filter(Boolean).join(" · ")}</span>
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          <div className="rw-modal-actions">
            <a className="btn" href={`/jobs?q=${encodeURIComponent(name)}`}>Xem việc làm</a>
            {website ? (
              <a className="rw-btn-outline-lg" href={website} target="_blank" rel="noreferrer">Mở website</a>
            ) : null}
            <button
              type="button"
              className={followed ? "rw-btn-follow rw-btn-follow--active" : "rw-btn-follow"}
              onClick={() => onToggleFollow(company.id)}
            >
              {followed ? "Đã lưu" : "Lưu công ty"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rw-meta-item">
      <span className="rw-muted-xs">{label}</span>
      <strong className="rw-meta-sm">{value}</strong>
    </div>
  );
}

function getInitials(name) {
  return String(name || "NTD")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN");
}

function normalizeWebsite(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}
