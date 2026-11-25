// Water play on Breite Straße (photo 5): a flush granite pad with rows of ground jets that rise and fall in waves,
// a wet, mirror-like film of water on the stones and fine spray. Placed on the street centreline from OSM.
import * as THREE from 'three';

export function buildFountain(scene, { x, z, yaw }) {
  const G = new THREE.Group(); G.position.set(x, 0, z); G.rotation.y = yaw; scene.add(G);
  const COLS = 14, ROWS = 4, DX = 0.62, DZ = 0.7;
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(COLS * DX + 1.2, ROWS * DZ + 1.2), new THREE.MeshStandardMaterial({ color: 0x3e4448, roughness: 0.06, metalness: 0.35 }));
  pad.rotation.x = -Math.PI / 2; pad.position.y = 0.035; G.add(pad);
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(COLS * DX + 1.2, ROWS * DZ + 1.2, COLS, ROWS), new THREE.MeshBasicMaterial({ color: 0x9aa3a8, wireframe: true, transparent: true, opacity: 0.25 }));
  grid.rotation.x = -Math.PI / 2; grid.position.y = 0.04; G.add(grid);
  const jetGeo = new THREE.CylinderGeometry(0.035, 0.07, 1, 8, 1, true).translate(0, 0.5, 0);
  const jetMat = new THREE.MeshStandardMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.4, roughness: 0.1, emissive: 0x6688aa, emissiveIntensity: 0.1, depthWrite: false });
  const jets = new THREE.InstancedMesh(jetGeo, jetMat, COLS * ROWS);
  const capGeo = new THREE.SphereGeometry(0.06, 8, 6), caps = new THREE.InstancedMesh(capGeo, jetMat, COLS * ROWS);
  G.add(jets, caps);
  const pos = []; for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) pos.push([(i - (COLS - 1) / 2) * DX, (j - (ROWS - 1) / 2) * DZ]);
  const m = new THREE.Matrix4(), s = new THREE.Vector3(), p = new THREE.Vector3(), q = new THREE.Quaternion();
  let t = 0;
  return {
    update(dt, px, pz) {
      if (Math.hypot(px - x, pz - z) > 160) return;
      t += dt;
      const mode = Math.floor(t / 12) % 3;   // patterns: travelling wave, chessboard pulse, rising rows
      pos.forEach(([a, b], k) => {
        const i = Math.floor(k / ROWS), j = k % ROWS;
        let h = mode === 0 ? 0.9 + 0.8 * Math.sin(t * 2.2 - i * 0.55) : mode === 1 ? 0.35 + 1.4 * Math.max(0, Math.sin(t * 1.6 + ((i + j) % 2) * Math.PI)) : 0.3 + 1.6 * Math.max(0, Math.sin(t * 1.2 - j * 0.9));
        h = Math.max(0.05, h);
        m.compose(p.set(a, 0, b), q, s.set(1, h, 1)); jets.setMatrixAt(k, m);
        m.compose(p.set(a, h, b), q, s.set(1.4, 0.8, 1.4)); caps.setMatrixAt(k, m);
      });
      jets.instanceMatrix.needsUpdate = true; caps.instanceMatrix.needsUpdate = true;
    },
  };
}
