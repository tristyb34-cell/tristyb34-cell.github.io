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

// v9: he hates lunges, and his leg press already covers the quads they mainly hit,
// so drop them. Leg Press + RDL + Seated Leg Curl + calves is still a complete
// maintenance leg day (quads, hamstrings, glutes, calves).
function dropLunges(plan) {
  for (const day of plan) day.items = day.items.filter(i => i.id !== 'Dumbbell_Lunges');
  return plan;
}

// v10: the whole plan got restructured after reviewing his logs. Two problems: he was
// grinding ~85% of sets to failure (RIR 0-1) and cramming 7-9 exercises into a rushed
// 30-min window he could never finish, so nothing progressed. Fix, agreed with him:
//  - Cut junk/redundant volume so each day is ~5-6 load-bearing moves for a real 45-min
//    session with proper rest (that alone eases the RIR problem: rushed rest was part of it).
//  - Keep the upper-body / V-taper bias he wants (chest, shoulders, back, arms are priority;
//    legs stay maintenance): Push and Pull get a 6th priority move (chest fly, wide-grip
//    pulldown), side-delt volume kept, arms kept generous.
//  - Swap the Romanian deadlift (kept hurting his back) for a Band Good Morning / Pull-Through:
//    same hip hinge and posterior chain, but horizontal load so his spine isn't compressed.
// Full rebuild of all four days, so a customised plan gets it wholesale (he signed off on it).
function rebuildV10(plan) {
  const days = {
    Tue: [
      { id: 'Incline_Dumbbell_Press', sets: 4, reps: '8-12', rest: 90 },
      { id: 'Cable_Chest_Press', sets: 3, reps: '8-12', rest: 75 },
      { id: 'Decline_Dumbbell_Flyes', sets: 3, reps: '10-15', rest: 60 },
      { id: 'Dumbbell_Shoulder_Press', sets: 3, reps: '8-10', rest: 90 },
      { id: 'Side_Lateral_Raise', sets: 4, reps: '12-20', rest: 75 },
      { id: 'Triceps_Pushdown', sets: 3, reps: '10-15', rest: 60 },
    ],
    Thu: [
      { id: 'Close-Grip_Front_Lat_Pulldown', sets: 4, reps: '8-12', rest: 90 },
      { id: 'Wide-Grip_Lat_Pulldown', sets: 3, reps: '10-12', rest: 90 },
      { id: 'Seated_Cable_Rows', sets: 4, reps: '10-12', rest: 90 },
      { id: 'Face_Pull', sets: 3, reps: '15-20', rest: 60 },
      { id: 'Incline_Dumbbell_Curl', sets: 3, reps: '10-12', rest: 60 },
      { id: 'Alternate_Hammer_Curl', sets: 3, reps: '10-12', rest: 60 },
    ],
    Fri: [
      { id: 'Leg_Press', sets: 4, reps: '10-12', rest: 120 },
      { id: 'Band_Good_Morning_Pull_Through', sets: 3, reps: '12-15', rest: 90 },
      { id: 'Seated_Leg_Curl', sets: 3, reps: '10-12', rest: 90 },
      { id: 'Standing_Calf_Raises', sets: 3, reps: '12-15', rest: 60 },
      { id: 'Air_Bike', sets: 3, reps: '15-20', rest: 45 },
      { id: 'Plank', sets: 3, reps: '45s', rest: 45 },
    ],
    Sat: [
      { id: 'Side_Lateral_Raise', sets: 4, reps: '12-20', rest: 60 },
      { id: 'Barbell_Curl', sets: 3, reps: '8-12', rest: 60 },
      { id: 'Cable_Hammer_Curls_-_Rope_Attachment', sets: 3, reps: '10-12', rest: 60 },
      { id: 'Cable_Rope_Overhead_Triceps_Extension', sets: 3, reps: '10-15', rest: 75 },
      { id: 'Bench_Dips', sets: 3, reps: '12-15', rest: 60 },
    ],
  };
  for (const day of plan) if (days[day.dow]) day.items = days[day.dow].map(x => ({ ...x }));
  return plan;
}

// v11: Saturday can't be a gym day until October (Saturday soccer + the gym shuts at
// noon right as he gets home), and he was skipping it every week. Solution he landed on:
// make Saturday a HOME kettlebell + core session (he owns 4-20kg bells), done any time
// after soccer, no gym needed. It does a different job than the old isolation Arms day:
// conditioning, posterior chain (swings), and core, the things the plan was light on.
// To keep his V-taper priorities from leaning on the kettlebell day, the best of the old
// Arms & Delts volume moves onto the weekdays: Cable Lateral Raise onto Push (side delts
// stay ~7), Barbell Curl onto Pull (biceps stay ~9). Full rebuild, he signed off.
function rebuildV11(plan) {
  const days = {
    Tue: [
      { id: 'Incline_Dumbbell_Press', sets: 4, reps: '8-12', rest: 90 },
      { id: 'Cable_Chest_Press', sets: 3, reps: '8-12', rest: 75 },
      { id: 'Decline_Dumbbell_Flyes', sets: 3, reps: '10-15', rest: 60 },
      { id: 'Dumbbell_Shoulder_Press', sets: 3, reps: '8-10', rest: 90 },
      { id: 'Side_Lateral_Raise', sets: 4, reps: '12-20', rest: 75 },
      { id: 'Cable_Lateral_Raise', sets: 3, reps: '15-20', rest: 45 },
      { id: 'Triceps_Pushdown', sets: 3, reps: '10-15', rest: 60 },
    ],
    Thu: [
      { id: 'Close-Grip_Front_Lat_Pulldown', sets: 4, reps: '8-12', rest: 90 },
      { id: 'Wide-Grip_Lat_Pulldown', sets: 3, reps: '10-12', rest: 90 },
      { id: 'Seated_Cable_Rows', sets: 4, reps: '10-12', rest: 90 },
      { id: 'Face_Pull', sets: 3, reps: '15-20', rest: 60 },
      { id: 'Incline_Dumbbell_Curl', sets: 3, reps: '10-12', rest: 60 },
      { id: 'Alternate_Hammer_Curl', sets: 3, reps: '10-12', rest: 60 },
      { id: 'Barbell_Curl', sets: 3, reps: '8-12', rest: 60 },
    ],
    Fri: [
      { id: 'Leg_Press', sets: 4, reps: '10-12', rest: 120 },
      { id: 'Band_Good_Morning_Pull_Through', sets: 3, reps: '12-15', rest: 90 },
      { id: 'Seated_Leg_Curl', sets: 3, reps: '10-12', rest: 90 },
      { id: 'Standing_Calf_Raises', sets: 3, reps: '12-15', rest: 60 },
      { id: 'Air_Bike', sets: 3, reps: '15-20', rest: 45 },
      { id: 'Plank', sets: 3, reps: '45s', rest: 45 },
    ],
    Sat: [
      { id: 'Kettlebell_Hang_Clean', sets: 3, reps: '8', rest: 60 },
      { id: 'One-Arm_Kettlebell_Swings', sets: 4, reps: '12', rest: 45 },
      { id: 'Two-Arm_Kettlebell_Military_Press', sets: 3, reps: '8-10', rest: 60 },
      { id: 'One-Arm_Kettlebell_Row', sets: 3, reps: '10', rest: 45 },
      { id: 'Bent-Knee_Hip_Raise', sets: 3, reps: '15', rest: 45 },
      { id: '3_4_Sit-Up', sets: 3, reps: '15', rest: 45 },
    ],
  };
  for (const day of plan) if (days[day.dow]) day.items = days[day.dow].map(x => ({ ...x }));
  // the Saturday title changes job too — retitle only if it's still the old Arms day
  const sat = plan.find(d => d.dow === 'Sat');
  if (sat) sat.title = 'Kettlebell + Core · at home';
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
    if (stored < 9) plan = dropLunges(plan);
    if (stored < 10) plan = rebuildV10(plan);
    if (stored < 11) plan = rebuildV11(plan);
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
