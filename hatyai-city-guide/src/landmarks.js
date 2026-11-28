import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DATA, ribbon, ribGeo, groundY } from './world.js';
import { clamp, mulberry32, signTex, canvasTex, pca, glowTex } from './util.js';
import { GlowSet } from './props.js';
import { Humans } from './life.js';
import { buildLeeGroundFloor } from './mcd.js';
import { reserve2 } from './landmarks2.js';

const C = (h) => new THREE.Color(h);
const ring = (p) => (p.length > 3 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1]) ? p.slice(0, -1) : p;
const find = (key) => DATA.blds.filter(b => b.n.includes(key));
const cen = (pts) => { let x = 0, z = 0; for (const p of pts) { x += p[0]; z += p[1]; } return [x / pts.length, z / pts.length]; };
const bbox = (pts) => { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const p of pts) { a = Math.min(a, p[0]); b = Math.max(b, p[0]); c = Math.min(c, p[1]); d = Math.max(d, p[1]); } return { x0: a, x1: b, z0: c, z1: d, w: b - a, d: d - c, cx: (a + b) / 2, cz: (c + d) / 2 }; };

export const HERO = {
  lee: { x: 0, z: 0 },
  centara: { x: -80, z: 8 },
  regency: { x: -82, z: 96 },
};

// ----- reservation of footprints before the infill pass -----
export function reserve(ctx, occ) {
  for (const b of DATA.blds) {
    if (['reservoir', 'residential', 'religious', 'neighbourhood', 'parking'].includes(b.t) || b.c === 'landuse' || b.c === 'place') continue;
    if (b.p.some(p => Math.abs(p[0]) > 7000 || Math.abs(p[1]) > 7000)) continue;
    occ.poly(ring(b.p), 4);
  }
  reserve2(occ);
  occ.mark(-18, 4, 90, 60, -0.11, 4);                       // Lee Gardens + portal
  occ.mark(-80, 8, 56, 42, 0, 2);                           // Centara
  occ.mark(-82, 96, 62, 62, 0, 2);                          // Regency (round podium)
  occ.mark(-4, 88, 62, 110, 0, 0);                          // stall plaza east of the cobbled street
  occ.mark(240, -4460, 260, 160, 0, 0);                     // floating market
  occ.mark(280, -4414, 1100, 100, 0, 0);                    // canal water
  occ.mark(4330, -3900, 500, 500, 0, 0);
  // rail corridor
  const st = find('สถานีรถไฟชุมทางหาดใหญ่')[0];
  if (st) {
    const P = pca(ring(st.p)); ctx.rail = { cx: P.cx, cz: P.cz, ux: P.ux, uz: P.uz };
    for (let t = -3000; t <= 3000; t += 8) { const x = P.cx + P.ux * t + (-P.uz) * -24, z = P.cz + P.uz * t + P.ux * -24; for (let a = -8; a <= 8; a += 3) occ.mark(x + (-P.uz) * a * -1, z + P.ux * a * -1, 3, 8, 0, 0); }
  }
}

// ------------------------------------------------------------------
export function buildLandmarks(ctx) {
  const { scene, batches, rnd0 } = ctx; const rnd = mulberry32(4242);
  ctx.signMats = []; ctx.nightMats = []; ctx.blink = new GlowSet('blink', 40); ctx.glowSets.push(ctx.blink);
  ctx.update = ctx.update || [];
  const people = new Humans(ctx, 4600); ctx.people = people;
  ctx.signMats = ctx.signMats || []; ctx.nightMats = ctx.nightMats || [];
  const add = (geo, mat, x, y, z, ry = 0, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m; };
  const stdMat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8 }, o));
  const signMat = (tex, glow = 1.0) => { const m = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.6 }); m.userData.k = glow; ctx.signMats.push(m); return m; };
  const signPlane = (tex, w, h, x, y, z, ry, glow) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), signMat(tex, glow)); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; };
  const goldMat = stdMat(0xd9a93a, { metalness: 0.85, roughness: 0.28, emissive: 0x7a4a08, emissiveIntensity: 0.1 }); ctx.nightMats.push({ mat: goldMat, base: 0.08, k: 0.9 });
  const wlightGlow = new GlowSet('lamp', 60); ctx.glowSets.push(wlightGlow);
  const warm = C('#ffb25a'), cool = C('#cfe4ff'), red = C('#ff2a1a');
  const extrude = (pts, y0, h, style, color, seed, extra = {}) => { const c = cen(pts); batches.at(c[0], c[1]).prism(pts, y0, h, Object.assign({ style, color, seed }, extra)); };

  // =================================================================
  //  LEE GARDENS PLAZA HOTEL  (centre of the guide)
  // =================================================================
  {
    const LG = ring(find('Lee Gardens Plaza')[0].p);
    const B = batches.at(0, 0);
    B.prism(LG, 5.4, 9.6, { style: 4, color: C('#d9d0ba'), seed: 0.21, roofColor: C('#8b8a85'), vOff: 5 });
    buildLeeGroundFloor(ctx, LG);
    // tower: cream fins + green bands (matches photos), long axis along the street (N–S)
    B.box(-17, 0, 30, 40, -0.11, 15, 80, { style: 2, color: C('#e9e5d6'), seed: 0.37, resetU: true, roofColor: C('#8a8a86') });
    // roof plant, tanks, dome
    B.box(-17, 0, 18, 24, -0.11, 95, 6, { style: 6, color: C('#d4cfc0'), seed: 0.5 });
    B.box(-16, 1, 8, 10, -0.11, 101, 4, { style: 6, color: C('#c9c4b4'), seed: 0.6 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(5.5, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), stdMat(0xe8e4d8, { roughness: 0.4, metalness: 0.3 }));
    dome.position.set(-16, 105, 1); dome.castShadow = true; scene.add(dome);
    add(new THREE.CylinderGeometry(0.15, 0.25, 22, 6), stdMat(0xaaaaaa, { metalness: 0.7 }), -16, 116, 1);
    ctx.blink.add(-16, 127.5, 1, 9, red);
    for (const [dx, dz] of [[-24, -16], [-8, -16], [-24, 18], [-8, 18]]) ctx.blink.add(dx, 96, dz, 4, red);
    ctx.lee = { top: 127, x: -16, z: 1 };
    // entrance portal (travertine columns + canopy + sign)  – west side, facing the cobbled street
    const stone = stdMat(0xd8cab0, { roughness: 0.55 });
    for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(1.4, 7.5, 1.4), stone, -36.5, 3.75, -7 + i * 5.2);
    add(new THREE.BoxGeometry(5.5, 1.2, 28), stone, -36.0, 8.1, 3.8);
    add(new THREE.BoxGeometry(5.0, 0.35, 27), stdMat(0x2b3a2e, { roughness: 0.5 }), -36.0, 8.9, 3.8);
    const lgTex = signTex([{ text: 'LEE GARDENS PLAZA HOTEL', font: 'bold 44px system-ui, sans-serif' }, { text: 'โรงแรม ลี การ์เด้นส์ พลาซ่า หาดใหญ่', font: '32px "Noto Sans Thai", system-ui, sans-serif' }], { w: 1024, h: 160, bg: '#0e3a28', fg: '#f1deb0', border: '#d6b45a' });
    signPlane(lgTex, 22, 3.4, -38.9, 10.6, 3.6, -Math.PI / 2, 1.0);
    // oval "L" logo
    const lg = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#103f2b'; g.beginPath(); g.ellipse(128, 128, 118, 84, -0.35, 0, 7); g.fill(); g.strokeStyle = '#d9b45a'; g.lineWidth = 8; g.stroke(); g.fillStyle = '#e9d9a0'; g.font = 'italic bold 120px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('L', 128, 134); }, { clamp: true });
    const lgm = new THREE.MeshBasicMaterial({ map: lg, transparent: true, toneMapped: true }); const lgp = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), lgm); lgp.position.set(-31.6, 12.6, -20); lgp.rotation.y = -Math.PI / 2 - 0.11; scene.add(lgp);
    // podium sign near the top of tower base on south face
    signPlane(signTex([{ text: 'LEE GARDENS', font: 'bold 62px system-ui,sans-serif' }], { w: 512, h: 100, bg: '#0e3a28', fg: '#f1deb0' }), 14, 2.6, -16, 16.4, 20.5, 0, 1.0);
    // McDonald's: golden arches on pole at the podium SW corner + ground-floor sign (as in the photos)
    const arches = new THREE.Group(); const am = new THREE.MeshStandardMaterial({ color: 0xffc400, emissive: 0xffaa00, emissiveIntensity: 0.6, roughness: 0.4 }); ctx.nightMats.push({ mat: am, base: 0.35, k: 1.4 });
    for (const sx of [-1, 1]) { const t = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.3, 10, 24, Math.PI), am); t.position.x = sx * 1.0; t.scale.y = 1.35; arches.add(t); for (const k of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.001, 8), am); } }
    arches.scale.setScalar(1.7); arches.position.set(-33.5, 10.6, 27.5); arches.rotation.y = -0.12; scene.add(arches);
    add(new THREE.CylinderGeometry(0.22, 0.28, 8.5, 8), stdMat(0xcfcfcf, { metalness: 0.7, roughness: 0.4 }), -33.5, 4.2, 27.5);
    ctx.blink.add(-33.5, 11.5, 27.5, 12, C('#ffc24a'));
  }

  // =================================================================
  //  CENTARA HAT YAI – dark/white panel tower with blue glass shaft
  // =================================================================
  {
    const B = batches.at(-80, 8), cx = -80, cz = 8;
    B.box(cx, cz, 52, 34, 0, 0, 12, { style: 4, color: C('#cfc6b2'), seed: 0.71 });
    B.box(cx - 10, cz, 20, 26, 0, 12, 80, { style: 3, color: C('#5d626b'), seed: 0.81, resetU: true });
    B.box(cx + 10, cz, 20, 26, 0, 12, 80, { style: 3, color: C('#ecebe6'), seed: 0.17, resetU: true });
    B.box(cx, cz + 13.4, 7, 2.6, 0, 12, 80, { style: 10, color: C('#2a6a7a'), seed: 0.4 });
    B.box(cx, cz + 3, 7, 18, 0, 92, 7, { style: 10, color: C('#2a6a7a'), seed: 0.9 });
    B.box(cx, cz + 3, 4.6, 12, 0, 99, 6, { style: 10, color: C('#2a6a7a'), seed: 0.4 });
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(4, 0.35, 8, 28), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4 })); ring2.position.set(cx, 112, cz + 3); scene.add(ring2);
    ctx.nightMats.push({ mat: ring2.material, base: 0.3, k: 1.6 });
    ctx.blink.add(cx, 106, cz + 3, 8, red);
    signPlane(signTex([{ text: 'CENTARA', font: 'bold 80px system-ui,sans-serif' }, { text: 'HAT YAI', font: '40px system-ui,sans-serif' }], { w: 512, h: 160, bg: '#1b1c20', fg: '#f3f0e6' }), 11, 3.2, cx, 9, cz + 17.2, 0, 1.0);
    ctx.centara = { x: cx, z: cz };
  }

  // =================================================================
  //  Regency-style round hotel podium (visible in the photos; decorative placement)
  // =================================================================
  {
    const B = batches.at(-82, 96);
    B.cyl(-82, 96, 22, 0, 16, 28, { style: 4, color: C('#e1d9c6'), seed: 0.33, roofColor: C('#8e8b84') });
    B.cyl(-82, 96, 14, 16, 5, 20, { style: 6, color: C('#cfc8b6'), seed: 0.9 });
    const gm = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.3, 20), goldMat); gm.position.set(-82, 21.6, 96); scene.add(gm);
    signPlane(signTex([{ text: 'THE REGENCY', font: 'bold 64px serif' }], { w: 512, h: 100, bg: '#2a1f12', fg: '#e8c874', border: '#caa24a' }), 12, 2.4, -82, 14.6, 118.5, 0, 1.0);
  }

  // =================================================================
  //  Cobbled street (Sanehanusorn Rd) – stalls, curb stripes, parked bikes
  // =================================================================
  const cobbles = ctx.roads.filter(r => r.cobble);
  let street = [];
  {
    const r2 = cobbles.find(r => r.pts[0][1] > 300) || cobbles[0], r1 = cobbles.find(r => r !== r2);
    street = r2 && r1 ? r2.pts.concat(r1.pts.slice(1)) : (r2 ? r2.pts : []);
    ctx.street = street;
  }
  const cum = [0]; for (let i = 1; i < street.length; i++) cum.push(cum[i - 1] + Math.hypot(street[i][0] - street[i - 1][0], street[i][1] - street[i - 1][1]));
  const SL = cum[cum.length - 1] || 1;
  const along = (s, off = 0) => {
    s = clamp(s, 0, SL); let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const a = street[i - 1], b = street[i], seg = cum[i] - cum[i - 1] || 1, t = (s - cum[i - 1]) / seg;
    const dx = (b[0] - a[0]) / seg, dz = (b[1] - a[1]) / seg;
    return { x: a[0] + (b[0] - a[0]) * t + -dz * off, z: a[1] + (b[1] - a[1]) * t + dx * off, dx, dz, yaw: Math.atan2(dx, dz) };
  };
  ctx.along = along; ctx.streetLen = SL;
  if (street.length) {
    // red/white curb on the west pavement (as in the photo)
    const curbTex = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#d9d9d6'; g.fillRect(0, 0, w, h); g.fillStyle = '#c4262a'; g.fillRect(0, 0, w, h / 2); });
    const co = { pos: [], uv: [], idx: [] }; ribbon(street, 0.55, (x, z) => 0.2, 2, co, -(12.5 / 2 + 0.2)); ribbon(street, 0.55, (x, z) => 0.2, 2, co, (12.5 / 2 + 0.2));
    const cm = new THREE.Mesh(ribGeo(co), new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 })); cm.receiveShadow = true; scene.add(cm);
    // street-food stalls with red awnings (east side, in front of McDonald's / the plaza) – green plastic stools
    const awnTex = canvasTex(128, 128, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f2f2ee' : '#c1272d'; g.fillRect(i * 16, 0, 16, h); } });
    const awn = new THREE.MeshStandardMaterial({ map: awnTex, roughness: 0.8, side: THREE.DoubleSide });
    const stool = new THREE.MeshStandardMaterial({ color: 0x1fb86a, roughness: 0.5 }), metal = stdMat(0x9aa0a6, { metalness: 0.7, roughness: 0.35 }), woodM = stdMat(0x6b4a2a);
    const stoolG = new THREE.CylinderGeometry(0.22, 0.2, 0.42, 8), tabG = new THREE.BoxGeometry(1.2, 0.06, 0.7), awnG = new THREE.BoxGeometry(2.8, 0.06, 2.4), cartG = new THREE.BoxGeometry(1.5, 0.9, 0.8);
    const N = 0; const stoolI = new THREE.InstancedMesh(stoolG, stool, N * 5), tabI = new THREE.InstancedMesh(tabG, metal, N), awnI = new THREE.InstancedMesh(awnG, awn, N), cartI = new THREE.InstancedMesh(cartG, metal, N);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0); let si = 0;
    for (let i = 0; i < N; i++) {
      const s = SL - 28 - i * 7.4 - rnd() * 1.5; if (s < 20) break;
      const side = i % 5 === 4 ? -1 : 1; // a few on the west
      const P = along(s, side * (12.5 / 2 + 3.6)), yaw = P.yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      q.setFromAxisAngle(up, yaw);
      m.compose(new THREE.Vector3(P.x, 2.2, P.z), new THREE.Quaternion().setFromAxisAngle(up, yaw).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.12)), new THREE.Vector3(1, 1, 1)); awnI.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(P.x, 0.9, P.z), q, new THREE.Vector3(1, 1, 1)); tabI.setMatrixAt(i, m);
      const cp = along(s, side * (12.5 / 2 + 5.0)); m.compose(new THREE.Vector3(cp.x, 0.5, cp.z), q, new THREE.Vector3(1, 1, 1)); cartI.setMatrixAt(i, m);
      for (let k = 0; k < 5; k++) { const sp = along(s + (k - 2) * 0.55, side * (12.5 / 2 + 1.8 + (k % 2) * 0.5)); m.compose(new THREE.Vector3(sp.x, 0.22, sp.z), q, new THREE.Vector3(1, 1, 1)); stoolI.setMatrixAt(si++, m); }
      // warm lamp + people
      wlightGlow.add(P.x, 2.9, P.z, 5, warm); wlightGlow.add(P.x, 1.5, P.z + 0.3, 3.2, i % 3 ? warm : cool);
      for (let k = 0; k < 2 + (i % 3); k++) { const pp = along(s + (rnd() - 0.5) * 5, side * (12.5 / 2 + 1.2 + rnd() * 5)); people.add(pp.x, 0.18, pp.z, 1); }
    }
    for (const mm of [stoolI, tabI, awnI, cartI]) { mm.castShadow = true; mm.receiveShadow = true; mm.frustumCulled = false; mm.instanceMatrix.needsUpdate = true; scene.add(mm); }
    // street crowd walking the cobbles
    for (let i = 0; i < 90; i++) { const p = along(10 + rnd() * (SL - 20), (rnd() - 0.5) * 9); people.add(p.x, 0.12, p.z, 1); }
    // parked motorbikes along the curb
    const bike = mergeGeometries([new THREE.BoxGeometry(0.5, 0.55, 1.7).toNonIndexed(), (() => { const g = new THREE.BoxGeometry(0.4, 0.35, 0.7); g.translate(0, 0.5, -0.3); return g.toNonIndexed(); })()].map(g => { g.deleteAttribute('uv'); return g; }));
    const bikes = new THREE.InstancedMesh(bike, new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.5 }), 70);
    const pal = ['#1b1b1d', '#aa1f1f', '#e8e8e8', '#244a8a', '#d0a21c'], cc = new THREE.Color();
    for (let i = 0; i < 70; i++) { const p = along(18 + rnd() * (SL - 36), -(12.5 / 2 + 0.2 + rnd() * 0.6) * (rnd() < 0.6 ? 1 : -1)); q.setFromAxisAngle(up, p.yaw + (rnd() - 0.5) * 0.4); m.compose(new THREE.Vector3(p.x, 0.5, p.z), q, new THREE.Vector3(1, 1, 1)); bikes.setMatrixAt(i, m); cc.set(pal[i % pal.length]); bikes.setColorAt(i, cc); }
    bikes.frustumCulled = false; scene.add(bikes);
  }

  // =================================================================
  //  Kim Yong market + night market (OSM polygons)
  // =================================================================
  const tarpCols = ['#1d5fb8', '#c8281e', '#e8a31d', '#1f8a4c', '#efefe8', '#7a2d9a'];
  const marketRoof = (cx, cz, w, d, rot, y0, i) => {
    const B = batches.at(cx, cz);
    B.gable(cx, cz, w, d, rot, y0, 2.4 + (i % 3) * 0.3, C(tarpCols[i % tarpCols.length]).multiplyScalar(0.8), 0.5, 0.6);
  };
  const stringLights = (pts, y, every = 2.5) => { for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 0; s < L; s += every) { const t = s / L; wlightGlow.add(a[0] + (b[0] - a[0]) * t, y, a[1] + (b[1] - a[1]) * t, 2.8, rnd() < 0.7 ? warm : cool); } } };
  for (const b of find('Kim Yong Market').concat(find('ตลาดกิมหยง'))) {
    const P = ring(b.p), bb = bbox(P), pc = pca(P);
    extrude(P, 0, 5.2, 6, C('#cfc6b4'), rnd());
    const L = Math.max(bb.w, bb.d), n = Math.round(L / 9);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n - 0.5; const rot = Math.atan2(pc.uz, pc.ux); const wd = Math.min(bb.w, bb.d); marketRoof(bb.cx + pc.ux * t * L, bb.cz + pc.uz * t * L, L / n, wd + 1, rot, 5.2, i); }
    stringLights(P.concat([P[0]]), 4.8, 2.2);
    for (let i = 0; i < 60; i++) people.add(bb.cx + (rnd() - 0.5) * (bb.w + 8), 0.15, bb.cz + (rnd() - 0.5) * (bb.d + 8), 1);
  }
  // night market rows (OSM "Night Market" node)
  {
    const nm = DATA.pois.find(p => p.n === 'Night Market'); if (nm) {
      const [cx, cz] = nm.p; const B = batches.at(cx, cz);
      for (let r = 0; r < 4; r++) for (let i = 0; i < 12; i++) { const x = cx - 24 + i * 4.2, z = cz - 8 + r * 5.6; B.box(x, z, 3.2, 2.4, -0.1, 0, 2.2, { style: 6, color: C('#b9b3a4'), seed: rnd(), roof: false }); marketRoof(x, z, 3.6, 3.0, -0.1, 2.2, r * 12 + i); wlightGlow.add(x, 2.0, z, 3.5, warm); if (rnd() < 0.5) people.add(x + 2.2, 0.15, z + (rnd() - 0.5) * 3, 1); }
      for (let i = 0; i < 70; i++) people.add(cx + (rnd() - 0.5) * 60, 0.15, cz + (rnd() - 0.5) * 30, 1);
    }
  }

  // =================================================================
  //  Hat Yai Junction station + rail + train
  // =================================================================
  const st = find('สถานีรถไฟชุมทางหาดใหญ่')[0];
  if (st && ctx.rail) {
    const P = ring(st.p), R = ctx.rail; const rot = Math.atan2(R.uz, R.ux);
    const B = batches.at(R.cx, R.cz); const ex = -R.uz * -1, ez = R.ux * -1; // east normal
    extrude(P, 0, 9, 4, C('#d9cdb2'), 0.44, { roof: false });
    B.gable(R.cx, R.cz, 132, 28, rot, 9, 5.2, C('#8a3b22'), 0.2, 1.2);
    B.box(R.cx - R.uz * 0, R.cz, 14, 8, rot, 9, 11, { style: 6, color: C('#e1d6bc'), seed: 0.3 });
    // platform + canopy toward the tracks
    const px = R.cx + ex * 17, pz = R.cz + ez * 17;
    B.box(px, pz, 132, 10, rot, 0, 1.0, { style: 6, color: C('#9a978f'), seed: 0.2 });
    B.box(px, pz, 120, 8.5, rot, 5.2, 0.35, { style: 6, color: C('#d7d3c7'), seed: 0.3 });
    for (let t = -56; t <= 56; t += 14) B.box(px + R.ux * t, pz + R.uz * t, 0.5, 0.5, rot, 1.0, 4.2, { style: 6, color: C('#787872'), seed: 0.1 });
    signPlane(signTex([{ text: 'สถานีรถไฟหาดใหญ่', font: 'bold 56px "Noto Sans Thai",system-ui,sans-serif' }, { text: 'HAT YAI JUNCTION', font: '34px system-ui' }], { w: 768, h: 150, bg: '#1d3d6e', fg: '#ffffff' }), 14, 2.6, R.cx - 14.6, 14, R.cz, -Math.PI / 2 - (rot - Math.PI / 2) * 0 + 0.16, 1.0);
    // tracks
    const tr = { pos: [], uv: [], idx: [] }, rl = { pos: [], uv: [], idx: [] };
    const trackPts = []; for (let t = -3200; t <= 3200; t += 40) trackPts.push([R.cx + R.ux * t + ex * 24, R.cz + R.uz * t + ez * 24]);
    ribbon(trackPts, 5.0, 0.18, 5, tr);
    ribbon(trackPts, 0.14, 0.34, 5, rl, 0.72); ribbon(trackPts, 0.14, 0.34, 5, rl, -0.72);
    const trackPts2 = trackPts.map(p => [p[0] + ex * 5, p[1] + ez * 5]); ribbon(trackPts2, 5.0, 0.18, 5, tr); ribbon(trackPts2, 0.14, 0.34, 5, rl, 0.72); ribbon(trackPts2, 0.14, 0.34, 5, rl, -0.72);
    const bal = new THREE.Mesh(ribGeo(tr), new THREE.MeshStandardMaterial({ color: 0x3a3733, roughness: 1, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 })); bal.receiveShadow = true; scene.add(bal);
    const rails = new THREE.Mesh(ribGeo(rl), new THREE.MeshStandardMaterial({ color: 0x8c8f93, roughness: 0.35, metalness: 0.9, polygonOffset: true, polygonOffsetFactor: -7, polygonOffsetUnits: -7 })); scene.add(rails);
    // sleepers
    const slG = new THREE.BoxGeometry(2.6, 0.12, 0.28), slI = new THREE.InstancedMesh(slG, stdMat(0x4b3a2a), 2 * 2200), mm = new THREE.Matrix4(), qq = new THREE.Quaternion(); let k = 0;
    qq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -rot + Math.PI / 2 + Math.PI / 2);
    for (let t = -1100; t < 1100; t += 1.0) for (const o of [24, 29]) { mm.compose(new THREE.Vector3(R.cx + R.ux * t + ex * o, 0.24, R.cz + R.uz * t + ez * o), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(R.ux, R.uz)), new THREE.Vector3(1, 1, 1)); slI.setMatrixAt(k++, mm); }
    slI.count = k; slI.frustumCulled = false; scene.add(slI);
    // train
    const train = new THREE.Group(); const cars = 7, Lc = 21;
    const bodyM = [stdMat(0xd8402a, { roughness: 0.4, metalness: 0.3 }), stdMat(0x2a5aa8, { roughness: 0.4, metalness: 0.3 })];
    for (let i = 0; i < cars; i++) {
      const g = new THREE.Group(); const w = i === 0 ? bodyM[0] : bodyM[1];
      const b = new THREE.Mesh(new THREE.BoxGeometry(2.9, 3.6, Lc - 0.6), w); b.position.y = 2.6; b.castShadow = true; g.add(b);
      const st2 = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.35, Lc - 0.6), stdMat(0xf0e8c8)); st2.position.y = 3.1; g.add(st2);
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.9, Lc - 2), new THREE.MeshStandardMaterial({ color: 0x111418, emissive: 0xffdd99, emissiveIntensity: 0.0, roughness: 0.2 })); win.position.y = 3.2; g.add(win); ctx.nightMats.push({ mat: win.material, base: 0.02, k: 1.1 });
      g.position.z = -i * Lc; train.add(g);
    }
    scene.add(train); ctx.train = { group: train, t: -1400, speed: 11, R, ex, ez, len: cars * Lc };
    const hl = new GlowSet('traffic', 14); hl.add(0, 3.5, 0, 6, C('#fff4d6')); hl.build(scene); ctx.glowSets.push(hl); ctx.train.head = hl;
  }

  // =================================================================
  //  Clock tower, temples, malls, hospital, bus terminal, generic OSM polygons
  // =================================================================
  {
    const c = DATA.pois.find(p => p.n === 'Hat Yai Clock Tower');
    const [x, z] = c ? c.p : [-166, -650]; const B = batches.at(x, z);
    B.box(x, z, 8, 8, 0, 0, 5, { style: 6, color: C('#cfc7b4'), seed: 0.3 });
    B.box(x, z, 5.4, 5.4, 0, 5, 16, { style: 6, color: C('#e7e1d1'), seed: 0.3, roof: false });
    B.gable(x, z, 5.4, 5.4, 0, 21, 4.5, C('#8a3b22'), 0.2, 0.7);
    const ct = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#f6f2e4'; g.fillRect(0, 0, w, h); g.strokeStyle = '#222'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke(); g.lineWidth = 4; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.beginPath(); g.moveTo(64 + Math.sin(a) * 44, 64 - Math.cos(a) * 44); g.lineTo(64 + Math.sin(a) * 50, 64 - Math.cos(a) * 50); g.stroke(); } g.lineWidth = 6; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 30); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(86, 74); g.stroke(); }, { clamp: true });
    const cm = signMat(ct, 1.2);
    for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), cm); const a = i * Math.PI / 2; p.position.set(x + Math.sin(a) * 2.75, 16.5, z + Math.cos(a) * 2.75); p.rotation.y = a; scene.add(p); }
    wlightGlow.add(x, 17, z, 14, warm); ctx.clockTower = { x, z };
  }
  // Wat Thawon Wararam
  for (const b of find('ถาวรวราราม').filter(b => b.p.length > 4)) {
    const P = ring(b.p), bb = bbox(P), B = batches.at(bb.cx, bb.cz);
    B.prism(P, 0, 2.4, { style: 6, color: C('#efe9db'), seed: 0.1, roof: false });
    const ox = bb.cx - bb.w * 0.12, oz = bb.cz;
    B.box(ox, oz, 12, 24, 0, 0, 6.5, { style: 6, color: C('#f0eadb'), seed: 0.2, roof: false });
    B.gable(ox, oz, 12, 24, Math.PI / 2, 6.5, 4.5, C('#cf5a1c'), 0.3, 1.4);
    B.gable(ox, oz, 9, 20, Math.PI / 2, 10.2, 3.2, C('#e0a21a'), 0.3, 1.0);
    const cx = bb.cx + bb.w * 0.28;
    B.box(cx, oz, 8, 8, 0, 0, 3, { style: 6, color: C('#f0eadb'), seed: 0.2 });
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 3.4, 15, 24), goldMat); bell.position.set(cx, 3 + 7.5, oz); bell.castShadow = true; scene.add(bell);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.5, 7, 12), goldMat); spire.position.set(cx, 3 + 15 + 3.5, oz); scene.add(spire);
    wlightGlow.add(cx, 14, oz + 4, 16, warm); wlightGlow.add(ox, 9, oz, 12, warm);
  }
  // Wat Lian Hua Ko (Chinese temple)
  for (const b of find('เลียนฮัวเกาะ').filter(b => b.p.length > 3)) {
    const P = ring(b.p), bb = bbox(P), B = batches.at(bb.cx, bb.cz);
    B.prism(P, 0, 2.2, { style: 6, color: C('#b52a22'), seed: 0.1, roof: false });
    B.box(bb.cx, bb.cz, Math.min(bb.w, 18) - 2, Math.min(bb.d, 18) - 2, 0, 0, 7, { style: 6, color: C('#b3291f'), seed: 0.2, roof: false });
    B.gable(bb.cx, bb.cz, Math.min(bb.w, 18) - 2, Math.min(bb.d, 18) - 2, 0, 7, 4, C('#e6b422'), 0.3, 1.6);
    wlightGlow.add(bb.cx, 9, bb.cz, 14, red); for (let i = 0; i < 10; i++) wlightGlow.add(bb.cx + (rnd() - 0.5) * 16, 5.5, bb.cz + (rnd() - 0.5) * 16, 4, red);
  }
  // malls & department stores
  const mallDef = [['Diana', 30, '#e8d8c0', 'DIANA'], ['โอเดียน', 22, '#d8d2c4', 'ODEON'], ['Robinson', 22, '#d9d9d6', 'ROBINSON'], ["Lotus's", 12, '#d9d9d6', 'LOTUS']];
  for (const [key, h, col, label] of mallDef) for (const b of find(key)) {
    const P = ring(b.p); extrude(P, 0, h, 4, C(col), rnd(), { roofColor: C('#80807c') });
    const bb = bbox(P); const pc = pca(P);
    const t = signTex([{ text: label, font: 'bold 72px system-ui,sans-serif' }], { w: 512, h: 110, bg: '#162a52', fg: '#ffffff' });
    const sw = Math.min(14, Math.max(bb.w, bb.d) * 0.4);
    signPlane(t, sw, sw * 0.215, bb.cx, h + 1.6, bb.cz, 0, 1.2); signPlane(t, sw, sw * 0.215, bb.cx, h + 1.6, bb.cz, Math.PI, 1.2);
    for (let i = 0; i < 20; i++) people.add(bb.cx + (rnd() - 0.5) * (bb.w + 20), 0.15, bb.cz + (rnd() - 0.5) * (bb.d + 20), 1);
  }
  // hospital (PSU)
  for (const b of find('สงขลานครินทร์').filter(b => b.t === 'hospital')) {
    const P = ring(b.p), bb = bbox(P), pc = pca(P), rot = Math.atan2(pc.uz, pc.ux), B = batches.at(bb.cx, bb.cz);
    B.box(bb.cx, bb.cz, bb.w * 0.5, bb.d * 0.45, rot, 0, 24, { style: 1, color: C('#e5e8e9'), seed: 0.2 });
    B.box(bb.cx + 10, bb.cz, 44, 28, rot, 24, 56, { style: 1, color: C('#eceff0'), seed: 0.6, resetU: true });
    for (const [dx, dz, w, d] of [[-0.3, -0.35, 0.28, 0.2], [0.3, 0.3, 0.26, 0.22], [-0.3, 0.32, 0.25, 0.2], [0.34, -0.3, 0.22, 0.22]]) B.box(bb.cx + dx * bb.w, bb.cz + dz * bb.d, bb.w * w, bb.d * d, rot, 0, 16 + rnd() * 8, { style: 1, color: C('#dfe3e4'), seed: rnd() });
    ctx.blink.add(bb.cx + 10, 84, bb.cz, 10, red);
  }
  // bus terminal
  for (const b of find('สถานีขนส่งหาดใหญ่').filter(b => b.t === 'bus_station')) { const P = ring(b.p); extrude(P, 0, 9, 6, C('#d8d2c0'), 0.4); }
  // generic polygons
  const done = new Set(['Lee Gardens Plaza', 'Kim Yong Market', 'ตลาดกิมหยง', 'สถานีรถไฟ', 'ถาวรวราราม', 'เลียนฮัวเกาะ', 'Diana', 'โอเดียน', 'Robinson', 'Central Hatyai', "Lotus's", 'สงขลานครินทร์', 'สถานีขนส่ง', 'ตลาดน้ำคลองแห', 'กรีนเวย์', 'พระพุทธมงคลมหาราช']);
  for (const b of DATA.blds) {
    if ([...done].some(k => b.n.includes(k))) continue;
    if (['reservoir', 'residential', 'religious', 'neighbourhood', 'parking'].includes(b.t) || b.c === 'landuse' || b.c === 'place') continue;
    if (b.p.some(p => Math.abs(p[0]) > 7000 || Math.abs(p[1]) > 7000)) continue;
    const P = ring(b.p); if (P.length < 3) continue; const bb = bbox(P); if (bb.w < 8 || bb.d < 8) continue;
    let h = 14, st = 5, col = C('#dcd2bc');
    if (b.t === 'school') { h = 11; st = 5; col = C('#e9dfc4'); } else if (b.t === 'bank') { h = 15; st = 4; col = C('#d8d8d4'); } else if (b.t === 'post_office') { h = 9; st = 6; } else if (b.t === 'marketplace' || b.t === 'food_court') { h = 5; st = 6; col = C('#cfc6b4'); }
    else if (b.t === 'hotel' || b.t === 'apartments') { h = (parseInt(b.lv) || 8) * 3.3; st = 1; }
    extrude(P, 0, h, st, col, rnd());
    if (b.t === 'marketplace' || b.t === 'food_court') { const pc = pca(P), rot = Math.atan2(pc.uz, pc.ux); batches.at(bb.cx, bb.cz).gable(bb.cx, bb.cz, Math.max(bb.w, bb.d), Math.min(bb.w, bb.d) + 0.5, Math.abs(bb.w) > Math.abs(bb.d) ? 0 : Math.PI / 2, 5, 2.6, C(tarpCols[Math.floor(rnd() * 6)]).multiplyScalar(0.8), 0.5, 0.6); }
  }

  wlightGlow.build(scene);
  ctx.update.push((dt, t, S) => {
    for (const m of ctx.signMats) m.emissiveIntensity = (0.12 + 1.15 * S.win) * (m.userData.k || 1);
    for (const o of ctx.nightMats) o.mat.emissiveIntensity = o.base + o.k * S.win;
    ctx.blink.mat.uniforms.uInt.value = (0.55 + 0.45 * Math.sin(t * 3.1) ** 2) * (0.5 + 0.8 * S.win);
    wlightGlow.mat.uniforms.uInt.value = 0.06 + 1.0 * S.win;
    people.update(t);
    if (ctx.train) {
      const T = ctx.train; T.t += T.speed * dt; if (T.t > 1500) T.t = -1500;
      const R = T.R, x = R.cx + R.ux * T.t + T.ex * 24, z = R.cz + R.uz * T.t + T.ez * 24;
      T.group.position.set(x, 0.4, z); T.group.rotation.y = Math.atan2(R.ux, R.uz);
      T.head.points.geometry.attributes.position.setXYZ(0, x + R.ux * 11, 3.6, z + R.uz * 11); T.head.points.geometry.attributes.position.needsUpdate = true;
    }
  });
  return ctx;
}
