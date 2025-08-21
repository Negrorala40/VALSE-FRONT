'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

interface OrderStatusData {
  orderId: number;
  status: string;
  totalPrice: number;
  orderDate: string;
  customerName: string;
}

const Success = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderStatusData | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  
  const receiptRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchOrderStatus = async () => {
      const token = localStorage.getItem('token');
      
      // Intentar obtener orderId de diferentes fuentes
      const orderId = localStorage.getItem('orderId') || 
                   searchParams?.get('orderId') || 
                   sessionStorage.getItem('orderId');

      if (!token || !orderId) {
        setError('No se encontró información del pedido o token de autenticación');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `https://amarte--backendamarte--sjfs798q7b8v.code.run/api/orders/status/${orderId}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Orden no encontrada');
          } else if (res.status === 403) {
            throw new Error('No tienes permiso para ver esta orden');
          } else {
            const errMsg = await res.text();
            throw new Error(errMsg || `Error ${res.status}: ${res.statusText}`);
          }
        }

        const data: OrderStatusData = await res.json();
        setOrderData(data);
        
        // Limpiar localStorage después de obtener los datos
        localStorage.removeItem('orderId');
        
      } catch (err) {
        console.error('Error fetching order status:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Error desconocido al cargar el estado de la orden');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrderStatus();
  }, [searchParams]);

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'PAGO_APROBADO':
        return {
          message: '¡Pago confirmado exitosamente!',
          color: '#28a745',
          icon: '✅',
          description: 'Tu pedido ha sido procesado y será enviado pronto.'
        };
      case 'PAGO_RECHAZADO':
        return {
          message: 'Pago rechazado',
          color: '#dc3545',
          icon: '❌',
          description: 'Hubo un problema con el pago. Por favor intenta nuevamente.'
        };
      case 'PENDIENTE':
        return {
          message: 'Pago pendiente',
          color: '#ffc107',
          icon: '⏳',
          description: 'Estamos procesando tu pago. Te notificaremos cuando se complete.'
        };
      default:
        return {
          message: `Estado: ${status}`,
          color: '#6c757d',
          icon: 'ℹ️',
          description: 'Estado del pedido actualizado.'
        };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const takeScreenshot = () => {
    if (receiptRef.current) {
      // Usar html2canvas si está disponible
      import('html2canvas').then(html2canvas => {
        html2canvas.default(receiptRef.current!).then(canvas => {
          const link = document.createElement('a');
          link.download = `orden-${orderData?.orderId}-screenshot.png`;
          link.href = canvas.toDataURL();
          link.click();
        });
      }).catch(() => {
        alert('Para tomar captura de pantalla, por favor usa Ctrl+Shift+S (Windows/Linux) o Cmd+Shift+4 (Mac)');
      });
    }
  };

  const downloadPdf = async () => {
    if (!orderData) return;
    
    setDownloadingPdf(true);
    try {
      // Usar jsPDF si está disponible
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Configurar el PDF
      doc.setFontSize(20);
      doc.text('Comprobante de Orden', 20, 30);
      
      doc.setFontSize(12);
      doc.text(`Orden #: ${orderData.orderId}`, 20, 50);
      doc.text(`Cliente: ${orderData.customerName}`, 20, 60);
      doc.text(`Estado: ${orderData.status}`, 20, 70);
      doc.text(`Total: ${formatCurrency(orderData.totalPrice)}`, 20, 80);
      doc.text(`Fecha: ${formatDate(orderData.orderDate)}`, 20, 90);
      
      const statusInfo = getStatusMessage(orderData.status);
      doc.text(`Estado del pago: ${statusInfo.message}`, 20, 110);
      doc.text(statusInfo.description, 20, 120);
      
      doc.text('Tienda Amarte - Gracias por tu compra', 20, 150);
      
      // Descargar el PDF
      doc.save(`orden-${orderData.orderId}-comprobante.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generando el PDF. Por favor intenta tomar una captura de pantalla.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="checkout-success-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando información de tu pedido...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="checkout-success-container">
        <div className="error-section">
          <div className="error-icon">⚠️</div>
          <h1>Error al cargar la información</h1>
          <p className="error-message">{error}</p>
          <button 
            className="retry-button" 
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="checkout-success-container">
        <div className="error-section">
          <h1>No se encontró información del pedido</h1>
          <p>Por favor contacta con soporte si el problema persiste.</p>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusMessage(orderData.status);

  return (
    <div className="checkout-success-container">
      <div className="success-content">
        {/* Sección del recibo para captura/PDF */}
        <div className="receipt-section" ref={receiptRef}>
          <div className="receipt-header">
            <h1>Tienda Amarte</h1>
            <p>Comprobante de Orden</p>
          </div>

          <div className="order-summary">
            <div className="order-info">
              <div className="info-row">
                <span className="label">Número de Orden:</span>
                <span className="value">{orderData.orderId}</span>
              </div>
              <div className="info-row">
                <span className="label">Cliente:</span>
                <span className="value">{orderData.customerName}</span>
              </div>
              <div className="info-row">
                <span className="label">Fecha:</span>
                <span className="value">{formatDate(orderData.orderDate)}</span>
              </div>
              <div className="info-row">
                <span className="label">Total:</span>
                <span className="value total-amount">{formatCurrency(orderData.totalPrice)}</span>
              </div>
            </div>
          </div>

          <div className="status-section">
            <div 
              className="status-badge" 
              style={{ backgroundColor: statusInfo.color }}
            >
              <span className="status-icon">{statusInfo.icon}</span>
              <span className="status-text">{statusInfo.message}</span>
            </div>
            <p className="status-description">{statusInfo.description}</p>
          </div>
        </div>

        {/* Mensaje de guardado */}
        <div className="save-instructions">
          <h2>📄 Guarda tu comprobante</h2>
          <p>Te recomendamos guardar este comprobante para tus registros:</p>
          
          <div className="save-buttons">
            <button 
              className="save-button screenshot-btn"
              onClick={takeScreenshot}
            >
              📸 Tomar captura de pantalla
            </button>
            
            <button 
              className="save-button pdf-btn"
              onClick={downloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? '⏳ Generando PDF...' : '📄 Descargar PDF'}
            </button>
          </div>
        </div>

        {/* Acciones adicionales */}
        <div className="actions-section">
          <button 
            className="primary-button"
            onClick={() => window.location.href = '/'}
          >
            Volver a la tienda
          </button>
          
          <button 
            className="secondary-button"
            onClick={() => window.location.href = '/orders'}
          >
            Ver mis pedidos
          </button>
        </div>
      </div>

      {/* Estilos CSS */}
      <style jsx>{`
        .checkout-success-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .success-content {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          overflow: hidden;
        }

        .receipt-section {
          padding: 40px;
          background: white;
        }

        .receipt-header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #eee;
        }

        .receipt-header h1 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 28px;
          font-weight: bold;
        }

        .receipt-header p {
          margin: 0;
          color: #666;
          font-size: 16px;
        }

        .order-summary {
          margin-bottom: 30px;
        }

        .order-info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }

        .info-row:last-child {
          border-bottom: none;
          margin-top: 10px;
          padding-top: 15px;
          border-top: 2px solid #dee2e6;
        }

        .label {
          font-weight: 600;
          color: #555;
        }

        .value {
          font-weight: 500;
          color: #333;
        }

        .total-amount {
          font-size: 18px;
          font-weight: bold;
          color: #28a745;
        }

        .status-section {
          text-align: center;
          margin-bottom: 20px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 15px 25px;
          border-radius: 50px;
          color: white;
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 15px;
        }

        .status-icon {
          font-size: 20px;
        }

        .status-description {
          color: #666;
          font-size: 14px;
          margin: 0;
        }

        .save-instructions {
          background: #f8f9fa;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #eee;
        }

        .save-instructions h2 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 20px;
        }

        .save-instructions p {
          margin: 0 0 20px 0;
          color: #666;
          font-size: 14px;
        }

        .save-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .save-button {
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .screenshot-btn {
          background: #17a2b8;
          color: white;
        }

        .screenshot-btn:hover {
          background: #138496;
          transform: translateY(-2px);
        }

        .pdf-btn {
          background: #dc3545;
          color: white;
        }

        .pdf-btn:hover:not(:disabled) {
          background: #c82333;
          transform: translateY(-2px);
        }

        .pdf-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .actions-section {
          padding: 30px;
          background: #f8f9fa;
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
          border-top: 1px solid #eee;
        }

        .primary-button {
          background: #007bff;
          color: white;
          border: none;
          padding: 15px 25px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .primary-button:hover {
          background: #0056b3;
          transform: translateY(-2px);
        }

        .secondary-button {
          background: #6c757d;
          color: white;
          border: none;
          padding: 15px 25px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .secondary-button:hover {
          background: #545b62;
          transform: translateY(-2px);
        }

        .loading-spinner {
          text-align: center;
          padding: 60px 20px;
          color: white;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255,255,255,0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-section {
          text-align: center;
          padding: 60px 40px;
          color: white;
        }

        .error-icon {
          font-size: 60px;
          margin-bottom: 20px;
        }

        .error-section h1 {
          margin: 0 0 15px 0;
          font-size: 24px;
        }

        .error-message {
          margin: 0 0 30px 0;
          font-size: 16px;
          opacity: 0.9;
        }

        .retry-button {
          background: #28a745;
          color: white;
          border: none;
          padding: 15px 25px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .retry-button:hover {
          background: #218838;
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .checkout-success-container {
            padding: 10px;
          }

          .receipt-section {
            padding: 20px;
          }

          .save-buttons {
            flex-direction: column;
          }

          .actions-section {
            flex-direction: column;
          }

          .save-button, .primary-button, .secondary-button {
            width: 100%;
            max-width: 300px;
            margin: 0 auto;
          }
        }
      `}</style>
    </div>
  );
};

export default Success;