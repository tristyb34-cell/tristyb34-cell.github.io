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
// bottom of the rep range (the number you drop back to after a weight jump)
export function repBottom(reps) {
  const range = String(reps).match(/(\d+)\s*-\s*(\d+)/);
  if (range) return Number(range[1]);
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
  const lo = repBottom(item.reps);
  const re = await getReentry();
  // how close to failure this session: ease off during re-entry, push once adapted
  const rirCue = re.active ? 'leave 2-3 reps in the tank' : 'leave 1-2 reps in the tank';
  const units = ex.type === 'timed' ? 'seconds' : 'reps';

  if (!last) {
    return {
      headline: re.active ? 'First time · ease in' : 'First time',
      detail: re.active
        ? `You’re in the tendon block (week ${re.week} of ${re.totalWeeks}). Go lighter than your ego wants. Tendons before weight.`
        : `Pick a weight you could do for about ${item.reps} ${units}.`,
      target: `Aim for ${item.reps} ${units} and ${rirCue}. Whatever weight that is becomes your baseline to beat.`,
      last: null, lastStr: null, suggestedWeight: null,
    };
  }

  const topW = Math.max(0, ...last.sets.map(s => s.weight || 0));
  const hitAll = last.sets.length >= item.sets && last.sets.every(s => (s.reps || 0) >= hi);
  const lastStr = last.sets.map(s => (s.weight ? `${s.weight}kg×${s.reps}` : `${s.reps}`)).join(', ');

  // hardest set's reps-in-reserve last time (null if he never logged RIR)
  const rirs = last.sets.map(s => s.rir).filter(v => v !== null && v !== undefined);
  const minRir = rirs.length ? Math.min(...rirs) : null;

  // tendon block weeks 1-2: hard hold on load, build reps and connective tissue first
  if (re.holdLoad && ex.type === 'weight') {
    return {
      headline: `Hold ${topW}kg · tendon block`,
      detail: `Week ${re.week} of ${re.totalWeeks}. Muscles are ready, tendons aren’t. Same load, clean reps.`,
      target: `Stay at ${topW}kg and build toward ${hi} ${units} on all ${item.sets} sets, ${rirCue}. Load climbs after the block.`,
      last, lastStr, suggestedWeight: topW,
    };
  }

  if (ex.type === 'weight') {
    if (hitAll) {
      const detail = minRir !== null && minRir >= 2
        ? `You topped the range at ${topW}kg with ~${minRir} left in the tank. Add 2.5kg, maybe more.`
        : `You hit ${hi} on every set at ${topW}kg. Range beaten.`;
      return {
        headline: `Go heavier → ${topW + 2.5}kg`, detail,
        target: `Move to ${topW + 2.5}kg and start climbing the reps again from ~${lo}, ${rirCue}.`,
        last, lastStr, suggestedWeight: topW + 2.5,
      };
    }
    // didn't top the range, but if it was clearly too easy, push anyway
    if (minRir !== null && minRir >= 3) {
      return {
        headline: `Go heavier → ${topW + 2.5}kg`,
        detail: `Last time you stopped with ${minRir} reps still in the tank, that’s too easy.`,
        target: `Jump to ${topW + 2.5}kg for ${item.reps} ${units}, ${rirCue}.`,
        last, lastStr, suggestedWeight: topW + 2.5,
      };
    }
    return {
      headline: `Beat ${topW}kg`,
      detail: `Same weight, more reps than last time.`,
      target: `Stay at ${topW}kg. Get all ${item.sets} sets to ${hi} ${units} (${rirCue}) — then next time the weight goes up 2.5kg.`,
      last, lastStr, suggestedWeight: topW,
    };
  }
  // bodyweight / timed
  return hitAll
    ? { headline: 'Add reps / time', detail: 'You topped the range.', target: `Beat ${hi} ${units} on your best set, ${rirCue}.`, last, lastStr, suggestedWeight: null }
    : { headline: 'Match or beat it', detail: 'Equal or better your last effort.', target: `Push toward ${hi} ${units} per set, close to failure.`, last, lastStr, suggestedWeight: null };
}
