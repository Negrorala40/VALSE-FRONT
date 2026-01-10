"use client";

import { useEffect } from 'react';

// Tipo mínimo para Cloudinary
interface CloudinaryWidgetOptions {
  cloudName: string;
  uploadPreset: string;
  [key: string]: unknown;
}

interface CloudinaryWidgetInstance {
  open: (options?: { preset?: string; folder?: string; tags?: string[] }) => void;
  close: () => void;
  destroy: () => void;
}

interface Cloudinary {
  createUploadWidget: (
    options: CloudinaryWidgetOptions, 
    callback: (error: Error | null, result: { event: string; info: unknown }) => void
  ) => CloudinaryWidgetInstance;
}

const CloudinaryScript = () => {
  useEffect(() => {
    // Verificar que estamos en el cliente
    if (typeof window === 'undefined') return;
    
    // Verificar si el script ya está cargado
    if (window.cloudinary) {
      console.log('✅ Cloudinary Widget ya está cargado');
      return;
    }
    
    const loadScript = () => {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.async = true;
      script.onload = () => {
        console.log('✅ Cloudinary Widget cargado correctamente');
        
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
        document.head.removeChild(script);
      };
    };
    
    const timer = setTimeout(loadScript, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return null;
};

declare global {
  interface Window {
    cloudinary?: Cloudinary;
    cloudinaryConfig?: {
      cloudName: string;
      uploadPreset: string;
    };
  }
}

export default CloudinaryScript;