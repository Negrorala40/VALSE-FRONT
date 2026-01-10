'use client';

import { MENU_PRODUCTS } from "../utils/Api";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "./ImageUploader";
import styles from "./Admin.module.css";

// Tipos de datos compatibles
interface Image {
  id?: number;
  fileName: string;
  imageUrl: string;
  thumbnailUrl: string;
  mediumUrl: string;
  largeUrl: string;
}

interface Size {
  size: string;
  stock: number;
  price: number;
}

interface ColorVariant {
  color: string;
  images: Image[];
  sizes: Size[];
}

interface Variant {
  id?: number;
  color: string;
  size: string;
  stock: number;
  price: number;
  images?: Image[];
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

// Tipo para datos de imagen subida desde ImageUploader
interface ImageData {
  fileName: string;
  imageUrl: string;
  thumbnailUrl: string;
  mediumUrl: string;
  largeUrl: string;
}

const Admin = () => {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // Estado para formulario compacto
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gender, setGender] = useState("");
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([
    {
      color: "",
      images: [{ 
        fileName: "", 
        imageUrl: "", 
        thumbnailUrl: "", 
        mediumUrl: "", 
        largeUrl: "" 
      }],
      sizes: [{ size: "", stock: 0, price: 0 }]
    }
  ]);

  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [collapsedColors, setCollapsedColors] = useState<number[]>([]);

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

  // Manejar color - compacto
  const handleColorChange = (colorIndex: number, value: string) => {
    const updatedColors = [...colorVariants];
    updatedColors[colorIndex].color = value;
    setColorVariants(updatedColors);
  };

  // Manejar imágenes del color
  const handleImageUploaded = (imageData: ImageData, colorIndex?: number, imageIndex?: number) => {
    if (colorIndex === undefined || imageIndex === undefined) {
      console.error("Índices no definidos");
      return;
    }

    const updatedColors = [...colorVariants];
    
    if (colorIndex < updatedColors.length && 
        imageIndex < updatedColors[colorIndex].images.length) {
      
      const image = updatedColors[colorIndex].images[imageIndex];
      
      // Actualizar con datos de Cloudinary
      image.fileName = imageData.fileName;
      image.imageUrl = imageData.imageUrl;
      image.thumbnailUrl = imageData.thumbnailUrl;
      image.mediumUrl = imageData.mediumUrl;
      image.largeUrl = imageData.largeUrl;
      
      setColorVariants(updatedColors);
      console.log("✅ Imagen actualizada para color:", updatedColors[colorIndex].color);
    } else {
      console.error("Índices fuera de rango");
    }
  };

  const handleAddImage = (colorIndex: number) => {
    const updatedColors = [...colorVariants];
    updatedColors[colorIndex].images.push({ 
      fileName: "", 
      imageUrl: "",
      thumbnailUrl: "",
      mediumUrl: "",
      largeUrl: ""
    });
    setColorVariants(updatedColors);
  };

  const handleRemoveImage = (colorIndex: number, imageIndex: number) => {
    const updatedColors = [...colorVariants];
    if (updatedColors[colorIndex].images.length > 1) {
      updatedColors[colorIndex].images.splice(imageIndex, 1);
      setColorVariants(updatedColors);
    }
  };

  // Manejar tallas de un color
  const handleSizeChange = (colorIndex: number, sizeIndex: number, field: keyof Size, value: string | number) => {
    const updatedColors = [...colorVariants];
    
    if (colorIndex < updatedColors.length && 
        sizeIndex < updatedColors[colorIndex].sizes.length) {
      
      const size = updatedColors[colorIndex].sizes[sizeIndex];
      
      if (field === 'size') size.size = value as string;
      else if (field === 'stock') size.stock = Number(value);
      else if (field === 'price') size.price = Number(value);
      
      setColorVariants(updatedColors);
    }
  };

  const handleAddSize = (colorIndex: number) => {
    const updatedColors = [...colorVariants];
    updatedColors[colorIndex].sizes.push({ 
      size: "", 
      stock: 0, 
      price: 0 
    });
    setColorVariants(updatedColors);
  };

  const handleRemoveSize = (colorIndex: number, sizeIndex: number) => {
    const updatedColors = [...colorVariants];
    if (updatedColors[colorIndex].sizes.length > 1) {
      updatedColors[colorIndex].sizes.splice(sizeIndex, 1);
      setColorVariants(updatedColors);
    }
  };

  // Manejar colores
  const handleAddColor = () => {
    setColorVariants([
      ...colorVariants,
      {
        color: "",
        images: [{ 
          fileName: "", 
          imageUrl: "", 
          thumbnailUrl: "", 
          mediumUrl: "", 
          largeUrl: "" 
        }],
        sizes: [{ size: "", stock: 0, price: 0 }]
      }
    ]);
  };

  const handleRemoveColor = (colorIndex: number) => {
    if (colorVariants.length > 1) {
      const updatedColors = colorVariants.filter((_, i) => i !== colorIndex);
      setColorVariants(updatedColors);
      // Ajustar collapsed colors
      setCollapsedColors(prev => prev
        .filter(index => index !== colorIndex)
        .map(index => index > colorIndex ? index - 1 : index)
      );
    }
  };

  // Toggle collapse de color
  const toggleColorCollapse = (colorIndex: number) => {
    setCollapsedColors(prev => 
      prev.includes(colorIndex) 
        ? prev.filter(i => i !== colorIndex)
        : [...prev, colorIndex]
    );
  };

  const validateForm = () => {
    if (!name.trim() || !description.trim() || !gender.trim()) {
      alert("Los campos generales del producto son obligatorios.");
      return false;
    }

    for (let i = 0; i < colorVariants.length; i++) {
      const colorVariant = colorVariants[i];
      
      if (!colorVariant.color.trim()) {
        alert(`El color ${i + 1} no tiene nombre.`);
        return false;
      }

      // Verificar imágenes del color
      if (colorVariant.images.some(img => !img.imageUrl.trim())) {
        alert(`El color "${colorVariant.color}" tiene imágenes sin subir.`);
        return false;
      }

      // Verificar tallas del color
      for (let j = 0; j < colorVariant.sizes.length; j++) {
        const size = colorVariant.sizes[j];
        if (!size.size.trim() || size.stock <= 0 || size.price <= 0) {
          alert(`El color "${colorVariant.color}" tiene tallas incompletas.`);
          return false;
        }
      }
    }

    return true;
  };

  const transformToProductData = (): Product => {
    // Transformar la estructura compacta a la estructura esperada por el backend
    const variants: Variant[] = [];
    
    colorVariants.forEach(colorVariant => {
      colorVariant.sizes.forEach(size => {
        variants.push({
          color: colorVariant.color.trim(),
          size: size.size.trim(),
          stock: Number(size.stock),
          price: Number(size.price),
          images: colorVariant.images.map(img => ({
            ...(img.id ? { id: img.id } : {}),
            fileName: img.fileName.trim() || `producto_${colorVariant.color}`,
            imageUrl: img.imageUrl.trim(),
            thumbnailUrl: img.thumbnailUrl,
            mediumUrl: img.mediumUrl,
            largeUrl: img.largeUrl
          }))
        });
      });
    });

    return {
      ...(editingProductId ? { id: editingProductId } : {}),
      name: name.trim(),
      description: description.trim(),
      gender: gender.trim(),
      type: "SUPERIOR",
      variants
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    const productData = transformToProductData();

    try {
      const token = localStorage.getItem("token");
      const url = editingProductId 
        ? `${MENU_PRODUCTS}/${editingProductId}`
        : MENU_PRODUCTS;
      
      const method = editingProductId ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      const result: ApiResponse = await response.json();
      
      if (response.ok) {
        console.log("✅ Producto guardado/actualizado:", result);
        alert(editingProductId ? "Producto actualizado" : "Producto creado");
        fetchProducts();
        resetForm();
      } else {
        console.error("❌ Error:", result);
        alert(`Error: ${result.message || "No se pudo guardar"}`);
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
      alert("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setGender("");
    setColorVariants([
      {
        color: "",
        images: [{ 
          fileName: "", 
          imageUrl: "", 
          thumbnailUrl: "", 
          mediumUrl: "", 
          largeUrl: "" 
        }],
        sizes: [{ size: "", stock: 0, price: 0 }]
      }
    ]);
    setEditingProductId(null);
    setCollapsedColors([]);
  };

  const handleEdit = (product: Product) => {
    setName(product.name);
    setDescription(product.description);
    setGender(product.gender);
    
    // Agrupar variantes por color
    const colorsMap = new Map<string, ColorVariant>();
    
    product.variants.forEach(variant => {
      if (!colorsMap.has(variant.color)) {
        colorsMap.set(variant.color, {
          color: variant.color,
          images: variant.images && variant.images.length > 0 
            ? variant.images.map(img => ({
                ...img,
                thumbnailUrl: img.thumbnailUrl || img.imageUrl,
                mediumUrl: img.mediumUrl || img.imageUrl,
                largeUrl: img.largeUrl || img.imageUrl
              }))
            : [{ 
                fileName: "", 
                imageUrl: "", 
                thumbnailUrl: "", 
                mediumUrl: "", 
                largeUrl: "" 
              }],
          sizes: []
        });
      }
      
      const colorData = colorsMap.get(variant.color)!;
      colorData.sizes.push({
        size: variant.size,
        stock: variant.stock,
        price: variant.price
      });
    });
    
    const groupedColors = Array.from(colorsMap.values());
    setColorVariants(groupedColors);
    setEditingProductId(product.id || null);
    
    // Colapsar todos los colores excepto el primero
    setCollapsedColors(groupedColors.map((_, i) => i > 0 ? i : -1).filter(i => i >= 0));
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    if (!window.confirm(`¿Eliminar "${product.name}"?`)) return;

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
        alert("Producto eliminado");
        fetchProducts();
      } else if (response.status === 409) {
        if (window.confirm("Producto en carritos. ¿Eliminar forzadamente?")) {
          await handleDeleteForce(id);
        }
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteForce = async (id: number) => {
    if (!window.confirm("⚠️ ¿Eliminar forzadamente?")) return;

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
        alert("Producto eliminado forzadamente");
        fetchProducts();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión");
    } finally {
      setIsDeleting(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => alert("URL copiada!"))
      .catch(err => console.error("Error:", err));
  };

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
      <h2 className={styles.title}>
        {editingProductId ? "✏️ Editar Producto" : "➕ Agregar Producto"}
      </h2>
      
      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Sección compacta de información general */}
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
              <option value="">Seleccionar</option>
              <option value="NIÑOS">NIÑOS</option>
              <option value="NIÑAS">NIÑAS</option>
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
            rows={3}
            placeholder="Describe el producto..."
          />
        </div>

        <div className={styles.typeInfo}>
          <span className={styles.typeBadge}>👕 SUPERIOR</span>
          <span className={styles.typeNote}>Todos los productos son SUPERIOR</span>
        </div>

        <hr className={styles.divider} />
        
        {/* Sección compacta de colores */}
        <div className={styles.colorsSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>🎨 Colores y Variantes</h3>
            <button
              type="button"
              className={styles.addButton}
              onClick={handleAddColor}
              disabled={isLoading}
            >
              ➕ Agregar Color
            </button>
          </div>
          
          {colorVariants.map((colorVariant, colorIndex) => (
            <div key={colorIndex} className={styles.colorBox}>
              <div className={styles.colorHeader}>
                <button
                  type="button"
                  className={styles.collapseButton}
                  onClick={() => toggleColorCollapse(colorIndex)}
                >
                  {collapsedColors.includes(colorIndex) ? "▶" : "▼"}
                </button>
                
                <div className={styles.colorNameSection}>
                  <input
                    className={styles.colorInput}
                    type="text"
                    value={colorVariant.color}
                    onChange={(e) => handleColorChange(colorIndex, e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="Nombre del color"
                  />
                  <span className={styles.colorCount}>
                    {colorVariant.sizes.length} talla{colorVariant.sizes.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {colorVariants.length > 1 && (
                  <button
                    type="button"
                    className={styles.removeSmallButton}
                    onClick={() => handleRemoveColor(colorIndex)}
                    disabled={isLoading}
                  >
                    ✕
                  </button>
                )}
              </div>
              
              {!collapsedColors.includes(colorIndex) && (
                <div className={styles.colorContent}>
                  {/* Imágenes del color */}
                  <div className={styles.imagesSection}>
                    <label className={styles.subLabel}>Imágenes de este color:</label>
                    <div className={styles.imagesGrid}>
                      {colorVariant.images.map((img, imgIndex) => (
                        <div key={imgIndex} className={styles.imageCard}>
                          <div className={styles.uploaderWrapper}>
                            <ImageUploader
                              onUploadSuccess={(imageData) => 
                                handleImageUploaded(imageData, colorIndex, imgIndex)
                              }
                              variantIndex={colorIndex}
                              imageIndex={imgIndex}
                              disabled={isLoading}
                            />
                          </div>
                          
                          {img.imageUrl && img.imageUrl.trim() !== "" && (
                            <div className={styles.imagePreviewCompact}>
                              <img 
                                src={img.thumbnailUrl || img.imageUrl} 
                                alt="Preview" 
                                className={styles.thumbnailCompact}
                                onError={(e) => {
                                  e.currentTarget.src = "https://via.placeholder.com/40?text=Error";
                                }}
                              />
                              <button
                                type="button"
                                className={styles.copySmallButton}
                                onClick={() => copyToClipboard(img.imageUrl)}
                              >
                                📋
                              </button>
                              {colorVariant.images.length > 1 && (
                                <button
                                  type="button"
                                  className={styles.removeTinyButton}
                                  onClick={() => handleRemoveImage(colorIndex, imgIndex)}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={styles.addImageButtonCompact}
                      onClick={() => handleAddImage(colorIndex)}
                      disabled={isLoading}
                    >
                      ➕ Agregar otra imagen
                    </button>
                  </div>
                  
                  {/* Tallas del color */}
                  <div className={styles.sizesSection}>
                    <label className={styles.subLabel}>Tallas y precios:</label>
                    <div className={styles.sizesGrid}>
                      {colorVariant.sizes.map((size, sizeIndex) => (
                        <div key={sizeIndex} className={styles.sizeCard}>
                          <input
                            className={styles.sizeInput}
                            type="text"
                            value={size.size}
                            onChange={(e) => handleSizeChange(colorIndex, sizeIndex, 'size', e.target.value)}
                            placeholder="Talla"
                            required
                            disabled={isLoading}
                          />
                          <input
                            className={styles.stockInput}
                            type="number"
                            value={size.stock}
                            onChange={(e) => handleSizeChange(colorIndex, sizeIndex, 'stock', e.target.value)}
                            min="0"
                            placeholder="Stock"
                            required
                            disabled={isLoading}
                          />
                          <input
                            className={styles.priceInput}
                            type="number"
                            value={size.price}
                            onChange={(e) => handleSizeChange(colorIndex, sizeIndex, 'price', e.target.value)}
                            min="0"
                            step="0.01"
                            placeholder="Precio"
                            required
                            disabled={isLoading}
                          />
                          {colorVariant.sizes.length > 1 && (
                            <button
                              type="button"
                              className={styles.removeTinyButton}
                              onClick={() => handleRemoveSize(colorIndex, sizeIndex)}
                              disabled={isLoading}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={styles.addSizeButton}
                      onClick={() => handleAddSize(colorIndex)}
                      disabled={isLoading}
                    >
                      ➕ Agregar otra talla
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

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
              '💾 Actualizar'
            ) : (
              '🚀 Guardar'
            )}
          </button>

          {editingProductId && (
            <button
              type="button"
              className={`${styles.button} ${styles.secondaryButton}`}
              onClick={resetForm}
              disabled={isLoading}
            >
              ↩️ Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Lista de productos compacta */}
      <div className={styles.productsHeader}>
        <h2 className={styles.title}>
          📦 Productos ({products.length})
          <button 
            onClick={fetchProducts} 
            className={styles.refreshButton}
            disabled={isLoading}
          >
            🔄
          </button>
        </h2>
      </div>
      
      {products.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📭</span>
          <p>No hay productos registrados.</p>
        </div>
      ) : (
        <div className={styles.productsTable}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Género</th>
                <th>Variantes</th>
                <th>Stock Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className={styles.productCell}>
                      <strong>{product.name}</strong>
                      <small>{product.description.substring(0, 50)}...</small>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles.genderBadge}`}>
                      {product.gender === 'NIÑAS' ? '👧' : 
                       product.gender === 'NIÑOS' ? '👦' : '👥'} {product.gender}
                    </span>
                  </td>
                  <td>
                    <div className={styles.variantsInfo}>
                      {Array.from(new Set(product.variants.map(v => v.color))).slice(0, 2).map(color => (
                        <span key={color} className={styles.colorTag}>{color}</span>
                      ))}
                      {Array.from(new Set(product.variants.map(v => v.color))).length > 2 && (
                        <span className={styles.moreTag}>+{Array.from(new Set(product.variants.map(v => v.color))).length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={styles.stockNumber}>
                      {product.variants.reduce((sum, v) => sum + v.stock, 0)}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button 
                        className={styles.editButtonSmall}
                        onClick={() => handleEdit(product)}
                        disabled={isLoading || isDeleting === product.id}
                      >
                        ✏️
                      </button>
                      
                      <button 
                        className={styles.deleteButtonSmall}
                        onClick={() => handleDelete(product.id!)}
                        disabled={isLoading || isDeleting === product.id}
                      >
                        {isDeleting === product.id ? (
                          <span className={styles.smallSpinner}></span>
                        ) : (
                          '🗑️'
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Admin;