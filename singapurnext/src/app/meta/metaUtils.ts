import { MetaProductResponse, MetaVariantInfo } from "./types";

export const variantHasDiscount = (variant: MetaVariantInfo): boolean => {
  return Boolean(
    variant.hasDiscount ||
      ((variant.discountPercentage ?? 0) > 0) ||
      ((variant.priceWithDiscount ?? 0) > 0 &&
        (variant.priceWithDiscount ?? 0) < (variant.price ?? 0))
  );
};

export const countVariantsWithDiscount = (product: MetaProductResponse): number => {
  return product.variants.filter(variantHasDiscount).length;
};

export const getMaxDiscount = (product: MetaProductResponse): number => {
  const discounts = product.variants
    .filter(variantHasDiscount)
    .map((variant) => variant.discountPercentage || 0);

  return discounts.length > 0 ? Math.max(...discounts) : 0;
};

export const getAverageDiscountedPrice = (
  product: MetaProductResponse
): number | null => {
  const variantsWithDiscount = product.variants.filter(
    (variant) => variantHasDiscount(variant) && variant.priceWithDiscount
  );

  if (variantsWithDiscount.length === 0) {
    return null;
  }

  const total = variantsWithDiscount.reduce(
    (sum, variant) => sum + (variant.priceWithDiscount || 0),
    0
  );

  return Math.round(total / variantsWithDiscount.length);
};

export const countVariantsWithStock = (product: MetaProductResponse): number => {
  return product.variants.filter((variant) => variant.stock > 0).length;
};

export const countVariantsEnabledForFeed = (product: MetaProductResponse): number => {
  return product.variants.filter((variant) => variant.variantEnabledForMeta).length;
};

export const formatCop = (value?: number | null): string => {
  return new Intl.NumberFormat("es-CO").format(value || 0);
};

export const productMatchesSearch = (
  product: MetaProductResponse,
  term: string
): boolean => {
  const normalized = term.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return (
    product.productName.toLowerCase().includes(normalized) ||
    product.sku.toLowerCase().includes(normalized) ||
    (product.metaTitle || "").toLowerCase().includes(normalized) ||
    (product.metaDescription || "").toLowerCase().includes(normalized) ||
    product.variants.some(
      (variant) =>
        variant.color.toLowerCase().includes(normalized) ||
        variant.size.toLowerCase().includes(normalized) ||
        variant.sku.toLowerCase().includes(normalized)
    )
  );
};

export const getVisiblePageNumbers = (
  currentPage: number,
  totalPages: number,
  maxVisible = 5
): number[] => {
  if (totalPages <= 0) {
    return [];
  }

  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  if (currentPage < 3) {
    return Array.from({ length: maxVisible }, (_, i) => i);
  }

  if (currentPage > totalPages - 4) {
    return Array.from({ length: maxVisible }, (_, i) => totalPages - maxVisible + i);
  }

  return Array.from({ length: maxVisible }, (_, i) => currentPage - 2 + i);
};