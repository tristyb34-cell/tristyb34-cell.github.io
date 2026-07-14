/* DAX service worker — offline app shell.
   Bump CACHE when you ship changes so clients pull fresh files. */
const CACHE = 'dax-v0.48.0';

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
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(ASSETS);
    // precache every exercise image so workouts work offline in the gym
    try {
      const idx = await fetch('/assets/exercises/index.json').then(r => r.json());
      await c.addAll(idx);
    } catch (e) { /* images will cache lazily on first view */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
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
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});
