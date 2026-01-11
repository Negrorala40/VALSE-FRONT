// app/checkout/success/page.tsx
import { Suspense } from 'react';
import PaymentResult from '@/app/components/PaymentResult';

export const metadata = {
  title: 'Confirmación de Pago | Singapur Next',
  description: 'Resultado del procesamiento de tu pago y detalles de tu pedido.',
};

// Componente de loading INLINE (no necesita archivo separado)
function LoadingFallback() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* Spinner animado */}
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full border-4 border-blue-100"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Texto */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Verificando tu pago
        </h1>
        <p className="text-gray-600 mb-8">
          Estamos confirmando los detalles de tu compra. Esto tomará solo unos segundos...
        </p>
        
        {/* Dots animados */}
        <div className="flex justify-center space-x-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
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