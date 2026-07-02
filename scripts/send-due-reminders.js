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

const WEEKDAY = [
  { id: 'smoothie', t: '08:30', title: 'Morning shake + creatine 🥤', body: 'Blend it, sink it, 5g creatine in. Keep the chain alive.' },
  { id: 'lunch', t: '13:00', title: 'Lunch 🥪', body: 'Protein on the plate first.' },
  { id: 'snack', t: '17:00', title: 'Pre-gym fuel 🍌', body: 'PB & honey + a banana before you lift.' },
  { id: 'train', t: '18:00', title: 'Train 🔥', body: 'Time to build. Even the 15-minute version counts.' },
  { id: 'dinner', t: '19:30', title: 'Dinner 🍽️', body: 'Big plate, extra carbs. Grow.' },
];
const WEEKEND = [
  { id: 'smoothie', t: '10:30', title: 'Morning shake + creatine 🥤', body: 'Slow start, same chain. Creatine in.' },
  { id: 'train', t: '12:00', title: 'Train this afternoon 🔥', body: 'Get it in any time this afternoon. Show up.' },
  { id: 'lunch', t: '13:00', title: 'Lunch 🥪', body: 'Protein first.' },
  { id: 'snack', t: '15:30', title: 'Snack 🍌', body: 'Keep the calories coming.' },
  { id: 'dinner', t: '19:00', title: 'Dinner 🍽️', body: 'Finish the day in surplus.' },
];
const SUNDAY_REVIEW = { id: 'weekreview', t: '19:00', title: 'Your week in review 📅', body: 'Open DAX to see your last 7 days and next week’s job.' };

// build today's list, gating train to his training days (Tue/Thu/Fri/Sat)
let list;
if (day === 0) { list = [...WEEKEND.filter(i => i.id !== 'train'), SUNDAY_REVIEW]; } // Sunday: rest + weekly review
else if (day === 6) { list = WEEKEND; }                        // Saturday: trains
else { const trains = day === 2 || day === 4 || day === 5; list = WEEKDAY.filter(i => i.id !== 'train' || trains); }

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
})();
