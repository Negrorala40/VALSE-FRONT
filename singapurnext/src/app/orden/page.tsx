// src/app/orden/page.tsx
'use client';

import { Suspense } from 'react';
import OrdersContent from './OrdersContent';

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}