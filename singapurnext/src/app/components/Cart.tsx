'use client';

import { CART } from '../utils/Api';
import React, { useEffect, useRef, useCallback, useState } from 'react';
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
  isOpen: boolean;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0 }).format(price);

const Cart: React.FC<CartProps> = ({ cartItems, setCartItems, onClose, isOpen }) => {
  const cartRef = useRef<HTMLDivElement | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const router = useRouter();

  const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  const memoizedSetCartItems = useCallback(setCartItems, [setCartItems]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 400);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && cartRef.current && !cartRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    const fetchCart = async () => {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');

      if (token && userId) {
        try {
          const res = await fetch(`${CART}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!res.ok) throw new Error('Error al obtener el carrito');
          const data: ApiCartItem[] = await res.json();

          const transformedItems: CartItem[] = data.map((item) => ({
            id: item.id.toString(),
            image: item.imageUrls?.[0] || '/images/placeholder.png',
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

    if (isOpen) {
      fetchCart();
    }
  }, [memoizedSetCartItems, isOpen]);

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
      try {
        const res = await fetch(`${CART}/update/${itemId}?quantity=${newQuantity}`, {
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
      try {
        const res = await fetch(`${CART}/remove/${itemId}`, {
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
      localStorage.removeItem('pendingCartItem');
    }

    const updatedCart = cartItems.filter(item => item.id !== itemId);
    memoizedSetCartItems(updatedCart);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('Tu carrito está vacío');
      return;
    }
    
    router.push('/checkout');
    handleClose();
  };

  const handleContinueShopping = () => {
    router.push('/menu');
    handleClose();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className={`cart-overlay ${isClosing ? 'closing' : ''}`}
          onClick={handleClose}
        />
      )}

      {/* Panel del carrito */}
      <div 
        ref={cartRef} 
        className={`cart-panel ${isOpen ? 'open' : ''} ${isClosing ? 'closing' : ''}`}
      >
        <div className="cart-header">
          <div className="cart-title">
            <div className="rocket-icon-container">
              <Image
                src="/images/logos/logCohete.svg"
                alt="Cohete"
                width={28}
                height={28}
                className="rocket-icon"
                priority={true}
                loading="eager"
              />
            </div>
            <h2>Tu carrito</h2>
          </div>
          <button 
            className="close-btn" 
            onClick={handleClose}
            aria-label="Cerrar carrito"
          >
            ✕
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <p className="empty-message">Tu carrito está vacío</p>
            <button 
              onClick={handleContinueShopping}
              className="cart-continue-btn"
            >
              Ver productos
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items-container">
              <ul className="cart-items">
                {cartItems.map((item, index) => (
                  <li key={`${item.id}-${index}`} className="cart-item">
                    <div className="cart-item-image">
                      <Image 
                        src={item.image} 
                        alt={item.name}
                        width={70}
                        height={70}
                        loading="lazy" // 🔥 CAMBIADO: lazy en lugar de priority
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <div className="cart-item-content">
                      <div className="cart-item-details">
                        <p className="cart-item-name">{item.name}</p>
                        <p className="cart-item-info">
                          <span>Talla: {item.size}</span>
                          <span>Color: {item.color}</span>
                        </p>
                        <p className="cart-item-price">${formatPrice(item.price)}</p>
                      </div>
                      <div className="cart-item-controls">
                        <div className="quantity-selector">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            aria-label="Reducir cantidad"
                          >
                            -
                          </button>
                          <span className="quantity-value">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.stock !== undefined && item.quantity >= item.stock}
                            aria-label="Aumentar cantidad"
                          >
                            +
                          </button>
                        </div>
                        <button 
                          className="btn-remove" 
                          onClick={() => removeItem(item.id)}
                          aria-label="Eliminar producto"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="cart-summary">
              <div className="cart-total">
                <span className="total-label">Total:</span>
                <span className="total-amount">${formatPrice(totalPrice)}</span>
              </div>
              <div className="cart-actions">
                <button
                  className="btn-checkout"
                  onClick={handleCheckout}
                >
                  Proceder al Pago
                </button>
                <button
                  className="cart-continue-btn"
                  onClick={handleContinueShopping}
                >
                  Seguir Comprando
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Cart;