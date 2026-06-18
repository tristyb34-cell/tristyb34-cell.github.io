import { getSessions } from '../workouts.js';
import { LIBRARY } from '../program.js';
import { sparkline, lineChart, heatmap } from '../charts.js';

export function renderHistory() {
  return { html: '', onMount: (root) => paint(root) };
}

// best metric for an exercise within one session (weight → max kg; else max reps)
function bestOf(entry, type) {
  if (type === 'weight') return Math.max(0, ...entry.sets.map(s => s.weight || 0));
  return Math.max(0, ...entry.sets.map(s => s.reps || 0));
}

async function paint(root) {
  const sessions = await getSessions();

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
      return `
        <button class="prog-row" data-ex="${exId}">
          <img class="ex-thumb sm" src="${ex.frames[0]}" alt="" loading="lazy" />
          <div class="ex-meta">
            <div class="ex-name">${ex.name}</div>
            <div class="ex-sub">best ${latest}${unit} · ${pts.length} session${pts.length > 1 ? 's' : ''}</div>
          </div>
          ${sparkline(vals)}
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

    <div class="section-label">Activity · ${last7} in the last 7 days</div>
    <div class="card">${heatmap(activeDays)}</div>

    <div class="section-label">Exercise progress · tap to expand</div>
    ${progRows || '<div class="card"><p class="lead">Log a few sessions to see your lines climb.</p></div>'}

    <div class="section-label">Recent sessions</div>
    ${recent.map(s => {
      const n = s.entries.reduce((a, e) => a + e.sets.length, 0);
      const vol = s.entries.reduce((a, e) => a + e.sets.reduce((x, st) => x + (st.weight || 0) * (st.reps || 0), 0), 0);
      return `
        <div class="card hist-card">
          <div class="hist-top">
            <div><strong>${s.title}</strong><div class="ex-sub">${fmtDate(s.date)}</div></div>
            <div class="ex-sub">${n} sets · ${fmtTon(vol)}</div>
          </div>
          <div class="hist-ex">${s.entries.map(e => LIBRARY[e.exId] ? LIBRARY[e.exId].name : e.exId).join(' · ')}</div>
        </div>`;
    }).join('')}
  `;

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
