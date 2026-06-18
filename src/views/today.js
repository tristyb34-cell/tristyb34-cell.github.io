import { db, exportBackup } from '../store.js';
import { commandmentOfTheDay, GOAL } from '../data.js';
import { LIBRARY, estimateMinutes } from '../program.js';
import { getPlan, dayForToday } from '../plan.js';
import { getActive } from '../workouts.js';
import { renderSession } from '../session.js';
import { openEditor } from '../editor.js';
import { openDayPreview } from './plan.js';
import { buildContext, greeting, nudges, checkMilestones } from '../motivation.js';
import { evaluateAdaptive } from '../profile.js';
import { openReview } from '../review.js';
import { getReentry } from '../reentry.js';
import { treeUnlocked, TREE_UNLOCK_AT } from '../skills.js';
import { openSkillTree } from '../skilltree.js';
import { reminderSettings, enable as enableNotify, disable as disableNotify, fireDueReminders } from '../notify.js';

const daysBetween = (iso, now) => (now - new Date(iso + 'T00:00:00')) / 86400000;

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function renderToday() {
  return { html: '', onMount: (root) => paintToday(root) };
}
export async function mountToday(root) { return paintToday(root); }

async function paintToday(root) {
  const c = commandmentOfTheDay();
  const today = DAYS[new Date().getDay()];
  const plan = await getPlan();
  const day = await dayForToday();
  const active = await getActive();
  const ctx = await buildContext();
  fireDueReminders(ctx);
  const rem = await reminderSettings();
  const adaptive = await evaluateAdaptive();

  // backup + review prompts
  const photos = (await db.get('photos', [])) || [];
  const lastBackup = await db.get('lastBackup', null);
  const lastReview = await db.get('lastReview', null);
  const backupDue = (ctx.totalWorkouts >= 5 || photos.length > 0) && (!lastBackup || daysBetween(lastBackup, ctx.now) >= 14);
  const reviewDue = ctx.totalWorkouts >= 8 && (!lastReview || daysBetween(lastReview, ctx.now) >= 30);
  const re = await getReentry();
  const treeOpen = treeUnlocked(ctx.totalWorkouts);

  const reentryHtml = re.active
    ? `<div class="nudge reentry-nudge"><span class="nudge-ic">🛡️</span><span>${re.notStarted
        ? 'Re-entry mode: your first 3 weeks ramp gently. Muscles remember fast, tendons don’t. Ego later.'
        : `Re-entry · week ${re.week} of 3. Weights held, form first. ${re.daysLeft} days to full intensity.`}</span></div>`
    : '';
  const calisHtml = `
    <div class="section-label">Calisthenics</div>
    <button class="ex-card calis-card" id="calis">
      <div class="calis-icon">${treeOpen ? '🌳' : '🔒'}</div>
      <div class="ex-meta">
        <div class="ex-name">Skill tree${treeOpen ? ' · unlocked' : ''}</div>
        <div class="ex-sub">${treeOpen ? 'Grind progressions toward pull-ups, dips, muscle-ups.' : `${ctx.totalWorkouts}/${TREE_UNLOCK_AT} sessions to unlock`}</div>
      </div>
      <div class="ex-status">›</div>
    </button>`;

  const coachHtml = `
    <div class="coach-banner">
      <div class="coach-eyebrow">YOUR COACH</div>
      <div class="coach-msg">${greeting(ctx)}</div>
    </div>`;
  const adaptiveHtml = adaptive ? `<div class="nudge accent-nudge"><span class="nudge-ic">⚖️</span><span>${adaptive.message}</span></div>` : '';
  const nudgeHtml = nudges(ctx).map(n =>
    `<div class="nudge"><span class="nudge-ic">${n.icon}</span><span>${n.text}</span></div>`).join('');
  const reviewHtml = reviewDue ? `<div class="nudge action-nudge"><span class="nudge-ic">📋</span><span>Your monthly review is ready. See the month in one place.</span><button class="mini-btn" id="open-review">Open</button></div>` : '';
  const backupHtml = backupDue ? `<div class="nudge action-nudge"><span class="nudge-ic">💾</span><span>You’ve got real data now. Back it up so it can never vanish.</span><button class="mini-btn" id="do-backup">Back up</button></div>` : '';

  let mid;
  if (day) {
    const mins = estimateMinutes(day);
    const continuing = active && active.dow === day.dow && Object.keys(active.log || {}).length;
    mid = `
      <div class="card card-hero">
        <div class="eyebrow">${today} • Training day</div>
        <h1 class="screen-title">${day.title}</h1>
        <div style="margin:14px 0 4px; display:flex; gap:8px; flex-wrap:wrap;">
          <span class="pill accent">~${mins} min</span>
          <span class="pill">${day.items.length} exercises</span>
        </div>
        <ul class="mini-list">${day.items.map(it => `<li>${LIBRARY[it.id] ? LIBRARY[it.id].name : it.id} <span style="opacity:.55; font-variant-numeric:tabular-nums;">${it.sets}×${it.reps}</span></li>`).join('')}</ul>
      </div>
      <button class="btn ghost" id="preview">👁 Preview the exercises</button>
      <div style="height:10px;"></div>
      <button class="btn" id="start">${continuing ? '▶︎ Continue workout' : '⚡ Start workout'}</button>
      <div style="height:10px;"></div>
      <button class="btn ghost" id="edit">✎ Edit my plan</button>
      <div class="commandment"><span class="num">${c.num}.</span><em>${c.text}</em></div>`;
  } else {
    mid = `
      <div class="card card-hero">
        <div class="eyebrow">${today} • Recovery day</div>
        <h1 class="screen-title">Grow in the rest.</h1>
        <p class="lead">No lifting today. Muscle is built now, not in the gym. Eat big, sleep hard, show up tomorrow.</p>
        <div style="margin-top:14px; display:flex; gap:8px; flex-wrap:wrap;">
          <span class="pill accent">Goal: ${GOAL.targetWeight}kg lean</span>
          <span class="pill">${GOAL.dailyCalories} cal</span>
          <span class="pill">${GOAL.dailyProtein}g protein</span>
        </div>
      </div>
      <div class="commandment"><span class="num">${c.num}.</span><em>${c.text}</em></div>
      ${nextUpCard(plan)}
      <div class="section-label">Browse the week</div>
      <div class="ex-list">
        ${plan.map(s => `
          <button class="ex-card" data-dow="${s.dow}">
            <div class="ex-meta"><div class="ex-name">${s.dow} · ${s.title}</div>
              <div class="ex-sub">${s.items.length} exercises · ~${estimateMinutes(s)} min</div></div>
            <div class="ex-status">›</div>
          </button>`).join('')}
      </div>
      <div style="height:6px;"></div>
      <button class="btn ghost" id="edit">✎ Edit my plan</button>`;
  }

  root.innerHTML = coachHtml + reentryHtml + adaptiveHtml + reviewHtml + backupHtml + nudgeHtml + mid + calisHtml + remindersCard(rem);

  // wiring
  const startBtn = root.querySelector('#start');
  if (startBtn) startBtn.addEventListener('click', () => renderSession(root, day));
  const previewBtn = root.querySelector('#preview');
  if (previewBtn) previewBtn.addEventListener('click', () => openDayPreview(root, day, () => paintToday(root)));
  const previewNext = root.querySelector('#preview-next');
  if (previewNext) {
    const nt = nextTrainingDay(plan);
    previewNext.addEventListener('click', () => openDayPreview(root, nt ? nt.day : null, () => paintToday(root)));
  }
  root.querySelector('#edit').addEventListener('click', () => openEditor(root));
  root.querySelector('#calis').addEventListener('click', () => openSkillTree(root));
  const rv = root.querySelector('#open-review');
  if (rv) rv.addEventListener('click', () => openReview(root));
  const bk = root.querySelector('#do-backup');
  if (bk) bk.addEventListener('click', async () => {
    const json = await exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `dax-backup-${ctx.now.toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    await db.set('lastBackup', ctx.now.toISOString().slice(0, 10));
    paintToday(root);
  });
  root.querySelectorAll('.ex-card[data-dow]').forEach(btn =>
    btn.addEventListener('click', () => renderSession(root, plan.find(s => s.dow === btn.dataset.dow))));
  wireReminders(root);

  // celebrate any freshly-earned milestones
  const fresh = await checkMilestones(ctx);
  if (fresh.length) celebrate(fresh);
}

/* ---------- reminders settings card ---------- */
function remindersCard(rem) {
  if (rem.perm === 'unsupported') return '';
  if (!rem.on) {
    return `
      <div class="section-label">Coach reminders</div>
      <div class="card">
        <p class="lead" style="margin-bottom:12px;">Get nudged to eat, take creatine, and train at your set times (when you open the app and one’s due).</p>
        <button class="btn" id="notify-on">🔔 Turn on coach reminders</button>
        <p class="coach-last" style="margin-top:10px;">Best-effort: fires when you open the app. For guaranteed buzzes, also set a couple of iPhone alarms. Edit times in Fuel → Times.</p>
      </div>`;
  }
  return `
    <div class="section-label">Coach reminders · on</div>
    <div class="card">
      <p class="lead" style="margin-bottom:12px;">Your timetable lives in <strong>Fuel → Times</strong>. Edit any time there.</p>
      <button class="btn ghost" id="notify-off">Turn off reminders</button>
    </div>`;
}
function wireReminders(root) {
  const on = root.querySelector('#notify-on');
  if (on) on.addEventListener('click', async () => {
    const p = await enableNotify();
    if (p === 'denied') alert('Notifications are blocked. Enable them for DAX in your phone settings, then try again.');
    paintToday(root);
  });
  const off = root.querySelector('#notify-off');
  if (off) off.addEventListener('click', async () => { await disableNotify(); paintToday(root); });
}

/* ---------- milestone celebration ---------- */
function celebrate(list) {
  const m = list[0]; // show the biggest fresh one; rest persist as earned
  const overlay = document.createElement('div');
  overlay.id = 'celebrate';
  overlay.innerHTML = `
    <div class="celebrate-card">
      <div class="celebrate-glyph">🏆</div>
      <div class="celebrate-title">${m.title}</div>
      <div class="celebrate-body">${m.body}</div>
      ${list.length > 1 ? `<div class="celebrate-extra">+${list.length - 1} more unlocked</div>` : ''}
      <button class="btn" id="celebrate-close">Let’s go 💪</button>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 250); };
  overlay.querySelector('#celebrate-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

// the next training day on the calendar, with a human "when" label
function nextTrainingDay(plan) {
  const trainingDows = plan.map(p => p.dow);
  const idx = new Date().getDay();
  for (let i = 1; i <= 7; i++) {
    const d = DOW[(idx + i) % 7];
    if (trainingDows.includes(d)) {
      const day = plan.find(x => x.dow === d);
      const when = i === 1 ? 'Tomorrow' : `In ${i} days`;
      return { day, when };
    }
  }
  return null;
}

// rest-day "next up" prep block: shows the next session's full exercise list so he can mentally prepare
function nextUpCard(plan) {
  const next = nextTrainingDay(plan);
  if (!next) return '';
  const { day, when } = next;
  const mins = estimateMinutes(day);
  const list = day.items.map(it => {
    const ex = LIBRARY[it.id];
    return `<li>${ex ? ex.name : it.id} <span style="opacity:.55; font-variant-numeric:tabular-nums;">${it.sets}×${it.reps}</span></li>`;
  }).join('');
  return `
    <div class="section-label">Next up — prep for it</div>
    <div class="card card-hero">
      <div class="eyebrow">${when} • ${day.dow}</div>
      <h2 class="screen-title" style="font-size:24px;">${day.title}</h2>
      <div style="margin:12px 0 4px; display:flex; gap:8px; flex-wrap:wrap;">
        <span class="pill accent">~${mins} min</span>
        <span class="pill">${day.items.length} exercises</span>
      </div>
      <ul class="mini-list">${list}</ul>
      <p class="coach-last" style="margin:10px 0 12px;">Come in fed and warmed up. Picture the session before you walk in.</p>
      <button class="btn ghost" id="preview-next">👁 Preview the exercises</button>
    </div>`;
}
