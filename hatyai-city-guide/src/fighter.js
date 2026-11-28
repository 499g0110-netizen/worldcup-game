import * as THREE from 'three';

// =====================================================================
//  Detailed procedural fighter: sculpted torso (lathe), muscles, jointed limbs,
//  face, Muay Thai kit (shorts with waistband lettering, mongkol, prajioud,
//  gloves, ankle supports). Pose-blended keyframe animation.
// =====================================================================
const J = ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'shL', 'elL', 'shR', 'elR', 'hipL', 'knL', 'anL', 'hipR', 'knR', 'anR'];

function lathe(prof, seg = 24) { return new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg); }
function limb(len, r0, r1, mat, seg = 14) {
  const g = new THREE.Group();
  const geo = lathe([[0.001, 0], [r1 * 0.9, 0.02], [r1, 0.08], [(r0 + r1) / 2 * 1.08, len * 0.45], [r0, len * 0.88], [r0 * 0.8, len], [0.001, len + 0.02]], seg);
  geo.rotateX(Math.PI); geo.translate(0, len, 0); geo.translate(0, -len, 0);
  const m = new THREE.Mesh(geo, mat); m.position.y = 0; m.rotation.x = Math.PI; m.castShadow = true;
  // lathe built bottom->top; flip so it hangs down from the joint
  m.geometry = lathe([[0.001, 0], [r0 * 0.8, 0.02], [r0, len * 0.12], [(r0 + r1) / 2 * 1.08, len * 0.55], [r1, len * 0.92], [r1 * 0.9, len], [0.001, len + 0.01]], seg);
  m.rotation.x = Math.PI; g.add(m); return g;
}

export class Fighter {
  constructor({ shorts = 0x1d4fb8, trim = 0xffffff, skin = 0xc08860, hair = 0x161210, gloves = 0x1d4fb8, mongkol = true, text = 'มวยไทย', name = '', casual = false, shirt = 0xe8e1cf } = {}) {
    const S = (c, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color: c, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color(0xffd8c0) }, o));
    const skinM = S(skin, { roughness: 0.48, clearcoat: 0.15, clearcoatRoughness: 0.6 });
    const shortsM = new THREE.MeshPhysicalMaterial({ color: shorts, roughness: 0.25, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.3 });
    const trimM = new THREE.MeshStandardMaterial({ color: trim, roughness: 0.3 });
    const gloveM = new THREE.MeshPhysicalMaterial({ color: gloves, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.15 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x141010, roughness: 0.6 });
    const wrapM = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.8 });
    const j = {}; const G = new THREE.Group(); this.group = G; this.j = j;
    const node = (name, parent, x, y, z) => { const n = new THREE.Group(); n.position.set(x, y, z); parent.add(n); j[name] = n; return n; };
    const add = (parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
    node('root', G, 0, 0, 0); node('hips', j.root, 0, 0.98, 0);
    // pelvis + shorts (satin, flared legs) with lettering waistband
    add(j.hips, lathe([[0.001, -0.14], [0.16, -0.13], [0.185, -0.05], [0.175, 0.06], [0.16, 0.1], [0.001, 0.1]], 28), shortsM, 0, 0, 0, 1, 1, 0.78);
    const band = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#' + new THREE.Color(trim).getHexString(); g.fillRect(0, 0, 512, 64); g.fillStyle = '#' + new THREE.Color(shorts).getHexString(); g.font = 'bold 40px "Noto Sans Thai",sans-serif'; g.textAlign = 'center'; g.fillText(text, 256, 46); return c; })());
    band.colorSpace = THREE.SRGBColorSpace;
    if (!casual) add(j.hips, new THREE.CylinderGeometry(0.168, 0.172, 0.075, 28, 1, true), new THREE.MeshStandardMaterial({ map: band, roughness: 0.4, side: THREE.DoubleSide }), 0, 0.075, 0, 1, 1, 0.8);
    // torso
    node('spine', j.hips, 0, 0.1, 0); node('chest', j.spine, 0, 0.18, 0);
    add(j.spine, lathe([[0.001, -0.02], [0.155, -0.02], [0.145, 0.08], [0.15, 0.18], [0.001, 0.2]], 24), skinM, 0, 0, 0, 1, 1, 0.72);   // abdomen
    add(j.chest, lathe([[0.001, -0.02], [0.152, -0.02], [0.17, 0.1], [0.19, 0.22], [0.17, 0.3], [0.08, 0.36], [0.001, 0.37]], 26), skinM, 0, 0, 0, 1.15, 1, 0.66);   // ribcage
    for (const s of [-1, 1]) {
      add(j.chest, new THREE.SphereGeometry(0.085, 16, 12), skinM, s * 0.075, 0.2, 0.075, 1.15, 0.75, 0.55);     // pecs
      add(j.chest, new THREE.SphereGeometry(0.075, 14, 10), skinM, s * 0.2, 0.28, 0, 1, 0.9, 1);                  // deltoids
      add(j.chest, new THREE.SphereGeometry(0.07, 12, 10), skinM, s * 0.11, 0.32, -0.03, 1.2, 0.6, 0.9);          // traps
    }
    for (let r = 0; r < 3; r++) for (const s of [-1, 1]) add(j.spine, new THREE.SphereGeometry(0.035, 10, 8), skinM, s * 0.04, 0.03 + r * 0.055, 0.1, 1, 0.8, 0.5);   // abs
    const shirtM = new THREE.MeshPhysicalMaterial({ color: shirt, roughness: 0.85, sheen: 0.6, sheenColor: new THREE.Color(0xffffff) });
    if (casual) { add(j.spine, lathe([[0.001, -0.05], [0.172, -0.05], [0.16, 0.08], [0.165, 0.2], [0.001, 0.21]], 24), shirtM, 0, 0, 0, 1, 1, 0.75);
      add(j.chest, lathe([[0.001, -0.02], [0.168, -0.02], [0.186, 0.1], [0.205, 0.22], [0.19, 0.3], [0.09, 0.355], [0.001, 0.36]], 26), shirtM, 0, 0, 0, 1.16, 1, 0.7);
      const bp = new THREE.MeshStandardMaterial({ color: 0x6a3a22, roughness: 0.75 }); add(j.chest, new THREE.CapsuleGeometry(0.1, 0.12, 6, 14), bp, 0, 0.16, -0.15, 1.1, 1, 0.55);
      for (const s of [-1, 1]) { const st = add(j.chest, new THREE.TorusGeometry(0.09, 0.012, 6, 16, Math.PI), bp, s * 0.09, 0.26, -0.06); st.rotation.y = Math.PI / 2; } }
    // neck + head with face
    node('neck', j.chest, 0, 0.35, -0.01);
    add(j.neck, new THREE.CylinderGeometry(0.055, 0.065, 0.1, 14), skinM, 0, 0.04, 0);
    node('head', j.neck, 0, 0.09, 0);
    const skull = add(j.head, new THREE.SphereGeometry(0.105, 28, 22), skinM, 0, 0.1, 0, 0.92, 1.12, 1.0);
    add(j.head, new THREE.SphereGeometry(0.08, 20, 14), skinM, 0, 0.035, 0.03, 0.95, 0.75, 0.95);        // jaw
    add(j.head, new THREE.SphereGeometry(0.108, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.45), new THREE.MeshStandardMaterial({ color: hair, roughness: 0.85 }), 0, 0.125, -0.008, 0.94, 1.05, 1.02);   // short hair
    const eyeW = new THREE.MeshStandardMaterial({ color: 0xf2eee8, roughness: 0.3 });
    for (const s of [-1, 1]) {
      add(j.head, new THREE.SphereGeometry(0.016, 10, 8), eyeW, s * 0.036, 0.11, 0.088, 1.3, 0.75, 0.5);
      add(j.head, new THREE.SphereGeometry(0.009, 8, 6), dark, s * 0.036, 0.11, 0.096);
      add(j.head, new THREE.BoxGeometry(0.04, 0.008, 0.012), dark, s * 0.037, 0.135, 0.092).rotation.z = -s * 0.15;    // brows
      add(j.head, new THREE.SphereGeometry(0.022, 10, 8), skinM, s * 0.1, 0.095, 0, 0.45, 1, 0.8);                     // ears
    }
    const nose = add(j.head, new THREE.ConeGeometry(0.018, 0.045, 8), skinM, 0, 0.085, 0.105); nose.rotation.x = Math.PI / 2 + 0.3;
    add(j.head, new THREE.BoxGeometry(0.04, 0.008, 0.01), new THREE.MeshStandardMaterial({ color: 0x8a4a3e }), 0, 0.045, 0.098);
    if (mongkol && !casual) { const mk = add(j.head, new THREE.TorusGeometry(0.108, 0.016, 8, 30), new THREE.MeshStandardMaterial({ color: 0xd8283a, roughness: 0.5 }), 0, 0.165, 0, 0.95, 1, 1.05); mk.rotation.x = Math.PI / 2;
      const tail = add(j.head, new THREE.CylinderGeometry(0.012, 0.005, 0.18, 6), mk.material, 0, 0.2, -0.12); tail.rotation.x = -0.9; }
    // arms (prajioud on biceps, gloves)
    for (const [s, sh, el] of [[1, 'shL', 'elL'], [-1, 'shR', 'elR']]) {
      node(sh, j.chest, s * 0.215, 0.27, 0);
      const ua = limb(0.29, 0.055, 0.047, skinM); j[sh].add(ua);
      add(j[sh], new THREE.SphereGeometry(0.05, 12, 10), skinM, 0, -0.12, 0.02, 1, 1.4, 0.95);      // biceps
      if (casual) { add(j[sh], lathe([[0.075, -0.17], [0.07, -0.05], [0.06, 0.03], [0.001, 0.04]], 16), shirtM, 0, 0, 0); }
      const pr = casual ? null : add(j[sh], new THREE.TorusGeometry(0.056, 0.012, 6, 18), new THREE.MeshStandardMaterial({ color: s > 0 ? 0xd8283a : 0x1d4fb8 }), 0, -0.07, 0); if (pr) pr.rotation.x = Math.PI / 2;
      node(el, j[sh], 0, -0.29, 0);
      j[el].add(limb(0.24, 0.045, 0.036, skinM));
      if (casual) { add(j[el], new THREE.SphereGeometry(0.042, 14, 10), skinM, 0, -0.27, 0.005, 0.8, 1.3, 0.55); add(j[el], new THREE.SphereGeometry(0.016, 8, 6), skinM, s * -0.035, -0.25, 0.02); }
      else {
      add(j[el], new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12), wrapM, 0, -0.22, 0);
      const glove = add(j[el], new THREE.SphereGeometry(0.068, 18, 14), gloveM, 0, -0.3, 0.008, 0.95, 1.2, 1.05);
      add(j[el], new THREE.SphereGeometry(0.03, 10, 8), gloveM, s * -0.045, -0.29, 0.03);     // thumb
      add(j[el], new THREE.CylinderGeometry(0.05, 0.048, 0.06, 14), new THREE.MeshStandardMaterial({ color: 0xf2f2ee }), 0, -0.245, 0); }  // glove cuff
    }
    // legs (shorts flare, shins, ankle supports, bare feet)
    for (const [s, hp, kn, an] of [[1, 'hipL', 'knL', 'anL'], [-1, 'hipR', 'knR', 'anR']]) {
      node(hp, j.hips, s * 0.095, -0.06, 0);
      j[hp].add(limb(0.44, 0.085, 0.058, skinM, 16));
      add(j[hp], lathe([[0.11, -0.2], [0.1, -0.1], [0.09, 0.02], [0.001, 0.03]], 22), shortsM, 0, 0, 0);   // short leg flare
      node(kn, j[hp], 0, -0.44, 0);
      j[kn].add(limb(0.42, 0.058, 0.042, skinM, 16));
      add(j[kn], new THREE.SphereGeometry(0.045, 12, 10), skinM, 0, -0.12, -0.03, 0.9, 1.5, 1);    // calf
      if (!casual) add(j[kn], new THREE.CylinderGeometry(0.05, 0.052, 0.07, 14), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 }), 0, -0.38, 0);   // ankle support
      node(an, j[kn], 0, -0.43, 0);
      add(j[an], new THREE.BoxGeometry(0.09, 0.06, 0.24), casual ? new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5 }) : skinM, 0, -0.01, 0.06);
    }
    this.pose = {}; for (const k of J) this.pose[k] = [0, 0, 0]; this.rootY = 0;
  }
  // apply pose object {joint:[x,y,z]} with blend factor toward it
  blend(target, k) {
    for (const n of J) { const t = target[n] || ZERO, p = this.pose[n]; for (let i = 0; i < 3; i++) p[i] += (t[i] - p[i]) * k; this.j[n].rotation.set(p[0], p[1], p[2]); }
    const ty = target._y ?? 0; this.rootY += (ty - this.rootY) * k; this.j.root.position.y = this.rootY;
  }
}
const ZERO = [0, 0, 0];

// ---------- Muay Thai poses (lead hand = L, orthodox stance) ----------
const P = (o) => o;
export const POSES = {
  stance: P({ hips: [0, 0.35, 0], chest: [0.05, -0.15, 0], head: [0.1, -0.2, 0], shL: [-1.15, 0, -0.3], elL: [-2.2, 0, 0], shR: [-1.05, 0, 0.32], elR: [-2.35, 0, 0], hipL: [-0.25, 0, 0.05], knL: [0.35, 0, 0], anL: [-0.1, 0, 0], hipR: [0.22, 0, -0.04], knR: [0.3, 0, 0], anR: [0.0, 0, 0], _y: -0.03 }),
  jab: P({ hips: [0, 0.45, 0], chest: [0.1, -0.45, 0], head: [0.1, 0.1, 0], shL: [-1.6, 0, -0.12], elL: [-0.08, 0, 0], shR: [-1.05, 0, 0.32], elR: [-2.35, 0, 0], hipL: [-0.4, 0, 0.05], knL: [0.3, 0, 0], hipR: [0.25, 0, 0], knR: [0.15, 0, 0], _y: -0.06 }),
  cross: P({ hips: [0, -0.2, 0], chest: [0.15, 0.6, 0], head: [0.1, -0.4, 0], shL: [-1.1, 0, -0.3], elL: [-2.3, 0, 0], shR: [-1.62, 0, 0.18], elR: [-0.05, 0, 0], hipL: [-0.45, 0, 0], knL: [0.35, 0, 0], hipR: [0.35, 0.3, 0], knR: [0.05, 0, 0], anR: [0.5, 0, 0], _y: -0.07 }),
  elbow: P({ hips: [0, -0.3, 0], chest: [0.2, 0.85, 0], head: [0.15, -0.5, 0], shL: [-1.1, 0, -0.3], elL: [-2.3, 0, 0], shR: [-1.3, 0.2, 1.35], elR: [-2.6, 0, 0], hipL: [-0.4, 0, 0], knL: [0.4, 0, 0], hipR: [0.3, 0, 0], knR: [0.2, 0, 0], _y: -0.08 }),
  kick_chamber: P({ hips: [0, 0.9, 0], chest: [-0.1, -0.5, -0.2], shL: [-1.3, 0, -0.5], elL: [-2.2, 0, 0], shR: [0.4, 0, 0.3], elR: [-0.3, 0, 0], hipL: [-0.1, 0, 0.05], knL: [0.2, 0, 0], hipR: [-0.7, 0, -0.5], knR: [1.4, 0, 0], _y: 0.02 }),
  kick: P({ hips: [0, 1.45, 0.1], chest: [-0.15, -0.6, -0.45], head: [0, -0.6, 0.2], shL: [-1.4, 0, -0.6], elL: [-2.1, 0, 0], shR: [0.9, 0, 0.5], elR: [-0.2, 0, 0], hipL: [0, 0, 0.1], knL: [0.1, 0, 0], anL: [0, 0, 0], hipR: [-0.35, 0, -1.4], knR: [0.15, 0, 0], anR: [0.4, 0, 0], _y: 0.06 }),
  knee: P({ hips: [-0.15, 0.1, 0], chest: [0.35, 0, 0], head: [0.25, 0, 0], shL: [-1.45, 0, -0.2], elL: [-1.4, 0, 0], shR: [-1.45, 0, 0.2], elR: [-1.4, 0, 0], hipL: [0.15, 0, 0], knL: [0.1, 0, 0], anL: [0.6, 0, 0], hipR: [-1.75, 0, 0], knR: [2.2, 0, 0], _y: 0.08 }),
  teep: P({ hips: [0.15, 0.2, 0], chest: [0.3, -0.1, 0], head: [0.2, 0, 0], shL: [-0.6, 0, -0.5], elL: [-1.8, 0, 0], shR: [-1.0, 0, 0.35], elR: [-2.3, 0, 0], hipL: [-1.6, 0, 0], knL: [0.2, 0, 0], anL: [-0.5, 0, 0], hipR: [0.25, 0, 0], knR: [0.25, 0, 0], _y: 0.02 }),
  block: P({ hips: [0, 0.3, 0], chest: [0.1, -0.1, 0], head: [0.3, 0, 0], shL: [-1.35, 0, -0.45], elL: [-2.5, 0, 0], shR: [-1.3, 0, 0.45], elR: [-2.55, 0, 0], hipL: [-1.3, 0, 0.25], knL: [1.9, 0, 0], anL: [0.3, 0, 0], hipR: [0.15, 0, 0], knR: [0.35, 0, 0], _y: -0.02 }),
  hit: P({ hips: [0.1, 0.35, 0], chest: [-0.35, -0.1, 0.12], head: [-0.5, 0.3, 0.2], shL: [-0.9, 0, -0.6], elL: [-1.9, 0, 0], shR: [-0.8, 0, 0.6], elR: [-1.8, 0, 0], hipL: [-0.15, 0, 0], knL: [0.3, 0, 0], hipR: [0.3, 0, 0], knR: [0.4, 0, 0], _y: -0.05 }),
  ko: P({ root: [-1.45, 0, 0.1], hips: [0, 0, 0], chest: [0.1, 0, 0], head: [-0.3, 0.4, 0], shL: [-2.6, 0, -0.6], elL: [-0.4, 0, 0], shR: [-2.8, 0, 0.7], elR: [-0.6, 0, 0], hipL: [-0.4, 0, 0.2], knL: [0.6, 0, 0], hipR: [-0.1, 0, -0.1], knR: [0.2, 0, 0], _y: 0.16 }),
  wai: P({ hips: [0.2, 0, 0], chest: [0.4, 0, 0], head: [0.4, 0, 0], shL: [-1.2, 0, -0.55], elL: [-1.6, 0, 0], shR: [-1.2, 0, 0.55], elR: [-1.6, 0, 0], hipL: [-1.55, 0, 0.15], knL: [2.6, 0, 0], anL: [0.9, 0, 0], hipR: [-1.55, 0, -0.15], knR: [2.6, 0, 0], anR: [0.9, 0, 0], _y: -0.55 }),
  win: P({ hips: [0, 0, 0], chest: [-0.1, 0, 0], head: [-0.2, 0, 0], shL: [-2.9, 0, -0.3], elL: [-0.3, 0, 0], shR: [-2.9, 0, 0.3], elR: [-0.3, 0, 0], hipL: [-0.1, 0, 0.08], knL: [0.1, 0, 0], hipR: [0.1, 0, -0.08], knR: [0.1, 0, 0], _y: 0 }),
  walk: P({}),
};
// move table: keyframes [time, pose], hit time, reach (m), damage
export const MOVES = {
  jab: { keys: [[0, 'stance'], [0.09, 'jab'], [0.24, 'stance']], hit: 0.09, reach: 1.15, dmg: 5, name: '刺拳 Jab' },
  cross: { keys: [[0, 'stance'], [0.13, 'cross'], [0.34, 'stance']], hit: 0.13, reach: 1.2, dmg: 9, name: '直拳 Cross' },
  elbow: { keys: [[0, 'stance'], [0.14, 'elbow'], [0.38, 'stance']], hit: 0.14, reach: 0.75, dmg: 14, name: '肘擊 Sok' },
  kick: { keys: [[0, 'stance'], [0.14, 'kick_chamber'], [0.27, 'kick'], [0.52, 'stance']], hit: 0.27, reach: 1.45, dmg: 15, name: '掃踢 Tae' },
  knee: { keys: [[0, 'stance'], [0.16, 'knee'], [0.42, 'stance']], hit: 0.16, reach: 0.8, dmg: 13, name: '膝擊 Khao' },
  teep: { keys: [[0, 'stance'], [0.15, 'teep'], [0.38, 'stance']], hit: 0.15, reach: 1.4, dmg: 6, push: 0.9, name: '前蹬 Teep' },
};
export function samplePose(keys, t) {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const [t0, a] = keys[i], [t1, b] = keys[Math.min(i + 1, keys.length - 1)], k = Math.min(1, Math.max(0, (t - t0) / Math.max(1e-3, t1 - t0))), e = k * k * (3 - 2 * k);
  const A = POSES[a], B = POSES[b], out = {};
  for (const n of J) { const pa = A[n] || ZERO, pb = B[n] || ZERO; out[n] = [pa[0] + (pb[0] - pa[0]) * e, pa[1] + (pb[1] - pa[1]) * e, pa[2] + (pb[2] - pa[2]) * e]; }
  out._y = (A._y ?? 0) + ((B._y ?? 0) - (A._y ?? 0)) * e; return out;
}
