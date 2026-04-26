export default function ResumeTabs({ activeTab, onChange }) {
  const tabs = [
    { id: "list", label: "CV của tôi" },
    { id: "create", label: "Tạo CV" },
    { id: "parse", label: "Tạo từ file CV" },
  ];

  return (
    <div className="rw-tabs">
      <div className="rw-tabs-list" role="tablist" aria-label="Điều hướng CV">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={active ? "rw-tab rw-tab--active" : "rw-tab"}
              aria-pressed={active}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
