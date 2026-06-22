/* ============================================================
   DAX — weekly review
   The last 7 days at a glance: sessions, protein consistency,
   tonnage, weight trend, and one job for next week. Lighter and
   more frequent than the monthly review. Later, Batch G pushes
   this to his phone every Sunday night.
   ============================================================ */
import { db } from './store.js';
import { getSessions } from './workouts.js';
import { getTargets, trendWeight } from './profile.js';
import { dayTotals } from './nutrition.js';

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const iso = (d) => d.toISOString().slice(0, 10);

export async function weeklyStats() {
  const weighins = (await db.get('weighins', [])) || [];
  const foodlogs = (await db.get('foodlog', {})) || {};
  const sessions = await getSessions();
  const tg = await getTargets();
  const cutoff = iso(daysAgo(7));

  const weekSessions = sessions.filter(s => s.date >= cutoff);
  let tonnage = 0;
  for (const s of weekSessions) for (const e of s.entries) for (const st of e.sets) tonnage += (st.weight || 0) * (st.reps || 0);

  let proteinDays = 0;
  for (let i = 0; i < 7; i++) {
    const log = foodlogs[iso(daysAgo(i))];
    if (log && dayTotals(log).protein >= tg.protein) proteinDays++;
  }

  const olderW = weighins.filter(w => w.date < cutoff);
  const trendNow = trendWeight(weighins);
  const trendThen = olderW.length ? trendWeight(olderW.slice(-7)) : null;
  const weightChange = (trendNow != null && trendThen != null) ? Math.round((trendNow - trendThen) * 10) / 10 : null;

  return { sessions: weekSessions.length, tonnage, proteinDays, weightChange, tg };
}

function coachRead(s) {
  const bits = [];
  if (s.sessions >= 4) bits.push(`${s.sessions} sessions in, that’s a full week. Respect.`);
  else if (s.sessions > 0) bits.push(`${s.sessions} session${s.sessions === 1 ? '' : 's'} this week, every one counts.`);
  else bits.push('No sessions logged this week. The chain starts again Monday, no drama.');
  if (s.proteinDays >= 5) bits.push(`Protein hit ${s.proteinDays}/7 days, that’s how muscle gets built.`);
  else bits.push(`Protein landed ${s.proteinDays}/7 days, the real lever to grab next week.`);
  if (s.weightChange != null) bits.push(s.weightChange > 0 ? `Trend up ${s.weightChange}kg, the surplus is working.` : 'Weight trend flat, more food next week.');
  return bits.join(' ');
}

function nextJob(s) {
  if (s.proteinDays < 5) return 'Hit protein 6 of 7 days. Lean on your game plan, that one habit moves everything.';
  if (s.sessions < 3) return 'Get all your training days in. Even the 15-minute version keeps the chain alive.';
  if (s.weightChange != null && s.weightChange <= 0) return 'Add a second smoothie or a bigger dinner, the scale wants to move.';
  return 'Keep doing exactly this. Add a rep or a kilo where you can. Boring consistency wins.';
}

export async function openWeeklyReview(root, triggerBtn) {
  const s = await weeklyStats();
  await db.set('lastWeekReview', iso(new Date()));
  const prevFocus = triggerBtn || document.activeElement;

  const o = document.createElement('div');
  o.id = 'weekreview';
  o.className = 'overlay-sheet';
  o.setAttribute('role', 'dialog');
  o.setAttribute('aria-modal', 'true');
  o.setAttribute('aria-labelledby', 'wr-title');
  o.innerHTML = `
    <div class="sheet-inner">
      <button class="back-btn" id="wr-close">‹ Close</button>
      <div class="eyebrow">Last 7 days</div>
      <h1 class="screen-title" id="wr-title">Weekly review</h1>

      <div class="card card-hero">
        <div class="coach-eyebrow">YOUR COACH</div>
        <div class="coach-msg">${coachRead(s)}</div>
      </div>

      <div class="stat-grid">
        <div class="stat"><div class="stat-num">${s.sessions}</div><div class="stat-lbl">sessions</div></div>
        <div class="stat"><div class="stat-num">${s.proteinDays}/7</div><div class="stat-lbl">protein days</div></div>
        <div class="stat"><div class="stat-num">${s.tonnage >= 1000 ? `${(s.tonnage / 1000).toFixed(1)}t` : `${Math.round(s.tonnage)}kg`}</div><div class="stat-lbl">moved</div></div>
        <div class="stat"><div class="stat-num">${s.weightChange != null ? `${s.weightChange >= 0 ? '+' : ''}${s.weightChange}` : '—'}</div><div class="stat-lbl">kg trend</div></div>
      </div>

      <div class="section-label">Next week’s job</div>
      <div class="card"><p class="lead">${nextJob(s)}</p></div>

      <button class="btn" id="wr-done">Done</button>
    </div>`;
  document.body.appendChild(o);
  requestAnimationFrame(() => o.classList.add('show'));

  function close() {
    document.removeEventListener('keydown', onKey);
    o.classList.remove('show');
    setTimeout(() => o.remove(), 250);
    if (prevFocus && prevFocus.focus) prevFocus.focus();
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);
  o.querySelector('#wr-close').addEventListener('click', close);
  o.querySelector('#wr-done').addEventListener('click', close);
  o.querySelector('#wr-close').focus();
}
