import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
    // ELIMINA domains para quitar el warning
    // domains: ['res.cloudinary.com'], // ← COMENTA ESTA LÍNEA
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // PROXY configurado correctamente
  async rewrites() {
    return [
      {
        source: '/api/:path((?!auth).*)',
        destination: 'http://localhost:8080/api/:path*',
      },
    ];
  },
  
  // Para desarrollo: desactiva algunas optimizaciones
  experimental: {
    optimizeCss: false,
  },
  
  // Logs más limpios
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;