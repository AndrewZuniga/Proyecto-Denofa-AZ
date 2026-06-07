/**
 * DenoFA – Loading State Logic
 */


import { showState } from './home.js';
// We must dynamically import renderResult to avoid circular deps if needed, 
// or just call showState('state-result') and a global renderResult.
import { renderResult } from './resultado.js';

const STEPS = {
  text: [
    "Analizando el contenido...",
    "Verificando fuentes...",
    "Calculando credibilidad..."
  ],
  url: [
    "Accediendo al artículo...",
    "Extrayendo el contenido...",
    "Verificando fuentes...",
    "Calculando credibilidad..."
  ],
  image: [
    "Leyendo la imagen...",
    "Reconociendo el texto...",
    "Verificando fuentes...",
    "Calculando credibilidad..."
  ]
};

export function getPageType() {
  const url = window.location.href;
  if (url.includes('loading-url')) return 'url';
  if (url.includes('loading-image')) return 'image';
  return 'text';
}

function renderSteps(stepsList) {
  const listEl = document.getElementById('steps-list');
  if (!listEl) return;
  listEl.innerHTML = stepsList.map((step, i) => `
    <li class="step-item" id="step-${i}">
      <span class="step-icon" style="min-width: 20px;">○</span>
      <span>${step}</span>
    </li>
  `).join('');
}

function markStepActive(i) {
  const el = document.getElementById(`step-${i}`);
  if (!el) return;
  el.classList.add('step-item--active');
  const icon = el.querySelector('.step-icon');
  if (icon) icon.innerHTML = `<span class="spinner" style="width:14px; height:14px; border-width:2px; display:inline-block;"></span>`;
}

function markStepDone(i) {
  const el = document.getElementById(`step-${i}`);
  if (!el) return;
  el.classList.remove('step-item--active');
  el.classList.add('step-item--done');
  const icon = el.querySelector('.step-icon');
  if (icon) {
    icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
}

export function runSteps(type) {
  const defaultAnim = document.getElementById('loading-default');
  const imageAnim = document.getElementById('loading-image-anim');
  const textAnim = document.getElementById('loading-text-anim');
  const urlAnim = document.getElementById('loading-url-anim');

  if (defaultAnim) defaultAnim.style.display = 'none';
  if (imageAnim) imageAnim.style.display = 'none';
  if (textAnim) textAnim.style.display = 'none';
  if (urlAnim) urlAnim.style.display = 'none';

  if (type === 'image') {
    if (imageAnim) imageAnim.style.display = 'block';

    const params = new URLSearchParams(window.location.search);
    const file = params.get('file');
    const imgEl = document.getElementById('scan-image');
    if (file && imgEl) {
      imgEl.src = file;
    }
  } else if (type === 'text') {
    if (textAnim) textAnim.style.display = 'block';
  } else if (type === 'url') {
    if (urlAnim) urlAnim.style.display = 'block';
  } else {
    if (defaultAnim) defaultAnim.style.display = 'flex';
  }

  const steps = STEPS[type] || STEPS['text'];
  renderSteps(steps);

  let currentStep = 0;

  function nextStep() {
    if (currentStep > 0) {
      markStepDone(currentStep - 1);
    }

    if (currentStep < steps.length) {
      markStepActive(currentStep);
      let delay = Math.random() * 800 + 400; // 400ms to 1200ms default
      if (type === 'image') {
        delay = 1000; // Exact 4 seconds total (4 steps * 1000ms)
      }
      currentStep++;
      setTimeout(nextStep, delay);
    } else {
      // Done
      setTimeout(() => {
        // If SPA mode
        if (document.getElementById('state-result')) {
          showState('state-result');
          renderResult();
        } else {
          // Fallback if individual page
          window.location.href = '/resultado/';
        }
      }, 600);
    }
  }

  // start
  nextStep();
}



document.addEventListener('DOMContentLoaded', () => {

  
  // If it's the standalone loading page, inject navbar/footer and run steps automatically
  if (document.getElementById('steps-list') && !document.getElementById('state-loading')) {
    runSteps(getPageType());
  }
});
