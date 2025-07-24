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
        const items: CartItem[] = data.map((item: { id: string; imageUrls: string[]; productName: string; name: string; price: number; size: string; color: string; quantity: number; stock: number }) => ({
          id: item.id,
          image: item.imageUrls?.[0] || '/placeholder.png',
          name: item.productName || item.name,
          price: item.price,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          stock: item.stock || 100,
        }));
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

    const fetchSignature = async () => {
      try {
        const res = await fetch(API_SIGNATURE_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) throw new Error('Error al obtener firma');
        const { orderId, signature, amount } = await res.json();
        setOrderId(orderId);
        setSignature(signature);
        setTotal(amount);
      } catch (e) {
        console.error(e);
      }
    };

    fetchCart();
    fetchUser();
    fetchSignature();
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

  useEffect(() => {
    if (step !== 3) return;
    if (!signature || !orderId || total === 0 || !selectedAddress || !userData) return;

    const container = document.getElementById('bold-button-container');
    if (container && !container.querySelector('[data-bold-button]')) {
      const script = document.createElement('script');

      script.setAttribute('data-bold-button', '');

      script.setAttribute('data-order-id', orderId); // Identificador único (ORD-XXXXX)
      script.setAttribute('data-currency', 'COP');

      // Total como entero sin decimales
      const totalInt = Math.round(total);
      script.setAttribute('data-amount', totalInt.toString());

      script.setAttribute('data-api-key', '-BI64vW_4AMd7AI_cCzzA1KDdVSTsq55Ikrm5Iym1EE');
      script.setAttribute('data-integrity-signature', signature);
      script.setAttribute('data-redirection-url', 'http://localhost:3000/checkout/success');
      script.setAttribute('data-description', 'Compra desde tienda');

      script.src = 'https://checkout.bold.co/library/boldPaymentButton.js';

      container.appendChild(script);
    }
  }, [step, signature, orderId, total, selectedAddress, userData]);

  return (
    <div className="checkout-page">
      <h1>Finalizar compra</h1>

      {/* Paso 1 - Usuario y dirección */}
      {step === 1 && userData && (
        <section className={`step step-1 ${step === 1 ? 'step-active' : ''}`}>
          <h2>Datos del usuario y dirección de envío</h2>
          <p>
            <strong>Nombre:</strong> {userData.firstName} {userData.lastName}
          </p>
          <p>
            <strong>Email:</strong> {userData.email}
          </p>
          <p>
            <strong>Teléfono:</strong> {userData.phone}
          </p>

          <h3>Selecciona dirección de envío</h3>

          {userData.addresses.length === 0 && <p>No tienes direcciones guardadas.</p>}

          {userData.addresses.map((addr) => (
            <div key={addr.id} className="address-item">
              <label>
                <input
                  type="radio"
                  name="selectedAddress"
                  checked={selectedAddress?.id === addr.id}
                  onChange={() => setSelectedAddress(addr)}
                />
                {addr.address}, {addr.city}, {addr.state}, {addr.country}
              </label>
              <button
                onClick={() => deleteAddress(addr.id)}
                title="Eliminar dirección"
                className="btn-delete-address"
              >
                &times;
              </button>
            </div>
          ))}

          {addingAddress ? (
            <div className="add-address-form">
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

          <button onClick={nextStep} disabled={!selectedAddress}>
            Siguiente
          </button>
        </section>
      )}

      {/* Paso 2 - Carrito */}
      {step === 2 && (
        <section className={`step step-2 ${step === 2 ? 'step-active' : ''}`}>
          <h2>Carrito</h2>
          {cartItems.length === 0 ? (
            <p>Tu carrito está vacío.</p>
          ) : (
            <ul className="cart-items">
              {cartItems.map((item) => (
                <li key={item.id} className="cart-item">
                  <Image src={item.image} alt={item.name} width={100} height={100} />
                  <div className="item-info">
                    <p>{item.name}</p>
                    <p>
                      Talla: {item.size} | Color: {item.color}
                    </p>
                    <p>Precio: ${item.price}</p>
                    <p>
                      Cantidad:{' '}
                      <input
                        type="number"
                        min={1}
                        max={item.stock || 100}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                      />
                    </p>
                  </div>
                  <div className="item-actions">
                    <button onClick={() => removeItem(item.id)}>Eliminar</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p>
            <strong>Total:</strong> ${total}
          </p>
          <button onClick={prevStep}>Volver</button>
          <button onClick={nextStep} disabled={cartItems.length === 0}>
            Siguiente
          </button>
        </section>
      )}

      {/* Paso 3 - Pago */}
      {step === 3 && (
        <section className={`step step-3 ${step === 3 ? 'step-active' : ''}`}>
          <h2>Método de pago</h2>
          <p>Total a pagar: ${total}</p>
          <div id="bold-button-container"></div>
          <button onClick={prevStep}>Volver</button>
        </section>
      )}
    </div>
  );
};

export default CheckoutPage;
