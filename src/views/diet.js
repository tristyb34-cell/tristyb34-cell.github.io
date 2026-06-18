import {
  MEALS, DINNER_SIZES, SHOPPING, SHOPPING_TOTAL,
  getDayLog, toggleMeal, setDinnerSize, mealMacros, dayTotals,
} from '../nutrition.js';
import { getTargets } from '../profile.js';
import { getScheduleByKind, updateItem, resetSchedule } from '../schedule.js';

let sub = 'today';
let schedKind = 'weekday';
let TARGET = { cal: 2850, protein: 140 };

export function renderDiet() {
  return { html: '', onMount: (root) => paint(root) };
}

async function paint(root) {
  const log = await getDayLog();
  TARGET = await getTargets();

  root.innerHTML = `
    <div class="eyebrow">The real battlefield</div>
    <h1 class="screen-title">Fuel</h1>
    <div class="seg">
      ${[['today', 'Today'], ['menu', 'Menu'], ['times', 'Times'], ['shopping', 'Shop']].map(([k, l]) =>
        `<button class="seg-btn ${sub === k ? 'active' : ''}" data-sub="${k}">${l}</button>`).join('')}
    </div>
    <div id="fuel-body"></div>
  `;
  root.querySelectorAll('.seg-btn').forEach(b => b.addEventListener('click', () => { sub = b.dataset.sub; paint(root); }));

  const body = root.querySelector('#fuel-body');
  if (sub === 'today') renderToday(body, log);
  else if (sub === 'menu') renderMenu(body);
  else if (sub === 'times') await renderSchedule(body, root);
  else renderShopping(body);
}

async function renderSchedule(body, root) {
  const items = await getScheduleByKind(schedKind);
  body.innerHTML = `
    <div class="seg" style="margin-top:0;">
      ${[['weekday', 'Weekday'], ['weekend', 'Weekend']].map(([k, l]) =>
        `<button class="seg-btn ${schedKind === k ? 'active' : ''}" data-kind="${k}">${l}</button>`).join('')}
    </div>
    <div class="card card-hero">
      <div class="eyebrow">${schedKind === 'weekend' ? 'Weekend' : 'Weekday'} timetable</div>
      <p class="lead" style="margin-top:4px;">${schedKind === 'weekend'
        ? 'Used Saturday & Sunday. Later starts, training any time in the afternoon.'
        : 'Used Monday–Friday. DAX nudges you at these times when you open the app.'}</p>
    </div>
    ${items.map(it => `
      <div class="card sched-card ${it.enabled ? '' : 'off'}">
        <input type="time" class="inp sched-time" data-id="${it.id}" value="${it.time}" />
        <div class="sched-body">
          <div class="ex-name">${it.label}</div>
          <div class="meal-desc">${it.body}</div>
        </div>
        <button class="sched-toggle ${it.enabled ? 'on' : ''}" data-id="${it.id}">${it.enabled ? 'On' : 'Off'}</button>
      </div>`).join('')}
    <div class="card"><p class="lead">📱 These fire when the app is open. For can’t-miss ones (smoothie, creatine), set a matching iPhone alarm too, that buzzes even when DAX is closed.</p></div>
    <button class="btn ghost" id="sched-reset">↺ Reset ${schedKind} times</button>
  `;
  body.querySelectorAll('.seg-btn[data-kind]').forEach(b => b.addEventListener('click', () => { schedKind = b.dataset.kind; paint(root); }));
  body.querySelectorAll('.sched-time').forEach(inp => inp.addEventListener('change', () => updateItem(schedKind, inp.dataset.id, { time: inp.value })));
  body.querySelectorAll('.sched-toggle').forEach(btn => btn.addEventListener('click', async () => {
    const items2 = await getScheduleByKind(schedKind);
    const cur = items2.find(x => x.id === btn.dataset.id);
    await updateItem(schedKind, btn.dataset.id, { enabled: !cur.enabled });
    paint(root);
  }));
  body.querySelector('#sched-reset').addEventListener('click', async () => { await resetSchedule(schedKind); paint(root); });
}

function bar(label, val, target, unit) {
  const pct = Math.min(100, Math.round((val / target) * 100));
  const over = val >= target;
  return `
    <div class="macro">
      <div class="macro-top"><span>${label}</span><span><strong>${Math.round(val)}</strong> / ${target}${unit}</span></div>
      <div class="macro-bar"><span style="width:${pct}%" class="${over ? 'full' : ''}"></span></div>
    </div>`;
}

function coachLine(cal, protein) {
  if (cal === 0) return 'Nothing logged yet. Start the day with the smoothie. 🥤';
  const calLeft = TARGET.cal - cal, pLeft = TARGET.protein - protein;
  if (calLeft <= 0 && pLeft <= 0) return 'Target smashed. That’s a growth day. 💪';
  if (calLeft <= 0) return `Calories there. Just ${pLeft}g more protein to lock it in.`;
  if (calLeft < 900) return `Almost there: ~${calLeft} cal to go. About one meal left.`;
  return `${calLeft} cal and ${Math.max(0, pLeft)}g protein still to eat today.`;
}

function renderToday(body, log) {
  const { cal, protein } = dayTotals(log);

  body.innerHTML = `
    <div class="card card-hero">
      ${bar('Calories', cal, TARGET.cal, '')}
      ${bar('Protein', protein, TARGET.protein, 'g')}
      <p class="coach-last" style="margin-top:12px;">${coachLine(cal, protein)}</p>
    </div>

    <div class="section-label">Today’s plate · tap when eaten</div>
    ${MEALS.map(meal => {
      const eaten = !!log[meal.id];
      const m = mealMacros(meal, log);
      return `
        <div class="meal-card ${eaten ? 'eaten' : ''}">
          <button class="meal-main" data-meal="${meal.id}">
            <div class="meal-emoji">${meal.emoji}</div>
            <div class="meal-body">
              <div class="meal-slot">${meal.slot}</div>
              <div class="ex-name">${meal.name}</div>
              <div class="meal-desc">${meal.desc}</div>
              <div class="meal-macros">${m.cal} cal · ${m.protein}g protein</div>
            </div>
            <div class="meal-check">${eaten ? '✓' : ''}</div>
          </button>
          ${meal.dinner ? `
            <div class="size-seg" data-meal="dinner">
              ${Object.entries(DINNER_SIZES).map(([k, v]) =>
                `<button class="size-btn ${(log.dinner || 'med') === k ? 'active' : ''}" data-size="${k}">${v.label}</button>`).join('')}
            </div>` : ''}
        </div>`;
    }).join('')}
  `;

  const root = body.closest('.view');
  body.querySelectorAll('.meal-main').forEach(b => b.addEventListener('click', async () => {
    await toggleMeal(b.dataset.meal);
    paint(root);
  }));
  body.querySelectorAll('.size-btn').forEach(b => b.addEventListener('click', async (e) => {
    e.stopPropagation();
    await setDinnerSize(b.dataset.size);
    paint(root);
  }));
}

function renderMenu(body) {
  let cal = 0, protein = 0;
  MEALS.forEach(m => { const mm = mealMacros(m, {}); cal += mm.cal; protein += mm.protein; });
  body.innerHTML = `
    <div class="card card-hero">
      <div class="eyebrow">Daily total (medium dinner)</div>
      <div style="display:flex; gap:22px; align-items:baseline; margin-top:4px;">
        <div><div style="font-size:30px;font-weight:850;">~${cal}</div><div class="lead">calories</div></div>
        <div><div style="font-size:30px;font-weight:850;">~${protein}g</div><div class="lead">protein</div></div>
      </div>
      <p class="coach-last" style="margin-top:10px;">Same meals every day = no decisions, no willpower drain. Boring is what works.</p>
    </div>
    ${MEALS.map(m => `
      <div class="card">
        <div class="meal-slot">${m.slot}</div>
        <div class="ex-name">${m.emoji} ${m.name}</div>
        <div class="meal-desc">${m.desc}</div>
        <div class="meal-macros">${m.cal} cal · ${m.protein}g protein${m.dinner ? ' (medium)' : ''}</div>
      </div>`).join('')}
    <div class="card"><p class="lead"><strong>No blender yet?</strong> Make the smoothie as overnight oats: same ingredients in a tub in the fridge, no equipment.</p></div>
  `;
}

function renderShopping(body) {
  body.innerHTML = `
    <div class="card card-hero">
      <div class="eyebrow">Monthly shop</div>
      <div style="font-size:34px;font-weight:850;">~R${SHOPPING_TOTAL}</div>
      <p class="coach-last" style="margin-top:8px;">Food first, supplements second. This is everything you need to grow, nothing you don’t.</p>
    </div>
    ${SHOPPING.map(s => `
      <div class="card shop-card">
        <div class="shop-top"><strong>${s.item}</strong><span class="pill accent">R${s.cost}</span></div>
        <div class="meal-desc" style="margin-top:6px;">${s.why}</div>
      </div>`).join('')}
    <div class="card"><p class="lead"><strong>Skip the money-on-fire stuff:</strong> BCAAs, glutamine, test boosters, fat burners, mass gainers. Creatine + whey + real food is 90% of the value. 🔥</p></div>
  `;
}
