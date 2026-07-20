'use client';

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Home,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Package,
  Phone,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User,
  XCircle
} from 'lucide-react';

import './PaymentResult.css';
import { trackPurchase } from '@/app/lib/tracking';
import {
  MERCADOPAGO_STATUS,
  ORDER_CHECK_EXPIRATION,
  ORDER_DETAIL
} from '@/app/utils/Api';

type PaymentViewStatus =
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'unknown';

interface MercadoPagoParams {
  collection_id?: string;
  collection_status?:
    | 'approved'
    | 'pending'
    | 'rejected'
    | 'in_process'
    | 'cancelled';
  payment_id?: string;
  status?: string;
  external_reference?: string;
  merchant_order_id?: string;
  preference_id?: string;
  site_id?: string;
  processing_mode?: string;
  merchant_account_id?: string;
  payment_type?: string;
}

interface OrderItem {
  id: number;
  productVariantId?: number | string;
  name: string;
  image: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
}

interface OrderDetails {
  id: string;
  status: string;
  total: number;
  items: OrderItem[];
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  shippingAddress?: {
    address: string;
    city: string;
    state: string;
    country: string;
  };
  paymentInfo?: {
    method: string;
    installments?: number;
    card?: {
      lastFour?: string;
      brand?: string;
    };
    voucherUrl?: string;
  };
  createdAt: string;
  mercadoPagoPaymentId?: string;
  mercadoPagoStatus?: string;
  stockReservationMinutesLeft?: number;
  stockReservationExpired?: boolean;
  cancellationReason?: string;
}

interface PaymentStatusResponse {
  success?: boolean;
  error?: string;
  orderId?: string | number;
  id?: string | number;
  status?: string;
  orderStatus?: string;
  totalPrice?: number;
  total?: number;
  items?: Array<Record<string, unknown>>;
  orderItems?: Array<Record<string, unknown>>;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  shippingAddress?: OrderDetails['shippingAddress'];
  paymentMethod?: string;
  installments?: number;
  cardDetails?: OrderDetails['paymentInfo'] extends infer T
    ? T extends { card?: infer C }
      ? C
      : never
    : never;
  voucherUrl?: string;
  orderDate?: string;
  createdAt?: string;
  paymentId?: string;
  mercadoPagoStatus?: string;
  mpStatus?: string;
  stockReservationMinutesLeft?: number;
  stockReservationExpired?: boolean;
  cancellationReason?: string;
}

const CART_SESSION_KEY = 'cartSessionId';
const CART_SESSION_COOKIE = 'cart_session_id';
const CART_SESSION_HEADER = 'X-Cart-Session-Id';
const FALLBACK_IMAGE = '/images/placeholder.png';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40;

const normalizeText = (
  value: unknown,
  fallback = ''
): string =>
  typeof value === 'string' && value.trim()
    ? value.trim()
    : fallback;

const normalizeNumber = (
  value: unknown,
  fallback = 0
): number => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : fallback;
};

const getNestedString = (
  source: Record<string, unknown>,
  path: string[]
): string | undefined => {
  let current: unknown = source;

  for (const key of path) {
    if (
      !current ||
      typeof current !== 'object' ||
      !(key in current)
    ) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string'
    ? current
    : undefined;
};

const getNestedNumber = (
  source: Record<string, unknown>,
  path: string[]
): number | undefined => {
  let current: unknown = source;

  for (const key of path) {
    if (
      !current ||
      typeof current !== 'object' ||
      !(key in current)
    ) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[key];
  }

  const numericValue = Number(current);

  return Number.isFinite(numericValue)
    ? numericValue
    : undefined;
};

const normalizeItems = (
  data: PaymentStatusResponse
): OrderItem[] => {
  const sourceItems = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.orderItems)
      ? data.orderItems
      : [];

  return sourceItems.map((rawItem, index) => {
    const item = rawItem as Record<string, unknown>;

    const productName =
      normalizeText(item.productName) ||
      getNestedString(item, ['product', 'name']) ||
      normalizeText(item.name) ||
      `Producto ${index + 1}`;

    const imageUrls = Array.isArray(item.imageUrls)
      ? item.imageUrls
      : [];

    const firstImage =
      imageUrls.find(
        (image): image is string =>
          typeof image === 'string' &&
          Boolean(image.trim())
      ) ||
      normalizeText(item.image) ||
      getNestedString(item, [
        'product',
        'images',
        '0',
        'imageUrl'
      ]) ||
      FALLBACK_IMAGE;

    const itemId =
      normalizeNumber(item.id, index + 1) ||
      index + 1;

    const variantId =
      item.productVariantId ??
      item.variantId ??
      getNestedNumber(item, [
        'productVariant',
        'id'
      ]) ??
      itemId;

    return {
      id: itemId,
      productVariantId:
        typeof variantId === 'string' ||
        typeof variantId === 'number'
          ? variantId
          : itemId,
      name: productName,
      image: firstImage,
      quantity: Math.max(
        1,
        normalizeNumber(item.quantity, 1)
      ),
      price: normalizeNumber(item.price, 0),
      size:
        normalizeText(item.size) ||
        getNestedString(item, [
          'productVariant',
          'size'
        ]),
      color:
        normalizeText(item.color) ||
        getNestedString(item, [
          'productVariant',
          'color'
        ])
    };
  });
};

const normalizeOrderData = (
  data: PaymentStatusResponse,
  requestedOrderId: string
): OrderDetails => {
  const customerNameFromUser = data.user
    ? `${data.user.firstName || ''} ${
        data.user.lastName || ''
      }`.trim()
    : '';

  return {
    id: String(
      data.orderId ?? data.id ?? requestedOrderId
    ),
    status:
      normalizeText(
        data.status || data.orderStatus,
        'UNKNOWN'
      ) || 'UNKNOWN',
    total: normalizeNumber(
      data.totalPrice ?? data.total,
      0
    ),
    items: normalizeItems(data),
    customer: {
      name:
        normalizeText(data.customerName) ||
        normalizeText(data.customer?.name) ||
        customerNameFromUser ||
        'Cliente',
      email:
        normalizeText(data.customerEmail) ||
        normalizeText(data.customer?.email) ||
        normalizeText(data.user?.email),
      phone:
        normalizeText(data.customerPhone) ||
        normalizeText(data.customer?.phone) ||
        normalizeText(data.user?.phone)
    },
    shippingAddress: data.shippingAddress,
    paymentInfo: {
      method:
        normalizeText(
          data.paymentMethod,
          'Mercado Pago'
        ) || 'Mercado Pago',
      installments: data.installments,
      card: data.cardDetails,
      voucherUrl: data.voucherUrl
    },
    createdAt:
      normalizeText(
        data.orderDate || data.createdAt,
        new Date().toISOString()
      ) || new Date().toISOString(),
    mercadoPagoPaymentId: data.paymentId,
    mercadoPagoStatus:
      data.mercadoPagoStatus || data.mpStatus,
    stockReservationMinutesLeft:
      data.stockReservationMinutesLeft,
    stockReservationExpired:
      data.stockReservationExpired,
    cancellationReason: data.cancellationReason
  };
};

const SafeOrderImage = ({
  src,
  alt
}: {
  src: string;
  alt: string;
}) => {
  const [imageSource, setImageSource] = useState(
    src || FALLBACK_IMAGE
  );

  useEffect(() => {
    setImageSource(src || FALLBACK_IMAGE);
  }, [src]);

  return (
    <Image
      src={imageSource}
      alt={alt}
      fill
      className="payment-product-img"
      sizes="(max-width: 640px) 82px, 96px"
      onError={() => {
        if (imageSource !== FALLBACK_IMAGE) {
          setImageSource(FALLBACK_IMAGE);
        }
      }}
    />
  );
};

const StatusIcon = ({
  status
}: {
  status: PaymentViewStatus;
}) => {
  if (status === 'approved') {
    return <CheckCircle2 aria-hidden="true" />;
  }

  if (status === 'pending') {
    return <Clock3 aria-hidden="true" />;
  }

  if (status === 'rejected') {
    return <XCircle aria-hidden="true" />;
  }

  return <AlertCircle aria-hidden="true" />;
};

function PaymentResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasTrackedPurchaseRef = useRef(false);
  const activeRequestRef =
    useRef<AbortController | null>(null);
  const pollingTimerRef = useRef<number | null>(null);
  const pollingAttemptsRef = useRef(0);
  const verifyPaymentRef = useRef<
  ((orderId: string) => Promise<void>) | null
>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [orderDetails, setOrderDetails] =
    useState<OrderDetails | null>(null);
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentViewStatus>('unknown');
  const [timerSeconds, setTimerSeconds] =
    useState<number | null>(null);
  const [isOrderExpired, setIsOrderExpired] =
    useState(false);
  const [isPolling, setIsPolling] = useState(false);

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

  const formatDate = useCallback((dateValue: string) => {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return 'Fecha no disponible';
    }

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }, []);

  const formatTimer = useCallback((seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(
      remainingSeconds
    ).padStart(2, '0')}`;
  }, []);

  const getSessionId = useCallback(() => {
    const existingSessionId =
      localStorage.getItem(CART_SESSION_KEY) ||
      sessionStorage.getItem(CART_SESSION_KEY) ||
      Cookies.get(CART_SESSION_COOKIE);

    if (existingSessionId) {
      localStorage.setItem(
        CART_SESSION_KEY,
        existingSessionId
      );
      sessionStorage.setItem(
        CART_SESSION_KEY,
        existingSessionId
      );

      Cookies.set(
        CART_SESSION_COOKIE,
        existingSessionId,
        {
          expires: 7,
          path: '/',
          sameSite: 'lax',
          secure:
            window.location.protocol === 'https:'
        }
      );

      return existingSessionId;
    }

    const generatedSessionId =
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
        ? `session_${crypto.randomUUID()}`
        : `session_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 11)}`;

    localStorage.setItem(
      CART_SESSION_KEY,
      generatedSessionId
    );
    sessionStorage.setItem(
      CART_SESSION_KEY,
      generatedSessionId
    );

    Cookies.set(
      CART_SESSION_COOKIE,
      generatedSessionId,
      {
        expires: 7,
        path: '/',
        sameSite: 'lax',
        secure:
          window.location.protocol === 'https:'
      }
    );

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

  const clearPolling = useCallback(() => {
    if (pollingTimerRef.current !== null) {
      window.clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    pollingAttemptsRef.current = 0;
    setIsPolling(false);
  }, []);

  const clearPendingOrderStorage = useCallback(
    (clearCartSession = false) => {
      localStorage.removeItem('pendingOrderId');
      localStorage.removeItem('pendingOrderData');
      localStorage.removeItem('pendingPreferenceId');
      localStorage.removeItem('mercadoPagoOrderId');
      localStorage.removeItem('lastOrderCartHash');

      if (clearCartSession) {
        localStorage.removeItem(CART_SESSION_KEY);
        sessionStorage.removeItem(CART_SESSION_KEY);
        Cookies.remove(CART_SESSION_COOKIE, {
          path: '/'
        });
      }
    },
    []
  );

  const determinePaymentStatus = useCallback(
    (order: OrderDetails) => {
      const orderStatus = order.status.toUpperCase();
      const mercadoPagoStatus =
        order.mercadoPagoStatus?.toLowerCase() || '';

      if (
        orderStatus === 'PAGO_APROBADO' ||
        mercadoPagoStatus === 'approved'
      ) {
        setPaymentStatus('approved');
        setIsOrderExpired(false);
        setError('');
        clearPolling();
        clearPendingOrderStorage(true);
        return;
      }

      if (
        orderStatus === 'PENDIENTE' ||
        orderStatus === 'EN_PROCESO' ||
        mercadoPagoStatus === 'pending' ||
        mercadoPagoStatus === 'in_process'
      ) {
        setPaymentStatus('pending');
        setIsOrderExpired(false);
        return;
      }

      if (
        orderStatus === 'PAGO_RECHAZADO' ||
        orderStatus === 'RECHAZADO' ||
        mercadoPagoStatus === 'rejected'
      ) {
        setPaymentStatus('rejected');
        setIsOrderExpired(false);
        setError(
          order.cancellationReason ||
            'El pago no fue aprobado.'
        );
        clearPolling();
        return;
      }

      if (
        orderStatus === 'CANCELADO' ||
        order.stockReservationExpired ||
        mercadoPagoStatus === 'cancelled'
      ) {
        setPaymentStatus('rejected');
        setIsOrderExpired(true);
        setError(
          order.cancellationReason ||
            'La reserva de la orden expiró.'
        );
        clearPolling();
        clearPendingOrderStorage();
        return;
      }

      setPaymentStatus('unknown');
    },
    [
      clearPendingOrderStorage,
      clearPolling
    ]
  );

  const checkOrderExpiration = useCallback(
    async (orderId: string) => {
      try {
        const token = localStorage.getItem('token');

        const response = await fetch(
          ORDER_CHECK_EXPIRATION.replace(
            '{orderId}',
            orderId
          ),
          {
            method: 'POST',
            headers: getRequestHeaders(token),
            credentials: 'include'
          }
        );

        if (!response.ok) {
          return false;
        }

        const data = (await response.json()) as {
          expired?: boolean;
        };

        if (!data.expired) {
          return false;
        }

        setIsOrderExpired(true);
        setPaymentStatus('rejected');
        setError(
          'La reserva de la orden expiró antes de completar el pago.'
        );
        clearPendingOrderStorage();
        clearPolling();

        return true;
      } catch {
        return false;
      }
    },
    [
      clearPendingOrderStorage,
      clearPolling,
      getRequestHeaders
    ]
  );

  const fetchOrderData = useCallback(
    async (
      orderId: string,
      signal?: AbortSignal
    ): Promise<PaymentStatusResponse> => {
      const token = localStorage.getItem('token');
      const headers = getRequestHeaders(token);

      let response = await fetch(
        `${MERCADOPAGO_STATUS}/${orderId}`,
        {
          method: 'GET',
          headers,
          credentials: 'include',
          signal
        }
      );

      if (!response.ok) {
        response = await fetch(
          ORDER_DETAIL(Number(orderId)),
          {
            method: 'GET',
            headers,
            credentials: 'include',
            signal
          }
        );
      }

      if (!response.ok) {
        const responseText = await response.text();

        throw new Error(
          responseText ||
            `No fue posible consultar la orden (${response.status})`
        );
      }

      const data =
        (await response.json()) as PaymentStatusResponse;

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    },
    [getRequestHeaders]
  );

  const schedulePolling = useCallback(
    (orderId: string) => {
      if (
        pollingTimerRef.current !== null ||
        pollingAttemptsRef.current >= MAX_POLL_ATTEMPTS
      ) {
        return;
      }

      setIsPolling(true);

      pollingTimerRef.current = window.setTimeout(
        async () => {
          pollingTimerRef.current = null;
          pollingAttemptsRef.current += 1;

          try {
            const data = await fetchOrderData(orderId);
            const normalizedOrder = normalizeOrderData(
              data,
              orderId
            );

            setOrderDetails(normalizedOrder);
            determinePaymentStatus(normalizedOrder);

            const normalizedStatus =
              normalizedOrder.status.toUpperCase();

            const remainsPending =
              normalizedStatus === 'PENDIENTE' ||
              normalizedStatus === 'EN_PROCESO' ||
              normalizedOrder.mercadoPagoStatus ===
                'pending' ||
              normalizedOrder.mercadoPagoStatus ===
                'in_process';

            if (
              remainsPending &&
              pollingAttemptsRef.current <
                MAX_POLL_ATTEMPTS
            ) {
              schedulePolling(orderId);
            } else {
              clearPolling();
            }
          } catch {
            if (
              pollingAttemptsRef.current <
              MAX_POLL_ATTEMPTS
            ) {
              schedulePolling(orderId);
            } else {
              clearPolling();
            }
          }
        },
        POLL_INTERVAL_MS
      );
    },
    [
      clearPolling,
      determinePaymentStatus,
      fetchOrderData
    ]
  );

  const verifyPayment = useCallback(
    async (
      orderId: string,
      options?: {
        background?: boolean;
      }
    ) => {
      if (!orderId) return;

      const background = Boolean(options?.background);

      activeRequestRef.current?.abort();
      activeRequestRef.current = new AbortController();

      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const expired =
          await checkOrderExpiration(orderId);

        if (expired) {
          return;
        }

        const data = await fetchOrderData(
          orderId,
          activeRequestRef.current.signal
        );

        const normalizedOrder = normalizeOrderData(
          data,
          orderId
        );

        setOrderDetails(normalizedOrder);
        determinePaymentStatus(normalizedOrder);

        if (
          normalizedOrder.stockReservationMinutesLeft !==
            undefined &&
          normalizedOrder.stockReservationMinutesLeft > 0
        ) {
          setTimerSeconds(
            normalizedOrder.stockReservationMinutesLeft *
              60
          );
        } else {
          setTimerSeconds(null);
        }

        const status =
          normalizedOrder.status.toUpperCase();

        if (
          status === 'PENDIENTE' ||
          status === 'EN_PROCESO' ||
          normalizedOrder.mercadoPagoStatus ===
            'pending' ||
          normalizedOrder.mercadoPagoStatus ===
            'in_process'
        ) {
          schedulePolling(orderId);
        }
      } catch (verificationError) {
        if (
          verificationError instanceof Error &&
          verificationError.name === 'AbortError'
        ) {
          return;
        }

        const message =
          verificationError instanceof Error
            ? verificationError.message
            : 'No fue posible verificar el pago';

        setError(message);
        setPaymentStatus('unknown');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      checkOrderExpiration,
      determinePaymentStatus,
      fetchOrderData,
      schedulePolling
    ]
  );

  useEffect(() => {
    verifyPaymentRef.current = verifyPayment;
  }, [verifyPayment]);

  const mercadoPagoParams = useMemo(() => {
    const parameterNames: Array<
      keyof MercadoPagoParams
    > = [
      'collection_id',
      'collection_status',
      'payment_id',
      'status',
      'external_reference',
      'merchant_order_id',
      'preference_id',
      'site_id',
      'processing_mode',
      'merchant_account_id',
      'payment_type'
    ];

    const params: MercadoPagoParams = {};

    parameterNames.forEach((parameterName) => {
      const parameterValue =
        searchParams.get(parameterName);

      if (parameterValue) {
        params[parameterName] =
          parameterValue as never;
      }
    });

    return params;
  }, [searchParams]);

  useEffect(() => {
    const orderId =
      mercadoPagoParams.external_reference ||
      searchParams.get('orderId') ||
      localStorage.getItem('pendingOrderId') ||
      localStorage.getItem('mercadoPagoOrderId');

    if (!orderId) {
      setLoading(false);
      setPaymentStatus('unknown');
      setError(
        'No encontramos una orden asociada a esta página.'
      );
      return;
    }

    void verifyPayment(orderId);

    return () => {
      activeRequestRef.current?.abort();
      clearPolling();
    };
  }, [
    clearPolling,
    mercadoPagoParams.external_reference,
    searchParams,
    verifyPayment
  ]);

  useEffect(() => {
    if (
      timerSeconds === null ||
      timerSeconds <= 0 ||
      paymentStatus !== 'pending'
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimerSeconds((current) => {
        if (current === null || current <= 1) {
          window.clearInterval(timer);

          if (orderDetails?.id) {
            void checkOrderExpiration(orderDetails.id);
          }

          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    checkOrderExpiration,
    orderDetails?.id,
    paymentStatus,
    timerSeconds
  ]);

  useEffect(() => {
    if (
      paymentStatus !== 'approved' ||
      !orderDetails?.id ||
      orderDetails.items.length === 0
    ) {
      return;
    }

    const storageKey = `meta_purchase_tracked_${orderDetails.id}`;

    if (
      hasTrackedPurchaseRef.current ||
      sessionStorage.getItem(storageKey) === 'true'
    ) {
      hasTrackedPurchaseRef.current = true;
      return;
    }

    trackPurchase({
      orderId: orderDetails.id,
      items: orderDetails.items.map((item) => ({
        id: String(
          item.productVariantId ?? item.id
        ),
        quantity: item.quantity,
        item_price: item.price
      })),
      value: orderDetails.total,
      numItems: orderDetails.items.reduce(
        (total, item) => total + item.quantity,
        0
      ),
      currency: 'COP'
    });

    hasTrackedPurchaseRef.current = true;
    sessionStorage.setItem(storageKey, 'true');
  }, [orderDetails, paymentStatus]);

  const retryVerification = useCallback(() => {
    const orderId =
      orderDetails?.id ||
      searchParams.get('orderId') ||
      localStorage.getItem('pendingOrderId') ||
      localStorage.getItem('mercadoPagoOrderId');

    if (!orderId) {
      setError(
        'No encontramos una orden para verificar.'
      );
      return;
    }

    void verifyPayment(orderId, {
      background: true
    });
  }, [
    orderDetails?.id,
    searchParams,
    verifyPayment
  ]);

  const startNewCheckout = useCallback(() => {
    clearPendingOrderStorage();
    router.push('/checkout');
  }, [clearPendingOrderStorage, router]);

  if (loading) {
    return <PaymentLoadingFallback />;
  }

  const title =
    paymentStatus === 'approved'
      ? 'Pago confirmado'
      : paymentStatus === 'pending'
        ? 'Estamos confirmando tu pago'
        : paymentStatus === 'rejected'
          ? isOrderExpired
            ? 'La reserva expiró'
            : 'El pago no fue aprobado'
          : 'Estamos revisando el estado';

  const description =
    paymentStatus === 'approved'
      ? 'Tu orden fue confirmada y comenzará a prepararse.'
      : paymentStatus === 'pending'
        ? 'Mercado Pago o tu entidad financiera todavía está procesando la transacción.'
        : paymentStatus === 'rejected'
          ? isOrderExpired
            ? 'El tiempo disponible para completar el pago terminó.'
            : 'Puedes intentarlo nuevamente usando otro medio de pago.'
          : 'No pudimos obtener una confirmación definitiva de la orden.';

  return (
    <main
      className={`payment-result-container payment-result-container--${paymentStatus}`}
    >
      <header className="payment-topbar">
        <Link href="/" aria-label="Ir al inicio de VALSE">
          <Image
            src="/images/logos/logLog.svg"
            alt="VALSE"
            width={150}
            height={58}
            priority
          />
        </Link>

        <span>
          <Lock aria-hidden="true" />
          Pago protegido
        </span>
      </header>

      <section className="payment-status-hero">
        <div
          className={`payment-status-symbol payment-status-symbol--${paymentStatus}`}
        >
          <StatusIcon status={paymentStatus} />
        </div>

        <span className="payment-status-eyebrow">
          {orderDetails?.id
            ? `ORDEN #${orderDetails.id}`
            : 'RESULTADO DEL PAGO'}
        </span>

        <h1>{title}</h1>
        <p>{description}</p>

        {orderDetails && (
          <div className="payment-status-meta">
            <span>
              {formatDate(orderDetails.createdAt)}
            </span>
            <span>
              {formatPrice(orderDetails.total)}
            </span>
          </div>
        )}

        {paymentStatus === 'pending' &&
          timerSeconds !== null && (
            <div className="payment-reservation">
              <Clock3 aria-hidden="true" />
              <span>
                Reserva disponible durante
              </span>
              <strong>
                {formatTimer(timerSeconds)}
              </strong>
            </div>
          )}

        {isPolling && (
          <div className="payment-polling-note">
            <Loader2
              className="payment-spin"
              aria-hidden="true"
            />
            Actualizando automáticamente
          </div>
        )}
      </section>

      <div className="payment-page-shell">
        {paymentStatus === 'approved' &&
          orderDetails && (
            <ApprovedResult
              order={orderDetails}
              formatDate={formatDate}
              formatPrice={formatPrice}
            />
          )}

        {paymentStatus !== 'approved' && (
          <StatusResult
            status={paymentStatus}
            error={error}
            expired={isOrderExpired}
            order={orderDetails}
            refreshing={refreshing}
            onRetry={retryVerification}
            onNewCheckout={startNewCheckout}
            formatPrice={formatPrice}
          />
        )}
      </div>
    </main>
  );
}

const ApprovedResult = ({
  order,
  formatDate,
  formatPrice
}: {
  order: OrderDetails;
  formatDate: (value: string) => string;
  formatPrice: (value: number) => string;
}) => (
  <div className="payment-approved-layout">
    <section className="payment-order-content">
      <div className="payment-section-heading">
        <div>
          <span>DETALLE DEL PEDIDO</span>
          <h2>Lo que compraste</h2>
        </div>

        <span className="payment-item-count">
          {order.items.reduce(
            (total, item) => total + item.quantity,
            0
          )}{' '}
          unidades
        </span>
      </div>

      {order.items.length > 0 ? (
        <div className="payment-products-list">
          {order.items.map((item) => (
            <article
              key={`${item.id}-${item.productVariantId ?? ''}`}
              className="payment-product-item"
            >
              <div className="payment-product-image">
                <SafeOrderImage
                  src={item.image}
                  alt={item.name}
                />
              </div>

              <div className="payment-product-details">
                <h3>{item.name}</h3>

                <div className="payment-product-attributes">
                  {item.size && (
                    <span>Talla {item.size}</span>
                  )}
                  {item.color && (
                    <span>{item.color}</span>
                  )}
                  <span>
                    Cantidad {item.quantity}
                  </span>
                </div>
              </div>

              <div className="payment-product-price">
                <small>
                  {formatPrice(item.price)} c/u
                </small>
                <strong>
                  {formatPrice(
                    item.price * item.quantity
                  )}
                </strong>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="payment-empty-products">
          <Package aria-hidden="true" />
          <p>
            La orden fue confirmada, pero el backend no
            devolvió el detalle de productos.
          </p>
        </div>
      )}

      <div className="payment-next-steps">
        <div>
          <Check aria-hidden="true" />
          <span>
            <strong>Pago recibido</strong>
            La transacción fue confirmada.
          </span>
        </div>

        <div>
          <Package aria-hidden="true" />
          <span>
            <strong>Preparación</strong>
            Organizaremos las prendas de tu pedido.
          </span>
        </div>

        <div>
          <Truck aria-hidden="true" />
          <span>
            <strong>Envío</strong>
            Recibirás las novedades por correo.
          </span>
        </div>
      </div>
    </section>

    <aside className="payment-order-summary">
      <div className="payment-summary-block">
        <span className="payment-summary-eyebrow">
          RESUMEN
        </span>

        <div className="payment-summary-order">
          <span>Orden</span>
          <strong>#{order.id}</strong>
        </div>

        <div className="payment-summary-order">
          <span>Fecha</span>
          <strong>{formatDate(order.createdAt)}</strong>
        </div>

        <div className="payment-summary-total">
          <span>Total pagado</span>
          <strong>{formatPrice(order.total)}</strong>
        </div>
      </div>

      <InfoBlock
        icon={<User aria-hidden="true" />}
        title="Cliente"
      >
        <strong>{order.customer.name}</strong>
        {order.customer.email && (
          <span>
            <Mail aria-hidden="true" />
            {order.customer.email}
          </span>
        )}
        {order.customer.phone && (
          <span>
            <Phone aria-hidden="true" />
            {order.customer.phone}
          </span>
        )}
      </InfoBlock>

      {order.shippingAddress && (
        <InfoBlock
          icon={<MapPin aria-hidden="true" />}
          title="Entrega"
        >
          <strong>
            {order.shippingAddress.address}
          </strong>
          <span>
            {order.shippingAddress.city},{' '}
            {order.shippingAddress.state}
          </span>
          <span>
            {order.shippingAddress.country}
          </span>
        </InfoBlock>
      )}

      {order.paymentInfo && (
        <InfoBlock
          icon={<CreditCard aria-hidden="true" />}
          title="Pago"
        >
          <strong>{order.paymentInfo.method}</strong>

          {order.paymentInfo.installments && (
            <span>
              {order.paymentInfo.installments} cuotas
            </span>
          )}

          {order.paymentInfo.card?.lastFour && (
            <span>
              {order.paymentInfo.card.brand || 'Tarjeta'}{' '}
              terminada en{' '}
              {order.paymentInfo.card.lastFour}
            </span>
          )}
        </InfoBlock>
      )}

      <div className="payment-summary-actions">
        <Link
          href="/orders"
          className="payment-button payment-button--primary"
        >
          Ver mis pedidos
          <ArrowRight aria-hidden="true" />
        </Link>

        <Link
          href="/menu"
          className="payment-button payment-button--secondary"
        >
          Seguir comprando
        </Link>

        <button
          type="button"
          className="payment-print-button"
          onClick={() => window.print()}
        >
          <Printer aria-hidden="true" />
          Imprimir comprobante
        </button>
      </div>

      <div className="payment-security-note">
        <ShieldCheck aria-hidden="true" />
        <span>
          Pago procesado mediante una conexión protegida.
        </span>
      </div>
    </aside>
  </div>
);

const InfoBlock = ({
  icon,
  title,
  children
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="payment-info-block">
    <div className="payment-info-block-title">
      {icon}
      <span>{title}</span>
    </div>

    <div className="payment-info-block-content">
      {children}
    </div>
  </section>
);

const StatusResult = ({
  status,
  error,
  expired,
  order,
  refreshing,
  onRetry,
  onNewCheckout,
  formatPrice
}: {
  status: Exclude<PaymentViewStatus, 'approved'>;
  error: string;
  expired: boolean;
  order: OrderDetails | null;
  refreshing: boolean;
  onRetry: () => void;
  onNewCheckout: () => void;
  formatPrice: (value: number) => string;
}) => (
  <section className="payment-status-card">
    <div className="payment-status-card-copy">
      <span>
        {status === 'pending'
          ? '¿QUÉ ESTÁ PASANDO?'
          : status === 'rejected'
            ? 'INFORMACIÓN DEL PAGO'
            : 'VERIFICACIÓN'}
      </span>

      <h2>
        {status === 'pending'
          ? 'No necesitas repetir el pago.'
          : status === 'rejected'
            ? expired
              ? 'Prepara una nueva orden.'
              : 'Prueba con otro medio de pago.'
            : 'Puedes volver a consultar la orden.'}
      </h2>

      <p>
        {error ||
          (status === 'pending'
            ? 'La confirmación puede tardar algunos minutos. Esta página se actualiza automáticamente.'
            : status === 'rejected'
              ? 'No se realizó ningún cobro confirmado.'
              : 'Conservaremos la referencia de la orden mientras realizas una nueva consulta.')}
      </p>

      {order && (
        <div className="payment-status-order">
          <div>
            <span>Orden</span>
            <strong>#{order.id}</strong>
          </div>

          <div>
            <span>Total</span>
            <strong>
              {formatPrice(order.total)}
            </strong>
          </div>

          <div>
            <span>Estado</span>
            <strong>{order.status}</strong>
          </div>
        </div>
      )}
    </div>

    <div className="payment-status-guidance">
      {status === 'pending' ? (
        <>
          <GuidanceItem
            number="01"
            title="No cierres el proceso"
            text="Espera unos minutos mientras recibimos la respuesta definitiva."
          />
          <GuidanceItem
            number="02"
            title="Revisa tu correo"
            text="Mercado Pago también puede enviarte el resultado de la transacción."
          />
          <GuidanceItem
            number="03"
            title="Consulta nuevamente"
            text="Usa el botón solo cuando necesites actualizar el estado manualmente."
          />
        </>
      ) : (
        <>
          <GuidanceItem
            number="01"
            title="Verifica los datos"
            text="Confirma el medio de pago y la información solicitada por tu entidad."
          />
          <GuidanceItem
            number="02"
            title="Cambia el medio de pago"
            text="Puedes usar otra tarjeta, PSE u otra opción disponible."
          />
          <GuidanceItem
            number="03"
            title="Conserva la referencia"
            text="El número de orden será útil si necesitas soporte."
          />
        </>
      )}

      <div className="payment-status-actions">
        {status !== 'rejected' || !expired ? (
          <button
            type="button"
            className="payment-button payment-button--primary"
            onClick={onRetry}
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <Loader2
                  className="payment-spin"
                  aria-hidden="true"
                />
                Verificando
              </>
            ) : (
              <>
                <RefreshCw aria-hidden="true" />
                Verificar de nuevo
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="payment-button payment-button--primary"
            onClick={onNewCheckout}
          >
            <RotateCcw aria-hidden="true" />
            Crear nueva orden
          </button>
        )}

        <Link
          href="/"
          className="payment-button payment-button--secondary"
        >
          <Home aria-hidden="true" />
          Volver al inicio
        </Link>
      </div>
    </div>
  </section>
);

const GuidanceItem = ({
  number,
  title,
  text
}: {
  number: string;
  title: string;
  text: string;
}) => (
  <div className="payment-guidance-item">
    <span>{number}</span>

    <div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  </div>
);

function PaymentLoadingFallback() {
  return (
    <main className="payment-result-container payment-result-container--loading">
      <header className="payment-topbar">
        <Link href="/" aria-label="Ir al inicio de VALSE">
          <Image
            src="/images/logos/logLog.svg"
            alt="VALSE"
            width={150}
            height={58}
            priority
          />
        </Link>

        <span>
          <Lock aria-hidden="true" />
          Pago protegido
        </span>
      </header>

      <section className="payment-loading">
        <span className="payment-loading-symbol">
          <Loader2
            className="payment-spin"
            aria-hidden="true"
          />
        </span>

        <span>VALSE / CONFIRMACIÓN</span>
        <h1>Verificando tu compra</h1>
        <p>
          Estamos consultando el estado definitivo de la
          orden.
        </p>
      </section>
    </main>
  );
}

export default function PaymentResult() {
  return (
    <Suspense fallback={<PaymentLoadingFallback />}>
      <PaymentResultContent />
    </Suspense>
  );
}