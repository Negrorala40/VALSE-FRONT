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
export const FIRST_PURCHASE_ELIGIBILITY = `${API_BASE_URL}/api/admin/discount/first-purchase/eligibility`;
export const CART = `${API_BASE_URL}/api/cart`;
export const ADD_TO_CART = `${API_BASE_URL}/api/cart/add`;
export const MIGRATE_CART = `${API_BASE_URL}/api/cart/migrate`;
export const CLEAR_CART = `${API_BASE_URL}/api/cart/clear`;
export const GET_CART_COUNT = `${API_BASE_URL}/api/cart/count`;
export const ORDERS_EXPIRATION_INFO = `${API_BASE_URL}/api/orders`;
export const ORDER_CHECK_EXPIRATION = `${API_BASE_URL}/api/orders/{orderId}/check-expiration`;

// Órdenes
export const ORDERS = `${API_BASE_URL}/api/orders`;
export const CHECKOUT_ANONYMOUS = `${API_BASE_URL}/api/orders/checkout/anonymous`;
export const CHECKOUT_AUTHENTICATED = `${API_BASE_URL}/api/orders/checkout/authenticated`;
export const MIGRATE_ORDERS = `${API_BASE_URL}/api/orders/migrate`;

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


// ======================= META Integration (V1 - DEPRECATED) =======================
// 🔴 COMENTADOS: Estos endpoints V1 han sido reemplazados por V2
// Si necesitas usarlos en el futuro, descomenta las líneas correspondientes
/*
export const META_PRODUCTS = `${API_BASE_URL}/api/meta/products`;
export const META_FILE_DOWNLOAD = (filename: string) => `${API_BASE_URL}/api/meta/feed/files/${filename}`;
export const META_PRODUCT_UPDATE = (variantId: number) => `${API_BASE_URL}/api/meta/products/${variantId}`;
export const META_PRODUCT_TOGGLE = (variantId: number) => `${API_BASE_URL}/api/meta/products/${variantId}/enabled`;
export const META_BATCH_ENABLE = `${API_BASE_URL}/api/meta/products/batch/enable`;
export const META_BATCH_DISABLE = `${API_BASE_URL}/api/meta/products/batch/disable`;
export const META_REGENERATE_SKU = (variantId: number) => `${API_BASE_URL}/api/meta/products/${variantId}/regenerate-sku`;
*/

// ======================= META Integration (V2 - ACTIVOS) =======================
// 🟢 ENDPOINTS ACTIVOS: Usar estos para todas las operaciones META
export const META_PRODUCTS_V2 = `${API_BASE_URL}/api/meta/v2/products`;
export const META_PRODUCT_V2 = (productId: number) => `${API_BASE_URL}/api/meta/v2/products/${productId}`;
export const META_PRODUCT_TOGGLE_V2 = (productId: number) => `${API_BASE_URL}/api/meta/v2/products/${productId}/enabled`;
export const META_STATS = `${API_BASE_URL}/api/meta/stats`;
export const META_CSV = `${API_BASE_URL}/api/meta/feed/csv`;
export const META_MIGRATE = `${API_BASE_URL}/api/meta/migrate`;
export const META_GENERATE = `${API_BASE_URL}/api/meta/feed/generate`;
export const META_FILES = `${API_BASE_URL}/api/meta/feed/files`;

// Órdenes del usuario actual
export const ORDERS_MY_ORDERS = `${API_BASE_URL}/api/orders/my-orders`;

// Detalle de orden específica
export const ORDER_DETAIL = (id: number) => `${API_BASE_URL}/api/orders/${id}`;

//inf de descuento a checkout 
export const PUBLIC_DISCOUNT_CONFIG = `${API_BASE_URL}/api/admin/discount/first-purchasepublic`;


// Cambiar estado de orden (administrador)
export const ADMIN_UPDATE_ORDER_STATUS = `${API_BASE_URL}/api/payments/admin/change-status`;

//payment
export const ORDER_MY_ORDERS = `${API_BASE_URL}/api/orders/my-orders`;
export const ORDER_STATUS = (orderId: string) => 
  `${API_BASE_URL}/api/orders/${orderId}/status`;



