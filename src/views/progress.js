import { db, exportBackup, importBackup } from '../store.js';
import { lineChart } from '../charts.js';
import { getTargets } from '../profile.js';
import { openReview } from '../review.js';
import { openOnboarding } from '../onboarding.js';

const todayKey = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' });

async function getWeighins() { return (await db.get('weighins', [])) || []; }
async function logWeight(kg) {
  const all = await getWeighins();
  const i = all.findIndex(w => w.date === todayKey());
  if (i >= 0) all[i].kg = kg; else all.push({ date: todayKey(), kg });
  all.sort((a, b) => a.date.localeCompare(b.date));
  await db.set('weighins', all);
}
async function getSleep() { return (await db.get('sleeplogs', [])) || []; }
async function logSleep(hours) {
  const all = await getSleep();
  const i = all.findIndex(s => s.date === todayKey());
  if (i >= 0) all[i].hours = hours; else all.push({ date: todayKey(), hours });
  all.sort((a, b) => a.date.localeCompare(b.date));
  await db.set('sleeplogs', all);
}
async function getMeasurements() { return (await db.get('measurements', [])) || []; }
async function getPhotos() { return (await db.get('photos', [])) || []; }

function trendSeries(weighins) {
  const out = [];
  for (let i = 0; i < weighins.length; i++) {
    const window = weighins.slice(Math.max(0, i - 6), i + 1);
    const avg = window.reduce((s, w) => s + w.kg, 0) / window.length;
    out.push({ x: weighins[i].date, y: Math.round(avg * 10) / 10 });
  }
  return out;
}

export function renderProgress() {
  return { html: '', onMount: (root) => paint(root) };
}

async function paint(root) {
  const weighins = await getWeighins();
  const measurements = await getMeasurements();
  const photos = await getPhotos();
  const sleeps = await getSleep();
  const tg = await getTargets();

  const trend = trendSeries(weighins);
  const current = tg.trendWeight;
  const start = tg.startWeight;
  const changed = current != null ? Math.round((current - start) * 10) / 10 : 0;
  const toGoal = current != null ? Math.round((tg.goalWeight - current) * 10) / 10 : null;

  const sleepAvg = sleeps.length
    ? Math.round((sleeps.slice(-7).reduce((s, x) => s + x.hours, 0) / Math.min(7, sleeps.length)) * 10) / 10 : null;

  const adjNote = tg.calAdjust ? ` <span class="pill accent" style="margin-left:6px;">${tg.calAdjust > 0 ? '+' : ''}${tg.calAdjust} adapted</span>` : '';

  root.innerHTML = `
    <div class="eyebrow">Proof it’s working</div>
    <h1 class="screen-title">Progress</h1>

    <div class="card card-hero">
      <div class="eyebrow">Trend weight</div>
      <div style="display:flex; align-items:baseline; gap:14px; margin-top:2px;">
        <div style="font-size:40px; font-weight:850;">${current != null ? current : '—'}<span style="font-size:18px;">kg</span></div>
        <div class="lead">
          ${current != null ? `${changed >= 0 ? '+' : ''}${changed}kg since day one` : 'Log your weight to start'}
          ${toGoal != null ? `<br>${toGoal > 0 ? `${toGoal}kg to your ${tg.goalWeight}kg target` : `at / past your ${tg.goalWeight}kg target 🎯`}` : ''}
        </div>
      </div>
      <div class="weigh-input">
        <input class="inp" id="w-input" type="number" inputmode="decimal" placeholder="today’s kg" />
        <button class="btn" id="w-log" style="width:auto; padding:12px 20px;">Log</button>
      </div>
      <p class="coach-last" style="margin-top:10px;">Daily target: <strong>${tg.cal} cal · ${tg.protein}g protein</strong>${adjNote}. Weigh in every morning, we only trust the 7-day average.</p>
    </div>

    ${trend.length ? `<div class="card">${lineChart(trend, { fmt: v => `${v}` })}</div>` : ''}

    <div class="section-label">Sleep · the most underrated lever</div>
    <div class="card">
      <div style="display:flex; align-items:baseline; gap:14px;">
        <div style="font-size:30px; font-weight:850;">${sleepAvg != null ? sleepAvg : '—'}<span style="font-size:15px;">h</span></div>
        <div class="lead">${sleepAvg != null ? `7-day average${sleepAvg < 7 ? ' · aim for 7–9h' : ' · dialled in 👌'}` : 'Log last night’s sleep'}</div>
      </div>
      <div class="weigh-input">
        <input class="inp" id="s-input" type="number" inputmode="decimal" step="0.5" placeholder="hours slept" />
        <button class="btn" id="s-log" style="width:auto; padding:12px 20px;">Log</button>
      </div>
    </div>

    <div class="section-label">Monthly review</div>
    <div class="card">
      <p class="lead" style="margin-bottom:12px;">Sit down once a month and see the whole picture: weight, measurements, photos, and what to change next.</p>
      <button class="btn" id="review-btn">📋 Open monthly review</button>
    </div>

    <div class="section-label">Photos · day one vs now</div>
    ${renderPhotos(photos)}
    <button class="btn ghost" id="photo-btn">📸 Add a progress photo</button>
    <input type="file" id="photo-file" accept="image/*" capture="user" hidden />

    <div class="section-label">Measurements</div>
    <div class="card">
      <div class="meas-grid">
        ${['weight', 'shoulders', 'chest', 'arm', 'waist'].map(k =>
          `<label class="meas-field"><span>${k}${k === 'weight' ? ' (kg)' : ' (cm)'}</span>
            <input class="inp" data-m="${k}" type="number" inputmode="decimal" placeholder="—" /></label>`).join('')}
      </div>
      <div style="height:10px;"></div>
      <button class="btn" id="meas-log">Save today’s measurements</button>
    </div>
    ${renderMeasurements(measurements)}

    <div class="section-label">Your stats</div>
    <div class="card">
      <p class="lead" style="margin-bottom:12px;">Your targets are calculated from these. Update them as you grow and the numbers follow.</p>
      <button class="btn ghost" id="profile-btn">⚙️ Edit my stats & goal</button>
    </div>

    <div class="section-label">Your data is yours</div>
    <div class="card">
      <p class="lead" style="margin-bottom:14px;">Everything lives on this device. Back it up so it can never vanish.</p>
      <button class="btn ghost" id="btn-export">⬇️ Export backup</button>
      <div style="height:10px;"></div>
      <button class="btn ghost" id="btn-import">⬆️ Restore from file</button>
      <input type="file" id="file-import" accept="application/json" hidden />
      <p class="lead" id="backup-msg" style="margin-top:12px; color:var(--text-faint); font-size:13px;"></p>
    </div>
  `;

  root.querySelector('#w-log').addEventListener('click', async () => {
    const v = parseFloat(root.querySelector('#w-input').value);
    if (!v) return; await logWeight(v); paint(root);
  });
  root.querySelector('#s-log').addEventListener('click', async () => {
    const v = parseFloat(root.querySelector('#s-input').value);
    if (!v) return; await logSleep(v); paint(root);
  });
  root.querySelector('#review-btn').addEventListener('click', () => openReview(root));
  root.querySelector('#profile-btn').addEventListener('click', () => openOnboarding(root, true));

  const pf = root.querySelector('#photo-file');
  root.querySelector('#photo-btn').addEventListener('click', () => pf.click());
  pf.addEventListener('change', async () => {
    const file = pf.files[0]; if (!file) return;
    const dataUrl = await compress(file);
    const all = await getPhotos(); all.push({ date: todayKey(), dataUrl });
    await db.set('photos', all); paint(root);
  });

  root.querySelector('#meas-log').addEventListener('click', async () => {
    const rec = { date: todayKey() }; let any = false;
    root.querySelectorAll('[data-m]').forEach(inp => { const v = parseFloat(inp.value); if (v) { rec[inp.dataset.m] = v; any = true; } });
    if (!any) return;
    const all = await getMeasurements();
    const i = all.findIndex(m => m.date === rec.date);
    if (i >= 0) all[i] = { ...all[i], ...rec }; else all.push(rec);
    all.sort((a, b) => a.date.localeCompare(b.date));
    await db.set('measurements', all); paint(root);
  });

  const msg = root.querySelector('#backup-msg');
  root.querySelector('#btn-export').addEventListener('click', async () => {
    const json = await exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `dax-backup-${todayKey()}.json`; a.click();
    URL.revokeObjectURL(url);
    await db.set('lastBackup', todayKey());
    msg.textContent = 'Backup downloaded. Keep it somewhere safe.';
  });
  const fi = root.querySelector('#file-import');
  root.querySelector('#btn-import').addEventListener('click', () => fi.click());
  fi.addEventListener('change', async () => {
    const file = fi.files[0]; if (!file) return;
    try { const n = await importBackup(await file.text()); msg.textContent = `Restored ${n} item(s).`; setTimeout(() => paint(root), 600); }
    catch (e) { msg.textContent = `Couldn’t read that file: ${e.message}`; }
  });
}

function renderPhotos(photos) {
  if (!photos.length) return `<div class="card"><p class="lead">No photos yet. Snap a front-on shot today, that’s your day-one baseline. The comparison later is the best motivation there is.</p></div>`;
  const first = photos[0], last = photos[photos.length - 1];
  const compare = photos.length > 1
    ? `<div class="photo-compare">
        <figure><img src="${first.dataUrl}" /><figcaption>Day one · ${fmtDate(first.date)}</figcaption></figure>
        <figure><img src="${last.dataUrl}" /><figcaption>Now · ${fmtDate(last.date)}</figcaption></figure>
      </div>`
    : `<div class="photo-compare"><figure><img src="${first.dataUrl}" /><figcaption>Day one · ${fmtDate(first.date)}</figcaption></figure></div>`;
  return `<div class="card">${compare}<div class="ex-sub" style="margin-top:8px;">${photos.length} photo${photos.length > 1 ? 's' : ''} saved</div></div>`;
}

function renderMeasurements(ms) {
  if (!ms.length) return '';
  const base = ms[0], last = ms[ms.length - 1];
  const keys = ['shoulders', 'chest', 'arm', 'waist', 'weight'];
  const rows = keys.filter(k => last[k] != null).map(k => {
    const d = base[k] != null ? Math.round((last[k] - base[k]) * 10) / 10 : null;
    const unit = k === 'weight' ? 'kg' : 'cm';
    const sign = d > 0 ? '+' : '';
    return `<div class="meas-row"><span>${k}</span><strong>${last[k]}${unit}</strong>
      <span class="${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d != null ? `${sign}${d}` : ''}</span></div>`;
  }).join('');
  return `<div class="card"><div class="ex-sub" style="margin-bottom:8px;">Latest vs day one (${fmtDate(base.date)})</div>${rows}</div>`;
}

function compress(file, max = 720, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.src = URL.createObjectURL(file);
  });
}
