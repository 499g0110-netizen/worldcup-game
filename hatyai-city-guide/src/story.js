// =====================================================================
//  Story films – animated Thai paper-cut / watercolour vignettes for each place.
//  Pure Canvas2D: layered cut-paper shapes with drop shadows, parallax camera,
//  day → dusk → night progression, characters that walk / row / ride.
// =====================================================================
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t, clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; };
function rng(s) { return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// time of day palettes: 0 dawn, .33 noon, .62 sunset, 1 night
const SKY = [
  [0.00, '#f6c9a8', '#f3a6a0', '#8d7fb8'], [0.33, '#cfe8f3', '#8ec5e6', '#4f8fc9'],
  [0.62, '#ffc078', '#f07a7a', '#6a3d8a'], [1.00, '#2a2350', '#18183a', '#0a0b1e']];
function skyAt(t) { let i = 0; while (i < SKY.length - 2 && t > SKY[i + 1][0]) i++; const a = SKY[i], b = SKY[i + 1], k = sm(a[0], b[0], t); return [mix(a[1], b[1], k), mix(a[2], b[2], k), mix(a[3], b[3], k)]; }
const shade = (c, n) => mix(c, '#0b0b22', n); // darken toward night ink

export class StoryPlayer {
  constructor(root) {
    this.root = root; this.cv = root.querySelector('canvas'); this.g = this.cv.getContext('2d');
    this.style = 'paper'; this.t = 0; this.playing = false; this.story = null; this.dur = 26;
    this.grain = document.createElement('canvas'); this.grain.width = this.grain.height = 256;
    const gg = this.grain.getContext('2d'), id = gg.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) { const v = 200 + Math.random() * 55; id.data[i] = v; id.data[i + 1] = v - 6; id.data[i + 2] = v - 18; id.data[i + 3] = 255; }
    gg.putImageData(id, 0, 0); this.grainPat = null;
    root.querySelector('.st-close').onclick = () => this.close();
    root.querySelector('.st-play').onclick = () => { this.playing = !this.playing; if (this.t >= this.dur) this.t = 0; };
    root.querySelector('.st-style').onclick = (e) => { this.style = this.style === 'paper' ? 'water' : 'paper'; e.target.textContent = this.style === 'paper' ? '風格：剪紙' : '風格：水彩'; };
    this.sub = root.querySelector('.st-sub'); this.ttl = root.querySelector('.st-title');
    this._resize = () => { const r = this.cv.getBoundingClientRect(); this.cv.width = Math.round(r.width * Math.min(2, devicePixelRatio)); this.cv.height = Math.round(r.height * Math.min(2, devicePixelRatio)); };
    addEventListener('resize', this._resize);
  }
  open(id) {
    this.story = STORIES[id] || STORIES.street; this.t = 0; this.playing = true; this.root.classList.add('on'); this._resize();
    this.ttl.innerHTML = `<b>${this.story.title}</b><small>${this.story.th}</small>`; this.lastLine = -1;
    const loop = (now) => { if (!this.root.classList.contains('on')) return; const dt = Math.min(0.05, (now - (this.prev || now)) / 1000); this.prev = now; if (this.playing) this.t = Math.min(this.dur, this.t + dt); this.draw(); requestAnimationFrame(loop); };
    this.prev = 0; requestAnimationFrame(loop);
  }
  close() { this.root.classList.remove('on'); this.playing = false; }
  // ---------------- drawing primitives ----------------
  shape(path, fill, depth = 1) {
    const g = this.g, s = this.S;
    if (this.style === 'paper') {
      g.save(); g.shadowColor = 'rgba(20,10,30,0.38)'; g.shadowBlur = 6 * s * depth; g.shadowOffsetX = 2.2 * s * depth; g.shadowOffsetY = 3.2 * s * depth;
      g.fillStyle = fill; g.beginPath(); path(g); g.fill(); g.restore();
      g.save(); g.beginPath(); path(g); g.clip(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.22; g.fillStyle = this.grainPat; g.fillRect(0, 0, this.W, this.H); g.restore();
    } else {
      g.save(); g.globalAlpha = 0.55; g.fillStyle = fill; g.filter = `blur(${2.2 * s}px)`;
      g.beginPath(); g.translate(1.5 * s, 1 * s); path(g); g.fill(); g.setTransform(1, 0, 0, 1, 0, 0); g.filter = 'none';
      g.globalAlpha = 0.8; g.beginPath(); path(g); g.fill();
      g.globalAlpha = 0.25; g.strokeStyle = shade(fill.startsWith('#') ? fill : '#777777', 0.5); g.lineWidth = 2.2 * s; g.stroke(); g.restore();
    }
  }
  draw() {
    const g = this.g, W = this.cv.width, H = this.cv.height; this.W = W; this.H = H; this.S = H / 720;
    if (!this.grainPat) this.grainPat = g.createPattern(this.grain, 'repeat');
    const st = this.story, u = this.t / this.dur, tod = lerp(st.tod[0], st.tod[1], sm(0.05, 0.95, u));
    const [top, midc, low] = skyAt(tod);
    const night = sm(0.62, 1, tod), dusk = sm(0.4, 0.62, tod) * (1 - night);
    // sky
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, low); gr.addColorStop(0.55, midc); gr.addColorStop(1, top);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // stars
    if (night > 0.05) { const r = rng(5); g.fillStyle = `rgba(255,250,230,${0.8 * night})`; for (let i = 0; i < 120; i++) { const x = r() * W, y = r() * H * 0.5, tw = 0.6 + 0.4 * Math.sin(this.t * 2 + i); g.fillRect(x, y, 1.6 * this.S * tw, 1.6 * this.S * tw); } }
    // sun / moon arc
    const sx = W * lerp(0.15, 0.85, sm(0, 0.62, tod)), sy = H * (0.62 - Math.sin(Math.PI * clamp(tod / 0.62, 0, 1)) * 0.42);
    if (tod < 0.66) { this.shape(p => p.arc(sx, sy, 46 * this.S, 0, TAU), mix('#fff4c2', '#ff8a4a', sm(0.3, 0.62, tod)), 0.4); }
    else { const mx = W * 0.78, my = H * 0.2; this.shape(p => { p.arc(mx, my, 34 * this.S, 0, TAU); }, '#f6f0d8', 0.4); g.fillStyle = low; g.beginPath(); g.arc(mx + 14 * this.S, my - 8 * this.S, 30 * this.S, 0, TAU); g.fill(); }
    // camera
    const cam = { x: lerp(st.pan[0], st.pan[1], easeIO(u)), zoom: lerp(1, st.zoom || 1.06, easeIO(u)) };
    const ctx = { g, W, H, S: this.S, t: this.t, u, tod, night, dusk, cam, P: this, ink: (c, k = 1) => shade(c, night * 0.72 * k) };
    g.save(); g.translate(W / 2, H / 2); g.scale(cam.zoom, cam.zoom); g.translate(-W / 2, -H / 2);
    st.draw(ctx);
    g.restore();
    // Thai kranok frame
    drawFrame(ctx);
    if (this.style === 'paper') { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.16; g.fillStyle = this.grainPat; g.fillRect(0, 0, W, H); g.restore(); }
    // vignette
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,5,20,0.45)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    // subtitles
    const li = Math.min(st.lines.length - 1, Math.floor(u * st.lines.length));
    if (li !== this.lastLine) { this.lastLine = li; this.sub.classList.remove('in'); void this.sub.offsetWidth; this.sub.textContent = st.lines[li]; this.sub.classList.add('in'); }
    this.root.querySelector('.st-bar i').style.width = (u * 100) + '%';
  }
}
const easeIO = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ---------------- reusable scene pieces ----------------
function hills(c, y, amp, col, seed, par = 0.2, depth = 1) {
  const { W, H, S, cam } = c; const off = -cam.x * W * par;
  c.P.shape(p => { p.moveTo(-W * 0.2, H); for (let x = -W * 0.2; x <= W * 1.2; x += 20 * S) { const k = (x + off) / W; p.lineTo(x, H * y - amp * H * (0.5 + 0.5 * Math.sin(k * 7 + seed) * Math.sin(k * 3.1 + seed * 2))); } p.lineTo(W * 1.2, H); p.closePath(); }, c.ink(col), depth);
}
function palm(c, x, y, h, col = '#2f6b3a') {
  const { S, t } = c; const sw = Math.sin(t * 1.2 + x) * 0.05;
  c.P.shape(p => { p.moveTo(x - 4 * S, y); p.quadraticCurveTo(x + 10 * S, y - h * 0.5, x + 6 * S + sw * 40 * S, y - h); p.lineTo(x + 12 * S + sw * 40 * S, y - h); p.quadraticCurveTo(x + 18 * S, y - h * 0.5, x + 6 * S, y); p.closePath(); }, c.ink('#6b4a2a'), 1.2);
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.48 + sw; const tx = x + 9 * S + sw * 40 * S, ty = y - h;
    c.P.shape(p => { p.moveTo(tx, ty); p.quadraticCurveTo(tx + Math.cos(a - 0.4) * 50 * S, ty + Math.sin(a - 0.4) * 40 * S - 10 * S, tx + Math.cos(a) * 90 * S, ty + Math.sin(a) * 60 * S + 30 * S); p.quadraticCurveTo(tx + Math.cos(a + 0.3) * 45 * S, ty + Math.sin(a + 0.3) * 35 * S, tx, ty); }, c.ink(col), 1.2); }
}
function chedi(c, x, y, h, col = '#e2b24a') {
  const { S } = c; const w = h * 0.32;
  c.P.shape(p => { p.moveTo(x - w, y); p.lineTo(x + w, y); p.lineTo(x + w * 0.8, y - h * 0.12); p.quadraticCurveTo(x + w * 0.95, y - h * 0.45, x + w * 0.15, y - h * 0.58); p.lineTo(x + w * 0.05, y - h); p.lineTo(x - w * 0.05, y - h); p.lineTo(x - w * 0.15, y - h * 0.58); p.quadraticCurveTo(x - w * 0.95, y - h * 0.45, x - w * 0.8, y - h * 0.12); p.closePath(); }, c.ink(col, 0.6), 1.4);
}
function templeRoof(c, x, y, w, col = '#c8452a') {
  const { S } = c;
  for (let k = 0; k < 3; k++) { const ww = w * (1 - k * 0.22), yy = y - k * w * 0.16;
    c.P.shape(p => { p.moveTo(x - ww / 2, yy); p.lineTo(x, yy - w * 0.3); p.lineTo(x + ww / 2, yy); p.quadraticCurveTo(x + ww / 2 + 14 * S, yy - 4 * S, x + ww / 2 + 18 * S, yy - 16 * S); p.lineTo(x + ww / 2 + 4 * S, yy + 2 * S); p.lineTo(x - ww / 2 - 4 * S, yy + 2 * S); p.lineTo(x - ww / 2 - 18 * S, yy - 16 * S); p.quadraticCurveTo(x - ww / 2 - 14 * S, yy - 4 * S, x - ww / 2, yy); p.closePath(); }, c.ink(k % 2 ? '#e0a020' : col), 1.3); }
}
function water(c, y, cols, par = 1) {
  const { W, H, S, t, cam } = c;
  cols.forEach((col, i) => { const yy = H * y + i * 22 * S, ph = t * (0.6 + i * 0.25) - cam.x * par * 3;
    c.P.shape(p => { p.moveTo(-W * 0.2, H); p.lineTo(-W * 0.2, yy); for (let x = -W * 0.2; x <= W * 1.2; x += 14 * S) p.lineTo(x, yy + Math.sin(x / (38 * S) + ph + i) * 5 * S); p.lineTo(W * 1.2, H); p.closePath(); }, c.ink(col), 0.6); });
  // reflections & glints
  const g = c.g; g.save(); g.globalAlpha = 0.25 + 0.35 * c.night; g.strokeStyle = c.night > 0.4 ? '#ffd27a' : '#ffffff'; g.lineWidth = 2 * S;
  for (let i = 0; i < 30; i++) { const x = (i * 137 % 1000) / 1000 * W + Math.sin(t + i) * 10 * S, yy = H * y + 20 * S + (i * 53 % 100) / 100 * H * (1 - y) * 0.8; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + (18 + i % 5 * 6) * S, yy); g.stroke(); } g.restore();
}
function person(c, x, y, s, col, walk = 1, phase = 0, hat = false) {
  const { S, t } = c; const k = s * S, a = Math.sin(t * 6 * walk + phase) * 0.5 * walk;
  const ink = c.ink(col, 0.8), skin = c.ink('#c98f66', 0.8), pants = c.ink('#2b3550', 0.9);
  c.P.shape(p => { p.moveTo(x, y - 44 * k); p.lineTo(x + Math.sin(a) * 16 * k - 4 * k, y); p.lineTo(x + Math.sin(a) * 16 * k + 2 * k, y); p.lineTo(x + 4 * k, y - 40 * k); p.closePath(); }, pants, 0.8);
  c.P.shape(p => { p.moveTo(x, y - 44 * k); p.lineTo(x - Math.sin(a) * 16 * k - 2 * k, y); p.lineTo(x - Math.sin(a) * 16 * k + 4 * k, y); p.lineTo(x + 4 * k, y - 40 * k); p.closePath(); }, pants, 0.8);
  c.P.shape(p => { p.moveTo(x - 9 * k, y - 44 * k); p.lineTo(x + 9 * k, y - 44 * k); p.lineTo(x + 8 * k, y - 76 * k); p.lineTo(x - 8 * k, y - 76 * k); p.closePath(); }, ink, 0.9);
  c.P.shape(p => { p.moveTo(x + 6 * k, y - 74 * k); p.lineTo(x + 6 * k + Math.sin(-a) * 14 * k, y - 50 * k); p.lineTo(x + 10 * k + Math.sin(-a) * 14 * k, y - 50 * k); p.closePath(); }, skin, 0.7);
  c.P.shape(p => p.arc(x, y - 86 * k, 9 * k, 0, TAU), skin, 0.8);
  c.P.shape(p => { p.arc(x, y - 89 * k, 9.5 * k, Math.PI, TAU); }, c.ink('#1a1512'), 0.6);
  if (hat) c.P.shape(p => { p.moveTo(x - 20 * k, y - 88 * k); p.lineTo(x, y - 104 * k); p.lineTo(x + 20 * k, y - 88 * k); p.closePath(); }, c.ink('#d8bb7a'), 0.9);
}
function longtail(c, x, y, col, s = 1, rower = true) {
  const { S, t } = c; const k = s * S, bob = Math.sin(t * 1.6 + x * 0.01) * 3 * k;
  c.P.shape(p => { p.moveTo(x - 110 * k, y - 18 * k + bob); p.quadraticCurveTo(x - 60 * k, y + 10 * k + bob, x + 60 * k, y + 8 * k + bob); p.quadraticCurveTo(x + 105 * k, y + 4 * k + bob, x + 118 * k, y - 26 * k + bob); p.lineTo(x + 100 * k, y - 8 * k + bob); p.lineTo(x - 96 * k, y - 8 * k + bob); p.closePath(); }, c.ink(col), 1.1);
  c.P.shape(p => { p.rect(x - 70 * k, y - 10 * k + bob, 140 * k, 5 * k); }, c.ink('#f2e6c8'), 0.5);
  if (rower) {
    const a = Math.sin(t * 2.4 + x) * 0.6;
    person(c, x - 60 * k, y - 6 * k + bob, s * 0.85, '#3a5a8a', 0, 0, true);
    const ox = x - 50 * k, oy = y - 60 * k + bob;
    c.P.shape(p => { p.moveTo(ox, oy); p.lineTo(ox - 70 * k + Math.sin(a) * 50 * k, y + 22 * k); p.lineTo(ox - 64 * k + Math.sin(a) * 50 * k, y + 24 * k); p.lineTo(ox + 4 * k, oy); p.closePath(); }, c.ink('#6b4a2a'), 0.6);
    // ripple rings
    const g = c.g; g.save(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5 * S; for (let i = 0; i < 3; i++) { const r = ((t * 0.8 + i / 3) % 1); g.globalAlpha = (1 - r) * 0.6; g.beginPath(); g.ellipse(ox - 66 * k, y + 24 * k, 10 * k + r * 60 * k, 3 * k + r * 12 * k, 0, 0, TAU); g.stroke(); } g.restore();
  }
}
function umbrella(c, x, y, r, col) { const { S } = c; c.P.shape(p => { p.moveTo(x - r, y); p.quadraticCurveTo(x, y - r * 0.9, x + r, y); p.closePath(); }, c.ink(col), 1); c.P.shape(p => p.rect(x - 1.5 * S, y, 3 * S, r * 0.9), c.ink('#5a4a3a'), 0.5); }
function lanterns(c, x0, x1, y, n, col = '#e8402a') {
  const { S, t, g } = c; g.save(); g.strokeStyle = c.ink('#2a2020'); g.lineWidth = 1.2 * S; g.beginPath(); g.moveTo(x0, y); g.quadraticCurveTo((x0 + x1) / 2, y + 30 * S, x1, y); g.stroke(); g.restore();
  for (let i = 1; i < n; i++) { const k = i / n, x = lerp(x0, x1, k), yy = y + Math.sin(k * Math.PI) * 30 * S * 0.5 * 2 * (1 - Math.abs(0.5 - k)) + 8 * S, sw = Math.sin(t * 1.5 + i) * 3 * S;
    if (c.night > 0.1) { const gl = g.createRadialGradient(x + sw, yy + 10 * S, 0, x + sw, yy + 10 * S, 40 * S); gl.addColorStop(0, `rgba(255,170,80,${0.5 * c.night})`); gl.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gl; g.fillRect(x - 40 * S, yy - 30 * S, 80 * S, 80 * S); }
    c.P.shape(p => { p.ellipse(x + sw, yy + 10 * S, 8 * S, 11 * S, 0, 0, TAU); }, c.night > 0.3 ? '#ff7a3a' : c.ink(col), 0.5); }
}
function stall(c, x, y, w, col1, col2) {
  const { S } = c; const h = w * 0.55;
  c.P.shape(p => p.rect(x - w / 2, y - h * 0.5, w, h * 0.5), c.ink('#6b4a2a'), 1);
  for (let i = 0; i < 6; i++) c.P.shape(p => { const x0 = x - w / 2 - 6 * S + i * (w + 12 * S) / 6; p.moveTo(x0, y - h * 1.25); p.lineTo(x0 + (w + 12 * S) / 6, y - h * 1.25); p.lineTo(x0 + (w + 12 * S) / 6 + 4 * S, y - h); p.lineTo(x0 - 4 * S, y - h); p.closePath(); }, c.ink(i % 2 ? col1 : col2), 1.1);
  c.P.shape(p => { p.rect(x - w / 2 + 3 * S, y - h, 3 * S, h * 0.5); p.rect(x + w / 2 - 6 * S, y - h, 3 * S, h * 0.5); }, c.ink('#444'), 0.4);
  if (c.night > 0.2) { const g = c.g, gl = g.createRadialGradient(x, y - h * 0.8, 0, x, y - h * 0.8, w); gl.addColorStop(0, `rgba(255,190,100,${0.55 * c.night})`); gl.addColorStop(1, 'rgba(255,150,60,0)'); g.fillStyle = gl; g.fillRect(x - w, y - h * 1.8, w * 2, w * 1.6); }
}
function tuktuk(c, x, y, col, s = 1) {
  const { S, t } = c; const k = s * S, rot = t * 6;
  c.P.shape(p => { p.moveTo(x - 60 * k, y - 18 * k); p.lineTo(x + 30 * k, y - 18 * k); p.lineTo(x + 52 * k, y - 40 * k); p.lineTo(x + 52 * k, y - 18 * k); p.lineTo(x + 60 * k, y - 18 * k); p.lineTo(x + 60 * k, y - 8 * k); p.lineTo(x - 64 * k, y - 8 * k); p.closePath(); }, c.ink(col), 1.1);
  c.P.shape(p => { p.moveTo(x - 66 * k, y - 78 * k); p.quadraticCurveTo(x - 10 * k, y - 90 * k, x + 46 * k, y - 76 * k); p.lineTo(x + 46 * k, y - 70 * k); p.lineTo(x - 66 * k, y - 70 * k); p.closePath(); }, c.ink('#f2c314'), 1.1);
  c.P.shape(p => { p.rect(x - 62 * k, y - 72 * k, 4 * k, 56 * k); p.rect(x + 40 * k, y - 72 * k, 4 * k, 34 * k); }, c.ink('#333'), 0.5);
  person(c, x + 20 * k, y - 18 * k, s * 0.62, '#e8e2d0', 0); person(c, x - 34 * k, y - 18 * k, s * 0.6, '#c8402a', 0);
  for (const wx of [-40, 44]) { c.P.shape(p => p.arc(x + wx * k, y - 6 * k, 11 * k, 0, TAU), '#1b1b1d', 0.6); const g = c.g; g.save(); g.strokeStyle = '#888'; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(x + wx * k + Math.cos(rot) * 8 * k, y - 6 * k + Math.sin(rot) * 8 * k); g.lineTo(x + wx * k - Math.cos(rot) * 8 * k, y - 6 * k - Math.sin(rot) * 8 * k); g.stroke(); g.restore(); }
  if (c.night > 0.2) headlight(c, x + 62 * k, y - 22 * k);
}
function car(c, x, y, col, s = 1, roofSign = null) {
  const { S } = c; const k = s * S;
  c.P.shape(p => { p.moveTo(x - 80 * k, y - 12 * k); p.lineTo(x - 78 * k, y - 34 * k); p.lineTo(x - 40 * k, y - 38 * k); p.lineTo(x - 20 * k, y - 62 * k); p.lineTo(x + 34 * k, y - 62 * k); p.lineTo(x + 58 * k, y - 38 * k); p.lineTo(x + 82 * k, y - 32 * k); p.lineTo(x + 84 * k, y - 12 * k); p.closePath(); }, c.ink(col), 1.1);
  c.P.shape(p => { p.moveTo(x - 14 * k, y - 57 * k); p.lineTo(x + 30 * k, y - 57 * k); p.lineTo(x + 48 * k, y - 39 * k); p.lineTo(x - 30 * k, y - 39 * k); p.closePath(); }, c.ink('#2a3442'), 0.5);
  if (roofSign) { c.P.shape(p => p.rect(x - 4 * k, y - 74 * k, 30 * k, 12 * k), roofSign, 0.6); }
  for (const wx of [-50, 54]) c.P.shape(p => p.arc(x + wx * k, y - 10 * k, 14 * k, 0, TAU), '#18181a', 0.6);
  if (c.night > 0.2) headlight(c, x + 84 * k, y - 26 * k);
}
function moto(c, x, y, col, s = 1, grab = false) {
  const { S, t } = c; const k = s * S;
  for (const wx of [-26, 28]) c.P.shape(p => p.arc(x + wx * k, y - 11 * k, 11 * k, 0, TAU), '#18181a', 0.6);
  c.P.shape(p => { p.moveTo(x - 34 * k, y - 22 * k); p.lineTo(x + 20 * k, y - 22 * k); p.lineTo(x + 34 * k, y - 44 * k); p.lineTo(x + 26 * k, y - 46 * k); p.lineTo(x + 8 * k, y - 30 * k); p.lineTo(x - 30 * k, y - 34 * k); p.closePath(); }, c.ink(col), 1);
  person(c, x - 6 * k, y - 22 * k, s * 0.62, grab ? '#00b14f' : '#3a4a6a', 0);
  if (grab) { c.P.shape(p => p.rect(x - 46 * k, y - 64 * k, 26 * k, 24 * k), '#00b14f', 0.8); c.g.save(); c.g.fillStyle = '#fff'; c.g.font = `bold ${9 * k}px sans-serif`; c.g.fillText('Grab', x - 44 * k, y - 49 * k); c.g.restore(); }
  c.P.shape(p => p.arc(x - 6 * k, y - 81 * k, 7 * k, Math.PI, TAU), grab ? '#00b14f' : c.ink('#c8302a'), 0.6);
  if (c.night > 0.2) headlight(c, x + 34 * k, y - 34 * k);
}
function headlight(c, x, y) { const g = c.g, S = c.S; const gl = g.createRadialGradient(x, y, 0, x, y, 60 * S); gl.addColorStop(0, `rgba(255,240,200,${0.8 * c.night})`); gl.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gl; g.fillRect(x - 60 * S, y - 60 * S, 120 * S, 120 * S); }
function building(c, x, y, w, h, col, winLit = 0.4, seed = 1, hearts = false) {
  const { S, g } = c; c.P.shape(p => p.rect(x, y - h, w, h), c.ink(col), 1.2); const r = rng(seed);
  const cw = 14 * S, ch = 18 * S; const nx = Math.floor((w - 10 * S) / cw), ny = Math.floor((h - 20 * S) / ch);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const wx = x + 8 * S + i * cw, wy = y - h + 10 * S + j * ch; let lit = r() < winLit * c.night;
    if (hearts) { const hx = i - Math.floor(nx / 2) + 3, hy = j - 3; const H = [0x36, 0x7F, 0x7F, 0x3E, 0x1C, 0x08]; if (hx >= 0 && hx < 7 && hy >= 0 && hy < 6 && (H[hy] >> hx) & 1) lit = c.night > 0.15; }
    g.fillStyle = lit ? '#ffd890' : c.ink('#38485a', 0.5); g.fillRect(wx, wy, cw * 0.62, ch * 0.6);
  }
}
function drawFrame(c) {
  const { g, W, H, S } = c; const gold = c.P.style === 'paper' ? '#c9a03a' : 'rgba(201,160,58,0.75)'; const b = 16 * S;
  g.save(); g.fillStyle = '#1b0f14'; g.fillRect(0, 0, W, b); g.fillRect(0, H - b, W, b);
  g.fillStyle = gold; for (let x = 0; x < W; x += 34 * S) { for (const y of [b, H - b]) { const d = y < H / 2 ? 1 : -1; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10 * S, y + d * 14 * S, x + 17 * S, y + d * 4 * S); g.quadraticCurveTo(x + 24 * S, y + d * 16 * S, x + 34 * S, y); g.closePath(); g.fill(); } }
  g.restore();
}

// =====================================================================
//  Stories
// =====================================================================
export const STORIES = {
  floating: { title: 'Khlong Hae 水上市場', th: 'ตลาดน้ำคลองแห', tod: [0.4, 0.95], pan: [-0.04, 0.05], zoom: 1.08,
    lines: ['午後，船伕戴著斗笠，把一船船的小吃划進運河。', '夕陽把水面染成粉紅，船槳一推一盪，波紋一圈圈散開。', '木棧道掛起旗串與燈籠，人群沿著河岸慢慢走。', '天黑了，燈火映在水裡 —— 這是合艾人的傍晚。'],
    draw(c) { const { W, H, S, t } = c;
      hills(c, 0.5, 0.06, '#6a6a9a', 1, 0.05, 0.4); for (let i = 0; i < 9; i++) palm(c, (i * 0.13 - 0.05) * W - c.cam.x * W * 0.15, H * 0.56, (150 + (i % 3) * 30) * S, '#2b5a34');
      chedi(c, W * 0.22 - c.cam.x * W * 0.1, H * 0.5, 150 * S); templeRoof(c, W * 0.36 - c.cam.x * W * 0.1, H * 0.53, 120 * S);
      water(c, 0.58, ['#3c6c8a', '#2f5a78', '#264b66', '#1d3c55']);
      [['#c8281e', 0.1], ['#1f8a4c', 0.42], ['#e8a31d', 0.75]].forEach(([col, k], i) => longtail(c, ((k + t * 0.012 * (i % 2 ? 1 : -1)) % 1.2) * W, H * (0.7 + i * 0.07), col, 0.9 + i * 0.15));
      c.P.shape(p => p.rect(W * 0.55, H * 0.6, W * 0.6, 14 * S), c.ink('#7a5a3a'), 1.2);
      for (let i = 0; i < 6; i++) stall(c, W * (0.6 + i * 0.08), H * 0.6, 70 * S, '#c8281e', '#f2f2ec');
      lanterns(c, W * 0.52, W * 1.05, H * 0.42, 14);
      for (let i = 0; i < 9; i++) person(c, ((W * (0.56 + i * 0.06) + t * 14 * S * (i % 2 ? 1 : -1)) % (W * 0.5)) + W * 0.55, H * 0.6, 0.8, ['#c8402a', '#2a62c8', '#f0b020', '#e0e0e0', '#1f8a4c'][i % 5], 1, i, i % 3 === 0);
      umbrella(c, W * 0.42, H * 0.64, 40 * S, '#1d5fb8'); umbrella(c, W * 0.78, H * 0.72, 44 * S, '#e8742a');
    } },
  street: { title: '城市街頭', th: 'ถนนในหาดใหญ่', tod: [0.3, 0.92], pan: [0, 0.06],
    lines: ['合艾的街道從清晨就醒著：騎樓下開店、機車穿梭。', '嘟嘟車載著遊客，綠色的 Grab 騎士一台接一台。', '黃昏時，計程車的燈牌亮起，招牌一盞盞點亮。', '夜裡，電線與招牌交織，城市換上另一張臉。'],
    draw(c) { const { W, H, S, t } = c;
      const cols = ['#e8dcc0', '#d9b9a5', '#c4d0cf', '#e3d5a1', '#bdb8a8', '#d8c9a8'];
      for (let i = 0; i < 9; i++) building(c, (i * 0.12 - 0.04) * W - c.cam.x * W * 0.3, H * 0.66, 0.115 * W, (200 + (i * 37 % 120)) * S, cols[i % 6], 0.5, i + 3);
      for (let i = 0; i < 9; i++) { const x = (i * 0.12 + 0.02) * W - c.cam.x * W * 0.3; c.P.shape(p => p.rect(x, H * 0.66 - 70 * S, 0.09 * W, 22 * S), c.ink(['#c8281e', '#1d5fb8', '#f0b020', '#1f8a4c'][i % 4]), 0.6); }
      const g = c.g; g.save(); g.strokeStyle = c.ink('#1a1a1a'); g.lineWidth = 1.4 * S; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(0, H * (0.32 + k * 0.02)); g.quadraticCurveTo(W * 0.5, H * (0.38 + k * 0.02), W, H * (0.3 + k * 0.025)); g.stroke(); } g.restore();
      c.P.shape(p => p.rect(0, H * 0.66, W, H * 0.34), c.ink('#4a4a50'), 0.4);
      g.save(); g.fillStyle = c.ink('#d8d8d0'); for (let x = -((t * 120 * S) % (120 * S)); x < W; x += 120 * S) g.fillRect(x, H * 0.82, 60 * S, 5 * S); g.restore();
      const lane = (y, items, v) => items.forEach((f, i) => { const x = ((i * W * 0.42 + t * v * S) % (W * 1.6)) - W * 0.3; f(x, y); });
      lane(H * 0.78, [(x, y) => tuktuk(c, x, y, '#2a62c8', 1), (x, y) => moto(c, x, y, '#c0302a', 1, true), (x, y) => car(c, x, y, '#f2c314', 1, '#f2c314')], 90);
      lane(H * 0.93, [(x, y) => moto(c, x, y, '#2a50a0', 1.2, true), (x, y) => car(c, x, y, '#00b14f', 1.2, '#00b14f'), (x, y) => moto(c, x, y, '#e8c030', 1.2), (x, y) => tuktuk(c, x, y, '#e8402a', 1.2)], 140);
      for (let i = 0; i < 8; i++) person(c, ((i * 170 * S + t * 22 * S * (i % 2 ? 1 : -1)) % (W * 1.1) + W * 1.1) % (W * 1.1), H * 0.68, 0.9, ['#c8402a', '#2a62c8', '#f0b020', '#e0e0e0', '#1f8a4c'][i % 5], 1, i);
    } },
  lee: { title: 'Lee Gardens 夜市', th: 'ตลาดโต้รุ่ง · ลีการ์เด้นส์', tod: [0.55, 1.0], pan: [-0.03, 0.04], zoom: 1.1,
    lines: ['傍晚，李花園的高樓映著紫色天空。', '天一黑，攤販推著推車湧到廣場，帆布棚一頂頂撐開。', '烤肉、炒麵、椰子冰……燈串下人潮擠得水洩不通。', '抬頭看 —— 酒店的窗光排成了一顆顆愛心。'],
    draw(c) { const { W, H, S, t } = c;
      for (let i = 0; i < 6; i++) building(c, (i * 0.18 - 0.05) * W - c.cam.x * W * 0.1, H * 0.62, 0.15 * W, (180 + i * 30 % 90) * S, '#8a7fa0', 0.35, i + 20);
      building(c, W * 0.42 - c.cam.x * W * 0.15, H * 0.62, W * 0.2, H * 0.56, '#e9e5d6', 0.15, 7, true);
      c.P.shape(p => p.rect(W * 0.38 - c.cam.x * W * 0.15, H * 0.56, W * 0.28, H * 0.06), c.ink('#d9d0ba'), 1.2);
      const g = c.g; g.save(); g.fillStyle = c.ink('#2f6a40'); for (let k = 0; k < 14; k++) g.fillRect(W * 0.42 - c.cam.x * W * 0.15, H * 0.62 - H * 0.56 + k * H * 0.038 + 4 * S, W * 0.2, 3 * S); g.restore();
      c.P.shape(p => p.rect(0, H * 0.7, W, H * 0.3), c.ink('#5a5a62'), 0.3);
      const open = sm(0.62, 0.8, c.tod);
      for (let i = 0; i < 8; i++) { const x = W * (0.06 + i * 0.12) + (1 - open) * (i % 2 ? 1 : -1) * W * 0.5; stall(c, x, H * 0.78, 110 * S, ['#c8281e', '#1d5fb8', '#e8a31d', '#1f8a4c'][i % 4], '#f2f2ec'); }
      lanterns(c, 0, W, H * 0.5, 22);
      for (let i = 0; i < 16; i++) person(c, ((i * 97 * S + t * 18 * S * (i % 2 ? 1 : -1)) % W + W) % W, H * (0.86 + (i % 3) * 0.04), 1 + (i % 3) * 0.12, ['#c8402a', '#2a62c8', '#f0b020', '#e0e0e0', '#1f8a4c', '#7a2d9a'][i % 6], 1, i);
    } },
  kimyong: { title: '金永市場 Kim Yong', th: 'ตลาดกิมหยง', tod: [0.2, 0.7], pan: [0, 0.05],
    lines: ['金永市場的早晨：堆成小山的乾貨、堅果與香料。', '老闆娘用泰語、華語、馬來語招呼客人。', '午後的陽光從鐵皮屋頂的縫隙灑進來。', '傍晚收攤前，最後一批遊客提著大包小包離開。'],
    draw(c) { const { W, H, S, t } = c;
      for (let i = 0; i < 7; i++) building(c, (i * 0.15 - 0.03) * W - c.cam.x * W * 0.2, H * 0.6, 0.14 * W, (220 + (i * 41 % 80)) * S, ['#e8dcc0', '#d9b9a5', '#c4d0cf'][i % 3], 0.4, i + 40);
      c.P.shape(p => { p.moveTo(-10, H * 0.42); p.lineTo(W + 10, H * 0.38); p.lineTo(W + 10, H * 0.46); p.lineTo(-10, H * 0.5); p.closePath(); }, c.ink('#8a9aa4'), 1.3);
      c.P.shape(p => p.rect(0, H * 0.72, W, H * 0.28), c.ink('#6a6460'), 0.3);
      for (let i = 0; i < 6; i++) { const x = W * (0.05 + i * 0.16); stall(c, x + 50 * S, H * 0.76, 140 * S, ['#1d5fb8', '#c8281e', '#e8a31d'][i % 3], '#f2f2ec');
        for (let k = 0; k < 5; k++) c.P.shape(p => p.arc(x + k * 22 * S, H * 0.76 - 52 * S, 12 * S, Math.PI, TAU), c.ink(['#a0522d', '#d2a050', '#8b3a1a', '#e8c070', '#6b8e23'][k]), 0.6); }
      for (let i = 0; i < 12; i++) person(c, ((i * 120 * S + t * 16 * S * (i % 2 ? 1 : -1)) % W + W) % W, H * (0.88 + (i % 2) * 0.05), 1.05, ['#c8402a', '#2a62c8', '#f0b020', '#e0e0e0', '#1f8a4c'][i % 5], 1, i, i % 4 === 0);
    } },
  buddha: { title: '帕普塔蒙空瑪哈拉大佛', th: 'พระพุทธมงคลมหาราช', tod: [0.15, 0.75], pan: [0, 0.03], zoom: 1.12,
    lines: ['清晨的山頂公園，霧氣還沒散去。', '纜車緩緩爬上山坡，金色的大佛在晨光中出現。', '從山頂俯瞰，整片合艾平原在腳下展開。', '日落時，大佛被夕照染成金紅色。'],
    draw(c) { const { W, H, S, t } = c;
      hills(c, 0.62, 0.12, '#7a8ab0', 3, 0.05, 0.5); hills(c, 0.75, 0.1, '#3f6a4a', 5, 0.1, 1);
      const bx = W * 0.5, by = H * 0.6;
      if (c.night < 0.9) { const g = c.g, gl = g.createRadialGradient(bx, by - 220 * S, 0, bx, by - 220 * S, 260 * S); gl.addColorStop(0, 'rgba(255,230,160,0.45)'); gl.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gl; g.fillRect(bx - 260 * S, by - 480 * S, 520 * S, 520 * S); }
      c.P.shape(p => { p.moveTo(bx - 160 * S, by); p.lineTo(bx + 160 * S, by); p.lineTo(bx + 130 * S, by - 30 * S); p.lineTo(bx - 130 * S, by - 30 * S); p.closePath(); }, c.ink('#f0ece0'), 1.4);
      c.P.shape(p => { p.ellipse(bx, by - 60 * S, 130 * S, 40 * S, 0, 0, TAU); }, c.ink('#e0b44a', 0.4), 1.5);
      c.P.shape(p => { p.ellipse(bx, by - 150 * S, 70 * S, 100 * S, 0, 0, TAU); }, c.ink('#e6bb52', 0.4), 1.5);
      c.P.shape(p => p.arc(bx, by - 270 * S, 34 * S, 0, TAU), c.ink('#e6bb52', 0.4), 1.5);
      c.P.shape(p => { p.moveTo(bx - 14 * S, by - 300 * S); p.lineTo(bx, by - 345 * S); p.lineTo(bx + 14 * S, by - 300 * S); p.closePath(); }, c.ink('#e6bb52', 0.4), 1.2);
      const g = c.g; g.save(); g.strokeStyle = 'rgba(255,240,190,0.8)'; g.lineWidth = 4 * S; g.beginPath(); g.arc(bx, by - 272 * S, 52 * S, 0, TAU); g.stroke(); g.restore();
      // cable car
      g.save(); g.strokeStyle = c.ink('#2a2a2a'); g.lineWidth = 1.5 * S; g.beginPath(); g.moveTo(-10, H * 0.82); g.lineTo(W * 0.8, H * 0.5); g.stroke(); g.restore();
      const k = (t * 0.03) % 1, cx = lerp(-10, W * 0.8, k), cy = lerp(H * 0.82, H * 0.5, k);
      c.P.shape(p => p.rect(cx - 22 * S, cy + 14 * S, 44 * S, 34 * S), c.ink('#d0302a'), 1); c.P.shape(p => p.rect(cx - 1 * S, cy, 2 * S, 14 * S), '#333', 0.3);
      for (let i = 0; i < 8; i++) palm(c, (i * 0.14) * W, H * 0.98, (120 + i % 3 * 40) * S, '#24513a');
    } },
  airport: { title: '合艾國際機場', th: 'ท่าอากาศยานนานาชาติหาดใหญ่', tod: [0.6, 1.0], pan: [0, 0.08],
    lines: ['黃昏，航廈的燈亮起，旅客拖著行李箱進出。', '跑道兩側的燈一排排點亮。', '客機加速、抬頭、離地。', '飛機轉向，窗外是合艾的萬家燈火。'],
    draw(c) { const { W, H, S, t, g } = c;
      hills(c, 0.6, 0.06, '#5a5a8a', 9, 0.05, 0.4);
      c.P.shape(p => { p.rect(W * 0.05, H * 0.5, W * 0.5, H * 0.1); }, c.ink('#dcdad2'), 1.2);
      c.P.shape(p => { p.moveTo(W * 0.03, H * 0.5); p.quadraticCurveTo(W * 0.3, H * 0.42, W * 0.57, H * 0.5); p.closePath(); }, c.ink('#a7a8a5'), 1.2);
      g.save(); g.fillStyle = c.night > 0.3 ? '#ffd890' : c.ink('#38485a'); for (let i = 0; i < 18; i++) g.fillRect(W * 0.07 + i * W * 0.026, H * 0.53, W * 0.018, H * 0.04); g.restore();
      c.P.shape(p => p.rect(0, H * 0.62, W, H * 0.38), c.ink('#3f6a2a'), 0.3);
      c.P.shape(p => { p.moveTo(-10, H * 0.9); p.lineTo(W + 10, H * 0.72); p.lineTo(W + 10, H * 0.78); p.lineTo(-10, H * 1.0); p.closePath(); }, c.ink('#3a3a3d'), 0.4);
      for (let i = 0; i < 24; i++) { const k = i / 24, x = k * W, y = lerp(H * 0.9, H * 0.72, k) - 4 * S; g.fillStyle = `rgba(255,240,200,${0.3 + 0.7 * c.night})`; g.beginPath(); g.arc(x, y, 3 * S, 0, TAU); g.fill(); g.beginPath(); g.arc(x, y + 30 * S * (1 - k * 0.4), 3 * S, 0, TAU); g.fill(); }
      const u = c.u, k = clamp((u - 0.2) / 0.7, 0, 1), px = lerp(-0.1, 1.15, k * k) * W, py = lerp(H * 0.86, H * 0.74, k) - Math.max(0, k - 0.55) * H * 0.9, ang = -0.2 - Math.max(0, k - 0.55) * 0.5;
      g.save(); g.translate(px, py); g.rotate(ang);
      c.P.shape(p => { p.moveTo(-90 * S, 0); p.quadraticCurveTo(-60 * S, -14 * S, 90 * S, -10 * S); p.quadraticCurveTo(108 * S, 0, 90 * S, 6 * S); p.lineTo(-90 * S, 6 * S); p.closePath(); }, '#f2f2f0', 1.2);
      c.P.shape(p => { p.moveTo(-80 * S, -4 * S); p.lineTo(-96 * S, -46 * S); p.lineTo(-70 * S, -46 * S); p.lineTo(-50 * S, -6 * S); p.closePath(); }, '#e6342a', 1);
      c.P.shape(p => { p.moveTo(-10 * S, 0); p.lineTo(-40 * S, 30 * S); p.lineTo(-20 * S, 30 * S); p.lineTo(30 * S, 0); p.closePath(); }, '#d8d8d4', 1);
      g.restore();
      if (c.night > 0.3) { g.fillStyle = `rgba(255,60,40,${(Math.sin(t * 6) > 0.6) ? 1 : 0})`; g.beginPath(); g.arc(px, py - 12 * S, 4 * S, 0, TAU); g.fill(); }
    } },
};
export const STORY_FOR = { intro: 'street', lee: 'lee', nightmarket: 'lee', porkleg: 'lee', street: 'street', citystreet: 'street', kimyong: 'kimyong', station: 'street', clock: 'street', greenway: 'lee', central: 'street', floating: 'floating', park: 'buddha', airport: 'airport', outro: 'airport' };
