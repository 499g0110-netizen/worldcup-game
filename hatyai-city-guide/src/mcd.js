import * as THREE from 'three';
import { canvasTex, signTex, mulberry32 } from './util.js';
import { FOOTPRINTS } from './facade.js';

// =====================================================================
//  Lee Gardens Plaza – glazed ground floor: fast-food restaurant (west half, by the
//  cobbled street) + hotel lobby (east half), all visible through the glass.
//  Built in the podium's own frame: x along the south façade, z toward the south.
// =====================================================================
const ROT = 0.110;               // podium is rotated ~6.3° (OSM outline)
const HX = 33, HZ = 18.5, FH = 5;

export function buildLeeGroundFloor(ctx, LG) {
  const { scene } = ctx, people = ctx.people; const rnd = mulberry32(1955);
  const g = new THREE.Group(); g.rotation.y = ROT; scene.add(g);
  const toW = (x, z) => { const c = Math.cos(ROT), s = Math.sin(ROT); return [x * c + z * s, -x * s + z * c]; };
  FOOTPRINTS.push(LG);                       // whole building still blocks the walker
  const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, o));
  const box = (w, h, d, x, y, z, m, cast = true) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = cast; b.receiveShadow = true; g.add(b); return b; };

  // ---- floor, ceiling, structure ----
  const floorTex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#d8d2c6'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(90,80,70,.35)'; c.lineWidth = 2; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); } for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(120,110,100,${Math.random() * 0.12})`; c.fillRect(Math.random() * w, Math.random() * h, 3, 3); } });
  floorTex.repeat.set(16, 9);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.25, metalness: 0.1 })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.12; floor.receiveShadow = true; g.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2), std(0xf2efe8, { roughness: 0.9 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = FH - 0.05; g.add(ceil);
  const slab = box(HX * 2 + 0.6, 0.5, HZ * 2 + 0.6, 0, FH + 0.2, 0, std(0xcfc6b2));
  for (let x = -HX + 0.3; x <= HX; x += 8.25) for (const z of [-HZ + 0.3, HZ - 0.3]) box(0.6, FH, 0.6, x, FH / 2, z, std(0xd8cab0, { roughness: 0.45 }));
  // ceiling light panels (glow at night, read by day too)
  const panelM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3dc, emissiveIntensity: 1.6 }); ctx.nightMats.push({ mat: panelM, base: 1.2, k: 1.0 });
  for (let x = -HX + 3; x < HX - 2; x += 4.2) for (let z = -HZ + 3; z < HZ - 2; z += 4.2) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), panelM); p.rotation.x = Math.PI / 2; p.position.set(x, FH - 0.07, z); g.add(p); }
  // interior lights so the inside reads from the street
  

  // ---- glass curtain wall with aluminium mullions ----
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xbfd6dc, roughness: 0.04, metalness: 0.0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.4 });
  const mull = std(0x3a3d42, { metalness: 0.7, roughness: 0.35 });
  const wall = (len, x, z, ry) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(len, FH - 0.3), glass); p.position.set(x, FH / 2, z); p.rotation.y = ry; p.renderOrder = 3; g.add(p); };
  wall(HX * 2, 0, HZ, 0); wall(HX * 2, 0, -HZ, 0); wall(HZ * 2, -HX, 0, Math.PI / 2); wall(HZ * 2, HX, 0, Math.PI / 2);
  for (let x = -HX; x <= HX; x += 2.75) { box(0.09, FH, 0.12, x, FH / 2, HZ, mull, false); box(0.09, FH, 0.12, x, FH / 2, -HZ, mull, false); }
  for (let z = -HZ; z <= HZ; z += 2.75) { box(0.12, FH, 0.09, -HX, FH / 2, z, mull, false); box(0.12, FH, 0.09, HX, FH / 2, z, mull, false); }
  box(HX * 2, 0.12, 0.14, 0, 2.6, HZ, mull, false); box(0.14, 0.12, HZ * 2, -HX, 2.6, 0, mull, false);

  // ---- partition between restaurant and lobby ----
  const red = std(0xc8102e, { roughness: 0.5 }), yellow = std(0xffbc0d, { roughness: 0.5 }), wood = std(0x8a5a36, { roughness: 0.7 }), white = std(0xf4f2ee, { roughness: 0.4 });
  box(0.3, FH, HZ * 2 - 1, -2, FH / 2, 0, std(0xe9e1d2));

  // ================= RESTAURANT (x -33 … -2) =================
  // back wall feature (north) in brand red with yellow band, wood slats
  box(30.5, FH, 0.3, -17.5, FH / 2, -HZ + 0.6, red);
  box(30.5, 0.5, 0.32, -17.5, 3.6, -HZ + 0.62, yellow);
  for (let x = -32; x < -3; x += 0.6) box(0.18, 2.2, 0.08, x, 1.2, -HZ + 0.78, wood, false);
  // service counter
  box(14, 1.05, 1.1, -17.5, 0.62, -HZ + 5.2, red); box(14.2, 0.08, 1.3, -17.5, 1.18, -HZ + 5.2, white);
  // menu boards (lit)
  const menuTex = canvasTex(1024, 256, (c, w, h) => {
    c.fillStyle = '#141414'; c.fillRect(0, 0, w, h);
    const items = [['BURGER SET', '฿159', '#d9822b'], ['CHICKEN', '฿129', '#c9a24a'], ['FRIES', '฿49', '#f2c230'], ['DRINKS', '฿35', '#d33'], ['DESSERT', '฿39', '#e8e2d0'], ['RICE SET', '฿99', '#b86a2a']];
    items.forEach(([n, p, col], i) => { const x = 20 + i * 166; c.fillStyle = '#262626'; c.fillRect(x, 20, 150, 216); c.fillStyle = col; c.beginPath(); c.ellipse(x + 75, 100, 52, 38, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(x + 62, 88, 22, 10, 0, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.font = 'bold 22px system-ui'; c.textAlign = 'center'; c.fillText(n, x + 75, 175); c.fillStyle = '#ffbc0d'; c.font = 'bold 30px system-ui'; c.fillText(p, x + 75, 214); });
  }, { clamp: true });
  const menuM = new THREE.MeshStandardMaterial({ map: menuTex, emissiveMap: menuTex, emissive: 0xffffff, emissiveIntensity: 1.1 }); ctx.nightMats.push({ mat: menuM, base: 0.9, k: 0.5 });
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.2), menuM); menu.position.set(-17.5, 2.8, -HZ + 0.8); g.add(menu);
  // kitchen gear behind counter
  for (let i = 0; i < 6; i++) box(1.4, 1.9, 0.8, -23.5 + i * 2.3, 1.0, -HZ + 2.0, std(0xb9bcc0, { metalness: 0.8, roughness: 0.3 }), false);
  // self-order kiosks
  const kioskScr = new THREE.MeshStandardMaterial({ color: 0x111, emissive: 0x8fd0ff, emissiveIntensity: 0.9 }); ctx.nightMats.push({ mat: kioskScr, base: 0.7, k: 0.4 });
  for (let i = 0; i < 3; i++) { box(0.7, 1.7, 0.25, -29 + i * 1.4, 0.95, -6.5, std(0xeeeeee)); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.95), kioskScr); s.position.set(-29 + i * 1.4, 1.25, -6.36); g.add(s); }
  // dining: tables + chairs + seated guests
  const tableTop = new THREE.CylinderGeometry(0.55, 0.55, 0.06, 18), leg = new THREE.CylinderGeometry(0.05, 0.08, 0.72, 8);
  const seatCols = [red, yellow, std(0x2a2a2a), white];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
    const x = -30 + c * 4.6, z = 1.5 + r * 4.6; if (rnd() < 0.12) continue;
    const t = new THREE.Mesh(tableTop, white); t.position.set(x, 0.86, z); t.castShadow = true; g.add(t); const l = new THREE.Mesh(leg, mull); l.position.set(x, 0.48, z); g.add(l);
    for (const [dx, dz, ry] of [[0, -0.95, 0], [0, 0.95, Math.PI]]) {
      box(0.5, 0.06, 0.5, x + dx, 0.52, z + dz, seatCols[(r + c) % 4], false); box(0.5, 0.5, 0.06, x + dx, 0.8, z + dz + (dz > 0 ? 0.24 : -0.24), seatCols[(r + c) % 4], false);
      if (rnd() < 0.62) { const [wx, wz] = toW(x + dx, z + dz * 0.75); const i = people.add(wx, 0.1 - 0.42, wz, 1, undefined, 0.07, 1.4, 1); if (i >= 0) people.items[i].rot = ROT + (dz < 0 ? 0 : Math.PI); }
      // trays
      if (rnd() < 0.7) box(0.36, 0.03, 0.26, x + dx * 0.4, 0.9, z + dz * 0.4, std(0xb0302a), false);
    }
  }
  // staff behind the counter (uniform shirts) and a queue of customers
  for (let i = 0; i < 4; i++) { const [wx, wz] = toW(-22 + i * 3, -HZ + 3.8); const k = people.add(wx, 0.12, wz, 1, new THREE.Color('#5a1a1a'), 0.12, 1.1); if (k >= 0) people.items[k].rot = ROT; }
  for (let i = 0; i < 7; i++) { const [wx, wz] = toW(-21 + (i % 3) * 2.2, -HZ + 7 + Math.floor(i / 3) * 1.1); const k = people.add(wx, 0.12, wz, 1, undefined, 0.1, 1.3); if (k >= 0) people.items[k].rot = ROT + Math.PI; }
  // façade signage above the glass (south & west)
  const sg = signTex([{ text: "McDonald's", font: 'bold 92px system-ui,sans-serif' }], { w: 768, h: 150, bg: '#c8102e', fg: '#ffbc0d' });
  const sm = new THREE.MeshStandardMaterial({ map: sg, emissiveMap: sg, emissive: 0xffffff, emissiveIntensity: 0.6 }); ctx.signMats.push(sm);
  const s1 = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.95), sm); s1.position.set(-20, FH + 1.1, HZ + 0.35); g.add(s1);
  const s2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.95), sm); s2.position.set(-HX - 0.35, FH + 1.1, 8); s2.rotation.y = -Math.PI / 2; g.add(s2);
  box(12, 0.25, 2.2, -20, FH - 0.2, HZ + 1.1, red);              // entrance canopy
  // drive-through style glow at the door
  /* light removed for performance */

  // ================= HOTEL LOBBY (x -2 … 33) =================
  const stone = std(0xd8cab0, { roughness: 0.35 }), gold = std(0xc9a24a, { metalness: 0.9, roughness: 0.25 });
  box(9, 1.1, 1.4, 16, 0.65, -HZ + 6, std(0x3a2a20, { roughness: 0.4 })); box(9.2, 0.08, 1.6, 16, 1.24, -HZ + 6, stone);
  box(20, FH, 0.3, 16, FH / 2, -HZ + 0.6, std(0x2f3a30)); box(14, 2.2, 0.1, 16, 2.6, -HZ + 0.8, gold);
  const lg = canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#2f3a30'; c.fillRect(0, 0, w, h); c.fillStyle = '#e6c274'; c.font = 'bold 50px Georgia,serif'; c.textAlign = 'center'; c.fillText('LEE GARDENS PLAZA', w / 2, 80); }, { clamp: true });
  const lm = new THREE.MeshStandardMaterial({ map: lg, emissiveMap: lg, emissive: 0xffffff, emissiveIntensity: 0.5 }); ctx.signMats.push(lm);
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), lm); lp.position.set(16, 2.6, -HZ + 0.88); g.add(lp);
  for (const [x, z] of [[4, 8], [28, 8], [4, -8], [28, -8]]) { box(0.9, 0.7, 0.9, x, 0.45, z, std(0x6b4a2a)); const pl = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), std(0x2f6a3a, { roughness: 0.9 })); pl.position.set(x, 1.4, z); g.add(pl); }
  for (const [x, z] of [[10, 6], [22, 6]]) { box(3, 0.5, 1.2, x, 0.4, z, std(0x7a2a2a)); box(3, 0.6, 0.3, x, 0.75, z - 0.5, std(0x7a2a2a)); }
  const chand = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), new THREE.MeshStandardMaterial({ color: 0xfff3d0, emissive: 0xffe6b0, emissiveIntensity: 2 })); chand.position.set(16, 3.9, 2); g.add(chand);
  for (let i = 0; i < 8; i++) { const [wx, wz] = toW(4 + rnd() * 26, -6 + rnd() * 20); people.add(wx, 0.12, wz, 1, undefined, 0.6, 4.5); }

  // ================= bronze mascot statue on a bench (original design) =================
  {
    const S = new THREE.Group(); const bronze = std(0x8a6438, { metalness: 0.85, roughness: 0.35 }), patina = std(0x6f8f7a, { metalness: 0.5, roughness: 0.5 });
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.65), std(0xf2f0ea)); bench.position.y = 0.5; S.add(bench);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.1), std(0xf2f0ea)); back.position.set(0, 0.9, -0.3); S.add(back);
    for (const x of [-1.05, 1.05]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.6), mull); l.position.set(x, 0.25, 0); S.add(l); }
    // seated figure, waving
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.5, 6, 14), bronze); body.position.set(0.45, 1.05, -0.05); S.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), bronze); head.position.set(0.45, 1.68, -0.02); S.add(head);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.3, 16), patina); hat.position.set(0.45, 1.98, -0.02); S.add(hat);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 20), patina); brim.position.set(0.45, 1.84, -0.02); S.add(brim);
    for (const sx of [-1, 1]) { const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 4, 10), bronze); th.rotation.x = Math.PI / 2; th.position.set(0.45 + sx * 0.14, 0.65, 0.22); S.add(th);
      const sh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.38, 4, 10), bronze); sh.position.set(0.45 + sx * 0.14, 0.32, 0.48); S.add(sh);
      const ft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.34), patina); ft.position.set(0.45 + sx * 0.14, 0.06, 0.58); S.add(ft); }
    const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.5, 4, 10), bronze); armR.position.set(0.82, 1.45, 0); armR.rotation.z = -0.5; S.add(armR);
    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.45, 4, 10), bronze); armL.position.set(0.12, 0.98, 0.05); armL.rotation.z = 1.2; S.add(armL);
    S.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    S.position.set(-12, 0.12, HZ + 3.2); S.rotation.y = 0; g.add(S);
    /* light removed for performance */
  }
  return g;
}
