'use client';

import { useEffect, useState } from 'react';

const CheckoutSuccess = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  useEffect(() => {
    const confirmOrder = async () => {
      const token = localStorage.getItem('token');
      const storedOrderId = localStorage.getItem('orderId'); // Guardar el orderId en localStorage en el paso anterior
      if (!token || !storedOrderId) {
        setError('No se encontró información del pedido o token');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`https://amarte--backendamarte--sjfs798q7b8v.code.run/api/orders/confirm/${storedOrderId}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errMsg = await res.text();
          throw new Error(errMsg || 'Error confirmando orden');
        }

        setOrderConfirmed(true);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Error desconocido');
        }
      } finally {
        setLoading(false);
      }
    };

    confirmOrder();
  }, []);

  if (loading) return <p>Cargando confirmación de la orden...</p>;

  if (error)
    return (
      <div>
        <h1>Error al confirmar la orden</h1>
        <p>{error}</p>
      </div>
    );

  if (orderConfirmed)
    return (
      <div>
        <h1>¡Gracias por tu compra!</h1>
        <p>Tu orden ha sido confirmada exitosamente.</p>
      </div>
    );

  return null;
};

export default CheckoutSuccess;
