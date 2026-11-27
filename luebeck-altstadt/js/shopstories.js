// Short paper-cut films for the shops you can walk into: Café Niederegger (Stammhaus), Fangfrisch (fish rolls and
// house-brewed beer on the Untertrave) and the CITTI-PARK shopping centre. Dates and facts are the commonly published
// ones; anything not checked here is worded loosely or marked in the summary.
import { STORIES, STORY_AT, KIT } from './stories.js';
const { C, paper, cut, rect, ellipse, wave, steppedHouse, gableHouse, windows, flame, skyline, person, clamp, easeOut, pop, sky, sun, drawKogge, barrel, fish } = KIT;

const T_ = (ctx, s, x, y, size = 30, col = C.ink, font = 'Georgia, serif', weight = 600, align = 'center') => { ctx.save(); ctx.fillStyle = col; ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); ctx.restore(); };
const ZH = '"Noto Sans TC", "PingFang TC", sans-serif';
function almond(cx, cy, s, a = 0) { const p = []; for (let i = 0; i <= 20; i++) { const u = i / 20 * Math.PI * 2, x = Math.cos(u) * s, y = Math.sin(u) * s * 0.55 * (1 - 0.35 * Math.cos(u)); p.push([cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]); } return p; }
const crowd = (ctx, t, T, base, n, seed, cols) => { for (let i = 0; i < n; i++) pop(ctx, t, 0.4 + i * 0.12, () => { const x = 120 + (i * 1460) / n + Math.sin(T * 0.8 + i) * 6; paper(ctx, cut(person(x, base, 90 + (i % 3) * 8), seed + i, 0.4, 6), cols[i % cols.length], 2.2); }); };
const label = (ctx, t, d, s, x, y, w, col = C.cream, tc = C.red) => pop(ctx, t, d, () => { paper(ctx, cut(rect(x - w / 2, y - 36, w, 72), 7000 + (x | 0) + (y | 0)), col, 2.6); T_(ctx, s, x, y, 38, tc, 'Georgia, serif', 700); });

STORIES.niederegger_haus = {
  title: 'Café Niederegger', zh: 'Niederegger 本店', kind: '店家介紹',
  summary: '位於 Breite Straße 89、市政廳旁的 Niederegger 本店（Stammhaus）。1806 年由 Johann Georg Niederegger 在呂貝克創立，以杏仁膏（Marzipan）聞名；一樓是杏仁膏專賣的禮品店，後面是咖啡廳與蛋糕櫃台，樓上還有杏仁膏相關的展示。店內擺設為依照你提供的照片重現，細節不一定與現場完全相同。',
  scenes: [
    { d: 8, zh: '在市政廳旁的 Breite Straße 89，有一棟白牆、紅色菱格裝飾的老店——Niederegger 本店。', de: 'Breite Straße 89', draw(ctx, t, T) {
      sky(ctx, '#cfd8df', '#ece6d8');
      pop(ctx, t, 0.1, () => { for (const h of skyline(700, 41, 110)) paper(ctx, cut(h.pts, h.x | 0), h.col, 1); });
      pop(ctx, t, 0.4, () => { paper(ctx, cut(rect(420, 360, 760, 360), 7101), '#f4f0e6', 2); paper(ctx, cut(rect(420, 360, 760, 70), 7102), '#fbf8f0', 2.2); T_(ctx, 'J. G. NIEDEREGGER', 800, 396, 40, '#7a1f2b', 'Georgia, serif', 700);
        for (const x of [450, 920]) paper(ctx, cut(rect(x, 470, 210, 200), 7103 + x), '#7a1f2b', 2.4); paper(ctx, cut(rect(700, 470, 190, 250), 7104), '#d9b45a', 2.4); for (let i = 0; i < 5; i++) paper(ctx, cut(rect(446 + i * 40, 480, 8, 180), 7110 + i, 0.2), '#a8404a', 2.6); });
      pop(ctx, t, 1.2, () => { for (let i = 0; i < 4; i++) paper(ctx, cut([[440 + i * 200, 360], [440 + i * 200, 250], [520 + i * 200, 280], [440 + i * 200, 310]], 7120 + i), ['#c8402e', '#2f6ab0', '#f0c030', '#e8e4dc'][i], 2.8); });
      pop(ctx, t, 0.2, () => paper(ctx, cut(rect(0, 720, 1600, 200), 7130, 2), C.slate, 2.6));
    } },
    { d: 9, zh: '1806 年，Johann Georg Niederegger 在呂貝克接手一家糕點店，之後專心做起杏仁膏。', de: '1806 gegründet', draw(ctx, t, T) {
      sky(ctx, '#e8dcc2', C.paper);
      const n = Math.round(1700 + clamp(t / 5) * 106);
      pop(ctx, t, 0.2, () => { paper(ctx, cut(rect(480, 170, 640, 200), 7201), '#10203a', 2); T_(ctx, String(n), 800, 270, 130, '#ffd34a', '"IBM Plex Mono", monospace', 700); });
      pop(ctx, t, 0.8, () => { paper(ctx, cut(ellipse(800, 640, 420, 80, 40), 7202, 1), C.wood, 1.8); for (let i = 0; i < 7; i++) paper(ctx, cut(almond(560 + i * 80, 600 - (i % 2) * 14, 34, i * 0.4), 7210 + i, 0.3, 6), '#e9cf9b', 2.4); });
      pop(ctx, t, 1.6, () => paper(ctx, cut(person(1190, 760, 190), 7230, 0.5, 6), C.navy2, 2.4));
    } },
    { d: 10, zh: '一樓是杏仁膏專賣區：禮盒、杏仁麵包、各種造型的杏仁糖，架上的玻璃櫃裡擺著瓷器和聖誕裝飾。', de: 'Marzipan-Salon', draw(ctx, t, T) {
      sky(ctx, '#f0e4cf', '#fbf3e4');
      pop(ctx, t, 0.1, () => { for (let i = 0; i < 4; i++) { paper(ctx, cut(rect(180 + i * 340, 190, 280, 330), 7301 + i), '#8a5a34', 1.8); paper(ctx, cut(rect(196 + i * 340, 206, 248, 298), 7311 + i, 0.4), '#f3e7c8', 2); for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) paper(ctx, cut(rect(212 + i * 340 + c * 58, 226 + r * 92, 40, 60), 7320 + i * 20 + r * 4 + c, 0.3), ['#c8402e', '#2f6ab0', '#e9cf9b', '#5f9b86'][(r + c + i) % 4], 2.4); } });
      pop(ctx, t, 0.9, () => { paper(ctx, cut([[650, 760], [800, 520], [950, 760]], 7340), '#c8402e', 2.6); paper(ctx, cut(rect(700, 640, 200, 22), 7341, 0.3), '#f4f1ea', 2.8); });
      pop(ctx, t, 0.5, () => paper(ctx, cut(rect(0, 760, 1600, 160), 7342, 2), '#d9c8a4', 2.6));
    } },
    { d: 10, zh: '往裡走是咖啡廳：酒紅色的牆上掛著金框肖像，白色的吊燈垂在圓木桌上方，可以點一塊杏仁蛋糕配咖啡。', de: 'Café-Salon', draw(ctx, t, T) {
      sky(ctx, '#7a1f2b', '#8d2a38');
      pop(ctx, t, 0.1, () => { for (const [x, y, w, h] of [[300, 300, 130, 170], [500, 270, 160, 210], [740, 250, 220, 270], [1040, 260, 250, 230], [1340, 310, 130, 170]]) { paper(ctx, cut(rect(x, y, w, h), 7400 + x), '#e8c030', 2.2); paper(ctx, cut(rect(x + 12, y + 12, w - 24, h - 24), 7401 + x, 0.3), '#2a2a2e', 2.4); paper(ctx, cut(ellipse(x + w / 2, y + h * 0.4, w * 0.16, h * 0.14, 14), 7402 + x, 0.3), '#e2b38f', 2.6); paper(ctx, cut(rect(x + w * 0.28, y + h * 0.55, w * 0.44, h * 0.35), 7403 + x, 0.3), '#1d2230', 2.6); } });
      pop(ctx, t, 0.6, () => { for (let i = 0; i < 8; i++) paper(ctx, cut(rect(560 + i * 70, 40, 24, 70), 7410 + i, 0.3), '#111', 2.6); paper(ctx, cut(rect(540, 100, 540, 18), 7420), '#f4f1ea', 2.7); });
      pop(ctx, t, 1.2, () => { for (const x of [380, 800, 1220]) { paper(ctx, cut(ellipse(x, 700, 120, 26, 24), 7430 + x), '#a8704a', 2.4); paper(ctx, cut(rect(x - 8, 700, 16, 120), 7431 + x, 0.3), '#6b4a32', 2.2); } });
    } },
    { d: 9, zh: '最裡面是蛋糕櫃台：圓形的木頭櫃檯、玻璃櫃裡的各式蛋糕，身穿紅背心的店員正在幫客人裝盒。', de: 'Tortentheke', draw(ctx, t, T) {
      sky(ctx, '#f0e4cf', '#fbf3e4');
      pop(ctx, t, 0.1, () => { paper(ctx, cut(rect(0, 80, 1600, 220), 7501), '#8d2a38', 1.4); for (let i = 0; i < 28; i++) paper(ctx, cut(rect(30 + i * 56, 250, 22, 6), 7502 + i, 0.2), '#ff4a7a', 1.6); });
      pop(ctx, t, 0.5, () => { paper(ctx, cut(rect(380, 480, 840, 280), 7510), '#a8704a', 2); for (let i = 0; i < 5; i++) paper(ctx, cut(rect(410 + i * 160, 520, 130, 200), 7511 + i, 0.4), '#8a5a34', 2.2); paper(ctx, cut(rect(380, 400, 840, 90), 7520), '#cfe6ea', 2.2); for (let i = 0; i < 7; i++) paper(ctx, cut(rect(410 + i * 110, 420, 80, 50), 7521 + i, 0.4), ['#f3e7c8', '#c8402e', '#e9cf9b'][i % 3], 2.5); });
      pop(ctx, t, 1.1, () => paper(ctx, cut(person(800, 480, 200), 7530, 0.5, 6), '#b8302e', 2.4));
      crowd(ctx, t, T, 840, 5, 7540, [C.navy2, C.copper2, C.wood, C.ink]);
    } },
    { d: 8, zh: '今天來到呂貝克，很多人都會在這裡買一盒杏仁糖帶回家——試試看，在店裡走一圈吧。', de: 'Ein Stück Lübeck zum Mitnehmen', draw(ctx, t, T) {
      sky(ctx, '#e8dcc2', C.paper);
      for (let i = 0; i < 12; i++) pop(ctx, t, 0.2 + i * 0.1, () => paper(ctx, cut(almond(300 + (i % 6) * 190, 330 + Math.floor(i / 6) * 120, 42, i * 0.5), 7600 + i, 0.3, 6), i % 3 ? '#e9cf9b' : '#c9a476', 2.4));
      label(ctx, t, 1.4, 'Lübecker Marzipan', 800, 660, 760);
    } },
  ],
};

STORIES.fangfrisch = {
  title: 'Fangfrisch', zh: 'Fangfrisch 魚堡與自釀啤酒', kind: '店家介紹',
  summary: '位於 An der Untertrave 51、特拉沃河畔的 Fangfrisch，以現炸魚排夾麵包（Fischbrötchen）和自家釀造的啤酒為特色，旁邊還有一間賣外帶魚堡的小屋（Brötchenbude）。店名 fangfrisch 的意思是「剛捕獲的新鮮」。店內擺設是依你的描述與北德港口小吃店的風格繪製，並非現場照片重現。',
  scenes: [
    { d: 8, zh: '呂貝克的特拉沃河畔，自古就是漁船和商船停靠的地方，岸邊的小吃攤賣的是剛捕上來的魚。', de: 'An der Untertrave', draw(ctx, t, T) {
      sky(ctx, '#bfd2de', '#e4ddc9'); sun(ctx, 1300, 190, 56, '#f2c26a');
      pop(ctx, t, 0.1, () => paper(ctx, cut(wave(640, 12, 0.006, T * 0.5), 7701), C.sea, 1.2));
      drawKogge(ctx, 400 + easeOut(t / 8) * 360, 620, 110, Math.sin(T * 1.5) * 0.04, 1.6);
      pop(ctx, t, 0.5, () => { for (const h of skyline(560, 51, 100)) if (h.x > 900) paper(ctx, cut(h.pts, h.x | 0), h.col, 1.4); });
      pop(ctx, t, 0.3, () => paper(ctx, cut(wave(700, 16, 0.005, T * 0.8 + 1), 7702), C.sea2, 2.6));
    } },
    { d: 9, zh: 'Fangfrisch 的名字就是「剛捕獲的新鮮」。招牌是現炸的魚排夾進麵包裡，再加上洋蔥和醬汁。', de: 'Backfisch im Brötchen', draw(ctx, t, T) {
      sky(ctx, '#e8dcc2', C.paper);
      pop(ctx, t, 0.2, () => { paper(ctx, cut(ellipse(800, 560, 330, 90, 40), 7801, 1), '#d9a45a', 2); paper(ctx, cut(ellipse(800, 520, 300, 60, 40), 7802, 1), '#f0d9a8', 2.2); });
      pop(ctx, t, 0.8, () => paper(ctx, cut([...fish(800, 505, 170)], 7803), '#c98b4a', 2.5));
      pop(ctx, t, 1.4, () => { for (let i = 0; i < 6; i++) paper(ctx, cut(ellipse(680 + i * 44, 480 + (i % 2) * 12, 18, 8, 10), 7810 + i, 0.2), '#dcd0e8', 2.8); });
      label(ctx, t, 2.2, 'Fischbrötchen', 800, 760, 520);
    } },
    { d: 9, zh: '店裡也自己釀啤酒：大麥麥芽、啤酒花、水和酵母，在不鏽鋼的發酵桶裡慢慢變成啤酒。', de: 'Hausgebrautes Bier', draw(ctx, t, T) {
      sky(ctx, '#2a3340', '#3a4656');
      pop(ctx, t, 0.2, () => { for (const x of [420, 800, 1180]) { paper(ctx, cut(rect(x - 90, 260, 180, 400), 7901 + x, 0.6), '#c9ced4', 2); paper(ctx, cut([[x - 90, 260], [x, 190], [x + 90, 260]], 7902 + x), '#b5bbc2', 2.2); paper(ctx, cut(rect(x - 14, 660, 28, 80), 7903 + x), '#8a929a', 2.3); } });
      pop(ctx, t, 1.0, () => { for (let i = 0; i < 4; i++) { paper(ctx, cut(rect(560 + i * 140, 780, 80, 100), 7910 + i, 0.4), ['#e8b43a', '#d98a2a', '#9a5a22', '#f0cf6a'][i], 2.6); paper(ctx, cut(rect(560 + i * 140, 770, 80, 24), 7920 + i, 0.3), '#fbf3e4', 2.8); } });
    } },
    { d: 8, zh: '坐在木桌旁，一手拿著魚堡、一手舉起啤酒，看著河面上的船慢慢經過。', de: 'Prost!', draw(ctx, t, T) {
      sky(ctx, '#dfe6ea', '#efe8d8');
      pop(ctx, t, 0.1, () => paper(ctx, cut(wave(600, 12, 0.006, T * 0.6), 8001), C.sea, 1.2));
      pop(ctx, t, 0.4, () => { paper(ctx, cut(rect(300, 640, 1000, 28), 8002), C.wood, 2.2); for (const x of [380, 1220]) paper(ctx, cut(rect(x, 668, 24, 150), 8003 + x, 0.3), '#6b4a32', 2.2); });
      pop(ctx, t, 0.9, () => { for (const x of [560, 800, 1040]) { paper(ctx, cut(person(x, 640, 200), 8010 + x, 0.4, 6), [C.navy2, C.red, C.copper2][x % 3], 2.4); paper(ctx, cut(rect(x + 36, 500 + Math.sin(T * 2 + x) * 4, 26, 40), 8020 + x, 0.2), '#e8b43a', 2.8); } });
    } },
  ],
};

STORIES.citti = {
  title: 'CITTI-PARK', zh: 'CITTI-PARK 購物中心', kind: '店家介紹',
  summary: '位於呂貝克西側 Herrenholz 的大型購物中心，把超市、各種專賣店、咖啡與餐飲集中在一棟建築裡，是當地居民採買日用品的地方之一。這個室內空間是依一般德國購物中心的樣子繪製，不是現場照片重現；它離老城約 4 公里，超出目前下載的地圖範圍，所以只能從「店家」選單進入。',
  scenes: [
    { d: 8, zh: '老城裡有幾百年歷史的市集和商行；到了現代，大家也習慣開車到城外的大型購物中心一次買齊。', de: 'Vom Markt zum Einkaufszentrum', draw(ctx, t, T) {
      sky(ctx, '#d6dee5', C.paper);
      pop(ctx, t, 0.1, () => { for (const h of skyline(640, 61, 100)) if (h.x < 800) paper(ctx, cut(h.pts, h.x | 0), h.col, 1.2); });
      pop(ctx, t, 0.8, () => { paper(ctx, cut(rect(900, 380, 600, 280), 8101), '#e8e4dc', 2); paper(ctx, cut(rect(900, 380, 600, 60), 8102), '#2f6ab0', 2.2); T_(ctx, 'CITTI-PARK', 1200, 410, 40, '#fff', 'Arial, sans-serif', 700); for (let i = 0; i < 6; i++) paper(ctx, cut(rect(930 + i * 95, 480, 70, 100), 8110 + i, 0.3), '#9fc3d9', 2.4); });
      pop(ctx, t, 0.2, () => paper(ctx, cut(rect(0, 660, 1600, 260), 8120, 2), C.slate, 2.6));
    } },
    { d: 9, zh: '走進大廳，兩旁是一間間店面，中間有長椅和植栽，天花板的天窗灑下日光。', de: 'Die Mall', draw(ctx, t, T) {
      sky(ctx, '#e8eef2', '#fbf6ea');
      pop(ctx, t, 0.1, () => { paper(ctx, cut(rect(500, 40, 600, 60), 8201), '#cfe6ea', 1.6); });
      pop(ctx, t, 0.4, () => { for (const [x, c] of [[120, '#c8402e'], [420, '#2f6ab0'], [1020, '#5f9b86'], [1320, '#e8b43a']]) { paper(ctx, cut(rect(x, 260, 260, 400), 8210 + x), '#f4f0e6', 2); paper(ctx, cut(rect(x, 260, 260, 60), 8211 + x), c, 2.2); paper(ctx, cut(rect(x + 20, 350, 220, 220), 8212 + x, 0.4), '#bcd7e0', 2.4); } });
      crowd(ctx, t, T, 840, 8, 8230, [C.navy2, C.red, C.copper2, C.wood, C.ink]);
    } },
    { d: 9, zh: '超市區有蔬果、麵包、乳製品和飲料，排得整整齊齊的貨架，推著購物車慢慢逛。', de: 'Supermarkt', draw(ctx, t, T) {
      sky(ctx, '#f0e4cf', '#fbf3e4');
      pop(ctx, t, 0.1, () => { for (let r = 0; r < 3; r++) { paper(ctx, cut(rect(200, 200 + r * 160, 1200, 14), 8301 + r), '#8a929a', 2); for (let i = 0; i < 16; i++) paper(ctx, cut(rect(220 + i * 74, 150 + r * 160, 54, 50), 8310 + r * 20 + i, 0.3), ['#c8402e', '#e8b43a', '#5f9b86', '#2f6ab0', '#f0d9a8'][(i + r) % 5], 2.4); } });
      pop(ctx, t, 1.0, () => { paper(ctx, cut(rect(600, 700, 200, 70), 8330, 0.4), '#9aa4ad', 2.4); for (const x of [620, 780]) paper(ctx, cut(ellipse(x, 800, 24, 24, 12), 8331 + x), '#222', 2.6); });
      crowd(ctx, t, T, 880, 4, 8340, [C.navy2, C.red, C.copper2]);
    } },
    { d: 8, zh: '逛累了，在美食區坐下來喝杯咖啡；這裡的資料還不完整，歡迎你自己走進去看看。', de: 'Kaffeepause', draw(ctx, t, T) {
      sky(ctx, '#e8dcc2', C.paper);
      pop(ctx, t, 0.2, () => { for (const x of [420, 800, 1180]) { paper(ctx, cut(ellipse(x, 640, 120, 24, 24), 8401 + x), '#a8704a', 2.4); paper(ctx, cut(rect(x - 8, 640, 16, 130), 8402 + x, 0.3), '#6b4a32', 2.2); paper(ctx, cut(rect(x - 20, 585, 40, 34), 8403 + x, 0.3), '#fbf3e4', 2.8); } });
      label(ctx, t, 1.0, 'Willkommen', 800, 300, 560);
    } },
  ],
};

Object.assign(STORY_AT, { niederegger: ['niederegger', 'niederegger_haus'], fangfrisch: ['fangfrisch'], citti: ['citti'] });
STORIES.niederegger_haus.music = 'canon'; STORIES.fangfrisch.music = 'toccata_minuet'; STORIES.citti.music = 'lullaby';
STORIES.niederegger_haus.sfx = [['crowd'], ['quill', 'clock'], ['coins'], ['crowd'], ['crowd', 'coins'], ['crowd']];
STORIES.fangfrisch.sfx = [['waves', 'gull'], ['fire', 'crowd'], ['hammer'], ['waves', 'crowd', 'cheer']];
STORIES.citti.sfx = [['crowd', 'steps'], ['crowd', 'steps'], ['steps', 'coins'], ['crowd']];
void windows; void gableHouse; void steppedHouse; void flame; void barrel; void ZH;
