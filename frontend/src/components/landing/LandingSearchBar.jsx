export default function LandingSearchBar({ keyword, location, level, locations, levels, onChange, onSubmit }) {
  return (
    <form className="landing-search" onSubmit={onSubmit}>
      <label className="landing-search-field landing-search-field--keyword">
        <span>Từ khóa</span>
        <input
          value={keyword}
          onChange={(event) => onChange("keyword", event.target.value)}
          placeholder="Công việc, kỹ năng, công ty..."
        />
      </label>

      <label className="landing-search-field">
        <span>Địa điểm</span>
        <select value={location} onChange={(event) => onChange("location", event.target.value)}>
          <option value="">Tất cả địa điểm</option>
          {locations.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="landing-search-field">
        <span>Cấp bậc</span>
        <select value={level} onChange={(event) => onChange("level", event.target.value)}>
          <option value="">Tất cả cấp bậc</option>
          {levels.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" className="btn landing-search-submit">
        Tìm việc
      </button>
    </form>
  );
}
