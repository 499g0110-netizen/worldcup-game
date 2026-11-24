// Near-LOD 3D window & door units: recessed reveals, real frame depth, mullions, stone sills, glass.
// Placed on the same bay grid the facade shader cuts out (materials.js), only within uCut metres.
import * as THREE from 'three';

function unitGeometries() {
  // local: x ∈ [-.5,.5] (scaled by window width), y ∈ [0,1] (scaled by height), z = out of wall (metres, unscaled)
  const D = 0.24, rev = new THREE.BufferGeometry(), frame = [], glass = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, -D + 0.04);
  const q = (pts, nrm) => pts.map((p) => [...p, ...nrm]);
  const revQuads = [
    ...q([[-.5, 0, 0], [-.5, 0, -D], [-.5, 1, -D], [-.5, 1, 0]], [1, 0, 0]),
    ...q([[.5, 0, 0], [.5, 1, 0], [.5, 1, -D], [.5, 0, -D]], [-1, 0, 0]),
    ...q([[-.5, 1, 0], [-.5, 1, -D], [.5, 1, -D], [.5, 1, 0]], [0, -1, 0]),
    ...q([[-.5, 0, 0], [.5, 0, 0], [.5, 0, -D], [-.5, 0, -D]], [0, 1, 0]),
  ];
  const pos = [], nor = [], idx = [];
  for (let i = 0; i < revQuads.length; i += 4) { const b = pos.length / 3; for (let k = 0; k < 4; k++) { pos.push(...revQuads[i + k].slice(0, 3)); nor.push(...revQuads[i + k].slice(3)); } idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  rev.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rev.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); rev.setIndex(idx);
  // sill: stone slab sticking out of the wall
  const sill = new THREE.BoxGeometry(1.12, 0.035, 0.3).translate(0, -0.012, -0.03);
  const revFull = mergeGeos([rev, sill]);
  // frame ring + mullion + transom (painted wood), sits in the reveal
  const fz = -D + 0.07, fd = 0.07, b = 0.06;
  const box = (w, h, x, y) => new THREE.BoxGeometry(w, h, fd).translate(x, y, fz);
  frame.push(box(1, b / 1.7, 0, b / 3.4), box(1, b / 1.7, 0, 1 - b / 3.4), box(b, 1, -.5 + b / 2, .5), box(b, 1, .5 - b / 2, .5), box(b * .8, 1, 0, .5), box(1, b / 2, 0, .64));
  return { rev: revFull, frame: mergeGeos(frame), glass };
}
function doorGeometries() {
  const D = 0.32, pieces = [];
  const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  // reveal walls + lintel
  const rev = [box(0.04, 1, D, -.5, .5, -D / 2), box(0.04, 1, D, .5, .5, -D / 2), box(1.04, 0.03, D, 0, 1, -D / 2), box(1.3, 0.07, 0.55, 0, 0.035, 0.12)];
  // door leaf with raised panels
  pieces.push(box(1, 1, 0.06, 0, .5, -D + 0.05));
  for (const y of [.18, .5, .8]) for (const x of [-.22, .22]) pieces.push(box(.34, .2, .035, x, y, -D + 0.09));
  pieces.push(box(0.04, 0.03, 0.08, .38, .45, -D + 0.12));
  return { rev: mergeGeos(rev), leaf: mergeGeos(pieces) };
}
function mergeGeos(list) {
  const pos = [], nor = [], uvs = []; for (let g of list) { g = g.index ? g.toNonIndexed() : g; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); if (g.attributes.uv) uvs.push(...g.attributes.uv.array); else uvs.push(...new Array(g.attributes.position.count * 2).fill(0)); }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); return m;
}

export class WindowLOD {
  constructor(scene, windows, doors, { cap = 16000, radius = 140 } = {}) {
    this.windows = windows; this.doors = doors; this.radius = radius; this.cap = cap;
    const g = unitGeometries(), dg = doorGeometries();
    this.revMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d8, roughness: 0.85 });
    this.frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });
    this.glassMat = new THREE.MeshPhysicalMaterial({ color: 0x9fb0bb, roughness: 0.04, metalness: 0.15, envMapIntensity: 1.4, emissive: 0xffa860, emissiveIntensity: 0 });
    this.glassMat.onBeforeCompile = (sh) => { // per-instance lit window at night (instanceColor.r = lit)
      sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance *= vColor.r; diffuseColor.rgb = vec3(0.62,0.69,0.73) * (1.0 - vColor.r * 0.5);\n#endif');
    };
    this.doorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
    const mk = (geo, mat, n, shadow) => { const m = new THREE.InstancedMesh(geo, mat, n); m.count = 0; m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); return m; };
    this.rev = mk(g.rev, this.revMat, cap, false); this.frame = mk(g.frame, this.frameMat, cap, true); this.glass = mk(g.glass, this.glassMat, cap, false);
    this.drev = mk(dg.rev, this.revMat, 3000, true); this.dleaf = mk(dg.leaf, this.doorMat, 3000, true);
    // spatial grid
    this.G = 48; this.grid = new Map();
    windows.forEach((w, i) => { const k = Math.floor(w.x / this.G) + ',' + Math.floor(w.z / this.G); if (!this.grid.has(k)) this.grid.set(k, []); this.grid.get(k).push(i); });
    this.dgrid = new Map(); doors.forEach((w, i) => { const k = Math.floor(w.x / this.G) + ',' + Math.floor(w.z / this.G); if (!this.dgrid.has(k)) this.dgrid.set(k, []); this.dgrid.get(k).push(i); });
    this.last = null; this.night = 0;
  }
  setNight(v) { this.night = v; this.glassMat.emissiveIntensity = v ? 2.2 : 0; this.last = null; }
  update(px, pz, force) {
    const key = Math.floor(px / 16) + ',' + Math.floor(pz / 16);
    if (key === this.last && !force) return; this.last = key;
    if (this.radius <= 0) { for (const m of [this.rev, this.frame, this.glass, this.drev, this.dleaf]) m.count = 0; return; }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color(), Y = new THREE.Vector3(0, 1, 0);
    const FR = [new THREE.Color(0xf4f2ee), new THREE.Color(0xf4f2ee), new THREE.Color(0xf4f2ee), new THREE.Color(0x2f4a3a), new THREE.Color(0x5a3a28)];
    const r = Math.ceil(this.radius / this.G), gx = Math.floor(px / this.G), gz = Math.floor(pz / this.G), R2 = this.radius * this.radius;
    let n = 0, nd = 0;
    for (let ix = gx - r; ix <= gx + r; ix++) for (let iz = gz - r; iz <= gz + r; iz++) {
      for (const i of this.grid.get(ix + ',' + iz) || []) {
        if (n >= this.cap) break;
        const w = this.windows[i]; if ((w.x - px) ** 2 + (w.z - pz) ** 2 > R2) continue;
        q.setFromAxisAngle(Y, Math.atan2(w.nx, w.nz));
        m.compose(p.set(w.x, w.y + 0.864, w.z), q, s.set(w.w, 1.696, 1));
        this.rev.setMatrixAt(n, m); this.frame.setMatrixAt(n, m); this.glass.setMatrixAt(n, m);
        this.rev.setColorAt(n, c.copy(w.tint).lerp(new THREE.Color(0xe6e0d6), 0.55));
        this.frame.setColorAt(n, FR[Math.floor(w.seed * 5) % 5]);
        this.glass.setColorAt(n, c.setRGB(this.night && w.seed > 0.55 ? 1 : 0, 0, 0));
        n++;
      }
      for (const i of this.dgrid.get(ix + ',' + iz) || []) {
        const w = this.doors[i]; if ((w.x - px) ** 2 + (w.z - pz) ** 2 > R2) continue;
        q.setFromAxisAngle(Y, Math.atan2(w.nx, w.nz));
        m.compose(p.set(w.x, 0, w.z), q, s.set(w.w, 2.56, 1));
        this.drev.setMatrixAt(nd, m); this.dleaf.setMatrixAt(nd, m);
        this.drev.setColorAt(nd, c.copy(w.tint).lerp(new THREE.Color(0x8f8a84), 0.6));
        this.dleaf.setColorAt(nd, c.set(['#3a2a1f', '#23362c', '#2a3340', '#5a2620', '#4a3a2a'][Math.floor(w.seed * 5) % 5]));
        nd++;
      }
    }
    for (const mesh of [this.rev, this.frame, this.glass]) { mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
    for (const mesh of [this.drev, this.dleaf]) { mesh.count = nd; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
    this.count = n;
  }
}
