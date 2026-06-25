/* ============================================================
   DAX — phase engine (build → overshoot → cut → bridge)
   Knows where you are in the cycle and drives your calorie
   target: surplus while building, deficit on a cut, maintenance
   on the bridge. It only ever SUGGESTS the next phase — you
   confirm the switch, it never flips on you.
   Cut detection uses the honest natural-lifter signal: weight
   at target AND waist creeping = fat outpacing muscle.
   ============================================================ */
import { db } from './store.js';
import { GOAL } from './data.js';

const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

// pure 7-day trend (duplicated from profile.js on purpose, to avoid an import cycle)
function trend(weighins) {
  if (!weighins || !weighins.length) return null;
  const w = weighins.slice(-7);
  return Math.round((w.reduce((s, x) => s + x.kg, 0) / w.length) * 10) / 10;
}

export const PHASES = {
  build:     { label: 'Building',    icon: '📈', mode: 'surplus',  blurb: 'Eating in surplus, adding muscle. The long phase, most of your time lives here.' },
  overshoot: { label: 'Overshoot',   icon: '🚀', mode: 'surplus',  blurb: 'Past your checkpoint, building a little extra to carve out later.' },
  cut:       { label: 'Cutting',     icon: '✂️', mode: 'deficit',  blurb: 'Short and sharp. Stripping fat to reveal what you built. 6–10 weeks, not a season.' },
  bridge:    { label: 'Maintenance', icon: '🌉', mode: 'maintain', blurb: 'Settling at maintenance for ~2 weeks before the next build. Lets the body reset.' },
};
export const PHASE_ORDER = ['build', 'overshoot', 'cut', 'bridge'];

const WAIST_CUT_TRIGGER = 2.5; // cm of waist gain that says fat is outpacing muscle
const OVERSHOOT_KG = 3;        // how far past your checkpoint to build
const CUT_DROP_KG = 3;         // weight to shed on the cut before easing off
const BRIDGE_DAYS = 14;        // maintenance bridge length

export const DEFAULT_PHASE = { phase: 'build', startedAt: null, baseWeight: null, baseWaist: null };

export async function getPhaseRecord() {
  const p = await db.get('phase', null);
  return p ? { ...DEFAULT_PHASE, ...p } : { ...DEFAULT_PHASE };
}

async function latestWaist() {
  const ms = (await db.get('measurements', [])) || [];
  for (let i = ms.length - 1; i >= 0; i--) if (ms[i].waist != null) return ms[i].waist;
  return null;
}

// read the goal weight from the saved profile without importing profile.js (avoids a cycle)
async function goalWeight() {
  const prof = await db.get('profile', null);
  return (prof && prof.goalWeight) || GOAL.targetWeight;
}

/* the calorie mode for the current phase — consumed by profile.getTargets() */
export async function phaseCalMode() {
  const rec = await getPhaseRecord();
  return PHASES[rec.phase] ? PHASES[rec.phase].mode : 'surplus';
}

/* the full read: current phase + whether DAX should suggest moving on */
export async function getPhase(now = new Date()) {
  const rec = await getPhaseRecord();
  const meta = PHASES[rec.phase] || PHASES.build;
  const weighins = (await db.get('weighins', [])) || [];
  const tw = trend(weighins);
  const waist = await latestWaist();
  const goal = await goalWeight();

  let suggest = null;
  if (rec.phase === 'build') {
    if (tw != null && tw >= goal) {
      suggest = { to: 'overshoot', why: `You hit ${goal}kg, your Tom Holland checkpoint. 🎯 Build a little past it now, or hold here.` };
    }
  } else if (rec.phase === 'overshoot') {
    const waistGain = (waist != null && rec.baseWaist != null) ? Math.round((waist - rec.baseWaist) * 10) / 10 : null;
    if (tw != null && tw >= goal + OVERSHOOT_KG) {
      suggest = { to: 'cut', why: `You're ${OVERSHOOT_KG}kg past your checkpoint. Time to carve it out. A short cut reveals the work.` };
    } else if (waistGain != null && waistGain >= WAIST_CUT_TRIGGER) {
      suggest = { to: 'cut', why: `Your waist is up ${waistGain}cm, fat's starting to outpace muscle. A short cut now keeps you lean.` };
    }
  } else if (rec.phase === 'cut') {
    if (tw != null && rec.baseWeight != null && tw <= rec.baseWeight - CUT_DROP_KG) {
      suggest = { to: 'bridge', why: `You've dropped ${CUT_DROP_KG}kg and the work's showing. Ease into maintenance, then build again.` };
    }
  } else if (rec.phase === 'bridge' && rec.startedAt) {
    const days = (now - new Date(rec.startedAt + 'T00:00:00')) / 86400000;
    if (days >= BRIDGE_DAYS) {
      suggest = { to: 'build', why: `Two weeks at maintenance, the body's settled. Back to building, this time toward your next target.` };
    }
  }

  return { phase: rec.phase, ...meta, record: rec, trendWeight: tw, waist, goal, suggest };
}

/* commit a phase change (always user-confirmed) — stamps a fresh baseline */
export async function advancePhase(to) {
  const weighins = (await db.get('weighins', [])) || [];
  const rec = {
    phase: to,
    startedAt: todayKey(),
    baseWeight: trend(weighins),
    baseWaist: await latestWaist(),
  };
  await db.set('phase', rec);
  return rec;
}
