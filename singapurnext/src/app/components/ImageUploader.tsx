"use client";

import { useState, useCallback } from 'react';
import { CldUploadWidget } from 'next-cloudinary';
import type { CloudinaryUploadWidgetOptions } from 'next-cloudinary';
import Image from 'next/image';
import styles from './ImageUploader.module.css';

interface ImageData {
  fileName: string;
  imageUrl: string;
  thumbnailUrl: string;
  mediumUrl: string;
  largeUrl: string;
}

interface CloudinaryUploadResult {
  event: string;
  info: {
    secure_url: string;
    public_id: string;
    original_filename?: string;
  };
}

interface CloudinaryError {
  message?: string;
}

interface ImageUploaderProps {
  onUploadSuccess: (imageData: ImageData, variantIndex?: number, imageIndex?: number) => void;
  variantIndex?: number;
  imageIndex?: number;
  disabled?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onUploadSuccess, 
  variantIndex, 
  imageIndex,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // Configuración con tipos específicos
  const cloudinaryConfig: CloudinaryUploadWidgetOptions = {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dzs8sf5li',
    uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ecommerce_uploads',
    folder: 'ecommerce/productos',
    sources: ['local', 'url'],
    multiple: false,
    maxFiles: 1,
    clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    maxFileSize: 5000000, // 5MB
    showPoweredBy: false,
    styles: {
      palette: {
        window: "#F5F5F5",
        windowBorder: "#90A0B3",
        tabIcon: "#0078FF",
        menuIcons: "#5A616A",
        textDark: "#000000",
        textLight: "#FFFFFF",
        link: "#0078FF",
        action: "#FF620C",
        inactiveTabIcon: "#0E2F5A",
        error: "#F44235",
        inProgress: "#0078FF",
        complete: "#20B832",
        sourceBg: "#E4EBF1"
      }
    }
  };

  const handleUploadSuccess = useCallback((result: CloudinaryUploadResult) => {
    if (result.event === 'success') {
      const imageUrl = result.info.secure_url;
      const publicId = result.info.public_id;
      const fileName = result.info.original_filename || publicId.split('/').pop() || 'producto';
      
      // Generar diferentes tamaños automáticamente
      const thumbnailUrl = imageUrl.replace('/upload/', '/upload/w_150,h_150,c_fill/q_auto,f_auto/');
      const mediumUrl = imageUrl.replace('/upload/', '/upload/w_600,h_600,c_limit/q_auto,f_auto/');
      const largeUrl = imageUrl.replace('/upload/', '/upload/w_1200,h_1200,c_limit/q_auto,f_auto/');
      
      const imageData: ImageData = {
        fileName: fileName,
        imageUrl: imageUrl,
        thumbnailUrl: thumbnailUrl,
        mediumUrl: mediumUrl,
        largeUrl: largeUrl
      };
      
      // Llamar a la función callback
      onUploadSuccess(imageData, variantIndex, imageIndex);
      
      setPreviewUrl(thumbnailUrl);
      setUploading(false);
    }
  }, [onUploadSuccess, variantIndex, imageIndex]);

  const handleError = useCallback((error: CloudinaryError) => {
    console.error('Error uploading:', error);
    alert('Error al subir la imagen. Por favor, intenta de nuevo.');
    setUploading(false);
  }, []);

  const handleManualUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona solo archivos de imagen (JPG, PNG, etc.)');
      return;
    }
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', cloudinaryConfig.uploadPreset || 'ecommerce_uploads');
      formData.append('folder', cloudinaryConfig.folder || 'ecommerce/productos');
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/upload`,
        {
          method: 'POST',
          body: formData
        }
      );
      
      const data = await response.json();
      if (data.secure_url) {
        handleUploadSuccess({ 
          event: 'success', 
          info: {
            secure_url: data.secure_url,
            public_id: data.public_id,
            original_filename: data.original_filename
          }
        });
      } else {
        throw new Error(data.error?.message || 'Error al subir');
      }
    } catch (error) {
      handleError(error as CloudinaryError);
    } finally {
      // Reset input
      const target = event.target as HTMLInputElement;
      target.value = '';
    }
  };

  const handleWidgetError = useCallback((error: unknown) => {
    const cloudinaryError = error as CloudinaryError;
    handleError(cloudinaryError);
  }, [handleError]);

  const handleWidgetUpload = useCallback(() => {
    setUploading(true);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.uploadSection}>
        <CldUploadWidget
          uploadPreset={cloudinaryConfig.uploadPreset}
          options={cloudinaryConfig}
          onSuccess={handleUploadSuccess as (result: unknown) => void}
          onError={handleWidgetError}
          onUpload={handleWidgetUpload}
        >
          {({ open }) => (
            <button
              type="button"
              onClick={() => open && open()}
              disabled={uploading || disabled}
              className={`${styles.uploadButton} ${uploading ? styles.uploading : ''}`}
            >
              {uploading ? (
                <>
                  <span className={styles.spinner}></span>
                  Subiendo...
                </>
              ) : (
                '📤 Subir Imagen desde Dispositivo'
              )}
            </button>
          )}
        </CldUploadWidget>

        <div className={styles.orDivider}>
          <span>o</span>
        </div>

        <div className={styles.manualUpload}>
          <input
            type="file"
            id={`file-input-${variantIndex || '0'}-${imageIndex || '0'}`}
            accept="image/*"
            onChange={handleManualUpload}
            disabled={uploading || disabled}
            style={{ display: 'none' }}
          />
          <label 
            htmlFor={`file-input-${variantIndex || '0'}-${imageIndex || '0'}`}
            className={`${styles.fileLabel} ${(uploading || disabled) ? styles.disabled : ''}`}
          >
            Seleccionar archivo
          </label>
        </div>
      </div>

      {previewUrl && (
        <div className={styles.previewContainer}>
          <p className={styles.previewTitle}>Vista previa:</p>
          <div className={styles.previewImageWrapper}>
            <Image 
              src={previewUrl} 
              alt="Vista previa" 
              className={styles.previewImage}
              width={150}
              height={150}
              onError={() => setPreviewUrl('')}
            />
          </div>
          <p className={styles.helpText}>
            ✅ Imagen subida exitosamente a Cloudinary
          </p>
        </div>
      )}

      {!previewUrl && !uploading && (
        <div className={styles.infoBox}>
          <p className={styles.infoText}>
            <strong>Requisitos:</strong><br/>
            • Formatos: JPG, PNG, WebP, GIF<br/>
            • Tamaño máximo: 5MB<br/>
            • Se optimizará automáticamente
          </p>
        </div>
      )}

      {uploading && !previewUrl && (
        <div className={styles.uploadingMessage}>
          <span className={styles.smallSpinner}></span>
          Procesando imagen...
        </div>
      )}
    </div>
  );
};

export default ImageUploader;