'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './GlobalToast.module.css';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
  isLeaving: boolean;
}

interface ToastDetail {
  message: string;
  type?: ToastType;
  duration?: number;
}

const DEFAULT_DURATION = 3200;
const MIN_DURATION = 1200;
const MAX_DURATION = 10000;
const EXIT_ANIMATION_MS = 220;
const MAX_VISIBLE_TOASTS = 4;

let toastId = 0;

const getToastLabel = (type: ToastType) => {
  switch (type) {
    case 'success':
      return 'Completado';
    case 'error':
      return 'Atención';
    case 'info':
    default:
      return 'Información';
  }
};

const getToastIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '!';
    case 'info':
    default:
      return 'i';
  }
};

const normalizeDuration = (duration?: number) => {
  if (!duration || Number.isNaN(duration)) {
    return DEFAULT_DURATION;
  }

  return Math.min(Math.max(duration, MIN_DURATION), MAX_DURATION);
};

const GlobalToast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /*
   * En el navegador, window.setTimeout devuelve un number.
   * Por eso los mapas usan number y no NodeJS.Timeout.
   */
  const autoCloseTimersRef = useRef<Map<number, number>>(new Map());
  const exitTimersRef = useRef<Map<number, number>>(new Map());

  const clearToastTimers = useCallback((id: number) => {
    const autoCloseTimer = autoCloseTimersRef.current.get(id);
    const exitTimer = exitTimersRef.current.get(id);

    if (autoCloseTimer !== undefined) {
      window.clearTimeout(autoCloseTimer);
      autoCloseTimersRef.current.delete(id);
    }

    if (exitTimer !== undefined) {
      window.clearTimeout(exitTimer);
      exitTimersRef.current.delete(id);
    }
  }, []);

  const removeToast = useCallback(
    (id: number, immediate = false) => {
      clearToastTimers(id);

      if (immediate) {
        setToasts((currentToasts) =>
          currentToasts.filter((toast) => toast.id !== id)
        );
        return;
      }

      setToasts((currentToasts) =>
        currentToasts.map((toast) =>
          toast.id === id ? { ...toast, isLeaving: true } : toast
        )
      );

      const exitTimer = window.setTimeout(() => {
        setToasts((currentToasts) =>
          currentToasts.filter((toast) => toast.id !== id)
        );

        exitTimersRef.current.delete(id);
      }, EXIT_ANIMATION_MS);

      exitTimersRef.current.set(id, exitTimer);
    },
    [clearToastTimers]
  );

  useEffect(() => {
    const handleShowToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastDetail>;
      const detail = customEvent.detail;

      if (!detail?.message?.trim()) {
        return;
      }

      const id = ++toastId;
      const duration = normalizeDuration(detail.duration);

      const newToast: ToastItem = {
        id,
        message: detail.message.trim(),
        type: detail.type || 'info',
        duration,
        isLeaving: false
      };

      setToasts((currentToasts) => {
        const nextToasts = [...currentToasts, newToast];

        if (nextToasts.length <= MAX_VISIBLE_TOASTS) {
          return nextToasts;
        }

        const overflowCount = nextToasts.length - MAX_VISIBLE_TOASTS;
        const removedToasts = nextToasts.slice(0, overflowCount);

        removedToasts.forEach((toast) => {
          clearToastTimers(toast.id);
        });

        return nextToasts.slice(overflowCount);
      });

      const autoCloseTimer = window.setTimeout(() => {
        removeToast(id);
      }, duration);

      autoCloseTimersRef.current.set(id, autoCloseTimer);
    };

    window.addEventListener(
      'show-toast',
      handleShowToast as EventListener
    );

    return () => {
      window.removeEventListener(
        'show-toast',
        handleShowToast as EventListener
      );

      autoCloseTimersRef.current.forEach((timer) => {
        window.clearTimeout(timer);
      });

      exitTimersRef.current.forEach((timer) => {
        window.clearTimeout(timer);
      });

      autoCloseTimersRef.current.clear();
      exitTimersRef.current.clear();
    };
  }, [clearToastTimers, removeToast]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <section
      className={styles.toastViewport}
      aria-label="Notificaciones"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <article
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type]} ${
            toast.isLeaving ? styles.leaving : ''
          }`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
        >
          <div className={styles.toastIcon} aria-hidden="true">
            {getToastIcon(toast.type)}
          </div>

          <div className={styles.toastContent}>
            <span className={styles.toastLabel}>
              {getToastLabel(toast.type)}
            </span>

            <p className={styles.toastMessage}>
              {toast.message}
            </p>
          </div>

          <button
            type="button"
            className={styles.toastClose}
            onClick={() => removeToast(toast.id)}
            aria-label="Cerrar notificación"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>

          <div
            className={styles.progressTrack}
            aria-hidden="true"
            style={{
              animationDuration: `${toast.duration}ms`
            }}
          />
        </article>
      ))}
    </section>
  );
};

export default GlobalToast;