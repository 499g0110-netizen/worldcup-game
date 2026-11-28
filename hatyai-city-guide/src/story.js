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
    this.music = new ThaiMusic(); this.muted = false;
    root.querySelector('.st-close').onclick = () => this.close();
    const mb = root.querySelector('.st-mute'); if (mb) mb.onclick = () => { this.muted = !this.muted; mb.textContent = this.muted ? '♪ 開啟音樂' : '♪ 關閉音樂'; if (this.muted) this.music.stop(); else this.music.start(this.story.mood); };
    root.querySelector('.st-play').onclick = () => { if (this.t >= this.dur) { this.t = 0; this.lastLine = -1; } this.playing = !this.playing; if (this.playing && !this.muted) this.music.start(this.story.mood || {}); else this.music.stop(); };
    root.querySelector('.st-style').onclick = (e) => { this.style = this.style === 'paper' ? 'water' : 'paper'; e.target.textContent = this.style === 'paper' ? '風格：剪紙' : '風格：水彩'; };
    this.sub = root.querySelector('.st-sub'); this.ttl = root.querySelector('.st-title');
    this._resize = () => { const r = this.cv.getBoundingClientRect(); this.cv.width = Math.round(r.width * Math.min(2, devicePixelRatio)); this.cv.height = Math.round(r.height * Math.min(2, devicePixelRatio)); };
    addEventListener('resize', this._resize);
  }
  open(id) {
    this.story = STORIES[id] || STORIES.street; this.t = 0; this.playing = true; this.root.classList.add('on'); this._resize();
    if (!this.muted) this.music.start(this.story.mood || {});
    this.ttl.innerHTML = `<b>${this.story.title}</b><small>${this.story.th}</small>`; this.lastLine = -1;
    const loop = (now) => { if (!this.root.classList.contains('on')) return; const dt = Math.min(0.05, (now - (this.prev || now)) / 1000); this.prev = now; if (this.playing) { this.t = this.t + dt; if (this.t >= this.dur) { this.t = this.dur; this.playing = false; this.music.stop(); } } this.draw(); requestAnimationFrame(loop); };
    this.prev = 0; requestAnimationFrame(loop);
  }
  close() { this.root.classList.remove('on'); this.playing = false; this.music.stop(); }
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

// =====================================================================
//  Procedural Thai-style score (ranat xylophone, khim, ching cymbal, thon drum, drone)
//  Generated live with WebAudio, so it needs no files and plays offline.
//  iOS: WebAudio obeys the ringer switch unless an <audio> element is playing, so a
//  silent looping clip is started on the same tap to put the page into playback mode.
// =====================================================================
let AC = null, unlockEl = null;
function silentWav() {
  const n = 4000, b = new Uint8Array(44 + n * 2), v = new DataView(b.buffer); const w = (o, s) => [...s].forEach((ch, i) => b[o + i] = ch.charCodeAt(0));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  let s = ''; b.forEach(x => s += String.fromCharCode(x)); return 'data:audio/wav;base64,' + btoa(s);
}
export function audioUnlock() {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state !== 'running') AC.resume();
    if (!unlockEl) { unlockEl = new Audio(silentWav()); unlockEl.loop = true; unlockEl.setAttribute('playsinline', ''); }
    const p = unlockEl.play(); if (p && p.catch) p.catch(() => {});
    // a one-sample buffer on the gesture also unlocks older Safari
    const bs = AC.createBufferSource(); bs.buffer = AC.createBuffer(1, 1, 22050); bs.connect(AC.destination); bs.start(0);
  } catch (e) {}
  return AC;
}
export class ThaiMusic {
  constructor() { this.on = false; }
  start(mood = {}) {
    const ac = audioUnlock(); if (!ac) return; this.stop(); this.on = true;
    const root = mood.root || 293.66, bpm = mood.bpm || 96, seed = mood.seed || 7, scale = mood.scale || [0, 2, 4, 7, 9];
    let s = seed; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const out = ac.createGain(); out.gain.value = 0; out.gain.linearRampToValueAtTime(0.55, ac.currentTime + 1.5);
    const comp = ac.createDynamicsCompressor(); out.connect(comp); comp.connect(ac.destination); this.out = out;
    const rev = ac.createConvolver(); const len = ac.sampleRate * 1.6, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    rev.buffer = ir; const wet = ac.createGain(); wet.gain.value = 0.28; rev.connect(wet); wet.connect(out);
    const note = (deg, oct = 0) => root * Math.pow(2, (scale[((deg % 5) + 5) % 5] + 12 * (oct + Math.floor(deg / 5))) / 12);
    const ranat = (t, f, v = 0.22) => { for (const [m, g] of [[1, 1], [3.98, 0.25], [9.1, 0.08]]) { if (f * m > 18000) continue; const o = ac.createOscillator(), e = ac.createGain(); o.type = 'sine'; o.frequency.value = f * m; e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(v * g, t + 0.005); e.gain.exponentialRampToValueAtTime(0.0008, t + 0.5 / Math.sqrt(m)); o.connect(e); e.connect(out); e.connect(rev); o.start(t); o.stop(t + 0.6); } };
    const khim = (t, f, d) => { const o = ac.createOscillator(), e = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; lfo.frequency.value = 11; lg.gain.value = 0.05; lfo.connect(lg); lg.connect(e.gain);
      e.gain.setValueAtTime(0.07, t); e.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(e); e.connect(out); e.connect(rev); o.start(t); lfo.start(t); o.stop(t + d); lfo.stop(t + d); };
    const noise = ac.createBuffer(1, ac.sampleRate * 0.4, ac.sampleRate); { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const ching = (t, open) => { const n = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain(); n.buffer = noise; f.type = 'bandpass'; f.frequency.value = 7200; f.Q.value = 6; e.gain.setValueAtTime(open ? 0.18 : 0.09, t); e.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.35 : 0.06)); n.connect(f); f.connect(e); e.connect(out); n.start(t); n.stop(t + 0.4); };
    const thon = (t, f = 110) => { const o = ac.createOscillator(), e = ac.createGain(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.18); e.gain.setValueAtTime(0.35, t); e.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(e); e.connect(out); o.start(t); o.stop(t + 0.32); };
    // drone
    const drone = []; for (const f of [root / 2, root * 0.75]) { const o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 520; g.gain.value = 0.035; o.connect(lp); lp.connect(g); g.connect(out); o.start(); drone.push(o); }
    this.drone = drone;
    // composed phrase (4 bars of eighths) with variation; repeated as a looping tune
    const phrase = []; let d = 5; for (let i = 0; i < 32; i++) { d += Math.round((r() - 0.5) * 3); d = Math.max(2, Math.min(11, d)); phrase.push(r() < 0.15 ? null : d); }
    const beat = 60 / bpm; let step = 0; this.next = ac.currentTime + 0.15;
    this.timer = setInterval(() => {
      while (this.next < ac.currentTime + 0.35) {
        const t = this.next, i = step % 32, bar = Math.floor(step / 32);
        const dg = phrase[i]; if (dg !== null) ranat(t, note(dg + (bar % 2 && i > 16 ? 1 : 0), 1));
        if (i % 2 === 0 && r() < 0.6) ranat(t, note((dg ?? 5) - 5, 1), 0.1);
        if (i % 8 === 0) khim(t, note(phrase[i] ?? 5, 0), beat * 3.5);
        if (i % 4 === 2) ching(t, true); else if (i % 4 === 0) ching(t, false);
        if (i % 8 === 0 || i % 8 === 3 || (i % 8 === 6 && r() < 0.5)) thon(t, i % 8 === 0 ? 92 : 128);
        this.next += beat / 2; step++;
      }
    }, 90);
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; if (this.out && AC) { const g = this.out; g.gain.cancelScheduledValues(AC.currentTime); g.gain.setTargetAtTime(0, AC.currentTime, 0.3); setTimeout(() => g.disconnect(), 1500); } (this.drone || []).forEach(o => { try { o.stop(AC.currentTime + 1.2); } catch (e) {} }); this.drone = null; this.on = false; }
}

// ---------------- more pieces for the history / culture films ----------------
function train(c, x, y, s = 1) {
  const { S, t } = c; const k = s * S;
  c.P.shape(p => { p.moveTo(x - 10 * k, y - 20 * k); p.lineTo(x + 120 * k, y - 20 * k); p.lineTo(x + 140 * k, y - 50 * k); p.lineTo(x + 140 * k, y - 85 * k); p.lineTo(x + 60 * k, y - 85 * k); p.lineTo(x + 60 * k, y - 110 * k); p.lineTo(x + 20 * k, y - 110 * k); p.lineTo(x + 20 * k, y - 85 * k); p.lineTo(x - 10 * k, y - 85 * k); p.closePath(); }, c.ink('#2a2a2e'), 1.2);
  c.P.shape(p => p.rect(x + 95 * k, y - 80 * k, 30 * k, 22 * k), c.night > 0.3 ? '#ffd890' : c.ink('#8ab0c8'), 0.5);
  for (let i = 0; i < 3; i++) { const ox = x - 10 * k - (i + 1) * 150 * k; c.P.shape(p => p.rect(ox, y - 80 * k, 140 * k, 60 * k), c.ink(i % 2 ? '#7a2a1a' : '#8a3a22'), 1.1); for (let w = 0; w < 5; w++) c.P.shape(p => p.rect(ox + 10 * k + w * 26 * k, y - 70 * k, 18 * k, 16 * k), c.night > 0.3 ? '#ffd890' : c.ink('#c8b090'), 0.3); }
  for (let i = -3; i < 4; i++) c.P.shape(p => p.arc(x + i * 45 * k, y - 12 * k, 12 * k, 0, TAU), '#18181a', 0.5);
  for (let i = 0; i < 5; i++) { const ph = (t * 0.6 + i * 0.2) % 1; c.P.shape(p => p.arc(x + 40 * k - ph * 160 * k, y - 120 * k - ph * 90 * k, (12 + ph * 30) * k, 0, TAU), `rgba(240,240,240,${0.55 * (1 - ph)})`, 0.2); }
}
function shophouseRow(c, y, n, scale = 1) {
  const { W, S } = c; const cols = ['#e8c34a', '#4a9ad0', '#e8844a', '#8ac8a0', '#e89ab8', '#a08ad0', '#5ab8b0'];
  const w = W / n * 1.02;
  for (let i = 0; i < n; i++) { const x = i * W / n - c.cam.x * W * 0.25, h = (230 + (i * 47 % 60)) * S * scale, col = cols[i % cols.length];
    c.P.shape(p => { p.rect(x, y - h, w, h); p.moveTo(x + w * 0.2, y - h); p.quadraticCurveTo(x + w * 0.5, y - h - 70 * S * scale, x + w * 0.8, y - h); }, c.ink(col), 1.2);
    for (let k = 0; k < 3; k++) { const wx = x + w * (0.15 + k * 0.27), wy = y - h + 40 * S * scale; c.P.shape(p => { p.rect(wx, wy + 18 * S, w * 0.16, 50 * S * scale); p.arc(wx + w * 0.08, wy + 18 * S, w * 0.08, Math.PI, 0); }, c.night > 0.4 && (i + k) % 3 === 0 ? '#ffd890' : c.ink(k % 2 ? '#2a6a4a' : '#c8902a'), 0.5); }
    c.P.shape(p => { p.moveTo(x + w * 0.1, y); p.lineTo(x + w * 0.1, y - 90 * S * scale); p.quadraticCurveTo(x + w * 0.5, y - 140 * S * scale, x + w * 0.9, y - 90 * S * scale); p.lineTo(x + w * 0.9, y); p.closePath(); }, c.ink('#2a2420'), 0.4);
  }
}
function bowl(c, x, y, r) { const { S, t } = c; c.P.shape(p => { p.moveTo(x - r, y - r * 0.2); p.quadraticCurveTo(x, y + r * 0.9, x + r, y - r * 0.2); p.closePath(); }, c.ink('#e8e2d0'), 1); c.P.shape(p => p.ellipse(x, y - r * 0.2, r * 0.95, r * 0.25, 0, 0, TAU), c.ink('#7a2a12'), 0.5);
  for (let i = 0; i < 3; i++) { const ph = (t * 0.5 + i / 3) % 1; const g = c.g; g.save(); g.globalAlpha = 0.5 * (1 - ph); g.strokeStyle = '#ffffff'; g.lineWidth = 3 * S; g.beginPath(); g.moveTo(x - r * 0.3 + i * r * 0.3, y - r * 0.4); g.bezierCurveTo(x - r * 0.5 + i * r * 0.3, y - r * (0.8 + ph), x + i * r * 0.2, y - r * (1.0 + ph), x - r * 0.2 + i * r * 0.3, y - r * (1.4 + ph)); g.stroke(); g.restore(); } }
function standingBuddha(c, x, y, h) {
  const { S } = c; const k = h / 300;
  c.P.shape(p => { p.rect(x - 70 * k, y - 40 * k, 140 * k, 40 * k); p.rect(x - 50 * k, y - 70 * k, 100 * k, 30 * k); }, c.ink('#8e8f8c'), 1.4);
  c.P.shape(p => { p.ellipse(x, y - 78 * k, 46 * k, 10 * k, 0, 0, TAU); }, c.ink('#e0b040', 0.4), 1.2);
  c.P.shape(p => { p.moveTo(x - 30 * k, y - 80 * k); p.quadraticCurveTo(x - 24 * k, y - 170 * k, x - 34 * k, y - 230 * k); p.lineTo(x - 18 * k, y - 262 * k); p.lineTo(x + 18 * k, y - 262 * k); p.lineTo(x + 34 * k, y - 230 * k); p.quadraticCurveTo(x + 24 * k, y - 170 * k, x + 30 * k, y - 80 * k); p.closePath(); }, c.ink('#e6bb52', 0.4), 1.5);
  c.P.shape(p => { p.moveTo(x + 30 * k, y - 230 * k); p.lineTo(x + 40 * k, y - 190 * k); p.lineTo(x + 30 * k, y - 160 * k); p.lineTo(x + 22 * k, y - 160 * k); p.lineTo(x + 30 * k, y - 195 * k); p.closePath(); }, c.ink('#d8aa40', 0.4), 1.2);
  c.P.shape(p => { p.moveTo(x - 32 * k, y - 228 * k); p.lineTo(x - 38 * k, y - 160 * k); p.lineTo(x - 30 * k, y - 130 * k); p.lineTo(x - 24 * k, y - 160 * k); p.closePath(); }, c.ink('#d8aa40', 0.4), 1.2);
  c.P.shape(p => p.ellipse(x, y - 280 * k, 15 * k, 19 * k, 0, 0, TAU), c.ink('#e6bb52', 0.4), 1.3);
  c.P.shape(p => { p.moveTo(x - 6 * k, y - 296 * k); p.lineTo(x, y - 326 * k); p.lineTo(x + 6 * k, y - 296 * k); p.closePath(); }, c.ink('#e6bb52', 0.4), 1);
}
function ganesha(c, x, y, h) {
  const { S } = c; const k = h / 260, pk = c.ink('#e8a0a8', 0.5), gd = c.ink('#e0b040', 0.4);
  c.P.shape(p => { p.ellipse(x, y - 20 * k, 110 * k, 24 * k, 0, 0, TAU); }, c.ink('#f2efe6'), 1.3);
  c.P.shape(p => p.ellipse(x, y - 60 * k, 90 * k, 40 * k, 0, 0, TAU), pk, 1.3);
  c.P.shape(p => p.ellipse(x, y - 115 * k, 62 * k, 58 * k, 0, 0, TAU), pk, 1.4);
  for (const s of [-1, 1]) { c.P.shape(p => p.ellipse(x + s * 62 * k, y - 190 * k, 30 * k, 44 * k, s * 0.2, 0, TAU), pk, 1.2); c.P.shape(p => p.arc(x + s * 95 * k, y - 150 * k, 14 * k, 0, TAU), gd, 0.8); c.P.shape(p => p.arc(x + s * 80 * k, y - 95 * k, 12 * k, 0, TAU), gd, 0.8); }
  c.P.shape(p => p.ellipse(x, y - 190 * k, 40 * k, 44 * k, 0, 0, TAU), pk, 1.4);
  c.P.shape(p => { p.moveTo(x - 10 * k, y - 175 * k); p.quadraticCurveTo(x - 14 * k, y - 120 * k, x + 18 * k, y - 112 * k); p.quadraticCurveTo(x + 26 * k, y - 118 * k, x + 14 * k, y - 124 * k); p.quadraticCurveTo(x + 4 * k, y - 140 * k, x + 10 * k, y - 175 * k); p.closePath(); }, pk, 1.1);
  c.P.shape(p => { for (let i = 0; i < 5; i++) p.rect(x - (26 - i * 4) * k, y - (238 + i * 14) * k, (52 - i * 8) * k, 13 * k); }, gd, 1.1);
  const g = c.g; g.save(); g.strokeStyle = 'rgba(255,220,140,.85)'; g.lineWidth = 5 * S; g.beginPath(); g.arc(x, y - 190 * k, 78 * k, 0, TAU); g.stroke(); g.restore();
}
function tent(c, x, y, w, h) { const { S } = c; c.P.shape(p => { p.moveTo(x - w / 2, y); p.lineTo(x - w / 2, y - h * 0.55); p.quadraticCurveTo(x, y - h * 1.3, x + w / 2, y - h * 0.55); p.lineTo(x + w / 2, y); p.closePath(); }, c.night > 0.4 ? '#fff1d8' : c.ink('#f4f2ee'), 1.3);
  c.P.shape(p => p.rect(x - w * 0.42, y - h * 0.5, w * 0.84, h * 0.5), c.ink('#3a2a2a', 0.6), 0.5);
  const g = c.g; g.save(); g.fillStyle = '#1e6a5a'; g.font = `bold ${h * 0.14}px system-ui`; g.textAlign = 'center'; g.fillText('Greenway', x, y - h * 0.78); g.fillStyle = '#d33a5a'; g.font = `bold italic ${h * 0.16}px system-ui`; g.fillText('Street Life', x, y - h * 0.6); g.restore(); }

Object.assign(STORIES, {
  history: { title: '合艾的誕生：鐵道小鎮', th: 'ประวัติหาดใหญ่', tod: [0.2, 0.75], pan: [0, 0.06], mood: { root: 261.6, bpm: 84, seed: 11 },
    lines: ['二十世紀初，南線鐵路通到這片平原，火車站周圍開始聚集人潮。', '華人移民在車站旁蓋起店屋，街道一條條延伸出去，今天的尼帕烏提路就是那時的骨架。', '泰人、華人與馬來穆斯林在這裡做生意、通婚、比鄰而居。', '鐵路帶來了商機，一個小站就這樣長成了南泰國的商貿重鎮。'],
    draw(c) { const { W, H, S, t } = c; hills(c, 0.55, 0.05, '#7a8ab0', 4, 0.05, 0.4); shophouseRow(c, H * 0.66, 7, 0.9);
      c.P.shape(p => p.rect(0, H * 0.66, W, H * 0.34), c.ink('#6a6460'), 0.3); c.P.shape(p => { p.rect(0, H * 0.84, W, 6 * S); p.rect(0, H * 0.87, W, 6 * S); }, c.ink('#3a3a3a'), 0.3);
      train(c, ((t * 60 * S) % (W * 1.8)) - W * 0.3, H * 0.85, 1.1);
      for (let i = 0; i < 6; i++) person(c, ((i * 190 * S + t * 15 * S * (i % 2 ? 1 : -1)) % W + W) % W, H * 0.72, 0.95, ['#e0e0e0', '#2a62c8', '#c8402a', '#f0b020'][i % 4], 1, i, i % 3 === 0); } },
  oldtown: { title: '彩色騎樓老街', th: 'ตึกแถวชิโน-โปรตุกีส', tod: [0.15, 0.85], pan: [0, 0.08], mood: { root: 293.7, bpm: 92, seed: 21 },
    lines: ['南泰的中葡式（Sino-Portuguese）騎樓：拱窗、百葉、山花與粉彩外牆。', '一樓是店，樓上是家，騎樓下的走廊替行人遮陽擋雨。', '褪色的油漆與糾結的電線，是小鎮慢慢生活的痕跡。', '傍晚，鐵捲門拉起又放下，嘟嘟車和機車從門口經過。'],
    draw(c) { const { W, H, S, t } = c; shophouseRow(c, H * 0.74, 6, 1.25);
      const g = c.g; g.save(); g.strokeStyle = c.ink('#1a1a1a'); g.lineWidth = 1.4 * S; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(0, H * (0.2 + k * 0.015)); g.quadraticCurveTo(W * 0.5, H * (0.28 + k * 0.015), W, H * (0.18 + k * 0.02)); g.stroke(); } g.restore();
      c.P.shape(p => p.rect(0, H * 0.74, W, H * 0.26), c.ink('#4a4a50'), 0.3);
      const lane = (y, items, v) => items.forEach((f, i) => { const x = ((i * W * 0.5 + t * v * S) % (W * 1.6)) - W * 0.3; f(x, y); });
      lane(H * 0.9, [(x, y) => tuktuk(c, x, y, '#e8402a', 1), (x, y) => moto(c, x, y, '#2a50a0', 1.1, true), (x, y) => car(c, x, y, '#c9ccd1', 1)], 80);
      for (let i = 0; i < 5; i++) person(c, ((i * 230 * S + t * 18 * S) % W + W) % W, H * 0.77, 0.95, ['#e0e0e0', '#2a62c8', '#c8402a'][i % 3], 1, i); } },
  food: { title: '船麵與豬腳飯', th: 'ก๋วยเตี๋ยวเรือ · ข้าวขาหมู', tod: [0.5, 1.0], pan: [0, 0.03], zoom: 1.1, mood: { root: 329.6, bpm: 104, seed: 31 },
    lines: ['船麵：碗小、湯濃，一碗幾口就吃完，大家一疊一疊地點。', '它源自泰國中部運河上的小船攤販，後來上了岸，船形的攤位還留著。', '夜市裡另一個排隊名物是滷得軟嫩的豬腳飯，配酸菜和辣醋。', '合艾的吃，一半在店裡，一半在路邊。'],
    draw(c) { const { W, H, S, t } = c; shophouseRow(c, H * 0.6, 5, 0.9); c.P.shape(p => p.rect(0, H * 0.6, W, H * 0.4), c.ink('#5a5048'), 0.3);
      longtail(c, W * 0.3, H * 0.74, '#a33a1a', 1.1, false); for (const dx of [-40, 10, 60]) c.P.shape(p => p.ellipse(W * 0.3 + dx * S, H * 0.7, 22 * S, 10 * S, 0, 0, TAU), c.ink('#c0c4c8'), 0.6);
      for (let i = 0; i < 7; i++) bowl(c, W * (0.55 + (i % 4) * 0.1), H * (0.8 + Math.floor(i / 4) * 0.08) - (i % 4 === 3 ? 0 : 0), 34 * S);
      c.P.shape(p => p.rect(W * 0.52, H * 0.84, W * 0.44, 10 * S), c.ink('#8a5a36'), 0.6);
      lanterns(c, 0, W, H * 0.4, 16); for (let i = 0; i < 5; i++) person(c, W * (0.1 + i * 0.09), H * 0.95, 1.1, ['#c8402a', '#2a62c8', '#f0b020', '#1f8a4c', '#e0e0e0'][i], 0.2, i); } },
  greenway: { title: 'Greenway 夜市', th: 'กรีนเวย์ สตรีทไลฟ์', tod: [0.6, 1.0], pan: [-0.02, 0.04], zoom: 1.08, mood: { root: 349.2, bpm: 112, seed: 41 },
    lines: ['傍晚，白色拱頂帳篷亮起燈，Greenway 夜市開張了。', '衣服、玩具、手機殼、紀念品，一攤接一攤。', '隔壁的 Food Station 飄出烤肉和炒河粉的香味。', '在地人和觀光客一起逛到深夜，這是合艾的夜生活。'],
    draw(c) { const { W, H, S, t } = c; c.P.shape(p => p.rect(0, H * 0.72, W, H * 0.28), c.ink('#4a4a50'), 0.3); tent(c, W * 0.42, H * 0.74, W * 0.62, H * 0.5);
      for (let i = 0; i < 6; i++) stall(c, W * (0.18 + i * 0.096), H * 0.74, 60 * S, ['#d33a5a', '#2a7ad0', '#e8a31d', '#1f8a4c'][i % 4], '#f2f2ec');
      c.P.shape(p => p.rect(W * 0.78, H * 0.38, W * 0.2, H * 0.34), c.ink('#2a2c30'), 1.2); for (let i = 0; i < 10; i++) c.P.shape(p => p.rect(W * 0.785 + i * W * 0.019, H * 0.4, 5 * S, H * 0.14), c.ink('#9a6a3a'), 0.3);
      const g = c.g; g.save(); g.font = `bold ${22 * S}px system-ui`; g.fillStyle = '#7dffc8'; g.fillText('FOOD STATION', W * 0.79, H * 0.6); g.restore(); lanterns(c, W * 0.77, W, H * 0.62, 6);
      for (let i = 0; i < 14; i++) person(c, ((i * 110 * S + t * 16 * S * (i % 2 ? 1 : -1)) % W + W) % W, H * (0.86 + (i % 3) * 0.04), 1 + (i % 3) * 0.1, ['#c8402a', '#2a62c8', '#f0b020', '#e0e0e0', '#1f8a4c', '#7a2d9a'][i % 6], 1, i); } },
  elephant: { title: '大象神廟', th: 'พระพิฆเนศ · เขาคอหงส์', tod: [0.3, 0.7], pan: [0, 0.03], zoom: 1.1, mood: { root: 246.9, bpm: 76, seed: 51 },
    lines: ['從大佛旁搭上紅色纜車，越過整片樹林往更高的山頂。', '山頂坐著巨大的象頭神，泰國人稱祂為帕必卡內（Phra Phikanet）。', '祂是排除障礙、守護藝術與事業的神，香客帶著萬壽菊花環前來祈願。', '回頭望，合艾的屋頂在山腳下鋪成一片。'],
    draw(c) { const { W, H, S, t } = c; hills(c, 0.7, 0.14, '#3f6a4a', 6, 0.1, 1); const g = c.g;
      g.save(); g.strokeStyle = c.ink('#222'); g.lineWidth = 1.5 * S; g.beginPath(); g.moveTo(-10, H * 0.78); g.lineTo(W * 0.62, H * 0.32); g.stroke(); g.restore();
      const k = (t * 0.035) % 1, cx = lerp(-10, W * 0.62, k), cy = lerp(H * 0.78, H * 0.32, k); c.P.shape(p => p.rect(cx - 20 * S, cy + 12 * S, 40 * S, 30 * S), c.ink('#c8202a'), 1);
      ganesha(c, W * 0.74, H * 0.74, H * 0.62);
      for (let i = 0; i < 14; i++) c.P.shape(p => p.arc(W * (0.6 + i * 0.022), H * 0.75, 7 * S, 0, TAU), '#ff8a1a', 0.5);
      for (let i = 0; i < 4; i++) person(c, W * (0.55 + i * 0.06), H * 0.82, 0.9, ['#e0e0e0', '#f0b020', '#c8402a', '#2a62c8'][i], 0, i); } },
});
STORIES.buddha.draw = function (c) { const { W, H, S, t } = c;
  hills(c, 0.62, 0.12, '#7a8ab0', 3, 0.05, 0.5); hills(c, 0.76, 0.1, '#3f6a4a', 5, 0.1, 1);
  standingBuddha(c, W * 0.4, H * 0.78, H * 0.68);
  c.P.shape(p => { for (let i = 0; i < 18; i++) p.rect(W * 0.12 + i * W * 0.04, H * 0.76, 6 * S, 24 * S); p.rect(W * 0.12, H * 0.765, W * 0.72, 5 * S); }, c.ink('#f4f2ec'), 0.6);
  for (const dx of [-0.14, 0.14]) { c.P.shape(p => { p.arc(W * (0.4 + dx), H * 0.73, 20 * S, Math.PI, 0); p.lineTo(W * (0.4 + dx), H * 0.66); p.closePath(); }, c.ink('#e0b040', 0.4), 1); }
  templeRoof(c, W * 0.76, H * 0.72, 150 * S, '#b03a22');
  const g = c.g; g.save(); g.strokeStyle = c.ink('#222'); g.lineWidth = 1.4 * S; g.beginPath(); g.moveTo(W * 0.55, H * 0.6); g.lineTo(W * 1.05, H * 0.15); g.stroke(); g.restore();
  const k = (t * 0.03) % 1; c.P.shape(p => p.rect(lerp(W * 0.55, W * 1.05, k) - 18 * S, lerp(H * 0.6, H * 0.15, k) + 10 * S, 36 * S, 28 * S), c.ink('#c8202a'), 1);
  for (let i = 0; i < 4; i++) { const x = W * (0.86 + i * 0.03); g.save(); g.strokeStyle = '#ddd'; g.lineWidth = 2 * S; g.beginPath(); g.moveTo(x, H * 0.76); g.lineTo(x, H * 0.5); g.stroke(); g.restore(); c.P.shape(p => p.rect(x, H * 0.5, 30 * S, 18 * S), i % 2 ? '#f2c414' : '#a51931', 0.4); }
};
STORIES.buddha.lines = ['合艾市立公園的山頂上，金色立佛帕普塔蒙空瑪哈拉面向整座城市。', '右手舉起作施無畏印，意思是「不要害怕」，守護著山下的人們。', '白色欄杆、金色小佛塔與紅頂涼亭圍繞著佛像，國旗在風中飄揚。', '旁邊的纜車還能載你上到更高的山頂，去拜大象神。'];
STORIES.buddha.mood = { root: 261.6, bpm: 72, seed: 61 };
STORIES.floating.mood = { root: 293.7, bpm: 88, seed: 71 }; STORIES.street.mood = { root: 329.6, bpm: 108, seed: 81 };
STORIES.lee.mood = { root: 349.2, bpm: 100, seed: 91 }; STORIES.kimyong.mood = { root: 311.1, bpm: 96, seed: 101 }; STORIES.airport.mood = { root: 277.2, bpm: 90, seed: 111 };
Object.assign(STORY_FOR, { muaythai: 'history', station: 'history', clock: 'oldtown', oldtown: 'oldtown', porkleg: 'food', citystreet: 'oldtown', greenway: 'greenway', elephant: 'elephant', central: 'street', intro: 'history' });
