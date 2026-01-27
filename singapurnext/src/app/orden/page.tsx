'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './orden.module.css';

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
  orderItems: Array<{
    id: number;
    quantity: number;
    price: number;
    productName: string;
    variantName?: string;
  }>;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Usar directamente la URL base como en tu Api.ts
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://backendamarte-production.up.railway.app';

  // Obtener token del localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  // Formatear fecha
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

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Cargar órdenes - USAR EL ENDPOINT CORRECTO: /api/orders/my-orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      // 🔴 USAR EL ENDPOINT CORRECTO que existe en tu backend
      const response = await fetch(`${API_BASE_URL}/api/orders/my-orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        console.error('Error al cargar órdenes:', response.status);
      }
    } catch (error) {
      console.error('Error al cargar órdenes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar órdenes
  const filteredOrders = orders.filter(order => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesId = order.id.toString().includes(search);
      const matchesEmail = order.customerEmail.toLowerCase().includes(search);
      const matchesName = order.customerName?.toLowerCase().includes(search) || false;
      if (!matchesId && !matchesEmail && !matchesName) return false;
    }
    
    if (statusFilter && order.status !== statusFilter) {
      return false;
    }
    
    return true;
  });

  // Calcular estadísticas
  const stats = {
    total: orders.length,
    pendiente: orders.filter(o => o.status === 'PENDIENTE').length,
    aprobado: orders.filter(o => o.status === 'PAGO_APROBADO').length,
    cancelado: orders.filter(o => o.status === 'CANCELADO').length,
    totalRevenue: orders
      .filter(o => o.status === 'PAGO_APROBADO' || o.status === 'ENVIADO' || o.status === 'ENTREGADO')
      .reduce((sum, o) => sum + o.totalPrice, 0)
  };

  // Cargar órdenes al iniciar
  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className={styles.adminOrdersContainer}>
      {/* Header */}
      <header className={styles.adminHeader}>
        <h1>Panel de Administración de Órdenes</h1>
        <p>Gestiona todas las órdenes del sistema</p>
      </header>

      {/* Estadísticas */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.total}`}>
          <div className={styles.statIcon}>📋</div>
          <div className={styles.statInfo}>
            <h3>Total Órdenes</h3>
            <p className={styles.statValue}>{stats.total}</p>
          </div>
        </div>
        
        <div className={`${styles.statCard} ${styles.pending}`}>
          <div className={styles.statIcon}>⏳</div>
          <div className={styles.statInfo}>
            <h3>Pendientes</h3>
            <p className={styles.statValue}>{stats.pendiente}</p>
          </div>
        </div>
        
        <div className={`${styles.statCard} ${styles.approved}`}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statInfo}>
            <h3>Aprobadas</h3>
            <p className={styles.statValue}>{stats.aprobado}</p>
          </div>
        </div>
        
        <div className={`${styles.statCard} ${styles.revenue}`}>
          <div className={styles.statIcon}>💰</div>
          <div className={styles.statInfo}>
            <h3>Ingresos</h3>
            <p className={styles.statValue}>{formatCurrency(stats.totalRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filtersSection}>
        <div className={styles.filtersGrid}>
          <div className={styles.filterGroup}>
            <label>Buscar (ID, Email o Nombre)</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar órdenes..."
              className={styles.searchInput}
            />
          </div>
          
          <div className={styles.filterGroup}>
            <label>Filtrar por Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.statusSelect}
            >
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="PAGO_APROBADO">Pago Aprobado</option>
              <option value="PAGO_RECHAZADO">Pago Rechazado</option>
              <option value="CANCELADO">Cancelado</option>
              <option value="ENVIADO">Enviado</option>
              <option value="ENTREGADO">Entregado</option>
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <button onClick={fetchOrders} className={styles.refreshButton}>
              ↻ Actualizar
            </button>
            <button 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
              }} 
              className={styles.clearButton}
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de órdenes */}
      <div className={styles.ordersTableContainer}>
        {loading ? (
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
            <p>Cargando órdenes...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className={styles.noOrders}>
            <p>No se encontraron órdenes</p>
          </div>
        ) : (
          <table className={styles.ordersTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className={styles.orderId}>#{order.id}</td>
                  <td className={styles.customerInfo}>
                    <div className={styles.customerEmail}>{order.customerEmail}</div>
                    {order.customerName && (
                      <div className={styles.customerName}>{order.customerName}</div>
                    )}
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[getStatusClass(order.status)]}`}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className={styles.orderTotal}>{formatCurrency(order.totalPrice)}</td>
                  <td className={styles.orderDate}>{formatDate(order.orderDate)}</td>
                  <td className={styles.orderActions}>
                    <Link href={`/orden/${order.id}`} className={styles.viewButton}>
                      Ver detalles
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {!loading && filteredOrders.length > 0 && (
          <div className={styles.tableFooter}>
            <p>Mostrando {filteredOrders.length} de {orders.length} órdenes</p>
          </div>
        )}
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