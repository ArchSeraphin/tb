// app.js — Scripts globaux Voilà Voilà Tools

// HTMX : supprimer les lignes avec animation après suppression réussie
document.addEventListener('htmx:afterSwap', (e) => {
  if (e.detail.target && e.detail.target.innerHTML === '') {
    e.detail.target.style.transition = 'opacity 300ms, transform 300ms';
    e.detail.target.style.opacity = '0';
    e.detail.target.style.transform = 'translateX(-10px)';
    setTimeout(() => e.detail.target.remove(), 300);
  }
});

// Initialiser les tooltips simples (title attribute)
document.addEventListener('DOMContentLoaded', () => {
  // Auto-hide flash messages qui ne sont pas gérés par Alpine
  document.querySelectorAll('[data-flash-autohide]').forEach(el => {
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 300ms';
      setTimeout(() => el.remove(), 300);
    }, 5000);
  });
});
