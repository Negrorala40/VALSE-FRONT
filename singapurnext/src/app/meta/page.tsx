'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  API_BASE_URL,
  META_PRODUCTS_V2,
  META_STATS,
  META_CSV,
  META_MIGRATE,
  META_GENERATE
} from '@/app/utils/Api';
import styles from './meta.module.css';

// Tipos de datos ACTUALIZADOS para V2 - CON DESCUENTOS
interface MetaVariantInfo {
  variantId: number;
  sku: string;
  color: string;
  size: string;
  stock: number;
  price: number;
  enabled: boolean;
  variantEnabledForMeta: boolean;
  // ✅ NUEVOS CAMPOS PARA DESCUENTOS
  discountPercentage?: number;
  hasDiscount?: boolean;
  priceWithDiscount?: number;
  discountAmount?: number;
}

interface MetaProductResponse {
  productId: number;
  productName: string;
  productDescription: string;
  sku: string;
  enabledForMeta: boolean;
  metaTitle?: string;
  metaDescription?: string;
  googleProductCategory?: string;
  fbProductCategory?: string;
  material?: string;
  pattern?: string;
  style?: string;
  gtin?: string;
  shipping?: string;
  shippingWeight?: number;
  salePrice?: number;  // Precio de oferta global (metadata)
  salePriceStartDate?: string;
  salePriceEndDate?: string;
  videoUrl?: string;
  videoTag?: string;
  customLabels?: string;
  variants: MetaVariantInfo[];
}

interface MetaStats {
  totalProducts: number;
  totalVariants: number;
  metaEnabledProducts: number;
  eligibleForFeed: number;
  enabledButNotInMeta: number;
  outOfStock: number;
  disabledProducts: number;
}

// ✅ Tipo para paginación de API
interface ApiPaginationResponse {
  content: MetaProductResponse[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

const MetaDashboard = () => {
  const router = useRouter();
  
  // Función de navegación
  const navigateTo = (path: string) => {
    router.push(path);
  };
  
  // Estados
  const [products, setProducts] = useState<MetaProductResponse[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<MetaProductResponse[]>([]);
  const [stats, setStats] = useState<MetaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<MetaProductResponse | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Función para obtener headers con autenticación
  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  };

  // Cargar productos y estadísticas
  useEffect(() => {
    loadMetaData();
  }, [currentPage]);

  // Filtrar productos localmente
  useEffect(() => {
    let filtered = products;
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.metaTitle && p.metaTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.variants.some(v => 
          v.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.size.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    if (showOnlyEnabled) {
      filtered = filtered.filter(p => p.enabledForMeta);
    }
    
    setFilteredProducts(filtered);
  }, [products, searchTerm, showOnlyEnabled]);

  // Cargar datos
  const loadMetaData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // ✅ URL CORREGIDA - Asegurar que use la correcta
      const productsResponse = await fetch(
        `${META_PRODUCTS_V2}?page=${currentPage}&size=10&sort=id,desc`, 
        {
          headers: getAuthHeaders(),
          credentials: 'include' // Importante para cookies/sesiones
        }
      );
      
      if (!productsResponse.ok) {
        if (productsResponse.status === 401) {
          throw new Error('Debes iniciar sesión como administrador para acceder a esta sección');
        }
        if (productsResponse.status === 404) {
          // Intentar con endpoint alternativo
          const fallbackResponse = await fetch(
            `${API_BASE_URL}/api/meta/v2/products?page=${currentPage}&size=10`,
            { headers: getAuthHeaders() }
          );
          
          if (!fallbackResponse.ok) {
            throw new Error(`Error cargando productos: ${productsResponse.status}`);
          }
          
          const productsData: ApiPaginationResponse = await fallbackResponse.json();
          handleProductsData(productsData);
        } else {
          throw new Error(`Error cargando productos: ${productsResponse.status}`);
        }
      } else {
        const productsData: ApiPaginationResponse = await productsResponse.json();
        handleProductsData(productsData);
      }
      
      // Cargar estadísticas
      await loadStats();
      
    } catch (err: any) {
      console.error('Error cargando datos META:', err);
      setError(err.message || 'Error cargando datos. Verifica la conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para manejar datos de productos
  const handleProductsData = (productsData: ApiPaginationResponse) => {
    setProducts(productsData.content || []);
    setTotalPages(productsData.totalPages || 1);
    setTotalElements(productsData.totalElements || 0);
  };

  // Cargar estadísticas
  const loadStats = async () => {
    try {
      const statsResponse = await fetch(META_STATS, {
        headers: getAuthHeaders(),
      });
      
      if (statsResponse.ok) {
        const statsData: MetaStats = await statsResponse.json();
        setStats(statsData);
      }
    } catch (err) {
      console.warn('No se pudieron cargar estadísticas:', err);
    }
  };

  // ✅ Toggle estado META por PRODUCTO - CORREGIDO
  const toggleMetaEnabled = async (productId: number, enabled: boolean) => {
    if (!confirm(`¿${enabled ? 'Activar' : 'Desactivar'} este producto para META?`)) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/meta/v2/products/${productId}/enabled`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ enabled }),
      });
      
      if (response.status === 401) {
        alert('Debes iniciar sesión como administrador para ejecutar esta acción');
        return;
      }
      
      if (response.ok) {
        // Actualizar estado local de manera óptima
        setProducts(prev => prev.map(p => 
          p.productId === productId ? { ...p, enabledForMeta: enabled } : p
        ));
        
        // Actualizar estadísticas
        loadStats();
        
        alert(`Producto ${enabled ? 'activado' : 'desactivado'} correctamente para META`);
      } else {
        throw new Error(`Error ${response.status}`);
      }
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      alert(`Error actualizando estado: ${err.message || 'Error desconocido'}`);
    }
  };

  // ✅ Migrar productos existentes - CORREGIDO
  const migrateProducts = async () => {
    if (!confirm('¿Migrar todos los productos existentes a META? Esto creará metadatos para productos sin ellos.')) return;
    
    try {
      const response = await fetch(META_MIGRATE, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
      if (response.status === 401) {
        alert('Debes iniciar sesión como administrador para ejecutar esta acción');
        return;
      }
      
      if (!response.ok) throw new Error(`Error ${response.status} en migración`);
      
      const result = await response.text();
      alert(`✅ ${result}`);
      loadMetaData();
    } catch (err: any) {
      alert(`❌ Error en migración: ${err.message}`);
    }
  };

  // ✅ Generar CSV - CORREGIDO
  const generateCSV = async () => {
    if (!confirm('¿Generar y descargar archivo CSV para META?')) return;
    
    try {
      const response = await fetch(META_CSV, {
        headers: getAuthHeaders(),
      });
      
      if (response.status === 401) {
        alert('Debes iniciar sesión como administrador para ejecutar esta acción');
        return;
      }
      
      if (!response.ok) throw new Error(`Error ${response.status} generando CSV`);
      
      const blob = await response.blob();
      
      // Verificar si es un CSV válido
      if (blob.size === 0) {
        alert('El CSV generado está vacío. No hay productos disponibles para el feed.');
        return;
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meta_feed_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      
      // Limpieza
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
      
    } catch (err: any) {
      alert(`❌ Error descargando CSV: ${err.message}`);
    }
  };

  // ✅ Generar feed manualmente - OPCIÓN ADICIONAL
  const generateFeed = async () => {
    if (!confirm('¿Regenerar feed META? Esto actualizará el archivo CSV en el servidor.')) return;
    
    try {
      const response = await fetch(META_GENERATE || `${API_BASE_URL}/api/meta/feed/generate`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
      if (response.status === 401) {
        alert('Debes iniciar sesión como administrador para ejecutar esta acción');
        return;
      }
      
      if (!response.ok) throw new Error(`Error ${response.status} generando feed`);
      
      const result = await response.text();
      alert(`✅ ${result}`);
    } catch (err: any) {
      alert(`❌ Error generando feed: ${err.message}`);
    }
  };

  // ✅ Actualizar metadata del producto - CORREGIDO
  const updateProductMetadata = async (productId: number, data: any): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/meta/v2/products/${productId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      
      if (response.status === 401) {
        alert('Debes iniciar sesión como administrador para ejecutar esta acción');
        return false;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Error ${response.status}`);
      }
      
      const updatedProduct = await response.json();
      
      // Actualizar en estado local
      setProducts(prev => prev.map(p => 
        p.productId === productId ? { ...p, ...updatedProduct } : p
      ));
      
      alert('✅ Producto actualizado correctamente');
      return true;
      
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
      return false;
    }
  };

  // ✅ Contar variantes con descuento
  const countVariantsWithDiscount = (product: MetaProductResponse) => {
    return product.variants.filter(v => v.hasDiscount).length;
  };

  // ✅ Obtener porcentaje de descuento máximo
  const getMaxDiscount = (product: MetaProductResponse) => {
    const discounts = product.variants
      .filter(v => v.discountPercentage && v.discountPercentage > 0)
      .map(v => v.discountPercentage || 0);
    
    return discounts.length > 0 ? Math.max(...discounts) : 0;
  };

  // ✅ Calcular precio promedio con descuento
  const getAverageDiscountedPrice = (product: MetaProductResponse) => {
    const variantsWithDiscount = product.variants.filter(v => v.hasDiscount && v.priceWithDiscount);
    
    if (variantsWithDiscount.length === 0) return null;
    
    const total = variantsWithDiscount.reduce((sum, v) => sum + (v.priceWithDiscount || 0), 0);
    return Math.round(total / variantsWithDiscount.length);
  };

  // Renderizar estado de descuento
  const renderDiscountBadge = (product: MetaProductResponse) => {
    const discountCount = countVariantsWithDiscount(product);
    
    if (discountCount === 0) return null;
    
    const maxDiscount = getMaxDiscount(product);
    const avgPrice = getAverageDiscountedPrice(product);
    
    return (
      <div className={styles.discountBadge}>
        <span className={styles.discountIcon}>🔥</span>
        <span className={styles.discountText}>
          {discountCount} var. con descuento
          {maxDiscount > 0 && ` (hasta ${maxDiscount}% off)`}
        </span>
        {avgPrice && (
          <span className={styles.discountPrice}>
            ~${avgPrice.toLocaleString()} COP
          </span>
        )}
      </div>
    );
  };

  // ✅ Renderizar información de variante con descuento
  const renderVariantInfo = (variant: MetaVariantInfo) => {
    const hasDiscount = variant.hasDiscount && variant.discountPercentage && variant.discountPercentage > 0;
    
    return (
      <div key={variant.variantId} className={styles.variantItem}>
        <div className={styles.variantHeader}>
          <span className={styles.variantColor}>{variant.color}</span>
          <span className={styles.variantSize}>{variant.size}</span>
          {hasDiscount ? (
            <span className={styles.variantDiscountTag}>
              🔥 {variant.discountPercentage}% OFF
            </span>
          ) : null}
        </div>
        <div className={styles.variantDetails}>
          <span className={`${styles.variantStock} ${variant.stock > 0 ? styles.inStock : styles.outOfStock}`}>
            Stock: {variant.stock}
          </span>
          <span className={styles.variantPrice}>
            {hasDiscount ? (
              <>
                <span className={styles.originalPrice}>
                  ${variant.price?.toLocaleString() || '0'} COP
                </span>
                <span className={styles.discountedPrice}>
                  ${variant.priceWithDiscount?.toLocaleString() || '0'} COP
                </span>
              </>
            ) : (
              <span>${variant.price?.toLocaleString() || '0'} COP</span>
            )}
          </span>
          <span className={`${styles.variantStatus} ${variant.variantEnabledForMeta ? styles.statusEnabled : styles.statusDisabled}`}>
            {variant.variantEnabledForMeta ? '✅ META' : '❌'}
          </span>
        </div>
      </div>
    );
  };

  // ✅ Renderizar loading
  if (loading) return (
    <div className={styles.loadingState}>
      <div className={styles.spinner}></div>
      <p>Cargando dashboard META...</p>
      <p className={styles.loadingSubtext}>Obteniendo productos y estadísticas</p>
    </div>
  );
  
  // ✅ Renderizar error
  if (error) return (
    <div className={styles.errorAlert}>
      <div className={styles.errorContent}>
        <span className={styles.errorIcon}>⚠️</span>
        <div className={styles.errorText}>
          <strong>Error cargando datos META:</strong> {error}
        </div>
      </div>
      <div className={styles.errorActions}>
        <button onClick={loadMetaData} className={styles.retryButton}>
          <span className={styles.buttonIcon}>🔄</span>
          Reintentar
        </button>
        <button 
          onClick={() => navigateTo('/admin')}
          className={styles.backButton}
        >
          <span className={styles.buttonIcon}>←</span>
          Volver al Admin
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      {/* Barra de navegación */}
      <div className={styles.adminHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.adminTitle}>Panel de Administración META</h1>
          <div className={styles.headerMeta}>
            <span className={styles.pageBadge}>🚀 META COMMERCE</span>
            <span className={styles.productCount}>
              {totalElements} producto{totalElements !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/admin')}
          >
            🏠 Admin
          </button>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/perfil')}
          >
            👤 Perfil
          </button>
          <button 
            className={`${styles.navButton} ${styles.active}`}
            onClick={() => navigateTo('/meta')}
          >
            📱 META
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
        </div>
      </div>

      {/* Panel de control */}
      <div className={styles.controlPanel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>
            <span className={styles.panelIcon}>📱</span>
            Dashboard META Commerce
            <span className={styles.panelVersion}>V2</span>
          </h2>
          <div className={styles.panelSubtitle}>
            Gestiona tus productos para Facebook e Instagram Shopping
            <span className={styles.featureTag}>✅ Con soporte para descuentos por variante</span>
          </div>
        </div>
        
        <div className={styles.statsContainer}>
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <span className={styles.statIcon}>📦</span>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statNumber}>{stats?.totalProducts || 0}</span>
              <span className={styles.statLabel}>Productos Totales</span>
              <span className={styles.statSubtext}>En catálogo</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <span className={styles.statIcon}>🔢</span>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statNumber}>{stats?.totalVariants || 0}</span>
              <span className={styles.statLabel}>Total Variantes</span>
              <span className={styles.statSubtext}>Colores y tallas</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <span className={styles.statIcon}>✅</span>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statNumber}>{stats?.metaEnabledProducts || 0}</span>
              <span className={styles.statLabel}>Habilitados META</span>
              <span className={styles.statSubtext}>En feed</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <span className={styles.statIcon}>📤</span>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statNumber}>{stats?.eligibleForFeed || 0}</span>
              <span className={styles.statLabel}>Disponibles Feed</span>
              <span className={styles.statSubtext}>Con stock y habilitados</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <span className={styles.statIcon}>⛔</span>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statNumber}>{stats?.outOfStock || 0}</span>
              <span className={styles.statLabel}>Sin Stock</span>
              <span className={styles.statSubtext}>No disponibles</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <span className={styles.statIcon}>🚫</span>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statNumber}>{stats?.disabledProducts || 0}</span>
              <span className={styles.statLabel}>Deshabilitados</span>
              <span className={styles.statSubtext}>En sistema</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de acciones principales */}
      <div className={styles.actionBar}>
        <div className={styles.searchContainer}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="🔍 Buscar producto, SKU, color, talla..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
              onKeyDown={(e) => e.key === 'Enter' && loadMetaData()}
            />
            <button 
              onClick={() => setSearchTerm('')} 
              className={styles.clearSearchButton}
              style={{ visibility: searchTerm ? 'visible' : 'hidden' }}
            >
              ✕
            </button>
          </div>
          
          <div className={styles.filterControls}>
            <label className={styles.filterLabel}>
              <input
                type="checkbox"
                checked={showOnlyEnabled}
                onChange={(e) => setShowOnlyEnabled(e.target.checked)}
                className={styles.filterCheckbox}
              />
              <span className={styles.filterText}>Solo habilitados para META</span>
            </label>
            
            <label className={styles.filterLabel}>
              <input
                type="checkbox"
                className={styles.filterCheckbox}
                disabled
              />
              <span className={styles.filterText}>Mostrar solo con descuento</span>
            </label>
          </div>
        </div>
        
        <div className={styles.actionButtons}>
          <button 
            onClick={loadMetaData} 
            className={`${styles.actionButton} ${styles.refreshButton}`}
            title="Actualizar datos"
          >
            <span className={styles.buttonIcon}>🔄</span>
            Actualizar
          </button>
          
          <button 
            onClick={migrateProducts} 
            className={`${styles.actionButton} ${styles.migrateButton}`}
            title="Crear metadata para productos sin configurar"
          >
            <span className={styles.buttonIcon}>⚡</span>
            Migrar Productos
          </button>
          
          <button 
            onClick={generateCSV} 
            className={`${styles.actionButton} ${styles.downloadButton}`}
            title="Descargar CSV para importar en META"
          >
            <span className={styles.buttonIcon}>📥</span>
            Descargar CSV
          </button>
          
          <button 
            onClick={generateFeed} 
            className={`${styles.actionButton} ${styles.generateButton}`}
            title="Generar feed en servidor"
          >
            <span className={styles.buttonIcon}>⚙️</span>
            Generar Feed
          </button>
        </div>
      </div>

      {/* Información del feed */}
      <div className={styles.feedInfo}>
        <div className={styles.feedInfoContent}>
          <span className={styles.feedInfoIcon}>ℹ️</span>
          <div className={styles.feedInfoText}>
            <strong>Feed META incluirá descuentos por variante:</strong> Las variantes con descuento mostrarán automáticamente 
            <code>sale_price</code> en el CSV. Se priorizan descuentos por variante sobre descuentos globales.
          </div>
        </div>
        <div className={styles.feedStats}>
          <span className={styles.feedStat}>
            📊 {filteredProducts.reduce((sum, p) => sum + countVariantsWithDiscount(p), 0)} variantes con descuento detectadas
          </span>
        </div>
      </div>

      {/* Paginación */}
      <div className={styles.paginationContainer}>
        <div className={styles.paginationInfo}>
          Página <strong>{currentPage + 1}</strong> de <strong>{totalPages}</strong> • 
          Mostrando <strong>{filteredProducts.length}</strong> de <strong>{totalElements}</strong> productos
        </div>
        <div className={styles.paginationButtons}>
          <button 
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className={styles.paginationButton}
            title="Página anterior"
          >
            <span className={styles.buttonIcon}>←</span>
            Anterior
          </button>
          
          <div className={styles.pageNumbers}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (currentPage < 3) {
                pageNum = i;
              } else if (currentPage > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`${styles.pageNumber} ${currentPage === pageNum ? styles.pageNumberActive : ''}`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
          </div>
          
          <button 
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage >= totalPages - 1}
            className={styles.paginationButton}
            title="Página siguiente"
          >
            Siguiente
            <span className={styles.buttonIcon}>→</span>
          </button>
        </div>
      </div>

      {/* Tabla de productos */}
      <div className={styles.productsTableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>
            <span className={styles.tableIcon}>📋</span>
            Catálogo META ({filteredProducts.length} productos)
          </h3>
          <div className={styles.tableStats}>
            <span className={styles.tableStat}>
              <span className={styles.statValue}>
                {filteredProducts.filter(p => p.enabledForMeta).length}
              </span> habilitados
            </span>
            <span className={styles.tableStat}>
              <span className={styles.statValue}>
                {filteredProducts.reduce((sum, p) => sum + countVariantsWithDiscount(p), 0)}
              </span> variantes con descuento
            </span>
          </div>
        </div>
        
        <div className={styles.tableWrapper}>
          {filteredProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📦</div>
              <h4 className={styles.emptyTitle}>No hay productos que coincidan</h4>
              <p className={styles.emptyText}>
                {searchTerm 
                  ? `No se encontraron productos para "${searchTerm}"`
                  : 'No hay productos configurados para META'}
              </p>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setShowOnlyEnabled(false);
                  setCurrentPage(0);
                }}
                className={styles.emptyButton}
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className={styles.productsGrid}>
              {filteredProducts.map(product => (
                <div 
                  key={product.productId} 
                  className={`${styles.productCard} ${!product.enabledForMeta ? styles.disabledCard : ''}`}
                >
                  {/* Header de la tarjeta */}
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitle}>
                      <h4 className={styles.productName}>
                        {product.productName}
                        {product.enabledForMeta && (
                          <span className={styles.metaBadge}>META</span>
                        )}
                      </h4>
                      <code className={styles.productSku}>{product.sku}</code>
                    </div>
                    
                    <div className={styles.cardActions}>
                      <button
                        onClick={() => toggleMetaEnabled(product.productId, !product.enabledForMeta)}
                        className={`${styles.toggleButton} ${product.enabledForMeta ? styles.toggleOn : styles.toggleOff}`}
                        title={product.enabledForMeta ? 'Desactivar de META' : 'Activar para META'}
                      >
                        {product.enabledForMeta ? '✅' : '❌'}
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowEditModal(true);
                        }}
                        className={styles.editButton}
                        title="Editar metadata"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                  
                  {/* Información del producto */}
                  <div className={styles.cardBody}>
                    {product.metaTitle && (
                      <div className={styles.metaTitle}>
                        <strong>Título META:</strong> {product.metaTitle}
                      </div>
                    )}
                    
                    <div className={styles.productDescription}>
                      {product.productDescription?.substring(0, 120)}...
                    </div>
                    
                    {/* Badge de descuento */}
                    {renderDiscountBadge(product)}
                    
                    {/* Estadísticas de variantes */}
                    <div className={styles.variantStats}>
                      <div className={styles.variantStat}>
                        <span className={styles.statIcon}>🔢</span>
                        <span className={styles.statValue}>{product.variants.length}</span>
                        <span className={styles.statLabel}>variantes</span>
                      </div>
                      
                      <div className={styles.variantStat}>
                        <span className={styles.statIcon}>📦</span>
                        <span className={styles.statValue}>
                          {product.variants.filter(v => v.stock > 0).length}
                        </span>
                        <span className={styles.statLabel}>con stock</span>
                      </div>
                      
                      <div className={styles.variantStat}>
                        <span className={styles.statIcon}>✅</span>
                        <span className={`${styles.statValue} ${
                          product.variants.filter(v => v.variantEnabledForMeta).length > 0 
                            ? styles.statPositive 
                            : styles.statNegative
                        }`}>
                          {product.variants.filter(v => v.variantEnabledForMeta).length}
                        </span>
                        <span className={styles.statLabel}>para feed</span>
                      </div>
                    </div>
                    
                    {/* Lista de variantes (acordeón) */}
                    <details className={styles.variantsDetails}>
                      <summary className={styles.variantsSummary}>
                        <span>Ver {product.variants.length} variante{product.variants.length !== 1 ? 's' : ''}</span>
                        <span className={styles.variantsCount}>
                          {product.variants.filter(v => v.hasDiscount).length > 0 && (
                            <span className={styles.discountCount}>
                              🔥 {product.variants.filter(v => v.hasDiscount).length} con descuento
                            </span>
                          )}
                        </span>
                      </summary>
                      
                      <div className={styles.variantsList}>
                        {product.variants.map(renderVariantInfo)}
                      </div>
                    </details>
                  </div>
                  
                  {/* Footer de la tarjeta */}
                  <div className={styles.cardFooter}>
                    <div className={styles.footerStatus}>
                      <span className={`${styles.statusBadge} ${product.enabledForMeta ? styles.statusEnabled : styles.statusDisabled}`}>
                        {product.enabledForMeta ? '✅ Activado para META' : '❌ No en META'}
                      </span>
                      
                      {product.variants.filter(v => v.variantEnabledForMeta).length > 0 ? (
                        <span className={styles.statusPositive}>
                          Aparecerá en feed con {product.variants.filter(v => v.variantEnabledForMeta).length} variante{product.variants.filter(v => v.variantEnabledForMeta).length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className={styles.statusNegative}>
                          Ninguna variante disponible para feed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Información importante */}
      <div className={styles.infoSection}>
        <h3 className={styles.infoTitle}>
          <span className={styles.infoIcon}>ℹ️</span>
          Información Importante - Feed META con Descuentos
        </h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <h4 className={styles.infoCardTitle}>🔥 Descuentos por Variante</h4>
            <ul className={styles.infoList}>
              <li>✅ Descuentos aplicados directamente a variantes</li>
              <li>✅ Prioridad sobre descuentos globales</li>
              <li>✅ Campo <code>sale_price</code> generado automáticamente</li>
              <li>✅ Fechas de oferta auto-generadas</li>
              <li>✅ Compatible con etiquetas de oferta META</li>
            </ul>
          </div>
          
          <div className={styles.infoCard}>
            <h4 className={styles.infoCardTitle}>📋 Requisitos Feed</h4>
            <ul className={styles.infoList}>
              <li><strong>Producto:</strong> Habilitado para META</li>
              <li><strong>Variante:</strong> Habilitada, con stock y descuento configurado</li>
              <li><strong>Precio:</strong> Regular y con descuento calculado</li>
              <li><strong>Stock:</strong> Mayor a 0 unidades</li>
              <li><strong>Imagen:</strong> Mínimo 500x500px</li>
            </ul>
          </div>
          
          <div className={styles.infoCard}>
            <h4 className={styles.infoCardTitle}>🚚 Configuración Envío</h4>
            <ul className={styles.infoList}>
              <li><strong>Formato:</strong> <code>País:Región:Servicio:PrecioMoneda</code></li>
              <li><strong>Ejemplo gratis:</strong> <code>CO::::0.0 COP</code></li>
              <li><strong>Ejemplo estándar:</strong> <code>CO::::12000.0 COP</code></li>
              <li><strong>Recomendado:</strong> 12000 COP para Colombia</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      {showEditModal && selectedProduct && (
        <EditMetaModal
          product={selectedProduct}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProduct(null);
          }}
          onSave={async (productId, data) => {
            const result = await updateProductMetadata(productId, data);
            if (result) {
              setShowEditModal(false);
              setSelectedProduct(null);
            }
            return result;
          }}
        />
      )}
    </div>
  );
};

// Modal de edición (versión simplificada pero funcional)
interface EditMetaModalProps {
  product: MetaProductResponse;
  onClose: () => void;
  onSave: (productId: number, data: any) => Promise<boolean>;
}

const EditMetaModal: React.FC<EditMetaModalProps> = ({ product, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    enabledForMeta: product.enabledForMeta,
    metaTitle: product.metaTitle || '',
    metaDescription: product.metaDescription || '',
    googleProductCategory: product.googleProductCategory || '',
    fbProductCategory: product.fbProductCategory || '',
    material: product.material || '',
    pattern: product.pattern || '',
    style: product.style || '',
    gtin: product.gtin || '',
    shipping: product.shipping || 'CO::::12000.0 COP',
    shippingWeight: product.shippingWeight || '',
    salePrice: product.salePrice || '', // Descuento global
    salePriceStartDate: product.salePriceStartDate || '',
    salePriceEndDate: product.salePriceEndDate || '',
    videoUrl: product.videoUrl || '',
    videoTag: product.videoTag || '',
    customLabels: product.customLabels || '',
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      // Validar datos
      if (formData.metaTitle && formData.metaTitle.length > 150) {
        throw new Error('El título no puede exceder 150 caracteres');
      }
      
      const success = await onSave(product.productId, {
        ...formData,
        shippingWeight: formData.shippingWeight ? parseFloat(formData.shippingWeight as string) : null,
        salePrice: formData.salePrice ? parseFloat(formData.salePrice as string) : null,
      });
      
      if (!success) {
        throw new Error('No se pudo guardar');
      }
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>✏️ Editar: {product.productName}</h3>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        
        <div className={styles.modalBody}>
          {error && (
            <div className={styles.errorBanner}>{error}</div>
          )}
          
          <div className={styles.productInfo}>
            <p><strong>SKU:</strong> {product.sku}</p>
            <p><strong>Variantes:</strong> {product.variants.length} ({countVariantsWithDiscount(product)} con descuento)</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className={styles.formSection}>
              <h4>Estado META</h4>
              <label>
                <input
                  type="checkbox"
                  checked={formData.enabledForMeta}
                  onChange={(e) => setFormData({...formData, enabledForMeta: e.target.checked})}
                />
                Habilitar para META Commerce
              </label>
            </div>
            
            <div className={styles.formSection}>
              <h4>Información Básica</h4>
              
              <div className={styles.formGroup}>
                <label>Título META *</label>
                <input
                  type="text"
                  value={formData.metaTitle}
                  onChange={(e) => setFormData({...formData, metaTitle: e.target.value})}
                  placeholder="Título optimizado para META"
                  required
                  maxLength={150}
                />
                <div className={styles.charCount}>{formData.metaTitle.length}/150</div>
              </div>
              
              <div className={styles.formGroup}>
                <label>Descripción META</label>
                <textarea
                  value={formData.metaDescription}
                  onChange={(e) => setFormData({...formData, metaDescription: e.target.value})}
                  placeholder="Descripción para META"
                  rows={3}
                  maxLength={500}
                />
                <div className={styles.charCount}>{formData.metaDescription.length}/500</div>
              </div>
            </div>
            
            <div className={styles.formSection}>
              <h4>Configuración de Envío</h4>
              
              <div className={styles.formGroup}>
                <label>Shipping (Formato META)</label>
                <input
                  type="text"
                  value={formData.shipping}
                  onChange={(e) => setFormData({...formData, shipping: e.target.value})}
                  placeholder="CO::::12000.0 COP"
                  className={styles.codeInput}
                />
                <div className={styles.helpText}>
                  Formato: País:Región:Servicio:PrecioMoneda. Ej: CO::::12000.0 COP
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>Peso (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.shippingWeight}
                  onChange={(e) => setFormData({...formData, shippingWeight: e.target.value})}
                  placeholder="0.5"
                />
              </div>
            </div>
            
            <div className={styles.formSection}>
              <h4>Características del Producto</h4>
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Material</label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) => setFormData({...formData, material: e.target.value})}
                    placeholder="Algodón, Poliéster..."
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Patrón</label>
                  <input
                    type="text"
                    value={formData.pattern}
                    onChange={(e) => setFormData({...formData, pattern: e.target.value})}
                    placeholder="Sólido, Rayas..."
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Estilo</label>
                  <input
                    type="text"
                    value={formData.style}
                    onChange={(e) => setFormData({...formData, style: e.target.value})}
                    placeholder="Casual, Formal..."
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>GTIN (Código Barras)</label>
                  <input
                    type="text"
                    value={formData.gtin}
                    onChange={(e) => setFormData({...formData, gtin: e.target.value})}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>
            
            <div className={styles.formSection}>
              <h4>Categorías</h4>
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Categoría Google</label>
                  <input
                    type="text"
                    value={formData.googleProductCategory}
                    onChange={(e) => setFormData({...formData, googleProductCategory: e.target.value})}
                    placeholder="Apparel & Accessories > Clothing"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Categoría Facebook</label>
                  <input
                    type="text"
                    value={formData.fbProductCategory}
                    onChange={(e) => setFormData({...formData, fbProductCategory: e.target.value})}
                    placeholder="Clothing"
                  />
                </div>
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
                {saving ? 'Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ✅ Función auxiliar para contar variantes con descuento
function countVariantsWithDiscount(product: MetaProductResponse): number {
  return product.variants.filter(v => v.hasDiscount).length;
}

export default MetaDashboard;