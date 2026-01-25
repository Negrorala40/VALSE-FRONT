// src/app/meta/types.ts
export interface MetaProduct {
  variantId: number;
  sku: string;
  productName: string;
  color: string;
  size: string;
  stock: number;
  price: number;
  enabled: boolean;
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
}

export interface MetaStats {
  totalProducts: number;
  metaEnabledProducts: number;
  eligibleForFeed: number;
  outOfStock: number;
  disabledProducts: number;
}

export interface MetaProductUpdateDTO {
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
}