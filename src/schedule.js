/* ============================================================
   DAX — daily schedule (Phase 6)
   Separate weekday + weekend timetables. Drives the reminders.
   All times editable, stored on-device.
   ============================================================ */
import { db } from './store.js';

// Weekday: wake 7:40, work 8:30–17:00, train ~18:00
export const DEFAULT_WEEKDAY = [
  { id: 'smoothie', time: '08:30', kind: 'meal', mealId: 'smoothie', enabled: true,
    label: 'Growth smoothie + creatine', body: 'Blend at home and bring it, drink it when you get to work. Creatine goes in here, every single day. 🥤' },
  { id: 'eggs', time: '10:30', kind: 'meal', mealId: 'eggs', enabled: true,
    label: '3 boiled eggs', body: 'Mid-morning protein hit. Grab the ones you batched. 🥚' },
  { id: 'lunch', time: '13:00', kind: 'meal', mealId: 'lunch', enabled: true,
    label: 'Lunch', body: 'Tuna sandwich or last night’s leftovers + a yoghurt.' },
  { id: 'learn', time: '10:00', kind: 'learn', enabled: true,
    label: 'Today’s lesson 📚', body: 'Two minutes on what actually builds the body you want. Tap to learn.' },
  { id: 'snack', time: '17:00', kind: 'meal', mealId: 'snack', enabled: true,
    label: 'Pre-gym fuel', body: 'PB & honey + banana, ~1h before you lift. Fuel the session. 🍌' },
  { id: 'train', time: '18:00', kind: 'train', enabled: true,
    label: 'Train', body: 'Session time. The body you want is on the other side of this hour. 🔥' },
  { id: 'pwshake', time: '18:45', kind: 'shake', enabled: true,
    label: 'Post-workout shake (optional)', body: 'A scoop of whey in water on the walk home. Bridges the gap to dinner. 💪' },
  { id: 'dinner', time: '19:30', kind: 'meal', mealId: 'dinner', enabled: true,
    label: 'Dinner', body: 'Bigger portion + extra carbs. Refuel and grow. 🍽️' },
];

// Weekend: wake ~10, train any time 12–6, later meals
export const DEFAULT_WEEKEND = [
  { id: 'smoothie', time: '10:30', kind: 'meal', mealId: 'smoothie', enabled: true,
    label: 'Growth smoothie + creatine', body: 'Once you’re up. Creatine still goes in, weekends count too. 🥤' },
  { id: 'learn', time: '10:00', kind: 'learn', enabled: true,
    label: 'Today’s lesson 📚', body: 'Two minutes on what actually builds the body you want. Tap to learn.' },
  { id: 'train', time: '12:00', kind: 'train', enabled: true,
    label: 'Train (anytime this afternoon)', body: 'Session day. Get it in any time before evening, the coach drops this once you log it. 🔥' },
  { id: 'lunch', time: '13:00', kind: 'meal', mealId: 'lunch', enabled: true,
    label: 'Lunch', body: 'Proper meal. Protein + carbs.' },
  { id: 'snack', time: '15:30', kind: 'meal', mealId: 'snack', enabled: true,
    label: 'Snack / pre-gym fuel', body: 'PB & banana. If you train after this, it’s your pre-gym fuel. 🍌' },
  { id: 'dinner', time: '19:00', kind: 'meal', mealId: 'dinner', enabled: true,
    label: 'Dinner', body: 'Bigger portion + extra carbs. 🍽️' },
];

const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
const keyFor = (kind) => kind === 'weekend' ? 'scheduleWeekend' : 'schedule';
const defFor = (kind) => kind === 'weekend' ? DEFAULT_WEEKEND : DEFAULT_WEEKDAY;

async function load(kind) {
  const key = keyFor(kind), def = defFor(kind);
  const saved = await db.get(key, null);
  if (!saved) { await db.set(key, def); return def.slice(); }
  const ids = new Set(saved.map(i => i.id));
  const merged = saved.concat(def.filter(d => !ids.has(d.id)));
  if (merged.length !== saved.length) await db.set(key, merged);
  return merged.slice().sort((a, b) => a.time.localeCompare(b.time));
}

// the schedule that applies on a given date (defaults to today)
export async function getSchedule(date = new Date()) {
  return load(isWeekend(date) ? 'weekend' : 'weekday');
}
export async function getScheduleByKind(kind) { return load(kind); }

export async function updateItem(kind, id, patch) {
  const items = await load(kind);
  const i = items.findIndex(x => x.id === id);
  if (i >= 0) { items[i] = { ...items[i], ...patch }; await db.set(keyFor(kind), items); }
  return items;
}
export async function resetSchedule(kind) {
  await db.set(keyFor(kind), defFor(kind));
  return defFor(kind);
}

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
