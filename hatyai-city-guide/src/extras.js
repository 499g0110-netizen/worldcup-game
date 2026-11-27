import * as THREE from 'three';
import { DATA } from './world.js';
import { mulberry32, signTex, canvasTex, pca } from './util.js';
import { GlowSet } from './props.js';

const C = (h) => new THREE.Color(h);
const ring = (p) => (p.length > 3 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1]) ? p.slice(0, -1) : p;
const bbox = (pts) => { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const p of pts) { a = Math.min(a, p[0]); b = Math.max(b, p[0]); c = Math.min(c, p[1]); d = Math.max(d, p[1]); } return { x0: a, x1: b, z0: c, z1: d, w: b - a, d: d - c, cx: (a + b) / 2, cz: (c + d) / 2 }; };
const TARPS = ['#c8281e', '#1d5fb8', '#e8a31d', '#1f8a4c', '#f2f2ec', '#d0488a', '#17a0a0', '#e8742a'];

// Night-market stalls: instanced canopies, counters, goods. Visible only after dark.
function makeStalls(ctx, items, glow, rnd, label) {
  const grp = new THREE.Group(); const n = items.length;
  const canopy = new THREE.InstancedMesh(new THREE.BoxGeometry(3.3, 0.1, 2.7), new THREE.MeshStandardMaterial({ roughness: 0.85 }), n);
  const counter = new THREE.InstancedMesh(new THREE.BoxGeometry(2.8, 0.95, 0.9), new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.8 }), n);
  const goods = new THREE.InstancedMesh(new THREE.BoxGeometry(2.5, 0.22, 0.7), new THREE.MeshStandardMaterial({ roughness: 0.6 }), n);
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 2.4, 0.08), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.6, roughness: 0.4 }), n * 2);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), qt = new THREE.Quaternion(), c = new THREE.Color(), up = new THREE.Vector3(0, 1, 0), ax = new THREE.Vector3(1, 0, 0);
  items.forEach((s, i) => {
    q.setFromAxisAngle(up, s.rot); qt.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(ax, -0.09));
    m.compose(new THREE.Vector3(s.x, 2.45, s.z), qt, new THREE.Vector3(1, 1, 1)); canopy.setMatrixAt(i, m); c.set(TARPS[Math.floor(rnd() * TARPS.length)]); canopy.setColorAt(i, c);
    const cs = Math.cos(s.rot), sn = Math.sin(s.rot);
    m.compose(new THREE.Vector3(s.x + sn * 0.7 * 0 + (-sn) * 0.6, 0.48, s.z + cs * 0.6), q, new THREE.Vector3(1, 1, 1)); counter.setMatrixAt(i, m);
    
    for (const k of [-1, 1]) { m.compose(new THREE.Vector3(s.x + cs * 1.55 * k, 1.2, s.z + sn * 1.55 * k), q, new THREE.Vector3(1, 1, 1)); posts.setMatrixAt(i * 2 + (k > 0 ? 1 : 0), m); }
    glow.add(s.x, 2.2, s.z, 5.5, rnd() < 0.75 ? C('#ffb15a') : C('#fff0cf'));
    if (rnd() < 0.5) glow.add(s.x + cs * 1.4, 2.3, s.z + sn * 1.4, 3, C(TARPS[Math.floor(rnd() * 3)]));
    for (let k = 0; k < 2 + Math.floor(rnd() * 3); k++) ctx.people.add(s.x - Math.sin(s.rot) * (1.5 + rnd() * 2.5) + (rnd() - 0.5) * 2, 0.15, s.z + Math.cos(s.rot) * (1.5 + rnd() * 2.5) + (rnd() - 0.5) * 2, 1);
  });
  // ---- per-stall merchandise: fruit, grills, noodle carts, drinks, clothes, sweets, skewers ----
  const TYPES = ['fruit', 'grill', 'noodle', 'drinks', 'clothes', 'sweets', 'skewers', 'grill', 'fruit'];
  const bins = { ball: [], grill: [], coal: [], glass: [], pot: [], bottle: [], cloth: [], tray: [] };
  items.forEach((s) => {
    const t = TYPES[Math.floor(rnd() * TYPES.length)], cs = Math.cos(s.rot), sn = Math.sin(s.rot);
    const at = (a, b, y) => [s.x + cs * a - sn * (0.6 + b), y, s.z + sn * a + cs * (0.6 + b)];
    if (t === 'fruit') { for (let k = 0; k < 16; k++) bins.ball.push([...at(-1.1 + (k % 8) * 0.3, (Math.floor(k / 8) - 0.5) * 0.25, 1.12 + (k % 3) * 0.04), ['#f28a1c', '#f2d21c', '#d8281e', '#6aa82a', '#7a2a8a', '#f2c040'][Math.floor(rnd() * 6)]]); }
    else if (t === 'grill' || t === 'skewers') { bins.grill.push(at(0, 0, 1.1)); bins.coal.push(at(0, 0, 1.17)); glow.add(...at(0, 0, 1.3), 3.2, C('#ff6a1a')); for (let k = 0; k < 10; k++) bins.tray.push([...at(-0.9 + k * 0.2, 0, 1.24), '#8a3a1a']); }
    else if (t === 'noodle') { bins.glass.push(at(-0.6, 0, 1.45)); bins.pot.push(at(0.7, 0, 1.25)); glow.add(...at(0.7, 0, 1.6), 2.5, C('#fff0d0')); }
    else if (t === 'drinks') { for (let k = 0; k < 12; k++) bins.bottle.push([...at(-1.0 + k * 0.18, (k % 2) * 0.15, 1.2), ['#e83a2a', '#2a8ae8', '#f2a21c', '#2ab05a', '#e8e8e8', '#d0388a'][k % 6]]); }
    else if (t === 'clothes') { for (let k = 0; k < 7; k++) bins.cloth.push([...at(-1.2 + k * 0.4, -0.3, 1.6), TARPS[Math.floor(rnd() * TARPS.length)], s.rot]); }
    else { for (let k = 0; k < 12; k++) bins.tray.push([...at(-1.0 + (k % 6) * 0.38, (Math.floor(k / 6) - 0.5) * 0.3, 1.1), ['#f2b8c8', '#a8e0b0', '#f2e08a', '#c8a0e8', '#ffffff'][k % 5]]); }
  });
  const mk = (geo, mat, list, colored = false, rotY = false) => { if (!list.length) return; const im = new THREE.InstancedMesh(geo, mat, list.length); const mm4 = new THREE.Matrix4(), cc = new THREE.Color();
    list.forEach((p, i) => { mm4.compose(new THREE.Vector3(p[0], p[1], p[2]), new THREE.Quaternion().setFromAxisAngle(up, rotY ? p[4] : 0), new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, mm4); if (colored) { cc.set(p[3]); im.setColorAt(i, cc); } });
    im.frustumCulled = false; grp.add(im); };
  mk(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.45 }), bins.ball, true);
  mk(new THREE.BoxGeometry(1.5, 0.18, 0.6), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.4 }), bins.grill);
  { const cm = new THREE.MeshStandardMaterial({ color: 0x331008, emissive: 0xff4a10, emissiveIntensity: 1.4 }); ctx.nightMats.push({ mat: cm, base: 1.0, k: 1.0 }); mk(new THREE.BoxGeometry(1.35, 0.04, 0.5), cm, bins.coal); }
  mk(new THREE.BoxGeometry(1.0, 0.7, 0.6), new THREE.MeshPhysicalMaterial({ color: 0xdfeff2, transparent: true, opacity: 0.28, roughness: 0.05 }), bins.glass);
  mk(new THREE.CylinderGeometry(0.32, 0.3, 0.45, 14), new THREE.MeshStandardMaterial({ color: 0xbfc3c8, metalness: 0.85, roughness: 0.25 }), bins.pot);
  mk(new THREE.CylinderGeometry(0.05, 0.05, 0.32, 8), new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0.1 }), bins.bottle, true);
  mk(new THREE.BoxGeometry(0.34, 0.75, 0.04), new THREE.MeshStandardMaterial({ roughness: 0.9 }), bins.cloth, true, true);
  mk(new THREE.BoxGeometry(0.3, 0.06, 0.24), new THREE.MeshStandardMaterial({ roughness: 0.6 }), bins.tray, true);
  for (const mm of [canopy, counter, posts]) { mm.frustumCulled = false; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.castShadow = true; grp.add(mm); }
  ctx.scene.add(grp); return grp;
}

export function buildExtras(ctx) {
  const { scene } = ctx; const rnd = mulberry32(2718);
  const nightGroups = [];
  const warm = C('#ffb15a'), cool = C('#d6e8ff'), red = C('#ff3b2a');
  const glow = new GlowSet('lamp', 70); ctx.glowSets.push(glow);
  const signMat = (tex) => { const mm = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.5 }); ctx.signMats.push(mm); return mm; };
  const signPlane = (tex, w, h, x, y, z, ry) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), signMat(tex)); p.position.set(x, y, z); p.rotation.y = ry; scene.add(p); return p; };
  const strings = (x0, z0, x1, z1, y, every = 2.2) => { const L = Math.hypot(x1 - x0, z1 - z0); for (let s = 0; s <= L; s += every) { const t = s / L; glow.add(x0 + (x1 - x0) * t, y - Math.sin(t * Math.PI) * 0.5, z0 + (z1 - z0) * t, 2.6, rnd() < 0.7 ? warm : cool); } };

  // ------------------------------------------------------------------
  //  Lee Gardens night market: after dark the plaza south of the hotel fills with stalls
  // ------------------------------------------------------------------
  {
    const items = []; const rot = -0.11;
    for (const x of [-21, -12, 3, 12, 22]) for (let z = 36; z <= 124; z += 5.6) { if (Math.abs(x - 12) < 0.1 && z > 100) continue; const face = x < 0 ? 0 : Math.PI; items.push({ x: x + (rnd() - 0.5) * 0.4, z: z + (rnd() - 0.5) * 0.3, rot: face + rot * 0.5 }); }
    const g = makeStalls(ctx, items, glow, rnd, 'lee'); nightGroups.push(g);
    for (const x of [-16.5, 7.5, 17.5]) strings(x, 32, x, 128, 4.8, 2.4);
    for (let z = 36; z <= 124; z += 14) strings(-26, z, 27, z, 5.0, 2.4);
    signPlane(signTex([{ text: 'LEE GARDENS 夜市', font: 'bold 70px "Noto Sans TC",system-ui,sans-serif' }, { text: 'ตลาดโต้รุ่ง · NIGHT MARKET', font: '38px "Noto Sans Thai",system-ui,sans-serif' }], { w: 768, h: 170, bg: '#1b0c24', fg: '#ffd27a', border: '#ff6a4a' }), 16, 3.5, -3, 8.2, 31, 0);
    signPlane(signTex([{ text: 'LEE GARDENS 夜市', font: 'bold 70px "Noto Sans TC",system-ui,sans-serif' }], { w: 768, h: 130, bg: '#1b0c24', fg: '#ffd27a', border: '#ff6a4a' }), 16, 2.7, -3, 8.2, 31.2, Math.PI);
    for (let i = 0; i < 160; i++) ctx.people.add(-24 + rnd() * 52, 0.15, 34 + rnd() * 92, 1);
    // gate posts for the sign + paved plaza
    for (const sx of [-10.5, 4.5]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 10, 12), new THREE.MeshStandardMaterial({ color: 0x8a1c1c, roughness: 0.5 })); p.position.set(sx, 5, 31.1); p.castShadow = true; scene.add(p); const cap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), new THREE.MeshStandardMaterial({ color: 0xe6c274, metalness: 0.8, roughness: 0.3 })); cap.position.set(sx, 10.2, 31.1); scene.add(cap); }
    { const pt = ctx.roadMats.cobble.map.clone(); pt.needsUpdate = true; pt.repeat.set(16, 26);
      const pv = new THREE.Mesh(new THREE.PlaneGeometry(64, 108), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.5, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      pv.rotation.set(-Math.PI / 2, 0, 0.11); pv.position.set(-1, 0.07, 78); pv.receiveShadow = true; scene.add(pv); }
    ctx.leeNight = { x: 0, z: 78 };
  }

  // ------------------------------------------------------------------
  //  秋哥國際豬腳飯 – Inter Pork Leg with Rice   (position is illustrative: not present in OSM)
  // ------------------------------------------------------------------
  {
    const X = 30, Z = 56, B = ctx.batches.at(X, Z);
    B.box(X + 6, Z, 8.5, 12, -0.11, 0, 7.6, { style: 0, color: C('#d8c9a8'), seed: 0.77, roofColor: C('#7a5a4a') });
    const tex = signTex([{ text: '秋哥國際豬腳飯', font: 'bold 86px "Noto Sans TC","Songti TC",serif' }, { text: 'INTER PORK LEG WITH RICE · ข้าวขาหมู', font: 'bold 34px system-ui,sans-serif' }], { w: 1024, h: 230, bg: '#a3141a', fg: '#ffe7a8', border: '#ffd26a' });
    signPlane(tex, 8.4, 1.9, X + 1.7, 4.8, Z + 0.1, -Math.PI / 2 - 0.11);
    // steaming pots & stools in front
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.7, 14), new THREE.MeshStandardMaterial({ color: 0xb9bcc0, metalness: 0.8, roughness: 0.3 })); pot.position.set(X - 0.6, 0.95, Z - 1.6); scene.add(pot);
    const pot2 = pot.clone(); pot2.position.set(X - 0.6, 0.95, Z + 1.0); scene.add(pot2);
    const cart = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.95, 4.4), new THREE.MeshStandardMaterial({ color: 0x8c8f93, metalness: 0.6, roughness: 0.4 })); cart.position.set(X - 0.6, 0.48, Z - 0.3); scene.add(cart);
    for (let i = 0; i < 16; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.42, 8), new THREE.MeshStandardMaterial({ color: 0x1fb86a })); st.position.set(X - 3.0 - (i % 2) * 1.2, 0.21, Z - 5 + Math.floor(i / 2) * 1.3); scene.add(st); if (i % 2 === 0 && rnd() < 0.8) ctx.people.add(st.position.x - 0.2, 0.2, st.position.z, 1); }
    for (let i = 0; i < 6; i++) glow.add(X + 1.6, 3.4 + (i % 2) * 0.3, Z - 4.6 + i * 1.9, 4, red);
    glow.add(X - 0.6, 1.9, Z - 0.3, 9, C('#ffd9a0'));
    ctx.porkLeg = { x: X, z: Z };
  }

  // ------------------------------------------------------------------
  //  Greenway Night Market (OSM polygon)
  // ------------------------------------------------------------------
  {
    const gw = DATA.blds.find(b => b.n.includes('กรีนเวย์')); const P = gw ? ring(gw.p) : [[1624, 954], [1636, 1015], [1718, 1025], [1730, 1004]];
    const bb = bbox(P), pc = pca(P), rot = Math.atan2(pc.uz, pc.ux), ux = Math.cos(rot), uz = Math.sin(rot), vx = -uz, vz = ux;
    ctx.batches.at(bb.cx, bb.cz).prism(P, 0, 0.35, { style: 6, color: C('#4a4a4d'), seed: 0.3, roofColor: C('#3d3d40') });
    const items = []; const L = Math.max(bb.w, bb.d) * 0.85, W = Math.min(bb.w, bb.d) * 0.8;
    for (let a = -L / 2; a <= L / 2; a += 4.3) for (const v of [-W * 0.38, -W * 0.15, W * 0.15, W * 0.38]) { const x = pc.cx + ux * a + vx * v, z = pc.cz + uz * a + vz * v; if (Math.abs(rnd() - 0.5) < 0.46) items.push({ x, z, rot: rot + Math.PI / 2 + (v < 0 ? 0 : Math.PI) }); }
    nightGroups.push(makeStalls(ctx, items, glow, rnd, 'gw'));
    for (const v of [-W * 0.27, 0, W * 0.27]) strings(pc.cx + ux * -L / 2 + vx * v, pc.cz + uz * -L / 2 + vz * v, pc.cx + ux * L / 2 + vx * v, pc.cz + uz * L / 2 + vz * v, 5.2, 2.2);
    const tex = signTex([{ text: 'GREENWAY NIGHT MARKET', font: 'bold 62px system-ui,sans-serif' }, { text: 'ตลาดกรีนเวย์ ไนท์มาร์เก็ต', font: '44px "Noto Sans Thai",system-ui,sans-serif' }], { w: 1024, h: 190, bg: '#06251a', fg: '#9bffb4', border: '#33ff88' });
    const ex = pc.cx - ux * (L / 2 + 6), ez = pc.cz - uz * (L / 2 + 6);
    const sg = signPlane(tex, 18, 3.3, ex, 8.5, ez, Math.atan2(ux, uz)); const sg2 = signPlane(tex, 18, 3.3, ex, 8.5, ez, Math.atan2(ux, uz) + Math.PI);
    for (const s of [-1, 1]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 8, 8), new THREE.MeshStandardMaterial({ color: 0x2a2a2a })); pl.position.set(ex + vx * 9.5 * s, 4, ez + vz * 9.5 * s); scene.add(pl); }
    for (let i = 0; i < 260; i++) ctx.people.add(pc.cx + ux * (rnd() - 0.5) * L + vx * (rnd() - 0.5) * W, 0.4, pc.cz + uz * (rnd() - 0.5) * L + vz * (rnd() - 0.5) * W, 1);
    for (let i = 0; i < 14; i++) glow.add(pc.cx + ux * (rnd() - 0.5) * L, 9, pc.cz + uz * (rnd() - 0.5) * L, 26, C('#7dffa8'));
    ctx.greenway = { x: bb.cx, z: bb.cz };
  }

  glow.build(scene);
  ctx.update.push((dt, t, S) => {
    const on = S.win > 0.3; for (const g of nightGroups) g.visible = on;
    glow.mat.uniforms.uInt.value = on ? 0.15 + 1.0 * S.win : 0.0;
  });
}
