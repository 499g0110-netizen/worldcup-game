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
// tower skin: circumference along u, height along v (top of canvas = top of wall)
function towerTexture() {
  const W = 2048, H = 1024, { cv, g } = brickCanvas(W, H), mH = H / 18.5, mW = W / (2 * Math.PI * 6.25);
  const band = (y, hgt, col) => { g.fillStyle = col; g.fillRect(0, H - y * mH - hgt * mH, W, hgt * mH); };
  // white plaster bands and terracotta frieze (photo: two pale rings and a decorated band)
  band(0.0, 0.6, '#7a6a5a'); band(5.2, 0.35, '#e8e0d0'); band(9.4, 0.35, '#e8e0d0'); band(13.6, 0.5, '#e8e0d0');
  for (let x = 0; x < W; x += 0.55 * mW) { g.fillStyle = '#b86a3e'; g.fillRect(x, H - 9.75 * mH, 0.35 * mW, 0.35 * mH); }   // frieze tiles
  // rows of arched windows: blind arches with white reveals; a few real openings
  const arch = (cx, y, ww, hh, open) => {
    const x0 = cx - ww / 2, top = H - (y + hh) * mH;
    g.fillStyle = '#e9e2d4'; g.beginPath(); g.moveTo(x0 - 4, H - y * mH); g.lineTo(x0 - 4, top + ww * mW * 0.5); g.arc(cx, top + ww * mW * 0.5, ww * mW / 2 + 4, Math.PI, 0); g.lineTo(x0 + ww * mW + 4, H - y * mH); g.fill();
    g.fillStyle = open ? '#1c1a1c' : '#7a3a2a'; g.beginPath(); g.moveTo(x0, H - y * mH); g.lineTo(x0, top + ww * mW * 0.5); g.arc(cx, top + ww * mW * 0.5, ww * mW / 2, Math.PI, 0); g.lineTo(x0 + ww * mW, H - y * mH); g.fill();
    if (open) { g.strokeStyle = '#d8d2c4'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, top + 6); g.lineTo(cx, H - y * mH); g.stroke(); }
  };
  for (let i = 0; i < 22; i++) arch((i + 0.5) * W / 22, 14.3, 0.9, 2.6, i % 2 === 0);       // upper row, dense (photo)
  for (let i = 0; i < 16; i++) arch((i + 0.5) * W / 16, 10.2, 0.9, 2.4, i % 3 === 0);       // second row
  for (let i = 0; i < 8; i++) arch((i + 0.5) * W / 8, 6.0, 0.7, 1.6, true);                 // small windows
  for (let i = 0; i < 10; i++) { g.fillStyle = '#1c1a1c'; g.fillRect((i + 0.5) * W / 10 - 0.25 * mW, H - 2.4 * mH, 0.5 * mW, 0.5 * mH); }   // gun ports
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; return t;
}
// middle block field side: stepped gable with three rows of arched windows and the inscription
function gableTexture(field) {
  const W = 1024, H = 2048, { cv, g } = brickCanvas(W, H, { bh: 9 }), mW = W / 7.6, mH = H / 26;
  const arch = (cx, y, ww, hh, col) => { const x0 = cx - ww / 2; g.fillStyle = '#e9e2d4'; g.beginPath(); g.moveTo(x0 - 5, H - y * mH); g.lineTo(x0 - 5, H - (y + hh) * mH + ww * mW / 2); g.arc(cx, H - (y + hh) * mH + ww * mW / 2, ww * mW / 2 + 5, Math.PI, 0); g.lineTo(x0 + ww * mW + 5, H - y * mH); g.fill(); g.fillStyle = col; g.beginPath(); g.moveTo(x0, H - y * mH); g.lineTo(x0, H - (y + hh) * mH + ww * mW / 2); g.arc(cx, H - (y + hh) * mH + ww * mW / 2, ww * mW / 2, Math.PI, 0); g.lineTo(x0 + ww * mW, H - y * mH); g.fill(); };
  // gate arch drawn as dark (the real passage is cut in geometry; this frames it)
  g.fillStyle = '#e8e0d0'; g.fillRect(0, H - 7.6 * mH, W, 0.35 * mH);
  if (field) { g.fillStyle = '#2b2320'; g.fillRect(0.4 * mW, H - 8.6 * mH, 6.8 * mW, 0.85 * mH); g.fillStyle = '#d9b45a'; g.font = `600 ${0.55 * mH}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CONCORDIA DOMI FORIS PAX', W / 2, H - 8.18 * mH); }
  else { g.fillStyle = '#d9b45a'; g.font = `600 ${0.6 * mH}px Georgia, serif`; g.textAlign = 'center'; g.fillText('S · P · Q · L', W / 2, H - 8.0 * mH); }
  for (const [y, n, hh] of [[9.6, 4, 2.6], [13.2, 4, 2.6], [16.8, 4, 2.4], [20.2, 3, 2.2], [23.0, 2, 1.6]]) for (let i = 0; i < n; i++) arch((i + 0.5) * W / n, y, 0.75, hh, i % 2 ? '#1c1a1c' : '#7a3a2a');
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
  const hole = new THREE.Path(); const zc = (z0 + z1) / 2, aw = 1.9; hole.moveTo(zc - aw, 0); hole.lineTo(zc - aw, 4.6); hole.absarc(zc, 4.6, aw, Math.PI, 0, true); hole.lineTo(zc + aw, 0); hole.lineTo(zc - aw, 0); body.holes.push(hole);
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
    const tex = gableTexture(field), mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, side: THREE.DoubleSide });
    // stepped silhouette: 5 steps up to the ridge, each step topped with a small pinnacle
    const s = new THREE.Shape(), w = z1 - z0, steps = 5, dh = (ridgeH + 1.5 - H1) / steps, sw = (w / 2 - 0.6) / steps;
    s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, H1);
    for (let i = 0; i < steps; i++) { const y = H1 + i * dh, hw = w / 2 - i * sw, hw2 = w / 2 - (i + 1) * sw; s.lineTo(w / 2 + hw, y + dh); s.lineTo(w / 2 + hw2, y + dh); }
    s.lineTo(w / 2 - 0.6, H1 + steps * dh);
    for (let i = steps - 1; i >= 0; i--) { const y = H1 + i * dh, hw = w / 2 - i * sw; s.lineTo(w / 2 - hw, y + dh); s.lineTo(w / 2 - hw, y); }
    s.lineTo(0, H1); s.lineTo(0, 0);
    s.holes.push(hole);
    const g = new THREE.ShapeGeometry(s, 8); const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { const zz = z0 + p.getX(i), yy = p.getY(i); uv.setXY(i, p.getX(i) / w, yy / 26); p.setXYZ(i, gx, yy, field ? zz : zz); }
    const m = new THREE.Mesh(g, mat); G.add(m);
  }
  // passage vault (dark), a heavy wooden gate leaf folded back, granite threshold
  const vault = new THREE.Mesh(new THREE.CylinderGeometry(aw, aw, x1 - x0, 24, 1, true, Math.PI / 2, Math.PI).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a2a24, roughness: 0.9, side: THREE.DoubleSide })); vault.position.set((x0 + x1) / 2, 4.6, zc); G.add(vault);
  for (const sd of [-1, 1]) { const wv = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 4.6), new THREE.MeshStandardMaterial({ color: 0x4a3028, roughness: 0.9, side: THREE.DoubleSide })); wv.rotation.y = 0; wv.position.set((x0 + x1) / 2, 2.3, zc + sd * aw); G.add(wv); }
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.2, 1.8), new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.7 })); leaf.position.set(x0 + 1.2, 2.1, zc - aw + 0.12); leaf.rotation.y = Math.PI / 2; G.add(leaf);
  G.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const colliders = [
    { c: { x: towers[0][0], z: towers[0][1] }, yaw: 0, hx: r * 0.9, hz: r * 0.9 },
    { c: { x: towers[1][0], z: towers[1][1] }, yaw: 0, hx: r * 0.9, hz: r * 0.9 },
    { c: { x: (x0 + x1) / 2, z: (z0 + zc - aw) / 2 }, yaw: 0, hx: (x1 - x0) / 2, hz: (zc - aw - z0) / 2 },
    { c: { x: (x0 + x1) / 2, z: (zc + aw + z1) / 2 }, yaw: 0, hx: (x1 - x0) / 2, hz: (z1 - zc - aw) / 2 },
  ];
  return { group: G, colliders };
}
