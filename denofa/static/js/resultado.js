/**
 * DenoFA – Result State Logic
 */

import { animateNumber, saveToHistory } from './utils.js';
import { showState } from './home.js';

const MOCK_RESULT = {
  id: Date.now(),
  verdict: 'CONFIABLE',
  score: 87,
  explanation: 'El reciente reporte sobre la implementación de <mark class="highlight--green">nuevas energías renovables en el país</mark> muestra una <mark class="highlight--yellow">ligera discrepancia</mark> en las fechas estimadas de finalización, pero los datos duros sobre la <mark class="highlight--green">inversión y el ahorro proyectado</mark> son completamente precisos y coinciden con los <mark class="highlight--green">registros oficiales del ministerio de energía.</mark>',
  fragments: [
    { text: 'Fuente verificada', status: 'reliable' },
    { text: 'Dato contrastado', status: 'reliable' }
  ],
  date: new Date().toISOString(),
  excerpt: 'El reciente reporte sobre la implementación de nuevas energías renovables...'
};

const VERDICT_CONFIG = {
  'CONFIABLE': {
    badgeClass: 'badge--reliable',
    scoreClass: 'verdict-score__num--reliable',
    fillClass: 'progress-bar__fill--reliable',
    label: 'CONFIABLE'
  },
  'DUDOSO': {
    badgeClass: 'badge--dubious',
    scoreClass: 'verdict-score__num--dubious',
    fillClass: 'progress-bar__fill--dubious',
    label: 'DUDOSO'
  },
  'PROBABLE DESINFORMACIÓN': {
    badgeClass: 'badge--disinfo',
    scoreClass: 'verdict-score__num--disinfo',
    fillClass: 'progress-bar__fill--disinfo',
    label: 'PROBABLE DESINFORMACIÓN'
  }
};

function renderVerdict(result) {
  const badge = document.getElementById('verdict-badge');
  const scoreNum = document.getElementById('verdict-score-num');
  const progressFill = document.getElementById('progress-fill');
  
  if (!badge || !scoreNum || !progressFill) return;

  const config = VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG['CONFIABLE'];
  
  badge.className = `badge ${config.badgeClass}`;
  badge.textContent = config.label;
  
  scoreNum.className = `verdict-score__num ${config.scoreClass}`;
  progressFill.className = `progress-bar__fill ${config.fillClass}`;
  
  progressFill.style.width = `${result.score}%`;
  animateNumber(scoreNum, 0, result.score, 1000);
}

function renderExplanation(result) {
  const el = document.getElementById('explanation-text');
  if (el) el.innerHTML = result.explanation;
}

function renderFragments(result) {
  const container = document.getElementById('fragments-tags');
  if (!container) return;
  
  const iconMap = {
    'Fuente verificada': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    'Dato contrastado': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`
  };
  const defaultIcon = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  container.innerHTML = result.fragments.map(frag => `
    <span class="tag tag--${frag.status}" style="padding: 6px 12px; font-size: 13px;">
      ${iconMap[frag.text] || defaultIcon}
      ${frag.text}
    </span>
  `).join('');
}

function initButtons(result) {
  const btnNew = document.getElementById('btn-nueva-consulta');
  const btnShare = document.getElementById('btn-share');
  const btnSave = document.getElementById('btn-save');
  const textarea = document.getElementById('main-textarea');

  if (btnNew) {
    btnNew.addEventListener('click', () => {
      if (document.getElementById('state-input')) {
        if (textarea) {
          textarea.value = '';
          textarea.dispatchEvent(new Event('input'));
        }
        showState('state-input');
      } else {
        window.location.href = '/';
      }
    });
  }

  if (btnShare) {
    btnShare.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({
          title: 'Verificación DenoFA',
          text: `Veredicto: ${result.verdict} (${result.score}/100)`,
          url: window.location.href
        }).catch(console.error);
      } else {
        navigator.clipboard.writeText(window.location.href)
          .then(() => alert('Enlace copiado al portapapeles'))
          .catch(console.error);
      }
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      saveToHistory(result);
      alert('Resultado guardado en el historial');
    });
  }

  const btnDetalle = document.getElementById('btn-ver-detalle');
  if (btnDetalle) {
    btnDetalle.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.setItem('currentAnalysisId', result.id);
      sessionStorage.setItem('returnUrl', window.location.pathname);
      window.location.href = '/detalle/';
    });
  }
}

export function renderResult() {
  const res = MOCK_RESULT;
  renderVerdict(res);
  renderExplanation(res);
  renderFragments(res);
  initButtons(res);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('verdict-badge') && !document.getElementById('state-result')) {

    
    renderResult();
  }
});
