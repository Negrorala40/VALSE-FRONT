"use client";

import styles from "../meta.module.css";
import { MetaStats } from "../types";

interface Props {
  stats: MetaStats | null;
}

export default function MetaStatsPanel({ stats }: Props) {
  return (
    <div className={styles.controlPanel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>
          <span className={styles.panelIcon}>📱</span>
          Dashboard META Commerce
          <span className={styles.panelVersion}>V2</span>
        </h2>
        <div className={styles.panelSubtitle}>
          Gestiona tus productos para Facebook e Instagram Shopping
          <span className={styles.featureTag}>
            ✅ Con soporte para descuentos por variante
          </span>
        </div>
      </div>

      <div className={styles.statsContainer}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper}>
            <span className={styles.statIcon}>📦</span>
          </div>
          <div className={styles.statContent}>
            <span className={styles.statNumber}>{stats?.totalProducts || 0}</span>
            <span className={styles.statLabel}>Productos Totales</span>
            <span className={styles.statSubtext}>En catálogo</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper}>
            <span className={styles.statIcon}>🔢</span>
          </div>
          <div className={styles.statContent}>
            <span className={styles.statNumber}>{stats?.totalVariants || 0}</span>
            <span className={styles.statLabel}>Total Variantes</span>
            <span className={styles.statSubtext}>Colores y tallas</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper}>
            <span className={styles.statIcon}>✅</span>
          </div>
          <div className={styles.statContent}>
            <span className={styles.statNumber}>
              {stats?.metaEnabledProducts || 0}
            </span>
            <span className={styles.statLabel}>Habilitados META</span>
            <span className={styles.statSubtext}>En feed</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper}>
            <span className={styles.statIcon}>📤</span>
          </div>
          <div className={styles.statContent}>
            <span className={styles.statNumber}>{stats?.eligibleForFeed || 0}</span>
            <span className={styles.statLabel}>Disponibles Feed</span>
            <span className={styles.statSubtext}>Con stock y habilitados</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper}>
            <span className={styles.statIcon}>⛔</span>
          </div>
          <div className={styles.statContent}>
            <span className={styles.statNumber}>{stats?.outOfStock || 0}</span>
            <span className={styles.statLabel}>Sin Stock</span>
            <span className={styles.statSubtext}>No disponibles</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper}>
            <span className={styles.statIcon}>🚫</span>
          </div>
          <div className={styles.statContent}>
            <span className={styles.statNumber}>{stats?.disabledProducts || 0}</span>
            <span className={styles.statLabel}>Deshabilitados</span>
            <span className={styles.statSubtext}>En sistema</span>
          </div>
        </div>
      </div>
    </div>
  );
}