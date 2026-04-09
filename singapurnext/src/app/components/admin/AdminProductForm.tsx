"use client";

import React from "react";
import Image from "next/image";
import ImageUploader from "../ImageUploader";
import styles from "./Admin.module.css";
import {
  calculateDiscountAmount,
  calculatePriceWithDiscount,
  formatPrice,
  getColorHex,
  PREDEFINED_COLORS
} from "./adminUtils";
import { ProductFormState, ValidationError, ImageData } from "./types";

interface Props {
  formState: ProductFormState;
  validationErrors: ValidationError[];
  isLoading: boolean;
  editingProductId: number | null;
  collapsedColorIds: string[];
  openColorDropdownId: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onChangeField: (field: "name" | "description" | "gender", value: string) => void;
  onToggleColorCollapse: (colorUiId: string) => void;
  onToggleColorDropdown: (colorUiId: string) => void;
  onChangeColorName: (colorUiId: string, value: string) => void;
  onSelectColor: (colorUiId: string, value: string) => void;
  onAddColor: () => void;
  onRemoveColor: (colorUiId: string) => void;
  onAddImage: (colorUiId: string) => void;
  onRemoveImage: (colorUiId: string, imageIndex: number) => void;
  onImageUploaded: (imageData: ImageData, colorIndex?: number, imageIndex?: number) => void;
  onAddSize: (colorUiId: string) => void;
  onRemoveSize: (colorUiId: string, sizeUiId: string) => void;
  onChangeSize: (
    colorUiId: string,
    sizeUiId: string,
    field: "size" | "stock" | "price" | "discountPercentage",
    value: string | number
  ) => void;
  onReset: () => void;
  onCopyToClipboard: (text: string) => void;
}

export default function AdminProductForm({
  formState,
  validationErrors,
  isLoading,
  editingProductId,
  collapsedColorIds,
  openColorDropdownId,
  onSubmit,
  onChangeField,
  onToggleColorCollapse,
  onToggleColorDropdown,
  onChangeColorName,
  onSelectColor,
  onAddColor,
  onRemoveColor,
  onAddImage,
  onRemoveImage,
  onImageUploaded,
  onAddSize,
  onRemoveSize,
  onChangeSize,
  onReset,
  onCopyToClipboard
}: Props) {
  return (
    <div className={styles.formCard}>
      <div className={styles.formHeader}>
        <h2 className={styles.formTitle}>
          {editingProductId ? "✏️ Editar Producto" : "➕ Agregar Producto"}
        </h2>
        <div className={styles.formGuide}>
          <span className={styles.guideItem}>* Campos obligatorios</span>
          <span className={styles.guideItem}>📸 Mínimo 1 imagen por color</span>
          <span className={styles.guideItem}>💰 Precios en COP</span>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className={styles.validationErrors}>
          <div className={styles.errorHeader}>
            <span className={styles.errorIcon}>⚠️</span>
            <h4>Errores de Validación:</h4>
          </div>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index} className={styles.errorItem}>
                <span className={styles.errorDot}>•</span>
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📋</span>
              Información General
            </h3>
            <div className={styles.sectionHelp}>
              Información básica del producto que aparecerá públicamente
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Nombre del Producto <span className={styles.required}>*</span>
              </label>
              <input
                className={styles.input}
                type="text"
                value={formState.name}
                onChange={(e) => onChangeField("name", e.target.value)}
                required
                disabled={isLoading}
                placeholder="Ej: Camiseta Premium Algodón"
              />
              <div className={styles.fieldHelp}>Nombre claro y descriptivo</div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Género <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.select}
                value={formState.gender}
                onChange={(e) => onChangeField("gender", e.target.value)}
                required
                disabled={isLoading}
              >
                <option value="">Seleccionar género...</option>
                <option value="NIÑOS">👦 NIÑOS</option>
                <option value="NIÑAS">👧 NIÑAS</option>
                <option value="UNISEX">👥 UNISEX</option>
              </select>
              <div className={styles.fieldHelp}>Audiencia objetivo del producto</div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Descripción <span className={styles.required}>*</span>
            </label>
            <textarea
              className={styles.textarea}
              value={formState.description}
              onChange={(e) => onChangeField("description", e.target.value)}
              required
              disabled={isLoading}
              rows={3}
              placeholder="Describe el producto detalladamente: materiales, características, beneficios..."
            />
            <div className={styles.fieldHelp}>Obligatorio</div>
          </div>

          <div className={styles.typeInfo}>
            <div className={styles.typeBadge}>
              <span className={styles.typeIcon}>🏷️</span>
              TIPO: SUPERIOR
            </div>
            <div className={styles.typeNote}>Tipo de producto configurado automáticamente</div>
          </div>
        </div>

        <div className={styles.sectionDivider}>
          <span className={styles.dividerText}>VARIANTES</span>
        </div>

        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleRow}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🎨</span>
                Colores y Variantes
              </h3>
              <span className={styles.variantCount}>
                {formState.colorVariants.length} color
                {formState.colorVariants.length !== 1 ? "es" : ""}
              </span>
            </div>
            <div className={styles.sectionHelp}>
              Agrega todos los colores disponibles con sus respectivas tallas
            </div>
          </div>

          <div className={styles.colorVariants}>
            {formState.colorVariants.map((colorVariant, colorIndex) => (
              <div key={colorVariant.uiId} className={styles.colorVariant}>
                <div className={styles.colorHeader}>
                  <button
                    type="button"
                    className={styles.collapseButton}
                    onClick={() => onToggleColorCollapse(colorVariant.uiId)}
                    title={
                      collapsedColorIds.includes(colorVariant.uiId)
                        ? "Expandir"
                        : "Colapsar"
                    }
                    aria-label={
                      collapsedColorIds.includes(colorVariant.uiId)
                        ? "Expandir sección"
                        : "Colapsar sección"
                    }
                  >
                    {collapsedColorIds.includes(colorVariant.uiId) ? "▶" : "▼"}
                  </button>

                  <div className={styles.colorMain}>
                    <div className={styles.colorInputGroup}>
                      <div className={styles.colorInputWrapper}>
                        <input
                          className={styles.colorInput}
                          type="text"
                          value={colorVariant.color}
                          onChange={(e) =>
                            onChangeColorName(colorVariant.uiId, e.target.value)
                          }
                          required
                          disabled={isLoading}
                          placeholder="Seleccionar o escribir color..."
                          aria-label="Nombre del color"
                        />

                        <button
                          type="button"
                          className={styles.colorDropdownButton}
                          onClick={() => onToggleColorDropdown(colorVariant.uiId)}
                          disabled={isLoading}
                          aria-label="Mostrar colores disponibles"
                        >
                          ▼
                        </button>
                      </div>

                      {openColorDropdownId === colorVariant.uiId && (
                        <div className={styles.colorDropdown}>
                          <div className={styles.colorDropdownHeader}>
                            <span className={styles.dropdownTitle}>🎨 Colores disponibles</span>
                            <button
                              type="button"
                              className={styles.closeDropdownButton}
                              onClick={() => onToggleColorDropdown(colorVariant.uiId)}
                              aria-label="Cerrar lista de colores"
                            >
                              ✕
                            </button>
                          </div>

                          <div className={styles.colorOptions}>
                            {PREDEFINED_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={`${styles.colorOption} ${
                                  colorVariant.color === color ? styles.selected : ""
                                }`}
                                onClick={() => onSelectColor(colorVariant.uiId, color)}
                                aria-label={`Seleccionar color ${color}`}
                              >
                                <span
                                  className={styles.colorDot}
                                  style={{ backgroundColor: getColorHex(color) }}
                                />
                                {color}
                              </button>
                            ))}
                          </div>

                          <div className={styles.customColorNote}>
                            <small>O escribe un color personalizado arriba</small>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={styles.colorStats}>
                      <span className={styles.colorStat}>
                        <span className={styles.statIcon}>📏</span>
                        {colorVariant.sizes.length} talla
                        {colorVariant.sizes.length !== 1 ? "s" : ""}
                      </span>
                      <span className={styles.colorStat}>
                        <span className={styles.statIcon}>🖼️</span>
                        {colorVariant.images.filter((img) => img.imageUrl).length} img
                      </span>
                    </div>
                  </div>

                  <div className={styles.colorActions}>
                    {formState.colorVariants.length > 1 && (
                      <button
                        type="button"
                        className={styles.removeColorButton}
                        onClick={() => onRemoveColor(colorVariant.uiId)}
                        disabled={isLoading}
                        title="Eliminar color"
                        aria-label="Eliminar color"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {!collapsedColorIds.includes(colorVariant.uiId) && (
                  <div className={styles.colorContent}>
                    <div className={styles.imagesSection}>
                      <div className={styles.imagesHeader}>
                        <label className={styles.subLabel}>
                          <span className={styles.labelIcon}>📸</span>
                          Imágenes para este color <span className={styles.required}>*</span>
                        </label>
                        <div className={styles.imagesHelp}>
                          Sube imágenes claras del producto en este color (Mínimo 1, máximo 5)
                        </div>
                      </div>

                      <div className={styles.imagesGrid}>
                        {colorVariant.images.map((img, imgIndex) => (
                          <div key={`${colorVariant.uiId}-${imgIndex}`} className={styles.imageCard}>
                            <div className={styles.imageUploader}>
                              <ImageUploader
                                onUploadSuccess={onImageUploaded}
                                variantIndex={colorIndex}
                                imageIndex={imgIndex}
                                disabled={isLoading}
                                initialImageUrl={img.imageUrl}
                                imageId={img.id}
                              />
                            </div>

                            {img.imageUrl && img.imageUrl.trim() !== "" && (
                              <div className={styles.imagePreview}>
                                <div className={styles.previewImage}>
                                  <Image
                                    src={img.thumbnailUrl || img.imageUrl}
                                    alt="Vista previa"
                                    width={60}
                                    height={60}
                                    className={styles.thumbnail}
                                  />
                                </div>

                                <div className={styles.imageActions}>
                                  <button
                                    type="button"
                                    className={styles.copyButton}
                                    onClick={() => onCopyToClipboard(img.imageUrl)}
                                    title="Copiar URL de la imagen"
                                    aria-label="Copiar URL de la imagen"
                                  >
                                    📋 Copiar
                                  </button>

                                  {colorVariant.images.length > 1 && (
                                    <button
                                      type="button"
                                      className={styles.removeImageButton}
                                      onClick={() => onRemoveImage(colorVariant.uiId, imgIndex)}
                                      title="Eliminar imagen"
                                      aria-label="Eliminar imagen"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {colorVariant.images.length < 5 && (
                        <button
                          type="button"
                          className={styles.addImageButton}
                          onClick={() => onAddImage(colorVariant.uiId)}
                          disabled={isLoading}
                        >
                          <span className={styles.buttonIcon}>+</span>
                          Agregar otra imagen
                        </button>
                      )}
                    </div>

                    <div className={styles.sizesSection}>
                      <div className={styles.sizesHeader}>
                        <label className={styles.subLabel}>
                          <span className={styles.labelIcon}>📏</span>
                          Tallas disponibles <span className={styles.required}>*</span>
                        </label>
                        <div className={styles.sizesHelp}>
                          Define tallas, stock y precios para este color específico
                        </div>
                      </div>

                      <div className={styles.sizesGrid}>
                        {colorVariant.sizes.map((size) => {
                          const priceWithDiscount = calculatePriceWithDiscount(
                            size.price,
                            size.discountPercentage
                          );
                          const discountAmount = calculateDiscountAmount(
                            size.price,
                            size.discountPercentage
                          );
                          const hasDiscount =
                            !!size.discountPercentage && size.discountPercentage > 0;

                          return (
                            <div key={size.uiId} className={styles.sizeCard}>
                              <div className={styles.sizeGroup}>
                                <label className={styles.sizeLabel}>Talla</label>
                                <input
                                  className={styles.sizeInput}
                                  type="text"
                                  value={size.size}
                                  onChange={(e) =>
                                    onChangeSize(
                                      colorVariant.uiId,
                                      size.uiId,
                                      "size",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Ej: S, M, L, XL"
                                  required
                                  disabled={isLoading}
                                  aria-label="Talla"
                                />
                              </div>

                              <div className={styles.sizeGroup}>
                                <label className={styles.sizeLabel}>
                                  <span className={styles.labelIcon}>📦</span>
                                  Stock
                                </label>
                                <input
                                  className={styles.stockInput}
                                  type="number"
                                  value={size.stock}
                                  onChange={(e) =>
                                    onChangeSize(
                                      colorVariant.uiId,
                                      size.uiId,
                                      "stock",
                                      e.target.value
                                    )
                                  }
                                  min="0"
                                  step="1"
                                  placeholder="0"
                                  required
                                  disabled={isLoading}
                                  aria-label="Cantidad en stock"
                                />
                              </div>

                              <div className={styles.sizeGroup}>
                                <label className={styles.sizeLabel}>
                                  <span className={styles.labelIcon}>💰</span>
                                  Precio (COP)
                                </label>
                                <input
                                  className={styles.priceInput}
                                  type="number"
                                  value={size.price}
                                  onChange={(e) =>
                                    onChangeSize(
                                      colorVariant.uiId,
                                      size.uiId,
                                      "price",
                                      e.target.value
                                    )
                                  }
                                  min="0"
                                  step="100"
                                  placeholder="0"
                                  required
                                  disabled={isLoading}
                                  aria-label="Precio en pesos colombianos"
                                />
                              </div>

                              <div className={styles.sizeGroup}>
                                <label className={styles.sizeLabel}>
                                  <span className={styles.labelIcon}>🎯</span>
                                  Descuento %
                                </label>

                                <div className={styles.discountContainer}>
                                  <input
                                    className={styles.discountInput}
                                    type="number"
                                    value={size.discountPercentage || 0}
                                    onChange={(e) =>
                                      onChangeSize(
                                        colorVariant.uiId,
                                        size.uiId,
                                        "discountPercentage",
                                        e.target.value
                                      )
                                    }
                                    min="0"
                                    max="100"
                                    step="1"
                                    placeholder="0"
                                    disabled={isLoading}
                                    aria-label="Porcentaje de descuento"
                                  />
                                  <span className={styles.discountSymbol}>%</span>
                                </div>

                                {hasDiscount && (
                                  <div className={styles.discountInfo}>
                                    <div className={styles.discountRow}>
                                      <span className={styles.discountLabel}>Precio final:</span>
                                      <span className={styles.discountValue}>
                                        {formatPrice(priceWithDiscount)}
                                      </span>
                                    </div>
                                    <div className={styles.discountRow}>
                                      <span className={styles.discountLabel}>Ahorras:</span>
                                      <span className={styles.discountSavings}>
                                        {formatPrice(discountAmount)} ({size.discountPercentage}%)
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {colorVariant.sizes.length > 1 && (
                                <button
                                  type="button"
                                  className={styles.removeSizeButton}
                                  onClick={() => onRemoveSize(colorVariant.uiId, size.uiId)}
                                  disabled={isLoading}
                                  title="Eliminar talla"
                                  aria-label="Eliminar talla"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        className={styles.addSizeButton}
                        onClick={() => onAddSize(colorVariant.uiId)}
                        disabled={isLoading}
                      >
                        <span className={styles.buttonIcon}>+</span>
                        Agregar otra talla
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.addColorContainer}>
            <button
              type="button"
              className={styles.addColorButton}
              onClick={onAddColor}
              disabled={isLoading}
            >
              <span className={styles.buttonIcon}>+</span>
              Agregar nuevo color
            </button>

            <div className={styles.addColorHelp}>
              Puedes agregar múltiples colores con diferentes combinaciones de tallas
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <div className={styles.formActionButtons}>
            <button
              className={`${styles.button} ${styles.primaryButton}`}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className={styles.loadingSpinner}></span>
                  Procesando...
                </>
              ) : editingProductId ? (
                <>
                  <span className={styles.buttonIcon}>💾</span>
                  Actualizar Producto
                </>
              ) : (
                <>
                  <span className={styles.buttonIcon}>✨</span>
                  Crear Producto
                </>
              )}
            </button>

            {editingProductId && (
              <button
                type="button"
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={onReset}
                disabled={isLoading}
              >
                <span className={styles.buttonIcon}>↩️</span>
                Cancelar Edición
              </button>
            )}

            <button
              type="button"
              className={`${styles.button} ${styles.tertiaryButton}`}
              onClick={onReset}
              disabled={
                isLoading ||
                (!formState.name &&
                  !formState.description &&
                  !formState.gender &&
                  !formState.colorVariants[0]?.color)
              }
            >
              <span className={styles.buttonIcon}>🗑️</span>
              Limpiar Formulario
            </button>
          </div>

          <div className={styles.formTips}>
            <div className={styles.tip}>
              <span className={styles.tipIcon}>💡</span>
              Verifica que todas las imágenes se hayan cargado correctamente antes de guardar
            </div>
            <div className={styles.tip}>
              <span className={styles.tipIcon}>📝</span>
              Los cambios se guardan al enviar el formulario
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}