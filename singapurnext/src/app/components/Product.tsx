'use client';

import React, { useState, useEffect, Suspense, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import styles from './Product.module.css';
import { PRODUCT_DETAIL, MENU_PRODUCTS } from '../utils/Api';
import { useCart } from '../context/CartContext';

interface Imagen {
  id?: number;
  fileName: string;
  imageUrl: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  largeUrl?: string;
}

interface Variante {
  id: number;
  color: string;
  size: string;
  stock: number;
  price: number;
  discountPercentage?: number;
  priceWithDiscount?: number;
  discountAmount?: number;
  productId: number;
  images: Imagen[];
  enabled?: boolean;
}

interface Producto {
  id: number;
  name: string;
  description: string;
  gender: string;
  type: string;
  variants: Variante[];
  enabled?: boolean;
}

interface ErrorResponse {
  response?: {
    status?: number;
  };
  message?: string;
}

const getColorHex = (colorName: string): string => {
  const colors: Record<string, string> = {
    'azul': '#103359',
    'azul marino': '#0a1f33',
    'rosa': '#F7D1D9',
    'verde': '#3DB28A',
    'morado': '#806FF7',
    'negro': '#1a1a1a',
    'blanco': '#ffffff',
    'naranja': '#F47B47',
    'amarillo': '#FBEAD4',
    'rojo': '#E9566D',
    'celeste': '#87CEEB',
    'gris': '#C3CAD6',
    'beige': '#F5F5DC',
    'lila': '#B0A9C6',
    'turquesa': '#CFDFE0',
    'coral': '#FF7F50',
    'violeta': '#EE82EE',
    'mostaza': '#FFDB58',
    'azul claro': '#87CEEB',
    'verde menta': '#98FF98',
    'rosado pastel': '#FFD1DC',
    'dorado': '#FFD700',
    'verde claro': '#90EE90',
    'marron': '#8B4513',
    'fucsia': '#FF00FF',
    'aguamarina': '#7FFFD4',
    'verde azul': '#054365',
    'azul cerúleo': '#007FB9',
    'verde medio': '#47A779',
    'azul ocaso': '#44415C',
    'amarillo mantequilla': '#F3E5AB',
    'chocolate': '#4B3621',
    'verde salvia': '#B2AC88',
    'terracota': '#C07A64',
    'lavanda grisaceo': '#AC9CC5',
    'champaña': '#F5E1DA',
    'gris carbon': '#383E42',
    'rosa viejo': '#C08081',
    'arena': '#E5D3B3',
  };

  const lowerColor = colorName.toLowerCase().trim();
  for (const [key, value] of Object.entries(colors)) {
    if (lowerColor.includes(key) || key.includes(lowerColor)) {
      return value;
    }
  }

  return '#103359';
};

const calculatePriceWithDiscount = (price: number, discountPercentage?: number): number => {
  if (!discountPercentage || discountPercentage <= 0 || !price || price <= 0) {
    return price;
  }

  const discountAmount = price * (discountPercentage / 100);
  const discountedPrice = price - discountAmount;

  return discountedPrice > 0 ? Number(discountedPrice.toFixed(0)) : 0;
};

const calculateDiscountAmount = (price: number, discountPercentage?: number): number => {
  if (!discountPercentage || discountPercentage <= 0 || !price || price <= 0) {
    return 0;
  }

  return Number((price * (discountPercentage / 100)).toFixed(0));
};

const getDiscountedPrice = (variante: Variante): number => {
  if (variante.priceWithDiscount !== undefined && variante.priceWithDiscount > 0) {
    return variante.priceWithDiscount;
  }

  if (variante.discountPercentage && variante.discountPercentage > 0 && variante.price) {
    return calculatePriceWithDiscount(variante.price, variante.discountPercentage);
  }

  return variante.price || 0;
};

const getOriginalPrice = (variante: Variante): number => {
  return variante.price || 0;
};

const getDiscountPercentage = (variante: Variante): number => {
  return variante.discountPercentage || 0;
};

const hasDiscount = (variante: Variante): boolean => {
  return (variante.discountPercentage || 0) > 0;
};

const formatPrice = (price: number): string => {
  if (!price || price <= 0) return 'Consultar';
  return `$${price.toLocaleString('es-CO')}`;
};

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

    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;

    return a.localeCompare(b);
  });
};

let notificationId = 0;

const ProductContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('id');
  const { addToCart } = useCart();

  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [tallaSeleccionada, setTallaSeleccionada] = useState<string>('');
  const [colorSeleccionado, setColorSeleccionado] = useState<string>('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [stockDisponible, setStockDisponible] = useState<number | null>(null);
  const [imagenActual, setImagenActual] = useState<number>(0);
  const [imagenesActuales, setImagenesActuales] = useState<Imagen[]>([]);
  const [precioSeleccionado, setPrecioSeleccionado] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }>>([]);
  const [productNotFound, setProductNotFound] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [agregando, setAgregando] = useState<boolean>(false);

  const imageContainerRef = useRef<HTMLDivElement>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const id = ++notificationId;
    const newNotification = { id, message, type };
    setNotifications((prev) => [...prev, newNotification]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    }, 3200);
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  const siguienteImagen = () => {
    if (imagenesActuales.length > 1 && !isAnimating) {
      setIsAnimating(true);
      setImagenActual((prev) => (prev + 1) % imagenesActuales.length);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const anteriorImagen = () => {
    if (imagenesActuales.length > 1 && !isAnimating) {
      setIsAnimating(true);
      setImagenActual((prev) => (prev - 1 + imagenesActuales.length) % imagenesActuales.length);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (imagenesActuales.length <= 1 || isAnimating) return;

    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const containerWidth = rect.width;

    if (clickX < containerWidth / 2) {
      anteriorImagen();
    } else {
      siguienteImagen();
    }
  };

  const goToImage = (index: number) => {
    if (!isAnimating && index >= 0 && index < imagenesActuales.length) {
      setIsAnimating(true);
      setImagenActual(index);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const obtenerVarianteSeleccionada = (): Variante | undefined => {
    if (!producto || !colorSeleccionado || !tallaSeleccionada) return undefined;

    return producto.variants.find(
      (v) => v.color === colorSeleccionado && v.size === tallaSeleccionada
    );
  };

  const getMaxDiscountForProduct = (): number => {
    if (!producto) return 0;
    const discounts = producto.variants.map((v) => v.discountPercentage || 0);
    return discounts.length > 0 ? Math.max(...discounts) : 0;
  };

  const colorHasDiscount = (color: string): boolean => {
    if (!producto) return false;
    return producto.variants.some((v) => v.color === color && hasDiscount(v));
  };

  const variantesDisponibles = useMemo(() => {
    if (!producto) return [];
    return producto.variants.filter((variant) => variant.enabled !== false && variant.stock > 0);
  }, [producto]);

  useEffect(() => {
    if (!productId) {
      setError('Producto no encontrado');
      setProductNotFound(true);
      setCargando(false);
      return;
    }

    const obtenerProducto = async () => {
      try {
        let response = await fetch(`${MENU_PRODUCTS}/active/${productId}`);

        if (!response.ok) {
          if (response.status === 404) {
            response = await fetch(PRODUCT_DETAIL(productId));
          }

          if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
          }
        }

        const data: Producto = await response.json();

        if (data.enabled === false) {
          setError('Este producto no está disponible actualmente');
          setProductNotFound(true);
          setCargando(false);
          return;
        }

        const availableVariants = data.variants.filter((variant) =>
          variant.enabled !== false && variant.stock > 0
        );

        if (availableVariants.length === 0) {
          setError('Este producto no tiene variantes disponibles');
          setProductNotFound(true);
          setCargando(false);
          return;
        }

        setProducto({
          ...data,
          variants: availableVariants
        });

        const primeraVariante = availableVariants[0];

        if (primeraVariante?.images?.length) {
          setImagenesActuales(primeraVariante.images);
          setImagenActual(0);
        }

        if (primeraVariante.color) {
          setColorSeleccionado(primeraVariante.color);
        }

        if (primeraVariante.size) {
          setTallaSeleccionada(primeraVariante.size);
          setStockDisponible(primeraVariante.stock);
        }

        const precioInicial = primeraVariante.price ? getDiscountedPrice(primeraVariante) : 0;
        setPrecioSeleccionado(precioInicial);
      } catch (err: unknown) {
        console.error('Error obteniendo producto:', err);

        const errorMessage = err instanceof Error ? err.message : 'Error al cargar el producto';
        if (errorMessage.includes('404') || errorMessage.toLowerCase().includes('not found')) {
          setError('Producto no encontrado');
          setProductNotFound(true);
        } else {
          setError(errorMessage);
        }
        showNotification('Error al cargar el producto', 'error');
      } finally {
        setCargando(false);
      }
    };

    obtenerProducto();
  }, [productId]);

  useEffect(() => {
    if (tallaSeleccionada && colorSeleccionado && producto) {
      const variante = producto.variants.find(
        (v) => v.color === colorSeleccionado && v.size === tallaSeleccionada
      );

      if (variante) {
        setStockDisponible(variante.stock);
        setPrecioSeleccionado(getDiscountedPrice(variante));

        if (variante.images?.length > 0) {
          setImagenesActuales(variante.images);
          setImagenActual(0);
        }
      } else {
        setStockDisponible(null);
      }
    } else if (producto && colorSeleccionado) {
      const primeraVarianteColor = producto.variants.find((v) => v.color === colorSeleccionado);

      if (primeraVarianteColor) {
        setPrecioSeleccionado(getDiscountedPrice(primeraVarianteColor));
        if (primeraVarianteColor.images?.length > 0) {
          setImagenesActuales(primeraVarianteColor.images);
          setImagenActual(0);
        }
      }
    } else if (producto) {
      const precios = producto.variants.map((v) => getDiscountedPrice(v));
      const precioMinimo = precios.length > 0 ? Math.min(...precios) : 0;
      setPrecioSeleccionado(precioMinimo);
      setStockDisponible(null);
    }
  }, [colorSeleccionado, tallaSeleccionada, producto]);

  const getUniqueColors = () => {
    if (!producto) return [];
    return [...new Set(producto.variants.map((v) => v.color))].slice(0, 6);
  };

  const manejarCambioColor = (color: string) => {
    setColorSeleccionado(color);
    setCantidad(1);

    if (!producto) return;

    const variantesDelColor = producto.variants.filter(
      (v) => v.color === color && v.enabled !== false && v.stock > 0
    );

    const primeraVarianteDisponible = variantesDelColor[0];

    if (primeraVarianteDisponible) {
      setTallaSeleccionada(primeraVarianteDisponible.size);
      setStockDisponible(primeraVarianteDisponible.stock);
      setPrecioSeleccionado(getDiscountedPrice(primeraVarianteDisponible));

      if (primeraVarianteDisponible.images?.length > 0) {
        setImagenesActuales(primeraVarianteDisponible.images);
        setImagenActual(0);
      }
    } else {
      setTallaSeleccionada('');
      setStockDisponible(null);
      setPrecioSeleccionado(0);
      setImagenesActuales([]);
      setImagenActual(0);
    }
  };

  const manejarCambioTalla = (talla: string) => {
    setTallaSeleccionada(talla);
    setCantidad(1);
  };

  const manejarCambioCantidad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (value >= 1 && value <= (stockDisponible || 10)) {
      setCantidad(value);
    }
  };

  const incrementarCantidad = () => {
    if (cantidad < (stockDisponible || 10)) {
      setCantidad((prev) => prev + 1);
    }
  };

  const decrementarCantidad = () => {
    if (cantidad > 1) {
      setCantidad((prev) => prev - 1);
    }
  };

  const agregarAlCarrito = async () => {
    if (!colorSeleccionado) {
      showNotification('Selecciona un color', 'info');
      return;
    }

    if (!tallaSeleccionada) {
      showNotification('Selecciona una talla', 'info');
      return;
    }

    if (!stockDisponible || cantidad > stockDisponible) {
      showNotification('Stock insuficiente', 'error');
      return;
    }

    const variante = producto?.variants.find(
      (v) => v.size === tallaSeleccionada && v.color === colorSeleccionado
    );

    if (!variante || !producto) {
      showNotification('La variante seleccionada no está disponible', 'error');
      return;
    }

    try {
      setAgregando(true);
      await addToCart(variante.id, cantidad, producto.name);
      showNotification('¡Producto agregado al carrito correctamente!', 'success');
    } catch (err: unknown) {
      console.error('Error:', err);

      const errorData = err as ErrorResponse;

      if (errorData.response?.status === 401 || errorData.response?.status === 403) {
        showNotification('Inicia sesión para continuar', 'info');
        router.push('/login');
      } else {
        const errorMessage = errorData.message || 'Error al agregar al carrito';
        showNotification(errorMessage, 'error');
      }
    } finally {
      setAgregando(false);
    }
  };

  if (cargando) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Cargando producto...</p>
      </div>
    );
  }

  if (error && productNotFound) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2 className={styles.errorTitle}>Producto no disponible</h2>
        <p className={styles.errorText}>{error}</p>
        <button onClick={() => router.push('/menu')} className={styles.backButton}>
          Volver al menú
        </button>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIcon}>❓</div>
        <h2 className={styles.emptyTitle}>Producto no encontrado</h2>
        <p>El producto que buscas no está disponible o no existe.</p>
        <button onClick={() => router.push('/menu')} className={styles.backButton}>
          Volver al menú
        </button>
      </div>
    );
  }

  const coloresDisponibles = getUniqueColors();

  const tallasDisponibles = colorSeleccionado
    ? sortSizes(
        [...new Set(
          producto.variants
            .filter((v) => v.color === colorSeleccionado)
            .map((v) => v.size)
        )]
      )
    : [];

  const tallasDisponiblesDelColor = colorSeleccionado
    ? producto.variants.filter(
        (v) => v.color === colorSeleccionado && v.enabled !== false && v.stock > 0
      )
    : [];

  const botonDeshabilitado =
    agregando ||
    !colorSeleccionado ||
    !tallaSeleccionada ||
    !stockDisponible ||
    stockDisponible === 0;

  const textoBoton =
    agregando
      ? 'AGREGANDO...'
      : !colorSeleccionado
        ? 'SELECCIONA COLOR'
        : !tallaSeleccionada
          ? 'SELECCIONA TALLA'
          : !stockDisponible || stockDisponible === 0
            ? 'AGOTADO'
            : 'AGREGAR AL CARRITO';

  return (
    <>
      <div className={styles.notifications}>
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`${styles.notification} ${notif.type}`}
            onClick={() => removeNotification(notif.id)}
          >
            <span className={styles.notifIcon}>
              {notif.type === 'success' ? '✓' : notif.type === 'error' ? '✗' : 'ℹ'}
            </span>
            {notif.message}
            <button className={styles.notifClose}>×</button>
          </div>
        ))}
      </div>

      <div className={styles.productPage}>
        <button onClick={() => router.push('/menu')} className={styles.backBtn}>
          ← Volver al Menú
        </button>

        <div className={styles.productContainer}>
          <div className={styles.imageSection}>
            {imagenesActuales.length > 0 ? (
              <div
                ref={imageContainerRef}
                className={styles.imageContainer}
                onClick={handleImageClick}
              >
                <div className={styles.imageWrapper}>
                  <Image
                    src={imagenesActuales[imagenActual].imageUrl}
                    alt={`${producto.name} - Imagen ${imagenActual + 1}`}
                    width={500}
                    height={667}
                    className={styles.productImage}
                    priority
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/placeholder.png';
                    }}
                  />
                </div>

                {imagenesActuales.length > 1 && (
                  <>
                    <div
                      className={`${styles.arrowNav} ${styles.arrowLeft}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        anteriorImagen();
                      }}
                    >
                      <div className={styles.arrow}>
                        <span className={styles.arrowIcon}>‹</span>
                      </div>
                    </div>
                    <div
                      className={`${styles.arrowNav} ${styles.arrowRight}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        siguienteImagen();
                      }}
                    >
                      <div className={styles.arrow}>
                        <span className={styles.arrowIcon}>›</span>
                      </div>
                    </div>
                  </>
                )}

                {imagenesActuales.length > 1 && (
                  <div className={styles.imageIndicators}>
                    {imagenesActuales.map((_, index) => (
                      <div
                        key={index}
                        className={`${styles.indicator} ${index === imagenActual ? styles.active : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToImage(index);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.imagePlaceholder}>
                <div className={styles.placeholderIcon}>🛍️</div>
                <p>Imagen no disponible</p>
              </div>
            )}
          </div>

          <div className={styles.infoSection}>
            <div className={styles.productHeader}>
              <h1 className={styles.productTitle}>{producto.name}</h1>
              <div className={styles.priceSection}>
                {(() => {
                  const variante = obtenerVarianteSeleccionada();
                  const hasCurrentDiscount = variante ? hasDiscount(variante) : false;
                  const discountPercentage = variante ? getDiscountPercentage(variante) : 0;
                  const originalPrice = variante ? getOriginalPrice(variante) : (precioSeleccionado || 0);
                  const finalPrice = precioSeleccionado || 0;

                  if (hasCurrentDiscount && discountPercentage > 0 && originalPrice > 0) {
                    return (
                      <div className={styles.discountedPriceContainer}>
                        <div className={styles.originalPriceWrapper}>
                          <span className={styles.originalPrice}>
                            {formatPrice(originalPrice)}
                          </span>
                        </div>
                        <div className={styles.finalPriceWrapper}>
                          <span className={styles.finalPrice}>
                            {formatPrice(finalPrice)}
                          </span>
                          <span className={styles.discountBadge}>
                            -{discountPercentage}%
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <span className={styles.productPrice}>
                      {formatPrice(finalPrice)}
                    </span>
                  );
                })()}
              </div>
            </div>

            <p className={styles.productDescription}>{producto.description}</p>

            {(() => {
              const variante = obtenerVarianteSeleccionada();
              const hasCurrentDiscount = variante ? hasDiscount(variante) : false;
              const discountAmount = variante ? calculateDiscountAmount(variante.price || 0, variante.discountPercentage) : 0;

              if (hasCurrentDiscount && discountAmount > 0) {
                return null;
              }
              return null;
            })()}

            <div className={styles.colorSection}>
              <label className={styles.sectionLabel}>Color</label>
              <div className={styles.colorOptions}>
                {coloresDisponibles.map((color) => (
                  <button
                    key={color}
                    className={`${styles.colorOption} ${colorSeleccionado === color ? styles.selected : ''} ${
                      colorHasDiscount(color) ? styles.withDiscount : ''
                    }`}
                    style={{ backgroundColor: getColorHex(color) }}
                    onClick={() => manejarCambioColor(color)}
                    title={color}
                  >
                    {colorSeleccionado === color && <span className={styles.checkmark}>✓</span>}
                  </button>
                ))}
              </div>

              {coloresDisponibles.length === 0 && (
                <p className={styles.noOptions}>No hay colores disponibles</p>
              )}
            </div>

            {colorSeleccionado && tallasDisponibles.length > 0 && (
              <div className={styles.sizeSection}>
                <label className={styles.sectionLabel}>Talla</label>
                <div className={styles.sizeOptions}>
                  {tallasDisponibles.map((talla) => {
                    const variante = producto.variants.find(
                      (v) => v.color === colorSeleccionado && v.size === talla
                    );
                    const stock = variante?.stock || 0;
                    const disabled = stock === 0;
                    const hasSizeDiscount = variante ? hasDiscount(variante) : false;

                    return (
                      <button
                        key={talla}
                        className={`${styles.sizeOption} ${tallaSeleccionada === talla ? styles.selected : ''} ${disabled ? styles.disabled : ''} ${
                          hasSizeDiscount ? styles.sizeWithDiscount : ''
                        }`}
                        onClick={() => !disabled && manejarCambioTalla(talla)}
                        disabled={disabled}
                        title={disabled ? 'Agotado' : 'Disponible'}
                      >
                        {talla}
                        {disabled && <span className={styles.sizeBadge}>X</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {colorSeleccionado && tallasDisponiblesDelColor.length === 0 && (
              <div className={styles.stockWarning}>
                <span className={styles.warningIcon}>⚠️</span>
                <span>Este color no tiene tallas disponibles. Prueba otro color.</span>
              </div>
            )}

            <div className={styles.actionsSection}>
              <div className={styles.quantityControl}>
                <label className={styles.quantityLabel}>Cantidad</label>
                <div className={styles.quantityInputGroup}>
                  <button
                    onClick={decrementarCantidad}
                    disabled={cantidad <= 1 || !stockDisponible || agregando}
                    className={styles.qtyBtn}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={cantidad}
                    onChange={manejarCambioCantidad}
                    min={1}
                    max={stockDisponible || 10}
                    className={styles.qtyInput}
                    disabled={!stockDisponible || agregando}
                  />
                  <button
                    onClick={incrementarCantidad}
                    disabled={cantidad >= (stockDisponible || 0) || !stockDisponible || agregando}
                    className={styles.qtyBtn}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className={styles.stockInfo}>
                {colorSeleccionado && tallaSeleccionada && stockDisponible !== null && (
                  <div className={styles.stockStatus}>
                    {stockDisponible > 0 ? (
                      <>
                        <span className={styles.stockLabel}>Stock disponible</span>
                        {stockDisponible <= 3 && (
                          <span className={styles.lowStock}> - ⚠️ Últimas unidades</span>
                        )}
                      </>
                    ) : (
                      <span className={styles.outOfStock}>❌ Agotado</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              className={`${styles.addToCartBtn} ${botonDeshabilitado ? styles.disabled : ''}`}
              onClick={agregarAlCarrito}
              disabled={botonDeshabilitado}
            >
              {textoBoton}

              {precioSeleccionado && cantidad > 0 && stockDisponible && stockDisponible > 0 && !agregando && (
                <span className={styles.totalPrice}>
                  ${((precioSeleccionado) * cantidad).toLocaleString('es-CO')}
                </span>
              )}
            </button>

            {producto.enabled === false && (
              <div className={styles.disabledWarning}>
                <span className={styles.warningIcon}>⚠️</span>
                <span>Este producto está temporalmente deshabilitado</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const Product = () => {
  return (
    <Suspense
      fallback={
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Cargando producto...</p>
        </div>
      }
    >
      <ProductContent />
    </Suspense>
  );
};

export default Product;