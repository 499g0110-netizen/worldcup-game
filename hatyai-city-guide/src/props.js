import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, mulberry32, glowTex, smooth } from './util.js';
import { groundY, urban } from './world.js';

// ------------------------------------------------------------------
//  Additive glow points (lamps, far city lights, signs)
// ------------------------------------------------------------------
const GLOW_VS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aSize; attribute vec3 aColor; varying vec3 vCol; varying float vFade;
uniform float uScale; uniform float uMaxPx;
void main(){
  vec4 mv = modelViewMatrix*vec4(position,1.);
  gl_Position = projectionMatrix*mv;
  float px = aSize*uScale/max(-mv.z, 1.);
  gl_PointSize = clamp(px, 1.0, uMaxPx);
  vFade = clamp(px/1.2, 0.25, 1.0);
  vCol = aColor;
  #include <logdepthbuf_vertex>
}`;
const GLOW_FS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
varying vec3 vCol; varying float vFade; uniform float uInt;
void main(){
  #include <logdepthbuf_fragment>
  vec2 c = gl_PointCoord-0.5; float d = length(c)*2.;
  float a = pow(max(1.-d,0.), 2.4);
  float core = pow(max(1.-d,0.), 9.0);
  gl_FragColor = vec4(vCol*uInt*(a*0.9+core*2.5)*vFade, a*vFade);
}`;
export const glowUniforms = { uScale: { value: 800 }, uMaxPx: { value: 70 } };

export class GlowSet {
  constructor(kind = 'lamp', maxPx = 70) { this.kind = kind; this.p = []; this.s = []; this.c = []; this.maxPx = maxPx; }
  add(x, y, z, size, color) { this.p.push(x, y, z); this.s.push(size); this.c.push(color.r, color.g, color.b); }
  build(scene) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(this.s, 1));
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(this.c, 3));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: GLOW_VS, fragmentShader: GLOW_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uScale: glowUniforms.uScale, uMaxPx: { value: this.maxPx }, uInt: { value: 1 } },
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 5;
    scene.add(this.points); return this;
  }
}

// ------------------------------------------------------------------
//  Trees
// ------------------------------------------------------------------
export function buildTrees(ctx, list) {
  const rnd = mulberry32(99);
  const parts = [];
  const tc = new THREE.Color(0.09, 0.065, 0.045);
  const trunk = new THREE.CylinderGeometry(0.2, 0.36, 3.6, 6); trunk.translate(0, 1.8, 0); trunk.deleteAttribute('uv');
  { const a = new Float32Array(trunk.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = tc.r; a[i + 1] = tc.g; a[i + 2] = tc.b; } trunk.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
  parts.push(trunk);
  const blob = (r, x, y, z, c, seed) => {
    const g = new THREE.IcosahedronGeometry(r, 1); g.deleteAttribute('uv');
    const p = g.attributes.position; const arr = new Float32Array(p.count * 3); const r2 = mulberry32(seed);
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), n = 1 + 0.22 * (Math.sin(vx * 2.3 + seed) * Math.cos(vz * 2.7 + seed * 1.7) + Math.sin(vy * 3.1 + seed * 0.3)) * 0.6;
      p.setXYZ(i, x + vx * n, y + vy * 0.78 * n, z + vz * n);
      const k = 0.65 + 0.55 * ((vy / r) * 0.5 + 0.5) + (r2() - 0.5) * 0.1; arr[i * 3] = c.r * k; arr[i * 3 + 1] = c.g * k; arr[i * 3 + 2] = c.b * k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); g.computeVertexNormals(); return g;
  };
  const gc = [new THREE.Color(0.08, 0.2, 0.05), new THREE.Color(0.11, 0.26, 0.07), new THREE.Color(0.07, 0.17, 0.05)];
  [[0, 5.4, 0, 2.8], [1.9, 4.3, 0.8, 2.0], [-1.8, 4.6, -0.9, 2.1], [0.2, 7.0, 0.8, 1.7]].forEach(([x, y, z, r], i) => parts.push(blob(r, x, y, z, gc[i % 3], 11 + i * 7)));
  const geo = mergeGeometries(parts.map(g => g.index ? g.toNonIndexed() : g));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const mesh = new THREE.InstancedMesh(geo, mat, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  list.forEach(([x, z, s, y], i) => {
    const yy = y ?? groundY(x, z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28);
    m.compose(new THREE.Vector3(x, yy, z), q, new THREE.Vector3(s * (0.85 + rnd() * 0.3), s * (0.8 + rnd() * 0.5), s * (0.85 + rnd() * 0.3)));
    mesh.setMatrixAt(i, m);
    c.setHSL(0.26 + (rnd() - 0.5) * 0.09, 0.45 + rnd() * 0.25, 0.75 + rnd() * 0.5); mesh.setColorAt(i, c);
  });
  mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; mesh.castShadow = false; mesh.frustumCulled = false;
  ctx.scene.add(mesh); return mesh;
}

export function treeLayout(ctx) {
  const { roads, occ } = ctx; const rnd = mulberry32(31);
  const list = [];
  // roadside
  for (const r of roads) {
    if (r.cls === 'minor' && !r.cobble) continue;
    const d0 = Math.hypot(r.pts[0][0], r.pts[0][1]); if (d0 > 2600 && r.cls !== 'major') continue;
    let acc = 0;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 1) continue;
      const ux = dx / L, uz = dz / L; let s = (-acc % 1 + 1) % 1 * 0;
      for (s = 6; s < L; s += 16 + rnd() * 22) {
        const side = rnd() < 0.5 ? -1 : 1, off = r.w / 2 + 1.3;
        const x = a[0] + ux * s - uz * off * side, z = a[1] + uz * s + ux * off * side;
        if (rnd() < (Math.hypot(x, z) < 900 ? 0.45 : 0.75)) list.push([x, z, 0.75 + rnd() * 0.5]);
      }
    }
  }
  // wild trees on non-urban ground
  let tries = 0, n = 0;
  while (n < 3800 && tries < 90000) {
    tries++;
    const ang = rnd() * Math.PI * 2, rad = 700 + Math.pow(rnd(), 0.65) * 7500, x = Math.cos(ang) * rad + 600, z = Math.sin(ang) * rad - 400;
    if (urban(x, z) > 0.28) continue;
    if (Math.hypot(x + 8650, z - 7700) < 1800) continue; // keep airport clear
    if (x > -5100 && x < 6700 && z > -6100 && z < 5100 && occ.get(x, z)) continue;
    const clump = 1.2 + rnd() * 1.5; list.push([x, z, clump]); n++;
  }
  return list;
}

// ------------------------------------------------------------------
//  Lamps, poles, light pools
// ------------------------------------------------------------------
export function buildStreetFurniture(ctx) {
  const { scene, roads } = ctx; const rnd = mulberry32(5);
  const lamps = [], poles = [];
  const warm = new THREE.Color(1.0, 0.68, 0.34), white = new THREE.Color(0.85, 0.92, 1.0);
  const glow = new GlowSet('lamp', 90); ctx.glowSets.push(glow);
  for (const r of roads) {
    if (!r.osm || (r.cls === 'minor' && !r.cobble)) continue;
    const d0 = Math.hypot(r.pts[0][0], r.pts[0][1]); if (d0 > 2800 && r.cls !== 'major') continue;
    let side = r.name.length % 2 ? 1 : -1, acc = 0;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 1) continue;
      const ux = dx / L, uz = dz / L;
      let s = (r.cobble ? 8 : 12) - acc; if (s < 0) s += 36;
      const gap = r.cobble ? 22 : r.cls === 'major' ? 34 : 38;
      for (; s < L; s += gap) {
        const off = r.w / 2 + 0.6; const x = a[0] + ux * s - uz * off * side, z = a[1] + uz * s + ux * off * side;
        lamps.push([x, z, Math.atan2(uz, ux), side]); side *= -1;
      }
      acc = L - (s - gap);
    }
    // utility poles with wires on mid roads in the centre
    if (r.cls === 'mid' && d0 < 1200) {
      let side2 = 1;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 1) continue;
        const ux = dx / L, uz = dz / L;
        for (let s = 8; s < L; s += 34) { const off = r.w / 2 + 1.1; poles.push([a[0] + ux * s + uz * off * side2, a[1] + uz * s - ux * off * side2, Math.atan2(uz, ux)]); }
      }
    }
  }
  // lamp posts (instanced)
  const pole = new THREE.CylinderGeometry(0.1, 0.15, 8.4, 6); pole.translate(0, 4.2, 0);
  const arm = new THREE.BoxGeometry(2.2, 0.12, 0.12); arm.translate(0.9, 8.3, 0);
  const lampPost = mergeGeometries([pole, arm]);
  const pm = new THREE.MeshStandardMaterial({ color: 0x555a60, roughness: 0.6, metalness: 0.6 });
  const im = new THREE.InstancedMesh(lampPost, pm, lamps.length); const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  const poolMat = new THREE.MeshBasicMaterial({ map: glowTex(128, [[0, 'rgba(255,200,130,0.38)'], [0.5, 'rgba(255,160,80,0.10)'], [1, 'rgba(255,130,50,0)']]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6, fog: false });
  const poolGeo = new THREE.PlaneGeometry(1, 1); poolGeo.rotateX(-Math.PI / 2);
  const pools = new THREE.InstancedMesh(poolGeo, poolMat, lamps.length);
  lamps.forEach(([x, z, ang, side], i) => {
    const y = groundY(x, z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (side > 0 ? Math.PI / 2 : -Math.PI / 2) - ang);
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m);
    glow.add(x + (-Math.sin(ang)) * (-side) * 1.8, y + 8.2, z + (Math.cos(ang)) * (-side) * 1.8, 5.5, rnd() < 0.8 ? warm : white);
    m.compose(new THREE.Vector3(x + (-Math.sin(ang)) * (-side) * 3.5, y + 0.12, z + Math.cos(ang) * (-side) * 3.5), new THREE.Quaternion(), new THREE.Vector3(20, 1, 20));
    pools.setMatrixAt(i, m);
  });
  im.instanceMatrix.needsUpdate = true; pools.instanceMatrix.needsUpdate = true; im.frustumCulled = false; pools.frustumCulled = false;
  scene.add(im, pools); ctx.lampPools = poolMat;
  glow.build(scene);

  // utility poles + wires
  const up = new THREE.BoxGeometry(0.22, 9.5, 0.22); up.translate(0, 4.75, 0);
  const cross = new THREE.BoxGeometry(0.15, 0.15, 2.4); cross.translate(0, 8.6, 0);
  const cross2 = new THREE.BoxGeometry(0.15, 0.15, 1.9); cross2.translate(0, 7.4, 0);
  const upg = mergeGeometries([up, cross, cross2]);
  const upm = new THREE.InstancedMesh(upg, new THREE.MeshStandardMaterial({ color: 0x3c3a36, roughness: 0.9 }), poles.length);
  const wireP = [];
  poles.forEach(([x, z, ang], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang); m.compose(new THREE.Vector3(x, groundY(x, z), z), q, new THREE.Vector3(1, 1, 1)); upm.setMatrixAt(i, m);
  });
  for (let i = 0; i < poles.length - 1; i++) {
    const A = poles[i], B = poles[i + 1]; if (Math.hypot(A[0] - B[0], A[1] - B[1]) > 45) continue;
    for (const [oy, oz] of [[8.6, 1.1], [8.6, -1.1], [7.4, 0.8], [7.4, -0.8]]) {
      const ox = Math.sin(A[2]) * oz, ozz = -Math.cos(A[2]) * oz; // perpendicular offset
      const ax = A[0] + ox, az = A[1] + ozz, bx = B[0] + ox, bz = B[1] + ozz;
      let px = ax, py = oy, pz = az;
      for (let k = 1; k <= 6; k++) { const t = k / 6, sag = Math.sin(t * Math.PI) * 0.9; const nx = ax + (bx - ax) * t, ny = oy - sag, nz = az + (bz - az) * t; wireP.push(px, py, pz, nx, ny, nz); px = nx; py = ny; pz = nz; }
    }
  }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wireP, 3));
  const wires = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x15151a, transparent: true, opacity: 0.8 }));
  wires.frustumCulled = false; upm.frustumCulled = false; upm.instanceMatrix.needsUpdate = true;
  scene.add(upm, wires);
}

// ------------------------------------------------------------------
//  People (static silhouettes with gentle sway) – instanced
// ------------------------------------------------------------------
export class People {
  constructor(ctx, max = 4200) {
    const body = new THREE.CapsuleGeometry(0.2, 0.85, 3, 6); body.translate(0, 0.88, 0);
    const head = new THREE.SphereGeometry(0.15, 8, 6); head.translate(0, 1.72, 0);
    const colorize = (g, c) => { const a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
    const g = mergeGeometries([colorize(body.toNonIndexed(), new THREE.Color(1, 1, 1)), colorize(head.toNonIndexed(), new THREE.Color(0.75, 0.55, 0.42))].map(x => { x.deleteAttribute('uv'); return x; }));
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), max);
    this.mesh.count = 0; this.mesh.frustumCulled = false; this.max = max; this.items = []; this.rnd = mulberry32(123);
    ctx.scene.add(this.mesh);
  }
  add(x, y, z, scale = 1, color) {
    if (this.items.length >= this.max) return;
    const c = color || new THREE.Color().setHSL(this.rnd(), 0.2 + this.rnd() * 0.3, 0.08 + this.rnd() * 0.2);
    this.items.push({ x, y, z, s: scale * (0.9 + this.rnd() * 0.2), ph: this.rnd() * 6.28, rot: this.rnd() * 6.28, c });
  }
  finalize() {
    this.mesh.count = this.items.length; const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    this.items.forEach((p, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rot); m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.s, p.s, p.s)); this.mesh.setMatrixAt(i, m); this.mesh.setColorAt(i, p.c); });
    this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  update(t) {
    // very light motion: bob a subset of people so crowds feel alive
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
    const n = Math.min(this.items.length, 700);
    for (let i = 0; i < n; i++) {
      const p = this.items[i]; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rot + Math.sin(t * 0.8 + p.ph) * 0.4);
      v.set(p.x, p.y + Math.abs(Math.sin(t * 2.2 + p.ph)) * 0.04, p.z); s.setScalar(p.s); m.compose(v, q, s); this.mesh.setMatrixAt(i, m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------------
//  Traffic
// ------------------------------------------------------------------
export class Traffic {
  constructor(ctx, N = 280) {
    const rnd = mulberry32(8); this.rnd = rnd; this.N = N;
    const cand = ctx.roads.filter(r => (r.cls === 'major' || r.cls === 'mid' || r.cobble) && r.osm && Math.hypot(r.pts[0][0], r.pts[0][1]) < 3200);
    this.roads = cand.map(r => {
      const cum = [0]; for (let i = 1; i < r.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]));
      return { r, cum, L: cum[cum.length - 1] };
    }).filter(o => o.L > 60);
    const totalL = this.roads.reduce((a, o) => a + o.L, 0);
    this.cars = [];
    for (let i = 0; i < N; i++) {
      let t = rnd() * totalL, ro = this.roads[0];
      for (const o of this.roads) { if (t < o.L) { ro = o; break; } t -= o.L; }
      this.cars.push({ ro, s: rnd() * ro.L, dir: rnd() < 0.5 ? 1 : -1, v: 5 + rnd() * 7, bike: rnd() < 0.42, col: i });
    }
    const body = new THREE.BoxGeometry(1.8, 0.75, 4.2); body.translate(0, 0.65, 0);
    const cab = new THREE.BoxGeometry(1.55, 0.6, 2.2); cab.translate(0, 1.3, -0.25);
    const g = mergeGeometries([body.toNonIndexed(), cab.toNonIndexed()].map(x => { x.deleteAttribute('uv'); return x; }));
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.6 }), N);
    const pal = ['#f2f2f2', '#c9ccd1', '#2b2d31', '#8a1c1c', '#1d3c6e', '#a58a5c', '#e0c34a', '#3e6b46', '#e8e8e8'];
    const c = new THREE.Color();
    this.cars.forEach((o, i) => { c.set(pal[Math.floor(rnd() * pal.length)]); this.mesh.setColorAt(i, c); });
    this.mesh.frustumCulled = false; ctx.scene.add(this.mesh);
    this.head = new GlowSet('traffic', 60); this.tail = new GlowSet('traffic', 40);
    const hw = new THREE.Color(1, 0.93, 0.78), rd = new THREE.Color(1, 0.08, 0.04);
    for (let i = 0; i < N * 2; i++) { this.head.add(0, 0.7, 0, 1.8, hw); this.tail.add(0, 0.8, 0, 1.4, rd); }
    this.head.build(ctx.scene); this.tail.build(ctx.scene); ctx.glowSets.push(this.head, this.tail);
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.v = new THREE.Vector3(); this.sc = new THREE.Vector3();
  }
  pos(ro, s) {
    const cum = ro.cum, pts = ro.r.pts; let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
    const a = pts[lo], b = pts[hi], seg = cum[hi] - cum[lo] || 1, t = (s - cum[lo]) / seg;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (b[0] - a[0]) / seg, (b[1] - a[1]) / seg];
  }
  update(dt) {
    const hp = this.head.points.geometry.attributes.position, tp = this.tail.points.geometry.attributes.position;
    this.cars.forEach((c, i) => {
      c.s += c.v * dt * c.dir; if (c.s > c.ro.L) c.s = 0; if (c.s < 0) c.s = c.ro.L;
      const [x, z, dx, dz] = this.pos(c.ro, c.s);
      const lane = (c.ro.r.w * 0.22) * c.dir, fx = dx * c.dir, fz = dz * c.dir;
      const px = x - dz * lane * 1, pz = z + dx * lane * 1;
      const yaw = Math.atan2(fx, fz);
      this.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const sc = c.bike ? 0.5 : 1; this.sc.set(c.bike ? 0.45 : 1, c.bike ? 1.1 : 1, sc * (c.bike ? 0.7 : 1) * (c.bike ? 1.0 : 1.0));
      this.v.set(px, 0.05, pz); this.m.compose(this.v, this.q, this.sc); this.mesh.setMatrixAt(i, this.m);
      const hl = c.bike ? 0.18 : 0.7, len = c.bike ? 1.5 : 2.1, rx = -fz, rz = fx;
      hp.setXYZ(i * 2, px + fx * len + rx * hl, c.bike ? 0.8 : 0.75, pz + fz * len + rz * hl); hp.setXYZ(i * 2 + 1, px + fx * len - rx * hl, c.bike ? 0.8 : 0.75, pz + fz * len - rz * hl);
      tp.setXYZ(i * 2, px - fx * len + rx * hl, 0.85, pz - fz * len + rz * hl); tp.setXYZ(i * 2 + 1, px - fx * len - rx * hl, 0.85, pz - fz * len - rz * hl);
    });
    this.mesh.instanceMatrix.needsUpdate = true; hp.needsUpdate = true; tp.needsUpdate = true;
  }
}
