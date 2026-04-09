"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { MENU_PRODUCTS } from "../../../utils/Api";
import {
  buildProductPayload,
  createEmptyColorVariant,
  createEmptyFormState,
  createEmptyImage,
  createEmptySize,
  hasOrdersForColor,
  hasOrdersForSize,
  normalizeProductToForm,
  validateProductForm
} from "../adminUtils";
import {
  ApiResponse,
  ImageData,
  Product,
  ProductFormState,
  ValidationError
} from "../types";

interface UseAdminProductsParams {
  addLog: (message: string, data?: unknown) => void;
}

export const useAdminProducts = ({ addLog }: UseAdminProductsParams) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [formState, setFormState] = useState<ProductFormState>(createEmptyFormState());
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isToggling, setIsToggling] = useState<number | null>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [collapsedColorIds, setCollapsedColorIds] = useState<string[]>([]);
  const [openColorDropdownId, setOpenColorDropdownId] = useState<string | null>(null);

  const initialImageIdsRef = useRef<Set<string>>(new Set());

  const editingProduct = useMemo(
    () => products.find((product) => product.id === editingProductId) || null,
    [products, editingProductId]
  );

  const fetchProducts = useCallback(async () => {
    try {
      addLog("Solicitando lista de productos...");
      const token = localStorage.getItem("token");

      const response = await fetch(MENU_PRODUCTS, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data);
        addLog(`Productos obtenidos: ${data.length} productos`);
        return;
      }

      addLog(`Error al obtener productos: ${response.statusText}`);
      alert("Error al cargar los productos");
    } catch (error) {
      addLog("Error de conexión al cargar productos", error);
      alert("Error de conexión al cargar productos");
    }
  }, [addLog]);

  const resetForm = useCallback(() => {
    setFormState(createEmptyFormState());
    setEditingProductId(null);
    setValidationErrors([]);
    setCollapsedColorIds([]);
    setOpenColorDropdownId(null);
    initialImageIdsRef.current.clear();
    addLog("Formulario reiniciado");
  }, [addLog]);

  const updateGeneralField = useCallback(
    (field: "name" | "description" | "gender", value: string) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
      setValidationErrors([]);
    },
    []
  );

  const updateColorName = useCallback(
    (colorUiId: string, value: string) => {
      setFormState((prev) => {
        const target = prev.colorVariants.find((color) => color.uiId === colorUiId);
        if (!target) return prev;

        if (
          editingProduct &&
          hasOrdersForColor(editingProduct, target.originalColor) &&
          target.originalColor !== value
        ) {
          alert(
            `El color "${target.originalColor}" tiene órdenes asociadas.\nNo se puede modificar. Crea una nueva variante en su lugar.`
          );
          return prev;
        }

        return {
          ...prev,
          colorVariants: prev.colorVariants.map((color) =>
            color.uiId === colorUiId ? { ...color, color: value } : color
          )
        };
      });

      setValidationErrors([]);
    },
    [editingProduct]
  );

  const selectPredefinedColor = useCallback(
    (colorUiId: string, value: string) => {
      updateColorName(colorUiId, value);
      setOpenColorDropdownId(null);
      addLog(`Color seleccionado: ${value}`);
    },
    [addLog, updateColorName]
  );

  const toggleColorDropdown = useCallback((colorUiId: string) => {
    setOpenColorDropdownId((prev) => (prev === colorUiId ? null : colorUiId));
  }, []);

  const toggleColorCollapse = useCallback((colorUiId: string) => {
    setCollapsedColorIds((prev) =>
      prev.includes(colorUiId)
        ? prev.filter((id) => id !== colorUiId)
        : [...prev, colorUiId]
    );
  }, []);

  const addColor = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      colorVariants: [...prev.colorVariants, createEmptyColorVariant()]
    }));
    setValidationErrors([]);
    addLog("Nuevo color añadido");
  }, [addLog]);

  const removeColor = useCallback(
    (colorUiId: string) => {
      setFormState((prev) => {
        if (prev.colorVariants.length <= 1) return prev;

        return {
          ...prev,
          colorVariants: prev.colorVariants.filter((color) => color.uiId !== colorUiId)
        };
      });

      setCollapsedColorIds((prev) => prev.filter((id) => id !== colorUiId));
      setOpenColorDropdownId((prev) => (prev === colorUiId ? null : prev));
      setValidationErrors([]);
      addLog("Color eliminado");
    },
    [addLog]
  );

  const addSize = useCallback(
    (colorUiId: string) => {
      setFormState((prev) => ({
        ...prev,
        colorVariants: prev.colorVariants.map((color) =>
          color.uiId === colorUiId
            ? { ...color, sizes: [...color.sizes, createEmptySize()] }
            : color
        )
      }));

      setValidationErrors([]);
      addLog("Talla añadida");
    },
    [addLog]
  );

  const removeSize = useCallback(
    (colorUiId: string, sizeUiId: string) => {
      setFormState((prev) => ({
        ...prev,
        colorVariants: prev.colorVariants.map((color) => {
          if (color.uiId !== colorUiId || color.sizes.length <= 1) return color;

          return {
            ...color,
            sizes: color.sizes.filter((size) => size.uiId !== sizeUiId)
          };
        })
      }));

      setValidationErrors([]);
      addLog("Talla eliminada");
    },
    [addLog]
  );

  const updateSizeField = useCallback(
    (
      colorUiId: string,
      sizeUiId: string,
      field: "size" | "stock" | "price" | "discountPercentage",
      value: string | number
    ) => {
      setFormState((prev) => {
        const color = prev.colorVariants.find((item) => item.uiId === colorUiId);
        const size = color?.sizes.find((item) => item.uiId === sizeUiId);

        if (!color || !size) return prev;

        if (
          field === "size" &&
          editingProduct &&
          hasOrdersForSize(editingProduct, color.originalColor, size.originalSize) &&
          size.originalSize !== value
        ) {
          alert(
            `La talla "${size.originalSize}" tiene órdenes asociadas.\nNo se puede modificar. Crea una nueva variante en su lugar.`
          );
          return prev;
        }

        if (field === "stock" && Number(value) < 0) {
          alert("El stock no puede ser negativo");
          return prev;
        }

        if (field === "price" && Number(value) < 0) {
          alert("El precio no puede ser negativo");
          return prev;
        }

        if (field === "discountPercentage") {
          const discountValue = Number(value);

          if (discountValue < 0) {
            alert("El descuento no puede ser negativo");
            return prev;
          }

          if (discountValue > 100) {
            alert("El descuento no puede ser mayor a 100%");
            return prev;
          }
        }

        return {
          ...prev,
          colorVariants: prev.colorVariants.map((item) => {
            if (item.uiId !== colorUiId) return item;

            return {
              ...item,
              sizes: item.sizes.map((sizeItem) => {
                if (sizeItem.uiId !== sizeUiId) return sizeItem;

                return {
                  ...sizeItem,
                  [field]: field === "size" ? value : Number(value)
                };
              })
            };
          })
        };
      });

      setValidationErrors([]);
    },
    [editingProduct]
  );

  const addImage = useCallback(
    (colorUiId: string) => {
      setFormState((prev) => ({
        ...prev,
        colorVariants: prev.colorVariants.map((color) =>
          color.uiId === colorUiId
            ? { ...color, images: [...color.images, createEmptyImage()] }
            : color
        )
      }));

      setValidationErrors([]);
      addLog("Imagen añadida");
    },
    [addLog]
  );

  const removeImage = useCallback(
    (colorUiId: string, imageIndex: number) => {
      setFormState((prev) => ({
        ...prev,
        colorVariants: prev.colorVariants.map((color) => {
          if (color.uiId !== colorUiId || color.images.length <= 1) return color;

          const removedImage = color.images[imageIndex];
          if (removedImage?.id) {
            initialImageIdsRef.current.delete(`${removedImage.id}`);
          }

          return {
            ...color,
            images: color.images.filter((_, index) => index !== imageIndex)
          };
        })
      }));

      setValidationErrors([]);
      addLog("Imagen eliminada");
    },
    [addLog]
  );

  const handleImageUploaded = useCallback(
    (imageData: ImageData, colorIndex?: number, imageIndex?: number) => {
      if (colorIndex === undefined || imageIndex === undefined) {
        addLog("Índices no definidos en handleImageUploaded");
        return;
      }

      if (imageData.id && initialImageIdsRef.current.has(`${imageData.id}`)) {
        return;
      }

      if (imageData.id) {
        initialImageIdsRef.current.add(`${imageData.id}`);
      }

      setFormState((prev) => {
        const targetColor = prev.colorVariants[colorIndex];
        if (!targetColor || imageIndex >= targetColor.images.length) return prev;

        const nextColors = [...prev.colorVariants];
        const nextImages = [...targetColor.images];

        nextImages[imageIndex] = {
          ...nextImages[imageIndex],
          ...imageData
        };

        nextColors[colorIndex] = {
          ...targetColor,
          images: nextImages
        };

        return {
          ...prev,
          colorVariants: nextColors
        };
      });

      addLog(`Imagen ${imageIndex + 1} actualizada`);
    },
    [addLog]
  );

  const validateAndSubmit = useCallback(async () => {
    const errors = validateProductForm(formState);
    setValidationErrors(errors);

    if (errors.length > 0) {
      errors.forEach((error) => addLog(`Validación: ${error.message}`));
      alert(`Errores de validación:\n${errors.map((e) => `• ${e.message}`).join("\n")}`);
      return false;
    }

    setIsLoading(true);
    addLog("Iniciando envío del producto...");

    const productData = buildProductPayload(formState, editingProduct, editingProductId);

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
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });

      const result: ApiResponse = await response.json();

      if (response.ok) {
        const message = editingProductId
          ? "Producto actualizado exitosamente"
          : "Producto creado exitosamente";

        addLog(message);
        alert(message);
        await fetchProducts();
        resetForm();
        return true;
      }

      addLog(`Error en respuesta: ${result.message}`, result);
      alert(`Error: ${result.message || "No se pudo guardar"}`);
      return false;
    } catch (error) {
      addLog("Error de conexión", error);
      alert("Error de conexión");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [addLog, editingProduct, editingProductId, fetchProducts, formState, resetForm]);

  const handleEdit = useCallback(
    (product: Product) => {
      initialImageIdsRef.current.clear();

      product.variants.forEach((variant) => {
        variant.images?.forEach((img) => {
          if (img.id) {
            initialImageIdsRef.current.add(`${img.id}`);
          }
        });
      });

      const normalizedForm = normalizeProductToForm(product);

      setFormState(normalizedForm);
      setEditingProductId(product.id || null);
      setValidationErrors([]);
      setOpenColorDropdownId(null);
      setCollapsedColorIds(normalizedForm.colorVariants.slice(1).map((color) => color.uiId));

      addLog(`Editando producto: ${product.name}`, {
        id: product.id,
        variants: product.variants.length,
        enabled: product.enabled
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [addLog]
  );

  const toggleProductStatus = useCallback(
    async (id: number, currentStatus: boolean) => {
      const product = products.find((p) => p.id === id);
      if (!product) return;

      const confirmationMessage = currentStatus
        ? `¿Inhabilitar el producto "${product.name}"?\n\nEl producto no será visible al público.`
        : `¿Habilitar el producto "${product.name}"?\n\nEl producto será visible al público.`;

      if (!window.confirm(confirmationMessage)) return;

      setIsToggling(id);
      addLog(
        `Cambiando estado de producto ID ${id}: ${
          currentStatus ? "habilitado → inhabilitado" : "inhabilitado → habilitado"
        }`
      );

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(`${MENU_PRODUCTS}/${id}/toggle-status`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        const result: ApiResponse = await response.json();

        if (response.ok) {
          const newStatus = result.enabled ? "habilitado" : "inhabilitado";
          addLog(`Producto ${newStatus}: ${product.name}`);
          alert(`Producto ${newStatus} exitosamente.`);
          await fetchProducts();
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
    },
    [addLog, fetchProducts, products]
  );

  return {
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
  };
};