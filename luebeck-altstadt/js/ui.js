import { openStory, storyList, storiesAt, STORIES } from './stories.js';
import './stories2.js';
// Landmark intro cards: enter/exit hysteresis, one card at a time, manual close sticks for the current visit,
// global "auto intro" switch, reopen via the ℹ button or the I key, never pops up while riding/driving.
const TEXT = {
  musikhochschule: '呂貝克音樂學院，位於聖伯多祿教堂旁的大彼得溝街，校舍由一整排歷史老屋改建；附設布拉姆斯研究所，收藏大量布拉姆斯的手稿與書信。',
  brahms: '作曲家約翰尼斯·布拉姆斯的雕像，位在特拉沃河畔的 An der Obertrave。布拉姆斯 1833 年生於漢堡。',
  holstentor: '舊城西側的城門，1464–1478 年建成，兩座圓塔頂著尖錐屋頂。朝城外（西側）那一面刻著「CONCORDIA DOMI FORIS PAX」（城內和睦，城外和平），朝城內的一面則是「S.P.Q.L.」。現為城市歷史博物館。',
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
  hauptbahnhof: '呂貝克中央車站，1908 年啟用的紅磚車站，正面有三扇巨大拱窗、四座銅綠圓頂塔樓與中央鐘塔。可以從三個入口走進大廳，裡面有時刻表、售票機、麵包店、書報攤和通往月台的通道。車站位於舊城島西側、河的對岸。',
  buddenbrookhaus: '布登勃洛克之家（Mengstraße 4），曼氏家族祖父母的房子，湯瑪斯·曼以它為原型寫出《布登勃洛克家族》。現為海因里希與湯瑪斯·曼中心，正在整修擴建。',
  malerwinkel: '畫家角落：特拉沃河上游河岸的觀景點，可以看到對岸老屋的背面、花園與小碼頭，以及水面上的倒影。',
  kanal: '運河特拉沃（Kanal-Trave），易北河—呂貝克運河流經舊城東側的一段。運河 1900 年通航，前身是 1398 年完成的施特克尼茨運河。',
  st_jakobi: '聖雅各教堂，水手與漁民的教堂，位於 Koberg 廣場旁；「七塔之城」的七座尖塔之一。',
  st_aegidien: '聖吉爾斯教堂（St. Aegidien），五座主要教堂中最小的一座，位於舊城東側的手工業者街區；「七塔之城」的七座尖塔之一。',
  puppenbruecke: '人偶橋（Puppenbrücke），霍爾斯滕門外的橋，橋上有一組石雕像，因此得名。',
};
export class InfoCards {
  constructor(landmarks, { getMode, getSpeed }) {
    this.L = landmarks.filter((l) => TEXT[l.id]).map((l) => ({ ...l, rin: l.id === 'teufel' ? 9 : l.footprint ? Math.max(18, Math.min(60, Math.max(l.footprint.w, l.footprint.d) * 0.8)) : 18 }));
    this.getMode = getMode; this.getSpeed = getSpeed;
    this.el = document.querySelector('#card'); this.btn = document.querySelector('#bInfo'); this.auto = true;
    try { const v = localStorage.getItem('lub-auto'); this.auto = v == null ? !document.body.classList.contains('touch') : v !== '0'; } catch { /* storage blocked */ }   // phones: cards only on request (ℹ) so the view stays clear
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
    // one button per film attached to this place
    const sb = this.el.querySelector('.storybtn'); sb.hidden = true;
    let box = this.el.querySelector('.storybtns'); if (!box) { box = document.createElement('div'); box.className = 'storybtns'; sb.after(box); }
    box.textContent = '';
    for (const id of storiesAt(l.id)) { const b = document.createElement('button'); b.type = 'button'; b.className = 'storybtn'; b.textContent = '▶ ' + STORIES[id].zh; b.onclick = (e) => { e.stopPropagation(); openStory(id); }; box.appendChild(b); }
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

// phone menu: one button folds the toolbar; "clean view" hides every overlay until the screen is tapped twice
{
  const menu = document.querySelector('#bMenu'), clean = document.querySelector('#bClean');
  menu?.addEventListener('click', (e) => { e.stopPropagation(); document.body.classList.toggle('menu-open'); menu.textContent = document.body.classList.contains('menu-open') ? '✕' : '☰'; });
  document.querySelector('#tools')?.addEventListener('click', (e) => { if (e.target.closest('.tb') && e.target.id !== 'bClean') { document.body.classList.remove('menu-open'); if (menu) menu.textContent = '☰'; } });
  clean?.addEventListener('click', (e) => { e.stopPropagation(); document.body.classList.remove('menu-open'); document.body.classList.add('clean'); if (menu) menu.textContent = '👁'; });
  menu?.addEventListener('click', (e) => { if (document.body.classList.contains('clean')) { document.body.classList.remove('clean', 'menu-open'); menu.textContent = '☰'; e.stopImmediatePropagation(); } }, true);
}
