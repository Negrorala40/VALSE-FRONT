'use client';
import React, { Suspense } from 'react';
import Menu from '../components/Menu';

export default function MenuWrapper() {
  return (
    <Suspense fallback={<div>Cargando menú...</div>}>
      <Menu />
    </Suspense>
  );
}
