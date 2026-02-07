// app/components/PaymentResult.tsx
'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Package, 
  CreditCard, 
  User, 
  MapPin, 
  ShoppingBag,
  Loader2,
  AlertCircle,
  Shield,
  Mail,
  Phone,
  Check,
  ArrowLeft,
  Home,
  ExternalLink,
  RefreshCw,
  Calendar,
  Truck,
  Gift,
  Share2,
  Printer,
  Download,
  FileText,
  MessageSquare,
  Star,
  Sparkles,
  Lock,
  CheckCheck,
  RotateCcw
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import './PaymentResult.css';

// Importar las constantes desde tu Api.ts
import { 
  MERCADOPAGO_STATUS,
  ORDER_DETAIL,
  ORDER_CHECK_EXPIRATION,
  API_BASE_URL
} from '@/app/utils/Api';

// Tipos de respuesta de Mercado Pago
interface MercadoPagoParams {
  collection_id?: string;
  collection_status?: 'approved' | 'pending' | 'rejected' | 'in_process' | 'cancelled';
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

interface OrderDetails {
  id: string;
  status: string;
  total: number;
  items: Array<{
    id: number;
    name: string;
    image: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
  }>;
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

// Componente principal envuelto en Suspense
function PaymentResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'approved' | 'pending' | 'rejected' | 'unknown'>('unknown');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [isOrderExpired, setIsOrderExpired] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingAttempts, setPollingAttempts] = useState(0);

  // 🔴 OBTENER SESSION ID (igual que en Checkout.tsx)
  const getSessionId = useCallback(() => {
    let sessionId = localStorage.getItem('cartSessionId');
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('cartSessionId', sessionId);
      console.log('🆕 Nuevo sessionId creado:', sessionId.substring(0, 8) + '...');
    }
    
    sessionStorage.setItem('cartSessionId', sessionId);
    return sessionId;
  }, []);

  // 🔴 OBTENER HEADERS (igual que en Checkout.tsx)
  const getRequestHeaders = useCallback((token?: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const currentSessionId = getSessionId();
    headers['X-Cart-Session-Id'] = currentSessionId;
    
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('📤 Headers enviados:', {
        'X-Cart-Session-Id': currentSessionId.substring(0, 8) + '...',
        'Authorization': token ? 'Presente' : 'No'
      });
    }

    return headers;
  }, [getSessionId]);

  // Extraer parámetros de Mercado Pago
  const getMercadoPagoParams = (): MercadoPagoParams => {
    const params: MercadoPagoParams = {};
    
    const possibleParams = [
      'collection_id', 'collection_status', 'payment_id', 'status',
      'external_reference', 'merchant_order_id', 'preference_id',
      'site_id', 'processing_mode', 'merchant_account_id', 'payment_type'
    ];
    
    possibleParams.forEach(param => {
      const value = searchParams.get(param);
      if (value) {
        (params as any)[param] = value;
      }
    });

    const orderId = searchParams.get('orderId');
    if (orderId && !params.external_reference) {
      params.external_reference = orderId;
    }

    return params;
  };

  // 🔴 DETERMINAR ESTADO DEL PAGO - SOLO SEGÚN ESTADO DE LA ORDEN EN EL BACKEND (fuente de verdad)
  const determinePaymentStatus = useCallback((orderData: any) => {
    const status = orderData.status?.toUpperCase() || '';
    const mpStatus = orderData.mercadoPagoStatus?.toLowerCase() || '';

    console.log('🔍 Estado desde backend (fuente de verdad):', { status, mpStatus });

    // Solo mostrar "Pago aprobado" cuando el backend confirmó la orden (PAGO_APROBADO)
    if (status === 'PAGO_APROBADO') {
      setPaymentStatus('approved');
      setSuccessMessage('✅ ¡Pago confirmado exitosamente! Tu pedido está en camino.');

      localStorage.removeItem('pendingOrderId');
      localStorage.removeItem('pendingOrderData');
      localStorage.removeItem('pendingPreferenceId');
      localStorage.removeItem('lastOrderCartHash');
      localStorage.removeItem('cartSessionId');
      sessionStorage.removeItem('cartSessionId');

    } else if (status === 'PENDIENTE') {
      setPaymentStatus('pending');

    } else if (status === 'PAGO_RECHAZADO' || status === 'RECHAZADO') {
      setPaymentStatus('rejected');
      setError(`❌ ${orderData.cancellationReason || 'El pago fue rechazado'}`);

    } else if (status === 'CANCELADO') {
      setPaymentStatus('rejected');
      setIsOrderExpired(true);
      setError(`❌ ${orderData.cancellationReason || 'La orden fue cancelada por expiración'}`);

      localStorage.removeItem('pendingOrderId');
      localStorage.removeItem('pendingOrderData');
      localStorage.removeItem('pendingPreferenceId');
      localStorage.removeItem('lastOrderCartHash');

    } else {
      // Estado desconocido o no coincidente (ej. MP aprobó pero backend no confirmó)
      setPaymentStatus('unknown');
      console.warn('Estado desde backend no reconocido:', orderData);
    }
  }, []);

  // 🔴 VERIFICAR EXPIRACIÓN DE ORDEN
  const checkOrderExpiration = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      const headers = getRequestHeaders(token);
      
      const response = await fetch(`${ORDER_CHECK_EXPIRATION.replace('{orderId}', orderId)}`, {
        method: 'POST',
        headers,
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.expired) {
          console.log('🔴 Orden expirada detectada');
          setIsOrderExpired(true);
          
          // Limpiar datos de orden expirada
          localStorage.removeItem('pendingOrderId');
          localStorage.removeItem('pendingOrderData');
          localStorage.removeItem('pendingPreferenceId');
          localStorage.removeItem('lastOrderCartHash');
          
          setError('⚠️ La orden ha expirado porque no se completó el pago en 10 minutos.');
          return true;
        }
      }
    } catch (error) {
      console.error('Error verificando expiración:', error);
    }
    
    return false;
  }, [getRequestHeaders]);

  // 🔴 POLLING PARA WEBHOOK (máx 2 minutos)
  const pollForWebhookCompletion = useCallback(async (orderId: string, maxAttempts = 120) => {
    console.log('🔄 Iniciando polling para webhook (máx 2 minutos)...');
    setIsPolling(true);
    
    let attempts = 0;
    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        const token = localStorage.getItem('token');
        const headers = getRequestHeaders(token);
        
        const response = await fetch(`${MERCADOPAGO_STATUS}/${orderId}`, {
          method: 'GET',
          headers,
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Poll intento ${attempts}: Estado = ${data.status}`);
          
          // Si el estado cambió de PENDIENTE, webhook llegó
          if (data.status && data.status !== 'PENDIENTE') {
            clearInterval(pollInterval);
            console.log('🎉 Webhook procesado! Actualizando UI...');
            setOrderDetails(data);
            determinePaymentStatus(data);
            setIsPolling(false);
            return;
          }
        }
      } catch (error) {
        console.error(`❌ Error en poll intento ${attempts}:`, error);
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        console.log('⏱️ Timeout de polling (2 minutos) - Mostrando estado PENDIENTE');
        setIsPolling(false);
        return;
      }
      
      setPollingAttempts(attempts);
    }, 1000); // Polling cada 1 segundo
    
    return pollInterval;
  }, [getRequestHeaders, determinePaymentStatus]);

  // 🔴 VERIFICAR ESTADO DEL PAGO EN EL BACKEND
  const verifyPayment = useCallback(async (orderId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage('');
      
      console.log('🔍 Verificando pago para orden:', orderId);

      const token = localStorage.getItem('token');
      const headers = getRequestHeaders(token);
      
      // 🔴 PRIMERO: VERIFICAR EXPIRACIÓN
      const isExpired = await checkOrderExpiration(orderId);
      if (isExpired) {
        setLoading(false);
        return;
      }

      // 🔴 SEGUNDO: OBTENER ESTADO DEL PAGO
      console.log('📊 Consultando endpoint de pagos:', MERCADOPAGO_STATUS);
      let response = await fetch(`${MERCADOPAGO_STATUS}/${orderId}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      console.log('📊 Respuesta endpoint pagos:', response.status);

      if (!response.ok) {
        console.log('⚠️ Endpoint de pagos no disponible, intentando con orders...');
        
        // 🔴 ALTERNATIVA: OBTENER DETALLES DE LA ORDEN
        response = await fetch(`${ORDER_DETAIL(parseInt(orderId))}`, {
          method: 'GET',
          headers,
          credentials: 'include'
        });
        
        console.log('📊 Respuesta endpoint orders:', response.status);
      }

      if (!response.ok) {
        // Si ambos endpoints fallan, verificar si es una orden expirada
        if (response.status === 404) {
          const pendingOrderId = localStorage.getItem('pendingOrderId');
          if (pendingOrderId === orderId) {
            console.log('🔄 Orden encontrada en localStorage pero no en backend (probablemente expirada)');
            
            setOrderDetails({
              id: orderId,
              status: 'CANCELADO',
              total: 0,
              items: [],
              customer: {
                name: 'Cliente',
                email: '',
                phone: ''
              },
              createdAt: new Date().toISOString(),
              cancellationReason: 'La orden ha expirado automáticamente (10 minutos)'
            });
            
            setPaymentStatus('rejected');
            setIsOrderExpired(true);
            setError('⚠️ La orden ha expirado porque no se completó el pago en 10 minutos.');
            
            localStorage.removeItem('pendingOrderId');
            localStorage.removeItem('pendingOrderData');
            localStorage.removeItem('pendingPreferenceId');
            
            return;
          }
        }
        
        throw new Error(`Error ${response.status}: No se pudo verificar el estado del pago`);
      }

      const data = await response.json();
      console.log('✅ Datos recibidos del backend:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // 🔴 PROCESAR RESPUESTA
      let orderData: OrderDetails;
      
      // Formato 1: Desde /api/payments/status/{orderId}
      if (data.success !== undefined) {
        orderData = {
          id: data.orderId?.toString() || orderId,
          status: data.status || data.orderStatus || 'UNKNOWN',
          total: data.totalPrice || data.total || 0,
          items: data.items?.map((item: any, index: number) => ({
            id: item.id || index,
            name: item.productName || item.name || `Producto ${index + 1}`,
            image: item.imageUrls?.[0] || item.image || '/images/placeholder.png',
            quantity: item.quantity || 1,
            price: item.price || 0,
            size: item.size,
            color: item.color
          })) || [],
          customer: {
            name: data.customerName || data.customer?.name || 'Cliente',
            email: data.customerEmail || data.customer?.email || '',
            phone: data.customerPhone || data.customer?.phone || ''
          },
          shippingAddress: data.shippingAddress,
          paymentInfo: {
            method: data.paymentMethod || 'Mercado Pago',
            installments: data.installments,
            card: data.cardDetails,
            voucherUrl: data.voucherUrl
          },
          createdAt: data.orderDate || data.createdAt || new Date().toISOString(),
          mercadoPagoPaymentId: data.paymentId,
          mercadoPagoStatus: data.mercadoPagoStatus || data.mpStatus,
          stockReservationMinutesLeft: data.stockReservationMinutesLeft,
          stockReservationExpired: data.stockReservationExpired,
          cancellationReason: data.cancellationReason
        };
      } 
      // Formato 2: Desde /api/orders/{orderId}
      else {
        orderData = {
          id: data.id?.toString() || orderId,
          status: data.status || 'UNKNOWN',
          total: data.totalPrice || 0,
          items: data.orderItems?.map((item: any) => ({
            id: item.id,
            name: item.product?.name || `Producto ${item.id}`,
            image: item.product?.images?.[0]?.imageUrl || '/images/placeholder.png',
            quantity: item.quantity,
            price: item.price,
            size: item.productVariant?.size,
            color: item.productVariant?.color
          })) || [],
          customer: {
            name: data.user ? `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() : data.customerEmail || 'Cliente',
            email: data.user?.email || data.customerEmail || '',
            phone: data.user?.phone || ''
          },
          shippingAddress: data.shippingAddress,
          createdAt: data.orderDate || new Date().toISOString(),
          mercadoPagoStatus: data.mercadoPagoStatus
        };
      }

      setOrderDetails(orderData);
      determinePaymentStatus(orderData);
      
      // 🔴 INICIAR TIMER SI LA ORDEN ESTÁ PENDIENTE
      if (orderData.status === 'PENDIENTE' && orderData.stockReservationMinutesLeft && orderData.stockReservationMinutesLeft > 0) {
        setTimerSeconds(orderData.stockReservationMinutesLeft * 60);
        
        // 🔴 INICIAR POLLING PARA WEBHOOK (máx 2 minutos = 120 segundos)
        console.log('🔔 Orden pendiente - iniciando polling para webhook...');
        await pollForWebhookCompletion(orderId);
      }

    } catch (err) {
      console.error('❌ Error verificando pago:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido al verificar el pago');
    } finally {
      setLoading(false);
    }
  }, [checkOrderExpiration, determinePaymentStatus, getRequestHeaders, pollForWebhookCompletion]);

  // 🔴 MANEJAR PARÁMETROS DE MERCADO PAGO
  const handleMercadoPagoRedirect = useCallback(async (params: MercadoPagoParams) => {
    console.log('📊 Parámetros recibidos de Mercado Pago:', params);
    
    let orderId: string | null = null;

    // Prioridad 1: external_reference (orderId que enviamos)
    if (params.external_reference) {
      orderId = params.external_reference;
      console.log('✅ OrderId de external_reference:', orderId);
    } 
    // Prioridad 2: orderId en URL
    else {
      orderId = searchParams.get('orderId');
      console.log('🔍 OrderId de URL:', orderId);
    }

    // Prioridad 3: localStorage
    if (!orderId) {
      orderId = localStorage.getItem('pendingOrderId');
      console.log('🔄 OrderId de localStorage:', orderId);
    }

    if (!orderId) {
      setError('No se pudo identificar la orden. Por favor, contacta con soporte.');
      setLoading(false);
      return;
    }

    // Verificar estado del pago en el backend (única fuente de verdad)
    await verifyPayment(orderId);
    // El estado mostrado lo define determinePaymentStatus dentro de verifyPayment,
    // según el status de la orden en el backend. No usamos params.collection_status
    // para evitar mostrar "Pago aprobado" si el backend no confirmó (ej. validación de monto).
  }, [searchParams, verifyPayment]);

  // 🔴 EFECTO PRINCIPAL
  useEffect(() => {
    const params = getMercadoPagoParams();
    
    if (Object.keys(params).length > 0) {
      // ✅ CASO 1: Viene de Mercado Pago (pago completado o salió)
      console.log('✅ CASO 1: Retorno desde Mercado Pago con parámetros');
      handleMercadoPagoRedirect(params);
    } else {
      // Acceso directo a la página
      const orderId = searchParams.get('orderId');
      if (orderId) {
        // ✅ CASO 2: URL directa con orderId
        console.log('✅ CASO 2: URL directa con orderId');
        verifyPayment(orderId);
      } else {
        // Verificar si hay orden pendiente en localStorage
        const pendingOrderId = localStorage.getItem('pendingOrderId');
        if (pendingOrderId) {
          // ✅ CASO 3: Orden pendiente en localStorage
          console.log('✅ CASO 3: Usuario accedió sin parámetros - Orden pendiente en localStorage:', pendingOrderId);
          verifyPayment(pendingOrderId);
        } else {
          // 🔴 CASO 4: Usuario salió de Mercado Pago SIN parámetros y SIN orden pendiente
          // Esto significa que:
          // - Volvió de Mercado Pago sin completar pago (rechazó o cerró)
          // - La orden EXISTE en backend pero aún no tiene referencia
          console.log('⚠️ CASO 4: Usuario sin parámetros ni orden pendiente');
          console.log('📋 Esto podría significar:');
          console.log('   - Volvió de Mercado Pago sin completar pago');
          console.log('   - Cerró la ventana de Mercado Pago');
          console.log('   - Entrada directa a /checkout/success');
          
          // 🔴 INTENTAR RECUPERAR ORDEN DEL BACKEND POR SESSIONID
          const sessionId = localStorage.getItem('cartSessionId');
          if (sessionId) {
            console.log('🔍 Intentando buscar orden por sessionId...');
            // ✅ MOSTRAR ESTADO PENDIENTE CON MENSAJE AMIGABLE
            setError('⚠️ Tu orden está pendiente de pago. Tienes 15 minutos para completar la transacción en Mercado Pago.');
            setPaymentStatus('pending');
            setLoading(false);
            
            // Intentar obtener los detalles de la orden por sessionId después
            // (esto debería ser un endpoint adicional en el backend si es necesario)
          } else {
            // Sin sessionId, realmente no tenemos referencia
            setError('❌ No se encontraron datos de tu orden. Por favor, inicia el proceso de pago desde el inicio.');
            setLoading(false);
          }
        }
      }
    }
  }, [handleMercadoPagoRedirect, verifyPayment, searchParams]);

  // 🔴 TIMER PARA ÓRDENES PENDIENTES
  useEffect(() => {
    if (timerSeconds !== null && timerSeconds > 0) {
      const timer = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            
            // Si se acaba el tiempo, verificar expiración
            if (orderDetails?.id) {
              checkOrderExpiration(orderDetails.id);
            }
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timerSeconds, orderDetails?.id, checkOrderExpiration]);

  // Formatear precio
  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }, []);

  // Formatear fecha
  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return 'Fecha no disponible';
    }
  }, []);

  // 🔴 REINTENTAR VERIFICACIÓN
  const retryVerification = () => {
    if (orderDetails?.id) {
      verifyPayment(orderDetails.id);
    } else {
      const pendingOrderId = localStorage.getItem('pendingOrderId');
      if (pendingOrderId) {
        verifyPayment(pendingOrderId);
      } else {
        setError('No hay orden para verificar');
      }
    }
  };

  // 🔴 CREAR NUEVA ORDEN (si expiró)
  const createNewOrder = () => {
    localStorage.removeItem('pendingOrderId');
    localStorage.removeItem('pendingOrderData');
    localStorage.removeItem('pendingPreferenceId');
    router.push('/checkout');
  };

  // Componente de loading
  if (loading) {
    return <PaymentLoadingFallback />;
  }

  // Componente de error
  if (error && !orderDetails) {
    return (
      <div className="payment-result-container">
        <div className="payment-error-state">
          <div className="payment-error-icon">
            <AlertCircle className="payment-icon-xxl" />
          </div>
          <h1 className="payment-error-title">
            {isOrderExpired ? 'Orden Expirada' : 'Error al verificar el pago'}
          </h1>
          <p className="payment-error-message">
            {error}
          </p>
          
          <div className="payment-error-actions">
            {isOrderExpired ? (
              <>
                <button
                  onClick={createNewOrder}
                  className="payment-btn payment-btn-primary"
                >
                  <ShoppingBag className="payment-icon" />
                  Crear Nueva Orden
                </button>
                <Link
                  href="/"
                  className="payment-btn payment-btn-outline"
                >
                  <Home className="payment-icon" />
                  Volver al inicio
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={retryVerification}
                  className="payment-btn payment-btn-primary"
                >
                  <RefreshCw className="payment-icon" />
                  Reintentar
                </button>
                <Link
                  href="/"
                  className="payment-btn payment-btn-outline"
                >
                  <Home className="payment-icon" />
                  Volver al inicio
                </Link>
                <Link
                  href="/contact"
                  className="payment-btn payment-btn-secondary"
                >
                  <Shield className="payment-icon" />
                  Contactar soporte
                </Link>
              </>
            )}
            
            {/* Botón oculto para ir al checkout (se muestra si el usuario salió de MP) */}
            <button
              id="go-to-checkout-btn"
              onClick={() => router.push('/checkout')}
              className="payment-btn payment-btn-outline"
              style={{ display: 'none' }}
            >
              <ArrowLeft className="payment-icon" />
              Volver al Checkout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar según estado del pago
  const renderByStatus = () => {
    switch (paymentStatus) {
      case 'approved':
        return renderApproved();
      case 'pending':
        return renderPending();
      case 'rejected':
        return renderRejected();
      default:
        return renderUnknown();
    }
  };

  // Pago aprobado
  const renderApproved = () => {
    if (!orderDetails) return null;

    return (
      <div className="payment-result-container">
        {/* Decoraciones */}
        <div className="payment-decorative-elements">
          <div className="payment-decorative-icon star">
            <Star className="payment-icon-sm" fill="currentColor" />
          </div>
          <div className="payment-decorative-icon sparkles">
            <Sparkles className="payment-icon-md" />
          </div>
        </div>

        {/* Encabezado de éxito */}
        <header className="payment-status-header payment-status-approved">
          <div className="payment-status-icon">
            <CheckCircle className="payment-icon-xxl" />
          </div>
          <h1 className="payment-status-title">¡Pago Aprobado!</h1>
          <p className="payment-status-subtitle">
            Tu pedido ha sido confirmado exitosamente.
            <br />
            <span className="payment-order-info">
              Orden #{orderDetails.id} • {formatDate(orderDetails.createdAt)}
            </span>
          </p>
          <div className="payment-success-badges">
            <div className="payment-success-badge">
              <CheckCheck className="payment-icon-sm" />
              <span>Stock confirmado</span>
            </div>
            <div className="payment-success-badge">
              <Package className="payment-icon-sm" />
              <span>Preparando envío</span>
            </div>
            <div className="payment-success-badge">
              <Truck className="payment-icon-sm" />
              <span>Entrega en 3-5 días</span>
            </div>
          </div>
        </header>

        <main className="payment-result-main">
          <div className="payment-back-button">
            <Link href="/" className="payment-back-link">
              <ArrowLeft className="payment-icon" />
              <span>Volver al inicio</span>
            </Link>
          </div>

          {/* Tarjeta de resumen */}
          <div className="payment-summary-card">
            <div className="payment-summary-grid">
              {/* Información del cliente */}
              <div className="payment-customer-info">
                <h2 className="payment-section-title">
                  <User className="payment-icon" />
                  Información del Cliente
                </h2>
                <div className="payment-info-grid">
                  <div>
                    <p className="payment-info-label">Nombre</p>
                    <p className="payment-info-value">{orderDetails.customer.name}</p>
                  </div>
                  <div>
                    <p className="payment-info-label">Email</p>
                    <p className="payment-info-value">{orderDetails.customer.email}</p>
                  </div>
                  {orderDetails.customer.phone && (
                    <div>
                      <p className="payment-info-label">Teléfono</p>
                      <p className="payment-info-value">{orderDetails.customer.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información de envío */}
              {orderDetails.shippingAddress && (
                <div className="payment-shipping-info">
                  <h2 className="payment-section-title">
                    <MapPin className="payment-icon" />
                    Dirección de Envío
                  </h2>
                  <div className="payment-address-details">
                    <p className="payment-address-line">{orderDetails.shippingAddress.address}</p>
                    <p className="payment-address-line">
                      {orderDetails.shippingAddress.city}, {orderDetails.shippingAddress.state}
                    </p>
                    <p className="payment-address-line">{orderDetails.shippingAddress.country}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Productos */}
          <div className="payment-products-card">
            <h2 className="payment-section-title">
              <ShoppingBag className="payment-icon" />
              Productos ({orderDetails.items.length})
            </h2>
            <div className="payment-products-list">
              {orderDetails.items.map((item) => (
                <div key={item.id} className="payment-product-item">
                  <div className="payment-product-image">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="payment-product-img"
                      sizes="(max-width: 768px) 100px, 120px"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/placeholder.png';
                      }}
                    />
                  </div>
                  <div className="payment-product-details">
                    <h3 className="payment-product-name">{item.name}</h3>
                    <div className="payment-product-attributes">
                      {item.size && <span className="payment-product-size">Talla: {item.size}</span>}
                      {item.color && <span className="payment-product-color">Color: {item.color}</span>}
                    </div>
                  </div>
                  <div className="payment-product-price">
                    <p className="payment-product-unit">{formatPrice(item.price)}</p>
                    <p className="payment-product-quantity">x{item.quantity}</p>
                    <p className="payment-product-total">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="payment-total-section">
              <div className="payment-total-row">
                <span className="payment-total-label">Total</span>
                <span className="payment-total-value">{formatPrice(orderDetails.total)}</span>
              </div>
            </div>
          </div>

          {/* Información del pago */}
          {orderDetails.paymentInfo && (
            <div className="payment-info-card">
              <h2 className="payment-section-title">
                <CreditCard className="payment-icon" />
                Información del Pago
              </h2>
              <div className="payment-details-grid">
                <div>
                  <p className="payment-info-label">Método de pago</p>
                  <p className="payment-info-value">{orderDetails.paymentInfo.method}</p>
                </div>
                {orderDetails.paymentInfo.installments && (
                  <div>
                    <p className="payment-info-label">Cuotas</p>
                    <p className="payment-info-value">{orderDetails.paymentInfo.installments} cuotas</p>
                  </div>
                )}
                {orderDetails.paymentInfo.card?.lastFour && (
                  <div>
                    <p className="payment-info-label">Tarjeta</p>
                    <p className="payment-info-value">
                      **** **** **** {orderDetails.paymentInfo.card.lastFour}
                      {orderDetails.paymentInfo.card.brand && ` (${orderDetails.paymentInfo.card.brand})`}
                    </p>
                  </div>
                )}
                {orderDetails.mercadoPagoPaymentId && (
                  <div>
                    <p className="payment-info-label">ID de transacción</p>
                    <p className="payment-info-value payment-transaction-id">
                      {orderDetails.mercadoPagoPaymentId.substring(0, 8)}...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="payment-actions-section">
            <div className="payment-actions-grid">
              <Link
                href="/orders"
                className="payment-btn payment-btn-primary"
              >
                <Package className="payment-icon" />
                Ver Mis Pedidos
              </Link>
              <Link
                href="/"
                className="payment-btn payment-btn-outline"
              >
                <ShoppingBag className="payment-icon" />
                Seguir Comprando
              </Link>
              <button
                onClick={() => window.print()}
                className="payment-btn payment-btn-outline"
              >
                <Printer className="payment-icon" />
                Imprimir Comprobante
              </button>
            </div>
            
            <p className="payment-email-notice">
              <Mail className="payment-icon-sm" />
              Te hemos enviado un correo con los detalles de tu compra.
              Si no lo recibes en los próximos minutos, revisa tu carpeta de spam.
            </p>
            
            <div className="payment-security-notice">
              <Lock className="payment-icon-sm" />
              <span>Tu pago está 100% protegido por Mercado Pago</span>
            </div>
          </div>
        </main>
      </div>
    );
  };

  // Pago pendiente
  const renderPending = () => {
    const pendingOrderId = orderDetails?.id || localStorage.getItem('pendingOrderId');

    return (
      <div className="payment-result-container">
        <div className="payment-decorative-elements">
          <div className="payment-decorative-icon clock">
            <Clock className="payment-icon-md" />
          </div>
        </div>

        <header className="payment-status-header payment-status-pending">
          <div className="payment-status-icon">
            <Clock className="payment-icon-xxl" />
          </div>
          <h1 className="payment-status-title">Pago Pendiente</h1>
          <p className="payment-status-subtitle">
            Tu pago está siendo procesado. Te notificaremos cuando se complete la transacción.
            {pendingOrderId && <br />}
            {pendingOrderId && <span className="payment-order-info">Orden #{pendingOrderId}</span>}
          </p>
          
          {/* 🔴 TIMER DE EXPIRACIÓN */}
          {timerSeconds !== null && timerSeconds > 0 && (
            <div className="payment-timer-section">
              <div className="payment-timer">
                <Clock className="payment-icon" />
                <span className="payment-timer-text">
                  Tiempo restante para completar el pago: 
                  <span className="payment-timer-countdown">
                    {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </span>
              </div>
              <div className="payment-timer-progress">
                <div 
                  className="payment-timer-progress-bar"
                  style={{ width: `${(timerSeconds / (10 * 60)) * 100}%` }}
                />
              </div>
              <p className="payment-timer-warning">
                ⚠️ Si no completas el pago en este tiempo, la orden se cancelará automáticamente
              </p>
            </div>
          )}
          
          <div className="payment-loading-dots">
            <div className="payment-dot"></div>
            <div className="payment-dot" style={{animationDelay: '0.1s'}}></div>
            <div className="payment-dot" style={{animationDelay: '0.2s'}}></div>
          </div>
        </header>

        <main className="payment-result-main">
          <div className="payment-info-card">
            <h2 className="payment-section-title">
              <AlertCircle className="payment-icon" />
              ¿Qué significa esto?
            </h2>
            <ul className="payment-info-list">
              <li>• Algunos métodos de pago pueden tardar unos minutos en procesarse</li>
              <li>• Revisa tu correo electrónico para más detalles</li>
              <li>• Si pagaste en efectivo, acércate al establecimiento con tu comprobante</li>
              <li>• Tu pedido se procesará automáticamente cuando recibamos la confirmación</li>
              <li>• El stock de tus productos está reservado por 15 minutos</li>
              <li>• Estamos monitoreando tu pago automáticamente (polling cada segundo)</li>
            </ul>
          </div>

          <div className="payment-actions-section">
            <div className="payment-actions-grid">
              <button
                onClick={retryVerification}
                className="payment-btn payment-btn-primary"
              >
                <RefreshCw className="payment-icon" />
                Actualizar Estado
              </button>
              <Link
                href="/"
                className="payment-btn payment-btn-outline"
              >
                <ShoppingBag className="payment-icon" />
                Seguir Comprando
              </Link>
              {pendingOrderId && (
                <Link
                  href={`/checkout`}
                  className="payment-btn payment-btn-secondary"
                >
                  <ArrowLeft className="payment-icon" />
                  Volver al Checkout
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  };

  // Pago rechazado
  const renderRejected = () => {
    const isExpired = isOrderExpired || orderDetails?.status === 'CANCELADO';

    return (
      <div className="payment-result-container">
        <header className="payment-status-header payment-status-rejected">
          <div className="payment-status-icon">
            {isExpired ? <Clock className="payment-icon-xxl" /> : <XCircle className="payment-icon-xxl" />}
          </div>
          <h1 className="payment-status-title">
            {isExpired ? 'Orden Expirada' : 'Pago Rechazado'}
          </h1>
          <p className="payment-status-subtitle">
            {isExpired 
              ? 'El tiempo para completar el pago ha expirado.' 
              : 'Lo sentimos, tu pago no pudo ser procesado.'}
          </p>
          {orderDetails?.cancellationReason && (
            <div className="payment-cancellation-reason">
              <AlertCircle className="payment-icon-sm" />
              <span>{orderDetails.cancellationReason}</span>
            </div>
          )}
        </header>

        <main className="payment-result-main">
          <div className="payment-info-card">
            <h2 className="payment-section-title">
              <AlertCircle className="payment-icon" />
              {isExpired ? '¿Qué pasó?' : 'Posibles razones:'}
            </h2>
            <ul className="payment-info-list">
              {isExpired ? (
                <>
                  <li>• No se completó el pago dentro de los 15 minutos de reserva</li>
                  <li>• El stock reservado ha sido liberado para otros clientes</li>
                  <li>• Puedes crear una nueva orden cuando lo desees</li>
                  <li>• Los precios y disponibilidad pueden cambiar</li>
                </>
              ) : (
                <>
                  <li>• Fondos insuficientes en la cuenta/tarjeta</li>
                  <li>• Datos de la tarjeta incorrectos</li>
                  <li>• Límite de la tarjeta excedido</li>
                  <li>• Problemas temporales con el banco emisor</li>
                  <li>• Rechazo por políticas de seguridad</li>
                </>
              )}
            </ul>
          </div>

          <div className="payment-actions-section">
            <div className="payment-actions-grid">
              {isExpired ? (
                <>
                  <button
                    onClick={createNewOrder}
                    className="payment-btn payment-btn-primary"
                  >
                    <RotateCcw className="payment-icon" />
                    Crear Nueva Orden
                  </button>
                  <Link
                    href="/"
                    className="payment-btn payment-btn-outline"
                  >
                    <Home className="payment-icon" />
                    Volver al Inicio
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/checkout"
                    className="payment-btn payment-btn-primary"
                  >
                    <CreditCard className="payment-icon" />
                    Intentar Nuevamente
                  </Link>
                  <Link
                    href="/"
                    className="payment-btn payment-btn-outline"
                  >
                    <Home className="payment-icon" />
                    Volver al Inicio
                  </Link>
                  <Link
                    href="/contact"
                    className="payment-btn payment-btn-secondary"
                  >
                    <Shield className="payment-icon" />
                    Contactar Soporte
                  </Link>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  };

  // Estado desconocido
  const renderUnknown = () => {
    return (
      <div className="payment-result-container">
        <header className="payment-status-header payment-status-unknown">
          <div className="payment-status-icon">
            <AlertCircle className="payment-icon-xxl" />
          </div>
          <h1 className="payment-status-title">Estado del Pago Desconocido</h1>
          <p className="payment-status-subtitle">
            No pudimos determinar el estado de tu pago. Te recomendamos:
          </p>
        </header>

        <main className="payment-result-main">
          <div className="payment-info-grid">
            <div className="payment-info-item">
              <Mail className="payment-icon-lg" />
              <div>
                <h3>Revisa tu correo</h3>
                <p>Mercado Pago envía confirmación por email</p>
              </div>
            </div>
            <div className="payment-info-item">
              <Shield className="payment-icon-lg" />
              <div>
                <h3>Consulta tu cuenta</h3>
                <p>Verifica el estado en Mercado Pago</p>
              </div>
            </div>
            <div className="payment-info-item">
              <Package className="payment-icon-lg" />
              <div>
                <h3>Revisa tus pedidos</h3>
                <p>El estado se actualiza automáticamente</p>
              </div>
            </div>
          </div>

          <div className="payment-actions-section">
            <div className="payment-actions-grid">
              <button
                onClick={retryVerification}
                className="payment-btn payment-btn-primary"
              >
                <RefreshCw className="payment-icon" />
                Reintentar Verificación
              </button>
              <Link
                href="/orders"
                className="payment-btn payment-btn-outline"
              >
                <Package className="payment-icon" />
                Ver Mis Pedidos
              </Link>
              <Link
                href="/"
                className="payment-btn payment-btn-secondary"
              >
                <Home className="payment-icon" />
                Volver al Inicio
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  };

  return renderByStatus();
}

// Loading Fallback inline para PaymentResult
function PaymentLoadingFallback() {
  return (
    <div className="payment-result-container">
      <div className="payment-loading-wrapper">
        <div className="payment-spinner-container">
          <div className="payment-spinner-circle">
            <div className="payment-spinner-inner"></div>
            <div className="payment-spinner-center">
              <Package className="payment-icon-lg" />
            </div>
          </div>
        </div>
        
        <h1 className="payment-loading-title">
          Obteniendo detalles de tu compra
        </h1>
        <p className="payment-loading-subtitle">
          Estamos recuperando la información de tu pedido...
        </p>
        
        <div className="payment-loading-dots">
          <div className="payment-dot"></div>
          <div className="payment-dot" style={{animationDelay: '0.1s'}}></div>
          <div className="payment-dot" style={{animationDelay: '0.2s'}}></div>
        </div>
      </div>
    </div>
  );
}

// Exportar componente envuelto en Suspense para useSearchParams
export default function PaymentResult() {
  return (
    <Suspense fallback={<PaymentLoadingFallback />}>
      <PaymentResultContent />
    </Suspense>
  );
}