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

/* ---------- geometry: rigid parts, each skinned to one bone ---------- */
function part(geo, bone, color, list) { list.push({ geo: geo.index ? geo.toNonIndexed() : geo, bone: NAMES.indexOf(bone), color }); }
function limb(a, b, r0, r1, seg = 10) {   // tapered capsule from a to b
  const v = new THREE.Vector3().subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a)), L = v.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg, 3, false);
  const cap0 = new THREE.SphereGeometry(r0, seg, 6).translate(0, -L / 2, 0), cap1 = new THREE.SphereGeometry(r1, seg, 6).translate(0, L / 2, 0);
  const m = merge([g, cap0, cap1]);
  m.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()));
  m.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return m;
}
function merge(list) {
  const pos = [], nor = []; for (let g of list) { g = g.index ? g.toNonIndexed() : g; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return m;
}
function bodyGeometry(look) {
  const P = [], w = RW, f = look.build;   // build: 0.9 (slim) – 1.15 (broad)
  const { skin, top, bottom, shoes, hair } = look;
  // torso: pelvis + waist + chest as soft ellipsoids
  const ell = (rx, ry, rz) => new THREE.SphereGeometry(1, 18, 12).scale(rx, ry, rz);
  part(ell(0.17 * f, 0.13, 0.12).translate(0, w.Hips[1] - 0.02, 0), 'Hips', bottom, P);
  part(ell(0.155 * f, 0.15, 0.11).translate(0, w.Spine[1] + 0.06, 0.005), 'Spine', top, P);
  part(ell(0.19 * f, 0.17, 0.125).translate(0, w.Spine1[1] + 0.07, 0.0), 'Spine1', top, P);
  if (look.longCoat) part(limb([0, w.Hips[1] + 0.05, 0], [0, w.Hips[1] - 0.32, 0], 0.17 * f, 0.19 * f, 16), 'Hips', top, P);
  // neck & head
  part(limb([0, w.Neck[1] - 0.04, 0], [0, w.Head[1] + 0.02, 0.01], 0.05, 0.048), 'Neck', skin, P);
  part(ell(0.085, 0.108, 0.098).translate(0, w.Head[1] + 0.11, 0.015), 'Head', skin, P);
  part(new THREE.SphereGeometry(0.016, 8, 6).scale(1, 1, 1.4).translate(0, w.Head[1] + 0.1, 0.11), 'Head', skin, P);           // nose
  for (const s of [-1, 1]) part(new THREE.SphereGeometry(0.02, 8, 6).scale(0.6, 1, 0.6).translate(s * 0.085, w.Head[1] + 0.11, 0.01), 'Head', skin, P); // ears
  part(new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI * (look.longHair ? 0.72 : 0.55)).scale(0.092, 0.115, 0.104).translate(0, w.Head[1] + 0.12, 0.005), 'Head', hair, P);
  if (look.longHair) part(limb([0, w.Head[1] + 0.12, -0.04], [0, w.Head[1] - 0.12, -0.07], 0.085, 0.07), 'Head', hair, P);
  if (look.cap) part(new THREE.CylinderGeometry(0.098, 0.1, 0.06, 16).translate(0, w.Head[1] + 0.19, 0.01), 'Head', look.cap, P);
  // arms
  for (const sd of ['Left', 'Right']) {
    const A = w[sd + 'Arm'], F = w[sd + 'ForeArm'], H = w[sd + 'Hand'];
    part(limb(A, F, 0.052 * f, 0.044 * f), sd + 'Arm', top, P);
    part(limb(F, H, 0.041, 0.034), sd + 'ForeArm', look.shortSleeve ? skin : top, P);
    part(ell(0.035, 0.07, 0.022).translate(H[0], H[1] - 0.05, H[2]), sd + 'Hand', skin, P);
    // legs
    const U = w[sd + 'UpLeg'], K = w[sd + 'Leg'], Ft = w[sd + 'Foot'];
    part(limb(U, K, 0.08 * f, 0.058), sd + 'UpLeg', look.skirt ? top : bottom, P);
    part(limb(K, Ft, 0.054, 0.042), sd + 'Leg', look.skirt ? skin : bottom, P);
    part(new THREE.BoxGeometry(0.09, 0.07, 0.25, 2, 1, 3).translate(Ft[0], Ft[1] - 0.035, Ft[2] + 0.06), sd + 'Foot', shoes, P);
  }
  if (look.skirt) part(new THREE.CylinderGeometry(0.17 * f, 0.27 * f, 0.42, 18, 1, true).translate(0, w.Hips[1] - 0.2, 0), 'Hips', top, P);
  if (look.bag) part(new THREE.BoxGeometry(0.26, 0.32, 0.12).translate(0, w.Spine1[1] + 0.02, -0.17), 'Spine1', look.bag, P);
  // assemble skinned geometry
  const pos = [], nor = [], col = [], si = [], sw = [];
  for (const p of P) {
    const g = p.geo, c = new THREE.Color(p.color);
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
    for (let i = 0; i < g.attributes.position.count; i++) { col.push(c.r, c.g, c.b); si.push(p.bone, 0, 0, 0); sw.push(1, 0, 0, 0); }
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
  const r = Math.random();
  return { skin: pick(SKIN), top: pick(TOPS), bottom: pick(BOTTOMS), hair: pick(HAIR), shoes: pick(SHOES), build: 0.92 + Math.random() * 0.2,
    longHair: r < 0.4, skirt: r < 0.15, shortSleeve: Math.random() < 0.35, longCoat: Math.random() < 0.15, cap: Math.random() < 0.1 ? pick([0x1f2a3a, 0x7a2e2a, 0xd9d3c6]) : null,
    bag: Math.random() < 0.25 ? pick([0x3b2618, 0x1f1f22, 0x6b4a32]) : null, height: 0.92 + Math.random() * 0.14 };
}
export const PLAYER_LOOK = { skin: 0xe2b38f, top: 0xa8432a, bottom: 0x2b3140, hair: 0x3b2a1e, shoes: 0x1a1a1a, build: 1, shortSleeve: false, bag: 0x4a3b2c, height: 1 };

export function createMannequin(scene, look = randomLook()) {
  const bones = {}, list = [];
  for (const n of NAMES) {
    const b = new THREE.Bone(); b.name = 'mixamorig' + n; const [p, x, y, z] = REST[n]; b.position.set(x, y, z);
    if (p) bones[p].add(b); bones[n] = b; list.push(b);
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 });
  const mesh = new THREE.SkinnedMesh(bodyGeometry(look), mat);
  mesh.add(bones.Hips); mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(list));
  mesh.castShadow = true; mesh.frustumCulled = false;
  const model = new THREE.Group(); model.add(mesh); model.scale.setScalar(look.height || 1);
  const root = new THREE.Group(); root.add(model); scene.add(root);
  const mixer = new THREE.AnimationMixer(model), A = {};
  for (const [n, c] of Object.entries(CLIPS)) { const a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(n === 'Idle' ? 1 : 0); a.time = Math.random() * c.duration; A[n.toLowerCase()] = a; }
  return { root, model, bones, mixer, A, clips: CLIPS, w: { idle: 1, walk: 0, run: 0 }, builtin: true };
}
