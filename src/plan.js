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

// v6: bookend side-delt volume on Tue/Sat — dumbbell laterals OPEN the session,
// a new standing one-arm cable lateral CLOSES it. Side delts are his priority and
// recover fast, so this is the cheapest place to add quality volume.
function bookendDelts(plan) {
  for (const day of plan) {
    if (day.dow !== 'Tue' && day.dow !== 'Sat') continue;
    const idx = day.items.findIndex(i => i.id === 'Side_Lateral_Raise');
    if (idx > 0) day.items.unshift(day.items.splice(idx, 1)[0]); // make DB laterals the opener
    if (!day.items.some(i => i.id === 'Cable_Lateral_Raise')) {
      day.items.push({ id: 'Cable_Lateral_Raise', sets: 3, reps: '15-20', rest: 45 });
    }
  }
  return plan;
}

// v8: bookendDelts (v6) made side lateral raises the Push opener, which pre-exhausted
// the delts and bottlenecked every press after (he stopped mid-session over it). Move
// them off the opener, down to 3 sets, before triceps; cable laterals stay the finisher.
// Also add a Romanian deadlift to Legs, the hip hinge his leg day was missing. Surgical,
// so a customised plan gets it too.
function reorderPushAddHinge(plan) {
  const tue = plan.find(d => d.dow === 'Tue');
  if (tue) {
    tue.items = [
      { id: 'Incline_Dumbbell_Press', sets: 4, reps: '8-12', rest: 90 },
      { id: 'Cable_Chest_Press', sets: 3, reps: '8-12', rest: 75 },
      { id: 'Dumbbell_Shoulder_Press', sets: 3, reps: '8-10', rest: 90 },
      { id: 'Side_Lateral_Raise', sets: 3, reps: '12-20', rest: 60 },
      { id: 'Cable_Rope_Overhead_Triceps_Extension', sets: 3, reps: '10-15', rest: 60 },
      { id: 'Triceps_Pushdown', sets: 3, reps: '10-15', rest: 60 },
      { id: 'Cable_Lateral_Raise', sets: 3, reps: '15-20', rest: 45 },
    ];
  }
  const fri = plan.find(d => d.dow === 'Fri');
  if (fri && !fri.items.some(i => i.id === 'Romanian_Deadlift')) {
    const i = fri.items.findIndex(x => x.id === 'Leg_Press');
    fri.items.splice(i >= 0 ? i + 1 : 1, 0, { id: 'Romanian_Deadlift', sets: 3, reps: '8-12', rest: 90 });
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
  } else {
    // customised plan → keep every edit, apply each version's change cumulatively
    plan = clone(plan);
    if (stored < 5) plan = appendGrip(plan);
    if (stored < 6) plan = bookendDelts(plan);
    if (stored < 8) plan = reorderPushAddHinge(plan);
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
