import { Metadata } from 'next';
import FirstPurchaseDiscountControl from './FirstPurchaseDiscountControl';

export const metadata: Metadata = {
  title: 'Control Descuento Primera Compra | Admin Amarte',
  description: 'Configuración del descuento de primera compra'
};

export default function DiscountAdminPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <FirstPurchaseDiscountControl />
      </div>
    </div>
  );
}