import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { weekNumber, mondayOf, dayIndex, slotDate, parseDose, buildSession, streak, nextSession, shuffleDeck, repsForCard,
  readyToLevelUp, sessionKeyFor, weekTally, addDays } from '../js/plan.js';
import { DEFAULTS } from '../js/store.js';
import { SESSIONS, FINISHERS } from '../js/data.js';

const S = (o = {}) => ({ ...DEFAULTS, setup: true, start: '2026-09-28', ...o, hide: { ...DEFAULTS.hide, ...(o.hide || {}) } });

test('weeks run Monday to Sunday from the start date', () => {
  assert.equal(mondayOf('2026-10-15'), '2026-10-12');
  assert.equal(dayIndex('2026-10-12'), 0);
  assert.equal(dayIndex('2026-10-18'), 6);
  assert.equal(weekNumber('2026-09-28', '2026-10-15'), 3);
  assert.equal(weekNumber('2026-10-01', '2026-09-28'), 1); // start mid-week: that whole week is week 1
  assert.equal(weekNumber('2026-10-19', '2026-10-15'), 0);
  assert.equal(slotDate('2026-09-28', 3, 3), '2026-10-15');
  // across the end of daylight saving (Nov 1 2026 in the US)
  assert.equal(weekNumber('2026-10-26', '2026-11-02'), 2);
});

test('doses parse into ranges, units, sides and dumbbells', () => {
  assert.deepEqual([parseDose('8–12').lo, parseDose('8–12').hi, parseDose('8–12').unit], [8, 12, 'reps']);
  const d = parseDose('8–10 / leg · 15s');
  assert.equal(d.per, 'leg'); assert.equal(d.weight, 15); assert.equal(d.reps, '8–10 / leg');
  assert.equal(parseDose('AMRAP −2').amrap, true);
  assert.equal(parseDose('20–30 s').unit, 'sec');
  assert.equal(parseDose('45 s / side').per, 'side');
  assert.equal(parseDose('6 / side').unit, 'reps');
  assert.equal(parseDose('90 s · 15s').unit, 'sec');
  assert.equal(parseDose('90 s · 15s').hi, 90);
});

test('every dose in the program parses to something usable', () => {
  const all = [...Object.values(SESSIONS).flatMap((s) => s.moves || []), ...Object.values(FINISHERS).flatMap((f) => f.moves)];
  for (const m of all) for (const d of m.d) {
    const p = parseDose(d);
    assert.ok(p.amrap || (p.lo > 0 && p.hi >= p.lo), `${m.id} ${d}`);
  }
});

test('phases set the sets: 2, 3, then 4 on the first two moves in Push, 2 in Test', () => {
  const b = (w) => buildSession(S({ focus: 'balanced' }), w, 0).moves.map((m) => m.sets);
  assert.deepEqual(b(1), [2, 2, 2, 2, 2, 2]);
  assert.deepEqual(b(4), [3, 3, 3, 3, 3, 3]);
  assert.deepEqual(b(6), [4, 4, 3, 3, 3, 3]);
  assert.deepEqual(b(8), [2, 2, 2, 2, 2, 2]);
  const c = buildSession(S({ focus: 'balanced' }), 7, 5); // Charlie
  assert.deepEqual(c.moves.map((m) => m.sets), [4, 4, 3, 3, 3, 3, 3]);
});

test('arms focus adds the finisher with phase sets, never 4', () => {
  const p = buildSession(S({ focus: 'arms' }), 6, 0);
  assert.equal(p.moves.length, 9);
  assert.deepEqual(p.moves.slice(6).map((m) => m.sets), [3, 3, 3]);
  assert.ok(p.moves.slice(6).every((m) => m.finisher && m.rest === 60));
  assert.equal(buildSession(S({ focus: 'balanced' }), 6, 0).moves.length, 6);
});

test('Ranger Bravo in arms mode swaps the base hammer curl for a plain curl', () => {
  const p = buildSession(S({ focus: 'arms', level: 2 }), 3, 3);
  const names = p.moves.map((m) => m.name);
  assert.equal(names.filter((n) => /hammer/i.test(n)).length, 1);
  assert.ok(names.includes('Curl, 3-sec lower'));
  const bal = buildSession(S({ focus: 'balanced', level: 2 }), 3, 3);
  assert.ok(bal.moves.some((m) => m.name === 'Hammer curl, 3-sec lower'));
});

test('levels pick variations and doses; Recruit Arnold press uses the 7s', () => {
  const p = buildSession(S({ level: 0 }), 1, 0);
  assert.equal(p.moves[1].name, 'Incline push-up');
  assert.equal(p.moves.find((m) => m.id === 'AF1').dose.weight, 7);
  assert.equal(buildSession(S({ level: 2 }), 1, 0).moves[1].name, 'Feet-on-chair push-up');
  assert.equal(buildSession(S({ level: 1, moveLevel: { A2: 2 } }), 1, 0).moves[1].name, 'Feet-on-chair push-up');
});

test('schedules map days; hiding the deck makes Foxtrot an Echo day', () => {
  assert.equal(sessionKeyFor(S({ schedule: '5-day' }), 4), 'E2');
  assert.equal(sessionKeyFor(S({ schedule: '5-day', hide: { deck: true } }), 4), 'E1');
  assert.equal(sessionKeyFor(S({ schedule: '3-day' }), 1), 'walk');
});

test('engine and deck follow the level', () => {
  assert.equal(buildSession(S({ level: 0 }), 1, 1).engine.minutes, 12);
  assert.equal(buildSession(S({ level: 0 }), 1, 1).engine.odd.name, 'Squat thrusts');
  assert.equal(buildSession(S({ level: 2 }), 1, 1).engine.even.reps, 40);
  assert.equal(shuffleDeck(0).length, 26);
  assert.equal(shuffleDeck(1).length, 52);
  assert.equal(shuffleDeck(2).filter((c) => c.joker).length, 2);
  assert.deepEqual(repsForCard({ suit: 'C', rank: 'K' }, 0), { reps: 5, move: 'Burpees' });
  assert.deepEqual(repsForCard({ suit: 'H', rank: 'A' }, 1), { reps: 11, move: 'Squats' });
  assert.deepEqual(repsForCard({ joker: true }, 2), { plank: 60 });
});

test('streak counts required days, skips rest and optional walks, and today only once done', () => {
  const s = S({ schedule: '3-day' }); // Mon A, Wed B, Fri C
  const h = [['2026-10-05', 'A'], ['2026-10-07', 'B'], ['2026-10-09', 'C'], ['2026-10-12', 'A'], ['2026-10-14', 'B']].map(([slot, key]) => ({ slot, key }));
  assert.equal(streak(h, s, '2026-10-15'), 5); // Thu walk is optional
  assert.equal(streak(h, s, '2026-10-16'), 5); // Fri not done yet: doesn't break
  assert.equal(streak(h, s, '2026-10-17'), 0); // Fri missed
  assert.equal(weekTally(h, s, 3).got, 2);
  // a record for a different session on that day (schedule changed) doesn't count
  assert.equal(streak([{ slot: '2026-10-14', key: 'E1' }], s, '2026-10-14'), 0);
  // the 4-day plan counts its 4 training days; mobility is the easy day
  assert.equal(weekTally([], S({ schedule: '4-day' }), 1).need, 4);
  assert.equal(weekTally([], S({ schedule: '5-day' }), 1).need, 5);
});

test('next session skips rest days', () => {
  const s = S({ schedule: '4-day' });
  assert.equal(nextSession(s, '2026-10-15').key, 'C'); // Thu → Fri off → Sat Charlie
});

test('level-up rule: top of the range on every set, two sessions running', () => {
  const move = { id: 'A1', level: 1, dose: { hi: 12, amrap: false } };
  const e = (sets) => ({ moves: [{ id: 'A1', level: 1, target: 3, sets }] });
  assert.equal(readyToLevelUp([e([12, 12, 12]), e([12, 12, 12])], move), true);
  assert.equal(readyToLevelUp([e([12, 12, 12]), e([12, 11, 12])], move), false);
  assert.equal(readyToLevelUp([e([12, 12, 12])], move), false);
});

test('the service worker precaches every app file', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const dir of ['js', 'css']) for (const f of readdirSync(new URL(`../${dir}/`, import.meta.url))) {
    assert.ok(sw.includes(`'${dir}/${f}'`), `${dir}/${f} missing from sw.js`);
  }
});

test('saving one hide toggle keeps the others', async () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
  const store = await import('../js/store.js?hide-test');
  store.saveSettings({ hide: { deck: true } });
  store.saveSettings({ hide: { fuel: true } });
  assert.deepEqual(store.settings().hide, { fuel: true, results: false, deck: true, weighins: false });
  assert.equal(JSON.parse(mem['barracks-pt.v1']).settings.hide.deck, true);
});
