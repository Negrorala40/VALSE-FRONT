  // app/components/PaymentResult.tsx
  'use client';

  import { useEffect, useState, Suspense } from 'react';
  import { useSearchParams } from 'next/navigation';
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
    MessageSquare
  } from 'lucide-react';
  import Link from 'next/link';
  import Image from 'next/image';
  import styles from './PaymentResult.module.css';

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
      voucherUrl?: string; // Para pagos en efectivo
    };
    createdAt: string;
    mercadoPagoPaymentId?: string;
    mercadoPagoStatus?: string;
  }

  // Componente principal envuelto en Suspense
  function PaymentResultContent() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'approved' | 'pending' | 'rejected' | 'unknown'>('unknown');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Extraer parámetros de Mercado Pago
    const getMercadoPagoParams = (): MercadoPagoParams => {
      const params: MercadoPagoParams = {};
      
      // Parámetros que Mercado Pago envía en la redirección
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

      // También buscar orderId directamente
      const orderId = searchParams.get('orderId');
      if (orderId && !params.external_reference) {
        params.external_reference = orderId;
      }

      return params;
    };

    // Verificar estado del pago en el backend
    const verifyPayment = async (orderId: string) => {
      try {
        setLoading(true);
        
        // Obtener sessionId igual que en checkout
        const getSessionId = () => {
          let sessionId = localStorage.getItem('cartSessionId');
          if (!sessionId) {
            sessionId = localStorage.getItem('cart_session_id');
          }
          if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('cartSessionId', sessionId);
            localStorage.setItem('cart_session_id', sessionId);
          }
          sessionStorage.setItem('cartSessionId', sessionId);
          sessionStorage.setItem('cart_session_id', sessionId);
          return sessionId;
        };

        const sessionId = getSessionId();
        const token = localStorage.getItem('token');
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Cart-Session-Id': sessionId
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        console.log('🔍 Verificando pago para orden:', orderId);
        console.log('📤 Headers:', { 'X-Cart-Session-Id': sessionId.substring(0, 8) + '...' });

        // Intentar verificar en el backend - PRIMERO: endpoint de pagos
        let response = await fetch(`/api/payments/status/${orderId}`, {
          method: 'GET',
          headers,
          credentials: 'include'
        });

        if (!response.ok) {
          console.log('⚠️ Endpoint de pagos no disponible, intentando con orders...');
          // Si falla el endpoint de pagos, intentar con el de órdenes
          response = await fetch(`/api/orders/${orderId}`, {
            method: 'GET',
            headers,
            credentials: 'include'
          });
        }

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Datos recibidos del backend:', data);
        
        if (data.success || data.id) {
          // Mapear datos del backend (formato flexible)
          const order: OrderDetails = {
            id: data.orderId?.toString() || data.id?.toString() || orderId,
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
            mercadoPagoStatus: data.mercadoPagoStatus || data.mpStatus
          };

          setOrderDetails(order);
          
          // Determinar estado para UI
          if (order.status === 'PAGO_APROBADO' || order.status === 'APROBADO' || 
              order.mercadoPagoStatus === 'approved' || data.mpStatus === 'approved') {
            setPaymentStatus('approved');
            setSuccessMessage('✅ ¡Pago confirmado exitosamente!');
            // Limpiar localStorage después de pago exitoso
            localStorage.removeItem('pendingOrderId');
            localStorage.removeItem('pendingOrderData');
            localStorage.removeItem('pendingPreferenceId');
            localStorage.removeItem('cartSessionId');
          } else if (order.status === 'PENDIENTE' || order.mercadoPagoStatus === 'pending') {
            setPaymentStatus('pending');
          } else if (order.status === 'PAGO_RECHAZADO' || order.status === 'RECHAZADO' || 
                    order.mercadoPagoStatus === 'rejected') {
            setPaymentStatus('rejected');
            setError('❌ El pago fue rechazado. Por favor intenta con otro método de pago.');
          } else {
            setPaymentStatus('unknown');
          }

        } else {
          throw new Error(data.error || 'Error verificando pago');
        }
      } catch (err) {
        console.error('Error verificando pago:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    // Manejar parámetros de Mercado Pago
    const handleMercadoPagoRedirect = async (params: MercadoPagoParams) => {
      console.log('📊 Parámetros recibidos de Mercado Pago:', params);
      
      // Prioridad para determinar orderId:
      // 1. external_reference (lo que enviamos como orderId)
      // 2. collection_id o payment_id (para buscar en backend)
      // 3. orderId directo en URL
      let orderId: string | null = null;

      if (params.external_reference) {
        orderId = params.external_reference;
        console.log('✅ OrderId de external_reference:', orderId);
      } else {
        // Intentar extraer de otros parámetros
        orderId = searchParams.get('orderId');
        console.log('🔍 OrderId de URL:', orderId);
      }

      if (!orderId) {
        // Intentar obtener de localStorage como fallback
        orderId = localStorage.getItem('pendingOrderId');
        console.log('🔄 OrderId de localStorage:', orderId);
      }

      if (!orderId) {
        setError('No se pudo identificar la orden. Por favor, contacta con soporte.');
        setLoading(false);
        return;
      }

      // Verificar estado del pago
      await verifyPayment(orderId);

      // También podemos determinar estado preliminar desde parámetros
      if (params.collection_status) {
        console.log('📊 Estado de MercadoPago desde parámetros:', params.collection_status);
        switch (params.collection_status) {
          case 'approved':
            setPaymentStatus('approved');
            setSuccessMessage('✅ ¡Pago aprobado por MercadoPago!');
            break;
          case 'pending':
            setPaymentStatus('pending');
            break;
          case 'rejected':
            setPaymentStatus('rejected');
            setError('❌ Pago rechazado por MercadoPago');
            break;
        }
      }
    };

    useEffect(() => {
      const params = getMercadoPagoParams();
      
      if (Object.keys(params).length > 0) {
        handleMercadoPagoRedirect(params);
      } else {
        // Si no hay parámetros, intentar con orderId directo
        const orderId = searchParams.get('orderId');
        if (orderId) {
          verifyPayment(orderId);
        } else {
          // Intentar obtener de localStorage
          const pendingOrderId = localStorage.getItem('pendingOrderId');
          if (pendingOrderId) {
            verifyPayment(pendingOrderId);
          } else {
            setError('No se encontraron datos de pago. Por favor, verifica tu correo o contacta con soporte.');
            setLoading(false);
          }
        }
      }
    }, []);

    // Componente de loading
    if (loading) {
      return <PaymentLoadingFallback />;
    }

    // Componente de error
    if (error) {
      return (
        <div className="payment-result-container">
          <div className="payment-error-state">
            <div className="payment-error-icon">
              <XCircle className="payment-icon-xxl" />
            </div>
            <h1 className="payment-error-title">
              Error al verificar el pago
            </h1>
            <p className="payment-error-message">
              {error}
            </p>
            <div className="payment-error-actions">
              <Link
                href="/"
                className="payment-btn payment-btn-primary"
              >
                <Home className="payment-icon" />
                Volver al inicio
              </Link>
              <Link
                href="/contact"
                className="payment-btn payment-btn-outline"
              >
                <AlertCircle className="payment-icon" />
                Contactar soporte
              </Link>
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

    // Formatear precio
    const formatPrice = (price: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
    };

    // Formatear fecha
    const formatDate = (dateString: string) => {
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
    };

    // Pago aprobado
    const renderApproved = () => {
      if (!orderDetails) return null;

      return (
        <div className="payment-result-container">
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

            {/* Comprobante para pagos en efectivo */}
            {orderDetails.paymentInfo?.voucherUrl && (
              <div className="payment-voucher-card">
                <div className="payment-voucher-header">
                  <AlertCircle className="payment-icon-xl" />
                  <div>
                    <h3 className="payment-voucher-title">Pago Pendiente en Efectivo</h3>
                    <p className="payment-voucher-description">
                      Tu pedido está reservado. Debes pagar en el establecimiento usando el comprobante generado.
                      La reserva expira en 24 horas.
                    </p>
                  </div>
                </div>
                <a
                  href={orderDetails.paymentInfo.voucherUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="payment-btn payment-btn-warning"
                >
                  <Download className="payment-icon" />
                  Descargar Comprobante
                </a>
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
            </div>
          </main>
        </div>
      );
    };

    // Pago pendiente
    const renderPending = () => {
      const pendingOrderId = localStorage.getItem('pendingOrderId');

      return (
        <div className="payment-result-container">
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
              </ul>
            </div>

            <div className="payment-actions-section">
              <div className="payment-actions-grid">
                <Link
                  href="/orders"
                  className="payment-btn payment-btn-primary"
                >
                  <Package className="payment-icon" />
                  Ver Estado del Pedido
                </Link>
                <Link
                  href="/"
                  className="payment-btn payment-btn-outline"
                >
                  <ShoppingBag className="payment-icon" />
                  Seguir Comprando
                </Link>
                {pendingOrderId && (
                  <button
                    onClick={() => verifyPayment(pendingOrderId)}
                    className="payment-btn payment-btn-secondary"
                  >
                    <RefreshCw className="payment-icon" />
                    Actualizar Estado
                  </button>
                )}
              </div>
            </div>
          </main>
        </div>
      );
    };

    // Pago rechazado
    const renderRejected = () => {
      return (
        <div className="payment-result-container">
          <header className="payment-status-header payment-status-rejected">
            <div className="payment-status-icon">
              <XCircle className="payment-icon-xxl" />
            </div>
            <h1 className="payment-status-title">Pago Rechazado</h1>
            <p className="payment-status-subtitle">
              Lo sentimos, tu pago no pudo ser procesado. Por favor, intenta con otro método de pago.
            </p>
          </header>

          <main className="payment-result-main">
            <div className="payment-info-card">
              <h2 className="payment-section-title">
                <AlertCircle className="payment-icon" />
                Posibles razones:
              </h2>
              <ul className="payment-info-list">
                <li>• Fondos insuficientes en la cuenta/tarjeta</li>
                <li>• Datos de la tarjeta incorrectos</li>
                <li>• Límite de la tarjeta excedido</li>
                <li>• Problemas temporales con el banco emisor</li>
              </ul>
            </div>

            <div className="payment-actions-section">
              <div className="payment-actions-grid">
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