// Hero model of the Salzspeicher: six brick salt warehouses (16th–18th c.) side by side on the Obertrave,
// next to the Holstentor. Widths and heights follow the six OSM building:part polygons; gables on both the river
// (east) and the Holstentorplatz (west) side, alternating Renaissance stepped gables and Baroque curved gables,
// rows of small windows with wooden shutters, iron wall anchors and steep red tile roofs. Drawn in code.
import * as THREE from 'three';

// OSM parts (z0, z1, total height); x span of the block
const PARTS = [[49.2, 59.8, 10], [59.1, 68.9, 17], [68.1, 76.7, 15], [75.8, 82.7, 14], [81.3, 93.7, 15], [91.1, 105.8, 15]];
const X0 = -328.0, X1 = -299.4;
export const SALZ = { x0: X0 - 1, x1: X1 + 1, z0: 48, z1: 107 };
const STYLE = ['stepped', 'baroque', 'stepped', 'round', 'baroque', 'stepped'];
const BRICK = [[132, 58, 42], [112, 46, 36], [146, 70, 50], [120, 52, 40], [138, 64, 46], [104, 44, 34]];

// gable outline in (s across the width, y up)
function profile(style, W, e, H) {
  const p = [[0, 0], [0, e]], gh = H - e;
  if (style === 'stepped' || style === 'round') {
    const n = 5, sw = W / (2 * n + 2);
    for (let i = 0; i < n; i++) {
      const y = e + gh * (i + 1) / (n + 1), x = sw * (i + 0.5);
      p.push([x, y - gh / (n + 1)]);
      if (style === 'round') { for (let k = 0; k <= 6; k++) { const a = Math.PI - k / 6 * Math.PI; p.push([x + sw / 2 + Math.cos(a) * sw / 2, y + Math.sin(a) * sw * 0.45]); } }
      else p.push([x, y], [x + sw, y]);
    }
    const yt = e + gh; p.push([W / 2 - sw / 2, yt], [W / 2 - sw / 2, yt + 0.6], [W / 2 + sw / 2, yt + 0.6], [W / 2 + sw / 2, yt]);
    for (let i = n - 1; i >= 0; i--) {
      const y = e + gh * (i + 1) / (n + 1), x = W - sw * (i + 0.5);
      if (style === 'round') { for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI; p.push([x - sw / 2 + Math.cos(a + Math.PI) * -sw / 2 * -1 + 0, y + Math.sin(a) * sw * 0.45]); } p.push([x, y - gh / (n + 1)]); }
      else p.push([x - sw, y], [x, y], [x, y - gh / (n + 1)]);
    }
  } else {   // Baroque: two tiers of concave volutes and a curved pediment
    const t1 = e + gh * 0.45, t2 = e + gh * 0.82, i1 = W * 0.16, i2 = W * 0.32;
    const vol = (x0, y0, x1, y1, n = 8) => { for (let k = 1; k <= n; k++) { const t = k / n, a = t * Math.PI / 2; p.push([x0 + (x1 - x0) * (1 - Math.cos(a)), y0 + (y1 - y0) * Math.sin(a)]); } };
    vol(0, e, i1, t1); p.push([i1, t1 + 0.25]); vol(i1, t1 + 0.25, i2, t2); p.push([i2, t2 + 0.25]);
    for (let k = 0; k <= 10; k++) { const a = Math.PI - k / 10 * Math.PI; p.push([W / 2 + Math.cos(a) * (W / 2 - i2), t2 + 0.25 + Math.sin(a) * (H - t2) * 0.9]); }
    p.push([W - i2, t2 + 0.25], [W - i2, t2]); { const q = []; for (let k = 1; k <= 8; k++) { const t = k / 8, a = t * Math.PI / 2; q.push([W - i2 + (i2 - i1) * Math.sin(a), t2 - (t2 - t1 - 0.25) * (1 - Math.cos(a))]); } p.push(...q); }
    p.push([W - i1, t1]); for (let k = 1; k <= 8; k++) { const t = k / 8, a = t * Math.PI / 2; p.push([W - i1 + i1 * Math.sin(a), t1 - (t1 - e) * (1 - Math.cos(a))]); }
  }
  p.push([W, e], [W, 0]);
  return p;
}
function pathIn(g, pts, sx, sy, H) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, x * sx, (H - y) * sy)); g.closePath(); }

// facade texture: brick, floor bands, windows with shutters, loading doors on the axis, wall anchors
function gableTexture(style, W, e, H, col, seed, river) {
  const PX = 64, cw = Math.ceil(W * PX), ch = Math.ceil(H * PX), cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d');
  let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#4e3128'; g.fillRect(0, 0, cw, ch);
  const bh = 0.075 * PX, bl = 0.26 * PX;
  for (let y = 0, row = 0; y < ch; y += bh, row++) for (let x = -(row % 2) * bl / 2; x < cw; x += bl) { const k = (r() - 0.5) * 36, dk = r() < 0.08 ? 0.6 : 1; g.fillStyle = `rgb(${(col[0] + k) * dk | 0},${(col[1] + k * 0.6) * dk | 0},${(col[2] + k * 0.5) * dk | 0})`; g.fillRect(x + 1, y + 1, bl - 1.6, bh - 1.6); }
  const P = profile(style, W, e, H);
const halfAt = (yy) => { let lo = 0, hi = W; for (let i = 0; i < P.length; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length]; if ((y1 <= yy && y2 > yy) || (y2 <= yy && y1 > yy)) { const x = x1 + (yy - y1) / (y2 - y1) * (x2 - x1); if (x < W / 2) lo = Math.max(lo, x); else hi = Math.min(hi, x); } } return [lo, hi]; };
  // weathering: darker base, rain streaks
  const gr = g.createLinearGradient(0, ch, 0, ch - 1.2 * PX); gr.addColorStop(0, 'rgba(30,20,15,0.5)'); gr.addColorStop(1, 'rgba(30,20,15,0)'); g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
  for (let i = 0; i < 40; i++) { const x = r() * cw, y = r() * ch * 0.8; g.fillStyle = 'rgba(25,18,14,0.08)'; g.fillRect(x, y, 2 + r() * 4, r() * ch * 0.3); }
  // floors & windows: storeys of 2.4 m (warehouse lofts), windows aligned on bays
  const floors = Math.max(1, Math.floor((H - 1.2) / 2.4)), cols = Math.max(3, Math.round(W / 1.9) | 1);
  for (let f = 0; f < floors; f++) {
    const y0 = 0.9 + f * 2.4, inGable = y0 > e - 0.4;
    for (let c = 0; c < cols; c++) {
      const cx = (c + 0.5) * W / cols, axis = c === (cols - 1) / 2;
      // stay inside the gable outline
      const [lo, hi] = halfAt(y0 + 1.6); if (cx - 0.6 < lo + 0.3 || cx + 0.6 > hi - 0.3) continue;
      const ww = axis && !inGable && f < 4 ? 1.3 : 0.75, wh = axis && f === 0 && river ? 2.0 : 1.25, x = (cx - ww / 2) * PX, y = (H - y0 - wh) * PX;
      g.fillStyle = '#e6dfd2'; g.fillRect(x - 3, y - 3, ww * PX + 6, wh * PX + 6);   // pale reveal
      const shut = axis ? (r() < 0.7) : r() < 0.35;
      if (shut) { g.fillStyle = ['#3e5a45', '#5c3b2a', '#2f4560'][seed % 3]; g.fillRect(x, y, ww * PX, wh * PX); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + ww * PX / 2, y); g.lineTo(x + ww * PX / 2, y + wh * PX); for (let k = 1; k < 4; k++) { g.moveTo(x, y + wh * PX * k / 4); g.lineTo(x + ww * PX, y + wh * PX * k / 4); } g.stroke(); }
      else { g.fillStyle = '#1e2226'; g.fillRect(x, y, ww * PX, wh * PX); g.fillStyle = 'rgba(160,190,210,0.25)'; g.fillRect(x + 3, y + 3, ww * PX * 0.45, wh * PX * 0.4); g.fillStyle = '#e6dfd2'; g.fillRect(x + ww * PX / 2 - 2, y, 4, wh * PX); g.fillRect(x, y + wh * PX / 2 - 2, ww * PX, 4); }
      // segmental arch over the window
      g.strokeStyle = 'rgba(70,35,25,0.8)'; g.lineWidth = 5; g.beginPath(); g.arc(x + ww * PX / 2, y + 4, ww * PX * 0.58, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
    }
    // iron wall anchors between floors
    for (let c = 0; c <= cols; c += 2) { const ax = (c / cols) * W, ay = y0 + 2.2; const [lo, hi] = halfAt(ay); if (ax < lo + 0.4 || ax > hi - 0.4) continue; g.fillStyle = '#1c1c1c'; g.fillRect(ax * PX - 10, (H - ay) * PX - 2, 20, 4); g.fillRect(ax * PX - 2, (H - ay) * PX - 10, 4, 20); }
  }
  // hoist beam under the apex
  g.fillStyle = '#3a2a1e'; g.fillRect(W / 2 * PX - 6, (H - (H - 1.1)) * PX, 12, 0.9 * PX);
  // ground floor door on the axis
  const dw = 1.5, dh = 2.5; g.fillStyle = '#e6dfd2'; g.fillRect((W / 2 - dw / 2) * PX - 4, (H - dh) * PX - 4, dw * PX + 8, dh * PX + 4);
  g.fillStyle = river ? '#3b2a20' : '#4b3324'; g.fillRect((W / 2 - dw / 2) * PX, (H - dh) * PX, dw * PX, dh * PX);
  g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 3; for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo((W / 2 - dw / 2) * PX + k * dw * PX / 5, (H - dh) * PX); g.lineTo((W / 2 - dw / 2) * PX + k * dw * PX / 5, H * PX); g.stroke(); }
  // white-washed coping on the gable edge
  g.save(); pathIn(g, P, PX, PX, H); g.strokeStyle = 'rgba(230,224,212,0.9)'; g.lineWidth = 10; g.stroke(); g.restore();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function roofTexture() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const g = cv.getContext('2d'); let s = 5; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#5a2418'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) for (let x = -(y / 16 % 2) * 10; x < 256; x += 20) { const k = (r() - 0.5) * 40; g.fillStyle = `rgb(${150 + k | 0},${62 + k * 0.5 | 0},${44 + k * 0.4 | 0})`; g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + 19, y); g.lineTo(x + 19, y + 12); g.quadraticCurveTo(x + 10, y + 17, x + 1, y + 12); g.fill(); }
  g.fillStyle = 'rgba(60,70,40,0.18)'; for (let i = 0; i < 30; i++) g.fillRect(r() * 256, r() * 256, 6 + r() * 20, 3 + r() * 6);   // moss
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
function brickTile(col, seed) { const t = gableTexture('stepped', 6, 30, 6, col, seed, false); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }

export function buildSalzspeicher(scene) {
  const group = new THREE.Group(), roofMat = new THREE.MeshStandardMaterial({ map: roofTexture(), roughness: 0.85, side: THREE.DoubleSide }), L = X1 - X0;
  const swap = (x0, z0) => new THREE.Matrix4().set(0, 0, 1, x0, 0, 1, 0, 0, 1, 0, 0, z0, 0, 0, 0, 1);   // (s, y, depth) → (x0 + depth, y, z0 + s)
  PARTS.forEach(([z0, z1, Ht], i) => {
    const W = z1 - z0 + 0.3, e = Math.max(4.5, Ht - Math.min(W * 0.95, Ht * 0.58)), style = STYLE[i], col = BRICK[i], gh = Ht - e;
    for (const [xEnd, river] of [[X0, false], [X1, true]]) {
      const P = profile(style, W, e, Ht), sh = new THREE.Shape(P.map(([x, y]) => new THREE.Vector2(x, y)));
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.45, bevelEnabled: false, curveSegments: 4 });
      // caps carry (s, y) in metres as uv → normalise to the texture
      const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) / W, uv.getY(k) / Ht);
      geo.applyMatrix4(swap(xEnd - (river ? 0.2 : 0.25), z0 - 0.15)); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: gableTexture(style, W, e, Ht, col, 31 + i * 7 + (river ? 3 : 0), river), roughness: 0.88, side: THREE.DoubleSide }));
      m.castShadow = m.receiveShadow = true; group.add(m);
    }
    // body side walls (only the two outer ones are visible) and the roof
    const wallTex = brickTile(col, 91 + i); wallTex.repeat.set(L / 6, e / 6);
    const wm = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 });
    for (const [zz, show] of [[z0 - 0.1, i === 0], [z1 + 0.1, i === PARTS.length - 1]]) { if (!show) continue; const w = new THREE.Mesh(new THREE.PlaneGeometry(L, e), wm); w.position.set((X0 + X1) / 2, e / 2, zz); if (zz < 80) w.rotation.y = Math.PI; w.castShadow = w.receiveShadow = true; group.add(w); }
    const ridge = e + gh * 0.92, half = W / 2 + 0.25, slope = Math.hypot(half, ridge - e);
    for (const sd of [-1, 1]) {
      const rg = new THREE.PlaneGeometry(L - 0.5, slope); const t = roofMat.map; void t;
      const r = new THREE.Mesh(rg, roofMat); r.rotation.order = 'YXZ'; r.rotation.y = 0; r.rotation.x = -Math.PI / 2 + sd * Math.atan2(ridge - e, half);
      r.position.set((X0 + X1) / 2, (e + ridge) / 2, (z0 + z1) / 2 + sd * half / 2);
      const uvs = rg.attributes.uv; for (let k = 0; k < uvs.count; k++) uvs.setXY(k, uvs.getX(k) * L / 2.2, uvs.getY(k) * slope / 2.2);
      r.castShadow = r.receiveShadow = true; group.add(r);
    }
  });
  // quay along the river side
  const quay = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, PARTS.at(-1)[1] - PARTS[0][0] + 4), new THREE.MeshStandardMaterial({ color: 0x8d8678, roughness: 0.9 }));
  quay.position.set(X1 + 1.3, 0.2, (PARTS[0][0] + PARTS.at(-1)[1]) / 2); quay.receiveShadow = true; group.add(quay);
  scene.add(group);
  const zc = (PARTS[0][0] + PARTS.at(-1)[1]) / 2;
  return { colliders: [{ c: new THREE.Vector3((X0 + X1) / 2, 0, zc), yaw: 0, hx: L / 2 + 0.3, hz: (PARTS.at(-1)[1] - PARTS[0][0]) / 2 + 0.2 }] };
}
