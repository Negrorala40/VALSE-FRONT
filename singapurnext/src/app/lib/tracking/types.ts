export interface TrackingItem {
    id: string;
    quantity: number;
    item_price: number;
  }
  
  export interface ViewContentPayload {
    variantId: number;
    productName: string;
    price: number;
    currency?: string;
    color?: string;
    size?: string;
  }
  
  export interface AddToCartPayload {
    variantId: number;
    productName: string;
    price: number;
    quantity: number;
    currency?: string;
    color?: string;
    size?: string;
  }
  
  export interface InitiateCheckoutPayload {
    items: TrackingItem[];
    value: number;
    numItems: number;
    currency?: string;
  }
  
  export interface PurchasePayload {
    orderId: string | number;
    items: TrackingItem[];
    value: number;
    numItems: number;
    currency?: string;
  }