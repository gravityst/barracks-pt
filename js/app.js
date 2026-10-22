// Boot: theme, the four tabs, one event delegate for every [data-act], offline support.
import { root, showTab, refresh, nav, top, draw, TABS } from './nav.js';
import { A } from './ui.js';
import * as store from './store.js';
import { applyTheme, syncShell } from './views.js';
import { resumeSession } from './session.js';
import { dateKey } from './plan.js';

// Local development only: ?seed=<scene> loads demo data from tools/seed.js (see the README).
const seedScene = ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('seed');
if (seedScene) {
  await new Promise((ok) => { const sc = document.createElement('script'); sc.src = 'tools/seed.js'; sc.onload = sc.onerror = ok; document.head.appendChild(sc); });
  if (window.__bptSeed) { await window.__bptSeed(seedScene); store.reload(); }
  history.replaceState(null, '', location.pathname);
}

applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

for (const t of TABS) root(t, t);
syncShell();

let first = 'today';
try { const t = sessionStorage.getItem('bpt.tab'); if (TABS.includes(t) && store.settings().setup) first = t; } catch (e) {}
if (first !== 'today') showTab(first);

// One delegate for the whole app.
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t || t.disabled || !t.dataset.act) return;
  const fn = A[t.dataset.act];
  if (fn) fn(t.dataset, t, e);
});
document.addEventListener('change', (e) => {
  const t = e.target.closest('[data-change]');
  if (t && A[t.dataset.change]) A[t.dataset.change](t.value, t, e);
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.tagName === 'TEXTAREA' && t.dataset.change && A[t.dataset.change]) A[t.dataset.change](t.value, t, e);
  if (t.dataset.input && A[t.dataset.input]) A[t.dataset.input](t.value, t, e);   // live search
});
// A search field filters as you type, so the keyboard's Search key just puts the keyboard away.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.type === 'search') { e.preventDefault(); e.target.blur(); }
});
document.addEventListener('submit', (e) => {
  const f = e.target;
  if (f.dataset.submit && A[f.dataset.submit]) { e.preventDefault(); A[f.dataset.submit](f.dataset, f, e); }
});
A.tab = (d) => showTab(d.tab);

// A session that was running when the app closed comes straight back.
if (store.active()) resumeSession();

// New day while the app sat open, and the "in 40 min" line on Today.
let day = dateKey();
function heartbeat() {
  if (document.hidden) return;
  if (dateKey() !== day) { day = dateKey(); refresh(); return; }
  if (nav.tab === 'today' && nav.stacks.today.length === 1) draw(top('today'));
}
setInterval(heartbeat, 60000);
document.addEventListener('visibilitychange', heartbeat);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
