/* ============================================================
   DAX — pre-workout check-in
   Captures the tracking he skips (weight, sleep, smoke, energy, food)
   at the one moment he's committed: hitting Start. Fans the answers
   into the same stores the rest of the app reads (weighins, sleeplogs)
   so his morning weigh-in and sleep finally land somewhere useful.
   ============================================================ */
import { db } from './store.js';

const todayKey = () => new Date().toISOString().slice(0, 10);

export async function getCheckin(date = todayKey()) {
  const all = (await db.get('checkins', [])) || [];
  return all.find(c => c.date === date) || null;
}

async function upsert(rec) {
  const all = (await db.get('checkins', [])) || [];
  const i = all.findIndex(c => c.date === rec.date);
  if (i >= 0) all[i] = rec; else all.push(rec);
  await db.set('checkins', all);
  return rec;
}

export async function saveCheckin(data) {
  const date = todayKey();
  await upsert({ date, ...data });

  // weight → weighins (same shape as the Progress-tab logger: {date, kg})
  if (data.weight != null && data.weight !== '') {
    const w = (await db.get('weighins', [])) || [];
    const i = w.findIndex(x => x.date === date);
    if (i >= 0) w[i].kg = Number(data.weight); else w.push({ date, kg: Number(data.weight) });
    w.sort((a, b) => a.date.localeCompare(b.date));
    await db.set('weighins', w);
  }
  // sleep → sleeplogs (extends {date, hours} with quality + the smoke flag)
  if (data.sleepH != null || data.sleepQ != null || data.smoked != null) {
    const s = (await db.get('sleeplogs', [])) || [];
    const i = s.findIndex(x => x.date === date);
    const patch = {};
    if (data.sleepH != null) patch.hours = Number(data.sleepH);
    if (data.sleepQ != null) patch.quality = data.sleepQ;
    if (data.smoked != null) patch.smoked = data.smoked;
    if (i >= 0) s[i] = { ...s[i], ...patch }; else s.push({ date, ...patch });
    s.sort((a, b) => a.date.localeCompare(b.date));
    await db.set('sleeplogs', s);
  }
}

export async function skipCheckin() {
  return upsert({ date: todayKey(), skipped: true });
}

/* Food catch-up: the check-in only fires on training days, so rest-day food never
   gets logged. When it opens, ask about recent days that haven't been answered yet
   (up to 3 back), plus today. Today is never marked "answered" (dinner comes after
   the workout), so it reappears next check-in — pre-filled — to catch the dinner. */
const utcKey = (ms) => new Date(ms).toISOString().slice(0, 10);
export async function foodCatchupDays(nowMs = Date.now()) {
  const answered = new Set((await db.get('foodAnswered', [])) || []);
  const sessions = (await db.get('sessions', [])) || [];
  const first = sessions.length ? sessions[0].date : todayKey();
  const today = utcKey(nowMs);
  const days = [];
  for (let i = 3; i >= 1; i--) {
    const dk = utcKey(nowMs - i * 86400000);
    if (dk < first || answered.has(dk)) continue;
    days.push({ date: dk, isToday: false });
  }
  days.push({ date: today, isToday: true });
  return days;
}
export async function markFoodAnswered(dates) {
  const answered = new Set((await db.get('foodAnswered', [])) || []);
  dates.forEach(d => answered.add(d));
  await db.set('foodAnswered', [...answered]);
}
