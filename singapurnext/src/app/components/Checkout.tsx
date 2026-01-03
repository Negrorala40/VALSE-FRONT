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
  
  // 🔥 NUEVO: Ref para controlar múltiples fetchs
  const fetchControllerRef = useRef<AbortController | null>(null);
  const hasFetchedRef = useRef(false);

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
      const res = await fetch(CART, {
        headers: { Authorization: `Bearer ${token}` },
        signal // Pasar la señal de aborto
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
          
          console.log(`Producto ${item.name}: id=${item.id}, productVariantId=${variantId}`);
          
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
    } catch (error: any) {
      // No mostrar error si fue cancelado
      if (error.name !== 'AbortError') {
        console.error('Error fetching cart:', error);
        throw error;
      }
    }
  }, [calculateTotal]);

  const fetchUser = useCallback(async (token: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(PERFIL_ME, {
        headers: { Authorization: `Bearer ${token}` },
        signal // Pasar la señal de aborto
      });
      
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      
      const user = await res.json();
      
      // 🔥 SOLUCIÓN CRÍTICA: Filtrar duplicados inmediatamente
      if (user.addresses && Array.isArray(user.addresses)) {
        // Usar un Map para eliminar duplicados por ID
        const uniqueAddresses = new Map();
        user.addresses.forEach((address: Address) => {
          if (!uniqueAddresses.has(address.id)) {
            uniqueAddresses.set(address.id, address);
          }
        });
        
        // Convertir de nuevo a array
        user.addresses = Array.from(uniqueAddresses.values());
        
        console.log('Direcciones después de filtrar duplicados:', user.addresses);
      }
      
      setUserData(user);
      if (user.addresses && user.addresses.length > 0) {
        setSelectedAddress(user.addresses[0]);
      }
    } catch (error: any) {
      // No mostrar error si fue cancelado
      if (error.name !== 'AbortError') {
        console.error('Error fetching user:', error);
        throw error;
      }
    }
  }, []);

  // Cargar datos iniciales - SOLUCIÓN COMPLETA
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Usuario no autenticado');
      return;
    }

    // 🔥 PREVENIR MÚLTIPLES FETCHS
    if (hasFetchedRef.current) {
      console.log('Ya se cargaron los datos, evitando fetch duplicado');
      return;
    }

    const fetchInitialData = async () => {
      setLoading(true);
      
      // Cancelar cualquier fetch anterior
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
      
      // Crear nuevo AbortController
      fetchControllerRef.current = new AbortController();
      const signal = fetchControllerRef.current.signal;
      
      try {
        hasFetchedRef.current = true;
        
        // Ejecutar fetchs en paralelo pero con señal de aborto
        await Promise.all([
          fetchCart(token, signal),
          fetchUser(token, signal)
        ]);
        
      } catch (err: any) {
        // Solo mostrar error si no fue una cancelación
        if (err.name !== 'AbortError') {
          console.error('Error loading initial data:', err);
          setError('Error cargando los datos iniciales');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // 🔥 LIMPIAR AL DESMONTAR
    return () => {
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
      // No resetear hasFetchedRef aquí para prevenir recargas
    };
  }, [fetchCart, fetchUser]);

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const item = cartItems.find((i) => i.id === itemId);
    if (!item) return;
    
    if (item.stock && newQuantity > item.stock) {
      alert(`No hay suficiente stock disponible (máximo ${item.stock})`);
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
      alert('No autenticado');
      return;
    }

    if (
      !newAddress.address.trim() ||
      !newAddress.city.trim() ||
      !newAddress.state.trim() ||
      !newAddress.country.trim()
    ) {
      alert('Completa todos los campos de la dirección');
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

      // 🔥 ACTUALIZAR CON FUNCIÓN PARA EVITAR DUPLICADOS
      setUserData(prevUserData => {
        if (!prevUserData) return prevUserData;
        
        // Verificar si ya existe una dirección con el mismo ID o datos
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
        
        // Agregar nueva dirección al inicio del array
        return {
          ...prevUserData,
          addresses: [createdAddress, ...prevUserData.addresses]
        };
      });
      
      setSelectedAddress(createdAddress);
      setAddingAddress(false);
      setNewAddress({ address: '', city: '', state: '', country: '' });
      
    } catch (e) {
      console.error('Error adding address:', e);
      alert('No se pudo agregar la dirección');
    } finally {
      setLoading(false);
    }
  };

  const deleteAddress = async (addressId: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No autenticado');
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

      // 🔥 ACTUALIZAR CON FUNCIÓN PARA MANTENER INTEGRIDAD
      setUserData(prevUserData => {
        if (!prevUserData) return prevUserData;
        
        const updatedAddresses = prevUserData.addresses.filter((a) => a.id !== addressId);
        
        return {
          ...prevUserData,
          addresses: updatedAddresses
        };
      });

      // Actualizar dirección seleccionada si se eliminó la actual
      setSelectedAddress(prevSelected => 
        prevSelected?.id === addressId ? null : prevSelected
      );
      
    } catch (e) {
      console.error('Error deleting address:', e);
      alert('No se pudo eliminar la dirección');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && cartItems.length === 0) {
      alert('Tu carrito está vacío');
      return;
    }
    if (step === 2 && !selectedAddress) {
      alert('Selecciona una dirección de envío');
      return;
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
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

  // 🔥 DEBUG: Mostrar direcciones actuales
  useEffect(() => {
    if (userData?.addresses) {
      console.log('Direcciones en estado:', userData.addresses);
      console.log('IDs únicos:', [...new Set(userData.addresses.map(a => a.id))]);
    }
  }, [userData?.addresses]);

  if (loading && step === 1) {
    return (
      <div className="checkout-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Cargando tu carrito...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container fade-in">
      <h1>Checkout Amarte</h1>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Indicador de progreso */}
      <div className="progress-indicator">
        <div className={`step-indicator ${step >= 1 ? 'active' : ''}`}>
          Carrito
        </div>
        <div className={`step-indicator ${step >= 2 ? 'active' : ''}`}>
          Dirección
        </div>
        <div className={`step-indicator ${step >= 3 ? 'active' : ''}`}>
          Pago
        </div>
      </div>

      {step === 1 && (
        <div className="step1">
          <h2>🛒 Tu Carrito</h2>
          
          {cartItems.length === 0 ? (
            <div className="text-center mt-3">
              <p>Tu carrito está vacío</p>
              <button 
                className="btn-info mt-2"
                onClick={() => window.location.href = '/'}
              >
                ← Volver a la tienda
              </button>
            </div>
          ) : (
            <>
              {cartItems.map((item) => (
                <div key={`cart-${item.id}-${item.productVariantId || ''}`} className="cart-item">
                  <Image 
                    src={item.image} 
                    alt={item.name} 
                    width={120} 
                    height={120}
                    className="cart-item-image"
                  />
                  <div className="cart-item-content">
                    <h3>{item.name}</h3>
                    <p><strong>Color:</strong> {item.color}</p>
                    <p><strong>Tamaño:</strong> {item.size}</p>
                    <p><strong>Precio:</strong> ${item.price.toLocaleString('es-CO')}</p>
                    <p><strong>Stock:</strong> {item.stock}</p>
                    
                    <div className="quantity-controls">
                      <button 
                        className="quantity-btn"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={loading || item.quantity <= 1}
                      >
                        -
                      </button>
                      <span className="quantity-display">{item.quantity}</span>
                      <button 
                        className="quantity-btn"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={loading || Boolean(item.stock && item.quantity >= item.stock)}
                      >
                        +
                      </button>
                    </div>
                    
                    <p><strong>Subtotal:</strong> ${(item.price * item.quantity).toLocaleString('es-CO')}</p>
                    
                    <button 
                      className="btn-danger mt-1"
                      onClick={() => removeItem(item.id)}
                      disabled={loading}
                    >
                      {loading ? 'Eliminando...' : '🗑️ Eliminar'}
                    </button>
                  </div>
                </div>
              ))}

              <div className="total-summary">
                <h3>Total del Carrito</h3>
                <div className="total-amount">
                  ${total.toLocaleString('es-CO')} COP
                </div>
              </div>
              
              <div className="step-navigation">
                <button 
                  className="btn-secondary"
                  onClick={() => window.location.href = '/'}
                >
                  ← Seguir comprando
                </button>
                <button 
                  className="btn-primary"
                  disabled={cartItems.length === 0 || loading} 
                  onClick={nextStep}
                >
                  {loading ? 'Cargando...' : 'Continuar →'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="step2">
          <h2>📍 Dirección de Envío</h2>

          {!userData ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Cargando tus datos...</p>
            </div>
          ) : (
            <div className="address-section">
              <h3>Direcciones Guardadas</h3>
              {userData.addresses.length === 0 ? (
                <p className="text-center mb-3">No tienes direcciones guardadas</p>
              ) : (
                <div className="address-list">
                  {userData.addresses.map((address, index) => {
                    // 🔥 KEY ABSOLUTAMENTE ÚNICO
                    const uniqueKey = `address-${address.id}-${index}-${address.address.substring(0, 5)}`;
                    
                    return (
                      <div 
                        key={uniqueKey}
                        className={`address-option ${selectedAddress?.id === address.id ? 'selected' : ''}`}
                      >
                        <label>
                          <input
                            type="radio"
                            name="address"
                            checked={selectedAddress?.id === address.id}
                            onChange={() => setSelectedAddress(address)}
                          />
                          <div className="address-text">
                            <strong>Dirección:</strong> {address.address}<br/>
                            <strong>Ciudad:</strong> {address.city}<br/>
                            <strong>Estado:</strong> {address.state}<br/>
                            <strong>País:</strong> {address.country}
                          </div>
                        </label>
                        <button 
                          className="btn-danger"
                          onClick={() => deleteAddress(address.id)}
                          disabled={loading}
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {addingAddress ? (
                <div className="new-address-form">
                  <h3>➕ Nueva Dirección</h3>
                  <div className="form-grid">
                    <input
                      type="text"
                      placeholder="Dirección completa"
                      className="form-input"
                      value={newAddress.address}
                      onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Ciudad"
                      className="form-input"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Estado/Departamento"
                      className="form-input"
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="País"
                      className="form-input"
                      value={newAddress.country}
                      onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                    />
                  </div>
                  <div className="form-actions">
                    <button 
                      className="btn-success"
                      onClick={addAddress}
                      disabled={loading}
                    >
                      {loading ? 'Agregando...' : '✅ Agregar'}
                    </button>
                    <button 
                      className="btn-secondary"
                      onClick={() => setAddingAddress(false)}
                      disabled={loading}
                    >
                      ❌ Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  className="btn-info"
                  onClick={() => setAddingAddress(true)}
                >
                  ➕ Agregar Nueva Dirección
                </button>
              )}

              <div className="step-navigation mt-3">
                <button 
                  className="btn-secondary"
                  onClick={prevStep}
                >
                  ← Anterior
                </button>
                <button 
                  className="btn-primary"
                  disabled={!selectedAddress || loading} 
                  onClick={nextStep}
                >
                  {loading ? 'Cargando...' : 'Continuar al Pago →'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="step3">
          <h2>💳 Procesar Pago</h2>
          
          <div className="total-summary">
            <h3>Resumen de tu Orden</h3>
            <div className="total-amount">
              ${total.toLocaleString('es-CO')} COP
            </div>
            {selectedAddress && (
              <div className="address-text mt-2">
                <strong>📍 Dirección de envío:</strong><br/>
                {selectedAddress.address}<br/>
                {selectedAddress.city}, {selectedAddress.state}, {selectedAddress.country}
              </div>
            )}
            {orderId && (
              <p className="text-center mt-2">
                <strong>Orden #:</strong> {orderId}
              </p>
            )}
          </div>

          {/* Estados de carga */}
          {loading && !orderCreated && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Creando tu orden, por favor espera...</p>
            </div>
          )}

          {orderCreated && !signature && !error && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Preparando sistema de pago seguro...</p>
            </div>
          )}

          {/* Botón de Bold */}
          {orderCreated && signature && (
            <div className="text-center">
              <p className="success-message">✅ Orden creada exitosamente. Procede con el pago:</p>
              <div 
                ref={boldContainerRef}
                id="bold-button-container"
              >
                <p>Cargando botón de pago...</p>
              </div>
            </div>
          )}

          <div className="step-navigation">
            <button 
              className="btn-secondary"
              onClick={prevStep}
              disabled={loading}
            >
              ← Anterior
            </button>
            {!orderCreated && (
              <button 
                className="btn-primary"
                onClick={createOrder}
                disabled={loading}
              >
                {loading ? 'Procesando...' : 'Crear Orden'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;