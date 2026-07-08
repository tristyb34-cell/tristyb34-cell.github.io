/* ============================================================
   DAX — calisthenics skill tree (Phase 5)
   The long-game hook. Unlocks once you've built a base, then
   you grind progressions toward the flashy stuff. Gamified.
   ============================================================ */
import { db } from './store.js';

export const TREE_UNLOCK_AT = 16; // ~4 weeks of training

export const SKILLS = [
  { id: 'pushup', name: 'Push-Up Path', icon: '🤜', tier: 1, group: 'Push',
    blurb: 'Pressing strength and a fuller chest, no gym needed.',
    levels: [
      { name: 'Knee push-ups × 10', how: 'Knees down, body straight from knees to head. Full range, chest to the floor.' },
      { name: 'Full push-ups × 10', how: 'Toes down, elbows ~45°, brace your core like a plank the whole way.' },
      { name: 'Diamond push-ups × 8', how: 'Hands together under your chest. Hits triceps and inner chest hard.' },
      { name: 'Archer push-ups × 5/side', how: 'Shift weight to one arm, the other stays straight. Bridge to one-arm.' },
      { name: 'One-arm negatives', how: 'Lower slowly on one arm, 4–5s. The final boss of pressing.' },
    ] },
  { id: 'pull', name: 'Pull-Up Path', icon: '💪', tier: 1, group: 'Pull',
    blurb: 'The big one for your back and the V-taper. The John Morrison engine.',
    levels: [
      { name: 'Inverted rows × 10', how: 'Lie under a bar/table, pull your chest to it. Builds the pull pattern.' },
      { name: 'Negative pull-ups × 5', how: 'Jump to the top, lower as slowly as you can (5s). Builds the strength to go up.' },
      { name: 'Full pull-ups × 5', how: 'Dead hang to chin over bar. No kipping, no swinging.' },
      { name: 'Pull-ups × 10', how: 'Ten clean reps. Now you’re genuinely strong for your weight.' },
      { name: 'Archer / weighted', how: 'Add weight or shift to one side. Serious territory.' },
    ] },
  { id: 'dip', name: 'Dip Path', icon: '🔻', tier: 1, group: 'Push',
    blurb: 'Lower chest, triceps and front delts. The other half of the muscle-up.',
    levels: [
      { name: 'Bench dips × 12', how: 'Hands on a bench behind you, feet out, lower and press.' },
      { name: 'Parallel-bar dips × 8', how: 'Slight forward lean for chest, upright for triceps. Control the bottom.' },
      { name: 'Full dips × 12', how: 'Full depth, locked out at the top.' },
      { name: 'Weighted dips', how: 'Add a backpack or belt. Strength keeps climbing.' },
    ] },
  { id: 'core', name: 'L-Sit Path', icon: '🧘', tier: 1, group: 'Core',
    blurb: 'A rock-solid midsection and the base for every advanced hold.',
    levels: [
      { name: 'Plank 60s', how: 'Dead straight, glutes and abs tight. No sagging hips.' },
      { name: 'Hanging knee raise × 12', how: 'Hang from a bar, knees to chest, no swinging.' },
      { name: 'Hanging leg raise × 10', how: 'Straight legs to parallel or higher. Controlled down.' },
      { name: 'Tuck L-sit 10s', how: 'Support on parallettes/floor, knees tucked, hips up.' },
      { name: 'Full L-sit 10s', how: 'Legs straight out, body in an L. A real strength milestone.' },
    ] },
  { id: 'legs', name: 'Pistol Squat Path', icon: '🦵', tier: 1, group: 'Legs',
    blurb: 'Single-leg strength and balance. Keeps you athletic, not just big.',
    levels: [
      { name: 'Bodyweight squats × 20', how: 'Full depth, knees tracking over toes.' },
      { name: 'Box pistol (sit to bench)', how: 'One leg, sit back to a bench, stand up. Lower the bench over time.' },
      { name: 'Assisted pistol', how: 'Hold a doorframe/TRX, one-leg squat to full depth.' },
      { name: 'Full pistol × 3/leg', how: 'Free-standing one-leg squat. Strong and balanced.' },
    ] },
  { id: 'muscleup', name: 'Muscle-Up', icon: '🚀', tier: 2, group: 'Skill',
    req: { pull: 3, dip: 2 },
    blurb: 'Pull-up into a dip in one move. The skill everyone wants.',
    levels: [
      { name: 'Explosive pull-ups', how: 'Pull as high and fast as possible, aiming higher each time.' },
      { name: 'Chest-to-bar pull-ups', how: 'Pull until your lower chest hits the bar.' },
      { name: 'Negative muscle-up', how: 'Start at the top of the dip, lower slowly through the transition.' },
      { name: 'Full muscle-up', how: 'Pull, transition, press out. The whole thing.' },
    ] },
  { id: 'planche', name: 'Planche Path', icon: '🦅', tier: 2, group: 'Skill',
    req: { pushup: 2, core: 3 },
    blurb: 'Hold your body parallel to the ground on straight arms. Elite.',
    levels: [
      { name: 'Planche lean', how: 'Hands by your hips, lean forward until shoulders pass your hands.' },
      { name: 'Tuck planche 5s', how: 'Knees tucked, feet off the floor, body parallel.' },
      { name: 'Advanced tuck 5s', how: 'Back rounded, knees opening out. Much harder lever.' },
      { name: 'Straddle planche', how: 'Legs straight and wide. Months of patience pay off here.' },
    ] },
];

export function treeUnlocked(totalWorkouts) { return totalWorkouts >= TREE_UNLOCK_AT; }

export async function getSkillState() { return (await db.get('skills', {})) || {}; }
export async function setSkillLevel(id, level) {
  const s = await getSkillState();
  s[id] = Math.max(0, level);
  await db.set('skills', s);
  return s;
}

// tier-2 skills need prerequisite levels reached
export function skillAvailable(skill, state) {
  if (!skill.req) return true;
  return Object.entries(skill.req).every(([id, lvl]) => (state[id] || 0) >= lvl);
}
export function reqText(skill) {
  if (!skill.req) return '';
  const map = Object.fromEntries(SKILLS.map(s => [s.id, s.name]));
  return Object.entries(skill.req).map(([id, lvl]) => `${map[id]} L${lvl}`).join(' + ');
}
