import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api";
import { ROUTES } from "../../routes";
import styles from "./AdminDashboardPage.module.css";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const statsData = await api.users.stats();
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load stats:", error);
      // Fallback if stats endpoint fails
      setStats({
        total_users: 0,
        admins: 0,
        candidates: 0,
        recruiters: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.admin.login);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Admin Dashboard</h1>
          <p>Quản lý hệ thống Job Portal</p>
        </div>
        <div className={styles.userSection}>
          <span className={styles.userName}>{user?.full_name}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Đăng xuất
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>�</div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Tổng Người Dùng</p>
              <p className={styles.statValue}>{stats?.total_users || 0}</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>👤</div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Admins</p>
              <p className={styles.statValue}>{stats?.admins || 0}</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>📝</div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Ứng Viên</p>
              <p className={styles.statValue}>{stats?.candidates || 0}</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>🏢</div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Nhà Tuyển Dụng</p>
              <p className={styles.statValue}>{stats?.recruiters || 0}</p>
            </div>
          </div>
        </div>

        <div className={styles.quickActions}>
          <h2>Hành Động Nhanh</h2>
          <div className={styles.actionGrid}>
            <button
              onClick={() => navigate(ROUTES.admin.users)}
              className={styles.actionBtn}
            >
              <span className={styles.actionIcon}>👥</span>
              <span className={styles.actionLabel}>Quản lý Người Dùng</span>
            </button>
            <button className={`${styles.actionBtn} ${styles.disabled}`} disabled>
              <span className={styles.actionIcon}>⚙️</span>
              <span className={styles.actionLabel}>Cài đặt</span>
            </button>
            <button className={`${styles.actionBtn} ${styles.disabled}`} disabled>
              <span className={styles.actionIcon}>📊</span>
              <span className={styles.actionLabel}>Báo cáo</span>
            </button>
          </div>
        </div>

        <div className={styles.infoSection}>
          <h2>Thông tin hệ thống</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Phiên làm việc:</label>
              <p>{user?.email}</p>
            </div>
            <div className={styles.infoItem}>
              <label>Vai trò:</label>
              <p>Administrator</p>
            </div>
            <div className={styles.infoItem}>
              <label>Trạng thái:</label>
              <p className={styles.activeStatus}>Hoạt động</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
