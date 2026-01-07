"use client";

import { useEffect } from 'react';

const CloudinaryScript = () => {
  useEffect(() => {
    // Verificar que estamos en el cliente
    if (typeof window === 'undefined') return;
    
    // Verificar si el script ya está cargado
    if (window.cloudinary) {
      console.log('✅ Cloudinary Widget ya está cargado');
      return;
    }
    
    // Cargar el script dinámicamente
    const loadScript = () => {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.async = true;
      script.onload = () => {
        console.log('✅ Cloudinary Widget cargado correctamente');
        
        // Configuración global opcional
        if (!window.cloudinaryConfig) {
          window.cloudinaryConfig = {
            cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
            uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ecommerce_uploads'
          };
        }
      };
      
      script.onerror = () => {
        console.error('❌ Error cargando Cloudinary Widget');
      };
      
      document.head.appendChild(script);
      
      return () => {
        // Cleanup opcional
        document.head.removeChild(script);
      };
    };
    
    // Pequeño delay para no bloquear la renderización inicial
    const timer = setTimeout(loadScript, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return null; // Este componente no renderiza nada visible
};

// Extender la interfaz Window para TypeScript
declare global {
  interface Window {
    cloudinary?: any;
    cloudinaryConfig?: {
      cloudName: string;
      uploadPreset: string;
    };
  }
}

export default CloudinaryScript;