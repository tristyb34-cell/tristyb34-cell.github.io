/* ============================================================
   DAX — tendon / connective-tissue re-entry block
   5 years off = muscle and nerve come back in WEEKS, but tendons,
   ligaments and joints stiffen up over MONTHS. You'll feel strong
   long before the scaffolding is ready, which is exactly when people
   tweak something. So we run a 6-week ramp: a hard load-hold for the
   riskiest first 2 weeks, then a gradual climb while the tissue catches up.
   ============================================================ */
import { db } from './store.js';

const BLOCK_DAYS = 42;   // full 6-week tendon block
const HOLD_DAYS = 14;    // hard load-hold for the first 2 weeks (highest risk)
const TOTAL_WEEKS = 6;

export async function getReentry(now = new Date()) {
  const sessions = (await db.get('sessions', [])) || [];
  if (!sessions.length) {
    return { active: true, holdLoad: true, notStarted: true, week: 1, totalWeeks: TOTAL_WEEKS, daysLeft: BLOCK_DAYS };
  }
  const first = new Date(sessions[0].date + 'T00:00:00');
  const days = Math.floor((now - first) / 86400000);
  if (days >= BLOCK_DAYS) return { active: false, day: days };
  return {
    active: true, notStarted: false,
    holdLoad: days < HOLD_DAYS,
    day: days, week: Math.floor(days / 7) + 1, totalWeeks: TOTAL_WEEKS,
    daysLeft: BLOCK_DAYS - days,
  };
}

const clone = (x) => JSON.parse(JSON.stringify(x));
const ONRAMP_WEEKS = 3; // volume ease-in only for the first 3 weeks

// Scale a day's VOLUME down for the first 3 weeks back (load is capped separately
// by the tendon block). Same exercises he'll grow into, just fewer sets — so he
// learns the movements without the wrecking-ball soreness that ends week one.
export function applyOnramp(day, re) {
  if (!day || !re || !re.active) return day;
  const week = re.notStarted ? 1 : re.week;
  if (week > ONRAMP_WEEKS) return day;
  const d = clone(day);
  if (week === 1) d.items = d.items.slice(0, 4).map(it => ({ ...it, sets: 2 }));      // top 4 compounds, 2 sets
  else if (week === 2) d.items = d.items.map(it => ({ ...it, sets: 2 }));             // all lifts, 2 sets
  else d.items = d.items.map(it => ({ ...it, sets: Math.max(2, it.sets - 1) }));      // all lifts, one set lighter
  d.onrampWeek = week;
  d.onrampTotal = ONRAMP_WEEKS;
  return d;
}

// one-line explainer for the Today hero during the onramp
export function onrampNote(week) {
  if (week === 1) return 'Ease-in week 1: just the big lifts, 2 sets each. Groove the movements, leave the gym fresh. Volume builds next week.';
  if (week === 2) return 'Ease-in week 2: all your lifts now, still 2 sets each. Adding the work back gradually.';
  return 'Ease-in week 3: nearly full volume, one set lighter. Last easy week before the full plan.';
}
