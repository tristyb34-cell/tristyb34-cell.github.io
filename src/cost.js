/* ============================================================
   DAX — Know the Cost
   The honest version of every slip. Once is a rounding error
   your body shrugs off; ten times is a pattern that rewrites
   it. Kills the guilt spiral (the thing that actually derails
   people) while being straight about what habits cost.
   For HIS body the misses (skipped meal, protein, sleep) bite
   harder than the slips — that's the whole lesson.
   ============================================================ */

// type: 'slip' = something you did · 'miss' = something you failed to do
export const COST = [
  { id: 'alcohol', icon: '🍺', name: 'Alcohol', type: 'slip',
    once: 'A recoverable tax, not a disaster. For ~24–48h it blunts muscle protein synthesis by ~25–35%, dips your testosterone, and wrecks your deep sleep even if you pass out fine. So recovery takes the hit, not your physique. A dent, not a reset. Move on.',
    habit: 'Now it bites. Each night re-blunts your gains, so ten nights stack into many days of muted muscle-building. Chronically lower testosterone, higher cortisol, compounding bad sleep, plus the knock-ons: drunk eating, skipped sessions. This is where real, visible progress quietly disappears. The pattern is the enemy, never the single pint.' },
  { id: 'sweets', icon: '🍬', name: 'Sweets', type: 'slip',
    once: 'A non-event for you. You\'re lean, bulking, with a fast metabolism, you have room for it. It\'s a blood-sugar spike and some calories, that\'s it. One treat cannot make you fat; fat gain needs a sustained surplus, not a single doughnut. It might even fuel a good workout. Genuinely fine.',
    habit: 'Different story. Repeated sugar makes you crave more sugar, and worse, it crowds out the protein-dense food you actually need. You hit your calories but miss your protein, calories without bricks, which is literally your main gap. Over time: blunted insulin sensitivity, more fat relative to muscle. Ten treats isn\'t ten times one treat; it\'s a pattern that reshapes your appetite.' },
  { id: 'junk', icon: '🍔', name: 'Junk / fast food', type: 'slip',
    once: 'Mostly just calories, and you\'ve got room. Fine, as long as it doesn\'t replace a protein meal. Hits your surplus, no harm done.',
    habit: 'Calories without bricks, your exact trap. You "eat a lot" but build little because there\'s no protein and your fast metabolism torches the rest. Plus it dulls your appetite for the real food that grows you. This is your specific failure mode.' },
  { id: 'meal', icon: '🍽️', name: 'Skipping a meal', type: 'miss',
    once: 'A few hundred calories and ~35g of protein gone for the day. A dent, not a catastrophe. Eat the next one and move on.',
    habit: 'This is the saboteur that kept you skinny. No surplus = no growth, full stop. You cannot out-train an empty plate. For your body, missing meals, not missing the gym, is your number one risk.' },
  { id: 'protein', icon: '🥩', name: 'Missing protein', type: 'miss',
    once: 'Negligible. The body has an amino-acid buffer for one short day. Just hit it tomorrow.',
    habit: 'Training hard while under-supplying the bricks. You recover worse and grow less than your effort earns. The silent gains-killer for a guy who eats enough calories but too little protein: you.' },
  { id: 'sleep', icon: '😴', name: 'Bad sleep', type: 'miss',
    once: 'A flatter session and lower energy. Catch up tonight, no drama. The body handles one rough night fine.',
    habit: 'Muscle is built in the dark. Chronic short sleep tanks testosterone and growth hormone, spikes cortisol, and kills recovery and appetite. Brutal as a habit, under-rated as a one-off. Ten bad nights erase a real chunk of the work.' },
  { id: 'workout', icon: '🏋️', name: 'Skipping a workout', type: 'miss',
    once: 'Genuinely fine, can even be recovery. You don\'t detrain in a day. Life happens; just don\'t let one become two.',
    habit: 'Consistency is the game. You don\'t lose muscle fast, you lose the rhythm that builds it, broken progressive overload, lost momentum. The slow drift that quietly ends most people\'s progress.' },
];

const LESSON = 'Your body is built to handle the occasional slip. It\'s the repeated one that rewrites it. Slip, shrug, get back on. Don\'t let one become ten. For you, what you skip matters more than what you sneak.';

export function openCost(triggerBtn, onDone, focusId = null) {
  const prevFocus = triggerBtn || document.activeElement;

  const o = document.createElement('div');
  o.id = 'cost';
  o.className = 'overlay-sheet';
  o.setAttribute('role', 'dialog');
  o.setAttribute('aria-modal', 'true');
  o.setAttribute('aria-labelledby', 'cost-title');
  o.innerHTML = `
    <div class="sheet-inner">
      <button class="back-btn" id="cost-close">‹ Close</button>
      <div class="eyebrow">No fear, just facts</div>
      <h1 class="screen-title" id="cost-title">Know the Cost</h1>
      <p class="lead">${LESSON}</p>
      <div class="cost-list">
        ${COST.map(c => `
          <div class="cost-item" data-id="${c.id}">
            <div class="cost-head">
              <span class="cost-ic" aria-hidden="true">${c.icon}</span>
              <span class="cost-name">${c.name}</span>
              <span class="cost-tag ${c.type}">${c.type === 'miss' ? 'a miss' : 'a slip'}</span>
            </div>
            <div class="seg cost-seg" role="group" aria-label="${c.name}: once or ten times">
              <button type="button" class="seg-btn active" data-mode="once" data-id="${c.id}" aria-pressed="true">Once</button>
              <button type="button" class="seg-btn" data-mode="habit" data-id="${c.id}" aria-pressed="false">Ten times</button>
            </div>
            <p class="cost-text" data-text="${c.id}" aria-live="polite" aria-atomic="true">${c.once}</p>
          </div>`).join('')}
      </div>
      <button class="btn" id="cost-done">Got it</button>
    </div>`;
  document.body.appendChild(o);
  requestAnimationFrame(() => o.classList.add('show'));

  function close() {
    document.removeEventListener('keydown', onKey);
    o.classList.remove('show');
    setTimeout(() => o.remove(), 250);
    if (prevFocus && prevFocus.focus) prevFocus.focus();
    if (onDone) onDone();
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);

  o.querySelectorAll('.cost-seg .seg-btn').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.id, mode = btn.dataset.mode;
    const item = COST.find(c => c.id === id);
    o.querySelectorAll(`.cost-seg .seg-btn[data-id="${id}"]`).forEach(b => {
      const on = b === btn;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    o.querySelector(`[data-text="${id}"]`).textContent = mode === 'habit' ? item.habit : item.once;
  }));
  o.querySelector('#cost-close').addEventListener('click', close);
  o.querySelector('#cost-done').addEventListener('click', close);

  // jump to a specific item (e.g. opened from the treats logger)
  if (focusId) {
    const el = o.querySelector(`.cost-item[data-id="${focusId}"]`);
    if (el) setTimeout(() => el.scrollIntoView({ block: 'center' }), 60);
  }
  o.querySelector('#cost-close').focus();
}
