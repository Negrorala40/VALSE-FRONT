'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CatalogStats {
  totalProducts: number;
  totalVariants: number;
  lastGenerationTime: string;
  productsNeedingSetup: number;
  availableProducts: number;
  outOfStockProducts: number;
}

interface DiagnosticStatus {
  totalProducts: number;
  productsWithMeta: number;
  syncCoverage: number;
  needsSetup: number;
  totalVariants: number;
  variantsWithMeta: number;
  variantSyncCoverage: number;
  lastSyncTime: string;
  productsWithoutMetaCount: number;
  variantsWithoutMetaCount: number;
  timestamp: string;
  [key: string]: any;
}

export default function MetaDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [quickSyncing, setQuickSyncing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Función fetch con autenticación
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };
    
    return fetch(url, { 
      ...options, 
      headers,
      credentials: 'include' // Para cookies si las usas
    });
  };

  useEffect(() => {
    checkAuthAndLoadData();
    const interval = setInterval(checkAuthAndLoadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkAuthAndLoadData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAuthError('No autenticado');
      setLoading(false);
      return;
    }
    
    try {
      await fetchDashboardData();
      setAuthError(null);
    } catch (error) {
      console.error('Error de autenticación:', error);
      setAuthError('Error de autenticación. Por favor, inicia sesión nuevamente.');
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Diagnostic data
      const diagnosticRes = await fetchWithAuth('/api/meta-admin/diagnostic/status');
      
      if (diagnosticRes.status === 401 || diagnosticRes.status === 403) {
        throw new Error('No autorizado');
      }
      
      if (!diagnosticRes.ok) {
        throw new Error(`Error HTTP: ${diagnosticRes.status}`);
      }
      
      const diagnosticData = await diagnosticRes.json();
      setDiagnostic(diagnosticData);

      // Datos del catálogo
      const [catalogRes, needsSetupRes, availableRes] = await Promise.all([
        fetchWithAuth('/api/meta-admin/catalog/stats'),
        fetchWithAuth('/api/meta-admin/products/needs-setup?page=0&size=1'),
        fetchWithAuth('/api/meta-admin/products/available?page=0&size=1')
      ]);

      const catalogData = await catalogRes.json();
      const needsSetupData = await needsSetupRes.json();
      const availableData = await availableRes.json();

      setStats({
        ...catalogData,
        productsNeedingSetup: needsSetupData.length,
        availableProducts: availableData.length,
        outOfStockProducts: (diagnosticData?.productsWithMeta || 0) - availableData.length
      });
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      if (error instanceof Error && error.message.includes('No autorizado')) {
        setAuthError('Sesión expirada. Por favor, inicia sesión nuevamente.');
        // Redirigir al login después de 2 segundos
        setTimeout(() => router.push('/login'), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  // BOTÓN NUEVO: Sincronización Rápida (¡ESTE SÍ FUNCIONA!)
  const handleQuickSync = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('❌ Por favor, inicia sesión primero');
      router.push('/login');
      return;
    }

    if (confirm('¿Sincronizar rápidamente todos los productos con Meta?\n\nEsta acción creará metadatos básicos para todos los productos y variantes.')) {
      setQuickSyncing(true);
      try {
        const response = await fetchWithAuth('/api/meta-admin/products/quick-sync', {
          method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok) {
          alert(`✅ Sincronización rápida completada:\n\n- Productos procesados: ${result.productsWithMeta}\n- Metadatos creados: ${result.metaRecordsCreated}\n- Variantes procesadas: ${result.variantsWithMeta}\n- Metadatos de variantes creados: ${result.variantMetaCreated}`);
        } else {
          alert(`❌ Error: ${result.error || 'Error desconocido'}`);
        }
        
        setTimeout(() => fetchDashboardData(), 2000);
      } catch (error) {
        console.error('Error en sincronización rápida:', error);
        alert('❌ Error sincronizando. Verifica tu conexión.');
      } finally {
        setQuickSyncing(false);
      }
    }
  };

  // BOTÓN ORIGINAL mejorado
  const handleSyncAll = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('❌ Por favor, inicia sesión primero');
      router.push('/login');
      return;
    }

    setSyncing(true);
    try {
      const response = await fetchWithAuth('/api/meta-admin/products/sync-all', { 
        method: 'POST' 
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert(`✅ ${result.message}\n\nProductos procesados: ${result.productsProcessed}`);
      } else {
        alert(`❌ Error: ${result.error || 'Error desconocido'}`);
      }
      
      setTimeout(() => fetchDashboardData(), 3000);
    } catch (error) {
      console.error('Error sincronizando:', error);
      alert('❌ Error sincronizando');
    } finally {
      setSyncing(false);
    }
  };

  const handleRepairAll = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('❌ Por favor, inicia sesión primero');
      router.push('/login');
      return;
    }

    const productsWithoutMetaCount = diagnostic?.productsWithoutMetaCount || 0;
    const variantsWithoutMetaCount = diagnostic?.variantsWithoutMetaCount || 0;
    
    if (confirm(`¿Reparar todos los productos faltantes?\n\nEsta acción creará metadatos para:\n- ${productsWithoutMetaCount} productos sin metadatos\n- ${variantsWithoutMetaCount} variantes sin metadatos`)) {
      setRepairing(true);
      try {
        const response = await fetchWithAuth('/api/meta-admin/repair/sync-all-missing', { 
          method: 'POST' 
        });
        const result = await response.json();
        
        if (response.ok) {
          alert(`✅ Reparación completada:\n\n- Productos procesados: ${result.summary?.productsProcessed || 0}\n- Productos creados: ${result.summary?.productsCreated || 0}\n- Variantes procesadas: ${result.summary?.variantsProcessed || 0}\n- Errores: ${result.summary?.errors || 0}`);
        } else {
          alert(`❌ Error: ${result.error || 'Error desconocido'}`);
        }
        
        setTimeout(() => fetchDashboardData(), 3000);
      } catch (error) {
        console.error('Error reparando:', error);
        alert('❌ Error en reparación masiva');
      } finally {
        setRepairing(false);
      }
    }
  };

  const handleRegenerateCatalog = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('❌ Por favor, inicia sesión primero');
      router.push('/login');
      return;
    }

    if (confirm('¿Regenerar catálogo completo? Esto puede tomar unos minutos.')) {
      try {
        const response = await fetchWithAuth('/api/meta-admin/catalog/regenerate', { 
          method: 'POST' 
        });
        
        const result = await response.json();
        
        if (response.ok) {
          alert('✅ Catálogo regenerado. Se actualizará en Facebook en la próxima sincronización.');
        } else {
          alert(`❌ Error: ${result.error || 'Error desconocido'}`);
        }
        
        setTimeout(() => fetchDashboardData(), 5000);
      } catch (error) {
        console.error('Error regenerando catálogo:', error);
        alert('❌ Error regenerando catálogo');
      }
    }
  };

  const handleDownloadCatalog = () => {
    window.open('/api/meta-catalog/catalog.csv', '_blank');
  };

  const handleLoginRedirect = () => {
    router.push('/login');
  };

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Cargando dashboard Meta...</p>
    </div>
  );

  // Si hay error de autenticación
  if (authError) {
    return (
      <div className="auth-error-container">
        <div className="auth-error-card">
          <div className="auth-error-icon">🔒</div>
          <h2>Autenticación Requerida</h2>
          <p>{authError}</p>
          <button onClick={handleLoginRedirect} className="btn-login">
            🚀 Iniciar Sesión
          </button>
          <p className="auth-note">
            Necesitas permisos de administrador para acceder al dashboard Meta.
          </p>
        </div>
        <style jsx>{`
          .auth-error-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 80vh;
            padding: 20px;
          }
          .auth-error-card {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
            width: 100%;
          }
          .auth-error-icon {
            font-size: 4em;
            margin-bottom: 20px;
          }
          .btn-login {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 1.1em;
            cursor: pointer;
            margin-top: 20px;
            width: 100%;
          }
          .btn-login:hover {
            background: #0056b3;
          }
          .auth-note {
            margin-top: 20px;
            color: #666;
            font-size: 0.9em;
          }
        `}</style>
      </div>
    );
  }

  // Calcular porcentajes
  const syncPercentage = diagnostic?.syncCoverage || 0;
  const variantSyncPercentage = diagnostic?.variantSyncCoverage || 0;
  const productsWithoutMetaCount = diagnostic?.productsWithoutMetaCount || 0;
  const variantsWithoutMetaCount = diagnostic?.variantsWithoutMetaCount || 0;

  return (
    <div className="dashboard">
      {/* Barra superior con acciones */}
      <div className="dashboard-toolbar">
        <div className="toolbar-left">
          <h1>📊 Dashboard Meta Catalog</h1>
          <p className="subtitle">Monitoreo en tiempo real de sincronización con Facebook/Instagram Shopping</p>
        </div>
        <div className="toolbar-right">
          <button 
            onClick={handleQuickSync}
            disabled={quickSyncing || syncing || repairing}
            className="btn-toolbar btn-success"
            title="Sincronización rápida de todos los productos"
          >
            {quickSyncing ? '⚡ Sincronizando...' : '⚡ Sinc. Rápida'}
          </button>
          <button 
            onClick={handleSyncAll}
            disabled={syncing || quickSyncing || repairing}
            className="btn-toolbar btn-primary"
            title="Sincronizar productos que necesitan configuración"
          >
            {syncing ? '🔄 Sincronizando...' : '🔄 Sinc. Todo'}
          </button>
          <button 
            onClick={() => router.refresh()}
            className="btn-toolbar btn-secondary"
            title="Actualizar datos"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {diagnostic && (
        <div className="sync-alert">
          <div className={`alert ${syncPercentage < 50 ? 'alert-warning' : syncPercentage < 80 ? 'alert-info' : 'alert-success'}`}>
            <strong>Estado de sincronización: </strong>
            {syncPercentage < 50 ? (
              <span>⚠️ Crítico - Solo {syncPercentage.toFixed(1)}% de productos tienen metadatos</span>
            ) : syncPercentage < 80 ? (
              <span>⚠️ Parcial - {syncPercentage.toFixed(1)}% de productos sincronizados</span>
            ) : (
              <span>✅ Óptimo - {syncPercentage.toFixed(1)}% de productos sincronizados</span>
            )}
            {productsWithoutMetaCount > 0 && (
              <span className="alert-detail"> ({productsWithoutMetaCount} productos sin metadatos)</span>
            )}
          </div>
        </div>
      )}

      {/* Estadísticas Principales */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>Productos Totales</h3>
            <p className="stat-number">{diagnostic?.totalProducts || 0}</p>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${syncPercentage}%` }}
              ></div>
            </div>
            <p className="stat-desc">
              {diagnostic?.productsWithMeta || 0} con metadatos ({syncPercentage.toFixed(1)}%)
            </p>
          </div>
        </div>

        <div className="stat-card yellow">
          <div className="stat-icon">⚙️</div>
          <div className="stat-content">
            <h3>Por Configurar</h3>
            <p className="stat-number">{stats?.productsNeedingSetup || diagnostic?.needsSetup || 0}</p>
            <p className="stat-desc">Necesitan campos Meta</p>
            {productsWithoutMetaCount > 0 && (
              <small className="stat-warning">
                + {productsWithoutMetaCount} sin metadatos
              </small>
            )}
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Disponibles en Meta</h3>
            <p className="stat-number">{stats?.availableProducts || 0}</p>
            <p className="stat-desc">
              "in stock" si stock {'>'} 0, "out of stock" si stock = 0
            </p>
          </div>
        </div>

        <div className="stat-card red">
          <div className="stat-icon">🚫</div>
          <div className="stat-content">
            <h3>Problemas Detectados</h3>
            <p className="stat-number">
              {productsWithoutMetaCount + variantsWithoutMetaCount}
            </p>
            <p className="stat-desc">
              {productsWithoutMetaCount} productos, {variantsWithoutMetaCount} variantes
            </p>
          </div>
        </div>
      </div>

      {/* Acciones de Reparación */}
      {(productsWithoutMetaCount > 0 || variantsWithoutMetaCount > 0) && (
        <div className="repair-section">
          <h2>🔧 Problemas Detectados - Requiere Reparación</h2>
          <div className="repair-card warning">
            <div className="repair-content">
              <div className="repair-icon">⚠️</div>
              <div className="repair-details">
                <h3>Metadatos Faltantes</h3>
                <p>Se detectaron productos sin sincronización con Meta:</p>
                <ul className="repair-list">
                  <li><strong>{productsWithoutMetaCount} productos</strong> sin metadatos</li>
                  <li><strong>{variantsWithoutMetaCount} variantes</strong> sin metadatos</li>
                  <li>Sincronización: <strong>{syncPercentage.toFixed(1)}%</strong> completa</li>
                </ul>
                <div className="repair-actions">
                  <button 
                    onClick={handleRepairAll}
                    disabled={repairing || quickSyncing || syncing}
                    className="btn btn-warning"
                  >
                    {repairing ? '🔄 Reparando...' : '🔧 Reparar Todo'}
                  </button>
                  <button 
                    onClick={handleQuickSync}
                    disabled={quickSyncing || repairing || syncing}
                    className="btn btn-success"
                  >
                    {quickSyncing ? '⚡ Sincronizando...' : '⚡ Sinc. Rápida'}
                  </button>
                  <Link href="/meta/products?filter=all" className="btn btn-secondary">
                    📦 Ver Productos
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Acciones Rápidas */}
      <div className="quick-actions">
        <h2>⚡ Acciones Rápidas</h2>
        <div className="actions-grid">
          <Link href="/meta/products?filter=needs-setup" className="action-card">
            <div className="action-icon">⚙️</div>
            <div className="action-content">
              <h3>Configurar Productos</h3>
              <p>Completar campos Meta faltantes</p>
              <span className="action-count">{stats?.productsNeedingSetup || 0} productos</span>
            </div>
          </Link>

          <button 
            onClick={handleSyncAll}
            disabled={syncing || quickSyncing || repairing}
            className="action-card"
          >
            <div className="action-icon">🔄</div>
            <div className="action-content">
              <h3>{syncing ? 'Sincronizando...' : 'Sincronizar Todo'}</h3>
              <p>Actualizar stock y datos con Meta</p>
              <span className="action-note">
                Última sincronización: {
                  diagnostic?.lastSyncTime 
                    ? new Date(diagnostic.lastSyncTime).toLocaleString() 
                    : 'Nunca'
                }
              </span>
            </div>
          </button>

          <button 
            onClick={handleRegenerateCatalog}
            disabled={syncing || quickSyncing || repairing}
            className="action-card"
          >
            <div className="action-icon">📄</div>
            <div className="action-content">
              <h3>Regenerar CSV</h3>
              <p>Forzar actualización del catálogo</p>
              <span className="action-note">Se actualiza automáticamente cada 5 min</span>
            </div>
          </button>

          <button 
            onClick={handleDownloadCatalog} 
            className="action-card"
          >
            <div className="action-icon">⬇️</div>
            <div className="action-content">
              <h3>Descargar CSV</h3>
              <p>Catálogo actual para Facebook</p>
              <span className="action-note">Formato exacto Meta</span>
            </div>
          </button>
        </div>
      </div>

      {/* Información Detallada */}
      <div className="detailed-info">
        <div className="info-column">
          <h2>📋 Información del Catálogo</h2>
          <div className="info-card">
            <div className="info-row">
              <strong>URL del Catálogo:</strong>
              <div className="info-value">
                <code>/api/meta-catalog/catalog.csv</code>
                <button 
                  onClick={() => navigator.clipboard.writeText('/api/meta-catalog/catalog.csv')}
                  className="copy-btn"
                  title="Copiar URL"
                >
                  📋
                </button>
              </div>
            </div>
            <div className="info-row">
              <strong>Formato:</strong>
              <span>CSV UTF-8 (formato exacto Meta)</span>
            </div>
            <div className="info-row">
              <strong>Actualización:</strong>
              <span>Automática cada 5 minutos</span>
            </div>
            <div className="info-row">
              <strong>Última generación:</strong>
              <span>{stats?.lastGenerationTime ? new Date(stats.lastGenerationTime).toLocaleString() : 'Nunca'}</span>
            </div>
            <div className="info-row">
              <strong>Variantes disponibles:</strong>
              <span>{stats?.totalVariants || 0} variantes con stock</span>
            </div>
          </div>
        </div>

        <div className="info-column">
          <h2>🔄 Estado de Sincronización</h2>
          <div className="status-card">
            <div className="status-item">
              <span className={`status-indicator ${syncPercentage > 80 ? 'active' : 'inactive'}`}></span>
              <div>
                <strong>Metadatos de Productos</strong>
                <p>{syncPercentage.toFixed(1)}% completo ({diagnostic?.productsWithMeta || 0}/{diagnostic?.totalProducts || 0})</p>
              </div>
            </div>
            <div className="status-item">
              <span className={`status-indicator ${variantSyncPercentage > 80 ? 'active' : 'inactive'}`}></span>
              <div>
                <strong>Metadatos de Variantes</strong>
                <p>{variantSyncPercentage.toFixed(1)}% completo ({diagnostic?.variantsWithMeta || 0}/{diagnostic?.totalVariants || 0})</p>
              </div>
            </div>
            <div className="status-item">
<span className={`status-indicator ${(stats?.availableProducts || 0) > 0 ? 'active' : 'inactive'}`}></span>              <div>
                <strong>Productos Disponibles</strong>
                <p>{stats?.availableProducts || 0} productos listos para Meta</p>
              </div>
            </div>
            <div className="status-item">
              <span className="status-indicator active"></span>
              <div>
                <strong>Traducción automática</strong>
                <p>Colores traducidos español → inglés</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instrucciones Facebook */}
      <div className="instructions">
        <h3>📝 Instrucciones para Facebook:</h3>
        <ol>
          <li>En <strong>Facebook Commerce Manager</strong>, ve a "Catálogos"</li>
          <li>Selecciona tu catálogo o crea uno nuevo</li>
          <li>En "Fuentes", agrega una nueva fuente "URL"</li>
          <li>Pega esta URL: <code>https://amarte.com/api/meta-catalog/catalog.csv</code></li>
          <li>Programa actualización cada 5 minutos</li>
          <li>Configura moneda: <strong>COP (Peso colombiano)</strong></li>
          <li>Zona horaria: <strong>America/Bogota</strong></li>
        </ol>
        <div className="instructions-note">
          <strong>💡 Nota:</strong> Los productos aparecerán en Facebook después de la próxima sincronización programada (máximo 5 minutos).
        </div>
      </div>

      {/* Estilos */}
      <style jsx>{`
        .dashboard {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .dashboard-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 20px;
        }
        
        .toolbar-left {
          flex: 1;
          min-width: 300px;
        }
        
        .toolbar-right {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .btn-toolbar {
          padding: 10px 20px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          white-space: nowrap;
        }
        
        .btn-toolbar.btn-success {
          background: #28a745;
          color: white;
        }
        
        .btn-toolbar.btn-success:hover:not(:disabled) {
          background: #218838;
        }
        
        .btn-toolbar.btn-primary {
          background: #007bff;
          color: white;
        }
        
        .btn-toolbar.btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }
        
        .btn-toolbar.btn-secondary {
          background: #6c757d;
          color: white;
        }
        
        .btn-toolbar.btn-secondary:hover {
          background: #5a6268;
        }
        
        .btn-toolbar:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .sync-alert {
          margin-bottom: 30px;
        }
        
        .alert {
          padding: 15px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .alert-warning {
          background: #fff3cd;
          border: 1px solid #ffc107;
          color: #856404;
        }
        
        .alert-info {
          background: #d1ecf1;
          border: 1px solid #bee5eb;
          color: #0c5460;
        }
        
        .alert-success {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
        }
        
        .alert-detail {
          font-size: 0.9em;
          opacity: 0.8;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .stat-card {
          padding: 20px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 15px;
          transition: transform 0.2s;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
        }
        
        .stat-card.green {
          background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
          border: 1px solid #c3e6cb;
        }
        
        .stat-card.yellow {
          background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
          border: 1px solid #ffeaa7;
        }
        
        .stat-card.blue {
          background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%);
          border: 1px solid #bee5eb;
        }
        
        .stat-card.red {
          background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
          border: 1px solid #f5c6cb;
        }
        
        .stat-icon {
          font-size: 2.5em;
          flex-shrink: 0;
        }
        
        .stat-number {
          font-size: 2em;
          font-weight: bold;
          margin: 5px 0;
        }
        
        .stat-desc {
          color: #666;
          font-size: 0.9em;
          line-height: 1.4;
        }
        
        .stat-warning {
          display: block;
          color: #dc3545;
          font-size: 0.8em;
          margin-top: 5px;
        }
        
        .progress-bar {
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          margin: 10px 0;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: #28a745;
          transition: width 0.3s ease;
        }
        
        .repair-section {
          margin-bottom: 30px;
        }
        
        .repair-card {
          padding: 25px;
          border-radius: 12px;
          margin-top: 10px;
        }
        
        .repair-card.warning {
          background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
          border: 2px solid #ffc107;
        }
        
        .repair-content {
          display: flex;
          align-items: flex-start;
          gap: 25px;
        }
        
        .repair-icon {
          font-size: 3em;
          flex-shrink: 0;
        }
        
        .repair-details {
          flex: 1;
        }
        
        .repair-list {
          margin: 15px 0;
          padding-left: 20px;
        }
        
        .repair-list li {
          margin-bottom: 8px;
        }
        
        .repair-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          flex-wrap: wrap;
        }
        
        .btn {
          padding: 10px 20px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .btn-warning {
          background: #ffc107;
          color: #000;
        }
        
        .btn-warning:hover:not(:disabled) {
          background: #e0a800;
        }
        
        .btn-success {
          background: #28a745;
          color: white;
        }
        
        .btn-success:hover:not(:disabled) {
          background: #218838;
        }
        
        .btn-secondary {
          background: #6c757d;
          color: white;
        }
        
        .btn-secondary:hover {
          background: #5a6268;
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .quick-actions {
          margin-bottom: 30px;
        }
        
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-top: 15px;
        }
        
        .action-card {
          padding: 25px;
          border-radius: 12px;
          background: white;
          border: 2px solid #e9ecef;
          cursor: pointer;
          transition: all 0.3s;
          text-align: left;
          text-decoration: none;
          color: inherit;
          display: block;
        }
        
        .action-card:hover:not(:disabled) {
          border-color: #007bff;
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(0,0,0,0.1);
        }
        
        .action-card:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f8f9fa;
        }
        
        .action-icon {
          font-size: 2.5em;
          margin-bottom: 15px;
        }
        
        .action-content h3 {
          margin: 0 0 10px 0;
          font-size: 1.2em;
        }
        
        .action-content p {
          color: #666;
          margin: 0 0 10px 0;
          font-size: 0.95em;
          line-height: 1.5;
        }
        
        .action-count {
          display: inline-block;
          background: #007bff;
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 0.85em;
          font-weight: 600;
        }
        
        .action-note {
          display: block;
          color: #666;
          font-size: 0.85em;
          margin-top: 10px;
          font-style: italic;
        }
        
        .detailed-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 30px;
          margin-bottom: 30px;
        }
        
        .info-card, .status-card {
          background: white;
          padding: 25px;
          border-radius: 12px;
          border: 1px solid #e9ecef;
          margin-top: 15px;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #eee;
        }
        
        .info-row:last-child {
          border-bottom: none;
        }
        
        .info-value {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .copy-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9em;
        }
        
        .copy-btn:hover {
          background: #5a6268;
        }
        
        .status-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px 0;
          border-bottom: 1px solid #eee;
        }
        
        .status-item:last-child {
          border-bottom: none;
        }
        
        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .status-indicator.active {
          background: #28a745;
        }
        
        .status-indicator.inactive {
          background: #dc3545;
        }
        
        .instructions {
          background: #f8f9fa;
          padding: 30px;
          border-radius: 12px;
          border-left: 4px solid #007bff;
        }
        
        .instructions h3 {
          margin-top: 0;
          margin-bottom: 20px;
        }
        
        .instructions ol {
          padding-left: 25px;
          line-height: 1.8;
          margin-bottom: 20px;
        }
        
        .instructions ol li {
          margin-bottom: 10px;
        }
        
        .instructions-note {
          background: #e7f3ff;
          padding: 15px;
          border-radius: 8px;
          border-left: 3px solid #007bff;
          margin-top: 20px;
        }
        
        code {
          background: #e9ecef;
          padding: 3px 8px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }
        
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .dashboard-toolbar {
            flex-direction: column;
          }
          
          .toolbar-right {
            width: 100%;
            justify-content: center;
          }
          
          .btn-toolbar {
            flex: 1;
            min-width: 120px;
          }
          
          .detailed-info {
            grid-template-columns: 1fr;
          }
          
          .repair-content {
            flex-direction: column;
            gap: 15px;
          }
          
          .repair-actions {
            flex-direction: column;
          }
          
          .repair-actions .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}