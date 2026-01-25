'use client';

import { MENU_PRODUCTS } from "../utils/Api";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  hasOrders?: boolean;
  enabled?: boolean;
}

interface Product {
  id?: number;
  name: string;
  description: string;
  gender: string;
  type: string;
  variants: Variant[];
  hasOrders?: boolean;
  enabled?: boolean;
}

interface ApiResponse {
  success: boolean;
  message: string;
  canDelete?: boolean;
  data?: unknown;
  enabled?: boolean;
  productId?: number;
  variantId?: number;
}

interface ImageData {
  id?: number;
  fileName: string;
  imageUrl: string;
  thumbnailUrl: string;
  mediumUrl: string;
  largeUrl: string;
}

interface ValidationError {
  field: string;
  message: string;
}

// Servicio de logging
const logService = {
  info: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, error || '');
  },
  warn: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${message}`, data || '');
  }
};

const Admin = () => {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isToggling, setIsToggling] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

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
  
  // Referencias para evitar bucles
  const initialImageIdsRef = useRef<Set<string>>(new Set());
  const isInitializingRef = useRef(false);
  const prevColorVariantsRef = useRef<ColorVariant[]>([]);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole !== "ROLE_ADMIN") {
      router.push("/");
    } else {
      setRole(storedRole);
      fetchProducts();
      addLog("🔄 Admin Panel inicializado");
    }
  }, [router]);

  const addLog = useCallback((message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [logMessage, ...prev.slice(0, 49)]);
    logService.info(message, data);
  }, []);

  const fetchProducts = async () => {
    try {
      addLog("📡 Solicitando lista de productos...");
      const token = localStorage.getItem("token");
      const response = await fetch(MENU_PRODUCTS, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        addLog(`✅ Productos obtenidos: ${data.length} productos`);
        setProducts(data);
      } else {
        addLog(`❌ Error al obtener productos: ${response.statusText}`);
        alert("Error al cargar los productos");
      }
    } catch (error) {
      addLog("❌ Error de conexión al cargar productos", error);
      alert("Error de conexión al cargar productos");
    }
  };

  const handleColorChange = (colorIndex: number, value: string) => {
    const updatedColors = [...colorVariants];
    
    if (editingProductId) {
      const originalProduct = products.find(p => p.id === editingProductId);
      if (originalProduct) {
        const oldColor = updatedColors[colorIndex].color;
        const hasOrders = originalProduct.variants.some(v => 
          v.color === oldColor && v.hasOrders
        );
        
        if (hasOrders) {
          alert(`⚠️ El color "${oldColor}" tiene órdenes asociadas.\nNo se puede modificar. Crea una nueva variante en su lugar.`);
          return;
        }
      }
    }
    
    updatedColors[colorIndex].color = value;
    setColorVariants(updatedColors);
  };

  const handleImageUploaded = useCallback((imageData: ImageData, colorIndex?: number, imageIndex?: number) => {
    if (colorIndex === undefined || imageIndex === undefined) {
      addLog("❌ Índices no definidos en handleImageUploaded");
      return;
    }

    const imageKey = `color${colorIndex}-img${imageIndex}`;
    
    // Evitar notificar imágenes iniciales múltiples veces
    if (imageData.id && initialImageIdsRef.current.has(`${imageData.id}`)) {
      return;
    }
    
    // Marcar como imagen inicial si tiene ID
    if (imageData.id) {
      initialImageIdsRef.current.add(`${imageData.id}`);
    }

    setColorVariants(prevColors => {
      const updatedColors = [...prevColors];
      
      if (colorIndex < updatedColors.length && 
          imageIndex < updatedColors[colorIndex].images.length) {
        
        updatedColors[colorIndex].images[imageIndex] = {
          ...updatedColors[colorIndex].images[imageIndex],
          ...imageData
        };
        
        addLog(`✅ Imagen ${imageIndex + 1} actualizada para color: "${updatedColors[colorIndex].color}"`);
      }
      
      return updatedColors;
    });
  }, [addLog]);

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
    addLog(`➕ Imagen añadida al color ${colorIndex + 1}`);
  };

  const handleRemoveImage = (colorIndex: number, imageIndex: number) => {
    const updatedColors = [...colorVariants];
    if (updatedColors[colorIndex].images.length > 1) {
      const removedImage = updatedColors[colorIndex].images[imageIndex];
      if (removedImage.id) {
        initialImageIdsRef.current.delete(`${removedImage.id}`);
      }
      updatedColors[colorIndex].images.splice(imageIndex, 1);
      setColorVariants(updatedColors);
      addLog(`➖ Imagen ${imageIndex + 1} eliminada del color ${colorIndex + 1}`);
    }
  };

  const handleSizeChange = (colorIndex: number, sizeIndex: number, field: keyof Size, value: string | number) => {
    const updatedColors = [...colorVariants];
    
    if (colorIndex < updatedColors.length && 
        sizeIndex < updatedColors[colorIndex].sizes.length) {
      
      const size = updatedColors[colorIndex].sizes[sizeIndex];
      
      if (field === 'size') {
        if (editingProductId) {
          const originalProduct = products.find(p => p.id === editingProductId);
          if (originalProduct) {
            const oldSize = size.size;
            const hasOrders = originalProduct.variants.some(v => 
              v.color === updatedColors[colorIndex].color && 
              v.size === oldSize && 
              v.hasOrders
            );
            
            if (hasOrders) {
              alert(`⚠️ La talla "${oldSize}" tiene órdenes asociadas.\nNo se puede modificar. Crea una nueva variante en su lugar.`);
              return;
            }
          }
        }
        size.size = value as string;
      } else if (field === 'stock') {
        const stockValue = Number(value);
        if (stockValue >= 0) {
          size.stock = stockValue;
        } else {
          alert("El stock no puede ser negativo");
          return;
        }
      } else if (field === 'price') {
        const priceValue = Number(value);
        if (priceValue >= 0) {
          size.price = priceValue;
        } else {
          alert("El precio no puede ser negativo");
          return;
        }
      }
      
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
    addLog(`➕ Talla añadida al color ${colorIndex + 1}`);
  };

  const handleRemoveSize = (colorIndex: number, sizeIndex: number) => {
    const updatedColors = [...colorVariants];
    if (updatedColors[colorIndex].sizes.length > 1) {
      updatedColors[colorIndex].sizes.splice(sizeIndex, 1);
      setColorVariants(updatedColors);
      addLog(`➖ Talla ${sizeIndex + 1} eliminada del color ${colorIndex + 1}`);
    }
  };

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
    addLog("🎨 Nuevo color añadido");
  };

  const handleRemoveColor = (colorIndex: number) => {
    if (colorVariants.length > 1) {
      const colorName = colorVariants[colorIndex].color;
      const updatedColors = colorVariants.filter((_, i) => i !== colorIndex);
      setColorVariants(updatedColors);
      setCollapsedColors(prev => prev
        .filter(index => index !== colorIndex)
        .map(index => index > colorIndex ? index - 1 : index)
      );
      addLog(`➖ Color "${colorName}" eliminado`);
    }
  };

  const toggleColorCollapse = (colorIndex: number) => {
    setCollapsedColors(prev => 
      prev.includes(colorIndex) 
        ? prev.filter(i => i !== colorIndex)
        : [...prev, colorIndex]
    );
  };

  const validateForm = (): boolean => {
    const errors: ValidationError[] = [];
    
    setValidationErrors([]);
    
    if (!name.trim()) {
      errors.push({ field: 'name', message: 'El nombre es obligatorio' });
    }
    
    if (!description.trim()) {
      errors.push({ field: 'description', message: 'La descripción es obligatoria' });
    }
    
    if (!gender.trim()) {
      errors.push({ field: 'gender', message: 'El género es obligatorio' });
    }
    
    for (let i = 0; i < colorVariants.length; i++) {
      const colorVariant = colorVariants[i];
      
      if (!colorVariant.color.trim()) {
        errors.push({ 
          field: `color-${i}`, 
          message: `El color ${i + 1} no tiene nombre` 
        });
      }
      
      const hasValidImages = colorVariant.images.some(img => 
        img.imageUrl && img.imageUrl.trim() !== ""
      );
      if (!hasValidImages) {
        errors.push({ 
          field: `images-${i}`, 
          message: `El color "${colorVariant.color}" necesita al menos una imagen` 
        });
      }
      
      for (let j = 0; j < colorVariant.sizes.length; j++) {
        const size = colorVariant.sizes[j];
        
        if (!size.size.trim()) {
          errors.push({ 
            field: `size-${i}-${j}`, 
            message: `Talla incompleta en color "${colorVariant.color}"` 
          });
        }
        
        if (size.stock < 0) {
          errors.push({ 
            field: `stock-${i}-${j}`, 
            message: `El stock no puede ser negativo en color "${colorVariant.color}"` 
          });
        }
        
        if (size.price <= 0) {
          errors.push({ 
            field: `price-${i}-${j}`, 
            message: `El precio debe ser mayor a 0 en color "${colorVariant.color}"` 
          });
        }
      }
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      errors.forEach(error => {
        addLog(`❌ Validación: ${error.message}`);
      });
      alert(`Errores de validación:\n${errors.map(e => `• ${e.message}`).join('\n')}`);
      return false;
    }
    
    addLog("✅ Validación del formulario exitosa");
    return true;
  };

  const transformToProductData = (): Product => {
    addLog("🔄 Transformando datos para envío...");
    
    const originalProduct = editingProductId 
      ? products.find(p => p.id === editingProductId)
      : null;
    
    const originalVariantsMap = new Map<string, Variant>();
    if (originalProduct) {
      originalProduct.variants.forEach(variant => {
        const key = `${variant.color}_${variant.size}`;
        originalVariantsMap.set(key, variant);
      });
    }

    const variants: Variant[] = [];
    
    colorVariants.forEach((colorVariant) => {
      colorVariant.sizes.forEach((size) => {
        const key = `${colorVariant.color.trim()}_${size.size.trim()}`;
        const originalVariant = originalVariantsMap.get(key);
        
        let images: Image[] = [];
        
        if (colorVariant.images && colorVariant.images.length > 0) {
          images = colorVariant.images
            .filter(img => img.imageUrl && img.imageUrl.trim() !== "")
            .map(img => ({
              ...(img.id ? { id: img.id } : {}),
              fileName: img.fileName.trim() || `producto_${colorVariant.color}`,
              imageUrl: img.imageUrl.trim(),
              thumbnailUrl: img.thumbnailUrl || img.imageUrl,
              mediumUrl: img.mediumUrl || img.imageUrl,
              largeUrl: img.largeUrl || img.imageUrl
            }));
        }
        
        const variant: Variant = {
          ...(originalVariant?.id ? { id: originalVariant.id } : {}),
          color: colorVariant.color.trim(),
          size: size.size.trim(),
          stock: Number(size.stock),
          price: Number(size.price),
          images: images,
          hasOrders: originalVariant?.hasOrders,
          enabled: originalVariant?.enabled ?? true
        };
        
        variants.push(variant);
      });
    });

    const productData: Product = {
      ...(editingProductId ? { id: editingProductId } : {}),
      name: name.trim(),
      description: description.trim(),
      gender: gender.trim(),
      type: "SUPERIOR",
      variants,
      enabled: originalProduct?.enabled ?? true
    };

    addLog("📤 Datos listos para enviar", {
      name: productData.name,
      variants: productData.variants.length,
      editing: !!editingProductId,
      enabled: productData.enabled
    });
    
    return productData;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    
    setIsLoading(true);
    addLog("⏳ Iniciando envío del producto...");

    const productData = transformToProductData();

    try {
      const token = localStorage.getItem("token");
      const url = editingProductId 
        ? `${MENU_PRODUCTS}/${editingProductId}`
        : MENU_PRODUCTS;
      
      const method = editingProductId ? "PUT" : "POST";
      
      addLog(`📤 Enviando datos: ${method} ${url}`);

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
        const message = editingProductId ? "Producto actualizado exitosamente" : "Producto creado exitosamente";
        addLog(`✅ ${message}`);
        alert(message);
        fetchProducts();
        resetForm();
      } else {
        addLog(`❌ Error en respuesta: ${result.message}`, result);
        alert(`Error: ${result.message || "No se pudo guardar"}`);
      }
    } catch (error) {
      addLog("❌ Error de conexión", error);
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
    setValidationErrors([]);
    initialImageIdsRef.current.clear();
    addLog("🔄 Formulario reiniciado");
  };

  const handleEdit = (product: Product) => {
    addLog(`✏️ Editando producto: ${product.name}`, {
      id: product.id,
      variants: product.variants.length,
      enabled: product.enabled
    });
    
    // Limpiar IDs previos
    initialImageIdsRef.current.clear();
    isInitializingRef.current = true;
    
    setName(product.name || "");
    setDescription(product.description || "");
    setGender(product.gender || "");
    
    const colorsMap = new Map<string, ColorVariant>();
    const imagesByColor = new Map<string, Image[]>();
    
    // Recolectar imágenes por color
    product.variants.forEach(variant => {
      if (variant.images && variant.images.length > 0) {
        const colorImages = imagesByColor.get(variant.color) || [];
        
        variant.images.forEach(img => {
          if (img.id) {
            initialImageIdsRef.current.add(`${img.id}`);
          }
          
          const exists = colorImages.some(existingImg => 
            existingImg.id === img.id || existingImg.imageUrl === img.imageUrl
          );
          
          if (!exists && img.imageUrl) {
            colorImages.push({
              id: img.id,
              fileName: img.fileName || `producto_${variant.color}`,
              imageUrl: img.imageUrl,
              thumbnailUrl: (img as any).thumbnailUrl || img.imageUrl,
              mediumUrl: (img as any).mediumUrl || img.imageUrl,
              largeUrl: (img as any).largeUrl || img.imageUrl
            });
          }
        });
        
        imagesByColor.set(variant.color, colorImages);
      }
    });
    
    // Recolectar tallas por color
    product.variants.forEach(variant => {
      if (!colorsMap.has(variant.color)) {
        const imagesForColor = imagesByColor.get(variant.color) || [{ 
          fileName: "", 
          imageUrl: "", 
          thumbnailUrl: "", 
          mediumUrl: "", 
          largeUrl: "" 
        }];
        
        colorsMap.set(variant.color, {
          color: variant.color,
          images: imagesForColor,
          sizes: []
        });
      }
      
      const colorData = colorsMap.get(variant.color)!;
      const sizeExists = colorData.sizes.some(s => s.size === variant.size);
      if (!sizeExists) {
        colorData.sizes.push({
          size: variant.size,
          stock: variant.stock,
          price: variant.price
        });
      }
    });
    
    const groupedColors = Array.from(colorsMap.values());
    
    setColorVariants(groupedColors);
    setEditingProductId(product.id || null);
    
    const collapsedIndices = groupedColors.map((_, i) => i > 0 ? i : -1).filter(i => i >= 0);
    setCollapsedColors(collapsedIndices);
    
    prevColorVariantsRef.current = JSON.parse(JSON.stringify(groupedColors));
    isInitializingRef.current = false;
    
    addLog("✅ Formulario cargado para edición", {
      colors: groupedColors.length,
      totalImages: groupedColors.reduce((sum, color) => sum + color.images.length, 0),
      totalSizes: groupedColors.reduce((sum, color) => sum + color.sizes.length, 0),
      productEnabled: product.enabled
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleProductStatus = async (id: number, currentStatus: boolean) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const action = currentStatus ? "inhabilitar" : "habilitar";
    const confirmationMessage = currentStatus 
      ? `¿Inhabilitar el producto "${product.name}"?\n\nEl producto no será visible al público.`
      : `¿Habilitar el producto "${product.name}"?\n\nEl producto será visible al público.`;

    if (!window.confirm(confirmationMessage)) return;

    setIsToggling(id);
    addLog(`🔄 Cambiando estado de producto ID ${id}: ${currentStatus ? 'habilitado → inhabilitado' : 'inhabilitado → habilitado'}`);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${MENU_PRODUCTS}/${id}/toggle-status`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      const result: ApiResponse = await response.json();
      
      if (response.ok) {
        const newStatus = result.enabled ? 'habilitado' : 'inhabilitado';
        const message = `✅ Producto ${newStatus}: ${product.name}`;
        addLog(message);
        alert(`Producto ${newStatus} exitosamente.`);
        fetchProducts();
      } else {
        addLog(`❌ Error al cambiar estado: ${result.message}`);
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      addLog("❌ Error de conexión al cambiar estado", error);
      alert("Error de conexión");
    } finally {
      setIsToggling(null);
    }
  };

  const disableProduct = async (id: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    if (!window.confirm(`¿Inhabilitar el producto "${product.name}"?\n\nEl producto no será visible al público.`)) return;

    setIsToggling(id);
    addLog(`🚫 Inhabilitando producto ID ${id}: ${product.name}`);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${MENU_PRODUCTS}/${id}/disable`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      const result: ApiResponse = await response.json();
      
      if (response.ok) {
        addLog(`✅ Producto inhabilitado: ${product.name}`);
        alert("Producto inhabilitado exitosamente.");
        fetchProducts();
      } else {
        addLog(`❌ Error al inhabilitar: ${result.message}`);
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      addLog("❌ Error de conexión al inhabilitar", error);
      alert("Error de conexión");
    } finally {
      setIsToggling(null);
    }
  };

  const enableProduct = async (id: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    if (!window.confirm(`¿Habilitar el producto "${product.name}"?\n\nEl producto será visible al público.`)) return;

    setIsToggling(id);
    addLog(`✅ Habilitando producto ID ${id}: ${product.name}`);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${MENU_PRODUCTS}/${id}/enable`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      const result: ApiResponse = await response.json();
      
      if (response.ok) {
        addLog(`✅ Producto habilitado: ${product.name}`);
        alert("Producto habilitado exitosamente.");
        fetchProducts();
      } else {
        addLog(`❌ Error al habilitar: ${result.message}`);
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      addLog("❌ Error de conexión al habilitar", error);
      alert("Error de conexión");
    } finally {
      setIsToggling(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        addLog("📋 URL copiada al portapapeles");
        alert("URL copiada!");
      })
      .catch(err => {
        addLog("❌ Error al copiar URL", err);
      });
  };

  const navigateTo = (path: string) => {
    addLog(`📍 Navegando a: ${path}`);
    router.push(path);
  };

  const clearLogs = () => {
    setLogs([]);
    addLog("🧹 Logs limpiados");
  };

  const downloadLogs = () => {
    const logText = logs.join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog("💾 Logs descargados");
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
      {/* Header con navegación */}
      <div className={styles.adminHeader}>
        <h1 className={styles.adminTitle}>🏪 Panel de Administración</h1>
        <div className={styles.headerActions}>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/meta')}
          >
            META
          </button>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/orden')}
          >
            📦 Órdenes
          </button>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/admin/blog')}
          >
            📝 Blog
          </button>
          <button 
            className={`${styles.logButton} ${showLogPanel ? styles.active : ''}`}
            onClick={() => setShowLogPanel(!showLogPanel)}
          >
            📋 Logs ({logs.length})
          </button>
        </div>
      </div>

      {/* Panel de Logs */}
      {showLogPanel && (
        <div className={styles.logPanel}>
          <div className={styles.logPanelHeader}>
            <h3>📋 Registro de Actividad</h3>
            <div className={styles.logActions}>
              <button onClick={clearLogs} className={styles.smallButton}>
                🧹 Limpiar
              </button>
              <button onClick={downloadLogs} className={styles.smallButton}>
                💾 Descargar
              </button>
              <button 
                onClick={() => setShowLogPanel(false)} 
                className={styles.smallButton}
              >
                ✕ Cerrar
              </button>
            </div>
          </div>
          <div className={styles.logContent}>
            {logs.length === 0 ? (
              <div className={styles.emptyLogs}>No hay actividad registrada</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={styles.logEntry}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <h2 className={styles.title}>
        {editingProductId ? "✏️ Editar Producto" : "➕ Agregar Producto"}
      </h2>
      
      {validationErrors.length > 0 && (
        <div className={styles.validationErrors}>
          <h4>⚠️ Errores de Validación:</h4>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error.message}</li>
            ))}
          </ul>
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Sección de información general */}
        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>📋 Información General</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Nombre del Producto <span className={styles.required}>*</span>
              </label>
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
              <label className={styles.label}>
                Género <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.select}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
                disabled={isLoading}
              >
                <option value="">Seleccionar género...</option>
                <option value="NIÑOS">👦 NIÑOS</option>
                <option value="NIÑAS">👧 NIÑAS</option>
                <option value="UNISEX">👥 UNISEX</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Descripción <span className={styles.required}>*</span>
            </label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              disabled={isLoading}
              rows={3}
              placeholder="Describe el producto detalladamente..."
            />
            <div className={styles.helpText}>Mínimo 50 caracteres recomendado</div>
          </div>

          <div className={styles.typeInfo}>
            <span className={styles.typeBadge}>👕 SUPERIOR</span>
            <span className={styles.typeNote}>Tipo de producto fijo</span>
          </div>
        </div>

        <hr className={styles.divider} />
        
        {/* Sección de colores y variantes */}
        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              🎨 Colores y Variantes 
              <span className={styles.sectionSubtitle}>
                ({colorVariants.length} color{colorVariants.length !== 1 ? 'es' : ''})
              </span>
            </h3>
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
            <div key={`color-${colorIndex}-${colorVariant.color}`} className={styles.colorBox}>
              <div className={styles.colorHeader}>
                <button
                  type="button"
                  className={styles.collapseButton}
                  onClick={() => toggleColorCollapse(colorIndex)}
                  title={collapsedColors.includes(colorIndex) ? "Expandir" : "Colapsar"}
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
                    placeholder="Nombre del color (ej: Rojo, Azul, Negro...)"
                  />
                  <div className={styles.colorStats}>
                    <span className={styles.colorCount}>
                      {colorVariant.sizes.length} talla{colorVariant.sizes.length !== 1 ? 's' : ''}
                    </span>
                    <span className={styles.imageCount}>
                      {colorVariant.images.filter(img => img.imageUrl).length} img
                    </span>
                  </div>
                </div>
                
                <div className={styles.colorActions}>
                  {colorVariants.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeSmallButton}
                      onClick={() => handleRemoveColor(colorIndex)}
                      disabled={isLoading}
                      title="Eliminar color"
                    >
                      ✕ Eliminar
                    </button>
                  )}
                </div>
              </div>
              
              {!collapsedColors.includes(colorIndex) && (
                <div className={styles.colorContent}>
                  {/* Imágenes del color */}
                  <div className={styles.imagesSection}>
                    <label className={styles.subLabel}>
                      Imágenes para este color <span className={styles.required}>*</span>
                      <span className={styles.helpLabel}>
                        (Mínimo 1 imagen, máximo 5)
                      </span>
                    </label>
                    <div className={styles.imagesGrid}>
                      {colorVariant.images.map((img, imgIndex) => (
                        <div key={`img-${colorIndex}-${imgIndex}`} className={styles.imageCard}>
                          <div className={styles.uploaderWrapper}>
                            <ImageUploader
                              onUploadSuccess={handleImageUploaded}
                              variantIndex={colorIndex}
                              imageIndex={imgIndex}
                              disabled={isLoading}
                              initialImageUrl={img.imageUrl}
                              imageId={img.id}
                            />
                          </div>
                          
                          {img.imageUrl && img.imageUrl.trim() !== "" && (
                            <div className={styles.imagePreviewCompact}>
                              <Image 
                                src={img.thumbnailUrl || img.imageUrl} 
                                alt="Preview" 
                                width={50}
                                height={50}
                                className={styles.thumbnailCompact}
                              />
                              <div className={styles.imageActions}>
                                <button
                                  type="button"
                                  className={styles.copySmallButton}
                                  onClick={() => copyToClipboard(img.imageUrl)}
                                  title="Copiar URL"
                                >
                                  📋
                                </button>
                                {colorVariant.images.length > 1 && (
                                  <button
                                    type="button"
                                    className={styles.removeTinyButton}
                                    onClick={() => handleRemoveImage(colorIndex, imgIndex)}
                                    title="Eliminar imagen"
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
                        onClick={() => handleAddImage(colorIndex)}
                        disabled={isLoading}
                      >
                        ➕ Agregar otra imagen
                      </button>
                    )}
                  </div>
                  
                  {/* Tallas del color */}
                  <div className={styles.sizesSection}>
                    <label className={styles.subLabel}>
                      Tallas disponibles para este color <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.sizesHelp}>
                      <span className={styles.helpText}>Agrega todas las tallas disponibles con su stock y precio</span>
                    </div>
                    <div className={styles.sizesGrid}>
                      {colorVariant.sizes.map((size, sizeIndex) => (
                        <div key={`size-${colorIndex}-${sizeIndex}`} className={styles.sizeCard}>
                          <div className={styles.sizeField}>
                            <label className={styles.fieldLabel}>Talla</label>
                            <input
                              className={styles.sizeInput}
                              type="text"
                              value={size.size}
                              onChange={(e) => handleSizeChange(colorIndex, sizeIndex, 'size', e.target.value)}
                              placeholder="Ej: S, M, L, XL"
                              required
                              disabled={isLoading}
                            />
                          </div>
                          
                          <div className={styles.sizeField}>
                            <label className={styles.fieldLabel}>Stock</label>
                            <input
                              className={styles.stockInput}
                              type="number"
                              value={size.stock}
                              onChange={(e) => handleSizeChange(colorIndex, sizeIndex, 'stock', e.target.value)}
                              min="0"
                              step="1"
                              placeholder="0"
                              required
                              disabled={isLoading}
                              title="Cantidad disponible (0 = agotado)"
                            />
                          </div>
                          
                          <div className={styles.sizeField}>
                            <label className={styles.fieldLabel}>Precio ($)</label>
                            <input
                              className={styles.priceInput}
                              type="number"
                              value={size.price}
                              onChange={(e) => handleSizeChange(colorIndex, sizeIndex, 'price', e.target.value)}
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              required
                              disabled={isLoading}
                              title="Precio en dólares"
                            />
                          </div>
                          
                          {colorVariant.sizes.length > 1 && (
                            <button
                              type="button"
                              className={styles.removeTinyButton}
                              onClick={() => handleRemoveSize(colorIndex, sizeIndex)}
                              disabled={isLoading}
                              title="Eliminar talla"
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
              '💾 Actualizar Producto'
            ) : (
              '🚀 Crear Producto'
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
          
          <button
            type="button"
            className={`${styles.button} ${styles.tertiaryButton}`}
            onClick={resetForm}
            disabled={isLoading || (!name && !description && !gender && colorVariants[0].color === "")}
          >
            🧹 Limpiar Formulario
          </button>
        </div>
      </form>

      {/* Lista de productos */}
      <div className={styles.productsSection}>
        <div className={styles.productsHeader}>
          <h2 className={styles.title}>
            📦 Productos ({products.length})
            <button 
              onClick={fetchProducts} 
              className={styles.refreshButton}
              disabled={isLoading}
              title="Actualizar lista"
            >
              🔄 Actualizar
            </button>
          </h2>
        </div>
        
        {products.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📭</span>
            <p>No hay productos registrados.</p>
            <p className={styles.emptySubtitle}>Crea tu primer producto usando el formulario superior</p>
          </div>
        ) : (
          <div className={styles.productsTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Género</th>
                  <th>Estado</th>
                  <th>Variantes</th>
                  <th>Stock Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className={`${product.hasOrders ? styles.hasOrders : ''} ${!product.enabled ? styles.disabledProduct : ''}`}>
                    <td>
                      <div className={styles.productCell}>
                        <div className={styles.productHeader}>
                          <strong>{product.name}</strong>
                          {!product.enabled && (
                            <span className={styles.disabledBadge} title="Producto inhabilitado">
                              🚫 Inhabilitado
                            </span>
                          )}
                        </div>
                        <small>{product.description.substring(0, 60)}...</small>
                        {product.hasOrders && (
                          <span className={styles.orderBadge} title="Tiene órdenes asociadas">
                            📦 Con órdenes
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles.genderBadge} ${styles[product.gender.toLowerCase()]}`}>
                        {product.gender === 'NIÑAS' ? '👧' : 
                         product.gender === 'NIÑOS' ? '👦' : '👥'} {product.gender}
                      </span>
                    </td>
                    <td>
                      <div className={styles.statusCell}>
                        {product.enabled ? (
                          <span className={styles.statusEnabled}>
                            ✅ Habilitado
                          </span>
                        ) : (
                          <span className={styles.statusDisabled}>
                            ❌ Inhabilitado
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.variantsInfo}>
                        {Array.from(new Set(product.variants.map(v => v.color))).slice(0, 3).map(color => (
                          <span key={color} className={styles.colorTag}>{color}</span>
                        ))}
                        {Array.from(new Set(product.variants.map(v => v.color))).length > 3 && (
                          <span className={styles.moreTag}>
                            +{Array.from(new Set(product.variants.map(v => v.color))).length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={styles.stockNumber}>
                        {product.variants.reduce((sum, v) => sum + v.stock, 0)}
                        {product.variants.reduce((sum, v) => sum + v.stock, 0) === 0 && (
                          <span className={styles.outOfStock}> (Agotado)</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button 
                          className={styles.editButtonSmall}
                          onClick={() => handleEdit(product)}
                          disabled={isLoading || isToggling !== null}
                          title="Editar producto"
                        >
                          ✏️ Editar
                        </button>
                        
                        <button 
                          className={product.enabled ? styles.disableButtonSmall : styles.enableButtonSmall}
                          onClick={() => toggleProductStatus(product.id!, product.enabled!)}
                          disabled={isLoading || isToggling !== null}
                          title={product.enabled ? "Inhabilitar producto" : "Habilitar producto"}
                        >
                          {isToggling === product.id ? (
                            <span className={styles.smallSpinner}></span>
                          ) : product.enabled ? (
                            '🚫 Inhabilitar'
                          ) : (
                            '✅ Habilitar'
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

      {/* Footer informativo */}
      <div className={styles.infoFooter}>
        <div className={styles.infoItem}>
          <strong>ℹ️ Información:</strong>
          <p>• Productos inhabilitados no son visibles al público</p>
          <p>• Stock 0 = Producto agotado = No se compra</p>
          <p>• Colores/tallas con órdenes no se pueden editar</p>
          <p>• Precios en  (COP)</p>
        </div>
        <div className={styles.infoItem}>
          <strong>📝 Notas:</strong>
          <p>• Guarda cambios frecuentemente</p>
          <p>• Verifica imágenes antes de publicar</p>
          <p>• Mantén stock actualizado</p>
          <p>• Inhabilita productos en lugar de eliminarlos</p>
        </div>
      </div>
    </div>
  );
};

export default Admin;