/**
 * DenoFA – Home / Input State Logic
 */

import { detectContentType } from './utils.js';
import { runSteps } from './loading.js';

/**
 * Coordina la visualización de estados en la nueva estructura de dos columnas.
 */
export function showState(id) {
  const leftCol = document.getElementById('left-column');
  const rightGauge = document.getElementById('state-right-gauge');
  const rightLoading = document.getElementById('state-loading');
  const rightResultContent = document.getElementById('state-result-content');
  
  if (!leftCol) {
    // Fallback para standalone pages que no tienen left-column
    document.querySelectorAll('.state-panel').forEach(panel => panel.classList.remove('state--active'));
    const active = document.getElementById(id);
    if (active) active.classList.add('state--active');
    return;
  }

  if (id === 'state-input') {
    leftCol.classList.remove('left-column--blocked');
    if (rightGauge) rightGauge.style.display = 'flex';
    if (rightLoading) rightLoading.style.display = 'none';
    if (rightResultContent) rightResultContent.style.display = 'flex'; // Mantener visible para estabilidad del layout
    
    // Gauge al estado idle
    const gaugeWrapper = document.getElementById('gauge-wrapper');
    if (gaugeWrapper) {
       gaugeWrapper.classList.add('gauge--idle');
       gaugeWrapper.style.display = 'block';
    }
    const badge = document.getElementById('verdict-badge');
    if (badge) badge.classList.add('gauge-badge--hidden');
    
    const scoreNum = document.getElementById('gauge-score-num');
    if (scoreNum) {
      scoreNum.textContent = '0';
      scoreNum.className = 'gauge-score__num gauge-score__num--idle';
    }
    
    // Reset mask y aguja
    const maskArc = document.getElementById('gauge-mask-arc');
    if (maskArc) {
      maskArc.style.transition = 'none';
      maskArc.setAttribute('stroke-dasharray', `0 345.6`);
    }
    const needleGroup = document.getElementById('gauge-needle-group');
    if (needleGroup) {
      needleGroup.style.transition = 'none';
      needleGroup.setAttribute('transform', 'rotate(0 130 130)');
    }

    // Resetear desglose a 0%
    const summaryContainer = document.getElementById('summary-percentages');
    if (summaryContainer) {
      summaryContainer.innerHTML = `
        <span style="color: var(--color-reliable); opacity: 0.5;">• 0% veracidad</span>
        <span style="color: var(--color-text-faint);">·</span>
        <span style="color: var(--color-dubious); opacity: 0.5;">• 0% dudoso</span>
        <span style="color: var(--color-text-faint);">·</span>
        <span style="color: var(--color-disinfo); opacity: 0.5;">• 0% falso</span>
      `;
    }

    // Resetear fragmentos a 0
    const fragmentsContainer = document.getElementById('fragments-tags');
    if (fragmentsContainer) {
      fragmentsContainer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; background: rgba(34, 197, 94, 0.05); border-radius: 8px; border-left: 4px solid var(--color-reliable); opacity: 0.5;">
          <span style="font-weight: 500; color: var(--color-text-muted);">Fragmentos veraces</span>
          <span style="font-weight: 700; color: var(--color-reliable); font-size: 16px;">0</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; background: rgba(234, 179, 8, 0.05); border-radius: 8px; border-left: 4px solid var(--color-dubious); opacity: 0.5;">
          <span style="font-weight: 500; color: var(--color-text-muted);">Fragmentos sospechosos</span>
          <span style="font-weight: 700; color: var(--color-dubious); font-size: 16px;">0</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; background: rgba(239, 68, 68, 0.05); border-radius: 8px; border-left: 4px solid var(--color-disinfo); opacity: 0.5;">
          <span style="font-weight: 500; color: var(--color-text-muted);">Fragmentos falsos</span>
          <span style="font-weight: 700; color: var(--color-disinfo); font-size: 16px;">0</span>
        </div>
      `;
    }

    // Ocultar botones de acción — solo se muestran cuando hay resultado
    const resultActions = document.getElementById('result-actions');
    if (resultActions) {
      resultActions.style.display = 'none';
    }
  } 
  else if (id === 'state-loading') {
    leftCol.classList.add('left-column--blocked');
    if (rightGauge) rightGauge.style.display = 'none';
    if (rightLoading) rightLoading.style.display = 'flex';
    if (rightResultContent) rightResultContent.style.display = 'none';
  } 
  else if (id === 'state-result') {
    leftCol.classList.add('left-column--blocked');
    if (rightGauge) rightGauge.style.display = 'flex';
    if (rightLoading) rightLoading.style.display = 'none';
    if (rightResultContent) rightResultContent.style.display = 'flex';
    
    const gaugeWrapper = document.getElementById('gauge-wrapper');
    if (gaugeWrapper) gaugeWrapper.style.display = 'block';
  }
}

/**
 * Pone el gauge en estado de carga visual (pulso gris).
 * Ahora ya no hace nada porque el gauge se oculta por completo durante la carga.
 */
export function setGaugeLoading(on) {
  // Ya no se necesita animación de carga en el gauge mismo.
}

function initTextarea() {
  const textarea = document.getElementById('main-textarea');
  const counter = document.getElementById('char-counter');
  const btnAnalyze = document.getElementById('btn-analyze');

  if (!textarea) return;

  textarea.addEventListener('input', () => {
    const val = textarea.value;
    counter.textContent = `${val.length} / 5000`;

    // Resetear el mensaje de validación si estaba en rojo
    const validationMsg = document.getElementById('input-validation-msg');
    if (validationMsg && validationMsg.style.color !== 'var(--color-text-faint)') {
      validationMsg.textContent = "Mínimo 20 caracteres. No se admiten URLs de redes sociales, usa la opción de imagen.";
      validationMsg.style.color = "var(--color-text-faint)";
    }

    if (val.trim().length > 0) {
      textarea.classList.add('textarea--active');
      btnAnalyze.disabled = false;
      btnAnalyze.classList.remove('btn--disabled');
    } else {
      textarea.classList.remove('textarea--active');
      btnAnalyze.disabled = true;
      btnAnalyze.classList.add('btn--disabled');
    }
  });
}

function showImagePreview(file) {
  const textarea = document.getElementById('main-textarea');
  const previewWrap = document.getElementById('image-preview-wrap');
  const previewImg = document.getElementById('image-preview');
  const btnAnalyze = document.getElementById('btn-analyze');

  const reader = new FileReader();
  reader.onload = (event) => {
    previewImg.src = event.target.result;
    previewWrap.style.display = 'block';
    if (textarea) textarea.style.display = 'none';
    btnAnalyze.disabled = false;
    btnAnalyze.classList.remove('btn--disabled');
  };
  reader.readAsDataURL(file);
  window.selectedImageFile = file;
}

function initDragAndDrop() {
  const textarea = document.getElementById('main-textarea');
  const dropZone = document.querySelector('.card');
  if (!textarea || !dropZone) return;

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    textarea.classList.add('textarea--dragover');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    textarea.classList.remove('textarea--dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    textarea.classList.remove('textarea--dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        showImagePreview(file);
      }
    }
  });
}

function initPasteButton() {
  const btn = document.getElementById('btn-paste');
  const textarea = document.getElementById('main-textarea');
  if (!btn || !textarea) return;

  btn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      textarea.value = text;
      textarea.dispatchEvent(new Event('input'));
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  });
}

function initUploadButton() {
  const btn = document.getElementById('btn-upload');
  const input = document.getElementById('file-input');
  const textarea = document.getElementById('main-textarea');
  const previewWrap = document.getElementById('image-preview-wrap');
  const previewImg = document.getElementById('image-preview');
  const btnAnalyze = document.getElementById('btn-analyze');
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    input.click();
  });

  input.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      showImagePreview(e.target.files[0]);
    }
  });

  const btnRemove = document.getElementById('btn-remove-image');
  if (btnRemove) {
    btnRemove.addEventListener('click', () => {
      previewWrap.style.display = 'none';
      previewImg.src = '';
      if (textarea) textarea.style.display = 'block';
      window.selectedImageFile = null;
      input.value = '';
      btnAnalyze.disabled = true;
      btnAnalyze.classList.add('btn--disabled');
    });
  }
}

function initPasteImage() {
  const card = document.querySelector('.card');
  if (!card) return;

  document.addEventListener('paste', (e) => {
    if (!document.getElementById('state-input')?.classList.contains('state--active')) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          showImagePreview(file);
          e.preventDefault();
        }
        break;
      }
    }
  });
}

function initAnalyzeButton() {
  const btn = document.getElementById('btn-analyze');
  const textarea = document.getElementById('main-textarea');
  if (!btn || !textarea) return;

  btn.addEventListener('click', () => {
    if (window.selectedImageFile) {
      btn.disabled = true;
      btn.classList.add('btn--disabled');
      showState('state-loading');
      runSteps('image');
    } else {
      const val = textarea.value.trim();
      const validationMsg = document.getElementById('input-validation-msg');

      if (val.length < 20 && !/^https?:\/\//i.test(val)) {
        if (validationMsg) {
          validationMsg.textContent = "Caracteres insuficientes. Mínimo 20 caracteres.";
          validationMsg.style.color = "var(--color-disinfo)";
        }
        return;
      }

      const socialRegex = /(facebook\.com|twitter\.com|x\.com|instagram\.com|tiktok\.com|youtube\.com|linkedin\.com)/i;
      if (/^https?:\/\//i.test(val) && socialRegex.test(val)) {
        if (validationMsg) {
          validationMsg.textContent = "Formato no válido. No se admiten URLs de redes sociales.";
          validationMsg.style.color = "var(--color-disinfo)";
        }
        return;
      }

      if (validationMsg) {
        validationMsg.textContent = "Mínimo 20 caracteres. No se admiten URLs de redes sociales, usa la opción de imagen.";
        validationMsg.style.color = "var(--color-text-faint)";
      }

      btn.disabled = true;
      btn.classList.add('btn--disabled');
      const type = detectContentType(val);
      showState('state-loading');
      runSteps(type);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // If we are on the main page where state-input exists
  if (document.getElementById('state-input')) {

    initTextarea();
    initDragAndDrop();
    initPasteButton();
    initUploadButton();
    initPasteImage();
    initAnalyzeButton();
    initSubtitleRotator();

    // Construir tick marks del gauge en el estado idle inicial
    if (typeof buildGaugeTicks === 'function') {
      buildGaugeTicks();
    }
  }
});

function initSubtitleRotator() {
  const container = document.getElementById('rotator-text');
  if (!container) return;

  const phrases = [
    "verifica el contenido de una página web",
    "verifica el contenido de una imagen",
    "verifica el contenido de un texto"
  ];
  let index = 0;

  // Set initial text content
  container.textContent = phrases[index];

  // Force reflow and show initial phrase
  void container.offsetWidth;
  container.classList.add('rotator-text--visible');

  setInterval(() => {
    // Phase 1: Slide up and fade out
    container.classList.remove('rotator-text--visible');
    container.classList.add('rotator-text--hidden');

    setTimeout(() => {
      // Phase 2: Update content
      index = (index + 1) % phrases.length;
      container.textContent = phrases[index];

      // Phase 3: Position below without animation
      container.style.transition = 'none';
      container.classList.remove('rotator-text--hidden');
      void container.offsetWidth; // force layout calculation

      // Phase 4: Slide up and fade in
      container.style.transition = '';
      container.classList.add('rotator-text--visible');
    }, 400); // Wait for transition duration
  }, 3000);
}
