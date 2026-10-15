# Barracks PT

An 8-week home strength plan as an iPhone web app. Built for two pairs of dumbbells (15 lb and 7 lb),
a chair and a stair. Open it at 11:20, before lunch, and it tells you what to do today.

No build step, no dependencies, no server code. Plain HTML, CSS and ES modules, a manifest and a
service worker. Everything you log stays in the phone's local storage.

## Run it

```sh
npm run dev        # or: node tools/serve.mjs   → http://localhost:8795
npm test           # plan maths, dose parsing, streaks, the finisher rules, the offline file list
```

There's no login: it's a personal app and all data is on the device. To try it with realistic data
(week 3, sessions done, weigh-ins, a PT test), open `http://localhost:8795/?seed=today` once
(localhost only). `?seed=workout` drops you into a Bravo session mid-rest.

On the iPhone: open the deployed URL in Safari, tap Share, then **Add to Home Screen**. It opens full
screen with its own icon and launch screen, and works offline after the first load.

## What's where

| Path | What it does |
|---|---|
| `index.html` | The shell: four tabs, the session layer, the sheet, launch-screen links |
| `css/app.css` | The whole look: paper and ink, olive, one signal orange, light and dark |
| `js/data.js` | The program itself: every move, dose, level, phase, schedule, guide line. Edit content here |
| `js/plan.js` | Pure logic: which week it is (from the start date), today's session, dose parsing, streaks, the level-up rule |
| `js/store.js` | The one localStorage record, read and written safely; export/import; reset |
| `js/views.js` | Today, Plan (+ day preview), Progress (+ session record), More (+ guide pages, Settings) |
| `js/session.js` | Workout mode: strength (sets, reps, auto rest), Echo EMOM clock, Deck of Cards, Mobility, Walk, PT test |
| `js/nav.js` | Tabs with their own push/pop stacks |
| `js/feedback.js` | Beeps (Web Audio), vibration and iPhone haptic taps, keeping the screen awake |
| `js/calendar.js` | "Add a reminder to Calendar": an .ics with the training time on training days until week 8 |
| `sw.js` | Offline: precaches the app and the fonts. **Bump `VERSION` on every deploy** |
| `manifest.webmanifest`, `icons/` | Home Screen install, icons, iPhone launch screens (light and dark) |
| `tools/serve.mjs` | The local server (port 8795) |
| `tools/icons.mjs`, `tools/art.html` | Re-render icons and launch screens (needs the dev server and the WebKit snap tool) |
| `tools/shots.mjs`, `tools/seed.js` | iPhone-size screenshots with demo data → `shots/` (ignored by git) |

## How the plan works in the app

- **Weeks** run Monday to Sunday. Week 1 is the week holding the start date (Settings). The app works
  out the current week itself; past week 8 it offers the next round a level up.
- **Focus**: *Balanced* is the plan as written. *Arms & shoulders* (the default) adds a 10-minute arm
  finisher to Alpha, Bravo and Charlie, with the same phase sets and level variations. With it on,
  Ranger's Bravo hammer curl becomes a plain 3-sec-lower curl, so the hammer curl isn't done twice.
- **Sets** come from the phase: Basic 2, Build 3, Push 3 with 4 on the first two moves, Test 2.
  Rest after the first two moves uses the long rest (90 s), everything else the short one (60 s).
- **Done** means a saved session for that day and that session. The streak counts training days
  (rest, mobility and walk days never break it).
- **Level up**: when a move hits the top of its range on every set two sessions running, the summary
  offers to move just that move up a level (the guide's "Making it harder" rule).

## Deploy (GitHub Pages)

Live at **https://gravityst.github.io/barracks-pt/** (repo `gravityst/barracks-pt`, public, Pages built
from `main`, folder `/`). Everything uses relative paths, so the `/barracks-pt/` subpath just works: the
manifest's `start_url` and `scope` are `./`, and the service worker registers as `sw.js`, which scopes it
to `/barracks-pt/`.

`_config.yml` tells the Pages build to leave `tools/` (dev server, demo seed data, screenshot rigs),
`test/`, `shots/` and the docs out of the published site. They stay in the repo.

Every later deploy:

```sh
# 1. bump VERSION in sw.js (bpt-1 → bpt-2 …), or installed phones keep the old build
# 2. commit and push to main; Pages rebuilds in about a minute
git push
```

Phones pick up the new build the next time the app is opened online, and use it from the launch after.

## Notes

- Fonts are Big Shoulders (display), Saira Stencil One (numerals, sparingly) and Public Sans (text), all from Google Fonts (OFL). The service
  worker caches them on install, so the app looks right offline.
- iPhone: sound needs one tap first (every Start button does that), plays through the ringer
  setting, and can't fire while the phone is locked. The rest timer is timestamp-based, so it's right
  when you come back. Vibration works on Android; iPhones get a haptic tap on supported iOS versions.
- Not medical advice: the app says so on the welcome screen and in the guide.
