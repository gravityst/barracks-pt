// Warm-up, conditioning and stretch drills: one demo each, no levels. Same shape as the strength
// moves in moves.js (how, demos, tempo, strip, alt), plus `used`: where the plan asks for it.
// Pose angles are explained in rig.js.

const opt = (it) => it.filter((v) => v !== undefined);

// ---------- warm-up ----------
// Jumping jacks, from the front: feet out and arms overhead, feet in and arms down.
const JACKS = {
  rig: { front: true },
  poses: {
    in: { hip: 2, sh: 6, el: 4 },
    air: { hip: 9, sh: 92, el: 6, y: -9 },
    out: { hip: 15, sh: 168, el: 8 },
  },
};
const jacks = [0, 1, 2, 3].flatMap((i) => [opt(['air', 0.2, i ? undefined : 'Jump out, arms overhead']), ['out', 0.2], ['air', 0.2], ['in', 0.2]]);

// Arm circles, from the front: arms straight out, small circles.
const CIRCLES = {
  rig: { front: true },
  poses: { c0: { hip: 3, sh: 90 }, c1: { hip: 3, sh: 98, z: 0.96 }, c2: { hip: 3, sh: 90, z: 0.9 }, c3: { hip: 3, sh: 82, z: 0.96 } },
};
const circles = [0, 1, 2].flatMap((i) => [opt(['c1', 0.3, i ? undefined : 'Small circles, arms straight']), ['c2', 0.3], ['c3', 0.3], ['c0', 0.3]]);

// Bodyweight squat: arms come forward for balance as you sit down.
const SQUAT = {
  rig: { flat: 'both' },
  poses: { top: { sh: 0, el: 6 }, bottom: { lean: 35, hip: 130, knee: 117, sh: 90, el: 0 } },
};

// Hip hinge: hands slide down the thighs, back flat, knees soft.
const HINGE = {
  rig: { flat: 'both' },
  poses: { top: { knee: 10, sh: 5, el: 0 }, bottom: { lean: 72, hip: 94, knee: 22, sh: 52, el: 0 } },
};

// Inchworm: toes pinned. Fold with hands to the floor, walk the hands out to a plank and back.
const INCH = {
  rig: { pin: ['toeN', [0, -3]] },
  poses: {
    stand: { y: -4, ank: 0, sh: 0, el: 6 },
    fold: { y: -4, lean: 129, hip: 139, knee: 30, flat: 'both', ik: { handN: [38, -3.75], handF: [43, -3.75] } },
    walk: { lean: 123, hip: 93, ank: -10, ik: { handN: [78, -3.75], handF: [83, -3.75] } },
    plank: { lean: 70.2, ank: -10, ik: { handN: [124, -3.75], handF: [129, -3.75] } },
  },
};

// Marching on the spot: the hip is pinned at standing height, the knees come up in turn with the
// opposite arm swinging forward.
const MARCH = {
  rig: { pin: ['hip', [0, -95]] },
  poses: {
    stand: { flat: 'both', sh: 0, el: 12, ik: { ankleN: [0, -7], ankleF: [5, -7] } },
    upN: { hip: 78, knee: 85, ank: 5, sh: -22, el: 40, fsh: 35, fel: 50, fank: 0, flat: 'far', ik: { ankleF: [5, -7] } },
    upF: { fhip: 78, fknee: 85, fank: 5, fsh: -22, fel: 40, sh: 35, el: 50, ank: 0, flat: 'near', ik: { ankleN: [0, -7] } },
  },
};

// ---------- conditioning ----------
// Squat thrust and burpee: the hip is pinned at standing height and moved by x/y; hands and feet are
// planted where they land. The plank is the push-up's top position with the hands at x 44.
const T_FEET = { ankleN: [0, -7], ankleF: [5, -7] };
const T_HANDS = { handN: [44, -3.75], handF: [49, -3.75] };
const THRUST = {
  rig: { pin: ['hip', [0, -95]] },
  poses: {
    stand: { sh: 0, el: 8, ik: T_FEET },
    squat: { lean: 62, x: -4, y: 58, ank: 32, ik: { ankleN: [-1, -12], ankleF: [4, -12], ...T_HANDS } },   // on the balls of the feet
    // Mid-jump: hips up, knees tucked, so the feet clear the floor on the way back and in.
    kick: { lean: 81, x: 5, y: 41, ank: -10, ik: { ...T_HANDS, ankleN: [-62, -26], ankleF: [-57, -26] } },
    // Straight legs, the feet exactly where the push-up puts them (planted, so they jump in a line).
    plank: { lean: 70.2, ank: -10, x: 0.6, y: 49.4, ik: { ...T_HANDS, ankleN: [-82.2, -15.79], ankleF: [-77.2, -15.79] } },
    chest: { lean: 85, ank: -10, x: 8.8, y: 71.4, ik: { ...T_HANDS, ankleN: [-78.87, -15.93], ankleF: [-73.87, -15.93] } },
    jump: { y: -14, sh: 172, el: 4, ank: -30, ik: { ankleN: [0, -21], ankleF: [5, -21] } },
  },
};

// Mountain climbers: the push-up's top position, hips still, knees driving in one at a time.
const MC_HANDS = { handN: [124, -3.75], handF: [129, -3.75] };
const CLIMBER = {
  rig: { pin: ['hip', [80.6, -45.6]] },
  poses: {
    // Both feet are planted targets, so they slide past each other in a line just off the floor.
    a: { lean: 70.2, ank: -30, fank: -10, ik: { ...MC_HANDS, ankleN: [70.47, -17.2], ankleF: [2.81, -15.8] } },
    b: { lean: 70.2, fank: -30, ank: -10, ik: { ...MC_HANDS, ankleN: [-2.19, -15.8], ankleF: [75.47, -17.2] } },
  },
};

// Flutter kicks: on your back, hands under your hips, legs low, small fast kicks.
const FLUTTER = {
  rig: { pin: ['hip', [0, -8.5]] },
  poses: {
    a: { lean: -90, neck: 12, sh: 0, el: 0, hip: 15, fhip: 6, ank: -20 },
    b: { lean: -90, neck: 12, sh: 0, el: 0, hip: 6, fhip: 15, ank: -20 },
  },
};

// Sit-up: knees bent, feet flat, arms crossed on your chest; sit all the way up.
const SIT_FEET = { ankleN: [40, -7], ankleF: [45, -7] };
const SITUP = {
  rig: { flat: 'both', pin: ['hip', [0, -8.5]] },
  poses: {
    down: { lean: -90, neck: 5, sh: 20, el: 150, ik: SIT_FEET },
    up: { lean: -12, neck: 12, sh: 20, el: 150, ik: SIT_FEET },
  },
};

// ---------- mobility and cool-down ----------
// World's greatest stretch: a long lunge, hands down, the elbow drops to the front instep, then the
// near arm reaches to the ceiling. In profile the front knee sits beside the chest and the reach is
// a twist, not a raise, so the hip and shoulder read past their usual range (rig.rom).
const WGS_FEET = { ankleN: [40, -7], ankleF: [-78, -16] };
const WGS = {
  rig: { flat: 'near', pin: ['hip', [0, -40]], rom: { hip: 178, sh: 250 } },
  poses: {
    lunge: { lean: 70, fank: -25, ik: { ...WGS_FEET, handN: [36, -3.75], handF: [41, -3.75] } },
    elbow: { lean: 74, fank: -25, sh: 62, el: 112, ik: { ...WGS_FEET, handF: [41, -3.75] } },
    reach: { lean: 66, fank: -25, sh: 244, el: 0, ik: { ...WGS_FEET, handF: [41, -3.75] } },
  },
};

// Deep squat hold: heels down, hands together, elbows pushing the knees out.
const DEEP = { rig: { flat: 'both' }, poses: { hold: { lean: 24, hip: 138, knee: 150, sh: 32, el: 125 } } };

// All fours (cat-cow, thread the needle): the near knee pinned, hips over knees, hands under shoulders.
const FOURS = { lean: 75, hip: 75, knee: 105, ank: 5, ik: { handN: [48, -3.75], handF: [53, -3.75] } };
const CATCOW = {
  rig: { pin: ['kneeN', [0, -4.5]] },
  poses: { cat: { ...FOURS, curve: 10, neck: 40 }, cow: { ...FOURS, curve: -9, neck: -28 } },
};
const NEEDLE = {
  rig: { pin: ['kneeN', [0, -4.5]] },
  poses: {
    fours: FOURS,
    thread: { ...FOURS, lean: 95, neck: 35, sh: 95, el: 30, z: 0.5, fz: 1, ik: { handF: [53, -3.75] } },
  },
};

// Couch stretch: back knee on the floor against the couch, that shin up its front, top of the foot
// on the seat; front foot planted. Tall torso, squeeze the back glute.
const COUCH = {
  rig: { flat: 'near', pin: ['kneeF', [0, -4.5]] },
  poses: {
    set: { lean: -2, fhip: -22, fknee: 155, fank: -5, sh: 35, el: 45, ik: { ankleN: [48, -7] } },
    squeeze: { lean: -6, fhip: -30, fknee: 151, fank: -5, sh: 35, el: 45, ik: { ankleN: [48, -7] } },
  },
  props: [{ type: 'couch', x: -64, depth: 62, seat: 42, back: 'left' }],
};

// Hip-flexor stretch: half-kneeling, back toes tucked, hips forward.
const FLEXOR = {
  rig: { flat: 'near', pin: ['kneeF', [0, -4.5]] },
  poses: {
    set: { lean: 0, fhip: -20, fknee: 85.5, fank: 15.5, sh: 35, el: 45, ik: { ankleN: [48, -7] } },
    squeeze: { lean: -3, fhip: -29, fknee: 79.5, fank: 15.5, sh: 35, el: 45, ik: { ankleN: [48, -7] } },
  },
};

// Forward fold: soft knees, hang forward, reach for your toes.
const FOLD = {
  rig: { flat: 'both' },
  poses: { hang: { lean: 124, hip: 134, knee: 14, sh: 124, el: 5, neck: 10 }, reach: { lean: 130, hip: 138, knee: 12, sh: 128, el: 0, neck: 15 } },
};

const one = ({ demo, seq, stills, ...o }) => ({ ...o, levels: null, names: null, demos: [demo], tempo: [seq], strip: [stills] });

export const DRILLS = {
  'jumping-jacks': one({
    name: 'Jumping jacks',
    aka: 'Jumping your feet out while your arms swing overhead, then back in. It gets your heart going and warms up your whole body.',
    how: {
      setup: 'Stand tall, feet together, arms by your sides.',
      do: 'Jump your feet out wider than your shoulders as your arms swing up overhead, then jump back in as they come down. Keep a steady rhythm.',
      feel: 'Your heart rate climbing, and your calves and shoulders warming up.',
      dont: 'Land flat-footed and stiff. Stay light on the balls of your feet.',
    },
    demo: JACKS, seq: jacks, stills: [['in', 'Feet together, arms down'], ['out', 'Jump out, arms overhead']],
    alt: 'Jumping jacks, seen from the front: the feet jump out as the arms swing overhead, then back in.',
    used: ['Warm-up', 'Echo warm-up'],
  }),
  'arm-circles': one({
    name: 'Arm circles',
    aka: 'Small circles with your arms held straight out to the sides. They loosen your shoulders before any pressing or raising.',
    how: {
      setup: 'Stand tall with your arms straight out to the sides at shoulder height.',
      do: 'Draw small circles about the size of a dinner plate: 10 going forward, then 10 going backward.',
      feel: 'Warmth in your shoulders. They may burn a little by the end.',
      dont: 'Let your arms drop below shoulder height or bend your elbows.',
    },
    demo: CIRCLES, seq: circles, stills: [['c0', 'Arms straight out to the sides'], ['c1', 'Small circles, 10 each way']],
    alt: 'Arm circles, seen from the front: arms held straight out to the sides, drawing small circles.',
    used: ['Warm-up'],
  }),
  'bodyweight-squat': one({
    name: 'Squat',
    aka: 'A squat with no weight: you sit down between your heels and stand back up.',
    how: {
      setup: 'Feet a little wider than your hips, toes turned out a touch, arms by your sides.',
      do: 'Sit down between your heels as low as you can with your heels down, arms reaching forward for balance. Push the floor away to stand.',
      feel: 'The fronts of your thighs and your backside.',
      dont: 'Let your heels lift or your knees fall inward.',
    },
    demo: SQUAT, seq: [['top', 0.6, 'Stand tall'], ['bottom', 1.2, 'Sit down, arms forward'], ['bottom', 0.2], ['top', 1, 'Stand up']],
    stills: [['top', 'Stand tall'], ['bottom', 'Sit between your heels, then stand']],
    alt: 'Squat: from standing, the body sits down between the heels with the arms reaching forward, then stands.',
    used: ['Warm-up', 'Echo warm-up', 'Foxtrot: hearts'],
  }),
  'hip-hinge': one({
    name: 'Hip hinge',
    aka: 'Bending forward at the hips with a flat back, the movement behind every deadlift. It warms up the backs of your legs.',
    how: {
      setup: 'Stand tall, feet hip-width, knees slightly bent, hands on the fronts of your thighs.',
      do: 'Push your hips back and let your hands slide down to your knees, back flat. Squeeze your backside to stand up.',
      feel: 'A stretch in the backs of your thighs.',
      dont: 'Round your back or bend your knees into a squat.',
    },
    demo: HINGE, seq: [['top', 0.6, 'Stand tall'], ['bottom', 1.4, 'Push your hips back'], ['bottom', 0.2], ['top', 1.1, 'Squeeze up']],
    stills: [['top', 'Stand tall, knees soft'], ['bottom', 'Hips back, back flat, then stand']],
    alt: 'Hip hinge: from standing, the hips push back and the flat back tips forward, then the body stands up.',
    used: ['Warm-up'],
  }),
  inchworm: one({
    name: 'Inchworm',
    aka: 'Folding forward, walking your hands out to a plank and back again. It stretches the backs of your legs and wakes up your shoulders.',
    how: {
      setup: 'Stand tall, feet hip-width.',
      do: 'Fold forward and put your hands on the floor, bending your knees as much as you need. Walk your hands out to a plank, then walk them back and stand up.',
      feel: 'A stretch in the backs of your legs, then your shoulders and stomach in the plank.',
      dont: 'Let your hips sag when you reach the plank.',
    },
    demo: INCH,
    seq: [['stand', 0.6, 'Stand tall'], ['fold', 1.4, 'Fold, hands to the floor'], ['walk', 1.2, 'Walk your hands out'], ['plank', 1], ['plank', 0.5, 'Plank'], ['walk', 1.1, 'Walk them back'], ['fold', 1], ['stand', 1.4, 'Stand up']],
    stills: [['stand', 'Stand tall'], ['fold', 'Hands to the floor'], ['plank', 'Walk out to a plank, back, stand']],
    alt: 'Inchworm: from standing, the hands go to the floor and walk out to a plank, then walk back and the body stands.',
    used: ['Warm-up', 'Echo warm-up'],
  }),
  marching: one({
    name: 'Marching on the spot',
    aka: 'Marching in place, knees up, arms swinging. An easy way to raise your heart rate.',
    how: {
      setup: 'Stand tall with your arms by your sides.',
      do: 'March in place, bringing each knee up toward hip height and swinging the opposite arm forward. Pick up the pace as you warm up.',
      feel: 'Your heart rate rising and your hips loosening.',
      dont: 'Lean back or shuffle. Stand tall and lift your knees.',
    },
    demo: MARCH, seq: [0, 1].flatMap((i) => [opt(['upN', 0.4, i ? undefined : 'Knees up, arms swinging']), ['stand', 0.35], ['upF', 0.4], ['stand', 0.35]]),
    stills: [['upN', 'Knee up, opposite arm forward'], ['upF', 'Then the other side']],
    alt: 'Marching on the spot: the knees lift in turn toward hip height while the opposite arm swings forward.',
    used: ['Echo warm-up'],
  }),
  'squat-thrust': one({
    name: 'Squat thrust',
    aka: 'Hands down, feet jump back to a plank, feet jump in, stand up. A burpee without the push-up and the jump.',
    how: {
      setup: 'Stand tall, feet hip-width.',
      do: 'Squat and put your hands on the floor. Jump your feet back to a plank, jump them back in, and stand up. That’s 1 rep.',
      feel: 'Your heart rate, your legs and your shoulders.',
      dont: 'Let your hips sag when your feet land in the plank.',
    },
    demo: THRUST,
    seq: [['stand', 0.7, 'Stand'], ['squat', 0.6, 'Hands down'], ['kick', 0.15, 'Jump your feet back'], ['plank', 0.25], ['plank', 0.3], ['kick', 0.15, 'Jump them in'], ['squat', 0.25], ['stand', 0.8, 'Stand up']],
    stills: [['stand', 'Stand'], ['squat', 'Hands down'], ['plank', 'Feet back, then in, then stand']],
    alt: 'Squat thrust: the hands go to the floor, the feet jump back to a plank and back in, then the body stands.',
    used: ['Echo, Recruit: odd minutes'],
  }),
  burpee: one({
    name: 'Burpee',
    aka: 'Down to the floor and back up with a jump at the top. The classic all-body conditioning move.',
    how: {
      setup: 'Stand tall, feet hip-width.',
      do: 'Hands down, jump your feet back to a plank, lower your chest to the floor, push up, jump your feet in, then jump up with your arms overhead.',
      feel: 'Everything, mostly your lungs.',
      dont: 'Belly-flop or let your hips sag. If your form goes, slow down, or step your feet back instead of jumping.',
    },
    demo: THRUST,
    seq: [['stand', 0.5, 'Stand'], ['squat', 0.5, 'Hands down'], ['kick', 0.15, 'Feet back'], ['plank', 0.2], ['chest', 0.6, 'Chest to the floor'], ['plank', 0.6, 'Push up'], ['kick', 0.15, 'Feet in'], ['squat', 0.2], ['jump', 0.45, 'Jump, arms up'], ['stand', 0.45]],
    stills: [['squat', 'Hands down'], ['chest', 'Feet back, chest to the floor'], ['jump', 'Feet in, jump up']],
    alt: 'Burpee: hands down, feet back, chest to the floor, push up, feet in, then a jump with the arms overhead.',
    used: ['Echo, Regular and Ranger: odd minutes', 'Foxtrot: clubs'],
  }),
  'mountain-climber': one({
    name: 'Mountain climbers',
    aka: 'In a push-up position, driving your knees toward your chest one after the other, fast, like running in place.',
    how: {
      setup: 'Push-up position: hands under your shoulders, body in a straight line.',
      do: 'Drive one knee toward your chest, then switch legs in a quick hop, over and over. Count each leg.',
      feel: 'Your heart rate, your stomach and your shoulders.',
      dont: 'Let your hips bounce up and down. Keep them level with your shoulders.',
    },
    demo: CLIMBER, seq: [0, 1, 2, 3, 4, 5].flatMap((i) => [opt(['a', 0.3, i ? undefined : 'Knees in, fast, hips level']), ['b', 0.3]]),
    stills: [['a', 'One knee to your chest'], ['b', 'Switch, fast, hips level']],
    alt: 'Mountain climbers: in a push-up position, the knees drive toward the chest one after the other.',
    used: ['Echo: even minutes'],
  }),
  'flutter-kick': one({
    name: 'Flutter kicks',
    aka: 'Small, fast up-and-down kicks with straight legs held just off the floor. They work the lower part of your stomach.',
    how: {
      setup: 'Lie on your back with your hands under your hips. Lift your legs about 6 inches off the floor.',
      do: 'Kick your legs up and down in small, fast movements, legs straight. Keep going for the time.',
      feel: 'Your lower stomach and the fronts of your hips.',
      dont: 'Let your lower back arch off the floor. If it does, raise your legs a little higher.',
    },
    demo: FLUTTER, seq: Array.from({ length: 12 }, (_, i) => opt([i % 2 ? 'b' : 'a', 0.25, i ? undefined : 'Small fast kicks, legs low'])),
    stills: [['a', 'Hands under your hips, legs low'], ['b', 'Small, fast kicks']],
    alt: 'Flutter kicks: lying on the back with the hands under the hips, straight legs kick up and down just off the floor.',
    used: ['Echo: finisher'],
  }),
  'sit-up': one({
    name: 'Sit-up',
    aka: 'Lying on your back with your knees bent, you sit all the way up and lower back down.',
    how: {
      setup: 'Lie on your back, knees bent, feet flat. Cross your arms on your chest.',
      do: 'Curl up off the floor and sit all the way up, then lower yourself back down with control.',
      feel: 'Your stomach and the fronts of your hips.',
      dont: 'Yank on your neck or throw yourself up. If your feet lift, hook them under the couch.',
    },
    demo: SITUP, seq: [['down', 0.6, 'Arms crossed, knees bent'], ['up', 1, 'Sit all the way up'], ['up', 0.2], ['down', 1.2, 'Lower with control']],
    stills: [['down', 'Arms crossed, knees bent'], ['up', 'Sit all the way up, then lower']],
    alt: 'Sit-up: lying on the back with knees bent and arms crossed, the body sits all the way up and lowers.',
    used: ['Foxtrot: diamonds'],
  }),
  'worlds-greatest-stretch': one({
    name: 'World’s greatest stretch',
    aka: 'A lunge with a twist that stretches your hips, hamstrings and upper back all at once, which is how it earned the name.',
    how: {
      setup: 'Step into a long lunge, back knee off the floor, both hands on the floor inside your front foot.',
      do: 'Drop the elbow on your front-leg side toward your front instep, then twist and reach that arm to the ceiling, eyes on your hand. Move slowly between the two.',
      feel: 'The front of your back hip, the back of your front leg and your upper back.',
      dont: 'Rush it or hold your breath. Breathe out as you twist.',
    },
    demo: WGS,
    seq: [['lunge', 1, 'Long lunge, hands down'], ['elbow', 1.6, 'Elbow to your instep'], ['elbow', 0.8], ['lunge', 1], ['reach', 1.6, 'Twist, reach up'], ['reach', 0.8], ['lunge', 1.2]],
    stills: [['lunge', 'Long lunge, hands down'], ['elbow', 'Elbow to your instep'], ['reach', 'Twist, reach to the ceiling']],
    alt: 'World’s greatest stretch: in a long lunge with the hands down, the elbow drops to the front foot, then the arm twists up to the ceiling.',
    used: ['Mobility'],
  }),
  'deep-squat-hold': one({
    name: 'Deep squat hold',
    aka: 'Sitting at the bottom of a squat and staying there. It opens your hips and ankles.',
    how: {
      setup: 'Feet a little wider than your hips, toes turned out.',
      do: 'Sit down as low as you can with your heels down. Hands together at your chest, use your elbows to push your knees out. Breathe and hold.',
      feel: 'A stretch in your hips, groin and ankles.',
      dont: 'Let your heels come up. Hold a doorframe if you need help staying down.',
    },
    demo: DEEP, seq: [['hold', 2, 'Heels down, chest up'], ['hold', 2, 'Elbows push your knees out'], ['hold', 2, 'Breathe slowly']],
    stills: [['hold', 'Sit low, heels down, elbows push the knees out']],
    alt: 'Deep squat hold: sitting at the bottom of a squat with the heels down and the hands together at the chest.',
    used: ['Mobility'],
  }),
  'cat-cow': one({
    name: 'Cat-cow',
    aka: 'On your hands and knees, rounding your back up like a cat, then letting it sag like a cow. It loosens your whole spine.',
    how: {
      setup: 'Hands and knees: hands under your shoulders, knees under your hips.',
      do: 'Round your back up toward the ceiling and tuck your chin. Then let your belly drop and lift your head. Move slowly with your breath.',
      feel: 'Your back loosening from top to bottom.',
      dont: 'Rush it. One slow breath each way.',
    },
    demo: CATCOW, seq: [['cat', 2, 'Round your back, chin in'], ['cat', 0.8], ['cow', 2, 'Belly down, head up'], ['cow', 0.8]],
    stills: [['cat', 'Round your back, chin in'], ['cow', 'Belly down, head up']],
    alt: 'Cat-cow: on hands and knees, the back rounds up with the chin tucked, then sags with the head lifted.',
    used: ['Mobility'],
  }),
  'thread-the-needle': one({
    name: 'Thread the needle',
    aka: 'On your hands and knees, sliding one arm under your body. It stretches your upper back and the back of your shoulder.',
    how: {
      setup: 'Hands and knees: hands under your shoulders, knees under your hips.',
      do: 'Slide one arm under your body, palm up, until that shoulder and the side of your head rest on the floor. Hold, come back up, and switch sides halfway.',
      feel: 'A stretch between your shoulder blades and at the back of your shoulder.',
      dont: 'Let your hips swing to the side. They stay over your knees.',
    },
    demo: NEEDLE, seq: [['fours', 1, 'Hands and knees'], ['thread', 1.6, 'Slide one arm under'], ['thread', 2, 'Shoulder down, hold'], ['fours', 1.4, 'Come back up']],
    stills: [['fours', 'Hands and knees'], ['thread', 'Slide one arm under, shoulder to the floor']],
    alt: 'Thread the needle: on hands and knees, one arm slides under the body until that shoulder rests on the floor.',
    used: ['Mobility'],
  }),
  'couch-stretch': one({
    name: 'Couch stretch',
    aka: 'Kneeling with your back foot up on the couch. It’s the strongest stretch there is for the front of your hip and thigh.',
    how: {
      setup: 'Back to the couch, put one knee on the floor right against it with the top of that foot up on the seat. Step the other foot forward.',
      do: 'Sit up tall and squeeze the backside of your back leg. Gently move your hips forward until you feel the stretch. Breathe and hold.',
      feel: 'A big stretch down the front of your back thigh and hip.',
      dont: 'Arch your lower back to get deeper: squeeze your backside instead. Pad your knee with a cushion.',
    },
    demo: COUCH, seq: [['set', 1.4, 'Knee down, foot up on the seat'], ['squeeze', 1.6, 'Tall, squeeze, hips forward'], ['squeeze', 2], ['set', 1.4]],
    stills: [['set', 'Back knee down, foot up on the seat'], ['squeeze', 'Sit tall, squeeze, hips forward']],
    alt: 'Couch stretch: kneeling with the back foot up on the couch seat and the front foot planted, the hips ease forward.',
    used: ['Mobility'],
  }),
  'hip-flexor-stretch': one({
    name: 'Hip-flexor stretch',
    aka: 'Kneeling on one knee and easing your hips forward. It stretches the front of your hip, which gets tight from sitting.',
    how: {
      setup: 'Kneel on one knee with the other foot flat in front of you, both knees bent at about a right angle.',
      do: 'Sit up tall, squeeze the backside of your back leg and ease your hips forward. Hold, then switch sides.',
      feel: 'A stretch at the front of your back hip.',
      dont: 'Lean forward or arch your back. Stay tall.',
    },
    demo: FLEXOR, seq: [['set', 1.2, 'One knee down, tall'], ['squeeze', 1.6, 'Squeeze, hips forward'], ['squeeze', 2], ['set', 1.2]],
    stills: [['set', 'One knee down, sit tall'], ['squeeze', 'Squeeze, hips forward, hold']],
    alt: 'Hip-flexor stretch: half-kneeling and tall, the hips ease forward to stretch the front of the back hip.',
    used: ['Cool-down'],
  }),
  'forward-fold': one({
    name: 'Forward fold',
    aka: 'Hanging forward from your hips and reaching for your toes. It stretches the backs of your legs.',
    how: {
      setup: 'Stand with your feet hip-width and your knees slightly bent.',
      do: 'Fold forward from your hips and let your head and arms hang. Reach toward your toes and breathe out as you sink a little lower.',
      feel: 'A stretch down the backs of your legs and in your lower back.',
      dont: 'Bounce or lock your knees. Let gravity do the work.',
    },
    demo: FOLD, seq: [['hang', 2, 'Hang forward, knees soft'], ['reach', 1.6, 'Breathe out, reach lower'], ['reach', 1], ['hang', 1.6]],
    stills: [['hang', 'Hang forward, knees soft'], ['reach', 'Breathe out, reach for your toes']],
    alt: 'Forward fold: standing with soft knees, the body hangs forward from the hips with the arms reaching toward the toes.',
    used: ['Cool-down'],
  }),
};
