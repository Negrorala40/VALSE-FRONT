"use client";

import { useMemo, useState } from "react";
import styles from "../meta.module.css";
import { EditMetaFormData, MetaProductResponse, MetaProductUpdateDTO } from "../types";
import { countVariantsWithDiscount } from "../metaUtils";

interface Props {
  product: MetaProductResponse;
  onClose: () => void;
  onSave: (productId: number, data: MetaProductUpdateDTO) => Promise<boolean>;
}

export default function EditMetaModal({ product, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<EditMetaFormData>({
    enabledForMeta: product.enabledForMeta,
    metaTitle: product.metaTitle || "",
    metaDescription: product.metaDescription || "",
    googleProductCategory: product.googleProductCategory || "",
    fbProductCategory: product.fbProductCategory || "",
    material: product.material || "",
    pattern: product.pattern || "",
    style: product.style || "",
    gtin: product.gtin || "",
    shipping: product.shipping || "CO::::12000.0 COP",
    shippingWeight: product.shippingWeight ? String(product.shippingWeight) : "",
    salePrice: product.salePrice ? String(product.salePrice) : "",
    salePriceStartDate: product.salePriceStartDate || "",
    salePriceEndDate: product.salePriceEndDate || "",
    videoUrl: product.videoUrl || "",
    videoTag: product.videoTag || "",
    customLabels: product.customLabels || "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const titleCount = useMemo(() => formData.metaTitle.length, [formData.metaTitle]);
  const descriptionCount = useMemo(
    () => formData.metaDescription.length,
    [formData.metaDescription]
  );

  const setField = <K extends keyof EditMetaFormData>(
    field: K,
    value: EditMetaFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (formData.metaTitle.trim() && formData.metaTitle.trim().length > 150) {
        throw new Error("El título no puede exceder 150 caracteres");
      }

      const payload: MetaProductUpdateDTO = {
        enabledForMeta: formData.enabledForMeta,
        metaTitle: formData.metaTitle.trim(),
        metaDescription: formData.metaDescription.trim(),
        googleProductCategory: formData.googleProductCategory.trim(),
        fbProductCategory: formData.fbProductCategory.trim(),
        material: formData.material.trim(),
        pattern: formData.pattern.trim(),
        style: formData.style.trim(),
        gtin: formData.gtin.trim(),
        shipping: formData.shipping.trim(),
        shippingWeight: formData.shippingWeight
          ? parseFloat(formData.shippingWeight)
          : null,
        salePrice: formData.salePrice ? parseFloat(formData.salePrice) : null,
        salePriceStartDate: formData.salePriceStartDate,
        salePriceEndDate: formData.salePriceEndDate,
        videoUrl: formData.videoUrl.trim(),
        videoTag: formData.videoTag.trim(),
        customLabels: formData.customLabels.trim(),
      };

      const success = await onSave(product.productId, payload);

      if (!success) {
        throw new Error("No se pudo guardar");
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "Error guardando cambios");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleContainer}>
            <h3 className={styles.modalTitle}>✏️ Editar: {product.productName}</h3>
            <div className={styles.modalSubtitle}>
              SKU: <code>{product.sku}</code> • Variantes: {product.variants.length} (
              {countVariantsWithDiscount(product)} con descuento)
            </div>
          </div>

          <button onClick={onClose} className={styles.closeButton} type="button">
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className={styles.formSection}>
              <h4 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>✅</span>
                Estado META
              </h4>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.enabledForMeta}
                  onChange={(e) => setField("enabledForMeta", e.target.checked)}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxText}>
                  Habilitar para META Commerce
                </span>
              </label>
            </div>

            <div className={styles.formSection}>
              <h4 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📝</span>
                Información Básica
              </h4>

              <div className={styles.formGroup}>
                <label className={styles.inputLabel}>
                  Título META <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.metaTitle}
                  onChange={(e) => setField("metaTitle", e.target.value)}
                  placeholder="Título optimizado para META"
                  required
                  maxLength={150}
                  className={styles.input}
                />
                <div className={styles.charCount}>{titleCount}/150</div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.inputLabel}>Descripción META</label>
                <textarea
                  value={formData.metaDescription}
                  onChange={(e) => setField("metaDescription", e.target.value)}
                  placeholder="Descripción para META"
                  rows={4}
                  maxLength={500}
                  className={`${styles.input} ${styles.textarea}`}
                />
                <div className={styles.charCount}>{descriptionCount}/500</div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h4 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🚚</span>
                Configuración de Envío
              </h4>

              <div className={styles.formGroup}>
                <label className={styles.inputLabel}>Shipping (Formato META)</label>
                <input
                  type="text"
                  value={formData.shipping}
                  onChange={(e) => setField("shipping", e.target.value)}
                  placeholder="CO::::12000.0 COP"
                  className={`${styles.input} ${styles.codeInput}`}
                />
                <div className={styles.helpText}>
                  Formato: País:Región:Servicio:PrecioMoneda. Ej: CO::::12000.0 COP
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Peso (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.shippingWeight}
                    onChange={(e) => setField("shippingWeight", e.target.value)}
                    placeholder="0.5"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Sale Price Global</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.salePrice}
                    onChange={(e) => setField("salePrice", e.target.value)}
                    placeholder="Opcional"
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Inicio Oferta</label>
                  <input
                    type="date"
                    value={formData.salePriceStartDate}
                    onChange={(e) => setField("salePriceStartDate", e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Fin Oferta</label>
                  <input
                    type="date"
                    value={formData.salePriceEndDate}
                    onChange={(e) => setField("salePriceEndDate", e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h4 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🏷️</span>
                Características del Producto
              </h4>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Material</label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) => setField("material", e.target.value)}
                    placeholder="Algodón, Poliéster..."
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Patrón</label>
                  <input
                    type="text"
                    value={formData.pattern}
                    onChange={(e) => setField("pattern", e.target.value)}
                    placeholder="Sólido, Rayas..."
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Estilo</label>
                  <input
                    type="text"
                    value={formData.style}
                    onChange={(e) => setField("style", e.target.value)}
                    placeholder="Casual, Formal..."
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>GTIN (Código Barras)</label>
                  <input
                    type="text"
                    value={formData.gtin}
                    onChange={(e) => setField("gtin", e.target.value)}
                    placeholder="Opcional"
                    className={styles.input}
                  />
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h4 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📂</span>
                Categorías y Media
              </h4>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Categoría Google</label>
                  <input
                    type="text"
                    value={formData.googleProductCategory}
                    onChange={(e) =>
                      setField("googleProductCategory", e.target.value)
                    }
                    placeholder="Apparel & Accessories > Clothing"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Categoría Facebook</label>
                  <input
                    type="text"
                    value={formData.fbProductCategory}
                    onChange={(e) => setField("fbProductCategory", e.target.value)}
                    placeholder="Clothing"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Video URL</label>
                  <input
                    type="text"
                    value={formData.videoUrl}
                    onChange={(e) => setField("videoUrl", e.target.value)}
                    placeholder="https://..."
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Video Tag</label>
                  <input
                    type="text"
                    value={formData.videoTag}
                    onChange={(e) => setField("videoTag", e.target.value)}
                    placeholder="tag-video"
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.inputLabel}>Custom Labels</label>
                <input
                  type="text"
                  value={formData.customLabels}
                  onChange={(e) => setField("customLabels", e.target.value)}
                  placeholder="label_0, label_1..."
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                onClick={onClose}
                className={styles.cancelButton}
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className={styles.saveButton}
                disabled={saving}
              >
                {saving ? "Guardando..." : "💾 Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}