# Barracks PT

An 8-week home strength plan as an iPhone web app. Built for two pairs of dumbbells (15 lb and 7 lb),
a chair and a stair. Open it at 11:20, before lunch, and it tells you what to do today.

No build step, no dependencies, no server code. Plain HTML, CSS and ES modules, a manifest and a
service worker. Everything you log stays in the phone's local storage.

## Run it

```sh
npm run dev        # or: node tools/serve.mjs   → http://localhost:8795
npm test           # plan maths, supersets, the 40-minute cap, streaks, offline file list, and the demo figure's anatomy
```

There's no login: it's a personal app and all data is on the device. To try it with realistic data
(week 3, sessions done, weigh-ins, a PT test), open `http://localhost:8795/?seed=today` once
(localhost only). `?seed=workout` drops you into Bravo's second superset mid-rest, `?seed=workout-move`
on the one-arm row. The seed builds its sessions with the app's own `js/plan.js`, so it can't drift.

On the iPhone: open the deployed URL in Safari, tap Share, then **Add to Home Screen**. It opens full
screen with its own icon and launch screen, and works offline after the first load.

## What's where

| Path | What it does |
|---|---|
| `index.html` | The shell: four tabs, the session layer, the sheet, launch-screen links |
| `css/app.css` | The whole look: paper, ink and olive, one signal orange for "now", light and dark |
| `js/data.js` | The program itself: every move (`CATALOG`), each day's supersets per focus (`SESSIONS`), phases, schedules, guide lines. Edit content here |
| `js/plan.js` | Pure logic: which week it is (from the start date), today's session as supersets, the time estimate, dose parsing, streaks, the level-up rule |
| `js/store.js` | The one localStorage record, read and written safely; export/import; reset |
| `js/views.js` | Today, Plan (+ day preview), Progress (+ session record), More (+ Moves A–Z, guide pages, Settings) |
| `js/session.js` | Workout mode: strength supersets (1a, 1b, rest, one move on screen with its demo), Echo EMOM clock, Deck of Cards, Mobility, Walk, PT test; every warm-up, minute, card, stretch and test event shows its demo |
| `js/rig.js` | The demo figure: one simple human posed from joint angles (side view, or a front view for raises, jacks and the side plank), animated between key poses at the move's tempo |
| `js/moves.js` | The 24 strength moves: plain-English how-to (Set up · Do it · Feel it · Don't), what each level changes, each demo's poses and tempo; `PLAN_MOVES` maps every plan move to its demo; `LIBRARY` is strength + drills |
| `js/drills.js` | The 18 drills and stretches (warm-ups, Echo, Foxtrot, Mobility), one demo each, with where they're used |
| `js/howto.js` | Puts demos on screen: the workout move, the drill picker above warm-up and stretch lists, and the move sheet (tap any move on Today, a day preview, a workout or Moves A–Z; library sheets switch level in place) |
| `js/nav.js` | Tabs with their own push/pop stacks |
| `js/feedback.js` | Beeps (Web Audio), vibration and iPhone haptic taps, keeping the screen awake |
| `js/calendar.js` | "Add a reminder to Calendar": an .ics with the training time on training days until week 8 |
| `sw.js` | Offline: precaches the app and the fonts. **Bump `VERSION` on every deploy** |
| `manifest.webmanifest`, `icons/` | Home Screen install, icons, iPhone launch screens (light and dark) |
| `tools/serve.mjs` | The local server (port 8795) |
| `tools/icons.mjs`, `tools/art.html` | Re-render icons and launch screens (needs the dev server and the WebKit snap tool) |
| `tools/shots.mjs`, `tools/seed.js` | iPhone-size screenshots with demo data → `shots/` (ignored by git). `npm run shots -- library lib-sheet warmup` for the Moves list, a front-view sheet and a warm-up with its demo |
| `tools/rig-lab.html` | Every demo at phone width (`?strip` adds the still frames, `?move=burpee,plank` picks some, `?frames=rdl:1&n=8` or `?frames=lateral-raise:quarter` shows one loop as frames, `?k=1.5` zooms) |

## How the plan works in the app

- **Weeks** run Monday to Sunday. Week 1 is the week holding the start date (Settings). The app works
  out the current week itself; past week 8 it offers the next round a level up.
- **Strength days are three supersets.** A superset is two moves that don't work the same muscles,
  done back to back: 1a, then 1b, then rest. That's one round. The workout shows one move at a time
  with its demo, and a strip above it (1a → 1b → rest) says where you are; tap either half to switch.
- **Focus**: *Arms & shoulders* (the default) puts the arm work into the pairs (Alpha: goblet squat +
  lateral raise, push-up + RDL, Arnold press + curl; Bravo: split squat + hammer curl, row + glute
  bridge, rear-delt fly + reverse curl; Charlie: reverse lunge + pike push-up, floor press + bent-over
  row, farmer's hold + lateral raise), then one round of core (plank, dead bug, side plank). Regular
  and Ranger swap reverse curls for wrist curls in even weeks. *Balanced* uses the original moves only:
  the overhead press, curl and step-up come back and the core move becomes the last pair's partner, so
  no move of the plan is lost across the week. Charlie's calf raises happen in the rests of superset 2.
- **Rounds** come from the phase: Basic 2, Build 3, Push 3 with 4 on superset 1, Test 2. Rest comes
  after each round: 75 s after superset 1 (the leg pair), 60 s after the others (Settings: 60/75/90 and
  45/60, the choices that keep every session under 40 minutes).
- **Every session is 40 minutes or less**, and the app shows an honest estimate ("~34 min") on Today,
  the Plan and each day. The model (`sessionSeconds` in `js/plan.js`): about 45 s a set, 65 s for
  one-side-then-the-other moves, holds plus 15 s, 15 s to switch inside a superset, your rest after
  each round, a 3-minute warm-up and 2-minute cool-down. Echo is 4 + EMOM + finisher + 2; Foxtrot is
  Recruit half a deck, Regular three-quarters (39 cards), Ranger the full deck and jokers; Mobility is an
  8-minute walk plus seven 60 s stretches. `test/plan.test.mjs` checks every level, phase, focus,
  schedule and rest choice against the 40-minute cap, and that the default plan (4 days, Regular,
  Arms & shoulders) averages 20 to 30 minutes over the 8 weeks.
- **Done** means a saved session for that day and that session. The streak counts training days
  (rest, mobility and walk days never break it).
- **Level up**: when a move hits the top of its range on every set two sessions running, the summary
  offers to move just that move up a level (the guide's "Making it harder" rule).

## Move demos

Every move in the plan has a small figure that shows it, drawn in code (no video, no images, works
offline): 42 in all, the 24 strength moves at each of their three levels plus 18 drills and stretches.
Poses are joint angles (`js/rig.js` says what each one means), drawn a touch three-quarter so the far
arm and leg show beside the near ones (the one-arm row tilts further so the chair's seat, and the knee
and hand resting on it, can be seen). Moves that happen side to side (lateral raise, rear-delt fly,
jumping jacks, arm circles, side plank) use a front view instead, built in 3D and seen from a little
above. Hands and feet that stay planted (push-ups, burpees, mountain climbers, step-ups) are placed
with targets rather than angles, so they can't slide or sink. The figure loops at the plan's tempo, so a
"3-sec lower" really takes 3 seconds, with a 1-2-3 count under it (only on slow single movements, never
on quick reps like jumping jacks). With Reduce Motion on, the key poses sit side by side instead.

Demos show up wherever a move does: the workout move screen, every warm-up and cool-down list (tap a
line to watch it), Echo's minutes, the card in play on Foxtrot, each Mobility stretch and each PT test
event. **More → Moves A–Z** lists all of them with a search that matches the name, every level's name,
the day it's used and the body part you feel it in ("shoulders", "Bravo", "biceps").

`test/rig.test.mjs` checks every frame of every loop: joints inside a real range of motion, nothing
through the floor, pins and planted feet staying put, the tempo matching the plan's wording (3-second
lowers, holds, pauses, 1¼ and 1½ reps, the right dumbbell size), each move's own form points (flat back
on hinges, knees over feet, a straight line in planks and push-ups, weights close to the legs), and the
animator itself running every loop with its captions.

## Deploy (GitHub Pages)

Live at **https://gravityst.github.io/barracks-pt/** (repo `gravityst/barracks-pt`, public, Pages built
from `main`, folder `/`). Everything uses relative paths, so the `/barracks-pt/` subpath just works: the
manifest's `start_url` and `scope` are `./`, and the service worker registers as `sw.js`, which scopes it
to `/barracks-pt/`.

`_config.yml` tells the Pages build to leave `tools/` (dev server, demo seed data, screenshot rigs),
`test/`, `shots/` and the docs out of the published site. They stay in the repo.

Every later deploy:

```sh
# 1. bump VERSION in sw.js (this build is bpt-4; the next is bpt-5), or installed phones keep the old build
# 2. commit and push to main; Pages rebuilds in about a minute
git push
```

Phones pick up the new build the next time the app is opened online, and use it from the launch after.

## Notes

- Type: the iPhone's own system font for everything you read and tap (Public Sans from Google Fonts
  stands in elsewhere), Big Shoulders only for the one big title on a screen, and Saira Stencil One
  only for the rest clock and the week number. All OFL; the service worker caches them on install.
- WebKit screenshots (`npm run shots`) don't render `backdrop-filter`, so the tab bar's blur only
  shows on a real phone; in the shots the bar looks flat.
- iPhone: sound needs one tap first (every Start button does that), plays through the ringer
  setting, and can't fire while the phone is locked. The rest timer is timestamp-based, so it's right
  when you come back. Vibration works on Android; iPhones get a haptic tap on supported iOS versions.
- Not medical advice: the app says so on the welcome screen and in the guide.
