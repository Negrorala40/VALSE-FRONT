'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  ShoppingCart
} from 'lucide-react';
import './PaymentResult.css';

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
}

type PaymentStatus = 'loading' | 'approved' | 'rejected' | 'pending' | 'error';

const PaymentResult = () => {
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('loading');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(true);
  const [pollingCount, setPollingCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  const orderRef = useRef<HTMLDivElement>(null);
  const orderId = searchParams.get('orderId');

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

  // Generar número de orden
  const generateOrderNumber = (id: number) => {
    return `A-MARTE-${id.toString().padStart(6, '0')}`;
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

        const response = await fetch(`/api/orders/${orderId}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        if (response.status === 403) {
          setError('No tienes acceso a esta orden.');
          setPaymentStatus('error');
          return;
        }

        if (response.status === 404) {
          setError('Orden no encontrada en el sistema.');
          setPaymentStatus('error');
          return;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${errorText || 'No se pudo cargar la orden'}`);
        }

        const orderData: OrderResponse = await response.json();
        setOrder(orderData);
        
        if (orderData.status === 'PAGO_APROBADO') {
          setPaymentStatus('approved');
        } else if (orderData.status === 'PAGO_RECHAZADO') {
          setPaymentStatus('rejected');
        } else if (orderData.status === 'PENDIENTE') {
          setPaymentStatus('pending');
        } else {
          setPaymentStatus('approved');
        }

      } catch (err: unknown) {
        console.error('❌ Error loading order:', err);
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage || 'Error al cargar los detalles de la orden');
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

  // Generar PDF
  const generatePDF = () => {
    setGeneratingPDF(true);
    
    setTimeout(() => {
      setGeneratingPDF(false);
      showToast('PDF generado exitosamente', 'success');
      
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
              <h2>A MARTE - Comprobante de Pago</h2>
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
      
      const message = `Mi pedido en A MARTE\n\nOrden: ${generateOrderNumber(order.id)}\nEstado: ${statusText}\nTotal: ${formatPrice(order.totalPrice)}\nFecha: ${formatDate(order.orderDate)}\n\n¡Gracias por tu compra!`;
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
        <Link href="/checkout" className="btn btn-primary">
          <RefreshCw className="icon" />
          Reintentar pago
        </Link>
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
        {pollingCount > 0 && ` (Verificando... ${pollingCount}/20)`}
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
          <Link href="/" className="btn btn-outline">
            <Home className="icon" />
            Volver al inicio
          </Link>
        )}
      </div>
    </header>
  );

  // Renderizar header según estado
  const renderStatusHeader = () => {
    switch (paymentStatus) {
      case 'approved': return renderApprovedStatus();
      case 'rejected': return renderRejectedStatus();
      case 'pending': return renderPendingStatus();
      case 'error': return renderErrorStatus();
      default:
        return (
          <header className="status-header status-loading">
            <div className="spinner-large"></div>
            <h1 className="status-title">Cargando información de tu pedido...</h1>
            <p className="status-subtitle">
              Preparando los detalles de tu compra.
            </p>
          </header>
        );
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
        {!isAuthenticated && (
          <div className="guest-warning-banner">
            <div className="guest-warning-content">
              <ShieldCheck className="icon" />
              <div>
                <h4>Compra como invitado</h4>
                <p>
                  Para guardar tu historial de compras y recibir actualizaciones, 
                  <Link href="/" className="link-button">
                    visita nuestro sitio web
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Código de orden */}
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
              >
                {copied ? <CheckCircle2 className="icon" /> : <Copy className="icon" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>
          <p className="order-code-note">
            <ShieldCheck className="icon-xs" />
            Este es tu identificador único para seguir el estado de tu pedido
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

            {/* Resumen de productos */}
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
                          Pijama infantil #{index + 1}
                          {item.productVariantId && ` · Variante ${item.productVariantId}`}
                        </span>
                        <span className="order-item-simple-quantity">
                          x{item.quantity}
                        </span>
                      </div>
                      <div className="order-item-simple-price">
                        <span>{formatPrice(item.price)} unidad</span>
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

            {/* Información de pago */}
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
          >
            <Download className="icon" />
            {generatingPDF ? 'Generando documento...' : 'Guardar comprobante'}
          </button>
          
          <button 
            onClick={() => window.print()}
            className="action-btn action-btn-secondary"
          >
            <Printer className="icon" />
            Imprimir detalles
          </button>
          
          <button 
            onClick={shareViaWhatsApp}
            className="action-btn action-btn-success"
          >
            <Share2 className="icon" />
            Compartir pedido
          </button>
          
          {!isAuthenticated && (
            <Link 
              href="/"
              className="action-btn action-btn-outline"
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
    if (!showFloatingMenu || !order || paymentStatus === 'error') {
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
          >
            <Download className="icon" />
            <span>Guardar comprobante</span>
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

  return (
    <div className="payment-result-container">
      {/* Botón para volver atrás */}
      <div className="back-button-container">
        <Link href="/" className="back-button">
          <ArrowLeft className="icon" />
          Regresar al inicio
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

      {/* Menú flotante */}
      {renderFloatingMenu()}

      {/* Footer */}
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
              Seguir comprando
            </Link>
            <Link href="/" className="btn btn-outline btn-lg">
              <Home className="icon" />
              Volver al inicio
            </Link>
          </div>
          <p className="footer-motto">
            Pijamas cómodas para sueños felices ✨
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PaymentResult;