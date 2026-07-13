/* ============================================================
   DAX — workout session logic + progressive-overload engine
   ============================================================ */
import { db } from './store.js';
import { LIBRARY } from './program.js';
import { getReentry } from './reentry.js';

const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/* ---------- completed sessions ---------- */
export async function getSessions() {
  return (await db.get('sessions', [])) || [];
}

// One session per date. Upsert (not push) so auto-save, finish, and boot-rescue
// can all touch the same day without ever creating a duplicate.
async function upsertSession(session) {
  const all = await getSessions();
  const i = all.findIndex(s => s.date === session.date);
  if (i >= 0) {
    const prev = all[i];
    // never downgrade: keep a finish stamp, and don't let a barer record clobber a richer one
    session.finishedAt = session.finishedAt || prev.finishedAt;
    if (prev.backfilled && !session.entries.length) return prev;
    if (prev.entries.length > session.entries.length && !session.finishedAt) return prev;
    all[i] = session;
  } else {
    all.push(session);
  }
  all.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
  await db.set('sessions', all);
  return session;
}

// Build a session record from the in-progress workout (shared by every save path).
function sessionFromActive(a, finished) {
  const entries = Object.entries(a.log).map(([exId, sets]) => ({
    exId,
    sets: (sets || []).filter(s => s && (s.reps || s.weight)),
  })).filter(e => e.sets.length);
  const s = { date: a.date, dow: a.dow, title: a.title, startedAt: a.startedAt, entries };
  if (a.planned != null) s.planned = a.planned;
  if (finished) s.finishedAt = Date.now();
  return s;
}

// "Showed up" = logged real work for at least half the planned exercises.
const MEANINGFUL_MIN = 2;
function isMeaningful(session) {
  const need = session.planned
    ? Math.max(MEANINGFUL_MIN, Math.ceil(session.planned / 2))
    : MEANINGFUL_MIN;
  return session.entries.length >= need;
}

/* ---------- the in-progress workout (survives refresh) ---------- */
export async function getActive() {
  return await db.get('active', null);
}
export async function startActive(workout) {
  const existing = await getActive();
  if (existing && existing.date === todayKey() && existing.dow === workout.dow) return existing;
  if (existing) await syncActiveToSessions(); // a new day must never overwrite an unsaved prior one
  const active = {
    date: todayKey(), dow: workout.dow, title: workout.title,
    startedAt: Date.now(), planned: (workout.items || []).length, log: {},
  };
  await db.set('active', active);
  return active;
}
export async function logSet(exId, setIndex, weight, reps, rir = null) {
  const a = await getActive();
  if (!a) return null;
  a.log[exId] = a.log[exId] || [];
  a.log[exId][setIndex] = {
    weight: weight === '' ? null : Number(weight),
    reps: Number(reps) || 0,
    rir: (rir === null || rir === '') ? null : Number(rir),
  };
  await db.set('active', a);
  await syncActiveToSessions(); // the fix: a real day saves itself, no Finish button required
  return a;
}

// Auto-save: once the day is meaningful it lives in sessions[] and can't be lost.
async function syncActiveToSessions() {
  const a = await getActive();
  if (!a) return null;
  const session = sessionFromActive(a, false);
  if (!isMeaningful(session)) return null;
  return upsertSession(session);
}

// Boot rescue: promote a meaningful workout that was left unfinished (e.g. one
// stranded by the old overwrite bug) so it counts even if Finish was never tapped.
export async function reconcileActive() {
  const a = await getActive();
  if (!a) return null;
  const session = sessionFromActive(a, false);
  const dates = new Set((await getSessions()).map(s => s.date));
  const promoted = isMeaningful(session) && !dates.has(a.date) ? await upsertSession(session) : null;
  // a leftover slot from a PAST day is done with; clear it so Today doesn't offer
  // to "continue" a stale workout. Never touch today's slot (he may be mid-set).
  if (a.date !== todayKey()) await db.del('active');
  return promoted;
}

// Backfill: mark a past scheduled day as attended (no set data survived).
export async function backfillSession(date, dow, title) {
  return upsertSession({ date, dow, title: title || 'Trained', entries: [], backfilled: true });
}
export async function removeBackfill(date) {
  const all = await getSessions();
  const s = all.find(x => x.date === date);
  if (!s || !s.backfilled) return false; // only ever remove an attendance mark, never real data
  await db.set('sessions', all.filter(x => x.date !== date));
  return true;
}

/* Estimated 1-rep-max (Epley), honest about reps left in the tank.
   A set stopped with 2 in reserve is really a heavier set than the bar says. */
export function e1rm(weight, reps, rir = 0) {
  if (!weight || !reps) return 0;
  const effReps = reps + (rir || 0);
  return weight * (1 + effReps / 30);
}
export function bestE1rm(entry) {
  return Math.max(0, ...entry.sets.map(s => e1rm(s.weight || 0, s.reps || 0, s.rir || 0)));
}
// Per-set reps-in-reserve (how close to failure that set was). Patch-only, so it
// can be set after logging without needing weight/reps again. 3 / 1 / 0 / null.
export async function setSetRir(exId, setIndex, rir) {
  const a = await getActive();
  if (!a || !a.log[exId] || !a.log[exId][setIndex]) return null;
  a.log[exId][setIndex].rir = (rir === null || rir === '') ? null : Number(rir);
  await db.set('active', a);
  return a;
}

export async function finishActive() {
  const a = await getActive();
  if (!a) return null;
  const session = sessionFromActive(a, true);
  await db.del('active');
  if (!session.entries.length) return null; // nothing logged → don't save an empty session
  await upsertSession(session);
  return session;
}
export async function discardActive() { await db.del('active'); }

/* Did this session beat the last time he trained each lift? Honest + intuitive:
   heavier top set = up; same weight but more total work (a set or reps added) = up.
   That catches both "went heavier" and "did more". RIR is deliberately ignored here
   so an effort tag can't masquerade as strength progress. bodyweight/timed compare
   best reps/seconds, then total. Compares to the most recent PRIOR session. */
function progressMetric(entry) {
  const ex = LIBRARY[entry.exId];
  const type = ex ? ex.type : 'weight';
  if (type === 'weight') {
    return { unit: 'kg', top: Math.max(0, ...entry.sets.map(s => s.weight || 0)),
      vol: entry.sets.reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0) };
  }
  return { unit: type === 'timed' ? 's' : ' reps', top: Math.max(0, ...entry.sets.map(s => s.reps || 0)),
    vol: entry.sets.reduce((a, s) => a + (s.reps || 0), 0) };
}
export function sessionProgress(current, sessions) {
  const prior = sessions.filter(s => s.date < current.date);
  const lines = [];
  for (const e of current.entries) {
    if (!e.sets || !e.sets.length) continue;
    let prev = null;
    for (let i = prior.length - 1; i >= 0; i--) {
      const pe = prior[i].entries.find(x => x.exId === e.exId && x.sets && x.sets.length);
      if (pe) { prev = pe; break; }
    }
    const now = progressMetric(e);
    if (!prev) { lines.push({ exId: e.exId, status: 'new', unit: now.unit, topNow: now.top }); continue; }
    const was = progressMetric(prev);
    let status, by = null;
    if (now.top > was.top) { status = 'up'; by = 'load'; }
    else if (now.top < was.top) { status = 'down'; by = 'load'; }
    else if (now.vol > was.vol) { status = 'up'; by = 'volume'; }
    else if (now.vol < was.vol) { status = 'down'; by = 'volume'; }
    else status = 'held';
    lines.push({ exId: e.exId, status, by, unit: now.unit, topNow: now.top, topWas: was.top });
  }
  return {
    lines,
    up: lines.filter(l => l.status === 'up').length,
    down: lines.filter(l => l.status === 'down').length,
    held: lines.filter(l => l.status === 'held').length,
    rated: lines.filter(l => l.status !== 'new').length,
  };
}

/* ---------- progressive overload ---------- */
export function repTarget(reps) {
  const range = String(reps).match(/(\d+)\s*-\s*(\d+)/);
  if (range) return Number(range[2]);
  const one = String(reps).match(/(\d+)/);
  return one ? Number(one[1]) : 0;
}
// bottom of the rep range (the number you drop back to after a weight jump)
export function repBottom(reps) {
  const range = String(reps).match(/(\d+)\s*-\s*(\d+)/);
  if (range) return Number(range[1]);
  const one = String(reps).match(/(\d+)/);
  return one ? Number(one[1]) : 0;
}

/* Smart weight jump per exercise. Machines and cables move in big stack plates,
   barbells in small plates, dumbbells in pairs. A flat 2.5kg is meaningless on a
   leg press and huge on a lateral raise, so the jump matches the tool. Editable
   per exercise (stored override wins). */
const INC_BY_EQUIP = {
  'machine': 5, 'cable': 5, 'barbell': 2.5, 'e-z curl bar': 2.5,
  'dumbbell': 2, 'kettlebells': 4, 'bands': 2.5, 'body only': 2.5,
};
const INC_OVERRIDE_ID = { 'Leg_Press': 10 }; // heavy stack, 5kg is barely a nudge
export async function weightIncrement(exId) {
  const ov = (await db.get('increments', {})) || {};
  if (ov[exId]) return Number(ov[exId]);
  if (INC_OVERRIDE_ID[exId]) return INC_OVERRIDE_ID[exId];
  const ex = LIBRARY[exId];
  return (ex && INC_BY_EQUIP[ex.equipment]) || 2.5;
}
export async function setIncrement(exId, kg) {
  const ov = (await db.get('increments', {})) || {};
  ov[exId] = Number(kg);
  await db.set('increments', ov);
  return ov;
}

export async function lastPerformance(exId) {
  const sessions = await getSessions();
  for (let i = sessions.length - 1; i >= 0; i--) {
    const e = sessions[i].entries.find(x => x.exId === exId && x.sets.length);
    if (e) return { date: sessions[i].date, sets: e.sets };
  }
  return null;
}

// `item` is a plan slot: { id, sets, reps, rest }. Exercise type comes from the library.
export async function suggestion(item) {
  const ex = LIBRARY[item.id];
  const last = await lastPerformance(item.id);
  const hi = repTarget(item.reps);
  const lo = repBottom(item.reps);
  const re = await getReentry();
  const inc = await weightIncrement(item.id);
  // how close to failure this session: ease off during re-entry, push once adapted
  const rirCue = re.active ? 'leave 2-3 reps in the tank' : 'leave 1-2 reps in the tank';
  const units = ex.type === 'timed' ? 'seconds' : 'reps';
  const base = { last, lastStr: null, lastWeight: null, suggestedWeight: null, repGoal: hi || null, readyToLevelUp: false, inc, lo, hi };

  if (!last) {
    return {
      ...base, last: null,
      headline: re.active ? 'First time · ease in' : 'First time',
      detail: re.active
        ? `You’re in the tendon block (week ${re.week} of ${re.totalWeeks}). Go lighter than your ego wants. Tendons before weight.`
        : `Pick a weight you could do for about ${item.reps} ${units}.`,
      target: `Aim for ${item.reps} ${units} and ${rirCue}. Whatever weight that is becomes your baseline to beat.`,
    };
  }

  const topW = Math.max(0, ...last.sets.map(s => s.weight || 0));
  const bestReps = Math.max(0, ...last.sets.map(s => s.reps || 0));
  const hitAll = last.sets.length >= item.sets && last.sets.every(s => (s.reps || 0) >= hi);
  const lastStr = last.sets.map(s => (s.weight ? `${s.weight}kg×${s.reps}` : `${s.reps}`)).join(', ');

  // hardest set's reps-in-reserve last time (null if he never logged RIR)
  const rirs = last.sets.map(s => s.rir).filter(v => v !== null && v !== undefined);
  const minRir = rirs.length ? Math.min(...rirs) : null;

  // tendon block weeks 1-2: hard hold on load, build reps and connective tissue first
  if (re.holdLoad && ex.type === 'weight') {
    return {
      ...base, lastStr, lastWeight: topW, suggestedWeight: topW,
      repGoal: Math.min(hi || bestReps + 1, bestReps + 1) || hi,
      headline: `Hold ${topW}kg · tendon block`,
      detail: `Week ${re.week} of ${re.totalWeeks}. Muscles are ready, tendons aren’t. Same load, clean reps.`,
      target: `Stay at ${topW}kg and build toward ${hi} ${units} on all ${item.sets} sets, ${rirCue}. Load climbs after the block.`,
    };
  }

  if (ex.type === 'weight') {
    const levelUp = hitAll || (minRir !== null && minRir >= 3);
    if (levelUp) {
      const detail = hitAll
        ? (minRir !== null && minRir >= 2
            ? `You topped the range at ${topW}kg with ~${minRir} still in the tank. Time to add weight.`
            : `You hit ${hi} on every set at ${topW}kg. Range beaten — level up.`)
        : `Last time you stopped with ${minRir} reps still in the tank. That’s too easy — go up.`;
      return {
        ...base, lastStr, lastWeight: topW, suggestedWeight: topW + inc, repGoal: lo || null, readyToLevelUp: true,
        headline: `Level up → ${topW + inc}kg`, detail,
        target: `Add ${inc}kg to ${topW + inc}kg and start climbing the reps again from ${lo}, ${rirCue}.`,
      };
    }
    // stay at the weight, beat the reps (double progression)
    return {
      ...base, lastStr, lastWeight: topW, suggestedWeight: topW, repGoal: Math.min(hi || bestReps + 1, bestReps + 1) || hi,
      headline: `Beat ${topW}kg × ${bestReps}`,
      detail: 'Same weight, one more rep than last time.',
      target: `Stay at ${topW}kg and push every set toward ${hi} ${units} (${rirCue}). Top the range and next time you add ${inc}kg.`,
    };
  }
  // bodyweight / timed
  return hitAll
    ? { ...base, lastStr, repGoal: (bestReps + 1) || hi, headline: 'Add reps / time', detail: 'You topped the range.', target: `Beat ${hi} ${units} on your best set, ${rirCue}.` }
    : { ...base, lastStr, repGoal: hi, headline: 'Match or beat it', detail: 'Equal or better your last effort.', target: `Push toward ${hi} ${units} per set, close to failure.` };
}
