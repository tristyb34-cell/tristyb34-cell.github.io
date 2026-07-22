import { getSessions, bestE1rm, backfillSession, removeBackfill } from '../workouts.js';
import { LIBRARY, GROUPS } from '../program.js';
import { sparkline, lineChart, heatmap } from '../charts.js';
import { missedTrainingDays, computeConsistency } from '../consistency.js';
import { announce } from '../a11y.js';

const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

// V-taper width drivers — the muscles his Spider-Man goal lives or dies on
const VTAPER = new Set(['Shoulders', 'Back']);
const VOL_ORDER = ['Shoulders', 'Back', 'Chest', 'Biceps', 'Triceps', 'Legs', 'Core'];

function weeklyVolume(sessions) {
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6);
  const counts = {};
  for (const g of GROUPS) counts[g] = 0;
  for (const s of sessions) {
    if (new Date(s.date + 'T00:00:00') < weekAgo) continue;
    for (const e of s.entries) {
      const ex = LIBRARY[e.exId];
      if (ex) counts[ex.group] = (counts[ex.group] || 0) + e.sets.length;
    }
  }
  return counts;
}

function volStatus(n) {
  if (n === 0) return { label: 'none', cls: 'none' };
  if (n < 10) return { label: 'build', cls: 'low' };
  if (n <= 20) return { label: 'on target', cls: 'good' };
  return { label: 'high', cls: 'high' };
}

function volumeCard(sessions) {
  const counts = weeklyVolume(sessions);
  if (!Object.values(counts).reduce((a, b) => a + b, 0)) return '';
  const SCALE = 24; // bar maxes out at 24 sets; the 10-20 band is the green zone
  const rows = VOL_ORDER.map(g => {
    const n = counts[g] || 0;
    const st = volStatus(n);
    const fillPct = Math.min(100, Math.round((n / SCALE) * 100));
    const star = VTAPER.has(g) ? ' <span class="vol-star" aria-hidden="true">★</span>' : '';
    return `
      <div class="vol-row">
        <div class="vol-name">${g}${star}</div>
        <div class="vol-track"><span class="vol-band"></span><span class="vol-fill ${st.cls}" style="width:${fillPct}%"></span></div>
        <div class="vol-count">${n}<span class="vol-status ${st.cls}">${st.label}</span></div>
      </div>`;
  }).join('');
  return `
    <h2 class="section-label">This week’s volume · working sets per muscle</h2>
    <div class="card vol-card">
      ${rows}
      <p class="coach-last">Aim ~10–20 sets per muscle a week. ★ = your V-taper drivers (shoulders &amp; back); don’t let them fall behind legs.</p>
    </div>`;
}

const fmtLong = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

// The "did you train on these days?" backfill card. Renders nothing when there's
// nothing to fix, so no dangling heading. Each day is a reversible aria-pressed toggle.
function backfillCard(missed) {
  if (!missed.length) return '';
  const rows = missed.map(m => `
    <li class="backfill-row">
      <span class="backfill-date">${fmtLong(m.date)}</span>
      <button type="button" class="backfill-btn" data-date="${m.date}" data-dow="${m.dow}" data-title="${m.title}"
              aria-pressed="false" aria-label="I trained this day, ${fmtLong(m.date)}">
        <span class="backfill-btn-label">I trained this day</span>
      </button>
    </li>`).join('');
  return `
    <h2 class="section-label" id="backfill-h">Did you train on these days?</h2>
    <div class="card backfill-card" role="group" aria-labelledby="backfill-h">
      <p class="backfill-intro">These scheduled days have no logged session. If you trained, mark it and your consistency corrects itself.</p>
      <ul class="backfill-list">${rows}</ul>
    </div>`;
}

export function renderHistory() {
  return { html: '', onMount: (root) => paint(root) };
}

// best metric for an exercise within one session
// weight → estimated 1RM (honest strength, smooths bouncy top weights); else max reps
function bestOf(entry, type) {
  if (type === 'weight') return Math.round(bestE1rm(entry));
  return Math.max(0, ...entry.sets.map(s => s.reps || 0));
}

async function paint(root) {
  const sessions = await getSessions();
  const missed = await missedTrainingDays();

  if (!sessions.length) {
    root.innerHTML = `
      <div class="eyebrow">Your record</div>
      <h1 class="screen-title">History</h1>
      <p class="lead">Every set you log lands here.</p>
      <div class="stub"><span class="glyph">📊</span><h2>Nothing logged yet</h2>
        <p>Finish your first session and your numbers start stacking up.</p></div>`;
    return;
  }

  let sets = 0, reps = 0, volume = 0;
  const activeDays = new Set();
  const series = {}; // exId -> [{x,y}]
  for (const s of sessions) {
    activeDays.add(s.date);
    for (const e of s.entries) {
      const type = LIBRARY[e.exId] ? LIBRARY[e.exId].type : 'weight';
      for (const st of e.sets) { sets++; reps += st.reps || 0; volume += (st.weight || 0) * (st.reps || 0); }
      (series[e.exId] = series[e.exId] || []).push({ x: s.date, y: bestOf(e, type) });
    }
  }

  // workouts in last 7 days
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6);
  const last7 = sessions.filter(s => new Date(s.date + 'T00:00:00') >= weekAgo).length;

  const progRows = Object.entries(series)
    .filter(([, pts]) => pts.length >= 1)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([exId, pts]) => {
      const ex = LIBRARY[exId];
      if (!ex) return '';
      const vals = pts.map(p => p.y);
      const latest = vals[vals.length - 1];
      const unit = ex.type === 'weight' ? 'kg' : (ex.type === 'timed' ? 's' : ' reps');
      const metricLabel = ex.type === 'weight' ? `estimated 1RM ${latest}kg` : `best ${latest}${unit}`;
      return `
        <button class="prog-row" data-ex="${exId}">
          <img class="ex-thumb sm" src="${ex.frames[0]}" alt="" loading="lazy" />
          <div class="ex-meta">
            <div class="ex-name">${ex.name}</div>
            <div class="ex-sub">${metricLabel} · ${pts.length} session${pts.length > 1 ? 's' : ''}</div>
          </div>
          <span aria-hidden="true">${sparkline(vals)}</span>
        </button>
        <div class="prog-chart" id="chart-${exId}" hidden></div>`;
    }).join('');

  const recent = sessions.slice().reverse().slice(0, 10);
  root.innerHTML = `
    <div class="eyebrow">Your record</div>
    <h1 class="screen-title">History</h1>

    <div class="stat-grid">
      <div class="stat"><div class="stat-num">${sessions.length}</div><div class="stat-lbl">workouts</div></div>
      <div class="stat"><div class="stat-num">${sets}</div><div class="stat-lbl">sets</div></div>
      <div class="stat"><div class="stat-num">${reps}</div><div class="stat-lbl">reps</div></div>
      <div class="stat"><div class="stat-num">${fmtTon(volume)}</div><div class="stat-lbl">moved</div></div>
    </div>

    <h2 class="section-label">Activity · ${last7} in the last 7 days</h2>
    <div class="card">${heatmap(activeDays)}</div>

    ${backfillCard(missed)}

    ${volumeCard(sessions)}

    <h2 class="section-label">Exercise progress · tap to expand</h2>
    ${progRows || '<div class="card"><p class="lead">Log a few sessions to see your lines climb.</p></div>'}

    <h2 class="section-label">Recent sessions</h2>
    ${recent.map(s => {
      const n = s.entries.reduce((a, e) => a + e.sets.length, 0);
      const vol = s.entries.reduce((a, e) => a + e.sets.reduce((x, st) => x + (st.weight || 0) * (st.reps || 0), 0), 0);
      // attendance-only records (recovered/backfilled) have no sets — say so plainly
      const meta = s.entries.length ? `${n} sets · ${fmtTon(vol)}` : 'Attended (no sets logged)';
      const exLine = s.entries.length ? s.entries.map(e => LIBRARY[e.exId] ? LIBRARY[e.exId].name : e.exId).join(' · ') : 'Marked as trained';
      const noteEntries = s.entries.filter(e => e.note);
      return `
        <div class="card hist-card">
          <div class="hist-top">
            <div><strong>${s.title}</strong><div class="ex-sub">${fmtDate(s.date)}</div></div>
            <div class="ex-sub">${meta}</div>
          </div>
          <div class="hist-ex">${exLine}</div>
          ${noteEntries.map(e => `<p class="hist-note"><span aria-hidden="true">📝</span> ${escapeHtml(LIBRARY[e.exId] ? LIBRARY[e.exId].name : e.exId)}: ${escapeHtml(e.note)}</p>`).join('')}
        </div>`;
    }).join('')}
  `;

  // backfill toggles: mark / un-mark a missed day as attended, IN PLACE so focus
  // stays on the button (a full repaint would drop it to <body>).
  root.querySelectorAll('.backfill-btn').forEach(btn => btn.addEventListener('click', async () => {
    const { date, dow, title } = btn.dataset;
    const pressed = btn.getAttribute('aria-pressed') === 'true';
    if (pressed) {
      await removeBackfill(date);
      btn.setAttribute('aria-pressed', 'false');
      btn.classList.remove('confirmed');
      btn.querySelector('.backfill-btn-label').textContent = 'I trained this day';
      btn.setAttribute('aria-label', `I trained this day, ${fmtLong(date)}`);
      root.querySelector(`.heat-cell[data-key="${date}"]`)?.classList.remove('on');
    } else {
      await backfillSession(date, dow, title);
      btn.setAttribute('aria-pressed', 'true');
      btn.classList.add('confirmed');
      btn.querySelector('.backfill-btn-label').textContent = 'Trained';
      btn.setAttribute('aria-label', `Trained, ${fmtLong(date)}. Activate to undo.`);
      root.querySelector(`.heat-cell[data-key="${date}"]`)?.classList.add('on');
    }
    // nudge the visible workouts count + speak the off-screen consequence (the %)
    const statNum = root.querySelector('.stat-grid .stat-num');
    if (statNum) statNum.textContent = String((await getSessions()).length);
    const c = await computeConsistency();
    announce(c.pct !== null
      ? `30-day consistency now ${c.pct}%.`
      : (pressed ? 'Trained mark removed.' : 'Marked as trained.'));
  }));

  // tap a progression row to expand a full chart
  root.querySelectorAll('.prog-row').forEach(btn => btn.addEventListener('click', () => {
    const exId = btn.dataset.ex;
    const panel = document.getElementById(`chart-${exId}`);
    if (!panel) return;
    if (panel.hasAttribute('hidden')) {
      const ex = LIBRARY[exId];
      const unit = ex.type === 'weight' ? 'kg' : (ex.type === 'timed' ? 's' : '');
      panel.innerHTML = `<div class="card">${lineChart(series[exId], { fmt: v => `${v}${unit}` })}</div>`;
      panel.removeAttribute('hidden');
    } else {
      panel.setAttribute('hidden', '');
    }
  }));
}

function fmtTon(kg) { return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)}kg`; }
function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
