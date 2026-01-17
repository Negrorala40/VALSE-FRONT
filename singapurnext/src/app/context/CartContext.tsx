'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
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
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest' // Para Safari
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Helper para fetch con cookies
  const fetchWithCookies = async (url: string, options: RequestInit = {}) => {
    const headers = getAuthHeaders();
    
    // Forzar cookie para Safari antes de cada request
    if (typeof document !== 'undefined' && navigator.userAgent.includes('Safari')) {
      document.cookie = `safari_fix=${Date.now()}; path=/; SameSite=None; Secure`;
    }
    
    return fetch(url, {
      ...options,
      credentials: 'include', // ← CRÍTICO para cookies
      headers: {
        ...headers,
        ...options.headers
      }
    });
  };

  // Obtener carrito - CON FETCH
  const getCart = async () => {
    setLoading(true);
    try {
      const response = await fetchWithCookies(CART);
      
      console.log('🛒 Fetch cart - Status:', response.status);
      
      if (response.status === 404 || response.status === 400) {
        // Carrito vacío o sin sesión - es normal
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
      const countResponse = await fetchWithCookies(GET_CART_COUNT);
      if (countResponse.ok) {
        const countData = await countResponse.json();
        setCartCount(countData.count || 0);
      }
      
    } catch (error: any) {
      console.error('Error obteniendo carrito:', error);
      if (error.message?.includes('404') || error.message?.includes('400')) {
        // Carrito vacío - normal
        setCartItems([]);
        setCartCount(0);
      }
    } finally {
      setLoading(false);
    }
  };

  // Agregar al carrito - CON FETCH
  const addToCart = async (productVariantId: number, quantity: number) => {
    try {
      const payload = {
        productVariantId,
        quantity
      };

      const response = await fetchWithCookies(ADD_TO_CART, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Producto agregado al carrito:', data);
      
      // DEBUG: Ver cookies
      console.log('Cookies después de POST:', document.cookie);
      
      // Actualizar carrito después de agregar
      await getCart();
      
      return data;
    } catch (error) {
      console.error('Error agregando al carrito:', error);
      throw error;
    }
  };

  // Eliminar del carrito - CON FETCH
  const removeFromCart = async (cartItemId: number) => {
    try {
      const response = await fetchWithCookies(`${CART}/remove/${cartItemId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('No hay sesión de carrito');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await getCart();
    } catch (error: any) {
      console.error('Error eliminando del carrito:', error);
      throw error;
    }
  };

  // Actualizar cantidad - CON FETCH
  const updateQuantity = async (cartItemId: number, quantity: number) => {
    try {
      const response = await fetchWithCookies(`${CART}/update/${cartItemId}?quantity=${quantity}`, {
        method: 'PUT'
      });
      
      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('No hay sesión de carrito');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await getCart();
    } catch (error: any) {
      console.error('Error actualizando cantidad:', error);
      throw error;
    }
  };

  // Vaciar carrito - CON FETCH
  const clearCart = async () => {
    try {
      const response = await fetchWithCookies(CLEAR_CART, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('No hay sesión de carrito');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setCartItems([]);
      setCartCount(0);
    } catch (error: any) {
      console.error('Error vaciando carrito:', error);
      throw error;
    }
  };

  // Migrar carrito anónimo a usuario autenticado - CON FETCH
  const migrateCart = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetchWithCookies(MIGRATE_CART, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  // Inicializar carrito al cargar la página
  React.useEffect(() => {
    // Forzar cookie inicial para Safari
    if (typeof document !== 'undefined') {
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (isSafari) {
        document.cookie = `cart_init=${Date.now()}; path=/; SameSite=None; Secure; max-age=3600`;
        console.log('🦁 Safari cookie inicializada');
      }
    }
    
    // Cargar carrito
    const timer = setTimeout(() => {
      getCart();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

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