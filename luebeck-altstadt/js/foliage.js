// Foliage: lime / chestnut style tree crowns built from hundreds of cut-out leaf cards (alpha-tested leaf
// texture painted on a canvas, normals pointing out of the crown so it shades like a rounded mass, wind sway),
// and a field of grass tufts that follows the player over lawns.
import * as THREE from 'three';

const hash = (n) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };

/* ------------------------------------------------------------ leaf atlas (2×2 variants) */
let leafTex = null;
function leafAtlas() {
  if (leafTex) return leafTex;
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
  const pal = ['#2f5524', '#3b6a2b', '#4a7c31', '#5a8d39', '#6c9c44', '#7fae52', '#365f27', '#8fbb5e'];
  let s = 11; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let q = 0; q < 4; q++) {
    const ox = (q % 2) * S / 2, oy = Math.floor(q / 2) * S / 2, H = S / 2;
    // twigs
    g.strokeStyle = '#4a3a28'; g.lineWidth = 2;
    for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(ox + H / 2, oy + H * 0.95); g.quadraticCurveTo(ox + H * (0.2 + r() * 0.6), oy + H * 0.6, ox + H * (0.1 + r() * 0.8), oy + H * (0.1 + r() * 0.4)); g.stroke(); }
    // leaves: denser in the middle, thinning to a ragged edge so cards never show square outlines
    for (let i = 0; i < 260; i++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * H * 0.46, x = ox + H / 2 + Math.cos(a) * d, y = oy + H / 2 + Math.sin(a) * d * 0.9;
      const L = 9 + r() * 9, W = L * (0.45 + r() * 0.2), rot = r() * Math.PI * 2, shade = Math.min(pal.length - 1, Math.floor(r() * pal.length * (1.15 - d / H)));
      g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = pal[Math.max(0, shade)];
      g.beginPath(); g.moveTo(-L, 0); g.quadraticCurveTo(0, -W, L, 0); g.quadraticCurveTo(0, W, -L, 0); g.fill();
      g.strokeStyle = 'rgba(20,40,10,0.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-L * 0.9, 0); g.lineTo(L * 0.9, 0); g.stroke();
      g.restore();
    }
  }
  leafTex = new THREE.CanvasTexture(cv); leafTex.colorSpace = THREE.SRGBColorSpace; leafTex.anisotropy = 4; leafTex.generateMipmaps = true;
  return leafTex;
}

export const foliageU = { uTime: { value: 0 } };
let leafMat = null;
function leafMaterial() {
  if (leafMat) return leafMat;
  leafMat = new THREE.MeshStandardMaterial({ map: leafAtlas(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.78, vertexColors: true });
  leafMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = foliageU.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; attribute float aSway;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = position.x * 0.21 + position.z * 0.17;
        transformed.x += (sin(uTime * 1.6 + ph) * 0.09 + sin(uTime * 4.3 + ph * 3.0) * 0.025) * aSway;
        transformed.z += (cos(uTime * 1.3 + ph) * 0.07) * aSway; transformed.y += sin(uTime * 3.1 + ph * 2.0) * 0.02 * aSway;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * 0.12;   // light scattering through the leaves`);
  };
  leafMat.customProgramCacheKey = () => 'leafcards';
  return leafMat;
}

// trees: [[x, z], ...]; returns one merged mesh of leaf cards for the whole set
export function buildLeafCrowns(trees, { touch = false } = {}) {
  const N = touch ? 34 : 70, pos = [], nor = [], uv = [], col = [], sway = [], idx = [];
  const c = new THREE.Color(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), n = new THREE.Vector3(), a1 = new THREE.Vector3(), a2 = new THREE.Vector3();
  for (const [x, z] of trees) {
    const k = 0.8 + ((Math.sin(x * 12.9 + z * 78.2) * 43758.5) % 1 + 1) % 1 * 0.6, cy = 6.4 * k, Rx = 3.4 * k, Ry = 2.9 * k;
    const hue = 0.23 + (hash(x + z) - 0.5) * 0.04, lum = 0.36 + hash(x * 3.1) * 0.1;
    for (let i = 0; i < N; i++) {
      const s0 = x * 7.3 + z * 1.7 + i * 13.1;
      // point in the crown shell, biased to the surface, flatter underneath
      const th = hash(s0) * Math.PI * 2, ph = Math.acos(1 - 2 * hash(s0 + 1) * (hash(s0 + 5) < 0.75 ? 0.82 : 1)), rr = 0.62 + 0.38 * Math.sqrt(hash(s0 + 2));
      n.set(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
      const px = x + n.x * Rx * rr, py = cy + n.y * Ry * rr * (n.y < 0 ? 0.75 : 1), pz = z + n.z * Rx * rr;
      const sz = (1.5 + hash(s0 + 3) * 0.9) * k;
      const variant = Math.floor(hash(s0 + 4) * 4), u0 = (variant % 2) * 0.5, v0 = Math.floor(variant / 2) * 0.5;
      // shading normal: outward from the crown centre, nudged up (sky light)
      v.copy(n).multiplyScalar(0.8).addScaledVector(up, 0.35).normalize();
      const shade = 0.75 + 0.25 * n.y + (rr - 0.8) * 0.4;
      c.setHSL(hue + (hash(s0 + 6) - 0.5) * 0.03, 0.42, lum * shade);
      // two crossed quads with a random spin
      const rot = hash(s0 + 7) * Math.PI;
      for (let q = 0; q < 2; q++) {
        const ang = rot + q * Math.PI / 2, tilt = (hash(s0 + 8 + q) - 0.5) * 0.9;
        a1.set(Math.cos(ang), 0, Math.sin(ang)).multiplyScalar(sz / 2); a2.set(-Math.sin(ang) * Math.sin(tilt), Math.cos(tilt), Math.cos(ang) * Math.sin(tilt)).multiplyScalar(sz / 2);
        const b = pos.length / 3;
        for (const [sx, sy, uu, vv] of [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]]) {
          pos.push(px + a1.x * sx + a2.x * sy, py + a1.y * sx + a2.y * sy, pz + a1.z * sx + a2.z * sy);
          nor.push(v.x, v.y, v.z); uv.push(u0 + uu * 0.5, v0 + vv * 0.5); col.push(c.r, c.g, c.b); sway.push(0.4 + (py - cy + Ry) / (2 * Ry));
        }
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('aSway', new THREE.Float32BufferAttribute(sway, 1));
  g.setIndex(idx); g.computeBoundingSphere();
  const m = new THREE.Mesh(g, leafMaterial()); m.castShadow = true; m.receiveShadow = true;
  return m;
}

/* ------------------------------------------------------------ grass tufts that follow the player */
export class GrassField {
  constructor(scene, isGrass, { touch = false } = {}) {
    this.isGrass = isGrass; this.R = touch ? 11 : 19; this.cell = touch ? 0.42 : 0.3; this.cx = 1e9; this.cz = 1e9;
    const cap = Math.ceil((2 * this.R / this.cell) ** 2 * 0.8);
    // one tuft = 5 curved blades
    const pos = [], uv = [], idx = [];
    for (let b = 0; b < 5; b++) {
      const a = b / 5 * Math.PI * 2 + 0.4, ox = Math.cos(a) * 0.05, oz = Math.sin(a) * 0.05, h = 0.1 + (b % 3) * 0.045, w = 0.017, lean = 0.05 + (b % 2) * 0.04, dx = Math.cos(a) * lean, dz = Math.sin(a) * lean;
      const base = pos.length / 3, px = -Math.sin(a) * w, pz = Math.cos(a) * w;
      for (let s = 0; s <= 3; s++) { const t = s / 3, ww = 1 - t * 0.9, cx = ox + dx * t * t, cz = oz + dz * t * t; pos.push(cx - px * ww, h * t, cz - pz * ww, cx + px * ww, h * t, cz + pz * ww); uv.push(0, t, 1, t); }
      for (let s = 0; s < 3; s++) { const i0 = base + s * 2; idx.push(i0, i0 + 1, i0 + 3, i0, i0 + 3, i0 + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3)); g.setIndex(idx);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9ccf7a, roughness: 0.9, side: THREE.DoubleSide });
    this.U = { uTime: foliageU.uTime, uC: { value: new THREE.Vector2() }, uR: { value: this.R } };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform vec2 uC; uniform float uR; varying float vH;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec3 ip = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
          float fade = 1.0 - smoothstep(uR * 0.6, uR, distance(ip.xz, uC));
          transformed.y *= fade; vH = uv.y;
          float w = sin(uTime * 1.9 + ip.x * 0.35 + ip.z * 0.27) * 0.6 + sin(uTime * 4.7 + ip.x * 1.3) * 0.25;
          transformed.x += w * 0.07 * uv.y * uv.y; transformed.z += w * 0.05 * uv.y * uv.y;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vH;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.55, 1.05, vH);');
    };
    mat.customProgramCacheKey = () => 'grassblades';
    this.mesh = new THREE.InstancedMesh(g, mat, cap); this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.receiveShadow = true;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.cap = cap; this.cache = new Map(); scene.add(this.mesh);
  }
  grassAt(x, z) {   // cached per 2 m cell
    const k = Math.floor(x / 2) * 100003 + Math.floor(z / 2);
    let v = this.cache.get(k); if (v === undefined) { if (this.cache.size > 60000) this.cache.clear(); v = this.isGrass(Math.floor(x / 2) * 2 + 1, Math.floor(z / 2) * 2 + 1); this.cache.set(k, v); }
    return v;
  }
  update(px, pz) {
    this.U.uC.value.set(px, pz);
    if (Math.hypot(px - this.cx, pz - this.cz) < 3) return;
    this.cx = px; this.cz = pz;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
    const C = this.cell, R = this.R; let n = 0;
    for (let gx = Math.floor((px - R) / C); gx <= Math.floor((px + R) / C); gx++) for (let gz = Math.floor((pz - R) / C); gz <= Math.floor((pz + R) / C); gz++) {
      const h1 = hash(gx * 3.17 + gz * 11.3), h2 = hash(gx * 7.7 - gz * 2.3), x = (gx + h1) * C, z = (gz + h2) * C;
      if ((x - px) ** 2 + (z - pz) ** 2 > R * R || n >= this.cap) continue;
      if (!this.grassAt(x, z)) continue;
      const sc = 0.65 + hash(gx + gz * 5.1) * 0.6;
      m.compose(p.set(x, 0, z), q.setFromEuler(e.set(0, h1 * 6.28, 0)), s.set(sc, sc * (0.8 + h2 * 0.6), sc)); this.mesh.setMatrixAt(n, m);
      c.setHSL(0.23 + (h1 - 0.5) * 0.05, 0.3, 0.34 + (h2 - 0.5) * 0.12); this.mesh.setColorAt(n, c); n++;
    }
    this.mesh.count = n; this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true;
  }
}
