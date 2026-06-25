/* ============================================================
   DAX — My Why (the manifesto)
   The reasons that outlast motivation. Revisitable, calm,
   reflective — this is the Oracle side of the coach, not the
   Sergeant. Open it on the days the mirror isn't enough.
   ============================================================ */
import { WHY } from './data.js';

export function openWhy(triggerBtn, onDone) {
  const prevFocus = triggerBtn || document.activeElement;

  const o = document.createElement('div');
  o.id = 'why';
  o.className = 'overlay-sheet';
  o.setAttribute('role', 'dialog');
  o.setAttribute('aria-modal', 'true');
  o.setAttribute('aria-labelledby', 'why-title');
  o.innerHTML = `
    <div class="sheet-inner">
      <button class="back-btn" id="why-close">‹ Close</button>
      <div class="eyebrow">Beyond the mirror</div>
      <h1 class="screen-title" id="why-title">My Why</h1>
      <p class="lead">Aesthetics gets you in the door. This is the prize, and the reason worth showing up for on the days you can't be bothered.</p>
      <div class="why-list">
        ${WHY.map(w => `
          <div class="why-item">
            <div class="why-head">${w.head}</div>
            <div class="why-text">${w.text}</div>
          </div>`).join('')}
      </div>
      <button class="btn" id="why-done">Hold the line <span aria-hidden="true">🛡️</span></button>
    </div>`;
  document.body.appendChild(o);
  requestAnimationFrame(() => o.classList.add('show'));

  function close() {
    document.removeEventListener('keydown', onKey);
    o.classList.remove('show');
    setTimeout(() => o.remove(), 250);
    if (prevFocus && prevFocus.focus) prevFocus.focus();
    if (onDone) onDone();
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);

  o.querySelector('#why-close').addEventListener('click', close);
  o.querySelector('#why-done').addEventListener('click', close);
  o.querySelector('#why-close').focus();
}
