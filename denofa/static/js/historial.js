// denofa/static/js/historial.js
import { formatDate } from './utils.js';

const VERDICT_PILL_MAP = {
  'CONFIABLE':               'verdict-pill--reliable',
  'DUDOSO':                  'verdict-pill--dubious',
  'PROBABLE DESINFORMACIÓN': 'verdict-pill--disinfo',
};

function loadHistory() {
  const el = document.getElementById('analyses-data');
  if (el) {
    try {
      return JSON.parse(el.textContent);
    } catch (e) {
      console.error('Error parsing analyses data:', e);
    }
  }
  return [];
}



function renderCard(item) {
  return `
    <li>
      <a href="/detalle/${item.id}/" 
         class="history-card"
         aria-label="Ver detalle del análisis">
        <div class="history-card__content">
          <div class="history-card__meta">
            <span class="verdict-pill verdict-pill--${item.verdict}">
              ${item.verdictLabel}
            </span>
            <span class="history-card__date">
              ${formatDate(item.timestamp)}
            </span>
          </div>
          <p class="history-card__excerpt">
            ${item.excerpt}
          </p>
        </div>
        <span class="history-card__link">
          Ver más
        </span>
      </a>
    </li>
  `;
}

function renderHistory(items) {
  const container = document.getElementById('history-list');
  const emptyState = document.getElementById('empty-state');
  if (!container) return;

  if (items.length === 0) {
    if (emptyState) emptyState.style.display = 'list-item';
    Array.from(container.children).forEach(child => {
      if (child.id !== 'empty-state') child.remove();
    });
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  const cardsHtml = items.map(item => {
    let verdictClassModifier = 'reliable';
    if (VERDICT_PILL_MAP[item.verdict]) {
      verdictClassModifier = VERDICT_PILL_MAP[item.verdict].replace('verdict-pill--', '');
    }
    const adaptedItem = {
      ...item,
      verdict: verdictClassModifier,
      verdictLabel: item.verdict,
      timestamp: item.date
    };
    return renderCard(adaptedItem);
  }).join('');

  container.innerHTML = (emptyState ? emptyState.outerHTML : '') + cardsHtml;
  
  const newEmptyState = document.getElementById('empty-state');
  if (newEmptyState) newEmptyState.style.display = 'none';

  const detailLinks = container.querySelectorAll('.history-card');
  detailLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      // Obtener el ID desde el href (ej: /detalle/10/)
      const parts = link.getAttribute('href').split('/');
      const id = parts[parts.length - 2];
      if (id) {
        sessionStorage.setItem('currentAnalysisId', id);
        sessionStorage.setItem('returnUrl', window.location.pathname);
        window.location.href = `/detalle/${id}/`;
      }
    });
  });
}

function initClearButton() {
  const btn = document.getElementById('btn-clear');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (confirm('¿Eliminar todo el historial?')) {
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1] || '';

      fetch('/historial/limpiar/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken
        }
      })
      .then(res => {
        if (res.ok) {
          renderHistory([]);
        } else {
          alert('Error al limpiar el historial de la sesión');
        }
      })
      .catch(err => {
        console.error('Error:', err);
        alert('Error al conectar con el servidor.');
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('history-list')) {
    const items = loadHistory();
    renderHistory(items);
    initClearButton();
  }
});
