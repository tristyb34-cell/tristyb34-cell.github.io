/* ============================================================
   DAX — static content (Phase 0)
   Plan, menu, exercises etc. get added here in later phases.
   ============================================================ */

// App version watermark — bump this AND the CACHE const in sw.js together on every ship.
export const APP_VERSION = 'v0.46.0';

// Public VAPID key for web push (safe to embed; private key lives in GitHub Secrets).
export const VAPID_PUBLIC_KEY = 'BEznbY05xi5mY6_hwZOAamNsu5ZP-p4Fs1l2cr3M9bXuYzfbVaJpwBZTxzMxUlgrQ_mNR2zz-TCUEwsp2JwWdJo';

export const COMMANDMENTS = [
  'Thou shalt show up, even when thou canst not be fucked.',
  'Thou shalt add a rep or a kilo, or thou art merely exercising, not growing.',
  'Thou shalt eat in surplus, and not skip meals, for that is the skinny man’s curse.',
  'Thou shalt hit thy protein every single day.',
  'Thou shalt sleep 7-9 hours, for muscle is built in the dark, not the gym.',
  'Thou shalt not drink thy gains away.',
  'Thou shalt not worship sugar, the false prophet of energy.',
  'Thou shalt honour the rest day.',
  'Thou shalt not compare thy chapter 1 to another man’s chapter 20.',
  'Thou shalt remember the why: this is who thou art becoming, not a thing thou art doing.',
];

// Deterministic "commandment of the day" so it changes daily, not per refresh.
export function commandmentOfTheDay() {
  const epochDay = Math.floor(Date.now() / 86400000);
  const i = epochDay % COMMANDMENTS.length;
  return { num: i + 1, text: COMMANDMENTS[i] };
}

export const GOAL = {
  goalName: 'John Morrison',
  startWeight: 65,
  targetWeight: 80,        // John Morrison look, scaled to 175cm (his ~78-83kg lean band)
  dreamWeight: 82,
  dailyCalories: 2700,
  dailyProtein: 155,
};

// My Why — the durable reasons, beyond the mirror. The reflective side
// of the coach surfaces one of these on rest days. Aesthetics gets you in
// the door; this is the prize. (Surfaced via whyOfTheDay; full list in the
// "My Why" card on Today.)
export const WHY = [
  { head: 'A retirement fund for my body', text: 'Muscle is a savings account I can only pay into now. The strength I bank in my twenties is what I live off at eighty.' },
  { head: 'Independent at 80, not stuck in a chair', text: 'Most people lose the strength to stand from a chair by their eighties. I’m building the buffer so I never do.' },
  { head: 'Protect the engine', text: 'Lifting guards my bones, my brain, and my blood sugar for life. It’s the single biggest lever on staying healthy as I age.' },
  { head: 'Don’t deteriorate', text: 'My body will age either way. Training is how I make the decline gentle instead of steep.' },
  { head: 'Stay a fully functional human', text: 'The abs get me in the door. Being strong, mobile and sharp for decades is the real prize.' },
];

export function whyOfTheDay() {
  const i = Math.floor(Date.now() / 86400000) % WHY.length;
  return WHY[i];
}

// Dynamic warm-up BEFORE lifting: wakes the joints, primes the muscles, prevents injury.
export const WARMUP = [
  { name: '3–5 min light cardio', detail: 'Brisk walk, bike or skipping to raise your heart rate and body temp.', dur: '3–5 min' },
  { name: 'Arm circles', detail: 'Big slow circles, forward then back. Opens the shoulders.', dur: '30s each way' },
  { name: 'Leg swings', detail: 'Front-to-back and side-to-side, hold something for balance.', dur: '10 / leg' },
  { name: 'Bodyweight squats', detail: 'Full depth, controlled. Wakes up hips, knees and ankles.', dur: '15 reps' },
  { name: 'Band pull-aparts / shoulder rolls', detail: 'Primes the upper back and rear delts for pressing and pulling.', dur: '15 reps' },
  { name: 'Light warm-up sets', detail: 'On your first big lift, do 1–2 sets at ~50% before your working weight.', dur: '1–2 sets' },
];

// Static cool-down AFTER lifting: hold each 20–30s, breathe, never bounce.
export const COOLDOWN = [
  { name: 'Chest / doorway stretch', detail: 'Forearm on a doorframe, step through gently. Opens a tight chest.', dur: '20–30s / side' },
  { name: 'Overhead lat stretch', detail: 'Reach one arm overhead and lean away. Stretches the back you just trained.', dur: '20–30s / side' },
  { name: 'Triceps stretch', detail: 'Hand behind your head, gently push the elbow down.', dur: '20–30s / side' },
  { name: 'Standing hamstring stretch', detail: 'Hinge at the hips, soft knees, reach toward your toes.', dur: '30s' },
  { name: 'Quad stretch', detail: 'Pull one heel to your glute, knees together, stand tall.', dur: '20–30s / side' },
  { name: 'Hip flexor lunge', detail: 'Half-kneel, push the hips forward. Undoes all the sitting at work.', dur: '20–30s / side' },
  { name: "Child's pose", detail: 'Sit back on your heels, arms forward, breathe. Decompress the spine.', dur: '30s' },
];
