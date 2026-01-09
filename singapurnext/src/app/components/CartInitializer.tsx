'use client';

import { useEffect } from 'react';
import Cookies from 'js-cookie';

export default function CartInitializer() {
  useEffect(() => {
    // Función para inicializar o verificar la sesión del carrito
    const initializeCartSession = async () => {
      try {
        // Verificar si ya existe un sessionId en las cookies
        let sessionId = Cookies.get('cart_session_id');
        
        if (!sessionId) {
          // Si no existe, generar uno nuevo llamando al backend
          const response = await fetch('http://localhost:8080/api/cart/new-session', {
            method: 'POST',
            credentials: 'include', // Importante para cookies
          });
          
          if (response.ok) {
            const data = await response.json();
            sessionId = data.sessionId;
            console.log('Nueva sesión creada:', sessionId);
          } else {
            console.warn('No se pudo crear nueva sesión, usando local');
            // Fallback: generar un sessionId local
            sessionId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            Cookies.set('cart_session_id', sessionId, {
              expires: 7, // 7 días
              path: '/',
              sameSite: 'lax'
            });
          }
        }
        
        // Almacenar sessionId también en localStorage para fácil acceso
        if (sessionId) {
          localStorage.setItem('cart_session_id', sessionId);
        }
        
      } catch (error) {
        console.error('Error inicializando carrito:', error);
      }
    };
    
    initializeCartSession();
  }, []);
  
  return null; // Este componente no renderiza nada
}