// src/utils/Api.ts

// Configuración base
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://backendamarte-production.up.railway.app';

// PRODUCTOS
export const MENU_PRODUCTS = `${API_BASE_URL}/api/products`;
export const PRODUCT_DETAIL = (id: string | number) => `${API_BASE_URL}/api/products/${id}`;

// Login
export const LOGIN_URL = `${API_BASE_URL}/api/auth/login`;

// Perfil
export const PERFIL_ME = `${API_BASE_URL}/api/users/me`;

// Direcciones
export const ADDRESS = `${API_BASE_URL}/api/addresses`;

// Carrito (AHORA PÚBLICO - usuarios anónimos)
export const CART = `${API_BASE_URL}/api/cart`;
export const ADD_TO_CART = `${API_BASE_URL}/api/cart/add`;
export const MIGRATE_CART = `${API_BASE_URL}/api/cart/migrate`;
export const CLEAR_CART = `${API_BASE_URL}/api/cart/clear`;
export const GET_CART_COUNT = `${API_BASE_URL}/api/cart/count`;

// Órdenes
export const ORDERS = `${API_BASE_URL}/api/orders`;
export const CHECKOUT_ANONYMOUS = `${API_BASE_URL}/api/orders/checkout/anonymous`;
export const CHECKOUT_AUTHENTICATED = `${API_BASE_URL}/api/orders/checkout/authenticated`;
export const MIGRATE_ORDERS = `${API_BASE_URL}/api/orders/migrate`;

// Bold Payments
// export const BOLD_SIGNATURE = `${API_BASE_URL}/api/bold/signature`;


// Mercado Pago
export const MERCADOPAGO_CREATE_PREFERENCE = `${API_BASE_URL}/api/payments/create-preference`;
export const MERCADOPAGO_STATUS = `${API_BASE_URL}/api/payments/status`;
export const MERCADOPAGO_SIMULATE = `${API_BASE_URL}/api/payments/simulate-payment`;
export const MERCADOPAGO_PUBLIC_KEY = `${API_BASE_URL}/api/payments/public-key`;


// ======================= BLOG ENDPOINTS =======================
export const BLOG_POSTS = `${API_BASE_URL}/api/blog`;
export const BLOG_POST_BY_SLUG = (slug: string) => `${API_BASE_URL}/api/blog/slug/${slug}`; // <-- AÑADIR ESTA LÍNEA
export const BLOG_POST_DETAIL = (id: string | number) => `${API_BASE_URL}/api/blog/${id}`;
export const BLOG_ADMIN_POSTS = `${API_BASE_URL}/api/blog/admin/posts`;
export const BLOG_ADMIN_POSTS_PAGINATED = (page: number = 0, size: number = 100) => 
  `${API_BASE_URL}/api/blog/admin/posts?page=${page}&size=${size}`;
export const BLOG_CREATE = `${API_BASE_URL}/api/blog`;
export const BLOG_UPDATE = (id: number) => `${API_BASE_URL}/api/blog/${id}`;
export const BLOG_DELETE = (id: number) => `${API_BASE_URL}/api/blog/${id}`;

// ======================= CATEGORÍAS BLOG =======================
export const BLOG_CATEGORIES = `${API_BASE_URL}/api/blog/categories`;
export const BLOG_CATEGORIES_WITH_COUNT = `${API_BASE_URL}/api/blog/categories/with-count`;

// ======================= TAGS BLOG =======================
export const BLOG_TAGS = `${API_BASE_URL}/api/blog/tags`;
export const BLOG_TAGS_WITH_COUNT = `${API_BASE_URL}/api/blog/tags/with-count`;

// ======================= BÚSQUEDA BLOG =======================
export const BLOG_SEARCH = (query: string) => `${API_BASE_URL}/api/blog/search?q=${encodeURIComponent(query)}`;
export const BLOG_FILTER = `${API_BASE_URL}/api/blog/filter`;