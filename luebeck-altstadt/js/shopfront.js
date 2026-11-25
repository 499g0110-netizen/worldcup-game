// 3D shop-front dressing for shopping streets, modelled on the reference photos (Niederegger, Breite Straße):
// raised sign boards with serif lettering, window flower boxes, striped awnings over bakeries and cafés,
// and flags on angled poles. Shop kind per 3-bay unit = (unit*3 + wallKind) % 7, identical to the facade shader.
import * as THREE from 'three';
import { Acc, frameBox } from './city.js';

// generic German trade names (no real brands)
export const KINDS = [
  { de: 'BÄCKEREI', bg: '#6e4420', fg: '#f3d9a6', awn: [0xf1ece0, 0x8a2f24] },
  { de: 'MODE', bg: '#141416', fg: '#e8e2d4' },
  { de: 'BUCHHANDLUNG', bg: '#1f3a30', fg: '#e3c47a' },
  { de: 'CAFÉ', bg: '#5a1f18', fg: '#f1e2c0', awn: [0xf1ece0, 0x2f4a3a] },
  { de: 'BLUMEN', bg: '#33522f', fg: '#f4efe4' },
  { de: 'KAUFHAUS', bg: '#e9e6df', fg: '#1d2230' },
  { de: 'SCHUHE', bg: '#1c4a6b', fg: '#f4efe4' },
];

let signMat = null;
function signMaterial() {
  if (signMat) return signMat;
  const W = 1024, R = 128, cv = document.createElement('canvas'); cv.width = W; cv.height = R * KINDS.length;
  const g = cv.getContext('2d');
  KINDS.forEach((k, i) => {
    const y = i * R;
    g.fillStyle = k.bg; g.fillRect(0, y, W, R);
    g.strokeStyle = k.fg; g.globalAlpha = 0.55; g.lineWidth = 3; g.strokeRect(10, y + 10, W - 20, R - 20); g.globalAlpha = 1;
    g.fillStyle = k.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `600 ${k.de.length > 9 ? 62 : 74}px Georgia, "Times New Roman", serif`;
    // letter-spaced capitals like the Niederegger fascia
    const txt = k.de.split('').join(' ');
    g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowOffsetY = 3; g.shadowBlur = 4;
    g.fillText(txt, W / 2, y + R / 2 + 4); g.shadowColor = 'transparent';
  });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  signMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
  return signMat;
}
const detailMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
const h = (n) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
const C = (hex) => new THREE.Color(hex);
const FLOWERS = [0xd23a3a, 0xf4f1ea, 0xe86f9a, 0xd23a3a, 0xf2c14a].map(C), LEAF = C(0x3f6b2e), TROUGH = C(0x6b4a2a), BRASS = C(0xb8923a), IRON = C(0x24282b), POT = C(0xa88838);

export function buildShopfronts(list) {
  if (!list.length) return [];
  const sign = new Acc(), det = new Acc(), white = C(0xffffff);
  for (const f of list) {
    const { x1, z1, ux, uz, nb, scale, wk, minH } = f, bw = 1 / scale;
    // outward = (uz, -ux); frameBox's +n points inward, so protrusions use negative n
    const quad = (A, B, Cc, D, ua, ub, uc, ud) => { sign.tri(A, B, Cc, ua, ub, uc, white); sign.tri(A, Cc, D, ua, uc, ud, white); };
    const P = (a, y, d) => [x1 + ux * a + uz * d, y, z1 + uz * a - ux * d];
    for (let k0 = 0; k0 < nb; k0 += 3) {
      const unit = k0 / 3, kind = (unit * 3 + wk) % 7, K = KINDS[kind];
      const a0 = k0 * bw + 0.12, a1 = Math.min(nb, k0 + 3) * bw - 0.12; if (a1 - a0 < 1.2) continue;
      const y0 = minH + 2.48, y1 = minH + 2.98, d = 0.1;
      // board body (dark edge) + lettered face
      frameBox(det, x1, 0, z1, ux, uz, a0 - 0.04, a1 + 0.04, y0 - 0.04, y1 + 0.04, -d + 0.01, 0, C(K.bg).multiplyScalar(0.6));
      const v0 = 1 - (kind + 1) / KINDS.length, v1 = 1 - kind / KINDS.length;
      quad(P(a0, y0, d), P(a1, y0, d), P(a1, y1, d), P(a0, y1, d), [1, v0], [0, v0], [0, v1], [1, v1]);   // u reversed: wall tangent runs right-to-left seen from the street
      // brass lamp bracket over the sign
      for (const a of [a0 + 0.4, a1 - 0.4]) { frameBox(det, x1, 0, z1, ux, uz, a - 0.012, a + 0.012, y1 + 0.2, y1 + 0.23, -0.4, 0, IRON); frameBox(det, x1, 0, z1, ux, uz, a - 0.06, a + 0.06, y1 + 0.12, y1 + 0.2, -0.44, -0.34, IRON); }   // slim gooseneck lamps
      // pilasters framing the shop
      for (const a of [a0 - 0.12, a1 + 0.04]) frameBox(det, x1, 0, z1, ux, uz, a, a + 0.08, minH, minH + 2.44, -0.07, 0, C(0xe9e4da).multiplyScalar(f.brick ? 0.75 : 1));
      // awning for bakeries and cafés: striped canvas sloping out over the windows
      if (K.awn) {
        const out = 1.35, ya = minH + 2.42, yb = minH + 2.02, st = 0.32;
        for (let a = a0, n = 0; a < a1 - 1e-3; a += st, n++) {
          const b = Math.min(a1, a + st), col = C(K.awn[n % 2]);
          det.tri(P(a, ya, 0.02), P(b, ya, 0.02), P(b, yb, out), [0, 0], [1, 0], [1, 1], col); det.tri(P(a, ya, 0.02), P(b, yb, out), P(a, yb, out), [0, 0], [1, 1], [0, 1], col);
          det.tri(P(a, yb, out), P(b, yb, out), P(b, yb - 0.22, out), [0, 0], [1, 0], [1, 1], col); det.tri(P(a, yb, out), P(b, yb - 0.22, out), P(a, yb - 0.22, out), [0, 0], [1, 1], [0, 1], col);   // valance
        }
      }
      // brass-trimmed potted shrubs beside the door, like the Niederegger entrance
      if (h(f.seed * 9 + unit) < 0.55) for (const a of [a0 + 0.3, a1 - 0.3]) {
        frameBox(det, x1, 0, z1, ux, uz, a - 0.13, a + 0.13, minH, minH + 0.42, -0.42, -0.16, POT);
        for (const [w, y0, y1] of [[0.17, 0.42, 0.62], [0.2, 0.55, 0.78], [0.13, 0.75, 0.88]]) frameBox(det, x1, 0, z1, ux, uz, a - w, a + w, minH + y0, minH + y1, -0.29 - w, -0.29 + w, LEAF);   // rounded box-tree
      }
    }
    // flower boxes under every first-floor window
    if (f.eave - minH > 5.5) for (let k = 0; k < nb; k++) {
      const c = (k + 0.5) * bw, hw = 0.42 * bw * 0.95, y = minH + 3.2 + 0.86 - 0.02;
      frameBox(det, x1, 0, z1, ux, uz, c - hw, c + hw, y - 0.18, y, -0.26, -0.02, TROUGH);
      const n = Math.max(4, Math.round(hw * 9));
      for (let j = 0; j < n; j++) {
        const a = c - hw + (j + 0.5) * (2 * hw / n), r = h(f.seed + k * 13 + j), fc = FLOWERS[Math.floor(r * FLOWERS.length)];
        frameBox(det, x1, 0, z1, ux, uz, a - 0.05, a + 0.05, y, y + 0.12 + r * 0.06, -0.2, -0.06, LEAF);
        frameBox(det, x1, 0, z1, ux, uz, a - 0.045, a + 0.045, y + 0.1 + r * 0.06, y + 0.17 + r * 0.06, -0.21 - r * 0.04, -0.09, fc);
      }
    }
    // flag on an angled pole (Lübeck colours: white over red) on some shop buildings
    if (h(f.seed * 5) < 0.45 && f.eave - minH > 5.5) {
      const a = f.L * (0.25 + h(f.seed * 7) * 0.5), base = P(a, minH + 3.6, 0), tip = P(a, minH + 4.6, 1.3);
      const pole = new THREE.Vector3(...tip).sub(new THREE.Vector3(...base)); const L = pole.length(); pole.normalize();
      // pole as a thin quad box along its axis
      const side = new THREE.Vector3(ux, 0, uz).multiplyScalar(0.025), up = new THREE.Vector3().crossVectors(pole, side).normalize().multiplyScalar(0.025);
      const B0 = new THREE.Vector3(...base), B1 = new THREE.Vector3(...tip);
      for (const [s1, s2] of [[side, up], [up, side.clone().negate()], [side.clone().negate(), up.clone().negate()], [up.clone().negate(), side]]) {
        const p1 = B0.clone().add(s1), p2 = B0.clone().add(s2), p3 = B1.clone().add(s2), p4 = B1.clone().add(s1);
        det.tri(p1.toArray(), p2.toArray(), p3.toArray(), [0, 0], [1, 0], [1, 1], IRON); det.tri(p1.toArray(), p3.toArray(), p4.toArray(), [0, 0], [1, 1], [0, 1], IRON);
      }
      // flag hangs from the outer half of the pole, slight sag
      const fw = 0.9, fh = 0.6, s0 = B0.clone().addScaledVector(pole, L * 0.35), s1 = B1.clone();
      const top0 = s0.toArray(), top1 = s1.toArray(), mid0 = s0.clone().add(new THREE.Vector3(0, -fh / 2, 0)).toArray(), mid1 = s1.clone().add(new THREE.Vector3(0.05, -fh / 2, 0)).toArray(), bot0 = s0.clone().add(new THREE.Vector3(0, -fh, 0)).toArray(), bot1 = s1.clone().add(new THREE.Vector3(0.1, -fh, 0)).toArray();
      const Wc = C(0xf4f1ea), Rc = C(0xb0242a); void fw;
      det.tri(top0, top1, mid1, [0, 0], [1, 0], [1, 1], Wc); det.tri(top0, mid1, mid0, [0, 0], [1, 1], [0, 1], Wc);
      det.tri(mid0, mid1, bot1, [0, 0], [1, 0], [1, 1], Rc); det.tri(mid0, bot1, bot0, [0, 0], [1, 1], [0, 1], Rc);
    }
  }
  const out = [];
  if (sign.p.length) { const g = sign.geo(); g.deleteAttribute('color'); const m = new THREE.Mesh(g, signMaterial()); m.receiveShadow = true; out.push(m); }
  if (det.p.length) { const m = new THREE.Mesh(det.geo(), detailMat); m.castShadow = true; m.receiveShadow = true; out.push(m); }
  return out;
}
