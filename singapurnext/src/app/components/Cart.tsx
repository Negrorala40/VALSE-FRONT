'use client';

import { CART } from '../utils/Api';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './Cart.module.css';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCart } from '../context/CartContext';
import { trackInitiateCheckout } from '../lib/tracking';

interface ApiCartItem {
  id: number;
  quantity: number;
  productVariantId: number;
  productName: string;
  productDescription?: string;
  color: string;
  size: string;
  stock?: number;
  originalPrice: number;
  priceWithDiscount: number;
  discountPercentage: number;
  discountAmount: number;
  hasDiscount: boolean;
  itemOriginalTotal: number;
  itemDiscountedTotal: number;
  itemSavings: number;
  imageUrl: string;
  userId?: number;
  sessionId?: string;
}

interface CartItemView {
  id: string;
  productVariantId: string;
  image: string;
  name: string;
  price: number;
  originalPrice: number;
  size: string;
  color: string;
  quantity: number;
  stock?: number;
  hasDiscount: boolean;
  discountPercentage: number;
  discountAmount: number;
  savings: number;
}

interface CartTotals {
  subtotal: number;
  shippingCost: number;
  total: number;
  totalItems: number;
  itemCount: number;
  discountSavings: number;
  originalSubtotal: number;
}

interface CartProps {
  onClose: () => void;
  isOpen: boolean;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0 }).format(price);

const Cart: React.FC<CartProps> = ({ onClose, isOpen }) => {
  const cartRef = useRef<HTMLDivElement | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const router = useRouter();

  const {
    cartItems: contextCartItems,
    refreshCart,
    sessionId: contextSessionId
  } = useCart();

  const [cartItems, setCartItems] = useState<CartItemView[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(contextSessionId);
  const [retryCount, setRetryCount] = useState(0);
  const [cartTotals, setCartTotals] = useState<CartTotals>({
    subtotal: 0,
    shippingCost: 0,
    total: 0,
    totalItems: 0,
    itemCount: 0,
    discountSavings: 0,
    originalSubtotal: 0
  });
  const maxRetries = 2;

  const CART_SESSION_HEADER = 'X-Cart-Session-Id';
  const CART_SESSION_KEY = 'cartSessionId';

  const localTotalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const localTotalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

  const subtotal = cartTotals.subtotal || localTotalPrice;
  const shippingCost = cartTotals.shippingCost || 0;
  const total = cartTotals.total || (localTotalPrice + shippingCost);
  const totalItems = cartTotals.totalItems || localTotalItems;
  const discountSavings = cartTotals.discountSavings || 0;
  const originalSubtotal = cartTotals.originalSubtotal || subtotal;

  const mapContextItemsToView = useCallback((items: typeof contextCartItems): CartItemView[] => {
    return items.map((item) => ({
      id: item.id.toString(),
      productVariantId: item.productVariantId.toString(),
      image: item.imageUrl?.trim() || '/images/placeholder.png',
      name: item.productName?.trim() || 'Producto sin nombre',
      price: item.priceWithDiscount || item.originalPrice || 0,
      originalPrice: item.originalPrice || 0,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      stock: item.stock || 0,
      hasDiscount: item.hasDiscount || false,
      discountPercentage: item.discountPercentage || 0,
      discountAmount: 0,
      savings: 0
    }));
  }, []);

  useEffect(() => {
    setCartItems(mapContextItemsToView(contextCartItems));
  }, [contextCartItems, mapContextItemsToView]);

  useEffect(() => {
    if (contextSessionId !== undefined) {
      setSessionId(contextSessionId);
    }
  }, [contextSessionId]);

  const getSessionId = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CART_SESSION_KEY) || sessionId;
    }
    return null;
  };

  const saveSessionIdFromHeaders = (headers: Headers) => {
    const newSessionId = headers.get(CART_SESSION_HEADER);
    if (newSessionId && newSessionId.trim() !== '' && newSessionId !== 'cleared') {
      localStorage.setItem(CART_SESSION_KEY, newSessionId);
      setSessionId(newSessionId);
      console.log('📥 SessionId guardado desde headers:', newSessionId.substring(0, 8) + '...');
    } else if (newSessionId === 'cleared') {
      localStorage.removeItem(CART_SESSION_KEY);
      setSessionId(null);
      console.log('🗑️ SessionId limpiado');
    }
  };

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    const currentSessionId = getSessionId();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (currentSessionId) {
      headers[CART_SESSION_HEADER] = currentSessionId;
      console.log('📤 Enviando sessionId en header:', currentSessionId.substring(0, 8) + '...');
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  };

  const fetchWithSession = async (url: string, options: RequestInit = {}) => {
    const headers = getHeaders();

    console.log('🔗 Fetch URL:', url);
    console.log('📋 Headers enviados:', Object.keys(headers));

    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...headers,
        ...options.headers
      }
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Array.from(response.headers.entries()));

    saveSessionIdFromHeaders(response.headers);

    return response;
  };

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setHasFetched(false);
    }, 400);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && cartRef.current && !cartRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, handleClose]);

  const fetchCart = useCallback(async (forceRefresh = false) => {
    if (isFetching && !forceRefresh) return;

    setIsFetching(true);

    try {
      console.log('🛒 Obteniendo carrito con totales...');

      const response = await fetchWithSession(`${CART}/with-totals`);

      console.log('🛒 Fetch cart - Status:', response.status);
      console.log('🛒 SessionId actual:', getSessionId());

      if (response.status === 404 || response.status === 400) {
        console.log('📭 Carrito vacío o sin sesión');
        setCartItems([]);
        setCartTotals({
          subtotal: 0,
          shippingCost: 0,
          total: 0,
          totalItems: 0,
          itemCount: 0,
          discountSavings: 0,
          originalSubtotal: 0
        });
        setRetryCount(0);
      } else if (response.status === 401) {
        console.log('🔐 No autorizado');
        setCartItems([]);
        setCartTotals({
          subtotal: 0,
          shippingCost: 0,
          total: 0,
          totalItems: 0,
          itemCount: 0,
          discountSavings: 0,
          originalSubtotal: 0
        });
      } else if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en respuesta:', errorText);

        if (retryCount < maxRetries) {
          console.log(`🔄 Reintentando (${retryCount + 1}/${maxRetries})...`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => fetchCart(true), 1000);
          return;
        } else {
          throw new Error(`Error ${response.status}: ${errorText}`);
        }
      } else {
        const data = await response.json();
        console.log('✅ Carrito obtenido con totales:', data);

        const transformedItems: CartItemView[] = data.items.map((item: ApiCartItem) => ({
          id: item.id.toString(),
          productVariantId: item.productVariantId.toString(),
          image: item.imageUrl?.trim() || '/images/placeholder.png',
          name: item.productName?.trim() || 'Producto sin nombre',
          price: item.priceWithDiscount || item.originalPrice || 0,
          originalPrice: item.originalPrice || 0,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          stock: item.stock || 0,
          hasDiscount: item.hasDiscount || false,
          discountPercentage: item.discountPercentage || 0,
          discountAmount: item.discountAmount || 0,
          savings: item.itemSavings || 0
        }));

        setCartItems(transformedItems);

        setCartTotals({
          subtotal: data.subtotal || 0,
          shippingCost: data.shippingCost || 0,
          total: data.total || 0,
          totalItems: data.totalItems || 0,
          itemCount: data.itemCount || 0,
          discountSavings: data.discountSavings || 0,
          originalSubtotal: data.originalSubtotal || data.subtotal || 0
        });

        setRetryCount(0);

        refreshCart().catch(console.error);
      }
      setHasFetched(true);
    } catch (err) {
      console.error('Error al cargar el carrito:', err);
      setCartItems([]);
      setCartTotals({
        subtotal: 0,
        shippingCost: 0,
        total: 0,
        totalItems: 0,
        itemCount: 0,
        discountSavings: 0,
        originalSubtotal: 0
      });
      setHasFetched(true);

      if (retryCount >= maxRetries) {
        localStorage.removeItem(CART_SESSION_KEY);
        setSessionId(null);
        console.log('🧹 SessionId limpiado por errores persistentes');
      }
    } finally {
      setIsFetching(false);
    }
  }, [isFetching, retryCount, refreshCart]);

  useEffect(() => {
    if (isOpen && !hasFetched && !isFetching) {
      const savedSessionId = localStorage.getItem(CART_SESSION_KEY);
      if (savedSessionId) {
        setSessionId(savedSessionId);
        console.log('📦 SessionId cargado desde localStorage:', savedSessionId.substring(0, 8) + '...');
      } else {
        console.log('📭 No hay sessionId guardado en localStorage');
      }

      fetchCart();
    }
  }, [isOpen, fetchCart, hasFetched, isFetching]);

  useEffect(() => {
    if (isOpen && hasFetched) {
      const checkSession = () => {
        const currentSessionId = getSessionId();
        const savedSessionId = localStorage.getItem(CART_SESSION_KEY);

        if (currentSessionId !== savedSessionId) {
          console.log('🔄 SessionId cambió, refrescando carrito...');
          setHasFetched(false);
        }
      };

      const interval = setInterval(checkSession, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, hasFetched]);

  const updateQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const item = cartItems.find(i => i.id === itemId);
    if (!item) return;

    if (item.stock && newQuantity > item.stock) {
      alert(`No hay suficiente stock disponible (máximo ${item.stock})`);
      return;
    }

    try {
      console.log(`📊 Actualizando cantidad del ítem ${itemId} a ${newQuantity}`);

      const response = await fetchWithSession(`${CART}/update/${itemId}?quantity=${newQuantity}`, {
        method: 'PUT'
      });

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('No hay sesión de carrito. Agrega un producto primero.');
        }
        throw new Error('Error actualizando cantidad');
      }

      const updatedCart = cartItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );
      setCartItems(updatedCart);

      console.log('✅ Cantidad actualizada');

      fetchCart(true);
    } catch (err) {
      console.error('Error actualizando cantidad:', err);
      alert(err instanceof Error ? err.message : 'Error al actualizar la cantidad');
    }
  }, [cartItems, fetchCart]);

  const removeItem = useCallback(async (itemId: string) => {
    try {
      console.log(`➖ Eliminando ítem ${itemId}`);

      const response = await fetchWithSession(`${CART}/remove/${itemId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('No hay sesión de carrito');
        }
        throw new Error('Error eliminando el producto');
      }

      const updatedCart = cartItems.filter(item => item.id !== itemId);
      setCartItems(updatedCart);

      console.log('✅ Ítem eliminado');

      fetchCart(true);
    } catch (err) {
      console.error('Error eliminando producto:', err);
      alert(err instanceof Error ? err.message : 'Error al eliminar el producto');
    }
  }, [cartItems, fetchCart]);

  const handleCheckout = useCallback(() => {
    if (cartItems.length === 0) {
      alert('Tu carrito está vacío');
      return;
    }
  
    trackInitiateCheckout({
      items: cartItems.map((item) => ({
        id: String(item.productVariantId),
        quantity: item.quantity,
        item_price: item.price,
      })),
      value: total,
      numItems: totalItems,
      currency: "COP",
    });
    
    router.push('/checkout');
    handleClose();
  }, [cartItems, total, totalItems, router, handleClose]);

  const handleContinueShopping = useCallback(() => {
    router.push('/menu');
    handleClose();
  }, [router, handleClose]);

  const createNewSession = async () => {
    try {
      console.log('🆕 Creando nueva sesión...');
      const response = await fetchWithSession(`${CART}/new-session`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Nueva sesión creada:', data.sessionId.substring(0, 8) + '...');
        alert('Nueva sesión creada. Por favor, intenta nuevamente.');
        setHasFetched(false);
        await refreshCart();
      }
    } catch (err) {
      console.error('Error creando nueva sesión:', err);
    }
  };

  const getSafeImageUrl = useCallback((url: string | undefined): string => {
    if (!url || url.trim() === '') {
      return '/images/placeholder.png';
    }
    return url.trim();
  }, []);

  const getSafeName = useCallback((name: string | undefined): string => {
    if (!name || name.trim() === '') {
      return 'Producto sin nombre';
    }
    return name.trim();
  }, []);

  const getColorStyle = useCallback((color: string): { background: string; border?: string } => {
    const colorLower = color.toLowerCase().trim();

    switch (colorLower) {
      case 'azul':
        return { background: '#103359' };
      case 'verde':
        return { background: '#3DB28A' };
      case 'rosa':
        return { background: '#F7D1D9' };
      case 'morado':
      case 'lila':
      case 'violeta':
        return { background: '#B0A9C6' };
      case 'amarillo':
        return {
          background: '#FBEAD4',
          border: '1px solid rgba(0,0,0,0.1)'
        };
      case 'negro':
        return {
          background: '#000000',
          border: '1px solid rgba(255,255,255,0.3)'
        };
      case 'blanco':
        return {
          background: '#FFFFFF',
          border: '1px solid rgba(0,0,0,0.1)'
        };
      case 'rojo':
        return { background: '#E9566D' };
      case 'naranja':
        return { background: '#F47B47' };
      case 'beige':
      case 'beis':
        return {
          background: '#F5F5DC',
          border: '1px solid rgba(0,0,0,0.1)'
        };
      case 'gris':
        return { background: '#808080' };
      case 'celeste':
        return { background: '#87CEEB' };
      case 'turquesa':
        return { background: '#40E0D0' };
      case 'fucsia':
        return { background: '#FF00FF' };
      case 'coral':
        return { background: '#FF7F50' };
      case 'marron':
      case 'café':
        return { background: '#8B4513' };
      case 'dorado':
        return {
          background: '#FFD700',
          border: '1px solid rgba(0,0,0,0.1)'
        };
      case 'plateado':
        return {
          background: '#C0C0C0',
          border: '1px solid rgba(0,0,0,0.1)'
        };
      case 'lavanda':
        return { background: '#E6E6FA' };
      case 'menta':
        return { background: '#98FF98' };
      case 'melon':
        return { background: '#FDBCB4' };
      case 'ocre':
        return { background: '#CC7722' };
      case 'mostaza':
        return {
          background: '#FFDB58',
          border: '1px solid rgba(0,0,0,0.1)'
        };
      case 'salmon':
        return { background: '#FA8072' };
      case 'vino':
        return { background: '#722F37' };
      case 'oliva':
        return { background: '#808000' };
      default:
        const colors = [
          '#103359', '#3DB28A', '#E9566D', '#806FF7', '#F47B47',
          '#FFD449', '#000000', '#FFFFFF', '#F5F5DC', '#808080',
          '#87CEEB', '#40E0D0', '#FF00FF', '#FF7F50', '#8B4513'
        ];
        const hash = colorLower.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return {
          background: colors[hash % colors.length],
          border: '1px solid rgba(0,0,0,0.1)'
        };
    }
  }, []);

  const debugSession = () => {
    const currentSessionId = getSessionId();
    const allCookies = document.cookie;
    console.log('🔍 SessionId actual:', currentSessionId);
    console.log('🍪 Cookies:', allCookies);
    console.log('📦 LocalStorage session:', localStorage.getItem(CART_SESSION_KEY));

    alert(`SessionId: ${currentSessionId ? currentSessionId.substring(0, 8) + '...' : 'No disponible'}\nLocalStorage: ${localStorage.getItem(CART_SESSION_KEY) ? 'Sí' : 'No'}\nCookies: ${allCookies.length > 0 ? 'Sí' : 'No'}`);
  };

  const getShippingDisplay = () => {
    if (shippingCost === 0) {
      return <span className={styles.shippingBadge}>Gratis</span>;
    }
    return <span>${formatPrice(shippingCost)}</span>;
  };

  const renderItemPrice = (item: CartItemView) => {
    if (item.hasDiscount && item.discountPercentage > 0) {
      const totalDiscounted = item.price * item.quantity;
      const totalOriginal = item.originalPrice * item.quantity;

      return (
        <div className={styles.cartItemPriceContainer}>
          <div className={styles.itemPriceDiscounted}>
            <div className={styles.itemOriginalPriceWrapper}>
              <span className={styles.itemOriginalPrice}>
                ${formatPrice(totalOriginal)}
              </span>
            </div>
            <div className={styles.itemFinalPriceWrapper}>
              <span className={styles.itemFinalPrice}>
                ${formatPrice(totalDiscounted)}
              </span>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <p className={styles.cartItemPrice}>${formatPrice(item.price * item.quantity)}</p>
      );
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className={`${styles.cartOverlay} ${isOpen ? styles.open : ''} ${isClosing ? styles.closing : ''}`}
          onClick={handleClose}
        />
      )}

      <div
        ref={cartRef}
        className={`${styles.cartPanel} ${isOpen ? styles.open : ''} ${isClosing ? styles.closing : ''}`}
      >
        {process.env.NODE_ENV === 'development' && (
          <div className={styles.debugButtons}>
            <button
              onClick={debugSession}
              className={styles.debugBtn}
              title="Debug session"
            >
              🔍 Session
            </button>
            <button
              onClick={createNewSession}
              className={styles.debugBtn}
              title="Crear nueva sesión"
            >
              🆕 Nueva Sesión
            </button>
          </div>
        )}

        <div className={styles.cartDecorationTop}></div>

        <div className={styles.cartHeader}>
          <div className={styles.cartTitle}>
            <div className={styles.cartIconWrapper}>
              <svg className={styles.cartIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {totalItems > 0 && <span className={styles.cartBadge}>{totalItems}</span>}
            </div>
            <div className={styles.cartTitleText}>
              <h2>Tu Carrito</h2>
              <span className={styles.cartSubtitle}>
                {totalItems === 0 ? 'Vacío' : `${totalItems} producto${totalItems > 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Cerrar carrito">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {isFetching ? (
          <div className={styles.cartLoading}>
            <div className={styles.loadingSpinner}></div>
            <p>Cargando carrito...</p>
            {retryCount > 0 && (
              <small>Reintentando... ({retryCount}/{maxRetries})</small>
            )}
          </div>
        ) : cartItems.length === 0 ? (
          <div className={styles.cartEmpty}>
            <div className={styles.cartEmptyIllustration}>
              <div className={styles.emptyBag}>
                <svg viewBox="0 0 80 80" fill="none">
                  <rect x="10" y="20" width="60" height="50" rx="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M25 20V15C25 10 30 5 40 5C50 5 55 10 55 15V20" stroke="currentColor" strokeWidth="2" />
                  <circle cx="30" cy="35" r="3" fill="currentColor" opacity="0.3" />
                  <circle cx="50" cy="35" r="3" fill="currentColor" opacity="0.3" />
                  <path
                    d="M32 48C32 48 36 52 40 52C44 52 48 48 48 48"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className={styles.emptyStars}>
                <span className={`${styles.star} ${styles.star1}`}>★</span>
                <span className={`${styles.star} ${styles.star2}`}>★</span>
                <span className={`${styles.star} ${styles.star3}`}>★</span>
              </div>
            </div>
            <h3 className={styles.emptyTitle}>Tu carrito está vacío</h3>
            <p className={styles.emptyMessage}>
              Explora nuestra colección de pijamas y encuentra el favorito de tus pequeños
            </p>
            {!sessionId && (
              <div className={styles.sessionStatus}>
                <small>Estado: Sin sesión activa</small>
                <button
                  onClick={createNewSession}
                  className={styles.sessionBtn}
                >
                  Crear nueva sesión
                </button>
              </div>
            )}
            <button onClick={handleContinueShopping} className={styles.cartExploreBtn}>
              <span>Explorar productos</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <div className={styles.cartItemsContainer}>
              <ul className={styles.cartItems}>
                {cartItems.map((item, index) => {
                  const safeImage = getSafeImageUrl(item.image);
                  const safeName = getSafeName(item.name);
                  const colorStyle = getColorStyle(item.color);

                  return (
                    <li key={`${item.id}-${index}`} className={styles.cartItem}>
                      <div className={styles.cartItemImage}>
                        <Image
                          src={safeImage}
                          alt={safeName}
                          width={80}
                          height={80}
                          loading="lazy"
                          style={{ objectFit: 'cover' }}
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.src = '/images/placeholder.png';
                          }}
                        />
                        {item.hasDiscount && item.discountPercentage > 0 && (
                          <div className={styles.itemImageDiscountBadge}>
                            -{item.discountPercentage}%
                          </div>
                        )}
                      </div>
                      <div className={styles.cartItemContent}>
                        <div className={styles.cartItemHeader}>
                          <p className={styles.cartItemName}>{safeName}</p>
                          <button
                            className={styles.btnRemove}
                            onClick={() => removeItem(item.id)}
                            aria-label="Eliminar producto"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                        <div className={styles.cartItemTags}>
                          <span className={`${styles.itemTag} ${styles.tagSize}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <path d="M9 9h6v6H9z" />
                            </svg>
                            {item.size || 'N/A'}
                          </span>
                          <span className={`${styles.itemTag} ${styles.tagColor}`}>
                            <span
                              className={styles.colorDot}
                              style={colorStyle}
                            ></span>
                            {item.color || 'N/A'}
                          </span>
                        </div>
                        <div className={styles.cartItemFooter}>
                          <div className={styles.quantitySelector}>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              aria-label="Reducir cantidad"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                            </button>
                            <span className={styles.quantityValue}>{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.stock !== undefined && item.quantity >= item.stock}
                              aria-label="Aumentar cantidad"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                            </button>
                          </div>
                          {renderItemPrice(item)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className={styles.cartSummary}>
              <div className={`${styles.summaryRow} ${styles.summarySubtotal}`}>
                <span>Subtotal</span>
                {discountSavings > 0 ? (
                  <div className={styles.subtotalWithDiscount}>
                    <span className={styles.originalSubtotal}>${formatPrice(originalSubtotal)}</span>
                    <span className={styles.finalSubtotal}>${formatPrice(subtotal)}</span>
                  </div>
                ) : (
                  <span>${formatPrice(subtotal)}</span>
                )}
              </div>

              {discountSavings > 0 && (
                <div className={`${styles.summaryRow} ${styles.summaryDiscount}`}>
                  <span>Descuento</span>
                  <span className={styles.discountSavings}>-${formatPrice(discountSavings)}</span>
                </div>
              )}

              <div className={`${styles.summaryRow} ${styles.summaryShipping}`}>
                <span>Envío</span>
                {getShippingDisplay()}
              </div>

              <div className={styles.summaryDivider}></div>

              <div className={styles.cartTotal}>
                <span className={styles.totalLabel}>Total</span>
                <span className={styles.totalAmount}>${formatPrice(total)}</span>
              </div>

              <div className={styles.cartActions}>
                <button className={styles.btnCheckout} onClick={handleCheckout}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  <span>Proceder al Pago</span>
                </button>
                <button className={styles.cartContinueBtn} onClick={handleContinueShopping}>
                  Seguir Comprando
                </button>
              </div>

              <div className={styles.cartTrustBadges}>
                <div className={styles.trustBadge}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                  <span>Pago seguro</span>
                </div>
                <div className={styles.trustBadge}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  <span>Envío Seguro</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Cart;