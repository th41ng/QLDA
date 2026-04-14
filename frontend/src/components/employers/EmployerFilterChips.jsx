export default function EmployerFilterChips({ filters, activeFilter, onChange }) {
  return (
    <div className="filter-pills filter-pills--landing" style={{ marginTop: "1.25rem", display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
      {filters.map((filter) => {
        const active = activeFilter === filter.value;
        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => onChange(active ? "all" : filter.value)}
            className={active ? "rw-btn-chip rw-btn-chip--active" : "rw-btn-chip"}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}