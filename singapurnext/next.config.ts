// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: [
      'pixabay.com', // <-- ¡Agrega este!
      'cdn.pixabay.com', 
      'www.istockphoto.com', 
      'images.unsplash.com', 
      'localhost', 
      'www.pexels.com'
    ],
  },
};

export default nextConfig;