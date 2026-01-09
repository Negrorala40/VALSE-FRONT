'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Checkout from '../components/Checkout';
import '../components/Checkout.css';

const CheckoutPage: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasCartItems, setHasCartItems] = useState(false);

  useEffect(() => {
    const checkCart = async () => {
      try {
        console.log('🛒 Verificando carrito antes de checkout...');
        
        // Intentar obtener el carrito del backend (con cookies)
        const res = await fetch('http://localhost:8080/api/cart', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('🛒 Respuesta del carrito:', res.status);
        
        if (res.status === 404 || res.status === 204) {
          // Carrito vacío en el backend
          console.log('🛒 Carrito vacío, redirigiendo al inicio...');
          router.push('/');
          return;
        }
        
        if (!res.ok) {
          console.error('🛑 Error del servidor:', res.status);
          
          // Como fallback, verificar localStorage
          const pendingCart = localStorage.getItem('pendingCartItem');
          if (pendingCart) {
            try {
              const parsed = JSON.parse(pendingCart);
              if (parsed && parsed.quantity > 0) {
                console.log('🛒 Usando carrito de localStorage como fallback');
                setHasCartItems(true);
                setIsLoading(false);
                return;
              }
            } catch {
              // Error parseando
            }
          }
          
          router.push('/');
          return;
        }
        
        const cartData = await res.json();
        console.log('🛒 Datos del carrito:', cartData);
        
        if (!cartData || cartData.length === 0) {
          // Carrito vacío
          router.push('/');
          return;
        }
        
        // ¡Tenemos items! Mostrar checkout
        console.log('✅ Carrito válido, mostrando checkout...');
        setHasCartItems(true);
        setIsLoading(false);
        
      } catch (error) {
        console.error('🛑 Error checking cart:', error);
        
        // Último fallback: verificar localStorage
        const pendingCart = localStorage.getItem('pendingCartItem');
        if (pendingCart) {
          try {
            const parsed = JSON.parse(pendingCart);
            if (parsed && parsed.quantity > 0) {
              console.log('🛒 Usando carrito de localStorage (catch)');
              setHasCartItems(true);
              setIsLoading(false);
              return;
            }
          } catch {
            // Error parseando
          }
        }
        
        router.push('/');
      }
    };
    
    checkCart();
  }, [router]);

  if (isLoading) {
    return (
      <div className="checkout-loading">
        <div className="spinner"></div>
        <p>Cargando tu carrito...</p>
      </div>
    );
  }

  if (!hasCartItems) {
    return null; // Se redirigirá automáticamente en el useEffect
  }

  return (
    <div style={{ marginTop: '4rem' }}>
      <Checkout />
    </div>
  );
};

export default CheckoutPage;