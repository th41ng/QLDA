import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { ROUTES } from "../../routes";
import AdminUsersTable from "../../components/admin/AdminUsersTable";
import AdminUserForm from "../../components/admin/AdminUserForm";
import styles from "./AdminUsersPage.module.css";

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadUsers();
  }, [roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.users.getAll(roleFilter || null, statusFilter || null);
      setUsers(data || []);
      setError("");
    } catch (err) {
      setError(err.message || "Lỗi khi tải danh sách người dùng");
      console.error("Load users error:", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa người dùng này?")) {
      return;
    }

    try {
      await api.users.delete(userId);
      setSuccess("Người dùng đã được xóa thành công");
      loadUsers();
    } catch (err) {
      setError(err.message || "Lỗi khi xóa người dùng");
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingUser) {
        await api.users.update(editingUser.id, formData);
        setSuccess("Người dùng đã được cập nhật thành công");
      } else {
        await api.users.create(formData);
        setSuccess("Người dùng mới đã được tạo thành công");
      }
      setShowForm(false);
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      setError(err.message || "Lỗi khi lưu người dùng");
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadUsers();
      return;
    }

    try {
      setLoading(true);
      const results = await api.users.search(query);
      setUsers(results || []);
    } catch (err) {
      setError("Lỗi khi tìm kiếm");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Quản lý Người Dùng</h1>
          <p>Tạo, cập nhật và quản lý tất cả người dùng trong hệ thống</p>
        </div>
        <button onClick={() => navigate(ROUTES.admin.dashboard)} className={styles.backBtn}>
          ← Quay lại Dashboard
        </button>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {success && <div className={styles.successMessage}>{success}</div>}

      {!showForm ? (
        <div className={styles.listView}>
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Tìm kiếm theo email hoặc tên..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.filters}>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">Tất cả Roles</option>
                <option value="admin">Admin</option>
                <option value="candidate">Candidate</option>
                <option value="recruiter">Recruiter</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">Tất cả Trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Không hoạt động</option>
              </select>
            </div>
            <button onClick={handleAddNew} className={styles.addBtn}>
              + Thêm Người Dùng Mới
            </button>
          </div>

          {loading ? (
            <div className={styles.loadingMessage}>Đang tải...</div>
          ) : users.length === 0 ? (
            <div className={styles.emptyMessage}>Không có người dùng nào</div>
          ) : (
            <AdminUsersTable
              users={users}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      ) : (
        <div className={styles.formView}>
          <AdminUserForm
            user={editingUser}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingUser(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
