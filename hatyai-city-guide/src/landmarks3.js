import * as THREE from 'three';
import { mulberry32, canvasTex, signTex, pca } from './util.js';
import { GlowSet } from './props.js';
import { ribbon, ribGeo, groundY, DATA } from './world.js';
import { FOOTPRINTS } from './facade.js';

// =====================================================================
//  Built from the user's reference photos:
//  Lee Gardens Night Market street (gate, white tents w/ clear plastic, clothes racks,
//  mannequins, steel tables + stools down the middle, bunting & festoon lights, light tree),
//  South Thai Bird's Nest building, SCB Hat Yai branch, New Kimyong Market façade,
//  red/white kerbs, blue-striped fruit umbrellas.
// =====================================================================
const C = (h) => new THREE.Color(h);
const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, o));
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), V = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1);
function inst(geo, mat, list, parent, colored) {
  if (!list.length) return null; const im = new THREE.InstancedMesh(geo, mat, list.length); const c = new THREE.Color();
  list.forEach((p, i) => { Q.setFromAxisAngle(UP, p.r || 0); M4.compose(V.set(p.x, p.y, p.z), Q, p.s ? new THREE.Vector3(p.s[0], p.s[1], p.s[2]) : S1); im.setMatrixAt(i, M4); if (colored) { c.set(p.c); im.setColorAt(i, c); } });
  im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; parent.add(im); return im;
}

export function buildLandmarks3(ctx) {
  const { scene } = ctx; const rnd = mulberry32(31415);
  const glow = new GlowSet('lamp', 70); ctx.glowSets.push(glow);
  const night = new THREE.Group(); scene.add(night);
  const sign = (tex, k = 1) => { const m = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.6 }); m.userData.k = k; ctx.signMats.push(m); return m; };
  const plane = (mat, w, h, x, y, z, ry, parent = scene) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.position.set(x, y, z); p.rotation.y = ry; parent.add(p); return p; };

  // ============== LEE GARDENS NIGHT MARKET (Sanehanusorn Rd beside the hotel) ==============
  if (ctx.along) {
    const A = ctx.along, SL = ctx.streetLen, HW = 6.25;
    const s0 = SL - 34, s1 = SL - 190;            // market runs north from the McDonald's corner
    // --- entrance gate (photo: purple/pink banner, tropical flowers) ---
    {
      const P = A(s0 + 2, 0), yaw = P.yaw;
      const gTex = canvasTex(1024, 256, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#dff2ff'); gr.addColorStop(1, '#bfe6b0'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = '#6a2a8a'; g.beginPath(); g.moveTo(170, 40); g.lineTo(880, 40); g.lineTo(900, 128); g.lineTo(150, 128); g.closePath(); g.fill();
        g.fillStyle = '#f6eede'; g.font = 'bold 66px Georgia,serif'; g.textAlign = 'center'; g.fillText('Lee Gardens Night Market', w / 2, 108);
        g.fillStyle = '#d02a6a'; g.fillRect(270, 140, 480, 80); g.fillStyle = '#fff'; g.font = 'bold 60px "Noto Sans TC",serif'; g.fillText('鑫園夜市', w / 2, 200);
        const flower = (x, y, r, col) => { g.fillStyle = col; for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; g.beginPath(); g.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.9, r * 0.55, a, 0, 7); g.fill(); } g.fillStyle = '#f6c42a'; g.beginPath(); g.arc(x, y, r * 0.4, 0, 7); g.fill(); };
        flower(120, 150, 26, '#fff4e0'); flower(170, 200, 20, '#d8283a'); flower(860, 170, 24, '#fff4e0'); flower(930, 120, 20, '#f2a0c0'); flower(780, 215, 18, '#d8283a');
        g.fillStyle = '#2a7ad0'; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(60 + k * 14, 200 - k * 8, 30, 10, -0.6, 0, 7); g.fill(); g.beginPath(); g.ellipse(960 - k * 14, 200 - k * 8, 30, 10, 0.6, 0, 7); g.fill(); }
        g.strokeStyle = '#2a8a3a'; g.lineWidth = 5; for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(20, 30); g.lineTo(20 + Math.cos(-0.3 + k * 0.25) * 90, 30 + Math.sin(-0.3 + k * 0.25) * 60); g.stroke(); }
      }, { clamp: true });
      const pTex = canvasTex(128, 512, (g, w, h) => { g.fillStyle = '#e8f2fa'; g.fillRect(0, 0, w, h); const cols = ['#2a6ad0', '#3aa0e8', '#f2a0c0', '#2a8a3a', '#f6c42a']; for (let k = 0; k < 14; k++) { g.fillStyle = cols[k % 5]; g.beginPath(); g.ellipse(30 + (k * 37) % 70, 20 + k * 36, 22, 14, k, 0, 7); g.fill(); } }, { clamp: true });
      const G = new THREE.Group(); G.position.set(P.x, 0, P.z); G.rotation.y = yaw; scene.add(G);
      const bm = sign(gTex, 0.9), pm = new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.7 });
      for (const sx of [-HW - 0.3, HW + 0.3]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, 5.6, 0.7), pm); post.position.set(sx, 2.8, 0); post.castShadow = true; G.add(post); }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(2 * HW + 1.4, 2.2, 0.35), std(0xeaf2f8)); beam.position.set(0, 6.4, 0); beam.castShadow = true; G.add(beam);
      for (const s of [1, -1]) { const p = plane(bm, 2 * HW + 1.3, 2.1, 0, 6.4, 0.19 * s, s > 0 ? 0 : Math.PI, G); }
      // high-mast flood light beside the gate (as in the photo)
      const fl = new THREE.Vector3(); G.localToWorld(fl.set(HW + 3.5, 0, -3)); const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 11, 10), std(0xb8bcc0, { metalness: 0.7 })); mast.position.set(fl.x, 5.5, fl.z); scene.add(mast);
      glow.add(fl.x, 11.2, fl.z, 40, C('#f2f6ff'));
    }
    // --- tents both sides, tables + stools down the middle ---
    const tents = [], plastic = [], posts = [], rails = [], cloth = [], manq = [], tables = [], stoolsS = [], stoolsP = [], socks = [], food = { pork: [], tray: [], cup: [], menu: [], prawn: [], plate: [], fruit: [] };
    const kinds = ['clothes', 'clothes', 'clothes', 'socks', 'pork', 'smoothie', 'seafood', 'clothes', 'fruit', 'clothes'];
    const clothCols = ['#f2f2ee', '#f2c8d8', '#2a2a30', '#c8a0d8', '#e8e0c8', '#7a2a3a', '#a8c8e8', '#f2b0a0', '#3a3a3a', '#e8a0b8'];
    for (const side of [-1, 1]) for (let s = s0 - 4; s > s1; s -= 3.4) {
      const off = side * (HW - 1.7), P = A(s, off), yaw = P.yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2);   // tents face the aisle
      const fx = -Math.sin(yaw + Math.PI / 2) * 0, cs = Math.cos(yaw), sn = Math.sin(yaw);
      const at = (a, b, y) => ({ x: P.x + cs * a + sn * b, y, z: P.z - sn * a + cs * b });   // a = across tent width, b = depth (+ toward aisle)
      tents.push({ x: P.x, y: 3.05, z: P.z, r: yaw + Math.PI / 4 });
      for (const [a, b] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) posts.push({ ...at(a, b, 1.25), r: yaw });
      plastic.push({ ...at(0, -1.5, 1.4), r: yaw });
      const k = kinds[Math.floor(rnd() * kinds.length)];
      if (k === 'clothes') { rails.push({ ...at(0, -0.6, 1.95), r: yaw }); for (let j = 0; j < 12; j++) cloth.push({ ...at(-1.3 + j * 0.23, -0.6, 1.45), r: yaw + Math.PI / 2, c: clothCols[Math.floor(rnd() * clothCols.length)] });
        if (rnd() < 0.6) manq.push({ ...at(1.2 * (rnd() < 0.5 ? 1 : -1), 1.1, 0), r: yaw }); }
      else if (k === 'socks') { socks.push({ ...at(0, -1.2, 1.25), r: yaw }); }
      else if (k === 'pork') { tables.push({ ...at(0, 0.8, 0.85), r: yaw, kind: 'counter' }); for (let j = 0; j < 4; j++) food.pork.push({ ...at(-0.9 + j * 0.55, 0.8, 1.02), r: yaw + (j % 2) * 0.4, c: j % 2 ? '#c46a24' : '#b05a1c' }); food.tray.push({ ...at(0, 0.8, 0.94), r: yaw }); }
      else if (k === 'smoothie') { tables.push({ ...at(0, 0.8, 0.85), r: yaw, kind: 'counter' }); food.menu.push({ ...at(0, 0.2, 2.35), r: yaw }); for (let j = 0; j < 9; j++) food.cup.push({ ...at(-1.2 + j * 0.3, 0.6 + (j % 2) * 0.25, 1.2), r: 0, c: ['#e8402a', '#f2a21c', '#8ac83a', '#c83a8a', '#f2d21c', '#f28a1c'][j % 6] }); for (let j = 0; j < 12; j++) food.fruit.push({ ...at(-1.2 + (j % 6) * 0.45, 1.25 + Math.floor(j / 6) * 0.2, 1.0), r: 0, c: ['#8ac83a', '#6a2a4a', '#3a6a2a', '#f28a1c'][Math.floor(j / 3) % 4] }); }
      else if (k === 'seafood') { tables.push({ ...at(0, 0.8, 0.85), r: yaw, kind: 'counter' }); for (let j = 0; j < 6; j++) { food.plate.push({ ...at(-1.1 + (j % 3) * 1.1, 0.5 + Math.floor(j / 3) * 0.6, 0.96), r: yaw }); for (let q = 0; q < 3; q++) food.prawn.push({ ...at(-1.25 + (j % 3) * 1.1 + q * 0.15, 0.5 + Math.floor(j / 3) * 0.6, 1.04), r: yaw + Math.PI / 2, c: q % 2 ? '#f2762a' : '#e8601c' }); } }
      else { tables.push({ ...at(0, 0.8, 0.85), r: yaw, kind: 'counter' }); for (let j = 0; j < 20; j++) food.fruit.push({ ...at(-1.2 + (j % 10) * 0.26, 0.6 + Math.floor(j / 10) * 0.25, 1.0), r: 0, c: ['#f28a1c', '#d8281e', '#8ac83a', '#f2d21c'][Math.floor(j / 5) % 4] }); }
      glow.add(at(0, 0, 2.55).x, 2.55, V.set(0, 0, 0).z + at(0, 0, 2.55).z, 3.2, C('#fff3dc'));
      if (rnd() < 0.8) { const v = at(0, -0.9, 0.12); ctx.people.add(v.x, 0.12, v.z, 1); }
    }
    // dining tables down the centre (stainless tables, steel & white plastic stools, people eating)
    for (let s = s0 - 6; s > s1 + 4; s -= 2.6) {
      if (rnd() < 0.2) continue; const P = A(s, (rnd() - 0.5) * 0.6);
      tables.push({ x: P.x, y: 0.75, z: P.z, r: P.yaw, kind: 'table' });
      for (const [a, b] of [[-0.55, -0.6], [0.55, -0.6], [-0.55, 0.6], [0.55, 0.6]]) {
        const cs = Math.cos(P.yaw), sn = Math.sin(P.yaw), x = P.x + cs * b + sn * a, z = P.z - sn * b + cs * a;
        (rnd() < 0.5 ? stoolsS : stoolsP).push({ x, y: 0.25, z, r: 0 });
        if (rnd() < 0.6) { const i = ctx.people.add(x, 0.1 - 0.42, z, 1, undefined, 0.08, 1.6, 1); if (i >= 0) ctx.people.items[i].rot = P.yaw + Math.PI / 2 + (b < 0 ? 0 : Math.PI); }
      }
    }
    for (let i = 0; i < 160; i++) { const P = A(s1 + rnd() * (s0 - s1), (rnd() - 0.5) * 4.5); ctx.people.add(P.x, 0.12, P.z, 1, undefined, 0.6, 4.4); }
    const tentGeo = new THREE.ConeGeometry(2.25, 1.1, 4, 1, false); const tentMat = std(0xf6f6f2, { roughness: 0.7, emissive: 0xfff0d8, emissiveIntensity: 0.0, side: THREE.DoubleSide }); ctx.nightMats.push({ mat: tentMat, base: 0, k: 0.35 });
    inst(tentGeo, tentMat, tents, night);
    inst(new THREE.BoxGeometry(3.0, 0.08, 3.0).translate(0, -0.55, 0), std(0xf6f6f2), tents.map(t => ({ ...t, y: t.y })), night);
    inst(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6), std(0xdadada, { metalness: 0.7 }), posts, night);
    inst(new THREE.PlaneGeometry(3.0, 2.6), new THREE.MeshPhysicalMaterial({ color: 0xeef4f6, transparent: true, opacity: 0.32, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false }), plastic, night);
    inst(new THREE.CylinderGeometry(0.025, 0.025, 2.9, 6).rotateZ(Math.PI / 2), std(0x9aa0a6, { metalness: 0.8 }), rails, night);
    inst(new THREE.BoxGeometry(0.04, 0.85, 0.42), std(0xffffff, { roughness: 0.9 }), cloth, night, true);
    { const mq = new THREE.Group(); const body = new THREE.CapsuleGeometry(0.18, 0.75, 4, 10); body.translate(0, 1.0, 0); const neck = new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8); neck.translate(0, 1.55, 0); const leg = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6); leg.translate(0, 0.3, 0);
      inst(body, std(0xf6f6f4, { roughness: 0.35 }), manq, night); inst(neck, std(0xf6f6f4), manq, night); inst(leg, std(0x888888, { metalness: 0.7 }), manq, night); }
    { const sockTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#e8e8e4'; g.fillRect(0, 0, w, h); const cols = ['#2a4a8a', '#f2f2ee', '#d8283a', '#3a3a3a', '#f2c42a', '#8a3ac8', '#3ab06a']; for (let y = 6; y < h; y += 24) for (let x = 4; x < w; x += 12) { g.fillStyle = cols[(x + y) % 7]; g.fillRect(x, y, 8, 18); } g.strokeStyle = '#555'; for (let k = 0; k < w; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, h); g.stroke(); } });
      inst(new THREE.BoxGeometry(2.8, 2.0, 0.06), new THREE.MeshStandardMaterial({ map: sockTex, roughness: 0.8 }), socks, night); }
    inst(new THREE.BoxGeometry(1.25, 0.05, 0.75), std(0xd0d4d8, { metalness: 0.85, roughness: 0.25 }), tables.filter(t => t.kind === 'table'), night);
    inst(new THREE.BoxGeometry(1.15, 0.72, 0.65).translate(0, -0.38, 0), new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.8, roughness: 0.35, transparent: true, opacity: 0.45 }), tables.filter(t => t.kind === 'table'), night);
    inst(new THREE.BoxGeometry(2.9, 0.9, 0.8).translate(0, -0.4, 0), std(0xc0c4c8, { metalness: 0.8, roughness: 0.3 }), tables.filter(t => t.kind === 'counter'), night);
    inst(new THREE.CylinderGeometry(0.19, 0.17, 0.5, 12), std(0xc8ccd0, { metalness: 0.85, roughness: 0.25 }), stoolsS, night);
    inst(new THREE.CylinderGeometry(0.2, 0.24, 0.5, 4), std(0xf2f2ee, { roughness: 0.5 }), stoolsP, night);
    inst(new THREE.CapsuleGeometry(0.16, 0.55, 4, 10).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 0.75, color: 0xffffff }), food.pork, night, true);
    inst(new THREE.BoxGeometry(2.4, 0.04, 0.7), std(0xc8ccd0, { metalness: 0.9, roughness: 0.2 }), food.tray, night);
    inst(new THREE.CylinderGeometry(0.06, 0.045, 0.2, 10), new THREE.MeshStandardMaterial({ roughness: 0.3, color: 0xffffff }), food.cup, night, true);
    { const mt = canvasTex(512, 96, (g, w, h) => { const cols = ['#f2f0e6', '#f8c8d8', '#fbe8a0', '#e0f0a8', '#e8c8f0', '#c8f0b8', '#fde0b0', '#d8f0c8']; cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * 64, 0, 64, h); g.fillStyle = ['#d8281e', '#f2a21c', '#8ac83a', '#a03ac8', '#8ac83a', '#f28a1c', '#3a8a3a', '#d8281e'][i]; g.beginPath(); g.roundRect ? g.roundRect(i * 64 + 18, 14, 28, 46, 6) : g.rect(i * 64 + 18, 14, 28, 46); g.fill(); g.fillStyle = '#222'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText('60.-', i * 64 + 32, 84); }); }, { clamp: true });
      inst(new THREE.PlaneGeometry(2.9, 0.6), sign(mt, 1.0), food.menu, night); }
    inst(new THREE.CapsuleGeometry(0.05, 0.16, 4, 8).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 0.4, color: 0xffffff }), food.prawn, night, true);
    inst(new THREE.BoxGeometry(0.75, 0.04, 0.42), std(0xf6f2ea), food.plate, night);
    inst(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.45, color: 0xffffff }), food.fruit, night, true);
    // festoon lights + triangle bunting zig-zagging across the street
    const flags = [], fc = ['#f2f2ea', '#e8d8a8', '#d8c8a0', '#f2e2c8'];
    for (let s = s0; s > s1; s -= 9) { const a = A(s, -HW - 1), b = A(s - 4.5, HW + 1);
      for (let k = 0; k <= 14; k++) { const t = k / 14, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, y = 6.6 - Math.sin(t * Math.PI) * 0.9; glow.add(x, y, z, 2.2, C('#ffe2a8')); if (k % 2) flags.push({ x, y: y - 0.35, z, r: Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2, c: fc[k % 4] }); } }
    { const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.25, 0.25, 0, 0.25, 0.25, 0, 0, -0.3, 0], 3)); tri.computeVertexNormals(); inst(tri, new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.8 }), flags, night, true); }
    // starburst "light trees" (photo of the walking street)
    for (const s of [s0 - 40, s0 - 100]) { const P = A(s, HW + 0.4); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5, 8), std(0x6a6a6a, { metalness: 0.6 })); pole.position.set(P.x, 2.5, P.z); night.add(pole);
      for (let k = 0; k < 26; k++) { const a = rnd() * 6.283, e = 0.2 + rnd() * 1.2, L = 1.4 + rnd() * 1.6, d = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, L, 4), std(0xc8a050, { metalness: 0.8 })); rod.position.set(P.x + d.x * L / 2, 5 + d.y * L / 2, P.z + d.z * L / 2); rod.quaternion.setFromUnitVectors(UP, d); night.add(rod);
        glow.add(P.x + d.x * L, 5 + d.y * L, P.z + d.z * L, 2.6, C('#ffd890')); } }
    ctx.leeNightStreet = { s0, s1 };
  }

  // ============== SOUTH THAI BIRD'S NEST building (across from the McDonald's corner) ==============
  {
    const x = -55.3, z = 29.1, G = new THREE.Group(); G.position.set(x, 0, z); G.rotation.y = Math.atan2(0.99, -0.14) - Math.PI / 2 + Math.PI; scene.add(G);   // front (+z local) faces east, onto the street
    const tile = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#6a3424'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 6) for (let x2 = 0; x2 < w; x2 += 6) { const v = Math.random() * 26 - 13; g.fillStyle = `rgb(${106 + v},${54 + v * 0.6},${38 + v * 0.4})`; g.fillRect(x2, y, 5, 5); } }); tile.repeat.set(3, 6);
    const tileM = new THREE.MeshStandardMaterial({ map: tile, roughness: 0.45, metalness: 0.1 });
    const box = (w, h, d, px, py, pz, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(px, py, pz); o.castShadow = o.receiveShadow = true; G.add(o); return o; };
    const cream = std(0xe8e2d6, { roughness: 0.7 }), salmon = std(0xd89a84, { roughness: 0.7 });
    box(5.2, 19, 4.5, -3.4, 9.5, 0.5, tileM);                              // brown tiled tower with the vertical name
    box(5.8, 1.0, 5.0, -3.4, 19.4, 0.5, cream); box(0.6, 19, 4.6, -6.2, 9.5, 0.5, cream);
    for (let f = 0; f < 4; f++) { box(5.2, 0.5, 1.6, 2.2, 5.2 + f * 3.4, 2.4, salmon); box(5.0, 2.4, 0.2, 2.2, 6.5 + f * 3.4, 1.5, std(0x2a3036, { metalness: 0.5, roughness: 0.2 })); }
    box(6.2, 17, 4.0, 2.4, 8.5, -0.6, cream);
    const nm = canvasTex(160, 640, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#e6b84a'; g.textAlign = 'center'; g.font = 'bold 44px "Noto Sans Thai",sans-serif'; g.fillText('รังนกใต้', w / 2, 60); g.font = 'bold 96px "Noto Serif TC","Songti TC",serif'; ['泰', '南', '燕', '窩'].forEach((c, i) => g.fillText(c, w / 2, 170 + i * 112)); g.font = 'bold 13px sans-serif'; g.fillText("SOUTH THAI BIRD'S NEST", w / 2, 625); }, { clamp: true });
    const nmM = new THREE.MeshStandardMaterial({ map: nm, transparent: true, emissiveMap: nm, emissive: 0xffd27a, emissiveIntensity: 0.2 }); ctx.signMats.push(nmM); nmM.userData.k = 0.8;
    plane(nmM, 4.4, 17.6, -3.4, 10.4, 2.78, 0, G);
    // ground floor shop + awning, tables & red stools out front, parked motorbikes
    box(11.6, 3.6, 0.2, -0.6, 1.8, 2.6, new THREE.MeshPhysicalMaterial({ color: 0xe6eef0, transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false }));
    box(12.4, 0.25, 2.2, -0.6, 3.8, 3.6, std(0x4a2a22));
    const inL = new THREE.PointLight(0xfff0d8, 10, 12, 1.6); inL.position.set(-0.6, 3, 1); G.add(inL);
    for (let i = 0; i < 4; i++) { box(0.9, 0.05, 0.9, -4 + i * 2.4, 0.75, 5.2, std(0xd0d4d8, { metalness: 0.8 })); for (const s of [-0.6, 0.6]) box(0.35, 0.45, 0.35, -4 + i * 2.4 + s, 0.23, 5.2, std(0xd8282a)); }
    FOOTPRINTS.push([[x - 6.5, z - 4], [x + 6.5, z - 4], [x + 6.5, z + 4], [x - 6.5, z + 4]]);
    G.updateMatrixWorld(); const w = new THREE.Vector3(-3.4, 12, 3); G.localToWorld(w); glow.add(w.x, w.y, w.z, 12, C('#ffcf70'));
  }

  // ============== SCB HAT YAI (OSM bank node) ==============
  if (ctx.hashAll) {
    const bx = -139, bz = -3, nr = ctx.hashAll.nearest(bx, bz, 80);
    let nx = 0, nz = 1, px = bx, pz = bz; if (nr) { nx = nr.px - bx; nz = nr.pz - bz; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l; px = nr.px - nx * (nr.data.w / 2 + 2.5 + 8); pz = nr.pz - nz * (nr.data.w / 2 + 2.5 + 8); }
    const G = new THREE.Group(); G.position.set(px, 0, pz); G.rotation.y = Math.atan2(nx, nz); scene.add(G);   // local +z = front
    const white = std(0xf2f2ee, { roughness: 0.55 }); const box = (w, h, d, x, y, z, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; G.add(o); return o; };
    box(16, 18, 10, 0, 9, -4, white);
    const mosaic = canvasTex(128, 128, (g, w, h) => { for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { const v = Math.random(); g.fillStyle = `rgb(${18 + v * 20},${70 + v * 40},${60 + v * 30})`; g.fillRect(x, y, 4, 4); } }); mosaic.repeat.set(4, 6);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 14, 40, 1, false, -Math.PI / 2.6, Math.PI / 1.3), new THREE.MeshStandardMaterial({ map: mosaic, roughness: 0.3, metalness: 0.3 })); cyl.position.set(0, 12, 3.2); cyl.scale.z = 0.5; cyl.castShadow = true; G.add(cyl);
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) box(0.5, 19, 1.2, s * (6.4 + k * 0.9), 9.5, 5.6 - k * 0.6, white);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 1.4, 40, 1, false, -Math.PI / 3, Math.PI / 1.5), white); crown.scale.z = 0.35; crown.position.set(0, 19.4, 4); G.add(crown);
    const band = canvasTex(1024, 128, (g, w, h) => { g.fillStyle = '#4e2a84'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 50px "Noto Sans Thai",sans-serif'; g.fillText('ธนาคารไทยพาณิชย์', w * 0.42, 60); g.font = 'bold 40px "Noto Sans TC",sans-serif'; g.fillText('匯商銀行 SCB', w * 0.42, 112); g.strokeStyle = '#e6b84a'; g.lineWidth = 8; g.beginPath(); g.moveTo(w * 0.78, 100); g.quadraticCurveTo(w * 0.78, 20, w * 0.82, 20); g.quadraticCurveTo(w * 0.86, 20, w * 0.86, 100); g.closePath(); g.stroke(); }, { clamp: true });
    box(17.5, 2.6, 2.4, 0, 4.6, 7.5, std(0x4e2a84)); plane(sign(band, 0.9), 17.3, 2.4, 0, 4.6, 8.75, 0, G);
    box(14, 3.2, 0.2, 0, 1.6, 6.8, new THREE.MeshPhysicalMaterial({ color: 0x9ab0b8, transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }));
    const gold = std(0xd8a838, { metalness: 0.9, roughness: 0.25 }); const gar = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), gold); gar.position.set(0, 6.8, 6.6); G.add(gar);
    for (const s of [-1, 1]) { const wing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.1), gold); wing.position.set(s * 0.8, 7.0, 6.6); wing.rotation.z = s * 0.4; G.add(wing); }
    box(0.4, 6, 0.4, 0, 22, -1, std(0x9aa0a6, { metalness: 0.7 })); box(2.4, 3.4, 0.3, 0, 26, -1, std(0x6a4ab4, { emissive: 0x6a4ab4, emissiveIntensity: 0.3 }));
    for (let i = 0; i < 3; i++) for (let f = 0; f < 4; f++) box(1.6, 1.8, 0.15, 6.2, 7 + f * 3.2, 7.0 - i * 2.2 - 3, std(0x1c2228, { metalness: 0.5 }));
    G.updateMatrixWorld(); const c0 = new THREE.Vector3(-8, 0, -9), c1 = new THREE.Vector3(8, 0, 9); G.localToWorld(c0); G.localToWorld(c1);
    FOOTPRINTS.push([[Math.min(c0.x, c1.x), Math.min(c0.z, c1.z)], [Math.max(c0.x, c1.x), Math.min(c0.z, c1.z)], [Math.max(c0.x, c1.x), Math.max(c0.z, c1.z)], [Math.min(c0.x, c1.x), Math.max(c0.z, c1.z)]]);
    ctx.scb = { x: px, z: pz, nx, nz };
  }

  // ============== NEW KIMYONG MARKET façade (OSM polygon ตลาดกิมหยง) ==============
  {
    const poly = DATA.blds.find(b => b.n === 'ตลาดกิมหยง');
    if (poly && ctx.hashAll) {
      const pc = pca(poly.p); let nx = -pc.uz, nz = pc.ux;
      const tA = ctx.hashAll.nearest(pc.cx + nx * 12, pc.cz + nz * 12, 60), tB = ctx.hashAll.nearest(pc.cx - nx * 12, pc.cz - nz * 12, 60);
      if (tB && (!tA || tB.d < tA.d)) { nx = -nx; nz = -nz; }
      const fx = pc.cx + nx * 7.5, fz = pc.cz + nz * 7.5; const G = new THREE.Group(); G.position.set(fx, 0, fz); G.rotation.y = Math.atan2(nx, nz); scene.add(G);
      const panel = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#9aa6b0'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 128) { const v = Math.random() * 18 - 9; g.fillStyle = `rgb(${154 + v},${166 + v},${176 + v})`; g.fillRect(x + 2, y + 2, 124, 60); } g.fillStyle = 'rgba(60,50,40,.18)'; for (let i = 0; i < 30; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 20 + Math.random() * 40); }); panel.repeat.set(2, 1.4);
      const box = (w, h, d, x, y, z, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; G.add(o); return o; };
      box(24, 6.5, 1.0, 0, 9.4, 0, new THREE.MeshStandardMaterial({ map: panel, roughness: 0.45, metalness: 0.5 }));
      box(3.2, 1.6, 0.2, 1.5, 8.2, 0.55, std(0x1a1e22));
      const s = canvasTex(1024, 96, (g, w, h) => { g.fillStyle = '#2a8a4a'; g.fillRect(0, 0, w * 0.22, h); g.fillStyle = '#d8323a'; g.fillRect(w * 0.22, 0, w * 0.53, h); g.fillStyle = '#f2d23a'; g.fillRect(w * 0.75, 0, w * 0.25, h); g.textAlign = 'center';
        g.fillStyle = '#fff'; g.font = 'bold 54px "Noto Serif TC",serif'; g.fillText('新錦榮', w * 0.11, 68); g.font = 'bold 58px "Noto Sans Thai",sans-serif'; g.fillText('ตลาดนิวกิมหยง', w * 0.485, 68); g.fillStyle = '#1d3c8a'; g.font = 'bold 34px sans-serif'; g.fillText('NEW KIMYONG', w * 0.875, 44); g.fillText('MARKET', w * 0.875, 84); }, { clamp: true });
      plane(sign(s, 0.7), 24, 2.25, 0, 5.1, 0.56, 0, G); box(24, 0.8, 0.4, 0, 3.6, 0.6, std(0xd88ab8));
      const aw = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 26, 16, 1, true, 0, Math.PI / 2), std(0xc8ccd0, { metalness: 0.6, side: THREE.DoubleSide })); aw.rotation.z = Math.PI / 2; aw.position.set(0, 1.9, 0.7); G.add(aw);
      for (let i = 0; i < 3; i++) box(5, 1.4, 1.4, -8 + i * 8, 2.4, 2.6, std(0xb8c4cc, { roughness: 0.8 }));
      // pushcarts with umbrellas and a fruit seller on the kerb (photo)
      for (const [ax, col] of [[-8, 0x2a62c8], [4, 0xe8402a]]) { box(2.2, 0.9, 1.0, ax, 0.9, 4.5, std(0xd8dadc, { metalness: 0.6 })); const u = new THREE.Mesh(new THREE.ConeGeometry(2, 0.7, 12, 1, true), std(col, { side: THREE.DoubleSide })); u.position.set(ax, 3.0, 4.5); G.add(u); box(0.05, 2.6, 0.05, ax, 1.6, 4.5, std(0x666666)); }
      for (let i = 0; i < 6; i++) box(0.55, 0.4, 0.42, 7 + (i % 3) * 0.6, 0.2 + Math.floor(i / 3) * 0.4, 7.5, std([0x2a5aa8, 0xd23a5a, 0x2a5aa8][i % 3]));
      G.updateMatrixWorld(); const w = new THREE.Vector3(7.6, 0.1, 8.6); G.localToWorld(w); ctx.people.add(w.x, 0.1 - 0.42, w.z, 1, undefined, 0.05, 1.2, 1);
      ctx.newKimyong = { x: fx, z: fz, nx, nz };
    }
  }

  // ============== red & white kerbs along the town-centre streets ==============
  {
    const curbTex = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#e6e6e2'; g.fillRect(0, 0, w, h); g.fillStyle = '#c4262a'; g.fillRect(0, 0, w, h / 2); });
    const o = { pos: [], uv: [], idx: [] };
    for (const r of ctx.roads) { if (!r.osm || r.cobble || r.cls === 'minor' || Math.hypot(r.pts[0][0], r.pts[0][1]) > 900) continue;
      for (const s of [1, -1]) ribbon(r.pts, 0.35, (x, z) => groundY(x, z) + 0.19, 2, o, s * (r.w / 2 + 0.15)); }
    const m = new THREE.Mesh(ribGeo(o), new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 })); m.frustumCulled = false; m.receiveShadow = true; scene.add(m);
  }

  // ============== blue-striped umbrellas on the fruit street ==============
  if (ctx.fruitStreet) {
    const f = ctx.fruitStreet, stripe = canvasTex(128, 32, (g, w, h) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#2a6ad8' : '#cfe0f8'; g.fillRect(i * 8, 0, 8, h); } });
    const um = new THREE.MeshStandardMaterial({ map: stripe, side: THREE.DoubleSide, roughness: 0.7 }); const nx = -f.dz, nz = f.dx;
    for (const side of [-1, 1]) for (let s = -28; s < 30; s += 6) { const x = f.x + f.dx * s + nx * side * 7.5, z = f.z + f.dz * s + nz * side * 7.5;
      const u = new THREE.Mesh(new THREE.ConeGeometry(2.6, 0.9, 16, 1, true), um); u.position.set(x, 3.4, z); u.castShadow = true; scene.add(u); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.4, 6), std(0x444444)); p.position.set(x, 1.7, z); scene.add(p); }
  }

  glow.build(scene);
  ctx.update.push((dt, t, S) => { const on = S.win > 0.3; night.visible = on; glow.mat.uniforms.uInt.value = on ? 0.12 + 1.0 * S.win : 0; });
}
