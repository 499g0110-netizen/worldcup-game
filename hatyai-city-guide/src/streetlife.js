import * as THREE from 'three';
import { mulberry32, canvasTex } from './util.js';
import { GlowSet } from './props.js';

// =====================================================================
//  Street frontage dressing: shop signboards (Thai / Chinese / English),
//  fabric awnings, vertical blade signs, AC units, and Hat Yai's many
//  massage shops with foot-massage chairs on the pavement.
// =====================================================================
const SIGNS = [
  // [line1, line2, bg, fg, kind]
  ['นวดแผนไทย', 'THAI MASSAGE 泰式按摩', '#5a1a5e', '#ffd6f2', 'massage'], ['FOOT MASSAGE', 'นวดเท้า 足底按摩', '#7a1f4a', '#ffe0ef', 'massage'],
  ['SPA & MASSAGE', 'สปา · 按摩', '#2b1446', '#f3c8ff', 'massage'], ['นวดไทย', 'Massage 200฿/hr', '#8a2050', '#fff0f6', 'massage'],
  ['泰式按摩', 'นวดตัว นวดเท้า', '#3d1f5c', '#ffd27a', 'massage'], ['ห้างทอง', '金行 GOLD SHOP', '#a3141a', '#ffd86a', 'gold'],
  ['金鋪 ห้างทอง', 'เยาวราช', '#b0161c', '#ffe08a', 'gold'], ['MONEY EXCHANGE', 'แลกเงิน 換錢', '#0f3d6e', '#ffffff', 'shop'],
  ['ร้านขายยา', 'PHARMACY 藥房', '#0e6b3a', '#ffffff', 'shop'], ['ข้าวมันไก่', '海南雞飯', '#f2e6c8', '#a3141a', 'food'],
  ['ก๋วยเตี๋ยว', 'Noodles 粿條', '#f0b020', '#3a1a0a', 'food'], ['ติ่มซำ', '點心 DIM SUM', '#c8281e', '#fff3c8', 'food'],
  ['燒臘 ข้าวหมูแดง', 'BBQ PORK RICE', '#7a1a0f', '#ffd27a', 'food'], ['ROTI', 'โรตี · 煎餅', '#e8742a', '#ffffff', 'food'],
  ['ชานมไทย', 'THAI TEA 泰奶', '#d0661c', '#fff6e0', 'food'], ['CAFE', 'กาแฟ · 咖啡', '#2a1e18', '#e8c89a', 'food'],
  ['MINI MART', 'ร้านสะดวกซื้อ', '#ffffff', '#1d5fb8', 'shop'], ['มือถือ', 'MOBILE 手機', '#1d3c8a', '#ffffff', 'shop'],
  ['โรงแรม', 'HOTEL 酒店', '#2a2a30', '#e6c274', 'shop'], ['TOUR & TICKET', 'ทัวร์ 旅行社', '#0f5a6e', '#ffffff', 'shop'],
  ['藥材行', 'สมุนไพรจีน', '#5a2a10', '#ffd27a', 'shop'], ['ร้านผ้า', 'TEXTILE 布行', '#3a5a2a', '#ffffff', 'shop'],
  ['ทันตกรรม', 'DENTAL CLINIC', '#e8f4f8', '#0e5a8a', 'shop'], ['เบเกอรี่', 'BAKERY 麵包', '#f6d8b0', '#7a3a1a', 'food'],
  ['ซีฟู้ด', 'SEAFOOD 海鮮', '#0e4a7a', '#ffffff', 'food'], ['ข้าวต้ม', '粥 RICE PORRIDGE', '#e8dcc0', '#7a1a0f', 'food'],
  ['ร้านทอง แม่ทองสุก', '金店', '#c01818', '#ffe9a0', 'gold'], ['ชาบู', 'SHABU 火鍋', '#1a1a1a', '#ff5a3a', 'food'],
  ['เสื้อผ้า', 'FASHION 服飾', '#e0508a', '#ffffff', 'shop'], ['ขนมไทย', 'THAI DESSERT', '#2a8a5a', '#fff3c8', 'food'],
  ['ไก่ทอดหาดใหญ่', 'HAT YAI FRIED CHICKEN', '#a33a10', '#ffe08a', 'food'], ['รองเท้า', 'SHOES 鞋店', '#333a48', '#f2f2f2', 'shop'],
  ['ก๋วยเตี๋ยวเรือ', '船麵 BOAT NOODLES', '#1d4a7a', '#ffd27a', 'boat'], ['เรือ ก๋วยเตี๋ยว', '船仔麵 15฿', '#8a2a14', '#fff0c8', 'boat'], ['ก๋วยเตี๋ยวเรืออยุธยา', 'BOAT NOODLE 船麵', '#0e6b5a', '#ffffff', 'boat'],
];
const COLS = 8, ROWS = Math.ceil(SIGNS.length / COLS);

function atlas() {
  return canvasTex(COLS * 256, ROWS * 96, (g) => {
    SIGNS.forEach(([a, b, bg, fg], i) => {
      const x = (i % COLS) * 256, y = Math.floor(i / COLS) * 96;
      g.fillStyle = bg; g.fillRect(x, y, 256, 96);
      g.strokeStyle = fg; g.globalAlpha = 0.5; g.lineWidth = 3; g.strokeRect(x + 5, y + 5, 246, 86); g.globalAlpha = 1;
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `bold ${a.length > 12 ? 26 : 36}px "Noto Sans Thai","Noto Sans TC",system-ui,sans-serif`; g.fillText(a, x + 128, y + 36, 236);
      g.font = `600 ${b.length > 18 ? 16 : 20}px "Noto Sans TC","Noto Sans Thai",system-ui,sans-serif`; g.fillText(b, x + 128, y + 72, 236);
    });
  }, { clamp: true });
}

export function buildShopfronts(ctx) {
  const fronts = (ctx.shopfronts || []).filter(f => f.d0 < 2400);
  if (!fronts.length) return;
  const rnd = mulberry32(8080); const { scene } = ctx;
  const tex = atlas(); tex.anisotropy = 8;
  // ---- instanced signboards with per-instance atlas cell ----
  const N = fronts.length;
  const sGeo = new THREE.PlaneGeometry(1, 1);
  const uvRect = new THREE.InstancedBufferAttribute(new Float32Array(N * 2 * 4), 4); sGeo.setAttribute('aUvRect', uvRect);
  const sMat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.55, side: THREE.DoubleSide });
  sMat.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('void main() {', 'attribute vec4 aUvRect;\nvoid main() {').replace('#include <uv_vertex>', '#include <uv_vertex>\n vMapUv = uv * aUvRect.zw + aUvRect.xy;\n #ifdef USE_EMISSIVEMAP\n vEmissiveMapUv = vMapUv;\n #endif'); };
  ctx.signMats.push(sMat); sMat.userData.k = 0.9;
  const signs = new THREE.InstancedMesh(sGeo, sMat, N * 2);
  // ---- awnings (striped fabric) ----
  const awTex = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.0)'; for (let i = 0; i < 8; i += 2) { g.fillStyle = '#e8e8e8'; g.fillRect(i * 8, 0, 8, h); } g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, h - 6, w, 6); });
  awTex.repeat.set(4, 1);
  const aw = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.05, 1), new THREE.MeshStandardMaterial({ map: awTex, roughness: 0.85 }), N);
  const acG = new THREE.BoxGeometry(0.8, 0.55, 0.3), ac = new THREE.InstancedMesh(acG, new THREE.MeshStandardMaterial({ color: 0xd8dadc, roughness: 0.5, metalness: 0.2 }), N * 3);
  const potG = new THREE.CylinderGeometry(0.28, 0.2, 0.45, 10), pots = new THREE.InstancedMesh(potG, new THREE.MeshStandardMaterial({ color: 0x8a4a2a, roughness: 0.9 }), N);
  const plantG = new THREE.IcosahedronGeometry(0.42, 1), plants = new THREE.InstancedMesh(plantG, new THREE.MeshStandardMaterial({ color: 0x2f6a35, roughness: 0.9 }), N);
  // massage loungers
  const loungeG = new THREE.BoxGeometry(0.75, 0.25, 1.9); const lounge = new THREE.InstancedMesh(loungeG, new THREE.MeshStandardMaterial({ color: 0x6a1f3a, roughness: 0.6 }), 400);
  const backG = new THREE.BoxGeometry(0.75, 0.7, 0.15); const lback = new THREE.InstancedMesh(backG, lounge.material, 400);
  const glow = new GlowSet('lamp', 60); ctx.glowSets.push(glow);
  const pink = new THREE.Color('#ff5ab4'), purple = new THREE.Color('#b46aff'), warm = new THREE.Color('#ffc078');
  const awCols = ['#c8281e', '#1d5fb8', '#1f8a4c', '#e8a31d', '#7a2d9a', '#e8742a', '#2a2a2a', '#d0d0c8'];
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), Sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), C = new THREE.Color();
  let si = 0, ai = 0, ci = 0, pi = 0, li = 0; const boats = [];
  const setUv = (idx, k) => uvRect.setXYZW(idx, (k % COLS) / COLS, 1 - (Math.floor(k / COLS) + 1) / ROWS, 1 / COLS, 1 / ROWS);
  for (const f of fronts) {
    const yaw = Math.atan2(f.fnx, f.fnz); Q.setFromAxisAngle(up, yaw);
    const ox = f.fnx, oz = f.fnz;           // outward normal (toward street)
    // pick sign; ~22% massage near the centre
    let k = Math.floor(rnd() * SIGNS.length); const rr = rnd(); if (f.d0 < 1300 && rr < 0.2) k = Math.floor(rnd() * 5); else if (rr < 0.36) k = SIGNS.length - 1 - Math.floor(rnd() * 3);
    const isBoat = SIGNS[k][4] === 'boat';
    if (rnd() < 0.4) (ctx.parkSpots || (ctx.parkSpots = [])).push({ x: f.x + f.fnx * 3.0 + (-f.fnz) * (rnd() - 0.5) * f.w * 0.5, z: f.z + f.fnz * 3.0 + f.fnx * (rnd() - 0.5) * f.w * 0.5, yaw: Math.atan2(-f.fnz, f.fnx) });
    if (isBoat) boats.push(f);
    const isMassage = SIGNS[k][4] === 'massage';
    const sw = Math.min(f.w * 0.86, 7.5);
    M.compose(V.set(f.x + ox * 0.12, 3.75, f.z + oz * 0.12), Q, Sc.set(sw, sw * 0.375 > 1.6 ? 1.6 : sw * 0.375, 1)); signs.setMatrixAt(si, M); setUv(si, k); si++;
    // vertical blade sign on taller buildings
    if (f.fl >= 3 && rnd() < 0.45) {
      const k2 = Math.floor(rnd() * SIGNS.length); const q2 = new THREE.Quaternion().setFromAxisAngle(up, yaw + Math.PI / 2).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2));
      const rx = -oz, rz = ox; const e = (f.w / 2 - 0.4) * (rnd() < 0.5 ? 1 : -1);
      M.compose(V.set(f.x + ox * 0.75 + rx * e, 6.6 + rnd() * 2, f.z + oz * 0.75 + rz * e), q2, Sc.set(3.4, 1.25, 1)); signs.setMatrixAt(si, M); setUv(si, k2); si++;
    }
    // awning over the shop front
    if (!isMassage && rnd() < 0.7) {
      const qa = Q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.32));
      M.compose(V.set(f.x + ox * 0.85, 3.0, f.z + oz * 0.85), qa, Sc.set(f.w * 0.9, 1, 1.7)); aw.setMatrixAt(ai, M); C.set(awCols[Math.floor(rnd() * awCols.length)]); aw.setColorAt(ai, C); ai++;
    }
    // AC units on upper floors
    for (let fl = 1; fl < Math.min(f.fl, 4); fl++) if (rnd() < 0.5) { const rx = -oz, rz = ox, e = (rnd() - 0.5) * f.w * 0.7; M.compose(V.set(f.x + ox * 0.2 + rx * e, fl * 3.3 + 0.6, f.z + oz * 0.2 + rz * e), Q, Sc.set(1, 1, 1)); ac.setMatrixAt(ci++, M); }
    if (rnd() < 0.35) { const rx = -oz, rz = ox, e = (f.w / 2 - 0.5) * (rnd() < 0.5 ? 1 : -1); M.compose(V.set(f.x + ox * 0.6 + rx * e, 0.35, f.z + oz * 0.6 + rz * e), Q, Sc.set(1, 1, 1)); pots.setMatrixAt(pi, M); M.compose(V.set(f.x + ox * 0.6 + rx * e, 0.95, f.z + oz * 0.6 + rz * e), Q, Sc.set(1, 1.2, 1)); plants.setMatrixAt(pi, M); pi++; }
    if (isMassage) {
      glow.add(f.x + ox * 0.5, 3.1, f.z + oz * 0.5, 5, rnd() < 0.5 ? pink : purple); glow.add(f.x + ox * 0.4, 1.6, f.z + oz * 0.4, 3.5, warm);
      // two or three foot-massage recliners on the pavement with customer + masseuse
      const n = 2 + Math.floor(rnd() * 2), rx = -oz, rz = ox;
      for (let j = 0; j < n && li < 400; j++) {
        const e = (j - (n - 1) / 2) * 0.95, bx = f.x + ox * 1.6 + rx * e, bz = f.z + oz * 1.6 + rz * e;
        M.compose(V.set(bx, 0.45, bz), Q, Sc.set(1, 1, 1)); lounge.setMatrixAt(li, M);
        M.compose(V.set(bx - ox * 0.85, 0.85, bz - oz * 0.85), Q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.5)), Sc.set(1, 1, 1)); lback.setMatrixAt(li, M); li++;
        if (rnd() < 0.75) { const ci2 = ctx.people.add(bx - ox * 0.45, 0.1, bz - oz * 0.45, 1, undefined, 0.05, 1.2, 1); if (ci2 >= 0) ctx.people.items[ci2].rot = yaw; }
        const mi = ctx.people.add(bx + ox * 1.2, 0.12 - 0.35, bz + oz * 1.2, 0.95, new THREE.Color('#5a2a6a'), 0.1, 2.5, 1); if (mi >= 0) ctx.people.items[mi].rot = yaw + Math.PI;
      }
    } else if (rnd() < 0.2) glow.add(f.x + ox * 0.5, 3.0, f.z + oz * 0.5, 4, warm);
  }
  signs.count = si; aw.count = ai; ac.count = ci; pots.count = pi; plants.count = pi; lounge.count = li; lback.count = li;
  uvRect.needsUpdate = true;
  for (const m of [signs, aw, ac, pots, plants, lounge, lback]) { m.frustumCulled = false; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.castShadow = m !== signs; m.receiveShadow = true; scene.add(m); }
  glow.build(scene);
  ctx.update.push((dt, t, S) => { glow.mat.uniforms.uInt.value = 0.05 + 1.1 * S.win; });
  ctx.massageCount = li;
  // ---- boat-noodle shops: a little wooden boat on the pavement holding the soup pots ----
  {
    const hull = new THREE.BoxGeometry(1.0, 0.45, 2.6); const hp = hull.attributes.position; for (let i = 0; i < hp.count; i++) if (Math.abs(hp.getZ(i)) > 1.2) { hp.setX(i, hp.getX(i) * 0.3); hp.setY(i, hp.getY(i) + 0.15); } hull.computeVertexNormals();
    const hullM = new THREE.InstancedMesh(hull, new THREE.MeshStandardMaterial({ roughness: 0.7 }), boats.length || 1);
    const pot = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.25, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0xc0c4c8, metalness: 0.85, roughness: 0.25 }), (boats.length || 1) * 2);
    const tab = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 0.06, 0.8), new THREE.MeshStandardMaterial({ color: 0xd8d2c0, roughness: 0.6 }), (boats.length || 1) * 2);
    const bcol = ['#a33a1a', '#1d5fb8', '#1f8a4c', '#6b3a1e'];
    boats.forEach((f, i) => { const yaw = Math.atan2(f.fnx, f.fnz) + Math.PI / 2, rx = -f.fnz, rz = f.fnx, e = f.w * 0.25;
      Q.setFromAxisAngle(up, yaw); M.compose(V.set(f.x + f.fnx * 1.3 + rx * e, 0.55, f.z + f.fnz * 1.3 + rz * e), Q, Sc.set(1, 1, 1)); hullM.setMatrixAt(i, M); C.set(bcol[i % 4]); hullM.setColorAt(i, C);
      for (const k of [-0.5, 0.5]) { M.compose(V.set(f.x + f.fnx * 1.3 + rx * (e + k), 0.98, f.z + f.fnz * 1.3 + rz * (e + k)), Q, Sc.set(1, 1, 1)); pot.setMatrixAt(i * 2 + (k > 0 ? 1 : 0), M); }
      for (const k of [-1, 1]) { M.compose(V.set(f.x + f.fnx * 2.6 + rx * (e * k - 0.3), 0.75, f.z + f.fnz * 2.6 + rz * (e * k - 0.3)), Q, Sc.set(1, 1, 1)); tab.setMatrixAt(i * 2 + (k > 0 ? 1 : 0), M);
        const ci3 = ctx.people.add(f.x + f.fnx * 2.0 + rx * (e * k - 0.3), 0.1 - 0.42, f.z + f.fnz * 2.0 + rz * (e * k - 0.3), 1, undefined, 0.07, 1.4, 1); if (ci3 >= 0) ctx.people.items[ci3].rot = yaw - Math.PI / 2; }
      glow.add(f.x + f.fnx * 1.3, 2.4, f.z + f.fnz * 1.3, 4, warm); });
    hullM.count = boats.length; pot.count = boats.length * 2; tab.count = boats.length * 2;
    for (const m of [hullM, pot, tab]) { m.frustumCulled = false; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.castShadow = true; scene.add(m); }
  }
  // ---- ornate curved pediments on top of the Sino-Portuguese shophouses ----
  const peds = ctx.pediments || [];
  if (peds.length) {
    const sh = new THREE.Shape(); sh.moveTo(-0.5, 0); sh.lineTo(0.5, 0); sh.lineTo(0.5, 0.12); sh.bezierCurveTo(0.42, 0.12, 0.36, 0.3, 0.22, 0.34); sh.bezierCurveTo(0.14, 0.5, 0.06, 0.62, 0, 0.66); sh.bezierCurveTo(-0.06, 0.62, -0.14, 0.5, -0.22, 0.34); sh.bezierCurveTo(-0.36, 0.3, -0.42, 0.12, -0.5, 0.12); sh.closePath();
    const pg = new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: false, curveSegments: 10 });
    const ped = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ roughness: 0.7 }), peds.length);
    const ball = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.6 }), peds.length * 2);
    peds.forEach((p, i) => { const yaw = Math.atan2(p.fnx, p.fnz); Q.setFromAxisAngle(up, yaw); const k = p.s < 0.55 ? 1 : 0.7;
      M.compose(V.set(p.x - p.fnx * 0.05, p.h, p.z - p.fnz * 0.05), Q, Sc.set(p.w * 0.92 * k, 2.4, 1)); ped.setMatrixAt(i, M); C.copy(p.c).lerp(new THREE.Color('#f4f0e6'), p.s < 0.4 ? 0.7 : 0.15); ped.setColorAt(i, C);
      const rx = -p.fnz, rz = p.fnx; for (const s2 of [-1, 1]) { M.compose(V.set(p.x + rx * s2 * p.w * 0.46, p.h + 0.35, p.z + rz * s2 * p.w * 0.46), Q, Sc.set(1, 1, 1)); ball.setMatrixAt(i * 2 + (s2 > 0 ? 1 : 0), M); } });
    for (const m of [ped, ball]) { m.frustumCulled = false; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.castShadow = true; scene.add(m); }
  }
}

// parked cars along the kerbs (uses the traffic car model)
export function buildParked(ctx, traffic) {
  const spots = (ctx.parkSpots || []).filter(s => !ctx.hashAll || true).slice(0, 900); if (!spots.length) return;
  const im = new THREE.InstancedMesh(traffic.g.car.geometry, traffic.g.car.material, spots.length); const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), C = new THREE.Color(); const rnd = mulberry32(3);
  const pal = ['#d8dadc', '#f2f2f2', '#2b2d31', '#8a8f96', '#6a1c1c', '#1d3c6e', '#c9ccd1', '#f2f2f2'];
  spots.forEach((s, i) => { Q.setFromAxisAngle(up, s.yaw + (rnd() < 0.5 ? 0 : Math.PI)); M.compose(new THREE.Vector3(s.x, 0.05, s.z), Q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, M); C.set(pal[Math.floor(rnd() * pal.length)]); im.setColorAt(i, C); });
  im.frustumCulled = false; im.castShadow = true; ctx.scene.add(im);
}
