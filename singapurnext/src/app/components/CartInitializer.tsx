'use client';

import { useEffect } from 'react';
import Cookies from 'js-cookie';
import { CART } from '../utils/Api';

const CART_SESSION_STORAGE_KEY = 'cartSessionId';
const CART_SESSION_COOKIE_KEY = 'cart_session_id';
const CART_SESSION_HEADER = 'X-Cart-Session-Id';
const SESSION_EXPIRATION_DAYS = 7;

const persistSessionId = (sessionId: string) => {
  localStorage.setItem(CART_SESSION_STORAGE_KEY, sessionId);

  Cookies.set(CART_SESSION_COOKIE_KEY, sessionId, {
    expires: SESSION_EXPIRATION_DAYS,
    path: '/',
    sameSite: 'lax',
    secure: window.location.protocol === 'https:'
  });
};

const createLocalSessionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `local_${crypto.randomUUID()}`;
  }

  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};

export default function CartInitializer() {
  useEffect(() => {
    const initializeCartSession = async () => {
      const storedSessionId =
        localStorage.getItem(CART_SESSION_STORAGE_KEY) ||
        Cookies.get(CART_SESSION_COOKIE_KEY);

      if (storedSessionId) {
        persistSessionId(storedSessionId);
        return;
      }

      try {
        const response = await fetch(`${CART}/new-session`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            Accept: 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`No fue posible crear la sesión: ${response.status}`);
        }

        const responseSessionId = response.headers.get(CART_SESSION_HEADER);

        let bodySessionId: string | undefined;

        try {
          const data = (await response.json()) as { sessionId?: string };
          bodySessionId = data.sessionId;
        } catch {
          bodySessionId = undefined;
        }

        const sessionId = responseSessionId || bodySessionId;

        if (!sessionId) {
          throw new Error('El backend no devolvió un identificador de sesión');
        }

        persistSessionId(sessionId);
      } catch (error) {
        console.warn(
          'No se pudo crear la sesión del carrito en el backend. Se usará una sesión local temporal.',
          error
        );

        persistSessionId(createLocalSessionId());
      }
    };

    void initializeCartSession();
  }, []);

  return null;
}