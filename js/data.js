// The program itself: everything Barracks PT tells you to do. Pure data, no DOM.
// Source: Max's original one-page plan. Wording tightened, training content unchanged.

export const KIT = {
  weights: '2 × 15 lb and 2 × 7 lb dumbbells',
  also: 'A floor, a sturdy chair and the bottom stair',
  time: '35–45 min strength · 20 min engine',
};

export const LEVELS = [
  { id: 0, name: 'Recruit', example: 'Incline push-ups, half a deck' },
  { id: 1, name: 'Regular', example: 'Floor push-ups, the full deck' },
  { id: 2, name: 'Ranger', example: 'Feet-on-chair push-ups, deck plus jokers' },
];

// Days run Monday → Sunday.
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const SCHEDULES = {
  '3-day': {
    label: '3 days',
    days: ['A', 'walk', 'B', 'walk', 'C', 'off', 'off'],
    note: 'Strength on Monday, Wednesday and Friday, so every session gets a full day off after it. Tuesday and Thursday: an optional 20–30 minute walk.',
  },
  '4-day': {
    label: '4 days',
    days: ['A', 'E1', 'mob', 'B', 'off', 'C', 'off'],
    note: 'Two strength days back to back is fine, because Alpha and Bravo train different muscles.',
  },
  '5-day': {
    label: '5 days',
    days: ['A', 'E1', 'mob', 'B', 'E2', 'C', 'off'],
    note: 'The full program. Wednesday and Sunday are real rest days. Don’t skip them: that’s when you grow.',
  },
};

export const PHASES = [
  { name: 'Basic', weeks: [1, 2], sets: 2, rir: 3, text: '2 sets each, stop with 3 reps left. Learn the moves and dodge the soreness.' },
  { name: 'Build', weeks: [3, 4, 5], sets: 3, rir: 2, text: '3 sets each, stop with 2 reps left. Start adding reps every week.' },
  { name: 'Push', weeks: [6, 7], sets: 3, rir: 1, mainSets: 4, text: '3 sets, 4 on the first two moves, stop with 1 rep left. This is the hard stretch.' },
  { name: 'Test', weeks: [8], sets: 2, rir: 3, text: 'Easy week: 2 sets, 3 left in the tank. Retest on day one, then plan the next 8 weeks a level up.' },
];

export function phaseFor(week) {
  return PHASES.find((p) => p.weeks.includes(week)) || PHASES[0];
}

export const WARMUP = {
  minutes: 5,
  items: ['30 jumping jacks', '10 arm circles each way', '10 bodyweight squats', '10 hip hinges', '5 inchworms', 'One light set of the first move'],
};

export const COOLDOWN = {
  minutes: 3,
  items: ['Easy walk around the house', 'Hip-flexor stretch, 30 s', 'Chest stretch in a doorway, 30 s', 'Hang forward and reach for your toes, 30 s'],
};

export const REST_NOTE = 'Rest 60–90 s: 90 for squats, rows and push-ups, 60 for the small moves.';

// Each move: name per level [Recruit, Regular, Ranger], dose per level, how-to.
// `main` marks the first two moves of a day: 4 sets in the Push weeks, long rest.
export const SESSIONS = {
  A: {
    key: 'A', name: 'Alpha', title: 'Push & squat', time: '40 min', kind: 'strength',
    moves: [
      { id: 'A1', n: ['Goblet squat', 'Goblet squat, 3-sec lower', '1½ goblet squat'], d: ['8–12', '8–12', '8–10'], h: 'Hold one 15 lb at your chest. Sit between your heels, chest up. The 1½: down, halfway up, down again, all the way up = 1 rep.' },
      { id: 'A2', n: ['Incline push-up', 'Push-up', 'Feet-on-chair push-up'], d: ['8–15', 'AMRAP −2', 'AMRAP −2'], h: 'Incline: hands on the couch or a chair. Keep your body in one straight line. AMRAP −2 = as many as you can, minus two.' },
      { id: 'A3', n: ['Romanian deadlift', 'RDL, 3-sec lower', 'Single-leg RDL'], d: ['10–12', '10–12', '8–10 / leg'], h: 'Both 15s (one for single-leg). Soft knees, push your hips back until you feel your hamstrings, back flat.' },
      { id: 'A4', n: ['Overhead press', 'Overhead press', 'Overhead press, 3-sec lower'], d: ['8–12 · 7s', '8–12 · 15s', '8–12 · 15s'], h: 'Standing. Squeeze your glutes so your back doesn’t arch. Press up and slightly back.' },
      { id: 'A5', n: ['Lateral raise', 'Lateral raise', 'Lateral raise, 2-sec hold'], d: ['12–15 · 7s', '12–15 · 7s', '12–15 · 7s'], h: 'Raise to shoulder height with a slight bend in the elbows. Light and strict.' },
      { id: 'A6', n: ['Plank', 'Plank', 'Plank, one foot up'], d: ['20–30 s', '30–45 s', '45–60 s'], h: 'Forearms down, squeeze your glutes, don’t let your hips sag.' },
    ],
  },
  B: {
    key: 'B', name: 'Bravo', title: 'Pull & lunge', time: '40 min', kind: 'strength',
    moves: [
      { id: 'B1', n: ['Split squat', 'Split squat', 'Bulgarian split squat'], d: ['8–10 / leg · 7s', '8–10 / leg · 15s', '8–10 / leg · 15s'], h: 'Long stance, drop the back knee straight down. Bulgarian: back foot on a chair. This one bites: it’s the king of leg day.' },
      { id: 'B2', n: ['One-arm row', 'One-arm row, 3-sec lower', 'Row, pause + 3-sec lower'], d: ['10–12 / arm', '10–12 / arm', '12–15 / arm'], h: 'One hand and knee on a chair, a 15 in the other hand. Pull the weight to your hip, not your chest.' },
      { id: 'B3', n: ['Glute bridge', 'Glute bridge, 15 lb on hips', 'Single-leg hip thrust'], d: ['12–15', '12–15', '10–12 / leg'], h: 'Drive through your heels and squeeze at the top for a second. Hip thrust: shoulders on the couch edge.' },
      { id: 'B4', n: ['Rear-delt fly', 'Rear-delt fly', 'Rear-delt fly, 2-sec hold'], d: ['12–15 · 7s', '12–15 · 7s', '12–15 · 7s'], h: 'Hinge forward, arms out wide like wings. It builds the backs of the shoulders, which is what makes you look broad.' },
      { id: 'B5', n: ['Curl', 'Curl', 'Hammer curl, 3-sec lower'], d: ['8–12 · 15s', '10–12 · 15s', '10–12 · 15s'], h: 'Elbows pinned to your sides. No swinging.' },
      { id: 'B6', n: ['Dead bug', 'Dead bug', 'Dead bug holding a 7'], d: ['6 / side', '8 / side', '10 / side'], h: 'On your back, slowly lower the opposite arm and leg while your lower back stays glued to the floor.' },
    ],
  },
  C: {
    key: 'C', name: 'Charlie', title: 'Full body', time: '40 min', kind: 'strength',
    moves: [
      { id: 'C1', n: ['Reverse lunge', 'Reverse lunge', 'Reverse lunge, 3-sec lower'], d: ['8–10 / leg · 7s', '8–10 / leg · 15s', '8–10 / leg · 15s'], h: 'Step back, drop the back knee, push through the front heel to stand.' },
      { id: 'C2', n: ['Floor press', 'Floor press', 'Floor press, pause on floor'], d: ['10–15', '12–15', '12–15'], h: 'Lie on the floor with both 15s and press like a bench press. Let your elbows touch down softly.' },
      { id: 'C3', n: ['Step-up', 'Step-up', 'Step-up, 3-sec lower'], d: ['8–10 / leg', '8–10 / leg · 7s', '8–10 / leg · 15s'], h: 'Bottom stair, whole foot on it. Push through the top leg; don’t bounce off the bottom one.' },
      { id: 'C4', n: ['Pike push-up', 'Pike push-up', 'Feet-on-chair pike'], d: ['5–8', '8–10', '6–8'], h: 'Hips high, head goes down between your hands. It builds the shoulders with no weights at all.' },
      { id: 'C5', n: ['Bent-over row', 'Bent-over row', 'Bent-over row, 2-sec squeeze'], d: ['10–15', '12–15', '12–15'], h: 'Both 15s, hinge forward, pull to your ribs, squeeze your shoulder blades.' },
      { id: 'C6', n: ['Calf raise', 'Calf raise on stair', 'Single-leg calf raise'], d: ['15–20', '15–20 · 15s', '12–15 / leg'], h: 'Heels hang off the stair. Full stretch down, full rise up.' },
      { id: 'C7', n: ['Side plank', 'Side plank', 'Side plank, top leg up'], d: ['20 s / side', '30 s / side', '45 s / side'], h: 'A straight line from head to feet. Hips up.' },
    ],
  },
  E1: { key: 'E1', name: 'Echo', title: 'Engine intervals', time: '20 min', kind: 'engine' },
  E2: { key: 'E2', name: 'Foxtrot', title: 'Deck of Cards', time: '20–25 min', kind: 'deck' },
  mob: { key: 'mob', name: 'Mobility', title: 'Walk & stretch', time: '30 min', kind: 'mobility', easy: true },
  walk: { key: 'walk', name: 'Walk', title: 'Easy walk', time: '20–30 min', kind: 'walk', optional: true },
  off: { key: 'off', name: 'Rest', title: 'Rest day', time: '', kind: 'off' },
};

// Mark the first two moves of each strength day as main (Push weeks: 4 sets; long rest).
for (const s of Object.values(SESSIONS)) if (s.moves) s.moves.forEach((m, i) => { m.main = i < 2; });

// Arm finishers (Focus: Arms & shoulders): about 10 minutes at the end of Alpha, Bravo and Charlie.
// Same phase sets and level variations as the rest of the plan; never 4-set main moves.
export const FOCUS = {
  balanced: { label: 'Balanced', text: 'The plan as written: legs, back, push and pull.' },
  arms: { label: 'Arms & shoulders', text: 'Adds a 10-minute arm finisher to Alpha, Bravo and Charlie.' },
};
export const GRIP_TIP = 'Thick grip: wrap a hand towel around the handle for curls and holds. A thicker handle works the forearms harder.';
export const ARMS_LINE = 'Keep the leg and back work. It’s what lets your arms grow, so the finisher goes on top of it, never instead of it.';
export const ARMS_RESULTS = 'Biceps and shoulders respond fastest. Forearms are the slowest and partly genetic, so expect months, not weeks.';

export const FINISHERS = {
  A: {
    title: 'Arm finisher', focus: 'Shoulders + biceps', minutes: 10,
    moves: [
      { id: 'AF1', n: ['Arnold press', 'Arnold press', 'Arnold press'], d: ['8–12 · 7s', '8–12 · 15s', '8–12 · 15s'], h: 'Start with the dumbbells at your chin, palms facing you. Rotate your palms forward as you press up, and back again as you lower.' },
      { id: 'AF2', n: ['Lateral raise', 'Lateral raise', 'Lateral raise, 1¼ reps'], d: ['12–20 · 7s', '12–20 · 7s', '12–20 · 7s'], h: 'Raise to shoulder height, slight bend in the elbows. The 1¼: up, a quarter of the way down, back up, then all the way down = 1 rep.' },
      { id: 'AF3', n: ['Curl', 'Curl', 'Curl, 3-sec lower'], d: ['8–12 · 15s', '8–12 · 15s', '8–12 · 15s'], h: 'Elbows pinned to your sides. No swinging.', grip: true },
    ],
  },
  B: {
    title: 'Arm finisher', focus: 'Forearms', minutes: 10,
    moves: [
      { id: 'BF1', n: ['Hammer curl', 'Hammer curl', 'Hammer curl'], d: ['10–12 · 15s', '10–12 · 15s', '10–12 · 15s'], h: 'Thumbs up, palms facing each other the whole way. Elbows pinned to your sides.', grip: true },
      { id: 'BF2', n: ['Reverse curl', 'Reverse curl', 'Reverse curl'], d: ['10–15 · 7s', '10–15 · 7s', '10–15 · 15s'], h: 'Palms down. Curl up without letting your wrists bend back.', grip: true },
      { id: 'BF3', n: ['Wrist curl', 'Wrist curl', 'Wrist curl'], d: ['15–20 · 15s', '15–20 · 15s', '15–20 · 15s'], h: 'Sit with your forearms on your thighs, palms up, wrists just past your knees. Curl the weight up using only your wrists.' },
      { id: 'BF4', n: ['Reverse wrist curl', 'Reverse wrist curl', 'Reverse wrist curl'], d: ['15–20 · 7s', '15–20 · 7s', '15–20 · 7s'], h: 'Same position, palms down. Lift the backs of your hands toward you, then lower slowly.' },
    ],
  },
  C: {
    title: 'Arm finisher', focus: 'Grip + shoulders', minutes: 10,
    moves: [
      { id: 'CF1', n: ['Farmer’s hold', 'Farmer’s hold', 'Farmer’s hold'], d: ['45 s · 15s', '60 s · 15s', '90 s · 15s'], h: 'Stand tall with both 15s at your sides. Squeeze the handles hard, shoulders down and back.', grip: true },
      { id: 'CF2', n: ['Lateral raise', 'Lateral raise', 'Lateral raise'], d: ['12–20 · 7s', '12–20 · 7s', '12–20 · 7s'], h: 'Raise to shoulder height with a slight bend in the elbows. Light and strict.' },
      { id: 'CF3', n: ['Cross-body hammer curl', 'Cross-body hammer curl', 'Cross-body hammer curl'], d: ['8–12 / arm · 15s', '8–12 / arm · 15s', '8–12 / arm · 15s'], h: 'Thumb up, curl the dumbbell across your body toward the opposite shoulder. One arm, then the other.', grip: true },
    ],
  },
};
// With the finisher on, Ranger's Bravo curl becomes a plain curl so the hammer curl isn't done twice.
export const ARMS_SWAPS = { B5: { 2: 'Curl, 3-sec lower' } };

export const ENGINE = {
  warmup: { minutes: 4, items: ['2 min marching on the spot', '30 jumping jacks', '10 squats', '5 inchworms'] },
  minutes: [12, 16, 20],
  odd: [
    { name: 'Squat thrusts', reps: 8, how: 'Hands down, jump the feet back, jump them in, stand. No push-up, no jump.' },
    { name: 'Burpees', reps: 10, how: 'Chest to the floor, jump at the top.' },
    { name: 'Burpees', reps: 12, how: 'Chest to the floor, jump at the top.' },
  ],
  even: { name: 'Mountain climbers', reps: [20, 30, 40], how: 'Count each leg. Fast, but keep your hips level.' },
  finisher: { name: 'Flutter kicks', seconds: [30, 45, 60], how: 'On your back, hands under your hips, legs 6 inches off the floor, small fast kicks.' },
  rule: 'Rest for whatever is left of each minute. If you can’t finish the reps inside the minute, drop 2 reps. Next week, add 1.',
};

export const DECK = {
  warmup: 'Same warm-up as the engine day, then a few slow reps of each suit’s move.',
  suits: [
    { id: 'S', name: 'Spades', move: 'Push-ups', red: false },
    { id: 'H', name: 'Hearts', move: 'Squats', red: true },
    { id: 'D', name: 'Diamonds', move: 'Sit-ups', red: true },
    { id: 'C', name: 'Clubs', move: 'Burpees', red: false },
  ],
  ranks: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
  values: 'Number cards are their number. Face cards are 10, aces are 11.',
  byLevel: [
    'Recruit: half a deck (stop at 26 cards). Burpees count half.',
    'Regular: the full 52.',
    'Ranger: the full 52 plus both jokers. A joker is 1 minute of plank.',
  ],
  rule: 'Flip a card, do the reps for its suit, flip the next. Rest only when you need to and note your time. Beat it next time.',
};

export const MOBILITY = {
  walk: { minutes: 20, text: '20 minute walk outside.' },
  stretches: [
    { name: 'World’s greatest stretch', side: 'Left side', seconds: 60 },
    { name: 'World’s greatest stretch', side: 'Right side', seconds: 60 },
    { name: 'Deep squat hold', seconds: 60 },
    { name: 'Cat-cow', seconds: 60 },
    { name: 'Thread the needle', seconds: 60 },
    { name: 'Couch stretch', side: 'Left side', seconds: 60 },
    { name: 'Couch stretch', side: 'Right side', seconds: 60 },
  ],
  note: 'An easy day that keeps the soreness away.',
};

export const WALK = {
  text: '20–30 minutes at a pace where you can still talk. It helps recovery and your heart, and it’s a good way to clear your head before work.',
};

export const OFF = {
  text: 'No training. Eat well, sleep, go for a walk if you feel like it. Muscle is built on these days, not during the workout.',
};

export const TEST = {
  when: 'Take it on day one of week 1, then again in week 8. It shows you it’s working before the mirror does.',
  events: [
    { id: 'pu', name: 'Push-ups', limit: 120, unit: 'reps', how: '2 minutes. Chest down to a fist’s height. Rest only in the up position.' },
    { id: 'sq', name: 'Goblet squats', limit: 60, unit: 'reps', how: '1 minute, holding one 15 lb at your chest.' },
    { id: 'pl', name: 'Plank', limit: 0, unit: 'sec', how: 'Hold until your form breaks. Stop the clock the moment your hips sag.' },
  ],
};

export const RESULTS = {
  intro: 'The honest version, assuming you train 3+ days a week and eat more than you do now. If you don’t eat more, everything below happens slower and smaller.',
  steps: [
    { when: 'Weeks 1–2', text: 'Sore for a couple of days after the first sessions, then it fades. Your reps already go up, but that’s your brain learning the moves, not new muscle yet. Better sleep and energy often show up here.' },
    { when: 'Weeks 3–4', text: 'Clearly stronger: more push-ups, and slow, controlled squats feel easy. The mirror looks the same. Don’t judge it yet.' },
    { when: 'Weeks 6–8', key: true, text: 'The first visible change, if you’ve been eating more: shoulders, chest and arms a little fuller, shirts fitting slightly differently. The week 8 retest usually shows a big jump, often 30–50% more push-ups for a beginner.' },
    { when: 'Month 3', text: 'Other people may notice. A realistic first-year pace for a beginner eating well is about 0.5–1 lb of muscle a month, with the scale going up 1–2 lb a month in total.' },
    { when: 'Months 4–6', text: 'The 15s get too light for legs and rows. Slow tempos buy you time, but a pair of adjustable dumbbells is the real upgrade then. Keep going and you’ll look like someone who trains.' },
  ],
};

// Guide pages. `train` lines use the training time from Settings.
export const GUIDE = {
  time: {
    title: 'Best time to train',
    lines: (t) => [
      `Train at ${t}, then eat lunch right after. That meal is your post-workout meal, so make it protein-heavy.`,
      'Hungry mid-morning? Have a small snack. Don’t train on a full stomach: burpees and lunch don’t mix.',
      'A time you’ll actually show up for beats the “perfect” time. The same time every day matters more.',
    ],
  },
  sore: {
    title: 'Not too sore',
    lines: () => [
      'Weeks 1–2 are only 2 sets, stopping with 3 reps left. That’s on purpose: it’s what prevents the can’t-walk-downstairs week.',
      'Keep the same exercises for weeks. Soreness comes from new moves, and it drops fast once your body has seen them.',
      'Mild soreness: train anyway, it helps. Sharp or joint pain: stop that move.',
      'Walk 20–30 minutes on off days. It clears soreness better than lying still.',
      'Sleep 7–9 hours. That’s when the muscle actually gets built.',
    ],
  },
  harder: {
    title: 'Making it harder',
    lines: () => [
      'When you hit the top of the rep range on every set, two sessions in a row, move that exercise up a level or slow the lowering to 3–4 seconds.',
      'Light weights still build muscle if the last few reps are hard. “Hard” means 1–3 reps short of failure, not comfortable.',
      'Write down your reps. Beating last week’s number is the whole game.',
    ],
  },
  fuel: {
    title: 'Fuel',
    lead: 'The part skinny guys skip.',
    lines: () => [
      'Protein at every meal: roughly 0.7–1 g per pound of body weight a day. Eggs, milk, Greek yogurt, chicken, tuna, beans.',
      'Eat about 300–500 calories more than you do now. Easy adds: a glass of whole milk, peanut butter toast, a bigger dinner.',
      'Weigh in once a week. Aim for +¼ to ½ lb a week. Flat for 2 weeks? Eat a bit more.',
      'Water: a glass when you wake up, one with every meal, one during training.',
    ],
  },
};

export const SAFETY = 'Not medical advice. If you have a heart, blood pressure or joint condition, check with a doctor first. Stop for chest pain, dizziness or sharp pain.';
