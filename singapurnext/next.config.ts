// next.config.ts - VERSIÓN COMPLETA
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Configuración de imágenes
  images: {
    // Método moderno (recomendado)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
    
    // Método legacy (también funciona)
    domains: ['res.cloudinary.com'],
    
    // Optimizaciones
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // CONFIGURACIÓN DE PROXY PARA API - ESTO ES LO QUE NECESITAS
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*', // Tu backend Spring Boot
      },
    ];
  },
  
  // Variables de entorno
  env: {
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080',
  },
};

export default nextConfig;