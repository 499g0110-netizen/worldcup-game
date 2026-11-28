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
    // stalls line both kerbs of the streets around the hotel and spill into the shophouse arcades;
    // some vendors sell straight from the back of a pickup truck
    const items = [], pickups = []; const near = (x, z) => Math.hypot(x + 10, z - 40) < 230;
    for (const r of ctx.roads) { if (!r.osm || (r.cls === 'minor' && !r.cobble)) continue;
      for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 4) continue;
        const ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
        for (let s = 2; s < L - 2; s += 3.7) { const px = a[0] + ux * s, pz = a[1] + uz * s; if (!near(px, pz)) continue;
          for (const side of [-1, 1]) { if (rnd() < 0.15) continue;
            if (rnd() < 0.12) { pickups.push({ x: px + nx * (r.w / 2 - 1.2) * side, z: pz + nz * (r.w / 2 - 1.2) * side, yaw: Math.atan2(ux, uz), nx: nx * side, nz: nz * side }); continue; }
            const off = r.w / 2 + 0.55, Fx = nx * side, Fz = nz * side; items.push({ x: px + Fx * off, z: pz + Fz * off, rot: Math.atan2(-Fx, Fz) }); } } } }
    for (const f of (ctx.shopfronts || [])) { if (!near(f.x, f.z) || rnd() < 0.4) continue; items.push({ x: f.x + f.fnx * 1.35, z: f.z + f.fnz * 1.35, rot: Math.atan2(-f.fnx, f.fnz) }); }
    while (items.length > 300) items.splice(Math.floor(rnd() * items.length), 1);
    const g = makeStalls(ctx, items, glow, rnd, 'lee'); nightGroups.push(g);
    // pickup-truck stalls: open bed with a tarp canopy, goods and a hanging bulb
    { const PG = new THREE.Group(); const n = pickups.length || 1;
      const mk = (geo, col) => { const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.4 }), n); im.castShadow = true; im.frustumCulled = false; PG.add(im); return im; };
      const cab = mk(new THREE.BoxGeometry(1.8, 1.5, 2.2), 0xffffff), bed = mk(new THREE.BoxGeometry(1.8, 0.7, 2.4), 0xffffff), wheel = mk(new THREE.CylinderGeometry(0.36, 0.36, 1.86, 12), 0x141414);
      const tarpM = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.05, 3.2), new THREE.MeshStandardMaterial({ roughness: 0.8 }), n); tarpM.frustumCulled = false; PG.add(tarpM);
      const goodsM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 0.35, 0.45), new THREE.MeshStandardMaterial({ roughness: 0.6 }), n * 8); goodsM.frustumCulled = false; PG.add(goodsM);
      const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), U = new THREE.Vector3(0, 1, 0), V = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1), col = new THREE.Color(); let gi = 0;
      const pal = ['#f2f2ee', '#c8ccd0', '#2a2c30', '#8a1c1c', '#1d3c6e', '#a8a08a'];
      pickups.forEach((p, i) => { Q.setFromAxisAngle(U, p.yaw); const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
        const at = (f, h, y) => V.set(p.x + fx * f + p.nx * h, y, p.z + fz * f + p.nz * h);
        M4.compose(at(1.4, 0, 1.15), Q, S1); cab.setMatrixAt(i, M4); M4.compose(at(-1.0, 0, 0.75), Q, S1); bed.setMatrixAt(i, M4); col.set(pal[i % pal.length]); cab.setColorAt(i, col); bed.setColorAt(i, col);
        M4.compose(at(0.2, 0, 0.36), Q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)), S1); wheel.setMatrixAt(i, M4);
        M4.compose(at(-1.0, 0.4, 2.7), Q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.18)), S1); tarpM.setMatrixAt(i, M4); col.set(TARPS[i % TARPS.length]); tarpM.setColorAt(i, col);
        for (let k = 0; k < 8; k++) { M4.compose(at(-1.9 + (k % 4) * 0.55, -0.4 + Math.floor(k / 4) * 0.6, 1.3), Q, S1); goodsM.setMatrixAt(gi, M4); col.setHSL(rnd(), 0.6, 0.5); goodsM.setColorAt(gi, col); gi++; }
        glow.add(at(-1.0, 0.3, 2.3).x, 2.3, V.z, 4.5, C('#ffcf80'));
        const vi = ctx.people.add(at(-1.6, 0, 0).x, 1.1, V.z, 1); const ci = ctx.people.add(at(-1.0, 1.9, 0).x, 0.12, V.z, 1);
      });
      for (const m of [cab, bed, tarpM]) { m.count = pickups.length; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
      wheel.count = pickups.length; wheel.instanceMatrix.needsUpdate = true; goodsM.count = gi; goodsM.instanceMatrix.needsUpdate = true; goodsM.instanceColor.needsUpdate = true;
      scene.add(PG); nightGroups.push(PG); }
    // crowd strolling the kerbs and arcades
    for (let i = 0; i < 220; i++) { const it = items[Math.floor(rnd() * items.length)]; if (!it) break; ctx.people.add(it.x - Math.sin(it.rot) * (1.6 + rnd() * 2.5), 0.12, it.z + Math.cos(it.rot) * (1.6 + rnd() * 2.5), 1); }
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
  //  Greenway Street Life + Food Station (OSM polygon; layout from reference photos)
  // ------------------------------------------------------------------
  {
    const gw = DATA.blds.find(b => b.n.includes('กรีนเวย์')); const P = gw ? ring(gw.p) : [[1624, 954], [1636, 1015], [1718, 1025], [1730, 1004]];
    const bb = bbox(P), pc = pca(P), rot = Math.atan2(pc.uz, pc.ux), ux = Math.cos(rot), uz = Math.sin(rot), vx = -uz, vz = ux;
    ctx.batches.at(bb.cx, bb.cz).prism(P, 0, 0.3, { style: 6, color: C('#5a5a5c'), seed: 0.3, roofColor: C('#4a4a4c'), collide: false });
    const G = new THREE.Group(); G.position.set(pc.cx, 0, pc.cz); G.rotation.y = -rot; scene.add(G);   // local x = long axis, z = across
    const toW = (x, z) => [pc.cx + ux * x + vx * z, pc.cz + uz * x + vz * z];
    const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, o));
    const gp = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; G.add(o); return o; };
    const L = 64, W = 30, x0 = -18;   // tent hall along x, centred a little west
    // white barrel-vault tensile tent (translucent fabric glows at night)
    const fab = new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 0.75, side: THREE.DoubleSide, emissive: 0xffe2b0, emissiveIntensity: 0.0 }); ctx.nightMats.push({ mat: fab, base: 0.0, k: 0.55 });
    const vault = new THREE.CylinderGeometry(W / 2, W / 2, L, 40, 1, true, -Math.PI / 2, Math.PI); vault.rotateZ(Math.PI / 2); const vt = gp(vault, fab, x0, 5.2, 0); vt.scale.set(1, 0.62, 1);
    for (let i = 0; i <= 8; i++) { const ax = x0 - L / 2 + i * L / 8; const arch = new THREE.TorusGeometry(W / 2, 0.16, 6, 40, Math.PI); const t = gp(arch, std(0xdadcde, { metalness: 0.7, roughness: 0.3 }), ax, 5.2, 0, Math.PI / 2); t.scale.set(1, 0.62, 1); }
    for (let i = 0; i <= 8; i++) for (const s of [-1, 1]) gp(new THREE.CylinderGeometry(0.16, 0.2, 5.2, 8), std(0xdadcde, { metalness: 0.7 }), x0 - L / 2 + i * L / 8, 2.6, s * (W / 2 - 0.2));
    // front arch fascia with the sign
    const sTex = canvasTex(1024, 300, (g, w, h) => { g.fillStyle = '#f4f2ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#5a6a72'; g.font = '22px "Noto Sans Thai",system-ui'; g.textAlign = 'center'; g.fillText('กรีนเวย์ สตรีทไลฟ์', w / 2, 52);
      g.font = 'bold 92px system-ui,sans-serif'; g.fillStyle = '#1e6a5a'; g.fillText('Greenway', w / 2, 140);
      const word = 'Street Life', cols = ['#d33a5a', '#e8742a', '#2a7ad0', '#7a3aa8', '#e8a31d', '#1f8a4c'], f = 'bold italic 104px system-ui,sans-serif'; g.font = f; let x = w / 2 - g.measureText(word).width / 2; g.textAlign = 'left';
      [...word].forEach((ch, i) => { g.fillStyle = ch === ' ' ? '#000' : (i === 0 || i === 7 ? cols[i % 6] : '#2a2a30'); g.fillText(ch, x, 255); x += g.measureText(ch).width; }); }, { clamp: true });
    const sMat = new THREE.MeshStandardMaterial({ map: sTex, emissiveMap: sTex, emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.7 }); ctx.signMats.push(sMat); sMat.userData.k = 0.55;
    const front = new THREE.Shape(); front.moveTo(-W / 2 - 0.5, 4.2); front.lineTo(W / 2 + 0.5, 4.2); front.absarc(0, 4.2, W / 2 + 0.5, 0, Math.PI, false);
    const hole = new THREE.Path(); hole.moveTo(-W / 2 + 0.6, 4.2); hole.lineTo(W / 2 - 0.6, 4.2); hole.absarc(0, 4.2, W / 2 - 0.6, 0, Math.PI, false);
    const fasc = new THREE.Mesh(new THREE.PlaneGeometry(W, 6.4), sMat); fasc.position.set(x0 + L / 2 + 0.2, 7.9, 0); fasc.rotation.y = Math.PI / 2; G.add(fasc);
    gp(new THREE.BoxGeometry(0.3, 1.4, W + 1), fab, x0 + L / 2 + 0.1, 4.4, 0);
    // stalls inside the tent: clothes, toys, souvenirs, snacks
    const items = []; for (let x = x0 - L / 2 + 3; x < x0 + L / 2 - 2; x += 3.6) for (const z of [-11, -6.5, 6.5, 11]) { const [wx, wz] = toW(x, z); items.push({ x: wx, z: wz, rot: rot + Math.PI / 2 + (z > 0 ? Math.PI : 0) }); }
    nightGroups.push(makeStalls(ctx, items, glow, rnd, 'gw'));
    for (const z of [-8.8, 0, 8.8]) strings(...toW(x0 - L / 2, z), ...toW(x0 + L / 2, z), 6.3, 2.0);
    for (let i = 0; i < 26; i++) { const [wx, wz] = toW(x0 - L / 2 + i * 2.5, 0); glow.add(wx, 7.6, wz, 9, C('#fff1d8')); }
    // ---- Greenway Food Station: steel frame, wooden slat screen, lanterns, neon sign ----
    const fx = x0 + L / 2 + 26, fz = 2;
    const wood = std(0x9a6a3a, { roughness: 0.7 }), steel = std(0x2a2c30, { metalness: 0.7, roughness: 0.35 }), glassM = new THREE.MeshPhysicalMaterial({ color: 0xd8e6ea, transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false });
    gp(new THREE.BoxGeometry(22, 0.4, 18), std(0x8a8a86), fx, 0.2, fz); gp(new THREE.BoxGeometry(22, 0.4, 18), steel, fx, 4.6, fz); gp(new THREE.BoxGeometry(23, 0.5, 19), steel, fx, 9.2, fz);
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) gp(new THREE.BoxGeometry(0.35, 9.2, 0.35), steel, fx - 10 + i * 5, 4.6, fz + s * 8.8);
    for (let i = 0; i < 46; i++) gp(new THREE.BoxGeometry(0.12, 4.0, 0.25), wood, fx - 10.8, 6.8, fz - 8.6 + i * 0.38);   // slat screen (street side)
    gp(new THREE.PlaneGeometry(17, 3.8), glassM, fx - 10.9, 2.3, fz, Math.PI / 2);
    const neon = canvasTex(768, 200, (g, w, h) => { g.fillStyle = '#0a0d10'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.shadowBlur = 18;
      g.shadowColor = '#3affb0'; g.fillStyle = '#7dffc8'; g.font = 'bold 84px system-ui,sans-serif'; g.fillText('Greenway', w / 2, 90);
      const f = 'bold 64px system-ui,sans-serif'; g.font = f; const t = 'FOOD STATION', cols = ['#ff4a6a', '#ffb02a', '#3ad0ff', '#c46aff']; let x = w / 2 - g.measureText(t).width / 2; g.textAlign = 'left';
      [...t].forEach((ch, i) => { g.shadowColor = g.fillStyle = cols[i % 4]; g.fillText(ch, x, 175); x += g.measureText(ch).width; }); }, { clamp: true });
    const nm = new THREE.MeshStandardMaterial({ map: neon, emissiveMap: neon, emissive: 0xffffff, emissiveIntensity: 1.0 }); ctx.signMats.push(nm); nm.userData.k = 1.4;
    const np = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.1), nm); np.position.set(fx - 11.05, 7.2, fz); np.rotation.y = -Math.PI / 2; G.add(np);
    for (let i = 0; i < 10; i++) { const [wx, wz] = toW(fx - 9 + (i % 5) * 4.5, fz - 6 + Math.floor(i / 5) * 12); glow.add(wx, 7.8, wz, 4, C('#ffb04a')); glow.add(wx, 3.6, wz, 3.5, C('#ffcf7a')); }
    const red = std(0xd0302a, { emissive: 0xff5020, emissiveIntensity: 0.4 }); ctx.nightMats.push({ mat: red, base: 0.2, k: 1.4 });
    for (let i = 0; i < 8; i++) gp(new THREE.SphereGeometry(0.42, 12, 10), red, fx - 10 + i * 2.8, 4.0, fz + 8.9);
    for (let i = 0; i < 18; i++) { const [wx, wz] = toW(fx - 8 + (i % 6) * 3, fz - 6 + Math.floor(i / 6) * 5); ctx.people.add(wx, 4.85, wz, 1); }
    // lawn with an original mascot statue, motorbike row, lighting truss tower, palms
    gp(new THREE.BoxGeometry(14, 0.12, 12), std(0x4a8a3a, { roughness: 1 }), fx - 2, 0.3, fz - 18);
    { const mx = fx - 2, mz = fz - 18, pink = std(0xf0a8c8, { roughness: 0.45 }), skin = std(0xf2d0b0, { roughness: 0.5 }), dark = std(0x2a1a1a);
      gp(new THREE.CylinderGeometry(1.2, 1.5, 0.6, 20), std(0xdadada), mx, 0.6, mz); gp(new THREE.CapsuleGeometry(0.75, 0.8, 6, 14), pink, mx, 1.9, mz);
      gp(new THREE.SphereGeometry(1.15, 22, 16), skin, mx, 3.55, mz); gp(new THREE.SphereGeometry(1.22, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), dark, mx, 3.7, mz - 0.05);
      for (const s of [-1, 1]) { gp(new THREE.SphereGeometry(0.16, 10, 8), dark, mx + s * 0.38, 3.55, mz + 1.02); gp(new THREE.SphereGeometry(0.4, 12, 10), dark, mx + s * 0.95, 4.5, mz); }
      gp(new THREE.TorusGeometry(0.22, 0.05, 6, 12, Math.PI), std(0xc0405a), mx, 3.2, mz + 1.08); }
    const bikeG = new THREE.BoxGeometry(0.45, 0.9, 1.8), bikes = new THREE.InstancedMesh(bikeG, std(0x30343a, { metalness: 0.6, roughness: 0.4 }), 14); const mm4 = new THREE.Matrix4(); const bc = new THREE.Color();
    for (let i = 0; i < 14; i++) { mm4.makeTranslation(fx - 16 + i * 1.0, 0.75, fz - 26); bikes.setMatrixAt(i, mm4); bc.setHSL(rnd(), 0.4, 0.25 + rnd() * 0.3); bikes.setColorAt(i, bc); } G.add(bikes);
    for (let k = 0; k < 4; k++) { const y = 2 + k * 4; for (const [a, b] of [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]]) gp(new THREE.CylinderGeometry(0.06, 0.06, 4, 5), steel, x0 + L / 2 + 6 + a, y, W / 2 + 4 + b); }
    { const [wx, wz] = toW(x0 + L / 2 + 6, W / 2 + 4); glow.add(wx, 16.5, wz, 22, C('#ffffff')); }
    ctx.extraTrees = ctx.extraTrees || []; for (let i = 0; i < 10; i++) { const [wx, wz] = toW(x0 - L / 2 + i * 9, -W / 2 - 6); ctx.extraTrees.push([wx, wz, 1.4 + rnd() * 0.6]); }
    for (let i = 0; i < 320; i++) { const [wx, wz] = toW(x0 - L / 2 + rnd() * (L + 30), (rnd() - 0.5) * (W - 4)); ctx.people.add(wx, 0.4, wz, 1); }
    ctx.greenway = { x: bb.cx, z: bb.cz };
  }

  glow.build(scene);
  ctx.update.push((dt, t, S) => {
    const on = S.win > 0.3; for (const g of nightGroups) g.visible = on;
    glow.mat.uniforms.uInt.value = on ? 0.15 + 1.0 * S.win : 0.0;
  });
}
