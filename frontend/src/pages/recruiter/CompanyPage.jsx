import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";

const EMPTY_COMPANY = {
  company_name: "",
  tax_code: "",
  website: "",
  address: "",
  description: "",
  logo_url: "",
  industry: "",
};

export default function RecruiterCompanyPage() {
  const { user } = useAuth();
  const [company, setCompany] = useState(EMPTY_COMPANY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    api.companies.me().then((data) => setCompany(data || EMPTY_COMPANY)).catch(() => setCompany(EMPTY_COMPANY));
  }, [user]);

  const saveCompany = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await api.companies.updateMe(company);
      setCompany(data || EMPTY_COMPANY);
      setMessage("Đã lưu thông tin công ty.");
    } catch (err) {
      setError(err.message || "Không thể lưu thông tin công ty.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow">Recruiter workspace</span>
          <h1>Thông tin công ty</h1>
          <p>Cập nhật hồ sơ doanh nghiệp và thương hiệu tuyển dụng của bạn.</p>
        </div>
      </div>

      <div className="company-edit-layout">
        <form className="dashboard-card company-edit-card" onSubmit={saveCompany}>
          <div className="dashboard-card-head">
            <h2>Chỉnh sửa thông tin</h2>
          </div>

          {message ? <div className="auth-alert auth-alert--success">{message}</div> : null}
          {error ? <div className="auth-alert auth-alert--error">{error}</div> : null}

          <div className="company-edit-grid">
            <Field label="Tên công ty">
              <input value={company.company_name || ""} onChange={(e) => setCompany({ ...company, company_name: e.target.value })} />
            </Field>
            <Field label="Mã số thuế">
              <input value={company.tax_code || ""} onChange={(e) => setCompany({ ...company, tax_code: e.target.value })} />
            </Field>
            <Field label="Website">
              <input value={company.website || ""} onChange={(e) => setCompany({ ...company, website: e.target.value })} />
            </Field>
            <Field label="Ngành">
              <input value={company.industry || ""} onChange={(e) => setCompany({ ...company, industry: e.target.value })} />
            </Field>
            <Field label="Địa chỉ" className="span-2">
              <input value={company.address || ""} onChange={(e) => setCompany({ ...company, address: e.target.value })} />
            </Field>
            <Field label="Mô tả" className="span-2">
              <textarea rows="5" value={company.description || ""} onChange={(e) => setCompany({ ...company, description: e.target.value })} />
            </Field>
          </div>

          <div className="company-edit-actions">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu công ty"}
            </button>
          </div>
        </form>

        <aside className="dashboard-card dashboard-card--compact">
          <div className="dashboard-card-head">
            <h2>Xem trước</h2>
          </div>
          <div className="company-summary">
            <div className="company-summary-head">
              <div className="company-summary-logo">
                {company?.logo_url ? <img src={company.logo_url} alt={company.company_name || "Logo cong ty"} /> : <span>{getInitials(company?.company_name)}</span>}
              </div>
              <div>
                <strong>{company.company_name || "Chưa có tên công ty"}</strong>
                <p>{company.description || "Mô tả công ty sẽ hiển thị tại đây."}</p>
              </div>
            </div>
            <dl className="company-summary-list">
              <Row label="Website" value={company.website || "Chưa cập nhật"} />
              <Row label="Mã số thuế" value={company.tax_code || "Chưa cập nhật"} />
              <Row label="Địa chỉ" value={company.address || "Chưa cập nhật"} />
              <Row label="Ngành" value={company.industry || "Chưa cập nhật"} />
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={className ? `dashboard-field ${className}` : "dashboard-field"}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function getInitials(name) {
  const raw = (name || "CTY").trim();
  return raw
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}
