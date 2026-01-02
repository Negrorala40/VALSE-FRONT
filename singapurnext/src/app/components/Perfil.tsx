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

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCheckmark, setShowCheckmark] = useState<boolean>(false);
  
  // Estados para manejar la carga y autenticación
  const [isClient, setIsClient] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicializar estados del cliente solo en useEffect
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
      await loadAddresses();
      showSuccessCheckmark('Dirección agregada correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar la dirección');
      console.error(err);
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    if (!token) return;
    
    const confirmDelete = window.confirm('¿Estás seguro de que deseas eliminar esta dirección?');
    if (!confirmDelete) return;

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
  };

  const handleEditAddress = (index: number) => {
    setEditIndex(index);
    setEditedAddress(addresses[index]);
  };

  const handleSaveAddress = async () => {
    if (!editedAddress || !token) return;

    const confirmUpdate = window.confirm('¿Guardar cambios en la dirección?');
    if (!confirmUpdate) return;

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
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    const confirmUpdate = window.confirm('¿Deseas guardar los cambios en tu perfil?');
    if (!confirmUpdate) return;

    setError(null);
    
    try {
      // 🔴 IMPORTANTE: Ahora el backend maneja automáticamente la contraseña
      // Enviamos solo los campos que queremos actualizar
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        // El backend ya NO espera email, id o password
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
      
      // Actualizar el estado con los datos devueltos
      setFormData({
        id: updatedUser.id || formData.id,
        firstName: updatedUser.firstName || formData.firstName,
        lastName: updatedUser.lastName || formData.lastName,
        email: updatedUser.email || formData.email, // El backend mantiene el email
        phone: updatedUser.phone || formData.phone,
      });
      
      showSuccessCheckmark('Información personal actualizada correctamente');
      
      // Recargar datos para asegurarnos de tener la última versión
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
  };

  // Función para cerrar sesión completamente
  const handleLogout = async () => {
    // 1. Limpia tu token y demás datos
    localStorage.clear();

    // 2. Limpia cookies propias
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // 3. Cierra sesión de NextAuth
    await signOut({ callbackUrl: "/" });
  };

  // Mostrar loading mientras se verifica la autenticación
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

  // Si no hay token, mostrar mensaje
  if (!token) {
    return (
      <div className="perfil-container">
        <h1>🔒 Acceso Restringido</h1>
        <p>Por favor inicia sesión para ver tu perfil.</p>
        <button 
          onClick={() => window.location.href = '/login'} 
          className="login-button"
          style={{ marginTop: '20px', padding: '10px 20px' }}
        >
          Ir a Iniciar Sesión
        </button>
      </div>
    );
  }

  return (
    <div className="perfil-container">
      {showCheckmark && <div className="checkmark-popup">✅</div>}

      <h1>
        🚀 Bienvenido a tu Perfil en <span className="highlight">A Marte</span> 🪐
      </h1>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Información del Usuario */}
      <section className="info-section">
        <h2>👩‍🚀 Información Personal</h2>
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
            Actualizar Información Personal
          </button>
        </form>
      </section>

      {/* Direcciones */}
      <section className="address-section">
        <h2>📦 Direcciones de Envío</h2>
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
                      <strong>📌 Dirección:</strong> {addr.address}<br />
                      <strong>🏙️ Ciudad:</strong> {addr.city}<br />
                      <strong>📍 Estado:</strong> {addr.state}<br />
                      <strong>🇨🇴 País:</strong> {addr.country}
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
          <p className="no-addresses">📭 No hay direcciones registradas. Agrega una para recibir tus pedidos.</p>
        )}

        <div className="new-address-form">
          <h3>➕ Agregar nueva dirección</h3>
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
          <button 
            onClick={handleAddAddress} 
            className="add-button"
            disabled={!newAddress.address || !newAddress.city || !newAddress.state || !newAddress.country}
          >
            📍 Agregar Dirección
          </button>
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