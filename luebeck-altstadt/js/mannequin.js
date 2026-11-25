// Built-in human: generated in code (no download), real skeleton with Mixamo-style bone names so the same
// locomotion blending and two-bone IK (bike / car seating) work, plus procedural idle / walk / run clips.
import * as THREE from 'three';

// rest pose (metres), facing +z, character's left = +x
const REST = {
  Hips: [null, 0, 0.95, 0], Spine: ['Hips', 0, 0.1, 0], Spine1: ['Spine', 0, 0.17, 0], Neck: ['Spine1', 0, 0.22, 0], Head: ['Neck', 0, 0.09, 0.01],
  LeftArm: ['Spine1', 0.19, 0.17, -0.01], LeftForeArm: ['LeftArm', 0.02, -0.28, 0], LeftHand: ['LeftForeArm', 0, -0.25, 0.01],
  RightArm: ['Spine1', -0.19, 0.17, -0.01], RightForeArm: ['RightArm', -0.02, -0.28, 0], RightHand: ['RightForeArm', 0, -0.25, 0.01],
  LeftUpLeg: ['Hips', 0.095, -0.06, 0], LeftLeg: ['LeftUpLeg', 0, -0.42, 0.01], LeftFoot: ['LeftLeg', 0, -0.41, -0.02],
  RightUpLeg: ['Hips', -0.095, -0.06, 0], RightLeg: ['RightUpLeg', 0, -0.42, 0.01], RightFoot: ['RightLeg', 0, -0.41, -0.02],
};
const NAMES = Object.keys(REST);
function restWorld() {
  const w = {};
  for (const n of NAMES) { const [p, x, y, z] = REST[n]; w[n] = p ? [w[p][0] + x, w[p][1] + y, w[p][2] + z] : [x, y, z]; }
  return w;
}
const RW = restWorld();

/* ---------- geometry: parts skinned to bones, limbs blend into the next bone near the joint ---------- */
// part(geo, bone, color) → rigid; partL(...) → limb from joint a to joint b, weights fade from bone to child bone at b
function part(geo, bone, color, list, child = null, a = null, b = null) { list.push({ geo: geo.index ? geo.toNonIndexed() : geo, bone: NAMES.indexOf(bone), child: child ? NAMES.indexOf(child) : -1, a, b, color }); }
function limb(a, b, r0, r1, seg = 14, squash = 1) {   // tapered capsule from a to b (squash < 1 flattens front-back)
  const v = new THREE.Vector3().subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a)), L = v.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg, 6, true);
  const cap0 = new THREE.SphereGeometry(r0, seg, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, -L / 2, 0), cap1 = new THREE.SphereGeometry(r1, seg, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, L / 2, 0);
  const m = merge([g, cap0, cap1]); m.scale(1, 1, squash);
  m.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()));
  m.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return m;
}
function merge(list) {
  const pos = [], nor = []; for (let g of list) { g = g.index ? g.toNonIndexed() : g; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return m;
}
function lathe(points, seg = 24) { return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg); }
function bodyGeometry(look) {
  const P = [], w = RW, f = look.build, fem = !!look.fem;
  const { skin, top, bottom, shoes, hair } = look;
  const dark = (c, k = 0.6) => new THREE.Color(c).multiplyScalar(k).getHex();
  const ell = (rx, ry, rz, ws = 20, hs = 14) => new THREE.SphereGeometry(1, ws, hs).scale(rx, ry, rz);
  // --- torso: one smooth lathe from hip to shoulders, flattened front-back; waist narrower for 'fem'
  const hy = w.Hips[1], sy = w.Spine1[1], ny = w.Neck[1];
  const pelvis = lathe([[0.001, hy - 0.12], [0.15 * f, hy - 0.1], [0.165 * f, hy - 0.02], [(fem ? 0.135 : 0.15) * f, hy + 0.08]], 22); pelvis.scale(1, 1, 0.72);
  part(pelvis, 'Hips', look.skirt ? top : bottom, P);
  const waist = lathe([[(fem ? 0.135 : 0.15) * f, hy + 0.07], [(fem ? 0.125 : 0.145) * f, w.Spine[1] + 0.08], [0.16 * f, sy]], 22); waist.scale(1, 1, 0.7);
  part(waist, 'Spine', top, P);
  const chest = lathe([[0.16 * f, sy - 0.01], [0.185 * f, sy + 0.09], [0.19 * f, sy + 0.15], [0.16 * f, ny - 0.03], [0.1 * f, ny + 0.015], [0.055, ny + 0.035]], 22); chest.scale(1, 1, 0.68);
  part(chest, 'Spine1', top, P);
  if (fem) part(ell(0.15 * f, 0.06, 0.04).translate(0, sy + 0.07, 0.085), 'Spine1', top, P);   // soft bust line
  // clothing details: collar, placket/zip line, hem band, belt
  part(new THREE.TorusGeometry(0.06, 0.014, 6, 18).rotateX(Math.PI / 2).translate(0, ny - 0.005, 0.005), 'Spine1', look.collar ?? dark(top, 0.85), P);
  if (look.jacket) { part(new THREE.BoxGeometry(0.012, 0.36, 0.01).translate(0, sy, 0.13 * f), 'Spine1', dark(top, 0.55), P); part(new THREE.BoxGeometry(0.012, 0.2, 0.01).translate(0, w.Spine[1] + 0.04, 0.11 * f), 'Spine', dark(top, 0.55), P); }
  part(lathe([[0.152 * f, hy + 0.035], [0.152 * f, hy + 0.07]], 22).scale(1, 1, 0.73), 'Hips', look.skirt ? top : 0x2a2420, P);   // belt / waistband
  if (look.longCoat) part(lathe([[0.17 * f, hy + 0.05], [0.2 * f, hy - 0.2], [0.23 * f, hy - 0.42]], 22).scale(1, 1, 0.8), 'Hips', top, P);
  if (look.skirt) part(lathe([[0.15 * f, hy + 0.03], [0.22 * f, hy - 0.2], [0.27 * f, hy - 0.4]], 22).scale(1, 1, 0.85), 'Hips', top, P);
  // --- neck & head
  part(limb([0, ny, 0], [0, w.Head[1] + 0.0, 0.008], 0.058, 0.052), 'Neck', skin, P, 'Head', [0, ny, 0], w.Head);
  const H0 = w.Head[1] + 0.062, HZ = 0.018;
  const skull = ell(0.084, 0.105, 0.097, 24, 18); { const p = skull.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i); if (y < 0 && z > 0) p.setX(i, p.getX(i) * (1 + y * 3.2)); } skull.computeVertexNormals(); }   // narrower jaw & chin
  part(skull.translate(0, H0, HZ), 'Head', skin, P);
  part(ell(0.011, 0.02, 0.012).translate(0, H0 - 0.006, HZ + 0.091), 'Head', skin, P);                                      // nose bridge
  part(ell(0.013, 0.009, 0.01).translate(0, H0 - 0.026, HZ + 0.094), 'Head', skin, P);                                       // nose tip
  part(ell(0.021, 0.005, 0.006).translate(0, H0 - 0.052, HZ + 0.086), 'Head', look.lips ?? dark(skin, 0.7), P);             // mouth
  part(ell(0.022, 0.011, 0.012).translate(0, H0 - 0.074, HZ + 0.062), 'Head', skin, P);                                        // chin
  for (const sd of [-1, 1]) {
    part(ell(0.013, 0.008, 0.005).translate(sd * 0.031, H0 + 0.012, HZ + 0.084), 'Head', 0xf4f1ea, P);                       // eye white
    part(ell(0.0065, 0.0065, 0.004).translate(sd * 0.031, H0 + 0.012, HZ + 0.088), 'Head', look.eyes ?? 0x3b2a1e, P);          // iris
    part(new THREE.BoxGeometry(0.03, 0.006, 0.01).rotateZ(sd * -0.15).translate(sd * 0.034, H0 + 0.034, HZ + 0.088), 'Head', dark(hair, 0.9), P);   // eyebrow
    part(ell(0.012, 0.024, 0.014).translate(sd * 0.083, H0, HZ - 0.005), 'Head', skin, P);                                   // ear
  }
  // hair styles: 0 short crop, 1 side part, 2 bob, 3 long, 4 bun, 5 bald-ish
  const hs = look.hairStyle ?? 0, crown = (thetaLen, sx = 1.08, sy2 = 1.08, sz = 1.1) => new THREE.SphereGeometry(1, 22, 14, 0, Math.PI * 2, 0, Math.PI * thetaLen).rotateX(-0.42).scale(0.084 * sx, 0.105 * sy2, 0.097 * sz).translate(0, H0 + 0.006, HZ - 0.006);
  if (hs !== 5) part(crown(hs >= 2 ? 0.44 : 0.38), 'Head', hair, P);
  if (hs === 1) part(ell(0.06, 0.018, 0.035).rotateZ(0.25).translate(0.02, H0 + 0.075, HZ + 0.06), 'Head', hair, P);           // fringe swept
  if (hs === 2) { const bob = lathe([[0.094, H0 + 0.04], [0.098, H0 - 0.03], [0.088, H0 - 0.075]], 20, ); bob.scale(1, 1, 1.05); bob.translate(0, 0, HZ - 0.02); const pp = bob.attributes.position; for (let i = 0; i < pp.count; i++) if (pp.getZ(i) > HZ + 0.03) pp.setZ(i, HZ + 0.03 - (pp.getZ(i) - HZ - 0.03) * 0.0); part(bob, 'Head', hair, P); }
  if (hs === 3) part(limb([0, H0 + 0.02, HZ - 0.06], [0, H0 - 0.2, HZ - 0.08], 0.085, 0.06, 14, 0.6), 'Head', hair, P);
  if (hs === 4) part(new THREE.SphereGeometry(0.045, 14, 10).translate(0, H0 + 0.07, HZ - 0.1), 'Head', hair, P);
  if (look.glasses) for (const sd of [-1, 1]) part(new THREE.TorusGeometry(0.018, 0.0025, 4, 14).translate(sd * 0.032, H0 + 0.012, HZ + 0.097), 'Head', 0x1a1a1a, P);
  if (look.cap) { part(crown(0.42, 1.14, 1.05, 1.14), 'Head', look.cap, P); part(ell(0.07, 0.008, 0.05).translate(0, H0 + 0.055, HZ + 0.11), 'Head', look.cap, P); }
  // --- arms (sleeve, cuff, hand with thumb)
  for (const sd of ['Left', 'Right']) {
    const s = sd === 'Left' ? 1 : -1, A = w[sd + 'Arm'], F = w[sd + 'ForeArm'], Hn = w[sd + 'Hand'];
    part(ell(0.05 * f, 0.042, 0.05).translate(A[0] - s * 0.018, A[1] - 0.02, A[2]), 'Spine1', top, P);                         // shoulder cap
    part(limb(A, F, 0.05 * f, 0.041 * f), sd + 'Arm', top, P, sd + 'ForeArm', A, F);
    const sleeveEnd = look.shortSleeve ? [A[0] + (F[0] - A[0]) * 0.45, A[1] + (F[1] - A[1]) * 0.45, A[2]] : null;
    if (look.shortSleeve) { part(limb(sleeveEnd, F, 0.036, 0.035), sd + 'Arm', skin, P, sd + 'ForeArm', A, F); part(limb(F, Hn, 0.036, 0.029), sd + 'ForeArm', skin, P, sd + 'Hand', F, Hn); }
    else { part(limb(F, Hn, 0.04, 0.034), sd + 'ForeArm', top, P, sd + 'Hand', F, Hn); part(new THREE.TorusGeometry(0.033, 0.007, 5, 14).rotateX(Math.PI / 2).translate(Hn[0], Hn[1] + 0.025, Hn[2]), sd + 'ForeArm', dark(top, 0.8), P); }
    part(ell(0.028, 0.052, 0.014).translate(Hn[0], Hn[1] - 0.045, Hn[2]), sd + 'Hand', skin, P);                               // palm
    part(ell(0.025, 0.035, 0.012).translate(Hn[0], Hn[1] - 0.105, Hn[2] + 0.004), sd + 'Hand', skin, P);                      // fingers
    part(limb([Hn[0] + s * -0.0, Hn[1] - 0.02, Hn[2] + 0.018], [Hn[0], Hn[1] - 0.065, Hn[2] + 0.032], 0.009, 0.008, 8), sd + 'Hand', skin, P);   // thumb
    // --- legs (trousers with cuff, shoe with sole and toe)
    const U = w[sd + 'UpLeg'], K = w[sd + 'Leg'], Ft = w[sd + 'Foot'];
    const legTop = look.skirt ? skin : bottom;
    part(limb(U, K, (fem ? 0.084 : 0.08) * f, 0.056), sd + 'UpLeg', look.skirt && !look.tights ? skin : legTop, P, sd + 'Leg', U, K);
    part(limb(K, Ft, 0.054, 0.04), sd + 'Leg', look.skirt ? (look.tights ?? skin) : bottom, P, sd + 'Foot', K, Ft);
    part(ell(0.05, 0.05, 0.055).translate(K[0], K[1], K[2] + 0.01), sd + 'Leg', look.skirt ? (look.tights ?? skin) : bottom, P);   // knee
    if (!look.skirt) part(lathe([[0.046, Ft[1] + 0.05], [0.05, Ft[1] + 0.02]], 14).translate(Ft[0], 0, Ft[2]), sd + 'Leg', dark(bottom, 0.8), P);   // trouser cuff
    const shoe = ell(0.048, 0.042, 0.13, 16, 10); { const p = shoe.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < -0.01) p.setY(i, -0.01); shoe.computeVertexNormals(); }
    part(shoe.translate(Ft[0], Ft[1] - 0.035, Ft[2] + 0.055), sd + 'Foot', shoes, P);
    part(new THREE.BoxGeometry(0.095, 0.018, 0.26).translate(Ft[0], Ft[1] - 0.052, Ft[2] + 0.055), sd + 'Foot', look.sole ?? 0xe8e4dc, P);   // sole
  }
  if (look.bag) { part(new THREE.BoxGeometry(0.27, 0.33, 0.12).translate(0, sy + 0.02, -0.16), 'Spine1', look.bag, P); for (const sd of [-1, 1]) part(new THREE.BoxGeometry(0.018, 0.22, 0.008).rotateX(0.2).translate(sd * 0.085, sy + 0.1, 0.115), 'Spine1', dark(look.bag, 0.8), P); }
  if (look.scarf) part(new THREE.TorusGeometry(0.072, 0.024, 8, 18).rotateX(Math.PI / 2).translate(0, ny + 0.005, 0.005), 'Spine1', look.scarf, P);
  // --- assemble skinned geometry; limb vertices near the child joint blend 50/50 into the child bone (smooth elbows & knees)
  const pos = [], nor = [], col = [], si = [], sw = [], tmp = new THREE.Vector3();
  for (const p of P) {
    const g = p.geo, c = new THREE.Color(p.color), pa = g.attributes.position;
    pos.push(...pa.array); nor.push(...g.attributes.normal.array);
    let ax = null; if (p.child >= 0) { ax = new THREE.Vector3(p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2]); }
    const L2 = ax ? ax.lengthSq() : 1;
    // tiny per-part tint jitter so fabric and skin don't look flat
    for (let i = 0; i < pa.count; i++) {
      const j = 1 + (Math.sin(i * 12.9898 + p.bone * 7.1) * 0.5) * 0.04; col.push(c.r * j, c.g * j, c.b * j);
      let wc = 0;
      if (ax) { tmp.fromBufferAttribute(pa, i); const t = ((tmp.x - p.a[0]) * ax.x + (tmp.y - p.a[1]) * ax.y + (tmp.z - p.a[2]) * ax.z) / L2; wc = THREE.MathUtils.smoothstep(t, 0.78, 1.12) * 0.5; }
      if (wc > 0.001) { si.push(p.bone, p.child, 0, 0); sw.push(1 - wc, wc, 0, 0); } else { si.push(p.bone, 0, 0, 0); sw.push(1, 0, 0, 0); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  return geo;
}

/* ---------- procedural clips (local rotations about bone axes) ---------- */
const q = (x, y = 0, z = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)).toArray();
function cycle(name, period, fn) {
  const N = 24, times = [], tracks = {};
  for (let i = 0; i <= N; i++) {
    const t = i / N, ph = t * Math.PI * 2; times.push(t * period);
    for (const [bone, e] of Object.entries(fn(ph))) (tracks[bone] ||= []).push(...q(...e));
  }
  return new THREE.AnimationClip(name, period, Object.entries(tracks).map(([b, v]) => new THREE.QuaternionKeyframeTrack(`mixamorig${b}.quaternion`, times, v)));
}
// leg swing: negative X = forward for a leg hanging down; knee bends with positive X
const CLIPS = {
  Idle: cycle('Idle', 3.2, (p) => ({ Spine1: [Math.sin(p) * 0.015], Head: [Math.sin(p + 1) * 0.02, Math.sin(p * 0.5) * 0.08], LeftArm: [0.02, 0, 0.06], RightArm: [0.02, 0, -0.06], LeftForeArm: [-0.12], RightForeArm: [-0.12], LeftUpLeg: [0, 0, 0.02], RightUpLeg: [0, 0, -0.02] })),
  Walk: cycle('Walk', 1.05, (p) => {
    const s = Math.sin(p), knee = (a) => Math.max(0, Math.sin(a + 0.9)) * 0.75 + 0.05;
    return { Hips: [0.02, s * 0.08, 0], Spine: [0.03, -s * 0.06, 0], Spine1: [0, -s * 0.05, 0], Head: [-0.03, s * 0.1, 0],
      LeftUpLeg: [-s * 0.42, 0, 0.02], RightUpLeg: [s * 0.42, 0, -0.02], LeftLeg: [knee(p)], RightLeg: [knee(p + Math.PI)],
      LeftFoot: [Math.sin(p - 0.6) * 0.2], RightFoot: [-Math.sin(p - 0.6) * 0.2],
      LeftArm: [s * 0.35, 0, 0.07], RightArm: [-s * 0.35, 0, -0.07], LeftForeArm: [-0.25 - Math.max(0, s) * 0.25], RightForeArm: [-0.25 - Math.max(0, -s) * 0.25] };
  }),
  Run: cycle('Run', 0.72, (p) => {
    const s = Math.sin(p), knee = (a) => Math.max(0, Math.sin(a + 1.0)) * 1.5 + 0.15;
    return { Hips: [0.12, s * 0.12, 0], Spine: [0.1, -s * 0.1, 0], Spine1: [0.04, -s * 0.08, 0], Head: [-0.12, s * 0.06, 0],
      LeftUpLeg: [-s * 0.8 - 0.15, 0, 0.03], RightUpLeg: [s * 0.8 - 0.15, 0, -0.03], LeftLeg: [knee(p)], RightLeg: [knee(p + Math.PI)],
      LeftFoot: [Math.sin(p - 0.5) * 0.35], RightFoot: [-Math.sin(p - 0.5) * 0.35],
      LeftArm: [s * 0.7, 0, 0.12], RightArm: [-s * 0.7, 0, -0.12], LeftForeArm: [-1.2], RightForeArm: [-1.2] };
  }),
};

const SKIN = [0xf1d0b5, 0xe2b38f, 0xc68c62, 0x8d5a3b, 0xf6dcc8, 0xd9a47e];
const TOPS = [0x2b3a55, 0x7a2e2a, 0xd9d3c6, 0x3f5a43, 0x1f1f22, 0xb8873a, 0x5b6b7a, 0x8c6d8f, 0xc4c0b6, 0x204a6b, 0xa14a2f, 0xe8e4da, 0x6b7f5a];
const BOTTOMS = [0x22252b, 0x2f3b52, 0x5a4b3a, 0x3a3a3a, 0xc9bfa8, 0x1f2a3a, 0x48505a];
const HAIR = [0x2a1d15, 0x4a3424, 0xb89668, 0x141414, 0x7a4b2a, 0xcfcac2, 0x8f8a82];
const SHOES = [0x1a1a1a, 0x3b2618, 0xe8e6e0, 0x5a4636];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
export function randomLook() {
  const fem = Math.random() < 0.5, skirt = fem && Math.random() < 0.3, hair = pick(HAIR);
  return { fem, skin: pick(SKIN), top: pick(TOPS), bottom: pick(BOTTOMS), hair, shoes: pick(SHOES), build: (fem ? 0.9 : 0.98) + Math.random() * 0.14,
    hairStyle: fem ? pick([2, 3, 3, 4, 1]) : pick([0, 0, 1, 1, 5]), skirt, tights: skirt && Math.random() < 0.5 ? 0x1e1e22 : null,
    shortSleeve: Math.random() < 0.3, jacket: Math.random() < 0.4, longCoat: !skirt && Math.random() < 0.12, glasses: Math.random() < 0.2,
    cap: Math.random() < 0.08 ? pick([0x1f2a3a, 0x7a2e2a, 0xd9d3c6]) : null, scarf: Math.random() < 0.12 ? pick([0x9a2a2a, 0xd9c7a0, 0x2b4a6b]) : null,
    bag: Math.random() < 0.25 ? pick([0x3b2618, 0x1f1f22, 0x6b4a32]) : null, sole: pick([0xe8e4dc, 0x1a1a1a, 0x5a4636]), eyes: pick([0x3b2a1e, 0x2f4a6b, 0x4a5a3a, 0x1e1a16]),
    height: (fem ? 0.93 : 1.0) + Math.random() * 0.1 };
}
export const PLAYER_LOOK = { skin: 0xe2b38f, top: 0xa8432a, bottom: 0x2b3140, hair: 0x3b2a1e, shoes: 0x3b2618, sole: 0xe8e4dc, build: 1, hairStyle: 1, jacket: true, scarf: 0xd9c7a0, bag: 0x4a3b2c, height: 1, eyes: 0x2f4a6b };

// shared people material: fabric weave + soft ambient occlusion baked from the rest pose, gentle rim light
const PEOPLE_MAT = new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, vertexColors: true, roughness: 0.78, sheen: 0.5, sheenRoughness: 0.7, sheenColor: new THREE.Color(0x9a9a9a) });
PEOPLE_MAT.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRest;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vRest;
      float ph(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float pn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(ph(i), ph(i+vec3(1,0,0)), f.x), mix(ph(i+vec3(0,1,0)), ph(i+vec3(1,1,0)), f.x), f.y),
                   mix(mix(ph(i+vec3(0,0,1)), ph(i+vec3(1,0,1)), f.x), mix(ph(i+vec3(0,1,1)), ph(i+vec3(1,1,1)), f.x), f.y), f.z); }`)
    .replace('#include <color_fragment>', `#include <color_fragment>
      // ambient occlusion from the rest pose: under the chin, armpits, between the legs, toward the feet
      float ao = 1.0;
      ao *= mix(0.72, 1.0, smoothstep(0.0, 0.9, vRest.y));                                    // lower legs a bit darker
      ao *= 1.0 - 0.25 * (1.0 - smoothstep(0.0, 0.06, abs(vRest.x))) * step(vRest.y, 0.92) * step(0.3, vRest.y);   // inner thighs
      ao *= 1.0 - 0.2 * smoothstep(0.17, 0.2, abs(vRest.x)) * smoothstep(1.32, 1.22, vRest.y) * step(1.0, vRest.y);   // under the arms
      ao *= 1.0 - 0.25 * smoothstep(1.47, 1.43, vRest.y) * smoothstep(1.38, 1.42, vRest.y);   // neck shadow under the jaw
      // fabric: fine weave and slow wrinkles; folds deepen at elbows/knees heights
      float weave = pn(vRest * 420.0) * 0.5 + pn(vRest * 160.0) * 0.5;
      float wrinkle = pn(vec3(vRest.x * 18.0, vRest.y * 9.0, vRest.z * 18.0));
      diffuseColor.rgb *= ao * (0.93 + weave * 0.1) * (0.92 + wrinkle * 0.12);`)
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + (pn(vRest * 300.0) - 0.5) * 0.15, 0.35, 1.0);');
};
PEOPLE_MAT.customProgramCacheKey = () => 'people';

export function createMannequin(scene, look = randomLook()) {
  const bones = {}, list = [];
  for (const n of NAMES) {
    const b = new THREE.Bone(); b.name = 'mixamorig' + n; const [p, x, y, z] = REST[n]; b.position.set(x, y, z);
    if (p) bones[p].add(b); bones[n] = b; list.push(b);
  }
  const mat = PEOPLE_MAT;   // one shared material for everybody (cheap), detail comes from the shader below
  const mesh = new THREE.SkinnedMesh(bodyGeometry(look), mat);
  mesh.add(bones.Hips); mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(list));
  mesh.castShadow = true; mesh.frustumCulled = false;
  const model = new THREE.Group(); model.add(mesh); model.scale.setScalar(look.height || 1);
  const root = new THREE.Group(); root.add(model); scene.add(root);
  const mixer = new THREE.AnimationMixer(model), A = {};
  for (const [n, c] of Object.entries(CLIPS)) { const a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(n === 'Idle' ? 1 : 0); a.time = Math.random() * c.duration; A[n.toLowerCase()] = a; }
  return { root, model, bones, mixer, A, clips: CLIPS, w: { idle: 1, walk: 0, run: 0 }, builtin: true };
}
