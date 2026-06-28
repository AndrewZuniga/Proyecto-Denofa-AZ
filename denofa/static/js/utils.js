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
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'justo ahora';
  if (diffMins < 60) return `hace ${diffMins} minuto${diffMins === 1 ? '' : 's'}`;
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours === 1 ? '' : 's'}`;
  if (diffDays < 7) return `hace ${diffDays} día${diffDays === 1 ? '' : 's'}`;
  return date.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
}
