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
  originalPrice: number;
  priceWithDiscount: number;
  discountPercentage: number;
  hasDiscount: boolean;
  totalPrice: number;
  imageUrl: string;
}

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  loading: boolean;
  showCartNotification: boolean;
  lastAddedProduct: string | null;
  cartTotals: {
    subtotal: number;
    shippingCost: number;
    total: number;
    totalItems: number;
    discountSavings: number;
    originalSubtotal: number;
  };
  addToCart: (productVariantId: number, quantity: number, productName?: string) => Promise<void>;
  removeFromCart: (cartItemId: number) => Promise<void>;
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getCart: () => Promise<void>;
  migrateCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  hideCartNotification: () => void;
  sessionId: string | null;
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showCartNotification, setShowCartNotification] = useState<boolean>(false);
  const [lastAddedProduct, setLastAddedProduct] = useState<string | null>(null);
  const [tempCartCount, setTempCartCount] = useState<number>(0);
  
  const [cartTotals, setCartTotals] = useState({
    subtotal: 0,
    shippingCost: 0,
    total: 0,
    totalItems: 0,
    discountSavings: 0,
    originalSubtotal: 0
  });

  // Constante para header
  const CART_SESSION_HEADER = 'X-Cart-Session-Id';
  const CART_SESSION_KEY = 'cartSessionId';

  // Obtener sessionId desde localStorage
  const getSessionId = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CART_SESSION_KEY) || sessionId;
    }
    return null;
  };

  // Guardar sessionId desde headers de respuesta
  const saveSessionIdFromHeaders = (headers: Headers) => {
    const newSessionId = headers.get(CART_SESSION_HEADER);
    if (newSessionId && newSessionId.trim() !== '' && newSessionId !== 'cleared') {
      localStorage.setItem(CART_SESSION_KEY, newSessionId);
      setSessionId(newSessionId);
    } else if (newSessionId === 'cleared') {
      localStorage.removeItem(CART_SESSION_KEY);
      setSessionId(null);
    }
  };

  // Configurar headers para todas las peticiones
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    const currentSessionId = getSessionId();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Agregar sessionId en header si existe
    if (currentSessionId) {
      headers[CART_SESSION_HEADER] = currentSessionId;
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
      credentials: 'include',
      headers: {
        ...headers,
        ...options.headers
      }
    });

    // Guardar sessionId si viene en la respuesta
    saveSessionIdFromHeaders(response.headers);

    return response;
  };

  // Obtener carrito con totales
  const getCart = useCallback(async () => {
    setLoading(true);
    try {
      // Usar el endpoint con totales
      const response = await fetchWithSession(`${CART}/with-totals`);
      
      if (response.status === 404 || response.status === 400) {
        setCartItems([]);
        setCartCount(0);
        setTempCartCount(0);
        setCartTotals({
          subtotal: 0,
          shippingCost: 0,
          total: 0,
          totalItems: 0,
          discountSavings: 0,
          originalSubtotal: 0
        });
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transformar items del carrito
      const transformedItems: CartItem[] = data.items.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        productVariantId: item.productVariantId,
        productName: item.productName,
        color: item.color,
        size: item.size,
        price: item.priceWithDiscount || item.originalPrice,
        originalPrice: item.originalPrice,
        priceWithDiscount: item.priceWithDiscount,
        discountPercentage: item.discountPercentage || 0,
        hasDiscount: item.hasDiscount || false,
        totalPrice: item.itemDiscountedTotal || (item.priceWithDiscount * item.quantity),
        imageUrl: item.imageUrl
      }));

      setCartItems(transformedItems);
      
      // Actualizar totales
      setCartTotals({
        subtotal: data.subtotal || 0,
        shippingCost: data.shippingCost || 0,
        total: data.total || 0,
        totalItems: data.totalItems || 0,
        discountSavings: data.discountSavings || 0,
        originalSubtotal: data.originalSubtotal || data.subtotal || 0
      });
      
      // Actualizar contador
      const newCount = data.totalItems || 0;
      setCartCount(newCount);
      setTempCartCount(newCount);
      
    } catch (error: any) {
      console.error('Error obteniendo carrito:', error);
      setCartItems([]);
      setCartCount(0);
      setTempCartCount(0);
      setCartTotals({
        subtotal: 0,
        shippingCost: 0,
        total: 0,
        totalItems: 0,
        discountSavings: 0,
        originalSubtotal: 0
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Refrescar carrito
  const refreshCart = async () => {
    await getCart();
  };

  // Agregar al carrito
  const addToCart = async (productVariantId: number, quantity: number, productName?: string) => {
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
      
      // Actualizar contador INMEDIATAMENTE
      const newCount = tempCartCount + quantity;
      setTempCartCount(newCount);
      
      // Mostrar notificación
      if (productName) {
        setLastAddedProduct(productName);
        setShowCartNotification(true);
        
        setTimeout(() => {
          hideCartNotification();
        }, 3000);
      }
      
      // Actualizar carrito completo
      await getCart();
      
      return data;
    } catch (error) {
      console.error('Error agregando al carrito:', error);
      setTempCartCount(tempCartCount - quantity);
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
      setTempCartCount(0);
      setCartTotals({
        subtotal: 0,
        shippingCost: 0,
        total: 0,
        totalItems: 0,
        discountSavings: 0,
        originalSubtotal: 0
      });
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

  // Función para ocultar notificación
  const hideCartNotification = useCallback(() => {
    setShowCartNotification(false);
    setLastAddedProduct(null);
  }, []);

  // Inicializar al cargar la página
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSessionId = localStorage.getItem(CART_SESSION_KEY);
      if (savedSessionId) {
        setSessionId(savedSessionId);
      }
    }
    
    getCart();
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && e.newValue && cartItems.length > 0) {
        migrateCart();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Sincronizar tempCartCount con cartCount
  useEffect(() => {
    if (tempCartCount !== cartCount) {
      setTempCartCount(cartCount);
    }
  }, [cartCount]);

  const value: CartContextType = {
    cartItems,
    cartCount: tempCartCount,
    loading,
    showCartNotification,
    lastAddedProduct,
    cartTotals,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCart,
    migrateCart,
    refreshCart,
    hideCartNotification,
    sessionId
  };
  export type { CartItem }; // <-- Exportar el tipo


  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
  
};