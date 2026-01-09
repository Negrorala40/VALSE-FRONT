'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import styles from './Product.module.css';
import { PRODUCT_DETAIL } from '../utils/Api';
import { useCart } from '../context/CartContext'; // Usar contexto del carrito

interface Imagen {
  imageUrl: string;
}

interface Variante {
  id: number;
  color: string;
  size: string;
  stock: number;
  price: number;
  productId: number;
  images: Imagen[];
}

interface Producto {
  id: number;
  name: string;
  description: string;
  gender: string;
  type: string;
  variants: Variante[];
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
    'mostaza': '#FFDB58'
  };
  return colors[colorName.toLowerCase()] || '#103359';
};

let notificationId = 0;

const ProductContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('id');
  const { addToCart } = useCart(); // Usar contexto del carrito

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
      setCargando(false);
      return;
    }

    const obtenerProducto = async () => {
      try {
        const response = await fetch(PRODUCT_DETAIL(productId));
        if (!response.ok) throw new Error('Error al cargar el producto');
        const data: Producto = await response.json();
        setProducto(data);

        const primeraVariante = data.variants[0];
        const primeraImagen = primeraVariante?.images?.[0]?.imageUrl || null;
        setImagenUrl(primeraImagen);

        const precioMinimo = Math.min(...data.variants.map((v) => v.price));
        setPrecioSeleccionado(precioMinimo);
      } catch (err: unknown) {
        setError((err as Error).message || 'Error al cargar el producto');
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
      }
    } else if (producto) {
      const precioMinimo = Math.min(...producto.variants.map((v) => v.price));
      setPrecioSeleccionado(precioMinimo);
      setStockDisponible(null);
    }
  }, [colorSeleccionado, tallaSeleccionada, producto]);

  const getUniqueColors = () => {
    if (!producto) return [];
    const colors = [...new Set(producto.variants.filter((v) => v.stock > 0).map((v) => v.color))];
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

    if (cantidad > (stockDisponible || 0)) {
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
      
    } catch (err: any) {
      console.error('Error:', err);
      
      // Si hay error de autenticación (aunque no debería con carrito anónimo)
      if (err.response?.status === 401 || err.response?.status === 403) {
        showNotification('Inicia sesión para continuar', 'info');
        router.push('/login');
      } else {
        showNotification('Error al agregar al carrito', 'error');
      }
    }
  };

  if (cargando) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>Cargando...</p>
    </div>
  );
  
  if (error) return (
    <div className={styles.errorContainer}>
      <p className={styles.errorText}>{error}</p>
      <button onClick={() => router.push('/menu')} className={styles.backButton}>
        Volver al menú
      </button>
    </div>
  );
  
  if (!producto) return (
    <div className={styles.emptyContainer}>
      <p>Producto no encontrado</p>
      <button onClick={() => router.push('/menu')} className={styles.backButton}>
        Volver al menú
      </button>
    </div>
  );

  const coloresDisponibles = getUniqueColors();
  const tallasDisponibles = colorSeleccionado
    ? [...new Set(producto.variants.filter((v) => v.color === colorSeleccionado && v.stock > 0).map((v) => v.size))]
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
          ← Volver
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
              <div className={styles.imagePlaceholder}>Imagen no disponible</div>
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
            </div>

            {colorSeleccionado && (
              <div className={styles.sizeSection}>
                <label className={styles.sectionLabel}>Talla</label>
                <div className={styles.sizeOptions}>
                  {tallasDisponibles.map((talla) => (
                    <button
                      key={talla}
                      className={`${styles.sizeOption} ${tallaSeleccionada === talla ? styles.selected : ''}`}
                      onClick={() => manejarCambioTalla(talla)}
                    >
                      {talla}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.actionsSection}>
              <div className={styles.quantityControl}>
                <label className={styles.quantityLabel}>Cantidad</label>
                <div className={styles.quantityInputGroup}>
                  <button onClick={decrementarCantidad} disabled={cantidad <= 1} className={styles.qtyBtn}>−</button>
                  <input
                    type="number"
                    value={cantidad}
                    onChange={manejarCambioCantidad}
                    min={1}
                    max={stockDisponible || 10}
                    className={styles.qtyInput}
                  />
                  <button onClick={incrementarCantidad} disabled={cantidad >= (stockDisponible || 10)} className={styles.qtyBtn}>+</button>
                </div>
              </div>

              <div className={styles.stockInfo}>
                {colorSeleccionado && tallaSeleccionada && stockDisponible !== null && (
                  <div className={styles.stockStatus}>
                    {stockDisponible > 0 ? (
                      stockDisponible < 4 ? (
                        <span className={styles.lowStock}>Últimas unidades</span>
                      ) : (
                        <span className={styles.inStock}>Disponible</span>
                      )
                    ) : (
                      <span className={styles.outOfStock}>Agotado</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              className={`${styles.addToCartBtn} ${
                !tallaSeleccionada || !colorSeleccionado || stockDisponible === 0 ? styles.disabled : ''
              }`}
              onClick={agregarAlCarrito}
              disabled={!tallaSeleccionada || !colorSeleccionado || stockDisponible === 0}
            >
              {stockDisponible === 0 ? 'AGOTADO' : !tallaSeleccionada || !colorSeleccionado ? 'SELECCIONA OPCIONES' : 'AGREGAR AL CARRITO'}
              {precioSeleccionado && cantidad > 0 && stockDisponible !== 0 && (
                <span className={styles.totalPrice}>${((precioSeleccionado) * cantidad).toLocaleString('es-CO')}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const Product = () => {
  return (
    <Suspense fallback={
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Cargando...</p>
      </div>
    }>
      <ProductContent />
    </Suspense>
  );
};

export default Product;