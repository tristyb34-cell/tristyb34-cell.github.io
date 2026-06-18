/* ============================================================
   DAX — onboarding / stats editor (Phase 4.5)
   First run captures your real stats so targets are yours.
   Re-openable any time to update as you grow.
   ============================================================ */
import { getProfile, saveProfile, baseTargets } from './profile.js';

export async function openOnboarding(root, isEdit = false, onDone = null) {
  const p = await getProfile();
  const overlay = document.createElement('div');
  overlay.id = 'onboard';
  overlay.innerHTML = `
    <div class="onboard-inner">
      <div class="onboard-head">
        <div class="brand-mark">DAX</div>
        <h2>${isEdit ? 'Your stats' : 'Let’s set you up'}</h2>
        <p class="lead">${isEdit ? 'Update these as you grow, your targets follow automatically.' : 'Two minutes. This makes every number in DAX actually yours.'}</p>
      </div>

      <div class="onboard-grid">
        <label class="meas-field"><span>Weight (kg)</span><input class="inp" id="o-weight" type="number" inputmode="decimal" value="${p.weight}" /></label>
        <label class="meas-field"><span>Goal weight (kg)</span><input class="inp" id="o-goal" type="number" inputmode="decimal" value="${p.goalWeight}" /></label>
        <label class="meas-field"><span>Height (cm)</span><input class="inp" id="o-height" type="number" inputmode="numeric" value="${p.height}" /></label>
        <label class="meas-field"><span>Age</span><input class="inp" id="o-age" type="number" inputmode="numeric" value="${p.age}" /></label>
      </div>

      <div class="section-label">Sex (for calorie maths)</div>
      <div class="seg" id="o-sex">
        ${['male', 'female'].map(s => `<button class="seg-btn ${p.sex === s ? 'active' : ''}" data-sex="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}
      </div>

      <div class="section-label">How active are you, day to day?</div>
      <div class="seg col" id="o-activity">
        ${[[1.3, 'Mostly sitting'], [1.5, 'On my feet a fair bit'], [1.7, 'Very active / physical job']].map(([v, l]) =>
          `<button class="seg-btn ${p.activity === v ? 'active' : ''}" data-act="${v}">${l}</button>`).join('')}
      </div>

      <div class="card" id="o-preview" style="margin-top:18px;"></div>

      <button class="btn" id="o-save">${isEdit ? 'Save' : 'Build my DAX 💪'}</button>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  const state = { sex: p.sex, activity: p.activity };

  const num = (id) => parseFloat(overlay.querySelector(id).value) || 0;
  function refreshPreview() {
    const prof = { ...state, height: num('#o-height'), age: num('#o-age'), sex: state.sex, activity: state.activity };
    const t = baseTargets(prof, num('#o-weight'));
    overlay.querySelector('#o-preview').innerHTML = `
      <div class="eyebrow">Your daily target</div>
      <div style="display:flex; gap:22px; align-items:baseline; margin-top:4px;">
        <div><div style="font-size:28px;font-weight:850;">${t.cal}</div><div class="lead">calories</div></div>
        <div><div style="font-size:28px;font-weight:850;">${t.protein}g</div><div class="lead">protein</div></div>
      </div>
      <p class="coach-last" style="margin-top:8px;">Maintenance ~${t.tdee} + a lean-bulk surplus. This adapts as your weight moves.</p>`;
  }

  overlay.querySelectorAll('#o-sex .seg-btn').forEach(b => b.addEventListener('click', () => {
    state.sex = b.dataset.sex;
    overlay.querySelectorAll('#o-sex .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    refreshPreview();
  }));
  overlay.querySelectorAll('#o-activity .seg-btn').forEach(b => b.addEventListener('click', () => {
    state.activity = parseFloat(b.dataset.act);
    overlay.querySelectorAll('#o-activity .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    refreshPreview();
  }));
  overlay.querySelectorAll('input').forEach(i => i.addEventListener('input', refreshPreview));
  refreshPreview();

  overlay.querySelector('#o-save').addEventListener('click', async () => {
    await saveProfile({
      weight: num('#o-weight'), goalWeight: num('#o-goal'),
      height: num('#o-height'), age: num('#o-age'),
      sex: state.sex, activity: state.activity, onboarded: true,
    });
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 250);
    if (onDone) onDone();
    else import('./views/today.js').then(m => m.mountToday(root));
  });
}
