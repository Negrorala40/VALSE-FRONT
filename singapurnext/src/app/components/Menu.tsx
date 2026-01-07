'use client';

import { MENU_PRODUCTS } from '../utils/Api';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Image from 'next/image';
import styles from '../menu/menu.module.css';

interface Img {
  id: number;
  fileName: string;
  imageUrl: string;
  width?: number;
  height?: number;
}

interface ProductVariant {
  id: number;
  color: string;
  size: string;
  stock: number;
  price?: number;
  images: Img[];
}

enum ProductGender {
  MUJER = 'MUJER',
  HOMBRE = 'HOMBRE',
  UNISEX = 'UNISEX'
}

enum ProductType {
  SUPERIOR = 'SUPERIOR',
  INFERIOR = 'INFERIOR',
  CALZADO = 'CALZADO'
}

interface Product {
  id: number;
  name: string;
  description: string;
  gender: ProductGender;
  type: ProductType;
  variants: ProductVariant[];
  createdAt?: string;
}

// Dimensiones de imagen base
const IMAGE_WIDTH = 854;
const IMAGE_HEIGHT = 1280;

// Helper para obtener colores hex aproximados
const getColorHex = (colorName: string): string => {
  const colors: Record<string, string> = {
    'azul': '#103359',
    'azul marino': '#0a1f33',
    'rosa': '#E9566D',
    'verde': '#3DB28A',
    'morado': '#806FF7',
    'negro': '#1a1a1a',
    'blanco': '#ffffff',
    'naranja': '#F47B47',
    'amarillo': '#FFD449',
    'rojo': '#E9566D',
    'celeste': '#87CEEB',
    'gris': '#808080',
    'beige': '#F5F5DC',
    'lila': '#C8A2C8',
    'turquesa': '#40E0D0',
    'coral': '#FF7F50',
    'violeta': '#EE82EE',
    'mostaza': '#FFDB58'
  };
  return colors[colorName.toLowerCase()] || '#103359';
};

const Menu: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const productRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [products, setProducts] = useState<Product[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortOption, setSortOption] = useState<string>('');
  const [visibleCards, setVisibleCards] = useState<boolean[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get<Product[]>(MENU_PRODUCTS);
        setProducts(response.data);
        setVisibleCards(new Array(response.data.length).fill(false));
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar los productos:', error);
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Intersection Observer para animaciones al hacer scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
            setVisibleCards(prev => {
              const newVisible = [...prev];
              newVisible[index] = true;
              return newVisible;
            });
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      }
    );

    productRefs.current.forEach((ref) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [visibleCount, products.length]);

  const searchQuery = searchParams.get('search') || '';
  const genderQuery = searchParams.get('gender') || '';
  const typeQuery = searchParams.get('type') || '';

  const filteredProducts = products.filter((product) => {
    const matchesGender = !genderQuery || product.gender.toLowerCase() === genderQuery.toLowerCase();
    const matchesType = !typeQuery || product.type.toLowerCase() === typeQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesGender && matchesType && matchesSearch;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aPrice = a.variants[0]?.price || 0;
    const bPrice = b.variants[0]?.price || 0;

    switch (sortOption) {
      case 'price-asc':
        return aPrice - bPrice;
      case 'price-desc':
        return bPrice - aPrice;
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      default:
        return 0;
    }
  });

  const handleProductClick = (productId: number) => {
    router.push(`/product?id=${productId}`);
  };

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 20);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value);
  };

  const setProductRef = (element: HTMLDivElement | null, index: number) => {
    if (element) {
      productRefs.current.set(index, element);
    } else {
      productRefs.current.delete(index);
    }
  };

  // Obtener colores únicos de un producto
  const getUniqueColors = (variants: ProductVariant[]) => {
    const colors = [...new Set(variants.map((v) => v.color))];
    return colors.slice(0, 4);
  };

  // Verificar si hay stock bajo
  const hasLowStock = (variants: ProductVariant[]) => {
    return variants.some((v) => v.stock > 0 && v.stock <= 3);
  };

  // Verificar si es nuevo (últimos 30 días)
  const isNew = (createdAt?: string) => {
    if (!createdAt) return false;
    const productDate = new Date(createdAt);
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return productDate >= thirtyDaysAgo;
  };

  // Función para manejar el clic en el botón de agregar rápido
  const handleQuickAddClick = (e: React.MouseEvent, productId: number) => {
    e.stopPropagation(); // Previene que se active el clic en la tarjeta
    // Aquí puedes implementar la lógica para agregar al carrito
    console.log('Agregar producto al carrito:', productId);
    // router.push(`/product?id=${productId}&quickAdd=true`);
  };

  if (loading) return (
    <div className={styles.menuContainer}>
      <div className={styles.loadingState}>
        <div className={styles.loadingSpinner}></div>
        <p className={styles.loadingText}>Cargando productos...</p>
      </div>
    </div>
  );

  return (
    <div className={styles.menuContainer}>
      {/* Header decorativo */}
      <div className={styles.menuHeader}>
        <div className={styles.headerDecoration}></div>
        <div className={styles.headerContent}>
          <div className={styles.headerTitleSection}>
            <span className={styles.headerIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <h1 className={styles.headerTitle}>Nuestra Colección</h1>
          </div>
          <p className={styles.headerSubtitle}>Pijamas que llevan a los pequeños a Marte</p>
        </div>
      </div>

      {/* Barra de filtros mejorada */}
      <div className={styles.filterBar}>
        <div className={styles.filterBarInner}>
          <div className={styles.resultsCount}>
            <span className={styles.resultsNumber}>{sortedProducts.length}</span>
            <span className={styles.resultsText}>productos</span>
          </div>

          <div className={styles.filterContainer}>
            <div className={styles.filterIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6H21M6 12H18M9 18H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <select id="sort" className={styles.filterSelect} value={sortOption} onChange={handleSortChange}>
              <option value="">Ordenar por</option>
              <option value="price-asc">Precio: Menor a mayor</option>
              <option value="price-desc">Precio: Mayor a menor</option>
              <option value="name-asc">Nombre: A-Z</option>
              <option value="name-desc">Nombre: Z-A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid de productos */}
      <div className={styles.productGrid}>
        {sortedProducts.slice(0, visibleCount).length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className={styles.emptyTitle}>No encontramos productos</h3>
            <p className={styles.emptyText}>Intenta con otros filtros de búsqueda</p>
          </div>
        ) : (
          sortedProducts.slice(0, visibleCount).map((product, index) => {
            // Obtener imagen principal
            const firstVariant = product.variants[0];
            const primaryImage = firstVariant?.images?.[0]?.imageUrl || '/images/placeholder.png';
            const price = product.variants.length > 0
              ? Math.min(...product.variants.map(v => Number(v.price || 0)))
              : 0;
            const colors = getUniqueColors(product.variants);

            return (
              <div
                key={`${product.id}-${index}`}
                ref={(el) => setProductRef(el, index)}
                data-index={index}
                className={`${styles.productCard} ${visibleCards[index] ? styles.visible : ''}`}
                onClick={() => handleProductClick(product.id)}
              >
                {/* Badges */}
                <div className={styles.productBadges}>
                  {isNew(product.createdAt) && <span className={`${styles.badge} ${styles.badgeNew}`}>Nuevo</span>}
                  {hasLowStock(product.variants) && <span className={`${styles.badge} ${styles.badgeLowStock}`}>Últimos</span>}
                </div>

                {/* Imagen con overlay */}
                <div className={styles.productImageContainer}>
                  <Image
                    src={primaryImage}
                    alt={product.name}
                    width={854}
                    height={1280}
                    className={styles.productImage}
                    priority={index < 6} // Priorizar carga de primeras imágenes
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/placeholder.png';
                    }}
                  />
                  <div className={styles.productOverlay}>
                    <span className={styles.overlayText}>Ver detalles</span>
                  </div>
                </div>

                {/* Detalles del producto */}
                <div className={styles.productDetails}>
                  <h3 className={styles.productName}>{product.name}</h3>

                  {/* Colores disponibles */}
                  {colors.length > 0 && (
                    <div className={styles.productColors}>
                      {colors.map((color, i) => (
                        <span
                          key={i}
                          className={styles.colorDot}
                          title={color}
                          style={{
                            backgroundColor: getColorHex(color),
                          }}
                        ></span>
                      ))}
                      {product.variants.length > 4 && (
                        <span className={styles.colorMore}>+{product.variants.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Precio */}
                  <div className={styles.productPriceContainer}>
                    <span className={styles.productPrice}>
                      {price > 0 ? `$${price.toLocaleString('es-CO')}` : 'Consultar'}
                    </span>
                  </div>
                </div>

                {/* Botón de acción rápida */}
                <button 
                  className={styles.quickAddBtn} 
                  aria-label="Agregar al carrito"
                  onClick={(e) => handleQuickAddClick(e, product.id)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Botón mostrar más */}
      {visibleCount < sortedProducts.length && (
        <button className={styles.viewAllButton} onClick={handleShowMore}>
          <span>Mostrar más productos</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M6 9L12 15L18 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Menu;