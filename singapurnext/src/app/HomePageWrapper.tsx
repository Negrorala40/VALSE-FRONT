'use client';
import React from 'react';
import { Suspense } from 'react';
import Home from './home/Home';
import Menu from './components/Menu';
import BlogPreview from './components/BlogPreview';

export default function HomePageWrapper() {
  return (
    <Suspense fallback={<div>Cargando página de inicio...</div>}>
      <div>
        <Home />
        <Menu />
        <BlogPreview />
      </div>
    </Suspense>
  );
}
