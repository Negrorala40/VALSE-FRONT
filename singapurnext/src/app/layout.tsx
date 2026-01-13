// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Fredoka } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Providers from "./components/Providers";

// Configurar Inter para textos generales
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Configurar Fredoka para títulos y elementos especiales
const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-fredoka',
});

export const metadata: Metadata = {
  title: 'A Marte - Pijamas Espaciales para Niños',
  description: 'Pijamas que llevan a los pequeños a Marte. Colección de pijamas espaciales infantiles.',
  keywords: ['pijamas', 'niños', 'espacial', 'marte', 'infantil', 'ropa niños'],
  authors: [{ name: 'A Marte' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'), // ← AÑADE ESTA LÍNEA
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://tu-dominio.com',
    title: 'A Marte - Pijamas Espaciales para Niños',
    description: 'Pijamas que llevan a los pequeños a Marte. Colección de pijamas espaciales infantiles.',
    siteName: 'A Marte',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'A Marte - Pijamas Espaciales',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A Marte - Pijamas Espaciales para Niños',
    description: 'Pijamas que llevan a los pequeños a Marte. Colección de pijamas espaciales infantiles.',
    images: ['/twitter-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${fredoka.variable}`}>
      <head>
  {/* Configuración de iconos con cache-busting */}
  <link
    rel="icon"
    href="/images/logos/logCohete.svg?v=2"
    type="image/svg+xml"
    key="svg-icon"
  />
  
  {/* ICO como fallback seguro */}
  <link
    rel="alternate icon"
    href="/favicon.ico?v=2"
    type="image/x-icon"
    key="ico-icon"
  />
  
  {/* Para iOS */}
  <link
    rel="apple-touch-icon"
    href="/images/logos/logCohete.svg?v=2"
    type="image/svg+xml"
    key="apple-icon"
  />
  
  {/* Metas para prevenir cache en desarrollo */}
  {process.env.NODE_ENV === 'development' && (
    <>
      <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
      <meta httpEquiv="Pragma" content="no-cache" />
      <meta httpEquiv="Expires" content="0" />
    </>
  )}
</head>
      <body className="min-h-screen bg-white text-gray-900 font-sans antialiased">
        <Providers>
          <Header />
          <main className="flex-grow pt-16">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}