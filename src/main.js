/* ============================================================
   DAX — app shell, router & navigation (Phase 0)
   ============================================================ */
import { renderToday } from './views/today.js';
import { renderHistory } from './views/history.js';
import { renderDiet } from './views/diet.js';
import { renderProgress } from './views/progress.js';

const TABS = [
  { id: 'today',    label: 'Today',    icon: '⚡', tint: true,  render: renderToday },
  { id: 'history',  label: 'History',  icon: '📊', tint: false, render: renderHistory },
  { id: 'diet',     label: 'Fuel',     icon: '🍽️', tint: false, render: renderDiet },
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

async function init() {
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
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

init();
