'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import './Checkout.css';
import { 
  CART, 
  PERFIL_ME, 
  ADDRESS, 
  ORDERS,
  API_BASE_URL
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
  ExternalLink
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

interface PaymentPreferenceResponse {
  id: string;
  init_point: string;
  [key: string]: any; // Para otras propiedades que pueda devolver MercadoPago
}

interface PaymentStatus {
  orderId: number;
  status: string;
  totalPrice: number;
  orderDate: string;
}

const MERCADOPAGO_CREATE_PREFERENCE = `${API_BASE_URL}/api/payments/create-preference`;
const MERCADOPAGO_STATUS = `${API_BASE_URL}/api/payments/status`;
const MERCADOPAGO_SIMULATE = `${API_BASE_URL}/api/payments/simulate-payment`;

const CheckoutPage = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState<string>('');
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const [step, setStep] = useState<number>(1);

  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    address: '',
    city: '',
    state: '',
    country: '',
  });

  const [orderCreated, setOrderCreated] = useState(false);
  const [paymentPreference, setPaymentPreference] = useState<PaymentPreferenceResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [redirectingToMP, setRedirectingToMP] = useState(false);
  
  // Refs
  const fetchControllerRef = useRef<AbortController | null>(null);
  const hasFetchedRef = useRef(false);
  const paymentPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Formateador de precio
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const calculateTotal = useCallback((items: CartItem[]) => {
    const newTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    setTotal(newTotal);
  }, []);

  // Limpiar polling
  const clearPaymentPolling = () => {
    if (paymentPollingRef.current) {
      clearInterval(paymentPollingRef.current);
      paymentPollingRef.current = null;
    }
  };

  // Polling para verificar estado de pago
  const startPaymentPolling = useCallback((orderId: number) => {
    clearPaymentPolling();
    
    paymentPollingRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${MERCADOPAGO_STATUS}/${orderId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const status: PaymentStatus = await response.json();
          setPaymentStatus(status);
          
          // Si el pago fue aprobado, detener polling
          if (status.status === 'PAGO_APROBADO') {
            clearPaymentPolling();
            setSuccessMessage('¡Pago aprobado! Tu pedido está siendo procesado.');
          }
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    }, 5000); // Poll cada 5 segundos
  }, []);

  // Fetch carrito
  const fetchCart = useCallback(async (token: string, signal?: AbortSignal) => {
    try {
      console.log('Fetching cart data...');
      const res = await fetch(CART, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });
      
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      
      const data = await res.json();
      console.log('Datos del carrito recibidos:', data);
      
      const items: CartItem[] = data.map(
        (item: any) => ({
          id: item.id,
          image: item.imageUrls?.[0] || '/placeholder.png',
          name: item.productName || item.name,
          price: item.price,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          stock: item.stock || 100,
          productVariantId: item.productVariantId?.toString() || item.id,
        })
      );
      
      setCartItems(items);
      calculateTotal(items);
    } catch (error: any) {
      if (error.name !== 'AbortError') throw error;
    }
  }, [calculateTotal]);

  // Fetch usuario
  const fetchUser = useCallback(async (token: string, signal?: AbortSignal) => {
    try {
      console.log('Fetching user data...');
      const res = await fetch(PERFIL_ME, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });
      
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      
      const user = await res.json();
      
      if (user.addresses && Array.isArray(user.addresses)) {
        const uniqueAddresses = new Map();
        user.addresses.forEach((address: Address) => {
          if (!uniqueAddresses.has(address.id)) {
            uniqueAddresses.set(address.id, address);
          }
        });
        
        user.addresses = Array.from(uniqueAddresses.values());
      }
      
      setUserData(user);
      if (user.addresses && user.addresses.length > 0) {
        setSelectedAddress(user.addresses[0]);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') throw error;
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Usuario no autenticado');
      return;
    }

    if (hasFetchedRef.current) return;

    const fetchInitialData = async () => {
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
        
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error loading initial data:', err);
          setError('Error cargando los datos iniciales');
        }
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchInitialData();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
      clearPaymentPolling();
    };
  }, [fetchCart, fetchUser]);

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
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch(`${CART}/update/${itemId}?quantity=${newQuantity}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
      });
      
      if (!res.ok) throw new Error('Error actualizando cantidad');
      
      const updatedItems = cartItems.map((i) =>
        i.id === itemId ? { ...i, quantity: newQuantity } : i
      );
      setCartItems(updatedItems);
      calculateTotal(updatedItems);
    } catch (err) {
      console.error('Error updating quantity:', err);
      setError('Error actualizando la cantidad');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar item
  const removeItem = async (itemId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!confirm('¿Estás seguro de eliminar este producto del carrito?')) return;

    try {
      setLoading(true);
      const res = await fetch(`${CART}/remove/${itemId}`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
      });
      
      if (!res.ok) throw new Error('Error eliminando producto');
      
      const updatedItems = cartItems.filter((i) => i.id !== itemId);
      setCartItems(updatedItems);
      calculateTotal(updatedItems);
    } catch (err) {
      console.error('Error removing item:', err);
      setError('Error eliminando el producto');
    } finally {
      setLoading(false);
    }
  };

  // Agregar dirección
  const addAddress = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No autenticado');
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

      if (!res.ok) throw new Error('Error agregando dirección');
      
      const createdAddress = await res.json();

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
      
    } catch (e) {
      console.error('Error adding address:', e);
      setError('No se pudo agregar la dirección');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar dirección
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
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Error eliminando dirección');

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
      
    } catch (e) {
      console.error('Error deleting address:', e);
      setError('No se pudo eliminar la dirección');
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
    if (step === 2 && !selectedAddress) {
      setError('Selecciona una dirección de envío');
      return;
    }
    setStep((prev) => Math.min(prev + 1, 3));
    setError('');
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    setError('');
  };

  // Crear orden y preferencia de pago
  const createOrderAndPayment = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Usuario no autenticado');
      return;
    }
    
    if (!selectedAddress) {
      setError('Selecciona una dirección');
      return;
    }
    
    if (cartItems.length === 0) {
      setError('Carrito vacío');
      return;
    }

    try {
      setIsProcessingPayment(true);
      setError('');

      // 1. Crear orden en nuestro sistema
      console.log('Creando orden...');
      const orderRes = await fetch(ORDERS, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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

      const orderResponse: OrderResponse = await orderRes.json();
      console.log('Orden creada:', orderResponse);

      if (!orderResponse.id) {
        throw new Error('No se pudo obtener el ID de la orden');
      }

      const orderId = orderResponse.id.toString();
      setOrderId(orderId);
      setOrderCreated(true);

      // 2. Crear preferencia de pago en MercadoPago
      console.log('Creando preferencia de pago...');
      const paymentRes = await fetch(MERCADOPAGO_CREATE_PREFERENCE, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderResponse.id
        }),
      });

      if (!paymentRes.ok) {
        let errorMessage = `Error creando preferencia: ${paymentRes.statusText}`;
        try {
          const errorData = await paymentRes.text();
          errorMessage = errorData || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      const paymentPreference: PaymentPreferenceResponse = await paymentRes.json();
      console.log('Preferencia creada:', paymentPreference);

      if (!paymentPreference.id || !paymentPreference.init_point) {
        throw new Error('Respuesta de MercadoPago incompleta');
      }

      setPaymentPreference(paymentPreference);
      setSuccessMessage('Preferencia de pago creada exitosamente');

      // 3. Iniciar polling para verificar estado de pago
      startPaymentPolling(orderResponse.id);

      // 4. Redirigir a MercadoPago automáticamente después de 2 segundos
      setTimeout(() => {
        setRedirectingToMP(true);
        window.location.href = paymentPreference.init_point;
      }, 2000);

    } catch (err: any) {
      console.error('Error en checkout:', err);
      setError(`Error: ${err.message || 'Error desconocido'}`);
      setOrderCreated(false);
      setPaymentPreference(null);
    } finally {
      setIsProcessingPayment(false);
    }
  }, [selectedAddress, cartItems, startPaymentPolling]);

  // Simular pago (para desarrollo)
  const simulatePayment = async (status: 'approved' | 'rejected') => {
    if (!orderId) {
      setError('No hay orden creada');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(MERCADOPAGO_SIMULATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: parseInt(orderId),
          status: status
        }),
      });

      if (response.ok) {
        if (status === 'approved') {
          setSuccessMessage('¡Pago simulado exitosamente! La orden ha sido aprobada.');
          // Actualizar estado local
          setPaymentStatus(prev => prev ? { ...prev, status: 'PAGO_APROBADO' } : null);
        } else {
          setError('Pago simulado rechazado. Por favor intenta nuevamente.');
        }
      } else {
        setError('Error simulando pago');
      }
    } catch (error) {
      console.error('Error simulando pago:', error);
      setError('Error simulando pago');
    } finally {
      setLoading(false);
    }
  };

  // Crear orden cuando llegamos al paso 3
  useEffect(() => {
    if (step === 3 && !orderCreated && !isProcessingPayment) {
      createOrderAndPayment();
    }
  }, [step, createOrderAndPayment, isProcessingPayment, orderCreated]);

  // Componente para mostrar estado de pago
  const renderPaymentStatus = () => {
    if (paymentStatus) {
      const statusMap: { [key: string]: { color: string, message: string } } = {
        'PENDIENTE': { color: 'orange', message: 'Pendiente de pago' },
        'PAGO_APROBADO': { color: 'green', message: '¡Pago aprobado!' },
        'PAGO_RECHAZADO': { color: 'red', message: 'Pago rechazado' },
        'CANCELADO': { color: 'gray', message: 'Orden cancelada' },
        'ENVIADO': { color: 'blue', message: 'Orden enviada' },
        'ENTREGADO': { color: 'purple', message: '¡Orden entregada!' },
      };

      const statusInfo = statusMap[paymentStatus.status] || { color: 'gray', message: paymentStatus.status };

      return (
        <div className={`payment-status payment-status-${statusInfo.color}`}>
          <div className="payment-status-icon">
            {statusInfo.color === 'green' && <Check className="icon" />}
            {statusInfo.color === 'red' && <X className="icon" />}
            {statusInfo.color === 'orange' && <Loader2 className="icon spinning" />}
          </div>
          <div className="payment-status-content">
            <h4>Estado de la orden</h4>
            <p className="payment-status-message">{statusInfo.message}</p>
            <p className="payment-status-details">
              Orden #{paymentStatus.orderId} • {formatPrice(paymentStatus.totalPrice)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const steps = [
    { number: 1, label: "Carrito", icon: ShoppingBag },
    { number: 2, label: "Envío", icon: MapPin },
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
                            />
                            <span className="checkout-cart-item-size-badge">{item.size}</span>
                          </div>

                          <div className="checkout-cart-item-content">
                            <div>
                              <h3 className="checkout-cart-item-name">{item.name}</h3>
                              <div className="checkout-cart-item-badges">
                                <span className="checkout-badge checkout-badge-outline checkout-badge-purple">{item.color}</span>
                                <span className="checkout-badge checkout-badge-outline checkout-badge-mint">Stock: {item.stock}</span>
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

            {/* Step 2: Address */}
            {step === 2 && (
              <div className="checkout-animate-in-right">
                <div className="checkout-section-header">
                  <div className="checkout-section-icon address">
                    <MapPin className="checkout-icon" />
                  </div>
                  <div>
                    <h2 className="checkout-section-title">Dirección de Envío</h2>
                    <p className="checkout-section-subtitle">¿A dónde enviamos tus pijamas?</p>
                  </div>
                </div>

                <div className="checkout-card">
                  <div className="checkout-card-content">
                    {!userData ? (
                      <div className="checkout-loading-state">
                        <div className="checkout-spinner"></div>
                        <p>Cargando tus datos...</p>
                      </div>
                    ) : userData.addresses.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "2rem 0" }}>
                        <MapPin className="checkout-icon" style={{ width: "3rem", height: "3rem", color: "var(--checkout-gray-dark)", margin: "0 auto 1rem" }} />
                        <p style={{ color: "var(--checkout-gray-dark)", marginBottom: "1rem" }}>
                          No tienes direcciones guardadas
                        </p>
                      </div>
                    ) : (
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
                    )}

                    {/* Add New Address */}
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
                  </div>
                </div>

                <div className="checkout-card">
                  <div className="checkout-card-content">
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

                    {/* Order Created - Show Payment Options */}
                    {orderCreated && paymentPreference && (
                      <div className="checkout-payment-options">
                        <h4>¡Listo para pagar!</h4>
                        <p className="checkout-payment-instruction">
                          Tu orden ha sido creada exitosamente. Ahora puedes proceder con el pago seguro a través de MercadoPago.
                        </p>

                        {/* MercadoPago Button */}
                        <div className="checkout-mercadopago-container">
                          <button
                            className="checkout-mercadopago-btn"
                            onClick={() => window.location.href = paymentPreference.init_point}
                            disabled={redirectingToMP}
                          >
                            <img 
                              src="https://http2.mlstatic.com/frontend-assets/ui-nav/5.10.1/mercadopago/logo__large_plus.png" 
                              alt="MercadoPago" 
                              className="mercadopago-logo"
                            />
                            <span>Pagar con MercadoPago</span>
                            <ExternalLink className="icon" />
                          </button>

                          {redirectingToMP && (
                            <div className="checkout-redirecting">
                              <div className="checkout-spinner small"></div>
                              <span>Redirigiendo a MercadoPago...</span>
                            </div>
                          )}
                        </div>

                        {/* Payment Status */}
                        {renderPaymentStatus()}

                        {/* Dev Mode: Simulate Payment */}
                        {process.env.NODE_ENV === 'development' && (
                          <div className="checkout-dev-options">
                            <h5>Modo Desarrollo - Simular Pago:</h5>
                            <div className="checkout-dev-buttons">
                              <button 
                                className="checkout-btn checkout-btn-success checkout-btn-sm"
                                onClick={() => simulatePayment('approved')}
                                disabled={loading}
                              >
                                Simular Pago Aprobado
                              </button>
                              <button 
                                className="checkout-btn checkout-btn-danger checkout-btn-sm"
                                onClick={() => simulatePayment('rejected')}
                                disabled={loading}
                              >
                                Simular Pago Rechazado
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Order Created but No Payment Preference */}
                    {orderCreated && !paymentPreference && !isProcessingPayment && !error && (
                      <div className="checkout-payment-fallback">
                        <h4>Orden creada exitosamente</h4>
                        <p>Tu orden #{orderId} ha sido creada. Te contactaremos para completar el pago.</p>
                        <button 
                          className="checkout-btn checkout-btn-primary"
                          onClick={() => window.location.href = `/orders`}
                        >
                          Ver mis órdenes
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
              disabled={(step === 2 && !selectedAddress) || loading || isProcessingPayment}
            >
              Continuar
              <ChevronRight className="checkout-icon" />
            </button>
          )}
        </div>
      </main>

      {/* CSS adicional para este componente */}
      <style jsx>{`
        .checkout-processing-payment {
          text-align: center;
          padding: 2rem;
          background: linear-gradient(135deg, var(--checkout-bg-light) 0%, #f8f9ff 100%);
          border-radius: 1rem;
          margin: 1.5rem 0;
        }
        
        .checkout-spinner.large {
          width: 3rem;
          height: 3rem;
          border-width: 3px;
        }
        
        .checkout-spinner.small {
          width: 1rem;
          height: 1rem;
          border-width: 2px;
          margin-right: 0.5rem;
        }
        
        .checkout-mercadopago-container {
          margin: 2rem 0;
        }
        
        .checkout-mercadopago-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          width: 100%;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #009ee3 0%, #00a650 100%);
          color: white;
          border: none;
          border-radius: 0.75rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .checkout-mercadopago-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 158, 227, 0.3);
        }
        
        .checkout-mercadopago-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .mercadopago-logo {
          height: 24px;
          filter: brightness(0) invert(1);
        }
        
        .checkout-redirecting {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1rem;
          color: var(--checkout-navy);
          font-size: 0.875rem;
        }
        
        .payment-status {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 0.75rem;
          margin: 1rem 0;
        }
        
        .payment-status-green {
          background-color: rgba(72, 187, 120, 0.1);
          border-left: 4px solid #48bb78;
        }
        
        .payment-status-red {
          background-color: rgba(245, 101, 101, 0.1);
          border-left: 4px solid #f56565;
        }
        
        .payment-status-orange {
          background-color: rgba(237, 137, 54, 0.1);
          border-left: 4px solid #ed8936;
        }
        
        .payment-status-icon .icon {
          width: 1.5rem;
          height: 1.5rem;
        }
        
        .payment-status-icon .icon.spinning {
          animation: spin 1s linear infinite;
        }
        
        .payment-status-content h4 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          color: var(--checkout-navy);
        }
        
        .payment-status-message {
          margin: 0 0 0.25rem 0;
          font-weight: 600;
        }
        
        .payment-status-details {
          margin: 0;
          font-size: 0.875rem;
          color: var(--checkout-gray-dark);
        }
        
        .checkout-payment-instruction {
          color: var(--checkout-gray-dark);
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }
        
        .checkout-dev-options {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--checkout-border);
        }
        
        .checkout-dev-options h5 {
          margin-bottom: 1rem;
          color: var(--checkout-navy);
        }
        
        .checkout-dev-buttons {
          display: flex;
          gap: 1rem;
        }
        
        .checkout-btn-success {
          background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
          color: white;
          border: none;
        }
        
        .checkout-btn-danger {
          background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
          color: white;
          border: none;
        }
        
        .checkout-btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
        }
        
        .checkout-payment-fallback {
          text-align: center;
          padding: 2rem;
        }
        
        .checkout-success-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
          color: white;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
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