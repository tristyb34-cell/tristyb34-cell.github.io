import { db, exportBackup } from '../store.js';
import { commandmentOfTheDay, whyOfTheDay, GOAL } from '../data.js';
import { getPhase, advancePhase, PHASES } from '../phase.js';
import { openWhy } from '../why.js';
import { openCost } from '../cost.js';
import { LIBRARY, estimateMinutes } from '../program.js';
import { getPlan, dayForToday } from '../plan.js';
import { getActive } from '../workouts.js';
import { renderSession } from '../session.js';
import { openEditor } from '../editor.js';
import { openDayPreview } from './plan.js';
import { buildContext, greeting, nudges, checkMilestones } from '../motivation.js';
import { evaluateAdaptive } from '../profile.js';
import { openReview } from '../review.js';
import { getReentry, applyOnramp, onrampNote } from '../reentry.js';
import { treeUnlocked, TREE_UNLOCK_AT } from '../skills.js';
import { openSkillTree } from '../skilltree.js';
import { reminderSettings, enable as enableNotify, disable as disableNotify, fireDueReminders, pushSupported, getPushSubscriptionJSON } from '../notify.js';
import { getGamePlan, planText, openGamePlan } from '../gameplan.js';
import { openWeeklyReview } from '../weekreview.js';
import { journalPrompt, markJournalPrompted } from '../journal.js';
import { computeConsistency, consistencyCoach } from '../consistency.js';
import { dailyArticle, openArticle } from '../knowledge.js';

// strip a session to its big lifts so a "can't be bothered" day still happens
function quickVersion(day) {
  return {
    ...day,
    title: `${day.title} · quick`,
    items: day.items.slice(0, 3).map(it => ({ ...it, sets: Math.min(2, it.sets) })),
  };
}

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
  const lastWeekReview = await db.get('lastWeekReview', null);
  const backupDue = (ctx.totalWorkouts >= 5 || photos.length > 0) && (!lastBackup || daysBetween(lastBackup, ctx.now) >= 14);
  const reviewDue = ctx.totalWorkouts >= 8 && (!lastReview || daysBetween(lastReview, ctx.now) >= 30);
  const weekReviewDue = ctx.totalWorkouts >= 3 && (!lastWeekReview || daysBetween(lastWeekReview, ctx.now) >= 7);
  const re = await getReentry();
  const trainDay = applyOnramp(day, re); // first 3 weeks back: same day, reduced volume
  const treeOpen = treeUnlocked(ctx.totalWorkouts);
  const gp = await getGamePlan();
  const phase = await getPhase();
  const jPrompt = await journalPrompt();
  const cons = await computeConsistency();

  const reentryHtml = re.active
    ? `<div class="nudge reentry-nudge"><span class="nudge-ic">🛡️</span><span>${re.notStarted
        ? 'Tendon block: a 6-week ramp. Muscles remember in weeks, tendons take months. Ego later.'
        : re.holdLoad
          ? `Tendon block · week ${re.week} of ${re.totalWeeks}. Weights held, form first. Your tissue is catching up to your strength.`
          : `Tendon block · week ${re.week} of ${re.totalWeeks}. Climbing now, but stay honest, ${re.daysLeft} days till the brakes are fully off.`}</span></div>`
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
  const weekReviewHtml = weekReviewDue ? `<div class="nudge action-nudge"><span class="nudge-ic">📅</span><span>Your week in review is ready, see the last 7 days.</span><button class="mini-btn" id="open-weekreview">Open</button></div>` : '';
  const gameplanHtml = `
    <div class="section-label">Protein game plan</div>
    ${gp.length
      ? `<div class="card gp-card">
          <ul class="gp-active">${gp.map(id => `<li>${planText(id)}</li>`).join('')}</ul>
          <button class="btn ghost" id="gp-edit" aria-haspopup="dialog">Edit my plan</button>
        </div>`
      : `<div class="card">
          <p class="lead" style="margin-bottom:12px;">Willpower fades, a plan doesn’t. Set a few if-then rules and you’ll hit protein without thinking about it.</p>
          <button class="btn" id="gp-edit" aria-haspopup="dialog">Set my protein game plan</button>
        </div>`}`;
  const backupHtml = backupDue ? `<div class="nudge action-nudge"><span class="nudge-ic">💾</span><span>You’ve got real data now. Back it up so it can never vanish.</span><button class="mini-btn" id="do-backup">Back up</button></div>` : '';
  const journalHtml = jPrompt ? `<div class="nudge action-nudge"><span class="nudge-ic" aria-hidden="true">📓</span><span>${jPrompt.text}</span><button class="mini-btn" id="journal-check">Check in</button></div>` : '';

  // the keystone metric: showing up. Big, daily, framed as the ONLY scoreboard.
  const goalLabel = new Date(cons.goalDate + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const streakPill = cons.streak >= 1
    ? `<span class="pill"><span aria-hidden="true">🔥</span> Streak ${cons.streak}</span>`
    : `<span class="pill">Streak 0</span>`;
  const consistencyHtml = `
    <div class="card consistency-card">
      <div class="eyebrow">The only scoreboard right now</div>
      ${cons.started ? `
        <div class="cons-top">
          <div class="cons-pct">${cons.pct == null ? '—' : `${cons.pct}<span class="cons-unit">%</span>`}</div>
          <div class="cons-meta">
            <div class="cons-label">shown up · last 30 days</div>
            <div class="cons-pills">
              <span class="pill accent">This week ${cons.weekDone}/${cons.target}</span>
              ${streakPill}
            </div>
          </div>
        </div>
        <p class="cons-goal">Your only job till ${goalLabel}: show up. Even when it sucks.</p>
      ` : `
        <div class="cons-bigtitle">Just show up.</div>
        <p class="lead">Your only job for the next 90 days is to walk in on your training days. Not heavy, not long. Just there. The first session is the one that counts.</p>
      `}
      <p class="cons-coach">${consistencyCoach(cons)}</p>
    </div>`;

  // where you are in the build/cut cycle (phase identity is carried in the words + icon, never colour alone)
  const phaseHtml = `
    <div class="phase-strip">
      <span class="phase-ic" aria-hidden="true">${phase.icon}</span>
      <div class="phase-meta">
        <div class="phase-label">${phase.label}</div>
        <div class="phase-sub">${phase.blurb}</div>
      </div>
    </div>`;
  const advLabels = { overshoot: 'Build past it', cut: 'Start cut', bridge: 'Ease off', build: 'Resume build' };
  const phaseSuggestHtml = phase.suggest
    ? `<div class="nudge action-nudge"><span class="nudge-ic">${PHASES[phase.suggest.to].icon}</span><span>${phase.suggest.why}</span><button class="mini-btn" id="phase-advance">${advLabels[phase.suggest.to] || 'Switch'}</button></div>`
    : '';
  const whyOnly = whyOfTheDay();
  const whyBannerHtml = !day
    ? `<div class="nudge why-banner"><span class="nudge-ic" aria-hidden="true">🛡️</span><span><strong>${whyOnly.head}.</strong> ${whyOnly.text}</span></div>`
    : '';
  const whyHtml = `
    <div class="section-label">Beyond the mirror</div>
    <button class="ex-card why-card" id="open-why" aria-haspopup="dialog">
      <div class="calis-icon" aria-hidden="true">🛡️</div>
      <div class="ex-meta">
        <div class="ex-name">My Why</div>
        <div class="ex-sub">${whyOnly.head}</div>
      </div>
      <div class="ex-status" aria-hidden="true">›</div>
    </button>`;
  const costHtml = `
    <div class="section-label">Know the cost</div>
    <button class="ex-card" id="open-cost" aria-haspopup="dialog">
      <div class="calis-icon" aria-hidden="true">⚖️</div>
      <div class="ex-meta">
        <div class="ex-name">Know the cost</div>
        <div class="ex-sub">What one slip does, vs ten. No fear, just facts.</div>
      </div>
      <div class="ex-status" aria-hidden="true">›</div>
    </button>`;

  // a fresh lesson every day, biased to today's muscles if it's a training day
  const lesson = dailyArticle(DOW[new Date().getDay()]);
  const lessonHtml = `
    <div class="section-label">Today’s lesson</div>
    <button class="ex-card lesson-card" id="open-lesson" aria-haspopup="dialog">
      <div class="calis-icon" aria-hidden="true">${lesson.icon || '📚'}</div>
      <div class="ex-meta">
        <div class="ex-name">${lesson.title}</div>
        <div class="ex-sub">${lesson.teaser}</div>
      </div>
      <div class="ex-status" aria-hidden="true">›</div>
    </button>`;

  let mid;
  if (day) {
    const mins = estimateMinutes(trainDay);
    const continuing = active && active.dow === trainDay.dow && Object.keys(active.log || {}).length;
    mid = `
      <div class="card card-hero card-tap" id="today-card">
        <div class="eyebrow">${today} • Training day</div>
        <h1 class="screen-title">${trainDay.title}</h1>
        <div style="margin:14px 0 4px; display:flex; gap:8px; flex-wrap:wrap;">
          <span class="pill accent">~${mins} min</span>
          <span class="pill">${trainDay.items.length} exercises</span>
        </div>
        <ul class="mini-list">${trainDay.items.map(it => `<li>${LIBRARY[it.id] ? LIBRARY[it.id].name : it.id} <span style="opacity:.55; font-variant-numeric:tabular-nums;">${it.sets}×${it.reps}</span></li>`).join('')}</ul>
        <div class="tap-hint">👁 Tap to preview all exercises ›</div>
        ${trainDay.onrampWeek ? `<p class="onramp-note">${onrampNote(trainDay.onrampWeek)}</p>` : ''}
      </div>
      <button class="btn" id="start">${continuing ? '▶︎ Continue workout' : '⚡ Start workout'}</button>
      <div style="height:10px;"></div>
      ${continuing ? '' : '<button class="btn ghost" id="quick">😮‍💨 Can’t be bothered? Give me the 15-min version</button><div style="height:10px;"></div>'}
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

  root.innerHTML = coachHtml + consistencyHtml + phaseHtml + phaseSuggestHtml + reentryHtml + adaptiveHtml + journalHtml + weekReviewHtml + reviewHtml + backupHtml + nudgeHtml + mid + lessonHtml + whyBannerHtml + whyHtml + costHtml + gameplanHtml + calisHtml + remindersCard(rem);

  // wiring
  const startBtn = root.querySelector('#start');
  if (startBtn) startBtn.addEventListener('click', () => renderSession(root, trainDay));
  const quickBtn = root.querySelector('#quick');
  if (quickBtn) quickBtn.addEventListener('click', () => renderSession(root, quickVersion(trainDay)));
  const gpEdit = root.querySelector('#gp-edit');
  if (gpEdit) gpEdit.addEventListener('click', () => openGamePlan(gpEdit, () => paintToday(root)));
  const todayCard = root.querySelector('#today-card');
  if (todayCard) todayCard.addEventListener('click', () => openDayPreview(root, day.dow, () => paintToday(root)));
  const nextCard = root.querySelector('#nextup-card');
  if (nextCard) {
    const nt = nextTrainingDay(plan);
    if (nt) nextCard.addEventListener('click', () => openDayPreview(root, nt.day.dow, () => paintToday(root)));
  }
  root.querySelector('#edit').addEventListener('click', () => openEditor(root));
  root.querySelector('#calis').addEventListener('click', () => openSkillTree(root));
  const phaseBtn = root.querySelector('#phase-advance');
  if (phaseBtn) phaseBtn.addEventListener('click', async () => { await advancePhase(phase.suggest.to); paintToday(root); });
  const whyBtn = root.querySelector('#open-why');
  if (whyBtn) whyBtn.addEventListener('click', () => openWhy(whyBtn, () => paintToday(root)));
  const costBtn = root.querySelector('#open-cost');
  if (costBtn) costBtn.addEventListener('click', () => openCost(costBtn, () => paintToday(root)));
  const lessonBtn = root.querySelector('#open-lesson');
  if (lessonBtn) lessonBtn.addEventListener('click', () => openArticle(lesson.id)); // no repaint: focus returns to this card on close
  const jBtn = root.querySelector('#journal-check');
  if (jBtn) jBtn.addEventListener('click', () => {
    sessionStorage.setItem('dax_focus_journal', '1'); // tell Journal to focus the box on arrival
    window.dispatchEvent(new CustomEvent('dax:navigate', { detail: 'journal' }));
  });
  const rv = root.querySelector('#open-review');
  if (rv) rv.addEventListener('click', () => openReview(root));
  const wrv = root.querySelector('#open-weekreview');
  if (wrv) wrv.addEventListener('click', () => openWeeklyReview(root, wrv));
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
    btn.addEventListener('click', () => renderSession(root, applyOnramp(plan.find(s => s.dow === btn.dataset.dow), re))));
  wireReminders(root);

  // celebrate any freshly-earned milestones
  const fresh = await checkMilestones(ctx);
  if (fresh.length) celebrate(fresh);

  // start the journal-prompt cooldown so it doesn't reappear every session
  if (jPrompt) markJournalPrompted();
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
  const pushSetup = pushSupported()
    ? `<details class="push-setup">
        <summary>Finish background push (one-time)</summary>
        <p class="coach-last" style="margin:8px 0 10px;">Copy this code and send it to Claude to switch on real notifications that buzz even when DAX is closed.</p>
        <label for="push-sub" class="push-label">Your push code</label>
        <textarea id="push-sub" class="push-sub" readonly rows="4" aria-label="Your push subscription code">Loading…</textarea>
        <button class="btn ghost" id="push-copy">Copy code</button>
      </details>`
    : '';
  return `
    <div class="section-label">Coach reminders · on</div>
    <div class="card">
      <p class="lead" style="margin-bottom:12px;">Your timetable lives in <strong>Fuel → Times</strong>. Edit any time there.</p>
      ${pushSetup}
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

  const subTa = root.querySelector('#push-sub');
  if (subTa) getPushSubscriptionJSON().then(json => { subTa.value = json || 'No code yet, turn reminders off and on again to generate it.'; });
  const copyBtn = root.querySelector('#push-copy');
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    const ta = root.querySelector('#push-sub');
    try { await navigator.clipboard.writeText(ta.value); }
    catch (_) { ta.select(); try { document.execCommand('copy'); } catch (e) {} }
    copyBtn.textContent = 'Copied ✓';
    setTimeout(() => { copyBtn.textContent = 'Copy code'; }, 1500);
  });
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
    <div class="card card-hero card-tap" id="nextup-card">
      <div class="eyebrow">${when} • ${day.dow}</div>
      <h2 class="screen-title" style="font-size:24px;">${day.title}</h2>
      <div style="margin:12px 0 4px; display:flex; gap:8px; flex-wrap:wrap;">
        <span class="pill accent">~${mins} min</span>
        <span class="pill">${day.items.length} exercises</span>
      </div>
      <ul class="mini-list">${list}</ul>
      <p class="coach-last" style="margin:10px 0 0;">Come in fed and warmed up. Picture the session before you walk in.</p>
      <div class="tap-hint">👁 Tap to preview all exercises ›</div>
    </div>`;
}
