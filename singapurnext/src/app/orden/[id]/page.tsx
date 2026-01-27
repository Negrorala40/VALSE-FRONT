'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../orden.module.css';

// ✅ INTERFAZ ACTUALIZADA para los DTOs del backend
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
  
  // ✅ CAMBIO: Ahora es string, no objeto
  shippingAddress?: string;
  
  orderItems: Array<{
    id: number;
    quantity: number;
    price: number;
    productName: string;
    variantInfo?: string;  // ✅ CAMBIO: variantName → variantInfo
  }>;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

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

      // ✅ USAR EL ENDPOINT CORRECTO
      const response = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Datos recibidos:', data); // Para debug
        setOrder(data);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      } else if (response.status === 403) {
        alert('No tienes permisos de administrador');
        router.push('/orden');
      }
    } catch (error) {
      console.error('Error al cargar orden:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN SIMPLE: Solo PAGO_APROBADO → ENVIADO
  const markAsShipped = async () => {
    setUpdating(true);
    try {
      const token = getToken();
      
      const response = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}/mark-as-shipped`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert('Orden marcada como enviada');
        fetchOrder(); // Recargar datos
      } else {
        const error = await response.text();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar el estado');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No disponible';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // ✅ Función para parsear la dirección string
  const parseAddress = (addressString?: string) => {
    if (!addressString) return null;
    
    // La dirección viene como: "Calle 123, Ciudad, Estado, País"
    const parts = addressString.split(', ');
    
    return {
      address: parts[0] || '',
      city: parts[1] || '',
      state: parts[2] || '',
      country: parts[3] || '',
      full: addressString
    };
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

  // ✅ Parsear la dirección
  const parsedAddress = parseAddress(order.shippingAddress);

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
              {order.customerName && order.customerName.trim() && (
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
                <span className={`${styles.infoValue} ${styles.totalPrice}`}>
                  {formatCurrency(order.totalPrice)}
                </span>
              </div>
              {order.mercadoPagoPaymentId && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>ID de pago MP:</span>
                  <span className={`${styles.infoValue} ${styles.code}`}>
                    {order.mercadoPagoPaymentId}
                  </span>
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
                  {item.variantInfo && item.variantInfo.trim() && (
                    <p className={styles.variantName}>
                      Variante: {item.variantInfo}
                    </p>
                  )}
                  <div className={styles.productMeta}>
                    <span className={styles.productQuantity}>
                      {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'}
                    </span>
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
            <span className={styles.summaryValue}>
              {formatCurrency(order.totalPrice)}
            </span>
          </div>
        </div>

        {/* Información adicional */}
        <div className={styles.additionalInfoGrid}>
          {/* ✅ Dirección de envío (ahora con string) */}
          {parsedAddress && (
            <div className={styles.infoCard}>
              <h2>Dirección de Envío</h2>
              <div className={styles.addressInfo}>
                <p>{parsedAddress.address}</p>
                <p>{parsedAddress.city}, {parsedAddress.state}</p>
                <p>{parsedAddress.country}</p>
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
                  <span className={styles.infoValue}>
                    {formatDate(order.stockReservedAt)}
                  </span>
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

        {/* ✅ ACCIÓN ÚNICA Y SIMPLE: Solo PAGO_APROBADO → ENVIADO */}
        <div className={styles.orderActionsSection}>
          <h2>Acciones</h2>
          <div className={styles.actionsGrid}>
            {order.status === 'PAGO_APROBADO' ? (
              <button
                onClick={markAsShipped}
                disabled={updating}
                className={`${styles.actionButton} ${styles.send}`}
              >
                {updating ? 'Procesando...' : 'Marcar como Enviado'}
              </button>
            ) : order.status === 'ENVIADO' ? (
              <div className={styles.infoMessage}>
                <p>✅ Esta orden ya fue marcada como enviada</p>
                <small>Estado actual: {getStatusText(order.status)}</small>
              </div>
            ) : (
              <div className={styles.infoMessage}>
                <p>⏳ Esta orden no puede ser enviada</p>
                <small>Solo órdenes con estado PAGO_APROBADO pueden ser enviadas</small>
              </div>
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