'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axios from 'axios';
import { ADD_TO_CART, CLEAR_CART, CART, GET_CART_COUNT, MIGRATE_CART } from '../utils/Api';
import Cookies from 'js-cookie';

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

  // Inicializar sessionId si no existe
  useEffect(() => {
    const initializeSession = () => {
      const sessionId = Cookies.get('cart_session_id');
      if (!sessionId) {
        // El backend creará la cookie automáticamente en la primera petición
        console.log('Esperando sessionId del backend...');
      }
    };
    initializeSession();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Obtener carrito - usando useCallback para memoizar la función
  const getCart = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(CART, {
        headers: getAuthHeaders(),
        withCredentials: true // Importante para cookies
      });
      setCartItems(response.data);
      
      // Actualizar contador
      const countResponse = await axios.get(GET_CART_COUNT, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setCartCount(countResponse.data.count || 0);
    } catch (error) {
      console.error('Error obteniendo carrito:', error);
    } finally {
      setLoading(false);
    }
  }, []); // Nota: getAuthHeaders también podría cambiar, pero es una función pura

  // Agregar al carrito
  const addToCart = async (productVariantId: number, quantity: number) => {
    try {
      const payload = {
        productVariantId,
        quantity
      };

      await axios.post(ADD_TO_CART, payload, {
        headers: getAuthHeaders(),
        withCredentials: true
      });

      // Actualizar carrito después de agregar
      await getCart();
    } catch (error) {
      console.error('Error agregando al carrito:', error);
      throw error;
    }
  };

  // Eliminar del carrito
  const removeFromCart = async (cartItemId: number) => {
    try {
      await axios.delete(`${CART}/remove/${cartItemId}`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      await getCart();
    } catch (error) {
      console.error('Error eliminando del carrito:', error);
    }
  };

  // Actualizar cantidad
  const updateQuantity = async (cartItemId: number, quantity: number) => {
    try {
      await axios.put(`${CART}/update/${cartItemId}`, null, {
        params: { quantity },
        headers: getAuthHeaders(),
        withCredentials: true
      });
      await getCart();
    } catch (error) {
      console.error('Error actualizando cantidad:', error);
    }
  };

  // Vaciar carrito
  const clearCart = async () => {
    try {
      await axios.delete(CLEAR_CART, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setCartItems([]);
      setCartCount(0);
    } catch (error) {
      console.error('Error vaciando carrito:', error);
    }
  };

  // Migrar carrito anónimo a usuario autenticado
  const migrateCart = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await axios.post(MIGRATE_CART, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });
      
      // Recargar carrito después de migrar
      await getCart();
    } catch (error) {
      console.error('Error migrando carrito:', error);
    }
  };

  // Cargar carrito al iniciar - ahora incluye getCart en las dependencias
  useEffect(() => {
    getCart();
  }, [getCart]); // getCart está memoizado con useCallback

  const value = {
    cartItems,
    cartCount,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCart,
    migrateCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};