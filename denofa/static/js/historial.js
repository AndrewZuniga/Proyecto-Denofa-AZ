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
  const score = item.score || 0;
  let reliablePct = 0, dubiousPct = 0, disinfoPct = 0;

  if (score >= 70) {
    reliablePct = score;
    dubiousPct = Math.floor((100 - score) * 0.7);
    disinfoPct = 100 - score - dubiousPct;
  } else if (score < 40) {
    disinfoPct = 100 - score;
    dubiousPct = Math.floor(score * 0.7);
    reliablePct = score - dubiousPct;
  } else {
    dubiousPct = Math.max(score, 100 - score);
    if (dubiousPct < 50) dubiousPct = 50;
    const remainder = 100 - dubiousPct;
    reliablePct = Math.floor(remainder / 2);
    disinfoPct = remainder - reliablePct;
  }

  let reliable = 0, dubious = 0, disinfo = 0;
  if (item.snippets && item.snippets.length > 0) {
    item.snippets.forEach(frag => {
      if (frag.status === 'reliable') reliable++;
      else if (frag.status === 'dubious') dubious++;
      else if (frag.status === 'disinfo') disinfo++;
    });
  }

  return `
    <li>
      <a href="/detalle/${item.id}/" 
         class="history-card"
         aria-label="Ver detalle del análisis"
         style="display: flex; flex-direction: column;">
        <div class="history-card__content" style="flex: 1;">
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
          <div class="history-card__details" style="display: flex; flex-direction: column; gap: 16px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
            
            <!-- Fila 1: Desglose -->
            <div>
              <h4 style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-primary); letter-spacing: 0.05em; margin-bottom: 8px;">Desglose del análisis</h4>
              <div style="font-size: 13px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
                <span style="color: var(--color-reliable); font-weight: 500;">• ${reliablePct}% veracidad</span>
                <span style="color: var(--color-text-faint);">·</span>
                <span style="color: var(--color-dubious); font-weight: 500;">• ${dubiousPct}% dudoso</span>
                <span style="color: var(--color-text-faint);">·</span>
                <span style="color: var(--color-disinfo); font-weight: 500;">• ${disinfoPct}% falso</span>
              </div>
            </div>

            <!-- Fila 2: Fragmentos -->
            <div>
              <h4 style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-primary); letter-spacing: 0.05em; margin-bottom: 8px;">Análisis de fragmentos</h4>
              <div style="font-size: 13px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px;">
                
                <div style="display: flex; align-items: center; gap: 4px; color: var(--color-reliable); ${reliable === 0 ? 'opacity: 0.6;' : ''}">
                  <span style="font-weight: 500;">Veraces</span>
                  <span style="font-weight: 700; background: rgba(34, 197, 94, 0.15); padding: 2px 6px; border-radius: 4px;">${reliable}</span>
                </div>
                
                <span style="color: var(--color-text-faint);">|</span>
                
                <div style="display: flex; align-items: center; gap: 4px; color: var(--color-dubious); ${dubious === 0 ? 'opacity: 0.6;' : ''}">
                  <span style="font-weight: 500;">Sospechosos</span>
                  <span style="font-weight: 700; background: rgba(234, 179, 8, 0.15); padding: 2px 6px; border-radius: 4px;">${dubious}</span>
                </div>
                
                <span style="color: var(--color-text-faint);">|</span>
                
                <div style="display: flex; align-items: center; gap: 4px; color: var(--color-disinfo); ${disinfo === 0 ? 'opacity: 0.6;' : ''}">
                  <span style="font-weight: 500;">Falsos</span>
                  <span style="font-weight: 700; background: rgba(239, 68, 68, 0.15); padding: 2px 6px; border-radius: 4px;">${disinfo}</span>
                </div>

              </div>
            </div>

          </div>
        </div>
        <span class="history-card__link" style="margin-top: 12px;">
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
