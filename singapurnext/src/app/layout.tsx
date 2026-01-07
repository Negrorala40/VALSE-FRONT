import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Fredoka } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Providers from "./components/Providers";
import CloudinaryScript from "./components/CloudinaryScript"; // Nuevo componente

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
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://tu-dominio.com',
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
        {/* Metadatos adicionales y links */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        
        {/* Preconnect para mejorar performance */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        
        {/* Script de Cloudinary Widget - SIN strategy (causaba error) */}
        <script 
          src="https://upload-widget.cloudinary.com/global/all.js" 
          type="text/javascript"
          async
        />
        
        {/* Estructura de datos para SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ClothingStore",
              "name": "A Marte",
              "description": "Pijamas espaciales para niños",
              "url": "https://tu-dominio.com",
              "logo": "https://tu-dominio.com/logo.png",
              "image": "https://tu-dominio.com/og-image.jpg",
              "priceRange": "$$",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "ES"
              }
            })
          }}
        />
        
        {/* Meta tags para PWA (opcional) */}
        <meta name="theme-color" content="#4CAF50" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-white text-gray-900 font-sans antialiased">
        <Providers>
          {/* Componente para manejar Cloudinary Script de forma más limpia */}
          <CloudinaryScript />
          
          <Header />
          <main className="flex-grow pt-16">
            {children}
          </main>
          <Footer />
        </Providers>
        
        {/* Scripts adicionales para analytics, etc. */}
        {process.env.NODE_ENV === 'production' && (
          <>
            {/* Google Analytics ejemplo */}
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_ID || 'G-XXXXXX'}');
                `,
              }}
            />
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID || 'G-XXXXXX'}`}
            />
          </>
        )}
      </body>
    </html>
  );
}