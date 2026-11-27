// Hero model of the Niederegger Stammhaus (Breite Straße 89, corner of Breite Straße and Hüxstraße), after the photos:
// white five-storey house, ground floor with dark-red diamond-lattice panels, gold-framed shop windows, recessed entrance
// with a gold "NIEDEREGGER LÜBECK" lintel and steps, a white fascia with spaced letters "I. G. NIEDEREGGER", red-framed
// upper windows over lattice spandrels, window boxes with red geraniums, flags on poles, a red banner and a dark pitched
// roof. It replaces the plain OSM extrusion (footprint from OSM way, Breite Straße 89). Front = the west edge (Breite Straße).
import * as THREE from 'three';
import { EXCLUDE } from './city.js';

export const NIED_POLY = [[49.5, -12.9], [67.2, -6.9], [80.7, -2.3], [82.9, -1.6], [79.1, 10.7], [62.1, 4.5], [46.6, -1.2], [46.8, -2.0], [41.9, -3.5], [43.2, -8.8], [44.4, -13.4]];
export const NIED_EXCLUDE = { x0: 56, x1: 61, z0: -6, z1: -1 };
EXCLUDE.push(NIED_EXCLUDE);   // the plain OSM extrusion is replaced by this hero model
const FRONT = [[44.4, -13.4], [41.9, -3.5]], H = 18.9, PX = 100;

function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, rx = 1) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; t.repeat.set(rx, 1); return t; }
function lattice(g, x, y, w, h) {
  g.fillStyle = '#7a1c2a'; g.fillRect(x, y, w, h); g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.strokeStyle = '#b4545e'; g.lineWidth = 2;
  for (let i = -h; i < w + h; i += 17) { g.beginPath(); g.moveTo(x + i, y); g.lineTo(x + i + h, y + h); g.stroke(); g.beginPath(); g.moveTo(x + i + h, y); g.lineTo(x + i, y + h); g.stroke(); }
  g.strokeStyle = 'rgba(30,5,10,.55)'; g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); g.restore();
}
function upperWindow(g, x, y, w, h) {   // red-framed window with a mullion cross and a sky-blue reflection
  g.fillStyle = '#a42a30'; g.fillRect(x - 9, y - 9, w + 18, h + 18);
  const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#a9bfd2'); gr.addColorStop(0.5, '#6f8ba4'); gr.addColorStop(1, '#4c647c'); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(x, y + h * 0.55); g.lineTo(x + w * 0.6, y); g.lineTo(x + w * 0.85, y); g.lineTo(x, y + h * 0.85); g.fill();
  g.fillStyle = '#a42a30'; g.fillRect(x + w / 2 - 3, y, 6, h); g.fillRect(x, y + h * 0.36 - 3, w, 6);
  g.fillStyle = '#d8d2c6'; g.fillRect(x - 12, y + h + 9, w + 24, 8);
}
function shopWindow(g, x, y, w, h, seed) {   // gold-framed ground-floor shop window with a warm interior
  g.fillStyle = '#c9a24a'; g.fillRect(x - 8, y - 8, w + 16, h + 16);
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#f1d9a0'); gr.addColorStop(1, '#8a5a30'); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(60,35,20,.55)'; for (let i = 0; i < 9; i++) { const sx = x + 10 + ((i * 53 + seed * 31) % (w - 40)), sh = 28 + ((i * 29 + seed) % 50); g.fillRect(sx, y + h - sh, 22 + (i % 3) * 8, sh); }
  g.fillStyle = 'rgba(40,90,60,.8)'; g.beginPath(); g.arc(x + w * 0.55, y + h * 0.55, 26, 0, 7); g.fill();
  g.strokeStyle = '#c9a24a'; g.lineWidth = 6; for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(x + w * i / 3, y); g.lineTo(x + w * i / 3, y + h); g.stroke(); } g.beginPath(); g.moveTo(x, y + h * 0.28); g.lineTo(x + w, y + h * 0.28); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(x, y + h * 0.6); g.lineTo(x + w * 0.5, y); g.lineTo(x + w * 0.7, y); g.lineTo(x, y + h * 0.9); g.fill();
}
function frontTexture() {
  const W = 1024, Hp = Math.round(H * PX), [c, g] = [...cvs(W, Hp)], Y = (m) => Hp - m * PX;
  const [, gg] = [0, g]; void gg;
  g.fillStyle = '#f3f1ea'; g.fillRect(0, 0, W, Hp);
  // storeys 5.7 .. 18.9
  for (let s = 0; s < 4; s++) { const y0 = 5.7 + s * 3.3; for (const cx of [1.9, 5.1, 8.3]) { lattice(g, (cx - 1.25) * PX, Y(y0 + 0.75), 2.5 * PX, 0.75 * PX); upperWindow(g, (cx - 0.95) * PX, Y(y0 + 3.05), 1.9 * PX, 2.2 * PX); } }
  // ground floor
  g.fillStyle = '#ebe7de'; g.fillRect(0, Y(4.2), W, 4.2 * PX);
  for (const [a, b] of [[0.55, 3.75], [6.75, 9.65]]) { lattice(g, a * PX, Y(4.2), (b - a) * PX, 1.0 * PX); lattice(g, a * PX, Y(1.0), (b - a) * PX, 1.0 * PX); shopWindow(g, (a + 0.15) * PX, Y(3.0), (b - a - 0.3) * PX, 1.9 * PX, a | 0); }
  g.fillStyle = '#2a2420'; g.fillRect(4.3 * PX, Y(3.1), 1.9 * PX, 3.1 * PX);   // recessed entrance
  const dg = g.createLinearGradient(0, Y(3), 0, Y(0.4)); dg.addColorStop(0, '#caa45a'); dg.addColorStop(1, '#4a3622'); g.fillStyle = dg; g.fillRect(4.5 * PX, Y(2.9), 1.5 * PX, 2.5 * PX); g.fillStyle = '#e8d29a'; g.fillRect(5.2 * PX, Y(2.9), 5, 2.5 * PX);
  g.fillStyle = '#d6b160'; g.fillRect(4.3 * PX, Y(4.2), 1.9 * PX, 1.1 * PX); g.fillStyle = '#6b4a14'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 20px Georgia, serif'; g.fillText('NIEDEREGGER', 5.25 * PX, Y(3.85)); g.font = '600 13px Georgia, serif'; g.fillText('LÜBECK', 5.25 * PX, Y(3.45));
  g.fillStyle = '#9a9690'; for (let i = 0; i < 3; i++) g.fillRect(4.1 * PX - i * 4, Y(0.16 * (i + 1)), 2.3 * PX + i * 8, 0.16 * PX);
  g.fillStyle = '#f7f5ee'; for (const x of [0, 3.75, 6.2, 9.65]) g.fillRect(x * PX, Y(4.2), 0.55 * PX, 4.2 * PX);   // white pillars
  g.fillStyle = 'rgba(0,0,0,.08)'; for (const x of [0.5, 3.7, 6.7, 9.6]) g.fillRect(x * PX, Y(4.2), 6, 4.2 * PX);
  g.fillStyle = '#d9b45a'; g.fillRect(3.8 * PX, Y(2.4), 0.12 * PX, 0.5 * PX); g.fillRect(6.3 * PX, Y(2.4), 0.12 * PX, 0.5 * PX);   // gold door lamps
  // fascia with the spaced letters
  g.fillStyle = '#fbf9f3'; g.fillRect(0, Y(5.7), W, 1.5 * PX); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, Y(4.2) - 6, W, 6);
  g.fillStyle = '#6e1f2a'; g.font = '600 52px Georgia, serif'; g.textAlign = 'left'; const t = 'I. G. N I E D E R E G G E R'; let x = 0.55 * PX; for (const ch of t) { g.fillText(ch, x, Y(4.95)); x += ch === ' ' ? 12 : g.measureText(ch).width + 7; }
  g.fillStyle = '#6a1822'; g.font = '700 16px Georgia, serif'; g.textAlign = 'center'; g.fillText('J. G. NIEDEREGGER · seit 1806', 5.1 * PX, Y(5.45));
  // roof edge shadow
  g.fillStyle = 'rgba(60,60,60,.25)'; g.fillRect(0, 0, W, 10);
  return tex(c);
}
function sideTexture() {
  const W = 320, Hp = Math.round(H * PX), [c, g] = cvs(W, Hp), Y = (m) => Hp - m * PX;
  g.fillStyle = '#f1efe8'; g.fillRect(0, 0, W, Hp);
  for (let s = 0; s < 4; s++) { const y0 = 5.7 + s * 3.3; lattice(g, 55, Y(y0 + 0.75), 210, 0.75 * PX); upperWindow(g, 85, Y(y0 + 3.05), 150, 2.2 * PX); }
  g.fillStyle = '#ebe7de'; g.fillRect(0, Y(5.7), W, 5.7 * PX); lattice(g, 40, Y(4.2), 240, 1.0 * PX); lattice(g, 40, Y(1.0), 240, 1.0 * PX); shopWindow(g, 55, Y(3.0), 210, 1.9 * PX, 4);
  g.fillStyle = '#f7f5ee'; g.fillRect(0, Y(5.7), W, 0.12 * PX);
  return tex(c);
}
function flagTex(kind) {
  const [c, g] = cvs(96, 64);
  if (kind === 'uk') { g.fillStyle = '#1b3a8a'; g.fillRect(0, 0, 96, 64); g.strokeStyle = '#fff'; g.lineWidth = 14; g.beginPath(); g.moveTo(0, 0); g.lineTo(96, 64); g.moveTo(96, 0); g.lineTo(0, 64); g.stroke(); g.strokeStyle = '#c8202e'; g.lineWidth = 6; g.stroke(); g.fillStyle = '#fff'; g.fillRect(38, 0, 20, 64); g.fillRect(0, 22, 96, 20); g.fillStyle = '#c8202e'; g.fillRect(42, 0, 12, 64); g.fillRect(0, 26, 96, 12); }
  else if (kind === 'se') { g.fillStyle = '#1b5fa8'; g.fillRect(0, 0, 96, 64); g.fillStyle = '#f2c230'; g.fillRect(26, 0, 14, 64); g.fillRect(0, 25, 96, 14); }
  else if (kind === 'fi') { g.fillStyle = '#fff'; g.fillRect(0, 0, 96, 64); g.fillStyle = '#1b4fa0'; g.fillRect(26, 0, 14, 64); g.fillRect(0, 25, 96, 14); }
  else if (kind === 'jp') { g.fillStyle = '#fff'; g.fillRect(0, 0, 96, 64); g.fillStyle = '#c8202e'; g.beginPath(); g.arc(48, 32, 18, 0, 7); g.fill(); }
  else { g.fillStyle = '#c8202e'; g.fillRect(0, 0, 96, 64); g.fillStyle = '#f2c230'; g.fillRect(0, 16, 96, 32); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function bannerTex() {
  const [c, g] = cvs(128, 640); g.fillStyle = '#c4122c'; g.fillRect(0, 0, 128, 640); g.fillStyle = '#e8c870'; g.fillRect(6, 6, 116, 4); g.fillRect(6, 630, 116, 4);
  g.fillStyle = '#f4e8c8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 46px Georgia, serif'; 'MARZIPAN'.split('').forEach((ch, i) => g.fillText(ch, 64, 44 + i * 50)); g.font = '700 40px Georgia, serif'; 'SALON'.split('').forEach((ch, i) => g.fillText(ch, 64, 460 + i * 44));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildNiederegger(scene) {
  const G = new THREE.Group(), colliders = [], n = NIED_POLY.length;
  let area = 0; for (let i = 0; i < n; i++) { const [x1, z1] = NIED_POLY[i], [x2, z2] = NIED_POLY[(i + 1) % n]; area += x1 * z2 - x2 * z1; }
  void area; const CEN = [NIED_POLY.reduce((a, p) => a + p[0], 0) / n, NIED_POLY.reduce((a, p) => a + p[1], 0) / n];   // outward normal = the side facing away from the centroid
  const front = new THREE.MeshStandardMaterial({ map: frontTexture(), roughness: 0.82 }), side = new THREE.MeshStandardMaterial({ map: sideTexture(), roughness: 0.85 });
  const wall = (A, B, mat, repeat) => {
    const dx = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dx, dz); let nx = dz / L, nz = -dx / L; if (nx * ((A[0] + B[0]) / 2 - CEN[0]) + nz * ((A[1] + B[1]) / 2 - CEN[1]) < 0) { nx = -nx; nz = -nz; } const th = Math.atan2(nx, nz), ux = Math.cos(th), uz = -Math.sin(th);
    const S = dx * ux + dz * uz > 0 ? A : B, E = S === A ? B : A, m = mat.clone(); if (repeat) { m.map = m.map.clone(); m.map.needsUpdate = true; m.map.repeat.set(Math.max(1, Math.round(L / 3.2)), 1); }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(L, H), m); mesh.position.set((S[0] + E[0]) / 2, H / 2, (S[1] + E[1]) / 2); mesh.rotation.y = th; mesh.castShadow = true; mesh.receiveShadow = true; G.add(mesh);
    colliders.push({ c: { x: (A[0] + B[0]) / 2 - nx * 0.4, z: (A[1] + B[1]) / 2 - nz * 0.4 }, yaw: -Math.atan2(dz, dx), hx: L / 2, hz: 0.45 });
    return { th, nx, nz, S, E, L, ux, uz };
  };
  // the front (Breite Straße edge) and every other edge
  const fr = wall(FRONT[0], FRONT[1], front, false);
  for (let i = 0; i < n; i++) { const A = NIED_POLY[i], B = NIED_POLY[(i + 1) % n]; const onFront = (p) => Math.abs((p[0] - FRONT[0][0]) * (FRONT[1][1] - FRONT[0][1]) - (p[1] - FRONT[0][1]) * (FRONT[1][0] - FRONT[0][0])) / 10.2 < 0.4 && p[1] >= -13.5 && p[1] <= -3.4; if (onFront(A) && onFront(B)) continue; if (Math.hypot(B[0] - A[0], B[1] - A[1]) < 0.3) continue; wall(A, B, side, true); }
  // dark pitched roof (quadruple saltbox in OSM): a pyramid from the footprint to a ridge point
  let cx = 0, cz = 0; for (const p of NIED_POLY) { cx += p[0]; cz += p[1]; } cx /= n; cz /= n;
  const pos = []; for (let i = 0; i < n; i++) { const A = NIED_POLY[i], B = NIED_POLY[(i + 1) % n]; pos.push(A[0], H, A[1], B[0], H, B[1], cx, H + 5.5, cz); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.computeVertexNormals();
  const roof = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: 0x8f4a36, roughness: 0.8, side: THREE.DoubleSide })); roof.castShadow = true; G.add(roof);
  // geranium window boxes along the base of the first storey
  const boxC = document.createElement('canvas'); boxC.width = 256; boxC.height = 64; { const g = boxC.getContext('2d'); g.fillStyle = '#2f5a2a'; g.fillRect(0, 0, 256, 64); for (let i = 0; i < 90; i++) { g.fillStyle = i % 3 ? '#cf2a2a' : '#4a8a3a'; g.beginPath(); g.arc((i * 37) % 256, 6 + (i * 17) % 40, 7 + i % 4, 0, 7); g.fill(); } }
  const boxT = new THREE.CanvasTexture(boxC); boxT.colorSpace = THREE.SRGBColorSpace; boxT.wrapS = THREE.RepeatWrapping;
  const at = (a, y, d) => new THREE.Vector3(fr.S[0] + fr.ux * a + fr.nx * d, y, fr.S[1] + fr.uz * a + fr.nz * d);   // a metres along the front from its south-facing start, d out of the wall
  for (const cxm of [1.9, 5.1, 8.3]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.36, 0.4), new THREE.MeshStandardMaterial({ map: boxT, roughness: 0.9 })); b.position.copy(at(cxm, 5.85, 0.22)); b.rotation.y = fr.th; G.add(b); }
  // flags on poles (UK, Sweden, Finland, Japan, Spain)
  [['uk', 1.2, 9.6], ['se', 3.6, 12.9], ['jp', 6.4, 9.6], ['fi', 8.6, 12.9], ['es', 9.9, 6.4]].forEach(([k, a, y]) => {
    const base = at(a, y, 0.05), out = new THREE.Vector3(fr.nx, 0.55, fr.nz).normalize(), pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 6), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.6 }));
    pole.position.copy(base).addScaledVector(out, 0.8); pole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), out); G.add(pole);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.54), new THREE.MeshBasicMaterial({ map: flagTex(k), side: THREE.DoubleSide })); fl.position.copy(base).addScaledVector(out, 1.25); fl.position.y -= 0.2; fl.rotation.y = fr.th + Math.PI / 2; fl.userData.flag = true; G.add(fl);
  });
  // red banner on the right of the upper storeys
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 4.7), new THREE.MeshBasicMaterial({ map: bannerTex(), side: THREE.DoubleSide })); ban.position.copy(at(9.45, 11.5, 0.35)); ban.rotation.y = fr.th; G.add(ban);
  const door = { x: (FRONT[0][0] + FRONT[1][0]) / 2 + fr.nx * 1.2, z: (FRONT[0][1] + FRONT[1][1]) / 2 + fr.nz * 1.2 };
  scene.add(G);
  return { group: G, colliders, door, front: fr };
}
