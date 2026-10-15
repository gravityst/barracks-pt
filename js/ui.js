// Small shared pieces: escaping, icons, formatting, the action registry, sheets and the toast.
import { parseKey } from './plan.js';

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const attr = esc;

// ---- icons (drawn on a 24 grid, square caps) ----
const P = (d, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${d}</svg>`;
export const icon = {
  back: P('<path d="M15 4.5 7.5 12l7.5 7.5"/>'),
  close: P('<path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/>'),
  plus: P('<path d="M12 4.5v15M4.5 12h15"/>'),
  minus: P('<path d="M4.5 12h15"/>'),
  arrow: P('<path d="M4 12h15M13 6l6 6-6 6"/>'),
  play: P('<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>'),
  pause: P('<path d="M7.5 5v14M16.5 5v14" stroke-width="3"/>'),
  list: P('<path d="M4 6.5h16M4 12h16M4 17.5h16"/>'),
};
export const chev = '<svg class="chev" viewBox="0 0 9 15" aria-hidden="true"><path d="M1.5 1.5 7.5 7.5l-6 6"/></svg>';
export const tick = '<svg class="tick" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9.5l4 4 8-9"/></svg>';

// Playing-card suits, drawn rather than borrowed from an emoji font.
export const SUIT_PATH = {
  S: 'M12 2C9 6.2 3.5 9.4 3.5 13.6c0 2.6 2 4.4 4.3 4.4 1.4 0 2.6-.6 3.3-1.6-.3 2-1.1 3.6-2.6 5h7c-1.5-1.4-2.3-3-2.6-5 .7 1 1.9 1.6 3.3 1.6 2.3 0 4.3-1.8 4.3-4.4C20.5 9.4 15 6.2 12 2z',
  H: 'M12 21.5C8 17.8 2.5 13.6 2.5 8.6 2.5 5.6 4.8 3.2 7.6 3.2c1.9 0 3.5 1 4.4 2.6.9-1.6 2.5-2.6 4.4-2.6 2.8 0 5.1 2.4 5.1 5.4 0 5-5.5 9.2-9.5 12.9z',
  D: 'M12 1.8 20 12l-8 10.2L4 12z',
  C: 'M12 2.2a4.6 4.6 0 0 0-3.9 7 4.6 4.6 0 1 0 2.4 6.9c-.3 2.2-1.2 4-2.7 5.4h8.4c-1.5-1.4-2.4-3.2-2.7-5.4a4.6 4.6 0 1 0 2.4-6.9 4.6 4.6 0 0 0-3.9-7z',
};
export const suitSvg = (id, cls = 'suit') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${SUIT_PATH[id]}"/></svg>`;

// ---- formatting ----
const loc = () => (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
export function longDate(k) { return parseKey(k).toLocaleDateString(loc(), { weekday: 'long', month: 'long', day: 'numeric' }); }
export function shortDate(k) { return parseKey(k).toLocaleDateString(loc(), { weekday: 'short', month: 'short', day: 'numeric' }); }
export function dayMonth(k) { return parseKey(k).toLocaleDateString(loc(), { month: 'short', day: 'numeric' }); }
export function timeLabel(hhmm) {
  const [h, m] = String(hhmm || '11:20').split(':').map(Number);
  const d = new Date(2000, 0, 1, h || 0, m || 0);
  return d.toLocaleTimeString(loc(), { hour: 'numeric', minute: '2-digit' });
}
export const pad2 = (n) => String(n).padStart(2, '0');

export function weightText(lb, units) {
  if (lb == null) return '–';
  return units === 'kg' ? `${(lb * 0.45359237).toFixed(1)} kg` : `${(+lb).toFixed(1)} lb`;
}
// The dumbbells are what they are; kg mode just translates the label.
export function kitText(w, units) {
  if (!w) return '';
  const name = w >= 15 ? 'Heavy pair' : 'Light pair';
  return units === 'kg' ? `${name} (${(w * 0.45359237).toFixed(1)} kg)` : `${name} (${w} lb)`;
}

// ---- actions: data-act on any element, handled in one place ----
export const A = Object.create(null);
export function on(name, fn) { A[name] = fn; }

// ---- toast ----
let toastTimer = 0;
export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ---- sheets (native <dialog>, so focus is trapped and Escape closes) ----
let sheetResolve = null;
export function openSheet(html, { onOpen } = {}) {
  const d = document.getElementById('sheet');
  if (d.open) closeSheet(null);
  d.innerHTML = `<div class="sheet-in">${html}</div>`;
  return new Promise((res) => {
    sheetResolve = res;
    try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
    onOpen && onOpen(d);
    // showModal() focuses the first button, which paints a focus ring on a touch screen. Start on
    // the title instead (screen readers read it first); text fields still get the keyboard.
    const field = d.querySelector('input:is([type=text],[type=number],[type=date],[type=time],:not([type])), textarea');
    const title = d.querySelector('h2');
    if (field) setTimeout(() => field.focus(), 60);
    else if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); }
  });
}
export function closeSheet(value) {
  const d = document.getElementById('sheet');
  const r = sheetResolve; sheetResolve = null;
  if (d.open) { try { d.close(); } catch (e) { d.removeAttribute('open'); } }
  r && r(value);
}
if (typeof document !== 'undefined') {
  const d = document.getElementById('sheet');
  d.addEventListener('close', () => { const r = sheetResolve; sheetResolve = null; r && r(null); });
  d.addEventListener('click', (e) => { if (e.target === d) closeSheet(null); }); // tap the scrim
}

// A yes/no sheet. Resolves true / false.
export async function confirmSheet({ title, body = '', yes = 'OK', no = 'Cancel', danger = false }) {
  const v = await openSheet(`
    <h2 id="sheet-title">${esc(title)}</h2>
    ${body ? `<p class="sub">${body}</p>` : ''}
    <div class="stack">
      <button type="button" class="btn wide ${danger ? 'solid-danger' : 'primary'}" data-act="sheet" data-v="yes">${esc(yes)}</button>
      <button type="button" class="btn wide quiet" data-act="sheet" data-v="no">${esc(no)}</button>
    </div>`);
  return v === 'yes';
}
on('sheet', (d) => closeSheet(d.v));
