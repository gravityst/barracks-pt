// Renders the app icons and iPhone launch screens from tools/art.html through the WebKit snap tool,
// then writes the <link> tags for the launch screens into index.html.
//   node tools/serve.mjs &   then   node tools/icons.mjs
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAP = process.env.SNAP || join(process.env.HOME, 'Developer/gyroid-studio/tools/bin/snap');
const BASE = process.env.BASE || 'http://localhost:8795';
const out = (p) => join(ROOT, p);
mkdirSync(out('icons/splash'), { recursive: true });

// iPhone portrait screens: [points wide, points high, pixel ratio]
const SCREENS = [
  [440, 956, 3], [402, 874, 3], [420, 912, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3],
  [390, 844, 3], [375, 812, 3], [414, 896, 3], [414, 896, 2], [375, 667, 2],
];

const jobs = [
  { url: `${BASE}/tools/art.html?k=icon&s=180`, out: out('icons/apple-touch-icon.png'), width: 180, height: 180 },
  { url: `${BASE}/tools/art.html?k=icon&s=192`, out: out('icons/icon-192.png'), width: 192, height: 192 },
  { url: `${BASE}/tools/art.html?k=icon&s=512`, out: out('icons/icon-512.png'), width: 512, height: 512 },
  { url: `${BASE}/tools/art.html?k=icon&s=512&mask=1`, out: out('icons/icon-maskable-512.png'), width: 512, height: 512 },
];
const links = [];
for (const [w, h, r] of SCREENS) {
  for (const dark of [0, 1]) {
    const name = `icons/splash/launch-${w * r}x${h * r}${dark ? '-dark' : ''}.png`;
    jobs.push({ url: `${BASE}/tools/art.html?k=splash&dark=${dark}&w=${w}&h=${h}&r=${r}`, out: out(name), width: w, height: h, scale: r });
    links.push(`<link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait) and (prefers-color-scheme: ${dark ? 'dark' : 'light'})" href="${name}">`);
  }
}
for (const j of jobs) { j.viewportOnly = true; j.settle = j.settle ?? 0.6; j.scale = j.scale ?? 1; }
const jf = join(process.env.TMPDIR || '/tmp', 'bpt-icon-jobs.json');
writeFileSync(jf, JSON.stringify(jobs));
execFileSync(SNAP, ['--jobs', jf], { stdio: 'inherit' });

const html = readFileSync(out('index.html'), 'utf8');
const block = `<!--SPLASH-->\n${links.join('\n')}\n<!--/SPLASH-->`;
const next = html.includes('<!--/SPLASH-->') ? html.replace(/<!--SPLASH-->[\s\S]*?<!--\/SPLASH-->/, block) : html.replace('<!--SPLASH-->', block);
writeFileSync(out('index.html'), next);
console.log(`${jobs.length} images, ${links.length} launch-screen links`);
