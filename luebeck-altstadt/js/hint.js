// A quiet way-marker: small brass plates set into the paving, each engraved with an arrow, lead from the
// Holstentor along the Obertrave, past the Malerwinkel and the Stadtgraben promenade to Kahlhorststraße 34
// in St. Jürgen. No labels, no beam — you only notice them if you look down. The minimap shows faint gold dots.
import * as THREE from 'three';

function plateTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 128, 128); gr.addColorStop(0, '#e8c56a'); gr.addColorStop(0.5, '#b8892f'); gr.addColorStop(1, '#d9b04f');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(70,45,10,0.7)'; g.lineWidth = 6; g.strokeRect(6, 6, 116, 116);
  g.fillStyle = 'rgba(70,45,10,0.8)'; g.beginPath(); g.moveTo(64, 22); g.lineTo(96, 62); g.lineTo(74, 62); g.lineTo(74, 104); g.lineTo(54, 104); g.lineTo(54, 62); g.lineTo(32, 62); g.closePath(); g.fill();   // arrow pointing ahead (+v)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function goalTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, '#f4d98a'); gr.addColorStop(1, '#a87a26'); g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
  g.fillStyle = 'rgba(70,45,10,0.85)'; g.font = '700 58px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('34', 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function buildHint(scene, hint, step = 12) {
  const p = hint.p, pts = []; for (let i = 0; i < p.length; i += 2) pts.push([p[i], p[i + 1]]);
  // resample the route every `step` metres
  const marks = []; let carry = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[i + 1], L = Math.hypot(x2 - x1, z2 - z1); if (L < 1e-3) continue;
    for (let d = step - carry; d < L; d += step) marks.push([x1 + (x2 - x1) * d / L, z1 + (z2 - z1) * d / L, Math.atan2(x2 - x1, z2 - z1)]);
    carry = (carry + L) % step;
  }
  const mat = new THREE.MeshStandardMaterial({ map: plateTexture(), metalness: 0.85, roughness: 0.28, emissive: 0x6a4a10, emissiveIntensity: 0.35, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const geo = new THREE.PlaneGeometry(0.46, 0.46); geo.rotateX(-Math.PI / 2);
  const inst = new THREE.InstancedMesh(geo, mat, marks.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  // plane's +v (texture "up") lies along -z after rotateX(-90°); rotate so it points along the walking direction
  marks.forEach(([x, z, yaw], i) => { q.setFromAxisAngle(up, yaw + Math.PI); m.compose(v.set(x, 0.09, z), q, one); inst.setMatrixAt(i, m); });
  inst.receiveShadow = true; scene.add(inst);
  const [gx, gz] = pts[pts.length - 1];
  const goal = new THREE.Mesh(new THREE.CircleGeometry(0.45, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: goalTexture(), metalness: 0.85, roughness: 0.25, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  goal.position.set(gx, 0.075, gz); scene.add(goal);
  return { marks, pts, goal: [gx, gz] };
}
