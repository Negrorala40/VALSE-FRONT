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

// Colores predefinidos disponibles
const PREDEFINED_COLORS = [
  "Rojo", "Azul", "Verde", "Negro", "Blanco", "Gris", "Amarillo", "Naranja",
  "Rosa", "Morado", "Marrón", "Beige", "Turquesa", "Vino", "Oliva", "Celeste",
  "Coral", "Lavanda", "Mostaza", "Bordó"
];

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
  const [showColorDropdown, setShowColorDropdown] = useState<number | null>(null);
  
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
      addLog("Admin Panel inicializado");
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
      addLog("Solicitando lista de productos...");
      const token = localStorage.getItem("token");
      const response = await fetch(MENU_PRODUCTS, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        addLog(`Productos obtenidos: ${data.length} productos`);
        setProducts(data);
      } else {
        addLog(`Error al obtener productos: ${response.statusText}`);
        alert("Error al cargar los productos");
      }
    } catch (error) {
      addLog("Error de conexión al cargar productos", error);
      alert("Error de conexión al cargar productos");
    }
  };

  const handleColorSelect = (colorIndex: number, color: string) => {
    const updatedColors = [...colorVariants];
    
    if (editingProductId) {
      const originalProduct = products.find(p => p.id === editingProductId);
      if (originalProduct) {
        const oldColor = updatedColors[colorIndex].color;
        const hasOrders = originalProduct.variants.some(v => 
          v.color === oldColor && v.hasOrders
        );
        
        if (hasOrders) {
          alert(`El color "${oldColor}" tiene órdenes asociadas.\nNo se puede modificar. Crea una nueva variante en su lugar.`);
          setShowColorDropdown(null);
          return;
        }
      }
    }
    
    updatedColors[colorIndex].color = color;
    setColorVariants(updatedColors);
    setShowColorDropdown(null);
    addLog(`Color seleccionado: ${color}`);
  };

  const handleCustomColor = (colorIndex: number, value: string) => {
    const updatedColors = [...colorVariants];
    
    if (editingProductId) {
      const originalProduct = products.find(p => p.id === editingProductId);
      if (originalProduct) {
        const oldColor = updatedColors[colorIndex].color;
        const hasOrders = originalProduct.variants.some(v => 
          v.color === oldColor && v.hasOrders
        );
        
        if (hasOrders) {
          alert(`El color "${oldColor}" tiene órdenes asociadas.\nNo se puede modificar. Crea una nueva variante en su lugar.`);
          return;
        }
      }
    }
    
    updatedColors[colorIndex].color = value;
    setColorVariants(updatedColors);
  };

  const toggleColorDropdown = (colorIndex: number) => {
    setShowColorDropdown(prev => prev === colorIndex ? null : colorIndex);
  };

  const handleImageUploaded = useCallback((imageData: ImageData, colorIndex?: number, imageIndex?: number) => {
    if (colorIndex === undefined || imageIndex === undefined) {
      addLog("Índices no definidos en handleImageUploaded");
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
        
        addLog(`Imagen ${imageIndex + 1} actualizada para color: "${updatedColors[colorIndex].color}"`);
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
    addLog(`Imagen añadida al color ${colorIndex + 1}`);
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
      addLog(`Imagen ${imageIndex + 1} eliminada del color ${colorIndex + 1}`);
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
              alert(`La talla "${oldSize}" tiene órdenes asociadas.\nNo se puede modificar. Crea una nueva variante en su lugar.`);
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
    addLog(`Talla añadida al color ${colorIndex + 1}`);
  };

  const handleRemoveSize = (colorIndex: number, sizeIndex: number) => {
    const updatedColors = [...colorVariants];
    if (updatedColors[colorIndex].sizes.length > 1) {
      updatedColors[colorIndex].sizes.splice(sizeIndex, 1);
      setColorVariants(updatedColors);
      addLog(`Talla ${sizeIndex + 1} eliminada del color ${colorIndex + 1}`);
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
    addLog("Nuevo color añadido");
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
      addLog(`Color "${colorName}" eliminado`);
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
        addLog(`Validación: ${error.message}`);
      });
      alert(`Errores de validación:\n${errors.map(e => `• ${e.message}`).join('\n')}`);
      return false;
    }
    
    addLog("Validación del formulario exitosa");
    return true;
  };

  const transformToProductData = (): Product => {
    addLog("Transformando datos para envío...");
    
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

    addLog("Datos listos para enviar", {
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
    addLog("Iniciando envío del producto...");

    const productData = transformToProductData();

    try {
      const token = localStorage.getItem("token");
      const url = editingProductId 
        ? `${MENU_PRODUCTS}/${editingProductId}`
        : MENU_PRODUCTS;
      
      const method = editingProductId ? "PUT" : "POST";
      
      addLog(`Enviando datos: ${method} ${url}`);

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
        addLog(`${message}`);
        alert(message);
        fetchProducts();
        resetForm();
      } else {
        addLog(`Error en respuesta: ${result.message}`, result);
        alert(`Error: ${result.message || "No se pudo guardar"}`);
      }
    } catch (error) {
      addLog("Error de conexión", error);
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
    setShowColorDropdown(null);
    initialImageIdsRef.current.clear();
    addLog("Formulario reiniciado");
  };

  const handleEdit = (product: Product) => {
    addLog(`Editando producto: ${product.name}`, {
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
    
    addLog("Formulario cargado para edición", {
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
    addLog(`Cambiando estado de producto ID ${id}: ${currentStatus ? 'habilitado → inhabilitado' : 'inhabilitado → habilitado'}`);

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
        const message = `Producto ${newStatus}: ${product.name}`;
        addLog(message);
        alert(`Producto ${newStatus} exitosamente.`);
        fetchProducts();
      } else {
        addLog(`Error al cambiar estado: ${result.message}`);
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      addLog("Error de conexión al cambiar estado", error);
      alert("Error de conexión");
    } finally {
      setIsToggling(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        addLog("URL copiada al portapapeles");
        alert("URL copiada!");
      })
      .catch(err => {
        addLog("Error al copiar URL", err);
      });
  };

  const navigateTo = (path: string) => {
    addLog(`Navegando a: ${path}`);
    router.push(path);
  };

  const clearLogs = () => {
    setLogs([]);
    addLog("Logs limpiados");
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
    addLog("Logs descargados");
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
        <div className={styles.headerLeft}>
          <h1 className={styles.adminTitle}>Panel de Administración</h1>
          <div className={styles.headerMeta}>
            <span className={styles.productCount}>{products.length} productos</span>
            <span className={styles.adminBadge}>Admin</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/perfil')}
          >
            <span className={styles.buttonIcon}>👤</span>
            Perfil
          </button>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/meta')}
          >
            <span className={styles.buttonIcon}>🎯</span>
            Meta
          </button>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/orden')}
          >
            <span className={styles.buttonIcon}>📦</span>
            Órdenes
          </button>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/admin/blog')}
          >
            <span className={styles.buttonIcon}>📝</span>
            Blog
          </button>
          <button 
            className={`${styles.logButton} ${showLogPanel ? styles.active : ''}`}
            onClick={() => setShowLogPanel(!showLogPanel)}
          >
            <span className={styles.buttonIcon}>📊</span>
            Logs ({logs.length})
          </button>
        </div>
      </div>

      {/* Panel de Logs */}
      {showLogPanel && (
        <div className={styles.logPanel}>
          <div className={styles.logPanelHeader}>
            <div className={styles.logPanelTitle}>
              <h3>📋 Registro de Actividad</h3>
              <span className={styles.logCount}>{logs.length} eventos</span>
            </div>
            <div className={styles.logActions}>
              <button onClick={clearLogs} className={`${styles.smallButton} ${styles.clearButton}`}>
                🗑️ Limpiar
              </button>
              <button onClick={downloadLogs} className={`${styles.smallButton} ${styles.downloadButton}`}>
                📥 Descargar
              </button>
              <button 
                onClick={() => setShowLogPanel(false)} 
                className={`${styles.smallButton} ${styles.closeButton}`}
              >
                ✕ Cerrar
              </button>
            </div>
          </div>
          <div className={styles.logContent}>
            {logs.length === 0 ? (
              <div className={styles.emptyLogs}>
                <span className={styles.emptyIcon}>📄</span>
                No hay actividad registrada
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={styles.logEntry}>
                  <span className={styles.logTime}>{log.match(/\[(.*?)\]/)?.[1] || ''}</span>
                  <span className={styles.logMessage}>{log.replace(/\[.*?\] /, '')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Formulario principal */}
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

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Sección de información general */}
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                <div className={styles.fieldHelp}>Audiencia objetivo del producto</div>
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
          
          {/* Sección de colores y variantes */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleRow}>
                <h3 className={styles.sectionTitle}>
                  <span className={styles.sectionIcon}>🎨</span>
                  Colores y Variantes
                </h3>
                <span className={styles.variantCount}>
                  {colorVariants.length} color{colorVariants.length !== 1 ? 'es' : ''}
                </span>
              </div>
              <div className={styles.sectionHelp}>
                Agrega todos los colores disponibles con sus respectivas tallas
              </div>
            </div>
            
            <div className={styles.colorVariants}>
              {colorVariants.map((colorVariant, colorIndex) => (
                <div key={`color-${colorIndex}-${colorVariant.color}`} className={styles.colorVariant}>
                  <div className={styles.colorHeader}>
                    <button
                      type="button"
                      className={styles.collapseButton}
                      onClick={() => toggleColorCollapse(colorIndex)}
                      title={collapsedColors.includes(colorIndex) ? "Expandir" : "Colapsar"}
                      aria-label={collapsedColors.includes(colorIndex) ? "Expandir sección" : "Colapsar sección"}
                    >
                      {collapsedColors.includes(colorIndex) ? "▶" : "▼"}
                    </button>
                    
                    <div className={styles.colorMain}>
                      <div className={styles.colorInputGroup}>
                        <div className={styles.colorInputWrapper}>
                          <input
                            className={styles.colorInput}
                            type="text"
                            value={colorVariant.color}
                            onChange={(e) => handleCustomColor(colorIndex, e.target.value)}
                            onClick={() => toggleColorDropdown(colorIndex)}
                            required
                            disabled={isLoading}
                            placeholder="Seleccionar o escribir color..."
                            aria-label="Nombre del color"
                          />
                          <button
                            type="button"
                            className={styles.colorDropdownButton}
                            onClick={() => toggleColorDropdown(colorIndex)}
                            disabled={isLoading}
                            aria-label="Mostrar colores disponibles"
                          >
                            ▼
                          </button>
                        </div>
                        
                        {showColorDropdown === colorIndex && (
                          <div className={styles.colorDropdown}>
                            <div className={styles.colorDropdownHeader}>
                              <span className={styles.dropdownTitle}>🎨 Colores disponibles</span>
                              <button
                                type="button"
                                className={styles.closeDropdownButton}
                                onClick={() => setShowColorDropdown(null)}
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
                                    colorVariant.color === color ? styles.selected : ''
                                  }`}
                                  onClick={() => handleColorSelect(colorIndex, color)}
                                  aria-label={`Seleccionar color ${color}`}
                                >
                                  <span className={styles.colorDot} style={{ 
                                    backgroundColor: getColorHex(color) 
                                  }} />
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
                          {colorVariant.sizes.length} talla{colorVariant.sizes.length !== 1 ? 's' : ''}
                        </span>
                        <span className={styles.colorStat}>
                          <span className={styles.statIcon}>🖼️</span>
                          {colorVariant.images.filter(img => img.imageUrl).length} img
                        </span>
                      </div>
                    </div>
                    
                    <div className={styles.colorActions}>
                      {colorVariants.length > 1 && (
                        <button
                          type="button"
                          className={styles.removeColorButton}
                          onClick={() => handleRemoveColor(colorIndex)}
                          disabled={isLoading}
                          title="Eliminar color"
                          aria-label="Eliminar color"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {!collapsedColors.includes(colorIndex) && (
                    <div className={styles.colorContent}>
                      {/* Imágenes del color */}
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
                            <div key={`img-${colorIndex}-${imgIndex}`} className={styles.imageCard}>
                              <div className={styles.imageUploader}>
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
                                <div className={styles.imagePreview}>
                                  <div className={styles.previewImage}>
                                    <Image 
                                      src={img.thumbnailUrl || img.imageUrl} 
                                      alt="Vista previa" 
                                      width={60}
                                      height={60}
                                      className={styles.thumbnail}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                  <div className={styles.imageActions}>
                                    <button
                                      type="button"
                                      className={styles.copyButton}
                                      onClick={() => copyToClipboard(img.imageUrl)}
                                      title="Copiar URL de la imagen"
                                      aria-label="Copiar URL de la imagen"
                                    >
                                      📋 Copiar
                                    </button>
                                    {colorVariant.images.length > 1 && (
                                      <button
                                        type="button"
                                        className={styles.removeImageButton}
                                        onClick={() => handleRemoveImage(colorIndex, imgIndex)}
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
                            onClick={() => handleAddImage(colorIndex)}
                            disabled={isLoading}
                          >
                            <span className={styles.buttonIcon}>+</span>
                            Agregar otra imagen
                          </button>
                        )}
                      </div>
                      
                      {/* Tallas del color */}
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
                          {colorVariant.sizes.map((size, sizeIndex) => (
                            <div key={`size-${colorIndex}-${sizeIndex}`} className={styles.sizeCard}>
                              <div className={styles.sizeGroup}>
                                <label className={styles.sizeLabel}>Talla</label>
                                <input
                                  className={styles.sizeInput}
                                  type="text"
                                  value={size.size}
                                  onChange={(e) => handleSizeChange(colorIndex, sizeIndex, 'size', e.target.value)}
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
                                  onChange={(e) => handleSizeChange(colorIndex, sizeIndex, 'stock', e.target.value)}
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
                                  onChange={(e) => handleSizeChange(colorIndex, sizeIndex, 'price', e.target.value)}
                                  min="0"
                                  step="100"
                                  placeholder="0"
                                  required
                                  disabled={isLoading}
                                  aria-label="Precio en pesos colombianos"
                                />
                              </div>
                              
                              {colorVariant.sizes.length > 1 && (
                                <button
                                  type="button"
                                  className={styles.removeSizeButton}
                                  onClick={() => handleRemoveSize(colorIndex, sizeIndex)}
                                  disabled={isLoading}
                                  title="Eliminar talla"
                                  aria-label="Eliminar talla"
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
                onClick={handleAddColor}
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

          {/* Acciones del formulario */}
          <div className={styles.formActions}>
            <div className={styles.actionButtons}>
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
                  onClick={resetForm}
                  disabled={isLoading}
                >
                  <span className={styles.buttonIcon}>↩️</span>
                  Cancelar Edición
                </button>
              )}
              
              <button
                type="button"
                className={`${styles.button} ${styles.tertiaryButton}`}
                onClick={resetForm}
                disabled={isLoading || (!name && !description && !gender && colorVariants[0].color === "")}
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
                Los cambios se guardan automáticamente al editar productos existentes
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Lista de productos */}
      <div className={styles.productsCard}>
        <div className={styles.productsHeader}>
          <div className={styles.productsTitleRow}>
            <h2 className={styles.productsTitle}>
              <span className={styles.titleIcon}>📦</span>
              Productos en Catálogo
            </h2>
            <div className={styles.productsStats}>
              <span className={styles.statItem}>
                <span className={styles.statIcon}>✅</span>
                {products.filter(p => p.enabled).length} habilitados
              </span>
              <span className={styles.statItem}>
                <span className={styles.statIcon}>⏸️</span>
                {products.filter(p => !p.enabled).length} inhabilitados
              </span>
            </div>
          </div>
          <div className={styles.productsActions}>
            <button 
              onClick={fetchProducts} 
              className={styles.refreshButton}
              disabled={isLoading}
              title="Actualizar lista de productos"
              aria-label="Actualizar lista"
            >
              <span className={styles.buttonIcon}>🔄</span>
              Actualizar
            </button>
          </div>
        </div>
        
        {products.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📦</div>
            <h3 className={styles.emptyTitle}>No hay productos registrados</h3>
            <p className={styles.emptySubtitle}>Comienza creando tu primer producto usando el formulario superior</p>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className={styles.emptyButton}
            >
              <span className={styles.buttonIcon}>⬆️</span>
              Ir al formulario
            </button>
          </div>
        ) : (
          <div className={styles.productsTable}>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.tableHeader}>
                      <span className={styles.headerIcon}>📋</span>
                      Producto
                    </th>
                    <th className={styles.tableHeader}>
                      <span className={styles.headerIcon}>👥</span>
                      Género
                    </th>
                    <th className={styles.tableHeader}>
                      <span className={styles.headerIcon}>⚡</span>
                      Estado
                    </th>
                    <th className={styles.tableHeader}>
                      <span className={styles.headerIcon}>🎨</span>
                      Variantes
                    </th>
                    <th className={styles.tableHeader}>
                      <span className={styles.headerIcon}>📦</span>
                      Stock
                    </th>
                    <th className={styles.tableHeader}>
                      <span className={styles.headerIcon}>⚙️</span>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr 
                      key={product.id} 
                      className={`
                        ${styles.tableRow}
                        ${product.hasOrders ? styles.hasOrders : ''}
                        ${!product.enabled ? styles.disabledProduct : ''}
                      `}
                    >
                      <td className={styles.productCell}>
                        <div className={styles.productInfo}>
                          <div className={styles.productHeader}>
                            <h4 className={styles.productName}>{product.name}</h4>
                            <div className={styles.productBadges}>
                              {!product.enabled && (
                                <span className={`${styles.badge} ${styles.disabledBadge}`} title="Producto inhabilitado">
                                  ⏸️ Inhabilitado
                                </span>
                              )}
                              {product.hasOrders && (
                                <span className={`${styles.badge} ${styles.ordersBadge}`} title="Tiene órdenes asociadas">
                                  📦 Con órdenes
                                </span>
                              )}
                            </div>
                          </div>
                          <p className={styles.productDescription}>
                            {product.description.substring(0, 80)}...
                          </p>
                        </div>
                      </td>
                      <td className={styles.genderCell}>
                        <span className={`${styles.genderBadge} ${styles[product.gender.toLowerCase()]}`}>
                          {product.gender === 'NIÑOS' ? '👦' : product.gender === 'NIÑAS' ? '👧' : '👥'}
                          {product.gender}
                        </span>
                      </td>
                      <td className={styles.statusCell}>
                        <div className={styles.statusIndicator}>
                          {product.enabled ? (
                            <span className={styles.statusEnabled}>
                              <span className={styles.statusIcon}>✅</span>
                              Habilitado
                            </span>
                          ) : (
                            <span className={styles.statusDisabled}>
                              <span className={styles.statusIcon}>⏸️</span>
                              Inhabilitado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={styles.variantsCell}>
                        <div className={styles.variantsContainer}>
                          {Array.from(new Set(product.variants.map(v => v.color))).slice(0, 2).map(color => (
                            <span key={color} className={styles.colorTag}>
                              <span 
                                className={styles.colorDot} 
                                style={{ backgroundColor: getColorHex(color) }}
                              />
                              {color}
                            </span>
                          ))}
                          {Array.from(new Set(product.variants.map(v => v.color))).length > 2 && (
                            <span className={styles.moreTag}>
                              +{Array.from(new Set(product.variants.map(v => v.color))).length - 2} más
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={styles.stockCell}>
                        <div className={styles.stockInfo}>
                          <span className={styles.stockNumber}>
                            {product.variants.reduce((sum, v) => sum + v.stock, 0)}
                          </span>
                          {product.variants.reduce((sum, v) => sum + v.stock, 0) === 0 && (
                            <span className={styles.outOfStock}>⚠️ Agotado</span>
                          )}
                        </div>
                      </td>
                      <td className={styles.actionsCell}>
                        <div className={styles.actionButtons}>
                          <button 
                            className={`${styles.actionButton} ${styles.editButton}`}
                            onClick={() => handleEdit(product)}
                            disabled={isLoading || isToggling !== null}
                            title="Editar producto"
                            aria-label="Editar producto"
                          >
                            <span className={styles.buttonIcon}>✏️</span>
                            Editar
                          </button>
                          
                          <button 
                            className={`${styles.actionButton} ${product.enabled ? styles.disableButton : styles.enableButton}`}
                            onClick={() => toggleProductStatus(product.id!, product.enabled!)}
                            disabled={isLoading || isToggling !== null}
                            title={product.enabled ? "Inhabilitar producto" : "Habilitar producto"}
                            aria-label={product.enabled ? "Inhabilitar producto" : "Habilitar producto"}
                          >
                            {isToggling === product.id ? (
                              <span className={styles.smallSpinner}></span>
                            ) : product.enabled ? (
                              <>
                                <span className={styles.buttonIcon}>⏸️</span>
                                Inhabilitar
                              </>
                            ) : (
                              <>
                                <span className={styles.buttonIcon}>✅</span>
                                Habilitar
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer informativo */}
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
              <span className={styles.itemIcon}>💾</span>
              Guarda cambios frecuentemente
            </li>
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

      {/* Footer del panel */}
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
};

// Función para obtener el código hexadecimal de un color
const getColorHex = (colorName: string): string => {
  const colorMap: { [key: string]: string } = {
    "Rojo": "#FF0000",
    "Azul": "#0000FF",
    "Verde": "#008000",
    "Negro": "#000000",
    "Blanco": "#FFFFFF",
    "Gris": "#808080",
    "Amarillo": "#FFFF00",
    "Naranja": "#FFA500",
    "Rosa": "#FFC0CB",
    "Morado": "#800080",
    "Marrón": "#A52A2A",
    "Beige": "#F5F5DC",
    "Turquesa": "#40E0D0",
    "Vino": "#722F37",
    "Oliva": "#808000",
    "Celeste": "#87CEEB",
    "Coral": "#FF7F50",
    "Lavanda": "#E6E6FA",
    "Mostaza": "#FFDB58",
    "Bordó": "#800000"
  };
  
  return colorMap[colorName] || "#CCCCCC";
};

export default Admin;