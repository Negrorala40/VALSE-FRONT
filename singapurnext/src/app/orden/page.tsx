'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchBar from './components/SearchBar';
import OrderList from './components/OrderList';
import OrderDetails from './components/OrderDetails';
import LoginCheck from './components/LoginCheck';
import { orderService } from './services/orderService';
import { OrderDetailType } from './types/orderTypes';
import styles from './styles/orders.module.css';

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get('id');
  
  const [activeTab, setActiveTab] = useState('PENDIENTE');
  const [selectedOrder, setSelectedOrder] = useState<OrderDetailType | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Cargar orden cuando hay ?id= en la URL
  useEffect(() => {
    if (orderIdParam) {
      loadOrderDetails(Number(orderIdParam));
    } else {
      setSelectedOrder(null);
    }
  }, [orderIdParam]);

  const loadOrderDetails = async (orderId: number) => {
    setLoadingOrder(true);
    try {
      const orderData = await orderService.getOrderDetails(orderId);
      setSelectedOrder(orderData);
    } catch (error) {
      console.error('Error cargando orden:', error);
      setSelectedOrder(null);
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleOrderClick = (orderId: number) => {
    router.push(`/orden?id=${orderId}`);
  };

  const handleCloseDetails = () => {
    router.push('/orden');
  };

  const handleUpdateOrder = async () => {
    if (selectedOrder) {
      const updated = await orderService.getOrderDetails(selectedOrder.id);
      setSelectedOrder(updated);
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // Si estamos viendo detalles y cambiamos de tab, cerramos detalles
    if (orderIdParam) {
      router.push('/orden');
    }
  };

  const tabs = [
    { id: 'PENDIENTE', label: 'Pendientes' },
    { id: 'PAGO_APROBADO', label: 'Para Despacho' },
    { id: 'ENVIADO', label: 'En Tránsito' },
    { id: 'ENTREGADO', label: 'Entregadas' },
    { id: 'CANCELADO', label: 'Canceladas' },
    { id: '', label: 'Todas' },
  ];

  return (
    
    <div className={styles.container}>
      {/* Verificar autenticación */}
      <LoginCheck />
      
      <header className={styles.header}>
        <h1>Gestión de Órdenes</h1>
        <div className={styles.searchContainer}>
          <SearchBar />
        </div>
      </header>

      <nav className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className={styles.main}>
        {/* Mostrar detalles si hay ?id= en la URL */}
        {orderIdParam ? (
          <div>
            {loadingOrder ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Cargando orden #{orderIdParam}...</p>
              </div>
            ) : selectedOrder ? (
              <>
                <button 
                  onClick={handleCloseDetails}
                  className={styles.backButton}
                >
                  ← Volver a la lista
                </button>
                <OrderDetails
                  order={selectedOrder}
                  onUpdate={handleUpdateOrder}
                />
              </>
            ) : (
              <div className={styles.errorContainer}>
                <p>Orden #{orderIdParam} no encontrada</p>
                <button 
                  onClick={handleCloseDetails}
                  className={styles.backButton}
                >
                  ← Volver a la lista
                </button>
              </div>
            )}
          </div>
        ) : (
          // Mostrar lista si NO hay ?id= en la URL
          <OrderList
            statusFilter={activeTab || undefined}
            onOrderClick={handleOrderClick}
          />
        )}
      </main>
    </div>
  );
}