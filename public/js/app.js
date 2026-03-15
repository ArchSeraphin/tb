// ─── Barre de progression HTMX ────────────────────────────────────────────
(function () {
  const bar = document.getElementById('htmx-progress');
  if (!bar) return;

  document.addEventListener('htmx:beforeRequest', () => {
    bar.style.width = '0';
    bar.style.opacity = '1';
    requestAnimationFrame(() => { bar.style.width = '66%'; });
  });

  document.addEventListener('htmx:afterRequest', () => {
    bar.style.width = '100%';
    setTimeout(() => { bar.style.opacity = '0'; bar.style.width = '0'; }, 300);
  });
})();

// ─── Suppression inline HTMX : fade-out la ligne avant retrait ────────────
document.addEventListener('htmx:beforeSwap', (e) => {
  if (e.detail.xhr.status === 200 && e.detail.serverResponse === '') {
    const target = e.detail.target;
    target.style.transition = 'opacity 250ms, transform 250ms';
    target.style.opacity = '0';
    target.style.transform = 'translateX(-8px)';
  }
});
