/* ============================================================
   DAX — cloud reminder sender (runs in GitHub Actions)
   Fires web-push notifications at the right times, even when the
   app is closed. The cloud can't see what he logged on-device, so
   these are time-based nudges; the smart "already done" skipping
   stays in-app. Times are SA local (UTC+2), gated by day of week.
   ============================================================ */
const webpush = require('web-push');

const sub = process.env.PUSH_SUBSCRIPTION;
if (!sub) { console.log('No PUSH_SUBSCRIPTION set yet — nothing to send.'); process.exit(0); }

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);
const subscription = JSON.parse(sub);

async function send(payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log('sent:', payload.title);
  } catch (e) {
    console.error('push failed', e.statusCode || '', e.body || e.message);
    if (e.statusCode === 404 || e.statusCode === 410) console.error('Subscription expired — re-subscribe on the phone and update the secret.');
  }
}

// SA wall-clock (UTC+2, no DST)
const saNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
const day = saNow.getUTCDay();            // 0 Sun .. 6 Sat
const mins = saNow.getUTCHours() * 60 + saNow.getUTCMinutes();
const dayKey = saNow.toISOString().slice(0, 10);
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

const SMOOTHIE_WEEKDAY = { id: 'smoothie', t: '08:30', title: 'Morning shake + creatine 🥤', body: 'Blend it, sink it, 5g creatine in. Keep the chain alive.' };
const LUNCH = { id: 'lunch', t: '13:00', title: 'Lunch 🥪', body: 'Protein on the plate first.' };
const REST_CHECKIN = { id: 'rest', t: '12:00', title: 'Rest day: this is when you grow 🌱', body: 'You do not build muscle in the gym, you build it now. Eat the surplus. Do not skip a big rock.' };

// Weekday training days (Tue/Thu/Fri) — lift in the evening.
const WEEKDAY_TRAIN = [
  SMOOTHIE_WEEKDAY,
  LUNCH,
  { id: 'snack', t: '17:00', title: 'Pre-gym fuel 🍌', body: 'PB & honey + a banana before you lift.' },
  { id: 'train', t: '18:00', title: 'Train 🔥', body: 'Time to build. Even the 15-minute version counts.' },
  { id: 'dinner', t: '19:30', title: 'Dinner 🍽️', body: 'Big plate, extra carbs. Grow.' },
];
// Weekday rest days (Mon/Wed — coaching). Same meals, no pre-gym framing, plus a recovery check-in.
const WEEKDAY_REST = [
  SMOOTHIE_WEEKDAY,
  REST_CHECKIN,
  LUNCH,
  { id: 'snack', t: '17:00', title: 'Afternoon snack 🍌', body: 'No gym today, but the calories still count. Recovery is fed, not rested into.' },
  { id: 'dinner', t: '19:30', title: 'Dinner 🍽️', body: 'Big plate, extra carbs. Grow.' },
];
// Saturday — gym is MORNINGS ONLY, so shake early and train at 08:00.
const SATURDAY = [
  { id: 'smoothie', t: '07:00', title: 'Shake + creatine, then go 🥤', body: 'Gym shuts at midday. Blend it, 5g creatine, out the door.' },
  { id: 'train', t: '08:00', title: 'Train 🔥', body: 'Arms and delts. Morning session, the gym closes early today.' },
  LUNCH,
  { id: 'snack', t: '15:30', title: 'Snack 🍌', body: 'Keep the calories coming.' },
  { id: 'dinner', t: '19:00', title: 'Dinner 🍽️', body: 'Finish the day in surplus.' },
];
// Sunday — full rest + the weekly review.
const SUNDAY = [
  { id: 'smoothie', t: '10:30', title: 'Morning shake + creatine 🥤', body: 'Slow start, same chain. Creatine in.' },
  REST_CHECKIN,
  LUNCH,
  { id: 'snack', t: '15:30', title: 'Snack 🍌', body: 'Keep the calories coming.' },
  { id: 'dinner', t: '19:00', title: 'Dinner 🍽️', body: 'Finish the day in surplus.' },
  { id: 'weekreview', t: '19:00', title: 'Your week in review 📅', body: 'Open DAX to see your last 7 days and next week’s job.' },
];

// Learning nudge (10:00 SA, EVERY day). Training days teach the muscle you're about to
// train; rest days teach recovery, food and theory — the stuff that fails him most.
const LEARN_TIME = '10:00';
const LEARN = {
  0: { title: 'Rest day: learn to sleep 📚', body: 'Sleep is the single biggest recovery lever you own. Two minutes on why. Open DAX → Learn.' },
  1: { title: 'Rest day: learn progressive overload 📚', body: 'Beating last week by one rep is the whole game. Learn the mechanism. Open DAX → Learn.' },
  2: { title: 'Push day: learn the side delts 📚', body: 'Doing shoulders today. Want to know what actually builds that capped, wide look? Two minutes in DAX → Learn.' },
  3: { title: 'Rest day: learn the surplus 📚', body: 'You trained hard for years and never grew. It was the food. Two minutes in DAX → Learn.' },
  4: { title: 'Pull day: learn the V-taper 📚', body: 'Back day today. Learn how your lats build the taper. Open DAX → Learn.' },
  5: { title: 'Leg day: why it matters 📚', body: 'Legs today. Two minutes on why they drag your whole physique up. Open DAX → Learn.' },
  6: { title: 'Arms day: the triceps long head 📚', body: 'Arms today. The triceps is most of your arm size. Learn how to grow it in DAX → Learn.' },
};

// build today's list — training days are Tue/Thu/Fri (evening) + Sat (morning)
let list;
if (day === 0) list = SUNDAY;
else if (day === 6) list = SATURDAY;
else if (day === 2 || day === 4 || day === 5) list = WEEKDAY_TRAIN;
else list = WEEKDAY_REST;                                      // Mon/Wed — coaching, no gym

const WINDOW = 20; // minutes — absorbs GitHub cron drift; crons are >=30min apart so only one matches

(async () => {
  if (process.env.TEST === 'true') {
    await send({ title: 'DAX test push ✅', body: 'Background notifications are live. Now go build.', tag: 'dax-test', url: '/' });
    return;
  }
  for (const item of list) {
    const itemMin = toMin(item.t);
    if (mins >= itemMin && mins < itemMin + WINDOW) {
      await send({ title: item.title, body: item.body, tag: `${dayKey}-${item.id}`, url: '/' });
    }
  }
  // knowledge nudge, every day, deep-links to the Learn tab
  const learn = LEARN[day];
  if (learn && mins >= toMin(LEARN_TIME) && mins < toMin(LEARN_TIME) + WINDOW) {
    await send({ title: learn.title, body: learn.body, tag: `${dayKey}-learn`, url: '/#learn' });
  }
})();
