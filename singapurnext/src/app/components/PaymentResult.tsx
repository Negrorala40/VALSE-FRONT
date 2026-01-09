  'use client';

  import { useEffect, useState, useRef } from 'react';
  import Image from 'next/image';
  import Link from 'next/link';   
  import { useSearchParams, useRouter } from 'next/navigation';
  import { 
    Check, 
    X,
    Clock,
    Package, 
    Star, 
    Sparkles, 
    Download, 
    Printer, 
    Home, 
    MapPin, 
    CreditCard,
    User,
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
    Eye,
    EyeOff,
    ShoppingBag,
    Calendar,
    Receipt,
    ExternalLink,
    Heart
  } from 'lucide-react';
  import '../checkout/success/PaymentResult.css';

  // Interfaz ALINEADA con lo que realmente devuelve tu backend
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
    // Campos que vendrán después (comentados por ahora)
    // customerEmail?: string;
    // shippingAddress?: any;
    // paymentMethod?: string;
  }

  type PaymentStatus = 'loading' | 'approved' | 'rejected' | 'pending' | 'error';

  const PaymentResult = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [order, setOrder] = useState<OrderResponse | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('loading');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [showFloatingMenu, setShowFloatingMenu] = useState(true);
    const [showConfidentialInfo, setShowConfidentialInfo] = useState(false);
    const [pollingCount, setPollingCount] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    
    const orderRef = useRef<HTMLDivElement>(null);
    const orderId = searchParams.get('orderId');
    const mpStatus = searchParams.get('status');

    // Verificar autenticación al cargar
    useEffect(() => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
    }, []);

    // Formateadores
    const formatPrice = (price: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
    };

    const formatDate = (dateString: string) => {
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
    };

    // Generar número de orden bonito
    const generateOrderNumber = (id: number) => {
      return `ORD-${id.toString().padStart(6, '0')}`;
    };

    // Calcular subtotal
    const calculateSubtotal = (items: OrderResponse['orderItems']) => {
      return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    // Cargar datos de la orden desde API
    useEffect(() => {
      const loadOrderData = async () => {
        try {
          if (!orderId) {
            setError('No se encontró número de orden');
            setPaymentStatus('error');
            return;
          }

          const token = localStorage.getItem('token');
          const isAuth = !!token;

          console.log('📦 Cargando orden:', { orderId, isAuthenticated: isAuth });

          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };

          if (isAuth) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`/api/orders/${orderId}`, {
            headers,
            credentials: 'include'
          });

          console.log('📦 Response status:', response.status);

          if (response.status === 403) {
            setError('No tienes acceso a esta orden');
            setPaymentStatus('error');
            return;
          }

          if (response.status === 404) {
            setError('Orden no encontrada');
            setPaymentStatus('error');
            return;
          }

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText || 'No se pudo cargar la orden'}`);
          }

          const orderData: OrderResponse = await response.json();
          console.log('✅ Datos de orden recibidos:', orderData);
          
          setOrder(orderData);

          // Determinar estado basado en datos reales del backend
          if (orderData.status === 'PAGO_APROBADO') {
            setPaymentStatus('approved');
          } else if (orderData.status === 'PAGO_RECHAZADO') {
            setPaymentStatus('rejected');
          } else if (orderData.status === 'PENDIENTE') {
            setPaymentStatus('pending');
          } else {
            setPaymentStatus('approved');
          }

        } catch (err: any) {
          console.error('❌ Error loading order:', err);
          setError(err.message || 'Error al cargar los detalles de la orden');
          setPaymentStatus('error');
        }
      };

      loadOrderData();
    }, [orderId]);

    // Polling si el estado está pendiente
    useEffect(() => {
      let intervalId: NodeJS.Timeout;

      const checkStatus = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token && isAuthenticated) return;

          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };

          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`/api/payments/status/${orderId}`, {
            headers,
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            setPollingCount(prev => prev + 1);

            if (data.status === 'PAGO_APROBADO') {
              setPaymentStatus('approved');
              // Recargar datos completos
              const orderRes = await fetch(`/api/orders/${orderId}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                credentials: 'include'
              });
              if (orderRes.ok) {
                setOrder(await orderRes.json());
              }
              if (intervalId) clearInterval(intervalId);
            } else if (data.status === 'PAGO_RECHAZADO') {
              setPaymentStatus('rejected');
              if (intervalId) clearInterval(intervalId);
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      };

      if (paymentStatus === 'pending' && orderId && pollingCount < 20) {
        intervalId = setInterval(checkStatus, 3000);

        // Limpiar después de 1 minuto
        setTimeout(() => {
          if (intervalId) clearInterval(intervalId);
        }, 60000);
      }

      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    }, [paymentStatus, orderId, pollingCount, isAuthenticated]);

    // Copiar número de orden
    const copyOrderNumber = () => {
      if (order) {
        navigator.clipboard.writeText(generateOrderNumber(order.id))
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
          .catch(err => console.error('Error copying:', err));
      }
    };

    // Simular generación de PDF
    const generatePDF = () => {
      setGeneratingPDF(true);
      
      setTimeout(() => {
        setGeneratingPDF(false);
        showToast('PDF generado exitosamente', 'success');
        
        // Crear PDF simple
        const printContent = `
          <html>
            <head>
              <title>Comprobante - ${generateOrderNumber(order!.id)}</title>
              <style>
                body { font-family: Arial; margin: 20px; }
                .header { text-align: center; margin-bottom: 20px; }
                .order-number { font-size: 18px; font-weight: bold; color: #103359; }
                .section { margin: 15px 0; padding: 10px; border: 1px solid #ddd; }
                .total { font-size: 16px; font-weight: bold; color: #3db28a; }
              </style>
            </head>
            <body>
              <div class="header">
                <h2>AMARTE - Comprobante de Pago</h2>
                <div class="order-number">${generateOrderNumber(order!.id)}</div>
                <p>Fecha: ${formatDate(order!.orderDate)}</p>
              </div>
              <div class="section">
                <h3>Resumen</h3>
                <p>Estado: ${order!.status}</p>
                <p>Total: ${formatPrice(order!.totalPrice)}</p>
                <p>Productos: ${order!.orderItems.length}</p>
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
    };

    // Compartir por WhatsApp
    const shareViaWhatsApp = () => {
      if (order) {
        const statusText = paymentStatus === 'approved' ? '✅ APROBADO' : 
                          paymentStatus === 'rejected' ? '❌ RECHAZADO' : '⏳ PENDIENTE';
        
        const message = `📦 Mi pedido en Amarte\n\nOrden: ${generateOrderNumber(order.id)}\nEstado: ${statusText}\nTotal: ${formatPrice(order.totalPrice)}\nFecha: ${formatDate(order.orderDate)}\n\n¡Gracias por tu compra! 🚀`;
        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
      }
    };

    // Toast helper
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
      const event = new CustomEvent('show-toast', {
        detail: { message, type, duration }
      });
      window.dispatchEvent(event);
    };

    // Reintentar verificación
    const retryVerification = async () => {
      setPollingCount(0);
      setPaymentStatus('loading');
      // Recargar datos
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          headers,
          credentials: 'include'
        });
        
        if (response.ok) {
          const orderData: OrderResponse = await response.json();
          setOrder(orderData);
          
          if (orderData.status === 'PAGO_APROBADO') {
            setPaymentStatus('approved');
          } else if (orderData.status === 'PAGO_RECHAZADO') {
            setPaymentStatus('rejected');
          } else if (orderData.status === 'PENDIENTE') {
            setPaymentStatus('pending');
          }
        }
      } catch (error) {
        console.error('Error retrying:', error);
      }
    };

    // Navegar a login con redirección de vuelta
    const navigateToLogin = () => {
      const currentUrl = window.location.pathname + window.location.search;
      router.push(`/auth/login?redirect=${encodeURIComponent(currentUrl)}`);
    };

    // Navegar a registro
    const navigateToRegister = () => {
      const currentUrl = window.location.pathname + window.location.search;
      router.push(`/auth/register?redirect=${encodeURIComponent(currentUrl)}`);
    };

    // Componentes según estado
    const renderStatusHeader = () => {
      switch (paymentStatus) {
        case 'approved':
          return (
            <header className="status-header status-approved">
              <div className="status-icon">
                <Check className="icon-xxl" strokeWidth={3} />
              </div>
              <h1 className="status-title">¡Pago Confirmado!</h1>
              <p className="status-subtitle">
                Tu pedido está siendo procesado. Recibirás un correo de confirmación en breve.
              </p>
              {!isAuthenticated && order && (
                <div className="guest-notice">
                  <AlertCircle className="icon" />
                  <p>
                    <strong>¡Importante!</strong> Como compraste como invitado, guarda tu número de orden: 
                    <strong> {generateOrderNumber(order.id)}</strong>
                  </p>
                </div>
              )}
            </header>
          );

        case 'rejected':
          return (
            <header className="status-header status-rejected">
              <div className="status-icon">
                <X className="icon-xxl" strokeWidth={3} />
              </div>
              <h1 className="status-title">Pago Rechazado</h1>
              <p className="status-subtitle">
                No pudimos procesar tu pago. Por favor, intenta con otro método de pago.
              </p>
              <div className="status-actions">
                <Link href="/checkout" className="btn btn-primary">
                  <RefreshCw className="icon" />
                  Reintentar Pago
                </Link>
                <Link href="/contact" className="btn btn-outline">
                  <Mail className="icon" />
                  Contactar Soporte
                </Link>
              </div>
            </header>
          );

        case 'pending':
          return (
            <header className="status-header status-pending">
              <div className="status-icon">
                <Clock className="icon-xxl" />
              </div>
              <h1 className="status-title">Pago en Proceso</h1>
              <p className="status-subtitle">
                Estamos verificando el estado de tu pago. Esto puede tomar unos momentos.
                {pollingCount > 0 && ` (Verificando... ${pollingCount}/20)`}
              </p>
              <div className="status-actions">
                <button onClick={retryVerification} className="btn btn-outline">
                  <RefreshCw className="icon" />
                  Actualizar Estado
                </button>
              </div>
            </header>
          );

        case 'error':
          return (
            <header className="status-header status-error">
              <div className="status-icon">
                <AlertCircle className="icon-xxl" />
              </div>
              <h1 className="status-title">Error al Cargar</h1>
              <p className="status-subtitle">
                {error || 'No pudimos cargar la información de tu pedido.'}
              </p>
              <div className="status-actions">
                <Link href="/" className="btn btn-primary">
                  <Home className="icon" />
                  Volver al Inicio
                </Link>
                {isAuthenticated ? (
                  <Link href="/orders" className="btn btn-outline">
                    <Package className="icon" />
                    Ver Mis Pedidos
                  </Link>
                ) : (
                  <button onClick={navigateToLogin} className="btn btn-outline">
                    <User className="icon" />
                    Iniciar Sesión
                  </button>
                )}
              </div>
            </header>
          );

        default:
          return (
            <header className="status-header status-loading">
              <div className="spinner-large"></div>
              <h1 className="status-title">Cargando información...</h1>
              <p className="status-subtitle">
                Estamos obteniendo los detalles de tu pedido.
              </p>
            </header>
          );
      }
    };

    const renderOrderDetails = () => {
      if (!order || paymentStatus === 'loading' || paymentStatus === 'error') {
        return null;
      }

      const orderNumber = generateOrderNumber(order.id);
      const subtotal = calculateSubtotal(order.orderItems);
      const shippingCost = 0; // Gratis por ahora
      const tax = order.totalPrice - subtotal - shippingCost;

      return (
        <div className="order-details-section">
          {/* Notificación para usuarios anónimos */}
          {!isAuthenticated && (
            <div className="guest-warning-banner">
              <div className="guest-warning-content">
                <AlertCircle className="icon" />
                <div>
                  <h4>⚠️ Estás viendo esta orden como invitado</h4>
                  <p>
                    Para acceder a tu historial de pedidos y recibir actualizaciones, 
                    <button onClick={navigateToRegister} className="link-button">
                      regístrate
                    </button>
                    {' o '}
                    <button onClick={navigateToLogin} className="link-button">
                      inicia sesión
                    </button>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Código de orden */}
          <div className="order-code-section">
            <div className="order-code-container">
              <span className="order-code-label">Número de orden:</span>
              <div className="order-code-value">
                <code>{orderNumber}</code>
                <button 
                  onClick={copyOrderNumber}
                  className={`order-code-copy ${copied ? 'copied' : ''}`}
                  title={copied ? '¡Copiado!' : 'Copiar al portapapeles'}
                >
                  {copied ? <CheckCircle2 className="icon" /> : <Copy className="icon" />}
                </button>
              </div>
            </div>
            <p className="order-code-note">
              Guarda este número para cualquier consulta sobre tu pedido
              {!isAuthenticated && ' (¡Especialmente importante si eres invitado!)'}
            </p>
          </div>

          {/* Tarjeta de resumen */}
          <div className="order-card" ref={orderRef}>
            <div className="order-card-header">
              <div className="order-card-icon">
                <Package className="icon-xl" />
              </div>
              <div className="order-card-title-section">
                <h2 className="order-card-title">Resumen de tu compra</h2>
                <p className="order-card-subtitle">
                  Orden realizada el {formatDate(order.orderDate)}
                  {!isAuthenticated && ' (como invitado)'}
                </p>
              </div>
            </div>

            <div className="order-card-content">
              {/* Estado de la orden */}
              <div className="order-section">
                <h3 className="order-section-title">
                  <ShoppingBag className="icon" />
                  Estado de la orden
                </h3>
                <div className="order-status-display">
                  <div className={`status-badge status-${order.status.toLowerCase()}`}>
                    {order.status.replace('_', ' ')}
                  </div>
                  <p className="status-description">
                    {order.status === 'PAGO_APROBADO' 
                      ? 'Tu pago ha sido confirmado y estamos preparando tu pedido.'
                      : order.status === 'PENDIENTE'
                      ? 'Estamos esperando la confirmación de tu pago.'
                      : 'El estado de tu orden ha sido actualizado.'}
                  </p>
                </div>
              </div>

              {/* Resumen de productos */}
              <div className="order-section">
                <h3 className="order-section-title">
                  <Package className="icon" />
                  Productos comprados ({order.orderItems.length})
                </h3>
                <div className="order-items-simple">
                  {order.orderItems.map((item, index) => (
                    <div key={item.id} className="order-item-simple">
                      <div className="order-item-simple-info">
                        <div className="order-item-simple-header">
                          <span className="order-item-simple-name">
                            Producto #{index + 1}
                            {item.productVariantId && ` (Variante: ${item.productVariantId})`}
                          </span>
                          <span className="order-item-simple-quantity">
                            x{item.quantity}
                          </span>
                        </div>
                        <div className="order-item-simple-price">
                          <span>{formatPrice(item.price)} c/u</span>
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
                    <span>Subtotal ({order.orderItems.length} productos):</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="payment-summary-row">
                    <span>Envío:</span>
                    <span className="free">Gratis</span>
                  </div>
                  {tax > 0 && (
                    <div className="payment-summary-row">
                      <span>IVA:</span>
                      <span>{formatPrice(tax)}</span>
                    </div>
                  )}
                  <div className="payment-summary-total">
                    <span>Total pagado:</span>
                    <span className="total-amount">{formatPrice(order.totalPrice)}</span>
                  </div>
                  <p className="payment-summary-note">Incluye todos los impuestos aplicables</p>
                </div>
              </div>

              {/* Información de pago */}
              <div className="order-section">
                <h3 className="order-section-title">
                  <CreditCard className="icon" />
                  Información del pago
                </h3>
                <div className="payment-info">
                  <div className="payment-info-item">
                    <span className="payment-info-label">Método:</span>
                    <span className="payment-info-value">MercadoPago</span>
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
                    <span className="payment-info-label">Fecha de pago:</span>
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
          <h3 className="action-panel-title">Acciones disponibles</h3>
          
          <div className="action-buttons-grid">
            <button 
              onClick={generatePDF}
              disabled={generatingPDF}
              className="action-btn action-btn-primary"
            >
              <Download className="icon" />
              {generatingPDF ? 'Generando PDF...' : 'Descargar comprobante'}
            </button>
            
            <button 
              onClick={() => window.print()}
              className="action-btn action-btn-secondary"
            >
              <Printer className="icon" />
              Imprimir
            </button>
            
            <button 
              onClick={shareViaWhatsApp}
              className="action-btn action-btn-success"
            >
              <Share2 className="icon" />
              Compartir
            </button>
            
            {!isAuthenticated && (
              <button 
                onClick={navigateToRegister}
                className="action-btn action-btn-outline"
              >
                <User className="icon" />
                Crear cuenta
              </button>
            )}
          </div>

          {paymentStatus === 'approved' && (
            <div className="delivery-info">
              <div className="delivery-info-item">
                <Truck className="icon" />
                <div>
                  <h4>Envío estimado</h4>
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
          <h3 className="next-steps-title">Próximos pasos</h3>
          
          <div className="steps-timeline">
            <div className="step-item step-completed">
              <div className="step-icon">
                <Check className="icon" />
              </div>
              <div className="step-content">
                <h4>Pago confirmado</h4>
                <p>Tu pago ha sido procesado exitosamente</p>
                <span className="step-time">Completado</span>
              </div>
            </div>
            
            <div className={`step-item ${paymentStatus === 'approved' ? 'step-active' : 'step-pending'}`}>
              <div className="step-icon">
                <Package className="icon" />
              </div>
              <div className="step-content">
                <h4>Preparando tu pedido</h4>
                <p>Estamos empaquetando tus productos con cuidado</p>
                <span className="step-time">En proceso</span>
              </div>
            </div>
            
            <div className="step-item step-pending">
              <div className="step-icon">
                <Truck className="icon" />
              </div>
              <div className="step-content">
                <h4>Envío en camino</h4>
                <p>Tu pedido será despachado pronto</p>
                <span className="step-time">Próximamente</span>
              </div>
            </div>
            
            <div className="step-item step-pending">
              <div className="step-icon">
                <Home className="icon" />
              </div>
              <div className="step-content">
                <h4>Entrega completada</h4>
                <p>¡Tus productos llegarán a tu puerta!</p>
                <span className="step-time">
                  Estimado: 3-5 días hábiles
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    };

    const renderFloatingMenu = () => {
      if (!showFloatingMenu || !order || paymentStatus === 'error') {
        return null;
      }

      return (
        <div className="floating-menu">
          <div className="floating-menu-header">
            <h4>¿Qué deseas hacer ahora?</h4>
            <button 
              onClick={() => setShowFloatingMenu(false)}
              className="floating-menu-close"
            >
              ×
            </button>
          </div>
          <div className="floating-menu-actions">
            <Link href="/" className="floating-menu-action">
              <Home className="icon" />
              <span>Seguir comprando</span>
            </Link>
            {isAuthenticated ? (
              <Link href="/orders" className="floating-menu-action">
                <Package className="icon" />
                <span>Ver mis pedidos</span>
              </Link>
            ) : (
              <button onClick={navigateToRegister} className="floating-menu-action">
                <User className="icon" />
                <span>Crear cuenta</span>
              </button>
            )}
            <button 
              onClick={generatePDF}
              className="floating-menu-action"
            >
              <Download className="icon" />
              <span>Guardar comprobante</span>
            </button>
            <button 
              onClick={shareViaWhatsApp}
              className="floating-menu-action"
            >
              <Share2 className="icon" />
              <span>Compartir con amigos</span>
            </button>
          </div>
        </div>
      );
    };

    return (
      <div className="payment-result-container">
        {/* Elementos decorativos */}
        <div className="decorative-elements">
          <div className="decorative-icon star">
            <Star className="icon-lg" />
          </div>
          <div className="decorative-icon sparkle">
            <Sparkles className="icon-md" />
          </div>
        </div>

        {/* Botón para volver atrás */}
        <div className="back-button-container">
          <Link href="/" className="back-button">
            <ArrowLeft className="icon" />
            Volver al inicio
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

              {/* Soporte y ayuda */}
              <div className="support-panel">
                <h3 className="support-title">
                  <Shield className="icon" />
                  ¿Necesitas ayuda?
                </h3>
                
                <div className="support-options">
                  <Link href="/contact" className="support-option">
                    <Mail className="icon" />
                    <div>
                      <h4>Contactar soporte</h4>
                      <p>Respondemos en menos de 24h</p>
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
                      <h4>Línea de atención</h4>
                      <p>+57 1 234 5678</p>
                      <p className="hotline-hours">Lun-Vie: 8am - 6pm</p>
                    </div>
                  </div>
                </div>

                {!isAuthenticated && (
                  <div className="guest-support-notice">
                    <AlertCircle className="icon" size={16} />
                    <p>
                      <strong>Si compraste como invitado:</strong> 
                      Conserva tu número de orden. Para consultas, proporciona este número al soporte.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Menú flotante */}
        {renderFloatingMenu()}

        {/* Footer */}
        <footer className="payment-result-footer">
          <div className="footer-content">
            <p className="footer-text">
              {paymentStatus === 'approved' 
                ? `¡Gracias por confiar en Amarte! Tu pedido ${order ? generateOrderNumber(order.id) : ''} llegará pronto. 🚀`
                : paymentStatus === 'rejected'
                ? '¿Problemas con el pago? Nuestro equipo de soporte está listo para ayudarte.'
                : 'Estamos procesando tu información. ¡Gracias por tu paciencia!'}
            </p>
            <div className="footer-actions">
              <Link href="/" className="btn btn-outline btn-lg">
                <Home className="icon" />
                Volver al inicio
              </Link>
              <Link href="/products" className="btn btn-primary btn-lg">
                <Heart className="icon" />
                Seguir comprando
              </Link>
            </div>
          </div>
        </footer>

        {/* Estilos adicionales */}
        <style jsx>{`
          .order-items-simple {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          
          .order-item-simple {
            padding: 0.75rem;
            background: var(--checkout-bg-light);
            border-radius: 0.5rem;
            border: 1px solid var(--checkout-border);
          }
          
          .order-item-simple-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
          }
          
          .order-item-simple-name {
            font-weight: 500;
            color: var(--checkout-navy);
          }
          
          .order-item-simple-quantity {
            color: var(--checkout-gray-dark);
            font-size: 0.875rem;
          }
          
          .order-item-simple-price {
            display: flex;
            justify-content: space-between;
            font-size: 0.875rem;
          }
          
          .order-item-simple-total {
            font-weight: 600;
            color: var(--checkout-navy);
          }
          
          .payment-summary {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .payment-summary-row {
            display: flex;
            justify-content: space-between;
            padding: 0.25rem 0;
          }
          
          .payment-summary-total {
            display: flex;
            justify-content: space-between;
            padding: 1rem 0;
            margin-top: 0.5rem;
            border-top: 2px solid var(--checkout-border);
            font-size: 1.125rem;
            font-weight: 600;
          }
          
          .total-amount {
            color: var(--checkout-green);
          }
          
          .payment-summary-note {
            font-size: 0.75rem;
            color: var(--checkout-gray-dark);
            text-align: center;
            margin-top: 0.5rem;
          }
          
          .payment-info {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          
          .payment-info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .payment-info-label {
            font-weight: 500;
            color: var(--checkout-gray-dark);
          }
          
          .payment-info-value {
            display: flex;
            align-items: center;
            gap: 0.25rem;
          }
          
          .status-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 1rem;
            font-size: 0.875rem;
            font-weight: 500;
          }
          
          .status-pendiente {
            background: var(--checkout-yellow-light);
            color: var(--checkout-yellow-dark);
          }
          
          .status-pago_aprobado {
            background: var(--checkout-green-light);
            color: var(--checkout-green-dark);
          }
          
          .status-pago_rechazado {
            background: var(--checkout-red-light);
            color: var(--checkout-red-dark);
          }
          
          .status-description {
            margin-top: 0.5rem;
            color: var(--checkout-gray-dark);
            font-size: 0.875rem;
          }
          
          .free {
            color: var(--checkout-green);
            font-weight: 600;
          }
          
          .link-button {
            background: none;
            border: none;
            color: var(--checkout-blue);
            text-decoration: underline;
            cursor: pointer;
            padding: 0;
            margin: 0 0.25rem;
            font-size: inherit;
          }
          
          .link-button:hover {
            color: var(--checkout-blue-dark);
          }
        `}</style>
      </div>
    );
  };

  export default PaymentResult;