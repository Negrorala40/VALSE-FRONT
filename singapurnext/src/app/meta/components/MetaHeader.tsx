"use client";

import styles from "../meta.module.css";

interface Props {
  totalElements: number;
  onNavigate: (path: string) => void;
}

export default function MetaHeader({ totalElements, onNavigate }: Props) {
  return (
    <div className={styles.adminHeader}>
      <div className={styles.headerLeft}>
        <h1 className={styles.adminTitle}>Panel de Administración META</h1>
        <div className={styles.headerMeta}>
          <span className={styles.pageBadge}>🚀 META COMMERCE</span>
          <span className={styles.productCount}>
            {totalElements} producto{totalElements !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className={styles.headerActions}>
        <button className={styles.navButton} onClick={() => onNavigate("/admin")}>
          🏠 Admin
        </button>

        <button className={styles.navButton} onClick={() => onNavigate("/perfil")}>
          👤 Perfil
        </button>

        <button
          className={`${styles.navButton} ${styles.navButtonActive}`}
          onClick={() => onNavigate("/meta")}
        >
          📱 META
        </button>

        <button className={styles.navButton} onClick={() => onNavigate("/orden")}>
          📦 Órdenes
        </button>

        <button
          className={styles.navButton}
          onClick={() => onNavigate("/admin/blog")}
        >
          📝 Blog
        </button>
      </div>
    </div>
  );
}