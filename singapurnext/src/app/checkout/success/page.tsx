// app/checkout/success/page.tsx
import { Suspense } from 'react';
import PaymentResult from '@/app/components/PaymentResult';
import styles from '@/app/components/PaymentResult.module.css';

export const metadata = {
  title: 'Confirmación de Pago | Amarte Store',
  description: 'Resultado del procesamiento de tu pago y detalles de tu pedido.',
};

// Componente de loading INLINE (no necesita archivo separado)
function LoadingFallback() {
  return (
    <div className="payment-result-container loading">
      <div className="payment-loading-wrapper">
        {/* Spinner animado */}
        <div className="payment-spinner-container">
          <div className="payment-spinner-circle">
            <div className="payment-spinner-inner"></div>
            <div className="payment-spinner-center">
              <div className="payment-spinner-icon"></div>
            </div>
          </div>
        </div>
        
        {/* Texto */}
        <h1 className="payment-loading-title">
          Verificando tu pago
        </h1>
        <p className="payment-loading-subtitle">
          Estamos confirmando los detalles de tu compra. Esto tomará solo unos segundos...
        </p>
        
        {/* Dots animados */}
        <div className="payment-loading-dots">
          <div className="payment-dot"></div>
          <div className="payment-dot" style={{animationDelay: '0.1s'}}></div>
          <div className="payment-dot" style={{animationDelay: '0.2s'}}></div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentResult />
    </Suspense>
  );
}