'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ProductDetails {
  productId: number;
  productName: string;
  productDescription: string;
  productGender: string;
  productType: string;
  productEnabled: boolean;
  totalStock: number;
  needsMetaSetup: boolean;
  enabledForFacebook: boolean;
  
  // Campos Meta
  googleProductCategory: string;
  fbProductCategory: string;
  ageGroup: string;
  materialEnglish: string;
  patternEnglish: string;
  styleEnglish: string;
  brand: string;
  shippingDetails: string;
  shippingWeight: string;
  shippingWeightUnit: string;
  gtin: string;
  
  // Variantes
  variants: Array<{
    variantId: number;
    color: string;
    size: string;
    stock: number;
    price: number;
    colorEnglish: string;
    sizeStandard: string;
    availabilityStatus: string;
    primaryImageUrl: string;
  }>;
}

// Traducción de colores común
const COLOR_TRANSLATIONS: Record<string, string> = {
  'rojo': 'red',
  'azul': 'blue',
  'verde': 'green',
  'amarillo': 'yellow',
  'negro': 'black',
  'blanco': 'white',
  'rosa': 'pink',
  'morado': 'purple',
  'naranja': 'orange',
  'gris': 'gray',
  'marrón': 'brown',
  'beige': 'beige',
  'azul marino': 'navy blue',
  'verde oliva': 'olive green',
  'rojo vino': 'burgundy',
  'mostaza': 'mustard',
  'menta': 'mint',
  'coral': 'coral',
  'lavanda': 'lavender',
};

export default function ProductConfigPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedColor, setSelectedColor] = useState('');
  const [colorTranslation, setColorTranslation] = useState('');
  
  useEffect(() => {
    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/meta-admin/products/${params.id}`);
      const data = await res.json();
      setProduct(data);
    } catch (error) {
      console.error('Error cargando producto:', error);
      alert('❌ Error cargando producto');
    } finally {
      setLoading(false);
    }
  };

  const translateColor = (spanishColor: string) => {
    if (!spanishColor) return spanishColor;
    const lowerColor = spanishColor.toLowerCase();
    
    // Buscar traducción exacta
    if (COLOR_TRANSLATIONS[lowerColor]) {
      return COLOR_TRANSLATIONS[lowerColor];
    }
    
    // Buscar coincidencias parciales
    for (const [key, value] of Object.entries(COLOR_TRANSLATIONS)) {
      if (lowerColor.includes(key)) {
        return value;
      }
    }
    
    return spanishColor;
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setColorTranslation(translateColor(color));
  };

  const applyColorToAll = () => {
    if (!product || !colorTranslation) return;
    
    const updatedVariants = product.variants.map(variant => ({
      ...variant,
      colorEnglish: colorTranslation
    }));
    
    setProduct({
      ...product,
      variants: updatedVariants
    });
    
    alert(`✅ Color "${colorTranslation}" aplicado a todas las variantes`);
  };

  const updateVariantColor = (variantId: number, colorEnglish: string) => {
    if (!product) return;
    
    setProduct({
      ...product,
      variants: product.variants.map(v => 
        v.variantId === variantId ? { ...v, colorEnglish } : v
      )
    });
  };

  const saveConfig = async () => {
    if (!product) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/meta-admin/products/${product.productId}/meta-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleProductCategory: product.googleProductCategory,
          fbProductCategory: product.fbProductCategory,
          ageGroup: product.ageGroup,
          materialEnglish: product.materialEnglish,
          patternEnglish: product.patternEnglish,
          styleEnglish: product.styleEnglish,
          brand: product.brand,
          shippingDetails: product.shippingDetails,
          shippingWeight: product.shippingWeight,
          shippingWeightUnit: product.shippingWeightUnit,
          gtin: product.gtin,
          enabledForFacebook: product.enabledForFacebook,
        })
      });

      if (response.ok) {
        alert('✅ Configuración guardada exitosamente');
        fetchProduct(); // Recargar datos
      } else {
        throw new Error('Error guardando configuración');
      }
    } catch (error) {
      console.error('Error guardando configuración:', error);
      alert('❌ Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Cargando producto...</div>;
  if (!product) return <div>Producto no encontrado</div>;

  const availableVariants = product.variants.filter(v => v.stock > 0);
  const unavailableVariants = product.variants.filter(v => v.stock === 0);
  const uniqueColors = [...new Set(product.variants.map(v => v.color).filter(Boolean))];

  return (
    <div className="product-config-page">
      {/* Header */}
      <div className="config-header">
        <button onClick={() => router.push('/meta/products')} className="back-btn">
          ← Volver a Productos
        </button>
        <div className="header-content">
          <h1>⚙️ Configuración Meta: {product.productName}</h1>
          <div className="header-actions">
            <button 
              onClick={() => {
                fetch(`/api/meta-admin/products/${product.productId}/sync-stock`, { method: 'POST' });
                alert('🔄 Sincronización de stock iniciada');
              }}
              className="btn secondary"
            >
              🔄 Sincronizar Stock
            </button>
            <button 
              onClick={() => window.open(`/admin/products/${product.productId}`, '_blank')}
              className="btn secondary"
            >
              ✏️ Editar Producto
            </button>
          </div>
        </div>
      </div>

      <div className="config-grid">
        {/* Columna Izquierda: Datos Sincronizados */}
        <div className="config-column">
          <div className="info-card">
            <h2 className="card-title">✅ Datos Sincronizados Automáticamente</h2>
            
            <div className="info-grid">
              <div className="info-item">
                <label>Nombre del Producto</label>
                <p>{product.productName}</p>
              </div>
              
              <div className="info-item">
                <label>Stock Total</label>
                <p className={`stock-badge ${product.totalStock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                  {product.totalStock} unidades
                  <span className="stock-status">
                    ({product.totalStock > 0 ? 'Disponible para Meta' : 'Agotado'})
                  </span>
                </p>
              </div>
              
              <div className="info-item">
                <label>Género</label>
                <p>{product.productGender || 'No especificado'}</p>
              </div>
              
              <div className="info-item">
                <label>Tipo</label>
                <p>{product.productType || 'No especificado'}</p>
              </div>
              
              <div className="info-item full-width">
                <label>Descripción</label>
                <p className="description">{product.productDescription || 'Sin descripción'}</p>
              </div>
            </div>
          </div>

          {/* Variantes */}
          <div className="info-card">
            <h2 className="card-title">🎨 Variantes y Stock</h2>
            
            <div className="stock-summary">
              <div className="summary-item available">
                <div className="summary-count">{availableVariants.length}</div>
                <div className="summary-label">Disponibles</div>
              </div>
              <div className="summary-item low-stock">
                <div className="summary-count">
                  {availableVariants.filter(v => v.stock < 10).length}
                </div>
                <div className="summary-label">Bajo Stock</div>
              </div>
              <div className="summary-item out-of-stock">
                <div className="summary-count">{unavailableVariants.length}</div>
                <div className="summary-label">Agotadas</div>
              </div>
            </div>

            {/* Tabla de Variantes */}
            <div className="variants-table-container">
              <table className="variants-table">
                <thead>
                  <tr>
                    <th>Color</th>
                    <th>Talla</th>
                    <th>Stock</th>
                    <th>Precio</th>
                    <th>Color (Inglés)</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((variant) => (
                    <tr key={variant.variantId}>
                      <td>{variant.color}</td>
                      <td>{variant.size}</td>
                      <td>
                        <span className={`stock-cell ${variant.stock > 10 ? 'good' : variant.stock > 0 ? 'low' : 'out'}`}>
                          {variant.stock}
                        </span>
                      </td>
                      <td>${variant.price?.toFixed(2) || '0.00'}</td>
                      <td>
                        <input
                          type="text"
                          value={variant.colorEnglish || ''}
                          onChange={(e) => updateVariantColor(variant.variantId, e.target.value)}
                          className="color-input"
                          placeholder="Inglés..."
                        />
                      </td>
                      <td>
                        <span className={`status-badge ${variant.availabilityStatus === 'in stock' ? 'success' : 'danger'}`}>
                          {variant.availabilityStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Traductor de Colores */}
            {uniqueColors.length > 0 && (
              <div className="color-translator">
                <h3>🎨 Traductor de Colores</h3>
                <p className="translator-help">Colores encontrados en variantes:</p>
                
                <div className="color-buttons">
                  {uniqueColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorSelect(color)}
                      className={`color-btn ${selectedColor === color ? 'selected' : ''}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
                
                {selectedColor && colorTranslation && (
                  <div className="translation-result">
                    <p>
                      <strong>Traducción sugerida:</strong><br />
                      "{selectedColor}" → "{colorTranslation}"
                    </p>
                    <button onClick={applyColorToAll} className="btn primary">
                      Aplicar a Todas las Variantes
                    </button>
                    <p className="translation-note">
                      Esta traducción se aplicará a todas las variantes con el color "{selectedColor}"
                    </p>
                  </div>
                )}
                
                <p className="translator-tip">
                  💡 Los colores en inglés mejoran la búsqueda en Facebook/Instagram Shopping
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Configuración Meta */}
        <div className="config-column">
          <div className="config-card">
            <h2 className="card-title">⚙️ Configuración para Meta</h2>
            
            <div className="config-form">
              {/* Categorías (REQUERIDAS) */}
              <div className="form-group required">
                <label>Categoría Google *</label>
                <input
                  type="text"
                  value={product.googleProductCategory || ''}
                  onChange={(e) => setProduct({...product, googleProductCategory: e.target.value})}
                  placeholder="Ej: Apparel & Accessories > Clothing"
                  className="form-input"
                />
                <small className="form-help">Requerido por Meta</small>
              </div>
              
              <div className="form-group required">
                <label>Categoría Facebook *</label>
                <input
                  type="text"
                  value={product.fbProductCategory || ''}
                  onChange={(e) => setProduct({...product, fbProductCategory: e.target.value})}
                  placeholder="Ej: Clothing & Accessories > Clothing"
                  className="form-input"
                />
              </div>
              
              {/* Demografía */}
              <div className="form-row">
                <div className="form-group">
                  <label>Grupo de Edad</label>
                  <select
                    value={product.ageGroup || ''}
                    onChange={(e) => setProduct({...product, ageGroup: e.target.value})}
                    className="form-select"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="newborn">Recién nacido</option>
                    <option value="infant">Infante</option>
                    <option value="toddler">Niño pequeño</option>
                    <option value="kids">Niños</option>
                    <option value="teen">Adolescentes</option>
                    <option value="adult">Adulto</option>
                  </select>
                </div>
                
                <div className="form-group required">
                  <label>Material (Inglés) *</label>
                  <input
                    type="text"
                    value={product.materialEnglish || ''}
                    onChange={(e) => setProduct({...product, materialEnglish: e.target.value})}
                    placeholder="Ej: 100% cotton, polyester"
                    className="form-input"
                  />
                </div>
              </div>
              
              {/* Marca y Detalles */}
              <div className="form-group">
                <label>Marca</label>
                <input
                  type="text"
                  value={product.brand || 'Amarte Colombia'}
                  onChange={(e) => setProduct({...product, brand: e.target.value})}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Patrón</label>
                <input
                  type="text"
                  value={product.patternEnglish || ''}
                  onChange={(e) => setProduct({...product, patternEnglish: e.target.value})}
                  placeholder="Ej: plain, striped, floral"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Estilo</label>
                <input
                  type="text"
                  value={product.styleEnglish || ''}
                  onChange={(e) => setProduct({...product, styleEnglish: e.target.value})}
                  placeholder="Ej: casual, formal, sport"
                  className="form-input"
                />
              </div>
              
              {/* Envíos Colombia */}
              <div className="form-group">
                <label>Configuración de Envíos</label>
                <textarea
                  value={product.shippingDetails || ''}
                  onChange={(e) => setProduct({...product, shippingDetails: e.target.value})}
                  placeholder="CO:::Standard:0.0 COP;CO:Bogota:Express:5000.0 COP"
                  className="form-textarea"
                  rows={3}
                />
                <small className="form-help">
                  Formato: País:Región:Servicio:Precio<br />
                  Ejemplo: CO:::Standard:0.0 COP;CO:Bogota:Express:5000.0 COP
                </small>
              </div>
              
              {/* Peso */}
              <div className="form-row">
                <div className="form-group">
                  <label>Peso</label>
                  <input
                    type="text"
                    value={product.shippingWeight || ''}
                    onChange={(e) => setProduct({...product, shippingWeight: e.target.value})}
                    placeholder="0.5"
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Unidad</label>
                  <select
                    value={product.shippingWeightUnit || 'kg'}
                    onChange={(e) => setProduct({...product, shippingWeightUnit: e.target.value})}
                    className="form-select"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="lb">lb</option>
                  </select>
                </div>
              </div>
              
              {/* GTIN */}
              <div className="form-group">
                <label>GTIN (Código de barras)</label>
                <input
                  type="text"
                  value={product.gtin || ''}
                  onChange={(e) => setProduct({...product, gtin: e.target.value})}
                  placeholder="Ej: 8806088573892"
                  className="form-input"
                />
              </div>
              
              {/* Estado Meta */}
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  id="enabledForFacebook"
                  checked={product.enabledForFacebook}
                  onChange={(e) => setProduct({...product, enabledForFacebook: e.target.checked})}
                  className="checkbox-input"
                />
                <label htmlFor="enabledForFacebook">
                  Habilitado para Facebook/Instagram Shopping
                </label>
              </div>
              
              {/* Botón Guardar */}
              <div className="form-actions">
                <button 
                  onClick={saveConfig} 
                  disabled={saving}
                  className="btn save-btn"
                >
                  {saving ? '💾 Guardando...' : '💾 Guardar Configuración Meta'}
                </button>
                <p className="form-note">
                  * Campos requeridos para publicar en Meta
                </p>
              </div>
            </div>
          </div>
          
          {/* Vista Previa CSV */}
          <div className="preview-card">
            <h2 className="card-title">👁️ Vista Previa en CSV</h2>
            
            <div className="csv-preview">
              <div className="csv-header">
                <span>id</span>
                <span>title</span>
                <span>availability</span>
                <span>price</span>
                <span>quantity_to_sell_on_facebook</span>
              </div>
              
              {product.variants.slice(0, 3).map((variant) => (
                <div key={variant.variantId} className="csv-row">
                  <span>"V{variant.variantId}"</span>
                  <span>"{product.productName} - {variant.colorEnglish || variant.color}"</span>
                  <span>"{variant.availabilityStatus}"</span>
                  <span>"{variant.price?.toFixed(2)} COP"</span>
                  <span>{variant.stock > 0 ? variant.stock : ''}</span>
                </div>
              ))}
              
              {product.variants.length > 3 && (
                <div className="csv-more">
                  ... y {product.variants.length - 3} más
                </div>
              )}
            </div>
            
            <div className="preview-status">
              {product.totalStock > 0 ? (
                <div className="status-success">
                  ✅ Este producto aparecerá en el catálogo<br />
                  <small>{availableVariants.length} variantes disponibles</small>
                </div>
              ) : (
                <div className="status-danger">
                  ❌ Este producto NO aparecerá en el catálogo<br />
                  <small>Sin stock disponible</small>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}