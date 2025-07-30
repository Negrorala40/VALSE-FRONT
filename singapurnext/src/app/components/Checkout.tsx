'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import './Checkout.css';

interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
  stock?: number;
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

const API_CART_URL = 'https://amarte--backendamarte--sjfs798q7b8v.code.run/api/cart';
const API_SIGNATURE_URL = 'https://amarte--backendamarte--sjfs798q7b8v.code.run/api/bold/signature';
const API_USER_URL = 'https://amarte--backendamarte--sjfs798q7b8v.code.run/api/users/me';
const API_ADDRESSES = 'https://amarte--backendamarte--sjfs798q7b8v.code.run/api/addresses';
const API_ORDERS_URL = 'https://amarte--backendamarte--sjfs798q7b8v.code.run/api/orders';

const CheckoutPage = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string>('');
  const [total, setTotal] = useState<number>(0);

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

  useEffect(() => {
    const scriptId = 'bold-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
      script.async = true;
      script.id = scriptId;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const fetchCart = async () => {
      try {
        const res = await fetch(API_CART_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Error al obtener carrito');
        const data = await res.json();
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
          }) => ({
            id: item.id,
            image: item.imageUrls?.[0] || '/placeholder.png',
            name: item.productName || item.name,
            price: item.price,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            stock: item.stock || 100,
          })
        );
        setCartItems(items);
        calculateTotal(items);
      } catch (e) {
        console.error(e);
      }
    };

    const fetchUser = async () => {
      try {
        const res = await fetch(API_USER_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Error al obtener usuario');
        const user = await res.json();
        setUserData(user);
        if (user.addresses.length > 0) setSelectedAddress(user.addresses[0]);
      } catch (e) {
        console.error(e);
      }
    };

    fetchCart();
    fetchUser();
  }, []);

  const calculateTotal = (items: CartItem[]) => {
    const newTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    setTotal(newTotal);
  };

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
      const res = await fetch(`${API_CART_URL}/update/${itemId}?quantity=${newQuantity}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Error actualizando cantidad');
      const updatedItems = cartItems.map((i) =>
        i.id === itemId ? { ...i, quantity: newQuantity } : i
      );
      setCartItems(updatedItems);
      calculateTotal(updatedItems);
    } catch (err) {
      console.error(err);
    }
  };

  const removeItem = async (itemId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_CART_URL}/remove/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Error eliminando producto');
      const updatedItems = cartItems.filter((i) => i.id !== itemId);
      setCartItems(updatedItems);
      calculateTotal(updatedItems);
    } catch (err) {
      console.error(err);
    }
  };

  const addAddress = async () => {
    const token = localStorage.getItem('token');
    if (!token) return alert('No autenticado');

    if (
      !newAddress.address.trim() ||
      !newAddress.city.trim() ||
      !newAddress.state.trim() ||
      !newAddress.country.trim()
    ) {
      return alert('Completa todos los campos de la dirección');
    }

    try {
      const res = await fetch(API_ADDRESSES, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
      console.error(e);
      alert('No se pudo agregar la dirección');
    }
  };

  const deleteAddress = async (addressId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return alert('No autenticado');
    if (!confirm('¿Seguro que quieres eliminar esta dirección?')) return;

    try {
      const res = await fetch(`${API_ADDRESSES}/${addressId}`, {
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
      console.error(e);
      alert('No se pudo eliminar la dirección');
    }
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 3));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  // Función para crear la orden en el backend
  const createOrder = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Usuario no autenticado');
      return;
    }
    if (!selectedAddress) {
      alert('Selecciona una dirección');
      return;
    }
    if (cartItems.length === 0) {
      alert('Carrito vacío');
      return;
    }

    try {
      const body = {
        addressId: selectedAddress.id,
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        })),
      };

      const res = await fetch(API_ORDERS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error('Error creando la orden');
      }

      const { orderId: newOrderId, amount } = await res.json();

      setOrderId(newOrderId);
      setTotal(amount);
      setOrderCreated(true);

      await fetchSignature(newOrderId, amount, token);
    } catch (e) {
      console.error(e);
      alert('No se pudo crear la orden');
    }
  };

  // Obtener la firma para la orden
  const fetchSignature = async (orderIdParam: string, amountParam: number, token: string) => {
    try {
      const res = await fetch(API_SIGNATURE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: orderIdParam, amount: amountParam }),
      });

      if (!res.ok) throw new Error('Error al obtener firma');

      const { signature } = await res.json();
      setSignature(signature);
    } catch (e) {
      console.error(e);
      alert('No se pudo obtener la firma');
    }
  };

  // Crear la orden cuando llegamos al paso 3 y aún no se ha creado
  useEffect(() => {
    if (step === 3 && !orderCreated) {
      createOrder();
    }
  }, [step, orderCreated]);

  // Crear el botón Bold solo si tenemos signature, orderId y total
  useEffect(() => {
    if (step !== 3) return;
    if (!signature || !orderId || total === 0) return;

    const container = document.getElementById('bold-button-container');
    if (!container) return;

    // Evitar crear el botón varias veces
    if (container.querySelector('[data-bold-button]')) return;

    const script = document.createElement('script');
    script.setAttribute('data-bold-button', '');
    script.setAttribute('data-order-id', orderId);
    script.setAttribute('data-currency', 'COP');
    script.setAttribute('data-amount', Math.round(total).toString());
    script.setAttribute('data-api-key', '-BI64vW_4AMd7AI_cCzzA1KDdVSTsq55Ikrm5Iym1EE');
    script.setAttribute('data-integrity-signature', signature);
    script.setAttribute('data-redirection-url', 'https://singapurnext-qopl.vercel.app/checkout/success');
    script.setAttribute('data-description', 'Compra desde tienda');
    script.src = 'https://checkout.bold.co/library/boldPaymentButton.js';

    container.appendChild(script);
  }, [step, signature, orderId, total]);

  return (
    <div className="checkout-container">
      <h1>Checkout</h1>

      {step === 1 && (
        <div className="step1">
          <h2>Carrito de compras</h2>
          {cartItems.length === 0 && <p>Tu carrito está vacío</p>}
          {cartItems.map((item) => (
            <div key={item.id} className="cart-item">
              <Image src={item.image} alt={item.name} width={100} height={100} />
              <div>
                <h3>{item.name}</h3>
                <p>Color: {item.color}</p>
                <p>Tamaño: {item.size}</p>
                <p>Precio: ${item.price.toFixed(2)}</p>
                <div>
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
                <button onClick={() => removeItem(item.id)}>Eliminar</button>
              </div>
            </div>
          ))}

          <h3>Total: ${total.toFixed(2)}</h3>
          <button disabled={cartItems.length === 0} onClick={nextStep}>
            Siguiente
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="step2">
          <h2>Dirección de envío</h2>

          {!userData && <p>Cargando usuario...</p>}

          {userData && (
            <div>
              <h3>Direcciones guardadas</h3>
              {userData.addresses.length === 0 && <p>No tienes direcciones guardadas</p>}
              <ul>
                {userData.addresses.map((address) => (
                  <li key={address.id}>
                    <label>
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddress?.id === address.id}
                        onChange={() => setSelectedAddress(address)}
                      />
                      {address.address}, {address.city}, {address.state}, {address.country}
                    </label>
                    <button onClick={() => deleteAddress(address.id)}>Eliminar</button>
                  </li>
                ))}
              </ul>

              {addingAddress ? (
                <div className="new-address-form">
                  <input
                    type="text"
                    placeholder="Dirección"
                    value={newAddress.address}
                    onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Ciudad"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Estado"
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="País"
                    value={newAddress.country}
                    onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                  />
                  <button onClick={addAddress}>Agregar dirección</button>
                  <button onClick={() => setAddingAddress(false)}>Cancelar</button>
                </div>
              ) : (
                <button onClick={() => setAddingAddress(true)}>Agregar nueva dirección</button>
              )}

              <div className="step-navigation">
                <button onClick={prevStep}>Anterior</button>
                <button disabled={!selectedAddress} onClick={nextStep}>
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="step3">
          <h2>Pago</h2>
          <p>Total a pagar: ${total.toFixed(2)}</p>

          {!orderCreated && <p>Creando orden, por favor espera...</p>}

          <div id="bold-button-container"></div>

          <div className="step-navigation">
            <button onClick={prevStep}>Anterior</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
