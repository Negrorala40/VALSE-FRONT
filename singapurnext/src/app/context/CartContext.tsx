'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import axios from 'axios';
import { ADD_TO_CART, CLEAR_CART, CART, GET_CART_COUNT, MIGRATE_CART } from '../utils/Api';

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

  // Obtener carrito
  const getCart = async () => {
    setLoading(true);
    try {
      const response = await axios.get(CART, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setCartItems(response.data);
      
      // Actualizar contador
      const countResponse = await axios.get(GET_CART_COUNT, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setCartCount(countResponse.data.count || 0);
    } catch (error: any) {
      if (error.response?.status !== 404 && error.response?.status !== 400) {
        console.error('Error obteniendo carrito:', error);
      }
      // 404 o 400 significa carrito vacío o sin sesión - es normal
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error: any) {
      console.error('Error eliminando del carrito:', error);
      if (error.response?.status === 400) {
        throw new Error('No hay sesión de carrito');
      }
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
    } catch (error: any) {
      console.error('Error actualizando cantidad:', error);
      if (error.response?.status === 400) {
        throw new Error('No hay sesión de carrito');
      }
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
    } catch (error: any) {
      console.error('Error vaciando carrito:', error);
      if (error.response?.status === 400) {
        throw new Error('No hay sesión de carrito');
      }
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
      
      await getCart();
    } catch (error) {
      console.error('Error migrando carrito:', error);
    }
  };

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