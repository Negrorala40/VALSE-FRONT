"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";
import FirstPurchaseDiscountControl from "../../admin/discount/FirstPurchaseDiscountControl";
import styles from "./Admin.module.css";
import AdminHeader from "./AdminHeader";
import AdminLogPanel from "./AdminLogPanel";
import AdminProductForm from "./AdminProductForm";
import AdminProductsTable from "./AdminProductsTable";
import { useAdminLogs } from "./hooks/useAdminLogs";
import { useAdminProducts } from "./hooks/useAdminProducts";

export default function AdminPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [showDiscountPanel, setShowDiscountPanel] = useState(false);

  const { logs, addLog, clearLogs, downloadLogs } = useAdminLogs();

  const {
    products,
    formState,
    validationErrors,
    isLoading,
    isToggling,
    editingProductId,
    collapsedColorIds,
    openColorDropdownId,
    fetchProducts,
    resetForm,
    updateGeneralField,
    updateColorName,
    selectPredefinedColor,
    toggleColorDropdown,
    toggleColorCollapse,
    addColor,
    removeColor,
    addSize,
    removeSize,
    updateSizeField,
    addImage,
    removeImage,
    handleImageUploaded,
    validateAndSubmit,
    handleEdit,
    toggleProductStatus
  } = useAdminProducts({ addLog });

  useEffect(() => {
    const storedRole = localStorage.getItem("role");

    if (storedRole !== "ROLE_ADMIN") {
      setRole("");
      setIsCheckingRole(false);
      router.push("/");
      return;
    }

    setRole(storedRole);
    setIsCheckingRole(false);
    fetchProducts();
    addLog("Admin Panel inicializado");
  }, [addLog, fetchProducts, router]);

  const navigateTo = (path: string) => {
    addLog(`Navegando a: ${path}`);
    router.push(path);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        addLog("URL copiada al portapapeles");
        alert("URL copiada!");
      })
      .catch((err) => {
        addLog("Error al copiar URL", err);
      });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await validateAndSubmit();
  };

  if (isCheckingRole) {
    return (
      <div className={styles.container}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Cargando panel...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (role !== "ROLE_ADMIN") {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Acceso Denegado</h2>
        <p>No tienes permisos para acceder.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff"
          }
        }}
      />

      <AdminHeader
        productsCount={products.length}
        showDiscountPanel={showDiscountPanel}
        showLogPanel={showLogPanel}
        logsCount={logs.length}
        onNavigate={navigateTo}
        onToggleDiscount={() => setShowDiscountPanel((prev) => !prev)}
        onToggleLogs={() => setShowLogPanel((prev) => !prev)}
      />

      {showDiscountPanel && (
        <div className={styles.discountPanel}>
          <FirstPurchaseDiscountControl />
        </div>
      )}

      {showLogPanel && (
        <AdminLogPanel
          logs={logs}
          onClear={clearLogs}
          onDownload={downloadLogs}
          onClose={() => setShowLogPanel(false)}
        />
      )}

      <AdminProductForm
        formState={formState}
        validationErrors={validationErrors}
        isLoading={isLoading}
        editingProductId={editingProductId}
        collapsedColorIds={collapsedColorIds}
        openColorDropdownId={openColorDropdownId}
        onSubmit={handleSubmit}
        onChangeField={updateGeneralField}
        onToggleColorCollapse={toggleColorCollapse}
        onToggleColorDropdown={toggleColorDropdown}
        onChangeColorName={updateColorName}
        onSelectColor={selectPredefinedColor}
        onAddColor={addColor}
        onRemoveColor={removeColor}
        onAddImage={addImage}
        onRemoveImage={removeImage}
        onImageUploaded={handleImageUploaded}
        onAddSize={addSize}
        onRemoveSize={removeSize}
        onChangeSize={updateSizeField}
        onReset={resetForm}
        onCopyToClipboard={copyToClipboard}
      />

      <AdminProductsTable
        products={products}
        isLoading={isLoading}
        isToggling={isToggling}
        onRefresh={fetchProducts}
        onEdit={handleEdit}
        onToggleStatus={toggleProductStatus}
      />

      <div className={styles.infoFooter}>
        <div className={styles.infoCard}>
          <h4 className={styles.infoTitle}>
            <span className={styles.infoIcon}>ℹ️</span>
            Información Importante
          </h4>
          <ul className={styles.infoList}>
            <li className={styles.infoItem}>
              <span className={styles.itemIcon}>⏸️</span>
              Productos inhabilitados no son visibles al público
            </li>
            <li className={styles.infoItem}>
              <span className={styles.itemIcon}>📦</span>
              Stock 0 = Producto agotado = No disponible para compra
            </li>
            <li className={styles.infoItem}>
              <span className={styles.itemIcon}>🔒</span>
              Colores/tallas con órdenes no se pueden editar
            </li>
            <li className={styles.infoItem}>
              <span className={styles.itemIcon}>💰</span>
              Precios en Pesos Colombianos (COP)
            </li>
          </ul>
        </div>

        <div className={styles.infoCard}>
          <h4 className={styles.infoTitle}>
            <span className={styles.infoIcon}>💡</span>
            Buenas Prácticas
          </h4>
          <ul className={styles.infoList}>
            <li className={styles.infoItem}>
              <span className={styles.itemIcon}>🖼️</span>
              Verifica imágenes antes de publicar
            </li>
            <li className={styles.infoItem}>
              <span className={styles.itemIcon}>📊</span>
              Mantén stock actualizado regularmente
            </li>
            <li className={styles.infoItem}>
              <span className={styles.itemIcon}>⏸️</span>
              Inhabilita productos en lugar de eliminarlos
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.panelFooter}>
        <div className={styles.footerContent}>
          <span className={styles.footerText}>Panel de Administración v1.0</span>
          <span className={styles.footerSeparator}>•</span>
          <span className={styles.footerText}>Total productos: {products.length}</span>
          <span className={styles.footerSeparator}>•</span>
          <span className={styles.footerText}>Sesión activa: Administrador</span>
        </div>
      </div>
    </div>
  );
}