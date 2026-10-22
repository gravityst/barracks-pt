// The demo figure: one simple human in the app's ink, posed from joint angles and animated between
// key poses at the move's real tempo. Pure geometry and SVG strings first (node tests use them),
// then the animator (DOM, requestAnimationFrame).
//
// SIDE VIEW (the default), facing right. Units are roughly centimetres for a 175 cm person. The floor
// is y = 0 and y points down, as in SVG. Angles are degrees, and every one is a joint angle:
//   lean  torso from vertical: forward +, back − (−90 = lying on your back, head to the left)
//   hip   hip flexion, the thigh forward of the torso line (0 = standing straight)
//   knee  knee flexion (0 = straight)
//   sh    shoulder flexion, the arm forward of the torso line (0 = at your side, 180 = overhead)
//   el    elbow flexion (0 = straight)
//   ank   foot angle away from square to the shin, toes up + (ignored for a foot planted flat)
//   wr    wrist bend, palm toward the forearm + (drawn only when the demo shows hands)
//   neck  head tilt from the torso line, chin down +
//   curve how much the back rounds (+, like a cat) or sags (−); 0 is a flat back
//   x, y  moves the whole body (a jump, the feet stepping back in a burpee)
//   z     how much of the upper arm you see (1 = all of it; an elbow pointing out toward you, as in a
//         floor press, looks shorter)
// The far-side limbs use the same names with an f in front (fhip, fknee, fsh, fel, fank, fwr) and
// copy the near side unless a pose sets them.
//
// A touch of three-quarter view: the far hip and shoulder sit `view.width` cm behind the near ones,
// drawn shifted by `view.obl` per cm of depth. The default only shifts sideways, so both feet stay
// on the floor line; a demo with props (the row's chair) can tilt it so depth also reads upward.
//
// Planted hands and feet: a pose can name `ik` targets ({ handN: [x, y], ankleF: [x, y], … }) and the
// arm or leg is solved to reach them every frame, so a push-up's hands never slide.
//
// FRONT VIEW (`rig.front`): facing you, for moves that happen out to the sides (lateral raise,
// jumping jacks, side plank). N is the person's right (your left), F their left.
//   hip, fhip  leg out to the side       knee  bend in the picture
//   sh, fsh    arm out to the side (0 down, 90 level, 180 overhead)    el  elbow bend
//   lean       hinge toward you (the torso looks shorter)               roll  the whole body tips over
//   neck       chin down (the head drops toward the shoulder line)
//   fz, ffz    how much of the forearm you see (a forearm pointing at you looks short)

export const BODY = {
  thigh: 45, shin: 43, foot: 13, heel: 4, ankleH: 7,
  torso: 50, upper: 30, fore: 29, neck: 11, headR: 9.5, hand: 8,
  lieH: 8.5,                      // hip and shoulder line above the floor when lying down
  w: { torso: 15, thigh: 11, shin: 9, foot: 6, upper: 8, fore: 7.5, hand: 6.5 },
  front: { torsoW: 24, shoulder: 15, hip: 8, foot: 5 },
};
export const VIEW = { obl: [0.25, 0], width: 20 };
export const farShift = (rig = {}) => { const v = rig.view || VIEW; return [v.obl[0] * v.width, v.obl[1] * v.width]; };

const SIDE = ['hip', 'knee', 'sh', 'el', 'ank', 'wr', 'z'];
const KEYS = ['lean', 'neck', 'curve', 'roll', 'x', 'y', ...SIDE, ...SIDE.map((k) => 'f' + k)];
const RAD = Math.PI / 180;
const dir = (a) => [Math.sin(a * RAD), Math.cos(a * RAD)];
const along = (p, a, k) => { const d = dir(a); return [p[0] + d[0] * k, p[1] + d[1] * k]; };
const angleOf = (v) => Math.atan2(v[0], v[1]) / RAD;            // inverse of dir()
const norm = (a) => ((a + 540) % 360) - 180;
const lerp = (a, b, t) => a + (b - a) * t;

/** A pose with every angle filled in (far side copies the near side). */
export function fill(p) {
  const q = { lean: 0, neck: 0, curve: 0, roll: 0, x: 0, y: 0, hip: 0, knee: 0, sh: 0, el: 0, ank: 0, wr: 0, z: 1, ...p };
  for (const k of SIDE) if (q['f' + k] == null) q['f' + k] = q[k];
  return q;
}

// Planted hands and feet stay put through a move: angles are blended, and any target both poses
// share is blended too and solved again. A target only one pose has is first turned into angles.
const resolved = new WeakMap();
function resolve(pose, rig) {
  if (!pose.ik) return fill(pose);
  let r = resolved.get(pose);
  if (!r) { r = { ...solve(pose, rig).q, ik: pose.ik }; resolved.set(pose, r); }
  return r;
}
export function mix(a, b, t, rig = {}) {
  const A = resolve(a, rig), B = resolve(b, rig), o = {};
  for (const k of KEYS) o[k] = lerp(A[k], B[k], t);
  const fl = (t < 0.5 ? A : B).flat;
  if (fl) o.flat = fl;
  if (A.ik && B.ik) {
    const ik = {};
    for (const k of Object.keys(A.ik)) if (B.ik[k]) ik[k] = [lerp(A.ik[k][0], B.ik[k][0], t), lerp(A.ik[k][1], B.ik[k][1], t)];
    if (Object.keys(ik).length) o.ik = ik;
  }
  return o;
}

// Two bones from `root` to `target`: the first bone's direction and the bend that gets there, with
// the bend on the side a real elbow (+) or knee (−) folds.
function twoBone(root, target, a, b, sign) {
  const v = [target[0] - root[0], target[1] - root[1]];
  const d = Math.min(Math.max(Math.hypot(v[0], v[1]), Math.abs(a - b) + 0.01), a + b - 0.01);
  const base = angleOf(v);
  const alpha = Math.acos((a * a + d * d - b * b) / (2 * a * d)) / RAD;
  for (const first of [base - alpha, base + alpha]) {
    const mid = along(root, first, a);
    const second = angleOf([target[0] - mid[0], target[1] - mid[1]]);
    const bend = norm(second - first);
    if (bend * sign >= -0.01) return { first, bend: Math.abs(bend), mid, second };
  }
  return { first: base, bend: 0, mid: along(root, base, a), second: base };
}

/** Joint positions for a pose (side or front view, from `rig.front`). */
export function solve(pose, rig = {}) {
  return rig.front ? solveFront(pose, rig) : solveSide(pose, rig);
}

/**
 * Side view. `rig.flat` keeps feet flat on the floor ('both', 'near', 'far' or 'none'); `rig.pin`
 * = [joint, [x, y]] fixes one joint in place (default: the near ankle, standing). Returns points
 * (hip, sh, head, kneeN, ankleN, toeN, heelN, elbowN, handN, tipN and the same with F) plus `a`, the
 * directions the drawing needs, and `q`, the pose's angles after any planted hand or foot was solved.
 */
function solveSide(pose, rig) {
  const q = fill(pose), B = BODY;
  const P = { hip: [0, 0] }, a = {};
  const torsoDir = 180 - q.lean;
  a.torso = torsoDir;
  P.sh = along(P.hip, torsoDir, B.torso);
  P.head = along(P.sh, torsoDir - q.neck, B.neck + B.headR);
  const [fx, fy] = farShift(rig);
  P.hipN = P.hip; P.shN = P.sh;
  P.hipF = [P.hip[0] + fx, P.hip[1] + fy]; P.shF = [P.sh[0] + fx, P.sh[1] + fy];
  const flat = q.flat || rig.flat || 'none';      // a pose can plant its own feet (a burpee's squat)
  const planted = (S) => flat === 'both' || (flat === 'near' && S === 'N') || (flat === 'far' && S === 'F');
  const leg = (S, thigh, shin, ank) => {
    P['knee' + S] = along(P['hip' + S], thigh, B.thigh);
    P['ankle' + S] = along(P['knee' + S], shin, B.shin);
    const foot = planted(S) ? 90 : shin + 90 + ank;
    a['ank' + S] = planted(S) ? -shin : ank;
    a['foot' + S] = foot;
    P['toe' + S] = along(P['ankle' + S], foot, B.foot);
    P['heel' + S] = along(P['ankle' + S], foot, -B.heel);
  };
  const arm = (S, upper, fore, wr, z = 1) => {
    P['elbow' + S] = along(P['sh' + S], upper, B.upper * z);
    a['fore' + S] = fore;
    P['hand' + S] = along(P['elbow' + S], fore, B.fore);
    a['hand' + S] = fore + wr;
    P['tip' + S] = along(P['hand' + S], fore + wr, B.hand);
  };
  for (const [s, S] of [['', 'N'], ['f', 'F']]) {
    const thigh = -q.lean + q[s + 'hip'];
    leg(S, thigh, thigh - q[s + 'knee'], q[s + 'ank']);
    const upper = -q.lean + q[s + 'sh'];
    arm(S, upper, upper + q[s + 'el'], q[s + 'wr'], q[s + 'z']);
  }
  const [joint, at] = rig.pin || ['ankleN', [0, -B.ankleH]];
  const dx = at[0] - P[joint][0] + q.x, dy = at[1] - P[joint][1] + q.y;
  for (const k of Object.keys(P)) if (k !== 'hipN' && k !== 'shN') P[k] = [P[k][0] + dx, P[k][1] + dy];
  P.hipN = P.hip; P.shN = P.sh;
  // Planted hands and feet: solve those limbs again so they end exactly on their target.
  const out = { ...q };
  delete out.ik;
  for (const [key, target] of Object.entries(q.ik || {})) {
    const S = key.slice(-1), s = S === 'F' ? 'f' : '';
    if (key.startsWith('hand')) {
      const r = twoBone(P['sh' + S], target, B.upper, B.fore, 1);
      arm(S, r.first, r.first + r.bend, out[s + 'wr']);
      out[s + 'sh'] = r.first + q.lean; out[s + 'el'] = r.bend;
    } else if (key.startsWith('ankle')) {
      const r = twoBone(P['hip' + S], target, B.thigh, B.shin, -1);
      leg(S, r.first, r.first - r.bend, out[s + 'ank']);
      out[s + 'hip'] = r.first + q.lean; out[s + 'knee'] = r.bend;
    }
  }
  P.a = a;
  P.q = out;
  return P;
}

/**
 * Front view. Default pin: the point between the ankles, on the floor. Worked out in 3D (z toward
 * you) so a hinge reads: `rig.tilt` raises the camera that many degrees, looking down, and then you
 * see the back of someone bent toward you instead of a short torso.
 */
function solveFront(pose, rig) {
  const q = fill(pose), B = BODY, F = B.front;
  const tilt = (rig.tilt || 0) * RAD, ct = Math.cos(tilt), st = Math.sin(tilt);
  const L = q.lean * RAD, N = (q.lean + q.neck) * RAD;
  const at3 = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];
  const T = { hip: [0, 0, 0] };
  const torso = [0, -Math.cos(L), Math.sin(L)];
  T.sh = at3(T.hip, torso, B.torso);
  // Bent toward you, the head drops to the shoulder line; tucking the chin (neck +) drops it further.
  T.head = at3(T.sh, [0, -Math.cos(N), Math.sin(N)], B.neck + B.headR);
  const fdir = (ang, s) => [s * Math.sin(ang * RAD), Math.cos(ang * RAD), 0];
  const go = (p, ang, s, k) => at3(p, fdir(ang, s), k);
  const a = {};
  for (const [pre, S, s] of [['', 'N', -1], ['f', 'F', 1]]) {
    T['hip' + S] = [s * F.hip, 0, 0];
    T['sh' + S] = [s * F.shoulder, T.sh[1] + 3 * Math.cos(L), T.sh[2] - 3 * Math.sin(L)];
    const thigh = q[pre + 'hip'], shin = thigh + q[pre + 'knee'];
    T['knee' + S] = go(T['hip' + S], thigh, s, B.thigh);
    T['ankle' + S] = go(T['knee' + S], shin, s, B.shin);
    T['toe' + S] = [T['ankle' + S][0] + s * F.foot, T['ankle' + S][1] + 4, 0];
    const upper = q[pre + 'sh'], fore = upper + q[pre + 'el'];
    T['elbow' + S] = go(T['sh' + S], upper, s, B.upper);
    T['hand' + S] = go(T['elbow' + S], fore, s, B.fore * q[pre + 'z']);
    a['up' + S] = upper; a['fore' + S] = fore; a['hand' + S] = s * fore;   // in side-view terms, for dumbbells
  }
  const P = {};
  for (const [k, [x, y, z]] of Object.entries(T)) P[k] = [x, y * ct + z * st];
  // Tip the whole body over (a side plank): positive roll tips the head to your left.
  if (q.roll) {
    const r = q.roll * RAD, cs = Math.cos(r), sn = Math.sin(r);
    for (const k of Object.keys(P)) { const [x, y] = P[k]; P[k] = [x * cs + y * sn, -x * sn + y * cs]; }
  }
  P.feet = [(P.ankleN[0] + P.ankleF[0]) / 2, Math.max(P.ankleN[1], P.ankleF[1])];
  const [joint, at] = rig.pin || ['feet', [0, -B.ankleH]];
  const dx = at[0] - P[joint][0] + q.x, dy = at[1] - P[joint][1] + q.y;
  for (const k of Object.keys(P)) P[k] = [P[k][0] + dx, P[k][1] + dy];
  P.a = a;
  P.q = q;
  return P;
}

// ---------- timeline: a demo loops through `seq` items [pose, seconds, label?] ----------
// Each item moves from the previous item's pose to its own over `seconds` (a hold when the pose is
// the same). The first item starts from the last one, so the loop is seamless.
const ease = (t) => 0.5 - Math.cos(Math.PI * t) / 2;

export function loopLength(seq) { return seq.reduce((s, it) => s + it[1], 0); }

// A phase is what the caption describes: a captioned item plus any uncaptioned moving items right
// after it (a slow lowering split in two so the foot clears the stair still counts 1, 2, 3).
const moving = (seq, i) => seq[i][0] !== seq[(i - 1 + seq.length) % seq.length][0];
export function phaseOf(seq, i) {
  let s = i, e = i;
  if (moving(seq, i)) {
    while (s > 0 && !seq[s][2] && moving(seq, s - 1)) s--;
    while (e + 1 < seq.length && !seq[e + 1][2] && moving(seq, e + 1)) e++;
  }
  let dur = 0, before = 0;
  for (let j = s; j <= e; j++) { dur += seq[j][1]; if (j < i) before += seq[j][1]; }
  // slow: one deliberate movement (a 3-second lower), not a run of quick reps (jumping jacks).
  const slow = seq.slice(s, e + 1).every((x) => x[1] >= 0.75);
  return { start: s, end: e, dur, before, moving: moving(seq, s), slow, label: seq[s][2] || labelBefore(seq, s) };
}

export function poseAt(demo, seq, time) {
  const total = loopLength(seq);
  let t = ((time % total) + total) % total;
  for (let i = 0; i < seq.length; i++) {
    const [to, dur, label] = seq[i];
    if (t <= dur || i === seq.length - 1) {
      const from = seq[(i - 1 + seq.length) % seq.length][0];
      const k = dur ? Math.min(1, t / dur) : 1;
      const pose = from === to ? demo.poses[to] : mix(demo.poses[from], demo.poses[to], ease(k), demo.rig);
      const ph = phaseOf(seq, i);
      return { pose, index: i, into: t, label: label || labelBefore(seq, i), dur, phase: { dur: ph.dur, into: ph.before + t, moving: ph.moving, slow: ph.slow } };
    }
    t -= dur;
  }
  return null;
}
function labelBefore(seq, i) {
  for (let j = 1; j <= seq.length; j++) { const it = seq[(i - j + seq.length) % seq.length]; if (it[2]) return it[2]; }
  return '';
}

// ---------- drawing ----------
const r1 = (n) => Math.round(n * 10) / 10;

// Dumbbells: 'hex' is seen end-on (handle pointing at you), 'bar' lies in the picture at `angle`
// (0 = handle vertical; 'fore' follows the forearm, `turn` adds to it). `offset` slides it along
// its own handle. `at: 'tip'` holds it at the fingertips; `push` moves it that far past the wrist,
// into the fist.
function dumbbellShape(d) {
  if (d.shape === 'hex') {
    const r = d.size || 7.5;
    const pts = [0, 60, 120, 180, 240, 300].map((g) => `${r1(Math.cos(g * RAD) * r)},${r1(Math.sin(g * RAD) * r)}`).join(' ');
    return `<polygon class="db" points="${pts}"/><circle class="db-end" r="${r1(r * 0.28)}"/>`;
  }
  const s = d.size || 1;
  const L = 11 * s, plate = 6.5 * s, hgt = 15 * s, grip = 3.4 * s;
  return `<rect class="db" x="${-grip / 2}" y="${-L}" width="${grip}" height="${2 * L}"/>`
    + `<rect class="db" x="${-hgt / 2}" y="${-L - plate}" width="${hgt}" height="${plate}"/>`
    + `<rect class="db" x="${-hgt / 2}" y="${L}" width="${hgt}" height="${plate}"/>`;
}
function dumbbellAt(P, d) {
  const S = d.hand === 'F' ? 'F' : 'N';
  const pt = (k) => P[k + S];
  let h = d.hand === 'mid' ? [(P.handN[0] + P.handF[0]) / 2, (P.handN[1] + P.handF[1]) / 2] : d.at === 'tip' ? pt('tip') : pt('hand');
  if (d.push) h = along(h, P.a['hand' + S] ?? 0, d.push);
  let ang = d.angle === 'fore' ? (P.a['fore' + S] ?? 0) : d.angle === 'hand' ? (P.a['hand' + S] ?? 0) : (d.angle || 0);
  ang += d.turn || 0;
  const c = along(h, ang, d.offset || 0);
  // SVG rotate() turns +x toward +y; our angle 0 points down, so a handle drawn vertically needs -ang.
  return `translate(${r1(c[0])} ${r1(c[1])}) rotate(${r1(-ang)})`;
}

// A kitchen chair. In a tilted view (`z`: its near and far edges in cm of depth) the seat shows its
// top, so a knee and a hand can be seen resting on it; otherwise it's a plain side view.
function chairPoints(p, rig) {
  const { x, depth = 44, seat = 46, z = [0, 0] } = p;
  const o = ((rig && rig.view) || VIEW).obl;
  const at = (dx, dy, zz) => [r1(x + dx + o[0] * zz), r1(-seat + dy + o[1] * zz)];
  return { x, depth, seat, z, o, at };
}
function propShape(p, rig) {
  const pts = (...a) => a.map((q) => q.join(' ')).join(' L');
  if (p.type === 'chair') {
    const { depth, seat, z, at } = chairPoints(p, rig);
    const back = p.back === 'left' ? 0 : depth;
    const [zn, zf] = z;
    let out = '';
    if (zf !== zn) {
      out += `<path class="prop-line far" d="M${pts(at(3, 5, zf), [at(3, 0, zf)[0], at(0, seat, zf)[1]])}M${pts(at(depth - 3, 5, zf), [at(depth - 3, 0, zf)[0], at(0, seat, zf)[1]])}"/>`;
      out += `<path class="prop top" d="M${pts(at(0, 0, zn), at(depth, 0, zn), at(depth, 0, zf), at(0, 0, zf))}z"/>`;
    }
    out += `<path class="prop" d="M${pts(at(0, 0, zn), at(depth, 0, zn), at(depth, 5, zn), at(0, 5, zn))}z"/>`;
    out += `<path class="prop-line" d="M${pts(at(3, 5, zn), [at(3, 0, zn)[0], at(0, seat, zn)[1]])}M${pts(at(depth - 3, 5, zn), [at(depth - 3, 0, zn)[0], at(0, seat, zn)[1]])}"/>`;
    if (p.back !== 'none') out += `<path class="prop-line" d="M${pts(at(back, 0, zn), at(back, -40, zn), at(back, -40, zf), at(back, 0, zf))}"/>`;
    return out;
  }
  if (p.type === 'stair') {
    const { x, h = 18, depth = 28 } = p;
    return `<path class="prop" d="M${x} 0V${-h}h${depth}V0z"/>`;
  }
  if (p.type === 'couch') {
    // Seat box with a cushion line; the back on the side given.
    const { x, depth = 60, seat = 42, back = 'right' } = p;
    const bx = back === 'right' ? x + depth - 12 : x;
    return `<path class="prop" d="M${x} 0V${-seat}h${depth}V0z"/><path class="prop top" d="M${x + 2} ${-seat + 2}h${depth - 4}v6h${-depth + 4}z"/>`
      + (back === 'none' ? '' : `<path class="prop" d="M${bx} ${-seat}v-36h12v36z"/>`);
  }
  if (p.type === 'door') {
    const { x } = p;
    return `<path class="prop-line" d="M${x} 0V-205"/>`;
  }
  return '';
}

const LIMBS = [
  // [key, from, to, width] in drawing order within a side
  ['thigh', 'hip', 'knee', 'thigh'], ['shin', 'knee', 'ankle', 'shin'], ['foot', 'heel', 'toe', 'foot'],
  ['upper', 'sh', 'elbow', 'upper'], ['fore', 'elbow', 'hand', 'fore'],
];

// Every shape of one frame: [key, tag, class, attributes]. The animator updates the attributes in
// place, so a frame costs a few dozen setAttribute calls, not a re-parse.
function shapes(demo, pose) {
  const P = solve(pose, demo.rig);
  const out = [];
  const line = (k, cls, w, p, q) => out.push([k, 'line', cls, { 'stroke-width': w, x1: r1(p[0]), y1: r1(p[1]), x2: r1(q[0]), y2: r1(q[1]) }]);
  const side = (S, cls) => {
    for (const [k, a, b, w] of LIMBS) line(k + S, cls, BODY.w[w], P[a + S], P[b + S]);
    if (demo.rig && demo.rig.hands) line('hand' + S, cls, BODY.w.hand, P['hand' + S], P['tip' + S]);
  };
  const loads = demo.load || [];
  const db = (layer) => loads.forEach((d, i) => {
    if ((d.layer || (d.hand === 'F' ? 'far' : 'near')) === layer) out.push(['db' + i, 'g', '', { transform: dumbbellAt(P, d) }, dumbbellShape(d)]);
  });
  if (demo.rig && demo.rig.front) {
    const F = BODY.front;
    for (const S of ['N', 'F']) {
      line('thigh' + S, 'fig-n', BODY.w.thigh, P['hip' + S], P['knee' + S]);
      line('shin' + S, 'fig-n', BODY.w.shin, P['knee' + S], P['ankle' + S]);
      line('foot' + S, 'fig-n', BODY.w.foot, P['ankle' + S], P['toe' + S]);
    }
    line('torso', 'fig-n', F.torsoW, P.hip, P.sh);
    db('far');
    for (const S of ['N', 'F']) {
      line('upper' + S, 'fig-n', BODY.w.upper, P['sh' + S], P['elbow' + S]);
      line('fore' + S, 'fig-n', BODY.w.fore, P['elbow' + S], P['hand' + S]);
    }
    out.push(['head', 'circle', 'fig-head', { r: BODY.headR, cx: r1(P.head[0]), cy: r1(P.head[1]) }]);
    db('near');
    return out;
  }
  side('F', 'fig-f');
  db('far');
  const q = fill(pose);
  if (q.curve) {
    // A rounded or sagging back: a curve from hip to shoulder, bowed off the straight line.
    const m = [(P.hip[0] + P.sh[0]) / 2, (P.hip[1] + P.sh[1]) / 2];
    const u = dir(P.a.torso), n = [u[1], -u[0]];
    const c = [m[0] + n[0] * q.curve * 2, m[1] + n[1] * q.curve * 2];
    out.push(['torso', 'path', 'fig-n', { 'stroke-width': BODY.w.torso, d: `M${r1(P.hip[0])} ${r1(P.hip[1])}Q${r1(c[0])} ${r1(c[1])} ${r1(P.sh[0])} ${r1(P.sh[1])}` }]);
  } else {
    out.push(['torso', 'path', 'fig-n', { 'stroke-width': BODY.w.torso, d: `M${r1(P.hip[0])} ${r1(P.hip[1])}L${r1(P.sh[0])} ${r1(P.sh[1])}` }]);
  }
  out.push(['head', 'circle', 'fig-head', { r: BODY.headR, cx: r1(P.head[0]), cy: r1(P.head[1]) }]);
  db('mid');
  side('N', 'fig-n');
  db('near');
  return out;
}

const attrs = (a) => Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ');
/** One frame as SVG markup (no <svg> wrapper). */
export function frameSVG(demo, pose) {
  return shapes(demo, pose).map(([k, tag, cls, a, inner]) => `<${tag} data-k="${k}"${cls ? ` class="${cls}"` : ''} ${attrs(a)}>${inner || ''}</${tag}>`).join('');
}

/** The fixed viewBox that holds every frame of a demo (sampled), its props and the floor. */
export function bounds(demo, seqs) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = 0;
  const grow = (x, y, r) => { x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r); };
  for (const seq of seqs) {
    const total = loopLength(seq);
    for (let i = 0; i <= 48; i++) {
      const P = solve(poseAt(demo, seq, (total * i) / 48).pose, demo.rig);
      for (const [k, p] of Object.entries(P)) if (k !== 'a' && k !== 'q') grow(p[0], p[1], k === 'head' ? BODY.headR + 1 : k === 'hip' && demo.rig && demo.rig.front ? 13 : 9);
      for (const d of demo.load || []) { const h = d.hand === 'F' ? P.handF : P.handN; grow(h[0], h[1] + (d.offset || 0), 16); }
    }
  }
  for (const p of demo.props || []) {
    if (p.type === 'chair') {
      const { depth, z, at } = chairPoints(p, demo.rig);
      for (const zz of z) { const a = at(0, -40, zz), b = at(depth, 0, zz); grow(a[0], a[1], 2); grow(b[0], 0, 2); }
    }
    if (p.type === 'stair') { grow(p.x, -(p.h || 18), 2); grow(p.x + (p.depth || 28), 0, 2); }
    if (p.type === 'couch') { grow(p.x, -(p.seat || 42) - (p.back === 'none' ? 0 : 36), 2); grow(p.x + (p.depth || 60), 0, 2); }
    if (p.type === 'door') { grow(p.x, -150, 3); }
  }
  const pad = 8;
  return [Math.floor(x0 - pad), Math.floor(y0 - pad), Math.ceil(x1 - x0 + pad * 2), Math.ceil(Math.max(y1, 0) + 5 - (y0 - pad))];
}

export function svgOpen(vb, label, cls = 'rig') {
  return `<svg class="${cls}" style="--h:${vb[3]}" viewBox="${vb.join(' ')}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="${label.replace(/"/g, '&quot;')}">`
    + `<line class="floor" x1="${vb[0]}" x2="${vb[0] + vb[2]}" y1="0.75" y2="0.75"/>`;
}
export const propsSVG = (demo) => (demo.props || []).map((p) => propShape(p, demo.rig)).join('');

/** Static frames side by side, for reduced motion (and the frame strip). */
export function stripHTML(demo, strip, label) {
  const vb = bounds(demo, [strip.map(([k]) => [k, 1])]);
  return `<ol class="rig-strip" aria-label="${label.replace(/"/g, '&quot;')}">${strip.map(([k, text], i) => `<li>
    ${svgOpen(vb, `${i + 1}: ${text}`)}${propsSVG(demo)}${frameSVG(demo, demo.poses[k])}</svg>
    <span><b>${i + 1}</b> ${text}</span></li>`).join('')}</ol>`;
}

// ---------- the animator ----------
const clocks = new Map();   // demo key → loop start, so a re-render carries on instead of restarting

const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Mount a demo into `el`. `seq` is the loop for this level, `strip` the reduced-motion frames.
 * Stops itself when `el` leaves the document or is given another demo; pauses while it's scrolled
 * out of view.
 */
export function mountDemo(el, demo, { seq, strip, key, label }) {
  const token = (el.__rig = {});
  if (reduceMotion()) { el.innerHTML = stripHTML(demo, strip, label); el.classList.add('still'); return; }
  el.classList.remove('still');
  const vb = bounds(demo, [seq]);
  el.innerHTML = `${svgOpen(vb, label)}${propsSVG(demo)}<g class="fr">${frameSVG(demo, demo.poses[seq[0][0]])}</g></svg>
    <p class="rig-cap" aria-hidden="true"><span class="ph"></span><span class="ct"></span></p>`;
  const g = el.querySelector('g.fr');
  let parts = {};
  const index = () => { parts = {}; g.querySelectorAll('[data-k]').forEach((n) => { parts[n.dataset.k] = n; }); };
  index();
  const ph = el.querySelector('.ph'), ct = el.querySelector('.ct');
  if (!clocks.has(key)) clocks.set(key, performance.now());
  const t0 = clocks.get(key);
  let raf = 0, shown = '', counted = -1, onScreen = true;

  const draw = (now) => {
    raf = 0;
    if (!el.isConnected || el.__rig !== token) { io && io.disconnect(); return; }
    const s = poseAt(demo, seq, (now - t0) / 1000);
    const list = shapes(demo, s.pose);
    if (list.some(([k]) => !parts[k])) { g.innerHTML = frameSVG(demo, s.pose); index(); }
    else for (const [k, , , a] of list) { const n = parts[k]; for (const name in a) n.setAttribute(name, a[name]); }
    // Caption: the phase, and a count of seconds for the slow ones (that's the tempo to copy).
    if (s.label !== shown) { shown = s.label; ph.textContent = s.label; counted = -1; ct.innerHTML = ''; }
    const p = s.phase, counting = p.dur >= 2.5 && p.moving && p.slow;
    const n = counting ? Math.min(Math.ceil(p.dur - 0.01), Math.floor(p.into) + 1) : 0;
    if (n !== counted) { counted = n; ct.innerHTML = counting ? Array.from({ length: Math.round(p.dur) }, (_, i) => `<i${i < n ? ' class="on"' : ''}>${i + 1}</i>`).join('') : ''; }
    if (onScreen) raf = requestAnimationFrame(draw);
  };
  let io = null;
  if (typeof IntersectionObserver === 'function') {
    io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen && !raf) raf = requestAnimationFrame(draw);
    });
    io.observe(el);
  }
  raf = requestAnimationFrame(draw);
}
