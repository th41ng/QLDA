import { useState, useEffect } from "react";
import styles from "./AdminUserForm.module.css";

export default function AdminUserForm({ user, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    role: "candidate",
    status: "active",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        email: user.email || "",
        password: "", // Don't show password
        phone: user.phone || "",
        role: user.role || "candidate",
        status: user.status || "active",
      });
    }
  }, [user]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Tên không được để trống";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email không được để trống";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }

    if (!user && !formData.password) {
      newErrors.password = "Mật khẩu là bắt buộc cho người dùng mới";
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải ít nhất 6 ký tự";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const submitData = { ...formData };
      if (!submitData.password) {
        delete submitData.password;
      }
      if (!submitData.phone) {
        delete submitData.phone;
      }

      await onSubmit(submitData);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleDescription = (role) => {
    const descriptions = {
      admin: "Quản trị viên - Quản lý toàn bộ hệ thống",
      candidate: "Ứng viên - Tìm kiếm và ứng tuyển việc làm",
      recruiter: "Nhà tuyển dụng - Đăng tin tuyển dụng và quản lý ứng viên",
    };
    return descriptions[role] || "";
  };

  return (
    <div className={styles.form}>
      <h2>{user ? "Chỉnh sửa Người Dùng" : "Tạo Người Dùng Mới"}</h2>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="full_name">Tên đầy đủ *</label>
          <input
            id="full_name"
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleInputChange}
            placeholder="Nhập tên người dùng"
            disabled={submitting}
            className={errors.full_name ? styles.error : ""}
          />
          {errors.full_name && <span className={styles.errorText}>{errors.full_name}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email">Email *</label>
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="user@example.com"
            disabled={submitting}
            className={errors.email ? styles.error : ""}
          />
          {errors.email && <span className={styles.errorText}>{errors.email}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password">
            Mật khẩu {user ? "(để trống nếu không đổi)" : "*"}
          </label>
          <input
            id="password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
            disabled={submitting}
            className={errors.password ? styles.error : ""}
          />
          {errors.password && <span className={styles.errorText}>{errors.password}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="phone">Số điện thoại</label>
          <input
            id="phone"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="+84 123 456 789"
            disabled={submitting}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="role">Role *</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            disabled={submitting}
          >
            <option value="admin">Admin - Quản trị viên</option>
            <option value="candidate">Candidate - Ứng viên</option>
            <option value="recruiter">Recruiter - Nhà tuyển dụng</option>
          </select>
          <small className={styles.roleDescription}>
            {getRoleDescription(formData.role)}
          </small>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="status">Trạng thái</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            disabled={submitting}
          >
            <option value="active">Hoạt động</option>
            <option value="inactive">Không hoạt động</option>
          </select>
        </div>

        <div className={styles.actions}>
          <button type="submit" disabled={submitting} className={styles.submitBtn}>
            {submitting ? "Đang lưu..." : user ? "Cập nhật" : "Tạo mới"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className={styles.cancelBtn}
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
}
