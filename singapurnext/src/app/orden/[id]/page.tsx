'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { OrderDetailType } from '../types/orderTypes';
import { orderService } from '../services/orderService';
import OrderDetails from '../components/OrderDetails';
import styles from '../styles/orders.module.css';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = Number(params.id);
  
  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);
    
    try {
      const orderData = await orderService.getOrderDetails(orderId);
      setOrder(orderData);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando orden...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={styles.errorContainer}>
        <p>Orden no encontrada</p>
        <button 
          onClick={() => router.push('/orden')}
          className={styles.backButton}
        >
          Volver a órdenes
        </button>
      </div>
    );
  }

  return (
    <div className={styles.detailPage}>
      <button 
        onClick={() => router.push('/orden')}
        className={styles.backButton}
      >
        ← Volver a órdenes
      </button>
      
      <div className={styles.detailContent}>
        <OrderDetails
          order={order}
          onUpdate={loadOrder}
        />
      </div>
    </div>
  );
}