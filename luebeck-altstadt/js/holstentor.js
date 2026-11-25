// Hero model of the Holstentor (1464–1478), built from its OSM footprint and the reference photos:
// two round brick towers with conical slate roofs, white plaster bands and rows of arched windows,
// a narrow middle block with a stepped gable on the field (west) side, the gate passage, and the
// inscription CONCORDIA DOMI FORIS PAX over the field-side arch. Everything is drawn in code.
import * as THREE from 'three';

// OSM: towers centred at (-350.9, 24.4) and (-350.8, 45.3), radius ≈ 6.2 m, walls ≈ 18.5 m, roofs to 38 m
export const HOLSTEN = { x: -350.9, z: 34.9, towers: [[-350.9, 24.45], [-350.8, 45.3]], r: 6.25, wall: 18.5, top: 38, west: -357.4, east: -344.3 };

function brickCanvas(w, h, opts = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
  g.fillStyle = '#5a3a30'; g.fillRect(0, 0, w, h);   // mortar
  const bh = opts.bh || 6, bl = bh * 2.4;
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let y = 0, row = 0; y < h; y += bh, row++) for (let x = -((row % 2) * bl) / 2; x < w; x += bl) {
    const dark = r() < 0.14, k = (r() - 0.5) * 34;
    const base = dark ? [70, 32, 26] : [138, 62, 44];   // dark glazed headers sprinkled through, as on the gate
    g.fillStyle = `rgb(${base[0] + k},${base[1] + k * 0.5},${base[2] + k * 0.4})`; g.fillRect(x + 1, y + 1, bl - 1.5, bh - 1.5);
  }
  return { cv, g };
}
// terracotta frieze band with white edge lines (the decorated bands of the photo)
function frieze(g, W, y0, hPx, scale) {
  g.fillStyle = '#efe7d8'; g.fillRect(0, y0 - 3, W, 4); g.fillRect(0, y0 + hPx - 1, W, 4);
  g.fillStyle = '#c7693d'; g.fillRect(0, y0 + 1, W, hPx - 2);
  const step = hPx * 1.1;
  for (let x = 0; x < W; x += step) {   // moulded tiles: quatrefoil-ish rosettes
    g.fillStyle = '#a9532f'; g.fillRect(x + 2, y0 + 3, step - 4, hPx - 6);
    g.fillStyle = '#e19a64'; g.beginPath(); g.arc(x + step / 2, y0 + hPx / 2, hPx * 0.28, 0, 7); g.fill();
    g.fillStyle = '#8f4426'; g.beginPath(); g.arc(x + step / 2, y0 + hPx / 2, hPx * 0.12, 0, 7); g.fill();
  }
}
// window with a round or pointed head: dark-red brick reveal, dark glass, thin white mullion
function win(g, cx, yb, w, h, opts = {}) {
  const head = (inset) => { const x0 = cx - w / 2 + inset, x1 = cx + w / 2 - inset, r = (x1 - x0) / 2, ys = yb - h + r + inset;
    g.beginPath(); g.moveTo(x0, yb); g.lineTo(x0, ys);
    if (opts.pointed) { g.quadraticCurveTo(x0, ys - r * 1.1, cx, ys - r * 1.35); g.quadraticCurveTo(x1, ys - r * 1.1, x1, ys); } else g.arc(cx, ys, r, Math.PI, 0);
    g.lineTo(x1, yb); g.closePath(); };
  g.fillStyle = '#5a2418'; head(-w * 0.12); g.fill();          // moulded brick reveal
  g.fillStyle = opts.fill || '#1b1a1e'; head(0); g.fill();
  if (opts.glass) { g.fillStyle = 'rgba(150,175,200,0.22)'; head(w * 0.12); g.fill(); g.fillStyle = '#d8d0c2'; g.fillRect(cx - 1.5, yb - h + w * 0.4, 3, h - w * 0.4); g.fillRect(cx - w / 2, yb - h * 0.45, w, 3); }
}
// tower skin: circumference along u, height along v (top of canvas = top of wall). Matches the field-side photo:
// sloped plinth, gun ports, three terracotta frieze bands, few small round-headed windows per storey.
function towerTexture() {
  const W = 2048, H = 1024, { cv, g } = brickCanvas(W, H), mH = H / 18.5, mW = W / (2 * Math.PI * 6.25);
  const Y = (y) => H - y * mH;
  g.fillStyle = 'rgba(40,20,15,0.35)'; g.fillRect(0, Y(1.3), W, 1.3 * mH);
  for (const [y, h] of [[4.6, 0.55], [9.6, 0.55], [14.4, 0.5]]) frieze(g, W, Y(y + h), h * mH, mW);
  g.fillStyle = '#efe7d8'; g.fillRect(0, Y(18.5), W, 0.25 * mH);
  for (let i = 0; i < 12; i++) { g.fillStyle = '#1c1a1c'; g.fillRect((i + 0.5) * W / 12 - 0.3 * mW, Y(2.6), 0.6 * mW, 0.45 * mH); }   // gun ports
  for (let i = 0; i < 6; i++) win(g, (i + 0.25) * W / 6, Y(6.4), 0.75 * mW, 1.9 * mH, { glass: i % 2 === 0 });
  for (let i = 0; i < 7; i++) win(g, (i + 0.7) * W / 7, Y(11.2), 0.85 * mW, 2.1 * mH, { glass: true });
  for (let i = 0; i < 8; i++) win(g, (i + 0.45) * W / 8, Y(15.6), 1.0 * mW, 2.2 * mH, { glass: true, pointed: i % 2 === 1 });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; return t;
}
// middle block facade (u across 10.6 m, v over 26 m): gate arch surround, inscription band, rows of round-headed
// windows between frieze bands, and the stepped gable with tall pale blind panels.
function gableTexture(field, w, H1, ridge, steps, sw, dh, zcL, aw) {
  const W = 1024, H = 2048, { cv, g } = brickCanvas(W, H, { bh: 9 }), mW = W / w, mH = H / 26, Y = (y) => H - y * mH, X = (x) => x * mW;
  g.fillStyle = 'rgba(40,20,15,0.35)'; g.fillRect(0, Y(1.2), W, 1.2 * mH);
  // arch surround: alternating glazed / red voussoirs
  for (let k = 0; k <= 22; k++) { const a = Math.PI + k / 22 * Math.PI, r0 = aw, r1 = aw + 0.55; g.fillStyle = k % 2 ? '#3a1f18' : '#a24b30'; g.beginPath(); g.arc(X(zcL), Y(4.6), r1 * mW, a, a + Math.PI / 22 + 0.01); g.arc(X(zcL), Y(4.6), r0 * mW, a + Math.PI / 22 + 0.01, a, true); g.fill(); }
  frieze(g, W, Y(7.0), 0.4 * mH); 
  if (field) { g.fillStyle = '#c7693d'; g.fillRect(0, Y(7.9), W, 0.85 * mH); g.fillStyle = '#efe7d8'; g.fillRect(0, Y(7.95), W, 3); g.fillStyle = '#3a2010'; g.font = `700 ${0.6 * mH}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CONCORDIA DOMI FORIS PAX', W / 2, Y(7.45)); }
  else { g.fillStyle = '#d9b45a'; g.font = `600 ${0.6 * mH}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('S · P · Q · L', W / 2, Y(7.45)); }
  for (let i = 0; i < 7; i++) win(g, X((i + 0.5) * w / 7), Y(8.4), 0.55 * mW, 1.1 * mH, { glass: true });
  frieze(g, W, Y(10.1), 0.4 * mH);
  for (let i = 0; i < 6; i++) win(g, X((i + 0.5) * w / 6), Y(10.6), 0.95 * mW, 2.9 * mH, { glass: i % 2 === 0, fill: i % 2 ? '#7a3424' : undefined });
  frieze(g, W, Y(14.3), 0.4 * mH);
  for (let i = 0; i < 6; i++) win(g, X((i + 0.5) * w / 6), Y(14.8), 0.9 * mW, 2.8 * mH, { glass: i % 2 === 1, fill: i % 2 ? undefined : '#7a3424' });
  frieze(g, W, Y(H1), 0.35 * mH);
  // gable: tall blind panels with pale plaster fill, topped by round heads, following the steps
  const n = 6;
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5) * w / n, d = Math.abs(cx - w / 2), lvl = Math.max(0, Math.floor((w / 2 - d) / sw)), top = H1 + Math.min(steps, lvl) * dh - 0.5;
    if (top - H1 < 1.5) continue;
    win(g, X(cx), Y(H1 + 0.6), 0.85 * mW, (top - H1 - 0.6) * mH, { fill: '#e3dbcd' });
    if (top - H1 > 4) win(g, X(cx), Y(H1 + 1.5), 0.45 * mW, 1.6 * mH, { glass: true });
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function buildHolstentor(scene) {
  const G = new THREE.Group(); G.name = 'Holstentor'; scene.add(G);
  const tTex = towerTexture();
  const towerMat = new THREE.MeshStandardMaterial({ map: tTex, roughness: 0.82 });
  const slate = new THREE.MeshStandardMaterial({ color: 0x3a3e45, roughness: 0.55, metalness: 0.15 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a845, roughness: 0.25, metalness: 1 });
  const brickPlain = new THREE.MeshStandardMaterial({ map: brickCanvas(512, 512).cv && new THREE.CanvasTexture(brickCanvas(512, 512).cv), roughness: 0.85 });
  brickPlain.map.colorSpace = THREE.SRGBColorSpace; brickPlain.map.wrapS = brickPlain.map.wrapT = THREE.RepeatWrapping; brickPlain.map.repeat.set(4, 4); brickPlain.side = THREE.DoubleSide;
  const { towers, r, wall, top } = HOLSTEN;
  for (const [x, z] of towers) {
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.03, wall, 64, 1, true), towerMat); tw.position.set(x, wall / 2, z); G.add(tw);
    // slight batter at the base (sloped plinth) and the white eaves ring
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.08, 1.2, 64), brickPlain); base.position.set(x, 0.6, z); G.add(base);
    const eaves = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.35, r + 0.25, 0.4, 64), new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.7 })); eaves.position.set(x, wall + 0.2, z); G.add(eaves);
    // conical slate roof, slightly bell-flared at the foot, with dormer lucarnes and a gold finial
    const prof = []; for (let i = 0; i <= 24; i++) { const k = i / 24; prof.push(new THREE.Vector2((r + 0.55) * (1 - k) * (1 - 0.12 * Math.sin(k * Math.PI)) + 0.05, k * (top - wall))); }
    const roof = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), slate); roof.position.set(x, wall + 0.35, z); G.add(roof);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4, dr = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.4, 4), slate); dr.position.set(x + Math.cos(a) * (r - 0.6), wall + 4.2, z + Math.sin(a) * (r - 0.6)); G.add(dr); }
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), gold); ball.position.set(x, top + 0.6, z); G.add(ball);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), gold); rod.position.set(x, top + 0.9, z); G.add(rod);
  }
  // middle block between the towers (z ≈ 30.3 – 39.6), with the gate passage running east–west
  const z0 = 29.6, z1 = 40.2, x0 = HOLSTEN.west + 0.3, x1 = HOLSTEN.east - 0.2, H1 = 18.5;
  const body = new THREE.Shape(); body.moveTo(z0, 0); body.lineTo(z1, 0); body.lineTo(z1, H1); body.lineTo(z0, H1); body.lineTo(z0, 0);
  const hole = new THREE.Path(); const zc = (z0 + z1) / 2, aw = 2.15; hole.moveTo(zc - aw, 0); hole.lineTo(zc - aw, 4.6); hole.absarc(zc, 4.6, aw, Math.PI, 0, true); hole.lineTo(zc + aw, 0); hole.lineTo(zc - aw, 0); body.holes.push(hole);
  const bodyG = new THREE.ExtrudeGeometry(body, { depth: x1 - x0, bevelEnabled: false });
  bodyG.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, x0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));   // (shape x, y, depth) → (world x0+depth, y, z)
  { const p = bodyG.attributes.position, uv = bodyG.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getZ(i) + p.getX(i)) / 2.5, p.getY(i) / 2.5); }
  const bodyM = new THREE.Mesh(bodyG, brickPlain); G.add(bodyM);
  // gabled roof over the middle block, ridge east–west, and stepped gables on both ends
  const ridgeH = 26.5;
  const rf = new THREE.BufferGeometry(); {
    const v = [], add = (a, b, c) => v.push(...a, ...b, ...c);
    const A = [x0, H1, z0], B = [x1, H1, z0], C2 = [x1, ridgeH, zc], D = [x0, ridgeH, zc], E = [x0, H1, z1], F = [x1, H1, z1];
    add(A, D, C2); add(A, C2, B); add(E, F, C2); add(E, C2, D);
    rf.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); rf.computeVertexNormals();
  }
  G.add(new THREE.Mesh(rf, new THREE.MeshStandardMaterial({ color: 0x4a3f3a, roughness: 0.7, side: THREE.DoubleSide })));
  for (const [gx, field] of [[x0 - 0.05, true], [x1 + 0.05, false]]) {
    // stepped silhouette: 5 steps up to the ridge
    const s = new THREE.Shape(), w = z1 - z0, steps = 5, dh = (ridgeH + 1.5 - H1) / steps, sw = (w / 2 - 0.6) / steps;
    const tex = gableTexture(field, w, H1, ridgeH, steps, sw, dh, zc - z0, aw), mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, side: THREE.DoubleSide });
    const holeL = new THREE.Path(); holeL.moveTo(zc - z0 - aw, 0); holeL.lineTo(zc - z0 - aw, 4.6); holeL.absarc(zc - z0, 4.6, aw, Math.PI, 0, true); holeL.lineTo(zc - z0 + aw, 0); holeL.lineTo(zc - z0 - aw, 0);
    s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, H1);
    for (let i = 0; i < steps; i++) { const y = H1 + i * dh, hw = w / 2 - i * sw, hw2 = w / 2 - (i + 1) * sw; s.lineTo(w / 2 + hw, y + dh); s.lineTo(w / 2 + hw2, y + dh); }
    s.lineTo(w / 2 - 0.6, H1 + steps * dh);
    for (let i = steps - 1; i >= 0; i--) { const y = H1 + i * dh, hw = w / 2 - i * sw; s.lineTo(w / 2 - hw, y + dh); s.lineTo(w / 2 - hw, y); }
    s.lineTo(0, H1); s.lineTo(0, 0);
    s.holes.push(holeL);
    const g = new THREE.ShapeGeometry(s, 8); const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { const zz = z0 + p.getX(i), yy = p.getY(i); uv.setXY(i, field ? p.getX(i) / w : 1 - p.getX(i) / w, yy / 26); /* city side seen from the east: mirrored so the lettering reads correctly */ p.setXYZ(i, gx, yy, field ? zz : zz); }
    const m = new THREE.Mesh(g, mat); G.add(m);
  }
  // (the passage walls and barrel vault come from the extruded hole in the middle block itself)
  G.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const colliders = [
    { c: { x: towers[0][0], z: towers[0][1] }, yaw: 0, hx: r * 0.9, hz: r * 0.9 },
    { c: { x: towers[1][0], z: towers[1][1] }, yaw: 0, hx: r * 0.9, hz: r * 0.9 },
    { c: { x: (x0 + x1) / 2, z: (z0 + zc - aw) / 2 }, yaw: 0, hx: (x1 - x0) / 2, hz: (zc - aw - z0) / 2 },
    { c: { x: (x0 + x1) / 2, z: (zc + aw + z1) / 2 }, yaw: 0, hx: (x1 - x0) / 2, hz: (z1 - zc - aw) / 2 },
  ];
  return { group: G, colliders };
}
