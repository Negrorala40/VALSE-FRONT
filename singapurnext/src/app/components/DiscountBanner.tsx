'use client';

import { useState, useEffect } from 'react';
import styles from './DiscountBanner.module.css';
import Image from 'next/image';

export default function DiscountBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

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
                <h3 className={styles.bannerTitle}>¡Hasta 10% de descuento en tu primera compra!</h3>
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
                  Registrarme
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