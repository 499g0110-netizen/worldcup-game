// Ambient traffic: pedestrians, cars and cyclists that spawn on the real OSM streets around the player,
// follow the street polylines, turn at junctions, stop for the player and for each other, and are recycled.
import * as THREE from 'three';
import { makeBike, makeCar, twoBoneIK, updateLocomotion } from './actors.js';
import { createMannequin } from './mannequin.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const BUS_ROADS = new Set(['primary', 'secondary', 'tertiary']);
function makeBus(scene) {   // 12 m low-floor city bus
  const g = new THREE.Group(), L = 12, W = 2.55, H = 3.0;
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xf2f1ec, roughness: 0.3, metalness: 0.2, clearcoat: 0.8 });
  const stripe = new THREE.MeshStandardMaterial({ color: 0xb5121b, roughness: 0.4 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x15202a, roughness: 0.05, metalness: 0.3, envMapIntensity: 1.4 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H - 0.35, L, 4, 0.18), paint); body.position.y = 0.35 + (H - 0.35) / 2; g.add(body);
  const band = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 1.25, L - 0.6), glass); band.position.y = 1.95; g.add(band);
  const front = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 1.7, 0.05), glass); front.position.set(0, 1.85, L / 2 + 0.01); g.add(front);
  const red = new THREE.Mesh(new THREE.BoxGeometry(W + 0.03, 0.32, L - 0.4), stripe); red.position.y = 0.75; g.add(red);
  const dest = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.04), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffa020, emissiveIntensity: 1.2 })); dest.position.set(0, 2.8, L / 2 + 0.03); g.add(dest);
  for (const z of [-L / 2 + 0.6, L / 2 - 0.6]) for (const x of [-0.8, 0.8]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), new THREE.MeshStandardMaterial({ color: z > 0 ? 0xffffff : 0x660000, emissive: z > 0 ? 0xfff2d0 : 0xff1a0a, emissiveIntensity: 0.4 })); l.position.set(x, 0.75, z + Math.sign(z) * 0.62); g.add(l); }
  const wheels = [];
  for (const z of [L / 2 - 2.6, -L / 2 + 3.2]) for (const x of [-1.1, 1.1]) { const spin = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.32, 22).rotateZ(Math.PI / 2), tyre); spin.position.set(x, 0.5, z); g.add(spin); wheels.push(spin); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g); return { g, wheels };
}

const CAR_ROADS = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street']);
const BIKE_ROADS = new Set([...CAR_ROADS, 'cycleway']);
const NO_WALK = new Set(['motorway', 'trunk', 'steps']);
const PAINT = [0xe9e9e6, 0x9ea3a8, 0x16181b, 0x1f3550, 0x7a1d1d, 0x3b4a3a, 0xc7c2b5, 0x2d2f33, 0x5c6f82];
const FRAME = [0x1c1c1c, 0x24453a, 0x7a1d1d, 0xd8d2c4, 0x2b4a6b, 0x6b5a3a];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function prep(r) {   // cumulative lengths, cached on the road object
  if (r.cum) return r;
  const n = r.p.length / 2; r.cum = [0];
  for (let i = 1; i < n; i++) r.cum.push(r.cum[i - 1] + Math.hypot(r.p[2 * i] - r.p[2 * i - 2], r.p[2 * i + 1] - r.p[2 * i - 1]));
  r.len = r.cum[n - 1]; return r;
}
const _p = { x: 0, z: 0, dx: 0, dz: 1 };
function along(r, s) {
  let i = 1; while (i < r.cum.length - 1 && r.cum[i] < s) i++;
  const a = r.cum[i - 1], L = (r.cum[i] - a) || 1, t = Math.min(1, Math.max(0, (s - a) / L));
  const x1 = r.p[2 * i - 2], z1 = r.p[2 * i - 1], x2 = r.p[2 * i], z2 = r.p[2 * i + 1];
  _p.x = x1 + (x2 - x1) * t; _p.z = z1 + (z2 - z1) * t; _p.dx = (x2 - x1) / L; _p.dz = (z2 - z1) / L; return _p;
}

export class Traffic {
  constructor(scene, roads, { touch, isFree }) {
    this.scene = scene; this.roads = roads; this.isFree = isFree;
    this.R = touch ? 110 : 180;
    this.want = touch ? { ped: 10, car: 4, bike: 3, bus: 1, group: 3, bench: 3 } : { ped: 24, car: 12, bike: 6, bus: 3, group: 7, bench: 7 };
    this.agents = []; this.pool = { ped: [], car: [], bike: [], bus: [], group: [], bench: [] };
    this.ends = new Map(); this.indexed = 0; this.near = []; this.nearT = 0; this.spawnT = 0; this.human = null;
  }
  setHuman(h) { this.human = h; }
  // junction index: polyline end points rounded to 1.5 m
  index() {
    const g = this.roads.graph;
    for (; this.indexed < g.length; this.indexed++) {
      const r = prep(g[this.indexed]), n = r.p.length / 2;
      for (const [end, x, z] of [[0, r.p[0], r.p[1]], [1, r.p[2 * n - 2], r.p[2 * n - 1]]]) {
        const k = Math.round(x / 1.5) + ',' + Math.round(z / 1.5);
        if (!this.ends.has(k)) this.ends.set(k, []); this.ends.get(k).push([r, end]);
      }
    }
  }
  allowed(kind, r) { if (kind === 'group' || kind === 'bench') return ['pedestrian', 'living_street', 'footway', 'residential'].includes(r.k) && !r.b;
    return kind === 'bus' ? BUS_ROADS.has(r.k) && !r.b : kind === 'car' ? CAR_ROADS.has(r.k) && !r.b : kind === 'bike' ? BIKE_ROADS.has(r.k) : !NO_WALK.has(r.k); }

  /* ---- construction (pooled) ---- */
  make(kind) {
    const pooled = this.pool[kind].pop(); if (pooled) { pooled.obj.visible = true; return pooled; }
    if (kind === 'bus') { const b = makeBus(this.scene); return { kind, obj: b.g, bus: b }; }
    if (kind === 'group') {   // 2–3 people standing and talking
      const obj = new THREE.Group(); this.scene.add(obj); const n = 2 + (Math.random() < 0.4 ? 1 : 0), people = [];
      for (let i = 0; i < n; i++) { const h = createMannequin(this.scene); h.root.removeFromParent(); obj.add(h.root); const a = Math.PI / 2 + i / n * Math.PI * 2; h.root.position.set(Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6); h.root.rotation.y = a + Math.PI; h.talk = Math.random() * 6; people.push(h); }
      return { kind, obj, people };
    }
    if (kind === 'bench') {   // wooden park bench with one or two people sitting
      const obj = new THREE.Group(); this.scene.add(obj);
      const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.75 }), iron = new THREE.MeshStandardMaterial({ color: 0x1f2326, roughness: 0.5, metalness: 0.6 });
      for (let k = 0; k < 3; k++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.12), wood); sl.position.set(0, 0.45, -0.14 + k * 0.14); obj.add(sl); }
      for (let k = 0; k < 2; k++) { const bk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.03), wood); bk.position.set(0, 0.6 + k * 0.16, -0.26); bk.rotation.x = -0.15; obj.add(bk); }
      for (const x of [-0.8, 0.8]) { const lg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.45), iron); lg.position.set(x, 0.225, -0.05); obj.add(lg); }
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const people = []; const n = Math.random() < 0.5 ? 2 : 1;
      for (let i = 0; i < n; i++) { const h = createMannequin(this.scene); h.root.removeFromParent(); obj.add(h.root); h.seatX = n === 1 ? 0 : (i ? 0.45 : -0.45); h.talk = Math.random() * 6; people.push(h); }
      return { kind, obj, people };
    }
    if (kind === 'car') {
      const c = makeCar(this.scene); const col = pick(PAINT);
      c.body.traverse((o) => { if (o.isMesh && o.material.clearcoat === 1 && o.material.metalness === 0.6) o.material.color.setHex(col); });
      return { kind, obj: c.g, car: c };
    }
    if (kind === 'bike') {
      const b = makeBike(this.scene); const col = pick(FRAME);
      b.lean.traverse((o) => { if (o.isMesh && o.material.clearcoat === 0.8) o.material.color.setHex(col); });
      b.steer.traverse((o) => { if (o.isMesh && o.material.clearcoat === 0.8) o.material.color.setHex(col); });
      const rider = this.cloneHuman(); return { kind, obj: b.g, bike: b, rider };
    }
    const h = this.cloneHuman(); return { kind, obj: h.root, h };
  }
  cloneHuman() { return createMannequin(this.scene); }   // built-in characters: no download, varied clothes, hair and height
  release(a) { a.obj.visible = false; if (a.rider) a.rider.root.visible = false; this.pool[a.kind].push(a); }

  /* ---- spawning near the player ---- */
  spawn(kind, px, pz) {
    const cand = this.near.filter((r) => this.allowed(kind, r)); if (!cand.length) return;
    for (let tries = 0; tries < 6; tries++) {
      const r = pick(cand), s = rnd(0, r.len), p = along(r, s), d = Math.hypot(p.x - px, p.z - pz);
      if (d < 35 || d > this.R) continue;        // never pop in right next to the player
      if (kind === 'group' || kind === 'bench') {
        const a = this.make(kind), w = r.w || 5, off = Math.max(1.2, w / 2 - (kind === 'bench' ? 0.6 : 1.0)) * (Math.random() < 0.5 ? -1 : 1);
        a.x = p.x - p.dz * off; a.z = p.z + p.dx * off; a.yaw = Math.atan2(p.dx, p.dz) + (off > 0 ? -Math.PI / 2 : Math.PI / 2); a.v = 0; a.static = true;
        if (this.isFree && !this.isFree(a.x, a.z)) { this.release(a); continue; }
        a.obj.position.set(a.x, 0, a.z); a.obj.rotation.y = a.yaw; a.obj.visible = true; this.agents.push(a); return;
      }
      const a = this.make(kind);
      Object.assign(a, { r, s, dir: Math.random() < 0.5 ? 1 : -1, v: 0, x: p.x, z: p.z, yaw: 0,
        vmax: kind === 'bus' ? rnd(6, 7.5) : kind === 'car' ? rnd(6, 9) : kind === 'bike' ? rnd(3.5, 5.2) : rnd(1.1, 1.5),
        side: kind === 'ped' ? (Math.random() < 0.5 ? -1 : 1) * rnd(0.75, 0.95) : 1, ph: 0 });
      if (a.rider) a.rider.root.visible = true;
      this.agents.push(a); return;
    }
  }
  lateral(a) {
    const w = a.r.w || 6;
    if (a.kind === 'car' || a.kind === 'bus') return Math.min(w / 4, a.kind === 'bus' ? 1.8 : 1.6);
    if (a.kind === 'bike') return Math.max(0.6, w / 2 - 0.9);
    return Math.max(0.4, w / 2 - 0.5) * a.side;
  }
  turn(a) {   // at the end of a polyline: continue on a connected street, else turn around
    const n = a.r.p.length / 2, atEnd = a.dir > 0, x = atEnd ? a.r.p[2 * n - 2] : a.r.p[0], z = atEnd ? a.r.p[2 * n - 1] : a.r.p[1];
    const opts = (this.ends.get(Math.round(x / 1.5) + ',' + Math.round(z / 1.5)) || []).filter(([r]) => r !== a.r && this.allowed(a.kind, r));
    if (opts.length) { const [r, end] = pick(opts); a.r = r; a.dir = end === 0 ? 1 : -1; a.s = end === 0 ? 0 : r.len; }
    else { a.dir = -a.dir; a.s = atEnd ? a.r.len : 0; }
  }

  update(dt, P, frame, obstacles = []) {
    this.index();
    const px = P.x, pz = P.z;
    // nearby roads, refreshed every 2 s
    this.nearT -= dt;
    if (this.nearT <= 0) {
      this.nearT = 2;
      this.near = this.roads.graph.filter((r) => { for (let i = 0; i < r.p.length; i += 4) if (Math.abs(r.p[i] - px) < this.R && Math.abs(r.p[i + 1] - pz) < this.R) return r.len > 8; return false; });
    }
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = 0.4;
      const count = { ped: 0, car: 0, bike: 0, bus: 0, group: 0, bench: 0 }; for (const a of this.agents) count[a.kind]++;
      for (const k of ['ped', 'group', 'bench', 'car', 'bike', 'bus']) if (count[k] < this.want[k]) { this.spawn(k, px, pz); break; }
    }
    for (let i = this.agents.length - 1; i >= 0; i--) {
      const a = this.agents[i];
      if (Math.hypot(a.x - px, a.z - pz) > this.R + 40) { this.release(a); this.agents.splice(i, 1); continue; }
      if (a.static) {
        const far = Math.hypot(a.x - px, a.z - pz) > 70; if (far && (frame + i) % 4) continue;
        for (const h of a.people) {
          h.talk += dt; const gest = Math.max(0, Math.sin(h.talk * 0.9)) ** 3;
          if (a.kind === 'bench') this.sit(h, a.obj, dt * (far ? 4 : 1));
          else { h.mixer.update(dt * (far ? 4 : 1)); if (h.bones.RightForeArm) { h.bones.RightForeArm.rotation.x -= gest * 0.9; h.bones.RightArm.rotation.x -= gest * 0.35; } h.bones.Head.rotation.y += Math.sin(h.talk * 0.7) * 0.25; }
        }
        continue;
      }
      // look ahead: player, the player's vehicle, other agents
      const hx = Math.sin(a.yaw), hz = Math.cos(a.yaw), look = a.kind === 'bus' ? 12 : a.kind === 'car' ? 7 : a.kind === 'bike' ? 4 : 1.4;
      let blocked = false;
      const ahead = (x, z, rad) => { const dx = x - a.x, dz = z - a.z, f = dx * hx + dz * hz; return f > 0 && f < look && Math.abs(dx * hz - dz * hx) < rad; };
      if (ahead(P.vx, P.vz, a.kind === 'ped' ? 0.6 : a.kind === 'bus' ? 2 : 1.6)) blocked = true;
      if (!blocked) for (const [ox, oz] of obstacles) if (ahead(ox, oz, a.kind === 'ped' ? 0.9 : 1.9)) { blocked = true; break; }
      if (!blocked && a.kind !== 'ped') for (const o of this.agents) if (o !== a && o.kind !== 'ped' && ahead(o.x, o.z, 1.4)) { blocked = true; break; }
      if (!blocked && (a.kind === 'car' || a.kind === 'bus')) for (const o of this.agents) if (o.kind === 'ped' && ahead(o.x, o.z, 1.2)) { blocked = true; break; }
      const target = blocked ? 0 : a.vmax;
      a.v += (target - a.v) * (1 - Math.exp(-dt * (target < a.v ? 5 : 1.2)));
      a.s += a.dir * a.v * dt;
      if (a.s > a.r.len || a.s < 0) this.turn(a);
      const p = along(a.r, Math.min(a.r.len, Math.max(0, a.s))), dx = p.dx * a.dir, dz = p.dz * a.dir, lat = this.lateral(a);
      a.x = p.x - dz * lat; a.z = p.z + dx * lat;   // right-hand side of the travel direction
      let dy = Math.atan2(dx, dz) - a.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); a.yaw += dy * (1 - Math.exp(-dt * 6));
      const far = Math.hypot(a.x - px, a.z - pz) > 70, tick = !far || (frame + i) % 3 === 0;
      if (a.kind === 'ped') {
        a.h.root.position.set(a.x, 0, a.z); a.h.root.rotation.y = a.yaw;
        if (tick) updateLocomotion(a.h, a.v, far ? dt * 3 : dt);
      } else if (a.kind === 'bus') {
        a.bus.g.position.set(a.x, 0, a.z); a.bus.g.rotation.y = a.yaw; for (const w of a.bus.wheels) w.rotation.x += a.v * dt / 0.5;
      } else if (a.kind === 'car') {
        const c = a.car; c.g.position.set(a.x, 0, a.z); c.g.rotation.y = a.yaw; c.x = a.x; c.z = a.z; c.yaw = a.yaw;
        for (const w of c.wheels) w.spin.rotation.x += a.v * dt / 0.31;
      } else {
        const b = a.bike; b.g.position.set(a.x, 0, a.z); b.g.rotation.y = a.yaw; b.x = a.x; b.z = a.z; b.yaw = a.yaw;
        const dW = a.v * dt / b.R; b.wRear.rotation.x += dW; b.wFront.rotation.x += dW; b.crankA += dW / 2.4;
        b.crank.rotation.x = b.crankA; for (const pd of b.pedals) pd.rotation.x = -b.crankA;
        if (tick) this.seat(a.rider, b, far ? dt * 3 : dt);
      }
    }
  }
  seat(h, b, dt) {   // rider: hips on the saddle, feet on the pedals, hands on the grips (two-bone IK)
    h.mixer.update(dt); h.A.idle.setEffectiveWeight(1); h.A.walk.setEffectiveWeight(0); h.A.run.setEffectiveWeight(0);
    b.g.updateMatrixWorld(true);
    const seatW = b.lean.localToWorld(b.seat.clone()), B = h.bones;
    h.root.position.set(0, 0, 0); h.root.rotation.set(0, b.yaw, 0); h.root.updateMatrixWorld(true);
    const hips = B.Hips.getWorldPosition(new THREE.Vector3());
    h.root.position.copy(seatW).sub(hips).add(new THREE.Vector3(0, 0.08, 0)); h.root.updateMatrixWorld(true);
    B.Spine.rotation.x += 0.12; B.Spine1.rotation.x += 0.08; B.Hips.updateMatrixWorld(true);
    const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw)), right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const ped = b.pedals.map((p) => p.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.05, 0)));
    const grip = b.grips.map((g) => b.steer.localToWorld(g.clone()));
    const knee = (s) => seatW.clone().addScaledVector(fwd, 2).addScaledVector(right, s * 0.3).setY(seatW.y + 0.3);
    const elb = (s) => seatW.clone().addScaledVector(right, s).setY(seatW.y);
    twoBoneIK(B.LeftUpLeg, B.LeftLeg, B.LeftFoot, ped[1], knee(-1)); twoBoneIK(B.RightUpLeg, B.RightLeg, B.RightFoot, ped[0], knee(1));
    twoBoneIK(B.LeftArm, B.LeftForeArm, B.LeftHand, grip[1], elb(-1)); twoBoneIK(B.RightArm, B.RightForeArm, B.RightHand, grip[0], elb(1));
  }
  sit(h, bench, dt) {
    h.mixer.update(dt); h.A.idle.setEffectiveWeight(1); h.A.walk.setEffectiveWeight(0); h.A.run.setEffectiveWeight(0);
    const B = h.bones; h.root.position.set(0, 0, 0); h.root.rotation.set(0, 0, 0); bench.updateMatrixWorld(true);
    const seat = bench.localToWorld(new THREE.Vector3(h.seatX, 0.5, -0.04)); h.root.updateMatrixWorld(true);
    const hipsW = B.Hips.getWorldPosition(new THREE.Vector3()), local = h.root.worldToLocal(seat.clone()), hl = h.root.worldToLocal(hipsW.clone());
    h.root.position.add(local.sub(hl)); h.root.updateMatrixWorld(true);
    const L = (x, y, z) => bench.localToWorld(new THREE.Vector3(h.seatX + x, y, z));
    twoBoneIK(B.LeftUpLeg, B.LeftLeg, B.LeftFoot, L(0.12, 0.08, 0.42), L(0.14, 0.9, 1.5));
    twoBoneIK(B.RightUpLeg, B.RightLeg, B.RightFoot, L(-0.12, 0.08, 0.42), L(-0.14, 0.9, 1.5));
    twoBoneIK(B.LeftArm, B.LeftForeArm, B.LeftHand, L(0.18, 0.55, 0.22), L(0.6, 0.6, -0.3));
    twoBoneIK(B.RightArm, B.RightForeArm, B.RightHand, L(-0.18, 0.55, 0.22), L(-0.6, 0.6, -0.3));
    B.Head.rotation.y = Math.sin(h.talk * 0.5) * 0.4; B.Head.updateMatrixWorld(true);
  }
  // keep the walking player out of pedestrians and parked/moving vehicles
  pushPlayer(x, z, rad) {
    for (const a of this.agents) {
      const r = a.kind === 'ped' ? 0.35 : a.kind === 'bike' ? 0.5 : a.kind === 'group' ? 0.9 : a.kind === 'bench' ? 0.95 : 0;
      if (r) { const dx = x - a.x, dz = z - a.z, d = Math.hypot(dx, dz), m = r + rad; if (d < m && d > 1e-6) { x = a.x + dx / d * m; z = a.z + dz / d * m; } continue; }
      const co = Math.cos(a.yaw), si = Math.sin(a.yaw), dx = x - a.x, dz = z - a.z;
      let lx = dx * co - dz * si, lz = dx * si + dz * co; const hx = (a.kind === 'bus' ? 1.3 : 0.95) + rad, hz = (a.kind === 'bus' ? 6.1 : 2.1) + rad;
      if (Math.abs(lx) < hx && Math.abs(lz) < hz) { if (hx - Math.abs(lx) < hz - Math.abs(lz)) lx = Math.sign(lx || 1) * hx; else lz = Math.sign(lz || 1) * hz; x = a.x + lx * co + lz * si; z = a.z - lx * si + lz * co; }
    }
    return [x, z];
  }
  hitsVehicle(x, z, rad) { for (const a of this.agents) if (a.kind !== 'ped' && !a.static && Math.hypot(x - a.x, z - a.z) < rad + (a.kind === 'bus' ? 4.5 : 0)) return true; return false; }
}
