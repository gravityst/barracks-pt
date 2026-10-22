// The moves library: what each move is, a demo for the figure rig (js/rig.js), and a plain-English
// how-to in the same four parts every time. Variation names stay exactly as the plan has them
// (js/data.js); this file explains them.
//
// demo.poses   key poses as joint angles (see rig.js for what each angle means)
// demo.rig     { flat: which feet stay flat on the floor, pin: [joint, [x, y]] that stays put }
// demo.load    dumbbells: hand N (near) / F (far) / mid, shape 'hex' (end-on) or 'bar' at an angle
// demo.props   a chair, the stair or the couch, drawn behind the figure
// tempo[level] the loop: [pose, seconds, caption]. Slow lowering really takes its 3 seconds (a phase
//              is a captioned item plus any uncaptioned moving items after it).
// strip[level] the same move as still frames, for reduced motion
// names        what the plan calls each of the move's three levels; levels: what each one changes
// variants     other versions the plan asks for (the 1¼ lateral raise)
// Warm-up, conditioning and stretch drills live in drills.js and have one demo, no levels.

import { DRILLS } from './drills.js';

const GOBLET = {
  rig: { flat: 'both' },
  poses: {
    top: { lean: 0, hip: 0, knee: 0, sh: -12.5, el: 142 },
    bottom: { lean: 35, hip: 130, knee: 117, sh: -12.5, el: 142 },
  },
  load: [{ hand: 'N', shape: 'bar', angle: 0, offset: 11, size: 1.1, layer: 'near' }],
};
GOBLET.poses.half = { lean: 17.5, hip: 65, knee: 58.5, sh: -12.5, el: 142 };

const RDL = {
  rig: { flat: 'both' },
  poses: {
    top: { lean: 0, hip: 0, knee: 10, sh: 5, el: 0 },
    bottom: { lean: 78, hip: 102, knee: 28, sh: 58, el: 0 },
  },
  load: [{ hand: 'F', shape: 'hex' }, { hand: 'N', shape: 'hex' }],
};

// Single-leg RDL: stand on the far leg, the near leg swings back in line with your back, one 15 in
// the near hand (the hand opposite the standing leg).
const SL_RDL = {
  rig: { flat: 'far', pin: ['ankleF', [0, -7]] },
  poses: {
    top: { lean: 0, hip: 0, knee: 25, fhip: 0, fknee: 8, sh: 5, fsh: 5, ank: -15 },
    bottom: { lean: 72, hip: 5, knee: 6, fhip: 92, fknee: 22, sh: 50, fsh: 50, el: 0, ank: -20 },
  },
  load: [{ hand: 'N', shape: 'hex' }],
};

// One-arm row, seen a little from the front and above so the seat's top shows: the far knee (under
// the hip) and the far hand (under the shoulder) rest on it, that lower leg trails off the back
// edge, the near foot is on the floor beside the chair, and the 15 is in the near hand.
const ROW_BODY = { lean: 72, hip: 66, knee: 6, fhip: 87.75, fknee: 98, fank: -20, fsh: 75, fel: 0 };
const ROW = {
  rig: { flat: 'near', view: { obl: [0.6, -0.3], width: 20 } },
  poses: {
    down: { ...ROW_BODY, sh: 72, el: 5 },
    up: { ...ROW_BODY, sh: -20, el: 70 },
  },
  load: [{ hand: 'N', shape: 'bar', angle: 90 }],
  props: [{ type: 'chair', x: 20, depth: 47, seat: 46, z: [8, 46], back: 'right' }],
};

// Dead bug: on your back, head to the left. Near = your right side.
const BUG_TABLE = { lean: -90, hip: 90, knee: 90, sh: 90, el: 0, ank: 0, neck: 5 };   // chin tucked a touch
const BUG = {
  rig: { pin: ['hip', [0, -8.5]] },        // hip line 8.5 cm up: the back of a 15 cm torso on the floor
  poses: {
    table: BUG_TABLE,
    a: { ...BUG_TABLE, sh: 175, fhip: 8, fknee: 0, fsh: 90 },
    b: { ...BUG_TABLE, fsh: 175, hip: 8, knee: 0, fhip: 90, fknee: 90 },
  },
};
// Ranger: one 7 held straight up over your chest with both hands; only the legs move.
const BUG_7 = {
  rig: BUG.rig,
  poses: {
    table: BUG_TABLE,
    a: { ...BUG_TABLE, fhip: 8, fknee: 0 },
    b: { ...BUG_TABLE, hip: 8, knee: 0, fhip: 90, fknee: 90 },
  },
  load: [{ hand: 'N', shape: 'bar', angle: 0, offset: -4, size: 0.8, layer: 'near' }],
};

// ---------- the rest of the plan's moves ----------
const DB7 = 6, DB15 = 7.5;                       // a 7 lb and a 15 lb dumbbell, seen end-on
const pair = (size = DB15, more = {}) => [{ hand: 'F', shape: 'hex', size, ...more }, { hand: 'N', shape: 'hex', size, ...more }];
// Handles running front to back (palms facing in) lie in the picture.
const bars = (size = 1, more = {}) => [{ hand: 'F', shape: 'bar', angle: 90, size, ...more }, { hand: 'N', shape: 'bar', angle: 90, size, ...more }];

// Push-up: toes pinned, both hands planted (they never slide), the body one straight line.
const hands = (x, y) => ({ handN: [x, y], handF: [x + 5, y] });       // the far hand sits 5 cm over
const PU_INCLINE = {
  rig: { pin: ['toeN', [0, -3]] },
  poses: { top: { lean: 48.7, ank: -10, ik: hands(116, -49.75) }, bottom: { lean: 67, ank: -10, ik: hands(116, -49.75) } },
  props: [{ type: 'chair', x: 108, depth: 44, seat: 46, back: 'none' }],
};
const PU_FLOOR = {
  rig: { pin: ['toeN', [0, -3]] },
  poses: { top: { lean: 70.2, ank: -10, ik: hands(124, -3.75) }, bottom: { lean: 85, ank: -10, ik: hands(124, -3.75) } },
};
const PU_DECLINE = {
  rig: { pin: ['toeN', [0, -49]] },
  poses: { top: { lean: 90.4, ank: -10, ik: hands(128, -3.75) }, bottom: { lean: 104, ank: -10, ik: hands(128, -3.75) } },
  props: [{ type: 'chair', x: -26, depth: 44, seat: 46, back: 'left' }],
};

// Overhead press: dumbbells at the shoulders, forearms upright, pressed straight up.
const OHP = (size) => ({
  rig: { flat: 'both' },
  poses: { rack: { knee: 3, sh: 28, el: 150 }, top: { knee: 3, sh: 177, el: 3 } },
  load: pair(size, { push: 3 }),
});

// Lateral raise, from the front: arms out to the sides to shoulder height, elbows soft.
const LATERAL = {
  rig: { front: true },
  poses: { down: { hip: 3, sh: 9, el: 5 }, up: { hip: 3, sh: 88, el: 5 }, quarter: { hip: 3, sh: 67, el: 5 } },
  load: pair(DB7, { layer: 'near', push: 2 }),
};

// Plank on the forearms: elbows under the shoulders, forearms flat, toes pinned.
const PLANK_BODY = { lean: 82.6, sh: 82.6, el: 90, ank: -10, fhip: 0, fknee: 0 };
const PLANK = { rig: { pin: ['toeN', [0, -3]] }, poses: { hold: PLANK_BODY } };
const PLANK_LIFT = { rig: { pin: ['toeF', [0, -3]] }, poses: { hold: PLANK_BODY, lift: { ...PLANK_BODY, hip: -8 } } };

// Split squat: the hip drops straight down between two planted feet (front flat, back on its toes).
const SPLIT_FEET = { ankleN: [42, -7], ankleF: [-44, -14] };
const SPLIT = (size) => ({
  rig: { flat: 'near', pin: ['hip', [0, -84]] },
  poses: {
    top: { lean: 3, fank: -30, sh: 3, el: 5, ik: SPLIT_FEET },
    bottom: { lean: 5, fank: -35, sh: 3, el: 5, y: 31, ik: SPLIT_FEET },
  },
  load: pair(size),
});
const BULGARIAN_FEET = { ankleN: [44, -7], ankleF: [-52, -52] };
const BULGARIAN = {
  rig: { flat: 'near', pin: ['hip', [0, -80]] },
  poses: {
    top: { lean: 6, fank: -38, sh: 4, el: 5, ik: BULGARIAN_FEET },
    bottom: { lean: 10, fank: -38, sh: 4, el: 5, y: 30, ik: BULGARIAN_FEET },
  },
  load: pair(DB15),
  props: [{ type: 'chair', x: -92, depth: 44, seat: 46, back: 'left' }],
};

// Glute bridge: shoulders pinned on the floor, feet planted, the hips lift until shoulders, hips and
// knees are one line. Head to the left.
const BRIDGE_FEET = { ankleN: [92, -7], ankleF: [97, -7] };
const BRIDGE = {
  rig: { flat: 'both', pin: ['sh', [0, -8.5]] },
  poses: {
    down: { lean: -90, neck: 5, sh: -4, el: 0, ik: BRIDGE_FEET },
    up: { lean: -116, neck: 31, sh: -30, el: 0, ik: BRIDGE_FEET },
  },
};
// 15 on the hips: both hands hold it in the hip crease, so the hands ride up with the hips.
const BRIDGE_15 = {
  rig: BRIDGE.rig,
  poses: {
    down: { lean: -90, neck: 5, ik: { ...BRIDGE_FEET, handN: [50, -22], handF: [55, -22] } },
    up: { lean: -116, neck: 31, ik: { ...BRIDGE_FEET, handN: [39, -42.5], handF: [44, -42.5] } },
  },
  load: [{ hand: 'N', shape: 'hex', size: DB15, layer: 'near' }],
};
// Single-leg hip thrust: upper back on the couch edge, one foot planted, the other knee up.
const THRUST_BODY = { neck: 20, knee: 90, sh: 8, el: 15, ik: { ankleF: [95, -7] } };
const THRUST = {
  rig: { flat: 'far', pin: ['sh', [0, -46]] },
  poses: { down: { ...THRUST_BODY, lean: -52, hip: 100 }, up: { ...THRUST_BODY, lean: -90, hip: 75 } },
  props: [{ type: 'couch', x: -64, depth: 62, seat: 42, back: 'left' }],
};

// Rear-delt fly, from the front: hinged forward (the torso looks short), arms out like wings.
const FLY = {
  rig: { front: true, tilt: 28 },
  poses: { down: { lean: 70, neck: 12, hip: 4, sh: 4, el: 10 }, up: { lean: 70, neck: 12, hip: 4, sh: 84, el: 12 } },
  load: pair(DB7, { layer: 'near', push: 2 }),
};

// Curls: elbows pinned at the sides. Palms forward (curl) or down (reverse): the handle points at
// you. Thumbs up (hammer): the handle lies in the picture, across the forearm.
const CURL_BODY = { knee: 3 };
const CURL = (load, rig = { flat: 'both' }) => ({
  rig,
  poses: { down: { ...CURL_BODY, sh: 5, el: 6 }, up: { ...CURL_BODY, sh: 9, el: 140 } },
  load,
});
const CURL_DB = CURL(pair(DB15, { push: 3 }));
const HAMMER = CURL([{ hand: 'F', shape: 'bar', angle: 'fore', turn: 90, push: 4 }, { hand: 'N', shape: 'bar', angle: 'fore', turn: 90, push: 4 }]);
const REVERSE = (size) => CURL(pair(size, { push: 4 }), { flat: 'both', hands: true });

// Wrist curl: seated, forearms along the thighs, palms up; only the wrists move.
const WRIST_IK = { ankleN: [45, -7], ankleF: [50, -7], handN: [49, -61], handF: [54, -61] };
const WRIST = {
  rig: { flat: 'both', pin: ['hip', [0, -51.5]], hands: true },
  poses: { down: { lean: 42, wr: -50, ik: WRIST_IK }, up: { lean: 42, wr: 45, ik: WRIST_IK } },
  load: pair(DB15, { angle: 'hand', push: 7 }),
  props: [{ type: 'chair', x: -30, depth: 44, seat: 46, back: 'left' }],
};

// Reverse lunge: the front (near) foot stays planted; the back foot steps back and lands on its toes.
const LUNGE = (size) => ({
  rig: { flat: 'near' },
  poses: {
    stand: { knee: 2, sh: 3, el: 5, fank: 0, ik: { ankleF: [5, -7] } },
    step: { lean: 3, hip: 38, knee: 38, sh: 3, el: 5, fank: -20, ik: { ankleF: [-40, -22] } },
    bottom: { lean: 6, hip: 92, knee: 88, sh: 3, el: 5, fank: -35, ik: { ankleF: [-86, -14] } },
  },
  load: pair(size),
});

// Floor press: on your back, knees bent. At the bottom the upper arms rest on the floor, angled out
// toward you, so they look shorter (z).
const FP_FEET = { ankleN: [92, -7], ankleF: [97, -7] };
const FLOOR_PRESS = {
  rig: { flat: 'both', pin: ['sh', [0, -8.5]] },
  poses: {
    top: { lean: -90, neck: 5, sh: 82, el: 3, ik: FP_FEET },
    bottom: { lean: -90, neck: 5, sh: -8, el: 98, z: 0.72, ik: FP_FEET },
  },
  load: pair(DB15, { push: 3 }),
};

// Step-up: the near foot stays on the bottom stair; the back foot comes up beside it.
const STAIR = { type: 'stair', x: 14, h: 18, depth: 30 };
const STEP = (size) => ({
  rig: { flat: 'near', pin: ['ankleN', [24, -25]] },
  poses: {
    start: { lean: 21, hip: 80, knee: 76, sh: 3, el: 5, fank: 0, ik: { ankleF: [-14, -7] } },
    lift: { lean: 6, hip: 22, knee: 24, sh: 3, el: 5, fank: -15, ik: { ankleF: [8, -38] } },
    top: { lean: 0, hip: 0, knee: 0, sh: 3, el: 5, fank: 0, ik: { ankleF: [29, -25] } },
  },
  load: size ? pair(size) : [],
  props: [STAIR],
});

// Pike push-up: hips high, hands planted; the head comes down just in front of the hands.
const PIKE = {
  rig: { pin: ['toeN', [0, -3]] },
  poses: { top: { lean: 139, hip: 112.5, ank: -25, ik: hands(95, -3.75) }, bottom: { lean: 147, hip: 95, ank: -25, ik: hands(95, -3.75) } },
};
const PIKE_CHAIR = {
  rig: { pin: ['toeN', [0, -49]] },
  poses: { top: { lean: 163, hip: 104, ank: -25, ik: hands(105, -3.75) }, bottom: { lean: 160, hip: 80, ank: -25, ik: hands(105, -3.75) } },
  props: [{ type: 'chair', x: -26, depth: 44, seat: 46, back: 'left' }],
};

// Bent-over row: a steady hinge, both dumbbells pulled to the lower ribs.
const BOR_BODY = { lean: 60, hip: 80, knee: 22 };
const BENT_ROW = {
  rig: { flat: 'both' },
  poses: { down: { ...BOR_BODY, sh: 60, el: 4 }, up: { ...BOR_BODY, sh: -25, el: 95 } },
  load: bars(1, { push: 3 }),
};

// Calf raise: the ball of the foot is pinned and the heel rises (on the stair, it drops below the step).
const CALF = {
  rig: { pin: ['toeN', [13, -7]] },
  poses: { down: { ank: 0 }, up: { ank: -40 } },
};
const CALF_STAIR = {
  rig: { pin: ['toeN', [8, -25]] },
  poses: { down: { ank: 20 }, up: { ank: -40 } },
  load: pair(DB15, { push: 3 }),
  props: [{ type: 'stair', x: 0, h: 18, depth: 30 }],
};
const CALF_ONE = {
  rig: { pin: ['toeN', [8, -25]] },
  poses: { down: { ank: 20, fhip: 10, fknee: 75, fank: -20 }, up: { ank: -40, fhip: 10, fknee: 75, fank: -20 } },
  props: [{ type: 'stair', x: 0, h: 18, depth: 30 }],
};

// Side plank, from the front: propped on the right forearm (your left), body rolled onto its side.
// The upper arm is straight down to the floor (sh = roll); the forearm points at you, so it looks short.
const SIDE_BODY = { roll: 76, sh: 76, el: 90, z: 0.3, fsh: 5, fel: 0, fz: 1, hip: 0, fhip: 0 };
const SIDE = { rig: { front: true, pin: ['elbowN', [0, -4]] }, poses: { hold: SIDE_BODY, lift: { ...SIDE_BODY, fhip: 28 } } };

// Arnold press: dumbbells at the chin, palms in; elbows open out as the palms turn and press up.
const ARNOLD = (size) => ({
  rig: { flat: 'both' },
  poses: { chin: { knee: 3, sh: 62, el: 118 }, open: { knee: 3, sh: 28, el: 150 }, top: { knee: 3, sh: 177, el: 3 } },
  load: pair(size, { push: 3 }),
});

// Farmer's hold: standing tall, a 15 at each side, handles front to back.
const FARMER = { rig: { flat: 'both' }, poses: { hold: { knee: 2, sh: 3, el: 3 } }, load: bars(1, { push: 3 }) };
const FARMER_THICK = { ...FARMER, load: bars(1.12, { push: 3 }) };

export const MOVES = {
  'goblet-squat': {
    name: 'Goblet squat',
    names: ['Goblet squat', 'Goblet squat, 3-sec lower', '1½ goblet squat'],
    aka: 'A goblet squat is a squat with one dumbbell held upright at your chest, the way you’d hold a goblet (a big cup).',
    how: {
      setup: 'Feet a little wider than your hips, toes turned out a touch. Hold one 15 upright against your chest, both hands cupped under the top end.',
      do: 'Sit down between your heels until your thighs are level with the floor, or as low as you can with your heels down. Push the floor away to stand up.',
      feel: 'The fronts of your thighs (quads) and your backside (glutes).',
      dont: 'Let your heels lift or your knees fall inward. Knees point the same way as your toes.',
    },
    levels: ['Normal speed, smooth and controlled.', 'Take 3 full seconds to lower, then stand up at normal speed.', '1½ reps: all the way down, halfway up, down again, all the way up. That’s 1 rep.'],
    demos: [GOBLET, GOBLET, GOBLET],
    tempo: [
      [['top', 0.8, 'Stand tall'], ['bottom', 2, 'Sit down'], ['bottom', 0.4], ['top', 1.2, 'Stand up']],
      [['top', 0.8, 'Stand tall'], ['bottom', 3, 'Lower for 3 seconds'], ['bottom', 0.4], ['top', 1.2, 'Stand up']],
      [['top', 0.8, 'Stand tall'], ['bottom', 2, 'All the way down'], ['half', 1, 'Halfway up'], ['bottom', 1, 'Down again'], ['top', 1.4, 'All the way up']],
    ],
    strip: [
      [['top', 'Stand tall'], ['bottom', 'Sit between your heels, then stand']],
      [['top', 'Stand tall'], ['bottom', 'Lower for 3 seconds, then stand']],
      [['top', 'Stand tall'], ['bottom', 'All the way down'], ['half', 'Halfway up, down again, then stand']],
    ],
    alt: 'Goblet squat: from standing, sit down between your heels with the dumbbell at your chest, then stand up.',
  },
  rdl: {
    name: 'Romanian deadlift (RDL)',
    names: ['Romanian deadlift', 'RDL, 3-sec lower', 'Single-leg RDL'],
    aka: 'RDL is short for Romanian deadlift. It’s a hip hinge: you bend at the hips, not the knees, and keep your back flat. It works the backs of your legs.',
    how: {
      setup: 'Stand tall, feet hip-width, a 15 in each hand in front of your thighs. Bend your knees slightly, and keep that bend the whole time.',
      do: 'Push your hips back, like shutting a car door with your backside. Let the dumbbells slide down your legs to just below your knees, then squeeze your backside to stand up.',
      feel: 'A stretch in the backs of your thighs (hamstrings), then your backside (glutes) as you stand.',
      dont: 'Round your back. If it starts to curve, you’ve gone low enough: stop there.',
    },
    levels: ['Normal speed, smooth and controlled.', 'Take 3 full seconds to lower, then stand up at normal speed.', 'Single-leg RDL: one 15, stand on one leg and let the other leg swing back in line with your back.'],
    demos: [RDL, RDL, SL_RDL],
    tempo: [
      [['top', 0.8, 'Stand tall'], ['bottom', 2, 'Push your hips back'], ['bottom', 0.4], ['top', 1.2, 'Squeeze up']],
      [['top', 0.8, 'Stand tall'], ['bottom', 3, 'Lower for 3 seconds'], ['bottom', 0.4], ['top', 1.2, 'Squeeze up']],
      [['top', 0.8, 'Stand on one leg'], ['bottom', 2.4, 'Hinge, back leg goes back'], ['bottom', 0.4], ['top', 1.4, 'Stand up tall']],
    ],
    strip: [
      [['top', 'Stand tall, knees soft'], ['bottom', 'Hips back, back flat, then stand']],
      [['top', 'Stand tall, knees soft'], ['bottom', 'Lower for 3 seconds, then stand']],
      [['top', 'Stand on one leg'], ['bottom', 'Hinge, back leg in line, then stand']],
    ],
    alt: 'Romanian deadlift: standing with a dumbbell in each hand, push the hips back with a flat back until the weights pass the knees, then stand.',
  },
  'one-arm-row': {
    name: 'One-arm row',
    names: ['One-arm row', 'One-arm row, 3-sec lower', 'Row, pause + 3-sec lower'],
    aka: 'A row is a pull toward you: the opposite of a push-up. This one works your back, one arm at a time.',
    how: {
      setup: 'Left knee and left hand on a chair seat, right foot on the floor. A 15 in your right hand, arm hanging straight down. Back flat, about level with the floor.',
      do: 'Pull the dumbbell up to your hip, elbow brushing your side. Lower it until your arm is straight. Do all your reps, then switch sides.',
      feel: 'Your upper back and the side of your back under your armpit (lats). A little in your biceps.',
      dont: 'Twist your chest open to heave the weight up. Shoulders stay square to the floor.',
    },
    levels: ['Normal speed, smooth and controlled.', 'Take 3 full seconds to lower.', 'Pause at the top for a second, then take 3 seconds to lower.'],
    demos: [ROW, ROW, ROW],
    tempo: [
      [['down', 0.6, 'Arm long'], ['up', 1, 'Pull to your hip'], ['up', 0.3], ['down', 2, 'Lower']],
      [['down', 0.6, 'Arm long'], ['up', 1, 'Pull to your hip'], ['up', 0.3], ['down', 3, 'Lower for 3 seconds']],
      [['down', 0.6, 'Arm long'], ['up', 1, 'Pull to your hip'], ['up', 1, 'Pause'], ['down', 3, 'Lower for 3 seconds']],
    ],
    strip: [
      [['down', 'Arm long, back flat'], ['up', 'Pull to your hip, then lower']],
      [['down', 'Arm long, back flat'], ['up', 'Pull to your hip, lower for 3 seconds']],
      [['down', 'Arm long, back flat'], ['up', 'Pull, pause, lower for 3 seconds']],
    ],
    alt: 'One-arm row: one knee and hand on a chair, the other hand pulls a dumbbell from straight down up to the hip, then lowers it.',
  },
  'dead-bug': {
    name: 'Dead bug',
    names: ['Dead bug', 'Dead bug', 'Dead bug holding a 7'],
    aka: 'A core move done on your back, named after a bug that’s flipped over with its legs in the air.',
    how: {
      setup: 'Lie on your back. Arms straight up at the ceiling, knees bent at a right angle above your hips. Press your lower back into the floor.',
      do: 'Slowly reach one arm back over your head and straighten the opposite leg out, stopping just above the floor. Bring them back, then do the other side.',
      feel: 'Deep in your stomach (abs), working to keep your back flat.',
      dont: 'Let your lower back lift off the floor. Only go as low as you can while it stays down.',
    },
    levels: ['6 each side.', '8 each side.', 'Hold one 7 straight up over your chest with both hands. Keep it there and lower one leg at a time.'],
    demos: [BUG, BUG, BUG_7],
    tempo: [
      [['table', 0.8, 'Arms up, knees over hips'], ['a', 2, 'Opposite arm and leg out'], ['a', 0.4], ['table', 1.5, 'Back in'], ['b', 2, 'Other side'], ['b', 0.4], ['table', 1.5, 'Back in']],
      [['table', 0.8, 'Arms up, knees over hips'], ['a', 2, 'Opposite arm and leg out'], ['a', 0.4], ['table', 1.5, 'Back in'], ['b', 2, 'Other side'], ['b', 0.4], ['table', 1.5, 'Back in']],
      [['table', 0.8, 'Weight up, knees over hips'], ['a', 2, 'One leg out'], ['a', 0.4], ['table', 1.5, 'Back in'], ['b', 2, 'Other leg'], ['b', 0.4], ['table', 1.5, 'Back in']],
    ],
    strip: [
      [['table', 'Arms up, knees over hips'], ['a', 'Opposite arm and leg out'], ['b', 'Back in, then the other side']],
      [['table', 'Arms up, knees over hips'], ['a', 'Opposite arm and leg out'], ['b', 'Back in, then the other side']],
      [['table', 'Weight up, knees over hips'], ['a', 'One leg out'], ['b', 'Back in, then the other leg']],
    ],
    alt: 'Dead bug: lying on the back with arms up and knees bent over the hips, one arm reaches back and the opposite leg straightens, then they swap.',
  },
  'push-up': {
    name: 'Push-up',
    names: ['Incline push-up', 'Push-up', 'Feet-on-chair push-up'],
    aka: 'You lower your whole body to the floor and push it back up, one straight line from head to heels. It works your chest, shoulders and the backs of your arms.',
    how: {
      setup: 'Hands flat, a little wider than your shoulders and right under them. Walk your feet back until your body is one straight line from head to heels.',
      do: 'Bend your elbows and lower your chest to about a fist above the floor, elbows angled back toward your hips. Push the floor away until your arms are straight.',
      feel: 'Your chest, the fronts of your shoulders and the backs of your arms (triceps). Your stomach works to hold the line.',
      dont: 'Let your hips sag or stick up, or drop your head. The moment the line breaks, the set is over.',
    },
    levels: ['Incline: hands on the edge of a sturdy chair seat or the couch, feet on the floor. Lower your chest to the edge.', 'Hands on the floor.', 'Feet up on a chair seat, hands on the floor. More of your weight goes onto your arms.'],
    demos: [PU_INCLINE, PU_FLOOR, PU_DECLINE],
    tempo: [0, 1, 2].map(() => [['top', 0.6, 'Straight line, head to heels'], ['bottom', 1.4, 'Lower your chest'], ['bottom', 0.2], ['top', 1, 'Push the floor away']]),
    strip: [
      [['top', 'Hands on the seat, body straight'], ['bottom', 'Chest to the edge, then push up']],
      [['top', 'Straight line, head to heels'], ['bottom', 'Chest a fist above the floor, then push up']],
      [['top', 'Feet on the chair, body straight'], ['bottom', 'Chest a fist above the floor, then push up']],
    ],
    alt: 'Push-up: in a straight plank on the hands, the body lowers until the chest is near the floor, then pushes back up.',
  },
  'overhead-press': {
    name: 'Overhead press',
    names: ['Overhead press', 'Overhead press', 'Overhead press, 3-sec lower'],
    aka: 'Pressing two dumbbells from your shoulders to straight overhead, standing. It builds your shoulders and the backs of your arms.',
    how: {
      setup: 'Feet hip-width, a dumbbell in each hand at your shoulders, palms facing forward, elbows under your wrists. Squeeze your backside and stomach.',
      do: 'Press both dumbbells straight up until your arms are straight and your biceps are by your ears. Lower them back to your shoulders.',
      feel: 'Your shoulders (delts) and the backs of your arms (triceps).',
      dont: 'Lean back or arch your lower back to get the weight up. If you have to, the weight is too heavy for now.',
    },
    levels: ['With the 7s, at normal speed.', 'With the 15s, at normal speed.', 'With the 15s, and take 3 full seconds to lower.'],
    demos: [OHP(DB7), OHP(DB15), OHP(DB15)],
    tempo: [
      [['rack', 0.6, 'Dumbbells at your shoulders'], ['top', 1, 'Press straight up'], ['top', 0.3], ['rack', 1.4, 'Lower to your shoulders']],
      [['rack', 0.6, 'Dumbbells at your shoulders'], ['top', 1, 'Press straight up'], ['top', 0.3], ['rack', 1.4, 'Lower to your shoulders']],
      [['rack', 0.6, 'Dumbbells at your shoulders'], ['top', 1, 'Press straight up'], ['top', 0.3], ['rack', 3, 'Lower for 3 seconds']],
    ],
    strip: [
      [['rack', 'Dumbbells at your shoulders'], ['top', 'Press straight up, then lower']],
      [['rack', 'Dumbbells at your shoulders'], ['top', 'Press straight up, then lower']],
      [['rack', 'Dumbbells at your shoulders'], ['top', 'Press up, lower for 3 seconds']],
    ],
    alt: 'Overhead press: standing, two dumbbells pressed from the shoulders to straight overhead, then lowered.',
  },
  'lateral-raise': {
    name: 'Lateral raise',
    names: ['Lateral raise', 'Lateral raise', 'Lateral raise, 2-sec hold'],
    aka: 'Raising two light dumbbells out to your sides to shoulder height. It builds the sides of your shoulders, which is what makes them look wider.',
    how: {
      setup: 'Stand tall with a 7 in each hand by your sides, palms facing in. Bend your elbows slightly and keep that bend.',
      do: 'Raise your arms out to the sides until your hands are level with your shoulders, leading with your elbows. Lower them slowly.',
      feel: 'The sides of your shoulders (side delts).',
      dont: 'Swing or shrug the weights up, or go higher than your shoulders. Light and strict beats heavy and sloppy.',
    },
    levels: ['With the 7s, up and down at an even pace.', 'The same move: aim for the top of the rep range.', 'Hold 2 seconds at shoulder height on every rep.'],
    demos: [LATERAL, LATERAL, LATERAL],
    tempo: [
      [['down', 0.6, 'Arms by your sides'], ['up', 1.1, 'Raise to shoulder height'], ['up', 0.3], ['down', 1.5, 'Lower slowly']],
      [['down', 0.6, 'Arms by your sides'], ['up', 1.1, 'Raise to shoulder height'], ['up', 0.3], ['down', 1.5, 'Lower slowly']],
      [['down', 0.6, 'Arms by your sides'], ['up', 1.1, 'Raise to shoulder height'], ['up', 2, 'Hold 2 seconds'], ['down', 1.5, 'Lower slowly']],
    ],
    strip: [
      [['down', 'Arms by your sides'], ['up', 'Out to shoulder height, then lower']],
      [['down', 'Arms by your sides'], ['up', 'Out to shoulder height, then lower']],
      [['down', 'Arms by your sides'], ['up', 'Out to shoulder height, hold 2 seconds']],
    ],
    variants: {
      quarter: {
        name: 'Lateral raise, 1¼ reps',
        note: '1¼ reps: up, a quarter of the way down, back up, then all the way down. That’s 1 rep.',
        demo: LATERAL,
        tempo: [['down', 0.6, 'Arms by your sides'], ['up', 1.1, 'Raise to shoulder height'], ['quarter', 0.5, 'A quarter of the way down'], ['up', 0.5, 'Back up'], ['down', 1.5, 'All the way down']],
        strip: [['down', 'Arms by your sides'], ['up', 'Out to shoulder height'], ['quarter', 'A quarter down, back up, then all the way down']],
      },
    },
    alt: 'Lateral raise, seen from the front: the arms raise out to the sides to shoulder height with a dumbbell in each hand, then lower.',
  },
  plank: {
    name: 'Plank',
    names: ['Plank', 'Plank', 'Plank, one foot up'],
    aka: 'Holding your body straight and still on your forearms and toes. It trains your stomach to protect your back.',
    how: {
      setup: 'Forearms on the floor, elbows right under your shoulders. Step your feet back so your body is one straight line from head to heels.',
      do: 'Squeeze your backside and brace your stomach as if someone is about to poke it. Breathe, and hold for the time.',
      feel: 'Your stomach (abs) and your backside (glutes). Your shoulders work too.',
      dont: 'Let your hips sag toward the floor or stick up in the air. When you can’t hold the line, stop the clock.',
    },
    levels: ['Hold 20–30 seconds.', 'Hold 30–45 seconds.', 'Lift one foot a few inches off the floor and keep your hips level. Switch feet halfway.'],
    demos: [PLANK, PLANK, PLANK_LIFT],
    tempo: [
      [['hold', 2, 'Elbows under your shoulders'], ['hold', 2, 'Squeeze your backside'], ['hold', 2, 'Hips level, no sag']],
      [['hold', 2, 'Elbows under your shoulders'], ['hold', 2, 'Squeeze your backside'], ['hold', 2, 'Hips level, no sag']],
      [['hold', 1.2, 'Elbows under your shoulders'], ['lift', 1, 'Lift one foot'], ['lift', 2.4, 'Hips stay level'], ['hold', 1, 'Switch feet halfway']],
    ],
    strip: [
      [['hold', 'Elbows under your shoulders, body straight, hold']],
      [['hold', 'Elbows under your shoulders, body straight, hold']],
      [['hold', 'Body straight on your forearms'], ['lift', 'Lift one foot, hips level']],
    ],
    alt: 'Plank: on the forearms and toes, the body held in one straight line from head to heels.',
  },
  'split-squat': {
    name: 'Split squat',
    names: ['Split squat', 'Split squat', 'Bulgarian split squat'],
    aka: 'A squat with one foot forward and one foot back, both staying put. It works one leg at a time, so your weaker side can’t hide.',
    how: {
      setup: 'Take a long step: one foot well forward, the back foot on its toes. A dumbbell in each hand at your sides. Stand tall.',
      do: 'Drop your back knee straight down until it nearly touches the floor, front thigh about level. Push through your front heel to come up. All reps, then switch legs.',
      feel: 'The front of your front thigh (quads) and your backside (glutes), and a stretch at the front of your back hip.',
      dont: 'Let your front knee cave in or your front heel lift. You go down and up, not forward and back.',
    },
    levels: ['With the 7s.', 'With the 15s.', 'Bulgarian: back foot up on a chair seat, laces down, with the 15s. Much harder: expect fewer reps at first.'],
    demos: [SPLIT(DB7), SPLIT(DB15), BULGARIAN],
    tempo: [0, 1, 2].map(() => [['top', 0.6, 'Long stance, stand tall'], ['bottom', 1.6, 'Back knee straight down'], ['bottom', 0.3], ['top', 1.2, 'Push through the front heel']]),
    strip: [
      [['top', 'Long stance, stand tall'], ['bottom', 'Back knee down, then push up']],
      [['top', 'Long stance, stand tall'], ['bottom', 'Back knee down, then push up']],
      [['top', 'Back foot on the chair'], ['bottom', 'Back knee down, then push up']],
    ],
    alt: 'Split squat: one foot forward and one back, the back knee drops straight down toward the floor, then the body rises again.',
  },
  'glute-bridge': {
    name: 'Glute bridge',
    names: ['Glute bridge', 'Glute bridge, 15 lb on hips', 'Single-leg hip thrust'],
    aka: 'Lying on your back and lifting your hips. It works your backside (glutes), the biggest muscle you have.',
    how: {
      setup: 'Lie on your back, knees bent, feet flat and hip-width, heels about a hand’s length from your backside. Arms on the floor by your sides.',
      do: 'Drive through your heels and lift your hips until your body is a straight line from shoulders to knees. Squeeze your backside for a second, then lower.',
      feel: 'Your backside (glutes), and a little in the backs of your thighs.',
      dont: 'Arch your lower back to get higher. The lift comes from your hips; stop when your body is straight.',
    },
    levels: ['Body weight.', 'Rest one 15 across your hips and hold it there with both hands.', 'Single-leg hip thrust: upper back on the edge of the couch, one foot on the floor, the other knee up. All reps, then switch.'],
    demos: [BRIDGE, BRIDGE_15, THRUST],
    tempo: [
      [['down', 0.6, 'Feet flat, knees bent'], ['up', 1, 'Drive your hips up'], ['up', 1, 'Squeeze'], ['down', 1.4, 'Lower']],
      [['down', 0.6, 'Weight on your hips'], ['up', 1, 'Drive your hips up'], ['up', 1, 'Squeeze'], ['down', 1.4, 'Lower']],
      [['down', 0.6, 'Upper back on the couch'], ['up', 1, 'Drive through one heel'], ['up', 1, 'Squeeze'], ['down', 1.4, 'Lower']],
    ],
    strip: [
      [['down', 'Feet flat, knees bent'], ['up', 'Hips up, squeeze, lower']],
      [['down', 'A 15 across your hips'], ['up', 'Hips up, squeeze, lower']],
      [['down', 'Upper back on the couch, one knee up'], ['up', 'Hips up on one leg, squeeze, lower']],
    ],
    alt: 'Glute bridge: lying on the back with knees bent, the hips lift until the body is straight from shoulders to knees, then lower.',
  },
  'rear-delt-fly': {
    name: 'Rear-delt fly',
    names: ['Rear-delt fly', 'Rear-delt fly', 'Rear-delt fly, 2-sec hold'],
    aka: 'Bent forward, you lift two light dumbbells out to your sides like wings. It builds the backs of your shoulders, which is what makes you look broad.',
    how: {
      setup: 'A 7 in each hand. Soft knees, hinge forward until your chest faces the floor, arms hanging straight down, palms facing each other.',
      do: 'With a slight bend in your elbows, raise your arms out to the sides until they’re level with your back. Squeeze your shoulder blades together, then lower slowly.',
      feel: 'The backs of your shoulders (rear delts) and between your shoulder blades.',
      dont: 'Stand up or swing to get the weights up. Your back stays still; only your arms move.',
    },
    levels: ['With the 7s, up and down at an even pace.', 'The same move: aim for the top of the rep range.', 'Hold 2 seconds at the top on every rep.'],
    demos: [FLY, FLY, FLY],
    tempo: [
      [['down', 0.6, 'Hinge forward, arms down'], ['up', 1.1, 'Arms out like wings'], ['up', 0.3], ['down', 1.5, 'Lower slowly']],
      [['down', 0.6, 'Hinge forward, arms down'], ['up', 1.1, 'Arms out like wings'], ['up', 0.3], ['down', 1.5, 'Lower slowly']],
      [['down', 0.6, 'Hinge forward, arms down'], ['up', 1.1, 'Arms out like wings'], ['up', 2, 'Hold 2 seconds'], ['down', 1.5, 'Lower slowly']],
    ],
    strip: [
      [['down', 'Hinged forward, arms down'], ['up', 'Arms out like wings, then lower']],
      [['down', 'Hinged forward, arms down'], ['up', 'Arms out like wings, then lower']],
      [['down', 'Hinged forward, arms down'], ['up', 'Arms out, hold 2 seconds']],
    ],
    alt: 'Rear-delt fly, seen from the front: bent forward, the arms raise out to the sides to back level, then lower.',
  },
  curl: {
    name: 'Curl',
    names: ['Curl', 'Curl', 'Curl, 3-sec lower'],
    aka: 'The classic biceps move: you bend your elbows to bring the dumbbells up to your shoulders.',
    how: {
      setup: 'Stand tall, a 15 in each hand, arms straight down, palms facing forward. Pin your elbows to your sides.',
      do: 'Curl both dumbbells up toward your shoulders, keeping your elbows where they are. Lower until your arms are straight again.',
      feel: 'The fronts of your upper arms (biceps).',
      dont: 'Swing your body or let your elbows drift forward. If you have to swing, the set is over.',
    },
    levels: ['Normal speed, smooth and controlled.', 'The same move: aim for the top of the rep range.', 'Take 3 full seconds to lower.'],
    demos: [CURL_DB, CURL_DB, CURL_DB],
    tempo: [
      [['down', 0.6, 'Arms long, elbows pinned'], ['up', 1, 'Curl up'], ['up', 0.3], ['down', 1.6, 'Lower']],
      [['down', 0.6, 'Arms long, elbows pinned'], ['up', 1, 'Curl up'], ['up', 0.3], ['down', 1.6, 'Lower']],
      [['down', 0.6, 'Arms long, elbows pinned'], ['up', 1, 'Curl up'], ['up', 0.3], ['down', 3, 'Lower for 3 seconds']],
    ],
    strip: [
      [['down', 'Arms long, elbows pinned'], ['up', 'Curl up, then lower']],
      [['down', 'Arms long, elbows pinned'], ['up', 'Curl up, then lower']],
      [['down', 'Arms long, elbows pinned'], ['up', 'Curl up, lower for 3 seconds']],
    ],
    alt: 'Curl: standing with the elbows at the sides, the dumbbells curl up to the shoulders and lower.',
  },
  'hammer-curl': {
    name: 'Hammer curl',
    names: ['Hammer curl', 'Hammer curl', 'Hammer curl, 3-sec lower'],
    aka: 'A curl with your thumbs pointing up, like holding a hammer. It works your biceps and the tops of your forearms.',
    how: {
      setup: 'Stand tall, a 15 in each hand at your sides, palms facing your legs. Pin your elbows to your sides.',
      do: 'Curl both dumbbells up toward your shoulders with your thumbs up the whole way. Lower until your arms are straight.',
      feel: 'Your biceps and the tops of your forearms.',
      dont: 'Swing, or let your palms turn up. Your palms keep facing each other.',
    },
    levels: ['Normal speed, smooth and controlled.', 'The same move: aim for the top of the rep range.', 'Take 3 full seconds to lower.'],
    demos: [HAMMER, HAMMER, HAMMER],
    tempo: [
      [['down', 0.6, 'Thumbs up, elbows pinned'], ['up', 1, 'Curl up'], ['up', 0.3], ['down', 1.6, 'Lower']],
      [['down', 0.6, 'Thumbs up, elbows pinned'], ['up', 1, 'Curl up'], ['up', 0.3], ['down', 1.6, 'Lower']],
      [['down', 0.6, 'Thumbs up, elbows pinned'], ['up', 1, 'Curl up'], ['up', 0.3], ['down', 3, 'Lower for 3 seconds']],
    ],
    strip: [
      [['down', 'Thumbs up, elbows pinned'], ['up', 'Curl up, then lower']],
      [['down', 'Thumbs up, elbows pinned'], ['up', 'Curl up, then lower']],
      [['down', 'Thumbs up, elbows pinned'], ['up', 'Curl up, lower for 3 seconds']],
    ],
    alt: 'Hammer curl: thumbs up and palms facing each other, the dumbbells curl up to the shoulders and lower.',
  },
  'reverse-curl': {
    name: 'Reverse curl',
    names: ['Reverse curl', 'Reverse curl', 'Reverse curl'],
    aka: 'A curl with your palms facing down. It works the tops of your forearms, which is what makes them look thicker.',
    how: {
      setup: 'Stand tall, a dumbbell in each hand, arms down, palms facing behind you. Elbows pinned to your sides.',
      do: 'Curl the dumbbells up toward your shoulders with your palms still facing down and your wrists straight. Lower slowly.',
      feel: 'The tops of your forearms, and your biceps.',
      dont: 'Let your wrists bend back as you lift. If they do, the weight is too heavy.',
    },
    levels: ['With the 7s.', 'With the 7s: aim for the top of the rep range.', 'With the 15s.'],
    demos: [REVERSE(DB7), REVERSE(DB7), REVERSE(DB15)],
    tempo: [0, 1, 2].map(() => [['down', 0.6, 'Palms down, wrists straight'], ['up', 1, 'Curl up'], ['up', 0.3], ['down', 1.6, 'Lower slowly']]),
    strip: [0, 1, 2].map(() => [['down', 'Palms down, wrists straight'], ['up', 'Curl up, then lower slowly']]),
    alt: 'Reverse curl: palms facing down, the dumbbells curl up to the shoulders with straight wrists, then lower.',
  },
  'wrist-curl': {
    name: 'Wrist curl',
    names: ['Wrist curl', 'Wrist curl', 'Wrist curl'],
    aka: 'Sitting with your forearms on your thighs, you curl the dumbbells using only your wrists. It works the forearm muscles that close your grip.',
    how: {
      setup: 'Sit on a chair with a 15 in each hand. Rest your forearms on your thighs, palms up, so your wrists hang just past your knees.',
      do: 'Let the dumbbells roll down toward your fingertips, then curl them up as high as you can using only your wrists. Your forearms stay on your thighs.',
      feel: 'The undersides of your forearms.',
      dont: 'Lift your forearms off your thighs or rush it. Small, slow and the full range.',
    },
    levels: ['With the 15s, slow and through the full range.', 'The same: slow and through the full range.', 'The same: slow and through the full range.'],
    demos: [WRIST, WRIST, WRIST],
    tempo: [0, 1, 2].map(() => [['down', 0.8, 'Let it roll to your fingers'], ['up', 1, 'Curl with your wrists'], ['up', 0.3], ['down', 1.4, 'Lower slowly']]),
    strip: [0, 1, 2].map(() => [['down', 'Forearms on your thighs, wrists down'], ['up', 'Curl up with your wrists only']]),
    alt: 'Wrist curl: seated with the forearms on the thighs, palms up; only the wrists curl the dumbbells up and lower them.',
  },
  'reverse-lunge': {
    name: 'Reverse lunge',
    names: ['Reverse lunge', 'Reverse lunge', 'Reverse lunge, 3-sec lower'],
    aka: 'A lunge where you step backward instead of forward. It’s easier on the knees and works the front leg hard.',
    how: {
      setup: 'Stand tall, feet hip-width, a dumbbell in each hand at your sides.',
      do: 'Take a big step back and drop your back knee toward the floor until your front thigh is about level. Push through your front heel to step back up. Then the other leg.',
      feel: 'The front of your front thigh (quads) and your backside (glutes).',
      dont: 'Let your front knee cave in, or bang your back knee on the floor. Touch down softly, if at all.',
    },
    levels: ['With the 7s.', 'With the 15s.', 'With the 15s, and take 3 full seconds to lower.'],
    demos: [LUNGE(DB7), LUNGE(DB15), LUNGE(DB15)],
    tempo: [
      [['stand', 0.6, 'Stand tall'], ['step', 0.6, 'Step back'], ['bottom', 0.9, 'Drop the back knee'], ['bottom', 0.3], ['step', 0.9, 'Push through the front heel'], ['stand', 0.5]],
      [['stand', 0.6, 'Stand tall'], ['step', 0.6, 'Step back'], ['bottom', 0.9, 'Drop the back knee'], ['bottom', 0.3], ['step', 0.9, 'Push through the front heel'], ['stand', 0.5]],
      [['stand', 0.6, 'Stand tall'], ['step', 0.6, 'Step back'], ['bottom', 3, 'Lower for 3 seconds'], ['bottom', 0.3], ['step', 0.9, 'Push through the front heel'], ['stand', 0.5]],
    ],
    strip: [
      [['stand', 'Stand tall'], ['step', 'Step back'], ['bottom', 'Drop the back knee, then push up']],
      [['stand', 'Stand tall'], ['step', 'Step back'], ['bottom', 'Drop the back knee, then push up']],
      [['stand', 'Stand tall'], ['step', 'Step back'], ['bottom', 'Lower for 3 seconds, then push up']],
    ],
    alt: 'Reverse lunge: one foot steps back and the back knee drops toward the floor, then the front leg pushes back up to standing.',
  },
  'floor-press': {
    name: 'Floor press',
    names: ['Floor press', 'Floor press', 'Floor press, pause on floor'],
    aka: 'A bench press done lying on the floor with dumbbells. The floor stops your elbows at a safe depth.',
    how: {
      setup: 'Lie on your back, knees bent, feet flat. A 15 in each hand, arms straight up over your chest.',
      do: 'Lower the dumbbells to the sides of your chest until your upper arms touch the floor softly, elbows about 45° from your body. Press back up until your arms are straight.',
      feel: 'Your chest, the fronts of your shoulders and the backs of your arms (triceps).',
      dont: 'Bounce your elbows off the floor, or flare them straight out to the sides.',
    },
    levels: ['Normal speed, smooth and controlled.', 'The same move: aim for the top of the rep range.', 'Pause: let your upper arms rest on the floor for a full second before you press.'],
    demos: [FLOOR_PRESS, FLOOR_PRESS, FLOOR_PRESS],
    tempo: [
      [['top', 0.6, 'Arms straight up'], ['bottom', 1.5, 'Lower to the floor'], ['bottom', 0.2], ['top', 1, 'Press up']],
      [['top', 0.6, 'Arms straight up'], ['bottom', 1.5, 'Lower to the floor'], ['bottom', 0.2], ['top', 1, 'Press up']],
      [['top', 0.6, 'Arms straight up'], ['bottom', 1.5, 'Lower to the floor'], ['bottom', 1, 'Pause on the floor'], ['top', 1, 'Press up']],
    ],
    strip: [
      [['top', 'Arms straight up'], ['bottom', 'Elbows to the floor, then press']],
      [['top', 'Arms straight up'], ['bottom', 'Elbows to the floor, then press']],
      [['top', 'Arms straight up'], ['bottom', 'Elbows on the floor, pause, then press']],
    ],
    alt: 'Floor press: lying on the back, two dumbbells lower until the upper arms touch the floor, then press straight up.',
  },
  'step-up': {
    name: 'Step-up',
    names: ['Step-up', 'Step-up', 'Step-up, 3-sec lower'],
    aka: 'Stepping up onto the bottom stair and standing tall on it. It works one leg at a time, like climbing.',
    how: {
      setup: 'Face the bottom stair and put one whole foot flat on it. If your level uses weights, a dumbbell in each hand at your sides.',
      do: 'Push through the foot on the stair to stand up tall on it, and bring the other foot up beside it. Step back down with that same foot. All your reps, then switch.',
      feel: 'The front of your thigh (quads) and your backside (glutes), on the leg doing the work.',
      dont: 'Push off the bottom foot. The leg on the stair does the lifting; the other foot just comes along.',
    },
    levels: ['Body weight.', 'With the 7s.', 'With the 15s, and take 3 full seconds to step down.'],
    demos: [STEP(0), STEP(DB7), STEP(DB15)],
    tempo: [
      [['start', 0.6, 'Whole foot on the stair'], ['lift', 0.6, 'Push through the top leg'], ['top', 0.6], ['top', 0.3, 'Stand tall'], ['lift', 0.7, 'Step down'], ['start', 0.6]],
      [['start', 0.6, 'Whole foot on the stair'], ['lift', 0.6, 'Push through the top leg'], ['top', 0.6], ['top', 0.3, 'Stand tall'], ['lift', 0.7, 'Step down'], ['start', 0.6]],
      [['start', 0.6, 'Whole foot on the stair'], ['lift', 0.6, 'Push through the top leg'], ['top', 0.6], ['top', 0.3, 'Stand tall'], ['lift', 1.4, 'Lower for 3 seconds'], ['start', 1.6]],
    ],
    strip: [
      [['start', 'Whole foot on the stair'], ['top', 'Stand tall on it, then step down']],
      [['start', 'Whole foot on the stair'], ['top', 'Stand tall on it, then step down']],
      [['start', 'Whole foot on the stair'], ['top', 'Stand tall, step down for 3 seconds']],
    ],
    alt: 'Step-up: one foot on the bottom stair pushes the body up to stand tall on it, then steps back down.',
  },
  'pike-push-up': {
    name: 'Pike push-up',
    names: ['Pike push-up', 'Pike push-up', 'Feet-on-chair pike'],
    aka: 'A push-up with your hips high in the air, so you press at an angle like an overhead press. It builds your shoulders with no weights at all.',
    how: {
      setup: 'Start in a push-up position, then walk your feet in and lift your hips high, so your body makes an upside-down V. Hands shoulder-width.',
      do: 'Bend your elbows and lower the top of your head toward the floor just in front of your hands. Push back up until your arms are straight.',
      feel: 'Your shoulders and the backs of your arms (triceps).',
      dont: 'Let your hips drop so it turns into a normal push-up. Hips stay high the whole time.',
    },
    levels: ['Feet on the floor.', 'The same move: aim for the top of the rep range.', 'Feet up on a chair seat, hips high over your shoulders. Much harder.'],
    demos: [PIKE, PIKE, PIKE_CHAIR],
    tempo: [0, 1, 2].map(() => [['top', 0.6, 'Hips high'], ['bottom', 1.4, 'Head toward the floor'], ['bottom', 0.2], ['top', 1, 'Push back up']]),
    strip: [
      [['top', 'Hips high, arms straight'], ['bottom', 'Head toward the floor, then push up']],
      [['top', 'Hips high, arms straight'], ['bottom', 'Head toward the floor, then push up']],
      [['top', 'Feet on the chair, hips high'], ['bottom', 'Head toward the floor, then push up']],
    ],
    alt: 'Pike push-up: hips high in an upside-down V, the elbows bend to bring the head toward the floor, then press back up.',
  },
  'bent-over-row': {
    name: 'Bent-over row',
    names: ['Bent-over row', 'Bent-over row', 'Bent-over row, 2-sec squeeze'],
    aka: 'Bent forward at the hips, you row both dumbbells up to your ribs. It works your whole back.',
    how: {
      setup: 'A 15 in each hand, palms facing in. Soft knees, push your hips back and lean forward until your back is flat at about 45°, arms hanging down.',
      do: 'Pull both dumbbells up to your lower ribs, squeezing your shoulder blades together. Lower until your arms are straight.',
      feel: 'Your upper back, the sides of your back (lats) and a little in your biceps.',
      dont: 'Round your back or stand up as you pull. Your back stays at the same angle; only your arms move.',
    },
    levels: ['Normal speed, smooth and controlled.', 'The same move: aim for the top of the rep range.', 'Squeeze for 2 seconds at the top of every rep.'],
    demos: [BENT_ROW, BENT_ROW, BENT_ROW],
    tempo: [
      [['down', 0.6, 'Hinge, back flat'], ['up', 1, 'Pull to your ribs'], ['up', 0.3], ['down', 1.5, 'Lower']],
      [['down', 0.6, 'Hinge, back flat'], ['up', 1, 'Pull to your ribs'], ['up', 0.3], ['down', 1.5, 'Lower']],
      [['down', 0.6, 'Hinge, back flat'], ['up', 1, 'Pull to your ribs'], ['up', 2, 'Squeeze 2 seconds'], ['down', 1.5, 'Lower']],
    ],
    strip: [
      [['down', 'Hinge, back flat, arms long'], ['up', 'Pull to your ribs, then lower']],
      [['down', 'Hinge, back flat, arms long'], ['up', 'Pull to your ribs, then lower']],
      [['down', 'Hinge, back flat, arms long'], ['up', 'Pull, squeeze 2 seconds, lower']],
    ],
    alt: 'Bent-over row: hinged forward with a flat back, both dumbbells pull up to the ribs, then lower.',
  },
  'calf-raise': {
    name: 'Calf raise',
    names: ['Calf raise', 'Calf raise on stair', 'Single-leg calf raise'],
    aka: 'Rising up onto your toes and lowering back down. It builds your calves.',
    how: {
      setup: 'Stand tall, a hand on the wall or the rail for balance. On the stair: the balls of your feet on the edge, heels hanging off.',
      do: 'Rise as high as you can onto your toes, squeeze for a moment, then lower slowly. On the stair, let your heels drop below the step for a full stretch.',
      feel: 'Your calves, the backs of your lower legs.',
      dont: 'Bounce. The stretch at the bottom and the squeeze at the top are what make it work.',
    },
    levels: ['On the floor, both feet.', 'On the bottom stair with the 15s, heels hanging off.', 'On the stair, one foot at a time, the other foot tucked behind.'],
    demos: [CALF, CALF_STAIR, CALF_ONE],
    tempo: [
      [['down', 0.6, 'Heels down'], ['up', 1, 'Rise onto your toes'], ['up', 0.5, 'Squeeze'], ['down', 1.4, 'Lower slowly']],
      [['down', 0.6, 'Heels below the step'], ['up', 1.1, 'Rise onto your toes'], ['up', 0.5, 'Squeeze'], ['down', 1.5, 'Lower slowly']],
      [['down', 0.6, 'Heel below the step'], ['up', 1.1, 'Rise onto your toes'], ['up', 0.5, 'Squeeze'], ['down', 1.5, 'Lower slowly']],
    ],
    strip: [
      [['down', 'Heels down'], ['up', 'Rise onto your toes, then lower']],
      [['down', 'Heels below the step'], ['up', 'Rise onto your toes, then lower']],
      [['down', 'One foot, heel below the step'], ['up', 'Rise onto your toes, then lower']],
    ],
    alt: 'Calf raise: standing, the heels lift as high as they can onto the toes, then lower.',
  },
  'side-plank': {
    name: 'Side plank',
    names: ['Side plank', 'Side plank', 'Side plank, top leg up'],
    aka: 'A plank on your side, propped on one forearm. It works the sides of your stomach (obliques).',
    how: {
      setup: 'Lie on your side with your elbow right under your shoulder, forearm on the floor and your feet stacked.',
      do: 'Lift your hips until your body is a straight line from head to feet. Hold for the time, then switch sides.',
      feel: 'The side of your stomach nearest the floor (obliques), and your shoulder.',
      dont: 'Let your hips sag toward the floor. When they start to drop, stop the clock and switch sides.',
    },
    levels: ['Hold 20 seconds each side.', 'Hold 30 seconds each side.', 'Lift your top leg and keep it up, 45 seconds each side.'],
    demos: [SIDE, SIDE, SIDE],
    tempo: [
      [['hold', 2, 'Elbow under your shoulder'], ['hold', 2, 'Hips up, one straight line'], ['hold', 2, 'Breathe and hold']],
      [['hold', 2, 'Elbow under your shoulder'], ['hold', 2, 'Hips up, one straight line'], ['hold', 2, 'Breathe and hold']],
      [['hold', 1.2, 'Elbow under your shoulder'], ['lift', 1, 'Lift your top leg'], ['lift', 2.4, 'Keep it up and hold'], ['hold', 1, 'Switch sides at the end']],
    ],
    strip: [
      [['hold', 'Elbow under your shoulder, hips up, hold']],
      [['hold', 'Elbow under your shoulder, hips up, hold']],
      [['hold', 'Elbow under your shoulder, hips up'], ['lift', 'Top leg up, hold']],
    ],
    alt: 'Side plank, seen from the front: propped on one forearm with the feet stacked, the body held in a straight line from head to feet.',
  },
  'arnold-press': {
    name: 'Arnold press',
    names: ['Arnold press', 'Arnold press', 'Arnold press'],
    aka: 'An overhead press that starts with your palms facing you and turns them forward on the way up. It works the fronts and sides of your shoulders.',
    how: {
      setup: 'Stand tall with a dumbbell in each hand at your chin, palms facing you, elbows in front of you.',
      do: 'As you press up, open your elbows out to the sides and turn your palms forward, finishing with your arms straight overhead. Reverse it on the way down.',
      feel: 'Your shoulders, front and sides, and the backs of your arms.',
      dont: 'Lean back or rush the turn. It’s one smooth movement up and one smooth movement down.',
    },
    levels: ['With the 7s.', 'With the 15s.', 'With the 15s: aim for the top of the rep range.'],
    demos: [ARNOLD(DB7), ARNOLD(DB15), ARNOLD(DB15)],
    tempo: [0, 1, 2].map(() => [['chin', 0.6, 'Palms facing you'], ['open', 0.6, 'Open your elbows, turn'], ['top', 0.7, 'Press straight up'], ['top', 0.3], ['open', 0.9, 'Lower and turn back'], ['chin', 0.6]]),
    strip: [0, 1, 2].map(() => [['chin', 'At your chin, palms facing you'], ['open', 'Elbows open, palms turn forward'], ['top', 'Press up, then reverse it']]),
    alt: 'Arnold press: the dumbbells start at the chin with palms in and press overhead while the palms turn forward, then reverse.',
  },
  'farmers-hold': {
    name: 'Farmer’s hold',
    names: ['Farmer’s hold', 'Farmer’s hold', 'Farmer’s hold, thick grip'],
    aka: 'Standing still with heavy dumbbells at your sides, the way a farmer carries buckets. It builds your grip and forearms.',
    how: {
      setup: 'Stand tall with a 15 in each hand at your sides, palms facing in.',
      do: 'Squeeze the handles as hard as you can. Shoulders down and back, chest up, stomach braced. Hold for the time.',
      feel: 'Your hands and forearms, and the tops of your shoulders (traps).',
      dont: 'Let your shoulders round forward or the dumbbells drift away from your sides.',
    },
    levels: ['Hold 30 seconds.', 'Hold 45 seconds.', 'Thick grip: wrap a hand towel around each handle, and hold 60 seconds.'],
    demos: [FARMER, FARMER, FARMER_THICK],
    tempo: [0, 1, 2].map((L) => [['hold', 2, L === 2 ? 'Towel round the handles' : 'Stand tall'], ['hold', 2, 'Squeeze the handles hard'], ['hold', 2, 'Shoulders down and back']]),
    strip: [0, 1, 2].map((L) => [['hold', L === 2 ? 'Towel round the handles, squeeze, hold' : 'Stand tall, squeeze the handles, hold']]),
    alt: 'Farmer’s hold: standing tall, a heavy dumbbell held at each side.',
  },
};

// Which library move each plan move is, per level: 'slug' (that move at the same level), or one ref
// per level, 'slug:1' (that level of the move) or 'slug:quarter' (a variant).
export const PLAN_MOVES = {
  A1: 'goblet-squat', A2: 'push-up', A3: 'rdl', A4: 'overhead-press', A5: 'lateral-raise', A6: 'plank',
  B1: 'split-squat', B2: 'one-arm-row', B3: 'glute-bridge', B4: 'rear-delt-fly', B5: ['curl:0', 'curl:1', 'hammer-curl:2'], B6: 'dead-bug',
  C1: 'reverse-lunge', C2: 'floor-press', C3: 'step-up', C4: 'pike-push-up', C5: 'bent-over-row', C6: 'calf-raise', C7: 'side-plank',
  AF1: 'arnold-press', AF2: ['lateral-raise:0', 'lateral-raise:1', 'lateral-raise:quarter'], AF3: 'curl',
  BF1: ['hammer-curl:0', 'hammer-curl:1', 'hammer-curl:1'], BF2: 'reverse-curl', BF3: 'wrist-curl',
  CF1: 'farmers-hold', CF2: ['lateral-raise:0', 'lateral-raise:1', 'lateral-raise:1'],
};

/** Every move with a demo: the plan's strength moves, then the warm-up, conditioning and stretches. */
export const LIBRARY = { ...MOVES, ...DRILLS };

const clampL = (L) => Math.max(0, Math.min(2, +L || 0));

/** One demo of a library move: `key` is a level (0–2), a variant name, or nothing for a drill. */
export function demoOf(slug, key) {
  const m = LIBRARY[slug];
  if (!m) return null;
  const v = typeof key === 'string' && m.variants && m.variants[key];
  if (v) return { slug, move: m, level: null, variant: key, name: v.name, note: v.note, demo: v.demo, seq: v.tempo, strip: v.strip, key: `${slug}:${key}` };
  const L = m.demos.length === 1 ? 0 : clampL(key);
  return { slug, move: m, level: L, name: m.names ? m.names[L] : m.name, note: m.levels ? m.levels[L] : null, demo: m.demos[L], seq: m.tempo[L], strip: m.strip[L], key: `${slug}:${L}` };
}

function refOf(planId, L) {
  const r = PLAN_MOVES[planId];
  if (!r) return null;
  const [slug, k] = (Array.isArray(r) ? r[L] : r).split(':');
  return [slug, k === undefined ? L : /^\d$/.test(k) ? +k : k];
}

/** Everything the screens need for a plan move at a level, or null if it isn't in the library. */
export function moveInfo(planId, level) {
  const L = clampL(level);
  const ref = refOf(planId, L);
  const d = ref && demoOf(ref[0], ref[1]);
  return d ? { ...d, level: L } : null;
}

/** What each level of a plan move changes, the way the plan uses it. */
export function levelNotes(planId) {
  return [0, 1, 2].map((L) => { const i = moveInfo(planId, L); return i ? i.note : null; });
}
