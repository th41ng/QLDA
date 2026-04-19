import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROUTES } from "../../routes";
import styles from "./AdminLoginPage.module.css";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { adminLogin } = useAuth();
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!credentials.email.trim()) {
      setError("Vui lòng nhập email");
      return;
    }

    if (!credentials.password) {
      setError("Vui lòng nhập mật khẩu");
      return;
    }

    setSubmitting(true);

    try {
      await adminLogin(credentials.email, credentials.password);
      navigate(ROUTES.admin.dashboard);
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.header}>
          <h1>Admin Dashboard</h1>
          <p>Đăng nhập để quản lý hệ thống</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              value={credentials.email}
              onChange={handleInputChange}
              placeholder="admin@company.com"
              disabled={submitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleInputChange}
              placeholder="Nhập mật khẩu"
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={styles.submitBtn}
          >
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className={styles.footer}>
          <p>Chỉ admin mới có thể truy cập trang này</p>
        </div>
      </div>
    </div>
  );
}
