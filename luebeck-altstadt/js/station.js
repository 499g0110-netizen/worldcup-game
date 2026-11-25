// Hero model of Lübeck Hauptbahnhof (reception building, 1908) from the reference photo, placed on the OSM
// footprint: red brick with white sandstone bands, two big corner towers with clocks and copper bell-shaped domes,
// two small towers between three huge round-arched windows (red/white striped voussoirs, lit mullion grids),
// a white balustrade, a dark tiled hipped roof with the copper clock tower, a rusticated sandstone ground floor
// with three entrances under wavy copper canopies — and a walkable concourse inside: stone floor, departure
// boards, ticket machines, a bakery, a kiosk, a bookshop, benches and the passage to the platforms.
import * as THREE from 'three';

const A = [-963.2, -33.4], B = [-941.8, -48.3];            // corner towers on the front (OSM parts)
const L = Math.hypot(B[0] - A[0], B[1] - A[1]), TH = Math.atan2(-(B[1] - A[1]), B[0] - A[0]);
const D = 15.5, WALL = 15, RIDGE = 24;
export const STATION = { x0: -973, x1: -939, z0: -62.5, z1: -31 };

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, rep) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function brickBanded(w, h, PX, bands = true, seed = 5) {   // red brick with white sandstone courses
  const [c, g] = cv(w, h); let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#6e3a2c'; g.fillRect(0, 0, w, h);
  const bh = 0.085 * PX, bl = bh * 2.3;
  for (let y = 0, row = 0; y < h; y += bh, row++) for (let x = -(row % 2) * bl / 2; x < w; x += bl) { const k = (r() - 0.5) * 26; g.fillStyle = `rgb(${158 + k | 0},${62 + k * 0.5 | 0},${44 + k * 0.4 | 0})`; g.fillRect(x + 1, y + 1, bl - 1.5, bh - 1.5); }
  if (bands) for (let y = h - 6.4 * PX; y > 0; y -= 1.25 * PX) { g.fillStyle = '#e6dccb'; g.fillRect(0, y, w, 0.24 * PX); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, y + 0.24 * PX, w, 2); }
  return [c, g];
}
function ashlar(w, h, PX) {   // rusticated sandstone base
  const [c, g] = cv(w, h); let s = 9; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#8f8064'; g.fillRect(0, 0, w, h);
  const bh = 0.5 * PX; for (let y = 0, row = 0; y < h; y += bh, row++) for (let x = -(row % 2) * PX * 0.5; x < w; x += PX * (0.9 + r() * 0.5)) { const v = 196 + (r() - 0.5) * 24; g.fillStyle = `rgb(${v | 0},${v - 12 | 0},${v - 36 | 0})`; g.fillRect(x + 3, y + 3, PX * 0.85, bh - 6); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x + 3, y + 3, PX * 0.85, 3); }
  return [c, g];
}
// the front above the base: three great arched windows between towers, voussoirs, keystones, balustrade frieze
function frontTex(night) {
  const PX = 48, W = Math.round(L * PX), H = Math.round((WALL - 6) * PX); const [c, g] = brickBanded(W, H, PX, false, 7);
  const bayW = L / 3, cy = H - 0 * PX;
  for (let i = 0; i < 3; i++) {
    const cx = (i + 0.5) * bayW * PX, rw = 3.1 * PX, top = 1.1 * PX, spring = top + rw;
    // striped voussoirs (red / white)
    for (let k = 0; k < 15; k++) { const a0 = Math.PI + k / 15 * Math.PI, a1 = a0 + Math.PI / 15; g.fillStyle = k % 2 ? '#b8452e' : '#ece4d4'; g.beginPath(); g.arc(cx, spring, rw + 0.65 * PX, a0, a1); g.arc(cx, spring, rw, a1, a0, true); g.fill(); }
    g.fillStyle = '#e8dfcd'; g.fillRect(cx - 0.45 * PX, top - 0.9 * PX, 0.9 * PX, 1.2 * PX);   // carved keystone
    // window grid
    g.save(); g.beginPath(); g.moveTo(cx - rw, cy); g.lineTo(cx - rw, spring); g.arc(cx, spring, rw, Math.PI, 0); g.lineTo(cx + rw, cy); g.closePath(); g.clip();
    const gr = g.createLinearGradient(0, top, 0, cy); gr.addColorStop(0, night ? '#ffe2a0' : '#9fb6c6'); gr.addColorStop(1, night ? '#e9a956' : '#5c7486'); g.fillStyle = gr; g.fillRect(cx - rw, top, rw * 2, cy - top);
    g.fillStyle = '#26292b'; for (let x = cx - rw; x < cx + rw; x += 0.52 * PX) g.fillRect(x, top, 4, cy - top); for (let y = cy; y > top; y -= 0.62 * PX) g.fillRect(cx - rw, y, rw * 2, 4);
    g.fillRect(cx - rw, cy - 2.1 * PX, rw * 2, 0.16 * PX); g.restore();
  }
  // sandstone frieze and balustrade along the top
  g.fillStyle = '#e6dccb'; g.fillRect(0, 0, W, 0.5 * PX);
  return tex(c);
}
function boardTex() {   // departure board, yellow on dark blue
  const [c, g] = cv(1024, 256); g.fillStyle = '#10203a'; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = '#ffd34a'; g.font = '700 30px "IBM Plex Mono", monospace';
  g.fillText('ABFAHRT  Departures', 24, 40);
  const rows = [['14:05', 'RE 8', 'Hamburg Hbf', '5'], ['14:12', 'RB 85', 'Travemünde Strand', '2'], ['14:20', 'RE 83', 'Kiel Hbf', '7'], ['14:36', 'RE 83', 'Lüneburg', '6'], ['14:45', 'RB 84', 'Puttgarden', '3']];
  g.font = '500 26px "IBM Plex Mono", monospace';
  rows.forEach((r, i) => { const y = 84 + i * 36; g.fillStyle = '#ffd34a'; g.fillText(r[0], 24, y); g.fillText(r[1], 140, y); g.fillStyle = '#ffffff'; g.fillText(r[2], 270, y); g.fillStyle = '#ffd34a'; g.fillText('Gl. ' + r[3], 860, y); });
  return tex(c);
}
function signTex(text, bg, fg) { const [c, g] = cv(512, 96); g.fillStyle = bg; g.fillRect(0, 0, 512, 96); g.fillStyle = fg; g.font = '700 48px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 50); return tex(c); }
function floorTex() { const [c, g] = cv(512, 512); g.fillStyle = '#9c9488'; g.fillRect(0, 0, 512, 512); for (let y = 0; y < 512; y += 64) for (let x = 0; x < 512; x += 64) { const v = ((x + y) / 64) % 2 ? 200 : 172; g.fillStyle = `rgb(${v},${v - 6},${v - 16})`; g.fillRect(x + 1, y + 1, 62, 62); } return tex(c, true); }
function roofTileTex() {   // green glazed pantiles (photo 1)
  const [c, g] = cv(256, 256); let s = 4; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#3d5a46'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) for (let x = -(y / 16 % 2) * 8; x < 256; x += 16) { const k = (r() - 0.5) * 26; g.fillStyle = `rgb(${86 + k | 0},${124 + k | 0},${96 + k | 0})`; g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + 15, y); g.lineTo(x + 15, y + 12); g.quadraticCurveTo(x + 8, y + 16, x + 1, y + 12); g.fill(); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 3, y + 2, 5, 8); }
  return tex(c, true);
}
function innerWallTex(w, h, windows) {   // cream plaster, white tiled dado; tall arched windows with leaded glass on the front wall
  const PX = 36, W = Math.round(w * PX), H = Math.round(h * PX), [c, g] = cv(W, H);
  g.fillStyle = '#efe6d3'; g.fillRect(0, 0, W, H);
  if (!windows) { g.fillStyle = '#f4f1ea'; g.fillRect(0, H - 3.4 * PX, W, 3.4 * PX); g.strokeStyle = '#d9d4c8'; g.lineWidth = 2; for (let x = 0; x < W; x += 0.6 * PX) { g.beginPath(); g.moveTo(x, H - 3.4 * PX); g.lineTo(x, H); g.stroke(); } for (let y = H; y > H - 3.4 * PX; y -= 0.3 * PX) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } }
  else for (let i = 0; i < 3; i++) { const cx = (i + 0.5) * W / 3, rw = 3.0 * PX, top = 0.6 * PX; g.fillStyle = '#4a4a4e'; g.beginPath(); g.moveTo(cx - rw - 8, H); g.lineTo(cx - rw - 8, top + rw); g.arc(cx, top + rw, rw + 8, Math.PI, 0); g.lineTo(cx + rw + 8, H); g.fill();
    const gr = g.createLinearGradient(0, top, 0, H); gr.addColorStop(0, '#dff0ff'); gr.addColorStop(1, '#b8d0e0'); g.fillStyle = gr; g.beginPath(); g.moveTo(cx - rw, H); g.lineTo(cx - rw, top + rw); g.arc(cx, top + rw, rw, Math.PI, 0); g.lineTo(cx + rw, H); g.fill();
    g.fillStyle = 'rgba(70,90,80,0.55)'; for (let x = cx - rw; x < cx + rw; x += 0.5 * PX) g.fillRect(x, top, 3, H); for (let y = H; y > top; y -= 0.55 * PX) g.fillRect(cx - rw, y, rw * 2, 3);
    g.fillStyle = 'rgba(190,140,60,0.35)'; g.fillRect(cx - rw, H - 1.4 * PX, rw * 2, 0.5 * PX); }
  return tex(c);
}
function clockTex() { const [c, g] = cv(256, 256); g.fillStyle = '#f4efe2'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.strokeStyle = '#1d1d1d'; g.lineWidth = 8; g.stroke(); g.fillStyle = '#1d1d1d'; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.fillRect(128 + Math.cos(a) * 96 - 5, 128 + Math.sin(a) * 96 - 5, 10, 10); } g.lineWidth = 9; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 50); g.moveTo(128, 128); g.lineTo(186, 150); g.stroke(); return tex(c); }

export function buildStation(scene) {
  const G = new THREE.Group(); G.position.set(A[0], 0, A[1]); G.rotation.y = TH; scene.add(G);
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  const [bc] = brickBanded(512, 512, 48, true, 3), brick = std({ map: tex(bc, true) }); brick.map.repeat.set(1, 1);
  const [ac] = ashlar(512, 256, 64), stone = std({ map: tex(ac, true), roughness: 0.9 });
  const copper = std({ color: 0x6fae96, roughness: 0.55, metalness: 0.35 }), copperDark = std({ color: 0x4d8a75, roughness: 0.6, metalness: 0.3 });
  const roofM = std({ color: 0x2c3442, roughness: 0.6 }), white = std({ color: 0xe6dccb }), iron = std({ color: 0x23272a, metalness: 0.6, roughness: 0.5 });
  const uvScale = (geo, s) => { const uv = geo.attributes.uv, p = geo.attributes.position; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * s[0], uv.getY(k) * s[1]); void p; return geo; };

  // ---- ground floor: rusticated sandstone with three entrance openings (local x along the front, z outward)
  const base = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(L, 0), new THREE.Vector2(L, 6), new THREE.Vector2(0, 6)]);
  const doors = [];
  for (let i = 0; i < 3; i++) { const cx = (i + 0.5) * L / 3, hw = 1.9, p = new THREE.Path(); p.moveTo(cx - hw, 0); p.lineTo(cx - hw, 3.2); p.absarc(cx, 3.2, hw, Math.PI, 0, true); p.lineTo(cx + hw, 0); p.lineTo(cx - hw, 0); base.holes.push(p); doors.push(cx); }
  const bg = new THREE.ExtrudeGeometry(base, { depth: 0.7, bevelEnabled: false, curveSegments: 10 }); bg.translate(0, 0, -0.7);
  { const uv = bg.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) / 8, uv.getY(k) / 4); }
  G.add(new THREE.Mesh(bg, stone));
  // ---- upper front with the great arched windows
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(L, WALL - 6), std({ map: frontTex(false), roughness: 0.7 })); fr.position.set(L / 2, 6 + (WALL - 6) / 2, 0.01); G.add(fr);
  const backWall = new THREE.Mesh(uvScale(new THREE.BoxGeometry(L, WALL, 0.5), [L / 5, WALL / 5]), brick); backWall.position.set(L / 2, WALL / 2, -D); G.add(backWall);
  for (const x of [0, L]) { const s = new THREE.Mesh(uvScale(new THREE.BoxGeometry(0.5, WALL, D), [D / 5, WALL / 5]), brick); s.position.set(x, WALL / 2, -D / 2); G.add(s); }
  // balustrade
  const bal = new THREE.Mesh(new THREE.BoxGeometry(L, 0.18, 0.7), white); bal.position.set(L / 2, WALL + 1.05, 0.05); G.add(bal);
  const balB = new THREE.Mesh(new THREE.BoxGeometry(L, 0.25, 0.7), white); balB.position.set(L / 2, WALL + 0.1, 0.05); G.add(balB);
  for (let x = 0.4; x < L; x += 0.42) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.8, 6), white); b.position.set(x, WALL + 0.6, 0.05); G.add(b); }
  // hipped roof
  { const v = [], add = (...p) => v.push(...p.flat()); const e = WALL + 0.2, inset = 4.5, a0 = [0, e, 0.3], a1 = [L, e, 0.3], b1 = [L, e, -D - 0.3], b0 = [0, e, -D - 0.3], r0 = [inset, RIDGE, -D / 2], r1 = [L - inset, RIDGE, -D / 2];
    add(a0, a1, r1); add(a0, r1, r0); add(b1, b0, r0); add(b1, r0, r1); add(a1, b1, r1); add(b0, a0, r0);
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); { const uvv = []; for (let k = 0; k < v.length; k += 3) uvv.push((v[k] + v[k + 2]) / 2.5, v[k + 1] / 1.2); rg.setAttribute('uv', new THREE.Float32BufferAttribute(uvv, 2)); } rg.computeVertexNormals(); const rm = new THREE.Mesh(rg, std({ map: roofTileTex(), color: 0xffffff, roughness: 0.45, side: THREE.DoubleSide })); G.add(rm); }
  // central clock tower on the roof
  { const ct = new THREE.Mesh(new THREE.BoxGeometry(3.4, 5, 3.4), copper); ct.position.set(L / 2, RIDGE + 1.5, -D / 2); G.add(ct);
    const cl = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32), std({ map: clockTex(), roughness: 0.5 })); cl.position.set(L / 2, RIDGE + 2, -D / 2 + 1.72); G.add(cl);
    const bel = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 2.2, 8), copperDark); bel.position.set(L / 2, RIDGE + 5.1, -D / 2); G.add(bel);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), copper); dome.position.set(L / 2, RIDGE + 6.2, -D / 2); G.add(dome);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.25, 2.4, 8), copperDark); sp.position.set(L / 2, RIDGE + 8.2, -D / 2); G.add(sp); }
  // ---- towers: big corner towers (clock, copper bell dome, lantern) and two small towers between the arches
  const domeProfile = (r) => { const p = []; for (let i = 0; i <= 20; i++) { const t = i / 20, y = t * 3.2, rr = r * (1.15 - 0.45 * t + 0.55 * Math.sin(t * Math.PI) * (1 - t)); p.push(new THREE.Vector2(Math.max(0.05, rr * (1 - t * t * 0.9)), y)); } return p; };
  const tower = (x, w, h, big) => {
    const t = new THREE.Mesh(uvScale(new THREE.BoxGeometry(w, h, w), [w / 5, h / 5]), brick); t.position.set(x, h / 2, 0.4 - w / 2 + 0.8); G.add(t);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.4, w + 0.4), white); cap.position.set(x, h, t.position.z); G.add(cap);
    const dm = new THREE.Mesh(new THREE.LatheGeometry(domeProfile(w * 0.62), 16), copper); dm.position.set(x, h + 0.2, t.position.z); G.add(dm);
    const lan = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.2, w * 0.22, big ? 1.8 : 1.1, 8), copperDark); lan.position.set(x, h + 3.4 + (big ? 0.9 : 0.5), t.position.z); G.add(lan);
    const top = new THREE.Mesh(new THREE.SphereGeometry(w * 0.2, 12, 8), copper); top.position.set(x, h + 3.4 + (big ? 2.0 : 1.2), t.position.z); G.add(top);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.08, big ? 2.2 : 1.3, 6), iron); sp.position.set(x, h + 3.4 + (big ? 3.2 : 2.0), t.position.z); G.add(sp);
    if (big) for (const sd of [1]) { const cl = new THREE.Mesh(new THREE.CircleGeometry(0.85, 32), std({ map: clockTex(), roughness: 0.5 })); cl.position.set(x, h - 2.2, t.position.z + w / 2 * sd + 0.02); G.add(cl); }
    // little arched windows near the top
    for (const yy of [h - 4.2, h - 7.5]) { const wn = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.3, 1.3), std({ color: 0x2a2d30, emissive: 0xffc070, emissiveIntensity: 0.25, roughness: 0.3 })); wn.position.set(x, yy, t.position.z + w / 2 + 0.02); G.add(wn); }
  };
  tower(0, 4.4, 22, true); tower(L, 4.4, 22, true); tower(L / 3, 2.4, 19.5, false); tower(2 * L / 3, 2.4, 19.5, false);
  // ---- wavy copper canopies over the entrances
  for (const cx of doors) {
    const shape = new THREE.Shape(); shape.moveTo(-3.6, 0); for (let i = 0; i <= 24; i++) { const t = i / 24, x = -3.6 + t * 7.2; shape.lineTo(x, 0.35 + Math.sin(t * Math.PI) * 0.9 - (Math.abs(t - 0.5) < 0.08 ? 0.15 : 0)); } shape.lineTo(3.6, 0); shape.lineTo(-3.6, 0);
    const cg = new THREE.ExtrudeGeometry(shape, { depth: 2.2, bevelEnabled: false, curveSegments: 4 }); const cm = new THREE.Mesh(cg, copper); cm.position.set(cx, 4.6, 0.1); G.add(cm);
    for (const sd of [-1, 1]) { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), iron); br.rotation.x = Math.PI / 2 - 0.55; br.position.set(cx + sd * 3.1, 5.3, 1.1); G.add(br); }
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.0), std({ color: 0xc9d6dc, emissive: 0xffd9a0, emissiveIntensity: 0.35, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.35, side: THREE.DoubleSide })); glass.position.set(cx, 4.9, -0.36); G.add(glass);
  }
  // ---- concourse interior
  const ft = floorTex(); ft.repeat.set(L / 2.4, D / 2.4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(L, D), std({ map: ft, roughness: 0.35, color: 0xffe9cc })); floor.rotation.x = -Math.PI / 2; floor.position.set(L / 2, 0.02, -D / 2); G.add(floor);
  const innerM = std({ color: 0xe9dfcb, roughness: 0.9, side: THREE.DoubleSide });
  const innerBack = new THREE.Mesh(new THREE.PlaneGeometry(L, WALL - 0.3), std({ map: innerWallTex(L, WALL, false), roughness: 0.6 })); innerBack.position.set(L / 2, (WALL - 0.3) / 2, -D + 0.3); G.add(innerBack);
  const innerFront = new THREE.Mesh(new THREE.PlaneGeometry(L, WALL - 6), std({ map: innerWallTex(L, WALL - 6, true), emissive: 0xffffff, emissiveIntensity: 0.25, emissiveMap: innerWallTex(L, WALL - 6, true), roughness: 0.5 })); innerFront.rotation.y = Math.PI; innerFront.position.set(L / 2, 6 + (WALL - 6) / 2, -0.75); G.add(innerFront);
  // barrel vault along the hall (photo: cream vault with dark transverse ribs, arched side windows)
  const VR = (D - 0.6) / 2, VS = WALL - 0.4 - VR;
  const vault = new THREE.Mesh(new THREE.CylinderGeometry(VR, VR, L - 0.6, 40, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), std({ color: 0xefe6d3, roughness: 0.95, side: THREE.DoubleSide }));
  vault.position.set(L / 2, VS, -D / 2); G.add(vault);
  const ribM = std({ color: 0x4a4a4e, roughness: 0.6 });
  for (let k = 0; k <= 6; k++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(VR - 0.05, 0.16, 6, 40, Math.PI), ribM); rib.rotation.y = Math.PI / 2; rib.position.set(0.3 + k * (L - 0.6) / 6, VS, -D / 2); G.add(rib); }
  for (const sd of [-1, 1]) { const cor = new THREE.Mesh(new THREE.BoxGeometry(L - 0.6, 0.35, 0.5), ribM); cor.position.set(L / 2, VS, -D / 2 + sd * (VR - 0.2)); G.add(cor); }
  // end wall lettering (generic café sign)
  const endSign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.6), std({ map: signTex('CAFÉ · KONDITOREI', '#efe6d3', '#a8322a'), roughness: 0.6 })); endSign.rotation.y = -Math.PI / 2; endSign.position.set(L - 0.32, 10.5, -D / 2); G.add(endSign);
  // hanging lamps
  for (let k = 0; k < 3; k++) for (const zz of [-D / 2]) { const lp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 10), std({ color: 0xfff4dc, emissive: 0xffe2a8, emissiveIntensity: 1.1 })); lp.position.set((k + 0.5) * L / 3, 7.2, zz); G.add(lp); const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 7.4, 4), iron); ch.position.set(lp.position.x, 11, zz); G.add(ch); }
  // shops along the back wall (bakery, kiosk, books) — generic names
  [['BÄCKEREI', '#6e4420', '#f3d9a6', 0xf0d9a8], ['PRESSE · KIOSK', '#1d3f8f', '#ffffff', 0xdfe6ee], ['BUCHHANDLUNG', '#1f3a30', '#e3c47a', 0xe9dfc6]].forEach(([n, bgc, fgc, inC], i) => {
    const cx = 3.2 + i * 6.8, sf = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.2, 0.2), std({ color: inC, emissive: inC, emissiveIntensity: 0.35, roughness: 0.4 })); sf.position.set(cx, 1.6, -D + 0.45); G.add(sf);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.8), std({ map: signTex(n, bgc, fgc), roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.15 })); sg.position.set(cx, 3.7, -D + 0.56); G.add(sg);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.0, 0.7), std({ color: 0x5a3b25 })); counter.position.set(cx, 0.5, -D + 1.3); G.add(counter);
    for (let s = 0; s < 3; s++) { const shelf = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.05, 0.3), std({ color: 0xf2ede4 })); shelf.position.set(cx, 1.4 + s * 0.55, -D + 0.62); G.add(shelf);
      for (let q = 0; q < 10; q++) { const it = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.2), std({ color: new THREE.Color().setHSL(Math.random(), 0.55, 0.55) })); it.position.set(cx - 2.2 + q * 0.48, 1.58 + s * 0.55, -D + 0.62); G.add(it); } }
  });
  // passage to the platforms + sign
  const tunnel = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.0), std({ color: 0x15171a, roughness: 1 })); tunnel.position.set(L - 3.4, 1.5, -D + 0.33); G.add(tunnel);
  const gs = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.6), std({ map: signTex('→ Gleis 1 – 9', '#1d3f8f', '#ffffff'), emissive: 0xffffff, emissiveIntensity: 0.2 })); gs.position.set(L - 3.4, 3.4, -D + 0.34); G.add(gs);
  // departure boards
  for (const x of [L * 0.3, L * 0.7]) { const b = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 0.15), [iron, iron, iron, iron, std({ map: boardTex(), emissive: 0xffffff, emissiveIntensity: 0.35, emissiveMap: boardTex() }), iron]); b.position.set(x, 4.2, -6); G.add(b); const h1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 9, 4), iron); h1.position.set(x, 9.2, -6); G.add(h1); }
  // ticket machines and benches
  for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.6), std({ color: 0xd8332b, roughness: 0.4 })); m.position.set(1.4 + i * 1.1, 0.9, -1.2); G.add(m); const sc2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), std({ color: 0x9fd2ff, emissive: 0x6fb2ff, emissiveIntensity: 0.6 })); sc2.position.set(1.4 + i * 1.1, 1.3, -0.89); G.add(sc2); }
  for (const x of [L * 0.4, L * 0.6]) for (const zz of [-8.5, -11]) { const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 0.55), std({ color: 0x5a3b25 })); bench.position.set(x, 0.45, zz); G.add(bench); const back = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.08), std({ color: 0x5a3b25 })); back.position.set(x, 0.85, zz - 0.25); G.add(back); }
  // forecourt: bicycles, flag poles
  for (let i = 0; i < 3; i++) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 7, 6), std({ color: 0xc9ccd0, metalness: 0.7 })); pole.position.set(-3 - i * 3, 3.5, 4); G.add(pole); const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 3.2), std({ color: 0xf2efe8, side: THREE.DoubleSide })); flag.position.set(-3 - i * 3 + 0.55, 4.6, 4); G.add(flag); }
  const u = [Math.cos(TH), -Math.sin(TH)], n = [Math.sin(TH), Math.cos(TH)], W2 = (a, d) => ({ x: A[0] + u[0] * a + n[0] * d, z: A[1] + u[1] * a + n[1] * d });
  const cols = [];
  // ---- east wing (photo 2): two storeys of brick with sandstone bands, arched ground-floor windows, rose awnings
  { const WL = 48, WD = 16, WH = 10, x0 = L + 2.3;
    const [wc, wg] = brickBanded(1024, 256, 22, false, 9); const PX = 1024 / WL;
    wg.fillStyle = '#e6dccb'; wg.fillRect(0, 256 - 3.6 * 22, 1024, 0.3 * 22); wg.fillRect(0, 256 - 6.8 * 22, 1024, 0.3 * 22);
    for (let i = 0; i < 7; i++) { const cx = (i + 0.5) * 1024 / 7; wg.fillStyle = '#e6dccb'; wg.beginPath(); wg.moveTo(cx - 52, 256); wg.lineTo(cx - 52, 256 - 2.4 * 22); wg.arc(cx, 256 - 2.4 * 22, 52, Math.PI, 0); wg.lineTo(cx + 52, 256); wg.fill(); wg.fillStyle = '#5c6a66'; wg.beginPath(); wg.moveTo(cx - 44, 256); wg.lineTo(cx - 44, 256 - 2.4 * 22); wg.arc(cx, 256 - 2.4 * 22, 44, Math.PI, 0); wg.lineTo(cx + 44, 256); wg.fill(); wg.fillStyle = '#e8eef0'; for (let k = 1; k < 4; k++) wg.fillRect(cx - 44 + k * 22, 256 - 3.4 * 22, 3, 3.4 * 22);
      wg.fillStyle = '#e6dccb'; wg.fillRect(cx - 44, 256 - 6.4 * 22, 88, 2.4 * 22); wg.fillStyle = '#2a3036'; wg.fillRect(cx - 38, 256 - 6.3 * 22, 76, 2.2 * 22); wg.fillStyle = '#e8eef0'; wg.fillRect(cx - 2, 256 - 6.3 * 22, 4, 2.2 * 22); }
    void PX;
    const wf = new THREE.Mesh(new THREE.PlaneGeometry(WL, WH), std({ map: tex(wc), roughness: 0.8 })); wf.position.set(x0 + WL / 2, WH / 2, -0.6); G.add(wf);
    const body = new THREE.Mesh(uvScale(new THREE.BoxGeometry(WL, WH, WD), [WL / 5, WH / 5]), brick); body.position.set(x0 + WL / 2, WH / 2, -0.65 - WD / 2); G.add(body);
    const wr = new THREE.Mesh(new THREE.CylinderGeometry(0.01, WD * 0.62, 4.5, 4, 1), std({ map: roofTileTex(), roughness: 0.45 })); wr.rotation.y = Math.PI / 4; wr.scale.set(WL / WD * 1.05, 1, 0.75); wr.position.set(x0 + WL / 2, WH + 2.25, -0.65 - WD / 2); G.add(wr);
    const pink = std({ color: 0xd8566a, roughness: 0.8, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) { const cx = x0 + (i + 0.5) * WL / 7; const aw = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.6), pink); aw.position.set(cx, 6.9, 0.05); aw.rotation.x = -0.75; G.add(aw);
      const val = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.45), std({ map: signTex(i === 6 ? 'Café Bel Etage' : 'RESTAURANT', '#d8566a', '#ffffff'), roughness: 0.8 })); val.position.set(cx, 6.2, 0.6); G.add(val); }
    cols.push({ c: W2(x0 + WL / 2, -0.65 - WD / 2), yaw: TH, hx: WL / 2, hz: WD / 2 + 0.2 });
  }
  G.traverse((o) => { if (o.isMesh) { o.castShadow = !o.material.transparent; o.receiveShadow = true; } });
  // colliders: front wall segments between the three doors, back and side walls, the big towers
  let prev = 0; for (const cx of [...doors, L + 1.9]) { const a0 = prev, a1 = cx - 1.9; if (a1 > a0) cols.push({ c: W2((a0 + a1) / 2, -0.35), yaw: TH, hx: (a1 - a0) / 2, hz: 0.4 }); prev = cx + 1.9; }
  cols.push({ c: W2(L / 2, -D), yaw: TH, hx: L / 2, hz: 0.4 });
  for (const a of [0, L]) cols.push({ c: W2(a, -D / 2), yaw: TH, hx: 0.4, hz: D / 2 }, { c: W2(a, 0.8 - 2.2 + 0.4), yaw: TH, hx: 2.2, hz: 2.2 });
  cols.push({ c: W2(1.4 + 1.1, -1.2), yaw: TH, hx: 1.7, hz: 0.35 });
  return { group: G, colliders: cols };
}

// Train shed behind the reception building, on the OSM outline of "Lübeck Hbf" (photo 4): four longitudinal spans
// of riveted steel columns and lattice trusses, glazed ridge strips with timber-boarded slopes either side,
// island platforms with yellow tactile edges, tracks with sleepers, blue departure boards.
export function buildShed(scene) {
  const P0 = [-978, -54], P1 = [-1082, 17], P3 = [-1028, -127];
  const LEN = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]), WID = Math.hypot(P3[0] - P0[0], P3[1] - P0[1]);
  const ux = (P1[0] - P0[0]) / LEN, uz = (P1[1] - P0[1]) / LEN, th = Math.atan2(-uz, ux);
  const vz = Math.sin(th), sgn = Math.sign(((P3[0] - P0[0]) * vz + (P3[1] - P0[1]) * Math.cos(th))) || 1;
  const G = new THREE.Group(); G.position.set(P0[0], 0, P0[1]); G.rotation.y = th; scene.add(G);
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.6, ...o });
  const steel = std({ color: 0x8e9a9c, metalness: 0.6, roughness: 0.45 }), wood = std({ color: 0xc98d4e, roughness: 0.7, side: THREE.DoubleSide });
  const glass = std({ color: 0xe8f2f6, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const N = 4, SW = WID / N, H0 = 8, H1 = 12.5, bay = 10;
  const zOf = (z) => z * sgn;
  for (let s = 0; s < N; s++) {
    const z0 = s * SW, zc = z0 + SW / 2;
    // roof slopes: timber outer, glass middle
    const slope = (za, zb, ya, yb, mat) => { const L2 = Math.hypot(zb - za, yb - ya), m = new THREE.Mesh(new THREE.PlaneGeometry(LEN, L2), mat); m.position.set(LEN / 2, (ya + yb) / 2, zOf((za + zb) / 2)); m.rotation.x = -Math.PI / 2 + Math.atan2(yb - ya, zOf(zb - za)); G.add(m); };
    slope(z0, z0 + SW * 0.3, H0, H0 + (H1 - H0) * 0.6, wood); slope(z0 + SW * 0.3, zc, H0 + (H1 - H0) * 0.6, H1, glass);
    slope(z0 + SW, z0 + SW * 0.7, H0, H0 + (H1 - H0) * 0.6, wood); slope(z0 + SW * 0.7, zc, H0 + (H1 - H0) * 0.6, H1, glass);
    // columns and lattice trusses every bay
    for (let x = 2; x < LEN - 1; x += bay) {
      for (const zz of [z0 + 0.4, z0 + SW - 0.4]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.35, H0, 0.35), steel); c.position.set(x, H0 / 2, zOf(zz)); G.add(c); const br = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.4, 0.15), steel); br.position.set(x, H0 - 1.1, zOf(zz + (zz < zc ? 0.9 : -0.9))); br.rotation.x = (zz < zc ? -1 : 1) * 0.7 * sgn; G.add(br); }
      const pts = [[z0 + 0.4, H0], [zc, H1], [z0 + SW - 0.4, H0]];
      for (let k = 0; k < 2; k++) { const [a, b] = [pts[k], pts[k + 1]], L2 = Math.hypot(b[0] - a[0], b[1] - a[1]); const t = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, L2), steel); t.position.set(x, (a[1] + b[1]) / 2 - 0.25, zOf((a[0] + b[0]) / 2)); t.rotation.x = -Math.atan2(b[1] - a[1], zOf(b[0] - a[0])); G.add(t); }
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, SW - 0.8), steel); tie.position.set(x, H0 + 0.2, zOf(zc)); G.add(tie);
    }
    // ridge girder
    const rg = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.4, 0.3), steel); rg.position.set(LEN / 2, H1 - 0.2, zOf(zc)); G.add(rg);
    // island platform in the middle of each span, tracks to both sides
    const pl = new THREE.Mesh(new THREE.BoxGeometry(LEN - 8, 0.76, 7), std({ color: 0xbdbab2, roughness: 0.85 })); pl.position.set(LEN / 2, 0.38, zOf(zc)); G.add(pl);
    for (const sd of [-1, 1]) { const edge = new THREE.Mesh(new THREE.BoxGeometry(LEN - 8, 0.02, 0.35), std({ color: 0xf2f2ee })); edge.position.set(LEN / 2, 0.77, zOf(zc + sd * 3.1)); G.add(edge); }
    const brd = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.12), std({ color: 0x1d4fa0, emissive: 0x1d4fa0, emissiveIntensity: 0.4 })); brd.position.set(LEN / 2, 3.2, zOf(zc)); G.add(brd);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6), steel); post.position.set(LEN / 2, 1.9, zOf(zc)); G.add(post);
    for (const sd of [-1, 1]) { const tz = zc + sd * 6.6;
      for (const r of [-0.72, 0.72]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.15, 0.08), std({ color: 0x6a6460, metalness: 0.8, roughness: 0.4 })); rail.position.set(LEN / 2, 0.2, zOf(tz + r)); G.add(rail); }
      const ballast = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.12, 3.2), std({ color: 0x77706a, roughness: 1 })); ballast.position.set(LEN / 2, 0.06, zOf(tz)); G.add(ballast);
      const sl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 0.1, 2.5), std({ color: 0x5a4a3a }), Math.floor(LEN / 0.65)); const m = new THREE.Matrix4(); for (let i = 0; i < sl.count; i++) { m.makeTranslation(i * 0.65, 0.13, zOf(tz)); sl.setMatrixAt(i, m); } G.add(sl); }
  }
  G.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = !o.material.transparent; } });
  return G;
}
