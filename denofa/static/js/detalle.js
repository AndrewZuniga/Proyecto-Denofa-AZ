import { NAVBAR_HTML, FOOTER_HTML } from './utils.js';

function initNavAndFooter() {
  const navbarContainer = document.getElementById('navbar-placeholder');
  const footerContainer = document.getElementById('footer-placeholder');
  if (navbarContainer) navbarContainer.innerHTML = NAVBAR_HTML('');
  if (footerContainer) footerContainer.innerHTML = FOOTER_HTML;
}

document.addEventListener('DOMContentLoaded', () => {
  initNavAndFooter();
  
  const buttons = document.querySelectorAll('.btn');
  buttons.forEach(btn => {
    if (btn.textContent.trim().includes('Nueva consulta')) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/';
      });
    }
    if (btn.textContent.trim() === 'Volver') {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const returnUrl = sessionStorage.getItem('returnUrl');
        if (returnUrl === '/historial/') {
          window.location.href = '/historial/';
        } else {
          window.location.href = '/resultado/';
        }
      });
    }
  });
});
