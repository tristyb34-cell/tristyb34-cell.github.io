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
async function pushSession(session) {
  const all = await getSessions();
  all.push(session);
  await db.set('sessions', all);
  return session;
}

/* ---------- the in-progress workout (survives refresh) ---------- */
export async function getActive() {
  return await db.get('active', null);
}
export async function startActive(workout) {
  const existing = await getActive();
  if (existing && existing.date === todayKey() && existing.dow === workout.dow) return existing;
  const active = { date: todayKey(), dow: workout.dow, title: workout.title, startedAt: Date.now(), log: {} };
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
  return a;
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
// Optional, one tap per exercise: stamp the same reps-in-reserve on every
// logged set of that exercise. easy=3, solid=1, all-out=0. Skippable.
export async function setEffort(exId, rir) {
  const a = await getActive();
  if (!a || !a.log[exId]) return null;
  const val = (rir === null || rir === '') ? null : Number(rir);
  a.log[exId] = a.log[exId].map(s => (s ? { ...s, rir: val } : s));
  await db.set('active', a);
  return a;
}

export async function finishActive() {
  const a = await getActive();
  if (!a) return null;
  const entries = Object.entries(a.log).map(([exId, sets]) => ({
    exId,
    sets: (sets || []).filter(s => s && (s.reps || s.weight)),
  })).filter(e => e.sets.length);
  const session = {
    date: a.date, dow: a.dow, title: a.title,
    startedAt: a.startedAt, finishedAt: Date.now(), entries,
  };
  await pushSession(session);
  await db.del('active');
  return session;
}
export async function discardActive() { await db.del('active'); }

/* ---------- progressive overload ---------- */
export function repTarget(reps) {
  const range = String(reps).match(/(\d+)\s*-\s*(\d+)/);
  if (range) return Number(range[2]);
  const one = String(reps).match(/(\d+)/);
  return one ? Number(one[1]) : 0;
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
  const re = await getReentry();

  if (!last) {
    return {
      headline: re.active ? 'First time · ease in' : 'First time',
      detail: re.active
        ? `You’re in re-entry (week ${re.week} of 3). Go lighter than your ego wants, leave 3 reps in the tank. Tendons before weight.`
        : `Pick a weight you could do for about ${item.reps} with 2 reps left in the tank. We build from there.`,
      last: null, suggestedWeight: null,
    };
  }

  const topW = Math.max(0, ...last.sets.map(s => s.weight || 0));
  const hitAll = last.sets.length >= item.sets && last.sets.every(s => (s.reps || 0) >= hi);
  const lastStr = last.sets.map(s => (s.weight ? `${s.weight}kg×${s.reps}` : `${s.reps}`)).join(', ');

  // hardest set's reps-in-reserve last time (null if he never logged RIR)
  const rirs = last.sets.map(s => s.rir).filter(v => v !== null && v !== undefined);
  const minRir = rirs.length ? Math.min(...rirs) : null;

  // re-entry caps the load: hold weight, build reps and connective tissue first
  if (re.active && ex.type === 'weight') {
    return { headline: `Hold ${topW}kg · re-entry`, detail: `Week ${re.week} of 3. Don’t chase weight yet, your muscles are ready but your tendons aren’t. Same load, clean reps.`, last, lastStr, suggestedWeight: topW };
  }

  if (ex.type === 'weight') {
    if (hitAll) {
      const detail = minRir !== null && minRir >= 2
        ? `You topped the range at ${topW}kg with ~${minRir} left in the tank. Add 2.5kg, maybe more.`
        : `You hit the top of the range at ${topW}kg last time. Add 2.5kg.`;
      return { headline: `Go heavier → ${topW + 2.5}kg`, detail, last, lastStr, suggestedWeight: topW + 2.5 };
    }
    // didn't top the range, but if it was clearly too easy, push anyway
    if (minRir !== null && minRir >= 3) {
      return { headline: `Go heavier → ${topW + 2.5}kg`, detail: `Last time you stopped with ${minRir} reps still in the tank, that’s too easy. Add the weight.`, last, lastStr, suggestedWeight: topW + 2.5 };
    }
    return { headline: `Beat ${topW}kg`, detail: `Same weight, more reps than last time. Then the weight goes up.`, last, lastStr, suggestedWeight: topW };
  }
  // bodyweight / timed
  return hitAll
    ? { headline: 'Add reps / time', detail: 'You topped the range. Push one more rep or a few more seconds.', last, lastStr, suggestedWeight: null }
    : { headline: 'Match or beat it', detail: 'Equal or better your last effort.', last, lastStr, suggestedWeight: null };
}
