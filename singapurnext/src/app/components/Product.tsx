'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image'; // Importa el componente Image de Next.js
import styles from '../product/page.module.css';

interface Imagen {
  imageUrl: string;
}

interface Variante {
  id: number;
  color: string;
  size: string;
  stock: number;
  price: number;
  productId: number;
  images: Imagen[];
}

interface Producto {
  id: number;
  name: string;
  description: string;
  gender: string;
  type: string;
  variants: Variante[];
}

const Producto: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('id');

  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [tallaSeleccionada, setTallaSeleccionada] = useState<string>('');
  const [colorSeleccionado, setColorSeleccionado] = useState<string>('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [stockDisponible, setStockDisponible] = useState<number | null>(null);
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [precioSeleccionado, setPrecioSeleccionado] = useState<number | null>(null);

  useEffect(() => {
    if (!productId) {
      setError('Producto no encontrado');
      setCargando(false);
      return;
    }

    const obtenerProducto = async () => {
      try {
        const response = await fetch(`http://localhost:8082/api/products/${productId}`);
        if (!response.ok) throw new Error('Producto no encontrado');

        const data: Producto = await response.json();
        setProducto(data);

        const primeraVariante = data.variants[0];
        const primeraImagen = primeraVariante?.images?.[0]?.imageUrl || null;
        setImagenUrl(primeraImagen);

        const precioMinimo = Math.min(...data.variants.map((v) => v.price));
        setPrecioSeleccionado(precioMinimo);
      } catch (err: unknown) {
        setError((err as Error).message);
      } finally {
        setCargando(false);
      }
    };

    obtenerProducto();
  }, [productId]);

  useEffect(() => {
    if (tallaSeleccionada && colorSeleccionado && producto) {
      const variante = producto.variants.find(
        (v) => v.color === colorSeleccionado && v.size === tallaSeleccionada
      );

      if (variante) {
        setStockDisponible(variante.stock);
        setPrecioSeleccionado(variante.price);

        if (variante.images && variante.images.length > 0) {
          setImagenUrl(variante.images[0].imageUrl);
        }
      }
    } else if (producto) {
      const precioMinimo = Math.min(...producto.variants.map((v) => v.price));
      setPrecioSeleccionado(precioMinimo);
      setStockDisponible(null);
    }
  }, [colorSeleccionado, tallaSeleccionada, producto]);

  const manejarCambioColor = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoColor = e.target.value;
    setColorSeleccionado(nuevoColor);
    setTallaSeleccionada('');
    setStockDisponible(null);

    if (producto) {
      const variante = producto.variants.find((v) => v.color === nuevoColor);
      if (variante) {
        setPrecioSeleccionado(variante.price);
        if (variante.images?.[0]?.imageUrl) {
          setImagenUrl(variante.images[0].imageUrl);
        }
      }
    }
  };

  const manejarCambioTalla = (talla: string) => {
    setTallaSeleccionada(talla);
  };

  const manejarCambioCantidad = (e: React.ChangeEvent<HTMLInputElement>) =>
    setCantidad(Number(e.target.value));

  const agregarAlCarrito = async () => {
    if (!tallaSeleccionada || !colorSeleccionado) {
      alert('Por favor selecciona talla y color');
      return;
    }

    if (cantidad > (stockDisponible || 0)) {
      alert('Cantidad seleccionada excede el stock disponible');
      return;
    }

    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    const variante = producto?.variants.find(
      (v) => v.size === tallaSeleccionada && v.color === colorSeleccionado
    );

    if (!variante || !producto) {
      alert('Variante de producto no encontrada.');
      return;
    }

    const itemCarrito = {
      userId,
      variantId: variante.id,
      quantity: cantidad,
      productName: producto.name,
      color: colorSeleccionado,
      size: tallaSeleccionada,
      imageUrl: variante.images?.[0]?.imageUrl || '',
      price: variante.price,
    };

    if (!token || !userId) {
      // Guardar en localStorage para procesar después
      localStorage.setItem('pendingCartItem', JSON.stringify(itemCarrito));
      alert('Producto guardado. Inicia sesión para completar la compra.');
      router.push('/login');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8082/api/cart/add?userId=${userId}&productVariantId=${variante.id}&quantity=${cantidad}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error desconocido');

      alert('Producto agregado al carrito con éxito.');
      router.push('/menu');
    } catch (err: unknown) {
      alert('Error al agregar al carrito: ' + (err as Error).message);
    }
  };

  if (cargando) return <p>Cargando producto...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!producto) return <p>Producto no encontrado. Regresa al menú.</p>;

  const coloresDisponibles = [
    ...new Set(producto.variants.filter((v) => v.stock > 0).map((v) => v.color)),
  ];

  const tallasDisponibles = colorSeleccionado
    ? [
        ...new Set(
          producto.variants
            .filter((v) => v.color === colorSeleccionado && v.stock > 0)
            .map((v) => v.size)
        ),
      ]
    : [];

  return (
    <div className={styles.producto}>
      {imagenUrl ? (
        <Image
          src={imagenUrl}
          alt={producto.name}
          className={styles['imagen-producto']}
          width={500} // Definir tamaño de la imagen
          height={500} // Definir tamaño de la imagen
        />
      ) : (
        <p>Imagen no disponible</p>
      )}

      <div className={styles['info-producto']}>
        <h2>{producto.name}</h2>
        <p>{producto.description}</p>
        <p className={styles['precio-producto']}>
          {precioSeleccionado !== null
            ? `$${precioSeleccionado.toLocaleString('es-CO')}`
            : 'Seleccione una variante'}
        </p>

        <div className={styles['opciones-producto']}>
          {/* COLOR */}
          <div className={styles['selector-color']}>
            <label>Color:</label>
            <select value={colorSeleccionado} onChange={manejarCambioColor}>
              <option value="">Seleccione un color</option>
              {coloresDisponibles.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </div>

          {/* TALLAS */}
          {colorSeleccionado && (
            <div className={styles['selector-talla']}>
              <label>Talla:</label>
              <div className={styles['botones-talla']}>
                {tallasDisponibles.map((talla) => (
                  <button
                    key={talla}
                    type="button"
                    className={`${styles['boton-talla']} ${
                      tallaSeleccionada === talla ? styles['seleccionado'] : ''
                    }`}
                    onClick={() => manejarCambioTalla(talla)}
                  >
                    {talla}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CANTIDAD */}
          <div className={styles['selector-cantidad']}>
            <label>Cantidad:</label>
            <input
              type="number"
              value={cantidad}
              onChange={manejarCambioCantidad}
              min={1}
              max={stockDisponible || 1}
            />
            <p>
              {colorSeleccionado && tallaSeleccionada
                ? stockDisponible !== null
                  ? stockDisponible < 3
                    ? 'Últimas unidades'
                    : 'Disponible'
                  : 'No disponible'
                : 'Seleccione color y talla'}
            </p>
          </div>
        </div>

        <button
          className={styles['btn-agregar-carrito']}
          onClick={agregarAlCarrito}
        >
          Agregar al Carrito
        </button>
      </div>
    </div>
  );
};

export default Producto;
