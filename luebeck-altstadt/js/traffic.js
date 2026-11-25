// Ambient traffic: pedestrians, cars and cyclists that spawn on the real OSM streets around the player,
// follow the street polylines, turn at junctions, stop for the player and for each other, and are recycled.
import * as THREE from 'three';
import { makeBike, makeCar, twoBoneIK, updateLocomotion } from './actors.js';
import { randomLook, createMannequin } from './mannequin.js';
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
    this.want = touch ? { ped: 18, car: 4, bike: 4, bus: 1, group: 5, bench: 3, cafe: 3 } : { ped: 48, car: 12, bike: 9, bus: 3, group: 11, bench: 6, cafe: 8 };
    this.agents = []; this.pool = { ped: [], car: [], bike: [], bus: [], group: [], bench: [], cafe: [], busker: [] };
    this.buskers = []; this.ends = new Map(); this.seq = 0; this.indexed = 0; this.near = []; this.nearT = 0; this.spawnT = 0; this.human = null;
  }
  setHuman(h) { this.human = h; }
  // street performers on Lübeck's squares (fixed spots: Markt, Klingenberg, Kohlmarkt, Koberg)
  addBuskers(spots) {
    const acts = ['guitar', 'juggle', 'statue', 'guitar'];
    spots.forEach(([x, z, yaw], i) => {
      const act = acts[i % acts.length], obj = new THREE.Group(); obj.position.set(x, 0, z); obj.rotation.y = yaw; this.scene.add(obj);
      const look = act === 'statue' ? { skin: 0xc9a44a, top: 0xc9a44a, bottom: 0xc9a44a, hair: 0xb08a35, shoes: 0xb08a35, build: 1, hairStyle: 5, cap: 0xc9a44a, height: 1 } : undefined;
      const h = createMannequin(this.scene, look); h.root.removeFromParent(); obj.add(h.root); h.talk = Math.random() * 6;
      if (act === 'statue') { const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.7), new THREE.MeshStandardMaterial({ color: 0x8c8780, roughness: 0.8 })); plinth.position.y = 0.225; obj.add(plinth); h.root.position.y = 0.45; h.model.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.metalness = 0.8; o.material.roughness = 0.35; } }); }
      const a = { kind: 'busker', act, obj, x, z, yaw, people: [h], static: true, fixed: true, balls: [] };
      if (act === 'guitar') {   // acoustic guitar held across the body (attached to the chest bone)
        const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0xa8682e, roughness: 0.4 }), dark = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.5 });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.09, 20).rotateX(Math.PI / 2), wood); body.scale.set(1, 1.25, 1); g.add(body);
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), dark); hole.position.z = 0.047; g.add(hole);
        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.03), dark); neck.position.set(0, 0.42, 0); g.add(neck);
        g.rotation.set(0, 0, -1.2); g.position.set(0.02, 0.05, 0.16); h.bones.Spine1.add(g);
        const caseM = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 0.38), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 })); caseM.position.set(0.3, 0.06, 0.9); obj.add(caseM);
      }
      if (act === 'juggle') for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshStandardMaterial({ color: [0xd23a2a, 0xf2c14a, 0x2b6cb0][k], roughness: 0.4 })); obj.add(b); a.balls.push(b); }
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.09, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.8, side: THREE.DoubleSide })); hat.position.set(-0.4, 0.045, 0.8); obj.add(hat);
      // a few people stopped to watch, in a loose arc
      const n = 3 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) { const w = createMannequin(this.scene); w.root.removeFromParent(); obj.add(w.root); const ang = -0.9 + k * 1.8 / (n - 1) + (Math.random() - 0.5) * 0.2, r = 2.6 + Math.random() * 0.8; w.root.position.set(Math.sin(ang) * r, 0, Math.cos(ang) * r); w.root.rotation.y = ang + Math.PI; w.talk = Math.random() * 6; a.people.push(w); }
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
      this.buskers.push(a);
    });
  }
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
  allowed(kind, r) { if (kind === 'group' || kind === 'bench' || kind === 'cafe') return ['pedestrian', 'footway'].includes(r.k) && !r.b && (kind !== 'cafe' || (r.w || 0) >= 5);   // only car-free streets, never in a traffic lane
    return kind === 'bus' ? BUS_ROADS.has(r.k) && !r.b : kind === 'car' ? CAR_ROADS.has(r.k) && !r.b : kind === 'bike' ? BIKE_ROADS.has(r.k) : !NO_WALK.has(r.k); }

  /* ---- construction (pooled) ---- */
  make(kind) {
    const pooled = this.pool[kind].pop(); if (pooled) { pooled.obj.visible = true; return pooled; }
    if (kind === 'bus') { const b = makeBus(this.scene); return { kind, obj: b.g, bus: b }; }
    if (kind === 'group') {   // 2–3 people standing and talking
      const obj = new THREE.Group(); this.scene.add(obj);
      if (Math.random() < 0.45) {   // tourist group gathered around a guide holding up a little flag
        const people = [], n = 5 + Math.floor(Math.random() * 5), flagC = pick([0xd8332b, 0xf2b630, 0x2b6a9b, 0x3c8a4a]);
        const g = createMannequin(this.scene); g.root.removeFromParent(); obj.add(g.root); g.guide = true; g.talk = 0; people.push(g);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.5, 5), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.7, roughness: 0.4 })); pole.position.set(0.32, 1.85, 0.1); obj.add(pole);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), new THREE.MeshStandardMaterial({ color: flagC, side: THREE.DoubleSide, roughness: 0.8 })); flag.position.set(0.5, 2.45, 0.1); obj.add(flag); g.flag = flag;
        for (let i = 0; i < n; i++) {
          const look = randomLook(); if (Math.random() < 0.7) look.bag = pick([0x2b3a55, 0x3b2618, 0x1f1f22, 0x8a2f24, 0x3c5a3a]);   // day packs
          const h = createMannequin(this.scene, look); h.root.removeFromParent(); obj.add(h.root);
          const ang = -1.1 + 2.2 * i / Math.max(1, n - 1) + (Math.random() - 0.5) * 0.2, r = 2.0 + Math.random() * 0.9;
          h.root.position.set(Math.sin(ang) * r, 0, Math.cos(ang) * r); h.root.rotation.y = ang + Math.PI; h.talk = Math.random() * 6; h.listener = true; people.push(h);
          if (Math.random() < 0.35) { const cam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.4 })); cam.position.set(Math.sin(ang) * (r - 0.25), 1.15, Math.cos(ang) * (r - 0.25)); cam.rotation.y = ang; obj.add(cam); }
        }
        return { kind, obj, people, tour: true };
      }
      const n = 2 + (Math.random() < 0.4 ? 1 : 0), people = [];
      for (let i = 0; i < n; i++) { const h = createMannequin(this.scene); h.root.removeFromParent(); obj.add(h.root); const a = Math.PI / 2 + i / n * Math.PI * 2; h.root.position.set(Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6); h.root.rotation.y = a + Math.PI; h.talk = Math.random() * 6; people.push(h); }
      return { kind, obj, people };
    }
    if (kind === 'cafe') {   // café terrace: 2–3 round tables with chairs under a parasol, some guests
      const obj = new THREE.Group(); this.scene.add(obj);
      const iron = new THREE.MeshStandardMaterial({ color: 0x23272a, roughness: 0.45, metalness: 0.7 }), top = new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.35 });
      const cloth = new THREE.MeshStandardMaterial({ color: pick([0xe8e2d4, 0x8a2f24, 0x2f4a3a, 0xd9c7a0, 0x2b3a55]), roughness: 0.9, side: THREE.DoubleSide });
      const people = [], n = 2 + (Math.random() < 0.5 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const tx = (k - (n - 1) / 2) * 2.4;
        const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 24), top); tb.position.set(tx, 0.74, 0); obj.add(tb);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 8), iron); leg.position.set(tx, 0.37, 0); obj.add(leg);
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.03, 16), iron); foot.position.set(tx, 0.015, 0); obj.add(foot);
        for (const sd of [-1, 1]) {   // bistro chairs facing the table
          const ch = new THREE.Group(); ch.position.set(tx + sd * 0.62, 0, 0); ch.rotation.y = sd > 0 ? -Math.PI / 2 : Math.PI / 2; obj.add(ch);
          const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 16), iron); seat.position.y = 0.46; ch.add(seat);
          for (const [lx, lz] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 6), iron); l.position.set(lx, 0.23, lz); ch.add(l); }
          const back = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.012, 6, 16, Math.PI), iron); back.position.set(0, 0.62, -0.18); ch.add(back);
          if (Math.random() < 0.65) { const h = createMannequin(this.scene); h.root.removeFromParent(); obj.add(h.root); h.seat = { x: tx + sd * 0.62, z: 0, yaw: sd > 0 ? -Math.PI / 2 : Math.PI / 2, h: 0.5, table: true }; h.talk = Math.random() * 6; people.push(h); }
        }
        if (Math.random() < 0.7) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.08, 12), top); cup.position.set(tx + 0.12, 0.8, 0.08); obj.add(cup); }
      }
      // parasol over the middle table
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.5, 8), iron); pole.position.set(0, 1.25, 0.9); obj.add(pole);
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(n * 1.3, 0.6, 8, 1, true), cloth); canopy.position.set(0, 2.5, 0.9); obj.add(canopy);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.12, 16), iron); base.position.set(0, 0.06, 0.9); obj.add(base);
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
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
      if (kind === 'group' || kind === 'bench' || kind === 'cafe') {
        const a = this.make(kind), w = r.w || 5; let off = Math.max(1.2, w / 2 - (kind === 'bench' ? 0.6 : kind === 'cafe' ? 1.8 : 1.0)) * (Math.random() < 0.5 ? -1 : 1);
        if (a.tour) { if (w < 5.5) { this.release(a); continue; } off = 0; }
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
      const count = { ped: 0, car: 0, bike: 0, bus: 0, group: 0, bench: 0, cafe: 0 }; for (const a of this.agents) count[a.kind]++;
      for (const k of ['ped', 'group', 'cafe', 'bench', 'car', 'bike', 'bus']) if (count[k] < this.want[k]) { this.spawn(k, px, pz); break; }
    }
    for (const a of this.buskers) {
      if (Math.hypot(a.x - px, a.z - pz) > 160) continue;
      a.people.forEach((h, k) => { h.talk += dt; if (k === 0) this.perform(a, h, dt); else { h.mixer.update(dt); h.bones.Head.rotation.set(-0.05, Math.sin(h.talk * 0.4) * 0.15, 0); } });
    }
    for (let i = this.agents.length - 1; i >= 0; i--) {
      const a = this.agents[i];
      if (Math.hypot(a.x - px, a.z - pz) > this.R + 40) { this.release(a); this.agents.splice(i, 1); continue; }
      if (a.static) {
        const far = Math.hypot(a.x - px, a.z - pz) > 70; if (far && (frame + i) % 4) continue;
        for (const h of a.people) {
          h.talk += dt; const gest = Math.max(0, Math.sin(h.talk * 0.9)) ** 3;
          if (a.kind === 'bench') this.sit(h, a.obj, dt * (far ? 4 : 1));
          else if (a.kind === 'cafe') this.sit(h, a.obj, dt * (far ? 4 : 1));
          else if (a.kind === 'busker') this.perform(a, h, dt * (far ? 4 : 1));
          else {   // standing and chatting: absolute poses (never += — the mixer doesn't rewrite bones whose idle value is unchanged)
            h.mixer.update(dt * (far ? 4 : 1)); const B = h.bones;
            if (h.listener) { B.RightArm.rotation.set(-0.1, 0, -0.1); B.RightForeArm.rotation.set(-0.3, 0, 0); B.LeftArm.rotation.set(0.05, 0, 0.08); B.LeftForeArm.rotation.set(-0.2, 0, 0); B.Head.rotation.set(0.02, Math.sin(h.talk * 0.3) * 0.25, 0); continue; }
            if (h.guide && h.flag) h.flag.rotation.y = Math.sin(h.talk * 2.3) * 0.25;
            B.RightArm.rotation.set(-0.15 - gest * 0.35, 0, -0.12 - gest * 0.15);
            B.RightForeArm.rotation.set(-0.25 - gest * 0.85, 0, 0);
            B.LeftArm.rotation.set(0.05, 0, 0.08); B.LeftForeArm.rotation.set(-0.15, 0, 0);
            B.Head.rotation.set(Math.sin(h.talk * 0.5) * 0.05, Math.sin(h.talk * 0.7) * 0.3, 0);
          }
        }
        continue;
      }
      // look ahead: player, the player's vehicle, other agents
      const hx = Math.sin(a.yaw), hz = Math.cos(a.yaw), look = a.kind === 'bus' ? 12 : a.kind === 'car' ? 7 : a.kind === 'bike' ? 4 : 1.4;
      let blocked = false;
      const ahead = (x, z, rad) => { const dx = x - a.x, dz = z - a.z, f = dx * hx + dz * hz; return f > 0 && f < look && Math.abs(dx * hz - dz * hx) < rad; };
      if (ahead(P.vx, P.vz, a.kind === 'ped' ? 0.6 : a.kind === 'bus' ? 2 : 1.6)) blocked = true;
      if (!blocked) for (const [ox, oz] of obstacles) if (ahead(ox, oz, a.kind === 'ped' ? 0.9 : 1.9)) { blocked = true; break; }
      const byFixed = blocked;   // blocked by the player or the player's parked vehicles
      a.id ??= ++this.seq;
      if (!blocked && a.kind !== 'ped' && !(a.squeeze > 0)) for (const o of this.agents) {
        if (o === a || o.kind === 'ped' || o.static) continue;
        const same = Math.sin(o.yaw) * hx + Math.cos(o.yaw) * hz;
        if (same > 0.5) { if (ahead(o.x, o.z, 1.4)) { blocked = true; break; } }                      // follow the vehicle in front, same direction
        else if (same > -0.5 && o.id < a.id && Math.hypot(o.x - a.x, o.z - a.z) < (a.kind === 'bus' ? 9 : 6) && ahead(o.x, o.z, 3)) { blocked = true; break; }   // crossing: lower id has right of way
      }
      if (!blocked && (a.kind === 'car' || a.kind === 'bus') && !(a.squeeze > 0)) for (const o of this.agents) if (o.kind === 'ped' && ahead(o.x, o.z, 1.2)) { blocked = true; break; }
      // patience: a vehicle stuck > 4 s squeezes past other traffic for 3 s; stuck behind the player's vehicle > 3 s it turns around
      a.wait = blocked && a.v < 0.3 ? (a.wait || 0) + dt : 0; a.squeeze = Math.max(0, (a.squeeze || 0) - dt);
      if (a.kind !== 'ped' && a.wait > 3 && byFixed) { a.dir = -a.dir; a.yaw += Math.PI; a.wait = 0; blocked = false; }
      else if (a.kind !== 'ped' && a.wait > 4) { a.squeeze = 3; a.wait = 0; blocked = false; }
      const target = blocked ? 0 : a.squeeze > 0 ? a.vmax * 0.4 : a.vmax;
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
    B.Spine.rotation.set(0.12, 0, 0); B.Spine1.rotation.set(0.08, 0, 0); B.Hips.updateMatrixWorld(true);   // absolute, not +=: the built-in idle clip has no Spine track, so += accumulated every frame and spun the rider
    const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw)), right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const ped = b.pedals.map((p) => p.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.05, 0)));
    const grip = b.grips.map((g) => b.steer.localToWorld(g.clone()));
    const knee = (s) => seatW.clone().addScaledVector(fwd, 2).addScaledVector(right, s * 0.3).setY(seatW.y + 0.3);
    const elb = (s) => seatW.clone().addScaledVector(right, s).setY(seatW.y);
    twoBoneIK(B.LeftUpLeg, B.LeftLeg, B.LeftFoot, ped[1], knee(-1)); twoBoneIK(B.RightUpLeg, B.RightLeg, B.RightFoot, ped[0], knee(1));
    twoBoneIK(B.LeftArm, B.LeftForeArm, B.LeftHand, grip[1], elb(-1)); twoBoneIK(B.RightArm, B.RightForeArm, B.RightHand, grip[0], elb(1));
  }
  sit(h, obj, dt) {   // h.seat = { x, z, yaw, h } in obj space (seat point, facing direction, seat height)
    h.mixer.update(dt); h.A.idle.setEffectiveWeight(1); h.A.walk.setEffectiveWeight(0); h.A.run.setEffectiveWeight(0);
    const B = h.bones, S = h.seat || { x: h.seatX, z: -0.04, yaw: 0, h: 0.5 };
    h.root.position.set(0, 0, 0); h.root.rotation.set(0, S.yaw, 0); obj.updateMatrixWorld(true); h.root.updateMatrixWorld(true);
    const co = Math.cos(S.yaw), si = Math.sin(S.yaw);
    const L = (x, y, z) => obj.localToWorld(new THREE.Vector3(S.x + x * co + z * si, y, S.z - x * si + z * co));   // offsets in the sitter's frame (z = forward)
    const seat = L(0, S.h, 0), hipsW = B.Hips.getWorldPosition(new THREE.Vector3()), local = h.root.parent.worldToLocal(seat.clone()), hl = h.root.parent.worldToLocal(hipsW.clone());
    h.root.position.add(local.sub(hl)); h.root.updateMatrixWorld(true);
    B.Spine.rotation.set(0.05, 0, 0); B.Spine1.rotation.set(0.04, 0, 0);
    twoBoneIK(B.LeftUpLeg, B.LeftLeg, B.LeftFoot, L(0.12, 0.08, 0.46), L(0.14, 0.9, 1.5));
    twoBoneIK(B.RightUpLeg, B.RightLeg, B.RightFoot, L(-0.12, 0.08, 0.46), L(-0.14, 0.9, 1.5));
    const lap = S.table ? 0.78 : S.h + 0.05, reach = S.table ? 0.42 : 0.26;
    twoBoneIK(B.LeftArm, B.LeftForeArm, B.LeftHand, L(0.17, lap, reach), L(0.6, 0.6, -0.3));
    twoBoneIK(B.RightArm, B.RightForeArm, B.RightHand, L(-0.17, lap + Math.max(0, Math.sin(h.talk * 0.6)) ** 6 * 0.25, reach), L(-0.6, 0.6, -0.3));
    B.Head.rotation.set(0, Math.sin(h.talk * 0.5) * 0.4, 0); B.Head.updateMatrixWorld(true);
  }
  perform(a, h, dt) {   // street performers: guitarist strums, juggler throws balls, living statue holds still
    h.mixer.update(dt); const B = h.bones, t = h.talk;
    if (a.act === 'guitar') {
      B.LeftArm.rotation.set(-0.9, 0, 0.5); B.LeftForeArm.rotation.set(-1.2, 0.3, 0);
      B.RightArm.rotation.set(-0.5, 0, -0.25); B.RightForeArm.rotation.set(-1.0 - Math.sin(t * 12) * 0.25, 0, 0);
      B.Head.rotation.set(0.25, Math.sin(t * 0.8) * 0.2, 0); B.Spine1.rotation.set(Math.sin(t * 2) * 0.03, 0, 0);
    } else if (a.act === 'juggle') {
      const c = Math.sin(t * 7);
      B.LeftArm.rotation.set(-0.6 + c * 0.12, 0, 0.2); B.LeftForeArm.rotation.set(-1.1, 0, 0);
      B.RightArm.rotation.set(-0.6 - c * 0.12, 0, -0.2); B.RightForeArm.rotation.set(-1.1, 0, 0);
      B.Head.rotation.set(-0.35, 0, 0);
      a.balls.forEach((b, i) => { const ph = (t * 1.15 + i / 3) % 1, x = Math.cos(ph * Math.PI) * 0.28, y = 1.45 + Math.sin(ph * Math.PI) * 0.75; b.position.set(x, y, 0.35); });
    } else {   // living statue: frozen pose, a tiny bow when someone is near
      B.RightArm.rotation.set(-2.6, 0, -0.2); B.RightForeArm.rotation.set(-0.2, 0, 0); B.LeftArm.rotation.set(0, 0, 0.5); B.Head.rotation.set(-0.2, 0.3, 0);
    }
  }
  // keep the walking player out of pedestrians and parked/moving vehicles
  pushPlayer(x, z, rad) {
    for (const a of [...this.agents, ...this.buskers]) {
      const r = a.kind === 'busker' ? 1.0 : a.kind === 'ped' ? 0.35 : a.kind === 'bike' ? 0.5 : a.kind === 'group' ? (a.tour ? 3.3 : 0.9) : a.kind === 'bench' ? 0.95 : a.kind === 'cafe' ? 2.2 : 0;
      if (r) { const dx = x - a.x, dz = z - a.z, d = Math.hypot(dx, dz), m = r + rad; if (d < m && d > 1e-6) { x = a.x + dx / d * m; z = a.z + dz / d * m; } continue; }
      const co = Math.cos(a.yaw), si = Math.sin(a.yaw), dx = x - a.x, dz = z - a.z;
      let lx = dx * co - dz * si, lz = dx * si + dz * co; const hx = (a.kind === 'bus' ? 1.3 : 0.95) + rad, hz = (a.kind === 'bus' ? 6.1 : 2.1) + rad;
      if (Math.abs(lx) < hx && Math.abs(lz) < hz) { if (hx - Math.abs(lx) < hz - Math.abs(lz)) lx = Math.sign(lx || 1) * hx; else lz = Math.sign(lz || 1) * hz; x = a.x + lx * co + lz * si; z = a.z - lx * si + lz * co; }
    }
    return [x, z];
  }
  hitsVehicle(x, z, rad) { for (const a of this.agents) if (a.kind !== 'ped' && !a.static && Math.hypot(x - a.x, z - a.z) < rad + (a.kind === 'bus' ? 4.5 : 0)) return true; return false; }
}
