"use client";

import styles from "./Admin.module.css";

interface Props {
  productsCount: number;
  showDiscountPanel: boolean;
  showLogPanel: boolean;
  logsCount: number;
  onNavigate: (path: string) => void;
  onToggleDiscount: () => void;
  onToggleLogs: () => void;
}

export default function AdminHeader({
  productsCount,
  showDiscountPanel,
  showLogPanel,
  logsCount,
  onNavigate,
  onToggleDiscount,
  onToggleLogs
}: Props) {
  return (
    <div className={styles.adminHeader}>
      <div className={styles.headerLeft}>
        <h1 className={styles.adminTitle}>Panel de Administración</h1>
        <div className={styles.headerMeta}>
          <span className={styles.productCount}>{productsCount} productos</span>
          <span className={styles.adminBadge}>Admin</span>
        </div>
      </div>

      <div className={styles.headerActions}>
        <button className={styles.navButton} onClick={() => onNavigate("/perfil")}>
          <span className={styles.buttonIcon}>👤</span>
          Perfil
        </button>

        <button className={styles.navButton} onClick={() => onNavigate("/meta")}>
          <span className={styles.buttonIcon}>🎯</span>
          Meta
        </button>

        <button className={styles.navButton} onClick={() => onNavigate("/orden")}>
          <span className={styles.buttonIcon}>📦</span>
          Órdenes
        </button>

        <button className={styles.navButton} onClick={() => onNavigate("/admin/blog")}>
          <span className={styles.buttonIcon}>📝</span>
          Blog
        </button>

        <button
          className={`${styles.navButton} ${showDiscountPanel ? styles.active : ""}`}
          onClick={onToggleDiscount}
        >
          <span className={styles.buttonIcon}>🎁</span>
          Descuento 1ra Compra
        </button>

        <button
          className={`${styles.logButton} ${showLogPanel ? styles.active : ""}`}
          onClick={onToggleLogs}
        >
          <span className={styles.buttonIcon}>📊</span>
          Logs ({logsCount})
        </button>
      </div>
    </div>
  );
}