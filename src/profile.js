/* ============================================================
   DAX — profile + adaptive targets (Phase 4.5)
   Your real stats drive your calorie/protein targets, and the
   targets ADAPT: if the trend weight stalls, calories go up.
   ============================================================ */
import { db } from './store.js';
import { GOAL } from './data.js';
import { phaseCalMode } from './phase.js';

export const DEFAULT_PROFILE = {
  weight: GOAL.startWeight,   // kg
  height: 175,                // cm
  age: 24,
  sex: 'male',
  goalWeight: GOAL.targetWeight,
  activity: 1.5,              // moderate: trains most days + coaching
  onboarded: false,
};

export async function getProfile() {
  const p = await db.get('profile', null);
  return p ? { ...DEFAULT_PROFILE, ...p } : { ...DEFAULT_PROFILE };
}
export async function saveProfile(patch) {
  const p = await getProfile();
  const next = { ...p, ...patch };
  await db.set('profile', next);
  return next;
}
export async function isOnboarded() {
  const p = await db.get('profile', null);
  return !!(p && p.onboarded);
}

/* ---------- target maths ---------- */
function bmr(p, kg) {
  const s = p.sex === 'female' ? -161 : 5;
  return 10 * kg + 6.25 * p.height - 5 * p.age + s;
}
const round10 = (n) => Math.round(n / 10) * 10;
const round5 = (n) => Math.round(n / 5) * 5;

export function trendWeight(weighins) {
  if (!weighins || !weighins.length) return null;
  const w = weighins.slice(-7);
  return Math.round((w.reduce((s, x) => s + x.kg, 0) / w.length) * 10) / 10;
}

// base target from current bodyweight (uses trend weight if we have it)
export function baseTargets(p, bodyweight) {
  const kg = bodyweight || p.weight;
  const tdee = bmr(p, kg) * p.activity;
  return { cal: round10(tdee + 150), protein: round5(2.2 * kg), tdee: Math.round(tdee) };
}

export async function getTargets() {
  const p = await getProfile();
  const weighins = (await db.get('weighins', [])) || [];
  const tw = trendWeight(weighins);
  const base = baseTargets(p, tw);
  const adjust = (await db.get('calAdjust', 0)) || 0;
  const mode = await phaseCalMode();
  const kg = tw || p.weight;

  // the phase drives the calorie target: surplus while building, a real
  // deficit on a cut (protein stays high to hold muscle), maintenance on the bridge.
  let cal, protein = base.protein;
  if (mode === 'deficit') { cal = round10(base.tdee - 450); protein = round5(2.2 * kg); }
  else if (mode === 'maintain') { cal = round10(base.tdee); }
  else { cal = base.cal + adjust; }

  return {
    cal: Math.max(1600, cal),
    protein,
    calBase: base.cal,
    calAdjust: adjust,
    phaseMode: mode,
    startWeight: weighins.length ? weighins[0].kg : p.weight,
    goalWeight: p.goalWeight,
    trendWeight: tw,
  };
}

/* ---------- the adaptive loop ---------- */
// Looks at the trend slope and nudges the calorie adjustment if you've
// stalled (eat more) or you're gaining too fast (ease off). Self-limiting.
export async function evaluateAdaptive(now = new Date()) {
  // the surplus-tuner only makes sense while building — on a cut you WANT
  // the weight to fall, so don't let it fight the deficit.
  if ((await phaseCalMode()) !== 'surplus') return null;
  const weighins = (await db.get('weighins', [])) || [];
  if (weighins.length < 8) return null; // need ~a week+ of data

  const lastAdjDate = await db.get('calAdjustDate', null);
  if (lastAdjDate) {
    const days = (now - new Date(lastAdjDate + 'T00:00:00')) / 86400000;
    if (days < 10) return null; // let a change breathe before the next
  }

  // weekly rate from trend over the last ~2 weeks
  const recent = weighins.slice(-14);
  if (recent.length < 8) return null;
  const spanDays = (new Date(recent[recent.length - 1].date) - new Date(recent[0].date)) / 86400000;
  if (spanDays < 9) return null;
  const tEnd = trendWeight(recent);
  const tStart = trendWeight(recent.slice(0, Math.ceil(recent.length / 2)));
  const ratePerWeek = ((tEnd - tStart) / (spanDays / 2)) * 7;

  let adjust = (await db.get('calAdjust', 0)) || 0;
  let msg = null;
  const dateKey = now.toISOString().slice(0, 10);

  if (ratePerWeek < 0.15 && adjust < 500) {
    adjust = Math.min(500, adjust + 150);
    msg = `Your trend weight has stalled (${ratePerWeek.toFixed(2)}kg/wk). Hardgainer tax. I’ve bumped your target by 150 cal, eat it, even when you’re not hungry. 🥤`;
  } else if (ratePerWeek > 0.7 && adjust > -200) {
    adjust = Math.max(-200, adjust - 150);
    msg = `You’re gaining fast (${ratePerWeek.toFixed(2)}kg/wk). To stay lean for the John Morrison look, I’ve eased your target by 150 cal.`;
  }

  if (msg) {
    await db.set('calAdjust', adjust);
    await db.set('calAdjustDate', dateKey);
    return { adjust, ratePerWeek, message: msg };
  }
  return null;
}
