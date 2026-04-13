import { trackMetaEvent } from "./metaPixel";
import type {
  ViewContentPayload,
  AddToCartPayload,
  InitiateCheckoutPayload,
  PurchasePayload,
} from "./types";

const DEFAULT_CURRENCY = "COP";

export const trackViewContent = ({
  variantId,
  productName,
  price,
  currency = DEFAULT_CURRENCY,
  color,
  size,
}: ViewContentPayload) => {
  trackMetaEvent("ViewContent", {
    content_ids: [String(variantId)],
    content_name: productName,
    content_type: "product",
    value: price,
    currency,
    contents: [
      {
        id: String(variantId),
        quantity: 1,
        item_price: price,
      },
    ],
    content_variant: [color, size].filter(Boolean).join(" - "),
  });
};

export const trackAddToCart = ({
  variantId,
  productName,
  price,
  quantity,
  currency = DEFAULT_CURRENCY,
  color,
  size,
}: AddToCartPayload) => {
  trackMetaEvent("AddToCart", {
    content_ids: [String(variantId)],
    content_name: productName,
    content_type: "product",
    value: price * quantity,
    currency,
    contents: [
      {
        id: String(variantId),
        quantity,
        item_price: price,
      },
    ],
    content_variant: [color, size].filter(Boolean).join(" - "),
  });
};

export const trackInitiateCheckout = ({
  items,
  value,
  numItems,
  currency = DEFAULT_CURRENCY,
}: InitiateCheckoutPayload) => {
  trackMetaEvent("InitiateCheckout", {
    contents: items,
    value,
    num_items: numItems,
    currency,
  });
};

export const trackPurchase = ({
  orderId,
  items,
  value,
  numItems,
  currency = DEFAULT_CURRENCY,
}: PurchasePayload) => {
  trackMetaEvent("Purchase", {
    contents: items,
    value,
    num_items: numItems,
    currency,
    order_id: String(orderId),
  });
};