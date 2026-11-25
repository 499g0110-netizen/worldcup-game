// Hero model of the Lübeck Rathaus front on the Markt (north side of the square), from the reference photos:
// ground-floor arcade of pointed arches with a walkable rib-vaulted gallery (white webs, red brick ribs, iron tie
// rods, hanging lanterns, sandstone flags) and café tables under white parasols; first floor with four large
// mullioned windows under brick relieving arches; white sandstone inscription frieze with corbels; and the dark
// glazed show wall ("Schauwand") with six slender turrets, wind holes open to the sky, lancets and coats of arms.
// Placement follows the OSM building:parts of the Rathaus south front (x 7.5–42.4, z ≈ −51 … −47).
import * as THREE from 'three';

const P0 = [7.5, -51.25], P1 = [42.4, -47.05];
const L = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]), TH = -Math.atan2(P1[1] - P0[1], P1[0] - P0[0]);
export const RATHAUS = { x0: 7, x1: 43, z0: -57.5, z1: -47 };
const BAYS = 8, BW = L / BAYS, SPRING = 2.7, APEX = 4.25, OPEN = BW - 0.95, DEPTH = 4.6, F1 = 4.8, F2 = 10.0, FR = 10.9, TOPW = 21.0;

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, rep) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; }
// Lübeck brickwork: red stretchers with courses of black-glazed headers (the Rathaus is mostly glazed dark brick)
function bricks(g, w, h, bh, dark, seed = 3) {
  let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = dark ? '#2a221f' : '#6a4a3c'; g.fillRect(0, 0, w, h);
  const bl = bh * 2.3;
  for (let y = 0, row = 0; y < h; y += bh, row++) for (let x = -(row % 2) * bl / 2; x < w; x += bl) {
    const glazed = dark ? r() < 0.7 : (row % 3 === 0 && r() < 0.5) || r() < 0.12, k = (r() - 0.5) * 22;
    if (glazed) { const v = 34 + k * 0.6; g.fillStyle = `rgb(${v + 8 | 0},${v | 0},${v - 4 | 0})`; } else g.fillStyle = dark ? `rgb(${96 + k | 0},${46 + k * 0.5 | 0},${34 + k * 0.4 | 0})` : `rgb(${142 + k | 0},${64 + k * 0.5 | 0},${44 + k * 0.4 | 0})`;
    g.fillRect(x + 1, y + 1, bl - 1.6, bh - 1.6);
    if (glazed && r() < 0.5) { g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + 2, y + 1.5, bl * 0.5, 1.5); }   // glaze sheen
  }
}
function pointed(g, cx, yb, w, h) { const r = w / 2, ys = yb - h + w * 0.7; g.beginPath(); g.moveTo(cx - r, yb); g.lineTo(cx - r, ys); g.quadraticCurveTo(cx - r, yb - h + w * 0.15, cx, yb - h); g.quadraticCurveTo(cx + r, yb - h + w * 0.15, cx + r, ys); g.lineTo(cx + r, yb); g.closePath(); }

function firstFloorTex() {   // L × (F2 − F1)
  const PX = 58, W = Math.round(L * PX), H = Math.round((F2 - F1) * PX), [c, g] = cv(W, H); bricks(g, W, H, 0.09 * PX, true, 5);
  for (let i = 0; i < 4; i++) {
    const cx = (i + 0.5) * W / 4, ww = 2.6 * PX, wh = 2.9 * PX, yb = H - 0.9 * PX;
    // relieving arch of red moulded brick
    g.strokeStyle = '#8e3d28'; g.lineWidth = 0.32 * PX; g.beginPath(); g.ellipse(cx, yb - wh + 0.25 * PX, ww * 0.68, 1.3 * PX, 0, Math.PI, 0); g.stroke();
    g.fillStyle = '#e9e4da'; g.fillRect(cx - ww / 2 - 6, yb - wh - 6, ww + 12, wh + 12);
    g.fillStyle = '#26323e'; g.fillRect(cx - ww / 2, yb - wh, ww, wh);
    const gr = g.createLinearGradient(0, yb - wh, 0, yb); gr.addColorStop(0, 'rgba(190,210,230,0.45)'); gr.addColorStop(1, 'rgba(90,110,130,0.1)'); g.fillStyle = gr; g.fillRect(cx - ww / 2, yb - wh, ww, wh);
    g.fillStyle = '#f2efe8'; for (let k = 1; k < 4; k++) g.fillRect(cx - ww / 2 + k * ww / 4 - 2, yb - wh, 4, wh); for (let k = 1; k < 4; k++) g.fillRect(cx - ww / 2, yb - wh + k * wh / 4 - 2, ww, 4);
    g.fillStyle = '#d8d1c3'; g.fillRect(cx - ww / 2 - 10, yb, ww + 20, 0.14 * PX);   // sill
  }
  return tex(c);
}
function friezeTex() {   // white sandstone band with an inscription in black letter
  const [c, g] = cv(4096, 128); g.fillStyle = '#e8e2d4'; g.fillRect(0, 0, 4096, 128);
  g.fillStyle = 'rgba(0,0,0,0.06)'; for (let i = 0; i < 300; i++) g.fillRect(Math.random() * 4096, Math.random() * 128, 6, 2);
  g.strokeStyle = '#b9b0a0'; g.lineWidth = 3; g.strokeRect(6, 10, 4084, 108);
  g.fillStyle = '#3a3430'; g.font = 'italic 600 30px Georgia, serif'; g.textBaseline = 'middle';
  const txt = 'Anno Domini · Senatus Populusque Lubecensis · Concordia parvae res crescunt · ';
  for (let x = 30, k = 0; x < 4096; k++) { g.fillText(txt, x, 64); x += g.measureText(txt).width; }
  return tex(c);
}
// show wall with transparent wind holes: L × (TOPW − FR)
function showWallTex() {
  const PX = 56, W = Math.round(L * PX), H = Math.round((TOPW - FR) * PX), [c, g] = cv(W, H); bricks(g, W, H, 0.09 * PX, true, 9);
  const bay = W / 5, arms = [['#5a8f5a', '#e8d06a'], ['#d9cbb0', '#2a2a2a'], ['#c75a5a', '#f2efe8'], ['#5a8f5a', '#f2efe8'], ['#e8d06a', '#2a2a2a'], ['#f2efe8', '#b0242a']];
  for (let b = 0; b < 5; b++) for (let h2 = 0; h2 < 2; h2++) {
    const cx = b * bay + bay * (h2 ? 0.7 : 0.3), half = bay * 0.19;
    // tall pointed recess
    g.fillStyle = '#1c1715'; pointed(g, cx, H - 0.5 * PX, half * 2, H - 1.4 * PX); g.fill();
    g.fillStyle = '#2e2522'; pointed(g, cx, H - 0.5 * PX, half * 1.8, H - 1.6 * PX); g.fill();
    // coat of arms disc
    const ay = H - 1.9 * PX, R = half * 0.78; const [c1, c2] = arms[(b * 2 + h2) % arms.length];
    g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(cx, ay, R + 5, 0, 7); g.fill(); g.fillStyle = c1; g.beginPath(); g.arc(cx, ay, R, 0, 7); g.fill();
    g.fillStyle = c2; if ((b + h2) % 3 === 0) { g.fillRect(cx - R, ay, 2 * R, R * 0.9); } else if ((b + h2) % 3 === 1) { for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; g.beginPath(); g.moveTo(cx, ay); g.lineTo(cx + Math.cos(a) * R, ay + Math.sin(a) * R); g.lineTo(cx + Math.cos(a + 0.2) * R, ay + Math.sin(a + 0.2) * R); g.fill(); } } else { g.beginPath(); g.ellipse(cx, ay, R * 0.45, R * 0.6, 0, 0, 7); g.fill(); }
    // little tracery band
    g.fillStyle = '#8a7d6c'; g.fillRect(cx - half, H - 3.1 * PX, half * 2, 0.16 * PX);
    // two pale lancets
    for (const dx of [-0.48, 0.48]) { g.fillStyle = '#e6e1d6'; pointed(g, cx + dx * half, H - 3.4 * PX, half * 0.62, 2.0 * PX); g.fill(); }
    // round wind hole: alternately open to the sky (alpha) or plastered white
    const ry = H - 6.6 * PX, rr = half * 0.72;
    if ((b + h2) % 2 === 0) { g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(cx, ry, rr, 0, 7); g.fill(); g.restore(); g.strokeStyle = '#7a3424'; g.lineWidth = 6; g.beginPath(); g.arc(cx, ry, rr + 3, 0, 7); g.stroke(); }
    else { g.fillStyle = '#e8e3d8'; g.beginPath(); g.arc(cx, ry, rr, 0, 7); g.fill(); }
  }
  // crenellated top edge
  g.save(); g.globalCompositeOperation = 'destination-out'; for (let x = 0; x < W; x += 0.7 * PX) g.fillRect(x, 0, 0.35 * PX, 0.28 * PX); g.restore();
  return tex(c);
}
function wallTex(dark, seed) { const [c, g] = cv(512, 512); bricks(g, 512, 512, 18, dark, seed); return tex(c, true); }
function backWallTex() {   // inside the arcade: brick wall with blind arched niches, shop windows and doors
  const PX = 48, W = Math.round(L * PX), H = Math.round(F1 * PX), [c, g] = cv(W, H); bricks(g, W, H, 0.09 * PX, false, 13);
  g.fillStyle = '#d9cfbd'; g.fillRect(0, H - 3.0 * PX, W, 0.22 * PX);   // sandstone string course
  for (let i = 0; i < BAYS * 2; i++) {
    const cx = (i + 0.5) * W / (BAYS * 2), door = i % 4 === 1, shop = i % 4 === 2;
    g.fillStyle = '#7a3424'; pointed(g, cx, H, 1.35 * PX, 2.6 * PX); g.fill();
    g.fillStyle = door ? '#3b2618' : shop ? '#f0e0b8' : '#5c2a1c'; pointed(g, cx, H, 1.05 * PX, 2.35 * PX); g.fill();
    if (shop) { g.fillStyle = 'rgba(120,80,40,0.55)'; for (let k = 0; k < 4; k++) g.fillRect(cx - 0.4 * PX, H - (0.5 + k * 0.45) * PX, 0.8 * PX, 0.08 * PX); }
  }
  return tex(c);
}
function flagsTex() {   // sandstone floor slabs
  const [c, g] = cv(512, 512); g.fillStyle = '#7d756a'; g.fillRect(0, 0, 512, 512); let s = 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < 512; y += 64) { let x = -r() * 60; while (x < 512) { const w = 60 + r() * 90, v = 176 + (r() - 0.5) * 30; g.fillStyle = `rgb(${v | 0},${v - 10 | 0},${v - 26 | 0})`; g.fillRect(x + 2, y + 2, w - 4, 60); x += w; } }
  return tex(c, true);
}

export function buildRathaus(scene) {
  const G = new THREE.Group(); G.position.set(P0[0], 0, P0[1]); G.rotation.y = TH; scene.add(G);
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  const redBrick = std({ map: wallTex(false, 21) }), darkBrick = std({ map: wallTex(true, 23), roughness: 0.55 });
  // ---- arcade front wall with pointed arches (local: x along the facade, z outward to the Markt)
  const front = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(L, 0), new THREE.Vector2(L, F1), new THREE.Vector2(0, F1)]);
  for (let i = 0; i < BAYS; i++) {
    const cx = (i + 0.5) * BW, h = OPEN / 2, p = new THREE.Path();
    p.moveTo(cx - h, 0); p.lineTo(cx - h, SPRING); p.quadraticCurveTo(cx - h, SPRING + (APEX - SPRING) * 0.75, cx, APEX); p.quadraticCurveTo(cx + h, SPRING + (APEX - SPRING) * 0.75, cx + h, SPRING); p.lineTo(cx + h, 0); p.lineTo(cx - h, 0);
    front.holes.push(p);
  }
  const fg = new THREE.ExtrudeGeometry(front, { depth: 0.8, bevelEnabled: false, curveSegments: 10 }); fg.translate(0, 0, -0.8);
  { const uv = fg.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) / 1.2, uv.getY(k) / 1.2); }
  G.add(new THREE.Mesh(fg, darkBrick));
  // red moulded archivolts around each arch + sandstone capitals at the springing
  const capM = std({ color: 0xd9d0bf }), ribM = std({ color: 0x9c4a30 });
  for (let i = 0; i < BAYS; i++) {
    const cx = (i + 0.5) * BW, h = OPEN / 2;
    const curve = new THREE.CurvePath(); curve.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(cx - h - 0.05, SPRING, 0.06), new THREE.Vector3(cx - h - 0.05, SPRING + (APEX - SPRING) * 0.8, 0.06), new THREE.Vector3(cx, APEX + 0.12, 0.06)));
    curve.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(cx, APEX + 0.12, 0.06), new THREE.Vector3(cx + h + 0.05, SPRING + (APEX - SPRING) * 0.8, 0.06), new THREE.Vector3(cx + h + 0.05, SPRING, 0.06)));
    G.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.14, 6), ribM));
    for (const sx of [-1, 1]) { const cap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.9), capM); cap.position.set(cx + sx * (h + 0.12), SPRING - 0.1, -0.4); G.add(cap); }
  }
  // ---- rib-vaulted gallery behind the arches (photo 4)
  const webM = std({ color: 0xf3eadc, side: THREE.DoubleSide, roughness: 0.95, vertexColors: true }), dc = -0.8 - (DEPTH - 0.8) / 2, hd = (DEPTH - 0.8) / 2, hw = BW / 2, RISE = 1.75;
  const vy = (u, v) => SPRING + RISE * Math.min(Math.sqrt(Math.max(0, 1 - u * u)), Math.sqrt(Math.max(0, 1 - v * v)));
  for (let i = 0; i < BAYS; i++) {
    const cx = (i + 0.5) * BW, N = 14, pos = [], idx = [];
    for (let a = 0; a <= N; a++) for (let b = 0; b <= N; b++) { const u = -1 + 2 * a / N, v = -1 + 2 * b / N; pos.push(cx + u * hw, vy(u, v), dc + v * hd); }
    for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) { const k = a * (N + 1) + b; idx.push(k, k + 1, k + N + 2, k, k + N + 2, k + N + 1); }
    const vg = new THREE.BufferGeometry(); vg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); vg.setIndex(idx); vg.computeVertexNormals();
    { const col = []; for (let k = 0; k < pos.length; k += 3) { const t = (pos[k + 1] - SPRING) / RISE, sh = 0.62 + 0.38 * Math.pow(Math.max(0, t), 0.7); col.push(sh, sh * 0.98, sh * 0.95); } vg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); } G.add(new THREE.Mesh(vg, webM));   // web shading: darker toward the springing
    // diagonal ribs and the transverse arch
    for (const sg of [1, -1]) { const pts = []; for (let k = 0; k <= 20; k++) { const t = -0.995 + 1.99 * k / 20; pts.push(new THREE.Vector3(cx + t * hw, vy(t, sg * t) - 0.1, dc + sg * t * hd)); } G.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.12, 6), ribM)); }
    const tp = []; for (let k = 0; k <= 20; k++) { const v = -0.995 + 1.99 * k / 20; tp.push(new THREE.Vector3(cx + hw, SPRING + RISE * Math.sqrt(1 - v * v) - 0.02, dc + v * hd)); }
    if (i < BAYS - 1) G.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tp), 24, 0.16, 6), ribM));
    // boss, iron tie rods and a hanging lantern
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), capM); boss.position.set(cx, SPRING + RISE - 0.08, dc); G.add(boss);
    const iron = std({ color: 0x1c1c1c, metalness: 0.6, roughness: 0.5 });
    if (i < BAYS - 1) { const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, DEPTH - 0.8, 6), iron); rod.rotation.x = Math.PI / 2; rod.position.set(cx + hw, SPRING + 0.05, dc); G.add(rod); }
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 4), iron); chain.position.set(cx, SPRING + RISE - 0.55, dc); G.add(chain);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.015, 6, 24), iron); ring.position.set(cx, SPRING + RISE - 1.05, dc); G.add(ring);
    const lan = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.13, 0.42, 4), std({ color: 0xfff2d0, emissive: 0xffd9a0, emissiveIntensity: 0.55, roughness: 0.3 })); lan.position.set(cx, SPRING + RISE - 1.2, dc); lan.rotation.y = Math.PI / 4; G.add(lan);
    const cap2 = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.16, 4), iron); cap2.position.set(cx, SPRING + RISE - 0.93, dc); cap2.rotation.y = Math.PI / 4; G.add(cap2);
  }
  // back wall with niches, end walls, floor
  const back = new THREE.Mesh(new THREE.PlaneGeometry(L, F1), std({ map: backWallTex() })); back.position.set(L / 2, F1 / 2, -DEPTH); G.add(back);
  for (const ex of [0.02, L - 0.02]) { const e = new THREE.Mesh(new THREE.PlaneGeometry(DEPTH, F1), redBrick); e.rotation.y = Math.PI / 2; e.position.set(ex, F1 / 2, -DEPTH / 2); G.add(e); }
  const ft = flagsTex(); ft.repeat.set(L / 4, DEPTH / 4); const floor = new THREE.Mesh(new THREE.PlaneGeometry(L, DEPTH), std({ map: ft, roughness: 0.8, color: 0xffe6c8 })); floor.rotation.x = -Math.PI / 2; floor.position.set(L / 2, 0.025, -DEPTH / 2); G.add(floor);
  // ---- upper storeys
  const ff = new THREE.Mesh(new THREE.PlaneGeometry(L, F2 - F1), std({ map: firstFloorTex(), roughness: 0.6 })); ff.position.set(L / 2, (F1 + F2) / 2, 0.01); G.add(ff);
  const body = new THREE.Mesh(new THREE.BoxGeometry(L, 12, 5.2), darkBrick); body.position.set(L / 2, F1 + 6, -0.6 - 2.6 - 0.01); G.add(body);
  const roofM = std({ color: 0x3f3430, roughness: 0.75, side: THREE.DoubleSide }), roof = new THREE.Mesh(new THREE.PlaneGeometry(L, 7.2), roofM); roof.rotation.x = -Math.PI / 2 - 0.62; roof.position.set(L / 2, 18.4, -3.6); G.add(roof);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(L, FR - F2, 0.5), [std({ color: 0xe8e2d4 }), std({ color: 0xe8e2d4 }), std({ color: 0xe8e2d4 }), std({ color: 0xd0c8b8 }), std({ map: friezeTex() }), std({ color: 0xe8e2d4 })]);
  fr.position.set(L / 2, (F2 + FR) / 2, 0.15); G.add(fr);
  const sw = new THREE.Mesh(new THREE.PlaneGeometry(L, TOPW - FR), std({ map: showWallTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5 })); sw.position.set(L / 2, (FR + TOPW) / 2, 0.02); G.add(sw);
  // ---- six turrets on white corbels; three dark spires (west), three copper-green (east)
  const turTex = wallTex(true, 31); turTex.repeat.set(2, 6);
  const turM = std({ map: turTex, roughness: 0.5 }), dark = std({ color: 0x3b2c26, roughness: 0.6 }), copper = std({ color: 0x7fc0a4, roughness: 0.7, metalness: 0.2 }), gold = std({ color: 0xd9a845, metalness: 1, roughness: 0.3 });
  for (let k = 0; k <= 5; k++) {
    const x = k * L / 5 + (k === 0 ? 0.6 : k === 5 ? -0.6 : 0), r = 0.78, z = 0.45, top = TOPW + 1.6;
    const cor = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.05, 0.25, 1.2, 16), capM); cor.position.set(x, F2 - 0.2, z); G.add(cor);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, top - F2 + 0.4, 20), turM); t.position.set(x, (top + F2 + 0.4) / 2, z); G.add(t);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.18, r + 0.1, 0.35, 20), dark); collar.position.set(x, top + 0.15, z); G.add(collar);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(r + 0.05, 5.2, 16), k >= 3 ? copper : dark); sp.position.set(x, top + 0.3 + 2.6, z); G.add(sp);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), gold); rod.position.set(x, top + 5.5 + 0.7, z); G.add(rod);
    const vane = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.28), std({ color: 0xd9a845, metalness: 1, roughness: 0.3, side: THREE.DoubleSide })); vane.position.set(x + 0.28, top + 6.6, z); G.add(vane);
  }
  // ---- café under white parasols in front of the arcade (photo 1)
  const white = std({ color: 0xf4f2ec, roughness: 0.9, side: THREE.DoubleSide }), alu = std({ color: 0xa9adb0, metalness: 0.7, roughness: 0.4 }), cloth = std({ color: 0xf0ede6 });
  for (let i = 0; i < 5; i++) {
    const cx = (i + 0.7) * L / 5.4, cz = 3.2 + (i % 2) * 0.8;
    const um = new THREE.Mesh(new THREE.ConeGeometry(2.0, 0.55, 4, 1, true), white); um.rotation.y = Math.PI / 4; um.position.set(cx, 2.65, cz); G.add(um);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 6), alu); pole.position.set(cx, 1.3, cz); G.add(pole);
    for (const [tx, tz] of [[-0.9, -0.6], [0.9, 0.5]]) {
      const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 16), cloth); tb.position.set(cx + tx, 0.74, cz + tz); G.add(tb);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.74, 6), alu); leg.position.set(cx + tx, 0.37, cz + tz); G.add(leg);
      for (let c2 = 0; c2 < 3; c2++) { const a = c2 / 3 * 6.283 + i, chx = cx + tx + Math.cos(a) * 0.7, chz = cz + tz + Math.sin(a) * 0.7;
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), alu); seat.position.set(chx, 0.46, chz); seat.rotation.y = -a; G.add(seat);
        const bk = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.03), alu); bk.position.set(chx + Math.cos(a) * 0.2, 0.7, chz + Math.sin(a) * 0.2); bk.rotation.y = -a + Math.PI / 2; G.add(bk); }
    }
  }
  G.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // colliders: piers between the arches, back wall, end walls (the gallery itself is walkable)
  const u = [Math.cos(TH), -Math.sin(TH)], n = [Math.sin(TH), Math.cos(TH)], W2 = (a, d) => ({ x: P0[0] + u[0] * a + n[0] * d, z: P0[1] + u[1] * a + n[1] * d });
  const colliders = [];
  for (let i = 0; i <= BAYS; i++) colliders.push({ c: W2(i * BW, -0.4), yaw: TH, hx: i === 0 || i === BAYS ? 0.6 : 0.45, hz: 0.42 });
  colliders.push({ c: W2(L / 2, -DEPTH - 2.5), yaw: TH, hx: L / 2, hz: 2.5 });
  for (const a of [0, L]) colliders.push({ c: W2(a, -DEPTH / 2), yaw: TH, hx: 0.25, hz: DEPTH / 2 });
  return { group: G, colliders };
}
