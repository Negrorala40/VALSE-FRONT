"use client";

import styles from "../meta.module.css";
import { MetaProductResponse } from "../types";
import {
  countVariantsEnabledForFeed,
  countVariantsWithDiscount,
  countVariantsWithStock,
  formatCop,
  getAverageDiscountedPrice,
  getMaxDiscount,
  variantHasDiscount,
} from "../metaUtils";

interface Props {
  products: MetaProductResponse[];
  onToggleMetaEnabled: (productId: number, enabled: boolean) => void;
  onEdit: (product: MetaProductResponse) => void;
  onClearFilters: () => void;
  searchTerm: string;
}

function renderDiscountBadge(product: MetaProductResponse) {
  const discountCount = countVariantsWithDiscount(product);

  if (discountCount === 0) {
    return null;
  }

  const maxDiscount = getMaxDiscount(product);
  const avgPrice = getAverageDiscountedPrice(product);

  return (
    <div className={styles.discountBadge}>
      <span className={styles.discountIcon}>🔥</span>
      <span className={styles.discountText}>
        {discountCount} var. con descuento
        {maxDiscount > 0 && ` (hasta ${maxDiscount}% off)`}
      </span>
      {avgPrice && (
        <span className={styles.discountPrice}>~${formatCop(avgPrice)} COP</span>
      )}
    </div>
  );
}

function renderVariantInfo(product: MetaProductResponse) {
  return product.variants.map((variant) => {
    const hasDiscount = variantHasDiscount(variant);

    return (
      <div key={variant.variantId} className={styles.variantItem}>
        <div className={styles.variantHeader}>
          <span className={styles.variantColor}>{variant.color}</span>
          <span className={styles.variantSize}>{variant.size}</span>
          {hasDiscount && (
            <span className={styles.variantDiscountTag}>
              🔥 {variant.discountPercentage || 0}% OFF
            </span>
          )}
        </div>

        <div className={styles.variantDetails}>
          <span
            className={`${styles.variantStock} ${
              variant.stock > 0 ? styles.inStock : styles.outOfStock
            }`}
          >
            Stock: {variant.stock}
          </span>

          <span className={styles.variantPrice}>
            {hasDiscount ? (
              <>
                <span className={styles.originalPrice}>
                  ${formatCop(variant.price)} COP
                </span>
                <span className={styles.discountedPrice}>
                  ${formatCop(variant.priceWithDiscount)} COP
                </span>
              </>
            ) : (
              <span>${formatCop(variant.price)} COP</span>
            )}
          </span>

          <span
            className={`${styles.variantStatus} ${
              variant.variantEnabledForMeta
                ? styles.statusEnabled
                : styles.statusDisabled
            }`}
          >
            {variant.variantEnabledForMeta ? "✅ META" : "❌"}
          </span>
        </div>
      </div>
    );
  });
}

export default function MetaProductsGrid({
  products,
  onToggleMetaEnabled,
  onEdit,
  onClearFilters,
  searchTerm,
}: Props) {
  return (
    <div className={styles.productsTableContainer}>
      <div className={styles.tableHeader}>
        <h3 className={styles.tableTitle}>
          <span className={styles.tableIcon}>📋</span>
          Catálogo META ({products.length} productos)
        </h3>

        <div className={styles.tableStats}>
          <span className={styles.tableStat}>
            <span className={styles.statValue}>
              {products.filter((product) => product.enabledForMeta).length}
            </span>{" "}
            habilitados
          </span>

          <span className={styles.tableStat}>
            <span className={styles.statValue}>
              {products.reduce(
                (sum, product) => sum + countVariantsWithDiscount(product),
                0
              )}
            </span>{" "}
            variantes con descuento
          </span>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        {products.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📦</div>
            <h4 className={styles.emptyTitle}>No hay productos que coincidan</h4>
            <p className={styles.emptyText}>
              {searchTerm
                ? `No se encontraron productos para "${searchTerm}"`
                : "No hay productos configurados para META"}
            </p>

            <button onClick={onClearFilters} className={styles.emptyButton} type="button">
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className={styles.productsGrid}>
            {products.map((product) => {
              const enabledVariants = countVariantsEnabledForFeed(product);

              return (
                <div
                  key={product.productId}
                  className={`${styles.productCard} ${
                    !product.enabledForMeta ? styles.disabledCard : ""
                  }`}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitle}>
                      <h4 className={styles.productName}>
                        {product.productName}
                        {product.enabledForMeta && (
                          <span className={styles.metaBadge}>META</span>
                        )}
                      </h4>
                      <code className={styles.productSku}>{product.sku}</code>
                    </div>

                    <div className={styles.cardActions}>
                      <button
                        onClick={() =>
                          onToggleMetaEnabled(product.productId, !product.enabledForMeta)
                        }
                        className={`${styles.toggleButton} ${
                          product.enabledForMeta ? styles.toggleOn : styles.toggleOff
                        }`}
                        title={
                          product.enabledForMeta
                            ? "Desactivar de META"
                            : "Activar para META"
                        }
                        type="button"
                      >
                        {product.enabledForMeta ? "✅" : "❌"}
                      </button>

                      <button
                        onClick={() => onEdit(product)}
                        className={styles.editIconButton}
                        title="Editar metadata"
                        type="button"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>

                  <div className={styles.cardBody}>
                    {product.metaTitle && (
                      <div className={styles.metaTitle}>
                        <strong>Título META:</strong> {product.metaTitle}
                      </div>
                    )}

                    <div className={styles.productDescription}>
                      {product.productDescription?.substring(0, 120)}...
                    </div>

                    {renderDiscountBadge(product)}

                    <div className={styles.variantStats}>
                      <div className={styles.variantStat}>
                        <span className={styles.statIcon}>🔢</span>
                        <span className={styles.statValue}>{product.variants.length}</span>
                        <span className={styles.statLabel}>variantes</span>
                      </div>

                      <div className={styles.variantStat}>
                        <span className={styles.statIcon}>📦</span>
                        <span className={styles.statValue}>
                          {countVariantsWithStock(product)}
                        </span>
                        <span className={styles.statLabel}>con stock</span>
                      </div>

                      <div className={styles.variantStat}>
                        <span
                          className={`${styles.statValue} ${
                            enabledVariants > 0 ? styles.statPositive : styles.statNegative
                          }`}
                        >
                          {enabledVariants}
                        </span>
                        <span className={styles.statLabel}>para feed</span>
                      </div>
                    </div>

                    <details className={styles.variantsDetails}>
                      <summary className={styles.variantsSummary}>
                        <span>
                          Ver {product.variants.length} variante
                          {product.variants.length !== 1 ? "s" : ""}
                        </span>

                        <span className={styles.variantsCount}>
                          {countVariantsWithDiscount(product) > 0 && (
                            <span className={styles.discountCount}>
                              🔥 {countVariantsWithDiscount(product)} con descuento
                            </span>
                          )}
                        </span>
                      </summary>

                      <div className={styles.variantsList}>
                        {renderVariantInfo(product)}
                      </div>
                    </details>
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.footerStatus}>
                      <span
                        className={`${styles.statusBadge} ${
                          product.enabledForMeta
                            ? styles.statusEnabled
                            : styles.statusDisabled
                        }`}
                      >
                        {product.enabledForMeta
                          ? "✅ Activado para META"
                          : "❌ No en META"}
                      </span>

                      {enabledVariants > 0 ? (
                        <span className={styles.statusPositive}>
                          Aparecerá en feed con {enabledVariants} variante
                          {enabledVariants !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className={styles.statusNegative}>
                          Ninguna variante disponible para feed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}