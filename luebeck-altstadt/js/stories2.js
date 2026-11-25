// Additional paper-cut films: City of Seven Towers & the sinking gate, the marzipan legend, the Mann brothers,
// Hanseatic trade (extended), an old-town walking route, Bach's walk to Buxtehude, the Elbe–Lübeck Canal and the
// Malerwinkel. Also assigns music and sound effects to every film. Facts that are commonly told but not verified
// here are marked in the summaries.
import { STORIES, STORY_AT, KIT } from './stories.js';
const { C, paper, cut, rect, ellipse, wave, steppedHouse, gableHouse, windows, spire, cloud, drawKogge, drawHolstentor, churchTwin, barrel, fish, flame, skyline, person, noteGlyph, clamp, easeOut, pop, sky, sun, moon, stars, henry } = KIT;
void henry; void fish; void moon;

/* ------------------------------------------------------------ extra pieces */
const T_ = (ctx, s, x, y, size = 30, col = C.ink, font = 'Georgia, serif', weight = 600, align = 'center') => { ctx.save(); ctx.fillStyle = col; ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = align; ctx.fillText(s, x, y); ctx.restore(); };
const ZH = '"Noto Sans TC", "PingFang TC", sans-serif';
function church1(cx, base, s, col = C.brick, roof = C.copper) {   // single west tower + nave (Petri, Jakobi, Aegidien)
  return [{ pts: rect(cx, base - 0.7 * s, 1.3 * s, 0.7 * s), col }, { pts: [[cx, base - 0.7 * s], [cx + 0.65 * s, base - 1.0 * s], [cx + 1.3 * s, base - 0.7 * s]], col: roof },
    { pts: rect(cx - 0.34 * s, base - 1.5 * s, 0.34 * s, 1.5 * s), col }, { pts: spire(cx - 0.17 * s, base - 1.5 * s, 0.36 * s, 1.25 * s), col: roof }];
}
const drawParts = (ctx, parts, seed, depth) => parts.forEach((p, k) => paper(ctx, cut(p.pts, seed + k), p.col, depth));
function walker(ctx, cx, base, s, ph, col = C.navy, seed = 1, depth = 2.2, wig = false, stick = false) {   // walking figure with swinging legs
  const a = Math.sin(ph) * 0.35;
  for (const sd of [-1, 1]) { ctx.save(); ctx.translate(cx, base - 0.6 * s); ctx.rotate(a * sd); paper(ctx, cut(rect(-0.05 * s, 0, 0.1 * s, 0.6 * s), seed + sd, 0.4, 6), C.ink, depth - 0.1); ctx.restore(); }
  paper(ctx, cut([[cx - 0.2 * s, base - 1.3 * s], [cx + 0.2 * s, base - 1.3 * s], [cx + 0.27 * s, base - 0.55 * s], [cx - 0.27 * s, base - 0.55 * s]], seed + 3, 0.6, 8), col, depth);
  if (wig) { paper(ctx, cut(ellipse(cx, base - 1.47 * s, 0.18 * s, 0.17 * s, 18), seed + 5, 0.5, 6), '#ece6da', depth + 0.05); for (const sd of [-1, 1]) paper(ctx, cut(ellipse(cx + sd * 0.15 * s, base - 1.33 * s, 0.07 * s, 0.09 * s, 12), seed + 6 + sd, 0.4, 5), '#e2dccf', depth + 0.06); }
  paper(ctx, cut(ellipse(cx, base - 1.46 * s, (wig ? 0.105 : 0.13) * s, (wig ? 0.12 : 0.14) * s, 14), seed + 4, 0.5, 6), '#e9cfb0', depth + 0.1);
  if (stick) { ctx.save(); ctx.strokeStyle = C.wood; ctx.lineWidth = 0.04 * s; ctx.beginPath(); ctx.moveTo(cx + 0.25 * s, base - 1.0 * s); ctx.lineTo(cx + 0.45 * s + a * 0.2 * s, base); ctx.stroke(); ctx.restore(); }
}
function organ(ctx, cx, base, w, h, seed = 1, depth = 1.4) {   // case + rows of pipes
  paper(ctx, cut([[cx - w / 2, base], [cx - w / 2, base - h * 0.8], [cx - w * 0.3, base - h], [cx + w * 0.3, base - h], [cx + w / 2, base - h * 0.8], [cx + w / 2, base]], seed, 1, 12), C.wood, depth);
  const n = 21; for (let i = 0; i < n; i++) { const u = i / (n - 1), x = cx - w * 0.42 + u * w * 0.84, ph = 1 - Math.abs(u - 0.5) * 1.3; paper(ctx, cut(rect(x - w * 0.016, base - h * (0.25 + 0.6 * ph), w * 0.032, h * (0.22 + 0.6 * ph)), seed + 2 + i, 0.3, 10), i % 2 ? '#d9d4c7' : '#c4beb0', depth + 0.3); }
  paper(ctx, cut(rect(cx - w * 0.45, base - h * 0.2, w * 0.9, h * 0.2), seed + 40, 0.6, 10), '#5a3b25', depth + 0.4);
}
function book(ctx, cx, cy, w, h, open, col, seed, depth = 2.4) {   // closed (open=0) → opened (open=1) book
  const o = clamp(open);
  paper(ctx, cut(rect(cx - w * o - (1 - o) * w * 0.5, cy - h / 2, w * (o * 2 + (1 - o)), h), seed, 0.6, 10), col, depth);
  if (o > 0.05) { paper(ctx, cut(rect(cx - w * o + 10, cy - h / 2 + 10, w * 2 * o - 20, h - 20), seed + 1, 0.5, 10), C.cream, depth + 0.1); ctx.save(); ctx.strokeStyle = 'rgba(29,34,48,0.5)'; ctx.lineWidth = 2; for (let l = 0; l < 9; l++) for (const sd of [-1, 1]) { if (o < 0.8) continue; ctx.beginPath(); ctx.moveTo(cx + sd * 24, cy - h / 2 + 40 + l * (h - 80) / 9); ctx.lineTo(cx + sd * (w - 30), cy - h / 2 + 40 + l * (h - 80) / 9); ctx.stroke(); } ctx.restore(); }
}
function medal(ctx, x, y, r, T, seed) { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(T * 1.5) * 0.06); paper(ctx, cut([[-r * 0.5, -r * 2.6], [r * 0.5, -r * 2.6], [r * 0.2, -r * 0.8], [-r * 0.2, -r * 0.8]], seed, 0.5, 6), C.navy2, 2.6); paper(ctx, cut(ellipse(0, 0, r, r, 32), seed + 1, 0.6, 6), C.gold, 2.8); paper(ctx, cut(ellipse(0, 0, r * 0.72, r * 0.72, 28), seed + 2, 0.4, 6), C.gold2, 2.9); ctx.restore(); }
function almond(cx, cy, s, a = 0) { const p = []; for (let i = 0; i <= 20; i++) { const u = i / 20 * Math.PI * 2, x = Math.cos(u) * s, y = Math.sin(u) * s * 0.55 * (1 - 0.35 * Math.cos(u)); p.push([cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]); } return p; }
function barge(ctx, cx, cy, s, cargo = C.salt, seed = 1, depth = 2.2) {   // flat salt barge (Stecknitzprahm)
  paper(ctx, cut([[cx - 1.4 * s, cy - 0.2 * s], [cx + 1.4 * s, cy - 0.2 * s], [cx + 1.2 * s, cy + 0.15 * s], [cx - 1.2 * s, cy + 0.15 * s]], seed, 0.8, 10), C.wood, depth);
  for (let i = 0; i < 5; i++) paper(ctx, cut(barrel(cx - 0.9 * s + i * 0.45 * s, cy - 0.38 * s, 0.38 * s), seed + 1 + i, 0.4, 6), cargo === C.salt ? '#a7805a' : cargo, depth + 0.1);
  paper(ctx, cut(rect(cx + 0.95 * s, cy - 1.0 * s, 0.05 * s, 0.85 * s), seed + 9, 0.3, 8), C.ink, depth + 0.05);
}
function easel(ctx, cx, base, s, prog, T, seed) {   // painter's easel with a picture appearing
  ctx.save(); ctx.strokeStyle = C.wood; ctx.lineWidth = 0.035 * s; ctx.beginPath(); ctx.moveTo(cx - 0.35 * s, base); ctx.lineTo(cx, base - 1.5 * s); ctx.lineTo(cx + 0.35 * s, base); ctx.moveTo(cx, base - 1.5 * s); ctx.lineTo(cx + 0.05 * s, base); ctx.stroke(); ctx.restore();
  paper(ctx, cut(rect(cx - 0.55 * s, base - 1.4 * s, 1.1 * s, 0.75 * s), seed, 0.5, 10), C.cream, 2.4);
  ctx.save(); ctx.beginPath(); ctx.rect(cx - 0.5 * s, base - 1.35 * s, 1.0 * s * clamp(prog), 0.65 * s); ctx.clip();
  const g = ctx.createLinearGradient(0, base - 1.35 * s, 0, base - 0.7 * s); g.addColorStop(0, '#e9c78e'); g.addColorStop(1, '#6a8fa8'); ctx.fillStyle = g; ctx.fillRect(cx - 0.5 * s, base - 1.35 * s, 1.0 * s, 0.65 * s);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = [C.brick, C.cream, C.brick2, '#d8b98a', C.brick3, C.paper2][i]; const x = cx - 0.48 * s + i * 0.16 * s; ctx.beginPath(); ctx.moveTo(x, base - 0.95 * s); ctx.lineTo(x, base - 1.12 * s); ctx.lineTo(x + 0.07 * s, base - 1.22 * s); ctx.lineTo(x + 0.15 * s, base - 1.12 * s); ctx.lineTo(x + 0.15 * s, base - 0.95 * s); ctx.fill(); }
  ctx.fillStyle = C.copper; ctx.beginPath(); ctx.moveTo(cx + 0.1 * s, base - 1.12 * s); ctx.lineTo(cx + 0.15 * s, base - 1.33 * s); ctx.lineTo(cx + 0.2 * s, base - 1.12 * s); ctx.fill();
  ctx.restore();
  walker(ctx, cx - 0.9 * s, base, 0.75 * s, Math.sin(T * 2) * 0.3, '#3c5a3a', seed + 20, 2.3);
  ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02 * s; ctx.beginPath(); ctx.moveTo(cx - 0.8 * s, base - 0.85 * s); ctx.lineTo(cx - 0.55 * s + Math.sin(T * 3) * 0.04 * s, base - 1.05 * s + Math.cos(T * 3) * 0.04 * s); ctx.stroke(); ctx.restore();
}
function reflect(ctx, y0, h, drawFn, alpha = 0.3) { ctx.save(); ctx.beginPath(); ctx.rect(0, y0, 1600, h); ctx.clip(); ctx.globalAlpha = alpha; ctx.translate(0, y0 * 2); ctx.scale(1, -1); drawFn(); ctx.restore(); }
function ripple(ctx, y0, y1, T, col = 'rgba(255,255,255,0.35)') { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; for (let i = 0; i < 18; i++) { const y = y0 + ((i * 37) % (y1 - y0)), x = (i * 211 + T * 20) % 1700 - 50; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40 + (i % 4) * 20, y); ctx.stroke(); } ctx.restore(); }

/* ------------------------------------------------------------ 1. seven towers & the sinking gate */
const SEVEN = [['St. Marien', 0, 2], ['Dom', 1, 2], ['St. Petri', 2, 1], ['St. Jakobi', 3, 1], ['St. Aegidien', 4, 1]];
STORIES.sieben = {
  title: 'Die Stadt der sieben Türme', zh: '七塔之城與會下沉的城門', kind: '史實＋傳說', music: 'feste_burg',
  summary: '從遠處望向呂貝克，天際線上豎著七座尖塔，所以它被稱為「七塔之城」。這七座塔屬於五座主要教堂：聖瑪利亞教堂（雙塔）、主教座堂（雙塔）、聖伯多祿教堂、聖雅各教堂與聖吉爾斯教堂（St. Aegidien）。城西的霍爾斯滕門建於 1464 至 1478 年，地基落在特拉沃河邊鬆軟潮濕的泥地上，南塔在施工期間就開始下沉，工匠只好一邊蓋一邊修正，所以塔身至今仍看得出歪斜。十九世紀時城門年久失修，一度面臨拆除，常見的說法是市民議會在 1863 年以一票之差決定保留（票數細節待核對）。二十世紀的整修加固了地基，讓這座「會下沉的城門」穩穩站到今天。聖伯多祿教堂的塔上有觀景台，可以一次看遍七座尖塔。',
  scenes: [
    { d: 9, zh: '遠遠望向呂貝克，天際線上豎著七座尖塔——人們稱它為「七塔之城」。', de: 'Die Stadt der sieben Türme', draw(ctx, t, T) {
      sky(ctx, '#c9d6e2', '#efe3c8'); sun(ctx, 1380, 170, 55);
      pop(ctx, t, 0.1, () => paper(ctx, cut(cloud(300, 160, 60), 4001), C.cream, 0.5));
      const xs = [250, 330, 560, 640, 860, 1100, 1340];
      xs.forEach((x, k) => pop(ctx, t, 0.6 + k * 0.45, () => { paper(ctx, cut(rect(x - 30, 380 + (k % 3) * 20, 60, 400), 4010 + k), C.brick2, 1.2); paper(ctx, cut(spire(x, 380 + (k % 3) * 20, 70, 260), 4020 + k), C.copper, 1.3); paper(ctx, cut(ellipse(x, 300 + (k % 3) * 20, 26, 26, 16), 4030 + k, 0.5), C.cream, 2.4); T_(ctx, String(k + 1), x, 312 + (k % 3) * 20, 30, C.ink); }));
      pop(ctx, t, 0.3, () => { for (const h of skyline(780, 101, 70)) paper(ctx, cut(h.pts, h.x | 0), h.col, 1.6); });
      pop(ctx, t, 0.2, () => paper(ctx, cut(wave(800, 8, 0.008, T * 0.5), 4040), C.sea, 2.2));
    } },
    { d: 10, zh: '七座塔屬於五座教堂：聖瑪利亞與主教座堂各有兩座塔，聖伯多祿、聖雅各和聖吉爾斯教堂各一座。', de: 'Marien · Dom · Petri · Jakobi · Aegidien', draw(ctx, t, T) {
      sky(ctx, '#d6dee5', C.paper);
      SEVEN.forEach(([name, k, n], i) => pop(ctx, t, 0.3 + i * 0.5, () => { const x = 90 + k * 300, b = 700; if (n === 2) drawParts(ctx, churchTwin(x + 70, b, 120, k === 1 ? C.brick2 : C.brick, C.copper), 4100 + i * 10, 1.6); else drawParts(ctx, church1(x + 90, b, 120, k === 3 ? C.brick3 : C.brick, C.copper2), 4100 + i * 10, 1.6); paper(ctx, cut(rect(x + 10, 730, 250, 60), 4150 + i, 0.6), C.cream, 2.4); T_(ctx, name, x + 135, 770, 26); T_(ctx, n === 2 ? '× 2' : '× 1', x + 135, 330, 34, C.red, 'Georgia, serif', 700); }));
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 800, 1600, 120), 4160, 2), C.grass2, 2.2));
    } },
    { d: 9, zh: '城西的霍爾斯滕門建於 1464 至 1478 年，可是它的地基，落在特拉沃河邊又濕又軟的泥地上。', de: '1464–1478 · Auf weichem Grund', draw(ctx, t, T) {
      sky(ctx, '#cfd9e2', C.paper);
      pop(ctx, t, 0.1, () => drawHolstentor(ctx, 800, 600, 300, 1.4));
      pop(ctx, t, 0.4, () => { paper(ctx, cut(rect(0, 600, 1600, 80), 4201, 2), '#8a7350', 2); paper(ctx, cut(rect(0, 680, 1600, 90), 4202, 2), '#6d5a3e', 2.1); paper(ctx, cut(rect(0, 770, 1600, 150), 4203, 2), '#5a4a35', 2.2); });
      for (let i = 0; i < 14; i++) { const x = (i * 131) % 1600, y = 640 + (i * 53) % 240; ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = '#3a2e20'; ctx.beginPath(); ctx.ellipse(x, y, 30, 8, 0, 0, 7); ctx.fill(); ctx.restore(); }
      pop(ctx, t, 1.4, () => { paper(ctx, cut(rect(80, 680, 280, 60), 4204), C.cream, 2.6); T_(ctx, '軟泥 Schlick', 220, 720, 26, C.ink, ZH); });
    } },
    { d: 10, zh: '還在施工的時候，南塔就開始往下沉。工匠只好一邊蓋、一邊修正，所以塔身到今天都看得出歪斜。', de: 'Der Südturm sinkt', draw(ctx, t, T) {
      sky(ctx, '#d3dce3', C.paper2);
      const tilt = easeOut(t / 7) * 0.05, sink = easeOut(t / 7) * 40;
      pop(ctx, t, 0.1, () => { ctx.save(); ctx.translate(980, 700 + sink); ctx.rotate(tilt); ctx.translate(-980, -700); paper(ctx, cut(rect(900, 260, 170, 440), 4301), C.brick, 1.6); paper(ctx, cut([[890, 260], [985, 70], [1080, 260]], 4302), C.slate, 1.7); for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) paper(ctx, cut(rect(930 + c * 70, 320 + r * 90, 30, 50), 4303 + r * 2 + c, 0.3), C.ink, 1.8); ctx.restore(); });
      pop(ctx, t, 0.2, () => { paper(ctx, cut(rect(560, 300, 170, 400), 4310), C.brick, 1.5); paper(ctx, cut([[550, 300], [645, 110], [740, 300]], 4311), C.slate, 1.6); paper(ctx, cut(rect(730, 360, 170, 340), 4312), C.brick2, 1.4); });
      ctx.save(); ctx.setLineDash([12, 10]); ctx.strokeStyle = C.red; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(985, 40); ctx.lineTo(985, 760); ctx.stroke(); ctx.restore();
      if (t > 3) T_(ctx, `${(tilt * 57.3).toFixed(1)}°`, 1180, 200, 44, C.red, 'Georgia, serif', 700);
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 700, 1600, 220), 4313, 2), '#6d5a3e', 2.2));
      for (let i = 0; i < 3; i++) pop(ctx, t, 1 + i * 0.5, () => walker(ctx, 260 + i * 90, 700, 90, T * 3 + i, [C.navy2, C.wood, C.red][i], 4320 + i * 10));
    } },
    { d: 10, zh: '十九世紀時，城門老舊得差點被拆除。常見的說法是：市民議會只以一票之差，決定把它留下來。', de: '1863 · Eine Stimme Mehrheit', draw(ctx, t, T) {
      sky(ctx, '#e3d3b0', C.paper2);
      pop(ctx, t, 0.1, () => drawHolstentor(ctx, 800, 520, 170, 1.2));
      // balance scale: "Abriss" vs "Erhalt"
      const tip = Math.sin(clamp((t - 2) / 3) * Math.PI / 2) * 0.12 + Math.sin(T * 2) * 0.01;
      pop(ctx, t, 0.6, () => { paper(ctx, cut(rect(790, 560, 20, 220), 4401), C.ink, 2.2); ctx.save(); ctx.translate(800, 570); ctx.rotate(-tip); paper(ctx, cut(rect(-320, -8, 640, 16), 4402), C.ink, 2.3); for (const [sd, lab, col] of [[-1, 'Abriss 拆除', C.slate], [1, 'Erhalt 保留', C.red]]) { ctx.save(); ctx.translate(sd * 300, 0); ctx.rotate(tip); paper(ctx, cut([[-90, 80], [90, 80], [60, 110], [-60, 110]], 4403 + sd, 0.6), col, 2.4); T_(ctx, lab, 0, 150, 26, C.ink, ZH); const n = sd < 0 ? 5 : 6; for (let k = 0; k < n; k++) paper(ctx, cut(rect(-70 + k * 24, 50 - (k % 2) * 6, 18, 28), 4410 + k + sd * 20, 0.3), C.cream, 2.6); ctx.restore(); } ctx.restore(); });
      pop(ctx, t, 0.2, () => paper(ctx, cut(rect(0, 780, 1600, 140), 4430, 2), C.wood, 2.4));
    } },
    { d: 9, zh: '二十世紀的整修加固了地基，這座「會下沉的城門」從此穩穩站著，成為呂貝克的象徵。', de: 'Gesichert für die Zukunft', draw(ctx, t, T) {
      sky(ctx, '#cbd6e0', C.paper); sun(ctx, 1320, 180, 55);
      pop(ctx, t, 0.1, () => drawHolstentor(ctx, 800, 600, 300, 1.4));
      pop(ctx, t, 0.3, () => paper(ctx, cut(rect(0, 600, 1600, 320), 4501, 2), '#6d5a3e', 1.8));
      for (let i = 0; i < 10; i++) { const k = clamp((t - 0.8 - i * 0.2) / 0.6); if (k <= 0) continue; paper(ctx, cut(rect(560 + i * 52, 610, 22, 230 * k), 4510 + i, 0.4, 10), '#9a9a94', 2.2); }
      pop(ctx, t, 3, () => paper(ctx, cut(rect(540, 600, 520, 30), 4530), '#b8b6ae', 2.4));
    } },
    { d: 9, zh: '今天爬上聖伯多祿教堂的觀景台，仍可以一次數完七座塔。', de: 'Blick vom Petri-Turm', draw(ctx, t, T) {
      sky(ctx, '#e0c48e', '#efe2c7'); sun(ctx, 1380, 240, 70, '#f0b45e');
      pop(ctx, t, 0.1, () => { const xs = [200, 260, 520, 580, 900, 1150, 1400]; xs.forEach((x, k) => { paper(ctx, cut(rect(x - 18, 420, 36, 260), 4601 + k), C.brick2, 1); paper(ctx, cut(spire(x, 420, 44, 170), 4610 + k), C.copper2, 1.1); }); });
      pop(ctx, t, 0.2, () => { for (const h of skyline(700, 111, 60)) paper(ctx, cut(h.pts, h.x | 0), h.col, 1.3); });
      pop(ctx, t, 0.5, () => { paper(ctx, cut(rect(0, 690, 1600, 40), 4620), C.ink, 2.6); for (let i = 0; i < 30; i++) paper(ctx, rect(i * 55, 600, 8, 90), C.ink, 2.6); paper(ctx, cut(rect(0, 595, 1600, 12), 4621), C.ink, 2.6); });
      for (let i = 0; i < 3; i++) pop(ctx, t, 1 + i * 0.4, () => paper(ctx, cut(person(500 + i * 260, 690, 170), 4630 + i, 0.6, 8), [C.navy2, C.red, C.copper2][i], 2.4));
    } },
  ],
};

/* ------------------------------------------------------------ 2. marzipan legend (extends Niederegger) */
{
  const N = STORIES.niederegger;
  N.zh = '杏仁膏傳說'; N.music = 'fur_elise';
  N.summary = '呂貝克流傳一個說法：1407 年左右的一場饑荒中，城裡缺糧，倉庫只剩杏仁和糖，麵包師便把兩者磨碎做成「杏仁麵包」救急——這就是杏仁膏的由來（此為傳說；杏仁膏其實更早就從東方經威尼斯等地傳入歐洲，最初由藥房當作珍貴的補品販賣）。製作方式是把杏仁去皮、磨碎，和糖一起在銅鍋中加熱攪拌，做成杏仁膏原料。「呂貝克杏仁膏」（Lübecker Marzipan）在歐盟是受保護的地理標示，對杏仁比例有嚴格規定，最高等級的「Edelmarzipan」原料膏與糖的比例為 90:10。1806 年，Johann Georg Niederegger 在市政廳對面開店，本店至今仍在 Breite Straße 89；樓上的杏仁膏沙龍展示用杏仁膏做成的真人大小人像（展示內容以現場為準）。';
  N.scenes.splice(0, 0, { d: 8, zh: '杏仁膏其實很早就從東方經過威尼斯傳進歐洲，最初是藥房販賣的珍貴補品。', de: 'Aus dem Orient über Venedig', draw(ctx, t, T) {
    sky(ctx, '#e8d4a8', '#efe3c9'); sun(ctx, 1340, 200, 60, '#f0b45e');
    pop(ctx, t, 0.1, () => paper(ctx, cut(wave(640, 10, 0.006, T * 0.5), 4701), C.sea, 1.2));
    drawKogge(ctx, 300 + easeOut(t / 8) * 500, 630, 110, Math.sin(T * 1.5) * 0.04, 1.6);
    pop(ctx, t, 0.6, () => { paper(ctx, cut(rect(1000, 380, 380, 300), 4702), C.cream, 1.8); paper(ctx, cut([[980, 390], [1190, 300], [1400, 390]], 4703), C.brick2, 1.9); for (let i = 0; i < 4; i++) paper(ctx, cut(rect(1030 + i * 85, 520, 60, 90), 4704 + i, 0.4), ['#5f9b86', '#c9a24a', '#9c3b28', '#2f4566'][i], 2); T_(ctx, 'APOTHEKE', 1190, 470, 34, C.ink); });
    for (let i = 0; i < 6; i++) pop(ctx, t, 1.2 + i * 0.15, () => paper(ctx, cut(almond(820 + i * 30, 560 - (i % 2) * 20, 22, 0.4), 4710 + i, 0.3, 6), '#c9a476', 2.4));
    pop(ctx, t, 0.3, () => paper(ctx, cut(wave(700, 14, 0.005, T * 0.8 + 1), 4720), C.sea2, 2.6));
  } });
  N.scenes.splice(3, 0,
    { d: 9, zh: '做法是把杏仁去皮、磨碎，和糖一起在銅鍋裡加熱、不停攪拌，做成杏仁膏原料。', de: 'Mandeln, Zucker, Kupferkessel', draw(ctx, t, T) {
      sky(ctx, '#e8dcc2', C.paper);
      for (let i = 0; i < 12; i++) pop(ctx, t, 0.2 + i * 0.08, () => paper(ctx, cut(almond(260 + (i % 4) * 60, 420 + Math.floor(i / 4) * 50, 24, i), 4801 + i, 0.3, 6), i % 3 ? '#e8d9b6' : '#c9a476', 2));
      pop(ctx, t, 0.6, () => { paper(ctx, cut(flame(820, 780, 90, T), 4820), C.fire, 1.6); paper(ctx, cut([...ellipse(820, 600, 220, 50, 30, 0, Math.PI), [600, 560], [1040, 560]], 4821, 0.8), '#c46a3c', 2); paper(ctx, cut(ellipse(820, 565, 215, 28, 30), 4822, 0.5), '#e9cf9b', 2.1); });
      ctx.save(); ctx.translate(820, 560); ctx.rotate(Math.sin(T * 2.5) * 0.5); paper(ctx, cut(rect(-8, -260, 16, 260), 4823, 0.4), C.wood, 2.4); ctx.restore();
      for (let i = 0; i < 5; i++) { const ph = (T * 0.4 + i / 5) % 1; ctx.save(); ctx.globalAlpha = (1 - ph) * 0.4; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(740 + i * 40 + Math.sin(T + i) * 15, 520 - ph * 220, 18 + ph * 20, 0, 7); ctx.fill(); ctx.restore(); }
      pop(ctx, t, 0.2, () => paper(ctx, cut(rect(0, 780, 1600, 140), 4830, 2), C.slate, 2.4));
    } },
    { d: 9, zh: '「呂貝克杏仁膏」是受保護的地理標示；最高等級 Edelmarzipan 的原料膏與糖比例是 90 比 10。', de: 'Lübecker Marzipan · 90 : 10', draw(ctx, t, T) {
      sky(ctx, '#d6dde3', C.paper);
      const k = easeOut((t - 0.8) / 3);
      pop(ctx, t, 0.3, () => { paper(ctx, cut(ellipse(800, 470, 260, 260, 60), 4901, 1), '#e9cf9b', 1.6); ctx.save(); ctx.beginPath(); ctx.moveTo(800, 470); ctx.arc(800, 470, 262, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.1 * k); ctx.closePath(); ctx.fillStyle = C.salt; ctx.fill(); ctx.restore(); });
      pop(ctx, t, 1.5, () => { T_(ctx, '90', 700, 520, 90, C.wood, 'Georgia, serif', 700); T_(ctx, '10', 880, 330, 42, C.ink); T_(ctx, '杏仁膏原料', 700, 580, 26, C.wood, ZH); T_(ctx, '糖', 960, 300, 26, C.ink, ZH); });
      pop(ctx, t, 2.2, () => { ctx.save(); ctx.translate(1300, 260); ctx.rotate(-0.15); paper(ctx, cut(ellipse(0, 0, 90, 90, 30), 4902, 0.6), '#2b4a9b', 2.6); paper(ctx, cut(ellipse(0, 0, 70, 70, 26), 4903, 0.4), '#e1c27a', 2.7); T_(ctx, 'g.g.A.', 0, 12, 30, '#2b4a9b', 'Georgia, serif', 700); ctx.restore(); });
    } });
  N.scenes.push({ d: 9, zh: 'Niederegger 咖啡館樓上有一間杏仁膏沙龍，展示用杏仁膏做成的真人大小人像。', de: 'Marzipan-Salon', draw(ctx, t, T) {
    sky(ctx, '#e6d6b8', '#efe3c9');
    pop(ctx, t, 0.1, () => { paper(ctx, cut(rect(100, 180, 1400, 600), 4950, 1), '#7a2a22', 1); for (let i = 0; i < 5; i++) paper(ctx, cut(rect(170 + i * 280, 230, 200, 480), 4951 + i, 0.6), '#9c3b28', 1.2); });
    for (let i = 0; i < 4; i++) pop(ctx, t, 0.6 + i * 0.4, () => { const x = 330 + i * 300; paper(ctx, cut(rect(x - 70, 640, 140, 60), 4960 + i), '#d8cbb0', 2); paper(ctx, cut(person(x, 640, 300), 4970 + i, 0.8, 8), ['#f2e3c4', '#efd8b0', '#f4e6cc', '#ead3a8'][i], 2.2); });
    pop(ctx, t, 0.2, () => paper(ctx, cut(rect(0, 700, 1600, 220), 4980, 2), '#5a3b25', 2.4));
  } });
}

/* ------------------------------------------------------------ 3. the Mann brothers */
STORIES.mann = {
  title: 'Die Brüder Mann', zh: '曼氏兄弟的故鄉', kind: '史實', music: 'prelude_piano',
  summary: '聖瑪利亞教堂北側的 Mengstraße 4 是一棟白色山牆的老屋，曼氏家族的祖父母曾住在這裡。海因里希·曼（1871 年）與湯瑪斯·曼（1875 年）都在呂貝克出生，父親是穀物商人，也是市參議員。1891 年父親過世後，家族商行解散，一家人後來搬到慕尼黑。1901 年，湯瑪斯·曼以這棟房子與家族為原型寫成長篇小說《布登勃洛克家族》，描寫一個呂貝克商人家族四代的興衰；1929 年他獲得諾貝爾文學獎，得獎理由特別提到這部小說。哥哥海因里希·曼的小說《垃圾教授》（1905）後來改編成電影《藍天使》（1930）。納粹掌權後兩兄弟都流亡國外。今天這棟房子是「布登勃洛克之家」，作為海因里希與湯瑪斯·曼中心，正在整修擴建（重新開放時間待核對）。',
  scenes: [
    { d: 9, zh: '聖瑪利亞教堂北邊的 Mengstraße 4，有一棟白色山牆的老房子——曼家祖父母的家。', de: 'Mengstraße 4', draw(ctx, t, T) {
      sky(ctx, '#d3dce3', C.paper); sun(ctx, 1380, 160, 50);
      pop(ctx, t, 0.1, () => drawParts(ctx, churchTwin(980, 700, 200, C.brick2, C.copper), 5001, 1));
      pop(ctx, t, 0.4, () => { const x = 420; paper(ctx, cut([[x, 760], [x, 420], [x + 40, 420], [x + 40, 360], [x + 90, 330], [x + 120, 280], [x + 200, 250], [x + 280, 280], [x + 310, 330], [x + 360, 360], [x + 360, 420], [x + 400, 420], [x + 400, 760]], 5010, 1), '#f3eee4', 1.6); windows(ctx, x + 20, 760, 360, 330, 4, 5, C.ink, 0.7); paper(ctx, cut(rect(x + 160, 660, 80, 100), 5011), C.wood, 1.8); });
      pop(ctx, t, 0.6, () => { paper(ctx, cut(gableHouse(120, 760, 260, 300, 0.7), 5020), C.brick, 1.4); paper(ctx, cut(steppedHouse(860, 760, 300, 280, 4), 5021), C.brick3, 1.5); windows(ctx, 120, 760, 260, 300, 4, 3); windows(ctx, 860, 760, 300, 280, 4, 3); });
      pop(ctx, t, 0.2, () => paper(ctx, cut(rect(0, 760, 1600, 160), 5022, 2), C.slate, 2.4));
    } },
    { d: 9, zh: '哥哥海因里希 1871 年、弟弟湯瑪斯 1875 年在呂貝克出生；父親是穀物商人，也是市參議員。', de: 'Heinrich *1871 · Thomas *1875', draw(ctx, t, T) {
      sky(ctx, '#e8dcc2', C.paper2);
      for (let i = 0; i < 6; i++) pop(ctx, t, 0.2 + i * 0.12, () => paper(ctx, cut(barrel(220 + i * 90, 700 - (i % 2) * 70, 80), 5101 + i), '#c9b28a', 1.6));
      pop(ctx, t, 0.8, () => { paper(ctx, cut(person(900, 760, 330), 5110, 0.8, 8), C.ink, 2); paper(ctx, cut(ellipse(900, 222, 62, 12, 16), 5111), C.ink, 2.1); paper(ctx, cut(rect(865, 170, 70, 52), 5115, 0.4), C.ink, 2.1); });
      pop(ctx, t, 1.4, () => { paper(ctx, cut(person(1100, 760, 170), 5112, 0.6, 8), C.navy2, 2.2); paper(ctx, cut(person(1240, 760, 140), 5113, 0.6, 8), '#3c5a3a', 2.2); T_(ctx, 'Heinrich', 1100, 460, 28); T_(ctx, 'Thomas', 1240, 510, 28); });
      pop(ctx, t, 0.2, () => paper(ctx, cut(rect(0, 760, 1600, 160), 5114, 2), C.wood, 2.4));
    } },
    { d: 9, zh: '1891 年父親過世，家族商行解散。一家人後來離開呂貝克，搬到慕尼黑。', de: '1891 · Abschied', draw(ctx, t, T) {
      sky(ctx, '#b9c3cf', '#e4d8c0');
      ctx.save(); ctx.strokeStyle = 'rgba(70,90,110,0.3)'; ctx.lineWidth = 2; for (let i = 0; i < 50; i++) { const x = (i * 97 + T * 260) % 1700 - 50, y = (i * 53 + T * 520) % 900; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 10, y + 26); ctx.stroke(); } ctx.restore();
      pop(ctx, t, 0.1, () => { for (const h of skyline(720, 121, 120)) paper(ctx, cut(h.pts, h.x | 0), h.col, 1.2); });
      const dx = easeOut((t - 2) / 6) * 900;
      pop(ctx, t, 0.6, () => { const x = 400 + dx; paper(ctx, cut(rect(x, 560, 260, 140), 5201), C.ink, 2.2); paper(ctx, cut([[x - 10, 560], [x + 130, 520], [x + 270, 560]], 5202), C.ink, 2.3); for (const wx of [x + 40, x + 220]) { ctx.save(); ctx.translate(wx, 720); ctx.rotate(T * 3); paper(ctx, cut(ellipse(0, 0, 44, 44, 16), 5203, 0.4), C.wood, 2.4); ctx.restore(); } });
      pop(ctx, t, 0.2, () => paper(ctx, cut(rect(0, 760, 1600, 160), 5204, 2), C.slate, 2.4));
      pop(ctx, t, 1, () => { ctx.save(); ctx.translate(1200, 260); ctx.rotate(Math.min(0.5, Math.max(0, t - 2)) * 0.6); paper(ctx, cut(rect(-130, -36, 260, 72), 5205), C.cream, 2.6); T_(ctx, 'Johann Siegmund Mann', 0, 10, 22, C.ink); ctx.restore(); });
    } },
    { d: 10, zh: '1901 年，湯瑪斯·曼以這棟房子和自己的家族為原型，寫出《布登勃洛克家族》——一個商人家族四代的興衰。', de: '1901 · Buddenbrooks', draw(ctx, t, T) {
      sky(ctx, '#e8dcc2', C.paper);
      pop(ctx, t, 0.2, () => book(ctx, 800, 600, 340, 300, (t - 0.8) / 1.5, '#7a2a22', 5301));
      pop(ctx, t, 2.4, () => { const x = 640; paper(ctx, cut([[x, 600], [x, 360], [x + 40, 330], [x + 80, 290], [x + 160, 260], [x + 240, 290], [x + 280, 330], [x + 320, 360], [x + 320, 600]], 5310, 1), '#f3eee4', 2.8); windows(ctx, x + 20, 600, 280, 260, 3, 4, C.ink, 0.7); });
      for (let g = 0; g < 4; g++) pop(ctx, t, 3.2 + g * 0.6, () => { paper(ctx, cut(person(250 + g * 70, 760, 130 - g * 10), 5320 + g, 0.6, 8), [C.ink, C.navy2, C.wood, C.slate][g], 2.4); });
      pop(ctx, t, 3, () => T_(ctx, 'Verfall einer Familie', 1240, 280, 34, C.red, 'Georgia, serif', 400));
    } },
    { d: 8, zh: '1929 年，他因這部小說獲得諾貝爾文學獎。', de: '1929 · Nobelpreis für Literatur', draw(ctx, t, T) {
      sky(ctx, C.navy, C.night); stars(ctx, 60, 17, T);
      pop(ctx, t, 0.4, () => medal(ctx, 800, 480, 140, T, 5401));
      pop(ctx, t, 1.4, () => T_(ctx, '1929', 800, 500, 70, C.ink, 'Georgia, serif', 700));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(800, 480, 10, 800, 480, 420); g.addColorStop(0, 'rgba(255,210,140,0.3)'); g.addColorStop(1, 'rgba(255,210,140,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1600, 900); ctx.restore();
    } },
    { d: 9, zh: '哥哥海因里希的小說《垃圾教授》（1905）後來被拍成電影《藍天使》（1930）。', de: 'Professor Unrat · Der blaue Engel', draw(ctx, t, T) {
      sky(ctx, '#2a2238', C.night);
      pop(ctx, t, 0.2, () => { paper(ctx, cut(rect(260, 520, 220, 140), 5501), C.ink, 2); for (const [x, y] of [[300, 470], [440, 470]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(T * 2); paper(ctx, cut(ellipse(0, 0, 60, 60, 20), 5502 + x, 0.4), '#3a3a44', 2.1); ctx.restore(); } });
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(200,220,255,${0.14 + Math.sin(T * 24) * 0.03})`; ctx.beginPath(); ctx.moveTo(480, 570); ctx.lineTo(1450, 220); ctx.lineTo(1450, 760); ctx.fill(); ctx.restore();
      pop(ctx, t, 0.8, () => { paper(ctx, cut(rect(900, 220, 550, 540), 5510, 1), '#d9dde4', 1.6); ctx.save(); ctx.beginPath(); ctx.rect(900, 220, 550, 540); ctx.clip(); paper(ctx, cut(person(1180, 760, 300), 5511, 0.8, 8), '#2a2a30', 1.8); paper(ctx, cut([[1120, 280], [1240, 280], [1215, 250], [1145, 250]], 5512, 0.5), '#2a2a30', 1.9); ctx.restore(); T_(ctx, 'Der blaue Engel · 1930', 1175, 200, 30, C.gold2); });
    } },
    { d: 10, zh: '納粹掌權後，兩兄弟都流亡國外。今天這棟房子是「布登勃洛克之家」——海因里希與湯瑪斯·曼中心。', de: 'Buddenbrookhaus', draw(ctx, t, T) {
      sky(ctx, '#cfd9e2', C.paper); sun(ctx, 1320, 180, 55);
      pop(ctx, t, 0.2, () => { const x = 560; paper(ctx, cut([[x, 760], [x, 420], [x + 40, 420], [x + 40, 360], [x + 90, 330], [x + 120, 280], [x + 200, 250], [x + 280, 280], [x + 310, 330], [x + 360, 360], [x + 360, 420], [x + 400, 420], [x + 400, 760]], 5601, 1), '#f3eee4', 1.6); windows(ctx, x + 20, 760, 360, 330, 4, 5, C.ink, 0.7); paper(ctx, cut(rect(x + 60, 440, 280, 50), 5602, 0.6), C.ink, 1.8); T_(ctx, 'BUDDENBROOKHAUS', x + 200, 475, 24, C.gold2); });
      for (let i = 0; i < 4; i++) pop(ctx, t, 1 + i * 0.3, () => walker(ctx, 200 + i * 340 + Math.sin(T * 0.5 + i) * 30, 760, 110, T * 3 + i, [C.navy2, C.red, C.copper2, C.wood][i], 5610 + i * 10));
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 760, 1600, 160), 5650, 2), C.slate, 2.4));
    } },
  ],
};

/* ------------------------------------------------------------ 4. Hanse: trade routes, salt, cogs, pirates, decline */
{
  const H = STORIES.hanse;
  H.zh = '漢薩同盟的商貿與興衰'; H.music = 'jesu';
  H.summary += '漢薩商人的主力貨船是柯克船（Kogge）：寬肚、單桅、方帆、船尾有樓台。呂貝克的財富來自轉運：呂內堡的鹽運到呂貝克，再裝船送往斯堪地那維亞，用來醃漬大量捕撈的鯡魚；回程則載回魚、毛皮、木材與蠟。14 世紀末，「維塔利兄弟會」等海盜在波羅的海劫掠商船，傳說中的首領克勞斯·施特爾特貝克據說在 1400 年前後於漢堡被處決（細節多屬傳說）。衰落的原因包括：美洲與大西洋航線興起、荷蘭商人的競爭、各國王權強化，以及三十年戰爭的破壞。';
  H.scenes.splice(1, 0, { d: 9, zh: '漢薩商人的主力貨船叫「柯克船」：寬寬的船肚、一根桅杆、一面方帆，船尾還有高起的樓台。', de: 'Die Kogge', draw(ctx, t, T) {
    sky(ctx, '#c4d2dc', '#ebe2cd'); sun(ctx, 1300, 200, 50);
    pop(ctx, t, 0.1, () => paper(ctx, cut(wave(640, 12, 0.006, T * 0.8), 5701), C.sea, 1));
    drawKogge(ctx, 800, 600, 260, Math.sin(T * 1.2) * 0.04, 1.6);
    const lbl = [['方帆', 640, 330], ['桅杆', 900, 240], ['船尾樓台', 1090, 480], ['寬船肚', 640, 700]];
    lbl.forEach(([s, x, y], i) => pop(ctx, t, 1.4 + i * 0.5, () => { paper(ctx, cut(rect(x - 80, y - 32, 160, 46), 5710 + i, 0.5), C.cream, 2.8); T_(ctx, s, x, y + 2, 24, C.ink, ZH); }));
    pop(ctx, t, 0.2, () => paper(ctx, cut(wave(720, 18, 0.005, T * 1.1 + 2), 5702), C.sea2, 2.6));
  } });
  H.scenes.splice(3, 0, { d: 10, zh: '呂內堡的鹽運到呂貝克，再裝船送往北方醃漬鯡魚；回程載回魚、毛皮、木材和蠟。', de: 'Salz hin, Hering zurück', draw(ctx, t, T) {
    sky(ctx, '#d8e0e6', C.paper);
    pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 560, 1600, 360), 5801, 2), C.sea, 1));
    const k = (T * 0.08) % 1;
    for (let i = 0; i < 2; i++) { const dir = i ? -1 : 1, x = i ? 1500 - k * 1400 : 100 + k * 1400; ctx.save(); if (dir < 0) { ctx.translate(x * 2, 0); ctx.scale(-1, 1); } drawKogge(ctx, x, 600 + i * 120, 90, Math.sin(T * 1.4 + i) * 0.04, 2 + i * 0.3); ctx.restore(); }
    pop(ctx, t, 0.6, () => { paper(ctx, cut(rect(80, 200, 360, 120), 5810), C.cream, 2.4); T_(ctx, '鹽 Salz →', 260, 275, 40, C.ink, ZH, 700); });
    pop(ctx, t, 1.2, () => { paper(ctx, cut(rect(1160, 200, 360, 120), 5811), C.cream, 2.4); T_(ctx, '← 鯡魚 · 毛皮 · 木材 · 蠟', 1340, 272, 28, C.ink, ZH, 700); });
    for (let i = 0; i < 5; i++) pop(ctx, t, 1.6 + i * 0.2, () => paper(ctx, cut(fish(1260 + i * 50, 380 + (i % 2) * 30, 40, -1), 5820 + i, 0.4, 6), '#b8c4cc', 2.4));
  } });
  H.scenes.splice(6, 0, { d: 9, zh: '十四世紀末，「維塔利兄弟會」等海盜在波羅的海劫掠商船；傳說他們的首領施特爾特貝克最後在漢堡被處決。', de: 'Vitalienbrüder · Störtebeker', draw(ctx, t, T) {
    sky(ctx, '#55606e', '#9aa3ad');
    ctx.save(); ctx.strokeStyle = 'rgba(220,230,240,0.25)'; ctx.lineWidth = 2; for (let i = 0; i < 40; i++) { const x = (i * 97 + T * 300) % 1700 - 50, y = (i * 53 + T * 600) % 900; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 14, y + 30); ctx.stroke(); } ctx.restore();
    pop(ctx, t, 0.1, () => paper(ctx, cut(wave(620, 26, 0.007, T * 1.5), 5901), C.sea2, 1));
    drawKogge(ctx, 520, 600, 150, Math.sin(T * 2) * 0.08, 1.6);
    ctx.save(); const px = 1300 - easeOut(t / 6) * 400; ctx.translate(px * 2, 0); ctx.scale(-1, 1); drawKogge(ctx, px, 610, 160, Math.sin(T * 2.2 + 1) * 0.08, 1.8); ctx.restore();
    pop(ctx, t, 1, () => { const px = 1300 - easeOut(t / 6) * 400; paper(ctx, cut(rect(px - 60, 380, 120, 70), 5902), C.ink, 2.2); ctx.save(); ctx.fillStyle = C.cream; ctx.beginPath(); ctx.arc(px, 405, 14, 0, 7); ctx.fill(); ctx.fillRect(px - 20, 425, 40, 6); ctx.restore(); });
    pop(ctx, t, 0.2, () => paper(ctx, cut(wave(700, 30, 0.006, T * 1.7 + 2), 5903), '#22465e', 2.6));
  } });
  H.scenes[H.scenes.length - 2].zh = '美洲與大西洋航線興起、荷蘭商人競爭、王權強化，再加上三十年戰爭，同盟漸漸衰落；最後一次漢薩大會在 1669 年的呂貝克落幕。';
}

/* ------------------------------------------------------------ 5. old-town walking route */
export const ROUTE = [['霍爾斯滕門', 'Holstentor', -351.3, 35.5], ['鹽倉', 'Salzspeicher', -313.6, 75.1], ['聖伯多祿教堂', 'St. Petri', -125.2, 76.7], ['Niederegger', 'Breite Str. 89', 55.3, -5.7], ['市政廳與市集', 'Rathaus · Markt', 24.2, -57], ['聖瑪利亞教堂・小惡魔', 'St. Marien', 23, -112.6], ['布登勃洛克之家', 'Buddenbrookhaus', 47.1, -212.5], ['船員公會之家', 'Schiffergesellschaft', 188, -526], ['聖雅各教堂', 'St. Jakobi', 253.4, -489.2], ['城堡門', 'Burgtor', 387.3, -834]];
const RX = (x) => 800 + (x - 18) * 0.82, RY = (z) => 450 + (z + 378) * 0.82;
function routeMap(ctx, t, T, upto = 99) {
  sky(ctx, '#e9dfc8', '#e2d5bb');
  paper(ctx, cut(rect(60, 40, 1480, 820), 6001, 3, 40), '#ece3cf', 0.4);
  const river = (xl, w, seed) => { const pts = []; for (let i = 0; i <= 24; i++) { const y = -20 + i * 40; pts.push([RX(xl) + Math.sin(i * 0.6 + seed) * 18 - w, y]); } for (let i = 24; i >= 0; i--) { const y = -20 + i * 40; pts.push([RX(xl) + Math.sin(i * 0.6 + seed) * 18 + w, y]); } paper(ctx, cut(pts, seed, 1.5, 16), '#7fa3b8', 0.8); };
  river(-290, 16, 6010); river(470, 22, 6011);
  // street grid hint
  ctx.save(); ctx.strokeStyle = 'rgba(120,100,70,0.25)'; ctx.lineWidth = 3; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(RX(-250), RY(-700 + i * 160)); ctx.lineTo(RX(420), RY(-700 + i * 160 + 40)); ctx.stroke(); } for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(RX(-200 + i * 120), RY(-850)); ctx.lineTo(RX(-180 + i * 120), RY(650)); ctx.stroke(); } ctx.restore();
  const k = clamp((t - 0.6) / 5) * (ROUTE.length - 1), n = Math.min(upto, k);
  ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.setLineDash([16, 10]); ctx.lineDashOffset = -T * 30; ctx.beginPath();
  for (let i = 0; i <= Math.floor(n) && i < ROUTE.length; i++) { const [, , x, z] = ROUTE[i]; if (i === 0) ctx.moveTo(RX(x), RY(z)); else ctx.lineTo(RX(x), RY(z)); }
  const fi = Math.floor(n); if (fi < ROUTE.length - 1) { const a = ROUTE[fi], b = ROUTE[fi + 1], f = n - fi; ctx.lineTo(RX(a[2] + (b[2] - a[2]) * f), RY(a[3] + (b[3] - a[3]) * f)); }
  ctx.stroke(); ctx.restore();
  ROUTE.forEach(([zh, , x, z], i) => { if (i > n + 0.01) return; paper(ctx, cut(ellipse(RX(x), RY(z), 17, 17, 14), 6020 + i, 0.4), i === 0 || i === ROUTE.length - 1 ? C.red : C.gold, 2); T_(ctx, String(i + 1), RX(x), RY(z) + 8, 20, C.ink, 'Georgia, serif', 700); T_(ctx, zh, RX(x) + (i % 2 ? -26 : 26), RY(z) + 8, 22, C.ink, ZH, 600, i % 2 ? 'right' : 'left'); });
  T_(ctx, 'N ↑', 1440, 120, 30, C.ink);
}
STORIES.route = {
  title: 'Spaziergang durch die Altstadt', zh: '舊城散步路徑', kind: '導覽', music: 'minuet',
  summary: '一條串起主要景點的散步路線，從城西的霍爾斯滕門一路走到城北的城堡門：霍爾斯滕門 → 鹽倉 → 聖伯多祿教堂（塔上觀景台）→ Niederegger 杏仁膏本店 → 市政廳與市集廣場 → 聖瑪利亞教堂與小惡魔銅像 → 布登勃洛克之家 → 船員公會之家 → 聖雅各教堂 → 城堡門。直線距離約 1.5 公里，實際沿街步行約 2 公里，慢慢走、加上參觀約需 2 至 3 小時。路線也畫在右上角的小地圖上（紅色虛線）。順路還可以鑽進舊城特有的「巷弄庭院」（Gänge und Höfe）。',
  scenes: [
    { d: 10, zh: '從城西的霍爾斯滕門出發，一路走到城北的城堡門，串起舊城最重要的景點。', de: 'Vom Holstentor zum Burgtor', draw(ctx, t, T) { routeMap(ctx, t, T); } },
    { d: 9, zh: '① 霍爾斯滕門 → ② 鹽倉：先看城門的兩座圓塔，再到河邊看六棟老鹽倉。', de: 'Holstentor · Salzspeicher', draw(ctx, t, T) {
      sky(ctx, '#cfdbe6', C.paper); sun(ctx, 1380, 170, 50);
      pop(ctx, t, 0.1, () => drawHolstentor(ctx, 480, 700, 260, 1.4));
      pop(ctx, t, 0.4, () => { const cols = [C.brick, C.brick2, C.brick3, C.brick, C.brick2, C.brick3]; for (let i = 0; i < 6; i++) { const x = 820 + i * 120; paper(ctx, cut(i % 2 ? steppedHouse(x, 700, 110, 210, 4) : gableHouse(x, 700, 110, 210, 0.9), 6101 + i), cols[i], 1.6); windows(ctx, x, 700, 110, 210, 4, 2); } });
      pop(ctx, t, 0.2, () => paper(ctx, cut(wave(720, 6, 0.01, T), 6110), C.sea, 2.2));
      walker(ctx, 200 + easeOut(t / 9) * 400, 790, 90, T * 4, C.red, 6120, 2.6);
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 790, 1600, 130), 6121, 2), C.slate, 2.4));
    } },
    { d: 9, zh: '③ 過橋進城，爬上聖伯多祿教堂的觀景台俯瞰舊城，再到 ④ Niederegger 嚐杏仁膏。', de: 'St. Petri · Niederegger', draw(ctx, t, T) {
      sky(ctx, '#d6dee5', C.paper);
      pop(ctx, t, 0.1, () => drawParts(ctx, church1(400, 740, 230, C.brick, C.copper2), 6201, 1.4));
      pop(ctx, t, 0.5, () => { paper(ctx, cut(rect(940, 340, 420, 400), 6210, 1.2), '#b0332a', 1.6); windows(ctx, 940, 650, 420, 290, 3, 4, C.cream, 0.85); paper(ctx, cut(rect(940, 650, 420, 90), 6211), C.gold, 1.8); T_(ctx, 'NIEDEREGGER', 1150, 708, 34, C.ink); });
      walker(ctx, 600 + easeOut(t / 9) * 300, 780, 90, T * 4, C.red, 6220, 2.6);
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 780, 1600, 140), 6221, 2), C.slate, 2.4));
    } },
    { d: 9, zh: '⑤ 市政廳與市集廣場，⑥ 聖瑪利亞教堂——別忘了南牆邊坐在石頭上的小惡魔。', de: 'Rathaus · St. Marien · Teufel', draw(ctx, t, T) {
      sky(ctx, '#d3dce3', C.paper);
      pop(ctx, t, 0.1, () => drawParts(ctx, churchTwin(820, 720, 230), 6301, 1.2));
      pop(ctx, t, 0.3, () => { paper(ctx, cut(rect(160, 420, 520, 300), 6310), '#2e2a2c', 1.5); for (let i = 0; i < 5; i++) paper(ctx, cut(ellipse(220 + i * 100, 720, 40, 60, 14, Math.PI, Math.PI * 2), 6311 + i, 0.4), C.paper2, 1.7); for (let i = 0; i < 6; i++) paper(ctx, cut([[170 + i * 85, 420], [210 + i * 85, 350], [250 + i * 85, 420]], 6320 + i, 0.4), '#2e2a2c', 1.5); });
      pop(ctx, t, 1, () => { const p = KIT.devil(1300, 690, 70, Math.sin(T * 2) * 0.3 + 0.3); paper(ctx, cut(KIT.rock(1300, 760, 70, 9), 6330), '#8a8578', 2.2); p.forEach((q, k) => paper(ctx, cut(q, 6340 + k, 0.4, 6), '#4a4038', 2.4)); });
      walker(ctx, 700 + easeOut(t / 9) * 300, 790, 90, T * 4, C.red, 6350, 2.6);
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 790, 1600, 130), 6351, 2), C.slate, 2.4));
    } },
    { d: 9, zh: '⑦ 布登勃洛克之家 → ⑧ 船員公會之家 → ⑨ 聖雅各教堂：沿著 Breite Straße 往北走。', de: 'Buddenbrookhaus · Schiffergesellschaft · St. Jakobi', draw(ctx, t, T) {
      sky(ctx, '#d6dde3', C.paper);
      pop(ctx, t, 0.1, () => { const x = 140; paper(ctx, cut([[x, 760], [x, 440], [x + 40, 400], [x + 90, 340], [x + 160, 310], [x + 230, 340], [x + 280, 400], [x + 320, 440], [x + 320, 760]], 6401, 1), '#f3eee4', 1.4); windows(ctx, x + 20, 760, 280, 300, 4, 4, C.ink, 0.7); });
      pop(ctx, t, 0.3, () => { paper(ctx, cut(steppedHouse(560, 760, 330, 300, 5), 6402), C.brick, 1.5); windows(ctx, 560, 760, 330, 300, 3, 3); drawKogge(ctx, 725, 420, 40, Math.sin(T) * 0.05, 1.8); });
      pop(ctx, t, 0.5, () => drawParts(ctx, church1(1120, 760, 200, C.brick3, C.copper), 6410, 1.3));
      walker(ctx, 300 + easeOut(t / 9) * 500, 800, 90, T * 4, C.red, 6420, 2.6);
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 790, 1600, 130), 6421, 2), C.slate, 2.4));
    } },
    { d: 9, zh: '⑩ 終點是城北的城堡門。全程沿街約 2 公里，加上參觀大約 2 到 3 小時；路線已畫在右上角的小地圖上。', de: 'Ziel: Burgtor', draw(ctx, t, T) {
      sky(ctx, '#e0c48e', '#efe2c7'); sun(ctx, 1380, 250, 70, '#f0b45e');
      pop(ctx, t, 0.1, () => { paper(ctx, cut(rect(620, 260, 360, 500), 6501), C.brick, 1.4); paper(ctx, cut([[600, 260], [620, 180], [980, 180], [1000, 260]], 6502), C.slate, 1.5); paper(ctx, cut([[700, 180], [800, 60], [900, 180]], 6503), C.copper, 1.5); paper(ctx, cut([...ellipse(800, 620, 80, 100, 18, Math.PI, Math.PI * 2), [880, 760], [720, 760]], 6504), C.ink, 1.6); windows(ctx, 640, 560, 320, 280, 3, 3); });
      walker(ctx, 200 + easeOut(t / 7) * 520, 790, 90, T * (t < 7 ? 4 : 0), C.red, 6510, 2.6);
      pop(ctx, t, 2, () => { paper(ctx, cut(rect(1080, 300, 380, 150), 6520), C.cream, 2.6); T_(ctx, '≈ 2 km', 1270, 370, 52, C.red, 'Georgia, serif', 700); T_(ctx, '2–3 小時', 1270, 425, 30, C.ink, ZH); });
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 790, 1600, 130), 6521, 2), C.slate, 2.4));
    } },
  ],
};

/* ------------------------------------------------------------ 6. Bach & Lübeck */
STORIES.bach = {
  title: 'Bach in Lübeck', zh: '「音樂之父」巴哈與呂貝克', kind: '史實＋軼聞', music: 'bach_story',
  summary: '1705 年秋天，20 歲的約翰·塞巴斯蒂安·巴哈是阿恩施塔特的管風琴師。他向教會請了四週的假，據記載是步行約 400 公里前往呂貝克，只為了聆聽聖瑪利亞教堂的管風琴大師迪特里希·布克斯特胡德演奏，並欣賞他著名的「晚間音樂會」（Abendmusiken）。巴哈在呂貝克一待就是好幾個月，直到 1706 年初才回去，還因為超假被教會責問。一般認為布克斯特胡德的音樂對巴哈影響深遠。常被提起的軼事是：繼任布克斯特胡德職位的條件之一是娶他的女兒——韓德爾與馬特森 1703 年曾來應徵而作罷，巴哈據說也沒有接受（巴哈部分屬推測）。今天聖瑪利亞教堂仍有大型管風琴並經常舉辦音樂會。（巴哈被尊稱為「音樂之父」。配樂開頭是他的《D 小調觸技曲》，之後是《C 大調前奏曲》。）',
  scenes: [
    { d: 9, zh: '1705 年秋天，20 歲的巴哈在阿恩施塔特擔任管風琴師。', de: '1705 · Arnstadt', draw(ctx, t, T) {
      sky(ctx, '#e3d3b0', C.paper2);
      pop(ctx, t, 0.1, () => { paper(ctx, cut(rect(200, 120, 1200, 660), 7001, 1), '#d9c8a5', 0.8); for (let i = 0; i < 3; i++) paper(ctx, cut([...ellipse(420 + i * 380, 380, 120, 200, 20, Math.PI, Math.PI * 2), [540 + i * 380, 700], [300 + i * 380, 700]], 7002 + i), '#c4b08a', 1); });
      pop(ctx, t, 0.4, () => organ(ctx, 800, 700, 520, 460, 7010, 1.4));
      pop(ctx, t, 1, () => walker(ctx, 800, 780, 150, 0, '#2a2a34', 7050, 2.4, true));
      for (let i = 0; i < 6; i++) { const ph = (T * 0.4 + i / 6) % 1; noteGlyph(ctx, 560 + i * 90, 300 - ph * 240, 15, `rgba(29,34,48,${1 - ph})`); }
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 780, 1600, 140), 7060, 2), '#5a3b25', 2.4));
    } },
    { d: 10, zh: '他請了四週的假，從阿恩施塔特步行大約 400 公里到呂貝克。', de: 'Zu Fuß nach Lübeck – rund 400 km', draw(ctx, t, T) {
      sky(ctx, '#cbd6e0', '#efe3c8'); sun(ctx, 1380, 170, 50);
      for (let l = 0; l < 3; l++) pop(ctx, t, 0.1 + l * 0.15, () => paper(ctx, cut(wave(560 + l * 90, 40 - l * 10, 0.004 + l * 0.002, l * 2 + T * 0.05 * (l + 1)), 7101 + l), [C.grass, '#7f9a63', C.grass2][l], 1 + l * 0.5));
      for (let i = 0; i < 7; i++) pop(ctx, t, 0.3, () => { const x = (i * 260 + 100 - T * 30 * 1.5) % 1800 - 100; paper(ctx, cut(rect(x - 6, 560, 12, 80), 7110 + i), C.wood, 1.3); paper(ctx, cut(ellipse(x, 540, 40, 50, 14), 7120 + i, 1.2), '#556f42', 1.4); });
      walker(ctx, 700, 780, 170, T * 4, '#2a2a34', 7130, 2.6, true, true);
      const km = Math.min(400, Math.round(clamp(t / 9) * 400));
      pop(ctx, t, 0.6, () => { paper(ctx, cut(rect(1100, 120, 380, 150), 7140), C.cream, 2.6); T_(ctx, `${km} km`, 1290, 205, 64, C.red, 'Georgia, serif', 700); T_(ctx, 'Arnstadt → Lübeck', 1290, 250, 24, C.ink); });
    } },
    { d: 10, zh: '他想聽的是聖瑪利亞教堂的管風琴大師布克斯特胡德，和他著名的「晚間音樂會」。', de: 'Dieterich Buxtehude · Abendmusiken', draw(ctx, t, T) {
      sky(ctx, '#2a2433', '#40384a');
      pop(ctx, t, 0.1, () => { for (let i = 0; i < 5; i++) paper(ctx, cut([...ellipse(160 + i * 320, 420, 130, 300, 20, Math.PI, Math.PI * 2), [290 + i * 320, 900], [30 + i * 320, 900]], 7201 + i), '#3a3240', 0.8); });
      pop(ctx, t, 0.4, () => organ(ctx, 800, 640, 700, 560, 7210, 1.4));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(800, 300, 20, 800, 300, 600); g.addColorStop(0, `rgba(255,214,150,${0.28 + Math.sin(T * 2) * 0.04})`); g.addColorStop(1, 'rgba(255,214,150,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1600, 900); ctx.restore();
      for (let i = 0; i < 9; i++) pop(ctx, t, 1 + i * 0.12, () => paper(ctx, cut(person(260 + i * 130, 860, 150), 7260 + i, 0.6, 8), '#1c1a22', 2.6));
      for (let i = 0; i < 8; i++) { const ph = (T * 0.3 + i / 8) % 1; noteGlyph(ctx, 520 + i * 75, 380 - ph * 300, 16, `rgba(225,194,122,${1 - ph})`); }
    } },
    { d: 9, zh: '巴哈在呂貝克一待就是好幾個月，遠遠超過四週的假，回去後還被教會責問。', de: 'Vier Wochen? Vier Monate!', draw(ctx, t, T) {
      sky(ctx, '#e8dcc2', C.paper);
      for (let i = 0; i < 14; i++) { const k = clamp((t - 0.4 - i * 0.35) / 1.2); if (k <= 0) continue; ctx.save(); ctx.translate(800 + k * (i % 2 ? 500 : -500) * (0.4 + (i % 5) * 0.12), 420 - Math.sin(k * Math.PI) * 220 + k * 200); ctx.rotate(k * (i % 2 ? 1.5 : -1.5)); paper(ctx, cut(rect(-70, -90, 140, 180), 7301 + i, 0.6), C.salt, 2.4); T_(ctx, ['Okt', 'Nov', 'Dez', 'Jan', 'Feb'][i % 5], 0, -30, 30, C.red); T_(ctx, String(1 + ((i * 7) % 28)), 0, 40, 60, C.ink); ctx.restore(); }
      pop(ctx, t, 0.2, () => { paper(ctx, cut(rect(700, 300, 200, 240), 7330), C.salt, 2); T_(ctx, '1705', 800, 380, 34, C.red); T_(ctx, 'Okt.', 800, 460, 54, C.ink); });
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 760, 1600, 160), 7340, 2), C.wood, 2.4));
    } },
    { d: 10, zh: '傳說繼任布克斯特胡德職位的條件是娶他的女兒——韓德爾與馬特森都打退堂鼓，巴哈據說也沒有接受。', de: 'Die Bedingung', draw(ctx, t, T) {
      sky(ctx, '#d9c3a0', '#efe3c7');
      pop(ctx, t, 0.2, () => { paper(ctx, cut(person(800, 760, 300), 7401, 0.8, 8), '#6b2a3a', 2); paper(ctx, cut([...ellipse(800, 300, 70, 40, 16, Math.PI, Math.PI * 2), [870, 330], [730, 330]], 7402), '#5a3a22', 2.1); });
      [['Händel', 360, C.navy2], ['Mattheson', 560, C.copper2], ['Bach', 1150, '#2a2a34']].forEach(([n, x, col], i) => pop(ctx, t, 1 + i * 1.2, () => { const away = clamp((t - 2.2 - i * 1.2) / 2) * (x < 800 ? -260 : 260); walker(ctx, x + away, 760, 170, T * (away ? 4 : 0), col, 7410 + i * 10, 2.4, true); T_(ctx, n, x + away, 520, 30, C.ink); }));
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 760, 1600, 160), 7450, 2), C.wood, 2.4));
    } },
    { d: 9, zh: '今天的聖瑪利亞教堂仍有大型管風琴，經常舉辦管風琴音樂會。', de: 'Orgelmusik in St. Marien', draw(ctx, t, T) {
      sky(ctx, '#cfd9e2', C.paper); sun(ctx, 1320, 170, 55);
      pop(ctx, t, 0.1, () => drawParts(ctx, churchTwin(560, 760, 300), 7501, 1.4));
      for (let i = 0; i < 10; i++) { const ph = (T * 0.25 + i / 10) % 1; noteGlyph(ctx, 300 + i * 120 + Math.sin(T + i) * 20, 600 - ph * 450, 16, `rgba(156,59,40,${1 - ph})`); }
      for (let i = 0; i < 5; i++) pop(ctx, t, 1 + i * 0.3, () => walker(ctx, 1000 + i * 110, 760, 100, T * 2 + i, [C.navy2, C.red, C.copper2, C.wood, C.slate][i], 7510 + i * 10));
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 760, 1600, 160), 7550, 2), C.grass2, 2.4));
    } },
  ],
};

/* ------------------------------------------------------------ 7. Elbe–Lübeck Canal */
function lockScene(ctx, t, T, seed) {   // a lock chamber: water rises, barge rises with it, gate opens
  const lvl = easeOut((t - 1) / 5), wl = 640 - lvl * 120;
  paper(ctx, cut(rect(0, 760, 1600, 160), seed, 2), '#7d6748', 1);
  paper(ctx, cut(rect(0, 520, 380, 400), seed + 1), C.sea, 1.2);
  paper(ctx, cut(rect(380, wl, 840, 900 - wl), seed + 2, 1), C.sea, 1.2);
  paper(ctx, cut(rect(1220, 640, 380, 280), seed + 3), C.sea, 1.2);
  for (const x of [360, 1220]) paper(ctx, cut(rect(x, 420, 40, 380), seed + 4 + x, 0.6), C.wood, 2);
  barge(ctx, 800, wl - 4 + Math.sin(T * 1.5) * 3, 130, C.salt, seed + 10, 2.2);
  paper(ctx, cut(rect(380, 780, 840, 140), seed + 20, 1.5), '#8a8a84', 2.6);
}
STORIES.kanal = {
  title: 'Vom Salz zum Kanal', zh: '易北河與呂貝克運河', kind: '史實', music: 'ode',
  summary: '呂貝克的財富與鹽密不可分：南方呂內堡出產的鹽，要運到呂貝克再轉運北歐。1390 至 1398 年，人們開鑿施特克尼茨運河（Stecknitzkanal），經由默爾恩一帶的分水嶺把易北河水系與特拉沃河連起來，是歐洲最早的越嶺運河之一。平底的運鹽船沿運河慢慢前進，通過一道道水閘，一趟要花上好幾週（實際天數依季節水量而異）。1895 至 1900 年，舊運河改建成更寬更深的「易北河—呂貝克運河」（Elbe-Lübeck-Kanal），1900 年通航，全長約 62 公里。今天它沿著呂貝克舊城的東側流過，這一段叫「運河特拉沃」（Kanal-Trave），航行著貨船與遊艇。',
  scenes: [
    { d: 9, zh: '呂內堡出產的白色鹽，是呂貝克財富的來源；可是要把鹽運過來，路途又遠又慢。', de: 'Lüneburger Salz', draw(ctx, t, T) {
      sky(ctx, '#d8e0e6', '#efe3c8'); sun(ctx, 1320, 180, 55);
      pop(ctx, t, 0.1, () => paper(ctx, cut(wave(640, 30, 0.003, 1), 8001), C.grass, 1));
      pop(ctx, t, 0.3, () => { for (let i = 0; i < 5; i++) paper(ctx, cut([[200 + i * 50, 640], [240 + i * 50, 520 - i * 10], [280 + i * 50, 640]], 8002 + i, 0.8), C.salt, 1.6); });
      const x = 300 + easeOut(t / 9) * 800;
      pop(ctx, t, 0.6, () => { paper(ctx, cut(rect(x, 600, 200, 80), 8010), C.wood, 2); for (let k = 0; k < 3; k++) paper(ctx, cut(barrel(x + 40 + k * 60, 580, 50), 8011 + k), '#a7805a', 2.1); for (const wx of [x + 30, x + 170]) { ctx.save(); ctx.translate(wx, 690); ctx.rotate(T * 2); paper(ctx, cut(ellipse(0, 0, 30, 30, 12), 8015, 0.3), C.wood, 2.2); ctx.restore(); } paper(ctx, cut(ellipse(x + 260, 620, 60, 40, 14), 8016), '#8a6a4a', 2); });
      pop(ctx, t, 0.2, () => paper(ctx, cut(rect(0, 700, 1600, 220), 8020, 2), C.grass2, 2.4));
    } },
    { d: 10, zh: '1390 到 1398 年，人們挖出施特克尼茨運河，把易北河和特拉沃河連在一起——歐洲最早的越嶺運河之一。', de: '1398 · Stecknitzkanal', draw(ctx, t, T) {
      sky(ctx, '#e8dcc2', C.paper2);
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(120, 120, 1360, 660), 8101, 2, 40), '#c9d6b0', 0.6));
      pop(ctx, t, 0.3, () => { paper(ctx, cut([[120, 640], [400, 600], [700, 660], [1000, 700], [1480, 720], [1480, 780], [120, 780]], 8102, 2, 20), '#7fa3b8', 1); T_(ctx, 'Elbe', 300, 740, 34, C.navy, 'Georgia, serif', 600); });
      pop(ctx, t, 0.5, () => { paper(ctx, cut([[1100, 120], [1180, 120], [1160, 300], [1200, 420], [1140, 420], [1110, 300]], 8103, 1.5, 16), '#7fa3b8', 1); T_(ctx, 'Trave', 1260, 200, 34, C.navy); paper(ctx, cut(ellipse(1150, 150, 22, 22, 12), 8104, 0.5), C.red, 2); T_(ctx, 'Lübeck', 1150, 105, 30, C.red, 'Georgia, serif', 700); paper(ctx, cut(ellipse(640, 640, 18, 18, 12), 8105, 0.5), C.gold, 2); T_(ctx, 'Lauenburg', 640, 600, 26, C.ink); });
      const k = clamp((t - 1.2) / 5); ctx.save(); ctx.strokeStyle = '#3d6a86'; ctx.lineWidth = 10; ctx.setLineDash([2, 0]); ctx.beginPath(); const P0 = [[640, 640], [700, 560], [820, 500], [900, 470], [980, 440], [1080, 430], [1140, 420]]; const n = Math.floor(k * (P0.length - 1)); ctx.moveTo(...P0[0]); for (let i = 1; i <= n; i++) ctx.lineTo(...P0[i]); if (n < P0.length - 1) { const f = k * (P0.length - 1) - n; ctx.lineTo(P0[n][0] + (P0[n + 1][0] - P0[n][0]) * f, P0[n][1] + (P0[n + 1][1] - P0[n][1]) * f); } ctx.stroke(); ctx.restore();
      pop(ctx, t, 4.5, () => { paper(ctx, cut(rect(700, 240, 320, 90), 8110), C.cream, 2.6); T_(ctx, 'Stecknitzkanal 1398', 860, 298, 30, C.ink); });
    } },
    { d: 10, zh: '平底的運鹽船通過一道道水閘：閘室注水，船就跟著水面慢慢升高，一趟要走好幾週。', de: 'Schleusen und Salzprähme', draw(ctx, t, T) { sky(ctx, '#cbd6e0', C.paper); sun(ctx, 1360, 160, 50); lockScene(ctx, t, T, 8200); } },
    { d: 9, zh: '鹽到了呂貝克，先存進特拉沃河畔的鹽倉，再裝上柯克船，運往斯堪地那維亞。', de: 'In die Salzspeicher', draw(ctx, t, T) {
      sky(ctx, '#d9e1e7', C.paper);
      pop(ctx, t, 0.1, () => { const cols = [C.brick, C.brick2, C.brick3, C.brick, C.brick2, C.brick3]; for (let i = 0; i < 6; i++) { const x = 150 + i * 150; paper(ctx, cut(i % 2 ? steppedHouse(x, 640, 140, 280, 5) : gableHouse(x, 640, 140, 280, 0.9), 8301 + i), cols[i], 1.4); windows(ctx, x, 640, 140, 280, 5, 2); } });
      pop(ctx, t, 0.3, () => paper(ctx, cut(wave(660, 8, 0.01, T), 8310), C.sea, 1.8));
      barge(ctx, 500 + easeOut(t / 6) * 200, 690, 100, C.salt, 8320, 2.2);
      drawKogge(ctx, 1300, 670, 120, Math.sin(T * 1.3) * 0.04, 2.4);
      pop(ctx, t, 0.3, () => paper(ctx, cut(wave(750, 12, 0.006, T * 1.2 + 1), 8330), C.sea2, 2.6));
    } },
    { d: 10, zh: '1895 到 1900 年，舊運河改建成更寬更深的「易北河—呂貝克運河」，1900 年通航，全長約 62 公里。', de: '1900 · Elbe-Lübeck-Kanal', draw(ctx, t, T) {
      sky(ctx, '#c9d3dc', '#e8e1d2');
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 560, 1600, 360), 8401, 2), C.grass, 1));
      pop(ctx, t, 0.2, () => paper(ctx, cut([[0, 640], [1600, 600], [1600, 720], [0, 760]], 8402, 1.5, 20), C.sea, 1.4));
      const x = -200 + easeOut(t / 9) * 1300;
      pop(ctx, t, 0.4, () => { paper(ctx, cut([[x - 220, 640], [x + 220, 640], [x + 190, 690], [x - 200, 690]], 8410), C.ink, 2); paper(ctx, cut(rect(x - 140, 600, 120, 40), 8411), C.cream, 2.1); paper(ctx, cut(rect(x + 80, 560, 26, 80), 8412), C.red, 2.1); ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = '#ddd'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + 93 - k * 40, 540 - k * 25, 18 + k * 8, 0, 7); ctx.fill(); } ctx.restore(); });
      pop(ctx, t, 1.5, () => { paper(ctx, cut(rect(1040, 150, 440, 160), 8420), C.cream, 2.6); T_(ctx, '1900 · 62 km', 1260, 245, 54, C.red, 'Georgia, serif', 700); });
      for (let i = 0; i < 6; i++) pop(ctx, t, 0.6 + i * 0.1, () => paper(ctx, cut(person(120 + i * 70, 800, 110), 8430 + i, 0.6, 8), [C.navy, C.ink, C.red, C.navy2, C.wood, C.ink][i], 2.6));
    } },
    { d: 9, zh: '今天運河沿著舊城東側流過，這一段叫「運河特拉沃」，河上航行著貨船與遊艇。', de: 'Kanal-Trave heute', draw(ctx, t, T) {
      sky(ctx, '#e0c48e', '#efe2c7'); sun(ctx, 1380, 250, 70, '#f0b45e');
      pop(ctx, t, 0.1, () => { drawParts(ctx, churchTwin(560, 600, 140), 8501, 1); for (const h of skyline(620, 131, 80)) paper(ctx, cut(h.pts, h.x | 0), h.col, 1.2); });
      pop(ctx, t, 0.3, () => paper(ctx, cut(wave(640, 6, 0.01, T), 8510), '#5f86a0', 1.8));
      reflect(ctx, 642, 200, () => { for (const h of skyline(620, 131, 80)) { KIT.pathOf(ctx, h.pts); ctx.fillStyle = h.col; ctx.fill(); } }, 0.18);
      ripple(ctx, 660, 820, T);
      const x = 1700 - ((T * 40) % 2000);
      pop(ctx, t, 0.5, () => { paper(ctx, cut([[x - 90, 700], [x + 90, 700], [x + 70, 730], [x - 80, 730]], 8520), C.cream, 2.2); paper(ctx, cut([[x - 10, 700], [x - 10, 560], [x + 70, 690]], 8521), C.salt, 2.3); });
      pop(ctx, t, 0.2, () => paper(ctx, cut(rect(0, 820, 1600, 100), 8530, 2), C.grass2, 2.6));
    } },
  ],
};

/* ------------------------------------------------------------ 8. Malerwinkel */
STORIES.malerwinkel = {
  title: 'Der Malerwinkel', zh: '呂貝克的「畫家角落」', kind: '景點', music: 'canon_quartet',
  summary: '「畫家角落」（Malerwinkel）位在舊城西南側、特拉沃河上游（Obertrave）的河岸邊。從這裡望向對岸，可以看到老屋的背面、小花園與私人小碼頭，河面倒映著山牆和教堂尖塔，是畫家與攝影師最喜愛的取景點之一，因此得名。（位置依 OpenStreetMap 的觀景點標記。）',
  scenes: [
    { d: 9, zh: '舊城西南邊、特拉沃河上游的河岸，有一個安靜的角落。', de: 'An der Obertrave', draw(ctx, t, T) {
      sky(ctx, '#c9d6e2', '#efe3c8'); sun(ctx, 1340, 170, 50);
      pop(ctx, t, 0.1, () => drawParts(ctx, churchTwin(1150, 520, 120, C.brick2, C.copper), 9001, 0.8));
      const row = () => { const cols = [C.cream, C.brick, '#d8b98a', C.brick3, C.paper2, C.brick2, '#c98d6b', C.cream]; for (let i = 0; i < 8; i++) { const x = 60 + i * 190; paper(ctx, cut(i % 2 ? steppedHouse(x, 600, 180, 200 + (i % 3) * 30, 4) : gableHouse(x, 600, 180, 210 + (i % 3) * 25, 0.8), 9010 + i), cols[i], 1.2); windows(ctx, x, 600, 180, 210, 3, 3); } };
      pop(ctx, t, 0.3, row);
      pop(ctx, t, 0.5, () => paper(ctx, cut(rect(0, 600, 1600, 320), 9030, 1), '#5f86a0', 1.6));
      reflect(ctx, 600, 260, () => { const cols = [C.cream, C.brick, '#d8b98a', C.brick3, C.paper2, C.brick2, '#c98d6b', C.cream]; for (let i = 0; i < 8; i++) { const x = 60 + i * 190; KIT.pathOf(ctx, i % 2 ? steppedHouse(x, 600, 180, 200 + (i % 3) * 30, 4) : gableHouse(x, 600, 180, 210 + (i % 3) * 25, 0.8)); ctx.fillStyle = cols[i]; ctx.fill(); } }, 0.25);
      ripple(ctx, 610, 860, T);
    } },
    { d: 10, zh: '河面倒映著山牆老屋和教堂尖塔，畫家們特別愛來這裡寫生，於是它被叫做「畫家角落」。', de: 'Der Malerwinkel', draw(ctx, t, T) {
      sky(ctx, '#d6dde3', C.paper);
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 620, 1600, 300), 9101, 2), C.grass, 1));
      pop(ctx, t, 0.2, () => { paper(ctx, cut(rect(980, 360, 16, 300), 9102), C.wood, 1.4); paper(ctx, cut(ellipse(988, 330, 200, 150, 24), 9103, 2), '#5d7b46', 1.5); paper(ctx, cut(ellipse(1100, 380, 120, 100, 20), 9104, 2), '#6f8a56', 1.6); });
      easel(ctx, 640, 760, 300, (t - 1) / 7, T, 9110);
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 760, 1600, 160), 9120, 2), C.grass2, 2.6));
    } },
    { d: 9, zh: '從這一側看到的是老屋的背面：小花園、私人小碼頭，和臨街那一面的莊重完全不同。', de: 'Gärten und Bootsstege', draw(ctx, t, T) {
      sky(ctx, '#cfd9e2', C.paper); sun(ctx, 1380, 160, 50);
      pop(ctx, t, 0.1, () => { for (let i = 0; i < 5; i++) { const x = 120 + i * 290; paper(ctx, cut(gableHouse(x, 560, 260, 240, 0.8), 9201 + i), [C.cream, C.brick, '#d8b98a', C.brick3, C.paper2][i], 1.2); windows(ctx, x, 560, 260, 240, 3, 3); } });
      pop(ctx, t, 0.3, () => { for (let i = 0; i < 5; i++) { const x = 140 + i * 290; paper(ctx, cut(rect(x, 560, 220, 50), 9210 + i, 1), '#6f8a56', 1.5); for (let k = 0; k < 5; k++) paper(ctx, cut(ellipse(x + 20 + k * 45, 560, 22, 26, 10), 9220 + i * 5 + k, 0.8), ['#d23a3a', '#f4f1ea', '#e86f9a', '#5d7b46', '#f2c14a'][k], 1.6); } });
      pop(ctx, t, 0.4, () => paper(ctx, cut(rect(0, 610, 1600, 310), 9240, 1), '#5f86a0', 1.7));
      for (let i = 0; i < 4; i++) pop(ctx, t, 0.6 + i * 0.2, () => { const x = 220 + i * 360; paper(ctx, cut(rect(x, 600, 120, 16), 9250 + i), C.wood, 2); for (let k = 0; k < 3; k++) paper(ctx, rect(x + k * 55, 600, 8, 70), C.wood, 2); paper(ctx, cut([[x + 130, 660 + Math.sin(T * 1.5 + i) * 4], [x + 250, 660 + Math.sin(T * 1.5 + i) * 4], [x + 230, 685], [x + 145, 685]], 9260 + i), ['#2f4566', C.red, C.cream, C.copper2][i], 2.2); });
      ripple(ctx, 630, 880, T);
    } },
    { d: 9, zh: '傍晚時分，金色的天空倒映在水面上，是寫生和拍照最美的時刻。', de: 'Abendstimmung', draw(ctx, t, T) {
      sky(ctx, '#e7a35f', '#f2d49a'); sun(ctx, 800, 480, 90, '#f6c46a');
      pop(ctx, t, 0.1, () => { drawParts(ctx, churchTwin(1120, 520, 110, '#5a2f2a', '#3d5a50'), 9301, 1); for (const h of skyline(540, 141, 90)) paper(ctx, cut(h.pts, h.x | 0), '#4a2a2a', 1.2); });
      pop(ctx, t, 0.3, () => paper(ctx, cut(rect(0, 540, 1600, 380), 9310, 1), '#c9814a', 1.4));
      reflect(ctx, 540, 300, () => { for (const h of skyline(540, 141, 90)) { KIT.pathOf(ctx, h.pts); ctx.fillStyle = '#3a2020'; ctx.fill(); } ctx.fillStyle = '#f6c46a'; ctx.beginPath(); ctx.arc(800, 480, 90, 0, 7); ctx.fill(); }, 0.35);
      ripple(ctx, 560, 860, T, 'rgba(255,230,170,0.5)');
      drawKogge(ctx, 400 + Math.sin(T * 0.2) * 40, 640, 60, Math.sin(T) * 0.03, 2);
    } },
    { d: 8, zh: '直到今天，這裡仍是攝影師和旅人最喜歡的取景點之一。', de: 'Ein Lieblingsmotiv', draw(ctx, t, T) {
      sky(ctx, '#d3dce3', C.paper);
      pop(ctx, t, 0.1, () => { paper(ctx, cut(rect(300, 160, 1000, 560), 9401, 1), C.cream, 1.2); ctx.save(); ctx.beginPath(); ctx.rect(330, 190, 940, 500); ctx.clip(); const g = ctx.createLinearGradient(0, 190, 0, 690); g.addColorStop(0, '#cfe0ea'); g.addColorStop(1, '#5f86a0'); ctx.fillStyle = g; ctx.fillRect(330, 190, 940, 500); for (const h of skyline(470, 151, 90)) { KIT.pathOf(ctx, h.pts); ctx.fillStyle = h.col; ctx.fill(); } ctx.restore(); });
      const flash = (T % 3) < 0.12; if (flash) { ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(0, 0, 1600, 900); ctx.restore(); }
      pop(ctx, t, 0.6, () => { walker(ctx, 1380, 860, 170, 0, C.navy2, 9410, 2.6); paper(ctx, cut(rect(1290, 590, 70, 46), 9420, 0.3), C.ink, 2.8); });
    } },
  ],
};


/* ------------------------------------------------------------ Dom: more about its founder */
STORIES.dom.scenes.unshift({ d: 8, zh: '獅子亨利是薩克森與巴伐利亞公爵，十二世紀北德最有權勢的諸侯之一，紋章是一頭獅子。', de: 'Heinrich der Löwe, Herzog von Sachsen und Bayern', draw(ctx, t, T) {
  sky(ctx, '#2f4566', '#5e6f88'); stars(ctx, 30, 21, T);
  pop(ctx, t, 0.2, () => { ctx.save(); ctx.translate(1180, 380); ctx.rotate(Math.sin(T) * 0.03); paper(ctx, cut([[-150, -170], [150, -170], [150, 60], [0, 190], [-150, 60]], 9601), '#b0242a', 2); ctx.restore(); T_(ctx, '♌', 1180, 450, 190, C.gold2, 'Georgia, serif', 400); });
  pop(ctx, t, 0.6, () => henry(ctx, 560, 800, 560, T, 'sword', 2));
  pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 800, 1600, 120), 9602, 2), '#3a2a22', 2.4));
} });
STORIES.dom.scenes.push({ d: 9, zh: '1942 年的空襲中，主教座堂也嚴重受損；戰後花了數十年才修復完成。', de: 'Zerstörung und Wiederaufbau', draw(ctx, t, T) {
  sky(ctx, t < 4 ? '#3a2530' : '#cfd9e2', t < 4 ? C.night : C.paper);
  const k = clamp((t - 4) / 4);
  pop(ctx, t, 0.1, () => { const p = churchTwin(600, 760, 230, t < 4 ? '#3a2a2a' : C.brick2, t < 4 ? '#2a3a35' : C.copper2); for (const sh of p) { ctx.save(); ctx.beginPath(); ctx.rect(0, t < 4 ? 0 : 760 - 700 * k, 1600, 900); ctx.clip(); paper(ctx, cut(sh.pts, 9610), sh.col, 1.6); ctx.restore(); } });
  if (t < 4) for (let i = 0; i < 6; i++) paper(ctx, cut(flame(520 + i * 70, 760, 80 + (i % 3) * 30, T + i), 9620 + i), i % 2 ? C.fire : C.fire2, 2.2);
  else for (let i = 0; i < 3; i++) walker(ctx, 1050 + i * 130, 760, 110, T * 3 + i, [C.navy2, C.red, C.wood][i], 9630 + i * 10);
  pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 760, 1600, 160), 9650, 2), C.grass2, 2.4));
} });
STORIES.dom.summary += '1942 年 3 月的空襲中主教座堂嚴重受損，戰後經過數十年才修復完成（完工年份待核對）。';


/* ------------------------------------------------------------ 9. Lübeck Hauptbahnhof */
function steamTrain(ctx, x, base, s, T, seed, cars = 3) {
  for (let i = 0; i < cars; i++) { const cx = x - (i + 1) * 2.3 * s; paper(ctx, cut(rect(cx - 1.05 * s, base - 1.1 * s, 2.1 * s, 0.85 * s), seed + i, 0.6, 10), ['#5a2a22', '#2f4a3a', '#5a2a22'][i % 3], 2.2); windows(ctx, cx - 0.95 * s, base - 0.45 * s, 1.9 * s, 0.5 * s, 1, 4, C.cream, 0.8); for (const wx of [-0.7, 0.7]) paper(ctx, cut(ellipse(cx + wx * s, base - 0.2 * s, 0.2 * s, 0.2 * s, 12), seed + 10 + i, 0.3), C.ink, 2.4); }
  paper(ctx, cut(rect(x - 1.1 * s, base - 1.0 * s, 1.6 * s, 0.6 * s), seed + 20, 0.6), C.ink, 2.3);   // boiler
  paper(ctx, cut(rect(x - 1.6 * s, base - 1.4 * s, 0.7 * s, 1.0 * s), seed + 21, 0.6), '#2a2a30', 2.3);   // cab
  paper(ctx, cut(rect(x + 0.2 * s, base - 1.55 * s, 0.22 * s, 0.6 * s), seed + 22, 0.4), C.ink, 2.4);   // chimney
  for (const wx of [-1.3, -0.6, 0.1]) { ctx.save(); ctx.translate(x + wx * s, base - 0.25 * s); ctx.rotate(T * 3); paper(ctx, cut(ellipse(0, 0, 0.26 * s, 0.26 * s, 14), seed + 30, 0.3), C.red, 2.5); ctx.restore(); }
  for (let k = 0; k < 5; k++) { const ph = (T * 0.6 + k / 5) % 1; ctx.save(); ctx.globalAlpha = (1 - ph) * 0.55; ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.arc(x + 0.3 * s - ph * 2.5 * s, base - 1.7 * s - ph * 1.4 * s, (0.2 + ph * 0.5) * s, 0, 7); ctx.fill(); ctx.restore(); }
}
function modernTrain(ctx, x, base, s, seed) {
  for (let i = 0; i < 3; i++) { const cx = x - i * 2.6 * s; paper(ctx, cut([[cx - 1.25 * s, base], [cx - 1.25 * s, base - 1.05 * s], [cx + 1.1 * s, base - 1.05 * s], [cx + 1.3 * s, base - 0.6 * s], [cx + 1.3 * s, base]], seed + i, 0.5, 10), '#c8322b', 2.3); paper(ctx, cut(rect(cx - 1.1 * s, base - 0.85 * s, 2.1 * s, 0.32 * s), seed + 5 + i, 0.3), '#2a3540', 2.4); paper(ctx, cut(rect(cx - 1.25 * s, base - 0.35 * s, 2.55 * s, 0.1 * s), seed + 9 + i, 0.3), C.cream, 2.4); }
}
function stationFront(ctx, cx, base, s, night) {
  const W = 6 * s;
  paper(ctx, cut(rect(cx - W / 2, base - 2.6 * s, W, 2.6 * s), 9701), C.brick, 1.6);
  paper(ctx, cut([[cx - W / 2 - 0.2 * s, base - 2.6 * s], [cx, base - 3.9 * s], [cx + W / 2 + 0.2 * s, base - 2.6 * s]], 9702), '#2c3442', 1.6);
  for (let i = 0; i < 3; i++) { const ax = cx - W / 3 + i * W / 3; paper(ctx, cut([...ellipse(ax, base - 1.6 * s, 0.75 * s, 0.75 * s, 18, Math.PI, Math.PI * 2), [ax + 0.75 * s, base - 0.7 * s], [ax - 0.75 * s, base - 0.7 * s]], 9703 + i, 0.5), night ? '#f2c66e' : '#8fa8ba', 1.8); }
  for (const [tx, tw, th] of [[-W / 2, 1.0, 4.0], [W / 2, 1.0, 4.0], [-W / 6, 0.55, 3.4], [W / 6, 0.55, 3.4]]) { paper(ctx, cut(rect(cx + tx - tw / 2 * s, base - th * s, tw * s, th * s), 9710 + tx, 0.5), C.brick2, 2); paper(ctx, cut(ellipse(cx + tx, base - th * s, tw * 0.62 * s, tw * 0.5 * s, 14, Math.PI, Math.PI * 2), 9720 + tx, 0.4), C.copper, 2.1); }
  paper(ctx, cut(rect(cx - 0.45 * s, base - 4.8 * s, 0.9 * s, 1.1 * s), 9730), C.copper, 1.5);
  paper(ctx, cut(rect(cx - W / 2, base - 0.7 * s, W, 0.7 * s), 9731), '#cdbf9e', 2);
}
STORIES.bahnhof = {
  title: 'Der Lübecker Hauptbahnhof', zh: '呂貝克中央車站的故事', kind: '史實', music: 'jesu',
  summary: '呂貝克的鐵路始於 1851 年：呂貝克—比興（Büchen）鐵路通車，把城市接上通往漢堡與柏林的鐵路網，第一座車站就設在霍爾斯滕門旁。1865 年直達漢堡的鐵路開通，客貨量快速成長，舊車站很快就不敷使用，還擠在古城門邊。1906 至 1908 年，新車站在更西邊落成，由建築師 Fritz Klingholz 設計，1908 年 5 月 1 日啟用，就是今天看到的紅磚建築：三扇巨大的拱窗、銅綠圓頂的塔樓與中央鐘塔。2008 年車站百年之際完成整修，同年漢堡—呂貝克線也完成電氣化。今天這裡是什勒斯維希—霍爾斯坦邦最重要的車站之一，有開往漢堡（約 40 至 45 分鐘）、基爾、特拉沃明德、呂內堡等地的列車。依德國鐵路公布的概略數字，每天約有三萬名旅客與訪客進出這座車站（各年統計不同，數字待核對）。',
  scenes: [
    { d: 9, zh: '1851 年，呂貝克—比興鐵路通車，呂貝克第一次接上德國的鐵路網，第一座車站就在霍爾斯滕門旁。', de: '1851 · Lübeck–Büchen', draw(ctx, t, T) {
      sky(ctx, '#d3dce3', C.paper); sun(ctx, 1380, 170, 50);
      pop(ctx, t, 0.1, () => drawHolstentor(ctx, 1150, 700, 220, 1.2));
      pop(ctx, t, 0.3, () => { paper(ctx, cut(rect(200, 560, 520, 140), 9801), C.cream, 1.3); paper(ctx, cut([[180, 560], [460, 470], [740, 560]], 9802), C.slate, 1.4); windows(ctx, 220, 700, 480, 120, 1, 6); });
      pop(ctx, t, 0.2, () => { paper(ctx, cut(rect(0, 700, 1600, 220), 9803, 2), C.slate, 2); ctx.save(); ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 5; for (const y of [745, 775]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1600, y); ctx.stroke(); } ctx.restore(); });
      steamTrain(ctx, -200 + easeOut(t / 8) * 900, 760, 110, T, 9810);
    } },
    { d: 9, zh: '1865 年，直達漢堡的鐵路開通，旅客和貨物越來越多，擠在古城門邊的舊車站很快就不夠用了。', de: '1865 · Hamburg–Lübeck', draw(ctx, t, T) {
      sky(ctx, '#e3d3b0', C.paper2);
      pop(ctx, t, 0.2, () => { paper(ctx, cut(rect(0, 700, 1600, 220), 9820, 2), C.slate, 2); ctx.save(); ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 5; for (const y of [745, 775]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1600, y); ctx.stroke(); } ctx.restore(); });
      steamTrain(ctx, 300 + easeOut(t / 8) * 900, 760, 100, T, 9830, 5);
      for (let i = 0; i < 14; i++) pop(ctx, t, 0.4 + i * 0.12, () => paper(ctx, cut(person(80 + i * 105, 700, 90 + (i % 3) * 15), 9840 + i, 0.5, 8), [C.navy, C.ink, C.red, C.wood, C.navy2][i % 5], 2.5));
      pop(ctx, t, 1, () => { paper(ctx, cut(rect(560, 180, 480, 130), 9860), C.cream, 2.6); T_(ctx, 'Hamburg ⇄ Lübeck', 800, 262, 46, C.ink); });
    } },
    { d: 10, zh: '1906 到 1908 年，新車站在更西邊落成，由建築師 Fritz Klingholz 設計，1908 年 5 月 1 日啟用。', de: '1. Mai 1908 · Fritz Klingholz', draw(ctx, t, T) {
      sky(ctx, '#cbd6e0', C.paper); sun(ctx, 1380, 160, 50);
      const k = clamp(t / 5);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 760 - 700 * k, 1600, 900); ctx.clip(); stationFront(ctx, 800, 760, 110, false); ctx.restore();
      if (t < 5) pop(ctx, t, 0.2, () => { for (let i = 0; i < 6; i++) paper(ctx, rect(480 + i * 130, 260, 6, 500), C.wood, 2.4); for (let j = 0; j < 4; j++) paper(ctx, rect(470, 320 + j * 120, 680, 6), C.wood, 2.4); });
      pop(ctx, t, 5.2, () => { paper(ctx, cut(rect(1180, 180, 300, 110), 9870), C.cream, 2.6); T_(ctx, '1908', 1330, 255, 60, C.red, 'Georgia, serif', 700); });
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 760, 1600, 160), 9871, 2), C.slate, 2.4));
    } },
    { d: 9, zh: '紅磚與白色石帶、三扇巨大的拱窗、銅綠圓頂的塔樓和中央鐘塔——傍晚亮燈時最好看。', de: 'Backstein, Kupfer, drei große Bögen', draw(ctx, t, T) {
      sky(ctx, '#1e3a6b', '#3a5a8b'); stars(ctx, 20, 31, T);
      pop(ctx, t, 0.1, () => stationFront(ctx, 800, 780, 125, true));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(800, 560, 30, 800, 560, 520); g.addColorStop(0, 'rgba(255,200,120,0.25)'); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1600, 900); ctx.restore();
      for (let i = 0; i < 5; i++) pop(ctx, t, 0.8 + i * 0.3, () => walker(ctx, 300 + i * 250 + Math.sin(T * 0.4 + i) * 40, 800, 100, T * 3 + i, [C.navy2, C.red, C.copper2, C.wood, C.ink][i], 9880 + i * 10));
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 780, 1600, 140), 9890, 2), '#2a2a34', 2.6));
    } },
    { d: 9, zh: '2008 年車站滿一百年，完成整修；同一年，往漢堡的鐵路也完成電氣化。', de: '2008 · 100 Jahre, elektrifiziert', draw(ctx, t, T) {
      sky(ctx, '#d6dee5', C.paper);
      pop(ctx, t, 0.1, () => { ctx.save(); ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 3; for (let x = 100; x < 1600; x += 300) { ctx.beginPath(); ctx.moveTo(x, 760); ctx.lineTo(x, 430); ctx.lineTo(x + 60, 430); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(0, 450); ctx.lineTo(1600, 450); ctx.stroke(); ctx.restore(); });
      modernTrain(ctx, 300 + easeOut(t / 8) * 1100, 740, 120, 9900);
      pop(ctx, t, 0.2, () => paper(ctx, cut(rect(0, 740, 1600, 180), 9910, 2), C.slate, 2.2));
      pop(ctx, t, 1.4, () => { paper(ctx, cut(rect(560, 140, 480, 140), 9911), C.cream, 2.6); T_(ctx, '1908 – 2008', 800, 225, 54, C.red, 'Georgia, serif', 700); });
    } },
    { d: 11, zh: '今天每天約有三萬名旅客與訪客進出這座車站，到漢堡只要 40 多分鐘，也有車開往基爾、特拉沃明德和呂內堡。', de: 'Rund 30 000 Reisende am Tag', draw(ctx, t, T) {
      sky(ctx, '#e8dcc2', C.paper);
      const n = Math.round(clamp((t - 0.5) / 5) * 30000);
      pop(ctx, t, 0.3, () => { paper(ctx, cut(rect(420, 160, 760, 220), 9920), '#10203a', 2); T_(ctx, n.toLocaleString('de-DE'), 800, 290, 110, '#ffd34a', '"IBM Plex Mono", monospace', 700); T_(ctx, 'Reisende pro Tag · 每天', 800, 350, 30, '#ffffff', ZH, 500); });
      [['Hamburg', '≈ 45 min'], ['Kiel', '≈ 75 min'], ['Travemünde', '≈ 20 min'], ['Lüneburg', '≈ 70 min']].forEach(([c2, m], i) => pop(ctx, t, 2 + i * 0.6, () => { paper(ctx, cut(rect(200 + i * 310, 460, 270, 120), 9930 + i), C.cream, 2.4); T_(ctx, c2, 335 + i * 310, 510, 34, C.ink); T_(ctx, m, 335 + i * 310, 555, 28, C.red); }));
      for (let i = 0; i < 12; i++) { const x = ((T * 60 + i * 140) % 1700) - 50; walker(ctx, x, 800, 70, T * 4 + i, [C.navy2, C.red, C.copper2, C.wood, C.ink][i % 5], 9950 + i * 10); }
      pop(ctx, t, 0.1, () => paper(ctx, cut(rect(0, 800, 1600, 120), 9990, 2), C.slate, 2.6));
    } },
  ],
};

/* ------------------------------------------------------------ which films belong to which places */
Object.assign(STORY_AT, {
  holstentor: ['holstentor', 'sieben', 'route'], st_petri: ['sieben'], st_marien: ['st_marien', 'bach'], teufel: ['teufel', 'bach'],
  buddenbrookhaus: ['mann'], malerwinkel: ['malerwinkel'], kanal: ['kanal'], salzspeicher: ['salzspeicher', 'kanal'],
  schiffergesellschaft: ['hanse'], st_jakobi: ['sieben'], burgtor: ['route'], hauptbahnhof: ['bahnhof'],
});

/* ------------------------------------------------------------ music & sound effects for every film */
const MUSIC = { luebeck: 'canon', teufel: 'toccata_minuet', holstentor: 'feste_burg', salzspeicher: 'jesu', st_marien: 'prelude_organ', rathaus: 'ode', dom: 'prelude_organ', musikhochschule: 'lullaby' };
for (const [k, m] of Object.entries(MUSIC)) if (STORIES[k] && !STORIES[k].music) STORIES[k].music = m;
const SFX = {
  luebeck: [['waves', 'birds'], ['hammer', 'birds'], ['fire'], ['quill'], ['fire', 'hammer'], ['piledrive'], ['rain'], ['crowd', 'gull'], ['march'], ['quill'], ['fire', 'boom'], ['hammer'], ['bell'], ['quill'], ['gull', 'waves', 'bell']],
  teufel: [['hammer', 'birds'], ['crowd'], ['hammer', 'bell'], ['wind'], ['stone']],
  holstentor: [['hammer'], ['wind', 'steps'], ['piledrive'], ['quill'], ['coins']],
  salzspeicher: [['wind'], ['crowd'], ['waves', 'gull', 'creak'], ['waves', 'gull'], ['birds']],
  st_marien: [['hammer'], ['bell', 'birds'], ['fire', 'boom'], ['bell']],
  rathaus: [['crowd'], ['crowd', 'quill']], dom: [['wind'], ['hammer'], ['birds', 'bell'], ['fire', 'hammer']],
  niederegger: [['waves', 'gull'], ['wind'], ['crowd'], ['fire'], ['clock'], ['coins'], ['crowd']],
  musikhochschule: [['birds'], [], ['quill'], ['quill'], ['cheer'], ['waves', 'birds']],
  hanse: [['waves', 'gull'], ['waves', 'creak'], [], ['waves', 'gull'], [], ['crowd', 'quill'], ['rain', 'waves', 'wind'], ['waves'], ['crowd']],
  sieben: [['bell', 'birds'], ['bell'], ['canal'], ['creak'], ['crowd'], ['hammer'], ['wind', 'birds']],
  mann: [['birds'], ['crowd'], ['rain'], ['quill'], ['cheer'], ['projector'], ['steps', 'birds']],
  route: [['quill'], ['steps', 'waves'], ['steps', 'bell'], ['steps', 'crowd'], ['steps'], ['steps', 'birds']],
  bach: [[], ['steps', 'birds', 'wind'], [], ['wind'], ['steps'], ['bell', 'birds']],
  kanal: [['steps', 'wind'], ['quill'], ['lock', 'canal'], ['waves', 'gull'], ['canal', 'cheer'], ['canal', 'gull']],
  bahnhof: [['train', 'birds'], ['train', 'crowd'], ['hammer'], ['crowd'], ['train'], ['crowd', 'steps']],
  malerwinkel: [['canal', 'birds'], ['birds'], ['canal', 'oars'], ['canal', 'gull'], ['birds']],
};
for (const [k, v] of Object.entries(SFX)) if (STORIES[k]) STORIES[k].sfx = v;
