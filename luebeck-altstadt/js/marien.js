// Detail pass for St. Marien (the mother church of Brick Gothic): the OSM model gives the masses (two west towers,
// nave, aisles, choir); this adds what makes it read as the real church from street level and from the air —
// tower faces with stages of tall blind lancets, string courses and belfry openings, the west portal, four
// gables crowning each tower with a slender octagonal copper spire (to ~124 m), tall traceried windows in the
// clerestory and aisles, and buttresses. Placement is measured along the church axis from the OSM parts.
import * as THREE from 'three';

const M = [-36.6, -149.5], TH = -0.1315;   // origin between the towers; local x = along the nave (east), z = across (south)
export const MARIEN_SPIRES = [[-34.9, -162.5], [-38.3, -136.6]];   // OSM spire/gable parts replaced here

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function bricks(g, w, h, bh, seed = 3) {
  let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#5e3328'; g.fillRect(0, 0, w, h); const bl = bh * 2.3;
  for (let y = 0, row = 0; y < h; y += bh, row++) for (let x = -(row % 2) * bl / 2; x < w; x += bl) { const k = (r() - 0.5) * 34, d = r() < 0.12 ? 0.62 : 1; g.fillStyle = `rgb(${(146 + k) * d | 0},${(62 + k * 0.5) * d | 0},${(44 + k * 0.4) * d | 0})`; g.fillRect(x + 0.6, y + 0.6, bl - 1.2, bh - 1.2); }
  // soot and weathering streaks
  for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(30,20,16,0.07)'; g.fillRect(r() * w, r() * h, 2 + r() * 5, r() * h * 0.25); }
}
function lancet(g, cx, yb, w, h, fill, frame = '#7a3a2a') {   // pointed niche: moulded frame + fill
  const path = (inset) => { const x0 = cx - w / 2 + inset, x1 = cx + w / 2 - inset, ys = yb - h + w * 0.9; g.beginPath(); g.moveTo(x0, yb); g.lineTo(x0, ys); g.quadraticCurveTo(x0, yb - h + w * 0.2, cx, yb - h + inset * 0.6); g.quadraticCurveTo(x1, yb - h + w * 0.2, x1, ys); g.lineTo(x1, yb); g.closePath(); };
  g.fillStyle = frame; path(-w * 0.14); g.fill(); g.fillStyle = fill; path(0); g.fill();
}
// tower face, PX per metre, from y = 0.5 to 64: portal (west), stages of blind lancets, belfry louvres, string courses
function towerFace(width, west) {
  const PX = 22, H = 64, W = Math.round(width * PX), Hh = H * PX, [c, g] = cv(W, Hh); bricks(g, W, Hh, 0.09 * PX * 1.8);
  const Y = (y) => Hh - y * PX;
  for (const y of [20, 36, 46, 53]) { g.fillStyle = '#c9b9a0'; g.fillRect(0, Y(y), W, 0.35 * PX); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, Y(y) + 0.35 * PX, W, 3); }
  const stage = (y0, y1, n, wFrac, fill) => { const bw = W / n; for (let i = 0; i < n; i++) lancet(g, (i + 0.5) * bw, Y(y0 + 0.8), bw * wFrac, (y1 - y0 - 1.6) * PX, fill); };
  if (west) { lancet(g, W / 2, Y(0), 5.2 * PX, 11 * PX, '#2a1d18', '#9a4a32'); lancet(g, W / 2, Y(0), 3.6 * PX, 9.2 * PX, '#3b2a20', '#6e3226'); stage(13, 20, 3, 0.32, '#2b2220'); }
  else stage(2, 20, 3, 0.36, '#4a2a22');
  stage(20, 36, 3, 0.42, '#3a2620');
  stage(36, 46, 4, 0.48, '#3a2620');
  // belfry: paired openings with louvres
  for (let i = 0; i < 3; i++) { const cx = (i + 0.5) * W / 3; for (const dx of [-0.9, 0.9]) { lancet(g, cx + dx * PX, Y(47.5), 1.4 * PX, 4.8 * PX, '#141010'); g.fillStyle = '#4a3a30'; for (let k = 0; k < 7; k++) g.fillRect(cx + dx * PX - 0.6 * PX, Y(47.9 + k * 0.6), 1.2 * PX, 3); } }
  stage(53, 63.5, 4, 0.45, '#3a2620');
  // clock face on the west sides of the belfry stage
  if (west) { g.fillStyle = '#1d2a40'; g.beginPath(); g.arc(W / 2, Y(42), 2.0 * PX, 0, 7); g.fill(); g.strokeStyle = '#d9b45a'; g.lineWidth = 5; g.stroke(); g.fillStyle = '#d9b45a'; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; g.fillRect(W / 2 + Math.cos(a) * 1.6 * PX - 3, Y(42) + Math.sin(a) * 1.6 * PX - 3, 6, 6); } }
  return tex(c);
}
function gableTex(width) {
  const PX = 22, W = Math.round(width * PX), H = 12 * PX, [c, g] = cv(W, H); bricks(g, W, H, 0.09 * PX * 1.8, 7);
  for (let i = 0; i < 5; i++) { const cx = (i + 0.5) * W / 5, hh = (1 - Math.abs(i - 2) / 2.6) * H * 0.78; lancet(g, cx, H - 0.6 * PX, W / 5 * 0.46, hh, i === 2 ? '#141010' : '#e3dccd'); }
  g.fillStyle = '#e3dccd'; g.beginPath(); g.arc(W / 2, H * 0.28, 0.7 * PX, 0, 7); g.fill();
  return tex(c);
}
function windowTex() {   // traceried Gothic window with transparency around it
  const [c, g] = cv(256, 1024); g.clearRect(0, 0, 256, 1024);
  const path = (x0, x1, top, bot) => { const cx = (x0 + x1) / 2, w = x1 - x0; g.beginPath(); g.moveTo(x0, bot); g.lineTo(x0, top + w * 0.9); g.quadraticCurveTo(x0, top + w * 0.2, cx, top); g.quadraticCurveTo(x1, top + w * 0.2, x1, top + w * 0.9); g.lineTo(x1, bot); g.closePath(); };
  g.fillStyle = '#8e4630'; path(6, 250, 6, 1024); g.fill();
  const gr = g.createLinearGradient(0, 0, 256, 1024); gr.addColorStop(0, '#3b4a5a'); gr.addColorStop(0.5, '#2a3542'); gr.addColorStop(1, '#4a4038'); g.fillStyle = gr; path(26, 230, 30, 1010); g.fill();
  g.strokeStyle = '#c9bca4'; g.lineWidth = 7; g.beginPath(); for (const x of [94, 162]) { g.moveTo(x, 240); g.lineTo(x, 1010); } g.stroke();
  g.lineWidth = 2; g.strokeStyle = 'rgba(200,190,170,0.45)'; for (let y = 260; y < 1010; y += 34) { g.beginPath(); g.moveTo(26, y); g.lineTo(230, y); g.stroke(); }   // lead cames
  g.lineWidth = 6; g.strokeStyle = '#c9bca4'; for (const [x, y, r] of [[60, 190, 34], [196, 190, 34], [128, 110, 40]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); }   // tracery circles
  g.fillStyle = 'rgba(150,180,210,0.18)'; path(40, 120, 260, 700); g.fill();
  return tex(c);
}

export function buildMarien(scene) {
  const G = new THREE.Group(); G.position.set(M[0], 0, M[1]); G.rotation.y = TH; scene.add(G);
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  const copper = std({ color: 0x5f9e84, roughness: 0.55, metalness: 0.35 }), gold = std({ color: 0xd9a845, metalness: 1, roughness: 0.3 });
  const [bc, bg] = cv(256, 256); bricks(bg, 256, 256, 6, 11); const brickT = tex(bc); brickT.wrapS = brickT.wrapT = THREE.RepeatWrapping; brickT.repeat.set(3, 3);
  const brick = std({ map: brickT });
  const LX = 7.95, faces = [];
  for (const cz of [-13.1, 13.05]) {
    const T = new THREE.Group(); T.position.z = cz; G.add(T);
    const HZ = 7.2;   // half size across
    const fW = towerFace(2 * HZ, true), fS = towerFace(2 * LX, false);
    // four faces, slightly proud of the OSM walls
    const add = (w, map, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 63.5), std({ map, roughness: 0.82 })); m.position.set(x, 0.5 + 63.5 / 2, z); m.rotation.y = ry; T.add(m); faces.push(m); };
    add(2 * HZ, fW, -LX - 0.12, 0, -Math.PI / 2);   // west front
    add(2 * HZ, fS, LX + 0.12, 0, Math.PI / 2);
    add(2 * LX, fS, 0, -HZ - 0.12, Math.PI); add(2 * LX, fS, 0, HZ + 0.12, 0);
    // shaft top (covers the OSM stepped pyramid caps) and four gables
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(2 * LX, 12, 2 * HZ), brick); shaft.position.y = 58; T.add(shaft);
    for (const [w, x, z, ry] of [[2 * HZ, -LX, 0, -Math.PI / 2], [2 * HZ, LX, 0, Math.PI / 2], [2 * LX, 0, -HZ, Math.PI], [2 * LX, 0, HZ, 0]]) {
      const sh = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, 12)]);
      const gg = new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false }); gg.translate(0, 0, -0.3);
      const uv = gg.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) / w + 0.5, uv.getY(k) / 12);
      const gm = new THREE.Mesh(gg, std({ map: gableTex(w) })); gm.position.set(x, 64, z); gm.rotation.y = ry; T.add(gm);
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 6), copper); fin.position.set(x, 77, z); T.add(fin);
    }
    // octagonal spire rising behind the gables
    const sp = new THREE.Mesh(new THREE.ConeGeometry(5.4, 58, 8, 6), copper); sp.rotation.y = Math.PI / 8; sp.position.y = 66 + 29; T.add(sp);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), gold); ball.position.y = 125; T.add(ball);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.12), gold); cross.position.y = 126.6; T.add(cross);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 0.12), gold); bar.position.y = 126.9; T.add(bar);
  }
  // nave clerestory and aisle windows, buttresses
  const wt = windowTex(), wm = std({ map: wt, alphaTest: 0.5, roughness: 0.25, metalness: 0.2, side: THREE.DoubleSide });
  for (const sd of [-1, 1]) {
    for (let a = 13; a < 71; a += 6.5) {
      const cw = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 9.5), wm); cw.position.set(a, 35.2, sd * 8.38); cw.rotation.y = sd > 0 ? 0 : Math.PI; G.add(cw);
      const aw = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 13), wm); aw.position.set(a, 9.5, sd * 17.95); aw.rotation.y = sd > 0 ? 0 : Math.PI; G.add(aw);
      const bx = a + 3.25; if (bx < 74) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, 19, 1.5), brick); b.position.set(bx, 9.5, sd * 18.6); G.add(b); const cap = new THREE.Mesh(new THREE.ConeGeometry(0.95, 2.2, 4), brick); cap.rotation.y = Math.PI / 4; cap.position.set(bx, 20.1, sd * 18.6); G.add(cap);
        // flying buttress up to the clerestory
        const fb = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 16.5), brick); fb.position.set(bx, 26.5, sd * 13.5); fb.rotation.x = sd * 0.905; G.add(fb); }
    }
  }
  G.traverse((o) => { if (o.isMesh) { o.castShadow = !o.material.alphaTest; o.receiveShadow = true; } });
  return G;
}
