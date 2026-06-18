/* ============================================================
   DAX — Light plan editor (Phase 1.5)
   Edit sets/reps/rest, swap/add/remove exercises, reorder,
   add/remove days. All offline, saved to the device.
   ============================================================ */
import { LIBRARY, GROUPS, libraryByGroup, newSlot } from './program.js';
import { getPlan, savePlan, resetPlan } from './plan.js';

const DOW_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DOW_FULL = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

let E = null; // { root, plan }

export async function openEditor(root) {
  const plan = await getPlan();
  E = { root, plan };
  render();
}

const save = () => savePlan(E.plan);

function render() {
  E.plan.sort((a, b) => DOW_ORDER.indexOf(a.dow) - DOW_ORDER.indexOf(b.dow));
  const usedDows = E.plan.map(d => d.dow);
  const freeDows = DOW_ORDER.filter(d => !usedDows.includes(d));

  E.root.innerHTML = `
    <button class="back-btn" id="back">‹ Back to Today</button>
    <h1 class="screen-title">Edit my plan</h1>
    <p class="lead">Tap any number to change it. Swap, add, reorder, all saved on your phone.</p>

    ${E.plan.map((day, di) => `
      <div class="card edit-day">
        <div class="edit-day-head">
          <input class="day-title" data-day="${di}" value="${escapeAttr(day.title)}" />
          <span class="pill">${day.dow}</span>
        </div>

        ${day.items.map((it, ii) => {
          const ex = LIBRARY[it.id];
          return `
            <div class="edit-item">
              <img class="ex-thumb sm" src="${ex ? ex.frames[0] : ''}" alt="" loading="lazy" />
              <div class="edit-item-main">
                <div class="ex-name">${ex ? ex.name : it.id}</div>
                <div class="edit-fields">
                  <label>sets<input class="inp xs" data-edit="sets" data-day="${di}" data-item="${ii}" type="number" inputmode="numeric" value="${it.sets}" /></label>
                  <label>reps<input class="inp xs wide" data-edit="reps" data-day="${di}" data-item="${ii}" value="${escapeAttr(it.reps)}" /></label>
                  <label>rest<input class="inp xs" data-edit="rest" data-day="${di}" data-item="${ii}" type="number" inputmode="numeric" value="${it.rest}" /></label>
                </div>
              </div>
              <div class="edit-item-btns">
                <button data-act="up" data-day="${di}" data-item="${ii}">↑</button>
                <button data-act="down" data-day="${di}" data-item="${ii}">↓</button>
                <button data-act="swap" data-day="${di}" data-item="${ii}">⇄</button>
                <button data-act="remove" data-day="${di}" data-item="${ii}" class="danger">✕</button>
              </div>
            </div>`;
        }).join('')}

        <div class="edit-day-actions">
          <button class="btn ghost sm" data-act="add" data-day="${di}">+ Add exercise</button>
          <button class="btn ghost sm danger-outline" data-act="rmday" data-day="${di}">Remove day</button>
        </div>
      </div>
    `).join('')}

    ${freeDows.length ? `
      <div class="section-label">Add a training day</div>
      <div class="add-day-row">
        ${freeDows.map(d => `<button class="pill add-dow" data-dow="${d}">+ ${d}</button>`).join('')}
      </div>` : ''}

    <div style="height:18px;"></div>
    <button class="btn ghost danger-outline" id="reset">↺ Reset to the original plan</button>
  `;

  wire();
}

function wire() {
  const root = E.root;
  root.querySelector('#back').addEventListener('click', () =>
    import('./views/today.js').then(m => m.mountToday(root)));

  root.querySelector('#reset').addEventListener('click', async () => {
    if (!confirm('Reset to the original DAX plan? Your edits will be lost (your logged history stays).')) return;
    E.plan = await resetPlan();
    render();
  });

  // day title
  root.querySelectorAll('.day-title').forEach(inp => inp.addEventListener('change', () => {
    E.plan[+inp.dataset.day].title = inp.value.trim() || 'Workout';
    save();
  }));

  // inline sets/reps/rest
  root.querySelectorAll('[data-edit]').forEach(inp => inp.addEventListener('change', () => {
    const it = E.plan[+inp.dataset.day].items[+inp.dataset.item];
    const f = inp.dataset.edit;
    if (f === 'reps') it.reps = inp.value.trim() || '10';
    else it[f] = Math.max(1, parseInt(inp.value, 10) || 1);
    save();
  }));

  // item actions
  root.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => act(btn)));

  // add a day
  root.querySelectorAll('.add-dow').forEach(btn => btn.addEventListener('click', () => {
    E.plan.push({ dow: btn.dataset.dow, title: `${DOW_FULL[btn.dataset.dow]} workout`, items: [] });
    save(); render();
  }));
}

function act(btn) {
  const di = +btn.dataset.day;
  const ii = btn.dataset.item != null ? +btn.dataset.item : null;
  const day = E.plan[di];
  const a = btn.dataset.act;

  if (a === 'up' && ii > 0) { [day.items[ii - 1], day.items[ii]] = [day.items[ii], day.items[ii - 1]]; save(); render(); }
  else if (a === 'down' && ii < day.items.length - 1) { [day.items[ii + 1], day.items[ii]] = [day.items[ii], day.items[ii + 1]]; save(); render(); }
  else if (a === 'remove') { day.items.splice(ii, 1); save(); render(); }
  else if (a === 'rmday') {
    if (confirm(`Remove ${day.title}?`)) { E.plan.splice(di, 1); save(); render(); }
  }
  else if (a === 'add') {
    openPicker((exId) => { day.items.push(newSlot(exId)); save(); render(); });
  }
  else if (a === 'swap') {
    openPicker((exId) => { day.items[ii] = { ...day.items[ii], id: exId }; save(); render(); });
  }
}

/* ---------- exercise library picker ---------- */
function openPicker(onPick) {
  const byGroup = libraryByGroup();
  let overlay = document.createElement('div');
  overlay.id = 'picker';
  overlay.innerHTML = `
    <div class="picker-head">
      <input id="picker-search" placeholder="Search exercises…" />
      <button id="picker-close">Close</button>
    </div>
    <div class="picker-body" id="picker-body">${groupHtml(byGroup, GROUPS)}</div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 200); };
  overlay.querySelector('#picker-close').addEventListener('click', close);

  const body = overlay.querySelector('#picker-body');
  overlay.querySelector('#picker-search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { body.innerHTML = groupHtml(byGroup, GROUPS); bindRows(); return; }
    const hits = Object.values(LIBRARY).filter(x =>
      x.name.toLowerCase().includes(q) || x.muscle.toLowerCase().includes(q) || x.group.toLowerCase().includes(q));
    body.innerHTML = `<div class="pick-group">${hits.map(rowHtml).join('') || '<p class="lead" style="padding:16px;">No matches.</p>'}</div>`;
    bindRows();
  });

  function bindRows() {
    body.querySelectorAll('.pick-row').forEach(r => r.addEventListener('click', () => { onPick(r.dataset.id); close(); }));
  }
  bindRows();
}

function groupHtml(byGroup, groups) {
  return groups.map(g => byGroup[g] && byGroup[g].length
    ? `<div class="section-label">${g}</div><div class="pick-group">${byGroup[g].map(rowHtml).join('')}</div>` : '').join('');
}
function rowHtml(ex) {
  return `<button class="pick-row" data-id="${ex.id}">
    <img class="ex-thumb sm" src="${ex.frames[0]}" alt="" loading="lazy" />
    <div class="ex-meta"><div class="ex-name">${ex.name}</div><div class="ex-sub">${ex.equipment} · ${ex.muscle}</div></div>
  </button>`;
}

function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }
