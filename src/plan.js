/* ============================================================
   DAX — the user's editable plan (stored on-device, offline)
   Seeds from DEFAULT_PLAN on first run; all edits save locally.
   ============================================================ */
import { db } from './store.js';
import { DEFAULT_PLAN, PLAN_VERSION, dayForDate } from './program.js';

const clone = (x) => JSON.parse(JSON.stringify(x));

// v5 added grip/forearm work at the END of three days. A customised plan never
// auto-adopts a new default, so append these specifically rather than let the
// whole plan get replaced (which would throw away his swaps).
const GRIP_V5 = {
  Thu: [{ id: 'Dead_Hang', sets: 3, reps: '30-60s', rest: 90 }],
  Fri: [{ id: 'Farmers_Walk', sets: 3, reps: '40-60s', rest: 90 }],
  Sat: [
    { id: 'Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench', sets: 2, reps: '12-15', rest: 60 },
    { id: 'Palms-Down_Dumbbell_Wrist_Curl_Over_A_Bench', sets: 2, reps: '12-15', rest: 60 },
  ],
};

function appendGrip(plan) {
  for (const day of plan) {
    const add = GRIP_V5[day.dow];
    if (!add) continue;
    const have = new Set(day.items.map(i => i.id));
    for (const it of add) if (!have.has(it.id)) day.items.push({ ...it });
  }
  return plan;
}

export async function getPlan() {
  let plan = await db.get('plan', null);
  if (!plan) {
    // first run: seed the current default
    plan = clone(DEFAULT_PLAN);
    await db.set('plan', plan);
    await db.set('planVersion', PLAN_VERSION);
    return plan;
  }
  const stored = await db.get('planVersion', 0);
  if (stored >= PLAN_VERSION) return plan;

  if (!(await db.get('planCustomised', false))) {
    // untouched plan → adopt the new default wholesale
    plan = clone(DEFAULT_PLAN);
  } else if (stored < 5) {
    // customised plan → keep every edit, just append the grip work
    plan = appendGrip(clone(plan));
  }
  await db.set('plan', plan);
  await db.set('planVersion', PLAN_VERSION);
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
