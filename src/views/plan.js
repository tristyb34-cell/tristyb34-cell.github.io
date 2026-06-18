/* ============================================================
   DAX — The Programme (read-only overview of every training day)
   See all your workouts at once; tap any exercise for the how-to.
   ============================================================ */
import { LIBRARY, estimateMinutes } from '../program.js';
import { getPlan } from '../plan.js';
import { openEditor } from '../editor.js';

let frameTimer = null;
function clearFrameTimer() { if (frameTimer) { clearInterval(frameTimer); frameTimer = null; } }

export function renderPlan() {
  return { html: '', onMount: (root) => paint(root) };
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

  const totalExercises = plan.reduce((n, s) => n + s.items.length, 0);

  const daysHtml = plan.map((s, di) => `
    <div class="card card-hero" style="margin-top:16px;">
      <div class="eyebrow">${s.dow} • Training day</div>
      <h2 class="screen-title" style="font-size:24px;">${s.title}</h2>
      <div style="margin:12px 0 2px; display:flex; gap:8px; flex-wrap:wrap;">
        <span class="pill accent">~${estimateMinutes(s)} min</span>
        <span class="pill">${s.items.length} exercises</span>
      </div>
    </div>
    <div class="ex-list">
      ${s.items.map((it, i) => {
        const ex = LIBRARY[it.id];
        if (!ex) return '';
        return `
          <button class="ex-card" data-day="${di}" data-idx="${i}">
            <img class="ex-thumb" src="${ex.frames[0]}" alt="" loading="lazy" />
            <div class="ex-meta">
              <div class="ex-name">${ex.name}</div>
              <div class="ex-sub">${it.sets} × ${it.reps} · ${it.rest}s rest · <span class="muscle">${ex.muscle}</span></div>
            </div>
            <div class="ex-status">›</div>
          </button>`;
      }).join('')}
    </div>`).join('');

  root.innerHTML = `
    <div class="eyebrow">Your training</div>
    <h1 class="screen-title">The Programme</h1>
    <p class="lead">${plan.length} training days · ${totalExercises} exercises in total. Tap any move for the how-to and home swap.</p>
    ${daysHtml}
    <div style="height:14px;"></div>
    <button class="btn ghost" id="edit">✎ Edit my plan</button>`;

  root.querySelectorAll('.ex-card').forEach(btn =>
    btn.addEventListener('click', () => openHowto(root, plan, Number(btn.dataset.day), Number(btn.dataset.idx))));
  root.querySelector('#edit').addEventListener('click', () => openEditor(root));
}

function openHowto(root, plan, di, idx) {
  clearFrameTimer();
  const item = plan[di].items[idx];
  const ex = LIBRARY[item.id];
  if (!ex) return;

  root.innerHTML = `
    <button class="back-btn" id="back">‹ The Programme</button>

    <div class="ex-hero">
      <img id="frame" class="ex-hero-img" src="${ex.frames[0]}" alt="${ex.name}" />
      <div class="ex-hero-cap">
        <div class="ex-name big">${ex.name}</div>
        <div class="ex-sub">${item.sets} × ${item.reps} · ${ex.muscle} · ${ex.equipment}</div>
      </div>
    </div>

    <details class="howto" open>
      <summary>How to do it</summary>
      <ol>${ex.cues.map(c => `<li>${c}</li>`).join('')}</ol>
      <div class="home-swap"><strong>No gym / home swap:</strong> ${ex.home}</div>
    </details>

    <div style="height:8px;"></div>
    <button class="btn ghost" id="to-list">Back to programme</button>`;

  if (ex.frames.length > 1) {
    let f = 0;
    frameTimer = setInterval(() => {
      f = 1 - f;
      const img = document.getElementById('frame');
      if (img) img.src = ex.frames[f];
    }, 800);
  }

  const back = () => paint(root);
  root.querySelector('#back').addEventListener('click', back);
  root.querySelector('#to-list').addEventListener('click', back);
}
