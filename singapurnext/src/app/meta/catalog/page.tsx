'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CatalogInfo {
  catalogUrl: string;
  lastUpdated: string;
  totalProducts: number;
  totalVariants: number;
  format: string;
  updatedEvery: string;
}

interface CSVPreview {
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
}

export default function CatalogPage() {
  const [catalogInfo, setCatalogInfo] = useState<CatalogInfo | null>(null);
  const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  useEffect(() => {
    fetchCatalogData();
  }, []);

  const fetchCatalogData = async () => {
    setLoading(true);
    try {
      // Obtener información del catálogo
      const infoRes = await fetch('/api/meta-catalog/info');
      const infoData = await infoRes.json();
      setCatalogInfo(infoData);

      // Obtener vista previa del CSV
      const previewRes = await fetch('/api/meta-catalog/catalog.csv?preview=true');
      const csvText = await previewRes.text();
      
      // Parsear CSV para vista previa
      const lines = csvText.split('\n').filter(line => line && !line.startsWith('#'));
      if (lines.length > 0) {
        const headers = lines[0].split(',');
        const sampleRows = lines.slice(1, 6).map(line => line.split(','));
        
        setCsvPreview({
          headers,
          sampleRows,
          totalRows: lines.length - 1
        });
      }
    } catch (error) {
      console.error('Error cargando catálogo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/meta-admin/catalog/regenerate', { method: 'POST' });
      alert('✅ Catálogo regenerado exitosamente');
      fetchCatalogData();
    } catch (error) {
      console.error('Error regenerando catálogo:', error);
      alert('❌ Error regenerando catálogo');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopyUrl = () => {
    if (catalogInfo) {
      navigator.clipboard.writeText(catalogInfo.catalogUrl)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => {
          console.error('Error copiando URL:', err);
          alert('❌ Error copiando URL');
        });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Bogota'
    });
  };

  const downloadCatalog = () => {
    if (catalogInfo) {
      window.open(catalogInfo.catalogUrl, '_blank');
    }
  };

  if (loading) return <div className="loading">Cargando información del catálogo...</div>;

  return (
    <div className="catalog-page">
      {/* Header */}
      <div className="catalog-header">
        <div className="header-content">
          <h1>📄 Catálogo CSV para Meta</h1>
          <p className="subtitle">Archivo CSV generado automáticamente para Facebook/Instagram Shopping</p>
        </div>
        <div className="header-actions">
          <button 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="btn primary"
          >
            {refreshing ? '🔄 Regenerando...' : '🔄 Regenerar CSV'}
          </button>
          <button onClick={downloadCatalog} className="btn success">
            ⬇️ Descargar CSV
          </button>
          <Link href="/meta" className="btn secondary">
            ← Volver al Dashboard
          </Link>
        </div>
      </div>

      {/* Información Principal */}
      {catalogInfo && (
        <div className="catalog-stats">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <h3>Productos</h3>
                <p className="stat-number">{catalogInfo.totalProducts}</p>
                <p className="stat-desc">En catálogo</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🎨</div>
              <div className="stat-content">
                <h3>Variantes</h3>
                <p className="stat-number">{catalogInfo.totalVariants}</p>
                <p className="stat-desc">Con stock disponible</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🕒</div>
              <div className="stat-content">
                <h3>Última Actualización</h3>
                <p className="stat-number">{formatDate(catalogInfo.lastUpdated)}</p>
                <p className="stat-desc">{catalogInfo.updatedEvery}</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">📋</div>
              <div className="stat-content">
                <h3>Formato</h3>
                <p className="stat-number">{catalogInfo.format}</p>
                <p className="stat-desc">Compatible con Meta</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* URL del Catálogo */}
      <div className="url-section">
        <h2>🌐 URL del Catálogo</h2>
        <div className="url-card">
          <div className="url-display">
            <code>{catalogInfo?.catalogUrl || 'https://amarte.com/api/meta-catalog/catalog.csv'}</code>
            <div className="url-actions">
              <button 
                onClick={handleCopyUrl}
                className={`copy-btn ${copied ? 'copied' : ''}`}
              >
                {copied ? '✓ Copiado' : '📋 Copiar URL'}
              </button>
              <button 
                onClick={() => window.open(catalogInfo?.catalogUrl, '_blank')}
                className="test-btn"
              >
                🔗 Probar URL
              </button>
            </div>
          </div>
          
          <div className="url-instructions">
            <h4>📝 Instrucciones para Facebook Commerce Manager:</h4>
            <ol>
              <li>Ve a <strong>Facebook Commerce Manager</strong></li>
              <li>Selecciona tu catálogo o crea uno nuevo</li>
              <li>En la sección "Fuentes", haz clic en "Agregar artículos"</li>
              <li>Selecciona <strong>"Usar una fuente de datos"</strong> → <strong>"URL"</strong></li>
              <li>Pega la URL de arriba en el campo correspondiente</li>
              <li>Configura la frecuencia de actualización: <strong>Cada 5 minutos</strong></li>
              <li>Selecciona moneda: <strong>COP (Peso colombiano)</strong></li>
              <li>Configura zona horaria: <strong>America/Bogota</strong></li>
              <li>Guarda los cambios</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Vista Previa del CSV */}
      <div className="preview-section">
        <h2>👁️ Vista Previa del CSV</h2>
        <div className="preview-controls">
          <button 
            onClick={() => setShowFullPreview(!showFullPreview)}
            className="toggle-preview-btn"
          >
            {showFullPreview ? '📄 Mostrar menos' : '📄 Mostrar más filas'}
          </button>
          <span className="preview-info">
            Mostrando {csvPreview?.sampleRows.length || 0} de {csvPreview?.totalRows || 0} filas
          </span>
        </div>
        
        <div className="csv-preview-container">
          {csvPreview ? (
            <div className="csv-table">
              {/* Encabezados */}
              <div className="csv-header">
                {csvPreview.headers.map((header, index) => (
                  <div key={index} className="csv-cell header-cell">
                    {header}
                  </div>
                ))}
              </div>
              
              {/* Filas de datos */}
              {(showFullPreview ? csvPreview.sampleRows : csvPreview.sampleRows.slice(0, 3)).map((row, rowIndex) => (
                <div key={rowIndex} className="csv-row">
                  {row.map((cell, cellIndex) => (
                    <div key={cellIndex} className="csv-cell">
                      {cell.length > 50 ? `${cell.substring(0, 50)}...` : cell}
                    </div>
                  ))}
                </div>
              ))}
              
              {/* Mensaje de más filas */}
              {csvPreview.totalRows > csvPreview.sampleRows.length && !showFullPreview && (
                <div className="csv-more-rows">
                  <div className="csv-cell" style={{ gridColumn: `1 / span ${csvPreview.headers.length}` }}>
                    ... y {csvPreview.totalRows - csvPreview.sampleRows.length} filas más
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="no-preview">
              <p>No hay vista previa disponible</p>
            </div>
          )}
        </div>
        
        <div className="preview-notes">
          <h4>📋 Notas sobre el Formato:</h4>
          <ul>
            <li><strong>✅ Formato exacto de Meta:</strong> Campos en el orden y formato requerido</li>
            <li><strong>✅ Punto decimal:</strong> Precios en formato "45000.00 COP" (NO coma)</li>
            <li><strong>✅ Disponibilidad automática:</strong> "in stock" si stock {'>'} 0, "out of stock" si stock = 0</li>
            <li><strong>✅ Stock real:</strong> quantity_to_sell_on_facebook refleja stock actual</li>
            <li><strong>✅ Codificación UTF-8:</strong> Compatible con caracteres especiales</li>
            <li><strong>✅ Actualización automática:</strong> Se regenera cada 5 minutos o cuando cambia el stock</li>
          </ul>
        </div>
      </div>

      {/* Configuración de Campos */}
      <div className="fields-section">
        <h2>⚙️ Campos del CSV para Meta</h2>
        
        <div className="fields-grid">
          <div className="field-group">
            <h3>🟢 Campos Obligatorios</h3>
            <div className="field-list">
              <div className="field-item required">
                <strong>id</strong>
                <span>SKU único por variante (ej: "V123")</span>
              </div>
              <div className="field-item required">
                <strong>title</strong>
                <span>Nombre + color + talla (máx 200 caracteres)</span>
              </div>
              <div className="field-item required">
                <strong>description</strong>
                <span>Descripción del producto en inglés</span>
              </div>
              <div className="field-item required">
                <strong>availability</strong>
                <span>"in stock" o "out of stock" según stock real</span>
              </div>
              <div className="field-item required">
                <strong>condition</strong>
                <span>Siempre "new" para productos nuevos</span>
              </div>
              <div className="field-item required">
                <strong>price</strong>
                <span>Formato "45000.00 COP" con punto decimal</span>
              </div>
              <div className="field-item required">
                <strong>link</strong>
                <span>URL completa del producto en tu sitio</span>
              </div>
              <div className="field-item required">
                <strong>image_link</strong>
                <span>URL de imagen principal (500x500px mínimo)</span>
              </div>
              <div className="field-item required">
                <strong>brand</strong>
                <span>"Amarte Colombia" o marca específica</span>
              </div>
            </div>
          </div>
          
          <div className="field-group">
            <h3>🟡 Campos Recomendados</h3>
            <div className="field-list">
              <div className="field-item recommended">
                <strong>google_product_category</strong>
<span>Categoría Facebook (ej: "Clothing &amp; Accessories &gt; Clothing")</span>
              </div>
              <div className="field-item recommended">
                <strong>fb_product_category</strong>
<span>Categoría Google (ej: "Apparel &amp; Accessories &gt; Clothing")</span>
              </div>
              <div className="field-item recommended">
                <strong>quantity_to_sell_on_facebook</strong>
                <span>Stock actual (solo si {'>'} 0, sino no se incluye)</span>
              </div>
              <div className="field-item recommended">
                <strong>gender</strong>
                <span>"male", "female" o "unisex" (traducción automática)</span>
              </div>
              <div className="field-item recommended">
                <strong>color</strong>
                <span>Color en inglés (traducción automática)</span>
              </div>
              <div className="field-item recommended">
                <strong>size</strong>
                <span>Talla estandarizada</span>
              </div>
              <div className="field-item recommended">
                <strong>age_group</strong>
                <span>"adult", "teen", "kids", "toddler"</span>
              </div>
              <div className="field-item recommended">
                <strong>shipping</strong>
                <span>Configuración de envíos para Colombia</span>
              </div>
            </div>
          </div>
          
          <div className="field-group">
            <h3>🔵 Campos Opcionales</h3>
            <div className="field-list">
              <div className="field-item optional">
                <strong>sale_price</strong>
                <span>Precio de oferta (con punto decimal)</span>
              </div>
              <div className="field-item optional">
                <strong>sale_price_effective_date</strong>
                <span>Fecha de inicio/fin de oferta</span>
              </div>
              <div className="field-item optional">
                <strong>item_group_id</strong>
                <span>ID para agrupar variantes (ej: "P123")</span>
              </div>
              <div className="field-item optional">
                <strong>material</strong>
                <span>Material en inglés (ej: "100% cotton")</span>
              </div>
              <div className="field-item optional">
                <strong>pattern</strong>
                <span>Patrón (ej: "plain", "striped")</span>
              </div>
              <div className="field-item optional">
                <strong>shipping_weight</strong>
                <span>Peso para envío (ej: "0.5 kg")</span>
              </div>
              <div className="field-item optional">
                <strong>gtin</strong>
                <span>Código de barras (ej: "8806088573892")</span>
              </div>
              <div className="field-item optional">
                <strong>style[0]</strong>
                <span>Estilo (ej: "casual", "formal")</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración de Envíos Colombia */}
      <div className="shipping-section">
        <h2>🚚 Configuración de Envíos para Colombia</h2>
        <div className="shipping-card">
          <div className="shipping-example">
            <h4>📋 Ejemplo de Formato:</h4>
            <code>CO:::Standard:0.0 COP;CO:Bogota:Express:5000.0 COP</code>
          </div>
          
          <div className="shipping-explain">
            <h4>📝 Explicación del Formato:</h4>
            <div className="format-breakdown">
              <div className="format-part">
                <strong>País:</strong>
                <code>CO</code>
                <span>(Código ISO de Colombia)</span>
              </div>
              <div className="format-part">
                <strong>Región:</strong>
                <code>Bogota</code>
                <span>(Vacío para todo el país, nombre de ciudad para específico)</span>
              </div>
              <div className="format-part">
                <strong>Servicio:</strong>
                <code>Express</code>
                <span>(Standard, Express, Overnight, etc.)</span>
              </div>
              <div className="format-part">
                <strong>Precio:</strong>
                <code>5000.0 COP</code>
                <span>(Con punto decimal, sin comas, moneda COP)</span>
              </div>
            </div>
            
            <div className="format-separator">
              <strong>Separadores:</strong>
              <code>:</code> entre partes, <code>;</code> entre configuraciones
            </div>
          </div>
          
          <div className="shipping-examples">
            <h4>💡 Ejemplos Prácticos:</h4>
            <div className="example-list">
              <div className="example-item">
                <strong>Envío gratuito a todo Colombia:</strong>
                <code>CO:::Standard:0.0 COP</code>
              </div>
              <div className="example-item">
                <strong>Envío express a Bogotá ($5,000 COP):</strong>
                <code>CO:Bogota:Express:5000.0 COP</code>
              </div>
              <div className="example-item">
                <strong>Múltiples opciones:</strong>
                <code>CO:::Standard:0.0 COP;CO:Bogota:Express:5000.0 COP;CO:Medellin:Standard:3000.0 COP</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monitoreo y Estado */}
      <div className="monitoring-section">
        <h2>📊 Monitoreo del Catálogo</h2>
        <div className="monitoring-grid">
          <div className="monitor-card">
            <div className="monitor-icon">🔄</div>
            <div className="monitor-content">
              <h3>Actualización Automática</h3>
              <p>El CSV se regenera automáticamente cuando:</p>
              <ul>
                <li>Cambia el stock de un producto</li>
                <li>Se agrega/elimina un producto</li>
                <li>Programado cada 5 minutos</li>
                <li>Forzado manualmente desde el panel</li>
              </ul>
            </div>
          </div>
          
          <div className="monitor-card">
            <div className="monitor-icon">✅</div>
            <div className="monitor-content">
              <h3>Validaciones Automáticas</h3>
              <p>El sistema verifica automáticamente:</p>
              <ul>
                <li>Formato correcto de precios (punto decimal)</li>
                <li>Traducción de colores español → inglés</li>
                <li>Disponibilidad según stock real</li>
                <li>Campos requeridos completos</li>
                <li>URLs de imágenes válidas</li>
              </ul>
            </div>
          </div>
          
          <div className="monitor-card">
            <div className="monitor-icon">📈</div>
            <div className="monitor-content">
              <h3>Estadísticas en Tiempo Real</h3>
              <p>Monitoreo continuo:</p>
              <ul>
                <li>Productos sincronizados: {catalogInfo?.totalProducts || 0}</li>
                <li>Variantes disponibles: {catalogInfo?.totalVariants || 0}</li>
                <li>Última actualización: {formatDate(catalogInfo?.lastUpdated || '')}</li>
                <li>Próxima actualización: En 5 minutos</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer de la página */}
      <div className="catalog-footer">
        <div className="footer-actions">
          <button onClick={downloadCatalog} className="btn primary large">
            ⬇️ Descargar Catálogo Completo
          </button>
          <button onClick={handleRefresh} className="btn secondary large">
            🔄 Forzar Regeneración
          </button>
          <Link href="/meta/products" className="btn success large">
            ⚙️ Configurar Productos
          </Link>
        </div>
        
        <div className="footer-info">
          <p>
            <strong>URL para Facebook Commerce Manager:</strong><br />
            <code>{catalogInfo?.catalogUrl || 'https://amarte.com/api/meta-catalog/catalog.csv'}</code>
          </p>
          <p className="footer-note">
            Nota: Facebook tarda hasta 15 minutos en procesar cambios después de la actualización.
          </p>
        </div>
      </div>
    </div>
  );
}