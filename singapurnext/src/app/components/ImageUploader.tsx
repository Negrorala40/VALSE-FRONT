'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { CldUploadWidget } from 'next-cloudinary';
import type { CloudinaryUploadWidgetOptions } from 'next-cloudinary';
import Image from 'next/image';
import styles from './ImageUploader.module.css';

interface ImageData {
  id?: number;
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
  initialImageUrl?: string;
  imageId?: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onUploadSuccess, 
  variantIndex, 
  imageIndex,
  disabled = false,
  initialImageUrl = "",
  imageId
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(initialImageUrl);
  const [currentImageId, setCurrentImageId] = useState<number | undefined>(imageId);
  
  // Referencias para evitar bucles
  const hasNotifiedRef = useRef(false);
  const isInitializedRef = useRef(false);
  const prevImageUrlRef = useRef<string>('');

  // Inicializar solo una vez
  useEffect(() => {
    if (isInitializedRef.current && initialImageUrl === prevImageUrlRef.current) {
      return;
    }
    
    console.log("🖼️ ImageUploader inicializando:", {
      variantIndex,
      imageIndex,
      initialImageUrl: initialImageUrl?.substring(0, 50) + '...',
      imageId,
      prevUrl: prevImageUrlRef.current?.substring(0, 50) + '...'
    });
    
    if (initialImageUrl && initialImageUrl.trim() !== "" && initialImageUrl !== prevImageUrlRef.current) {
      setPreviewUrl(initialImageUrl);
      setCurrentImageId(imageId);
      prevImageUrlRef.current = initialImageUrl;
      
      // Solo notificar si es una nueva imagen y no hemos notificado antes
      if (!hasNotifiedRef.current && initialImageUrl) {
        const fileName = initialImageUrl.split('/').pop()?.split('?')[0] || 'producto';
        const isCloudinaryUrl = initialImageUrl.includes('cloudinary.com');
        
        const imageData: ImageData = {
          id: imageId,
          fileName: fileName,
          imageUrl: initialImageUrl,
          thumbnailUrl: isCloudinaryUrl 
            ? initialImageUrl.replace('/upload/', '/upload/w_150,h_150,c_fill/q_auto,f_auto/')
            : initialImageUrl,
          mediumUrl: isCloudinaryUrl
            ? initialImageUrl.replace('/upload/', '/upload/w_600,h_600,c_limit/q_auto,f_auto/')
            : initialImageUrl,
          largeUrl: isCloudinaryUrl
            ? initialImageUrl.replace('/upload/', '/upload/w_1200,h_1200,c_limit/q_auto,f_auto/')
            : initialImageUrl
        };
        
        console.log("📤 Notificando imagen existente inicial:", {
          variantIndex,
          imageIndex,
          id: imageId,
          urlPreview: initialImageUrl.substring(0, 50)
        });
        
        // Usar setTimeout para evitar ciclos de renderizado
        setTimeout(() => {
          onUploadSuccess(imageData, variantIndex, imageIndex);
        }, 0);
        
        hasNotifiedRef.current = true;
      }
    } else if (!initialImageUrl || initialImageUrl.trim() === "") {
      setPreviewUrl('');
      setCurrentImageId(undefined);
      prevImageUrlRef.current = '';
      hasNotifiedRef.current = false;
    }
    
    isInitializedRef.current = true;
  }, [initialImageUrl, imageId, variantIndex, imageIndex, onUploadSuccess]);

  // Configuración de Cloudinary
  const cloudinaryConfig: CloudinaryUploadWidgetOptions = {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dzs8sf5li',
    uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ecommerce_uploads',
    folder: 'ecommerce/productos',
    sources: ['local', 'url'],
    multiple: false,
    maxFiles: 1,
    clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    maxFileSize: 5000000,
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
      
      console.log("✅ Imagen subida exitosamente:", {
        fileName,
        variantIndex,
        imageIndex,
        urlPreview: imageUrl.substring(0, 50) + '...'
      });
      
      const thumbnailUrl = imageUrl.replace('/upload/', '/upload/w_150,h_150,c_fill/q_auto,f_auto/');
      const mediumUrl = imageUrl.replace('/upload/', '/upload/w_600,h_600,c_limit/q_auto,f_auto/');
      const largeUrl = imageUrl.replace('/upload/', '/upload/w_1200,h_1200,c_limit/q_auto,f_auto/');
      
      const imageData: ImageData = {
        id: currentImageId,
        fileName: fileName,
        imageUrl: imageUrl,
        thumbnailUrl: thumbnailUrl,
        mediumUrl: mediumUrl,
        largeUrl: largeUrl
      };
      
      console.log("📤 Notificando nueva imagen:", {
        variantIndex,
        imageIndex,
        id: currentImageId
      });
      
      setPreviewUrl(thumbnailUrl);
      setCurrentImageId(undefined); // Reset ID para nueva imagen
      hasNotifiedRef.current = true;
      
      // Notificar al padre con la nueva imagen
      onUploadSuccess(imageData, variantIndex, imageIndex);
      setUploading(false);
    }
  }, [onUploadSuccess, variantIndex, imageIndex, currentImageId]);

  const handleError = useCallback((error: CloudinaryError) => {
    console.error('❌ Error uploading:', {
      error,
      variantIndex,
      imageIndex
    });
    alert('Error al subir la imagen. Por favor, intenta de nuevo.');
    setUploading(false);
  }, [variantIndex, imageIndex]);

  const handleManualUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona solo archivos de imagen (JPG, PNG, etc.)');
      return;
    }
    
    setUploading(true);
    console.log("📤 Subiendo imagen manualmente...", { variantIndex, imageIndex });
    
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
        console.log("✅ Imagen subida manualmente:", data.secure_url.substring(0, 50) + '...');
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
      console.error("❌ Error en subida manual:", error);
      handleError(error as CloudinaryError);
    } finally {
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
    console.log("🚀 Iniciando upload con widget...", { variantIndex, imageIndex });
  }, [variantIndex, imageIndex]);

  const handleReplaceImage = () => {
    console.log("🔄 Reemplazando imagen existente", { 
      variantIndex, 
      imageIndex,
      currentImageId 
    });
    
    setPreviewUrl('');
    setCurrentImageId(undefined);
    hasNotifiedRef.current = false;
    
    const emptyImageData: ImageData = {
      id: undefined,
      fileName: '',
      imageUrl: '',
      thumbnailUrl: '',
      mediumUrl: '',
      largeUrl: ''
    };
    
    onUploadSuccess(emptyImageData, variantIndex, imageIndex);
  };

  const handleRemoveImage = () => {
    console.log("🗑️ Eliminando imagen", { variantIndex, imageIndex });
    
    setPreviewUrl('');
    setCurrentImageId(undefined);
    hasNotifiedRef.current = false;
    
    const emptyImageData: ImageData = {
      id: undefined,
      fileName: '',
      imageUrl: '',
      thumbnailUrl: '',
      mediumUrl: '',
      largeUrl: ''
    };
    
    onUploadSuccess(emptyImageData, variantIndex, imageIndex);
  };

  return (
    <div className={styles.container}>
      <div className={styles.uploadSection}>
        {previewUrl && previewUrl.trim() !== "" ? (
          <div className={styles.existingImageContainer}>
            <p className={styles.existingImageTitle}>
              {initialImageUrl ? "Imagen del producto" : "Imagen subida"}
              {currentImageId && ` (ID: ${currentImageId})`}
            </p>
            <div className={styles.imagePreview}>
              <Image 
                src={previewUrl} 
                alt="Imagen existente" 
                className={styles.previewImage}
                width={150}
                height={150}
                onError={(e) => {
                  console.error("❌ Error cargando imagen existente:", previewUrl.substring(0, 50) + '...');
                  const target = e.target as HTMLImageElement;
                  target.src = "https://via.placeholder.com/150?text=Error+imagen";
                }}
              />
              <div className={styles.imageActions}>
                <button
                  type="button"
                  onClick={handleReplaceImage}
                  className={styles.replaceButton}
                  disabled={uploading || disabled}
                >
                  🔄 Reemplazar
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className={styles.removeButton}
                  disabled={uploading || disabled}
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
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
                    '📤 Subir Imagen'
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
                Seleccionar archivo local
              </label>
            </div>
          </>
        )}
      </div>

      {previewUrl && previewUrl.trim() !== "" && (
        <div className={styles.previewContainer}>
          <p className={styles.helpText}>
            {initialImageUrl ? "✅ Imagen cargada del producto" : "✅ Imagen subida exitosamente"}
            {currentImageId && ` (ID: ${currentImageId})`}
          </p>
          <div className={styles.urlInfo}>
            <small>URL: {previewUrl.substring(0, 60)}...</small>
          </div>
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
          <p className={styles.indicesInfo}>
            <small>Posición: Color {variantIndex !== undefined ? variantIndex + 1 : '?'}, 
                   Imagen {imageIndex !== undefined ? imageIndex + 1 : '?'}</small>
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