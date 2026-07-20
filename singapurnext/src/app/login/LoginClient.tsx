'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Cookies from 'js-cookie';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User
} from 'lucide-react';

import { CART, LOGIN_URL } from '../utils/Api';
import styles from '../login/page.module.css';

interface LoginResponse {
  token?: string;
  roles?: string[];
  userId?: string | number;
  message?: string;
  error?: string;
}

interface PendingCartItem {
  variantId: string | number;
  quantity: number;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_FORM: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: ''
};

const CART_SESSION_HEADER = 'X-Cart-Session-Id';

const getRole = (roles?: string[]) => {
  if (!Array.isArray(roles) || roles.length === 0) {
    return 'ROLE_CUSTOMER';
  }

  if (roles.includes('ROLE_ADMIN')) {
    return 'ROLE_ADMIN';
  }

  return roles[0] || 'ROLE_CUSTOMER';
};

const parseResponse = async (response: Response) => {
  const rawText = await response.text();

  if (!rawText) {
    return {
      rawText: '',
      data: null as LoginResponse | null
    };
  }

  try {
    return {
      rawText,
      data: JSON.parse(rawText) as LoginResponse
    };
  } catch {
    return {
      rawText,
      data: null as LoginResponse | null
    };
  }
};

const Login: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const processedGoogleEmailRef = useRef<string | null>(null);
  const redirectUrl = searchParams?.get('redirect') || '/';

  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const saveAuthentication = useCallback(
    (data: LoginResponse) => {
      const { token, roles, userId } = data;

      if (!token || userId === undefined || userId === null) {
        throw new Error(
          'El servidor no devolvió los datos completos de autenticación'
        );
      }

      const role = getRole(roles);

      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('userId', String(userId));

      Cookies.set('token', token, {
        expires: 1,
        path: '/',
        sameSite: 'lax',
        secure: window.location.protocol === 'https:'
      });

      return {
        token,
        role,
        userId: String(userId)
      };
    },
    []
  );

  const sendPendingCartItem = useCallback(
    async (token: string, userId: string) => {
      const pendingValue =
        localStorage.getItem('pendingCartItem');

      if (!pendingValue) {
        return;
      }

      try {
        const pendingItem = JSON.parse(
          pendingValue
        ) as PendingCartItem;

        if (
          !pendingItem.variantId ||
          !pendingItem.quantity ||
          pendingItem.quantity < 1
        ) {
          localStorage.removeItem('pendingCartItem');
          return;
        }

        const sessionId =
          localStorage.getItem('cartSessionId') ||
          Cookies.get('cart_session_id');

        const headers: Record<string, string> = {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        };

        if (sessionId) {
          headers[CART_SESSION_HEADER] = sessionId;
        }

        const response = await fetch(
          `${CART}/add?userId=${encodeURIComponent(
            userId
          )}&productVariantId=${encodeURIComponent(
            String(pendingItem.variantId)
          )}&quantity=${pendingItem.quantity}`,
          {
            method: 'POST',
            headers,
            credentials: 'include'
          }
        );

        if (!response.ok) {
          throw new Error(
            `No fue posible recuperar el producto pendiente (${response.status})`
          );
        }

        localStorage.removeItem('pendingCartItem');
      } catch (error) {
        console.error(
          'Error procesando el producto pendiente:',
          error
        );
      }
    },
    []
  );

  const completeLogin = useCallback(
    async (data: LoginResponse) => {
      const authentication = saveAuthentication(data);

      await sendPendingCartItem(
        authentication.token,
        authentication.userId
      );

      const destination =
        authentication.role === 'ROLE_ADMIN'
          ? '/admin'
          : redirectUrl;

      router.replace(destination);
      router.refresh();
    },
    [
      redirectUrl,
      router,
      saveAuthentication,
      sendPendingCartItem
    ]
  );

  useEffect(() => {
    const email = session?.user?.email;

    if (!email || processedGoogleEmailRef.current === email) {
      return;
    }

    processedGoogleEmailRef.current = email;

    const fetchGoogleToken = async () => {
      setGoogleLoading(true);
      setErrorMessage('');
      setSuccessMessage('');

      try {
        const response = await fetch(
          LOGIN_URL.replace('/login', '/google'),
          {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email })
          }
        );

        const { rawText, data } = await parseResponse(response);

        if (!response.ok) {
          throw new Error(
            data?.error ||
              data?.message ||
              rawText ||
              'No fue posible autenticar la cuenta de Google'
          );
        }

        if (!data) {
          throw new Error(
            'El servidor devolvió una respuesta inválida'
          );
        }

        await completeLogin(data);
      } catch (error) {
        console.error('Error en login con Google:', error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No fue posible iniciar sesión con Google'
        );

        processedGoogleEmailRef.current = null;
      } finally {
        setGoogleLoading(false);
      }
    };

    void fetchGoogleToken();
  }, [completeLogin, session?.user?.email]);

  const changeMode = useCallback((registering: boolean) => {
    setIsRegistering(registering);
    setFormData(EMPTY_FORM);
    setErrorMessage('');
    setSuccessMessage('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, []);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { id, value } = event.target;

    setFormData((current) => ({
      ...current,
      [id]: value
    }));

    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const validateForm = () => {
    if (
      isRegistering &&
      formData.password !== formData.confirmPassword
    ) {
      setErrorMessage('Las contraseñas no coinciden');
      return false;
    }

    if (
      isRegistering &&
      formData.phone.replace(/\D/g, '').length < 8
    ) {
      setErrorMessage(
        'Ingresa un número de teléfono válido'
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setErrorMessage('');
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegistering
        ? LOGIN_URL.replace('/auth/login', '/users')
        : LOGIN_URL;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          ...(isRegistering && {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            phone: formData.phone.trim()
          })
        })
      });

      const { rawText, data } = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            rawText ||
            'No fue posible completar la autenticación'
        );
      }

      if (isRegistering) {
        setSuccessMessage(
          'Tu cuenta fue creada. Ya puedes iniciar sesión.'
        );

        setIsRegistering(false);
        setFormData((current) => ({
          ...EMPTY_FORM,
          email: current.email
        }));
        setShowPassword(false);
        setShowConfirmPassword(false);
        return;
      }

      if (!data) {
        throw new Error(
          'El servidor devolvió una respuesta inválida'
        );
      }

      await completeLogin(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setGoogleLoading(true);

    try {
      await signIn('google', {
        callbackUrl: redirectUrl
      });
    } catch (error) {
      console.error('Error iniciando Google:', error);
      setErrorMessage(
        'No fue posible iniciar sesión con Google'
      );
      setGoogleLoading(false);
    }
  };

  const submitting = loading || googleLoading;

  return (
    <main className={styles.loginPage}>
      <aside className={styles.brandPanel}>
        <Link
          href="/"
          className={styles.brandLogoLink}
          aria-label="Ir al inicio de VALSE"
        >
          <Image
            src="/images/logos/logLog.svg"
            alt="VALSE"
            width={220}
            height={86}
            className={styles.brandLogo}
            priority
          />
        </Link>

        <div className={styles.brandEditorial}>
          <span className={styles.brandEyebrow}>
            VALSE / MEMBER ACCESS
          </span>

          <h1>Movimiento con intención.</h1>

          <p>
            Accede a tu cuenta para comprar con mayor
            facilidad, consultar pedidos y guardar tus datos
            de entrega.
          </p>

          <div className={styles.brandBenefits}>
            <span>
              <Check aria-hidden="true" />
              Compra más rápida
            </span>
            <span>
              <Check aria-hidden="true" />
              Seguimiento de pedidos
            </span>
            <span>
              <Check aria-hidden="true" />
              Direcciones guardadas
            </span>
          </div>
        </div>

        <p className={styles.brandFooter}>
          Diseñado para moverte.
        </p>
      </aside>

      <section className={styles.formPanel}>
        <div className={styles.formPanelInner}>
          <div className={styles.mobileHeader}>
            <Link
              href="/"
              aria-label="Ir al inicio de VALSE"
            >
              <Image
                src="/images/logos/logLog.svg"
                alt="VALSE"
                width={160}
                height={58}
                className={styles.mobileLogo}
                priority
              />
            </Link>
          </div>

          <button
            type="button"
            className={styles.backButton}
            onClick={() => router.back()}
          >
            <ArrowLeft aria-hidden="true" />
            Volver
          </button>

          <div className={styles.authContainer}>
            <header className={styles.authHeader}>
              <span className={styles.authEyebrow}>
                {isRegistering
                  ? 'CREAR CUENTA'
                  : 'BIENVENIDO DE NUEVO'}
              </span>

              <h2>
                {isRegistering
                  ? 'Únete a VALSE'
                  : 'Inicia sesión'}
              </h2>

              <p>
                {isRegistering
                  ? 'Crea tu perfil para guardar direcciones y consultar tus pedidos.'
                  : 'Ingresa tus datos para continuar con tu compra o administrar tu cuenta.'}
              </p>
            </header>

            <div
              className={styles.authTabs}
              role="tablist"
              aria-label="Tipo de acceso"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!isRegistering}
                className={`${styles.authTab} ${
                  !isRegistering
                    ? styles.authTabActive
                    : ''
                }`}
                onClick={() => changeMode(false)}
              >
                Iniciar sesión
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={isRegistering}
                className={`${styles.authTab} ${
                  isRegistering
                    ? styles.authTabActive
                    : ''
                }`}
                onClick={() => changeMode(true)}
              >
                Crear cuenta
              </button>
            </div>

            {errorMessage && (
              <div
                className={styles.messageError}
                role="alert"
              >
                <span className={styles.messageIcon}>!</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div
                className={styles.messageSuccess}
                role="status"
              >
                <Check aria-hidden="true" />
                <span>{successMessage}</span>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className={styles.authForm}
            >
              {isRegistering && (
                <div className={styles.formRow}>
                  <FormField
                    id="firstName"
                    label="Nombre"
                    type="text"
                    value={formData.firstName}
                    placeholder="Tu nombre"
                    autoComplete="given-name"
                    icon={<User aria-hidden="true" />}
                    onChange={handleChange}
                  />

                  <FormField
                    id="lastName"
                    label="Apellido"
                    type="text"
                    value={formData.lastName}
                    placeholder="Tu apellido"
                    autoComplete="family-name"
                    icon={<User aria-hidden="true" />}
                    onChange={handleChange}
                  />
                </div>
              )}

              {isRegistering && (
                <FormField
                  id="phone"
                  label="Teléfono"
                  type="tel"
                  value={formData.phone}
                  placeholder="+57 300 000 0000"
                  autoComplete="tel"
                  icon={<Phone aria-hidden="true" />}
                  onChange={handleChange}
                />
              )}

              <FormField
                id="email"
                label="Correo electrónico"
                type="email"
                value={formData.email}
                placeholder="correo@ejemplo.com"
                autoComplete="email"
                icon={<Mail aria-hidden="true" />}
                onChange={handleChange}
              />

              <PasswordField
                id="password"
                label="Contraseña"
                value={formData.password}
                visible={showPassword}
                autoComplete={
                  isRegistering
                    ? 'new-password'
                    : 'current-password'
                }
                onChange={handleChange}
                onToggle={() =>
                  setShowPassword((current) => !current)
                }
              />

              {isRegistering && (
                <PasswordField
                  id="confirmPassword"
                  label="Confirmar contraseña"
                  value={formData.confirmPassword}
                  visible={showConfirmPassword}
                  autoComplete="new-password"
                  onChange={handleChange}
                  onToggle={() =>
                    setShowConfirmPassword(
                      (current) => !current
                    )
                  }
                />
              )}

              {!isRegistering && (
                <div className={styles.forgotPassword}>
                  <Link href="/recuperar-contrasena">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              )}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting}
              >
                {loading ? (
                  <>
                    <span
                      className={styles.spinner}
                      aria-hidden="true"
                    />
                    Procesando
                  </>
                ) : (
                  <>
                    {isRegistering
                      ? 'Crear cuenta'
                      : 'Iniciar sesión'}
                    <ArrowRight aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <div className={styles.divider}>
              <span>o continúa con</span>
            </div>

            <button
              type="button"
              className={styles.googleButton}
              onClick={() => void handleGoogleLogin()}
              disabled={submitting}
            >
              {googleLoading ? (
                <>
                  <span
                    className={`${styles.spinner} ${styles.spinnerDark}`}
                    aria-hidden="true"
                  />
                  Conectando
                </>
              ) : (
                <>
                  <GoogleIcon />
                  Continuar con Google
                </>
              )}
            </button>

            <div className={styles.securityNote}>
              <ShieldCheck aria-hidden="true" />
              <span>
                Tus credenciales se transmiten mediante una
                conexión protegida.
              </span>
            </div>

            <p className={styles.legalText}>
              Al continuar aceptas los{' '}
              <Link href="/terminos">
                Términos de servicio
              </Link>{' '}
              y la{' '}
              <Link href="/privacidad">
                Política de privacidad
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

interface FormFieldProps {
  id: keyof FormData;
  label: string;
  type: React.HTMLInputTypeAttribute;
  value: string;
  placeholder: string;
  autoComplete: string;
  icon: React.ReactNode;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
}

const FormField = ({
  id,
  label,
  type,
  value,
  placeholder,
  autoComplete,
  icon,
  onChange
}: FormFieldProps) => (
  <label className={styles.formField}>
    <span className={styles.formLabel}>{label}</span>

    <span className={styles.inputWrapper}>
      <span className={styles.inputIcon}>{icon}</span>

      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={styles.formInput}
        required
      />
    </span>
  </label>
);

interface PasswordFieldProps {
  id: 'password' | 'confirmPassword';
  label: string;
  value: string;
  visible: boolean;
  autoComplete: string;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onToggle: () => void;
}

const PasswordField = ({
  id,
  label,
  value,
  visible,
  autoComplete,
  onChange,
  onToggle
}: PasswordFieldProps) => (
  <label className={styles.formField}>
    <span className={styles.formLabel}>{label}</span>

    <span className={styles.inputWrapper}>
      <span className={styles.inputIcon}>
        <Lock aria-hidden="true" />
      </span>

      <input
        id={id}
        name={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder="••••••••"
        autoComplete={autoComplete}
        className={`${styles.formInput} ${styles.passwordInput}`}
        required
      />

      <button
        type="button"
        className={styles.passwordToggle}
        onClick={onToggle}
        aria-label={
          visible
            ? 'Ocultar contraseña'
            : 'Mostrar contraseña'
        }
      >
        {visible ? (
          <EyeOff aria-hidden="true" />
        ) : (
          <Eye aria-hidden="true" />
        )}
      </button>
    </span>
  </label>
);

const GoogleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={styles.googleIcon}
  >
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
);

export default Login;