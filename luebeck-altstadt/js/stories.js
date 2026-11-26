import { StoryAudio } from './storyaudio.js';
// Paper-cut story films for the landmarks. Everything is drawn live on a canvas (no video files):
// layered paper silhouettes with fibre texture, hand-cut edges, drop shadows, parallax camera and pop-up entrances.
// Facts follow commonly documented history; legends are labelled as legends.

/* =============================== palette (Hanseatic paper) =============================== */
const C = {
  paper: '#efe6d3', paper2: '#e2d5bb', cream: '#f6efe0', ink: '#1d2230', navy: '#22324d', navy2: '#2f4566', night: '#141a2a',
  brick: '#9c3b28', brick2: '#7c2c1f', brick3: '#b9553a', copper: '#5f9b86', copper2: '#467a68', gold: '#c9a24a', gold2: '#e1c27a',
  slate: '#3d4553', grass: '#6f8a56', grass2: '#56703f', sea: '#3d6a86', sea2: '#2c5470', salt: '#f4f1ea', wood: '#7a5536', fire: '#e0702d', fire2: '#f2b44a', red: '#b0332a',
};

/* =============================== paper rendering =============================== */
let grain = null;
function grainPattern(ctx) {
  if (grain) return grain;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), img = g.createImageData(256, 256);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 256 * 256; i++) { const v = 128 + (r() - 0.5) * 60; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  // long paper fibres
  g.globalAlpha = 0.18; g.strokeStyle = '#fff'; g.lineWidth = 0.6;
  for (let i = 0; i < 140; i++) { const x = r() * 256, y = r() * 256, a = r() * Math.PI, l = 6 + r() * 18; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 3, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  grain = ctx.createPattern(c, 'repeat'); return grain;
}
// hand-cut edge: subdivide a polygon and jitter its vertices deterministically
function cut(pts, seed = 1, amp = 1.6, step = 14) {
  let s = seed * 9301 + 49297; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280 - 0.5);
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length], L = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) { const t = k / n; out.push([x1 + (x2 - x1) * t + r() * amp, y1 + (y2 - y1) * t + r() * amp]); }
  }
  return out;
}
const pathOf = (ctx, pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); };
// draw one paper piece: shadow → fill → fibre texture → soft top-light
function paper(ctx, pts, color, depth = 1, opts = {}) {
  ctx.save();
  ctx.shadowColor = 'rgba(30,20,10,0.38)'; ctx.shadowBlur = 6 + depth * 7; ctx.shadowOffsetX = 2 + depth * 2.5; ctx.shadowOffsetY = 3 + depth * 3.5;
  pathOf(ctx, pts); ctx.fillStyle = color; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(255,248,230,0.28)'; ctx.stroke();
  ctx.clip();
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = opts.grain ?? 0.22; ctx.fillStyle = grainPattern(ctx); ctx.fillRect(-2000, -2000, 6000, 6000);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  let minY = 1e9, maxY = -1e9; for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  const g = ctx.createLinearGradient(0, minY, 0, maxY); g.addColorStop(0, 'rgba(255,250,235,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = g; ctx.fillRect(-2000, minY, 6000, maxY - minY);
  ctx.restore();
}
// convenience shapes ---------------------------------------------------------------
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const ellipse = (cx, cy, rx, ry, n = 36, a0 = 0, a1 = Math.PI * 2) => { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; };
function wave(y, amp, freq, phase, w = 1600, h = 900) { const p = [[0, h + 40]]; for (let x = 0; x <= w; x += 20) p.push([x, y + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.3 + phase * 1.7) * amp * 0.35]); p.push([w, h + 40]); return p; }
function steppedHouse(x, base, w, h, steps = 5) {   // Lübeck stepped gable house front
  const p = [[x, base], [x, base - h]]; const gh = w * 0.75, sw = w / (steps * 2 - 1);
  for (let i = 0; i < steps; i++) { const y = base - h - gh * (i + 1) / steps; p.push([x + sw * i, y + gh / steps], [x + sw * i, y]); }
  for (let i = steps - 1; i >= 0; i--) { const y = base - h - gh * (i + 1) / steps; p.push([x + w - sw * i, y], [x + w - sw * i, y + gh / steps]); }
  p.push([x + w, base - h], [x + w, base]); return p;
}
const gableHouse = (x, base, w, h, roof = 0.8) => [[x, base], [x, base - h], [x + w / 2, base - h - w * roof], [x + w, base - h], [x + w, base]];
function windows(ctx, x, base, w, h, rows, cols, color = C.ink, alpha = 0.75) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  const cw = w / cols, rh = h / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const wx = x + c * cw + cw * 0.28, wy = base - h + r * rh + rh * 0.22; ctx.beginPath(); ctx.roundRect(wx, wy, cw * 0.44, rh * 0.55, [cw * 0.22, cw * 0.22, 2, 2]); ctx.fill(); }
  ctx.restore();
}
function spire(x, base, w, h) { return [[x - w / 2, base], [x - w / 2, base - h * 0.55], [x - w * 0.45, base - h * 0.55], [x, base - h], [x + w * 0.45, base - h * 0.55], [x + w / 2, base - h * 0.55], [x + w / 2, base]]; }
function cloud(cx, cy, s) { const p = []; const bumps = [[-1, 0, 0.6], [-0.45, -0.35, 0.7], [0.2, -0.45, 0.8], [0.8, -0.15, 0.6], [1.15, 0.1, 0.45]]; for (const [bx, by, r] of bumps) p.push(...ellipse(cx + bx * s, cy + by * s, r * s, r * s * 0.8, 10, Math.PI, Math.PI * 2)); p.push([cx + 1.4 * s, cy + 0.2 * s], [cx - 1.4 * s, cy + 0.2 * s]); return p; }
function kogge(cx, cy, s) {   // Hanseatic cog: hull, castle, single square sail
  return { hull: [[cx - 1.1 * s, cy], [cx + 1.1 * s, cy], [cx + 0.85 * s, cy + 0.42 * s], [cx - 0.85 * s, cy + 0.42 * s]], castle: rect(cx + 0.6 * s, cy - 0.28 * s, 0.4 * s, 0.3 * s), mast: rect(cx - 0.03 * s, cy - 1.5 * s, 0.06 * s, 1.5 * s), sail: [[cx - 0.6 * s, cy - 1.35 * s], [cx + 0.6 * s, cy - 1.35 * s], [cx + 0.68 * s, cy - 0.35 * s], [cx - 0.68 * s, cy - 0.35 * s]] };
}
function drawKogge(ctx, cx, cy, s, rock = 0, depth = 2) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rock); ctx.translate(-cx, -cy);
  const k = kogge(cx, cy, s);
  paper(ctx, cut(k.mast, 3, 0.6), C.wood, depth); paper(ctx, cut(k.sail, 4, 1.2), C.cream, depth + 0.5);
  ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = s * 0.08; ctx.beginPath(); ctx.moveTo(cx, cy - 1.3 * s); ctx.lineTo(cx, cy - 0.4 * s); ctx.moveTo(cx - 0.5 * s, cy - 0.85 * s); ctx.lineTo(cx + 0.5 * s, cy - 0.85 * s); ctx.stroke(); ctx.restore();
  paper(ctx, cut(k.hull, 5, 1.2), C.brick2, depth + 0.6); paper(ctx, cut(k.castle, 6, 0.8), C.wood, depth + 0.6);
  ctx.restore();
}
function holstentor(cx, base, s) {   // two round towers with conical roofs + middle block with stepped gable
  const tw = 0.62 * s, th = 1.05 * s, mid = 0.7 * s;
  return {
    left: [...rect(cx - mid / 2 - tw, base - th, tw, th)], right: [...rect(cx + mid / 2, base - th, tw, th)],
    leftRoof: [[cx - mid / 2 - tw - 0.05 * s, base - th], [cx - mid / 2 - tw / 2, base - th - 0.72 * s], [cx - mid / 2 + 0.05 * s, base - th]],
    rightRoof: [[cx + mid / 2 - 0.05 * s, base - th], [cx + mid / 2 + tw / 2, base - th - 0.72 * s], [cx + mid / 2 + tw + 0.05 * s, base - th]],
    middle: steppedHouse(cx - mid / 2, base, mid, th * 1.05, 4),
    arch: [...ellipse(cx, base - 0.28 * s, 0.17 * s, 0.2 * s, 16, Math.PI, Math.PI * 2), [cx + 0.17 * s, base], [cx - 0.17 * s, base]],
  };
}
function drawHolstentor(ctx, cx, base, s, depth = 2) {
  const H = holstentor(cx, base, s);
  paper(ctx, cut(H.middle, 11, 1), C.brick2, depth); paper(ctx, cut(H.left, 12, 1), C.brick, depth + 0.4); paper(ctx, cut(H.right, 13, 1), C.brick, depth + 0.4);
  paper(ctx, cut(H.leftRoof, 14, 1), C.slate, depth + 0.5); paper(ctx, cut(H.rightRoof, 15, 1), C.slate, depth + 0.5);
  paper(ctx, cut(H.arch, 16, 0.6), C.ink, depth + 0.6);
  for (const tx of [cx - 0.35 * s - 0.31 * s, cx + 0.35 * s + 0.31 * s]) for (let r = 0; r < 3; r++) for (let c = -1; c <= 1; c++) { ctx.save(); ctx.fillStyle = 'rgba(20,18,20,0.75)'; ctx.beginPath(); ctx.roundRect(tx + c * 0.16 * s - 0.035 * s, base - 0.95 * s + r * 0.28 * s, 0.07 * s, 0.12 * s, [0.035 * s, 0.035 * s, 1, 1]); ctx.fill(); ctx.restore(); }
}
function churchTwin(cx, base, s, color = C.brick, roof = C.copper) {   // St. Marien style: twin towers + nave
  return [
    { pts: rect(cx - 0.05 * s, base - 0.75 * s, 1.5 * s, 0.75 * s), col: color },
    { pts: [[cx - 0.05 * s, base - 0.75 * s], [cx + 0.7 * s, base - 1.05 * s], [cx + 1.45 * s, base - 0.75 * s]], col: roof },
    { pts: rect(cx - 0.45 * s, base - 1.6 * s, 0.32 * s, 1.6 * s), col: color }, { pts: rect(cx - 0.05 * s, base - 1.6 * s, 0.32 * s, 1.6 * s), col: color },
    { pts: spire(cx - 0.29 * s, base - 1.6 * s, 0.34 * s, 1.15 * s), col: roof }, { pts: spire(cx + 0.11 * s, base - 1.6 * s, 0.34 * s, 1.15 * s), col: roof },
  ];
}
function devil(cx, cy, s, pose = 0) {   // little devil silhouette: body, head with horns, tail, arms up/down
  const parts = [];
  parts.push(ellipse(cx, cy, 0.32 * s, 0.42 * s, 24));                                         // body
  parts.push(ellipse(cx, cy - 0.58 * s, 0.22 * s, 0.24 * s, 20));                             // head
  parts.push([[cx - 0.17 * s, cy - 0.72 * s], [cx - 0.3 * s, cy - 1.02 * s], [cx - 0.08 * s, cy - 0.78 * s]]);   // horns
  parts.push([[cx + 0.17 * s, cy - 0.72 * s], [cx + 0.3 * s, cy - 1.02 * s], [cx + 0.08 * s, cy - 0.78 * s]]);
  const up = pose; // 0 = arms down, 1 = arms raised (carrying)
  parts.push([[cx - 0.28 * s, cy - 0.2 * s], [cx - 0.55 * s, cy - 0.2 * s - up * 0.55 * s], [cx - 0.48 * s, cy - 0.3 * s - up * 0.6 * s], [cx - 0.2 * s, cy - 0.32 * s]]);
  parts.push([[cx + 0.28 * s, cy - 0.2 * s], [cx + 0.55 * s, cy - 0.2 * s - up * 0.55 * s], [cx + 0.48 * s, cy - 0.3 * s - up * 0.6 * s], [cx + 0.2 * s, cy - 0.32 * s]]);
  parts.push([[cx - 0.16 * s, cy + 0.35 * s], [cx - 0.2 * s, cy + 0.75 * s], [cx - 0.06 * s, cy + 0.75 * s], [cx - 0.04 * s, cy + 0.38 * s]]);   // legs
  parts.push([[cx + 0.16 * s, cy + 0.35 * s], [cx + 0.2 * s, cy + 0.75 * s], [cx + 0.06 * s, cy + 0.75 * s], [cx + 0.04 * s, cy + 0.38 * s]]);
  const tail = []; for (let i = 0; i <= 12; i++) { const t = i / 12; tail.push([cx + 0.25 * s + t * 0.55 * s, cy + 0.25 * s - Math.sin(t * Math.PI * 1.3) * 0.3 * s]); }
  for (let i = 12; i >= 0; i--) { const t = i / 12; tail.push([cx + 0.25 * s + t * 0.55 * s, cy + 0.31 * s - Math.sin(t * Math.PI * 1.3) * 0.3 * s]); }
  tail.push([cx + 0.86 * s, cy - 0.12 * s]); parts.push(tail);
  return parts;
}
function rock(cx, cy, s, seed = 3) { const p = []; let r = seed; for (let i = 0; i < 12; i++) { r = (r * 7919) % 1000; const a = i / 12 * Math.PI * 2, k = 0.75 + (r / 1000) * 0.35; p.push([cx + Math.cos(a) * s * k * 1.25, cy + Math.sin(a) * s * k * 0.8]); } return p; }
function barrel(cx, cy, s) { return [[cx - 0.35 * s, cy - 0.5 * s], [cx + 0.35 * s, cy - 0.5 * s], [cx + 0.42 * s, cy], [cx + 0.35 * s, cy + 0.5 * s], [cx - 0.35 * s, cy + 0.5 * s], [cx - 0.42 * s, cy]]; }
function fish(cx, cy, s, dir = 1) { const b = ellipse(cx, cy, 0.5 * s, 0.17 * s, 18); b.push([cx - dir * 0.5 * s, cy], [cx - dir * 0.78 * s, cy - 0.17 * s], [cx - dir * 0.78 * s, cy + 0.17 * s], [cx - dir * 0.5 * s, cy]); return b; }
function flame(cx, base, s, t) { const p = [[cx - 0.4 * s, base]]; for (let i = 0; i <= 8; i++) { const u = i / 8, x = cx - 0.4 * s + u * 0.8 * s, h = Math.sin(u * Math.PI) * s * (1 + 0.25 * Math.sin(t * 8 + u * 9)) * (i % 2 ? 0.7 : 1.1); p.push([x, base - h]); } p.push([cx + 0.4 * s, base]); return p; }
function bell(cx, cy, s) { return [[cx - 0.18 * s, cy - 0.5 * s], [cx + 0.18 * s, cy - 0.5 * s], [cx + 0.25 * s, cy - 0.1 * s], [cx + 0.45 * s, cy + 0.35 * s], [cx - 0.45 * s, cy + 0.35 * s], [cx - 0.25 * s, cy - 0.1 * s]]; }
function skyline(base, seed = 1, h0 = 120) {   // row of Lübeck gable houses
  const out = []; let x = -40, s = seed;
  while (x < 1640) { s = (s * 9301 + 49297) % 233280; const w = 70 + (s % 50), h = h0 + (s % 90), stepped = s % 3 === 0; out.push({ pts: stepped ? steppedHouse(x, base, w, h, 4) : gableHouse(x, base, w, h, 0.7 + (s % 5) * 0.08), col: [C.brick, C.brick2, C.cream, C.paper2, '#d8b98a', '#c98d6b', C.brick3][s % 7], x, w, h }); x += w + 2; }
  return out;
}


// Henry the Lion (Heinrich der Löwe) as a paper-theatre figure: standing upright, lion's head with a full mane,
// ducal coronet, ermine collar, red tunic with gold trim, blue cloak, boots, holding a sword or a model church.
function henry(ctx, cx, base, s, T = 0, hold = 'church', depth = 2) {
  const H = s, by = base - 0.83 * H, sway = Math.sin(T * 1.1) * 0.006 * H;
  ctx.save(); ctx.translate(sway, 0);
  // tail with tuft, peeking from behind the cloak
  const tail = []; for (let i = 0; i <= 14; i++) { const u = i / 14; tail.push([cx + 0.18 * H + u * 0.2 * H, base - 0.25 * H + Math.sin(u * 3.2) * 0.06 * H - u * 0.14 * H]); }
  for (let i = 14; i >= 0; i--) { const u = i / 14; tail.push([cx + 0.18 * H + u * 0.2 * H, base - 0.235 * H + Math.sin(u * 3.2) * 0.06 * H - u * 0.14 * H]); }
  paper(ctx, cut(tail, 3001, 0.5, 6), '#c08a36', depth - 0.2);
  paper(ctx, cut(ellipse(cx + 0.385 * H, base - 0.4 * H, 0.035 * H, 0.05 * H, 12), 3002, 1.2, 5), '#6b4320', depth - 0.15);
  // cloak (behind the body), deep blue with a gold hem
  const cloak = [[cx - 0.17 * H, base - 0.7 * H], [cx + 0.17 * H, base - 0.7 * H], [cx + 0.29 * H, base - 0.02 * H], [cx + 0.1 * H, base + 0.005 * H], [cx - 0.1 * H, base + 0.005 * H], [cx - 0.29 * H, base - 0.02 * H]];
  paper(ctx, cut(cloak, 3003, 1, 10), '#203a6b', depth);
  paper(ctx, cut([[cx - 0.29 * H, base - 0.035 * H], [cx + 0.29 * H, base - 0.035 * H], [cx + 0.295 * H, base - 0.01 * H], [cx - 0.295 * H, base - 0.01 * H]], 3004, 0.4, 8), C.gold, depth + 0.05);
  // legs & boots
  for (const sx of [-1, 1]) { paper(ctx, cut(rect(cx + sx * 0.06 * H - 0.035 * H, base - 0.2 * H, 0.07 * H, 0.17 * H), 3005 + sx, 0.4, 6), '#e8dcc6', depth + 0.1); paper(ctx, cut([[cx + sx * 0.06 * H - 0.04 * H, base - 0.09 * H], [cx + sx * 0.06 * H + 0.04 * H, base - 0.09 * H], [cx + sx * 0.06 * H + 0.045 * H + sx * 0.03 * H, base], [cx + sx * 0.06 * H - 0.045 * H, base]], 3008 + sx, 0.4, 6), '#3a2416', depth + 0.15); }
  // tunic: red, gold hem band, belt with buckle
  const tunic = [[cx - 0.14 * H, base - 0.7 * H], [cx + 0.14 * H, base - 0.7 * H], [cx + 0.16 * H, base - 0.45 * H], [cx + 0.2 * H, base - 0.18 * H], [cx - 0.2 * H, base - 0.18 * H], [cx - 0.16 * H, base - 0.45 * H]];
  paper(ctx, cut(tunic, 3010, 0.8, 8), '#9c2a22', depth + 0.3);
  paper(ctx, cut([[cx - 0.2 * H, base - 0.21 * H], [cx + 0.2 * H, base - 0.21 * H], [cx + 0.205 * H, base - 0.18 * H], [cx - 0.205 * H, base - 0.18 * H]], 3011, 0.4, 8), C.gold, depth + 0.35);
  paper(ctx, cut(rect(cx - 0.155 * H, base - 0.47 * H, 0.31 * H, 0.03 * H), 3012, 0.3, 8), '#3a2416', depth + 0.35);
  paper(ctx, cut(rect(cx - 0.02 * H, base - 0.475 * H, 0.04 * H, 0.04 * H), 3013, 0.3, 6), C.gold2, depth + 0.4);
  // heraldic lion embroidered on the chest (Guelph lion, gold on red)
  ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = C.gold2; ctx.font = `${0.09 * H}px Georgia, serif`; ctx.textAlign = 'center'; ctx.fillText('♌', cx, base - 0.54 * H); ctx.restore();
  // ermine collar: white fur with black tails
  paper(ctx, cut([...ellipse(cx, base - 0.7 * H, 0.19 * H, 0.06 * H, 24, 0, Math.PI), [cx - 0.19 * H, base - 0.71 * H]], 3014, 0.8, 6), '#f6f2ea', depth + 0.45);
  ctx.save(); ctx.fillStyle = '#1d1d22'; for (let k = 0; k < 7; k++) { const a = 0.25 + k * 0.42, x = cx + Math.cos(a) * 0.15 * H, y = base - 0.7 * H + Math.sin(a) * 0.04 * H; ctx.beginPath(); ctx.ellipse(x, y, 0.006 * H, 0.013 * H, 0, 0, 7); ctx.fill(); } ctx.restore();
  // arms: sleeves with gold cuffs, lion paws for hands
  const arm = (sx, hx, hy, seed) => { paper(ctx, cut([[cx + sx * 0.12 * H, base - 0.69 * H], [cx + sx * 0.2 * H, base - 0.66 * H], [hx + sx * 0.03 * H, hy - 0.02 * H], [hx - sx * 0.04 * H, hy + 0.02 * H], [cx + sx * 0.12 * H, base - 0.56 * H]], seed, 0.6, 7), '#7e2019', depth + 0.5); paper(ctx, cut(ellipse(hx, hy, 0.035 * H, 0.03 * H, 12), seed + 1, 0.5, 5), '#d6a24a', depth + 0.55); };
  if (hold === 'sword') {
    paper(ctx, cut(rect(cx + 0.235 * H, base - 0.95 * H, 0.016 * H, 0.52 * H), 3020, 0.3, 10), '#c9ccd2', depth + 0.45);
    paper(ctx, cut(rect(cx + 0.2 * H, base - 0.45 * H, 0.09 * H, 0.018 * H), 3021, 0.3, 6), C.gold, depth + 0.5);
    arm(1, cx + 0.243 * H, base - 0.41 * H, 3022);
  } else {
    // model of the cathedral carried on the right arm (founder's attribute)
    arm(1, cx + 0.22 * H, base - 0.5 * H, 3022);
    for (const p of churchTwin(cx + 0.18 * H, base - 0.52 * H, 0.09 * H, C.brick2, C.copper2)) paper(ctx, cut(p.pts, 3024, 0.3, 4), p.col, depth + 0.6);
  }
  arm(-1, cx - 0.13 * H, base - 0.44 * H, 3026);   // left paw resting on the belt
  // head: mane (jagged double ring), ears, face, muzzle, nose, eyes
  const mane = (r1, r2, n, seed) => { const pts = []; let q = seed; for (let i = 0; i < n * 2; i++) { q = (q * 9301 + 49297) % 233280; const a = i / (n * 2) * Math.PI * 2 + Math.PI / 2, r = (i % 2 ? r2 : r1) * (0.92 + (q / 233280) * 0.16); pts.push([cx + Math.cos(a) * r * 0.95, by + Math.sin(a) * r * 1.05]); } return pts; };
  paper(ctx, mane(0.17 * H, 0.12 * H, 22, 3030), '#7b4a1c', depth + 0.6);
  paper(ctx, mane(0.145 * H, 0.105 * H, 18, 3031), '#a8682a', depth + 0.65);
  for (const sx of [-1, 1]) paper(ctx, cut(ellipse(cx + sx * 0.07 * H, by - 0.07 * H, 0.025 * H, 0.028 * H, 10), 3032 + sx, 0.4, 5), '#c99a48', depth + 0.7);
  paper(ctx, cut(ellipse(cx, by, 0.085 * H, 0.095 * H, 28), 3035, 0.6, 6), '#d9a64f', depth + 0.75);
  paper(ctx, cut(ellipse(cx, by + 0.045 * H, 0.05 * H, 0.04 * H, 18), 3036, 0.4, 5), '#f0d9a6', depth + 0.8);
  ctx.save(); ctx.fillStyle = '#2a1a12';
  ctx.beginPath(); ctx.moveTo(cx - 0.02 * H, by + 0.02 * H); ctx.lineTo(cx + 0.02 * H, by + 0.02 * H); ctx.lineTo(cx, by + 0.042 * H); ctx.fill();   // nose
  ctx.lineWidth = 0.006 * H; ctx.strokeStyle = '#2a1a12'; ctx.beginPath(); ctx.moveTo(cx, by + 0.042 * H); ctx.lineTo(cx, by + 0.058 * H); ctx.quadraticCurveTo(cx - 0.02 * H, by + 0.07 * H, cx - 0.03 * H, by + 0.06 * H); ctx.moveTo(cx, by + 0.058 * H); ctx.quadraticCurveTo(cx + 0.02 * H, by + 0.07 * H, cx + 0.03 * H, by + 0.06 * H); ctx.stroke();
  const blink = (T % 4.5) < 0.12 ? 0.15 : 1;
  for (const sx of [-1, 1]) { ctx.fillStyle = '#f6e7b8'; ctx.beginPath(); ctx.ellipse(cx + sx * 0.035 * H, by - 0.02 * H, 0.016 * H, 0.011 * H * blink, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#2a1a12'; ctx.beginPath(); ctx.ellipse(cx + sx * 0.035 * H, by - 0.02 * H, 0.007 * H, 0.009 * H * blink, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#5a3412'; ctx.lineWidth = 0.005 * H; ctx.beginPath(); ctx.moveTo(cx + sx * 0.055 * H, by - 0.045 * H); ctx.lineTo(cx + sx * 0.015 * H, by - 0.038 * H); ctx.stroke(); }
  ctx.fillStyle = 'rgba(60,30,10,0.5)'; for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(cx + sx * (0.022 + k * 0.01) * H, by + 0.05 * H - k * 0.004 * H, 0.0028 * H, 0, 7); ctx.fill(); }   // whisker dots
  ctx.restore();
  // ducal coronet sitting on the mane
  const cy0 = by - 0.135 * H, crown = [[cx - 0.075 * H, cy0 + 0.03 * H], [cx - 0.075 * H, cy0 - 0.01 * H]];
  for (let k = 0; k < 5; k++) { const x = cx - 0.075 * H + k * 0.0375 * H; crown.push([x, cy0 - (k % 2 ? 0.015 : 0.05) * H], [x + 0.019 * H, cy0 - 0.01 * H]); }
  crown.push([cx + 0.075 * H, cy0 - 0.01 * H], [cx + 0.075 * H, cy0 + 0.03 * H]);
  paper(ctx, cut(crown, 3040, 0.3, 6), C.gold, depth + 0.9);
  ctx.save(); for (let k = 0; k < 3; k++) { ctx.fillStyle = ['#b0242a', '#2b6a9b', '#b0242a'][k]; ctx.beginPath(); ctx.arc(cx - 0.04 * H + k * 0.04 * H, cy0 + 0.012 * H, 0.008 * H, 0, 7); ctx.fill(); } ctx.restore();
  ctx.restore();
}

/* ---- extra pieces for the longer films ---- */
function islandMap(ctx, t, T) {   // stylised map: oval old-town island between Trave (west) and Wakenitz (east)
  paper(ctx, cut(rect(0, 0, 1600, 900), 501, 3, 40), '#c9d6b0', 0.3);
  const riv = (pts, col, sd, dpt) => paper(ctx, cut(pts, sd, 2, 18), col, dpt);
  const L = [], R = [];
  for (let i = 0; i <= 20; i++) { const y = 60 + i * 40, w = Math.sin(i / 20 * Math.PI); L.push([520 - w * 120 + Math.sin(i * 0.7) * 20, y]); R.push([1080 + w * 120 + Math.sin(i * 0.6) * 18, y]); }
  riv([...L.map(([x, y]) => [x - 45, y]), ...L.slice().reverse().map(([x, y]) => [x + 45, y])], C.sea, 502, 0.8);
  riv([...R.map(([x, y]) => [x - 35, y]), ...R.slice().reverse().map(([x, y]) => [x + 35, y])], C.sea, 503, 0.8);
  const isl = [...L.map(([x, y]) => [x + 50, y]), ...R.slice().reverse().map(([x, y]) => [x - 40, y])];
  pop(ctx, t, 0.4, () => paper(ctx, cut(isl, 504, 2, 20), C.paper2, 1.2));
}
function piles(ctx, t, base, n, x0, gap) { for (let i = 0; i < n; i++) { const k = clamp((t - 0.6 - i * 0.25) / 0.8); paper(ctx, cut([[x0 + i * gap - 10, base - 40], [x0 + i * gap + 10, base - 40], [x0 + i * gap + 10, base - 40 + 300 * k], [x0 + i * gap, base - 30 + 320 * k], [x0 + i * gap - 10, base - 40 + 300 * k]], 520 + i, 0.6, 10), C.wood, 2); } }
function soldier(cx, base, s) { return [...ellipse(cx, base - 1.55 * s, 0.13 * s, 0.13 * s, 12), [cx + 0.35 * s, base - 1.75 * s], [cx + 0.2 * s, base - 1.62 * s], [cx + 0.2 * s, base - 1.35 * s], [cx + 0.25 * s, base - 0.75 * s], [cx + 0.2 * s, base], [cx + 0.05 * s, base], [cx, base - 0.55 * s], [cx - 0.05 * s, base], [cx - 0.2 * s, base], [cx - 0.25 * s, base - 0.75 * s], [cx - 0.2 * s, base - 1.35 * s], [cx - 0.2 * s, base - 1.62 * s], [cx - 0.35 * s, base - 1.75 * s]]; }
function person(cx, base, s) { return [...ellipse(cx, base - 1.55 * s, 0.13 * s, 0.13 * s, 12), [cx + 0.22 * s, base - 1.3 * s], [cx + 0.28 * s, base - 0.55 * s], [cx + 0.15 * s, base], [cx - 0.15 * s, base], [cx - 0.28 * s, base - 0.55 * s], [cx - 0.22 * s, base - 1.3 * s]]; }
function piano(cx, base, s) { return [[cx - s, base - 0.75 * s], [cx + 0.4 * s, base - 0.75 * s], [cx + 0.95 * s, base - 0.55 * s], [cx + s, base - 0.45 * s], [cx + s, base - 0.38 * s], [cx - s, base - 0.38 * s]]; }
function noteGlyph(ctx, x, y, s, col) { ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, s * 0.55, s * 0.4, -0.4, 0, 7); ctx.fill(); ctx.fillRect(x + s * 0.45, y - s * 2.2, s * 0.14, s * 2.2); ctx.beginPath(); ctx.moveTo(x + s * 0.59, y - s * 2.2); ctx.quadraticCurveTo(x + s * 1.3, y - s * 1.6, x + s * 1.0, y - s * 1.0); ctx.lineTo(x + s * 0.59, y - s * 1.7); ctx.fill(); ctx.restore(); }
function hanseMap(ctx, t, T, cities) {
  sky(ctx, '#d7dfe2', '#e8dfca');
  paper(ctx, cut(wave(520, 30, 0.004, 1), 601), C.grass, 0.8);
  paper(ctx, cut([[300, 120], [1500, 80], [1600, 380], [1200, 420], [900, 360], [700, 470], [420, 380]], 602, 3, 30), C.sea, 1);   // Baltic
  paper(ctx, cut([[0, 260], [260, 230], [380, 420], [180, 520], [0, 500]], 603, 3, 30), C.sea, 1);                                   // North Sea
  const home = [640, 520];
  cities.forEach(([name, x, y], i) => {
    const k = clamp((t - 0.8 - i * 0.5) / 0.8); if (k <= 0) return;
    ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 4; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -T * 30; ctx.beginPath(); ctx.moveTo(...home); ctx.lineTo(home[0] + (x - home[0]) * k, home[1] + (y - home[1]) * k); ctx.stroke(); ctx.restore();
    if (k >= 1) { paper(ctx, cut(ellipse(x, y, 14, 14, 12), 610 + i, 0.5), C.gold, 2); ctx.save(); ctx.fillStyle = C.ink; ctx.font = '600 26px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(name, x, y - 24); ctx.restore(); }
  });
  paper(ctx, cut(ellipse(home[0], home[1], 20, 20, 14), 620, 0.5), C.red, 2.4); ctx.save(); ctx.fillStyle = C.red; ctx.font = '700 30px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('Lübeck', home[0], home[1] + 52); ctx.restore();
}
function copperSpire(ctx, t, x, base, s, from = C.brick3, to = C.copper) { const k = clamp(t / 6); const c = (a, b) => { const p = (h) => parseInt(h.slice(1), 16); const A = p(a), B = p(b); const m = (sh) => Math.round(((A >> sh) & 255) * (1 - k) + ((B >> sh) & 255) * k); return `rgb(${m(16)},${m(8)},${m(0)})`; }; paper(ctx, cut(spire(x, base, s * 0.5, s * 1.7), 640, 0.8), c(from, to), 2); }

/* =============================== timeline helpers =============================== */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeBack = (t) => { t = clamp(t); const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
// pop-up: a layer rises from below (like folding up a pop-up book) with a slight overshoot
function pop(ctx, t, delay, fn, dist = 120) { const k = easeBack((t - delay) / 0.9); if (t < delay) return; ctx.save(); ctx.translate(0, (1 - k) * dist); ctx.globalAlpha = clamp((t - delay) / 0.35); fn(); ctx.restore(); }
function sky(ctx, top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, 900); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(-200, -200, 2000, 1300); ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.16; ctx.fillStyle = grainPattern(ctx); ctx.fillRect(-200, -200, 2000, 1300); ctx.restore(); }
function sun(ctx, x, y, r, col = C.gold2) { paper(ctx, cut(ellipse(x, y, r, r, 40), 21, 1.2), col, 0.5); ctx.save(); ctx.strokeStyle = col; ctx.globalAlpha = 0.5; ctx.lineWidth = 6; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25); ctx.lineTo(x + Math.cos(a) * r * 1.55, y + Math.sin(a) * r * 1.55); ctx.stroke(); } ctx.restore(); }
function moon(ctx, x, y, r) { paper(ctx, cut([...ellipse(x, y, r, r, 30, -1.2, 1.2 + Math.PI), ...ellipse(x + r * 0.45, y - r * 0.1, r * 0.8, r * 0.8, 24, 1.2 + Math.PI, -1.2).reverse()], 22, 0.8), C.cream, 0.5); }
function stars(ctx, n, seed, t) { let s = seed; ctx.save(); for (let i = 0; i < n; i++) { s = (s * 9301 + 49297) % 233280; const x = (s % 1600), y = (s * 7 % 420); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i); ctx.fillStyle = C.cream; ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, 7); ctx.fill(); } ctx.restore(); }
function frameBorder(ctx) {   // ornamental paper frame (scherenschnitt border)
  ctx.save(); ctx.fillStyle = C.ink; ctx.globalAlpha = 0.92;
  const b = 26; ctx.beginPath(); ctx.rect(-50, -50, 1700, 1000); ctx.rect(b, b, 1600 - 2 * b, 900 - 2 * b); ctx.fill('evenodd');
  ctx.globalAlpha = 1; ctx.fillStyle = C.gold;
  for (let x = b + 30; x < 1600 - b; x += 60) { ctx.beginPath(); ctx.moveTo(x - 9, b); ctx.lineTo(x, b + 11); ctx.lineTo(x + 9, b); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 9, 900 - b); ctx.lineTo(x, 900 - b - 11); ctx.lineTo(x + 9, 900 - b); ctx.fill(); }
  ctx.restore();
}

/* =============================== the stories =============================== */
// Each scene: { d: seconds, zh: caption, de: German line, draw(ctx, t, T) } — t = seconds into the scene, T = absolute time
export const STORIES = {
  teufel: {
    title: 'Der Teufel von St. Marien', zh: '聖瑪利亞教堂的小惡魔', kind: '傳說',
    summary: '呂貝克流傳最廣的傳說之一。13 世紀市民動工興建聖瑪利亞教堂時，魔鬼以為大家在蓋一間酒館，高高興興地來幫忙搬石頭。等牆越蓋越高、他發現原來是一座教堂，氣得抱起一塊大石頭要砸毀它。工人趕緊答應在教堂旁邊另蓋一間酒館，魔鬼才把石頭丟在牆邊。據說那家酒館就是市政廳地下的 Ratskeller；那塊石頭至今還躺在教堂南牆旁，2000 年再添上一尊坐在石上的小惡魔銅像。（以上為民間傳說）',
    scenes: [
      { d: 7, zh: '十三世紀，呂貝克的市民開始興建一座磚造大教堂。', de: 'Lübeck, im 13. Jahrhundert', draw(ctx, t) {
        sky(ctx, '#cfd9e2', C.paper); sun(ctx, 1300, 180, 60);
        pop(ctx, t, 0.1, () => paper(ctx, cut(cloud(320, 170, 70), 31), C.cream, 0.6));
        pop(ctx, t, 0.4, () => { for (const h of skyline(720, 5, 110)) paper(ctx, cut(h.pts, h.x | 0), h.col, 1); });
        pop(ctx, t, 0.9, () => { const p = churchTwin(620, 720, 220); const k = clamp(t / 6); for (const s of p.slice(0, 4)) { ctx.save(); ctx.beginPath(); ctx.rect(0, 720 - 360 * k - 10, 1600, 900); ctx.clip(); paper(ctx, cut(s.pts, 41), s.col, 1.6); ctx.restore(); } });
        pop(ctx, t, 1.3, () => paper(ctx, cut(wave(760, 14, 0.006, 1), 51), C.grass2, 2.2));
        // scaffold poles
        pop(ctx, t, 1.6, () => { for (let i = 0; i < 6; i++) paper(ctx, rect(560 + i * 60, 470, 6, 260), C.wood, 2); });
      } },
      { d: 7, zh: '魔鬼路過，以為大家在蓋一間酒館，心想：「太好了，人們會在這裡喝個痛快！」', de: '„Eine Schenke? Da helfe ich gern!"', draw(ctx, t, T) {
        sky(ctx, '#d9cfbf', C.paper2);
        pop(ctx, t, 0.1, () => { for (const h of skyline(700, 8, 100)) paper(ctx, cut(h.pts, h.x | 0), h.col, 1); });
        pop(ctx, t, 0.3, () => paper(ctx, cut(wave(740, 12, 0.007, 2), 52), C.grass, 1.8));
        // the devil skips in from the left carrying a stone
        const x = 200 + easeOut(t / 5) * 520, y = 600 - Math.abs(Math.sin(T * 5)) * 18;
        pop(ctx, t, 0.4, () => { for (const p of devil(x, y, 140, 1)) paper(ctx, cut(p, 61, 0.8, 10), C.ink, 2.6); paper(ctx, cut(rock(x, y - 150, 70, 7), 62), C.slate, 2.8); });
        // thought bubble with a wine goblet
        pop(ctx, t, 2.4, () => { paper(ctx, cut(ellipse(x + 260, y - 270, 120, 80, 30), 63), C.cream, 2.4); paper(ctx, cut([[x + 230, y - 320], [x + 290, y - 320], [x + 270, y - 270], [x + 265, y - 240], [x + 285, y - 230], [x + 235, y - 230], [x + 255, y - 240], [x + 250, y - 270]], 64, 0.5, 8), C.red, 2.6); });
      } },
      { d: 7, zh: '牆越砌越高，尖塔指向天空——魔鬼這才發現：這是一座教堂！', de: 'Das ist ja eine Kirche!', draw(ctx, t, T) {
        sky(ctx, '#b9c3cf', '#d8cbb3');
        pop(ctx, t, 0.1, () => { for (const p of churchTwin(560, 760, 260)) paper(ctx, cut(p.pts, 71), p.col, 1.5); });
        pop(ctx, t, 0.4, () => paper(ctx, cut(wave(780, 10, 0.006, 3), 72), C.grass2, 2));
        const shake = t > 2 ? Math.sin(T * 40) * 4 : 0;
        pop(ctx, t, 0.6, () => { for (const p of devil(1150 + shake, 600, 170, 1)) paper(ctx, cut(p, 73, 0.8, 10), C.ink, 2.6); paper(ctx, cut(rock(1150 + shake, 420, 95, 9), 74), C.slate, 2.8); });
        if (t > 2.2) { ctx.save(); ctx.globalAlpha = clamp((t - 2.2) * 2); ctx.fillStyle = C.red; ctx.font = 'bold 120px serif'; ctx.fillText('!', 1280, 420); ctx.restore(); }
      } },
      { d: 8, zh: '他氣得高舉巨石要砸毀教堂。工人連忙說：「我們在旁邊也替你蓋一間酒館！」', de: '„Wir bauen dir einen Weinkeller!"', draw(ctx, t, T) {
        sky(ctx, '#7f8a9a', '#c9b99b');
        pop(ctx, t, 0.1, () => { for (const p of churchTwin(380, 760, 230)) paper(ctx, cut(p.pts, 81), p.col, 1.4); });
        pop(ctx, t, 0.4, () => paper(ctx, cut(wave(780, 10, 0.006, 4), 82), C.grass2, 2));
        pop(ctx, t, 0.6, () => { for (const p of devil(1050, 560, 180, 1)) paper(ctx, cut(p, 83, 0.8, 10), C.ink, 2.6); paper(ctx, cut(rock(1050, 370, 110, 11), 84), C.slate, 2.8); });
        // workers (simple paper figures) pleading
        pop(ctx, t, 1.4, () => { for (let i = 0; i < 3; i++) { const x = 760 + i * 70; paper(ctx, cut([...ellipse(x, 640, 22, 22, 14), [x + 24, 700], [x + 30, 780], [x - 30, 780], [x - 24, 700]], 85 + i, 0.6, 8), C.navy2, 2.3); } });
        // a little tavern pops up next to the church
        pop(ctx, t, 3.2, () => { paper(ctx, cut(gableHouse(650, 780, 150, 110, 0.7), 88), C.brick3, 2.2); paper(ctx, cut(rect(700, 640, 50, 34), 89), C.gold, 2.4); });
      } },
      { d: 8, zh: '魔鬼同意了，把石頭丟在教堂牆邊。那塊石頭至今還在，上面坐著一個小惡魔。', de: 'Der Teufelsstein – bis heute', draw(ctx, t, T) {
        sky(ctx, '#cfd9e2', C.paper); sun(ctx, 1350, 170, 55);
        pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 230, 1600, 560), 91, 2, 30), C.brick, 1.2));
        pop(ctx, t, 0.2, () => { ctx.save(); ctx.strokeStyle = 'rgba(60,20,10,0.35)'; ctx.lineWidth = 3; for (let y = 260; y < 780; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1600, y); ctx.stroke(); for (let x = (y / 36 % 2) * 40; x < 1600; x += 80) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 36); ctx.stroke(); } } ctx.restore(); });
        // falling stone
        const fall = easeOut(t / 1.6), sy = -100 + fall * 760;
        pop(ctx, t, 0, () => paper(ctx, cut(rock(820, Math.min(sy, 690), 150, 13), 92, 2), '#8d8a86', 3));
        if (t > 1.6) { ctx.save(); ctx.globalAlpha = clamp(1 - (t - 1.6) * 0.6); ctx.fillStyle = C.paper2; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI, r = (t - 1.6) * 260; ctx.beginPath(); ctx.arc(820 + Math.cos(a) * r, 760 - Math.sin(a) * r * 0.5, 10, 0, 7); ctx.fill(); } ctx.restore(); }
        pop(ctx, t, 2.6, () => { for (const p of devil(830, 520, 110, 0)) paper(ctx, cut(p, 93, 0.6, 9), '#7a5434', 3.4); });
        pop(ctx, t, 0.3, () => paper(ctx, cut(rect(0, 780, 1600, 140), 94, 2), C.slate, 2.5));
      } },
    ],
  },
  holstentor: {
    title: 'Das Holstentor', zh: '霍爾斯滕門', kind: '史實',
    summary: '霍爾斯滕門建於 1464 至 1478 年，是呂貝克城牆西側的城門，由市府建築師 Hinrich Helmstede 主持興建，兩座圓塔中間夾著門樓。城門蓋在鬆軟的河岸地上，南塔在興建期間就開始下沉，至今仍看得出傾斜。1871 年修復後，朝城外（西側田野）的一面加上了拉丁文「CONCORDIA DOMI FORIS PAX」（城內和睦，城外和平）。它曾出現在德國 50 馬克紙鈔上，2006 年也成為德國 2 歐元紀念硬幣的圖案，是呂貝克的城市象徵。',
    scenes: [
      { d: 7, zh: '1464 年，呂貝克開始在城西興建一座新的城門。', de: '1464 – 1478', draw(ctx, t) {
        sky(ctx, '#cbd6e0', C.paper); sun(ctx, 1320, 190, 58);
        pop(ctx, t, 0.2, () => paper(ctx, cut(wave(700, 16, 0.004, 0.5), 101), C.grass, 1));
        pop(ctx, t, 0.5, () => { ctx.save(); ctx.beginPath(); ctx.rect(0, 760 - 520 * clamp(t / 6), 1600, 900); ctx.clip(); drawHolstentor(ctx, 800, 760, 300, 1.6); ctx.restore(); });
        pop(ctx, t, 0.8, () => paper(ctx, cut(wave(770, 8, 0.008, 2), 102), C.grass2, 2.4));
        pop(ctx, t, 1.2, () => { for (let i = 0; i < 4; i++) paper(ctx, rect(540 + i * 170, 380, 7, 390), C.wood, 2.6); });
      } },
      { d: 7, zh: '兩座圓塔守著通往西方的大道，牆上的砲口對準城外。', de: 'Zwei Türme gegen die Welt draußen', draw(ctx, t, T) {
        sky(ctx, '#aebccc', '#e0d4bc');
        pop(ctx, t, 0.1, () => paper(ctx, cut(cloud(380, 180, 80), 111), C.cream, 0.6));
        pop(ctx, t, 0.3, () => drawHolstentor(ctx, 800, 760, 340, 1.6));
        pop(ctx, t, 0.6, () => paper(ctx, cut(wave(780, 8, 0.008, 3), 112), C.grass2, 2.4));
        // riders approaching
        pop(ctx, t, 1.0, () => { const x = 150 + easeOut(t / 6) * 300; paper(ctx, cut([[x - 60, 760], [x - 50, 700], [x + 40, 690], [x + 70, 650], [x + 80, 690], [x + 60, 760], [x + 40, 760], [x + 30, 720], [x - 30, 720], [x - 40, 760]], 113, 0.8, 8), C.ink, 3); paper(ctx, cut([...ellipse(x, 640, 18, 18, 12), [x + 12, 690], [x - 12, 690]], 114, 0.6, 8), C.ink, 3); });
      } },
      { d: 7, zh: '城門蓋在鬆軟的河岸地上，南塔在興建時就開始下沉，到今天仍然看得出傾斜。', de: 'Der Südturm sinkt', draw(ctx, t, T) {
        sky(ctx, '#cbd6e0', C.paper);
        const tilt = easeOut(t / 5) * 0.05;
        pop(ctx, t, 0.1, () => paper(ctx, cut(wave(720, 6, 0.01, 1), 121), '#a9926b', 1));
        pop(ctx, t, 0.3, () => { ctx.save(); ctx.translate(800, 760); ctx.rotate(-tilt); ctx.translate(-800, -760 - easeOut(t / 5) * 20); drawHolstentor(ctx, 800, 760, 330, 1.6); ctx.restore(); });
        pop(ctx, t, 0.5, () => paper(ctx, cut(wave(790, 10, 0.006, 2), 122), '#8d7656', 2.4));
        if (t > 2) { ctx.save(); ctx.strokeStyle = C.red; ctx.setLineDash([12, 10]); ctx.lineWidth = 4; ctx.globalAlpha = clamp(t - 2); ctx.beginPath(); ctx.moveTo(1010, 760); ctx.lineTo(1010, 300); ctx.stroke(); ctx.restore(); }
      } },
      { d: 8, zh: '1871 年修復後，朝城外的一面刻上「CONCORDIA DOMI FORIS PAX」——城內和睦，城外和平；朝城內的一面則是「S.P.Q.L.」。', de: 'Concordia domi foris pax', draw(ctx, t) {
        sky(ctx, '#2f4566', '#6e7f98');
        pop(ctx, t, 0.1, () => drawHolstentor(ctx, 800, 820, 420, 1.4));
        pop(ctx, t, 0.6, () => { paper(ctx, cut(rect(470, 520, 660, 64), 131, 1), C.ink, 2.6); ctx.save(); ctx.fillStyle = C.gold2; ctx.font = '600 38px Georgia, serif'; ctx.textAlign = 'center'; ctx.globalAlpha = clamp((t - 0.8) * 1.2); const txt = 'CONCORDIA DOMI FORIS PAX'; ctx.fillText(txt.slice(0, Math.floor(clamp((t - 0.8) / 3) * txt.length)), 800, 564); ctx.restore(); });
        pop(ctx, t, 0.3, () => paper(ctx, cut(rect(0, 820, 1600, 100), 132, 2), C.slate, 2.4));
      } },
      { d: 7, zh: '它曾印在德國 50 馬克紙鈔上，也成為 2006 年 2 歐元紀念硬幣的圖案。', de: 'Wahrzeichen der Stadt', draw(ctx, t, T) {
        sky(ctx, '#e8dcc4', C.paper2);
        const spin = Math.cos(T * 1.2);
        pop(ctx, t, 0.2, () => { ctx.save(); ctx.translate(800, 450); ctx.scale(Math.max(0.08, Math.abs(spin)), 1); paper(ctx, cut(ellipse(0, 0, 250, 250, 60), 141, 1), C.gold, 2.4); paper(ctx, cut(ellipse(0, 0, 175, 175, 50), 142, 1), '#c8c2b6', 2.6); if (spin > 0) drawHolstentor(ctx, 0, 70, 150, 2.8); else { ctx.fillStyle = C.ink; ctx.font = 'bold 140px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('2', 0, 50); } ctx.restore(); });
      } },
    ],
  },
  salzspeicher: {
    title: 'Die Salzspeicher', zh: '鹽倉', kind: '史實',
    summary: '在漢薩同盟時代，鹽是呂貝克最重要的貨物之一。鹽從南邊的呂內堡經由「舊鹽之路」運到呂貝克，先存放在特拉沃河畔的倉庫裡，再裝上漢薩船運往斯堪地那維亞；在那裡，鹽被用來醃漬大量捕獲的鯡魚，鯡魚再運回歐洲各地販售。今天霍爾斯滕門旁的六棟山牆倉庫建於 16 至 18 世紀，是這段貿易留下的見證。',
    scenes: [
      { d: 7, zh: '南邊的呂內堡出產白色的鹽，一車車沿著「舊鹽之路」運往北方。', de: 'Die Alte Salzstraße', draw(ctx, t, T) {
        sky(ctx, '#d7dde0', C.paper); sun(ctx, 260, 200, 55);
        pop(ctx, t, 0.1, () => paper(ctx, cut(wave(560, 40, 0.003, 0), 151), C.grass, 0.8));
        pop(ctx, t, 0.3, () => paper(ctx, cut(wave(660, 25, 0.004, 2), 152), C.grass2, 1.4));
        const x = -200 + (t / 7) * 1500;
        pop(ctx, t, 0.5, () => { paper(ctx, cut(rect(x, 600, 220, 70), 153), C.wood, 2.4); for (let i = 0; i < 3; i++) paper(ctx, cut(barrel(x + 40 + i * 70, 570, 60), 154 + i), C.salt, 2.6); for (const wx of [x + 40, x + 180]) paper(ctx, cut(ellipse(wx, 680, 30, 30, 16), 157), C.ink, 2.8);
          paper(ctx, cut([[x + 240, 640], [x + 260, 580], [x + 330, 570], [x + 360, 540], [x + 372, 572], [x + 350, 640], [x + 330, 640], [x + 320, 610], [x + 270, 612], [x + 262, 640]], 158, 0.8, 8), C.ink, 2.8); });
        pop(ctx, t, 0.4, () => paper(ctx, cut(wave(720, 8, 0.01, 5), 159), '#a98d63', 2));
      } },
      { d: 7, zh: '到了呂貝克，鹽先存進特拉沃河畔的倉庫。', de: 'An der Trave', draw(ctx, t) {
        sky(ctx, '#c9d5de', C.paper);
        pop(ctx, t, 0.1, () => { const cols = [C.brick, C.brick2, C.brick3, C.brick, C.brick2, C.brick3]; for (let i = 0; i < 6; i++) { const x = 230 + i * 190; paper(ctx, cut(steppedHouse(x, 640, 180, 230 + (i % 2) * 30, 5), 161 + i), cols[i], 1.4 + i * 0.05); windows(ctx, x, 640, 180, 230 + (i % 2) * 30, 4, 3); } });
        pop(ctx, t, 0.4, () => { paper(ctx, cut(wave(660, 8, 0.01, 1), 170), C.sea, 2); paper(ctx, cut(wave(700, 10, 0.008, 3), 171), C.sea2, 2.4); });
      } },
      { d: 7, zh: '漢薩商船載著鹽，橫越波羅的海駛向斯堪地那維亞。', de: 'Über die Ostsee', draw(ctx, t, T) {
        sky(ctx, '#b8c9d6', '#e7ddc8');
        pop(ctx, t, 0.1, () => paper(ctx, cut(cloud(1200, 200, 90), 181), C.cream, 0.6));
        pop(ctx, t, 0.2, () => paper(ctx, cut(wave(560, 14, 0.006, T * 0.8), 182), C.sea, 1));
        drawKogge(ctx, 300 + easeOut(t / 7) * 900, 560, 160, Math.sin(T * 1.6) * 0.04, 1.6);
        pop(ctx, t, 0.3, () => paper(ctx, cut(wave(640, 18, 0.005, T * 1.1 + 2), 183), C.sea2, 2.4));
        pop(ctx, t, 0.4, () => paper(ctx, cut(wave(740, 22, 0.004, T * 1.3 + 4), 184), C.navy2, 3));
      } },
      { d: 7, zh: '北方漁民用鹽醃漬大量捕到的鯡魚，鯡魚再運回歐洲各地，呂貝克因此富裕起來。', de: 'Salz gegen Hering', draw(ctx, t, T) {
        sky(ctx, '#c4d3df', C.paper);
        pop(ctx, t, 0.1, () => paper(ctx, cut(wave(500, 10, 0.006, T), 191), C.sea, 1));
        for (let i = 0; i < 9; i++) { const x = ((i * 190 + T * 120 * (i % 2 ? 1 : -1)) % 1800 + 1800) % 1800 - 100, y = 560 + (i % 3) * 70 + Math.sin(T * 3 + i) * 10; pop(ctx, t, 0.3 + i * 0.1, () => paper(ctx, cut(fish(x, y, 70, i % 2 ? 1 : -1), 192 + i, 0.6, 8), '#9fb3bf', 2)); }
        pop(ctx, t, 1.4, () => { for (let i = 0; i < 5; i++) paper(ctx, cut(barrel(560 + i * 120, 800, 90), 205 + i), C.wood, 2.8); });
        pop(ctx, t, 2.2, () => { ctx.save(); ctx.fillStyle = C.gold; for (let i = 0; i < 7; i++) { const y = 260 + Math.sin(T * 2 + i) * 8; paper(ctx, cut(ellipse(520 + i * 90, y, 32, 32, 18), 211 + i, 0.6), C.gold, 2.6); } ctx.restore(); });
      } },
      { d: 7, zh: '六棟建於 16 至 18 世紀的鹽倉，至今仍並排在霍爾斯滕門旁的河岸。', de: 'Die Salzspeicher heute', draw(ctx, t, T) {
        sky(ctx, '#e0c48e', '#efe2c7'); sun(ctx, 1400, 260, 70, '#f0b45e');
        pop(ctx, t, 0.1, () => { const cols = [C.brick, C.brick2, C.brick3, C.brick, C.brick2, C.brick3]; for (let i = 0; i < 6; i++) { const x = 180 + i * 170; paper(ctx, cut(i === 2 ? gableHouse(x, 640, 160, 260, 0.6) : steppedHouse(x, 640, 160, 250 + (i % 2) * 30, 5), 221 + i), cols[i], 1.4); windows(ctx, x, 640, 160, 250, 4, 3); } });
        pop(ctx, t, 0.4, () => { paper(ctx, cut(wave(660, 6, 0.01, 1), 230), '#5f86a0', 2); });
        pop(ctx, t, 0.4, () => { ctx.save(); ctx.beginPath(); ctx.rect(0, 668, 1600, 200); ctx.clip(); ctx.globalAlpha = 0.22; ctx.translate(0, 1316); ctx.scale(1, -1); const cols = [C.brick, C.brick2, C.brick3, C.brick, C.brick2, C.brick3]; for (let i = 0; i < 6; i++) { const x = 180 + i * 170; pathOf(ctx, i === 2 ? gableHouse(x, 640, 160, 260, 0.6) : steppedHouse(x, 640, 160, 250 + (i % 2) * 30, 5)); ctx.fillStyle = cols[i]; ctx.fill(); } ctx.restore();
          ctx.save(); ctx.strokeStyle = 'rgba(240,235,220,0.35)'; ctx.lineWidth = 3; for (let y = 690; y < 860; y += 26) { ctx.beginPath(); for (let x = 0; x <= 1600; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.02 + y + T * 2) * 3); ctx.stroke(); } ctx.restore(); });
      } },
    ],
  },
  st_marien: {
    title: 'St. Marien zu Lübeck', zh: '聖瑪利亞教堂', kind: '史實',
    summary: '聖瑪利亞教堂約在 1277 至 1351 年間建成，由呂貝克富裕的商人市民出資，刻意蓋在市政廳和市集旁邊，象徵市民的力量。它是北德「磚造哥德式」建築的典範，日後波羅的海沿岸許多教堂都以它為樣本。1942 年 3 月 28 日至 29 日夜間（棕枝主日）的空襲中，教堂起火，南塔的大鐘墜落摔碎。戰後教堂重建，但碎裂的大鐘被保留在原地，作為反戰的紀念。',
    scenes: [
      { d: 7, zh: '十三世紀，呂貝克的商人決定在市集旁建一座屬於市民的大教堂。', de: 'Die Kirche der Bürger', draw(ctx, t) {
        sky(ctx, '#d0d9e1', C.paper);
        pop(ctx, t, 0.2, () => { for (const h of skyline(760, 17, 120)) paper(ctx, cut(h.pts, h.x | 0), h.col, 1); });
        pop(ctx, t, 0.5, () => { for (const p of churchTwin(560, 760, 260)) paper(ctx, cut(p.pts, 241), p.col, 1.6); });
        pop(ctx, t, 1.0, () => { for (let i = 0; i < 5; i++) { const x = 300 + i * 260; paper(ctx, cut([...ellipse(x, 700, 20, 20, 12), [x + 26, 760], [x + 34, 840], [x - 34, 840], [x - 26, 760]], 250 + i, 0.6, 8), [C.navy2, C.red, C.copper2, C.wood, C.navy][i], 2.6); } });
        pop(ctx, t, 0.8, () => paper(ctx, cut(rect(0, 840, 1600, 80), 256, 2), C.slate, 2.4));
      } },
      { d: 7, zh: '高聳的磚造哥德式教堂成了典範，波羅的海沿岸許多城市都照著它蓋。', de: 'Mutter der Backsteingotik', draw(ctx, t, T) {
        sky(ctx, '#bfcbd6', '#e4d8c0');
        pop(ctx, t, 0.1, () => paper(ctx, cut(wave(640, 22, 0.004, 1), 269), '#a9b79a', 0.6));   // distant Baltic coastline
        for (let i = 0; i < 5; i++) pop(ctx, t, 0.6 + i * 0.4, () => { const s = 55, xs = [120, 300, 1080, 1260, 1430], x = xs[i], b = 650 + Math.sin(x * 0.004 + 1) * 22; for (const p of churchTwin(x, b, s, '#b06a52', '#7fae99')) paper(ctx, cut(p.pts, 270 + i), p.col, 0.7); });
        pop(ctx, t, 0.2, () => { for (const p of churchTwin(560, 800, 270)) paper(ctx, cut(p.pts, 261), p.col, 1.6); });
        pop(ctx, t, 0.3, () => paper(ctx, cut(wave(820, 8, 0.008, 2), 280), C.grass2, 2.4));
      } },
      { d: 8, zh: '1942 年 3 月棕枝主日的夜裡，空襲引發大火，教堂陷入火海。', de: 'Palmsonntag 1942', draw(ctx, t, T) {
        sky(ctx, C.night, '#3a2530'); stars(ctx, 40, 3, T);
        pop(ctx, t, 0.1, () => { for (const p of churchTwin(560, 780, 280, '#3a2a2a', '#2a3a35')) paper(ctx, cut(p.pts, 291), p.col, 1.6); });
        if (t > 1.2) for (let i = 0; i < 7; i++) { ctx.save(); ctx.globalAlpha = clamp(t - 1.2); paper(ctx, cut(flame(520 + i * 90, 780 - (i % 2) * 120, 90 + (i % 3) * 30, T + i), 300 + i, 1), i % 2 ? C.fire : C.fire2, 2.4); ctx.restore(); }
        pop(ctx, t, 0.3, () => paper(ctx, cut(rect(0, 780, 1600, 140), 310, 2), '#241c22', 2.6));
      } },
      { d: 8, zh: '南塔的大鐘從高處墜落、摔碎在地上。戰後教堂重建，碎鐘被留在原地，提醒世人和平的可貴。', de: 'Die Gedenkkapelle mit den Glocken', draw(ctx, t, T) {
        sky(ctx, '#d7d2c8', C.paper);
        pop(ctx, t, 0.1, () => paper(ctx, cut(rect(300, 120, 1000, 680), 321, 2, 30), C.brick, 1.2));
        pop(ctx, t, 0.2, () => paper(ctx, cut([...ellipse(800, 380, 260, 260, 30, Math.PI, Math.PI * 2), [1060, 800], [540, 800]], 322, 1.4), '#e9e1cf', 1.8));
        const f = easeOut(t / 1.5);
        pop(ctx, t, 0, () => { ctx.save(); ctx.translate(800, 160 + f * 560); ctx.rotate(f * 0.4); paper(ctx, cut(bell(0, 0, 200), 323), C.copper2, 3); ctx.restore(); });
        if (t > 1.5) { for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.4, r = easeOut((t - 1.5) / 0.8) * 120; pop(ctx, t, 1.5, () => paper(ctx, cut(rock(800 + Math.cos(a) * r, 770 + Math.sin(a) * r * 0.2, 26, 330 + i), 330 + i), C.copper2, 3.2)); } }
        pop(ctx, t, 0.3, () => paper(ctx, cut(rect(0, 800, 1600, 120), 340, 2), C.slate, 2.4));
        if (t > 3) { ctx.save(); ctx.globalAlpha = clamp((t - 3) * 0.8); paper(ctx, cut(ellipse(800, 250, 50, 50, 20), 341), C.gold2, 2); ctx.restore(); }
      } },
    ],
  },
  rathaus: {
    title: 'Das Lübecker Rathaus', zh: '呂貝克市政廳', kind: '史實',
    summary: '呂貝克市政廳是德國最古老、至今仍在使用的市政廳之一，從 13 世紀起逐步擴建。正立面的黑色釉面磚和開著圓孔的「防風牆」讓它很好認；後來又加上白色的文藝復興式拱廊。在漢薩同盟的全盛時期，同盟城市的代表常在呂貝克開會（Hansetag），討論貿易與政治，呂貝克也被稱為「漢薩之后」。',
    scenes: [
      { d: 7, zh: '市政廳緊鄰市集廣場，黑色釉面磚與開著圓孔的高牆讓它一眼就認得出來。', de: 'Am Markt', draw(ctx, t) {
        sky(ctx, '#d0dae2', C.paper);
        pop(ctx, t, 0.2, () => { paper(ctx, cut(rect(260, 300, 1080, 440), 351, 1.5), '#2d2a2c', 1.4); const holes = [[400, 380], [560, 380], [720, 380], [880, 380], [1040, 380], [1200, 380]]; ctx.save(); ctx.fillStyle = '#cfd9e1'; for (const [x, y] of holes) { ctx.beginPath(); ctx.arc(x, y, 46, 0, 7); ctx.fill(); } ctx.restore(); for (let i = 0; i < 7; i++) { const x = 300 + i * 167; paper(ctx, cut(spire(x, 300, 40, 150), 352 + i), C.copper, 1.8); } });
        pop(ctx, t, 0.7, () => { paper(ctx, cut(rect(360, 600, 880, 140), 360, 1), C.cream, 2.2); ctx.save(); ctx.fillStyle = '#3a3330'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(390 + i * 122, 740); ctx.lineTo(390 + i * 122, 660); ctx.arc(430 + i * 122, 660, 40, Math.PI, 0); ctx.lineTo(470 + i * 122, 740); ctx.fill(); } ctx.restore(); });
        pop(ctx, t, 0.5, () => paper(ctx, cut(rect(0, 740, 1600, 180), 361, 2), C.slate, 2.4));
      } },
      { d: 8, zh: '漢薩同盟的各城代表曾聚集在呂貝克開會，商議貿易與航運——呂貝克因此被稱為「漢薩之后」。', de: 'Königin der Hanse', draw(ctx, t, T) {
        sky(ctx, '#e3d3b0', C.paper2);
        pop(ctx, t, 0.2, () => paper(ctx, cut(ellipse(800, 620, 520, 120, 40), 371, 1.5), C.wood, 1.6));
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, x = 800 + Math.cos(a) * 600, y = 600 + Math.sin(a) * 160; pop(ctx, t, 0.6 + i * 0.15, () => paper(ctx, cut([...ellipse(x, y - 120, 30, 30, 14), [x + 40, y - 80], [x + 50, y + 20], [x - 50, y + 20], [x - 40, y - 80]], 372 + i, 0.6, 8), [C.navy2, C.red, C.copper2, C.wood, C.navy, C.brick, C.slate, C.gold][i], 2.2 + Math.sin(a) * 0.5)); }
        pop(ctx, t, 1.8, () => { ctx.save(); ctx.translate(800, 300); ctx.rotate(Math.sin(T) * 0.05); paper(ctx, cut([[-120, -80], [120, -80], [120, 60], [0, 110], [-120, 60]], 390), C.red, 2.6); paper(ctx, cut([[-120, -10], [120, -10], [120, 60], [0, 110], [-120, 60]], 391), C.cream, 2.7); ctx.restore(); });
      } },
    ],
  },
  dom: {
    title: 'Der Lübecker Dom', zh: '呂貝克主教座堂', kind: '史實',
    summary: '1173 年，薩克森與巴伐利亞公爵「獅子亨利」為呂貝克主教座堂奠基，它因此是城裡最古老的大教堂。最初是羅馬式教堂，之後擴建成哥德式。它位在舊城島的南端，旁邊是 Mühlenteich（磨坊池），和北邊市民出資的聖瑪利亞教堂遙遙相對。',
    scenes: [
      { d: 7, zh: '1173 年，獅子亨利為呂貝克主教座堂奠下第一塊基石。', de: 'Heinrich der Löwe, 1173', draw(ctx, t, T) {
        sky(ctx, '#d3dae0', C.paper);
        pop(ctx, t, 0.2, () => { for (let i = 0; i < 5; i++) paper(ctx, rect(980 + i * 70, 380, 6, 380), C.wood, 1.2); paper(ctx, rect(960, 420, 320, 6), C.wood, 1.2); });
        pop(ctx, t, 0.5, () => henry(ctx, 660, 770, 440, T, 'church', 2));
        pop(ctx, t, 1.4, () => { paper(ctx, cut(rect(820, 690, 150, 80), 406), '#b9b3a8', 2.6); ctx.save(); ctx.fillStyle = C.ink; ctx.globalAlpha = 0.7; ctx.font = '600 26px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('MCLXXIII', 895, 740); ctx.restore(); });
        pop(ctx, t, 0.4, () => paper(ctx, cut(rect(0, 760, 1600, 160), 407, 2), C.grass2, 2.4));
      } },
      { d: 7, zh: '教堂從羅馬式擴建成哥德式，雙塔矗立在舊城島的南端、磨坊池畔。', de: 'Am Mühlenteich', draw(ctx, t) {
        sky(ctx, '#e6cfa0', '#efe3c9'); sun(ctx, 1320, 240, 60, '#f0b45e');
        pop(ctx, t, 0.1, () => { for (const p of churchTwin(600, 650, 185, C.brick2, C.copper2)) paper(ctx, cut(p.pts, 411), p.col, 1.4); });
        pop(ctx, t, 0.4, () => paper(ctx, cut(wave(650, 6, 0.01, 1), 412), '#6f94ab', 2));
        pop(ctx, t, 0.5, () => { ctx.save(); ctx.beginPath(); ctx.rect(0, 655, 1600, 170); ctx.clip(); ctx.globalAlpha = 0.22; ctx.translate(0, 1306); ctx.scale(1, -1); for (const p of churchTwin(600, 650, 185, C.brick2, C.copper2)) { pathOf(ctx, p.pts); ctx.fillStyle = p.col; ctx.fill(); } ctx.restore(); });
        pop(ctx, t, 0.7, () => { paper(ctx, cut(rect(0, 820, 1600, 100), 413, 2), C.grass2, 2.6); });
      } },
    ],
  },
  niederegger: {
    title: 'Lübecker Marzipan', zh: '呂貝克杏仁膏', kind: '傳說＋史實',
    summary: '呂貝克流傳一個說法：15 世紀初一場饑荒中，城裡缺糧，只剩倉庫裡的杏仁和糖，麵包師便把兩者磨碎做成「杏仁麵包」救急——這就是杏仁膏的由來（此為傳說，杏仁膏其實更早就從東方經威尼斯傳入歐洲）。可以確定的是：1806 年，Johann Georg Niederegger 在市政廳對面開了自己的店，Niederegger 從此成為呂貝克杏仁膏最有名的品牌，本店至今仍在 Breite Straße 89。',
    scenes: [
      { d: 7, zh: '傳說在一場饑荒中，城裡只剩杏仁和糖……', de: 'Eine Legende', draw(ctx, t, T) {
        sky(ctx, '#bfc4c8', '#ded6c6');
        pop(ctx, t, 0.2, () => { for (const h of skyline(700, 23, 110)) paper(ctx, cut(h.pts, h.x | 0), h.col, 1); });
        pop(ctx, t, 0.6, () => { for (let i = 0; i < 4; i++) paper(ctx, cut(rect(420 + i * 210, 560, 170, 180), 421 + i), C.wood, 2); });
        for (let i = 0; i < 10; i++) pop(ctx, t, 1 + i * 0.12, () => paper(ctx, cut(ellipse(460 + (i % 5) * 160, 520 - Math.floor(i / 5) * 40, 26, 14, 14), 430 + i, 0.5), '#c9a476', 2.4));
        pop(ctx, t, 0.4, () => paper(ctx, cut(rect(0, 740, 1600, 180), 440, 2), C.slate, 2.4));
      } },
      { d: 7, zh: '麵包師把杏仁和糖磨碎、揉成甜甜的「杏仁麵包」，讓大家度過難關。', de: 'Marzipan – Mandeln und Zucker', draw(ctx, t, T) {
        sky(ctx, '#e8dcc2', C.paper);
        pop(ctx, t, 0.2, () => paper(ctx, cut(ellipse(800, 650, 360, 90, 40), 451, 1), C.wood, 1.6));
        const roll = Math.sin(T * 3) * 40;
        pop(ctx, t, 0.6, () => paper(ctx, cut(ellipse(800 + roll, 590, 220, 60, 30), 452, 1), '#e9cf9b', 2.2));
        pop(ctx, t, 1.0, () => paper(ctx, cut(rect(560 + roll, 520, 480, 26), 453, 0.6), C.wood, 2.6));
        for (let i = 0; i < 5; i++) pop(ctx, t, 1.8 + i * 0.3, () => paper(ctx, cut(ellipse(480 + i * 160, 380, 60, 40, 18), 460 + i, 0.8), ['#e9cf9b', '#d9a86a', '#e9cf9b', '#c48a5a', '#e9cf9b'][i], 2.4));
      } },
      { d: 8, zh: '1806 年，Johann Georg Niederegger 在市政廳對面開店，呂貝克杏仁膏從此聞名世界。', de: 'Niederegger, seit 1806', draw(ctx, t) {
        sky(ctx, '#d6dde3', C.paper);
        pop(ctx, t, 0.2, () => { paper(ctx, cut(rect(420, 260, 760, 480), 471, 1.4), C.red, 1.4); windows(ctx, 420, 600, 760, 300, 2, 5, C.cream, 0.85); paper(ctx, cut(rect(420, 600, 760, 140), 472, 1), C.gold, 1.8); });
        pop(ctx, t, 0.8, () => { ctx.save(); ctx.fillStyle = C.ink; ctx.font = '600 58px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('1806', 800, 690); ctx.restore(); });
        pop(ctx, t, 0.4, () => paper(ctx, cut(rect(0, 740, 1600, 180), 473, 2), C.slate, 2.4));
      } },
    ],
  },
};

STORIES.musikhochschule = {
  title: 'Musik an der Petersgrube', zh: '呂貝克音樂學院與布拉姆斯', kind: '史實',
  summary: '呂貝克音樂學院（Musikhochschule Lübeck）位在聖伯多祿教堂旁的大彼得溝街（Große Petersgrube），校舍由一整排歷史老屋改建，走在街上常能聽到窗內傳出的練琴聲。學院附設的布拉姆斯研究所（Brahms-Institut）收藏大量與作曲家約翰尼斯·布拉姆斯有關的手稿、書信與照片，是重要的布拉姆斯研究中心；學院每年也舉辦以布拉姆斯為主題的音樂節。布拉姆斯 1833 年出生於另一座漢薩城市漢堡，作品包括四首交響曲與《德意志安魂曲》。特拉沃河畔的 An der Obertrave 也有一座他的雕像。（研究所成立年份、館藏數量等細節待核對）',
  scenes: [
    { d: 8, zh: '聖伯多祿教堂旁的大彼得溝街，一整排老房子裡藏著一所音樂學院。', de: 'Große Petersgrube', draw(ctx, t, T) {
      sky(ctx, '#d3dce3', C.paper); sun(ctx, 1350, 170, 50);
      pop(ctx, t, 0.1, () => paper(ctx, cut(spire(1180, 520, 120, 440), 701), C.copper, 0.8));
      pop(ctx, t, 0.2, () => paper(ctx, cut(rect(1120, 380, 120, 360), 702), C.brick2, 0.9));
      pop(ctx, t, 0.4, () => { const cols = [C.cream, '#e3c9a0', C.brick, '#d9b98a', C.paper2, C.brick3, '#c98d6b']; for (let i = 0; i < 7; i++) { const x = 60 + i * 150, h = 230 + (i % 3) * 30; paper(ctx, cut(i % 2 ? steppedHouse(x, 760, 140, h, 4) : gableHouse(x, 760, 140, h, 0.75), 703 + i), cols[i], 1.4); windows(ctx, x, 760, 140, h, 3, 3, i === 3 && Math.sin(T * 2) > 0 ? C.gold2 : C.ink); } });
      for (let i = 0; i < 5; i++) { const ph = (T * 0.4 + i * 0.2) % 1; noteGlyph(ctx, 560 + i * 40 + Math.sin(T + i) * 20, 480 - ph * 300, 14, `rgba(29,34,48,${1 - ph})`); }
      pop(ctx, t, 0.3, () => paper(ctx, cut(rect(0, 760, 1600, 160), 712, 2), C.slate, 2.4));
    } },
    { d: 8, zh: '約翰尼斯·布拉姆斯，1833 年出生在另一座漢薩城市——漢堡。', de: 'Johannes Brahms, *1833 in Hamburg', draw(ctx, t, T) {
      sky(ctx, '#2f4566', '#5e6f88'); stars(ctx, 30, 9, T);
      pop(ctx, t, 0.2, () => { for (const h of skyline(760, 31, 90)) paper(ctx, cut(h.pts, h.x | 0), h.col, 1); });
      pop(ctx, t, 0.6, () => { const x = 800; paper(ctx, cut([...ellipse(x, 380, 70, 80, 24), [x + 60, 430], [x + 75, 520], [x + 40, 560], [x - 40, 560], [x - 75, 520], [x - 60, 430]], 720, 1), C.cream, 2); paper(ctx, cut(ellipse(x, 345, 72, 55, 22, Math.PI, Math.PI * 2), 721), '#7a6a5a', 2.2); paper(ctx, cut([...ellipse(x, 450, 60, 70, 20, 0, Math.PI), [x - 60, 440], [x + 60, 440]], 722), '#9a8a78', 2.2); paper(ctx, cut([[x - 150, 760], [x - 130, 600], [x - 60, 560], [x + 60, 560], [x + 130, 600], [x + 150, 760]], 723, 1), C.ink, 2.2); });
    } },
    { d: 8, zh: '他寫下四首交響曲與《德意志安魂曲》，是十九世紀德國最重要的作曲家之一。', de: 'Vier Sinfonien · Ein deutsches Requiem', draw(ctx, t, T) {
      sky(ctx, '#e8dcc2', C.paper2);
      pop(ctx, t, 0.2, () => paper(ctx, cut(piano(800, 700, 320), 730, 1), C.ink, 2));
      pop(ctx, t, 0.3, () => { for (const x of [540, 1060]) paper(ctx, cut(rect(x, 590, 14, 110), 731), C.ink, 2); });
      // sheet music sliding across
      pop(ctx, t, 0.6, () => { paper(ctx, cut(rect(560, 180, 480, 300), 732, 1), C.cream, 2.4); ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; for (let r = 0; r < 3; r++) for (let l = 0; l < 5; l++) { ctx.beginPath(); ctx.moveTo(590, 220 + r * 90 + l * 10); ctx.lineTo(1010, 220 + r * 90 + l * 10); ctx.stroke(); } ctx.restore(); for (let i = 0; i < 18; i++) noteGlyph(ctx, 610 + (i % 9) * 45, 260 + Math.floor(i / 9) * 90 - ((i * 7) % 5) * 5, 7, C.ink); });
      for (let i = 0; i < 6; i++) { const ph = (T * 0.35 + i / 6) % 1; noteGlyph(ctx, 300 + i * 180, 560 - ph * 400, 16, `rgba(156,59,40,${1 - ph})`); }
    } },
    { d: 9, zh: '學院的布拉姆斯研究所收藏了大量布拉姆斯的手稿、書信與照片，世界各地的研究者都會來這裡。', de: 'Das Brahms-Institut', draw(ctx, t, T) {
      sky(ctx, '#d6dde3', C.paper);
      pop(ctx, t, 0.2, () => { paper(ctx, cut([[400, 760], [400, 420], [800, 280], [1200, 420], [1200, 760]], 740, 1.2), C.cream, 1.4); windows(ctx, 440, 760, 720, 300, 2, 6); paper(ctx, cut([[380, 430], [800, 270], [1220, 430], [1220, 445], [800, 290], [380, 445]], 741), C.slate, 1.6); });
      for (let i = 0; i < 6; i++) pop(ctx, t, 1 + i * 0.35, () => { ctx.save(); ctx.translate(250 + i * 220, 180 + Math.sin(T + i) * 10); ctx.rotate(Math.sin(i) * 0.15); paper(ctx, cut(rect(-55, -40, 110, 80), 750 + i, 0.6), C.salt, 2.8); ctx.strokeStyle = C.navy; ctx.lineWidth = 2; for (let l = 0; l < 4; l++) { ctx.beginPath(); ctx.moveTo(-40, -20 + l * 14); ctx.lineTo(40 - (l % 2) * 20, -20 + l * 14); ctx.stroke(); } ctx.restore(); });
      pop(ctx, t, 0.3, () => paper(ctx, cut(rect(0, 760, 1600, 160), 760, 2), C.grass2, 2.4));
    } },
    { d: 8, zh: '每年學院都舉辦以布拉姆斯為主題的音樂節，學生和音樂家在老城裡演奏他的作品。', de: 'Brahms-Festival', draw(ctx, t, T) {
      sky(ctx, C.night, '#2a2238'); stars(ctx, 50, 13, T);
      pop(ctx, t, 0.1, () => paper(ctx, cut([...ellipse(800, 700, 700, 120, 40, Math.PI, Math.PI * 2)], 770, 2), '#3a2a22', 1.4));
      for (let i = 0; i < 7; i++) pop(ctx, t, 0.4 + i * 0.15, () => paper(ctx, cut(person(400 + i * 130, 690, 110), 771 + i, 0.6, 8), C.ink, 2.2));
      pop(ctx, t, 0.8, () => paper(ctx, cut(piano(800, 700, 160), 780), C.ink, 2.4));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(800, 560, 10, 800, 560, 420); g.addColorStop(0, 'rgba(255,210,140,0.35)'); g.addColorStop(1, 'rgba(255,210,140,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1600, 900); ctx.restore();
      for (let i = 0; i < 8; i++) { const ph = (T * 0.3 + i / 8) % 1; noteGlyph(ctx, 500 + i * 80, 520 - ph * 380, 14, `rgba(225,194,122,${1 - ph})`); }
    } },
    { d: 8, zh: '在特拉沃河畔的 An der Obertrave，還能找到一座布拉姆斯的雕像。', de: 'An der Obertrave', draw(ctx, t, T) {
      sky(ctx, '#cbd6e0', C.paper); sun(ctx, 1320, 180, 55);
      pop(ctx, t, 0.1, () => { for (const h of skyline(560, 41, 90)) paper(ctx, cut(h.pts, h.x | 0), h.col, 1); });
      pop(ctx, t, 0.3, () => paper(ctx, cut(wave(600, 8, 0.01, T), 790), C.sea, 1.6));
      pop(ctx, t, 0.6, () => { paper(ctx, cut(rect(700, 640, 200, 130), 791), '#9a948c', 2.4); paper(ctx, cut([...ellipse(800, 420, 38, 42, 16), [835, 470], [870, 640], [730, 640], [765, 470]], 792, 0.8, 8), '#6a5a48', 2.6); });
      pop(ctx, t, 0.2, () => paper(ctx, cut(rect(0, 770, 1600, 150), 793, 2), C.slate, 2.4));
    } },
  ],
};
STORIES.brahms = STORIES.musikhochschule;

STORIES.hanse = {
  title: 'Königin der Hanse', zh: '漢薩之后', kind: '史實',
  summary: '漢薩同盟是中世紀北歐商人與城市的聯盟，掌控波羅的海與北海的貿易長達數百年。呂貝克 1226 年成為帝國自由市，憑著連接北海與波羅的海的地理位置，成為同盟的領頭城市，被稱為「漢薩之后」。同盟各城代表召開的「漢薩大會」（Hansetag）多半在呂貝克舉行；「呂貝克法」被波羅的海沿岸上百座城市採用。同盟在卑爾根、諾夫哥羅德、倫敦、布魯日設有大型商站。隨著大西洋航線興起與各國王權強化，同盟逐漸衰落，最後一次漢薩大會於 1669 年在呂貝克召開。直到今天，呂貝克仍自稱「漢薩城市」（Hansestadt），車牌字首就是 HL——Hansestadt Lübeck。',
  scenes: [
    { d: 8, zh: '中世紀的北歐，商人們結成一個聯盟，一起保護貿易與航路——這就是漢薩同盟。', de: 'Die Hanse', draw(ctx, t, T) {
      sky(ctx, '#b8c9d6', '#e7ddc8');
      pop(ctx, t, 0.1, () => paper(ctx, cut(wave(560, 14, 0.006, T * 0.8), 801), C.sea, 1));
      for (let i = 0; i < 3; i++) drawKogge(ctx, 260 + i * 480 + Math.sin(T * 0.4 + i) * 30, 560 + i * 10, 120 + i * 20, Math.sin(T * 1.6 + i) * 0.04, 1.4 + i * 0.3);
      pop(ctx, t, 0.3, () => paper(ctx, cut(wave(680, 20, 0.005, T * 1.2 + 2), 802), C.sea2, 2.6));
    } },
    { d: 9, zh: '呂貝克位在北海與波羅的海之間的咽喉，1226 年成為帝國自由市，很快就領導整個同盟。', de: '1226 · Freie Reichsstadt', draw(ctx, t, T) { hanseMap(ctx, t, T, []);
      pop(ctx, t, 1.2, () => { ctx.save(); ctx.translate(640, 380); paper(ctx, cut([[-60, -80], [60, -80], [60, 30], [0, 80], [-60, 30]], 810), C.cream, 2.6); paper(ctx, cut([[-60, -25], [60, -25], [60, 30], [0, 80], [-60, 30]], 811), C.red, 2.7); paper(ctx, cut(ellipse(0, -100, 30, 22, 14), 812), C.gold, 2.8); ctx.restore(); }); } },
    { d: 10, zh: '同盟在卑爾根、諾夫哥羅德、倫敦、布魯日設立商站，鹽、鯡魚、毛皮、布料在航線上流動。', de: 'Kontore: Bergen · Nowgorod · London · Brügge', draw(ctx, t, T) {
      hanseMap(ctx, t, T, [['Bergen', 560, 120], ['Nowgorod', 1480, 200], ['London', 120, 560], ['Brügge', 230, 690], ['Visby', 1000, 300], ['Danzig', 1000, 560]]); } },
    { d: 9, zh: '各城代表在呂貝克召開「漢薩大會」，呂貝克的城市法典也被上百座城市採用。', de: 'Hansetag · Lübisches Recht', draw(ctx, t, T) {
      sky(ctx, '#e3d3b0', C.paper2);
      pop(ctx, t, 0.2, () => paper(ctx, cut(ellipse(800, 620, 520, 120, 40), 820, 1.5), C.wood, 1.6));
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, x = 800 + Math.cos(a) * 600, y = 600 + Math.sin(a) * 160; pop(ctx, t, 0.6 + i * 0.15, () => paper(ctx, cut(person(x, y + 30, 120), 821 + i, 0.6, 8), [C.navy2, C.red, C.copper2, C.wood, C.navy, C.brick, C.slate, C.gold][i], 2.2 + Math.sin(a) * 0.5)); }
      pop(ctx, t, 2.0, () => { ctx.save(); ctx.translate(800, 590); paper(ctx, cut(rect(-90, -60, 180, 120), 830), C.cream, 2.8); ctx.fillStyle = C.ink; ctx.font = '600 22px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('Lübisches', 0, -10); ctx.fillText('Recht', 0, 20); ctx.restore(); });
    } },
    { d: 9, zh: '大西洋航線興起、王權強化，同盟漸漸衰落；最後一次漢薩大會在 1669 年的呂貝克落幕。', de: '1669 · Der letzte Hansetag', draw(ctx, t, T) {
      sky(ctx, '#d9b98a', '#efe3c7'); sun(ctx, 800, 640, 120, '#f0a050');
      pop(ctx, t, 0.2, () => paper(ctx, cut(wave(640, 10, 0.006, T * 0.5), 840), C.sea, 1.6));
      drawKogge(ctx, 800 - easeOut(t / 9) * 400, 620, 130, Math.sin(T) * 0.03, 2);
      pop(ctx, t, 0.3, () => paper(ctx, cut(wave(700, 14, 0.005, T * 0.7 + 1), 841), C.sea2, 2.6));
    } },
    { d: 8, zh: '直到今天，呂貝克仍自稱「漢薩城市」，車牌上的 HL 就是 Hansestadt Lübeck 的縮寫。', de: 'Hansestadt Lübeck · HL', draw(ctx, t, T) {
      sky(ctx, '#cfd9e2', C.paper);
      pop(ctx, t, 0.2, () => { for (const h of skyline(700, 51, 110)) paper(ctx, cut(h.pts, h.x | 0), h.col, 1); });
      pop(ctx, t, 0.8, () => { paper(ctx, cut(rect(540, 380, 520, 120), 850, 1), '#f4f4f0', 2.6); paper(ctx, cut(rect(540, 380, 60, 120), 851, 0.6), '#2b4a9b', 2.7); ctx.save(); ctx.fillStyle = C.ink; ctx.font = '700 84px "DIN Alternate", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('HL · 1226', 840, 470); ctx.restore(); });
      pop(ctx, t, 0.3, () => paper(ctx, cut(rect(0, 700, 1600, 220), 852, 2), C.slate, 2.4));
    } },
  ],
};

STORIES.luebeck = {
  title: 'Lübeck – Eine Stadtgeschichte', zh: '呂貝克：一座城市的故事', kind: '史實（附說明）',
  summary: '呂貝克建在特拉沃河與瓦克尼茨河環抱的一座小島上。1143 年霍爾斯坦伯爵阿道夫二世建城；1159 年大火後，獅子亨利重新建城，1173 年為主教座堂奠基。1226 年，皇帝腓特烈二世授予帝國自由市地位，呂貝克隨即成為漢薩同盟的領頭城市。北德缺乏石材，人們燒製黏土磚來蓋教堂與商人屋，發展出影響整個波羅的海的「磚造哥德式」；鬆軟的河岸地則靠打入成排的橡木樁來承重。教堂屋頂與尖塔鋪的是銅板，銅在風雨中慢慢氧化，生成青綠色的銅鏽（patina），所以老城的屋頂和尖塔看起來是綠色的。漢薩衰落後，1806 年拿破崙的軍隊攻進呂貝克；1937 年依《大漢堡法》，呂貝克失去延續數百年的獨立地位，併入普魯士。1942 年 3 月棕枝主日的空襲燒毀了大片老城，三座大教堂嚴重受損。戰後居民一磚一瓦重建，1987 年舊城列入聯合國世界遺產。這座城市也孕育了諾貝爾文學獎得主湯瑪斯·曼（《布登勃洛克家族》）與諾貝爾和平獎得主維利·勃蘭特。',
  scenes: [
    { d: 9, zh: '在特拉沃河與瓦克尼茨河之間，有一座橢圓形的小島。', de: 'Zwischen Trave und Wakenitz', draw(ctx, t, T) { islandMap(ctx, t, T); } },
    { d: 9, zh: '1143 年，霍爾斯坦伯爵阿道夫二世在島上建立了呂貝克。', de: '1143 · Adolf II. von Schauenburg', draw(ctx, t, T) { islandMap(ctx, t, T);
      for (let i = 0; i < 8; i++) pop(ctx, t, 1 + i * 0.25, () => { const x = 680 + (i % 4) * 70, y = 360 + Math.floor(i / 4) * 120; paper(ctx, cut(gableHouse(x, y, 50, 40, 0.8), 901 + i, 0.6, 8), C.wood, 2); }); } },
    { d: 9, zh: '1159 年一場大火後，獅子亨利重新建城，1173 年為主教座堂奠下基石。', de: '1159 · Heinrich der Löwe', draw(ctx, t, T) {
      sky(ctx, '#d3dae0', C.paper);
      if (t < 3) for (let i = 0; i < 6; i++) paper(ctx, cut(flame(300 + i * 200, 760, 120, T + i), 910 + i), i % 2 ? C.fire : C.fire2, 1.4);
      pop(ctx, t, 3, () => henry(ctx, 1020, 770, 470, T, 'sword', 2));
      pop(ctx, t, 4, () => { for (const p of churchTwin(380, 760, 180, C.brick2, C.copper2)) paper(ctx, cut(p.pts, 922), p.col, 1.6); });
      pop(ctx, t, 0.2, () => paper(ctx, cut(rect(0, 760, 1600, 160), 923, 2), C.grass2, 2.4));
    } },
    { d: 9, zh: '1226 年，皇帝腓特烈二世授予呂貝克帝國自由市的地位，城市只聽命於皇帝。', de: '1226 · Reichsfreiheitsbrief', draw(ctx, t, T) {
      sky(ctx, '#e8dcc2', C.paper2);
      pop(ctx, t, 0.2, () => paper(ctx, cut(rect(500, 160, 600, 560), 930, 1.4), C.cream, 2));
      pop(ctx, t, 0.6, () => { ctx.save(); ctx.strokeStyle = 'rgba(29,34,48,0.65)'; ctx.lineWidth = 3; for (let l = 0; l < 14; l++) { ctx.beginPath(); ctx.moveTo(560, 220 + l * 30); ctx.lineTo(1040 - (l % 3) * 60, 220 + l * 30); ctx.stroke(); } ctx.restore(); });
      pop(ctx, t, 1.6, () => { paper(ctx, cut(ellipse(800, 680, 70, 70, 24), 931, 1), C.red, 2.8); paper(ctx, cut(ellipse(800, 680, 45, 45, 20), 932, 0.6), '#8a1f18', 3); });
    } },
    { d: 10, zh: '北德沒有石材，人們就燒製黏土磚，蓋出高聳的「磚造哥德式」教堂，影響了整個波羅的海沿岸。', de: 'Backsteingotik', draw(ctx, t, T) {
      sky(ctx, '#d0d9e1', C.paper);
      // brick kiln and stacks of bricks
      pop(ctx, t, 0.2, () => { paper(ctx, cut([[180, 760], [180, 560], [260, 480], [340, 560], [340, 760]], 940, 1), C.brick2, 1.6); paper(ctx, cut(flame(260, 700, 60, T), 941), C.fire, 1.8); });
      for (let r = 0; r < 6; r++) for (let c = 0; c < 4 - (r % 2); c++) pop(ctx, t, 0.6 + (r * 4 + c) * 0.05, () => paper(ctx, cut(rect(420 + c * 46 + (r % 2) * 23, 740 - r * 22, 42, 18), 950 + r * 4 + c, 0.4, 8), r % 3 ? C.brick : C.brick3, 2.2));
      pop(ctx, t, 1.8, () => { const p = churchTwin(900, 760, 260); const k = clamp((t - 1.8) / 6); for (const sh of p) { ctx.save(); ctx.beginPath(); ctx.rect(0, 760 - 760 * k, 1600, 900); ctx.clip(); paper(ctx, cut(sh.pts, 960), sh.col, 1.6); ctx.restore(); } });
      pop(ctx, t, 0.2, () => paper(ctx, cut(rect(0, 760, 1600, 160), 961, 2), C.grass2, 2.4));
    } },
    { d: 9, zh: '河岸的土地又濕又軟，工匠先把成排的橡木樁打進地裡，再把沉重的磚牆蓋在木樁上。', de: 'Auf Eichenpfählen gebaut', draw(ctx, t, T) {
      sky(ctx, '#cbd6e0', C.paper);
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 520, 1600, 400), 970, 2), '#7d6748', 1));
      piles(ctx, t, 560, 9, 420, 90);
      pop(ctx, t, 3.6, () => { paper(ctx, cut(rect(380, 470, 840, 90), 975), '#8a8a84', 2.2); paper(ctx, cut(steppedHouse(480, 470, 640, 200, 5), 976), C.brick, 2.4); windows(ctx, 480, 470, 640, 200, 3, 6); });
    } },
    { d: 11, zh: '教堂的屋頂和尖塔鋪著銅板。銅在風雨中慢慢氧化，生出一層青綠色的銅鏽——所以呂貝克的尖塔是綠色的。', de: 'Kupfer wird grün: die Patina', draw(ctx, t, T) {
      sky(ctx, '#b9c3cf', '#e4d8c0');
      // rain streaks
      ctx.save(); ctx.strokeStyle = 'rgba(70,90,110,0.35)'; ctx.lineWidth = 2; for (let i = 0; i < 60; i++) { const x = (i * 97 + T * 300) % 1700 - 50, y = (i * 53 + T * 600) % 900; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 12, y + 30); ctx.stroke(); } ctx.restore();
      pop(ctx, t, 0.2, () => { paper(ctx, cut(rect(640, 420, 320, 380), 980), C.brick, 1.4); copperSpire(ctx, t - 0.5, 800, 420, 320, '#c46a3c', '#5f9b86'); });
      ctx.save(); ctx.fillStyle = C.ink; ctx.font = '500 34px Georgia, serif'; ctx.textAlign = 'center'; ctx.globalAlpha = clamp((t - 2) * 0.7); ctx.fillText(t < 5 ? 'Cu' : 'Cu  →  Patina', 1250, 300); ctx.restore();
      pop(ctx, t, 0.2, () => paper(ctx, cut(rect(0, 800, 1600, 120), 981, 2), C.slate, 2.4));
    } },
    { d: 9, zh: '鹽、鯡魚、毛皮與布料讓商人致富，他們沿著街道蓋起一排排高窄的山牆屋。', de: 'Kaufmannshäuser', draw(ctx, t, T) {
      sky(ctx, '#d9e1e7', C.paper); sun(ctx, 1380, 170, 55);
      pop(ctx, t, 0.2, () => { const cols = [C.brick, C.brick2, C.cream, C.brick3, '#d8b98a', C.brick]; for (let i = 0; i < 6; i++) { const x = 160 + i * 215; paper(ctx, cut(i % 3 === 2 ? gableHouse(x, 740, 200, 300, 0.75) : steppedHouse(x, 740, 200, 300, 5), 990 + i), cols[i], 1.4); windows(ctx, x, 740, 200, 300, 4, 3); } });
      for (let i = 0; i < 4; i++) pop(ctx, t, 1.4 + i * 0.4, () => paper(ctx, cut(barrel(300 + i * 320, 800, 70), 1000 + i), C.wood, 2.6));
      pop(ctx, t, 0.3, () => paper(ctx, cut(rect(0, 740, 1600, 180), 1005, 2), C.slate, 2.2));
    } },
    { d: 9, zh: '1806 年，拿破崙戰爭打到北德，法軍攻進呂貝克，城市被佔領。', de: '1806 · Napoleon', draw(ctx, t, T) {
      sky(ctx, '#9aa3ad', '#d8cdb8');
      pop(ctx, t, 0.1, () => { for (const h of skyline(700, 61, 120)) paper(ctx, cut(h.pts, h.x | 0), h.col, 1); });
      for (let i = 0; i < 9; i++) { const x = -100 + i * 110 + easeOut(t / 7) * 500; pop(ctx, t, 0.5 + i * 0.1, () => paper(ctx, cut(soldier(x, 800, 160), 1010 + i, 0.6, 8), C.navy, 2.4)); }
      pop(ctx, t, 0.3, () => paper(ctx, cut(rect(0, 800, 1600, 120), 1020, 2), C.slate, 2.6));
    } },
    { d: 9, zh: '1937 年，依照《大漢堡法》，呂貝克失去延續數百年的自由市地位，併入普魯士。', de: '1937 · Groß-Hamburg-Gesetz', draw(ctx, t, T) {
      sky(ctx, '#c9c4bb', '#e8e1d2');
      pop(ctx, t, 0.2, () => paper(ctx, cut(rect(500, 180, 600, 520), 1030, 1.4), C.cream, 2));
      pop(ctx, t, 0.6, () => { ctx.save(); ctx.strokeStyle = 'rgba(29,34,48,0.6)'; ctx.lineWidth = 3; for (let l = 0; l < 12; l++) { ctx.beginPath(); ctx.moveTo(560, 240 + l * 30); ctx.lineTo(1040 - (l % 4) * 50, 240 + l * 30); ctx.stroke(); } ctx.restore(); });
      if (t > 2) { ctx.save(); ctx.globalAlpha = clamp(t - 2); ctx.strokeStyle = C.red; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(540, 220); ctx.lineTo(1060, 680); ctx.moveTo(1060, 220); ctx.lineTo(540, 680); ctx.stroke(); ctx.restore(); }
    } },
    { d: 10, zh: '1942 年 3 月棕枝主日的夜裡，空襲燒毀大片老城，聖瑪利亞教堂、主教座堂與聖伯多祿教堂都陷入火海。', de: 'Palmsonntag 1942', draw(ctx, t, T) {
      sky(ctx, C.night, '#3a2530'); stars(ctx, 40, 7, T);
      pop(ctx, t, 0.1, () => { for (const h of skyline(760, 71, 120)) paper(ctx, cut(h.pts, h.x | 0), '#3a2a2a', 1); for (const p of churchTwin(620, 760, 240, '#3a2a2a', '#2a3a35')) paper(ctx, cut(p.pts, 1040), p.col, 1.4); });
      if (t > 1) for (let i = 0; i < 10; i++) { ctx.save(); ctx.globalAlpha = clamp(t - 1); paper(ctx, cut(flame(120 + i * 150, 760 - (i % 3) * 60, 80 + (i % 4) * 25, T + i), 1050 + i), i % 2 ? C.fire : C.fire2, 2.2); ctx.restore(); }
      pop(ctx, t, 0.3, () => paper(ctx, cut(rect(0, 760, 1600, 160), 1060, 2), '#241c22', 2.6));
    } },
    { d: 10, zh: '戰後，居民一磚一瓦重建老城。碎裂的大鐘被留在教堂裡，提醒大家和平的可貴。', de: 'Wiederaufbau', draw(ctx, t, T) {
      sky(ctx, '#cfd9e2', C.paper); sun(ctx, 1320, 180, 55);
      pop(ctx, t, 0.1, () => { const p = churchTwin(560, 760, 250); const k = clamp(t / 7); for (const sh of p) { ctx.save(); ctx.beginPath(); ctx.rect(0, 760 - 700 * k, 1600, 900); ctx.clip(); paper(ctx, cut(sh.pts, 1070), sh.col, 1.6); ctx.restore(); } });
      pop(ctx, t, 0.4, () => { for (let i = 0; i < 5; i++) paper(ctx, rect(480 + i * 90, 300, 6, 460), C.wood, 2.2); for (let j = 0; j < 4; j++) paper(ctx, rect(470, 360 + j * 110, 380, 6), C.wood, 2.2); });
      for (let i = 0; i < 4; i++) pop(ctx, t, 1 + i * 0.3, () => paper(ctx, cut(person(1000 + i * 120, 760, 120), 1080 + i, 0.6, 8), [C.navy2, C.red, C.wood, C.copper2][i], 2.4));
      pop(ctx, t, 0.3, () => paper(ctx, cut(rect(0, 760, 1600, 160), 1090, 2), C.grass2, 2.4));
    } },
    { d: 9, zh: '1987 年，呂貝克舊城列入聯合國教科文組織世界遺產。', de: '1987 · UNESCO-Welterbe', draw(ctx, t, T) {
      sky(ctx, '#cfdbe6', C.paper);
      pop(ctx, t, 0.2, () => { drawHolstentor(ctx, 800, 760, 300, 1.6); });
      pop(ctx, t, 1.4, () => { ctx.save(); ctx.translate(800, 220); ctx.rotate(Math.sin(T) * 0.03); paper(ctx, cut(ellipse(0, 0, 110, 110, 40), 1100, 1), C.cream, 2.6); ctx.strokeStyle = C.navy; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, 80, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.rect(-50, -50, 100, 100); ctx.stroke(); ctx.restore(); });
      pop(ctx, t, 0.3, () => paper(ctx, cut(rect(0, 760, 1600, 160), 1101, 2), C.grass2, 2.4));
    } },
    { d: 10, zh: '這座城市也孕育了文學家湯瑪斯·曼與政治家維利·勃蘭特——兩人都是諾貝爾獎得主。', de: 'Thomas Mann · Willy Brandt', draw(ctx, t, T) {
      sky(ctx, '#e8dcc2', C.paper2);
      pop(ctx, t, 0.3, () => { for (let i = 0; i < 7; i++) paper(ctx, cut(rect(360 + i * 36, 420 - (i % 3) * 20, 32, 320 + (i % 3) * 20), 1110 + i, 0.5), [C.red, C.navy, C.copper2, C.wood, C.brick, C.navy2, C.gold][i], 2); ctx.save(); ctx.fillStyle = C.cream; ctx.font = '600 20px Georgia, serif'; ctx.translate(386, 700); ctx.rotate(-Math.PI / 2); ctx.fillText('Buddenbrooks', 0, 0); ctx.restore(); });
      pop(ctx, t, 1.2, () => { for (const [x, c] of [[1000, C.ink], [1200, C.navy]]) paper(ctx, cut(person(x, 760, 200), 1120 + x, 0.8, 8), c, 2.2); });
      pop(ctx, t, 2.2, () => { for (const x of [1000, 1200]) { paper(ctx, cut(ellipse(x, 380, 40, 40, 20), 1130 + x, 0.6), C.gold, 2.8); } });
      pop(ctx, t, 0.3, () => paper(ctx, cut(rect(0, 760, 1600, 160), 1140, 2), C.slate, 2.4));
    } },
    { d: 10, zh: '今天的呂貝克，有杏仁膏的香氣、音樂學院的琴聲、河上的船，以及八百多年的故事。', de: 'Lübeck heute', draw(ctx, t, T) {
      sky(ctx, '#e0c48e', '#efe2c7'); sun(ctx, 1380, 250, 70, '#f0b45e');
      pop(ctx, t, 0.1, () => { for (const p of churchTwin(820, 600, 150)) paper(ctx, cut(p.pts, 1150), p.col, 1); });
      pop(ctx, t, 0.2, () => { for (const h of skyline(620, 81, 90)) paper(ctx, cut(h.pts, h.x | 0), h.col, 1.2); });
      pop(ctx, t, 0.4, () => drawHolstentor(ctx, 330, 640, 160, 1.6));
      pop(ctx, t, 0.5, () => paper(ctx, cut(wave(650, 6, 0.01, T), 1151), '#5f86a0', 2));
      drawKogge(ctx, 1000 + Math.sin(T * 0.3) * 60, 670, 90, Math.sin(T * 1.4) * 0.03, 2.4);
      for (let i = 0; i < 5; i++) { const ph = (T * 0.3 + i / 5) % 1; noteGlyph(ctx, 600 + i * 90, 420 - ph * 260, 13, `rgba(29,34,48,${0.8 - ph * 0.8})`); }
    } },
  ],
};

STORIES.markt = STORIES.rathaus;

/* =============================== player =============================== */
// Subtitles: break after "，" (and other clause punctuation); pack clauses into lines that fit the stage width;
// a clause longer than a line is split into near-equal parts, so no line is left with one or two characters.
export function captionLines(text, max) {
  const W = (str) => { let w = 0; for (const ch of str) w += /[\x00-\x7f]/.test(ch) ? 0.55 : 1; return w; };
  // one line per clause: a new line starts after every "，" (and "。；！？")
  const clauses = (text.match(/[^，。；！？]+[，。；！？」』）]*/g) || [text]).map((c) => c.trim()).filter(Boolean);
  const out = [];
  for (const c of clauses) {
    if (W(c) <= max) { out.push(c); continue; }
    // too long: split into n near-equal parts, preferring "、" or spaces, never inside a run of Latin letters/digits
    const n = Math.ceil(W(c) / max), chars = [...c], target = W(c) / n;
    let cur = '', parts = [];
    for (let i = 0; i < chars.length; i++) {
      cur += chars[i];
      const next = chars[i + 1] || '', inWord = /[A-Za-z0-9.]/.test(chars[i]) && /[A-Za-z0-9.]/.test(next);
      const atSoft = /[、 ]/.test(chars[i]);
      if (parts.length < n - 1 && !inWord && (W(cur) >= target || (atSoft && W(cur) >= target * 0.7))) { parts.push(cur.trim()); cur = ''; }
    }
    if (cur.trim()) parts.push(cur.trim());
    out.push(...parts);
  }
  // never leave a tiny tail: merge a line of ≤ 3 characters into the line before it
  for (let i = out.length - 1; i > 0; i--) if (W(out[i]) <= 3) { out[i - 1] += out[i]; out.splice(i, 1); }
  return out;
}
let lastCap = '';
function setCaption(cap, text) {
  const st = cap.closest('.stage') || cap.parentElement, fs = parseFloat(getComputedStyle(cap).fontSize) || 16;
  const max = Math.max(8, Math.floor((st.clientWidth * 0.84) / (fs * 1.02)));
  const key = text + '|' + max; if (key === lastCap) return; lastCap = key;
  cap.textContent = '';
  captionLines(text, max).forEach((l, i) => { if (i) cap.appendChild(document.createElement('br')); cap.appendChild(document.createTextNode(l)); });
}

// a landmark can carry several films (e.g. St. Marien: the devil legend and Bach's visit)
export const STORY_AT = {};
export function storiesAt(id) { return [...new Set([...(STORIES[id] ? [id] : []), ...(STORY_AT[id] || [])])].filter((k) => STORIES[k]); }
export function hasStory(id) { return storiesAt(id).length > 0; }
let rafId = 0;
const audio = new StoryAudio();
// cinematic finish over every frame: warm light shaft, drifting dust in the light, vignette
function postFx(ctx, T, night) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen'; const sh = ctx.createLinearGradient(200, 0, 700, 900); sh.addColorStop(0, `rgba(255,226,170,${night ? 0.04 : 0.1 + Math.sin(T * 0.3) * 0.02})`); sh.addColorStop(1, 'rgba(255,226,170,0)');
  ctx.fillStyle = sh; ctx.beginPath(); ctx.moveTo(120, -20); ctx.lineTo(520, -20); ctx.lineTo(1100, 920); ctx.lineTo(420, 920); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 26; i++) { const h = Math.sin(i * 91.7) * 43758.5; const r = h - Math.floor(h), x = (r * 1700 + T * (8 + (i % 5) * 3)) % 1600, y = (Math.sin(T * 0.2 + i) * 0.5 + 0.5) * 820 + 40; ctx.globalAlpha = 0.25 + 0.25 * Math.sin(T * 1.3 + i); ctx.fillStyle = '#fff6df'; ctx.beginPath(); ctx.arc(x, y, 1.2 + (i % 3) * 0.8, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1; const v = ctx.createRadialGradient(800, 450, 380, 800, 450, 980); v.addColorStop(0, 'rgba(20,14,8,0)'); v.addColorStop(1, 'rgba(20,14,8,0.45)'); ctx.fillStyle = v; ctx.fillRect(0, 0, 1600, 900);
  ctx.restore();
}
export function openStory(id) {
  const S = STORIES[id]; if (!S) return;
  audio.start(S);
  const box = document.querySelector('#story'), cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
  const cap = box.querySelector('.cap'), capDe = box.querySelector('.capde'), bar = box.querySelector('.bar i'), playBtn = box.querySelector('.play'), desc = box.querySelector('.desc');
  box.querySelector('.ttl').textContent = S.title; box.querySelector('.ttlzh').textContent = `${S.zh}　·　${S.kind}`;
  desc.textContent = S.summary + (audio.credit ? `\n\n配樂：${audio.credit}。全曲為公版古典音樂，由程式即時合成演奏；音效亦為程式合成。` : '');
  const snd = box.querySelector('.snd'); const sndLabel = () => (snd.textContent = audio.muted ? '♪ 關' : '♪ 開'); sndLabel(); snd.onclick = () => { audio.setMuted(!audio.muted); sndLabel(); };
  const total = S.scenes.reduce((a, s) => a + s.d, 0) + 3;   // +3 s title card
  let time = 0, playing = true, last = performance.now();
  box.hidden = false; window.__storyOpen = true; requestAnimationFrame(() => box.classList.add('on'));
  const fit = () => { const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.width * 9 / 16 * dpr); };
  fit(); addEventListener('resize', fit);
  playBtn.textContent = '❚❚';
  playBtn.onclick = () => { playing = !playing; playBtn.textContent = playing ? '❚❚' : '▶'; if (playing && time >= total) time = 0; };
  box.querySelector('.again').onclick = () => { time = 0; playing = true; playBtn.textContent = '❚❚'; };
  box.querySelector('.seek').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); time = clamp((e.clientX - r.left) / r.width) * total; };
  const close = () => { window.__storyOpen = false; cancelAnimationFrame(rafId); audio.close(); box.classList.remove('on'); setTimeout(() => (box.hidden = true), 250); removeEventListener('resize', fit); removeEventListener('keydown', key, true); };
  const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } if (e.key === ' ') { e.preventDefault(); e.stopPropagation(); playBtn.click(); } };
  addEventListener('keydown', key, true);
  box.querySelector('.x').onclick = close;
  box.onclick = (e) => { if (e.target === box) close(); };
  window.__storySeek = (v) => { time = v; playing = false; };   // test hook
  for (const ev of ['pointerdown', 'touchstart', 'wheel']) box.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
  cancelAnimationFrame(rafId);
  const loop = (now) => {
    rafId = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; if (playing) time = Math.min(total, time + dt);
    if (time >= total && playing) { playing = false; playBtn.textContent = '▶'; }
    const k = cv.width / 1600; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, 1600, 900);
    bar.style.width = (time / total * 100) + '%';
    if (time < 3) {   // title card
      sky(ctx, C.navy, C.night);
      ctx.save(); ctx.globalAlpha = clamp(time / 0.8); ctx.fillStyle = C.gold2; ctx.textAlign = 'center';
      ctx.font = `64px "UnifrakturMaguntia", "Old English Text MT", Georgia, serif`; ctx.fillText(S.title, 800, 420);
      ctx.font = `500 34px "Noto Sans TC", sans-serif`; ctx.fillStyle = C.cream; ctx.fillText(S.zh, 800, 490);
      ctx.font = `400 22px "IBM Plex Mono", monospace`; ctx.globalAlpha *= 0.75; ctx.fillText(S.kind === '傳說' ? 'EINE LÜBECKER SAGE · 呂貝克傳說' : 'AUS DER GESCHICHTE LÜBECKS · 呂貝克的歷史', 800, 540); ctx.globalAlpha = 0.6; ctx.fillText(`${Math.round(total)} 秒`, 800, 590);
      ctx.restore(); postFx(ctx, time, true); frameBorder(ctx); cap.textContent = ''; lastCap = ''; capDe.textContent = ''; audio.update(time, playing, -1); return;
    }
    let tt = time - 3, i = 0; while (i < S.scenes.length - 1 && tt > S.scenes[i].d) { tt -= S.scenes[i].d; i++; }
    const sc = S.scenes[i];
    // camera: slow push-in and drift; cross-fade between scenes
    ctx.save(); const z = 1 + tt / sc.d * 0.05; ctx.translate(800, 450); ctx.scale(z, z); ctx.translate(-800 - tt * 4, -450);
    sc.draw(ctx, tt, time); ctx.restore();
    postFx(ctx, time, false); audio.update(time, playing, i);
    const fadeIn = clamp(tt / 0.5), fadeOut = i < S.scenes.length - 1 ? clamp((sc.d - tt) / 0.5) : 1;
    if (fadeIn < 1 || fadeOut < 1) { ctx.save(); ctx.fillStyle = C.paper; ctx.globalAlpha = 1 - Math.min(fadeIn, fadeOut); ctx.fillRect(0, 0, 1600, 900); ctx.restore(); }
    frameBorder(ctx);
    setCaption(cap, sc.zh); capDe.textContent = sc.de;
  };
  last = performance.now(); rafId = requestAnimationFrame(loop);
}
export function storyList() { return Object.entries(STORIES).filter(([k, v]) => !['markt', 'brahms'].includes(k) && !Object.entries(STORIES).some(([k2, v2]) => v2 === v && k2 < k && !['markt', 'brahms'].includes(k2))).sort(([a], [b]) => (b === 'luebeck') - (a === 'luebeck') || (b === 'hanse') - (a === 'hanse')).map(([id, s]) => ({ id, title: s.title, zh: s.zh, kind: s.kind })); }

// shared drawing kit for the additional films (stories2.js)
export const KIT = { C, paper, cut, pathOf, rect, ellipse, wave, steppedHouse, gableHouse, windows, spire, cloud, drawKogge, drawHolstentor, churchTwin, devil, rock, barrel, fish, flame, bell, skyline, islandMap, piles, soldier, person, piano, noteGlyph, hanseMap, copperSpire, clamp, easeOut, easeBack, pop, sky, sun, moon, stars, henry };
