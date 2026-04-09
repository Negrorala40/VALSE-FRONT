export interface MetaVariantInfo {
  variantId: number;
  sku: string;
  color: string;
  size: string;
  stock: number;
  price: number;
  enabled: boolean;
  variantEnabledForMeta: boolean;
  discountPercentage?: number;
  hasDiscount?: boolean;
  priceWithDiscount?: number;
  discountAmount?: number;
}

export interface MetaProductResponse {
  productId: number;
  productName: string;
  productDescription: string;
  sku: string;
  enabledForMeta: boolean;
  metaTitle?: string;
  metaDescription?: string;
  googleProductCategory?: string;
  fbProductCategory?: string;
  material?: string;
  pattern?: string;
  style?: string;
  gtin?: string;
  shipping?: string;
  shippingWeight?: number;
  salePrice?: number;
  salePriceStartDate?: string;
  salePriceEndDate?: string;
  videoUrl?: string;
  videoTag?: string;
  customLabels?: string;
  variants: MetaVariantInfo[];
}

export interface MetaStats {
  totalProducts: number;
  totalVariants: number;
  metaEnabledProducts: number;
  eligibleForFeed: number;
  enabledButNotInMeta: number;
  outOfStock: number;
  disabledProducts: number;
}

export interface ApiPaginationResponse {
  content: MetaProductResponse[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface MetaProductUpdateDTO {
  enabledForMeta?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  googleProductCategory?: string;
  fbProductCategory?: string;
  material?: string;
  pattern?: string;
  style?: string;
  gtin?: string;
  shipping?: string;
  shippingWeight?: number | null;
  salePrice?: number | null;
  salePriceStartDate?: string;
  salePriceEndDate?: string;
  videoUrl?: string;
  videoTag?: string;
  customLabels?: string;
}

export interface EditMetaFormData {
  enabledForMeta: boolean;
  metaTitle: string;
  metaDescription: string;
  googleProductCategory: string;
  fbProductCategory: string;
  material: string;
  pattern: string;
  style: string;
  gtin: string;
  shipping: string;
  shippingWeight: string;
  salePrice: string;
  salePriceStartDate: string;
  salePriceEndDate: string;
  videoUrl: string;
  videoTag: string;
  customLabels: string;
}