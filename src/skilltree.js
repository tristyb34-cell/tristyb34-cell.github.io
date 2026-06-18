/* ============================================================
   DAX — calisthenics skill tree UI (Phase 5)
   ============================================================ */
import { getSessions } from './workouts.js';
import { SKILLS, TREE_UNLOCK_AT, treeUnlocked, getSkillState, setSkillLevel, skillAvailable, reqText } from './skills.js';

let O = null; // overlay element

export async function openSkillTree(root) {
  const sessions = await getSessions();
  const total = sessions.length;
  O = document.createElement('div');
  O.id = 'tree';
  document.body.appendChild(O);
  requestAnimationFrame(() => O.classList.add('show'));

  if (!treeUnlocked(total)) renderLocked(total);
  else await renderTree();
}

function close() { O.classList.remove('show'); setTimeout(() => O.remove(), 250); }

function renderLocked(total) {
  const pct = Math.round((total / TREE_UNLOCK_AT) * 100);
  O.innerHTML = `
    <div class="tree-inner">
      <button class="back-btn" id="tx">‹ Close</button>
      <div class="stub" style="padding-top:30px;">
        <span class="glyph">🔒</span>
        <h2>Calisthenics: locked</h2>
        <p>You can’t skill-train on a body without a base, you’d just get hurt. Build the foundation first.</p>
      </div>
      <div class="card">
        <div class="macro-top"><span>Sessions logged</span><span><strong>${total}</strong> / ${TREE_UNLOCK_AT}</span></div>
        <div class="macro-bar"><span style="width:${pct}%"></span></div>
        <p class="coach-last" style="margin-top:12px;">${TREE_UNLOCK_AT - total} more sessions (about ${Math.ceil((TREE_UNLOCK_AT - total) / 4)} week${Math.ceil((TREE_UNLOCK_AT - total) / 4) > 1 ? 's' : ''}) and the tree opens. Then the fun begins. 🌳</p>
      </div>
    </div>`;
  O.querySelector('#tx').addEventListener('click', close);
}

async function renderTree() {
  const state = await getSkillState();
  const tier = (n) => SKILLS.filter(s => s.tier === n);

  const card = (skill) => {
    const lvl = state[skill.id] || 0;
    const max = skill.levels.length;
    const avail = skillAvailable(skill, state);
    const pct = Math.round((lvl / max) * 100);
    const done = lvl >= max;
    return `
      <button class="skill-card ${!avail ? 'locked' : ''} ${done ? 'done' : ''}" data-skill="${skill.id}" ${avail ? '' : 'disabled'}>
        <div class="skill-icon">${avail ? skill.icon : '🔒'}</div>
        <div class="skill-body">
          <div class="ex-name">${skill.name}${done ? ' ✓' : ''}</div>
          <div class="meal-desc">${avail ? skill.blurb : `Unlock: ${reqText(skill)}`}</div>
          ${avail ? `<div class="macro-bar" style="margin-top:8px;"><span style="width:${pct}%" class="${done ? 'full' : ''}"></span></div>
            <div class="skill-lvl">${done ? 'Mastered' : `Level ${lvl}/${max}${lvl < max ? ' · next: ' + skill.levels[lvl].name : ''}`}</div>` : ''}
        </div>
      </button>`;
  };

  O.innerHTML = `
    <div class="tree-inner">
      <button class="back-btn" id="tx">‹ Close</button>
      <div class="eyebrow">Unlocked 🌳</div>
      <h1 class="screen-title">Skill tree</h1>
      <p class="lead">Grind the progressions. Each one’s a milestone. This is the path to the strong, lean calisthenics look.</p>

      <div class="section-label">Foundations</div>
      ${tier(1).map(card).join('')}

      <div class="section-label">Advanced skills</div>
      ${tier(2).map(card).join('')}
    </div>`;
  O.querySelector('#tx').addEventListener('click', close);
  O.querySelectorAll('.skill-card:not([disabled])').forEach(c =>
    c.addEventListener('click', () => renderSkill(c.dataset.skill)));
}

async function renderSkill(id) {
  const skill = SKILLS.find(s => s.id === id);
  const state = await getSkillState();
  const lvl = state[id] || 0;

  O.innerHTML = `
    <div class="tree-inner">
      <button class="back-btn" id="tback">‹ Skill tree</button>
      <div class="ex-hero" style="padding:24px; text-align:center;">
        <div style="font-size:54px;">${skill.icon}</div>
        <div class="ex-name big">${skill.name}</div>
        <div class="ex-sub">${skill.group} · ${lvl}/${skill.levels.length} levels</div>
      </div>
      <p class="lead" style="margin-bottom:8px;">${skill.blurb}</p>
      <div class="section-label">Progressions · tap the one you can do</div>
      ${skill.levels.map((l, i) => {
        const reached = i < lvl;
        const current = i === lvl;
        return `
          <button class="level-row ${reached ? 'reached' : ''} ${current ? 'current' : ''}" data-lvl="${i}">
            <div class="level-no">${reached ? '✓' : i + 1}</div>
            <div class="level-body"><div class="ex-name">${l.name}</div><div class="meal-desc">${l.how}</div></div>
          </button>`;
      }).join('')}
      <p class="coach-last" style="margin-top:12px;">Tap a progression once you can hit it cleanly. Train the next one up 2–3× a week.</p>
    </div>`;

  O.querySelector('#tback').addEventListener('click', renderTree);
  O.querySelectorAll('.level-row').forEach(r => r.addEventListener('click', async () => {
    const i = Number(r.dataset.lvl);
    const newLevel = (i + 1 === lvl) ? i : i + 1; // tapping current level again steps back
    await setSkillLevel(id, newLevel);
    renderSkill(id);
  }));
}
