// Dev only: realistic demo data for screenshots and click-throughs. Never loaded by the app itself
// except on localhost with ?seed=<scene> (see js/app.js). Today is put in week 3 on the 4-day plan.
(function () {
  const KEY = 'barracks-pt.v1';
  const pad = (n) => String(n).padStart(2, '0');
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const atNoon = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const add = (k, n) => { const d = atNoon(k); d.setDate(d.getDate() + n); return key(d); };

  function build(scene) {
    const now = new Date();
    const today = key(now);
    const dow = (now.getDay() + 6) % 7;
    const thisMon = add(today, -dow);
    const start = add(thisMon, -14); // today is in week 3
    const days4 = ['A', 'E1', 'mob', 'B', 'off', 'C', 'off'];
    const names = { A: ['Alpha', 'Push & squat'], B: ['Bravo', 'Pull & lunge'], C: ['Charlie', 'Full body'], E1: ['Echo', 'Engine intervals'], mob: ['Mobility', 'Walk & stretch'] };
    const strength = {
      A: [['A1', 'Goblet squat, 3-sec lower', 'reps', null, 12], ['A2', 'Push-up', 'reps', null, 14], ['A3', 'RDL, 3-sec lower', 'reps', null, 12], ['A4', 'Overhead press', 'reps', null, 10], ['A5', 'Lateral raise', 'reps', null, 14], ['A6', 'Plank', 'sec', null, 40],
        ['AF1', 'Arnold press', 'reps', null, 10], ['AF2', 'Lateral raise', 'reps', null, 16], ['AF3', 'Curl', 'reps', null, 10]],
      B: [['B1', 'Split squat', 'reps', 'leg', 9], ['B2', 'One-arm row, 3-sec lower', 'reps', 'arm', 11], ['B3', 'Glute bridge, 15 lb on hips', 'reps', null, 14], ['B4', 'Rear-delt fly', 'reps', null, 13], ['B5', 'Curl', 'reps', null, 11], ['B6', 'Dead bug', 'reps', 'side', 8],
        ['BF1', 'Hammer curl', 'reps', null, 11], ['BF2', 'Reverse curl', 'reps', null, 12], ['BF3', 'Wrist curl', 'reps', null, 17], ['BF4', 'Reverse wrist curl', 'reps', null, 16]],
      C: [['C1', 'Reverse lunge', 'reps', 'leg', 9], ['C2', 'Floor press', 'reps', null, 13], ['C3', 'Step-up', 'reps', 'leg', 9], ['C4', 'Pike push-up', 'reps', null, 8], ['C5', 'Bent-over row', 'reps', null, 13], ['C6', 'Calf raise on stair', 'reps', null, 17], ['C7', 'Side plank', 'sec', 'side', 30],
        ['CF1', 'Farmer’s hold', 'sec', null, 60], ['CF2', 'Lateral raise', 'reps', null, 15], ['CF3', 'Cross-body hammer curl', 'reps', 'arm', 10]],
    };
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
        const sets = w === 1 ? 2 : 3;
        const e = { id: 'seed' + n++, kind: k === 'E1' ? 'engine' : k === 'mob' ? 'mobility' : 'strength', slot, date: slot, week: w, day: d, key: k, name: names[k][0], title: names[k][1], level: 1, startedAt: +t0 };
        if (strength[k]) {
          e.moves = strength[k].map(([id, name, unit, per, top], i) => {
            const base = Math.max(1, top - (3 - w) * (unit === 'sec' ? 5 : 1));
            return { id, name, level: 1, unit, per, target: sets, finisher: id.includes('F'), sets: Array.from({ length: sets }, (_, j) => base - (j === sets - 1 && i % 2 ? 1 : 0)) };
          });
          e.endedAt = +t0 + (44 + w * 2) * 60000;
        } else if (k === 'E1') {
          e.engine = { minutes: 16, rounds: 16, finished: w > 1, finisher: true }; e.endedAt = +t0 + 22 * 60000;
        } else {
          e.mobility = { walkSeconds: 1200, stretches: 7 }; e.endedAt = +t0 + 29 * 60000;
        }
        history.push(e);
      }
    }
    const weighins = [{ date: add(start, 0), lb: 147.8 }, { date: add(start, 7), lb: 148.3 }, { date: add(start, 14), lb: 148.6 }];
    const settings = { setup: true, schedule: '4-day', level: 1, focus: 'arms', start, trainAt: '11:20', restLong: 90, restShort: 60, sound: true, vibrate: true, units: 'lb', theme: scene && scene.endsWith('-dark') ? 'dark' : 'system', hide: { fuel: false, results: false, deck: false, weighins: false }, moveLevel: {} };
    const data = { settings, history, weighins, test: { w1: { pu: 18, sq: 32, pl: 65, date: start }, w8: null }, active: null };

    if (scene && scene.startsWith('workout')) {
      // Bravo, move 2 (one-arm row), set 1 logged, 90 s rest with 1:12 to go.
      const B = [
        ['B1', 'Split squat', '8–10 / leg · 15s', 8, 10, 'reps', 'leg', 15, true, 'Long stance, drop the back knee straight down. Bulgarian: back foot on a chair. This one bites: it’s the king of leg day.'],
        ['B2', 'One-arm row, 3-sec lower', '10–12 / arm', 10, 12, 'reps', 'arm', null, true, 'One hand and knee on a chair, a 15 in the other hand. Pull the weight to your hip, not your chest.'],
        ['B3', 'Glute bridge, 15 lb on hips', '12–15', 12, 15, 'reps', null, null, false, 'Drive through your heels and squeeze at the top for a second. Hip thrust: shoulders on the couch edge.'],
        ['B4', 'Rear-delt fly', '12–15 · 7s', 12, 15, 'reps', null, 7, false, 'Hinge forward, arms out wide like wings.'],
        ['B5', 'Curl', '10–12 · 15s', 10, 12, 'reps', null, 15, false, 'Elbows pinned to your sides. No swinging.'],
        ['B6', 'Dead bug', '8 / side', 8, 8, 'reps', 'side', null, false, 'On your back, slowly lower the opposite arm and leg.'],
        ['BF1', 'Hammer curl', '10–12 · 15s', 10, 12, 'reps', null, 15, false, 'Thumbs up.'],
        ['BF2', 'Reverse curl', '10–15 · 7s', 10, 15, 'reps', null, 7, false, 'Palms down.'],
        ['BF3', 'Wrist curl', '15–20 · 15s', 15, 20, 'reps', null, 15, false, 'Forearms on thighs.'],
        ['BF4', 'Reverse wrist curl', '15–20 · 7s', 15, 20, 'reps', null, 7, false, 'Palms down.'],
      ];
      const moves = B.map(([id, name, reps, lo, hi, unit, per, weight, main, how], i) => {
        const fin = id.includes('F');
        return { id, index: i, name, level: 1, dose: { text: reps, reps: reps.split(' · ')[0], lo, hi, unit, per, weight, amrap: false }, sets: 3, main: main && !fin, how, finisher: fin, grip: fin && /curl/i.test(name) && !/wrist/i.test(name), rest: main && !fin ? 90 : 60 };
      });
      const startedAt = Date.now() - (9 * 60 + 12) * 1000;
      data.active = {
        id: 'demo-active', kind: 'strength', slot: today, date: today, week: 3, day: 3, key: 'B', name: 'Bravo', title: 'Pull & lunge', level: 1, startedAt, step: 2,
        moves, rir: 2, phase: 'Build', finisher: { title: 'Arm finisher', focus: 'Forearms', minutes: 10 },
        steps: ['warm', ...moves.map((_, i) => 'm' + i), 'cool', 'sum'],
        logs: { B1: [10, 9, 9], B2: [12] }, draft: {}, editing: null, hold: null, warm: { total: 300, startedAt, pausedAt: null, pausedMs: 0 },
        rest: { t: { total: 90, startedAt: Date.now() - 18000, pausedAt: null, pausedMs: 0 }, next: 'Next: set 2 of 3', hint: 'One-arm row, 3-sec lower · <b>10–12 / arm</b>' },
      };
    }
    if (scene && scene.startsWith('engine')) {
      const startedAt = Date.now() - 9 * 60000;
      data.active = { id: 'demo-engine', kind: 'engine', slot: today, date: today, week: 3, day: 1, key: 'E1', name: 'Echo', title: 'Engine intervals', level: 1, startedAt, step: 1,
        cfg: { minutes: 16, odd: { name: 'Burpees', reps: 10, how: 'Chest to the floor, jump at the top.' }, even: { name: 'Mountain climbers', reps: 30, how: 'Count each leg. Fast, but keep your hips level.' }, finisher: { name: 'Flutter kicks', seconds: 45, how: 'On your back, hands under your hips, legs 6 inches off the floor, small fast kicks.' } },
        steps: ['warm', 'emom', 'fin', 'sum'], emom: { total: 0, startedAt: Date.now() - (5 + 4 * 60 + 18) * 1000, pausedAt: null, pausedMs: 0 }, fin: null, result: null, lastMinute: 4 };
    }
    if (scene && scene.startsWith('deck')) {
      const cards = [{ suit: 'H', rank: '9' }, { suit: 'S', rank: 'K' }, { suit: 'C', rank: '4' }, { suit: 'D', rank: '7' }, { suit: 'S', rank: '5' }, { suit: 'H', rank: 'Q' }, { suit: 'D', rank: 'A' }];
      for (let i = cards.length; i < 52; i++) cards.push({ suit: 'C', rank: '2' });
      data.active = { id: 'demo-deck', kind: 'deck', slot: today, date: today, week: 3, day: 4, key: 'E2', name: 'Foxtrot', title: 'Deck of Cards', level: 1, startedAt: Date.now() - 8 * 60000, step: 1,
        cfg: { cards: 52, jokers: false, halfBurpees: false, text: 'Regular: the full 52.' }, steps: ['warm', 'deck', 'sum'],
        deck: { cards, i: 7, clock: { total: 0, startedAt: Date.now() - (6 * 60 + 41) * 1000, pausedAt: null, pausedMs: 0 }, tally: { S: 15, H: 19, D: 18, C: 4, J: 0 }, joker: null } };
    }
    return data;
  }

  window.__bptSeed = function (scene) {
    try { localStorage.setItem(KEY, JSON.stringify(build(scene))); } catch (e) { console.error('seed failed', e); }
  };
})();
