import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from './util.js';
import { GlowSet } from './props.js';

// ------------------------------------------------------------------
//  Articulated humanoids (GPU walk-cycle). Legs/arms swing around hip/shoulder in the vertex shader.
// ------------------------------------------------------------------
const SKINS = ['#e0b08a', '#c98f66', '#b87a52', '#8d5a3a', '#f0c8a0'];
function humanGeometry() {
  const parts = [];
  const add = (g, part, base, mask, pivot = 0) => {
    g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv'); const n = g.attributes.position.count;
    g.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(n).fill(part), 1));
    g.setAttribute('aBase', new THREE.BufferAttribute(new Float32Array(Array.from({ length: n }, () => [base.r, base.g, base.b]).flat()), 3));
    g.setAttribute('aMask', new THREE.BufferAttribute(new Float32Array(n).fill(mask), 1)); parts.push(g);
  };
  const skin = new THREE.Color('#d9a67e'), jeans = new THREE.Color('#2b3550'), white = new THREE.Color(1, 1, 1), hair = new THREE.Color('#1a1512');
  const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
  add(box(0.42, 0.58, 0.25, 0, 1.2, 0), 0, white, 1);              // torso (shirt)
  add(box(0.4, 0.2, 0.24, 0, 0.98, 0), 0, jeans, 0);                // hips
  const head = new THREE.SphereGeometry(0.12, 10, 8); head.translate(0, 1.66, 0); add(head, 0, skin, 2);
  const hr = new THREE.SphereGeometry(0.128, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55); hr.translate(0, 1.68, -0.01); add(hr, 0, hair, 0);
  add(box(0.06, 0.1, 0.06, 0, 1.52, 0), 0, skin, 2);                // neck
  // face: eyes (whites + pupils), brows, nose, mouth, ears
  const dark = new THREE.Color('#1a1210'), eyeW = new THREE.Color('#f2eee8'), lip = new THREE.Color('#9a4a3e');
  for (const s of [-1, 1]) {
    const ew = new THREE.SphereGeometry(0.019, 8, 6); ew.scale(1.3, 0.8, 0.6); ew.translate(s * 0.042, 1.675, 0.102); add(ew, 0, eyeW, 0);
    const pu = new THREE.SphereGeometry(0.011, 6, 5); pu.translate(s * 0.042, 1.675, 0.113); add(pu, 0, dark, 0);
    add(box(0.04, 0.008, 0.012, s * 0.043, 1.703, 0.104), 0, dark, 0);
    const ear = new THREE.SphereGeometry(0.025, 6, 5); ear.scale(0.5, 1, 0.8); ear.translate(s * 0.119, 1.66, 0); add(ear, 0, skin, 2);
  }
  const nose = new THREE.ConeGeometry(0.017, 0.04, 6); nose.rotateX(Math.PI / 2); nose.translate(0, 1.648, 0.118); add(nose, 0, skin, 2);
  add(box(0.045, 0.01, 0.012, 0, 1.612, 0.106), 0, lip, 0);
  add(box(0.15, 0.07, 0.26, -0.11, 0.035, 0.04), 1, dark, 0); add(box(0.15, 0.07, 0.26, 0.11, 0.035, 0.04), 2, dark, 0);

  add(box(0.15, 0.92, 0.17, -0.11, 0.48, 0), 1, jeans, 0);          // legs
  add(box(0.15, 0.92, 0.17, 0.11, 0.48, 0), 2, jeans, 0);
  add(box(0.09, 0.58, 0.1, -0.27, 1.2, 0), 3, white, 3);            // arms (sleeve top, skin lower via mask 3)
  add(box(0.09, 0.58, 0.1, 0.27, 1.2, 0), 4, white, 3);
  return mergeGeometries(parts);
}
function humanMaterial(uniforms) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.vertexShader = sh.vertexShader.replace('void main() {', `attribute float aPart; attribute vec3 aBase; attribute float aMask; attribute vec4 aAnim; attribute vec3 aShirt;
uniform float uTime; varying vec3 vBase; varying float vMask; varying vec3 vShirt; varying float vLocalY;
void main() {`).replace('#include <begin_vertex>', `#include <begin_vertex>
vBase = aBase; vMask = aMask; vShirt = aShirt; vLocalY = position.y;
float amp = aAnim.x, rate = aAnim.y, ph = uTime*rate + aAnim.z, row = aAnim.w;
float sw = sin(ph);
if (aPart > 0.5) {
  float s = (mod(aPart,2.0) > 0.5) ? 1.0 : -1.0;   // 1,3 -> +1 ; 2,4 -> -1
  float legs = aPart < 2.5 ? 1.0 : 0.0;
  if (row > 0.5) s = legs > 0.5 ? 0.0 : 1.0;          // rowing: both arms together, legs still
  float a = sw * s * (legs > 0.5 ? 0.62 : -0.5) * amp + (legs > 0.5 ? (row > 0.5 ? -1.35 : 0.0) : 0.05*s) - (row > 0.5 && legs < 0.5 ? 0.9 : 0.0);
  float pv = legs > 0.5 ? 0.95 : 1.47;
  float cy = transformed.y - pv, cz = transformed.z;
  transformed.y = pv + cy*cos(a) - cz*sin(a); transformed.z = cy*sin(a) + cz*cos(a);
} else { transformed.y += abs(sw) * 0.035 * amp; transformed.x += sin(ph*0.5) * 0.02 * (1.0-amp); }`);
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', `varying vec3 vBase; varying float vMask; varying vec3 vShirt; varying float vLocalY;
void main() {`).replace('#include <color_fragment>', `
vec3 baseC = vBase;
if (vMask > 2.5) { baseC = vLocalY < 0.95 ? vec3(0.78,0.58,0.42) : vShirt; }   // arms: sleeve above elbow, skin below
else if (vMask > 1.5) baseC = vBase;
else if (vMask > 0.5) baseC = vShirt;
diffuseColor.rgb = baseC;`);
  };
  return m;
}
const HUM_UNI = { uTime: { value: 0 } };
export class Humans {
  constructor(ctx, max = 4200) {
    this.geo = humanGeometry(); this.max = max; this.items = []; this.rnd = mulberry32(123);
    this.mesh = new THREE.InstancedMesh(this.geo, humanMaterial(HUM_UNI), max); this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.castShadow = true;
    this.aAnim = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); this.aShirt = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.geo.setAttribute('aAnim', this.aAnim); this.geo.setAttribute('aShirt', this.aShirt);
    ctx.scene.add(this.mesh);
  }
  // static crowd member (idle shuffle)
  add(x, y, z, s = 1, color, amp, rate, mode = 0) {
    if (this.items.length >= this.max) return -1; const r = this.rnd;
    const c = color || new THREE.Color().setHSL(r(), 0.25 + r() * 0.4, 0.15 + r() * 0.35);
    this.items.push({ x, y, z, s: s * (0.92 + r() * 0.16), rot: r() * 6.283, c, amp: amp ?? 0.08 + r() * 0.12, rate: rate ?? 1.2 + r() * 1.6, ph: r() * 6.28, mode });
    return this.items.length - 1;
  }
  finalize() {
    this.mesh.count = this.items.length; const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3();
    this.items.forEach((p, i) => {
      q.setFromAxisAngle(up, p.rot); m.compose(v.set(p.x, p.y, p.z), q, sc.setScalar(p.s)); this.mesh.setMatrixAt(i, m);
      this.aAnim.setXYZW(i, p.amp, p.rate, p.ph, p.mode || 0); this.aShirt.setXYZ(i, p.c.r, p.c.g, p.c.b);
    });
    this.mesh.instanceMatrix.needsUpdate = true; this.aAnim.needsUpdate = true; this.aShirt.needsUpdate = true;
  }
  update(t) { HUM_UNI.uTime.value = t; }
}

// ------------------------------------------------------------------
//  Pedestrians walking along sidewalks (real OSM road lines) – fluid GPU walk cycle
// ------------------------------------------------------------------
export class Walkers {
  constructor(ctx, humans, N = 420) {
    const rnd = mulberry32(77); this.rnd = rnd;
    const cand = ctx.roads.filter(r => (r.cls !== 'minor' || r.cobble) && r.osm && Math.hypot(r.pts[0][0], r.pts[0][1]) < 1600);
    this.roads = cand.map(r => { const cum = [0]; for (let i = 1; i < r.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1])); return { r, cum, L: cum[cum.length - 1] }; }).filter(o => o.L > 40);
    const total = this.roads.reduce((a, o) => a + o.L, 0);
    this.h = new Humans(ctx, N); this.w = [];
    for (let i = 0; i < N; i++) {
      let t = rnd() * total, ro = this.roads[0]; for (const o of this.roads) { if (t < o.L) { ro = o; break; } t -= o.L; }
      const v = 0.9 + rnd() * 0.8; const idx = this.h.add(0, 0, 0, 1, undefined, 0.7 + rnd() * 0.3, v * 5.2);
      this.w.push({ ro, s: rnd() * ro.L, dir: rnd() < 0.5 ? 1 : -1, v, side: rnd() < 0.5 ? -1 : 1, off: ro.r.w / 2 + 0.7 + rnd() * 1.3, idx });
    }
    this.h.finalize(); this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.v = new THREE.Vector3(); this.sc = new THREE.Vector3(1, 1, 1);
  }
  update(dt, t) {
    this.h.update(t);
    for (const w of this.w) {
      w.s += w.v * dt * w.dir; if (w.s > w.ro.L) { w.s = w.ro.L; w.dir = -1; } else if (w.s < 0) { w.s = 0; w.dir = 1; }
      const cum = w.ro.cum, pts = w.ro.r.pts; let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= w.s) lo = mid; else hi = mid; }
      const a = pts[lo], b = pts[hi], seg = cum[hi] - cum[lo] || 1, k = (w.s - cum[lo]) / seg, dx = (b[0] - a[0]) / seg, dz = (b[1] - a[1]) / seg;
      const x = a[0] + (b[0] - a[0]) * k - dz * w.off * w.side, z = a[1] + (b[1] - a[1]) * k + dx * w.off * w.side;
      this.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(dx * w.dir, dz * w.dir));
      this.m.compose(this.v.set(x, 0.17, z), this.q, this.sc); this.h.mesh.setMatrixAt(w.idx, this.m);
    }
    this.h.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------------
//  Vehicles: sedans, taxis, Grab cars, tuk-tuks, motorbikes, Grab riders
// ------------------------------------------------------------------
export class Traffic {
  constructor(ctx, N = 420) {
    const rnd = mulberry32(8); this.rnd = rnd;
    const cand = ctx.roads.filter(r => (r.cls === 'major' || r.cls === 'mid' || r.cobble) && r.osm && Math.hypot(r.pts[0][0], r.pts[0][1]) < 3200);
    this.roads = cand.map(r => { const cum = [0]; for (let i = 1; i < r.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1])); return { r, cum, L: cum[cum.length - 1] }; }).filter(o => o.L > 60);
    const totalL = this.roads.reduce((a, o) => a + o.L, 0);
    const TYPES = [['sedan', 0.2], ['taxi', 0.1], ['grabcar', 0.08], ['tuk', 0.1], ['bike', 0.34], ['grabbike', 0.18]];
    const pick = () => { let t = rnd(); for (const [k, w] of TYPES) { if (t < w) return k; t -= w; } return 'bike'; };
    this.cars = [];
    for (let i = 0; i < N; i++) {
      let t = rnd() * totalL, ro = this.roads[0]; for (const o of this.roads) { if (t < o.L) { ro = o; break; } t -= o.L; }
      const k = pick(); this.cars.push({ ro, s: rnd() * ro.L, dir: rnd() < 0.5 ? 1 : -1, v: (k === 'tuk' ? 4 : k.includes('bike') ? 6 : 5) + rnd() * 6, k, ph: rnd() * 6.28 });
    }
    const nb = (g) => { g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv'); return g; };
    const paint = (g, c) => { const a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
    const B = (w, h, d, x, y, z, c) => paint(nb(new THREE.BoxGeometry(w, h, d).translate(x, y, z)), new THREE.Color(c));
    // ---- vehicle models (vertex colours: white = paint, tinted per instance; dark glass, tyres, lamps fixed) ----
    const ext = (pts, depth, col, bevel = 0.07, yOff = 0) => { const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1] + yOff)));
      const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
      g.translate(0, 0, -depth / 2); g.rotateY(-Math.PI / 2); return paint(nb(g), new THREE.Color(col)); };
    const cyl = (r, w, x, y, z, col, seg = 14) => { const g = new THREE.CylinderGeometry(r, r, w, seg); g.rotateZ(Math.PI / 2); g.translate(x, y, z); return paint(nb(g), new THREE.Color(col)); };
    const sedanBody = [[-2.2, 0.32], [2.2, 0.32], [2.28, 0.72], [1.95, 0.86], [0.95, 0.95], [0.38, 1.4], [-1.0, 1.43], [-1.78, 1.0], [-2.22, 0.94]];
    const sedanGlass = [[0.86, 0.97], [0.36, 1.36], [-0.98, 1.39], [-1.66, 1.0]];
    const wheels = (wx, wz, r = 0.33) => [cyl(r, 0.24, -wx, r, wz, '#141414'), cyl(r, 0.24, wx, r, wz, '#141414'), cyl(r, 0.24, -wx, r, -wz, '#141414'), cyl(r, 0.24, wx, r, -wz, '#141414'),
      cyl(r * 0.55, 0.26, -wx, r, wz, '#9a9ea4'), cyl(r * 0.55, 0.26, wx, r, wz, '#9a9ea4'), cyl(r * 0.55, 0.26, -wx, r, -wz, '#9a9ea4'), cyl(r * 0.55, 0.26, wx, r, -wz, '#9a9ea4')];
    const carG = mergeGeometries([ext(sedanBody, 1.6, '#ffffff'), ext(sedanGlass, 1.72, '#1c2530', 0.02), ...wheels(0.84, 1.35),
      B(0.35, 0.12, 0.05, -0.55, 0.72, 2.27, '#fff6dc'), B(0.35, 0.12, 0.05, 0.55, 0.72, 2.27, '#fff6dc'), B(0.32, 0.12, 0.05, -0.6, 0.78, -2.24, '#9a1010'), B(0.32, 0.12, 0.05, 0.6, 0.78, -2.24, '#9a1010'),
      B(0.5, 0.12, 0.05, 0, 0.55, 2.3, '#222'), B(0.06, 0.06, 0.2, -0.95, 1.0, 0.75, '#222'), B(0.06, 0.06, 0.2, 0.95, 1.0, 0.75, '#222')]);
    // taxi uses the same mesh; its roof sign comes from the glow set
    const tukBody = [[-1.2, 0.3], [0.7, 0.3], [1.25, 0.45], [1.3, 1.05], [1.05, 1.15], [0.75, 0.75], [-1.2, 0.75]];
    const tukG = mergeGeometries([ext(tukBody, 1.3, '#ffffff', 0.05), B(1.5, 0.08, 2.6, 0, 1.95, -0.05, '#ffffff'), B(1.52, 0.18, 2.62, 0, 1.86, -0.05, '#f2c314'),
      B(0.06, 1.15, 0.06, -0.68, 1.35, 1.0, '#3a3a3a'), B(0.06, 1.15, 0.06, 0.68, 1.35, 1.0, '#3a3a3a'), B(0.06, 1.15, 0.06, -0.68, 1.35, -1.15, '#3a3a3a'), B(0.06, 1.15, 0.06, 0.68, 1.35, -1.15, '#3a3a3a'),
      B(1.25, 0.45, 0.55, 0, 0.98, -0.75, '#c9b48a'), B(1.25, 0.6, 0.12, 0, 1.25, -1.05, '#c9b48a'), B(0.4, 0.06, 0.06, 0, 1.25, 1.05, '#222'),
      cyl(0.28, 0.2, 0, 0.28, 1.05, '#141414'), cyl(0.28, 0.2, -0.62, 0.28, -0.85, '#141414'), cyl(0.28, 0.2, 0.62, 0.28, -0.85, '#141414'), B(0.25, 0.15, 0.05, 0, 0.95, 1.31, '#fff6dc')]);
    const scooter = [[-0.75, 0.35], [0.35, 0.35], [0.62, 0.55], [0.72, 1.05], [0.58, 1.1], [0.38, 0.62], [-0.2, 0.62], [-0.35, 0.82], [-0.8, 0.82]];
    const rider = paint(nb(new THREE.CapsuleGeometry(0.2, 0.5, 3, 8).translate(0, 1.25, -0.12)), new THREE.Color('#ffffff'));
    const helm = paint(nb(new THREE.SphereGeometry(0.17, 10, 8).translate(0, 1.78, -0.08)), new THREE.Color('#ffffff'));
    const visor = paint(nb(new THREE.SphereGeometry(0.15, 10, 6, -0.9, 1.8, 1.2, 0.8).translate(0, 1.76, -0.06)), new THREE.Color('#1a1a1a'));
    const bikeG = mergeGeometries([ext(scooter, 0.32, '#3a3d44', 0.04), cyl(0.29, 0.1, 0, 0.29, 0.62, '#141414'), cyl(0.29, 0.1, 0, 0.29, -0.62, '#141414'),
      B(0.62, 0.04, 0.04, 0, 1.12, 0.6, '#222'), B(0.3, 0.12, 0.55, 0, 0.88, -0.35, '#1b1b1b'), rider, helm, visor,
      B(0.1, 0.45, 0.12, -0.14, 0.75, 0.12, '#2b3550'), B(0.1, 0.45, 0.12, 0.14, 0.75, 0.12, '#2b3550'), B(0.08, 0.35, 0.08, -0.2, 1.25, 0.25, '#ffffff'), B(0.08, 0.35, 0.08, 0.2, 1.25, 0.25, '#ffffff')]);
    const mats = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.45, envMapIntensity: 1.2 });
    const counts = {}; this.cars.forEach(c => { c.grp = (c.k === 'sedan' || c.k === 'taxi' || c.k === 'grabcar') ? 'car' : c.k === 'tuk' ? 'tuk' : 'bike'; counts[c.grp] = (counts[c.grp] || 0) + 1; c.slot = counts[c.grp] - 1; });
    this.g = { car: new THREE.InstancedMesh(carG, mats(), counts.car || 1), tuk: new THREE.InstancedMesh(tukG, mats(), counts.tuk || 1), bike: new THREE.InstancedMesh(bikeG, mats(), counts.bike || 1) };
    const pal = ['#f2f2f2', '#c9ccd1', '#2b2d31', '#8a1c1c', '#1d3c6e', '#a58a5c', '#3e6b46', '#e8e8e8'], tukPal = ['#e8402a', '#2a62c8', '#f0b020', '#e8742a', '#d0388a', '#25a05a'], bikePal = ['#d0d4d8', '#c0302a', '#2a50a0', '#e8c030', '#404550', '#f0f0f0'];
    const col = new THREE.Color();
    this.cars.forEach(c => {
      if (c.k === 'taxi') col.set(Math.random() < 0.5 ? '#f2c314' : '#e8561c'); else if (c.k === 'grabcar' || c.k === 'grabbike') col.set('#00b14f'); else if (c.k === 'tuk') col.set(tukPal[Math.floor(rnd() * tukPal.length)]); else if (c.k === 'bike') col.set(bikePal[Math.floor(rnd() * bikePal.length)]); else col.set(pal[Math.floor(rnd() * pal.length)]);
      this.g[c.grp].setColorAt(c.slot, col);
    });
    for (const m of Object.values(this.g)) { m.frustumCulled = false; m.castShadow = false; ctx.scene.add(m); }
    this.head = new GlowSet('traffic', 60); this.tail = new GlowSet('traffic', 40); this.sign = new GlowSet('traffic', 30);
    const hw = new THREE.Color(1, 0.93, 0.78), rd = new THREE.Color(1, 0.08, 0.04), gr = new THREE.Color(0.1, 1, 0.4), yl = new THREE.Color(1, 0.85, 0.3);
    this.cars.forEach(c => { this.head.add(0, 0.7, 0, 1.8, hw); this.head.add(0, 0.7, 0, 1.8, hw); this.tail.add(0, 0.8, 0, 1.4, rd); this.tail.add(0, 0.8, 0, 1.4, rd); this.sign.add(0, 0, 0, c.k === 'taxi' || c.k === 'grabcar' || c.k === 'grabbike' ? 2.2 : 0.01, c.k === 'taxi' ? yl : gr); });
    this.head.build(ctx.scene); this.tail.build(ctx.scene); this.sign.build(ctx.scene); ctx.glowSets.push(this.head, this.tail, this.sign);
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.v = new THREE.Vector3(); this.sc = new THREE.Vector3(1, 1, 1); this.up = new THREE.Vector3(0, 1, 0);
  }
  pos(ro, s) {
    const cum = ro.cum, pts = ro.r.pts; let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
    const a = pts[lo], b = pts[hi], seg = cum[hi] - cum[lo] || 1, t = (s - cum[lo]) / seg;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (b[0] - a[0]) / seg, (b[1] - a[1]) / seg];
  }
  update(dt, t = 0) {
    const hp = this.head.points.geometry.attributes.position, tp = this.tail.points.geometry.attributes.position, sp = this.sign.points.geometry.attributes.position;
    this.cars.forEach((c, i) => {
      c.s += c.v * dt * c.dir; if (c.s > c.ro.L) c.s = 0; if (c.s < 0) c.s = c.ro.L;
      const [x, z, dx, dz] = this.pos(c.ro, c.s); const bike = c.grp === 'bike', tuk = c.grp === 'tuk';
      const lane = -(c.ro.r.w * (bike ? 0.36 : 0.2)) * c.dir,   /* Thailand drives on the LEFT */ fx = dx * c.dir, fz = dz * c.dir; const px = x - dz * lane, pz = z + dx * lane;
      this.q.setFromAxisAngle(this.up, Math.atan2(fx, fz));
      if (bike) this.q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(t * 1.1 + c.ph) * 0.05));
      this.m.compose(this.v.set(px, 0.05, pz), this.q, this.sc); this.g[c.grp].setMatrixAt(c.slot, this.m);
      const hl = bike ? 0.14 : tuk ? 0.5 : 0.7, len = bike ? 0.95 : tuk ? 1.3 : 2.2, rx = -fz, rz = fx, hy = bike ? 0.85 : tuk ? 0.7 : 0.75;
      hp.setXYZ(i * 2, px + fx * len + rx * hl, hy, pz + fz * len + rz * hl); hp.setXYZ(i * 2 + 1, px + fx * len - rx * hl, hy, pz + fz * len - rz * hl);
      tp.setXYZ(i * 2, px - fx * len + rx * hl, 0.85, pz - fz * len + rz * hl); tp.setXYZ(i * 2 + 1, px - fx * len - rx * hl, 0.85, pz - fz * len - rz * hl);
      sp.setXYZ(i, px, bike ? 2.05 : 1.75, pz);
    });
    for (const m of Object.values(this.g)) m.instanceMatrix.needsUpdate = true; hp.needsUpdate = true; tp.needsUpdate = true; sp.needsUpdate = true;
  }
}
