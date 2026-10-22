// Schedule maths: which week it is, what today's session holds, streaks. Pure, testable in Node.
import { SESSIONS, SCHEDULES, phaseFor, LEVELS, ENGINE, DECK, CATALOG, WARMUP, COOLDOWN, MOBILITY, WALK } from './data.js';

export const WEEKS = 8;

// ---- dates (local time, 'YYYY-MM-DD' keys) ----
export function dateKey(d = new Date()) {
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
export function parseKey(k) {
  const [y, m, d] = String(k).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12); // noon dodges DST edges
}
export function addDays(k, n) {
  const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d);
}
export function dayIndex(k) { return (parseKey(k).getDay() + 6) % 7; } // Mon = 0
export function mondayOf(k) { return addDays(k, -dayIndex(k)); }
export function daysBetween(a, b) { return Math.round((parseKey(b) - parseKey(a)) / 86400000); }

// Week 1 is the Monday-to-Sunday week that holds the start date.
export function weekNumber(startKey, todayKey) {
  return Math.floor(daysBetween(mondayOf(startKey), mondayOf(todayKey)) / 7) + 1;
}
export function slotDate(startKey, week, day) {
  return addDays(mondayOf(startKey), (week - 1) * 7 + day);
}

// ---- doses ----
// "8–10 / leg · 15s" → { lo: 8, hi: 10, unit: 'reps', per: 'leg', weight: 15 }
export function parseDose(str) {
  const [main, kit] = String(str).split(' · ');
  const out = { text: str, reps: main.trim(), lo: null, hi: null, unit: 'reps', per: null, weight: null, amrap: false };
  if (kit) out.weight = parseInt(kit, 10) || null;
  const per = main.match(/\/\s*(leg|arm|side)/);
  if (per) out.per = per[1];
  if (/AMRAP/.test(main)) { out.amrap = true; return out; }
  if (/\d\s*s\b/.test(main)) out.unit = 'sec';
  const nums = main.match(/\d+/g) || [];
  out.lo = nums[0] ? +nums[0] : null;
  out.hi = nums[1] ? +nums[1] : out.lo;
  return out;
}

// ---- sessions ----
export function sessionKeyFor(settings, day) {
  let key = SCHEDULES[settings.schedule]?.days[day] ?? 'off';
  if (key === 'E2' && settings.hide?.deck) key = 'E1'; // deck hidden: Friday becomes an engine day
  return key;
}

export function levelFor(settings, moveId) {
  const o = settings.moveLevel?.[moveId];
  return Number.isInteger(o) ? o : settings.level;
}

// Everything needed to run or preview one day.
// A strength day is three supersets (pairs done back to back, then rest), plus a short core block
// on Arms & shoulders. `moves` is the same moves flattened in the order they're done.
export function buildSession(settings, week, day) {
  const key = sessionKeyFor(settings, day);
  const s = SESSIONS[key];
  const w = Math.min(Math.max(week, 1), WEEKS);
  const phase = phaseFor(w);
  const L = settings.level;
  const base = { key, name: s.name, title: s.title, kind: s.kind, optional: !!s.optional, week, day, phase, level: L };
  if (s.kind === 'strength') {
    const plan = settings.focus === 'arms' ? s.arms : s.balanced;
    const one = (id, block, slot, sets) => {
      const lv = levelFor(settings, id);
      const alt = plan.alt?.[id];
      if (alt && lv >= alt.minLevel && (!alt.evenWeeks || w % 2 === 0)) id = alt.id;
      const c = CATALOG[id];
      const v = levelFor(settings, id);
      return { id, name: c.n[v], level: v, dose: parseDose(c.d[v]), sets, how: c.h, mg: c.mg,
        grip: !!(c.grip && v >= 1), block, slot };
    };
    base.blocks = plan.pairs.map((pair, i) => {
      // Push adds a round to superset 1; Build and Push keep superset 3 (the arm pair) at 2.
      const rounds = i === 0 && phase.first ? phase.first : i === 2 && phase.last ? phase.last : phase.rounds;
      return { n: i + 1, label: `Superset ${i + 1}`, kind: 'pair', rounds, rest: i === 0 ? settings.restLong : settings.restShort,
        moves: pair.map((id, j) => one(id, i, 'ab'[j], rounds)) };
    });
    if (plan.core) {
      const i = base.blocks.length;
      base.blocks.push({ n: i + 1, label: 'Core', kind: 'core', rounds: phase.core, rest: TIME.coreRest, moves: [one(plan.core, i, '', phase.core)] });
    }
    // The calf raises go in the rests of superset 2, the upper-body pair.
    if (plan.gap) base.gap = { ...one(plan.gap, 1, 'gap', base.blocks[1].rounds), gap: true };
    base.moves = base.blocks.flatMap((b) => b.moves);
    if (base.gap) base.moves.push(base.gap);
  } else if (s.kind === 'engine') {
    base.engine = engineFor(L);
  } else if (s.kind === 'deck') {
    base.deck = deckRulesFor(L);
  }
  base.seconds = sessionSeconds(base);
  base.minutes = Math.round(base.seconds / 60);
  return base;
}

// ---- how long a session takes ----
// Honest, not flattering: about 45 s a set, 65 s when it's one side then the other, a hold is its
// time plus 15 s to get into it (both sides of a side plank, plus one switch), 15 s to move between
// the two halves of a superset, and the rest you chose after every round.
export const TIME = { set: 45, sides: 65, holdPad: 15, swap: 15, coreRest: 30, card: 3, breather: 1.1,
  rep: { S: 2, H: 2, D: 2.5, C: 4 } };

export function setSeconds(dose) {
  if (dose.unit === 'sec') { const t = dose.hi || dose.lo || 30; return (dose.per ? t * 2 : t) + TIME.holdPad; }
  return dose.per ? TIME.sides : TIME.set;
}

export function blockSeconds(b, last) {
  const round = b.moves.reduce((a, m) => a + setSeconds(m.dose), 0) + TIME.swap * (b.moves.length - 1);
  return round * b.rounds + b.rest * (last ? b.rounds - 1 : b.rounds);
}

// A deck's time from the average card: number cards are their value, faces 10, aces 11.
function deckSeconds(d) {
  const perSuit = 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10 + 10 + 10 + 10 + 11; // 95 reps a suit
  const share = d.cards / 52;
  let t = 0;
  for (const su of DECK.suits) t += perSuit * share * TIME.rep[su.id] * (su.id === 'C' && d.halfBurpees ? 0.5 : 1);
  t = (t + d.cards * TIME.card) * TIME.breather;
  return t + (d.jokers ? 120 : 0);
}

export function sessionSeconds(p) {
  if (p.kind === 'strength') {
    const work = p.blocks.reduce((a, b, i) => a + blockSeconds(b, i === p.blocks.length - 1), 0);
    return WARMUP.minutes * 60 + work + COOLDOWN.minutes * 60;
  }
  if (p.kind === 'engine') return (ENGINE.warmup.minutes + p.engine.minutes + 2) * 60 + p.engine.finisher.seconds;
  if (p.kind === 'deck') return (ENGINE.warmup.minutes + 2) * 60 + deckSeconds(p.deck);
  if (p.kind === 'mobility') return MOBILITY.walk.minutes * 60 + MOBILITY.stretches.reduce((a, x) => a + x.seconds, 0);
  if (p.kind === 'walk') return WALK.minutes * 60;
  return 0;
}

export function engineFor(L) {
  return {
    minutes: ENGINE.minutes[L],
    odd: ENGINE.odd[L],
    even: { name: ENGINE.even.name, reps: ENGINE.even.reps[L], how: ENGINE.even.how },
    finisher: { name: ENGINE.finisher.name, seconds: ENGINE.finisher.seconds[L], how: ENGINE.finisher.how },
  };
}

// Recruit: half a deck, burpees count half. Regular: three-quarters. Ranger: the full deck and both jokers.
export const DECK_CARDS = [26, 39, 52];
export function deckRulesFor(L) {
  return { cards: DECK_CARDS[L] + (L === 2 ? 2 : 0), jokers: L === 2, halfBurpees: L === 0, text: DECK.byLevel[L] };
}

export function cardValue(rank) {
  if (rank === 'A') return 11;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return Number(rank);
}

// Fisher–Yates over a fresh deck for the level. `rand` is injectable for tests.
export function shuffleDeck(L, rand = Math.random) {
  const deck = [];
  for (const su of DECK.suits) for (const r of DECK.ranks) deck.push({ suit: su.id, rank: r });
  if (L === 2) deck.push({ joker: true }, { joker: true });
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return L === 2 ? deck : deck.slice(0, DECK_CARDS[L]);
}
export function repsForCard(card, L) {
  if (card.joker) return { plank: 60 };
  const su = DECK.suits.find((s) => s.id === card.suit);
  let n = cardValue(card.rank);
  if (card.suit === 'C' && L === 0) n = Math.ceil(n / 2);
  return { reps: n, move: su.move };
}

// ---- progress ----
// The record for a planned day. With `key`, only that session counts (a schedule change can put a
// different session on a day that already has a record).
export function entryForSlot(history, slot, key) {
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h.slot === slot && (!key || h.key === key)) return h;
  }
  return null;
}

// Required days = the training days the schedule is named for: not rest, not the easy mobility day, not optional walks.
export function isRequired(key) { const s = SESSIONS[key]; return !!s && s.kind !== 'off' && !s.optional && !s.easy; }

// Scheduled sessions done in a row, counting back from today (today counts once it's done).
export function streak(history, settings, todayKey) {
  if (!settings.start) return 0;
  const done = new Set(history.map((h) => `${h.slot}|${h.key}`));
  let k = todayKey, n = 0, guard = 0;
  const first = mondayOf(settings.start);
  while (daysBetween(first, k) >= 0 && guard++ < 400) {
    const key = sessionKeyFor(settings, dayIndex(k));
    if (isRequired(key)) {
      if (done.has(`${k}|${key}`)) n++;
      else if (k !== todayKey) break;
    }
    k = addDays(k, -1);
  }
  return n;
}

export function weekTally(history, settings, week) {
  let need = 0, got = 0;
  const done = new Set(history.map((h) => `${h.slot}|${h.key}`));
  for (let d = 0; d < 7; d++) {
    const key = sessionKeyFor(settings, d);
    if (!isRequired(key)) continue;
    need++;
    if (done.has(`${slotDate(settings.start, week, d)}|${key}`)) got++;
  }
  return { need, got };
}

// The next day after `todayKey` that has a session (inside the 8 weeks), or null.
export function nextSession(settings, todayKey) {
  for (let i = 1; i <= 7; i++) {
    const k = addDays(todayKey, i);
    const w = weekNumber(settings.start, k);
    if (w > WEEKS) return null;
    const key = sessionKeyFor(settings, dayIndex(k));
    if (key !== 'off') return { date: k, week: w, day: dayIndex(k), key };
  }
  return null;
}

// "Making it harder": top of the range on every set, two sessions running.
export function readyToLevelUp(history, move) {
  const hits = [];
  for (let i = history.length - 1; i >= 0 && hits.length < 2; i--) {
    const m = history[i].moves?.find((x) => x.id === move.id && x.level === move.level);
    if (m) hits.push(m);
  }
  if (hits.length < 2 || move.dose.amrap || move.dose.hi == null) return false;
  return hits.every((m) => m.sets.length >= m.target && m.sets.every((v) => v >= move.dose.hi));
}

export function levelName(L) { return LEVELS[L]?.name ?? ''; }

// Minutes:seconds, or h:mm:ss past an hour.
export function clock(sec) {
  sec = Math.max(0, Math.floor(sec + 1e-6));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
export function minutesLabel(sec) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}
