'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Check,
  X,
  Clock,
  Package,
  Sparkles,
  Download,
  Printer,
  Home,
  CreditCard,
  Shield,
  Mail,
  Phone,
  Copy,
  CheckCircle2,
  Truck,
  Share2,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Calendar,
  Receipt,
  Zap,
  Gift,
  ShieldCheck,
  ShoppingCart,
  ExternalLink,
  ChevronRight,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  FileText,
  MessageSquare,
  Star
} from 'lucide-react';
import './PaymentResult.css';

interface OrderResponse {
  id: number;
  totalPrice: number;
  status: string;
  orderDate: string;
  userId: number | null;
  shippingAddressId: number | null;
  orderItems: Array<{
    id: number;
    quantity: number;
    price: number;
    orderId: number;
    productVariantId: number | null;
  }>;
}

interface PaymentStatusResponse {
  success: boolean;
  orderId: number;
  orderStatus: string;
  mpStatus: string;
  paymentId?: string;
  paymentMethod?: string;
  lastUpdated?: string;
  hasPayment: boolean;
  preferenceId?: string;
}

type PaymentStatus = 'loading' | 'approved' | 'rejected' | 'pending' | 'error';

const PaymentResult = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('loading');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(true);
  const [pollingCount, setPollingCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentStatusResponse | null>(null);
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  const orderRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);
  
  // 🔴 CORRECCIÓN CRÍTICA: Leer external_reference (lo que envía MercadoPago)
  const externalReference = searchParams.get('external_reference');
  const order_id = searchParams.get('order_id');
  const orderParam = searchParams.get('order');
  const orderIdParam = searchParams.get('orderId');
  
  // 🔴 Orden de prioridad: external_reference (MercadoPago) > order_id > order > orderId
  const orderId = externalReference || order_id || orderParam || orderIdParam;
  
  // Parámetros de MercadoPago
  const preferenceId = searchParams.get('preference_id');
  const paymentId = searchParams.get('payment_id');
  const collectionId = searchParams.get('collection_id');
  const collectionStatus = searchParams.get('collection_status');
  const paymentType = searchParams.get('payment_type');
  const merchantOrderId = searchParams.get('merchant_order_id');

  // 🔴 IDÉNTICA A LA DEL CHECKOUT PAGE
  const getSessionId = useCallback(() => {
    // 1. Intentar desde localStorage (igual que Checkout)
    let sessionId = localStorage.getItem('cartSessionId');
    
    // 2. Si no existe, buscar con el mismo nombre que Checkout
    if (!sessionId) {
      sessionId = localStorage.getItem('cart_session_id');
    }
    
    // 3. Si todavía no existe, crear uno nuevo (misma lógica que Checkout)
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('cartSessionId', sessionId);
      localStorage.setItem('cart_session_id', sessionId);
      console.log('🆕 Nuevo sessionId creado:', sessionId.substring(0, 8) + '...');
    } else {
      console.log('🔁 SessionId existente:', sessionId.substring(0, 8) + '...');
    }
    
    // 4. También guardar en sessionStorage (igual que Checkout)
    sessionStorage.setItem('cartSessionId', sessionId);
    sessionStorage.setItem('cart_session_id', sessionId);
    
    return sessionId;
  }, []);

  // 🔴 IDÉNTICA A LA DEL CHECKOUT PAGE
  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    };

    // Agregar token si existe (igual que Checkout)
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 🔴 ENVIAR SESSION ID EN HEADER (EXACTAMENTE IGUAL QUE CHECKOUT)
    const currentSessionId = getSessionId();
    headers['X-Cart-Session-Id'] = currentSessionId;
    
    // DEBUG
    console.log('📤 PaymentResult Headers:', {
      'X-Cart-Session-Id': currentSessionId.substring(0, 8) + '...',
      'Authorization': token ? 'Presente' : 'No',
      'Timestamp': new Date().toISOString()
    });

    return headers;
  }, [getSessionId]);

  // Detectar tamaño de pantalla para responsive
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Verificar autenticación y obtener sessionId
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    
    // OBTENER SESSION ID (CRÍTICO - IGUAL QUE CHECKOUT)
    const sessionId = getSessionId();
    console.log('🔍 PaymentResult Inicializado:');
    console.log('   external_reference:', externalReference);
    console.log('   order_id:', order_id);
    console.log('   order:', orderParam);
    console.log('   orderId (param):', orderIdParam);
    console.log('   orderId (final):', orderId);
    console.log('   sessionId:', sessionId?.substring(0, 8) + '...');
    console.log('   autenticado:', !!token);
    console.log('   screenSize:', screenSize);
    console.log('   collection_status:', collectionStatus);
    
    // Verificar si hay pending order en localStorage
    const pendingOrderId = localStorage.getItem('pendingOrderId');
    if (pendingOrderId) {
      console.log('📦 PendingOrderId encontrado:', pendingOrderId);
    }
    
    // Si viene de MercadoPago con estado aprobado, establecer inmediato
    if (collectionStatus === 'approved' && paymentStatus === 'loading') {
      console.log('✅ MercadoPago indica pago aprobado');
      setPaymentStatus('approved');
      setSuccessMessage('✅ ¡Pago aprobado por MercadoPago!');
    } else if (collectionStatus === 'rejected' && paymentStatus === 'loading') {
      console.log('❌ MercadoPago indica pago rechazado');
      setPaymentStatus('rejected');
      setError('❌ Pago rechazado por MercadoPago');
    }
  }, [getSessionId, orderId, screenSize, externalReference, order_id, orderParam, orderIdParam, collectionStatus, paymentStatus]);

  // Formateadores
  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Fecha no disponible';
      }
      return new Intl.DateTimeFormat('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return 'Fecha no disponible';
    }
  }, []);

  const generateOrderNumber = useCallback((id: number) => {
    return `A-MARTE-${id.toString().padStart(6, '0')}`;
  }, []);

  const calculateSubtotal = useCallback((items: OrderResponse['orderItems']) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, []);

  // Cargar datos de la orden - CORREGIDO
  const loadOrderData = useCallback(async () => {
    // Prevenir múltiples cargas simultáneas
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
    } else {
      return;
    }

    try {
      if (!orderId) {
        console.log('❌ No hay orderId en URL');
        
        // Intentar obtener orderId de localStorage
        const pendingOrderId = localStorage.getItem('pendingOrderId');
        if (pendingOrderId) {
          console.log('📦 Usando pendingOrderId de localStorage:', pendingOrderId);
          // Redirigir con external_reference (lo que usa MercadoPago)
          router.replace(`/checkout/success?external_reference=${pendingOrderId}`);
          return;
        }
        
        // También verificar preferenceId de MercadoPago
        if (preferenceId) {
          console.log('🔄 Intentando obtener orderId desde preferenceId:', preferenceId);
          // Puedes hacer una llamada al backend para buscar order por preferenceId
          const response = await fetch(`/api/payments/find-by-preference/${preferenceId}`, {
            method: 'GET',
            headers: getHeaders()
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.orderId) {
              console.log('✅ Orden encontrada por preferenceId:', data.orderId);
              router.replace(`/checkout/success?external_reference=${data.orderId}`);
              return;
            }
          }
        }
        
        setError('No se encontró número de orden');
        setPaymentStatus('error');
        return;
      }

      console.log('🔍 Cargando orden ID:', orderId);
      
      const headers = getHeaders();
      console.log('📤 Headers para fetch:', headers);
      
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'GET',
        credentials: 'include',
        headers: headers
      });

      console.log('📥 Response status:', response.status);
      
      // Verificar headers de respuesta
      const responseSessionId = response.headers.get('X-Cart-Session-Id');
      if (responseSessionId) {
        console.log('🔄 SessionId recibido del servidor:', responseSessionId.substring(0, 8) + '...');
        localStorage.setItem('cartSessionId', responseSessionId);
      }

      if (response.status === 403) {
        const errorText = await response.text();
        console.error('❌ Acceso denegado:', errorText);
        setError('No tienes acceso a esta orden.');
        setPaymentStatus('error');
        return;
      }

      if (response.status === 404) {
        console.error('❌ Orden no encontrada');
        
        if (externalReference || preferenceId) {
          setError('Orden no encontrada. Es posible que el pago aún se esté procesando.');
          setPaymentStatus('pending');
          return;
        }
        setError('Orden no encontrada en el sistema.');
        setPaymentStatus('error');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en la respuesta:', errorText);
        throw new Error(`Error ${response.status}: ${errorText || 'No se pudo cargar la orden'}`);
      }

      const orderData: OrderResponse = await response.json();
      console.log('✅ Orden cargada:', orderData);
      
      setOrder(orderData);
      
      // Determinar estado basado en status de la orden
      if (orderData.status === 'PAGO_APROBADO' || orderData.status === 'APROBADO') {
        setPaymentStatus('approved');
        setSuccessMessage('✅ ¡Pago confirmado exitosamente!');
        // Limpiar localStorage cuando el pago es exitoso
        localStorage.removeItem('pendingOrderId');
        localStorage.removeItem('pendingOrderData');
        localStorage.removeItem('pendingPreferenceId');
      } else if (orderData.status === 'PAGO_RECHAZADO' || orderData.status === 'RECHAZADO') {
        setPaymentStatus('rejected');
        setError('❌ El pago fue rechazado. Por favor intenta con otro método de pago.');
      } else if (orderData.status === 'PENDIENTE') {
        setPaymentStatus('pending');
      } else {
        setPaymentStatus('approved');
      }

    } catch (err: unknown) {
      console.error('❌ Error cargando orden:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error al cargar los detalles: ${errorMessage}`);
      setPaymentStatus('error');
    }
  }, [orderId, externalReference, preferenceId, getHeaders, router]);

  // Verificar estado del pago en MercadoPago
  const checkPaymentStatus = useCallback(async () => {
    if (!orderId) return;

    try {
      console.log('🔄 Verificando estado del pago para orden:', orderId);
      
      const response = await fetch(`/api/payments/status/${orderId}`, {
        method: 'GET',
        credentials: 'include',
        headers: getHeaders()
      });

      if (!response.ok) {
        console.log('❌ Error verificando estado:', response.status);
        return;
      }

      const data: PaymentStatusResponse = await response.json();
      console.log('📊 Estado del pago:', data);
      
      setPaymentDetails(data);
      setPollingCount(prev => prev + 1);

      if (data.orderStatus === 'APROBADO' || data.mpStatus === 'approved') {
        setPaymentStatus('approved');
        setSuccessMessage('✅ ¡Pago confirmado!');
        await loadOrderData();
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      } else if (data.orderStatus === 'RECHAZADO' || data.mpStatus === 'rejected') {
        setPaymentStatus('rejected');
        setError('❌ Pago rechazado');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }

    } catch (err) {
      console.error('Error verificando estado del pago:', err);
    }
  }, [orderId, getHeaders, loadOrderData]);

  // Polling automático para órdenes pendientes
  useEffect(() => {
    if (paymentStatus === 'pending' && orderId && !pollingIntervalRef.current) {
      checkPaymentStatus();
      pollingIntervalRef.current = setInterval(checkPaymentStatus, 5000);
      
      setTimeout(() => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          if (paymentStatus === 'pending') {
            setError('⚠️ Tiempo de espera agotado');
          }
        }
      }, 120000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [paymentStatus, orderId, checkPaymentStatus]);

  // Cargar datos iniciales cuando orderId esté disponible
  useEffect(() => {
    if (orderId) {
      loadOrderData();
    } else {
      // Si no hay orderId en la URL, verificar localStorage
      const pendingOrderId = localStorage.getItem('pendingOrderId');
      if (pendingOrderId && isFirstLoad.current) {
        console.log('📦 Redirigiendo con pendingOrderId de localStorage');
        // Usar external_reference que es lo que MercadoPago envía
        router.replace(`/checkout/success?external_reference=${pendingOrderId}`);
      }
    }
  }, [orderId, loadOrderData, router]);

  // Manejar parámetros de MercadoPago
  useEffect(() => {
    if ((preferenceId || externalReference) && !orderId) {
      const pendingOrderId = localStorage.getItem('pendingOrderId');
      if (pendingOrderId) {
        console.log('🔄 Redirigiendo con orderId desde localStorage:', pendingOrderId);
        // Usar external_reference que es lo que MercadoPago usa
        router.replace(`/checkout/success?external_reference=${pendingOrderId}`);
      }
    }

    if (collectionStatus === 'approved' && paymentStatus !== 'approved') {
      setPaymentStatus('approved');
      setSuccessMessage('✅ ¡Pago aprobado por MercadoPago!');
    } else if (collectionStatus === 'rejected' && paymentStatus !== 'rejected') {
      setPaymentStatus('rejected');
      setError('❌ Pago rechazado por MercadoPago');
    }
  }, [preferenceId, externalReference, orderId, collectionStatus, paymentStatus, router]);

  // Copiar número de orden
  const copyOrderNumber = useCallback(() => {
    if (order) {
      navigator.clipboard.writeText(generateOrderNumber(order.id))
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => console.error('Error copying:', err));
    }
  }, [order, generateOrderNumber]);

  // Generar PDF
  const generatePDF = useCallback(() => {
    if (!order) return;
    
    setGeneratingPDF(true);
    
    setTimeout(() => {
      setGeneratingPDF(false);
      
      const printContent = `
        <html>
          <head>
            <title>Comprobante - ${generateOrderNumber(order.id)}</title>
            <style>
              body { font-family: Arial; margin: 20px; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #3DB28A; padding-bottom: 20px; }
              .order-number { font-size: 24px; font-weight: bold; color: #103359; margin: 10px 0; }
              .section { margin: 20px 0; padding: 15px; border: 1px solid #E1E4E8; border-radius: 8px; }
              .total { font-size: 18px; font-weight: bold; color: #3db28a; }
              .product-row { display: flex; justify-content: space-between; margin: 8px 0; }
              .product-name { flex: 2; }
              .product-qty { flex: 1; text-align: center; }
              .product-price { flex: 1; text-align: right; }
              .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>A MARTE - Comprobante de Pago</h1>
              <div class="order-number">${generateOrderNumber(order.id)}</div>
              <p>Fecha: ${formatDate(order.orderDate)}</p>
              <p>Estado: ${order.status}</p>
            </div>
            
            <div class="section">
              <h3>Resumen del Pedido</h3>
              ${order.orderItems.map((item, index) => `
                <div class="product-row">
                  <span class="product-name">Producto ${index + 1}</span>
                  <span class="product-qty">x${item.quantity}</span>
                  <span class="product-price">${formatPrice(item.price * item.quantity)}</span>
                </div>
              `).join('')}
              
              <div style="border-top: 1px solid #ddd; margin-top: 15px; padding-top: 15px;">
                <div class="product-row">
                  <strong>Total:</strong>
                  <span></span>
                  <strong class="total">${formatPrice(order.totalPrice)}</strong>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <p>¡Gracias por tu compra en A Marte!</p>
              <p>Pijamas cómodas para sueños felices ✨</p>
            </div>
          </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
      }
    }, 1500);
  }, [order, formatPrice, formatDate, generateOrderNumber]);

  // Compartir por WhatsApp
  const shareViaWhatsApp = useCallback(() => {
    if (order) {
      const statusText = paymentStatus === 'approved' ? '✅ APROBADO' : 
                        paymentStatus === 'rejected' ? '❌ RECHAZADO' : '⏳ PENDIENTE';
      
      const message = `🌟 Mi pedido en A MARTE 🌟\n\n✨ Orden: ${generateOrderNumber(order.id)}\n✅ Estado: ${statusText}\n💰 Total: ${formatPrice(order.totalPrice)}\n📅 Fecha: ${formatDate(order.orderDate)}\n\n¡Gracias por tu compra! 🛒`;
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  }, [order, paymentStatus, formatPrice, formatDate, generateOrderNumber]);

  // Toast helper
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
    const event = new CustomEvent('show-toast', {
      detail: { message, type, duration }
    });
    window.dispatchEvent(event);
  }, []);

  // Reintentar verificación
  const retryVerification = useCallback(async () => {
    setPollingCount(0);
    setPaymentStatus('loading');
    setError('');
    await loadOrderData();
  }, [loadOrderData]);

  // Volver al checkout
  const returnToCheckout = useCallback(() => {
    const pendingOrderId = localStorage.getItem('pendingOrderId');
    if (pendingOrderId) {
      router.push(`/checkout?orderId=${pendingOrderId}`);
    } else {
      router.push('/checkout');
    }
  }, [router]);

  // Renderizar estado loading (con skeleton)
  const renderLoadingSkeleton = () => (
    <div className="payment-result-container loading">
      {/* Header skeleton */}
      <header className="status-header status-loading">
        <div className="skeleton-circle skeleton-icon"></div>
        <div className="skeleton-title"></div>
        <div className="skeleton-subtitle shorter"></div>
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </header>

      {/* Content skeleton */}
      <main className="payment-result-main">
        <div className="payment-result-grid">
          <div className="payment-result-left">
            {/* Order code skeleton */}
            <div className="order-code-section">
              <div className="order-code-header">
                <div className="skeleton-circle small"></div>
                <div className="skeleton-title medium"></div>
              </div>
              <div className="skeleton-code"></div>
              <div className="skeleton-text small"></div>
            </div>

            {/* Order card skeleton */}
            <div className="order-card">
              <div className="order-card-header">
                <div className="skeleton-circle small"></div>
                <div className="order-card-title-section">
                  <div className="skeleton-title"></div>
                  <div className="skeleton-subtitle small"></div>
                </div>
              </div>
              <div className="order-card-content">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="order-section">
                    <div className="skeleton-title with-icon">
                      <div className="skeleton-circle small"></div>
                      <div className="skeleton-text medium"></div>
                    </div>
                    <div className="skeleton-subtitle"></div>
                    <div className="skeleton-text"></div>
                    <div className="skeleton-text long"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="payment-result-right">
            {/* Action panel skeleton */}
            <div className="action-panel">
              <div className="skeleton-title with-icon">
                <div className="skeleton-circle small"></div>
                <div className="skeleton-text medium"></div>
              </div>
              <div className="action-buttons-grid">
                {[...Array(3)].map((_, i) => (
                  <button key={i} className="skeleton-button" disabled></button>
                ))}
              </div>
            </div>

            {/* Support panel skeleton */}
            <div className="support-panel">
              <div className="skeleton-title with-icon">
                <div className="skeleton-circle small"></div>
                <div className="skeleton-text medium"></div>
              </div>
              <div className="support-options">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="support-option">
                    <div className="skeleton-circle small"></div>
                    <div>
                      <div className="skeleton-text medium"></div>
                      <div className="skeleton-text small"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  // Renderizar estado aprobado
  const renderApprovedStatus = () => (
    <header className="status-header status-approved">
      <div className="status-icon">
        <Check className="icon-xxl" />
      </div>
      <h1 className="status-title">¡Tu pedido ha sido confirmado!</h1>
      <p className="status-subtitle">
        Tu pago fue exitoso y ya estamos preparando tu pedido con mucho cariño.
        <br />Te enviaremos un correo electrónico con todos los detalles del envío.
      </p>
      {!isAuthenticated && order && (
        <div className="guest-notice">
          <div className="guest-notice-content">
            <ShieldCheck className="icon" />
            <div>
              <strong>¡Guarda este número de pedido!</strong>
              <p>Tu orden <code>{generateOrderNumber(order.id)}</code> es tu referencia para seguir el estado de tu pedido.</p>
            </div>
          </div>
        </div>
      )}
      <div className="confetti-container">
        {[...Array(20)].map((_, i) => (
          <div key={i} className={`confetti confetti-${i % 5}`} />
        ))}
      </div>
    </header>
  );

  // Renderizar estado rechazado
  const renderRejectedStatus = () => (
    <header className="status-header status-rejected">
      <div className="status-icon">
        <X className="icon-xxl" />
      </div>
      <h1 className="status-title">El pago no pudo ser procesado</h1>
      <p className="status-subtitle">
        No pudimos procesar tu pago en este momento. 
        <br />Revisa los datos de tu tarjeta o intenta con otro método de pago.
      </p>
      <div className="status-actions">
        <button onClick={returnToCheckout} className="btn btn-primary">
          <RefreshCw className="icon" />
          Reintentar pago
        </button>
        <Link href="/contact" className="btn btn-outline">
          <Shield className="icon" />
          Contactar soporte
        </Link>
      </div>
    </header>
  );

  // Renderizar estado pendiente
  const renderPendingStatus = () => (
    <header className="status-header status-pending">
      <div className="status-icon">
        <Clock className="icon-xxl" />
      </div>
      <h1 className="status-title">Verificando tu pago</h1>
      <p className="status-subtitle">
        Estamos verificando el estado de tu pago para confirmar tu orden.
        {pollingCount > 0 && ` (Verificando... ${pollingCount})`}
      </p>
      <div className="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div className="status-actions">
        <button onClick={retryVerification} className="btn btn-outline">
          <RefreshCw className="icon" />
          Actualizar estado
        </button>
      </div>
    </header>
  );

  // Renderizar estado error
  const renderErrorStatus = () => (
    <header className="status-header status-error">
      <div className="status-icon">
        <AlertCircle className="icon-xxl" />
      </div>
      <h1 className="status-title">Ha ocurrido un error</h1>
      <p className="status-subtitle">
        {error || 'No pudimos cargar la información de tu pedido.'}
      </p>
      <div className="status-actions">
        <Link href="/" className="btn btn-primary">
          <Home className="icon" />
          Volver al inicio
        </Link>
        {isAuthenticated ? (
          <Link href="/orders" className="btn btn-outline">
            <Package className="icon" />
            Ver mis pedidos
          </Link>
        ) : (
          <button onClick={returnToCheckout} className="btn btn-outline">
            <ExternalLink className="icon" />
            Volver al checkout
          </button>
        )}
      </div>
    </header>
  );

  // Renderizar header según estado
  const renderStatusHeader = () => {
    if (paymentStatus === 'loading') return null;
    
    switch (paymentStatus) {
      case 'approved': return renderApprovedStatus();
      case 'rejected': return renderRejectedStatus();
      case 'pending': return renderPendingStatus();
      case 'error': return renderErrorStatus();
      default: return null;
    }
  };

  const renderOrderDetails = () => {
    if (!order || paymentStatus === 'loading' || paymentStatus === 'error') {
      return null;
    }

    const subtotal = calculateSubtotal(order.orderItems);
    const shippingCost = 0;
    const tax = order.totalPrice - subtotal - shippingCost;

    return (
      <div className="order-details-section">
        {/* Device indicator for debug */}
        {process.env.NODE_ENV === 'development' && (
          <div className="device-indicator">
            <div className="device-icon">
              {screenSize === 'mobile' && <Smartphone className="icon" />}
              {screenSize === 'tablet' && <Tablet className="icon" />}
              {screenSize === 'desktop' && <Laptop className="icon" />}
            </div>
            <span>Vista: {screenSize === 'mobile' ? 'Móvil' : screenSize === 'tablet' ? 'Tablet' : 'Desktop'}</span>
          </div>
        )}

        {!isAuthenticated && (
          <div className="guest-warning-banner">
            <div className="guest-warning-content">
              <ShieldCheck className="icon" />
              <div>
                <h4>Compra como invitado</h4>
                <p>
                  Para guardar tu historial de compras y recibir actualizaciones, 
                  <Link href="/auth/register" className="link-button">
                    regístrate en nuestro sitio
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Código de orden - Responsive */}
        <div className="order-code-section">
          <div className="order-code-header">
            <Receipt className="icon" />
            <h3>Tu comprobante de compra</h3>
          </div>
          <div className="order-code-container">
            <span className="order-code-label">Número de orden:</span>
            <div className="order-code-value">
              <div className="order-code-display">
                <span className="order-code-prefix">A-MARTE-</span>
                <code>{order.id.toString().padStart(6, '0')}</code>
              </div>
              <button 
                onClick={copyOrderNumber}
                className={`order-code-copy ${copied ? 'copied' : ''}`}
                title={copied ? '¡Copiado!' : 'Copiar al portapapeles'}
                aria-label={copied ? 'Número copiado' : 'Copiar número de orden'}
              >
                {copied ? <CheckCircle2 className="icon" /> : <Copy className="icon" />}
                <span className="copy-text">{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>
          <p className="order-code-note">
            <ShieldCheck className="icon-xs" />
            Este es tu identificador único para seguir el estado de tu pedido
          </p>
        </div>

        {/* Tarjeta de resumen - Responsive */}
        <div className="order-card" ref={orderRef}>
          <div className="order-card-header">
            <div className="order-card-icon">
              <Package className="icon-xl" />
            </div>
            <div className="order-card-title-section">
              <h2 className="order-card-title">Resumen de tu compra</h2>
              <p className="order-card-subtitle">
                Pedido realizado el {formatDate(order.orderDate)}
                {!isAuthenticated && ' (como invitado)'}
              </p>
            </div>
            <div className="order-card-badge">
              <ShieldCheck className="icon-xs" />
              <span>A Marte</span>
            </div>
          </div>

          <div className="order-card-content">
            {/* Estado de la orden */}
            <div className="order-section">
              <h3 className="order-section-title">
                <Truck className="icon" />
                Estado del pedido
              </h3>
              <div className="order-status-display">
                <div className={`status-badge status-${order.status.toLowerCase()}`}>
                  <div className="status-badge-icon">
                    {order.status === 'PAGO_APROBADO' && <Check className="icon-sm" />}
                    {order.status === 'PENDIENTE' && <Clock className="icon-sm" />}
                    {order.status === 'PAGO_RECHAZADO' && <X className="icon-sm" />}
                  </div>
                  <span>{order.status.replace('_', ' ')}</span>
                </div>
                <p className="status-description">
                  {order.status === 'PAGO_APROBADO' 
                    ? '¡Pago confirmado! Tu pedido está siendo preparado con cuidado.'
                    : order.status === 'PENDIENTE'
                    ? 'Verificando el estado de tu pago.'
                    : 'Revisando los detalles del pedido.'}
                </p>
              </div>
            </div>

            {/* Resumen de productos - Responsive */}
            <div className="order-section">
              <h3 className="order-section-title">
                <ShoppingCart className="icon" />
                Productos ({order.orderItems.length} items)
              </h3>
              <div className="order-items-simple">
                {order.orderItems.map((item, index) => (
                  <div key={item.id} className="order-item-simple">
                    <div className="order-item-simple-info">
                      <div className="order-item-simple-header">
                        <span className="order-item-simple-name">
                          <Gift className="icon-xs" />
                          <span className="product-name-text">
                            Pijama infantil #{index + 1}
                            {item.productVariantId && ` · Variante ${item.productVariantId}`}
                          </span>
                        </span>
                        <span className="order-item-simple-quantity">
                          x{item.quantity}
                        </span>
                      </div>
                      <div className="order-item-simple-price">
                        <span className="unit-price">{formatPrice(item.price)} unidad</span>
                        <span className="order-item-simple-total">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen de pago */}
            <div className="order-section">
              <h3 className="order-section-title">
                <Receipt className="icon" />
                Resumen de pago
              </h3>
              <div className="payment-summary">
                <div className="payment-summary-row">
                  <span>Subtotal ({order.orderItems.length} items):</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="payment-summary-row">
                  <span>Envío:</span>
                  <span className="free">
                    <Check className="icon-xs" />
                    Gratis
                  </span>
                </div>
                {tax > 0 && (
                  <div className="payment-summary-row">
                    <span>Impuestos:</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                )}
                <div className="payment-summary-total">
                  <span>Total:</span>
                  <span className="total-amount">{formatPrice(order.totalPrice)}</span>
                </div>
                <p className="payment-summary-note">
                  <Sparkles className="icon-xs" />
                  Incluye todos los costos del pedido
                </p>
              </div>
            </div>

            {/* Información de pago - Responsive */}
            <div className="order-section">
              <h3 className="order-section-title">
                <CreditCard className="icon" />
                Información de pago
              </h3>
              <div className="payment-info">
                <div className="payment-info-item">
                  <span className="payment-info-label">Método de pago:</span>
                  <span className="payment-info-value">
                    <CreditCard className="icon-xs" />
                    MercadoPago
                  </span>
                </div>
                <div className="payment-info-item">
                  <span className="payment-info-label">Estado:</span>
                  <span className={`payment-info-value status-${paymentStatus}`}>
                    {paymentStatus === 'approved' && <Check className="icon-sm" />}
                    {paymentStatus === 'rejected' && <X className="icon-sm" />}
                    {paymentStatus === 'pending' && <Clock className="icon-sm" />}
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="payment-info-item">
                  <span className="payment-info-label">Fecha de compra:</span>
                  <span className="payment-info-value">
                    <Calendar className="icon-sm" />
                    {formatDate(order.orderDate)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActionPanel = () => {
    if (!order || paymentStatus === 'rejected' || paymentStatus === 'error') {
      return null;
    }

    return (
      <div className="action-panel">
        <h3 className="action-panel-title">
          <Zap className="icon" />
          Acciones disponibles
        </h3>
        
        <div className="action-buttons-grid">
          <button 
            onClick={generatePDF}
            disabled={generatingPDF}
            className="action-btn action-btn-primary"
            aria-label={generatingPDF ? 'Generando documento PDF' : 'Guardar comprobante en PDF'}
          >
            {generatingPDF ? (
              <>
                <div className="spinner-small"></div>
                Generando...
              </>
            ) : (
              <>
                <FileText className="icon" />
                Guardar comprobante
              </>
            )}
          </button>
          
          <button 
            onClick={() => window.print()}
            className="action-btn action-btn-secondary"
            aria-label="Imprimir detalles del pedido"
          >
            <Printer className="icon" />
            Imprimir detalles
          </button>
          
          <button 
            onClick={shareViaWhatsApp}
            className="action-btn action-btn-success"
            aria-label="Compartir pedido por WhatsApp"
          >
            <MessageSquare className="icon" />
            Compartir pedido
          </button>
          
          {!isAuthenticated && (
            <Link 
              href="/"
              className="action-btn action-btn-outline"
              aria-label="Volver al inicio"
            >
              <Home className="icon" />
              Volver al inicio
            </Link>
          )}
        </div>

        {paymentStatus === 'approved' && (
          <div className="delivery-info">
            <div className="delivery-info-item">
              <Truck className="icon" />
              <div>
                <h4>Tiempo de entrega estimado</h4>
                <p>3-5 días hábiles</p>
                <small>Te notificaremos cuando tu pedido sea despachado</small>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderNextSteps = () => {
    if (!order || paymentStatus !== 'approved') {
      return null;
    }

    return (
      <div className="next-steps-panel">
        <h3 className="next-steps-title">
          <Check className="icon" />
          Proceso de tu pedido
        </h3>
        
        <div className="steps-timeline">
          <div className="step-item step-completed">
            <div className="step-icon">
              <Check className="icon" />
            </div>
            <div className="step-content">
              <h4>Pago verificado</h4>
              <p>Pago confirmado exitosamente</p>
              <span className="step-time">Completado</span>
            </div>
          </div>
          
          <div className="step-item step-active">
            <div className="step-icon">
              <Package className="icon" />
            </div>
            <div className="step-content">
              <h4>Preparando pedido</h4>
              <p>Empaquetando con cuidado</p>
              <span className="step-time">En proceso</span>
            </div>
          </div>
          
          <div className="step-item step-pending">
            <div className="step-icon">
              <Truck className="icon" />
            </div>
            <div className="step-content">
              <h4>Despacho</h4>
              <p>Pedido en camino</p>
              <span className="step-time">Próximo paso</span>
            </div>
          </div>
          
          <div className="step-item step-pending">
            <div className="step-icon">
              <Home className="icon" />
            </div>
            <div className="step-content">
              <h4>Entrega</h4>
              <p>¡Llegada a tu hogar!</p>
              <span className="step-time">
                Estimado: 3-5 días
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFloatingMenu = () => {
    if (!showFloatingMenu || !order || paymentStatus === 'error' || screenSize === 'mobile') {
      return null;
    }

    return (
      <div className="floating-menu">
        <div className="floating-menu-header">
          <Package className="icon-sm" />
          <h4>Panel de control</h4>
          <button 
            onClick={() => setShowFloatingMenu(false)}
            className="floating-menu-close"
            aria-label="Cerrar menú flotante"
          >
            ×
          </button>
        </div>
        <div className="floating-menu-actions">
          <Link href="/products" className="floating-menu-action">
            <ShoppingCart className="icon" />
            <span>Continuar comprando</span>
          </Link>
          {isAuthenticated ? (
            <Link href="/orders" className="floating-menu-action">
              <Package className="icon" />
              <span>Ver mis pedidos</span>
            </Link>
          ) : (
            <Link href="/" className="floating-menu-action">
              <Home className="icon" />
              <span>Volver al inicio</span>
            </Link>
          )}
          <button 
            onClick={generatePDF}
            className="floating-menu-action"
            disabled={generatingPDF}
          >
            <Download className="icon" />
            <span>{generatingPDF ? 'Generando...' : 'Guardar comprobante'}</span>
          </button>
          <button 
            onClick={shareViaWhatsApp}
            className="floating-menu-action"
          >
            <Share2 className="icon" />
            <span>Compartir pedido</span>
          </button>
        </div>
      </div>
    );
  };

  const renderBottomNavigation = () => {
    if (screenSize !== 'mobile' || paymentStatus === 'loading') return null;

    return (
      <div className="mobile-bottom-nav">
        <button 
          className="mobile-nav-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Ir al inicio de la página"
        >
          <ArrowLeft className="icon" />
          <span>Inicio</span>
        </button>
        
        {order && paymentStatus === 'approved' && (
          <button 
            className="mobile-nav-btn primary"
            onClick={shareViaWhatsApp}
            aria-label="Compartir pedido"
          >
            <Share2 className="icon" />
            <span>Compartir</span>
          </button>
        )}
        
        <Link 
          href="/products" 
          className="mobile-nav-btn"
          aria-label="Continuar comprando"
        >
          <ShoppingCart className="icon" />
          <span>Comprar</span>
        </Link>
      </div>
    );
  };

  const renderDebugButton = () => {
    if (process.env.NODE_ENV !== 'development') return null;

    return (
      <button 
        onClick={() => {
          console.log('🔧 === DEBUG PAYMENT RESULT ===');
          console.log('Order:', order);
          console.log('Payment Status:', paymentStatus);
          console.log('SessionId:', getSessionId()?.substring(0, 8) + '...');
          console.log('Headers:', getHeaders());
          console.log('Screen Size:', screenSize);
          console.log('URL Parameters:', {
              external_reference: externalReference, // Cambia esto
            order_id,
            order: orderParam,
            orderId: orderIdParam,
            collection_status: collectionStatus
          });
          alert(`Debug: Status: ${paymentStatus}\nOrder: ${order?.id || 'none'}\nParams: external_reference=${externalReference}`);
        }}
        className="debug-button"
        aria-label="Información de depuración"
      >
        🐛 Debug
      </button>
    );
  };

  // Mostrar skeleton loading mientras carga
  if (paymentStatus === 'loading' && !order) {
    return renderLoadingSkeleton();
  }

  return (
    <div className="payment-result-container">
      {/* Mensajes de éxito/error */}
      {successMessage && (
        <div className="payment-success-message">
          <Check className="icon" />
          <span>{successMessage}</span>
        </div>
      )}
      
      {error && (
        <div className="payment-error-message">
          <AlertCircle className="icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Botón para volver atrás - Responsive */}
      <div className="back-button-container">
        <Link href="/" className="back-button">
          <ArrowLeft className="icon" />
          <span className="back-button-text">Regresar al inicio</span>
        </Link>
      </div>

      {/* Header según estado */}
      {renderStatusHeader()}

      <main className="payment-result-main">
        <div className="payment-result-grid">
          {/* Columna izquierda - Detalles de orden */}
          <div className="payment-result-left">
            {renderOrderDetails()}
          </div>

          {/* Columna derecha - Acciones y próximos pasos */}
          <div className="payment-result-right">
            {renderActionPanel()}
            {renderNextSteps()}

            {/* Soporte y ayuda - Responsive */}
            <div className="support-panel">
              <h3 className="support-title">
                <Shield className="icon" />
                Soporte y ayuda
              </h3>
              
              <div className="support-options">
                <Link href="/contact" className="support-option">
                  <Mail className="icon" />
                  <div>
                    <h4>Contactar soporte</h4>
                    <p>Respuesta en 24 horas</p>
                  </div>
                </Link>
                
                <Link href="/faq" className="support-option">
                  <AlertCircle className="icon" />
                  <div>
                    <h4>Preguntas frecuentes</h4>
                    <p>Encuentra respuestas rápidas</p>
                  </div>
                </Link>
                
                <div className="support-hotline">
                  <Phone className="icon" />
                  <div>
                    <h4>Atención telefónica</h4>
                    <p>+57 1 234 5678</p>
                    <p className="hotline-hours">Lun-Vie: 8am - 6pm</p>
                  </div>
                </div>
              </div>

              {!isAuthenticated && (
                <div className="guest-support-notice">
                  <ShieldCheck className="icon" size={16} />
                  <p>
                    <strong>Clientes invitados:</strong> 
                    Guarda tu número de pedido. Es tu referencia para cualquier consulta.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Menú flotante (solo desktop/tablet) */}
      {renderFloatingMenu()}

      {/* Navegación inferior móvil */}
      {renderBottomNavigation()}

      {/* Footer - Responsive */}
      <footer className="payment-result-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Gift className="icon-lg" />
            <h3>A Marte</h3>
          </div>
          <p className="footer-text">
            {paymentStatus === 'approved' 
              ? `¡Gracias por tu compra! Tu pedido ${order ? generateOrderNumber(order.id) : ''} ya está en proceso.`
              : paymentStatus === 'rejected'
              ? '¿Problemas con el pago? Nuestro equipo está listo para ayudarte.'
              : 'Procesando tu pedido con cuidado. ¡Gracias!'}
          </p>
          <div className="footer-actions">
            <Link href="/products" className="btn btn-primary btn-lg">
              <ShoppingCart className="icon" />
              <span>Seguir comprando</span>
            </Link>
            <Link href="/" className="btn btn-outline btn-lg">
              <Home className="icon" />
              <span>Volver al inicio</span>
            </Link>
          </div>
          <p className="footer-motto">
            Pijamas cómodas para sueños felices ✨
          </p>
        </div>
      </footer>

      {/* Botón debug (solo desarrollo) */}
      {renderDebugButton()}
    </div>
  );
};

export default PaymentResult;