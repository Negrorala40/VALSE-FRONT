import { OrderStatus } from '../types/orderTypes';
import styles from '../styles/orders.module.css';

interface StatusBadgeProps {
  status: OrderStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'PENDIENTE': return '#f59e0b'; // amber-500
      case 'PAGO_APROBADO': return '#10b981'; // emerald-500
      case 'ENVIADO': return '#3b82f6'; // blue-500
      case 'ENTREGADO': return '#8b5cf6'; // violet-500
      case 'CANCELADO': return '#ef4444'; // red-500
      default: return '#6b7280'; // gray-500
    }
  };

  return (
    <span 
      className={styles.statusBadge}
      style={{ backgroundColor: getStatusColor() }}
    >
      {status}
    </span>
  );
}