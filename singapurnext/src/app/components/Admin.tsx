"use client";

import { MENU_PRODUCTS } from "../utils/Api";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "./ImageUploader";
import styles from "./Admin.module.css";

interface Image {
  id?: number;
  fileName: string;
  imageUrl: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  largeUrl?: string;
}

interface Variant {
  id?: number;
  color: string;
  size: string;
  stock: number;
  price: number;
  images: Image[];
}

interface Product {
  id?: number;
  name: string;
  description: string;
  gender: string;
  type: string;
  variants: Variant[];
}

interface ApiResponse {
  success: boolean;
  message: string;
  canDelete?: boolean;
  [key: string]: any;
}

const Admin = () => {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gender, setGender] = useState("");
  const [type, setType] = useState("");

  const [variants, setVariants] = useState<Variant[]>([
    {
      color: "",
      size: "",
      stock: 0,
      price: 0,
      images: [{ fileName: "", imageUrl: "" }],
    },
  ]);

  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole !== "ROLE_ADMIN") {
      router.push("/");
    } else {
      setRole(storedRole);
      fetchProducts();
    }
  }, [router]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(MENU_PRODUCTS, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        console.error("Error al obtener los productos:", response.statusText);
        alert("Error al cargar los productos");
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
      alert("Error de conexión al cargar productos");
    }
  };

  const handleVariantChange = (index: number, field: string, value: string | number) => {
    const updatedVariants = [...variants];
    const variant = updatedVariants[index];
    
    switch (field) {
      case 'color':
        variant.color = value as string;
        break;
      case 'size':
        variant.size = value as string;
        break;
      case 'stock':
        variant.stock = value as number;
        break;
      case 'price':
        variant.price = value as number;
        break;
    }
    
    setVariants(updatedVariants);
  };

  const handleImageUploaded = (imageData: any, variantIndex: number, imageIndex: number) => {
      if (variantIndex === undefined || imageIndex === undefined) return;

    const updatedVariants = [...variants];
    const image = updatedVariants[variantIndex].images[imageIndex];
    
    // Actualizar con los datos de Cloudinary
    image.fileName = imageData.fileName;
  image.imageUrl = imageData.imageUrl;
  image.thumbnailUrl = imageData.thumbnailUrl;
  image.mediumUrl = imageData.mediumUrl;
  image.largeUrl = imageData.largeUrl;
    
    setVariants(updatedVariants);
    
    // Mostrar mensaje de éxito
  console.log("✅ Imagen subida a Cloudinary:", imageData);
  };

  const handleImageChange = (variantIndex: number, imageIndex: number, field: string, value: string) => {
    const updatedVariants = [...variants];
    const image = updatedVariants[variantIndex].images[imageIndex];
    
    switch (field) {
      case 'fileName':
        image.fileName = value;
        break;
      case 'imageUrl':
        image.imageUrl = value;
        break;
    }
    
    setVariants(updatedVariants);
  };

  const handleAddImage = (variantIndex: number) => {
    const updatedVariants = [...variants];
    updatedVariants[variantIndex].images.push({ 
      fileName: "", 
      imageUrl: "",
      thumbnailUrl: "",
      mediumUrl: "",
      largeUrl: ""
    });
    setVariants(updatedVariants);
  };

  const handleRemoveImage = (variantIndex: number, imageIndex: number) => {
    const updatedVariants = [...variants];
    if (updatedVariants[variantIndex].images.length > 1) {
      updatedVariants[variantIndex].images.splice(imageIndex, 1);
      setVariants(updatedVariants);
    }
  };

  const handleAddVariant = () => {
    setVariants([
      ...variants,
      {
        color: "",
        size: "",
        stock: 0,
        price: 0,
        images: [{ 
          fileName: "", 
          imageUrl: "",
          thumbnailUrl: "",
          mediumUrl: "",
          largeUrl: ""
        }],
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length > 1) {
      const updatedVariants = variants.filter((_, i) => i !== index);
      setVariants(updatedVariants);
    }
  };

  const validateForm = () => {
    if (!name.trim() || !description.trim() || !gender.trim() || !type.trim()) {
      alert("Los campos generales del producto son obligatorios.");
      return false;
    }

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      if (
        !variant.color.trim() ||
        !variant.size.trim() ||
        variant.stock <= 0 ||
        variant.price <= 0
      ) {
        alert(`La variante ${i + 1} tiene campos incompletos o valores inválidos.`);
        return false;
      }

      // Verificar que todas las imágenes tengan URL (puede ser de Cloudinary o manual)
      if (variant.images.some((img) => !img.imageUrl.trim())) {
        alert(`La variante ${i + 1} tiene imágenes sin subir. Por favor, sube las imágenes.`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    // Preparar los datos para enviar al backend Spring
    const productData: Product = {
      name: name.trim(),
      description: description.trim(),
      gender: gender.trim(),
      type: type.trim(),
      variants: variants.map(variant => ({
        ...(editingProductId && variant.id ? { id: variant.id } : {}),
        color: variant.color.trim(),
        size: variant.size.trim(),
        stock: Number(variant.stock),
        price: Number(variant.price),
        images: variant.images.map(img => ({
          ...(editingProductId && img.id ? { id: img.id } : {}),
          fileName: img.fileName.trim() || "producto_imagen",
          imageUrl: img.imageUrl.trim(),
          // Opcional: enviar también las URLs optimizadas si tu backend las soporta
          ...(img.thumbnailUrl && { thumbnailUrl: img.thumbnailUrl }),
          ...(img.mediumUrl && { mediumUrl: img.mediumUrl }),
          ...(img.largeUrl && { largeUrl: img.largeUrl })
        }))
      }))
    };

    // Solo incluir el ID del producto si estamos editando
    if (editingProductId) {
      productData.id = editingProductId;
    }

    try {
      const token = localStorage.getItem("token");

      const response = editingProductId
        ? await fetch(`${MENU_PRODUCTS}/${editingProductId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(productData),
          })
        : await fetch(MENU_PRODUCTS, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(productData),
          });

      const result: ApiResponse = await response.json();
      
      if (response.ok) {
        console.log("✅ Producto guardado/actualizado:", result);
        alert(result.message || (editingProductId ? "Producto actualizado exitosamente" : "Producto creado exitosamente"));
        fetchProducts();
        resetForm();
      } else {
        console.error("❌ Error al guardar el producto:", result);
        alert(`Error: ${result.message || "No se pudo guardar el producto"}`);
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
      alert("Error de conexión. Por favor, inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setGender("");
    setType("");
    setVariants([
      {
        color: "",
        size: "",
        stock: 0,
        price: 0,
        images: [{ 
          fileName: "", 
          imageUrl: "",
          thumbnailUrl: "",
          mediumUrl: "",
          largeUrl: ""
        }],
      },
    ]);
    setEditingProductId(null);
  };

  const handleEdit = (product: Product) => {
    setName(product.name);
    setDescription(product.description);
    setGender(product.gender);
    setType(product.type);
    
    // Asegurar que todas las imágenes tengan los campos de Cloudinary
    const updatedVariants = product.variants.map(variant => ({
      ...variant,
      images: variant.images.map(img => ({
        ...img,
        thumbnailUrl: img.thumbnailUrl || img.imageUrl,
        mediumUrl: img.mediumUrl || img.imageUrl,
        largeUrl: img.largeUrl || img.imageUrl
      }))
    }));
    
    setVariants(updatedVariants);
    setEditingProductId(product.id || null);
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const confirmDelete = window.confirm(
      `¿Estás seguro de que quieres eliminar el producto "${product.name}"?\n\n` +
      `Esta acción eliminará automáticamente cualquier referencia en carritos de compra.`
    );

    if (!confirmDelete) return;

    setIsDeleting(id);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${MENU_PRODUCTS}/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      const result: ApiResponse = await response.json();
      
      if (response.ok) {
        console.log("✅ Producto eliminado:", result);
        alert(result.message || "Producto eliminado exitosamente");
        fetchProducts();
      } else {
        console.error("❌ Error al eliminar el producto:", result);
        
        if (response.status === 409) {
          // CONFLICT - Producto en uso, ofrecer eliminación forzada
          const forceDelete = window.confirm(
            `${result.message || "El producto está en carritos de compra."}\n\n` +
            `¿Deseas eliminar forzadamente el producto?\n` +
            `(Esto eliminará las referencias de los carritos)`
          );
          
          if (forceDelete) {
            await handleDeleteForce(id);
          }
        } else {
          alert(`Error: ${result.message || "No se pudo eliminar el producto"}`);
        }
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
      alert("Error de conexión. Por favor, inténtalo de nuevo.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteForce = async (id: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const confirmForceDelete = window.confirm(
      `⚠️ ADVERTENCIA: Eliminación Forzada\n\n` +
      `¿Estás seguro de que quieres ELIMINAR FORZADAMENTE el producto "${product.name}"?\n\n` +
      `Esta acción eliminará el producto y todas sus referencias en carritos de compra.\n` +
      `Los usuarios perderán estos productos de sus carritos.\n\n` +
      `¿Continuar?`
    );

    if (!confirmForceDelete) return;

    setIsDeleting(id);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${MENU_PRODUCTS}/${id}/force`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      const result: ApiResponse = await response.json();
      
      if (response.ok) {
        console.log("✅ Producto eliminado forzadamente:", result);
        alert(result.message || "Producto eliminado forzadamente exitosamente");
        fetchProducts();
      } else {
        console.error("❌ Error al eliminar forzadamente:", result);
        alert(`Error: ${result.message || "No se pudo eliminar el producto forzadamente"}`);
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
      alert("Error de conexión. Por favor, inténtalo de nuevo.");
    } finally {
      setIsDeleting(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => alert("URL copiada al portapapeles!"))
      .catch(err => console.error("Error al copiar:", err));
  };

  if (role !== "ROLE_ADMIN") {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Acceso Denegado</h2>
        <p>No tienes permisos para acceder a esta página.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        {editingProductId ? "✏️ Editar Producto" : "➕ Agregar Producto"}
      </h2>
      
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Nombre:</label>
            <input
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Ej: Camiseta Premium"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Género:</label>
            <select
              className={styles.select}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
              disabled={isLoading}
            >
              <option value="">Seleccionar Género</option>
              <option value="MUJER">MUJER</option>
              <option value="HOMBRE">HOMBRE</option>
              <option value="UNISEX">UNISEX</option>
            </select>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Descripción:</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            disabled={isLoading}
            rows={4}
            placeholder="Describe el producto detalladamente..."
          />
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Tipo:</label>
            <select
              className={styles.select}
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
              disabled={isLoading}
            >
              <option value="">Seleccionar Tipo</option>
              <option value="SUPERIOR">SUPERIOR</option>
              <option value="INFERIOR">INFERIOR</option>
              <option value="CALZADO">CALZADO</option>
            </select>
          </div>
        </div>

        <hr className={styles.divider} />
        
        <h3 className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>🎨</span>
          Variantes del Producto
        </h3>
        
        {variants.map((variant, index) => (
          <div key={index} className={styles.variantBox}>
            <div className={styles.variantHeader}>
              <h4>
                <span className={styles.variantNumber}>Variante {index + 1}</span>
              </h4>
              {variants.length > 1 && (
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => handleRemoveVariant(index)}
                  disabled={isLoading}
                >
                  🗑️ Eliminar Variante
                </button>
              )}
            </div>

            <div className={styles.variantFields}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Color:</label>
                <input
                  className={styles.input}
                  type="text"
                  value={variant.color}
                  onChange={(e) => handleVariantChange(index, "color", e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="Ej: Negro, Azul, Rojo"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Talla:</label>
                <input
                  className={styles.input}
                  type="text"
                  value={variant.size}
                  onChange={(e) => handleVariantChange(index, "size", e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="Ej: S, M, L, XL"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Stock:</label>
                <input
                  className={`${styles.input} ${styles.stockInput}`}
                  type="number"
                  min="0"
                  value={variant.stock}
                  onChange={(e) => handleVariantChange(index, "stock", Number(e.target.value))}
                  required
                  disabled={isLoading}
                  placeholder="0"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Precio ($):</label>
                <input
                  className={`${styles.input} ${styles.priceInput}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={variant.price}
                  onChange={(e) => handleVariantChange(index, "price", parseFloat(e.target.value))}
                  required
                  disabled={isLoading}
                  placeholder="0.00"
                />
              </div>
            </div>

            <label className={styles.label}>
              <span className={styles.imageIcon}>🖼️</span>
              Imágenes de esta variante:
            </label>
            
            {variant.images.map((img, imgIndex) => (
              <div key={imgIndex} className={styles.imageSection}>
                <div className={styles.uploaderContainer}>
                  <ImageUploader
  onUploadSuccess={(imageData, varIndex, imgIndex) => {
    // Asegurar que los índices no sean undefined
    if (varIndex !== undefined && imgIndex !== undefined) {
      handleImageUploaded(imageData, varIndex, imgIndex);
    }
  }}
  variantIndex={index}
  imageIndex={imgIndex}
/>
                </div>
                
                {/* Mostrar datos de la imagen subida */}
                {img.imageUrl && (
                  <div className={styles.imagePreview}>
                    <div className={styles.imagePreviewHeader}>
                      <span className={styles.previewTitle}>Imagen Subida</span>
                      {variant.images.length > 1 && (
                        <button
                          type="button"
                          className={styles.removeSmallButton}
                          onClick={() => handleRemoveImage(index, imgIndex)}
                          disabled={isLoading}
                        >
                          ✕ Eliminar
                        </button>
                      )}
                    </div>
                    
                    <div className={styles.previewContent}>
                      <div className={styles.imageThumbnail}>
                        <img 
                          src={img.thumbnailUrl || img.imageUrl} 
                          alt="Preview" 
                          className={styles.thumbnailImage}
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/150?text=Error+Imagen";
                          }}
                        />
                      </div>
                      
                      <div className={styles.imageInfo}>
                        <div className={styles.infoField}>
                          <label>Nombre del archivo:</label>
                          <input
                            type="text"
                            value={img.fileName}
                            onChange={(e) =>
                              handleImageChange(index, imgIndex, "fileName", e.target.value)
                            }
                            placeholder="Ej: camiseta-negra-frontal"
                            disabled={isLoading}
                            className={styles.input}
                          />
                        </div>
                        
                        <div className={styles.infoField}>
                          <label>URL Principal (Cloudinary):</label>
                          <div className={styles.urlContainer}>
                            <input
                              type="text"
                              value={img.imageUrl}
                              readOnly
                              className={styles.urlInput}
                              placeholder="URL generada automáticamente"
                            />
                            <button
                              type="button"
                              onClick={() => copyToClipboard(img.imageUrl)}
                              className={styles.copyButton}
                              disabled={isLoading}
                            >
                              📋 Copiar
                            </button>
                          </div>
                        </div>
                        
                        {/* Mostrar diferentes tamaños disponibles */}
                        {img.thumbnailUrl && (
                          <div className={styles.sizesInfo}>
                            <span className={styles.sizesLabel}>Tamaños disponibles:</span>
                            <div className={styles.sizeBadges}>
                              <span className={styles.sizeBadge} title="Miniatura (150x150)">
                                <img src={img.thumbnailUrl} alt="Thumb" />
                                <span>Miniatura</span>
                              </span>
                              <span className={styles.sizeBadge} title="Mediano (600x600)">
                                <img src={img.mediumUrl || img.imageUrl} alt="Medium" />
                                <span>Mediano</span>
                              </span>
                              <span className={styles.sizeBadge} title="Grande (1200x1200)">
                                <img src={img.largeUrl || img.imageUrl} alt="Large" />
                                <span>Grande</span>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className={styles.cloudinaryBadge}>
                      <span>☁️ Alojada en Cloudinary</span>
                      <span>⚡ Optimizada automáticamente</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            <button
              type="button"
              className={styles.addImageButton}
              onClick={() => handleAddImage(index)}
              disabled={isLoading}
            >
              ➕ Agregar otra imagen a esta variante
            </button>
            
            <hr className={styles.divider} />
          </div>
        ))}
        
        <button
          type="button"
          className={styles.addVariantButton}
          onClick={handleAddVariant}
          disabled={isLoading}
        >
          ➕ Agregar otra variante (color/talla diferente)
        </button>

        <div className={styles.formActions}>
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
              '💾 Actualizar Producto'
            ) : (
              '🚀 Guardar Producto'
            )}
          </button>

          {editingProductId && (
            <button
              type="button"
              className={`${styles.button} ${styles.secondaryButton}`}
              onClick={resetForm}
              disabled={isLoading}
            >
              ↩️ Cancelar Edición
            </button>
          )}
        </div>
      </form>

      <h2 className={styles.title}>
        📦 Lista de Productos ({products.length})
        <button 
          onClick={fetchProducts} 
          className={styles.refreshButton}
          disabled={isLoading}
        >
          🔄 Actualizar
        </button>
      </h2>
      
      {products.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📭</span>
          <p className={styles.emptyMessage}>No hay productos registrados.</p>
          <p className={styles.emptySubtext}>Comienza agregando tu primer producto usando el formulario arriba.</p>
        </div>
      ) : (
        <div className={styles.productGrid}>
          {products.map((product) => (
            <div key={product.id} className={styles.productCard}>
              <div className={styles.productHeader}>
                <h3 className={styles.productName}>{product.name}</h3>
                <div className={styles.productBadges}>
                  <span className={`${styles.badge} ${styles.genderBadge}`}>
                    {product.gender === 'MUJER' ? '👩' : 
                     product.gender === 'HOMBRE' ? '👨' : '👥'} {product.gender}
                  </span>
                  <span className={`${styles.badge} ${styles.typeBadge}`}>
                    {product.type === 'SUPERIOR' ? '👕' : 
                     product.type === 'INFERIOR' ? '👖' : '👟'} {product.type}
                  </span>
                </div>
              </div>
              
              <p className={styles.productDescription}>{product.description}</p>
              
              {/* Mostrar imagen principal del producto si existe */}
              {product.variants[0]?.images[0]?.imageUrl && (
                <div className={styles.productImageContainer}>
                  <img 
                    src={product.variants[0].images[0].thumbnailUrl || product.variants[0].images[0].imageUrl} 
                    alt={product.name}
                    className={styles.productImage}
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/300x200?text=Sin+Imagen";
                    }}
                  />
                  <span className={styles.cloudinaryIndicator}>☁️ Cloudinary</span>
                </div>
              )}
              
              <div className={styles.productInfo}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Variantes:</span>
                  <span className={styles.infoValue}>{product.variants.length}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Stock Total:</span>
                  <span className={styles.infoValue}>
                    {product.variants.reduce((sum, v) => sum + v.stock, 0)}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Imágenes:</span>
                  <span className={styles.infoValue}>
                    {product.variants.reduce((sum, v) => sum + v.images.length, 0)}
                  </span>
                </div>
              </div>
              
              {product.variants.length > 0 && (
                <div className={styles.variantsPreview}>
                  <strong className={styles.variantsTitle}>Variantes disponibles:</strong>
                  <ul className={styles.variantsList}>
                    {product.variants.slice(0, 3).map((variant, idx) => (
                      <li key={idx} className={styles.variantItem}>
                        <span className={styles.variantColor} style={{backgroundColor: variant.color.toLowerCase()}}></span>
                        {variant.color} - {variant.size} 
                        <span className={styles.variantStock}>(Stock: {variant.stock})</span>
                      </li>
                    ))}
                    {product.variants.length > 3 && (
                      <li className={styles.moreVariants}>
                        ... y {product.variants.length - 3} más
                      </li>
                    )}
                  </ul>
                </div>
              )}
              
              <div className={styles.productActions}>
                <button 
                  className={styles.editButton}
                  onClick={() => handleEdit(product)}
                  disabled={isLoading || isDeleting === product.id}
                >
                  ✏️ Editar
                </button>
                
                <button 
                  className={styles.deleteButton}
                  onClick={() => handleDelete(product.id!)}
                  disabled={isLoading || isDeleting === product.id}
                >
                  {isDeleting === product.id ? (
                    <>
                      <span className={styles.smallSpinner}></span>
                      Eliminando...
                    </>
                  ) : (
                    '🗑️ Eliminar'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Admin;