import * as THREE from 'three';
import { Fighter, POSES, MOVES, samplePose } from './fighter.js';
import { canvasTex, signTex, mulberry32 } from './util.js';
import { GlowSet } from './props.js';
import { FOOTPRINTS } from './facade.js';
import { ThaiMusic, audioUnlock } from './story.js';

// =====================================================================
//  Muay Thai camp + playable bout (1 vs CPU)
//  Location is approximate (next to Jiranakhon Stadium) – no Hat Yai camp is mapped in OSM.
// =====================================================================
export const GYM = { x: 82, z: -1562 };
const RING_H = 1.15, HALF = 3.0;

export function buildMuayThaiGym(ctx) {
  const { scene } = ctx; const rnd = mulberry32(8);
  const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, o));
  let yaw = 0; const nr = ctx.hashAll && ctx.hashAll.nearest(GYM.x, GYM.z, 120);
  let fx = 0, fz = 1; if (nr) { fx = nr.px - GYM.x; fz = nr.pz - GYM.z; const l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l; yaw = Math.atan2(fx, fz); }
  const G = new THREE.Group(); G.position.set(GYM.x, 0, GYM.z); G.rotation.y = yaw; scene.add(G);   // local +z = street side
  const add = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; G.add(o); return o; };
  const W = 30, D = 22;
  // slab, half walls with murals, steel columns, corrugated gable roof
  add(new THREE.BoxGeometry(W, 0.3, D), std(0x8a8884, { roughness: 0.8 }), 0, 0.15, 0);
  const mural = canvasTex(1024, 128, (g, w, h) => { g.fillStyle = '#f2c42a'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8202a'; g.fillRect(0, 96, w, 32);
    g.fillStyle = '#1a1a1a'; for (let i = 0; i < 9; i++) { const x = 60 + i * 110; g.beginPath(); g.arc(x, 30, 10, 0, 7); g.fill(); g.fillRect(x - 6, 40, 12, 30); g.save(); g.translate(x, 70); g.rotate(i % 2 ? 0.9 : -0.9); g.fillRect(0, -4, 34, 8); g.restore(); g.fillRect(x - 14, 46, 28, 6); } }, {});
  mural.repeat.set(1, 1);
  const wallM = new THREE.MeshStandardMaterial({ map: mural, roughness: 0.7 });
  add(new THREE.BoxGeometry(W, 1.3, 0.25), wallM, 0, 0.95, -D / 2); for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.25, 1.3, D), wallM, s * W / 2, 0.95, 0);
  const steel = std(0x5a6a7a, { metalness: 0.6, roughness: 0.4 });
  for (let i = 0; i <= 5; i++) for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.3, 6, 0.3), steel, -W / 2 + i * W / 5, 3, s * D / 2);
  const rib = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#7a8a96'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.25)'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 2, h); g.fillStyle = 'rgba(120,60,30,.25)'; for (let i = 0; i < 10; i++) g.fillRect(Math.random() * w, 0, 3, h); }); rib.repeat.set(14, 6);
  const roofM = new THREE.MeshStandardMaterial({ map: rib, metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide });
  for (const s of [-1, 1]) { const r = add(new THREE.PlaneGeometry(W + 2, D / 2 + 1.6), roofM, 0, 7.1, s * (D / 4 + 0.4)); r.rotation.x = -Math.PI / 2 + s * -0.28; }
  for (let i = 0; i <= 5; i++) { const b = add(new THREE.BoxGeometry(0.18, 0.25, D), steel, -W / 2 + i * W / 5, 6.05, 0); }
  // front signboard (generic camp name) + flags
  const sign = signTex([{ text: 'ค่ายมวยไทย หาดใหญ่', font: 'bold 70px "Noto Sans Thai",sans-serif' }, { text: '合艾泰拳館 · HAT YAI MUAY THAI CAMP', font: 'bold 40px "Noto Sans TC",sans-serif' }], { w: 1024, h: 200, bg: '#b81c24', fg: '#ffd84a', border: '#ffd84a' });
  const sm = new THREE.MeshStandardMaterial({ map: sign, emissiveMap: sign, emissive: 0xffffff, emissiveIntensity: 0.4 }); ctx.signMats.push(sm);
  const sp = add(new THREE.PlaneGeometry(14, 2.7), sm, 0, 7.2, D / 2 + 0.25); sp.castShadow = false;
  add(new THREE.BoxGeometry(14.4, 3.0, 0.2), std(0x2a2a2a), 0, 7.2, D / 2 + 0.1);
  const flagT = canvasTex(96, 64, (g, w, h) => { ['#a51931', '#f4f5f8', '#2d2a4a', '#2d2a4a', '#f4f5f8', '#a51931'].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * h / 6, w, h / 6 + 1); }); }, { clamp: true });
  for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.05, 0.05, 5, 6), std(0xdddddd), s * 9, 2.5, D / 2 + 1.5); add(new THREE.PlaneGeometry(1.8, 1.2), new THREE.MeshStandardMaterial({ map: flagT, side: THREE.DoubleSide }), s * 9 + 0.9, 4.4, D / 2 + 1.5); }
  // ---- ring ----
  const R = new THREE.Group(); R.position.set(-3, 0, 0); G.add(R); const radd = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; R.add(o); return o; };
  radd(new THREE.BoxGeometry(2 * HALF + 1.2, RING_H, 2 * HALF + 1.2), std(0x1a1a1e), 0, RING_H / 2, 0);
  const canvas = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#1d4fb8'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 10; g.strokeRect(20, 20, w - 40, h - 40); g.fillStyle = 'rgba(255,255,255,.85)'; g.font = 'bold 54px "Noto Sans Thai",sans-serif'; g.textAlign = 'center'; g.fillText('มวยไทย', w / 2, h / 2 - 10); g.font = 'bold 34px sans-serif'; g.fillText('HAT YAI', w / 2, h / 2 + 40); g.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 60; i++) g.fillRect(Math.random() * w, Math.random() * h, 30, 2); }, { clamp: true });
  const mat = radd(new THREE.BoxGeometry(2 * HALF + 1.2, 0.06, 2 * HALF + 1.2), new THREE.MeshStandardMaterial({ map: canvas, roughness: 0.75 }), 0, RING_H + 0.03, 0);
  const postCols = [0xd8283a, 0xf2f2ee, 0x1d4fb8, 0xf2f2ee]; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b], i) => radd(new THREE.CylinderGeometry(0.1, 0.1, 1.5, 12), std(postCols[i], { roughness: 0.4 }), a * (HALF + 0.3), RING_H + 0.75, b * (HALF + 0.3)));
  const ropeCols = [0xd8283a, 0xf2f2ee, 0x1d4fb8, 0xf2c42a];
  for (let k = 0; k < 4; k++) { const y = RING_H + 0.4 + k * 0.33, L = 2 * (HALF + 0.3); for (const [px, pz, ry] of [[0, HALF + 0.3, 0], [0, -HALF - 0.3, 0], [HALF + 0.3, 0, Math.PI / 2], [-HALF - 0.3, 0, Math.PI / 2]]) { const r = radd(new THREE.CylinderGeometry(0.03, 0.03, L, 8), std(ropeCols[k], { roughness: 0.35 }), px, y, pz); r.rotation.set(0, ry, Math.PI / 2); } }
  // ---- equipment: heavy bags, tyres, benches, fans, lamps ----
  const bags = []; const bagM = new THREE.MeshPhysicalMaterial({ color: 0x7a1a1a, roughness: 0.35, clearcoat: 0.5 });
  for (let i = 0; i < 7; i++) { const bx = 6 + (i % 4) * 2.2, bz = -6 + Math.floor(i / 4) * 5; const bag = add(new THREE.CapsuleGeometry(0.22, 1.1, 6, 14), i % 3 ? bagM : std(0x1a1a1a, { roughness: 0.4 }), bx, 2.3, bz); const ch = add(new THREE.CylinderGeometry(0.01, 0.01, 2.3, 4), steel, bx, 4.9, bz); bags.push(bag); }
  for (let i = 0; i < 5; i++) { const t = add(new THREE.TorusGeometry(0.42, 0.16, 10, 20), std(0x1a1a1a, { roughness: 0.9 }), 10 + (i % 2) * 1.1, 0.48, 6 + i * 0.4); t.rotation.x = Math.PI / 2 * (i % 2); }
  for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(4, 0.45, 0.6), std(0x6a4a2a), -12 + i * 0.1, 0.55, -7 + i * 4.5, Math.PI / 2);
  for (let i = 0; i < 6; i++) { const lp = add(new THREE.BoxGeometry(1.6, 0.08, 0.2), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 }), -12 + i * 4.5, 5.9, 0); }
  const keyL = new THREE.PointLight(0xfff2dc, 60, 22, 1.4); keyL.position.set(-3, 5.6, 0); G.add(keyL);
  // spectators around the ring, trainers at the corners
  G.updateMatrixWorld();
  const toW = (x, z) => { const v = new THREE.Vector3(x, 0, z); G.localToWorld(v); return v; };
  for (let i = 0; i < 46; i++) { const a = rnd() * Math.PI * 2, r = 5.2 + rnd() * 2.2; const v = toW(-3 + Math.cos(a) * r, Math.sin(a) * r * 0.9); const k = ctx.people.add(v.x, 0.3, v.z, 1, undefined, 0.25, 3.5); if (k >= 0) ctx.people.items[k].rot = Math.atan2(-Math.cos(a), -Math.sin(a)) + yaw; }
  for (const [x, z] of [[-3 - HALF - 0.9, -HALF - 0.9], [-3 + HALF + 0.9, HALF + 0.9]]) { const v = toW(x, z); ctx.people.add(v.x, 0.3, v.z, 1, new THREE.Color(0xd8283a)); }
  const c0 = toW(-W / 2, -D / 2), c1 = toW(W / 2, D / 2), c2 = toW(W / 2, -D / 2), c3 = toW(-W / 2, D / 2);
  // only the back & side walls collide (front is open so the walker can step in)
  FOOTPRINTS.push([[c0.x, c0.z], [c2.x, c2.z], [toW(W / 2, -D / 2 + 0.5).x, toW(W / 2, -D / 2 + 0.5).z], [toW(-W / 2, -D / 2 + 0.5).x, toW(-W / 2, -D / 2 + 0.5).z]]);
  const glow = new GlowSet('lamp', 60); ctx.glowSets.push(glow); const fr = toW(0, D / 2 + 0.5); glow.add(fr.x, 7.2, fr.z, 26, new THREE.Color('#ffcf80')); glow.build(scene);
  ctx.update.push((dt, t, S) => { glow.mat.uniforms.uInt.value = 0.1 + S.win; bags.forEach((b, i) => { b.rotation.z = Math.sin(t * 1.3 + i) * 0.03; }); });
  const entrance = toW(0, D / 2 + 4);
  ctx.gym = { group: G, ring: R, yaw, entrance, x: GYM.x, z: GYM.z };
  return ctx.gym;
}

// =====================================================================
export class MuayThaiBout {
  constructor(ctx, camera) {
    this.ctx = ctx; this.camera = camera; this.active = false; this.music = new ThaiMusic();
    const gym = ctx.gym; this.gym = gym;
    this.A = new Fighter({ shorts: 0x1d4fb8, trim: 0xffffff, gloves: 0x1d4fb8, text: 'มวยไทย', skin: 0xc8946a });
    this.B = new Fighter({ shorts: 0xd8283a, trim: 0xf2c42a, gloves: 0xd8283a, text: 'หาดใหญ่', skin: 0xa8744e });
    for (const f of [this.A, this.B]) { f.group.visible = false; gym.ring.add(f.group); f.group.position.y = RING_H + 0.06; }
    this.A.group.rotation.y = Math.PI / 2; this.B.group.rotation.y = -Math.PI / 2;
    this.flash = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); gym.ring.add(this.flash);
    this.el = document.getElementById('mt-hud'); this.keys = {};
    addEventListener('keydown', (e) => { if (!this.active) return; this.keys[e.code] = true; this.onKey(e.code); if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.code)) e.preventDefault(); });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    this.el.querySelectorAll('[data-m]').forEach(b => { const m = b.dataset.m;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (m === 'block' || m === 'fwd' || m === 'back') this.keys['btn_' + m] = true; else this.playerMove(m); });
      const up = () => { this.keys['btn_' + m] = false; }; b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up); });
    this.el.querySelector('.mt-exit').onclick = () => this.stop();
    this.el.querySelector('.mt-again').onclick = () => this.start();
  }
  onKey(c) { const map = { KeyJ: 'jab', KeyK: 'cross', KeyL: 'kick', KeyI: 'knee', KeyU: 'teep', KeyO: 'elbow' }; if (map[c]) this.playerMove(map[c]); if (c === 'Escape') this.stop(); }
  start() {
    audioUnlock(); this.active = true; this.el.classList.add('on'); this.el.classList.remove('over');
    for (const f of [this.A, this.B]) { f.group.visible = true; f.hp = 100; f.move = null; f.hitT = 0; f.block = false; f.cool = 0; f.ko = false; }
    this.A.x = -1.5; this.B.x = 1.5; this.time = 90; this.phase = 'wai'; this.phaseT = 2.8; this.shake = 0; this.aiT = 1.0;
    this.banner('ไหว้ครู · 拜師禮 Wai Kru'); this.music.start({ root: 392, bpm: 168, seed: 3 }); this.updateBars();
  }
  stop() { this.active = false; this.el.classList.remove('on'); this.music.stop(); for (const f of [this.A, this.B]) f.group.visible = false; this.onExit && this.onExit(); }
  banner(t, sticky) { const b = this.el.querySelector('.mt-banner'); b.textContent = t; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); if (!sticky) { clearTimeout(this._bt); this._bt = setTimeout(() => b.classList.remove('show'), 1400); } }
  updateBars() { this.el.querySelector('.mt-hpA i').style.width = Math.max(0, this.A.hp) + '%'; this.el.querySelector('.mt-hpB i').style.width = Math.max(0, this.B.hp) + '%'; this.el.querySelector('.mt-time').textContent = Math.ceil(Math.max(0, this.time)); }
  playerMove(m) { if (this.phase === 'fight') this.doMove(this.A, m); }
  doMove(f, m) { if (f.move || f.hitT > 0 || f.ko) return; f.move = { name: m, t: 0, done: false }; f.block = false; }
  sound(kind) { try { const ac = audioUnlock(); const t = ac.currentTime; const n = ac.createBufferSource(), buf = ac.createBuffer(1, ac.sampleRate * 0.15, ac.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, kind === 'block' ? 6 : 3); n.buffer = buf; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = kind === 'block' ? 900 : 2400; const g = ac.createGain(); g.gain.value = kind === 'block' ? 0.4 : 0.8; n.connect(f); f.connect(g); g.connect(ac.destination); n.start(t); } catch (e) {} }
  resolve(att, def) {
    const mv = MOVES[att.move.name], dist = Math.abs(att.x - def.x);
    if (dist > mv.reach + 0.12 || def.ko) return;
    const blocked = def.block && !def.move; const dmg = blocked ? mv.dmg * 0.2 : mv.dmg;
    def.hp -= dmg; this.sound(blocked ? 'block' : 'hit');
    if (!blocked) { def.hitT = 0.28; def.move = null; this.shake = 0.18; }
    const dir = Math.sign(def.x - att.x); def.x += dir * (mv.push ? mv.push : blocked ? 0.06 : 0.15);
    this.flash.position.set((att.x + def.x) / 2 + dir * 0.2, RING_H + (att.move.name === 'kick' ? 1.0 : att.move.name === 'knee' ? 1.05 : 1.5), 0); this.flash.material.opacity = blocked ? 0.4 : 1; this.flash.scale.setScalar(blocked ? 0.8 : 1.4);
    if (!blocked) this.banner(mv.name);
    if (def.hp <= 0) { def.hp = 0; def.ko = true; this.phase = 'over'; this.phaseT = 99; this.banner(def === this.B ? '🏆 KO！你贏了 ชนะ' : 'KO… 你輸了', true); this.el.classList.add('over'); }
    this.updateBars();
  }
  stepFighter(f, other, dt) {
    if (f.ko) { f.blend(POSES.ko, Math.min(1, dt * 5)); return; }
    if (this.phase === 'wai') { f.blend(POSES.wai, Math.min(1, dt * 3)); return; }
    if (this.phase === 'over') { f.blend(POSES.win, Math.min(1, dt * 4)); return; }
    if (f.hitT > 0) { f.hitT -= dt; f.blend(POSES.hit, Math.min(1, dt * 18)); return; }
    if (f.move) { const mv = MOVES[f.move.name]; const prev = f.move.t; f.move.t += dt; f.blend(samplePose(mv.keys, f.move.t), Math.min(1, dt * 24));
      if (!f.move.done && prev < mv.hit && f.move.t >= mv.hit) { f.move.done = true; this.resolve(f, other); }
      if (f.move && f.move.t >= mv.keys[mv.keys.length - 1][0]) f.move = null; return; }
    f.blend(f.block ? POSES.block : POSES.stance, Math.min(1, dt * 14));
    // Muay Thai rhythm: slow bounce on the lead leg
    f.j.root.position.y += Math.abs(Math.sin(this.clock * 3.2 + (f === this.A ? 0 : 1))) * 0.025;
  }
  update(dt) {
    if (!this.active) return; this.clock = (this.clock || 0) + dt; const A = this.A, B = this.B;
    if (this.phase === 'wai') { this.phaseT -= dt; if (this.phaseT <= 0) { this.phase = 'fight'; this.banner('ชก! FIGHT!'); } }
    if (this.phase === 'fight') {
      this.time -= dt; if (this.time <= 0) { this.phase = 'over'; this.el.classList.add('over'); this.banner(A.hp > B.hp ? '🏆 判定勝 你贏了' : A.hp < B.hp ? '判定負 你輸了' : '平手 DRAW', true); }
      const k = this.keys; A.block = !!(k.KeyS || k.ArrowDown || k.btn_block) && !A.move;
      const mv = ((k.KeyD || k.ArrowRight || k.btn_fwd) ? 1 : 0) - ((k.KeyA || k.ArrowLeft || k.btn_back) ? 1 : 0);
      if (!A.move && A.hitT <= 0 && !A.block) A.x += mv * dt * 1.6;
      // CPU opponent
      this.aiT -= dt; const d = B.x - A.x;
      if (!B.move && B.hitT <= 0) {
        if (A.move && !A.move.done && Math.random() < dt * 4) B.block = true; else if (B.block && Math.random() < dt * 1.5) B.block = false;
        if (!B.block) { if (d > 1.35) B.x -= dt * 1.2; else if (d < 0.7) B.x += dt * 0.9; }
        if (this.aiT <= 0 && !B.block) { this.aiT = 0.6 + Math.random() * 0.9; const opts = d > 1.25 ? ['teep', 'kick', 'cross'] : d > 0.95 ? ['jab', 'cross', 'kick', 'jab'] : ['knee', 'elbow', 'knee', 'jab']; this.doMove(B, opts[Math.floor(Math.random() * opts.length)]); }
      }
      A.x = Math.max(-HALF + 0.4, Math.min(A.x, B.x - 0.6)); B.x = Math.min(HALF - 0.4, Math.max(B.x, A.x + 0.6));
    }
    this.stepFighter(A, B, dt); this.stepFighter(B, A, dt);
    A.group.position.x = A.x; B.group.position.x = B.x;
    this.flash.material.opacity = Math.max(0, this.flash.material.opacity - dt * 5); this.flash.scale.multiplyScalar(1 + dt * 3);
    // fighting-game side camera
    const mid = (A.x + B.x) / 2, span = Math.abs(B.x - A.x); this.shake = Math.max(0, this.shake - dt);
    const cam = new THREE.Vector3(mid, RING_H + 1.75, 3.9 + span * 0.6), look = new THREE.Vector3(mid, RING_H + 1.05, 0);
    this.gym.ring.localToWorld(cam); this.gym.ring.localToWorld(look);
    if (this.shake > 0) { cam.x += (Math.random() - 0.5) * this.shake * 0.4; cam.y += (Math.random() - 0.5) * this.shake * 0.4; }
    this.camera.position.lerp(cam, Math.min(1, dt * 6)); this.camera.lookAt(look); this.camera.fov += (48 - this.camera.fov) * Math.min(1, dt * 4);
    this.updateBars();
    return look;
  }
}
