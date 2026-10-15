// Screenshots at iPhone 17 size (402×874 pt, 2×) through the headless WebKit snap tool, with demo data
// from tools/seed.js and the iPhone's safe areas (62 pt top, 34 pt bottom) applied by hand, since a Mac
// web view has none. Writes PNGs and phone-sendable JPEGs to shots/.
//   npm run dev   (in another tab)   then   npm run shots [-- name ...]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAP = process.env.SNAP || join(process.env.HOME, 'Developer/gyroid-studio/tools/bin/snap');
const BASE = process.env.BASE || 'http://localhost:8795';
const OUT = join(ROOT, 'shots');
mkdirSync(OUT, { recursive: true });
const seed = readFileSync(join(ROOT, 'tools/seed.js'), 'utf8');

const W = 402, H = 874;
const safe = `document.documentElement.style.setProperty('--safe-top','62px');document.documentElement.style.setProperty('--safe-bottom','34px');`;
const init = (scene, extra = '') => `${seed}\ntry{localStorage.clear();sessionStorage.clear();}catch(e){}\n__bptSeed(${JSON.stringify(scene)});\n${safe}\n${extra}`;
const tab = (t) => `try{sessionStorage.setItem('bpt.tab','${t}')}catch(e){}`;
const click = (sel) => `document.querySelector(${JSON.stringify(sel)}).click();`;
// Overflow audit: anything wider than the screen is a bug.
const audit = `await document.fonts.ready; await new Promise(r=>setTimeout(r,300));
  const bad=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left<-1)&&getComputedStyle(e).position!=='fixed'&&!e.closest('.view[style*="translateX"]')&&!e.closest('[hidden]')&&!e.closest('[style*="visibility: hidden"]')});
  if(bad.length) console.error('overflow: '+bad.slice(0,5).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right)).join(', '));`;

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
    url: `${BASE}/?shot=${n}&i=${i}`,
    out: join(OUT, `${n}.png`),
    width: j.width || W, height: j.height || H, scale: 2, viewportOnly: true, settle: 1.2,
    initScript: j.raw ? `try{localStorage.clear()}catch(e){}${safe}` : init(j.scene, j.extra || ''),
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
