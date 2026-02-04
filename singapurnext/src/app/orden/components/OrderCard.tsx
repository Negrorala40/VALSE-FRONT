import { OrderListType } from '../types/orderTypes';
import StatusBadge from './StatusBadge';
import styles from '../styles/orders.module.css';

interface OrderCardProps {
  order: OrderListType;
  onClick: (orderId: number) => void;
}

export default function OrderCard({ order, onClick }: OrderCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className={styles.orderCard} onClick={() => onClick(order.id)}>
      <div className={styles.cardHeader}>
        <div className={styles.orderId}>Orden #{order.id}</div>
        <StatusBadge status={order.status} />
      </div>
      
      <div className={styles.cardContent}>
        <div className={styles.customerInfo}>
          <div className={styles.customerName}>{order.customerName}</div>
          <div className={styles.customerEmail}>{order.customerEmail}</div>
          {order.customerPhone && (
            <div className={styles.customerPhone}>📞 {order.customerPhone}</div>
          )}
        </div>
        
        <div className={styles.orderInfo}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Fecha:</span>
            <span className={styles.infoValue}>{formatDate(order.orderDate)}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Productos:</span>
            <span className={styles.infoValue}>{order.totalItems} items</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Total:</span>
            <span className={styles.infoValue}>{formatPrice(order.totalPrice)}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Método:</span>
            <span className={styles.infoValue}>{order.paymentMethod || 'N/A'}</span>
          </div>
        </div>
        
        {order.productSummary && (
          <div className={styles.productSummary}>
            <span className={styles.summaryLabel}>Producto:</span>
            <span>{order.productSummary}</span>
          </div>
        )}
      </div>
      
      <div className={styles.cardFooter}>
        <span className={styles.viewDetails}>Ver detalles →</span>
      </div>
    </div>
  );
}