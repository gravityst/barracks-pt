// The demo figure has to show the move right. These tests sample every frame of every demo loop and
// check the body: joints inside their real range, nothing through the floor, planted hands and feet
// staying put, and each move's own form points (flat back on hinges, knees over feet, elbows in, and
// so on). Every library entry is covered: each level of a strength move, its variants, every drill.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solve, poseAt, loopLength, fill, BODY, farShift, phaseOf, mountDemo } from '../js/rig.js';
import { MOVES, LIBRARY, PLAN_MOVES, moveInfo, demoOf, levelNotes } from '../js/moves.js';
import { DRILLS } from '../js/drills.js';
import { CATALOG, SESSIONS, WARMUP, COOLDOWN, ENGINE, DECK, MOBILITY, TEST } from '../js/data.js';

const planMove = (id) => CATALOG[id];

function frames(demo, seq, n = 72) {
  const total = loopLength(seq);
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = poseAt(demo, seq, (total * i) / n);
    const P = solve(s.pose, demo.rig);
    return { q: P.q, P, label: s.label, pose: s.pose };
  });
}
// Every demo loop in the library: each level of each move, each variant, each drill.
function allLoops() {
  const out = [];
  for (const [slug, m] of Object.entries(LIBRARY)) {
    m.demos.forEach((demo, L) => out.push({ slug, m, where: m.levels ? `${slug} L${L}` : slug, demo, seq: m.tempo[L], strip: m.strip[L] }));
    for (const [k, v] of Object.entries(m.variants || {})) out.push({ slug, m, where: `${slug}:${k}`, demo: v.demo, seq: v.tempo, strip: v.strip });
  }
  return out;
}
const LOOPS = allLoops();
const each = (fn) => { for (const l of LOOPS) fn(l); };
const loop = (slug, L = 0) => { const d = demoOf(slug, L); return { demo: d.demo, seq: d.seq, F: frames(d.demo, d.seq) }; };
const at = (slug, L, pose) => { const d = demoOf(slug, L).demo; return solve(d.poses[pose], d.rig); };
const deg = (v) => Math.atan2(v[0], v[1]) * 180 / Math.PI;            // 0 = straight down, as in rig.js
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const DRAWN = ['hip', 'sh', 'kneeN', 'kneeF', 'ankleN', 'ankleF', 'toeN', 'toeF', 'heelN', 'heelF', 'elbowN', 'elbowF', 'handN', 'handF'];

test('the library: every strength move has three levels, every drill one demo, all loops complete', () => {
  assert.ok(Object.keys(MOVES).length >= 24 && Object.keys(DRILLS).length >= 18, 'the whole plan is drawn');
  for (const [slug, m] of Object.entries(LIBRARY)) {
    const n = m.levels ? 3 : 1;
    assert.equal(m.demos.length, n, `${slug}: demos`);
    assert.equal(m.tempo.length, n, `${slug}: tempo`);
    assert.equal(m.strip.length, n, `${slug}: strip`);
    if (m.levels) assert.equal(m.names.length, 3, `${slug}: a name for each level`);
  }
  each(({ where, demo, seq, strip }) => {
    assert.ok(demo && seq && strip && strip.length, where);
    for (const [k] of seq) assert.ok(demo.poses[k], `${where}: tempo uses missing pose ${k}`);
    for (const [k] of strip) assert.ok(demo.poses[k], `${where}: strip uses missing pose ${k}`);
    assert.ok(loopLength(seq) >= 3 && loopLength(seq) <= 12, `${where}: loop ${loopLength(seq)} s`);
    assert.ok(seq[0][2], `${where}: the loop opens with a caption`);
  });
});

test('every planted hand and foot reaches its spot (no target out of reach)', () => {
  each(({ where, demo }) => {
    for (const [name, pose] of Object.entries(demo.poses)) {
      const P = solve(pose, demo.rig);
      for (const [j, t] of Object.entries(pose.ik || {})) assert.ok(dist(P[j], t) < 0.5, `${where} ${name}: ${j} misses by ${dist(P[j], t).toFixed(1)}`);
    }
  });
});

test('every frame: joints stay inside a real range of motion', () => {
  each(({ where, demo, seq }) => {
    const rom = demo.rig?.rom || {};
    for (const { q, P } of frames(demo, seq)) {
      for (const s of ['', 'f']) {
        if (demo.rig?.front) {
          // Front view: arms out to the side, legs only a little.
          assert.ok(q[s + 'sh'] >= -1 && q[s + 'sh'] <= 180, `${where}: ${s}shoulder ${q[s + 'sh']}`);
          assert.ok(q[s + 'el'] >= -1 && q[s + 'el'] <= 120, `${where}: ${s}elbow ${q[s + 'el']}`);
          assert.ok(q[s + 'hip'] >= -5 && q[s + 'hip'] <= 45, `${where}: ${s}hip ${q[s + 'hip']}`);
          assert.ok(q[s + 'knee'] >= -1 && q[s + 'knee'] <= 30, `${where}: ${s}knee ${q[s + 'knee']}`);
          continue;
        }
        assert.ok(q[s + 'knee'] >= -1 && q[s + 'knee'] <= 160, `${where}: ${s}knee ${q[s + 'knee'].toFixed(0)}`);
        assert.ok(q[s + 'el'] >= -1 && q[s + 'el'] <= 155, `${where}: ${s}elbow ${q[s + 'el'].toFixed(0)}`);
        assert.ok(q[s + 'hip'] >= -35 && q[s + 'hip'] <= (rom.hip ?? 140), `${where}: ${s}hip ${q[s + 'hip'].toFixed(0)}`);
        assert.ok(q[s + 'sh'] >= -60 && q[s + 'sh'] <= (rom.sh ?? 180), `${where}: ${s}shoulder ${q[s + 'sh'].toFixed(0)}`);
        assert.ok(q[s + 'wr'] >= -70 && q[s + 'wr'] <= 80, `${where}: ${s}wrist ${q[s + 'wr']}`);
      }
      if (!demo.rig?.front) for (const S of ['N', 'F']) assert.ok(P.a['ank' + S] >= -55 && P.a['ank' + S] <= 40, `${where}: ${S} ankle ${P.a['ank' + S].toFixed(0)}`);
    }
  });
});

test('every frame: nothing goes through the floor, pins hold, planted feet stay planted', () => {
  each(({ where, demo, seq }) => {
    const fl = demo.rig?.flat || 'none';
    const pinned = demo.rig?.pin || (demo.rig?.front ? ['feet', [0, -BODY.ankleH]] : ['ankleN', [0, -BODY.ankleH]]);
    // A planted foot sits on the floor, or on top of the stair or a chair seat the demo draws.
    const surfaces = [0, ...(demo.props || []).map((p) => (p.type === 'stair' ? p.h || 18 : p.seat || 0))].map((h) => -h - BODY.ankleH);
    const keep = {};
    for (const { P, q } of frames(demo, seq)) {
      assert.ok(P.head[1] + BODY.headR <= 0.6, `${where}: head through the floor`);
      for (const k of DRAWN) if (P[k]) assert.ok(P[k][1] <= 0.5, `${where}: ${k} below the floor (${P[k][1].toFixed(1)})`);
      const want = [pinned[1][0] + q.x, pinned[1][1] + q.y];
      assert.ok(dist(P[pinned[0]], want) < 0.05, `${where}: the pinned ${pinned[0]} moved`);
      for (const S of ['N', 'F']) {
        if (!(fl === 'both' || (fl === 'near' && S === 'N') || (fl === 'far' && S === 'F'))) continue;
        const a = P['ankle' + S];
        keep[S] ??= a;
        assert.ok(dist(a, keep[S]) < 0.6, `${where}: planted ${S} foot slid or lifted`);
        assert.ok(surfaces.some((y) => Math.abs(a[1] - y) < 0.6), `${where}: planted ${S} foot isn't on anything (${a[1].toFixed(1)})`);
      }
    }
  });
});

test('every plan move has a demo, and its level notes say what that level changes', () => {
  const used = new Set([...Object.values(SESSIONS).flatMap((s) => [s.arms, s.balanced].filter(Boolean).flatMap((v) => [...v.pairs.flat(), v.core, v.gap].filter(Boolean)))]);
  for (const id of Object.keys(CATALOG)) {
    for (let L = 0; L < 3; L++) assert.ok(moveInfo(id, L), `${id} L${L} has no demo`);
    const notes = levelNotes(id);
    assert.ok(notes.every((n) => n && n.length <= 160), `${id}: a short note for each level`);
  }
  for (const id of used) assert.ok(PLAN_MOVES[id], `${id} is in a session but not in the library`);
});

test('tempo matches the plan: slow lowering, holds, pauses and partial reps are really there', () => {
  // A hold is a pause right after a movement (a static plank's captions don't count).
  const prev = (seq, i, n = 1) => seq[(i - n + seq.length) % seq.length][0];
  const holds = (seq) => seq.filter(([k], i) => k === prev(seq, i) && prev(seq, i) !== prev(seq, i, 2)).map(([, s]) => s);
  for (const id of Object.keys(PLAN_MOVES)) {
    const pm = planMove(id);
    for (let L = 0; L < 3; L++) {
      const name = pm.n[L], { seq, demo } = moveInfo(id, L);
      const slow = seq.map((_, i) => phaseOf(seq, i)).filter((p) => p.moving && /3 seconds/.test(p.label));
      if (/3-sec lower/.test(name)) assert.ok(slow.some((p) => Math.abs(p.dur - 3) < 0.01), `${name}: needs a 3-second lowering`);
      else assert.equal(slow.length, 0, `${name}: should not lower for 3 seconds`);
      const two = holds(seq).some((s) => s === 2);
      assert.equal(two, /2-sec (hold|squeeze)/.test(name), `${name}: ${two ? 'has' : 'needs'} a 2-second hold`);
      if (/pause/.test(name)) assert.ok(holds(seq).some((s) => s >= 1), `${name}: needs a real pause`);
      if (/1¼/.test(name)) assert.ok(seq.some(([k]) => k === 'quarter'), `${name}: a quarter rep`);
      if (/1½/.test(name)) assert.ok(seq.some(([k]) => k === 'half'), `${name}: a half rep`);
      const lb = /· (7|15)s/.exec(pm.d[L]);
      if (lb) {
        const sizes = (demo.load || []).map((d) => d.size || (d.shape === 'hex' ? 7.5 : 1));
        assert.ok(sizes.length, `${name}: the demo holds dumbbells (${pm.d[L]})`);
        if (sizes.every((v) => v > 2)) assert.ok(sizes.every((v) => (lb[1] === '7' ? v < 7 : v >= 7)), `${name}: the dumbbells look like ${lb[1]}s`);
      }
    }
  }
});

test('how-to copy: four short parts for every library entry, real level notes, and where it’s used', () => {
  for (const [slug, m] of Object.entries(LIBRARY)) {
    for (const k of ['setup', 'do', 'feel', 'dont']) {
      assert.ok(m.how[k] && m.how[k].length <= 230, `${slug}.${k} is missing or too long (${m.how[k]?.length})`);
    }
    if (m.levels) assert.equal(m.levels.length, 3, `${slug}: three level notes`);
    else assert.ok(m.used && m.used.length, `${slug}: says where the plan uses it`);
    assert.ok(m.aka && m.alt, `${slug}: plain-English intro and a screen-reader description`);
    assert.ok(!/lorem|coming soon|todo/i.test(JSON.stringify(m.how)), `${slug}: real copy`);
  }
});

test('every drill the plan names has a demo', () => {
  const slugs = [...WARMUP.demos, ...COOLDOWN.demos, ...ENGINE.warmup.demos, ...ENGINE.odd.map((o) => o.demo), ENGINE.even.demo, ENGINE.finisher.demo,
    ...DECK.suits.map((s) => s.demo), DECK.joker, ...MOBILITY.stretches.map((s) => s.demo), ...TEST.events.map((e) => e.demo)].filter(Boolean);
  for (const ref of slugs) {
    const [slug, k] = String(ref).split(':');
    assert.ok(demoOf(slug, k === undefined ? 0 : +k), `${ref} has no demo`);
  }
  assert.equal(WARMUP.demos.length, WARMUP.items.length);
  assert.equal(COOLDOWN.demos.length, COOLDOWN.items.length);
  assert.equal(ENGINE.warmup.demos.length, ENGINE.warmup.items.length);
});

test('goblet squat: chest up, heels down, knees over the feet, thighs reach level', () => {
  for (let L = 0; L < 3; L++) {
    const m = MOVES['goblet-squat'], demo = m.demos[L];
    const bottom = solve(demo.poses.bottom, demo.rig);
    assert.ok(bottom.hip[1] >= bottom.kneeN[1] - 2, 'thighs at least level with the floor at the bottom');
    assert.ok(bottom.kneeN[0] <= bottom.toeN[0] + 6, 'knee no further forward than just past the toes');
    assert.ok(fill(demo.poses.bottom).lean <= 40, 'chest stays up (torso within 40° of vertical)');
    assert.ok(Math.abs(bottom.sh[0] - (bottom.heelN[0] + bottom.toeN[0]) / 2) < 12, 'shoulders over the feet: balanced');
    for (const { P } of frames(demo, m.tempo[L])) assert.ok(P.a.ankN <= 30, 'heels can stay down (ankle bend under 30°)');
  }
});

test('Romanian deadlift: soft knees, flat back, weights close to the legs, below the knee at the bottom', () => {
  for (const L of [0, 1]) {
    const m = MOVES.rdl, demo = m.demos[L];
    for (const { q, P } of frames(demo, m.tempo[L])) {
      assert.ok(q.knee <= 30, `knees soft, not squatting (${q.knee.toFixed(0)}°)`);
      const shin = Math.atan2(P.kneeN[0] - P.ankleN[0], P.ankleN[1] - P.kneeN[1]) * 180 / Math.PI;
      assert.ok(Math.abs(shin) <= 10, `shins near vertical (${shin.toFixed(0)}°)`);
      assert.ok(q.el <= 5, 'arms straight');
      assert.equal(q.neck, 0, 'head in line with the back');
      assert.ok(P.handN[0] <= P.kneeN[0] + 16, 'dumbbells stay close to the legs');
    }
    const b = solve(demo.poses.bottom, demo.rig);
    assert.ok(b.handN[1] >= b.kneeN[1] - 2, 'weights reach the knee at the bottom');
    assert.ok(fill(demo.poses.bottom).lean >= 55, 'a real hinge: torso well forward');
    assert.ok(b.hip[0] < b.ankleN[0] - 5, 'hips pushed back behind the heels');
  }
  const sl = MOVES.rdl.demos[2], b = solve(sl.poses.bottom, sl.rig);
  const torso = Math.atan2(b.sh[1] - b.hip[1], b.sh[0] - b.hip[0]) * 180 / Math.PI;
  const leg = Math.atan2(b.hip[1] - b.ankleN[1], b.hip[0] - b.ankleN[0]) * 180 / Math.PI;
  assert.ok(Math.abs(torso - leg) < 25, 'single-leg RDL: back leg roughly in line with the back');
});

test('one-arm row: back flat and steady, knee and hand on the chair, pull ends at the hip', () => {
  for (let L = 0; L < 3; L++) {
    const m = MOVES['one-arm-row'], demo = m.demos[L], chair = demo.props[0];
    // The far side sits `view.width` deep, so its knee and hand land on the seat at that depth.
    const [fx, fy] = farShift(demo.rig);
    const top = -chair.seat + fy, x0 = chair.x + fx, x1 = chair.x + chair.depth + fx;
    assert.ok(chair.z[0] < demo.rig.view.width && chair.z[1] > demo.rig.view.width, 'the far side is over the seat, depth-wise');
    for (const { q, P } of frames(demo, m.tempo[L])) {
      assert.ok(q.lean >= 55 && q.lean <= 85, 'torso bent over, back roughly level');
      assert.ok(Math.abs(P.kneeF[1] - (top - BODY.w.shin / 2)) < 2, 'knee resting on the seat');
      assert.ok(P.kneeF[0] >= x0 + 4 && P.kneeF[0] <= x1, 'knee on the seat, not its edge');
      assert.ok(Math.abs(P.handF[1] - (top - BODY.w.fore / 2)) < 2.5, 'hand resting on the seat');
      assert.ok(P.handF[0] >= x0 && P.handF[0] <= x1 - 2, 'hand on the seat');
      assert.ok(Math.abs(P.kneeF[0] - P.hipF[0]) < 16 && Math.abs(P.handF[0] - P.shF[0]) < 8, 'knee under the hip, hand under the shoulder');
    }
    const up = solve(demo.poses.up, demo.rig), down = solve(demo.poses.down, demo.rig);
    assert.ok(Math.abs(down.handN[0] - down.sh[0]) < 4, 'arm hangs straight down at the start');
    assert.ok(up.handN[0] - up.hip[0] < 12, 'the weight finishes at the hip, not the chest');
    // The elbow finishes at or just above the back, not flared way above it.
    const t = (up.elbowN[0] - up.hip[0]) / (up.sh[0] - up.hip[0]);
    const backY = up.hip[1] + t * (up.sh[1] - up.hip[1]) - BODY.w.torso / 2;
    assert.ok(up.elbowN[1] >= backY - 6, 'elbow ends level with the back');
  }
});

test('dead bug: lower back stays on the floor, arm and leg stop above it', () => {
  for (let L = 0; L < 3; L++) {
    const m = MOVES['dead-bug'], demo = m.demos[L];
    for (const { P } of frames(demo, m.tempo[L])) {
      assert.ok(Math.abs(P.hip[1] + BODY.lieH) < 0.1 && Math.abs(P.sh[1] + BODY.lieH) < 0.1, 'back flat on the floor');
      for (const k of ['handN', 'handF', 'heelN', 'heelF']) assert.ok(P[k][1] <= -4, `${k} stops above the floor`);
    }
    const t = solve(demo.poses.table, demo.rig);
    assert.ok(Math.abs(t.kneeN[0] - t.hip[0]) < 2, 'start: knees over hips');
    assert.ok(Math.abs(t.ankleN[1] - t.kneeN[1]) < 2, 'start: shins level with the floor');
  }
});


// ---------- form, move by move ----------
// Straight within 2°: a leg solved to land exactly on its spot keeps a hair of bend.
const straightBody = (q) => Math.abs(q.hip) < 2 && Math.abs(q.knee) < 2;

test('push-up: one straight line, hands under the shoulders, chest low, elbows back', () => {
  for (let L = 0; L < 3; L++) {
    const { demo, F } = loop('push-up', L);
    for (const { q } of F) assert.ok(straightBody(q), `L${L}: body stays one straight line`);
    const top = at('push-up', L, 'top'), bot = at('push-up', L, 'bottom');
    assert.ok(top.q.el <= 20, `L${L}: arms straight at the top (${top.q.el.toFixed(0)}°)`);
    assert.ok(Math.abs(top.handN[0] - top.sh[0]) <= 22, `L${L}: hands roughly under the shoulders`);
    assert.ok(bot.sh[1] - bot.handN[1] >= -30, `L${L}: shoulders come down to the hands`);
    assert.ok(bot.elbowN[0] < bot.sh[0] - 15 && bot.elbowN[1] <= bot.sh[1] + 5, `L${L}: elbows back toward the hips, not flared down`);
    assert.ok(bot.head[1] + BODY.headR <= -3, `L${L}: face stays off the floor`);
    const chair = (demo.props || [])[0];
    if (L === 0) assert.ok(top.handN[0] > chair.x && top.handN[0] < chair.x + chair.depth && Math.abs(top.handN[1] + chair.seat + BODY.w.fore / 2) < 0.5, 'incline: hands on the seat');
    if (L === 2) assert.ok(Math.abs(top.toeN[1] + chair.seat + BODY.w.foot / 2) < 0.5 && top.toeN[0] > chair.x && top.toeN[0] < chair.x + chair.depth, 'feet on the chair seat');
  }
});

test('overhead press: from the shoulders to straight overhead, no leaning back', () => {
  for (let L = 0; L < 3; L++) {
    const { F } = loop('overhead-press', L);
    for (const { q } of F) assert.ok(q.lean === 0 && q.knee <= 5, 'stands tall, back not arched');
    const rack = at('overhead-press', L, 'rack'), top = at('overhead-press', L, 'top');
    assert.ok(Math.abs(rack.handN[1] - rack.sh[1]) < 12, 'starts with the weights at the shoulders');
    assert.ok(Math.abs(deg(sub(rack.handN, rack.elbowN))) > 170, 'forearms upright under the weights');
    assert.ok(top.handN[1] < top.head[1] - 20 && top.q.el <= 6, 'finishes straight overhead');
    assert.ok(Math.abs(top.handN[0] - top.sh[0]) < 6, 'over the shoulders, not out in front');
  }
});

test('lateral raise: out to the sides to shoulder height, no higher, elbows soft', () => {
  for (const ref of ['lateral-raise', 'lateral-raise:quarter']) {
    const [slug, k] = ref.split(':');
    const d = demoOf(slug, k ?? 0), F = frames(d.demo, d.seq);
    for (const { P, q } of F) {
      assert.ok(P.handN[1] >= P.shN[1] - 6 && P.handF[1] >= P.shF[1] - 6, `${ref}: never above the shoulders`);
      assert.ok(q.el > 0 && q.el <= 15, `${ref}: a slight bend in the elbows`);
    }
    const up = solve(d.demo.poses.up, d.demo.rig), down = solve(d.demo.poses.down, d.demo.rig);
    assert.ok(Math.abs(up.handN[1] - up.shN[1]) < 6, `${ref}: hands reach shoulder height`);
    assert.ok(down.handN[1] > down.hip[1], `${ref}: starts with the arms down by the sides`);
  }
  const q = solve(demoOf('lateral-raise', 'quarter').demo.poses.quarter, demoOf('lateral-raise', 'quarter').demo.rig);
  const sh = q.shN[1], up = solve(demoOf('lateral-raise', 'quarter').demo.poses.up, demoOf('lateral-raise', 'quarter').demo.rig);
  assert.ok(q.handN[1] > up.handN[1] + 8 && q.handN[1] < sh + 30, '1¼: the quarter rep goes a quarter of the way down');
});

test('plank and side plank: a straight line, elbow under the shoulder, forearm on the floor', () => {
  for (let L = 0; L < 3; L++) {
    for (const { P, q } of loop('plank', L).F) {
      assert.ok(Math.abs(q.fhip) < 0.5 && Math.abs(q.fknee) < 0.5 && Math.abs(q.knee) < 0.5, 'legs straight, hips level');
      assert.ok(Math.abs(P.elbowN[0] - P.sh[0]) < 3, 'elbows under the shoulders');
      assert.ok(Math.abs(P.elbowN[1] + BODY.w.upper / 2) < 1 && Math.abs(P.handN[1] - P.elbowN[1]) < 1, 'forearms flat on the floor');
    }
    for (const { P, q } of loop('side-plank', L).F) {
      assert.ok(q.hip === 0 && q.knee === 0, 'side plank: hips up, body straight');
      assert.ok(Math.abs(P.elbowN[0] - P.shN[0]) < 2, 'side plank: elbow under the shoulder');
      assert.ok(Math.min(P.toeN[1], P.ankleN[1]) > -12, 'side plank: feet on the floor');
    }
  }
  const lift = at('plank', 2, 'lift');
  assert.ok(lift.toeN[1] < -6 && lift.toeN[1] > -30, 'Ranger plank: one foot a few inches up');
  const leg = at('side-plank', 2, 'lift'), hold = at('side-plank', 2, 'hold');
  assert.ok(leg.ankleF[1] < hold.ankleF[1] - 15, 'Ranger side plank: the top leg lifts');
});

test('split squat and reverse lunge: back knee drops toward the floor, front thigh about level, chest up', () => {
  for (let L = 0; L < 3; L++) {
    const sq = loop('split-squat', L);
    const x0 = sq.F[0].P.hip[0];
    for (const { P, q } of sq.F) {
      assert.ok(Math.abs(P.hip[0] - x0) < 0.5, 'straight down and up, not forward and back');
      assert.ok(q.lean <= 12, 'chest up');
      assert.ok(P.a.ankF < 0, 'back foot on its toes (or laces down on the chair)');
    }
    const b = at('split-squat', L, 'bottom');
    assert.ok(b.kneeF[1] > (L === 2 ? -24 : -18), `L${L}: back knee near the floor (${b.kneeF[1].toFixed(0)})`);
    assert.ok(Math.abs(b.hip[1] - b.kneeN[1]) < 10, `L${L}: front thigh about level`);
    assert.ok(Math.abs(b.kneeN[0] - b.ankleN[0]) < 12, `L${L}: front knee over the foot`);
    const lb = at('reverse-lunge', L, 'bottom');
    assert.ok(lb.kneeF[1] > -20 && Math.abs(lb.hip[1] - lb.kneeN[1]) < 10, `L${L}: lunge reaches the bottom`);
    assert.ok(lb.ankleF[0] < lb.ankleN[0] - 70, `L${L}: a big step back`);
  }
  const bul = demoOf('split-squat', 2).demo, chair = bul.props[0], t = solve(bul.poses.top, bul.rig);
  assert.ok(t.ankleF[0] > chair.x && t.ankleF[0] < chair.x + chair.depth && t.ankleF[1] < -chair.seat, 'Bulgarian: back foot on the chair seat');
});

test('glute bridge and hip thrust: shoulders down, feet planted, hips rise to a straight line', () => {
  for (let L = 0; L < 3; L++) {
    const up = at('glute-bridge', L, 'up'), down = at('glute-bridge', L, 'down');
    const torso = deg(sub(up.hip, up.sh)), thigh = deg(sub(up.kneeF, up.hipF));
    assert.ok(Math.abs(torso - thigh) < 16, `L${L}: shoulders, hips and knees in a line at the top (${(torso - thigh).toFixed(0)}°)`);
    assert.ok(up.hip[1] < down.hip[1] - 20, `L${L}: the hips really lift`);
    if (L < 2) assert.ok(down.hip[1] >= -BODY.lieH - 0.5, `L${L}: starts lying flat`);
  }
  const d1 = demoOf('glute-bridge', 1).demo;
  for (const { P } of frames(d1, demoOf('glute-bridge', 1).seq)) assert.ok(dist(P.handN, P.hip) < 16, 'Regular: the 15 rides on the hips');
  const th = at('glute-bridge', 2, 'up');
  assert.ok(Math.abs(th.hip[1] - th.sh[1]) < 2, 'hip thrust: torso level at the top');
  assert.ok(th.ankleN[1] < -20, 'hip thrust: the free foot is off the floor');
});

test('rear-delt fly: hinged forward, arms out to back level, never past it', () => {
  for (let L = 0; L < 3; L++) {
    for (const { q } of loop('rear-delt-fly', L).F) assert.ok(q.lean >= 60 && q.sh <= 90, 'stays hinged; arms stop at back level');
    const up = at('rear-delt-fly', L, 'up'), down = at('rear-delt-fly', L, 'down');
    assert.ok(Math.abs(up.handN[1] - up.shN[1]) < 8, 'arms level at the top');
    assert.ok(down.handN[1] > down.shN[1] + 40, 'arms hang at the start');
  }
});

test('curls: elbows pinned, the weight comes to the shoulder; wrist curls move only the wrist', () => {
  for (const slug of ['curl', 'hammer-curl', 'reverse-curl']) {
    for (let L = 0; L < 3; L++) {
      const { F } = loop(slug, L);
      const e0 = F[0].P.elbowN;
      for (const { P, q } of F) {
        assert.ok(dist(P.elbowN, e0) < 4, `${slug}: elbows stay pinned at the sides`);
        assert.ok(q.lean === 0 && q.wr === 0, `${slug}: no swinging, wrists straight`);
      }
      const up = at(slug, L, 'up');
      assert.ok(dist(up.handN, up.sh) < 22, `${slug}: the weight comes up to the shoulder`);
    }
  }
  const { demo, F } = loop('wrist-curl', 0);
  const e0 = F[0].P.elbowN;
  for (const { P } of F) {
    assert.ok(dist(P.elbowN, e0) < 0.5 && dist(P.handN, demo.poses.up.ik.handN) < 0.5, 'forearms rest still on the thighs');
    assert.ok(P.handN[0] > P.kneeN[0] - 2, 'wrists just past the knees');
  }
  const dn = at('wrist-curl', 0, 'down'), up = at('wrist-curl', 0, 'up');
  assert.ok(dn.tipN[1] - up.tipN[1] > 8, 'the wrist curls the weight up');
});

test('floor press: on your back, upper arms touch down, press straight up over the chest', () => {
  for (let L = 0; L < 3; L++) {
    for (const { P } of loop('floor-press', L).F) assert.ok(Math.abs(P.sh[1] + BODY.lieH) < 0.1 && P.hip[1] >= -BODY.lieH - 0.1, 'lying flat');
    const b = at('floor-press', L, 'bottom'), t = at('floor-press', L, 'top');
    assert.ok(b.elbowN[1] + BODY.w.upper / 2 > -2, 'upper arms reach the floor');
    assert.ok(Math.abs(deg(sub(b.handN, b.elbowN))) > 170, 'forearms upright at the bottom');
    assert.ok(t.q.el <= 5 && t.handN[1] < t.sh[1] - 55 && Math.abs(t.handN[0] - t.sh[0]) < 12, 'arms straight up over the chest');
  }
});

test('step-up: the lead foot stays on the stair, you stand tall on it, the other foot clears the edge', () => {
  for (let L = 0; L < 3; L++) {
    const { demo, F } = loop('step-up', L), stair = demo.props[0];
    for (const { P } of F) {
      const x0 = Math.min(P.heelF[0], P.toeF[0]), x1 = Math.max(P.heelF[0], P.toeF[0]);
      if (x1 > stair.x && x0 < stair.x + stair.depth) assert.ok(Math.max(P.heelF[1], P.toeF[1], P.ankleF[1]) <= -stair.h - 1, `L${L}: trail foot clears the stair`);
    }
    const top = at('step-up', L, 'top');
    assert.ok(straightBody(top.q) && top.q.lean === 0, 'stands tall on the stair');
    assert.ok(Math.abs(top.ankleF[1] - top.ankleN[1]) < 1, 'both feet up on the stair at the top');
  }
});

test('pike push-up: hips stay high, head comes down just ahead of the hands', () => {
  for (let L = 0; L < 3; L++) {
    for (const { P } of loop('pike-push-up', L).F) assert.ok(P.hip[1] < P.sh[1] - 25, 'hips stay high above the shoulders');
    const b = at('pike-push-up', L, 'bottom'), t = at('pike-push-up', L, 'top');
    assert.ok(t.q.el <= 25, 'arms straight at the top');
    assert.ok(b.head[1] + BODY.headR > -8 && b.head[0] > b.handN[0], 'head near the floor, in front of the hands');
  }
});

test('bent-over row: the back angle never changes, soft knees, pull to the ribs', () => {
  for (let L = 0; L < 3; L++) {
    for (const { q } of loop('bent-over-row', L).F) assert.ok(q.lean === 60 && q.knee <= 30, 'back angle steady, knees soft');
    const up = at('bent-over-row', L, 'up'), down = at('bent-over-row', L, 'down');
    assert.ok(Math.abs(down.handN[0] - down.sh[0]) < 3, 'arms hang straight down');
    assert.ok(up.handN[0] > up.hip[0] && up.handN[0] < up.sh[0] && up.elbowN[1] < up.handN[1], 'weights end at the ribs, elbows up behind');
  }
});

test('calf raise: the ball of the foot stays put, the heel rises well, and on the stair it drops below the step', () => {
  for (let L = 0; L < 3; L++) {
    const down = at('calf-raise', L, 'down'), up = at('calf-raise', L, 'up');
    assert.ok(down.heelN[1] - up.heelN[1] > 8, `L${L}: heels rise high`);
    assert.ok(straightBody({ hip: down.q.hip, knee: down.q.knee }), 'standing tall');
    if (L > 0) assert.ok(down.heelN[1] > -18 - BODY.ankleH + 2, `L${L}: heel below the step`);
  }
  const one = at('calf-raise', 2, 'up');
  assert.ok(one.ankleF[1] < one.ankleN[1] - 15, 'single leg: the other foot is off the stair');
});

test('Arnold press: chin, elbows open, overhead', () => {
  for (let L = 0; L < 3; L++) {
    const chin = at('arnold-press', L, 'chin'), top = at('arnold-press', L, 'top');
    assert.ok(chin.handN[0] > chin.sh[0] + 15 && Math.abs(chin.handN[1] - chin.head[1]) < 18, 'starts in front, at chin height');
    assert.ok(top.handN[1] < top.head[1] - 20 && top.q.el <= 6, 'finishes straight overhead');
  }
});

test('farmer’s hold: tall, arms straight down at the sides', () => {
  for (let L = 0; L < 3; L++) for (const { P, q } of loop('farmers-hold', L).F) {
    assert.ok(q.lean === 0 && q.el <= 5 && Math.abs(P.handN[0] - P.sh[0]) < 6, 'tall, arms long');
  }
});

test('warm-up drills: jacks go wide and overhead, squats reach depth, the inchworm walks to a plank', () => {
  const out = at('jumping-jacks', 0, 'out'), inn = at('jumping-jacks', 0, 'in');
  assert.ok(out.handN[1] < out.head[1] && out.ankleF[0] - out.ankleN[0] > 40, 'jacks: arms overhead, feet wide');
  assert.ok(inn.ankleF[0] - inn.ankleN[0] < 26, 'jacks: feet together');
  assert.ok(Math.max(...loop('jumping-jacks').F.map(({ P }) => P.ankleN[1])) <= -BODY.ankleH + 0.5, 'jacks: feet land on the floor');
  const sq = at('bodyweight-squat', 0, 'bottom');
  assert.ok(sq.hip[1] >= sq.kneeN[1] - 2 && Math.abs(sq.sh[0] - (sq.heelN[0] + sq.toeN[0]) / 2) < 14, 'squat: thighs level, balanced over the feet');
  const pl = at('inchworm', 0, 'plank');
  assert.ok(straightBody(pl.q) && Math.abs(pl.handN[0] - pl.sh[0]) < 6, 'inchworm: ends in a straight plank');
  const hi = at('hip-hinge', 0, 'bottom');
  assert.ok(hi.q.knee <= 25 && hi.hip[0] < hi.ankleN[0] - 5, 'hinge: hips back, knees soft');
  for (const p of ['upN', 'upF']) { const m = at('marching', 0, p); assert.ok(Math.min(m.kneeN[1], m.kneeF[1]) < m.hip[1] + 20, `march: knee up toward hip height (${p})`); }
});

test('conditioning drills: thrusts reach a plank, burpees touch the chest down and leave the floor', () => {
  for (const slug of ['squat-thrust', 'burpee']) {
    const pl = at(slug, 0, 'plank');
    assert.ok(straightBody(pl.q) && pl.q.el <= 10, `${slug}: a straight plank`);
    const sq = at(slug, 0, 'squat');
    assert.ok(dist(sq.handN, [44, -3.75]) < 0.5, `${slug}: hands down in the squat`);
  }
  const ch = at('burpee', 0, 'chest'), j = at('burpee', 0, 'jump');
  assert.ok(ch.sh[1] > -32, 'burpee: chest to the floor');
  assert.ok(j.toeN[1] < -12 && j.handN[1] < j.head[1], 'burpee: a jump with the arms up');
  for (const { P } of loop('mountain-climber').F) assert.ok(dist(P.hip, [80.6, -45.6]) < 0.1 && Math.max(P.toeN[1], P.toeF[1]) <= 0.5, 'climbers: hips still');
  for (const { P } of loop('flutter-kick').F) assert.ok(P.heelN[1] < -10 && P.heelN[1] > -45, 'flutter kicks: legs low but off the floor');
  const up = at('sit-up', 0, 'up');
  assert.ok(up.q.lean > -20 && up.sh[1] < -50, 'sit-up: all the way up');
});

test('stretches: real positions, hands and knees where they belong', () => {
  for (const name of ['cat', 'cow']) {
    const c = at('cat-cow', 0, name);
    assert.ok(Math.abs(c.kneeN[0] - c.hip[0]) < 3 && Math.abs(c.handN[0] - c.sh[0]) < 6, `${name}: knees under hips, hands under shoulders`);
  }
  assert.ok(at('cat-cow', 0, 'cat').q.curve > 0 && at('cat-cow', 0, 'cow').q.curve < 0, 'cat rounds, cow sags');
  const th = at('thread-the-needle', 0, 'thread');
  assert.ok(th.sh[1] > at('thread-the-needle', 0, 'fours').sh[1] + 10, 'thread: the shoulder drops toward the floor');
  for (const slug of ['couch-stretch', 'hip-flexor-stretch']) {
    for (const { P, q } of loop(slug).F) {
      assert.ok(q.lean <= 2 && q.fhip < -15, `${slug}: tall, back hip opened`);
      assert.ok(Math.abs(P.kneeF[1] + BODY.w.shin / 2) < 0.5, `${slug}: back knee on the floor`);
    }
  }
  const cs = at('couch-stretch', 0, 'set'), couch = demoOf('couch-stretch').demo.props[0];
  assert.ok(cs.ankleF[1] < -couch.seat && cs.ankleF[0] < couch.x + couch.depth + 3, 'couch stretch: back foot up on the seat');
  const ds = at('deep-squat-hold', 0, 'hold');
  assert.ok(ds.hip[1] > ds.kneeN[1] + 10, 'deep squat: hips well below the knees');
  const w = at('worlds-greatest-stretch', 0, 'reach');
  assert.ok(w.handN[1] < w.sh[1] - 50, 'WGS: the arm reaches to the ceiling');
  const ff = at('forward-fold', 0, 'reach');
  assert.ok(ff.handN[1] > -40 && ff.q.knee > 5, 'forward fold: hands toward the toes, knees soft');
});

// The animator itself, run against a stand-in element: every loop draws its frames, captions and
// tempo count without throwing (a shadowed variable once froze every captioned demo on frame one).
test('the animator runs every demo loop: frames, captions and counts', () => {
  const node = () => ({ textContent: '', innerHTML: '', setAttribute() {} });
  let frame = null, now = 0;
  globalThis.requestAnimationFrame = (f) => { frame = f; return 1; };
  globalThis.performance ??= { now: () => now };
  for (const { where, demo, seq, strip } of allLoops()) {
    const ph = node(), ct = node(), g = { ...node(), querySelectorAll: () => [] };
    const el = { isConnected: true, classList: { add() {}, remove() {} }, innerHTML: '',
      querySelector: (q) => (q === 'g.fr' ? g : q === '.ph' ? ph : q === '.ct' ? ct : null) };
    mountDemo(el, demo, { seq, strip, key: 'test:' + where, label: where });
    const labels = new Set();
    const t0 = performance.now();
    for (let i = 0; i <= 40; i++) {
      const f = frame; frame = null;
      assert.ok(f, `${where}: the loop stopped`);
      assert.doesNotThrow(() => f(t0 + (loopLength(seq) * 1000 * i) / 40), `${where}: frame ${i}`);
      labels.add(ph.textContent);
    }
    const captions = seq.filter((x) => x[2]).map((x) => x[2]);
    for (const c of captions) assert.ok(labels.has(c), `${where}: caption "${c}" never shown`);
  }
  delete globalThis.requestAnimationFrame;
});
