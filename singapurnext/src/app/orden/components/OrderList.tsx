'use client';

import { useState, useEffect } from 'react';
import { OrderListType } from '../types/orderTypes';
import { orderService } from '../services/orderService';
import OrderCard from './OrderCard';
import styles from '../styles/orders.module.css';

interface OrderListProps {
  statusFilter?: string;
  searchTerm?: string;
  onOrderClick: (orderId: number) => void;
}

export default function OrderList({ statusFilter, searchTerm, onOrderClick }: OrderListProps) {
  const [orders, setOrders] = useState<OrderListType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, searchTerm]);

  const loadOrders = async () => {
    setLoading(true);
    
    try {
      let ordersData: OrderListType[] = [];
      
      if (searchTerm && searchTerm.trim() !== '') {
        // Verificar si es un email para usar el endpoint específico
        const isEmail = searchTerm.includes('@');
        if (isEmail) {
          ordersData = await orderService.searchByEmail(searchTerm);
        } else {
          ordersData = await orderService.searchOrders(searchTerm);
        }
      } else if (statusFilter) {
        ordersData = await orderService.getOrdersByStatus(statusFilter);
      } else {
        ordersData = await orderService.getAllOrders();
      }
      
      setOrders(ordersData);
    } catch (err) {
      console.error('Error cargando órdenes:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando órdenes...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <p>No se encontraron órdenes</p>
      </div>
    );
  }

  return (
    <div className={styles.orderList}>
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onClick={onOrderClick}
        />
      ))}
    </div>
  );
}