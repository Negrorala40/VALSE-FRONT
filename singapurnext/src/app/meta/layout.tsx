import React from 'react';
import './styles.css';

export const metadata = {
  title: 'Meta Catalog Admin - Amarte',
  description: 'Panel de administración para sincronización con Facebook/Instagram Shopping',
};

export default function MetaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="meta-admin-body">
        <nav className="meta-navbar">
          <div className="nav-container">
            <div className="nav-brand">
              <h1>🛍️ Meta Catalog Admin</h1>
              <span className="nav-subtitle">Amarte Colombia</span>
            </div>
            <div className="nav-links">
              <a href="/meta" className="nav-link">🏠 Dashboard</a>
              <a href="/meta/products" className="nav-link">📦 Productos</a>
              <a href="/meta/catalog" className="nav-link">📄 Catálogo</a>
              <a href="/admin" className="nav-link">← Volver a Admin</a>
            </div>
          </div>
        </nav>
        
        <div className="meta-container">
          <div className="sidebar">
            <div className="sidebar-section">
              <h3>📊 Sincronización</h3>
              <ul>
                <li><a href="/meta/products?filter=needs-setup">⚙️ Por Configurar</a></li>
                <li><a href="/meta/products?filter=available">✅ Disponibles</a></li>
                <li><a href="/meta/products?filter=out-of-stock">🚫 Sin Stock</a></li>
              </ul>
            </div>
            
            <div className="sidebar-section">
              <h3>⚡ Acciones Rápidas</h3>
              <button className="sidebar-btn" id="sync-all-btn">
                🔄 Sincronizar Todo
              </button>
              <button className="sidebar-btn" id="generate-csv-btn">
                📄 Generar CSV
              </button>
              <a href="/api/meta-catalog/catalog.csv" className="sidebar-btn" download>
                ⬇️ Descargar CSV
              </a>
            </div>
            
            <div className="sidebar-info">
              <h4>ℹ️ Información</h4>
              <p>El catálogo se actualiza automáticamente cada 5 minutos.</p>
              <p>URL para Facebook: <code>/api/meta-catalog/catalog.csv</code></p>
            </div>
          </div>
          
          <main className="main-content">
            {children}
          </main>
        </div>
        
        <footer className="meta-footer">
          <p>© {new Date().getFullYear()} Amarte Colombia - Sincronización Meta (Facebook/Instagram Shopping)</p>
          <p className="footer-note">Los cambios de stock se sincronizan en tiempo real</p>
        </footer>
        
        <script src="/meta-scripts.js" async></script>
      </body>
    </html>
  );
}