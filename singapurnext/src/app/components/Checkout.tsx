'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import './Checkout.css';
import { 
  CART, 
  PERFIL_ME, 
  ADDRESS, 
  CHECKOUT_ANONYMOUS,
  CHECKOUT_AUTHENTICATED,
  MERCADOPAGO_SIMULATE
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
  Wallet,
  User,
  Mail,
  Phone
} from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
  stock?: number;
  productVariantId?: string;
}

interface Address {
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
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
  userId: number;
  shippingAddressId: number;
  orderItems: Array<{
    id: number;
    quantity: number;
    price: number;
    orderId: number;
    productVariantId: number;
  }>;
}

// Interface para checkout anónimo
interface AnonymousUserInfo {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

const CheckoutPage = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState<string>('');
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [step, setStep] = useState<number>(1);

  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    address: '',
    city: '',
    state: '',
    country: '',
  });

  // Datos para usuario anónimo
  const [anonymousUserInfo, setAnonymousUserInfo] = useState<AnonymousUserInfo>({
    email: '',
    firstName: '',
    lastName: '',
    phone: ''
  });

  const [orderCreated, setOrderCreated] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [simulationInProgress, setSimulationInProgress] = useState(false);
  
  // Refs
  const fetchControllerRef = useRef<AbortController | null>(null);
  const hasFetchedRef = useRef(false);

  // Formateador de precio
  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }, []);

  const calculateTotal = useCallback((items: CartItem[]) => {
    const newTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    setTotal(newTotal);
  }, []);

  // Fetch carrito (funciona para ambos tipos de usuarios)
  const fetchCart = useCallback(async (token: string | null, signal?: AbortSignal) => {
    try {
      console.log('🛒 Fetching cart data...');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(CART, {
        headers,
        signal,
        credentials: 'include' // CRÍTICO: Esto envía las cookies automáticamente
      });
      
      console.log('🛒 Response status:', res.status);
      
      if (!res.ok) {
        if (res.status === 404 || res.status === 204) {
          console.log('🛒 Carrito vacío');
          setCartItems([]);
          calculateTotal([]);
          return;
        }
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('🛒 Datos del carrito recibidos:', data);
      
      // Validar que la respuesta sea un array
      if (!Array.isArray(data)) {
        console.error('🛑 La respuesta no es un array:', data);
        setCartItems([]);
        calculateTotal([]);
        return;
      }
      
      const items: CartItem[] = data.map(
        (item: {
          id?: number | string;
          imageUrls?: string[];
          imageUrl?: string;
          productName?: string;
          name?: string;
          price?: number;
          productVariant?: { price?: number; size?: string; color?: string; stock?: number };
          size?: string;
          color?: string;
          quantity?: number;
          stock?: number;
          productVariantId?: number | string;
        }) => ({
          id: item.id?.toString() || `item-${Date.now()}-${Math.random()}`,
          image: item.imageUrls?.[0]?.trim() || item.imageUrl?.trim() || '/images/placeholder.png',
          name: item.productName?.trim() || item.name?.trim() || 'Producto',
          price: item.price || item.productVariant?.price || 0,
          size: item.size || item.productVariant?.size || '',
          color: item.color || item.productVariant?.color || '',
          quantity: item.quantity || 1,
          stock: item.stock || item.productVariant?.stock || 100,
          productVariantId: item.productVariantId?.toString() || item.id?.toString(),
        })
      );
      
      setCartItems(items);
      calculateTotal(items);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name !== 'AbortError') {
        console.error('🛑 Error fetching cart:', err);
        // Si hay error, intentar cargar desde localStorage como fallback
        const pendingCart = localStorage.getItem('pendingCartItem');
        if (pendingCart && !token) {
          try {
            const parsed = JSON.parse(pendingCart) as {
              id?: string | number;
              image?: string;
              imageUrl?: string;
              name?: string;
              productName?: string;
              price?: number;
              size?: string;
              color?: string;
              quantity?: number;
              stock?: number;
            };
            const fallbackItem: CartItem = {
              id: parsed.id?.toString() || `pending-${Date.now()}`,
              image: parsed.image?.trim() || parsed.imageUrl?.trim() || '/images/placeholder.png',
              name: parsed.name?.trim() || parsed.productName?.trim() || 'Producto',
              price: parsed.price || 0,
              size: parsed.size || '',
              color: parsed.color || '',
              quantity: parsed.quantity || 1,
              stock: parsed.stock || 100,
            };
            setCartItems([fallbackItem]);
            calculateTotal([fallbackItem]);
          } catch {
            setCartItems([]);
            calculateTotal([]);
          }
        } else {
          setCartItems([]);
          calculateTotal([]);
        }
        throw err;
      }
    }
  }, [calculateTotal]);

  // Fetch usuario (solo autenticados)
  const fetchUser = useCallback(async (token: string, signal?: AbortSignal) => {
    try {
      console.log('👤 Fetching user data...');
      const res = await fetch(PERFIL_ME, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal,
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      
      const user = await res.json() as UserData;
      console.log('👤 Datos de usuario recibidos:', user);
      
      // Procesar direcciones
      if (user.addresses && Array.isArray(user.addresses)) {
        const uniqueAddresses = new Map();
        user.addresses.forEach((address: Address) => {
          if (!uniqueAddresses.has(address.id)) {
            uniqueAddresses.set(address.id, address);
          }
        });
        
        user.addresses = Array.from(uniqueAddresses.values());
      } else {
        user.addresses = [];
      }
      
      setUserData(user);
      if (user.addresses && user.addresses.length > 0) {
        setSelectedAddress(user.addresses[0]);
      }

      // Prellenar datos del usuario en el formulario anónimo
      setAnonymousUserInfo({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || ''
      });
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name !== 'AbortError') {
        console.error('🛑 Error fetching user:', err);
        throw err;
      }
    }
  }, []);

  // Verificar autenticación y cargar datos
  useEffect(() => {
    const token = localStorage.getItem('token');
    const isAuth = !!token;
    setIsAuthenticated(isAuth);

    if (isAuth && !hasFetchedRef.current) {
      loadAuthenticatedData(token!);
    } else if (!isAuth && !hasFetchedRef.current) {
      loadAnonymousCart();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        console.error('Error loading authenticated data:', error);
        setError('Error cargando los datos');
      }
    } finally {
      setLoading(false);
    }
  }, [fetchCart, fetchUser]);

  const loadAnonymousCart = useCallback(async () => {
    setLoading(true);
    try {
      // El carrito anónimo se carga sin token, con cookies
      await fetchCart(null);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error loading anonymous cart:', error);
      setError('Error cargando el carrito');
    } finally {
      setLoading(false);
    }
  }, [fetchCart]);

  // Actualizar cantidad
  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const item = cartItems.find((i) => i.id === itemId);
    if (!item) return;
    
    if (item.stock && newQuantity > item.stock) {
      setError(`No hay suficiente stock disponible (máximo ${item.stock})`);
      return;
    }

    const token = localStorage.getItem('token');
    
    try {
      setLoading(true);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${CART}/update/${itemId}?quantity=${newQuantity}`, {
        method: 'PUT',
        headers,
        credentials: 'include' // IMPORTANTE: Envía cookies
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error ${res.status}: ${errorText || 'Error actualizando cantidad'}`);
      }
      
      // Actualizar UI localmente
      const updatedItems = cartItems.map((i) =>
        i.id === itemId ? { ...i, quantity: newQuantity } : i
      );
      setCartItems(updatedItems);
      calculateTotal(updatedItems);
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('🛑 Error updating quantity:', error);
      setError(`Error actualizando la cantidad: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar item
  const removeItem = async (itemId: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto del carrito?')) return;

    const token = localStorage.getItem('token');
    
    try {
      setLoading(true);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${CART}/remove/${itemId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include' // IMPORTANTE: Envía cookies
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error ${res.status}: ${errorText || 'Error eliminando producto'}`);
      }
      
      // Actualizar UI localmente
      const updatedItems = cartItems.filter((i) => i.id !== itemId);
      setCartItems(updatedItems);
      calculateTotal(updatedItems);
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('🛑 Error removing item:', error);
      setError(`Error eliminando el producto: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Agregar dirección (solo autenticados)
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
      const res = await fetch(ADDRESS, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
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
      setNewAddress({ address: '', city: '', state: '', country: '' });
      setError('');
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('🛑 Error adding address:', error);
      setError(`No se pudo agregar la dirección: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar dirección (solo autenticados)
  const deleteAddress = async (addressId: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No autenticado');
      return;
    }
    
    if (!confirm('¿Seguro que quieres eliminar esta dirección?')) return;

    try {
      setLoading(true);
      const res = await fetch(`${ADDRESS}/${addressId}`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
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
      console.error('🛑 Error deleting address:', error);
      setError(`No se pudo eliminar la dirección: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Navegación entre pasos
  const nextStep = () => {
    if (step === 1 && cartItems.length === 0) {
      setError('Tu carrito está vacío');
      return;
    }
    
    if (step === 2) {
      // Validar según tipo de usuario
      if (isAuthenticated) {
        if (!selectedAddress) {
          setError('Selecciona una dirección de envío');
          return;
        }
      } else {
        // Validar datos de usuario anónimo
        if (!anonymousUserInfo.email || !anonymousUserInfo.firstName || !anonymousUserInfo.phone) {
          setError('Completa tus datos de contacto para continuar');
          return;
        }
        
        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(anonymousUserInfo.email)) {
          setError('Ingresa un email válido');
          return;
        }
        
        // Validar teléfono (al menos 8 dígitos)
        if (anonymousUserInfo.phone.replace(/\D/g, '').length < 8) {
          setError('Ingresa un número de teléfono válido');
          return;
        }
        
        if (!selectedAddress) {
          setError('Debes agregar una dirección de envío');
          return;
        }
        
        // Validar campos de dirección
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

  // Crear orden y pago
  const createOrderAndPayment = useCallback(async () => {
    if (cartItems.length === 0) {
      setError('Carrito vacío');
      return;
    }
    
    if (!selectedAddress) {
      setError('Selecciona una dirección');
      return;
    }

    try {
      setIsProcessingPayment(true);
      setError('');
      setSuccessMessage('');

      console.log('🚀 Creando orden...');
      
      let orderResponse: OrderResponse;
      
      if (isAuthenticated) {
        // Checkout para usuario autenticado
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Usuario no autenticado');
        
        console.log('👤 Usuario autenticado, creando orden con shippingAddressId:', selectedAddress.id);
        
        const orderRes = await fetch(CHECKOUT_AUTHENTICATED, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            shippingAddressId: selectedAddress.id
          }),
        });

        console.log('📦 Orden autenticada response:', orderRes.status);
        
        if (!orderRes.ok) {
          let errorMessage = `Error ${orderRes.status}: ${orderRes.statusText}`;
          try {
            const errorData = await orderRes.text();
            errorMessage = errorData || errorMessage;
          } catch {}
          throw new Error(errorMessage);
        }

        orderResponse = await orderRes.json() as OrderResponse;
        console.log('✅ Orden autenticada creada:', orderResponse);
        
      } else {
        // Checkout para usuario anónimo
        if (!anonymousUserInfo.email) {
          throw new Error('Email requerido para usuarios anónimos');
        }
        
        console.log('👤 Usuario anónimo, creando orden con email:', anonymousUserInfo.email);
        
        const orderRes = await fetch(CHECKOUT_ANONYMOUS, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // CRÍTICO: Envía cookies con sessionId
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

        console.log('📦 Orden anónima response:', orderRes.status);
        
        if (!orderRes.ok) {
          let errorMessage = `Error ${orderRes.status}: ${orderRes.statusText}`;

          try {
            const errorData = await orderRes.text();
            errorMessage = errorData || errorMessage;
          } catch {}
          throw new Error(errorMessage);
        }

        orderResponse = await orderRes.json() as OrderResponse;
        console.log('✅ Orden anónima creada:', orderResponse);
      }

      if (!orderResponse.id) {
        throw new Error('No se pudo obtener el ID de la orden');
      }

      const orderId = orderResponse.id.toString();
      setOrderId(orderId);
      setOrderCreated(true);
      setSuccessMessage(`✅ Orden #${orderId} creada exitosamente. Usa los botones de simulación.`);

    } catch (err: unknown) {
      const error = err as Error;
      console.error('🛑 Error en checkout:', error);
      setError(`Error: ${error.message || 'Error desconocido'}`);
      setOrderCreated(false);
    } finally {
      setIsProcessingPayment(false);
    }
  }, [selectedAddress, cartItems, isAuthenticated, anonymousUserInfo]);

  // Simular pago (PARA DESARROLLO LOCAL)
  const simulatePayment = async (status: 'approved' | 'rejected') => {
    if (!orderId) {
        setError('No hay orden creada');
        return;
    }

    try {
        setSimulationInProgress(true);
        setError('');
        setSuccessMessage('');
        
        console.log('🎮 Simulando pago con status:', status, 'orderId:', orderId);
        
        // IMPORTANTE: Para usuarios autenticados, enviar el token
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(MERCADOPAGO_SIMULATE, {
            method: 'POST',
            headers,
            credentials: 'include', // Importante para enviar cookies (sessionId)
            body: JSON.stringify({
                orderId: parseInt(orderId),
                status: status
            }),
        });

        console.log('🎮 Simulación response:', response.status, response.statusText);
        
        const responseText = await response.text();
        console.log('🎮 Response body:', responseText);
        
        if (response.ok) {
            const result = JSON.parse(responseText);
            console.log('✅ Resultado simulación:', result);
            
            if (status === 'approved') {
                setSuccessMessage(`✅ Pago aprobado exitosamente! Orden #${orderId} confirmada.`);
                
                // Limpiar carrito localmente
                setCartItems([]);
                setTotal(0);
                
                // Limpiar localStorage de carrito pendiente
                localStorage.removeItem('pendingCartItem');
                
                // Opcional: Redirigir a página de éxito después de 2 segundos
                setTimeout(() => {
                    window.location.href = `/checkout/success?orderId=${orderId}`;
                }, 2000);
            } else {
                setError(`❌ Pago rechazado para orden #${orderId}.`);
                
                // Opcional: Redirigir a página de error después de 2 segundos
                setTimeout(() => {
                    window.location.href = `/checkout/failure?orderId=${orderId}`;
                }, 2000);
            }
        } else {
            console.error('❌ Error en simulación:', responseText);
            
            try {
                const errorJson = JSON.parse(responseText) as { error?: string };
                setError(`❌ Error simulando pago: ${errorJson.error || responseText}`);
            } catch {
                setError(`❌ Error simulando pago: ${responseText}`);
            }
            
            // Mostrar mensaje de error por 5 segundos
            setTimeout(() => setError(''), 5000);
        }
    } catch (error: unknown) {
        const err = error as Error;
        console.error('🛑 Error de conexión al simular pago:', err);
        setError(`❌ Error de conexión: ${err.message || 'Error desconocido'}`);
        
        // Mostrar mensaje de error por 5 segundos
        setTimeout(() => setError(''), 5000);
    } finally {
        setSimulationInProgress(false);
    }
};

  // Crear orden cuando llegamos al paso 3
  useEffect(() => {
    if (step === 3 && !orderCreated && !isProcessingPayment) {
      createOrderAndPayment();
    }
  }, [step, createOrderAndPayment, isProcessingPayment, orderCreated]);

  const steps = [
    { number: 1, label: "Carrito", icon: ShoppingBag },
    { number: 2, label: isAuthenticated ? "Envío" : "Datos", icon: isAuthenticated ? MapPin : User },
    { number: 3, label: "Pago", icon: CreditCard },
  ];

  if (loading && step === 1) {
    return (
      <div className="checkout-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando tu carrito...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      {/* Elementos decorativos */}
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

      {/* Info de usuario */}
      {!isAuthenticated && step > 1 && (
        <div className="checkout-user-info-banner">
          <User className="checkout-icon" />
          <span>Comprando como invitado</span>
          <button 
            onClick={() => window.location.href = '/auth/login?redirect=/checkout'}
            className="checkout-login-prompt-btn"
          >
            Iniciar sesión
          </button>
        </div>
      )}

      {/* Progress Steps */}
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

      {/* Main Content */}
      <main className="checkout-main">
        {/* Messages */}
        {error && (
          <div className="checkout-error-message">
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
          {/* Main Section */}
          <div className="checkout-main-content">
            {/* Step 1: Cart */}
            {step === 1 && (
              <div className="checkout-animate-in">
                <div className="checkout-section-header">
                  <div className="checkout-section-icon cart">
                    <ShoppingBag className="checkout-icon" />
                  </div>
                  <div>
                    <h2 className="checkout-section-title">Tu Carrito</h2>
                    <p className="checkout-section-subtitle">{cartItems.length} producto(s)</p>
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
                            <span className="checkout-cart-item-size-badge">{item.size}</span>
                          </div>

                          <div className="checkout-cart-item-content">
                            <div>
                              <h3 className="checkout-cart-item-name">{item.name}</h3>
                              <div className="checkout-cart-item-badges">
                                <span className="checkout-badge checkout-badge-outline checkout-badge-purple">{item.color}</span>
                                <span className="checkout-badge checkout-badge-outline checkout-badge-mint">Stock: {item.stock || 'Disponible'}</span>
                              </div>
                              <p className="checkout-cart-item-price">{formatPrice(item.price)}</p>
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
                                  disabled={loading || Boolean(item.stock && item.quantity >= item.stock)}
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

            {/* Step 2: Address & User Info */}
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
                    {/* User Info Form (para anónimos) */}
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
                        
                        <div className="checkout-guest-notice">
                          <small>
                            ⚠️ Como invitado, tu pedido se vinculará a tu email. 
                            Puedes registrarte después para ver el historial de tus órdenes.
                          </small>
                        </div>
                      </div>
                    )}

                    {/* Direcciones (para ambos) */}
                    <div className="checkout-address-section">
                      <h3 className="checkout-address-section-title">
                        <MapPin className="checkout-icon" />
                        Dirección de Envío
                      </h3>

                      {isAuthenticated ? (
                        // Usuario autenticado - direcciones guardadas
                        <>
                          {loading ? (
                            <div className="checkout-loading-state">
                              <div className="checkout-spinner"></div>
                              <p>Cargando tus direcciones...</p>
                            </div>
                          ) : userData && userData.addresses.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "2rem 0" }}>
                              <MapPin className="checkout-icon" style={{ width: "3rem", height: "3rem", color: "var(--checkout-gray-dark)", margin: "0 auto 1rem" }} />
                              <p style={{ color: "var(--checkout-gray-dark)", marginBottom: "1rem" }}>
                                No tienes direcciones guardadas
                              </p>
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

                          {/* Add New Address (solo autenticados) */}
                          {addingAddress ? (
                            <div className="checkout-add-address-form">
                              <h3 className="checkout-add-address-title">
                                <Plus className="checkout-icon" />
                                Nueva Dirección
                              </h3>
                              <div className="checkout-form-grid">
                                <div className="checkout-form-group">
                                  <label htmlFor="address">Dirección Completa</label>
                                  <input
                                    id="address"
                                    type="text"
                                    className="checkout-form-input"
                                    placeholder="Calle 123 #45-67, Apto 301"
                                    value={newAddress.address}
                                    onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                                  />
                                </div>
                                <div className="checkout-form-grid-2">
                                  <div className="checkout-form-group">
                                    <label htmlFor="city">Ciudad</label>
                                    <input
                                      id="city"
                                      type="text"
                                      className="checkout-form-input"
                                      placeholder="Bogotá"
                                      value={newAddress.city}
                                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                                    />
                                  </div>
                                  <div className="checkout-form-group">
                                    <label htmlFor="state">Departamento</label>
                                    <input
                                      id="state"
                                      type="text"
                                      className="checkout-form-input"
                                      placeholder="Cundinamarca"
                                      value={newAddress.state}
                                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                                    />
                                  </div>
                                </div>
                                <div className="checkout-form-group">
                                  <label htmlFor="country">País</label>
                                  <input
                                    id="country"
                                    type="text"
                                    className="checkout-form-input"
                                    placeholder="Colombia"
                                    value={newAddress.country}
                                    onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
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
                        // Usuario anónimo - formulario simple de dirección
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

            {/* Step 3: Payment */}
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
                    {/* User & Shipping Summary */}
                    <div className="checkout-summary-section">
                      {/* User Info */}
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

                      {/* Shipping Address */}
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

                    {/* Order Items Preview */}
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

                    {/* Processing States */}
                    {isProcessingPayment && (
                      <div className="checkout-processing-payment">
                        <div className="checkout-spinner large"></div>
                        <h4>Procesando tu pedido...</h4>
                        <p>Estamos preparando todo para que puedas realizar el pago.</p>
                      </div>
                    )}

                    {/* Simulation Section */}
                    {orderCreated && !isProcessingPayment && (
                      <div className="checkout-simulation-section">
                        {/* Info para desarrollo */}
                        <div className="checkout-dev-info">
                          <div className="checkout-dev-header">
                            <Wallet className="checkout-icon" />
                            <h4>Modo Desarrollo - Simulación de Pago</h4>
                          </div>
                          <p className="checkout-dev-description">
                            <strong>Orden #{orderId}</strong> creada exitosamente. 
                            Como estás en modo desarrollo, puedes simular el proceso de pago.
                          </p>
                          <div className="checkout-dev-note">
                            <small>
                              ⚠️ <strong>Nota:</strong> En producción, esto redirigiría a MercadoPago real.
                              Para activar el modo producción, necesitas configurar las claves de MercadoPago en el backend.
                            </small>
                          </div>
                        </div>

                        {/* Botones de simulación */}
                        <div className="checkout-simulation-buttons">
                          <button
                            onClick={() => simulatePayment('approved')}
                            className="checkout-btn checkout-btn-success checkout-btn-lg"
                            disabled={simulationInProgress}
                          >
                            {simulationInProgress ? (
                              <>
                                <Loader2 className="checkout-icon spinning" />
                                Procesando...
                              </>
                            ) : (
                              <>
                                <Check className="checkout-icon" />
                                Simular Pago Aprobado
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={() => simulatePayment('rejected')}
                            className="checkout-btn checkout-btn-danger checkout-btn-lg"
                            disabled={simulationInProgress}
                          >
                            {simulationInProgress ? (
                              <>
                                <Loader2 className="checkout-icon spinning" />
                                Procesando...
                              </>
                            ) : (
                              <>
                                <X className="checkout-icon" />
                                Simular Pago Rechazado
                              </>
                            )}
                          </button>
                        </div>

                        {/* Instrucciones para producción */}
                        <div className="checkout-production-info">
                          <h5>Para activar MercadoPago real:</h5>
                          <ol>
                            <li>Crea una cuenta en MercadoPago Developers</li>
                            <li>Obtén las claves ACCESS_TOKEN y PUBLIC_KEY</li>
                            <li>Configúralas en el backend (application.properties)</li>
                            <li>Descomenta el código marcado con 🚨 en el componente</li>
                          </ol>
                        </div>
                      </div>
                    )}

                    {/* Order Created but processing error */}
                    {orderCreated && !isProcessingPayment && error && (
                      <div className="checkout-payment-fallback">
                        <h4>Orden creada exitosamente</h4>
                        <p>Tu orden #{orderId} ha sido creada. Te contactaremos para completar el pago.</p>
                        <button 
                          className="checkout-btn checkout-btn-primary"
                          onClick={() => {
                            if (isAuthenticated) {
                              window.location.href = `/orders`;
                            } else {
                              window.location.href = `/`;
                            }
                          }}
                        >
                          {isAuthenticated ? 'Ver mis órdenes' : 'Volver al inicio'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="checkout-sidebar">
            <div className="checkout-sidebar-sticky">
              <div className="checkout-card">
                <div className="checkout-card-header navy">
                  <h3 className="checkout-card-header-title">
                    <Package className="checkout-icon" />
                    Resumen de Compra
                  </h3>
                </div>
                <div className="checkout-card-content">
                  {/* Items Summary */}
                  <div className="checkout-summary-items">
                    {cartItems.map((item) => (
                      <div key={item.id} className="checkout-summary-item">
                        <span className="checkout-summary-item-name">
                          {item.name.length > 20 ? item.name.substring(0, 20) + "..." : item.name} x{item.quantity}
                        </span>
                        <span className="checkout-summary-item-price">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="checkout-summary-divider">
                    <div className="checkout-summary-row">
                      <span>Subtotal</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    <div className="checkout-summary-row">
                      <span>Envío</span>
                      <span className="free">Gratis</span>
                    </div>
                  </div>

                  <div className="checkout-summary-total">
                    <span className="checkout-summary-total-label">Total</span>
                    <span className="checkout-summary-total-value">{formatPrice(total)}</span>
                  </div>
                  <p className="checkout-summary-iva">Incluye IVA</p>

                  {/* Trust Badges */}
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
                        <span>Envío Gratis</span>
                      </div>
                      <div className="checkout-trust-badge">
                        <div className="checkout-trust-badge-icon orange">
                          <Star className="checkout-icon" />
                        </div>
                        <span>Entrega Rápida</span>
                      </div>
                      <div className="checkout-trust-badge">
                        <div className="checkout-trust-badge-icon coral">
                          <Star className="checkout-icon" />
                        </div>
                        <span>100% Garantía</span>
                      </div>
                    </div>
                  </div>

                  {/* Login Prompt for Guests */}
                  {!isAuthenticated && (
                    <div className="checkout-login-prompt">
                      <User className="checkout-icon" size={16} />
                      <p>
                        <strong>¿Quieres guardar tus datos?</strong>
                        <br />
                        <small>
                          <a href="/auth/login" className="checkout-login-link">
                            Inicia sesión o regístrate
                          </a>{' '}
                          para guardar direcciones y ver tu historial de pedidos.
                        </small>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Promo Card */}
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

        {/* Navigation Buttons */}
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
                isProcessingPayment
              }
            >
              Continuar
              <ChevronRight className="checkout-icon" />
            </button>
          )}
        </div>
      </main>

      {/* CSS adicional */}
      <style jsx>{`
        .checkout-user-info-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, var(--checkout-purple-light) 0%, rgba(128, 111, 247, 0.1) 100%);
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
          border: 1px solid var(--checkout-border);
        }
        
        .checkout-user-info-banner .checkout-icon {
          color: var(--checkout-purple);
        }
        
        .checkout-login-prompt-btn {
          margin-left: auto;
          background: var(--checkout-purple);
          color: white;
          border: none;
          padding: 0.25rem 0.75rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .checkout-login-prompt-btn:hover {
          background: var(--checkout-purple-dark);
          transform: translateY(-1px);
        }
        
        .checkout-guest-notice {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--checkout-gray-dark);
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }
        
        .checkout-user-info-form {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--checkout-border);
        }
        
        .checkout-user-info-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          color: var(--checkout-navy);
        }
        
        .checkout-summary-section {
          display: grid;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .checkout-user-summary,
        .checkout-shipping-summary {
          background: var(--checkout-bg-light);
          padding: 1rem;
          border-radius: 0.5rem;
          border: 1px solid var(--checkout-border);
        }
        
        .checkout-user-summary-header,
        .checkout-shipping-summary-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: var(--checkout-navy);
        }
        
        .checkout-login-prompt {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: linear-gradient(135deg, var(--checkout-bg-light) 0%, #f0f7ff 100%);
          border-radius: 0.5rem;
          margin-top: 1rem;
          border: 1px dashed var(--checkout-blue);
        }
        
        .checkout-login-prompt .checkout-icon {
          color: var(--checkout-blue);
          margin-top: 0.125rem;
        }
        
        .checkout-login-link {
          color: var(--checkout-blue);
          text-decoration: underline;
          font-weight: 600;
        }
        
        .checkout-login-link:hover {
          color: var(--checkout-blue-dark);
        }
        
        /* Animación para spinner */
        .checkout-icon.spinning {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CheckoutPage;