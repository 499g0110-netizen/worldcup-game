// Shops you can walk into: Café Niederegger (Stammhaus), Fangfrisch and CITTI-PARK. Each interior is a separate room built
// far outside the city (so it never collides with real buildings); entering fades out, moves the player there and back.
// Lighting is cheap on purpose (ambient + glowing fixtures + light pools) so the shader programs of the city never
// have to be rebuilt when you step inside. Shop stands let you buy things with a pretend wallet (nothing real is sold).
import * as THREE from 'three';
import { createMannequin, randomLook } from './mannequin.js';
import { updateLocomotion } from './actors.js';

export const SHOPS = [
  { id: 'niederegger', zh: 'Niederegger 本店', sub: 'Café Niederegger · Stammhaus', addr: 'Breite Straße 89, 23552 Lübeck', door: [50.6, -6.9], story: 'niederegger_haus',
    blurb: '百年杏仁糖老店：杏仁糖專賣區、酒紅色的咖啡廳、圓形蛋糕櫃台。可以買杏仁糖禮盒、杏仁麵包和蛋糕。', icon: '🍬' },
  { id: 'fangfrisch', zh: 'Fangfrisch 魚堡與自釀啤酒', sub: 'Fangfrisch · An der Untertrave', addr: 'An der Untertrave 51, 23552 Lübeck', door: [-104.6, -630.9], story: 'fangfrisch',
    blurb: '特拉沃河畔，現炸魚排堡（Fischbrötchen）和自家釀造的啤酒。', icon: '🐟' },
  { id: 'citti', zh: 'CITTI-PARK 購物中心', sub: 'CITTI-PARK · Herrenholz', addr: 'Herrenholz, 23556 Lübeck（距老城約 4 公里）', door: null, story: 'citti',
    blurb: '大型購物中心：中庭、麵包店、蔬果區和超市貨架。（外部街景不在目前的地圖範圍內，只能從選單進入。）', icon: '🛒' },
];
export const CATALOG = {
  gifts: { zh: '杏仁糖禮盒桌', items: [
    { id: 'klassiker', zh: 'Klassiker 經典杏仁糖禮盒', price: 6.9 }, { id: 'brot', zh: '杏仁麵包 Marzipanbrot', price: 3.5 }, { id: 'kartoffeln', zh: '杏仁馬鈴薯 Marzipankartoffeln', price: 4.2 }, { id: 'edel', zh: '黑巧克力杏仁糖 Edelbitter', price: 5.5 }, { id: 'xmas', zh: '聖誕造型杏仁糖', price: 8.9 } ] },
  cake: { zh: '蛋糕櫃台', items: [
    { id: 'torte', zh: '杏仁蛋糕一片 Marzipantorte', price: 4.8 }, { id: 'sahne', zh: '鮮奶油水果塔一片', price: 4.5 }, { id: 'kaffee', zh: '咖啡 Kaffee', price: 3.2 }, { id: 'kakao', zh: '熱巧克力', price: 3.8 }, { id: 'tee', zh: '紅茶', price: 3.0 } ] },
  fischbar: { zh: '魚堡櫃台', items: [
    { id: 'backfisch', zh: '現炸魚排堡 Backfisch-Brötchen', price: 6.5 }, { id: 'matjes', zh: '鯡魚堡 Matjes-Brötchen', price: 5.5 }, { id: 'fishchips', zh: '炸魚薯條 Fish & Chips', price: 9.5 }, { id: 'krabben', zh: '小蝦堡 Krabben-Brötchen', price: 7.5 } ] },
  bier: { zh: '啤酒吧檯（自家釀造）', items: [
    { id: 'helles', zh: '淡啤酒 Helles（0.3 L）', price: 3.6 }, { id: 'pils', zh: '皮爾森 Pils（0.3 L）', price: 3.6 }, { id: 'dunkel', zh: '黑啤酒 Dunkel（0.3 L）', price: 4.0 }, { id: 'radler', zh: '無酒精汽水', price: 2.5 } ] },
  baeckerei: { zh: '麵包店', items: [
    { id: 'brezel', zh: '蝴蝶脆餅 Brezel', price: 1.5 }, { id: 'broetchen', zh: '麵包捲 Brötchen', price: 0.7 }, { id: 'franz', zh: '可頌 Croissant', price: 1.8 }, { id: 'kuchen', zh: '蛋糕一片', price: 2.9 } ] },
  markt: { zh: '超市與蔬果', items: [
    { id: 'aepfel', zh: '蘋果 1 公斤', price: 2.8 }, { id: 'milch', zh: '牛奶 1 公升', price: 1.2 }, { id: 'kaese', zh: '起司', price: 3.5 }, { id: 'wasser', zh: '礦泉水', price: 0.9 }, { id: 'schoko', zh: '巧克力', price: 1.5 } ] },
};

/* ------------------------------------------------------------ textures & materials */
const cv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const rep = (t, x, y) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; };
const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
const MAT = {};
function mats() {
  if (MAT.floor) return MAT;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  MAT.floor = std({ map: rep(cv(256, 256, (g) => { g.fillStyle = '#d9c9a8'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${150 + hash(i, 1) * 60},${130 + hash(i, 2) * 50},${100 + hash(i, 3) * 40},0.07)`; g.fillRect(hash(i, 4) * 256, hash(i, 5) * 256, 30, 30); } g.strokeStyle = 'rgba(120,100,70,.35)'; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke(); }), 12, 6), roughness: 0.35, metalness: 0.05 });
  MAT.floorDark = std({ map: rep(cv(256, 256, (g) => { g.fillStyle = '#5a4030'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(0,0,0,${0.15 + hash(i, 9) * 0.15})`; g.fillRect(0, i * 32, 256, 2); } for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,220,170,${hash(i, 6) * 0.05})`; g.fillRect(hash(i, 7) * 256, hash(i, 8) * 256, 60, 1.5); } }), 8, 4), roughness: 0.55 });
  MAT.floorMall = std({ map: rep(cv(256, 256, (g) => { g.fillStyle = '#e4e0d8'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(100,100,100,.35)'; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256); g.fillStyle = 'rgba(160,140,110,.35)'; g.fillRect(96, 96, 64, 64); }), 12, 8), roughness: 0.3, metalness: 0.1 });
  MAT.wall = std({ color: 0xf2ece0, roughness: 0.9 }); MAT.ceil = std({ color: 0xf6f3ec, roughness: 0.95 });
  MAT.burg = std({ color: 0x6d1a2c, roughness: 0.85 }); MAT.burg2 = std({ color: 0x8d2a38, roughness: 0.4, metalness: 0.2 });
  const wood = (c) => std({ map: cv(256, 128, (g) => { g.fillStyle = c; g.fillRect(0, 0, 256, 128); for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(30,15,5,${0.06 + hash(i, 2) * 0.12})`; g.lineWidth = 1 + hash(i, 3) * 2; g.beginPath(); const y = hash(i, 4) * 128; g.moveTo(0, y); g.bezierCurveTo(80, y + 6, 170, y - 6, 256, y + hash(i, 1) * 8 - 4); g.stroke(); } }), roughness: 0.5 });
  MAT.wood = wood('#8a5a34'); MAT.woodD = wood('#5a3a22'); MAT.woodL = wood('#b88a58');
  MAT.gold = std({ color: 0xd9ac3c, roughness: 0.25, metalness: 0.9, emissive: 0x3a2a08 }); MAT.iron = std({ color: 0x25282a, roughness: 0.5, metalness: 0.6 });
  MAT.steel = std({ color: 0xcfd4d9, roughness: 0.22, metalness: 0.95 }); MAT.copper = std({ color: 0xc0703a, roughness: 0.3, metalness: 0.9 });
  MAT.white = std({ color: 0xf6f4ee, roughness: 0.6 }); MAT.black = std({ color: 0x15151a, roughness: 0.7 }); MAT.cream = std({ color: 0xe9dfc6, roughness: 0.7 });
  MAT.red = std({ color: 0xc02a2a, roughness: 0.55 }); MAT.blue = std({ color: 0x2c4c8a, roughness: 0.5 }); MAT.green = std({ color: 0x2f6a3c, roughness: 0.8 }); MAT.granite = std({ color: 0x2a2a2e, roughness: 0.25, metalness: 0.2 });
  MAT.glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe6ea, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  MAT.stripe = std({ map: cv(128, 128, (g) => { g.fillStyle = '#f0e6e2'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#b08a8a'; for (let x = 0; x < 128; x += 16) g.fillRect(x, 0, 8, 128); }), roughness: 0.9 });
  MAT.chairGrey = std({ color: 0xb9b0a2, roughness: 0.9 });
  MAT.glow = new THREE.MeshBasicMaterial({ color: 0xfff1d0 }); MAT.glowRed = new THREE.MeshBasicMaterial({ color: 0xff3a6a }); MAT.glowBlue = new THREE.MeshBasicMaterial({ color: 0x9fd0ff });
  const pool = cv(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,236,190,.9)'); gr.addColorStop(1, 'rgba(255,230,180,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  MAT.pool = new THREE.MeshBasicMaterial({ map: pool, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 });
  return MAT;
}
const labelTex = (text, w, h, bg, fg, size = 64, font = 'Georgia, serif') => cv(w, h, (g) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } g.fillStyle = fg; g.font = `700 ${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2); });
const portraitTex = (seed) => cv(160, 200, (g) => { g.fillStyle = '#e8c030'; g.fillRect(0, 0, 160, 200); g.fillStyle = '#c9a024'; g.fillRect(8, 8, 144, 184); g.fillStyle = '#222428'; g.fillRect(16, 16, 128, 168); g.fillStyle = '#d8b090'; g.beginPath(); g.ellipse(80, 82, 22, 28, 0, 0, 7); g.fill(); g.fillStyle = hash(seed, 1) < 0.5 ? '#3a3026' : '#cfcac2'; g.beginPath(); g.ellipse(80, 62, 24, 14, 0, Math.PI, 0); g.fill(); g.fillStyle = '#1b2030'; g.beginPath(); g.moveTo(34, 184); g.lineTo(46, 118); g.lineTo(114, 118); g.lineTo(126, 184); g.fill(); g.fillStyle = '#eee'; g.fillRect(70, 118, 20, 24); });
const streetTex = () => cv(1024, 256, (g) => { const sk = g.createLinearGradient(0, 0, 0, 256); sk.addColorStop(0, '#b8cfe0'); sk.addColorStop(1, '#e8e0cc'); g.fillStyle = sk; g.fillRect(0, 0, 1024, 256); const cols = ['#e9dcc3', '#c47a5a', '#d9cdb6', '#f1ece2', '#b65a3e', '#e4d6bd']; let x = -10; let i = 0; while (x < 1024) { const w = 90 + hash(i, 1) * 80, h = 110 + hash(i, 2) * 100; g.fillStyle = cols[i % cols.length]; g.fillRect(x, 256 - h, w, h); g.fillStyle = '#a8432a'; g.beginPath(); g.moveTo(x - 4, 256 - h); g.lineTo(x + w / 2, 256 - h - 36); g.lineTo(x + w + 4, 256 - h); g.fill(); g.fillStyle = 'rgba(40,50,60,.55)'; for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) g.fillRect(x + 12 + c * (w - 24) / 3, 256 - h + 14 + r * 26, 14, 18); x += w + 2; i++; } g.fillStyle = '#9aa0a4'; g.fillRect(0, 232, 1024, 24); });
const harborTex = () => cv(1024, 256, (g) => { const sk = g.createLinearGradient(0, 0, 0, 256); sk.addColorStop(0, '#bcd3e2'); sk.addColorStop(0.55, '#e6e2d2'); sk.addColorStop(0.56, '#6f93a8'); sk.addColorStop(1, '#4a6f86'); g.fillStyle = sk; g.fillRect(0, 0, 1024, 256); g.strokeStyle = '#3a3a3a'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { const x = 90 + i * 160; g.beginPath(); g.moveTo(x, 142); g.lineTo(x, 30 + hash(i, 3) * 40); g.stroke(); g.fillStyle = '#2f3a46'; g.fillRect(x - 40, 140, 80, 14); g.fillStyle = i % 2 ? '#c8402e' : '#f0f0f0'; g.fillRect(x - 40, 134, 80, 8); } const cols = ['#e9dcc3', '#c47a5a', '#d9cdb6', '#b65a3e']; for (let i = 0; i < 9; i++) { g.fillStyle = cols[i % 4]; g.fillRect(i * 120, 110, 100, 34); } });
const skylightTex = () => cv(256, 64, (g) => { g.fillStyle = '#eaf4ff'; g.fillRect(0, 0, 256, 64); g.strokeStyle = 'rgba(80,90,100,.6)'; g.lineWidth = 3; for (let x = 0; x <= 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); } g.beginPath(); g.moveTo(0, 32); g.lineTo(256, 32); g.stroke(); });

/* ------------------------------------------------------------ builder */
class Room {
  constructor(base, W, D, H, floor) {
    this.base = base; this.W = W; this.D = D; this.H = H; this.g = new THREE.Group(); this.g.position.set(base.x, 0, base.z); this.g.visible = false;
    this.cols = []; this.stands = []; this.npcs = []; this.m = mats(); this.exit = null; this.spawn = null; this.deco = [];
    this.box(W, 0.1, D, floor, W / 2, -0.1, D / 2); this.box(W, 0.1, D, this.m.ceil, W / 2, H, D / 2);
    this.wall(0, 0, W, 0, this.m.wall); this.wall(0, 0, 0, D, this.m.wall); this.wall(W, 0, W, D, this.m.wall);   // the south wall is built per shop (glass front)
  }
  mesh(geo, mat, x, y, z, shadow = false) { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = false; o.receiveShadow = false; this.g.add(o); return o; }
  box(w, h, d, mat, x, y0, z, col = false) { const o = this.mesh(new THREE.BoxGeometry(w, h, d), mat, x, y0 + h / 2, z); if (col) this.cols.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, h: y0 + h }); return o; }
  cyl(rt, rb, h, mat, x, y0, z, seg = 20, col = false, open = false) { const o = this.mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat, x, y0 + h / 2, z); if (col) this.cols.push({ cx: x, cz: z, r: Math.max(rt, rb), h: y0 + h }); return o; }
  sphere(r, mat, x, y, z, ws = 16) { return this.mesh(new THREE.SphereGeometry(r, ws, ws / 2 | 0), mat, x, y, z); }
  plane(w, h, mat, x, y, z, ry = 0, rx = 0) { const o = this.mesh(new THREE.PlaneGeometry(w, h), mat, x, y, z); o.rotation.set(rx, ry, 0); return o; }
  wall(x0, z0, x1, z1, mat, gaps = []) {   // full-height wall with optional openings [[a,b],...] along its length
    const L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L, segs = []; let a = 0;
    for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) { if (g0 > a) segs.push([a, g0]); a = g1; } if (a < L) segs.push([a, L]);
    for (const [s0, s1] of segs) { const cx = x0 + ux * (s0 + s1) / 2, cz = z0 + uz * (s0 + s1) / 2, len = s1 - s0; const o = this.mesh(new THREE.BoxGeometry(Math.abs(ux) > 0.5 ? len : 0.3, this.H, Math.abs(uz) > 0.5 ? len : 0.3), mat, cx, this.H / 2, cz); o.userData.wall = true; this.cols.push({ x0: cx - (Math.abs(ux) > 0.5 ? len : 0.3) / 2, x1: cx + (Math.abs(ux) > 0.5 ? len : 0.3) / 2, z0: cz - (Math.abs(uz) > 0.5 ? len : 0.3) / 2, z1: cz + (Math.abs(uz) > 0.5 ? len : 0.3) / 2, h: this.H }); }
    return segs;
  }
  light(x, y, z, s = 3, mat = this.m.pool) { const p = this.plane(s, s, mat, x, 0.03, z, 0, -Math.PI / 2); p.renderOrder = 2; return p; }
  downlights(nx, nz, x0, z0, dx, dz, y) { const geo = new THREE.CylinderGeometry(0.14, 0.14, 0.04, 14), im = new THREE.InstancedMesh(geo, this.m.glow, nx * nz), mm = new THREE.Matrix4(); let i = 0; for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) { mm.makeTranslation(x0 + a * dx, y, z0 + b * dz); im.setMatrixAt(i++, mm); } this.g.add(im); }
  stand(id, cat, x, z, r, name) { this.stands.push({ id, cat, x: this.base.x + x, z: this.base.z + z, r, name }); }
  npc(look, x, z, yaw, scale = 1) { const h = createMannequin(this.g, { ...randomLook(), ...look, height: (look.height || 1) * scale }); h.root.position.set(x, 0, z); h.root.rotation.y = yaw; h.n = { x, z, yaw, hx: x, hz: z, hy: yaw, staff: look.top !== undefined, tx: null, tz: null, wait: Math.random() * 4, speed: 0, greetT: -99, bubble: null, waveT: 0 }; this.npcs.push(h); return h; }
  chair(x, z, yaw, mat) { const c = new THREE.Group(); const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.46), mat); seat.position.y = 0.46; const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.07), mat); back.position.set(0, 0.76, -0.2); c.add(seat, back); for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 6), this.m.iron); l.position.set(lx, 0.23, lz); c.add(l); } c.position.set(x, 0, z); c.rotation.y = yaw; this.g.add(c); return c; }
  roundTable(x, z, r = 0.45, mat = this.m.woodL) { this.cyl(r, r, 0.04, mat, x, 0.72, z, 20); this.cyl(0.04, 0.04, 0.72, this.m.iron, x, 0, z, 8); this.cyl(0.25, 0.25, 0.03, this.m.iron, x, 0, z, 12); this.cols.push({ cx: x, cz: z, r: r + 0.05, h: 0.9 }); }
  product(kind, x, y, z, ry = 0, s = 1) {
    const m = this.m; let o;
    if (kind === 'giftblue') { o = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.26 * s, 0.07 * s, 0.18 * s), new THREE.MeshStandardMaterial({ color: 0x2c4c8a, roughness: 0.4 })); const star = new THREE.Mesh(new THREE.PlaneGeometry(0.14 * s, 0.09 * s), m.gold); star.rotation.x = -Math.PI / 2; star.position.y = 0.036 * s; o.add(b, star); }
    else if (kind === 'giftgold') { o = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.34 * s, 0.05 * s, 0.22 * s), new THREE.MeshStandardMaterial({ color: 0x9a7a4a, roughness: 0.6 })); const s2 = new THREE.Mesh(new THREE.PlaneGeometry(0.2 * s, 0.1 * s), m.gold); s2.rotation.x = -Math.PI / 2; s2.position.y = 0.026 * s; o.add(b, s2); }
    else if (kind === 'loaf') { o = new THREE.Mesh(new THREE.CapsuleGeometry(0.05 * s, 0.2 * s, 4, 8), new THREE.MeshStandardMaterial({ color: 0xe0b878, roughness: 0.7 })); o.rotation.z = Math.PI / 2; }
    else if (kind === 'cake') { o = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 0.08 * s, 18), new THREE.MeshStandardMaterial({ color: [0xf3e7c8, 0xd9a0a8, 0xe8c080][Math.floor(hash(x, z) * 3)], roughness: 0.6 })); c.position.y = 0.04 * s; const top = new THREE.Mesh(new THREE.SphereGeometry(0.03 * s, 8, 6), m.red); top.position.y = 0.1 * s; o.add(c, top); }
    else if (kind === 'mug') { o = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * s, 0.04 * s, 0.14 * s, 12), new THREE.MeshStandardMaterial({ color: 0xe8a428, roughness: 0.15, transparent: true, opacity: 0.9 })); c.position.y = 0.07 * s; const f = new THREE.Mesh(new THREE.CylinderGeometry(0.046 * s, 0.046 * s, 0.025 * s, 12), m.white); f.position.y = 0.15 * s; o.add(c, f); }
    else if (kind === 'roll') { o = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.1 * s, 12, 8), new THREE.MeshStandardMaterial({ color: 0xd9a45a, roughness: 0.7 })); b.scale.set(1.6, 0.6, 0.8); b.position.y = 0.05 * s; const fsh = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.03 * s, 0.1 * s), new THREE.MeshStandardMaterial({ color: 0xc98b4a })); fsh.position.y = 0.09 * s; o.add(b, fsh); }
    else if (kind === 'fruit') { o = new THREE.Mesh(new THREE.SphereGeometry(0.045 * s, 8, 6), new THREE.MeshStandardMaterial({ color: [0xc8402e, 0x7aa83a, 0xe8b43a, 0xd9602e][Math.floor(hash(x * 3, z * 7) * 4)], roughness: 0.5 })); }
    else if (kind === 'jar') { o = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.04 * s, 0.1 * s, 8), new THREE.MeshStandardMaterial({ color: [0xc8402e, 0x2c4c8a, 0xe8b43a, 0x5f9b86][Math.floor(hash(x, z * 5) * 4)], roughness: 0.4 })); o.position.y = 0.05 * s; }
    else o = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 0.1 * s, 0.1 * s), m.cream);
    o.position.set(x, y + (o.position.y || 0), z); o.rotation.y += ry; this.g.add(o); return o;
  }
}

/* ------------------------------------------------------------ Niederegger */
function buildNiederegger(R) {
  const m = R.m, { W, D, H } = R;
  R.wall(12, 0, 12, D, m.wall, [[4, 8]]); R.wall(20, 0, 20, D, m.wall, [[5, 9.5]]);
  // street backdrop behind the windows on the south wall
  const st = new THREE.MeshBasicMaterial({ map: streetTex() }); R.plane(34, 8.5, st, W / 2, 3.2, D + 14, Math.PI);
  // glass shopfront, door at x 5.5..7.5, windows with gold frames
  for (const [a, b] of [[0.3, 5.3], [7.7, 11.8], [12.4, 19.6]]) { R.box(b - a, 2.6, 0.04, m.glass, (a + b) / 2, 0.45, D - 0.1); for (let x = a; x <= b + 0.01; x += (b - a) / Math.round((b - a) / 1.3)) R.box(0.05, 2.7, 0.07, m.gold, x, 0.4, D - 0.1); R.box(b - a, 0.05, 0.07, m.gold, (a + b) / 2, 3.05, D - 0.1); R.box(b - a, 0.5, 0.2, m.wall, (a + b) / 2, 0, D - 0.12); }
  R.box(2, 0.05, 0.07, m.gold, 6.5, 2.95, D - 0.1); R.box(2.05, 2.5, 0.03, m.glass, 6.5, 0.4, D - 0.1);
  R.box(5.5, 0.7, 0.05, m.wall, 15.5, 3.1, D - 0.1); R.box(11.6, 0.8, 0.05, m.wall, 6, 3.0, D - 0.1);
  for (const x of [0.2, 5.4, 7.6, 11.9, 12.2, 19.8]) R.box(0.3, H, 0.3, m.white, x, 0, D - 0.15);
  // exit sign
  R.plane(1.4, 0.4, new THREE.MeshBasicMaterial({ transparent: true, map: labelTex('出口 EXIT', 256, 72, '#1d6a3c', '#fff', 40, 'Arial, sans-serif') }), 6.5, 2.75, D - 0.2, Math.PI);
  R.exit = { x: R.base.x + 6.5, z: R.base.z + D - 1.0 }; R.spawn = { x: R.base.x + 6.5, z: R.base.z + D - 2.2, yaw: Math.PI };
  /* ---- zone A: Marzipan-Salon */
  for (let i = 0; i < 5; i++) {   // wooden glass cabinets along the north wall
    const x = 1.2 + i * 2.2; R.cols.push({ x0: x - 1, x1: x + 1, z0: 0.1, z1: 0.62, h: 2.6 }); R.box(2.0, 0.1, 0.5, m.woodD, x, 0, 0.37); R.box(2.0, 0.08, 0.5, m.woodD, x, 2.52, 0.37); R.box(0.07, 2.6, 0.5, m.woodD, x - 0.965, 0, 0.37); R.box(0.07, 2.6, 0.5, m.woodD, x + 0.965, 0, 0.37); R.box(2.0, 2.5, 0.04, m.cream, x, 0.05, 0.17); R.box(1.86, 2.3, 0.03, m.glass, x, 0.15, 0.62); R.box(2.04, 0.06, 0.54, m.gold, x, 2.6, 0.37);
    for (let s = 0; s < 4; s++) { R.box(1.8, 0.03, 0.4, m.woodL, x, 0.5 + s * 0.55, 0.35); for (let k = 0; k < 5; k++) R.product(['jar', 'giftblue', 'loaf', 'jar', 'giftgold'][(i + s + k) % 5], x - 0.7 + k * 0.35, 0.53 + s * 0.55, 0.35, hash(k, s) * 0.5, 1.1); }
  }
  for (const [x, z, h] of [[2.2, 6.4, 2.9], [3.6, 5.7, 2.4]]) { R.box(0.9, 0.5, 0.9, m.woodD, x, 0, z, true); R.mesh(new THREE.ConeGeometry(0.62, h, 24), new THREE.MeshStandardMaterial({ color: 0xc02a2a, roughness: 0.9 }), x, 0.5 + h / 2, z); const band = R.mesh(new THREE.TorusGeometry(0.58, 0.07, 8, 24), m.white, x, 0.5 + h * 0.12, z); band.rotation.x = Math.PI / 2; R.sphere(0.14, m.white, x, 0.5 + h * 0.97, z, 8); }
  for (const x of [5.4, 8.8]) { R.box(3.0, 0.9, 1.2, m.granite, x, 0, 6.2, true); for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 2 + (c % 2); k++) R.product((r + c) % 2 ? 'giftblue' : 'giftgold', x - 1.2 + c * 0.7, 0.9 + k * 0.07, 5.75 + r * 0.42, (c + r) * 0.1, 1.5); R.box(3.0, 0.08, 1.2, m.woodD, x, 0.9, 6.2); }
  R.box(1.0, 1.0, 1.0, m.woodD, 5.4, 0, 8.6, true); for (let i = 0; i < 6; i++) R.product('giftgold', 5.4, 1.0 + i * 0.05, 8.6, i * 0.2, 1.8);
  R.box(2.2, 1.05, 0.8, m.wood, 10.2, 0, 10.6, true); R.box(2.3, 0.05, 0.9, m.granite, 10.2, 1.05, 10.6); R.box(0.35, 0.28, 0.3, m.black, 10.6, 1.1, 10.6);
  R.plane(0.9, 0.3, new THREE.MeshBasicMaterial({ transparent: true, map: labelTex('KASSE', 128, 44, '#7a1f2b', '#f4e8c8', 26) }), 10.2, 1.9, 10.2, Math.PI);
  for (let i = 0; i < 14; i++) { const x = 4.4 + hash(i, 1) * 4.4, z = 3 + hash(i, 2) * 3, y = 2.3 + hash(i, 3) * 1.0; R.box(0.01, 3.7 - y, 0.01, m.black, x, y, z); const b = R.sphere(0.2, new THREE.MeshStandardMaterial({ color: [0x4a8a52, 0xc02a2a, 0xe8b43a, 0xf0e6d0][i % 4], roughness: 0.3, metalness: 0.3 }), x, y - 0.1, z); b.scale.y = 1.2; }
  R.box(11.4, 0.04, 0.04, m.black, 6, 3.7, 3.5); R.box(11.4, 0.04, 0.04, m.black, 6, 3.7, 8.5);
  for (let i = 0; i < 9; i++) { R.box(0.12, 0.1, 0.2, m.black, 1.5 + i * 1.2, 3.62, 3.5); R.box(0.12, 0.1, 0.2, m.black, 1.5 + i * 1.2, 3.62, 8.5); }
  R.stand('gifts', 'gifts', 7.0, 7.9, 2.6, '杏仁糖禮盒桌');
  /* ---- zone B: Café-Salon */
  R.box(7.6, H - 0.2, 0.05, m.burg, 16, 0.1, 0.18); R.box(7.6, 0.08, 0.08, m.white, 16, H - 0.15, 0.2); R.box(7.6, 0.1, 0.08, m.white, 16, 0.1, 0.2);
  const ptex = [0, 1, 2, 3, 4].map(portraitTex); [[13.1, 1.5, 0.7, 0.9], [14.5, 2.1, 0.7, 0.9], [14.5, 1.0, 0.55, 0.7], [16.2, 1.7, 1.25, 1.5], [18.2, 1.7, 1.5, 1.2], [19.2, 1.0, 0.55, 0.7], [19.2, 2.1, 0.7, 0.9]].forEach(([x, y, w, h], i) => R.plane(w, h, new THREE.MeshStandardMaterial({ map: ptex[i % 5], roughness: 0.4 }), x, y + 0.2, 0.22));
  const ch = new THREE.Group(); ch.position.set(16, 2.7, 7); R.g.add(ch); const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 14), m.white); ch.add(ring);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const arm = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 6, 14, Math.PI * 0.9), m.white); arm.rotation.set(Math.PI / 2, 0, 0); arm.rotation.z = a; arm.position.set(Math.cos(a) * 0.3, -0.05, Math.sin(a) * 0.3); ch.add(arm); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.24, 14, 1, true), m.black); sh.material = new THREE.MeshStandardMaterial({ color: 0x15151a, side: THREE.DoubleSide, roughness: 0.7 }); sh.position.set(Math.cos(a) * 1.0, 0.25, Math.sin(a) * 1.0); ch.add(sh); const g2 = new THREE.Mesh(new THREE.CircleGeometry(0.18, 12), m.glow); g2.rotation.x = Math.PI / 2; g2.position.set(Math.cos(a) * 1.0, 0.13, Math.sin(a) * 1.0); ch.add(g2); }
  const big = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.4, 20), new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.6 })); big.position.y = -0.55; ch.add(big); R.light(16, 0, 7, 6);
  [[14, 4.5], [17.5, 3.8], [14.3, 9], [17.8, 8.4]].forEach(([x, z], i) => { R.roundTable(x, z); for (let k = 0; k < 3; k++) { const a = i * 0.9 + k * 2.1; R.chair(x + Math.cos(a) * 0.8, z + Math.sin(a) * 0.8, -a + Math.PI / 2, k % 2 ? m.stripe : m.chairGrey); } R.product('mug', x + 0.1, 0.76, z, 0, 1.2); R.product('cake', x - 0.12, 0.76, z + 0.05, 0, 1.2); });
  R.box(2.2, 1.7, 0.7, m.stripe, 19.1, 0, 1.3, true); R.box(2.0, 0.5, 0.8, m.stripe, 19.0, 0, 2.2); R.cyl(0.3, 0.2, 0.7, m.gold, 12.9, 0, 11.6, 14); R.sphere(0.4, m.green, 12.9, 1.2, 11.6, 10);
  R.stand('cafe', 'cake', 15.6, 6.4, 3.2, '咖啡座');
  // red curtains + windows on south wall are in the shopfront above
  for (const x of [12.6, 19.0]) { const c = R.box(0.5, 2.9, 0.12, new THREE.MeshStandardMaterial({ color: 0xa02a2a, roughness: 0.9 }), x, 0.4, D - 0.4); c.scale.z = 1; }
  /* ---- zone C: cake hall */
  const led = new THREE.MeshBasicMaterial({ color: 0xff3a7a }); R.box(9.6, H - 0.1, 0.05, new THREE.MeshStandardMaterial({ color: 0x7a1f2b, roughness: 0.25, metalness: 0.3 }), 25, 0.05, 0.18); for (let i = 0; i < 22; i++) R.box(0.05, 2.9, 0.03, led, 20.6 + i * 0.42, 0.4, 0.23);
  for (const [x, z] of [[22.5, 3.2], [28.2, 3.2], [22.5, 11.6], [28.2, 11.6]]) { R.box(0.55, H, 0.55, m.cream, x, 0, z, true); R.box(0.8, 0.12, 0.8, m.white, x, H - 0.12, z); R.box(0.7, 0.2, 0.7, m.white, x, 0, z); }
  const cx = 25, cz = 7.2; R.cyl(2.5, 2.5, 1.05, m.wood, cx, 0, cz, 36, true, true); R.cyl(1.9, 1.9, 1.05, m.woodD, cx, 0, cz, 36, false, true); const top = R.mesh(new THREE.RingGeometry(1.9, 2.5, 36), m.woodD, cx, 1.05, cz); top.rotation.x = -Math.PI / 2; R.cyl(2.45, 2.45, 0.55, m.glass, cx, 1.07, cz, 36, false, true);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; R.box(0.08, 0.9, 0.04, m.black, cx + Math.cos(a) * 2.2, 0.06, cz + Math.sin(a) * 2.2).rotation.y = -a + Math.PI / 2; R.product('cake', cx + Math.cos(a) * 2.2, 1.06, cz + Math.sin(a) * 2.2, a, 1.9); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3, q = R.box(0.5, 0.5, 0.04, m.gold, cx + Math.cos(a) * 2.52, 0.4, cz + Math.sin(a) * 2.52); q.rotation.y = -a + Math.PI / 2; }
  R.stand('cake', 'cake', cx, cz + 3.1, 3.0, '蛋糕櫃台');
  for (const [x, z, l] of [[21.2, 12.8, { top: 0x9a2a2a }], [22.4, 12.3, {}]]) void x, z, l;
  R.downlights(10, 5, 1, 1.6, 3.0, 2.6, H - 0.03);
  // lighting pools
  R.light(7, 0, 6, 8); R.light(25, 0, 7, 9); R.light(15, 0, 4.5, 4); R.light(17.8, 0, 8.4, 4);
  /* ---- people */
  const staff = { top: 0xb8302e, bottom: 0x1d2230 };
  R.npc({ ...staff, fem: true, hairStyle: 3 }, 10.2, 11.6, Math.PI);
  R.npc({ ...staff, fem: true, hairStyle: 2 }, 24.0, 7.2, 1.2); R.npc({ ...staff, fem: false, hairStyle: 1 }, 26.1, 7.8, -1.8);
  R.npc({}, 6.2, 8.9, 0.4); R.npc({}, 4.0, 7.3, 2.6); R.npc({}, 8.6, 7.4, -2.2);
  R.npc({}, 23.2, 10.7, -0.7); R.npc({}, 24.2, 10.9, -0.2); R.npc({}, 26.0, 10.6, 0.3);
  R.npc({}, 14.6, 5.2, 0.5); R.npc({}, 17.2, 9.3, -2.6);
  // pets of the café: framed old price sign
  R.plane(1.6, 0.5, new THREE.MeshBasicMaterial({ transparent: true, map: labelTex('Niederegger · seit 1806', 384, 120, '#f4ecd6', '#7a1f2b', 40) }), 3.2, 3.0, 0.2);
}

/* ------------------------------------------------------------ Fangfrisch */
function buildFangfrisch(R) {
  const m = R.m, { W, D, H } = R, dark = new THREE.MeshStandardMaterial({ color: 0x23424f, roughness: 0.7 }), tile = new THREE.MeshStandardMaterial({ color: 0xeaf1f2, roughness: 0.25 }), crate = new THREE.MeshStandardMaterial({ color: 0xc89a5a, roughness: 0.8 });
  for (const o of R.g.children) if (o.material === m.wall) o.material = new THREE.MeshStandardMaterial({ color: 0xf3f1ea, roughness: 0.9 });
  R.box(W, 1.3, 0.1, tile, W / 2, 0, 0.1); R.box(W, 0.06, 0.12, m.woodD, W / 2, 1.3, 0.1);
  const hb = new THREE.MeshBasicMaterial({ map: harborTex() });
  R.plane(34, 8.5, hb, W / 2, 3.0, D + 12, Math.PI);
  for (const [a, b] of [[0.4, 4.2], [5.8, 10.2], [11.4, 15.6]]) { R.box(b - a, 2.4, 0.04, m.glass, (a + b) / 2, 0.6, D - 0.1); for (let x = a; x <= b + 0.01; x += (b - a) / 3) R.box(0.06, 2.5, 0.08, m.woodD, x, 0.55, D - 0.1); R.box(b - a, 0.06, 0.08, m.woodD, (a + b) / 2, 3.0, D - 0.1); R.box(b - a, 0.6, 0.2, tile, (a + b) / 2, 0, D - 0.12); }
  R.box(1.4, 2.5, 0.05, m.glass, 5.0, 0.2, D - 0.1); R.box(1.5, 0.06, 0.08, m.woodD, 5.0, 2.7, D - 0.1);
  R.box(W, 0.8, 0.05, m.wall, W / 2, 3.0, D - 0.1);
  R.plane(1.4, 0.4, new THREE.MeshBasicMaterial({ transparent: true, map: labelTex('出口 EXIT', 256, 72, '#1d6a3c', '#fff', 40, 'Arial, sans-serif') }), 5.0, 2.95, D - 0.2, Math.PI);
  R.exit = { x: R.base.x + 5.0, z: R.base.z + D - 1.0 }; R.spawn = { x: R.base.x + 5.0, z: R.base.z + D - 2.2, yaw: Math.PI };
  // order counter with fryer and chalkboard menu
  R.box(6.4, 1.05, 0.9, m.woodD, 9.6, 0, 2.6, true); R.box(6.6, 0.06, 1.0, m.steel, 9.6, 1.05, 2.6); R.box(1.3, 0.2, 0.7, m.steel, 7.6, 1.11, 2.3); R.box(1.3, 0.04, 0.6, new THREE.MeshStandardMaterial({ color: 0xe8b43a, roughness: 0.2 }), 7.6, 1.28, 2.3);
  R.product('roll', 10.6, 1.12, 2.7, 0, 1.4); R.product('roll', 11.1, 1.12, 2.5, 0.4, 1.4); R.product('roll', 11.6, 1.12, 2.7, -0.2, 1.4); R.box(0.35, 0.28, 0.3, m.black, 9.2, 1.12, 2.8);
  R.plane(3.6, 1.4, new THREE.MeshBasicMaterial({ map: cv(512, 200, (g) => { g.fillStyle = '#1d2a28'; g.fillRect(0, 0, 512, 200); g.strokeStyle = '#8a6a3a'; g.lineWidth = 8; g.strokeRect(4, 4, 504, 192); g.fillStyle = '#f4f1e6'; g.font = '700 34px Georgia, serif'; g.textAlign = 'center'; g.fillText('FANGFRISCH', 256, 44); g.font = '600 24px Georgia, serif'; g.textAlign = 'left'; ['Backfisch-Brötchen', 'Matjes-Brötchen', 'Krabben-Brötchen', 'Fish & Chips', 'Hausbier vom Fass'].forEach((s, i) => g.fillText(s, 36, 82 + i * 26)); g.textAlign = 'right'; ['6,50', '5,50', '7,50', '9,50', '3,60'].forEach((s, i) => g.fillText(s, 480, 82 + i * 26)); }) }), 9.4, 2.2, 0.18);
  // brewing tanks behind glass (left)
  for (const x of [0.9, 2.5, 4.1]) { R.cyl(0.62, 0.62, 2.0, m.steel, x, 0.5, 1.2, 20, true); R.mesh(new THREE.ConeGeometry(0.62, 0.5, 20), m.steel, x, 2.75, 1.2); R.cyl(0.04, 0.04, 2.5, m.copper, x + 0.7, 0.2, 1.8, 8); R.sphere(0.12, m.copper, x + 0.7, 2.75, 1.8, 8); }
  R.cyl(0.05, 0.05, 5.4, m.copper, 2.8, 2.8, 1.8, 8).rotation.z = Math.PI / 2;
  // beer taps bar (right)
  R.box(5.0, 1.1, 0.8, m.woodD, 13.2, 0, 2.6, true); R.box(5.2, 0.06, 0.9, m.woodL, 13.2, 1.1, 2.6); for (let i = 0; i < 5; i++) { R.cyl(0.02, 0.02, 0.25, m.steel, 11.6 + i * 0.4, 1.16, 2.45, 6); R.box(0.04, 0.14, 0.05, m.black, 11.6 + i * 0.4, 1.35, 2.45); R.product('mug', 12.8 + i * 0.38, 1.16, 2.8, 0, 1.2); }
  R.box(5.0, 0.04, 0.04, m.steel, 13.2, 1.3, 2.45); R.plane(2.4, 0.5, new THREE.MeshBasicMaterial({ transparent: true, map: labelTex('HAUSBIER', 320, 70, '#2f1f12', '#e8b43a', 40) }), 13.2, 2.1, 0.18);
  // picnic tables, crates, nets, buoys, string lights
  for (const [x, z] of [[3.0, 6.4], [7.6, 6.6], [12.2, 6.4], [5.4, 9.0]]) { R.box(2.2, 0.06, 0.8, m.woodL, x, 0.76, z, true); for (const s of [-1, 1]) { R.box(2.2, 0.05, 0.3, m.woodL, x, 0.45, z + s * 0.62); R.box(0.06, 0.8, 0.05, m.woodD, x - 0.9, 0, z + s * 0.62); R.box(0.06, 0.8, 0.05, m.woodD, x + 0.9, 0, z + s * 0.62); } R.product('roll', x - 0.4, 0.82, z, 0.3, 1.3); R.product('mug', x + 0.4, 0.82, z + 0.1, 0, 1.4); R.light(x, 0, z, 3.4); }
  for (let i = 0; i < 6; i++) R.box(0.6, 0.35, 0.45, crate, 14.4, i * 0.35, 4.6 + (i % 2) * 0.6, i < 2);
  for (let i = 0; i < 4; i++) R.box(0.55, 0.3, 0.4, crate, 0.7 + i * 0.6, 0, 9.4);
  [[0.35, 2.0, 5.5], [0.35, 2.6, 7.4], [W - 0.35, 2.2, 6.4], [W - 0.35, 2.7, 8.0]].forEach(([x, y, z], i) => R.sphere(0.2, new THREE.MeshStandardMaterial({ color: i % 2 ? 0xc8402e : 0xf0f0f0, roughness: 0.5 }), x, y, z));
  for (let k = 0; k < 3; k++) { const z = 4.6 + k * 2.6; R.box(W - 1, 0.015, 0.015, m.black, W / 2, 3.2, z); for (let i = 0; i < 22; i++) { const bx = 0.6 + i * (W - 1.2) / 21, bb = R.sphere(0.07, m.glow, bx, 3.2 - Math.sin(i / 21 * Math.PI) * 0.0 - 0.1 + Math.abs(Math.sin(i * 1.7)) * 0.04, z, 6); void bb; } }
  R.plane(2.2, 1.4, new THREE.MeshBasicMaterial({ transparent: true, map: labelTex('Lübeck', 256, 160, '#23424f', '#f4f1e6', 56) }), 15.7, 2.0, 7.8, -Math.PI / 2);
  R.stand('fischbar', 'fischbar', 9.6, 4.1, 2.9, '魚堡櫃台'); R.stand('bier', 'bier', 13.2, 4.1, 2.4, '啤酒吧檯');
  R.light(9.6, 0, 3.4, 6); R.light(13.2, 0, 3.6, 4); void dark;
  const apron = { top: 0x23424f, bottom: 0x2b2b30 };
  R.npc({ ...apron, fem: false, hairStyle: 1 }, 9.0, 1.8, Math.PI); R.npc({ ...apron, fem: true, hairStyle: 3 }, 13.0, 1.9, Math.PI); R.npc({ ...apron, fem: false, hairStyle: 5 }, 3.0, 2.4, Math.PI * 0.7);
  R.npc({}, 8.4, 4.1, 0); R.npc({}, 3.6, 7.5, 2.4); R.npc({}, 12.6, 7.4, -2.4); R.npc({}, 7.0, 7.9, -0.8);
}

/* ------------------------------------------------------------ CITTI-PARK */
function buildCitti(R) {
  const m = R.m, { W, D, H } = R;
  const shopMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
  const sky = new THREE.MeshBasicMaterial({ map: skylightTex() }); const sl = R.plane(10, 2.4, sky, W / 2, H - 0.02, D / 2, 0, Math.PI / 2); sl.scale.set(1, 4, 1);
  // entrance (south): glass doors + backdrop
  R.plane(40, 10, new THREE.MeshBasicMaterial({ map: streetTex() }), W / 2, 4, D + 14, Math.PI);
  R.box(W - 2, 3.2, 0.05, m.glass, W / 2, 0.2, D - 0.1); for (let x = 1; x <= W - 1; x += 2.4) R.box(0.07, 3.3, 0.08, m.steel, x, 0.15, D - 0.1); R.box(W, 1.6, 0.05, m.wall, W / 2, H - 1.6, D - 0.1);
  R.plane(5, 0.9, new THREE.MeshBasicMaterial({ transparent: true, map: labelTex('CITTI-PARK', 512, 90, '#2f6ab0', '#fff', 54, 'Arial, sans-serif') }), W / 2, H - 0.8, D - 0.15, Math.PI);
  R.plane(1.4, 0.4, new THREE.MeshBasicMaterial({ transparent: true, map: labelTex('出口 EXIT', 256, 72, '#1d6a3c', '#fff', 40, 'Arial, sans-serif') }), W / 2, 2.9, D - 0.2, Math.PI);
  R.exit = { x: R.base.x + W / 2, z: R.base.z + D - 1.2 }; R.spawn = { x: R.base.x + W / 2, z: R.base.z + D - 2.4, yaw: Math.PI };
  // storefronts along the north wall
  [['MODE', 0xc8402e, 1.2], ['BÜCHER', 0x2f6ab0, 6.4], ['BÄCKEREI', 0xd9a45a, 11.6], ['DROGERIE', 0x5f9b86, 16.8]].forEach(([nm, c, x]) => { R.box(4.6, 3.6, 0.3, shopMat(0xf1eee6), x + 2.3, 0, 0.5); R.box(4.6, 0.8, 0.34, shopMat(c), x + 2.3, 3.0, 0.5); R.plane(3.6, 0.6, new THREE.MeshBasicMaterial({ transparent: true, map: labelTex(nm, 256, 44, null, '#fff', 34, 'Arial, sans-serif') }), x + 2.3, 3.4, 0.68); R.box(3.4, 2.2, 0.04, m.glass, x + 2.3, 0.4, 0.7); R.box(3.4, 0.05, 0.4, m.steel, x + 2.3, 0.9, 0.86); R.light(x + 2.3, 0, 2.2, 4.2); for (let k = 0; k < 6; k++) R.product(['jar', 'giftblue', 'fruit', 'loaf', 'cake', 'giftgold'][k], x + 1.0 + k * 0.45, 0.95, 0.86, k, 1.5); });
  // bakery stall (stand)
  R.box(3.2, 1.1, 1.0, m.wood, 13.9, 0, 3.6, true); R.box(3.4, 0.06, 1.1, m.white, 13.9, 1.1, 3.6); for (let k = 0; k < 8; k++) R.product(['loaf', 'cake', 'roll', 'loaf'][k % 4], 12.8 + k * 0.3, 1.16, 3.6, k, 1.6); R.stand('baeckerei', 'baeckerei', 13.9, 5.2, 2.6, '麵包店');
  // market produce stall + supermarket shelves
  R.box(4.0, 0.8, 1.4, m.woodL, 22.4, 0, 3.4, true); for (let a = 0; a < 6; a++) for (let b = 0; b < 4; b++) for (let k = 0; k < 2; k++) R.product('fruit', 20.8 + a * 0.58, 0.82 + k * 0.08, 2.9 + b * 0.35, 0, 1.6); R.stand('markt', 'markt', 22.4, 5.2, 3.0, '蔬果與超市');
  for (let r = 0; r < 4; r++) { const z = 6.8 + r * 1.9; R.box(5.6, 2.0, 0.6, m.iron, 22.2, 0, z, true); for (let s = 0; s < 4; s++) for (let k = 0; k < 14; k++) R.product(['jar', 'giftblue', 'loaf', 'giftgold', 'jar'][(k + s + r) % 5], 19.6 + k * 0.4, 0.3 + s * 0.45, z - 0.2 + (k % 2) * 0.4, hash(k, s) * 0.4, 1.2); }
  // central planters, benches, a big cafe table zone and trolleys
  for (const [x, z] of [[8, 8.5], [12.6, 8.5]]) { R.cyl(1.0, 1.1, 0.5, m.cream, x, 0, z, 20, true); R.sphere(0.9, m.green, x, 1.2, z, 12); R.sphere(0.6, m.green, x + 0.5, 1.7, z + 0.2, 10); }
  for (const x of [3, 6.4, 10.4, 14.2]) { R.box(1.8, 0.06, 0.5, m.woodL, x, 0.45, 11.6, true); R.box(1.8, 0.4, 0.06, m.woodL, x, 0.65, 11.84); R.box(0.06, 0.45, 0.4, m.iron, x - 0.8, 0, 11.6); R.box(0.06, 0.45, 0.4, m.iron, x + 0.8, 0, 11.6); }
  for (const [x, z] of [[4, 8], [5.4, 8.6], [16.4, 8.2], [17.6, 8.9]]) { R.roundTable(x, z); R.chair(x + 0.7, z, -Math.PI / 2, m.stripe); R.chair(x - 0.7, z, Math.PI / 2, m.stripe); R.product('mug', x, 0.76, z, 0, 1.2); }
  R.stand('cafe', 'cake', 4.7, 6.9, 2.4, '咖啡座');
  for (const [x, z] of [[17.8, 11], [18.4, 11.3]]) { const t = R.box(0.5, 0.05, 0.9, m.steel, x, 0.45, z); void t; R.box(0.5, 0.35, 0.04, m.steel, x, 0.5, z - 0.45); }
  R.downlights(8, 5, 2, 2, 3.0, 3.0, H - 0.06); R.light(8, 0, 10, 8); R.light(16, 0, 10, 8); R.light(22, 0, 8, 8);
  const sf = { top: 0x2f6ab0, bottom: 0x1d2230 };
  R.npc({ ...sf, fem: true, hairStyle: 3 }, 13.9, 2.7, Math.PI); R.npc({ ...sf, fem: false, hairStyle: 1 }, 22.4, 2.2, Math.PI);
  for (const [x, z, y] of [[9, 9.6, 0], [10.4, 10.5, 2], [16, 6, 3.5], [18, 5, 1], [5, 4, 0], [8, 5.6, 4], [12, 6.5, 2.6], [20, 10, 5.2], [3, 10, 1.2], [24, 9.5, 4]]) R.npc({}, x, z, y);
}

/* ------------------------------------------------------------ manager */
const DEFS = { niederegger: { W: 30, D: 14, H: 3.8, floor: 'floor', build: buildNiederegger }, fangfrisch: { W: 16, D: 10, H: 3.4, floor: 'floorDark', build: buildFangfrisch }, citti: { W: 26, D: 16, H: 5, floor: 'floorMall', build: buildCitti } };
export class Shops {
  constructor(scene, { toast }) {
    this.scene = scene; this.toast = toast; this.rooms = {}; this.cur = null; this.t = 0; this.box = document.querySelector('#shopbuy');
    let st = { wallet: 100, bag: {} }; try { const v = JSON.parse(localStorage.getItem('lub-bag') || 'null'); if (v && typeof v.wallet === 'number') st = v; } catch { /* storage blocked */ }
    this.st = st; this.nearStand = null; this.nearExit = false; this.initUI();
  }
  get inside() { return this.cur?.id || null; }
  build(id) {
    if (this.rooms[id]) return this.rooms[id];
    const d = DEFS[id], idx = SHOPS.findIndex((s) => s.id === id), M = mats();
    const R = new Room({ x: 30000, z: 30000 + idx * 300 }, d.W, d.D, d.H, M[d.floor]); R.id = id; d.build(R); R.ambient = new THREE.AmbientLight(0xffe2bc, 0.95); R.ambient.visible = false; R.g.add(R.ambient);
    this.scene.add(R.g); this.rooms[id] = R; return R;
  }
  enter(id) { const R = this.build(id); this.env0 = this.scene.environmentIntensity; this.scene.environmentIntensity = 0.35; if (this.cur) this.cur.g.visible = false; R.g.visible = true; R.ambient.visible = true; this.cur = R; this.updateWallet(); return R.spawn; }
  leave() { if (!this.cur) return; if (this.env0 !== undefined) this.scene.environmentIntensity = this.env0; this.cur.g.visible = false; this.cur.ambient.visible = false; this.cur = null; this.nearStand = null; this.nearExit = false; this.closeBuy(); }
  collide(nx, nz, r) { const R = this.cur, [x, z] = this.colLocal(R, nx - R.base.x, nz - R.base.z, r); return [R.base.x + x, R.base.z + z]; }
  colLocal(R, x, z, r) {
    x = Math.max(0.35, Math.min(R.W - 0.35, x)); z = Math.max(0.35, Math.min(R.D - 0.45, z));
    for (const c of R.cols) {
      if (c.h < 0.2) continue;
      if (c.r !== undefined) { const dx = x - c.cx, dz = z - c.cz, d = Math.hypot(dx, dz), m = c.r + r; if (d < m) { const k = m / (d || 1e-3); x = c.cx + (dx || 0.001) * k; z = c.cz + dz * k; } }
      else { const x0 = c.x0 - r, x1 = c.x1 + r, z0 = c.z0 - r, z1 = c.z1 + r; if (x > x0 && x < x1 && z > z0 && z < z1) { const p = [x - x0, x1 - x, z - z0, z1 - z], i = p.indexOf(Math.min(...p)); if (i === 0) x = x0; else if (i === 1) x = x1; else if (i === 2) z = z0; else z = z1; } }
    }
    return [x, z];
  }
  camBlocked(wx, y, wz) {
    const R = this.cur; if (!R) return false; const x = wx - R.base.x, z = wz - R.base.z;
    if (y < 0.25 || y > R.H - 0.2 || x < 0.3 || x > R.W - 0.3 || z < 0.3 || z > R.D - 0.3) return true;
    for (const c of R.cols) { if (y > c.h) continue; if (c.r !== undefined) { if (Math.hypot(x - c.cx, z - c.cz) < c.r) return true; } else if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return true; }
    return false;
  }
  update(dt, P) {
    const R = this.cur; if (!R) return; this.t += dt;
    this.stepNpcs(R, dt, P);
    let best = null, bd = 1e9; for (const s of R.stands) { const d = Math.hypot(P.x - s.x, P.z - s.z); if (d < s.r && d < bd) { bd = d; best = s; } }
    this.nearStand = best; this.nearExit = Math.hypot(P.x - R.exit.x, P.z - R.exit.z) < 2.2;
    if (this.box && !this.box.hidden && this.nearStand !== this.openStand) this.closeBuy();
  }
  say(h, text) {
    const n = h.n; if (!n.bubble) { const c = document.createElement('canvas'); c.width = 384; c.height = 96; n.bctx = c.getContext('2d'); n.btex = new THREE.CanvasTexture(c); n.btex.colorSpace = THREE.SRGBColorSpace; n.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: n.btex, transparent: true, depthTest: false, fog: false })); n.bubble.scale.set(1.9, 0.48, 1); n.bubble.position.y = 2.25; n.bubble.renderOrder = 10; h.root.add(n.bubble); }
    const g = n.bctx; g.clearRect(0, 0, 384, 96); g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.roundRect(4, 4, 376, 70, 22); g.fill(); g.beginPath(); g.moveTo(180, 72); g.lineTo(192, 92); g.lineTo(204, 72); g.fill(); g.fillStyle = '#2a2a30'; g.font = '700 34px "Noto Sans TC", "PingFang TC", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 192, 40); n.btex.needsUpdate = true; n.bubble.visible = true; n.bubbleT = 3.2; n.waveT = 3.2;
  }
  stepNpcs(R, dt, P) {
    const px = P.x - R.base.x, pz = P.z - R.base.z, GREET = ['Willkommen! 歡迎光臨', 'Guten Tag! 您好', 'Moin! 需要幫忙嗎？'];
    for (const h of R.npcs) {
      const n = h.n, dp = Math.hypot(px - n.x, pz - n.z); let speed = 0, want = null;
      if (n.bubble && n.bubbleT > 0) { n.bubbleT -= dt; if (n.bubbleT <= 0) n.bubble.visible = false; }
      if (n.waveT > 0) n.waveT -= dt;
      if (n.staff) {
        if (dp < 4.5) { want = Math.atan2(px - n.x, pz - n.z); if (this.t - n.greetT > 22) { n.greetT = this.t; this.say(h, GREET[Math.floor(Math.random() * GREET.length)]); } }
        else { want = n.hy; }
      } else {
        if (n.tx === null) { n.wait -= dt; if (n.wait <= 0) { for (let k = 0; k < 12; k++) { const tx = 1.2 + Math.random() * (R.W - 2.4), tz = 1.6 + Math.random() * (R.D - 3.6); if (this.colLocal(R, tx, tz, 0.45).every((v, i) => Math.abs(v - [tx, tz][i]) < 0.01)) { n.tx = tx; n.tz = tz; break; } } n.wait = 2 + Math.random() * 6; } }
        else { const dx = n.tx - n.x, dz = n.tz - n.z, d = Math.hypot(dx, dz); if (d < 0.35) { n.tx = null; } else { want = Math.atan2(dx, dz); speed = dp < 1.1 ? 0 : 1.15; if (n.stuck > 2) { n.tx = null; n.stuck = 0; } } }
        if (dp < 2.2 && speed === 0 && want === null) want = Math.atan2(px - n.x, pz - n.z);   // glance at the visitor
      }
      if (want !== null) { let d = want - n.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); n.yaw += d * (1 - Math.exp(-dt * 6)); }
      if (speed > 0) { const nx = n.x + Math.sin(n.yaw) * speed * dt, nz = n.z + Math.cos(n.yaw) * speed * dt, [cx, cz] = this.colLocal(R, nx, nz, 0.3); if (Math.hypot(cx - nx, cz - nz) > 0.02) n.stuck = (n.stuck || 0) + dt; n.x = cx; n.z = cz; }
      h.root.position.set(n.x, 0, n.z); h.root.rotation.y = n.yaw; updateLocomotion(h, speed, dt);
      if (n.waveT > 0 && h.bones.RightArm) { const k = Math.min(1, n.waveT / 0.4); h.bones.RightArm.rotation.z = -2.5 * k; h.bones.RightForeArm.rotation.z = -0.4 + Math.sin(this.t * 9) * 0.45 * k; }
    }
  }
  /* ---- buying */
  initUI() {
    const el = this.box; if (!el) return;
    for (const ev of ['pointerdown', 'touchstart', 'wheel', 'click']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    el.querySelector('.x').addEventListener('click', () => this.closeBuy());
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el.hidden) { this.closeBuy(); e.stopPropagation(); } });
    el.querySelector('.items').addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) this.buy(b.dataset.cat, b.dataset.id); });
    el.querySelector('.reset').addEventListener('click', () => { this.st = { wallet: 100, bag: {} }; this.save(); this.updateWallet(); this.renderBag(); this.toast('錢包已重設為 €100，購物袋已清空'); });
  }
  save() { try { localStorage.setItem('lub-bag', JSON.stringify(this.st)); } catch { /* */ } }
  updateWallet() { const w = document.querySelector('#wallet'); if (w) { w.textContent = `€${this.st.wallet.toFixed(2)}`; w.parentElement.hidden = !this.cur; } }
  openBuy(stand) {
    const el = this.box; if (!el) return; this.openStand = stand; const cat = CATALOG[stand.cat];
    el.querySelector('h3').textContent = cat.zh; const list = el.querySelector('.items'); list.textContent = '';
    for (const it of cat.items) { const row = document.createElement('div'); row.className = 'row'; const n = document.createElement('span'); n.textContent = it.zh; const p = document.createElement('b'); p.textContent = `€${it.price.toFixed(2)}`; const b = document.createElement('button'); b.type = 'button'; b.dataset.id = it.id; b.dataset.cat = stand.cat; b.textContent = '購買'; row.append(n, p, b); list.append(row); }
    this.renderBag(); el.hidden = false; requestAnimationFrame(() => el.classList.add('on'));
  }
  closeBuy() { const el = this.box; if (!el || el.hidden) return; this.openStand = null; el.classList.remove('on'); setTimeout(() => { if (!this.openStand) el.hidden = true; }, 200); document.querySelector('#world')?.focus({ preventScroll: true }); }
  buy(cat, id) {
    const it = CATALOG[cat].items.find((x) => x.id === id); if (!it) return;
    if (this.st.wallet + 1e-9 < it.price) { this.toast('錢包不夠了（這是遊戲裡的虛擬錢包，可以按「重設」再補滿）'); return; }
    this.st.wallet = Math.round((this.st.wallet - it.price) * 100) / 100; this.st.bag[it.zh] = (this.st.bag[it.zh] || 0) + 1; this.save(); this.updateWallet(); this.renderBag();
    const food = ['torte', 'sahne', 'kaffee', 'kakao', 'tee', 'backfisch', 'matjes', 'fishchips', 'krabben', 'helles', 'pils', 'dunkel', 'radler', 'brezel', 'broetchen', 'franz', 'kuchen'].includes(id);
    this.toast(food ? `${it.zh}　已送上，慢慢享用 ✓` : `${it.zh}　已放進購物袋 ✓`);
  }
  renderBag() { const el = this.box?.querySelector('.bag'); if (!el) return; const e = Object.entries(this.st.bag); el.textContent = e.length ? '購物袋：' + e.map(([k, n]) => `${k} ×${n}`).join('、') : '購物袋是空的'; const w = this.box.querySelector('.wal'); if (w) w.textContent = `錢包 €${this.st.wallet.toFixed(2)}（虛擬，不會真的扣款）`; }
}
