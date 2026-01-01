// src/utils/api.ts

//Login
export const API_URL = process.env.NEXT_PUBLIC_API_URL!;

// PRODUCTOS
export const MENU_PRODUCTS = `${API_URL}/api/products`;

//perfil
export const PERFIL_INF = `${API_URL}/api/users`;
export const ADDRESS = `${API_URL}/api/addresses`;

//cart
export const CART = `${API_URL}/api/cart`;