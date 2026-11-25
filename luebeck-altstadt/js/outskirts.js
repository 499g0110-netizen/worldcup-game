// Outskirts beyond the downloaded OSM tiles: a cheap instanced townscape (houses with red-orange or grey roofs,
// flat-roofed blocks, clusters of trees) so the aerial view shows a continuous city to the horizon like the
// reference aerial photos, instead of an empty plain. Deterministic; skips water and every cell that has real data.
import * as THREE from 'three';

const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

export function buildOutskirts(scene, { tiles, tileSize, inWater, touch, skip = () => false }) {
  const CELL = touch ? 75 : 50, R = touch ? 1900 : 2500, per = touch ? 2 : 3;
  const houses = [], trees = [];
  for (let x = -R; x <= R; x += CELL) for (let z = -R; z <= R; z += CELL) {
    const d = Math.hypot(x, z); if (d > R) continue;
    const key = Math.floor((x + CELL / 2) / tileSize) + '_' + Math.floor((z + CELL / 2) / tileSize), real = tiles.has(key);
    const dense = skip(x + CELL / 2, z + CELL / 2);   // inside the old-town island: tightly packed gabled houses until the real tile streams in
    if (inWater(x + CELL / 2, z + CELL / 2)) continue;
    const park = !dense && hash(x, z) < 0.22;                       // parks and allotments: trees only
    const nH = park ? 0 : dense ? per * 3 : per - (d > 1800 ? 1 : 0);
    for (let k = 0; k < nH; k++) {
      const hx = x + 8 + hash(x + k, z) * (CELL - 16), hz = z + 8 + hash(z + k, x) * (CELL - 16); if (inWater(hx, hz)) continue;
      const block = !dense && hash(hx, hz) < 0.18;                  // larger flat-roofed blocks (offices, schools, supermarkets)
      houses.push({ key: real ? key : null, x: hx, z: hz, w: block ? 22 + hash(hz, 1) * 20 : 9 + hash(hx, 2) * 6, d: block ? 14 + hash(hx, 3) * 10 : 8 + hash(hz, 4) * 5, h: block ? 9 + hash(hx, 5) * 9 : 7 + hash(hz, 6) * 6, rot: Math.round(hash(hx, 7) * 2) * Math.PI / 2 + (hash(x, z) - 0.5) * 0.2, flat: block, c: hash(hx, 8) });
    }
    const nT = park ? 7 : dense ? 0 : 2;
    for (let k = 0; k < nT; k++) { const tx = x + hash(x, z + k * 7) * CELL, tz = z + hash(z, x + k * 5) * CELL; if (!inWater(tx, tz)) trees.push([tx, tz, 0.8 + hash(tx, tz) * 0.8, real ? key : null]); }
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
  const WALLS = ['#f1ece2', '#e9dcc3', '#b65a3e', '#a24a34', '#d9cdb6', '#f4f1ea', '#c47a5a', '#e4d6bd'], ROOFS = ['#c4552f', '#b8482a', '#d0663a', '#a8432a', '#5e5a58'];
  const wallM = new THREE.MeshStandardMaterial({ roughness: 0.9 }), roofM = new THREE.MeshStandardMaterial({ roughness: 0.75, side: THREE.DoubleSide });
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const prism = new THREE.BufferGeometry(); {   // unit gable roof: ridge along x
    const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0.5, 0, 0.5], D = [-0.5, 0, 0.5], E = [-0.5, 1, 0], F = [0.5, 1, 0];
    const v = [A, F, B, A, E, F, C, F, E, C, E, D, D, E, A, B, F, C].flat();
    prism.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); prism.computeVertexNormals();
  }
  const W = new THREE.InstancedMesh(box, wallM, houses.length), Rf = new THREE.InstancedMesh(prism, roofM, houses.length), Fl = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ color: 0xcfcbc3, roughness: 0.9 }), houses.length);
  let nr = 0, nf = 0; const byKey = new Map(), note = (key, mesh, i) => { if (!key) return; if (!byKey.has(key)) byKey.set(key, []); byKey.get(key).push([mesh, i]); };
  houses.forEach((hs, i) => {
    q.setFromEuler(e.set(0, hs.rot, 0));
    m.compose(p.set(hs.x, 0, hs.z), q, s.set(hs.w, hs.h, hs.d)); W.setMatrixAt(i, m); note(hs.key, W, i);
    c.set(hs.flat ? (hs.c < 0.5 ? '#d9d4ca' : '#b9b3a8') : WALLS[Math.floor(hs.c * WALLS.length)]); W.setColorAt(i, c);
    if (hs.flat) { m.compose(p.set(hs.x, hs.h, hs.z), q, s.set(hs.w + 0.2, 0.25, hs.d + 0.2)); note(hs.key, Fl, nf); Fl.setMatrixAt(nf++, m); }
    else { m.compose(p.set(hs.x, hs.h, hs.z), q, s.set(hs.w + 0.6, hs.d * 0.62, hs.d + 0.6)); Rf.setMatrixAt(nr, m); note(hs.key, Rf, nr); c.set(ROOFS[Math.floor(hash(hs.x, hs.z) * ROOFS.length)]); Rf.setColorAt(nr++, c); }
  });
  Rf.count = nr; Fl.count = nf;
  const crown = new THREE.IcosahedronGeometry(1, 1), trunk = new THREE.CylinderGeometry(0.25, 0.35, 1, 5).translate(0, 0.5, 0);
  const T = new THREE.InstancedMesh(crown, new THREE.MeshStandardMaterial({ roughness: 0.9 }), trees.length), Tk = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: 0x4a3a2c }), trees.length);
  trees.forEach(([x, z, k, key], i) => { note(key, T, i); note(key, Tk, i);
    m.compose(p.set(x, 6.5 * k, z), q.identity(), s.set(4 * k, 3.6 * k, 4 * k)); T.setMatrixAt(i, m); c.setHSL(0.25 + (hash(x, z) - 0.5) * 0.05, 0.42, 0.22 + hash(z, x) * 0.08); T.setColorAt(i, c);
    m.compose(p.set(x, 0, z), q.identity(), s.set(k, 4 * k, k)); Tk.setMatrixAt(i, m);
  });
  for (const o of [W, Rf, Fl, T, Tk]) { o.receiveShadow = true; o.castShadow = false; scene.add(o); }
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  return { houses: houses.length, trees: trees.length,
    hideTile(key) { const l = byKey.get(key); if (!l) return; for (const [mesh, i] of l) { mesh.setMatrixAt(i, zero); mesh.instanceMatrix.needsUpdate = true; } byKey.delete(key); } };
}
