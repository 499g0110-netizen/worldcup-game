// Vehicle lights for dusk and night: glowing head- and tail-lamp sprites, a faint beam cone and a pool of light on
// the road in front (all additive, no real lights — cheap enough for every car, bus and bicycle in traffic).
// The player's own car and bicycle additionally get real spot lights so walls and kerbs light up as you drive.
import * as THREE from 'three';

function radial(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(0.25, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const T = { head: null, tail: null, pool: null };
function tex() { if (!T.head) { T.head = radial('rgba(255,250,235,1)', 'rgba(255,240,200,0)'); T.tail = radial('rgba(255,40,30,1)', 'rgba(255,20,10,0)'); T.pool = radial('rgba(255,236,190,0.9)', 'rgba(255,230,180,0)'); } return T; }
const all = [];   // every light rig, toggled together
let nightK = 0;

// spec: { front: [[x,y,z],...], rear: [[x,y,z],...], beam: length (m), width (m), spot: bool }
export function addVehicleLights(parent, spec) {
  const t = tex(), rig = new THREE.Group(); rig.visible = nightK > 0; parent.add(rig);
  const mk = (map, size, [x, y, z]) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.position.set(x, y, z); s.scale.setScalar(size); rig.add(s); return s; };
  for (const p of spec.front) mk(t.head, spec.small ? 0.5 : 0.9, p);
  for (const p of spec.rear) mk(t.tail, spec.small ? 0.3 : 0.5, p);
  const L = spec.beam ?? 14, W = spec.width ?? 4.5, fz = Math.max(...spec.front.map((p) => p[2]));
  // pool of light on the ground
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshBasicMaterial({ map: t.pool, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: spec.small ? 0.35 : 0.5, fog: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.06, fz + L * 0.45); rig.add(pool);
  // faint beam cone (visible in the air at night)
  const cone = new THREE.Mesh(new THREE.ConeGeometry(W * 0.32, L * 0.6, 16, 1, true).rotateX(-Math.PI / 2).translate(0, 0, L * 0.3), new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: spec.small ? 0.012 : 0.025, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  cone.position.set(0, spec.front[0][1], fz); rig.add(cone);
  if (spec.spot) {
    const sp = new THREE.SpotLight(0xfff1d6, 0, L * 2.2, 0.55, 0.6, 1.2); sp.position.set(0, spec.front[0][1], fz); sp.target.position.set(0, 0, fz + L); rig.add(sp, sp.target); rig.userData.spot = sp; rig.userData.spotI = spec.spotIntensity ?? 40;
  }
  const r = { rig, mats: spec.mats || [] }; all.push(r); applyOne(r); return rig;
}
function applyOne(r) {
  r.rig.visible = nightK > 0;
  for (const p of r.rig.children) if (p.material && p.material.opacity !== undefined && p.isSprite) p.material.opacity = nightK;
  if (r.rig.userData.spot) r.rig.userData.spot.intensity = nightK * r.rig.userData.spotI;
  for (const [m, day, night] of r.mats) m.emissiveIntensity = day + (night - day) * nightK;
}
// k: 0 = daylight, 0.6 = dusk, 1 = night
export function setVehicleNight(k) { nightK = k; for (const r of all) applyOne(r); }
export const CAR_LIGHTS = { front: [[-0.6, 0.82, 2.1], [0.6, 0.82, 2.1]], rear: [[-0.62, 0.9, -2.08], [0.62, 0.9, -2.08]], beam: 16, width: 5 };
export const BIKE_LIGHTS = { front: [[0, 0.82, 0.5]], rear: [[0, 0.72, -0.82]], beam: 7, width: 2.2, small: true };
export function busLights(L) { return { front: [[-0.85, 0.65, L / 2 + 0.05], [0.85, 0.65, L / 2 + 0.05]], rear: [[-0.85, 0.9, -L / 2 - 0.05], [0.85, 0.9, -L / 2 - 0.05]], beam: 18, width: 5.5 }; }
