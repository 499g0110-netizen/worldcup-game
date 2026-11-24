// High-quality demo area: St. Marien south wall + "Der Teufel" bronze on the Teufelsstein.
// Position: OSM node/ "Der Teufel" (see data/landmarks.json). Wall direction: nearest St. Marien wall segment.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';

function vnoise3(x, y, z) {
  const h = (i, j, k) => { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf), L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h(xi, yi, zi), h(xi + 1, yi, zi), u), L(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v), L(L(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), L(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
}
const fbm3 = (x, y, z) => vnoise3(x, y, z) * .55 + vnoise3(x * 2.1, y * 2.1, z * 2.1) * .28 + vnoise3(x * 4.3, y * 4.3, z * 4.3) * .17;

/* ---- the devil: smooth sculpt from metaballs, baked to a static mesh ---- */
function devilGeometry() {
  const RES = 84, mc = new MarchingCubes(RES, new THREE.MeshBasicMaterial(), false, false, 60000);
  mc.isolation = 80; mc.reset();
  const S = 1.4, N = (x, y, z) => [0.5 + x / S, 0.5 + (y - 0.15) / S, 0.5 + z / S];
  const ball = (x, y, z, r) => { const [a, b, c] = N(x, y, z); mc.addBall(a, b, c, 120 * (r / S) ** 2, 40); }; // tighter blending keeps limbs readable
  const chain = (p0, p1, r0, r1, k = 6) => { for (let i = 0; i <= k; i++) { const t = i / k; ball(p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, p0[2] + (p1[2] - p0[2]) * t, r0 + (r1 - r0) * t); } };
  // torso, pot belly
  ball(0, 0.10, -0.03, 0.155); ball(0, 0.23, 0.05, 0.15); ball(0, 0.37, -0.01, 0.13); ball(0, 0.27, 0.09, 0.11);
  for (const s of [-1, 1]) {
    ball(s * 0.12, 0.45, -0.01, 0.065);                                       // shoulder
    chain([s * 0.15, 0.44, 0.0], [s * 0.12, 0.25, 0.19], 0.05, 0.042);        // upper arm down to the knee
    chain([s * 0.12, 0.25, 0.19], [s * 0.055, 0.49, 0.15], 0.04, 0.036);       // forearm up to the chin
    ball(s * 0.045, 0.51, 0.14, 0.045);                                       // hands cupping the beard
    chain([s * 0.08, 0.08, 0.0], [s * 0.09, 0.11, 0.30], 0.088, 0.072);       // thigh (furry, thick)
    chain([s * 0.09, 0.10, 0.31], [s * 0.095, -0.21, 0.35], 0.068, 0.052, 8); // shin hanging over the stone edge
    chain([s * 0.095, -0.24, 0.36], [s * 0.1, -0.27, 0.45], 0.048, 0.032);    // foot, toes pointing down-forward
    ball(s * 0.11, 0.655, 0.0, 0.034); ball(s * 0.135, 0.695, -0.015, 0.02); // pointed ears
    chain([s * 0.055, 0.71, 0.03], [s * 0.1, 0.80, 0.01], 0.032, 0.022, 5);   // horns
    chain([s * 0.1, 0.80, 0.01], [s * 0.115, 0.865, -0.02], 0.022, 0.009, 5);
  }
  ball(0, 0.62, 0.035, 0.115); ball(0, 0.56, 0.07, 0.075);                    // head + jaw
  ball(0, 0.62, 0.135, 0.032); ball(0, 0.605, 0.165, 0.024); ball(0, 0.59, 0.18, 0.016); // hooked nose
  chain([0, 0.53, 0.11], [0, 0.44, 0.13], 0.05, 0.022, 5);                    // beard
  for (const s of [-1, 1]) ball(s * 0.045, 0.645, 0.115, 0.018);              // cheeks
  mc.update();
  const cnt = mc.count, pos = mc.geometry.attributes.position.array.slice(0, cnt * 3), nor = mc.geometry.attributes.normal.array.slice(0, cnt * 3);
  for (let i = 0; i < pos.length; i += 3) { pos[i] *= S / 2; pos[i + 1] = pos[i + 1] * S / 2 + 0.15; pos[i + 2] *= S / 2; }
  // patina: green in recesses and on the furry legs, polished where people touch (nose, knees, horns, hands)
  const col = new Float32Array(cnt * 3), bronze = new THREE.Color(0x4f2f19), shine = new THREE.Color(0xa86a38), green = new THREE.Color(0x2c5446), c = new THREE.Color();
  for (let i = 0; i < cnt; i++) {
    const x = pos[3 * i], y = pos[3 * i + 1], z = pos[3 * i + 2], n = fbm3(x * 18, y * 18, z * 18);
    let g = THREE.MathUtils.smoothstep(0.12 - y, -0.02, 0.25) * 0.85 + (n - 0.5) * 0.5;      // legs greener
    g += nor[3 * i + 1] < -0.4 ? 0.3 : 0;                                                     // undersides
    const rub = Math.max(Math.exp(-((y - 0.6) ** 2 + (z - 0.17) ** 2) * 900), Math.exp(-((y - 0.1) ** 2 + (z - 0.31) ** 2) * 300), y > 0.78 ? 1 : 0, Math.exp(-((y - 0.51) ** 2 + (z - 0.15) ** 2) * 500));
    c.copy(bronze).lerp(green, THREE.MathUtils.clamp(g, 0, 0.9)).lerp(shine, rub * 0.9);
    col.set([c.r, c.g, c.b], 3 * i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  mc.geometry.dispose();
  return g;
}

/* ---- the granite block: displaced box with chipped, bush-hammered edges ---- */
function stoneGeometry(L, H, D) {
  const g = new THREE.BoxGeometry(L, H, D, 64, 10, 12), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    // round the edges (corner radius ~6 cm) then add large irregular bulges + fine chips
    const ex = Math.max(0, Math.abs(v.x) - (L / 2 - 0.06)), ey = Math.max(0, Math.abs(v.y) - (H / 2 - 0.06)), ez = Math.max(0, Math.abs(v.z) - (D / 2 - 0.06));
    const k = Math.hypot(ex, ey, ez); if (k > 0) { const f = 0.06 / k; v.x -= Math.sign(v.x) * ex * (1 - f); v.y -= Math.sign(v.y) * ey * (1 - f); v.z -= Math.sign(v.z) * ez * (1 - f); }
    const big = (fbm3(v.x * 1.3 + 7, v.y * 1.3, v.z * 1.3) - 0.5) * 0.07, fine = (vnoise3(v.x * 22, v.y * 22, v.z * 22) - 0.5) * 0.012;
    const nx = Math.sign(v.x) * (Math.abs(v.x) > L / 2 - 0.08 ? 1 : 0), ny = v.y > H / 2 - 0.08 ? 1 : 0, nz = Math.sign(v.z) * (Math.abs(v.z) > D / 2 - 0.08 ? 1 : 0);
    const d = big + fine; v.x += nx * d; v.y += ny * d * 0.7; v.z += nz * d;
    v.y += (fbm3(v.x * 0.7, 0, 3) - 0.5) * 0.05;          // gently uneven top
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  // uv in metres for the rock texture (box uvs are per-face 0..1)
  const uv = g.attributes.uv, nrm = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ay > 0.6) uv.setXY(i, x, z); else if (ax > 0.6) uv.setXY(i, z, y); else uv.setXY(i, x, y);
  }
  g.setAttribute('uv1', uv.clone());
  return g;
}

/* ---- one rough-faced (bush-hammered) granite ashlar block, metre UVs ---- */
function ashlarGeometry(w, h, d, seed) {
  const g = new THREE.BoxGeometry(w, h, d, Math.max(6, Math.round(w * 24)), Math.max(4, Math.round(h * 24)), 2), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    if (v.z > d / 2 - 1e-3) {   // only the visible face gets relief; edges are chipped back
      const ex = Math.min(w / 2 - Math.abs(v.x), h / 2 - Math.abs(v.y)), chip = ex < 0.05 ? (0.05 - ex) * 0.9 : 0;
      v.z += (fbm3(v.x * 3 + seed, v.y * 3, seed) - 0.5) * 0.035 + (vnoise3(v.x * 30, v.y * 30, seed) - 0.5) * 0.006 - chip;
    }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const uv = g.attributes.uv, nr = g.attributes.normal;
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(nr.getX(i)), ay = Math.abs(nr.getY(i)); const u = ax > 0.7 ? p.getZ(i) : p.getX(i), vv = ay > 0.7 ? p.getZ(i) : p.getY(i); uv.setXY(i, u + seed * 0.71, vv + seed * 0.37); }
  return g;
}

export function buildHero(scene, M, segs, teufel) {
  // nearest tall wall segment = St. Marien south wall
  let best = null, bd = 1e9;
  for (const s of segs) {
    if (s[4] < 12) continue;
    const dx = s[2] - s[0], dz = s[3] - s[1], L2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((teufel.x - s[0]) * dx + (teufel.z - s[1]) * dz) / L2));
    const px = s[0] + dx * t, pz = s[1] + dz * t, d = Math.hypot(teufel.x - px, teufel.z - pz);
    if (d < bd) { bd = d; best = { s, px, pz }; }
  }
  const s = best.s, L = Math.hypot(s[2] - s[0], s[3] - s[1]);
  let tx = (s[2] - s[0]) / L, tz = (s[3] - s[1]) / L;               // along the wall
  let nx = tz, nz = -tx;                                              // outward (CCW rings)
  if ((teufel.x - best.px) * nx + (teufel.z - best.pz) * nz < 0) { nx = -nx; nz = -nz; }
  const g = new THREE.Group(); g.name = 'hero';
  // local frame: x along wall, z outward, origin at the wall foot right behind the statue
  g.position.set(best.px, 0, best.pz); g.rotation.y = Math.atan2(nx, nz); scene.add(g);
  const tangentSign = Math.sign(tx * Math.cos(g.rotation.y) - tz * Math.sin(g.rotation.y)) || 1; void tangentSign;

  // 1) granite ashlar plinth, 4 courses, individually bevelled blocks set 25 cm proud of the brick
  const ashlarMats = [0xd8d0c6, 0xc8c0b6, 0xdfd6cc, 0xbdb5ac, 0xd2c9bf].map((c) => { const m = M.granite_grey.clone(); m.color = new THREE.Color(c); return m; });
  // recessed dark mortar behind the joints
  const mortar = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.2), new THREE.MeshStandardMaterial({ color: 0x4a4744, roughness: 1 })); mortar.position.set(0, 1.1, 0.02); g.add(mortar);
  const blocks = new THREE.Group(); g.add(blocks);
  let y = 0; const rows = [0.62, 0.55, 0.5, 0.46]; let seedK = 3;
  for (const h of rows) {
    let x = -9 + ((seedK * 0.37) % 0.6);
    while (x < 9) {
      const w = 0.85 + ((Math.sin(seedK * 12.9898) * 43758.5453) % 1 + 1) % 1 * 0.75; seedK++;
      const geo = ashlarGeometry(w - 0.018, h - 0.018, 0.42, seedK);
      const m = new THREE.Mesh(geo, ashlarMats[seedK % ashlarMats.length]);
      m.position.set(x + w / 2, y + h / 2, 0.21 - 0.02 * ((seedK % 3) / 2)); m.castShadow = m.receiveShadow = true; blocks.add(m);
      x += w;
    }
    y += h;
  }
  // chamfered capping course where brick starts
  const capG = new RoundedBoxGeometry(18, 0.12, 0.34, 2, 0.04); { const p = capG.attributes.position, u = capG.attributes.uv; for (let i = 0; i < p.count; i++) u.setXY(i, p.getX(i), p.getY(i) + p.getZ(i)); }
  const cap = new THREE.Mesh(capG, ashlarMats[0]); cap.position.set(0, y + 0.06, 0.17); cap.castShadow = cap.receiveShadow = true; g.add(cap);

  // 2) the Teufelsstein: long rough granite block in front of the plinth
  const SL = 3.5, SH = 0.52, SD = 0.62;
  const stone = new THREE.Mesh(stoneGeometry(SL, SH, SD), M.rock); stone.material = M.granite_grey.clone(); stone.material.color = new THREE.Color(0xeadbd2);
  stone.position.set(-0.9, SH / 2 - 0.02, 0.42 + SD / 2); stone.castShadow = stone.receiveShadow = true; g.add(stone);
  // dark asphalt sidewalk strip along the wall, as in the reference photo (wet-looking, low roughness patches)
  const sw = new THREE.Mesh(new THREE.PlaneGeometry(18, 3.2), M.asphalt.clone()); sw.material.color = new THREE.Color(0x77736e); sw.material.roughness = 0.75;
  sw.rotation.x = -Math.PI / 2; sw.position.set(0, 0.07, 0.42 + 1.6); sw.receiveShadow = true; { const u = sw.geometry.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * 18, u.getY(i) * 3.2); } g.add(sw);
  // 3) the bronze devil, sitting on the right part of the stone facing the passer-by
  const bronze = new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.95, roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.35, envMapIntensity: 1.6 });
  const devil = new THREE.Mesh(devilGeometry(), bronze); devil.castShadow = devil.receiveShadow = true;
  devil.position.set(0.0, SH - 0.02, 0.42 + SD - 0.36); devil.rotation.y = -0.3; g.add(devil); // perched on the front edge, shins hanging over it
  // anchor stone x so that the statue sits on the OSM node
  const along = (teufel.x - best.px) * Math.cos(g.rotation.y) - (teufel.z - best.pz) * Math.sin(g.rotation.y);
  for (const c of [stone, devil]) c.position.x += along;
  g.updateMatrixWorld(true);
  const world = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyMatrix4(g.matrixWorld);
  return {
    group: g, devil, stone,
    statueWorld: world(along, SH + 0.4, 0.55),
    colliders: [{ c: world(along - 0.9, 0, 0.42 + SD / 2), yaw: g.rotation.y, hx: SL / 2, hz: SD / 2 }],
    // reference camera for the supplied photo (bronze devil, wall receding to the left). Values estimated by eye: 待核對
    refCam: { pos: world(along + 1.25, 1.22, 2.35), look: world(along - 0.55, 0.62, 0.55), fov: 56, aspect: 1536 / 1024, photo: 'ref/teufel.jpg' },
    frame: { px: best.px, pz: best.pz, yaw: g.rotation.y, along },
  };
}
