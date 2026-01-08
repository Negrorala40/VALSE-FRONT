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
  ExternalLink,
  Copy,
  CheckCircle2,
  Truck,
  Calendar,
  Share2,
  Smartphone,
  QrCode,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import '../checkout/success/PaymentResult.css';

interface OrderDetails {
  id: string;
  orderNumber: string;
  orderDate: string;
  status: 'PENDIENTE' | 'PAGO_APROBADO' | 'PAGO_RECHAZADO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';
  totalPrice: number;
  paymentMethod: string;
  paymentId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    address: string;
    city: string;
    state: string;
    country: string;
  };
  items: Array<{
    id: string;
    name: string;
    image: string;
    quantity: number;
    price: number;
    size: string;
    color: string;
  }>;
  estimatedDelivery: string;
  trackingNumber?: string;
}

type PaymentStatus = 'loading' | 'approved' | 'rejected' | 'pending' | 'error';

const PaymentResult = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('loading');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(true);
  const [showConfidentialInfo, setShowConfidentialInfo] = useState(false);
  const [pollingCount, setPollingCount] = useState(0);
  
  const orderRef = useRef<HTMLDivElement>(null);
  const orderId = searchParams.get('orderId');
  const mpStatus = searchParams.get('status');
  const collectionId = searchParams.get('collection_id');

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
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Cargar datos de la orden desde API
  useEffect(() => {
    const loadOrderData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        if (!orderId && !collectionId) {
          setError('No se encontró información de la orden');
          setPaymentStatus('error');
          return;
        }

        // Si venimos de MercadoPago redirect
        if (mpStatus === 'approved') {
          setPaymentStatus('approved');
        } else if (mpStatus === 'rejected') {
          setPaymentStatus('rejected');
        } else if (mpStatus === 'pending') {
          setPaymentStatus('pending');
        }

        let endpoint = '';
        if (orderId) {
          endpoint = `/api/orders/${orderId}`;
        } else if (collectionId) {
          endpoint = `/api/orders/by-payment/${collectionId}`;
        }

        const response = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Error al cargar la orden');
        }

        const orderData: OrderDetails = await response.json();
        setOrder(orderData);

        // Determinar estado basado en datos reales del backend
        if (orderData.status === 'PAGO_APROBADO') {
          setPaymentStatus('approved');
        } else if (orderData.status === 'PAGO_RECHAZADO') {
          setPaymentStatus('rejected');
        } else if (orderData.status === 'PENDIENTE') {
          setPaymentStatus('pending');
        } else {
          setPaymentStatus('approved'); // Para otros estados como ENVIADO, ENTREGADO
        }

      } catch (err: any) {
        console.error('Error loading order:', err);
        setError(err.message || 'Error al cargar los detalles de la orden');
        setPaymentStatus('error');
      }
    };

    loadOrderData();
  }, [orderId, collectionId, mpStatus, router]);

  // Polling si el estado está pendiente
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (paymentStatus === 'pending' && orderId && pollingCount < 20) {
      intervalId = setInterval(async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/orders/${orderId}/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            const data = await response.json();
            setPollingCount(prev => prev + 1);

            if (data.status === 'PAGO_APROBADO') {
              setPaymentStatus('approved');
              // Recargar datos completos
              const orderRes = await fetch(`/api/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              setOrder(await orderRes.json());
              clearInterval(intervalId);
            } else if (data.status === 'PAGO_RECHAZADO') {
              setPaymentStatus('rejected');
              clearInterval(intervalId);
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 3000); // Cada 3 segundos

      // Limpiar después de 1 minuto
      setTimeout(() => {
        if (intervalId) clearInterval(intervalId);
      }, 60000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [paymentStatus, orderId, pollingCount]);

  // Copiar número de orden
  const copyOrderNumber = () => {
    if (order) {
      navigator.clipboard.writeText(order.orderNumber)
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
    
    // Simulación de generación de PDF
    setTimeout(() => {
      setGeneratingPDF(false);
      
      // En producción, esto generaría un PDF real
      const link = document.createElement('a');
      link.href = '#';
      link.download = `comprobante-${order?.orderNumber}.pdf`;
      link.click();
      
      // Mensaje de éxito
      showToast('PDF generado exitosamente', 'success');
    }, 1500);
  };

  // Imprimir comprobante
  const printReceipt = () => {
    if (orderRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Comprobante de Pago - ${order?.orderNumber}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 20px; 
                  color: #333; 
                }
                .header { 
                  text-align: center; 
                  margin-bottom: 30px; 
                  border-bottom: 2px solid #103359; 
                  padding-bottom: 20px; 
                }
                .logo { 
                  font-size: 24px; 
                  font-weight: bold; 
                  color: #103359; 
                }
                .order-number { 
                  background: #3db28a; 
                  color: white; 
                  padding: 10px 20px; 
                  border-radius: 5px; 
                  display: inline-block; 
                  margin: 10px 0; 
                }
                .section { 
                  margin: 20px 0; 
                  padding: 15px; 
                  border: 1px solid #ddd; 
                  border-radius: 5px; 
                }
                .section-title { 
                  color: #103359; 
                  margin-bottom: 10px; 
                  font-size: 18px; 
                }
                .items-table { 
                  width: 100%; 
                  border-collapse: collapse; 
                  margin: 15px 0; 
                }
                .items-table th, .items-table td { 
                  border: 1px solid #ddd; 
                  padding: 8px; 
                  text-align: left; 
                }
                .total { 
                  font-size: 20px; 
                  font-weight: bold; 
                  color: #3db28a; 
                  margin-top: 20px; 
                }
                .footer { 
                  margin-top: 40px; 
                  text-align: center; 
                  color: #666; 
                  font-size: 12px; 
                  border-top: 1px solid #ddd; 
                  padding-top: 20px; 
                }
                @media print {
                  .no-print { display: none; }
                  body { margin: 0; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="logo">AMARTE</div>
                <h1>Comprobante de Pago</h1>
                <div class="order-number">${order?.orderNumber}</div>
                <p>Fecha: ${order ? formatDate(order.orderDate) : ''}</p>
              </div>
              
              <div class="section">
                <h2 class="section-title">Información del Cliente</h2>
                <p><strong>Nombre:</strong> ${order?.customerName}</p>
                <p><strong>Email:</strong> ${order?.customerEmail}</p>
                <p><strong>Teléfono:</strong> ${order?.customerPhone}</p>
              </div>
              
              <div class="section">
                <h2 class="section-title">Dirección de Envío</h2>
                <p>${order?.shippingAddress.address}</p>
                <p>${order?.shippingAddress.city}, ${order?.shippingAddress.state}</p>
                <p>${order?.shippingAddress.country}</p>
              </div>
              
              <div class="section">
                <h2 class="section-title">Productos Comprados</h2>
                <table class="items-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio Unitario</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${order?.items.map(item => `
                      <tr>
                        <td>${item.name} (${item.size}, ${item.color})</td>
                        <td>${item.quantity}</td>
                        <td>${formatPrice(item.price)}</td>
                        <td>${formatPrice(item.price * item.quantity)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              
              <div class="section">
                <h2 class="section-title">Resumen de Pago</h2>
                <p><strong>Método de pago:</strong> ${order?.paymentMethod}</p>
                <p><strong>ID de transacción:</strong> ${order?.paymentId}</p>
                <p><strong>Estado:</strong> ${order?.status}</p>
                <div class="total">Total: ${order ? formatPrice(order.totalPrice) : ''}</div>
              </div>
              
              <div class="footer">
                <p>Gracias por tu compra en AMARTE</p>
                <p>Este documento es tu comprobante de pago</p>
                <p>Fecha de generación: ${new Date().toLocaleString('es-CO')}</p>
              </div>
              
              <div class="no-print" style="margin-top: 20px; text-align: center;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #103359; color: white; border: none; border-radius: 5px; cursor: pointer;">
                  Imprimir Comprobante
                </button>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  // Compartir por WhatsApp
  const shareViaWhatsApp = () => {
    if (order) {
      const statusText = paymentStatus === 'approved' ? '✅ APROBADO' : 
                        paymentStatus === 'rejected' ? '❌ RECHAZADO' : '⏳ PENDIENTE';
      
      const message = `📦 Mi pedido en Amarte - Estado: ${statusText}\n\nOrden: ${order.orderNumber}\nTotal: ${formatPrice(order.totalPrice)}\nFecha: ${formatDate(order.orderDate)}\n\n¡Gracias por tu compra! 🚀`;
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  };

  // Tomar captura de pantalla
  const takeScreenshot = () => {
    showToast('Toma una captura de pantalla de esta página para guardar tu comprobante', 'info', 5000);
    
    if (orderRef.current) {
      orderRef.current.style.boxShadow = '0 0 0 4px #3db28a';
      setTimeout(() => {
        if (orderRef.current) {
          orderRef.current.style.boxShadow = '';
        }
      }, 1000);
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
  const retryVerification = () => {
    setPollingCount(0);
    setPaymentStatus('pending');
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
                Reintentar Verificación
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
              <Link href="/orders" className="btn btn-outline">
                <Package className="icon" />
                Ver Mis Pedidos
              </Link>
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

    return (
      <div className="order-details-section">
        {/* Código de orden */}
        <div className="order-code-section">
          <div className="order-code-container">
            <span className="order-code-label">Número de orden:</span>
            <div className="order-code-value">
              <code>{order.orderNumber}</code>
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
              </p>
            </div>
          </div>

          <div className="order-card-content">
            {/* Información del cliente */}
            <div className="order-section">
              <h3 className="order-section-title">
                <User className="icon" />
                Información del cliente
              </h3>
              <div className="order-info-grid">
                <div className="order-info-item">
                  <span className="order-info-label">Nombre:</span>
                  <span className="order-info-value">{order.customerName}</span>
                </div>
                <div className="order-info-item">
                  <span className="order-info-label">Email:</span>
                  <span className="order-info-value">
                    <Mail className="icon-sm" />
                    {order.customerEmail}
                  </span>
                </div>
                <div className="order-info-item">
                  <span className="order-info-label">Teléfono:</span>
                  <span className="order-info-value">
                    <Phone className="icon-sm" />
                    {order.customerPhone}
                  </span>
                </div>
              </div>
            </div>

            {/* Dirección de envío */}
            <div className="order-section">
              <h3 className="order-section-title">
                <MapPin className="icon" />
                Dirección de envío
              </h3>
              <div className="order-address">
                <p>{order.shippingAddress.address}</p>
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state}
                </p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>

            {/* Detalles del pago */}
            <div className="order-section">
              <h3 className="order-section-title">
                <CreditCard className="icon" />
                Detalles del pago
              </h3>
              <div className="order-info-grid">
                <div className="order-info-item">
                  <span className="order-info-label">Método de pago:</span>
                  <span className="order-info-value">{order.paymentMethod}</span>
                </div>
                <div className="order-info-item">
                  <span className="order-info-label">ID de transacción:</span>
                  <span className="order-info-value confidential">
                    {showConfidentialInfo ? order.paymentId : '••••••••••••'}
                    <button 
                      onClick={() => setShowConfidentialInfo(!showConfidentialInfo)}
                      className="toggle-confidential"
                    >
                      {showConfidentialInfo ? <EyeOff className="icon-xs" /> : <Eye className="icon-xs" />}
                    </button>
                  </span>
                </div>
                <div className="order-info-item">
                  <span className="order-info-label">Estado:</span>
                  <span className={`order-info-value status-${paymentStatus}`}>
                    {paymentStatus === 'approved' && <Check className="icon-sm" />}
                    {paymentStatus === 'rejected' && <X className="icon-sm" />}
                    {paymentStatus === 'pending' && <Clock className="icon-sm" />}
                    {order.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Productos comprados */}
            <div className="order-section">
              <h3 className="order-section-title">Productos comprados</h3>
              <div className="order-items">
                {order.items.map((item) => (
                  <div key={item.id} className="order-item">
                    <div className="order-item-image">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="80px"
                      />
                    </div>
                    <div className="order-item-details">
                      <h4 className="order-item-name">{item.name}</h4>
                      <div className="order-item-meta">
                        <span className="badge badge-outline badge-purple">
                          {item.color}
                        </span>
                        <span className="badge badge-outline badge-mint">
                          Talla: {item.size}
                        </span>
                      </div>
                      <div className="order-item-price">
                        <span>Cantidad: {item.quantity}</span>
                        <span>{formatPrice(item.price)} c/u</span>
                        <span className="order-item-total">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen de pago */}
            <div className="order-section order-total-section">
              <div className="order-total-row">
                <span>Subtotal:</span>
                <span>{formatPrice(order.items.reduce((sum, item) => sum + item.price * item.quantity, 0))}</span>
              </div>
              <div className="order-total-row">
                <span>Envío:</span>
                <span className="free">Gratis</span>
              </div>
              <div className="order-total-row order-total-final">
                <span>Total pagado:</span>
                <span className="order-total-amount">
                  {formatPrice(order.totalPrice)}
                </span>
              </div>
              <p className="order-total-note">Incluye IVA</p>
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
            {generatingPDF ? 'Generando PDF...' : 'Descargar PDF'}
          </button>
          
          <button 
            onClick={printReceipt}
            className="action-btn action-btn-secondary"
          >
            <Printer className="icon" />
            Imprimir comprobante
          </button>
          
          <button 
            onClick={takeScreenshot}
            className="action-btn action-btn-outline"
          >
            <Smartphone className="icon" />
            Tomar captura
          </button>
          
          <button 
            onClick={shareViaWhatsApp}
            className="action-btn action-btn-success"
          >
            <Share2 className="icon" />
            Compartir por WhatsApp
          </button>
        </div>

        {paymentStatus === 'approved' && (
          <div className="delivery-info">
            <div className="delivery-info-item">
              <Truck className="icon" />
              <div>
                <h4>Envío estimado</h4>
                <p>{new Date(order.estimatedDelivery).toLocaleDateString('es-CO')}</p>
              </div>
            </div>
            {order.trackingNumber && (
              <div className="delivery-info-item">
                <Package className="icon" />
                <div>
                  <h4>Número de seguimiento</h4>
                  <p>{order.trackingNumber}</p>
                </div>
              </div>
            )}
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
                Estimado: {new Date(order.estimatedDelivery).toLocaleDateString('es-CO')}
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
          <Link href="/orders" className="floating-menu-action">
            <Package className="icon" />
            <span>Ver mis pedidos</span>
          </Link>
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
              <h3 className="support-title">¿Necesitas ayuda?</h3>
              
              <div className="support-options">
                <Link href="/contact" className="support-option">
                  <Mail className="icon" />
                  <div>
                    <h4>Contactar soporte</h4>
                    <p>Respondemos en menos de 24h</p>
                  </div>
                </Link>
                
                <Link href="/faq" className="support-option">
                  <Shield className="icon" />
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
              ? '¡Gracias por confiar en Amarte! Tu pedido llegará pronto a las estrellas... y a tu hogar. 🚀'
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
              Seguir comprando
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PaymentResult;