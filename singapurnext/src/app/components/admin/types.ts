export interface ProductImage {
    id?: number;
    fileName: string;
    imageUrl: string;
    thumbnailUrl: string;
    mediumUrl: string;
    largeUrl: string;
  }
  
  export interface Size {
    size: string;
    stock: number;
    price: number;
    discountPercentage?: number;
  }
  
  export interface ProductFormSize extends Size {
    uiId: string;
    originalSize?: string;
  }
  
  export interface ProductFormColorVariant {
    uiId: string;
    color: string;
    originalColor?: string;
    images: ProductImage[];
    sizes: ProductFormSize[];
  }
  
  export interface Variant {
    id?: number;
    color: string;
    size: string;
    stock: number;
    price: number;
    discountPercentage?: number;
    images?: ProductImage[];
    hasOrders?: boolean;
    enabled?: boolean;
  }
  
  export interface Product {
    id?: number;
    name: string;
    description: string;
    gender: string;
    type: string;
    variants: Variant[];
    hasOrders?: boolean;
    enabled?: boolean;
  }
  
  export interface ApiResponse {
    success: boolean;
    message: string;
    canDelete?: boolean;
    data?: unknown;
    enabled?: boolean;
    productId?: number;
    variantId?: number;
  }
  
  export interface ImageData {
    id?: number;
    fileName: string;
    imageUrl: string;
    thumbnailUrl: string;
    mediumUrl: string;
    largeUrl: string;
  }
  
  export interface ValidationError {
    field: string;
    message: string;
  }
  
  export interface ProductFormState {
    name: string;
    description: string;
    gender: string;
    colorVariants: ProductFormColorVariant[];
  }