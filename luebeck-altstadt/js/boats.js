// River traffic on the Trave and the canal: excursion boats with passengers on the open upper deck, rowing boats
// (single and double sculls) whose rowers pull the oars in rhythm, kayaks with paddles, and small motor boats.
// Boats steer by themselves: they keep to open water by probing ahead and turning away from the banks.
import * as THREE from 'three';

const WY = -1.12;   // water level
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
const hullGeo = (L, B, H, pointy = 1) => {   // simple boat hull: rounded bow, transom stern, extruded and tapered
  const s = new THREE.Shape(); s.moveTo(-L / 2, -B / 2); s.lineTo(L / 2 - B * pointy, -B / 2); s.quadraticCurveTo(L / 2, -B / 2, L / 2, 0); s.quadraticCurveTo(L / 2, B / 2, L / 2 - B * pointy, B / 2); s.lineTo(-L / 2, B / 2); s.lineTo(-L / 2, -B / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: H, bevelEnabled: true, bevelSize: Math.min(0.12, B * 0.08), bevelThickness: 0.08, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); g.translate(0, -H * 0.55, 0);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0) { const k = 1 + y / H * 0.45; p.setZ(i, p.getZ(i) * k); } } g.computeVertexNormals(); return g;
};
function rower(col) {   // small seated figure with arm pivots so the stroke can be animated
  const g = new THREE.Group(), skin = M(0xe2b38f), shirt = M(col);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.32, 4, 8), shirt); torso.position.y = 0.42; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), skin); head.position.y = 0.82; g.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 6, 0, 6.3, 0, 1.4), M(0xf2efe8)); cap.position.y = 0.84; g.add(cap);
  const arms = new THREE.Group(); arms.position.y = 0.6; g.add(arms);
  for (const sd of [-1, 1]) { const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.42, 3, 6), shirt); a.rotation.x = Math.PI / 2; a.position.set(sd * 0.2, -0.05, 0.25); arms.add(a); }
  const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.6, 3, 6), M(0x22252b)); legs.rotation.x = Math.PI / 2; legs.position.set(0, 0.12, 0.4); g.add(legs);
  return { g, torso, arms };
}
function excursion() {
  const g = new THREE.Group(), L = 26, B = 5.2;
  const hull = new THREE.Mesh(hullGeo(L, B, 1.6, 0.9), M(0xf4f4f0, { roughness: 0.4 })); hull.rotation.y = -Math.PI / 2; g.add(hull);
  const band = new THREE.Mesh(new THREE.BoxGeometry(B + 0.08, 0.28, L - 3), M(0x1d3f8f)); band.position.y = 0.32; band.position.z = -0.8; g.add(band);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(B - 1.0, 2.1, L - 9), M(0xeeeeea, { roughness: 0.4 })); cabin.position.set(0, 1.85, -1.5); g.add(cabin);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(B - 0.95, 1.0, L - 9.4), M(0x24384a, { roughness: 0.1, metalness: 0.4 })); glass.position.set(0, 2.05, -1.5); g.add(glass);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(B - 0.6, 0.12, L - 8), M(0xf8f8f4)); roof.position.set(0, 2.95, -1.5); g.add(roof);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(B - 0.6, 0.6, L - 8), M(0xdfe6ee, { transparent: true, opacity: 0.35 })); rail.position.set(0, 3.3, -1.5); g.add(rail);
  const wh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.0), M(0xf4f4f0)); wh.position.set(0, 3.7, 5.2); g.add(wh);   // wheelhouse on top
  const colors = [0xd8332b, 0x2b6a9b, 0xf2b630, 0x3c8a4a, 0xe8e4da, 0x1f1f22, 0x8c6d8f, 0xa14a2f];
  for (let i = 0; i < 22; i++) { const p = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.35, 3, 6), M(colors[i % colors.length])); p.position.set(-1.6 + (i % 4) * 1.05, 3.4, -10 + Math.floor(i / 4) * 2.2); g.add(p); const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), M(0xe2b38f)); h.position.set(p.position.x, 3.85, p.position.z); g.add(h); }
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), M(0xf2efe8, { side: THREE.DoubleSide })); flag.position.set(0, 2.2, -L / 2 + 0.6); g.add(flag);
  const red = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), M(0xb0242a, { side: THREE.DoubleSide })); red.position.set(0, 2.05, -L / 2 + 0.61); g.add(red);
  return { g, speed: 2.6, len: L, kind: 'ship' };
}
function scull(n) {
  const g = new THREE.Group(), L = n === 1 ? 7.5 : 9.5;
  const hull = new THREE.Mesh(hullGeo(L, 0.55, 0.3, 3), M(n === 1 ? 0xf2f2ee : 0xe8c84a, { roughness: 0.3 })); hull.rotation.y = -Math.PI / 2; g.add(hull);
  const rowers = [], oars = [];
  for (let i = 0; i < n; i++) {
    const r = rower([0x2b6a9b, 0xd8332b][i % 2]); r.g.position.set(0, 0.0, (i - (n - 1) / 2) * 2.2); g.add(r.g); rowers.push(r);
    for (const sd of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sd * 0.8, 0.45, r.g.position.z + 0.1); const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.9, 5), M(0xd9d0bf)); oar.rotation.z = Math.PI / 2; oar.position.x = sd * 0.9; piv.add(oar); const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.16), M(0xd8332b)); blade.position.x = sd * 2.3; piv.add(blade); g.add(piv); oars.push({ piv, sd }); }
    const rig = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.03, 0.05), M(0x9aa0a6, { metalness: 0.7 })); rig.position.set(0, 0.42, r.g.position.z + 0.1); g.add(rig);
  }
  return { g, speed: 2.8, len: L, kind: 'row', rowers, oars };
}
function kayak() {
  const g = new THREE.Group(), L = 4.4;
  const hull = new THREE.Mesh(hullGeo(L, 0.6, 0.35, 2.5), M([0xd8332b, 0xf2b630, 0x2b9b6a][Math.floor(Math.random() * 3)], { roughness: 0.35 })); hull.rotation.y = -Math.PI / 2; g.add(hull);
  const r = rower(0x1f2a3a); r.g.position.z = -0.2; r.g.position.y = -0.15; g.add(r.g);
  const paddle = new THREE.Group(); paddle.position.set(0, 0.55, 0.15); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 5), M(0x1a1a1a)); sh.rotation.z = Math.PI / 2; paddle.add(sh);
  for (const sd of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.17), M(0xf2b630)); b.position.x = sd * 1.1; b.rotation.x = sd * 0.8; paddle.add(b); }
  g.add(paddle);
  return { g, speed: 1.6, len: L, kind: 'kayak', rowers: [r], paddle };
}
function motorboat() {
  const g = new THREE.Group(), L = 6;
  const hull = new THREE.Mesh(hullGeo(L, 2.1, 0.9, 1.2), M(0xf4f4f0, { roughness: 0.35 })); hull.rotation.y = -Math.PI / 2; g.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 3.6), M(0x8a6a48)); deck.position.set(0, 0.45, -0.6); g.add(deck);
  const ws = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.06), M(0x9fb6c6, { transparent: true, opacity: 0.5 })); ws.position.set(0, 0.8, 0.9); ws.rotation.x = -0.4; g.add(ws);
  const r = rower(0xe8e4da); r.g.position.set(0.3, 0.3, 0.2); r.arms.rotation.x = -0.3; g.add(r.g);
  return { g, speed: 4.2, len: L, kind: 'motor' };
}

export class Boats {
  constructor(scene, { inWater, waterPts, touch }) {
    this.scene = scene; this.inWater = inWater; this.pts = waterPts; this.list = []; this.max = touch ? 6 : 13; this.t = 0;
    this.wake = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  }
  spawn(px, pz) {
    const near = this.pts.filter(([x, z]) => { const d = Math.hypot(x - px, z - pz); return d > 60 && d < 320; }); if (!near.length) return;
    const [x, z] = near[Math.floor(Math.random() * near.length)], r = Math.random();
    const b = r < 0.22 ? excursion() : r < 0.55 ? scull(Math.random() < 0.5 ? 1 : 2) : r < 0.8 ? kayak() : motorboat();
    b.x = x; b.z = z; b.yaw = Math.random() * 6.28; b.ph = Math.random() * 6; b.turn = 0;
    // V-shaped wake behind the stern
    const wg = new THREE.PlaneGeometry(1, 1); wg.rotateX(-Math.PI / 2); b.wakes = [];
    for (const sd of [-1, 1]) { const w = new THREE.Mesh(wg, this.wake); w.scale.set(0.25, 1, b.len * 0.9); w.rotation.y = sd * 0.22; w.position.set(sd * b.len * 0.1, -0.13, -b.len * 0.85); b.g.add(w); b.wakes.push(w); }
    b.g.traverse((o) => { if (o.isMesh && o.material !== this.wake) o.castShadow = true; });
    this.scene.add(b.g); this.list.push(b);
  }
  update(dt, px, pz) {
    this.t += dt; const T = this.t;
    if (!this.filled) { this.filled = true; for (let k = 0; k < this.max * 0.6; k++) this.spawn(px, pz); }
    if (this.list.length < this.max && Math.random() < dt * 0.8) this.spawn(px, pz);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      if (Math.hypot(b.x - px, b.z - pz) > 420) { this.scene.remove(b.g); this.list.splice(i, 1); continue; }
      // steer: probe ahead / left / right; turn toward open water; slight wander
      const look = b.len * 0.7 + 6, f = (a) => this.inWater(b.x + Math.sin(a) * look, b.z + Math.cos(a) * look);
      if (!f(b.yaw)) { b.turn = f(b.yaw + 0.6) ? 0.6 : f(b.yaw - 0.6) ? -0.6 : (b.turn || 1) * 1.0; }
      else if (!f(b.yaw + 0.35)) b.turn = -0.25; else if (!f(b.yaw - 0.35)) b.turn = 0.25; else b.turn *= 0.95;
      b.yaw += b.turn * dt * (b.kind === 'ship' ? 0.35 : 0.8) + Math.sin(T * 0.1 + b.ph) * 0.002;
      let v = b.speed; if (b.kind === 'row') v *= 0.75 + 0.35 * Math.max(0, Math.sin(T * 2.4 + b.ph));   // surge on each stroke
      const nx = b.x + Math.sin(b.yaw) * v * dt, nz = b.z + Math.cos(b.yaw) * v * dt;
      if (this.inWater(nx, nz)) { b.x = nx; b.z = nz; } else b.yaw += dt * 1.2;
      const bob = Math.sin(T * 1.6 + b.ph) * 0.03;
      b.g.position.set(b.x, WY + 0.15 + bob, b.z); b.g.rotation.set(Math.sin(T * 1.3 + b.ph) * 0.012, b.yaw, Math.sin(T * 1.1 + b.ph) * 0.015);
      // rowing motion: oars sweep and dip; rowers lean forward and back
      if (b.oars) { const s = Math.sin(T * 2.4 + b.ph); for (const o of b.oars) { o.piv.rotation.y = o.sd * s * 0.55; o.piv.rotation.z = o.sd * (s > 0 ? -0.12 : 0.08); } for (const r of b.rowers) { r.torso.rotation.x = -s * 0.35; r.arms.rotation.x = -s * 0.5; } }
      if (b.paddle) { const s = T * 2.0 + b.ph; b.paddle.rotation.z = Math.sin(s) * 0.5; b.paddle.rotation.y = Math.cos(s) * 0.25; }
      for (const w of b.wakes) w.material.opacity = 0.25 + 0.1 * Math.sin(T * 3 + b.ph);
    }
  }
}
