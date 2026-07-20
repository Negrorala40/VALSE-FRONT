'use client';

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react';
import Cookies from 'js-cookie';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { CART } from '../utils/Api';
import { useCart } from '../context/CartContext';
import { trackInitiateCheckout } from '../lib/tracking';
import { showToast } from '../utils/toast';
import styles from './Cart.module.css';

interface ApiCartItem {
  id: number;
  quantity: number;
  productVariantId: number;
  productName: string;
  color: string;
  size: string;
  stock?: number;
  originalPrice: number;
  priceWithDiscount: number;
  discountPercentage: number;
  discountAmount: number;
  hasDiscount: boolean;
  itemSavings: number;
  imageUrl: string;
}

interface ApiCartResponse {
  items?: ApiCartItem[];
  subtotal?: number;
  shippingCost?: number;
  total?: number;
  totalItems?: number;
  itemCount?: number;
  discountSavings?: number;
  originalSubtotal?: number;
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

type FacebookPixel = (
  command: 'track' | 'trackCustom',
  eventName: string,
  payload: Record<string, unknown>
) => void;

const CART_SESSION_STORAGE_KEY = 'cartSessionId';
const CART_SESSION_COOKIE_KEY = 'cart_session_id';
const CART_SESSION_HEADER = 'X-Cart-Session-Id';
const SESSION_EXPIRATION_DAYS = 7;
const MAX_RETRIES = 2;
const CLOSE_ANIMATION_MS = 360;

const EMPTY_TOTALS: CartTotals = {
  subtotal: 0,
  shippingCost: 0,
  total: 0,
  totalItems: 0,
  itemCount: 0,
  discountSavings: 0,
  originalSubtotal: 0
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0
  }).format(price);

const wait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const getStoredSessionId = () => {
  if (typeof window === 'undefined') return null;

  return (
    localStorage.getItem(CART_SESSION_STORAGE_KEY) ||
    Cookies.get(CART_SESSION_COOKIE_KEY) ||
    null
  );
};

const persistSessionId = (sessionId: string) => {
  localStorage.setItem(CART_SESSION_STORAGE_KEY, sessionId);

  Cookies.set(CART_SESSION_COOKIE_KEY, sessionId, {
    expires: SESSION_EXPIRATION_DAYS,
    path: '/',
    sameSite: 'lax',
    secure: window.location.protocol === 'https:'
  });
};

const clearStoredSessionId = () => {
  localStorage.removeItem(CART_SESSION_STORAGE_KEY);
  Cookies.remove(CART_SESSION_COOKIE_KEY, { path: '/' });
};

const getFacebookPixel = (): FacebookPixel | undefined => {
  if (typeof window === 'undefined') return undefined;
  return (window as typeof window & { fbq?: FacebookPixel }).fbq;
};

const trackViewCart = (
  items: CartItemView[],
  value: number,
  totalItems: number
) => {
  getFacebookPixel()?.('trackCustom', 'ViewCart', {
    content_ids: items.map((item) => item.productVariantId),
    contents: items.map((item) => ({
      id: item.productVariantId,
      quantity: item.quantity,
      item_price: item.price
    })),
    value,
    currency: 'COP',
    num_items: totalItems
  });
};

const trackRemoveFromCart = (item: CartItemView) => {
  getFacebookPixel()?.('track', 'RemoveFromCart', {
    content_ids: [item.productVariantId],
    contents: [
      {
        id: item.productVariantId,
        quantity: item.quantity,
        item_price: item.price
      }
    ],
    value: item.price * item.quantity,
    currency: 'COP'
  });
};

const trackQuantityChange = (
  item: CartItemView,
  previousQuantity: number,
  newQuantity: number
) => {
  getFacebookPixel()?.('trackCustom', 'UpdateCartQuantity', {
    content_ids: [item.productVariantId],
    value: item.price * newQuantity,
    currency: 'COP',
    product_name: item.name,
    color: item.color,
    size: item.size,
    previous_quantity: previousQuantity,
    new_quantity: newQuantity
  });
};

const mapApiItem = (item: ApiCartItem): CartItemView => {
  const originalPrice = Number(item.originalPrice || 0);
  const discountedPrice = Number(item.priceWithDiscount || 0);
  const hasDiscount =
    Boolean(item.hasDiscount) &&
    Number(item.discountPercentage || 0) > 0 &&
    discountedPrice > 0;

  return {
    id: String(item.id),
    productVariantId: String(item.productVariantId),
    image: item.imageUrl?.trim() || '/images/placeholder.png',
    name: item.productName?.trim() || 'Producto sin nombre',
    price: hasDiscount ? discountedPrice : originalPrice,
    originalPrice,
    size: item.size || 'N/A',
    color: item.color || 'N/A',
    quantity: Number(item.quantity || 0),
    stock: item.stock,
    hasDiscount,
    discountPercentage: Number(item.discountPercentage || 0)
  };
};

const Cart: React.FC<CartProps> = ({ onClose, isOpen }) => {
  const router = useRouter();
  const titleId = useId();
  const closeTimerRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const requestInProgressRef = useRef(false);
  const trackedViewRef = useRef(false);

  const {
    cartItems: contextCartItems,
    refreshCart,
    sessionId: contextSessionId
  } = useCart();

  const [cartItems, setCartItems] = useState<CartItemView[]>([]);
  const [cartTotals, setCartTotals] = useState<CartTotals | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(
    contextSessionId ?? null
  );
  const [isFetching, setIsFetching] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const mapContextItems = useCallback(
    (items: typeof contextCartItems): CartItemView[] =>
      items.map((item) => {
        const originalPrice = Number(item.originalPrice || 0);
        const discountedPrice = Number(item.priceWithDiscount || 0);
        const hasDiscount =
          Boolean(item.hasDiscount) &&
          Number(item.discountPercentage || 0) > 0 &&
          discountedPrice > 0;

        return {
          id: String(item.id),
          productVariantId: String(item.productVariantId),
          image: item.imageUrl?.trim() || '/images/placeholder.png',
          name: item.productName?.trim() || 'Producto sin nombre',
          price: hasDiscount ? discountedPrice : originalPrice,
          originalPrice,
          size: item.size || 'N/A',
          color: item.color || 'N/A',
          quantity: Number(item.quantity || 0),
          stock: item.stock,
          hasDiscount,
          discountPercentage: Number(item.discountPercentage || 0)
        };
      }),
    []
  );

  useEffect(() => {
    setCartItems(mapContextItems(contextCartItems));
  }, [contextCartItems, mapContextItems]);

  useEffect(() => {
    if (!contextSessionId) return;
    persistSessionId(contextSessionId);
    setSessionId(contextSessionId);
  }, [contextSessionId]);

  const calculatedTotals = useMemo(() => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const originalSubtotal = cartItems.reduce(
      (sum, item) => sum + item.originalPrice * item.quantity,
      0
    );

    const totalItems = cartItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    return {
      subtotal,
      originalSubtotal,
      totalItems,
      discountSavings: Math.max(originalSubtotal - subtotal, 0)
    };
  }, [cartItems]);

  const subtotal = cartTotals?.subtotal ?? calculatedTotals.subtotal;
  const shippingCost = cartTotals?.shippingCost ?? 0;
  const total = cartTotals?.total ?? subtotal + shippingCost;
  const totalItems = cartTotals?.totalItems ?? calculatedTotals.totalItems;
  const discountSavings =
    cartTotals?.discountSavings ?? calculatedTotals.discountSavings;
  const originalSubtotal =
    cartTotals?.originalSubtotal ?? calculatedTotals.originalSubtotal;

  const resetCart = useCallback(() => {
    setCartItems([]);
    setCartTotals({ ...EMPTY_TOTALS });
  }, []);

  const saveSessionFromResponse = useCallback((response: Response) => {
    const responseSessionId = response.headers.get(CART_SESSION_HEADER);

    if (responseSessionId === 'cleared') {
      clearStoredSessionId();
      setSessionId(null);
      return;
    }

    if (responseSessionId?.trim()) {
      persistSessionId(responseSessionId);
      setSessionId(responseSessionId);
    }
  }, []);

  const fetchWithSession = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);
      const token = localStorage.getItem('token');
      const activeSessionId =
        getStoredSessionId() || sessionId || contextSessionId || null;

      headers.set('Accept', 'application/json');

      if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      if (activeSessionId) {
        headers.set(CART_SESSION_HEADER, activeSessionId);
      }

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers
      });

      saveSessionFromResponse(response);
      return response;
    },
    [contextSessionId, saveSessionFromResponse, sessionId]
  );

  const fetchCart = useCallback(async () => {
    if (requestInProgressRef.current) return;

    requestInProgressRef.current = true;
    setIsFetching(true);

    try {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        setRetryCount(attempt);

        try {
          const response = await fetchWithSession(`${CART}/with-totals`);

          if ([400, 401, 404].includes(response.status)) {
            resetCart();
            setHasFetched(true);
            return;
          }

          if (!response.ok) {
            throw new Error(
              (await response.text()) ||
                `No fue posible cargar el carrito (${response.status})`
            );
          }

          const data = (await response.json()) as ApiCartResponse;
          const items = Array.isArray(data.items)
            ? data.items.map(mapApiItem)
            : [];

          setCartItems(items);
          setCartTotals({
            subtotal: Number(data.subtotal || 0),
            shippingCost: Number(data.shippingCost || 0),
            total: Number(data.total || 0),
            totalItems: Number(data.totalItems || 0),
            itemCount: Number(data.itemCount || items.length),
            discountSavings: Number(data.discountSavings || 0),
            originalSubtotal: Number(
              data.originalSubtotal ?? data.subtotal ?? 0
            )
          });

          setHasFetched(true);
          await refreshCart().catch(() => undefined);
          return;
        } catch (error) {
          lastError =
            error instanceof Error
              ? error
              : new Error('Error desconocido cargando el carrito');

          if (attempt < MAX_RETRIES) {
            await wait(700 * (attempt + 1));
          }
        }
      }

      throw lastError || new Error('No fue posible cargar el carrito');
    } catch (error) {
      console.error('Error cargando el carrito:', error);
      resetCart();
      setHasFetched(true);
      showToast('No fue posible cargar el carrito', 'error', 3200);
    } finally {
      requestInProgressRef.current = false;
      setRetryCount(0);
      setIsFetching(false);
    }
  }, [fetchWithSession, refreshCart, resetCart]);

  useEffect(() => {
    if (!isOpen) {
      trackedViewRef.current = false;
      setHasFetched(false);
      return;
    }

    void fetchCart();
  }, [fetchCart, isOpen]);

  useEffect(() => {
    if (!isOpen || trackedViewRef.current || cartItems.length === 0) return;

    trackViewCart(cartItems, total, totalItems);
    trackedViewRef.current = true;
  }, [cartItems, isOpen, total, totalItems]);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;

    closingRef.current = true;
    setIsClosing(true);

    closeTimerRef.current = window.setTimeout(() => {
      onClose();
      setIsClosing(false);
      setHasFetched(false);
      closingRef.current = false;
      closeTimerRef.current = null;
    }, CLOSE_ANIMATION_MS);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose, isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (quantity < 1 || pendingItemId) return;

      const item = cartItems.find((current) => current.id === itemId);
      if (!item) return;

      if (item.stock !== undefined && quantity > item.stock) {
        showToast(`Stock máximo disponible: ${item.stock}`, 'info', 2800);
        return;
      }

      setPendingItemId(itemId);

      try {
        const response = await fetchWithSession(
          `${CART}/update/${itemId}?quantity=${quantity}`,
          { method: 'PUT' }
        );

        if (!response.ok) {
          throw new Error('No fue posible actualizar la cantidad');
        }

        const previousQuantity = item.quantity;

        setCartItems((currentItems) =>
          currentItems.map((current) =>
            current.id === itemId
              ? { ...current, quantity }
              : current
          )
        );

        trackQuantityChange(item, previousQuantity, quantity);
        await fetchCart();
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : 'No fue posible actualizar la cantidad',
          'error',
          3200
        );
      } finally {
        setPendingItemId(null);
      }
    },
    [cartItems, fetchCart, fetchWithSession, pendingItemId]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (pendingItemId) return;

      const item = cartItems.find((current) => current.id === itemId);
      if (!item) return;

      setPendingItemId(itemId);

      try {
        const response = await fetchWithSession(`${CART}/remove/${itemId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('No fue posible eliminar el producto');
        }

        setCartItems((currentItems) =>
          currentItems.filter((current) => current.id !== itemId)
        );

        trackRemoveFromCart(item);
        await fetchCart();
        showToast('Producto eliminado del carrito', 'success', 2200);
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : 'No fue posible eliminar el producto',
          'error',
          3200
        );
      } finally {
        setPendingItemId(null);
      }
    },
    [cartItems, fetchCart, fetchWithSession, pendingItemId]
  );

  const createNewSession = useCallback(async () => {
    if (isCreatingSession) return;

    setIsCreatingSession(true);

    try {
      clearStoredSessionId();

      const response = await fetch(`${CART}/new-session`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('No fue posible crear una nueva sesión');
      }

      const headerSessionId = response.headers.get(CART_SESSION_HEADER);

      let bodySessionId: string | undefined;

      try {
        const data = (await response.json()) as { sessionId?: string };
        bodySessionId = data.sessionId;
      } catch {
        bodySessionId = undefined;
      }

      const newSessionId = headerSessionId || bodySessionId;

      if (!newSessionId) {
        throw new Error('El backend no devolvió una sesión válida');
      }

      persistSessionId(newSessionId);
      setSessionId(newSessionId);
      setHasFetched(false);

      showToast('Sesión del carrito restaurada', 'success', 2400);
      await fetchCart();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : 'No fue posible crear la sesión',
        'error',
        3200
      );
    } finally {
      setIsCreatingSession(false);
    }
  }, [fetchCart, isCreatingSession]);

  const handleCheckout = useCallback(() => {
    if (cartItems.length === 0) {
      showToast('Tu carrito está vacío', 'info', 2600);
      return;
    }

    trackInitiateCheckout({
      items: cartItems.map((item) => ({
        id: item.productVariantId,
        quantity: item.quantity,
        item_price: item.price
      })),
      value: total,
      numItems: totalItems,
      currency: 'COP'
    });

    router.push('/checkout');
    handleClose();
  }, [cartItems, handleClose, router, total, totalItems]);

  const handleContinueShopping = useCallback(() => {
    router.push('/menu');
    handleClose();
  }, [handleClose, router]);

  const getColorStyle = useCallback((color: string): React.CSSProperties => {
    const colors: Record<string, string> = {
      azul: '#28435d',
      'azul marino': '#172635',
      verde: '#697867',
      rosa: '#dbc5c8',
      morado: '#80758f',
      lila: '#aaa1b5',
      violeta: '#766b82',
      negro: '#111111',
      blanco: '#ffffff',
      naranja: '#b46e4e',
      amarillo: '#dccb8c',
      rojo: '#8e4343',
      celeste: '#91aebd',
      gris: '#898989',
      beige: '#d8cfbd',
      turquesa: '#8ba8a5',
      coral: '#ba7866',
      mostaza: '#b89a4d',
      marron: '#684838',
      café: '#684838',
      dorado: '#b99a52',
      plateado: '#b8b8b8',
      lavanda: '#bab3c4',
      menta: '#afc1b0',
      vino: '#593139',
      oliva: '#70714c'
    };

    const normalized = color.toLowerCase().trim();

    return {
      background: colors[normalized] || '#77736c',
      border:
        normalized === 'blanco' || normalized === 'beige'
          ? '1px solid rgba(10, 10, 10, 0.18)'
          : undefined
    };
  }, []);

  const renderItemPrice = (item: CartItemView) => {
    const itemTotal = item.price * item.quantity;

    if (item.hasDiscount && item.discountPercentage > 0) {
      return (
        <div className={styles.priceBlock}>
          <span className={styles.originalPrice}>
            ${formatPrice(item.originalPrice * item.quantity)}
          </span>
          <span className={styles.finalPrice}>
            ${formatPrice(itemTotal)}
          </span>
        </div>
      );
    }

    return (
      <span className={styles.normalPrice}>
        ${formatPrice(itemTotal)}
      </span>
    );
  };

  const panelVisible = isOpen || isClosing;

  return (
    <>
      {panelVisible && (
        <button
          type="button"
          className={`${styles.cartOverlay} ${
            isOpen && !isClosing ? styles.open : ''
          } ${isClosing ? styles.closing : ''}`}
          onClick={handleClose}
          aria-label="Cerrar carrito"
        />
      )}

      <aside
        className={`${styles.cartPanel} ${
          isOpen && !isClosing ? styles.open : ''
        } ${isClosing ? styles.closing : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!panelVisible}
      >
        <header className={styles.cartHeader}>
          <div className={styles.headerText}>
            <span className={styles.eyebrow}>VALSE / CART</span>

            <div className={styles.titleRow}>
              <h2 id={titleId}>Tu carrito</h2>
              <span className={styles.itemCount}>
                {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}
              </span>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Cerrar carrito"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        {isFetching && !hasFetched ? (
          <div className={styles.loadingState}>
            <span className={styles.loadingSpinner} aria-hidden="true" />
            <p>Cargando carrito</p>

            {retryCount > 0 && (
              <small>
                Reintentando {retryCount} de {MAX_RETRIES}
              </small>
            )}
          </div>
        ) : cartItems.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} aria-hidden="true">
              <svg viewBox="0 0 72 84">
                <path d="M12 25h48l-3 51H15Z" />
                <path d="M24 27v-7C24 10 29 5 36 5s12 5 12 15v7" />
              </svg>
            </div>

            <span className={styles.emptyEyebrow}>TU SELECCIÓN</span>
            <h3>El carrito está vacío</h3>
            <p>
              Descubre piezas diseñadas para moverte con precisión,
              comodidad e intención.
            </p>

            {!sessionId && (
              <div className={styles.recoveryBox}>
                <span>No hay una sesión de carrito activa.</span>
                <button
                  type="button"
                  className={styles.recoveryButton}
                  onClick={() => void createNewSession()}
                  disabled={isCreatingSession}
                >
                  {isCreatingSession ? 'Creando sesión…' : 'Restaurar sesión'}
                </button>
              </div>
            )}

            <button
              type="button"
              className={styles.exploreButton}
              onClick={handleContinueShopping}
            >
              Explorar colección
              <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : (
          <>
            <section
              className={styles.itemsSection}
              aria-label="Productos del carrito"
            >
              <ul className={styles.itemsList}>
                {cartItems.map((item) => {
                  const isPending = pendingItemId === item.id;

                  return (
                    <li className={styles.cartItem} key={item.id}>
                      <div className={styles.itemMedia}>
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={112}
                          height={148}
                          className={styles.itemImage}
                          sizes="112px"
                          onError={(event) => {
                            event.currentTarget.src =
                              '/images/placeholder.png';
                          }}
                        />

                        {item.hasDiscount &&
                          item.discountPercentage > 0 && (
                            <span className={styles.discountBadge}>
                              -{item.discountPercentage}%
                            </span>
                          )}
                      </div>

                      <div className={styles.itemBody}>
                        <div className={styles.itemTop}>
                          <h3>{item.name}</h3>

                          <button
                            type="button"
                            className={styles.removeButton}
                            onClick={() => void removeItem(item.id)}
                            disabled={isPending}
                            aria-label={`Eliminar ${item.name}`}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
                            </svg>
                          </button>
                        </div>

                        <div className={styles.itemMeta}>
                          <span className={styles.metaPill}>
                            Talla {item.size}
                          </span>

                          <span className={styles.metaPill}>
                            <span
                              className={styles.colorDot}
                              style={getColorStyle(item.color)}
                              aria-hidden="true"
                            />
                            {item.color}
                          </span>
                        </div>

                        <div className={styles.itemBottom}>
                          <div
                            className={styles.quantityControl}
                            aria-label={`Cantidad de ${item.name}`}
                          >
                            <button
                              type="button"
                              className={styles.quantityButton}
                              onClick={() =>
                                void updateQuantity(
                                  item.id,
                                  item.quantity - 1
                                )
                              }
                              disabled={item.quantity <= 1 || isPending}
                              aria-label="Reducir cantidad"
                            >
                              −
                            </button>

                            <span className={styles.quantityValue}>
                              {isPending ? '·' : item.quantity}
                            </span>

                            <button
                              type="button"
                              className={styles.quantityButton}
                              onClick={() =>
                                void updateQuantity(
                                  item.id,
                                  item.quantity + 1
                                )
                              }
                              disabled={
                                isPending ||
                                (item.stock !== undefined &&
                                  item.quantity >= item.stock)
                              }
                              aria-label="Aumentar cantidad"
                            >
                              +
                            </button>
                          </div>

                          {renderItemPrice(item)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section
              className={styles.cartSummary}
              aria-label="Resumen del pedido"
            >
              <div className={styles.summaryRows}>
                <div className={styles.summaryRow}>
                  <span>Subtotal</span>

                  {discountSavings > 0 ? (
                    <span className={styles.summaryPriceGroup}>
                      <del>${formatPrice(originalSubtotal)}</del>
                      <strong>${formatPrice(subtotal)}</strong>
                    </span>
                  ) : (
                    <strong>${formatPrice(subtotal)}</strong>
                  )}
                </div>

                {discountSavings > 0 && (
                  <div
                    className={`${styles.summaryRow} ${styles.summaryDiscount}`}
                  >
                    <span>Ahorro</span>
                    <strong>−${formatPrice(discountSavings)}</strong>
                  </div>
                )}

                <div className={styles.summaryRow}>
                  <span>Envío</span>

                  {shippingCost === 0 ? (
                    <strong className={styles.shippingFree}>Gratis</strong>
                  ) : (
                    <strong>${formatPrice(shippingCost)}</strong>
                  )}
                </div>
              </div>

              <div className={styles.summaryDivider} />

              <div className={styles.totalRow}>
                <span>
                  <small>Total</small>
                  Impuestos incluidos cuando aplique
                </span>

                <strong>${formatPrice(total)}</strong>
              </div>

              <button
                type="button"
                className={styles.checkoutButton}
                onClick={handleCheckout}
              >
                Ir al pago
                <span aria-hidden="true">→</span>
              </button>

              <button
                type="button"
                className={styles.continueButton}
                onClick={handleContinueShopping}
              >
                Seguir comprando
              </button>

              <div className={styles.trustRow}>
                <span className={styles.trustItem}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v10H5Z" />
                  </svg>
                  Pago protegido
                </span>

                <span className={styles.trustItem}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 6h11v11H3Zm11 4h4l3 3v4h-7ZM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                  </svg>
                  Envío rastreable
                </span>
              </div>
            </section>
          </>
        )}
      </aside>
    </>
  );
};

export default Cart;