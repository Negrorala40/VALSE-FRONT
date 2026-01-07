// src/utils/Api.ts

// Configuración base
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// PRODUCTOS
export const MENU_PRODUCTS = `${API_BASE_URL}/api/products`;
export const PRODUCT_DETAIL = (id: string | number) => `${API_BASE_URL}/api/products/${id}`;

// Login
export const LOGIN_URL = `${API_BASE_URL}/api/auth/login`;

// Perfil
export const PERFIL_ME = `${API_BASE_URL}/api/users/me`;

// Direcciones
export const ADDRESS = `${API_BASE_URL}/api/addresses`;

// Carrito
export const CART = `${API_BASE_URL}/api/cart`;
export const ADD_TO_CART = `${API_BASE_URL}/api/cart/add`;

// Órdenes
export const ORDERS = `${API_BASE_URL}/api/orders`;

// Bold Payments
export const BOLD_SIGNATURE = `${API_BASE_URL}/api/bold/signature`;

// Mercado Pago
export const MERCADOPAGO_CREATE_PREFERENCE = `${API_BASE_URL}/api/payments/create-preference`;
export const MERCADOPAGO_STATUS = `${API_BASE_URL}/api/payments/status`;
export const MERCADOPAGO_SIMULATE = `${API_BASE_URL}/api/payments/simulate-payment`;