// Tabs, each with its own stack of views (push / pop like a native navigation controller).
import { VIEWS } from './views.js';

export const TABS = ['today', 'plan', 'progress', 'more'];
export const nav = { tab: 'today', stacks: { today: [], plan: [], progress: [], more: [] } };
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function tabEl(tab) { return document.getElementById('tab-' + tab); }

function mount(tab, name, params) {
  const el = document.createElement('div');
  el.className = 'view';
  el.dataset.view = name;
  const v = { tab, name, params: params || {}, el };
  el.addEventListener('scroll', () => syncBar(v), { passive: true });
  draw(v);
  return v;
}

export function draw(v) {
  const def = VIEWS[v.name];
  const top = v.el.scrollTop;
  v.el.innerHTML = def.render(v.params, v);
  v.el.scrollTop = top;
  syncBar(v);
  def.mounted && def.mounted(v);
}

// The small title shows once the large title has scrolled under the bar.
function syncBar(v) {
  const bar = v.el.querySelector('.navbar');
  const mark = v.el.querySelector('[data-titlemark]');
  if (!bar) return;
  const limit = mark ? mark.offsetTop + mark.offsetHeight - bar.offsetHeight : 4;
  bar.classList.toggle('scrolled', v.el.scrollTop > Math.max(4, limit));
}

export function root(tab, name, params) {
  const host = tabEl(tab);
  host.innerHTML = '';
  const v = mount(tab, name, params);
  nav.stacks[tab] = [v];
  host.appendChild(v.el);
  return v;
}

export function top(tab = nav.tab) { const s = nav.stacks[tab]; return s[s.length - 1]; }

export function push(name, params) {
  const tab = nav.tab, stack = nav.stacks[tab], host = tabEl(tab);
  const prev = stack[stack.length - 1];
  const v = mount(tab, name, params);
  stack.push(v);
  host.appendChild(v.el);
  prev.el.setAttribute('inert', '');
  prev.el.setAttribute('aria-hidden', 'true');
  if (!reduce()) {
    v.el.style.transform = 'translateX(100%)';
    v.el.classList.add('pushing'); prev.el.classList.add('under');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      v.el.style.transform = '';
      prev.el.style.transform = 'translateX(-28%)';
    }));
    setTimeout(() => { v.el.classList.remove('pushing'); prev.el.classList.remove('under'); prev.el.style.visibility = 'hidden'; }, 360);
  } else prev.el.style.visibility = 'hidden';
  focusTitle(v);
}

export function pop() {
  const tab = nav.tab, stack = nav.stacks[tab];
  if (stack.length < 2) return;
  const v = stack.pop(), prev = stack[stack.length - 1];
  prev.el.style.visibility = '';
  prev.el.removeAttribute('inert'); prev.el.removeAttribute('aria-hidden');
  draw(prev);
  if (!reduce()) {
    v.el.classList.add('pushing'); prev.el.classList.add('under');
    requestAnimationFrame(() => { v.el.style.transform = 'translateX(100%)'; prev.el.style.transform = ''; });
    setTimeout(() => { v.el.remove(); prev.el.classList.remove('under'); }, 360);
  } else { v.el.remove(); prev.el.style.transform = ''; }
  focusTitle(prev);
}

function popToRoot(tab) {
  const stack = nav.stacks[tab];
  while (stack.length > 1) stack.pop().el.remove();
  const r = stack[0];
  r.el.style.transform = ''; r.el.style.visibility = '';
  r.el.removeAttribute('inert'); r.el.removeAttribute('aria-hidden');
  draw(r);
}

export function showTab(tab) {
  if (tab === nav.tab) {
    // Tapping the current tab goes back to its first screen, then to the top.
    if (nav.stacks[tab].length > 1) popToRoot(tab);
    else top(tab).el.scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' });
    return;
  }
  nav.tab = tab;
  for (const t of TABS) tabEl(t).hidden = t !== tab;
  document.querySelectorAll('.tabbtn').forEach((b) => {
    if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  draw(top(tab));
  try { sessionStorage.setItem('bpt.tab', tab); } catch (e) {}
}

// Re-render every mounted view (after data changes).
export function refresh() {
  for (const t of TABS) for (const v of nav.stacks[t]) draw(v);
}

function focusTitle(v) {
  const h = v.el.querySelector('h1');
  if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}
