import * as THREE from 'three';

// ------------------------------------------------------------------
//  Procedural facade shader: windows, shopfronts, signs, grime, lit windows
//  styles: 0 shophouse | 1 glass office | 2 Lee Gardens | 3 Centara | 4 mall/podium
//          5 apartment | 6 plain | 9 roof | 10 curtain-glass
// ------------------------------------------------------------------
export const FOOTPRINTS = [];
export const facadeUniforms = { uNight: { value: 0.8 }, uTime: { value: 0 } };

export function makeFacadeMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, facadeUniforms);
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', `attribute vec4 aWall; varying vec4 vWall; varying vec3 vWorld;\nvoid main() {`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n vWall = aWall; vWorld = (modelMatrix*vec4(position,1.)).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', FRAG_PRE + '\nvoid main() {')
      .replace('#include <color_fragment>', FRAG_COLOR)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = fRough;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = fMetal;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += fEmit;');
  };
  m.customProgramCacheKey = () => 'facade-v3';
  return m;
}

const FRAG_PRE = /* glsl */`
varying vec4 vWall; varying vec3 vWorld;
uniform float uNight; uniform float uTime;
float fh21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
float fvn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(fh21(i),fh21(i+vec2(1,0)),f.x), mix(fh21(i+vec2(0,1)),fh21(i+vec2(1,1)),f.x), f.y); }
float fbox(vec2 c, vec2 lo, vec2 hi, vec2 aa){ vec2 s = smoothstep(lo-aa, lo+aa, c)*(1.-smoothstep(hi-aa, hi+aa, c)); return s.x*s.y; }
vec3 fEmit; float fRough; float fMetal;
const int HEART[6] = int[6](0x36,0x7F,0x7F,0x3E,0x1C,0x08);
float heartAt(float wi, float fi, float ax, float ay){
  float lx = wi-ax, ly = ay-fi;
  if(lx<0.||lx>6.||ly<0.||ly>5.) return 0.;
  return float((HEART[int(ly)]>>int(lx))&1);
}
vec3 signPal(float r){
  if(r<0.16) return vec3(0.75,0.06,0.05);
  if(r<0.32) return vec3(0.05,0.2,0.6);
  if(r<0.48) return vec3(0.9,0.72,0.1);
  if(r<0.62) return vec3(0.92,0.92,0.88);
  if(r<0.78) return vec3(0.05,0.45,0.2);
  if(r<0.9) return vec3(0.9,0.35,0.1);
  return vec3(0.5,0.1,0.5);
}
`;

const FRAG_COLOR = /* glsl */`
vec3 fWallCol;
{
  vec3 base = vColor.rgb;
  float u = vWall.x, v = vWall.y, seed = vWall.z, st = vWall.w;
  float night = uNight;
  fEmit = vec3(0.); fRough = 0.9; fMetal = 0.0;
  float heartMask = 0.;
  vec3 wallc = base; float win = 0.; vec3 glass = vec3(0.045,0.075,0.11);
  if (st > 8.5 && st < 9.5) {
    float n = fvn(vec2(u,v)*0.3)*0.5 + fvn(vec2(u,v)*1.7)*0.3 + fvn(vec2(u,v)*7.)*0.2;
    wallc = base*(0.7+0.55*n);
    float tile = step(0.5, fract(u*0.5))*step(0.5, fract(v*0.5));
    wallc *= 0.96 + 0.06*tile;
    fRough = 0.9;
  } else if (st > 9.5 && st < 10.5) {
    // curtain glass crown / blue glass shaft
    float g = fvn(vec2(u*0.3, v*0.1));
    wallc = mix(vec3(0.03,0.09,0.13), vec3(0.08,0.22,0.3), g);
    win = 1.0; glass = wallc;
    float fl = step(0.93, fract(v/3.5));
    wallc = mix(wallc, vec3(0.3,0.36,0.4), fl);
    fEmit += vec3(0.1,0.3,0.42)*night*0.55*(0.4+0.6*fvn(vec2(u*0.5,v*0.2)));
    fRough = mix(0.08, 0.5, fl); fMetal = 0.6*(1.0-fl);
  } else {
    float fhgt = 3.4, ww = 3.0;
    if (st < 0.5) { fhgt = 3.3; ww = 3.3; }
    else if (st < 1.5) { fhgt = 3.8; ww = 1.8; }
    else if (st < 2.5) { fhgt = 3.4; ww = 2.0; }
    else if (st < 3.5) { fhgt = 3.5; ww = 1.5; }
    else if (st < 4.5) { fhgt = 5.0; ww = 4.0; }
    else if (st < 5.5) { fhgt = 3.0; ww = 3.2; }
    else { fhgt = 3.5; ww = 4.0; }
    float fi = floor(v/fhgt), wi = floor(u/ww);
    vec2 cell = vec2(fract(u/ww), fract(v/fhgt));
    vec2 aa = fwidth(cell)*0.9 + 1e-4;
    float rnd = fh21(vec2(fi*7.13+seed*3.1, wi*3.77+seed*1.3));
    float rnd2 = fh21(vec2(wi*1.91+seed, fi*5.31+seed*2.7));
    float litProb = 0.05 + 0.26*fh21(vec2(seed,1.3));
    float lit = step(rnd, litProb);
    vec3 warm = mix(vec3(1.0,0.72,0.38), vec3(0.8,0.9,1.0), step(0.72, rnd2));
    warm *= 0.55 + 0.9*fh21(vec2(wi+seed, fi*2.3));
    vec3 litCol = warm;

    if (st < 0.5) {                       // ---- shophouse
      if (fi < 0.5) {
        float shop = fbox(cell, vec2(0.05,0.0), vec2(0.95,0.74), aa);
        float closed = step(0.42, fh21(vec2(wi*2.3+seed*5., 3.1)));
        vec3 shut = vec3(0.34,0.35,0.36)*(0.9+0.1*step(0.5, fract(v*5.0)));
        vec3 inner = mix(vec3(0.03), vec3(0.05), rnd);
        wallc = mix(wallc, mix(inner, shut, closed), shop);
        win = 0.0;
        fEmit += (1.0-closed)*shop*mix(vec3(1.0,0.78,0.5), vec3(0.85,0.95,1.0), step(0.6,rnd2))*night*0.8*(0.5+rnd);
        // sign band
        float sb = fbox(cell, vec2(0.06,0.78), vec2(0.94,0.98), aa);
        vec3 sc = signPal(fh21(vec2(wi*0.37+seed*9., 5.5)));
        wallc = mix(wallc, sc*0.8, sb);
        fEmit += sc*sb*night*0.55;
      } else {
        win = fbox(cell, vec2(0.16,0.24), vec2(0.84,0.80), aa);
        float ac = fbox(cell, vec2(0.62,0.05), vec2(0.9,0.19), aa)*step(0.72, rnd2);
        wallc = mix(wallc, vec3(0.62), ac);
        float slab = fbox(cell, vec2(0.0,0.0), vec2(1.0,0.07), aa);
        wallc *= 1.0 - 0.25*slab + 0.1*(1.0-slab);
        // curtains/bars
        win *= 1.0 - 0.45*step(0.5, fract(u/ww*5.0))*step(0.55, rnd);
      }
    } else if (st < 1.5) {                // ---- glass office
      win = fbox(cell, vec2(0.03,0.13), vec2(0.97,0.86), aa);
      glass = mix(vec3(0.04,0.09,0.12), vec3(0.08,0.14,0.2), rnd2);
      litProb *= 0.9;
    } else if (st < 2.5) {                // ---- Lee Gardens  (cream fins, green bands, dark glass)
      float fin = fbox(cell, vec2(0.0,0.0), vec2(0.16,1.0), aa);
      float band = fbox(cell, vec2(0.0,0.60), vec2(1.0,0.97), aa);
      vec3 green = vec3(0.26,0.52,0.32)*(0.9+0.2*fvn(vec2(u*.4,v*.2)));
      win = fbox(cell, vec2(0.17,0.08), vec2(0.99,0.58), aa);
      wallc = mix(base, green, band*(1.0-fin));
      win *= (1.0-fin);
      glass = mix(vec3(0.03,0.06,0.07), vec3(0.06,0.11,0.12), rnd2);
      // lit hearts at night
      float hh = 0.;
      hh += heartAt(wi, fi, 1., 21.) + heartAt(wi, fi, 10., 22.) + heartAt(wi, fi, 5., 15.) + heartAt(wi, fi, 11., 10.) + heartAt(wi, fi, 1., 9.);
      float hm = clamp(hh,0.,1.)*step(0.5, st);
      lit = max(lit*0.5, hm); heartMask = hm;
      litCol = mix(litCol, vec3(1.0,0.62,0.55)*1.15, hm);
    } else if (st < 3.5) {                // ---- Centara  (small square windows on panels)
      win = fbox(cell, vec2(0.22,0.28), vec2(0.78,0.72), aa);
      glass = vec3(0.05,0.08,0.11);
      float rib = step(0.5, fract(u/ww*0.5));
      wallc *= 0.92 + 0.12*rib;
    } else if (st < 4.5) {                // ---- mall / podium
      win = fbox(cell, vec2(0.04,0.14), vec2(0.96,0.80), aa);
      float mull = step(0.5, fract(u/ww*2.0))*0.0;
      glass = vec3(0.05,0.09,0.12);
      if (fi < 0.5) { win *= 0.85; fEmit += vec3(1.0,0.85,0.6)*win*night*0.6*(0.6+0.8*rnd); }
    } else if (st < 5.5) {                // ---- apartments with balconies
      win = fbox(cell, vec2(0.14,0.2), vec2(0.5,0.82), aa);
      float rail = fbox(cell, vec2(0.52,0.0), vec2(0.98,0.5), aa);
      wallc = mix(wallc, wallc*0.7, rail*0.6);
      float bal = fbox(cell, vec2(0.52,0.18), vec2(0.98,0.5), aa)*step(0.5, rnd2);
      win = max(win, bal*0.9);
    } else {                              // ---- plain concrete
      win = fbox(cell, vec2(0.4,0.4), vec2(0.6,0.6), aa)*step(0.8, rnd);
    }
    // material variety: glazed wall tiles, painted render, steel window grilles, balcony rails
    float tileMode = step(0.55, fh21(vec2(seed, 9.1))) * step(st, 5.5);
    if (tileMode > 0.5) { vec2 tp = fract(vec2(u*3.3, v*6.0)); float mort = 1.0 - smoothstep(0.0, 0.07, min(min(tp.x,1.0-tp.x), min(tp.y,1.0-tp.y)));
      wallc *= 1.0 - 0.16*mort; wallc *= 0.96 + 0.08*fh21(floor(vec2(u*3.3, v*6.0)) + seed); }
    if (st < 0.5 && fi > 0.5 && fh21(vec2(seed, 4.4)) > 0.35) {
      float gl = max(step(0.88, fract((cell.x + cell.y*0.6)*7.0)), step(0.88, fract((cell.x - cell.y*0.6)*7.0)));
      float frameB = 1.0 - fbox(cell, vec2(0.19,0.27), vec2(0.81,0.77), aa);
      float grille = gl * win * (1.0 - frameB);
      wallc = mix(wallc, vec3(0.16,0.17,0.18), grille); win *= 1.0 - grille*0.9;
    }
    if (st > 4.5 && st < 5.5) { float rail = step(0.8, fract(cell.x*18.0)) * fbox(cell, vec2(0.52,0.05), vec2(0.98,0.48), aa); wallc = mix(wallc, vec3(0.2,0.22,0.24), rail*0.8);
      float railTop = fbox(cell, vec2(0.52,0.46), vec2(0.98,0.5), aa); wallc = mix(wallc, vec3(0.85,0.85,0.82), railTop); }
    // grime + weathering
    float gr = fvn(vec2(u*0.25, v*0.12))*0.5 + fvn(vec2(u*1.7, v*0.4))*0.25;
    wallc *= 0.78 + 0.45*gr;
    wallc *= 1.0 - 0.28*smoothstep(0.55, 0.0, cell.y)*step(0.55, rnd)*(1.0-win);
    wallc *= mix(0.5, 1.0, smoothstep(0.0, 4.5, v));
    fEmit += wallc*0.05*night*smoothstep(9.0, 0.0, v);
    // lit windows
    float litWin = win * lit;
    // interior read-through: ceiling-light gradient, furniture band, side curtains, occasional TV flicker
    float inside = mix(0.45, 1.0, smoothstep(0.15, 0.85, cell.y));
    inside *= 1.0 - 0.55*smoothstep(0.42, 0.3, cell.y)*step(0.35, rnd2);
    float cur = step(0.6, fh21(vec2(wi+seed*3., fi+7.)));
    inside *= 1.0 - 0.6*cur*(smoothstep(0.32, 0.2, abs(cell.x-0.5)*-1.0+0.5));
    float tv = step(0.93, rnd2) * (0.75 + 0.25*sin(uTime*7.0 + rnd*40.0));
    vec3 lc = mix(litCol, vec3(0.55,0.7,1.0), tv*0.6);
    fEmit += lc * litWin * night * inside * (0.85 + 1.6*heartMask);
    fRough = mix(mix(0.88, 0.42, tileMode), 0.07, win);
    fMetal = win*0.55;
    if (st < 0.5 && fi < 0.5) { fRough = 0.8; fMetal = 0.0; }
  }
  diffuseColor.rgb = mix(wallc, glass, win);
}
`;

// ------------------------------------------------------------------
//  Geometry batch (indexed, per-quad vertices)
// ------------------------------------------------------------------
const _v2 = (p) => new THREE.Vector2(p[0], p[1]);
export class Batch {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.wall = []; this.idx = []; this.n = 0; this.cx = 0; this.cz = 0; }
  _push(p, n, c, w) { this.pos.push(p[0], p[1], p[2]); this.nor.push(n[0], n[1], n[2]); this.col.push(c.r, c.g, c.b); this.wall.push(w[0], w[1], w[2], w[3]); return this.n++; }
  quad(p0, p1, p2, p3, n, c, w0, w1, w2, w3) {
    const a = this._push(p0, n, c, w0), b = this._push(p1, n, c, w1), cc = this._push(p2, n, c, w2), d = this._push(p3, n, c, w3);
    // winding check against desired normal
    const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] >= 0) this.idx.push(a, b, cc, a, cc, d); else this.idx.push(a, cc, b, a, d, cc);
  }
  tri(p0, p1, p2, n, c, w0, w1, w2) {
    const a = this._push(p0, n, c, w0), b = this._push(p1, n, c, w1), cc = this._push(p2, n, c, w2);
    const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] >= 0) this.idx.push(a, b, cc); else this.idx.push(a, cc, b);
  }
  // extruded polygon. pts = [[x,z]...] (open ring)
  prism(pts, y0, h, o = {}) {
    if (y0 < 2 && h >= 2.4 && o.collide !== false) FOOTPRINTS.push(pts);
    const c = o.color || new THREE.Color(0.7, 0.7, 0.7), seed = o.seed ?? 0.5, style = o.style ?? 0;
    const rc = o.roofColor || new THREE.Color(0.35, 0.35, 0.36);
    const N = pts.length; let A = 0;
    for (let i = 0; i < N; i++) { const a = pts[i], b = pts[(i + 1) % N]; A += a[0] * b[1] - b[0] * a[1]; }
    const sg = A >= 0 ? 1 : -1;
    let u = o.uOff || 0;
    const y1 = y0 + h, vo = o.vOff || 0;
    for (let i = 0; i < N; i++) {
      const a = pts[i], b = pts[(i + 1) % N];
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 0.01) continue;
      const n = sg > 0 ? [dz / L, 0, -dx / L] : [-dz / L, 0, dx / L];
      const st = (o.styleFn ? o.styleFn(i, n) : style);
      this.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], n, c,
        [u, vo, seed, st], [u + L, vo, seed, st], [u + L, vo + h, seed, st], [u, vo + h, seed, st]);
      u = o.resetU ? 0 : u + L;
    }
    if (o.roof !== false) {
      const idx = THREE.ShapeUtils.triangulateShape(pts.map(_v2), []);
      for (const t of idx) {
        const p = t.map(k => pts[k]);
        this.tri([p[0][0], y1, p[0][1]], [p[1][0], y1, p[1][1]], [p[2][0], y1, p[2][1]], [0, 1, 0], rc,
          [p[0][0], p[0][1], seed, 9], [p[1][0], p[1][1], seed, 9], [p[2][0], p[2][1], seed, 9]);
      }
    }
  }
  box(cx, cz, w, d, rot, y0, h, o = {}) {
    const cs = Math.cos(rot), sn = Math.sin(rot), hw = w / 2, hd = d / 2;
    const P = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([a, b]) => [cx + a * cs - b * sn, cz + a * sn + b * cs]);
    this.prism(P, y0, h, o);
  }
  // hip/gable roof over rotated rect
  gable(cx, cz, w, d, rot, y0, rh, color, seed = 0.3, overhang = 0.5) {
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const T = (a, b) => [cx + a * cs - b * sn, cz + a * sn + b * cs];
    const hw = w / 2 + overhang, hd = d / 2 + overhang;
    const A = T(-hw, -hd), B = T(hw, -hd), C = T(hw, hd), D = T(-hw, hd), R0 = T(-hw, 0), R1 = T(hw, 0);
    const y1 = y0 + rh, W = (p, s) => [p[0], p[1], seed, 9];
    const nA = (p, q, r) => { // face normal
      const e1 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], e2 = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
      let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]; const l = Math.hypot(...n) || 1; n = n.map(x => x / l); if (n[1] < 0) n = n.map(x => -x); return n;
    };
    const p = (q, y) => [q[0], y, q[1]];
    // two sloped planes
    let n1 = nA(p(A, y0), p(B, y0), p(R1, y1)); this.quad(p(A, y0), p(B, y0), p(R1, y1), p(R0, y1), n1, color, W(A), W(B), W(R1), W(R0));
    let n2 = nA(p(C, y0), p(D, y0), p(R0, y1)); this.quad(p(C, y0), p(D, y0), p(R0, y1), p(R1, y1), n2, color, W(C), W(D), W(R0), W(R1));
    const gc = new THREE.Color(0.8, 0.78, 0.7);
    this.tri(p(B, y0), p(C, y0), p(R1, y1), [cs, 0, sn], gc, W(B), W(C), W(R1));
    this.tri(p(D, y0), p(A, y0), p(R0, y1), [-cs, 0, -sn], gc, W(D), W(A), W(R0));
  }
  // cylinder-like prism for round towers
  cyl(cx, cz, r, y0, h, seg, o = {}) {
    const pts = []; for (let i = 0; i < seg; i++) { const a = i / seg * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
    this.prism(pts, y0, h, o);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aWall', new THREE.Float32BufferAttribute(this.wall, 4));
    g.setIndex(this.n > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}
export class BatchSet {
  constructor(size = 450) { this.size = size; this.map = new Map(); }
  at(x, z) {
    const k = Math.floor(x / this.size) + ',' + Math.floor(z / this.size);
    let b = this.map.get(k); if (!b) { b = new Batch(); b.cx = (Math.floor(x / this.size) + 0.5) * this.size; b.cz = (Math.floor(z / this.size) + 0.5) * this.size; this.map.set(k, b); }
    return b;
  }
  meshes(material, shadowFn) {
    const out = [];
    for (const b of this.map.values()) {
      if (!b.n) continue;
      const m = new THREE.Mesh(b.geometry(), material);
      const sh = shadowFn ? shadowFn(b) : false; m.castShadow = sh; m.receiveShadow = sh;
      out.push(m);
    }
    return out;
  }
}
