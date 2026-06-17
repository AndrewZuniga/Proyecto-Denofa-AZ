document.addEventListener('DOMContentLoaded', () => {
  
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
