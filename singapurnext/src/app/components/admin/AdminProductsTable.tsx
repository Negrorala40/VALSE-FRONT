"use client";

import styles from "./Admin.module.css";
import { getColorHex } from "./adminUtils";
import { Product } from "./types";

interface Props {
  products: Product[];
  isLoading: boolean;
  isToggling: number | null;
  onRefresh: () => void;
  onEdit: (product: Product) => void;
  onToggleStatus: (id: number, currentStatus: boolean) => void;
}

export default function AdminProductsTable({
  products,
  isLoading,
  isToggling,
  onRefresh,
  onEdit,
  onToggleStatus
}: Props) {
  const genderClassMap = {
    NIÑOS: styles["niños"],
    NIÑAS: styles["niñas"],
    UNISEX: styles.unisex
  };

  return (
    <div className={styles.productsCard}>
      <div className={styles.productsHeader}>
        <div className={styles.productsTitleRow}>
          <h2 className={styles.productsTitle}>
            <span className={styles.titleIcon}>📦</span>
            Productos en Catálogo
          </h2>

          <div className={styles.productsStats}>
            <span className={styles.statItem}>
              <span className={styles.statIcon}>✅</span>
              {products.filter((p) => p.enabled).length} habilitados
            </span>
            <span className={styles.statItem}>
              <span className={styles.statIcon}>⏸️</span>
              {products.filter((p) => !p.enabled).length} inhabilitados
            </span>
          </div>
        </div>

        <div className={styles.productsActions}>
          <button
            onClick={onRefresh}
            className={styles.refreshButton}
            disabled={isLoading}
            title="Actualizar lista de productos"
            aria-label="Actualizar lista"
          >
            <span className={styles.buttonIcon}>🔄</span>
            Actualizar
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📦</div>
          <h3 className={styles.emptyTitle}>No hay productos registrados</h3>
          <p className={styles.emptySubtitle}>
            Comienza creando tu primer producto usando el formulario superior
          </p>
        </div>
      ) : (
        <div className={styles.productsTable}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.tableHeader}>
                    <span className={styles.headerIcon}>📋</span>
                    Producto
                  </th>
                  <th className={styles.tableHeader}>
                    <span className={styles.headerIcon}>👥</span>
                    Género
                  </th>
                  <th className={styles.tableHeader}>
                    <span className={styles.headerIcon}>⚡</span>
                    Estado
                  </th>
                  <th className={styles.tableHeader}>
                    <span className={styles.headerIcon}>🎨</span>
                    Variantes
                  </th>
                  <th className={styles.tableHeader}>
                    <span className={styles.headerIcon}>📦</span>
                    Stock
                  </th>
                  <th className={styles.tableHeader}>
                    <span className={styles.headerIcon}>⚙️</span>
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const colors = Array.from(new Set(product.variants.map((v) => v.color)));
                  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
                  const hasDiscount = product.variants.some(
                    (v) => !!v.discountPercentage && v.discountPercentage > 0
                  );

                  return (
                    <tr
                      key={product.id}
                      className={`${styles.tableRow} ${
                        product.hasOrders ? styles.hasOrders : ""
                      } ${!product.enabled ? styles.disabledProduct : ""}`}
                    >
                      <td className={styles.productCell}>
                        <div className={styles.productInfo}>
                          <div className={styles.productHeader}>
                            <h4 className={styles.productName}>{product.name}</h4>
                            <div className={styles.productBadges}>
                              {!product.enabled && (
                                <span className={`${styles.badge} ${styles.disabledBadge}`}>
                                  ⏸️ Inhabilitado
                                </span>
                              )}
                              {product.hasOrders && (
                                <span className={`${styles.badge} ${styles.ordersBadge}`}>
                                  📦 Con órdenes
                                </span>
                              )}
                            </div>
                          </div>

                          <p className={styles.productDescription}>
                            {product.description?.slice(0, 80)}...
                          </p>
                        </div>
                      </td>

                      <td className={styles.genderCell}>
                        <span
                          className={`${styles.genderBadge} ${
                            genderClassMap[product.gender as keyof typeof genderClassMap] || ""
                          }`}
                        >
                          {product.gender === "NIÑOS"
                            ? "👦"
                            : product.gender === "NIÑAS"
                            ? "👧"
                            : "👥"}
                          {product.gender}
                        </span>
                      </td>

                      <td className={styles.statusCell}>
                        <div className={styles.statusIndicator}>
                          {product.enabled ? (
                            <span className={styles.statusEnabled}>
                              <span className={styles.statusIcon}>✅</span>
                              Habilitado
                            </span>
                          ) : (
                            <span className={styles.statusDisabled}>
                              <span className={styles.statusIcon}>⏸️</span>
                              Inhabilitado
                            </span>
                          )}
                        </div>
                      </td>

                      <td className={styles.variantsCell}>
                        <div className={styles.variantsContainer}>
                          {colors.slice(0, 2).map((color) => (
                            <span key={color} className={styles.colorTag}>
                              <span
                                className={styles.colorDot}
                                style={{ backgroundColor: getColorHex(color) }}
                              />
                              {color}
                            </span>
                          ))}

                          {colors.length > 2 && (
                            <span className={styles.moreTag}>
                              +{colors.length - 2} más
                            </span>
                          )}
                        </div>
                      </td>

                      <td className={styles.stockCell}>
                        <div className={styles.stockInfo}>
                          <span className={styles.stockNumber}>{totalStock}</span>

                          {totalStock === 0 && (
                            <span className={styles.outOfStock}>⚠️ Agotado</span>
                          )}

                          {hasDiscount && (
                            <span className={styles.discountBadge}>
                              <span className={styles.discountIcon}>🎯</span>
                              Con descuento
                            </span>
                          )}
                        </div>
                      </td>

                      <td className={styles.actionsCell}>
                        <div className={styles.tableActionButtons}>
                          <button
                            className={`${styles.actionButton} ${styles.editButton}`}
                            onClick={() => onEdit(product)}
                            disabled={isLoading || isToggling !== null}
                            title="Editar producto"
                            aria-label="Editar producto"
                          >
                            <span className={styles.buttonIcon}>✏️</span>
                            Editar
                          </button>

                          <button
                            className={`${styles.actionButton} ${
                              product.enabled ? styles.disableButton : styles.enableButton
                            }`}
                            onClick={() => onToggleStatus(product.id!, product.enabled!)}
                            disabled={isLoading || isToggling !== null}
                            title={product.enabled ? "Inhabilitar producto" : "Habilitar producto"}
                            aria-label={product.enabled ? "Inhabilitar producto" : "Habilitar producto"}
                          >
                            {isToggling === product.id ? (
                              <span className={styles.smallSpinner}></span>
                            ) : product.enabled ? (
                              <>
                                <span className={styles.buttonIcon}>⏸️</span>
                                Inhabilitar
                              </>
                            ) : (
                              <>
                                <span className={styles.buttonIcon}>✅</span>
                                Habilitar
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}