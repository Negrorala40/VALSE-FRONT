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
        
        // Primero verificar localStorage como indicador rápido
        const pendingCart = localStorage.getItem('pendingCartItem');
        
        // Obtener token para determinar si está autenticado
        const token = localStorage.getItem('token');
        
        if (token) {
          // Usuario autenticado - verificar carrito del backend
          const res = await fetch('http://localhost:8080/api/cart', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            }
          });
          
          console.log('🛒 Respuesta del carrito (autenticado):', res.status);
          
          if (res.ok) {
            const cartData = await res.json();
            console.log('🛒 Carrito backend:', cartData);
            
            if (!cartData || cartData.length === 0) {
              // Carrito vacío en backend pero podría tener pendingCart
              if (pendingCart) {
                console.log('🛒 Usando pendingCart como fallback');
                setHasCartItems(true);
                setIsLoading(false);
                return;
              }
              console.log('🛒 Carrito vacío, redirigiendo...');
              router.push('/');
              return;
            }
            
            // ¡Tenemos items en el backend!
            console.log('✅ Carrito válido (autenticado), mostrando checkout...');
            setHasCartItems(true);
            setIsLoading(false);
            return;
          }
        }
        
        // Si no está autenticado o falló la verificación del backend
        const res = await fetch('http://localhost:8080/api/cart', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('🛒 Respuesta del carrito (no autenticado):', res.status);
        
        if (res.status === 404 || res.status === 204) {
          // Carrito vacío en el backend
          if (pendingCart) {
            console.log('🛒 Usando pendingCart como fallback (404)');
            setHasCartItems(true);
            setIsLoading(false);
            return;
          }
          console.log('🛒 Carrito vacío, redirigiendo al inicio...');
          router.push('/');
          return;
        }
        
        if (!res.ok) {
          console.error('🛑 Error del servidor:', res.status);
          
          // Fallback a localStorage
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
          if (pendingCart) {
            console.log('🛒 Usando pendingCart como fallback (vacio)');
            setHasCartItems(true);
            setIsLoading(false);
            return;
          }
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