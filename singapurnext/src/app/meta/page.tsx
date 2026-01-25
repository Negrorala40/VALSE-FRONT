'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/app/utils/Api';
import './meta.css';

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
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
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

  if (loading) return <div className="loading">Cargando...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="meta-container">
      {/* Header */}
      <header className="meta-header">
        <h1>📱 Dashboard META (Facebook/Instagram)</h1>
        <p>Administra tus productos para Facebook e Instagram Shopping</p>
      </header>

      {/* Estadísticas */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Productos</h3>
            <p className="stat-number">{stats.totalProducts}</p>
          </div>
          <div className="stat-card">
            <h3>Total Variantes</h3>
            <p className="stat-number">{stats.totalVariants}</p>
          </div>
          <div className="stat-card">
            <h3>Habilitados para META</h3>
            <p className="stat-number">{stats.metaEnabledProducts}</p>
          </div>
          <div className="stat-card">
            <h3>Disponibles para Feed</h3>
            <p className="stat-number">{stats.eligibleForFeed}</p>
            <small>(Con stock y habilitados)</small>
          </div>
          <div className="stat-card">
            <h3>Sin Stock</h3>
            <p className="stat-number">{stats.outOfStock}</p>
          </div>
          <div className="stat-card">
            <h3>Deshabilitados</h3>
            <p className="stat-number">{stats.disabledProducts}</p>
          </div>
        </div>
      )}

      {/* Barra de acciones */}
      <div className="action-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar por nombre, SKU o color..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="search-btn">🔍</button>
        </div>

        <div className="filter-controls">
          <label>
            <input
              type="checkbox"
              checked={showOnlyEnabled}
              onChange={(e) => setShowOnlyEnabled(e.target.checked)}
            />
            Solo habilitados para META
          </label>
        </div>

        <div className="action-buttons">
          <button onClick={loadMetaData} className="btn refresh">
            🔄 Actualizar
          </button>
          <button onClick={migrateProducts} className="btn migrate">
            ⚡ Migrar Productos
          </button>
          <button onClick={generateCSV} className="btn download">
            📥 Descargar CSV
          </button>
          <button onClick={generateFeed} className="btn generate">
            ⚙️ Generar Feed
          </button>
        </div>
      </div>

      {/* Paginación */}
      <div className="pagination">
        <button 
          onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
          disabled={currentPage === 0}
          className="btn-pagination"
        >
          ← Anterior
        </button>
        
        <span className="page-info">
          Página {currentPage + 1} de {totalPages} ({totalElements} productos)
        </span>
        
        <button 
          onClick={() => setCurrentPage(prev => prev + 1)}
          disabled={currentPage >= totalPages - 1}
          className="btn-pagination"
        >
          Siguiente →
        </button>
      </div>

      {/* Tabla de productos */}
      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>SKU Base</th>
              <th>Producto</th>
              <th>Variantes</th>
              <th>Habilitado META</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">
                  No hay productos que coincidan con los filtros
                </td>
              </tr>
            ) : (
              filteredProducts.map(product => (
                <tr key={product.productId} className={!product.enabledForMeta ? 'disabled-row' : ''}>
                  <td>
                    <code>{product.sku}</code>
                  </td>
                  <td>
                    <strong>{product.productName}</strong>
                    <div className="product-info">
                      <small>ID: {product.productId}</small>
                      {product.metaTitle && (
                        <div className="meta-title">{product.metaTitle}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="variants-info">
                      <div className="variant-stats">
                        <span className="stat-label">Total:</span>
                        <span className="stat-value">{countTotalVariants(product)}</span>
                        
                        <span className="stat-label">Con Stock:</span>
                        <span className="stat-value">{countVariantsWithStock(product)}</span>
                        
                        <span className="stat-label">Para META:</span>
                        <span className={`stat-value ${countEnabledVariants(product) > 0 ? 'positive' : 'negative'}`}>
                          {countEnabledVariants(product)}
                        </span>
                      </div>
                      
                      <details className="variants-details">
                        <summary>Ver variantes ({product.variants.length})</summary>
                        <div className="variants-list">
                          {product.variants.map(variant => (
                            <div key={variant.variantId} className="variant-item">
                              <span className="variant-color">{variant.color}</span>
                              <span className="variant-size">{variant.size}</span>
                              <span className={`variant-stock ${variant.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                                Stock: {variant.stock}
                              </span>
                              <span className={`variant-status ${variant.variantEnabledForMeta ? 'enabled' : 'disabled'}`}>
                                {variant.variantEnabledForMeta ? '✅' : '❌'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  </td>
                  <td>
                    <div className="status-container">
                      <span className={`status ${product.enabledForMeta ? 'enabled' : 'disabled'}`}>
                        {product.enabledForMeta ? '✅ Activado' : '❌ Desactivado'}
                      </span>
                      <div className="status-details">
                        {countEnabledVariants(product) > 0 ? (
                          <span className="positive">
                            {countEnabledVariants(product)} variante(s) en feed
                          </span>
                        ) : (
                          <span className="negative">
                            Ninguna variante en feed
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons-small">
                      <button
                        onClick={() => toggleMetaEnabled(product.productId, !product.enabledForMeta)}
                        className={`btn-sm ${product.enabledForMeta ? 'disable' : 'enable'}`}
                      >
                        {product.enabledForMeta ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowEditModal(true);
                        }}
                        className="btn-sm edit"
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

      {/* Footer info */}
      <div className="info-box">
        <h3>📋 Información sobre el Feed META</h3>
        <ul>
          <li><strong>CSV Generado:</strong> Archivo con 27 campos específicos para META</li>
          <li><strong>Requisitos para feed:</strong> Producto habilitado + Metadata habilitado + Variante habilitada + Stock &gt; 0</li>
          <li><strong>URL Producto:</strong> https://www.amartekids.com/product?id=ID_PRODUCTO</li>
          <li><strong>SKU Base:</strong> {`MARTE-{ID_PRODUCTO}`} (las variantes tienen SKU derivado)</li>
          <li><strong>Migración:</strong> Los productos sin metadata se pueden migrar automáticamente</li>
          <li><strong>Envío (shipping):</strong> Formato: <code>País:Región:Servicio:PrecioMoneda</code></li>
          <li><strong>Ejemplo Envío:</strong> <code>CO::::0.0 COP</code> (gratis) o <code>CO:Medellin:Express:12000.0 COP</code></li>
        </ul>
      </div>
    </div>
  );
};

// Modal de edición actualizado CON SHIPPING CORREGIDO
interface EditMetaModalProps {
  product: MetaProductResponse;
  onClose: () => void;
  onSave: (productId: number, data: any) => Promise<boolean>;
}

const EditMetaModal: React.FC<EditMetaModalProps> = ({ product, onClose, onSave }) => {
  // Estados para shipping formateado
  const [shippingCountry, setShippingCountry] = useState('CO');
  const [shippingRegion, setShippingRegion] = useState('');
  const [shippingService, setShippingService] = useState('Standard');
  const [shippingPrice, setShippingPrice] = useState('0.0');
  const [shippingCurrency, setShippingCurrency] = useState('COP');
  
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

  const [saving, setSaving] = useState(false);
  const [shippingError, setShippingError] = useState('');

  // Parsear shipping existente al cargar
  useEffect(() => {
    if (formData.shipping) {
      parseShippingString(formData.shipping);
    }
  }, []);

  const parseShippingString = (shippingStr: string) => {
    if (!shippingStr) return;
    
    // Formato esperado: CO:Medellin:Standard:12000.0 COP
    const parts = shippingStr.split(':');
    
    if (parts.length >= 4) {
      setShippingCountry(parts[0] || 'CO');
      setShippingRegion(parts[1] || '');
      setShippingService(parts[2] || 'Standard');
      
      // Extraer precio y moneda
      const priceCurrency = parts[3] || '0.0 COP';
      const priceMatch = priceCurrency.match(/(\d+\.?\d*)\s*([A-Z]{3})/);
      
      if (priceMatch) {
        setShippingPrice(priceMatch[1]);
        setShippingCurrency(priceMatch[2]);
      } else {
        setShippingPrice('0.0');
        setShippingCurrency('COP');
      }
    }
  };

  const formatShippingString = () => {
    // Validar precio
    const priceNum = parseFloat(shippingPrice);
    if (isNaN(priceNum)) {
      setShippingError('El precio debe ser un número válido');
      return null;
    }
    
    // Formato META: País:Región:Servicio:PrecioMoneda
    const regionPart = shippingRegion ? shippingRegion : ''; // Si está vacío, se deja vacío
    const shippingFormatted = `${shippingCountry}:${regionPart}:${shippingService}:${priceNum.toFixed(1)} ${shippingCurrency}`;
    
    return shippingFormatted;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShippingError('');
    
    // Validar y formatear shipping
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

  // Opciones de servicio de envío
  const shippingServices = [
    { value: 'Standard', label: 'Estándar (4-7 días)' },
    { value: 'Express', label: 'Express (1-3 días)' },
    { value: 'NextDay', label: 'Próximo día' },
    { value: 'Free', label: 'Gratis' }
  ];

  // Opciones de región para Colombia
  const colombiaRegions = [
    { value: '', label: 'Todo el país' },
    { value: 'Medellin', label: 'Medellín' },
    { value: 'Bogota', label: 'Bogotá' },
    { value: 'Cali', label: 'Cali' },
    { value: 'Barranquilla', label: 'Barranquilla' },
    { value: 'Cartagena', label: 'Cartagena' },
    { value: 'Pereira', label: 'Pereira' },
    { value: 'Manizales', label: 'Manizales' }
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>✏️ Editar Metadata para META</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <div className="modal-body">
          <div className="product-info-summary">
            <p><strong>Producto:</strong> {product.productName} (ID: {product.productId})</p>
            <p><strong>SKU Base:</strong> {product.sku}</p>
            <p><strong>Variantes:</strong> {product.variants.length} (Habilitadas para feed: {product.variants.filter(v => v.variantEnabledForMeta).length})</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Estado META</h3>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.enabledForMeta}
                    onChange={(e) => setFormData({...formData, enabledForMeta: e.target.checked})}
                  />
                  <span>Habilitar producto para META</span>
                </label>
                <small className="help-text">
                  Si está desactivado, NINGUNA variante aparecerá en el feed, aunque tengan stock.
                </small>
              </div>
            </div>
            
            <div className="form-section">
              <h3>Información Básica</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Título META *</label>
                  <input
                    type="text"
                    value={formData.metaTitle}
                    onChange={(e) => setFormData({...formData, metaTitle: e.target.value})}
                    placeholder="Título optimizado para META (máx 150 chars)"
                    maxLength={150}
                    required
                  />
                </div>
                
                <div className="form-group full-width">
                  <label>Descripción META</label>
                  <textarea
                    value={formData.metaDescription}
                    onChange={(e) => setFormData({...formData, metaDescription: e.target.value})}
                    placeholder="Descripción optimizada para META (máx 5000 chars)"
                    rows={3}
                    maxLength={5000}
                  />
                </div>
              </div>
            </div>
            
            <div className="form-section">
              <h3>Categorías</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Categoría Google</label>
                  <input
                    type="text"
                    value={formData.googleProductCategory}
                    onChange={(e) => setFormData({...formData, googleProductCategory: e.target.value})}
                    placeholder="Ej: Apparel & Accessories > Clothing > Dresses"
                  />
                </div>
                
                <div className="form-group">
                  <label>Categoría Facebook</label>
                  <input
                    type="text"
                    value={formData.fbProductCategory}
                    onChange={(e) => setFormData({...formData, fbProductCategory: e.target.value})}
                    placeholder="Ej: Clothing"
                  />
                </div>
              </div>
            </div>
            
            <div className="form-section">
              <h3>Características del Producto</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Material</label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) => setFormData({...formData, material: e.target.value})}
                    placeholder="Ej: Algodón 100%"
                  />
                </div>
                
                <div className="form-group">
                  <label>Patrón</label>
                  <input
                    type="text"
                    value={formData.pattern}
                    onChange={(e) => setFormData({...formData, pattern: e.target.value})}
                    placeholder="Ej: Rayas, Flores, Sólido"
                  />
                </div>
                
                <div className="form-group">
                  <label>Estilo</label>
                  <input
                    type="text"
                    value={formData.style}
                    onChange={(e) => setFormData({...formData, style: e.target.value})}
                    placeholder="Ej: Casual, Formal, Deportivo"
                  />
                </div>
                
                <div className="form-group">
                  <label>GTIN (Código Barras)</label>
                  <input
                    type="text"
                    value={formData.gtin}
                    onChange={(e) => setFormData({...formData, gtin: e.target.value})}
                    placeholder="Ej: 123456789012"
                  />
                </div>
              </div>
            </div>
            
            <div className="form-section">
              <h3>Envío y Precios</h3>
              <div className="form-grid shipping-grid">
                <div className="form-group">
                  <label>País Envío</label>
                  <select
                    value={shippingCountry}
                    onChange={(e) => setShippingCountry(e.target.value)}
                    className="shipping-select"
                  >
                    <option value="CO">Colombia</option>
                    <option value="US">Estados Unidos</option>
                    <option value="MX">México</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Región (opcional)</label>
                  <select
                    value={shippingRegion}
                    onChange={(e) => setShippingRegion(e.target.value)}
                    className="shipping-select"
                  >
                    {colombiaRegions.map(region => (
                      <option key={region.value} value={region.value}>
                        {region.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Servicio</label>
                  <select
                    value={shippingService}
                    onChange={(e) => setShippingService(e.target.value)}
                    className="shipping-select"
                  >
                    {shippingServices.map(service => (
                      <option key={service.value} value={service.value}>
                        {service.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Precio Envío</label>
                  <div className="price-input-group">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={shippingPrice}
                      onChange={(e) => setShippingPrice(e.target.value)}
                      placeholder="0.0"
                      className={`price-input ${shippingError ? 'error' : ''}`}
                    />
                    <select
                      value={shippingCurrency}
                      onChange={(e) => setShippingCurrency(e.target.value)}
                      className="currency-select"
                    >
                      <option value="COP">COP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  {shippingError && (
                    <div className="error-message">{shippingError}</div>
                  )}
                  <small className="help-text">
                    Usa 0.0 para envío gratis. Ejemplo: 12000.0 COP
                  </small>
                </div>
                
                <div className="form-group full-width">
                  <label>Formato Shipping META</label>
                  <div className="shipping-preview">
                    <code>
                      {formatShippingString() || 'CO::::0.0 COP'}
                    </code>
                    <small className="help-text">
                      Formato: <strong>País:Región:Servicio:PrecioMoneda</strong><br/>
                      Ejemplos: <code>CO::::0.0 COP</code> (gratis nacional) o <code>CO:Medellin:Express:12000.0 COP</code>
                    </small>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Peso Envío (kg)</label>
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
                    placeholder="0.5"
                  />
                </div>
                
                <div className="form-group">
                  <label>Precio Oferta</label>
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
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>
            
            <div className="form-section">
              <h3>Multimedia y Etiquetas</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>URL Video</label>
                  <input
                    type="url"
                    value={formData.videoUrl || ''}
                    onChange={(e) => setFormData({...formData, videoUrl: e.target.value})}
                    placeholder="https://..."
                  />
                </div>
                
                <div className="form-group">
                  <label>Etiqueta Video</label>
                  <input
                    type="text"
                    value={formData.videoTag || ''}
                    onChange={(e) => setFormData({...formData, videoTag: e.target.value})}
                    placeholder="Ej: Tutorial, Unboxing"
                  />
                </div>
                
                <div className="form-group full-width">
                  <label>Etiquetas Personalizadas</label>
                  <input
                    type="text"
                    value={formData.customLabels || ''}
                    onChange={(e) => setFormData({...formData, customLabels: e.target.value})}
                    placeholder="Etiquetas separadas por coma (máx 10)"
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn cancel">
                Cancelar
              </button>
              <button type="submit" className="btn save" disabled={saving}>
                {saving ? 'Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MetaDashboard;