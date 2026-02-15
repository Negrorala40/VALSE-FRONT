'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import './Checkout.css';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import { 
  CART, 
  PERFIL_ME, 
  ADDRESS, 
  CHECKOUT_ANONYMOUS,
  CHECKOUT_AUTHENTICATED,
  MERCADOPAGO_CREATE_PREFERENCE,
  MERCADOPAGO_STATUS,
  ORDER_CHECK_EXPIRATION
} from '../utils/Api';
import { 
  ShoppingBag, 
  MapPin, 
  CreditCard, 
  Check, 
  Plus, 
  Minus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Package, 
  Star, 
  Sparkles,
  X,
  Loader2,
  Wallet as WalletIcon,
  User,
  Mail,
  Phone,
  AlertCircle,
  Lock,
  Shield,
  Clock,
  RefreshCw,
  Gift // 👈 NUEVO ICONO
} from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice: number;
  size: string;
  color: string;
  quantity: number;
  stock?: number;
  maxStock?: number;
  productVariantId?: string;
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountAmount?: number;
  savings?: number;
}

interface Address {
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
}

interface UserData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addresses: Address[];
}

interface OrderResponse {
  id: number;
  orderDate: string;
  status: string;
  totalPrice: number;
  userId: number | null;
  shippingAddressId: number;
  orderItems: Array<{
    id: number;
    quantity: number;
    price: number;
    orderId: number;
    productVariantId: number;
  }>;
  customerEmail?: string;
  // 👇 NUEVOS CAMPOS PARA DESCUENTO
  firstPurchaseDiscountApplied?: boolean;
  firstPurchaseDiscountPercentage?: number;
  firstPurchaseDiscountAmount?: number;
}

interface AnonymousUserInfo {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface MercadoPagoResponse {
  success: boolean;
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
  publicKey: string;
  orderId: string;
  externalReference: string;
  totalAmount?: number;
  shippingCost?: number;
  validation?: string;
  hasExistingPreference?: boolean;
  message?: string;
  // 👇 NUEVOS CAMPOS
  subtotalWithoutDiscount?: number;
  totalDiscount?: number;
  hasDiscount?: boolean;
  hasShipping?: boolean;
  orderStatus?: string;
}

interface PaymentStatusResponse {
  success: boolean;
  orderId: number;
  status: string;
  mercadoPagoStatus?: string;
  paymentId?: string;
  paymentMethod?: string;
  lastUpdated?: string;
  hasPayment: boolean;
  preferenceId?: string;
  totalPrice?: number;
  mercadoPagoPreferenceId?: string;
  stockReservedAt?: string;
  stockReservationExpired?: boolean;
  stockReservationMinutesLeft?: number;
  paymentInfo?: any;
  cancellationReason?: string;
  // 👇 NUEVOS CAMPOS
  firstPurchaseDiscountApplied?: boolean;
  firstPurchaseDiscountPercentage?: number;
  firstPurchaseDiscountAmount?: number;
}

interface CartTotalsResponse {
  items: Array<{
    id: number;
    productVariantId: number;
    imageUrls: string[];
    productName: string;
    price: number;
    originalPrice: number;
    priceWithDiscount: number;
    hasDiscount: boolean;
    discountPercentage: number;
    discountAmount: number;
    size: string;
    color: string;
    quantity: number;
    stock?: number;
    maxStock?: number;
  }>;
  subtotal: number;
  shippingCost: number;
  total: number;
  totalItems: number;
  itemCount: number;
  discountSavings: number;
  originalSubtotal: number;
}

const CheckoutPage = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState<string>('');
  const [subtotal, setSubtotal] = useState<number>(0);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [discountSavings, setDiscountSavings] = useState<number>(0);
  const [originalSubtotal, setOriginalSubtotal] = useState<number>(0);
  
  // 👇 NUEVOS ESTADOS PARA DESCUENTO DE PRIMERA COMPRA
  const [firstPurchaseDiscount, setFirstPurchaseDiscount] = useState<{
    applied: boolean;
    percentage: number;
    amount: number;
    message?: string;
  }>({
    applied: false,
    percentage: 0,
    amount: 0
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [needsCartAdjustment, setNeedsCartAdjustment] = useState<boolean>(false);
  const [adjustedItems, setAdjustedItems] = useState<Array<{id: string, name: string, oldQty: number, newQty: number}>>([]);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>('');

  const [step, setStep] = useState<number>(1);

  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState<Omit<Address, 'id'>>({
    address: '',
    city: '',
    state: '',
    country: 'Colombia',
  });

  const [anonymousUserInfo, setAnonymousUserInfo] = useState<AnonymousUserInfo>({
    email: '',
    firstName: '',
    lastName: '',
    phone: ''
  });

  const [orderCreated, setOrderCreated] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [mercadoPagoLoading, setMercadoPagoLoading] = useState(false);
  const [mercadoPagoData, setMercadoPagoData] = useState<MercadoPagoResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusResponse | null>(null);
  const [publicKey, setPublicKey] = useState<string>('');
  const [isMercadoPagoInitialized, setIsMercadoPagoInitialized] = useState<boolean>(false);
  
  const fetchControllerRef = useRef<AbortController | null>(null);
  const hasFetchedRef = useRef(false);
  const paymentStatusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const orderFromStorageRef = useRef<string | null>(null);
  const cartHashRef = useRef<string>('');
  const isAutoCreatingOrderRef = useRef<boolean>(false);
  const lastCartUpdateRef = useRef<number>(Date.now());

  // 🔴 FUNCIÓN PARA CALCULAR HASH DEL CARRITO
  const calculateCartHash = useCallback((items: CartItem[]): string => {
    if (!items || items.length === 0) return 'empty';
    
    const cartData = items
      .map(item => `${item.productVariantId}:${item.quantity}`)
      .sort()
      .join('|');
    
    let hash = 0;
    for (let i = 0; i < cartData.length; i++) {
      const char = cartData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36);
  }, []);

  // 🔴 INICIALIZAR MERCADO PAGO CUANDO TENGAMOS LA PUBLIC KEY
  const initializeMercadoPago = useCallback((publicKeyFromBackend: string) => {
    if (!publicKeyFromBackend) {
      console.error('❌ No hay public key para inicializar MercadoPago');
      return false;
    }
    
    try {
      console.log('🔧 Inicializando MercadoPago con public key:', publicKeyFromBackend.substring(0, 20) + '...');
      
      initMercadoPago(publicKeyFromBackend, {
        locale: 'es-CO'
      });
      
      setPublicKey(publicKeyFromBackend);
      setIsMercadoPagoInitialized(true);
      console.log('✅ MercadoPago inicializado correctamente');
      
      return true;
    } catch (error) {
      console.error('❌ Error inicializando MercadoPago:', error);
      return false;
    }
  }, []);

  // 🔴 FUNCIÓN PARA OBTENER SESSION ID
  const getSessionId = useCallback(() => {
    let sessionId = localStorage.getItem('cartSessionId');
  
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('cartSessionId', sessionId);
      console.log('🆕 Nuevo sessionId creado:', sessionId.substring(0, 8) + '...');
    }
    
    sessionStorage.setItem('cartSessionId', sessionId);
    setSessionId(sessionId);
    return sessionId;
  }, []);

  // 🔴 AGREGAR SESSION ID A TODAS LAS REQUESTS
  const getRequestHeaders = useCallback((token?: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const currentSessionId = getSessionId();
    headers['X-Cart-Session-Id'] = currentSessionId;
    
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('📤 Headers enviados:', {
        'X-Cart-Session-Id': currentSessionId.substring(0, 8) + '...',
        'Authorization': token ? 'Presente' : 'No'
      });
    }

    return headers;
  }, [getSessionId]);

  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }, []);

  // 🔴 ACTUALIZADO: Calcular totales desde la respuesta del backend con descuentos
  const updateTotalsFromResponse = useCallback((data: CartTotalsResponse) => {
    setSubtotal(data.subtotal || 0);
    setShippingCost(data.shippingCost || 0);
    setTotal(data.total || 0);
    setTotalItems(data.totalItems || 0);
    setDiscountSavings(data.discountSavings || 0);
    setOriginalSubtotal(data.originalSubtotal || data.subtotal || 0);
  }, []);

  // 🔴 NUEVA FUNCIÓN: Actualizar descuento de primera compra desde la orden
  const updateFirstPurchaseDiscountFromOrder = useCallback((order: OrderResponse) => {
    if (order.firstPurchaseDiscountApplied && order.firstPurchaseDiscountAmount && order.firstPurchaseDiscountAmount > 0) {
      setFirstPurchaseDiscount({
        applied: true,
        percentage: order.firstPurchaseDiscountPercentage || 0,
        amount: order.firstPurchaseDiscountAmount,
        message: `¡Felicidades! Por ser tu primera compra, tienes ${order.firstPurchaseDiscountPercentage}% de descuento 🎉`
      });
      
      // Mostrar mensaje de felicitación
      setSuccessMessage(`🎉 ¡Felicidades! Por ser tu primera compra, tienes ${order.firstPurchaseDiscountPercentage}% de descuento`);
    } else {
      setFirstPurchaseDiscount({
        applied: false,
        percentage: 0,
        amount: 0
      });
    }
  }, []);

  // 🔴 FUNCIÓN PARA RENDERIZAR PRECIO DE ITEM CON DESCUENTO
  const renderItemPrice = useCallback((item: CartItem) => {
    const itemTotal = item.price * item.quantity;
    const itemOriginalTotal = (item.originalPrice || item.price) * item.quantity;
    
    if (item.hasDiscount && item.discountPercentage && item.discountPercentage > 0) {
      return (
        <div className="checkout-item-price-container">
          <div className="checkout-item-price-original">
            ${formatPrice(itemOriginalTotal).replace('$', '')}
          </div>
          <div className="checkout-item-price-discounted">
            ${formatPrice(itemTotal).replace('$', '')}
            <span className="checkout-item-discount-badge">
              -{item.discountPercentage}%
            </span>
          </div>
        </div>
      );
    } else {
      return (
        <p className="checkout-cart-item-price">{formatPrice(itemTotal)}</p>
      );
    }
  }, [formatPrice]);

  // 🔴 VERIFICAR Y MANEJAR ORDENES EXPIRADAS AUTOMÁTICAMENTE
  const checkAndHandleExpiredOrder = useCallback(async (): Promise<boolean> => {
    if (!orderId) return false;
    
    try {
      const token = localStorage.getItem('token');
      const headers = getRequestHeaders(token);
      
      const response = await fetch(`${ORDER_CHECK_EXPIRATION.replace('{orderId}', orderId)}`, {
        method: 'POST',
        headers,
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.expired) {
          console.log('🔴 Orden expirada detectada, creando nueva automáticamente...');
          
          // Limpiar datos de orden expirada SILENCIOSAMENTE
          localStorage.removeItem('pendingOrderId');
          localStorage.removeItem('pendingOrderData');
          localStorage.removeItem('pendingPreferenceId');
          localStorage.removeItem('lastOrderCartHash');
          
          setOrderCreated(false);
          setOrderId('');
          setMercadoPagoData(null);
          setPaymentStatus(null);
          
          // Limpiar descuento de primera compra
          setFirstPurchaseDiscount({
            applied: false,
            percentage: 0,
            amount: 0
          });
          
          // Crear nueva orden automáticamente
          await createOrderSilently();
          return true;
        }
      }
    } catch (error) {
      console.error('Error verificando expiración:', error);
    }
    
    return false;
  }, [orderId, getRequestHeaders]);

  // 🔴 NUEVA FUNCIÓN: VERIFICAR Y AJUSTAR CANTIDADES SI EXCEDEN STOCK MÁXIMO
  const checkAndAdjustCartQuantities = useCallback(async (data: CartTotalsResponse, token: string | null) => {
    const adjustments: Array<{id: string, name: string, oldQty: number, newQty: number}> = [];
    
    // Verificar cada item del carrito
    for (const item of data.items) {
      const existingItem = cartItems.find(ci => 
        ci.productVariantId === item.productVariantId?.toString() || 
        ci.id === item.id?.toString()
      );
      
      if (item.maxStock !== undefined && existingItem && existingItem.quantity > item.maxStock) {
        console.log(`⚠️ Ajustando cantidad de ${item.productName}: ${existingItem.quantity} → ${item.maxStock}`);
        
        // Agregar a la lista de ajustes
        adjustments.push({
          id: existingItem.id,
          name: existingItem.name,
          oldQty: existingItem.quantity,
          newQty: item.maxStock
        });
        
        // Actualizar cantidad en el backend
        try {
          const headers = getRequestHeaders(token);
          await fetch(`${CART}/update/${existingItem.id}?quantity=${item.maxStock}`, {
            method: 'PUT',
            headers,
            credentials: 'include'
          });
        } catch (err) {
          console.error('Error ajustando cantidad:', err);
        }
      }
    }
    
    // Si hay ajustes, mostrar notificación
    if (adjustments.length > 0) {
      setAdjustedItems(adjustments);
      setNeedsCartAdjustment(true);
      return true;
    }
    
    return false;
  }, [cartItems, getRequestHeaders]);

  // 🔴 ACTUALIZADO: Obtener carrito con verificación de stock máximo y descuentos
  const fetchCart = useCallback(async (token: string | null, signal?: AbortSignal) => {
    try {
      console.log('🛒 Actualizando información del carrito...');
      
      const headers = getRequestHeaders(token);
      
      const res = await fetch(`${CART}/with-totals`, {
        headers,
        signal,
        credentials: 'include'
      });
      
      if (!res.ok) {
        if (res.status === 404 || res.status === 204) {
          console.log('🛒 Carrito vacío');
          setCartItems([]);
          updateTotalsFromResponse({
            items: [],
            subtotal: 0,
            shippingCost: 0,
            total: 0,
            totalItems: 0,
            itemCount: 0,
            discountSavings: 0,
            originalSubtotal: 0
          });
          
          cartHashRef.current = '';
          return;
        }
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json() as CartTotalsResponse;
      
      if (!Array.isArray(data.items)) {
        console.error('🛑 La respuesta no tiene items válidos:', data);
        setCartItems([]);
        updateTotalsFromResponse({
          items: [],
          subtotal: 0,
          shippingCost: 0,
          total: 0,
          totalItems: 0,
          itemCount: 0,
          discountSavings: 0,
          originalSubtotal: 0
        });
        cartHashRef.current = '';
        return;
      }
      
      // 🔴 VERIFICAR Y AJUSTAR CANTIDADES SI ES NECESARIO
      const needsAdjustment = await checkAndAdjustCartQuantities(data, token);
      
      if (needsAdjustment) {
        // Si se ajustaron cantidades, refrescar el carrito
        console.log('🔄 Recargando carrito después de ajustes...');
        setTimeout(() => fetchCart(token, signal), 500);
        return;
      }
      
      // Transformar items del carrito con información de descuentos
      const items: CartItem[] = data.items.map(
        (item: any) => ({
          id: item.id?.toString() || `item-${Date.now()}-${Math.random()}`,
          image: item.imageUrl?.trim() || '/images/placeholder.png',
          name: item.productName?.trim() || 'Producto',
          price: item.priceWithDiscount || item.price || 0,
          originalPrice: item.originalPrice || item.price || 0,
          size: item.size || '',
          color: item.color || '',
          quantity: item.quantity || 1,
          stock: item.stock || 100,
          maxStock: item.maxStock || item.stock,
          productVariantId: item.productVariantId?.toString() || item.id?.toString(),
          hasDiscount: item.hasDiscount || false,
          discountPercentage: item.discountPercentage || 0,
          discountAmount: item.discountAmount || 0,
          savings: item.savings || 0
        })
      );
      
      // 🔴 CALCULAR NUEVO HASH Y VERIFICAR CAMBIOS
      const newCartHash = calculateCartHash(items);
      const hasCartChanged = cartHashRef.current && cartHashRef.current !== newCartHash;
      
      if (hasCartChanged) {
        console.log('🔄 Carrito modificado - Actualizando orden automáticamente...');
        console.log('Hash anterior:', cartHashRef.current);
        console.log('Hash nuevo:', newCartHash);
        
        // 🔴 SI EL CARRITO CAMBIÓ Y TENEMOS UNA ORDEN, CREAR NUEVA AUTOMÁTICAMENTE
        if (orderCreated && !isAutoCreatingOrderRef.current) {
          isAutoCreatingOrderRef.current = true;
          
          try {
            // Crear nueva orden automáticamente
            await createOrderSilently();
          } finally {
            isAutoCreatingOrderRef.current = false;
          }
        }
      }
      
      // 🔴 ACTUALIZAR HASH ACTUAL
      cartHashRef.current = newCartHash;
      lastCartUpdateRef.current = Date.now();
      
      setCartItems(items);
      updateTotalsFromResponse(data);
      console.log(`✅ Carrito actualizado: ${items.length} items, Descuento total: ${formatPrice(data.discountSavings || 0)}`);
      
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name !== 'AbortError') {
        console.error('🛑 Error actualizando carrito:', err);
        setCartItems([]);
        updateTotalsFromResponse({
          items: [],
          subtotal: 0,
          shippingCost: 0,
          total: 0,
          totalItems: 0,
          itemCount: 0,
          discountSavings: 0,
          originalSubtotal: 0
        });
        cartHashRef.current = '';
      }
    }
  }, [formatPrice, getRequestHeaders, updateTotalsFromResponse, calculateCartHash, orderCreated, checkAndAdjustCartQuantities]);

  const fetchUser = useCallback(async (token: string, signal?: AbortSignal) => {
    try {
      console.log('👤 Cargando información del usuario...');
      const headers = getRequestHeaders(token);
      const res = await fetch(PERFIL_ME, {
        headers,
        signal,
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      
      const user = await res.json() as UserData;
      console.log('✅ Usuario cargado:', user.email);
      
      setUserData(user);
      if (user.addresses && user.addresses.length > 0) {
        setSelectedAddress(user.addresses[0]);
      }

      setAnonymousUserInfo({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || ''
      });
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name !== 'AbortError') {
        console.error('🛑 Error cargando usuario:', err);
      }
    }
  }, [getRequestHeaders]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const isAuth = !!token;
    setIsAuthenticated(isAuth);

    // Obtener sessionId
    getSessionId();

    // 🔴 CARGAR HASH DE ORDEN ANTERIOR SI EXISTE
    const lastOrderHash = localStorage.getItem('lastOrderCartHash');
    if (lastOrderHash) {
      cartHashRef.current = lastOrderHash;
    }

    if (isAuth && !hasFetchedRef.current) {
      loadAuthenticatedData(token!);
    } else if (!isAuth && !hasFetchedRef.current) {
      loadAnonymousCart();
    }

    return () => {
      if (paymentStatusIntervalRef.current) {
        clearInterval(paymentStatusIntervalRef.current);
      }
    };
  }, [getSessionId]);

  const loadAuthenticatedData = useCallback(async (token: string) => {
    setLoading(true);
    
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    
    fetchControllerRef.current = new AbortController();
    const signal = fetchControllerRef.current.signal;
    
    try {
      hasFetchedRef.current = true;
      
      await Promise.all([
        fetchCart(token, signal),
        fetchUser(token, signal)
      ]);
      
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name !== 'AbortError') {
        console.error('Error cargando datos:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchCart, fetchUser]);

  const loadAnonymousCart = useCallback(async () => {
    setLoading(true);
    try {
      await fetchCart(null);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error cargando carrito:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchCart]);

  // 🔴 ACTUALIZADO: Actualizar cantidad con verificación de stock máximo
  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const item = cartItems.find((i) => i.id === itemId);
    if (!item) return;
    
    // 🔴 VERIFICAR CONTRA STOCK MÁXIMO (si está disponible)
    const maxStock = item.maxStock || item.stock;
    if (maxStock && newQuantity > maxStock) {
      setError(`No hay suficiente stock disponible (máximo ${maxStock})`);
      return;
    }

    const token = localStorage.getItem('token');
    
    try {
      setLoading(true);
      
      const headers = getRequestHeaders(token);
      
      const res = await fetch(`${CART}/update/${itemId}?quantity=${newQuantity}`, {
        method: 'PUT',
        headers,
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error ${res.status}: ${errorText || 'Error actualizando cantidad'}`);
      }
      
      // Refrescar carrito para obtener los nuevos totales
      await fetchCart(token);
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('🛑 Error actualizando cantidad:', error);
      setError(`Error actualizando la cantidad: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // 🔴 ELIMINAR ITEM CON MANEJO AUTOMÁTICO
  const removeItem = async (itemId: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto del carrito?')) return;

    const token = localStorage.getItem('token');
    
    try {
      setLoading(true);
      
      const headers = getRequestHeaders(token);
      
      const res = await fetch(`${CART}/remove/${itemId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error ${res.status}: ${errorText || 'Error eliminando producto'}`);
      }
      
      // Refrescar carrito para obtener los nuevos totales
      await fetchCart(token);
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('🛑 Error eliminando producto:', error);
      setError(`Error eliminando el producto: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Verificar si hay una orden pendiente
  const checkPendingOrder = useCallback(() => {
    const pendingOrder = localStorage.getItem('pendingOrderId');
    const pendingOrderData = localStorage.getItem('pendingOrderData');
    
    if (pendingOrder && pendingOrderData) {
      try {
        const orderData = JSON.parse(pendingOrderData);
        setOrderId(pendingOrder);
        setOrderCreated(true);
        orderFromStorageRef.current = pendingOrder;
        
        // Si hay información de descuento en la orden guardada, restaurarla
        if (orderData.firstPurchaseDiscount) {
          setFirstPurchaseDiscount(orderData.firstPurchaseDiscount);
        }
        
        if (step === 3) {
          console.log('🔄 Recuperando orden pendiente:', pendingOrder);
        }
      } catch (err) {
        console.error('Error parsing pending order data:', err);
        localStorage.removeItem('pendingOrderId');
        localStorage.removeItem('pendingOrderData');
      }
    }
  }, [step]);

  const addAddress = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Necesitas iniciar sesión para guardar direcciones');
      return;
    }

    if (
      !newAddress.address.trim() ||
      !newAddress.city.trim() ||
      !newAddress.state.trim() ||
      !newAddress.country.trim()
    ) {
      setError('Completa todos los campos de la dirección');
      return;
    }

    try {
      setLoading(true);
      const headers = getRequestHeaders(token);
      const res = await fetch(ADDRESS, {
        method: 'POST',
        headers,
        body: JSON.stringify(newAddress),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error ${res.status}: ${errorText || 'Error agregando dirección'}`);
      }
      
      const createdAddress = await res.json() as Address;

      setUserData(prevUserData => {
        if (!prevUserData) return prevUserData;
        
        const existsById = prevUserData.addresses.some(addr => addr.id === createdAddress.id);
        const existsByData = prevUserData.addresses.some(addr => 
          addr.address === createdAddress.address &&
          addr.city === createdAddress.city &&
          addr.state === createdAddress.state &&
          addr.country === createdAddress.country
        );
        
        if (existsById || existsByData) {
          console.log('La dirección ya existe, no se agregará duplicado');
          return prevUserData;
        }
        
        return {
          ...prevUserData,
          addresses: [createdAddress, ...prevUserData.addresses]
        };
      });
      
      setSelectedAddress(createdAddress);
      setAddingAddress(false);
      setNewAddress({ address: '', city: '', state: '', country: 'Colombia' });
      setError('');
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('🛑 Error agregando dirección:', error);
      setError(`No se pudo agregar la dirección: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteAddress = async (addressId: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No autenticado');
      return;
    }
    
    if (!confirm('¿Seguro que quieres eliminar esta dirección?')) return;

    try {
      setLoading(true);
      const headers = getRequestHeaders(token);
      const res = await fetch(`${ADDRESS}/${addressId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error ${res.status}: ${errorText || 'Error eliminando dirección'}`);
      }

      setUserData(prevUserData => {
        if (!prevUserData) return prevUserData;
        
        const updatedAddresses = prevUserData.addresses.filter((a) => a.id !== addressId);
        
        return {
          ...prevUserData,
          addresses: updatedAddresses
        };
      });

      setSelectedAddress(prevSelected => 
        prevSelected?.id === addressId ? null : prevSelected
      );
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('🛑 Error eliminando dirección:', error);
      setError(`No se pudo eliminar la dirección: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && cartItems.length === 0) {
      setError('Tu carrito está vacío');
      return;
    }
    
    if (step === 2) {
      if (isAuthenticated) {
        if (!selectedAddress) {
          setError('Selecciona una dirección de envío');
          return;
        }
      } else {
        if (!anonymousUserInfo.email || !anonymousUserInfo.firstName || !anonymousUserInfo.phone) {
          setError('Completa tus datos de contacto para continuar');
          return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(anonymousUserInfo.email)) {
          setError('Ingresa un email válido');
          return;
        }
        
        if (anonymousUserInfo.phone.replace(/\D/g, '').length < 8) {
          setError('Ingresa un número de teléfono válido');
          return;
        }
        
        if (!selectedAddress) {
          setError('Debes agregar una dirección de envío');
          return;
        }
        
        if (!selectedAddress.address?.trim() || !selectedAddress.city?.trim() || 
            !selectedAddress.state?.trim() || !selectedAddress.country?.trim()) {
          setError('Completa todos los campos de la dirección');
          return;
        }
      }
    }
    
    setStep((prev) => Math.min(prev + 1, 3));
    setError('');
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    setError('');
  };

  // 🔴 CREAR ORDEN SILENCIOSAMENTE (sin notificar al usuario)
  const createOrderSilently = async (): Promise<OrderResponse | null> => {
    if (cartItems.length === 0 || !selectedAddress) {
      console.log('⚠️ No se puede crear orden: carrito vacío o sin dirección');
      return null;
    }

    try {
      console.log('🤫 Creando nueva orden automáticamente...');
      
      let orderResponse: OrderResponse;
      
      if (isAuthenticated) {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('Usuario no autenticado');
          return null;
        }
        
        const headers = getRequestHeaders(token);
        const orderRes = await fetch(CHECKOUT_AUTHENTICATED, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            shippingAddressId: selectedAddress.id
          }),
        });

        if (!orderRes.ok) {
          console.error('Error creando orden autenticada:', orderRes.status);
          return null;
        }

        orderResponse = await orderRes.json() as OrderResponse;
        console.log('✅ Nueva orden creada automáticamente:', orderResponse.id);
        
      } else {
        if (!anonymousUserInfo.email) {
          console.error('Email requerido para usuarios anónimos');
          return null;
        }
        
        const headers = getRequestHeaders();
        const orderRes = await fetch(CHECKOUT_ANONYMOUS, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            customerEmail: anonymousUserInfo.email,
            customerFirstName: anonymousUserInfo.firstName,
            customerLastName: anonymousUserInfo.lastName,
            customerPhone: anonymousUserInfo.phone,
            shippingAddress: {
              address: selectedAddress.address,
              city: selectedAddress.city,
              state: selectedAddress.state,
              country: selectedAddress.country
            }
          }),
        });

        if (!orderRes.ok) {
          console.error('Error creando orden anónima:', orderRes.status);
          return null;
        }

        orderResponse = await orderRes.json() as OrderResponse;
        console.log('✅ Nueva orden anónima creada automáticamente:', orderResponse.id);
      }

      if (!orderResponse.id) {
        console.error('No se pudo obtener el ID de la orden');
        return null;
      }

      // 🔴 ACTUALIZAR DESCUENTO DE PRIMERA COMPRA SI APLICA
      if (orderResponse.firstPurchaseDiscountApplied) {
        updateFirstPurchaseDiscountFromOrder(orderResponse);
      }

      // 🔴 GUARDAR HASH DEL CARRITO ACTUAL
      const currentCartHash = calculateCartHash(cartItems);
      localStorage.setItem('lastOrderCartHash', currentCartHash);
      cartHashRef.current = currentCartHash;
      
      console.log('📋 Hash del carrito actualizado:', currentCartHash);

      // Guardar orden en localStorage con información de descuento
      localStorage.setItem('pendingOrderId', orderResponse.id.toString());
      localStorage.setItem('pendingOrderData', JSON.stringify({
        shippingAddress: selectedAddress,
        customerInfo: isAuthenticated ? userData : anonymousUserInfo,
        createdAt: new Date().toISOString(),
        total: orderResponse.totalPrice,
        cartHash: currentCartHash,
        // Guardar información de descuento
        firstPurchaseDiscount: orderResponse.firstPurchaseDiscountApplied ? {
          applied: true,
          percentage: orderResponse.firstPurchaseDiscountPercentage,
          amount: orderResponse.firstPurchaseDiscountAmount
        } : null
      }));

      setOrderId(orderResponse.id.toString());
      setOrderCreated(true);
      orderFromStorageRef.current = null;

      return orderResponse;

    } catch (err: unknown) {
      const error = err as Error;
      console.error('🛑 Error creando orden automáticamente:', error);
      return null;
    }
  };

  // 🔴 FUNCIÓN PARA CREAR ORDEN (usada por el usuario)
  const createOrder = useCallback(async (): Promise<OrderResponse | null> => {
    if (cartItems.length === 0) {
      setError('Carrito vacío');
      return null;
    }
    
    if (!selectedAddress) {
      setError('Selecciona una dirección');
      return null;
    }

    if (total <= 0) {
      setError('Error en el cálculo del total. Por favor, recarga la página.');
      return null;
    }

    try {
      setIsProcessingPayment(true);
      setError('');
      setSuccessMessage('');

      console.log('🚀 Creando orden...');
      
      let orderResponse: OrderResponse;
      
      if (isAuthenticated) {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Usuario no autenticado');
        
        const headers = getRequestHeaders(token);
        const orderRes = await fetch(CHECKOUT_AUTHENTICATED, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            shippingAddressId: selectedAddress.id
          }),
        });

        if (!orderRes.ok) {
          let errorMessage = `Error ${orderRes.status}: ${orderRes.statusText}`;
          try {
            const errorData = await orderRes.text();
            errorMessage = errorData || errorMessage;
          } catch {}
          throw new Error(errorMessage);
        }

        orderResponse = await orderRes.json() as OrderResponse;
        console.log('✅ Orden creada:', orderResponse.id);
        
      } else {
        if (!anonymousUserInfo.email) {
          throw new Error('Email requerido para usuarios anónimos');
        }
        
        const headers = getRequestHeaders();
        const orderRes = await fetch(CHECKOUT_ANONYMOUS, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            customerEmail: anonymousUserInfo.email,
            customerFirstName: anonymousUserInfo.firstName,
            customerLastName: anonymousUserInfo.lastName,
            customerPhone: anonymousUserInfo.phone,
            shippingAddress: {
              address: selectedAddress.address,
              city: selectedAddress.city,
              state: selectedAddress.state,
              country: selectedAddress.country
            }
          }),
        });

        if (!orderRes.ok) {
          let errorMessage = `Error ${orderRes.status}: ${orderRes.statusText}`;
          try {
            const errorData = await orderRes.text();
            errorMessage = errorData || errorMessage;
          } catch {}
          throw new Error(errorMessage);
        }

        orderResponse = await orderRes.json() as OrderResponse;
        console.log('✅ Orden creada:', orderResponse.id);
      }

      if (!orderResponse.id) {
        throw new Error('No se pudo obtener el ID de la orden');
      }

      // 🔴 ACTUALIZAR DESCUENTO DE PRIMERA COMPRA SI APLICA
      if (orderResponse.firstPurchaseDiscountApplied) {
        updateFirstPurchaseDiscountFromOrder(orderResponse);
        setSuccessMessage(`🎉 ¡Felicidades! Por ser tu primera compra, tienes ${orderResponse.firstPurchaseDiscountPercentage}% de descuento`);
      }

      // 🔴 GUARDAR HASH DEL CARRITO ACTUAL
      const currentCartHash = calculateCartHash(cartItems);
      localStorage.setItem('lastOrderCartHash', currentCartHash);
      cartHashRef.current = currentCartHash;
      
      console.log('📋 Hash del carrito guardado:', currentCartHash);

      // Guardar orden en localStorage
      localStorage.setItem('pendingOrderId', orderResponse.id.toString());
      localStorage.setItem('pendingOrderData', JSON.stringify({
        shippingAddress: selectedAddress,
        customerInfo: isAuthenticated ? userData : anonymousUserInfo,
        createdAt: new Date().toISOString(),
        total: orderResponse.totalPrice,
        cartHash: currentCartHash,
        // Guardar información de descuento
        firstPurchaseDiscount: orderResponse.firstPurchaseDiscountApplied ? {
          applied: true,
          percentage: orderResponse.firstPurchaseDiscountPercentage,
          amount: orderResponse.firstPurchaseDiscountAmount
        } : null
      }));

      setOrderId(orderResponse.id.toString());
      setOrderCreated(true);
      
      if (orderFromStorageRef.current) {
        orderFromStorageRef.current = null;
      }

      return orderResponse;

    } catch (err: unknown) {
      const error = err as Error;
      console.error('🛑 Error creando orden:', error);
      setError(`Error al crear la orden: ${error.message || 'Error desconocido'}`);
      setOrderCreated(false);
      return null;
    } finally {
      setIsProcessingPayment(false);
    }
  }, [selectedAddress, cartItems, isAuthenticated, anonymousUserInfo, userData, getRequestHeaders, total, calculateCartHash, updateFirstPurchaseDiscountFromOrder]);

  // 🔴 FUNCIÓN PARA CREAR PREFERENCIA
  const createMercadoPagoPreference = async (orderId: string) => {
    try {
      setMercadoPagoLoading(true);
      setError('');
      
      console.log('💳 Creando preferencia para orden:', orderId);
      
      // 🔴 VERIFICAR EXPIRACIÓN ANTES DE CREAR PREFERENCIA
      await checkAndHandleExpiredOrder();
      
      const token = localStorage.getItem('token');
      const headers = getRequestHeaders(token);
      
      const totalAmount = total; // Esto ya incluye el descuento de primera compra
      
      const response = await fetch(MERCADOPAGO_CREATE_PREFERENCE, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          orderId: parseInt(orderId),
          totalAmount: totalAmount,
          paymentMethod: "MERCADO_PAGO",
          shippingAmount: shippingCost
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error creando preferencia:', errorText);
        
        let errorMessage = `Error ${response.status}: ${errorText || 'Error creando preferencia'}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            errorMessage = errorJson.error;
            
            // 🔴 SI LA ORDEN ESTÁ EXPIRADA, CREAR NUEVA AUTOMÁTICAMENTE
            if (errorMessage.includes('expirada') || errorMessage.includes('CANCELADA')) {
              console.log('🔄 Orden expirada, creando nueva automáticamente...');
              
              // Limpiar datos
              localStorage.removeItem('pendingOrderId');
              localStorage.removeItem('pendingOrderData');
              localStorage.removeItem('pendingPreferenceId');
              localStorage.removeItem('lastOrderCartHash');
              
              setOrderCreated(false);
              setOrderId('');
              setMercadoPagoData(null);
              setPaymentStatus(null);
              
              // Limpiar descuento
              setFirstPurchaseDiscount({
                applied: false,
                percentage: 0,
                amount: 0
              });
              
              // Crear nueva orden automáticamente
              const newOrder = await createOrderSilently();
              if (newOrder) {
                // Crear preferencia para la nueva orden
                return await createMercadoPagoPreference(newOrder.id.toString());
              }
            }
          }
        } catch {}
        
        throw new Error(errorMessage);
      }

      const data = await response.json() as MercadoPagoResponse;
      console.log('✅ Preferencia creada:', data.preferenceId);
      
      if (data.hasExistingPreference) {
        console.log('🔄 Usando preferencia existente');
      }
      
      if (!data.success) {
        throw new Error('No se pudo crear la preferencia de pago');
      }
      
      // 🔴 INICIALIZAR MERCADO PAGO
      if (data.publicKey) {
        const initialized = initializeMercadoPago(data.publicKey);
        if (!initialized) {
          console.warn('⚠️ No se pudo inicializar MercadoPago');
        }
      }
      
      setMercadoPagoData(data);
      
      localStorage.setItem('pendingPreferenceId', data.preferenceId);
      localStorage.setItem('mercadoPagoOrderId', orderId);
      
      return data;
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('🛑 Error creando preferencia:', error);
      
      if (error.message.includes('no coincide') || 
          error.message.includes('monto') || 
          error.message.includes('PAYMENT_VALIDATION_FAILED') ||
          error.message.includes('manipulación')) {
        
        setError(`Error de validación: ${error.message}. Por favor, recarga la página e intenta nuevamente.`);
        
        // Limpiar datos y reintentar
        localStorage.removeItem('pendingOrderId');
        localStorage.removeItem('pendingOrderData');
        localStorage.removeItem('pendingPreferenceId');
        setOrderCreated(false);
        setOrderId('');
        setMercadoPagoData(null);
        
        // Limpiar descuento
        setFirstPurchaseDiscount({
          applied: false,
          percentage: 0,
          amount: 0
        });
        
        // Forzar recarga del carrito
        const token = localStorage.getItem('token');
        await fetchCart(token);
        
      } else if (error.message.includes('Acceso denegado') || error.message.includes('no tienes permiso')) {
        setError('No tienes permiso para acceder a esta orden. Por favor, inicia sesión nuevamente.');
        
        localStorage.removeItem('token');
        localStorage.removeItem('pendingOrderId');
        localStorage.removeItem('pendingOrderData');
        setIsAuthenticated(false);
        
      } else if (error.message.includes('ya fue procesada')) {
        setError('Esta orden ya fue procesada. Se creará una nueva orden automáticamente.');
        
        localStorage.removeItem('pendingOrderId');
        localStorage.removeItem('pendingOrderData');
        setOrderCreated(false);
        setOrderId('');
        
        // Limpiar descuento
        setFirstPurchaseDiscount({
          applied: false,
          percentage: 0,
          amount: 0
        });
        
        // Crear nueva orden automáticamente
        await createOrderSilently();
        
      } else {
        setError(`Error al crear el pago: ${error.message || 'Error desconocido'}`);
      }
      
      return null;
    } finally {
      setMercadoPagoLoading(false);
    }
  };

  // 🔴 VERIFICAR ESTADO DEL PAGO
  const checkPaymentStatus = async (orderId: string): Promise<PaymentStatusResponse | null> => {
    try {
      console.log('🔄 Verificando estado del pago para orden:', orderId);
      
      const token = localStorage.getItem('token');
      const headers = getRequestHeaders(token);
      
      const response = await fetch(`${MERCADOPAGO_STATUS}/${orderId}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('❌ Error verificando estado:', response.status);
        return null;
      }

      const data = await response.json() as PaymentStatusResponse;
      console.log('📊 Estado del pago:', {
        orderStatus: data.status,
        mpStatus: data.mercadoPagoStatus,
        reservationMinutesLeft: data.stockReservationMinutesLeft,
        firstPurchaseDiscountApplied: data.firstPurchaseDiscountApplied
      });
      
      setPaymentStatus(data);
      
      // 🔴 ACTUALIZAR DESCUENTO DE PRIMERA COMPRA DESDE EL ESTADO
      if (data.firstPurchaseDiscountApplied) {
        setFirstPurchaseDiscount({
          applied: true,
          percentage: data.firstPurchaseDiscountPercentage || 0,
          amount: data.firstPurchaseDiscountAmount || 0
        });
      }
      
      // 🔴 VERIFICAR SI LA ORDEN ESTÁ CANCELADA (EXPIRADA)
      if (data.status === 'CANCELADO' || data.cancellationReason?.includes('expirado')) {
        console.log('🔴 Orden cancelada, creando nueva automáticamente...');
        
        // Limpiar datos
        localStorage.removeItem('pendingOrderId');
        localStorage.removeItem('pendingOrderData');
        localStorage.removeItem('pendingPreferenceId');
        localStorage.removeItem('lastOrderCartHash');
        
        setOrderCreated(false);
        setOrderId('');
        setMercadoPagoData(null);
        
        // Limpiar descuento
        setFirstPurchaseDiscount({
          applied: false,
          percentage: 0,
          amount: 0
        });
        
        // Crear nueva orden automáticamente
        await createOrderSilently();
        return data;
      }
      
      if (data.status === 'PAGO_APROBADO' || data.mercadoPagoStatus === 'approved') {
        handleSuccessfulPayment(orderId);
        return data;
      }
      
      if (data.status === 'PAGO_RECHAZADO' || data.mercadoPagoStatus === 'rejected') {
        setError('El pago fue rechazado. Por favor intenta con otro método de pago.');
        return data;
      }
      
      // 🔴 VERIFICAR RESERVA DE STOCK
      if (data.stockReservationMinutesLeft !== undefined && data.stockReservationMinutesLeft <= 0) {
        console.warn('⚠️ Reserva de stock expirada');
        if (!data.stockReservationExpired) {
          setError('La reserva de stock ha expirado. Creando nueva orden automáticamente...');
          
          localStorage.removeItem('pendingOrderId');
          localStorage.removeItem('pendingOrderData');
          localStorage.removeItem('pendingPreferenceId');
          setOrderCreated(false);
          
          // Limpiar descuento
          setFirstPurchaseDiscount({
            applied: false,
            percentage: 0,
            amount: 0
          });
          
          // Crear nueva orden automáticamente
          await createOrderSilently();
        }
      }
      
      return data;
      
    } catch (err: unknown) {
      console.error('🛑 Error verificando estado del pago:', err);
      return null;
    }
  };

  // 🔴 INICIAR POLLING PARA VERIFICAR ESTADO
  const startPaymentStatusPolling = (orderId: string) => {
    if (paymentStatusIntervalRef.current) {
      clearInterval(paymentStatusIntervalRef.current);
    }
    
    checkPaymentStatus(orderId);
    
    paymentStatusIntervalRef.current = setInterval(async () => {
      await checkPaymentStatus(orderId);
      
      // 🔴 VERIFICAR EXPIRACIÓN CADA 30 SEGUNDOS
      await checkAndHandleExpiredOrder();
    }, 30000);
    
    // Detener después de 15 minutos
    setTimeout(() => {
      if (paymentStatusIntervalRef.current) {
        clearInterval(paymentStatusIntervalRef.current);
        paymentStatusIntervalRef.current = null;
      }
    }, 900000);
  };

  // 🔴 MANEJAR PAGO EXITOSO
  const handleSuccessfulPayment = (orderId: string) => {
    if (paymentStatusIntervalRef.current) {
      clearInterval(paymentStatusIntervalRef.current);
      paymentStatusIntervalRef.current = null;
    }
    
    // 🔴 LIMPIAR DATOS
    localStorage.removeItem('lastOrderCartHash');
    cartHashRef.current = '';
    
    localStorage.removeItem('pendingOrderId');
    localStorage.removeItem('pendingOrderData');
    localStorage.removeItem('pendingPreferenceId');
    localStorage.removeItem('mercadoPagoOrderId');
    localStorage.removeItem('cartSessionId');
    
    setCartItems([]);
    setSubtotal(0);
    setShippingCost(0);
    setTotal(0);
    setTotalItems(0);
    setOrderCreated(false);
    setOrderId('');
    setMercadoPagoData(null);
    
    // Limpiar descuento
    setFirstPurchaseDiscount({
      applied: false,
      percentage: 0,
      amount: 0
    });
    
    setSuccessMessage(`✅ ¡Pago exitoso! Tu orden #${orderId} ha sido confirmada. Redirigiendo...`);
    
    setTimeout(() => {
      window.location.href = `/checkout/success?orderId=${orderId}`;
    }, 3000);
  };

  // 🔴 REINTENTAR PAGO
  const retryPayment = async () => {
    if (!orderId) {
      setError('No hay una orden para reintentar el pago');
      return;
    }
    
    // 🔴 VERIFICAR SI LA ORDEN SIGUE VÁLIDA
    await checkAndHandleExpiredOrder();
    
    // Limpiar preferencia anterior
    localStorage.removeItem('pendingPreferenceId');
    setMercadoPagoData(null);
    setError('');
    
    // Actualizar carrito antes de reintentar
    try {
      const token = localStorage.getItem('token');
      await fetchCart(token);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Error actualizando carrito:', error);
    }
    
    await createMercadoPagoPreference(orderId);
  };

  // 🔴 EFECTO PARA CREAR ORDEN Y PREFERENCIA AUTOMÁTICAMENTE
  useEffect(() => {
    const createOrderAndPreference = async () => {
      if (step === 3 && !orderCreated && !isProcessingPayment && !mercadoPagoData) {
        console.log('🔄 Step 3: Procesando orden...');
        
        if (orderFromStorageRef.current) {
          console.log('📦 Usando orden almacenada:', orderFromStorageRef.current);
          
          // Verificar si la orden almacenada sigue válida
          await checkAndHandleExpiredOrder();
          
          setOrderId(orderFromStorageRef.current);
          setOrderCreated(true);
          await createMercadoPagoPreference(orderFromStorageRef.current);
        } else {
          console.log('📦 Creando nueva orden...');
          const order = await createOrder();
          if (order) {
            console.log('💳 Creando preferencia...');
            await createMercadoPagoPreference(order.id.toString());
          }
        }
      }
    };
    
    createOrderAndPreference();
  }, [step, orderCreated, isProcessingPayment, mercadoPagoData, createOrder, createMercadoPagoPreference, checkAndHandleExpiredOrder]);

  // 🔴 EFECTO PARA INICIAR POLLING
  useEffect(() => {
    if (step === 3 && orderId && !mercadoPagoLoading && orderCreated) {
      console.log('📊 Iniciando verificación de estado para orden:', orderId);
      startPaymentStatusPolling(orderId);
    }
    
    return () => {
      if (paymentStatusIntervalRef.current) {
        clearInterval(paymentStatusIntervalRef.current);
        paymentStatusIntervalRef.current = null;
      }
    };
  }, [step, orderId, mercadoPagoLoading, orderCreated]);

  // 🔴 EFECTO PARA VERIFICAR CAMBIOS EN EL CARRITO PERIÓDICAMENTE
  useEffect(() => {
    if (step === 3 && orderCreated) {
      const interval = setInterval(async () => {
        // Verificar si el carrito ha sido modificado recientemente
        const timeSinceLastUpdate = Date.now() - lastCartUpdateRef.current;
        if (timeSinceLastUpdate < 5000) { // Si se modificó hace menos de 5 segundos
          console.log('🔄 Carrito modificado recientemente, verificando cambios...');
          
          // Forzar actualización del carrito para detectar cambios
          const token = localStorage.getItem('token');
          await fetchCart(token);
        }
      }, 10000); // Verificar cada 10 segundos
      
      return () => clearInterval(interval);
    }
  }, [step, orderCreated, fetchCart]);

  const steps = [
    { number: 1, label: "Carrito", icon: ShoppingBag },
    { number: 2, label: isAuthenticated ? "Envío" : "Datos", icon: isAuthenticated ? MapPin : User },
    { number: 3, label: "Pago", icon: CreditCard },
  ];

  // 🔴 CALCULAR TOTAL CON DESCUENTO DE PRIMERA COMPRA PARA MOSTRAR
  const calculateTotalWithFirstPurchaseDiscount = useCallback(() => {
    if (firstPurchaseDiscount.applied && firstPurchaseDiscount.amount > 0) {
      // El total ya incluye el descuento de primera compra (viene del backend)
      return total;
    }
    return total;
  }, [total, firstPurchaseDiscount]);

  // 🔴 CALCULAR SUBTOTAL CON DESCUENTO DE PRODUCTOS PARA MOSTRAR
  const calculateSubtotalAfterProductDiscounts = useCallback(() => {
    return subtotal; // Esto ya viene con los descuentos de productos del backend
  }, [subtotal]);

  if (loading && step === 1) {
    return (
      <div className="checkout-page">
        <div className="checkout-loading-state">
          <div className="checkout-spinner"></div>
          <p>Cargando tu carrito...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-decorative-elements">
        <div className="checkout-decorative-icon star">
          <Star className="checkout-icon-sm" fill="currentColor" />
        </div>
        <div className="checkout-decorative-icon moon">
          <Star className="checkout-icon-md" />
        </div>
        <div className="checkout-decorative-icon rocket">
          <Star className="checkout-icon-lg" />
        </div>
        <div className="checkout-decorative-icon sparkles">
          <Sparkles className="checkout-icon-sm" />
        </div>
      </div>

      {/* 🔴 NOTIFICACIÓN DE AJUSTE DE CARRITO */}
      {needsCartAdjustment && adjustedItems.length > 0 && (
        <div className="checkout-cart-adjustment-notification">
          <div className="checkout-cart-adjustment-content">
            <div className="checkout-cart-adjustment-header">
              <RefreshCw className="checkout-icon spinning" />
              <h4>Stock actualizado</h4>
              <button 
                className="checkout-cart-adjustment-close" 
                onClick={() => {
                  setNeedsCartAdjustment(false);
                  setAdjustedItems([]);
                }}
              >
                <X className="checkout-icon" />
              </button>
            </div>
            <p className="checkout-cart-adjustment-message">
              Algunos productos en tu carrito excedían el stock disponible. Hemos ajustado las cantidades:
            </p>
            <div className="checkout-cart-adjustment-items">
              {adjustedItems.map((item) => (
                <div key={item.id} className="checkout-cart-adjustment-item">
                  <span className="checkout-cart-adjustment-name">{item.name}</span>
                  <span className="checkout-cart-adjustment-qty">
                    {item.oldQty} → {item.newQty}
                  </span>
                </div>
              ))}
            </div>
            <button 
              className="checkout-btn checkout-btn-outline checkout-btn-sm"
              onClick={() => {
                setNeedsCartAdjustment(false);
                setAdjustedItems([]);
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* 🔴 BANNER DE DESCUENTO PRIMERA COMPRA */}
      {firstPurchaseDiscount.applied && firstPurchaseDiscount.percentage > 0 && (
        <div className="checkout-first-purchase-banner">
          <div className="checkout-first-purchase-content">
            <Gift className="checkout-icon" size={24} />
            <div className="checkout-first-purchase-text">
              <h4>🎉 ¡Felicidades! Tienes {firstPurchaseDiscount.percentage}% de descuento en tu primera compra</h4>
              <p>Hemos aplicado un descuento de {formatPrice(firstPurchaseDiscount.amount)} a tu orden</p>
            </div>
          </div>
        </div>
      )}

      <div className="checkout-progress-section">
        <div className="checkout-progress-container">
          <div className="checkout-progress-steps">
            <div className="checkout-progress-line">
              <div className="checkout-progress-line-fill" style={{ width: `${((step - 1) / 2) * 100}%` }} />
            </div>

            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = step >= s.number;
              const isCurrent = step === s.number;

              return (
                <div key={s.number} className={`checkout-step ${isActive ? "active" : ""} ${isCurrent ? "current" : ""}`}>
                  <div className="checkout-step-circle">
                    {isActive && step > s.number ? (
                      <Check className="checkout-icon" strokeWidth={3} />
                    ) : (
                      <Icon className="checkout-icon" />
                    )}
                  </div>
                  <span className="checkout-step-label">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <main className="checkout-main">
        {error && (
          <div className="checkout-error-message">
            <AlertCircle className="checkout-icon" />
            <span>{error}</span>
            <button onClick={() => setError("")}>
              <X className="checkout-icon" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="checkout-success-message">
            <Check className="checkout-icon" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="checkout-main-grid">
          <div className="checkout-main-content">
            {step === 1 && (
              <div className="checkout-animate-in">
                <div className="checkout-section-header">
                  <div className="checkout-section-icon cart">
                    <ShoppingBag className="checkout-icon" />
                  </div>
                  <div>
                    <h2 className="checkout-section-title">Tu Carrito</h2>
                    <p className="checkout-section-subtitle">{cartItems.length} producto(s) - {totalItems} unidad(es)</p>
                    {!isAuthenticated && (
                      <p className="checkout-guest-notice">
                        <User className="checkout-icon" size={16} />
                        Estás comprando como invitado
                      </p>
                    )}
                  </div>
                </div>

                {cartItems.length === 0 ? (
                  <div className="checkout-empty-cart">
                    <div className="checkout-empty-cart-icon">
                      <ShoppingBag className="checkout-icon" />
                    </div>
                    <h3>Tu carrito está vacío</h3>
                    <p>¡Explora nuestra colección de pijamas espaciales!</p>
                    <button className="checkout-btn checkout-btn-secondary" onClick={() => (window.location.href = "/")}>
                      Seguir Comprando
                    </button>
                  </div>
                ) : (
                  <div className="checkout-cart-items">
                    {cartItems.map((item) => (
                      <div key={`cart-${item.id}`} className="checkout-cart-item">
                        <div className="checkout-cart-item-inner">
                          <div className="checkout-cart-item-image">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              style={{ objectFit: "cover" }}
                              sizes="(max-width: 640px) 100vw, 9rem"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/images/placeholder.png';
                              }}
                            />
                            {item.hasDiscount && item.discountPercentage && item.discountPercentage > 0 && (
                              <span className="checkout-cart-item-discount-badge">
                                -{item.discountPercentage}%
                              </span>
                            )}
                            <span className="checkout-cart-item-size-badge">{item.size}</span>
                          </div>

                          <div className="checkout-cart-item-content">
                            <div>
                              <h3 className="checkout-cart-item-name">{item.name}</h3>
                              <div className="checkout-cart-item-badges">
                                <span className="checkout-badge checkout-badge-outline checkout-badge-purple">{item.color}</span>
                                <span className="checkout-badge checkout-badge-outline checkout-badge-mint">
                                Disponible
                                </span>
                                {item.hasDiscount && item.discountPercentage && item.discountPercentage > 0 && (
                                  <span className="checkout-badge checkout-badge-discount">
                                    <Star className="checkout-icon" size={12} />
                                    Oferta especial
                                  </span>
                                )}
                              </div>
                              {renderItemPrice(item)}
                            </div>

                            <div className="checkout-cart-item-actions">
                              <div className="checkout-quantity-controls">
                                <button
                                  className="checkout-quantity-btn"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  disabled={loading || item.quantity <= 1}
                                >
                                  <Minus className="checkout-icon" />
                                </button>
                                <span className="checkout-quantity-value">{item.quantity}</span>
                                <button
                                  className="checkout-quantity-btn"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  disabled={loading || Boolean(((item.maxStock ?? item.stock) ?? 0) && item.quantity >= (item.maxStock ?? item.stock ?? 0))}
                                >
                                  <Plus className="checkout-icon" />
                                </button>
                              </div>

                              <div className="checkout-cart-item-subtotal">
                                <p className="checkout-subtotal-text">
                                  Subtotal: <span>{formatPrice(item.price * item.quantity)}</span>
                                </p>
                                <button 
                                  className="checkout-delete-btn" 
                                  onClick={() => removeItem(item.id)}
                                  disabled={loading}
                                >
                                  <Trash2 className="checkout-icon" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="checkout-animate-in-right">
                <div className="checkout-section-header">
                  <div className="checkout-section-icon address">
                    {isAuthenticated ? <MapPin className="checkout-icon" /> : <User className="checkout-icon" />}
                  </div>
                  <div>
                    <h2 className="checkout-section-title">
                      {isAuthenticated ? 'Dirección de Envío' : 'Tus Datos de Contacto'}
                    </h2>
                    <p className="checkout-section-subtitle">
                      {isAuthenticated ? '¿A dónde enviamos tus pijamas?' : 'Necesitamos algunos datos para tu pedido'}
                    </p>
                  </div>
                </div>

                <div className="checkout-card">
                  <div className="checkout-card-content">
                    {!isAuthenticated && (
                      <div className="checkout-user-info-form">
                        <h3 className="checkout-user-info-title">
                          <User className="checkout-icon" />
                          Información de Contacto
                        </h3>
                        <div className="checkout-form-grid">
                          <div className="checkout-form-group">
                            <label htmlFor="email">
                              <Mail className="checkout-icon" size={16} />
                              Email *
                            </label>
                            <input
                              id="email"
                              type="email"
                              className="checkout-form-input"
                              placeholder="tu@email.com"
                              value={anonymousUserInfo.email}
                              onChange={(e) => setAnonymousUserInfo({...anonymousUserInfo, email: e.target.value})}
                              required
                            />
                          </div>
                          
                          <div className="checkout-form-grid-2">
                            <div className="checkout-form-group">
                              <label htmlFor="firstName">Nombre *</label>
                              <input
                                id="firstName"
                                type="text"
                                className="checkout-form-input"
                                placeholder="Tu nombre"
                                value={anonymousUserInfo.firstName}
                                onChange={(e) => setAnonymousUserInfo({...anonymousUserInfo, firstName: e.target.value})}
                                required
                              />
                            </div>
                            <div className="checkout-form-group">
                              <label htmlFor="lastName">Apellido</label>
                              <input
                                id="lastName"
                                type="text"
                                className="checkout-form-input"
                                placeholder="Tu apellido"
                                value={anonymousUserInfo.lastName}
                                onChange={(e) => setAnonymousUserInfo({...anonymousUserInfo, lastName: e.target.value})}
                              />
                            </div>
                          </div>
                          
                          <div className="checkout-form-group">
                            <label htmlFor="phone">
                              <Phone className="checkout-icon" size={16} />
                              Teléfono *
                            </label>
                            <input
                              id="phone"
                              type="tel"
                              className="checkout-form-input"
                              placeholder="+57 300 123 4567"
                              value={anonymousUserInfo.phone}
                              onChange={(e) => setAnonymousUserInfo({...anonymousUserInfo, phone: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="checkout-address-section">
                      <h3 className="checkout-address-section-title">
                        <MapPin className="checkout-icon" />
                        Dirección de Envío
                      </h3>

                      {isAuthenticated ? (
                        <>
                          {loading ? (
                            <div className="checkout-loading-state">
                              <div className="checkout-spinner"></div>
                              <p>Cargando tus direcciones...</p>
                            </div>
                          ) : userData && userData.addresses.length === 0 ? (
                            <div className="checkout-empty-address">
                              <MapPin className="checkout-icon" />
                              <p>No tienes direcciones guardadas</p>
                            </div>
                          ) : userData ? (
                            <div className="checkout-address-list">
                              {userData.addresses.map((address) => (
                                <div
                                  key={address.id}
                                  onClick={() => setSelectedAddress(address)}
                                  className={`checkout-address-card ${selectedAddress?.id === address.id ? "selected" : ""}`}
                                >
                                  <div className="checkout-address-card-inner">
                                    <div className="checkout-address-radio">
                                      {selectedAddress?.id === address.id && <Check className="checkout-icon" strokeWidth={3} />}
                                    </div>
                                    <div className="checkout-address-details">
                                      <p>{address.address}</p>
                                      <p>
                                        {address.city}, {address.state}
                                      </p>
                                      <p>{address.country}</p>
                                    </div>
                                    <button
                                      className="checkout-address-delete-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteAddress(address.id);
                                      }}
                                      disabled={loading}
                                    >
                                      <Trash2 className="checkout-icon" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {addingAddress ? (
                            <div className="checkout-add-address-form">
                              <h3 className="checkout-add-address-title">
                                <Plus className="checkout-icon" />
                                Nueva Dirección
                              </h3>
                              <div className="checkout-form-grid">
                                <div className="checkout-form-group">
                                  <label htmlFor="address">Dirección Completa *</label>
                                  <input
                                    id="address"
                                    type="text"
                                    className="checkout-form-input"
                                    placeholder="Calle 123 #45-67, Apto 301"
                                    value={newAddress.address}
                                    onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                                    required
                                  />
                                </div>
                                <div className="checkout-form-grid-2">
                                  <div className="checkout-form-group">
                                    <label htmlFor="city">Ciudad *</label>
                                    <input
                                      id="city"
                                      type="text"
                                      className="checkout-form-input"
                                      placeholder="Bogotá"
                                      value={newAddress.city}
                                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                                      required
                                    />
                                  </div>
                                  <div className="checkout-form-group">
                                    <label htmlFor="state">Departamento *</label>
                                    <input
                                      id="state"
                                      type="text"
                                      className="checkout-form-input"
                                      placeholder="Cundinamarca"
                                      value={newAddress.state}
                                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                                      required
                                    />
                                  </div>
                                </div>
                                <div className="checkout-form-group">
                                  <label htmlFor="country">País *</label>
                                  <input
                                    id="country"
                                    type="text"
                                    className="checkout-form-input"
                                    placeholder="Colombia"
                                    value={newAddress.country}
                                    onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                                    required
                                  />
                                </div>
                                <div className="checkout-form-actions">
                                  <button onClick={addAddress} className="checkout-btn checkout-btn-primary" disabled={loading}>
                                    <Check className="checkout-icon" />
                                    {loading ? 'Guardando...' : 'Guardar'}
                                  </button>
                                  <button onClick={() => setAddingAddress(false)} className="checkout-btn checkout-btn-outline">
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button 
                              className="checkout-add-address-btn" 
                              onClick={() => setAddingAddress(true)}
                              disabled={loading}
                            >
                              <Plus className="checkout-icon" />
                              Agregar Nueva Dirección
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="checkout-anonymous-address-form">
                          <div className="checkout-form-grid">
                            <div className="checkout-form-group">
                              <label htmlFor="anon-address">Dirección Completa *</label>
                              <input
                                id="anon-address"
                                type="text"
                                className="checkout-form-input"
                                placeholder="Calle 123 #45-67, Apto 301"
                                value={selectedAddress?.address || ''}
                                onChange={(e) => setSelectedAddress({
                                  ...selectedAddress || {id: Date.now(), city: '', state: '', country: ''},
                                  address: e.target.value
                                })}
                                required
                              />
                            </div>
                            <div className="checkout-form-grid-2">
                              <div className="checkout-form-group">
                                <label htmlFor="anon-city">Ciudad *</label>
                                <input
                                  id="anon-city"
                                  type="text"
                                  className="checkout-form-input"
                                  placeholder="Bogotá"
                                  value={selectedAddress?.city || ''}
                                  onChange={(e) => setSelectedAddress({
                                    ...selectedAddress || {id: Date.now(), address: '', state: '', country: ''},
                                    city: e.target.value
                                  })}
                                  required
                                />
                              </div>
                              <div className="checkout-form-group">
                                <label htmlFor="anon-state">Departamento *</label>
                                <input
                                  id="anon-state"
                                  type="text"
                                  className="checkout-form-input"
                                  placeholder="Cundinamarca"
                                  value={selectedAddress?.state || ''}
                                  onChange={(e) => setSelectedAddress({
                                    ...selectedAddress || {id: Date.now(), address: '', city: '', country: ''},
                                    state: e.target.value
                                  })}
                                  required
                                />
                              </div>
                            </div>
                            <div className="checkout-form-group">
                              <label htmlFor="anon-country">País *</label>
                              <input
                                id="anon-country"
                                type="text"
                                className="checkout-form-input"
                                placeholder="Colombia"
                                value={selectedAddress?.country || ''}
                                onChange={(e) => setSelectedAddress({
                                  ...selectedAddress || {id: Date.now(), address: '', city: '', state: ''},
                                  country: e.target.value
                                })}
                                required
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="checkout-animate-in-right">
                <div className="checkout-section-header">
                  <div className="checkout-section-icon payment">
                    <CreditCard className="checkout-icon" />
                  </div>
                  <div>
                    <h2 className="checkout-section-title">Confirmar y Pagar</h2>
                    <p className="checkout-section-subtitle">Un paso más y tus pijamas van a Marte</p>
                    {!isAuthenticated && (
                      <p className="checkout-guest-notice">
                        <User className="checkout-icon" size={16} />
                        Pedido como: {anonymousUserInfo.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="checkout-card">
                  <div className="checkout-card-content">
                    <div className="checkout-summary-section">
                      <div className="checkout-user-summary">
                        <div className="checkout-user-summary-header">
                          <User className="checkout-icon" />
                          <span>Datos del cliente:</span>
                        </div>
                        <p>
                          {isAuthenticated 
                            ? `${userData?.firstName || ''} ${userData?.lastName || ''} (${userData?.email || ''})`
                            : `${anonymousUserInfo.firstName} ${anonymousUserInfo.lastName} (${anonymousUserInfo.email})`
                          }
                          <br />
                          Tel: {isAuthenticated ? userData?.phone || '' : anonymousUserInfo.phone}
                        </p>
                      </div>

                      {selectedAddress && (
                        <div className="checkout-shipping-summary">
                          <div className="checkout-shipping-summary-header">
                            <MapPin className="checkout-icon" />
                            <span>Envío a:</span>
                          </div>
                          <p>
                            {selectedAddress.address}
                            <br />
                            {selectedAddress.city}, {selectedAddress.state}
                            <br />
                            {selectedAddress.country}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="checkout-order-items-preview">
                      <h4>Resumen de Productos</h4>
                      {cartItems.map((item) => (
                        <div key={item.id} className="checkout-order-item-preview">
                          <div className="checkout-order-item-preview-image">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              style={{ objectFit: "cover" }}
                              sizes="3.5rem"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/images/placeholder.png';
                              }}
                            />
                            {item.hasDiscount && item.discountPercentage && item.discountPercentage > 0 && (
                              <span className="checkout-order-item-preview-discount-badge">
                                -{item.discountPercentage}%
                              </span>
                            )}
                          </div>
                          <div className="checkout-order-item-preview-details">
                            <p className="checkout-order-item-preview-name">{item.name}</p>
                            <p className="checkout-order-item-preview-meta">
                              {item.size} • {item.color} • x{item.quantity}
                            </p>
                          </div>
                          <span className="checkout-order-item-preview-price">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    {/* 🔴 SECCIÓN DE RESUMEN CON DESCUENTO DE PRIMERA COMPRA */}
                    <div className="checkout-total-summary">
                      <div className="checkout-summary-row">
                        <span>Subtotal productos:</span>
                        <span>{formatPrice(originalSubtotal)}</span>
                      </div>
                      
                      {discountSavings > 0 && (
                        <div className="checkout-summary-row checkout-discount">
                          <span>
                            <Star className="checkout-icon" size={14} />
                            Descuentos en productos:
                          </span>
                          <span className="checkout-discount-amount">-{formatPrice(discountSavings)}</span>
                        </div>
                      )}
                      
                      <div className="checkout-summary-row">
                        <span>Subtotal con descuentos:</span>
                        <span>{formatPrice(subtotal)}</span>
                      </div>
                      
                      {firstPurchaseDiscount.applied && firstPurchaseDiscount.amount > 0 && (
                        <>
                          <div className="checkout-summary-row checkout-first-purchase">
                            <span>
                              <Gift className="checkout-icon" size={14} />
                              Descuento primera compra ({firstPurchaseDiscount.percentage}%):
                            </span>
                            <span className="checkout-first-purchase-amount">-{formatPrice(firstPurchaseDiscount.amount)}</span>
                          </div>
                          <div className="checkout-summary-row checkout-subtotal-after-first">
                            <span>Subtotal después del descuento:</span>
                            <span>{formatPrice(subtotal - firstPurchaseDiscount.amount)}</span>
                          </div>
                        </>
                      )}
                      
                      <div className="checkout-summary-row">
                        <span>Envío:</span>
                        <span className={shippingCost === 0 ? "free" : ""}>
                          {shippingCost === 0 ? "Gratis" : formatPrice(shippingCost)}
                        </span>
                      </div>
                      
                      <div className="checkout-summary-total">
                        <span className="checkout-total-label">TOTAL A PAGAR:</span>
                        <span className="checkout-total-amount">{formatPrice(total)}</span>
                      </div>
                      
                      {firstPurchaseDiscount.applied && (
                        <div className="checkout-first-purchase-message">
                          <Sparkles className="checkout-icon" size={16} />
                          <p>¡Has ahorrado {formatPrice(firstPurchaseDiscount.amount)} en tu primera compra! 🎉</p>
                        </div>
                      )}
                    </div>

                    {isProcessingPayment && (
                      <div className="checkout-processing-payment">
                        <div className="checkout-spinner large"></div>
                        <h4>Creando tu pedido...</h4>
                        <p>Estamos preparando todo para que puedas realizar el pago.</p>
                      </div>
                    )}

                    {mercadoPagoLoading && (
                      <div className="checkout-processing-payment">
                        <div className="checkout-spinner large purple"></div>
                        <h4>Conectando con MercadoPago...</h4>
                        <p>Preparando tu pago seguro.</p>
                      </div>
                    )}

                    {paymentStatus && (
                      <div className="checkout-payment-status">
                        <div className="checkout-payment-status-header">
                          <WalletIcon className="checkout-icon" />
                          <h4>Estado del Pago</h4>
                        </div>
                        <div className="checkout-payment-status-info">
                          <div className="checkout-payment-status-row">
                            <span>Orden:</span>
                            <strong>#{paymentStatus.orderId}</strong>
                          </div>
                          <div className="checkout-payment-status-row">
                            <span>Estado Orden:</span>
                            <span className={`checkout-payment-status-badge ${paymentStatus.status === 'PENDIENTE' ? 'pending' : paymentStatus.status === 'PAGO_APROBADO' ? 'approved' : 'rejected'}`}>
                              {paymentStatus.status}
                            </span>
                          </div>
                          {paymentStatus.mercadoPagoStatus && (
                            <div className="checkout-payment-status-row">
                              <span>Estado MercadoPago:</span>
                              <span className={`checkout-payment-status-badge ${paymentStatus.mercadoPagoStatus === 'pending' ? 'pending' : paymentStatus.mercadoPagoStatus === 'approved' ? 'approved' : 'rejected'}`}>
                                {paymentStatus.mercadoPagoStatus}
                              </span>
                            </div>
                          )}
                          {paymentStatus.stockReservationMinutesLeft !== undefined && (
                            <div className="checkout-payment-status-row">
                              <span>Tiempo reserva:</span>
                              <span className={paymentStatus.stockReservationMinutesLeft > 0 ? 'text-green-600' : 'text-red-600'}>
                                {paymentStatus.stockReservationMinutesLeft > 0 
                                  ? `${paymentStatus.stockReservationMinutesLeft} minutos` 
                                  : 'Expirada'}
                              </span>
                            </div>
                          )}
                          
                          {/* 🔴 MOSTRAR DESCUENTO DE PRIMERA COMPRA EN EL ESTADO DEL PAGO */}
                          {paymentStatus.firstPurchaseDiscountApplied && paymentStatus.firstPurchaseDiscountAmount && paymentStatus.firstPurchaseDiscountAmount > 0 && (
                            <div className="checkout-payment-status-row checkout-success">
                              <span>
                                <Gift className="checkout-icon" size={14} />
                                Descuento primera compra:
                              </span>
                              <span className="text-green-600">-{formatPrice(paymentStatus.firstPurchaseDiscountAmount)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 🔴 CHECKOUT PRO - INICIALIZADO DINÁMICAMENTE */}
                    {orderCreated && mercadoPagoData?.preferenceId && !mercadoPagoLoading && !isProcessingPayment && (
                      <div className="checkout-payment-action">
                        <div className="checkout-payment-ready">
                          <div className="checkout-payment-ready-header">
                            <Check className="checkout-icon" />
                            <h4>¡Listo para pagar!</h4>
                          </div>
                          <p>Tu orden ha sido creada. Completa el pago seguro con Mercado Pago.</p>
                          
                          <div className="checkout-payment-buttons">
                            {/* Si MercadoPago está inicializado, mostrar el Wallet */}
                            {isMercadoPagoInitialized && publicKey && (
                              <div className="wallet-container" style={{ width: '100%', minHeight: '48px' }}>
                                <Wallet 
                                  initialization={{ 
                                    preferenceId: mercadoPagoData.preferenceId,
                                    redirectMode: "blank"
                                  }}
                                />
                              </div>
                            )}
                            
                            {/* Fallback: usar initPoint si no se inicializó MercadoPago */}
                            {(!isMercadoPagoInitialized || !publicKey) && mercadoPagoData.initPoint && (
                              <div className="checkout-fallback-buttons">
                                <div className="checkout-fallback-alert">
                                  <AlertCircle className="checkout-icon" />
                                  <span>Usando método alternativo de pago</span>
                                </div>
                                <button
                                  className="checkout-btn checkout-btn-primary checkout-btn-lg checkout-btn-full"
                                  onClick={() => {
                                    window.location.href = mercadoPagoData.initPoint;
                                  }}
                                >
                                  <CreditCard className="checkout-icon" />
                                  Pagar con MercadoPago
                                </button>
                              </div>
                            )}
                            
                            <div className="checkout-security-badges">
                              <div className="checkout-security-badge">
                                <Lock className="checkout-icon" size={14} />
                                <span>Pago 100% seguro</span>
                              </div>
                              <div className="checkout-security-badge">
                                <Check className="checkout-icon" size={14} />
                                <span>Certificado SSL</span>
                              </div>
                              <div className="checkout-security-badge">
                                <Shield size={14} />
                                <span>Protegido por Mercado Pago</span>
                              </div>
                            </div>
                            
                            {/* 🔴 TIMER DE EXPIRACIÓN DISCRETO */}
                            {paymentStatus?.stockReservationMinutesLeft && paymentStatus.stockReservationMinutesLeft > 0 && (
                              <div className="checkout-expiration-timer">
                                <Clock className="checkout-icon" size={14} />
                                <span>La reserva de stock expira en {paymentStatus.stockReservationMinutesLeft} minutos</span>
                                <div className="checkout-expiration-progress">
                                  <div 
                                    className="checkout-expiration-progress-bar"
                                    style={{ width: `${(paymentStatus.stockReservationMinutesLeft / 10) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {orderCreated && !mercadoPagoData && !isProcessingPayment && !mercadoPagoLoading && (
                      <div className="checkout-payment-fallback">
                        <AlertCircle className="checkout-icon" />
                        <h4>Orden creada - Preparando pago</h4>
                        <p>Tu orden #{orderId} ha sido creada. Preparamos tu pago seguro.</p>
                        <button 
                          className="checkout-btn checkout-btn-primary"
                          onClick={retryPayment}
                          disabled={mercadoPagoLoading}
                        >
                          {mercadoPagoLoading ? (
                            <>
                              <Loader2 className="checkout-icon spinning" />
                              Intentando nuevamente...
                            </>
                          ) : (
                            'Continuar con el pago'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="checkout-sidebar">
            <div className="checkout-sidebar-sticky">
              <div className="checkout-card">
                <div className="checkout-card-header navy">
                  <h3 className="checkout-card-header-title">
                    <Package className="checkout-icon" />
                    Resumen de Compra
                  </h3>
                  <span className="checkout-card-header-badge">{totalItems} {totalItems === 1 ? 'producto' : 'productos'}</span>
                </div>
                <div className="checkout-card-content">
                  <div className="checkout-summary-items">
                    {cartItems.map((item) => (
                      <div key={item.id} className="checkout-summary-item">
                        <span className="checkout-summary-item-name">
                          {item.name.length > 20 ? item.name.substring(0, 20) + "..." : item.name} x{item.quantity}
                          {item.hasDiscount && item.discountPercentage && item.discountPercentage > 0 && (
                            <span className="checkout-summary-item-discount"> (-{item.discountPercentage}%)</span>
                          )}
                        </span>
                        <span className="checkout-summary-item-price">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="checkout-summary-divider">
                    {originalSubtotal > subtotal && (
                      <div className="checkout-summary-row checkout-summary-discount">
                        <span>Subtotal original</span>
                        <span className="checkout-original-price">{formatPrice(originalSubtotal)}</span>
                      </div>
                    )}
                    
                    <div className="checkout-summary-row">
                      <span>Subtotal con descuentos</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    
                    {discountSavings > 0 && (
                      <div className="checkout-summary-row checkout-discount-savings">
                        <span>
                          <Check className="checkout-icon" size={12} />
                          Descuentos en productos
                        </span>
                        <span className="checkout-savings">-{formatPrice(discountSavings)}</span>
                      </div>
                    )}
                    
                    {/* 🔴 MOSTRAR DESCUENTO PRIMERA COMPRA EN SIDEBAR */}
                    {firstPurchaseDiscount.applied && firstPurchaseDiscount.amount > 0 && (
                      <div className="checkout-summary-row checkout-first-purchase-sidebar">
                        <span>
                          <Gift className="checkout-icon" size={12} />
                          Descuento primera compra ({firstPurchaseDiscount.percentage}%)
                        </span>
                        <span className="checkout-first-purchase-amount">-{formatPrice(firstPurchaseDiscount.amount)}</span>
                      </div>
                    )}
                    
                    <div className="checkout-summary-row">
                      <span>Envío</span>
                      <span className={shippingCost === 0 ? "free" : ""}>
                        {shippingCost === 0 ? "Gratis" : formatPrice(shippingCost)}
                      </span>
                    </div>
                  </div>

                  <div className="checkout-summary-total">
                    <span className="checkout-summary-total-label">Total</span>
                    <span className="checkout-summary-total-value">{formatPrice(total)}</span>
                  </div>
                  <p className="checkout-summary-iva">Incluye IVA</p>

                  <div className="checkout-trust-badges">
                    <div className="checkout-trust-badges-grid">
                      <div className="checkout-trust-badge">
                        <div className="checkout-trust-badge-icon mint">
                          <Check className="checkout-icon" />
                        </div>
                        <span>Pago Seguro</span>
                      </div>
                      <div className="checkout-trust-badge">
                        <div className="checkout-trust-badge-icon purple">
                          <Package className="checkout-icon" />
                        </div>
                        <span>Envío Rápido</span>
                      </div>
                      <div className="checkout-trust-badge">
                        <div className="checkout-trust-badge-icon orange">
                          <Star className="checkout-icon" />
                        </div>
                        <span>Calidad Garantizada</span>
                      </div>
                      <div className="checkout-trust-badge">
                        <div className="checkout-trust-badge-icon coral">
                          <Shield size={14} />
                        </div>
                        <span>100% Seguro</span>
                      </div>
                    </div>
                  </div>

                  {!isAuthenticated && (
                    <div className="checkout-login-prompt">
                      <User className="checkout-icon" size={16} />
                      <p>
                        <strong>¿Quieres guardar tus datos?</strong>
                        <br />
                        <small>
                          <a href="" className="checkout-login-link">
                          Iniciar sesión (próximamente)
                          </a>{' '}
                          para guardar direcciones y ver tu historial de pedidos.
                        </small>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="checkout-promo-card">
                <div className="checkout-promo-card-content">
                  <div className="checkout-promo-sparkles">
                    <Sparkles className="checkout-icon" />
                  </div>
                  <h4>
                    <Star className="checkout-icon" fill="currentColor" />
                    Dulces Sueños Garantizados
                  </h4>
                  <p>Nuestros pijamas están hechos con amor para que tus pequeños viajen a las estrellas cada noche.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="checkout-navigation-buttons">
          {step > 1 && (
            <button className="checkout-btn checkout-btn-outline checkout-btn-lg" onClick={prevStep} disabled={loading || isProcessingPayment}>
              <ChevronLeft className="checkout-icon" />
              Anterior
            </button>
          )}

          {step === 1 && cartItems.length > 0 && (
            <button className="checkout-btn checkout-btn-outline checkout-btn-lg" onClick={() => (window.location.href = "/")}>
              <ChevronLeft className="checkout-icon" />
              Seguir Comprando
            </button>
          )}

          {step < 3 && cartItems.length > 0 && (
            <button 
              className="checkout-btn checkout-btn-primary checkout-btn-lg" 
              onClick={nextStep} 
              disabled={
                (step === 2 && (
                  (isAuthenticated && !selectedAddress) || 
                  (!isAuthenticated && (!anonymousUserInfo.email || !anonymousUserInfo.firstName || !anonymousUserInfo.phone || !selectedAddress))
                )) || 
                loading || 
                isProcessingPayment ||
                needsCartAdjustment
              }
            >
              Continuar
              <ChevronRight className="checkout-icon" />
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default CheckoutPage;