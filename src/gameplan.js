/* ============================================================
   DAX — protein game plan (implementation intentions)
   "If X, then Y" beats willpower. Strongest behaviour-change
   evidence there is. He picks the if-thens he'll actually follow;
   DAX holds him to them (and later, reminders fire off them).
   ============================================================ */
import { db } from './store.js';

export const PLAN_PRESETS = [
  { id: 'coffee', text: 'After my morning coffee, I drink my protein shake.' },
  { id: 'lunch', text: 'When I sit down for lunch, protein goes on the plate first.' },
  { id: 'posttrain', text: 'After I train, I eat a full dinner within two hours.' },
  { id: 'snack', text: 'When I snack, I pair it with something protein.' },
  { id: 'fridge', text: 'When I open the fridge bored, I grab a yoghurt or eggs.' },
];

export async function getGamePlan() {
  return (await db.get('gameplan', [])) || []; // array of preset ids he committed to
}
export async function toggleGamePlan(id) {
  const cur = await getGamePlan();
  const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
  await db.set('gameplan', next);
  return next;
}
export function planText(id) {
  const p = PLAN_PRESETS.find(x => x.id === id);
  return p ? p.text : '';
}

export async function openGamePlan(triggerBtn, onDone) {
  const selected = new Set(await getGamePlan());
  const prevFocus = triggerBtn || document.activeElement;

  const o = document.createElement('div');
  o.id = 'gameplan';
  o.className = 'overlay-sheet';
  o.setAttribute('role', 'dialog');
  o.setAttribute('aria-modal', 'true');
  o.setAttribute('aria-labelledby', 'gp-title');
  o.innerHTML = `
    <div class="sheet-inner">
      <button class="back-btn" id="gp-close">‹ Close</button>
      <div class="eyebrow">Beats willpower</div>
      <h1 class="screen-title" id="gp-title">Protein game plan</h1>
      <p class="lead">Pick the if-then plans you’ll actually follow. A plan beats willpower, and DAX will hold you to it.</p>
      <div class="gp-list">
        ${PLAN_PRESETS.map(p => {
          const on = selected.has(p.id);
          return `<button type="button" class="gp-item ${on ? 'on' : ''}" data-id="${p.id}" aria-pressed="${on}">
            <span class="gp-check" aria-hidden="true"></span>
            <span class="gp-text">${p.text}</span>
          </button>`;
        }).join('')}
      </div>
      <button class="btn" id="gp-done">Done</button>
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

  o.querySelectorAll('.gp-item').forEach(btn => btn.addEventListener('click', async () => {
    const next = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(next)); // single source of truth, kept in lockstep
    btn.classList.toggle('on', next);
    await toggleGamePlan(btn.dataset.id);
  }));
  o.querySelector('#gp-close').addEventListener('click', close);
  o.querySelector('#gp-done').addEventListener('click', close);
  o.querySelector('#gp-close').focus();
}
