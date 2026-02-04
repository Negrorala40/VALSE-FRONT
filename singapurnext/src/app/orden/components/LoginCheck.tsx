'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/orders.module.css';

export default function LoginCheck() {
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Verificar si hay token
    const token = localStorage.getItem('auth_token') || 
                  localStorage.getItem('token') || 
                  localStorage.getItem('access_token');
    
    setHasToken(!!token);
    setLoading(false);
    
    if (!token) {
      console.warn('No hay token de autenticación. Redirigiendo a login...');
    }
  }, []);

  const handleLoginRedirect = () => {
    router.push('/login?redirect=/orden');
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Verificando autenticación...</p>
      </div>
    );
  }

  if (!hasToken) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <h2>Acceso Requerido</h2>
          <p>Necesitas iniciar sesión para acceder a la gestión de órdenes.</p>
          <button 
            onClick={handleLoginRedirect}
            className={styles.loginButton}
          >
            Ir a Iniciar Sesión
          </button>
          
          {/* Para desarrollo: formulario simple de token */}
          <div className={styles.devLogin}>
            <h4>Desarrollo: Ingresar Token Manualmente</h4>
            <input
              type="text"
              placeholder="Pega tu token JWT aquí"
              className={styles.tokenInput}
              id="devTokenInput"
            />
            <button 
              onClick={() => {
                const tokenInput = document.getElementById('devTokenInput') as HTMLInputElement;
                if (tokenInput.value) {
                  localStorage.setItem('auth_token', tokenInput.value);
                  window.location.reload();
                }
              }}
              className={styles.tokenButton}
            >
              Guardar Token
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null; // Si hay token, no muestra nada
}