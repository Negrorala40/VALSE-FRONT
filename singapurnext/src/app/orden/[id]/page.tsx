'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../orden.module.css';

interface Order {
  id: number;
  totalPrice: number;
  status: string;
  customerEmail: string;
  customerName?: string;
  orderDate: string;
  updatedAt?: string;
  stockReservedAt?: string;
  stockReservationExpired?: boolean;
  mercadoPagoPaymentId?: string;
  mercadoPagoStatus?: string;
  paymentMethod?: string;
  cancellationReason?: string;
  shippingAddress?: {
    address: string;
    city: string;
    state: string;
    country: string;
  };
  orderItems: Array<{
    id: number;
    quantity: number;
    price: number;
    productName: string;
    variantName?: string;
  }>;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Usar directamente la URL base como en tu Api.ts
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://backendamarte-production.up.railway.app';

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      // 🔴 USAR EL ENDPOINT CORRECTO que existe en tu backend
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      }
    } catch (error) {
      console.error('Error al cargar orden:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string, reason?: string) => {
    setUpdating(true);
    try {
      const token = getToken();
      
      // 🔴 USAR EL ENDPOINT CORRECTO del PaymentController
      const response = await fetch(`${API_BASE_URL}/api/payments/admin/change-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Admin-Token': 'ADMIN_SECRET_TOKEN', // Necesitas este header según tu backend
        },
        body: JSON.stringify({ 
          orderId: parseInt(orderId), 
          status: newStatus,
          reason 
        }),
      });

      if (response.ok) {
        fetchOrder();
        alert('Estado actualizado correctamente');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'No se pudo actualizar el estado'}`);
      }
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      alert('Error al actualizar el estado');
    } finally {
      setUpdating(false);
    }
  };

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={styles.orderDetailContainer}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Cargando orden...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={styles.orderDetailContainer}>
        <div className={styles.orderNotFound}>
          <h2>Orden no encontrada</h2>
          <Link href="/orden" className={styles.backLink}>
            ← Volver al listado de órdenes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.orderDetailContainer}>
      {/* Navegación */}
      <div className={styles.orderNavigation}>
        <Link href="/orden" className={styles.backLink}>
          ← Volver al listado
        </Link>
      </div>

      {/* Header */}
      <div className={styles.orderHeader}>
        <div className={styles.orderTitleSection}>
          <h1>Orden #{order.id}</h1>
          <p className={styles.customerEmail}>{order.customerEmail}</p>
        </div>
        <div className={styles.orderStatusSection}>
          <span className={`${styles.statusBadge} ${styles.large} ${styles[getStatusClass(order.status)]}`}>
            {getStatusText(order.status)}
          </span>
          <p className={styles.orderDate}>{formatDate(order.orderDate)}</p>
        </div>
      </div>

      <div className={styles.orderContent}>
        {/* Información principal */}
        <div className={styles.orderGrid}>
          {/* Información del cliente */}
          <div className={styles.infoCard}>
            <h2>Información del Cliente</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email:</span>
                <span className={styles.infoValue}>{order.customerEmail}</span>
              </div>
              {order.customerName && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Nombre:</span>
                  <span className={styles.infoValue}>{order.customerName}</span>
                </div>
              )}
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Fecha de orden:</span>
                <span className={styles.infoValue}>{formatDate(order.orderDate)}</span>
              </div>
              {order.updatedAt && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Última actualización:</span>
                  <span className={styles.infoValue}>{formatDate(order.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Información de pago */}
          <div className={styles.infoCard}>
            <h2>Información de Pago</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Total:</span>
                <span className={`${styles.infoValue} ${styles.totalPrice}`}>{formatCurrency(order.totalPrice)}</span>
              </div>
              {order.mercadoPagoPaymentId && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>ID de pago MP:</span>
                  <span className={`${styles.infoValue} ${styles.code}`}>{order.mercadoPagoPaymentId}</span>
                </div>
              )}
              {order.paymentMethod && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Método de pago:</span>
                  <span className={styles.infoValue}>{order.paymentMethod}</span>
                </div>
              )}
              {order.mercadoPagoStatus && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Estado MP:</span>
                  <span className={`${styles.infoValue} ${styles.status} ${order.mercadoPagoStatus === 'approved' ? styles.mpApproved : styles.mpPending}`}>
                    {order.mercadoPagoStatus}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Productos */}
        <div className={styles.productsSection}>
          <h2>Productos ({order.orderItems.length})</h2>
          <div className={styles.productsList}>
            {order.orderItems.map((item) => (
              <div key={item.id} className={styles.productCard}>
                <div className={styles.productInfo}>
                  <h3>{item.productName}</h3>
                  {item.variantName && (
                    <p className={styles.variantName}>{item.variantName}</p>
                  )}
                  <div className={styles.productMeta}>
                    <span className={styles.productQuantity}>{item.quantity} unidades</span>
                    <span className={styles.productUnitPrice}>
                      {formatCurrency(item.price / item.quantity)} c/u
                    </span>
                  </div>
                </div>
                <div className={styles.productTotal}>
                  {formatCurrency(item.price)}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.orderSummary}>
            <span className={styles.summaryLabel}>Total de la orden:</span>
            <span className={styles.summaryValue}>{formatCurrency(order.totalPrice)}</span>
          </div>
        </div>

        {/* Información adicional */}
        <div className={styles.additionalInfoGrid}>
          {/* Dirección de envío */}
          {order.shippingAddress && (
            <div className={styles.infoCard}>
              <h2>Dirección de Envío</h2>
              <div className={styles.addressInfo}>
                <p>{order.shippingAddress.address}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>
          )}

          {/* Información de reserva */}
          {order.stockReservedAt && (
            <div className={styles.infoCard}>
              <h2>Información de Reserva</h2>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Reservado el:</span>
                  <span className={styles.infoValue}>{formatDate(order.stockReservedAt)}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Reserva expirada:</span>
                  <span className={`${styles.infoValue} ${order.stockReservationExpired ? styles.expired : styles.active}`}>
                    {order.stockReservationExpired ? 'Sí' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Razón de cancelación */}
          {order.cancellationReason && (
            <div className={`${styles.infoCard} ${styles.warning}`}>
              <h2>Razón de Cancelación</h2>
              <p className={styles.cancellationReason}>{order.cancellationReason}</p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className={styles.orderActionsSection}>
          <h2>Acciones</h2>
          <div className={styles.actionsGrid}>
            {order.status === 'PAGO_APROBADO' && (
              <button
                onClick={() => updateOrderStatus('ENVIADO', 'Enviado por administrador')}
                disabled={updating}
                className={`${styles.actionButton} ${styles.send}`}
              >
                {updating ? 'Procesando...' : 'Marcar como Enviado'}
              </button>
            )}
            {order.status === 'ENVIADO' && (
              <button
                onClick={() => updateOrderStatus('ENTREGADO', 'Entregado al cliente')}
                disabled={updating}
                className={`${styles.actionButton} ${styles.deliver}`}
              >
                {updating ? 'Procesando...' : 'Marcar como Entregado'}
              </button>
            )}
            {(order.status === 'PENDIENTE' || order.status === 'PAGO_RECHAZADO') && (
              <button
                onClick={() => updateOrderStatus('CANCELADO', 'Cancelado manualmente por administrador')}
                disabled={updating}
                className={`${styles.actionButton} ${styles.cancel}`}
              >
                {updating ? 'Procesando...' : 'Cancelar Orden'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Helper functions
  function getStatusClass(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'statusPendiente';
      case 'PAGO_APROBADO': return 'statusAprobado';
      case 'PAGO_RECHAZADO': return 'statusRechazado';
      case 'CANCELADO': return 'statusCancelado';
      case 'ENVIADO': return 'statusEnviado';
      case 'ENTREGADO': return 'statusEntregado';
      default: return 'statusPendiente';
    }
  }

  function getStatusText(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'Pendiente';
      case 'PAGO_APROBADO': return 'Pago Aprobado';
      case 'PAGO_RECHAZADO': return 'Pago Rechazado';
      case 'CANCELADO': return 'Cancelado';
      case 'ENVIADO': return 'Enviado';
      case 'ENTREGADO': return 'Entregado';
      default: return status;
    }
  }
}