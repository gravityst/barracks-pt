// Workout mode: the full-screen guided sessions. Strength (three supersets: 1a, 1b, rest, repeat), Echo (EMOM clock),
// Foxtrot (deck of cards), Mobility (walk + timed stretches), Walk, and the PT test.
// The running session is saved after every step, so a closed or killed app picks up where it was.
import { WARMUP, COOLDOWN, ENGINE, DECK, MOBILITY, WALK, TEST, LEVELS, GRIP_TIP, REST_NOTE } from './data.js';
import { dateKey, clock, minutesLabel, shuffleDeck, repsForCard, readyToLevelUp, levelName, entryForSlot } from './plan.js';
import * as store from './store.js';
import { esc, icon, tick, suitSvg, kitText, longDate, on, toast, openSheet, closeSheet, confirmSheet, pad2 } from './ui.js';
import { beep, unlockAudio, keepAwake, tap } from './feedback.js';
import { refresh } from './nav.js';
import { demoSlot, mountDemos, doLine, openMoveSheet, refSlot, drillPicker } from './howto.js';

const host = () => document.getElementById('session');
let A = null;          // the running session (same object that's persisted)
let timer = 0;
let lastLive = {};     // last values written to live nodes, so ticks only touch what changed
const LEAD = 5;        // seconds of "get ready" before timed blocks

// ---- timers that survive the phone sleeping: all maths from timestamps ----
const T = {
  down: (total) => ({ total, startedAt: Date.now(), pausedAt: null, pausedMs: 0 }),
  up: () => ({ total: 0, startedAt: Date.now(), pausedAt: null, pausedMs: 0 }),
  el: (t) => Math.max(0, ((t.pausedAt ?? Date.now()) - t.startedAt - t.pausedMs) / 1000),
  left: (t) => t.total - T.el(t),
  pause: (t) => { if (!t.pausedAt) t.pausedAt = Date.now(); },
  resume: (t) => { if (t.pausedAt) { t.pausedMs += Date.now() - t.pausedAt; t.pausedAt = null; } },
};
// A cue that fires long after its moment (phone was asleep) stays quiet.
const fresh = (t, at) => !document.hidden && T.el(t) - at < 2.5;

function save() { store.setActive(A); }

// ================= start / resume / close =================
export async function startSession(plan, slot) {
  const cur = store.active();
  if (cur) {
    const ok = await confirmSheet({ title: `${cur.name} is still running`, body: `Discard it and start ${esc(plan.kind === 'test' ? 'the PT test' : plan.name)} instead?`, yes: 'Discard and start', no: `Back to ${cur.name}`, danger: true });
    if (!ok) { resumeSession(); return; }
  }
  unlockAudio(); tap();
  const s = store.settings();
  A = {
    id: store.uid(), kind: plan.kind, slot: plan.kind === 'test' ? null : slot, date: dateKey(),
    week: plan.week ?? null, day: plan.day ?? null, key: plan.key ?? 'test',
    name: plan.kind === 'test' ? 'PT test' : plan.name, title: plan.kind === 'test' ? (plan.slot === 'w1' ? 'Week 1' : 'Week 8') : plan.title,
    level: s.level, startedAt: Date.now(), step: 0,
  };
  if (plan.kind === 'strength') {
    A.v = 2; A.blocks = plan.blocks; A.gap = plan.gap || null; A.moves = plan.moves;
    A.rir = plan.phase.rir; A.phase = plan.phase.name; A.minutes = plan.minutes;
    A.steps = ['warm', ...plan.blocks.map((_, i) => 'b' + i), 'cool', 'sum'];
    A.logs = {}; A.draft = {}; A.focus = null; A.editing = null; A.rest = null; A.hold = null; A.warm = T.down(WARMUP.minutes * 60);
  } else if (plan.kind === 'engine') {
    A.cfg = plan.engine; A.steps = ['warm', 'emom', 'fin', 'sum']; A.emom = null; A.fin = null; A.result = null;
  } else if (plan.kind === 'deck') {
    A.cfg = plan.deck; A.steps = ['warm', 'deck', 'sum'];
    A.deck = { cards: shuffleDeck(s.level), i: 0, clock: null, tally: { S: 0, H: 0, D: 0, C: 0, J: 0 }, joker: null };
  } else if (plan.kind === 'mobility') {
    A.steps = ['walk', 'stretch', 'sum']; A.walk = null; A.si = 0; A.st = null; A.stPhase = 'idle';
  } else if (plan.kind === 'walk') {
    A.steps = ['walk', 'sum']; A.walk = null;
  } else if (plan.kind === 'test') {
    A.testSlot = plan.slot; A.steps = ['intro', 'e0', 'e1', 'e2', 'sum']; A.ev = null; A.evPhase = 'ready'; A.values = {}; A.draft = {};
  }
  save();
  open(true);
}

export function resumeSession() {
  A = store.active();
  if (!A) return;
  // A workout started before the supersets: keep whatever it logged, then close it.
  if (A.kind === 'strength' && !A.blocks) {
    if (A.moves && A.logs) finish();
    store.setActive(null); A = null; refresh();
    toast('Your unfinished workout was saved to Progress.');
    return;
  }
  if (A.steps[A.step] === 'sum' && A.saved) { store.setActive(null); A = null; refresh(); return; }
  open(true);
}

function open(animate) {
  const el = host();
  el.hidden = false;
  el.classList.toggle('enter', !!animate);
  el.addEventListener('animationend', () => el.classList.remove('enter'), { once: true });
  document.getElementById('app').setAttribute('inert', '');
  keepAwake(true);
  render();
  clearInterval(timer);
  timer = setInterval(loop, 250);
  setTimeout(() => el.querySelector('h1, h2')?.focus({ preventScroll: true }), 50);
}

function close() {
  clearInterval(timer);
  keepAwake(false);
  store.setActive(null);
  A = null;
  const el = host();
  el.hidden = true; el.innerHTML = '';
  document.getElementById('app').removeAttribute('inert');
  refresh();
}

const step = () => A.steps[A.step];
function go(n) { A.step = Math.max(0, Math.min(n, A.steps.length - 1)); if (step() === 'sum') finish(); save(); render(); host().querySelector('.s-body')?.scrollTo(0, 0); }

// ================= rendering =================
function topBar(right = '') {
  return `<div class="s-top"><div><button type="button" class="navbtn" data-act="s-end">End</button></div>
    <div class="clock" data-live="elapsed" aria-label="Time in session">${clock((Date.now() - A.startedAt) / 1000)}</div>
    <div class="right">${right}</div></div>`;
}
function progressBar() {
  const parts = A.steps.filter((x) => x !== 'sum');
  const cur = A.step;
  return `<div class="s-progress" aria-hidden="true">${parts.map((_, i) => `<i class="${i < cur ? 'done' : i === cur ? 'now' : ''}"></i>`).join('')}</div>`;
}

function render() {
  lastLive = {};
  const el = host();
  const k = step();
  let html = '';
  if (k === 'sum') html = summaryScreen();
  else if (A.kind === 'strength') html = strengthScreen(k);
  else if (A.kind === 'engine') html = engineScreen(k);
  else if (A.kind === 'deck') html = deckScreen(k);
  else if (A.kind === 'mobility') html = mobilityScreen(k);
  else if (A.kind === 'walk') html = walkScreen();
  else if (A.kind === 'test') html = testScreen(k);
  el.innerHTML = `<div class="s-wrap">${html}</div>`;
  el.setAttribute('aria-label', `${A.name} session`);
  mountDemos(el);
  live();
}

// Warm-up, cool-down and stretch lists show one demo at a time; tap an item to see it.
const picked = (list) => (A.pick && A.pick[list]) || 0;
function drills(list, items, refs) {
  return `<div class="sets">${drillPicker(list, items, refs, picked(list))}</div>`;
}
on('pick-drill', (d) => {
  if (!A) return;
  A.pick = { ...(A.pick || {}), [d.list]: +d.i };
  tap(); save();
  const body = host().querySelector('.s-body'), top = body ? body.scrollTop : 0;
  render();
  const b2 = host().querySelector('.s-body');
  if (b2) b2.scrollTop = top;
  host().querySelector(`[data-act="pick-drill"][data-list="${d.list}"][data-i="${d.i}"]`)?.focus({ preventScroll: true });
});
// The warm-up's last line is "5 light reps of each move in superset 1": that shows superset 1's 1a.
function warmRefs() {
  const first = A.blocks && A.blocks[0] && A.blocks[0].moves[0];
  return WARMUP.demos.map((r, i) => r || (i === WARMUP.items.length - 1 && first ? `@${first.id}:${first.level}` : null));
}
const suitRef = (su, L) => (su.demo === 'push-up' ? `push-up:${L}` : su.demo);

// ---------- strength: three supersets ----------
// A superset is done in order 1a, 1b, rest, 1a, 1b, rest… One move is on screen at a time.
// `A.focus` is a move the person tapped in the pair strip; otherwise the screen follows the order.
const blockAt = () => A.blocks[+step().slice(1)];
const tagOf = (b, j) => (b.kind === 'pair' ? `${b.n}${'ab'[j]}` : '');
const setsOf = (m) => (A.logs[m.id] || []);
function nextIn(b) {
  for (let r = 0; r < b.rounds; r++) for (let j = 0; j < b.moves.length; j++) if (setsOf(b.moves[j]).length <= r) return { r, j };
  return null;
}
function focusOf(b) {
  if (A.focus != null && A.focus < b.moves.length) return A.focus;
  const n = nextIn(b);
  return n ? n.j : b.moves.length - 1;
}
const curMove = () => { const b = blockAt(); return b && b.moves[focusOf(b)]; };

function lastValues(moveId, level) {
  const h = store.db().history;
  for (let i = h.length - 1; i >= 0; i--) {
    const m = h[i].moves?.find((x) => x.id === moveId && x.level === level);
    if (m && m.sets.length) return m.sets;
  }
  return null;
}
function defaultValue(m, setIdx) {
  const logs = setsOf(m);
  const last = lastValues(m.id, m.level);
  if (last && last[setIdx] != null) return last[setIdx];
  if (setIdx > 0 && logs[setIdx - 1] != null) return logs[setIdx - 1];
  if (last && last.length) return last[last.length - 1];
  if (m.dose.amrap) return 10;
  return m.dose.lo ?? 10;
}
const unitWord = (m, n) => (m.dose.unit === 'sec' ? 's' : n === 1 ? 'rep' : 'reps') + (m.dose.per ? ` / ${m.dose.per}` : '');
const blockLine = (b) => b.moves.map((x, j) => `${tagOf(b, j) ? tagOf(b, j) + ' ' : ''}${x.name}`).join(' + ');

// 1a → 1b → rest, with where you are in it.
function pairStrip(b, j, n) {
  const r = n ? n.r : b.rounds;
  const cells = b.moves.map((x, k) => {
    const done = setsOf(x).length > r || (!n);
    return `<li class="${k === j ? 'now' : ''}${done ? ' done' : ''}"><button type="button" data-act="s-focus" data-j="${k}" aria-pressed="${k === j}" aria-label="${esc(tagOf(b, k))}: ${esc(x.name)}, ${setsOf(x).length} of ${b.rounds} sets done">
      <span class="tg">${esc(tagOf(b, k))}${done ? tick : ''}</span><span class="nm">${esc(x.name)}</span></button></li>`;
  }).join('');
  return `<ol class="pair" aria-label="${esc(b.label)}">${cells}<li class="rs" aria-hidden="true"><span class="tg">Rest</span><span class="nm">${b.rest} s</span></li></ol>`;
}

function strengthScreen(k) {
  const s = store.settings();
  if (k === 'warm') {
    const pairs = A.blocks.filter((b) => b.kind === 'pair').length;
    const core = A.blocks.find((b) => b.kind === 'core');
    return `${topBar()}${progressBar()}<div class="s-body">
      <p class="s-step"><span>Warm-up</span><span>${WARMUP.minutes} min</span></p>
      <h1 class="s-name" tabindex="-1">Get warm</h1>
      <p class="s-how">${esc(A.name)} · ${esc(A.title)}. ${pairs} supersets${core ? ', then a short core finish' : ''}. About ${A.minutes} minutes in all.</p>
      ${drills('warm', WARMUP.items, warmRefs())}
      <p class="fine" style="margin-top:14px">${esc(REST_NOTE)}</p>
      <div class="bigclock mid${T.left(A.warm) <= 0 ? ' go' : ''}" data-live="warm" role="timer" style="margin-top:18px">${clock(Math.ceil(Math.max(0, T.left(A.warm))))}</div>
      </div><div class="s-foot"><button type="button" class="btn primary big" data-act="s-next">Start superset 1${icon.arrow}</button></div>`;
  }
  if (k === 'cool') {
    return `${topBar()}${progressBar()}<div class="s-body">
      <p class="s-step"><span>Cool-down</span><span>${COOLDOWN.minutes} min</span></p>
      <h1 class="s-name" tabindex="-1">Cool down</h1>
      ${drills('cool', COOLDOWN.items, COOLDOWN.demos)}
      </div><div class="s-foot"><button type="button" class="btn primary big" data-act="s-finish">Finish ${esc(A.name)}${icon.arrow}</button></div>`;
  }
  const bi = +k.slice(1), b = A.blocks[bi];
  const n = nextIn(b);
  const j = focusOf(b), m = b.moves[j];
  const logs = setsOf(m);
  const moveDone = logs.length >= b.rounds && A.editing == null;
  const cur = A.editing ?? Math.min(logs.length, b.rounds - 1);
  const last = lastValues(m.id, m.level);
  const val = A.draft[m.id] ?? (A.editing != null ? logs[A.editing] : defaultValue(m, cur));
  const nb = A.blocks[bi + 1];
  const pairs = A.blocks.filter((x) => x.kind === 'pair').length;
  const where = b.kind === 'pair' ? `Superset ${b.n} of ${pairs}` : 'Core to finish';
  const round = n ? n.r + 1 : b.rounds;
  const rows = Array.from({ length: b.rounds }, (_, r) => {
    const v = logs[r];
    const isCur = !moveDone && r === cur;
    const lastTxt = last && last[r] != null ? `Last ${last[r]}` : '';
    if (v != null && !isCur) {
      return `<button type="button" class="set logged" data-act="s-edit" data-i="${r}" aria-label="Set ${r + 1}: ${v} ${unitWord(m, v)}. Tap to change."><span class="n">Set ${r + 1}</span><span class="val">${v} <small>${esc(unitWord(m, v))}</small></span><span class="last">${tick}</span></button>`;
    }
    return `<div class="set${isCur ? ' cur' : ''}"><span class="n">Set ${r + 1}</span><span class="val">${isCur ? (A.editing != null ? 'Changing' : 'Now') : '<small>To do</small>'}</span><span class="last">${esc(lastTxt)}</span></div>`;
  }).join('');
  const holding = A.hold && m.dose.unit === 'sec';
  const kit = [m.dose.weight ? kitText(m.dose.weight, s.units) : '', `leave ${A.rir} in the tank`].filter(Boolean).join(' · ');
  let foot;
  if (!n && A.editing == null) {
    foot = `<button type="button" class="btn primary big" data-act="s-next">${nb ? `Next: ${esc(nb.label)}` : 'Cool down'}${icon.arrow}</button>`;
  } else if (moveDone) {
    const o = b.moves[n.j];
    foot = `<button type="button" class="btn primary big" data-act="s-focus" data-j="${n.j}">Go to ${esc(tagOf(b, n.j))} ${esc(o.name)}${icon.arrow}</button>`;
  } else {
    foot = `${m.dose.unit === 'sec' ? `<button type="button" class="btn wide${holding ? ' primary' : ''}" style="margin-bottom:10px" data-act="s-hold">${holding ? 'Stop the clock' : 'Time this hold'}</button>` : ''}
      <div class="stepper" role="group" aria-label="${m.dose.unit === 'sec' ? 'Seconds held' : 'Reps done'}">
        <button type="button" data-act="s-step" data-d="-1" aria-label="Less">${icon.minus}</button>
        <div class="num"><label class="vh" for="s-val">${m.dose.unit === 'sec' ? 'Seconds' : 'Reps'} for set ${cur + 1}</label>
          <input id="s-val" type="number" inputmode="numeric" min="0" max="999" value="${holding ? Math.floor(T.el(A.hold)) : val}" data-change="s-val" data-live="${holding ? 'hold' : ''}">
          <span class="unit">${esc(unitWord(m, val))}</span></div>
        <button type="button" data-act="s-step" data-d="1" aria-label="More">${icon.plus}</button></div>
      <button type="button" class="btn primary big" style="margin-top:10px" data-act="s-log" ${holding ? 'disabled' : ''}>${A.editing != null ? `Save set ${cur + 1}` : nextLabel(b, j, cur, !!nb)}${icon.arrow}</button>`;
  }
  const rest = A.rest ? restPanel() : '';
  return `${topBar(`<button type="button" class="navbtn" data-act="s-moves">All moves</button>`)}${progressBar()}
    <div class="s-body">
      <p class="s-step"><span>${esc(where)}</span><span>Round ${round} of ${b.rounds}</span></p>
      ${b.moves.length > 1 ? pairStrip(b, j, n) : ''}
      ${demoSlot(m.id, m.level)}
      <h1 class="s-name" tabindex="-1">${tagOf(b, j) ? `<span class="s-tag">${esc(tagOf(b, j))}</span>` : ''}${esc(m.name)}</h1>
      <p class="s-dose"><b>${b.rounds} × ${esc(m.dose.reps)}</b></p>
      <p class="s-kit">${esc(kit.charAt(0).toUpperCase() + kit.slice(1))}</p>
      <div class="sets">${rows}</div>
      <p class="s-how">${esc(doLine(m.id, m.level, m.how))}</p>
      <button type="button" class="linkbtn s-howbtn" data-act="s-howto">How to do it</button>
      ${m.grip ? `<p class="callout" style="margin-top:12px">${esc(GRIP_TIP)}</p>` : ''}
      <div class="subnav"><button type="button" class="linkbtn" data-act="s-prev" ${bi === 0 ? 'disabled style="visibility:hidden"' : ''}>${icon.back.replace('<svg', '<svg width="14" height="14" style="vertical-align:-2px;stroke:currentColor;fill:none;stroke-width:2.4"')} Back</button>
        <button type="button" class="linkbtn" data-act="s-skip">${nb ? `Skip to ${esc(nb.label.toLowerCase())}` : 'Skip to cool-down'}</button></div>
    </div>
    <div class="s-foot">${foot}</div>${rest}`;
}

// What logging this set leads to: the other half of the superset, or the rest.
function nextLabel(b, j, cur, more) {
  const after = b.moves.map((x, k) => setsOf(x).length + (k === j ? 1 : 0));
  const head = `Log set ${cur + 1}`;
  if (!after.every((c) => c === after[0])) {
    const o = b.moves.findIndex((x, k) => k !== j && setsOf(x).length < after[j]);
    if (o >= 0) return `${head}, then ${esc(tagOf(b, o))}`;
  }
  return after[0] >= b.rounds && !more ? 'Log the last set' : `${head}, then rest`;
}

function restPanel() {
  const r = A.rest;
  const g = A.gap, gn = g ? setsOf(g).length : 0;
  const gapHere = g && r.b === g.block && gn < g.sets;
  return `<section class="restpanel" aria-label="Rest timer" role="timer">
    <div class="r-top"><b>Rest</b><span>${esc(r.next)}</span></div>
    <div class="r-clock" data-live="rest">${clock(Math.ceil(T.left(r.t)))}</div>
    <div class="r-bar"><i data-live="restbar" style="transform:scaleX(${Math.max(0, T.left(r.t) / r.t.total).toFixed(3)})"></i></div>
    <p class="r-next">${r.hint}</p>
    ${gapHere ? `<div class="r-gap"><p>In this rest: <b>${esc(g.name)}</b>, ${esc(g.dose.reps)}. Set ${gn + 1} of ${g.sets}.</p>
      <button type="button" class="btn" data-act="s-gap">Did ${defaultValue(g, gn)}</button></div>` : ''}
    <div class="btnrow"><button type="button" class="btn" data-act="s-rest-add">+15 s</button><button type="button" class="btn primary" data-act="s-rest-skip">Skip rest</button></div>
  </section>`;
}

function startRest(seconds, next, hint, b) {
  A.rest = { t: T.down(seconds), next, hint, b };
}
function endRest(cue) {
  if (!A.rest) return;
  const panel = host().querySelector('.restpanel');
  const fireCue = cue && fresh(A.rest.t, A.rest.t.total);
  A.rest = null; save();
  if (fireCue) beep('go');
  if (panel && !matchMedia('(prefers-reduced-motion: reduce)').matches) { panel.classList.add('out'); setTimeout(render, 260); }
  else render();
}
const clearMove = () => { A.editing = null; A.hold = null; A.focus = null; };

on('s-next', () => {
  tap(); unlockAudio();
  if (A.kind === 'strength') { clearMove(); A.rest = null; }
  go(A.step + 1);
});
on('s-prev', () => { clearMove(); A.rest = null; go(A.step - 1); });
on('s-skip', () => { clearMove(); A.rest = null; go(A.step + 1); });
on('s-finish', () => go(A.steps.indexOf('sum')));
on('s-focus', (d) => { tap(); A.focus = +d.j; A.editing = null; A.hold = null; save(); render(); host().querySelector('.s-body')?.scrollTo(0, 0); });
on('s-step', (d) => {
  const m = curMove();
  const input = host().querySelector('#s-val');
  const inc = m.dose.unit === 'sec' ? 5 : 1;
  const v = Math.max(0, Math.min(999, (parseInt(input.value, 10) || 0) + inc * +d.d));
  A.draft[m.id] = v; input.value = v; tap();
  host().querySelector('.stepper .unit').textContent = unitWord(m, v);
});
on('s-val', (v) => {
  const m = curMove();
  A.draft[m.id] = Math.max(0, Math.min(999, parseInt(v, 10) || 0));
});
on('s-log', () => {
  const bi = +step().slice(1), b = A.blocks[bi], j = focusOf(b), m = b.moves[j];
  const input = host().querySelector('#s-val');
  const v = Math.max(0, Math.min(999, parseInt(input.value, 10) || 0));
  const logs = (A.logs[m.id] = A.logs[m.id] || []);
  tap();
  if (A.editing != null) {
    logs[A.editing] = v; A.editing = null; delete A.draft[m.id];
    save(); render(); toast('Set updated'); return;
  }
  if (logs.length >= b.rounds) return;
  logs.push(v);
  delete A.draft[m.id];
  A.focus = null; A.hold = null;
  const counts = b.moves.map(setsOf).map((x) => x.length);
  const n = nextIn(b);
  const nb = A.blocks[bi + 1];
  if (!n) {
    if (nb) { startRest(b.rest, `Next: ${nb.label}`, esc(blockLine(nb)), bi); go(A.step + 1); }
    else go(A.step + 1);
    return;
  }
  if (counts.every((c) => c === counts[0])) {
    const f = b.moves[0];
    startRest(b.rest, `Next: round ${n.r + 1} of ${b.rounds}`, `${tagOf(b, 0) ? esc(tagOf(b, 0)) + ' ' : ''}${esc(f.name)} · <b>${esc(f.dose.reps)}</b>`, bi);
  } else {
    toast(`Now ${tagOf(b, n.j)}: ${b.moves[n.j].name}`);
  }
  save(); render(); host().querySelector('.s-body')?.scrollTo(0, 0);
});
on('s-gap', () => {
  const g = A.gap;
  if (!g) return;
  const logs = (A.logs[g.id] = A.logs[g.id] || []);
  if (logs.length < g.sets) logs.push(defaultValue(g, logs.length));
  tap(); save(); render();
});
on('s-edit', (d) => {
  if (A.rest) return;
  const m = curMove();
  A.editing = +d.i; delete A.draft[m.id]; save(); render();
});
on('s-hold', () => {
  const m = curMove();
  tap(); unlockAudio();
  if (A.hold) {
    A.draft[m.id] = Math.floor(T.el(A.hold)); A.hold = null;
  } else { A.hold = T.up(); A.holdCue = false; }
  save(); render();
});
on('s-rest-add', () => { if (A.rest) { A.rest.t.total += 15; tap(); save(); live(); } });
on('s-rest-skip', () => { tap(); endRest(false); });
on('s-howto', () => {
  if (!A || !/^b\d+$/.test(step())) return;
  const m = curMove();
  openMoveSheet({ id: m.id, level: m.level, name: m.name, how: m.how });
});
// Every superset with its two moves, then the core; tap one to go to it.
on('s-moves', async () => {
  const cur = step(), cb = /^b\d+$/.test(cur) ? blockAt() : null, cj = cb ? focusOf(cb) : -1;
  const rows = A.blocks.map((b, bi) => `<div class="sec-h" style="margin-top:${bi ? 20 : 14}px"><h3>${esc(b.label)}</h3><span class="aside">${b.rounds} rounds · rest ${b.rest} s</span></div>
    <div class="rows" style="border-top:0">${b.moves.map((m, j) => {
      const nn = setsOf(m).length;
      return `<button type="button" class="row" data-act="sheet" data-v="b${bi}:${j}"><span><span class="t">${tagOf(b, j) ? esc(tagOf(b, j)) + ' · ' : ''}${esc(m.name)}</span><span class="s">${nn}/${b.rounds} sets${cb === b && cj === j ? ' · now' : ''}</span></span><span class="v">${nn >= b.rounds ? tick : ''}</span></button>`;
    }).join('')}</div>`).join('');
  const g = A.gap;
  const gapRow = g ? `<p class="fine" style="margin-top:14px">During the rests of superset ${g.block + 1}: ${esc(g.name)}, ${esc(g.dose.reps)} (${setsOf(g).length}/${g.sets} done).</p>` : '';
  const v = await openSheet(`<h2 id="sheet-title">${esc(A.name)}</h2><p class="sub">Jump to any move. Logged sets stay.</p>
    ${rows}${gapRow}
    <div class="stack"><button type="button" class="btn quiet wide" data-act="sheet" data-v="">Close</button></div>`);
  if (v && v.startsWith('b')) {
    const [b, j] = v.slice(1).split(':').map(Number);
    A.editing = null; A.hold = null; A.rest = null; A.focus = j;
    go(A.steps.indexOf('b' + b));
  }
});

// ---------- engine (EMOM) ----------
function emomState() {
  const t = A.emom, c = A.cfg;
  const e = T.el(t);
  if (e < LEAD) return { lead: true, left: LEAD - e, minute: 0 };
  const into = e - LEAD;
  const minute = Math.floor(into / 60);
  return { lead: false, minute, left: 60 - (into % 60), done: minute >= c.minutes };
}
function minuteTask(n) { // n is 0-based; minute 1 is odd
  const c = A.cfg;
  return n % 2 === 0 ? { what: `${c.odd.reps} ${c.odd.name.toLowerCase()}`, how: c.odd.how } : { what: `${c.even.reps} mountain climbers`, how: c.even.how };
}
// Sessions saved before the demos existed have no `demo` on their odd-minute move.
const oddDemo = (c) => c.odd.demo || (/thrust/i.test(c.odd.name) ? 'squat-thrust' : 'burpee');
function engineScreen(k) {
  const c = A.cfg;
  if (k === 'warm') {
    return `${topBar()}${progressBar()}<div class="s-body">
      <p class="s-step"><span>Warm-up</span><span>${ENGINE.warmup.minutes} min</span></p>
      <h1 class="s-name" tabindex="-1">Get warm</h1>
      <p class="s-how">Echo · ${c.minutes} minutes, every minute on the minute. Odd minutes: ${c.odd.reps} ${esc(c.odd.name.toLowerCase())}. Even minutes: ${c.even.reps} mountain climbers. Then ${c.finisher.seconds} s of flutter kicks.</p>
      ${drills('ewarm', ENGINE.warmup.items, ENGINE.warmup.demos)}
      <p class="fine">${esc(ENGINE.rule)}</p>
      </div><div class="s-foot"><button type="button" class="btn primary big" data-act="e-start">Start the clock${icon.arrow}</button></div>`;
  }
  if (k === 'emom') {
    const st = emomState();
    const n = Math.min(st.minute, c.minutes - 1);
    const now = minuteTask(n), next = n + 1 < c.minutes ? minuteTask(n + 1) : null;
    const paused = !!A.emom.pausedAt;
    return `${topBar()}${progressBar()}<div class="s-body">
      <p class="s-step"><span data-live="emom-of">${st.lead ? 'Get ready' : `Minute ${pad2(n + 1)} of ${c.minutes}`}</span><span>${paused ? 'Paused' : 'EMOM'}</span></p>
      <div class="bigclock" data-live="emom" role="timer" aria-label="Seconds left this minute">${Math.ceil(st.left)}</div>
      <div class="dial"><i data-live="emombar" style="transform:scaleX(1)"></i></div>
      <div class="task"><h1 class="now" tabindex="-1" data-live="emom-now">${esc(st.lead ? `First: ${now.what}` : now.what)}</h1>
        <p class="how" data-live="emom-how">${esc(now.how)} Rest for whatever is left of the minute.</p>
        <p class="next" data-live="emom-next">${next ? `Next minute: <b>${esc(next.what)}</b>` : `Then: <b>${c.finisher.seconds} s flutter kicks</b>`}</p></div>
      ${refSlot(n % 2 === 0 ? oddDemo(c) : ENGINE.even.demo, 'sm')}
      <ol class="minutes" aria-label="${st.lead ? 0 : n} of ${c.minutes} minutes done">${Array.from({ length: c.minutes }, (_, i) => `<li class="${!st.lead && i < n ? 'done' : !st.lead && i === n ? 'now' : ''}"></li>`).join('')}</ol>
      <div class="subnav" style="margin-top:12px"><span></span><button type="button" class="linkbtn" data-act="e-skip">Skip to the finisher</button></div>
      </div><div class="s-foot"><button type="button" class="btn big ${paused ? 'primary' : ''}" data-act="e-pause">${paused ? `Resume${icon.play}` : `Pause${icon.pause}`}</button></div>`;
  }
  if (k === 'fin') {
    const t = A.fin;
    const left = t ? Math.max(0, Math.ceil(T.left(t))) : c.finisher.seconds;
    return `${topBar()}${progressBar()}<div class="s-body">
      <p class="s-step"><span>Finisher</span><span>${c.finisher.seconds} s</span></p>
      <h1 class="s-name" tabindex="-1">Flutter kicks</h1>
      <p class="s-how">${esc(c.finisher.how)}</p>
      ${refSlot(ENGINE.finisher.demo, 'sm')}
      <div class="bigclock mid" data-live="fin" role="timer">${clock(left)}</div>
      </div><div class="s-foot">${t ? `<button type="button" class="btn big" data-act="e-fin-done">Done${icon.arrow}</button>` : `<button type="button" class="btn primary big" data-act="e-fin">Start ${c.finisher.seconds} s${icon.arrow}</button>`}</div>`;
  }
  return '';
}
on('e-start', () => { unlockAudio(); tap(); A.emom = T.up(); A.lastCue = null; go(A.steps.indexOf('emom')); });
on('e-pause', () => { tap(); if (A.emom.pausedAt) T.resume(A.emom); else T.pause(A.emom); save(); render(); });
on('e-skip', () => { A.emomSkipped = true; go(A.steps.indexOf('fin')); });
on('e-fin', () => { unlockAudio(); tap(); A.fin = T.down(A.cfg.finisher.seconds); save(); render(); });
on('e-fin-done', () => go(A.steps.indexOf('sum')));
on('e-result', (d) => { A.result = d.v; const e = store.db().history.find((x) => x.id === A.id); if (e) store.updateHistory(A.id, { engine: { ...e.engine, finished: d.v === 'all' } }); save(); render(); });

// ---------- deck of cards ----------
function cardFace(card) {
  if (!card) return `<div class="card back" aria-label="Face-down card"><span class="mark">PT</span></div>`;
  if (card.joker) return `<div class="card flip" aria-label="Joker"><span class="face">J</span><span class="corner tl">J</span><span class="corner br">J</span></div>`;
  const su = DECK.suits.find((x) => x.id === card.suit);
  return `<div class="card flip${su.red ? ' red' : ''}" aria-label="${esc(card.rank)} of ${esc(su.name)}">
    <span class="corner tl">${esc(card.rank)}${suitSvg(card.suit, '')}</span>
    ${suitSvg(card.suit, 'pip')}
    <span class="corner br">${esc(card.rank)}${suitSvg(card.suit, '')}</span></div>`;
}
function deckScreen(k) {
  const L = A.level, c = A.cfg;
  if (k === 'warm') {
    return `${topBar()}${progressBar()}<div class="s-body">
      <p class="s-step"><span>Warm-up</span><span>${ENGINE.warmup.minutes} min</span></p>
      <h1 class="s-name" tabindex="-1">Get warm</h1>
      <p class="s-how">${esc(DECK.warmup)}</p>
      ${drills('dwarm', ENGINE.warmup.items, ENGINE.warmup.demos)}
      <ul class="suitlist taps" style="margin-top:18px">${DECK.suits.map((su) => `<li><button type="button" data-act="lib-sheet" data-ref="${esc(suitRef(su, L))}">${suitSvg(su.id, 'suit' + (su.red ? ' red' : ''))}<span>${esc(su.name)}</span><span class="muted">${esc(su.move)}${su.id === 'C' && c.halfBurpees ? ' (half)' : ''}</span></button></li>`).join('')}${c.jokers ? `<li><button type="button" data-act="lib-sheet" data-ref="${esc(DECK.joker)}"><span class="stencil">J</span><span>Jokers</span><span class="muted">1 min plank</span></button></li>` : ''}</ul>
      <p class="fine" style="margin-top:6px">Tap a suit to see its move.</p>
      <p class="fine">${esc(DECK.values)} ${esc(c.text)}</p>
      </div><div class="s-foot"><button type="button" class="btn primary big" data-act="s-next">Shuffle up${icon.arrow}</button></div>`;
  }
  const d = A.deck;
  const card = d.i > 0 ? d.cards[d.i - 1] : null;
  const total = d.cards.length;
  const r = card ? repsForCard(card, L) : null;
  const tally = DECK.suits.map((su) => `<div><b data-live="tally-${su.id}">${d.tally[su.id]}</b><span>${suitSvg(su.id, '')}${esc(su.move)}</span></div>`).join('');
  let doLine;
  if (!card) doLine = `<b>Flip a card</b><span>${total} cards · the clock starts on the first flip</span>`;
  else if (card.joker) {
    const left = d.joker ? Math.max(0, Math.ceil(T.left(d.joker))) : 60;
    doLine = `<b data-live="joker">${d.joker ? clock(left) : '1 min plank'}</b><span>Joker: forearms down, hips level</span>`;
  } else doLine = `<b>${r.reps} ${esc(r.move.toLowerCase())}</b><span>${card.suit === 'C' && L === 0 ? 'Recruit: burpees count half · ' : ''}${total - d.i} cards left</span>`;
  const last = d.i >= total;
  const btn = card && card.joker && !d.joker
    ? `<button type="button" class="btn primary big" data-act="d-joker">Start the plank${icon.play}</button>`
    : last ? `<button type="button" class="btn primary big" data-act="s-finish">Finish the deck${icon.arrow}</button>`
      : `<button type="button" class="btn primary big" data-act="d-flip">${card ? 'Next card' : 'Flip the first card'}${icon.arrow}</button>`;
  return `${topBar(`<span class="clock" style="padding-right:12px">${d.i}/${total}</span>`)}${progressBar()}<div class="s-body">
    <div class="deck-stage"><button type="button" data-act="${last || (card && card.joker && !d.joker) ? '' : 'd-flip'}" style="background:none;border:0;padding:0" aria-label="${card ? 'Next card' : 'Flip the first card'}">${cardFace(card)}</button></div>
    <div class="deck-do" aria-live="polite">${doLine}</div>
    ${card ? refSlot(card.joker ? DECK.joker : suitRef(DECK.suits.find((x) => x.id === card.suit), L), 'sm') : ''}
    <div class="deck-tally">${tally}</div>
    <p class="s-step" style="margin-top:12px"><span>Deck time <b data-live="deck">${d.clock ? clock(T.el(d.clock)) : '0:00'}</b></span><span>${esc(levelName(L))} · ${total} cards</span></p>
    ${!last && d.i > 0 ? '<div class="subnav"><span></span><button type="button" class="linkbtn" data-act="s-finish">Stop here and finish</button></div>' : ''}
    </div><div class="s-foot">${btn}</div>`;
}
on('d-flip', () => {
  const d = A.deck;
  if (d.i >= d.cards.length) return;
  const prev = d.i > 0 ? d.cards[d.i - 1] : null;
  if (prev && prev.joker && d.joker && T.left(d.joker) > 0) return; // finish the plank first
  unlockAudio(); tap();
  if (!d.clock) d.clock = T.up();
  const card = d.cards[d.i++];
  d.joker = null;
  if (card.joker) d.tally.J++;
  else { const r = repsForCard(card, A.level); d.tally[card.suit] += r.reps; }
  save(); render();
});
on('d-joker', () => { tap(); A.deck.joker = T.down(60); save(); render(); });

// ---------- mobility + walk ----------
function mobilityScreen(k) {
  if (k === 'walk') return walkBlock(MOBILITY.walk.minutes * 60, 'Walk first', MOBILITY.walk.text + ' Then seven 60-second stretches.', 'Done walking');
  const list = MOBILITY.stretches;
  const x = list[A.si] || list[list.length - 1];
  const t = A.st;
  let big = '1:00', state = 'Ready';
  if (t) {
    if (A.stPhase === 'lead') { big = String(Math.ceil(T.left(t))); state = 'Get ready'; }
    else { big = clock(Math.ceil(T.left(t))); state = t.pausedAt ? 'Paused' : 'Hold'; }
  }
  const next = list[A.si + 1];
  return `${topBar(`<span class="clock" style="padding-right:12px">${A.si + 1}/${list.length}</span>`)}${progressBar()}<div class="s-body">
    <p class="s-step"><span data-live="st-state">${state}</span><span>Stretch ${A.si + 1} of ${list.length}</span></p>
    <h1 class="s-name" tabindex="-1">${esc(x.name)}</h1>
    ${x.side ? `<p class="s-dose"><span><b>${esc(x.side)}</b></span><span>${x.seconds} s</span></p>` : `<p class="s-dose"><span><b>${x.seconds} s</b></span></p>`}
    ${refSlot(x.demo, 'sm')}
    <p class="s-how"><button type="button" class="linkbtn s-howbtn" data-act="lib-sheet" data-ref="${esc(x.demo || '')}">How to do it</button></p>
    <div class="bigclock mid${A.stPhase === 'lead' ? ' go' : ''}" data-live="st" role="timer">${big}</div>
    <div class="task"><p class="next">${next ? `Next: <b>${esc(next.name)}${next.side ? `, ${esc(next.side.toLowerCase())}` : ''}</b>` : 'Last one.'}</p></div>
    <div class="subnav" style="margin-top:12px"><span></span><button type="button" class="linkbtn" data-act="m-skip">${next ? 'Skip this stretch' : 'Finish'}</button></div>
    </div><div class="s-foot">${!t ? `<button type="button" class="btn primary big" data-act="m-start">Start the stretches${icon.play}</button>` : `<button type="button" class="btn big${t.pausedAt ? ' primary' : ''}" data-act="m-pause">${t.pausedAt ? `Resume${icon.play}` : `Pause${icon.pause}`}</button>`}</div>`;
}
function walkBlock(target, title, text, doneLabel) {
  const t = A.walk;
  const shown = t ? (target ? Math.max(0, T.left(t)) : T.el(t)) : (target || 0);
  return `${topBar()}${progressBar()}<div class="s-body">
    <p class="s-step"><span>${target ? `${target / 60} min walk` : 'Easy walk · 20–30 min'}</span><span data-live="walk-state">${t ? (t.pausedAt ? 'Paused' : 'Walking') : 'Ready'}</span></p>
    <h1 class="s-name" tabindex="-1">${esc(title)}</h1>
    <p class="s-how">${esc(text)}</p>
    <div class="bigclock mid" data-live="walk" role="timer">${clock(shown)}</div>
    ${target ? '<div class="subnav" style="margin-top:16px"><span></span><button type="button" class="linkbtn" data-act="w-skip">Skip the walk</button></div>' : ''}
    </div><div class="s-foot">${!t ? `<button type="button" class="btn primary big" data-act="w-start">Start walking${icon.play}</button>`
      : `<div class="foot-row two"><button type="button" class="btn big" data-act="w-pause">${t.pausedAt ? 'Resume' : 'Pause'}</button><button type="button" class="btn primary big" data-act="w-done">${esc(doneLabel)}${icon.arrow}</button></div>`}</div>`;
}
function walkScreen() { return walkBlock(0, 'Walk', WALK.text, 'Finish walk'); }

on('w-start', () => { unlockAudio(); tap(); A.walk = A.kind === 'mobility' ? T.down(MOBILITY.walk.minutes * 60) : T.up(); A.walkCue = false; save(); render(); });
on('w-skip', () => { A.walkSeconds = A.walk ? Math.round(T.el(A.walk)) : 0; A.walk = A.walk || null; go(A.step + 1); });
on('w-pause', () => { tap(); if (A.walk.pausedAt) T.resume(A.walk); else T.pause(A.walk); save(); render(); });
on('w-done', () => { tap(); A.walkSeconds = Math.round(Math.min(T.el(A.walk), A.kind === 'mobility' ? MOBILITY.walk.minutes * 60 : 1e9)); go(A.step + 1); });
on('m-start', () => { unlockAudio(); tap(); A.stPhase = 'lead'; A.st = T.down(LEAD); A.stDone = A.stDone || 0; save(); render(); });
on('m-pause', () => { tap(); if (A.st.pausedAt) T.resume(A.st); else T.pause(A.st); save(); render(); });
on('m-skip', () => nextStretch(false));
function nextStretch(completed) {
  if (completed) A.stDone = (A.stDone || 0) + 1;
  if (A.si + 1 >= MOBILITY.stretches.length) { A.st = null; go(A.steps.indexOf('sum')); return; }
  A.si++;
  A.stPhase = 'lead'; A.st = A.st ? T.down(LEAD) : null;
  save(); render();
}

// ---------- PT test ----------
function testScreen(k) {
  const slotName = A.testSlot === 'w1' ? 'Week 1' : 'Week 8';
  if (k === 'intro') {
    return `${topBar()}${progressBar()}<div class="s-body">
      <p class="s-step"><span>PT test · ${slotName}</span><span>3 events</span></p>
      <h1 class="s-name" tabindex="-1">PT test</h1>
      <p class="s-how">${esc(TEST.when)} Warm up first, and rest a few minutes between events.</p>
      <ol class="manual" style="border-top:1px solid var(--line);margin-top:18px">${TEST.events.map((ev) => `<li><span><b>${esc(ev.name)}.</b> ${esc(ev.how)}</span></li>`).join('')}</ol>
      </div><div class="s-foot"><button type="button" class="btn primary big" data-act="s-next">Begin with push-ups${icon.arrow}</button></div>`;
  }
  const ev = TEST.events[+k.slice(1)];
  const t = A.ev;
  let big;
  if (A.evPhase === 'enter') big = '';
  else if (!t) big = clock(ev.limit || 0);
  else if (A.evLead) big = String(Math.ceil(T.left(t)));
  else big = ev.limit ? clock(Math.ceil(T.left(t))) : clock(T.el(t));
  let foot;
  if (A.evPhase === 'ready') foot = `<button type="button" class="btn primary big" data-act="t-go">Start${ev.limit ? ` ${clock(ev.limit)}` : ' the clock'}${icon.play}</button>`;
  else if (A.evPhase === 'run') foot = ev.limit ? `<button type="button" class="btn big" data-act="t-stop">Stop early</button>` : `<button type="button" class="btn primary big" data-act="t-stop">Stop: form broke</button>`;
  else {
    const v = A.draft[ev.id] ?? (ev.unit === 'sec' ? 0 : 0);
    foot = `<div class="stepper" role="group" aria-label="${esc(ev.name)} result">
      <button type="button" data-act="t-step" data-d="-1" aria-label="Less">${icon.minus}</button>
      <div class="num"><label class="vh" for="t-val">${esc(ev.name)} ${ev.unit === 'sec' ? 'seconds' : 'reps'}</label><input id="t-val" type="number" inputmode="numeric" min="0" max="9999" value="${v}" data-change="t-val"><span class="unit">${ev.unit === 'sec' ? 'seconds' : 'reps'}</span></div>
      <button type="button" data-act="t-step" data-d="1" aria-label="More">${icon.plus}</button></div>
      <button type="button" class="btn primary big" style="margin-top:10px" data-act="t-save">${+k.slice(1) < 2 ? 'Save and next event' : 'Save results'}${icon.arrow}</button>`;
  }
  return `${topBar()}${progressBar()}<div class="s-body">
    <p class="s-step"><span>Event ${+k.slice(1) + 1} of 3 · ${slotName}</span><span data-live="t-state">${A.evPhase === 'enter' ? 'Enter your score' : A.evLead ? 'Get ready' : A.evPhase === 'run' ? 'Go' : 'Ready'}</span></p>
    <h1 class="s-name" tabindex="-1">${esc(ev.name)}</h1>
    <p class="s-how">${esc(ev.how)}</p>
    ${A.evPhase === 'enter' ? '' : refSlot(ev.demo, 'sm')}
    ${big !== '' ? `<div class="bigclock mid${A.evLead ? ' go' : ''}" data-live="t" role="timer">${big}</div>` : `<p class="lead" style="margin-top:22px">${ev.unit === 'sec' ? 'Seconds held, from the clock.' : 'How many good reps?'} Adjust it if you need to.</p>`}
    <div class="subnav" style="margin-top:16px"><span></span><button type="button" class="linkbtn" data-act="t-skip">Skip this event</button></div>
    </div><div class="s-foot">${foot}</div>`;
}
on('t-go', () => { unlockAudio(); tap(); A.evPhase = 'run'; A.evLead = true; A.ev = T.down(LEAD); save(); render(); });
on('t-stop', () => {
  const ev = TEST.events[+step().slice(1)];
  tap();
  if (!ev.limit && A.ev && !A.evLead) A.draft[ev.id] = Math.floor(T.el(A.ev));
  A.ev = null; A.evLead = false; A.evPhase = 'enter'; save(); render();
});
on('t-step', (d) => { const ev = TEST.events[+step().slice(1)]; const input = host().querySelector('#t-val'); const v = Math.max(0, (parseInt(input.value, 10) || 0) + (ev.unit === 'sec' ? 5 : 1) * +d.d); A.draft[ev.id] = v; input.value = v; tap(); });
on('t-val', (v) => { const ev = TEST.events[+step().slice(1)]; A.draft[ev.id] = Math.max(0, parseInt(v, 10) || 0); });
on('t-save', () => {
  const ev = TEST.events[+step().slice(1)];
  const input = host().querySelector('#t-val');
  A.values[ev.id] = Math.max(0, parseInt(input.value, 10) || 0);
  A.ev = null; A.evPhase = 'ready'; tap();
  go(A.step + 1);
});
on('t-skip', () => { A.ev = null; A.evLead = false; A.evPhase = 'ready'; go(A.step + 1); });

// ================= finishing =================
function finish() {
  if (A.saved) return;
  const e = { id: A.id, kind: A.kind, slot: A.slot, date: A.date, week: A.week, day: A.day, key: A.key, name: A.name, title: A.title, level: A.level, startedAt: A.startedAt, endedAt: Date.now() };
  if (A.kind === 'strength') {
    const tagFor = (m) => (m.gap ? 'Rest gap' : A.blocks ? (A.blocks[m.block]?.kind === 'core' ? 'Core' : `${m.block + 1}${m.slot}`) : m.finisher ? 'Finisher' : '');
    e.moves = A.moves.filter((m) => (A.logs[m.id] || []).length).map((m) => ({ id: m.id, name: m.name, level: m.level, unit: m.dose.unit, per: m.dose.per, target: m.sets, sets: A.logs[m.id], tag: tagFor(m), hi: m.dose.hi }));
    if (!e.moves.length) { A.saved = true; A.nothing = true; return; }
  } else if (A.kind === 'engine') {
    const st = A.emom ? emomState() : { minute: 0 };
    e.engine = { minutes: A.cfg.minutes, rounds: Math.min(A.cfg.minutes, Math.max(0, st.minute)), finished: null, finisher: !!A.fin };
  } else if (A.kind === 'deck') {
    const d = A.deck;
    if (!d.i) { A.saved = true; A.nothing = true; return; }
    e.deck = { cards: d.i, of: d.cards.length, seconds: d.clock ? Math.round(T.el(d.clock)) : 0, tally: d.tally };
  } else if (A.kind === 'mobility') {
    e.mobility = { walkSeconds: A.walkSeconds || 0, stretches: A.stDone || 0 };
  } else if (A.kind === 'walk') {
    e.walk = { seconds: A.walkSeconds || 0 };
  } else if (A.kind === 'test') {
    if (!Object.keys(A.values).length) { A.saved = true; A.nothing = true; return; }
    e.test = { slot: A.testSlot, values: A.values };
    store.saveTest(A.testSlot, { ...A.values, date: A.date });
  }
  store.addHistory(e);
  A.saved = true;
  beep('done');
}

function previousEntry(e) {
  const h = store.db().history;
  const idx = h.findIndex((x) => x.id === e.id);
  for (let i = (idx < 0 ? h.length : idx) - 1; i >= 0; i--) if (h[i].key === e.key && h[i].kind === e.kind && h[i].level === e.level) return h[i];
  return null;
}

// Shared by the end of a session and by a saved record in Progress.
export function summaryHTML(e, { record = false } = {}) {
  const dur = (e.endedAt - e.startedAt) / 1000;
  const prev = previousEntry(e);
  let stats = [[minutesLabel(dur), 'time']];
  let body = '';
  if (e.moves) {
    const sets = e.moves.reduce((a, m) => a + m.sets.length, 0);
    const reps = e.moves.filter((m) => m.unit === 'reps').reduce((a, m) => a + m.sets.reduce((x, y) => x + y, 0), 0);
    stats.push([sets, 'sets'], [reps, 'reps']);
    const hist = store.db().history;
    body = `<ol class="sum-moves" style="margin-top:6px">${e.moves.map((m) => {
      const pm = prev?.moves?.find((x) => x.id === m.id && x.level === m.level);
      const sum = m.sets.reduce((a, b) => a + b, 0);
      let delta = '';
      if (pm) { const d = sum - pm.sets.reduce((a, b) => a + b, 0); delta = d > 0 ? `<span class="delta up">+${d}</span>` : d < 0 ? `<span class="delta">${d}</span>` : '<span class="delta">=</span>'; }
      const unit = m.unit === 'sec' ? ' s' : '';
      // "Making it harder": top of the range on every set, two sessions running.
      const upto = hist.slice(0, hist.findIndex((x) => x.id === e.id) + 1);
      const ready = !record && m.level < 2 && m.hi && readyToLevelUp(upto, { id: m.id, level: m.level, dose: { hi: m.hi, amrap: false } });
      const tg = m.tag || (m.finisher ? 'Finisher' : '');
      return `<li><span class="nm">${tg ? `<span class="tg">${esc(tg)}</span>` : ''}${esc(m.name)}<span class="sets-done" style="display:block">${m.sets.map((v) => v + unit).join(' · ')}${m.per ? ` / ${m.per}` : ''}</span></span>${delta}
        ${ready ? `<div class="lvlup"><span>Top of the range on every set, two sessions running. Move it up to ${esc(LEVELS[m.level + 1].name)}, or slow the lowering to 3–4 seconds.</span><button type="button" class="btn" data-act="s-levelup" data-id="${esc(m.id)}" data-l="${m.level + 1}">Move it up a level</button></div>` : ''}</li>`;
    }).join('')}</ol>${prev ? `<p class="fine">Change is against your last ${esc(e.name)} at this level (${esc(longDate(prev.date))}).</p>` : ''}`;
  } else if (e.engine) {
    stats.push([`${e.engine.rounds}/${e.engine.minutes}`, 'rounds'], [e.engine.finisher ? 'Yes' : 'No', 'finisher']);
    const f = e.engine.finished;
    body = `<p class="lead">Did you get every round’s reps inside the minute?</p>
      <div class="btnrow" style="margin-top:10px">${record ? `<p>${f === true ? 'Yes, every round.' : f === false ? 'No: drop 2 reps next time, then add 1 a week.' : 'Not answered.'}</p>` : `
        <button type="button" class="btn${f === true ? ' primary' : ''}" data-act="e-result" data-v="all" aria-pressed="${f === true}">Every round</button>
        <button type="button" class="btn${f === false ? ' primary' : ''}" data-act="e-result" data-v="dropped" aria-pressed="${f === false}">Missed some</button>`}</div>
      <p class="fine">${esc(ENGINE.rule)}</p>`;
  } else if (e.deck) {
    const reps = DECK.suits.reduce((a, su) => a + e.deck.tally[su.id], 0);
    stats = [[clock(e.deck.seconds), 'deck time'], [`${e.deck.cards}/${e.deck.of}`, 'cards'], [reps, 'reps']];
    const best = store.db().history.filter((x) => x.deck && x.level === e.level && x.deck.cards === x.deck.of && x.deck.of === e.deck.of && x.id !== e.id).reduce((b, x) => Math.min(b, x.deck.seconds), Infinity);
    const full = e.deck.cards === e.deck.of;
    body = `<ul class="suitlist" style="margin-top:6px">${DECK.suits.map((su) => `<li>${suitSvg(su.id, 'suit' + (su.red ? ' red' : ''))}<span>${esc(su.move)}</span><b>${e.deck.tally[su.id]}</b></li>`).join('')}${e.deck.tally.J ? `<li><span class="stencil">J</span><span>Planks</span><b>${e.deck.tally.J} min</b></li>` : ''}</ul>
      <p class="fine">${best < Infinity ? (full && e.deck.seconds < best ? `New best. Your last best was ${clock(best)}.` : `Your best full deck at this level: ${clock(best)}.`) : full ? 'Your first full deck at this level. Beat this time next time.' : 'Finish the whole deck to set a time to beat.'}</p>`;
  } else if (e.mobility) {
    stats = [[minutesLabel(dur), 'time'], [minutesLabel(e.mobility.walkSeconds), 'walking'], [`${e.mobility.stretches}/7`, 'stretches']];
  } else if (e.walk) {
    stats = [[minutesLabel(e.walk.seconds), 'walking'], [minutesLabel(dur), 'in all']];
  } else if (e.test) {
    const other = store.db().test[e.test.slot === 'w1' ? 'w8' : 'w1'];
    stats = TEST.events.map((ev) => [e.test.values[ev.id] != null ? e.test.values[ev.id] + (ev.unit === 'sec' ? ' s' : '') : '–', ev.name.toLowerCase()]);
    body = other ? `<p class="fine">Compare both tests in Progress.</p>` : `<p class="fine">${e.test.slot === 'w1' ? 'Retake it in week 8 and the change shows in Progress.' : ''}</p>`;
  }
  const note = record
    ? (e.note ? `<div class="section" style="padding:0">${'<div class="sec-h"><h3>Note</h3></div>'}<p>${esc(e.note)}</p></div>` : '')
    : `<div style="margin-top:22px"><label class="lab" for="s-note" style="display:block;font-weight:600;margin-bottom:8px">Note <span class="muted" style="font-weight:400">(optional)</span></label>
       <textarea class="input" id="s-note" maxlength="280" placeholder="How it felt, what to change next time" data-change="entry-note" data-id="${esc(e.id)}">${esc(e.note || '')}</textarea></div>`;
  return `<div class="sum-stats">${stats.map(([b, l]) => `<div><b>${esc(b)}</b><span>${esc(l)}</span></div>`).join('')}</div>${body}${note}`;
}

function summaryScreen() {
  if (A.nothing) {
    return `${topBar()}<div class="s-body"><h1 class="s-name" tabindex="-1">Nothing logged</h1><p class="s-how">No sets were logged, so this session isn’t saved.</p></div>
      <div class="s-foot"><button type="button" class="btn primary big" data-act="s-close">Close${icon.arrow}</button></div>`;
  }
  const e = store.db().history.find((x) => x.id === A.id);
  if (!e) return '';
  return `<div class="s-top"><div></div><div class="clock">${esc(longDate(e.date))}</div><div></div></div>
    <div class="s-body sum-head"><div class="stamp">${tick}<span>${A.kind === 'test' ? 'Logged' : 'Done'}</span></div>
      <h1 class="s-name xl" tabindex="-1" style="margin-top:14px">${esc(e.name)}</h1><p class="s-how" style="margin-top:6px">${esc(e.title || '')}${e.week ? ` · Week ${e.week}` : ''}. Saved to Progress.</p>
      ${summaryHTML(e)}</div>
    <div class="s-foot"><button type="button" class="btn primary big" data-act="s-close">Done${icon.arrow}</button></div>`;
}
on('s-close', () => { tap(); close(); });
on('s-levelup', (d, el) => {
  const ml = { ...store.settings().moveLevel, [d.id]: +d.l };
  store.saveSettings({ moveLevel: ml });
  el.closest('.lvlup').innerHTML = `<span>${tick} Done. Next time it’s the ${esc(LEVELS[+d.l].name)} version.</span>`;
  toast('Moved up a level');
});

on('s-end', async () => {
  const anything = A.kind === 'strength' ? Object.values(A.logs).some((l) => l.length) : A.kind === 'deck' ? A.deck.i > 0 : A.kind === 'test' ? Object.keys(A.values).length > 0 : A.kind === 'engine' ? !!A.emom : A.kind === 'mobility' || A.kind === 'walk' ? !!A.walk : false;
  const v = await openSheet(`<h2 id="sheet-title">End ${esc(A.name)}?</h2>
    <p class="sub">${anything ? 'Save what you’ve done so far, or throw this session away.' : 'Nothing is logged yet.'}</p>
    <div class="stack">
      ${anything ? '<button type="button" class="btn primary wide" data-act="sheet" data-v="save">Save and finish</button>' : ''}
      <button type="button" class="btn wide danger" data-act="sheet" data-v="discard">Discard session</button>
      <button type="button" class="btn quiet wide" data-act="sheet" data-v="">Keep going</button></div>`);
  if (v === 'save') {
    if (A.kind === 'walk' || A.kind === 'mobility') A.walkSeconds = A.walkSeconds || (A.walk ? Math.round(T.el(A.walk)) : 0);
    A.rest = null; go(A.steps.indexOf('sum'));
  } else if (v === 'discard') { close(); toast('Session discarded'); }
});

// ================= the clock loop =================
function setLive(name, text) {
  if (lastLive[name] === text) return;
  lastLive[name] = text;
  const n = host().querySelector(`[data-live="${name}"]`);
  if (n) { if (n.tagName === 'INPUT') n.value = text; else n.textContent = text; }
}
function setBar(name, frac) {
  const v = Math.max(0, Math.min(1, frac)).toFixed(3);
  if (lastLive[name] === v) return;
  lastLive[name] = v;
  const n = host().querySelector(`[data-live="${name}"]`);
  if (n) n.style.transform = `scaleX(${v})`;
}

function live() {
  if (!A) return;
  setLive('elapsed', clock((Date.now() - A.startedAt) / 1000));
  const k = step();
  if (A.kind === 'strength') {
    if (k === 'warm' && A.warm) {
      const left = T.left(A.warm);
      setLive('warm', clock(Math.ceil(Math.max(0, left))));
      if (left <= 0 && !A.warm.cued) { A.warm.cued = true; if (fresh(A.warm, A.warm.total)) beep('go'); render(); }
    }
    if (A.rest) {
      const left = T.left(A.rest.t);
      setLive('rest', clock(Math.ceil(Math.max(0, left))));
      setBar('restbar', left / A.rest.t.total);
      if (left <= 3.05 && left > 0.05) { const s = Math.ceil(left); if (A.rest.cue !== s) { A.rest.cue = s; if (fresh(A.rest.t, A.rest.t.total - left)) beep('tick'); } }
      if (left <= 0) endRest(true);
    }
    if (A.hold && /^b\d+$/.test(k)) {
      const m = curMove();
      const e = Math.floor(T.el(A.hold));
      setLive('hold', String(e));
      if (m && m.dose.hi && e >= m.dose.hi && !A.holdCue) { A.holdCue = true; beep('go'); }
    }
  } else if (A.kind === 'engine') {
    if (k === 'emom' && A.emom) {
      const st = emomState(), c = A.cfg;
      if (st.done) { beep('go'); A.fin = null; go(A.steps.indexOf('fin')); return; }
      const secs = Math.ceil(st.left);
      setLive('emom', String(secs));
      setBar('emombar', st.left / (st.lead ? LEAD : 60));
      const n = st.minute;
      const cueKey = `${st.lead ? 'L' : n}-${secs}`;
      if (!A.emom.pausedAt && A.lastCue !== cueKey) {
        const prevMinute = A.lastMinute;
        A.lastCue = cueKey;
        if (secs <= 3 && secs >= 1 && !document.hidden) beep('tick');
        if (!st.lead && prevMinute !== n) { A.lastMinute = n; if (!document.hidden) beep('go'); render(); return; }
      }
      setLive('emom-of', st.lead ? 'Get ready' : `Minute ${pad2(n + 1)} of ${c.minutes}`);
    }
    if (k === 'fin' && A.fin) {
      const left = T.left(A.fin);
      setLive('fin', clock(Math.ceil(Math.max(0, left))));
      if (left <= 0) { const cue = fresh(A.fin, A.fin.total); A.fin.done = true; if (cue) beep('go'); go(A.steps.indexOf('sum')); }
    }
  } else if (A.kind === 'deck') {
    const d = A.deck;
    if (d.clock) setLive('deck', clock(T.el(d.clock)));
    if (d.joker) {
      const left = T.left(d.joker);
      setLive('joker', clock(Math.ceil(Math.max(0, left))));
      if (left <= 0 && !d.joker.cued) { d.joker.cued = true; if (fresh(d.joker, d.joker.total)) beep('go'); save(); render(); }
    }
  } else if (A.kind === 'mobility' || A.kind === 'walk') {
    if (k === 'walk' && A.walk) {
      if (A.kind === 'mobility') {
        const left = T.left(A.walk);
        setLive('walk', clock(Math.max(0, left)));
        if (left <= 0) { const cue = fresh(A.walk, A.walk.total); A.walkSeconds = A.walk.total; if (cue) beep('go'); go(A.step + 1); }
      } else {
        const e = T.el(A.walk);
        setLive('walk', clock(e));
        if (e >= 20 * 60 && !A.walkCue) { A.walkCue = true; if (fresh(A.walk, 20 * 60)) beep('go'); }
      }
    }
    if (k === 'stretch' && A.st && !A.st.pausedAt) {
      const left = T.left(A.st);
      setLive('st', A.stPhase === 'lead' ? String(Math.ceil(Math.max(0, left))) : clock(Math.ceil(Math.max(0, left))));
      if (left <= 0) {
        const cue = fresh(A.st, A.st.total);
        if (A.stPhase === 'lead') { A.stPhase = 'run'; A.st = T.down(MOBILITY.stretches[A.si].seconds); if (cue) beep('go'); save(); render(); }
        else { if (cue) beep('go'); nextStretch(true); }
      }
    }
  } else if (A.kind === 'test') {
    if (A.ev && A.evPhase === 'run') {
      const ev = TEST.events[+k.slice(1)];
      if (A.evLead) {
        const left = T.left(A.ev);
        setLive('t', String(Math.ceil(Math.max(0, left))));
        if (left <= 0) { A.evLead = false; A.ev = ev.limit ? T.down(ev.limit) : T.up(); if (!document.hidden) beep('go'); save(); render(); }
      } else if (ev.limit) {
        const left = T.left(A.ev);
        setLive('t', clock(Math.ceil(Math.max(0, left))));
        if (left <= 0) { const cue = fresh(A.ev, A.ev.total); if (cue) beep('done'); A.ev = null; A.evPhase = 'enter'; save(); render(); }
      } else setLive('t', clock(T.el(A.ev)));
    }
  }
}
function loop() { if (A && !host().hidden) live(); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && A) { live(); } });
