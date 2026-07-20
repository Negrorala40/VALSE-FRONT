'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Cookies from 'js-cookie';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  Edit3,
  Globe2,
  Home,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  User,
  X
} from 'lucide-react';

import { ADDRESS, PERFIL_ME } from '../utils/Api';
import './Perfil.css';

interface Address {
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
}

interface AddressDraft {
  address: string;
  city: string;
  state: string;
  country: string;
}

interface UserData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

type ModalType = 'warning' | 'danger' | 'info';

interface ModalConfig {
  title: string;
  message: string;
  type: ModalType;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}

const EMPTY_USER: UserData = {
  id: 0,
  firstName: '',
  lastName: '',
  email: '',
  phone: ''
};

const EMPTY_ADDRESS: AddressDraft = {
  address: '',
  city: '',
  state: '',
  country: 'Colombia'
};

const readErrorMessage = async (
  response: Response,
  fallback: string
) => {
  const responseText = await response.text();

  if (!responseText) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(responseText) as {
      message?: string;
      error?: string;
    };

    return parsed.message || parsed.error || fallback;
  } catch {
    return responseText;
  }
};

const isAddressComplete = (address: AddressDraft) =>
  Boolean(
    address.address.trim() &&
      address.city.trim() &&
      address.state.trim() &&
      address.country.trim()
  );

const dispatchToast = (
  message: string,
  type: 'success' | 'error' | 'info' = 'success'
) => {
  window.dispatchEvent(
    new CustomEvent('show-toast', {
      detail: {
        message,
        type,
        duration: 3200
      }
    })
  );
};

const ConfirmationModal = ({
  config,
  onClose
}: {
  config: ModalConfig | null;
  onClose: () => void;
}) => {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!config) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !confirming) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [config, confirming, onClose]);

  if (!config) return null;

  const handleConfirm = async () => {
    setConfirming(true);

    try {
      await config.onConfirm();
      onClose();
    } catch {
      // La acción correspondiente ya muestra el error.
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div
      className="perfil-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !confirming
        ) {
          onClose();
        }
      }}
    >
      <section
        className="perfil-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="perfil-modal-title"
        aria-describedby="perfil-modal-description"
      >
        <button
          type="button"
          className="perfil-modal-close"
          onClick={onClose}
          disabled={confirming}
          aria-label="Cerrar"
        >
          <X aria-hidden="true" />
        </button>

        <span
          className={`perfil-modal-symbol perfil-modal-symbol--${config.type}`}
          aria-hidden="true"
        >
          {config.type === 'danger' ? (
            <Trash2 />
          ) : config.type === 'warning' ? (
            <LogOut />
          ) : (
            <Check />
          )}
        </span>

        <span className="perfil-modal-eyebrow">
          Confirmación
        </span>

        <h2 id="perfil-modal-title">{config.title}</h2>

        <p id="perfil-modal-description">
          {config.message}
        </p>

        <div className="perfil-modal-actions">
          <button
            type="button"
            className="perfil-button perfil-button--secondary"
            onClick={onClose}
            disabled={confirming}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="perfil-button perfil-button--primary"
            onClick={() => void handleConfirm()}
            disabled={confirming}
          >
            {confirming ? (
              <>
                <Loader2
                  className="perfil-spin"
                  aria-hidden="true"
                />
                Procesando
              </>
            ) : (
              config.confirmLabel
            )}
          </button>
        </div>
      </section>
    </div>
  );
};

const AddressFields = ({
  value,
  onChange,
  disabled = false
}: {
  value: AddressDraft;
  onChange: (value: AddressDraft) => void;
  disabled?: boolean;
}) => (
  <div className="perfil-address-form-grid">
    <label className="perfil-field perfil-field--full">
      <span>
        <Home aria-hidden="true" />
        Dirección
      </span>
      <input
        type="text"
        value={value.address}
        onChange={(event) =>
          onChange({
            ...value,
            address: event.target.value
          })
        }
        placeholder="Calle, carrera, número y complemento"
        autoComplete="street-address"
        disabled={disabled}
      />
    </label>

    <label className="perfil-field">
      <span>
        <Building2 aria-hidden="true" />
        Ciudad
      </span>
      <input
        type="text"
        value={value.city}
        onChange={(event) =>
          onChange({
            ...value,
            city: event.target.value
          })
        }
        placeholder="Medellín"
        autoComplete="address-level2"
        disabled={disabled}
      />
    </label>

    <label className="perfil-field">
      <span>
        <MapPin aria-hidden="true" />
        Departamento
      </span>
      <input
        type="text"
        value={value.state}
        onChange={(event) =>
          onChange({
            ...value,
            state: event.target.value
          })
        }
        placeholder="Antioquia"
        autoComplete="address-level1"
        disabled={disabled}
      />
    </label>

    <label className="perfil-field perfil-field--full">
      <span>
        <Globe2 aria-hidden="true" />
        País
      </span>
      <input
        type="text"
        value={value.country}
        onChange={(event) =>
          onChange({
            ...value,
            country: event.target.value
          })
        }
        placeholder="Colombia"
        autoComplete="country-name"
        disabled={disabled}
      />
    </label>
  </div>
);

const Perfil = () => {
  const router = useRouter();

  const fetchControllerRef =
    useRef<AbortController | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<UserData>(EMPTY_USER);
  const [addresses, setAddresses] = useState<Address[]>([]);

  const [newAddress, setNewAddress] =
    useState<AddressDraft>(EMPTY_ADDRESS);
  const [showNewAddress, setShowNewAddress] = useState(false);

  const [editingAddressId, setEditingAddressId] =
    useState<number | null>(null);
  const [editedAddress, setEditedAddress] =
    useState<AddressDraft>(EMPTY_ADDRESS);

  const [savingProfile, setSavingProfile] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressActionId, setAddressActionId] =
    useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalConfig | null>(
    null
  );

  useEffect(() => {
    setIsClient(true);
    setToken(localStorage.getItem('token'));
  }, []);

  const authHeaders = useMemo<Record<string, string>>(
    () => ({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token
        ? {
            Authorization: `Bearer ${token}`
          }
        : {})
    }),
    [token]
  );

  const loadProfile = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    fetchControllerRef.current?.abort();
    fetchControllerRef.current = new AbortController();

    setLoading(true);
    setError('');

    try {
      const [userResponse, addressesResponse] =
        await Promise.all([
          fetch(PERFIL_ME, {
            method: 'GET',
            headers: authHeaders,
            credentials: 'include',
            signal: fetchControllerRef.current.signal
          }),
          fetch(ADDRESS, {
            method: 'GET',
            headers: authHeaders,
            credentials: 'include',
            signal: fetchControllerRef.current.signal
          })
        ]);

      if (!userResponse.ok) {
        throw new Error(
          await readErrorMessage(
            userResponse,
            'No fue posible cargar tu información'
          )
        );
      }

      if (!addressesResponse.ok) {
        throw new Error(
          await readErrorMessage(
            addressesResponse,
            'No fue posible cargar tus direcciones'
          )
        );
      }

      const userData = (await userResponse.json()) as UserData;
      const addressesText = await addressesResponse.text();

      setUser({
        id: Number(userData.id || 0),
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.phone || ''
      });

      setAddresses(
        addressesText
          ? (JSON.parse(addressesText) as Address[])
          : []
      );
    } catch (loadError) {
      if (
        loadError instanceof Error &&
        loadError.name === 'AbortError'
      ) {
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No fue posible cargar tu perfil'
      );
    } finally {
      setLoading(false);
    }
  }, [authHeaders, token]);

  useEffect(() => {
    if (!isClient) return;

    void loadProfile();

    return () => {
      fetchControllerRef.current?.abort();
    };
  }, [isClient, loadProfile]);

  const refreshAddresses = useCallback(async () => {
    if (!token) return;

    const response = await fetch(ADDRESS, {
      method: 'GET',
      headers: authHeaders,
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(
          response,
          'No fue posible actualizar tus direcciones'
        )
      );
    }

    const responseText = await response.text();

    setAddresses(
      responseText
        ? (JSON.parse(responseText) as Address[])
        : []
    );
  }, [authHeaders, token]);

  const updateProfile = async () => {
    if (!token) return;

    const firstName = user.firstName.trim();
    const lastName = user.lastName.trim();
    const phone = user.phone.trim();

    if (!firstName || !lastName || !phone) {
      setError(
        'Completa el nombre, apellido y teléfono antes de guardar.'
      );
      throw new Error('Formulario incompleto');
    }

    setSavingProfile(true);
    setError('');

    try {
      const response = await fetch(PERFIL_ME, {
        method: 'PUT',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          firstName,
          lastName,
          phone
        })
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            'No fue posible actualizar tu información'
          )
        );
      }

      const responseText = await response.text();

      if (responseText) {
        const updatedUser = JSON.parse(
          responseText
        ) as Partial<UserData>;

        setUser((current) => ({
          ...current,
          ...updatedUser,
          email: updatedUser.email || current.email
        }));
      }

      dispatchToast(
        'Información personal actualizada',
        'success'
      );
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : 'No fue posible actualizar tu información';

      setError(message);
      dispatchToast(message, 'error');
      throw updateError;
    } finally {
      setSavingProfile(false);
    }
  };

  const requestProfileUpdate = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setModal({
      title: 'Guardar información',
      message:
        'Se actualizarán tu nombre, apellido y teléfono. El correo permanecerá sin cambios.',
      type: 'info',
      confirmLabel: 'Guardar cambios',
      onConfirm: updateProfile
    });
  };

  const addAddress = async () => {
    if (!token || !isAddressComplete(newAddress)) {
      setError(
        'Completa todos los campos de la nueva dirección.'
      );
      throw new Error('Dirección incompleta');
    }

    setAddingAddress(true);
    setError('');

    try {
      const response = await fetch(ADDRESS, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          address: newAddress.address.trim(),
          city: newAddress.city.trim(),
          state: newAddress.state.trim(),
          country: newAddress.country.trim()
        })
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            'No fue posible agregar la dirección'
          )
        );
      }

      await refreshAddresses();

      setNewAddress(EMPTY_ADDRESS);
      setShowNewAddress(false);
      dispatchToast('Dirección agregada', 'success');
    } catch (addressError) {
      const message =
        addressError instanceof Error
          ? addressError.message
          : 'No fue posible agregar la dirección';

      setError(message);
      dispatchToast(message, 'error');
      throw addressError;
    } finally {
      setAddingAddress(false);
    }
  };

  const startEditingAddress = (address: Address) => {
    setEditingAddressId(address.id);
    setEditedAddress({
      address: address.address,
      city: address.city,
      state: address.state,
      country: address.country
    });
    setShowNewAddress(false);
    setError('');
  };

  const cancelEditingAddress = () => {
    setEditingAddressId(null);
    setEditedAddress(EMPTY_ADDRESS);
  };

  const updateAddress = async (addressId: number) => {
    if (!token || !isAddressComplete(editedAddress)) {
      setError(
        'Completa todos los campos de la dirección.'
      );
      throw new Error('Dirección incompleta');
    }

    setAddressActionId(addressId);
    setError('');

    try {
      const response = await fetch(
        `${ADDRESS}/${addressId}`,
        {
          method: 'PUT',
          headers: authHeaders,
          credentials: 'include',
          body: JSON.stringify({
            id: addressId,
            address: editedAddress.address.trim(),
            city: editedAddress.city.trim(),
            state: editedAddress.state.trim(),
            country: editedAddress.country.trim()
          })
        }
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            'No fue posible actualizar la dirección'
          )
        );
      }

      await refreshAddresses();
      cancelEditingAddress();
      dispatchToast('Dirección actualizada', 'success');
    } catch (addressError) {
      const message =
        addressError instanceof Error
          ? addressError.message
          : 'No fue posible actualizar la dirección';

      setError(message);
      dispatchToast(message, 'error');
      throw addressError;
    } finally {
      setAddressActionId(null);
    }
  };

  const deleteAddress = async (addressId: number) => {
    if (!token) return;

    setAddressActionId(addressId);
    setError('');

    try {
      const response = await fetch(
        `${ADDRESS}/${addressId}`,
        {
          method: 'DELETE',
          headers: authHeaders,
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            'No fue posible eliminar la dirección'
          )
        );
      }

      await refreshAddresses();

      if (editingAddressId === addressId) {
        cancelEditingAddress();
      }

      dispatchToast('Dirección eliminada', 'success');
    } catch (addressError) {
      const message =
        addressError instanceof Error
          ? addressError.message
          : 'No fue posible eliminar la dirección';

      setError(message);
      dispatchToast(message, 'error');
      throw addressError;
    } finally {
      setAddressActionId(null);
    }
  };

  const logout = async () => {
    setLoggingOut(true);

    try {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');

      Cookies.remove('token', {
        path: '/'
      });

      await signOut({
        redirect: false
      });

      router.replace('/');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const initials = useMemo(() => {
    const firstInitial = user.firstName
      .trim()
      .charAt(0)
      .toUpperCase();
    const lastInitial = user.lastName
      .trim()
      .charAt(0)
      .toUpperCase();

    return `${firstInitial}${lastInitial}` || 'V';
  }, [user.firstName, user.lastName]);

  const fullName =
    `${user.firstName} ${user.lastName}`.trim() ||
    'Tu cuenta';

  if (!isClient || loading) {
    return (
      <main className="perfil-page perfil-page--loading">
        <div className="perfil-loading">
          <span className="perfil-loader" aria-hidden="true" />
          <p>Cargando tu cuenta</p>
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="perfil-page">
        <section className="perfil-auth-required">
          <Image
            src="/images/logos/logLog.svg"
            alt="VALSE"
            width={180}
            height={70}
            className="perfil-auth-logo"
            priority
          />

          <span>CUENTA VALSE</span>
          <h1>Inicia sesión para ver tu perfil.</h1>
          <p>
            Accede a tus datos personales y direcciones de
            entrega.
          </p>

          <button
            type="button"
            className="perfil-button perfil-button--primary"
            onClick={() =>
              router.push('/login?redirect=/perfil')
            }
          >
            Iniciar sesión
            <ChevronRight aria-hidden="true" />
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="perfil-page">
      <ConfirmationModal
        config={modal}
        onClose={() => setModal(null)}
      />

      <header className="perfil-mobile-header">
        <Link href="/" aria-label="Ir al inicio">
          <Image
            src="/images/logos/logLog.svg"
            alt="VALSE"
            width={150}
            height={56}
            priority
          />
        </Link>
      </header>

      <div className="perfil-shell">
        <aside className="perfil-sidebar">
          <Link
            href="/"
            className="perfil-logo-link"
            aria-label="Ir al inicio de VALSE"
          >
            <Image
              src="/images/logos/logLog.svg"
              alt="VALSE"
              width={190}
              height={74}
              className="perfil-logo"
              priority
            />
          </Link>

          <div className="perfil-account-summary">
            <span className="perfil-avatar">
              {initials}
            </span>

            <div>
              <span className="perfil-sidebar-eyebrow">
                MI CUENTA
              </span>
              <h1>{fullName}</h1>
              <p>{user.email}</p>
            </div>
          </div>

          <div className="perfil-sidebar-stat">
            <span>Direcciones guardadas</span>
            <strong>{addresses.length}</strong>
          </div>

          <nav
            className="perfil-sidebar-nav"
            aria-label="Secciones del perfil"
          >
            <a href="#informacion">
              <User aria-hidden="true" />
              Información personal
              <ChevronRight aria-hidden="true" />
            </a>

            <a href="#direcciones">
              <MapPin aria-hidden="true" />
              Direcciones
              <ChevronRight aria-hidden="true" />
            </a>
          </nav>

          <div className="perfil-sidebar-security">
            <ShieldCheck aria-hidden="true" />
            <span>
              Tu correo se mantiene protegido y no puede
              modificarse desde esta sección.
            </span>
          </div>

          <button
            type="button"
            className="perfil-logout-button"
            onClick={() =>
              setModal({
                title: 'Cerrar sesión',
                message:
                  'Se cerrará la sesión actual. Tu carrito continuará disponible en este dispositivo.',
                type: 'warning',
                confirmLabel: 'Cerrar sesión',
                onConfirm: logout
              })
            }
            disabled={loggingOut}
          >
            {loggingOut ? (
              <Loader2
                className="perfil-spin"
                aria-hidden="true"
              />
            ) : (
              <LogOut aria-hidden="true" />
            )}
            Cerrar sesión
          </button>
        </aside>

        <section className="perfil-content">
          <div className="perfil-content-header">
            <button
              type="button"
              className="perfil-back-button"
              onClick={() => router.back()}
            >
              <ArrowLeft aria-hidden="true" />
              Volver
            </button>

            <div>
              <span>VALSE / PERFIL</span>
              <h2>Gestiona tu cuenta</h2>
              <p>
                Actualiza tus datos y mantén listas tus
                direcciones para una compra más rápida.
              </p>
            </div>
          </div>

          {error && (
            <div className="perfil-error" role="alert">
              <AlertCircle aria-hidden="true" />
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError('')}
                aria-label="Cerrar mensaje"
              >
                <X aria-hidden="true" />
              </button>
            </div>
          )}

          <section
            id="informacion"
            className="perfil-section"
          >
            <div className="perfil-section-header">
              <span className="perfil-section-icon">
                <User aria-hidden="true" />
              </span>

              <div>
                <span>INFORMACIÓN PERSONAL</span>
                <h3>Tus datos</h3>
                <p>
                  El nombre y el teléfono se utilizarán para
                  gestionar tus pedidos.
                </p>
              </div>
            </div>

            <form
              className="perfil-profile-form"
              onSubmit={requestProfileUpdate}
            >
              <div className="perfil-form-grid">
                <label className="perfil-field">
                  <span>
                    <User aria-hidden="true" />
                    Nombre
                  </span>
                  <input
                    type="text"
                    value={user.firstName}
                    onChange={(event) =>
                      setUser((current) => ({
                        ...current,
                        firstName: event.target.value
                      }))
                    }
                    placeholder="Tu nombre"
                    autoComplete="given-name"
                    disabled={savingProfile}
                    required
                  />
                </label>

                <label className="perfil-field">
                  <span>
                    <User aria-hidden="true" />
                    Apellido
                  </span>
                  <input
                    type="text"
                    value={user.lastName}
                    onChange={(event) =>
                      setUser((current) => ({
                        ...current,
                        lastName: event.target.value
                      }))
                    }
                    placeholder="Tu apellido"
                    autoComplete="family-name"
                    disabled={savingProfile}
                    required
                  />
                </label>

                <label className="perfil-field perfil-field--full">
                  <span>
                    <Mail aria-hidden="true" />
                    Correo electrónico
                    <small>
                      <Lock aria-hidden="true" />
                      No editable
                    </small>
                  </span>
                  <input
                    type="email"
                    value={user.email}
                    autoComplete="email"
                    disabled
                  />
                </label>

                <label className="perfil-field perfil-field--full">
                  <span>
                    <Phone aria-hidden="true" />
                    Teléfono
                  </span>
                  <input
                    type="tel"
                    value={user.phone}
                    onChange={(event) =>
                      setUser((current) => ({
                        ...current,
                        phone: event.target.value
                      }))
                    }
                    placeholder="+57 300 000 0000"
                    autoComplete="tel"
                    disabled={savingProfile}
                    required
                  />
                </label>
              </div>

              <div className="perfil-form-actions">
                <button
                  type="submit"
                  className="perfil-button perfil-button--primary"
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <>
                      <Loader2
                        className="perfil-spin"
                        aria-hidden="true"
                      />
                      Guardando
                    </>
                  ) : (
                    <>
                      <Save aria-hidden="true" />
                      Guardar cambios
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          <section
            id="direcciones"
            className="perfil-section"
          >
            <div className="perfil-section-header perfil-section-header--actions">
              <span className="perfil-section-icon">
                <MapPin aria-hidden="true" />
              </span>

              <div>
                <span>DIRECCIONES DE ENVÍO</span>
                <h3>Tus direcciones</h3>
                <p>
                  Administra los lugares donde recibirás tus
                  pedidos.
                </p>
              </div>

              <button
                type="button"
                className="perfil-button perfil-button--secondary perfil-add-button"
                onClick={() => {
                  setShowNewAddress((current) => !current);
                  cancelEditingAddress();
                  setError('');
                }}
              >
                {showNewAddress ? (
                  <X aria-hidden="true" />
                ) : (
                  <Plus aria-hidden="true" />
                )}
                {showNewAddress ? 'Cancelar' : 'Nueva dirección'}
              </button>
            </div>

            {showNewAddress && (
              <div className="perfil-new-address">
                <div className="perfil-inline-header">
                  <div>
                    <span>NUEVA DIRECCIÓN</span>
                    <h4>Agrega un lugar de entrega</h4>
                  </div>
                </div>

                <AddressFields
                  value={newAddress}
                  onChange={setNewAddress}
                  disabled={addingAddress}
                />

                <div className="perfil-inline-actions">
                  <button
                    type="button"
                    className="perfil-button perfil-button--secondary"
                    onClick={() => {
                      setShowNewAddress(false);
                      setNewAddress(EMPTY_ADDRESS);
                    }}
                    disabled={addingAddress}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="perfil-button perfil-button--primary"
                    onClick={() =>
                      setModal({
                        title: 'Agregar dirección',
                        message:
                          'La nueva dirección quedará disponible para tus próximos pedidos.',
                        type: 'info',
                        confirmLabel: 'Agregar dirección',
                        onConfirm: addAddress
                      })
                    }
                    disabled={
                      addingAddress ||
                      !isAddressComplete(newAddress)
                    }
                  >
                    {addingAddress ? (
                      <>
                        <Loader2
                          className="perfil-spin"
                          aria-hidden="true"
                        />
                        Agregando
                      </>
                    ) : (
                      <>
                        <Plus aria-hidden="true" />
                        Agregar dirección
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {addresses.length === 0 ? (
              <div className="perfil-empty-state">
                <span>
                  <MapPin aria-hidden="true" />
                </span>
                <h4>No tienes direcciones guardadas</h4>
                <p>
                  Agrega una dirección para completar tus
                  compras más rápido.
                </p>
              </div>
            ) : (
              <div className="perfil-address-list">
                {addresses.map((address, index) => {
                  const isEditing =
                    editingAddressId === address.id;
                  const isWorking =
                    addressActionId === address.id;

                  return (
                    <article
                      key={address.id}
                      className={`perfil-address-card ${
                        isEditing
                          ? 'perfil-address-card--editing'
                          : ''
                      }`}
                    >
                      {isEditing ? (
                        <>
                          <div className="perfil-address-index">
                            {String(index + 1).padStart(
                              2,
                              '0'
                            )}
                          </div>

                          <div className="perfil-address-edit">
                            <div className="perfil-inline-header">
                              <div>
                                <span>EDITAR DIRECCIÓN</span>
                                <h4>
                                  Actualiza los datos de
                                  entrega
                                </h4>
                              </div>
                            </div>

                            <AddressFields
                              value={editedAddress}
                              onChange={setEditedAddress}
                              disabled={isWorking}
                            />

                            <div className="perfil-inline-actions">
                              <button
                                type="button"
                                className="perfil-button perfil-button--secondary"
                                onClick={cancelEditingAddress}
                                disabled={isWorking}
                              >
                                Cancelar
                              </button>

                              <button
                                type="button"
                                className="perfil-button perfil-button--primary"
                                onClick={() =>
                                  setModal({
                                    title:
                                      'Actualizar dirección',
                                    message:
                                      'Se guardarán los cambios realizados en esta dirección.',
                                    type: 'info',
                                    confirmLabel:
                                      'Guardar dirección',
                                    onConfirm: () =>
                                      updateAddress(address.id)
                                  })
                                }
                                disabled={
                                  isWorking ||
                                  !isAddressComplete(
                                    editedAddress
                                  )
                                }
                              >
                                {isWorking ? (
                                  <>
                                    <Loader2
                                      className="perfil-spin"
                                      aria-hidden="true"
                                    />
                                    Guardando
                                  </>
                                ) : (
                                  <>
                                    <Save aria-hidden="true" />
                                    Guardar dirección
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="perfil-address-index">
                            {String(index + 1).padStart(
                              2,
                              '0'
                            )}
                          </div>

                          <div className="perfil-address-main">
                            <span className="perfil-address-symbol">
                              <Home aria-hidden="true" />
                            </span>

                            <div className="perfil-address-copy">
                              <h4>{address.address}</h4>
                              <p>
                                {address.city},{' '}
                                {address.state}
                              </p>
                              <span>{address.country}</span>
                            </div>
                          </div>

                          <div className="perfil-address-actions">
                            <button
                              type="button"
                              onClick={() =>
                                startEditingAddress(address)
                              }
                              disabled={isWorking}
                              aria-label={`Editar ${address.address}`}
                            >
                              <Edit3 aria-hidden="true" />
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setModal({
                                  title:
                                    'Eliminar dirección',
                                  message:
                                    'Esta acción no se puede deshacer.',
                                  type: 'danger',
                                  confirmLabel:
                                    'Eliminar dirección',
                                  onConfirm: () =>
                                    deleteAddress(address.id)
                                })
                              }
                              disabled={isWorking}
                              aria-label={`Eliminar ${address.address}`}
                            >
                              {isWorking ? (
                                <Loader2
                                  className="perfil-spin"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Trash2 aria-hidden="true" />
                              )}
                              Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
};

export default Perfil;