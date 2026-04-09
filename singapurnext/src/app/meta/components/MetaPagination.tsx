"use client";

import styles from "../meta.module.css";
import { getVisiblePageNumbers } from "../metaUtils";

interface Props {
  currentPage: number;
  totalPages: number;
  totalElements: number;
  filteredCount: number;
  onChangePage: (page: number) => void;
}

export default function MetaPagination({
  currentPage,
  totalPages,
  totalElements,
  filteredCount,
  onChangePage,
}: Props) {
  const pages = getVisiblePageNumbers(currentPage, totalPages);

  return (
    <div className={styles.paginationContainer}>
      <div className={styles.paginationInfo}>
        Página <strong>{currentPage + 1}</strong> de <strong>{totalPages || 1}</strong> •
        Mostrando <strong>{filteredCount}</strong> de <strong>{totalElements}</strong>{" "}
        productos
      </div>

      <div className={styles.paginationButtons}>
        <button
          onClick={() => onChangePage(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
          className={styles.paginationButton}
          title="Página anterior"
          type="button"
        >
          <span className={styles.buttonIcon}>←</span>
          Anterior
        </button>

        <div className={styles.pageNumbers}>
          {pages.map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onChangePage(pageNum)}
              className={`${styles.pageNumber} ${
                currentPage === pageNum ? styles.pageNumberActive : ""
              }`}
              type="button"
            >
              {pageNum + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => onChangePage(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className={styles.paginationButton}
          title="Página siguiente"
          type="button"
        >
          Siguiente
          <span className={styles.buttonIcon}>→</span>
        </button>
      </div>
    </div>
  );
}