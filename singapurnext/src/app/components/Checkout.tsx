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

// Interfaces para la respuesta del backend
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
  
  // Usar useRef para manejar el contenedor del botón Bold
  const boldContainerRef = useRef<HTMLDivElement>(null);
  const boldScriptRef = useRef<HTMLScriptElement | null>(null);
  const boldScriptLoadedRef = useRef<boolean>(false);

  // Cargar script de Bold al montar el componente
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

  // Función fetchCart mejorada
  const fetchCart = useCallback(async (token: string) => {
    try {
      const res = await fetch(CART, {
        headers: { Authorization: `Bearer ${token}` },
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
    } catch (error) {
      console.error('Error fetching cart:', error);
      throw error;
    }
  }, [calculateTotal]);

  const fetchUser = useCallback(async (token: string) => {
    try {
      const res = await fetch(PERFIL_ME, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      
      const user = await res.json();
      setUserData(user);
      if (user.addresses && user.addresses.length > 0) {
        setSelectedAddress(user.addresses[0]);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Usuario no autenticado');
      return;
    }

    const fetchInitialData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchCart(token), fetchUser(token)]);
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError('Error cargando los datos iniciales');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
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

      if (userData) {
        const updatedAddresses = [...userData.addresses, createdAddress];
        setUserData({ ...userData, addresses: updatedAddresses });
        setSelectedAddress(createdAddress);
      }
      
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

      if (userData) {
        const updatedAddresses = userData.addresses.filter((a) => a.id !== addressId);
        setUserData({ ...userData, addresses: updatedAddresses });

        if (selectedAddress?.id === addressId) {
          setSelectedAddress(updatedAddresses[0] || null);
        }
      }
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

  // Obtener la firma para Bold
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

  // Función createOrder corregida
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

      // Preparar el body según tu controlador Java corregido
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

      // Validar que la respuesta tenga los campos esperados
      if (!orderResponse.id || orderResponse.totalPrice === undefined) {
        throw new Error('Respuesta del servidor incompleta');
      }

      setOrderId(orderResponse.id.toString());
      setTotal(orderResponse.totalPrice);
      setOrderCreated(true);

      // Obtener la firma para Bold
      await fetchSignature(orderResponse.id.toString(), orderResponse.totalPrice, token);

      // Limpiar el carrito local después de crear la orden exitosamente
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

  // Función para limpiar el botón Bold anterior
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

  // Crear el botón de Bold cuando tenemos todos los datos necesarios
  useEffect(() => {
    if (step !== 3) return;
    if (!signature || !orderId || total === 0) return;
    if (!boldScriptLoadedRef.current) return;
    if (!boldContainerRef.current) return;

    // Limpiar botón anterior si existe
    cleanupBoldButton();

    console.log('Creando botón Bold con:', {
      orderId,
      amount: Math.round(total),
      signature: signature.substring(0, 20) + '...'
    });

    try {
      // Crear el script del botón de Bold
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

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      cleanupBoldButton();
    };
  }, [cleanupBoldButton]);

  if (loading && step === 1) {
    return (
      <div className="checkout-container">
        <div className="loading">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <h1>Checkout</h1>

      {error && (
        <div className="error-message" style={{ 
          background: '#fee', 
          color: '#c00', 
          padding: '10px', 
          borderRadius: '5px', 
          margin: '10px 0' 
        }}>
          {error}
          <button 
            onClick={() => setError('')}
            style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#c00' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Indicador de progreso */}
      <div className="progress-indicator" style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '20px 0',
        gap: '20px'
      }}>
        <div className={`step-indicator ${step >= 1 ? 'active' : ''}`}>
          1. Carrito
        </div>
        <div className={`step-indicator ${step >= 2 ? 'active' : ''}`}>
          2. Dirección
        </div>
        <div className={`step-indicator ${step >= 3 ? 'active' : ''}`}>
          3. Pago
        </div>
      </div>

      {step === 1 && (
        <div className="step1">
          <h2>Carrito de compras</h2>
          {cartItems.length === 0 && <p>Tu carrito está vacío</p>}
          
          {cartItems.map((item) => (
            <div key={item.id} className="cart-item" style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
              margin: '10px 0',
              display: 'flex',
              gap: '15px',
              alignItems: 'center'
            }}>
              <Image 
                src={item.image} 
                alt={item.name} 
                width={100} 
                height={100}
                style={{ borderRadius: '8px' }}
              />
              <div style={{ flex: 1 }}>
                <h3>{item.name}</h3>
                <p>Color: {item.color}</p>
                <p>Tamaño: {item.size}</p>
                <p>Precio: ${item.price.toLocaleString('es-CO')}</p>
                <p>Stock disponible: {item.stock}</p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0' }}>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={loading || item.quantity <= 1}
                    style={{ padding: '5px 10px' }}
                  >
                    -
                  </button>
                  <span style={{ padding: '0 10px', fontWeight: 'bold' }}>
                    {item.quantity}
                  </span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={loading || Boolean(item.stock && item.quantity >= item.stock)}
                    style={{ padding: '5px 10px' }}
                  >
                    +
                  </button>
                </div>
                
                <p>Subtotal: ${(item.price * item.quantity).toLocaleString('es-CO')}</p>
                
                <button 
                  onClick={() => removeItem(item.id)}
                  disabled={loading}
                  style={{ 
                    background: '#dc3545', 
                    color: 'white', 
                    border: 'none', 
                    padding: '8px 15px', 
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  {loading ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          ))}

          <div style={{ 
            background: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px', 
            margin: '20px 0' 
          }}>
            <h3>Total: ${total.toLocaleString('es-CO')}</h3>
          </div>
          
          <button 
            disabled={cartItems.length === 0 || loading} 
            onClick={nextStep}
            style={{
              background: (cartItems.length === 0) ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '8px',
              cursor: (cartItems.length === 0) ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {loading ? 'Cargando...' : 'Siguiente'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="step2">
          <h2>Dirección de envío</h2>

          {!userData && <p>Cargando datos del usuario...</p>}

          {userData && (
            <div>
              <h3>Direcciones guardadas</h3>
              {userData.addresses.length === 0 && (
                <p>No tienes direcciones guardadas. Agrega una nueva dirección.</p>
              )}
              
              <div style={{ margin: '20px 0' }}>
                {userData.addresses.map((address) => (
                  <div key={address.id} style={{
                    border: selectedAddress?.id === address.id ? '2px solid #007bff' : '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '15px',
                    margin: '10px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <label style={{ flex: 1, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddress?.id === address.id}
                        onChange={() => setSelectedAddress(address)}
                        style={{ marginRight: '10px' }}
                      />
                      <strong>{address.address}</strong><br/>
                      {address.city}, {address.state}, {address.country}
                    </label>
                    <button 
                      onClick={() => deleteAddress(address.id)}
                      disabled={loading}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '8px 15px',
                        borderRadius: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>

              {addingAddress ? (
                <div className="new-address-form" style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '20px',
                  margin: '20px 0'
                }}>
                  <h4>Nueva dirección</h4>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Dirección completa"
                      value={newAddress.address}
                      onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                      style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    />
                    <input
                      type="text"
                      placeholder="Ciudad"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    />
                    <input
                      type="text"
                      placeholder="Estado/Departamento"
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    />
                    <input
                      type="text"
                      placeholder="País"
                      value={newAddress.country}
                      onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                      style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={addAddress}
                      disabled={loading}
                      style={{
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      {loading ? 'Agregando...' : 'Agregar dirección'}
                    </button>
                    <button 
                      onClick={() => setAddingAddress(false)}
                      disabled={loading}
                      style={{
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setAddingAddress(true)}
                  style={{
                    background: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    margin: '10px 0'
                  }}
                >
                  Agregar nueva dirección
                </button>
              )}

              <div className="step-navigation" style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '30px'
              }}>
                <button 
                  onClick={prevStep}
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '15px 30px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Anterior
                </button>
                <button 
                  disabled={!selectedAddress || loading} 
                  onClick={nextStep}
                  style={{
                    background: !selectedAddress ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '15px 30px',
                    borderRadius: '8px',
                    cursor: !selectedAddress ? 'not-allowed' : 'pointer',
                    fontSize: '16px'
                  }}
                >
                  {loading ? 'Cargando...' : 'Siguiente'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="step3">
          <h2>Pago</h2>
          
          {/* Resumen de la orden */}
          <div style={{
            background: '#f8f9fa',
            padding: '20px',
            borderRadius: '8px',
            margin: '20px 0'
          }}>
            <h3>Resumen de tu orden</h3>
            <p><strong>Total a pagar: ${total.toLocaleString('es-CO')} COP</strong></p>
            {selectedAddress && (
              <p>
                <strong>Dirección de envío:</strong><br/>
                {selectedAddress.address}<br/>
                {selectedAddress.city}, {selectedAddress.state}, {selectedAddress.country}
              </p>
            )}
            {orderId && (
              <p><strong>Número de orden:</strong> {orderId}</p>
            )}
          </div>

          {/* Estados de carga y error */}
          {loading && !orderCreated && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p>Creando orden, por favor espera...</p>
              <div className="spinner" style={{
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #007bff',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }}></div>
            </div>
          )}

          {orderCreated && !signature && !error && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p>Preparando sistema de pago...</p>
            </div>
          )}

          {/* Contenedor del botón de Bold - Usando ref */}
          {orderCreated && signature && (
            <div style={{ margin: '20px 0', textAlign: 'center' }}>
              <p style={{ marginBottom: '15px', color: '#28a745' }}>
                ✓ Orden creada exitosamente. Procede con el pago:
              </p>
              <div 
                ref={boldContainerRef}
                id="bold-button-container" 
                style={{
                  minHeight: '60px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {!boldScriptRef.current && (
                  <p>Cargando botón de pago...</p>
                )}
              </div>
            </div>
          )}

          <div className="step-navigation" style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '30px'
          }}>
            <button 
              onClick={prevStep}
              disabled={loading}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '15px 30px',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px'
              }}
            >
              Anterior
            </button>
          </div>
        </div>
      )}

      {/* CSS para la animación del spinner */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .step-indicator {
          padding: 10px 20px;
          border-radius: 25px;
          background: #f8f9fa;
          color: #6c757d;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        
        .step-indicator.active {
          background: #007bff;
          color: white;
        }
        
        .checkout-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .loading {
          text-align: center;
          padding: 50px;
          font-size: 18px;
          color: #6c757d;
        }
      `}</style>
    </div>
  );
};

export default CheckoutPage;