"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  API_BASE_URL,
  META_CSV,
  META_GENERATE,
  META_MIGRATE,
  META_PRODUCTS_V2,
  META_STATS,
} from "@/app/utils/Api";
import {
  ApiPaginationResponse,
  MetaProductResponse,
  MetaProductUpdateDTO,
  MetaStats,
} from "../types";
import {
  countVariantsWithDiscount,
  productMatchesSearch,
} from "../metaUtils";

export const useMetaDashboard = () => {
  const [products, setProducts] = useState<MetaProductResponse[]>([]);
  const [stats, setStats] = useState<MetaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedProduct, setSelectedProduct] =
    useState<MetaProductResponse | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);
  const [showOnlyDiscounted, setShowOnlyDiscounted] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem("token");

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }, []);

  const handleProductsData = useCallback((productsData: ApiPaginationResponse) => {
    setProducts(productsData.content || []);
    setTotalPages(productsData.totalPages || 1);
    setTotalElements(productsData.totalElements || 0);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const statsResponse = await fetch(META_STATS, {
        headers: getAuthHeaders(),
      });

      if (statsResponse.ok) {
        const statsData: MetaStats = await statsResponse.json();
        setStats(statsData);
      }
    } catch (err) {
      console.warn("No se pudieron cargar estadísticas:", err);
    }
  }, [getAuthHeaders]);

  const loadMetaData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const productsResponse = await fetch(
        `${META_PRODUCTS_V2}?page=${currentPage}&size=10&sort=id,desc`,
        {
          headers: getAuthHeaders(),
          credentials: "include",
        }
      );

      if (!productsResponse.ok) {
        if (productsResponse.status === 401) {
          throw new Error(
            "Debes iniciar sesión como administrador para acceder a esta sección"
          );
        }

        if (productsResponse.status === 404) {
          const fallbackResponse = await fetch(
            `${API_BASE_URL}/api/meta/v2/products?page=${currentPage}&size=10`,
            {
              headers: getAuthHeaders(),
            }
          );

          if (!fallbackResponse.ok) {
            throw new Error(`Error cargando productos: ${productsResponse.status}`);
          }

          const fallbackData: ApiPaginationResponse = await fallbackResponse.json();
          handleProductsData(fallbackData);
        } else {
          throw new Error(`Error cargando productos: ${productsResponse.status}`);
        }
      } else {
        const productsData: ApiPaginationResponse = await productsResponse.json();
        handleProductsData(productsData);
      }

      await loadStats();
    } catch (err: any) {
      console.error("Error cargando datos META:", err);
      setError(err.message || "Error cargando datos. Verifica la conexión.");
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, currentPage, getAuthHeaders, handleProductsData, loadStats]);

  useEffect(() => {
    loadMetaData();
  }, [loadMetaData]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (searchTerm.trim()) {
      filtered = filtered.filter((product) =>
        productMatchesSearch(product, searchTerm)
      );
    }

    if (showOnlyEnabled) {
      filtered = filtered.filter((product) => product.enabledForMeta);
    }

    if (showOnlyDiscounted) {
      filtered = filtered.filter(
        (product) => countVariantsWithDiscount(product) > 0
      );
    }

    return filtered;
  }, [products, searchTerm, showOnlyEnabled, showOnlyDiscounted]);

  const toggleMetaEnabled = useCallback(
    async (productId: number, enabled: boolean) => {
      if (!window.confirm(`¿${enabled ? "Activar" : "Desactivar"} este producto para META?`)) {
        return;
      }
  
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/meta/v2/products/${productId}/enabled?enabled=${enabled}`,
          {
            method: "PATCH",
            headers: getAuthHeaders(),
          }
        );
  
        if (response.status === 401) {
          alert("Debes iniciar sesión como administrador para ejecutar esta acción");
          return;
        }
  
        if (!response.ok) {
          throw new Error(`Error ${response.status}`);
        }
  
        setProducts((prev) =>
          prev.map((product) =>
            product.productId === productId
              ? { ...product, enabledForMeta: enabled }
              : product
          )
        );
  
        await loadStats();
        alert(`Producto ${enabled ? "activado" : "desactivado"} correctamente para META`);
      } catch (err: any) {
        console.error("Error actualizando estado:", err);
        alert(`Error actualizando estado: ${err.message || "Error desconocido"}`);
      }
    },
    [getAuthHeaders, loadStats]
  );

  const migrateProducts = useCallback(async () => {
    if (
      !window.confirm(
        "¿Migrar todos los productos existentes a META? Esto creará metadatos para productos sin ellos."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(META_MIGRATE, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        alert("Debes iniciar sesión como administrador para ejecutar esta acción");
        return;
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status} en migración`);
      }

      const result = await response.text();
      alert(`✅ ${result}`);
      await loadMetaData();
    } catch (err: any) {
      alert(`❌ Error en migración: ${err.message}`);
    }
  }, [getAuthHeaders, loadMetaData]);

  const generateCSV = useCallback(async () => {
    if (!window.confirm("¿Generar y descargar archivo CSV para META?")) {
      return;
    }

    try {
      const response = await fetch(META_CSV, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        alert("Debes iniciar sesión como administrador para ejecutar esta acción");
        return;
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status} generando CSV`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        alert(
          "El CSV generado está vacío. No hay productos disponibles para el feed."
        );
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meta_feed_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (err: any) {
      alert(`❌ Error descargando CSV: ${err.message}`);
    }
  }, [getAuthHeaders]);

  const generateFeed = useCallback(async () => {
    if (
      !window.confirm(
        "¿Regenerar feed META? Esto actualizará el archivo CSV en el servidor."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        META_GENERATE || `${API_BASE_URL}/api/meta/feed/generate`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      if (response.status === 401) {
        alert("Debes iniciar sesión como administrador para ejecutar esta acción");
        return;
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status} generando feed`);
      }

      const result = await response.text();
      alert(`✅ ${result}`);
    } catch (err: any) {
      alert(`❌ Error generando feed: ${err.message}`);
    }
  }, [getAuthHeaders]);

  const updateProductMetadata = useCallback(
    async (productId: number, data: MetaProductUpdateDTO): Promise<boolean> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/meta/v2/products/${productId}`,
          {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
          }
        );

        if (response.status === 401) {
          alert("Debes iniciar sesión como administrador para ejecutar esta acción");
          return false;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `Error ${response.status}`);
        }

        const updatedProduct = await response.json();

        setProducts((prev) =>
          prev.map((product) =>
            product.productId === productId
              ? { ...product, ...updatedProduct }
              : product
          )
        );

        await loadStats();
        alert("✅ Producto actualizado correctamente");
        return true;
      } catch (err: any) {
        alert(`❌ Error: ${err.message}`);
        return false;
      }
    },
    [getAuthHeaders, loadStats]
  );

  const openEditModal = useCallback((product: MetaProductResponse) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setSelectedProduct(null);
    setShowEditModal(false);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setShowOnlyEnabled(false);
    setShowOnlyDiscounted(false);
    setCurrentPage(0);
  }, []);

  return {
    products,
    filteredProducts,
    stats,
    loading,
    error,
    selectedProduct,
    showEditModal,
    searchTerm,
    showOnlyEnabled,
    showOnlyDiscounted,
    currentPage,
    totalPages,
    totalElements,
    setSearchTerm,
    setShowOnlyEnabled,
    setShowOnlyDiscounted,
    setCurrentPage,
    loadMetaData,
    toggleMetaEnabled,
    migrateProducts,
    generateCSV,
    generateFeed,
    updateProductMetadata,
    openEditModal,
    closeEditModal,
    clearFilters,
  };
};