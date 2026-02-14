'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import styles from './DiscountControl.module.css';

interface DiscountConfig {
  enabled: boolean;
  discountPercentage: number;
  applyToAnonymous: boolean;
  message?: string;
}

export default function FirstPurchaseDiscountControl() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<DiscountConfig>({
    enabled: true,
    discountPercentage: 10,
    applyToAnonymous: true
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/discount/first-purchase', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) throw new Error('Error cargando configuración');
      
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      toast.error('Error al cargar configuración');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = config.enabled ? 'disable' : 'enable';
      
      const res = await fetch(`/api/admin/discount/first-purchase/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) throw new Error('Error al cambiar estado');
      
      const data = await res.json();
      setConfig(prev => ({ ...prev, enabled: !prev.enabled }));
      
      toast.success(data.message || `Descuento ${!config.enabled ? 'activado' : 'desactivado'}`);
    } catch (error) {
      toast.error('Error al cambiar estado');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/discount/first-purchase/configure', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!res.ok) throw new Error('Error guardando configuración');
      
      const data = await res.json();
      setConfig(data);
      toast.success('✅ Configuración guardada exitosamente');
    } catch (error) {
      toast.error('Error al guardar configuración');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        🎁 Control Descuento Primera Compra
      </h2>

      <div className={styles.statusBar}>
        <span className={styles.statusLabel}>Estado:</span>
        <span className={`${styles.statusBadge} ${config.enabled ? styles.active : styles.inactive}`}>
          {config.enabled ? 'ACTIVADO' : 'DESACTIVADO'}
        </span>
      </div>

      <div className={styles.configGroup}>
        <label className={styles.label}>
          Porcentaje de descuento (%)
        </label>
        <input
          type="number"
          min="1"
          max="100"
          step="0.5"
          value={config.discountPercentage}
          onChange={(e) => setConfig({
            ...config,
            discountPercentage: parseFloat(e.target.value) || 10
          })}
          className={styles.input}
          disabled={saving}
        />
        <p className={styles.hint}>Valor entre 1% y 100%</p>
      </div>

      <div className={styles.checkboxGroup}>
        <input
          type="checkbox"
          id="applyToAnonymous"
          checked={config.applyToAnonymous}
          onChange={(e) => setConfig({
            ...config,
            applyToAnonymous: e.target.checked
          })}
          className={styles.checkbox}
          disabled={saving}
        />
        <label htmlFor="applyToAnonymous" className={styles.checkboxLabel}>
          Aplicar descuento a usuarios anónimos (solo por email)
        </label>
      </div>

      <div className={styles.buttonGroup}>
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`${styles.button} ${config.enabled ? styles.danger : styles.success}`}
        >
          {saving ? (
            <>
              <span className={styles.spinnerSmall}></span>
              Procesando...
            </>
          ) : (
            config.enabled ? '❌ Desactivar Descuento' : '✅ Activar Descuento'
          )}
        </button>

        <button
          onClick={handleSaveConfig}
          disabled={saving}
          className={`${styles.button} ${styles.primary}`}
        >
          {saving ? 'Guardando...' : '💾 Guardar Configuración'}
        </button>
      </div>

      <div className={styles.infoBox}>
        <p className={styles.infoTitle}>📌 Cómo funciona:</p>
        <ul className={styles.infoList}>
          <li>El descuento se aplica automáticamente en el checkout</li>
          <li>Solo aplica para la PRIMERA compra del email (autenticado o anónimo)</li>
          <li>Se verifica contra órdenes con estado: PAGO_APROBADO, ENVIADO, ENTREGADO</li>
          <li>El descuento se aplica DESPUÉS de los descuentos de productos</li>
          {config.applyToAnonymous && (
            <li className={styles.highlight}>✓ Los usuarios anónimos también califican (por email)</li>
          )}
        </ul>
      </div>
    </div>
  );
}