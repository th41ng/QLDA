import EmployerFilterChips from "./EmployerFilterChips";

export default function EmployerSearchHero({ query, onQueryChange, quickFilters, activeFilter, onFilterChange, totalCompanies }) {
  return (
    <section className="landing-section panel rw-employer-hero">
      <div className="rw-employer-hero-bg" />
      <div className="rw-employer-hero-layout">
        <div>
          <span className="eyebrow">Khám phá công ty</span>
          <h1 style={{ marginTop: "0.75rem", maxWidth: "48rem", fontSize: "1.875rem", fontWeight: 600, letterSpacing: "-0.025em", color: "#020617" }}>
            Khám phá nhà tuyển dụng phù hợp với bạn
          </h1>
          <p style={{ marginTop: "0.75rem", maxWidth: "42rem", fontSize: "0.875rem", lineHeight: "1.75rem", color: "#475569" }}>
            Tìm kiếm công ty theo ngành nghề, địa điểm và số vị trí đang tuyển. Dữ liệu được lấy từ hồ sơ công ty và tin tuyển dụng đang mở.
          </p>

          <div className="rw-search-wrap">
            <div className="rw-search-input-wrap">
              <span style={{ fontSize: "1.125rem", color: "#94a3b8" }}>⌕</span>
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Tìm theo tên công ty, ngành nghề hoặc địa điểm"
                className="rw-input-search"
              />
            </div>
            <button type="button" className="btn" style={{ minWidth: "150px" }}>
              Tìm công ty
            </button>
          </div>

          <EmployerFilterChips filters={quickFilters} activeFilter={activeFilter} onChange={onFilterChange} />
        </div>

        <aside className="rw-hero-aside">
          <div className="rw-hero-stat-card">
            <p className="rw-hero-stat-eyebrow">Tổng quan nhanh</p>
            <div className="rw-hero-stat-grid">
              <Metric label="Công ty" value={String(totalCompanies).padStart(2, "0")} />
              <Metric label="Đang tuyển" value="Nhiều" />
              <Metric label="Remote" value="Có" />
              <Metric label="Theo dõi" value="Lưu lại" />
            </div>
          </div>
          <div className="rw-hero-tip-card">
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>Mẹo khám phá</p>
            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", lineHeight: "1.5rem", color: "#475569" }}>
              Bắt đầu bằng tên công ty hoặc ngành nghề, sau đó mở danh sách việc làm để xem các vị trí phù hợp.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rw-hero-stat-item">
      <span style={{ display: "block", fontSize: "0.75rem", color: "#64748b" }}>{label}</span>
      <strong style={{ marginTop: "0.25rem", display: "block", fontSize: "1.25rem", fontWeight: 600, color: "#1d4ed8" }}>{value}</strong>
    </div>
  );
}
