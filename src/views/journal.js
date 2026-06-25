/* ============================================================
   DAX — Journal tab (check-in log)
   Type or dictate (iPhone keyboard mic) how training and the body
   feel. Smart prompts surface on Today; here you can always log.
   ============================================================ */
import { TAGS, QUAD_FEELS, getEntries, addEntry, deleteEntry, journalPrompt } from '../journal.js';
import { announce } from '../a11y.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (iso) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const dayLabel = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const snippet = (e) => {
  if (e.text) return e.text.split(/\s+/).slice(0, 6).join(' ') + (e.text.split(/\s+/).length > 6 ? '…' : '');
  if (e.quad) { const q = QUAD_FEELS.find(x => x.id === e.quad); return `quad ${q ? q.label.toLowerCase() : e.quad}`; }
  return e.tags && e.tags.length ? e.tags[0] : 'check-in';
};

// transient composer state (reset on every full paint)
let selTags = new Set();
let selQuad = null;

export function renderJournal() {
  return { html: '', onMount: (root) => paint(root) };
}

async function paint(root) {
  selTags = new Set();
  selQuad = null;

  const entries = (await getEntries()).slice().sort((a, b) => b.id - a.id);
  const prompt = await journalPrompt();

  root.innerHTML = `
    <div class="eyebrow">Talk to yourself, on purpose</div>
    <h1 class="screen-title">Journal</h1>

    ${prompt ? `<div class="card journal-promptcard"><p class="journal-prompt">${esc(prompt.text)}</p></div>` : ''}

    <div class="section-label">New check-in</div>
    <div class="card">
      <label for="j-text" class="j-label">How are you and the body doing?</label>
      <textarea id="j-text" class="inp j-text" rows="4" aria-describedby="j-hint"
        placeholder="Type, or tap the 🎤 on your keyboard to talk."></textarea>
      <p id="j-hint" class="j-hint">Tip: tap the microphone key on your iPhone keyboard to dictate instead of typing.</p>

      <div class="j-sub">Quad feel today</div>
      <div class="seg quad-row" role="radiogroup" aria-label="How the quad felt today">
        ${QUAD_FEELS.map((q, i) => `
          <button type="button" class="seg-btn quad-btn" role="radio" aria-checked="false"
            data-quad="${q.id}" tabindex="${i === 0 ? '0' : '-1'}">
            <span aria-hidden="true">${q.emoji}</span> ${q.label}
          </button>`).join('')}
      </div>

      <div class="j-sub">Tags</div>
      <div class="tag-row" role="group" aria-label="Tags">
        ${TAGS.map(t => `<button type="button" class="chip" data-tag="${t}" aria-pressed="false">${t}</button>`).join('')}
      </div>

      <button class="btn" id="j-save">Save check-in</button>
    </div>

    <h2 class="section-label">Past entries</h2>
    ${entries.length
      ? `<ul class="j-list" aria-label="Past entries, newest first">
          ${entries.map(e => entryHtml(e)).join('')}
        </ul>`
      : `<div class="card"><p class="lead">No entries yet. After a session, log how it went, your future self reading this back is the whole point.</p></div>`}
  `;

  wire(root);
}

function entryHtml(e) {
  const q = e.quad ? QUAD_FEELS.find(x => x.id === e.quad) : null;
  const chips = (e.tags || []).map(t => `<span class="chip-static">${esc(t)}</span>`).join('');
  return `
    <li class="card j-entry" id="j-entry-${e.id}" tabindex="-1">
      <div class="j-entry-top">
        <span class="j-date">${esc(fmt(e.ts))}</span>
        <button type="button" class="j-del" data-id="${e.id}"
          aria-label="Delete entry from ${esc(dayLabel(e.ts))}: ${esc(snippet(e))}">
          <span aria-hidden="true">🗑</span>
        </button>
      </div>
      ${q ? `<div class="j-quad q-${q.id}"><span aria-hidden="true">${q.emoji}</span> Quad: ${q.label}</div>` : ''}
      ${e.text ? `<p class="j-body">${esc(e.text)}</p>` : ''}
      ${chips ? `<div class="j-tags">${chips}</div>` : ''}
    </li>`;
}

function wire(root) {
  // focus the composer when arriving from the Today prompt
  if (sessionStorage.getItem('dax_focus_journal')) {
    sessionStorage.removeItem('dax_focus_journal');
    const ta = root.querySelector('#j-text');
    if (ta) ta.focus();
  }

  // quad-feel: single-select radiogroup (roving tabindex + arrow keys)
  const quadBtns = [...root.querySelectorAll('.quad-btn')];
  const selectQuad = (btn, focus = true) => {
    selQuad = selQuad === btn.dataset.quad ? null : btn.dataset.quad; // tap again to clear
    quadBtns.forEach(b => {
      const on = selQuad !== null && b === btn && b.dataset.quad === selQuad;
      b.setAttribute('aria-checked', String(on));
      b.classList.toggle('active', on);
      b.tabIndex = (on || (selQuad === null && b === quadBtns[0])) ? 0 : -1;
    });
    if (focus) btn.focus();
  };
  quadBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => selectQuad(btn));
    btn.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') { ev.preventDefault(); selectQuad(quadBtns[(i + 1) % quadBtns.length]); }
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') { ev.preventDefault(); selectQuad(quadBtns[(i - 1 + quadBtns.length) % quadBtns.length]); }
    });
  });

  // tags: multi-select toggles
  root.querySelectorAll('.chip[data-tag]').forEach(btn => btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('on', on);
    if (on) selTags.add(btn.dataset.tag); else selTags.delete(btn.dataset.tag);
  }));

  // save
  root.querySelector('#j-save').addEventListener('click', async () => {
    const text = root.querySelector('#j-text').value;
    if (!text.trim() && !selQuad) { announce('Nothing to save yet, write a line or pick how the quad felt.'); root.querySelector('#j-text').focus(); return; }
    const saved = await addEntry({ text, tags: [...selTags], quad: selQuad });
    await paint(root);
    announce('Check-in saved.');
    if (saved) {
      const card = root.querySelector(`#j-entry-${saved.id}`);
      if (card) requestAnimationFrame(() => card.focus());
    }
  });

  // delete (targeted DOM removal so an in-progress draft above is preserved)
  root.querySelectorAll('.j-del').forEach(btn => btn.addEventListener('click', async () => {
    const li = btn.closest('.j-entry');
    if (!confirm('Delete this check-in?')) return;
    const sibling = li.nextElementSibling || li.previousElementSibling; // focus target after removal
    await deleteEntry(Number(btn.dataset.id));
    const list = li.parentElement;
    li.remove();
    announce('Entry deleted.');
    if (sibling) {
      if (!sibling.hasAttribute('tabindex')) sibling.tabIndex = -1;
      requestAnimationFrame(() => sibling.focus());
    } else {
      await paint(root); // last entry gone → rebuild for the empty-state card
      const h2 = root.querySelector('h2.section-label');
      if (h2) { h2.tabIndex = -1; requestAnimationFrame(() => h2.focus()); }
    }
  }));
}
