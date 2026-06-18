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
export async function logSet(exId, setIndex, weight, reps) {
  const a = await getActive();
  if (!a) return null;
  a.log[exId] = a.log[exId] || [];
  a.log[exId][setIndex] = { weight: weight === '' ? null : Number(weight), reps: Number(reps) || 0 };
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

  // re-entry caps the load: hold weight, build reps and connective tissue first
  if (re.active && ex.type === 'weight') {
    return { headline: `Hold ${topW}kg · re-entry`, detail: `Week ${re.week} of 3. Don’t chase weight yet, your muscles are ready but your tendons aren’t. Same load, clean reps.`, last, lastStr, suggestedWeight: topW };
  }

  if (ex.type === 'weight') {
    return hitAll
      ? { headline: `Go heavier → ${topW + 2.5}kg`, detail: `You hit the top of the range at ${topW}kg last time. Add 2.5kg.`, last, lastStr, suggestedWeight: topW + 2.5 }
      : { headline: `Beat ${topW}kg`, detail: `Same weight, more reps than last time. Then the weight goes up.`, last, lastStr, suggestedWeight: topW };
  }
  // bodyweight / timed
  return hitAll
    ? { headline: 'Add reps / time', detail: 'You topped the range. Push one more rep or a few more seconds.', last, lastStr, suggestedWeight: null }
    : { headline: 'Match or beat it', detail: 'Equal or better your last effort.', last, lastStr, suggestedWeight: null };
}
