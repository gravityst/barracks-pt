// Every screen under the tab bar: Today, Plan (+ day preview), Progress (+ session record), More (+ guide, settings).
import { SESSIONS, SCHEDULES, LEVELS, PHASES, DAY_SHORT, DAY_LONG, WARMUP, COOLDOWN, REST_NOTE, ENGINE, DECK,
  MOBILITY, WALK, OFF, TEST, RESULTS, GUIDE, SAFETY, KIT, FOCUS, FINISHERS, GRIP_TIP, ARMS_LINE, ARMS_RESULTS, phaseFor } from './data.js';
import { WEEKS, dateKey, addDays, dayIndex, mondayOf, weekNumber, slotDate, buildSession, sessionKeyFor, entryForSlot,
  streak, weekTally, nextSession, isRequired, clock, minutesLabel, daysBetween, readyToLevelUp } from './plan.js';
import * as store from './store.js';
import { esc, icon, chev, tick, suitSvg, longDate, shortDate, dayMonth, timeLabel, pad2, weightText, kitText,
  on, toast, openSheet, closeSheet, confirmSheet } from './ui.js';
import { push, pop, refresh, showTab, nav, top, draw } from './nav.js';
import { startSession, resumeSession, summaryHTML } from './session.js';
import { downloadCalendar } from './calendar.js';

export const VERSION = '1.0';
const LETTER = { A: 'A', B: 'B', C: 'C', E1: 'E', E2: 'F', mob: 'M', walk: 'W', off: '·' };

const S = () => store.settings();
const D = () => store.db();

function navbar(title, { back, right = '', always = false } = {}) {
  return `<header class="navbar${always ? ' always' : ''}${back ? '' : ' float'}"><div class="navbar-in">
    <div class="left">${back ? `<button type="button" class="navbtn" data-act="back">${icon.back}<span>${esc(back)}</span></button>` : ''}</div>
    <div class="navtitle">${esc(title)}</div>
    <div class="right">${right}</div></div></header>`;
}
const largeTitle = (t, sub = '') => `<div class="largetitle" data-titlemark><h1>${esc(t)}</h1>${sub ? `<p>${sub}</p>` : ''}</div>`;
const secH = (t, aside = '', tag = 'h2') => `<div class="sec-h"><${tag}>${esc(t)}</${tag}>${aside ? `<span class="aside">${aside}</span>` : ''}</div>`;

// A strength day's length includes the arm finisher when it's on.
function dayTime(s, key) { const ss = SESSIONS[key]; return ss.kind === 'strength' && s.focus === 'arms' ? `${parseInt(ss.time, 10) + FINISHERS[key].minutes} min` : ss.time; }
function currentWeek() { const s = S(); return s.start ? weekNumber(s.start, dateKey()) : 1; }
function clampWeek(w) { return Math.min(Math.max(w, 1), WEEKS); }

function sessionMeta(p) {
  if (p.kind === 'strength') {
    const base = p.moves.filter((m) => !m.finisher).length;
    return [p.finisher ? `${parseInt(p.time, 10) + p.finisher.minutes} min` : p.time, p.finisher ? `${base} moves + arm finisher` : `${base} moves`, `${p.phase.sets} sets each${p.phase.mainSets ? ', 4 on the first two' : ''}`];
  }
  if (p.kind === 'engine') return [p.time, `${p.engine.minutes} min every minute on the minute`];
  if (p.kind === 'deck') return [p.time, `${p.deck.cards} cards`];
  if (p.kind === 'mobility') return [p.time, '20 min walk + 7 stretches'];
  if (p.kind === 'walk') return [p.time, 'Optional'];
  return [];
}

function entrySummaryLine(e) {
  const bits = [minutesLabel((e.endedAt - e.startedAt) / 1000)];
  if (e.moves) { const reps = e.moves.filter((m) => m.unit === 'reps').reduce((a, m) => a + m.sets.reduce((x, y) => x + y, 0), 0); if (reps) bits.push(`${reps} reps`); }
  if (e.deck) bits.push(`${e.deck.cards} cards`);
  if (e.engine) bits.push(`${e.engine.rounds} rounds`);
  return bits.join(' · ');
}

// ---- the body of a session, used by Today and by the day preview ----
function sessionBody(p, { full = false } = {}) {
  const s = S();
  if (p.kind === 'strength') {
    const li = (m, i) => `
      <li><span class="no">${i + 1}</span><span class="nm">${esc(m.name)}${m.level !== s.level ? ` <span class="lvl">${esc(LEVELS[m.level].name)}</span>` : ''}</span>
      <span class="ds">${m.sets} × ${esc(m.dose.reps)}</span>
      ${m.dose.weight ? `<span class="kt">${esc(kitText(m.dose.weight, s.units))}</span>` : ''}
      ${full ? `<span class="how">${esc(m.how)}${m.grip ? ` <b>Thick grip:</b> wrap a hand towel around the handle.` : ''}</span>` : ''}</li>`;
    const moves = p.moves.filter((m) => !m.finisher).map(li).join('');
    const fin = p.moves.filter((m) => m.finisher);
    const finBlock = fin.length ? `<div class="section">${secH(`Arm finisher · ${p.finisher.minutes} min`, esc(p.finisher.focus), 'h3')}<ol class="moves">${fin.map((m, j) => li(m, j)).join('')}</ol>
      ${full && fin.some((m) => m.grip) ? `<p class="fine">${esc(GRIP_TIP)}</p>` : ''}</div>` : '';
    return `
      ${full ? `<div class="section">${secH(`Warm-up · ${WARMUP.minutes} min`, '', 'h3')}<ul class="bulleted">${WARMUP.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      <div class="section">${secH(full ? 'Main work' : 'The work', full ? `Leave ${p.phase.rir} in the tank` : `${p.phase.sets} sets each`, 'h3')}<ol class="moves">${moves}</ol>
      <p class="fine">${full ? esc(REST_NOTE) : `Warm-up ${WARMUP.minutes} min first, cool-down ${COOLDOWN.minutes} min after. ${esc(REST_NOTE)}`}</p></div>
      ${finBlock}
      ${full ? `<div class="section">${secH(`Cool-down · ${COOLDOWN.minutes} min`, '', 'h3')}<ul class="bulleted">${COOLDOWN.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}`;
  }
  if (p.kind === 'engine') {
    const e = p.engine;
    return `
      ${full ? `<div class="section">${secH(`Warm-up · ${ENGINE.warmup.minutes} min`, '', 'h3')}<ul class="bulleted">${ENGINE.warmup.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      <div class="section">${secH(`EMOM · ${e.minutes} min`, 'Every minute on the minute', 'h3')}
      <ol class="moves">
        <li><span class="no">1</span><span class="nm">Odd minutes: ${esc(e.odd.name.toLowerCase())}</span><span class="ds">${e.odd.reps} reps</span>${full ? `<span class="how">${esc(e.odd.how)}</span>` : ''}</li>
        <li><span class="no">2</span><span class="nm">Even minutes: ${esc(e.even.name.toLowerCase())}</span><span class="ds">${e.even.reps} total</span>${full ? `<span class="how">${esc(e.even.how)}</span>` : ''}</li>
        <li><span class="no">3</span><span class="nm">Finisher: ${esc(e.finisher.name.toLowerCase())}</span><span class="ds">${e.finisher.seconds} s</span>${full ? `<span class="how">${esc(e.finisher.how)}</span>` : ''}</li>
      </ol><p class="fine">${esc(ENGINE.rule)}</p></div>`;
  }
  if (p.kind === 'deck') {
    return `<div class="section">${secH('The drill', `${p.deck.cards} cards`, 'h3')}
      <ul class="suitlist">${DECK.suits.map((su) => `<li>${suitSvg(su.id, 'suit' + (su.red ? ' red' : ''))}<span>${esc(su.name)}</span><span class="muted">${esc(su.move)}${su.id === 'C' && p.deck.halfBurpees ? ' (half)' : ''}</span></li>`).join('')}
      ${p.deck.jokers ? `<li><span class="stencil" aria-hidden="true">J</span><span>Jokers</span><span class="muted">1 min plank</span></li>` : ''}</ul>
      <p class="fine">${esc(DECK.values)} ${esc(p.deck.text)} ${esc(DECK.rule)}</p></div>`;
  }
  if (p.kind === 'mobility') {
    return `<div class="section">${secH('Walk, then stretch', MOBILITY.note, 'h3')}
      <ul class="bulleted"><li>${esc(MOBILITY.walk.text)}</li>${MOBILITY.stretches.map((x) => `<li>${esc(x.name)}${x.side ? `, ${esc(x.side.toLowerCase())}` : ''} · ${x.seconds} s</li>`).join('')}</ul></div>`;
  }
  if (p.kind === 'walk') return `<div class="section"><p class="copy">${esc(WALK.text)}</p></div>`;
  return `<div class="section"><p class="copy">${esc(OFF.text)}</p></div>`;
}

// ================= TODAY =================
function weekbar(w) {
  const cells = Array.from({ length: WEEKS }, (_, i) => `<li class="${i + 1 < w ? 'past' : i + 1 === w ? 'now' : ''}"></li>`).join('');
  const legend = PHASES.map((p) => `<span style="grid-column: span ${p.weeks.length}">${esc(p.name)}</span>`).join('');
  return `<ol class="weekbar" aria-label="Week ${w} of ${WEEKS}">${cells}</ol><div class="weekbar-legend" style="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:3px" aria-hidden="true">${legend}</div>`;
}

function trainWhen(isToday) {
  const s = S();
  if (!isToday) return '';
  const [h, m] = s.trainAt.split(':').map(Number);
  const now = new Date(), at = new Date(); at.setHours(h, m, 0, 0);
  const mins = Math.round((at - now) / 60000);
  let rel = '';
  if (mins > 0 && mins < 600) rel = mins >= 60 ? ` · in ${Math.floor(mins / 60)} h ${mins % 60} min` : ` · in ${mins} min`;
  return `<p class="when"><span class="dot" aria-hidden="true"></span>${esc(timeLabel(s.trainAt))}, before lunch${rel}</p>`;
}

function heroFor(p, slot, isToday) {
  const s = S();
  const entry = entryForSlot(D().history, slot, p.key);
  const long = p.name.length > 7 ? ' long' : '';
  const meta = esc(sessionMeta(p).join(' · '));
  if (p.kind === 'off') {
    return `<section class="hero"><p class="when">${isToday ? 'Today' : esc(longDate(slot))}</p><h2>Rest</h2><p class="title">${esc(p.title)}</p>${sessionBody(p).replace('class="section"', 'class="section" style="padding:0;margin-top:12px"')}</section>`;
  }
  if (entry) {
    return `<section class="hero done">${trainWhen(false)}<h2 class="${long.trim()}">${esc(p.name)}</h2><p class="title">${esc(p.title)}</p>
      <div class="stamp">${tick}<span>DONE</span></div>
      <p class="meta"><span>${esc(entrySummaryLine(entry))}</span></p>
      <div class="btnrow" style="margin-top:18px"><button type="button" class="btn" data-act="open-entry" data-id="${esc(entry.id)}">See the record</button></div></section>`;
  }
  return `<section class="hero">${trainWhen(isToday)}<h2 class="${long.trim()}">${esc(p.name)}</h2><p class="title">${esc(p.title)}</p>
    <p class="meta">${meta}</p>
    <button type="button" class="btn primary big" data-act="start" data-week="${p.week}" data-day="${p.day}" data-slot="${slot}">Start ${esc(p.kind === 'walk' ? 'the walk' : p.name)}${icon.arrow}</button></section>`;
}

function activeNotice() {
  const a = store.active();
  if (!a) return '';
  return `<div class="notice"><div><b>${esc(a.title)} is still running</b><p>Started ${esc(new Date(a.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))}. Pick up where you left off.</p></div>
    <button type="button" class="btn primary" data-act="resume">Resume</button></div>`;
}

function testNotice(w) {
  const t = D().test;
  const slot = w === 1 && !t.w1 ? 'w1' : w === 8 && !t.w8 ? 'w8' : null;
  if (!slot) return '';
  return `<div class="notice"><div><b>PT test due</b><p>${w === 1 ? 'Day one of week 1: take it before your first session.' : 'Week 8: retest on day one and see what changed.'}</p></div>
    <button type="button" class="btn" data-act="start-test" data-slot="${slot}">Take it</button></div>`;
}

function weighNotice(today) {
  const s = S();
  if (s.hide.weighins) return '';
  const mon = mondayOf(today);
  if (D().weighins.some((x) => x.date >= mon)) return '';
  return `<div class="section">${secH('Weekly weigh-in', 'Not logged this week', 'h3')}
    <div class="rows" style="border-top:0"><button type="button" class="row" data-act="weigh"><span><span class="t">Log this week’s weight</span><span class="s">Aim for +¼ to ½ lb a week</span></span><span class="v">${chev}</span></button></div></div>`;
}

function upcoming(today) {
  const s = S();
  const rows = [];
  for (let i = 1; i <= 3; i++) {
    const k = addDays(today, i), w = weekNumber(s.start, k);
    if (w < 1 || w > WEEKS) continue;
    const key = sessionKeyFor(s, dayIndex(k)), ss = SESSIONS[key];
    rows.push(`<button type="button" class="row dayrow" data-act="day" data-week="${w}" data-day="${dayIndex(k)}">
      <span class="t"><span class="d">${esc(DAY_SHORT[dayIndex(k)])}</span><span>${esc(ss.kind === 'off' ? 'Rest' : ss.name)}<span class="s">${esc(ss.kind === 'off' ? 'Rest day' : `${ss.title}${ss.time ? ' · ' + dayTime(s, key) : ''}`)}</span></span></span>
      <span class="v">${chev}</span></button>`);
  }
  if (!rows.length) return '';
  return `<div class="section upnext">${secH('Coming up', '', 'h3')}<div class="rows" style="border-top:0">${rows.join('')}</div></div>`;
}

function welcome() {
  const s = S();
  const today = dateKey();
  const thisMon = mondayOf(today), nextMon = addDays(thisMon, 7);
  return `<div class="welcome" style="padding-top:calc(var(--safe-top) + 18px)">
    <p class="wordmark">BARRACKS PT</p>
    <h1 data-titlemark>Eight weeks.<br>Two pairs of dumbbells.</h1>
    <p class="intro">A home strength plan for getting bigger and stronger with almost no gear. Three strength days do the building; the conditioning days keep it military.</p>
    <ul class="kitlist"><li><b>Kit</b><span>${esc(KIT.weights)}</span></li><li><b>Also</b><span>${esc(KIT.also)}</span></li><li><b>Time</b><span>${esc(KIT.time)}</span></li></ul>
    <form id="setup" data-submit="setup" novalidate>
      <div class="field"><div class="lab">How many days a week?</div>
        <fieldset class="seg"><legend class="vh">Schedule</legend>${Object.entries(SCHEDULES).map(([k, v]) => `<label><input type="radio" name="schedule" value="${k}" ${s.schedule === k ? 'checked' : ''} data-change="setup-preview">${esc(v.label)}</label>`).join('')}</fieldset>
        <p class="help" id="setup-note">${esc(SCHEDULES[s.schedule].note)}</p></div>
      <div class="field"><div class="lab">Your level</div>
        <fieldset class="seg"><legend class="vh">Level</legend>${LEVELS.map((l) => `<label><input type="radio" name="level" value="${l.id}" ${s.level === l.id ? 'checked' : ''} data-change="setup-preview">${esc(l.name)}</label>`).join('')}</fieldset>
        <p class="help" id="setup-level">${esc(LEVELS[s.level].example)}. You can change it any time.</p></div>
      <div class="field"><div class="lab">Focus</div>
        <fieldset class="seg"><legend class="vh">Focus</legend>${Object.entries(FOCUS).map(([k, v]) => `<label><input type="radio" name="focus" value="${k}" ${s.focus === k ? 'checked' : ''} data-change="setup-preview">${esc(v.label)}</label>`).join('')}</fieldset>
        <p class="help" id="setup-focus">${esc(FOCUS[s.focus].text)}</p></div>
      <div class="field"><div class="lab">Week 1 starts</div>
        <fieldset class="seg"><legend class="vh">Start</legend>
          <label><input type="radio" name="startPick" value="${thisMon}" checked>This week<br><small class="muted">${esc(dayMonth(thisMon))}</small></label>
          <label><input type="radio" name="startPick" value="${nextMon}">Next week<br><small class="muted">${esc(dayMonth(nextMon))}</small></label>
        </fieldset>
        <p class="help">Weeks run Monday to Sunday. The app works out which week you’re in, so you never pick it by hand.</p></div>
      <div class="field"><div class="lab"><label for="setup-time">Training time</label><small>Before lunch</small></div>
        <input class="input" type="time" id="setup-time" name="trainAt" value="${esc(s.trainAt)}" required></div>
      <button type="submit" class="btn primary big" style="margin-top:22px">Begin${icon.arrow}</button>
      <p class="fine">${esc(SAFETY)}</p>
    </form></div>`;
}

function todayView() {
  const s = S();
  if (!s.setup || !s.start) return welcome();
  const today = dateKey(), w = weekNumber(s.start, today), di = dayIndex(today);
  const head = (wk, line) => `${navbar(shortDate(today))}
    <div class="today-head" data-titlemark><p class="dateline">${esc(longDate(today))}</p>
    <div class="weekline"><span class="wk-num" aria-hidden="true">${pad2(clampWeek(wk))}</span><div><b>${line}</b><span>${esc(subLine(wk))}</span></div></div>
    ${weekbar(wk)}</div>`;
  function subLine(wk) { const ph = phaseFor(clampWeek(wk)); return `${ph.name} phase · ${ph.sets} sets, ${ph.rir} in the tank`; }

  if (w < 1) {
    const p = buildSession(s, 1, 0);
    return `${navbar(shortDate(today))}<div class="today-head" data-titlemark><p class="dateline">${esc(longDate(today))}</p></div>
      ${activeNotice()}
      <section class="hero"><p class="when">Week 1 starts ${esc(longDate(mondayOf(s.start)))}</p><h2>${daysBetween(today, mondayOf(s.start))} ${daysBetween(today, mondayOf(s.start)) === 1 ? 'day' : 'days'}</h2>
      <p class="title">until ${esc(p.name)}, ${esc(p.title.toLowerCase())}</p>
      <p class="copy muted">Use the time to read how each move works, and take the PT test on day one.</p>
      <div class="btnrow" style="margin-top:20px"><button type="button" class="btn" data-act="day" data-week="1" data-day="0">Preview day one</button><button type="button" class="btn quiet" data-act="go-settings">Change start</button></div></section>`;
  }
  if (w > WEEKS) {
    const t = D().test;
    return `${navbar(shortDate(today))}<div class="today-head" data-titlemark><p class="dateline">${esc(longDate(today))}</p></div>
      ${activeNotice()}
      <section class="hero"><p class="when">All ${WEEKS} weeks are behind you</p><h2>Done.</h2><p class="title">Eight weeks of Barracks PT.</p>
      <p class="copy muted">${t.w8 ? 'Your retest is in Progress.' : 'Take the week 8 retest if you haven’t, then'} plan the next 8 weeks a level up.</p>
      <div class="stack" style="display:grid;gap:10px;margin-top:20px">
        ${!t.w8 ? '<button type="button" class="btn" data-act="start-test" data-slot="w8">Take the retest</button>' : ''}
        <button type="button" class="btn primary big" data-act="next-cycle">Start the next 8 weeks${icon.arrow}</button></div></section>`;
  }
  const p = buildSession(s, w, di);
  return `${head(w, `Week ${w} of ${WEEKS}`)}
    ${activeNotice()}${testNotice(w)}
    ${heroFor(p, today, true)}
    ${p.kind !== 'off' && !entryForSlot(D().history, today, p.key) ? sessionBody(p) : ''}
    ${upcoming(today)}
    ${weighNotice(today)}`;
}

on('start', (d) => {
  const s = S();
  startSession(buildSession(s, +d.week, +d.day), d.slot);
});
on('resume', () => resumeSession());
on('start-test', (d) => startSession({ kind: 'test', slot: d.slot }, dateKey()));
on('next-cycle', async () => {
  const s = S();
  const up = Math.min(s.level + 1, 2);
  const today = dateKey();
  const start = dayIndex(today) === 0 ? today : addDays(mondayOf(today), 7);
  const ok = await confirmSheet({ title: 'Start the next 8 weeks?', body: `Week 1 starts ${esc(longDate(start))}${up !== s.level ? `, at ${esc(LEVELS[up].name)} level` : ''}. Your history stays, and this round’s test scores are kept as last round’s.`, yes: 'Start the next round' });
  if (!ok) return;
  store.newRound();
  store.saveSettings({ start, level: up, moveLevel: {} });
  refresh(); toast('New round set. Same time, same place.');
});
on('go-settings', () => { showTab('more'); push('settings'); });

on('setup-preview', (_, el) => {
  const f = el.form;
  const sch = f.schedule.value, lv = +f.level.value;
  f.querySelector('#setup-note').textContent = SCHEDULES[sch].note;
  f.querySelector('#setup-level').textContent = `${LEVELS[lv].example}. You can change it any time.`;
  f.querySelector('#setup-focus').textContent = FOCUS[f.focus.value].text;
});
on('setup', (_, f) => {
  const t = f.trainAt.value || '11:20';
  store.saveSettings({ setup: true, schedule: f.schedule.value, level: +f.level.value, focus: f.focus.value, start: f.startPick.value, trainAt: t });
  syncShell();
  refresh();
  top('today').el.scrollTop = 0;
  toast('Week 1 is set. See you at ' + timeLabel(t) + '.');
});

// ================= PLAN =================
function planView(params) {
  const s = S();
  const today = dateKey(), cw = currentWeek();
  const sel = clampWeek(params.week || cw);
  const hist = D().history;
  const keys = DAY_SHORT.map((_, d) => sessionKeyFor(s, d));
  const head = `<thead><tr><th class="wk" scope="col"><span class="vh">Week</span></th>${DAY_SHORT.map((d) => `<th scope="col">${d.slice(0, 1)}<span class="vh">${d.slice(1)}</span></th>`).join('')}</tr></thead>`;
  let body = '', lastPhase = '';
  for (let w = 1; w <= WEEKS; w++) {
    const ph = phaseFor(w);
    if (ph.name !== lastPhase) { body += `<tr class="phase-band"><td colspan="8">${esc(ph.name)}</td></tr>`; lastPhase = ph.name; }
    let cells = '';
    for (let d = 0; d < 7; d++) {
      const key = sessionKeyFor(s, d), ss = SESSIONS[key], slot = slotDate(s.start, w, d);
      const done = !!entryForSlot(hist, slot, key);
      const cls = ['cell'];
      if (key === 'off') cls.push('rest');
      if (ss.optional || ss.easy) cls.push('opt');
      if (done) cls.push('done');
      else if (slot < today && isRequired(key)) cls.push('missed');
      if (slot === today) cls.push('today');
      const label = `Week ${w}, ${DAY_LONG[d]}: ${ss.kind === 'off' ? 'rest' : ss.name}${done ? ', done' : cls.includes('missed') ? ', missed' : ''}${slot === today ? ', today' : ''}`;
      cells += `<td><button type="button" class="${cls.join(' ')}" data-act="day" data-week="${w}" data-day="${d}" aria-label="${esc(label)}">${LETTER[key]}</button></td>`;
    }
    body += `<tr class="${w === sel ? 'sel' : ''}"><td class="wk"><button type="button" class="wkbtn" data-act="plan-week" data-week="${w}" aria-pressed="${w === sel}" aria-label="Show week ${w}"><b>${w}</b>${w === cw ? '<small>now</small>' : ''}</button></td>${cells}</tr>`;
  }
  const ph = phaseFor(sel);
  const tally = weekTally(hist, s, sel);
  const dayRows = DAY_SHORT.map((dn, d) => {
    const key = sessionKeyFor(s, d), ss = SESSIONS[key], slot = slotDate(s.start, sel, d);
    const done = entryForSlot(hist, slot, key);
    const isT = slot === today;
    const tag = done ? `<span class="tag ok">${tick} Done</span>` : isT ? '<span class="tag now">Today</span>' : (slot < today && isRequired(key)) ? '<span class="tag">Missed</span>' : ss.optional ? '<span class="tag">Optional</span>' : ss.easy ? '<span class="tag">Easy day</span>' : '';
    return `<button type="button" class="row dayrow${isT ? ' is-today' : ''}" data-act="day" data-week="${sel}" data-day="${d}">
      <span class="t"><span class="d">${dn}</span><span>${esc(ss.kind === 'off' ? 'Rest' : ss.name)}<span class="s">${esc(ss.kind === 'off' ? 'Rest day' : `${ss.title}${ss.time ? ' · ' + dayTime(s, key) : ''}`)}</span></span></span>
      <span class="v">${tag}${chev}</span></button>`;
  }).join('');
  return `${navbar('Plan')}
    ${largeTitle('Plan', `${esc(SCHEDULES[s.schedule].label)} a week · ${esc(LEVELS[s.level].name)} · <button type="button" class="linkbtn" style="padding:0;min-height:0" data-act="go-settings">Change</button>`)}
    <div class="section" style="margin-top:4px">${secH('Eight weeks', cw >= 1 && cw <= WEEKS ? `You’re in week ${cw}` : '')}
      <table class="roster">${head}<tbody>${body}</tbody></table>
      <div class="legend"><span><i class="d"></i>Done</span><span><i class="t"></i>Today</span><span><i class="m"></i>Missed</span>${keys.some((k) => SESSIONS[k].optional || SESSIONS[k].easy) ? '<span><i style="border-style:dashed"></i>Easy day</span>' : ''}</div>
      <p class="fine">${[...new Set(keys)].filter((k) => k !== 'off').map((k) => `${LETTER[k]} ${SESSIONS[k].name}`).join(' · ')}. Tap a day to open it, or a week number to list that week below.</p></div>
    <div class="section">${secH(`Week ${sel} · ${ph.name}`, `${tally.got} of ${tally.need} done`)}
      <p class="lead">${esc(ph.text)}</p>
      <div class="rows" style="margin-top:10px">${dayRows}</div>
      <p class="fine">${esc(SCHEDULES[s.schedule].note)}</p></div>`;
}
on('plan-week', (d) => { const v = top('plan'); v.params.week = +d.week; draw(v); });
on('day', (d) => push('day', { week: +d.week, day: +d.day }));
on('back', () => pop());

function dayView({ week, day }) {
  const s = S();
  const p = buildSession(s, week, day);
  const slot = slotDate(s.start, week, day), today = dateKey();
  const entry = entryForSlot(D().history, slot, p.key);
  const back = nav.tab === 'today' ? 'Today' : 'Plan';
  const when = slot === today ? 'Today' : longDate(slot);
  let foot = '';
  if (p.kind !== 'off') {
    if (entry) foot = `<div class="bottombar"><p class="muted" style="font-size:15px;margin-bottom:10px">${tick} Done ${esc(shortDate(entry.date))} · ${esc(entrySummaryLine(entry))}</p>
      <div class="btnrow"><button type="button" class="btn" data-act="open-entry" data-id="${esc(entry.id)}">See the record</button><button type="button" class="btn quiet" data-act="start" data-week="${week}" data-day="${day}" data-slot="${slot}">Do it again</button></div></div>`;
    else foot = `<div class="bottombar"><button type="button" class="btn primary big" data-act="start" data-week="${week}" data-day="${day}" data-slot="${slot}">Start ${esc(p.kind === 'walk' ? 'the walk' : p.name)}${icon.arrow}</button>
      ${slot !== today ? `<p class="fine" style="margin-top:8px">It counts for ${esc(DAY_LONG[day])} of week ${week}.</p>` : ''}</div>`;
  }
  return `${navbar(`${DAY_SHORT[day]} · Week ${week}`, { back })}
    <div class="preview-head" data-titlemark><p class="muted" style="font-size:15px;margin-bottom:10px">${esc(when)} · Week ${week} · ${esc(p.phase.name)}</p>
    <h1>${esc(p.kind === 'off' ? 'Rest' : p.name)}</h1><p class="title">${esc(p.title)}</p>
    <p class="meta">${sessionMeta(p).map(esc).join(' · ')}</p></div>
    ${p.kind === 'strength' ? `<div class="section"><p class="lead" style="margin:0">${esc(p.phase.text)}</p></div>` : ''}
    ${sessionBody(p, { full: true })}
    ${foot}`;
}

// ================= PROGRESS =================
function lastNWeighins(n) { const w = D().weighins; return w.slice(Math.max(0, w.length - n)); }

function weightChart(points, units) {
  if (points.length < 2) return '';
  const conv = (lb) => (units === 'kg' ? lb * 0.45359237 : lb);
  const vals = points.map((p) => conv(p.lb));
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 2) { const mid = (hi + lo) / 2; lo = mid - 1; hi = mid + 1; }
  const W = 340, H = 150, padL = 34, padR = 10, padT = 12, padB = 24;
  const x = (i) => padL + (i * (W - padL - padR)) / (points.length - 1);
  const y = (v) => padT + ((hi - v) * (H - padT - padB)) / (hi - lo);
  const ticks = [lo, (lo + hi) / 2, hi];
  const path = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Weight over the last ${points.length} weigh-ins, from ${vals[0].toFixed(1)} to ${vals[vals.length - 1].toFixed(1)} ${units}">
    ${ticks.map((t) => `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text x="0" y="${(y(t) + 4).toFixed(1)}">${t.toFixed(1)}</text>`).join('')}
    <path class="ln" d="${path}" vector-effect="non-scaling-stroke"/>
    ${vals.map((v, i) => `<circle class="pt${i === vals.length - 1 ? ' last' : ''}" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.5" vector-effect="non-scaling-stroke"/>`).join('')}
    <text x="${padL}" y="${H - 6}">${esc(dayMonth(points[0].date))}</text><text x="${W - padR}" y="${H - 6}" text-anchor="end">${esc(dayMonth(points[points.length - 1].date))}</text>
  </svg>`;
}

function progressView() {
  const s = S(), d = D(), today = dateKey();
  const cw = clampWeek(currentWeek());
  const st = streak(d.history, s, today);
  const tally = s.start ? weekTally(d.history, s, cw) : { got: 0, need: 0 };
  const t = d.test;
  const testRows = TEST.events.map((ev) => {
    const a = t.w1?.[ev.id], b = t.w8?.[ev.id];
    let ch = '–';
    if (a != null && b != null && a > 0) { const pc = Math.round(((b - a) / a) * 100); ch = `<span class="${pc > 0 ? 'up' : ''}">${pc > 0 ? '+' : ''}${pc}%</span>`; }
    const unit = ev.unit === 'sec' ? ' s' : '';
    return `<tr><td>${esc(ev.name)}<small>${ev.limit ? (ev.limit >= 120 ? '2 min' : '1 min') : 'Hold'}</small></td><td>${a != null ? a + unit : '–'}</td><td>${b != null ? b + unit : '–'}</td><td>${ch}</td></tr>`;
  }).join('');
  // The test is offered when it's due: week 1 until it's done, then from week 8.
  const due = !t.w1 ? 'w1' : (cw >= WEEKS || currentWeek() > WEEKS) ? 'w8' : null;
  const testBtn = `<div class="btnrow" style="margin-top:14px">${due ? `<button type="button" class="btn primary" data-act="start-test" data-slot="${due}">${due === 'w1' ? 'Take the test' : t.w8 ? 'Retake it' : 'Take the retest'}</button>` : ''}<button type="button" class="btn quiet" data-act="test-edit">Enter by hand</button></div>`;

  let weigh = '';
  if (!s.hide.weighins) {
    const pts = lastNWeighins(10), last = pts[pts.length - 1], prev = pts[pts.length - 2];
    let now = '<p class="empty">No weigh-ins yet. Once a week, same time of day, is plenty.</p>';
    if (last) {
      const diff = prev ? last.lb - prev.lb : null;
      const diffTxt = diff == null ? 'First weigh-in' : `${diff >= 0 ? '+' : '−'}${weightText(Math.abs(diff), s.units)} since ${dayMonth(prev.date)}`;
      now = `<div class="weightnow"><b>${esc(weightText(last.lb, s.units))}</b><span>${esc(diffTxt)}</span></div>${weightChart(pts, s.units)}`;
    }
    const list = d.weighins.slice(-6).reverse().map((x) => `<button type="button" class="row" data-act="weigh-edit" data-date="${x.date}"><span class="t">${esc(shortDate(x.date))}</span><span class="v">${esc(weightText(x.lb, s.units))}${chev}</span></button>`).join('');
    weigh = `<div class="section">${secH('Weigh-ins', 'Aim +¼ to ½ lb a week')}${now}
      <div class="btnrow" style="margin-top:14px"><button type="button" class="btn primary" data-act="weigh">Log weight</button></div>
      ${list ? `<div class="rows" style="margin-top:16px">${list}</div>` : ''}
      <p class="fine">Flat for 2 weeks? Eat a bit more.</p></div>`;
  }

  const hist = d.history.slice().reverse();
  const histRows = hist.slice(0, 30).map((e) => `<button type="button" class="row" data-act="open-entry" data-id="${esc(e.id)}"><span><span class="t">${esc(e.name)}<span class="s">${esc(shortDate(e.date))} · ${esc(entrySummaryLine(e))}</span></span></span><span class="v">${chev}</span></button>`).join('');

  return `${navbar('Progress')}${largeTitle('Progress')}
    <div class="section" style="margin-top:0"><div class="stats">
      <div class="stat"><b>${pad2(st)}</b><span>in a row</span></div>
      <div class="stat"><b>${tally.got}</b><span>of ${tally.need} this week</span></div>
      <div class="stat"><b>${pad2(d.history.length)}</b><span>sessions in all</span></div></div>
      <p class="fine">The streak counts training days done in a row. Rest, mobility and walk days never break it.</p></div>
    <div class="section">${secH('PT test')}
      <table class="ttable"><thead><tr><th scope="col">Event</th><th scope="col">Week 1</th><th scope="col">Week 8</th><th scope="col">Change</th></tr></thead><tbody>${testRows}</tbody></table>
      ${testBtn}<p class="fine">${esc(TEST.when)}${t.last ? ` Last round: ${TEST.events.map((ev) => `${ev.name.toLowerCase()} ${t.last.w1?.[ev.id] ?? '–'} → ${t.last.w8?.[ev.id] ?? '–'}${ev.unit === 'sec' ? ' s' : ''}`).join(', ')}.` : ''}</p></div>
    ${weigh}
    <div class="section">${secH('History', hist.length ? `${hist.length} logged` : '')}
      ${histRows ? `<div class="rows" style="border-top:0">${histRows}</div>` : '<p class="empty">Finished sessions land here, with every set you logged.</p>'}</div>`;
}

on('weigh', async () => {
  const s = S(), today = dateKey();
  const last = D().weighins[D().weighins.length - 1];
  const val = last ? (s.units === 'kg' ? (last.lb * 0.45359237).toFixed(1) : last.lb.toFixed(1)) : '';
  await openSheet(`<h2 id="sheet-title">Weigh-in</h2><p class="sub">Same time of day each week, before you eat, is the fairest number.</p>
    <form data-submit="weigh-save" novalidate class="stack">
      <div class="inline-inputs"><label class="vh" for="wt">Weight in ${s.units}</label><input class="input" id="wt" name="wt" inputmode="decimal" placeholder="${s.units === 'kg' ? '68.5' : '151.0'}" value="${esc(val)}" autocomplete="off"><span class="muted">${s.units}</span></div>
      <label class="vh" for="wd">Date</label><input class="input" type="date" id="wd" name="wd" value="${today}" max="${today}">
      <p class="err" id="wt-err" hidden></p>
      <button type="submit" class="btn primary wide">Save</button>
      <button type="button" class="btn quiet wide" data-act="sheet" data-v="no">Cancel</button></form>`);
});
on('weigh-save', (_, f) => {
  const s = S();
  const v = parseFloat(String(f.wt.value).replace(',', '.'));
  const err = f.querySelector('#wt-err');
  const lb = s.units === 'kg' ? v / 0.45359237 : v;
  if (!isFinite(v) || lb < 60 || lb > 600) { err.textContent = `Enter your weight in ${s.units}, like ${s.units === 'kg' ? '68.5' : '151.0'}.`; err.hidden = false; f.wt.focus(); return; }
  if (!f.wd.value || f.wd.value > dateKey()) { err.textContent = 'Pick today or an earlier date.'; err.hidden = false; return; }
  store.addWeighin(f.wd.value, lb);
  closeSheet('saved'); refresh(); toast('Weight saved');
});
on('weigh-edit', async (d) => {
  const s = S(), w = D().weighins.find((x) => x.date === d.date);
  if (!w) return;
  const ok = await confirmSheet({ title: weightText(w.lb, s.units), body: `Logged for ${esc(longDate(w.date))}.`, yes: 'Delete this weigh-in', no: 'Keep it', danger: true });
  if (ok) { store.removeWeighin(d.date); refresh(); toast('Weigh-in deleted'); }
});
on('test-edit', async () => {
  const t = D().test;
  const field = (slot, ev) => `<label class="vh" for="${slot}-${ev.id}">${esc(ev.name)}, ${slot === 'w1' ? 'week 1' : 'week 8'}</label><input class="input" id="${slot}-${ev.id}" name="${slot}-${ev.id}" inputmode="numeric" value="${t[slot]?.[ev.id] ?? ''}" placeholder="–">`;
  await openSheet(`<h2 id="sheet-title">PT test scores</h2><p class="sub">Type in results you took without the app. Leave a box empty to clear it.</p>
    <form data-submit="test-save" novalidate>
      <table class="ttable"><thead><tr><th>Event</th><th>Week 1</th><th>Week 8</th></tr></thead><tbody>
      ${TEST.events.map((ev) => `<tr><td>${esc(ev.name)}<small>${ev.unit === 'sec' ? 'seconds' : 'reps'}</small></td><td style="padding-left:8px">${field('w1', ev)}</td><td style="padding-left:8px">${field('w8', ev)}</td></tr>`).join('')}
      </tbody></table>
      <div class="stack"><button type="submit" class="btn primary wide">Save scores</button><button type="button" class="btn quiet wide" data-act="sheet" data-v="no">Cancel</button></div></form>`);
});
on('test-save', (_, f) => {
  for (const slot of ['w1', 'w8']) {
    const r = {}; let any = false;
    for (const ev of TEST.events) {
      const raw = String(f[`${slot}-${ev.id}`].value).replace(/[^0-9]/g, '');
      if (raw !== '') { r[ev.id] = Math.min(+raw, 9999); any = true; }
    }
    // The boxes are the whole record: an emptied box clears that score.
    store.saveTest(slot, any ? { ...r, date: D().test[slot]?.date || dateKey() } : null);
  }
  closeSheet('saved'); refresh(); toast('Scores saved');
});

on('open-entry', (d) => push('entry', { id: d.id }));

function entryView({ id }) {
  const e = D().history.find((x) => x.id === id);
  const back = nav.tab === 'today' ? 'Today' : nav.tab === 'plan' ? 'Back' : 'Progress';
  if (!e) return `${navbar('Session', { back, always: true })}<div class="section"><p class="empty">This session was deleted.</p></div>`;
  return `${navbar(e.name, { back })}
    <div class="preview-head" data-titlemark><p class="muted" style="font-size:15px;margin-bottom:10px">${esc(longDate(e.date))}${e.week ? ` · Week ${e.week}` : ''}</p><h1>${esc(e.name)}</h1><p class="title">${esc(e.title || '')}</p></div>
    <div class="section" style="margin-top:8px">${summaryHTML(e, { record: true })}</div>
    <div class="section"><button type="button" class="btn danger wide" data-act="entry-delete" data-id="${esc(e.id)}">Delete this session</button></div>`;
}
on('entry-delete', async (d) => {
  const ok = await confirmSheet({ title: 'Delete this session?', body: 'Its sets and times go for good, and the day shows as not done.', yes: 'Delete', no: 'Keep it', danger: true });
  if (!ok) return;
  store.removeHistory(d.id); pop(); refresh(); toast('Session deleted');
});
on('entry-note', (_, el) => store.updateHistory(el.dataset.id, { note: el.value.slice(0, 280) }));

// ================= MORE =================
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function moreView() {
  const s = S();
  const g = (id, t, sub) => `<button type="button" class="row" data-act="guide" data-id="${id}"><span><span class="t">${esc(t)}</span>${sub ? `<span class="s">${esc(sub)}</span>` : ''}</span><span class="v">${chev}</span></button>`;
  const install = !isStandalone() ? `<div class="notice" style="margin-top:6px"><div><b>Put it on your Home Screen</b><p>In Safari, tap Share, then Add to Home Screen. It opens full screen and works offline.</p></div></div>` : '';
  return `${navbar('More')}${largeTitle('More')}
    ${install}
    <div class="section" style="margin-top:${install ? 26 : 0}px">${secH('Guide')}<div class="rows" style="border-top:0">
      ${g('moves', 'How to do each move', s.focus === 'arms' ? 'Every variation, plus the arm finishers' : 'Every variation, by day')}
      ${g('time', 'Best time to train', `${timeLabel(s.trainAt)}, then lunch`)}
      ${g('sore', 'Not too sore', 'How the first weeks stay easy')}
      ${g('harder', 'Making it harder', 'When to move a level up')}
      ${s.hide.fuel ? '' : g('fuel', 'Fuel', 'Protein, calories, water')}
      ${s.hide.results ? '' : g('results', 'When to expect results', 'Week 1 to month 6')}
      ${g('engine', 'Echo · Engine intervals', 'How the EMOM works')}
      ${s.hide.deck ? '' : g('deck', 'Foxtrot · Deck of Cards', 'Suits, values and levels')}
      ${g('test', 'The PT test', 'Three events, weeks 1 and 8')}
      ${g('kit', 'Kit and safety', 'What you need, when to stop')}
    </div></div>
    <div class="section">${secH('App')}<div class="rows" style="border-top:0">
      <button type="button" class="row" data-act="go-settings"><span><span class="t">Settings</span><span class="s">${esc(SCHEDULES[s.schedule].label)} · ${esc(LEVELS[s.level].name)} · ${esc(timeLabel(s.trainAt))}</span></span><span class="v">${chev}</span></button>
    </div>
    <p class="fine">Barracks PT ${VERSION}. Everything you log stays on this phone${store.storageOK ? '' : '. <b class="sig">Saving is blocked on this device right now, so nothing will be kept.</b>'}</p></div>`;
}
on('guide', (d) => push('guide', { id: d.id }));

const largeTitleInline = (t) => `<h2 style="font:800 34px/1 var(--f-display)">${esc(t)}</h2>`;
function guideView({ id }) {
  const s = S();
  const L = s.level;
  const wrap = (title, inner) => `${navbar(title, { back: 'More' })}${largeTitle(title)}<div class="section" style="margin-top:0">${inner}</div>`;
  if (GUIDE[id]) {
    const g = GUIDE[id];
    return wrap(g.title, `${g.lead ? `<p class="lead" style="margin-top:0">${esc(g.lead)}</p>` : ''}<ol class="manual" style="border-top:2px solid var(--ink)">${g.lines(timeLabel(s.trainAt)).map((x) => `<li><span>${esc(x)}</span></li>`).join('')}</ol>
      ${id === 'sore' ? `<p class="callout">${esc(SAFETY)}</p>` : ''}`);
  }
  if (id === 'moves') {
    const day = (k) => {
      const ss = SESSIONS[k];
      return `<div class="section" style="padding:0">${secH(`${ss.name} · ${ss.title}`)}${ss.moves.map((m) => {
        const lv = Number.isInteger(s.moveLevel[m.id]) ? s.moveLevel[m.id] : L;
        return `<div class="guide-move"><h3>${esc(m.n[lv])}</h3><p>${esc(m.h)}</p>
        <table class="lvltable">${LEVELS.map((l) => `<tr class="${l.id === lv ? 'mine' : ''}"><td>${esc(l.name)}</td><td>${esc(m.n[l.id])}</td><td>${esc(m.d[l.id])}</td></tr>`).join('')}</table></div>`;
      }).join('')}</div>`;
    };
    const fin = (k) => {
      const f = FINISHERS[k], ss = SESSIONS[k];
      return `<div class="section" style="padding:0">${secH(`${ss.name} finisher · ${f.focus}`)}${f.moves.map((m) => {
        const lv = Number.isInteger(s.moveLevel[m.id]) ? s.moveLevel[m.id] : L;
        return `<div class="guide-move"><h3>${esc(m.n[lv])}</h3><p>${esc(m.h)}</p>
        <table class="lvltable">${LEVELS.map((l) => `<tr class="${l.id === lv ? 'mine' : ''}"><td>${esc(l.name)}</td><td>${esc(m.n[l.id])}</td><td>${esc(m.d[l.id])}</td></tr>`).join('')}</table></div>`;
      }).join('')}</div>`;
    };
    const arms = `<div style="height:34px"></div>${largeTitleInline('Arm finishers')}
      <p class="lead">${esc(FOCUS.arms.text)} ${s.focus === 'arms' ? 'It’s on.' : 'It’s off: turn it on in Settings under Focus.'}</p>
      <p class="callout">${esc(ARMS_LINE)}</p><p class="callout">${esc(GRIP_TIP)} Regular and Ranger.</p>
      <div style="height:20px"></div>${fin('A')}<div style="height:26px"></div>${fin('B')}<div style="height:26px"></div>${fin('C')}`;
    return wrap('How to do each move', `<p class="lead" style="margin-top:0">Your level is marked. “7s” and “15s” mean which pair of dumbbells to use; “/ leg” means each side.</p>${day('A')}<div style="height:26px"></div>${day('B')}<div style="height:26px"></div>${day('C')}${arms}`);
  }
  if (id === 'results') {
    return wrap('When to expect results', `<p class="lead" style="margin-top:0">${esc(RESULTS.intro)}</p>${s.focus === 'arms' ? `<p class="callout" style="margin:14px 0 18px">${esc(ARMS_RESULTS)}</p>` : ''}<ol class="timeline" style="border-top:2px solid var(--ink)">${RESULTS.steps.map((x) => `<li class="${x.key ? 'key' : ''}"><span class="w">${esc(x.when)}</span><p>${esc(x.text)}</p></li>`).join('')}</ol>`);
  }
  if (id === 'engine') {
    const e = buildSession(s, 1, 1).engine || null;
    const lines = ENGINE.minutes.map((m, i) => `<tr class="${i === L ? 'mine' : ''}"><td>${esc(LEVELS[i].name)}</td><td>${m} min · ${ENGINE.odd[i].reps} ${esc(ENGINE.odd[i].name.toLowerCase())} / ${ENGINE.even.reps[i]} climbers</td><td>${ENGINE.finisher.seconds[i]} s kicks</td></tr>`).join('');
    return wrap('Engine intervals', `<p class="lead" style="margin-top:0">Every minute on the minute. Odd minutes: ${L === 0 ? 'squat thrusts' : 'burpees'}. Even minutes: mountain climbers. Then a flutter-kick finisher.</p>
      <ol class="manual" style="border-top:2px solid var(--ink)"><li><span>${esc(ENGINE.odd[L].name)}: ${esc(ENGINE.odd[L].how)}</span></li><li><span>Mountain climbers: ${esc(ENGINE.even.how)}</span></li><li><span>Flutter kicks: ${esc(ENGINE.finisher.how)}</span></li><li><span>${esc(ENGINE.rule)}</span></li></ol>
      <table class="lvltable" style="margin-top:18px">${lines}</table>${e ? '' : ''}`);
  }
  if (id === 'deck') {
    return wrap('Deck of Cards', `<p class="lead" style="margin-top:0">The old barracks drill. ${esc(DECK.rule)}</p>
      <ul class="suitlist" style="border-top:2px solid var(--ink)">${DECK.suits.map((su) => `<li>${suitSvg(su.id, 'suit' + (su.red ? ' red' : ''))}<span>${esc(su.name)}</span><span class="muted">${esc(su.move)}</span></li>`).join('')}</ul>
      <ol class="manual"><li><span>${esc(DECK.values)}</span></li>${DECK.byLevel.map((x) => `<li><span>${esc(x)}</span></li>`).join('')}</ol>`);
  }
  if (id === 'test') {
    return wrap('The PT test', `<p class="lead" style="margin-top:0">${esc(TEST.when)}</p><ol class="manual" style="border-top:2px solid var(--ink)">${TEST.events.map((ev) => `<li><span><b>${esc(ev.name)}.</b> ${esc(ev.how)}</span></li>`).join('')}</ol>
      <div class="btnrow" style="margin-top:18px"><button type="button" class="btn" data-act="start-test" data-slot="${D().test.w1 ? 'w8' : 'w1'}">${D().test.w1 ? 'Take the week 8 retest' : 'Take the week 1 test'}</button></div>`);
  }
  if (id === 'kit') {
    return wrap('Kit and safety', `<ul class="kitlist"><li><b>Kit</b><span>${esc(KIT.weights)}</span></li><li><b>Also</b><span>${esc(KIT.also)}</span></li><li><b>Time</b><span>${esc(KIT.time)}</span></li></ul><p class="callout">${esc(SAFETY)}</p>`);
  }
  return wrap('Guide', '<p class="empty">That page isn’t here.</p>');
}

// ================= SETTINGS =================
function seg(name, opts, cur, act) {
  return `<fieldset class="seg"><legend class="vh">${esc(name)}</legend>${opts.map((o) => `<label><input type="radio" name="${name}" value="${o.v}" ${String(o.v) === String(cur) ? 'checked' : ''} data-change="${act}">${esc(o.l)}</label>`).join('')}</fieldset>`;
}
function sw(key, title, sub, checked) {
  return `<label class="switchrow"><span><span class="t">${esc(title)}</span>${sub ? `<span class="s">${esc(sub)}</span>` : ''}</span><input type="checkbox" class="toggle" data-change="set-toggle" data-key="${key}" ${checked ? 'checked' : ''}></label>`;
}
function settingsView() {
  const s = S();
  const today = dateKey(), w = s.start ? weekNumber(s.start, today) : 1;
  const weekTxt = s.start ? (w < 1 ? `Week 1 begins ${longDate(mondayOf(s.start))}.` : w > WEEKS ? `All ${WEEKS} weeks are done (started ${dayMonth(mondayOf(s.start))}).` : `Week 1 began ${longDate(mondayOf(s.start))}. Today is in week ${w}.`) : '';
  return `${navbar('Settings', { back: 'More' })}${largeTitle('Settings')}
    <div class="section" style="margin-top:0">${secH('Program')}
      <div class="field"><div class="lab">Schedule</div>${seg('schedule', Object.entries(SCHEDULES).map(([k, v]) => ({ v: k, l: v.label })), s.schedule, 'set-schedule')}<p class="help">${esc(SCHEDULES[s.schedule].note)}</p></div>
      <div class="field"><div class="lab">Level</div>${seg('level', LEVELS.map((l) => ({ v: l.id, l: l.name })), s.level, 'set-level')}<p class="help">${esc(LEVELS[s.level].example)}.${Object.keys(s.moveLevel).length ? ` ${Object.keys(s.moveLevel).length} move${Object.keys(s.moveLevel).length > 1 ? 's are' : ' is'} set to its own level. <button type="button" class="linkbtn" style="padding:0;min-height:0" data-act="clear-movelevels">Reset them</button>` : ''}</p></div>
      <div class="field"><div class="lab">Focus</div>${seg('focus', Object.entries(FOCUS).map(([k, v]) => ({ v: k, l: v.label })), s.focus, 'set-focus')}<p class="help">${esc(FOCUS[s.focus].text)}${s.focus === 'arms' ? ' ' + esc(ARMS_LINE) : ''}</p></div>
      <div class="field"><div class="lab"><label for="set-start">Start date</label></div><input class="input" type="date" id="set-start" value="${esc(s.start || today)}" data-change="set-start"><p class="help">${esc(weekTxt)} Weeks run Monday to Sunday.</p></div>
      <div class="field"><div class="lab"><label for="set-time">Training time</label><small>Shown on Today</small></div><input class="input" type="time" id="set-time" value="${esc(s.trainAt)}" data-change="set-time">
        <p class="help">Train before lunch, then make lunch your protein-heavy post-workout meal.</p>
        <button type="button" class="btn quiet wide" style="margin-top:12px" data-act="calendar">Add a reminder to Calendar</button></div>
    </div>
    <div class="section">${secH('Workout')}
      <div class="field"><div class="lab">Rest after main moves<small>Squats, rows, push-ups</small></div>${seg('restLong', [60, 75, 90, 120].map((v) => ({ v, l: `${v} s` })), s.restLong, 'set-rest')}</div>
      <div class="field"><div class="lab">Rest after small moves</div>${seg('restShort', [45, 60, 75, 90].map((v) => ({ v, l: `${v} s` })), s.restShort, 'set-rest')}</div>
      ${sw('sound', 'Sound', 'Beeps when rest ends and each minute starts', s.sound)}
      ${sw('vibrate', 'Vibration', 'Buzzes and taps where the phone allows it', s.vibrate)}
    </div>
    <div class="section">${secH('Show')}
      ${sw('show-fuel', 'Fuel tips', 'Guide page on protein and calories', !s.hide.fuel)}
      ${sw('show-results', 'Results timeline', 'Guide page: when to expect changes', !s.hide.results)}
      ${sw('show-deck', 'Deck of Cards', s.hide.deck ? 'Off: Foxtrot days become Echo engine days' : 'Foxtrot days on the 5-day schedule', !s.hide.deck)}
      ${sw('show-weighins', 'Weigh-ins', 'Weekly weight log on Today and Progress', !s.hide.weighins)}
    </div>
    <div class="section">${secH('Display')}
      <div class="field"><div class="lab">Units</div>${seg('units', [{ v: 'lb', l: 'lb' }, { v: 'kg', l: 'kg' }], s.units, 'set-units')}<p class="help">For weigh-ins and dumbbell labels.</p></div>
      <div class="field"><div class="lab">Appearance</div>${seg('theme', [{ v: 'system', l: 'Match iPhone' }, { v: 'light', l: 'Light' }, { v: 'dark', l: 'Dark' }], s.theme, 'set-theme')}</div>
    </div>
    <div class="section">${secH('Your data')}
      <div class="rows" style="border-top:0">
        <button type="button" class="row" data-act="export"><span><span class="t">Export a backup</span><span class="s">A file with every session, test and weigh-in</span></span><span class="v">${chev}</span></button>
        <label class="row" style="cursor:pointer"><span><span class="t">Restore a backup</span><span class="s">Replaces what’s on this phone</span></span><span class="v">${chev}</span><input type="file" accept="application/json,.json" class="vh" data-change="import"></label>
      </div>
      <button type="button" class="btn danger wide" style="margin-top:18px" data-act="reset">Reset everything</button>
      <p class="fine">Barracks PT ${VERSION}. Saved on this phone only, never sent anywhere.</p></div>`;
}

const S2 = (patch, msg) => { store.saveSettings(patch); refresh(); if (msg) toast(msg); };
on('set-schedule', (v) => S2({ schedule: v }, `${SCHEDULES[v].label} a week`));
on('set-level', (v) => S2({ level: +v }, `${LEVELS[+v].name} level`));
on('set-focus', (v) => S2({ focus: v }, v === 'arms' ? 'Arm finisher on' : 'Balanced plan'));
on('clear-movelevels', () => S2({ moveLevel: {} }, 'Every move follows your level again'));
on('set-start', (v, el) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { el.value = S().start; return; }
  S2({ start: v }, `Week 1 starts ${dayMonth(mondayOf(v))}`);
});
on('set-time', (v, el) => { if (!/^\d{2}:\d{2}$/.test(v)) { el.value = S().trainAt; return; } S2({ trainAt: v }, `Training at ${timeLabel(v)}`); });
on('set-rest', (v, el) => S2({ [el.name]: +v }));
on('set-units', (v) => S2({ units: v }));
on('set-theme', (v) => { S2({ theme: v }); applyTheme(); });
on('set-toggle', (_, el) => {
  const k = el.dataset.key, c = el.checked;
  if (k.startsWith('show-')) S2({ hide: { [k.slice(5)]: !c } });
  else S2({ [k]: c });
});
on('calendar', () => downloadCalendar(S()));
on('export', () => {
  const blob = new Blob([store.exportJSON()], { type: 'application/json' });
  const name = `barracks-pt-${dateKey()}.json`;
  const file = typeof File === 'function' ? new File([blob], name, { type: 'application/json' }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: 'Barracks PT backup' }).catch(() => {});
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Backup saved');
});
on('import', async (_, el) => {
  const f = el.files && el.files[0];
  el.value = '';
  if (!f) return;
  const ok = await confirmSheet({ title: 'Restore this backup?', body: 'Everything on this phone is replaced by what’s in the file.', yes: 'Restore', danger: true });
  if (!ok) return;
  try { store.importJSON(await f.text()); applyTheme(); syncShell(); refresh(); toast('Backup restored'); }
  catch (e) { toast(e.message || 'That file couldn’t be read.'); }
});
on('reset', async () => {
  const ok = await confirmSheet({ title: 'Reset everything?', body: 'Your sessions, test scores, weigh-ins and settings are deleted from this phone. Export a backup first if you might want them.', yes: 'Delete it all', no: 'Keep my data', danger: true });
  if (!ok) return;
  store.resetAll(); applyTheme(); syncShell();
  showTab('today'); refresh(); top('today').el.scrollTop = 0; toast('Everything is reset');
});

// Until setup is done the tab bar stays hidden and Today shows the welcome form.
export function syncShell() { document.getElementById('app').classList.toggle('onboarding', !S().setup); }

export function applyTheme() {
  const t = S().theme, root = document.documentElement;
  if (t === 'light' || t === 'dark') root.dataset.theme = t; else delete root.dataset.theme;
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute('content', dark ? '#1C1F16' : '#F2EEE3');
    if (t !== 'system') m.removeAttribute('media');
  });
}

export const VIEWS = {
  today: { render: todayView },
  plan: { render: planView },
  day: { render: dayView },
  progress: { render: progressView },
  entry: { render: entryView },
  more: { render: moreView },
  guide: { render: guideView },
  settings: { render: settingsView },
};
