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
