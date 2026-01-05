'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

const Home = () => {
  const categoriesRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState({
    categories: false,
    values: false,
    cta: false
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const section = entry.target.getAttribute('data-section');
            if (section === 'categories') setIsVisible(prev => ({...prev, categories: true}));
            if (section === 'values') setIsVisible(prev => ({...prev, values: true}));
            if (section === 'cta') setIsVisible(prev => ({...prev, cta: true}));
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (categoriesRef.current) observer.observe(categoriesRef.current);
    if (valuesRef.current) observer.observe(valuesRef.current);
    if (ctaRef.current) observer.observe(ctaRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.homeContainer}>
      <main className={styles.mainContent}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroOverlay}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>
                <span className={styles.titleHighlight}>AMARTE</span> COLOMBIA
              </h1>
              <p className={styles.heroSubtitle}>
                Moda sostenible que expresa tu esencia
              </p>
              <div className={styles.heroButtons}>
                <Link href="/menu" className={styles.primaryButton}>
                  Ver Colección
                </Link>
                <Link href="/menu?filter=nuevo" className={styles.secondaryButton}>
                  Nuevos Lanzamientos
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Categorías principales */}
        <div 
          ref={categoriesRef} 
          data-section="categories"
          className={`${styles.categoriesContainer} ${isVisible.categories ? styles.visible : ''}`}
        >
          <h2 className={styles.sectionTitle}>Explora por Categoría</h2>
          <p className={styles.sectionSubtitle}>
            Descubre prendas diseñadas con pasión y compromiso ambiental
          </p>
          
          <div className={styles.categoriesGrid}>
            <Link href="/menu?gender=hombre" className={styles.categoryCard}>
              <div className={styles.categoryImageContainer}>
                <Image
                  src="/images/categories/hombre.jpg"
                  alt="Moda para Hombre"
                  fill
                  className={styles.categoryImage}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
                <div className={styles.categoryOverlay}></div>
              </div>
              <div className={styles.categoryContent}>
                <h3 className={styles.categoryTitle}>HOMBRE</h3>
              </div>
            </Link>

            <Link href="/menu?gender=mujer" className={styles.categoryCard}>
              <div className={styles.categoryImageContainer}>
                <Image
                  src="/images/categories/mujer.jpg"
                  alt="Moda para Mujer"
                  fill
                  className={styles.categoryImage}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
                <div className={styles.categoryOverlay}></div>
              </div>
              <div className={styles.categoryContent}>
                <h3 className={styles.categoryTitle}>MUJER</h3>
              </div>
            </Link>

            <Link href="/menu?gender=unisex" className={styles.categoryCard}>
              <div className={styles.categoryImageContainer}>
                <Image
                  src="/images/categories/unisex.jpg"
                  alt="Moda Unisex"
                  fill
                  className={styles.categoryImage}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
                <div className={styles.categoryOverlay}></div>
              </div>
              <div className={styles.categoryContent}>
                <h3 className={styles.categoryTitle}>UNISEX</h3>
              </div>
            </Link>

            <Link href="/menu?filter=descuento" className={styles.categoryCard}>
              <div className={styles.categoryImageContainer}>
                <div className={styles.discountBadge}>Hasta -50%</div>
                <Image
                  src="/images/categories/ofertas.jpg"
                  alt="Ofertas especiales"
                  fill
                  className={styles.categoryImage}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
                <div className={styles.categoryOverlay}></div>
              </div>
              <div className={styles.categoryContent}>
                <h3 className={styles.categoryTitle}>OFERTAS</h3>
              </div>
            </Link>
          </div>
        </div>

        {/* Valores de la marca */}
        <section 
          ref={valuesRef}
          data-section="values"
          className={`${styles.valuesSection} ${isVisible.values ? styles.visible : ''}`}
        >
          <div className={styles.valuesContainer}>
            <h2 className={styles.valuesTitle}>Nuestros Valores</h2>
            <div className={styles.valuesGrid}>
              <div className={styles.valueCard}>
                <div className={styles.valueIcon}>🌱</div>
                <h3 className={styles.valueTitle}>Sostenibilidad</h3>
                <p className={styles.valueDescription}>
                  Materiales ecológicos y procesos responsables con el medio ambiente
                </p>
              </div>
              
              <div className={styles.valueCard}>
                <div className={styles.valueIcon}>👕</div>
                <h3 className={styles.valueTitle}>Calidad</h3>
                <p className={styles.valueDescription}>
                  Prendas duraderas con acabados premium y atención al detalle
                </p>
              </div>
              
              <div className={styles.valueCard}>
                <div className={styles.valueIcon}>🎨</div>
                <h3 className={styles.valueTitle}>Diseño Único</h3>
                <p className={styles.valueDescription}>
                  Colecciones exclusivas que cuentan historias colombianas
                </p>
              </div>
              
              <div className={styles.valueCard}>
                <div className={styles.valueIcon}>❤️</div>
                <h3 className={styles.valueTitle}>Comercio Justo</h3>
                <p className={styles.valueDescription}>
                  Apoyo a artesanos locales y condiciones laborales dignas
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section 
          ref={ctaRef}
          data-section="cta"
          className={`${styles.ctaSection} ${isVisible.cta ? styles.visible : ''}`}
        >
          <div className={styles.ctaContainer}>
            <h2 className={styles.ctaTitle}>¿Listo para vestir con conciencia?</h2>
            <p className={styles.ctaText}>
              Únete a nuestra comunidad y recibe un 15% de descuento en tu primera compra
            </p>
            <div className={styles.ctaButtons}>
              <Link href="/register" className={styles.ctaPrimaryButton}>
                Crear Cuenta
              </Link>
              <Link href="/menu" className={styles.ctaSecondaryButton}>
                Ver Catálogo
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;