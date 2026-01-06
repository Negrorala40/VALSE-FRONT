'use client';

import { PERFIL_ME, ADDRESS } from '../utils/Api';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './Perfil.css';
import { signOut } from "next-auth/react";

interface Address {
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'warning' | 'danger' | 'info';
  confirmText?: string;
  cancelText?: string;
}

const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger': return '🗑️';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '⚠️';
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'danger': return 'danger';
      case 'warning': return 'confirm';
      case 'info': return 'confirm';
      default: return 'confirm';
    }
  };

  return (
    <div className="custom-modal-overlay" onClick={onClose}>
      <div className="custom-modal" onClick={e => e.stopPropagation()}>
        <div className="custom-modal-header">
          <div className={`custom-modal-icon ${type}`}>
            {getIcon()}
          </div>
          <h3 className="custom-modal-title">{title}</h3>
        </div>
        <div className="custom-modal-body">
          <p>{message}</p>
        </div>
        <div className="custom-modal-footer">
          <button
            className={`custom-modal-button ${getButtonClass()}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          <button
            className="custom-modal-button cancel"
            onClick={onClose}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

const Perfil = () => {
  const [formData, setFormData] = useState<User>({
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
  
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'warning' | 'danger' | 'info';
    onConfirm: () => void;
  } | null>(null);

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

      const userData: User = await response.json();
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
    type: 'warning' | 'danger' | 'info',
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

  const closeModal = () => {
    setModal(null);
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
      showSuccessCheckmark('📍 Dirección agregada correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar la dirección');
      console.error(err);
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    if (!token) return;
    
    showModal(
      '🗑️ Eliminar Dirección',
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
          showSuccessCheckmark('🗑️ Dirección eliminada correctamente');
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
      '💾 Guardar Cambios',
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
          showSuccessCheckmark('💾 Dirección actualizada correctamente');
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
      '👤 Actualizar Perfil',
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
          
          showSuccessCheckmark('👤 Información personal actualizada correctamente');
          
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
      '🚪 Cerrar Sesión',
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
      <div className="perfil-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando tu perfil...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="perfil-container">
        <div className="perfil-title">
          <h1>🔒 Acceso Restringido</h1>
        </div>
        <div className="info-section">
          <p>Por favor inicia sesión para ver tu perfil.</p>
          <button 
            onClick={() => window.location.href = '/login'} 
            className="login-button"
            style={{ marginTop: '20px', maxWidth: '250px' }}
          >
            Ir a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="perfil-container">
      {/* Modal personalizado */}
      {modal && (
        <CustomModal
          isOpen={modal.isOpen}
          onClose={closeModal}
          onConfirm={() => {
            modal.onConfirm();
            closeModal();
          }}
          title={modal.title}
          message={modal.message}
          type={modal.type}
        />
      )}

      {showCheckmark && (
        <div className="checkmark-popup">
          ✅ {success}
        </div>
      )}

      {/* Header mejorado */}
      <div className="perfil-title">
        <h1>
          <span className="rocket-icon">
            {/* Reemplaza esto con tu SVG del cohete */}
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 2L22.5 10H17.5L20 2Z" fill="#3db28a"/>
              <path d="M10 15L15 20L10 25V15Z" fill="#806ff7"/>
              <path d="M30 15V25L25 20L30 15Z" fill="#e9566d"/>
              <path d="M20 30L17.5 22H22.5L20 30Z" fill="#ffd449"/>
              <circle cx="20" cy="20" r="8" fill="#f47b47"/>
              <circle cx="20" cy="20" r="4" fill="#ffffff"/>
            </svg>
          </span>
          Bienvenido a tu Perfil en <span className="highlight">A Marte</span> 🪐
        </h1>
        <p className="perfil-subtitle">
          Gestiona tu información personal y direcciones de envío para recibir tus pijamas espaciales
        </p>
      </div>

      {error && <div className="error-message">❌ {error}</div>}
      {success && !showCheckmark && <div className="success-message">✅ {success}</div>}

      {/* Información del Usuario */}
      <section className="info-section">
        <h2>Información Personal</h2>
        <form onSubmit={handleUpdateUser}>
          <div className="form-group">
            <label>Nombre:</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              required
              minLength={2}
              maxLength={50}
              placeholder="Tu nombre"
            />
          </div>
          <div className="form-group">
            <label>Apellido:</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              required
              minLength={2}
              maxLength={50}
              placeholder="Tu apellido"
            />
          </div>
          <div className="form-group">
            <label>Email:</label>
            <input 
              type="email" 
              value={formData.email} 
              disabled 
              readOnly
              className="email-disabled"
              title="El email no se puede modificar (es tu nombre de usuario)"
            />
            <small className="email-note">* El email es tu nombre de usuario y no se puede modificar</small>
          </div>
          <div className="form-group">
            <label>Teléfono:</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              required
              pattern="\d{10,15}"
              title="Por favor ingresa un número de teléfono válido (10-15 dígitos)"
              placeholder="Ej: 3001234567"
            />
          </div>
          <button type="submit" className="update-button">
            💾 Actualizar Información Personal
          </button>
        </form>
      </section>

      {/* Direcciones */}
      <section className="address-section">
        <h2>Direcciones de Envío</h2>
        {addresses.length > 0 ? (
          <ul className="address-list">
            {addresses.map((addr, index) => (
              <li key={addr.id} className="address-item">
                {editIndex === index && editedAddress ? (
                  <div className="edit-fields">
                    <input
                      value={editedAddress.address}
                      onChange={(e) =>
                        setEditedAddress({ ...editedAddress, address: e.target.value })
                      }
                      placeholder="Dirección completa"
                      required
                    />
                    <input
                      value={editedAddress.city}
                      onChange={(e) =>
                        setEditedAddress({ ...editedAddress, city: e.target.value })
                      }
                      placeholder="Ciudad"
                      required
                    />
                    <input
                      value={editedAddress.state}
                      onChange={(e) =>
                        setEditedAddress({ ...editedAddress, state: e.target.value })
                      }
                      placeholder="Estado/Departamento"
                      required
                    />
                    <input
                      value={editedAddress.country}
                      onChange={(e) =>
                        setEditedAddress({ ...editedAddress, country: e.target.value })
                      }
                      placeholder="País"
                      required
                    />
                    <div className="edit-actions">
                      <button onClick={handleSaveAddress} className="save-button">
                        💾 Guardar
                      </button>
                      <button
                        onClick={() => setEditIndex(null)}
                        className="cancel-button"
                      >
                        ❌ Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="address-text">
                      <strong>📌 Dirección:</strong> <span>{addr.address}</span>
                      <strong>🏙️ Ciudad:</strong> <span>{addr.city}</span>
                      <strong>📍 Estado:</strong> <span>{addr.state}</span>
                      <strong>🇨🇴 País:</strong> <span>{addr.country}</span>
                    </p>
                    <div className="address-actions">
                      <button
                        onClick={() => handleEditAddress(index)}
                        className="edit-button"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="delete-button"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-addresses">No hay direcciones registradas. Agrega una para recibir tus pedidos.</p>
        )}

        {/* Botón para mostrar/ocultar formulario */}
        <button 
          onClick={() => setShowAddressForm(!showAddressForm)}
          className="toggle-address-form"
        >
          {showAddressForm ? '− Ocultar formulario' : '+ Agregar nueva dirección'}
        </button>

        {/* Formulario desplegable para nueva dirección */}
        <div className={showAddressForm ? 'address-form-expanded' : 'address-form-collapsed'}>
          <div className="new-address-form">
            <h3>Agregar nueva dirección</h3>
            <div className="new-address-form-inputs">
              <input
                type="text"
                placeholder="Dirección completa"
                value={newAddress.address}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, address: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Ciudad"
                value={newAddress.city}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, city: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Estado/Departamento"
                value={newAddress.state}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, state: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="País"
                value={newAddress.country}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, country: e.target.value })
                }
                required
              />
            </div>
            <button 
              onClick={handleAddAddress} 
              className="add-button"
              disabled={!newAddress.address || !newAddress.city || !newAddress.state || !newAddress.country}
            >
              📍 Agregar Dirección
            </button>
          </div>
        </div>
      </section>

      {/* Botón de cerrar sesión */}
      <div className="logout-section">
        <button onClick={handleLogout} className="logout-button">
          🚪 Cerrar Sesión
        </button>
        <p className="logout-note">* Se cerrará tu sesión en todos los dispositivos</p>
      </div>
    </div>
  );
};

export default Perfil;