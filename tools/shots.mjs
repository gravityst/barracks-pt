// Screenshots at iPhone 17 size (402×874 pt, 2×) through the headless WebKit snap tool, with demo data
// from tools/seed.js and the iPhone's safe areas (62 pt top, 34 pt bottom) applied by hand, since a Mac
// web view has none. Writes PNGs and phone-sendable JPEGs to shots/.
//   npm run dev   (in another tab)   then   npm run shots [-- name ...]
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAP = process.env.SNAP || join(process.env.HOME, 'Developer/gyroid-studio/tools/bin/snap');
const BASE = process.env.BASE || 'http://localhost:8795';
const OUT = join(ROOT, 'shots');
mkdirSync(OUT, { recursive: true });

const W = 402, H = 874;
const safe = `document.documentElement.style.setProperty('--safe-top','62px');document.documentElement.style.setProperty('--safe-bottom','34px');`;
// The seed is async (it builds sessions with the app's own plan code), so the app loads it itself
// from ?seed=<scene> and waits for it (js/app.js); here we only clear storage first.
const init = (extra = '') => `try{localStorage.clear();sessionStorage.clear();}catch(e){}\n${safe}\n${extra}`;
const tab = (t) => `try{sessionStorage.setItem('bpt.tab','${t}')}catch(e){}`;
const click = (sel) => `document.querySelector(${JSON.stringify(sel)}).click();`;
// Overflow audit: anything wider than the screen is a bug.
const audit = `await document.fonts.ready; await new Promise(r=>setTimeout(r,300));
  const bad=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left<-1)&&getComputedStyle(e).position!=='fixed'&&!e.closest('.view[style*="translateX"]')&&!e.closest('[hidden]')&&!e.closest('[style*="visibility: hidden"]')});
  if(bad.length) console.error('overflow: '+bad.slice(0,5).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right)).join(', '));`;

const waitPhase = (label, ms) => `await new Promise((ok) => { const t0 = Date.now(); const i = setInterval(() => { const ph = [...document.querySelectorAll('.rig-cap .ph')].pop(); if ((ph && ph.textContent === ${JSON.stringify(label)}) || Date.now() - t0 > 12000) { clearInterval(i); setTimeout(ok, ${ms}); } }, 16); });`;

// Catch a demo at its widest (or tallest) pose and stop it there, so a fast loop like jumping jacks
// is shot at the moment that shows the move. Watches one full loop first to learn the extreme.
const freezeAt = (sel, dim, loopMs) => `await new Promise((ok) => { const f = document.querySelector(${JSON.stringify(sel)}); const g = f && f.querySelector('g.fr'); if (!g) return ok(); let max = 0; const t0 = performance.now();
  const tick = () => { const b = g.getBBox(), v = b.${dim}; max = Math.max(max, v); if (performance.now() - t0 > ${loopMs} && v >= max - 0.3) { f.__rig = null; setTimeout(ok, 200); } else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });`;

const JOBS = {
  today: { scene: 'today' },
  'today-dark': { scene: 'today-dark' },
  workout: { scene: 'workout' },
  'workout-dark': { scene: 'workout-dark' },
  plan: { scene: 'plan', extra: tab('plan') },
  settings: { scene: 'settings', extra: tab('more'), eval: `${click('[data-act="go-settings"]')} await new Promise(r=>setTimeout(r,700));` },
  progress: { scene: 'progress', extra: tab('progress') },
  more: { scene: 'more', extra: tab('more') },
  day: { scene: 'day', extra: tab('plan'), eval: `${click('.dayrow[data-day="5"]')} await new Promise(r=>setTimeout(r,700));` },
  onboarding: { scene: null, raw: true },
  engine: { scene: 'engine' },
  deck: { scene: 'deck' },
  'plan-dark': { scene: 'plan-dark', extra: tab('plan') },
  'settings-dark': { scene: 'settings-dark', extra: tab('more'), eval: `${click('[data-act="go-settings"]')} await new Promise(r=>setTimeout(r,700));` },
  // Demos: wait for a caption, then a set delay, so the figure is caught at a telling moment.
  move: { scene: 'workout-move', eval: `${waitPhase('Pull to your hip', 500)}` },
  'move-dark': { scene: 'workout-move-dark', eval: `${waitPhase('Pull to your hip', 500)}` },
  sheet: { scene: 'plan', extra: tab('plan'), eval: `${click('.dayrow[data-day="0"]')} await new Promise(r=>setTimeout(r,700)); ${click('[data-act="move-sheet"][data-id="A3"]')} ${waitPhase('Lower for 3 seconds', 1700)}` },
  'sheet-goblet': { scene: 'plan', extra: tab('plan'), eval: `${click('.dayrow[data-day="0"]')} await new Promise(r=>setTimeout(r,700)); ${click('[data-act="move-sheet"][data-id="A1"]')} ${waitPhase('Lower for 3 seconds', 1700)}` },
  // Moves A–Z, a front-view demo in the library sheet, and a warm-up with its drill demo.
  library: { scene: 'more', extra: tab('more'), eval: `${click('[data-act="go-library"]')} await new Promise(r=>setTimeout(r,700));` },
  'library-dark': { scene: 'more-dark', extra: tab('more'), eval: `${click('[data-act="go-library"]')} await new Promise(r=>setTimeout(r,700));` },
  'library-360': { scene: 'more', extra: tab('more'), width: 360, height: 780, eval: `${click('[data-act="go-library"]')} await new Promise(r=>setTimeout(r,700));` },
  'lib-sheet': { scene: 'more', extra: tab('more'), eval: `${click('[data-act="go-library"]')} await new Promise(r=>setTimeout(r,700)); ${click('.lib-row[data-ref="lateral-raise"]')} await new Promise(r=>setTimeout(r,500)); ${freezeAt('#sheet figure.demo', 'width', 3600)}` },
  'lib-sheet-dark': { scene: 'more-dark', extra: tab('more'), eval: `${click('[data-act="go-library"]')} await new Promise(r=>setTimeout(r,700)); ${click('.lib-row[data-ref="side-plank"]')} await new Promise(r=>setTimeout(r,1500));` },
  warmup: { scene: 'workout-warm', eval: `${freezeAt('.drills figure.demo', 'height', 900)}` },
  'warmup-dark': { scene: 'workout-warm-dark', eval: `${freezeAt('.drills figure.demo', 'height', 900)}` },
  'warmup-360': { scene: 'workout-warm', width: 360, height: 780, eval: `${freezeAt('.drills figure.demo', 'height', 900)}` },
  'move-360': { scene: 'workout-move', width: 360, height: 780, eval: `${waitPhase('Pull to your hip', 500)}` },
  'today-360': { scene: 'today', width: 360, height: 780 },
  'workout-360': { scene: 'workout', width: 360, height: 780 },
  'plan-360': { scene: 'plan', extra: tab('plan'), width: 360, height: 780 },
};

const want = process.argv.slice(2);
const names = want.length ? want : ['today', 'workout', 'plan', 'settings'];
const jobs = names.map((n, i) => {
  const j = JOBS[n];
  if (!j) throw new Error('no shot called ' + n);
  return {
    url: j.raw ? `${BASE}/?shot=${n}&i=${i}` : `${BASE}/?seed=${encodeURIComponent(j.scene)}&shot=${n}&i=${i}`,
    out: join(OUT, `${n}.png`),
    width: j.width || W, height: j.height || H, scale: 2, viewportOnly: true, settle: 1.2,
    initScript: j.raw ? `try{localStorage.clear()}catch(e){}${safe}` : init(j.extra || ''),
    eval: (j.eval || '') + audit,
    after: 0.6,
  };
});
const jf = join(process.env.TMPDIR || '/tmp', 'bpt-shot-jobs.json');
writeFileSync(jf, JSON.stringify(jobs));
execFileSync(SNAP, ['--jobs', jf], { stdio: 'inherit' });
for (const j of jobs) {
  const jpg = j.out.replace(/\.png$/, '.jpg');
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '72', j.out, '--out', jpg], { stdio: 'ignore' });
  console.log('jpeg', jpg);
}
