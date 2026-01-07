"use client";

import { MENU_PRODUCTS } from "../utils/Api";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./Admin.module.css";

interface Image {
  id?: number;
  fileName: string;
  imageUrl: string;
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
    updatedVariants[variantIndex].images.push({ fileName: "", imageUrl: "" });
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
        images: [{ fileName: "", imageUrl: "" }],
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

      if (variant.images.some((img) => !img.imageUrl.trim())) {
        alert(`La variante ${i + 1} tiene imágenes con URLs vacías.`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    // Preparar los datos
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
          fileName: img.fileName.trim(),
          imageUrl: img.imageUrl.trim(),
        }))
      }))
    };

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
        console.log("Producto guardado/actualizado:", result);
        alert(result.message || (editingProductId ? "Producto actualizado exitosamente" : "Producto creado exitosamente"));
        fetchProducts();
        resetForm();
      } else {
        console.error("Error al guardar el producto:", result);
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
        images: [{ fileName: "", imageUrl: "" }],
      },
    ]);
    setEditingProductId(null);
  };

  const handleEdit = (product: Product) => {
    setName(product.name);
    setDescription(product.description);
    setGender(product.gender);
    setType(product.type);
    setVariants(product.variants);
    setEditingProductId(product.id || null);
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const checkIfCanDelete = async (id: number): Promise<boolean> => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${MENU_PRODUCTS}/${id}/can-delete`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const result: ApiResponse = await response.json();
        return result.canDelete === true;
      }
      return false;
    } catch (error) {
      console.error("Error al verificar eliminación:", error);
      return false;
    }
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
        console.log("Producto eliminado:", result);
        alert(result.message || "Producto eliminado exitosamente");
        fetchProducts();
      } else {
        console.error("Error al eliminar el producto:", result);
        
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
        console.log("Producto eliminado forzadamente:", result);
        alert(result.message || "Producto eliminado forzadamente exitosamente");
        fetchProducts();
      } else {
        console.error("Error al eliminar forzadamente:", result);
        alert(`Error: ${result.message || "No se pudo eliminar el producto forzadamente"}`);
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
      alert("Error de conexión. Por favor, inténtalo de nuevo.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleQuickDelete = async (id: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const canDelete = await checkIfCanDelete(id);
    
    if (canDelete) {
      // Eliminación normal si no está en carritos
      handleDelete(id);
    } else {
      // Si está en carritos, preguntar qué hacer
      const userChoice = window.confirm(
        `El producto "${product.name}" está en carritos de compra.\n\n` +
        `¿Deseas eliminar forzadamente (elimina de carritos) o cancelar?\n\n` +
        `OK = Eliminar forzadamente\nCancelar = Cancelar`
      );
      
      if (userChoice) {
        handleDeleteForce(id);
      }
    }
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
        {editingProductId ? "Editar Producto" : "Agregar Producto"}
      </h2>
      
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label}>Nombre:</label>
        <input
          className={styles.input}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isLoading}
        />

        <label className={styles.label}>Descripción:</label>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          disabled={isLoading}
          rows={4}
        />

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

        <hr className={styles.divider} />
        
        <h3 className={styles.sectionTitle}>Variantes</h3>
        
        {variants.map((variant, index) => (
          <div key={index} className={styles.variantBox}>
            <div className={styles.variantHeader}>
              <h4>Variante {index + 1}</h4>
              {variants.length > 1 && (
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => handleRemoveVariant(index)}
                  disabled={isLoading}
                >
                  Eliminar Variante
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
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Stock:</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  value={variant.stock}
                  onChange={(e) => handleVariantChange(index, "stock", Number(e.target.value))}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Precio:</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  step="0.01"
                  value={variant.price}
                  onChange={(e) => handleVariantChange(index, "price", parseFloat(e.target.value))}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <label className={styles.label}>Imágenes:</label>
            {variant.images.map((img, imgIndex) => (
              <div key={imgIndex} className={styles.imageBox}>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Nombre del archivo"
                  value={img.fileName}
                  onChange={(e) =>
                    handleImageChange(index, imgIndex, "fileName", e.target.value)
                  }
                  disabled={isLoading}
                />
                <input
                  className={styles.input}
                  type="url"
                  placeholder="URL de la imagen"
                  value={img.imageUrl}
                  onChange={(e) =>
                    handleImageChange(index, imgIndex, "imageUrl", e.target.value)
                  }
                  required
                  disabled={isLoading}
                />
                {variant.images.length > 1 && (
                  <button
                    type="button"
                    className={styles.removeSmallButton}
                    onClick={() => handleRemoveImage(index, imgIndex)}
                    disabled={isLoading}
                  >
                    Eliminar Imagen
                  </button>
                )}
              </div>
            ))}
            
            <button
              type="button"
              className={styles.addButton}
              onClick={() => handleAddImage(index)}
              disabled={isLoading}
            >
              + Agregar otra imagen
            </button>
            
            <hr className={styles.divider} />
          </div>
        ))}
        
        <button
          type="button"
          className={styles.addButton}
          onClick={handleAddVariant}
          disabled={isLoading}
        >
          + Agregar otra variante
        </button>

        <div className={styles.formActions}>
          <button 
            className={`${styles.button} ${styles.primaryButton}`} 
            type="submit"
            disabled={isLoading}
          >
            {isLoading 
              ? "Guardando..." 
              : editingProductId 
                ? "Actualizar Producto" 
                : "Guardar Producto"
            }
          </button>

          {editingProductId && (
            <button
              type="button"
              className={`${styles.button} ${styles.secondaryButton}`}
              onClick={resetForm}
              disabled={isLoading}
            >
              Cancelar Edición
            </button>
          )}
        </div>
      </form>

      <h2 className={styles.title}>Lista de Productos ({products.length})</h2>
      
      {products.length === 0 ? (
        <p className={styles.emptyMessage}>No hay productos registrados.</p>
      ) : (
        <div className={styles.productGrid}>
          {products.map((product) => (
            <div key={product.id} className={styles.productCard}>
              <div className={styles.productHeader}>
                <h3 className={styles.productName}>{product.name}</h3>
                <div className={styles.productBadges}>
                  <span className={styles.badge}>{product.gender}</span>
                  <span className={styles.badge}>{product.type}</span>
                </div>
              </div>
              
              <p className={styles.productDescription}>{product.description}</p>
              
              <div className={styles.productInfo}>
                <p><strong>Variantes:</strong> {product.variants.length}</p>
                <p><strong>Total Stock:</strong> {product.variants.reduce((sum, v) => sum + v.stock, 0)}</p>
              </div>
              
              {product.variants.length > 0 && (
                <div className={styles.variantsPreview}>
                  <strong>Variantes disponibles:</strong>
                  <ul className={styles.variantsList}>
                    {product.variants.slice(0, 3).map((variant, idx) => (
                      <li key={idx}>
                        {variant.color} - {variant.size} (Stock: {variant.stock})
                      </li>
                    ))}
                    {product.variants.length > 3 && (
                      <li>... y {product.variants.length - 3} más</li>
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
                  Editar
                </button>
                
                <button 
                  className={styles.deleteButton}
                  onClick={() => handleDelete(product.id!)}
                  disabled={isLoading || isDeleting === product.id}
                >
                  {isDeleting === product.id ? "Eliminando..." : "Eliminar"}
                </button>
                
                <button 
                  className={styles.forceDeleteButton}
                  onClick={() => handleDeleteForce(product.id!)}
                  disabled={isLoading || isDeleting === product.id}
                  title="Eliminar forzadamente (incluye carritos)"
                >
                  {isDeleting === product.id ? "..." : "Forzar Eliminación"}
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