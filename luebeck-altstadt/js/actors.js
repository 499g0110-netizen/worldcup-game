// Player character (skinned human), city bicycle and car — with mount/dismount, IK seating and simple vehicle dynamics.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();

/* ------------------------------------------------------------------ IK utils */
function aim(bone, child, target) {
  // rotate `bone` (in world space) so that `child`'s world position points at `target`
  const p = bone.getWorldPosition(_v1), c = child.getWorldPosition(_v2);
  const a = c.sub(p).normalize(), b = _v3.copy(target).sub(p).normalize();
  if (a.lengthSq() < 1e-8 || b.lengthSq() < 1e-8) return;
  _q1.setFromUnitVectors(a, b);
  bone.getWorldQuaternion(_q2); _q2.premultiply(_q1);
  const pq = new THREE.Quaternion(); bone.parent.getWorldQuaternion(pq);
  bone.quaternion.copy(pq.invert().multiply(_q2));
  bone.updateMatrixWorld(true);
}
export function twoBoneIK(upper, lower, end, target, pole) {
  const a = upper.getWorldPosition(new THREE.Vector3()), b = lower.getWorldPosition(new THREE.Vector3()), c = end.getWorldPosition(new THREE.Vector3());
  const L1 = a.distanceTo(b), L2 = b.distanceTo(c), t = target.clone();
  const dir = t.clone().sub(a); let d = dir.length(); d = THREE.MathUtils.clamp(d, Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3); dir.normalize();
  const cosA = THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  const pd = pole.clone().sub(a); pd.sub(dir.clone().multiplyScalar(pd.dot(dir))).normalize();
  const knee = a.clone().addScaledVector(dir, L1 * cosA).addScaledVector(pd, L1 * sinA);
  aim(upper, lower, knee);
  aim(lower, end, a.clone().addScaledVector(dir, d));
}

/* ------------------------------------------------------------------ human */
export async function loadHuman(scene) {
  const gl = new GLTFLoader();
  const [body, anim] = await Promise.all([gl.loadAsync('assets/models/Michelle.glb'), gl.loadAsync('assets/models/Soldier.glb')]);
  const model = body.scene;
  model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (o.material) { o.material.roughness = 0.75; o.material.metalness = 0; } } });
  // normalise height to 1.68 m
  const box = new THREE.Box3().setFromObject(model), h = box.max.y - box.min.y;
  model.scale.multiplyScalar(1.68 / h);
  const root = new THREE.Group(); root.add(model); scene.add(root);
  const bones = {}; model.traverse((o) => { if (o.isBone) bones[o.name.replace('mixamorig', '')] = o; });
  // retarget Soldier clips by bone name; drop translation tracks (different rig scale) — in-place locomotion
  // Both rigs are Mixamo-standard (same bone names, same bind orientation): local quaternion tracks transfer directly.
  // Translation tracks are dropped (rig scales differ) — locomotion is in place, root motion comes from the controller.
  const clips = {};
  for (const c of anim.animations) { const cl = c.clone(); cl.tracks = cl.tracks.filter((t) => t.name.endsWith('.quaternion') && !/Hips\./.test(t.name)); /* hips orientation differs between the two armatures: keep Michelle's */ clips[c.name] = cl; }
  const mixer = new THREE.AnimationMixer(model);
  const A = { idle: mixer.clipAction(clips.Idle), walk: mixer.clipAction(clips.Walk), run: mixer.clipAction(clips.Run) };
  for (const a of Object.values(A)) { a.play(); a.setEffectiveWeight(0); }
  A.idle.setEffectiveWeight(1);
  anim.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  return { root, model, bones, mixer, A, w: { idle: 1, walk: 0, run: 0 } };
}
// locomotion blend: weights follow ground speed; clip playback rate matches stride (no foot sliding at the reference speeds)
export function updateLocomotion(H, speed, dt) {
  const walkW = speed < 0.1 ? 0 : speed < 2.6 ? 1 : Math.max(0, 1 - (speed - 2.6) / 1.4);
  const runW = speed < 2.6 ? 0 : Math.min(1, (speed - 2.6) / 1.4);
  const idleW = Math.max(0, 1 - speed / 0.6);
  const target = { idle: idleW, walk: walkW * (1 - idleW), run: runW };
  const sum = target.idle + target.walk + target.run || 1;
  for (const k of ['idle', 'walk', 'run']) { H.w[k] += (target[k] / sum - H.w[k]) * (1 - Math.exp(-dt * 10)); H.A[k].setEffectiveWeight(H.w[k]); }
  H.A.walk.timeScale = THREE.MathUtils.clamp(speed / 1.45, 0.5, 1.6);   // Soldier "Walk" covers ≈1.45 m/s
  H.A.run.timeScale = THREE.MathUtils.clamp(speed / 5.4, 0.6, 1.3);     // "Run" ≈5.4 m/s
  H.mixer.update(dt);
}

/* ------------------------------------------------------------------ bicycle */
const paint = (c, r = 0.35) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, metalness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 });
const chrome = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.18, metalness: 1 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.85 });
const blackM = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.5 });
function tube(a, b, r, mat) {
  const v = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, v.length(), 12), mat);
  m.position.copy(a).addScaledVector(v, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); m.castShadow = true; return m;
}
function wheel(R) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(R - 0.022, 0.022, 10, 48), rubber); tyre.rotation.y = Math.PI / 2; g.add(tyre);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.05, 0.011, 6, 48), chrome); rim.rotation.y = Math.PI / 2; g.add(rim);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 12), chrome); hub.rotation.z = Math.PI / 2; g.add(hub);
  const sp = []; for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, side = i % 2 ? 0.035 : -0.035; sp.push(side, 0, 0, 0, Math.cos(a) * (R - 0.055), Math.sin(a) * (R - 0.055)); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); g.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0xbfbfbf })));
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export function makeBike(scene) {
  const R = 0.35, frameM = paint(0x24453a), g = new THREE.Group(), lean = new THREE.Group(); g.add(lean);
  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  const rearAxle = P(0, R, -0.56), frontAxle = P(0, R, 0.56), bb = P(0, 0.29, -0.06), seatTop = P(0, 0.82, -0.26), head0 = P(0, 0.86, 0.38), head1 = P(0, 0.66, 0.43);
  // step-through frame (Dutch city bike)
  lean.add(tube(bb, seatTop, 0.017, frameM));
  const dt = new THREE.CatmullRomCurve3([head1, P(0, 0.48, 0.24), P(0, 0.33, 0.06), bb]);
  const down = new THREE.Mesh(new THREE.TubeGeometry(dt, 20, 0.02, 10), frameM); down.castShadow = true; lean.add(down);
  lean.add(tube(bb, rearAxle, 0.011, frameM), tube(P(0.0, 0.72, -0.24), rearAxle, 0.01, frameM), tube(head0, head1, 0.022, frameM));
  // rear rack + fenders + chain guard
  lean.add(tube(P(0.08, 0.72, -0.3), P(0.08, 0.72, -0.8), 0.007, blackM), tube(P(-0.08, 0.72, -0.3), P(-0.08, 0.72, -0.8), 0.007, blackM), tube(P(0.08, 0.72, -0.8), rearAxle.clone().setX(0.06), 0.006, blackM), tube(P(-0.08, 0.72, -0.8), rearAxle.clone().setX(-0.06), 0.006, blackM));
  const fender = (c) => { const m = new THREE.Mesh(new THREE.TorusGeometry(R + 0.02, 0.028, 4, 30, Math.PI * 0.9), frameM); m.scale.set(1, 1, 0.6); m.rotation.y = Math.PI / 2; m.position.copy(c); m.castShadow = true; return m; };
  const rf = fender(rearAxle); rf.rotation.x = 0.35; lean.add(rf);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.55), frameM); guard.position.set(0.07, 0.33, -0.33); guard.rotation.x = 0.08; lean.add(guard);
  // saddle (sprung leather)
  const saddle = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 12), new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.55 })); saddle.scale.set(1, 0.32, 1.25); saddle.position.set(0, 0.87, -0.27); saddle.castShadow = true; lean.add(saddle);
  // rear wheel
  const wRear = wheel(R); wRear.position.copy(rearAxle); lean.add(wRear);
  // steering assembly: rotates about the (tilted) head-tube axis
  const steer = new THREE.Group(); steer.position.copy(head1); lean.add(steer);
  const axis = new THREE.Vector3().subVectors(head0, head1).normalize(); steer.userData.axis = axis;
  const fa = frontAxle.clone().sub(head1);
  steer.add(tube(P(0.045, 0, 0), fa.clone().setX(0.045), 0.012, frameM), tube(P(-0.045, 0, 0), fa.clone().setX(-0.045), 0.012, frameM));
  const wFront = wheel(R); wFront.position.copy(fa); steer.add(wFront);
  const ff = fender(fa); ff.rotation.x = -0.45; steer.add(ff);
  const stemTop = head0.clone().sub(head1).add(P(0, 0.1, -0.02)); steer.add(tube(head0.clone().sub(head1), stemTop, 0.014, chrome));
  const barC = new THREE.CatmullRomCurve3([P(-0.3, 0.06, -0.2), P(-0.2, 0.03, -0.05), P(0, 0, 0.02), P(0.2, 0.03, -0.05), P(0.3, 0.06, -0.2)].map((p) => p.add(stemTop)));
  const bar = new THREE.Mesh(new THREE.TubeGeometry(barC, 24, 0.012, 8), chrome); bar.castShadow = true; steer.add(bar);
  for (const s of [-1, 1]) { const grip = tube(P(s * 0.25, 0.05, -0.16).add(stemTop), P(s * 0.31, 0.065, -0.21).add(stemTop), 0.017, new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.6 })); steer.add(grip); }
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.07, 14), chrome); lamp.rotation.x = Math.PI / 2; lamp.position.copy(P(0, -0.05, 0.08)); steer.add(lamp);
  // drivetrain
  const crank = new THREE.Group(); crank.position.copy(bb); lean.add(crank);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.006, 32), chrome); ring.rotation.z = Math.PI / 2; ring.position.x = 0.06; crank.add(ring);
  const pedals = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.17), chrome); arm.position.set(s * 0.085, 0, s * 0.085); crank.add(arm);
    const pedal = new THREE.Group(); pedal.position.set(s * 0.125, 0, s * 0.17); crank.add(pedal);
    const pb = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.022, 0.06), blackM); pb.castShadow = true; pedal.add(pb); pedals.push(pedal);
  }
  const chainG = new THREE.BufferGeometry().setFromPoints([P(0.06, 0.39, -0.06), P(0.06, 0.4, -0.56), P(0.06, 0.3, -0.56), P(0.06, 0.19, -0.06)]);
  lean.add(new THREE.LineLoop(chainG, new THREE.LineBasicMaterial({ color: 0x444444 })));
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(g);
  return {
    g, lean, steer, wFront, wRear, crank, pedals, R, wheelbase: 1.12, x: 0, z: 0, yaw: 0, v: 0, steerA: 0, leanA: 0, crankA: 0,
    seat: P(0, 0.9, -0.3), grips: [P(-0.29, 0.06, -0.19).add(stemTop), P(0.29, 0.06, -0.19).add(stemTop)], stemTop,
  };
}

/* ------------------------------------------------------------------ car */
export function makeCar(scene, envMap) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const L = 4.05, W = 1.76;
  // side profile (z forward, y up), extruded across the width with bevels for rounded edges
  const s = new THREE.Shape();
  const pts = [[-2.0, 0.32], [-2.03, 0.62], [-1.98, 0.96], [-1.7, 1.42], [-0.55, 1.47], [0.35, 1.42], [1.05, 0.98], [1.9, 0.86], [2.02, 0.62], [2.0, 0.32]];
  s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  // wheel arches
  for (const cz of [1.27, -1.3]) { s.lineTo(cz + 0.42, 0.32); s.absarc(cz, 0.32, 0.4, 0, Math.PI, false); }
  s.lineTo(pts[0][0], pts[0][1]);
  const bodyG = new THREE.ExtrudeGeometry(s, { depth: W - 0.16, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 5, curveSegments: 18 });
  bodyG.translate(0, 0, -(W - 0.16) / 2); bodyG.rotateY(-Math.PI / 2); // profile x → car z
  const paintM = new THREE.MeshPhysicalMaterial({ color: 0x2a3f5c, metalness: 0.6, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06 });
  const shell = new THREE.Mesh(bodyG, paintM); shell.castShadow = shell.receiveShadow = true; body.add(shell);
  // glasshouse (slightly inset, glossy dark)
  const gs = new THREE.Shape(); [[-1.66, 1.0], [-1.62, 1.36], [-0.55, 1.42], [0.3, 1.37], [0.95, 1.0]].forEach(([a, b], i) => (i ? gs.lineTo(a, b) : gs.moveTo(a, b))); gs.lineTo(-1.66, 1.0);
  const glassG = new THREE.ExtrudeGeometry(gs, { depth: W - 0.08, bevelEnabled: false }); glassG.translate(0, 0, -(W - 0.08) / 2); glassG.rotateY(-Math.PI / 2);
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x0d1418, metalness: 0.2, roughness: 0.03, transparent: true, opacity: 0.55, envMapIntensity: 1.6 });
  const glass = new THREE.Mesh(glassG, glassM); body.add(glass);
  // pillars painted
  for (const z of [-1.0, 0.1]) for (const x of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.1), paintM); p.position.set(x * (W / 2 - 0.02), 1.2, z); body.add(p); }
  // interior: seats + dashboard + steering wheel (driver on the LEFT in Germany; car faces +z so left = +x)
  const seatM = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.9 });
  for (const x of [0.38, -0.38]) { const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), seatM); cushion.position.set(x, 0.55, -0.3); body.add(cushion); const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.12), seatM); back.position.set(x, 0.88, -0.6); back.rotation.x = -0.18; body.add(back); }
  const dash = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.25, 0.45), seatM); dash.position.set(0, 0.88, 0.65); body.add(dash);
  const wheelG = new THREE.Group(); wheelG.position.set(0.38, 0.98, 0.33); wheelG.rotation.x = -1.1; body.add(wheelG);
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 10, 32), blackM); wheelG.add(sw);
  wheelG.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16).rotateX(Math.PI / 2), blackM));
  // lights
  const headM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 0.3, roughness: 0.1 });
  const tailM = new THREE.MeshStandardMaterial({ color: 0x5a0000, emissive: 0xff1a0a, emissiveIntensity: 0.5 });
  for (const x of [-0.6, 0.6]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.05), headM); h.position.set(x, 0.82, 2.06); body.add(h); const t = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), tailM); t.position.set(x, 0.92, -2.08); body.add(t); }
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.11), new THREE.MeshStandardMaterial({ color: 0xf4f4f0 })); plate.position.set(0, 0.5, 2.1); body.add(plate);
  // wheels with alloy rims
  const wheels = [];
  for (const [x, z, front] of [[0.76, 1.27, 1], [-0.76, 1.27, 1], [0.76, -1.3, 0], [-0.76, -1.3, 0]]) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.31, z); g.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.2, 28).rotateZ(Math.PI / 2), rubber); spin.add(tyre);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.205, 20).rotateZ(Math.PI / 2), chrome); spin.add(rim);
    for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.36, 0.05), chrome); sp.rotation.x = k / 5 * Math.PI; sp.position.x = Math.sign(x) * 0.105; spin.add(sp); }
    pivot.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    wheels.push({ pivot, spin, front });
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(g);
  return { g, body, wheels, steeringWheel: wheelG, headM, x: 0, z: 0, yaw: 0, v: 0, steerA: 0, pitch: 0, roll: 0, L, W, wheelbase: 2.57,
    seat: new THREE.Vector3(0.38, 0.62, -0.32), driverDoor: new THREE.Vector3(1.4, 0, -0.1) };
}
