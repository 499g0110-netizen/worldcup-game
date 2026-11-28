import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DATA, ribbon, ribGeo, groundY } from './world.js';
import { clamp, mulberry32, signTex, canvasTex, pca, glowTex, smooth } from './util.js';
import { GlowSet } from './props.js';
import { Humans } from './life.js';
import { waterPatch } from './world.js';

const C = (h) => new THREE.Color(h);
const ring = (p) => (p.length > 3 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1]) ? p.slice(0, -1) : p;
const stdMat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8 }, o));

// =====================================================================
//  KHLONG HAE FLOATING MARKET  (OSM: ตลาดน้ำคลองแห)
// =====================================================================
export const FM = { cx: 240, cz: -4460, zb: -4454 };
export function buildFloatingMarket(ctx) {
  const { scene, people } = ctx; const rnd = mulberry32(555);
  const { cx, zb } = FM;
  const warm = C('#ffb867'), white = C('#fff6e6'), cool = C('#cfe4ff');
  const glow = new GlowSet('lamp', 80); ctx.glowSets.push(glow);

  // water (south of the boardwalk) – extends the OSM Khlong Hae stream through the market
  const wnm = ctx.waterNormal.clone(); wnm.needsUpdate = true; wnm.repeat.set(22, 3);
  const wmat = ctx.waterMat.clone(); wmat.onBeforeCompile = waterPatch; wmat.customProgramCacheKey = () => 'water2'; wmat.normalMap = wnm; wmat.normalScale = new THREE.Vector2(0.22, 0.22); wmat.roughness = 0.1;
  const wat = new THREE.Mesh(new THREE.PlaneGeometry(900, 70), wmat); wat.rotation.x = -Math.PI / 2; wat.position.set(cx + 40, 0.06, zb + 35); wat.receiveShadow = true; scene.add(wat);

  // boardwalk deck (wood planks)
  const plank = canvasTex(128, 128, (g, w, h) => { for (let i = 0; i < 8; i++) { const v = 90 + Math.random() * 40; g.fillStyle = `rgb(${v + 20},${v},${v - 28})`; g.fillRect(0, i * 16, w, 15); } g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 8; i++) g.fillRect(0, i * 16 + 15, w, 1); });
  plank.repeat.set(30, 2);
  const deckM = new THREE.MeshStandardMaterial({ map: plank, roughness: 0.75 });
  (ctx.walkDecks = ctx.walkDecks || []).push([cx - 85, cx + 85, zb - 12.2, zb - 0.2, 1.3]);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(170, 0.3, 12), deckM); deck.position.set(cx, 1.15, zb - 6.2); deck.receiveShadow = true; deck.castShadow = true; scene.add(deck);
  const pil = new THREE.CylinderGeometry(0.16, 0.16, 2.6, 6), pilI = new THREE.InstancedMesh(pil, stdMat(0x4a3826), 58), m4 = new THREE.Matrix4();
  for (let i = 0; i < 58; i++) { m4.makeTranslation(cx - 84 + i * 2.95, 0.2, zb + 0.1); pilI.setMatrixAt(i, m4); } scene.add(pilI);
  // soft ground behind (packed earth / lawn path)
  const back = new THREE.Mesh(new THREE.BoxGeometry(190, 0.2, 40), stdMat(0x3a2f22, { roughness: 1 })); back.position.set(cx, 0.4, zb - 31); back.receiveShadow = true; scene.add(back);

  // thatched stalls + lights
  const B = ctx.batches.at(cx, zb - 20);
  for (let i = 0; i < 28; i++) {
    const x = cx - 80 + i * 5.9, z = zb - 20.5;
    B.box(x, z, 5.0, 5.0, 0, 0.5, 2.4, { style: 6, color: C(i % 3 ? '#8a6a44' : '#a78152'), seed: rnd(), roof: false });
    B.gable(x, z, 5.0, 5.0, Math.PI / 2, 2.9, 2.0, C('#a98a52').multiplyScalar(0.8 + rnd() * 0.3), rnd(), 0.8);
    glow.add(x, 2.3, z + 2.6, 6, warm);
  }
  // boardwalk lamp posts (white globes) every ~9 m along the edge
  const globe = new THREE.SphereGeometry(0.34, 12, 8), gMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d6, emissiveIntensity: 1.2 }); ctx.nightMats.push({ mat: gMat, base: 0.6, k: 3.0 });
  for (let i = 0; i < 19; i++) {
    const x = cx - 82 + i * 9.2; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.4, 6), stdMat(0x2a2a2a)); p.position.set(x, 3.3, zb - 0.9); scene.add(p);
    const g = new THREE.Mesh(globe, gMat); g.position.set(x, 5.6, zb - 0.9); scene.add(g); glow.add(x, 5.6, zb - 0.9, 22, white);
    const g2 = new THREE.Mesh(globe, gMat); g2.position.set(x + 0.9, 5.2, zb - 0.9); scene.add(g2); glow.add(x + 0.9, 5.2, zb - 0.9, 14, white);
  }
  // bunting
  { const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.5, 0, 0, 0.25, -0.5, 0], 3)); tri.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    const flags = new THREE.InstancedMesh(tri, new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }), 520); const fc = ['#2a63c8', '#f2f2f0', '#e0508a', '#2a63c8', '#ffd24a'];
    let k = 0; const c = new THREE.Color();
    for (const zz of [zb - 4.5, zb - 9.5]) for (let i = 0; i < 260; i++) { const x = cx - 84 + i * 0.65, sag = Math.sin(((i % 18) / 18) * Math.PI) * 0.7; m4.makeTranslation(x, 4.8 - sag, zz); flags.setMatrixAt(k, m4); c.set(fc[i % fc.length]); flags.setColorAt(k, c); k++; }
    flags.count = k; flags.frustumCulled = false; scene.add(flags); }

  // boats
  {
    const hull = new THREE.BoxGeometry(1.15, 0.55, 5.6); hull.translate(0, 0.28, 0);
    const bn = hull.attributes.position; for (let i = 0; i < bn.count; i++) { const z = bn.getZ(i); if (Math.abs(z) > 2.6) bn.setX(i, bn.getX(i) * 0.25); }
    const hullI = new THREE.InstancedMesh(hull, new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 }), 64);
    const umbG = new THREE.ConeGeometry(1.5, 0.75, 12, 1, true); umbG.translate(0, 2.2, 0);
    const umbI = new THREE.InstancedMesh(umbG, new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide }), 64);
    const crate = new THREE.BoxGeometry(0.7, 0.45, 0.7), crI = new THREE.InstancedMesh(crate, stdMat(0xd8d2c2), 128);
    const hp = ['#c8281e', '#1f8a4c', '#1d5fb8', '#e8a31d', '#efefe8', '#e0508a'], up = ['#1d5fb8', '#17a0a0', '#e8742a', '#efefe8', '#d02a5a'];
    const c = new THREE.Color(), q = new THREE.Quaternion(); let ci = 0, ui = 0;
    for (let i = 0; i < 64; i++) {
      const row = i % 2, x = cx - 82 + Math.floor(i / 2) * 5.1 + rnd() * 0.8, z = zb + 1.9 + row * 2.6 + rnd() * 0.4, yaw = Math.PI / 2 + (rnd() - 0.5) * 0.12;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw); m4.compose(new THREE.Vector3(x, 0.05, z), q, new THREE.Vector3(1, 1, 1)); hullI.setMatrixAt(i, m4); c.set(hp[i % hp.length]); hullI.setColorAt(i, c);
      if (rnd() < 0.7) { m4.compose(new THREE.Vector3(x, 0.05, z), q, new THREE.Vector3(1, 1, 1)); umbI.setMatrixAt(ui, m4); c.set(up[Math.floor(rnd() * up.length)]); umbI.setColorAt(ui, c); ui++; glow.add(x, 2.0, z, 4, warm); }
      for (let k = 0; k < 2; k++) { m4.compose(new THREE.Vector3(x + (rnd() - 0.5) * 0.3, 0.55, z + (rnd() - 0.5) * 3), q, new THREE.Vector3(1, 1, 1)); crI.setMatrixAt(ci++, m4); }
      people.add(x, 0.4, z + 1.1, 0.95);
    }
    umbI.count = ui; crI.count = ci;
    for (const mm of [hullI, umbI, crI]) { mm.frustumCulled = false; mm.castShadow = true; scene.add(mm); }
  }
  // crowd on the boardwalk
  for (let i = 0; i < 640; i++) people.add(cx - 82 + rnd() * 164, 1.3, zb - 1.2 - rnd() * 10.5, 1);
  // trees: far (north) bank and across the water – dark silhouettes against the sunset
  ctx.extraTrees = ctx.extraTrees || [];
  for (let i = 0; i < 90; i++) ctx.extraTrees.push([cx - 160 + rnd() * 380, zb - 44 - rnd() * 40, 1.6 + rnd() * 1.6]);
  for (let i = 0; i < 70; i++) ctx.extraTrees.push([cx - 200 + rnd() * 480, zb + 78 + rnd() * 80, 1.8 + rnd() * 1.8]);
  for (let i = 0; i < 26; i++) ctx.extraTrees.push([cx - 100 + i * 8 + rnd() * 3, zb - 44 + rnd() * 3, 1.8 + rnd()]);
  buildRowboats(ctx, cx, zb);
  glow.build(scene);
  ctx.update.push((dt, t, S) => { glow.mat.uniforms.uInt.value = 0.1 + 1.0 * S.win + 0.5 * (1 - Math.abs(S.win - 0.5) * 2) * 0; wnm.offset.x += dt * 0.004; wnm.offset.y += dt * 0.002; });
}

// ---- rowing boats with oarsmen (Thai ngob hats), wakes rippling outward ----
function buildRowboats(ctx, cx, zb) {
  const { scene } = ctx; const rnd = mulberry32(4711); const N = 12;
  const hull = new THREE.BoxGeometry(1.0, 0.45, 6.2); hull.translate(0, 0.2, 0);
  const bn = hull.attributes.position; for (let i = 0; i < bn.count; i++) { const z = bn.getZ(i); if (Math.abs(z) > 2.9) { bn.setX(i, bn.getX(i) * 0.2); bn.setY(i, bn.getY(i) + 0.25); } }
  hull.computeVertexNormals();
  const hulls = new THREE.InstancedMesh(hull, new THREE.MeshStandardMaterial({ roughness: 0.55 }), N);
  const oarG = new THREE.BoxGeometry(0.06, 0.06, 2.8); oarG.translate(0, 0, -1.1); const oars = new THREE.InstancedMesh(oarG, new THREE.MeshStandardMaterial({ color: 0x5a3c22, roughness: 0.8 }), N);
  const hatG = new THREE.ConeGeometry(0.36, 0.2, 14); const hats = new THREE.InstancedMesh(hatG, new THREE.MeshStandardMaterial({ color: 0xd8bb7a, roughness: 0.9 }), N);
  const rowers = new Humans(ctx, N);
  const ringG = new THREE.RingGeometry(0.9, 1.0, 40); ringG.rotateX(-Math.PI / 2);
  const RN = 160; const rings = new THREE.InstancedMesh(ringG, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), RN);
  const ringState = Array.from({ length: RN }, () => ({ x: 0, z: 0, age: 99 })); let rhead = 0;
  const cols = ['#c8281e', '#1f8a4c', '#1d5fb8', '#e8a31d', '#6b3a1e', '#e0508a'], col = new THREE.Color();
  const boats = [];
  for (let i = 0; i < N; i++) {
    const b = { x: cx - 220 + rnd() * 460, z: zb + 9 + rnd() * 22, v: (0.8 + rnd() * 0.7) * (rnd() < 0.5 ? 1 : -1), rate: 2.0 + rnd() * 0.6, ph: rnd() * 6.28, emit: rnd() };
    b.ri = rowers.add(0, 0, 0, 1, new THREE.Color().setHSL(rnd(), 0.4, 0.3), 1.0, b.rate, 1);
    col.set(cols[i % cols.length]); hulls.setColorAt(i, col); boats.push(b);
  }
  rowers.finalize();
  for (const m of [hulls, oars, hats, rings]) { m.frustumCulled = false; scene.add(m); }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0), ax = new THREE.Vector3(1, 0, 0);
  ctx.update.push((dt, t, S) => {
    rowers.update(t);
    boats.forEach((b, i) => {
      const stroke = Math.max(0, Math.sin(t * b.rate + b.ph));          // surge on each stroke
      b.x += b.v * dt * (0.6 + 0.8 * stroke); if (b.x > cx + 260) b.x = cx - 220; if (b.x < cx - 220) b.x = cx + 260;
      const yaw = b.v > 0 ? Math.PI / 2 : -Math.PI / 2, bob = Math.sin(t * 1.7 + i) * 0.04, roll = Math.sin(t * 1.3 + i * 2) * 0.03;
      Q.setFromAxisAngle(up, yaw).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll));
      M.compose(V.set(b.x, 0.02 + bob, b.z), Q, S1); hulls.setMatrixAt(i, M);
      const dir = Math.sign(b.v), sx = b.x - dir * 1.6;                 // rower sits at the stern
      M.compose(V.set(sx, -0.42 + bob, b.z), new THREE.Quaternion().setFromAxisAngle(up, yaw), S1); rowers.mesh.setMatrixAt(b.ri, M);
      M.compose(V.set(sx, 1.33 + bob, b.z), new THREE.Quaternion(), S1); hats.setMatrixAt(i, M);
      const a = Math.sin(t * b.rate + b.ph) * 0.55;
      Q.setFromAxisAngle(up, yaw + Math.PI / 2 * 0).multiply(new THREE.Quaternion().setFromAxisAngle(ax, 0.55 + a * 0.35)).multiply(new THREE.Quaternion().setFromAxisAngle(up, a));
      M.compose(V.set(sx + dir * 0.4, 0.95 + bob, b.z + 0.45), Q, S1); oars.setMatrixAt(i, M);
      b.emit -= dt; if (b.emit <= 0) { b.emit = 0.7; const r = ringState[rhead]; rhead = (rhead + 1) % RN; r.x = b.x - dir * 3.2; r.z = b.z; r.age = 0; }
    });
    ringState.forEach((r, k) => {
      r.age += dt; const life = 5.5, a = Math.min(1, r.age / life), s = 0.8 + a * 7.5;
      M.compose(V.set(r.x, 0.09, r.z), new THREE.Quaternion(), new THREE.Vector3(s, 1, s * 0.8)); rings.setMatrixAt(k, M);
      const f = r.age > life ? 0 : (1 - a) * (1 - a) * (0.18 + 0.25 * (1 - S.win)); col.setRGB(f, f, f * 1.05); rings.setColorAt(k, col);
    });
    for (const m of [hulls, oars, hats, rings, rowers.mesh]) m.instanceMatrix.needsUpdate = true; rings.instanceColor.needsUpdate = true;
  });
}

// =====================================================================
//  MUNICIPAL PARK hill
// =====================================================================
export function buildPark(ctx) {
  const { scene } = ctx; const rnd = mulberry32(808);
  const poly = DATA.blds.find(b => b.n.includes('สวนสาธารณะเทศบาล')); const c = poly ? pca(ring(poly.p)) : { cx: 3880, cz: -4026 };
  const clk = DATA.pois.find(p => p.n === 'หอนาฬิกา' || p.n === 'Hat Yai Clock Tower' && p.p[0] > 1000);
  const hillC = [4330, -3900];
  ctx.extraTrees = ctx.extraTrees || [];
  for (let i = 0; i < 2600; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 1250, tx = hillC[0] + Math.cos(a) * r, tz = hillC[1] + Math.sin(a) * r * 0.8; if (Math.hypot(tx - 4300, tz + 3860) < 120 || Math.hypot(tx - 4950, tz + 4370) < 95) continue; ctx.extraTrees.push([tx, tz, 1.6 + rnd() * 1.8]); }
  // winding road up the hill with lamps
  const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * 5.2 - 0.6, r = 700 - t * 560; pts.push([hillC[0] + Math.cos(a) * r, hillC[1] + Math.sin(a) * r * 0.85]); }
  const o = { pos: [], uv: [], idx: [] }; ribbon(pts, 7, (x, z) => groundY(x, z) + 0.15, 24, o);
  const mat = ctx.roadMats.minor; const mesh = new THREE.Mesh(ribGeo(o), mat); mesh.receiveShadow = true; mesh.frustumCulled = false; scene.add(mesh);
  const glow = new GlowSet('lamp', 90); ctx.glowSets.push(glow); const warm = C('#ffb25a');
  pts.forEach((p, i) => { if (i % 2 === 0) glow.add(p[0] + 4, groundY(p[0], p[1]) + 7, p[1], 7, warm); });
  // summit: Phra Phutthamongkhon Maharat (พระพุทธมงคลมหาราช) – standing golden Buddha, as in the reference photo
  const bx = 4328, bz = -3868, by = groundY(bx, bz) + 0.5;
  buildBuddhaComplex(ctx, bx, by, bz, glow);
  ctx.park = { x: bx, y: by, z: bz, top: by + 40 };
  glow.build(scene);
  ctx.update.push((dt, t, S) => { glow.mat.uniforms.uInt.value = 0.1 + 1.0 * S.win; });
}

// =====================================================================
//  HAT YAI INTERNATIONAL AIRPORT (HDY)
// =====================================================================
export function buildAirport(ctx) {
  const { scene } = ctx; const rnd = mulberry32(31337);
  const ad = DATA.aero.find(a => a.t === 'aerodrome'), tm = DATA.aero.find(a => a.t === 'terminal');
  const P = pca(ad.p); const th = P.th; const ux = Math.cos(th), uz = Math.sin(th), vx = -uz, vz = ux;
  const rv = 140;                                    // runway lateral offset (south of terminal)
  const cx = P.cx + vx * rv, cz = P.cz + vz * rv;
  const A = (u, v, h = 0) => new THREE.Vector3(cx + ux * u + vx * v, h, cz + uz * u + vz * v);
  const yaw = Math.atan2(ux, uz);
  const glowRW = new GlowSet('airport', 60), glowTW = new GlowSet('airport', 30); ctx.glowSets.push(glowRW, glowTW);
  const white = C('#ffffff'), amber = C('#ffb347'), green = C('#2dff6a'), redc = C('#ff2a1a'), blue = C('#3a7bff');

  // airfield ground
  { const sh = new THREE.Shape(ring(ad.p).map(p => new THREE.Vector2(p[0], -p[1]))); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, stdMat(0x3f6a2a, { roughness: 1 })); m.position.y = 0.04; m.receiveShadow = true; m.material.polygonOffset = true; m.material.polygonOffsetFactor = -1; m.material.polygonOffsetUnits = -1; scene.add(m); }
  // runway 08/26 (3,050 m x 45 m)
  const RL = 3050, RW = 45;
  const rwTex = canvasTex(512, 4096, (g, w, h) => {
    g.fillStyle = '#2f2f32'; g.fillRect(0, 0, w, h);
    const id = g.getImageData(0, 0, w, h); for (let i = 0; i < id.data.length; i += 4) { const n = (Math.random() - 0.5) * 18; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; } g.putImageData(id, 0, 0);
    g.fillStyle = 'rgba(15,15,16,.35)'; for (let i = 0; i < 70; i++) g.fillRect(w * 0.3 + Math.random() * 40, Math.random() * h, 60, 90 + Math.random() * 200);
    g.fillStyle = '#e9e9e4'; g.fillRect(w * 0.5 - 4, 0, 8, h); // placeholder removed below
    g.fillStyle = '#2f2f32'; for (let y = 160; y < h - 160; y += 170) g.fillRect(w * 0.5 - 6, y + 90, 12, 80);
    // thresholds & edge lines
    g.fillStyle = '#e9e9e4'; g.fillRect(w * 0.025, 0, 6, h); g.fillRect(w * 0.975 - 6, 0, 6, h);
    for (const y0 of [60, h - 60 - 110]) for (let i = 0; i < 8; i++) { g.fillRect(w * 0.12 + i * 38, y0, 18, 110); }
    for (const y0 of [330, h - 330 - 70]) { g.fillRect(w * 0.34, y0, 24, 70); g.fillRect(w * 0.62, y0, 24, 70); }
    g.save(); g.font = 'bold 120px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#e9e9e4'; g.translate(w / 2, 600); g.scale(1, -1); g.fillText('08', 0, 0); g.restore();
    g.save(); g.font = 'bold 120px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#e9e9e4'; g.translate(w / 2, h - 600); g.rotate(Math.PI); g.scale(1, -1); g.fillText('26', 0, 0); g.restore();
  });
  const rwG = new THREE.PlaneGeometry(RW, RL); rwG.rotateX(-Math.PI / 2);
  const rw = new THREE.Mesh(rwG, new THREE.MeshStandardMaterial({ map: rwTex, roughness: 0.55, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  rw.position.copy(A(0, 0, 0.1)); rw.position.y = 0.1; rw.rotation.y = yaw + Math.PI / 2 * 0 + Math.PI / 2; rw.rotation.y = Math.atan2(ux, uz); // plane length (local z) along runway
  rw.receiveShadow = true; scene.add(rw);
  // lights: edge, centreline, threshold, approach
  for (let u = -RL / 2; u <= RL / 2; u += 60) { for (const v of [-RW / 2 - 1.5, RW / 2 + 1.5]) { const p = A(u, v, 0.5); glowRW.add(p.x, 0.5, p.z, 2.4, (u < -RL / 2 + 600 || u > RL / 2 - 600) ? amber : white); } const c = A(u, 0, 0.3); glowRW.add(c.x, 0.3, c.z, 1.6, white); }
  for (let i = -4; i <= 4; i++) { for (const u of [-RL / 2 - 1.5, RL / 2 + 1.5]) { const p = A(u, i * 4.5, 0.5); glowRW.add(p.x, 0.5, p.z, 3, u < 0 ? green : redc); } }
  for (let k = 1; k <= 28; k++) for (const sgn of [-1, 1]) { const p = A(sgn * (RL / 2 + 30 * k + 2), 0, 1); glowRW.add(p.x, 1, p.z, k % 3 ? 3.5 : 5, white); for (const dv of [-6, 6]) if (k % 4 === 0) { const q2 = A(sgn * (RL / 2 + 30 * k), dv, 1); glowRW.add(q2.x, 1, q2.z, 3, redc); } }
  // PAPI
  for (let i = 0; i < 4; i++) { const p = A(-RL / 2 + 300, -RW / 2 - 14 - i * 3.2, 0.8); glowRW.add(p.x, 0.8, p.z, 4, i < 2 ? redc : white); }

  // apron & taxiway
  const apronC = A(-120, -150), apron = new THREE.Mesh(new THREE.BoxGeometry(520, 0.3, 120), stdMat(0x5b5b5e, { roughness: 0.7 })); apron.position.set(apronC.x, 0.16, apronC.z); apron.rotation.y = yaw - Math.PI / 2; apron.receiveShadow = true; scene.add(apron);
  { const o = { pos: [], uv: [], idx: [] }; const tp = [A(-320, -88), A(-320, -60), A(-300, -10), A(-300, -RW / 2 + 5)].map(v => [v.x, v.z]); ribbon(tp, 23, 0.18, 30, o); ribbon([A(-80, -RW / 2 - 25).toArray().filter((_, i) => i != 1), A(300, -RW / 2 - 25).toArray().filter((_, i) => i != 1)], 23, 0.18, 30, o); const tpm = new THREE.Mesh(ribGeo(o), stdMat(0x3a3a3d, { roughness: 0.6 })); tpm.receiveShadow = true; scene.add(tpm); }
  for (let u = -90; u <= 300; u += 40) for (const v of [-RW / 2 - 25 - 12.5, -RW / 2 - 25 + 12.5]) { const p = A(u, v, 0.4); glowTW.add(p.x, 0.4, p.z, 2, blue); }

  // terminal building: OSM polygon, glass & steel roof canopy
  {
    const T = ring(tm.p).map(p => [p[0], p[1]]); const bb = { cx: 0, cz: 0 }; T.forEach(p => { bb.cx += p[0] / T.length; bb.cz += p[1] / T.length; });
    const B = ctx.batches.at(bb.cx, bb.cz);
    B.prism(T, 0, 12, { style: 1, color: C('#f2f2ee'), seed: 0.31, roofColor: C('#b8bab8') });
    const pc = pca(T), rot = Math.atan2(pc.uz, pc.ux);
    B.box(bb.cx, bb.cz, 240, 24, rot, 12, 3, { style: 6, color: C('#c5c7c8'), seed: 0.7 });
    ctx.terminal = { x: bb.cx, z: bb.cz, rot };
    const sg = signTex([{ text: 'HAT YAI INTERNATIONAL AIRPORT', font: 'bold 52px system-ui,sans-serif' }, { text: 'ท่าอากาศยานนานาชาติหาดใหญ่', font: '40px "Noto Sans Thai",system-ui,sans-serif' }], { w: 1024, h: 180, bg: '#16356a', fg: '#ffffff' });
    const smat = new THREE.MeshStandardMaterial({ map: sg, emissiveMap: sg, emissive: 0xffffff, emissiveIntensity: 0.5 }); ctx.signMats.push(smat);
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(48, 8.4), smat); const cs = ctx.terminal; sp.position.set(bb.cx + vx * 52, 19, bb.cz + vz * 52); sp.rotation.y = Math.atan2(vx, vz); scene.add(sp);
    // big rooftop lettering on the landside & airside parapets (as in the photos)
    const letters = signTex([{ text: 'ท่าอากาศยานหาดใหญ่   HAT YAI INTERNATIONAL AIRPORT', font: 'bold 64px "Noto Sans Thai",system-ui,sans-serif' }], { w: 2048, h: 128, bg: '#f2f2ee', fg: '#1a2a4a' });
    const lm = new THREE.MeshStandardMaterial({ map: letters, emissiveMap: letters, emissive: 0xffffff, emissiveIntensity: 0.2 }); ctx.signMats.push(lm); lm.userData.k = 0.4;
    for (const s of [1, -1]) { const lp = new THREE.Mesh(new THREE.PlaneGeometry(150, 5), lm); lp.position.set(bb.cx + vx * 26 * s, 15.6, bb.cz + vz * 26 * s); lp.rotation.y = Math.atan2(vx * s, vz * s); scene.add(lp); }
    // curbside canopy on the landside + gate number board
    const can = new THREE.Mesh(new THREE.BoxGeometry(200, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0xe8e8e4, roughness: 0.4, metalness: 0.3 })); can.position.set(bb.cx - vx * 32, 6.5, bb.cz - vz * 32); can.rotation.y = -rot; can.castShadow = true; scene.add(can);
    for (let i = -9; i <= 9; i++) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6.5, 10), new THREE.MeshStandardMaterial({ color: 0xc8c8c4, metalness: 0.6 })); col.position.set(bb.cx - vx * 37 + pc.ux * i * 11, 3.25, bb.cz - vz * 37 + pc.uz * i * 11); scene.add(col); }
    const g5 = signTex([{ text: '5', font: 'bold 120px system-ui' }], { w: 128, h: 128, bg: '#f2c314', fg: '#111' }); const g5m = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshStandardMaterial({ map: g5 })); g5m.position.set(bb.cx + vx * 26.2 - pc.ux * 60, 9, bb.cz + vz * 26.2 - pc.uz * 60); g5m.rotation.y = Math.atan2(vx, vz); scene.add(g5m);
    // see-through departure hall: check-in sign, shops, people
    const hallIn = new THREE.Group(); hallIn.position.set(bb.cx - vx * 18, 0, bb.cz - vz * 18); hallIn.rotation.y = -rot; scene.add(hallIn);
    const ciTex = signTex([{ text: '↑ เคาน์เตอร์เช็คอิน  Check-in  16–30', font: 'bold 52px "Noto Sans Thai",system-ui' }], { w: 1024, h: 110, bg: '#141414', fg: '#f2c314' });
    const ci = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.5), new THREE.MeshStandardMaterial({ map: ciTex, emissiveMap: ciTex, emissive: 0xffffff, emissiveIntensity: 0.9 })); ci.position.set(0, 7, -2); hallIn.add(ci);
    const shopCols = ['#e8742a', '#d0388a', '#1f8a4c', '#1d5fb8', '#c8281e'];
    for (let i = 0; i < 8; i++) { const sm = new THREE.Mesh(new THREE.BoxGeometry(9, 4.5, 6), new THREE.MeshStandardMaterial({ color: shopCols[i % 5], emissive: shopCols[i % 5], emissiveIntensity: 0.25, roughness: 0.6 })); sm.position.set(-80 + i * 22, 2.25, 4); hallIn.add(sm); }
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(200, 20), new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.15, metalness: 0.2 })); fl.rotation.x = -Math.PI / 2; fl.position.y = 0.15; hallIn.add(fl);
    for (let i = 0; i < 40; i++) ctx.people.add(bb.cx - vx * (14 + Math.random() * 8) + pc.ux * (Math.random() - 0.5) * 160, 0.15, bb.cz - vz * (14 + Math.random() * 8) + pc.uz * (Math.random() - 0.5) * 160, 1, undefined, 0.6, 4.5);
    // glow along the façade
    for (let i = -10; i <= 10; i++) { const p = new THREE.Vector3(bb.cx + pc.ux * i * 11 + vx * 46, 3, bb.cz + pc.uz * i * 11 + vz * 46); glowTW.add(p.x, 4, p.z, 10, C('#ffd9a0')); }
    // car park lamps
    for (let i = -8; i <= 8; i++) for (const k of [-1, 1]) glowTW.add(bb.cx + pc.ux * i * 20 - vx * 70 * k * 0 + (-vx) * 30 * (k + 1.5), 9, bb.cz + pc.uz * i * 20 + (-vz) * 30 * (k + 1.5), 8, C('#ffc678'));
  }
  // control tower
  { const tp = A(-420, -300); const tw = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.4, 40, 14), stdMat(0xe2e0d8)); tw.position.set(tp.x, 20, tp.z); tw.castShadow = true; scene.add(tw);
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 4.6, 5, 14), new THREE.MeshStandardMaterial({ color: 0x223a4a, roughness: 0.1, metalness: 0.7, emissive: 0xffd9a0, emissiveIntensity: 0.1 })); cab.position.set(tp.x, 42.5, tp.z); scene.add(cab); ctx.nightMats.push({ mat: cab.material, base: 0.05, k: 0.9 });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(7, 6.4, 1, 14), stdMat(0xe2e0d8)); cap.position.set(tp.x, 45.6, tp.z); scene.add(cap); ctx.blink.add(tp.x, 48, tp.z, 9, redc); ctx.tower = tp; }
  // hangars
  for (let i = 0; i < 2; i++) { const hp = A(-520 + i * 70, -200); ctx.batches.at(hp.x, hp.z).box(hp.x, hp.z, 56, 42, th, 0, 16, { style: 6, color: C('#b9bcbf'), seed: rnd() }); }

  // ---- aircraft ----
  const mk = (tail) => {
    const g = new THREE.Group(); const white = stdMat(0xf2f2f0, { roughness: 0.35, metalness: 0.2 }), tm2 = stdMat(tail, { roughness: 0.4 }), dark = stdMat(0x2a2c30, { roughness: 0.4, metalness: 0.5 });
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 31, 16), white); fus.rotation.x = Math.PI / 2; fus.castShadow = true; g.add(fus);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.95, 16, 12), white); nose.position.z = 15.5; nose.scale.z = 1.7; g.add(nose);
    const tailc = new THREE.Mesh(new THREE.ConeGeometry(1.95, 9, 16), white); tailc.rotation.x = -Math.PI / 2; tailc.position.z = -19.5; g.add(tailc);
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(17, 0.35, 4.6), white); wing.position.set(s * 9.3, -0.7, -1.5); wing.rotation.y = -s * 0.42; wing.castShadow = true; g.add(wing);
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.9, 3.8, 12), dark); eng.rotation.x = Math.PI / 2; eng.position.set(s * 6.4, -2.0, 1.8); g.add(eng);
      const st = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.25, 2.5), white); st.position.set(s * 3.6, 0.6, -20); st.rotation.y = -s * 0.35; g.add(st);
    }
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6.6, 5.2), tm2); fin.position.set(0, 4.8, -19.2); fin.rotation.x = 0.26; g.add(fin);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.97, 1.97, 22, 16, 1, true, -0.4, 0.8), tm2); stripe.rotation.x = Math.PI / 2; stripe.position.y = 0.5; g.add(stripe);
    return g;
  };
  const tails = [0x1b4fa0, 0xd8392b, 0x1f8a4c, 0xe8a31d];
  for (let i = 0; i < 4; i++) { const p = A(-300 + i * 58, -132); const pl = mk(tails[i]); pl.position.set(p.x, 2.9, p.z); pl.rotation.y = Math.atan2(-vx, -vz) + (rnd() - 0.5) * 0.05; scene.add(pl); }
  for (let i = 0; i < 4; i++) { const p = A(-300 + i * 58 + 14, -122);
    const stair = new THREE.Mesh(new THREE.BoxGeometry(1.8, 4.2, 6), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5 })); stair.position.set(p.x, 2.1, p.z); stair.rotation.set(0.45, Math.atan2(-vx, -vz), 0); stair.castShadow = true; scene.add(stair);
    if (i === 1) { const fuel = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 7, 16), new THREE.MeshStandardMaterial({ color: 0xe8e8e4, metalness: 0.5, roughness: 0.3 })); fuel.rotation.z = Math.PI / 2; fuel.position.set(p.x + ux * 20, 2.2, p.z + uz * 20); fuel.rotation.y = -th; scene.add(fuel);
      const cabT = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), new THREE.MeshStandardMaterial({ color: 0xc8282a })); cabT.position.set(p.x + ux * 25, 1.6, p.z + uz * 25); scene.add(cabT); } }
  const jet = mk(0xe6342a); scene.add(jet);
  const nav = new GlowSet('airport', 30); ctx.glowSets.push(nav);
  nav.add(0, 0, 0, 2, redc); nav.add(0, 0, 0, 2, green); nav.add(0, 0, 0, 6, white); nav.add(0, 0, 0, 3, white);
  ctx.jet = { obj: jet, nav, s: -RL / 2 + 80, T: 0 };
  glowRW.build(scene); glowTW.build(scene); nav.build(scene);
  ctx.airport = { A, ux, uz, vx, vz, yaw, RL, cx, cz };
  ctx.update.push((dt, t, S) => {
    glowRW.mat.uniforms.uInt.value = 0.12 + 1.1 * S.win; glowTW.mat.uniforms.uInt.value = 0.12 + 1.0 * S.win;
    // takeoff roll: hold -> accelerate -> rotate -> climb, loops every 80 s
    const J = ctx.jet; J.T = (J.T + dt) % 80; const T = J.T;
    const hold = 3, acc = 3.1, tLift = hold + 23;
    let s, h = 0, pitch = 0;
    if (T < hold) { s = -RL / 2 + 90; }
    else if (T < tLift) { const k = T - hold; s = -RL / 2 + 90 + 0.5 * acc * k * k; if (T > tLift - 4) pitch = 0.2 * (T - (tLift - 4)) / 4 * 0.9; }
    else { const k = T - tLift, v0 = acc * (tLift - hold); s = -RL / 2 + 90 + 0.5 * acc * (tLift - hold) ** 2 + (v0 + 6) * k; h = 2.9 + 11 * k + 0.28 * k * k; pitch = 0.2 + Math.min(0.06, k * 0.01); }
    const p = A(s, 0, 0); J.obj.position.set(p.x, Math.max(2.9, h + 2.9), p.z); J.obj.rotation.set(-pitch, yaw, 0, 'YXZ');
    const pos = J.nav.points.geometry.attributes.position, lp = (dx, dy, dz) => J.obj.localToWorld(new THREE.Vector3(dx, dy, dz));
    J.obj.updateMatrixWorld(); const a = lp(-17.5, -0.4, -4), b = lp(17.5, -0.4, -4), c = lp(0, 6, -19), d = lp(0, -1, 18.5);
    pos.setXYZ(0, a.x, a.y, a.z); pos.setXYZ(1, b.x, b.y, b.z); pos.setXYZ(2, c.x, c.y, c.z); pos.setXYZ(3, d.x, d.y, d.z); pos.needsUpdate = true;
    J.nav.mat.uniforms.uInt.value = (0.4 + 0.9 * Math.pow(Math.sin(t * 4.2) * 0.5 + 0.5, 6)) * (0.5 + S.win) * 1.4;
  });
}


// =====================================================================
//  Buddha hill complex (from reference photos): standing gold Buddha on a grey tiered
//  plinth, white balustrade with lotus finials, gold bell chedis, Thai salas with red
//  tiered roofs and white gables, flag poles; plus an ornate many-spired ordination hall.
// =====================================================================
function flagTex(kind) {
  return canvasTex(96, 64, (g, w, h) => { if (kind === 'th') { const s = ['#a51931', '#f4f5f8', '#2d2a4a', '#2d2a4a', '#f4f5f8', '#a51931']; s.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * h / 6, w, h / 6 + 1); }); } else { g.fillStyle = '#f2c414'; g.fillRect(0, 0, w, h); } }, { clamp: true });
}
function thaiGableTex() {
  return canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7a1e10'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e0b040'; g.lineWidth = 3;
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(w / 2, 20 + i * 10); g.bezierCurveTo(w / 2 - 60 - i * 8, 80 + i * 12, w / 2 - 30, 180, 10 + i * 6, h - 10); g.stroke(); g.beginPath(); g.moveTo(w / 2, 20 + i * 10); g.bezierCurveTo(w / 2 + 60 + i * 8, 80 + i * 12, w / 2 + 30, 180, w - 10 - i * 6, h - 10); g.stroke(); }
    g.fillStyle = '#f0c850'; g.beginPath(); g.arc(w / 2, 140, 26, 0, 7); g.fill(); });
}
function wallPatternTex() {
  return canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#b8874a'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,220,140,.55)'; g.lineWidth = 2;
    for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x + 8, y); g.lineTo(x + 16, y + 8); g.lineTo(x + 8, y + 16); g.lineTo(x, y + 8); g.closePath(); g.stroke(); } });
}
function buildBuddhaComplex(ctx, bx, by, bz, glow) {
  const { scene } = ctx; const rnd = mulberry32(99);
  const gold = new THREE.MeshStandardMaterial({ color: 0xe8b63c, metalness: 0.95, roughness: 0.22, emissive: 0x7a4a08, emissiveIntensity: 0.12 }); ctx.nightMats.push({ mat: gold, base: 0.1, k: 1.0 });
  const white = stdMat(0xf4f2ec, { roughness: 0.55 }), grey = stdMat(0x8e8f8c, { roughness: 0.8 }), red = stdMat(0xa8321e, { roughness: 0.55 }), grass = stdMat(0x3f7a2e, { roughness: 1 });
  const add = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; scene.add(o); return o; };
  // terrace on the hilltop
  add(new THREE.BoxGeometry(170, 6, 120), grass, bx - 30, by - 3, bz + 10);
  // ---- standing Buddha (faces south-west toward the city) ----
  const face = Math.atan2(-bx, -bz);                // turn toward Lee Gardens / the city
  const B = new THREE.Group(); B.position.set(bx, by, bz); B.rotation.y = face; scene.add(B);
  const put = (geo, m, x, y, z, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); o.castShadow = true; B.add(o); return o; };
  put(new THREE.BoxGeometry(22, 4.5, 22), grey, 0, 2.25, 0); put(new THREE.BoxGeometry(17, 3.5, 17), grey, 0, 6.25, 0); put(new THREE.BoxGeometry(12, 1.2, 12), white, 0, 8.6, 0);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; put(new THREE.BoxGeometry(3, 2.5, 0.2), stdMat(0x2a2a2a), Math.sin(a) * 8.6, 6, Math.cos(a) * 8.6); }
  put(new THREE.CylinderGeometry(5.2, 4.2, 1.6, 32), gold, 0, 10, 0); put(new THREE.CylinderGeometry(4.2, 5.4, 1.4, 32), gold, 0, 11.4, 0);
  const robe = new THREE.LatheGeometry([[0.01, 0], [1.5, 0], [2.15, 0.35], [2.25, 1.2], [1.95, 3], [1.75, 6.5], [1.7, 9.5], [1.9, 12.5], [2.3, 15], [2.6, 16.3], [2.2, 17.1], [1.2, 17.6], [0.6, 17.8], [0.01, 17.85]].map(([r, y]) => new THREE.Vector2(r, y)), 40);
  const rb = put(robe, gold, 0, 12.1, 0); rb.scale.set(1, 1, 0.68);
  for (let k = 0; k < 7; k++) { const f = put(new THREE.TorusGeometry(1.9 - k * 0.02, 0.05, 4, 30, Math.PI * 0.9), gold, 0, 13.5 + k * 1.5, 0.2, Math.PI / 2 - 0.15, 0); f.scale.set(1, 0.68, 1); }
  for (const s of [-1, 1]) { put(new THREE.CapsuleGeometry(0.22, 0.9, 4, 8), gold, s * 1.18, 31.4, -0.05); }
  put(new THREE.SphereGeometry(0.9, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), gold, 0, 32.5, -0.05);
  put(new THREE.CylinderGeometry(0.55, 0.65, 0.9, 16), gold, 0, 30.2, 0);
  const head = put(new THREE.SphereGeometry(1.25, 28, 22), gold, 0, 31.6, 0.05); head.scale.set(0.95, 1.12, 1);
  put(new THREE.SphereGeometry(0.75, 18, 14), gold, 0, 32.75, -0.05); put(new THREE.ConeGeometry(0.32, 1.6, 14), gold, 0, 34.0, -0.05);
  for (const s of [-1, 1]) put(new THREE.CapsuleGeometry(0.16, 0.7, 4, 8), gold, s * 1.2, 31.3, 0.1);
  // left arm hanging, right arm raised in blessing (abhaya)
  put(new THREE.CapsuleGeometry(0.45, 6.2, 6, 12), gold, -2.3, 24.3, 0.1, 0, 0.08);
  put(new THREE.CapsuleGeometry(0.45, 3.0, 6, 12), gold, 2.1, 26.4, 0.4, 0, -0.35);
  put(new THREE.CapsuleGeometry(0.42, 2.6, 6, 12), gold, 2.25, 27.6, 1.45, -1.25, 0);
  const hand = put(new THREE.BoxGeometry(0.9, 1.4, 0.35), gold, 2.3, 28.8, 2.3, 0, 0);
  // robe drape line over the left shoulder
  put(new THREE.TorusGeometry(2.0, 0.12, 6, 30, Math.PI), gold, 0, 27.2, 0, 0.6, 0);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; glow.add(bx + Math.cos(a) * 13, by + 9, bz + Math.sin(a) * 13, 12, C('#ffe3a0')); }
  glow.add(bx, by + 24, bz, 60, C('#ffd27a'));
  // ---- white balustrade ring with lotus finials + gold bell chedis ----
  const postG = new THREE.BoxGeometry(0.45, 1.3, 0.45), finG = new THREE.SphereGeometry(0.28, 10, 8), railG = new THREE.BoxGeometry(1, 0.18, 0.2);
  const posts = new THREE.InstancedMesh(postG, white, 200), fins = new THREE.InstancedMesh(finG, white, 200), rails = new THREE.InstancedMesh(railG, white, 400);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0); let pi = 0, ri = 0;
  const fence = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 3)), ang = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; if (pi < 200) { M.makeTranslation(x, by + 0.65, z); posts.setMatrixAt(pi, M); M.makeTranslation(x, by + 1.5, z); fins.setMatrixAt(pi, M); pi++; } }
    for (const h of [0.45, 1.05]) if (ri < 400) { Q.setFromAxisAngle(up, ang + Math.PI / 2); M.compose(new THREE.Vector3((x0 + x1) / 2, by + h, (z0 + z1) / 2), Q, new THREE.Vector3(L, 1, 1)); rails.setMatrixAt(ri++, M); } };
  const R = 30; for (let i = 0; i < 16; i++) { const a0 = i / 16 * Math.PI * 2, a1 = (i + 1) / 16 * Math.PI * 2; if (i === 12) continue; fence(bx + Math.cos(a0) * R, bz + Math.sin(a0) * R, bx + Math.cos(a1) * R, bz + Math.sin(a1) * R); }
  posts.count = pi; fins.count = pi; rails.count = ri; for (const m of [posts, fins, rails]) { m.castShadow = true; scene.add(m); }
  const chedi = (x, z, s) => { const g = new THREE.Group(); g.position.set(x, by, z); scene.add(g);
    const parts = [[new THREE.BoxGeometry(2.2 * s, 1.2 * s, 2.2 * s), white, 0.6], [new THREE.CylinderGeometry(1.0 * s, 1.15 * s, 0.6 * s, 20), gold, 1.5], [new THREE.SphereGeometry(1.15 * s, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), gold, 1.9], [new THREE.CylinderGeometry(0.35 * s, 0.6 * s, 0.6 * s, 14), gold, 3.0], [new THREE.ConeGeometry(0.32 * s, 2.6 * s, 14), gold, 4.6]];
    for (const [geo, m, y] of parts) { const o = new THREE.Mesh(geo, m); o.position.y = y * s; o.castShadow = true; g.add(o); } };
  chedi(bx - 13, bz + 9, 1.4); chedi(bx + 13, bz + 9, 1.4); chedi(bx - 13, bz - 9, 1.2); chedi(bx + 13, bz - 9, 1.2);
  // ---- Thai salas: white body, red tiered roof, white gables, chofa finials ----
  const batch = ctx.batches.at(bx, bz);
  const sala = (x, z, rot, w, d) => {
    batch.box(x, z, w, d, rot, by, 1.0, { style: 6, color: C('#9a9a96'), seed: 0.2, collide: false });
    for (let i = 0; i < 6; i++) { const t = (i / 5 - 0.5); const cx = x + Math.cos(rot) * t * (w - 1.2), cz = z + Math.sin(rot) * t * (w - 1.2);
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.5, 4.2, 0.5), white, cx - Math.sin(rot) * s * (d / 2 - 0.6), by + 3.1, cz + Math.cos(rot) * s * (d / 2 - 0.6)); }
    batch.box(x, z, w * 0.7, d * 0.55, rot, by + 1, 3.6, { style: 6, color: C('#f2efe6'), seed: 0.4, collide: false });
    batch.gable(x, z, w, d, rot, by + 5.2, 3.0, C('#b03a22'), 0.3, 1.6);
    batch.gable(x, z, w * 0.78, d * 0.72, rot, by + 6.9, 2.6, C('#c0442a'), 0.3, 1.0);
    for (const s of [-1, 1]) { const ex = x + Math.cos(rot) * s * (w / 2 + 1.4), ez = z + Math.sin(rot) * s * (w / 2 + 1.4);
      const cf = add(new THREE.ConeGeometry(0.22, 2.0, 8), white, ex, by + 9.4, ez); cf.rotation.z = s * 0.5; }
    glow.add(x, by + 4.2, z, 10, C('#ffd9a0'));
  };
  sala(bx + 44, bz + 14, 0.25, 22, 13); sala(bx + 70, bz + 26, 0.25, 16, 10); sala(bx - 42, bz + 18, -0.2, 14, 10);
  // flag poles: Thai national + yellow flags
  const thF = new THREE.MeshStandardMaterial({ map: flagTex('th'), side: THREE.DoubleSide, roughness: 0.8 }), yeF = new THREE.MeshStandardMaterial({ map: flagTex('y'), side: THREE.DoubleSide, roughness: 0.8 });
  const flags = [];
  for (let i = 0; i < 8; i++) { const x = bx + 30 + i * 7, z = bz + 34 + i * 1.6; add(new THREE.CylinderGeometry(0.07, 0.09, 9, 6), white, x, by + 4.5, z);
    const fg = new THREE.PlaneGeometry(2.2, 1.4, 8, 1); fg.translate(1.1, 0, 0); const f = add(fg, i % 2 ? yeF : thF, x, by + 8.2, z); flags.push(f); }
  ctx.update.push((dt, t) => { flags.forEach((f, i) => { const pa = f.geometry.attributes.position; for (let k = 0; k < pa.count; k++) { const x = pa.getX(k); pa.setZ(k, Math.sin(t * 4 + x * 2.2 + i) * 0.12 * x); } pa.needsUpdate = true; }); });
  // topiary + hedges
  for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, r = 34 + rnd() * 14; add(new THREE.SphereGeometry(0.9 + rnd() * 0.6, 10, 8), stdMat(0x2f6a2a, { roughness: 1 }), bx + Math.cos(a) * r, by + 1, bz + Math.sin(a) * r); }

  // ---- ornate ordination hall with three spired mondops (reference photo 2; location to be confirmed) ----
  const ox = bx - 70, oz = bz - 22, oy = by, rot = 0.15, H = new THREE.Group(); H.position.set(ox, oy, oz); H.rotation.y = -rot; scene.add(H);
  const wallM = new THREE.MeshStandardMaterial({ map: wallPatternTex(), roughness: 0.5, metalness: 0.35 }); wallM.map.repeat.set(10, 2);
  const roofM = stdMat(0xa8442e, { roughness: 0.6 }), roofDark = stdMat(0x6a2a1c, { roughness: 0.55, metalness: 0.2 }), gableM = new THREE.MeshStandardMaterial({ map: thaiGableTex(), roughness: 0.4, metalness: 0.5 });
  const hp = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; H.add(o); return o; };
  hp(new THREE.BoxGeometry(44, 1.5, 24), white, 0, 0.75, 0); hp(new THREE.BoxGeometry(40, 8, 18), wallM, 0, 5.5, 0);
  for (let i = 0; i < 9; i++) { hp(new THREE.BoxGeometry(2.2, 3.4, 0.2), stdMat(0x101820), -16 + i * 4, 5.2, 9.05); hp(new THREE.BoxGeometry(2.8, 1.2, 0.3), gold, -16 + i * 4, 7.6, 9.1); }
  // main roof (long gable) – two tiers
  const roofPrism = (w, d, h, y, m) => { const sh = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, h)]); const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); g.translate(0, 0, -w / 2); g.rotateY(Math.PI / 2); return hp(g, m, 0, y, 0); };
  roofPrism(44, 21, 6.5, 9.5, roofM); roofPrism(36, 15, 6.0, 12.5, roofDark);
  // three cross-gabled bays with tall tiered spires
  for (const sx of [-14, 0, 14]) {
    const sg = new THREE.Shape([new THREE.Vector2(-5, 0), new THREE.Vector2(5, 0), new THREE.Vector2(0, 8)]);
    const gg = new THREE.ExtrudeGeometry(sg, { depth: 26, bevelEnabled: false }); gg.translate(0, 0, -13); hp(gg, roofM, sx, 9.5, 0);
    const fr = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-4.6, 0), new THREE.Vector2(4.6, 0), new THREE.Vector2(0, 7.4)])), gableM); fr.position.set(sx, 9.7, 13.05); H.add(fr);
    for (const s of [-1, 1]) { const hook = hp(new THREE.TorusGeometry(0.9, 0.12, 6, 12, Math.PI * 0.9), roofDark, sx + s * 5.6, 10.4, 13.1); hook.rotation.z = s > 0 ? 0 : Math.PI * 0.1; }
    // tiered mondop spire
    let y = 15, w = 7;
    for (let k = 0; k < 7; k++) { hp(new THREE.BoxGeometry(w, 1.1, w), k % 2 ? roofDark : roofM, sx, y, 0); for (let j = 0; j < 4; j++) { const a = j * Math.PI / 2; hp(new THREE.ConeGeometry(0.18, 1.4, 6), roofDark, sx + Math.sin(a) * w / 2, y + 0.9, Math.cos(a) * w / 2); } y += 1.1; w *= 0.8; }
    hp(new THREE.CylinderGeometry(0.9, 1.4, 3, 8), roofDark, sx, y + 1.5, 0); hp(new THREE.ConeGeometry(0.6, 9, 8), roofDark, sx, y + 7.5, 0); hp(new THREE.SphereGeometry(0.25, 8, 6), gold, sx, y + 12.2, 0);
  }
  // white tiered chedis in front + globe lamps
  for (let i = 0; i < 7; i++) { const x = -18 + i * 6, z = 17; let y = 0.4, r = 1.4; for (let k = 0; k < 7; k++) { hp(new THREE.CylinderGeometry(r * 0.85, r, 0.8, 10), i % 3 === 1 ? gold : white, x, y + 0.4, z); y += 0.8; r *= 0.78; } hp(new THREE.ConeGeometry(0.25, 2.4, 8), i % 3 === 1 ? gold : white, x, y + 1.2, z);
    if (i % 2 === 0) { hp(new THREE.CylinderGeometry(0.06, 0.08, 3.6, 6), white, x + 3, 1.8, z + 1); const gl = hp(new THREE.SphereGeometry(0.35, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d6, emissiveIntensity: 0.8 }), x + 3, 3.7, z + 1); const w = new THREE.Vector3(); gl.getWorldPosition(w); glow.add(w.x, w.y, w.z, 6, C('#fff2d6')); } }
  const hw = new THREE.Vector3(); H.updateMatrixWorld(); H.localToWorld(hw.set(0, 8, 12)); glow.add(hw.x, hw.y, hw.z, 40, C('#ffcf80'));
  // ---- forecourt details from the reference photo: golden Suphannahong swan boat, incense urn, steel globe lamps ----
  { const goldB = gold; const neck = new THREE.CatmullRomCurve3([new THREE.Vector3(-12, 1.2, 26), new THREE.Vector3(-14.5, 2.6, 26), new THREE.Vector3(-15.5, 5.2, 26), new THREE.Vector3(-14.2, 6.6, 26), new THREE.Vector3(-12.4, 6.4, 26)]);
    hp(new THREE.TubeGeometry(neck, 30, 0.42, 10), goldB, 0, 0, 0); hp(new THREE.ConeGeometry(0.3, 1.6, 8), goldB, -11.6, 6.3, 26).rotation.z = -Math.PI / 2;
    const hull = new THREE.CatmullRomCurve3([new THREE.Vector3(-12, 1.0, 26), new THREE.Vector3(-4, 0.6, 26), new THREE.Vector3(4, 0.6, 26), new THREE.Vector3(11, 1.0, 26), new THREE.Vector3(14, 2.6, 26)]);
    hp(new THREE.TubeGeometry(hull, 40, 0.75, 12), goldB, 0, 0, 0); hp(new THREE.BoxGeometry(20, 0.5, 2.2), stdMat(0x1a1a1a), 0, 1.3, 26);
    hp(new THREE.CylinderGeometry(1.6, 1.3, 1.6, 20), stdMat(0x1a1a1a, { metalness: 0.4 }), 0, 1.1, 30); hp(new THREE.CylinderGeometry(1.65, 1.65, 0.5, 20), goldB, 0, 1.8, 30);
    const steelL = stdMat(0xd8dde2, { metalness: 0.95, roughness: 0.12 }), globeM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d6, emissiveIntensity: 0.6 }); ctx.nightMats.push({ mat: globeM, base: 0.3, k: 1.6 });
    for (const sx of [-16, -7, 7, 16]) { hp(new THREE.CylinderGeometry(0.35, 0.5, 5.5, 8), steelL, sx, 2.75, 22); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; hp(new THREE.SphereGeometry(0.42, 12, 10), globeM, sx + Math.cos(a) * 1.2, 5.2, 22 + Math.sin(a) * 1.2); } hp(new THREE.SphereGeometry(0.5, 12, 10), globeM, sx, 6.0, 22); }
    for (let k = 0; k < 7; k++) hp(new THREE.BoxGeometry(12 - k * 0.2, 0.35, 1.1), stdMat(0x8a8a86), 0, 0.2 + k * 0.35, 12 + 7 - k * 1.0);
    hp(new THREE.BoxGeometry(46, 1.2, 0.3), white, 0, 2.2, 11.2); for (let i = 0; i < 23; i++) hp(new THREE.BoxGeometry(0.3, 1.4, 0.3), white, -22 + i * 2, 2.2, 11.2); }
  ctx.ornateHall = { x: ox, z: oz };
  buildCableAndElephant(ctx, glow);
}


// =====================================================================
//  Cable car from the Buddha terrace up to a higher peak with a giant
//  elephant-headed deity (Phra Phikanet) shrine. Upper station position approximate.
// =====================================================================
function buildCableAndElephant(ctx, glow) {
  const { scene } = ctx;
  const st = DATA.blds.find(b => b.n.includes('พระพุทธมงคลมหาราช') && b.c === 'aerialway');
  let lx = 4310, lz = -3918; if (st) { const P = ring(st.p); lx = 0; lz = 0; P.forEach(q => { lx += q[0] / P.length; lz += q[1] / P.length; }); }
  const ux = 4980, uz = -4380; const ly = groundY(lx, lz) + 9, uy = groundY(ux, uz) + 12;
  const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, o));
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; scene.add(o); return o; };
  // stations
  const steel = std(0x9aa0a6, { metalness: 0.7, roughness: 0.35 });
  for (const [x, y, z] of [[lx, ly, lz], [ux, uy, uz]]) { add(new THREE.BoxGeometry(14, 1, 10), std(0xe8e4d8), x, y - 0.5, z); add(new THREE.BoxGeometry(14, 0.6, 10), std(0xb8452a), x, y + 6, z); for (const [a, b] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) add(new THREE.CylinderGeometry(0.25, 0.25, 6, 8), steel, x + a, y + 3, z + b); glow.add(x, y + 5, z, 14, C('#ffd9a0')); }
  // towers + two cables (up/down)
  const dx = ux - lx, dz = uz - lz, L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L;
  const cable = (t, side) => { const x = lx + dx * t + nx * side * 2.2, z = lz + dz * t + nz * side * 2.2; const y = ly + 7 + (uy - ly) * t - Math.sin(t * Math.PI) * 14; return new THREE.Vector3(x, y, z); };
  for (const side of [-1, 1]) { const pts = []; for (let i = 0; i <= 80; i++) pts.push(cable(i / 80, side)); const g = new THREE.BufferGeometry().setFromPoints(pts); scene.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x222222 }))); }
  for (let k = 1; k < 5; k++) { const t = k / 5, x = lx + dx * t, z = lz + dz * t, gy = groundY(x, z), top = cable(t, 0).y + 1.2; add(new THREE.CylinderGeometry(0.5, 0.9, top - gy, 8), steel, x, (top + gy) / 2, z); add(new THREE.BoxGeometry(1, 0.5, 6), steel, x, top, z).lookAt(x + nx, top, z + nz); }
  // gondolas (red cabins, as on the logo)
  const cab = new THREE.Group(); const cm = std(0xc8202a, { roughness: 0.4 }), gl = new THREE.MeshPhysicalMaterial({ color: 0x223344, roughness: 0.1, metalness: 0.3 });
  const mkCab = () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), cm); b.position.y = -2.4; g.add(b); const w = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.9, 2.25), gl); w.position.y = -2.0; g.add(w); const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 0.1), steel); r.position.y = -0.65; g.add(r); g.traverse(o => o.castShadow = true); scene.add(g); return g; };
  const cabs = []; for (let i = 0; i < 10; i++) cabs.push({ g: mkCab(), t: i / 10, side: i % 2 ? 1 : -1 });
  ctx.update.push((dt) => { for (const c of cabs) { c.t = (c.t + dt * 0.012) % 1; const t = c.side > 0 ? c.t : 1 - c.t; const p = cable(t, c.side); c.g.position.copy(p); c.g.rotation.y = Math.atan2(dx, dz); } });
  ctx.cable = { lx, lz, ux, uz };
  // ---- elephant shrine on the upper peak ----
  const ex = ux - 30, ez = uz + 10, ey = groundY(ex, ez);
  add(new THREE.CylinderGeometry(32, 36, 4, 40), std(0xd8d0c0), ex, ey - 1, ez);
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b040, metalness: 0.9, roughness: 0.25, emissive: 0x6a4008, emissiveIntensity: 0.12 }); ctx.nightMats.push({ mat: gold, base: 0.1, k: 1.0 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xe8a0a8, roughness: 0.45, metalness: 0.15 });
  const E = new THREE.Group(); E.position.set(ex, ey + 1, ez); E.rotation.y = Math.atan2(-ex, -ez); scene.add(E);
  const ep = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; E.add(o); return o; };
  ep(new THREE.CylinderGeometry(9, 10, 2.4, 40), std(0xf2efe6), 0, 1.2, 0); ep(new THREE.CylinderGeometry(7.5, 8.5, 1.8, 40), gold, 0, 3.3, 0);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const pet = ep(new THREE.SphereGeometry(1.4, 10, 8), pink, Math.cos(a) * 7.6, 3.6, Math.sin(a) * 7.6); pet.scale.set(1, 0.6, 0.5); pet.rotation.y = -a; }
  const legs = ep(new THREE.SphereGeometry(5.2, 28, 18), pink, 0, 6.5, 0.6); legs.scale.set(1.25, 0.5, 1.0);
  const belly = ep(new THREE.SphereGeometry(4.0, 28, 20), pink, 0, 10.2, 0.3); belly.scale.set(1, 1.05, 0.95);
  const chest = ep(new THREE.SphereGeometry(3.3, 24, 18), pink, 0, 13.4, -0.2); chest.scale.set(1.15, 0.9, 0.85);
  ep(new THREE.TorusGeometry(3.4, 0.35, 8, 30), gold, 0, 11.6, 0.2, Math.PI / 2);                     // jewelled belt
  for (let i = 0; i < 9; i++) ep(new THREE.SphereGeometry(0.4, 10, 8), std(0xff8a1a), Math.cos(i / 8 * Math.PI) * 2.6, 13.6 - Math.sin(i / 8 * Math.PI) * 1.6, 2.2); // marigold garland
  const head = ep(new THREE.SphereGeometry(2.6, 26, 20), pink, 0, 17.2, 0.4); head.scale.set(1, 1.08, 1);
  for (const s of [-1, 1]) { const ear = ep(new THREE.SphereGeometry(2.6, 20, 14), pink, s * 2.9, 17.2, -0.2, 0, s * 0.25, 0); ear.scale.set(0.25, 1.2, 1.0);
    ep(new THREE.SphereGeometry(0.28, 10, 8), std(0x1a1414), s * 0.95, 17.8, 2.6);                     // eyes
    ep(new THREE.ConeGeometry(0.28, 1.6, 10), std(0xf4f0e0), s * 0.9, 15.9, 2.6, Math.PI / 2 + 0.4, 0, 0); } // tusks
  const trunkCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 16.6, 2.6), new THREE.Vector3(0, 14.6, 3.4), new THREE.Vector3(0.6, 12.6, 3.3), new THREE.Vector3(1.6, 11.8, 3.6), new THREE.Vector3(2.2, 12.6, 3.9)]);
  ep(new THREE.TubeGeometry(trunkCurve, 30, 0.6, 12, false), pink, 0, 0, 0);
  let cy = 19.6, cr = 1.9; for (let k = 0; k < 6; k++) { ep(new THREE.CylinderGeometry(cr * 0.82, cr, 0.9, 20), gold, 0, cy, 0.3); cy += 0.9; cr *= 0.8; } ep(new THREE.ConeGeometry(0.4, 2.4, 14), gold, 0, cy + 1.2, 0.3);
  // four arms holding symbols
  for (const s of [-1, 1]) {
    ep(new THREE.CapsuleGeometry(0.75, 4.2, 6, 12), pink, s * 4.2, 14.2, 0.2, 0, 0, s * 0.9);
    ep(new THREE.CapsuleGeometry(0.7, 3.6, 6, 12), pink, s * 4.6, 11.0, 1.4, -0.6, 0, -s * 0.3);
    ep(new THREE.SphereGeometry(0.9, 12, 10), gold, s * 6.3, 16.0, 0.2);
    ep(new THREE.SphereGeometry(0.8, 12, 10), s > 0 ? std(0xf2c040) : gold, s * 5.0, 9.4, 3.0);
  }
  const halo = ep(new THREE.TorusGeometry(5.2, 0.35, 8, 48), gold, 0, 17.5, -2.4);
  // shrine pavilions, incense, flowers
  const b = ctx.batches.at(ex, ez);
  for (const [a, r] of [[0.9, 22], [-0.9, 22]]) { const px = ex + Math.cos(a + E.rotation.y) * r, pz = ez + Math.sin(a + E.rotation.y) * r;
    b.box(px, pz, 8, 6, a, ey + 1, 3.2, { style: 6, color: C('#f2efe6'), seed: 0.4, collide: false }); b.gable(px, pz, 8, 6, a, ey + 4.2, 2.4, C('#c0442a'), 0.3, 0.9); glow.add(px, ey + 3, pz, 8, C('#ffcf80')); }
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; glow.add(ex + Math.cos(a) * 12, ey + 2, ez + Math.sin(a) * 12, 6, C('#ffb050')); }
  glow.add(ex, ey + 16, ez, 70, C('#ffd9a8'));
  ctx.elephant = { x: ex, y: ey, z: ez };
  ctx.extraTrees = ctx.extraTrees || []; const rnd = mulberry32(17);
  for (let i = 0; i < 700; i++) { const a = rnd() * 6.28, r = 95 + Math.sqrt(rnd()) * 650, x = 4980 + Math.cos(a) * r, z = -4380 + Math.sin(a) * r; ctx.extraTrees.push([x, z, 1.5 + rnd() * 1.6]); }
}
