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

// Your repeat-daily menu. Each meal carries a `recipe` (component + amount) so
// you can see exactly how much of each thing to use. Edit numbers here if a meal changes.
export const MEALS = [
  { id: 'smoothie', slot: 'Morning', emoji: '🥤', name: 'The Growth Smoothie',
    desc: 'Blend it all, creatine stirred in.',
    recipe: [
      { item: 'Oats', amount: '80g' },
      { item: 'Full-cream milk', amount: '400ml' },
      { item: 'Peanut butter', amount: '1 tbsp' },
      { item: 'Banana', amount: '1' },
      { item: 'Whey', amount: '1 scoop (~30g)' },
      { item: 'Honey (for taste)', amount: '1 tbsp' },
      { item: 'Creatine', amount: '5g' },
    ],
    cal: 940, protein: 52, fibre: 11,
    alts: [
      { name: 'Overnight oats', note: 'Same ingredients in a tub in the fridge, no blender needed' },
      { name: '2 scoops whey in 500ml milk + 2 toast with PB', note: 'Fastest, no blend' },
      { name: '5 scrambled eggs + 2 toast + a banana', note: 'Whole-food version' },
    ] },
  { id: 'eggs', slot: 'Mid-morning', emoji: '🥚', name: 'Boiled Eggs',
    desc: 'Batch-boil 6–9 at once, they keep 5 days. Grab and go.',
    recipe: [{ item: 'Boiled eggs', amount: '3' }],
    cal: 210, protein: 18, fibre: 0,
    alts: [
      { name: '1 scoop whey in milk', note: 'Actually more protein, ~30g' },
      { name: 'Tub of cottage cheese or double-cream yoghurt', note: 'No prep, grab and go' },
      { name: 'Cheese wedges + a few provitas', note: 'Stash it at work' },
    ] },
  { id: 'lunch', slot: 'Lunch', emoji: '🥪', name: 'Tuna Sandwich',
    desc: 'Mon, Wed, Fri, Sat, Sun.',
    recipe: [
      { item: 'Tuna (light meat), drained', amount: '1 tin (170g)' },
      { item: 'Mayo', amount: '1 tbsp' },
      { item: 'Wholewheat bread', amount: '2 slices' },
    ],
    alt: { name: 'Chicken Roll', when: 'Tue & Thu', emoji: '🍗',
      recipe: [
        { item: 'Grilled chicken (Spar deli)', amount: '200g' },
        { item: 'Bread roll', amount: '1' },
        { item: 'Mayo', amount: '1 tbsp' },
      ], cal: 520, protein: 58 },
    cal: 430, protein: 38, fibre: 6,
    alts: [
      { name: 'Chicken roll', note: 'Deli grilled chicken + roll + mayo (your Tue/Thu option)' },
      { name: 'Egg-mayo sandwich', note: '4 mashed boiled eggs + mayo + 2 bread' },
      { name: 'Tin of pilchards or salmon on toast', note: 'Ring-pull, no cooking' },
    ] },
  { id: 'snack', slot: 'Afternoon / pre-gym', emoji: '🧀', name: 'Provita + Cottage Cheese',
    desc: 'Stash it at work, no prep. Spread it on like a wedge.',
    recipe: [
      { item: 'Provita crackers', amount: '4' },
      { item: 'Cottage cheese', amount: '~100g' },
    ],
    cal: 190, protein: 14, fibre: 3,
    alts: [
      { name: 'Whey shake in milk', note: 'When the snack falls through' },
      { name: 'Banana + PB + a couple of boiled eggs', note: 'Carbs + protein' },
      { name: 'Greek / double-cream yoghurt + a handful of nuts', note: 'Protein + healthy fats' },
    ] },
  { id: 'dinner', slot: 'Dinner', emoji: '🍽️', name: 'Home Dinner', dinner: true,
    desc: 'Whatever’s cooked at home.',
    recipe: [
      { item: 'Cooked dinner', amount: 'big portion' },
      { item: 'Extra carbs (rice/potato)', amount: 'an added scoop' },
    ],
    cal: 750, protein: 42, fibre: 8,
    alts: [
      { name: '2 tins tuna / pilchards on rice or toast + veg', note: 'Nights nobody cooks' },
      { name: 'Shop rotisserie chicken + a roll or microwave rice', note: 'Zero prep' },
      { name: 'Big scramble (5-6 eggs) + toast + cheese', note: 'Breakfast for dinner' },
    ] },
];

export const FIBRE_TARGET = 30; // g/day — general health guideline, his best food-quality proxy

// The sneaky stuff. Rough macros — close enough, no counting.
// Low protein, real calories: fine as bonus surplus once meals are in.
export const TREATS = [
  { id: 'chips', emoji: '🍟', name: 'Chips / crisps', desc: 'A packet (~50g)', cal: 270, protein: 3 },
  { id: 'sweets', emoji: '🍬', name: 'Sweets / lollies', desc: 'A handful or small bag', cal: 200, protein: 0 },
  { id: 'chocolate', emoji: '🍫', name: 'Chocolate', desc: 'A slab or bar', cal: 250, protein: 4 },
  { id: 'biscuits', emoji: '🍪', name: 'Biscuits / baked', desc: 'A few biscuits or a pastry', cal: 230, protein: 3 },
  { id: 'fizzy', emoji: '🥤', name: 'Fizzy drink', desc: 'A can of soft drink', cal: 150, protein: 0 },
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

/* ---------- treats (multiple per day, counted) ---------- */
export async function addTreat(treatId) {
  const date = todayKey();
  const logs = await allLogs();
  const day = logs[date] || {};
  const treats = day.treats || {};
  treats[treatId] = (treats[treatId] || 0) + 1;
  day.treats = treats;
  logs[date] = day;
  await db.set('foodlog', logs);
  return day;
}

export async function removeTreat(treatId) {
  const date = todayKey();
  const logs = await allLogs();
  const day = logs[date] || {};
  const treats = day.treats || {};
  if (treats[treatId]) { treats[treatId] -= 1; if (treats[treatId] <= 0) delete treats[treatId]; }
  day.treats = treats;
  logs[date] = day;
  await db.set('foodlog', logs);
  return day;
}

export function treatTotals(log) {
  let cal = 0, protein = 0;
  const treats = (log && log.treats) || {};
  for (const t of TREATS) {
    const n = treats[t.id] || 0;
    if (n) { cal += t.cal * n; protein += t.protein * n; }
  }
  return { cal, protein };
}

export function mealMacros(meal, log) {
  if (meal.dinner) {
    const size = (log && log.dinner) || 'med';
    const s = DINNER_SIZES[size] || DINNER_SIZES.med;
    return { cal: s.cal, protein: s.protein, fibre: meal.fibre || 0 };
  }
  return { cal: meal.cal, protein: meal.protein, fibre: meal.fibre || 0 };
}

export function dayTotals(log) {
  let cal = 0, protein = 0, fibre = 0;
  for (const meal of MEALS) {
    if (log[meal.id]) { const m = mealMacros(meal, log); cal += m.cal; protein += m.protein; fibre += m.fibre; }
  }
  const t = treatTotals(log);
  return { cal: cal + t.cal, protein: protein + t.protein, fibre };
}

/* Creatine streak — auto-derived from the morning smoothie (creatine lives in it).
   Zero taps: log your smoothie, the streak takes care of itself. */
export async function creatineStreak(now = new Date()) {
  const logs = await allLogs();
  const key = (dt) => dt.toISOString().slice(0, 10);
  const has = (dt) => !!(logs[key(dt)] && logs[key(dt)].smoothie);
  const todayDone = has(now);
  let streak = 0;
  const cursor = new Date(now);
  // today not logged yet shouldn't break the chain — start from yesterday in that case
  if (!todayDone) cursor.setDate(cursor.getDate() - 1);
  while (has(cursor)) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return { streak, todayDone };
}

/* Surplus-blind food-quality nudge: ONLY ever suggests adding, never cutting.
   He needs the calories; this just steers them toward quality. */
export function qualitySignal(totals, targets) {
  if (!totals.cal) return null;
  if (targets.protein - totals.protein > 25)
    return { tone: 'add', text: 'Quality check: protein’s light. Add an egg or a Greek yoghurt.' };
  if (FIBRE_TARGET - (totals.fibre || 0) > 12)
    return { tone: 'add', text: 'Quality check: low on fibre. Add fruit, oats or veg, don’t cut anything.' };
  return { tone: 'good', text: 'Quality check: protein and fibre both solid. Clean fuel today.' };
}
