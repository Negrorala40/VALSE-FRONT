"use client";

import styles from "../meta.module.css";

interface Props {
  searchTerm: string;
  showOnlyEnabled: boolean;
  showOnlyDiscounted: boolean;
  onChangeSearchTerm: (value: string) => void;
  onChangeShowOnlyEnabled: (value: boolean) => void;
  onChangeShowOnlyDiscounted: (value: boolean) => void;
  onRefresh: () => void;
  onMigrate: () => void;
  onGenerateCSV: () => void;
  onGenerateFeed: () => void;
}

export default function MetaActionBar({
  searchTerm,
  showOnlyEnabled,
  showOnlyDiscounted,
  onChangeSearchTerm,
  onChangeShowOnlyEnabled,
  onChangeShowOnlyDiscounted,
  onRefresh,
  onMigrate,
  onGenerateCSV,
  onGenerateFeed,
}: Props) {
  return (
    <div className={styles.actionBar}>
      <div className={styles.searchContainer}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="🔍 Buscar producto, SKU, color, talla..."
            value={searchTerm}
            onChange={(e) => onChangeSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <button
            onClick={() => onChangeSearchTerm("")}
            className={styles.clearSearchButton}
            style={{ visibility: searchTerm ? "visible" : "hidden" }}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className={styles.filterControls}>
          <label className={styles.filterLabel}>
            <input
              type="checkbox"
              checked={showOnlyEnabled}
              onChange={(e) => onChangeShowOnlyEnabled(e.target.checked)}
              className={styles.filterCheckbox}
            />
            <span className={styles.filterText}>Solo habilitados para META</span>
          </label>

          <label className={styles.filterLabel}>
            <input
              type="checkbox"
              checked={showOnlyDiscounted}
              onChange={(e) => onChangeShowOnlyDiscounted(e.target.checked)}
              className={styles.filterCheckbox}
            />
            <span className={styles.filterText}>Solo con descuento</span>
          </label>
        </div>
      </div>

      <div className={styles.actionButtons}>
        <button
          onClick={onRefresh}
          className={`${styles.actionButton} ${styles.refreshButton}`}
          title="Actualizar datos"
          type="button"
        >
          <span className={styles.buttonIcon}>🔄</span>
          Actualizar
        </button>

        <button
          onClick={onMigrate}
          className={`${styles.actionButton} ${styles.migrateButton}`}
          title="Crear metadata para productos sin configurar"
          type="button"
        >
          <span className={styles.buttonIcon}>⚡</span>
          Migrar Productos
        </button>

        <button
          onClick={onGenerateCSV}
          className={`${styles.actionButton} ${styles.downloadButton}`}
          title="Descargar CSV para importar en META"
          type="button"
        >
          <span className={styles.buttonIcon}>📥</span>
          Descargar CSV
        </button>

        <button
          onClick={onGenerateFeed}
          className={`${styles.actionButton} ${styles.generateButton}`}
          title="Generar feed en servidor"
          type="button"
        >
          <span className={styles.buttonIcon}>⚙️</span>
          Generar Feed
        </button>
      </div>
    </div>
  );
}