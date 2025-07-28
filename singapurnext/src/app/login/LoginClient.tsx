'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Cookies from 'js-cookie';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://amarte--backendamarte--sjfs798q7b8v.code.run/api/products';

const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect') || '/';

  const { data: session } = useSession();

  // Detectar sesión de Google
  useEffect(() => {
    const fetchGoogleToken = async () => {
      if (!session?.user?.email) return;

      try {
        const response = await fetch(`${API_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: session.user.email }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al autenticar con Google');

        const { token, roles, userId } = data;
        const role = roles.includes('ADMIN') ? 'ADMIN' : roles[0] || 'CUSTOMER';

        localStorage.setItem('token', token);
        localStorage.setItem('role', role);
        localStorage.setItem('userId', String(userId));
        Cookies.set('token', token, { expires: 1 });

        await sendPendingCartItem(token, userId);

        router.push(role === 'ADMIN' ? '/admin' : redirectUrl);
      } catch (err) {
        console.error('Error en login con Google:', err);
        setErrorMessage(err instanceof Error ? err.message : 'Error desconocido');
      }
    };

    fetchGoogleToken();
  }, [session, redirectUrl, router]);

  const toggleRegister = () => {
    setIsRegistering(!isRegistering);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    });
    setErrorMessage('');
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const sendPendingCartItem = async (token: string, userId: string) => {
    const pendingItem = localStorage.getItem('pendingCartItem');
    if (!pendingItem) return;

    try {
      const item = JSON.parse(pendingItem);
      const { variantId, quantity } = item;

      await fetch(
        `${API_URL}/api/cart/add?userId=${userId}&productVariantId=${variantId}&quantity=${quantity}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      localStorage.removeItem('pendingCartItem');
    } catch (err) {
      console.error('Error procesando el pendingCartItem:', err);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    setLoading(true);

    if (isRegistering && formData.password !== formData.confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isRegistering
        ? `${API_URL}/api/users`
        : `${API_URL}/api/auth/login`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          ...(isRegistering && {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
          }),
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Error en la autenticación');

      if (!isRegistering) {
        const { token, roles, userId } = data;
        if (!token || !userId) throw new Error('Datos de autenticación incompletos');

        const role = roles.includes('ADMIN') ? 'ADMIN' : roles[0] || 'CUSTOMER';

        localStorage.setItem('token', token);
        localStorage.setItem('role', role);
        localStorage.setItem('userId', String(userId));
        Cookies.set('token', token, { expires: 1 });

        await sendPendingCartItem(token, userId);

        router.push(role === 'ADMIN' ? '/admin' : redirectUrl);
      } else {
        alert('Usuario registrado exitosamente');
        toggleRegister();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    setGoogleLoading(true);
    try {
      await signIn('google', { callbackUrl: redirectUrl });
    } catch {
      setErrorMessage('Error al iniciar sesión con Google');
      setGoogleLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.formContainer}>
        <h2>{isRegistering ? 'Registrar Usuario' : 'Iniciar Sesión'}</h2>
        {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}
        <form onSubmit={handleSubmit}>
          {isRegistering && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="firstName">Nombre</label>
                <input type="text" id="firstName" value={formData.firstName} onChange={handleChange} required />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="lastName">Apellido</label>
                <input type="text" id="lastName" value={formData.lastName} onChange={handleChange} required />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="phone">Teléfono</label>
                <input type="tel" id="phone" value={formData.phone} onChange={handleChange} required />
              </div>
            </>
          )}
          <div className={styles.formGroup}>
            <label htmlFor="email">Correo Electrónico</label>
            <input type="email" id="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password">Contraseña</label>
            <input type="password" id="password" value={formData.password} onChange={handleChange} required />
          </div>
          {isRegistering && (
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirmar Contraseña</label>
              <input type="password" id="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
            </div>
          )}
          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? 'Cargando...' : isRegistering ? 'Registrar' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className={styles.divider}>o</div>

        <button
          className={styles.btnGoogle}
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          style={{ opacity: googleLoading ? 0.6 : 1 }}
        >
          {googleLoading ? 'Cargando...' : 'Iniciar sesión con Google'}
        </button>

        <p className={styles.toggleText}>
          {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}
          <span onClick={toggleRegister} className={styles.toggleLink}>
            {isRegistering ? ' Inicia Sesión' : ' Regístrate'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
