"use client";

import styles from "./Admin.module.css";

interface Props {
  logs: string[];
  onClear: () => void;
  onDownload: () => void;
  onClose: () => void;
}

export default function AdminLogPanel({
  logs,
  onClear,
  onDownload,
  onClose
}: Props) {
  return (
    <div className={styles.logPanel}>
      <div className={styles.logPanelHeader}>
        <div className={styles.logPanelTitle}>
          <h3>📋 Registro de Actividad</h3>
          <span className={styles.logCount}>{logs.length} eventos</span>
        </div>

        <div className={styles.logActions}>
          <button onClick={onClear} className={`${styles.smallButton} ${styles.clearButton}`}>
            🗑️ Limpiar
          </button>
          <button onClick={onDownload} className={`${styles.smallButton} ${styles.downloadButton}`}>
            📥 Descargar
          </button>
          <button onClick={onClose} className={`${styles.smallButton} ${styles.closeButton}`}>
            ✕ Cerrar
          </button>
        </div>
      </div>

      <div className={styles.logContent}>
        {logs.length === 0 ? (
          <div className={styles.emptyLogs}>
            <span className={styles.emptyIcon}>📄</span>
            No hay actividad registrada
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={styles.logEntry}>
              <span className={styles.logTime}>{log.match(/\[(.*?)\]/)?.[1] || ""}</span>
              <span className={styles.logMessage}>{log.replace(/\[.*?\] /, "")}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}