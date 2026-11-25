// Park furniture from OpenStreetMap: wooden benches on iron frames at every amenity=bench node, and playgrounds
// (leisure=playground) with a sand area, swing set, slide with ladder, climbing frame and seesaw.
import * as THREE from 'three';

const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.75 }), iron = new THREE.MeshStandardMaterial({ color: 0x2a3330, roughness: 0.5, metalness: 0.6 });
const sand = new THREE.MeshStandardMaterial({ color: 0xd9c49a, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
const red = new THREE.MeshStandardMaterial({ color: 0xc8402e, roughness: 0.5 }), blue = new THREE.MeshStandardMaterial({ color: 0x2f6ab0, roughness: 0.5 }), yel = new THREE.MeshStandardMaterial({ color: 0xf0c030, roughness: 0.5 });
const steel = new THREE.MeshStandardMaterial({ color: 0xb8bec4, roughness: 0.3, metalness: 0.8 });
let benchGeos = null;
function benchParts() {
  if (benchGeos) return benchGeos;
  const slats = [], frame = [];
  for (let i = 0; i < 4; i++) slats.push(new THREE.BoxGeometry(1.8, 0.035, 0.09).translate(0, 0.45, -0.18 + i * 0.11));
  for (let i = 0; i < 3; i++) slats.push(new THREE.BoxGeometry(1.8, 0.09, 0.035).rotateX(-0.25).translate(0, 0.62 + i * 0.12, -0.27 - i * 0.03));
  for (const x of [-0.75, 0.75]) { frame.push(new THREE.BoxGeometry(0.05, 0.45, 0.05).translate(x, 0.22, 0.12), new THREE.BoxGeometry(0.05, 0.9, 0.05).rotateX(-0.2).translate(x, 0.44, -0.25), new THREE.BoxGeometry(0.05, 0.05, 0.45).translate(x, 0.43, -0.05)); }
  const merge = (list) => { const pos = [], nor = []; for (let g of list) { g = g.index ? g.toNonIndexed() : g; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); } const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return o; };
  benchGeos = [merge(slats), merge(frame)]; for (const g of benchGeos) g.userData.shared = true; return benchGeos;
}
export function buildBenches(scene, benches, yawAt) {
  if (!benches.length) return;
  const [gs, gf] = benchParts(), S = new THREE.InstancedMesh(gs, wood, benches.length), F = new THREE.InstancedMesh(gf, iron, benches.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  benches.forEach(([x, z], i) => { q.setFromAxisAngle(up, yawAt(x, z)); m.compose(p.set(x, 0, z), q, one); S.setMatrixAt(i, m); F.setMatrixAt(i, m); });
  S.castShadow = F.castShadow = true; S.receiveShadow = true; scene.add(S, F);
}
export function buildPlayground(scene, o, seed = 1) {
  const n = o.length / 2; if (n < 3) return null;
  const sh = new THREE.Shape(); for (let i = 0; i < n; i++) (i ? sh.lineTo : sh.moveTo).call(sh, o[2 * i], o[2 * i + 1]);
  const g = new THREE.ShapeGeometry(sh); g.rotateX(Math.PI / 2); g.translate(0, 0.03, 0);
  const ground = new THREE.Mesh(g, sand); ground.receiveShadow = true; scene.add(ground);
  let cx = 0, cz = 0; for (let i = 0; i < n; i++) { cx += o[2 * i]; cz += o[2 * i + 1]; } cx /= n; cz /= n;
  let r = 1e9; for (let i = 0; i < n; i++) r = Math.min(r, Math.hypot(o[2 * i] - cx, o[2 * i + 1] - cz));
  const G = new THREE.Group(); G.position.set(cx, 0, cz); G.rotation.y = (seed * 2.399) % 6.28; scene.add(G);
  const box = (w, h, d, mat, x, y, z, rx = 0, rz = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y, z); b.rotation.set(rx, 0, rz); G.add(b); return b; };
  const cyl = (r0, h, mat, x, y, z, rx = 0, rz = 0) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0, h, 8), mat); c.position.set(x, y, z); c.rotation.set(rx, 0, rz); G.add(c); return c; };
  const s = Math.max(0.6, Math.min(1, r / 6));
  // swing set (A-frames + two seats on chains)
  const sx = -2.6 * s; for (const z of [-1.3, 1.3]) { cyl(0.05, 2.5, steel, sx - 0.6, 1.15, z, 0, 0.25); cyl(0.05, 2.5, steel, sx + 0.6, 1.15, z, 0, -0.25); }
  cyl(0.05, 2.8, steel, sx, 2.35, 0, Math.PI / 2); for (const z of [-0.5, 0.5]) { cyl(0.008, 1.8, steel, sx - 0.18, 1.45, z); cyl(0.008, 1.8, steel, sx + 0.18, 1.45, z); box(0.45, 0.04, 0.18, red, sx, 0.55, z); }
  // slide with ladder and platform
  const px = 2.2 * s; for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) cyl(0.05, 1.6, wood, px + x, 0.8, z);
  box(1.0, 0.08, 1.0, wood, px, 1.4, 0); box(1.0, 0.7, 0.04, yel, px, 1.8, -0.5); box(0.6, 0.05, 2.4, blue, px + 1.3, 0.75, 0, 0, -0.58);
  for (let k = 0; k < 5; k++) box(0.6, 0.04, 0.06, wood, px - 0.6, 0.25 + k * 0.28, 0.0);
  // seesaw
  box(0.15, 0.4, 0.15, iron, 0, 0.2, 2.6 * s); box(0.25, 0.06, 3.0, red, 0, 0.42, 2.6 * s, 0.12);
  // climbing frame
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { cyl(0.025, 1.2, steel, -0.6 + i * 0.4, 0.6, -2.6 * s - 0.4 + j * 0.4); cyl(0.025, 1.2, steel, -0.6 + i * 0.4, 0.4 + j * 0.4, -2.6 * s, Math.PI / 2); }
  G.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  return G;
}
