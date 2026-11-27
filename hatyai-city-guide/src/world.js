import * as THREE from 'three';
import city from './city.json';
import { clamp, lerp, smooth, fbm, vnoise, mulberry32, SegHash, Occ, pointInPoly, canvasTex, glowTex, pca } from './util.js';
import { Batch, BatchSet } from './facade.js';

export const DATA = city;
export const waterUniforms = { uTime: { value: 0 }, uLight: { value: 1 } };
export function waterPatch(sh) {
  sh.uniforms.uTime = waterUniforms.uTime; sh.uniforms.uLight = waterUniforms.uLight;
  sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float uTime; uniform float uLight;\nvoid main() {')
    .replace('#include <normal_fragment_maps>', `
#ifdef USE_NORMALMAP_TANGENTSPACE
  vec3 n1 = texture2D(normalMap, vNormalMapUv + vec2(uTime*0.013, uTime*0.007)).xyz*2.-1.;
  vec3 n2 = texture2D(normalMap, vNormalMapUv*2.3 + vec2(-uTime*0.011, uTime*0.017)).xyz*2.-1.;
  vec3 n3 = texture2D(normalMap, vNormalMapUv*0.45 + vec2(uTime*0.004, -uTime*0.006)).xyz*2.-1.;
  vec3 mapN = normalize(vec3((n1.xy + n2.xy*0.6 + n3.xy*0.8) * normalScale, 1.0));
  normal = normalize(tbn * mapN);
#endif`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  { float fres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0., 1.), 4.0);
    vec3 bed = vec3(0.06,0.085,0.065) * (0.65 + 0.7*clamp(normal.x*2.0+0.5,0.,1.));   // refracted river bed, distorted by ripples
    totalEmissiveRadiance += bed * (1.0 - fres) * 0.5 * uLight; }`);
}
export const BOUNDS = { x0: -13000, x1: 9000, z0: -8500, z1: 11000 };

// ---------------------------------------------------------------
//  terrain
// ---------------------------------------------------------------
const AIRPORT = [-8650, 7700];
export function groundY(x, z) {
  let h = 0;
  const bump = (cx, cz, r, hh) => { const d = Math.hypot(x - cx, z - cz) / r; return d < 1 ? hh * Math.pow(1 - d * d, 2) : 0; };
  h += bump(5400, -1270, 1500, 250) + bump(6300, -2200, 1100, 150);       // Khao Kho Hong
  h += bump(4330, -3900, 950, 75);                                          // Municipal Park hill
  const r = Math.hypot(x, z);
  const ring = smooth(9500, 16500, r) * (150 + 750 * fbm(x * 0.00028 + 3, z * 0.00028 + 9, 4)) * (0.35 + 0.65 * fbm(Math.atan2(z, x) * 2.4 + 5, 1.7, 3));
  h += ring * smooth(3200, 6500, Math.hypot(x - AIRPORT[0], z - AIRPORT[1]));
  h += (fbm(x * 0.002, z * 0.002, 3) - 0.5) * 3.0 * smooth(900, 4000, r);   // gentle undulation outside the core
  return h;
}

// urban density 0..1
export function urban(x, z) {
  const r = Math.hypot(x, z), a = Math.atan2(z, x);
  const R = 2500 * (1 + 0.28 * Math.cos(a - 0.9) + 0.2 * Math.cos(2 * a + 0.4)) + 500 * (fbm(x * 0.0007, z * 0.0007, 3) - 0.5);
  let u = Math.exp(-Math.pow(r / R, 2.4));
  // PSU / hospital corridor and southern sprawl
  u = Math.max(u, 0.55 * Math.exp(-Math.pow(Math.hypot(x - 2400, z + 100) / 900, 2)));
  u = Math.max(u, 0.7 * Math.exp(-Math.pow(Math.hypot(x - 1250, z - 1500) / 800, 2)));
  return u;
}

function makeAsphalt(kind) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = kind === 'minor' ? '#4a4a4c' : '#3c3c3f'; g.fillRect(0, 0, w, h);
    const id = g.getImageData(0, 0, w, h);
    for (let i = 0; i < id.data.length; i += 4) { const n = (Math.random() - 0.5) * 34; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; }
    g.putImageData(id, 0, 0);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(20,20,22,${Math.random() * 0.25})`; g.fillRect(Math.random() * w, Math.random() * h, 30 + Math.random() * 60, 8 + Math.random() * 20); }
    if (kind === 'major') {
      g.fillStyle = 'rgba(235,235,225,.85)'; g.fillRect(w * 0.035, 0, 4, h); g.fillRect(w * 0.965 - 4, 0, 4, h);
      g.fillStyle = 'rgba(245,200,60,.9)'; g.fillRect(w * 0.5 - 6, 0, 3, h); g.fillRect(w * 0.5 + 3, 0, 3, h);
    } else if (kind === 'mid') {
      g.fillStyle = 'rgba(235,235,225,.85)'; for (let y = 0; y < h; y += 128) g.fillRect(w * 0.5 - 3, y, 6, 64);
      g.fillStyle = 'rgba(235,235,225,.5)'; g.fillRect(w * 0.04, 0, 3, h); g.fillRect(w * 0.96 - 3, 0, 3, h);
    }
  });
}
function makeCobble() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#3a3a3c'; g.fillRect(0, 0, w, h);
    // paver rows
    const pw = 32, ph = 16;
    for (let y = 0; y < h; y += ph) for (let x = 0; x < w; x += pw) {
      const off = ((y / ph) % 2) * (pw / 2), v = 105 + Math.random() * 45;
      g.fillStyle = `rgb(${v},${v},${v + 2})`; g.fillRect(x + off + 1, y + 1, pw - 2, ph - 2);
    }
    // big pattern frames: lighter outlined rhombus / grid every 128px
    g.strokeStyle = 'rgba(175,175,172,.85)'; g.lineWidth = 6;
    for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) { g.strokeRect(x + 14, y + 14, 100, 100); }
    g.strokeStyle = 'rgba(40,40,42,.6)'; g.lineWidth = 3;
    for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) { g.beginPath(); g.moveTo(x + 14, y + 64); g.lineTo(x + 64, y + 14); g.lineTo(x + 114, y + 64); g.lineTo(x + 64, y + 114); g.closePath(); g.stroke(); }
    g.fillStyle = 'rgba(15,15,18,.18)'; for (let i = 0; i < 90; i++) g.fillRect(Math.random() * w, Math.random() * h, 20 + Math.random() * 80, 3 + Math.random() * 10);
  });
}
function makeConcrete() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#8c8a84'; g.fillRect(0, 0, w, h);
    const id = g.getImageData(0, 0, w, h);
    for (let i = 0; i < id.data.length; i += 4) { const n = (Math.random() - 0.5) * 30; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; }
    g.putImageData(id, 0, 0);
    g.strokeStyle = 'rgba(40,40,40,.5)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
  });
}

// ---------------------------------------------------------------
//  ribbons
// ---------------------------------------------------------------
export function ribbon(pts, width, y, vPer, out, off = 0, uvU = [0, 1]) {
  // out: {pos:[], uv:[], idx:[]}
  const n = pts.length; if (n < 2) return;
  const nrm = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    nrm.push([-dz, dx]);
  }
  const base = out.pos.length / 3; let s = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    // miter
    let k = 1;
    if (i > 0 && i < n - 1) {
      const a = nrm[i - 1], b = nrm[i + 1]; const d = a[0] * b[0] + a[1] * b[1]; k = clamp(1 / Math.max(0.5, Math.sqrt((1 + d) / 2)), 1, 2);
    }
    const hw = width / 2 * k, nx = nrm[i][0], nz = nrm[i][1];
    const cx = pts[i][0] + nx * off, cz = pts[i][1] + nz * off;
    const y0 = typeof y === 'function' ? y(cx, cz) : y;
    out.pos.push(cx - nx * hw, y0, cz - nz * hw, cx + nx * hw, y0, cz + nz * hw);
    out.uv.push(uvU[0], s / vPer, uvU[1], s / vPer);
    if (i > 0) { const a = base + (i - 1) * 2; out.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
}
export function ribGeo(o) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(o.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(o.uv, 2));
  g.setIndex(o.idx); g.computeVertexNormals();
  // ensure upward normals
  const nn = g.attributes.normal; for (let i = 0; i < nn.count; i++) if (nn.getY(i) < 0) nn.setXYZ(i, -nn.getX(i), -nn.getY(i), -nn.getZ(i));
  g.computeBoundingSphere(); return g;
}

// ---------------------------------------------------------------
export const PALETTE = ['#e8dcc0', '#d9d2c0', '#c9c2b0', '#ece6d4', '#d8c9a8', '#bdb8a8', '#c4d0cf', '#d9b9a5', '#e3d5a1', '#9fb0a6', '#f0f0ea', '#cfc3ae', '#b9b0a0', '#e1c7b0'].map(h => new THREE.Color(h));
export const ROOFS = ['#6a6a6a', '#7a5a4a', '#8a8a86', '#5a5f66', '#8c6a52'].map(h => new THREE.Color(h));

export async function buildWorld(ctx, progress) {
  const { scene } = ctx; const rnd = mulberry32(20241127);
  const step = async (t, f) => { progress && progress(t, f); await new Promise(r => setTimeout(r, 0)); };

  // ---------- terrain ----------
  await step('地形與天際線', 0.05);
  {
    const SZ = 50000, SEG = 500;
    const g = new THREE.PlaneGeometry(SZ, SZ, SEG, SEG); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) - 2000, z = p.getZ(i) + 1000; p.setXYZ(i, x, groundY(x, z) - 0.2, z); }
    g.computeVertexNormals();
    const mask = canvasTex(512, 512, (gx, w, h) => {
      const id = gx.createImageData(w, h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const x = (i / w - 0.5) * 16000, z = (j / h - 0.5) * 16000; const u = urban(x, z);
        const k = (j * w + i) * 4; id.data[k] = u * 255; id.data[k + 1] = 0; id.data[k + 2] = 0; id.data[k + 3] = 255;
      }
      gx.putImageData(id, 0, 0);
    }, { linear: true, clamp: true });
    mask.colorSpace = THREE.NoColorSpace; mask.minFilter = THREE.LinearFilter;
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, metalness: 0 });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uMask = { value: mask };
      sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec3 vGW;\nvoid main() {').replace('#include <begin_vertex>', '#include <begin_vertex>\n vGW = (modelMatrix*vec4(position,1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', `varying vec3 vGW; uniform sampler2D uMask;
float gh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float gn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(gh(i),gh(i+vec2(1,0)),f.x), mix(gh(i+vec2(0,1)),gh(i+vec2(1,1)),f.x), f.y); }
void main() {`).replace('#include <color_fragment>', `#include <color_fragment>
{
 vec2 wp = vGW.xz; float h = vGW.y;
 float n1 = gn(wp*0.0007), n2 = gn(wp*0.006), n3 = gn(wp*0.09), n4 = gn(wp*0.8);
 vec3 grass = mix(vec3(0.075,0.14,0.045), vec3(0.15,0.21,0.06), n1) * (0.85+0.3*n2);
 vec3 paddy = mix(vec3(0.17,0.2,0.07), vec3(0.09,0.15,0.05), step(0.5, gn(wp*0.004)));
 grass = mix(grass, paddy, smoothstep(0.55,0.75,n1)*0.55);
 vec3 conc = mix(vec3(0.13,0.128,0.122), vec3(0.19,0.18,0.165), n3) * (0.82+0.3*n4);
 vec2 tl = fract(wp/1.2); float joint = 1.0 - 0.18*(1.0-smoothstep(0.0,0.04,min(min(tl.x,1.0-tl.x),min(tl.y,1.0-tl.y))));
 conc *= joint;
 conc = mix(conc, vec3(0.09,0.085,0.075), smoothstep(0.62,0.8,gn(wp*0.05))*0.6);            // oil/dirt stains
 conc = mix(conc, vec3(0.16,0.2,0.1), smoothstep(0.7,0.85,gn(wp*0.02+3.))*0.5);           // weeds in cracks
 float urb = texture2D(uMask, wp/16000.+0.5).r;
 vec3 col = mix(grass, conc, smoothstep(0.1, 0.5, urb));
 col = mix(col, vec3(0.03,0.075,0.03)*(0.8+0.5*n3), smoothstep(8.,70.,h));
 col = mix(col, vec3(0.22,0.2,0.17), smoothstep(150.,420.,h)*0.5);
 diffuseColor.rgb = col;
}`);
    };
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.frustumCulled = false; scene.add(m);
    ctx.terrain = m;
  }

  // ---------- roads ----------
  await step('路網（OSM 真實道路）', 0.15);
  const W_OF = { trunk: 22, primary: 20, secondary: 16, tertiary: 10.5, residential: 7, service: 5, unclassified: 6 };
  const roads = [];
  for (const r of city.roads) {
    if (r.p.length < 2) continue;
    let cls = (r.t === 'trunk' || r.t === 'primary' || r.t === 'secondary') ? 'major' : r.t === 'tertiary' ? 'mid' : 'minor';
    let w = W_OF[r.t] || 7, cobble = false;
    if (r.n.includes('เสน่หานุสรณ์')) { cobble = true; w = 12.5; cls = 'mid'; }
    roads.push({ cls, w, pts: r.p.map(p => [p[0], p[1]]), name: r.n, cobble, osm: true });
  }
  const hashOSM = new SegHash(40);
  for (const r of roads) for (let i = 0; i < r.pts.length - 1; i++) hashOSM.add(r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1], r);

  const occ = new Occ(-5200, -6200, 6800, 5200, 4);
  ctx.occ = occ;
  // special polygons and hero reservations are marked by landmarks.reserve()
  ctx.reserve && ctx.reserve(occ);

  // ----- auxiliary street grid (procedural infill, aligned to the real Niphat Uthit axis) -----
  await step('補齊街廓', 0.28);
  const e1 = new THREE.Vector2(0.12, 0.993).normalize(), e2 = new THREE.Vector2(e1.y, -e1.x);
  const SA = 104, SB = 138;
  const toW = (a, b) => [a * e2.x + b * e1.x, a * e2.y + b * e1.y];
  const aux = [];
  const heroClear = (x, z) => Math.hypot(x + 20, z - 80) < 150;
  const runLine = (isA, k) => {
    let cur = null;
    const L = 3800;
    for (let t = -L; t <= L; t += 18) {
      const [x, z] = isA ? toW(k * SA, t) : toW(t, k * SB);
      let ok = urban(x, z) > 0.32 && !heroClear(x, z) && !occ.get(x, z) && x > -5100 && x < 6700 && z > -6100 && z < 5100;
      if (ok) { const nr = hashOSM.nearest(x, z, 26); if (nr && nr.d < nr.data.w / 2 + 9) ok = false; }
      if (ok) { (cur || (cur = [])).push([x, z]); }
      else if (cur) { if (cur.length > 3) aux.push(cur); cur = null; }
    }
    if (cur && cur.length > 3) aux.push(cur);
  };
  for (let k = -40; k <= 40; k++) { runLine(true, k); runLine(false, k); }
  for (const pts of aux) roads.push({ cls: 'minor', w: 7, pts, name: '', osm: false });

  // spatial hash for all roads + occupancy lines
  const hashAll = new SegHash(40);
  for (const r of roads) for (let i = 0; i < r.pts.length - 1; i++) {
    const a = r.pts[i], b = r.pts[i + 1];
    hashAll.add(a[0], a[1], b[0], b[1], r); occ.line(a[0], a[1], b[0], b[1], r.w + 1);
  }
  ctx.roads = roads; ctx.hashAll = hashAll;

  // ----- road meshes -----
  {
    const bins = { major: { pos: [], uv: [], idx: [] }, mid: { pos: [], uv: [], idx: [] }, minor: { pos: [], uv: [], idx: [] }, cobble: { pos: [], uv: [], idx: [] }, walk: { pos: [], uv: [], idx: [] }, curb: { pos: [], uv: [], idx: [] } };
    let li = 0;
    for (const r of roads) {
      li++;
      const yoff = (r.cls === 'major' ? 0.06 : r.cls === 'mid' ? 0.045 : 0.03) + (li % 7) * 0.004;
      const bin = r.cobble ? bins.cobble : bins[r.cls];
      ribbon(r.pts, r.w, (x, z) => groundY(x, z) + yoff, r.cobble ? 4.2 : 24, bin, 0, r.cobble ? [0, 3] : [0, 1]);
      const d0 = Math.hypot(r.pts[0][0], r.pts[0][1]);
      if ((r.cls !== 'minor' || r.cobble) && d0 < 2200 && r.osm) {
        ribbon(r.pts, 2.0, (x, z) => groundY(x, z) + 0.16, 6, bins.walk, r.w / 2 + 1.0);
        ribbon(r.pts, 2.0, (x, z) => groundY(x, z) + 0.16, 6, bins.walk, -(r.w / 2 + 1.0));
      }
    }
    const mk = (name, tex, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: tex, roughness: 0.62, metalness: 0.15, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, extra));
    const mats = {
      major: mk('major', makeAsphalt('major')), mid: mk('mid', makeAsphalt('mid')), minor: mk('minor', makeAsphalt('minor'), { roughness: 0.72 }),
      cobble: mk('cobble', makeCobble(), { roughness: 0.42, metalness: 0.12 }), walk: mk('walk', makeConcrete(), { roughness: 0.9, metalness: 0, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    };
    mats.cobble.map.repeat.set(1, 1);
    const group = new THREE.Group();
    for (const k of ['minor', 'mid', 'major', 'cobble', 'walk']) {
      const o = bins[k]; if (!o.pos.length) continue;
      const m = new THREE.Mesh(ribGeo(o), mats[k]); m.receiveShadow = true; m.frustumCulled = false; group.add(m);
    }
    scene.add(group); ctx.roadGroup = group; ctx.roadMats = mats;
  }

  // ----- water -----
  await step('水系', 0.34);
  {
    const normalTex = canvasTex(256, 256, (g, w, h) => {
      const id = g.createImageData(w, h);
      const f = (x, y) => fbm(x * 0.045, y * 0.045, 4);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const dx = f(i + 1, j) - f(i - 1, j), dy = f(i, j + 1) - f(i, j - 1), k = (j * w + i) * 4;
        id.data[k] = 128 + dx * 900; id.data[k + 1] = 128 + dy * 900; id.data[k + 2] = 255; id.data[k + 3] = 255;
      }
      g.putImageData(id, 0, 0);
    }, { linear: true });
    normalTex.colorSpace = THREE.NoColorSpace;
    const mat = new THREE.MeshStandardMaterial({ color: 0x1b2f3a, roughness: 0.2, metalness: 0.45, normalMap: normalTex, normalScale: new THREE.Vector2(0.3, 0.3), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    normalTex.repeat.set(1, 1);
    mat.onBeforeCompile = waterPatch; mat.customProgramCacheKey = () => 'water';
    ctx.waterNormal = normalTex;
    const o = { pos: [], uv: [], idx: [] };
    for (const w of city.water) {
      if (w.t === 'area') continue;
      const wd = w.t === 'river' ? 28 : w.t === 'canal' ? 11 : 7;
      if (Math.abs(w.p[0][0]) > 12000 || Math.abs(w.p[0][1]) > 12000) continue;
      ribbon(w.p, wd, (x, z) => groundY(x, z) + 0.02, 40, o);
      ribbon(w.p, wd + 5, (x, z) => groundY(x, z) + 0.0, 40, ctx._bank || (ctx._bank = { pos: [], uv: [], idx: [] }));
    }
    // Khlong Hae: extend the stream east along the floating market (OSM stream ends at the market)
    ctx.waterAdd = (pts, wd) => ribbon(pts, wd, 0.02, 40, o);
    ctx._waterO = o;
    ctx.waterMat = mat;
    // reservoirs
    const res = [];
    for (const b of city.blds) if (b.t === 'reservoir') res.push(b);
    ctx._reservoirs = res;
  }

  ctx.hashOSM = hashOSM; ctx.rnd = rnd;
  return ctx;
}

// ---------------------------------------------------------------
//  city fill (called after landmarks have reserved their footprints)
// ---------------------------------------------------------------
export async function fillCity(ctx, progress) {
  const { occ, hashAll, roads } = ctx; const rnd = mulberry32(777);
  const step = async (t, f) => { progress && progress(t, f); await new Promise(r => setTimeout(r, 0)); };
  const batches = ctx.batches || (ctx.batches = new BatchSet(450));
  const tanks = [], houseRoofs = [];
  const col = () => PALETTE[Math.floor(rnd() * PALETTE.length)];
  let count = 0;

  const placeBuilding = (cx, cz, w, d, rot, d0, uVal, frontage, fnx = 0, fnz = 0) => {
    if (occ.hit(cx, cz, w, d, rot, 0.6)) return false;
    // floors by zone
    let fl; const r = rnd();
    if (d0 < 650) fl = 3 + Math.floor(Math.pow(r, 1.6) * 7); else if (d0 < 1500) fl = 2 + Math.floor(r * 5); else if (d0 < 3000) fl = 2 + Math.floor(r * 3); else fl = 1 + Math.floor(r * 2.4);
    if (uVal < 0.3) fl = Math.min(fl, 2);
    if (rnd() < 0.035 && d0 < 1800) fl += 6 + Math.floor(rnd() * 10);
    const fh = 3.3;
    const h = fl * fh + (fl > 1 ? 0.5 : 0.3);
    let style = 0;
    if (fl >= 12) style = rnd() < 0.55 ? 1 : 5; else if (fl >= 7) style = rnd() < 0.5 ? 5 : (rnd() < 0.5 ? 1 : 0); else if (fl <= 2 && d0 > 1000) style = rnd() < 0.5 ? 6 : 0;
    if (!frontage && style === 0 && fl > 2) style = rnd() < 0.5 ? 5 : 0;
    const c = col().clone().multiplyScalar(0.85 + rnd() * 0.25);
    const batch = batches.at(cx, cz);
    const house = fl <= 2 && d0 > 1300 && rnd() < 0.55;
    if (house) {
      batch.box(cx, cz, w, d, rot, 0, h - 0.4, { style: 6, color: c, seed: rnd(), roof: false });
      batch.gable(cx, cz, w, d, rot, h - 0.4, 2.4, ROOFS[Math.floor(rnd() * ROOFS.length)].clone().multiplyScalar(0.9 + rnd() * 0.3), rnd());
    } else {
      batch.box(cx, cz, w, d, rot, 0, h, { style, color: c, seed: rnd(), roofColor: ROOFS[Math.floor(rnd() * ROOFS.length)] });
      if (frontage && (style === 0 || style === 5) && d0 < 2600) (ctx.shopfronts || (ctx.shopfronts = [])).push({ x: cx + fnx * d / 2, z: cz + fnz * d / 2, w, fnx, fnz, rot, fl, d0, h });
      if (fl >= 3 && rnd() < 0.55) tanks.push([cx + (rnd() - 0.5) * w * 0.4, h, cz + (rnd() - 0.5) * d * 0.4, 0.8 + rnd() * 0.5]);
    }
    occ.mark(cx, cz, w, d, rot, 0.4); count++;
    return true;
  };

  // ---- frontage rows along every road ----
  await step('街屋與騎樓（沿真實道路）', 0.45);
  const order = roads.slice().sort((a, b) => ({ major: 0, mid: 1, minor: 2 }[a.cls] - { major: 0, mid: 1, minor: 2 }[b.cls]));
  for (const r of order) {
    const hw = r.w / 2;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 6) continue;
      const ux = dx / L, uz = dz / L, nx = -uz, nz = ux, rot = Math.atan2(uz, ux);
      for (const side of [-1, 1]) {
        let s = 2 + rnd() * 4;
        while (s < L - 3) {
          const px = a[0] + ux * s, pz = a[1] + uz * s, d0 = Math.hypot(px, pz), uv = urban(px, pz);
          const dens = r.cls === 'major' ? 0.85 : r.cls === 'mid' ? 0.8 : 0.7;
          const wLot = d0 < 1200 ? 6 + rnd() * 8 : 8 + rnd() * 8, dLot = d0 < 1200 ? 13 + rnd() * 14 : 9 + rnd() * 9;
          if (uv > 0.1 || r.cls !== 'minor') {
            if (rnd() < (uv > 0.2 ? dens : dens * 0.35 * Math.max(0.2, uv * 4))) {
              const off = hw + 1.6 + dLot / 2;
              placeBuilding(px + nx * off * side + ux * wLot / 2, pz + nz * off * side + uz * wLot / 2, wLot - 0.4, dLot, rot, d0, uv, true, -nx * side, -nz * side);
            }
          }
          s += wLot;
        }
      }
    }
  }
  // ---- second row / infill ----
  await step('補齊街區與郊區', 0.65);
  for (let x = -5000; x < 6700; x += 20) for (let z = -6000; z < 5000; z += 20) {
    const jx = x + (rnd() - 0.5) * 12, jz = z + (rnd() - 0.5) * 12;
    const uv = urban(jx, jz); if (uv < 0.12) continue;
    if (rnd() > uv * 0.95 + 0.05) continue;
    if (occ.get(jx, jz)) continue;
    const nr = hashAll.nearest(jx, jz, 90); let rot;
    if (nr) rot = Math.atan2(nr.dz, nr.dx); else rot = Math.atan2(0.993, 0.12) * 0 + 0.12;
    const d0 = Math.hypot(jx, jz);
    const w = (d0 < 1200 ? 8 : 9) + rnd() * 8, d = (d0 < 1200 ? 10 : 9) + rnd() * 10;
    placeBuilding(jx, jz, w, d, rot, d0 * 1.15, uv, false);
  }
  ctx.buildingCount = count;
  ctx.tanks = tanks;
  return ctx;
}
