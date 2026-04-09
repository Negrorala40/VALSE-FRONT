"use client";

import { useRouter } from "next/navigation";
import styles from "../meta.module.css";
import MetaHeader from "./MetaHeader";
import MetaStatsPanel from "./MetaStatsPanel";
import MetaActionBar from "./MetaActionBar";
import MetaPagination from "./MetaPagination";
import MetaProductsGrid from "./MetaProductsGrid";
import EditMetaModal from "./EditMetaModal";
import { useMetaDashboard } from "../hooks/useMetaDashboard";
import { countVariantsWithDiscount } from "../metaUtils";

export default function MetaDashboardPage() {
  const router = useRouter();

  const {
    filteredProducts,
    stats,
    loading,
    error,
    selectedProduct,
    showEditModal,
    searchTerm,
    showOnlyEnabled,
    showOnlyDiscounted,
    currentPage,
    totalPages,
    totalElements,
    setSearchTerm,
    setShowOnlyEnabled,
    setShowOnlyDiscounted,
    setCurrentPage,
    loadMetaData,
    toggleMetaEnabled,
    migrateProducts,
    generateCSV,
    generateFeed,
    updateProductMetadata,
    openEditModal,
    closeEditModal,
    clearFilters,
  } = useMetaDashboard();

  const navigateTo = (path: string) => {
    router.push(path);
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner}></div>
        <p>Cargando dashboard META...</p>
        <p className={styles.loadingSubtext}>
          Obteniendo productos y estadísticas
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorAlert}>
        <div className={styles.errorContent}>
          <span className={styles.errorIcon}>⚠️</span>
          <div className={styles.errorText}>
            <strong>Error cargando datos META:</strong> {error}
          </div>
        </div>

        <div className={styles.errorActions}>
          <button onClick={loadMetaData} className={styles.retryButton} type="button">
            <span className={styles.buttonIcon}>🔄</span>
            Reintentar
          </button>

          <button
            onClick={() => navigateTo("/admin")}
            className={styles.backButton}
            type="button"
          >
            <span className={styles.buttonIcon}>←</span>
            Volver al Admin
          </button>
        </div>
      </div>
    );
  }

  const totalDiscountedVariants = filteredProducts.reduce(
    (sum, product) => sum + countVariantsWithDiscount(product),
    0
  );

  return (
    <div className={styles.container}>
      <MetaHeader totalElements={totalElements} onNavigate={navigateTo} />

      <MetaStatsPanel stats={stats} />

      <MetaActionBar
        searchTerm={searchTerm}
        showOnlyEnabled={showOnlyEnabled}
        showOnlyDiscounted={showOnlyDiscounted}
        onChangeSearchTerm={setSearchTerm}
        onChangeShowOnlyEnabled={setShowOnlyEnabled}
        onChangeShowOnlyDiscounted={setShowOnlyDiscounted}
        onRefresh={loadMetaData}
        onMigrate={migrateProducts}
        onGenerateCSV={generateCSV}
        onGenerateFeed={generateFeed}
      />

      <div className={styles.feedInfo}>
        <div className={styles.feedInfoContent}>
          <span className={styles.feedInfoIcon}>ℹ️</span>
          <div className={styles.feedInfoText}>
            <strong>Feed META incluirá descuentos por variante:</strong> Las variantes con
            descuento mostrarán automáticamente <code>sale_price</code> en el CSV. Se
            priorizan descuentos por variante sobre descuentos globales.
          </div>
        </div>

        <div className={styles.feedStats}>
          <span className={styles.feedStat}>
            📊 {totalDiscountedVariants} variantes con descuento detectadas
          </span>
        </div>
      </div>

      <MetaPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalElements={totalElements}
        filteredCount={filteredProducts.length}
        onChangePage={setCurrentPage}
      />

      <MetaProductsGrid
        products={filteredProducts}
        onToggleMetaEnabled={toggleMetaEnabled}
        onEdit={openEditModal}
        onClearFilters={clearFilters}
        searchTerm={searchTerm}
      />

      <div className={styles.infoSection}>
        <h3 className={styles.infoTitle}>
          <span className={styles.infoIcon}>ℹ️</span>
          Información Importante - Feed META con Descuentos
        </h3>

        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <h4 className={styles.infoCardTitle}>🔥 Descuentos por Variante</h4>
            <ul className={styles.infoList}>
              <li>✅ Descuentos aplicados directamente a variantes</li>
              <li>✅ Prioridad sobre descuentos globales</li>
              <li>✅ Campo <code>sale_price</code> generado automáticamente</li>
              <li>✅ Fechas de oferta auto-generadas</li>
              <li>✅ Compatible con etiquetas de oferta META</li>
            </ul>
          </div>

          <div className={styles.infoCard}>
            <h4 className={styles.infoCardTitle}>📋 Requisitos Feed</h4>
            <ul className={styles.infoList}>
              <li>
                <strong>Producto:</strong> Habilitado para META
              </li>
              <li>
                <strong>Variante:</strong> Habilitada, con stock y descuento configurado
              </li>
              <li>
                <strong>Precio:</strong> Regular y con descuento calculado
              </li>
              <li>
                <strong>Stock:</strong> Mayor a 0 unidades
              </li>
              <li>
                <strong>Imagen:</strong> Mínimo 500x500px
              </li>
            </ul>
          </div>

          <div className={styles.infoCard}>
            <h4 className={styles.infoCardTitle}>🚚 Configuración Envío</h4>
            <ul className={styles.infoList}>
              <li>
                <strong>Formato:</strong>{" "}
                <code>País:Región:Servicio:PrecioMoneda</code>
              </li>
              <li>
                <strong>Ejemplo gratis:</strong> <code>CO::::0.0 COP</code>
              </li>
              <li>
                <strong>Ejemplo estándar:</strong> <code>CO::::12000.0 COP</code>
              </li>
              <li>
                <strong>Recomendado:</strong> 12000 COP para Colombia
              </li>
            </ul>
          </div>
        </div>
      </div>

      {showEditModal && selectedProduct && (
        <EditMetaModal
          product={selectedProduct}
          onClose={closeEditModal}
          onSave={updateProductMetadata}
        />
      )}
    </div>
  );
}