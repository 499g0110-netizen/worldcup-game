import * as THREE from 'three';
import { DATA } from './world.js';
import { clamp, lerp } from './util.js';

const $ = (s) => document.querySelector(s);
const fmtDist = (m) => m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 1)} km`;

const LABELS = [
  { zh: '李花園廣場酒店', en: 'Lee Gardens Plaza Hotel', x: -16, y: 132, z: 1, r: 900 },
  { zh: 'Centara Hat Yai', en: 'ศูนย์ประชุม · hotel', x: -80, y: 118, z: 8, r: 700 },
  { zh: 'Odeon 商場', en: 'ห้างโอเดียน', x: -65, y: 30, z: 140, r: 420 },
  { zh: 'Robinson', en: 'ห้างโรบินสัน', x: -298, y: 30, z: 282, r: 520 },
  { zh: 'Kim Yong 市場', en: 'ตลาดกิมหยง', x: -215, y: 14, z: -250, r: 520 },
  { zh: '合艾火車總站', en: 'Hat Yai Junction', x: -447, y: 22, z: 208, r: 650 },
  { zh: '鐘樓', en: 'Clock Tower', x: -166, y: 32, z: -650, r: 620 },
  { zh: 'Wat Thawon Wararam', en: 'วัดถาวรวราราม', x: 127, y: 30, z: -448, r: 520 },
  { zh: 'Diana 商場', en: 'Diana Complex', x: 725, y: 40, z: 880, r: 800 },
  { zh: 'Central Hat Yai', en: 'เซ็นทรัล หาดใหญ่', x: 1245, y: 44, z: 1547, r: 1600 },
  { zh: 'PSU 醫院', en: 'Songklanagarind Hospital', x: 2530, y: 90, z: -95, r: 1800 },
  { zh: 'Khlong Hae 水上市場', en: 'ตลาดน้ำคลองแห', x: 240, y: 14, z: -4460, r: 700 },
  { zh: '帕普塔蒙空瑪哈拉大佛', en: 'พระพุทธมงคลมหาราช', x: 4328, y: 140, z: -3868, r: 3000 },
  { zh: 'Lee Gardens 夜市', en: 'Night Market', x: 0, y: 12, z: 78, r: 420 },
  { zh: '秋哥國際豬腳飯', en: 'Inter Pork Leg with Rice', x: 30, y: 9, z: 56, r: 260 },
  { zh: 'Greenway Night Market', en: 'ตลาดกรีนเวย์', x: 1680, y: 12, z: 990, r: 1200 },
  { zh: '大象神廟', en: 'Phra Phikanet (位置示意)', x: 4950, y: 190, z: -4370, r: 3000 },
  { zh: '泰拳館 🥊', en: 'Muay Thai Camp', x: 82, y: 12, z: -1562, r: 900 },
  { zh: 'Kho Hong 山', en: 'เขาคอหงส์', x: 5400, y: 270, z: -1270, r: 4000 },
  { zh: '合艾國際機場 HDY', en: 'Hat Yai International Airport', x: -8650, y: 60, z: 7690, r: 3500 },
];

export function createUI(ctx, director, atmo, camera, hooks) {
  const chs = director.chapters;
  const card = $('#card'), idxEl = $('#c-idx'), zhEl = $('#c-zh'), enEl = $('#c-en'), descEl = $('#c-desc'), tagEl = $('#c-tag'), distEl = $('#dist-val'), distRing = $('#dist-ring');
  const tl = $('#tl-track'), tlFill = $('#tl-fill'), tlDots = $('#tl-dots');
  const state = { shown: -2, dist: 0, explore: false, ui: true, tod: 'auto', walk: false, near: null };

  // timeline dots (navigable chapters)
  const nav = chs.map((c, i) => ({ c, i })).filter(o => o.c.nav !== false);
  nav.forEach(({ c, i }, k) => {
    const d = document.createElement('button'); d.className = 'dot'; d.style.left = (c.t0 / director.total * 100) + '%'; d.title = c.zh; d.setAttribute('aria-label', c.zh);
    d.innerHTML = `<i></i><span>${c.zh}</span>`; d.onclick = (e) => { e.stopPropagation(); setExplore(false); director.seekChapter(i); };
    tlDots.appendChild(d); c.dot = d;
  });
  tl.addEventListener('pointerdown', (e) => { const r = tl.getBoundingClientRect(); const f = clamp((e.clientX - r.left) / r.width, 0, 1); setExplore(false); director.setTime(f * director.total); });

  // chapter list (explore mode)
  const list = $('#places');
  nav.forEach(({ c, i }) => { const b = document.createElement('button'); b.innerHTML = `<b>${c.zh}</b><small>${c.dist == null ? '' : fmtDist(c.dist)}</small>`; b.onclick = () => { closeMenu(); if (state.walk) { hooks.teleport(c); return; } setExplore(false); director.seekChapter(i); }; list.appendChild(b); });

  // labels
  const lblWrap = $('#labels'); const lbl = LABELS.map(l => { const e = document.createElement('div'); e.className = 'lbl'; e.innerHTML = `<i></i><b>${l.zh}</b><small>${l.en}</small>`; lblWrap.appendChild(e); return { ...l, e, v: new THREE.Vector3(l.x, l.y, l.z), vis: 0 }; });

  // minimap
  const mm = $('#minimap'), mg = mm.getContext('2d'); const MW = mm.width, MH = mm.height;
  const BX0 = -9800, BX1 = 6800, BZ0 = -6200, BZ1 = 9000; const mx = (x) => (x - BX0) / (BX1 - BX0) * MW, mz = (z) => (z - BZ0) / (BZ1 - BZ0) * MH;
  const base = document.createElement('canvas'); base.width = MW; base.height = MH; const bg = base.getContext('2d');
  bg.fillStyle = 'rgba(8,10,20,0.78)'; bg.fillRect(0, 0, MW, MH);
  bg.strokeStyle = 'rgba(160,170,220,0.16)'; bg.lineWidth = 1; for (const r of [1000, 5000, 10000]) { bg.beginPath(); bg.arc(mx(0), mz(0), r / (BX1 - BX0) * MW, 0, 7); bg.stroke(); }
  bg.strokeStyle = 'rgba(70,130,200,0.55)'; bg.lineWidth = 1.2; for (const w of DATA.water) { if (w.t === 'area') continue; bg.beginPath(); w.p.forEach((p, i) => i ? bg.lineTo(mx(p[0]), mz(p[1])) : bg.moveTo(mx(p[0]), mz(p[1]))); bg.stroke(); }
  for (const r of ctx.roads) { if (!r.osm) continue; bg.strokeStyle = r.cls === 'major' ? 'rgba(255,214,150,0.8)' : r.cls === 'mid' ? 'rgba(220,220,235,0.55)' : 'rgba(200,200,220,0.28)'; bg.lineWidth = r.cls === 'major' ? 1.3 : 0.8; bg.beginPath(); r.pts.forEach((p, i) => i ? bg.lineTo(mx(p[0]), mz(p[1])) : bg.moveTo(mx(p[0]), mz(p[1]))); bg.stroke(); }
  bg.fillStyle = 'rgba(255,255,255,0.85)'; nav.forEach(({ c }) => { if (c.anchor) { bg.beginPath(); bg.arc(mx(c.anchor[0]), mz(c.anchor[1]), 2.2, 0, 7); bg.fill(); } });
  bg.strokeStyle = 'rgba(255,255,255,0.5)'; bg.beginPath(); bg.moveTo(mx(-8650), mz(7700)); bg.lineTo(mx(-8650 + 3050 * 0.99 / 2), mz(7700 + 3050 * 0.1 / 2 + 140)); bg.stroke();
  const drawMini = () => {
    mg.clearRect(0, 0, MW, MH); mg.drawImage(base, 0, 0);
    const p = camera.position, d = new THREE.Vector3(); camera.getWorldDirection(d);
    mg.save(); mg.translate(mx(p.x), mz(p.z)); mg.rotate(Math.atan2(d.x, -d.z)); mg.fillStyle = '#ffd36a'; mg.beginPath(); mg.moveTo(0, -7); mg.lineTo(4.5, 5); mg.lineTo(0, 2.5); mg.lineTo(-4.5, 5); mg.closePath(); mg.fill(); mg.restore();
    mg.fillStyle = '#ff5a3c'; mg.beginPath(); mg.arc(mx(0), mz(0), 3, 0, 7); mg.fill();
  };

  function setWalk(on) {
    if (on === state.walk) return; if (on) setExplore(false); state.walk = on; document.body.classList.toggle('walk', on); $('#btn-walk').classList.toggle('on', on);
    $('#btn-walk').textContent = on ? '🎬 回到導覽' : '🚶 角色漫遊'; $('#walk-mini').textContent = on ? '🎬' : '🚶'; $('#w-help').classList.remove('fade'); clearTimeout(state.helpT); state.helpT = setTimeout(() => $('#w-help').classList.add('fade'), 6000); director.playing = false; hooks.walk(on, chs[Math.max(0, state.shown)]);
  }
  $('#btn-walk').onclick = () => { setWalk(!state.walk); closeMenu(); };
  $('#walk-mini').onclick = () => setWalk(!state.walk);
  const closeMenu = () => document.body.classList.remove('menu-open');
  $('#menu-btn').onclick = () => document.body.classList.toggle('menu-open');
  $('#menu-close').onclick = closeMenu;
  $('#card').onclick = (e) => { if (e.target.id === 'c-story') return; card.classList.toggle('min'); state.cardT = -1; };
  $('#w-story').onclick = () => { if (state.near) hooks.story(state.near.id); };
  function setExplore(on) {
    if (on && state.walk) setWalk(false);
    if (on === state.explore) return; state.explore = on; document.body.classList.toggle('explore', on); $('#btn-explore').classList.toggle('on', on);
    $('#btn-explore span').textContent = on ? '回到導覽' : '自由探索'; hooks.explore(on);
  }
  const todBtns = { auto: $('#tod-auto'), day: $('#tod-day'), dusk: $('#tod-dusk'), night: $('#tod-night'), cycle: $('#tod-cycle') };
  function setTod(k) { state.tod = k; for (const [n, b] of Object.entries(todBtns)) b.classList.toggle('on', n === k); hooks.tod(k); }
  for (const k of Object.keys(todBtns)) todBtns[k].onclick = () => setTod(k);
  $('#btn-play').onclick = () => { if (director.time >= director.total - 0.5) director.setTime(0); director.playing = !director.playing; setExplore(false); };
  $('#btn-prev').onclick = () => { setExplore(false); const cur = Math.max(1, director.holdIdx >= 0 ? director.holdIdx : state.shown); director.seekChapter(Math.max(0, cur - 1)); };
  $('#btn-next').onclick = () => { setExplore(false); const cur = director.holdIdx >= 0 ? director.holdIdx : Math.max(0, state.shown); director.seekChapter(Math.min(chs.length - 2, cur + 1)); };
  $('#btn-explore').onclick = () => setExplore(!state.explore);
  const STYLES = ['寫實', '水彩', '剪紙']; let styleI = 0;
  $('#btn-style').onclick = () => { styleI = (styleI + 1) % 3; $('#btn-style').textContent = '畫風：' + STYLES[styleI]; $('#btn-style').classList.toggle('on', styleI > 0); hooks.style(styleI); };
  $('#c-fight').onclick = (e) => { e.stopPropagation(); hooks.fight && hooks.fight(); };
  $('#c-story').onclick = () => hooks.story(chs[Math.max(0, state.shown)].id);
  $('#btn-fs').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); };
  $('#btn-hide').onclick = () => { state.ui = !state.ui; document.body.classList.toggle('ui-off', !state.ui); };
  $('#btn-sound').onclick = () => hooks.sound($('#btn-sound'));
  $('#start').onclick = () => { $('#intro').classList.add('gone'); director.playing = true; hooks.started && hooks.started(); };
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'g' || e.key === 'G') { setWalk(!state.walk); return; }
    if (e.key === 'm' || e.key === 'M') { document.body.classList.toggle('menu-open'); return; }
    if (e.key === 'Escape') closeMenu();
    if (state.walk) { if ((e.key === 't' || e.key === 'T') && state.near) hooks.story(state.near.id); if (e.key === 'h' || e.key === 'H') $('#btn-hide').click(); return; }
    if (e.code === 'Space') { e.preventDefault(); $('#btn-play').click(); } else if (e.code === 'ArrowRight') $('#btn-next').click(); else if (e.code === 'ArrowLeft') $('#btn-prev').click();
    else if (e.key === 'e' || e.key === 'E') setExplore(!state.explore); else if (e.key === 'h' || e.key === 'H') $('#btn-hide').click(); else if (e.key === 'f' || e.key === 'F') $('#btn-fs').click();
    else if (e.key === '1') setTod('day'); else if (e.key === '2') setTod('dusk'); else if (e.key === '3') setTod('night'); else if (e.key === '0') setTod('auto'); else if (e.key === '4') setTod('cycle'); else if (e.key === 's' || e.key === 'S') $('#btn-style').click();
  });
  addEventListener('wheel', (e) => { if (state.walk || state.explore || !$('#intro').classList.contains('gone')) return; director.setTime(director.time + e.deltaY * 0.025); }, { passive: true });

  const v = new THREE.Vector3(), proj = new THREE.Vector3();
  function walkHud(p) {
    let best = null, bd = 1e9; for (const c of chs) { if (!c.anchor || c.nav === false) continue; const d = Math.hypot(p.x - c.anchor[0], p.z - c.anchor[1]); if (d < bd) { bd = d; best = c; } }
    state.near = bd < 90 ? best : null;
    $('#w-name').textContent = bd < 220 ? best.zh + (bd < 90 ? '' : ' 附近') : '合艾街頭';
    $('#w-dist').textContent = '距李花園 ' + fmtDist(Math.hypot(p.x, p.z));
    $('#w-story').classList.toggle('show', !!state.near);
  }
  function update(dt, ev) {
    const ci = ev.ci; const c = chs[ci];
    if (state.shown !== ci) {
      state.shown = ci; card.classList.remove('in'); void card.offsetWidth;
      idxEl.textContent = c.nav === false ? (ci === 0 ? 'PROLOGUE' : 'EPILOGUE') : String(nav.findIndex(o => o.i === ci) + 1).padStart(2, '0') + ' / ' + String(nav.length).padStart(2, '0');
      zhEl.textContent = c.zh; enEl.textContent = c.en + (c.th ? '  ·  ' + c.th : ''); descEl.textContent = c.desc; tagEl.textContent = c.tag || '';
      document.body.classList.toggle('ch-muaythai', c.id === 'muaythai'); card.classList.add('in'); if (innerWidth < 760) { card.classList.add('min'); state.cardT = -1; } else { card.classList.remove('min'); state.cardT = 7; } nav.forEach(o => o.c.dot.classList.toggle('on', o.i === ci));
    }
    if (state.cardT > 0) { state.cardT -= dt; if (state.cardT <= 0) card.classList.add('min'); }
    const target = c.dist == null ? 0 : c.dist; state.dist += (target - state.dist) * Math.min(1, dt * 2.2);
    distEl.textContent = fmtDist(Math.max(0, state.dist)); distRing.style.setProperty('--p', Math.min(1, Math.log10(1 + state.dist) / Math.log10(12500)));
    tlFill.style.width = (director.time / director.total * 100) + '%';
    $('#btn-play').classList.toggle('paused', !director.playing); $('#btn-play').textContent = director.playing ? '❚❚' : '▶';
    // labels
    const w = innerWidth, h = innerHeight;
    for (const l of lbl) {
      proj.copy(l.v).project(camera); const d = camera.position.distanceTo(l.v);
      const show = proj.z < 1 && Math.abs(proj.x) < 1.05 && Math.abs(proj.y) < 1.05 && d < l.r && d > 20;
      l.vis += ((show ? 1 : 0) - l.vis) * Math.min(1, dt * 5);
      l.e.style.opacity = l.vis.toFixed(2); l.e.style.display = l.vis < 0.02 ? 'none' : 'flex';
      if (l.vis >= 0.02) l.e.style.transform = `translate(${((proj.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-proj.y * 0.5 + 0.5) * h).toFixed(1)}px)`;
    }
    drawMini();
  }
  return { update, setExplore, setTod, setWalk, walkHud, state };
}
