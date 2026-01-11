"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import "./Checkout.css";

// Simulación de datos (en producción vendrían de API)
const MOCK_CART_ITEMS = [
  {
    id: "1",
    name: "Camiseta A Marte",
    price: 29.99,
    quantity: 2,
    size: "M",
    color: "Blanco",
    image: "/placeholder-shirt.jpg",
  },
  {
    id: "2",
    name: "Gorra Espacial",
    price: 19.99,
    quantity: 1,
    size: "Única",
    color: "Negro",
    image: "/placeholder-hat.jpg",
  },
];

const MOCK_ADDRESSES = [
  {
    id: "1",
    street: "Av. del Cosmos 123",
    city: "Madrid",
    postalCode: "28001",
    country: "España",
    isDefault: true,
  },
  {
    id: "2",
    street: "Calle Luna 456",
    city: "Barcelona",
    postalCode: "08001",
    country: "España",
    isDefault: false,
  },
];

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
  image: string;
};

type Address = {
  id: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

export default function Checkout() {
  const [currentStep, setCurrentStep] = useState(1);
  const [cartItems, setCartItems] = useState<CartItem[]>(MOCK_CART_ITEMS);
  const [addresses, setAddresses] = useState<Address[]>(MOCK_ADDRESSES);
  const [selectedAddress, setSelectedAddress] = useState<string>("1");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    street: "",
    city: "",
    postalCode: "",
    country: "",
  });

  // Calcular totales
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shipping = subtotal > 50 ? 0 : 4.99;
  const tax = subtotal * 0.21;
  const total = subtotal + shipping + tax;

  // Simulación de cargar datos del usuario
  const loadAnonymousCart = useCallback(async () => {
    try {
      setIsLoading(true);
      // En producción, aquí harías fetch a tu API
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCartItems(MOCK_CART_ITEMS);
    } catch {
      setError("Error al cargar el carrito");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAuthenticatedData = useCallback(async () => {
    try {
      // En producción, aquí cargarías datos del usuario autenticado
      await new Promise((resolve) => setTimeout(resolve, 300));
      setAddresses(MOCK_ADDRESSES);
      setSelectedAddress(MOCK_ADDRESSES.find((addr) => addr.isDefault)?.id || "");
    } catch {
      setError("Error al cargar datos del usuario");
    }
  }, []);

  useEffect(() => {
    const initCheckout = async () => {
      await loadAnonymousCart();
      await loadAuthenticatedData();
    };
    initCheckout();
  }, [loadAnonymousCart, loadAuthenticatedData]);

  const createMercadoPagoPreference = useCallback(async () => {
    if (!selectedAddress) {
      setError("Por favor selecciona una dirección de envío");
      return null;
    }

    try {
      setIsProcessingPayment(true);
      setError(null);

      // Datos para crear la preferencia de MercadoPago
      const preferenceData = {
        items: cartItems.map((item) => ({
          title: item.name,
          unit_price: item.price,
          quantity: item.quantity,
          currency_id: "EUR",
        })),
        payer: {
          name: "Cliente Ejemplo",
          email: "cliente@example.com",
        },
        back_urls: {
          success: `${window.location.origin}/checkout/success`,
          failure: `${window.location.origin}/checkout/failure`,
          pending: `${window.location.origin}/checkout/pending`,
        },
        auto_return: "approved",
        statement_descriptor: "A Marte",
        external_reference: `order_${Date.now()}`,
      };

      // En producción: llamar a tu API para crear la preferencia
      console.log("Creando preferencia de MercadoPago:", preferenceData);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simular respuesta exitosa
      return {
        id: "mock_preference_id_" + Date.now(),
        init_point: "https://www.mercadopago.com/checkout/mock",
      };
    } catch {
      setError("Error al procesar el pago");
      return null;
    } finally {
      setIsProcessingPayment(false);
    }
  }, [cartItems, selectedAddress]);

  // Manejar el pago con MercadoPago
  const handleMercadoPagoPayment = useCallback(async () => {
    const preference = await createMercadoPagoPreference();
    if (preference) {
      // En producción, redirigir al init_point de MercadoPago
      console.log("Redirigiendo a MercadoPago:", preference.init_point);
      
      // Simulación de éxito después de 2 segundos
      setIsProcessingPayment(true);
      setTimeout(() => {
        setIsProcessingPayment(false);
        setOrderPlaced(true);
        setCurrentStep(3);
      }, 2000);
    }
  }, [createMercadoPagoPreference]);

  // Manejar la simulación de pago exitoso
  const handleSimulateSuccess = async () => {
    setIsProcessingPayment(true);
    setError(null);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setOrderPlaced(true);
    setCurrentStep(3);
    setIsProcessingPayment(false);
  };

  // Manejar la simulación de error de pago
  const handleSimulateError = async () => {
    setIsProcessingPayment(true);
    setError(null);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setError("Pago rechazado: Simulación de error de tarjeta");
    setIsProcessingPayment(false);
  };

  // Manejar cambio de cantidad
  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      setCartItems(cartItems.filter((item) => item.id !== itemId));
      return;
    }
    setCartItems(
      cartItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Manejar eliminación de item
  const handleRemoveItem = (itemId: string) => {
    setCartItems(cartItems.filter((item) => item.id !== itemId));
  };

  // Manejar agregar dirección
  const handleAddAddress = () => {
    if (!newAddress.street || !newAddress.city || !newAddress.postalCode || !newAddress.country) {
      setError("Por favor completa todos los campos de la dirección");
      return;
    }

    const newAddressObj: Address = {
      id: Date.now().toString(),
      ...newAddress,
      isDefault: false,
    };

    setAddresses([...addresses, newAddressObj]);
    setSelectedAddress(newAddressObj.id);
    setNewAddress({ street: "", city: "", postalCode: "", country: "" });
    setShowAddressForm(false);
    setError(null);
  };

  // Manejar eliminación de dirección
  const handleDeleteAddress = (addressId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (addresses.length <= 1) {
      setError("Debes tener al menos una dirección registrada");
      return;
    }
    setAddresses(addresses.filter((addr) => addr.id !== addressId));
    if (selectedAddress === addressId) {
      setSelectedAddress(addresses[0]?.id || "");
    }
  };

  // Navegar entre pasos
  const goToNextStep = () => {
    if (currentStep === 1 && cartItems.length === 0) {
      setError("Tu carrito está vacío");
      return;
    }
    if (currentStep === 2 && !selectedAddress) {
      setError("Por favor selecciona una dirección de envío");
      return;
    }
    setCurrentStep(currentStep + 1);
    setError(null);
  };

  const goToPreviousStep = () => {
    setCurrentStep(currentStep - 1);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="checkout-page">
        <div className="checkout-loading-state">
          <div className="checkout-spinner"></div>
          <p>Cargando tu carrito...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-decorative-elements">
        <div className="checkout-decorative-icon star">
          <svg className="checkout-icon-sm" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
        <div className="checkout-decorative-icon moon">
          <svg className="checkout-icon-md" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
          </svg>
        </div>
        <div className="checkout-decorative-icon rocket">
          <svg className="checkout-icon-lg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.5l-4 4v2l-6 6v4h4v5l5 1 5-1v-5h4v-4l-6-6v-2l-4-4zm-2 4.83l6.27 6.27-2.12 2.12-3.54-3.54-3.54 3.54-2.12-2.12L10 7.33z" />
          </svg>
        </div>
      </div>

      {/* Progress Steps */}
      <section className="checkout-progress-section">
        <div className="checkout-progress-container">
          <div className="checkout-progress-steps">
            <div className="checkout-progress-line">
              <div
                className="checkout-progress-line-fill"
                style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
              ></div>
            </div>

            {[
              { number: 1, label: "Carrito", icon: "🛒" },
              { number: 2, label: "Envío", icon: "📍" },
              { number: 3, label: "Pago", icon: "💳" },
            ].map((step) => (
              <div
                key={step.number}
                className={`checkout-step ${step.number < currentStep ? "active" : ""} ${step.number === currentStep ? "current" : ""}`}
              >
                <div className="checkout-step-circle">
                  {step.icon}
                </div>
                <span className="checkout-step-label">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="checkout-main">
        {error && (
          <div className="checkout-error-message">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        )}

        <div className="checkout-main-grid">
          {/* Left Column - Steps Content */}
          <div className="checkout-steps-content">
            {/* Step 1: Cart */}
            {currentStep === 1 && (
              <div className="checkout-animate-in">
                <div className="checkout-section-header">
                  <div className="checkout-section-icon cart">
                    <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="checkout-section-title">Tu Carrito</h2>
                    <p className="checkout-section-subtitle">
                      {cartItems.length} {cartItems.length === 1 ? "producto" : "productos"} en tu carrito
                    </p>
                  </div>
                </div>

                {cartItems.length === 0 ? (
                  <div className="checkout-empty-cart">
                    <div className="checkout-empty-cart-icon">
                      <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.73 22.73L2.77 2.77 2 2l-.73-.73L0 2.54l4.39 4.39 2.21 4.66-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h7.46l1.38 1.38c-.5.36-.83.95-.83 1.62 0 1.1.89 2 1.99 2 .67 0 1.26-.33 1.62-.84L21.46 24l1.27-1.27zM7.42 15c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h2.36l2 2H7.42zm8.13-2c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H6.54l9.01 9zM7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </div>
                    <h3>Tu carrito está vacío</h3>
                    <p>Agrega productos para continuar con tu compra</p>
                    <Link href="/products" className="checkout-btn checkout-btn-primary">
                      Ir a Productos
                    </Link>
                  </div>
                ) : (
                  <div className="checkout-cart-items">
                    {cartItems.map((item) => (
                      <div key={item.id} className="checkout-cart-item">
                        <div className="checkout-cart-item-inner">
                          <div className="checkout-cart-item-image">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes="(max-width: 640px) 100vw, 200px"
                              style={{ objectFit: "cover" }}
                            />
                            <span className="checkout-cart-item-size-badge">
                              {item.size}
                            </span>
                          </div>
                          <div className="checkout-cart-item-content">
                            <h3 className="checkout-cart-item-name">{item.name}</h3>
                            <div className="checkout-cart-item-badges">
                              <span className="checkout-badge checkout-badge-outline checkout-badge-purple">
                                Color: {item.color}
                              </span>
                              <span className="checkout-badge checkout-badge-outline checkout-badge-mint">
                                Talla: {item.size}
                              </span>
                            </div>
                            <div className="checkout-cart-item-price">
                              ${item.price.toFixed(2)}
                            </div>
                            <div className="checkout-cart-item-actions">
                              <div className="checkout-quantity-controls">
                                <button
                                  className="checkout-quantity-btn"
                                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 13H5v-2h14v2z" />
                                  </svg>
                                </button>
                                <span className="checkout-quantity-value">{item.quantity}</span>
                                <button
                                  className="checkout-quantity-btn"
                                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                >
                                  <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                                  </svg>
                                </button>
                              </div>
                              <div className="checkout-cart-item-subtotal">
                                <span className="checkout-subtotal-text">
                                  Subtotal: <span>${(item.price * item.quantity).toFixed(2)}</span>
                                </span>
                                <button
                                  className="checkout-delete-btn"
                                  onClick={() => handleRemoveItem(item.id)}
                                >
                                  <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Shipping Address */}
            {currentStep === 2 && (
              <div className="checkout-animate-in">
                <div className="checkout-section-header">
                  <div className="checkout-section-icon address">
                    <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="checkout-section-title">Dirección de Envío</h2>
                    <p className="checkout-section-subtitle">
                      Selecciona o agrega una dirección para el envío
                    </p>
                  </div>
                </div>

                <div className="checkout-card">
                  <div className="checkout-card-header navy">
                    <h3 className="checkout-card-header-title">
                      <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                      </svg>
                      Tus Direcciones
                    </h3>
                  </div>
                  <div className="checkout-card-content">
                    <div className="checkout-address-list">
                      {addresses.map((address) => (
                        <div
                          key={address.id}
                          className={`checkout-address-card ${selectedAddress === address.id ? "selected" : ""}`}
                          onClick={() => setSelectedAddress(address.id)}
                        >
                          <div className="checkout-address-card-inner">
                            <div className="checkout-address-radio">
                              {selectedAddress === address.id && (
                                <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                              )}
                            </div>
                            <div className="checkout-address-details">
                              <p>{address.street}</p>
                              <p>
                                {address.city}, {address.postalCode}
                              </p>
                              <p>{address.country}</p>
                            </div>
                            <button
                              className="checkout-address-delete-btn"
                              onClick={(e) => handleDeleteAddress(address.id, e)}
                            >
                              <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {showAddressForm ? (
                      <div className="checkout-add-address-form">
                        <h4 className="checkout-add-address-title">
                          <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                          </svg>
                          Nueva Dirección
                        </h4>
                        <div className="checkout-form-grid">
                          <div className="checkout-form-group">
                            <label htmlFor="street">Calle y Número</label>
                            <input
                              type="text"
                              id="street"
                              className="checkout-form-input"
                              value={newAddress.street}
                              onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                              placeholder="Av. del Cosmos 123"
                            />
                          </div>
                          <div className="checkout-form-grid-2">
                            <div className="checkout-form-group">
                              <label htmlFor="city">Ciudad</label>
                              <input
                                type="text"
                                id="city"
                                className="checkout-form-input"
                                value={newAddress.city}
                                onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                                placeholder="Madrid"
                              />
                            </div>
                            <div className="checkout-form-group">
                              <label htmlFor="postalCode">Código Postal</label>
                              <input
                                type="text"
                                id="postalCode"
                                className="checkout-form-input"
                                value={newAddress.postalCode}
                                onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                                placeholder="28001"
                              />
                            </div>
                          </div>
                          <div className="checkout-form-group">
                            <label htmlFor="country">País</label>
                            <input
                              type="text"
                              id="country"
                              className="checkout-form-input"
                              value={newAddress.country}
                              onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                              placeholder="España"
                            />
                          </div>
                          <div className="checkout-form-actions">
                            <button
                              className="checkout-btn checkout-btn-primary"
                              onClick={handleAddAddress}
                            >
                              Guardar Dirección
                            </button>
                            <button
                              className="checkout-btn checkout-btn-outline"
                              onClick={() => setShowAddressForm(false)}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="checkout-add-address-btn"
                        onClick={() => setShowAddressForm(true)}
                      >
                        <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                        Agregar Nueva Dirección
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {currentStep === 3 && (
              <div className="checkout-animate-in">
                <div className="checkout-section-header">
                  <div className="checkout-section-icon payment">
                    <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="checkout-section-title">Método de Pago</h2>
                    <p className="checkout-section-subtitle">
                      Completa tu compra con un método de pago seguro
                    </p>
                  </div>
                </div>

                {orderPlaced ? (
                  <div className="checkout-order-success">
                    <div className="checkout-success-card">
                      <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                      <p>¡Pedido Confirmado!</p>
                      <p>Tu pedido ha sido procesado exitosamente</p>
                    </div>
                    <div className="checkout-payment-container">
                      <Link href="/orders" className="checkout-btn checkout-btn-primary checkout-btn-lg">
                        Ver Mis Pedidos
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="checkout-card">
                    <div className="checkout-card-content">
                      <div className="checkout-shipping-summary">
                        <div className="checkout-shipping-summary-header">
                          <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                          </svg>
                          <span>Envío a:</span>
                        </div>
                        <p>
                          {addresses.find((a) => a.id === selectedAddress)?.street},{" "}
                          {addresses.find((a) => a.id === selectedAddress)?.city}
                        </p>
                      </div>

                      <div className="checkout-order-items-preview">
                        <h4>Resumen del Pedido</h4>
                        {cartItems.map((item) => (
                          <div key={item.id} className="checkout-order-item-preview">
                            <div className="checkout-order-item-preview-image">
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                sizes="56px"
                                style={{ objectFit: "cover" }}
                              />
                            </div>
                            <div className="checkout-order-item-preview-details">
                              <p className="checkout-order-item-preview-name">{item.name}</p>
                              <p className="checkout-order-item-preview-meta">
                                {item.quantity} x ${item.price.toFixed(2)}
                              </p>
                            </div>
                            <div className="checkout-order-item-preview-price">
                              ${(item.price * item.quantity).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="checkout-payment-container">
                        {isProcessingPayment ? (
                          <div className="checkout-loading-state">
                            <div className="checkout-spinner purple"></div>
                            <p>Procesando pago...</p>
                          </div>
                        ) : (
                          <>
                            {/* Botón real de MercadoPago */}
                            <button
                              onClick={handleMercadoPagoPayment}
                              className="checkout-btn checkout-btn-primary checkout-btn-payment"
                              disabled={isProcessingPayment}
                            >
                              <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                              </svg>
                              Pagar con MercadoPago
                            </button>

                            {/* Solo para desarrollo: Simulaciones */}
                            <div className="checkout-simulation-section">
                              <div className="checkout-dev-info">
                                <div className="checkout-dev-header">
                                  <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                                  </svg>
                                  <h4>Simulaciones de Desarrollo</h4>
                                </div>
                                <p className="checkout-dev-description">
                                  <strong>Para probar sin procesar pagos reales:</strong> Usa estos botones para simular diferentes escenarios de pago.
                                </p>
                                <div className="checkout-simulation-buttons">
                                  <button
                                    onClick={handleSimulateSuccess}
                                    className="checkout-btn checkout-btn-success"
                                    disabled={isProcessingPayment}
                                  >
                                    Simular Pago Exitoso
                                  </button>
                                  <button
                                    onClick={handleSimulateError}
                                    className="checkout-btn checkout-btn-danger"
                                    disabled={isProcessingPayment}
                                  >
                                    Simular Error de Pago
                                  </button>
                                </div>
                                <div className="checkout-dev-note">
                                  En producción, el botón de arriba redirigirá a MercadoPago para procesar el pago real.
                                </div>
                              </div>
                              <div className="checkout-production-info">
                                <h5>Para producción real con MercadoPago:</h5>
                                <ol>
                                  <li>Obtén credenciales de MercadoPago (Public Key y Access Token)</li>
                                  <li>Crea un endpoint en tu backend para generar preferencias</li>
                                  <li>Reemplaza la función <code>createMercadoPagoPreference</code> con una llamada real a tu API</li>
                                  <li>Configura las URLs de retorno en el dashboard de MercadoPago</li>
                                </ol>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="checkout-sidebar">
            <div className="checkout-sidebar-sticky">
              <div className="checkout-card">
                <div className="checkout-card-header navy">
                  <h3 className="checkout-card-header-title">
                    <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
                    </svg>
                    Resumen del Pedido
                  </h3>
                </div>
                <div className="checkout-card-content">
                  <div className="checkout-summary-items">
                    {cartItems.map((item) => (
                      <div key={item.id} className="checkout-summary-item">
                        <span className="checkout-summary-item-name">
                          {item.name} x{item.quantity}
                        </span>
                        <span className="checkout-summary-item-price">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="checkout-summary-divider">
                    <div className="checkout-summary-row">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="checkout-summary-row">
                      <span>Envío</span>
                      <span className={shipping === 0 ? "free" : ""}>
                        {shipping === 0 ? "Gratis" : `$${shipping.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="checkout-summary-row">
                      <span>IVA (21%)</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="checkout-summary-total">
                    <span className="checkout-summary-total-label">Total</span>
                    <span className="checkout-summary-total-value">${total.toFixed(2)}</span>
                  </div>
                  <div className="checkout-summary-iva">
                    IVA incluido: ${tax.toFixed(2)}
                  </div>

                  <div className="checkout-trust-badges">
                    <div className="checkout-trust-badges-grid">
                      <div className="checkout-trust-badge">
                        <div className="checkout-trust-badge-icon mint">
                          <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                          </svg>
                        </div>
                        <span>Pago Seguro</span>
                      </div>
                      <div className="checkout-trust-badge">
                        <div className="checkout-trust-badge-icon purple">
                          <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z" />
                          </svg>
                        </div>
                        <span>Envío Rápido</span>
                      </div>
                      <div className="checkout-trust-badge">
                        <div className="checkout-trust-badge-icon orange">
                          <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                        </div>
                        <span>Garantía</span>
                      </div>
                      <div className="checkout-trust-badge">
                        <div className="checkout-trust-badge-icon coral">
                          <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                          </svg>
                        </div>
                        <span>Soporte 24/7</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="checkout-promo-card">
                <div className="checkout-promo-card-content">
                  <div className="checkout-promo-sparkles">
                    <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z" />
                    </svg>
                  </div>
                  <h4>
                    <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    Envío Gratis
                  </h4>
                  <p>En pedidos superiores a $50</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        {!orderPlaced && cartItems.length > 0 && (
          <div className="checkout-navigation-buttons">
            {currentStep > 1 && (
              <button
                onClick={goToPreviousStep}
                className="checkout-btn checkout-btn-outline checkout-btn-lg"
              >
                <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
                Volver
              </button>
            )}
            {currentStep < 3 && (
              <button
                onClick={goToNextStep}
                className="checkout-btn checkout-btn-primary checkout-btn-lg"
                style={{ marginLeft: "auto" }}
              >
                Continuar
                <svg className="checkout-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}