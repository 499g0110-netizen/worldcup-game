// Bridges and roundabouts from OpenStreetMap outlines (man_made=bridge, junction=roundabout):
// stone decks with arched fascias down to the water, parapets with copings along the water sides (iron railings
// on modern bridges outside the old town), the Puppenbrücke's sandstone statues on pedestals, and planted
// central islands with kerbs, flower beds and shrubs for roundabouts such as the Lindenplatz.
import * as THREE from 'three';

const hash = (n) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
function stoneTex(arches) {
  const c = document.createElement('canvas'); c.width = 512; c.height = arches ? 128 : 256; const g = c.getContext('2d'); let s = 5; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#7c766a'; g.fillRect(0, 0, c.width, c.height);
  const bh = 22; for (let y = 0, row = 0; y < c.height; y += bh, row++) for (let x = -(row % 2) * 30; x < 512; x += 50 + r() * 20) { const v = 170 + (r() - 0.5) * 30; g.fillStyle = `rgb(${v | 0},${v - 8 | 0},${v - 22 | 0})`; g.fillRect(x + 2, y + 2, 48, bh - 4); }
  if (arches) { g.fillStyle = '#15191c'; g.beginPath(); g.moveTo(60, 128); g.lineTo(60, 70); g.ellipse(256, 70, 196, 62, 0, Math.PI, 0); g.lineTo(452, 128); g.fill(); g.strokeStyle = '#9a9384'; g.lineWidth = 8; g.beginPath(); g.ellipse(256, 70, 204, 68, 0, Math.PI, 0); g.stroke(); }
  g.fillStyle = 'rgba(40,50,40,0.18)'; for (let i = 0; i < 40; i++) g.fillRect(r() * 512, c.height - r() * 30, 4 + r() * 20, 30);   // damp line
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
function statue(mat, seed) {   // allegorical sandstone figure on a pedestal (Puppenbrücke "Puppen")
  const g = new THREE.Group(), k = hash(seed);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 0.9), mat); ped.position.y = 0.75; g.add(ped);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.15, 1.05), mat); cap.position.y = 1.55; g.add(cap);
  const robe = new THREE.Mesh(new THREE.LatheGeometry([[0.32, 0], [0.34, 0.3], [0.26, 0.9], [0.22, 1.25], [0.25, 1.45], [0.12, 1.6]].map(([x, y]) => new THREE.Vector2(x, y)), 14), mat); robe.position.y = 1.62; g.add(robe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mat); head.position.y = 1.62 + 1.74; g.add(head);
  const armUp = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.55, 3, 6), mat); armUp.position.set(0.25, 1.62 + 1.6, 0.05); armUp.rotation.z = -0.5 - k * 0.8; g.add(armUp);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.5, 3, 6), mat); arm.position.set(-0.27, 1.62 + 1.05, 0.08); arm.rotation.z = 0.25; g.add(arm);
  if (k > 0.5) { const attr = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 5), mat); attr.position.set(-0.4, 1.62 + 0.9, 0.1); g.add(attr); }   // staff / oar
  else { const attr = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat); attr.position.set(0.55, 1.62 + 1.95, 0.05); g.add(attr); }   // globe / wreath held up
  return g;
}

export function buildBridges(scene, { bridges, rings, inWater, oldTown }) {
  const G = new THREE.Group(); scene.add(G);
  const deckM = new THREE.MeshStandardMaterial({ map: stoneTex(false), roughness: 0.85 }), archT = stoneTex(true);
  const sandstone = new THREE.MeshStandardMaterial({ color: 0xcdbf9f, roughness: 0.9 }), granite = new THREE.MeshStandardMaterial({ color: 0x9c968a, roughness: 0.8 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a3a34, roughness: 0.45, metalness: 0.6 });
  const colliders = [];
  for (const b of bridges) {
    const o = b.o, n = o.length / 2; if (n < 3) continue;
    let cx = 0, cz = 0; for (let i = 0; i < n; i++) { cx += o[2 * i]; cz += o[2 * i + 1]; } cx /= n; cz /= n;
    const stone = oldTown(cx, cz) || /brücke/i.test(b.n || '');
    // deck slab
    const sh = new THREE.Shape(); for (let i = 0; i < n; i++) (i ? sh.lineTo : sh.moveTo).call(sh, o[2 * i], o[2 * i + 1]);
    const dg = new THREE.ExtrudeGeometry(sh, { depth: 0.85, bevelEnabled: false }); dg.rotateX(Math.PI / 2); dg.translate(0, -0.02, 0);
    { const uv = dg.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) / 4, uv.getY(k) / 4); }
    const deck = new THREE.Mesh(dg, deckM); deck.receiveShadow = true; G.add(deck);
    // parapets and arched fascias along the edges that run over water
    const sides = [];
    for (let i = 0; i < n; i++) {
      const x1 = o[2 * i], z1 = o[2 * i + 1], x2 = o[(2 * i + 2) % (2 * n)], z2 = o[(2 * i + 3) % (2 * n)], L = Math.hypot(x2 - x1, z2 - z1); if (L < 3) continue;
      const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2, nx = -(z2 - z1) / L, nz = (x2 - x1) / L;
      if (!(inWater(mx + nx * 2, mz + nz * 2) && inWater(mx - nx * 2, mz - nz * 2))) continue;
      const yaw = Math.atan2(x2 - x1, z2 - z1);
      if (stone) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.05, L), sandstone); wall.position.set(mx, 0.5, mz); wall.rotation.y = yaw; G.add(wall);
        const cop = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.14, L + 0.2), granite); cop.position.set(mx, 1.08, mz); cop.rotation.y = yaw; G.add(cop);
        for (const [px, pz] of [[x1, z1], [x2, z2]]) { const pier = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.35, 0.8), granite); pier.position.set(px, 0.65, pz); pier.rotation.y = yaw; G.add(pier); }
      } else {
        for (let d = 0; d <= L; d += 2) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), iron); post.position.set(x1 + (x2 - x1) * d / L, 0.55, z1 + (z2 - z1) * d / L); G.add(post); }
        for (const y of [1.08, 0.55, 0.15]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, L), iron); rail.position.set(mx, y, mz); rail.rotation.y = yaw; G.add(rail); }
      }
      // fascia with arches, outside face, down to the water line
      for (const sd of [1, -1]) {
        const ox = mx + nx * 0.02 * sd, oz = mz + nz * 0.02 * sd;
        if (!inWater(mx + nx * 2.5 * sd, mz + nz * 2.5 * sd)) continue;
        const t2 = archT.clone(); t2.needsUpdate = true; t2.repeat.set(Math.max(1, Math.round(L / 11)), 1);
        const f = new THREE.Mesh(new THREE.PlaneGeometry(L, 1.6), new THREE.MeshStandardMaterial({ map: t2, roughness: 0.9 })); f.position.set(ox + nx * 0.25 * sd, -0.95, oz + nz * 0.25 * sd); f.rotation.y = Math.atan2(nx * sd, nz * sd); G.add(f);
      }
      sides.push({ x1, z1, x2, z2, yaw, L });
      colliders.push({ c: { x: mx, z: mz }, yaw: Math.atan2(-(z2 - z1), x2 - x1), hx: L / 2, hz: 0.3 });
    }
    // the Puppenbrücke: eight sandstone figures on the parapets
    if (/Puppenbrücke/.test(b.n || '')) {
      const ss = sides.sort((a, c) => c.L - a.L).slice(0, 2); let s = 0;
      for (const sd of ss) for (const t of [0.06, 0.35, 0.65, 0.94]) { const st = statue(sandstone, ++s); st.position.set(sd.x1 + (sd.x2 - sd.x1) * t, 0.0, sd.z1 + (sd.z2 - sd.z1) * t); st.rotation.y = sd.yaw + Math.PI / 2 * (s % 2 ? 1 : -1); G.add(st); }
    }
  }
  // roundabout islands
  for (const r of rings) {
    const o = r.o, n = o.length / 2; if (n < 6) continue;
    let cx = 0, cz = 0; for (let i = 0; i < n; i++) { cx += o[2 * i]; cz += o[2 * i + 1]; } cx /= n; cz /= n;
    let R = 0; for (let i = 0; i < n; i++) R += Math.hypot(o[2 * i] - cx, o[2 * i + 1] - cz); R /= n;
    const half = (r.l ? r.l * 3.2 : 7) / 2, ri = Math.max(2.5, R - half - 0.6);
    const kerb = new THREE.Mesh(new THREE.CylinderGeometry(ri + 0.25, ri + 0.3, 0.2, 48), granite); kerb.position.set(cx, 0.1, cz); G.add(kerb);
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(ri, ri, 0.24, 48), new THREE.MeshStandardMaterial({ color: 0x5f8a3c, roughness: 0.95 })); grass.position.set(cx, 0.13, cz); G.add(grass);
    // flower beds: concentric bands of bedding plants like the photo
    const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 6, 4), new THREE.MeshStandardMaterial({ roughness: 0.8 }), 900), m = new THREE.Matrix4(), c = new THREE.Color(); let k = 0;
    const cols = [0xc9566a, 0xe8d3a0, 0x8a5aa8, 0xd9733a, 0xf2efe8];
    for (let rr = 1.2; rr < ri - 0.6 && k < 900; rr += 0.7) for (let a = 0; a < Math.PI * 2 && k < 900; a += 0.55 / rr) { const band = Math.floor(rr / 2.1) % cols.length; m.makeTranslation(cx + Math.cos(a) * rr, 0.3, cz + Math.sin(a) * rr); fl.setMatrixAt(k, m); c.setHex(cols[band]).offsetHSL(0, 0, (hash(k) - 0.5) * 0.1); fl.setColorAt(k++, c); }
    fl.count = k; G.add(fl);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, sh2 = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 8), new THREE.MeshStandardMaterial({ color: 0x3f6b2e, roughness: 0.9 })); sh2.scale.y = 0.75; sh2.position.set(cx + Math.cos(a) * (ri - 1.1), 0.55, cz + Math.sin(a) * (ri - 1.1)); G.add(sh2); }
    colliders.push({ c: { x: cx, z: cz }, yaw: 0, hx: ri * 0.75, hz: ri * 0.75 });
  }
  G.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  return { group: G, colliders };
}
