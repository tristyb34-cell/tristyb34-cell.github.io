/* ============================================================
   DAX — Gym equipment profile + equipment-aware exercise swapping.
   Tell DAX what your gym has; it flags moves you can't do and
   offers same-muscle swaps filtered to your equipment.
   ============================================================ */
import { db } from './store.js';
import { LIBRARY, libraryByGroup } from './program.js';
import { getPlan, savePlan } from './plan.js';

// equipment categories that actually appear in the library, friendliest order
export const EQUIPMENT_TYPES = [
  { id: 'body only', label: 'Bodyweight', always: true },
  { id: 'dumbbell', label: 'Dumbbells' },
  { id: 'barbell', label: 'Barbell' },
  { id: 'e-z curl bar', label: 'EZ curl bar' },
  { id: 'cable', label: 'Cable machine' },
  { id: 'machine', label: 'Weight machines' },
  { id: 'bands', label: 'Resistance bands' },
  { id: 'kettlebells', label: 'Kettlebells' },
];
const ALL_IDS = EQUIPMENT_TYPES.map(e => e.id);

// { set: Set<equipmentId>, configured: bool }. Unconfigured = everything available (nothing flagged yet).
export async function getGym() {
  const stored = await db.get('gymEquipment', null);
  if (!stored || !stored.length) return { set: new Set(ALL_IDS), configured: false };
  const set = new Set(stored);
  set.add('body only'); // can't take your body away from you
  return { set, configured: true };
}

export async function saveGym(list) {
  const clean = Array.from(new Set([...list, 'body only']));
  await db.set('gymEquipment', clean);
}

export function hasEquipment(ex, gym) {
  if (!ex) return true;
  if (ex.equipment === 'body only') return true;
  return gym.set.has(ex.equipment);
}

// returns true only when the gym is configured AND the move needs missing kit
export function isMissing(ex, gym) {
  return gym.configured && !hasEquipment(ex, gym);
}

// same-muscle-group alternatives, best matches first (available > same muscle > name)
export function swapCandidates(currentId, gym) {
  const cur = LIBRARY[currentId];
  if (!cur) return [];
  const pool = (libraryByGroup()[cur.group] || []).filter(x => x.id !== currentId);
  return pool.sort((a, b) => {
    const aOk = hasEquipment(a, gym), bOk = hasEquipment(b, gym);
    if (aOk !== bOk) return aOk ? -1 : 1;
    const aMus = a.muscle === cur.muscle, bMus = b.muscle === cur.muscle;
    if (aMus !== bMus) return aMus ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/* ---------- gym equipment setup overlay ---------- */
export async function openGymSetup(onDone) {
  const gym = await getGym();
  const overlay = document.createElement('div');
  overlay.id = 'picker';
  overlay.innerHTML = `
    <div class="picker-head">
      <strong style="font-size:16px;">My gym equipment</strong>
      <button id="gym-close">Done</button>
    </div>
    <div class="picker-body" style="padding:14px 16px;">
      <p class="lead" style="margin-bottom:14px;">Tick what your gym has. DAX flags any move you can’t do and filters swaps to your kit.</p>
      ${EQUIPMENT_TYPES.map(e => `
        <label class="gym-row">
          <input type="checkbox" data-eq="${e.id}" ${e.always ? 'checked disabled' : (gym.set.has(e.id) ? 'checked' : '')} />
          <span>${e.label}${e.always ? ' <em style="opacity:.5;">(always on)</em>' : ''}</span>
        </label>`).join('')}
      <p class="coach-last" style="margin-top:14px;">Not sure on a specific machine? Leave “Weight machines” on, then swap the few exercises your gym is missing one by one.</p>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  const close = async () => {
    const picked = Array.from(overlay.querySelectorAll('input[data-eq]:checked')).map(c => c.dataset.eq);
    await saveGym(picked);
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 200);
    if (onDone) onDone();
  };
  overlay.querySelector('#gym-close').addEventListener('click', close);
}

/* ---------- equipment-aware swap picker ----------
   Swaps plan[day(dow)].items[idx] for a same-group alternative.
   Persists to the on-device plan, then calls onDone(). */
export async function openSwapPicker(dow, idx, onDone) {
  const plan = await getPlan();
  const day = plan.find(d => d.dow === dow);
  if (!day || !day.items[idx]) { if (onDone) onDone(); return; }
  const item = day.items[idx];
  const cur = LIBRARY[item.id];
  let gym = await getGym();
  let showAll = !gym.configured; // if they haven't set a gym, show everything

  const overlay = document.createElement('div');
  overlay.id = 'picker';
  overlay.innerHTML = `
    <div class="picker-head">
      <strong style="font-size:16px;">Swap exercise</strong>
      <button id="swap-close">Close</button>
    </div>
    <div class="picker-body" id="swap-body"></div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 200); };
  overlay.querySelector('#swap-close').addEventListener('click', close);
  const body = overlay.querySelector('#swap-body');

  const draw = () => {
    const all = swapCandidates(item.id, gym);
    const list = showAll ? all : all.filter(x => hasEquipment(x, gym));
    body.innerHTML = `
      <p class="lead" style="margin:4px 0 10px;">Replace <strong>${cur ? cur.name : item.id}</strong> with another ${cur ? cur.group.toLowerCase() : ''} move${gym.configured && !showAll ? ' your gym has' : ''}.</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
        <button class="pill ${showAll ? '' : 'accent'}" id="toggle-all">${showAll ? 'Showing all' : 'Gym only'}</button>
        <button class="pill" id="gym-setup">⚙ My gym</button>
      </div>
      <div class="pick-group">${list.map(swapRow).join('') || '<p class="lead" style="padding:8px 0;">No matches with that filter. Tap “Showing all”.</p>'}</div>`;
    body.querySelector('#toggle-all').addEventListener('click', () => { showAll = !showAll; draw(); });
    body.querySelector('#gym-setup').addEventListener('click', () => openGymSetup(async () => { gym = await getGym(); showAll = !gym.configured; draw(); }));
    body.querySelectorAll('.pick-row').forEach(r => r.addEventListener('click', async () => {
      day.items[idx] = { ...item, id: r.dataset.id };
      await savePlan(plan);
      close();
      if (onDone) onDone();
    }));
  };

  function swapRow(ex) {
    const ok = hasEquipment(ex, gym);
    return `<button class="pick-row" data-id="${ex.id}">
      <img class="ex-thumb sm" src="${ex.frames[0]}" alt="" loading="lazy" />
      <div class="ex-meta"><div class="ex-name">${ex.name}</div>
        <div class="ex-sub">${ex.equipment} · ${ex.muscle}${ok ? '' : ' · <span class="eq-flag">not in your gym</span>'}</div></div>
    </button>`;
  }

  draw();
}
