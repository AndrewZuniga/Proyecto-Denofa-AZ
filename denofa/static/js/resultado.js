/**
 * DenoFA – Result State Logic
 * Incluye el gauge/velocímetro semicircular con animación de arco y aguja.
 */

import { animateNumber, saveToHistory } from './utils.js';
import { showState } from './home.js';



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
const ARC_TOTAL = 345.6;   // longitud total del semicírculo (π × 110)
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
function animateGauge(score) {
  const maskArc = document.getElementById('gauge-mask-arc');
  const needleGroup = document.getElementById('gauge-needle-group');
  const scoreNum = document.getElementById('gauge-score-num');

  if (!maskArc || !needleGroup) return;

  const targetAngle = (score / 100) * 180;
  const targetFilled = (score / 100) * ARC_TOTAL;

  // Aplicar valores inmediatamente sin animación de 0
  maskArc.style.transition = 'none';
  needleGroup.style.transition = 'none';
  needleGroup.style.transformOrigin = '130px 130px';

  needleGroup.style.transform = `rotate(${targetAngle}deg)`;
  maskArc.setAttribute('stroke-dasharray', `${targetFilled} ${ARC_TOTAL}`);

  if (scoreNum) {
    scoreNum.textContent = score;
  }
}

function renderVerdict(result) {
  const badge = document.getElementById('verdict-badge');

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

  // Mostrar score de inmediato
  animateGauge(result.score);
}

function renderExplanation(result) {
  const el = document.getElementById('explanation-text');
  if (el) el.innerHTML = result.explanation;
}

function renderSummary(result) {
  const container = document.getElementById('summary-percentages');
  if (!container) return;

  let reliableCount = 0;
  let dubiousCount = 0;
  let disinfoCount = 0;

  if (result.snippets && result.snippets.length > 0) {
    result.snippets.forEach(frag => {
      if (frag.status === 'reliable') reliableCount++;
      else if (frag.status === 'dubious') dubiousCount++;
      else if (frag.status === 'disinfo') disinfoCount++;
    });
  }

  const total = reliableCount + dubiousCount + disinfoCount;

  let reliablePct = 0, dubiousPct = 0, disinfoPct = 0;

  if (total > 0) {
    reliablePct = Math.round((reliableCount / total) * 100);
    dubiousPct = Math.round((dubiousCount / total) * 100);
    disinfoPct = Math.round((disinfoCount / total) * 100);
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

  if (result.snippets && result.snippets.length > 0) {
    result.snippets.forEach(frag => {
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

  const btnNew = document.getElementById('btn-nueva-consulta');
  const btnDetalle = document.getElementById('btn-ver-detalle');
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
  if (!result) {
    const explanationText = document.getElementById('explanation-text');
    if (explanationText) {
      explanationText.innerHTML = '<span class="error-text" style="color:var(--color-disinfo); font-weight:var(--font-weight-bold);">Error: No se recibieron datos válidos del análisis.</span>';
    }
    return;
  }
  latestResult = result;

  // Mostrar los botones de acción
  const resultActions = document.getElementById('result-actions');
  if (resultActions) {
    resultActions.style.display = 'flex';
  }

  renderVerdict(result);
  renderExplanation(result);
  renderSummary(result);
  renderFragments(result);
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
