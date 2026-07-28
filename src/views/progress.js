import { db, exportBackup, importBackup } from '../store.js';
import { lineChart } from '../charts.js';
import { getTargets } from '../profile.js';
import { openReview } from '../review.js';
import { openOnboarding } from '../onboarding.js';
import { announce } from '../a11y.js';

const todayKey = () => new Date().toISOString().slice(0, 10);
/* SA keyboards give a comma for decimals and type="number" silently eats it, so accept both. */
const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? null : n; };
/* date of the measurement entry being edited; null = logging a new one for today */
let editDate = null;
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
  editDate = null;
  return { html: '', onMount: (root) => paint(root) };
}

async function paint(root) {
  const weighins = await getWeighins();
  const measurements = await getMeasurements();
  const photos = await getPhotos();
  const sleeps = await getSleep();
  const tg = await getTargets();

  const editing = editDate ? (measurements.find(m => m.date === editDate) || null) : null;
  if (!editing) editDate = null;

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
      <label class="j-label" for="w-input" style="margin:16px 0 8px;">Today’s weigh-in (kg)</label>
      <div class="weigh-input" style="margin-top:0;">
        <input class="inp" id="w-input" type="text" inputmode="decimal" pattern="[0-9.,]*" placeholder="e.g. 73,6" />
        <button class="btn" id="w-log" style="width:auto; padding:12px 20px;">Log</button>
      </div>
      <p class="set-error" id="w-error" role="alert"></p>
      <p class="coach-last" style="margin-top:10px;">Daily target: <strong>${tg.cal} cal · ${tg.protein}g protein</strong>${adjNote}. Weigh in every morning, we only trust the 7-day average.</p>
    </div>

    ${trend.length ? `<div class="card">${lineChart(trend, { fmt: v => `${v}` })}</div>` : ''}

    <div class="section-label">Sleep · the most underrated lever</div>
    <div class="card">
      <div style="display:flex; align-items:baseline; gap:14px;">
        <div style="font-size:30px; font-weight:850;">${sleepAvg != null ? sleepAvg : '—'}<span style="font-size:15px;">h</span></div>
        <div class="lead">${sleepAvg != null ? `7-day average${sleepAvg < 7 ? ' · aim for 7–9h' : ' · dialled in 👌'}` : 'Log last night’s sleep'}</div>
      </div>
      <label class="j-label" for="s-input" style="margin:16px 0 8px;">Hours slept last night</label>
      <div class="weigh-input" style="margin-top:0;">
        <input class="inp" id="s-input" type="text" inputmode="decimal" pattern="[0-9.,]*" placeholder="e.g. 7,5" />
        <button class="btn" id="s-log" style="width:auto; padding:12px 20px;">Log</button>
      </div>
      <p class="set-error" id="s-error" role="alert"></p>
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
    <div class="card" id="meas-card">
      <div class="meas-editing" id="meas-editing" role="status" aria-live="polite" ${editing ? '' : 'hidden'}>
        <span>Editing the entry from <strong>${editing ? fmtDate(editing.date) : ''}</strong></span>
        <button type="button" class="j-del" id="meas-cancel" aria-label="Cancel editing, return to new entry"><span aria-hidden="true">✕</span></button>
      </div>
      <div class="meas-grid" aria-describedby="meas-editing">
        ${['weight', 'shoulders', 'chest', 'arm', 'waist'].map(k =>
          `<label class="meas-field"><span>${k}${k === 'weight' ? ' (kg)' : ' (cm)'}</span>
            <input class="inp" data-m="${k}" type="text" inputmode="decimal" pattern="[0-9.,]*" placeholder="—" value="${editing && editing[k] != null ? editing[k] : ''}" /></label>`).join('')}
      </div>
      <div style="height:10px;"></div>
      <button class="btn" id="meas-log">${editing ? 'Update this entry' : 'Save today’s measurements'}</button>
      <p class="set-error" id="meas-error" role="alert"></p>
    </div>
    ${renderMeasurements(measurements)}
    ${renderMeasEntries(measurements)}

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
    const err = root.querySelector('#w-error');
    const v = num(root.querySelector('#w-input').value);
    if (!v) { err.textContent = 'Pop your weight in first, like 73,6'; return; }
    err.textContent = '';
    await logWeight(v); announce(`Weight logged, ${v} kilograms.`); paint(root);
  });
  root.querySelector('#s-log').addEventListener('click', async () => {
    const err = root.querySelector('#s-error');
    const v = num(root.querySelector('#s-input').value);
    if (!v) { err.textContent = 'How many hours? Something like 7,5'; return; }
    err.textContent = '';
    await logSleep(v); announce(`Sleep logged, ${v} hours.`); paint(root);
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
    const err = root.querySelector('#meas-error');
    const wasEditing = editDate;
    const rec = { date: wasEditing || todayKey() }; let any = false;
    root.querySelectorAll('[data-m]').forEach(inp => { const v = num(inp.value); if (v) { rec[inp.dataset.m] = v; any = true; } });
    if (!any) { err.textContent = 'Fill in at least one measurement first.'; return; }
    err.textContent = '';
    const all = await getMeasurements();
    const i = all.findIndex(m => m.date === rec.date);
    if (i >= 0) all[i] = { ...all[i], ...rec }; else all.push(rec);
    all.sort((a, b) => a.date.localeCompare(b.date));
    await db.set('measurements', all);
    editDate = null;
    announce(wasEditing ? 'Measurements updated.' : 'Measurements saved.');
    paint(root);
  });

  const cancelBtn = root.querySelector('#meas-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', async () => {
    const wasEditing = editDate;
    editDate = null;
    announce('Edit cancelled.');
    await paint(root);
    const back = root.querySelector(`[data-medit="${wasEditing}"]`) || root.querySelector('#meas-heading');
    if (back) back.focus();
  });

  root.querySelectorAll('[data-medit]').forEach(btn => btn.addEventListener('click', async () => {
    editDate = btn.dataset.medit;
    await paint(root);
    announce(`Editing measurements from ${fmtDate(editDate)}.`);
    const card = root.querySelector('#meas-card');
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const first = card.querySelector('[data-m]');
    // double rAF so VoiceOver reads the mode change before focus moves
    if (first) requestAnimationFrame(() => requestAnimationFrame(() => first.focus({ preventScroll: true })));
  }));

  root.querySelectorAll('[data-mdel]').forEach(btn => btn.addEventListener('click', async () => {
    const d = btn.dataset.mdel;
    if (!confirm(`Delete the measurements from ${fmtDate(d)}? This can’t be undone.`)) return;
    const all = (await getMeasurements()).filter(m => m.date !== d);
    await db.set('measurements', all);
    if (editDate === d) editDate = null;
    announce('Entry deleted.');
    await paint(root);
    // deltas above change with the list, so we repaint and put focus back on the list
    const next = root.querySelector('[data-medit]') || root.querySelector('#meas-log');
    if (next) next.focus();
  }));

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
    return `<div class="meas-row"><span>${k}</span><strong>${round1(last[k])}${unit}</strong>
      <span class="${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d != null ? `${sign}${d}` : ''}</span></div>`;
  }).join('');
  return `<div class="card"><div class="ex-sub" style="margin-bottom:8px;">Latest vs day one (${fmtDate(base.date)})</div>${rows}</div>`;
}

const round1 = (n) => Math.round(n * 10) / 10;

/* Every saved entry, oldest first, so a wrong baseline can be fixed on-device. */
function renderMeasEntries(ms) {
  if (!ms.length) return '';
  const keys = [['weight', 'Weight', 'kg'], ['shoulders', 'Shoulders', 'cm'], ['chest', 'Chest', 'cm'], ['arm', 'Arm', 'cm'], ['waist', 'Waist', 'cm']];
  const rows = ms.map((m, i) => {
    const label = fmtDate(m.date);
    const vals = keys.filter(([k]) => m[k] != null).map(([k, lbl, u]) => `${lbl} ${round1(m[k])} ${u}`).join(', ');
    return `<li class="card meas-entry" id="meas-entry-${m.date}">
      <div class="meas-entry-top">
        <span class="j-date">${label}${i === 0 ? ' <span class="pill">day one</span>' : ''}</span>
        <span class="meas-entry-actions">
          <button type="button" class="j-del" data-medit="${m.date}" aria-label="Edit measurements from ${label}"><span aria-hidden="true">✎</span></button>
          <button type="button" class="j-del" data-mdel="${m.date}" aria-label="Delete measurements from ${label}"><span aria-hidden="true">🗑</span></button>
        </span>
      </div>
      <p class="ex-sub">${vals || 'no values'}</p>
    </li>`;
  }).join('');
  return `<h2 class="section-label" id="meas-heading" tabindex="-1">Saved measurements</h2>
    <p class="lead" style="margin:-4px 4px 10px;">Day one is what every delta above is measured from. Tap ✎ to correct one.</p>
    <ul class="j-list" aria-label="Saved measurements, oldest first">${rows}</ul>`;
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
