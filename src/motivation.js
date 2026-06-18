/* ============================================================
   DAX — Motivation Engine (Phase 4)
   The "Oracle + Sergeant": reads the moment, speaks to YOUR
   goal and numbers. Reflective on rest, hype on training day,
   tough-love when you slip, proud at milestones.
   ============================================================ */
import { db } from './store.js';
import { GOAL } from './data.js';
import { getSessions } from './workouts.js';
import { getPlan } from './plan.js';
import { dayForDate } from './program.js';
import { getDayLog, dayTotals } from './nutrition.js';
import { getTargets } from './profile.js';

const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);
const epochDay = () => Math.floor(Date.now() / 86400000);
const pick = (arr, salt = 0) => arr[(epochDay() + salt) % arr.length];

/* ---------- context ---------- */
export async function buildContext() {
  const now = new Date();
  const sessions = await getSessions();
  const plan = await getPlan();
  const day = dayForDate(plan, now);
  const tk = todayKey(now);

  const trainedToday = sessions.some(s => s.date === tk);
  const lastDate = sessions.length ? sessions[sessions.length - 1].date : null;
  const daysSinceLast = lastDate
    ? Math.round((now - new Date(lastDate + 'T00:00:00')) / 86400000) : Infinity;

  const tg = await getTargets();
  const trendWeight = tg.trendWeight;
  const startWeight = tg.startWeight;

  const totals = dayTotals(await getDayLog(tk));

  const sleeps = (await db.get('sleeplogs', [])) || [];
  const recentSleep = sleeps.slice(-3);
  const avgSleep = recentSleep.length
    ? Math.round((recentSleep.reduce((s, x) => s + x.hours, 0) / recentSleep.length) * 10) / 10 : null;

  let volume = 0;
  for (const s of sessions) for (const e of s.entries) for (const st of e.sets) volume += (st.weight || 0) * (st.reps || 0);

  return {
    now, hour: now.getHours(), isTrainingDay: !!day, dayTitle: day ? day.title : null,
    trainedToday, daysSinceLast, totalWorkouts: sessions.length,
    trendWeight, startWeight, goalWeight: tg.goalWeight,
    gained: trendWeight != null ? Math.round((trendWeight - startWeight) * 10) / 10 : null,
    toGoal: trendWeight != null ? Math.round((tg.goalWeight - trendWeight) * 10) / 10 : null,
    cal: totals.cal, calTarget: tg.cal, protein: totals.protein, proteinTarget: tg.protein,
    avgSleep, volume,
  };
}

/* ---------- the greeting (top of Today) ---------- */
export function greeting(ctx) {
  const goalLine = ctx.toGoal != null && ctx.toGoal > 0
    ? `${ctx.toGoal}kg to your ${ctx.goalWeight}kg Spider-Man frame`
    : `your ${ctx.goalWeight}kg frame`;

  if (ctx.isTrainingDay && !ctx.trainedToday) {
    return pick([
      `${ctx.dayTitle} today. The body you want is on the other side of this session. Go get it. 🔥`,
      `This is a building day. One hour now, ${goalLine}. No negotiation. Let’s move.`,
      `${ctx.dayTitle}. You don’t have to feel like it. You just have to start. Stand up. ⚡`,
      `Think about who you’re becoming, then go train like him. ${ctx.dayTitle} is waiting.`,
    ]);
  }
  if (ctx.trainedToday) {
    return pick([
      `Session done. That’s a brick laid. Now the real growth: eat and sleep. 💪`,
      `You showed up today. That’s the whole game. Most people didn’t. Proud of you.`,
      `Trained. Logged. ${ctx.gained != null && ctx.gained >= 0 ? `${ctx.gained}kg up and climbing.` : 'The line only goes up from here.'} Go refuel. 🍽️`,
    ]);
  }
  if (ctx.daysSinceLast >= 4) {
    return pick([
      `It’s been ${ctx.daysSinceLast} days. No guilt, just truth: momentum is everything. Next session is the one that matters. 🎯`,
      `${ctx.daysSinceLast} days off. The plan still works, but only if you show up. Tomorrow, we’re back.`,
      `Drifting happens. Champions just restart faster than everyone else. Reset today.`,
    ]);
  }
  return pick([
    `Recovery day. Muscle is built right now, not in the gym. Eat big, sleep deep. 😌`,
    `Rest is not the opposite of progress, it’s part of it. ${goalLine}. Trust the process.`,
    `No lifting today. Use it: a good meal, a real sleep. That’s how ${ctx.goalWeight}kg gets built.`,
  ]);
}

/* ---------- actionable nudges (small cards) ---------- */
export function nudges(ctx) {
  const out = [];
  if (ctx.isTrainingDay && !ctx.trainedToday && ctx.hour >= 16) {
    out.push({ icon: '⏰', text: `The day’s slipping and ${ctx.dayTitle} isn’t done. 30–45 minutes. Go.` });
  }
  if (ctx.hour >= 19 && ctx.cal < ctx.calTarget * 0.7) {
    out.push({ icon: '🥤', text: `You’re behind on food: ${ctx.cal}/${ctx.calTarget} cal. A hardgainer can’t skip calories. Smoothie, now.` });
  } else if (ctx.hour >= 20 && ctx.protein < ctx.proteinTarget * 0.8) {
    out.push({ icon: '🍗', text: `Protein’s short today (${ctx.protein}/${ctx.proteinTarget}g). Don’t go to bed under target.` });
  }
  if (ctx.avgSleep != null && ctx.avgSleep < 7) {
    out.push({ icon: '😴', text: `You’re averaging ${ctx.avgSleep}h sleep. Testosterone and muscle repair happen in deep sleep, this is quietly capping your gains. Get to bed.` });
  }
  return out.slice(0, 2);
}

/* ---------- milestones ---------- */
const MILESTONES = [
  { id: 'w1', test: c => c.totalWorkouts >= 1, title: 'First session done', body: 'You started. That’s the hardest rep there is. 🏆' },
  { id: 'w5', test: c => c.totalWorkouts >= 5, title: '5 workouts in', body: 'A handful in. This is becoming a habit, not a phase.' },
  { id: 'w10', test: c => c.totalWorkouts >= 10, title: '10 workouts', body: 'Double digits. Your tendons are awake, time to push the weight.' },
  { id: 'w25', test: c => c.totalWorkouts >= 25, title: '25 workouts', body: 'This is who you are now. Consistency is the superpower.' },
  { id: 'w50', test: c => c.totalWorkouts >= 50, title: '50 workouts', body: 'Half a hundred. People are starting to notice, aren’t they? 😎' },
  { id: 'g1', test: c => c.gained != null && c.gained >= 1, title: '+1kg of you', body: 'A kilo up. On a hardgainer, that’s a win most never get.' },
  { id: 'g3', test: c => c.gained != null && c.gained >= 3, title: '+3kg', body: 'Three kilos of new you. The mirror’s changing. Keep eating.' },
  { id: 'g5', test: c => c.gained != null && c.gained >= 5, title: '+5kg', body: 'Five kilos. You’re genuinely close to the Tom Holland frame now. 🕷️' },
  { id: 't10', test: c => c.volume >= 10000, title: '10 tonnes moved', body: 'You’ve lifted 10,000kg total. Brick by brick.' },
  { id: 't50', test: c => c.volume >= 50000, title: '50 tonnes moved', body: '50 tonnes. That’s a serious amount of work in the bank.' },
];

export async function checkMilestones(ctx) {
  const seen = new Set((await db.get('milestones_seen', [])) || []);
  const fresh = MILESTONES.filter(m => !seen.has(m.id) && m.test(ctx));
  if (fresh.length) {
    fresh.forEach(m => seen.add(m.id));
    await db.set('milestones_seen', [...seen]);
  }
  return fresh;
}

/* ---------- commandments (re-exported helper lives in data.js) ---------- */
