import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import fontJSON from 'three/examples/fonts/helvetiker_bold.typeface.json';
import { mulberry32, canvasTex, signTex, pca } from './util.js';
import { GlowSet } from './props.js';
import { FOOTPRINTS } from './facade.js';

// =====================================================================
//  Modelled landmarks (true geometry + materials, matched against the reference photos)
//  Central Hatyai · Makro · Chinda Hot Pot corner · Baan Iyara massage · fruit street ·
//  Hat Yai Kitchenware. Positions: OSM outlines where they exist, otherwise flagged approximate.
// =====================================================================
const FONT = new FontLoader().parse(fontJSON);
const C = (h) => new THREE.Color(h);
const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, o));
const text3d = (str, size, depth, mat) => { const g = new TextGeometry(str, { font: FONT, size, depth, curveSegments: 6, bevelEnabled: true, bevelThickness: depth * 0.15, bevelSize: size * 0.02, bevelSegments: 2 }); g.computeBoundingBox(); const bb = g.boundingBox; g.translate(-(bb.max.x + bb.min.x) / 2, 0, 0); return new THREE.Mesh(g, mat); };

export const L2 = {
  central: [[1044, 1499], [1363, 1675], [1401, 1604], [1411, 1607], [1437, 1584], [1443, 1568], [1378, 1540], [1372, 1555], [1093, 1405]],
  makroSite: [[1384, 1757], [1455, 1783], [1585, 1826], [1824, 1902], [1928, 1934], [1966, 1786], [1828, 1778], [1425, 1677]],
  makro: [[1782, 1855], [1801, 1886], [1903, 1918], [1911, 1893], [1918, 1896], [1944, 1820], [1903, 1805], [1828, 1783], [1808, 1809], [1787, 1832]],
  chinda: { x: 224, z: 876 },        // corner of Thai Arkhan Rd (OSM road start)
  iyara: { x: 37, z: 31 },           // approximate – not in OSM
  hk: { x: 1640, z: 1290 },          // approximate – not in OSM
  fruit: { x: -171, z: 69 },         // Santisuk market (OSM)
};
export function reserve2(occ) {
  occ.mark(82, -1562, 44, 44, 0, 2); occ.mark(-55.3, 29.1, 13, 14, -0.14, 1); occ.mark(-139, -3, 30, 30, 0, 0);
  occ.poly(L2.central, 30); occ.poly(L2.makroSite, 4);
  occ.mark(L2.chinda.x, L2.chinda.z, 30, 26, 0, 3); occ.mark(L2.iyara.x, L2.iyara.z, 10, 16, 0, 1); occ.mark(L2.hk.x, L2.hk.z, 70, 40, 0, 4);
}

// faceted metal cladding: a triangulated relief over a rectangle in the group's local frame
function facetWall(x0, x1, y0, y1, z, dir, rnd, palette, seams) {
  const cols = Math.max(2, Math.round((x1 - x0) / 22)), rows = Math.max(2, Math.round((y1 - y0) / 9));
  const P = []; for (let j = 0; j <= rows; j++) { const row = []; for (let i = 0; i <= cols; i++) { const ex = i === 0 || i === cols, ey = j === 0 || j === rows;
    row.push(new THREE.Vector3(x0 + (x1 - x0) * i / cols + (ex ? 0 : (rnd() - 0.5) * 10), y0 + (y1 - y0) * j / rows + (ey ? 0 : (rnd() - 0.5) * 5), z + dir * (ex || ey ? 0 : rnd() * 2.2))); } P.push(row); }
  const pos = [], col = []; const c = new THREE.Color();
  const tri = (a, b, d, k) => { c.set(palette(k, a, b, d)); for (const v of [a, b, d]) { pos.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); } seams.push(a, b, b, d, d, a); };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = P[j][i], b = P[j][i + 1], cc = P[j + 1][i + 1], d = P[j + 1][i], flip = (i + j) % 2;
    if (dir > 0) { if (flip) { tri(a, b, cc, j * 100 + i); tri(a, cc, d, j * 100 + i + 50); } else { tri(a, b, d, j * 100 + i); tri(b, cc, d, j * 100 + i + 50); } }
    else { if (flip) { tri(a, cc, b, j * 100 + i); tri(a, d, cc, j * 100 + i + 50); } else { tri(a, d, b, j * 100 + i); tri(b, d, cc, j * 100 + i + 50); } } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}

export function buildLandmarks2(ctx) {
  const { scene } = ctx; const rnd = mulberry32(2027);
  const glow = new GlowSet('lamp', 80); ctx.glowSets.push(glow);
  const nightLines = [];

  // ================================ CENTRAL HATYAI ================================
  {
    const P = L2.central, pc = pca(P);
    let ux = pc.ux, uz = pc.uz; const fx = uz, fz = -ux;                                     // front normal (toward the city centre)
    const sgn = (fx * -pc.cx + fz * -pc.cz) > 0 ? 1 : -1;
    const G = new THREE.Group(); G.position.set(pc.cx, 0, pc.cz); G.rotation.y = Math.atan2(-uz, ux); scene.add(G);   // local x = long axis
    const FZ = -sgn;                                                                          // local z of the front face side
    const Lh = 175, Wh = 42, H = 30;
    const add = (o) => { o.castShadow = true; o.receiveShadow = true; G.add(o); return o; };
    add(new THREE.Mesh(new THREE.BoxGeometry(Lh * 2, H, Wh * 2), std(0x9a9ca0, { roughness: 0.5, metalness: 0.4 }))).position.y = H / 2;
    add(new THREE.Mesh(new THREE.BoxGeometry(Lh * 2 + 2, 6, Wh * 2 + 2), std(0x2a2b2e, { roughness: 0.4 }))).position.y = 3;
    const panelM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.55, envMapIntensity: 1.3 });
    const seams = [];
    const pal = (k, a, b, d) => { const cy = (a.y + b.y + d.y) / 3, cxp = (a.x + b.x + d.x) / 3; const copper = cy < 19 && Math.abs(cxp + 60) < 110 && (k % 3 !== 0);
      return copper ? (k % 2 ? '#c8783e' : '#b8692f') : ['#d8dadc', '#c4c7ca', '#a9adb2', '#e6e8ea', '#8e9297'][k % 5]; };
    const front = add(new THREE.Mesh(facetWall(-Lh, Lh, 6, H + 4, FZ * Wh, FZ, rnd, pal, seams), panelM));
    const back = add(new THREE.Mesh(facetWall(-Lh, Lh, 6, H + 2, -FZ * Wh, -FZ, rnd, (k) => ['#c4c7ca', '#a9adb2', '#d8dadc'][k % 3], seams), panelM));
    const seamG = new THREE.BufferGeometry().setFromPoints(seams); const seamM = new THREE.LineBasicMaterial({ color: 0x2a2c30 }); const sl = new THREE.LineSegments(seamG, seamM); sl.position.z = FZ * 0.05; G.add(sl);
    nightLines.push(seamM);
    // crystal glass funnel over the main entrance (triangulated lattice)
    const fxp = -Lh * 0.42;
    const funG = new THREE.CylinderGeometry(13, 6.5, 34, 7, 8, true);
    const funnel = new THREE.Mesh(funG, new THREE.MeshPhysicalMaterial({ color: 0x8fb0b8, roughness: 0.06, metalness: 0.5, transparent: true, opacity: 0.55, side: THREE.DoubleSide, envMapIntensity: 1.6, emissive: 0x2a50ff, emissiveIntensity: 0 }));
    funnel.position.set(fxp, 23, FZ * (Wh + 6)); G.add(funnel); ctx.nightMats.push({ mat: funnel.material, base: 0.0, k: 0.9 });
    const lat = new THREE.LineSegments(new THREE.WireframeGeometry(funG), new THREE.LineBasicMaterial({ color: 0x23262a })); lat.position.copy(funnel.position); G.add(lat);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(9, 4, 30, 7), std(0x1a2a3a, { emissive: 0x3050ff, emissiveIntensity: 0 })); inner.position.copy(funnel.position); G.add(inner); ctx.nightMats.push({ mat: inner.material, base: 0.0, k: 1.2 });
    // 3D lettering
    const letM = std(0x3a3c40, { metalness: 0.7, roughness: 0.35, emissive: 0xffffff, emissiveIntensity: 0 }); ctx.nightMats.push({ mat: letM, base: 0.0, k: 1.3 });
    for (const [s, y] of [['CENTRAL', H - 1], ['HATYAI', H - 9.5]]) { const t = add(text3d(s, 6.2, 1.0, letM)); t.position.set(Lh * 0.18, y, FZ * (Wh + 2.4)); if (FZ < 0) t.rotation.y = Math.PI; }
    // copper entrance canopy, white sign, wide stairs, planters
    const canopy = add(new THREE.Mesh(new THREE.BoxGeometry(46, 1.2, 16), std(0xa85a2e, { metalness: 0.5, roughness: 0.4 }))); canopy.position.set(fxp, 7.5, FZ * (Wh + 9)); canopy.rotation.x = FZ * 0.1;
    const wM = std(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.2 }); ctx.nightMats.push({ mat: wM, base: 0.2, k: 1.2 });
    for (const [s, y] of [['CENTRAL', 5.6], ['HATYAI', 3.9]]) { const t = add(text3d(s, 1.4, 0.3, wM)); t.position.set(fxp, y, FZ * (Wh + 16.8)); if (FZ < 0) t.rotation.y = Math.PI; }
    for (let k = 0; k < 9; k++) add(new THREE.Mesh(new THREE.BoxGeometry(40, 0.4, 1.3), std(0x34363a))).position.set(fxp, 0.2 + k * 0.4, FZ * (Wh + 30 - k * 1.3));
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const pl = add(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.55, 0.9, 12), std(0xf2f2ee))); pl.position.set(fxp + s * (22 + k * 2.2), 0.45 + k * 0.6, FZ * (Wh + 24 - k * 3)); const pt = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), std(0x3f7a35, { roughness: 1 }))); pt.position.set(pl.position.x, pl.position.y + 1.0, pl.position.z); }
    // perforated steel lattice cube at the east end (white/red triangles)
    const perf = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#000'; for (let y = 4; y < h; y += 9) for (let x = 4 + (y % 18 ? 4 : 0); x < w; x += 9) { g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); } }, { linear: true });
    const lx = Lh - 30, lz = FZ * (Wh - 10), LB = new THREE.Group(); LB.position.set(lx, H + 2, lz); G.add(LB);
    const cV = [[-24, -2, -24], [26, 4, -26], [30, 22, 20], [-22, 14, 22], [-26, 30, -18], [24, 36, -22], [28, 40, 24], [-20, 28, 26]].map(a => new THREE.Vector3(...a));
    const beam = std(0xd0d4d8, { metalness: 0.8, roughness: 0.3 });
    const edge = (a, b) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, d.length(), 6), beam); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = true; LB.add(m); };
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7], [0, 5], [1, 6], [2, 7], [3, 4]].forEach(([a, b]) => edge(cV[a], cV[b]));
    const triM = [new THREE.MeshStandardMaterial({ color: 0xf2f2f0, alphaMap: perf, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.4 }), new THREE.MeshStandardMaterial({ color: 0xc8282a, side: THREE.DoubleSide, roughness: 0.5 })];
    const faces = [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
    faces.forEach(([a, b, c, d], fi) => { for (let k = 0; k < 10; k++) { const s = rnd(), t2 = rnd() * (1 - s); const p0 = cV[a].clone().lerp(cV[b], s).lerp(cV[d].clone().lerp(cV[c], s), t2); const sz = 5 + rnd() * 6;
      const g = new THREE.BufferGeometry().setFromPoints([p0, p0.clone().add(new THREE.Vector3(sz, rnd() * 3, 0)), p0.clone().add(new THREE.Vector3(rnd() * 3, sz, rnd() * 2))]); g.computeVertexNormals(); const m = new THREE.Mesh(g, triM[(k + fi) % 3 === 0 ? 1 : 0]); LB.add(m); } });
    // promotional banner column
    for (let i = 0; i < 9; i++) { const t = canvasTex(64, 128, (g, w, h) => { const hue = (i * 47) % 360; g.fillStyle = `hsl(${hue},60%,45%)`; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.85)'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.fillText(['SALE', 'NEW', '50%', 'OPEN', 'FOOD', 'GIFT', 'FUN', 'HOT', 'STYLE'][i], w / 2, h * 0.75); g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(w / 2, h * 0.35, 18, 0, 7); g.fill(); }, { clamp: true });
      const bm = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.15 }); ctx.signMats.push(bm); bm.userData.k = 0.6;
      const b = new THREE.Mesh(new THREE.PlaneGeometry(5, 10), bm); b.position.set(Lh * 0.18 + 30 + i * 5.6, 15, FZ * (Wh + 2.6)); if (FZ < 0) b.rotation.y = Math.PI; G.add(b); }
    // plaza: stone paving, painted court, red-lantern pergola, palms
    const pav = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#9c9a94'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 64) { const v = 140 + Math.random() * 30; g.fillStyle = `rgb(${v},${v - 2},${v - 6})`; g.fillRect(x + ((y / 32) % 2) * 32 + 1, y + 1, 62, 30); } });
    pav.repeat.set(30, 12);
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(Lh * 2, 70), new THREE.MeshStandardMaterial({ map: pav, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.08, FZ * (Wh + 35)); plaza.receiveShadow = true; G.add(plaza);
    const court = canvasTex(512, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.lineWidth = 34; g.strokeStyle = '#3a7ac8'; g.beginPath(); g.arc(150, 150, 90, 0, 7); g.stroke(); g.strokeStyle = '#e8803a'; g.beginPath(); g.moveTo(240, 40); g.lineTo(500, 40); g.lineTo(500, 220); g.stroke(); g.strokeStyle = '#3a7ac8'; g.beginPath(); g.moveTo(280, 220); g.lineTo(440, 120); g.stroke(); }, { clamp: true });
    const ct = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshStandardMaterial({ map: court, transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); ct.rotation.x = -Math.PI / 2; ct.position.set(Lh * 0.45, 0.1, FZ * (Wh + 40)); G.add(ct);
    const per = new THREE.Group(); per.position.set(-Lh * 0.05, 0, FZ * (Wh + 48)); G.add(per);
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, 0.6), std(0x6a2a1a)); p.position.set(-22 + k * 14.6, 3, s * 5); p.castShadow = true; per.add(p); }
    const beamP = new THREE.Mesh(new THREE.BoxGeometry(46, 0.6, 11), std(0x6a2a1a)); beamP.position.y = 6.2; per.add(beamP);
    const lanM = new THREE.MeshStandardMaterial({ color: 0xd8301e, emissive: 0xff4a1a, emissiveIntensity: 0.3, roughness: 0.5 }); ctx.nightMats.push({ mat: lanM, base: 0.25, k: 1.6 });
    const lan = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 10, 8), lanM, 160); const m4 = new THREE.Matrix4(); let li = 0;
    for (let i = 0; i < 32; i++) for (let j = 0; j < 5; j++) { m4.compose(new THREE.Vector3(-22 + i * 1.42, 5.3 - (i + j) % 2 * 0.3, -4.4 + j * 2.2), new THREE.Quaternion(), new THREE.Vector3(1, 1.15, 1)); lan.setMatrixAt(li++, m4); }
    per.add(lan); { const w = new THREE.Vector3(); per.getWorldPosition(w); for (let i = 0; i < 6; i++) glow.add(w.x + (i - 2.5) * 7 * ux, 5, w.z + (i - 2.5) * 7 * uz, 14, C('#ff6a3a')); }
    ctx.extraTrees = ctx.extraTrees || []; for (let i = 0; i < 12; i++) { const lp = new THREE.Vector3(-Lh + 20 + i * 28, 0, FZ * (Wh + 64)); G.localToWorld(lp); ctx.extraTrees.push([lp.x, lp.z, 1.2]); }
    for (let i = 0; i < 160; i++) { const lp = new THREE.Vector3((rnd() - 0.5) * Lh * 1.6, 0, FZ * (Wh + 18 + rnd() * 45)); G.updateMatrixWorld(); G.localToWorld(lp); ctx.people.add(lp.x, 0.15, lp.z, 1); }
    FOOTPRINTS.push(P);
    ctx.centralModel = { x: pc.cx, z: pc.cz };
  }

  // ================================ MAKRO ================================
  {
    const P = L2.makro, pc = pca(P); const ux = pc.ux, uz = pc.uz;
    const G = new THREE.Group(); G.position.set(pc.cx, 0, pc.cz); G.rotation.y = Math.atan2(-uz, ux); scene.add(G);
    const Lh = 72, Wh = 36, H = 15; const fz = ((-uz) * (1500 - pc.cx) + ux * (1700 - pc.cz)) > 0 ? 1 : -1;   // front faces the parking lot
    const red = std(0xd21a22, { roughness: 0.45, metalness: 0.25 }), white = std(0xf2f0ea, { roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(Lh * 2, H, Wh * 2), red); body.position.y = H / 2; body.castShadow = body.receiveShadow = true; G.add(body);
    const rib = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#d21a22'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 2, h); }); rib.repeat.set(36, 3);
    body.material = new THREE.MeshStandardMaterial({ map: rib, roughness: 0.45, metalness: 0.25 });
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(Lh * 2 + 0.4, 0.5, Wh * 2 + 0.4), white); b.position.y = 1 + k * 1.1; G.add(b); }
    const letM = std(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.1, roughness: 0.4 }); ctx.nightMats.push({ mat: letM, base: 0.1, k: 1.6 });
    const t = text3d('makro', 9, 1.2, letM); t.position.set(-Lh * 0.35, 4.5, fz * (Wh + 0.7)); if (fz < 0) t.rotation.y = Math.PI; G.add(t);
    const outl = text3d('makro', 9.15, 0.8, std(0xd21a22)); outl.position.set(-Lh * 0.35, 4.45, fz * (Wh + 0.5)); if (fz < 0) outl.rotation.y = Math.PI; G.add(outl);
    const th = signTex([{ text: 'แม็คโคร', font: 'bold 80px "Noto Sans Thai",system-ui' }], { w: 512, h: 120, bg: '#d21a22', fg: '#ffffff' }); const thm = new THREE.MeshStandardMaterial({ map: th, emissiveMap: th, emissive: 0xffffff, emissiveIntensity: 0.2 }); ctx.signMats.push(thm);
    const tp = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.6), thm); tp.position.set(-Lh * 0.35 + 6, 14.2, fz * (Wh + 0.3)); if (fz < 0) tp.rotation.y = Math.PI; G.add(tp);
    // trolley shelter + trolleys
    const steel = std(0xe6e6e2, { metalness: 0.6, roughness: 0.35 });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(42, 0.4, 12), steel); roof.position.set(-Lh * 0.1, 5.4, fz * (Wh + 9)); roof.castShadow = true; G.add(roof);
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 5.4, 8), steel); p.position.set(-Lh * 0.1 - 20 + i * 8, 2.7, fz * (Wh + 9 + s * 5)); G.add(p); }
    const trolley = new THREE.Group(); { const basket = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.8, roughness: 0.3, wireframe: false, transparent: true, opacity: 0.55 })); basket.position.y = 0.75; trolley.add(basket); const h = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.08), std(0xd21a22)); h.position.set(0, 1.08, -0.48); trolley.add(h); }
    const geos = []; trolley.updateMatrixWorld(true); trolley.traverse(o => { if (o.isMesh) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); geos.push([g, o.material]); } });
    for (const [g, m] of geos) { const im = new THREE.InstancedMesh(g, m, 140); let k = 0; for (let r = 0; r < 7; r++) for (let i = 0; i < 20; i++) { m4.compose(new THREE.Vector3(-Lh * 0.1 - 19 + i * 0.34 * 1 + Math.floor(i / 10) * 18, 0, fz * (Wh + 5 + r * 1.3)), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); im.setMatrixAt(k++, m4); } G.add(im); }
    // ATM wall, parking lot, high-mast lights
    const atm = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 0.6), std(0x1d4a8a, { emissive: 0x3a7aff, emissiveIntensity: 0.3 })); atm.position.set(Lh * 0.35, 1.6, fz * (Wh + 0.4)); G.add(atm); ctx.nightMats.push({ mat: atm.material, base: 0.25, k: 0.8 });
    const lot = new THREE.Shape(L2.makroSite.map(p => new THREE.Vector2(p[0], -p[1]))); const lg = new THREE.ShapeGeometry(lot); lg.rotateX(-Math.PI / 2);
    const asp = new THREE.Mesh(lg, std(0x4a4a4c, { roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); asp.position.y = 0.05; asp.receiveShadow = true; scene.add(asp);
    for (let i = 0; i < 5; i++) { const a = new THREE.Vector3(-Lh + i * 36, 0, fz * (Wh + 50)); G.localToWorld(a); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 26, 8), steel); pole.position.set(a.x, 13, a.z); scene.add(pole); glow.add(a.x, 26, a.z, 30, C('#fff6e0')); }
    const pk = new THREE.InstancedMesh(new THREE.BoxGeometry(1.9, 1.6, 4.8), std(0xe8e8e4, { metalness: 0.4, roughness: 0.4 }), 60); let pi = 0;
    for (let r = 0; r < 3; r++) for (let i = 0; i < 20; i++) { if (rnd() < 0.35) continue; const a = new THREE.Vector3(-Lh + 8 + i * 6.5, 0.9, fz * (Wh + 24 + r * 9)); m4.compose(a, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); pk.setMatrixAt(pi, m4); pk.setColorAt(pi, C(['#e8e8e4', '#2a2c30', '#8a8f96', '#c8ccd0', '#6a1c1c'][pi % 5])); pi++; }
    pk.count = pi; G.add(pk);
    FOOTPRINTS.push(P);
  }

  // ================================ CHINDA HOT POT (Thai Arkhan Rd corner) ================================
  {
    const { x, z } = L2.chinda; const G = new THREE.Group(); G.position.set(x, 0, z); G.rotation.y = Math.atan2(0.97, 0.22) - Math.PI / 2; scene.add(G);
    const shape = (w, d, r) => { const s = new THREE.Shape(); s.moveTo(-w / 2, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.absarc(w / 2 - r, -d / 2 + r, r, -Math.PI / 2, 0, false); s.lineTo(w / 2, d / 2); s.lineTo(-w / 2, d / 2); s.closePath(); return s; };
    const ext = (s, h, m, y) => { const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 16 }); g.rotateX(-Math.PI / 2); const o = new THREE.Mesh(g, m); o.position.y = y; o.castShadow = o.receiveShadow = true; G.add(o); return o; };
    const white = std(0xeeece6, { roughness: 0.7 }), red = std(0xc8472e, { roughness: 0.55 }), orange = std(0xd2552a, { roughness: 0.5 });
    ext(shape(22, 18, 7), 3.6, std(0x2a2a2c), 0); ext(shape(22.3, 18.3, 7.1), 1.3, orange, 3.6);
    ext(shape(22, 18, 7), 3.2, white, 4.9);
    ext(shape(22.6, 18.6, 7.3), 3.6, red, 8.1);                // red band (third floor)
    ext(shape(21.6, 17.6, 6.8), 3.0, white, 11.7);
    const roofM = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#c8ccd0'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2); }), roughness: 0.4, metalness: 0.7 });
    ext(shape(23.6, 19.6, 7.8), 0.4, roofM, 14.7); ext(shape(24.5, 20.5, 8.2), 1.6, roofM, 15.1);
    // octagonal openings + hanging lanterns along the curved red band
    const lanM = new THREE.MeshStandardMaterial({ color: 0xe8743a, emissive: 0xff7a2a, emissiveIntensity: 0.2, roughness: 0.5 }); ctx.nightMats.push({ mat: lanM, base: 0.15, k: 1.4 });
    const path = []; for (let i = 0; i <= 14; i++) { const t = i / 14; if (t < 0.45) path.push(new THREE.Vector3(-11 + t / 0.45 * 15, 0, -9.35)); else if (t < 0.65) { const a = -Math.PI / 2 + (t - 0.45) / 0.2 * Math.PI / 2; path.push(new THREE.Vector3(4 + Math.cos(a) * 7.35, 0, -2 + Math.sin(a) * 7.35)); } else path.push(new THREE.Vector3(11.35, 0, -2 + (t - 0.65) / 0.35 * 11)); }
    for (let i = 0; i < path.length - 1; i++) { const p = path[i].clone().lerp(path[i + 1], 0.5); const hole = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.3, 8), std(0xf2f0ea)); hole.rotation.x = Math.PI / 2; const ang = Math.atan2(path[i + 1].x - path[i].x, path[i + 1].z - path[i].z); hole.rotation.z = 0; hole.position.set(p.x, 9.9, p.z); hole.lookAt(p.x + Math.cos(ang) * 2, 9.9, p.z - Math.sin(ang) * 2); hole.rotateX(Math.PI / 2); G.add(hole);
      for (const dy of [0.6, -0.7]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), lanM); l.scale.set(1, 1.15, 1); l.position.set(p.x, 9.9 + dy, p.z); G.add(l); } }
    const sg = signTex([{ text: 'CHINDA HOT POT    สุกี้จินดา', font: 'bold 64px "Noto Sans Thai",system-ui' }], { w: 1024, h: 96, bg: '#d2552a', fg: '#ffffff' });
    const sm = new THREE.MeshStandardMaterial({ map: sg, emissiveMap: sg, emissive: 0xffffff, emissiveIntensity: 0.3 }); ctx.signMats.push(sm);
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(18, 1.2), sm); sp.position.set(-2, 4.25, -9.2); sp.rotation.y = Math.PI; G.add(sp);
    for (let i = 0; i < 6; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.4, 8), std([0xd23a2a, 0x2a5ad2][i % 2])); st.position.set(-9 + i * 0.6, 0.2, -10.2); G.add(st); }
    G.updateMatrixWorld(); const w = new THREE.Vector3(4, 9.9, -9.5); G.localToWorld(w); glow.add(w.x, w.y, w.z, 18, C('#ff8a4a'));
    FOOTPRINTS.push([[x - 11, z - 9], [x + 11, z - 9], [x + 11, z + 9], [x - 11, z + 9]]);
  }

  // ================================ BAAN IYARA massage + café (approximate) ================================
  {
    const { x, z } = L2.iyara; const G = new THREE.Group(); G.position.set(x, 0, z); G.rotation.y = -Math.PI / 2 + 0.11; scene.add(G);   // front faces west (the cobbled street side)
    const white = std(0xeeece6, { roughness: 0.6 }), wood = std(0x9a5a2a, { roughness: 0.5 }), brick = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < h; y += 8) { g.fillRect(0, y, w, 1); for (let x2 = ((y / 8) % 2) * 8; x2 < w; x2 += 16) g.fillRect(x2, y, 1, 8); } }), roughness: 0.8 });
    const box = (w, h, d, px, py, pz, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(px, py, pz); o.castShadow = o.receiveShadow = true; G.add(o); return o; };
    box(0.3, 4.2, 14, -3.9, 2.1, -1, white); box(0.3, 4.2, 14, 3.9, 2.1, -1, white); box(8, 0.3, 14, 0, 4.25, -1, white); box(8, 4.2, 0.3, 0, 2.1, -7.9, std(0xf4eedc));
    box(8.4, 7.5, 14.4, 0, 8.1, -1.1, white); for (let i = 0; i < 3; i++) box(2, 2.2, 0.15, -2.6 + i * 2.6, 8.4, 6.12, std(0x2a3440, { metalness: 0.4 }));
    box(8.6, 1.2, 0.6, 0, 5.0, 6.2, std(0xe6e4de));
    const sg = signTex([{ text: 'BAAN IYARA', font: 'bold 96px Georgia,serif' }, { text: 'massage  +CAFÉ', font: 'bold 44px system-ui' }], { w: 1024, h: 220, bg: '#e6e4de', fg: '#2a2622' });
    const sm = new THREE.MeshStandardMaterial({ map: sg, emissiveMap: sg, emissive: 0xffd9a0, emissiveIntensity: 0.15 }); ctx.signMats.push(sm); const sp = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 1.6), sm); sp.position.set(0, 5.95, 6.55); G.add(sp);
    // glass sliding door with wood frame
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xdfe9ec, transparent: true, opacity: 0.18, roughness: 0.04, depthWrite: false });
    const gp = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.4), glass); gp.position.set(0.4, 1.9, 6.0); G.add(gp);
    box(5.6, 0.12, 0.15, 0.4, 3.6, 6.0, wood); box(5.6, 0.12, 0.15, 0.4, 0.2, 6.0, wood); for (const sx of [-2.3, 0.4, 3.1]) box(0.12, 3.5, 0.15, sx, 1.9, 6.0, wood);
    box(2.2, 1.1, 0.5, -3.0, 0.55, 6.6, brick); box(2.6, 1.1, 0.5, 3.0, 0.55, 6.6, brick);
    const floorT = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 13.6), std(0xb08a5e, { roughness: 0.4 })); floorT.rotation.x = -Math.PI / 2; floorT.position.set(0, 0.12, -1); G.add(floorT);
    // interior: row of reclining massage chairs (white towels, yellow runner) with black stools
    for (let i = 0; i < 5; i++) { const zz = -6 + i * 2.2; const bed = box(1.0, 0.25, 2.0, -2.2, 0.7, zz, std(0xf4f2ee, { roughness: 0.9 })); const bk = box(1.0, 0.9, 0.2, -2.9, 1.05, zz, std(0xf4f2ee)); bk.position.set(-2.9 + 0.0, 1.05, zz); bk.rotation.z = 0.9; bk.position.x = -2.7; box(0.25, 0.27, 2.02, -2.2, 0.72, zz, std(0xf2b81a));
      box(0.6, 0.5, 0.6, -0.8, 0.45, zz, std(0x1a1a1a)); if (i % 2 === 0) { const k = ctx.people.add(0, 0, 0, 1, undefined, 0.04, 1.2, 1); const wp = new THREE.Vector3(-2.2, 0.35, zz); G.updateMatrixWorld(); G.localToWorld(wp); if (k >= 0) { ctx.people.items[k].x = wp.x; ctx.people.items[k].y = wp.y - 0.4; ctx.people.items[k].z = wp.z; } } }
    /* light removed for performance */
    const turf = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.2), std(0x3f8a3a, { roughness: 1 })); turf.rotation.x = -Math.PI / 2; turf.position.set(0, 0.14, 7.6); G.add(turf);
    for (let i = 0; i < 7; i++) box(0.12, 0.08, 0.28, -3 + (i % 4) * 0.35, 0.16, 6.4 + Math.floor(i / 4) * 0.35, std([0x1a1a1a, 0xd04a7a, 0x2a4a8a, 0xc8a080][i % 4]));
    G.updateMatrixWorld(); const w = new THREE.Vector3(0, 5.95, 6.6); G.localToWorld(w); glow.add(w.x, w.y - 0.5, w.z, 5, C('#ffc070'));
  }

  // ================================ FRUIT STREET by Santisuk market ================================
  {
    const a = L2.fruit; const nr = ctx.hashAll.nearest(a.x, a.z, 120);
    if (nr) { const dx = nr.dx / Math.hypot(nr.dx, nr.dz), dz = nr.dz / Math.hypot(nr.dx, nr.dz), nx = -dz, nz = dx, hw = nr.data.w / 2;
      const crateCols = ['#2a5aa8', '#f2f2ee', '#e8c83a', '#3aa86a', '#d23a3a'], fruitCols = ['#f28a1c', '#d8281e', '#8ac83a', '#f2d21c', '#7a2a5a', '#e84a7a', '#f2a65a'];
      const crate = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.42, 0.45), std(0xffffff, { roughness: 0.6 }), 800), fruit = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), std(0xffffff, { roughness: 0.45 }), 4000);
      const tarp = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.04, 1), std(0xffffff, { roughness: 0.7, side: THREE.DoubleSide }), 40);
      let ci = 0, fi = 0, ti = 0; const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(dx, dz));
      for (const side of [-1, 1]) for (let s = -30; s < 30; s += 4.2) {
        const bx = nr.px + dx * s + nx * side * (hw + 0.5), bz = nr.pz + dz * s + nz * side * (hw + 0.5);
        // stacked crates + fruit pyramids
        for (let k = 0; k < 10 && ci < 800; k++) { const ox = (k % 5 - 2) * 0.62, oy = Math.floor(k / 5) * 0.43 + 0.21; m4.compose(new THREE.Vector3(bx + dx * ox, oy, bz + dz * ox), q, new THREE.Vector3(1, 1, 1)); crate.setMatrixAt(ci, m4); crate.setColorAt(ci, C(crateCols[(k + Math.floor(s)) % 5])); ci++; }
        for (let k = 0; k < 80 && fi < 4000; k++) { const ox = (k % 20 - 10) * 0.15 + (rnd() - 0.5) * 0.05, oz = (Math.floor(k / 20) - 1.5) * 0.12; m4.compose(new THREE.Vector3(bx + dx * ox + nx * side * oz, 0.92 + Math.floor(k / 40) * 0.08, bz + dz * ox + nz * side * oz), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); fruit.setMatrixAt(fi, m4); fruit.setColorAt(fi, C(fruitCols[Math.floor((s + 40) / 4.2 + Math.floor(k / 20)) % fruitCols.length])); fi++; }
        const tq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), side * 0.25)); m4.compose(new THREE.Vector3(bx + nx * side * 0.6, 3.1, bz + nz * side * 0.6), tq, new THREE.Vector3(3.2, 1, 4.2)); tarp.setMatrixAt(ti, m4); tarp.setColorAt(ti, C(['#2a4a7a', '#3a6a4a', '#2a2a2e', '#1d5fb8'][ti % 4])); ti++;
        glow.add(bx + nx * side * 0.4, 2.7, bz + nz * side * 0.4, 4, C('#fff2d0'));
        if (rnd() < 0.7) ctx.people.add(bx + nx * side * 1.4, 0.12, bz + nz * side * 1.4, 1);
      }
      crate.count = ci; fruit.count = fi; tarp.count = ti; for (const m of [crate, fruit, tarp]) { m.frustumCulled = false; m.castShadow = true; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; scene.add(m); }
      ctx.fruitStreet = { x: nr.px, z: nr.pz, dx, dz };
    }
  }

  // ================================ HAT YAI KITCHENWARE (approximate) ================================
  {
    const { x, z } = L2.hk; const G = new THREE.Group(); G.position.set(x, 0, z); G.rotation.y = 0.5; scene.add(G);
    const ribT = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#e6e8ea'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.12)'; for (let x2 = 0; x2 < w; x2 += 6) g.fillRect(x2, 0, 2, h); }); ribT.repeat.set(30, 2);
    const body = new THREE.Mesh(new THREE.BoxGeometry(60, 12, 32), new THREE.MeshStandardMaterial({ map: ribT, roughness: 0.4, metalness: 0.5 })); body.position.y = 6; body.castShadow = body.receiveShadow = true; G.add(body);
    const low = new THREE.Mesh(new THREE.BoxGeometry(60.4, 4.6, 32.4), std(0xf4f2ee)); low.position.y = 2.3; G.add(low);
    const oM = std(0xd2552a, { roughness: 0.5 }); const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.32, 10, 40), oM); ring.position.set(-14, 8.5, 16.3); G.add(ring);
    const hk = text3d('HK', 1.6, 0.3, oM); hk.position.set(-14, 8.4, 16.3); G.add(hk);
    const th = signTex([{ text: 'หาดใหญ่คิทเช่นแวร์', font: 'bold 80px "Noto Sans Thai",system-ui' }], { w: 1024, h: 120, bg: '#e6e8ea', fg: '#d2552a' }); const tm = new THREE.MeshStandardMaterial({ map: th, transparent: true }); const tp = new THREE.Mesh(new THREE.PlaneGeometry(22, 2.6), tm); tp.position.set(4, 9, 16.25); G.add(tp);
    const awn = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 22, 16, 1, true, 0, Math.PI / 2), std(0xd8dadc, { metalness: 0.6, side: THREE.DoubleSide })); awn.rotation.z = Math.PI / 2; awn.position.set(-14, 4.2, 16.4); G.add(awn);
    for (let i = 0; i < 3; i++) { const sh = new THREE.Mesh(new THREE.BoxGeometry(6, 3.6, 0.2), std(0xc8b89a, { roughness: 0.5 })); sh.position.set(-22 + i * 8, 1.9, 16.2); G.add(sh); }
  }

  glow.build(scene);
  ctx.update.push((dt, t, S) => { glow.mat.uniforms.uInt.value = 0.08 + 1.0 * S.win; for (const m of nightLines) m.color.setRGB(0.16 + 0.5 * S.win, 0.17 + 0.25 * S.win, 0.19 + 0.8 * S.win); });
}
const m4 = new THREE.Matrix4();
