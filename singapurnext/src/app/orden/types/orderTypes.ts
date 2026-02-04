export type OrderStatus = 
  | 'PENDIENTE'
  | 'PAGO_APROBADO'
  | 'ENVIADO'
  | 'ENTREGADO'
  | 'CANCELADO';

export interface OrderItem {
  id: number;
  quantity: number;
  originalPrice: number;
  finalPrice: number;
  discountPercentage: number;
  discountAmount: number;
  totalOriginalPrice: number;
  totalFinalPrice: number;
  productName: string;
  productDescription: string;
  color: string;
  size: string;
  unit: string;
  sku: string;
  imageUrl: string;
}

export interface AdminOrderListDTO {
  id: number;
  orderDate: string;
  status: OrderStatus;
  totalPrice: number;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  totalItems: number;
  productSummary: string;
  paymentMethod: string;
  mercadoPagoStatus: string;
  createdAt: string;
}

export interface AdminOrderDetailDTO {
  id: number;
  orderDate: string;
  status: OrderStatus;
  totalPrice: number;
  subtotalWithoutDiscount: number;
  totalDiscount: number;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  mercadoPagoPaymentId: string;
  mercadoPagoStatus: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingCountry: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  stockReservedAt: string;
  stockReservationExpired: boolean;
  cancellationReason: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  orders?: T[];
}