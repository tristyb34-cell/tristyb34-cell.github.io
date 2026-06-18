# DAX 💪

> Tristan is getting DAAXXXX.

A personal fitness PWA: trainer + nutritionist + motivator in your pocket. No-build vanilla
PWA, all data stored on-device (IndexedDB), offline-first, installable to the iPhone home screen.

## Run it (dev, on the Mac)

It must be **served over http** (service workers + ES modules won't run from `file://`):

```bash
cd ~/personal/dax
python3 -m http.server 8000
```

Then open **http://localhost:8000**. To preview on your iPhone, open
`http://<your-mac-ip>:8000` while on the same wifi, then Share → Add to Home Screen.

## Tweaking the look

All colours and shapes are CSS variables at the top of `src/styles.css`. Change `--accent`
and `--accent-2` to re-skin the whole app, then refresh. (Hard-refresh or bump `CACHE` in
`sw.js` if the service worker is serving an old copy.)

## Structure

```
index.html              app shell (header / view / tabbar)
manifest.webmanifest     PWA manifest
sw.js                    service worker (offline cache)
src/
  styles.css             design system (edit variables here)
  main.js                router + bottom-nav
  store.js               IndexedDB data layer + backup/restore
  data.js                static content (commandments, goal)
  views/                 today / history / diet / progress
assets/icons/            app icons (regenerate via /tmp/dax_icon.py)
```

## Phases

- [x] **Phase 0** — shell, nav, look/feel, local data layer, backup, offline install
- [ ] **Phase 1** — training loop: program, set-logging, rest timer, progressive overload
- [ ] **Phase 2** — history, cumulative stats, trend-weight, photos
- [ ] **Phase 3** — nutrition: preset meals, tap-to-log, daily bar
- [ ] **Phase 4** — motivation engine, commandments rotation, notifications
- [ ] **Phase 5** — calisthenics skill tree, re-entry mode, polish
