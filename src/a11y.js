/* ============================================================
   DAX — tiny a11y helper
   Announce a message to screen readers via the persistent
   #sr-status live region (which lives outside #view, so a
   view repaint never destroys it). Empty-then-rAF-then-text
   so identical repeat messages still re-fire.
   ============================================================ */
export function announce(msg) {
  const el = document.getElementById('sr-status');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = msg; });
}
