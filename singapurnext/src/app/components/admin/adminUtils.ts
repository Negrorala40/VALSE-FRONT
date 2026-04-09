import {
    Product,
    ProductFormColorVariant,
    ProductFormSize,
    ProductFormState,
    ProductImage,
    ValidationError,
    Variant
  } from "./types";
  
  export const PREDEFINED_COLORS = [
    "Rojo", "Azul", "Verde", "Negro", "Blanco", "Gris", "Amarillo", "Naranja",
    "Rosa", "Morado", "Marrón", "Beige", "Turquesa", "Vino", "Oliva", "Celeste",
    "Coral", "Lavanda", "Mostaza", "Bordó", "Verde Azul", "Azul Cerúleo",
    "Verde Medio", "Azul Ocaso", "Amarillo Mantequilla", "Chocolate", "Verde Salvia",
    "Terracota", "Lavanda Grisaceo", "Champaña", "Gris Carbon", "Rosa Viejo", "Arena"
  ];
  
  export const createUiId = (): string => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  
    return `ui-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  };
  
  export const createEmptyImage = (): ProductImage => ({
    fileName: "",
    imageUrl: "",
    thumbnailUrl: "",
    mediumUrl: "",
    largeUrl: ""
  });
  
  export const createEmptySize = (): ProductFormSize => ({
    uiId: createUiId(),
    size: "",
    stock: 0,
    price: 0,
    discountPercentage: 0
  });
  
  export const createEmptyColorVariant = (): ProductFormColorVariant => ({
    uiId: createUiId(),
    color: "",
    images: [createEmptyImage()],
    sizes: [createEmptySize()]
  });
  
  export const createEmptyFormState = (): ProductFormState => ({
    name: "",
    description: "",
    gender: "",
    colorVariants: [createEmptyColorVariant()]
  });
  
  export const calculatePriceWithDiscount = (
    price: number,
    discountPercentage?: number
  ): number => {
    if (!discountPercentage || discountPercentage <= 0) {
      return price;
    }
  
    const discountAmount = price * (discountPercentage / 100);
    const discountedPrice = price - discountAmount;
  
    return discountedPrice > 0 ? Number(discountedPrice.toFixed(2)) : 0;
  };
  
  export const calculateDiscountAmount = (
    price: number,
    discountPercentage?: number
  ): number => {
    if (!discountPercentage || discountPercentage <= 0) {
      return 0;
    }
  
    return Number((price * (discountPercentage / 100)).toFixed(2));
  };
  
  export const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };
  
  export const getColorHex = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      Rojo: "#FF0000",
      Azul: "#0000FF",
      Verde: "#008000",
      Negro: "#000000",
      Blanco: "#FFFFFF",
      Gris: "#C3CAD6",
      Amarillo: "#FBEAD4",
      Naranja: "#FFA500",
      Rosa: "#F7D1D9",
      Morado: "#800080",
      Marrón: "#A52A2A",
      Beige: "#F5F5DC",
      Turquesa: "#CFDFE0",
      Vino: "#722F37",
      Oliva: "#808000",
      Celeste: "#87CEEB",
      Coral: "#FF7F50",
      Lavanda: "#E6E6FA",
      Mostaza: "#FFDB58",
      Bordó: "#800000",
      "Verde Azul": "#054365",
      "Azul Cerúleo": "#007FB9",
      "Verde Medio": "#47A779",
      "Azul Ocaso": "#44415C",
      "Amarillo Mantequilla": "#F3E5AB",
      Chocolate: "#4B3621",
      "Verde Salvia": "#B2AC88",
      Terracota: "#C07A64",
      "Lavanda Grisaceo": "#AC9CC5",
      Champaña: "#F5E1DA",
      "Gris Carbon": "#383E42",
      "Rosa Viejo": "#C08081",
      Arena: "#E5D3B3"
    };
  
    return colorMap[colorName] || "#CCCCCC";
  };
  
  export const hasOrdersForColor = (
    product: Product | null,
    originalColor?: string
  ): boolean => {
    if (!product || !originalColor) {
      return false;
    }
  
    return product.variants.some(
      (variant) => variant.color === originalColor && variant.hasOrders
    );
  };
  
  export const hasOrdersForSize = (
    product: Product | null,
    originalColor?: string,
    originalSize?: string
  ): boolean => {
    if (!product || !originalColor || !originalSize) {
      return false;
    }
  
    return product.variants.some(
      (variant) =>
        variant.color === originalColor &&
        variant.size === originalSize &&
        variant.hasOrders
    );
  };
  
  export const normalizeProductToForm = (product: Product): ProductFormState => {
    const colorsMap = new Map<string, ProductFormColorVariant>();
    const imagesByColor = new Map<string, ProductImage[]>();
  
    product.variants.forEach((variant) => {
      if (variant.images?.length) {
        const colorImages = imagesByColor.get(variant.color) || [];
  
        variant.images.forEach((img) => {
          const exists = colorImages.some(
            (existingImg) =>
              existingImg.id === img.id || existingImg.imageUrl === img.imageUrl
          );
  
          if (!exists && img.imageUrl) {
            colorImages.push({
              id: img.id,
              fileName: img.fileName || `producto_${variant.color}`,
              imageUrl: img.imageUrl,
              thumbnailUrl: img.thumbnailUrl || img.imageUrl,
              mediumUrl: img.mediumUrl || img.imageUrl,
              largeUrl: img.largeUrl || img.imageUrl
            });
          }
        });
  
        imagesByColor.set(variant.color, colorImages);
      }
    });
  
    product.variants.forEach((variant) => {
      if (!colorsMap.has(variant.color)) {
        colorsMap.set(variant.color, {
          uiId: createUiId(),
          color: variant.color,
          originalColor: variant.color,
          images: imagesByColor.get(variant.color) || [createEmptyImage()],
          sizes: []
        });
      }
  
      const colorData = colorsMap.get(variant.color)!;
      const sizeExists = colorData.sizes.some(
        (size) => size.originalSize === variant.size
      );
  
      if (!sizeExists) {
        colorData.sizes.push({
          uiId: createUiId(),
          size: variant.size,
          originalSize: variant.size,
          stock: variant.stock,
          price: variant.price,
          discountPercentage: variant.discountPercentage || 0
        });
      }
    });
  
    const colorVariants = Array.from(colorsMap.values());
  
    return {
      name: product.name || "",
      description: product.description || "",
      gender: product.gender || "",
      colorVariants: colorVariants.length > 0 ? colorVariants : [createEmptyColorVariant()]
    };
  };
  
  export const validateProductForm = (
    formState: ProductFormState
  ): ValidationError[] => {
    const errors: ValidationError[] = [];
  
    if (!formState.name.trim()) {
      errors.push({ field: "name", message: "El nombre es obligatorio" });
    }
  
    if (!formState.description.trim()) {
      errors.push({
        field: "description",
        message: "La descripción es obligatoria"
      });
    }
  
    if (!formState.gender.trim()) {
      errors.push({ field: "gender", message: "El género es obligatorio" });
    }
  
    formState.colorVariants.forEach((colorVariant, colorIndex) => {
      if (!colorVariant.color.trim()) {
        errors.push({
          field: `color-${colorIndex}`,
          message: `El color ${colorIndex + 1} no tiene nombre`
        });
      }
  
      const hasValidImages = colorVariant.images.some(
        (img) => img.imageUrl && img.imageUrl.trim() !== ""
      );
  
      if (!hasValidImages) {
        errors.push({
          field: `images-${colorIndex}`,
          message: `El color "${colorVariant.color || colorIndex + 1}" necesita al menos una imagen`
        });
      }
  
      colorVariant.sizes.forEach((size, sizeIndex) => {
        if (!size.size.trim()) {
          errors.push({
            field: `size-${colorIndex}-${sizeIndex}`,
            message: `Talla incompleta en color "${colorVariant.color || colorIndex + 1}"`
          });
        }
  
        if (size.stock < 0) {
          errors.push({
            field: `stock-${colorIndex}-${sizeIndex}`,
            message: `El stock no puede ser negativo en color "${colorVariant.color || colorIndex + 1}"`
          });
        }
  
        if (size.price <= 0) {
          errors.push({
            field: `price-${colorIndex}-${sizeIndex}`,
            message: `El precio debe ser mayor a 0 en color "${colorVariant.color || colorIndex + 1}"`
          });
        }
      });
    });
  
    return errors;
  };
  
  export const buildProductPayload = (
    formState: ProductFormState,
    editingProduct: Product | null,
    editingProductId: number | null
  ): Product => {
    const originalVariantsMap = new Map<string, Variant>();
  
    if (editingProduct) {
      editingProduct.variants.forEach((variant) => {
        originalVariantsMap.set(`${variant.color}_${variant.size}`, variant);
      });
    }
  
    const variants: Variant[] = [];
  
    formState.colorVariants.forEach((colorVariant) => {
      colorVariant.sizes.forEach((size) => {
        const originalKey = `${colorVariant.originalColor ?? colorVariant.color}_${size.originalSize ?? size.size}`;
        const originalVariant = originalVariantsMap.get(originalKey);
  
        const images = colorVariant.images
          .filter((img) => img.imageUrl && img.imageUrl.trim() !== "")
          .map((img) => ({
            ...(img.id ? { id: img.id } : {}),
            fileName: img.fileName.trim() || `producto_${colorVariant.color}`,
            imageUrl: img.imageUrl.trim(),
            thumbnailUrl: img.thumbnailUrl || img.imageUrl,
            mediumUrl: img.mediumUrl || img.imageUrl,
            largeUrl: img.largeUrl || img.imageUrl
          }));
  
        variants.push({
          ...(originalVariant?.id ? { id: originalVariant.id } : {}),
          color: colorVariant.color.trim(),
          size: size.size.trim(),
          stock: Number(size.stock),
          price: Number(size.price),
          discountPercentage:
            size.discountPercentage !== undefined
              ? Number(size.discountPercentage)
              : undefined,
          images,
          hasOrders: originalVariant?.hasOrders,
          enabled: originalVariant?.enabled ?? true
        });
      });
    });
  
    return {
      ...(editingProductId ? { id: editingProductId } : {}),
      name: formState.name.trim(),
      description: formState.description.trim(),
      gender: formState.gender.trim(),
      type: "SUPERIOR",
      variants,
      enabled: editingProduct?.enabled ?? true
    };
  };