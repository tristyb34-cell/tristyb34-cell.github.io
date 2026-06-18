/* ============================================================
   DAX — nutrition: preset meals, macros, shopping list
   Meals are pre-built with the maths done, so logging is just
   a tap. No counting, no eyeballing.
   ============================================================ */
import { db } from './store.js';

const todayKey = () => new Date().toISOString().slice(0, 10);

export const DINNER_SIZES = {
  small: { label: 'Small', cal: 550, protein: 32 },
  med: { label: 'Medium', cal: 750, protein: 42 },
  large: { label: 'Large', cal: 950, protein: 52 },
};

// Your repeat-daily menu. Edit numbers here if a meal changes.
export const MEALS = [
  { id: 'smoothie', slot: 'Morning', emoji: '🥤', name: 'The Growth Smoothie',
    desc: '80g oats · 400ml full-cream milk · 1 tbsp peanut butter · 1 banana · 1 scoop whey · 5g creatine',
    cal: 880, protein: 52 },
  { id: 'eggs', slot: 'Mid-morning', emoji: '🥚', name: '3 Boiled Eggs',
    desc: 'Batch-boil 6–9 at once, they keep 5 days. Grab and go.', cal: 210, protein: 18 },
  { id: 'lunch', slot: 'Lunch', emoji: '🥪', name: 'Tuna Sandwich / Leftovers',
    desc: 'Tuna mayo on wholewheat, or last night’s dinner + a Greek yoghurt.', cal: 550, protein: 45 },
  { id: 'snack', slot: 'Afternoon / pre-gym', emoji: '🍌', name: 'PB & Honey + Banana',
    desc: 'Quick calories before training.', cal: 450, protein: 14 },
  { id: 'dinner', slot: 'Dinner', emoji: '🍽️', name: 'Home Dinner', dinner: true,
    desc: 'Whatever’s cooked at home, bigger portion + extra carbs (rice/potato).', cal: 750, protein: 42 },
];

export const SHOPPING = [
  { item: 'Whey protein (1 tub, local brand)', cost: 450, why: 'Your #1 buy. Easiest way to hit protein when you can’t eat enough.' },
  { item: 'Creatine monohydrate', cost: 180, why: 'Most proven supplement on earth. 5g daily, forever. Lasts ~2 months.' },
  { item: 'Eggs (3 dozen+)', cost: 180, why: 'Cheapest quality protein + calories there is.' },
  { item: 'Full-cream milk (~6L)', cost: 120, why: 'Hardgainer rocket fuel. Goes in every smoothie.' },
  { item: 'Peanut butter (1–2 jars)', cost: 120, why: 'Calorie king, ~600 cal per 100g.' },
  { item: 'Oats (big bag)', cost: 90, why: 'Cheap dense carbs + smoothie base.' },
  { item: 'Chicken / mince (bulk)', cost: 250, why: 'Your real-food protein anchor. Buy bulk, freeze.' },
  { item: 'Bananas + a fruit', cost: 80, why: 'Smoothie + cheap carbs + cramp-fighting potassium.' },
];

export const SHOPPING_TOTAL = SHOPPING.reduce((s, x) => s + x.cost, 0);

/* ---------- daily food log (on-device) ---------- */
async function allLogs() { return (await db.get('foodlog', {})) || {}; }

export async function getDayLog(date = todayKey()) {
  const logs = await allLogs();
  return logs[date] || {};
}

export async function toggleMeal(mealId, sizeIfDinner = 'med') {
  const date = todayKey();
  const logs = await allLogs();
  const day = logs[date] || {};
  if (day[mealId]) delete day[mealId];
  else day[mealId] = mealId === 'dinner' ? sizeIfDinner : true;
  logs[date] = day;
  await db.set('foodlog', logs);
  return day;
}

export async function setDinnerSize(size) {
  const date = todayKey();
  const logs = await allLogs();
  const day = logs[date] || {};
  if (day.dinner) { day.dinner = size; logs[date] = day; await db.set('foodlog', logs); }
  return day;
}

export function mealMacros(meal, log) {
  if (meal.dinner) {
    const size = (log && log.dinner) || 'med';
    const s = DINNER_SIZES[size] || DINNER_SIZES.med;
    return { cal: s.cal, protein: s.protein };
  }
  return { cal: meal.cal, protein: meal.protein };
}

export function dayTotals(log) {
  let cal = 0, protein = 0;
  for (const meal of MEALS) {
    if (log[meal.id]) { const m = mealMacros(meal, log); cal += m.cal; protein += m.protein; }
  }
  return { cal, protein };
}
