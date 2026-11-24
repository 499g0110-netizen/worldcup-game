// City geometry from OpenStreetMap (data/city.json, built by tools/build_city.py).
// Frame: x = east, z = south, y = up, metres from a fixed origin (see city.json meta).
import * as THREE from 'three';

/* ------------------------------------------------------------------ helpers */
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export function signedArea(o) { let a = 0; for (let i = 0, n = o.length / 2; i < n; i++) { const j = (i + 1) % n; a += o[2 * i] * o[2 * j + 1] - o[2 * j] * o[2 * i + 1]; } return a / 2; }
export function pip(x, z, o) {
  let inside = false;
  for (let i = 0, n = o.length / 2, j = n - 1; i < n; j = i++) {
    const xi = o[2 * i], zi = o[2 * i + 1], xj = o[2 * j], zj = o[2 * j + 1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
const toV2 = (o) => { const a = []; for (let i = 0; i < o.length; i += 2) a.push(new THREE.Vector2(o[i], o[i + 1])); return a; };
function centroid(o) { let x = 0, z = 0; const n = o.length / 2; for (let i = 0; i < n; i++) { x += o[2 * i]; z += o[2 * i + 1]; } return [x / n, z / n]; }
// oriented bounding box: test each edge direction
function obb(o) {
  const n = o.length / 2; let best = null;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, dx = o[2 * j] - o[2 * i], dz = o[2 * j + 1] - o[2 * i + 1], L = Math.hypot(dx, dz);
    if (L < 0.5) continue;
    const ux = dx / L, uz = dz / L; let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (let k = 0; k < n; k++) { const a = o[2 * k] * ux + o[2 * k + 1] * uz, b = -o[2 * k] * uz + o[2 * k + 1] * ux; a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
    const area = (a1 - a0) * (b1 - b0);
    if (!best || area < best.area) best = { area, ux, uz, a0, a1, b0, b1 };
  }
  if (!best) return null;
  // long axis
  let { ux, uz, a0, a1, b0, b1 } = best;
  if (b1 - b0 > a1 - a0) { [ux, uz] = [-uz, ux]; [a0, a1, b0, b1] = [b0, b1, -a1, -a0]; }
  const ca = (a0 + a1) / 2, cb = (b0 + b1) / 2;
  return { ux, uz, len: a1 - a0, wid: b1 - b0, cx: ca * ux - cb * uz, cz: ca * uz + cb * ux, rect: best.area };
}

/* ------------------------------------------------------- geometry accumulator */
class Acc {
  constructor(extra = 0) { this.p = []; this.n = []; this.u = []; this.c = []; this.w = extra ? [] : null; }
  tri(a, b, c, ua, ub, uc, col, wall) {
    const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2], e2x = c[0] - a[0], e2y = c[1] - a[1], e2z = c[2] - a[2];
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (const [p, uv] of [[a, ua], [b, ub], [c, uc]]) { this.p.push(p[0], p[1], p[2]); this.n.push(nx, ny, nz); this.u.push(uv[0], uv[1]); this.c.push(col.r, col.g, col.b); if (this.w) this.w.push(wall[0], wall[1], wall[2], wall[3]); }
  }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (this.w) g.setAttribute('aWall', new THREE.Float32BufferAttribute(this.w, 4));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}
const NOWALL = [0, 0, 99, -1];


// box in a local frame: origin o, axis a (horizontal unit), out n (horizontal unit, ⟂ a), sizes along a/up/n
function frameBox(acc, ox, oy, oz, ax, az, a0, a1, y0, y1, n0, n1, col, W = NOWALL) {
  const nx = -az, nz = ax;   // right-handed: out = up × along
  const P = (a, y, nn) => [ox + ax * a + nx * nn, oy + y, oz + az * a + nz * nn];
  const q = (p1, p2, p3, p4, u1, u2, u3, u4, nrm) => {
    const e1 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]], e2 = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
    const c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (c[0] * nrm[0] + c[1] * nrm[1] + c[2] * nrm[2] < 0) { acc.tri(p1, p3, p2, u1, u3, u2, col, W); acc.tri(p1, p4, p3, u1, u4, u3, col, W); }
    else { acc.tri(p1, p2, p3, u1, u2, u3, col, W); acc.tri(p1, p3, p4, u1, u3, u4, col, W); }
  };
  const N = [nx, 0, nz], A = [ax, 0, az];
  q(P(a0, y0, n1), P(a1, y0, n1), P(a1, y1, n1), P(a0, y1, n1), [a0, y0], [a1, y0], [a1, y1], [a0, y1], N);                       // front
  q(P(a0, y0, n0), P(a1, y0, n0), P(a1, y1, n0), P(a0, y1, n0), [a0, y0], [a1, y0], [a1, y1], [a0, y1], N.map((v) => -v));        // back
  q(P(a0, y0, n0), P(a0, y0, n1), P(a0, y1, n1), P(a0, y1, n0), [n0, y0], [n1, y0], [n1, y1], [n0, y1], A.map((v) => -v));        // sides
  q(P(a1, y0, n0), P(a1, y0, n1), P(a1, y1, n1), P(a1, y1, n0), [n0, y0], [n1, y0], [n1, y1], [n0, y1], A);
  q(P(a0, y1, n0), P(a1, y1, n0), P(a1, y1, n1), P(a0, y1, n1), [a0, n0], [a1, n0], [a1, n1], [a0, n1], [0, 1, 0]);               // top
}

/* ------------------------------------------------------------- city builder */
export const BAY = 2.4, STOREY = 3.2;
const PLASTER_TINTS = ['#f2ede3', '#efe3c6', '#ecd8a4', '#e7cdbd', '#dfe3e2', '#f4f1ea', '#e0cba6', '#e6bda6', '#d3d9cf', '#f0e6d6'].map((c) => new THREE.Color(c));
const COPPER_RE = /^#(3[0-9a-f]c[0-9a-f]9[0-9a-f]|33cc99|6[0-9a-f]a[0-9a-f]9[0-9a-f])$/i;
function roofKind(t) {
  const c = (t['roof:colour'] || '').toLowerCase(), m = (t['roof:material'] || '').toLowerCase();
  if (c === '#33cc99' || COPPER_RE.test(c) || m === 'copper' || c === 'green' || c === 'teal') return 'copper';
  if (m === 'slate' || (c && /^#(9|8|7|6|5|4|3)[0-9a-f]{5}$/.test(c) && c !== '#33cc99') || c === 'grey' || c === 'gray' || c === 'black') return 'slate';
  return 'tile';
}

// async: yields to the browser every ~6 ms so frames keep rendering while a block is built (no stutter)
export async function buildCity(data, { onProgress, budget = 6 } = {}) {
  let tSlice = performance.now();
  const TILE = 200, accs = new Map();
  const acc = (key, extra) => { if (!accs.has(key)) accs.set(key, new Acc(extra)); return accs.get(key); };
  const segs = [];               // collision segments [x1,z1,x2,z2,top]
  const windows = [];            // near-LOD window placements
  const doors = [];
  const footprints = [];         // for the minimap & queries
  let nB = 0;

  const items = [];
  for (const b of data.buildings) if (!b.hasParts) items.push([b, false]);
  for (const p of data.parts) items.push([p, true]);

  for (const [f, isPart] of items) {
    if (performance.now() - tSlice > budget) { await new Promise((r) => setTimeout(r, 0)); tSlice = performance.now(); }
    let o = f.o; if (o.length < 6) continue;
    if (signedArea(o) < 0) { // make CCW in (x,z) — with z south this is clockwise seen from above; keep one convention
      const r = []; for (let i = o.length - 2; i >= 0; i -= 2) r.push(o[i], o[i + 1]); o = r;
      if (f.ew) { const old = f.ew, m = old.length; f.ew = Array.from({ length: m }, (_, k) => old[(m - 2 - k + 2 * m) % m]).join(''); } // edge k of the reversed ring = old edge n-2-k
    }
    const t = f.t || {}, area = Math.abs(signedArea(o)), [cx, cz] = centroid(o), seed = hash(cx * 0.37 + cz * 1.91);
    const bt = t.building || t['building:part'] || 'yes';
    // ---- heights (OSM first, then documented defaults)
    const minH = f.mh ?? (f.mlv != null ? f.mlv * 3.0 : 0);
    let shape = (t['roof:shape'] || '').toLowerCase();
    const isBig = area > 900, isChurchish = /church|cathedral|chapel/.test(bt);
    const rectish = obb(o);
    if (!shape) {
      if (isPart) shape = 'flat';
      else if (bt === 'garage' || bt === 'garages' || bt === 'roof' || isBig || area < 14) shape = 'flat';
      else if (rectish && rectish.rect / area < 1.25 && rectish.wid < 22) shape = 'gabled';
      else shape = 'hipped';
    }
    let roofH = f.rh ?? (f.rl != null ? f.rl * 2.8 : null);
    let H = f.h;
    if (H == null) {
      const lv = f.lv ?? (bt === 'garage' || bt === 'shed' ? 1 : isBig ? 4 : 2 + Math.floor(seed * 2.4));
      if (roofH == null) roofH = shape === 'flat' ? 0 : shape === 'gabled' && rectish ? Math.min(14, rectish.wid * 0.62) : rectish ? Math.min(10, rectish.wid * 0.45) : 4;
      H = minH + lv * STOREY + 0.4 + roofH;
    }
    if (roofH == null) roofH = shape === 'flat' ? 0 : Math.min(H * 0.4, rectish ? rectish.wid * 0.6 : 5);
    if (shape === 'flat') roofH = 0;
    const eave = Math.max(minH + 0.5, H - roofH);
    // ---- materials
    const matT = (t['building:material'] || '').toLowerCase(), colT = t['building:colour'];
    const brick = matT ? /brick/.test(matT) : isChurchish || seed < 0.46;
    let tint;
    if (colT && !brick) { try { tint = new THREE.Color(colT); } catch { tint = PLASTER_TINTS[Math.floor(seed * 97) % PLASTER_TINTS.length]; } }
    else if (brick) { const v = 0.82 + hash(seed * 13) * 0.25; tint = new THREE.Color(v, v * (0.94 + hash(seed * 7) * 0.08), v * (0.9 + hash(seed * 5) * 0.1)); }
    else tint = PLASTER_TINTS[Math.floor(seed * 97) % PLASTER_TINTS.length];
    const rk = shape === 'flat' ? 'flat' : roofKind(t);
    const tileKey = Math.floor(cx / TILE) + ',' + Math.floor(cz / TILE);
    const wallAcc = acc((brick ? 'brick|' : 'plaster|') + tileKey, true);
    const roofAcc = acc('roof_' + rk + '|' + tileKey);
    const roofTint = rk === 'tile' ? new THREE.Color().setHSL(0.03 + hash(seed * 3) * 0.02, 0.35 + hash(seed * 9) * 0.2, 0.5 + hash(seed * 11) * 0.16) : new THREE.Color(1, 1, 1);
    // ---- gabled: split outline by the ridge line
    let ridge = null;
    if (shape === 'gabled' || shape === 'saltbox' || shape === 'mansard' || shape === 'gambrel' || shape === 'half-hipped' || shape === 'round') {
      if (rectish && !(f.i && f.i.length)) ridge = rectish;
      else shape = 'pyramidal';
    }
    const roofY = (x, z) => {
      if (!ridge) return eave;
      const d = Math.abs(-(x - ridge.cx) * ridge.uz + (z - ridge.cz) * ridge.ux);
      return eave + roofH * Math.max(0, 1 - d / (ridge.wid / 2));
    };
    // insert ridge crossings into the outline so walls get proper gable tops
    let ring = []; const ewIn = f.ew || '', ewOut = [];
    {
      const n = o.length / 2;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, x1 = o[2 * i], z1 = o[2 * i + 1], x2 = o[2 * j], z2 = o[2 * j + 1];
        ring.push(x1, z1); ewOut.push(ewIn[i] ?? '1');
        if (ridge) {
          const s1 = -(x1 - ridge.cx) * ridge.uz + (z1 - ridge.cz) * ridge.ux, s2 = -(x2 - ridge.cx) * ridge.uz + (z2 - ridge.cz) * ridge.ux;
          if (s1 * s2 < 0) { const k = s1 / (s1 - s2); ring.push(x1 + (x2 - x1) * k, z1 + (z2 - z1) * k); ewOut.push(ewIn[i] ?? '1'); }
        }
      }
    }
    // ---- walls
    const n = ring.length / 2;
    // door: the longest street-facing edge of a real building gets one door
    let doorEdge = -1, doorLen = 0;
    if (!isPart && minH < 0.5) for (let i = 0; i < n; i++) { if (ewOut[i] !== '1') continue; const j = (i + 1) % n, L = Math.hypot(ring[2 * j] - ring[2 * i], ring[2 * j + 1] - ring[2 * i + 1]); if (L > doorLen && L > 3) { doorLen = L; doorEdge = i; } }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, x1 = ring[2 * i], z1 = ring[2 * i + 1], x2 = ring[2 * j], z2 = ring[2 * j + 1];
      const L = Math.hypot(x2 - x1, z2 - z1); if (L < 0.05) continue;
      const y1 = roofY(x1, z1), y2 = roofY(x2, z2);
      const win = ewOut[i] === '1' && !isChurchish && !isPart && L > 1.6 && eave - minH > 2.4;  // landmark parts (churches, gates) get no generic windows
      const nb = Math.max(1, Math.round(L / BAY)), scale = nb / L;
      const dBay = i === doorEdge ? Math.floor(nb / 2) : -1;
      const W = [win ? scale : 0, win ? (brick ? 1.25 : 1) : 0, eave, dBay];
      wallAcc.tri([x1, minH, z1], [x2, y2, z2], [x2, minH, z2], [0, minH], [L, y2], [L, minH], tint, W);
      wallAcc.tri([x1, minH, z1], [x1, y1, z1], [x2, y2, z2], [0, minH], [0, y1], [L, y2], tint, W);
      segs.push([x1, z1, x2, z2, Math.max(y1, y2), minH]);
      if (win || dBay >= 0) {
        // outward normal: ring is CCW in (x,z) → outward = (dz, -dx)
        const ux = (x2 - x1) / L, uz = (z2 - z1) / L, nx = uz, nz = -ux;
        for (let k = 0; k < nb; k++) {
          const s = (k + 0.5) / scale, px = x1 + ux * s, pz = z1 + uz * s;
          for (let fy = minH; fy + STOREY * 0.8 <= eave - 0.2 + 1e-3; fy += STOREY) {
            const ground = fy < minH + 0.1;
            if (ground && k === dBay) { doors.push({ x: px, z: pz, nx, nz, w: 0.4 / scale, tint, seed: hash(seed + k) }); continue; }
            if (win) windows.push({ x: px, y: fy, z: pz, nx, nz, w: 0.4 / scale, tint, seed: hash(seed * 31 + k * 7 + fy) });
          }
        }
      }
    }
    // ---- facade details (only real houses, not landmark parts)
    if (!isPart && eave - minH > 3) {
      const corn = brick ? tint.clone().multiplyScalar(0.92) : tint.clone().lerp(new THREE.Color(1, 1, 1), 0.55);
      // eave cornice along every street-facing wall (dentil course on brick, moulded band on plaster)
      for (let i = 0; i < n; i++) {
        if (ewOut[i] !== '1') continue;
        const j = (i + 1) % n, x1 = ring[2 * i], z1 = ring[2 * i + 1], x2 = ring[2 * j], z2 = ring[2 * j + 1], L = Math.hypot(x2 - x1, z2 - z1);
        if (L < 1.5 || Math.abs(roofY(x1, z1) - eave) > 0.05 || Math.abs(roofY(x2, z2) - eave) > 0.05) continue;   // gable walls get steps instead
        const ux = (x2 - x1) / L, uz = (z2 - z1) / L;
        frameBox(wallAcc, x1, 0, z1, ux, uz, -0.08, L + 0.08, eave - 0.32, eave - 0.06, -0.02, 0.2, corn);
        frameBox(wallAcc, x1, 0, z1, ux, uz, -0.04, L + 0.04, eave - 0.06, eave + 0.04, -0.02, 0.3, corn);
        // storey band above the ground floor
        if (eave - minH > 6.5 && !brick) frameBox(wallAcc, x1, 0, z1, ux, uz, 0, L, minH + 3.1, minH + 3.26, -0.02, 0.07, corn);
      }
      const boxy = rectish && rectish.rect / area < 1.1;   // only near-rectangular outlines get gable dressing (irregular ones put it in mid-air)
      if (ridge && roofH > 2 && boxy) {
        const ends = [-1, 1].map((sg) => [ridge.cx + ridge.ux * sg * ridge.len / 2, ridge.cz + ridge.uz * sg * ridge.len / 2, sg]);
        // Lübeck stepped gables ("Treppengiebel") on brick houses facing the street with their narrow side
        if (brick && ridge.wid < 17 && hash(seed * 17) < 0.8) {
          const steps = Math.max(3, Math.round(ridge.wid / 1.25)) | 1, sw = ridge.wid / steps;
          for (const [ex, ez, sg] of ends) {
            // axis across the gable = ridge normal; out = ±ridge axis
            const ax = -ridge.uz * sg, az = ridge.ux * sg;
            for (let k = 0; k < steps; k++) {
              const b0 = -ridge.wid / 2 + k * sw, b1 = b0 + sw, bm = Math.max(Math.abs(b0), Math.abs(b1)) === Math.abs(b0) ? b1 : b0;
              const top = eave + roofH * Math.max(0, 1 - Math.abs((b0 + b1) / 2) / (ridge.wid / 2)) + 0.55 + (k === (steps - 1) / 2 ? 0.6 : 0);
              void bm;
              frameBox(wallAcc, ex, 0, ez, ax, az, b0 + 0.02, b1 - 0.02, eave - 0.2, top, -0.45, 0.04, tint);
              frameBox(wallAcc, ex, 0, ez, ax, az, b0 - 0.03, b1 + 0.03, top, top + 0.09, -0.5, 0.09, corn.clone().multiplyScalar(0.8));   // coping
            }
          }
        } else {
          // plain gables get a verge board / barge line so the roof edge reads
          for (const [ex, ez, sg] of ends) {
            const ax = -ridge.uz * sg, az = ridge.ux * sg;
            for (const sd of [-1, 1]) {
              const b0 = sd < 0 ? -ridge.wid / 2 : 0, b1 = sd < 0 ? 0 : ridge.wid / 2, segs2 = 6;
              for (let k = 0; k < segs2; k++) {
                const c0 = b0 + (b1 - b0) * k / segs2, c1 = b0 + (b1 - b0) * (k + 1) / segs2, y = eave + roofH * (1 - Math.abs((c0 + c1) / 2) / (ridge.wid / 2));
                frameBox(roofAcc, ex, 0, ez, ax, az, c0, c1, y - 0.05, y + 0.18, -0.05, 0.22, roofTint);
              }
            }
          }
        }
        // chimneys on the ridge
        const nCh = ridge.len > 9 ? 2 : hash(seed * 5) < 0.6 ? 1 : 0, chimAcc = acc('brick|' + tileKey, true), chimCol = new THREE.Color(0.78, 0.62, 0.55);
        for (let c = 0; c < nCh; c++) {
          const a = (c ? 0.28 : -0.22 + hash(seed * 23) * 0.15) * ridge.len, off = (hash(seed * 29 + c) - 0.5) * ridge.wid * 0.3;
          const bx = ridge.cx + ridge.ux * a - ridge.uz * off, bz = ridge.cz + ridge.uz * a + ridge.ux * off, by = roofY(bx, bz);
          frameBox(chimAcc, bx, 0, bz, ridge.ux, ridge.uz, -0.35, 0.35, by - 1.2, by + 1.1, -0.3, 0.3, chimCol);
          frameBox(chimAcc, bx, 0, bz, ridge.ux, ridge.uz, -0.42, 0.42, by + 1.1, by + 1.22, -0.37, 0.37, chimCol.clone().multiplyScalar(0.7));
        }
        // dormers on long roof slopes
        if (ridge.len > 9 && roofH > 3.2 && hash(seed * 31) < 0.75) {
          const nd = Math.max(1, Math.floor((ridge.len - 3) / 4.2)), dw = 1.3, dh = 1.6;
          for (const side of [-1, 1]) for (let d = 0; d < nd; d++) {
            const a = (-(nd - 1) / 2 + d) * 4.2, bOff = ridge.wid * 0.25 * side;   // half-way down the slope
            const fx = ridge.cx + ridge.ux * a - ridge.uz * bOff, fz = ridge.cz + ridge.uz * a + ridge.ux * bOff, fy = roofY(fx, fz);
            const ox = -ridge.uz * side, oz = ridge.ux * side;              // dormer faces down the slope
            const ax = ridge.ux, az = ridge.uz;
            // body: front face at n = 0.2 in front of the slope point, back reaches into the roof
            const Wd = [1 / (2 * dw), 2, 99, -1];
            const yb = fy - 0.35, yt = fy + dh;
            // front face with window (uv: one bay across, v spanning a window)
            const P = (aa, yy, nn) => [fx + ax * aa + ox * nn, yy, fz + az * aa + oz * nn];
            const f1 = P(-dw, yb, 0.25), f2 = P(dw, yb, 0.25), f3 = P(dw, yt, 0.25), f4 = P(-dw, yt, 0.25);
            const sideSign = (ox * -az + oz * ax) > 0;   // keep outward winding
            const tri = (a1, b1, c1, u1, u2, u3) => sideSign ? wallAcc.tri(a1, b1, c1, u1, u2, u3, tint, Wd) : wallAcc.tri(a1, c1, b1, u1, u3, u2, tint, Wd);
            tri(f1, f2, f3, [0, 0.55], [2 * dw, 0.55], [2 * dw, 2.45]); tri(f1, f3, f4, [0, 0.55], [2 * dw, 2.45], [0, 2.45]);
            frameBox(wallAcc, fx, 0, fz, ax, az, -dw, -dw + 0.12, yb, yt, -1.6, 0.25, tint);   // cheeks
            frameBox(wallAcc, fx, 0, fz, ax, az, dw - 0.12, dw, yb, yt, -1.6, 0.25, tint);
            frameBox(wallAcc, fx, 0, fz, ax, az, -dw, dw, yb, yb + 0.12, -1.6, 0.25, tint);
            // little pitched roof over the dormer
            for (const sd of [-1, 1]) {
              const r0 = P(sd * (dw + 0.15), yt, 0.4), r1 = P(0, yt + 0.75, 0.4), r2 = P(0, yt + 0.75, -1.6), r3 = P(sd * (dw + 0.15), yt, -1.6);
              const up = sd > 0 === sideSign;
              if (up) { roofAcc.tri(r0, r1, r2, [0, 0], [1, 0], [1, 2], roofTint); roofAcc.tri(r0, r2, r3, [0, 0], [1, 2], [0, 2], roofTint); }
              else { roofAcc.tri(r0, r2, r1, [0, 0], [1, 2], [1, 0], roofTint); roofAcc.tri(r0, r3, r2, [0, 0], [0, 2], [1, 2], roofTint); }
            }
          }
        }
      }
    }
    // ---- roof
    if (shape === 'flat' || roofH <= 0.05) {
      const cont = toV2(ring), holes = (f.i || []).map(toV2);
      const tris = THREE.ShapeUtils.triangulateShape(cont, holes), all = cont.concat(...holes);
      for (const [a, b, c] of tris) {
        const A = all[a], B = all[b], Cc = all[c], up = ((B.y - A.y) * (Cc.x - A.x) - (B.x - A.x) * (Cc.y - A.y)) > 0;
        if (up) roofAcc.tri([A.x, eave, A.y], [B.x, eave, B.y], [Cc.x, eave, Cc.y], [A.x, A.y], [B.x, B.y], [Cc.x, Cc.y], roofTint);
        else roofAcc.tri([A.x, eave, A.y], [Cc.x, eave, Cc.y], [B.x, eave, B.y], [A.x, A.y], [Cc.x, Cc.y], [B.x, B.y], roofTint);
      }
      for (const hole of f.i || []) for (let i = 0; i < hole.length / 2; i++) { const j = (i + 1) % (hole.length / 2); segs.push([hole[2 * i], hole[2 * i + 1], hole[2 * j], hole[2 * j + 1], eave, minH]); }
    } else if (ridge) {
      // two planar halves
      for (const side of [-1, 1]) {
        const half = [];
        for (let i = 0; i < n; i++) { const x = ring[2 * i], z = ring[2 * i + 1], s = -(x - ridge.cx) * ridge.uz + (z - ridge.cz) * ridge.ux; if (s * side >= -1e-6) half.push(new THREE.Vector2(x, z)); }
        if (half.length < 3) continue;
        const tris = THREE.ShapeUtils.triangulateShape(half, []);
        const cosP = Math.cos(Math.atan2(roofH, ridge.wid / 2));
        const uv = (p) => { const a = (p.x - ridge.cx) * ridge.ux + (p.y - ridge.cz) * ridge.uz, b = Math.abs(-(p.x - ridge.cx) * ridge.uz + (p.y - ridge.cz) * ridge.ux); return [a, b / cosP]; };
        for (const [a, b, c] of tris) {
          const A = half[a], B = half[b], Cc = half[c];
          const pa = [A.x, roofY(A.x, A.y), A.y], pb = [B.x, roofY(B.x, B.y), B.y], pc = [Cc.x, roofY(Cc.x, Cc.y), Cc.y];
          // keep upward normal
          const up = ((pb[2] - pa[2]) * (pc[0] - pa[0]) - (pb[0] - pa[0]) * (pc[2] - pa[2])) > 0;
          if (up) roofAcc.tri(pa, pb, pc, uv(A), uv(B), uv(Cc), roofTint); else roofAcc.tri(pa, pc, pb, uv(A), uv(Cc), uv(B), roofTint);
        }
      }
    } else {
      // pyramidal / hipped / dome / onion / cone: faces to an apex over the centroid
      const ay = eave + roofH, apex = [cx, ay, cz];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, a = [ring[2 * i], eave, ring[2 * i + 1]], b = [ring[2 * j], eave, ring[2 * j + 1]];
        const L = Math.hypot(b[0] - a[0], b[2] - a[2]), mx = (a[0] + b[0]) / 2, mz = (a[2] + b[2]) / 2, sl = Math.hypot(Math.hypot(cx - mx, cz - mz), roofH);
        const up = ((b[2] - a[2]) * (apex[0] - a[0]) - (b[0] - a[0]) * (apex[2] - a[2])) > 0;
        if (up) roofAcc.tri(a, b, apex, [0, 0], [L, 0], [L / 2, sl], roofTint); else roofAcc.tri(a, apex, b, [0, 0], [L / 2, sl], [L, 0], roofTint);
      }
    }
    if (!isPart || minH < 1) footprints.push({ o, cx, cz, H, brick, part: isPart, name: t.name });
    if (++nB % 1500 === 0) onProgress?.(nB / items.length);
  }
  return { accs, segs, windows, doors, footprints };
}

/* ---------------------------------------------------------- roads & ground */
const ROAD_W = { motorway: 14, trunk: 12, primary: 11, secondary: 10, tertiary: 8, unclassified: 6, residential: 6.5, living_street: 5.5, pedestrian: 6, service: 4, footway: 2.4, path: 2, cycleway: 2.2, steps: 2, track: 3 };
export function roadSurface(r) {
  const s = (r.s || '').toLowerCase();
  if (/sett|cobble|unhewn/.test(s)) return 'cobble';
  if (/asphalt|concrete$/.test(s)) return 'asphalt';
  if (/paving|plates|paved|concrete:/.test(s)) return 'pave';
  if (/primary|secondary|tertiary|trunk|motorway|unclassified/.test(r.k)) return 'asphalt';
  if (/residential|living_street|pedestrian|service/.test(r.k)) return 'cobble';
  return 'pave';
}
export function buildRoads(data) {
  const accs = { asphalt: new Acc(), cobble: new Acc(), pave: new Acc(), kerb: new Acc(), marking: new Acc() }, C = new THREE.Color(1, 1, 1);
  const KERB = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified']);
  const order = { pave: 0.02, cobble: 0.035, asphalt: 0.05 };
  const graph = [];                       // drivable / walkable polylines for AI & bridges
  for (const r of data.roads) {
    const w = r.w || (r.l ? r.l * 3.2 : ROAD_W[r.k]); if (!w) continue;
    const surf = roadSurface(r), a = accs[surf], y = order[surf] + (r.b ? 0.05 : 0), p = r.p, n = p.length / 2;
    if (n < 2) continue;
    let s = 0;
    const off = [];
    for (let i = 0; i < n; i++) {
      const ip = Math.max(0, i - 1), inx = Math.min(n - 1, i + 1);
      let dx = p[2 * inx] - p[2 * ip], dz = p[2 * inx + 1] - p[2 * ip + 1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      off.push([-dz * w / 2, dx * w / 2]);
    }
    for (let i = 0; i < n - 1; i++) {
      const x1 = p[2 * i], z1 = p[2 * i + 1], x2 = p[2 * i + 2], z2 = p[2 * i + 3], L = Math.hypot(x2 - x1, z2 - z1);
      const l1 = [x1 + off[i][0], y, z1 + off[i][1]], r1 = [x1 - off[i][0], y, z1 - off[i][1]], l2 = [x2 + off[i + 1][0], y, z2 + off[i + 1][1]], r2 = [x2 - off[i + 1][0], y, z2 - off[i + 1][1]];
      const tri = (A, B, Cc, ua, ub, uc) => { const up = ((B[2] - A[2]) * (Cc[0] - A[0]) - (B[0] - A[0]) * (Cc[2] - A[2])) > 0; up ? a.tri(A, B, Cc, ua, ub, uc, C) : a.tri(A, Cc, B, ua, uc, ub, C); };
      tri(l1, r1, r2, [0, s], [w, s], [w, s + L]); tri(l1, r2, l2, [0, s], [w, s + L], [0, s + L]);
      // granite kerb stones on both edges of streets with car traffic (30 cm wide, 8 cm proud)
      if (KERB.has(r.k) && !r.b && w >= 5) for (const sd of [1, -1]) {
        const k0 = (e, f) => [p[2 * e] + off[e][0] * sd * f, p[2 * e + 1] + off[e][1] * sd * f];
        const [ax1, az1] = k0(i, 1), [ax2, az2] = k0(i + 1, 1), [bx1, bz1] = k0(i, 1 - 0.6 / w), [bx2, bz2] = k0(i + 1, 1 - 0.6 / w);
        const ky = 0.09, K = accs.kerb;
        const t1 = [ax1, ky, az1], t2 = [ax2, ky, az2], t3 = [bx2, ky, bz2], t4 = [bx1, ky, bz1];
        const ktri = (A, B, Cc, ua, ub, uc) => { const up = ((B[2] - A[2]) * (Cc[0] - A[0]) - (B[0] - A[0]) * (Cc[2] - A[2])) > 0; up ? K.tri(A, B, Cc, ua, ub, uc, C) : K.tri(A, Cc, B, ua, uc, ub, C); };
        ktri(t1, t2, t3, [s, 0], [s + L, 0], [s + L, 0.3]); ktri(t1, t3, t4, [s, 0], [s + L, 0.3], [s, 0.3]);
        // inner face toward the carriageway
        const f1 = [bx1, 0, bz1], f2 = [bx2, 0, bz2];
        const cx = (p[2 * i] + p[2 * i + 2]) / 2, cz = (p[2 * i + 1] + p[2 * i + 3]) / 2;
        const e1 = [f2[0] - f1[0], 0, f2[2] - f1[2]], nrm = [e1[2] * ky, 0, -e1[0] * ky];   // normal of (f1,f2,t3)
        const toC = (cx - bx1) * nrm[0] + (cz - bz1) * nrm[2];
        if (toC > 0) { K.tri(f1, f2, t3, [s, 0], [s + L, 0], [s + L, ky], C); K.tri(f1, t3, t4, [s, 0], [s + L, ky], [s, ky], C); }
        else { K.tri(f1, t3, f2, [s, 0], [s + L, ky], [s + L, 0], C); K.tri(f1, t4, t3, [s, 0], [s, ky], [s + L, ky], C); }
      }
      s += L;
    }
    // ---- road markings (white, per German StVO): centre line + edge lines on asphalt roads with car traffic
    if (surf === 'asphalt' && /primary|secondary|tertiary|unclassified|residential|trunk/.test(r.k) && w >= 5.5) {
      const Mk = accs.marking, my = y + 0.008, oneway = r.o === 'yes' || r.o === '-1';
      const major = /primary|secondary|trunk/.test(r.k);
      const strip = (lat, hw, dash, gap) => {   // lat = lateral offset (m), hw = half width, dash/gap in metres (0 = solid)
        let s2 = 0;
        for (let i = 0; i < n - 1; i++) {
          const x1 = p[2 * i], z1 = p[2 * i + 1], x2 = p[2 * i + 2], z2 = p[2 * i + 3], L = Math.hypot(x2 - x1, z2 - z1); if (L < 0.01) continue;
          const ux = (x2 - x1) / L, uz = (z2 - z1) / L, nx = -uz, nz = ux;
          const seg = (a0, a1) => {
            const P1 = [x1 + ux * a0 + nx * (lat - hw), my, z1 + uz * a0 + nz * (lat - hw)], P2 = [x1 + ux * a1 + nx * (lat - hw), my, z1 + uz * a1 + nz * (lat - hw)];
            const P3 = [x1 + ux * a1 + nx * (lat + hw), my, z1 + uz * a1 + nz * (lat + hw)], P4 = [x1 + ux * a0 + nx * (lat + hw), my, z1 + uz * a0 + nz * (lat + hw)];
            const up = ((P2[2] - P1[2]) * (P3[0] - P1[0]) - (P2[0] - P1[0]) * (P3[2] - P1[2])) > 0;
            if (up) { Mk.tri(P1, P2, P3, [0, 0], [1, 0], [1, 1], C); Mk.tri(P1, P3, P4, [0, 0], [1, 1], [0, 1], C); } else { Mk.tri(P1, P3, P2, [0, 0], [1, 1], [1, 0], C); Mk.tri(P1, P4, P3, [0, 0], [0, 1], [1, 1], C); }
          };
          if (!dash) seg(0, L);
          else { const per = dash + gap; let a0 = (per - (s2 % per)) % per - per; for (; a0 < L; a0 += per) { const b0 = Math.max(0, a0), b1 = Math.min(L, a0 + dash); if (b1 > b0) seg(b0, b1); } }
          s2 += L;
        }
      };
      if (!oneway) {
        if (major && w >= 9) { strip(0.12, 0.06, 0, 0); strip(-0.12, 0.06, 0, 0); }      // double solid (Doppelte durchgezogene Linie)
        else strip(0, 0.06, 3, 6);                                                             // Leitlinie: 3 m dash, 6 m gap
      }
      if (major) for (const sd of [1, -1]) strip(sd * (w / 2 - 0.45), 0.08, 0, 0);            // solid edge lines (Fahrbahnbegrenzung)
    }
    graph.push({ p, w, k: r.k, b: r.b, n: r.n, surf });
  }
  return { accs, graph };
}
