// Lübeck Altstadt — v2: OSM geometry, PBR, 3D window LOD, skinned human, rideable bicycle, drivable car.
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { buildCity, buildRoads, pip, signedArea } from './city.js';
import { makeMaterials, setAniso, facadeUniforms } from './materials.js';
import { WindowLOD } from './windows.js';
import { buildHero } from './hero.js';
import { loadHuman, updateLocomotion, makeBike, makeCar, twoBoneIK } from './actors.js';
import { InfoCards } from './ui.js';
import { Traffic } from './traffic.js';
import { createMannequin, PLAYER_LOOK } from './mannequin.js';
import { makeEagle } from './eagle.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const status = (t) => { const e = $('#status'); if (e) e.textContent = t; };
const refMode = params.get('ref') === 'teufel';
const TOUCH = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
if (TOUCH) document.body.classList.add('touch');

/* ------------------------------------------------------------ quality */
const QUALITY = {
  high: { dpr: 2, shadow: 4096, shadowBox: 70, winR: 140, winCap: 18000, ao: true, aa: true },
  medium: { dpr: 1.5, shadow: 2048, shadowBox: 60, winR: 90, winCap: 9000, ao: false, aa: true },
  low: { dpr: 1, shadow: 1024, shadowBox: 50, winR: 0, winCap: 1, ao: false, aa: false },
};
let qName = params.get('q') || (() => { try { return localStorage.getItem('lub-q'); } catch { return null; } })() || (TOUCH ? 'low' : 'medium');
if (!QUALITY[qName]) qName = 'medium';
const Q = QUALITY[qName];

/* ------------------------------------------------------------ renderer */
const canvas = $('#world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !Q.aa, powerPreference: 'high-performance', logarithmicDepthBuffer: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, Q.dpr));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;   // more saturated than AgX; closer to the summer photos
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
setAniso(renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc9d3dc, 700, 3400);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 6000);

/* ------------------------------------------------------------ data */
// The city is split into 250 m tiles (tools/tile_city.py). Only the base layer (water, landmarks) and the tiles
// around the player are fetched before entry; the rest streams in while walking. Loaded tiles are kept.
status('讀取地圖資料…');
const [base, LM, TI] = await Promise.all(['data/base.json', 'data/landmarks.json', 'data/tiles/index.json'].map((u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); })));
const M = makeMaterials(TOUCH || qName === 'low' ? 'assets/tex_s' : 'assets/tex');
const STREAM_R = TOUCH ? 420 : qName === 'low' ? 520 : 800;   // metres of city kept around the player
/* ------------------------------------------------------------ sky & light */
// sky dome tuned to the summer photos: deep blue zenith, pale horizon, warm glow around the sun
const SU = { sunPosition: { value: new THREE.Vector3(0, 1, 0) }, uZenith: { value: new THREE.Color(0x2f6cc9) }, uHorizon: { value: new THREE.Color(0xc4dcf2) }, uGlow: { value: new THREE.Color(0xfff0d0) }, uNight: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), new THREE.ShaderMaterial({
  uniforms: SU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
  fragmentShader: `uniform vec3 sunPosition, uZenith, uHorizon, uGlow; uniform float uNight; varying vec3 vDir;
    void main(){ vec3 d = normalize(vDir); float h = max(d.y, 0.0);
      vec3 c = mix(uHorizon, uZenith, pow(h, 0.45));
      float s = max(dot(d, normalize(sunPosition)), 0.0);
      c += uGlow * (pow(s, 6.0) * 0.25 + pow(s, 600.0) * 4.0);
      c = mix(c, uHorizon * 0.9, smoothstep(0.0, -0.1, d.y));
      gl_FragColor = vec4(c, 1.0); }`,
}));
scene.add(sky);
// procedural cumulus layer: fbm noise projected on a plane 1.5 km up, lit from the sun direction (self-shadowed)
const cloudU = { uSun: { value: new THREE.Vector3(0, 1, 0) }, uTime: { value: 0 }, uCover: { value: 0.56 }, uNight: { value: 0 }, uTint: { value: new THREE.Color(1, 1, 1) } };
const clouds = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), new THREE.ShaderMaterial({
  uniforms: cloudU, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.9999; }`,
  fragmentShader: `uniform vec3 uSun; uniform float uTime, uCover, uNight; uniform vec3 uTint; varying vec3 vDir;
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 r = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 6; i++){ v += a * n2(p); p = r * p; a *= 0.5; } return v; }
    float dens(vec2 p){ float base = fbm(p * 0.9 + vec2(uTime * 0.012, uTime * 0.004)); float d = smoothstep(uCover, uCover + 0.22, base); return d * (0.75 + 0.25 * fbm(p * 3.1)); }
    void main(){
      vec3 d = normalize(vDir); if (d.y < 0.01) discard;
      vec2 p = d.xz / (d.y + 0.08) * 1.2;           // plane projection, compressed toward the horizon
      float c = dens(p); if (c < 0.01) discard;
      vec2 toSun = normalize(uSun.xz + 1e-4) * 0.18;
      float shadow = clamp(dens(p + toSun) - c * 0.4, 0.0, 1.0);   // denser cloud toward the sun = darker underside
      float silver = pow(max(dot(d, normalize(uSun)), 0.0), 8.0);
      vec3 lit = vec3(1.0, 0.98, 0.95) * uTint;
      vec3 col = mix(lit, vec3(0.58, 0.63, 0.72) * uTint, shadow * 0.85) + silver * 0.35 * uTint;
      col = mix(col, vec3(0.08, 0.09, 0.13), uNight);
      float a = c * smoothstep(0.01, 0.12, d.y);      // fade into the horizon haze
      gl_FragColor = vec4(col, a * 0.95);
    }`,
}));
clouds.renderOrder = -1; scene.add(clouds);
const envScene = new THREE.Scene(); const sky2 = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), sky.material); envScene.add(sky2);
const pmrem = new THREE.PMREMGenerator(renderer); let envRT = null;
const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true; sun.shadow.mapSize.set(Q.shadow, Q.shadow);
Object.assign(sun.shadow.camera, { left: -Q.shadowBox, right: Q.shadowBox, top: Q.shadowBox, bottom: -Q.shadowBox, near: 1, far: 800 });
sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xbfd4ee, 0x6b5e50, 0.35); scene.add(hemi);
const TIMES = [
  { label: '08:30 · 早晨', elev: 18, az: 105, exp: 1.0 },
  { label: '13:00 · 正午', elev: 55, az: 185, exp: 0.9 },
  { label: '16:30 · 午後', elev: 32, az: 240, exp: 1.0 },
  { label: '20:40 · 黃昏', elev: 4, az: 300, exp: 1.25 },
  { label: '23:00 · 夜晚', elev: -12, az: 330, exp: 1.7 },
];
let timeIdx = Number(params.get('t') ?? 2);
const sunDir = new THREE.Vector3();
let windowLOD;
function applyTime(i) {
  const t = TIMES[i], night = t.elev < 0, dusk = THREE.MathUtils.clamp(1 - t.elev / 15, 0, 1);
  sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - t.elev), THREE.MathUtils.degToRad(t.az));
  SU.sunPosition.value.copy(sunDir);
  SU.uZenith.value.set(night ? 0x050a1a : 0x2f6cc9).lerp(new THREE.Color(0x3b4f8a), night ? 0 : dusk * 0.6);
  SU.uHorizon.value.set(night ? 0x0d1426 : 0xc4dcf2).lerp(new THREE.Color(0xf2a96b), night ? 0 : dusk * 0.85);
  SU.uGlow.value.set(night ? 0x000000 : 0xfff0d0).lerp(new THREE.Color(0xff9a50), dusk);
  if (envRT) envRT.dispose(); envRT = pmrem.fromScene(envScene, 0.02); scene.environment = envRT.texture; scene.environmentIntensity = night ? 0.15 : 0.9;
  if (night) { sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(50), THREE.MathUtils.degToRad(t.az + 160)); sun.color.setRGB(0.55, 0.65, 1); sun.intensity = 0.35; }
  else { sun.color.setRGB(1, 0.96 - dusk * 0.3, 0.9 - dusk * 0.5); sun.intensity = 2.6 - dusk * 1.4; }
  hemi.intensity = night ? 0.18 : 0.35;
  const fogC = night ? new THREE.Color(0x0b1020) : new THREE.Color().setRGB(0.68 + dusk * 0.2, 0.78 - dusk * 0.04, 0.9 - dusk * 0.25);
  scene.fog.color.copy(fogC); renderer.setClearColor(fogC);
  renderer.toneMappingExposure = t.exp;
  facadeUniforms.uNight.value = night ? 1 : 0;
  windowLOD?.setNight(night ? 1 : 0);
  lampMat.emissiveIntensity = night ? 8 : dusk > 0.7 ? 3 : 0.0;
  cloudU.uSun.value.copy(sunDir); cloudU.uNight.value = night ? 0.85 : 0; cloudU.uTint.value.setRGB(1, 1 - dusk * 0.25, 1 - dusk * 0.45);
  const wu = window.__water?.material.uniforms; if (wu?.sunDirection) { wu.sunDirection.value.copy(sunDir).normalize(); wu.sunColor.value.copy(sun.color); wu.waterColor.value.set(night ? 0x0a1418 : 0x1e3a3e); }
  $('#clock').textContent = t.label;
}

/* ------------------------------------------------------------ ground & water (base layer) */
const WATER = base.water.filter((w) => w.o.length >= 6);
{
  const outer = new THREE.Shape([new THREE.Vector2(-2500, -2500), new THREE.Vector2(2500, -2500), new THREE.Vector2(2500, 2500), new THREE.Vector2(-2500, 2500)]);
  for (const w of WATER) outer.holes.push(new THREE.Path(toV2(w.o)));
  // base ground: granite paving across the old-town island (approx. ellipse from the OSM landmarks: Burgtor N, Dom S),
  // green verges and gardens outside it, blended in the shader so no polygon clipping against the river is needed
  const landMat = M.grass.clone();
  landMat.onBeforeCompile = (sh) => {
    sh.uniforms.uPave = { value: M.pave.map }; sh.uniforms.uPaveR = { value: M.pave.roughnessMap };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vW;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvW = position.xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uPave; uniform sampler2D uPaveR; varying vec2 vW;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 e = (vW - vec2(30.0, -100.0)) / vec2(345.0, 780.0); float inTown = 1.0 - smoothstep(0.92, 1.0, length(e));
        vec4 pv = texture2D(uPave, vW * 0.5); diffuseColor.rgb = mix(diffuseColor.rgb, pv.rgb * 0.95, inTown);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, texture2D(uPaveR, vW * 0.5).g, inTown);');
  };
  landMat.customProgramCacheKey = () => 'land';
  const landMesh = new THREE.Mesh(flatShape(outer, -0.01), landMat); landMesh.receiveShadow = true; scene.add(landMesh);
  // water surface + quay walls
  const wg = new THREE.PlaneGeometry(5000, 5000); wg.rotateX(-Math.PI / 2);
  let water;
  if (!TOUCH && qName !== 'low') {
    // planar-reflection water (three.js Water): mirrors the brick fronts and spires like the river photos
    water = new Water(new THREE.PlaneGeometry(5000, 5000), { textureWidth: qName === 'high' ? 1024 : 512, textureHeight: qName === 'high' ? 1024 : 512, waterNormals: rippleTex(true),
      sunDirection: new THREE.Vector3(0.4, 0.7, 0.3), sunColor: 0xfff1d8, waterColor: 0x1e3a3e, distortionScale: 1.1, fog: true, alpha: 1 });
    water.rotation.x = -Math.PI / 2; water.material.uniforms.size.value = 6;
  } else { water = new THREE.Mesh(wg, M.water); }
  water.position.y = -1.1; scene.add(water); window.__water = water;
  M.water.normalMap = rippleTex(); M.water.normalMap.repeat.set(400, 400); M.water.needsUpdate = true;
  const qp = [], qu = [];
  for (const w of WATER) for (const ring of [w.o, ...(w.i || [])]) {
    const n = ring.length / 2; let s = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, x1 = ring[2 * i], z1 = ring[2 * i + 1], x2 = ring[2 * j], z2 = ring[2 * j + 1], L = Math.hypot(x2 - x1, z2 - z1);
      qp.push(x1, 0.02, z1, x2, 0.02, z2, x2, -2.2, z2, x1, 0.02, z1, x2, -2.2, z2, x1, -2.2, z1);
      qu.push(s, 0, s + L, 0, s + L, 2.2, s, 0, s + L, 2.2, s, 2.2); s += L;
    }
  }
  const qg = new THREE.BufferGeometry(); qg.setAttribute('position', new THREE.Float32BufferAttribute(qp, 3)); qg.setAttribute('uv', new THREE.Float32BufferAttribute(qu, 2)); qg.computeVertexNormals();
  const qm = M.quay; qm.side = THREE.DoubleSide; const quay = new THREE.Mesh(qg, qm); quay.receiveShadow = true; scene.add(quay);
}
// horizontal polygon (shape in x,z) at height y, facing up, UVs in metres
function flatShape(shape, y) {
  const { shape: c, holes } = shape.extractPoints(1), tris = THREE.ShapeUtils.triangulateShape(c, holes), all = c.concat(...holes), pos = [], uv = [];
  for (const [a, b, d] of tris) {
    const A = all[a], Bv = all[b], D = all[d], up = ((Bv.y - A.y) * (D.x - A.x) - (Bv.x - A.x) * (D.y - A.y)) > 0;
    for (const P of up ? [A, Bv, D] : [A, D, Bv]) { pos.push(P.x, y, P.y); uv.push(P.x, P.y); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const n = new Float32Array(pos.length); for (let i = 1; i < n.length; i += 3) n[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(n, 3)); return g;
}
function toV2(o) { const a = []; for (let i = 0; i < o.length; i += 2) a.push(new THREE.Vector2(o[i], o[i + 1])); return a; }
function rippleTex(fine) {
  if (fine) {
    const n = 256, cv = document.createElement('canvas'); cv.width = cv.height = n; const g = cv.getContext('2d'), img = g.createImageData(n, n), TAU = Math.PI * 2;
    const h = (x, y) => { let v = 0; for (let k = 1; k <= 6; k++) { const a = k * 2.399, fx = Math.round(Math.cos(a) * (k + 1)), fy = Math.round(Math.sin(a) * (k + 1)); v += Math.sin(TAU * (fx * x + fy * y) / n + k * 1.7) / (k + 1); } return v; };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1), i = (y * n + x) * 4; img.data[i] = 128 + dx * 90; img.data[i + 1] = 128 + dy * 90; img.data[i + 2] = 255; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  const n = 256, cv = document.createElement('canvas'); cv.width = cv.height = n; const g = cv.getContext('2d'), img = g.createImageData(n, n);
  const h = (x, y) => Math.sin(x * 0.18 + Math.sin(y * 0.07) * 2) * 0.5 + Math.sin(y * 0.23 + x * 0.05) * 0.35 + Math.sin((x + y) * 0.31) * 0.15;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1), i = (y * n + x) * 4; img.data[i] = 128 + dx * 60; img.data[i + 1] = 128 + dy * 60; img.data[i + 2] = 255; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}


/* minimap canvas, drawn incrementally as tiles arrive (2048 px for 2.4 km) */
const MAP = (() => {
  const S = 2400, cv = document.createElement('canvas'); cv.width = cv.height = 2048; const g = cv.getContext('2d'), k = 2048 / S, X = (x) => (x + S / 2) * k, Z = (z) => (z + S / 2) * k;
  g.fillStyle = '#e8e4da'; g.fillRect(0, 0, 2048, 2048);
  const poly = (o, fill) => { g.beginPath(); for (let i = 0; i < o.length; i += 2) (i ? g.lineTo : g.moveTo).call(g, X(o[i]), Z(o[i + 1])); g.closePath(); g.fillStyle = fill; g.fill(); };
  for (const w of WATER) poly(w.o, '#9cc1d6');
  return { cv, g, X, Z, k, poly };
})();
function drawTileOnMap(t, c, rd) {
  const { g, X, Z, k, poly } = MAP;
  for (const gr of t.green) poly(gr.o, '#c5d6b0');
  g.strokeStyle = '#ffffff'; g.lineCap = 'round';
  for (const r of rd.graph) { g.lineWidth = Math.max(1, r.w * k * 0.9); g.beginPath(); for (let i = 0; i < r.p.length; i += 2) (i ? g.lineTo : g.moveTo).call(g, X(r.p[i]), Z(r.p[i + 1])); g.stroke(); }
  for (const f of c.footprints) poly(f.o, f.brick ? '#c79a85' : '#cfc6b6');
}
/* ------------------------------------------------------------ shared city state, filled tile by tile */
const city = { segs: [], footprints: [] };
const roads = { graph: [] };
let triCount = 0;
facadeUniforms.uCut.value = Q.winR > 0 ? Q.winR - 8 : 0;
windowLOD = new WindowLOD(scene, [], [], { cap: Q.winCap, radius: Q.winR });
const lampMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc982, emissiveIntensity: 0, roughness: 0.4 });
const windU = { uTime: { value: 0 } };
const crownGeo = new THREE.IcosahedronGeometry(1, TOUCH ? 2 : 4);
{ const p = crownGeo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * 7.1) * Math.sin(v.y * 6.3 + 1) * Math.sin(v.z * 5.7 + 2); v.multiplyScalar(1 + n * 0.18 + (Math.sin(v.x * 19 + v.z * 23) * 0.04)); p.setXYZ(i, v.x, v.y, v.z); } crownGeo.computeVertexNormals(); }
const crownMat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
crownMat.onBeforeCompile = (sh) => { sh.uniforms.uTime = windU.uTime; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat sw = sin(uTime*1.3 + instanceMatrix[3][0]*.1)*.06; transformed.x += sw*(position.y+1.); transformed.z += sw*.6*(position.y+1.);'); };
const trunkGeo = new THREE.CylinderGeometry(0.16, 0.3, 5, 8).translate(0, 2.5, 0), poleGeo = new THREE.CylinderGeometry(0.05, 0.08, 4.4, 8).translate(0, 2.2, 0), headGeo = new THREE.CylinderGeometry(0.16, 0.24, 0.5, 6).translate(0, 4.6, 0);
const poleMat = new THREE.MeshStandardMaterial({ color: 0x24292b, roughness: 0.5, metalness: 0.6 });

const SEG_CELL = 8, segGrid = new Map(), FP_CELL = 32, fpGrid = new Map();
const extraColliders = [];   // oriented boxes {c, yaw, hx, hz}
let bridges = [];

async function addTileToScene(t) {
  // ground cover
  for (const gr of t.green) {
    const sh = new THREE.Shape(toV2(gr.o)); for (const h of gr.i || []) sh.holes.push(new THREE.Path(toV2(h)));
    const m = new THREE.Mesh(flatShape(sh, 0.012), M.grass); m.receiveShadow = true; scene.add(m);
  }
  const rd = buildRoads(t);
  for (const [k, a] of Object.entries(rd.accs)) { if (!a.p.length) continue; const m = new THREE.Mesh(a.geo(), M[k]); m.receiveShadow = true; scene.add(m); }
  roads.graph.push(...rd.graph); bridges = roads.graph.filter((r) => r.b);
  // buildings
  const c = await buildCity(t, { budget: TOUCH ? 5 : 8 });
  for (const [key, a] of c.accs) {
    const kind = key.split('|')[0], mat = kind === 'brick' ? M.brick : kind === 'plaster' ? M.plaster : M[kind] || M.roof_tile;
    const geo = a.geo(); triCount += geo.attributes.position.count / 3;
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  }
  windowLOD.add(c.windows, c.doors);
  for (const sg of c.segs) {
    const i = city.segs.push(sg) - 1; if (sg[5] > 1.5) continue;  // pieces floating above ground don't block walkers
    const x0 = Math.floor(Math.min(sg[0], sg[2]) / SEG_CELL), x1 = Math.floor(Math.max(sg[0], sg[2]) / SEG_CELL), z0 = Math.floor(Math.min(sg[1], sg[3]) / SEG_CELL), z1 = Math.floor(Math.max(sg[1], sg[3]) / SEG_CELL);
    for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) { const k = gx * 73856093 ^ gz * 19349663; if (!segGrid.has(k)) segGrid.set(k, []); segGrid.get(k).push(i); }
  }
  for (const f of c.footprints) {
    const i = city.footprints.push(f) - 1; let a = 1e9, b = 1e9, cc = -1e9, d = -1e9;
    for (let k = 0; k < f.o.length; k += 2) { a = Math.min(a, f.o[k]); cc = Math.max(cc, f.o[k]); b = Math.min(b, f.o[k + 1]); d = Math.max(d, f.o[k + 1]); }
    for (let gx = Math.floor(a / FP_CELL); gx <= Math.floor(cc / FP_CELL); gx++) for (let gz = Math.floor(b / FP_CELL); gz <= Math.floor(d / FP_CELL); gz++) { const k = gx + ',' + gz; if (!fpGrid.has(k)) fpGrid.set(k, []); fpGrid.get(k).push(i); }
  }
  // trees & lamps (OSM nodes)
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), col = new THREE.Color();
  if (t.trees.length) {
    const trunk = new THREE.InstancedMesh(trunkGeo, M.wood, t.trees.length), crowns = new THREE.InstancedMesh(crownGeo, crownMat, t.trees.length * 4);
    t.trees.forEach(([x, z], i) => {
      const k = 0.8 + ((Math.sin(x * 12.9 + z * 78.2) * 43758.5) % 1 + 1) % 1 * 0.6;
      m.compose(pv.set(x, 0, z), q.identity(), sv.set(k, k, k)); trunk.setMatrixAt(i, m);
      for (let j = 0; j < 4; j++) {
        const a = j * 1.9 + x, r = j ? 1.6 * k : 0, sc = (j ? 2.3 : 3.0) * k;
        q.setFromEuler(new THREE.Euler(a, a * 2, a * 3));
        m.compose(pv.set(x + Math.cos(a) * r, (6 + (j ? Math.sin(a) * 1.2 : 1.5)) * k, z + Math.sin(a) * r), q, sv.set(sc, sc * 0.85, sc)); crowns.setMatrixAt(i * 4 + j, m);
        col.setHSL(0.24 + Math.sin(a) * 0.02, 0.38, 0.17 + j * 0.02); crowns.setColorAt(i * 4 + j, col);
      }
    });
    trunk.castShadow = crowns.castShadow = true; crowns.receiveShadow = true; scene.add(trunk, crowns);
  }
  if (t.lamps.length) {
    const pole = new THREE.InstancedMesh(poleGeo, poleMat, t.lamps.length), head = new THREE.InstancedMesh(headGeo, lampMat, t.lamps.length);
    t.lamps.forEach(([x, z], i) => { m.makeTranslation(x, 0, z); pole.setMatrixAt(i, m); head.setMatrixAt(i, m); });
    pole.castShadow = true; scene.add(pole, head);
  }
  drawTileOnMap(t, c, rd);
  wCache.clear();
}

/* tile streaming */
const loadedTiles = new Set(), tileQueue = [];
let streaming = false;
const tileKey = (x, z) => `${Math.floor(x / TI.size)}_${Math.floor(z / TI.size)}`;
function tilesAround(x, z, r) {
  const out = [], S = TI.size;
  for (let i = Math.floor((x - r) / S); i <= Math.floor((x + r) / S); i++) for (let j = Math.floor((z - r) / S); j <= Math.floor((z + r) / S); j++) {
    const k = `${i}_${j}`; if (!TI.tiles[k]) continue;
    const cx = Math.max(i * S, Math.min(x, (i + 1) * S)), cz = Math.max(j * S, Math.min(z, (j + 1) * S));   // nearest point of the tile
    const d = Math.hypot(cx - x, cz - z); if (d <= r) out.push([d, k]);
  }
  return out.sort((a, b) => a[0] - b[0]).map((e) => e[1]);
}
async function loadTile(k) {
  if (loadedTiles.has(k)) return; loadedTiles.add(k);
  try {
    const t = await fetch(`data/tiles/${k}.json`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
    await addTileToScene(t);
  } catch (err) { loadedTiles.delete(k); console.warn('tile', k, err); }
}
function queueAround(x, z) { for (const k of tilesAround(x, z, P.mode === 'eagle' ? STREAM_R * 1.8 : STREAM_R)) if (!loadedTiles.has(k) && !tileQueue.includes(k)) tileQueue.push(k); pumpTiles(); }
async function pumpTiles() {
  if (streaming) return; streaming = true;
  while (tileQueue.length) {
    const k = tileQueue.shift(); await loadTile(k);
    const el = $('#stream'); if (el) el.textContent = tileQueue.length ? `載入街區中… 剩 ${tileQueue.length}` : '';
    await new Promise((r) => setTimeout(r, 30));   // yield so walking stays smooth between tiles
  }
  streaming = false;
}

function nearSegs(x, z, r) {
  const out = new Set();
  for (let gx = Math.floor((x - r) / SEG_CELL); gx <= Math.floor((x + r) / SEG_CELL); gx++) for (let gz = Math.floor((z - r) / SEG_CELL); gz <= Math.floor((z + r) / SEG_CELL); gz++) for (const i of segGrid.get(gx * 73856093 ^ gz * 19349663) || []) out.add(i);
  return out;
}
function pushOut(x, z, rad) {
  for (let pass = 0; pass < 3; pass++) {
    for (const i of nearSegs(x, z, rad + 0.5)) {
      const s = city.segs[i], dx = s[2] - s[0], dz = s[3] - s[1], L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / L2)), px = s[0] + dx * t, pz = s[1] + dz * t;
      const ox = x - px, oz = z - pz, d = Math.hypot(ox, oz);
      if (d < rad && d > 1e-6) { x = px + ox / d * rad; z = pz + oz / d * rad; }
    }
    for (const c of extraColliders) {
      const dx = x - c.c.x, dz = z - c.c.z, co = Math.cos(c.yaw), si = Math.sin(c.yaw);
      let lx = dx * co - dz * si, lz = dx * si + dz * co; const qx = THREE.MathUtils.clamp(lx, -c.hx, c.hx), qz = THREE.MathUtils.clamp(lz, -c.hz, c.hz), ox = lx - qx, oz = lz - qz, d = Math.hypot(ox, oz);
      if (d < rad) { if (d < 1e-6) { if (c.hx - Math.abs(lx) < c.hz - Math.abs(lz)) lx = Math.sign(lx || 1) * (c.hx + rad); else lz = Math.sign(lz || 1) * (c.hz + rad); } else { lx = qx + ox / d * rad; lz = qz + oz / d * rad; } x = c.c.x + lx * co + lz * si; z = c.c.z - lx * si + lz * co; }
    }
  }
  return [x, z];
}
function segmentHits(x1, z1, x2, z2) {
  for (const i of nearSegs((x1 + x2) / 2, (z1 + z2) / 2, Math.hypot(x2 - x1, z2 - z1) / 2 + 1)) {
    const s = city.segs[i];
    const d = (s[2] - s[0]) * (z2 - z1) - (s[3] - s[1]) * (x2 - x1); if (Math.abs(d) < 1e-9) continue;
    const t = ((x1 - s[0]) * (z2 - z1) - (z1 - s[1]) * (x2 - x1)) / d, u = ((x1 - s[0]) * (s[3] - s[1]) - (z1 - s[1]) * (s[2] - s[0])) / d;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  return false;
}
function insideBuilding(x, z, y = 0) { for (const i of fpGrid.get(Math.floor(x / FP_CELL) + ',' + Math.floor(z / FP_CELL)) || []) { const f = city.footprints[i]; if (y < f.H && pip(x, z, f.o)) return true; } return false; }
function inWater(x, z) {
  for (const w of WATER) { if (pip(x, z, w.o) && !(w.i || []).some((h) => pip(x, z, h))) return true; }
  return false;
}
function onBridge(x, z) {
  for (const r of bridges) for (let i = 0; i < r.p.length / 2 - 1; i++) {
    const x1 = r.p[2 * i], z1 = r.p[2 * i + 1], x2 = r.p[2 * i + 2], z2 = r.p[2 * i + 3], dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / L2)); if (Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t)) < r.w / 2 + 0.3) return true;
  }
  return false;
}
const walkable = (x, z) => Math.abs(x) < 2400 && Math.abs(z) < 2400 && (!inWater(x, z) || onBridge(x, z));
// water test is costly; cache per 1 m cell
const wCache = new Map();
function walkableC(x, z) { const k = Math.round(x) * 100003 + Math.round(z); if (!wCache.has(k)) { if (wCache.size > 200000) wCache.clear(); wCache.set(k, walkable(Math.round(x), Math.round(z))); } return wCache.get(k); }

/* ------------------------------------------------------------ first tiles around the spawn point */
const teufelLM = LM.landmarks.find((l) => l.id === 'teufel');
{
  const first = tilesAround(teufelLM.local_xz_m[0], teufelLM.local_xz_m[1], 160);
  for (let n = 0; n < first.length; n++) { status(`建立周邊街區… ${n + 1}／${first.length}`); await loadTile(first[n]); await new Promise((r) => setTimeout(r, 0)); }
}
const hero = buildHero(scene, M, city.segs, { x: teufelLM.local_xz_m[0], z: teufelLM.local_xz_m[1] });
extraColliders.push(...hero.colliders);

/* ------------------------------------------------------------ actors */
// The player starts as the built-in character (generated in code, no download), so walking, the bike and the car
// work immediately. On computers the more detailed downloaded character replaces it in the background.
let H = createMannequin(scene, PLAYER_LOOK), B = H.bones;
if (refMode) H.root.visible = false;
if (!TOUCH && qName !== 'low' && !refMode) {
  setTimeout(() => loadHuman(scene, (l, t) => { $('#charload').textContent = `細緻人物 ${Math.min(99, Math.round(l / t * 100))}%`; })
    .then((h) => {
      if (P.mode !== 'walk') { h.root.visible = false; const wait = setInterval(() => { if (P.mode === 'walk') { clearInterval(wait); swap(h); } }, 500); } else swap(h);
    })
    .catch((err) => { $('#charload').textContent = ''; console.warn('detailed character not loaded, keeping the built-in one', err); }), 4000);
}
function swap(h) { h.root.visible = true; h.root.position.copy(H.root.position); h.root.rotation.copy(H.root.rotation); scene.remove(H.root); H = h; B = h.bones; $('#charload').textContent = ''; }
const traffic = new Traffic(scene, roads, { touch: TOUCH, isFree: (x, z) => !insideBuilding(x, z) && walkableC(x, z) });
const bike = makeBike(scene), car = makeCar(scene);
const LMby = Object.fromEntries(LM.landmarks.map((l) => [l.id, l]));
// spawn: on the Markt side of St. Marien, looking at the devil
const start = hero.statueWorld.clone().add(new THREE.Vector3().subVectors(hero.refCam.pos, hero.statueWorld).setY(0).normalize().multiplyScalar(3.5));
const P = { x: start.x, z: start.z, y: 0, vy: 0, yaw: Math.atan2(hero.statueWorld.x - start.x, hero.statueWorld.z - start.z), speed: 0, mode: 'walk', t: 0 };
// parked bike & car near the Markt / Breite Straße (verified road positions are placed by snapping to the nearest OSM road)
function nearestRoadPoint(x, z, kinds) { let best = null, bd = 1e9; for (const r of roads.graph) { if (kinds && !kinds.includes(r.k)) continue; for (let i = 0; i < r.p.length / 2 - 1; i++) { const x1 = r.p[2 * i], z1 = r.p[2 * i + 1], x2 = r.p[2 * i + 2], z2 = r.p[2 * i + 3], dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / L2)), px = x1 + dx * t, pz = z1 + dz * t, d = Math.hypot(x - px, z - pz); if (d < bd) { bd = d; best = { x: px, z: pz, yaw: Math.atan2(dx, dz), w: r.w }; } } } return best; }
{
  const b = nearestRoadPoint(P.x + 6, P.z + 6, ['pedestrian', 'footway', 'living_street', 'residential', 'service']);
  Object.assign(bike, { x: b.x + 1.2, z: b.z, yaw: b.yaw }); bike.g.position.set(bike.x, 0, bike.z); bike.g.rotation.y = bike.yaw;
  const c = nearestRoadPoint(P.x + 40, P.z + 10, ['residential', 'tertiary', 'secondary', 'living_street', 'unclassified']);
  Object.assign(car, { x: c.x, z: c.z, yaw: c.yaw }); car.g.position.set(car.x, 0, car.z); car.g.rotation.y = car.yaw;
}

/* ------------------------------------------------------------ post */
let composer = null, aoPass = null;
if (Q.aa || Q.ao) {
  composer = new EffectComposer(renderer); composer.setPixelRatio(Math.min(devicePixelRatio, Q.dpr)); composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  if (Q.ao) { aoPass = new GTAOPass(scene, camera, innerWidth, innerHeight); aoPass.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.0, scale: 1.0 }); aoPass.blendIntensity = 0.85; composer.addPass(aoPass); }
  composer.addPass(new OutputPass());
  if (Q.aa) composer.addPass(new SMAAPass(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio()));
}
applyTime(timeIdx);

/* ------------------------------------------------------------ input */
const keys = new Set(); let started = false;
let camYaw = P.yaw + Math.PI, camPitch = 0.22, camDist = 5.2, firstPerson = false;
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input,select,textarea')) return;
  const k = e.key.toLowerCase(); keys.add(k);
  if (!started) return;
  if (k === 'e') interact(); else if (k === 'f') callEagle(); else if (k === 't') { timeIdx = (timeIdx + 1) % TIMES.length; applyTime(timeIdx); }
  else if (k === 'v') { firstPerson = !firstPerson; } else if (k === 'f3') { $('#perf').hidden = !$('#perf').hidden; e.preventDefault(); }
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
let drag = null;
canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') return; drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => { if (!drag) return; camYaw -= (e.clientX - drag.x) * 0.005; camPitch = THREE.MathUtils.clamp(camPitch + (e.clientY - drag.y) * 0.004, -0.4, 1.3); drag = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => { camDist = THREE.MathUtils.clamp(camDist * (1 + Math.sign(e.deltaY) * 0.1), 1.8, 25); e.preventDefault(); }, { passive: false });
// touch joystick + look
const stick = { id: null, x: 0, y: 0 }, look = { id: null };
const stickEl = $('#stick'), knob = stickEl.querySelector('i');
for (const ev of ['touchstart', 'touchmove', 'contextmenu', 'selectstart']) { stickEl.addEventListener(ev, (e) => e.preventDefault(), { passive: false }); canvas.addEventListener(ev, (e) => e.preventDefault(), { passive: false }); }
stickEl.addEventListener('pointerdown', (e) => { e.preventDefault(); stick.id = e.pointerId; stickEl.setPointerCapture(e.pointerId); moveStick(e); });
stickEl.addEventListener('pointermove', (e) => { if (e.pointerId === stick.id) moveStick(e); });
for (const ev of ['pointerup', 'pointercancel']) stickEl.addEventListener(ev, (e) => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; knob.style.transform = ''; });
function moveStick(e) { const r = stickEl.getBoundingClientRect(); let dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2; const l = Math.hypot(dx, dy); if (l > 50) { dx *= 50 / l; dy *= 50 / l; } stick.x = dx / 50; stick.y = dy / 50; knob.style.transform = `translate(${dx}px,${dy}px)`; }
canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && look.id === null) { look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY; } });
canvas.addEventListener('pointermove', (e) => { if (e.pointerId !== look.id) return; camYaw -= (e.clientX - look.x) * 0.007; camPitch = THREE.MathUtils.clamp(camPitch + (e.clientY - look.y) * 0.005, -0.4, 1.3); look.x = e.clientX; look.y = e.clientY; });
for (const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, (e) => { if (e.pointerId === look.id) look.id = null; });
$('#bAct').addEventListener('click', () => interact());
$('#bTime').addEventListener('click', () => { timeIdx = (timeIdx + 1) % TIMES.length; applyTime(timeIdx); });
$('#bView').addEventListener('click', () => { firstPerson = !firstPerson; });
$('#bEagle').addEventListener('click', () => callEagle());
$('#qSel').value = qName;
$('#qSel').addEventListener('change', (e) => { try { localStorage.setItem('lub-q', e.target.value); } catch { /* storage blocked */ } const u = new URL(location.href); u.searchParams.set('q', e.target.value); location.href = u.toString(); });

function inputVec() {
  let ix = 0, iz = 0;
  if (keys.has('w') || keys.has('arrowup')) iz += 1; if (keys.has('s') || keys.has('arrowdown')) iz -= 1;
  if (keys.has('a') || keys.has('arrowleft')) ix -= 1; if (keys.has('d') || keys.has('arrowright')) ix += 1;
  if (stick.id !== null) { ix += stick.x; iz -= stick.y; }
  return [THREE.MathUtils.clamp(ix, -1, 1), THREE.MathUtils.clamp(iz, -1, 1)];
}

/* ------------------------------------------------------------ mode switching */
const prompt = $('#prompt');
const REACH = TOUCH ? 4.0 : 2.6;   // easier to reach with a thumb stick
// on phones the prompt itself is the button (there is no E key)
prompt.addEventListener('click', (e) => { e.stopPropagation(); if (prompt.dataset.act === 'eagle') { callEagle(); return; } interact(); });
for (const ev of ['pointerdown', 'touchstart']) prompt.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
function interact() {
  if (P.mode === 'eagle') { landEagle(); return; }
  if (P.mode === 'walk' && eagle.state === 'perched' && Math.hypot(P.x - eagle.x, P.z - eagle.z) < 9) { P.mode = 'eagleMount'; P.t = 0; P.from = { x: P.x, z: P.z }; return; }
  if (P.mode === 'walk') {
    const dBike = Math.hypot(P.x - bike.x, P.z - bike.z);
    const door = new THREE.Vector3().copy(car.driverDoor).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.yaw).add(new THREE.Vector3(car.x, 0, car.z));
    const dCar = Math.hypot(P.x - door.x, P.z - door.z);
    if (dBike < REACH && dBike <= dCar) { P.mode = 'mountBike'; P.t = 0; P.from = { x: P.x, z: P.z, yaw: P.yaw }; }
    else if (dCar < REACH) { P.mode = 'enterCar'; P.t = 0; P.from = { x: P.x, z: P.z, yaw: P.yaw }; }
  } else if (P.mode === 'bike' && Math.abs(bike.v) < 1.5) {
    const spot = safeSpot(bike.x, bike.z, bike.yaw, [[-0.9, 0], [0.9, 0], [-0.9, -0.6]]);
    if (spot) { P.mode = 'dismountBike'; P.t = 0; P.to = spot; bike.v = 0; } else toast('這裡沒有安全的位置下車');
  } else if (P.mode === 'car' && Math.abs(car.v) < 1.0) {
    const spot = safeSpot(car.x, car.z, car.yaw, [[1.6, -0.1], [-1.6, -0.1], [1.6, -2.6]]);
    if (spot) { P.mode = 'exitCar'; P.t = 0; P.to = spot; car.v = 0; } else toast('車門旁沒有安全的空間');
  }
}
function safeSpot(x, z, yaw, offsets) {
  for (const [ox, oz] of offsets) {
    const sx = x + ox * Math.cos(yaw) + oz * Math.sin(yaw), sz = z - ox * Math.sin(yaw) + oz * Math.cos(yaw);
    if (walkableC(sx, sz) && !insideBuilding(sx, sz) && !segmentHits(x, z, sx, sz)) { const [px, pz] = pushOut(sx, sz, 0.35); if (Math.hypot(px - sx, pz - sz) < 0.2) return { x: sx, z: sz }; }
  }
  return null;
}
let toastT = 0; function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); toastT = 2.5; }

/* ------------------------------------------------------------ simulation */
function walkStep(dt) {
  const [ix, iz] = inputVec(), mag = Math.min(1, Math.hypot(ix, iz)), run = keys.has('shift') || (stick.id !== null && Math.hypot(stick.x, stick.y) > 0.92);
  const target = mag > 0.05 ? (run ? 5.0 : 1.45) * mag : 0;
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
  let dx = fx * iz - fz * ix, dz = fz * iz + fx * ix; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
  P.speed += (target - P.speed) * (1 - Math.exp(-dt * (target > P.speed ? 4 : 7)));   // ease in/out = start & stop
  if (mag > 0.05) { let d = Math.atan2(dx, dz) - P.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); P.yaw += d * (1 - Math.exp(-dt * 9)); }
  let nx = P.x + Math.sin(P.yaw) * P.speed * dt, nz = P.z + Math.cos(P.yaw) * P.speed * dt;
  [nx, nz] = pushOut(nx, nz, 0.3); [nx, nz] = traffic.pushPlayer(nx, nz, 0.3);
  if (walkableC(nx, nz)) { P.x = nx; P.z = nz; } else P.speed *= 0.5;
  if (keys.has(' ') && P.y <= 0) P.vy = 3.6;
  P.vy -= 9.81 * dt; P.y = Math.max(0, P.y + P.vy * dt); if (P.y === 0) P.vy = Math.max(0, P.vy);
  H.root.position.set(P.x, P.y, P.z); H.root.rotation.set(0, P.yaw, 0);
  updateLocomotion(H, P.speed, dt);
}
function bikeStep(dt) {
  const [ix, iz] = inputVec();
  const accel = iz > 0 ? 2.2 * iz : 0, brake = iz < 0 ? 5 * -iz : 0;
  bike.v += (accel - brake * Math.sign(bike.v) - 0.08 * bike.v - 0.004 * bike.v * Math.abs(bike.v)) * dt;
  if (Math.abs(bike.v) < 0.05 && iz <= 0) bike.v = 0;
  bike.v = THREE.MathUtils.clamp(bike.v, -0.8, 8.5);
  const maxSteer = THREE.MathUtils.lerp(0.6, 0.18, Math.min(1, Math.abs(bike.v) / 8));
  bike.steerA += (ix * -maxSteer - bike.steerA) * (1 - Math.exp(-dt * 6));
  const yawRate = bike.v * Math.tan(bike.steerA) / bike.wheelbase;
  bike.yaw += yawRate * dt;
  const leanT = THREE.MathUtils.clamp(Math.atan(bike.v * yawRate / 9.81), -0.5, 0.5);
  bike.leanA += (leanT - bike.leanA) * (1 - Math.exp(-dt * 5));
  const nx = bike.x + Math.sin(bike.yaw) * bike.v * dt, nz = bike.z + Math.cos(bike.yaw) * bike.v * dt;
  const fx = nx + Math.sin(bike.yaw) * 0.9, fz = nz + Math.cos(bike.yaw) * 0.9;
  const [px, pz] = pushOut(nx, nz, 0.35);
  if (traffic.hitsVehicle(fx, fz, 1.4)) { bike.v *= -0.15; }
  if (walkableC(fx, fz) && walkableC(px, pz) && !segmentHits(bike.x, bike.z, fx, fz)) { bike.x = px; bike.z = pz; } else { bike.v *= -0.15; }
  // drivetrain: wheels roll with distance; cranks only turn while pedalling (gear 2.4) — coasting keeps them still
  const dWheel = bike.v * dt / bike.R;
  bike.wRear.rotation.x += dWheel; bike.wFront.rotation.x += dWheel;
  if (accel > 0 && bike.v > 0) bike.crankA += dWheel / 2.4;
  bike.crank.rotation.x = bike.crankA; for (const p of bike.pedals) p.rotation.x = -bike.crankA;
  bike.g.position.set(bike.x, 0, bike.z); bike.g.rotation.y = bike.yaw; bike.lean.rotation.z = -bike.leanA;
  bike.steer.quaternion.setFromAxisAngle(bike.steer.userData.axis, bike.steerA);
}
function carStep(dt) {
  const [ix, iz] = inputVec();
  const throttle = Math.max(0, iz), brake = Math.max(0, -iz);
  let a = 0;
  if (throttle) a = car.v >= -0.1 ? 3.2 * throttle : 7 * throttle;
  if (brake) a = car.v > 0.3 ? -8 * brake : -2.2 * brake;   // brake, then reverse
  a -= 0.25 * car.v + 0.0025 * car.v * Math.abs(car.v);
  car.v = THREE.MathUtils.clamp(car.v + a * dt, -4, 14);       // 50 km/h cap in the old town
  if (Math.abs(car.v) < 0.03 && !throttle && !brake) car.v = 0;
  const maxSteer = THREE.MathUtils.lerp(0.6, 0.22, Math.min(1, Math.abs(car.v) / 14));
  car.steerA += (ix * -maxSteer - car.steerA) * (1 - Math.exp(-dt * 5));
  const yawRate = car.v * Math.tan(car.steerA) / car.wheelbase;
  const nyaw = car.yaw + yawRate * dt, nx = car.x + Math.sin(nyaw) * car.v * dt, nz = car.z + Math.cos(nyaw) * car.v * dt;
  // footprint check: 8 points on the body outline
  let ok = true; const co = Math.cos(nyaw), si = Math.sin(nyaw);
  const pts = [[0.85, 2.0], [-0.85, 2.0], [0.85, -2.0], [-0.85, -2.0], [0.88, 0], [-0.88, 0], [0, 2.05], [0, -2.05]].map(([lx, lz]) => [nx + lx * co + lz * si, nz - lx * si + lz * co]);
  for (const [x, z] of pts) if (!walkableC(x, z) || insideBuilding(x, z, 0.5)) { ok = false; break; }
  if (ok && traffic.hitsVehicle(nx, nz, 3.2)) ok = false;
  if (ok) for (const [a, b] of [[0, 1], [1, 3], [3, 2], [2, 0]]) if (segmentHits(pts[a][0], pts[a][1], pts[b][0], pts[b][1])) { ok = false; break; }
  if (ok) { car.x = nx; car.z = nz; car.yaw = nyaw; } else { car.v *= -0.2; if (Math.abs(car.v) > 0.5) toast('碰撞'); }
  // body dynamics: pitch with longitudinal accel, roll with lateral accel (spring-damper feel)
  car.pitch += (THREE.MathUtils.clamp(-a * 0.006, -0.05, 0.05) - car.pitch) * (1 - Math.exp(-dt * 6));
  car.roll += (THREE.MathUtils.clamp(car.v * yawRate * 0.01, -0.06, 0.06) - car.roll) * (1 - Math.exp(-dt * 5));
  car.g.position.set(car.x, 0, car.z); car.g.rotation.y = car.yaw;
  car.body.rotation.set(car.pitch, 0, car.roll);
  for (const w of car.wheels) { w.spin.rotation.x += car.v * dt / 0.31; if (w.front) w.pivot.rotation.y = car.steerA; }
  car.steeringWheel.rotation.z = -car.steerA * 6;
}

// seated poses: hips on the seat, IK legs to pedals/floor, IK arms to grips/steering wheel
function seatHuman(seatWorld, yaw, legTargets, handTargets, kneePole, elbowPole, lean = 0) {
  H.root.position.set(0, 0, 0); H.root.rotation.set(0, yaw, lean); H.root.updateMatrixWorld(true);
  const hips = B.Hips.getWorldPosition(new THREE.Vector3());
  H.root.position.copy(seatWorld).sub(hips).add(new THREE.Vector3(0, 0.08, 0)); H.root.updateMatrixWorld(true);
  B.Spine.rotation.set(0.12, 0, 0); B.Spine1.rotation.set(0.08, 0, 0);   // absolute, not +=: the built-in idle clip has no Spine track, so += accumulated every frame and spun the rider B.Hips.updateMatrixWorld(true);
  twoBoneIK(B.LeftUpLeg, B.LeftLeg, B.LeftFoot, legTargets[0], kneePole[0]);
  twoBoneIK(B.RightUpLeg, B.RightLeg, B.RightFoot, legTargets[1], kneePole[1]);
  twoBoneIK(B.LeftArm, B.LeftForeArm, B.LeftHand, handTargets[0], elbowPole[0]);
  twoBoneIK(B.RightArm, B.RightForeArm, B.RightHand, handTargets[1], elbowPole[1]);
}
const tmpM = new THREE.Vector3();
function poseOnBike(dt, blend = 1) {
  H.mixer.update(dt); for (const k of ['idle', 'walk', 'run']) H.A[k].setEffectiveWeight(k === 'idle' ? 1 : 0);
  bike.g.updateMatrixWorld(true);
  const seatW = bike.lean.localToWorld(bike.seat.clone());
  const fwd = new THREE.Vector3(Math.sin(bike.yaw), 0, Math.cos(bike.yaw)), up = new THREE.Vector3(0, 1, 0), right = new THREE.Vector3().crossVectors(fwd, up).normalize();
  const pedalW = bike.pedals.map((p) => p.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.05, 0)));
  // pedals: index 0 is the -x side; rider's left is +x in bike space (bike faces +z)
  const gripW = bike.grips.map((g) => bike.steer.localToWorld(g.clone()));
  const legs = [pedalW[1], pedalW[0]], hands = [gripW[1], gripW[0]];
  const kneeP = [seatW.clone().addScaledVector(fwd, 2).addScaledVector(right, -0.3).setY(seatW.y + 0.3), seatW.clone().addScaledVector(fwd, 2).addScaledVector(right, 0.3).setY(seatW.y + 0.3)];
  const elbP = [seatW.clone().addScaledVector(right, -1).setY(seatW.y), seatW.clone().addScaledVector(right, 1).setY(seatW.y)];
  if (blend < 1) { for (const l of legs) l.lerp(tmpM.copy(seatW).setY(0), 1 - blend); }
  seatHuman(seatW, bike.yaw, legs, hands, kneeP, elbP, -bike.leanA);
}
function poseInCar(dt) {
  H.mixer.update(dt); for (const k of ['idle', 'walk', 'run']) H.A[k].setEffectiveWeight(k === 'idle' ? 1 : 0);
  car.g.updateMatrixWorld(true);
  const seatW = car.body.localToWorld(car.seat.clone());
  const fwd = new THREE.Vector3(Math.sin(car.yaw), 0, Math.cos(car.yaw)), right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const sw = car.steeringWheel; sw.updateMatrixWorld(true);
  const hL = sw.localToWorld(new THREE.Vector3(0.17, 0.02, 0)), hR = sw.localToWorld(new THREE.Vector3(-0.17, 0.02, 0));
  const fL = car.body.localToWorld(new THREE.Vector3(0.5, 0.25, 0.75)), fR = car.body.localToWorld(new THREE.Vector3(0.28, 0.25, 0.75));
  const kneeP = [seatW.clone().addScaledVector(fwd, 2).setY(seatW.y + 1), seatW.clone().addScaledVector(fwd, 2).setY(seatW.y + 1)];
  const elbP = [seatW.clone().addScaledVector(right, -1).setY(seatW.y - 0.3), seatW.clone().addScaledVector(right, 1).setY(seatW.y - 0.3)];
  seatHuman(seatW, car.yaw, [fL, fR], [hL, hR], kneeP, elbP);
}
function transitionStep(dt) {
  P.t += dt;
  const k = THREE.MathUtils.smoothstep(P.t / 0.7, 0, 1);
  if (P.mode === 'mountBike' || P.mode === 'enterCar') {
    const target = P.mode === 'mountBike' ? { x: bike.x - Math.cos(bike.yaw) * 0.5, z: bike.z + Math.sin(bike.yaw) * 0.5, yaw: bike.yaw }
      : (() => { const d = new THREE.Vector3().copy(car.driverDoor).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.yaw); return { x: car.x + d.x, z: car.z + d.z, yaw: car.yaw }; })();
    if (P.t < 0.7) { // walk to the bike / door
      P.x = THREE.MathUtils.lerp(P.from.x, target.x, k); P.z = THREE.MathUtils.lerp(P.from.z, target.z, k);
      let d = target.yaw - P.from.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); P.yaw = P.from.yaw + d * k;
      H.root.position.set(P.x, 0, P.z); H.root.rotation.set(0, P.yaw, 0); updateLocomotion(H, 1.2 * (1 - k) + 0.2, dt);
    } else { P.mode = P.mode === 'mountBike' ? 'bike' : 'car'; if (P.mode === 'car') car.headM.emissiveIntensity = 1.5; }
  } else if (P.mode === 'dismountBike' || P.mode === 'exitCar') {
    if (P.t < 0.6) { if (P.mode === 'dismountBike') poseOnBike(dt, 1 - k); else poseInCar(dt); }
    else { P.x = P.to.x; P.z = P.to.z; P.yaw = (P.mode === 'exitCar' ? car.yaw : bike.yaw); P.speed = 0; P.mode = 'walk'; H.root.rotation.set(0, P.yaw, 0); H.root.position.set(P.x, 0, P.z); }
  }
}


/* ------------------------------------------------------------ black eagle: call (F), ride, land (E) */
const eagle = makeEagle(scene);
function callEagle() {
  if (P.mode !== 'walk' || eagle.state !== 'hidden') { if (eagle.state !== 'hidden' && P.mode === 'walk') toast('黑鷹已經在路上了'); return; }
  const a = P.yaw + 0.6, sx = P.x + Math.sin(a) * 220, sz = P.z + Math.cos(a) * 220;
  Object.assign(eagle, { state: 'arrive', t: 0, from: { x: sx, y: 90, z: sz }, x: sx, y: 90, z: sz, pitch: 0, bank: 0, v: 0 });
  eagle.g.visible = true; toast('黑鷹正在飛來…');
}
const eagleSide = () => ({ x: P.x + Math.cos(P.yaw) * 3.2, z: P.z - Math.sin(P.yaw) * 3.2 });   // lands at the player's right
function eagleStep(dt) {
  const E = eagle;
  if (E.state === 'hidden') return;
  if (E.state === 'arrive') {
    E.t += dt / 6; const k = Math.min(1, E.t), T = eagleSide(), e = 1 - (1 - k) ** 2;
    const nx = THREE.MathUtils.lerp(E.from.x, T.x, e), nz = THREE.MathUtils.lerp(E.from.z, T.z, e), ny = E.from.y * (1 - k) ** 1.6;
    if (Math.hypot(nx - E.x, nz - E.z) > 0.01) E.yaw = Math.atan2(nx - E.x, nz - E.z);
    E.pitch = k < 0.85 ? 0.15 : -0.35 * (k - 0.85) / 0.15; E.x = nx; E.y = ny; E.z = nz;
    E.animate(dt, k > 0.82 ? 1 : 0.35, THREE.MathUtils.clamp((k - 0.7) / 0.3, 0, 1));
    if (k >= 1) { E.state = 'perched'; E.pitch = 0; E.yaw = P.yaw; toast(TOUCH ? '點畫面下方的按鈕騎上黑鷹' : '按 E 騎上黑鷹'); }
  } else if (E.state === 'perched') {
    E.animate(dt, 0.02, 1, 0.4);
  } else if (E.state === 'land') {
    E.t += dt / E.dur; const k = Math.min(1, E.t), e = k * k * (3 - 2 * k);
    E.x = THREE.MathUtils.lerp(E.from.x, E.to.x, e); E.z = THREE.MathUtils.lerp(E.from.z, E.to.z, e); E.y = E.from.y * (1 - e);
    E.pitch = -0.25 * Math.sin(k * Math.PI); E.bank *= 0.95; E.v = 12 * (1 - k);
    E.animate(dt, k > 0.7 ? 1 : 0.3, THREE.MathUtils.clamp((k - 0.6) / 0.4, 0, 1));
    if (k >= 1) {   // touchdown: rider steps off to the eagle's left, eagle leaves
      const sx = E.x - Math.cos(E.yaw) * 2.6, sz = E.z + Math.sin(E.yaw) * 2.6;
      Object.assign(P, { x: sx, z: sz, y: 0, yaw: E.yaw, speed: 0, mode: 'walk' }); H.root.rotation.set(0, P.yaw, 0);
      E.state = 'leave'; E.t = 0;
    }
  } else if (E.state === 'leave') {
    E.t += dt; E.v = Math.min(24, 6 + E.t * 6); E.pitch = -0.3; E.y += (4 + E.t * 2) * dt;
    E.x += Math.sin(E.yaw) * E.v * dt; E.z += Math.cos(E.yaw) * E.v * dt; E.animate(dt, 1, Math.max(0, 1 - E.t));
    if (E.t > 9) { E.state = 'hidden'; E.g.visible = false; }
  }
  if (E.state !== 'fly') E.place();
}
function eagleMountStep(dt) {
  P.t += dt; const k = Math.min(1, P.t / 0.9), T = { x: eagle.x + Math.cos(eagle.yaw) * -1.6, z: eagle.z - Math.sin(eagle.yaw) * -1.6 };
  P.x = THREE.MathUtils.lerp(P.from.x, T.x, k); P.z = THREE.MathUtils.lerp(P.from.z, T.z, k);
  H.root.position.set(P.x, 0, P.z); H.root.rotation.set(0, eagle.yaw, 0); updateLocomotion(H, 1.2, dt);
  if (k >= 1) { P.mode = 'eagle'; Object.assign(eagle, { state: 'fly', v: 9, vy: 7 }); }
}
function flyStep(dt) {
  const E = eagle, [ix, iz] = inputVec(), boost = keys.has('shift'), slow = keys.has(' ');
  const vT = slow ? 9 : boost ? 38 : 20; E.v += (vT - E.v) * (1 - Math.exp(-dt * 1.1));
  E.bank += (ix * 0.6 - E.bank) * (1 - Math.exp(-dt * 3));
  E.yaw -= E.bank * 1.15 * dt * Math.sqrt(E.v / 20);
  let vyT = iz * 11; if (E.y < 12) vyT = Math.max(vyT, 6);   // take-off assist
  E.vy += (vyT - E.vy) * (1 - Math.exp(-dt * 2));
  if (insideBuilding(E.x + Math.sin(E.yaw) * 8, E.z + Math.cos(E.yaw) * 8, E.y - 4)) E.vy = Math.max(E.vy, 9);   // pull up over roofs
  E.y = THREE.MathUtils.clamp(E.y + E.vy * dt, 4, 420);
  E.x = THREE.MathUtils.clamp(E.x + Math.sin(E.yaw) * E.v * dt, -2300, 2300); E.z = THREE.MathUtils.clamp(E.z + Math.cos(E.yaw) * E.v * dt, -2300, 2300);
  E.pitch = -Math.atan2(E.vy, Math.max(6, E.v)) * 0.8;
  const flap = E.vy > 2 || E.v < 14 ? 1 : boost ? 0.6 : 0.18 + 0.2 * Math.max(0, Math.sin(simT * 0.4));
  E.animate(dt, flap, 0); E.place();
}
function landEagle() {
  const E = eagle; if (E.state !== 'fly') return;
  // prefer the nearest street ahead (streets are open ground in the dense old town), else any free spot
  { const ax = E.x + Math.sin(E.yaw) * Math.max(15, E.y * 0.8), az = E.z + Math.cos(E.yaw) * Math.max(15, E.y * 0.8);
    const r = nearestRoadPoint(ax, az, ['pedestrian', 'living_street', 'residential', 'tertiary', 'secondary', 'primary', 'unclassified', 'service', 'footway']);
    if (r && Math.hypot(r.x - ax, r.z - az) < 160 && !insideBuilding(r.x, r.z) && walkableC(r.x, r.z)) {
      Object.assign(E, { state: 'land', t: 0, dur: Math.max(3, Math.min(10, Math.hypot(r.x - E.x, r.z - E.z, E.y) / 10)), from: { x: E.x, y: E.y, z: E.z }, to: { x: r.x, z: r.z } });
      E.yaw = Math.atan2(r.x - E.x, r.z - E.z); return;
    } }
  for (const ahead of [Math.max(15, E.y * 1.2), 10, 0, 30, 50]) for (const side of [0, 8, -8, 16, -16]) {
    const tx = E.x + Math.sin(E.yaw) * ahead + Math.cos(E.yaw) * side, tz = E.z + Math.cos(E.yaw) * ahead - Math.sin(E.yaw) * side;
    let ok = walkableC(tx, tz); for (const [ox, oz] of [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]]) if (ok && insideBuilding(tx + ox, tz + oz)) ok = false;
    if (ok) { Object.assign(E, { state: 'land', t: 0, dur: Math.max(3, Math.min(9, Math.hypot(ahead, E.y) / 9)), from: { x: E.x, y: E.y, z: E.z }, to: { x: tx, z: tz } }); return; }
  }
  toast('下面沒有可以降落的空地，再飛一段試試');
}
function poseOnEagle(dt) {
  H.mixer.update(dt); for (const k of ['idle', 'walk', 'run']) H.A[k].setEffectiveWeight(k === 'idle' ? 1 : 0);
  const g = eagle.g; g.updateMatrixWorld(true);
  const seatW = g.localToWorld(eagle.seat.clone());
  const L = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z));
  seatHuman(seatW, eagle.yaw, [L(0.85, 0.15, 0.7), L(-0.85, 0.15, 0.7)], [L(0.22, 1.05, 1.9), L(-0.22, 1.05, 1.9)],
    [L(1.8, 0.8, 2.2), L(-1.8, 0.8, 2.2)], [L(1.5, 0.5, 0.6), L(-1.5, 0.5, 0.6)], eagle.bank);
}

/* ------------------------------------------------------------ camera */
const camPos = new THREE.Vector3(), headV = new THREE.Vector3(), camLook = new THREE.Vector3();
function camOccluded(x, y, z) { return y < 0.25 || insideBuilding(x, z, y); }
function updateCamera(dt) {
  let fx = P.x, fz = P.z, fy = 1.55, dist = camDist, yawFollow = P.yaw, follow = P.speed > 0.5;
  if (P.mode === 'bike' || P.mode === 'dismountBike') { fx = bike.x; fz = bike.z; fy = 1.6; dist = Math.max(camDist, 4.2); yawFollow = bike.yaw; follow = Math.abs(bike.v) > 0.5; }
  if (P.mode === 'eagle' || P.mode === 'eagleMount') { fx = eagle.x; fz = eagle.z; fy = eagle.y + 2.2; dist = Math.max(camDist, 13); yawFollow = eagle.yaw; follow = true; }
  if (P.mode === 'car' || P.mode === 'exitCar') { fx = car.x; fz = car.z; fy = 1.5; dist = Math.max(camDist, 7.0); yawFollow = car.yaw; follow = Math.abs(car.v) > 0.5; }
  if (follow && !drag && look.id === null) { let d = (yawFollow + Math.PI) - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); camYaw += d * (1 - Math.exp(-dt * (P.mode === 'walk' ? 1.2 : 2.5))); }
  headV.set(fx, fy, fz);
  if (firstPerson && P.mode === 'walk' && B) { B.Head.getWorldPosition(camPos); camera.position.copy(camPos).add(new THREE.Vector3(Math.sin(P.yaw) * 0.12, 0.05, Math.cos(P.yaw) * 0.12)); camera.lookAt(camPos.x - Math.sin(camYaw) * 5, camPos.y - Math.tan(camPitch) * 5, camPos.z - Math.cos(camYaw) * 5); H.model.visible = false; return; }
  H.model.visible = true;
  const cp = Math.cos(camPitch); let d = dist;
  for (let k = 1; k <= 20; k++) { const t = dist * k / 20; if (camOccluded(headV.x + Math.sin(camYaw) * cp * t, headV.y + Math.sin(camPitch) * t, headV.z + Math.cos(camYaw) * cp * t)) { d = Math.max(0.9, t - dist / 20 - 0.3); break; } }
  camPos.set(headV.x + Math.sin(camYaw) * cp * d, Math.max(0.35, headV.y + Math.sin(camPitch) * d), headV.z + Math.cos(camYaw) * cp * d);
  if (camera.userData.init) camera.position.lerp(camPos, 1 - Math.exp(-dt * 10)); else { camera.position.copy(camPos); camera.userData.init = true; }
  camLook.lerp(headV, camera.userData.lookInit ? 1 - Math.exp(-dt * 14) : 1); camera.userData.lookInit = true;
  camera.lookAt(camLook);
}

/* ------------------------------------------------------------ UI: info cards, minimap, perf */
const cards = new InfoCards(LM.landmarks, { getMode: () => P.mode, getSpeed: () => (P.mode === 'eagle' ? eagle.v : P.mode === 'car' ? car.v : P.mode === 'bike' ? bike.v : P.speed) });
const mini = $('#mini'), mctx = mini.getContext('2d');
function drawMini() {
  const W = mini.width, span = 380 * MAP.k;
  mctx.drawImage(MAP.cv, MAP.X(P.x) - span / 2, MAP.Z(P.z) - span / 2, span, span, 0, 0, W, W);
  for (const l of LM.landmarks) { const sx = (MAP.X(l.local_xz_m[0]) - MAP.X(P.x)) / span * W + W / 2, sy = (MAP.Z(l.local_xz_m[1]) - MAP.Z(P.z)) / span * W + W / 2; if (sx < 0 || sy < 0 || sx > W || sy > W) continue; mctx.fillStyle = '#a8432a'; mctx.beginPath(); mctx.arc(sx, sy, 5, 0, 7); mctx.fill(); }
  // your bicycle (green), car (blue) and the eagle (black) so they're easy to find
  const mark = (x, z, col, label) => { const sx = (MAP.X(x) - MAP.X(P.x)) / span * W + W / 2, sy = (MAP.Z(z) - MAP.Z(P.z)) / span * W + W / 2; const cx = Math.max(12, Math.min(W - 12, sx)), cy = Math.max(12, Math.min(W - 12, sy));
    mctx.fillStyle = col; mctx.strokeStyle = '#fff'; mctx.lineWidth = 3; mctx.beginPath(); mctx.arc(cx, cy, 11, 0, 7); mctx.fill(); mctx.stroke(); mctx.fillStyle = '#fff'; mctx.font = 'bold 13px sans-serif'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle'; mctx.fillText(label, cx, cy + 1); };
  if (P.mode !== 'bike') mark(bike.x, bike.z, '#2f7a4b', '單');
  if (P.mode !== 'car') mark(car.x, car.z, '#2b4a8b', '車');
  if (eagle.state === 'perched' || eagle.state === 'arrive') mark(eagle.x, eagle.z, '#111', '鷹');
  const vy = P.mode === 'eagle' ? eagle.yaw : P.mode === 'car' ? car.yaw : P.mode === 'bike' ? bike.yaw : P.yaw;
  mctx.save(); mctx.translate(W / 2, W / 2); mctx.rotate(-vy + Math.PI); mctx.fillStyle = '#1d1a17'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 3;
  mctx.beginPath(); mctx.moveTo(0, -14); mctx.lineTo(10, 11); mctx.lineTo(0, 5); mctx.lineTo(-10, 11); mctx.closePath(); mctx.fill(); mctx.stroke(); mctx.restore();
}
const perf = { frames: 0, acc: 0, worst: 0, last: performance.now() };

/* ------------------------------------------------------------ loop */
const clock = new THREE.Clock(); let simT = 0, frameN = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05); simT += dt;
  if (started) {
    if (P.mode === 'walk') walkStep(dt);
    else if (P.mode === 'bike') { bikeStep(dt); poseOnBike(dt); }
    else if (P.mode === 'car') { carStep(dt); poseInCar(dt); }
    else if (P.mode === 'eagle') { flyStep(dt); poseOnEagle(dt); }
    else if (P.mode === 'eagleMount') eagleMountStep(dt);
    else transitionStep(dt);
    eagleStep(dt);
  } else { H.root.position.set(P.x, 0, P.z); H.root.rotation.set(0, P.yaw, 0); updateLocomotion(H, 0, dt); }
  if (window.__freeCam) { const f = window.__freeCam; camera.position.set(...f.pos); camera.lookAt(...f.look); if (f.fov && camera.fov !== f.fov) { camera.fov = f.fov; camera.updateProjectionMatrix(); } }
  else if (refMode) { camera.position.copy(hero.refCam.pos); camera.lookAt(hero.refCam.look); }
  else updateCamera(dt);
  const fx = P.mode === 'eagle' ? eagle.x : P.mode === 'car' ? car.x : P.mode === 'bike' ? bike.x : P.x, fz = P.mode === 'eagle' ? eagle.z : P.mode === 'car' ? car.z : P.mode === 'bike' ? bike.z : P.z;
  { const sb = P.mode === 'eagle' ? Q.shadowBox * 3 : Q.shadowBox, sc = sun.shadow.camera; if (sc.right !== sb) { sc.left = -sb; sc.right = sb; sc.top = sb; sc.bottom = -sb; sc.updateProjectionMatrix(); } }
  windowLOD.update(refMode ? hero.statueWorld.x : fx, refMode ? hero.statueWorld.z : fz);
  P.vx = fx; P.vz = fz; if (!refMode) traffic.update(dt, P, frameN, [[car.x, car.z], [bike.x, bike.z]]);
  sun.position.set(camera.position.x + sunDir.x * 300, sunDir.y * 300, camera.position.z + sunDir.z * 300); sun.target.position.set(camera.position.x, 0, camera.position.z);
  sky.position.copy(camera.position); clouds.position.copy(camera.position); cloudU.uTime.value = simT;
  if (window.__water?.material.uniforms?.time) window.__water.material.uniforms.time.value = simT * 0.5;
  windU.uTime.value = simT; if (M.water.normalMap) M.water.normalMap.offset.set(simT * 0.01, simT * 0.013);
  // prompts
  if (P.mode === 'walk') {
    const door = new THREE.Vector3().copy(car.driverDoor).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.yaw).add(new THREE.Vector3(car.x, 0, car.z));
    const nb = Math.hypot(P.x - bike.x, P.z - bike.z) < REACH, nc = Math.hypot(P.x - door.x, P.z - door.z) < REACH, ne = eagle.state === 'perched' && Math.hypot(P.x - eagle.x, P.z - eagle.z) < 9;
    const key = TOUCH ? '👆 點這裡　' : 'E　';
    prompt.textContent = ne ? key + '騎上黑鷹' : nb ? key + '騎上腳踏車' : nc ? key + '坐進駕駛座' : '';
    prompt.dataset.act = ''; prompt.hidden = !(nb || nc || ne);
    prompt.classList.toggle('tap', TOUCH && !prompt.hidden);
  } else if (P.mode === 'eagle') { prompt.classList.toggle('tap', TOUCH); prompt.textContent = eagle.state === 'land' ? '降落中…' : TOUCH ? `高度 ${Math.round(eagle.y)} m · 搖桿上下＝爬升／下降　👆 點這裡降落` : `高度 ${Math.round(eagle.y)} m · ${Math.round(eagle.v * 3.6)} km/h　·　W/S 爬升／下降　A/D 轉彎　Shift 加速　空白 減速　E 降落`; prompt.hidden = false;
  } else if (P.mode === 'bike') { prompt.classList.toggle('tap', TOUCH); prompt.textContent = TOUCH ? `${(Math.abs(bike.v) * 3.6).toFixed(0)} km/h　·　搖桿往上踩踏、往下煞車　👆 點這裡下車` : `${(Math.abs(bike.v) * 3.6).toFixed(0)} km/h　·　W 踩踏　S 煞車　A/D 轉向　E 下車`; prompt.hidden = false; }
  else if (P.mode === 'car') { prompt.classList.toggle('tap', TOUCH); prompt.textContent = TOUCH ? `${(Math.abs(car.v) * 3.6).toFixed(0)} km/h　·　👆 點這裡下車` : `${(Math.abs(car.v) * 3.6).toFixed(0)} km/h ${car.v < -0.1 ? 'R' : 'D'}　·　W 油門　S 煞車／倒車　A/D 轉向　E 下車`; prompt.hidden = false; }
  else prompt.hidden = true;
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('#toast').classList.remove('on'); }
  if ((frameN++ & 3) === 0 && !refMode) { drawMini(); cards.update(fx, fz); }
  if ((frameN & 63) === 0) queueAround(fx, fz);
  composer ? composer.render() : renderer.render(scene, camera);
  // perf
  const now = performance.now(), ft = now - perf.last; perf.last = now; perf.frames++; perf.acc += ft; perf.worst = Math.max(perf.worst, ft);
  if (perf.acc > 1000) {
    const i = renderer.info; window.__perf = { fps: perf.frames * 1000 / perf.acc, avgMs: perf.acc / perf.frames, worstMs: perf.worst, calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, texs: i.memory.textures, heapMB: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null, windows: windowLOD.count };
    $('#perf').textContent = `${qName} · ${window.__perf.fps.toFixed(1)} fps · ${window.__perf.avgMs.toFixed(1)} ms（最差 ${perf.worst.toFixed(0)}）· ${i.render.calls} draw · ${(i.render.triangles / 1e6).toFixed(2)} M tris · 窗 ${windowLOD.count}`;
    perf.frames = 0; perf.acc = 0; perf.worst = 0;
  }
}
if (refMode) { camera.fov = hero.refCam.fov; camera.updateProjectionMatrix(); document.body.classList.add('refmode'); H.root.visible = false; bike.g.visible = false; car.g.visible = false; }
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer?.setSize(innerWidth, innerHeight); aoPass?.setSize?.(innerWidth, innerHeight); });

status(`周邊 ${city.footprints.length} 棟建築已就緒，其餘街區會邊走邊載入`);
requestAnimationFrame(frame);
const go = $('#go'); go.disabled = false; go.focus();
go.addEventListener('click', () => { queueAround(P.x, P.z); started = true; $('#intro').classList.add('off'); canvas.focus(); });
window.__lub = {
  eagle, callEagle,
  loadAround: async (x, z, r = 300) => { for (const k of tilesAround(x, z, r)) await loadTile(k); },
  start: () => { started = true; $('#intro').classList.add('off'); }, P, bike, car, hero, keys, interact, traffic,
  teleport: (x, z, yaw) => { P.x = x; P.z = z; if (yaw !== undefined) { P.yaw = yaw; camYaw = yaw + Math.PI; } camera.userData.init = false; },
  setCam: (y, p, d) => { camYaw = y; camPitch = p; camDist = d; camera.userData.init = false; },
  setTime: (i) => { timeIdx = i; applyTime(i); }, landmarks: LMby,
  // deterministic test hook: advance the simulation by `sec` seconds at 60 Hz without rendering
  simulate: (sec, held = []) => { for (const k of held) keys.add(k); for (let t = 0; t < sec; t += 1 / 60) { const dt = 1 / 60; if (P.mode === 'walk') walkStep(dt); else if (P.mode === 'bike') { bikeStep(dt); poseOnBike(dt); } else if (P.mode === 'car') { carStep(dt); poseInCar(dt); } else if (P.mode === 'eagle') { flyStep(dt); poseOnEagle(dt); } else if (P.mode === 'eagleMount') eagleMountStep(dt); else transitionStep(dt); eagleStep(dt); } for (const k of held) keys.delete(k); },
};
