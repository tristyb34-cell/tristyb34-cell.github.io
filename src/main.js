/* ============================================================
   DAX — app shell, router & navigation (Phase 0)
   ============================================================ */
import { APP_VERSION } from './data.js';
import { renderToday } from './views/today.js';
import { renderPlan } from './views/plan.js';
import { renderHistory } from './views/history.js';
import { renderDiet } from './views/diet.js';
import { renderProgress } from './views/progress.js';
import { renderJournal } from './views/journal.js';

const TABS = [
  { id: 'today',    label: 'Today',    icon: '⚡', tint: true,  render: renderToday },
  { id: 'plan',     label: 'Plan',     icon: '📋', tint: false, render: renderPlan },
  { id: 'history',  label: 'History',  icon: '📊', tint: false, render: renderHistory },
  { id: 'diet',     label: 'Fuel',     icon: '🍽️', tint: false, render: renderDiet },
  { id: 'journal',  label: 'Journal',  icon: '📓', tint: false, render: renderJournal },
  { id: 'progress', label: 'Progress', icon: '📸', tint: false, render: renderProgress },
];

const viewEl = document.getElementById('view');
const tabbarEl = document.getElementById('tabbar');

function buildTabbar(activeId) {
  tabbarEl.innerHTML = TABS.map(t => `
    <button class="tab ${t.id === activeId ? 'active' : ''}" data-tab="${t.id}">
      <span class="ic ${t.tint ? 'tint' : ''}">${t.icon}</span>
      <span>${t.label}</span>
    </button>
  `).join('');
  tabbarEl.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => go(btn.dataset.tab));
  });
}

async function go(tabId) {
  const tab = TABS.find(t => t.id === tabId) || TABS[0];
  buildTabbar(tab.id);
  const result = await tab.render();
  viewEl.innerHTML = typeof result === 'string' ? result : result.html;
  viewEl.scrollTop = 0;
  window.scrollTo(0, 0);
  if (result && result.onMount) result.onMount(viewEl);
  history.replaceState({ tab: tab.id }, '', `#${tab.id}`);
}

// let any view request a tab switch without a brittle DOM selector or import cycle
window.addEventListener('dax:navigate', (e) => { if (e.detail) go(e.detail); });

async function init() {
  const vEl = document.getElementById('app-version');
  if (vEl) vEl.textContent = APP_VERSION;

  const startTab = (location.hash || '').replace('#', '') || 'today';
  await go(startTab);

  // first run: capture stats so targets are personalised
  const { isOnboarded } = await import('./profile.js');
  if (!(await isOnboarded())) {
    const { openOnboarding } = await import('./onboarding.js');
    openOnboarding(viewEl, false, () => go('today'));
  }

  // register service worker for offline / installability
  if ('serviceWorker' in navigator) {
    // updateViaCache:'none' → always hit the network for a fresh sw.js so updates are detected immediately
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then(reg => { reg.update(); })
      .catch(() => {});
    // when a new SW takes control (after skipWaiting + clients.claim), reload once so fresh code loads itself
    if (navigator.serviceWorker.controller) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }
  }
}

init();
