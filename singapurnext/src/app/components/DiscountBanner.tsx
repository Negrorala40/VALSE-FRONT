'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import styles from './DiscountBanner.module.css';
import Image from 'next/image';
import { PUBLIC_DISCOUNT_CONFIG } from '../utils/Api'; // 👈 IMPORTACIÓN CORRECTA (sin comillas)

interface DiscountConfig {
  enabled: boolean;
  discountPercentage: number;
  applyToAnonymous: boolean;
}

export default function DiscountBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [email, setEmail] = useState('');
  const [discountConfig, setDiscountConfig] = useState<DiscountConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  // Cargar configuración del descuento desde el backend
  useEffect(() => {
    const fetchDiscountConfig = async () => {
      try {
        const response = await fetch(PUBLIC_DISCOUNT_CONFIG);
        if (response.ok) {
          const data = await response.json();
          setDiscountConfig(data);
        } else {
          console.error('Error al cargar configuración de descuento');
          setDiscountConfig({ enabled: false, discountPercentage: 0, applyToAnonymous: true });
        }
      } catch (error) {
        console.error('Error de red al cargar configuración:', error);
        setDiscountConfig({ enabled: false, discountPercentage: 0, applyToAnonymous: true });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiscountConfig();
  }, []);

  // Controlar visibilidad del banner
  useEffect(() => {
    // Solo proceder si ya cargamos la configuración
    if (isLoading) return;

    // Verificar si el descuento está habilitado en el backend
    if (!discountConfig?.enabled) {
      setIsVisible(false);
      return;
    }

    // Verificar si ya se mostró el banner en esta sesión
    const hasBannerBeenShown = sessionStorage.getItem('discountBannerShown');
    
    // Solo mostrar si:
    // 1. Estamos en la ruta principal (/)
    // 2. NO se ha mostrado antes en esta sesión
    // 3. No estamos en el estado de suscrito
    // 4. El descuento está habilitado en el backend
    if (pathname === '/' && !hasBannerBeenShown && !isSubscribed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        // Marcar que ya se mostró el banner
        sessionStorage.setItem('discountBannerShown', 'true');
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [pathname, isSubscribed, discountConfig, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      // Aquí podrías enviar el email al backend si quieres registrar interesados
      sessionStorage.setItem('discountBannerShown', 'true');
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('discountBannerShown', 'true');
  };

  // No mostrar nada mientras carga o si está deshabilitado
  if (isLoading || !discountConfig?.enabled || !isVisible) return null;

  // Determinar el porcentaje de descuento a mostrar
  const discountPercentage = discountConfig?.discountPercentage || 10;

  return (
    <>
      {!isSubscribed ? (
        <div className={styles.discountBanner}>
          <div className={styles.bannerContainer}>
            <button onClick={handleClose} className={styles.bannerClose} aria-label="Cerrar">
              ×
            </button>

            <div className={styles.bannerContent}>
              <div className={styles.bannerIcon}>
                <Image 
                  src="/images/logos/logCohete.svg" 
                  alt="Cohete" 
                  width={48} 
                  height={48}
                  className={styles.rocketIcon}
                />
              </div>

              <div className={styles.bannerText}>
                <span className={styles.bannerBadge}>✨ Oferta especial</span>
                <h3 className={styles.bannerTitle}>
                  ¡Hasta {discountPercentage}% de descuento en tu primera compra!
                </h3>
                <p className={styles.bannerDescription}>
                  Regístrate ahora y obtén tu código exclusivo
                </p>
              </div>

              <form onSubmit={handleSubmit} className={styles.bannerForm}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className={styles.bannerInput}
                />
                <button type="submit" className={styles.bannerButton}>
                  Enviar
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.discountModalOverlay}>
          <div className={styles.discountModal}>
            <button onClick={handleClose} className={styles.modalClose}>
              ×
            </button>
            
            <div className={styles.modalHeader}>
              <div className={styles.modalIcon}>
                <Image 
                  src="/images/logos/logCohete.svg" 
                  alt="Cohete" 
                  width={48} 
                  height={48}
                  className={styles.rocketIconWhite}
                />
              </div>
              <h3 className={styles.modalTitle}>¡Felicidades! 🎉</h3>
              <p className={styles.modalSubtitle}>
                Tu código exclusivo es:
              </p>
              <p className={styles.modalCode}>AMarteKids</p>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.codeContainer}>
                <p className={styles.codeLabel}>Usa este código en tu primera compra:</p>
                <div className={styles.codeBox}>
                  <span className={styles.code}>AMarteKids</span>
                  <button 
                    onClick={() => navigator.clipboard.writeText('AMarteKids')}
                    className={styles.codeCopy}
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button 
                  onClick={() => {
                    setIsVisible(false);
                    // Aquí puedes redirigir a la tienda
                    window.location.href = '/productos';
                  }}
                  className={styles.buttonPrimary}
                >
                  Hacer mi primera compra
                </button>
                <button onClick={handleClose} className={styles.buttonSecondary}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}