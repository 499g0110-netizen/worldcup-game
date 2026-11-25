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
    summary: '霍爾斯滕門建於 1464 至 1478 年，是呂貝克城牆西側的城門，由市府建築師 Hinrich Helmstede 主持興建，兩座圓塔中間夾著門樓。城門蓋在鬆軟的河岸地上，南塔在興建期間就開始下沉，至今仍看得出傾斜。1871 年修復後，朝城內的一面加上了拉丁文「CONCORDIA DOMI FORIS PAX」（城內和睦，城外和平）。它曾出現在德國 50 馬克紙鈔上，2006 年也成為德國 2 歐元紀念硬幣的圖案，是呂貝克的城市象徵。',
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
      { d: 8, zh: '1871 年修復後，朝城內的一面刻上「CONCORDIA DOMI FORIS PAX」——城內和睦，城外和平。', de: 'Concordia domi foris pax', draw(ctx, t) {
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
        pop(ctx, t, 0.2, () => { const x = 560; paper(ctx, cut([...ellipse(x, 470, 40, 40, 16), [x + 60, 540], [x + 90, 760], [x - 90, 760], [x - 60, 540]], 401, 0.8, 8), C.navy, 2); paper(ctx, cut([[x - 40, 440], [x - 30, 400], [x - 12, 425], [x, 395], [x + 12, 425], [x + 30, 400], [x + 40, 440]], 402, 0.5, 6), C.gold, 2.2); });
        // lion
        pop(ctx, t, 0.6, () => { const x = 960, y = 640; paper(ctx, cut([...ellipse(x, y, 140, 70, 24), [x + 130, y + 120], [x + 100, y + 120], [x + 90, y + 50], [x - 90, y + 50], [x - 100, y + 120], [x - 130, y + 120]], 403, 1, 10), C.gold, 2); paper(ctx, cut(ellipse(x - 150, y - 50, 70, 70, 24), 404, 1.5, 8), '#b38432', 2.2); paper(ctx, cut(ellipse(x - 160, y - 45, 40, 40, 18), 405, 0.8, 8), C.gold, 2.4); });
        pop(ctx, t, 1.4, () => paper(ctx, cut(rect(700, 700, 120, 60), 406), '#b9b3a8', 2.6));
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
    title: 'Lübecker Marzipan', zh: '呂貝克杏仁糖', kind: '傳說＋史實',
    summary: '呂貝克流傳一個說法：15 世紀初一場饑荒中，城裡缺糧，只剩倉庫裡的杏仁和糖，麵包師便把兩者磨碎做成「杏仁麵包」救急——這就是杏仁糖的由來（此為傳說，杏仁糖其實更早就從東方經威尼斯傳入歐洲）。可以確定的是：1806 年，Johann Georg Niederegger 在市政廳對面開了自己的店，Niederegger 從此成為呂貝克杏仁糖最有名的品牌，本店至今仍在 Breite Straße 89。',
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
      { d: 8, zh: '1806 年，Johann Georg Niederegger 在市政廳對面開店，呂貝克杏仁糖從此聞名世界。', de: 'Niederegger, seit 1806', draw(ctx, t) {
        sky(ctx, '#d6dde3', C.paper);
        pop(ctx, t, 0.2, () => { paper(ctx, cut(rect(420, 260, 760, 480), 471, 1.4), C.red, 1.4); windows(ctx, 420, 600, 760, 300, 2, 5, C.cream, 0.85); paper(ctx, cut(rect(420, 600, 760, 140), 472, 1), C.gold, 1.8); });
        pop(ctx, t, 0.8, () => { ctx.save(); ctx.fillStyle = C.ink; ctx.font = '600 58px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('1806', 800, 690); ctx.restore(); });
        pop(ctx, t, 0.4, () => paper(ctx, cut(rect(0, 740, 1600, 180), 473, 2), C.slate, 2.4));
      } },
    ],
  },
};
STORIES.markt = STORIES.rathaus;

/* =============================== player =============================== */
export function hasStory(id) { return !!STORIES[id]; }
let rafId = 0;
export function openStory(id) {
  const S = STORIES[id]; if (!S) return;
  const box = document.querySelector('#story'), cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
  const cap = box.querySelector('.cap'), capDe = box.querySelector('.capde'), bar = box.querySelector('.bar i'), playBtn = box.querySelector('.play'), desc = box.querySelector('.desc');
  box.querySelector('.ttl').textContent = S.title; box.querySelector('.ttlzh').textContent = `${S.zh}　·　${S.kind}`;
  desc.textContent = S.summary;
  const total = S.scenes.reduce((a, s) => a + s.d, 0) + 3;   // +3 s title card
  let time = 0, playing = true, last = performance.now();
  box.hidden = false; window.__storyOpen = true; requestAnimationFrame(() => box.classList.add('on'));
  const fit = () => { const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.width * 9 / 16 * dpr); };
  fit(); addEventListener('resize', fit);
  playBtn.textContent = '❚❚';
  playBtn.onclick = () => { playing = !playing; playBtn.textContent = playing ? '❚❚' : '▶'; if (playing && time >= total) time = 0; };
  box.querySelector('.again').onclick = () => { time = 0; playing = true; playBtn.textContent = '❚❚'; };
  box.querySelector('.seek').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); time = clamp((e.clientX - r.left) / r.width) * total; };
  const close = () => { window.__storyOpen = false; cancelAnimationFrame(rafId); box.classList.remove('on'); setTimeout(() => (box.hidden = true), 250); removeEventListener('resize', fit); removeEventListener('keydown', key, true); };
  const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } if (e.key === ' ') { e.preventDefault(); e.stopPropagation(); playBtn.click(); } };
  addEventListener('keydown', key, true);
  box.querySelector('.x').onclick = close;
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
      ctx.font = `400 22px "IBM Plex Mono", monospace`; ctx.globalAlpha *= 0.75; ctx.fillText(S.kind === '傳說' ? 'EINE LÜBECKER SAGE · 呂貝克傳說' : 'AUS DER GESCHICHTE LÜBECKS · 呂貝克的歷史', 800, 540);
      ctx.restore(); frameBorder(ctx); cap.textContent = ''; capDe.textContent = ''; return;
    }
    let tt = time - 3, i = 0; while (i < S.scenes.length - 1 && tt > S.scenes[i].d) { tt -= S.scenes[i].d; i++; }
    const sc = S.scenes[i];
    // camera: slow push-in and drift; cross-fade between scenes
    ctx.save(); const z = 1 + tt / sc.d * 0.05; ctx.translate(800, 450); ctx.scale(z, z); ctx.translate(-800 - tt * 4, -450);
    sc.draw(ctx, tt, time); ctx.restore();
    const fadeIn = clamp(tt / 0.5), fadeOut = i < S.scenes.length - 1 ? clamp((sc.d - tt) / 0.5) : 1;
    if (fadeIn < 1 || fadeOut < 1) { ctx.save(); ctx.fillStyle = C.paper; ctx.globalAlpha = 1 - Math.min(fadeIn, fadeOut); ctx.fillRect(0, 0, 1600, 900); ctx.restore(); }
    frameBorder(ctx);
    cap.textContent = sc.zh; capDe.textContent = sc.de;
  };
  last = performance.now(); rafId = requestAnimationFrame(loop);
}
export function storyList() { return Object.entries(STORIES).filter(([k]) => k !== 'markt').map(([id, s]) => ({ id, title: s.title, zh: s.zh, kind: s.kind })); }
