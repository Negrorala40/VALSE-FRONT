'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import './Cart.css';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface ApiCartItem {
  id: number;
  imageUrls: string[];
  productName: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
  stock?: number;
}

interface CartItem {
  id: string;
  image: string;
  name: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
  stock?: number;
}

interface CartProps {
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onClose: () => void;
}

const API_URL = 'https://amarte--backendamarte--sjfs798q7b8v.code.run';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0 }).format(price);

const Cart: React.FC<CartProps> = ({ cartItems, setCartItems, onClose }) => {
  const cartRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  // Corregir dependencia de useEffect
  const memoizedSetCartItems = useCallback(setCartItems, [setCartItems]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cartRef.current && !cartRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const fetchCart = async () => {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');

      if (token && userId) {
        // 🧾 CARRITO DE USUARIO LOGUEADO
        try {
          const res = await fetch(`${API_URL}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!res.ok) throw new Error('Error al obtener el carrito');
          const data: ApiCartItem[] = await res.json();

          const transformedItems: CartItem[] = data.map((item) => ({
            id: item.id.toString(),
            image: item.imageUrls?.[0] || '/placeholder.png',
            name: item.productName,
            price: item.price,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            stock: item.stock || 100,
          }));

          memoizedSetCartItems(transformedItems);
        } catch (err) {
          console.error('🛑 Error al cargar el carrito:', err);
        }
      } else {
        // 🧾 CARRITO DE INVITADO (pendingCartItem)
        const pending = localStorage.getItem('pendingCartItem');
        if (pending) {
          try {
            const parsed: CartItem = JSON.parse(pending);
            memoizedSetCartItems([parsed]);
          } catch {
            console.error('Error al parsear pendingCartItem');
          }
        }
      }
    };

    fetchCart();
  }, [memoizedSetCartItems]);

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const item = cartItems.find(i => i.id === itemId);
    if (!item) return;

    if (item.stock && newQuantity > item.stock) {
      alert(`No hay suficiente stock disponible (máximo ${item.stock})`);
      return;
    }

    const token = localStorage.getItem('token');
    if (token) {
      // Usuario logueado: Actualiza en backend
      try {
        const res = await fetch(`${API_URL}/update/${itemId}?quantity=${newQuantity}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) throw new Error('Error actualizando cantidad');
      } catch (err) {
        console.error('🛑 Error actualizando cantidad:', err);
        return;
      }
    } else {
      // Usuario invitado: actualiza localStorage
      const updatedItem = { ...item, quantity: newQuantity };
      localStorage.setItem('pendingCartItem', JSON.stringify(updatedItem));
    }

    const updatedCart = cartItems.map((item) =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    );
    memoizedSetCartItems(updatedCart);
  };

  const removeItem = async (itemId: string) => {
    const token = localStorage.getItem('token');

    if (token) {
      // Usuario logueado: elimina del backend
      try {
        const res = await fetch(`${API_URL}/remove/${itemId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) throw new Error('Error eliminando el producto');
      } catch (err) {
        console.error('🛑 Error eliminando producto:', err);
        return;
      }
    } else {
      // Usuario invitado: borra de localStorage solo el item eliminado
      // Si tienes más de un producto en el futuro, deberías guardar un array en localStorage
      // Aquí asumo que solo tienes 1 producto en pendingCartItem
      localStorage.removeItem('pendingCartItem');
    }

    // Elimina el item del estado para actualizar la UI inmediatamente
    const updatedCart = cartItems.filter(item => item.id !== itemId);
    memoizedSetCartItems(updatedCart);
  };

  return (
    <div ref={cartRef} className="cart-panel open">
      <div className="cart-header">
        <h2>Tu carrito 🚀</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {cartItems.length === 0 ? (
        <p className="empty-message">Tu carrito está vacío.</p>
      ) : (
        <>
          <ul className="cart-items">
            {cartItems.map((item) => (
              <li key={item.id} className="cart-item">
                <div className="cart-item-image">
                  <Image 
                    src={item.image} 
                    alt={item.name}
                    width={100}
                    height={100}
                    priority={true}
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div>
                  <p>{item.name}</p>
                  <p>Talla: {item.size}</p>
                  <p>Color: {item.color}</p>
                  <p>${formatPrice(item.price)}</p>
                  <div className="quantity-selector">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.stock !== undefined && item.quantity >= item.stock}
                    >
                      +
                    </button>
                  </div>
                </div>
                <button className="btn-remove" onClick={() => removeItem(item.id)}>Eliminar</button>
              </li>
            ))}
          </ul>

          <div className="cart-summary">
            <p>Total: ${formatPrice(totalPrice)}</p>
            <button
              className="btn-checkout"
              onClick={() => {
                router.push('/checkout');
                onClose();
              }}
            >
              Ir a Pagar
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;
