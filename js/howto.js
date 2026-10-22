// Demos and how-tos on screen: the animated figure slot, the move sheet (demo, the four-part how-to,
// what each level changes), the drill picker on warm-up, conditioning and stretch screens, and the
// handlers that open a sheet from Today, a day preview, a workout or the Moves library.
//
// A demo reference (`ref`) is one string: 'slug' (a drill, or a strength move at Recruit), 'slug:1'
// (a level of that move), 'slug:quarter' (a variant), or '@A1:1' (plan move A1 as level 1 does it).
import { CATALOG, LEVELS, SESSIONS, DECK, TEST } from './data.js';
import { moveInfo, demoOf, levelNotes, LIBRARY, PLAN_MOVES } from './moves.js';
import { mountDemo } from './rig.js';
import * as store from './store.js';
import { esc, openSheet, on } from './ui.js';

export function refInfo(ref) {
  if (!ref) return null;
  if (ref[0] === '@') { const [id, L] = ref.slice(1).split(':'); return moveInfo(id, +L || 0); }
  const [slug, k] = ref.split(':');
  return demoOf(slug, k === undefined ? undefined : /^\d$/.test(k) ? +k : k);
}

/** Placeholder for a demo; mountDemos() brings every one to life once it's in the document. */
export function refSlot(ref, cls = '') {
  return refInfo(ref) ? `<figure class="demo${cls ? ' ' + cls : ''}" data-ref="${esc(ref)}"></figure>` : '';
}
export const demoSlot = (planId, level, cls = '') => refSlot(`@${planId}:${level}`, cls);

export function mountDemos(root) {
  root.querySelectorAll('figure.demo[data-ref]').forEach((el) => {
    if (el.dataset.on === el.dataset.ref) return;
    const info = refInfo(el.dataset.ref);
    if (!info) return;
    el.dataset.on = el.dataset.ref;
    mountDemo(el, info.demo, { seq: info.seq, strip: info.strip, key: info.key, label: info.move.alt });
  });
}

/** The one-line "Do it" for a move, or the plan's own line for moves not in the library. */
export function doLine(planId, level, fallback) {
  const info = moveInfo(planId, level);
  return info ? info.move.how.do : fallback;
}

/**
 * A list of drills with one demo above it. Items with a demo are buttons: tap one to watch it; the
 * link under the figure opens its full how-to. `refs` lines up with `items` (null: no demo).
 */
export function drillPicker(list, items, refs, picked = 0) {
  const i = refs[picked] ? picked : refs.findIndex(Boolean);
  if (i < 0) return `<ul class="bulleted" style="margin-top:0">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const info = refInfo(refs[i]);
  const rows = items.map((t, k) => (refs[k]
    ? `<li><button type="button" class="dr${k === i ? ' on' : ''}" data-act="pick-drill" data-list="${list}" data-i="${k}" aria-pressed="${k === i}"><span>${esc(t)}</span></button></li>`
    : `<li class="plain"><span>${esc(t)}</span></li>`)).join('');
  return `<div class="drills">
    ${refSlot(refs[i])}
    <p class="drill-how"><button type="button" class="linkbtn" data-act="lib-sheet" data-ref="${esc(refs[i])}">${esc(info.name)}: how to do it</button></p>
    <ol class="drill-list" aria-label="Tap one to see it">${rows}</ol></div>`;
}

// ---------- where each library move is used ----------
const NAMES = { A: 'Alpha', B: 'Bravo', C: 'Charlie' };
export function usedIn(slug) {
  const m = LIBRARY[slug];
  if (!m) return [];
  if (!m.levels) return m.used || [];
  const ids = Object.entries(PLAN_MOVES).filter(([, r]) => (Array.isArray(r) ? r : [r]).some((x) => x.split(':')[0] === slug)).map(([id]) => id);
  const out = [];
  for (const k of ['A', 'B', 'C']) {
    const s = SESSIONS[k];
    const where = [['balanced', 'Balanced'], ['arms', 'Arms & shoulders']].filter(([f]) => {
      const p = s[f];
      return [...p.pairs.flat(), p.core, p.gap, ...Object.values(p.alt || {}).map((a) => a.id)].some((id) => ids.includes(id));
    });
    if (where.length) out.push(where.length === 2 ? NAMES[k] : `${NAMES[k]} (${where[0][1]})`);
  }
  if (DECK.suits.some((su) => su.demo === slug)) out.push('Foxtrot: spades');
  if ((DECK.joker || '').split(':')[0] === slug) out.push('Foxtrot: jokers');
  if (TEST.events.some((ev) => (ev.demo || '').split(':')[0] === slug)) out.push('PT test');
  return out;
}

// ---------- the move sheet ----------
const planMove = (id) => CATALOG[id] || null;
const closeBtn = '<div class="stack"><button type="button" class="btn quiet wide" data-act="sheet" data-v="">Close</button></div>';

function sheetHTML({ title, info, names, what, L, ref, used, levelPicker }) {
  const m = info.move;
  const rows = names ? LEVELS.map((lv, i) => `<tr class="${i === L ? 'mine' : ''}"><td>${esc(lv.name)}</td><td>${esc(names[i])}${what && what[i] ? `<span class="lvl-what">${esc(what[i])}</span>` : ''}</td></tr>`).join('') : '';
  const parts = [['Set up', m.how.setup], ['Do it', m.how.do], ['You should feel it in', m.how.feel], ['Don’t', m.how.dont]];
  const step = (i, word) => (i >= 0 && i < 3 && what && what[i] ? `<p><b>${word}</b> ${esc(LEVELS[i].name)}: ${esc(what[i].charAt(0).toLowerCase() + what[i].slice(1))}</p>` : '');
  const picker = levelPicker ? `<fieldset class="seg lvlpick"><legend class="vh">Show the level</legend>${LEVELS.map((lv, i) => `<label><input type="radio" name="lib-level" value="${i}" ${i === L ? 'checked' : ''} data-change="lib-level" data-ref="${esc(levelPicker)}">${esc(lv.name)}</label>`).join('')}</fieldset>` : '';
  return `<h2 id="sheet-title">${esc(title)}</h2>
    <p class="sub">${esc(m.aka)}</p>
    ${picker}
    ${refSlot(ref, 'big')}
    ${names ? `<button type="button" class="lvlline" data-act="mv-levels" aria-expanded="false" aria-controls="mv-levels">
      <span><b>${esc(LEVELS[L].name)}</b> ${esc(what && what[L] ? what[L] : names[L])}</span><span class="more">What changes by level</span></button>
    <div id="mv-levels" class="mv-levels" hidden><table class="lvltable">${rows}</table></div>` : ''}
    <dl class="howto">${parts.map(([t, d]) => `<div><dt>${t}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl>
    ${names ? `<div class="easyhard">${step(L - 1, 'Easier')}${step(L + 1, 'Harder')}</div>` : ''}
    ${used && used.length ? `<p class="used"><b>In the plan</b> ${esc(used.join(' · '))}</p>` : ''}
    ${closeBtn}`;
}

/** Open the move sheet for a plan move. `name` is the variation as the plan names it. */
export async function openMoveSheet({ id, level, name, how }) {
  const info = moveInfo(id, level);
  const pm = planMove(id);
  const html = info
    ? sheetHTML({ title: name || pm.n[info.level], info, names: pm.n, what: levelNotes(id), L: info.level, ref: `@${id}:${info.level}` })
    : `<h2 id="sheet-title">${esc(name)}</h2><p class="howto-plain">${esc(how || (pm ? pm.h : ''))}</p>${closeBtn}`;
  await openSheet(html, { onOpen: (d) => mountDemos(d) });
}

/** Open the sheet for a library entry (the Moves page, warm-ups, stretches). A strength move opens
 *  at your level (or the one in the ref) and can switch to the others. */
export async function openLibSheet(ref) {
  const [slug, k] = ref.split(':');
  const m = LIBRARY[slug];
  if (!m) return;
  const L = m.levels ? (k !== undefined && /^\d$/.test(k) ? +k : store.settings().level) : 0;
  await openSheet(libHTML(slug, L), { onOpen: (d) => mountDemos(d) });
}
function libHTML(slug, L) {
  const m = LIBRARY[slug];
  const info = demoOf(slug, L);
  return sheetHTML({
    title: m.levels ? info.name : m.name, info, names: m.levels ? m.names : null, what: m.levels, L,
    ref: `${slug}:${L}`, used: usedIn(slug), levelPicker: m.levels ? slug : null,
  });
}

on('mv-levels', (d, el) => {
  const box = document.getElementById('mv-levels');
  if (!box) return;
  box.hidden = !box.hidden;
  el.setAttribute('aria-expanded', String(!box.hidden));
});
on('lib-sheet', (d) => {
  if (d.ref[0] !== '@') return openLibSheet(d.ref);
  const [id, L] = d.ref.slice(1).split(':');
  return openMoveSheet({ id, level: +L });
});
// Switching the level inside a library sheet redraws it in place and keeps focus on the control.
on('lib-level', (v, el) => {
  const box = document.querySelector('#sheet .sheet-in');
  if (!box) return;
  box.innerHTML = libHTML(el.dataset.ref, +v);
  mountDemos(box);
  box.querySelector(`input[name="lib-level"][value="${+v}"]`)?.focus();
});
