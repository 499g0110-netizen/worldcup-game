// Giant black eagle (≈10 m wingspan) the player can call, ride and land. Modelled in code from layered feathers.
// Style reference: black plumage, red-orange hooked beak and talons, broad "fingered" wing tips.
import * as THREE from 'three';

function featherShape(len, wid, tip = 0.35) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.bezierCurveTo(wid * 0.55, len * 0.1, wid * 0.55, len * (1 - tip), 0, len);
  s.bezierCurveTo(-wid * 0.45, len * (1 - tip), -wid * 0.5, len * 0.1, 0, 0);
  const g = new THREE.ShapeGeometry(s, 6);
  // slight curve along the vane so lighting reads as feathers, not paper
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -Math.abs(x) * 0.35 + Math.sin(y / len * Math.PI) * 0.04); }
  g.computeVertexNormals(); return g;
}
function mergeInto(list) {   // [{geo, matrix}] → one geometry
  const pos = [], nor = [];
  for (const { geo, m } of list) { const g = geo.clone().applyMatrix4(m).toNonIndexed(); pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return out;
}
const M4 = (x, y, z, rx, ry, rz, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(s, s, s));

export function makeEagle(scene) {
  const black = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.78, envMapIntensity: 0.35, side: THREE.DoubleSide });
  const blackB = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.72, envMapIntensity: 0.4, side: THREE.DoubleSide });
  const black2 = new THREE.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.7, envMapIntensity: 0.5 });
  const beakM = new THREE.MeshStandardMaterial({ color: 0xd8432e, roughness: 0.35 });
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x1a0505, roughness: 0.1, emissive: 0x3a0a05, emissiveIntensity: 0.4 });
  const browM = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.6 });
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const body = new THREE.Group(); g.add(body);
  // torso & chest (body faces +z)
  const ell = (rx, ry, rz) => new THREE.SphereGeometry(1, 28, 18).scale(rx, ry, rz);
  const prof = [[0, -1.9], [0.32, -1.75], [0.62, -1.2], [0.88, -0.4], [0.98, 0.4], [0.95, 1.1], [0.78, 1.7], [0.55, 2.15], [0.5, 2.45], [0, 2.6]].map(([r, z]) => new THREE.Vector2(r, z));
  const bodyG = new THREE.LatheGeometry(prof, 32).rotateX(Math.PI / 2); bodyG.scale(1, 0.88, 1);   // lathe axis → z (forward)
  const torso = new THREE.Mesh(bodyG, black2); body.add(torso);
  // chest/back plumage: overlapping contour feathers
  const contour = [];
  for (let r = 0; r < 8; r++) for (let k = -3; k <= 3; k++) { const z = 1.6 - r * 0.42, rad = 0.86 * Math.sqrt(Math.max(0.1, 1 - (z / 2.2) ** 2)); contour.push({ geo: featherShape(0.8, 0.46), m: M4(k * 0.24, rad * Math.cos(k * 0.28) * 0.88 + 0.02, z, -Math.PI / 2 - 0.12, 0, k * 0.22) }); }
  body.add(new THREE.Mesh(mergeInto(contour), black));
  // neck & head
  const head = new THREE.Group(); head.position.set(0, 0.42, 2.45); body.add(head);
  const skull = new THREE.Mesh(ell(0.52, 0.46, 0.62), black2); skull.scale.y = 0.95; head.add(skull);
  const browRidge = new THREE.Mesh(ell(0.5, 0.14, 0.32), black2); browRidge.position.set(0, 0.2, 0.32); head.add(browRidge);   // the frowning overhang
  // hooked beak: tapered upper mandible bending down into a hook, small lower mandible
  const bk = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.05, 0.38), new THREE.Vector3(0, 0.04, 0.8), new THREE.Vector3(0, -0.06, 1.12), new THREE.Vector3(0, -0.3, 1.22)]);
  const upper = new THREE.Mesh(new THREE.TubeGeometry(bk, 24, 0.2, 12), beakM); head.add(upper);
  { const p = upper.geometry.attributes.position, tmp = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { tmp.fromBufferAttribute(p, i); const k = Math.min(1, Math.max(0, (tmp.z - 0.38) / 0.84)); const sc = 1 - k * 0.82; tmp.x *= sc; tmp.y = (tmp.y - bk.getPoint(k).y) * sc * 1.3 + bk.getPoint(k).y; p.setXYZ(i, tmp.x, tmp.y, tmp.z); } upper.geometry.computeVertexNormals(); }
  const lower = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.6, 12).rotateX(Math.PI / 2), beakM); lower.position.set(0, -0.14, 0.72); lower.scale.set(1, 0.6, 1); head.add(lower);
  const cere = new THREE.Mesh(ell(0.22, 0.2, 0.16), beakM); cere.position.set(0, 0.06, 0.42); head.add(cere);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), eyeM); eye.position.set(s * 0.3, 0.08, 0.36); head.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.045, 0.05), browM); brow.position.set(s * 0.26, 0.2, 0.45); brow.rotation.set(0.1, s * 0.35, s * -0.38); head.add(brow);   // stern white brow line
  }
  // tail fan
  const tail = []; for (let k = -4; k <= 4; k++) tail.push({ geo: featherShape(2.3, 0.55), m: M4(0, 0.1, -1.5, -Math.PI / 2 + 0.08, 0, k * 0.12) });
  const tailM = new THREE.Mesh(mergeInto(tail), black); body.add(tailM);
  // legs with red talons (tucked in flight, lowered for landing)
  const legs = new THREE.Group(); legs.position.set(0, -0.7, 0.4); body.add(legs);
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * 0.45, 0, 0); legs.add(leg);
    leg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 10).translate(0, -0.35, 0), black2));
    leg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.6, 8).translate(0, -0.95, 0), beakM));
    for (let t = 0; t < 4; t++) { const claw = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.38, 8).translate(0, 0.19, 0), beakM); claw.position.set((t - 1.5) * 0.08, -1.25, t === 3 ? -0.05 : 0.05); claw.rotation.x = t === 3 ? -2.3 : 2.3 - t * 0.1; leg.add(claw); }
  }
  // wings: shoulder → inner (coverts + secondaries) → outer (primaries, splayed fingers)
  const wings = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(s * 0.7, 0.35, 0.6); body.add(shoulder);
    const inner = new THREE.Group(); shoulder.add(inner);
    const fe = [], fe2 = [];
    for (let i = 0; i < 12; i++) { const x = s * (0.15 + i * 0.2); fe.push({ geo: featherShape(2.5 - i * 0.04, 0.46), m: M4(x, -0.02, 0.35, -Math.PI / 2, 0, s * -0.06) }); }          // secondaries
    for (let i = 0; i < 13; i++) { const x = s * (0.12 + i * 0.19); fe2.push({ geo: featherShape(1.15, 0.42), m: M4(x, 0.05, 0.6, -Math.PI / 2 + 0.05, 0, s * -0.04) }); }      // greater coverts
    for (let i = 0; i < 14; i++) { const x = s * (0.1 + i * 0.18); fe.push({ geo: featherShape(0.65, 0.38), m: M4(x, 0.1, 0.72, -Math.PI / 2 + 0.08, 0, 0) }); }                  // lesser coverts
    inner.add(new THREE.Mesh(mergeInto(fe), black), new THREE.Mesh(mergeInto(fe2), blackB));
    const outer = new THREE.Group(); outer.position.set(s * 2.45, 0, 0.0); inner.add(outer);
    const pf = [], pf2 = [];
    for (let i = 0; i < 9; i++) pf.push({ geo: featherShape(3.0 - Math.abs(i - 5) * 0.15, 0.42, 0.22), m: M4(s * (0.1 + 0.17 * i), -0.02, 0.6 - i * 0.02, -Math.PI / 2, 0, s * (0.05 + i * 0.13)) });   // primaries, fanned into "fingers"
    for (let i = 0; i < 8; i++) pf2.push({ geo: featherShape(1.0, 0.4), m: M4(s * (0.1 + i * 0.17), 0.06, 0.66, -Math.PI / 2 + 0.06, 0, s * 0.05 * i) });
    outer.add(new THREE.Mesh(mergeInto(pf), black), new THREE.Mesh(mergeInto(pf2), blackB));
    wings.push({ s, shoulder, inner, outer });
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.scale.setScalar(1.0); g.visible = false; scene.add(g);
  let ph = 0;
  return {
    g, body, head, legs, tail: tailM, wings,
    x: 0, y: 0, z: 0, yaw: 0, pitch: 0, bank: 0, v: 0, vy: 0, state: 'hidden', t: 0,
    seat: new THREE.Vector3(0, 0.95, 0.55),   // rider position on the back (local)
    /** amp 0 = glide, 1 = full flap; legsOut 0..1; dt seconds */
    animate(dt, amp, legsOut, rate = 1) {
      ph += dt * (2.2 + amp * 1.6) * rate;
      // folded when standing still on the ground: wings swept back along the body and drooped
      const fold = legsOut > 0.9 && amp < 0.1 ? 1 : 0; this.fold = (this.fold ?? 0) + (fold - (this.fold ?? 0)) * Math.min(1, dt * 3);
      const F = this.fold;
      for (const w of wings) {
        const f = Math.sin(ph) * (0.15 + amp * 0.6) * (1 - F), f2 = Math.sin(ph - 0.7) * (0.1 + amp * 0.5) * (1 - F);
        w.inner.rotation.z = w.s * (f + 0.05 - F * 0.12); w.outer.rotation.z = w.s * (f2 + 0.08 * amp + F * 0.05);
        w.inner.rotation.y = w.s * (-0.08 * Math.cos(ph) * amp + F * 1.35);   // sweep back along the flanks
        w.outer.rotation.y = w.s * F * 2.2;
      }
      body.position.y = -Math.sin(ph) * 0.12 * amp;
      this.tail.rotation.x = Math.sin(ph * 0.5) * 0.04;
      legs.rotation.x = THREE.MathUtils.lerp(1.2, 0, legsOut); legs.position.y = -0.7 + legsOut * 0.1;
      head.rotation.y = Math.sin(ph * 0.17) * 0.12;
    },
    place() { g.position.set(this.x, this.y + 1.95, this.z); g.rotation.set(this.pitch, this.yaw, this.bank); },   // +1.95: standing height on its legs
  };
}
