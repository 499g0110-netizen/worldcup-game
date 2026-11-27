// Hero model of the Niederegger Stammhaus (Breite Straße 89, corner of Breite Straße and Hüxstraße), after the photos.
// Built as real geometry, not a painted picture: plaster walls (PBR texture) with cut-out window openings, deep reveals,
// red-painted window frames with mullions, reflective glass in front of lit rooms, stone sills, burgundy diamond-lattice
// panels with relief (bump), white pilasters, a projecting fascia with the letters "I. G. NIEDEREGGER", gold-framed shop
// windows with lit displays, a recessed entrance with granite steps, brass lamps and a gold lintel sign, a cornice and a
// slate roof. All parts are merged per material, so the whole house costs only a handful of draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { pbr } from './materials.js';
import { EXCLUDE } from './city.js';

export const NIED_POLY = [[49.5, -12.9], [67.2, -6.9], [80.7, -2.3], [82.9, -1.6], [79.1, 10.7], [62.1, 4.5], [46.6, -1.2], [46.8, -2.0], [41.9, -3.5], [43.2, -8.8], [44.4, -13.4]];
export const NIED_EXCLUDE = { x0: 56, x1: 61, z0: -6, z1: -1 };
EXCLUDE.push(NIED_EXCLUDE);   // the plain OSM extrusion is replaced by this hero model
const FRONT = [[44.4, -13.4], [41.9, -3.5]], H = 18.9;

function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

// box with UVs in metres (so tiled PBR textures keep their real scale on every face)
function boxG(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
  g.translate(x, y, z); return g;
}
function planeG(w, h, x, y, z) { const g = new THREE.PlaneGeometry(w, h); g.translate(x, y, z); return g; }
function latticeMat() {
  const [c, g] = cvs(128, 128); g.fillStyle = '#5c1520'; g.fillRect(0, 0, 128, 128);
  const [b, bg] = cvs(128, 128); bg.fillStyle = '#000'; bg.fillRect(0, 0, 128, 128);
  for (const [ctx, col, lw] of [[g, '#8a2f3a', 10], [bg, '#fff', 12]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; for (const o of [-128, 0, 128]) { ctx.beginPath(); ctx.moveTo(o, 0); ctx.lineTo(o + 128, 128); ctx.stroke(); ctx.beginPath(); ctx.moveTo(o + 128, 0); ctx.lineTo(o, 128); ctx.stroke(); } }
  g.strokeStyle = 'rgba(255,200,200,.18)'; g.lineWidth = 2; for (const o of [-128, 0, 128]) { g.beginPath(); g.moveTo(o - 3, 0); g.lineTo(o + 125, 128); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const bt = new THREE.CanvasTexture(b);
  for (const x of [t, bt]) { x.wrapS = x.wrapT = THREE.RepeatWrapping; x.repeat.set(1 / 0.34, 1 / 0.34); x.anisotropy = 8; }
  return new THREE.MeshStandardMaterial({ map: t, bumpMap: bt, bumpScale: 2.2, roughness: 0.55, metalness: 0.05 });
}
function roomTex(lit) {   // what you see through an upper window: ceiling light falloff, back wall, white curtains at the sides
  const [c, g] = cvs(128, 160); const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, lit ? '#e9dcc4' : '#8a8378'); gr.addColorStop(0.35, lit ? '#b8a68a' : '#4c4842'); gr.addColorStop(1, '#2a2622'); g.fillStyle = gr; g.fillRect(0, 0, 128, 160);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(30, 70, 70, 50);
  g.fillStyle = 'rgba(245,242,235,.92)'; g.fillRect(0, 0, 26, 160); g.fillRect(102, 0, 26, 160); g.fillStyle = 'rgba(0,0,0,.08)'; for (let x = 4; x < 26; x += 7) { g.fillRect(x, 0, 2, 160); g.fillRect(102 + x, 0, 2, 160); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function displayTex(seed) {   // shop-window display: warm-lit shelves with marzipan boxes and loaves
  const [c, g] = cvs(256, 192); const gr = g.createLinearGradient(0, 0, 0, 192); gr.addColorStop(0, '#e8cc94'); gr.addColorStop(1, '#6a4422'); g.fillStyle = gr; g.fillRect(0, 0, 256, 192);
  let s = seed * 97 + 13; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let row = 0; row < 3; row++) { const y = 50 + row * 52; g.fillStyle = '#7a4a26'; g.fillRect(0, y, 256, 6); for (let x = 6; x < 250;) { const w = 14 + r() * 22, h = 14 + r() * 26; g.fillStyle = ['#b8222c', '#8a1f28', '#e2c48a', '#c99a3a', '#efe6d2', '#6e1f2a', '#2a3a6a'][Math.floor(r() * 7)]; g.fillRect(x, y - h, w, h); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 2, y - h + 2, w * 0.3, h - 4); x += w + 4 + r() * 6; } }
  const v = g.createRadialGradient(128, 70, 20, 128, 96, 170); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,20,5,.45)'); g.fillStyle = v; g.fillRect(0, 0, 256, 192);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function letterTex(L) {
  const [c, g] = cvs(2048, 300); g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = '600 150px Georgia, "Times New Roman", serif';
  const t = 'I. G.  N I E D E R E G G E R'; let w = 0; for (const ch of t) w += ch === ' ' ? 26 : g.measureText(ch).width + 16; let x = (2048 - w) / 2;
  for (const ch of t) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillText(ch, x + 6, 160); g.fillStyle = '#6e1f2a'; g.fillText(ch, x, 152); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillText(ch, x - 2, 149); x += ch === ' ' ? 26 : g.measureText(ch).width + 16; }
  void L; const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx;
}
function signTex() {
  const [c, g] = cvs(512, 256); const gr = g.createLinearGradient(0, 0, 512, 256); gr.addColorStop(0, '#e2c06a'); gr.addColorStop(0.5, '#c79c3e'); gr.addColorStop(1, '#e8ca7a'); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = 'rgba(90,60,10,.5)'; g.lineWidth = 6; g.strokeRect(10, 10, 492, 236);
  g.fillStyle = '#5a3a08'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 26px Georgia, serif'; g.fillText('♛', 256, 70); g.font = '700 56px Georgia, serif'; g.fillText('NIEDEREGGER', 256, 135); g.font = '600 30px Georgia, serif'; g.fillText('LÜBECK', 256, 190);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// one wall edge as geometry in wall-local space: x along the wall (0..L), y up, +z out of the wall
function facade(L, front, P, ctx) {
  const add = (k, g) => P[k].push(g), WALL_D = 0.28;
  const cols = front ? [1.9, 5.1, 8.3].map((c) => c * L / 10.2) : ((nb) => Array.from({ length: nb }, (_, i) => (i + 0.5) * L / nb))(Math.max(1, Math.round(L / 3.3)));
  const bw = cols.length > 1 ? cols[1] - cols[0] : L, ww = Math.min(1.9, bw * 0.62), wh = 2.2;
  // upper wall with real window openings
  const sh = new THREE.Shape(); sh.moveTo(0, 4.2); sh.lineTo(L, 4.2); sh.lineTo(L, H); sh.lineTo(0, H); sh.closePath();
  const wins = []; for (let s = 0; s < 4; s++) { const y0 = 5.7 + s * 3.3 + 0.85; for (const c of cols) { if (c - ww / 2 < 0.25 || c + ww / 2 > L - 0.25) continue; wins.push([c - ww / 2, y0, ww, wh, s]); const hp = new THREE.Path(); hp.moveTo(c - ww / 2, y0); hp.lineTo(c - ww / 2, y0 + wh); hp.lineTo(c + ww / 2, y0 + wh); hp.lineTo(c + ww / 2, y0); hp.closePath(); sh.holes.push(hp); } }
  add('plaster', new THREE.ShapeGeometry(sh));
  for (const [x, y, w, h, s] of wins) {
    const D = 0.24;
    add('plaster', boxG(w, 0.03, D, x + w / 2, y + h + 0.015, -D / 2)); add('plaster', boxG(w, 0.03, D, x + w / 2, y - 0.015, -D / 2)); add('plaster', boxG(0.03, h, D, x - 0.015, y + h / 2, -D / 2)); add('plaster', boxG(0.03, h, D, x + w + 0.015, y + h / 2, -D / 2));
    const f = 0.075, fz = -0.15; add('red', boxG(w, f, 0.07, x + w / 2, y + h - f / 2, fz)); add('red', boxG(w, f, 0.07, x + w / 2, y + f / 2, fz)); add('red', boxG(f, h, 0.07, x + f / 2, y + h / 2, fz)); add('red', boxG(f, h, 0.07, x + w - f / 2, y + h / 2, fz));
    add('red', boxG(0.06, h, 0.06, x + w / 2, y + h / 2, fz)); add('red', boxG(w, 0.06, 0.06, x + w / 2, y + h * 0.64, fz));
    add('glass', planeG(w, h, x + w / 2, y + h / 2, fz - 0.02));
    ((ctx.lit = (ctx.lit * 7 + 3) % 11) < 4 ? P.roomLit : P.room).push(planeG(w, h, x + w / 2, y + h / 2, -0.55));
    add('stone', boxG(w + 0.24, 0.07, 0.2, x + w / 2, y - 0.04, 0.06));
    add('lattice', boxG(w + 0.5, 0.72, 0.03, x + w / 2, y - 0.5, 0.015));
    void s;
  }
  // cornice and fascia
  add('plaster', boxG(L, 0.32, 0.36, L / 2, H - 0.16, 0.1)); add('plaster', boxG(L, 0.12, 0.46, L / 2, H - 0.36, 0.1));
  add('plaster', boxG(L, 1.5, 0.3, L / 2, 4.95, 0.12)); add('plaster', boxG(L, 0.1, 0.42, L / 2, 5.73, 0.14)); add('plaster', boxG(L, 0.08, 0.36, L / 2, 4.22, 0.12));
  if (front) P.letters.push(planeG(L * 0.96, L * 0.96 * 300 / 2048, L / 2, 4.95, 0.272));
  // ground floor: pilasters, lattice bays with gold-framed shop windows, the entrance on the front
  const bays = front ? [[0.55, 3.75, 'win'], [4.3, 6.2, 'door'], [6.75, 9.65, 'win']].map(([a, b, k]) => [a * L / 10.2, b * L / 10.2, k]) : cols.map((c) => [Math.max(0.5, c - bw / 2 + 0.28), Math.min(L - 0.5, c + bw / 2 - 0.28), 'win']);
  let last = 0; for (const [a, b] of bays) { if (a - last > 0.05) add('plaster', boxG(a - last, 4.2, WALL_D + 0.08, (a + last) / 2, 2.1, 0.0)); last = b; } if (L - last > 0.05) add('plaster', boxG(L - last, 4.2, WALL_D + 0.08, (L + last) / 2, 2.1, 0.0));
  for (const [a, b] of [[0, bays[0][0]], ...bays.slice(0, -1).map((q, i) => [q[1], bays[i + 1][0]]), [bays[bays.length - 1][1], L]]) if (b - a > 0.05) add('stone', boxG(b - a + 0.04, 0.3, WALL_D + 0.14, (a + b) / 2, 0.15, 0.02));   // granite plinth under the pilasters
  for (const [a, b, k] of bays) {
    const w = b - a, m = (a + b) / 2;
    if (k === 'door') {
      const D = 1.4; add('plaster', boxG(0.06, 3.15, D, a + 0.03, 1.575, -D / 2)); add('plaster', boxG(0.06, 3.15, D, b - 0.03, 1.575, -D / 2)); add('plaster', boxG(w, 0.06, D, m, 3.12, -D / 2));
      add('stone', boxG(w, 0.06, D, m, 0.45, -D / 2)); for (let i = 0; i < 3; i++) add('stone', boxG(w + 0.3 + i * 0.25, 0.15, 0.32, m, 0.075 + (2 - i) * 0.15, 0.16 + i * 0.3 - 0.2));
      add('gold', boxG(w - 0.3, 0.07, 0.06, m, 3.0, -D + 0.04)); add('gold', boxG(0.07, 2.55, 0.06, a + 0.18, 1.73, -D + 0.04)); add('gold', boxG(0.07, 2.55, 0.06, b - 0.18, 1.73, -D + 0.04)); add('gold', boxG(0.05, 2.55, 0.05, m, 1.73, -D + 0.05));
      P.display.push(planeG(w - 0.3, 2.5, m, 1.73, -D)); add('glass', planeG(w - 0.3, 2.5, m, 1.73, -D + 0.07));
      P.sign.push(planeG(w - 0.1, 0.95, m, 3.68, 0.181)); add('gold', boxG(w, 1.05, 0.12, m, 3.68, 0.12));
      for (const x of [a - 0.12, b + 0.12]) { add('gold', boxG(0.12, 0.42, 0.08, x, 2.25, 0.22)); P.lamp.push(boxG(0.07, 0.3, 0.02, x, 2.25, 0.265)); }
      add('gold', boxG(0.03, 0.03, 0.9, a + 0.14, 0.95, 0.3)); add('gold', boxG(0.03, 0.03, 0.9, b - 0.14, 0.95, 0.3));   // brass hand rails
      continue;
    }
    add('lattice', boxG(w, 1.0, 0.06, m, 0.5, 0.0)); add('lattice', boxG(w, 1.05, 0.06, m, 3.675, 0.0));
    const y0 = 1.0, y1 = 3.15, f = 0.09; add('gold', boxG(w, f, 0.14, m, y1 - f / 2, 0.02)); add('gold', boxG(w, f, 0.14, m, y0 + f / 2, 0.02)); add('gold', boxG(f, y1 - y0, 0.14, a + f / 2, (y0 + y1) / 2, 0.02)); add('gold', boxG(f, y1 - y0, 0.14, b - f / 2, (y0 + y1) / 2, 0.02));
    for (const t of [1 / 3, 2 / 3]) add('gold', boxG(0.045, y1 - y0, 0.06, a + w * t, (y0 + y1) / 2, 0.0)); add('gold', boxG(w, 0.045, 0.06, m, y0 + (y1 - y0) * 0.72, 0.0));
    add('stone', boxG(w + 0.1, 0.06, 0.24, m, y0 - 0.03, 0.08));
    add('glass', planeG(w - 2 * f, y1 - y0 - 2 * f, m, (y0 + y1) / 2, -0.03)); P.display.push(planeG(w - 2 * f, y1 - y0 - 2 * f, m, (y0 + y1) / 2, -0.75));
    add('dark', boxG(w, 0.02, 0.75, m, y0 + 0.01, -0.4)); add('dark', boxG(0.02, y1 - y0, 0.75, a + f, (y0 + y1) / 2, -0.4)); add('dark', boxG(0.02, y1 - y0, 0.75, b - f, (y0 + y1) / 2, -0.4));
  }
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
  const CEN = [NIED_POLY.reduce((a, p) => a + p[0], 0) / n, NIED_POLY.reduce((a, p) => a + p[1], 0) / n];   // outward normal = the side facing away from the centroid
  const MAT = {
    plaster: pbr('plastered_wall_04', 2.2, { color: 0xffffff, normalStrength: 0.45, emissive: 0x2a2924 }),
    stone: pbr('granite_tile', 1.0, { color: 0xd9d5cd, normalStrength: 0.8 }),
    lattice: latticeMat(),
    red: new THREE.MeshStandardMaterial({ color: 0x8e1d27, roughness: 0.42, metalness: 0.05 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc9a04a, roughness: 0.3, metalness: 1.0 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fb2c2, roughness: 0.04, metalness: 0.85, transparent: true, opacity: 0.42, envMapIntensity: 2.4, depthWrite: false }),
    dark: new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.8 }),
    room: new THREE.MeshStandardMaterial({ map: roomTex(false), roughness: 1, emissive: 0xffffff, emissiveMap: roomTex(false), emissiveIntensity: 0.08 }),
    roomLit: new THREE.MeshStandardMaterial({ map: roomTex(true), roughness: 1, emissive: 0xffffff, emissiveMap: roomTex(true), emissiveIntensity: 0.3 }),
    display: new THREE.MeshStandardMaterial({ map: displayTex(3), roughness: 0.9, emissive: 0xffffff, emissiveMap: displayTex(3), emissiveIntensity: 0.32 }),
    letters: new THREE.MeshStandardMaterial({ map: letterTex(), transparent: true, roughness: 0.4, metalness: 0.2, alphaTest: 0.05 }),
    sign: new THREE.MeshStandardMaterial({ map: signTex(), roughness: 0.32, metalness: 0.75 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xffe3a8 }),
  };
  const ctx = { lit: 1 };
  const wall = (A, B, front) => {
    const dx = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dx, dz); let nx = dz / L, nz = -dx / L; if (nx * ((A[0] + B[0]) / 2 - CEN[0]) + nz * ((A[1] + B[1]) / 2 - CEN[1]) < 0) { nx = -nx; nz = -nz; } const th = Math.atan2(nx, nz), ux = Math.cos(th), uz = -Math.sin(th);
    const S = dx * ux + dz * uz > 0 ? A : B, E = S === A ? B : A;
    const P = Object.fromEntries(Object.keys(MAT).map((k) => [k, []])); facade(L, front, P, ctx);
    const g = new THREE.Group(); g.position.set(S[0], 0, S[1]); g.rotation.y = th; G.add(g);
    for (const [k, list] of Object.entries(P)) { if (!list.length) continue; const geo = mergeGeometries(list.map((q) => (q.index ? q : q)), false); if (!geo) continue; const mesh = new THREE.Mesh(geo, MAT[k]); mesh.castShadow = !['glass', 'room', 'roomLit', 'display', 'letters', 'lamp'].includes(k); mesh.receiveShadow = true; g.add(mesh); }
    colliders.push({ c: { x: (A[0] + B[0]) / 2 - nx * 0.4, z: (A[1] + B[1]) / 2 - nz * 0.4 }, yaw: -Math.atan2(dz, dx), hx: L / 2, hz: 0.45 });
    return { th, nx, nz, S, E, L, ux, uz };
  };
  // the front (Breite Straße edge) and every other edge
  const fr = wall(FRONT[0], FRONT[1], true);
  for (let i = 0; i < n; i++) { const A = NIED_POLY[i], B = NIED_POLY[(i + 1) % n]; const onFront = (p) => Math.abs((p[0] - FRONT[0][0]) * (FRONT[1][1] - FRONT[0][1]) - (p[1] - FRONT[0][1]) * (FRONT[1][0] - FRONT[0][0])) / 10.2 < 0.4 && p[1] >= -13.5 && p[1] <= -3.4; if (onFront(A) && onFront(B)) continue; if (Math.hypot(B[0] - A[0], B[1] - A[1]) < 1.2) continue; wall(A, B, false); }
  // slate roof (quadruple saltbox in OSM): from the eaves to a ridge point, UVs in metres
  let cx = 0, cz = 0; for (const p of NIED_POLY) { cx += p[0]; cz += p[1]; } cx /= n; cz /= n;
  const pos = [], uvs = []; for (let i = 0; i < n; i++) { const A = NIED_POLY[i], B = NIED_POLY[(i + 1) % n]; pos.push(A[0], H, A[1], B[0], H, B[1], cx, H + 5.5, cz); const ex = B[0] - A[0], ez = B[1] - A[1], el = Math.hypot(ex, ez) || 1; const proj = (x, z) => [((x - A[0]) * ex + (z - A[1]) * ez) / el, Math.abs((x - A[0]) * ez - (z - A[1]) * ex) / el]; uvs.push(...proj(A[0], A[1]), ...proj(B[0], B[1]), ...proj(cx, cz)); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); rg.computeVertexNormals();
  const roof = new THREE.Mesh(rg, pbr('roof_slates_02', 2.0, { color: 0x7d8189, side: THREE.DoubleSide })); roof.castShadow = true; roof.receiveShadow = true; G.add(roof);
  // geranium window boxes along the base of the first storey
  const boxC = document.createElement('canvas'); boxC.width = 256; boxC.height = 64; { const g = boxC.getContext('2d'); g.fillStyle = '#2f5a2a'; g.fillRect(0, 0, 256, 64); for (let i = 0; i < 140; i++) { g.fillStyle = i % 3 ? ['#d42a2a', '#b81e24', '#e84040'][i % 3] : ['#3f7a32', '#4a8a3a'][i % 2]; g.beginPath(); g.arc((i * 37) % 256, 4 + (i * 17) % 44, 5 + i % 5, 0, 7); g.fill(); } }
  const boxT = new THREE.CanvasTexture(boxC); boxT.colorSpace = THREE.SRGBColorSpace; boxT.wrapS = THREE.RepeatWrapping;
  const at = (a, y, d) => new THREE.Vector3(fr.S[0] + fr.ux * a + fr.nx * d, y, fr.S[1] + fr.uz * a + fr.nz * d);   // a metres along the front from its start, d out of the wall
  const flowers = new THREE.MeshStandardMaterial({ map: boxT, roughness: 0.9 }), planter = new THREE.MeshStandardMaterial({ color: 0x3a3a36, roughness: 0.6 });
  for (const cxm of [1.9, 5.1, 8.3]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.22, 0.3), planter); b.position.copy(at(cxm, 5.9, 0.42)); b.rotation.y = fr.th; G.add(b); for (let k = 0; k < 2; k++) { const fl = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.26, 0.32), flowers); fl.position.copy(at(cxm, 6.13 + k * 0.08, 0.42 + (k - 0.5) * 0.06)); fl.rotation.y = fr.th; fl.scale.y = 1 - k * 0.3; G.add(fl); } }
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
