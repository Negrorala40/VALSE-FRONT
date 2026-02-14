'use client';
import React from 'react';
import { Suspense } from 'react';
import Home from './home/Home';
import Menu from './components/Menu';
import BlogPreview from './components/BlogPreview';

export default function HomePageWrapper() {
  return (
    <Suspense fallback={<div>Cargando página de inicio...</div>}>
      {/* ← Elimina el div y usa fragment <> */}
      <>
        <Home />
        <Menu />
        <BlogPreview />
      </>
    </Suspense>
  );
}