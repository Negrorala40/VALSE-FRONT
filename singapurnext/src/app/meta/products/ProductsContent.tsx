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

export default function ProductsContent() {
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
          endpoint += 'available'; // Temporal - deberías crear un endpoint específico
          break;
        default:
          endpoint += 'available';
      }
      
      const res = await fetch(`${endpoint}?page=${page}&size=20`);
      const data = await res.json();
      setProducts(data);
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

  // Función para calcular si un producto está disponible para Meta
  const isAvailableForMeta = (product: Product) => {
    // Para que un producto esté disponible para Meta necesita:
    // 1. Estar habilitado para Facebook
    // 2. Tener al menos UNA variante con stock > 0
    
    // Calcular stock disponible (suma de variantes con stock)
    const availableStock = product.variants?.reduce((sum, v) => 
      v.availabilityStatus === 'in stock' ? sum + v.stock : sum, 0
    ) || 0;
    
    return product.enabledForFacebook && availableStock > 0;
  };

  if (loading) return <div className="p-4 text-center">Cargando productos...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">📦 Productos para Meta</h1>
        <div className="flex space-x-2 mb-6">
          <Link 
            href="/meta/products?filter=all"
            className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Todos
          </Link>
          <Link 
            href="/meta/products?filter=needs-setup"
            className={`px-4 py-2 rounded ${filter === 'needs-setup' ? 'bg-yellow-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            ⚙️ Por Configurar
          </Link>
          <Link 
            href="/meta/products?filter=available"
            className={`px-4 py-2 rounded ${filter === 'available' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            ✅ Disponibles
          </Link>
          <Link 
            href="/meta/products?filter=out-of-stock"
            className={`px-4 py-2 rounded ${filter === 'out-of-stock' ? 'bg-red-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            🚫 Sin Stock
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          // Calcular stock disponible para Meta (solo variantes con stock > 0)
          const availableStock = product.variants?.reduce((sum, v) => 
            v.availabilityStatus === 'in stock' ? sum + v.stock : sum, 0
          ) || 0;
          
          // Total de variantes con stock > 0
          const variantsWithStock = product.variants?.filter(v => v.stock > 0).length || 0;
          
          // Total de variantes sin stock
          const variantsWithoutStock = product.variants?.filter(v => v.stock === 0).length || 0;
          
          // ¿Está disponible para Meta?
          const availableForMeta = isAvailableForMeta(product);
          
          return (
            <div key={product.productId} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4">
                <h3 className="font-semibold text-lg mb-1">{product.productName}</h3>
                <div className="text-sm text-gray-500">ID: {product.productId}</div>
              </div>
              
              <div className="mb-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {product.needsMetaSetup && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">⚙️ Necesita configuración</span>
                  )}
                  
                  {/* Información de stock MUCHO MÁS CLARA */}
                  {availableForMeta ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      ✅ Stock para Meta: {availableStock} unidades
                      <small className="block text-xs">({variantsWithStock} variantes con stock)</small>
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                      ❌ {product.enabledForFacebook ? 'Sin stock' : 'Inactivo'}
                      {product.enabledForFacebook && variantsWithStock > 0 && 
                       <small className="block text-xs"> (pero {variantsWithStock} variantes tienen stock)</small>}
                    </span>
                  )}
                  
                  <span className={`px-2 py-1 text-xs rounded ${
                    product.enabledForFacebook ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {product.enabledForFacebook ? '🟢 Activo en Meta' : '⚫ Inactivo en Meta'}
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-2 mb-4">
                <Link 
                  href={`/meta/products/${product.productId}`}
                  className={`px-3 py-1 text-sm rounded ${
                    product.needsMetaSetup 
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {product.needsMetaSetup ? '⚙️ Configurar' : '✏️ Editar'}
                </Link>
                
                <button 
                  onClick={() => toggleProductForMeta(product.productId, product.enabledForFacebook)}
                  className={`px-3 py-1 text-sm rounded ${
                    product.enabledForFacebook 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {product.enabledForFacebook ? '❌ Deshabilitar' : '✅ Habilitar'}
                </button>
                
                <button 
                  onClick={async () => {
                    try {
                      await fetch(`/api/meta-admin/products/${product.productId}/sync-stock`, {
                        method: 'POST'
                      });
                      alert('Sincronización de stock iniciada');
                      // Recargar después de 2 segundos
                      setTimeout(fetchProducts, 2000);
                    } catch (error) {
                      alert('Error sincronizando stock');
                    }
                  }}
                  className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded"
                >
                  🔄 Sinc. Stock
                </button>
              </div>
              
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <strong>Estado E-commerce:</strong>
                  <span className={product.productEnabled ? 'text-green-600' : 'text-red-600'}>
                    {product.productEnabled ? '🟢 Habilitado' : '🔴 Deshabilitado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <strong>Configuración Meta:</strong>
                  <span className={product.needsMetaSetup ? 'text-yellow-600' : 'text-green-600'}>
                    {product.needsMetaSetup ? '⚠️ Incompleta' : '✅ Completa'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <strong>Variantes:</strong>
                  <span>
                    <span className="text-green-600">{variantsWithStock}</span> con stock, 
                    <span className="text-red-600"> {variantsWithoutStock}</span> sin stock
                  </span>
                </div>
                <div className="flex justify-between">
                  <strong>Disponible para Catálogo:</strong>
                  <span className={availableForMeta ? 'text-green-600' : 'text-red-600'}>
                    {availableForMeta ? '✅ Sí' : '❌ No'}
                  </span>
                </div>
                {!availableForMeta && (
                  <div className="text-xs text-gray-500">
                    {product.enabledForFacebook ? 
                      'Este producto está habilitado pero no tiene variantes con stock' : 
                      'Este producto está deshabilitado para Meta'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center space-x-4">
          <button 
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className={`px-4 py-2 rounded ${
              page === 0 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            ← Anterior
          </button>
          
          <span className="text-gray-700">
            Página {page + 1} de {totalPages}
          </span>
          
          <button 
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1}
            className={`px-4 py-2 rounded ${
              page >= totalPages - 1 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Siguiente →
          </button>
        </div>
      )}

      {products.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-xl font-semibold mb-2">No hay productos</h3>
          <p className="text-gray-600 mb-4">No se encontraron productos con el filtro seleccionado.</p>
          <Link 
            href="/meta/products?filter=all"
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Ver todos los productos
          </Link>
        </div>
      )}
    </div>
  );
}