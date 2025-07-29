"use client";

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

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole !== "ADMIN") {
      router.push("/");
    } else {
      setRole(storedRole);
      fetchProducts();
    }
  }, [router]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://amarte--backendamarte--sjfs798q7b8v.code.run/api/products", {
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
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
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

    // Preparar los datos, asegurándose de que no se envíen IDs para nuevos elementos
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

    // Solo incluir el ID del producto si estamos editando
    if (editingProductId) {
      productData.id = editingProductId;
    }

    try {
      const token = localStorage.getItem("token");

      const response = editingProductId
        ? await fetch(`https://amarte--backendamarte--sjfs798q7b8v.code.run/api/products/${editingProductId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(productData),
          })
        : await fetch("https://amarte--backendamarte--sjfs798q7b8v.code.run/api/products", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(productData),
          });

      if (response.ok) {
        const data = await response.json();
        console.log("Producto guardado/actualizado:", data);
        alert(editingProductId ? "Producto actualizado exitosamente" : "Producto creado exitosamente");
        fetchProducts();
        resetForm();
      } else {
        const errorData = await response.text();
        console.error("Error al guardar el producto:", response.statusText, errorData);
        alert(`Error al guardar el producto: ${response.statusText}`);
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
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) {
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`https://amarte--backendamarte--sjfs798q7b8v.code.run/api/products/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        console.log("Producto eliminado exitosamente");
        alert("Producto eliminado exitosamente");
        fetchProducts();
      } else {
        console.error("Error al eliminar el producto:", response.statusText);
        alert("Error al eliminar el producto");
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
      alert("Error de conexión. Por favor, inténtalo de nuevo.");
    }
  };

  if (role !== "ADMIN") return null;

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
        />

        <label className={styles.label}>Descripción:</label>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <label className={styles.label}>Género:</label>
        <select
          className={styles.select}
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          required
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
        >
          <option value="">Seleccionar Tipo</option>
          <option value="SUPERIOR">SUPERIOR</option>
          <option value="INFERIOR">INFERIOR</option>
          <option value="CALZADO">CALZADO</option>
        </select>

        <hr />
        <h3>Variantes</h3>
        {variants.map((variant, index) => (
          <div key={index} className={styles.variantBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>Variante {index + 1}</h4>
              {variants.length > 1 && (
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => handleRemoveVariant(index)}
                >
                  Eliminar Variante
                </button>
              )}
            </div>

            <label className={styles.label}>Color:</label>
            <input
              className={styles.input}
              type="text"
              value={variant.color}
              onChange={(e) => handleVariantChange(index, "color", e.target.value)}
              required
            />

            <label className={styles.label}>Talla:</label>
            <input
              className={styles.input}
              type="text"
              value={variant.size}
              onChange={(e) => handleVariantChange(index, "size", e.target.value)}
              required
            />

            <label className={styles.label}>Stock:</label>
            <input
              className={styles.input}
              type="number"
              min="0"
              value={variant.stock}
              onChange={(e) => handleVariantChange(index, "stock", Number(e.target.value))}
              required
            />

            <label className={styles.label}>Precio:</label>
            <input
              className={styles.input}
              type="number"
              min="0"
              step="0.01"
              value={variant.price}
              onChange={(e) => handleVariantChange(index, "price", parseFloat(e.target.value))}
              required
            />

            <label className={styles.label}>Imágenes:</label>
            {variant.images.map((img, imgIndex) => (
              <div key={imgIndex} style={{ marginBottom: '10px', border: '1px solid #ddd', padding: '10px' }}>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Nombre del archivo"
                  value={img.fileName}
                  onChange={(e) =>
                    handleImageChange(index, imgIndex, "fileName", e.target.value)
                  }
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
                />
                {variant.images.length > 1 && (
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => handleRemoveImage(index, imgIndex)}
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
            >
              Agregar otra imagen
            </button>
            <hr />
          </div>
        ))}
        <button
          type="button"
          className={styles.addButton}
          onClick={handleAddVariant}
        >
          Agregar otra variante
        </button>

        <button 
          className={styles.button} 
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
            className={styles.cancelButton}
            onClick={resetForm}
          >
            Cancelar Edición
          </button>
        )}
      </form>

      <h2 className={styles.title}>Lista de Productos</h2>
      <div className={styles.productList}>
        {products.map((product) => (
          <div key={product.id} className={styles.productItem}>
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <p><strong>Género:</strong> {product.gender}</p>
            <p><strong>Tipo:</strong> {product.type}</p>
            <p><strong>Variantes:</strong> {product.variants.length}</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => handleEdit(product)}>Editar</button>
              <button onClick={() => handleDelete(product.id!)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;