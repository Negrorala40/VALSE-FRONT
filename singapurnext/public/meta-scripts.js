// Scripts adicionales para el panel Meta

document.addEventListener('DOMContentLoaded', function() {
  // Botón de sincronizar todo
  const syncAllBtn = document.getElementById('sync-all-btn');
  if (syncAllBtn) {
    syncAllBtn.addEventListener('click', function() {
      if (confirm('¿Sincronizar todos los productos con Meta? Esto puede tomar unos minutos.')) {
        fetch('/api/meta-admin/products/sync-all', { method: 'POST' })
          .then(response => {
            if (response.ok) {
              alert('✅ Sincronización iniciada');
              location.reload();
            } else {
              alert('❌ Error iniciando sincronización');
            }
          })
          .catch(error => {
            console.error('Error:', error);
            alert('❌ Error de conexión');
          });
      }
    });
  }

  // Botón de generar CSV
  const generateCsvBtn = document.getElementById('generate-csv-btn');
  if (generateCsvBtn) {
    generateCsvBtn.addEventListener('click', function() {
      if (confirm('¿Generar nuevo archivo CSV? Esto actualizará el catálogo completo.')) {
        fetch('/api/meta-admin/catalog/regenerate', { method: 'POST' })
          .then(response => {
            if (response.ok) {
              alert('✅ CSV generado exitosamente');
              location.reload();
            } else {
              alert('❌ Error generando CSV');
            }
          })
          .catch(error => {
            console.error('Error:', error);
            alert('❌ Error de conexión');
          });
      }
    });
  }

  // Auto-refresh para dashboard
  if (window.location.pathname === '/meta') {
    setInterval(() => {
      // Refrescar estadísticas cada 30 segundos
      fetch('/api/meta-admin/catalog/stats')
        .then(response => response.json())
        .then(data => {
          // Actualizar UI con nuevos datos
          updateStatsUI(data);
        })
        .catch(error => console.error('Error actualizando stats:', error));
    }, 30000);
  }

  // Notificaciones de estado
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${type === 'success' ? '✅' : 'ℹ️'}</span>
        <span>${message}</span>
      </div>
      <button class="notification-close">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
      notification.remove();
    }, 5000);
    
    // Botón de cerrar
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.remove();
    });
  }

  // Actualizar UI de estadísticas
  function updateStatsUI(stats) {
    // Implementar según tu estructura de UI
    console.log('Stats actualizados:', stats);
  }

  // Tooltips para campos requeridos
  const requiredFields = document.querySelectorAll('.form-group.required');
  requiredFields.forEach(field => {
    const input = field.querySelector('input, select, textarea');
    if (input) {
      input.addEventListener('focus', () => {
        field.style.backgroundColor = '#fff8f8';
      });
      input.addEventListener('blur', () => {
        field.style.backgroundColor = '';
      });
    }
  });

  // Copiar URL al portapapeles
  const copyButtons = document.querySelectorAll('.copy-btn');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const textToCopy = this.parentElement.querySelector('code').textContent;
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          const originalText = this.textContent;
          this.textContent = '✓ Copiado';
          this.style.background = '#10b981';
          setTimeout(() => {
            this.textContent = originalText;
            this.style.background = '';
          }, 2000);
        })
        .catch(err => {
          console.error('Error copiando texto:', err);
          alert('❌ Error copiando al portapapeles');
        });
    });
  });

  // Estilos para notificaciones
  const style = document.createElement('style');
  style.textContent = `
    .notification {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border-radius: 8px;
      padding: 1rem 1.5rem;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-width: 300px;
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
      border-left: 4px solid #667eea;
    }
    
    .notification.success {
      border-left-color: #10b981;
    }
    
    .notification .notification-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .notification .notification-icon {
      font-size: 1.2rem;
    }
    
    .notification .notification-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .notification .notification-close:hover {
      color: #333;
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
});