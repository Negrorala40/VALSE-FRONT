'use client';

import { MENU_PRODUCTS } from '../utils/Api';
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  enabled?: boolean;
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
  enabled?: boolean;
}

interface ProductSelectionState {
  [productId: number]: {
    selectedColor: string;
    selectedSize: string;
    availableSizes: string[];
    currentPrice: number;
  };
}

// Función para filtrar variantes habilitadas y con stock > 0
const filterAvailableVariants = (variants: ProductVariant[]): ProductVariant[] => {
  return variants.filter(variant => 
    variant.enabled !== false && // Si enabled es undefined o true
    variant.stock > 0
  );
};

// Función para obtener colores únicos solo de variantes disponibles
const getUniqueColorsWithStock = (variants: ProductVariant[]): string[] => {
  const availableVariants = filterAvailableVariants(variants);
  const colors = [...new Set(availableVariants.map((v) => v.color))];
  return colors.slice(0, 6);
};

// Función para obtener tallas disponibles para un color específico (solo con stock y habilitadas)
const getSizesForColorWithStock = (variants: ProductVariant[], color: string): ProductVariant[] => {
  const availableVariants = filterAvailableVariants(variants)
    .filter(v => v.color === color);
  
  // Ordenar por tamaño
  const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  return availableVariants.sort((a, b) => {
    return sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size);
  });
};

// Función para obtener imagen para un color específico (solo si tiene stock y está habilitada)
const getImageForColor = (variants: ProductVariant[], color: string): string => {
  const variantWithImage = filterAvailableVariants(variants).find(v => 
    v.color === color && v.images && v.images.length > 0
  );
  return variantWithImage?.images?.[0]?.imageUrl || '/images/placeholder.png';
};

// Función para obtener el precio para una variante específica
const getPriceForVariant = (variants: ProductVariant[], color: string, size: string): number => {
  const variant = filterAvailableVariants(variants).find(v => 
    v.color === color && 
    v.size === size
  );
  
  return variant?.price ? Number(variant.price) : 0;
};

// Función para verificar si un producto tiene al menos una variante disponible
const hasAvailableVariants = (product: Product): boolean => {
  return product.enabled !== false && // Producto habilitado
         filterAvailableVariants(product.variants).length > 0;
};

// Función para obtener el precio mínimo solo de variantes disponibles
const getMinPrice = (variants: ProductVariant[]): number => {
  const availableVariants = filterAvailableVariants(variants);
  if (!availableVariants || availableVariants.length === 0) return 0;
  
  const prices = availableVariants.map(v => Number(v.price || 0)).filter(p => p > 0);
  return prices.length > 0 ? Math.min(...prices) : 0;
};

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

const hasLowStock = (variants: ProductVariant[]) => {
  const availableVariants = filterAvailableVariants(variants);
  return availableVariants.some((v) => v.stock > 0 && v.stock <= 3);
};

const isNew = (createdAt?: string) => {
  if (!createdAt) return false;
  const productDate = new Date(createdAt);
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  return productDate >= thirtyDaysAgo;
};

const Menu: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart } = useCart();
  
  const productRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortOption, setSortOption] = useState<string>('');
  const [visibleCards, setVisibleCards] = useState<boolean[]>([]);
  const [selectionStates, setSelectionStates] = useState<ProductSelectionState>({});
  const [quickAddLoading, setQuickAddLoading] = useState<number | null>(null);

  // Cargar productos habilitados
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // IMPORTANTE: Usar endpoint de productos activos
        const response = await axios.get<Product[]>(`${MENU_PRODUCTS}/active`);
        const productsData = response.data;
        
        // Filtrar productos que tienen al menos una variante disponible
        const availableProducts = productsData.filter(hasAvailableVariants);
        
        // Inicializar estados de selección para productos disponibles
        const initialSelections: ProductSelectionState = {};
        
        availableProducts.forEach(product => {
          const colors = getUniqueColorsWithStock(product.variants);
          if (colors.length > 0) {
            const firstColor = colors[0];
            const sizesForFirstColor = getSizesForColorWithStock(product.variants, firstColor);
            const firstSize = sizesForFirstColor[0]?.size || '';
            
            // Obtener el precio inicial para la primera variante seleccionada
            const initialPrice = firstSize ? 
              getPriceForVariant(product.variants, firstColor, firstSize) : 
              getMinPrice(product.variants);
            
            initialSelections[product.id] = {
              selectedColor: firstColor,
              selectedSize: firstSize,
              availableSizes: sizesForFirstColor.map(v => v.size),
              currentPrice: initialPrice
            };
          }
        });
        
        setProducts(availableProducts);
        setFilteredProducts(availableProducts);
        setSelectionStates(initialSelections);
        setVisibleCards(new Array(availableProducts.length).fill(false));
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
  }, [visibleCount, filteredProducts.length]);

  // Filtrar productos según búsqueda
  useEffect(() => {
    const searchQuery = searchParams.get('search') || '';
    const genderQuery = searchParams.get('gender') || '';
    const categoryQuery = searchParams.get('category') || '';
    const typeQuery = searchParams.get('type') || '';

    const filtered = products.filter((product) => {
      // Verificar si el producto está habilitado
      if (product.enabled === false) {
        return false;
      }

      // Lógica para categorías
      let matchesGender = true;
      
      if (categoryQuery) {
        // Para Niños: mostrar NIÑOS y UNISEX
        if (categoryQuery === 'ninos') {
          matchesGender = product.gender === ProductGender.NINOS || 
                         product.gender === ProductGender.UNISEX;
        }
        // Para Niñas: mostrar NIÑAS y UNISEX
        else if (categoryQuery === 'ninas') {
          matchesGender = product.gender === ProductGender.NINAS || 
                         product.gender === ProductGender.UNISEX;
        }
      }
      // Para Unisex directo (parámetro gender)
      else if (genderQuery) {
        matchesGender = 
          (genderQuery.toLowerCase() === 'niñas' && product.gender === ProductGender.NINAS) ||
          (genderQuery.toLowerCase() === 'niños' && product.gender === ProductGender.NINOS) ||
          (genderQuery.toLowerCase() === 'unisex' && product.gender === ProductGender.UNISEX);
      }
      
      const matchesType = !typeQuery || product.type.toLowerCase() === typeQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesGender && matchesType && matchesSearch;
    });

    setFilteredProducts(filtered);
    setVisibleCount(20);
  }, [searchParams, products]);

  // Ordenar productos
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aSelection = selectionStates[a.id];
    const bSelection = selectionStates[b.id];
    
    const aPrice = aSelection?.currentPrice || getMinPrice(a.variants);
    const bPrice = bSelection?.currentPrice || getMinPrice(b.variants);

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

  const handleColorSelect = useCallback((e: React.MouseEvent, productId: number, color: string) => {
    e.stopPropagation();
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const sizesForColor = getSizesForColorWithStock(product.variants, color);
    const firstSize = sizesForColor[0]?.size || '';
    
    // Obtener el precio para la nueva variante seleccionada
    const newPrice = firstSize ? 
      getPriceForVariant(product.variants, color, firstSize) : 
      getMinPrice(product.variants);
    
    setSelectionStates(prev => ({
      ...prev,
      [productId]: {
        selectedColor: color,
        selectedSize: firstSize,
        availableSizes: sizesForColor.map(v => v.size),
        currentPrice: newPrice
      }
    }));
  }, [products]);

  const handleSizeSelect = useCallback((e: React.MouseEvent, productId: number, size: string) => {
    e.stopPropagation();
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const selectionState = selectionStates[productId];
    if (!selectionState) return;
    
    // Obtener el precio para la nueva talla seleccionada
    const newPrice = getPriceForVariant(
      product.variants, 
      selectionState.selectedColor, 
      size
    );
    
    setSelectionStates(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        selectedSize: size,
        currentPrice: newPrice
      }
    }));
  }, [products, selectionStates]);

  const handleQuickAddClick = useCallback(async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    
    const productId = product.id;
    const selectionState = selectionStates[productId];
    
    if (!selectionState || !selectionState.selectedColor || !selectionState.selectedSize) {
      console.error('Selecciona color y talla primero');
      return;
    }
    
    // Buscar la variante específica seleccionada (que ya sabemos que tiene stock y está habilitada)
    const selectedVariant = filterAvailableVariants(product.variants).find(v => 
      v.color === selectionState.selectedColor && 
      v.size === selectionState.selectedSize
    );
    
    if (!selectedVariant) {
      console.error('Variante no disponible o sin stock');
      return;
    }
    
    setQuickAddLoading(productId);
    
    try {
          await addToCart(selectedVariant.id, 1, product.name);
      console.log('Producto agregado al carrito:', productId);
      
      // Mostrar notificación de éxito
      const event = new CustomEvent('show-toast', {
        detail: { 
          message: '¡Producto agregado al carrito!', 
          type: 'success',
          duration: 3000
        }
      });
      window.dispatchEvent(event);
      
    } catch (error) {
      console.error('Error al agregar al carrito:', error);
      
      // Mostrar notificación de error
      const event = new CustomEvent('show-toast', {
        detail: { 
          message: 'Error al agregar al carrito', 
          type: 'error',
          duration: 3000
        }
      });
      window.dispatchEvent(event);
    } finally {
      setQuickAddLoading(null);
    }
  }, [selectionStates, addToCart]);

  const renderGenderBadge = useCallback((gender: ProductGender) => {
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
  }, []);

  const setProductRef = useCallback((element: HTMLDivElement | null, index: number) => {
    if (element) {
      productRefs.current.set(index, element);
    } else {
      productRefs.current.delete(index);
    }
  }, []);

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
            <span className={styles.resultsText}>productos disponibles</span>
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
            <h3 className={styles.emptyTitle}>No encontramos productos disponibles</h3>
            <p className={styles.emptyText}>Intenta con otros filtros de búsqueda</p>
          </div>
        ) : (
          sortedProducts.slice(0, visibleCount).map((product, index) => {
            const colors = getUniqueColorsWithStock(product.variants);
            const selectionState = selectionStates[product.id] || {
              selectedColor: colors[0] || '',
              selectedSize: '',
              availableSizes: [],
              currentPrice: getMinPrice(product.variants)
            };
            
            // Verificar si el color seleccionado actualmente tiene stock
            const currentColorHasStock = colors.includes(selectionState.selectedColor);
            const effectiveColor = currentColorHasStock ? selectionState.selectedColor : (colors[0] || '');
            
            const currentImageUrl = getImageForColor(product.variants, effectiveColor);
            const availableSizes = getSizesForColorWithStock(product.variants, effectiveColor).map(v => v.size);
            const currentPrice = selectionState.currentPrice || getMinPrice(product.variants);

            // Si no hay colores disponibles, no renderizar el producto
            if (colors.length === 0) {
              return null;
            }

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

                  {/* Selector de color - solo muestra colores con stock */}
                  {colors.length > 0 && (
                    <div className={styles.productColors}>
                      {colors.map((color, i) => (
                        <div
                          key={i}
                          className={`${styles.colorDot} ${
                            effectiveColor === color ? styles.colorDotSelected : ''
                          }`}
                          title={color}
                          style={{
                            backgroundColor: getColorHex(color),
                          }}
                          onClick={(e) => handleColorSelect(e, product.id, color)}
                          aria-label={`Seleccionar color ${color}`}
                        ></div>
                      ))}
                    </div>
                  )}

                  {/* Selector de talla - solo muestra tallas con stock para el color seleccionado */}
                  {effectiveColor && availableSizes.length > 0 && (
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

                  {/* Precio - se actualiza con cada cambio de color/talla */}
                  <div className={styles.productPriceContainer}>
                    <span className={styles.productPrice}>
                      {currentPrice > 0 ? `$${currentPrice.toLocaleString('es-CO')}` : 'Consultar'}
                    </span>
                  </div>
                </div>

                {/* Botón de agregar rápido - solo si hay color y talla seleccionados con stock */}
                {effectiveColor && selectionState.selectedSize && (
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

                {/* Indicador de stock agotado si no hay tallas disponibles para el color seleccionado */}
                {effectiveColor && availableSizes.length === 0 && (
                  <div className={styles.outOfStockBadge}>
                    <span>Sin tallas disponibles</span>
                  </div>
                )}
              </div>
            );
          }).filter(Boolean) // Filtrar nulos
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