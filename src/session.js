/* ============================================================
   DAX — the workout runner (Phase 1, plan-aware)
   Receives a plan "day": { dow, title, items:[{id,sets,reps,rest}] }
   ============================================================ */
import { LIBRARY } from './program.js';
import { WARMUP, COOLDOWN } from './data.js';
import { startActive, getActive, logSet, finishActive, suggestion } from './workouts.js';

const stretchList = (items) => `<div class="stretch-list">${items.map(s =>
  `<div class="stretch-item"><span class="stretch-dot">›</span><div><div class="nm">${s.name}</div><div class="dt">${s.detail}</div></div><span class="du">${s.dur}</span></div>`).join('')}</div>`;

let S = null;          // { root, day, active }
let frameTimer = null;
let restTimer = null;

function clearTimers() {
  if (frameTimer) { clearInterval(frameTimer); frameTimer = null; }
  if (restTimer) { clearInterval(restTimer); restTimer = null; }
}

export async function renderSession(root, day) {
  clearTimers();
  const active = await startActive(day);
  S = { root, day, active };
  await renderOverview();
}

function setsDone(exId) {
  const arr = (S.active.log[exId] || []).filter(s => s && (s.reps || s.weight));
  return arr.length;
}

async function renderOverview() {
  clearTimers();
  const { day } = S;
  const total = day.items.reduce((n, it) => n + it.sets, 0);
  const done = day.items.reduce((n, it) => n + Math.min(setsDone(it.id), it.sets), 0);
  const pct = total ? Math.round((done / total) * 100) : 0;

  S.root.innerHTML = `
    <div class="eyebrow">${day.dow} • Today’s session</div>
    <h1 class="screen-title">${day.title}</h1>
    <div class="progress-wrap">
      <div class="progress-bar"><span style="width:${pct}%"></span></div>
      <div class="progress-meta">${done}/${total} sets</div>
    </div>

    ${done === 0 ? `
    <details class="card warmup" open>
      <summary><strong>🔥 Warm up first · 5 min</strong></summary>
      ${stretchList(WARMUP)}
      <p class="coach-last">Five years off means lazy tendons. Five minutes here saves a tweaked shoulder.</p>
    </details>` : ''}

    <div class="ex-list">
      ${day.items.map((it, i) => {
        const ex = LIBRARY[it.id];
        if (!ex) return '';
        const sd = setsDone(it.id);
        const complete = sd >= it.sets;
        return `
          <button class="ex-card ${complete ? 'complete' : ''}" data-idx="${i}">
            <img class="ex-thumb" src="${ex.frames[0]}" alt="" loading="lazy" />
            <div class="ex-meta">
              <div class="ex-name">${ex.name}</div>
              <div class="ex-sub">${it.sets} × ${it.reps} · <span class="muscle">${ex.muscle}</span></div>
            </div>
            <div class="ex-status">${complete ? '✓' : `${sd}/${it.sets}`}</div>
          </button>`;
      }).join('')}
    </div>

    <button class="btn" id="finish-btn">🏁 Finish & save workout</button>
    <div style="height:10px;"></div>
    <button class="btn ghost" id="cancel-btn">Back to Today</button>
  `;

  S.root.querySelectorAll('.ex-card').forEach(c =>
    c.addEventListener('click', () => openExercise(Number(c.dataset.idx))));
  S.root.querySelector('#finish-btn').addEventListener('click', finishFlow);
  S.root.querySelector('#cancel-btn').addEventListener('click', () => {
    clearTimers();
    import('./views/today.js').then(m => m.mountToday(S.root));
  });
}

async function openExercise(idx) {
  clearTimers();
  const item = S.day.items[idx];
  const ex = LIBRARY[item.id];
  S.active = await getActive();
  const sug = await suggestion(item);
  const logged = S.active.log[item.id] || [];

  const showWeight = ex.type === 'weight';
  const repLabel = ex.type === 'timed' ? 'secs' : 'reps';

  S.root.innerHTML = `
    <button class="back-btn" id="back">‹ ${S.day.title}</button>

    <div class="ex-hero">
      <img id="frame" class="ex-hero-img" src="${ex.frames[0]}" alt="${ex.name}" />
      <div class="ex-hero-cap">
        <div class="ex-name big">${ex.name}</div>
        <div class="ex-sub">${item.sets} × ${item.reps} · ${ex.muscle} · ${ex.equipment}</div>
      </div>
    </div>

    <div class="coach">
      <div class="coach-head">🎯 ${sug.headline}</div>
      <div class="coach-detail">${sug.detail}</div>
      ${sug.lastStr ? `<div class="coach-last">Last time: ${sug.lastStr}</div>` : ''}
    </div>

    <div class="section-label">Log your sets</div>
    <div class="set-rows">
      ${Array.from({ length: item.sets }).map((_, i) => {
        const l = logged[i] || {};
        const done = l && (l.reps || l.weight);
        const prefill = l.weight ?? (sug.suggestedWeight ?? '');
        return `
          <div class="set-row ${done ? 'done' : ''}" data-set="${i}">
            <div class="set-no">${i + 1}</div>
            ${showWeight ? `<input class="inp w" type="number" inputmode="decimal" placeholder="kg" value="${prefill}" />` : `<div class="inp-spacer">${ex.type === 'bodyweight' ? 'body' : '—'}</div>`}
            <input class="inp r" type="number" inputmode="numeric" placeholder="${repLabel}" value="${l.reps ?? ''}" />
            <button class="set-check" data-set="${i}">✓</button>
          </div>`;
      }).join('')}
    </div>

    <details class="howto">
      <summary>How to do it</summary>
      <ol>${ex.cues.map(c => `<li>${c}</li>`).join('')}</ol>
      <div class="home-swap"><strong>No gym / home swap:</strong> ${ex.home}</div>
    </details>

    <div style="height:8px;"></div>
    <button class="btn ghost" id="to-overview">Done with this exercise</button>
  `;

  if (ex.frames.length > 1) {
    let f = 0;
    frameTimer = setInterval(() => {
      f = 1 - f;
      const img = document.getElementById('frame');
      if (img) img.src = ex.frames[f];
    }, 800);
  }

  S.root.querySelector('#back').addEventListener('click', renderOverview);
  S.root.querySelector('#to-overview').addEventListener('click', renderOverview);
  S.root.querySelectorAll('.set-check').forEach(btn =>
    btn.addEventListener('click', () => checkSet(item, ex, Number(btn.dataset.set))));
}

async function checkSet(item, ex, i) {
  const row = S.root.querySelector(`.set-row[data-set="${i}"]`);
  const w = valOf(row, '.w');
  const r = valOf(row, '.r');
  if (!r) { row.classList.add('shake'); setTimeout(() => row.classList.remove('shake'), 400); return; }
  await logSet(item.id, i, ex.type === 'weight' ? w : '', r);
  S.active = await getActive();
  row.classList.add('done');
  startRest(item.rest);
}
function valOf(row, sel) { const el = row.querySelector(sel); return el ? el.value : ''; }

function startRest(seconds) {
  if (restTimer) clearInterval(restTimer);
  let remaining = seconds;
  let overlay = document.getElementById('rest-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'rest-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="rest-card">
      <div class="rest-label">REST</div>
      <div class="rest-time">${remaining}s</div>
      <div class="rest-btns">
        <button id="rest-add">+15s</button>
        <button id="rest-skip" class="prime">Skip</button>
      </div>
    </div>`;
  overlay.querySelector('#rest-add').onclick = () => { remaining += 15; const t = overlay.querySelector('.rest-time'); if (t) t.textContent = `${remaining}s`; };
  overlay.querySelector('#rest-skip').onclick = endRest;
  overlay.classList.add('show');

  restTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) { endRest(); return; }
    const t = overlay.querySelector('.rest-time');
    if (t) t.textContent = `${remaining}s`;
  }, 1000);

  function endRest() {
    clearInterval(restTimer); restTimer = null;
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    beep();
    overlay.classList.remove('show');
    setTimeout(() => { if (overlay) overlay.remove(); }, 250);
  }
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.start(); o.stop(ctx.currentTime + 0.36);
  } catch (e) { /* silent */ }
}

async function finishFlow() {
  clearTimers();
  const session = await finishActive();
  const n = session ? session.entries.reduce((a, e) => a + e.sets.length, 0) : 0;
  const vol = session ? session.entries.reduce((a, e) =>
    a + e.sets.reduce((s, x) => s + (x.weight || 0) * (x.reps || 0), 0), 0) : 0;

  S.root.innerHTML = `
    <div class="stub" style="padding-top:30px;">
      <span class="glyph">🏆</span>
      <h2>Session done.</h2>
      <p>${n} sets logged${vol ? `, ${Math.round(vol)}kg moved` : ''}. That’s another brick in the wall.</p>
    </div>

    <details class="card warmup" open>
      <summary><strong>🧊 Cool down · 5 min</strong></summary>
      <p class="coach-last" style="margin:6px 0 4px;">Hold each 20–30s, breathe out into it, never bounce. This is where flexibility and recovery happen.</p>
      ${stretchList(COOLDOWN)}
    </details>

    <div class="card"><p class="lead">🍽️ Now refuel: protein + carbs within an hour or two. Dinner’s perfect.</p></div>

    <button class="btn" id="back-today">Back to Today</button>`;
  S.root.querySelector('#back-today').addEventListener('click', () =>
    import('./views/today.js').then(m => m.mountToday(S.root)));
}
