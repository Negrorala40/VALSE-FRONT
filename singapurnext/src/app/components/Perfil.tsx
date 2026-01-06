'use client';

import { PERFIL_ME, ADDRESS } from '../utils/Api';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './Perfil.css';
import { signOut } from "next-auth/react";
import Image from 'next/image';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Edit3,
  Trash2,
  Save,
  X,
  LogOut,
  Plus,
  Rocket,
  Star,
  Moon,
  Sparkles,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Info,
  Lock,
  Home,
  Building,
  Globe,
} from 'lucide-react';

interface Address {
  id: number;
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

interface ModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  type: "warning" | "danger" | "info";
  onConfirm: () => void;
}

// Componente de estrellas flotantes para el fondo
const FloatingStars = () => (
  <div className="perfil-floating-stars">
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="perfil-star-item"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${2 + Math.random() * 2}s`,
        }}
      >
        <Star className="perfil-star-icon" style={{ width: 8 + Math.random() * 12, height: 8 + Math.random() * 12 }} />
      </div>
    ))}
  </div>
);

// Componente de modal personalizado
const CustomModal: React.FC<{
  config: ModalConfig | null;
  onClose: () => void;
}> = ({ config, onClose }) => {
  if (!config || !config.isOpen) return null;

  const iconMap = {
    warning: <AlertTriangle className="perfil-modal-icon perfil-modal-icon--warning" />,
    danger: <Trash2 className="perfil-modal-icon perfil-modal-icon--danger" />,
    info: <Info className="perfil-modal-icon perfil-modal-icon--info" />,
  };

  return (
    <div className="perfil-modal-overlay" onClick={onClose}>
      <div className="perfil-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="perfil-modal-header">
          <div className="perfil-modal-icon-wrapper">{iconMap[config.type]}</div>
          <h2 className="perfil-modal-title">{config.title}</h2>
          <p className="perfil-modal-message">{config.message}</p>
        </div>
        <div className="perfil-modal-footer">
          <button className="perfil-btn perfil-btn--outline" onClick={onClose}>
            Cancelar
          </button>
          <button
            className={`perfil-btn perfil-btn--${config.type}`}
            onClick={() => {
              config.onConfirm();
              onClose();
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast de éxito
const SuccessToast: React.FC<{ message: string; show: boolean }> = ({ message, show }) => {
  if (!show) return null;

  return (
    <div className="perfil-toast perfil-toast--success">
      <CheckCircle className="perfil-toast-icon" />
      <span className="perfil-toast-message">{message}</span>
    </div>
  );
};

// Componente de tarjeta de dirección
const AddressCard: React.FC<{
  address: Address;
  isEditing: boolean;
  editedAddress: Address | null;
  onEdit: () => void;
  onDelete: () => void;
  onSave: () => void;
  onCancel: () => void;
  onEditChange: (address: Address) => void;
}> = ({ address, isEditing, editedAddress, onEdit, onDelete, onSave, onCancel, onEditChange }) => {
  if (isEditing && editedAddress) {
    return (
      <div className="perfil-address-card perfil-address-card--editing">
        <div className="perfil-address-form-grid">
          <div className="perfil-form-group">
            <label className="perfil-form-label">
              <Home className="perfil-label-icon" /> Dirección
            </label>
            <input
              type="text"
              className="perfil-form-input perfil-form-input--purple"
              value={editedAddress.address}
              onChange={(e) => onEditChange({ ...editedAddress, address: e.target.value })}
              placeholder="Calle y número"
            />
          </div>
          <div className="perfil-form-group">
            <label className="perfil-form-label">
              <Building className="perfil-label-icon" /> Ciudad
            </label>
            <input
              type="text"
              className="perfil-form-input perfil-form-input--purple"
              value={editedAddress.city}
              onChange={(e) => onEditChange({ ...editedAddress, city: e.target.value })}
              placeholder="Ciudad"
            />
          </div>
          <div className="perfil-form-group">
            <label className="perfil-form-label">
              <MapPin className="perfil-label-icon" /> Estado/Departamento
            </label>
            <input
              type="text"
              className="perfil-form-input perfil-form-input--purple"
              value={editedAddress.state}
              onChange={(e) => onEditChange({ ...editedAddress, state: e.target.value })}
              placeholder="Estado o Departamento"
            />
          </div>
          <div className="perfil-form-group">
            <label className="perfil-form-label">
              <Globe className="perfil-label-icon" /> País
            </label>
            <input
              type="text"
              className="perfil-form-input perfil-form-input--purple"
              value={editedAddress.country}
              onChange={(e) => onEditChange({ ...editedAddress, country: e.target.value })}
              placeholder="País"
            />
          </div>
        </div>
        <div className="perfil-address-card-actions">
          <button className="perfil-btn perfil-btn--success" onClick={onSave}>
            <Save className="perfil-btn-icon" /> Guardar
          </button>
          <button className="perfil-btn perfil-btn--outline-danger" onClick={onCancel}>
            <X className="perfil-btn-icon" /> Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="perfil-address-card">
      <div className="perfil-address-card-accent" />
      <div className="perfil-address-card-content">
        <div className="perfil-address-info-grid">
          <div className="perfil-address-info-item">
            <div className="perfil-address-info-icon perfil-address-info-icon--green">
              <Home />
            </div>
            <div className="perfil-address-info-text">
              <span className="perfil-address-info-label">Dirección</span>
              <p className="perfil-address-info-value">{address.address}</p>
            </div>
          </div>
          <div className="perfil-address-info-item">
            <div className="perfil-address-info-icon perfil-address-info-icon--yellow">
              <Building />
            </div>
            <div className="perfil-address-info-text">
              <span className="perfil-address-info-label">Ciudad</span>
              <p className="perfil-address-info-value">{address.city}</p>
            </div>
          </div>
          <div className="perfil-address-info-item">
            <div className="perfil-address-info-icon perfil-address-info-icon--purple">
              <MapPin />
            </div>
            <div className="perfil-address-info-text">
              <span className="perfil-address-info-label">Estado</span>
              <p className="perfil-address-info-value">{address.state}</p>
            </div>
          </div>
          <div className="perfil-address-info-item">
            <div className="perfil-address-info-icon perfil-address-info-icon--pink">
              <Globe />
            </div>
            <div className="perfil-address-info-text">
              <span className="perfil-address-info-label">País</span>
              <p className="perfil-address-info-value">{address.country}</p>
            </div>
          </div>
        </div>
        <div className="perfil-address-card-footer">
          <button className="perfil-btn perfil-btn--outline-yellow" onClick={onEdit}>
            <Edit3 className="perfil-btn-icon" /> Editar
          </button>
          <button className="perfil-btn perfil-btn--outline-danger" onClick={onDelete}>
            <Trash2 className="perfil-btn-icon" /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

const Perfil = () => {
  const [formData, setFormData] = useState<UserData>({
    id: 0,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [newAddress, setNewAddress] = useState<Omit<Address, 'id'>>({
    address: '',
    city: '',
    state: '',
    country: '',
  });

  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editedAddress, setEditedAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCheckmark, setShowCheckmark] = useState<boolean>(false);
  
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const [isClient, setIsClient] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);
    setIsLoading(false);
  }, []);

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const loadUserData = useCallback(async () => {
    if (!token) {
      setError('Usuario no identificado');
      return;
    }

    try {
      console.log('🔍 Cargando datos de usuario desde:', PERFIL_ME);
      
      const response = await fetch(PERFIL_ME, {
        method: 'GET',
        headers: authHeaders,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en respuesta:', errorText);
        throw new Error(`Error ${response.status}: ${errorText || 'Error al cargar los datos del usuario'}`);
      }

      const userData: UserData = await response.json();
      console.log('✅ Datos del usuario cargados:', userData);
      
      setFormData(userData);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al cargar los datos del usuario';
      setError(errorMsg);
      console.error('Error en loadUserData:', err);
    }
  }, [authHeaders, token]);

  const loadAddresses = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(ADDRESS, {
        method: 'GET',
        headers: authHeaders,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText || 'Error al cargar direcciones'}`);
      }

      const text = await response.text();
      const addressList: Address[] = text ? JSON.parse(text) : [];

      setAddresses(addressList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar direcciones');
      console.error('Error en loadAddresses:', err);
    }
  }, [authHeaders, token]);

  useEffect(() => {
    if (token && !isLoading) {
      loadUserData();
      loadAddresses();
    }
  }, [loadUserData, loadAddresses, token, isLoading]);

  const showSuccessCheckmark = (message: string) => {
    setSuccess(message);
    setShowCheckmark(true);
    setTimeout(() => {
      setShowCheckmark(false);
      setSuccess(null);
    }, 2000);
  };

  const showModal = (
    title: string, 
    message: string, 
    type: "warning" | "danger" | "info",
    onConfirm: () => void
  ) => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm
    });
  };

  const handleAddAddress = async () => {
    if (!token) return;
    
    try {
      console.log('➕ Agregando dirección:', newAddress);
      
      const response = await fetch(ADDRESS, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newAddress),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText || 'Error al agregar la dirección'}`);
      }

      setNewAddress({ address: '', city: '', state: '', country: '' });
      setShowAddressForm(false);
      await loadAddresses();
      showSuccessCheckmark('¡Dirección agregada correctamente!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar la dirección');
      console.error(err);
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    if (!token) return;
    
    showModal(
      'Eliminar Dirección',
      '¿Estás seguro de que deseas eliminar esta dirección? Esta acción no se puede deshacer.',
      'danger',
      async () => {
        try {
          const response = await fetch(`${ADDRESS}/${addressId}`, {
            method: 'DELETE',
            headers: authHeaders,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText || 'Error al eliminar la dirección'}`);
          }

          await loadAddresses();
          showSuccessCheckmark('Dirección eliminada correctamente');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error al eliminar la dirección');
          console.error(err);
        }
      }
    );
  };

  const handleEditAddress = (index: number) => {
    setEditIndex(index);
    setEditedAddress(addresses[index]);
  };

  const handleSaveAddress = async () => {
    if (!editedAddress || !token) return;

    showModal(
      'Guardar Cambios',
      '¿Guardar los cambios en esta dirección?',
      'info',
      async () => {
        try {
          const response = await fetch(`${ADDRESS}/${editedAddress.id}`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify(editedAddress),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText || 'Error al actualizar la dirección'}`);
          }

          setEditIndex(null);
          setEditedAddress(null);
          await loadAddresses();
          showSuccessCheckmark('Dirección actualizada correctamente');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error al actualizar la dirección');
          console.error(err);
        }
      }
    );
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    showModal(
      'Actualizar Perfil',
      '¿Deseas guardar los cambios en tu información personal?',
      'info',
      async () => {
        setError(null);
        
        try {
          const payload = {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            phone: formData.phone.trim(),
          };

          console.log('🔄 Enviando actualización a:', PERFIL_ME);
          console.log('📦 Payload:', payload);
          
          const response = await fetch(PERFIL_ME, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify(payload),
          });

          const responseText = await response.text();
          console.log('📥 Respuesta del servidor:', response.status, responseText);
          
          if (!response.ok) {
            let errorMsg = responseText;
            try {
              const errorJson = JSON.parse(responseText);
              errorMsg = errorJson.message || errorJson.error || responseText;
            } catch {
              // Si no es JSON, usar el texto tal cual
            }
            throw new Error(`Error ${response.status}: ${errorMsg}`);
          }

          const updatedUser = JSON.parse(responseText);
          console.log('✅ Usuario actualizado:', updatedUser);
          
          setFormData({
            id: updatedUser.id || formData.id,
            firstName: updatedUser.firstName || formData.firstName,
            lastName: updatedUser.lastName || formData.lastName,
            email: updatedUser.email || formData.email,
            phone: updatedUser.phone || formData.phone,
          });
          
          showSuccessCheckmark('¡Información actualizada correctamente!');
          
          setTimeout(() => {
            loadUserData();
          }, 500);
          
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Error desconocido al actualizar';
          setError(`❌ ${errorMsg}`);
          console.error('Error completo en handleUpdateUser:', {
            error: err,
            formData,
            token: token ? 'Presente' : 'Ausente',
            url: PERFIL_ME
          });
        }
      }
    );
  };

  const handleLogout = async () => {
    showModal(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión? Se cerrará tu sesión en todos los dispositivos.',
      'warning',
      async () => {
        localStorage.clear();
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        await signOut({ callbackUrl: "/" });
      }
    );
  };

  if (!isClient || isLoading) {
    return (
      <div className="perfil-page">
        <div className="perfil-loading-screen">
          <div className="perfil-loading-content">
            <div className="perfil-loading-spinner">
              <div className="perfil-spinner-track" />
              <div className="perfil-spinner-gradient" />
              <Rocket className="perfil-spinner-icon" />
            </div>
            <p className="perfil-loading-text">Cargando tu perfil espacial...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="perfil-page">
        <div className="perfil-content-container">
          <div className="perfil-header">
            <h1 className="perfil-header-title">
              <span className="perfil-brand-name">Acceso Restringido</span>
            </h1>
            <p className="perfil-header-subtitle">Por favor inicia sesión para ver tu perfil.</p>
            <button 
              onClick={() => window.location.href = '/login'} 
              className="perfil-btn perfil-btn--primary"
              style={{ marginTop: '20px', maxWidth: '250px' }}
            >
              Ir a Iniciar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="perfil-page">
      {/* Barra superior decorativa */}
      <div className="perfil-top-bar" />

      {/* Modal */}
      <CustomModal config={modal} onClose={() => setModal(null)} />

      {/* Toast de éxito */}
      <SuccessToast message={success || ""} show={showCheckmark} />

      <div className="perfil-content-container">
        <FloatingStars />

        {/* Header */}
        <header className="perfil-header">
          <div className="perfil-header-logo">
            <div className="perfil-logo-icon">
              {/* Tu imagen SVG del cohete */}
              <Image
                src="/images/logos/logCohete.svg"
                alt="Cohete A Marte"
                width={70}
                height={70}
                className="perfil-logo-svg"
              />
              <div className="perfil-logo-badge">
                <Sparkles />
              </div>
            </div>
          </div>

          <h1 className="perfil-header-title">
            Bienvenido a tu Perfil en{" "}
            <span className="perfil-brand-name">
              A Marte
              <span className="perfil-brand-underline" />
            </span>{" "}
            <Moon className="perfil-moon-icon" />
          </h1>

          <p className="perfil-header-subtitle">
            Gestiona tu información personal y direcciones de envío para recibir tus pijamas espaciales
          </p>
        </header>

        {/* Mensajes de error */}
        {error && (
          <div className="perfil-error-banner">
            <AlertTriangle className="perfil-error-icon" />
            <p className="perfil-error-text">{error}</p>
            <button onClick={() => setError(null)} className="perfil-error-close">
              <X />
            </button>
          </div>
        )}

        {/* Información Personal */}
        <div className="perfil-card">
          <div className="perfil-card-accent perfil-card-accent--green" />
          <div className="perfil-card-header">
            <div className="perfil-card-header-icon perfil-card-header-icon--green">
              <User />
            </div>
            <div className="perfil-card-header-text">
              <h2 className="perfil-card-title">Información Personal</h2>
              <p className="perfil-card-description">Actualiza tus datos de contacto</p>
            </div>
          </div>
          <div className="perfil-card-body">
            <form onSubmit={handleUpdateUser} className="perfil-profile-form">
              <div className="perfil-form-row">
                <div className="perfil-form-group">
                  <label className="perfil-form-label">
                    <User className="perfil-label-icon" /> Nombre
                  </label>
                  <input
                    type="text"
                    className="perfil-form-input"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Tu nombre"
                    required
                  />
                </div>
                <div className="perfil-form-group">
                  <label className="perfil-form-label">
                    <User className="perfil-label-icon" /> Apellido
                  </label>
                  <input
                    type="text"
                    className="perfil-form-input"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Tu apellido"
                    required
                  />
                </div>
              </div>

              <div className="perfil-form-group">
                <label className="perfil-form-label">
                  <Mail className="perfil-label-icon" /> Email
                  <span className="perfil-form-badge">
                    <Lock className="perfil-badge-icon" />
                    No editable
                  </span>
                </label>
                <input type="email" className="perfil-form-input perfil-form-input--disabled" value={formData.email} disabled />
                <p className="perfil-form-hint">El email es tu nombre de usuario y no se puede modificar</p>
              </div>

              <div className="perfil-form-group">
                <label className="perfil-form-label">
                  <Phone className="perfil-label-icon" /> Teléfono
                </label>
                <input
                  type="tel"
                  className="perfil-form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ej: 3001234567"
                  required
                />
              </div>

              <button type="submit" className="perfil-btn perfil-btn--primary">
                <Save className="perfil-btn-icon" />
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>

        {/* Direcciones de Envío */}
        <div className="perfil-card">
          <div className="perfil-card-accent perfil-card-accent--orange" />
          <div className="perfil-card-header">
            <div className="perfil-card-header-icon perfil-card-header-icon--orange">
              <MapPin />
            </div>
            <div className="perfil-card-header-text">
              <h2 className="perfil-card-title">Direcciones de Envío</h2>
              <p className="perfil-card-description">Gestiona tus direcciones para recibir tus pedidos</p>
            </div>
          </div>
          <div className="perfil-card-body">
            {addresses.length > 0 ? (
              <div className="perfil-addresses-list">
                {addresses.map((addr, index) => (
                  <AddressCard
                    key={addr.id}
                    address={addr}
                    isEditing={editIndex === index}
                    editedAddress={editedAddress}
                    onEdit={() => handleEditAddress(index)}
                    onDelete={() => handleDeleteAddress(addr.id)}
                    onSave={handleSaveAddress}
                    onCancel={() => {
                      setEditIndex(null);
                      setEditedAddress(null);
                    }}
                    onEditChange={setEditedAddress}
                  />
                ))}
              </div>
            ) : (
              <div className="perfil-empty-state">
                <div className="perfil-empty-state-icon">
                  <MapPin />
                </div>
                <p className="perfil-empty-state-title">No hay direcciones registradas</p>
                <p className="perfil-empty-state-text">Agrega una para recibir tus pedidos espaciales</p>
              </div>
            )}

            {/* Botón para agregar dirección */}
            <button className="perfil-btn perfil-btn--dashed" onClick={() => setShowAddressForm(!showAddressForm)}>
              {showAddressForm ? (
                <>
                  <ChevronDown className="perfil-btn-icon perfil-btn-icon--rotate" />
                  Ocultar formulario
                </>
              ) : (
                <>
                  <Plus className="perfil-btn-icon" />
                  Agregar nueva dirección
                </>
              )}
            </button>

            {/* Formulario para agregar nueva dirección */}
            {showAddressForm && (
              <div className="perfil-new-address-form">
                <div className="perfil-new-address-header">
                  <div className="perfil-new-address-badge">+</div>
                  Nueva Dirección
                </div>
                <div className="perfil-address-form-grid">
                  <div className="perfil-form-group">
                    <label className="perfil-form-label perfil-form-label--small">
                      <Home className="perfil-label-icon" /> Dirección
                    </label>
                    <input
                      type="text"
                      className="perfil-form-input perfil-form-input--green"
                      value={newAddress.address}
                      onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                      placeholder="Calle y número"
                    />
                  </div>
                  <div className="perfil-form-group">
                    <label className="perfil-form-label perfil-form-label--small">
                      <Building className="perfil-label-icon" /> Ciudad
                    </label>
                    <input
                      type="text"
                      className="perfil-form-input perfil-form-input--green"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      placeholder="Ciudad"
                    />
                  </div>
                  <div className="perfil-form-group">
                    <label className="perfil-form-label perfil-form-label--small">
                      <MapPin className="perfil-label-icon" /> Estado/Departamento
                    </label>
                    <input
                      type="text"
                      className="perfil-form-input perfil-form-input--green"
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      placeholder="Estado o Departamento"
                    />
                  </div>
                  <div className="perfil-form-group">
                    <label className="perfil-form-label perfil-form-label--small">
                      <Globe className="perfil-label-icon" /> País
                    </label>
                    <input
                      type="text"
                      className="perfil-form-input perfil-form-input--green"
                      value={newAddress.country}
                      onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                      placeholder="País"
                    />
                  </div>
                </div>
                <button 
                  className="perfil-btn perfil-btn--primary perfil-btn--full" 
                  onClick={handleAddAddress}
                  disabled={!newAddress.address || !newAddress.city || !newAddress.state || !newAddress.country}
                >
                  <Plus className="perfil-btn-icon" />
                  Agregar Dirección
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cerrar Sesión */}
        <div className="perfil-card perfil-card--logout">
          <div className="perfil-card-body perfil-card-body--center">
            <button className="perfil-btn perfil-btn--logout" onClick={handleLogout}>
              <LogOut className="perfil-btn-icon" />
              Cerrar Sesión
            </button>
            <p className="perfil-logout-hint">Se cerrará tu sesión en todos los dispositivos</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="perfil-footer">
          <div className="perfil-footer-content">
            <Rocket className="perfil-footer-icon" />
            <span>A Marte · Pijamas Espaciales para Pequeños Astronautas</span>
            <Star className="perfil-footer-star" />
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Perfil;