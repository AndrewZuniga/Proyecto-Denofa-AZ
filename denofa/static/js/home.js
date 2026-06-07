/**
 * DenoFA – Home / Input State Logic
 */

import { detectContentType } from './utils.js';
import { runSteps } from './loading.js';

export function showState(id) {
  document.querySelectorAll('.state-panel').forEach(panel => {
    panel.classList.remove('state--active');
  });
  const active = document.getElementById(id);
  if (active) active.classList.add('state--active');
}



function initTextarea() {
  const textarea = document.getElementById('main-textarea');
  const counter = document.getElementById('char-counter');
  const btnAnalyze = document.getElementById('btn-analyze');

  if (!textarea) return;

  textarea.addEventListener('input', (e) => {
    const val = e.target.value;
    counter.textContent = `${val.length} / 5000`;

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

function initDragAndDrop() {
  const textarea = document.getElementById('main-textarea');
  if (!textarea) return;

  textarea.addEventListener('dragover', (e) => {
    e.preventDefault();
    textarea.classList.add('textarea--dragover');
  });

  textarea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    textarea.classList.remove('textarea--dragover');
  });

  textarea.addEventListener('drop', (e) => {
    e.preventDefault();
    textarea.classList.remove('textarea--dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Handle file drop visually
      textarea.value = `[Imagen cargada: ${e.dataTransfer.files[0].name}]`;
      textarea.dispatchEvent(new Event('input'));
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
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    input.click();
  });

  input.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      if (textarea) {
        textarea.value = `[Imagen cargada: ${e.target.files[0].name}]`;
        textarea.dispatchEvent(new Event('input'));
      }
      showState('state-loading');
      runSteps('image');
    }
  });
}

function initAnalyzeButton() {
  const btn = document.getElementById('btn-analyze');
  const textarea = document.getElementById('main-textarea');
  if (!btn || !textarea) return;

  btn.addEventListener('click', () => {
    const type = detectContentType(textarea.value);
    showState('state-loading');
    runSteps(type);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // If we are on the main page where state-input exists
  if (document.getElementById('state-input')) {

    initTextarea();
    initDragAndDrop();
    initPasteButton();
    initUploadButton();
    initAnalyzeButton();
    initSubtitleRotator();
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
