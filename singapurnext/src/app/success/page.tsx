import React, { Suspense } from 'react';
import Success from '../components/Success'; // El componente con 'use client'

const SuccessPage = () => {
  return (
    <div style={{ marginTop: '4rem' }}>
      <Suspense fallback={<p>Cargando...</p>}>
        <Success />
      </Suspense>
    </div>
  );
};

export default SuccessPage;
