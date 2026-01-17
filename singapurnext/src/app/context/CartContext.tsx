'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { 
  ADD_TO_CART, 
  CLEAR_CART, 
  CART, 
  GET_CART_COUNT, 
  MIGRATE_CART 
} from '../utils/Api';

interface CartItem {
  id: number;
  quantity: number;
  productVariantId: number;
  productName: string;
  color: string;
  size: string;
  price: number;
  totalPrice: number;
  imageUrl: string;
}

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  loading: boolean;
  addToCart: (productVariantId: number, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: number) => Promise<void>;
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getCart: () => Promise<void>;
  migrateCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser usado dentro de CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Constante para header
  const CART_SESSION_HEADER = 'X-Cart-Session-Id';

  // Obtener sessionId desde localStorage
  const getSessionId = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cartSessionId');
    }
    return null;
  };

  // Guardar sessionId desde headers de respuesta
  const saveSessionIdFromHeaders = (headers: Headers) => {
    const sessionId = headers.get(CART_SESSION_HEADER);
    if (sessionId && sessionId !== 'cleared') {
      localStorage.setItem('cartSessionId', sessionId);
    } else if (sessionId === 'cleared') {
      localStorage.removeItem('cartSessionId');
    }
  };

  // Configurar headers para todas las peticiones
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    const sessionId = getSessionId();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Agregar sessionId en header si existe
    if (sessionId) {
      headers[CART_SESSION_HEADER] = sessionId;
    }

    // Agregar token de autenticación si existe
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  };

  // Función de fetch con manejo de sessionId
  const fetchWithSession = async (url: string, options: RequestInit = {}) => {
    const headers = getHeaders();
    
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // IMPORTANTE para cookies
      headers: {
        ...headers,
        ...options.headers
      }
    });

    // Guardar sessionId si viene en la respuesta
    saveSessionIdFromHeaders(response.headers);

    return response;
  };

  // Obtener carrito
  const getCart = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithSession(CART);
      
      if (response.status === 404 || response.status === 400) {
        // Carrito vacío - normal
        setCartItems([]);
        setCartCount(0);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setCartItems(data);
      
      // Obtener contador
      const countResponse = await fetchWithSession(GET_CART_COUNT);
      if (countResponse.ok) {
        const countData = await countResponse.json();
        setCartCount(countData.count || 0);
      }
      
    } catch (error: any) {
      console.error('Error obteniendo carrito:', error);
      if (error.message?.includes('404') || error.message?.includes('400')) {
        setCartItems([]);
        setCartCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Refrescar carrito (para uso externo)
  const refreshCart = async () => {
    await getCart();
  };

  // Agregar al carrito
  const addToCart = async (productVariantId: number, quantity: number) => {
    try {
      const payload = { productVariantId, quantity };

      const response = await fetchWithSession(ADD_TO_CART, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Actualizar carrito después de agregar
      await getCart();
      
      return data;
    } catch (error) {
      console.error('Error agregando al carrito:', error);
      throw error;
    }
  };

  // Eliminar del carrito
  const removeFromCart = async (cartItemId: number) => {
    try {
      const response = await fetchWithSession(`${CART}/remove/${cartItemId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await getCart();
    } catch (error: any) {
      console.error('Error eliminando del carrito:', error);
      throw error;
    }
  };

  // Actualizar cantidad
  const updateQuantity = async (cartItemId: number, quantity: number) => {
    try {
      const response = await fetchWithSession(`${CART}/update/${cartItemId}?quantity=${quantity}`, {
        method: 'PUT'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await getCart();
    } catch (error: any) {
      console.error('Error actualizando cantidad:', error);
      throw error;
    }
  };

  // Vaciar carrito
  const clearCart = async () => {
    try {
      const response = await fetchWithSession(CLEAR_CART, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setCartItems([]);
      setCartCount(0);
    } catch (error: any) {
      console.error('Error vaciando carrito:', error);
      throw error;
    }
  };

  // Migrar carrito anónimo a usuario autenticado
  const migrateCart = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetchWithSession(MIGRATE_CART, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await getCart();
    } catch (error) {
      console.error('Error migrando carrito:', error);
      throw error;
    }
  };

  // Inicializar al cargar la página
  useEffect(() => {
    getCart();
    
    // Escuchar cambios de autenticación
    const handleStorageChange = () => {
      if (localStorage.getItem('token') && cartItems.length > 0) {
        migrateCart();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const value: CartContextType = {
    cartItems,
    cartCount,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCart,
    migrateCart,
    refreshCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};