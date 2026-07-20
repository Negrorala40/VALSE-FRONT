'use client';

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

import { MENU_PRODUCTS, PRODUCT_DETAIL } from '../utils/Api';
import { useCart } from '../context/CartContext';
import { showToast } from '../utils/toast';
import { trackAddToCart, trackViewContent } from '../lib/tracking';
import styles from './Product.module.css';

interface ProductImage {
  id?: number;
  fileName: string;
  imageUrl: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  largeUrl?: string;
}

interface ProductVariant {
  id: number;
  color: string;
  size: string;
  stock: number;
  price: number;
  discountPercentage?: number;
  priceWithDiscount?: number;
  discountAmount?: number;
  productId: number;
  images: ProductImage[];
  enabled?: boolean;
}

interface Product {
  id: number;
  name: string;
  description: string;
  gender: string;
  type: string;
  variants: ProductVariant[];
  enabled?: boolean;
}

interface ErrorResponse {
  response?: {
    status?: number;
  };
  message?: string;
}

type ProductState =
  | { type: 'ready'; message: '' }
  | { type: 'not-found'; message: string }
  | { type: 'unavailable'; message: string }
  | { type: 'error'; message: string };

const SIZE_ORDER = [
  'XXS',
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  '2',
  '4',
  '6',
  '8',
  '10',
  '12',
  '14',
  '16',
  '28',
  '30',
  '32',
  '34',
  '36',
  '38',
  '40',
  '42',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'ÚNICA'
];

const COLOR_MAP: Record<string, string> = {
  azul: '#28435d',
  'azul marino': '#172635',
  rosa: '#dbc5c8',
  verde: '#697867',
  morado: '#80758f',
  negro: '#111111',
  blanco: '#ffffff',
  naranja: '#b46e4e',
  amarillo: '#dccb8c',
  rojo: '#8e4343',
  celeste: '#91aebd',
  gris: '#898989',
  beige: '#d8cfbd',
  lila: '#aaa1b5',
  turquesa: '#8ba8a5',
  coral: '#ba7866',
  violeta: '#766b82',
  mostaza: '#b89a4d',
  'azul claro': '#91aebd',
  'verde menta': '#afc1b0',
  'rosado pastel': '#dbc5c8',
  dorado: '#b99a52',
  'verde claro': '#a9b9a8',
  marron: '#684838',
  café: '#684838',
  fucsia: '#9e5b83',
  aguamarina: '#91b4b1',
  'verde azul': '#355d67',
  'azul cerúleo': '#397899',
  'verde medio': '#678b71',
  'azul ocaso': '#5b586c',
  'amarillo mantequilla': '#d9cda4',
  chocolate: '#51392f',
  'verde salvia': '#a7aa8e',
  terracota: '#ae705f',
  'lavanda grisaceo': '#a79db5',
  champaña: '#e3d8cf',
  'gris carbon': '#414548',
  'rosa viejo': '#a87577',
  arena: '#d4c5aa'
};

const normalizeLabel = (value: string) =>
  value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getColorHex = (colorName: string) => {
  const normalized = colorName.toLowerCase().trim();

  const exactMatch = COLOR_MAP[normalized];

  if (exactMatch) {
    return exactMatch;
  }

  const partialMatch = Object.entries(COLOR_MAP).find(
    ([name]) => normalized.includes(name) || name.includes(normalized)
  );

  return partialMatch?.[1] || '#77736c';
};

const sortSizes = (sizes: string[]) =>
  [...sizes].sort((first, second) => {
    const firstIndex = SIZE_ORDER.indexOf(first.toUpperCase());
    const secondIndex = SIZE_ORDER.indexOf(second.toUpperCase());

    if (firstIndex !== -1 && secondIndex !== -1) {
      return firstIndex - secondIndex;
    }

    if (firstIndex !== -1) return -1;
    if (secondIndex !== -1) return 1;

    const firstNumber = Number.parseInt(first, 10);
    const secondNumber = Number.parseInt(second, 10);

    if (!Number.isNaN(firstNumber) && !Number.isNaN(secondNumber)) {
      return firstNumber - secondNumber;
    }

    return first.localeCompare(second);
  });

const getFinalPrice = (variant: ProductVariant) => {
  const discountedPrice = Number(variant.priceWithDiscount || 0);

  if (discountedPrice > 0) {
    return discountedPrice;
  }

  const price = Number(variant.price || 0);
  const discountPercentage = Number(variant.discountPercentage || 0);

  if (price > 0 && discountPercentage > 0) {
    return Math.max(
      Math.round(price - price * (discountPercentage / 100)),
      0
    );
  }

  return price;
};

const hasDiscount = (variant?: ProductVariant) =>
  Boolean(
    variant &&
      Number(variant.discountPercentage || 0) > 0 &&
      getFinalPrice(variant) < Number(variant.price || 0)
  );

const formatPrice = (price: number) => {
  if (!price || price <= 0) return 'Consultar';

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(price);
};

const getVariantImages = (
  variants: ProductVariant[],
  selectedVariant?: ProductVariant
) => {
  if (selectedVariant?.images?.length) {
    return selectedVariant.images;
  }

  const variantWithImages = variants.find(
    (variant) => variant.images?.length > 0
  );

  return variantWithImages?.images || [];
};

const ProductContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('id');
  const { addToCart } = useCart();

  const trackedProductRef = useRef<string | null>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [productState, setProductState] = useState<ProductState>({
    type: 'ready',
    message: ''
  });
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    trackedProductRef.current = null;
  }, [productId]);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setProductState({
        type: 'not-found',
        message: 'El producto solicitado no existe o el enlace está incompleto.'
      });
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchProduct = async () => {
      setLoading(true);
      setProduct(null);
      setProductState({ type: 'ready', message: '' });
      setSelectedColor('');
      setSelectedSize('');
      setQuantity(1);
      setCurrentImageIndex(0);

      try {
        let response = await fetch(`${MENU_PRODUCTS}/active/${productId}`, {
          signal: controller.signal
        });

        if (!response.ok && response.status === 404) {
          response = await fetch(PRODUCT_DETAIL(productId), {
            signal: controller.signal
          });
        }

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('PRODUCT_NOT_FOUND');
          }

          throw new Error(`No fue posible cargar el producto (${response.status})`);
        }

        const data = (await response.json()) as Product;

        if (data.enabled === false) {
          setProductState({
            type: 'unavailable',
            message: 'Este producto no está disponible actualmente.'
          });
          return;
        }

        const availableVariants = (data.variants || []).filter(
          (variant) => variant.enabled !== false && variant.stock > 0
        );

        if (availableVariants.length === 0) {
          setProductState({
            type: 'unavailable',
            message: 'Este producto no tiene colores o tallas disponibles.'
          });
          return;
        }

        const normalizedProduct = {
          ...data,
          variants: availableVariants
        };

        const initialVariant = availableVariants[0];

        setProduct(normalizedProduct);
        setSelectedColor(initialVariant.color);
        setSelectedSize(initialVariant.size);
      } catch (error) {
        if (controller.signal.aborted) return;

        const message =
          error instanceof Error ? error.message : 'Error cargando el producto';

        if (message === 'PRODUCT_NOT_FOUND') {
          setProductState({
            type: 'not-found',
            message: 'El producto que buscas no está disponible o no existe.'
          });
        } else {
          console.error('Error cargando producto:', error);
          setProductState({
            type: 'error',
            message: 'No fue posible cargar el producto. Intenta nuevamente.'
          });
          showToast('Error al cargar el producto', 'error', 3200);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchProduct();

    return () => {
      controller.abort();
    };
  }, [productId]);

  const availableVariants = useMemo(
    () => product?.variants || [],
    [product]
  );

  const colors = useMemo(
    () => [...new Set(availableVariants.map((variant) => variant.color))],
    [availableVariants]
  );

  const variantsForSelectedColor = useMemo(
    () =>
      availableVariants.filter(
        (variant) => variant.color === selectedColor
      ),
    [availableVariants, selectedColor]
  );

  const sizes = useMemo(
    () =>
      sortSizes([
        ...new Set(
          variantsForSelectedColor.map((variant) => variant.size)
        )
      ]),
    [variantsForSelectedColor]
  );

  const selectedVariant = useMemo(
    () =>
      availableVariants.find(
        (variant) =>
          variant.color === selectedColor &&
          variant.size === selectedSize
      ),
    [availableVariants, selectedColor, selectedSize]
  );

  const images = useMemo(
    () => getVariantImages(variantsForSelectedColor, selectedVariant),
    [selectedVariant, variantsForSelectedColor]
  );

  const currentImage = images[currentImageIndex] || images[0];

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedColor, selectedSize]);

  useEffect(() => {
    if (!product || !selectedVariant || trackedProductRef.current === productId) {
      return;
    }

    trackViewContent({
      variantId: selectedVariant.id,
      productName: product.name,
      price: getFinalPrice(selectedVariant),
      currency: 'COP',
      color: selectedVariant.color,
      size: selectedVariant.size
    });

    trackedProductRef.current = productId;
  }, [product, productId, selectedVariant]);

  const selectColor = useCallback(
    (color: string) => {
      const firstVariant = availableVariants.find(
        (variant) => variant.color === color
      );

      setSelectedColor(color);
      setSelectedSize(firstVariant?.size || '');
      setQuantity(1);
      setCurrentImageIndex(0);
    },
    [availableVariants]
  );

  const selectSize = useCallback((size: string) => {
    setSelectedSize(size);
    setQuantity(1);
    setCurrentImageIndex(0);
  }, []);

  const previousImage = useCallback(() => {
    if (images.length <= 1) return;

    setCurrentImageIndex((current) =>
      current === 0 ? images.length - 1 : current - 1
    );
  }, [images.length]);

  const nextImage = useCallback(() => {
    if (images.length <= 1) return;

    setCurrentImageIndex((current) =>
      current === images.length - 1 ? 0 : current + 1
    );
  }, [images.length]);

  const updateQuantity = useCallback(
    (newQuantity: number) => {
      const maxQuantity = selectedVariant?.stock || 1;
      const safeQuantity = Math.min(Math.max(newQuantity, 1), maxQuantity);

      setQuantity(safeQuantity);
    },
    [selectedVariant]
  );

  const addProductToCart = useCallback(async () => {
    if (!product || !selectedVariant) {
      showToast('Selecciona un color y una talla', 'info', 2800);
      return;
    }

    if (selectedVariant.stock <= 0 || quantity > selectedVariant.stock) {
      showToast('Stock insuficiente', 'error', 3000);
      return;
    }

    try {
      setAddingToCart(true);

      await addToCart(selectedVariant.id, quantity, product.name);

      trackAddToCart({
        variantId: selectedVariant.id,
        productName: product.name,
        price: getFinalPrice(selectedVariant),
        quantity,
        currency: 'COP',
        color: selectedVariant.color,
        size: selectedVariant.size
      });

      showToast('Producto agregado al carrito', 'success', 3000);
    } catch (error) {
      console.error('Error agregando producto:', error);

      const errorData = error as ErrorResponse;

      if (
        errorData.response?.status === 401 ||
        errorData.response?.status === 403
      ) {
        showToast('Inicia sesión para continuar', 'info', 2800);
        router.push('/login');
        return;
      }

      showToast(
        errorData.message || 'No fue posible agregar el producto',
        'error',
        3200
      );
    } finally {
      setAddingToCart(false);
    }
  }, [addToCart, product, quantity, router, selectedVariant]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <span className={styles.loadingSpinner} aria-hidden="true" />
        <p>Cargando producto</p>
      </div>
    );
  }

  if (!product || productState.type !== 'ready') {
    const stateCode =
      productState.type === 'not-found'
        ? '404'
        : productState.type === 'unavailable'
          ? 'OUT'
          : 'ERR';

    const stateTitle =
      productState.type === 'not-found'
        ? 'Producto no encontrado'
        : productState.type === 'unavailable'
          ? 'Producto no disponible'
          : 'No pudimos cargar el producto';

    return (
      <main className={styles.stateContainer}>
        <span className={styles.stateCode}>{stateCode}</span>
        <h1 className={styles.stateTitle}>{stateTitle}</h1>
        <p className={styles.stateText}>{productState.message}</p>

        <button
          type="button"
          className={styles.stateButton}
          onClick={() => router.push('/menu')}
        >
          Volver al catálogo
          <span aria-hidden="true">→</span>
        </button>
      </main>
    );
  }

  const finalPrice = selectedVariant
    ? getFinalPrice(selectedVariant)
    : 0;

  const originalPrice = Number(selectedVariant?.price || 0);
  const discountPercentage = Number(
    selectedVariant?.discountPercentage || 0
  );
  const selectedVariantHasDiscount = hasDiscount(selectedVariant);
  const lowStock =
    selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 3;

  const addButtonText = addingToCart
    ? 'Agregando…'
    : !selectedVariant
      ? 'Selecciona una variante'
      : 'Agregar al carrito';

  return (
    <main className={styles.productPage}>
      <header className={styles.pageHeader}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => router.push('/menu')}
        >
          <span aria-hidden="true">←</span>
          Volver al catálogo
        </button>

        <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
          <span>VALSE</span>
          <span aria-hidden="true">/</span>
          <span>Catálogo</span>
          <span aria-hidden="true">/</span>
          <span className={styles.breadcrumbCurrent}>{product.name}</span>
        </nav>
      </header>

      <section className={styles.productLayout}>
        <div className={styles.gallerySection}>
          <div className={styles.galleryGrid}>
            {images.length > 1 && (
              <div className={styles.thumbnailRail} aria-label="Galería de imágenes">
                {images.map((image, index) => (
                  <button
                    type="button"
                    key={`${image.id || image.fileName}-${index}`}
                    className={`${styles.thumbnailButton} ${
                      index === currentImageIndex
                        ? styles.thumbnailActive
                        : ''
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                    aria-label={`Ver imagen ${index + 1}`}
                    aria-current={
                      index === currentImageIndex ? 'true' : undefined
                    }
                  >
                    <Image
                      src={image.thumbnailUrl || image.imageUrl}
                      alt=""
                      width={84}
                      height={108}
                      className={styles.thumbnailImage}
                    />
                  </button>
                ))}
              </div>
            )}

            <div className={styles.mainMedia}>
              {currentImage ? (
                <Image
                  src={
                    currentImage.largeUrl ||
                    currentImage.mediumUrl ||
                    currentImage.imageUrl
                  }
                  alt={`${product.name}, color ${selectedColor}`}
                  width={920}
                  height={1150}
                  className={styles.mainImage}
                  priority
                  sizes="(max-width: 900px) 100vw, 58vw"
                  onError={(event) => {
                    event.currentTarget.src = '/images/placeholder.png';
                  }}
                />
              ) : (
                <div className={styles.galleryPlaceholder}>
                  <span className={styles.placeholderIcon} aria-hidden="true">
                    V
                  </span>
                  <p>Imagen no disponible</p>
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.galleryArrow} ${styles.galleryArrowPrev}`}
                    onClick={previousImage}
                    aria-label="Imagen anterior"
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    className={`${styles.galleryArrow} ${styles.galleryArrowNext}`}
                    onClick={nextImage}
                    aria-label="Imagen siguiente"
                  >
                    →
                  </button>

                  <span className={styles.galleryCounter}>
                    {String(currentImageIndex + 1).padStart(2, '0')} /{' '}
                    {String(images.length).padStart(2, '0')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <aside className={styles.productInfo}>
          <div className={styles.productMeta}>
            <span className={styles.metaTag}>{normalizeLabel(product.type)}</span>
            <span className={styles.metaTag}>{normalizeLabel(product.gender)}</span>
          </div>

          <h1 className={styles.productTitle}>{product.name}</h1>

          <div className={styles.priceArea} aria-live="polite">
            {selectedVariantHasDiscount ? (
              <div className={styles.discountedPrice}>
                <span className={styles.originalPrice}>
                  {formatPrice(originalPrice)}
                </span>

                <div>
                  <span className={styles.currentPrice}>
                    {formatPrice(finalPrice)}
                  </span>
                  <span className={styles.discountBadge}>
                    -{discountPercentage}%
                  </span>
                </div>
              </div>
            ) : (
              <span className={styles.currentPrice}>
                {formatPrice(finalPrice)}
              </span>
            )}
          </div>

          <p className={styles.productDescription}>{product.description}</p>

          <div className={styles.divider} />

          <section className={styles.optionSection}>
            <div className={styles.optionHeader}>
              <span className={styles.optionLabel}>Color</span>
              <span className={styles.optionValue}>{selectedColor}</span>
            </div>

            <div className={styles.colorOptions}>
              {colors.map((color) => {
                const isSelected = color === selectedColor;
                const colorHex = getColorHex(color);

                return (
                  <button
                    type="button"
                    key={color}
                    className={`${styles.colorButton} ${
                      isSelected ? styles.colorSelected : ''
                    }`}
                    onClick={() => selectColor(color)}
                    aria-label={`Seleccionar color ${color}`}
                    aria-pressed={isSelected}
                  >
                    <span
                      className={styles.colorSwatch}
                      style={{
                        backgroundColor: colorHex,
                        border:
                          colorHex === '#ffffff'
                            ? '1px solid rgba(10, 10, 10, 0.18)'
                            : undefined
                      }}
                    />

                    {isSelected && (
                      <span className={styles.colorCheck} aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.optionSection}>
            <div className={styles.optionHeader}>
              <span className={styles.optionLabel}>Talla</span>
              <span className={styles.optionValue}>{selectedSize}</span>
            </div>

            <div className={styles.sizeOptions}>
              {sizes.map((size) => {
                const variant = variantsForSelectedColor.find(
                  (item) => item.size === size
                );
                const unavailable = !variant || variant.stock <= 0;
                const isSelected = size === selectedSize;

                return (
                  <button
                    type="button"
                    key={size}
                    className={`${styles.sizeButton} ${
                      isSelected ? styles.sizeSelected : ''
                    } ${unavailable ? styles.sizeUnavailable : ''}`}
                    onClick={() => !unavailable && selectSize(size)}
                    disabled={unavailable}
                    aria-pressed={isSelected}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            <p className={styles.selectionHelp}>
              Selecciona la talla habitual. Consulta la guía de medidas cuando esté disponible.
            </p>
          </section>

          <section className={styles.purchasePanel}>
            <div className={styles.purchaseTop}>
              <div className={styles.quantityBlock}>
                <span className={styles.quantityLabel}>Cantidad</span>

                <div className={styles.quantityControl}>
                  <button
                    type="button"
                    className={styles.quantityButton}
                    onClick={() => updateQuantity(quantity - 1)}
                    disabled={quantity <= 1 || addingToCart}
                    aria-label="Reducir cantidad"
                  >
                    −
                  </button>

                  <input
                    type="number"
                    className={styles.quantityInput}
                    value={quantity}
                    min={1}
                    max={selectedVariant?.stock || 1}
                    onChange={(event) =>
                      updateQuantity(Number(event.target.value) || 1)
                    }
                    disabled={!selectedVariant || addingToCart}
                    aria-label="Cantidad"
                  />

                  <button
                    type="button"
                    className={styles.quantityButton}
                    onClick={() => updateQuantity(quantity + 1)}
                    disabled={
                      !selectedVariant ||
                      quantity >= selectedVariant.stock ||
                      addingToCart
                    }
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className={styles.stockBlock}>
                <span className={styles.stockLabel}>Disponibilidad</span>
                <span
                  className={`${styles.stockValue} ${
                    lowStock ? styles.lowStock : ''
                  }`}
                >
                  {lowStock
                    ? 'Últimas unidades'
                    : selectedVariant
                      ? 'Disponible'
                      : 'Selecciona una talla'}
                </span>
              </div>
            </div>

            <button
              type="button"
              className={`${styles.addButton} ${
                !selectedVariant ? styles.addButtonDisabled : ''
              } ${addingToCart ? styles.addButtonLoading : ''}`}
              onClick={() => void addProductToCart()}
              disabled={!selectedVariant || addingToCart}
            >
              <span className={styles.buttonText}>
                {addingToCart && (
                  <span className={styles.buttonSpinner} aria-hidden="true" />
                )}
                {addButtonText}
              </span>

              {selectedVariant && !addingToCart && (
                <span className={styles.buttonPrice}>
                  {formatPrice(finalPrice * quantity)}
                </span>
              )}
            </button>
          </section>

          <section className={styles.benefits} aria-label="Información de compra">
            <article className={styles.benefitItem}>
              <span className={styles.benefitIcon} aria-hidden="true">
                01
              </span>
              <div className={styles.benefitText}>
                <h2 className={styles.benefitTitle}>Pago protegido</h2>
                <p className={styles.benefitDescription}>
                  Procesamiento mediante los medios habilitados en el checkout.
                </p>
              </div>
            </article>

            <article className={styles.benefitItem}>
              <span className={styles.benefitIcon} aria-hidden="true">
                02
              </span>
              <div className={styles.benefitText}>
                <h2 className={styles.benefitTitle}>Envío rastreable</h2>
                <p className={styles.benefitDescription}>
                  Seguimiento sujeto al operador logístico y al destino.
                </p>
              </div>
            </article>

            <article className={styles.benefitItem}>
              <span className={styles.benefitIcon} aria-hidden="true">
                03
              </span>
              <div className={styles.benefitText}>
                <h2 className={styles.benefitTitle}>Cambios y garantía</h2>
                <p className={styles.benefitDescription}>
                  Solicitudes revisadas según las condiciones de la tienda.
                </p>
              </div>
            </article>
          </section>

          <p className={styles.note}>
            El color puede variar ligeramente según la pantalla y la iluminación de la fotografía.
          </p>
        </aside>
      </section>
    </main>
  );
};

const Product = () => (
  <Suspense
    fallback={
      <div className={styles.loadingContainer}>
        <span className={styles.loadingSpinner} aria-hidden="true" />
        <p>Cargando producto</p>
      </div>
    }
  >
    <ProductContent />
  </Suspense>
);

export default Product;