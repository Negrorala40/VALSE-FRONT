'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Checkout from '../components/Checkout';
import '../components/Checkout.css';
import { CART } from '../utils/Api';

const CheckoutPage: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasCartItems, setHasCartItems] = useState(false);

  useEffect(() => {
    console.log('🔍 CheckoutPage montado - Inicio useEffect');
    console.log('🔍 URL actual:', typeof window !== 'undefined' ? window.location.href : 'No window');
    console.log('🔍 CART constante:', CART);
    console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔍 NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    
    const checkCart = async () => {
      try {
        console.log('🛒 Iniciando verificación del carrito...');
        
        // Primero verificar localStorage como indicador rápido
        const pendingCart = localStorage.getItem('pendingCartItem');
        console.log('📦 pendingCart en localStorage:', pendingCart ? 'Sí' : 'No');
        
        // Obtener token para determinar si está autenticado
        const token = localStorage.getItem('token');
        console.log('🔐 Token en localStorage:', token ? 'Sí' : 'No');
        
        // También verificar sessionId - verificar AMBOS formatos
        let sessionId = localStorage.getItem('cartSessionId');
        if (!sessionId) {
          sessionId = localStorage.getItem('cart_session_id');
          console.log('🔄 Usando sessionId alternativo (cart_session_id)');
        }
        console.log('🆔 SessionId encontrado:', sessionId ? sessionId.substring(0, 8) + '...' : 'No');
        
        // Si no hay sessionId, crear uno de emergencia
        if (!sessionId) {
          sessionId = `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('cartSessionId', sessionId);
          localStorage.setItem('cart_session_id', sessionId);
          console.log('🆕 SessionId de emergencia creado:', sessionId.substring(0, 8) + '...');
        }
        
        if (token) {
          // Usuario autenticado - verificar carrito del backend
          console.log('👤 Usuario autenticado, verificando carrito...');
          
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          };
          
          // 🔴 CRÍTICO: AGREGAR SESSION ID SIEMPRE (incluso autenticado)
          if (sessionId) {
            headers['X-Cart-Session-Id'] = sessionId;
            console.log('📤 Enviando sessionId en headers (autenticado):', sessionId.substring(0, 8) + '...');
          }
          
          console.log('📋 Headers para fetch autenticado:', headers);
          console.log('🔗 URL de fetch:', CART);
          
          const res = await fetch(CART, {
            credentials: 'include',
            headers,
          });
          
          console.log('📡 Response status (autenticado):', res.status);
          console.log('📡 Response ok?', res.ok);
          
          // 🔴 GUARDAR SESSION ID DE LA RESPUESTA SI VIENE
          const responseSessionId = res.headers.get('X-Cart-Session-Id');
          if (responseSessionId && responseSessionId !== 'cleared') {
            console.log('📥 SessionId en respuesta (autenticado):', responseSessionId.substring(0, 8) + '...');
            localStorage.setItem('cartSessionId', responseSessionId);
            localStorage.setItem('cart_session_id', responseSessionId);
          }
          
          if (res.ok) {
            const cartData = await res.json();
            console.log('✅ Carrito backend obtenido:', cartData);
            console.log('📦 Tipo de datos:', typeof cartData);
            console.log('📦 Es array?', Array.isArray(cartData));
            console.log('📦 Cantidad de items:', Array.isArray(cartData) ? cartData.length : 'No es array');
            
            if (!cartData || (Array.isArray(cartData) && cartData.length === 0)) {
              // Carrito vacío en backend pero podría tener pendingCart
              console.log('📭 Carrito vacío en backend');
              if (pendingCart) {
                console.log('🔄 Usando pendingCart como fallback');
                setHasCartItems(true);
                setIsLoading(false);
                return;
              }
              console.log('🔄 Carrito vacío, redirigiendo...');
              router.push('/');
              return;
            }
            
            // ¡Tenemos items en el backend!
            console.log('🎉 Carrito válido (autenticado), mostrando checkout...');
            setHasCartItems(true);
            setIsLoading(false);
            return;
          } else {
            console.log('⚠️ Response no ok (autenticado), continuando con verificación no autenticada...');
          }
        }
        
        // Si no está autenticado o falló la verificación del backend
        console.log('👤 Usuario NO autenticado o falló autenticación, verificando carrito anónimo...');
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        // 🔴 CRÍTICO: AGREGAR SESSION ID SIEMPRE (anónimo también)
        if (sessionId) {
          headers['X-Cart-Session-Id'] = sessionId;
          console.log('📤 Enviando sessionId para anónimo:', sessionId.substring(0, 8) + '...');
        } else {
          console.log('⚠️ No hay sessionId para carrito anónimo');
        }
        
        console.log('📋 Headers para fetch anónimo:', headers);
        console.log('🔗 URL de fetch (anónimo):', CART);
        
        const res = await fetch(CART, {
          credentials: 'include',
          headers,
        });
        
        console.log('📡 Response status (no autenticado):', res.status);
        console.log('📡 Response ok?', res.ok);
        
        // 🔴 GUARDAR SESSION ID DE LA RESPUESTA SI VIENE
        const responseSessionId = res.headers.get('X-Cart-Session-Id');
        if (responseSessionId && responseSessionId !== 'cleared') {
          console.log('📥 SessionId en respuesta (anónimo):', responseSessionId.substring(0, 8) + '...');
          localStorage.setItem('cartSessionId', responseSessionId);
          localStorage.setItem('cart_session_id', responseSessionId);
        }
        
        if (res.status === 404 || res.status === 204) {
          // Carrito vacío en el backend
          console.log('📭 Carrito vacío (404/204)');
          if (pendingCart) {
            console.log('🔄 Usando pendingCart como fallback (404/204)');
            setHasCartItems(true);
            setIsLoading(false);
            return;
          }
          console.log('🔄 Carrito vacío, redirigiendo al inicio...');
          router.push('/');
          return;
        }
        
        if (!res.ok) {
          console.error('🛑 Error del servidor:', res.status);
          
          // Intentar obtener texto del error
          try {
            const errorText = await res.text();
            console.log('📄 Error text:', errorText);
          } catch (e) {
            console.log('📄 No se pudo obtener texto del error');
          }
          
          // Fallback a localStorage
          if (pendingCart) {
            try {
              const parsed = JSON.parse(pendingCart);
              if (parsed && parsed.quantity > 0) {
                console.log('🔄 Usando carrito de localStorage como fallback');
                setHasCartItems(true);
                setIsLoading(false);
                return;
              }
            } catch (parseError) {
              console.log('❌ Error parseando pendingCart:', parseError);
            }
          }
          
          console.log('🔄 Error en fetch, redirigiendo...');
          router.push('/');
          return;
        }
        
        const cartData = await res.json();
        console.log('✅ Carrito obtenido (no autenticado):', cartData);
        console.log('📦 Tipo de datos:', typeof cartData);
        console.log('📦 Es array?', Array.isArray(cartData));
        console.log('📦 Cantidad de items:', Array.isArray(cartData) ? cartData.length : 'No es array');
        
        if (!cartData || (Array.isArray(cartData) && cartData.length === 0)) {
          // Carrito vacío
          console.log('📭 Carrito vacío o sin datos');
          if (pendingCart) {
            console.log('🔄 Usando pendingCart como fallback (vacio)');
            setHasCartItems(true);
            setIsLoading(false);
            return;
          }
          console.log('🔄 Carrito vacío, redirigiendo...');
          router.push('/');
          return;
        }
        
        // ¡Tenemos items! Mostrar checkout
        console.log('🎉 Carrito válido, mostrando checkout...');
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
              console.log('🔄 Usando carrito de localStorage (catch)');
              setHasCartItems(true);
              setIsLoading(false);
              return;
            }
          } catch (parseError) {
            console.log('❌ Error parseando pendingCart en catch:', parseError);
          }
        }
        
        console.log('🔄 Error general, redirigiendo...');
        router.push('/');
      }
    };
    
    checkCart();
  }, [router]);

  useEffect(() => {
    console.log('🔄 Estado actualizado - isLoading:', isLoading, 'hasCartItems:', hasCartItems);
  }, [isLoading, hasCartItems]);

  if (isLoading) {
    console.log('⏳ Renderizando loading state...');
    return (
      <div className="checkout-loading">
        <div className="spinner"></div>
        <p>Cargando tu carrito...</p>
      </div>
    );
  }

  if (!hasCartItems) {
    console.log('🚫 No hay items en el carrito, renderizando null...');
    return null; // Se redirigirá automáticamente en el useEffect
  }

  console.log('✅ Renderizando componente Checkout...');
  return (
    <div style={{ marginTop: '4rem' }}>
      <Checkout />
    </div>
  );
};

export default CheckoutPage;