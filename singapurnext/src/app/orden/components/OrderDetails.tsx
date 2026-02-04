'use client';

import { useState } from 'react';
import { OrderDetailType } from '../types/orderTypes';
import { orderService } from '../services/orderService';
import StatusBadge from './StatusBadge';
import styles from '../styles/orders.module.css';

interface OrderDetailsProps {
  order: OrderDetailType;
  onUpdate: () => void;
}

export default function OrderDetails({ order, onUpdate }: OrderDetailsProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleStatusChange = async (action: string) => {
    setLoading(true);
    
    try {
      let updatedOrder: OrderDetailType | null = null;
      
      switch (action) {
        case 'approve':
          updatedOrder = await orderService.approvePayment(order.id, adminNotes);
          break;
        case 'ship':
          updatedOrder = await orderService.markAsShipped(order.id, trackingNumber);
          break;
        case 'deliver':
          updatedOrder = await orderService.markAsDelivered(order.id);
          break;
        case 'cancel':
          updatedOrder = await orderService.cancelOrder(order.id, cancelReason);
          break;
      }
      
      if (updatedOrder) {
        onUpdate();
        setTrackingNumber('');
        setCancelReason('');
        setAdminNotes('');
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const canApprove = order.status === 'PENDIENTE';
  const canShip = order.status === 'PAGO_APROBADO';
  const canDeliver = order.status === 'ENVIADO';
  const canCancel = ['PENDIENTE', 'PAGO_APROBADO'].includes(order.status);

  return (
    <div className={styles.orderDetails}>
      <div className={styles.detailsHeader}>
        <div>
          <h2>Orden #{order.id}</h2>
          <p className={styles.orderDate}>
            {formatDate(order.orderDate)}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Información del cliente */}
      <div className={styles.section}>
        <h3>Información del Cliente</h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Email:</span>
            <span className={styles.infoValue}>{order.customerEmail}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Nombre:</span>
            <span className={styles.infoValue}>{order.customerName}</span>
          </div>
          {order.customerPhone && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Teléfono:</span>
              <span className={styles.infoValue}>{order.customerPhone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dirección */}
      <div className={styles.section}>
        <h3>Dirección de Envío</h3>
        <div className={styles.addressInfo}>
          <p>{order.shippingAddress}</p>
          <p>{order.shippingCity}, {order.shippingState}</p>
          <p>{order.shippingCountry}</p>
        </div>
      </div>

      {/* Información de pago */}
      <div className={styles.section}>
        <h3>Información de Pago</h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Método:</span>
            <span className={styles.infoValue}>{order.paymentMethod}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>ID MercadoPago:</span>
            <span className={styles.infoValue}>{order.mercadoPagoPaymentId || 'N/A'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Estado MP:</span>
            <span className={styles.infoValue}>{order.mercadoPagoStatus || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Productos */}
      <div className={styles.section}>
        <h3>Productos ({order.items.length})</h3>
        <div className={styles.itemsList}>
          {order.items.map((item) => (
            <div key={item.id} className={styles.itemCard}>
              {item.imageUrl && (
                <img 
                  src={item.imageUrl} 
                  alt={item.productName}
                  className={styles.itemImage}
                />
              )}
              <div className={styles.itemInfo}>
                <h4>{item.productName}</h4>
                <p className={styles.itemDescription}>{item.productDescription}</p>
                <div className={styles.itemDetails}>
                  <span>Color: {item.color}</span>
                  <span>Talla: {item.size}</span>
                  <span>SKU: {item.sku}</span>
                  <span>Cantidad: {item.quantity}</span>
                </div>
                <div className={styles.itemPrice}>
                  <span>Precio unitario: {formatPrice(item.finalPrice)}</span>
                  <span>Total: {formatPrice(item.totalFinalPrice)}</span>
                </div>
                {item.discountPercentage > 0 && (
                  <div className={styles.discountInfo}>
                    <span className={styles.discountBadge}>
                      Descuento: {item.discountPercentage}%
                    </span>
                    <span>Descuento: {formatPrice(item.discountAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen */}
      <div className={styles.section}>
        <h3>Resumen</h3>
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>Subtotal:</span>
            <span>{formatPrice(order.subtotalWithoutDiscount)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Descuento total:</span>
            <span>-{formatPrice(order.totalDiscount)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Total:</span>
            <strong>{formatPrice(order.totalPrice)}</strong>
          </div>
        </div>
      </div>

      {/* Cambiar estado */}
      <div className={styles.section}>
        <h3>Gestionar Estado</h3>
        <div className={styles.statusActions}>
          
          {/* Aprobar pago (PENDIENTE → PAGO_APROBADO) */}
          {canApprove && (
            <div className={styles.actionGroup}>
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Notas para la aprobación (opcional)"
                className={styles.inputField}
              />
              <button
                onClick={() => handleStatusChange('approve')}
                disabled={loading}
                className={`${styles.actionButton} ${styles.approveButton}`}
              >
                Aprobar Pago Manualmente
              </button>
            </div>
          )}
          
          {/* Marcar como enviado (PAGO_APROBADO → ENVIADO) */}
          {canShip && (
            <div className={styles.actionGroup}>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Número de seguimiento (opcional)"
                className={styles.inputField}
              />
              <button
                onClick={() => handleStatusChange('ship')}
                disabled={loading}
                className={`${styles.actionButton} ${styles.shipButton}`}
              >
                Marcar como Enviado
              </button>
            </div>
          )}
          
          {/* Marcar como entregado (ENVIADO → ENTREGADO) */}
          {canDeliver && (
            <button
              onClick={() => handleStatusChange('deliver')}
              disabled={loading}
              className={`${styles.actionButton} ${styles.deliverButton}`}
            >
              Marcar como Entregado
            </button>
          )}
          
          {/* Cancelar orden */}
          {canCancel && (
            <div className={styles.actionGroup}>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Motivo de cancelación (requerido)"
                className={styles.inputField}
                required
              />
              <button
                onClick={() => handleStatusChange('cancel')}
                disabled={loading || !cancelReason.trim()}
                className={`${styles.actionButton} ${styles.cancelButton}`}
              >
                Cancelar Orden
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Información adicional */}
      {order.cancellationReason && (
        <div className={styles.section}>
          <h3>Razón de Cancelación</h3>
          <p className={styles.cancellationReason}>{order.cancellationReason}</p>
        </div>
      )}
    </div>
  );
}