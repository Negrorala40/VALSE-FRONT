'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './orden.module.css';

// ✅ INTERFAZ ACTUALIZADA para DTOs del listado
interface Order {
  id: number;
  totalPrice: number;
  status: string;
  customerEmail: string;
  customerName?: string;
  orderDate: string;
  paymentMethod?: string;  // ✅ Agregar esto
  createdAt: string;       // ✅ Agregar esto
  itemCount: number;       // ✅ Agregar esto (reemplaza orderItems)
  
  // ❌ ELIMINAR esto (el DTO de listado NO trae orderItems ni shippingAddress)
  // orderItems: Array<{
  //   id: number;
  //   quantity: number;
  //   price: number;
  //   productName: string;
  // }>;
  // shippingAddress?: {
  //   address: string;
  //   city: string;
  //   state: string;
  // };
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://backendamarte-production.up.railway.app';

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  const formatDate = (dateString: string) => {
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

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Órdenes recibidas:', data); // Para debug
        setOrders(data);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      } else if (response.status === 403) {
        console.error('Acceso denegado - No tienes permisos de administrador');
        router.push('/dashboard');
      } else {
        console.error('Error al cargar órdenes:', response.status);
      }
    } catch (error) {
      console.error('Error al cargar órdenes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Marcar como enviada
  const handleMarkAsShipped = async (orderId: number) => {
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
        alert('Orden marcada como enviada correctamente');
        fetchOrders(); // Recargar la lista
      } else {
        const error = await response.text();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      console.error('Error al marcar como enviada:', error);
      alert('Error al marcar como enviada');
    }
  };

  const filteredOrders = orders.filter(order => {
    const search = searchTerm.toLowerCase();
    const matchesId = order.id.toString().includes(search);
    const matchesEmail = order.customerEmail.toLowerCase().includes(search);
    const matchesName = order.customerName?.toLowerCase().includes(search) || false;
    
    if (searchTerm && !matchesId && !matchesEmail && !matchesName) return false;
    if (statusFilter && order.status !== statusFilter) return false;
    
    return true;
  });

  // ✅ ESTADÍSTICAS ACTUALIZADAS (sin usar orderItems)
  const stats = {
    total: orders.length,
    pendiente: orders.filter(o => o.status === 'PENDIENTE').length,
    aprobado: orders.filter(o => o.status === 'PAGO_APROBADO').length,
    enviado: orders.filter(o => o.status === 'ENVIADO').length,
    entregado: orders.filter(o => o.status === 'ENTREGADO').length,
    rechazado: orders.filter(o => o.status === 'PAGO_RECHAZADO').length,
    cancelado: orders.filter(o => o.status === 'CANCELADO').length,
    totalRevenue: orders
      .filter(o => ['PAGO_APROBADO', 'ENVIADO', 'ENTREGADO'].includes(o.status))
      .reduce((sum, o) => sum + o.totalPrice, 0)
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusClass = (status: string) => {
    const statusMap: Record<string, string> = {
      'PENDIENTE': 'statusPendiente',
      'PAGO_APROBADO': 'statusAprobado',
      'PAGO_RECHAZADO': 'statusRechazado',
      'CANCELADO': 'statusCancelado',
      'ENVIADO': 'statusEnviado',
      'ENTREGADO': 'statusEntregado',
    };
    return statusMap[status] || 'statusPendiente';
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'PENDIENTE': 'Pendiente',
      'PAGO_APROBADO': 'Pago Aprobado',
      'PAGO_RECHAZADO': 'Pago Rechazado',
      'CANCELADO': 'Cancelado',
      'ENVIADO': 'Enviado',
      'ENTREGADO': 'Entregado',
    };
    return statusMap[status] || status;
  };

  return (
    <div className={styles.adminOrdersContainer}>
      {/* Header con navegación */}
      <header className={styles.adminHeader}>
        <div className={styles.headerContent}>
          <div>
            <h1>Panel de Administración</h1>
            <p>Gestiona todas las órdenes del sistema</p>
          </div>
          <div className={styles.navButtons}>
            <button 
              className={styles.navButton}
              onClick={() => navigateTo('/perfil')}
            >
              <span className={styles.buttonIcon}>👤</span>
              Perfil
            </button>
            <button 
              className={styles.navButton}
              onClick={() => navigateTo('/meta')}
            >
              <span className={styles.buttonIcon}>🎯</span>
              Meta
            </button>
            <button 
              className={styles.navButton}
              onClick={() => navigateTo('/orden')}
            >
              <span className={styles.buttonIcon}>📦</span>
              Órdenes
            </button>
            <button 
              className={styles.navButton}
              onClick={() => navigateTo('/admin/blog')}
            >
              <span className={styles.buttonIcon}>📝</span>
              Blog
            </button>
          </div>
        </div>
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
                    {order.customerName && order.customerName.trim() && (
                      <div className={styles.customerName}>{order.customerName}</div>
                    )}
                    {/* ✅ Mostrar cantidad de productos si está disponible */}
                    {order.itemCount !== undefined && (
                      <div className={styles.itemCount}>
                        {order.itemCount} {order.itemCount === 1 ? 'producto' : 'productos'}
                      </div>
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
                    {order.status === 'PAGO_APROBADO' && (
                      <button 
                        onClick={() => handleMarkAsShipped(order.id)}
                        className={styles.shipButton}
                      >
                        Marcar enviada
                      </button>
                    )}
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
}