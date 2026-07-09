/* ============================================================
   DAX — the guided workout runner
   Marches through a plan "day" one exercise at a time:
   { dow, title, items:[{id,sets,reps,rest}] }
   Land on exercise 1 → log or one-tap "as suggested" → rest
   timer → Next exercise. Skip / jump / swap available throughout.
   Spotter lifts are auto-substituted (Tristan trains alone).
   ============================================================ */
import { LIBRARY } from './program.js';
import { WARMUP, COOLDOWN } from './data.js';
import { startActive, getActive, logSet, finishActive, suggestion, setEffort, repTarget, setIncrement } from './workouts.js';
import { isSpotter, safeSub } from './safety.js';
import { swapCandidates, getGym, hasEquipment } from './equipment.js';
import { getPlan, savePlan } from './plan.js';
import { announce } from './a11y.js';
import { cueFor } from './cues.js';

const stretchList = (items) => `<div class="stretch-list">${items.map(s =>
  `<div class="stretch-item"><span class="stretch-dot">›</span><div><div class="nm">${s.name}</div><div class="dt">${s.detail}</div></div><span class="du">${s.dur}</span></div>`).join('')}</div>`;

let S = null;          // { root, day, idx, active }
let frameTimer = null;
let restTimer = null;

// Parse a weight the iPhone keypad might give with EITHER separator. SA locale
// keypads often emit a comma, which type=number silently rejected — hence 7.5 → 8.
const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? 0 : n; };

function clearTimers() {
  if (frameTimer) { clearInterval(frameTimer); frameTimer = null; }
  if (restTimer) { clearInterval(restTimer); restTimer = null; }
}

export async function renderSession(root, day) {
  clearTimers();
  const active = await startActive(day);
  S = { root, day, idx: 0, active };
  // first unfinished exercise = where the march resumes on refresh
  const firstOpen = day.items.findIndex((_, i) => !itemComplete(i));
  S.idx = firstOpen === -1 ? 0 : firstOpen;
  await renderStep(S.idx);
}

/* ---------- progress helpers ---------- */
function setsDone(exId) {
  const arr = (S.active.log[exId] || []).filter(s => s && (s.reps || s.weight));
  return arr.length;
}
function itemComplete(i) {
  const it = S.day.items[i];
  return it ? setsDone(it.id) >= it.sets : false;
}
function exercisesDone() {
  return S.day.items.reduce((n, _, i) => n + (itemComplete(i) ? 1 : 0), 0);
}

/* ---------- swap spotter lifts for a solo-safe move, in place ---------- */
function applySafety(idx) {
  const it = S.day.items[idx];
  if (isSpotter(it.id)) {
    const sub = safeSub(it.id);
    if (sub && LIBRARY[sub]) {
      const from = LIBRARY[it.id] ? LIBRARY[it.id].name : it.id;
      S.day.items[idx] = { ...it, id: sub };
      return from; // name we swapped away from
    }
  }
  return null;
}

/* ============================================================
   The exercise step
   ============================================================ */
async function renderStep(idx, focusSel) {
  clearTimers();
  const total = S.day.items.length;
  if (idx >= total) return finishFlow();
  if (idx < 0) idx = 0;
  S.idx = idx;

  const subbedFrom = applySafety(idx);
  const item = S.day.items[idx];
  const ex = LIBRARY[item.id];
  if (!ex) { return renderStep(idx + 1); } // bad id, skip it

  S.active = await getActive();
  const sug = await suggestion(item);
  const logged = S.active.log[item.id] || [];
  const N = item.sets;
  const complete = setsDone(item.id) >= N;
  const showWeight = ex.type === 'weight';
  const repLabel = ex.type === 'timed' ? 'secs' : 'reps';
  const target = sug.repGoal || repTarget(item.reps);
  const working = sug.lastWeight ?? '';   // prefill to what you actually lifted last time
  const tryStr = showWeight && sug.suggestedWeight != null
    ? `${sug.suggestedWeight}kg × ${sug.repGoal}`
    : (sug.repGoal ? `${sug.repGoal} ${repLabel}` : '');
  const isFirstOfSession = exercisesDone() === 0 && setsDone(item.id) === 0;

  // preselect effort if all logged sets share one
  const rirVals = logged.filter(Boolean).map(s => s.rir).filter(v => v !== null && v !== undefined);
  const curRir = rirVals.length && rirVals.every(v => v === rirVals[0]) ? rirVals[0] : null;

  S.root.innerHTML = `
    <div class="step-top">
      <button class="back-btn" id="exit">‹ Today</button>
      <div class="step-count">Exercise ${idx + 1} of ${total}</div>
    </div>

    <div class="step-pills">
      ${S.day.items.map((it, i) => {
        const done = itemComplete(i);
        const st = done ? 'done' : (i === idx ? 'cur' : '');
        const lbl = `Exercise ${i + 1}${done ? ', completed' : (i === idx ? ', current' : '')}`;
        return `<button class="step-pill ${st}" data-jump="${i}" aria-label="${lbl}"${i === idx ? ' aria-current="step"' : ''}>${done ? '✓' : i + 1}</button>`;
      }).join('')}
    </div>

    ${isFirstOfSession ? `
    <details class="card warmup" open>
      <summary><strong>🔥 Warm up first · 5 min</strong></summary>
      ${stretchList(WARMUP)}
      <p class="coach-last">Five years off means lazy tendons. Five minutes here saves a tweaked shoulder.</p>
    </details>` : ''}

    <div class="ex-hero">
      <img id="frame" class="ex-hero-img" src="${ex.frames[0]}" alt="${ex.name}" />
      <div class="ex-hero-cap">
        <div class="ex-name big" id="ex-name" tabindex="-1">${ex.name}</div>
        <div class="ex-sub">${N} × ${item.reps} · ${ex.muscle} · ${ex.equipment}</div>
      </div>
    </div>

    ${subbedFrom ? `<div class="safe-note">🛟 Swapped <strong>${subbedFrom}</strong> for a solo-safe move — no spotter needed.</div>` : ''}

    <div class="coach">
      <div class="coach-head">🎯 ${sug.headline}</div>
      <div class="coach-detail">${sug.detail}</div>
      ${sug.target ? `<div class="coach-target"><span class="ct-label">Progression</span> ${sug.target}</div>` : ''}
      ${sug.lastStr ? `<div class="coach-last">Last time: ${sug.lastStr}${tryStr ? ` → <strong>try ${tryStr}</strong>` : ''}</div>` : ''}
    </div>

    ${cueFor(item.id) ? `<div class="form-cue"><span aria-hidden="true">🎯</span> <span class="form-cue-label">Coach cue</span> <span>${cueFor(item.id)}</span></div>` : ''}

    ${(showWeight && sug.readyToLevelUp) ? `
    <button class="btn levelup" id="level-up">🔼 Level up · add ${sug.inc}kg → ${sug.suggestedWeight}kg</button>` : ''}

    ${showWeight ? `
    <div class="working">
      <label for="workw">Working weight</label>
      <div class="working-in">
        <button class="stp" id="w-down" aria-label="Lower weight">−</button>
        <input id="workw" class="inp w-big" type="text" inputmode="decimal" pattern="[0-9.,]*" aria-describedby="w-hint" placeholder="kg" value="${working}" />
        <button class="stp" id="w-up" aria-label="Raise weight">+</button>
        <span class="working-unit">kg</span>
      </div>
      <p class="working-hint" id="w-hint">Start heavier or lighter? Set it here and every set below follows. Comma or point both work (e.g. 22,5).</p>
      <div class="jump-edit">
        <label for="jump-sel">Weight jump</label>
        <select id="jump-sel">${[2, 2.5, 5, 10].map(v => `<option value="${v}"${v === sug.inc ? ' selected' : ''}>+${v}kg</option>`).join('')}</select>
      </div>
    </div>` : ''}

    <div class="sets-adjust" role="group" aria-labelledby="sets-lbl">
      <span class="sets-adjust-label" id="sets-lbl">Sets</span>
      <button class="stp" id="sets-down" aria-label="Remove a set">−</button>
      <span class="sets-count">${N}</span>
      <button class="stp" id="sets-up" aria-label="Add a set">+</button>
    </div>

    <div class="section-label">Your sets · aim for ${item.reps} ${repLabel}</div>
    <div class="set-rows">
      ${Array.from({ length: N }).map((_, i) => {
        const l = logged[i] || {};
        const done = l && (l.reps || l.weight);
        const wv = done ? (l.weight ?? '') : working;
        const rv = done ? (l.reps ?? '') : (target || '');
        return `
          <div class="set-row ${done ? 'done' : ''}" data-set="${i}">
            <div class="set-no" aria-hidden="true">${i + 1}</div>
            ${showWeight ? `<input class="inp w" type="text" inputmode="decimal" pattern="[0-9.,]*" aria-label="Set ${i + 1} weight in kg" placeholder="kg" value="${wv}" ${done ? 'disabled' : ''} />` : `<div class="inp-spacer" aria-hidden="true">${ex.type === 'bodyweight' ? 'body' : '—'}</div>`}
            <input class="inp r" type="number" inputmode="numeric" aria-label="Set ${i + 1} ${repLabel}" placeholder="${repLabel}" value="${rv}" ${done ? 'disabled' : ''} />
            <button class="set-check" data-set="${i}" aria-label="Log set ${i + 1}" ${done ? 'disabled' : ''}>✓</button>
          </div>`;
      }).join('')}
    </div>
    <p class="set-error" id="set-error" role="alert"></p>

    ${complete ? '' : `<button class="btn allset" id="all-set">✓ Log all ${N} sets as shown</button>`}

    ${ex.type !== 'timed' ? `
    <div class="effort" role="group" aria-labelledby="effort-q">
      <div class="effort-q" id="effort-q">How hard was that? <span class="effort-opt">optional</span></div>
      <div class="effort-btns">
        ${[['3', 'Easy'], ['1', 'Solid'], ['0', 'All-out']].map(([v, l]) => {
          const on = curRir === Number(v);
          return `<button type="button" class="effort-btn ${on ? 'selected' : ''}" data-rir="${v}" aria-pressed="${on}">${l}</button>`;
        }).join('')}
      </div>
    </div>` : ''}

    <div class="ctrl-row">
      <button class="pill" id="swap-ex">⇄ Swap exercise</button>
      ${total > 1 ? `<button class="pill" id="defer-ex">⤓ Do later</button>` : ''}
      ${idx < total - 1 ? `<button class="pill" id="skip-ex">Skip →</button>` : ''}
    </div>

    <details class="howto">
      <summary>How to do it</summary>
      <ol>${ex.cues.map(c => `<li>${c}</li>`).join('')}</ol>
      <div class="home-swap"><strong>No gym / home swap:</strong> ${ex.home}</div>
    </details>

    <button class="btn ${complete ? '' : 'ghost'}" id="next-ex">${idx < total - 1 ? 'Next exercise ›' : '🏁 Finish workout'}</button>
    <div style="height:8px;"></div>
    <button class="btn ghost small" id="finish-now">Finish &amp; save now</button>
  `;

  // animate the two frames
  if (ex.frames.length > 1) {
    let f = 0;
    frameTimer = setInterval(() => {
      f = 1 - f;
      const img = document.getElementById('frame');
      if (img) img.src = ex.frames[f];
    }, 800);
  }

  wireStep(item, ex, N, target, sug);

  // restore focus after a destructive repaint so an AT user never lands on <body>
  if (focusSel) { const el = S.root.querySelector(focusSel); if (el && el.focus) el.focus(); }
}

function wireStep(item, ex, N, target, sug) {
  const q = (s) => S.root.querySelector(s);
  const inc = (sug && sug.inc) || 2.5;

  q('#exit').addEventListener('click', () => {
    clearTimers();
    import('./views/today.js').then(m => m.mountToday(S.root));
  });

  S.root.querySelectorAll('.step-pill').forEach(p =>
    p.addEventListener('click', () => renderStep(Number(p.dataset.jump), '#ex-name')));

  // working-weight master field pushes to every unlogged set row
  const workw = q('#workw');
  const push = () => S.root.querySelectorAll('.set-row:not(.done) .w').forEach(w => { w.value = workw.value; });
  if (workw) {
    workw.addEventListener('input', push);
    q('#w-up').addEventListener('click', () => { workw.value = (num(workw.value) + inc); push(); });
    q('#w-down').addEventListener('click', () => { workw.value = Math.max(0, num(workw.value) - inc); push(); });
  }

  // "You earned it" — one tap applies the smart jump + resets reps to the bottom of the range
  const lvl = q('#level-up');
  if (lvl && workw) lvl.addEventListener('click', () => {
    if (lvl.getAttribute('aria-disabled') === 'true') return;   // guard, button stays focusable
    workw.value = sug.suggestedWeight;
    push();
    S.root.querySelectorAll('.set-row:not(.done) .r').forEach(r => { if (sug.lo) r.value = sug.lo; });
    workw.focus();   // land on the field whose value changed, before locking the button
    announce(`Leveled up. Working weight set to ${sug.suggestedWeight} kilos, all sets updated.`);
    lvl.textContent = `🔼 Leveled up to ${sug.suggestedWeight}kg!`;
    lvl.classList.add('leveled');
    lvl.setAttribute('aria-disabled', 'true');
  });

  // editable jump size, remembered per exercise (repaint keeps sug in sync; refocus + announce)
  const jsel = q('#jump-sel');
  if (jsel) jsel.addEventListener('change', async () => {
    const v = Number(jsel.value);
    await setIncrement(item.id, v);
    await renderStep(S.idx, '#jump-sel');
    announce(`Weight jump set to ${v} kilograms.`);
  });

  // add / remove a set for this session
  const sdn = q('#sets-down'), sup = q('#sets-up');
  if (sdn) sdn.addEventListener('click', () => changeSets(-1));
  if (sup) sup.addEventListener('click', () => changeSets(+1));

  S.root.querySelectorAll('.set-check').forEach(btn =>
    btn.addEventListener('click', () => checkSet(item, ex, Number(btn.dataset.set))));

  const allBtn = q('#all-set');
  if (allBtn) allBtn.addEventListener('click', () => logAllSets(item, ex, N, target));

  S.root.querySelectorAll('.effort-btn').forEach(btn =>
    btn.addEventListener('click', async () => {
      const was = btn.getAttribute('aria-pressed') === 'true';
      await setEffort(item.id, was ? null : Number(btn.dataset.rir));
      S.active = await getActive();
      S.root.querySelectorAll('.effort-btn').forEach(b => {
        const on = !was && b === btn;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.classList.toggle('selected', on);
      });
    }));

  q('#swap-ex').addEventListener('click', () => openInlineSwap());
  const defer = q('#defer-ex');
  if (defer) defer.addEventListener('click', deferCurrent);
  const skip = q('#skip-ex');
  if (skip) skip.addEventListener('click', () => renderStep(S.idx + 1, '#ex-name'));
  q('#next-ex').addEventListener('click', () => renderStep(S.idx + 1, '#ex-name'));
  q('#finish-now').addEventListener('click', finishFlow);
}

// add / remove a set for the current exercise, this session only (min = sets already
// logged, so you can't delete a set you did; the editor sets your permanent default)
function changeSets(delta) {
  const it = S.day.items[S.idx];
  const floor = Math.max(1, setsDone(it.id));
  const next = Math.min(8, Math.max(floor, (it.sets || 1) + delta));
  if (next === it.sets) return;
  S.day.items[S.idx] = { ...it, sets: next };
  renderStep(S.idx, delta < 0 ? '#sets-down' : '#sets-up').then(() => announce(`${next} sets`));
}

// "Do later" — machine's taken? Send this exercise to the end of the queue and
// carry on. Log is keyed by exercise id, so reordering never loses your sets.
function deferCurrent() {
  if (S.day.items.length < 2) return;
  const name = (LIBRARY[S.day.items[S.idx].id] || {}).name || 'this exercise';
  const [it] = S.day.items.splice(S.idx, 1);
  S.day.items.push(it);
  const nextIdx = Math.min(S.idx, S.day.items.length - 1);
  renderStep(nextIdx, '#ex-name').then(() => {
    const nx = LIBRARY[S.day.items[nextIdx].id];
    announce(`Moved ${name} to the end. Now on exercise ${nextIdx + 1} of ${S.day.items.length}${nx ? ', ' + nx.name : ''}.`);
  });
}

/* ---------- logging ---------- */
async function checkSet(item, ex, i) {
  const row = S.root.querySelector(`.set-row[data-set="${i}"]`);
  const rInput = row.querySelector('.r');
  const err = S.root.querySelector('#set-error');
  const w = valOf(row, '.w');
  const r = valOf(row, '.r');
  if (!r) {
    row.classList.add('shake'); setTimeout(() => row.classList.remove('shake'), 400);
    if (rInput) { rInput.setAttribute('aria-invalid', 'true'); rInput.setAttribute('aria-describedby', 'set-error'); rInput.focus(); }
    if (err) err.textContent = `Set ${i + 1}: enter your ${ex.type === 'timed' ? 'seconds' : 'reps'} before logging it.`;
    return;
  }
  if (rInput) { rInput.removeAttribute('aria-invalid'); rInput.removeAttribute('aria-describedby'); }
  if (err) err.textContent = '';
  await logSet(item.id, i, ex.type === 'weight' ? (w === '' ? '' : num(w)) : '', r);
  S.active = await getActive();
  row.classList.add('done');
  refreshFooter(item);
  announce(`Set ${i + 1} logged.`);
  startRest(item.rest);   // moves focus into the rest overlay before we disable this row
  row.querySelectorAll('input').forEach(el => { el.disabled = true; });
  const btn = row.querySelector('.set-check'); if (btn) btn.disabled = true;
}

async function logAllSets(item, ex, N, target) {
  const showWeight = ex.type === 'weight';
  const workw = S.root.querySelector('#workw');
  const err = S.root.querySelector('#set-error');
  const w = showWeight ? (workw ? workw.value : '') : '';
  if (showWeight && !w) {
    if (workw) {
      workw.classList.add('shake'); setTimeout(() => workw.classList.remove('shake'), 400);
      workw.setAttribute('aria-invalid', 'true'); workw.setAttribute('aria-describedby', 'set-error'); workw.focus();
    }
    if (err) err.textContent = 'Set your working weight first, then log all sets.';
    return;
  }
  if (workw) { workw.removeAttribute('aria-invalid'); }
  if (err) err.textContent = '';
  const reps = target || 0;
  if (!reps) return;
  for (let i = 0; i < N; i++) {
    const already = (S.active.log[item.id] || [])[i];
    if (already && (already.reps || already.weight)) continue;
    await logSet(item.id, i, showWeight ? num(w) : '', reps);
  }
  S.active = await getActive();
  renderStep(S.idx, '#next-ex').then(() => announce(`All ${N} sets logged.`)); // rows now done, Next goes primary
}

function valOf(row, sel) { const el = row.querySelector(sel); return el ? el.value : ''; }

// update the pills + Next button state in place after a single set logs
function refreshFooter(item) {
  const done = setsDone(item.id) >= item.sets;
  const pill = S.root.querySelector(`.step-pill[data-jump="${S.idx}"]`);
  if (pill && done) { pill.classList.remove('cur'); pill.classList.add('done'); pill.textContent = '✓'; }
  const next = S.root.querySelector('#next-ex');
  if (next && done) next.classList.remove('ghost');
  const all = S.root.querySelector('#all-set');
  if (all && done) all.remove();
}

/* ---------- in-session swap (solo-safe only) ---------- */
async function openInlineSwap() {
  const item = S.day.items[S.idx];
  const cur = LIBRARY[item.id];
  const gym = await getGym();
  const list = swapCandidates(item.id, gym).filter(x => hasEquipment(x, gym)).slice(0, 12);
  const pool = list.length ? list : swapCandidates(item.id, gym).slice(0, 12);

  const overlay = document.createElement('div');
  overlay.id = 'picker';
  overlay.innerHTML = `
    <div class="picker-head">
      <strong style="font-size:16px;">Swap this exercise</strong>
      <button id="swap-close">Close</button>
    </div>
    <div class="picker-body">
      <p class="lead" style="margin:4px 0 12px;">Replace <strong>${cur ? cur.name : item.id}</strong> with a similar ${cur ? cur.group.toLowerCase() : ''} move. Spotter lifts are hidden — you train alone.</p>
      <div class="pick-group">${pool.map(ex => `
        <button class="pick-row" data-id="${ex.id}">
          <img class="ex-thumb sm" src="${ex.frames[0]}" alt="" loading="lazy" />
          <div class="ex-meta"><div class="ex-name">${ex.name}</div>
            <div class="ex-sub">${ex.equipment} · ${ex.muscle}</div></div>
        </button>`).join('') || '<p class="lead">No alternatives bundled for this one.</p>'}</div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 200); };
  overlay.querySelector('#swap-close').addEventListener('click', close);

  overlay.querySelectorAll('.pick-row').forEach(r => r.addEventListener('click', async () => {
    const newId = r.dataset.id;
    S.day.items[S.idx] = { ...item, id: newId };   // this session
    await persistSwap(S.day.dow, item.id, newId);   // and remember it in the plan
    close();
    renderStep(S.idx);
  }));
}

// swap by matching the OLD id in the stored plan (robust to onramp/quick trims + reorders)
async function persistSwap(dow, oldId, newId) {
  try {
    const plan = await getPlan();
    const day = plan.find(d => d.dow === dow);
    if (!day) return;
    const i = day.items.findIndex(it => it.id === oldId);
    if (i === -1) return;
    day.items[i] = { ...day.items[i], id: newId };
    await savePlan(plan);
  } catch (e) { /* session swap still applied */ }
}

/* ---------- rest timer ---------- */
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
    <div class="rest-card" role="dialog" aria-modal="true" aria-label="Rest timer">
      <div class="rest-label">REST</div>
      <div class="rest-time" role="timer" aria-live="off">${remaining}s</div>
      <div class="rest-btns">
        <button id="rest-add">+15s</button>
        <button id="rest-skip" class="prime">Skip</button>
      </div>
    </div>`;
  overlay.querySelector('#rest-add').onclick = () => { remaining += 15; const t = overlay.querySelector('.rest-time'); if (t) t.textContent = `${remaining}s`; };
  overlay.querySelector('#rest-skip').onclick = endRest;
  overlay.classList.add('show');
  overlay.querySelector('#rest-skip').focus();   // move focus into the overlay
  document.addEventListener('keydown', onRestKey);

  restTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) { endRest(); return; }
    const t = overlay.querySelector('.rest-time');
    if (t) t.textContent = `${remaining}s`;
  }, 1000);

  function onRestKey(e) { if (e.key === 'Escape') endRest(); }

  function endRest() {
    clearInterval(restTimer); restTimer = null;
    document.removeEventListener('keydown', onRestKey);
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    beep();
    overlay.classList.remove('show');
    setTimeout(() => { if (overlay) overlay.remove(); }, 250);
    // hand focus back to the next thing to do, never <body>
    const t = S.root.querySelector('.set-row:not(.done) .r') || S.root.querySelector('#next-ex') || S.root.querySelector('#ex-name');
    if (t && t.focus) t.focus();
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

/* ---------- finish ---------- */
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
