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
      // Verificar si el producto está habilitado
      if (product.enabled === false) return false;
      
      // Verificar si tiene al menos una variante habilitada con stock
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
        
        // Usar el endpoint de productos activos
        const response = await axios.get<Product[]>(`${MENU_PRODUCTS}/active`);
        const allProducts = response.data;
        
        // Filtrar solo productos disponibles
        const availableProducts = filterAvailableProducts(allProducts);
        
        // Filtrar productos por categoría
        const niñosProducts = availableProducts.filter(p => p.gender === ProductGender.NIÑOS);
        const niñasProducts = availableProducts.filter(p => p.gender === ProductGender.NIÑAS);
        const unisexProducts = availableProducts.filter(p => p.gender === ProductGender.UNISEX);
        
        // Función para obtener todas las imágenes válidas de un producto
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

        // Función para obtener imagen aleatoria de un array de productos
        const getRandomImage = (productArray: Product[]): string => {
          if (productArray.length === 0) return '/images/placeholder.jpg';
          
          // Coleccionar todas las imágenes disponibles
          const allImages: string[] = [];
          productArray.forEach(product => {
            const productImages = getValidImagesFromProduct(product);
            allImages.push(...productImages);
          });
          
          if (allImages.length === 0) return '/images/placeholder.jpg';
          
          // Seleccionar una imagen aleatoria
          return allImages[Math.floor(Math.random() * allImages.length)];
        };

        // Productos para ofertas (los 10 más económicos con imágenes)
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

  // Componente de error
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
          {/* NUEVO HERO SECTION - Estilo del ejemplo */}
          <section className={styles.heroSection}>
            {/* Top decorative line */}
            <div className={styles.heroTopLine} />

            {/* SVG Pajama - Main background element floating */}
            <div className={styles.heroSvgContainer}>
              <svg
                className={styles.heroPajamaSvg}
                viewBox="0 0 300 420"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Ilustración de pijama infantil"
              >
                <defs>
                  <linearGradient id="pajamaBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3DB28A" />
                    <stop offset="100%" stopColor="#2a9b74" />
                  </linearGradient>
                  <linearGradient id="sleeveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3DB28A" />
                    <stop offset="100%" stopColor="#28a076" />
                  </linearGradient>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Main body - pants part */}
                <path
                  d="M 100 140 L 90 320 L 110 320 L 110 180 Q 110 160 115 150 L 115 140 Z"
                  fill="url(#pajamaBg)"
                  stroke="#103359"
                  strokeWidth="3"
                  strokeLinecap="round"
                  filter="url(#glow)"
                />

                {/* Right pant leg */}
                <path
                  d="M 150 140 L 160 320 L 180 320 L 180 180 Q 180 160 185 150 L 185 140 Z"
                  fill="url(#pajamaBg)"
                  stroke="#103359"
                  strokeWidth="3"
                  strokeLinecap="round"
                  filter="url(#glow)"
                />

                {/* Main body - shirt part */}
                <path
                  d="M 80 70 Q 75 90 75 120 L 75 140 L 185 140 L 185 120 Q 185 90 180 70 Q 150 50 150 50 Q 150 50 120 70 Z"
                  fill="url(#pajamaBg)"
                  stroke="#103359"
                  strokeWidth="3"
                  filter="url(#glow)"
                />

                {/* Left sleeve */}
                <path
                  d="M 80 90 Q 40 95 25 110 Q 20 115 30 130 L 75 115 Z"
                  fill="url(#sleeveGrad)"
                  stroke="#103359"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  filter="url(#glow)"
                />

                {/* Right sleeve */}
                <path
                  d="M 220 90 Q 260 95 275 110 Q 280 115 270 130 L 225 115 Z"
                  fill="url(#sleeveGrad)"
                  stroke="#103359"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  filter="url(#glow)"
                />

                {/* Collar/Neckline - rounded */}
                <ellipse
                  cx="150"
                  cy="65"
                  rx="28"
                  ry="18"
                  fill="#806FF7"
                  stroke="#103359"
                  strokeWidth="3"
                  filter="url(#glow)"
                />

                {/* Collar detail inner ring */}
                <ellipse
                  cx="150"
                  cy="62"
                  rx="24"
                  ry="14"
                  fill="none"
                  stroke="#103359"
                  strokeWidth="1.5"
                  opacity="0.4"
                />

                {/* Front buttons column */}
                <g filter="url(#glow)">
                  <circle cx="150" cy="115" r="6" fill="#FFD449" stroke="#103359" strokeWidth="1.5" />
                  <circle cx="150" cy="115" r="3.5" fill="none" stroke="#103359" strokeWidth="1" opacity="0.5" />
                </g>

                <g filter="url(#glow)">
                  <circle cx="150" cy="155" r="6" fill="#FFD449" stroke="#103359" strokeWidth="1.5" />
                  <circle cx="150" cy="155" r="3.5" fill="none" stroke="#103359" strokeWidth="1" opacity="0.5" />
                </g>

                {/* Decorative stars - chest area */}
                <g opacity="0.85">
                  <circle cx="110" cy="110" r="4.5" fill="#FFD449" filter="url(#glow)" />
                  <circle cx="110" cy="110" r="2.5" fill="none" stroke="#103359" strokeWidth="0.8" opacity="0.6" />
                </g>

                <g opacity="0.85">
                  <circle cx="190" cy="110" r="4.5" fill="#FFD449" filter="url(#glow)" />
                  <circle cx="190" cy="110" r="2.5" fill="none" stroke="#103359" strokeWidth="0.8" opacity="0.6" />
                </g>

                {/* Accent stars - lower area */}
                <g opacity="0.8">
                  <circle cx="105" cy="175" r="4" fill="#E9566D" filter="url(#glow)" />
                </g>

                <g opacity="0.8">
                  <circle cx="195" cy="175" r="4" fill="#E9566D" filter="url(#glow)" />
                </g>

                {/* Rocket emoji as accent - centered bottom */}
                <text
                  x="150"
                  y="260"
                  textAnchor="middle"
                  fontSize="48"
                  opacity="0.7"
                  filter="url(#glow)"
                >
                  🚀
                </text>

                {/* Pattern circles - decorative scattered */}
                <g opacity="0.3" stroke="#103359" strokeWidth="1.5" fill="none">
                  <circle cx="60" cy="140" r="8" />
                  <circle cx="240" cy="160" r="8" />
                  <circle cx="70" cy="220" r="6" />
                  <circle cx="230" cy="240" r="6" />
                </g>
              </svg>
            </div>

            {/* Overlay gradient for readability */}
            <div className={styles.heroOverlay} />

            {/* Content - positioned over SVG */}
            <div className={styles.heroContent}>
              <div className={styles.heroTextBox}>
                {/* Small brand indicator */}
                <p className={styles.heroBadge}>Colección A MARTE</p>

                {/* Title */}
                <h1 className={styles.heroTitle}>La magia en cada noche</h1>

                {/* Description */}
                <p className={styles.heroDescription}>
                  Pijamas diseñados para hacer soñar. Cada prenda cuenta una historia de aventura, comodidad y amor por los detalles.
                </p>

                {/* Mirar más link */}
                <Link href="/menu" className={styles.heroLink}>
                  <span>Ver Colección</span>
                  <svg
                    className={styles.heroLinkArrow}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </Link>
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
              {/* Niños - Ahora muestra Niños + Unisex */}
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

              {/* Niñas - Ahora muestra Niñas + Unisex */}
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

              {/* Unisex - Solo muestra Unisex */}
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

      {/* ============================================ */}
      {/* CONTENIDO SEO INVISIBLE - NO AFECTA DISEÑO */}
      {/* ============================================ */}
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
        <h1>A Marte Kids - Tienda Online de Pijamas Espaciales para Niños en Colombia</h1>
        <h2>Pijamas Infantiles con Diseños de Astronautas, Cohetes y Planetas</h2>
        <p>
          Somos A Marte Kids, la tienda especializada en pijamas infantiles con temática espacial. 
          Ofrecemos pijamas de alta calidad para niños y niñas con diseños únicos de astronautas, 
          cohetes espaciales, planetas, estrellas y el universo. Nuestra colección incluye pijamas 
          cómodos, suaves y duraderos perfectos para las noches de aventura de los más pequeños.
        </p>
        <p>
          Trabajamos con tejidos 100% algodón, estampados de alta definición y tallas desde 2 hasta 12 años. 
          Envíos a Bogotá, Medellín, Cali, Barranquilla y todo el territorio colombiano. 
          Pijamas infantiles que inspiran la imaginación y hacen soñar con viajes a Marte y más allá.
        </p>
        <ul>
          <li>Pijamas de astronauta para niños y niñas</li>
          <li>Conjuntos espaciales unisex</li>
          <li>Pijamas de cohete espacial infantil</li>
          <li>Ropa de dormir temática del espacio</li>
          <li>Pijamas de algodón orgánico para niños</li>
          <li>Diseños exclusivos de planetas y galaxias</li>
          <li>Pijamas con capucha de astronauta</li>
          <li>Conjuntos de dos piezas espaciales</li>
        </ul>
        <p>
          Encuentra los mejores pijamas espaciales en Colombia. Envíos rápidos y seguros a todo el país. 
          Calidad premium garantizada, diseños exclusivos y atención personalizada. 
          A Marte Kids - donde los sueños espaciales se hacen realidad cada noche.
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