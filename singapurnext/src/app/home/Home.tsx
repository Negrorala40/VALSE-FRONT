'use client';

import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import axios from 'axios';
import {
  ArrowRight,
  RotateCcw,
  ShoppingBag
} from 'lucide-react';

import { MENU_PRODUCTS } from '../utils/Api';
import styles from './page.module.css';

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

interface FeaturedProduct {
  id: number;
  name: string;
  image: string;
  gender: ProductGender;
  price: number | null;
}

interface CategoryImages {
  niños: string;
  niñas: string;
  unisex: string;
  oferta: string;
}

const FALLBACK_IMAGE = '/images/placeholder.jpg';

const EMPTY_CATEGORIES: CategoryImages = {
  niños: FALLBACK_IMAGE,
  niñas: FALLBACK_IMAGE,
  unisex: FALLBACK_IMAGE,
  oferta: FALLBACK_IMAGE
};

const formatPrice = (price: number | null) => {
  if (price === null) return '';

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

const getAvailableVariants = (product: Product) =>
  product.variants.filter(
    (variant) =>
      variant.enabled !== false &&
      variant.stock > 0 &&
      Array.isArray(variant.images) &&
      variant.images.some(
        (image) => Boolean(image.imageUrl?.trim())
      )
  );

const getProductImages = (product: Product) =>
  getAvailableVariants(product).flatMap((variant) =>
    variant.images
      .map((image) => image.imageUrl?.trim())
      .filter((imageUrl): imageUrl is string =>
        Boolean(imageUrl)
      )
  );

const getProductPrice = (product: Product) => {
  const prices = getAvailableVariants(product)
    .map((variant) => Number(variant.price))
    .filter(
      (price) => Number.isFinite(price) && price > 0
    );

  return prices.length > 0 ? Math.min(...prices) : null;
};

const filterAvailableProducts = (
  products: Product[]
): Product[] =>
  products.filter(
    (product) =>
      product.enabled !== false &&
      getAvailableVariants(product).length > 0
  );

const getStableImage = (
  products: Product[],
  fallback = FALLBACK_IMAGE
) => {
  const orderedProducts = [...products].sort(
    (first, second) => first.id - second.id
  );

  for (const product of orderedProducts) {
    const firstImage = getProductImages(product)[0];

    if (firstImage) {
      return firstImage;
    }
  }

  return fallback;
};

const getFeaturedProduct = (
  products: Product[]
): FeaturedProduct | null => {
  const candidates = [...products]
    .map((product) => ({
      product,
      image: getProductImages(product)[0],
      price: getProductPrice(product),
      stock: getAvailableVariants(product).reduce(
        (total, variant) => total + variant.stock,
        0
      )
    }))
    .filter(
      (
        candidate
      ): candidate is {
        product: Product;
        image: string;
        price: number | null;
        stock: number;
      } => Boolean(candidate.image)
    )
    .sort((first, second) => {
      if (second.stock !== first.stock) {
        return second.stock - first.stock;
      }

      return first.product.id - second.product.id;
    });

  const featured = candidates[0];

  if (!featured) return null;

  return {
    id: featured.product.id,
    name: featured.product.name,
    image: featured.image,
    gender: featured.product.gender,
    price: featured.price
  };
};

const SafeProductImage = ({
  src,
  alt,
  fill = true,
  className,
  sizes,
  priority = false
}: {
  src: string;
  alt: string;
  fill?: boolean;
  className: string;
  sizes: string;
  priority?: boolean;
}) => {
  const [imageSource, setImageSource] = useState(
    src || FALLBACK_IMAGE
  );

  useEffect(() => {
    setImageSource(src || FALLBACK_IMAGE);
  }, [src]);

  return (
    <Image
      src={imageSource}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      priority={priority}
      onError={() => {
        if (imageSource !== FALLBACK_IMAGE) {
          setImageSource(FALLBACK_IMAGE);
        }
      }}
    />
  );
};

const Home = () => {
  const categoriesRef = useRef<HTMLDivElement>(null);

  const [categoryImages, setCategoryImages] =
    useState<CategoryImages>(EMPTY_CATEGORIES);
  const [featuredProduct, setFeaturedProduct] =
    useState<FeaturedProduct | null>(null);
  const [categoriesVisible, setCategoriesVisible] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await axios.get<Product[]>(
          `${MENU_PRODUCTS}/active`
        );

        const products = Array.isArray(response.data)
          ? response.data
          : [];

        const availableProducts =
          filterAvailableProducts(products);

        const niñosProducts = availableProducts.filter(
          (product) =>
            product.gender === ProductGender.NIÑOS
        );

        const niñasProducts = availableProducts.filter(
          (product) =>
            product.gender === ProductGender.NIÑAS
        );

        const unisexProducts = availableProducts.filter(
          (product) =>
            product.gender === ProductGender.UNISEX
        );

        const offerProducts = [...availableProducts]
          .filter(
            (product) => getProductPrice(product) !== null
          )
          .sort((first, second) => {
            const firstPrice =
              getProductPrice(first) ??
              Number.POSITIVE_INFINITY;
            const secondPrice =
              getProductPrice(second) ??
              Number.POSITIVE_INFINITY;

            return firstPrice - secondPrice;
          });

        setCategoryImages({
          niños: getStableImage(niñosProducts),
          niñas: getStableImage(niñasProducts),
          unisex: getStableImage(unisexProducts),
          oferta: getStableImage(offerProducts)
        });

        setFeaturedProduct(
          getFeaturedProduct(availableProducts)
        );
      } catch (requestError) {
        console.error(
          'Error cargando productos de la portada:',
          requestError
        );

        setError(
          'No pudimos actualizar las prendas destacadas.'
        );
        setCategoryImages(EMPTY_CATEGORIES);
        setFeaturedProduct(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchProducts();
  }, [loadAttempt]);

  useEffect(() => {
    const target = categoriesRef.current;

    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCategoriesVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, []);

  const heroImage =
    featuredProduct?.image || categoryImages.unisex;

  const heroMeta = useMemo(
    () => ({
      name:
        featuredProduct?.name ||
        'Colección esencial VALSE',
      gender:
        featuredProduct?.gender === ProductGender.NIÑOS
          ? 'Niños'
          : featuredProduct?.gender ===
              ProductGender.NIÑAS
            ? 'Niñas'
            : 'Unisex',
      price: formatPrice(featuredProduct?.price ?? null)
    }),
    [featuredProduct]
  );

  return (
    <div className={styles.homeContainer}>
      <main className={styles.mainContent}>
        <section className={styles.heroSection}>
          <div
            className={styles.heroBackgroundMark}
            aria-hidden="true"
          >
            VALSE
          </div>

          <div className={styles.heroCopy}>
            <span className={styles.heroEyebrow}>
              VALSE / ESSENTIAL MOVEMENT
            </span>

            <h1>
              Movimiento
              <br />
              sin exceso.
            </h1>

            <p>
              Prendas diseñadas para acompañar tu ritmo con
              comodidad, presencia y libertad de movimiento.
            </p>

            <div className={styles.heroActions}>
              <Link
                href="/menu"
                className={styles.heroPrimaryAction}
              >
                Explorar colección
                <ArrowRight aria-hidden="true" />
              </Link>

              <Link
                href="/menu?filter=descuento"
                className={styles.heroSecondaryAction}
              >
                Ver ofertas
              </Link>
            </div>

            <div className={styles.heroDetails}>
              <span>Diseño funcional</span>
              <span>Compra segura</span>
              <span>Envíos en Colombia</span>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <span className={styles.heroVisualEyebrow}>
              PIEZA DESTACADA
            </span>

            <div className={styles.heroProductStage}>
              <span
                className={styles.heroProductOrbit}
                aria-hidden="true"
              />

              <div className={styles.heroProductImage}>
                {loading ? (
                  <div
                    className={styles.heroProductSkeleton}
                    aria-label="Cargando prenda destacada"
                  />
                ) : (
                  <SafeProductImage
                    src={heroImage}
                    alt={heroMeta.name}
                    className={styles.heroFloatingProduct}
                    sizes="(max-width: 768px) 88vw, 45vw"
                    priority
                  />
                )}
              </div>

              <div className={styles.heroProductShadow} />

              <div className={styles.heroProductMeta}>
                <span>{heroMeta.gender}</span>
                <h2>{heroMeta.name}</h2>

                {heroMeta.price && (
                  <strong>Desde {heroMeta.price}</strong>
                )}
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className={styles.catalogNotice} role="status">
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setLoadAttempt((current) => current + 1)
              }
            >
              <RotateCcw aria-hidden="true" />
              Reintentar
            </button>
          </div>
        )}

        <section
          ref={categoriesRef}
          className={`${styles.categoriesContainer} ${
            categoriesVisible ? styles.visible : ''
          }`}
          aria-labelledby="categories-title"
        >
          <header className={styles.categoriesHeader}>
            <div>
              <span>COMPRA POR CATEGORÍA</span>
              <h2 id="categories-title">
                Encuentra tu próxima prenda.
              </h2>
            </div>

            <Link href="/menu">
              Ver toda la colección
              <ArrowRight aria-hidden="true" />
            </Link>
          </header>

          <div className={styles.categoriesGrid}>
            <CategoryCard
              href="/menu?category=ninos&type=SUPERIOR"
              title="Niños"
              image={categoryImages.niños}
              loading={loading}
            />

            <CategoryCard
              href="/menu?category=ninas&type=SUPERIOR"
              title="Niñas"
              image={categoryImages.niñas}
              loading={loading}
            />

            <CategoryCard
              href="/menu?gender=UNISEX&type=SUPERIOR"
              title="Unisex"
              image={categoryImages.unisex}
              loading={loading}
            />

            <CategoryCard
              href="/menu?filter=descuento"
              title="Ofertas"
              image={categoryImages.oferta}
              loading={loading}
              badge="SELECCIÓN"
            />
          </div>
        </section>
      </main>
    </div>
  );
};

const CategoryCard = ({
  href,
  title,
  image,
  loading,
  badge
}: {
  href: string;
  title: string;
  image: string;
  loading: boolean;
  badge?: string;
}) => (
  <Link href={href} className={styles.categoryCard}>
    <div className={styles.categoryImageContainer}>
      {loading ? (
        <div className={styles.loadingSkeleton} />
      ) : (
        <>
          <SafeProductImage
            src={image}
            alt={`Colección ${title}`}
            className={styles.categoryImage}
            sizes="(max-width: 768px) 100vw, (max-width: 1100px) 50vw, 25vw"
          />

          <div className={styles.categoryOverlay} />
        </>
      )}

      {badge && (
        <span className={styles.discountBadge}>
          {badge}
        </span>
      )}
    </div>

    <div className={styles.categoryContent}>
      <span>Explorar</span>
      <h3>{title}</h3>
      <ArrowRight aria-hidden="true" />
    </div>
  </Link>
);

export default Home;