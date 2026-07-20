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
  enabled?: boolean;
}

enum ProductGender {
  NIÑOS = 'NIÑOS',
  NIÑAS = 'NIÑAS',
  UNISEX = 'UNISEX'
}

interface Product {
  id: number;
  name: string;
  gender: ProductGender;
  variants: ProductVariant[];
  enabled?: boolean;
}

const Home = () => {
  const categoriesRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState({
    categories: false
  });

  // Estado para productos aleatorios
  const [categoryImages, setCategoryImages] = useState<{
    niños: string;
    niñas: string;
    unisex: string;
    oferta: string;
  }>({
    niños: '/images/placeholder.jpg',
    niñas: '/images/placeholder.jpg',
    unisex: '/images/placeholder.jpg',
    oferta: '/images/placeholder.jpg'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para filtrar productos habilitados y con stock
  const filterAvailableProducts = (products: Product[]): Product[] => {
    return products.filter(product => {
      if (product.enabled === false) return false;
      return product.variants.some(variant => 
        variant.enabled !== false && 
        variant.stock > 0 && 
        variant.images && 
        variant.images.length > 0
      );
    });
  };

  // Función para obtener imágenes aleatorias de productos
  useEffect(() => {
    const fetchCategoryImages = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get<Product[]>(`${MENU_PRODUCTS}/active`);
        const allProducts = response.data;
        const availableProducts = filterAvailableProducts(allProducts);
        
        const niñosProducts = availableProducts.filter(p => p.gender === ProductGender.NIÑOS);
        const niñasProducts = availableProducts.filter(p => p.gender === ProductGender.NIÑAS);
        const unisexProducts = availableProducts.filter(p => p.gender === ProductGender.UNISEX);
        
        const getValidImagesFromProduct = (product: Product): string[] => {
          const images: string[] = [];
          product.variants.forEach(variant => {
            if (variant.enabled !== false && variant.stock > 0 && variant.images) {
              variant.images.forEach(img => {
                if (img.imageUrl && img.imageUrl.trim() !== '') {
                  images.push(img.imageUrl);
                }
              });
            }
          });
          return images;
        };

        const getRandomImage = (productArray: Product[]): string => {
          if (productArray.length === 0) return '/images/placeholder.jpg';
          
          const allImages: string[] = [];
          productArray.forEach(product => {
            const productImages = getValidImagesFromProduct(product);
            allImages.push(...productImages);
          });
          
          if (allImages.length === 0) return '/images/placeholder.jpg';
          return allImages[Math.floor(Math.random() * allImages.length)];
        };

        const ofertaProducts = [...availableProducts]
          .filter(p => {
            const firstVariant = p.variants.find(v => 
              v.enabled !== false && 
              v.stock > 0 && 
              v.images && 
              v.images.length > 0
            );
            return firstVariant?.price;
          })
          .sort((a, b) => {
            const aVariant = a.variants.find(v => v.enabled !== false && v.stock > 0);
            const bVariant = b.variants.find(v => v.enabled !== false && v.stock > 0);
            const aPrice = aVariant?.price || Infinity;
            const bPrice = bVariant?.price || Infinity;
            return aPrice - bPrice;
          })
          .slice(0, 10);

        setCategoryImages({
          niños: getRandomImage(niñosProducts),
          niñas: getRandomImage(niñasProducts),
          unisex: getRandomImage(unisexProducts),
          oferta: getRandomImage(ofertaProducts)
        });

        setLoading(false);
      } catch (error: any) {
        console.error('Error al cargar imágenes:', error);
        setError('Error al cargar las imágenes de categorías');
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

  if (error) {
    return (
      <div className={styles.homeContainer}>
        <div className={styles.errorContainer}>
          <h2>Error al cargar contenido</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.homeContainer}>
        <main className={styles.mainContent}>
          {/* HERO SECTION */}
          <section className={styles.heroSection}>
            {/* Top decorative line */}
            <div className={styles.heroTopLine} />

            {/* Contenedor con imágenes de fondo - Desktop y Mobile */}
            <div className={styles.heroImageContainer}>
              {/* Imagen para Desktop */}
              <div className={styles.heroBackgroundImageWrapperDesktop}>
                <Image
                  src=""
                  alt="Fondo de pijama infantil espacial - Desktop"
                  fill
                  className={styles.heroBackgroundImage}
                  priority
                  sizes="(min-width: 769px) 100vw, 0px"
                  quality={85}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/placeholder.jpg';
                  }}
                />
              </div>

              {/* Imagen para Móvil */}
              <div className={styles.heroBackgroundImageWrapperMobile}>
                <Image
                  src=""
                  alt="Fondo de pijama infantil espacial - Mobile"
                  fill
                  className={styles.heroBackgroundImage}
                  priority
                  sizes="(max-width: 768px) 100vw, 0px"
                  quality={85}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/placeholder.jpg';
                  }}
                />
              </div>
            </div>

            {/* Content - positioned over image */}
            <div className={styles.heroContent}>
              <div className={styles.heroTextBox}>
                
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
              {/* Niños */}
              <Link href="/menu?category=ninos&type=SUPERIOR" className={styles.categoryCard}>
                <div className={styles.categoryImageContainer}>
                  {loading ? (
                    <div className={styles.loadingSkeleton}></div>
                  ) : (
                    <>
                      <Image
                        src={categoryImages.niños}
                        alt="Pijamas para Niños y Unisex"
                        fill
                        className={styles.categoryImage}
                        sizes="(max-width: 768px) 100vw, 25vw"
                        priority
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/placeholder.jpg';
                        }}
                      />
                      <div className={styles.categoryOverlay}></div>
                    </>
                  )}
                </div>
                <div className={styles.categoryContent}>
                  <h3 className={styles.categoryTitle}>NIÑOS</h3>
                </div>
              </Link>

              {/* Niñas */}
              <Link href="/menu?category=ninas&type=SUPERIOR" className={styles.categoryCard}>
                <div className={styles.categoryImageContainer}>
                  {loading ? (
                    <div className={styles.loadingSkeleton}></div>
                  ) : (
                    <>
                      <Image
                        src={categoryImages.niñas}
                        alt="Pijamas para Niñas y Unisex"
                        fill
                        className={styles.categoryImage}
                        sizes="(max-width: 768px) 100vw, 25vw"
                        priority
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/placeholder.jpg';
                        }}
                      />
                      <div className={styles.categoryOverlay}></div>
                    </>
                  )}
                </div>
                <div className={styles.categoryContent}>
                  <h3 className={styles.categoryTitle}>NIÑAS</h3>
                </div>
              </Link>

              {/* Unisex */}
              <Link href="/menu?gender=UNISEX&type=SUPERIOR" className={styles.categoryCard}>
                <div className={styles.categoryImageContainer}>
                  {loading ? (
                    <div className={styles.loadingSkeleton}></div>
                  ) : (
                    <>
                      <Image
                        src={categoryImages.unisex}
                        alt="Pijamas Unisex"
                        fill
                        className={styles.categoryImage}
                        sizes="(max-width: 768px) 100vw, 25vw"
                        priority
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/placeholder.jpg';
                        }}
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
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/placeholder.jpg';
                        }}
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

      {/* CONTENIDO SEO INVISIBLE */}
      <div 
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: '0',
          pointerEvents: 'none',
          opacity: 0
        }}
        aria-hidden="true"
      >
        <h1>A Marte Kids | Tienda de Pijamas Infantiles en Medellín</h1>
        <h2>Pijamas Infantiles para Cada Etapa</h2>
        <p>
          A Marte Kids es una tienda de pijamas infantiles en Medellín, diseñadas para acompañar a los niños dentro y fuera de casa. Creamos pijamas cómodas, seguras y llenas de color, pensadas para dormir, jugar y explorar el mundo con libertad. 
        </p>
        <p>
          Diseños pensados para el movimiento, el descanso y la rutina diaria de los más peques. 
        </p>
        <ul>
          <li>Pijamas para Niños</li>
          <li>Pijamas para Niñas</li>
          <li>Pijamas para Todos</li>
          <li>Más que Pijamas Infantiles</li>
          <li>Comodidad que se queda en su lugar</li>
          <li>Textiles suaves y transpirables</li>
          <li>Diseño funcional y duradero</li>
          <li>Materiales pensados para cuidar la piel y regular la temperatura</li>
        </ul>
        <p>
          Nuestras pijamas no son solo para dormir. Son pijamas de casa para el mundo, diseñadas para usarse todo el día, sin necesidad de cambios.
          Diseñamos y confeccionamos nuestras pijamas infantiles en Medellín, apoyando la producción local y cuidando cada detalle, desde el diseño hasta la confección.  
        </p>
        <p>
          Búsquedas relacionadas: pijamas niños bogotá, ropa infantil temática, 
          pijamas para niños colombia, pijamas de algodón para niños, 
          regalos originales para niños, pijamas astronauta niña, 
          pijamas cohete niño, pijamas planetas infantil.
        </p>
      </div>
    </>
  );
};

export default Home;