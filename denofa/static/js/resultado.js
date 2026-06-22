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

// Los segmentos de colores están fijos bajo la máscara en el HTML


function buildTicks() {
  const g = document.getElementById('gauge-ticks');
  if (!g || g.childElementCount > 0) return; // construir solo una vez

  const cx = 130, cy = 130, R = 110;
  const mainVals = [0, 100];

  mainVals.forEach(val => {
    // ángulo: −180° (izquierda, val=0) → 0° (derecha, val=100)
    const angleDeg = -180 + (val / 100) * 180;
    const angleRad = (angleDeg * Math.PI) / 180;

    const labelR = R - 24; // Un poco por dentro
    const lx = cx + labelR * Math.cos(angleRad);
    const ly = cy + labelR * Math.sin(angleRad);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', lx.toFixed(2));
    text.setAttribute('y', ly.toFixed(2));
    text.setAttribute('text-anchor', val === 0 ? 'start' : 'end');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '14');
    text.setAttribute('fill', 'var(--color-text-faint)');
    text.setAttribute('font-family', 'Inter, sans-serif');
    text.setAttribute('font-weight', '600');
    text.textContent = val;
    g.appendChild(text);
  });
}

/**
 * Anima el gauge (arco y aguja) al mismo tiempo en el mismo bucle para sincronía perfecta.
 * @param {number} score      – valor final 0-100
 * @param {number} durationMs – duración de la animación
 */
function animateGauge(score, durationMs = 1200) {
  const maskArc = document.getElementById('gauge-mask-arc');
  const needleGroup = document.getElementById('gauge-needle-group');

  if (!maskArc || !needleGroup) return;

  // Iniciar en 0 de forma explícita
  maskArc.style.transition = 'none';
  needleGroup.style.transition = 'none';
  needleGroup.style.transformOrigin = '130px 130px';
  
  maskArc.setAttribute('stroke-dasharray', `0 ${ARC_TOTAL}`);
  needleGroup.style.transform = 'rotate(0deg)';

  // Forzar reflow
  void maskArc.getBoundingClientRect();

  const targetAngle = (score / 100) * 180;
  const targetFilled = (score / 100) * ARC_TOTAL;

  // Pequeño delay para que el navegador procese el estado 0 inicial antes de animar
  setTimeout(() => {
    // Restaurar transiciones CSS fluidas
    maskArc.style.transition = `stroke-dasharray ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    needleGroup.style.transition = `transform ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    needleGroup.style.transformOrigin = '130px 130px';

    // Aplicar valores finales; el navegador interpola de forma acelerada por GPU
    needleGroup.style.transform = `rotate(${targetAngle}deg)`;
    maskArc.setAttribute('stroke-dasharray', `${targetFilled} ${ARC_TOTAL}`);
  }, 50);

  // ── Número animado ─────────────────────────────────────────
  const scoreNum = document.getElementById('gauge-score-num');
  if (scoreNum) {
    setTimeout(() => animateNumber(scoreNum, 0, score, durationMs), 60);
  }
}

function renderVerdict(result) {
  const badge    = document.getElementById('verdict-badge');

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
  const scoreNum = document.getElementById('gauge-score-num');
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

function renderSummary(result) {
  const container = document.getElementById('summary-percentages');
  if (!container) return;

  const score = result.score || 0;
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

  container.innerHTML = `
    <span style="color: var(--color-reliable);">• ${reliablePct}% veracidad</span>
    <span style="color: var(--color-text-faint);">·</span>
    <span style="color: var(--color-dubious);">• ${dubiousPct}% dudoso</span>
    <span style="color: var(--color-text-faint);">·</span>
    <span style="color: var(--color-disinfo);">• ${disinfoPct}% falso</span>
  `;
}

function renderFragments(result) {
  const container = document.getElementById('fragments-tags');
  if (!container) return;

  let reliable = 0, dubious = 0, disinfo = 0;

  if (result.fragments && result.fragments.length > 0) {
    result.fragments.forEach(frag => {
      if (frag.status === 'reliable') reliable++;
      else if (frag.status === 'dubious') dubious++;
      else if (frag.status === 'disinfo') disinfo++;
    });
  }

  // Siempre mostrar las 3 filas, con opacidad reducida si es 0
  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(34, 197, 94, ${reliable > 0 ? '0.1' : '0.05'}); border-radius: 8px; border-left: 4px solid var(--color-reliable); ${reliable === 0 ? 'opacity: 0.5;' : ''}">
      <span style="font-weight: 500; color: var(--color-text);">Fragmentos veraces</span>
      <span style="font-weight: 700; color: var(--color-reliable); font-size: 16px;">${reliable}</span>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(234, 179, 8, ${dubious > 0 ? '0.1' : '0.05'}); border-radius: 8px; border-left: 4px solid var(--color-dubious); ${dubious === 0 ? 'opacity: 0.5;' : ''}">
      <span style="font-weight: 500; color: var(--color-text);">Fragmentos sospechosos</span>
      <span style="font-weight: 700; color: var(--color-dubious); font-size: 16px;">${dubious}</span>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(239, 68, 68, ${disinfo > 0 ? '0.1' : '0.05'}); border-radius: 8px; border-left: 4px solid var(--color-disinfo); ${disinfo === 0 ? 'opacity: 0.5;' : ''}">
      <span style="font-weight: 500; color: var(--color-text);">Fragmentos falsos</span>
      <span style="font-weight: 700; color: var(--color-disinfo); font-size: 16px;">${disinfo}</span>
    </div>
  `;
}

let latestResult = null;
let buttonsInitialized = false;

function initButtons() {
  if (buttonsInitialized) return;
  buttonsInitialized = true;

  const btnNew    = document.getElementById('btn-nueva-consulta');
  const btnDetalle = document.getElementById('btn-ver-detalle');
  const btnSave   = document.getElementById('btn-save');
  const textarea  = document.getElementById('main-textarea');

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

  if (btnDetalle) {
    btnDetalle.addEventListener('click', (e) => {
      e.preventDefault();
      if (!latestResult) return;
      sessionStorage.setItem('currentAnalysisId', latestResult.id);
      sessionStorage.setItem('returnUrl', window.location.pathname);
      window.location.href = `/detalle/${latestResult.id}/`;
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      if (!latestResult || btnSave.disabled) return;

      // Guardar en historial
      saveToHistory(latestResult);

      // Transición visual: verde + ícono check + texto "Guardado" + bloqueado
      btnSave.classList.add('btn--saved');
      btnSave.disabled = true;
      btnSave.style.transition = 'all 0.3s ease';
      btnSave.style.color = 'var(--color-reliable)';
      btnSave.style.borderColor = 'var(--color-reliable)';
      btnSave.style.opacity = '1';
      btnSave.style.cursor = 'default';
      btnSave.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span style="font-size: 14px; font-weight: 500;">Guardado</span>
      `;
    });
  }
}

export function renderResult(result) {
  const res = result || MOCK_RESULT;
  latestResult = res;

  // Mostrar los botones de acción (estaban ocultos en estado inicial)
  const resultActions = document.getElementById('result-actions');
  if (resultActions) {
    resultActions.style.display = 'flex';
  }

  renderVerdict(res);
  renderExplanation(res);
  renderSummary(res);
  renderFragments(res);
  initButtons();
}

document.addEventListener('DOMContentLoaded', () => {
  // En index.html: inicializar tick marks del gauge idle y configurar event listeners de botones
  if (document.getElementById('gauge-column')) {
    buildTicks();
    initButtons();
  }

  // En resultado.html (página standalone, sin left-column de la SPA):
  // verdict-badge existe pero no existe left-column con la lógica SPA
  if (document.getElementById('verdict-badge') && !document.getElementById('left-column')) {
    renderResult();
  }
});
