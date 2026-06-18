/* ============================================================
   DAX — adaptive re-entry mode (Phase 5)
   5 years off = muscle memory fast, but tendons/joints slow.
   For the first 3 weeks of training we cap the load and push
   form, so you ramp without tweaking something in week 2.
   ============================================================ */
import { db } from './store.js';

const REENTRY_DAYS = 21;

export async function getReentry(now = new Date()) {
  const sessions = (await db.get('sessions', [])) || [];
  if (!sessions.length) {
    return { active: true, notStarted: true, week: 1, totalWeeks: 3, daysLeft: REENTRY_DAYS };
  }
  const first = new Date(sessions[0].date + 'T00:00:00');
  const days = Math.floor((now - first) / 86400000);
  if (days >= REENTRY_DAYS) return { active: false, day: days };
  return {
    active: true, notStarted: false,
    day: days, week: Math.floor(days / 7) + 1, totalWeeks: 3,
    daysLeft: REENTRY_DAYS - days,
  };
}
