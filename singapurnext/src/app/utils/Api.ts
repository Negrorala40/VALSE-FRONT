// src/utils/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// PRODUCTOS
export const MENU_PRODUCTS = `${API_URL}/api/products`;
export const PRODUCT_DETAIL = (id: string | number) => `${API_URL}/api/products/${id}`;

// Login
export const LOGIN_URL = `${API_URL}/api/auth/login`;

// Perfil
export const PERFIL_INF = (userId: string | number) => `${API_URL}/api/users/${userId}`;
export const ADDRESS = `${API_URL}/api/addresses`;
export const USER_ADDRESSES = (userId: string | number) => `${API_URL}/api/addresses/user/${userId}`;

// Carrito
export const CART = `${API_URL}/api/cart`;
export const ADD_TO_CART = `${API_URL}/api/cart/add`;