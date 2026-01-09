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
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        
        {/* Preconnect para mejorar performance */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        
        {/* Script de Cloudinary Widget */}
        <script 
          src="https://upload-widget.cloudinary.com/global/all.js" 
          type="text/javascript"
          async
        />
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