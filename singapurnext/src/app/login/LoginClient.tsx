'use client';
import { LOGIN_URL, CART } from '../utils/Api';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Cookies from 'js-cookie';
import styles from '../login/page.module.css'; // Cambia la importación

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect') || '/';
  const { data: session } = useSession();

  // 🔹 Detectar sesión de Google
  useEffect(() => {
    const fetchGoogleToken = async () => {
      if (!session?.user?.email) return;

      try {
        const response = await fetch(`${LOGIN_URL.replace('/login', '/google')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: session.user.email }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al autenticar con Google');

        const { token, roles, userId } = data;
        const role = Array.isArray(roles)
          ? roles.includes('ROLE_ADMIN')
            ? 'ROLE_ADMIN'
            : roles[0] || 'ROLE_CUSTOMER'
          : 'ROLE_CUSTOMER';

        localStorage.setItem('token', token);
        localStorage.setItem('role', role);
        localStorage.setItem('userId', String(userId));
        Cookies.set('token', token, { expires: 1 });

        await sendPendingCartItem(token, userId);
        router.push(role === 'ROLE_ADMIN' ? '/admin' : redirectUrl);
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
        `${CART}/add?userId=${userId}&productVariantId=${variantId}&quantity=${quantity}`,
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
        ? `${LOGIN_URL.replace('/auth/login', '/users')}`
        : LOGIN_URL;

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

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }

      if (!response.ok) {
        if (rawText) {
          setErrorMessage(rawText);
        } else if (response.status === 404 && data && data.message) {
          setErrorMessage(data.message);
        } else if (response.status === 401 && data && data.message) {
          setErrorMessage(data.message);
        } else {
          setErrorMessage((data && data.message) || 'Error en la autenticación');
        }
        setLoading(false);
        return;
      }

      if (!isRegistering) {
        const { token, roles, userId } = data;
        if (!token || !userId) throw new Error('Datos de autenticación incompletos');

        const role = Array.isArray(roles)
          ? roles.includes('ROLE_ADMIN')
            ? 'ROLE_ADMIN'
            : roles[0] || 'ROLE_CUSTOMER'
          : 'ROLE_CUSTOMER';

        localStorage.setItem('token', token);
        localStorage.setItem('role', role);
        localStorage.setItem('userId', String(userId));
        Cookies.set('token', token, { expires: 1 });

        await sendPendingCartItem(token, userId);
        router.push(role === 'ROLE_ADMIN' ? '/admin' : redirectUrl);
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
    <div className={styles.loginPage}>
      {/* Decorative elements */}
      <div className={styles.loginStars}>
        <span className={`${styles.star} ${styles.star1}`}></span>
        <span className={`${styles.star} ${styles.star2}`}></span>
        <span className={`${styles.star} ${styles.star3}`}></span>
        <span className={`${styles.star} ${styles.star4}`}></span>
        <span className={`${styles.star} ${styles.star5}`}></span>
        <span className={`${styles.star} ${styles.star6}`}></span>
      </div>

      <div className={`${styles.loginPlanet} ${styles.planet1}`}></div>
      <div className={`${styles.loginPlanet} ${styles.planet2}`}></div>

      <div className={styles.loginCard}>
        {/* Decorative top bar */}
        <div className={styles.loginCardTopBar}></div>

        {/* Logo/Brand */}
        <div className={styles.loginCardBrand}>
          <div className={styles.loginCardLogo}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 2C12 2 14 6 14 12C14 18 12 22 12 22" stroke="currentColor" strokeWidth="2" />
              <path d="M2 12H22" stroke="currentColor" strokeWidth="2" />
              <path d="M4 7H20" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
              <path d="M4 17H20" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
            </svg>
          </div>
          <h1 className={styles.loginCardBrandName}>A Marte</h1>
          <p className={styles.loginCardTagline}>Dulces sueños para pequeños astronautas</p>
        </div>

        {/* Tabs */}
        <div className={styles.loginCardTabs}>
          <button
            type="button"
            className={`${styles.loginCardTab} ${!isRegistering ? styles.loginCardTabActive : ''}`}
            onClick={() => isRegistering && toggleRegister()}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            className={`${styles.loginCardTab} ${isRegistering ? styles.loginCardTabActive : ''}`}
            onClick={() => !isRegistering && toggleRegister()}
          >
            Registrarse
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className={styles.loginCardError}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1" fill="currentColor" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.loginCardForm}>
          {isRegistering && (
            <div className={styles.loginCardRow}>
              <div className={styles.loginCardField}>
                <label htmlFor="firstName" className={styles.loginCardLabel}>
                  Nombre
                </label>
                <div className={styles.loginCardInputWrapper}>
                  <svg className={styles.loginCardInputIcon} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                    <path
                      d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Tu nombre"
                    required
                    className={styles.loginCardInput}
                  />
                </div>
              </div>
              <div className={styles.loginCardField}>
                <label htmlFor="lastName" className={styles.loginCardLabel}>
                  Apellido
                </label>
                <div className={styles.loginCardInputWrapper}>
                  <svg className={styles.loginCardInputIcon} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                    <path
                      d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Tu apellido"
                    required
                    className={styles.loginCardInput}
                  />
                </div>
              </div>
            </div>
          )}

          {isRegistering && (
            <div className={styles.loginCardField}>
              <label htmlFor="phone" className={styles.loginCardLabel}>
                Teléfono
              </label>
              <div className={styles.loginCardInputWrapper}>
                <svg className={styles.loginCardInputIcon} viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22 16.92V19.92C22 20.48 21.56 20.93 21 20.99C20.5 21.03 19.99 21 19.5 20.91C16.47 20.38 13.59 19.17 11.07 17.37C8.72 15.72 6.72 13.72 5.07 11.37C3.27 8.85 2.06 5.97 1.53 2.94C1.44 2.45 1.41 1.94 1.45 1.44C1.51 0.88 1.96 0.44 2.52 0.44H5.52C6.03 0.44 6.47 0.81 6.55 1.31C6.62 1.76 6.74 2.2 6.9 2.62C7.08 3.11 6.95 3.66 6.56 4.03L5.31 5.28C6.79 7.82 8.91 9.94 11.45 11.42L12.7 10.17C13.07 9.78 13.62 9.65 14.11 9.83C14.53 9.99 14.97 10.11 15.42 10.18C15.92 10.26 16.29 10.7 16.29 11.21V14.21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+34 600 000 000"
                  required
                  className={styles.loginCardInput}
                />
              </div>
            </div>
          )}

          <div className={styles.loginCardField}>
            <label htmlFor="email" className={styles.loginCardLabel}>
              Correo Electrónico
            </label>
            <div className={styles.loginCardInputWrapper}>
              <svg className={styles.loginCardInputIcon} viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
                <path d="M2 7L12 13L22 7" stroke="currentColor" strokeWidth="2" />
              </svg>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                required
                className={styles.loginCardInput}
              />
            </div>
          </div>

          <div className={styles.loginCardField}>
            <label htmlFor="password" className={styles.loginCardLabel}>
              Contraseña
            </label>
            <div className={styles.loginCardInputWrapper}>
              <svg className={styles.loginCardInputIcon} viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="16" r="1.5" fill="currentColor" />
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="********"
                required
                className={styles.loginCardInput}
              />
              <button
                type="button"
                className={styles.loginCardTogglePassword}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12" stroke="currentColor" strokeWidth="2" />
                    <path
                      d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {isRegistering && (
            <div className={styles.loginCardField}>
              <label htmlFor="confirmPassword" className={styles.loginCardLabel}>
                Confirmar Contraseña
              </label>
              <div className={styles.loginCardInputWrapper}>
                <svg className={styles.loginCardInputIcon} viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9 16L11 18L15 14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="********"
                  required
                  className={styles.loginCardInput}
                />
                <button
                  type="button"
                  className={styles.loginCardTogglePassword}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showConfirmPassword ? (
                    <svg viewBox="0 0 24 24" fill="none">
                      <path
                        d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12" stroke="currentColor" strokeWidth="2" />
                      <path
                        d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {!isRegistering && (
            <div className={styles.loginCardForgot}>
              <a href="/recuperar-contrasena">¿Olvidaste tu contraseña?</a>
            </div>
          )}

          <button type="submit" className={styles.loginCardSubmit} disabled={loading}>
            {loading ? (
              <>
                <span className={styles.loginCardSpinner}></span>
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <span>{isRegistering ? "Crear cuenta" : "Iniciar Sesión"}</span>
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12H19M19 12L12 5M19 12L12 19"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className={styles.loginCardDivider}>
          <span>o continúa con</span>
        </div>

        {/* Google button */}
        <button type="button" className={styles.loginCardGoogle} onClick={handleGoogleLogin} disabled={googleLoading}>
          {googleLoading ? (
            <>
              <span className={`${styles.loginCardSpinner} ${styles.loginCardSpinnerDark}`}></span>
              <span>Conectando...</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Google</span>
            </>
          )}
        </button>

        {/* Footer */}
        <p className={styles.loginCardFooter}>
          Al continuar, aceptas nuestros <a href="/terminos">Términos de Servicio</a> y{" "}
          <a href="/privacidad">Política de Privacidad</a>
        </p>
      </div>
    </div>
  );
};

export default Login;