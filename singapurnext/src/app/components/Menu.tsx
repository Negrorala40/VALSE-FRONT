'use client';

import { MENU_PRODUCTS } from '../utils/Api';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Image from 'next/image';
import styles from '../menu/menu.module.css';
import { useCart } from '../context/CartContext';

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
  NINAS = 'NIÑAS',
  NINOS = 'NIÑOS',
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

interface ProductSelectionState {
  [productId: number]: {
    selectedColor: string;
    selectedSize: string;
    availableSizes: string[];
  };
}

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
    'mostaza': '#FFDB58',
    'azul claro': '#87CEEB',
    'verde menta': '#98FF98',
    'rosado pastel': '#FFD1DC',
    'dorado': '#FFD700'
  };
  return colors[colorName.toLowerCase()] || '#103359';
};

const getMinPrice = (variants: ProductVariant[]): number => {
  if (!variants || variants.length === 0) return 0;
  const prices = variants.map(v => Number(v.price || 0)).filter(p => p > 0);
  return prices.length > 0 ? Math.min(...prices) : 0;
};

const getImageForColor = (variants: ProductVariant[], color: string): string => {
  const variantWithImage = variants.find(v => 
    v.color === color && v.images && v.images.length > 0
  );
  return variantWithImage?.images?.[0]?.imageUrl || '/images/placeholder.png';
};

const getUniqueColors = (variants: ProductVariant[]): string[] => {
  const colors = [...new Set(variants.map((v) => v.color))];
  return colors.slice(0, 6);
};

const getSizesForColor = (variants: ProductVariant[], color: string): string[] => {
  const sizes = variants
    .filter(v => v.color === color && v.stock > 0)
    .map(v => v.size)
    .filter((size, index, self) => self.indexOf(size) === index);
  
  return sizes.sort((a, b) => {
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    return sizeOrder.indexOf(a) - sizeOrder.indexOf(b);
  });
};

const Menu: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart } = useCart();
  
  const productRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [products, setProducts] = useState<Product[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortOption, setSortOption] = useState<string>('');
  const [visibleCards, setVisibleCards] = useState<boolean[]>([]);
  const [selectionStates, setSelectionStates] = useState<ProductSelectionState>({});
  const [quickAddLoading, setQuickAddLoading] = useState<number | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get<Product[]>(MENU_PRODUCTS);
        const productsData = response.data;
        
        const initialSelections: ProductSelectionState = {};
        
        productsData.forEach(product => {
          const colors = getUniqueColors(product.variants);
          const firstColor = colors[0] || '';
          const sizesForFirstColor = firstColor ? getSizesForColor(product.variants, firstColor) : [];
          
          initialSelections[product.id] = {
            selectedColor: firstColor,
            selectedSize: sizesForFirstColor[0] || '',
            availableSizes: sizesForFirstColor
          };
        });
        
        setProducts(productsData);
        setSelectionStates(initialSelections);
        setVisibleCards(new Array(productsData.length).fill(false));
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar los productos:', error);
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

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
    const matchesGender = !genderQuery || 
      (genderQuery.toLowerCase() === 'niñas' && product.gender === ProductGender.NINAS) ||
      (genderQuery.toLowerCase() === 'niños' && product.gender === ProductGender.NINOS) ||
      (genderQuery.toLowerCase() === 'unisex' && product.gender === ProductGender.UNISEX);
    
    const matchesType = !typeQuery || product.type.toLowerCase() === typeQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesGender && matchesType && matchesSearch;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aPrice = getMinPrice(a.variants);
    const bPrice = getMinPrice(b.variants);

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

  const handleColorSelect = (e: React.MouseEvent, productId: number, color: string) => {
    e.stopPropagation();
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const sizesForColor = getSizesForColor(product.variants, color);
    
    setSelectionStates(prev => ({
      ...prev,
      [productId]: {
        selectedColor: color,
        selectedSize: sizesForColor[0] || '',
        availableSizes: sizesForColor
      }
    }));
  };

  const handleSizeSelect = (e: React.MouseEvent, productId: number, size: string) => {
    e.stopPropagation();
    
    setSelectionStates(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        selectedSize: size
      }
    }));
  };

  const handleQuickAddClick = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    
    const productId = product.id;
    const selectionState = selectionStates[productId];
    
    if (!selectionState || !selectionState.selectedColor || !selectionState.selectedSize) {
      console.error('Selecciona color y talla primero');
      return;
    }
    
    // Buscar la variante específica seleccionada
    const selectedVariant = product.variants.find(v => 
      v.color === selectionState.selectedColor && 
      v.size === selectionState.selectedSize
    );
    
    if (!selectedVariant) {
      console.error('Variante no disponible');
      return;
    }
    
    if (selectedVariant.stock <= 0) {
      console.error('Stock agotado para esta variante');
      return;
    }
    
    setQuickAddLoading(productId);
    
    try {
      await addToCart(selectedVariant.id, 1);
      console.log('Producto agregado al carrito:', productId);
      
      // Aquí podrías mostrar una notificación de éxito
    } catch (error) {
      console.error('Error al agregar al carrito:', error);
      // Aquí podrías mostrar una notificación de error
    } finally {
      setQuickAddLoading(null);
    }
  };

  const hasLowStock = (variants: ProductVariant[]) => {
    return variants.some((v) => v.stock > 0 && v.stock <= 3);
  };

  const isNew = (createdAt?: string) => {
    if (!createdAt) return false;
    const productDate = new Date(createdAt);
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return productDate >= thirtyDaysAgo;
  };

  const renderGenderBadge = (gender: ProductGender) => {
    const badgeConfig = {
      [ProductGender.NINAS]: { text: 'NIÑAS', color: '#E9566D' },
      [ProductGender.NINOS]: { text: 'NIÑOS', color: '#103359' },
      [ProductGender.UNISEX]: { text: 'UNISEX', color: '#3DB28A' }
    };
    
    const config = badgeConfig[gender];
    if (!config) return null;
    
    return (
      <span 
        className={`${styles.badge} ${styles.badgeGender}`}
        style={{ backgroundColor: config.color }}
      >
        {config.text}
      </span>
    );
  };

  const setProductRef = (element: HTMLDivElement | null, index: number) => {
    if (element) {
      productRefs.current.set(index, element);
    } else {
      productRefs.current.delete(index);
    }
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

      {/* Barra de filtros */}
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
            <select id="sort" className={styles.filterSelect} value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
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
            const price = getMinPrice(product.variants);
            const colors = getUniqueColors(product.variants);
            const selectionState = selectionStates[product.id] || {
              selectedColor: colors[0] || '',
              selectedSize: '',
              availableSizes: []
            };
            
            const currentImageUrl = getImageForColor(product.variants, selectionState.selectedColor);
            const availableSizes = selectionState.availableSizes || [];

            return (
              <div
                key={`${product.id}-${index}`}
                ref={(el) => setProductRef(el, index)}
                data-index={index}
                className={`${styles.productCard} ${visibleCards[index] ? styles.visible : ''}`}
                onClick={() => router.push(`/product?id=${product.id}`)}
              >
                {/* Badges */}
                <div className={styles.productBadges}>
                  {renderGenderBadge(product.gender)}
                  {isNew(product.createdAt) && <span className={`${styles.badge} ${styles.badgeNew}`}>Nuevo</span>}
                  {hasLowStock(product.variants) && <span className={`${styles.badge} ${styles.badgeLowStock}`}>Últimos</span>}
                </div>

                {/* Imagen con overlay */}
                <div className={styles.productImageContainer}>
                  <Image
                    src={currentImageUrl}
                    alt={product.name}
                    width={854}
                    height={1280}
                    className={`${styles.productImage}`}
                    priority={index < 6}
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

                  {/* Selector de color */}
                  {colors.length > 0 && (
                    <div className={styles.productColors}>
                      {colors.map((color, i) => (
                        <button
                          key={i}
                          className={`${styles.colorDotBtn} ${
                            selectionState.selectedColor === color ? styles.colorDotSelected : ''
                          }`}
                          title={color}
                          style={{
                            backgroundColor: getColorHex(color),
                          }}
                          onClick={(e) => handleColorSelect(e, product.id, color)}
                          aria-label={`Seleccionar color ${color}`}
                        >
                          <span className={styles.colorDot}></span>
                        </button>
                      ))}
                      {product.variants.length > 6 && (
                        <span className={styles.colorMore}>+{product.variants.length - 6}</span>
                      )}
                    </div>
                  )}

                  {/* Selector de talla */}
                  {selectionState.selectedColor && availableSizes.length > 0 && (
                    <div className={styles.productSizes}>
                      <div className={styles.sizesSelector}>
                        {availableSizes.map((size, i) => (
                          <button
                            key={i}
                            className={`${styles.sizeOption} ${
                              selectionState.selectedSize === size ? styles.sizeOptionSelected : ''
                            }`}
                            onClick={(e) => handleSizeSelect(e, product.id, size)}
                            disabled={quickAddLoading === product.id}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Precio */}
                  <div className={styles.productPriceContainer}>
                    <span className={styles.productPrice}>
                      {price > 0 ? `$${price.toLocaleString('es-CO')}` : 'Consultar'}
                    </span>
                  </div>
                </div>

                {/* Botón de agregar rápido - solo visible si hay color y talla seleccionados */}
                {selectionState.selectedColor && selectionState.selectedSize && (
                  <button 
                    className={`${styles.quickAddBtn} ${
                      quickAddLoading === product.id ? styles.quickAddLoading : ''
                    }`}
                    aria-label="Agregar al carrito"
                    onClick={(e) => handleQuickAddClick(e, product)}
                    disabled={quickAddLoading === product.id}
                  >
                    {quickAddLoading === product.id ? (
                      <div className={styles.quickAddSpinner}></div>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Botón mostrar más */}
      {visibleCount < sortedProducts.length && (
        <button className={styles.viewAllButton} onClick={() => setVisibleCount(prev => prev + 20)}>
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