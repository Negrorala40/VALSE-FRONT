'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import axios from 'axios';
import { MENU_PRODUCTS } from '../utils/Api';

interface Img {
  id: number;
  fileName: string;
  imageUrl: string;
}

interface ProductVariant {
  id: number;
  color: string;
  size: string;
  stock: number;
  price?: number;
  images: Img[];
}

enum ProductGender {
  MUJER = 'MUJER',
  HOMBRE = 'HOMBRE',
  UNISEX = 'UNISEX'
}

interface Product {
  id: number;
  name: string;
  gender: ProductGender;
  variants: ProductVariant[];
}

const Home = () => {
  const categoriesRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState({
    categories: false
  });

  // Estado para productos aleatorios
  const [categoryImages, setCategoryImages] = useState<{
    hombre: string;
    mujer: string;
    unisex: string;
    oferta: string;
  }>({
    hombre: '/images/placeholder.jpg',
    mujer: '/images/placeholder.jpg',
    unisex: '/images/placeholder.jpg',
    oferta: '/images/placeholder.jpg'
  });
  const [loading, setLoading] = useState(true);

  // Función para obtener imágenes aleatorias de productos
  useEffect(() => {
    const fetchCategoryImages = async () => {
      try {
        const response = await axios.get<Product[]>(MENU_PRODUCTS);
        const products = response.data;

        // Filtrar productos por categoría
        const hombreProducts = products.filter(p => p.gender === ProductGender.HOMBRE);
        const mujerProducts = products.filter(p => p.gender === ProductGender.MUJER);
        const unisexProducts = products.filter(p => p.gender === ProductGender.UNISEX);
        
        // Productos para ofertas (los más económicos)
        const ofertaProducts = [...products]
          .filter(p => p.variants[0]?.price)
          .sort((a, b) => {
            const aPrice = a.variants[0]?.price || Infinity;
            const bPrice = b.variants[0]?.price || Infinity;
            return aPrice - bPrice;
          })
          .slice(0, 10);

        // Función para obtener imagen aleatoria de un array de productos
        const getRandomImage = (productArray: Product[]) => {
          if (productArray.length === 0) return '/images/placeholder.jpg';
          
          const randomProduct = productArray[Math.floor(Math.random() * productArray.length)];
          const imageUrl = randomProduct.variants[0]?.images?.[0]?.imageUrl;
          
          return imageUrl || '/images/placeholder.jpg';
        };

        setCategoryImages({
          hombre: getRandomImage(hombreProducts),
          mujer: getRandomImage(mujerProducts),
          unisex: getRandomImage(unisexProducts),
          oferta: getRandomImage(ofertaProducts)
        });

        setLoading(false);
      } catch (error) {
        console.error('Error al cargar imágenes:', error);
        setLoading(false);
      }
    };

    fetchCategoryImages();
  }, []);

  // Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const section = entry.target.getAttribute('data-section');
            if (section === 'categories') setIsVisible(prev => ({...prev, categories: true}));
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (categoriesRef.current) observer.observe(categoriesRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.homeContainer}>
      <main className={styles.mainContent}>
        {/* Hero Section con imagen grande */}
        <section className={styles.heroSection}>
          <div className={styles.heroImageContainer}>
            {/* Contenedor para la imagen con SVG overlay */}
            <div className={styles.heroImageWrapper}>
              <div className={styles.heroSvgContainer}>
                {/* SVG de pijama en el centro */}
                <svg 
                  width="180" 
                  height="180" 
                  viewBox="0 0 100 100" 
                  className={styles.pajamaSvg}
                  aria-label="Ilustración de pijama"
                >
                  {/* Cuerpo del pijama */}
                  <rect 
                    x="25" 
                    y="20" 
                    width="50" 
                    height="55" 
                    rx="8" 
                    fill="#3DB28A" 
                    stroke="#103359" 
                    strokeWidth="2"
                  />
                  
                  {/* Manga izquierda */}
                  <rect 
                    x="15" 
                    y="30" 
                    width="15" 
                    height="20" 
                    rx="5" 
                    fill="#806FF7" 
                    stroke="#103359" 
                    strokeWidth="2"
                  />
                  
                  {/* Manga derecha */}
                  <rect 
                    x="70" 
                    y="30" 
                    width="15" 
                    height="20" 
                    rx="5" 
                    fill="#806FF7" 
                    stroke="#103359" 
                    strokeWidth="2"
                  />
                  
                  {/* Cuello */}
                  <path 
                    d="M35,20 Q50,10 65,20" 
                    fill="none" 
                    stroke="#E9566D" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                  />
                  
                  {/* Patrones decorativos */}
                  <circle cx="40" cy="40" r="3" fill="#FFD449" />
                  <circle cx="60" cy="40" r="3" fill="#FFD449" />
                  <circle cx="50" cy="55" r="3" fill="#F47B47" />
                  <circle cx="35" cy="60" r="3" fill="#F47B47" />
                  <circle cx="65" cy="60" r="3" fill="#F47B47" />
                  
                  {/* Botones */}
                  <circle cx="50" cy="30" r="2" fill="#103359" />
                  <circle cx="50" cy="45" r="2" fill="#103359" />
                </svg>
              </div>
              
              {/* Imagen de fondo con niños en los extremos */}
              <div className={styles.heroBackground}>
                {/* Niño izquierdo */}
                <div className={`${styles.childImage} ${styles.childLeft}`}>
                  <div className={styles.childSilhouette}></div>
                </div>
                
                {/* Niño derecho */}
                <div className={`${styles.childImage} ${styles.childRight}`}>
                  <div className={styles.childSilhouette}></div>
                </div>
              </div>
            </div>
            
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>
                <span className={styles.titleHighlight}>AMARTE</span> COLOMBIA
              </h1>
              <p className={styles.heroSubtitle}>
                Pijamas que llevan a los pequeños a Marte
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

        {/* Categorías principales - 4 columnas en PC, 1 en móvil */}
        <div 
          ref={categoriesRef} 
          data-section="categories"
          className={`${styles.categoriesContainer} ${isVisible.categories ? styles.visible : ''}`}
        >
          <div className={styles.categoriesGrid}>
            {/* Hombre */}
            <Link href="/menu?gender=hombre" className={styles.categoryCard}>
              <div className={styles.categoryImageContainer}>
                {loading ? (
                  <div className={styles.loadingSkeleton}></div>
                ) : (
                  <>
                    <Image
                      src={categoryImages.hombre}
                      alt="Moda para Hombre"
                      fill
                      className={styles.categoryImage}
                      sizes="(max-width: 768px) 100vw, 25vw"
                      priority
                    />
                    <div className={styles.categoryOverlay}></div>
                  </>
                )}
              </div>
              <div className={styles.categoryContent}>
                <h3 className={styles.categoryTitle}>HOMBRE</h3>
              </div>
            </Link>

            {/* Mujer */}
            <Link href="/menu?gender=mujer" className={styles.categoryCard}>
              <div className={styles.categoryImageContainer}>
                {loading ? (
                  <div className={styles.loadingSkeleton}></div>
                ) : (
                  <>
                    <Image
                      src={categoryImages.mujer}
                      alt="Moda para Mujer"
                      fill
                      className={styles.categoryImage}
                      sizes="(max-width: 768px) 100vw, 25vw"
                      priority
                    />
                    <div className={styles.categoryOverlay}></div>
                  </>
                )}
              </div>
              <div className={styles.categoryContent}>
                <h3 className={styles.categoryTitle}>MUJER</h3>
              </div>
            </Link>

            {/* Unisex */}
            <Link href="/menu?gender=unisex" className={styles.categoryCard}>
              <div className={styles.categoryImageContainer}>
                {loading ? (
                  <div className={styles.loadingSkeleton}></div>
                ) : (
                  <>
                    <Image
                      src={categoryImages.unisex}
                      alt="Moda Unisex"
                      fill
                      className={styles.categoryImage}
                      sizes="(max-width: 768px) 100vw, 25vw"
                      priority
                    />
                    <div className={styles.categoryOverlay}></div>
                  </>
                )}
              </div>
              <div className={styles.categoryContent}>
                <h3 className={styles.categoryTitle}>UNISEX</h3>
              </div>
            </Link>

            {/* Ofertas */}
            <Link href="/menu?filter=descuento" className={styles.categoryCard}>
              <div className={styles.categoryImageContainer}>
                {loading ? (
                  <div className={styles.loadingSkeleton}></div>
                ) : (
                  <>
                    <div className={styles.discountBadge}>OFERTA</div>
                    <Image
                      src={categoryImages.oferta}
                      alt="Ofertas especiales"
                      fill
                      className={styles.categoryImage}
                      sizes="(max-width: 768px) 100vw, 25vw"
                      priority
                    />
                    <div className={styles.categoryOverlay}></div>
                  </>
                )}
              </div>
              <div className={styles.categoryContent}>
                <h3 className={styles.categoryTitle}>OFERTAS</h3>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;