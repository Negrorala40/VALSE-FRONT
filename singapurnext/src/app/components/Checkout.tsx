'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import './Checkout.css';
import { 
  CART, 
  PERFIL_ME, 
  ADDRESS, 
  ORDERS, 
  BOLD_SIGNATURE 
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
  X
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

interface SignatureResponse {
  signature: string;
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

const CheckoutPage = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string>('');
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

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
  
  // Refs para Bold
  const boldContainerRef = useRef<HTMLDivElement>(null);
  const boldScriptRef = useRef<HTMLScriptElement | null>(null);
  const boldScriptLoadedRef = useRef<boolean>(false);
  
  // Ref para controlar múltiples fetchs
  const fetchControllerRef = useRef<AbortController | null>(null);
  const hasFetchedRef = useRef(false);

  // Formateador de precio
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Cargar script de Bold
  useEffect(() => {
    if (boldScriptLoadedRef.current) return;
    
    const scriptId = 'bold-script';
    const existingScript = document.getElementById(scriptId);
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
      script.async = true;
      script.id = scriptId;
      script.onload = () => {
        console.log('Bold library script loaded successfully');
        boldScriptLoadedRef.current = true;
      };
      script.onerror = () => {
        console.error('Error loading Bold library script');
        setError('Error cargando el sistema de pagos');
      };
      document.head.appendChild(script);
    } else {
      boldScriptLoadedRef.current = true;
    }
  }, []);

  const calculateTotal = useCallback((items: CartItem[]) => {
    const newTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    setTotal(newTotal);
  }, []);

  const fetchCart = useCallback(async (token: string, signal?: AbortSignal) => {
    try {
      console.log('Fetching cart data...');
      const res = await fetch(CART, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });
      
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('Datos del carrito recibidos:', data);
      
      const items: CartItem[] = data.map(
        (item: {
          id: string;
          imageUrls: string[];
          productName: string;
          name: string;
          price: number;
          size: string;
          color: string;
          quantity: number;
          stock: number;
          productVariantId?: string | number;
        }) => {
          let variantId = item.productVariantId;
          if (typeof variantId === 'number') {
            variantId = variantId.toString();
          }
          if (!variantId || variantId === '') {
            variantId = item.id;
          }
          
          return {
            id: item.id,
            image: item.imageUrls?.[0] || '/placeholder.png',
            name: item.productName || item.name,
            price: item.price,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            stock: item.stock || 100,
            productVariantId: variantId,
          };
        }
      );
      
      setCartItems(items);
      calculateTotal(items);
      console.log('Carrito actualizado:', items.length, 'productos');
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching cart:', error);
        throw error;
      }
    }
  }, [calculateTotal]);

  const fetchUser = useCallback(async (token: string, signal?: AbortSignal) => {
    try {
      console.log('Fetching user data...');
      const res = await fetch(PERFIL_ME, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });
      
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      
      const user = await res.json();
      
      if (user.addresses && Array.isArray(user.addresses)) {
        const uniqueAddresses = new Map();
        user.addresses.forEach((address: Address) => {
          if (!uniqueAddresses.has(address.id)) {
            uniqueAddresses.set(address.id, address);
          }
        });
        
        user.addresses = Array.from(uniqueAddresses.values());
        console.log('Direcciones después de filtrar duplicados:', user.addresses);
      }
      
      setUserData(user);
      if (user.addresses && user.addresses.length > 0) {
        setSelectedAddress(user.addresses[0]);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching user:', error);
        throw error;
      }
    }
  }, []);

  // Cargar datos iniciales - SOLUCIÓN MEJORADA
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Usuario no autenticado');
      return;
    }

    if (hasFetchedRef.current) {
      console.log('Ya se cargaron los datos, evitando fetch duplicado');
      return;
    }

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

    // Pequeño delay para asegurar que el DOM esté listo
    const timer = setTimeout(() => {
      fetchInitialData();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
    };
  }, [fetchCart, fetchUser]);

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

  const fetchSignature = useCallback(async (orderIdParam: string, amountParam: number, token: string) => {
    try {
      console.log('Obteniendo firma para orden:', orderIdParam, 'monto:', amountParam);
      
      const res = await fetch(BOLD_SIGNATURE, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          orderId: orderIdParam, 
          amount: Math.round(amountParam)
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Error ${res.status}: ${res.statusText}`);
      }

      const signatureResponse: SignatureResponse = await res.json();
      console.log('Firma obtenida exitosamente');
      
      setSignature(signatureResponse.signature);
    } catch (e) {
      console.error('Error obteniendo firma:', e);
      const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
      setError('No se pudo obtener la firma de pago: ' + errorMessage);
    }
  }, []);

  const createOrder = useCallback(async () => {
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

    if (!userData) {
      setError('Datos de usuario no disponibles');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const body = {
        shippingAddressId: selectedAddress.id
      };

      console.log('Creando orden con body:', JSON.stringify(body, null, 2));

      const res = await fetch(ORDERS, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('Estado de respuesta:', res.status);

      if (!res.ok) {
        let errorMessage = `Error ${res.status}: ${res.statusText}`;
        try {
          const errorData = await res.text();
          console.log('Respuesta de error:', errorData);
          errorMessage = errorData || errorMessage;
        } catch (parseError) {
          console.error('Error parseando respuesta de error:', parseError);
        }
        throw new Error(errorMessage);
      }

      const orderResponse: OrderResponse = await res.json();
      console.log('Orden creada exitosamente:', orderResponse);

      if (!orderResponse.id || orderResponse.totalPrice === undefined) {
        throw new Error('Respuesta del servidor incompleta');
      }

      setOrderId(orderResponse.id.toString());
      setTotal(orderResponse.totalPrice);
      setOrderCreated(true);

      await fetchSignature(orderResponse.id.toString(), orderResponse.totalPrice, token);

      setCartItems([]);

    } catch (e) {
      console.error('Error creando orden:', e);
      const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
      setError('No se pudo crear la orden: ' + errorMessage);
      setOrderCreated(false);
    } finally {
      setLoading(false);
    }
  }, [selectedAddress, cartItems, userData, fetchSignature]);

  // Crear la orden cuando llegamos al paso 3
  useEffect(() => {
    if (step === 3 && !orderCreated && !loading) {
      createOrder();
    }
  }, [step, createOrder, loading, orderCreated]);

  const cleanupBoldButton = useCallback(() => {
    if (boldScriptRef.current && boldScriptRef.current.parentNode) {
      try {
        boldScriptRef.current.parentNode.removeChild(boldScriptRef.current);
      } catch {
        console.log('Script ya fue removido o no existe');
      }
    }
    boldScriptRef.current = null;
    
    if (boldContainerRef.current) {
      boldContainerRef.current.innerHTML = '';
    }
  }, []);

  // Crear el botón de Bold
  useEffect(() => {
    if (step !== 3) return;
    if (!signature || !orderId || total === 0) return;
    if (!boldScriptLoadedRef.current) return;
    if (!boldContainerRef.current) return;

    cleanupBoldButton();

    console.log('Creando botón Bold con:', {
      orderId,
      amount: Math.round(total),
      signature: signature.substring(0, 20) + '...'
    });

    try {
      const script = document.createElement('script');
      script.setAttribute('data-bold-button', '');
      script.setAttribute('data-order-id', orderId);
      script.setAttribute('data-currency', 'COP');
      script.setAttribute('data-amount', Math.round(total).toString());
      script.setAttribute('data-api-key', '-BI64vW_4AMd7AI_cCzzA1KDdVSTsq55Ikrm5Iym1EE');
      script.setAttribute('data-integrity-signature', signature);
      script.setAttribute('data-redirection-url', 'https://singapurnext-qopl.vercel.app/checkout/success');
      script.setAttribute('data-description', 'Compra desde tienda Amarte');
      script.src = 'https://checkout.bold.co/library/boldPaymentButton.js';

      script.onload = () => {
        console.log('Script del botón Bold cargado exitosamente');
      };

      script.onerror = () => {
        console.error('Error cargando script del botón Bold');
        setError('Error cargando el botón de pago');
      };

      boldScriptRef.current = script;
      boldContainerRef.current.appendChild(script);

    } catch (e) {
      console.error('Error creando botón Bold:', e);
      setError('Error creando el botón de pago');
    }
  }, [step, signature, orderId, total, cleanupBoldButton]);

  // Limpiar cuando cambiamos de paso
  useEffect(() => {
    if (step !== 3) {
      setOrderCreated(false);
      setSignature(null);
      setOrderId('');
      setError('');
      cleanupBoldButton();
    }
  }, [step, cleanupBoldButton]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      cleanupBoldButton();
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
    };
  }, [cleanupBoldButton]);

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
        {/* Error Message */}
        {error && (
          <div className="checkout-error-message">
            <span>{error}</span>
            <button onClick={() => setError("")}>
              <X className="checkout-icon" />
            </button>
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

                    {/* Loading States */}
                    {loading && !orderCreated && (
                      <div className="checkout-loading-state">
                        <div className="checkout-spinner" />
                        <p>Creando tu orden...</p>
                      </div>
                    )}

                    {orderCreated && !signature && !error && (
                      <div className="checkout-loading-state">
                        <div className="checkout-spinner purple" />
                        <p>Preparando el pago seguro...</p>
                      </div>
                    )}

                    {/* Payment Button */}
                    {orderCreated && signature && (
                      <div className="checkout-order-success">
                        <div className="checkout-success-card">
                          <Check className="checkout-icon" />
                          <p>¡Orden creada exitosamente!</p>
                          {orderId && <p>Orden #{orderId}</p>}
                        </div>
                        <div ref={boldContainerRef} className="checkout-payment-container">
                          <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center' }}>
                            <p>Cargando botón de pago...</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!orderCreated && !loading && (
                      <div className="checkout-loading-state">
                        <p>Preparando orden...</p>
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
            <button className="checkout-btn checkout-btn-outline checkout-btn-lg" onClick={prevStep} disabled={loading}>
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
              disabled={(step === 2 && !selectedAddress) || loading}
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