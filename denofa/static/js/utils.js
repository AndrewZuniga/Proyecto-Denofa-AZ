/**
 * DenoFA – Shared Utilities
 */



export function animateNumber(el, from, to, duration) {
  let start = null;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    // ease-out cubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(easeProgress * (to - from) + from);
    el.textContent = current;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      el.textContent = to;
    }
  };
  window.requestAnimationFrame(step);
}

export function detectContentType(str) {
  if (!str) return 'text';
  if (/^https?:\/\//i.test(str.trim())) return 'url';
  // Check for image object or data url logic could be here
  return 'text';
}

export function formatDate(timestamp) {
  // Simple mock implementation
  return 'hace 2 horas';
}

export function loadHistory() {
  const data = localStorage.getItem('denofaHistory');
  return data ? JSON.parse(data) : [];
}

export function saveToHistory(item) {
  const history = loadHistory();
  history.unshift(item);
  localStorage.setItem('denofaHistory', JSON.stringify(history));
}
