import * as THREE from 'three';
import { clamp, lerp, ease, easeSine, smooth } from './util.js';
import { FM } from './places.js';

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const zb = FM.zb;

// --------------------------------------------------------------------------------
//  Chapters – ordered from the centre (Lee Gardens Plaza Hotel) outward
// --------------------------------------------------------------------------------
export function makeChapters(ctx) {
  const A = (u, v, h) => ctx.airport.A(u, v, h);
  const jetPos = new THREE.Vector3();
  const peds = (ctx.pediments || []).filter(p => { const r = Math.hypot(p.x, p.z); return r > 250 && r < 650; });
  const pd = peds[Math.floor(peds.length * 0.3)] || { x: -200, z: 300, fnx: 1, fnz: 0, w: 6 };
  const ow = (a, b, y) => [pd.x + pd.fnx * a - pd.fnz * b, y, pd.z + pd.fnz * a + pd.fnx * b];
  const el = ctx.elephant || { x: 4950, y: 160, z: -4370 }, cb = ctx.cable || { lx: 4310, lz: -3918, ux: 4980, uz: -4380 };
  return [
    { id: 'intro', zh: '合艾', en: 'HAT YAI', th: 'หาดใหญ่', tag: 'CINEMATIC CITY GUIDE', dist: null, anchor: [0, 0], dur: 11, tod: 0.62, nav: false,
      desc: '泰國南部最大的商業城市。這份導覽以李花園廣場酒店為原點，依真實座標向外展開：街區、市場、車站，一路到水上市場、山丘公園與機場。',
      poses: [{ p: [-4300, 2300, 5200], l: [0, 40, 0], fov: 38 }, { p: [-1100, 520, 1400], l: [0, 70, 0], fov: 42 }] },
    { id: 'lee', zh: '李花園廣場酒店', en: 'Lee Gardens Plaza Hotel', th: 'โรงแรม ลี การ์เด้นส์ พลาซ่า', tag: '起點', dist: 0, anchor: [0, 0], dur: 20, tod: 0.62,
      desc: '合艾市中心的高樓地標：奶白色壁柱搭配綠色橫帶，入夜後整面外牆的窗光亮起，甚至在樓層間排出愛心。導覽的原點，之後每一站都從這裡向外延伸。',
      poses: [{ p: [-185, 62, 205], l: [-14, 68, 2], fov: 40 }, { p: [-150, 96, -170], l: [-14, 76, 2], fov: 40 }, { p: [95, 140, -120], l: [-14, 74, 2], fov: 42 }] },
    { id: 'nightmarket', zh: 'Lee Gardens 夜市', en: 'Lee Gardens Night Market', th: 'ตลาดโต้รุ่งหน้าโรงแรม', tag: '夜間限定', dist: 70, anchor: [0, 78], dur: 20, tod: 0.98,
      desc: '天黑之後，酒店南側的廣場與街邊瞬間冒出上百個攤位：彩色帆布棚、燈串、烤物與小吃，把整個街區變成熱鬧的夜市。',
      poses: [{ p: [120, 72, 262], l: [-2, 3, 74], fov: 50 }, { p: [42, 50, 172], l: [-3, 3, 80], fov: 56 }, { p: [-38, 5.5, 34], l: [8, 3, 90], fov: 66 }] },
    { id: 'porkleg', zh: '秋哥國際豬腳飯', en: 'Inter Pork Leg with Rice', th: 'ข้าวขาหมู', tag: '美食 · 位置為示意', dist: 80, anchor: [30, 56], dur: 13, tod: 0.98,
      desc: '紅底金字的招牌、冒著蒸氣的滷鍋與綠色矮凳 —— 夜市裡排隊的豬腳飯。（OSM 查無此店，這裡的位置與外觀為示意。）',
      poses: [{ p: [-20, 3.4, 104], l: [26, 4.5, 56], fov: 50 }, { p: [4, 2.4, 82], l: [27, 4.2, 56], fov: 54 }] },
    { id: 'street', zh: '石板街與路邊小吃', en: 'Sanehanusorn Rd · Street Food', th: 'ถนนเสน่หานุสรณ์', tag: '街景', dist: 160, anchor: [-25, 160], dur: 20, tod: 0.72,
      desc: '酒店門前的石板街。紅白遮陽棚下的小吃攤、綠色塑膠矮凳、騎樓與電線桿，轉角是麥當勞的金色拱門 —— 合艾夜晚最熟悉的日常。',
      poses: [{ p: [-5, 3.2, 318], l: [-62, 42, -60], fov: 54, tod: 0.05 }, { p: [-27, 2.5, 175], l: [-60, 42, -40], fov: 56, tod: 0.36 }, { p: [-25, 1.8, 64], l: [-30, 46, 14], fov: 66, tod: 0.95 }] },
    { id: 'citystreet', zh: '城市街頭', en: 'Hat Yai Street Life', th: 'ถนนธรรมนูญวิถี', tag: '街頭', dist: 260, anchor: [-120, 175], dur: 16, tod: 0.8,
      desc: '沿著 Thamnoon Withi 路的街頭：機車與小客車穿梭、路燈一盞盞亮起、騎樓下的招牌與電線在暮色裡交織 —— 這就是合艾的日常。',
      poses: [{ p: [-335, 3.6, 198], l: [-120, 7, 172], fov: 58 }, { p: [-150, 3.1, 180], l: [90, 8, 158], fov: 62 }] },
    { id: 'oldtown', zh: '彩色騎樓老街', en: 'Sino-Portuguese Shophouses', th: 'ตึกแถวชิโน-โปรตุกีส', tag: '文化 · 老街', dist: Math.round(Math.hypot(pd.x, pd.z) / 10) * 10, anchor: [pd.x, pd.z], dur: 16, tod: 0.25,
      desc: '合艾不是大城市，而是一座悠閒的商貿小鎮。粉黃、天藍、橘紅的中葡式騎樓一字排開：拱形窗、木百葉、山花，一樓開店、二樓住家，騎樓下是遮陽的走廊。',
      poses: [{ p: ow(12, -24, 2.2), l: ow(2, 6, 4.5), fov: 58 }, { p: ow(10, -4, 2.0), l: ow(1, 22, 4.0), fov: 60, tod: 0.35 }] },
    { id: 'kimyong', zh: 'Kim Yong 市場', en: 'Kim Yong Market', th: 'ตลาดกิมหยง', tag: '市場', dist: 320, anchor: [-215, -240], dur: 15, tod: 0.9,
      desc: '合艾最具代表性的市集之一：乾貨、伴手禮、零食與熟食，鐵皮棚頂下掛滿燈串。許多馬來西亞與新加坡旅客專程來此採買。',
      poses: [{ p: [-110, 40, -105], l: [-205, 8, -245], fov: 55 }, { p: [-190, 10, -208], l: [-214, 4, -262], fov: 64 }] },
    { id: 'station', zh: '合艾火車總站', en: 'Hat Yai Junction', th: 'สถานีรถไฟชุมทางหาดใหญ่', tag: '鐵道樞紐', dist: 490, anchor: [-447, 208], dur: 16, tod: 0.86,
      desc: '合艾因鐵路而生：二十世紀初南線鐵路通車後，華人移民在車站周邊開店，小站慢慢長成南泰的商貿重鎮。今天這裡仍是轉運大站，南下支線通往馬來西亞邊境的 Padang Besar 與 Sungai Kolok。',
      onEnter: () => { if (ctx.train) ctx.train.t = -230; },
      poses: [{ p: [-330, 26, 345], l: [-440, 7, 232], fov: 50 }, { p: [-385, 9.5, 145], l: [-445, 5, 225], fov: 60 }] },
    { id: 'clock', zh: '鐘樓與 Wat Thawon Wararam', en: 'Clock Tower & Wat Thawon Wararam', th: 'หอนาฬิกา · วัดถาวรวราราม', tag: '市區北側', dist: 670, anchor: [-166, -650], dur: 15, tod: 0.9,
      desc: '沿 Phetkasem 路向北：鐘樓的四面鐘盤在夜裡發亮；再往東是寺院的金色佛塔與橘紅屋頂，在街區燈海中格外安靜。',
      poses: [{ p: [-70, 40, -515], l: [-166, 14, -650], fov: 48 }, { p: [15, 26, -385], l: [128, 11, -448], fov: 54 }] },
    { id: 'greenway', zh: 'Greenway Night Market', en: 'Greenway Night Market', th: 'ตลาดกรีนเวย์ ไนท์มาร์เก็ต', tag: '夜市 · 約 2 km', dist: 1950, anchor: [1680, 990], dur: 16, tod: 0.98,
      desc: '市中心東南方的大型夜市。整排彩色棚位、頭頂的燈串與入口的綠色霓虹招牌，是當地人與遊客的夜間據點。',
      poses: [{ p: [1480, 75, 800], l: [1680, 3, 990], fov: 52 }, { p: [1600, 12, 925], l: [1690, 3, 998], fov: 62 }] },
    { id: 'muaythai', zh: '泰拳館', en: 'Muay Thai Camp · playable', th: 'ค่ายมวยไทย', tag: '格鬥遊戲 · 位置示意', dist: 1560, anchor: [82, -1562], dur: 14, tod: 0.85,
      desc: '泰拳（มวยไทย）是泰國的國技，用拳、肘、膝、腿「八肢」作戰，賽前會先跳拜師舞 Wai Kru。按下方「🥊 上擂台」直接開打，或用角色漫遊走到館門口進場。（館的位置與外觀為示意）',
      poses: (() => { const g = ctx.gym; if (!g) return [{ p: [130, 40, -1520], l: [82, 3, -1562], fov: 50 }, { p: [100, 8, -1540], l: [82, 2, -1562], fov: 55 }];
        const fx = Math.sin(g.yaw), fz = Math.cos(g.yaw), rx = fz, rz = -fx;
        return [{ p: [g.x + fx * 34 + rx * 14, 26, g.z + fz * 34 + rz * 14], l: [g.x, 2, g.z], fov: 50 }, { p: [g.x + fx * 16 + rx * 3, 4.2, g.z + fz * 16 + rz * 3], l: [g.x - rx * 3, 2.2, g.z - rz * 3], fov: 58 }]; })() },
    { id: 'central', zh: 'Central Hat Yai 新商圈', en: 'Central Hat Yai', th: 'เซ็นทรัล หาดใหญ่', tag: '約 2 km', dist: 2000, anchor: [1245, 1547], dur: 14, tod: 0.95,
      desc: '市中心東南方的大型購物中心與新興商圈。從這裡回望，可以看見老城區的天際線與整片向外鋪展的街廓與燈光。',
      poses: [{ p: [780, 170, 1040], l: [1245, 24, 1547], fov: 46 }, { p: [1560, 80, 1950], l: [1260, 18, 1560], fov: 52 }] },
    { id: 'floating', zh: 'Khlong Hae 水上市場', en: 'Khlong Hae Floating Market', th: 'ตลาดน้ำคลองแห', tag: '約 4.5 km · 北', dist: 4470, anchor: [240, -4460], dur: 20, tod: 0.4,
      desc: '位於市區北方的運河市集，OSM 上標注為「南部第一個水上市場」。傍晚時分，小船靠岸賣食物，木棧道掛起旗串與白色圓燈。',
      poses: [{ p: [350, 12, zb + 13], l: [170, 2.5, zb - 8], fov: 58 }, { p: [300, 8, zb + 9], l: [150, 2.5, zb - 8], fov: 62 }, { p: [225, 4.6, zb + 6], l: [110, 3.2, zb - 8], fov: 64 }] },
    { id: 'park', zh: '帕普塔蒙空瑪哈拉大佛', en: 'Phra Phutthamongkhon Maharat · Municipal Park', th: 'พระพุทธมงคลมหาราช', tag: '約 5.8 km · 東北', dist: 5800, anchor: [4328, -3868], dur: 16, tod: 0.62,
      desc: '合艾市立公園山頂的大佛（พระพุทธมงคลมหาราช），旁邊就是纜車站。暮色中大佛被金色光線照亮，盤山步道的路燈在山坡上畫出一條光帶。造型為示意重建。',
      poses: [{ p: [3750, 190, -3420], l: [4328, 88, -3868], fov: 46 }, { p: [4175, 110, -3770], l: [4328, 92, -3868], fov: 52 }, { p: [4262, 84, -3812], l: [4328, 104, -3868], fov: 58 }] },
    { id: 'elephant', zh: '大象神廟', en: 'Phra Phikanet Shrine (cable car)', th: 'พระพิฆเนศ', tag: '纜車 · 山頂 · 位置示意', dist: Math.round(Math.hypot(el.x, el.z) / 100) * 100, anchor: [el.x, el.z], dur: 18, tod: 0.5,
      desc: '從大佛旁的纜車站搭紅色纜車，越過樹林上到更高的山頂，一尊巨大的象頭神（帕必卡內）坐在蓮花座上。祂是排除障礙、守護事業與藝術的神。（山頂位置為示意）',
      poses: [{ p: [cb.lx + (cb.ux - cb.lx) * 0.35, el.y + 30, cb.lz + (cb.uz - cb.lz) * 0.35 + 30], l: [el.x, el.y + 14, el.z], fov: 48 }, { p: [el.x - 32, el.y + 9, el.z + 34], l: [el.x - 30, el.y + 13, el.z + 10], fov: 52 }] },
    { id: 'airport', zh: '合艾國際機場', en: 'Hat Yai International Airport · HDY', th: 'ท่าอากาศยานนานาชาติหาดใหญ่', tag: '約 11.6 km · 西南', dist: 11600, anchor: [-8650, 7700], dur: 30, tod: 1.0,
      desc: '南泰國的重要門戶，跑道方向 08/26。夜裡跑道邊燈與進場燈亮起，客機沿跑道加速離地，朝著遠處合艾的燈海爬升。',
      onEnter: () => { if (ctx.jet) ctx.jet.T = 0; },
      fn: (u) => {
        const J = ctx.jet; if (J) jetPos.copy(J.obj.position);
        const e = easeSine(u); const c = A(-1620 + 1250 * e, -78 - 10 * e, 11 + 34 * e);
        return { p: [c.x, c.y, c.z], l: [jetPos.x + 30, jetPos.y + 4, jetPos.z], fov: 46 };
      } },
    { id: 'outro', zh: '回望合艾', en: 'Looking back', th: 'มองย้อนกลับ', tag: '終章', dist: 11600, anchor: [-8650, 7700], dur: 16, tod: 1.0, nav: false,
      desc: '從機場回望：整座合艾在地平線上亮成一片。導覽到此結束 —— 你可以按「自由探索」，自己飛回任何一個地標。',
      poses: [{ p: [-7600, 700, 7000], l: [-1500, 100, 1500], fov: 40 }, { p: [-5200, 1700, 4800], l: [0, 90, 0], fov: 44 }] },
  ];
}

// --------------------------------------------------------------------------------
export class Director {
  constructor(ctx, camera, atmo) {
    this.ctx = ctx; this.camera = camera; this.atmo = atmo;
    this.chapters = makeChapters(ctx);
    this.time = 0; this.playing = true; this.speed = 1; this.current = -1; this.listeners = [];
    this.tmpP = new THREE.Vector3(); this.tmpL = new THREE.Vector3();
    this._build();
  }
  _poseAt(ch, u) {
    if (ch.fn) { const r = ch.fn(u); return { p: V(r.p), l: V(r.l), fov: r.fov, tod: ch.tod }; }
    const n = ch.poses.length; const f = clamp(u, 0, 1) * (n - 1), i = Math.min(n - 2, Math.floor(f)), k = f - i;
    const a = ch.poses[i], b = ch.poses[i + 1];
    const s = k;
    // Catmull-style smoothing using neighbours
    const pick = (j) => ch.poses[clamp(j, 0, n - 1)];
    const spl = (prop) => { const p0 = V(pick(i - 1)[prop]), p1 = V(a[prop]), p2 = V(b[prop]), p3 = V(pick(i + 2)[prop]); const t = s, t2 = t * t, t3 = t2 * t; const o = new THREE.Vector3();
      o.x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      o.y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      o.z = 0.5 * ((2 * p1.z) + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);
      return o; };
    return { p: spl('p'), l: spl('l'), fov: lerp(a.fov, b.fov, s), tod: lerp(a.tod ?? ch.tod, b.tod ?? ch.tod, s * s * (3 - 2 * s)) };
  }
  _build() {
    this.segs = []; let t = 0;
    this.chapters.forEach((ch, i) => {
      ch.t0 = t; this.segs.push({ type: 'hold', i, t0: t, t1: t + ch.dur }); t += ch.dur; ch.t1 = t;
      const nx = this.chapters[i + 1];
      if (nx) {
        const a = this._poseAt(ch, 1), b = this._poseAt(nx, 0); const d = a.p.distanceTo(b.p);
        const dur = clamp(3.6 + 2.0 * Math.log2(1 + d / 160), 3.6, 11.5);
        this.segs.push({ type: 'travel', i, t0: t, t1: t + dur, a, b, d, lift: Math.min(2600, 40 + d * 0.16) }); t += dur;
      }
    });
    this.total = t;
  }
  chapterTime(i) { return this.chapters[i].t0; }
  evaluate(time) {
    time = clamp(time, 0, this.total - 1e-3);
    let s = this.segs[0]; for (const g of this.segs) { if (time >= g.t0 && time < g.t1) { s = g; break; } }
    const u = (time - s.t0) / (s.t1 - s.t0);
    let pos, look, fov, tod, ci = s.i;
    if (s.type === 'hold') {
      const ch = this.chapters[s.i]; const e = ch.fn ? u : 0.55 * u + 0.45 * smooth(0, 1, u);
      const r = this._poseAt(ch, e); pos = r.p; look = r.l; fov = r.fov; tod = r.tod;
    } else {
      const e = ease(u); const a = s.a, b = s.b;
      const mid = a.p.clone().lerp(b.p, 0.5); mid.y = Math.max(a.p.y, b.p.y) + s.lift;
      pos = new THREE.Vector3(); const q0 = a.p, q1 = mid, q2 = b.p;
      pos.set((1 - e) * (1 - e) * q0.x + 2 * (1 - e) * e * q1.x + e * e * q2.x, (1 - e) * (1 - e) * q0.y + 2 * (1 - e) * e * q1.y + e * e * q2.y, (1 - e) * (1 - e) * q0.z + 2 * (1 - e) * e * q1.z + e * e * q2.z);
      // look: blend, with an extra lead toward the destination mid-way
      const el = smooth(0, 1, clamp(u * 1.15, 0, 1)); look = a.l.clone().lerp(b.l, el); fov = lerp(a.fov, b.fov, e) + Math.sin(u * Math.PI) * 10;
      const c0 = this.chapters[s.i], c1 = this.chapters[s.i + 1]; tod = lerp(a.tod, b.tod, smooth(0.15, 0.85, u));
      ci = u < 0.5 ? s.i : s.i + 1;
    }
    return { pos, look, fov, tod, ci, seg: s, u };
  }
  seekChapter(i) { i = clamp(i, 0, this.chapters.length - 1); this.setTime(this.chapters[i].t0 + 0.01); this.playing = true; }
  setTime(t) { this.time = clamp(t, 0, this.total - 1e-3); this._enterCheck(true); }
  _enterCheck(force) {
    let idx = -1; for (let i = 0; i < this.chapters.length; i++) if (this.time >= this.chapters[i].t0 && this.time < this.chapters[i].t1) idx = i;
    if (idx !== -1 && idx !== this.holdIdx) { this.holdIdx = idx; const c = this.chapters[idx]; c.onEnter && c.onEnter(); }
    if (idx === -1) this.holdIdx = -1;
  }
  update(dt) {
    if (this.playing) { this.time += dt * this.speed; if (this.time >= this.total - 0.01) { this.time = this.total - 0.01; this.playing = false; this.emit('end'); } }
    this._enterCheck();
    return this.evaluate(this.time);
  }
  on(f) { this.listeners.push(f); } emit(e, d) { this.listeners.forEach(f => f(e, d)); }
}
