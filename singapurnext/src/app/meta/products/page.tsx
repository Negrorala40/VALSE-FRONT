'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Product {
  productId: number;
  productName: string;
  productEnabled: boolean;
  needsMetaSetup: boolean;
  enabledForFacebook: boolean;
  totalStock: number;
  variants?: Array<{
    stock: number;
    availabilityStatus: string;
  }>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter') || 'all';

  useEffect(() => {
    fetchProducts();
  }, [page, filter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let endpoint = '/api/meta-admin/products/';
      
      switch (filter) {
        case 'needs-setup':
          endpoint += 'needs-setup';
          break;
        case 'available':
          endpoint += 'available';
          break;
        case 'out-of-stock':
          // Necesitaríamos un endpoint específico
          endpoint += 'available'; // Temporal
          break;
        default:
          endpoint += 'available';
      }
      
      const res = await fetch(`${endpoint}?page=${page}&size=20`);
      const data = await res.json();
      setProducts(data);
      // En un sistema real, tendrías información de paginación
      setTotalPages(Math.ceil(data.length / 20));
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProductForMeta = async (productId: number, currentStatus: boolean) => {
    if (confirm(`¿${currentStatus ? 'Deshabilitar' : 'Habilitar'} este producto para Meta?`)) {
      try {
        await fetch(`/api/meta-admin/products/${productId}/enable?enabled=${!currentStatus}`, {
          method: 'PATCH'
        });
        fetchProducts(); // Recargar lista
      } catch (error) {
        console.error('Error cambiando estado:', error);
        alert('❌ Error cambiando estado');
      }
    }
  };

  if (loading) return <div className="loading">Cargando productos...</div>;

  return (
    <div className="products-page">
      <div className="page-header">
        <h1>📦 Productos para Meta</h1>
        <div className="filter-tabs">
          <Link 
            href="/meta/products?filter=all" 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          >
            Todos
          </Link>
          <Link 
            href="/meta/products?filter=needs-setup" 
            className={`filter-tab ${filter === 'needs-setup' ? 'active' : ''}`}
          >
            ⚙️ Por Configurar
          </Link>
          <Link 
            href="/meta/products?filter=available" 
            className={`filter-tab ${filter === 'available' ? 'active' : ''}`}
          >
            ✅ Disponibles
          </Link>
          <Link 
            href="/meta/products?filter=out-of-stock" 
            className={`filter-tab ${filter === 'out-of-stock' ? 'active' : ''}`}
          >
            🚫 Sin Stock
          </Link>
        </div>
      </div>

      <div className="products-grid">
        {products.map((product) => {
          const availableStock = product.variants?.reduce((sum, v) => 
            v.availabilityStatus === 'in stock' ? sum + v.stock : sum, 0
          ) || 0;
          
          return (
            <div key={product.productId} className="product-card">
              <div className="product-header">
                <h3>{product.productName}</h3>
                <div className="product-id">ID: {product.productId}</div>
              </div>
              
              <div className="product-status">
                <div className="status-badges">
                  {product.needsMetaSetup && (
                    <span className="badge warning">⚙️ Necesita configuración</span>
                  )}
                  {availableStock > 0 ? (
                    <span className="badge success">✅ Stock: {availableStock}</span>
                  ) : (
                    <span className="badge danger">🚫 Sin stock</span>
                  )}
                  <span className={`badge ${product.enabledForFacebook ? 'success' : 'secondary'}`}>
                    {product.enabledForFacebook ? '🟢 Activo en Meta' : '⚫ Inactivo en Meta'}
                  </span>
                </div>
              </div>
              
              <div className="product-actions">
                <Link 
                  href={`/meta/products/${product.productId}`}
                  className="btn primary"
                >
                  {product.needsMetaSetup ? '⚙️ Configurar' : '✏️ Editar'}
                </Link>
                
                <button 
                  onClick={() => toggleProductForMeta(product.productId, product.enabledForFacebook)}
                  className={`btn ${product.enabledForFacebook ? 'danger' : 'success'}`}
                >
                  {product.enabledForFacebook ? '❌ Deshabilitar' : '✅ Habilitar'}
                </button>
                
                <button 
                  onClick={() => {
                    fetch(`/api/meta-admin/products/${product.productId}/sync-stock`, {
                      method: 'POST'
                    });
                    alert('Sincronización de stock iniciada');
                  }}
                  className="btn secondary"
                >
                  🔄 Sinc. Stock
                </button>
              </div>
              
              <div className="product-meta">
                <div className="meta-item">
                  <strong>Estado E-commerce:</strong>
                  <span className={product.productEnabled ? 'text-success' : 'text-danger'}>
                    {product.productEnabled ? '🟢 Habilitado' : '🔴 Deshabilitado'}
                  </span>
                </div>
                <div className="meta-item">
                  <strong>Configuración Meta:</strong>
                  <span className={product.needsMetaSetup ? 'text-warning' : 'text-success'}>
                    {product.needsMetaSetup ? '⚠️ Incompleta' : '✅ Completa'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="pagination-btn"
          >
            ← Anterior
          </button>
          
          <span className="pagination-info">
            Página {page + 1} de {totalPages}
          </span>
          
          <button 
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1}
            className="pagination-btn"
          >
            Siguiente →
          </button>
        </div>
      )}

      {products.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No hay productos</h3>
          <p>No se encontraron productos con el filtro seleccionado.</p>
          <Link href="/meta/products?filter=all" className="btn primary">
            Ver todos los productos
          </Link>
        </div>
      )}
    </div>
  );
}