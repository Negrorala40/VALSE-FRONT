// app/layout.tsx - VERSIÓN COMPLETA CON GTM
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Fredoka } from "next/font/google";
import { GoogleTagManager } from '@next/third-parties/google'; // <-- NUEVO
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
  metadataBase: new URL('https://www.amartekids.com'),
  
  // Para mejorar SEO y favicon
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        type: 'image/x-icon',
      },
      {
        url: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        url: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
    apple: {
      url: '/apple-touch-icon.png',
      sizes: '180x180',
      type: 'image/png',
    },
  },
  
  // Open Graph para redes sociales
  openGraph: {
    title: 'A Marte - Pijamas Espaciales para Niños',
    description: 'Pijamas que llevan a los pequeños a Marte. Colección de pijamas espaciales infantiles.',
    url: 'https://www.amartekids.com',
    siteName: 'A Marte Kids',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'A Marte Kids - Pijamas Espaciales',
      },
    ],
    type: 'website',
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'A Marte - Pijamas Espaciales para Niños',
    description: 'Pijamas que llevan a los pequeños a Marte',
    images: ['/og-image.png'],
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
        {/* Structured Data para SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "A Marte Kids",
              "description": "Pijamas espaciales para niños que inspiran la imaginación y el sueño",
              "url": "https://www.amartekids.com",
              "logo": "https://www.amartekids.com/logo.png",
              "sameAs": [
                "https://www.instagram.com/amartekids",
                "https://www.facebook.com/amartekids"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "email": "hola@amartekids.com",
                "contactType": "Customer Service"
              }
            })
          }}
        />
        
        {/* Preconnect para mejorar performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-white text-gray-900 font-sans antialiased">
        {/* NOSCRIPT para GTM - para usuarios sin JavaScript */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PSC5SCVB"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        
        <Providers>
          <Header />
          <main className="flex-grow pt-16">
            {children}
          </main>
          <Footer />
        </Providers>
        
        {/* GOOGLE TAG MANAGER - Componente oficial de Next.js */}
        <GoogleTagManager gtmId="GTM-PSC5SCVB" />
      </body>
    </html>
  );
}