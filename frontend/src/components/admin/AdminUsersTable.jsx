import styles from "./AdminUsersTable.module.css";

const ROLE_LABELS = {
  admin: "👤 Admin",
  candidate: "📝 Ứng Viên",
  recruiter: "🏢 Nhà Tuyển Dụng",
};

export default function AdminUsersTable({ users, onEdit, onDelete }) {
  const formatDate = (dateString) => {
    if (!dateString) return "Chưa cập nhật";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên</th>
            <th>Email</th>
            <th>Role</th>
            <th>Trạng thái</th>
            <th>Ngày tạo</th>
            <th>Đăng nhập cuối</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className={styles.idCell}>#{user.id}</td>
              <td className={styles.nameCell}>{user.full_name}</td>
              <td className={styles.emailCell}>{user.email}</td>
              <td>
                <span className={`${styles.role} ${styles[`role_${user.role}`]}`}>
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              </td>
              <td>
                <span
                  className={`${styles.status} ${
                    user.status === "active" ? styles.active : styles.inactive
                  }`}
                >
                  {user.status === "active" ? "✓ Hoạt động" : "✕ Không hoạt động"}
                </span>
              </td>
              <td className={styles.dateCell}>{formatDate(user.created_at)}</td>
              <td className={styles.dateCell}>{formatDate(user.last_login_at)}</td>
              <td className={styles.actionsCell}>
                <button
                  onClick={() => onEdit(user)}
                  className={`${styles.actionBtn} ${styles.editBtn}`}
                  title="Chỉnh sửa"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDelete(user.id)}
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  title="Xóa"
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
