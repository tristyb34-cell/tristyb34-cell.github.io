/* ============================================================
   DAX — monthly review (Phase 4.5)
   Pulls the month together: weight trend, measurements, training,
   sleep, and a coach read on what to change next.
   ============================================================ */
import { db } from './store.js';
import { getSessions } from './workouts.js';
import { getTargets, trendWeight } from './profile.js';

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

export async function openReview(root) {
  const weighins = (await db.get('weighins', [])) || [];
  const measurements = (await db.get('measurements', [])) || [];
  const sleeps = (await db.get('sleeplogs', [])) || [];
  const sessions = await getSessions();
  const tg = await getTargets();

  const cutoff = daysAgo(30).toISOString().slice(0, 10);

  // weight: trend now vs ~a month ago
  const recentW = weighins.filter(w => w.date >= cutoff);
  const olderW = weighins.filter(w => w.date < cutoff);
  const trendNow = trendWeight(weighins);
  const trendThen = olderW.length ? trendWeight(olderW.slice(-7)) : (recentW.length ? recentW[0].kg : null);
  const monthChange = (trendNow != null && trendThen != null) ? Math.round((trendNow - trendThen) * 10) / 10 : null;

  // training
  const monthSessions = sessions.filter(s => s.date >= cutoff);
  let monthVol = 0;
  for (const s of monthSessions) for (const e of s.entries) for (const st of e.sets) monthVol += (st.weight || 0) * (st.reps || 0);

  // measurements: latest vs first within month (or baseline)
  const mNow = measurements.length ? measurements[measurements.length - 1] : null;
  const mThen = measurements.find(m => m.date >= cutoff) || (measurements[0] || null);

  // sleep
  const sleepAvg = sleeps.length ? Math.round((sleeps.slice(-30).reduce((s, x) => s + x.hours, 0) / Math.min(30, sleeps.length)) * 10) / 10 : null;

  await db.set('lastReview', new Date().toISOString().slice(0, 10));

  const overlay = document.createElement('div');
  overlay.id = 'review';
  overlay.innerHTML = `
    <div class="review-inner">
      <button class="back-btn" id="rv-close">‹ Close</button>
      <div class="eyebrow">Last 30 days</div>
      <h1 class="screen-title">Monthly review</h1>

      <div class="card card-hero">
        <div class="coach-eyebrow">YOUR COACH</div>
        <div class="coach-msg">${coachRead(monthChange, monthSessions.length, sleepAvg, tg)}</div>
      </div>

      <div class="stat-grid">
        <div class="stat"><div class="stat-num">${monthChange != null ? `${monthChange >= 0 ? '+' : ''}${monthChange}` : '—'}</div><div class="stat-lbl">kg trend</div></div>
        <div class="stat"><div class="stat-num">${monthSessions.length}</div><div class="stat-lbl">sessions</div></div>
        <div class="stat"><div class="stat-num">${fmtTon(monthVol)}</div><div class="stat-lbl">moved</div></div>
        <div class="stat"><div class="stat-num">${sleepAvg != null ? sleepAvg + 'h' : '—'}</div><div class="stat-lbl">sleep</div></div>
      </div>

      <div class="section-label">Measurements</div>
      ${measurementBlock(mNow, mThen)}

      <div class="section-label">This month’s job</div>
      <div class="card"><p class="lead">${nextJob(monthChange, tg)}</p></div>

      <div class="card"><p class="lead">📸 Snap a fresh photo on the Progress tab so next month’s comparison is ready.</p></div>

      <button class="btn" id="rv-done">Done</button>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 250); };
  overlay.querySelector('#rv-close').addEventListener('click', close);
  overlay.querySelector('#rv-done').addEventListener('click', close);
}

function coachRead(change, sessions, sleep, tg) {
  if (change == null) return `Not enough weight data yet. Weigh in every morning and next month I’ll show you exactly where the trend is heading. Sessions logged: ${sessions}.`;
  const goalLine = tg.toGoal != null && tg.toGoal > 0 ? `${tg.toGoal}kg to your ${tg.goalWeight}kg frame.` : `pushing on your ${tg.goalWeight}kg frame.`;
  if (change >= 0.5) return `Strong month. +${change}kg of trend weight across ${sessions} sessions, that’s real muscle going on. ${goalLine} Keep doing exactly this. 💪`;
  if (change >= 0) return `Slow month, +${change}kg. Not bad, but you’re a hardgainer, you grow on a surplus. The adaptive target is already pushing your calories up. Eat the extra. 🥤`;
  return `You dipped ${change}kg this month, that’s backwards for a bulk. No drama, it’s almost always under-eating. Calories go up, ${sleep != null && sleep < 7 ? 'and get that sleep above 7h. ' : ''}we fix this in 30 days.`;
}

function nextJob(change, tg) {
  if (change == null) return 'Log your weight daily and hit your calorie target. The data does the rest.';
  if (change < 0.15) return `Eat in a real surplus, your new target is <strong>${tg.cal} cal</strong>. Add a second smoothie on hard days. Protein stays at ${tg.protein}g.`;
  return `Hold the line: <strong>${tg.cal} cal · ${tg.protein}g protein</strong> daily, beat your logged lifts each week, sleep 7–9h. Simple, not easy.`;
}

function measurementBlock(now, then) {
  if (!now) return `<div class="card"><p class="lead">No measurements yet. Tape your shoulders, chest, arm and waist on the Progress tab, that’s your baseline.</p></div>`;
  const keys = ['shoulders', 'chest', 'arm', 'waist'];
  const rows = keys.filter(k => now[k] != null).map(k => {
    const d = (then && then[k] != null) ? Math.round((now[k] - then[k]) * 10) / 10 : null;
    const sign = d > 0 ? '+' : '';
    return `<div class="meas-row"><span>${k}</span><strong>${now[k]}cm</strong><span class="${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d != null ? `${sign}${d}` : ''}</span></div>`;
  }).join('');
  return `<div class="card">${rows || '<p class="lead">Add shoulder / chest / arm / waist to track the V-taper.</p>'}</div>`;
}

function fmtTon(kg) { return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)}kg`; }
