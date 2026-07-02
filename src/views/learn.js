/* ============================================================
   DAX — Learn tab
   Browse the knowledge library by category, filter by learned
   state, tap a lesson to read it. Marks live in db 'learned'.
   ============================================================ */
import { CATEGORIES, articlesByCat, allArticles, getLearned, openArticle } from '../knowledge.js';
import { announce } from '../a11y.js';

let filter = 'all'; // 'all' | 'todo' | 'learned'

export function renderLearn() {
  return { html: '', onMount: (root) => paintLearn(root) };
}

async function paintLearn(root, opts = {}) {
  const learned = await getLearned();
  const total = allArticles().length;
  const doneN = learned.size;
  const match = (a) => filter === 'all' ? true : filter === 'learned' ? learned.has(a.id) : !learned.has(a.id);
  const visible = allArticles().filter(match).length;

  const sections = CATEGORIES.map(cat => {
    const items = articlesByCat(cat.id).filter(match);
    if (!items.length) return '';
    return `
      <section class="learn-cat" aria-labelledby="cat-${cat.id}">
        <h2 class="learn-cat-h" id="cat-${cat.id}"><span aria-hidden="true">${cat.icon}</span> ${cat.label}</h2>
        <ul class="learn-list">
          ${items.map(a => {
            const done = learned.has(a.id);
            return `<li>
              <button class="learn-row ${done ? 'done' : ''}" data-id="${a.id}">
                <span class="learn-ic" aria-hidden="true">${a.icon || '📘'}</span>
                <span class="learn-meta">
                  <span class="learn-title">${a.title}</span>
                  <span class="learn-teaser">${a.teaser}</span>
                </span>
                ${done ? '<span class="sr-only">Learned</span>' : ''}
                <span class="learn-check" aria-hidden="true">${done ? '✓' : '›'}</span>
              </button>
            </li>`;
          }).join('')}
        </ul>
      </section>`;
  }).join('');

  const empty = !sections.trim();

  root.innerHTML = `
    <div class="eyebrow">Your training brain</div>
    <h1 class="screen-title">Learn</h1>
    <p class="lead" style="margin-bottom:14px;">Short lessons on how your body actually works. Read one when you're curious, tap “Got it” when it clicks.</p>

    <div class="learn-progress">
      <div class="progress-bar" aria-hidden="true"><span style="width:${total ? Math.round((doneN / total) * 100) : 0}%"></span></div>
      <div class="progress-meta">${doneN} of ${total} lessons learned</div>
    </div>

    <div class="learn-filter" role="group" aria-label="Filter lessons">
      ${[['all', 'All'], ['todo', 'To learn'], ['learned', `Learned (${doneN})`]].map(([v, l]) =>
        `<button class="pill ${filter === v ? 'accent' : ''}" data-filter="${v}" aria-pressed="${filter === v ? 'true' : 'false'}">${l}</button>`).join('')}
    </div>

    ${empty
      ? `<div class="card"><p class="lead">${filter === 'learned' ? 'Nothing on your Learned shelf yet. Read a lesson and tap “Got it”.' : 'All caught up — nothing left to learn here. 💪'}</p></div>`
      : sections}
  `;

  root.querySelectorAll('[data-filter]').forEach(b =>
    b.addEventListener('click', () => { filter = b.dataset.filter; paintLearn(root, { fromFilter: true }); }));

  root.querySelectorAll('.learn-row').forEach(btn =>
    btn.addEventListener('click', () => openArticle(btn.dataset.id, () => paintLearn(root))));

  // after a filter re-render: keep focus on the pressed pill and tell SR users the result
  if (opts.fromFilter) {
    const active = root.querySelector(`[data-filter="${filter}"]`);
    if (active) active.focus();
    announce(`Showing ${visible} ${visible === 1 ? 'lesson' : 'lessons'}`);
  }
}
