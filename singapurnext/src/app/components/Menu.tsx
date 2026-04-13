'use client';

import { MENU_PRODUCTS } from '../utils/Api';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Image from 'next/image';
import styles from '../menu/menu.module.css';
import { useCart } from '../context/CartContext';
import { showToast } from '../utils/toast';
import { trackAddToCart } from '../lib/tracking';

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
  discountPercentage?: number;
  priceWithDiscount?: number;
  discountAmount?: number;
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

const sortSizes = (sizes: string[]): string[] => {
  const sizeOrder = [
    'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL',
    '2', '4', '6', '8', '10', '12', '14', '16',
    '28', '30', '32', '34', '36', '38', '40', '42',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    'ÚNICA'
  ];

  return [...sizes].sort((a, b) => {
    const indexA = sizeOrder.indexOf(a.toUpperCase());
    const indexB = sizeOrder.indexOf(b.toUpperCase());

    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }

    return a.localeCompare(b);
  });
};

const filterAvailableVariants = (variants: ProductVariant[]): ProductVariant[] => {
  return variants.filter((variant) =>
    variant.enabled !== false &&
    variant.stock > 0
  );
};

const getUniqueColorsWithStock = (variants: ProductVariant[]): string[] => {
  const availableVariants = filterAvailableVariants(variants);
  const colors = [...new Set(availableVariants.map((v) => v.color))];
  return colors.slice(0, 6);
};

const getSizesForColor = (
  variants: ProductVariant[],
  color: string
): {
  size: string;
  available: boolean;
  variant?: ProductVariant;
}[] => {
  const variantsByColor = variants.filter(
    (v) => v.color === color && v.enabled !== false
  );

  const allSizes = [...new Set(variantsByColor.map((v) => v.size))];
  const sortedSizes = sortSizes(allSizes);

  return sortedSizes.map((size) => {
    const variant = variantsByColor.find((v) => v.size === size);
    return {
      size,
      available: !!variant && variant.stock > 0,
      variant
    };
  });
};

const getImageForColor = (variants: ProductVariant[], color: string): string => {
  const variantWithImage = filterAvailableVariants(variants).find((v) =>
    v.color === color && v.images && v.images.length > 0
  );
  return variantWithImage?.images?.[0]?.imageUrl || '/images/placeholder.png';
};

const getPriceForVariant = (variants: ProductVariant[], color: string, size: string): number => {
  const variant = filterAvailableVariants(variants).find((v) =>
    v.color === color &&
    v.size === size
  );

  if (variant?.priceWithDiscount !== undefined) {
    return Number(variant.priceWithDiscount);
  }

  return variant?.price ? Number(variant.price) : 0;
};

const getOriginalPriceForVariant = (variants: ProductVariant[], color: string, size: string): number => {
  const variant = filterAvailableVariants(variants).find((v) =>
    v.color === color &&
    v.size === size
  );

  return variant?.price ? Number(variant.price) : 0;
};

const getDiscountPercentageForVariant = (variants: ProductVariant[], color: string, size: string): number => {
  const variant = filterAvailableVariants(variants).find((v) =>
    v.color === color &&
    v.size === size
  );

  return variant?.discountPercentage || 0;
};

const hasDiscountForVariant = (variants: ProductVariant[], color: string, size: string): boolean => {
  const variant = filterAvailableVariants(variants).find((v) =>
    v.color === color &&
    v.size === size
  );

  return (variant?.discountPercentage || 0) > 0;
};

const getMaxDiscountForProduct = (variants: ProductVariant[]): number => {
  const availableVariants = filterAvailableVariants(variants);
  if (!availableVariants.length) return 0;

  const discounts = availableVariants.map((v) => v.discountPercentage || 0);
  return Math.max(...discounts);
};

const hasAvailableVariants = (product: Product): boolean => {
  return product.enabled !== false &&
    filterAvailableVariants(product.variants).length > 0;
};

const getMinPrice = (variants: ProductVariant[]): number => {
  const availableVariants = filterAvailableVariants(variants);
  if (!availableVariants.length) return 0;

  const prices = availableVariants
    .map((v) => v.priceWithDiscount !== undefined ? Number(v.priceWithDiscount) : Number(v.price || 0))
    .filter((p) => p > 0);

  return prices.length > 0 ? Math.min(...prices) : 0;
};

const getMinOriginalPrice = (variants: ProductVariant[]): number => {
  const availableVariants = filterAvailableVariants(variants);
  if (!availableVariants.length) return 0;

  const prices = availableVariants
    .map((v) => Number(v.price || 0))
    .filter((p) => p > 0);

  return prices.length > 0 ? Math.min(...prices) : 0;
};

const getColorHex = (colorName: string): string => {
  const colors: Record<string, string> = {
    azul: '#103359',
    'azul marino': '#0a1f33',
    rosa: '#F7D1D9',
    verde: '#3DB28A',
    morado: '#806FF7',
    negro: '#1a1a1a',
    blanco: '#ffffff',
    naranja: '#F47B47',
    amarillo: '#FBEAD4',
    rojo: '#E9566D',
    celeste: '#87CEEB',
    gris: '#C3CAD6',
    beige: '#F5F5DC',
    lila: '#B0A9C6',
    turquesa: '#CFDFE0',
    coral: '#FF7F50',
    violeta: '#EE82EE',
    mostaza: '#FFDB58',
    'azul claro': '#87CEEB',
    'verde menta': '#98FF98',
    'rosado pastel': '#FFD1DC',
    dorado: '#FFD700',
    'verde claro': '#90EE90',
    marron: '#8B4513',
    fucsia: '#FF00FF',
    aguamarina: '#7FFFD4',
    'verde azul': '#054365',
    'azul cerúleo': '#007FB9',
    'verde medio': '#47A779',
    'azul ocaso': '#44415C',
    'amarillo mantequilla': '#F3E5AB',
    chocolate: '#4B3621',
    'verde salvia': '#B2AC88',
    terracota: '#C07A64',
    'lavanda grisaceo': '#AC9CC5',
    champaña: '#F5E1DA',
    'gris carbon': '#383E42',
    'rosa viejo': '#C08081',
    arena: '#E5D3B3',
  };

  const normalizedColorName = colorName.toLowerCase().trim();
  return colors[normalizedColorName] || '#103359';
};

const hasLowStock = (variants: ProductVariant[]) => {
  const availableVariants = filterAvailableVariants(variants);
  return availableVariants.some((v) => v.stock > 0 && v.stock <= 1);
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

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get<Product[]>(`${MENU_PRODUCTS}/active`);
        const productsData = response.data;

        const availableProducts = productsData.filter(hasAvailableVariants);

        const initialSelections: ProductSelectionState = {};

        availableProducts.forEach((product) => {
          const colors = getUniqueColorsWithStock(product.variants);

          if (colors.length > 0) {
            const firstColor = colors[0];
            const sizesForColor = getSizesForColor(product.variants, firstColor);
            const availableSizes = sizesForColor
              .filter((v) => v.available)
              .map((v) => v.size);

            const firstAvailableSize = availableSizes[0] || '';

            const initialPrice = firstAvailableSize
              ? getPriceForVariant(product.variants, firstColor, firstAvailableSize)
              : getMinPrice(product.variants);

            initialSelections[product.id] = {
              selectedColor: firstColor,
              selectedSize: firstAvailableSize,
              availableSizes,
              currentPrice: initialPrice
            };
          }
        });

        setProducts(availableProducts);
        setFilteredProducts(availableProducts);
        setSelectionStates(initialSelections);
        setVisibleCards(new Array(availableProducts.length).fill(false));
      } catch (error) {
        console.error('Error al cargar los productos:', error);
        showToast('Error al cargar los productos', 'error', 3200);
      } finally {
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
            setVisibleCards((prev) => {
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
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, [visibleCount, filteredProducts.length]);

  useEffect(() => {
    const searchQuery = searchParams.get('search') || '';
    const genderQuery = searchParams.get('gender') || '';
    const categoryQuery = searchParams.get('category') || '';
    const typeQuery = searchParams.get('type') || '';

    const filtered = products.filter((product) => {
      if (product.enabled === false) return false;

      let matchesGender = true;

      if (categoryQuery) {
        if (categoryQuery === 'ninos') {
          matchesGender = product.gender === ProductGender.NINOS;
        } else if (categoryQuery === 'ninas') {
          matchesGender = product.gender === ProductGender.NINAS;
        }
      } else if (genderQuery) {
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

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const sizesForColor = getSizesForColor(product.variants, color);
    const availableSizes = sizesForColor
      .filter((v) => v.available)
      .map((v) => v.size);

    const firstSize = availableSizes[0] || '';

    const newPrice = firstSize
      ? getPriceForVariant(product.variants, color, firstSize)
      : getMinPrice(product.variants);

    setSelectionStates((prev) => ({
      ...prev,
      [productId]: {
        selectedColor: color,
        selectedSize: firstSize,
        availableSizes,
        currentPrice: newPrice
      }
    }));
  }, [products]);

  const handleSizeSelect = useCallback((e: React.MouseEvent, productId: number, size: string) => {
    e.stopPropagation();

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const selectionState = selectionStates[productId];
    if (!selectionState) return;

    const sizesForColor = getSizesForColor(product.variants, selectionState.selectedColor);
    const sizeInfo = sizesForColor.find((s) => s.size === size);

    if (!sizeInfo || !sizeInfo.available) return;

    const newPrice = getPriceForVariant(
      product.variants,
      selectionState.selectedColor,
      size
    );

    setSelectionStates((prev) => ({
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

    if (!selectionState || !selectionState.selectedColor) {
      showToast('Selecciona un color disponible', 'info', 3000);
      return;
    }

    if (!selectionState.selectedSize) {
      showToast('Selecciona una talla disponible', 'info', 3000);
      return;
    }

    const selectedVariant = filterAvailableVariants(product.variants).find((v) =>
      v.color === selectionState.selectedColor &&
      v.size === selectionState.selectedSize
    );

    if (!selectedVariant) {
      showToast('La variante seleccionada no está disponible', 'error', 3200);
      return;
    }

    setQuickAddLoading(productId);

    try {
      await addToCart(selectedVariant.id, 1, product.name);

const finalPrice =
  selectedVariant.priceWithDiscount !== undefined
    ? Number(selectedVariant.priceWithDiscount)
    : Number(selectedVariant.price || 0);

trackAddToCart({
  variantId: selectedVariant.id,
  productName: product.name,
  price: finalPrice,
  quantity: 1,
  currency: "COP",
  color: selectedVariant.color,
  size: selectedVariant.size,
});

showToast('¡Producto agregado al carrito correctamente!', 'success', 3500);
    } catch (error) {
      console.error('Error al agregar al carrito:', error);
      showToast('Error al agregar al carrito', 'error', 3200);
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

  if (loading) {
    return (
      <div className={styles.menuContainer}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.menuContainer}>
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
            <select
              id="sort"
              className={styles.filterSelect}
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="">Ordenar por</option>
              <option value="price-asc">Precio: Menor a mayor</option>
              <option value="price-desc">Precio: Mayor a menor</option>
              <option value="name-asc">Nombre: A-Z</option>
              <option value="name-desc">Nombre: Z-A</option>
            </select>
          </div>
        </div>
      </div>

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

            const currentColorHasStock = colors.includes(selectionState.selectedColor);
            const effectiveColor = currentColorHasStock ? selectionState.selectedColor : (colors[0] || '');

            const currentImageUrl = getImageForColor(product.variants, effectiveColor);

            if (colors.length === 0) {
              return null;
            }

            return (
              <div
                key={`${product.id}-${index}`}
                ref={(el) => setProductRef(el, index)}
                data-index={index}
                className={`${styles.productCard} ${visibleCards[index] ? styles.visible : ''} ${
                  getMaxDiscountForProduct(product.variants) > 0 ? styles.hasDiscount : ''
                }`}
                onClick={() => router.push(`/product?id=${product.id}`)}
              >
                <div className={styles.productBadges}>
                  {renderGenderBadge(product.gender)}
                  {isNew(product.createdAt) && <span className={`${styles.badge} ${styles.badgeNew}`}>Nuevo</span>}
                  {hasLowStock(product.variants) && <span className={`${styles.badge} ${styles.badgeLowStock}`}>Últimos</span>}
                </div>

                <div className={styles.productImageContainer}>
                  <Image
                    src={currentImageUrl}
                    alt={product.name}
                    width={854}
                    height={1280}
                    className={styles.productImage}
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

                <div className={styles.productDetails}>
                  <h3 className={styles.productName}>{product.name}</h3>

                  {colors.length > 0 && (
                    <div className={styles.productColors}>
                      {colors.map((color, i) => (
                        <div
                          key={i}
                          className={`${styles.colorDot} ${
                            effectiveColor === color ? styles.colorDotSelected : ''
                          }`}
                          title={color}
                          style={{ backgroundColor: getColorHex(color) }}
                          onClick={(e) => handleColorSelect(e, product.id, color)}
                          aria-label={`Seleccionar color ${color}`}
                        ></div>
                      ))}
                    </div>
                  )}

                  {effectiveColor && (
                    <div className={styles.productSizes}>
                      <div className={styles.sizesSelector}>
                        {getSizesForColor(product.variants, effectiveColor).map((sizeInfo, i) => (
                          <button
                            key={i}
                            className={`${styles.sizeOption} ${
                              selectionState.selectedSize === sizeInfo.size ? styles.sizeOptionSelected : ''
                            } ${!sizeInfo.available ? styles.sizeOptionUnavailable : ''}`}
                            onClick={(e) => {
                              if (sizeInfo.available) {
                                handleSizeSelect(e, product.id, sizeInfo.size);
                              }
                            }}
                            disabled={!sizeInfo.available || quickAddLoading === product.id}
                            title={!sizeInfo.available ? 'Talla no disponible' : `Talla ${sizeInfo.size}`}
                          >
                            <span className={styles.sizeText}>{sizeInfo.size}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={styles.productPriceContainer}>
                    {(() => {
                      const localSelection = selectionStates[product.id];
                      const hasCurrentDiscount = localSelection && localSelection.selectedColor && localSelection.selectedSize
                        ? hasDiscountForVariant(product.variants, localSelection.selectedColor, localSelection.selectedSize)
                        : getMaxDiscountForProduct(product.variants) > 0;

                      const currentDiscountPercentage = localSelection && localSelection.selectedColor && localSelection.selectedSize
                        ? getDiscountPercentageForVariant(product.variants, localSelection.selectedColor, localSelection.selectedSize)
                        : getMaxDiscountForProduct(product.variants);

                      const originalPrice = localSelection && localSelection.selectedColor && localSelection.selectedSize
                        ? getOriginalPriceForVariant(product.variants, localSelection.selectedColor, localSelection.selectedSize)
                        : getMinOriginalPrice(product.variants);

                      const finalPrice = selectionState.currentPrice || getMinPrice(product.variants);

                      if (hasCurrentDiscount && originalPrice > 0 && currentDiscountPercentage > 0) {
                        return (
                          <div className={styles.discountedPriceContainer}>
                            <div className={styles.originalPriceWrapper}>
                              <span className={styles.originalPrice}>
                                ${originalPrice.toLocaleString('es-CO')}
                              </span>
                            </div>
                            <div className={styles.finalPriceWrapper}>
                              <span className={styles.finalPrice}>
                                ${finalPrice.toLocaleString('es-CO')}
                              </span>
                              <span className={styles.discountBadge}>
                                -{currentDiscountPercentage}%
                              </span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <span className={styles.productPrice}>
                          ${finalPrice.toLocaleString('es-CO')}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {effectiveColor && selectionState.selectedSize && (
                  <button
                    className={`${styles.quickAddBtn} ${
                      quickAddLoading === product.id ? styles.quickAddLoading : ''
                    }`}
                    aria-label="Agregar al carrito"
                    onClick={(e) => handleQuickAddClick(e, product)}
                    disabled={quickAddLoading === product.id}
                    title="Agregar al carrito"
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
          }).filter(Boolean)
        )}
      </div>

      {visibleCount < sortedProducts.length && (
        <button className={styles.viewAllButton} onClick={() => setVisibleCount((prev) => prev + 20)}>
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