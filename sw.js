/* DAX service worker — offline app shell.
   Bump CACHE when you ship changes so clients pull fresh files. */
const CACHE = 'dax-v0.55.0';

const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/src/styles.css',
  '/src/main.js',
  '/src/store.js',
  '/src/data.js',
  '/src/program.js',
  '/src/plan.js',
  '/src/equipment.js',
  '/src/workouts.js',
  '/src/safety.js',
  '/src/session.js',
  '/src/editor.js',
  '/src/charts.js',
  '/src/nutrition.js',
  '/src/motivation.js',
  '/src/notify.js',
  '/src/profile.js',
  '/src/onboarding.js',
  '/src/review.js',
  '/src/reentry.js',
  '/src/skills.js',
  '/src/skilltree.js',
  '/src/schedule.js',
  '/src/gameplan.js',
  '/src/weekreview.js',
  '/src/phase.js',
  '/src/why.js',
  '/src/cost.js',
  '/src/journal.js',
  '/src/a11y.js',
  '/src/theme.js',
  '/src/cues.js',
  '/src/checkins.js',
  '/src/bonus.js',
  '/src/knowledge.js',
  '/src/views/journal.js',
  '/src/views/learn.js',
  '/src/consistency.js',
  '/src/views/today.js',
  '/src/views/plan.js',
  '/src/views/history.js',
  '/src/views/diet.js',
  '/src/views/progress.js',
  '/assets/fonts/pirata-one.woff2',
  '/assets/fonts/comfortaa.woff2',
  '/assets/fonts/cinzel.woff2',
  '/assets/fonts/black-ops-one.woff2',
  '/assets/fonts/orbitron.woff2',
  '/assets/icons/icon-192.png',
  '/assets/icons/favicon-64.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-180.png',
];

// Exercise images live in their OWN cache, deliberately NOT versioned: the image
// files never change, so a version bump must not evict them. Bumping CACHE used to
// wipe all 175 and force a re-download, which is why the gym showed no pictures.
const IMG_CACHE = 'dax-images-v1';

const isExerciseImg = (url) => url.includes('/assets/exercises/');

// Cache the exercise images WITHOUT addAll: addAll is atomic, so a single failed
// image (one CDN hiccup across 175 parallel requests) threw the whole batch away
// and left nothing cached. Chunked + allSettled means one failure costs one image.
async function precacheImages() {
  try {
    const c = await caches.open(IMG_CACHE);
    const idx = await fetch('/assets/exercises/index.json', { cache: 'no-cache' }).then(r => r.json());
    const missing = [];
    for (const url of idx) if (!(await c.match(url))) missing.push(url);
    const CHUNK = 8; // gentle on the CDN, and survivable if the connection drops
    for (let i = 0; i < missing.length; i += CHUNK) {
      await Promise.allSettled(missing.slice(i, i + CHUNK).map(u => c.add(u)));
    }
  } catch (_) { /* whatever's missing caches lazily on first view */ }
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(ASSETS);
    await precacheImages(); // never throws, so a bad image can't fail the install
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    // only sweep old APP-shell caches; the image cache is intentionally kept
    await Promise.all(keys.filter(k => k !== CACHE && k !== IMG_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// web push: show the notification the cron sent (works when the app is closed)
self.addEventListener('push', (e) => {
  let data = { title: 'DAX', body: 'Time to move.' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch (_) { if (e.data) data.body = e.data.text(); }
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-192.png',
    tag: data.tag || 'dax-push',
    data: { url: data.url || '/' },
  }));
});

// tapping a push opens (or focuses) the app
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) return c.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});

// network-first for navigations (so updates show), cache-first for assets (so it's fast & offline)
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }
  e.respondWith((async () => {
    // caches.match searches every cache, so this finds images in IMG_CACHE too
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        // images go to the durable cache so the next version bump can't evict them
        const target = isExerciseImg(req.url) ? IMG_CACHE : CACHE;
        const copy = res.clone();
        caches.open(target).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (_) {
      return Response.error(); // was `return cached` — always undefined here, which threw
    }
  })());
});
