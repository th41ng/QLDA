import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import EmployerCard from "../../components/employers/EmployerCard";

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
  const debounceRef = useRef(null);

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
      .catch(() => { if (active) { setCompanies([]); setTotal(0); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [debouncedQuery, page]);

  useEffect(() => {
    localStorage.setItem(FOLLOWED_KEY, JSON.stringify(followedIds));
  }, [followedIds]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const handleToggleFollow = useCallback((companyId) => {
    setFollowedIds((prev) => prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [companyId, ...prev]);
  }, []);

  const paginationPages = useMemo(() => buildPageRange(page, totalPages), [page, totalPages]);

  return (
    <div className="landing-page employer-discovery-page" style={{ paddingBottom: "48px" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 16px 0" }}>
        <div style={{ marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Nhà tuyển dụng
          </span>
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>
          Khám phá nhà tuyển dụng
        </h1>
        <p style={{ color: "#64748b", margin: "0 0 24px" }}>
          {total > 0 ? `${total} công ty đang tuyển dụng` : "Tìm kiếm công ty phù hợp với bạn"}
        </p>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên công ty, ngành, địa chỉ..."
          style={{
            width: "100%", maxWidth: "480px", padding: "10px 16px",
            border: "1px solid #e2e8f0", borderRadius: "8px",
            fontSize: "14px", outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ maxWidth: "960px", margin: "24px auto 0", padding: "0 16px" }}>
        {loading ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "#64748b" }}>Đang tải danh sách công ty...</div>
        ) : companies.length ? (
          <div className="landing-employer-grid">
            {companies.map((company) => (
              <EmployerCard
                key={company.id}
                company={company}
                followed={followedIds.includes(company.id)}
                onToggleFollow={handleToggleFollow}
                onViewCompany={() => {}}
              />
            ))}
          </div>
        ) : (
          <div style={{ padding: "48px 0", textAlign: "center", color: "#64748b" }}>
            Không tìm thấy công ty nào phù hợp.
          </div>
        )}

        {totalPages > 1 ? (
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
