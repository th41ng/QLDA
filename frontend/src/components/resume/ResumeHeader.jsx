import { useMemo, useRef } from "react";

export default function ResumeHeader({ onCreate, onUpload }) {
  const uploadRef = useRef(null);
  const quickActions = useMemo(
    () => [
      { label: "ATS-friendly", value: "Ưu tiên bố cục gọn" },
      { label: "Xuất PDF", value: "Dùng ngay khi ứng tuyển" },
    ],
    [],
  );

  return (
    <section className="rw-resume-header landing-section panel">
      <div className="rw-resume-header-layout">
        <div className="rw-hero-text">
          <span className="eyebrow">Khu vực CV</span>
          <h1 className="rw-heading-xl">CV của bạn</h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", lineHeight: "1.75rem", color: "#475569" }}>
            Tạo mới, tải lên và quản lý tất cả CV ở một nơi. Tập trung vào thao tác nhanh, dễ xem lại và sẵn sàng dùng khi ứng tuyển.
          </p>
          <div style={{ marginTop: "1.25rem", display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {quickActions.map((item) => (
              <div key={item.label} className="rw-header-quick-tag">
                <strong style={{ fontWeight: 600 }}>{item.label}</strong>
                <span style={{ color: "rgba(29,78,216,0.8)" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rw-resume-header-actions">
          <button type="button" className="btn" onClick={onCreate}>
            Tạo CV mới
          </button>
          <button
            type="button"
            className="rw-btn-outline-lg"
            onClick={() => {
              onUpload?.();
              uploadRef.current?.click();
            }}
          >
            Tải lên CV
          </button>
          <input ref={uploadRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={(event) => onUpload?.(event.target.files?.[0] || null)} />
        </div>
      </div>
    </section>
  );
}
