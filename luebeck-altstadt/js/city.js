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

export function buildCity(data, { onProgress } = {}) {
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
      const W = [win ? scale : 0, win ? 1 : 0, eave, dBay];
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
  const accs = { asphalt: new Acc(), cobble: new Acc(), pave: new Acc() }, C = new THREE.Color(1, 1, 1);
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
      s += L;
    }
    graph.push({ p, w, k: r.k, b: r.b, n: r.n, surf });
  }
  return { accs, graph };
}
