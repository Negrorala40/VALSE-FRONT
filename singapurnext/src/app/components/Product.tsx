  'use client';

  import React, { useState, useEffect, Suspense } from 'react';
  import { useRouter, useSearchParams } from 'next/navigation';
  import Image from 'next/image';
  import styles from './Product.module.css';
  import { PRODUCT_DETAIL } from '../utils/Api';
  import { useCart } from '../context/CartContext';
  import { MENU_PRODUCTS } from '../utils/Api';

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
      'dorado': '#FFD700',
      'verde claro': '#90EE90',
      'marron': '#8B4513',
      'fucsia': '#FF00FF',
      'aguamarina': '#7FFFD4'
    };
    
    // Buscar coincidencia parcial
    const lowerColor = colorName.toLowerCase();
    for (const [key, value] of Object.entries(colors)) {
      if (lowerColor.includes(key) || key.includes(lowerColor)) {
        return value;
      }
    }
    
    return '#103359';
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
    const [imagenUrl, setImagenUrl] = useState<string | null>(null);
    const [precioSeleccionado, setPrecioSeleccionado] = useState<number | null>(null);
    const [notifications, setNotifications] = useState<Array<{id: number, message: string, type: 'success' | 'error' | 'info'}>>([]);
    const [productNotFound, setProductNotFound] = useState<boolean>(false);

    const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
      const id = ++notificationId;
      const newNotification = { id, message, type };
      setNotifications(prev => [...prev, newNotification]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
      }, 3000);
    };

    const removeNotification = (id: number) => {
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    };

    useEffect(() => {
      if (!productId) {
        setError('Producto no encontrado');
        setProductNotFound(true);
        setCargando(false);
        return;
      }

      const obtenerProducto = async () => {
        try {
          // Primero intentar con el endpoint activo (público)
          let response = await fetch(`${MENU_PRODUCTS}/active/${productId}`);

          
          if (!response.ok) {
            // Si no existe el endpoint /active, intentar con el normal
            if (response.status === 404) {
              response = await fetch(PRODUCT_DETAIL(productId));
            }
            
            if (!response.ok) {
              throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
          }

          const data: Producto = await response.json();
          
          // Verificar si el producto está habilitado
          if (data.enabled === false) {
            setError('Este producto no está disponible actualmente');
            setProductNotFound(true);
            setCargando(false);
            return;
          }

          // Filtrar solo variantes habilitadas y con stock
          const availableVariants = data.variants.filter(variant => 
            variant.enabled !== false && variant.stock > 0
          );

          if (availableVariants.length === 0) {
            setError('Este producto no tiene variantes disponibles');
            setProductNotFound(true);
            setCargando(false);
            return;
          }

          // Actualizar producto con solo variantes disponibles
          setProducto({
            ...data,
            variants: availableVariants
          });

          // Encontrar primera variante disponible
          const primeraVariante = availableVariants[0];
          const primeraImagen = primeraVariante?.images?.[0]?.imageUrl || null;
          setImagenUrl(primeraImagen);

          // Establecer color inicial
          if (primeraVariante.color) {
            setColorSeleccionado(primeraVariante.color);
          }

          // Calcular precio mínimo
          const precios = availableVariants.map(v => v.price);
          const precioMinimo = precios.length > 0 ? Math.min(...precios) : 0;
          setPrecioSeleccionado(precioMinimo);

        } catch (err: unknown) {
          console.error('Error obteniendo producto:', err);
          
          const errorMessage = err instanceof Error ? err.message : 'Error al cargar el producto';
          if (errorMessage.includes('404') || errorMessage.includes('not found')) {
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
          setPrecioSeleccionado(variante.price);
          if (variante.images && variante.images.length > 0) {
            setImagenUrl(variante.images[0].imageUrl);
          }
        } else {
          setStockDisponible(null);
        }
      } else if (producto && colorSeleccionado) {
        // Si solo hay color seleccionado, mostrar precio del primer color
        const primeraVarianteColor = producto.variants.find(v => v.color === colorSeleccionado);
        if (primeraVarianteColor) {
          setPrecioSeleccionado(primeraVarianteColor.price);
        }
      } else if (producto) {
        // Calcular precio mínimo de todas las variantes
        const precioMinimo = Math.min(...producto.variants.map(v => v.price));
        setPrecioSeleccionado(precioMinimo);
        setStockDisponible(null);
      }
    }, [colorSeleccionado, tallaSeleccionada, producto]);

    const getUniqueColors = () => {
      if (!producto) return [];
      const colors = [...new Set(producto.variants.map((v) => v.color))];
      return colors.slice(0, 6);
    };

    const manejarCambioColor = (color: string) => {
      setColorSeleccionado(color);
      setTallaSeleccionada('');
      setStockDisponible(null);
      
      if (producto) {
        const variante = producto.variants.find((v) => v.color === color);
        if (variante) {
          setPrecioSeleccionado(variante.price);
          if (variante.images?.[0]?.imageUrl) {
            setImagenUrl(variante.images[0].imageUrl);
          }
        }
      }
    };

    const manejarCambioTalla = (talla: string) => {
      setTallaSeleccionada(talla);
    };

    const manejarCambioCantidad = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      if (value >= 1 && value <= (stockDisponible || 10)) {
        setCantidad(value);
      }
    };

    const incrementarCantidad = () => {
      if (cantidad < (stockDisponible || 10)) {
        setCantidad(prev => prev + 1);
      }
    };

    const decrementarCantidad = () => {
      if (cantidad > 1) {
        setCantidad(prev => prev - 1);
      }
    };

    const agregarAlCarrito = async () => {
      if (!tallaSeleccionada || !colorSeleccionado) {
        showNotification('Selecciona talla y color', 'info');
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
        showNotification('Variante no encontrada', 'error');
        return;
      }

      try {
        // Usar el contexto del carrito
        await addToCart(variante.id, cantidad);
        
        showNotification('¡Agregado al carrito!', 'success');
        
        // Redirigir al menú después de un breve delay
        setTimeout(() => router.push('/menu'), 1500);
        
      } catch (err: unknown) {
        console.error('Error:', err);
        
        // Verificar si es un error de autenticación
        const errorData = err as ErrorResponse;
        
        // Si hay error de autenticación
        if (errorData.response?.status === 401 || errorData.response?.status === 403) {
          showNotification('Inicia sesión para continuar', 'info');
          router.push('/login');
        } else {
          const errorMessage = errorData.message || 'Error al agregar al carrito';
          showNotification(errorMessage, 'error');
        }
      }
    };

    if (cargando) return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Cargando producto...</p>
      </div>
    );
    
    if (error && productNotFound) return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2 className={styles.errorTitle}>Producto no disponible</h2>
        <p className={styles.errorText}>{error}</p>
        <button onClick={() => router.push('/menu')} className={styles.backButton}>
          Volver al menú
        </button>
      </div>
    );
    
    if (!producto) return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIcon}>❓</div>
        <h2 className={styles.emptyTitle}>Producto no encontrado</h2>
        <p>El producto que buscas no está disponible o no existe.</p>
        <button onClick={() => router.push('/menu')} className={styles.backButton}>
          Volver al menú
        </button>
      </div>
    );

    const coloresDisponibles = getUniqueColors();
    const tallasDisponibles = colorSeleccionado
      ? [...new Set(producto.variants
          .filter((v) => v.color === colorSeleccionado)
          .map((v) => v.size))]
      : [];

    return (
      <>
        <div className={styles.notifications}>
          {notifications.map((notif) => (
            <div key={notif.id} className={`${styles.notification} ${notif.type}`} onClick={() => removeNotification(notif.id)}>
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
              {imagenUrl ? (
                <Image
                  src={imagenUrl}
                  alt={producto.name}
                  width={500}
                  height={667}
                  className={styles.productImage}
                  priority
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/placeholder.png';
                  }}
                />
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
                  <span className={styles.productPrice}>
                    {precioSeleccionado !== null ? `$${precioSeleccionado.toLocaleString('es-CO')}` : 'Selecciona opciones'}
                  </span>
                </div>
              </div>

              <p className={styles.productDescription}>{producto.description}</p>

              <div className={styles.colorSection}>
                <label className={styles.sectionLabel}>Color</label>
                <div className={styles.colorOptions}>
                  {coloresDisponibles.map((color) => (
                    <button
                      key={color}
                      className={`${styles.colorOption} ${colorSeleccionado === color ? styles.selected : ''}`}
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
                      const variante = producto.variants.find(v => 
                        v.color === colorSeleccionado && v.size === talla
                      );
                      const stock = variante?.stock || 0;
                      const disabled = stock === 0;
                      
                      return (
                        <button
                          key={talla}
                          className={`${styles.sizeOption} ${tallaSeleccionada === talla ? styles.selected : ''} ${disabled ? styles.disabled : ''}`}
                          onClick={() => !disabled && manejarCambioTalla(talla)}
                          disabled={disabled}
                          title={disabled ? 'Agotado' : `Stock: ${stock}`}
                        >
                          {talla}
                          {disabled && <span className={styles.sizeBadge}>X</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {colorSeleccionado && tallasDisponibles.length === 0 && (
                <div className={styles.stockWarning}>
                  <span className={styles.warningIcon}>⚠️</span>
                  <span>No hay tallas disponibles para este color</span>
                </div>
              )}

              <div className={styles.actionsSection}>
                <div className={styles.quantityControl}>
                  <label className={styles.quantityLabel}>Cantidad</label>
                  <div className={styles.quantityInputGroup}>
                    <button 
                      onClick={decrementarCantidad} 
                      disabled={cantidad <= 1 || !stockDisponible}
                      className={styles.qtyBtn}
                    >−</button>
                    <input
                      type="number"
                      value={cantidad}
                      onChange={manejarCambioCantidad}
                      min={1}
                      max={stockDisponible || 10}
                      className={styles.qtyInput}
                      disabled={!stockDisponible}
                    />
                    <button 
                      onClick={incrementarCantidad} 
                      disabled={cantidad >= (stockDisponible || 0) || !stockDisponible}
                      className={styles.qtyBtn}
                    >+</button>
                  </div>
                </div>

                <div className={styles.stockInfo}>
                  {colorSeleccionado && tallaSeleccionada && stockDisponible !== null && (
                    <div className={styles.stockStatus}>
                      {stockDisponible > 0 ? (
                        <>
                          <span className={styles.stockLabel}>Stock disponible:</span>
                          <span className={styles.stockNumber}>{stockDisponible}</span>
                          {stockDisponible < 4 && (
                            <span className={styles.lowStock}>⚠️ Últimas unidades</span>
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
                className={`${styles.addToCartBtn} ${
                  !tallaSeleccionada || !colorSeleccionado || !stockDisponible || stockDisponible === 0 ? styles.disabled : ''
                }`}
                onClick={agregarAlCarrito}
                disabled={!tallaSeleccionada || !colorSeleccionado || !stockDisponible || stockDisponible === 0}
              >
                {!stockDisponible || stockDisponible === 0 ? 'AGOTADO' : 
                !tallaSeleccionada || !colorSeleccionado ? 'SELECCIONA OPCIONES' : 'AGREGAR AL CARRITO'}
                
                {precioSeleccionado && cantidad > 0 && stockDisponible && stockDisponible > 0 && (
                  <span className={styles.totalPrice}>${((precioSeleccionado) * cantidad).toLocaleString('es-CO')}</span>
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
      <>
        <Suspense fallback={
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Cargando producto...</p>
          </div>
        }>
          <ProductContent />
        </Suspense>
      </>
    );
  };

  export default Product;