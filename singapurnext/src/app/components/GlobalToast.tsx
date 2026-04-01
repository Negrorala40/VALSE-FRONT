'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './GlobalToast.module.css';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastDetail {
  message: string;
  type?: ToastType;
  duration?: number;
}

let toastId = 0;

const GlobalToast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const handleShowToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastDetail>;
      const detail = customEvent.detail;

      if (!detail?.message) return;

      const id = ++toastId;
      const newToast: ToastItem = {
        id,
        message: detail.message,
        type: detail.type || 'info',
        duration: detail.duration || 3000,
      };

      setToasts((prev) => [...prev, newToast]);

      const timeout = setTimeout(() => {
        removeToast(id);
      }, newToast.duration);

      timeoutsRef.current.set(id, timeout);
    };

    window.addEventListener('show-toast', handleShowToast as EventListener);

    return () => {
      window.removeEventListener('show-toast', handleShowToast as EventListener);
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  const removeToast = (id: number) => {
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }

    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const getIcon = (type: ToastType) => {
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

  return (
    <div className={styles.toastViewport} aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type]}`}
          role="status"
        >
          <div className={styles.toastIcon}>
            <span>{getIcon(toast.type)}</span>
          </div>

          <div className={styles.toastContent}>
            <p className={styles.toastMessage}>{toast.message}</p>
          </div>

          <button
            type="button"
            className={styles.toastClose}
            onClick={() => removeToast(toast.id)}
            aria-label="Cerrar notificación"
          >
            ×
          </button>

          <div
            className={styles.progress}
            style={{ animationDuration: `${toast.duration}ms` }}
          />
        </div>
      ))}
    </div>
  );
};

export default GlobalToast;