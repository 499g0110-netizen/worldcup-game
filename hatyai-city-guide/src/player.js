import * as THREE from 'three';
import { FOOTPRINTS } from './facade.js';
import { groundY } from './world.js';
import { pointInPoly, clamp } from './util.js';

// =====================================================================
//  Walkable traveller: third-person character with procedural gait,
//  building collision, keyboard / mouse / touch-joystick controls.
// =====================================================================
const GX0 = -2600, GZ0 = -2600, GSIZE = 5200, CELL = 1.5, GN = Math.ceil(GSIZE / CELL);

function buildCollision() {
  const g = new Uint8Array(GN * GN);
  for (const pts of FOOTPRINTS) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    if (x1 < GX0 || z1 < GZ0 || x0 > GX0 + GSIZE || z0 > GZ0 + GSIZE) continue;
    const i0 = Math.max(0, Math.floor((x0 - GX0) / CELL)), i1 = Math.min(GN - 1, Math.floor((x1 - GX0) / CELL));
    const j0 = Math.max(0, Math.floor((z0 - GZ0) / CELL)), j1 = Math.min(GN - 1, Math.floor((z1 - GZ0) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (pointInPoly(GX0 + (i + 0.5) * CELL, GZ0 + (j + 0.5) * CELL, pts)) g[j * GN + i] = 1;
  }
  return g;
}

function limb(len, r0, r1, mat) { // pivot at top, extends down
  const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CapsuleGeometry((r0 + r1) / 2, len - (r0 + r1), 4, 10), mat);
  m.position.y = -len / 2; m.castShadow = true; g.add(m); return g;
}

export class Player {
  constructor(ctx, camera, canvas) {
    this.ctx = ctx; this.camera = camera; this.canvas = canvas; this.enabled = false;
    this.pos = new THREE.Vector3(-30, 0, 40); this.vel = new THREE.Vector3(); this.heading = Math.PI; this.speed = 0;
    this.camYaw = Math.PI; this.camPitch = 0.32; this.camDist = 7.5; this.phase = 0; this.keys = {}; this.joy = { x: 0, y: 0 };
    this.grid = null;
    // ---- character model ----
    const skin = new THREE.MeshStandardMaterial({ color: 0xc99870, roughness: 0.7 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0xe8e1cf, roughness: 0.85 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x2f3e5a, roughness: 0.9 });
    const shoe = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.6 });
    const hairM = new THREE.MeshStandardMaterial({ color: 0x15110e, roughness: 0.6 });
    const bagM = new THREE.MeshStandardMaterial({ color: 0x8a3b22, roughness: 0.8 });
    const root = new THREE.Group(); this.root = root;
    const hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips); this.hips = hips;
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.2), pants); pelvis.castShadow = true; hips.add(pelvis);
    const spine = new THREE.Group(); spine.position.y = 0.08; hips.add(spine); this.spine = spine;
    const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.32, 4, 12), shirt); chest.scale.set(1.15, 1, 0.75); chest.position.y = 0.28; chest.castShadow = true; spine.add(chest);
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.14), bagM); bag.position.set(0, 0.3, -0.17); bag.castShadow = true; spine.add(bag);
    const neck = new THREE.Group(); neck.position.y = 0.55; spine.add(neck); this.neck = neck;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 14), skin); head.scale.set(0.92, 1.08, 1); head.position.y = 0.13; head.castShadow = true; neck.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.122, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); hair.position.set(0, 0.145, -0.01); neck.add(hair);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), skin); nose.position.set(0, 0.12, 0.11); neck.add(nose);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 18), new THREE.MeshStandardMaterial({ color: 0xe6c274, roughness: 0.6 })); cap.position.set(0, 0.24, 0); neck.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.015, 0.12), cap.material); brim.position.set(0, 0.215, 0.12); neck.add(brim);
    const mkArm = (s) => { const sh = new THREE.Group(); sh.position.set(s * 0.22, 0.47, 0); spine.add(sh); const up = limb(0.3, 0.055, 0.05, shirt); sh.add(up);
      const el = new THREE.Group(); el.position.y = -0.3; up.add(el); const lo = limb(0.28, 0.045, 0.04, skin); el.add(lo); const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), skin); hand.position.y = -0.3; lo.add(hand); return { sh, el }; };
    const mkLeg = (s) => { const hp = new THREE.Group(); hp.position.set(s * 0.1, -0.05, 0); hips.add(hp); const up = limb(0.44, 0.08, 0.065, pants); hp.add(up);
      const kn = new THREE.Group(); kn.position.y = -0.44; up.add(kn); const lo = limb(0.42, 0.06, 0.05, pants); kn.add(lo);
      const an = new THREE.Group(); an.position.y = -0.42; lo.add(an); const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.24), shoe); f.position.set(0, -0.02, 0.05); f.castShadow = true; an.add(f); return { hp, kn, an }; };
    this.armL = mkArm(-1); this.armR = mkArm(1); this.legL = mkLeg(-1); this.legR = mkLeg(1);
    root.visible = false; ctx.scene.add(root);
    // blob shadow for night / far shots
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; root.add(sh);
    // personal lantern light so the character reads at night
    this.lamp = new THREE.PointLight(0xffd7a0, 0, 14, 2); this.lamp.position.set(0, 2.4, 0.6); root.add(this.lamp);
    this._bind();
  }
  _bind() {
    addEventListener('keydown', (e) => { if (!this.enabled) return; this.keys[e.code] = true; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault(); });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    let drag = null;
    this.canvas.addEventListener('pointerdown', (e) => { if (!this.enabled) return; drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
    addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; this.camYaw -= (e.clientX - drag.x) * 0.006; this.camPitch = clamp(this.camPitch + (e.clientY - drag.y) * 0.004, -0.15, 1.2); drag.x = e.clientX; drag.y = e.clientY; });
    addEventListener('pointerup', (e) => { if (drag && e.pointerId === drag.id) drag = null; });
    this.canvas.addEventListener('wheel', (e) => { if (!this.enabled) return; this.camDist = clamp(this.camDist * (1 + e.deltaY * 0.001), 2.5, 60); }, { passive: true });
    // touch joystick
    const pad = document.getElementById('joy'), knob = pad && pad.querySelector('i');
    if (pad) {
      let jid = null; const r = () => pad.getBoundingClientRect();
      const set = (e) => { const b = r(), cx = b.left + b.width / 2, cy = b.top + b.height / 2; let dx = (e.clientX - cx) / (b.width / 2), dy = (e.clientY - cy) / (b.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } this.joy.x = dx; this.joy.y = dy; knob.style.transform = `translate(${dx * 34}px,${dy * 34}px)`; };
      pad.addEventListener('pointerdown', (e) => { e.stopPropagation(); jid = e.pointerId; pad.setPointerCapture(jid); set(e); });
      pad.addEventListener('pointermove', (e) => { if (e.pointerId === jid) set(e); });
      const end = (e) => { if (e.pointerId === jid) { jid = null; this.joy.x = this.joy.y = 0; knob.style.transform = ''; } };
      pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
    }
  }
  blocked(x, z) {
    if (!this.grid) return false;
    const i = Math.floor((x - GX0) / CELL), j = Math.floor((z - GZ0) / CELL);
    if (i < 0 || j < 0 || i >= GN || j >= GN) return false;
    return this.grid[j * GN + i] === 1;
  }
  free(x, z) { const r = 0.35; return !this.blocked(x + r, z) && !this.blocked(x - r, z) && !this.blocked(x, z + r) && !this.blocked(x, z - r); }
  spawnNear(x, z) {
    if (!this.grid) this.grid = buildCollision();
    for (let rad = 0; rad < 120; rad += 2) for (let a = 0; a < 6.28; a += 0.5) { const px = x + Math.cos(a) * rad, pz = z + Math.sin(a) * rad; if (this.free(px, pz)) { this.pos.set(px, groundY(px, pz), pz); return; } }
    this.pos.set(x, groundY(x, z), z);
  }
  enable(x, z) { this.enabled = true; this.root.visible = true; this.spawnNear(x, z); this.camYaw = this.heading; }
  disable() { this.enabled = false; this.root.visible = false; this.keys = {}; }
  update(dt, t, night) {
    if (!this.enabled) return null;
    const k = this.keys; let ix = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + this.joy.x, iz = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) - this.joy.y;
    const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
    const run = k.ShiftLeft || k.ShiftRight || Math.hypot(this.joy.x, this.joy.y) > 0.92;
    const target = il > 0.05 ? (run ? 6.2 : 2.3) * Math.min(1, il) : 0;
    this.speed += (target - this.speed) * Math.min(1, dt * (target > this.speed ? 4 : 7));
    if (il > 0.05) {
      // camera-relative direction (camera looks along -forward of yaw)
      const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw);
      const dx = fx * iz - fz * ix, dz = fz * iz + fx * ix;
      const want = Math.atan2(dx, dz);
      let d = want - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); this.heading += d * Math.min(1, dt * 10);
    }
    const mx = Math.sin(this.heading) * this.speed * dt, mz = Math.cos(this.heading) * this.speed * dt;
    const nx = this.pos.x + mx, nz = this.pos.z + mz;
    if (this.free(nx, nz)) { this.pos.x = nx; this.pos.z = nz; } else if (this.free(nx, this.pos.z)) this.pos.x = nx; else if (this.free(this.pos.x, nz)) this.pos.z = nz; else this.speed *= 0.5;
    let gy = groundY(this.pos.x, this.pos.z) + 0.12; for (const r of (this.ctx.walkDecks || [])) if (this.pos.x > r[0] && this.pos.x < r[1] && this.pos.z > r[2] && this.pos.z < r[3]) gy = Math.max(gy, r[4]);
    this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 10);
    // ---- procedural gait: phase advances with distance (no foot sliding) ----
    const stride = run ? 1.55 : 1.05; this.phase += (this.speed * dt) / stride * Math.PI;
    const w = clamp(this.speed / 2.3, 0, 1), rw = clamp((this.speed - 2.3) / 3.9, 0, 1), s = Math.sin(this.phase), c = Math.cos(this.phase);
    const legA = (0.5 + 0.35 * rw) * w, kneeA = (0.7 + 0.6 * rw) * w;
    this.legL.hp.rotation.x = s * legA; this.legR.hp.rotation.x = -s * legA;
    this.legL.kn.rotation.x = Math.max(0, -c) * kneeA + 0.05; this.legR.kn.rotation.x = Math.max(0, c) * kneeA + 0.05;
    this.legL.an.rotation.x = -this.legL.hp.rotation.x * 0.3; this.legR.an.rotation.x = -this.legR.hp.rotation.x * 0.3;
    const armA = (0.45 + 0.4 * rw) * w;
    this.armL.sh.rotation.x = -s * armA; this.armR.sh.rotation.x = s * armA; this.armL.sh.rotation.z = -0.08; this.armR.sh.rotation.z = 0.08;
    this.armL.el.rotation.x = -(0.2 + 0.9 * rw * w); this.armR.el.rotation.x = -(0.2 + 0.9 * rw * w);
    const breathe = Math.sin(t * 1.8) * 0.012 * (1 - w);
    this.hips.position.y = 0.95 - 0.03 * w - 0.04 * rw + Math.abs(c) * 0.05 * w + breathe;
    this.hips.rotation.y = s * 0.12 * w; this.spine.rotation.y = -s * 0.18 * w; this.spine.rotation.x = 0.06 * w + 0.16 * rw + breathe;
    this.neck.rotation.y = -this.spine.rotation.y * 0.6 + Math.sin(t * 0.4) * 0.15 * (1 - w);
    this.root.position.copy(this.pos); this.root.rotation.y = this.heading;
    this.lamp.intensity = night * 6;
    // ---- camera ----
    const cd = this.camDist, cp = this.camPitch;
    const tx = this.pos.x, ty = this.pos.y + 1.55, tz = this.pos.z;
    const want = new THREE.Vector3(tx - Math.sin(this.camYaw) * Math.cos(cp) * cd, ty + Math.sin(cp) * cd, tz - Math.cos(this.camYaw) * Math.cos(cp) * cd);
    // pull camera in if a building blocks the view line
    for (let f = 0.25; f <= 1.0; f += 0.25) { const px = tx + (want.x - tx) * f, pz = tz + (want.z - tz) * f; if (this.blocked(px, pz) && want.y - ty < 25) { want.set(tx + (want.x - tx) * (f - 0.2), ty + (want.y - ty) * (f - 0.2) + 0.5, tz + (want.z - tz) * (f - 0.2)); break; } }
    if (!this._cam) this._cam = want.clone(); this._cam.lerp(want, Math.min(1, dt * 8));
    this.camera.position.copy(this._cam);
    const look = new THREE.Vector3(tx, ty, tz); this.camera.lookAt(look);
    return look;
  }
}
