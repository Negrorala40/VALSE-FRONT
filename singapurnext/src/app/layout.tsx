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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.amartekids.com'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${fredoka.variable}`}>
      <head>
        {/* SOLO LO ESENCIAL: */}
        
        {/* 1. FAVICON PRINCIPAL */}
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        
        {/* 2. MANIFEST PWA */}
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* 3. COLOR DEL TEMA */}
        <meta name="theme-color" content="#1e40af" />
        
        {/* 4. VIEWPORT */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* 5. PARA iOS */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
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