/* ============================================================
   DAX — in-app theme switcher
   Three hand-tuned, WCAG-verified skins. applyTheme() sets
   data-theme on <html>; styles.css does the rest via token
   overrides. Picker is an accessible radiogroup dialog
   (pattern cloned from knowledge.js openArticle).
   ============================================================ */
import { db } from './store.js';
import { announce } from './a11y.js';

export const THEMES = [
  { id: 'indigo', name: 'Indigo Night', desc: 'Cool periwinkle on deep blue-black', bg: '#0A0B14', accent: '#7C8CFF' },
  { id: 'molten', name: 'Molten', desc: 'Hot orange on charcoal', bg: '#0C0D11', accent: '#FF5A2C' },
  { id: 'light', name: 'Light Green', desc: 'Fresh green on soft white', bg: '#F3F8F4', accent: '#2E7D46' },
];
const DEFAULT_THEME = 'indigo';

export async function getTheme() { return (await db.get('theme', DEFAULT_THEME)) || DEFAULT_THEME; }
export function applyTheme(id) { document.documentElement.setAttribute('data-theme', id || DEFAULT_THEME); }
export async function setTheme(id) { await db.set('theme', id); applyTheme(id); }
export async function bootTheme() { applyTheme(await getTheme()); }

export async function openThemePicker(triggerEl) {
  const current = await getTheme();
  const returnFocus = triggerEl || document.activeElement;
  const bg = [document.querySelector('.app-header'), document.getElementById('view'), document.getElementById('tabbar')].filter(Boolean);

  const overlay = document.createElement('div');
  overlay.id = 'theme-picker';
  overlay.className = 'reader-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'theme-title');
  overlay.innerHTML = `
    <div class="reader-card">
      <div class="reader-head">
        <button class="reader-close" id="theme-close" aria-label="Close theme picker">‹ Back</button>
        <span class="reader-cat"><span aria-hidden="true">🎨</span> Theme</span>
      </div>
      <div class="reader-body">
        <h2 id="theme-title" class="reader-title" tabindex="-1">Pick a theme</h2>
        <p class="reader-p">Re-skins the whole app instantly. Pick what feels right.</p>
        <div class="theme-radiogroup" role="radiogroup" aria-labelledby="theme-title">
          ${THEMES.map(t => `
            <button type="button" class="theme-opt${t.id === current ? ' on' : ''}" role="radio" data-id="${t.id}"
              aria-checked="${t.id === current ? 'true' : 'false'}" tabindex="${t.id === current ? '0' : '-1'}">
              <span class="theme-swatch" aria-hidden="true" style="background:${t.bg};"><span style="background:${t.accent};"></span></span>
              <span class="theme-opt-meta">
                <span class="theme-opt-name">${t.name}</span>
                <span class="theme-opt-desc">${t.desc}</span>
              </span>
              <span class="theme-opt-check" aria-hidden="true">✓</span>
            </button>`).join('')}
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  bg.forEach(el => { el.inert = true; });          // trap focus, but NOT #sr-status
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => overlay.classList.add('show'));

  const radios = Array.from(overlay.querySelectorAll('.theme-opt'));

  const close = () => {
    overlay.classList.remove('show');
    document.removeEventListener('keydown', onKey);
    bg.forEach(el => { el.inert = false; });
    document.body.style.overflow = '';
    setTimeout(() => overlay.remove(), 220);
    if (returnFocus && returnFocus.isConnected && returnFocus.focus) returnFocus.focus();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  overlay.querySelector('#theme-close').addEventListener('click', close);

  // select = check + apply live + announce (single handler, per a11y review)
  const select = async (btn) => {
    radios.forEach(r => {
      const on = r === btn;
      r.setAttribute('aria-checked', on ? 'true' : 'false');
      r.tabIndex = on ? 0 : -1;
      r.classList.toggle('on', on);
    });
    await setTheme(btn.dataset.id);
    const t = THEMES.find(x => x.id === btn.dataset.id);
    announce(`Theme changed to ${t ? t.name : btn.dataset.id}.`);
    btn.focus();
  };

  radios.forEach((btn, i) => {
    btn.addEventListener('click', () => select(btn));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); select(radios[(i + 1) % radios.length]); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); select(radios[(i - 1 + radios.length) % radios.length]); }
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); select(btn); }
    });
  });

  // initial focus lands on the active option (a selection surface), fallback to title
  const activeOpt = radios.find(r => r.dataset.id === current) || radios[0];
  (activeOpt || overlay.querySelector('#theme-title')).focus();
}
