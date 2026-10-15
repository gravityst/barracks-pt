// Everything Barracks PT remembers lives in one localStorage record, read and written safely.
// If storage is blocked (private mode, full disk) the app still runs from memory and says so.

const KEY = 'barracks-pt.v1';

export const DEFAULTS = {
  setup: false,
  schedule: '4-day',
  level: 1,
  focus: 'arms',       // balanced | arms (adds the arm finisher)
  start: null,         // 'YYYY-MM-DD'; week 1 is the Mon–Sun week holding it
  trainAt: '11:20',    // daily training time, 24 h
  restLong: 90,
  restShort: 60,
  sound: true,
  vibrate: true,
  units: 'lb',
  theme: 'system',     // system | light | dark
  hide: { fuel: false, results: false, deck: false, weighins: false },
  moveLevel: {},       // per-move level overrides, e.g. { A2: 2 }
};

const EMPTY = { settings: DEFAULTS, history: [], weighins: [], test: { w1: null, w8: null }, active: null };

let mem = null;
export let storageOK = true;

function read() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    const v = JSON.parse(raw);
    return {
      settings: { ...DEFAULTS, ...(v.settings || {}), hide: { ...DEFAULTS.hide, ...(v.settings?.hide || {}) }, moveLevel: { ...(v.settings?.moveLevel || {}) } },
      history: Array.isArray(v.history) ? v.history : [],
      weighins: Array.isArray(v.weighins) ? v.weighins : [],
      test: { w1: v.test?.w1 ?? null, w8: v.test?.w8 ?? null, last: v.test?.last ?? null },
      active: v.active ?? null,
    };
  } catch (e) {
    // Unreadable record: keep a copy aside before anything overwrites it.
    if (raw) { try { localStorage.setItem(KEY + '.unreadable', raw); } catch (_) {} }
    else storageOK = false;
    return structuredClone(EMPTY);
  }
}

function write() {
  try { localStorage.setItem(KEY, JSON.stringify(mem)); storageOK = true; }
  catch (e) { storageOK = false; }
}

export function db() { if (!mem) mem = read(); return mem; }
export function reload() { mem = null; return db(); }
export function settings() { return db().settings; }

export function saveSettings(patch) {
  const s = db().settings;
  const hide = patch.hide ? { ...s.hide, ...patch.hide } : s.hide;
  Object.assign(s, patch, { hide });
  write();
  return s;
}

export function addHistory(entry) {
  const h = db().history;
  h.push(entry);
  h.sort((a, b) => (a.endedAt || 0) - (b.endedAt || 0));
  write();
}
export function updateHistory(id, patch) {
  const e = db().history.find((x) => x.id === id);
  if (e) { Object.assign(e, patch); write(); }
}
export function removeHistory(id) {
  const d = db(); d.history = d.history.filter((x) => x.id !== id); write();
}

// Weigh-ins are stored in pounds; the units setting only changes what you see and type.
export function addWeighin(date, lb) {
  const d = db();
  d.weighins = d.weighins.filter((w) => w.date !== date);
  d.weighins.push({ date, lb: Math.round(lb * 10) / 10 });
  d.weighins.sort((a, b) => (a.date < b.date ? -1 : 1));
  write();
}
export function removeWeighin(date) {
  const d = db(); d.weighins = d.weighins.filter((w) => w.date !== date); write();
}

export function saveTest(slot, result) { db().test[slot] = result; write(); }
// A new 8-week round: this round's scores move to `last` so the new week 1 test starts clean.
export function newRound() {
  const t = db().test;
  if (t.w1 || t.w8) t.last = { w1: t.w1, w8: t.w8 };
  t.w1 = null; t.w8 = null; write();
}
export function clearTest(slot) { db().test[slot] = null; write(); }

export function setActive(a) { db().active = a; write(); }
export function active() { return db().active; }

export function resetAll() {
  mem = structuredClone(EMPTY);
  try { localStorage.removeItem(KEY); } catch (e) {}
  write();
}

export function exportJSON() { return JSON.stringify({ app: 'barracks-pt', version: 1, exported: new Date().toISOString(), ...db() }, null, 2); }

export function importJSON(text) {
  const v = JSON.parse(text);
  if (!v || v.app !== 'barracks-pt') throw new Error('That file isn’t a Barracks PT backup.');
  try { localStorage.setItem(KEY, JSON.stringify({ settings: v.settings, history: v.history, weighins: v.weighins, test: v.test, active: null })); }
  catch (e) { throw new Error('Couldn’t save the backup on this device.'); }
  mem = null; db();
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
