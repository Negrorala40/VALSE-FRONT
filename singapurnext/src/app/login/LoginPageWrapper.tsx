'use client';

import { Suspense } from 'react';
import LoginClient from './LoginClient';

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div>Cargando login...</div>}>
      <LoginClient />
    </Suspense>
  );
}
