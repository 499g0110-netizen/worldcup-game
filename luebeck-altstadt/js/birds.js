// Wild birds: herring gulls circling over the Trave, mallards and mute swans paddling on the river,
// pigeons pecking on squares that flutter up when the player walks close. All modelled in code.
import * as THREE from 'three';

const ell = (rx, ry, rz, w = 12, h = 8) => new THREE.SphereGeometry(1, w, h).scale(rx, ry, rz);
const M = (c, r = 0.7) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
function wing(len, wid, col) {   // tapered wing plane, hinged at x = 0
  const s = new THREE.Shape(); s.moveTo(0, -wid * 0.5); s.lineTo(len * 0.6, -wid * 0.45); s.lineTo(len, -wid * 0.1); s.lineTo(len * 0.85, wid * 0.25); s.lineTo(0, wid * 0.5);
  const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: col, roughness: 0.7, side: THREE.DoubleSide })); return m;
}
function makeGull() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(ell(0.09, 0.09, 0.26), M(0xf4f4f2)); g.add(body);
  const head = new THREE.Mesh(ell(0.07, 0.07, 0.08), M(0xf6f6f4)); head.position.set(0, 0.05, 0.25); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.08, 6).rotateX(Math.PI / 2), M(0xf2c03a, 0.4)); beak.position.set(0, 0.04, 0.34); g.add(beak);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.15, 4).rotateX(-Math.PI / 2), M(0xf2f2f0)); tail.position.set(0, 0, -0.3); tail.scale.y = 0.3; g.add(tail);
  const wings = [];
  for (const sd of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sd * 0.07, 0.03, 0.02); const w = wing(0.6, 0.2, 0xb9c2c9); w.scale.x = sd; piv.add(w); const tip = wing(0.18, 0.12, 0x222428); tip.position.x = sd * 0.48; tip.scale.x = sd; piv.add(tip); g.add(piv); wings.push(piv); }
  return { g, wings };
}
function makeDuck(swan) {
  const g = new THREE.Group(), s = swan ? 2.2 : 1;
  const bodyC = swan ? 0xf6f5f0 : 0x7d6a55;
  const body = new THREE.Mesh(ell(0.12 * s, 0.08 * s, 0.2 * s), M(bodyC)); body.position.y = 0.03 * s; g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * s, 0.035 * s, (swan ? 0.32 : 0.1) * s, 8), M(swan ? bodyC : 0x1f5a3a)); neck.position.set(0, (swan ? 0.2 : 0.1) * s, 0.15 * s); neck.rotation.x = swan ? -0.25 : 0.2; g.add(neck);
  const head = new THREE.Mesh(ell(0.045 * s, 0.045 * s, 0.06 * s), M(swan ? bodyC : 0x1f5a3a, 0.3)); head.position.set(0, (swan ? 0.36 : 0.16) * s, (swan ? 0.2 : 0.18) * s); g.add(head);
  const bill = new THREE.Mesh(ell(0.02 * s, 0.012 * s, 0.04 * s), M(swan ? 0xd8642a : 0xe0b23a, 0.4)); bill.position.set(0, (swan ? 0.35 : 0.155) * s, (swan ? 0.27 : 0.24) * s); g.add(bill);
  if (!swan) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 4, 12).rotateX(Math.PI / 2), M(0xf2f2f0)); ring.position.set(0, 0.07, 0.16); g.add(ring); }
  return { g };
}
function makePigeon() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(ell(0.06, 0.06, 0.11), M(0x8a8f98)); body.position.y = 0.09; g.add(body);
  const neck = new THREE.Mesh(ell(0.04, 0.045, 0.045), M(0x5f7a72, 0.35)); neck.position.set(0, 0.14, 0.07); g.add(neck);   // iridescent neck
  const head = new THREE.Mesh(ell(0.03, 0.03, 0.035), M(0x6e737c)); head.position.set(0, 0.18, 0.1); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.025, 5).rotateX(Math.PI / 2), M(0x2a2a2a)); beak.position.set(0, 0.177, 0.135); g.add(beak);
  for (const sd of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 4), M(0xc0504a)); l.position.set(sd * 0.02, 0.025, 0); g.add(l); }
  const wings = []; for (const sd of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sd * 0.05, 0.11, 0); const w = wing(0.25, 0.12, 0x7b8089); w.scale.x = sd; piv.add(w); piv.rotation.z = -sd * 1.3; g.add(piv); wings.push(piv); }
  return { g, wings, head };
}

export class Birds {
  constructor(scene, { touch, water, squares }) {
    this.scene = scene; this.t = 0; this.water = water;
    const nG = touch ? 8 : 18;
    this.gulls = [];
    for (let i = 0; i < nG; i++) { const b = makeGull(); b.g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(b.g); this.gulls.push({ ...b, cx: 0, cz: 0, r: 30 + Math.random() * 60, h: 18 + Math.random() * 30, sp: (0.15 + Math.random() * 0.2) * (Math.random() < 0.5 ? -1 : 1), ph: Math.random() * 6.28, home: null }); }
    this.ducks = []; this.pigeons = []; this.squares = squares; this.squareDone = new Set();
    this.waterPts = water;   // array of [x, z] points on open water (river centreline samples)
    const nD = touch ? 6 : 14;
    for (let i = 0; i < nD && water.length; i++) { const swan = i % 4 === 0, b = makeDuck(swan); scene.add(b.g); const p = water[Math.floor(Math.random() * water.length)]; this.ducks.push({ ...b, x: p[0], z: p[1], yaw: Math.random() * 6.28, tx: p[0], tz: p[1], swan, ph: Math.random() * 6 }); }
  }
  // pigeons appear on a square once the player is within 120 m of it
  spawnPigeons(px, pz, isFree) {
    for (const [i, [x, z]] of this.squares.entries()) {
      if (this.squareDone.has(i) || Math.hypot(px - x, pz - z) > 120) continue; this.squareDone.add(i);
      for (let k = 0; k < 9; k++) {
        const a = Math.random() * 6.28, r = 2 + Math.random() * 7, bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r; if (isFree && !isFree(bx, bz)) continue;
        const b = makePigeon(); b.g.position.set(bx, 0, bz); this.scene.add(b.g);
        this.pigeons.push({ ...b, x: bx, z: bz, hx: bx, hz: bz, yaw: Math.random() * 6.28, state: 'ground', t: Math.random() * 5, y: 0, vx: 0, vz: 0 });
      }
    }
  }
  update(dt, px, pz) {
    this.t += dt; const T = this.t;
    // gulls follow the river near the player (re-home every few seconds to the nearest water point)
    for (const g of this.gulls) {
      if (!g.home || Math.hypot(g.cx - px, g.cz - pz) > 260) { const w = this.waterPts.length ? this.waterPts.reduce((b, p) => (Math.hypot(p[0] - px, p[1] - pz) < Math.hypot(b[0] - px, b[1] - pz) ? p : b)) : [px, pz]; g.cx = w[0] + (Math.random() - 0.5) * 120; g.cz = w[1] + (Math.random() - 0.5) * 120; g.home = true; }
      g.ph += dt * g.sp; const x = g.cx + Math.cos(g.ph) * g.r, z = g.cz + Math.sin(g.ph) * g.r, y = g.h + Math.sin(g.ph * 2.3) * 4;
      g.g.position.set(x, y, z); g.g.rotation.set(0, Math.atan2(-Math.sin(g.ph), Math.cos(g.ph)) * Math.sign(g.sp) + (g.sp < 0 ? Math.PI : 0), -Math.sign(g.sp) * 0.35);
      const flap = Math.sin(T * 3 + g.ph * 10) > 0.6 ? Math.sin(T * 14 + g.ph) * 0.6 : 0.08;   // mostly gliding, bursts of flapping
      g.wings[0].rotation.z = flap; g.wings[1].rotation.z = -flap;
    }
    // ducks & swans drift between nearby water points, bobbing
    for (const d of this.ducks) {
      if (Math.hypot(d.tx - d.x, d.tz - d.z) < 1) { const near = this.waterPts.filter((p) => Math.hypot(p[0] - d.x, p[1] - d.z) < 40); const p = near.length ? near[Math.floor(Math.random() * near.length)] : [d.x, d.z]; d.tx = p[0] + (Math.random() - 0.5) * 8; d.tz = p[1] + (Math.random() - 0.5) * 8; }
      const dx = d.tx - d.x, dz = d.tz - d.z, L = Math.hypot(dx, dz) || 1, v = d.swan ? 0.35 : 0.5;
      let dy = Math.atan2(dx, dz) - d.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); d.yaw += dy * Math.min(1, dt * 1.5);
      d.x += Math.sin(d.yaw) * v * dt; d.z += Math.cos(d.yaw) * v * dt; void L;
      d.g.position.set(d.x, -1.1 + Math.sin(T * 2 + d.ph) * 0.015, d.z); d.g.rotation.set(Math.sin(T * 1.7 + d.ph) * 0.04, d.yaw, 0);
    }
    // pigeons: peck and hop; take off when the player comes within 3 m, land again 20 s later
    for (const p of this.pigeons) {
      p.t += dt; const dPl = Math.hypot(px - p.x, pz - p.z);
      if (p.state === 'ground') {
        if (dPl < 3) { p.state = 'fly'; p.t = 0; const a = Math.atan2(p.x - px, p.z - pz) + (Math.random() - 0.5); p.vx = Math.sin(a) * 6; p.vz = Math.cos(a) * 6; p.yaw = a; }
        else if (Math.sin(p.t * 1.3 + p.hx) > 0.95) { p.yaw += (Math.random() - 0.5) * 0.6; p.x += Math.sin(p.yaw) * 0.01; p.z += Math.cos(p.yaw) * 0.01; }
        p.head.position.y = 0.18 - Math.max(0, Math.sin(p.t * 6 + p.hz)) * 0.05;   // pecking
        p.y = 0; p.wings[0].rotation.z = -1.3; p.wings[1].rotation.z = 1.3;
      } else {
        p.x += p.vx * dt; p.z += p.vz * dt; p.y = Math.min(14, p.y + dt * (p.t < 2.5 ? 5 : -0.5));
        const f = Math.sin(T * 22) * 0.9; p.wings[0].rotation.z = f; p.wings[1].rotation.z = -f;
        if (p.t > 20) { p.state = 'ground'; p.x = p.hx; p.z = p.hz; p.y = 0; }
      }
      p.g.position.set(p.x, p.y, p.z); p.g.rotation.y = p.yaw;
    }
  }
}
