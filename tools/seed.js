// Dev only: realistic demo data for screenshots and click-throughs. Never loaded by the app itself
// except on localhost with ?seed=<scene> (see js/app.js). Today is put in week 3 on the 4-day plan.
(function () {
  const KEY = 'barracks-pt.v1';
  const pad = (n) => String(n).padStart(2, '0');
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const atNoon = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const add = (k, n) => { const d = atNoon(k); d.setDate(d.getDate() + n); return key(d); };

  // The superset sessions come from the app's own plan code, so the seed can't drift from it.
  async function build(scene) {
    const P = await import(new URL('js/plan.js', document.baseURI).href);
    const now = new Date();
    const today = key(now);
    const dow = (now.getDay() + 6) % 7;
    const thisMon = add(today, -dow);
    const start = add(thisMon, -14); // today is in week 3
    const days4 = ['A', 'E1', 'mob', 'B', 'off', 'C', 'off'];
    const names = { A: ['Alpha', 'Push & squat'], B: ['Bravo', 'Pull & lunge'], C: ['Charlie', 'Full body'], E1: ['Echo', 'Engine intervals'], mob: ['Mobility', 'Walk & stretch'] };
    // Top reps reached by week 3, per move; earlier weeks are a rep or two lower.
    const top = { A1: 12, AF2: 16, A2: 14, A3: 12, AF1: 10, AF3: 10, A6: 40, B1: 9, BF1: 11, B2: 11, B3: 14, B4: 13, BF2: 12, BF3: 17, B6: 8,
      C1: 9, C4: 8, C2: 13, C5: 13, CF1: 45, CF2: 15, C7: 30, C6: 17 };
    const settings = { setup: true, schedule: '4-day', level: 1, focus: 'arms', start, trainAt: '11:20', restLong: 75, restShort: 60, program: 2, sound: true, vibrate: true, units: 'lb', theme: scene && scene.endsWith('-dark') ? 'dark' : 'system', hide: { fuel: false, results: false, deck: false, weighins: false }, moveLevel: {} };
    const history = [];
    let n = 0;
    for (let w = 1; w <= 3; w++) {
      for (let d = 0; d < 7; d++) {
        const slot = add(start, (w - 1) * 7 + d);
        if (slot >= today) continue;
        const k = days4[d];
        if (k === 'off') continue;
        if (w === 2 && d === 2) continue; // one missed mobility day: real life
        const t0 = atNoon(slot); t0.setHours(11, 22, 0, 0);
        const plan = P.buildSession(settings, w, d);
        const e = { id: 'seed' + n++, kind: k === 'E1' ? 'engine' : k === 'mob' ? 'mobility' : 'strength', slot, date: slot, week: w, day: d, key: k, name: names[k][0], title: names[k][1], level: 1, startedAt: +t0 };
        if (plan.kind === 'strength') {
          e.moves = plan.moves.map((m, i) => {
            const base = Math.max(1, top[m.id] - (3 - w) * (m.dose.unit === 'sec' ? 5 : 1));
            const tag = m.gap ? 'Rest gap' : plan.blocks[m.block].kind === 'core' ? 'Core' : `${m.block + 1}${m.slot}`;
            return { id: m.id, name: m.name, level: 1, unit: m.dose.unit, per: m.dose.per, target: m.sets, tag, hi: m.dose.hi, sets: Array.from({ length: m.sets }, (_, j) => base - (j === m.sets - 1 && i % 2 ? 1 : 0)) };
          });
          e.endedAt = +t0 + (plan.minutes + (d % 2 ? 2 : -1)) * 60000;
        } else if (k === 'E1') {
          e.engine = { minutes: 16, rounds: 16, finished: w > 1, finisher: true }; e.endedAt = +t0 + 22 * 60000;
        } else {
          e.mobility = { walkSeconds: 480, stretches: 7 }; e.endedAt = +t0 + 16 * 60000;
        }
        history.push(e);
      }
    }
    const weighins = [{ date: add(start, 0), lb: 147.8 }, { date: add(start, 7), lb: 148.3 }, { date: add(start, 14), lb: 148.6 }];
    const data = { settings, history, weighins, test: { w1: { pu: 18, sq: 32, pl: 65, date: start }, w8: null }, active: null };

    if (scene && scene.startsWith('workout')) {
      // Bravo, week 3. Superset 1 done; superset 2 round 1 done (row + glute bridge), resting with
      // 0:42 to go, then 2a, the one-arm row. workout-move: the move screen itself, no rest panel.
      const plan = P.buildSession(settings, 3, 3);
      const startedAt = Date.now() - (14 * 60 + 12) * 1000;
      data.active = {
        id: 'demo-active', v: 2, kind: 'strength', slot: today, date: today, week: 3, day: 3, key: 'B', name: 'Bravo', title: 'Pull & lunge', level: 1, startedAt, step: 2,
        blocks: plan.blocks, gap: plan.gap || null, moves: plan.moves, rir: 2, phase: 'Build', minutes: plan.minutes,
        steps: ['warm', ...plan.blocks.map((_, i) => 'b' + i), 'cool', 'sum'],
        logs: { B1: [10, 9, 9], BF1: [12, 11, 11], B2: [12], B3: [15] }, draft: {}, focus: null, editing: null, hold: null, warm: { total: 180, startedAt, pausedAt: null, pausedMs: 0 },
        rest: { t: { total: 60, startedAt: Date.now() - 18000, pausedAt: null, pausedMs: 0 }, next: 'Next: round 2 of 3', hint: '2a One-arm row, 3-sec lower · <b>10–12 / arm</b>', b: 1 },
      };
      if (scene.includes('move')) data.active.rest = null;
      // workout-warm: the same Bravo, just started, on the warm-up with its drill demo.
      if (scene.includes('warm')) {
        const t = Date.now() - 52000;
        Object.assign(data.active, { step: 0, rest: null, logs: {}, startedAt: t, warm: { total: 180, startedAt: t, pausedAt: null, pausedMs: 0 } });
      }
    }
    if (scene && scene.startsWith('engine')) {
      const startedAt = Date.now() - 9 * 60000;
      data.active = { id: 'demo-engine', kind: 'engine', slot: today, date: today, week: 3, day: 1, key: 'E1', name: 'Echo', title: 'Engine intervals', level: 1, startedAt, step: 1,
        cfg: { minutes: 16, odd: { name: 'Burpees', reps: 10, how: 'Chest to the floor, jump at the top.' }, even: { name: 'Mountain climbers', reps: 30, how: 'Count each leg. Fast, but keep your hips level.' }, finisher: { name: 'Flutter kicks', seconds: 45, how: 'On your back, hands under your hips, legs 6 inches off the floor, small fast kicks.' } },
        steps: ['warm', 'emom', 'fin', 'sum'], emom: { total: 0, startedAt: Date.now() - (5 + 4 * 60 + 18) * 1000, pausedAt: null, pausedMs: 0 }, fin: null, result: null, lastMinute: 4 };
    }
    if (scene && scene.startsWith('deck')) {
      const cards = [{ suit: 'H', rank: '9' }, { suit: 'S', rank: 'K' }, { suit: 'C', rank: '4' }, { suit: 'D', rank: '7' }, { suit: 'S', rank: '5' }, { suit: 'H', rank: 'Q' }, { suit: 'D', rank: 'A' }];
      for (let i = cards.length; i < 39; i++) cards.push({ suit: 'C', rank: '2' });
      data.active = { id: 'demo-deck', kind: 'deck', slot: today, date: today, week: 3, day: 4, key: 'E2', name: 'Foxtrot', title: 'Deck of Cards', level: 1, startedAt: Date.now() - 8 * 60000, step: 1,
        cfg: { cards: 39, jokers: false, halfBurpees: false, text: 'Regular: three-quarters of the deck (stop at 39 cards).' }, steps: ['warm', 'deck', 'sum'],
        deck: { cards, i: 7, clock: { total: 0, startedAt: Date.now() - (6 * 60 + 41) * 1000, pausedAt: null, pausedMs: 0 }, tally: { S: 15, H: 19, D: 18, C: 4, J: 0 }, joker: null } };
    }
    return data;
  }

  window.__bptSeed = async function (scene) {
    try { localStorage.setItem(KEY, JSON.stringify(await build(scene))); } catch (e) { console.error('seed failed', e); }
  };
})();
