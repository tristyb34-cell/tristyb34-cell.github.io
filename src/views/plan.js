/* ============================================================
   DAX — The Programme (read-only overview of every training day)
   See all your workouts at once; tap any exercise for the how-to,
   swap moves your gym can't do. openDayPreview() is reused by Today.
   ============================================================ */
import { LIBRARY, estimateMinutes } from '../program.js';
import { formBlock } from '../cues.js';
import { getPlan } from '../plan.js';
import { openEditor } from '../editor.js';
import { getGym, isMissing, openSwapPicker, openGymSetup } from '../equipment.js';

let frameTimer = null;
function clearFrameTimer() { if (frameTimer) { clearInterval(frameTimer); frameTimer = null; } }

export function renderPlan() {
  return { html: '', onMount: (root) => paint(root) };
}

// tappable exercise rows for one day's items; flags moves the gym can't do
function exerciseRows(items, gym) {
  return items.map((it, i) => {
    const ex = LIBRARY[it.id];
    if (!ex) return '';
    const missing = isMissing(ex, gym);
    return `
      <button class="ex-card${missing ? ' missing' : ''}" data-idx="${i}">
        <img class="ex-thumb" src="${ex.frames[0]}" alt="" loading="lazy" />
        <div class="ex-meta">
          <div class="ex-name">${ex.name}${missing ? ' <span class="eq-flag">⚠ swap</span>' : ''}</div>
          <div class="ex-sub">${it.sets} × ${it.reps} · ${it.rest}s rest · <span class="muscle">${ex.muscle}</span> · ${ex.equipment}</div>
        </div>
        <div class="ex-status">›</div>
      </button>`;
  }).join('');
}

async function paint(root) {
  clearFrameTimer();
  const plan = await getPlan();

  if (!plan || !plan.length) {
    root.innerHTML = `
      <div class="eyebrow">Your training</div>
      <h1 class="screen-title">The Programme</h1>
      <div class="stub"><span class="glyph">🏋️</span><h2>No training days yet</h2>
        <p>Add some days in the plan editor and they’ll show up here.</p></div>
      <button class="btn" id="edit">✎ Build my plan</button>`;
    root.querySelector('#edit').addEventListener('click', () => openEditor(root));
    return;
  }

  const gym = await getGym();
  const totalExercises = plan.reduce((n, s) => n + s.items.length, 0);
  const missingCount = plan.reduce((n, s) => n + s.items.filter(it => isMissing(LIBRARY[it.id], gym)).length, 0);

  const daysHtml = plan.map((s) => `
    <div class="card card-hero" style="margin-top:16px;">
      <div class="eyebrow">${s.dow} • Training day</div>
      <h2 class="screen-title" style="font-size:24px;">${s.title}</h2>
      <div style="margin:12px 0 2px; display:flex; gap:8px; flex-wrap:wrap;">
        <span class="pill accent">~${estimateMinutes(s)} min</span>
        <span class="pill">${s.items.length} exercises</span>
      </div>
    </div>
    <div class="ex-list" data-dow="${s.dow}">${exerciseRows(s.items, gym)}</div>`).join('');

  root.innerHTML = `
    <div class="eyebrow">Your training</div>
    <h1 class="screen-title">The Programme</h1>
    <p class="lead">${plan.length} training days · ${totalExercises} exercises. Tap any move for the how-to, or ⇄ swap what your gym can’t do.</p>
    <button class="btn ghost" id="gym">⚙ My gym equipment${gym.configured && missingCount ? ` · ${missingCount} to swap` : ''}</button>
    ${daysHtml}
    <div style="height:14px;"></div>
    <button class="btn ghost" id="edit">✎ Edit my plan</button>`;

  root.querySelectorAll('.ex-list[data-dow]').forEach(list => {
    const dow = list.dataset.dow;
    list.querySelectorAll('.ex-card').forEach(btn =>
      btn.addEventListener('click', () => openHowto(root, dow, Number(btn.dataset.idx), () => paint(root))));
  });
  root.querySelector('#gym').addEventListener('click', () => openGymSetup(() => paint(root)));
  root.querySelector('#edit').addEventListener('click', () => openEditor(root));
}

// Reusable single-day preview screen, loaded fresh by day-of-week. onBack() decides the return target.
export async function openDayPreview(root, dow, onBack) {
  clearFrameTimer();
  const plan = await getPlan();
  const day = plan.find(d => d.dow === dow);
  if (!day) { onBack(); return; }
  const gym = await getGym();

  root.innerHTML = `
    <button class="back-btn" id="back">‹ Back</button>
    <div class="eyebrow">${day.dow} • Preview</div>
    <h1 class="screen-title">${day.title}</h1>
    <p class="lead">~${estimateMinutes(day)} min · ${day.items.length} exercises. Tap any move to see how it looks, or ⇄ swap it.</p>
    <div class="ex-list">${exerciseRows(day.items, gym)}</div>`;

  root.querySelector('#back').addEventListener('click', () => { clearFrameTimer(); onBack(); });
  root.querySelectorAll('.ex-card').forEach(btn =>
    btn.addEventListener('click', () =>
      openHowto(root, dow, Number(btn.dataset.idx), () => openDayPreview(root, dow, onBack))));
}

async function openHowto(root, dow, idx, onBack) {
  clearFrameTimer();
  const plan = await getPlan();
  const day = plan.find(d => d.dow === dow);
  const item = day && day.items[idx];
  const ex = item && LIBRARY[item.id];
  if (!ex) { onBack(); return; }
  const gym = await getGym();
  const missing = isMissing(ex, gym);

  root.innerHTML = `
    <button class="back-btn" id="back">‹ Back</button>

    <div class="ex-hero">
      <div class="ex-frames" id="ex-frames">
        <img id="frame" class="ex-hero-img frame-a" src="${ex.frames[0]}" alt="${ex.name}" />
        ${ex.frames.length > 1
          ? `<img class="ex-hero-img frame-b" src="${ex.frames[1]}" alt="" aria-hidden="true" />`
          : ''}
      </div>
      <div class="ex-hero-cap">
        <h1 class="ex-name big" id="ex-name" tabindex="-1">${ex.name}</h1>
        <div class="ex-sub">${item.sets} × ${item.reps} · ${ex.muscle} · ${ex.equipment}</div>
      </div>
    </div>

    ${formBlock(item.id)}

    ${missing ? `<div class="nudge accent-nudge"><span class="nudge-ic">⚠️</span><span>Your gym may not have this (${ex.equipment}). Swap it for something you can do.</span></div>` : ''}
    <button class="btn ghost" id="swap">⇄ Swap this exercise</button>

    <details class="howto">
      <summary>Step-by-step</summary>
      <ol>${ex.cues.map(c => `<li>${c}</li>`).join('')}</ol>
      <div class="home-swap"><strong>No gym / home swap:</strong> ${ex.home}</div>
    </details>

    <div style="height:8px;"></div>
    <button class="btn ghost" id="to-list">Back</button>`;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (ex.frames.length > 1 && !reduceMotion) {
    frameTimer = setInterval(() => {
      const wrap = document.getElementById('ex-frames');
      if (wrap) wrap.classList.toggle('tween');
    }, 1400);
  }

  // the view swapped under the user: land focus on the new heading, not <body>
  const h = root.querySelector('#ex-name');
  if (h) h.focus({ preventScroll: true });

  root.querySelector('#back').addEventListener('click', onBack);
  root.querySelector('#to-list').addEventListener('click', onBack);
  root.querySelector('#swap').addEventListener('click', () =>
    openSwapPicker(dow, idx, () => openHowto(root, dow, idx, onBack)));
}
