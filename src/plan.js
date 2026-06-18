/* ============================================================
   DAX — the user's editable plan (stored on-device, offline)
   Seeds from DEFAULT_PLAN on first run; all edits save locally.
   ============================================================ */
import { db } from './store.js';
import { DEFAULT_PLAN, dayForDate } from './program.js';

const clone = (x) => JSON.parse(JSON.stringify(x));

export async function getPlan() {
  let plan = await db.get('plan', null);
  if (!plan) {
    plan = clone(DEFAULT_PLAN);
    await db.set('plan', plan);
  }
  return plan;
}

export async function savePlan(plan) {
  await db.set('plan', plan);
  return plan;
}

export async function resetPlan() {
  const plan = clone(DEFAULT_PLAN);
  await db.set('plan', plan);
  return plan;
}

export async function dayForToday(d = new Date()) {
  return dayForDate(await getPlan(), d);
}
