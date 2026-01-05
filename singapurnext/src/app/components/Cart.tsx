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
            image: item.imageUrls?.[0]?.trim() || '/images/placeholder.png', // Asegura que no sea vacío
            name: item.productName?.trim() || 'Producto sin nombre', // Asegura que no sea vacío
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
            const parsed = JSON.parse(pending);
            // Valida y asegura los campos del item del localStorage
            const validatedItem: CartItem = {
              id: parsed.id?.toString() || `pending-${Date.now()}`,
              image: parsed.imageUrl?.trim() || parsed.image?.trim() || '/images/placeholder.png',
              name: parsed.productName?.trim() || parsed.name?.trim() || 'Producto sin nombre',
              price: parsed.price || 0,
              size: parsed.size || '',
              color: parsed.color || '',
              quantity: parsed.quantity || 1,
              stock: parsed.stock || 100,
            };
            memoizedSetCartItems([validatedItem]);
          } catch {
            console.error('Error al parsear pendingCartItem');
            memoizedSetCartItems([]);
          }
        } else {
          memoizedSetCartItems([]);
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

  // Función para validar y limpiar URL de imagen
  const getSafeImageUrl = (url: string | undefined): string => {
    if (!url || url.trim() === '') {
      return '/images/placeholder.png';
    }
    return url.trim();
  };

  // Función para obtener nombre seguro
  const getSafeName = (name: string | undefined): string => {
    if (!name || name.trim() === '') {
      return 'Producto sin nombre';
    }
    return name.trim();
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
                {cartItems.map((item, index) => {
                  // Validar y obtener valores seguros
                  const safeImage = getSafeImageUrl(item.image);
                  const safeName = getSafeName(item.name);
                  
                  return (
                    <li key={`${item.id}-${index}`} className="cart-item">
                      <div className="cart-item-image">
                        <Image 
                          src={safeImage} 
                          alt={safeName}
                          width={70}
                          height={70}
                          loading="lazy"
                          style={{ objectFit: 'cover' }}
                          onError={(e) => {
                            // Fallback si la imagen falla
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/placeholder.png';
                          }}
                        />
                      </div>
                      <div className="cart-item-content">
                        <div className="cart-item-details">
                          <p className="cart-item-name">{safeName}</p>
                          <p className="cart-item-info">
                            <span>Talla: {item.size || 'No especificada'}</span>
                            <span>Color: {item.color || 'No especificado'}</span>
                          </p>
                          <p className="cart-item-price">${formatPrice(item.price || 0)}</p>
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
                  );
                })}
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