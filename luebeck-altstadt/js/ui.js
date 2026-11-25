import { hasStory, openStory, storyList } from './stories.js';
// Landmark intro cards: enter/exit hysteresis, one card at a time, manual close sticks for the current visit,
// global "auto intro" switch, reopen via the ℹ button or the I key, never pops up while riding/driving.
const TEXT = {
  holstentor: '舊城西側的城門，1464–1478 年建成，兩座圓塔頂著尖錐屋頂。朝城內那一面刻著「CONCORDIA DOMI FORIS PAX」（城內和睦，城外和平）。現為城市歷史博物館。',
  salzspeicher: '特拉沃河畔的六棟磚造倉庫，建於 16 至 18 世紀，存放從呂內堡運來、準備轉運到斯堪地那維亞的鹽。',
  st_petri: '聖伯多祿教堂，現為不舉行常規禮拜的文化與大學教堂；塔上有觀景台，可以俯瞰舊城。',
  st_marien: '聖瑪利亞教堂，1277–1351 年興建，是北德磚造哥德式教堂的典範，由市民出資，蓋在市政廳旁。',
  teufel: '聖瑪利亞教堂南側的小惡魔銅像，坐在一塊花崗岩上。傳說魔鬼以為工人在蓋酒館而幫忙搬石頭，發現是教堂後憤而丟下石塊。',
  rathaus: '呂貝克市政廳，德國最古老的市政廳之一，黑色釉面磚牆與後加的文藝復興式拱廊並存。',
  niederegger: 'Niederegger 本店與咖啡館，位於市政廳對面的 Breite Straße 89，以杏仁膏（Marzipan）聞名。',
  hugendubel: 'Hugendubel 書店，位於 Königstraße。',
  junge_breite7: 'Junge 麵包店的 Breite Straße 7 分店，靠近 Koberg 廣場北端。',
  schiffergesellschaft: '船員公會之家（Haus der Schiffergesellschaft），Breite Straße 2，現為餐廳，內部保留船員公會的木製長桌與船模。',
  fuechtingshof: 'Füchtingshof 是 17 世紀為商人與船員遺孀建造的救濟院庭院，入口在 Glockengießerstraße。（位置為推估，待核對）',
  museumshafen: '特拉沃河下游的博物館港，停泊著歷史船舶。',
  drehbruecke: '旋轉橋（Drehbrücke），連接舊城北側與 Willy-Brandt-Allee 的可旋轉橋梁。',
  burgtor: '城堡門，舊城北端的城門，塔樓建於 1444 年。',
  dom: '呂貝克主教座堂，1173 年由獅子亨利奠基，位於舊城島南端，臨 Mühlenteich 水池。',
  hauptbahnhof: '呂貝克中央車站，位於舊城島西側、河的對岸。',
  puppenbruecke: '人偶橋（Puppenbrücke），霍爾斯滕門外的橋，橋上有一組石雕像，因此得名。',
};
export class InfoCards {
  constructor(landmarks, { getMode, getSpeed }) {
    this.L = landmarks.filter((l) => TEXT[l.id]).map((l) => ({ ...l, rin: l.id === 'teufel' ? 9 : l.footprint ? Math.max(18, Math.min(60, Math.max(l.footprint.w, l.footprint.d) * 0.8)) : 18 }));
    this.getMode = getMode; this.getSpeed = getSpeed;
    this.el = document.querySelector('#card'); this.btn = document.querySelector('#bInfo'); this.auto = true;
    try { this.auto = localStorage.getItem('lub-auto') !== '0'; } catch { /* storage blocked */ }
    this.current = null; this.open = false; this.dismissed = new Set(); this.nearest = null;
    this.el.querySelector('.x').addEventListener('click', () => this.close(true));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.open) { this.close(true); e.stopPropagation(); } if ((e.key === 'i' || e.key === 'I') && !e.target.closest?.('input,select')) this.toggle(); });
    this.btn.addEventListener('click', () => this.toggle());
    const list = document.querySelector('#slist'), items = list.querySelector('.items');
    for (const s of storyList()) { const b2 = document.createElement('button'); b2.className = 'it'; b2.type = 'button'; b2.innerHTML = `<div class="a"></div><div class="b"></div><div class="c"></div>`; b2.querySelector('.a').textContent = s.title; b2.querySelector('.b').textContent = '▶ ' + s.zh; b2.querySelector('.c').textContent = s.kind; b2.onclick = () => { closeList(); openStory(s.id); }; items.appendChild(b2); }
    const closeList = () => { list.classList.remove('on'); setTimeout(() => (list.hidden = true), 250); };
    list.querySelector('.x').onclick = closeList;
    for (const ev of ['pointerdown', 'touchstart', 'wheel']) list.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    document.querySelector('#bStories').addEventListener('click', () => { list.hidden = false; requestAnimationFrame(() => list.classList.add('on')); });
    const auto = document.querySelector('#autoIntro'); auto.checked = this.auto;
    auto.addEventListener('change', () => { this.auto = auto.checked; try { localStorage.setItem('lub-auto', this.auto ? '1' : '0'); } catch { /* */ } });
    // clicks on the card must not reach the canvas (camera drag / actions)
    for (const ev of ['pointerdown', 'wheel', 'click']) this.el.addEventListener(ev, (e) => e.stopPropagation());
  }
  update(x, z) {
    // nearest landmark inside its ENTER radius; we stay "inside" until we leave its EXIT radius (1.5×)
    let near = null, nd = 1e9;
    for (const l of this.L) { const d = Math.hypot(x - l.local_xz_m[0], z - l.local_xz_m[1]); const r = this.current === l ? l.rin * 1.5 : l.rin; if (d < r && d < nd) { nd = d; near = l; } }
    if (near !== this.current) {
      if (this.current && !near) this.dismissed.delete(this.current.id);   // leaving fully re-arms the auto intro for the next visit
      if (this.current && near && near !== this.current) this.dismissed.delete(this.current.id);
      this.current = near;
      if (this.open && (!near || this.shown !== near)) this.close(false);
    }
    this.btn.hidden = !near; if (near) this.btn.textContent = `ℹ ${near.name_zh}`;
    const moving = this.getMode() !== 'walk' && Math.abs(this.getSpeed()) > 1;
    if (near && !this.open && this.auto && !moving && !this.dismissed.has(near.id)) this.show(near);
  }
  show(l) {
    this.shown = l; this.open = true;
    this.el.querySelector('.de').textContent = l.name_de; this.el.querySelector('.zh').textContent = l.name_zh;
    this.el.querySelector('.addr').textContent = l.address;
    this.el.querySelector('.tx').textContent = TEXT[l.id];
    const sb = this.el.querySelector('.storybtn'); sb.hidden = !hasStory(l.id); sb.onclick = (e) => { e.stopPropagation(); openStory(l.id); };
    this.el.querySelector('.src').innerHTML = `位置：<a href="https://www.openstreetmap.org/${l.osm}" target="_blank" rel="noopener">OpenStreetMap ${l.osm}</a>（ODbL，取得 ${l.fetched_at.slice(0, 10)}）` + (l.unverified.length ? `<br>待核對：${l.unverified.join('；')}` : '');
    this.el.hidden = false; requestAnimationFrame(() => this.el.classList.add('on'));
  }
  close(manual) {
    if (manual && this.shown) this.dismissed.add(this.shown.id);
    this.open = false; this.el.classList.remove('on'); setTimeout(() => { if (!this.open) this.el.hidden = true; }, 250);
    document.querySelector('#world')?.focus({ preventScroll: true });
  }
  toggle() { if (this.open) this.close(true); else if (this.current) { this.dismissed.delete(this.current.id); this.show(this.current); } }
}
