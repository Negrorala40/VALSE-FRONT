'use client';

import { MENU_PRODUCTS } from '../utils/Api';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Image from 'next/image';
import styles from '../menu/menu.module.css';
import { useCart } from '../context/CartContext'; // Importar contexto del carrito

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

// Actualizar enum de géneros
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

// Interface para estado de imágenes por producto
interface ProductImageState {
  [productId: number]: {
    currentImageIndex: number;
    imagesByColor: {
      [color: string]: string; // color -> imageUrl
    };
    selectedColor: string;
  };
}

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
    'mostaza': '#FFDB58',
    'azul claro': '#87CEEB',
    'verde menta': '#98FF98',
    'rosado pastel': '#FFD1DC',
    'dorado': '#FFD700'
  };
  return colors[colorName.toLowerCase()] || '#103359';
};

// Función para obtener el precio mínimo de las variantes - MOVER ANTES DEL COMPONENTE
const getMinPrice = (variants: ProductVariant[]): number => {
  if (!variants || variants.length === 0) return 0;
  const prices = variants.map(v => Number(v.price || 0)).filter(p => p > 0);
  return prices.length > 0 ? Math.min(...prices) : 0;
};

const Menu: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart } = useCart(); // Usar contexto del carrito
  
  const productRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const imageTimeouts = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const [products, setProducts] = useState<Product[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortOption, setSortOption] = useState<string>('');
  const [visibleCards, setVisibleCards] = useState<boolean[]>([]);
  const [imageStates, setImageStates] = useState<ProductImageState>({});
  const [quickAddLoading, setQuickAddLoading] = useState<number | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get<Product[]>(MENU_PRODUCTS);
        const productsData = response.data;
        
        // Inicializar estados de imagen para cada producto
        const initialImageStates: ProductImageState = {};
        
        productsData.forEach(product => {
          // Obtener colores únicos del producto
          const uniqueColors = [...new Set(product.variants.map(v => v.color))];
          
          // Para cada color, obtener la primera imagen disponible
          const imagesByColor: { [color: string]: string } = {};
          
          uniqueColors.forEach(color => {
            const variantWithImage = product.variants.find(v => 
              v.color === color && v.images && v.images.length > 0
            );
            
            if (variantWithImage && variantWithImage.images[0]) {
              imagesByColor[color] = variantWithImage.images[0].imageUrl;
            }
          });
          
          // Si no hay imágenes por color, usar la primera imagen disponible
          if (Object.keys(imagesByColor).length === 0) {
            const firstVariantWithImage = product.variants.find(v => 
              v.images && v.images.length > 0
            );
            
            if (firstVariantWithImage && firstVariantWithImage.images[0]) {
              imagesByColor['default'] = firstVariantWithImage.images[0].imageUrl;
            }
          }
          
          // Seleccionar el primer color disponible
          const firstColor = uniqueColors[0] || 'default';
          
          initialImageStates[product.id] = {
            currentImageIndex: 0,
            imagesByColor,
            selectedColor: firstColor
          };
        });
        
        setProducts(productsData);
        setImageStates(initialImageStates);
        setVisibleCards(new Array(productsData.length).fill(false));
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
      // Limpiar timeouts al desmontar
      imageTimeouts.current.forEach(timeout => clearTimeout(timeout));
    };
  }, [visibleCount, products.length]);

  const searchQuery = searchParams.get('search') || '';
  const genderQuery = searchParams.get('gender') || '';
  const typeQuery = searchParams.get('type') || '';

  const filteredProducts = products.filter((product) => {
    // Actualizar lógica de filtro para nuevos géneros
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
  const getUniqueColors = (variants: ProductVariant[]): string[] => {
    const colors = [...new Set(variants.map((v) => v.color))];
    return colors.slice(0, 6); // Mostrar hasta 6 colores
  };

  // Obtener tallas disponibles para un color específico
  const getSizesForColor = (variants: ProductVariant[], color: string): string[] => {
    const sizes = variants
      .filter(v => v.color === color && v.stock > 0)
      .map(v => v.size)
      .filter((size, index, self) => self.indexOf(size) === index); // Eliminar duplicados
    
    return sizes.sort((a, b) => {
      // Ordenar tallas: XS, S, M, L, XL, etc.
      const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
      return sizeOrder.indexOf(a) - sizeOrder.indexOf(b);
    });
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

  // Cambiar imagen al seleccionar color
  const handleColorSelect = (e: React.MouseEvent, productId: number, color: string) => {
    e.stopPropagation();
    
    setImageStates(prev => {
      const currentState = prev[productId];
      if (!currentState || currentState.selectedColor === color) return prev;
      
      const newImageUrl = currentState.imagesByColor[color] || 
                         Object.values(currentState.imagesByColor)[0];
      
      if (!newImageUrl) return prev;
      
      // Limpiar timeout anterior si existe
      const existingTimeout = imageTimeouts.current.get(productId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      // Establecer un nuevo timeout para actualizar después de la animación
      const timeout = setTimeout(() => {
        setImageStates(prevState => ({
          ...prevState,
          [productId]: {
            ...prevState[productId],
            selectedColor: color
          }
        }));
      }, 300);
      
      imageTimeouts.current.set(productId, timeout);
      
      return {
        ...prev,
        [productId]: {
          ...currentState,
          selectedColor: color
        }
      };
    });
  };

  // Función para manejar el agregado rápido al carrito
  const handleQuickAddClick = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    
    const productId = product.id;
    const imageState = imageStates[productId];
    
    if (!imageState || !product.variants.length) {
      console.error('Producto o variantes no disponibles');
      return;
    }
    
    // Buscar variante con el color seleccionado y primera talla disponible
    const selectedColor = imageState.selectedColor;
    const variantsForColor = product.variants.filter(v => 
      v.color === selectedColor && v.stock > 0
    );
    
    if (variantsForColor.length === 0) {
      console.error('No hay stock disponible para este color');
      return;
    }
    
    // Ordenar variantes por talla y tomar la primera
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const sortedVariants = variantsForColor.sort((a, b) => 
      sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size)
    );
    
    const selectedVariant = sortedVariants[0];
    
    if (!selectedVariant) {
      console.error('No se pudo encontrar una variante válida');
      return;
    }
    
    setQuickAddLoading(productId);
    
    try {
      // Usar el contexto del carrito para agregar el producto
      await addToCart(selectedVariant.id, 1);
      
      // Aquí podrías mostrar una notificación de éxito
      console.log('Producto agregado al carrito:', productId);
      
    } catch (error) {
      console.error('Error al agregar al carrito:', error);
      // Aquí podrías mostrar una notificación de error
    } finally {
      setQuickAddLoading(null);
    }
  };

  // Obtener la URL de imagen actual para un producto
  const getCurrentImageUrl = (productId: number): string => {
    const state = imageStates[productId];
    if (!state || !state.imagesByColor[state.selectedColor]) {
      const product = products.find(p => p.id === productId);
      const firstVariant = product?.variants[0];
      const firstImage = firstVariant?.images?.[0]?.imageUrl;
      return firstImage || '/images/placeholder.png';
    }
    
    return state.imagesByColor[state.selectedColor];
  };

  // Renderizar badges de género (actualizado)
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
            const price = getMinPrice(product.variants);
            const colors = getUniqueColors(product.variants);
            const currentImageUrl = getCurrentImageUrl(product.id);
            const imageState = imageStates[product.id];
            const selectedColor = imageState?.selectedColor || colors[0];
            
            // Obtener tallas para el color seleccionado
            const sizesForColor = selectedColor ? 
              getSizesForColor(product.variants, selectedColor).slice(0, 3) : [];

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
                  {renderGenderBadge(product.gender)}
                  {isNew(product.createdAt) && <span className={`${styles.badge} ${styles.badgeNew}`}>Nuevo</span>}
                  {hasLowStock(product.variants) && <span className={`${styles.badge} ${styles.badgeLowStock}`}>Últimos</span>}
                </div>

                {/* Imagen con overlay y animación */}
                <div className={styles.productImageContainer}>
                  <Image
                    src={currentImageUrl}
                    alt={product.name}
                    width={854}
                    height={1280}
                    className={`${styles.productImage} ${
                      imageState && styles.imageTransition
                    }`}
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

                  {/* Colores disponibles con interacción */}
                  {colors.length > 0 && (
                    <div className={styles.productColors}>
                      {colors.map((color, i) => (
                        <button
                          key={i}
                          className={`${styles.colorDotBtn} ${
                            selectedColor === color ? styles.colorDotSelected : ''
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

                  {/* Tallas disponibles para el color seleccionado */}
                  {selectedColor && sizesForColor.length > 0 && (
                    <div className={styles.productSizes}>
                      <span className={styles.sizesLabel}>Tallas:</span>
                      <div className={styles.sizesContainer}>
                        {sizesForColor.map((size, i) => (
                          <span key={i} className={styles.sizeTag}>
                            {size}
                          </span>
                        ))}
                        {getSizesForColor(product.variants, selectedColor).length > 3 && (
                          <span className={styles.sizeMore}>+{getSizesForColor(product.variants, selectedColor).length - 3}</span>
                        )}
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

                {/* Botón de acción rápida */}
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