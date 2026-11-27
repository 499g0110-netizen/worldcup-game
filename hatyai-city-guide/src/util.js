import * as THREE from 'three';

export const ORIGIN = { lat: 7.0058506, lon: 100.4716957 }; // Lee Gardens Plaza (OpenStreetMap)
export const M_LAT = 110580;
export const M_LON = 111320 * Math.cos(ORIGIN.lat * Math.PI / 180);
export const ll2xz = (lat, lon) => [(lon - ORIGIN.lon) * M_LON, -(lat - ORIGIN.lat) * M_LAT];

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeSine = t => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));

// ---------- value noise (JS side) ----------
function h2(x, y) { let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h2(xi, yi), h2(xi + 1, yi), u), lerp(h2(xi, yi + 1), h2(xi + 1, yi + 1), u), v);
}
export function fbm(x, y, o = 4) { let a = 0.5, s = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x, y); x *= 2.03; y *= 2.03; a *= 0.5; } return s; }

// ---------- spatial hash of polyline segments ----------
export class SegHash {
  constructor(cell = 50) { this.cell = cell; this.map = new Map(); this.segs = []; }
  _k(ix, iz) { return ix * 73856093 ^ iz * 19349663; }
  add(ax, az, bx, bz, data) {
    const id = this.segs.length; this.segs.push([ax, az, bx, bz, data]);
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / (this.cell * 0.5)));
    const seen = new Set();
    for (let i = 0; i <= n; i++) {
      const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n;
      const ix = Math.floor(x / this.cell), iz = Math.floor(z / this.cell);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        const k = this._k(ix + dx, iz + dz); if (seen.has(k)) continue; seen.add(k);
        let arr = this.map.get(k); if (!arr) this.map.set(k, arr = []); arr.push(id);
      }
    }
  }
  nearest(x, z, maxD = 100) {
    const arr = this.map.get(this._k(Math.floor(x / this.cell), Math.floor(z / this.cell)));
    if (!arr) return null;
    let best = null, bd = maxD;
    for (const id of arr) {
      const [ax, az, bx, bz, data] = this.segs[id];
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
      const t = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1);
      const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
      if (d < bd) { bd = d; best = { d, px, pz, dx, dz, data, t }; }
    }
    return best;
  }
}

// ---------- occupancy raster ----------
export class Occ {
  constructor(x0, z0, x1, z1, cell = 4) {
    this.x0 = x0; this.z0 = z0; this.cell = cell;
    this.w = Math.ceil((x1 - x0) / cell); this.h = Math.ceil((z1 - z0) / cell);
    this.g = new Uint8Array(this.w * this.h);
  }
  _i(x, z) { const ix = Math.floor((x - this.x0) / this.cell), iz = Math.floor((z - this.z0) / this.cell); return (ix < 0 || iz < 0 || ix >= this.w || iz >= this.h) ? -1 : iz * this.w + ix; }
  get(x, z) { const i = this._i(x, z); return i < 0 ? 1 : this.g[i]; }
  // rotated rect (cx,cz,w,d,rot)
  rect(cx, cz, w, d, rot, val = 1, test = false, margin = 0) {
    const c = Math.cos(rot), s = Math.sin(rot), hw = w / 2 + margin, hd = d / 2 + margin, st = this.cell * 0.7;
    for (let a = -hw; a <= hw + 0.01; a += Math.min(st, hw * 2 || st)) for (let b = -hd; b <= hd + 0.01; b += Math.min(st, hd * 2 || st)) {
      const x = cx + a * c - b * s, z = cz + a * s + b * c, i = this._i(x, z);
      if (test) { if (i < 0 || this.g[i]) return true; } else if (i >= 0) this.g[i] = val;
    }
    return false;
  }
  hit(cx, cz, w, d, rot, margin = 0) { return this.rect(cx, cz, w, d, rot, 1, true, margin); }
  mark(cx, cz, w, d, rot, margin = 0) { this.rect(cx, cz, w, d, rot, 1, false, margin); }
  line(ax, az, bx, bz, width) {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / (this.cell * 0.6)));
    const r = width / 2 + 0.5;
    for (let i = 0; i <= n; i++) {
      const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n;
      for (let dx = -r; dx <= r; dx += this.cell * 0.7) for (let dz = -r; dz <= r; dz += this.cell * 0.7) {
        if (dx * dx + dz * dz <= r * r) { const k = this._i(x + dx, z + dz); if (k >= 0) this.g[k] = 1; }
      }
    }
  }
  poly(pts, margin = 0) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    for (let x = x0 - margin; x <= x1 + margin; x += this.cell * 0.8) for (let z = z0 - margin; z <= z1 + margin; z += this.cell * 0.8) {
      if (pointInPoly(x, z, pts) || (margin > 0 && distToPoly(x, z, pts) < margin)) { const i = this._i(x, z); if (i >= 0) this.g[i] = 1; }
    }
  }
}
export function pointInPoly(x, z, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) c = !c;
  }
  return c;
}
export function distToPoly(x, z, pts) {
  let best = 1e9;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1);
    best = Math.min(best, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t));
  }
  return best;
}
export function pca(pts) {
  const n = pts.length; let cx = 0, cz = 0;
  for (const p of pts) { cx += p[0]; cz += p[1]; } cx /= n; cz /= n;
  let sxx = 0, szz = 0, sxz = 0;
  for (const p of pts) { const dx = p[0] - cx, dz = p[1] - cz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; }
  const th = 0.5 * Math.atan2(2 * sxz, sxx - szz);
  return { cx, cz, th, ux: Math.cos(th), uz: Math.sin(th) };
}

// ---------- canvas textures ----------
export function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
export function glowTex(size = 128, stops = [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]) {
  return canvasTex(size, size, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    for (const [o, c] of stops) gr.addColorStop(o, c);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { clamp: true });
}
export function signTex(lines, { w = 512, h = 128, bg = '#0b3d2a', fg = '#f3e6b0', font = 'bold 54px "Noto Sans TC","Noto Sans Thai",system-ui,sans-serif', border = null } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (border) { g.strokeStyle = border; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const arr = Array.isArray(lines) ? lines : [lines];
    arr.forEach((t, i) => {
      const fs = typeof t === 'object' ? t.font : font;
      g.font = fs; g.fillText(typeof t === 'object' ? t.text : t, w / 2, h * (i + 1) / (arr.length + 1));
    });
  }, { clamp: true });
}

export function seedColor(rnd, palette) { return new THREE.Color(palette[Math.floor(rnd() * palette.length)]); }
