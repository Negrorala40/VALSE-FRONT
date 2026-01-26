'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/app/utils/Api';
import styles from './meta.module.css';

// Tipos de datos ACTUALIZADOS para V2
interface MetaVariantInfo {
  variantId: number;
  sku: string;
  color: string;
  size: string;
  stock: number;
  price: number;
  enabled: boolean;
  variantEnabledForMeta: boolean;
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
  salePrice?: number;
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
  
  // Endpoints META V2 (CORREGIDOS)
  const META_PRODUCTS_V2 = `${API_BASE_URL}/api/meta/v2/products`;
  const META_STATS = `${API_BASE_URL}/api/meta/stats`;
  const META_CSV = `${API_BASE_URL}/api/meta/feed/csv`;
  const META_MIGRATE = `${API_BASE_URL}/api/meta/migrate`;
  const META_GENERATE = `${API_BASE_URL}/api/meta/feed/generate`;

  // Función para obtener headers con autenticación
  const getAuthHeaders = () => {
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

  // Cargar datos
  const loadMetaData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Cargar productos con paginación
      const productsResponse = await fetch(
        `${META_PRODUCTS_V2}?page=${currentPage}&size=20&sort=id,desc`, 
        {
          headers: getAuthHeaders(),
        }
      );
      
      if (!productsResponse.ok) {
        if (productsResponse.status === 401) {
          throw new Error('Debes iniciar sesión como administrador para acceder a esta sección');
        }
        throw new Error('Error cargando productos');
      }
      
      const productsData = await productsResponse.json();
      
      // Cargar estadísticas
      const statsResponse = await fetch(META_STATS, {
        headers: getAuthHeaders(),
      });
      
      let statsData = null;
      if (statsResponse.ok) {
        statsData = await statsResponse.json();
      } else if (statsResponse.status !== 401) {
        console.warn('No se pudieron cargar estadísticas');
      }
      
      setProducts(productsData.content || []);
      setTotalPages(productsData.totalPages || 1);
      setTotalElements(productsData.totalElements || 0);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Error cargando datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar productos localmente
  useEffect(() => {
    let filtered = products;
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.variants.some(v => v.color.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (showOnlyEnabled) {
      filtered = filtered.filter(p => p.enabledForMeta);
    }
    
    setFilteredProducts(filtered);
  }, [products, searchTerm, showOnlyEnabled]);

  // Toggle estado META por PRODUCTO
  const toggleMetaEnabled = async (productId: number, enabled: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/meta/v2/products/${productId}/enabled?enabled=${enabled}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      
      if (response.status === 401) {
        alert('Debes iniciar sesión como administrador para ejecutar esta acción');
        return;
      }
      
      if (response.ok) {
        // Actualizar estado local
        setProducts(prev => prev.map(p => 
          p.productId === productId ? { ...p, enabledForMeta: enabled } : p
        ));
        loadMetaData(); // Recargar estadísticas
      } else {
        throw new Error('Error actualizando estado');
      }
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      alert(err.message || 'Error actualizando estado');
    }
  };

  // Migrar productos existentes
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
      
      if (!response.ok) throw new Error('Error en migración');
      
      const result = await response.text();
      alert(result);
      loadMetaData();
    } catch (err: any) {
      alert('Error en migración: ' + err.message);
    }
  };

  // Generar CSV
  const generateCSV = async () => {
    try {
      const response = await fetch(META_CSV, {
        headers: getAuthHeaders(),
      });
      
      if (response.status === 401) {
        alert('Debes iniciar sesión como administrador para ejecutar esta acción');
        return;
      }
      
      if (!response.ok) throw new Error('Error generando CSV');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meta_product_feed.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Error descargando CSV: ' + err.message);
    }
  };

  // Generar feed manualmente
  const generateFeed = async () => {
    try {
      const response = await fetch(META_GENERATE, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
      if (response.status === 401) {
        alert('Debes iniciar sesión como administrador para ejecutar esta acción');
        return;
      }
      
      if (!response.ok) throw new Error('Error generando feed');
      
      const result = await response.text();
      alert(result);
    } catch (err: any) {
      alert('Error generando feed: ' + err.message);
    }
  };

  // Actualizar metadata del producto
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
      
      if (response.ok) {
        alert('Producto actualizado correctamente');
        loadMetaData();
        return true;
      } else {
        throw new Error('Error actualizando producto');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
      return false;
    }
  };

  // Contar variantes habilitadas para META
  const countEnabledVariants = (product: MetaProductResponse) => {
    return product.variants.filter(v => v.variantEnabledForMeta).length;
  };

  // Contar total de variantes
  const countTotalVariants = (product: MetaProductResponse) => {
    return product.variants.length;
  };

  // Contar variantes con stock
  const countVariantsWithStock = (product: MetaProductResponse) => {
    return product.variants.filter(v => v.stock > 0).length;
  };

  if (loading) return (
    <div className={styles.loadingState}>
      <div className={styles.spinner}></div>
      <p>Cargando dashboard META...</p>
    </div>
  );
  
  if (error) return (
    <div className={styles.errorAlert}>
      <div className={styles.errorContent}>
        <span className={styles.errorIcon}>⚠️</span>
        <div className={styles.errorText}>
          <strong>Error:</strong> {error}
        </div>
      </div>
      <button onClick={loadMetaData} className={styles.retryButton}>
        <span className={styles.buttonIcon}>🔄</span>
        Reintentar
      </button>
    </div>
  );

  return (
    <div className={styles.container}>
      {/* Barra de navegación */}
      <div className={styles.adminHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.adminTitle}>Panel de Administración</h1>
          <div className={styles.headerMeta}>
            <span className={styles.pageBadge}>META</span>
            <span className={styles.productCount}>{totalElements} productos</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/admin')}
          >
            Admin
          </button>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/perfil')}
          >
            Perfil
          </button>
          <button 
            className={`${styles.navButton} ${styles.active}`}
            onClick={() => navigateTo('/meta')}
          >
            META
          </button>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/orden')}
          >
            Órdenes
          </button>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/admin/blog')}
          >
            Blog
          </button>
        </div>
      </div>

      {/* Panel de control */}
      <div className={styles.controlPanel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>
            <span className={styles.panelIcon}>📱</span>
            Dashboard META Commerce
          </h2>
          <div className={styles.panelSubtitle}>
            Gestiona tus productos para Facebook e Instagram Shopping
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
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <span className={styles.statIcon}>🔢</span>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statNumber}>{stats?.totalVariants || 0}</span>
              <span className={styles.statLabel}>Total Variantes</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <span className={styles.statIcon}>✅</span>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statNumber}>{stats?.metaEnabledProducts || 0}</span>
              <span className={styles.statLabel}>Habilitados META</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <span className={styles.statIcon}>📤</span>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statNumber}>{stats?.eligibleForFeed || 0}</span>
              <span className={styles.statLabel}>Disponibles Feed</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <span className={styles.statIcon}>⛔</span>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statNumber}>{stats?.outOfStock || 0}</span>
              <span className={styles.statLabel}>Sin Stock</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <span className={styles.statIcon}>🚫</span>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statNumber}>{stats?.disabledProducts || 0}</span>
              <span className={styles.statLabel}>Deshabilitados</span>
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
              placeholder="Buscar producto, SKU o color..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <button className={styles.searchButton}>
              <span className={styles.buttonIcon}>🔍</span>
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
          </div>
        </div>
        
        <div className={styles.actionButtons}>
          <button onClick={loadMetaData} className={`${styles.actionButton} ${styles.refreshButton}`}>
            <span className={styles.buttonIcon}>🔄</span>
            Actualizar
          </button>
          <button onClick={migrateProducts} className={`${styles.actionButton} ${styles.migrateButton}`}>
            <span className={styles.buttonIcon}>⚡</span>
            Migrar Productos
          </button>
          <button onClick={generateCSV} className={`${styles.actionButton} ${styles.downloadButton}`}>
            <span className={styles.buttonIcon}>📥</span>
            Descargar CSV
          </button>
          <button onClick={generateFeed} className={`${styles.actionButton} ${styles.generateButton}`}>
            <span className={styles.buttonIcon}>⚙️</span>
            Generar Feed
          </button>
        </div>
      </div>

      {/* Paginación */}
      <div className={styles.paginationContainer}>
        <div className={styles.paginationInfo}>
          Mostrando página {currentPage + 1} de {totalPages} ({totalElements} productos totales)
        </div>
        <div className={styles.paginationButtons}>
          <button 
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className={styles.paginationButton}
          >
            <span className={styles.buttonIcon}>←</span>
            Anterior
          </button>
          <button 
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage >= totalPages - 1}
            className={styles.paginationButton}
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
            Productos en Catálogo META
          </h3>
          <div className={styles.tableStats}>
            <span className={styles.tableStat}>
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} mostrado{filteredProducts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        <div className={styles.tableWrapper}>
          <table className={styles.productsTable}>
            <thead>
              <tr>
                <th className={styles.tableHeaderCell}>SKU Base</th>
                <th className={styles.tableHeaderCell}>Producto</th>
                <th className={styles.tableHeaderCell}>Variantes</th>
                <th className={styles.tableHeaderCell}>Estado META</th>
                <th className={styles.tableHeaderCell}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>📦</span>
                      <p>No hay productos que coincidan con los filtros seleccionados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr 
                    key={product.productId} 
                    className={`${styles.tableRow} ${!product.enabledForMeta ? styles.disabledRow : ''}`}
                  >
                    <td className={styles.skuCell}>
                      <code className={styles.skuCode}>{product.sku}</code>
                      <div className={styles.skuInfo}>ID: {product.productId}</div>
                    </td>
                    
                    <td className={styles.productCell}>
                      <strong className={styles.productName}>{product.productName}</strong>
                      {product.metaTitle && (
                        <div className={styles.metaTitle}>{product.metaTitle}</div>
                      )}
                      <div className={styles.productDescription}>
                        {product.productDescription.substring(0, 100)}...
                      </div>
                    </td>
                    
                    <td className={styles.variantsCell}>
                      <div className={styles.variantStats}>
                        <div className={styles.variantStatItem}>
                          <span className={styles.statLabel}>Total:</span>
                          <span className={styles.statValue}>{countTotalVariants(product)}</span>
                        </div>
                        <div className={styles.variantStatItem}>
                          <span className={styles.statLabel}>Con stock:</span>
                          <span className={styles.statValue}>{countVariantsWithStock(product)}</span>
                        </div>
                        <div className={styles.variantStatItem}>
                          <span className={styles.statLabel}>Para META:</span>
                          <span className={`${styles.statValue} ${countEnabledVariants(product) > 0 ? styles.statPositive : styles.statNegative}`}>
                            {countEnabledVariants(product)}
                          </span>
                        </div>
                      </div>
                      
                      <details className={styles.variantsDetails}>
                        <summary className={styles.variantsSummary}>
                          Ver variantes ({product.variants.length})
                        </summary>
                        <div className={styles.variantsList}>
                          {product.variants.map(variant => (
                            <div key={variant.variantId} className={styles.variantItem}>
                              <span className={styles.variantColor}>{variant.color}</span>
                              <span className={styles.variantSize}>{variant.size}</span>
                              <span className={`${styles.variantStock} ${variant.stock > 0 ? styles.inStock : styles.outOfStock}`}>
                                Stock: {variant.stock}
                              </span>
                              <span className={`${styles.variantStatus} ${variant.variantEnabledForMeta ? styles.statusEnabled : styles.statusDisabled}`}>
                                {variant.variantEnabledForMeta ? '✅' : '❌'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </td>
                    
                    <td className={styles.statusCell}>
                      <div className={styles.statusContainer}>
                        <span className={`${styles.statusBadge} ${product.enabledForMeta ? styles.statusEnabled : styles.statusDisabled}`}>
                          {product.enabledForMeta ? '✅ Activado' : '❌ Desactivado'}
                        </span>
                        <div className={styles.statusDetails}>
                          {countEnabledVariants(product) > 0 ? (
                            <span className={styles.statusPositive}>
                              {countEnabledVariants(product)} variante(s) en feed
                            </span>
                          ) : (
                            <span className={styles.statusNegative}>
                              Ninguna variante en feed
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className={styles.actionsCell}>
                      <div className={styles.actionButtonsSmall}>
                        <button
                          onClick={() => toggleMetaEnabled(product.productId, !product.enabledForMeta)}
                          className={`${styles.actionButtonSmall} ${product.enabledForMeta ? styles.disableButton : styles.enableButton}`}
                        >
                          {product.enabledForMeta ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowEditModal(true);
                          }}
                          className={`${styles.actionButtonSmall} ${styles.editButton}`}
                        >
                          Editar Metadata
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Información importante */}
      <div className={styles.infoSection}>
        <h3 className={styles.infoTitle}>
          <span className={styles.infoIcon}>ℹ️</span>
          Información Importante sobre META Commerce
        </h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <h4 className={styles.infoCardTitle}>📋 Requisitos Feed META</h4>
            <ul className={styles.infoList}>
              <li>Producto habilitado para META</li>
              <li>Metadata correctamente configurada</li>
              <li>Variante habilitada para feed</li>
              <li>Stock disponible (mayor a 0)</li>
              <li>Precio configurado correctamente</li>
            </ul>
          </div>
          
          <div className={styles.infoCard}>
            <h4 className={styles.infoCardTitle}>🔧 Configuración Shipping</h4>
            <ul className={styles.infoList}>
              <li><strong>Formato:</strong> <code>País:Región:Servicio:PrecioMoneda</code></li>
              <li><strong>Ejemplo gratis:</strong> <code>CO::::0.0 COP</code></li>
              <li><strong>Ejemplo con costo:</strong> <code>CO:Medellin:Express:12000.0 COP</code></li>
              <li><strong>Recomendado:</strong> Usar 12000 COP como costo de envío estándar</li>
            </ul>
          </div>
          
          <div className={styles.infoCard}>
            <h4 className={styles.infoCardTitle}>📊 Formatos Exportación</h4>
            <ul className={styles.infoList}>
              <li><strong>CSV Feed:</strong> 27 campos específicos para META</li>
              <li><strong>URL Producto:</strong> https://www.tudominio.com/product?id=ID</li>
              <li><strong>SKU Base:</strong> {`MARTE-{ID_PRODUCTO}`}</li>
              <li><strong>Migración:</strong> Automática para productos sin metadata</li>
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
            return result;
          }}
        />
      )}
    </div>
  );
};

// Modal de edición con validación mejorada
interface EditMetaModalProps {
  product: MetaProductResponse;
  onClose: () => void;
  onSave: (productId: number, data: any) => Promise<boolean>;
}

const EditMetaModal: React.FC<EditMetaModalProps> = ({ product, onClose, onSave }) => {
  const [formData, setFormData] = useState<{
    enabledForMeta: boolean;
    metaTitle: string;
    metaDescription: string;
    googleProductCategory: string;
    fbProductCategory: string;
    material: string;
    pattern: string;
    style: string;
    gtin: string;
    shipping?: string;
    shippingWeight?: number;
    salePrice?: number;
    salePriceStartDate: string;
    salePriceEndDate: string;
    videoUrl: string;
    videoTag: string;
    customLabels: string;
  }>({
    enabledForMeta: product.enabledForMeta,
    metaTitle: product.metaTitle || '',
    metaDescription: product.metaDescription || '',
    googleProductCategory: product.googleProductCategory || '',
    fbProductCategory: product.fbProductCategory || '',
    material: product.material || '',
    pattern: product.pattern || '',
    style: product.style || '',
    gtin: product.gtin || '',
    shipping: product.shipping || '',
    shippingWeight: product.shippingWeight,
    salePrice: product.salePrice,
    salePriceStartDate: product.salePriceStartDate || '',
    salePriceEndDate: product.salePriceEndDate || '',
    videoUrl: product.videoUrl || '',
    videoTag: product.videoTag || '',
    customLabels: product.customLabels || '',
  });

  const [shippingCountry, setShippingCountry] = useState('CO');
  const [shippingRegion, setShippingRegion] = useState('');
  const [shippingService, setShippingService] = useState('Standard');
  const [shippingPrice, setShippingPrice] = useState('12000.0'); // VALOR POR DEFECTO 12000
  const [shippingCurrency, setShippingCurrency] = useState('COP');
  
  const [saving, setSaving] = useState(false);
  const [shippingError, setShippingError] = useState('');

  // Parsear shipping existente al cargar
  useEffect(() => {
    if (formData.shipping) {
      parseShippingString(formData.shipping);
    } else {
      // Si no hay shipping, usar valor por defecto
      setShippingPrice('12000.0');
    }
  }, []);

  const parseShippingString = (shippingStr: string) => {
    if (!shippingStr) return;
    
    const parts = shippingStr.split(':');
    
    if (parts.length >= 4) {
      setShippingCountry(parts[0] || 'CO');
      setShippingRegion(parts[1] || '');
      setShippingService(parts[2] || 'Standard');
      
      const priceCurrency = parts[3] || '0.0 COP';
      const priceMatch = priceCurrency.match(/(\d+\.?\d*)\s*([A-Z]{3})/);
      
      if (priceMatch) {
        setShippingPrice(priceMatch[1]);
        setShippingCurrency(priceMatch[2]);
      } else {
        setShippingPrice('12000.0');
        setShippingCurrency('COP');
      }
    }
  };

  const formatShippingString = () => {
    // Validar y limpiar el precio
    const cleanedPrice = shippingPrice.replace(/[^0-9.]/g, '');
    const priceNum = parseFloat(cleanedPrice);
    
    if (isNaN(priceNum) || priceNum < 0) {
      setShippingError('El precio debe ser un número válido mayor o igual a 0');
      return null;
    }
    
    const shippingFormatted = `${shippingCountry}:${shippingRegion}:${shippingService}:${priceNum.toFixed(1)} ${shippingCurrency}`;
    
    return shippingFormatted;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShippingError('');
    
    const formattedShipping = formatShippingString();
    if (!formattedShipping) {
      return;
    }
    
    setSaving(true);
    
    try {
      const dataToSend = {
        ...formData,
        shipping: formattedShipping
      };
      
      const success = await onSave(product.productId, dataToSend);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePriceChange = (value: string) => {
    // Solo permitir números y punto decimal
    const cleaned = value.replace(/[^0-9.]/g, '');
    // Evitar múltiples puntos decimales
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      setShippingPrice(parts[0] + '.' + parts.slice(1).join(''));
    } else {
      setShippingPrice(cleaned);
    }
    setShippingError('');
  };

  const shippingServices = [
    { value: 'Standard', label: 'Estándar (4-7 días)' },
    { value: 'Express', label: 'Express (1-3 días)' },
    { value: 'Free', label: 'Gratis' }
  ];

  const colombiaRegions = [
    { value: '', label: 'Todo el país' },
    { value: 'Medellin', label: 'Medellín' },
    { value: 'Bogota', label: 'Bogotá' },
    { value: 'Cali', label: 'Cali' },
    { value: 'Barranquilla', label: 'Barranquilla' }
  ];

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleContainer}>
            <h3 className={styles.modalTitle}>✏️ Editar Metadata META</h3>
            <div className={styles.modalSubtitle}>
              Producto: <strong>{product.productName}</strong> (ID: {product.productId})
            </div>
          </div>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.productSummary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>SKU Base:</span>
              <code className={styles.summaryValue}>{product.sku}</code>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Variantes:</span>
              <span className={styles.summaryValue}>
                {product.variants.length} total • {product.variants.filter(v => v.variantEnabledForMeta).length} para META
              </span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            {/* Sección: Estado META */}
            <div className={styles.formSection}>
              <h4 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>⚡</span>
                Estado META
              </h4>
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.enabledForMeta}
                    onChange={(e) => setFormData({...formData, enabledForMeta: e.target.checked})}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxText}>Habilitar producto para META Commerce</span>
                </label>
                <div className={styles.helpText}>
                  Si está desactivado, NINGUNA variante aparecerá en el feed META
                </div>
              </div>
            </div>

            {/* Sección: Información Básica */}
            <div className={styles.formSection}>
              <h4 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📝</span>
                Información Básica
              </h4>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>
                    Título META <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.metaTitle}
                    onChange={(e) => setFormData({...formData, metaTitle: e.target.value})}
                    className={styles.input}
                    placeholder="Título optimizado para META (150 caracteres máx)"
                    maxLength={150}
                    required
                  />
                  <div className={styles.charCount}>
                    {formData.metaTitle.length}/150 caracteres
                  </div>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Descripción META</label>
                  <textarea
                    value={formData.metaDescription}
                    onChange={(e) => setFormData({...formData, metaDescription: e.target.value})}
                    className={`${styles.input} ${styles.textarea}`}
                    placeholder="Descripción optimizada (5000 caracteres máx)"
                    rows={3}
                    maxLength={5000}
                  />
                  <div className={styles.charCount}>
                    {formData.metaDescription.length}/5000 caracteres
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Categorías */}
            <div className={styles.formSection}>
              <h4 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🏷️</span>
                Categorías
              </h4>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Categoría Google</label>
                  <input
                    type="text"
                    value={formData.googleProductCategory}
                    onChange={(e) => setFormData({...formData, googleProductCategory: e.target.value})}
                    className={styles.input}
                    placeholder="Apparel & Accessories > Clothing > Dresses"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Categoría Facebook</label>
                  <input
                    type="text"
                    value={formData.fbProductCategory}
                    onChange={(e) => setFormData({...formData, fbProductCategory: e.target.value})}
                    className={styles.input}
                    placeholder="Clothing"
                  />
                </div>
              </div>
            </div>

            {/* Sección: Envío */}
            <div className={styles.formSection}>
              <h4 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🚚</span>
                Configuración de Envío
                <span className={styles.sectionHelp}>
                  Formato: <code>País:Región:Servicio:PrecioMoneda</code>
                </span>
              </h4>
              
              <div className={styles.shippingGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>País</label>
                  <select
                    value={shippingCountry}
                    onChange={(e) => setShippingCountry(e.target.value)}
                    className={styles.select}
                  >
                    <option value="CO">Colombia</option>
                    <option value="US">Estados Unidos</option>
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Región (opcional)</label>
                  <select
                    value={shippingRegion}
                    onChange={(e) => setShippingRegion(e.target.value)}
                    className={styles.select}
                  >
                    {colombiaRegions.map(region => (
                      <option key={region.value} value={region.value}>
                        {region.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Servicio</label>
                  <select
                    value={shippingService}
                    onChange={(e) => setShippingService(e.target.value)}
                    className={styles.select}
                  >
                    {shippingServices.map(service => (
                      <option key={service.value} value={service.value}>
                        {service.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>
                    Precio Envío (COP) <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.priceInputGroup}>
                    <input
                      type="text"
                      value={shippingPrice}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      className={`${styles.input} ${styles.priceInput} ${shippingError ? styles.inputError : ''}`}
                      placeholder="12000.0"
                    />
                    <select
                      value={shippingCurrency}
                      onChange={(e) => setShippingCurrency(e.target.value)}
                      className={styles.currencySelect}
                    >
                      <option value="COP">COP</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  {shippingError && (
                    <div className={styles.errorMessage}>{shippingError}</div>
                  )}
                  <div className={styles.helpText}>
                    Recomendado: 12000 COP para envío estándar nacional
                  </div>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.inputLabel}>Vista Previa Formato META</label>
                <div className={styles.previewBox}>
                  <code className={styles.previewCode}>
                    {formatShippingString() || 'CO::::12000.0 COP'}
                  </code>
                  <div className={styles.previewHelp}>
                    Este formato se incluirá automáticamente en el feed META
                  </div>
                </div>
              </div>
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Peso (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.shippingWeight || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({
                        ...formData, 
                        shippingWeight: value === '' ? undefined : parseFloat(value)
                      });
                    }}
                    className={styles.input}
                    placeholder="0.5"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Precio Oferta</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.salePrice || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({
                        ...formData, 
                        salePrice: value === '' ? undefined : parseFloat(value)
                      });
                    }}
                    className={styles.input}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>

            {/* Sección: Características */}
            <div className={styles.formSection}>
              <h4 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🔍</span>
                Características del Producto
              </h4>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Material</label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) => setFormData({...formData, material: e.target.value})}
                    className={styles.input}
                    placeholder="Ej: Algodón 100%"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Patrón</label>
                  <input
                    type="text"
                    value={formData.pattern}
                    onChange={(e) => setFormData({...formData, pattern: e.target.value})}
                    className={styles.input}
                    placeholder="Ej: Sólido, Rayas, Flores"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Estilo</label>
                  <input
                    type="text"
                    value={formData.style}
                    onChange={(e) => setFormData({...formData, style: e.target.value})}
                    className={styles.input}
                    placeholder="Ej: Casual, Formal, Deportivo"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>GTIN</label>
                  <input
                    type="text"
                    value={formData.gtin}
                    onChange={(e) => setFormData({...formData, gtin: e.target.value})}
                    className={styles.input}
                    placeholder="Código de barras (opcional)"
                  />
                </div>
              </div>
            </div>

            {/* Botones de acción */}
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
                {saving ? (
                  <>
                    <span className={styles.spinner}></span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <span className={styles.buttonIcon}>💾</span>
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MetaDashboard;