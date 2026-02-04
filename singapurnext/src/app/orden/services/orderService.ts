import { OrderListType, OrderDetailType } from '../types/orderTypes';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
const ORDERS_API = `${API_BASE}/api/admin/orders`;

// Obtener token del localStorage
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token') || 
           localStorage.getItem('token') || 
           localStorage.getItem('access_token') ||
           localStorage.getItem('jwt_token');
  }
  return null;
};

// Función para hacer fetch con autenticación (CORREGIDO)
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  
  // Usar Record<string, string> para evitar el error de TypeScript
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Agregar token si existe
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Combinar con headers existentes de options
  const finalHeaders = {
    ...headers,
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers: finalHeaders,
  });

  if (!response.ok) {
    // Si es error 401/403, redirigir a login
    if (response.status === 401 || response.status === 403) {
      console.error('Token expirado o no autorizado');
      if (typeof window !== 'undefined') {
        window.location.href = '/login?redirect=/orden';
      }
      throw new Error('No autorizado - Token expirado');
    }
    throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export const orderService = {
  // Verificar si hay token
  hasToken(): boolean {
    return getAuthToken() !== null;
  },

  // Obtener todas las órdenes
  async getAllOrders(): Promise<OrderListType[]> {
    try {
      if (!this.hasToken()) {
        console.warn('No hay token de autenticación');
        return [];
      }
      
      const data = await fetchAPI(ORDERS_API);
      return data.orders || [];
    } catch (error) {
      console.error('Error al obtener órdenes:', error);
      return [];
    }
  },

  // ... resto de métodos (igual que antes)
  async getOrdersByStatus(status: string): Promise<OrderListType[]> {
    try {
      if (!this.hasToken()) {
        console.warn('No hay token de autenticación');
        return [];
      }
      
      const data = await fetchAPI(`${ORDERS_API}/status/${status}`);
      return data.orders || [];
    } catch (error) {
      console.error(`Error al obtener órdenes ${status}:`, error);
      return [];
    }
  },

  async searchByEmail(email: string): Promise<OrderListType[]> {
    try {
      if (!this.hasToken()) {
        console.warn('No hay token de autenticación');
        return [];
      }
      
      const data = await fetchAPI(`${ORDERS_API}/search/email?email=${encodeURIComponent(email)}`);
      return data.orders || [];
    } catch (error) {
      console.error('Error en búsqueda por email:', error);
      return [];
    }
  },

  async searchOrders(searchTerm: string): Promise<OrderListType[]> {
    try {
      if (!this.hasToken()) {
        console.warn('No hay token de autenticación');
        return [];
      }
      
      const data = await fetchAPI(`${ORDERS_API}/search?q=${encodeURIComponent(searchTerm)}`);
      return data.orders || [];
    } catch (error) {
      console.error('Error en búsqueda general:', error);
      return [];
    }
  },

  async getOrderDetails(orderId: number): Promise<OrderDetailType | null> {
    try {
      if (!this.hasToken()) {
        console.warn('No hay token de autenticación');
        return null;
      }
      
      return await fetchAPI(`${ORDERS_API}/${orderId}`);
    } catch (error) {
      console.error('Error al obtener detalles de orden:', error);
      return null;
    }
  },

  async approvePayment(orderId: number, adminNotes?: string): Promise<OrderDetailType | null> {
    try {
      if (!this.hasToken()) {
        console.warn('No hay token de autenticación');
        return null;
      }
      
      const response = await fetchAPI(`${ORDERS_API}/${orderId}/approve-payment`, {
        method: 'POST',
        body: JSON.stringify({ adminNotes: adminNotes || '' }),
      });
      return response.order || null;
    } catch (error) {
      console.error('Error al aprobar pago:', error);
      return null;
    }
  },

  async markAsShipped(orderId: number, trackingNumber?: string): Promise<OrderDetailType | null> {
    try {
      if (!this.hasToken()) {
        console.warn('No hay token de autenticación');
        return null;
      }
      
      const response = await fetchAPI(`${ORDERS_API}/${orderId}/mark-as-shipped`, {
        method: 'POST',
        body: JSON.stringify({ trackingNumber: trackingNumber || '' }),
      });
      return response.order || null;
    } catch (error) {
      console.error('Error al marcar como enviado:', error);
      return null;
    }
  },

  async markAsDelivered(orderId: number): Promise<OrderDetailType | null> {
    try {
      if (!this.hasToken()) {
        console.warn('No hay token de autenticación');
        return null;
      }
      
      const response = await fetchAPI(`${ORDERS_API}/${orderId}/mark-as-delivered`, {
        method: 'POST',
      });
      return response.order || null;
    } catch (error) {
      console.error('Error al marcar como entregado:', error);
      return null;
    }
  },

  async cancelOrder(orderId: number, reason: string): Promise<OrderDetailType | null> {
    try {
      if (!this.hasToken()) {
        console.warn('No hay token de autenticación');
        return null;
      }
      
      const response = await fetchAPI(`${ORDERS_API}/${orderId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      return response.order || null;
    } catch (error) {
      console.error('Error al cancelar orden:', error);
      return null;
    }
  },
};