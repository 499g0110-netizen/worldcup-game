import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildWorld, fillCity, groundY, urban, DATA, ROOFS } from './world.js';
import { BatchSet, makeFacadeMaterial, facadeUniforms } from './facade.js';
import { Atmosphere } from './sky.js';
import { reserve, buildLandmarks } from './landmarks.js';
import { buildFloatingMarket, buildPark, buildAirport } from './places.js';
import { buildExtras } from './extras.js';
import { buildLandmarks2 } from './landmarks2.js';
import { buildShopfronts, buildParked } from './streetlife.js';
import { buildTrees, treeLayout, buildStreetFurniture, GlowSet, glowUniforms } from './props.js';
import { Traffic, Walkers } from './life.js';
import { createPost } from './post.js';
import { Director } from './director.js';
import { createUI } from './ui.js';
import { Player } from './player.js';
import { StoryPlayer, STORY_FOR, audioUnlock } from './story.js';
import { waterUniforms } from './world.js';
import { mulberry32, canvasTex } from './util.js';
import { ribGeo } from './world.js';

const params = new URLSearchParams(location.search);
const $ = (s) => document.querySelector(s);
const setProgress = (txt, f) => { $('#ld-bar').style.width = (f * 100) + '%'; $('#ld-txt').textContent = txt; };
const nextFrame = () => new Promise(r => setTimeout(r, 0));

async function main() {
  const canvas = $('#c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', logarithmicDepthBuffer: true, stencil: false });
  const lowPower = params.has('low') || /Mobi|Android/i.test(navigator.userAgent);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, params.has('pr') ? +params.get('pr') : (lowPower ? 1.25 : 2)));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 1.2, 70000);
  camera.position.set(-1100, 520, 1400);
  const ctx = { scene, renderer, camera, glowSets: [], update: [], batches: new BatchSet(450) };
  ctx.reserve = (occ) => reserve(ctx, occ);

  setProgress('天空與光線…', 0.02);
  const atmo = new Atmosphere(renderer, scene); ctx.atmo = atmo;
  if (params.has('tod')) atmo.set(+params.get('tod'), true);

  await buildWorld(ctx, setProgress);
  setProgress('地標：李花園、Centara、市場、車站…', 0.4); await nextFrame();
  buildLandmarks(ctx);
  setProgress('水上市場、公園、機場…', 0.5); await nextFrame();
  buildFloatingMarket(ctx); buildPark(ctx); buildAirport(ctx); buildExtras(ctx); buildLandmarks2(ctx);
  await fillCity(ctx, setProgress);
  buildShopfronts(ctx);

  setProgress('合併建築幾何…', 0.8); await nextFrame();
  const facade = makeFacadeMaterial();
  for (const m of ctx.batches.meshes(facade, (b) => Math.hypot(b.cx, b.cz) < 650)) scene.add(m);
  // rooftop water tanks (very Thai)
  {
    const g = new THREE.CylinderGeometry(1.0, 1.0, 1.7, 10); g.translate(0, 0.85, 0);
    const im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0xcfd6dc, roughness: 0.4, metalness: 0.3 }), ctx.tanks.length); const m4 = new THREE.Matrix4();
    ctx.tanks.forEach(([x, y, z, s], i) => { m4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); im.setMatrixAt(i, m4); }); im.frustumCulled = false; scene.add(im);
  }
  // water
  {
    const wm = new THREE.Mesh(ribGeo(ctx._waterO), ctx.waterMat); wm.receiveShadow = true; wm.frustumCulled = false; scene.add(wm);
    const bm = new THREE.Mesh(ribGeo(ctx._bank), new THREE.MeshStandardMaterial({ color: 0x2b3322, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1.5, polygonOffsetUnits: -1.5 })); bm.frustumCulled = false; scene.add(bm);
    for (const r of ctx._reservoirs) { const sh = new THREE.Shape(r.p.map(p => new THREE.Vector2(p[0], -p[1]))); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, ctx.waterMat); m.position.y = 0.05; scene.add(m); }
  }

  setProgress('樹木、路燈、車流…', 0.88); await nextFrame();
  const trees = treeLayout(ctx).concat(ctx.extraTrees || []);
  buildTrees(ctx, trees);
  buildStreetFurniture(ctx);
  const traffic = new Traffic(ctx, 460); buildParked(ctx, traffic); const walkers = new Walkers(ctx, null, 480);
  // far-field city lights (suburban glow seen from above)
  {
    const gs = new GlowSet('city', 40); const rnd = mulberry32(2024); const warm = new THREE.Color(1, 0.7, 0.36), white = new THREE.Color(0.85, 0.92, 1), amber = new THREE.Color(1, 0.55, 0.2);
    let n = 0, tries = 0;
    while (n < 60000 && tries < 400000) { tries++; const a = rnd() * 6.283, r = 700 + Math.pow(rnd(), 0.7) * 5200, x = Math.cos(a) * r + 400, z = Math.sin(a) * r - 300; const u = urban(x, z); if (rnd() > u * 1.1 || ctx.occ.get(x, z) === 0 && u < 0.2) continue; gs.add(x, 6 + rnd() * 14, z, 5 + rnd() * 5, rnd() < 0.6 ? warm : rnd() < 0.7 ? white : amber); n++; }
    gs.build(scene); ctx.glowSets.push(gs);
  }
  ctx.people.finalize(); ctx.blink.build(scene);

  setProgress('後製與導演…', 0.96); await nextFrame();
  const post = createPost(renderer, scene, camera);
  const director = new Director(ctx, camera, atmo); director.playing = false;
  const controls = new OrbitControls(camera, canvas); controls.enabled = false; controls.enableDamping = true; controls.dampingFactor = 0.06; controls.maxDistance = 14000; controls.minDistance = 5; controls.maxPolarAngle = Math.PI * 0.495;
  let explore = false, todMode = 'auto', todLerp = null;
  const lookNow = new THREE.Vector3();
  const sound = makeSound();
  const story = new StoryPlayer(document.getElementById('story'));
  const player = new Player(ctx, camera, canvas); let walking = false;
  const ui = createUI(ctx, director, atmo, camera, {
    explore: (on) => { explore = on; controls.enabled = on; if (on) { controls.target.copy(lookNow); controls.update(); } },
    tod: (k) => { todMode = k; },
    sound: (btn) => { audioUnlock(); const on = sound.toggle(); btn.classList.toggle('on', on); },
    started: () => { audioUnlock(); sound.ready(); },
    walk: (on, ch) => { walking = on; if (on) { controls.enabled = false; explore = false; const a = (ch && ch.anchor && !['intro', 'outro', 'lee'].includes(ch.id)) ? ch.anchor : [-40, 34]; player.enable(a[0], a[1]); } else player.disable(); },
    teleport: (c) => { player.spawnNear(c.anchor[0], c.anchor[1]); player._cam = null; },
    style: (i) => { post.style.uniforms.uMode.value = i; },
    story: (id) => { director.playing = false; story.open(STORY_FOR[id] || 'street'); },
  });
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); post.setSize(innerWidth, innerHeight); });

  // debugging / screenshot hooks
  window.__guide = { player, story, STORY_FOR, THREE, scene, camera, director, atmo, ctx, renderer, post, setCam: (p, l, fov = 50) => { director.playing = false; window.__manual = { p, l, fov }; } };
  if (params.has('ch')) { const i = +params.get('ch'); director.seekChapter(i); director.time = director.chapters[i].t0 + (params.has('u') ? +params.get('u') * director.chapters[i].dur : 0.01); director.playing = false; }
  if (params.has('t')) { director.setTime(+params.get('t')); director.playing = false; }
  if (params.has('ui') && params.get('ui') === '0') document.body.classList.add('ui-off');
  if (params.has('style')) post.style.uniforms.uMode.value = +params.get('style');
  if (params.has('story')) { story.open(params.get('story')); story.t = +(params.get('st') || 8); story.playing = false; story.style = params.get('sstyle') || 'paper'; }

  // ---------------- main loop ----------------
  const clock = new THREE.Clock(); let elapsed = 0, shake = new THREE.Vector3(); const v3 = new THREE.Vector3();
  const sunFocus = new THREE.Vector3(), dbs = new THREE.Vector2();
  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.1); elapsed += dt;
    const ev = director.update(dt);
    if (walking) { const lk = player.update(dt, elapsed, atmo.state.win); if (lk) lookNow.copy(lk); camera.fov += (55 - camera.fov) * Math.min(1, dt * 4); ui.walkHud(player.pos); }
    else if (window.__manual) { const m = window.__manual; camera.position.set(...m.p); lookNow.set(...m.l); camera.lookAt(lookNow); camera.fov = m.fov; }
    else if (!explore) {
      camera.position.copy(ev.pos); lookNow.copy(ev.look);
      // subtle handheld sway
      const sw = Math.min(1, 25 / Math.max(25, camera.position.y * 0.4)) * 0.5;
      camera.position.x += Math.sin(elapsed * 0.9) * 0.15 * sw; camera.position.y += Math.sin(elapsed * 1.3 + 1) * 0.1 * sw;
      camera.lookAt(lookNow); camera.rotateZ(Math.sin(elapsed * 0.45) * 0.0025);
      camera.fov += (ev.fov - camera.fov) * (director.playing ? Math.min(1, dt * 6) : 1);
    } else { controls.update(); camera.getWorldDirection(v3); lookNow.copy(camera.position).addScaledVector(v3, Math.max(60, camera.position.y)); }
    camera.updateProjectionMatrix();
    // time of day
    const target = todMode === 'auto' ? (walking ? 0.78 : ev.tod) : todMode === 'cycle' ? 0.5 - 0.5 * Math.cos(elapsed * Math.PI * 2 / 80) : ({ day: 0.0, dusk: 0.4, night: 1.0 })[todMode];
    if (!params.has('tod')) atmo.set(target, !!window.__manual);
    sunFocus.copy(lookNow).y = 0; atmo.followCamera(camera.position);
    atmo.update(dt, sunFocus);
    const S = atmo.state; facadeUniforms.uNight.value = S.win; waterUniforms.uTime.value = elapsed; waterUniforms.uLight.value = 1 - 0.75 * S.win; facadeUniforms.uTime.value = elapsed;
    glowUniforms.uScale.value = renderer.getDrawingBufferSize(dbs).y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    for (const g of ctx.glowSets) { if (!g.mat) continue; if (g.kind === 'lamp') g.mat.uniforms.uInt.value = 0.05 + 1.0 * S.lamp; else if (g.kind === 'traffic') g.mat.uniforms.uInt.value = 0.25 + 0.9 * S.win; else if (g.kind === 'city') g.mat.uniforms.uInt.value = S.win * 0.9; }
    if (ctx.lampPools) ctx.lampPools.opacity = S.lamp * 0.95;
    ctx.roadMats.major.roughness = 0.62 - 0.1 * S.win; // wetter look at night
    for (const f of ctx.update) f(dt, elapsed, S);
    traffic.update(dt, elapsed); walkers.update(dt, elapsed);
    post.bloom.strength = S.bloom * 0.8; post.bloom.radius = 0.7; post.bloom.threshold = 0.9;
    post.grade.uniforms.uTime.value = elapsed; post.grade.uniforms.uNight.value = S.win;
    ui.update(dt, ev);
    post.composer.render();
    window.__frames = (window.__frames || 0) + 1;
    requestAnimationFrame(frame);
  };
  setProgress('完成', 1);
  $('#loader').classList.add('done'); $('#start').disabled = false; $('#start').textContent = '開始導覽  ▶';
  window.__ready = true;
  if (params.has('walk')) { const ch = director.chapters[+params.get('walk')] ; setTimeout(() => { ui.setWalk(true); if (ch && ch.anchor) { player.spawnNear(ch.anchor[0], ch.anchor[1]); } player.keys.KeyW = params.has('move'); player.camYaw = +(params.get('yaw') || 3.14); player.heading = player.camYaw; }, 0); }
  if (params.has('autostart')) { $('#intro').classList.add('gone'); director.playing = !params.has('freeze'); }
  frame();
}

function makeSound() {
  let ac = null, on = false, master = null;
  const init = () => {
    if (ac) return; ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    const buf = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate), d = buf.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; l = (l + 0.02 * w) / 1.02; d[i] = l * 3.5; }
    const n = ac.createBufferSource(); n.buffer = buf; n.loop = true; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; n.connect(lp); lp.connect(master); n.start();
    for (const [f, g] of [[110, 0.05], [164.8, 0.035], [220.5, 0.02]]) { const o = ac.createOscillator(); o.frequency.value = f; const gg = ac.createGain(); gg.gain.value = g; o.connect(gg); gg.connect(master); o.start(); }
  };
  return { ready() {}, toggle() { init(); on = !on; if (ac.state === 'suspended') ac.resume(); master.gain.setTargetAtTime(on ? 0.55 : 0, ac.currentTime, 0.4); return on; } };
}

main().catch(e => { console.error(e); const t = document.getElementById('ld-txt'); if (t) t.textContent = '載入失敗：' + e.message; });
