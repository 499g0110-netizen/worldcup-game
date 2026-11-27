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
  for (let i = 0; i < 2600; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 1250; ctx.extraTrees.push([hillC[0] + Math.cos(a) * r, hillC[1] + Math.sin(a) * r * 0.8, 1.6 + rnd() * 1.8]); }
  // winding road up the hill with lamps
  const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * 5.2 - 0.6, r = 700 - t * 560; pts.push([hillC[0] + Math.cos(a) * r, hillC[1] + Math.sin(a) * r * 0.85]); }
  const o = { pos: [], uv: [], idx: [] }; ribbon(pts, 7, (x, z) => groundY(x, z) + 0.15, 24, o);
  const mat = ctx.roadMats.minor; const mesh = new THREE.Mesh(ribGeo(o), mat); mesh.receiveShadow = true; mesh.frustumCulled = false; scene.add(mesh);
  const glow = new GlowSet('lamp', 90); ctx.glowSets.push(glow); const warm = C('#ffb25a');
  pts.forEach((p, i) => { if (i % 2 === 0) glow.add(p[0] + 4, groundY(p[0], p[1]) + 7, p[1], 7, warm); });
  // summit: Phra Phutthamongkhon Maharat (พระพุทธมงคลมหาราช) – large Buddha statue (stylised) + cable-car station (OSM)
  const bx = 4328, bz = -3868, by = groundY(bx, bz);
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b44a, metalness: 0.85, roughness: 0.3, emissive: 0x8a5a10, emissiveIntensity: 0.15 }); ctx.nightMats.push({ mat: gold, base: 0.12, k: 1.1 });
  const white = stdMat(0xf0ece0, { roughness: 0.6 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(24, 30, by + 3, 32), stdMat(0x6d675a, { roughness: 1 })); base.position.set(bx, (by + 3) / 2 - 1, bz); base.receiveShadow = true; scene.add(base);
  let yy = by + 2;
  for (const [r, h] of [[17, 3], [14, 3], [11.5, 3]]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 1.2, h, 28), white); t.position.set(bx, yy + h / 2, bz); t.castShadow = true; scene.add(t); yy += h; }
  const lotus = new THREE.Mesh(new THREE.CylinderGeometry(10, 8, 2.4, 24), gold); lotus.position.set(bx, yy + 1.2, bz); scene.add(lotus); yy += 2.4;
  const legs = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 14), gold); legs.scale.set(1.35, 0.42, 0.95); legs.position.set(bx, yy + 3.8, bz); legs.castShadow = true; scene.add(legs);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(6.4, 24, 16), gold); torso.scale.set(1.0, 1.55, 0.82); torso.position.set(bx, yy + 13, bz); torso.castShadow = true; scene.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(3.3, 20, 14), gold); head.position.set(bx, yy + 25.4, bz); head.castShadow = true; scene.add(head);
  const ush = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.6, 14), gold); ush.position.set(bx, yy + 29.6, bz); scene.add(ush);
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(1.7, 7.5, 6, 12), gold); arm.position.set(bx + s * 7.1, yy + 12, bz + 1.2); arm.rotation.z = s * 0.28; arm.castShadow = true; scene.add(arm); }
  const hands = new THREE.Mesh(new THREE.SphereGeometry(2.2, 14, 10), gold); hands.scale.set(1.5, 0.7, 1); hands.position.set(bx, yy + 6.2, bz + 5.2); scene.add(hands);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(5.4, 0.28, 8, 40), new THREE.MeshBasicMaterial({ color: 0xfff1b8 })); halo.position.set(bx, yy + 26, bz - 3.2); scene.add(halo);
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; glow.add(bx + Math.cos(a) * 22, by + 1.2, bz + Math.sin(a) * 22, 16, C('#ffe2a0')); }
  glow.add(bx, yy + 14, bz + 10, 70, C('#ffd88a')); glow.add(bx, yy + 26, bz + 6, 26, C('#fff0c0'));
  // cable-car station (OSM polygon)
  const st = DATA.blds.find(b => b.n.includes('พระพุทธมงคลมหาราช') && b.c === 'aerialway');
  if (st) { const P = ring(st.p); let cx = 0, cz = 0; P.forEach(q => { cx += q[0] / P.length; cz += q[1] / P.length; }); ctx.batches.at(cx, cz).prism(P, groundY(cx, cz) - 1, 9, { style: 6, color: C('#d9d3c2'), seed: 0.3, roofColor: C('#b8452a') }); glow.add(cx, groundY(cx, cz) + 8, cz, 18, C('#ffb25a')); }
  ctx.park = { x: bx, y: by, z: bz, top: yy + 30 };
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
    B.prism(T, 0, 12, { style: 4, color: C('#dcdad2'), seed: 0.31, roofColor: C('#a7a8a5') });
    const pc = pca(T), rot = Math.atan2(pc.uz, pc.ux);
    B.box(bb.cx, bb.cz, 240, 24, rot, 12, 3, { style: 6, color: C('#c5c7c8'), seed: 0.7 });
    ctx.terminal = { x: bb.cx, z: bb.cz, rot };
    const sg = signTex([{ text: 'HAT YAI INTERNATIONAL AIRPORT', font: 'bold 52px system-ui,sans-serif' }, { text: 'ท่าอากาศยานนานาชาติหาดใหญ่', font: '40px "Noto Sans Thai",system-ui,sans-serif' }], { w: 1024, h: 180, bg: '#16356a', fg: '#ffffff' });
    const smat = new THREE.MeshStandardMaterial({ map: sg, emissiveMap: sg, emissive: 0xffffff, emissiveIntensity: 0.5 }); ctx.signMats.push(smat);
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(48, 8.4), smat); const cs = ctx.terminal; sp.position.set(bb.cx + vx * 52, 19, bb.cz + vz * 52); sp.rotation.y = Math.atan2(vx, vz); scene.add(sp);
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
