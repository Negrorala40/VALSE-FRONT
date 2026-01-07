// src/utils/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// PRODUCTOS
export const MENU_PRODUCTS = `${API_URL}/api/products`;
export const PRODUCT_DETAIL = (id: string | number) => `${API_URL}/api/products/${id}`;

// Login
export const LOGIN_URL = `${API_URL}/api/auth/login`;

// Perfil - Usa /me que es el endpoint común para obtener datos del usuario autenticado
export const PERFIL_ME = `${API_URL}/api/users/me`;

// Direcciones
export const ADDRESS = `${API_URL}/api/addresses`;

// Carrito
export const CART = `${API_URL}/api/cart`;
export const ADD_TO_CART = `${API_URL}/api/cart/add`;

// Órdenes
export const ORDERS = `${API_URL}/api/orders`;

// Bold Payments
export const BOLD_SIGNATURE = `${API_URL}/api/bold/signature`;

// **NUEVO: Mercado Pago**
export const MERCADOPAGO_CREATE_PREFERENCE = `${API_URL}/api/payments/create-preference`;
export const MERCADOPAGO_VERIFY_PAYMENT = (paymentId: string) => 
  `${API_URL}/api/payments/verify/${paymentId}`;