
document.addEventListener('DOMContentLoaded', () => {

  // Botón Compartir
  const btnShare = document.getElementById('btn-share-detalle');
  if (btnShare) {
    btnShare.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({
          title: 'Análisis DenoFA',
          text: 'Mira este análisis de verificación de contenido',
          url: window.location.href
        }).catch(console.error);
      } else {
        navigator.clipboard.writeText(window.location.href)
          .then(() => alert('Enlace copiado al portapapeles'))
          .catch(console.error);
      }
    });
  }

  // Botón Guardar con Animación o cambiar por "Nueva consulta" si viene del Historial
  const btnSave = document.getElementById('btn-save-detalle');
  const returnUrl = sessionStorage.getItem('returnUrl') || '';

  if (returnUrl.includes('historial') && btnSave) {
    btnSave.outerHTML = `
      <a href="/" id="btn-save-detalle" class="btn btn--outline" style="display:flex; align-items:center; gap:6px; flex: 1; justify-content: center; text-decoration: none;" aria-label="Nueva consulta">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
        Nueva consulta
      </a>
    `;
  } else if (btnSave) {
    btnSave.addEventListener('click', () => {
      // --- ANIMACIÓN DE GUARDADO ---
      const originalHtml = btnSave.innerHTML;
      
      // 1. "Split" (hundirse o achicarse ligeramente)
      btnSave.style.transition = 'all 0.2s ease-in-out';
      btnSave.style.transform = 'scale(0.92)';
      btnSave.style.opacity = '0.8';

      setTimeout(() => {
        // 2. Cambio a "Listo" y color de éxito
        btnSave.style.transform = 'scale(1.05)';
        btnSave.style.opacity = '1';
        btnSave.style.backgroundColor = 'var(--color-reliable)';
        btnSave.style.color = '#ffffff';
        btnSave.style.borderColor = 'var(--color-reliable)';
        
        btnSave.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>¡Guardado!</span>
        `;
        
        setTimeout(() => {
          // Volver a tamaño normal pero quedarse en verde temporalmente
          btnSave.style.transform = 'scale(1)';
          
          setTimeout(() => {
            // 3. Restaurar estado original
            btnSave.style.backgroundColor = '';
            btnSave.style.color = '';
            btnSave.style.borderColor = '';
            btnSave.innerHTML = originalHtml;
          }, 2000);
          
        }, 150);
        
      }, 200);

    });
  }

});
