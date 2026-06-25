/* ============================================================
   DAX — the user's editable plan (stored on-device, offline)
   Seeds from DEFAULT_PLAN on first run; all edits save locally.
   ============================================================ */
import { db } from './store.js';
import { DEFAULT_PLAN, PLAN_VERSION, dayForDate } from './program.js';

const clone = (x) => JSON.parse(JSON.stringify(x));

export async function getPlan() {
  let plan = await db.get('plan', null);
  if (!plan) {
    // first run: seed the current default
    plan = clone(DEFAULT_PLAN);
    await db.set('plan', plan);
    await db.set('planVersion', PLAN_VERSION);
  } else if (!(await db.get('planCustomised', false)) && (await db.get('planVersion', 0)) < PLAN_VERSION) {
    // ship a new default to anyone who hasn't edited their plan — auto-adopt, no action needed
    plan = clone(DEFAULT_PLAN);
    await db.set('plan', plan);
    await db.set('planVersion', PLAN_VERSION);
  }
  return plan;
}

export async function savePlan(plan) {
  await db.set('plan', plan);
  await db.set('planCustomised', true); // user edited/swapped → never auto-overwrite again
  return plan;
}

export async function resetPlan() {
  const plan = clone(DEFAULT_PLAN);
  await db.set('plan', plan);
  await db.set('planVersion', PLAN_VERSION);
  await db.set('planCustomised', false); // back to default → eligible for future auto-updates
  return plan;
}

export async function dayForToday(d = new Date()) {
  return dayForDate(await getPlan(), d);
}
