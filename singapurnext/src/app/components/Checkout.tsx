'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import {
  AlertCircle,
  Check,
  ChevronLeft,
  Clock,
  CreditCard,
  Gift,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Minus,
  Package,
  Percent,
  Phone,
  Plus,
  Shield,
  ShoppingBag,
  Trash2,
  User,
  X
} from 'lucide-react';

import {
  ADDRESS,
  CART,
  CHECKOUT_ANONYMOUS,
  CHECKOUT_AUTHENTICATED,
  FIRST_PURCHASE_ELIGIBILITY,
  MERCADOPAGO_CREATE_PREFERENCE,
  MERCADOPAGO_STATUS,
  ORDER_CHECK_EXPIRATION,
  PERFIL_ME,
  PUBLIC_DISCOUNT_CONFIG
} from '../utils/Api';
import './Checkout.css';

interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice: number;
  size: string;
  color: string;
  quantity: number;
  stock?: number;
  maxStock?: number;
  productVariantId?: string;
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountAmount?: number;
  savings?: number;
}

interface Address {
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
}

interface AddressForm {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
}

interface UserData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addresses: Address[];
}

interface AnonymousUserInfo {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface OrderResponse {
  id: number;
  orderDate: string;
  status: string;
  totalPrice: number;
  userId: number | null;
  shippingAddressId: number;
  orderItems: Array<{
    id: number;
    quantity: number;
    price: number;
    orderId: number;
    productVariantId: number;
  }>;
  customerEmail?: string;
  subtotalWithoutDiscount?: number;
  totalDiscount?: number;
  firstPurchaseDiscountApplied?: boolean;
  firstPurchaseDiscountPercentage?: number;
  firstPurchaseDiscountAmount?: number;
}

interface MercadoPagoResponse {
  success: boolean;
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
  publicKey: string;
  orderId: string;
  externalReference: string;
  totalAmount?: number;
  shippingCost?: number;
  validation?: string;
  hasExistingPreference?: boolean;
  message?: string;
}

interface PaymentStatusResponse {
  success: boolean;
  orderId: number;
  status: string;
  mercadoPagoStatus?: string;
  paymentId?: string;
  paymentMethod?: string;
  lastUpdated?: string;
  hasPayment: boolean;
  preferenceId?: string;
  totalPrice?: number;
  mercadoPagoPreferenceId?: string;
  stockReservedAt?: string;
  stockReservationExpired?: boolean;
  stockReservationMinutesLeft?: number;
  cancellationReason?: string;
  firstPurchaseDiscountApplied?: boolean;
  firstPurchaseDiscountPercentage?: number;
  firstPurchaseDiscountAmount?: number;
  subtotalWithoutDiscount?: number;
  totalDiscount?: number;
}

interface CartTotalsResponseItem {
  id: number;
  productVariantId: number;
  imageUrl?: string;
  imageUrls?: string[];
  productName: string;
  price: number;
  originalPrice: number;
  priceWithDiscount: number;
  hasDiscount: boolean;
  discountPercentage: number;
  discountAmount: number;
  size: string;
  color: string;
  quantity: number;
  stock?: number;
  maxStock?: number;
  savings?: number;
}

interface CartTotalsResponse {
  items: CartTotalsResponseItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  totalItems: number;
  itemCount: number;
  discountSavings: number;
  originalSubtotal: number;
}

interface FirstPurchaseDiscountConfig {
  enabled: boolean;
  discountPercentage: number;
  applyToAnonymous: boolean;
}

type FirstPurchaseStatus = 'hidden' | 'estimated' | 'applied';

interface CheckoutPricing {
  originalSubtotal: number;
  productsSubtotal: number;
  productsDiscount: number;
  firstPurchaseDiscount: number;
  shippingCost: number;
  total: number;
  firstPurchaseStatus: FirstPurchaseStatus;
  firstPurchasePercentage: number;
}

const CART_SESSION_KEY = 'cartSessionId';
const CART_SESSION_HEADER = 'X-Cart-Session-Id';
const PAYMENT_POLL_INTERVAL = 30000;
const PAYMENT_POLL_DURATION = 900000;

const EMPTY_ADDRESS: AddressForm = {
  address: '',
  city: '',
  state: '',
  country: 'Colombia',
  postalCode: ''
};

const EMPTY_GUEST: AnonymousUserInfo = {
  email: '',
  firstName: '',
  lastName: '',
  phone: ''
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildCheckoutPricing = ({
  originalSubtotal,
  subtotal,
  shippingCost,
  paymentStatus,
  orderResponse,
  discountConfig,
  firstPurchaseEligibility
}: {
  originalSubtotal: number;
  subtotal: number;
  shippingCost: number;
  paymentStatus?: PaymentStatusResponse | null;
  orderResponse?: OrderResponse | null;
  discountConfig?: FirstPurchaseDiscountConfig | null;
  firstPurchaseEligibility: boolean | null;
}): CheckoutPricing => {
  const productsDiscount = Math.max(0, originalSubtotal - subtotal);

  const paymentDiscount = paymentStatus?.firstPurchaseDiscountApplied
    ? {
        amount: Number(paymentStatus.firstPurchaseDiscountAmount || 0),
        percentage: Number(
          paymentStatus.firstPurchaseDiscountPercentage || 0
        )
      }
    : null;

  const orderDiscount = orderResponse?.firstPurchaseDiscountApplied
    ? {
        amount: Number(orderResponse.firstPurchaseDiscountAmount || 0),
        percentage: Number(
          orderResponse.firstPurchaseDiscountPercentage || 0
        )
      }
    : null;

  const appliedDiscount = paymentDiscount || orderDiscount;

  const estimatedDiscount =
    !appliedDiscount &&
    firstPurchaseEligibility === true &&
    discountConfig?.enabled
      ? Math.round(
          subtotal *
            (Number(discountConfig.discountPercentage || 0) / 100)
        )
      : 0;

  const firstPurchaseDiscount =
    appliedDiscount?.amount || estimatedDiscount;

  const firstPurchaseStatus: FirstPurchaseStatus = appliedDiscount
    ? 'applied'
    : estimatedDiscount > 0
      ? 'estimated'
      : 'hidden';

  return {
    originalSubtotal,
    productsSubtotal: subtotal,
    productsDiscount,
    firstPurchaseDiscount,
    shippingCost,
    total: Math.max(
      0,
      subtotal - firstPurchaseDiscount + shippingCost
    ),
    firstPurchaseStatus,
    firstPurchasePercentage:
      appliedDiscount?.percentage ||
      Number(discountConfig?.discountPercentage || 0)
  };
};

const CheckoutPage = () => {
  const router = useRouter();

  const paymentSectionRef = useRef<HTMLElement | null>(null);
  const summarySectionRef = useRef<HTMLElement | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const paymentIntervalRef = useRef<number | null>(null);
  const paymentStopTimerRef = useRef<number | null>(null);
  const cartHashRef = useRef('');
  const orderCreatedRef = useRef(false);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [originalSubtotal, setOriginalSubtotal] = useState(0);

  const [initialLoading, setInitialLoading] = useState(true);
  const [cartUpdating, setCartUpdating] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [mercadoPagoLoading, setMercadoPagoLoading] = useState(false);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedAddress, setSelectedAddress] =
    useState<Address | null>(null);

  const [guestInfo, setGuestInfo] =
    useState<AnonymousUserInfo>(EMPTY_GUEST);
  const [guestAddress, setGuestAddress] =
    useState<AddressForm>(EMPTY_ADDRESS);

  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddress, setNewAddress] =
    useState<AddressForm>(EMPTY_ADDRESS);

  const [discountConfig, setDiscountConfig] =
    useState<FirstPurchaseDiscountConfig>({
      enabled: false,
      discountPercentage: 0,
      applyToAnonymous: false
    });
  const [firstPurchaseEligibility, setFirstPurchaseEligibility] =
    useState<boolean | null>(null);
  const [checkingFirstPurchase, setCheckingFirstPurchase] =
    useState(false);

  const [orderId, setOrderId] = useState('');
  const [createdOrder, setCreatedOrder] =
    useState<OrderResponse | null>(null);
  const [orderCreated, setOrderCreated] = useState(false);

  const [mercadoPagoData, setMercadoPagoData] =
    useState<MercadoPagoResponse | null>(null);
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatusResponse | null>(null);
  const [publicKey, setPublicKey] = useState('');
  const [mercadoPagoInitialized, setMercadoPagoInitialized] =
    useState(false);


  const formatPrice = useCallback(
    (price: number) =>
      new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(price || 0),
    []
  );

  const calculateCartHash = useCallback((items: CartItem[]) => {
    if (items.length === 0) return 'empty';

    const content = items
      .map(
        (item) =>
          `${item.productVariantId || item.id}:${item.quantity}`
      )
      .sort()
      .join('|');

    let hash = 0;

    for (let index = 0; index < content.length; index += 1) {
      hash =
        (hash << 5) - hash + content.charCodeAt(index);
      hash |= 0;
    }

    return Math.abs(hash).toString(36);
  }, []);

  const getSessionId = useCallback(() => {
    /*
     * El carrito puede haber guardado la sesión en localStorage,
     * sessionStorage o en la cookie cart_session_id.
     *
     * Antes solo se consultaba cartSessionId en localStorage.
     * Cuando no estaba allí, el checkout generaba una sesión nueva
     * y el backend devolvía un carrito vacío.
     */
    const storedSessionId =
      localStorage.getItem(CART_SESSION_KEY) ||
      localStorage.getItem('cart_session_id') ||
      sessionStorage.getItem(CART_SESSION_KEY) ||
      sessionStorage.getItem('cart_session_id') ||
      Cookies.get('cart_session_id');

    if (storedSessionId) {
      localStorage.setItem(CART_SESSION_KEY, storedSessionId);
      sessionStorage.setItem(CART_SESSION_KEY, storedSessionId);

      Cookies.set('cart_session_id', storedSessionId, {
        expires: 7,
        path: '/',
        sameSite: 'lax',
        secure: window.location.protocol === 'https:'
      });

      return storedSessionId;
    }

    const generatedSessionId =
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
        ? `session_${crypto.randomUUID()}`
        : `session_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 11)}`;

    localStorage.setItem(CART_SESSION_KEY, generatedSessionId);
    sessionStorage.setItem(CART_SESSION_KEY, generatedSessionId);

    Cookies.set('cart_session_id', generatedSessionId, {
      expires: 7,
      path: '/',
      sameSite: 'lax',
      secure: window.location.protocol === 'https:'
    });

    return generatedSessionId;
  }, []);

  const getRequestHeaders = useCallback(
    (token?: string | null) => {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        [CART_SESSION_HEADER]: getSessionId()
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      return headers;
    },
    [getSessionId]
  );

  const clearPaymentTimers = useCallback(() => {
    if (paymentIntervalRef.current !== null) {
      window.clearInterval(paymentIntervalRef.current);
      paymentIntervalRef.current = null;
    }

    if (paymentStopTimerRef.current !== null) {
      window.clearTimeout(paymentStopTimerRef.current);
      paymentStopTimerRef.current = null;
    }
  }, []);

  const clearPendingOrder = useCallback(
    (message?: string) => {
      clearPaymentTimers();

      localStorage.removeItem('pendingOrderId');
      localStorage.removeItem('pendingOrderData');
      localStorage.removeItem('pendingPreferenceId');
      localStorage.removeItem('mercadoPagoOrderId');
      localStorage.removeItem('lastOrderCartHash');

      setOrderId('');
      setCreatedOrder(null);
      setOrderCreated(false);
      setMercadoPagoData(null);
      setPaymentStatus(null);

      if (message) {
        setError(message);
      }
    },
    [clearPaymentTimers]
  );

  const initializeMercadoPago = useCallback((key: string) => {
    if (!key) return false;

    try {
      initMercadoPago(key, { locale: 'es-CO' });
      setPublicKey(key);
      setMercadoPagoInitialized(true);
      return true;
    } catch (initializationError) {
      console.error(
        'Error inicializando Mercado Pago:',
        initializationError
      );
      setMercadoPagoInitialized(false);
      return false;
    }
  }, []);

  const updateTotals = useCallback(
    (data: CartTotalsResponse) => {
      setSubtotal(Number(data.subtotal || 0));
      setShippingCost(Number(data.shippingCost || 0));
      setTotalItems(Number(data.totalItems || 0));
      setOriginalSubtotal(
        Number(data.originalSubtotal ?? data.subtotal ?? 0)
      );
    },
    []
  );

  const fetchDiscountConfiguration = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(PUBLIC_DISCOUNT_CONFIG, {
        headers: getRequestHeaders(token),
        credentials: 'include'
      });

      if (!response.ok) return;

      const data =
        (await response.json()) as FirstPurchaseDiscountConfig;

      setDiscountConfig({
        enabled: Boolean(data.enabled),
        discountPercentage: Number(
          data.discountPercentage || 0
        ),
        applyToAnonymous: Boolean(data.applyToAnonymous)
      });
    } catch (configurationError) {
      console.error(
        'Error cargando configuración de descuento:',
        configurationError
      );
    }
  }, [getRequestHeaders]);

  const invalidateOrderWhenCartChanges = useCallback(
    (newCartHash: string) => {
      const orderHash =
        localStorage.getItem('lastOrderCartHash') ||
        cartHashRef.current;

      if (
        orderCreatedRef.current &&
        orderHash &&
        orderHash !== newCartHash
      ) {
        clearPendingOrder(
          'El carrito cambió. Revisa el total y vuelve a preparar el pago.'
        );
      }

      cartHashRef.current = newCartHash;
    },
    [clearPendingOrder]
  );

  const fetchCart = useCallback(
    async (
      token: string | null,
      signal?: AbortSignal
    ) => {
      const response = await fetch(`${CART}/with-totals`, {
        headers: getRequestHeaders(token),
        credentials: 'include',
        signal
      });

      if (
        response.status === 204 ||
        response.status === 404
      ) {
        setCartItems([]);
        updateTotals({
          items: [],
          subtotal: 0,
          shippingCost: 0,
          total: 0,
          totalItems: 0,
          itemCount: 0,
          discountSavings: 0,
          originalSubtotal: 0
        });
        invalidateOrderWhenCartChanges('empty');
        return;
      }

      if (!response.ok) {
        throw new Error(
          `No fue posible cargar el carrito (${response.status})`
        );
      }

      const data =
        (await response.json()) as CartTotalsResponse;

      const items = Array.isArray(data.items)
        ? data.items.map((item) => {
            const originalPrice = Number(
              item.originalPrice || item.price || 0
            );
            const discountedPrice = Number(
              item.priceWithDiscount || 0
            );
            const hasItemDiscount =
              Boolean(item.hasDiscount) &&
              Number(item.discountPercentage || 0) > 0 &&
              discountedPrice > 0;

            return {
              id: String(item.id),
              productVariantId: String(
                item.productVariantId || item.id
              ),
              image:
                item.imageUrl?.trim() ||
                item.imageUrls?.[0]?.trim() ||
                '/images/placeholder.png',
              name: item.productName?.trim() || 'Producto',
              price: hasItemDiscount
                ? discountedPrice
                : Number(item.price || originalPrice),
              originalPrice,
              size: item.size || 'N/A',
              color: item.color || 'N/A',
              quantity: Number(item.quantity || 1),
              stock: item.stock,
              maxStock: item.maxStock ?? item.stock,
              hasDiscount: hasItemDiscount,
              discountPercentage: Number(
                item.discountPercentage || 0
              ),
              discountAmount: Number(
                item.discountAmount || 0
              ),
              savings: Number(item.savings || 0)
            } satisfies CartItem;
          })
        : [];

      const newHash = calculateCartHash(items);

      setCartItems(items);
      updateTotals(data);
      invalidateOrderWhenCartChanges(newHash);
    },
    [
      calculateCartHash,
      getRequestHeaders,
      invalidateOrderWhenCartChanges,
      updateTotals
    ]
  );

  const fetchUser = useCallback(
    async (token: string, signal?: AbortSignal) => {
      const response = await fetch(PERFIL_ME, {
        headers: getRequestHeaders(token),
        credentials: 'include',
        signal
      });

      if (!response.ok) {
        throw new Error(
          `No fue posible cargar el perfil (${response.status})`
        );
      }

      const user = (await response.json()) as UserData;

      setUserData({
        ...user,
        addresses: user.addresses || []
      });

      setGuestInfo({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || ''
      });

      if (user.addresses?.length) {
        setSelectedAddress(user.addresses[0]);
      }
    },
    [getRequestHeaders]
  );

  const loadCheckout = useCallback(async () => {
    setInitialLoading(true);
    setError('');

    fetchControllerRef.current?.abort();
    fetchControllerRef.current = new AbortController();

    const token = localStorage.getItem('token');
    const authenticated = Boolean(token);

    setIsAuthenticated(authenticated);

    try {
      await Promise.all([
        fetchCart(token, fetchControllerRef.current.signal),
        fetchDiscountConfiguration(),
        authenticated && token
          ? fetchUser(
              token,
              fetchControllerRef.current.signal
            )
          : Promise.resolve()
      ]);
    } catch (loadError) {
      if (
        loadError instanceof Error &&
        loadError.name === 'AbortError'
      ) {
        return;
      }

      console.error('Error cargando checkout:', loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No fue posible cargar el checkout'
      );
    } finally {
      setInitialLoading(false);
    }
  }, [fetchCart, fetchDiscountConfiguration, fetchUser]);

  useEffect(() => {
    orderCreatedRef.current = orderCreated;
  }, [orderCreated]);

  useEffect(() => {
    /*
     * No se usa una bandera initializedRef.
     *
     * En desarrollo, React Strict Mode ejecuta el efecto,
     * hace cleanup y vuelve a ejecutarlo. La bandera anterior
     * impedía la segunda carga después de abortar la primera,
     * dejando cartItems vacío.
     */
    void loadCheckout();

    const pendingOrderId =
      localStorage.getItem('pendingOrderId');

    if (pendingOrderId) {
      setOrderId(pendingOrderId);
      setOrderCreated(true);
      cartHashRef.current =
        localStorage.getItem('lastOrderCartHash') || '';
    }

    return () => {
      fetchControllerRef.current?.abort();
      clearPaymentTimers();
    };
  }, [clearPaymentTimers, loadCheckout]);

  const checkFirstPurchaseEligibility = useCallback(
    async (email: string, anonymousCheckout: boolean) => {
      if (!EMAIL_REGEX.test(email.trim())) {
        setFirstPurchaseEligibility(null);
        return;
      }

      setCheckingFirstPurchase(true);

      try {
        const token = localStorage.getItem('token');

        const response = await fetch(
          `${FIRST_PURCHASE_ELIGIBILITY}?email=${encodeURIComponent(
            email.trim()
          )}&anonymousCheckout=${anonymousCheckout}`,
          {
            method: 'GET',
            headers: getRequestHeaders(token),
            credentials: 'include'
          }
        );

        if (!response.ok) {
          setFirstPurchaseEligibility(null);
          return;
        }

        const data = (await response.json()) as {
          eligible?: boolean;
        };

        setFirstPurchaseEligibility(Boolean(data.eligible));
      } catch (eligibilityError) {
        console.error(
          'Error validando primera compra:',
          eligibilityError
        );
        setFirstPurchaseEligibility(null);
      } finally {
        setCheckingFirstPurchase(false);
      }
    },
    [getRequestHeaders]
  );

  useEffect(() => {
    const email = isAuthenticated
      ? userData?.email || ''
      : guestInfo.email;

    if (!EMAIL_REGEX.test(email.trim())) {
      setFirstPurchaseEligibility(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void checkFirstPurchaseEligibility(
        email,
        !isAuthenticated
      );
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    checkFirstPurchaseEligibility,
    guestInfo.email,
    isAuthenticated,
    userData?.email
  ]);

  const checkoutPricing = useMemo(
    () =>
      buildCheckoutPricing({
        originalSubtotal,
        subtotal,
        shippingCost,
        paymentStatus,
        orderResponse: createdOrder,
        discountConfig,
        firstPurchaseEligibility
      }),
    [
      createdOrder,
      discountConfig,
      firstPurchaseEligibility,
      originalSubtotal,
      paymentStatus,
      shippingCost,
      subtotal
    ]
  );

  const contactIsValid = useMemo(() => {
    if (isAuthenticated) {
      return Boolean(userData?.email);
    }

    return Boolean(
      guestInfo.firstName.trim() &&
        guestInfo.lastName.trim() &&
        EMAIL_REGEX.test(guestInfo.email.trim()) &&
        guestInfo.phone.replace(/\D/g, '').length >= 8
    );
  }, [guestInfo, isAuthenticated, userData?.email]);

  const shippingIsValid = useMemo(() => {
    if (isAuthenticated) {
      return Boolean(selectedAddress);
    }

    return Boolean(
      guestAddress.address.trim() &&
        guestAddress.city.trim() &&
        guestAddress.state.trim() &&
        guestAddress.country.trim()
    );
  }, [
    guestAddress,
    isAuthenticated,
    selectedAddress
  ]);

  const checkoutIsReady =
    cartItems.length > 0 &&
    contactIsValid &&
    shippingIsValid &&
    checkoutPricing.total > 0;

  const refreshCart = useCallback(async () => {
    const token = localStorage.getItem('token');

    setCartUpdating(true);
    setError('');

    try {
      await fetchCart(token);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'No fue posible actualizar el carrito'
      );
    } finally {
      setCartUpdating(false);
    }
  }, [fetchCart]);

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (quantity < 1 || cartUpdating) return;

      const item = cartItems.find(
        (currentItem) => currentItem.id === itemId
      );

      if (!item) return;

      const maximumStock =
        item.maxStock ?? item.stock;

      if (
        maximumStock !== undefined &&
        quantity > maximumStock
      ) {
        setError(
          `Stock máximo disponible para ${item.name}: ${maximumStock}`
        );
        return;
      }

      setCartUpdating(true);
      setError('');

      try {
        const token = localStorage.getItem('token');

        const response = await fetch(
          `${CART}/update/${itemId}?quantity=${quantity}`,
          {
            method: 'PUT',
            headers: getRequestHeaders(token),
            credentials: 'include'
          }
        );

        if (!response.ok) {
          throw new Error(
            'No fue posible actualizar la cantidad'
          );
        }

        await fetchCart(token);
      } catch (updateError) {
        setError(
          updateError instanceof Error
            ? updateError.message
            : 'No fue posible actualizar la cantidad'
        );
      } finally {
        setCartUpdating(false);
      }
    },
    [
      cartItems,
      cartUpdating,
      fetchCart,
      getRequestHeaders
    ]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (cartUpdating) return;

      setCartUpdating(true);
      setError('');

      try {
        const token = localStorage.getItem('token');

        const response = await fetch(
          `${CART}/remove/${itemId}`,
          {
            method: 'DELETE',
            headers: getRequestHeaders(token),
            credentials: 'include'
          }
        );

        if (!response.ok) {
          throw new Error(
            'No fue posible eliminar el producto'
          );
        }

        await fetchCart(token);
      } catch (removeError) {
        setError(
          removeError instanceof Error
            ? removeError.message
            : 'No fue posible eliminar el producto'
        );
      } finally {
        setCartUpdating(false);
      }
    },
    [cartUpdating, fetchCart, getRequestHeaders]
  );

  const saveAddress = useCallback(async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setError(
        'Inicia sesión para guardar una dirección'
      );
      return;
    }

    if (
      !newAddress.address.trim() ||
      !newAddress.city.trim() ||
      !newAddress.state.trim() ||
      !newAddress.country.trim()
    ) {
      setError(
        'Completa todos los campos obligatorios de la dirección'
      );
      return;
    }

    setAddressSaving(true);
    setError('');

    try {
      const response = await fetch(ADDRESS, {
        method: 'POST',
        headers: getRequestHeaders(token),
        credentials: 'include',
        body: JSON.stringify(newAddress)
      });

      if (!response.ok) {
        throw new Error(
          'No fue posible guardar la dirección'
        );
      }

      const createdAddress =
        (await response.json()) as Address;

      setUserData((currentUser) => {
        if (!currentUser) return currentUser;

        const exists = currentUser.addresses.some(
          (address) => address.id === createdAddress.id
        );

        return {
          ...currentUser,
          addresses: exists
            ? currentUser.addresses
            : [createdAddress, ...currentUser.addresses]
        };
      });

      setSelectedAddress(createdAddress);
      setNewAddress(EMPTY_ADDRESS);
      setAddingAddress(false);
      setSuccessMessage('Dirección guardada');
    } catch (addressError) {
      setError(
        addressError instanceof Error
          ? addressError.message
          : 'No fue posible guardar la dirección'
      );
    } finally {
      setAddressSaving(false);
    }
  }, [getRequestHeaders, newAddress]);

  const deleteAddress = useCallback(
    async (addressId: number) => {
      const token = localStorage.getItem('token');

      if (!token || addressSaving) return;

      setAddressSaving(true);
      setError('');

      try {
        const response = await fetch(
          `${ADDRESS}/${addressId}`,
          {
            method: 'DELETE',
            headers: getRequestHeaders(token),
            credentials: 'include'
          }
        );

        if (!response.ok) {
          throw new Error(
            'No fue posible eliminar la dirección'
          );
        }

        setUserData((currentUser) => {
          if (!currentUser) return currentUser;

          return {
            ...currentUser,
            addresses: currentUser.addresses.filter(
              (address) => address.id !== addressId
            )
          };
        });

        setSelectedAddress((currentAddress) =>
          currentAddress?.id === addressId
            ? null
            : currentAddress
        );
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : 'No fue posible eliminar la dirección'
        );
      } finally {
        setAddressSaving(false);
      }
    },
    [addressSaving, getRequestHeaders]
  );

  const validateCheckout = useCallback(() => {
    if (cartItems.length === 0) {
      setError('Tu carrito está vacío');
      return false;
    }

    if (!contactIsValid) {
      setError(
        isAuthenticated
          ? 'No fue posible validar tus datos de contacto'
          : 'Completa correctamente tus datos de contacto'
      );
      return false;
    }

    if (!shippingIsValid) {
      setError(
        'Completa o selecciona una dirección de envío'
      );
      return false;
    }

    if (checkoutPricing.total <= 0) {
      setError(
        'No fue posible calcular el total del pedido'
      );
      return false;
    }

    return true;
  }, [
    cartItems.length,
    checkoutPricing.total,
    contactIsValid,
    isAuthenticated,
    shippingIsValid
  ]);

  const createOrder = useCallback(async () => {
    if (!validateCheckout()) return null;

    setPaymentProcessing(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      let response: Response;

      if (isAuthenticated) {
        if (!token || !selectedAddress) {
          throw new Error(
            'Selecciona una dirección de envío'
          );
        }

        response = await fetch(CHECKOUT_AUTHENTICATED, {
          method: 'POST',
          headers: getRequestHeaders(token),
          credentials: 'include',
          body: JSON.stringify({
            shippingAddressId: selectedAddress.id
          })
        });
      } else {
        response = await fetch(CHECKOUT_ANONYMOUS, {
          method: 'POST',
          headers: getRequestHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            customerEmail: guestInfo.email.trim(),
            customerFirstName:
              guestInfo.firstName.trim(),
            customerLastName:
              guestInfo.lastName.trim(),
            customerPhone: guestInfo.phone.trim(),
            shippingAddress: {
              address: guestAddress.address.trim(),
              city: guestAddress.city.trim(),
              state: guestAddress.state.trim(),
              country: guestAddress.country.trim(),
              postalCode:
                guestAddress.postalCode?.trim() || undefined
            }
          })
        });
      }

      if (!response.ok) {
        const responseText = await response.text();

        throw new Error(
          responseText ||
            `No fue posible crear la orden (${response.status})`
        );
      }

      const order =
        (await response.json()) as OrderResponse;

      if (!order.id) {
        throw new Error(
          'El backend no devolvió el identificador de la orden'
        );
      }

      const currentHash = calculateCartHash(cartItems);

      localStorage.setItem(
        'pendingOrderId',
        String(order.id)
      );
      localStorage.setItem(
        'lastOrderCartHash',
        currentHash
      );
      localStorage.setItem(
        'pendingOrderData',
        JSON.stringify({
          shippingAddress: isAuthenticated
            ? selectedAddress
            : guestAddress,
          customerInfo: isAuthenticated
            ? userData
            : guestInfo,
          createdAt: new Date().toISOString(),
          total: order.totalPrice,
          cartHash: currentHash
        })
      );

      cartHashRef.current = currentHash;
      setCreatedOrder(order);
      setOrderId(String(order.id));
      setOrderCreated(true);
      setSuccessMessage(
        `Orden #${order.id} preparada`
      );

      return order;
    } catch (orderError) {
      console.error('Error creando orden:', orderError);

      setError(
        orderError instanceof Error
          ? orderError.message
          : 'No fue posible crear la orden'
      );

      setCreatedOrder(null);
      setOrderCreated(false);
      return null;
    } finally {
      setPaymentProcessing(false);
    }
  }, [
    calculateCartHash,
    cartItems,
    getRequestHeaders,
    guestAddress,
    guestInfo,
    isAuthenticated,
    selectedAddress,
    userData,
    validateCheckout
  ]);

  const checkOrderExpiration = useCallback(
    async (targetOrderId: string) => {
      if (!targetOrderId) return false;

      try {
        const token = localStorage.getItem('token');

        const response = await fetch(
          ORDER_CHECK_EXPIRATION.replace(
            '{orderId}',
            targetOrderId
          ),
          {
            method: 'POST',
            headers: getRequestHeaders(token),
            credentials: 'include'
          }
        );

        if (!response.ok) return false;

        const data = (await response.json()) as {
          expired?: boolean;
        };

        if (data.expired) {
          clearPendingOrder(
            'La reserva anterior expiró. Revisa los datos y prepara el pago nuevamente.'
          );
          return true;
        }

        return false;
      } catch (expirationError) {
        console.error(
          'Error verificando expiración:',
          expirationError
        );
        return false;
      }
    },
    [clearPendingOrder, getRequestHeaders]
  );

  const createMercadoPagoPreference = useCallback(
    async (
      targetOrderId: string,
      order?: OrderResponse | null
    ) => {
      setMercadoPagoLoading(true);
      setError('');

      try {
        const expired =
          await checkOrderExpiration(targetOrderId);

        if (expired) return null;

        const token = localStorage.getItem('token');

        const productsTotal = Number(
          order?.totalPrice ||
            createdOrder?.totalPrice ||
            checkoutPricing.productsSubtotal -
              checkoutPricing.firstPurchaseDiscount
        );

        const totalAmount =
          productsTotal + checkoutPricing.shippingCost;

        const response = await fetch(
          MERCADOPAGO_CREATE_PREFERENCE,
          {
            method: 'POST',
            headers: getRequestHeaders(token),
            credentials: 'include',
            body: JSON.stringify({
              orderId: Number(targetOrderId),
              totalAmount,
              paymentMethod: 'MERCADO_PAGO',
              shippingAmount:
                checkoutPricing.shippingCost
            })
          }
        );

        if (!response.ok) {
          const responseText = await response.text();

          throw new Error(
            responseText ||
              `No fue posible preparar el pago (${response.status})`
          );
        }

        const data =
          (await response.json()) as MercadoPagoResponse;

        if (!data.success || !data.preferenceId) {
          throw new Error(
            data.message ||
              'Mercado Pago no devolvió una preferencia válida'
          );
        }

        if (data.publicKey) {
          initializeMercadoPago(data.publicKey);
        }

        setMercadoPagoData(data);
        localStorage.setItem(
          'pendingPreferenceId',
          data.preferenceId
        );
        localStorage.setItem(
          'mercadoPagoOrderId',
          targetOrderId
        );

        return data;
      } catch (preferenceError) {
        console.error(
          'Error creando preferencia:',
          preferenceError
        );

        setError(
          preferenceError instanceof Error
            ? preferenceError.message
            : 'No fue posible preparar el pago'
        );

        return null;
      } finally {
        setMercadoPagoLoading(false);
      }
    },
    [
      checkOrderExpiration,
      checkoutPricing.firstPurchaseDiscount,
      checkoutPricing.productsSubtotal,
      checkoutPricing.shippingCost,
      createdOrder,
      getRequestHeaders,
      initializeMercadoPago
    ]
  );

  const handleSuccessfulPayment = useCallback(
    (successfulOrderId: string) => {
      clearPaymentTimers();

      localStorage.removeItem('lastOrderCartHash');
      localStorage.removeItem('pendingOrderId');
      localStorage.removeItem('pendingOrderData');
      localStorage.removeItem('pendingPreferenceId');
      localStorage.removeItem('mercadoPagoOrderId');
      localStorage.removeItem(CART_SESSION_KEY);

      setCartItems([]);
      setSubtotal(0);
      setShippingCost(0);
      setTotalItems(0);
      setOriginalSubtotal(0);

      setSuccessMessage(
        `Pago aprobado. Orden #${successfulOrderId} confirmada.`
      );

      window.setTimeout(() => {
        window.location.href = `/checkout/success?orderId=${successfulOrderId}`;
      }, 2200);
    },
    [clearPaymentTimers]
  );

  const checkPaymentStatus = useCallback(
    async (targetOrderId: string) => {
      try {
        const token = localStorage.getItem('token');

        const response = await fetch(
          `${MERCADOPAGO_STATUS}/${targetOrderId}`,
          {
            method: 'GET',
            headers: getRequestHeaders(token),
            credentials: 'include'
          }
        );

        if (!response.ok) return null;

        const data =
          (await response.json()) as PaymentStatusResponse;

        setPaymentStatus(data);

        const approved =
          data.status === 'PAGO_APROBADO' ||
          data.mercadoPagoStatus === 'approved';

        const rejected =
          data.status === 'PAGO_RECHAZADO' ||
          data.mercadoPagoStatus === 'rejected';

        const canceled =
          data.status === 'CANCELADO' ||
          data.stockReservationExpired ||
          data.cancellationReason
            ?.toLowerCase()
            .includes('expirado');

        if (approved) {
          handleSuccessfulPayment(targetOrderId);
        } else if (rejected) {
          clearPaymentTimers();
          setError(
            'El pago fue rechazado. Usa otro medio de pago o inténtalo nuevamente.'
          );
        } else if (canceled) {
          clearPendingOrder(
            'La reserva de la orden expiró. Prepara el pago nuevamente.'
          );
        }

        return data;
      } catch (statusError) {
        console.error(
          'Error consultando estado del pago:',
          statusError
        );
        return null;
      }
    },
    [
      clearPaymentTimers,
      clearPendingOrder,
      getRequestHeaders,
      handleSuccessfulPayment
    ]
  );

  useEffect(() => {
    if (!orderCreated || !orderId) {
      clearPaymentTimers();
      return;
    }

    void checkPaymentStatus(orderId);

    paymentIntervalRef.current = window.setInterval(() => {
      void checkPaymentStatus(orderId);
    }, PAYMENT_POLL_INTERVAL);

    paymentStopTimerRef.current = window.setTimeout(() => {
      clearPaymentTimers();
    }, PAYMENT_POLL_DURATION);

    return clearPaymentTimers;
  }, [
    checkPaymentStatus,
    clearPaymentTimers,
    orderCreated,
    orderId
  ]);

  const preparePayment = useCallback(async () => {
    if (!validateCheckout()) return;

    setError('');
    setSuccessMessage('');

    let activeOrder = createdOrder;
    let activeOrderId = orderId;

    if (!orderCreated || !activeOrderId) {
      activeOrder = await createOrder();

      if (!activeOrder) return;

      activeOrderId = String(activeOrder.id);
    }

    await createMercadoPagoPreference(
      activeOrderId,
      activeOrder
    );

    window.setTimeout(() => {
      paymentSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 120);
  }, [
    createMercadoPagoPreference,
    createOrder,
    createdOrder,
    orderCreated,
    orderId,
    validateCheckout
  ]);

  const retryPayment = useCallback(async () => {
    if (!orderId) {
      await preparePayment();
      return;
    }

    localStorage.removeItem('pendingPreferenceId');
    setMercadoPagoData(null);
    setError('');

    await createMercadoPagoPreference(
      orderId,
      createdOrder
    );
  }, [
    createMercadoPagoPreference,
    createdOrder,
    orderId,
    preparePayment
  ]);

  const primaryAction = useCallback(() => {
    if (mercadoPagoData?.preferenceId) {
      paymentSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      return;
    }

    void preparePayment();
  }, [mercadoPagoData?.preferenceId, preparePayment]);

  const renderItemPrice = (item: CartItem) => {
    const itemTotal = item.price * item.quantity;
    const originalItemTotal =
      item.originalPrice * item.quantity;

    if (
      item.hasDiscount &&
      Number(item.discountPercentage || 0) > 0
    ) {
      return (
        <div className="checkout-item-prices">
          <del>{formatPrice(originalItemTotal)}</del>
          <strong>{formatPrice(itemTotal)}</strong>
          <span>-{item.discountPercentage}%</span>
        </div>
      );
    }

    return (
      <strong className="checkout-item-price">
        {formatPrice(itemTotal)}
      </strong>
    );
  };

  if (initialLoading) {
    return (
      <main className="checkout-page checkout-page-loading">
        <div className="checkout-loading-state">
          <span className="checkout-spinner" />
          <p>Preparando tu compra</p>
        </div>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="checkout-page">
        <section className="checkout-empty-state">
          <span className="checkout-empty-code">VALSE / CHECKOUT</span>
          <ShoppingBag aria-hidden="true" />
          <h1>Tu carrito está vacío</h1>
          <p>
            Agrega productos antes de continuar con el pago.
          </p>
          <button
            type="button"
            className="checkout-primary-button"
            onClick={() => router.push('/menu')}
          >
            Explorar catálogo
            <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>
    );
  }

  const preparingPayment =
    paymentProcessing || mercadoPagoLoading;

  return (
    <main className="checkout-page">
      <header className="checkout-header">
        <div className="checkout-header-inner">
          <button
            type="button"
            className="checkout-back-link"
            onClick={() => router.push('/menu')}
          >
            <ChevronLeft aria-hidden="true" />
            Volver al catálogo
          </button>

          <div className="checkout-brand">
            <span>VALSE</span>
            <small>CHECKOUT SEGURO</small>
          </div>

          <div className="checkout-header-security">
            <Lock aria-hidden="true" />
            Conexión protegida
          </div>
        </div>
      </header>

      <div className="checkout-shell">

        {error && (
          <div
            className="checkout-alert checkout-alert-error"
            role="alert"
          >
            <AlertCircle aria-hidden="true" />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Cerrar mensaje"
            >
              <X aria-hidden="true" />
            </button>
          </div>
        )}

        {successMessage && (
          <div
            className="checkout-alert checkout-alert-success"
            role="status"
          >
            <Check aria-hidden="true" />
            <span>{successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage('')}
              aria-label="Cerrar mensaje"
            >
              <X aria-hidden="true" />
            </button>
          </div>
        )}

        {discountConfig.enabled &&
          (discountConfig.applyToAnonymous ||
            isAuthenticated) && (
            <div className="checkout-discount-banner">
              <Gift aria-hidden="true" />
              <div>
                <strong>
                  Beneficio de primera compra
                </strong>
                <span>
                  Ingresa tu correo y validaremos si aplica
                  un {discountConfig.discountPercentage}% de
                  descuento.
                </span>
              </div>
              <span className="checkout-discount-badge">
                <Percent aria-hidden="true" />
                {discountConfig.discountPercentage}% OFF
              </span>
            </div>
          )}

        <div className="checkout-layout">
          <div className="checkout-form-column">
            <section className="checkout-section">
              <div className="checkout-section-heading">
                <span className="checkout-section-symbol" aria-hidden="true">
                  <User />
                </span>
                <div>
                  <h2>Datos de contacto</h2>
                  <p>
                    Te enviaremos la confirmación y el estado
                    del pedido.
                  </p>
                </div>
                {contactIsValid && (
                  <Check
                    className="checkout-section-check"
                    aria-label="Sección completa"
                  />
                )}
              </div>

              {isAuthenticated && userData ? (
                <div className="checkout-account-card">
                  <span className="checkout-account-icon">
                    <User aria-hidden="true" />
                  </span>
                  <div>
                    <strong>
                      {userData.firstName}{' '}
                      {userData.lastName}
                    </strong>
                    <span>{userData.email}</span>
                    <span>
                      {userData.phone ||
                        'Teléfono no registrado'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/perfil')}
                  >
                    Editar perfil
                  </button>
                </div>
              ) : (
                <>
                  <div className="checkout-login-note">
                    <User aria-hidden="true" />
                    <span>
                      Compra como invitado o{' '}
                      <button
                        type="button"
                        onClick={() =>
                          router.push('/login')
                        }
                      >
                        inicia sesión
                      </button>{' '}
                      para usar tus direcciones guardadas.
                    </span>
                  </div>

                  <div className="checkout-form-grid checkout-form-grid-two">
                    <label className="checkout-field">
                      <span>Nombre</span>
                      <input
                        type="text"
                        value={guestInfo.firstName}
                        onChange={(event) =>
                          setGuestInfo((current) => ({
                            ...current,
                            firstName: event.target.value
                          }))
                        }
                        autoComplete="given-name"
                        placeholder="Tu nombre"
                      />
                    </label>

                    <label className="checkout-field">
                      <span>Apellido</span>
                      <input
                        type="text"
                        value={guestInfo.lastName}
                        onChange={(event) =>
                          setGuestInfo((current) => ({
                            ...current,
                            lastName: event.target.value
                          }))
                        }
                        autoComplete="family-name"
                        placeholder="Tu apellido"
                      />
                    </label>

                    <label className="checkout-field">
                      <span>
                        <Mail aria-hidden="true" />
                        Correo
                      </span>
                      <input
                        type="email"
                        value={guestInfo.email}
                        onChange={(event) =>
                          setGuestInfo((current) => ({
                            ...current,
                            email: event.target.value
                          }))
                        }
                        autoComplete="email"
                        placeholder="correo@ejemplo.com"
                      />
                      {checkingFirstPurchase && (
                        <small>
                          Validando beneficio de primera compra…
                        </small>
                      )}
                    </label>

                    <label className="checkout-field">
                      <span>
                        <Phone aria-hidden="true" />
                        Teléfono
                      </span>
                      <input
                        type="tel"
                        value={guestInfo.phone}
                        onChange={(event) =>
                          setGuestInfo((current) => ({
                            ...current,
                            phone: event.target.value
                          }))
                        }
                        autoComplete="tel"
                        placeholder="+57 300 000 0000"
                      />
                    </label>
                  </div>
                </>
              )}
            </section>

            <section className="checkout-section">
              <div className="checkout-section-heading">
                <span className="checkout-section-symbol" aria-hidden="true">
                  <MapPin />
                </span>
                <div>
                  <h2>Entrega</h2>
                  <p>
                    Selecciona o escribe la dirección donde
                    recibirás tu pedido.
                  </p>
                </div>
                {shippingIsValid && (
                  <Check
                    className="checkout-section-check"
                    aria-label="Sección completa"
                  />
                )}
              </div>

              {isAuthenticated ? (
                <>
                  {userData?.addresses?.length ? (
                    <div className="checkout-address-list">
                      {userData.addresses.map((address) => {
                        const selected =
                          selectedAddress?.id === address.id;

                        return (
                          <article
                            key={address.id}
                            className={`checkout-address-card ${
                              selected
                                ? 'checkout-address-selected'
                                : ''
                            }`}
                          >
                            <button
                              type="button"
                              className="checkout-address-select"
                              onClick={() =>
                                setSelectedAddress(address)
                              }
                              aria-pressed={selected}
                            >
                              <span className="checkout-radio">
                                {selected && (
                                  <Check aria-hidden="true" />
                                )}
                              </span>
                              <span>
                                <strong>
                                  {address.address}
                                </strong>
                                <small>
                                  {address.city},{' '}
                                  {address.state}
                                </small>
                                <small>
                                  {address.country}
                                  {address.postalCode
                                    ? ` · ${address.postalCode}`
                                    : ''}
                                </small>
                              </span>
                            </button>

                            <button
                              type="button"
                              className="checkout-address-delete"
                              onClick={() =>
                                void deleteAddress(address.id)
                              }
                              disabled={addressSaving}
                              aria-label="Eliminar dirección"
                            >
                              <Trash2 aria-hidden="true" />
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="checkout-empty-address">
                      <MapPin aria-hidden="true" />
                      <p>
                        Todavía no tienes direcciones guardadas.
                      </p>
                    </div>
                  )}

                  {addingAddress ? (
                    <div className="checkout-address-form">
                      <AddressFields
                        address={newAddress}
                        onChange={setNewAddress}
                      />

                      <div className="checkout-inline-actions">
                        <button
                          type="button"
                          className="checkout-secondary-button"
                          onClick={() => {
                            setAddingAddress(false);
                            setNewAddress(EMPTY_ADDRESS);
                          }}
                        >
                          Cancelar
                        </button>

                        <button
                          type="button"
                          className="checkout-primary-button"
                          onClick={() => void saveAddress()}
                          disabled={addressSaving}
                        >
                          {addressSaving ? (
                            <>
                              <Loader2
                                className="checkout-spin"
                                aria-hidden="true"
                              />
                              Guardando
                            </>
                          ) : (
                            'Guardar dirección'
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="checkout-add-address"
                      onClick={() => setAddingAddress(true)}
                    >
                      <Plus aria-hidden="true" />
                      Agregar otra dirección
                    </button>
                  )}
                </>
              ) : (
                <div className="checkout-address-form checkout-address-form-guest">
                  <AddressFields
                    address={guestAddress}
                    onChange={setGuestAddress}
                  />
                </div>
              )}
            </section>

            <section
              ref={paymentSectionRef}
              className="checkout-section checkout-payment-section"
            >
              <div className="checkout-section-heading">
                <span className="checkout-section-symbol" aria-hidden="true">
                  <CreditCard />
                </span>
                <div>
                  <h2>Pago</h2>
                  <p>
                    El total final permanece visible en el
                    resumen de compra.
                  </p>
                </div>
                {mercadoPagoData?.preferenceId && (
                  <Check
                    className="checkout-section-check"
                    aria-label="Pago preparado"
                  />
                )}
              </div>

              {!mercadoPagoData?.preferenceId ? (
                <div className="checkout-payment-start">
                  <div className="checkout-payment-brand">
                    <CreditCard aria-hidden="true" />
                    <div>
                      <strong>Mercado Pago</strong>
                      <span>
                        PSE, tarjetas y medios disponibles en
                        la plataforma.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="checkout-pay-button"
                    onClick={() => void preparePayment()}
                    disabled={
                      !checkoutIsReady || preparingPayment
                    }
                  >
                    {preparingPayment ? (
                      <>
                        <Loader2
                          className="checkout-spin"
                          aria-hidden="true"
                        />
                        Preparando pago
                      </>
                    ) : (
                      <>
                        Preparar pago seguro
                        <span>
                          {formatPrice(
                            checkoutPricing.total
                          )}
                        </span>
                      </>
                    )}
                  </button>

                  {!checkoutIsReady && (
                    <p className="checkout-payment-help">
                      Completa los datos marcados arriba para
                      habilitar el pago.
                    </p>
                  )}
                </div>
              ) : (
                <div className="checkout-payment-ready">
                  <div className="checkout-payment-ready-title">
                    <Check aria-hidden="true" />
                    <div>
                      <strong>Pago preparado</strong>
                      <span>
                        Orden #{orderId}. Revisa el total y
                        continúa con Mercado Pago.
                      </span>
                    </div>
                  </div>

                  {mercadoPagoInitialized && publicKey ? (
                    <div className="checkout-wallet">
                      <Wallet
                        initialization={{
                          preferenceId:
                            mercadoPagoData.preferenceId,
                          redirectMode: 'self'
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="checkout-pay-button"
                      onClick={() => {
                        window.location.href =
                          mercadoPagoData.initPoint;
                      }}
                    >
                      Ir a Mercado Pago
                      <span>
                        {formatPrice(
                          checkoutPricing.total
                        )}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="checkout-retry-button"
                    onClick={() => void retryPayment()}
                    disabled={mercadoPagoLoading}
                  >
                    Volver a generar el enlace de pago
                  </button>
                </div>
              )}

              {paymentStatus && (
                <div className="checkout-payment-status">
                  <div>
                    <span>Estado</span>
                    <strong>
                      {paymentStatus.mercadoPagoStatus ||
                        paymentStatus.status}
                    </strong>
                  </div>

                  {paymentStatus.paymentMethod && (
                    <div>
                      <span>Medio</span>
                      <strong>
                        {paymentStatus.paymentMethod}
                      </strong>
                    </div>
                  )}

                  {paymentStatus.stockReservationMinutesLeft !==
                    undefined && (
                    <div>
                      <span>
                        <Clock aria-hidden="true" />
                        Reserva
                      </span>
                      <strong>
                        {paymentStatus.stockReservationMinutesLeft >
                        0
                          ? `${paymentStatus.stockReservationMinutesLeft} min`
                          : 'Expirada'}
                      </strong>
                    </div>
                  )}
                </div>
              )}

              <div className="checkout-security-row">
                <span>
                  <Lock aria-hidden="true" />
                  Pago protegido
                </span>
                <span>
                  <Shield aria-hidden="true" />
                  Datos cifrados
                </span>
                <span>
                  <Check aria-hidden="true" />
                  Confirmación inmediata
                </span>
              </div>
            </section>
          </div>

          <aside
            ref={summarySectionRef}
            className="checkout-summary-column"
            aria-label="Resumen de compra"
          >
            <div className="checkout-summary-sticky">
              <div className="checkout-summary-header">
                <div>
                  <span>RESUMEN</span>
                  <h2>Resumen de tu compra</h2>
                </div>
                <span className="checkout-summary-count">
                  {totalItems}{' '}
                  {totalItems === 1
                    ? 'unidad'
                    : 'unidades'}
                </span>
              </div>

              <div className="checkout-summary-items">
                {cartItems.map((item) => (
                  <article
                    key={item.id}
                    className="checkout-summary-item"
                  >
                    <div className="checkout-summary-image">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="84px"
                        onError={(event) => {
                          event.currentTarget.src =
                            '/images/placeholder.png';
                        }}
                      />
                      <span>{item.quantity}</span>
                    </div>

                    <div className="checkout-summary-product">
                      <div className="checkout-summary-product-top">
                        <h3>{item.name}</h3>
                        <button
                          type="button"
                          onClick={() =>
                            void removeItem(item.id)
                          }
                          disabled={cartUpdating}
                          aria-label={`Eliminar ${item.name}`}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </div>

                      <p>
                        Talla {item.size} · {item.color}
                      </p>

                      <div className="checkout-summary-product-bottom">
                        <div className="checkout-quantity">
                          <button
                            type="button"
                            onClick={() =>
                              void updateQuantity(
                                item.id,
                                item.quantity - 1
                              )
                            }
                            disabled={
                              cartUpdating ||
                              item.quantity <= 1
                            }
                            aria-label="Reducir cantidad"
                          >
                            <Minus aria-hidden="true" />
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            type="button"
                            onClick={() =>
                              void updateQuantity(
                                item.id,
                                item.quantity + 1
                              )
                            }
                            disabled={
                              cartUpdating ||
                              (item.maxStock !== undefined &&
                                item.quantity >=
                                  item.maxStock)
                            }
                            aria-label="Aumentar cantidad"
                          >
                            <Plus aria-hidden="true" />
                          </button>
                        </div>

                        {renderItemPrice(item)}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="checkout-summary-pricing">
                <div>
                  <span>Subtotal</span>
                  <strong>
                    {formatPrice(
                      checkoutPricing.productsSubtotal
                    )}
                  </strong>
                </div>

                {checkoutPricing.productsDiscount > 0 && (
                  <div>
                    <span>Descuentos de productos</span>
                    <strong>
                      −
                      {formatPrice(
                        checkoutPricing.productsDiscount
                      )}
                    </strong>
                  </div>
                )}

                {checkoutPricing.firstPurchaseStatus !==
                  'hidden' &&
                  checkoutPricing.firstPurchaseDiscount >
                    0 && (
                    <div className="checkout-first-purchase-row">
                      <span>
                        <Gift aria-hidden="true" />
                        Primera compra
                        {checkoutPricing.firstPurchaseStatus ===
                        'estimated'
                          ? ' estimada'
                          : ''}
                      </span>
                      <strong>
                        −
                        {formatPrice(
                          checkoutPricing.firstPurchaseDiscount
                        )}
                      </strong>
                    </div>
                  )}

                <div>
                  <span>Envío</span>
                  <strong>
                    {checkoutPricing.shippingCost === 0
                      ? 'Gratis'
                      : formatPrice(
                          checkoutPricing.shippingCost
                        )}
                  </strong>
                </div>
              </div>

              <div className="checkout-summary-total">
                <span>
                  <strong>Total</strong>
                  <small>
                    Impuestos incluidos cuando aplique
                  </small>
                </span>
                <strong>
                  {formatPrice(checkoutPricing.total)}
                </strong>
              </div>

              {!mercadoPagoData?.preferenceId && (
                <button
                  type="button"
                  className="checkout-summary-pay"
                  onClick={() => void preparePayment()}
                  disabled={
                    !checkoutIsReady || preparingPayment
                  }
                >
                  {preparingPayment ? (
                    <>
                      <Loader2
                        className="checkout-spin"
                        aria-hidden="true"
                      />
                      Preparando
                    </>
                  ) : (
                    <>
                      Continuar al pago
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                className="checkout-summary-refresh"
                onClick={() => void refreshCart()}
                disabled={cartUpdating}
              >
                {cartUpdating ? (
                  <Loader2
                    className="checkout-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Package aria-hidden="true" />
                )}
                Actualizar carrito
              </button>

              <div className="checkout-summary-trust">
                <Lock aria-hidden="true" />
                <span>
                  No se realizará ningún cobro hasta que
                  confirmes en Mercado Pago.
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="checkout-mobile-bar">
        <button
          type="button"
          className="checkout-mobile-cart"
          onClick={() =>
            summarySectionRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            })
          }
          aria-label="Ver resumen de compra"
        >
          <span className="checkout-mobile-thumbnails">
            {cartItems.slice(0, 3).map((item) => (
              <span key={item.id}>
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="32px"
                />
              </span>
            ))}
          </span>

          <span>
            <small>
              Ver pedido · {totalItems}{' '}
              {totalItems === 1
                ? 'unidad'
                : 'unidades'}
            </small>
            <strong>
              {formatPrice(checkoutPricing.total)}
            </strong>
          </span>
        </button>

        <button
          type="button"
          className="checkout-mobile-pay"
          onClick={primaryAction}
          disabled={
            (!mercadoPagoData?.preferenceId &&
              !checkoutIsReady) ||
            preparingPayment
          }
        >
          {preparingPayment
            ? 'Preparando…'
            : mercadoPagoData?.preferenceId
              ? 'Pagar'
              : 'Continuar'}
        </button>
      </div>
    </main>
  );
};

const AddressFields = ({
  address,
  onChange
}: {
  address: AddressForm;
  onChange: (
    value:
      | AddressForm
      | ((current: AddressForm) => AddressForm)
  ) => void;
}) => (
  <div className="checkout-form-grid checkout-form-grid-two">
    <label className="checkout-field checkout-field-full">
      <span>
        <MapPin aria-hidden="true" />
        Dirección
      </span>
      <input
        type="text"
        value={address.address}
        onChange={(event) =>
          onChange((current) => ({
            ...current,
            address: event.target.value
          }))
        }
        autoComplete="street-address"
        placeholder="Calle, carrera, número y complemento"
      />
    </label>

    <label className="checkout-field">
      <span>Ciudad</span>
      <input
        type="text"
        value={address.city}
        onChange={(event) =>
          onChange((current) => ({
            ...current,
            city: event.target.value
          }))
        }
        autoComplete="address-level2"
        placeholder="Medellín"
      />
    </label>

    <label className="checkout-field">
      <span>Departamento</span>
      <input
        type="text"
        value={address.state}
        onChange={(event) =>
          onChange((current) => ({
            ...current,
            state: event.target.value
          }))
        }
        autoComplete="address-level1"
        placeholder="Antioquia"
      />
    </label>

    <label className="checkout-field">
      <span>País</span>
      <input
        type="text"
        value={address.country}
        onChange={(event) =>
          onChange((current) => ({
            ...current,
            country: event.target.value
          }))
        }
        autoComplete="country-name"
        placeholder="Colombia"
      />
    </label>

    <label className="checkout-field">
      <span>Código postal</span>
      <input
        type="text"
        value={address.postalCode || ''}
        onChange={(event) =>
          onChange((current) => ({
            ...current,
            postalCode: event.target.value
          }))
        }
        autoComplete="postal-code"
        placeholder="Opcional"
      />
    </label>
  </div>
);

export default CheckoutPage;