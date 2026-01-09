'use client';

import { CART } from '../utils/Api';
import React, { useEffect, useRef, useState } from 'react';
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
  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

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

  // CORREGIDO: Solo depende de isOpen
  useEffect(() => {
    const fetchCart = async () => {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');

      console.log('🛒 Fetching cart - Token:', !!token, 'UserId:', userId);

      if (token && userId) {
        // Usuario autenticado
        try {
          const res = await fetch(`${CART}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            credentials: 'include', // IMPORTANTE: Incluir cookies
          });

          if (!res.ok) throw new Error('Error al obtener el carrito');
          const data: ApiCartItem[] = await res.json();

          console.log('🛒 Carrito obtenido (autenticado):', data);

          const transformedItems: CartItem[] = data.map((item) => ({
            id: item.id.toString(),
            image: item.imageUrls?.[0]?.trim() || '/images/placeholder.png',
            name: item.productName?.trim() || 'Producto sin nombre',
            price: item.price,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            stock: item.stock || 100,
          }));

          setCartItems(transformedItems);
        } catch (err) {
          console.error('🛑 Error al cargar el carrito (autenticado):', err);
        }
      } else {
        // Usuario NO autenticado - usar cookies automáticamente
        try {
          const res = await fetch(`${CART}`, {
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // CRÍTICO: Esto envía las cookies automáticamente
          });

          console.log('🛒 Response status:', res.status);
          
          if (!res.ok) {
            if (res.status === 404) {
              console.log('🛒 Carrito vacío (404)');
              setCartItems([]);
              return;
            }
            throw new Error(`Error ${res.status} al obtener el carrito`);
          }
          
          const data: ApiCartItem[] = await res.json();
          console.log('🛒 Carrito obtenido (no autenticado):', data);

          const transformedItems: CartItem[] = data.map((item) => ({
            id: item.id.toString(),
            image: item.imageUrls?.[0]?.trim() || '/images/placeholder.png',
            name: item.productName?.trim() || 'Producto sin nombre',
            price: item.price,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            stock: item.stock || 100,
          }));

          setCartItems(transformedItems);
        } catch (err) {
          console.error('🛑 Error al cargar el carrito (no autenticado):', err);
          // Fallback a localStorage
          const pending = localStorage.getItem('pendingCartItem');
          if (pending) {
            try {
              const parsed = JSON.parse(pending);
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
              setCartItems([validatedItem]);
            } catch {
              console.error('Error al parsear pendingCartItem');
              setCartItems([]);
            }
          } else {
            setCartItems([]);
          }
        }
      }
    };

    if (isOpen) {
      fetchCart();
    }
  }, [isOpen]); // SOLO isOpen

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const item = cartItems.find(i => i.id === itemId);
    if (!item) return;

    if (item.stock && newQuantity > item.stock) {
      alert(`No hay suficiente stock disponible (máximo ${item.stock})`);
      return;
    }

    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    try {
      if (token && userId) {
        // Usuario autenticado
        const res = await fetch(`${CART}/update/${itemId}?quantity=${newQuantity}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!res.ok) throw new Error('Error actualizando cantidad');
      } else {
        // Usuario no autenticado
        const res = await fetch(`${CART}/update/${itemId}?quantity=${newQuantity}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Envía cookies automáticamente
        });

        if (!res.ok) throw new Error('Error actualizando cantidad');
      }

      // Actualizar UI localmente
      const updatedCart = cartItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );
      setCartItems(updatedCart);
    } catch (err) {
      console.error('🛑 Error actualizando cantidad:', err);
      alert('Error al actualizar la cantidad');
    }
  };

  const removeItem = async (itemId: string) => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    try {
      if (token && userId) {
        // Usuario autenticado
        const res = await fetch(`${CART}/remove/${itemId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!res.ok) throw new Error('Error eliminando el producto');
      } else {
        // Usuario no autenticado
        const res = await fetch(`${CART}/remove/${itemId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Envía cookies automáticamente
        });

        if (!res.ok) throw new Error('Error eliminando el producto');
      }

      // Actualizar UI localmente
      const updatedCart = cartItems.filter(item => item.id !== itemId);
      setCartItems(updatedCart);
    } catch (err) {
      console.error('🛑 Error eliminando producto:', err);
      alert('Error al eliminar el producto');
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('Tu carrito está vacío');
      return;
    }
    
    // Verificar si el usuario está autenticado
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login?redirect=/checkout');
      handleClose();
      return;
    }
    
    router.push('/checkout');
    handleClose();
  };

  const handleContinueShopping = () => {
    router.push('/menu');
    handleClose();
  };

  const getSafeImageUrl = (url: string | undefined): string => {
    if (!url || url.trim() === '') {
      return '/images/placeholder.png';
    }
    return url.trim();
  };

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
          className={`cart-overlay ${isOpen ? 'open' : ''} ${isClosing ? 'closing' : ''}`}
          onClick={handleClose}
        />
      )}

      {/* Panel del carrito */}
      <div 
        ref={cartRef} 
        className={`cart-panel ${isOpen ? 'open' : ''} ${isClosing ? 'closing' : ''}`}
      >
        {/* Decoración superior con gradiente */}
        <div className="cart-decoration-top"></div>

        <div className="cart-header">
          <div className="cart-title">
            <div className="cart-icon-wrapper">
              <svg className="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
            </div>
            <div className="cart-title-text">
              <h2>Tu Carrito</h2>
              <span className="cart-subtitle">
                {totalItems === 0 ? 'Vacío' : `${totalItems} producto${totalItems > 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={handleClose} aria-label="Cerrar carrito">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-illustration">
              <div className="empty-bag">
                <svg viewBox="0 0 80 80" fill="none">
                  <rect x="10" y="20" width="60" height="50" rx="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M25 20V15C25 10 30 5 40 5C50 5 55 10 55 15V20" stroke="currentColor" strokeWidth="2" />
                  <circle cx="30" cy="35" r="3" fill="currentColor" opacity="0.3" />
                  <circle cx="50" cy="35" r="3" fill="currentColor" opacity="0.3" />
                  <path
                    d="M32 48C32 48 36 52 40 52C44 52 48 48 48 48"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="empty-stars">
                <span className="star star-1">★</span>
                <span className="star star-2">★</span>
                <span className="star star-3">★</span>
              </div>
            </div>
            <h3 className="empty-title">Tu carrito está vacío</h3>
            <p className="empty-message">
              Explora nuestra colección de pijamas y encuentra el favorito de tus pequeños
            </p>
            <button onClick={handleContinueShopping} className="cart-explore-btn">
              <span>Explorar productos</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items-container">
              <ul className="cart-items">
                {cartItems.map((item, index) => {
                  const safeImage = getSafeImageUrl(item.image);
                  const safeName = getSafeName(item.name);
                  
                  return (
                    <li key={`${item.id}-${index}`} className="cart-item">
                      <div className="cart-item-image">
                        <Image 
                          src={safeImage} 
                          alt={safeName}
                          width={80}
                          height={80}
                          loading="lazy"
                          style={{ objectFit: 'cover' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/placeholder.png';
                          }}
                        />
                      </div>
                      <div className="cart-item-content">
                        <div className="cart-item-header">
                          <p className="cart-item-name">{safeName}</p>
                          <button
                            className="btn-remove"
                            onClick={() => removeItem(item.id)}
                            aria-label="Eliminar producto"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                        <div className="cart-item-tags">
                          <span className="item-tag tag-size">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <path d="M9 9h6v6H9z" />
                            </svg>
                            {item.size || 'N/A'}
                          </span>
                          <span className="item-tag tag-color">
                            <span
                              className="color-dot"
                              style={{
                                background:
                                  item.color === 'Azul' ? '#103359' : 
                                  item.color === 'Verde' ? '#3DB28A' : 
                                  item.color === 'Rosa' ? '#E9566D' :
                                  item.color === 'Morado' ? '#806FF7' :
                                  '#FFD449',
                              }}
                            ></span>
                            {item.color || 'N/A'}
                          </span>
                        </div>
                        <div className="cart-item-footer">
                          <div className="quantity-selector">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              aria-label="Reducir cantidad"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                            </button>
                            <span className="quantity-value">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.stock !== undefined && item.quantity >= item.stock}
                              aria-label="Aumentar cantidad"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                            </button>
                          </div>
                          <p className="cart-item-price">${formatPrice(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="cart-summary">
              <div className="summary-row summary-subtotal">
                <span>Subtotal</span>
                <span>${formatPrice(totalPrice)}</span>
              </div>
              <div className="summary-row summary-shipping">
                <span>Envío</span>
                <span className="shipping-badge">Gratis</span>
              </div>
              <div className="summary-divider"></div>
              <div className="cart-total">
                <span className="total-label">Total</span>
                <span className="total-amount">${formatPrice(totalPrice)}</span>
              </div>

              <div className="cart-actions">
                <button className="btn-checkout" onClick={handleCheckout}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  <span>Proceder al Pago</span>
                </button>
                <button className="cart-continue-btn" onClick={handleContinueShopping}>
                  Seguir Comprando
                </button>
              </div>

              <div className="cart-trust-badges">
                <div className="trust-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                  <span>Pago seguro</span>
                </div>
                <div className="trust-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  <span>Envío gratis</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Cart;