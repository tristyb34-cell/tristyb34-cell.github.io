/* ============================================================
   DAX — consistency engine (the keystone metric)
   For the first months the ONLY scoreboard is: did you show up?
   "Showed up" = a FINISHED session (he went through the exercises
   and saved it), not just opening the app. Three numbers:
   this week, a forgiving 30-day %, and a don't-break-it streak.
   ============================================================ */
import { db } from './store.js';
import { getPlan } from './plan.js';

const dkey = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const epochDay = () => Math.floor(Date.now() / 86400000);
const pick = (arr) => arr[epochDay() % arr.length];

export async function computeConsistency(now = new Date()) {
  const sessions = (await db.get('sessions', [])) || [];
  const plan = await getPlan();
  const trainingDows = new Set(plan.map(p => p.dow));
  const target = trainingDows.size || 4;
  const today = new Date(dkey(now) + 'T00:00:00');

  if (!sessions.length) {
    return { started: false, target, weekDone: 0, streak: 0, pct: null, hit: 0, scheduled: 0, total: 0, goalDate: dkey(addDays(today, 90)) };
  }

  const sessionDates = new Set(sessions.map(s => s.date));
  const firstDate = new Date(sessions[0].date + 'T00:00:00');

  // this week (Monday-start)
  const dow0 = (now.getDay() + 6) % 7; // 0 = Monday
  const monday = addDays(today, -dow0);
  let weekDone = 0;
  for (const dt of sessionDates) { const d = new Date(dt + 'T00:00:00'); if (d >= monday && d <= today) weekDone++; }

  // 30-day attendance, clamped to first session so pre-start days aren't counted against him
  const windowStart = new Date(Math.max(addDays(today, -29).getTime(), firstDate.getTime()));
  let scheduled = 0, hit = 0;
  for (let d = new Date(windowStart); d <= today; d = addDays(d, 1)) {
    if (!trainingDows.has(DOW[d.getDay()])) continue;
    if (dkey(d) === dkey(today) && !sessionDates.has(dkey(d))) continue; // today's not over, don't ding it
    scheduled++;
    if (sessionDates.has(dkey(d))) hit++;
  }
  const pct = scheduled ? Math.round((hit / scheduled) * 100) : null;

  // streak: consecutive scheduled training days completed, walking back
  let streak = 0;
  for (let d = new Date(today); d >= firstDate; d = addDays(d, -1)) {
    if (!trainingDows.has(DOW[d.getDay()])) continue;
    if (dkey(d) === dkey(today) && !sessionDates.has(dkey(d))) continue; // today still open
    if (sessionDates.has(dkey(d))) streak++; else break;
  }

  return { started: true, target, weekDone, streak, pct, hit, scheduled, total: sessions.length, goalDate: dkey(addDays(firstDate, 90)) };
}

/* The consistency coach: leans HARD on showing up, never on performance. */
export function consistencyCoach(c) {
  if (!c.started) return pick([
    'Day zero. The only rep that matters is walking in the door. Everything else is built on that one.',
    'Nothing logged yet, and that’s the only thing between you and the whole project. Show up once. That’s it.',
  ]);
  if (c.weekDone >= c.target) return pick([
    `${c.weekDone}/${c.target} this week. THAT is the whole game. The body just follows the habit.`,
    'Full house this week. You’re not training muscle yet, you’re training showing-up, and you’re winning it.',
  ]);
  if (c.streak >= 2) return pick([
    `${c.streak} in a row. Do not break the chain. Momentum is the thing you’re really building right now.`,
    `${c.streak} straight sessions. Consistency isn’t sexy, it’s just what separates the people who change from the people who talk about it.`,
  ]);
  if (c.pct !== null && c.pct < 50) return pick([
    'Rough patch, doesn’t matter. The man who shows up when it sucks is the one who changes. Next session, just be there.',
    'You’re behind, so the move is dead simple: show up once and the line turns. Don’t think, just go.',
  ]);
  return pick([
    'Show up. Not for the gains, for the streak. Boring consistency beats heroic bursts every single time.',
    'One more session. That’s all this ever is. Just the next one, even a short one.',
  ]);
}
