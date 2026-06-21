/**
 * DenoFA – Result State Logic
 * Incluye el gauge/velocímetro semicircular con animación de arco y aguja.
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
    scoreClass: 'gauge-score__num--reliable',
    label: 'CONFIABLE'
  },
  'DUDOSO': {
    badgeClass: 'badge--dubious',
    scoreClass: 'gauge-score__num--dubious',
    label: 'DUDOSO'
  },
  'PROBABLE DESINFORMACIÓN': {
    badgeClass: 'badge--disinfo',
    scoreClass: 'gauge-score__num--disinfo',
    label: 'PROBABLE DESINFORMACIÓN'
  }
};

/* ──────────────────────────────────────────────────────────────
   GAUGE ENGINE
   El viewBox del SVG es 260×145. El arco va de (20,130) a (240,130)
   describiendo un semicírculo con radio 110 y centro en (130,130).
   Longitud total del arco = π × 110 ≈ 345.6 px (usamos 345.6 como total).

   Rangos (% del arco total de 345.6 px):
     Rojo   0–39  → 0 px     a 134.8 px  (39 % de 345.6)
     Ámbar 40–69  → 134.8 px a 238.5 px  (30 % de 345.6)
     Verde 70–100 → 238.5 px a 345.6 px  (31 % de 345.6)

   La aguja gira de −90° (score 0, extremo izquierdo)
                   a +90° (score 100, extremo derecho).
   Fórmula: ángulo = −90 + (score / 100) × 180
────────────────────────────────────────────────────────────── */
const ARC_TOTAL   = 345.6;   // longitud total del semicírculo (π × 110)
const DISINFO_END = 0.39;    // 0–39 ocupa el 39 % del arco
const DUBIOUS_END = 0.69;    // 40–69 llega hasta el 69 % del arco

/**
 * Calcula los parámetros stroke-dasharray de cada segmento para un score dado.
 * @param {number} score – valor 0-100
 * @returns {{ disinfo, dubious, reliable }} con { filled, empty, offset } en px
 */
function calcSegments(score) {
  const filled = (score / 100) * ARC_TOTAL;  // px revelados hasta el score

  const disinfoFill  = Math.min(filled, DISINFO_END * ARC_TOTAL);
  const dubiousFill  = Math.max(0, Math.min(filled, DUBIOUS_END * ARC_TOTAL) - DISINFO_END * ARC_TOTAL);
  const reliableFill = Math.max(0, filled - DUBIOUS_END * ARC_TOTAL);

  return {
    disinfo: {
      filled: disinfoFill,
      empty:  ARC_TOTAL - disinfoFill,
      offset: 0
    },
    dubious: {
      filled: dubiousFill,
      empty:  ARC_TOTAL - dubiousFill,
      offset: -(DISINFO_END * ARC_TOTAL)   // retrocede al inicio del segmento ámbar
    },
    reliable: {
      filled: reliableFill,
      empty:  ARC_TOTAL - reliableFill,
      offset: -(DUBIOUS_END * ARC_TOTAL)   // retrocede al inicio del segmento verde
    }
  };
}

/**
 * Genera los tick marks y etiquetas de escala (0, 20, 40, 60, 80, 100)
 * en el elemento <g id="gauge-ticks"> del SVG.
 */
function buildTicks() {
  const g = document.getElementById('gauge-ticks');
  if (!g || g.childElementCount > 0) return; // construir solo una vez

  const cx = 130, cy = 130, R = 110;
  const allVals  = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const mainVals = new Set([0, 20, 40, 60, 80, 100]);

  allVals.forEach(val => {
    // ángulo: −180° (izquierda, val=0) → 0° (derecha, val=100)
    const angleDeg = -180 + (val / 100) * 180;
    const angleRad = (angleDeg * Math.PI) / 180;

    const isMain = mainVals.has(val);
    const r1 = R - 16;                    // inicio del tick (borde interno del arco)
    const r2 = r1 - (isMain ? 12 : 7);   // final del tick

    const x1 = cx + r1 * Math.cos(angleRad);
    const y1 = cy + r1 * Math.sin(angleRad);
    const x2 = cx + r2 * Math.cos(angleRad);
    const y2 = cy + r2 * Math.sin(angleRad);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1.toFixed(2));
    line.setAttribute('y1', y1.toFixed(2));
    line.setAttribute('x2', x2.toFixed(2));
    line.setAttribute('y2', y2.toFixed(2));
    line.setAttribute('stroke', 'var(--color-border-medium)');
    line.setAttribute('stroke-width', isMain ? '2' : '1.2');
    line.setAttribute('stroke-linecap', 'round');
    g.appendChild(line);

    if (isMain) {
      const labelR = r2 - 11;
      const lx = cx + labelR * Math.cos(angleRad);
      const ly = cy + labelR * Math.sin(angleRad);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', lx.toFixed(2));
      text.setAttribute('y', ly.toFixed(2));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-size', '9');
      text.setAttribute('fill', 'var(--color-text-faint)');
      text.setAttribute('font-family', 'Inter, sans-serif');
      text.textContent = val;
      g.appendChild(text);
    }
  });
}

/**
 * Anima el gauge desde 0 hasta el score final en durationMs.
 * @param {number} score      – valor final 0-100
 * @param {number} durationMs – duración de la animación
 */
function animateGauge(score, durationMs = 1200) {
  const segDisinfo  = document.getElementById('gauge-seg-disinfo');
  const segDubious  = document.getElementById('gauge-seg-dubious');
  const segReliable = document.getElementById('gauge-seg-reliable');
  const needleGroup = document.getElementById('gauge-needle-group');
  const scoreNum    = document.getElementById('gauge-score-num');

  if (!segDisinfo || !segDubious || !segReliable || !needleGroup) return;

  // Iniciar en 0 de forma explícita (sin transición)
  [segDisinfo, segDubious, segReliable].forEach(el => {
    el.style.transition = 'none';
    el.setAttribute('stroke-dasharray', `0 ${ARC_TOTAL}`);
  });
  needleGroup.style.transition = 'none';
  needleGroup.setAttribute('transform', 'translate(130,130) rotate(-90)');

  // Forzar reflow para que el estado inicial sea reconocido por el navegador
  void segDisinfo.getBoundingClientRect();

  // Reactivar transición y animar al estado final
  requestAnimationFrame(() => {
    setTimeout(() => {
      const transitionVal = `stroke-dasharray ${durationMs}ms cubic-bezier(0.4,0,0.2,1)`;
      segDisinfo.style.transition  = transitionVal;
      segDubious.style.transition  = transitionVal;
      segReliable.style.transition = transitionVal;
      needleGroup.style.transition = `transform ${durationMs}ms cubic-bezier(0.4,0,0.2,1)`;

      // ── Arcos ──────────────────────────────────────────────
      const segs = calcSegments(score);

      segDisinfo.setAttribute('stroke-dasharray',  `${segs.disinfo.filled.toFixed(2)} ${segs.disinfo.empty.toFixed(2)}`);
      segDisinfo.setAttribute('stroke-dashoffset', segs.disinfo.offset.toFixed(2));

      segDubious.setAttribute('stroke-dasharray',  `${segs.dubious.filled.toFixed(2)} ${segs.dubious.empty.toFixed(2)}`);
      segDubious.setAttribute('stroke-dashoffset', segs.dubious.offset.toFixed(2));

      segReliable.setAttribute('stroke-dasharray',  `${segs.reliable.filled.toFixed(2)} ${segs.reliable.empty.toFixed(2)}`);
      segReliable.setAttribute('stroke-dashoffset', segs.reliable.offset.toFixed(2));

      // ── Aguja ───────────────────────────────────────────────
      // −90° = izquierda (score 0), +90° = derecha (score 100)
      const targetAngle = -90 + (score / 100) * 180;
      needleGroup.setAttribute('transform', `translate(130,130) rotate(${targetAngle})`);
    }, 60);
  });

  // ── Número animado ─────────────────────────────────────────
  if (scoreNum) {
    setTimeout(() => animateNumber(scoreNum, 0, score, durationMs), 60);
  }
}

function renderVerdict(result) {
  const badge    = document.getElementById('verdict-badge');
  const scoreNum = document.getElementById('gauge-score-num');

  if (!badge) return;

  const config = VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG['CONFIABLE'];

  // ── Activar gauge desde estado idle ──────────────────────
  // (solo aplica cuando está en index.html con gauge-column)
  const gaugeWrapper = document.getElementById('gauge-wrapper');
  if (gaugeWrapper) {
    gaugeWrapper.classList.remove('gauge--idle');
  }

  // Mostrar badge (quitar clase hidden)
  badge.className = `badge ${config.badgeClass}`;
  badge.textContent = config.label;
  badge.classList.remove('gauge-badge--hidden');

  // Quitar clase idle del número y aplicar color del veredicto
  if (scoreNum) {
    scoreNum.classList.remove(
      'gauge-score__num--idle',
      'gauge-score__num--reliable',
      'gauge-score__num--dubious',
      'gauge-score__num--disinfo'
    );
    scoreNum.classList.add(config.scoreClass);
  }

  // Ocultar etiqueta idle
  const idleLabel = document.getElementById('gauge-idle-label');
  if (idleLabel) {
    idleLabel.classList.add('gauge-idle-label--hidden');
  }

  // Construir tick marks (idempotente)
  buildTicks();

  // Animar el gauge
  animateGauge(result.score, 1200);
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
  const btnNew   = document.getElementById('btn-nueva-consulta');
  const btnShare = document.getElementById('btn-share');
  const btnSave  = document.getElementById('btn-save');
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
      window.location.href = `/detalle/${result.id}/`;
    });
  }
}

export function renderResult(result) {
  const res = result || MOCK_RESULT;
  renderVerdict(res);
  renderExplanation(res);
  renderFragments(res);
  initButtons(res);
}

document.addEventListener('DOMContentLoaded', () => {
  // En index.html: inicializar tick marks del gauge idle (gauge-column está siempre visible)
  if (document.getElementById('gauge-column')) {
    buildTicks();
  }

  // En resultado.html (página standalone, sin left-column de la SPA):
  // verdict-badge existe pero no existe left-column con la lógica SPA
  if (document.getElementById('verdict-badge') && !document.getElementById('left-column')) {
    renderResult();
  }
});
