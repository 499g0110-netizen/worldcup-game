// Story-film soundtrack: public-domain German Baroque / Classical pieces, arranged here and synthesised live
// with WebAudio (organ, harpsichord, strings, flute, piano, music box, brass, timpani, bells) in a reverberant
// church-like room, plus procedural sound effects (fire, rain, waves, bells, hammer, marching, gulls, quill, page turns).
// No audio files are downloaded.

/* ------------------------------------------------------------------ notation */
const NI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (s) => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(s); if (!m) throw new Error('bad note ' + s); return 12 * (+m[3] + 1) + NI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
// "D5/1 G4/.5 r/1 C4+E4/2"  → events {t, m, d, i, v}; durations in beats
function seq(str, inst, vel = 0.6, t0 = 0, out = []) {
  let t = t0;
  for (const tok of str.trim().split(/\s+/)) { const [n, d = '1'] = tok.split('/'); const dur = +d; if (n !== 'r') for (const p of n.split('+')) out.push({ t, m: midi(p), d: dur, i: inst, v: vel }); t += dur; }
  out.end = t; return out;
}
const tr = (ev, semis) => ev.map((e) => ({ ...e, m: e.m + semis }));
// simple functional harmony under a melody: one chord per `bar` beats (I, V, I, IV, I, IV, V by scale degree)
function harmonise(mel, tonic, minor, bar, bassInst, padInst, vb = 0.5, vp = 0.22, end = mel.end) {
  const sc = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11], map = [0, 4, 0, 3, 0, 3, 4], out = [];
  let prev = 0;
  for (let b = 0; b < end - 1e-6; b += bar) {
    const n = mel.find((e) => e.t >= b - 1e-6 && e.t < b + bar - 1e-6);
    let root = prev;
    if (n) { const pc = ((n.m - tonic) % 12 + 12) % 12; let best = 0, bd = 99; sc.forEach((s, k) => { const d = Math.abs(s - pc); if (d < bd) { bd = d; best = k; } }); root = map[best]; }
    prev = root;
    const deg = (k) => { const q = root + k; return sc[q % 7] + 12 * Math.floor(q / 7); };
    let third = deg(2); if (minor && root === 4) third += 1;   // raised leading tone on V in minor
    const r = tonic + deg(0);
    out.push({ t: b, m: r - 24, d: bar, i: bassInst, v: vb });
    for (const x of [deg(0), third, deg(4)]) out.push({ t: b, m: tonic + x - 12, d: bar, i: padInst, v: vp });
  }
  return out;
}

/* ------------------------------------------------------------------ pieces */
function canonMain() {   // Pachelbel, Canon in D — the main city film: 10 variations, minor-key war section, bells at the end
  const bpm = 60, C = 16, ev = [];
  const bassMaj = ['D3', 'A2', 'B2', 'F#2', 'G2', 'D2', 'G2', 'A2'], bassMin = ['D3', 'A2', 'Bb2', 'F2', 'G2', 'D2', 'G2', 'A2'];
  const chMaj = [['D4', 'F#4', 'A4'], ['C#4', 'E4', 'A4'], ['D4', 'F#4', 'B4'], ['C#4', 'F#4', 'A4'], ['D4', 'G4', 'B4'], ['D4', 'F#4', 'A4'], ['D4', 'G4', 'B4'], ['C#4', 'E4', 'A4']];
  const chMin = [['D4', 'F4', 'A4'], ['C#4', 'E4', 'A4'], ['D4', 'F4', 'Bb4'], ['C4', 'F4', 'A4'], ['D4', 'G4', 'Bb4'], ['D4', 'F4', 'A4'], ['D4', 'G4', 'Bb4'], ['C#4', 'E4', 'A4']];
  const V1 = 'F#5/2 E5/2 D5/2 C#5/2 B4/2 A4/2 B4/2 C#5/2', V1m = 'F5/2 E5/2 D5/2 C#5/2 Bb4/2 A4/2 Bb4/2 C#5/2';
  const V2 = 'D5/2 C#5/2 B4/2 A4/2 G4/2 F#4/2 G4/2 E4/2';
  const V3 = 'D5 F#5 A5 G5 F#5 D5 F#5 E5 D5 B4 D5 A5 G5 B5 A5 G5';
  for (let c = 0; c < 10; c++) {
    const t0 = c * C, minor = c === 6 || c === 7, bass = minor ? bassMin : bassMaj, ch = minor ? chMin : chMaj;
    bass.forEach((n, k) => { ev.push({ t: t0 + k * 2, m: midi(n), d: 2, i: 'cello', v: 0.55 }); if (c > 0 && !minor) ev.push({ t: t0 + k * 2, m: midi(n) + 12, d: 0.5, i: 'harpsi', v: 0.35 }); });
    if (c >= 1) ch.forEach((tri, k) => tri.forEach((n) => ev.push({ t: t0 + k * 2, m: midi(n), d: 2, i: 'strings', v: c === 1 ? 0.13 : 0.18 })));
    const add = (str, inst, v, oct = 0) => seq(str, inst, v, t0).forEach((e) => ev.push({ ...e, m: e.m + oct }));
    if (c === 1) add(V1, 'violin', 0.45);
    if (c === 2) { add(V2, 'violin', 0.45); add(V1, 'violin', 0.3, -12); }
    if (c === 3) { add(V3, 'violin', 0.42); add(V2, 'violin', 0.3, -12); }
    if (c === 4 || c === 5 || c === 9) { ch.forEach((tri, k) => { const [a, b, d] = tri.map((n) => midi(n) + 12); [a, b, d, b].forEach((m, j) => ev.push({ t: t0 + k * 2 + j * 0.5, m, d: 0.5, i: 'harpsi', v: 0.32 })); }); add(c === 5 ? V1 : V3, c === 5 ? 'flute' : 'violin', 0.42); }
    if (minor) { add(V1m, 'violin', 0.42, -12); bass.forEach((n, k) => { ev.push({ t: t0 + k * 2, m: midi(n) - 12, d: 1.5, i: 'timp', v: c === 7 ? 0.8 : 0.55 }); if (c === 7) ev.push({ t: t0 + k * 2, m: midi(n), d: 2, i: 'brass', v: 0.28 }); }); }
    if (c === 8) add(V1, 'flute', 0.4);
    if (c === 9) { add(V1, 'brass', 0.25, -12); for (let k = 0; k < 8; k += 2) ev.push({ t: t0 + k * 2, m: midi('D2'), d: 1, i: 'timp', v: 0.6 }); for (let k = 0; k < 4; k++) ev.push({ t: t0 + k * 4, m: midi(['D5', 'A4', 'B4', 'F#4'][k]), d: 4, i: 'bell', v: 0.35 }); }
  }
  // final chord
  for (const n of ['D2', 'D3', 'A3', 'D4', 'F#4', 'A4', 'D5']) ev.push({ t: 160, m: midi(n), d: 6, i: n.endsWith('2') ? 'cello' : 'strings', v: 0.3 });
  ev.push({ t: 160, m: midi('D2'), d: 3, i: 'timp', v: 0.8 }, { t: 160, m: midi('D5'), d: 6, i: 'bell', v: 0.4 });
  return { bpm, intro: ev, introLen: 170, credit: '約翰·帕海貝爾《D 大調卡農》（改編，含戰爭段落小調變奏）' };
}
function prelude(inst) {   // J. S. Bach, Prelude in C major BWV 846 — broken-chord pattern, bars 1–19
  const B = [['C4', 'E4', 'G4', 'C5', 'E5'], ['C4', 'D4', 'A4', 'D5', 'F5'], ['B3', 'D4', 'G4', 'D5', 'F5'], ['C4', 'E4', 'G4', 'C5', 'E5'], ['C4', 'E4', 'A4', 'E5', 'A5'], ['C4', 'D4', 'F#4', 'A4', 'D5'], ['B3', 'D4', 'G4', 'D5', 'G5'], ['B3', 'C4', 'E4', 'G4', 'C5'], ['A3', 'C4', 'E4', 'G4', 'C5'], ['D3', 'A3', 'D4', 'F#4', 'C5'], ['G3', 'B3', 'D4', 'G4', 'B4'], ['G3', 'Bb3', 'E4', 'G4', 'C#5'], ['F3', 'A3', 'D4', 'A4', 'D5'], ['F3', 'Ab3', 'D4', 'F4', 'B4'], ['E3', 'G3', 'C4', 'G4', 'C5'], ['E3', 'F3', 'A3', 'C4', 'F4'], ['D3', 'F3', 'A3', 'C4', 'F4'], ['G2', 'D3', 'G3', 'B3', 'F4'], ['C3', 'E3', 'G3', 'C4', 'E4']];
  const ev = [];
  B.forEach((ch, b) => { const n = ch.map(midi); for (const h of [0, 8]) { const t = b * 16 + h; ev.push({ t, m: n[0], d: 8, i: inst, v: 0.5 }, { t: t + 1, m: n[1], d: 7, i: inst, v: 0.45 }); [2, 3, 4, 2, 3, 4].forEach((k, j) => ev.push({ t: t + 2 + j, m: n[k], d: 1.4, i: inst, v: 0.42 })); } });
  return { ev, end: B.length * 16 };
}
const P = {
  canon: canonMain,
  prelude_organ: () => { const p = prelude('organ'); return { bpm: 260, loop: p.ev, loopLen: p.end, credit: '巴哈《C 大調前奏曲》BWV 846（管風琴改編）' }; },
  prelude_harpsi: () => { const p = prelude('harpsi'); return { bpm: 300, loop: p.ev, loopLen: p.end, credit: '巴哈《C 大調前奏曲》BWV 846（大鍵琴）' }; },
  prelude_piano: () => { const p = prelude('piano'); return { bpm: 250, loop: p.ev, loopLen: p.end, credit: '巴哈《C 大調前奏曲》BWV 846（鋼琴）' }; },
  toccata_minuet: () => {   // Bach, Toccata in D minor BWV 565 (opening) → Minuet in G minor (Notenbüchlein, BWV Anh. 115) for the devil
    const intro = seq('A5/.15 G5/.15 A5/1.7 r/.5 G5/.15 F5/.15 E5/.15 D5/.15 C#5/.6 D5/1.8 r/.8 A4/.15 G4/.15 A4/1.7 r/.4 E4/.3 F4/.3 C#4/.6 D4/1.8 r/.8 A3/.15 G3/.15 A3/1.7 r/.4 G3/.15 F3/.15 E3/.15 D3/.15 C#3/.6 D3/2.2 r/.3', 'organ', 0.7);
    seq('D2/7', 'organ', 0.55, intro.end, intro); seq('C#4/.25 E4/.25 G4/.25 Bb4/.25 C#5+E5+G5/2.5 D4+F4+A4+D5/3.5', 'organ', 0.55, intro.end + 0.5, intro); const iL = intro.end + 7.5;
    const mel = seq('D5/1 G4/.5 A4/.5 Bb4/.5 C5/.5 D5/1 G4/1 G4/1 Eb5/1 C5/.5 D5/.5 Eb5/.5 F5/.5 G5/1 G4/1 G4/1 C5/1 D5/.5 C5/.5 Bb4/.5 A4/.5 Bb4/1 C5/.5 Bb4/.5 A4/.5 G4/.5 F#4/1 G4/.5 A4/.5 Bb4/.5 G4/.5 A4/3 D5/1 G4/.5 A4/.5 Bb4/.5 C5/.5 D5/1 G4/1 G4/1 Eb5/1 C5/.5 D5/.5 Eb5/.5 F5/.5 G5/1 G4/1 G4/1 C5/1 D5/.5 C5/.5 Bb4/.5 A4/.5 Bb4/1 C5/.5 Bb4/.5 A4/.5 G4/.5 A4/1 Bb4/.5 A4/.5 G4/.5 F#4/.5 G4/3', 'harpsi', 0.55);
    const h = harmonise(mel, midi('G4'), true, 3, 'harpsi', 'bassoon', 0.4, 0.14);
    return { bpm: 76, intro, introLen: iL, loop: [...mel, ...h], loopLen: mel.end, credit: '巴哈《D 小調觸技曲》BWV 565 開頭 → 《G 小調小步舞曲》BWV Anh. 115' };
  },
  feste_burg: () => {   // Luther, „Ein feste Burg ist unser Gott" — chorale for organ and brass (fortress / gates)
    const mel = seq('C5/1 C5/1 C5/1 G4/1 A4/1 B4/1 C5/2 B4/1 A4/1 G4/2 r/1 C5/1 G4/1 A4/1 F4/1 E4/1 D4/1 C4/3 r/1 C5/1 C5/1 C5/1 G4/1 A4/1 B4/1 C5/2 B4/1 A4/1 G4/2 r/1 C5/1 G4/1 A4/1 F4/1 E4/1 D4/1 C4/3 r/1 E4/1 F4/1 G4/1 A4/1 G4/1 F4/1 E4/2 D4/1 C4/1 D4/2 r/1 C5/1 B4/1 A4/1 G4/1 A4/1 F4/1 G4/2 C4/4', 'brass', 0.5);
    const h = harmonise(mel, midi('C4'), false, 1, 'organ', 'organ', 0.45, 0.2);
    return { bpm: 66, loop: [...mel, ...tr(mel, -12).map((e) => ({ ...e, i: 'organ', v: 0.3 })), ...h], loopLen: mel.end + 2, credit: '馬丁·路德聖詠《上主是我堅固保障》（管風琴與銅管改編）' };
  },
  fur_elise: () => {   // Beethoven, Für Elise (opening) — music box & piano, for the marzipan
    const mel = seq('E5/1 D#5/1 E5/1 D#5/1 E5/1 B4/1 D5/1 C5/1 A4/2 r/1 C4/1 E4/1 A4/1 B4/2 r/1 E4/1 G#4/1 B4/1 C5/2 r/1 E4/1 E5/1 D#5/1 E5/1 D#5/1 E5/1 B4/1 D5/1 C5/1 A4/2 r/1 C4/1 E4/1 A4/1 B4/2 r/1 E4/1 C5/1 B4/1 A4/4 r/2', 'musicbox', 0.5);
    const lh = seq('r/8 A2/1 E3/1 A3/1 r/3 E2/1 E3/1 G#3/1 r/3 A2/1 E3/1 A3/1 r/3 r/6 A2/1 E3/1 A3/1 r/3 E2/1 E3/1 G#3/1 r/3 A2/1 E3/1 A3/1 r/3', 'piano', 0.4);
    return { bpm: 250, loop: [...mel, ...mel.map((e) => ({ ...e, i: 'piano', v: 0.3 })), ...lh], loopLen: mel.end + 4, credit: '貝多芬《給愛麗絲》（八音盒與鋼琴改編）' };
  },
  lullaby: () => {   // Brahms, Wiegenlied op. 49 no. 4
    const mel = seq('E4/.5 E4/.5 G4/2 E4/.5 E4/.5 G4/2 E4/.5 G4/.5 C5/1 B4/1.5 A4/.5 A4/1 G4/1 D4/.5 E4/.5 F4/1 D4/1 D4/.5 E4/.5 F4/2 D4/.5 F4/.5 B4/.5 A4/.5 G4/1 B4/1 C5/2 C4/.5 C4/.5 C5/2 A4/.5 F4/.5 G4/2 E4/.5 C4/.5 F4/1 G4/1 A4/1 G4/2 C4/.5 C4/.5 C5/2 A4/.5 F4/.5 G4/2 E4/.5 C4/.5 F4/1 E4/1 D4/1 C4/3', 'piano', 0.5);
    const h = harmonise(mel, midi('C4'), false, 3, 'cello', 'strings', 0.35, 0.12);
    return { bpm: 84, loop: [...mel, ...mel.map((e) => ({ ...e, m: e.m + 12, i: 'flute', v: 0.18 })), ...h], loopLen: mel.end + 1, credit: '布拉姆斯《搖籃曲》作品 49 之 4（鋼琴、長笛與弦樂改編）' };
  },
  ode: () => {   // Beethoven, „Freude, schöner Götterfunken" (9th symphony)
    const mel = seq('F#4 F#4 G4 A4 A4 G4 F#4 E4 D4 D4 E4 F#4 F#4/1.5 E4/.5 E4/2 F#4 F#4 G4 A4 A4 G4 F#4 E4 D4 D4 E4 F#4 E4/1.5 D4/.5 D4/2 E4 E4 F#4 D4 E4 F#4/.5 G4/.5 F#4 D4 E4 F#4/.5 G4/.5 F#4 E4 D4 E4 A3/2 F#4 F#4 G4 A4 A4 G4 F#4 E4 D4 D4 E4 F#4 E4/1.5 D4/.5 D4/2', 'flute', 0.5);
    const h = harmonise(mel, midi('D4'), false, 2, 'cello', 'strings', 0.4, 0.15);
    return { bpm: 100, loop: [...mel, ...mel.map((e) => ({ ...e, i: 'violin', v: 0.25 })), ...h], loopLen: mel.end + 2, credit: '貝多芬《快樂頌》（第九號交響曲，長笛與弦樂改編）' };
  },
  jesu: () => {   // Bach, „Jesus bleibet meine Freude" (BWV 147) — flowing triplets
    const mel = seq('G4 A4 B4 D5 C5 C5 E5 D5 D5 G5 F#5 G5 D5 B4 G4 A4 B4 C5 D5 E5 D5 C5 B4 A4 B4 G4 F#4 G4 A4 D4 F#4 A4 C5 B4 A4 B4 G4 A4 B4 D5 C5 C5 E5 D5 D5 G5 F#5 G5 D5 B4 G4 A4 B4 E4 D5 C5 B4 A4 G4 D4 G4 F#4 G4/3 r/3', 'oboe', 0.45);
    const h = harmonise(mel, midi('G4'), false, 3, 'cello', 'strings', 0.4, 0.13);
    return { bpm: 200, loop: [...mel, ...h], loopLen: mel.end, credit: '巴哈《耶穌，世人仰望的喜悅》BWV 147（雙簧管與弦樂改編）' };
  },
  minuet: (inst = 'harpsi') => {   // Minuet in G major (Notenbüchlein für Anna Magdalena Bach, BWV Anh. 114)
    const mel = seq('D5/1 G4/.5 A4/.5 B4/.5 C5/.5 D5/1 G4/1 G4/1 E5/1 C5/.5 D5/.5 E5/.5 F#5/.5 G5/1 G4/1 G4/1 C5/1 D5/.5 C5/.5 B4/.5 A4/.5 B4/1 C5/.5 B4/.5 A4/.5 G4/.5 F#4/1 G4/.5 A4/.5 B4/.5 G4/.5 A4/3 D5/1 G4/.5 A4/.5 B4/.5 C5/.5 D5/1 G4/1 G4/1 E5/1 C5/.5 D5/.5 E5/.5 F#5/.5 G5/1 G4/1 G4/1 C5/1 D5/.5 C5/.5 B4/.5 A4/.5 B4/1 C5/.5 B4/.5 A4/.5 G4/.5 A4/1 B4/.5 A4/.5 G4/.5 F#4/.5 G4/3', inst, 0.5);
    const h = harmonise(mel, midi('G4'), false, 3, inst, 'bassoon', 0.38, 0.1);
    return { bpm: 108, loop: [...mel, ...h], loopLen: mel.end, credit: '《G 大調小步舞曲》BWV Anh. 114（安娜·瑪德蓮娜·巴哈音樂筆記本）' };
  },
  canon_quartet: () => {   // lighter Canon for the painters' corner: strings only
    const bass = ['D3', 'A2', 'B2', 'F#2', 'G2', 'D2', 'G2', 'A2'], ev = [];
    for (let c = 0; c < 4; c++) { bass.forEach((n, k) => ev.push({ t: c * 16 + k * 2, m: midi(n), d: 2, i: 'cello', v: 0.45 })); if (c) seq(['F#5/2 E5/2 D5/2 C#5/2 B4/2 A4/2 B4/2 C#5/2', 'D5/2 C#5/2 B4/2 A4/2 G4/2 F#4/2 G4/2 E4/2', 'D5 F#5 A5 G5 F#5 D5 F#5 E5 D5 B4 D5 A5 G5 B5 A5 G5'][c - 1], 'violin', 0.4, c * 16, ev); if (c > 1) seq('F#5/2 E5/2 D5/2 C#5/2 B4/2 A4/2 B4/2 C#5/2', 'violin', 0.25, c * 16).forEach((e) => ev.push({ ...e, m: e.m - 12 })); }
    return { bpm: 58, loop: ev, loopLen: 64, credit: '帕海貝爾《D 大調卡農》（弦樂四重奏改編）' };
  },
  bach_story: () => { const t = P.toccata_minuet(), p = prelude('organ'); return { bpm: 76, intro: t.intro, introLen: t.introLen, loop: p.ev.map((e) => ({ ...e, t: e.t / 3.4, d: e.d / 3.4 })), loopLen: p.end / 3.4, credit: '巴哈《D 小調觸技曲》BWV 565 開頭 → 《C 大調前奏曲》BWV 846（管風琴）' }; },
};
export const SCORES = P;

/* ------------------------------------------------------------------ the engine */
let A = null;   // shared AudioContext + graph
function graph() {
  if (A) return A;
  const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return null;
  const ctx = new Ctx(), master = ctx.createGain(), comp = ctx.createDynamicsCompressor(), rev = ctx.createConvolver(), wet = ctx.createGain(), dry = ctx.createGain(), sfx = ctx.createGain();
  comp.threshold.value = -16; comp.ratio.value = 3; master.gain.value = 1.3; wet.gain.value = 0.42; dry.gain.value = 0.85; sfx.gain.value = 0.7;
  // church-like impulse response: 3.2 s stereo exponential noise tail with early reflections
  const len = Math.floor(ctx.sampleRate * 3.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); let s = 1 + ch; for (let i = 0; i < len; i++) { s = (s * 16807) % 2147483647; const x = i / len; d[i] = ((s / 2147483647) * 2 - 1) * Math.pow(1 - x, 2.6) * (i < 2400 ? 0.3 : 1); } for (const e of [0.011, 0.019, 0.027, 0.041]) d[Math.floor(e * ctx.sampleRate)] += 0.5; }
  rev.buffer = ir;
  dry.connect(comp); rev.connect(wet); wet.connect(comp); sfx.connect(comp); comp.connect(master); master.connect(ctx.destination);
  // periodic waves (one oscillator per voice instead of additive banks)
  const pw = (amps) => { const re = new Float32Array(amps.length + 1), im = new Float32Array(amps.length + 1); amps.forEach((a, k) => (im[k + 1] = a)); return ctx.createPeriodicWave(re, im); };
  const W = {
    organ: pw([1, 0.55, 0.32, 0.28, 0.06, 0.12, 0.02, 0.1, 0, 0.03, 0, 0.02]),
    reed: pw([1, 0.8, 0.6, 0.5, 0.42, 0.35, 0.3, 0.25, 0.2, 0.17, 0.14, 0.12, 0.1]),
    harpsi: pw([1, 0.7, 0.55, 0.5, 0.45, 0.38, 0.33, 0.3, 0.26, 0.22, 0.2, 0.18, 0.15, 0.13, 0.12, 0.1]),
    piano: pw([1, 0.45, 0.22, 0.12, 0.08, 0.05, 0.03]),
    flute: pw([1, 0.18, 0.06, 0.02]),
    oboe: pw([0.5, 1, 0.7, 0.5, 0.3, 0.2, 0.1]),
    box: pw([1, 0, 0, 0.25, 0, 0, 0, 0.08]),
  };
  const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 5.2; lfoG.gain.value = 9; lfo.connect(lfoG); lfo.start();
  let nb = null; const noise = () => { if (nb) return nb; nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = nb.getChannelData(0); let s = 3; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; } return nb; };
  const an = ctx.createAnalyser(); an.fftSize = 2048; master.connect(an);
  window.__audioLevel = () => { const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d); let e = 0; for (const v of d) e += v * v; return Math.sqrt(e / d.length); };   // test hook
  A = { ctx, master, dry, rev, sfx, W, lfoG, noise };
  return A;
}
// one voice. returns {g, end} so a seek can silence it
function voice(inst, m, t, dur, v) {
  const { ctx, dry, rev, W, lfoG } = A, f = hz(m), g = ctx.createGain(), send = ctx.createGain(); g.connect(dry); g.connect(send); send.connect(rev);
  const osc = (type, fr, det = 0) => { const o = ctx.createOscillator(); if (W[type]) o.setPeriodicWave(W[type]); else o.type = type; o.frequency.value = fr; o.detune.value = det; return o; };
  const env = (a, peak, rel, sustain = 1) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak * sustain, t + Math.max(a, dur)); g.gain.linearRampToValueAtTime(0, t + Math.max(a, dur) + rel); return t + Math.max(a, dur) + rel + 0.05; };
  let end = t + dur + 0.5, oscs = [], into = g;
  const lp = (fr, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = fr; b.Q.value = q; b.connect(g); into = b; return b; };
  switch (inst) {
    case 'organ': { send.gain.value = 0.9; end = env(0.05, v * 0.11, 0.25); lp(5200); oscs = [osc('organ', f), osc('organ', f * 2, 4)]; oscs[1].__g = 0.25; break; }
    case 'strings': case 'violin': case 'cello': {
      send.gain.value = 0.7; const lead = inst === 'violin'; end = env(lead ? 0.09 : inst === 'cello' ? 0.06 : 0.35, v * (lead ? 0.1 : 0.07), lead ? 0.35 : 0.6);
      lp(inst === 'cello' ? 900 : lead ? 3200 : 2200, 0.9); oscs = [osc('sawtooth', f, -7), osc('sawtooth', f, 7)]; if (!lead) oscs.push(osc('sawtooth', f, 0)); for (const o of oscs) if (lead || inst === 'cello') lfoG.connect(o.detune); break; }
    case 'flute': case 'oboe': case 'bassoon': { send.gain.value = 0.7; end = env(0.07, v * (inst === 'bassoon' ? 0.07 : 0.09), 0.25); lp(inst === 'flute' ? 3500 : inst === 'oboe' ? 2800 : 900); oscs = [osc(inst === 'bassoon' ? 'reed' : inst, f)]; lfoG.connect(oscs[0].detune); break; }
    case 'brass': { send.gain.value = 0.6; end = env(0.06, v * 0.09, 0.3); const b = lp(600, 1.5); b.frequency.setValueAtTime(500, t); b.frequency.linearRampToValueAtTime(2600, t + 0.12); b.frequency.linearRampToValueAtTime(1600, t + dur); oscs = [osc('sawtooth', f, -4), osc('sawtooth', f, 4)]; break; }
    case 'harpsi': case 'piano': case 'musicbox': {
      const hp = inst === 'harpsi', box = inst === 'musicbox', dec = hp ? 1.6 : box ? 1.4 : 2.8, pk = v * (hp ? 0.12 : box ? 0.1 : 0.14);
      send.gain.value = 0.55; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + 0.004); g.gain.exponentialRampToValueAtTime(pk * 0.25, t + dec * 0.35); g.gain.exponentialRampToValueAtTime(0.0005, t + dec);
      if (hp) { g.gain.cancelScheduledValues(t + dur + 0.05); g.gain.setTargetAtTime(0, t + dur + 0.05, 0.03); }
      end = t + (hp ? Math.min(dec, dur + 0.3) : dec) + 0.05; const b = lp(hp ? 7000 : box ? 6000 : 3000); b.frequency.setValueAtTime(hp ? 7000 : 4000, t); b.frequency.exponentialRampToValueAtTime(hp ? 1800 : 900, t + dec * 0.6);
      oscs = [osc(hp ? 'harpsi' : box ? 'box' : 'piano', f), osc(hp ? 'harpsi' : 'piano', f, hp ? 5 : 2)]; if (box) oscs.push(osc('sine', f * 4.02)); break; }
    case 'timp': { send.gain.value = 0.8; g.gain.setValueAtTime(v * 0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4); end = t + 1.5; const o = osc('sine', f * 1.5); o.frequency.exponentialRampToValueAtTime(f, t + 0.06); oscs = [o, osc('sine', f * 1.5 * 1.01)]; oscs[1].__g = 0.3;
      const n = ctx.createBufferSource(); n.buffer = A.noise(); const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 400; const ng = ctx.createGain(); ng.gain.setValueAtTime(v * 0.25, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.25); n.connect(nf).connect(ng).connect(g); n.start(t); n.stop(t + 0.3); break; }
    case 'bell': { send.gain.value = 1; g.gain.setValueAtTime(v * 0.12, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 5); end = t + 5.1;
      oscs = [[1, 1], [2.0, 0.6], [2.4, 0.45], [3.0, 0.3], [4.2, 0.22], [5.4, 0.12], [0.5, 0.5]].map(([k, a]) => { const o = osc('sine', f * k); o.__g = a; return o; }); break; }
    default: return null;
  }
  for (const o of oscs) { if (o.__g) { const og = ctx.createGain(); og.gain.value = o.__g; o.connect(og).connect(into); } else o.connect(into); o.start(t); o.stop(end); }
  return { g, end };
}

/* ------------------------------------------------------------------ sound effects */
function burst(t, { f = 2000, type = 'bandpass', q = 1, dur = 0.2, v = 0.3, a = 0.005 } = {}) {
  const { ctx, sfx } = A, n = ctx.createBufferSource(); n.buffer = A.noise(); const bf = ctx.createBiquadFilter(); bf.type = type; bf.frequency.value = f; bf.Q.value = q; const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0005, t + dur); n.connect(bf).connect(g).connect(sfx); n.start(t, Math.random()); n.stop(t + dur + 0.05); return { g, end: t + dur };
}
function tone(t, f, dur, v, type = 'sine', f2 = null, toRev = 0.3) {
  const { ctx, sfx, rev } = A, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + dur); o.connect(g); g.connect(sfx); if (toRev) { const s = ctx.createGain(); s.gain.value = toRev; g.connect(s).connect(rev); } o.start(t); o.stop(t + dur + 0.05); return { g, end: t + dur };
}
// continuous ambiences (looping noise through filters, optionally amplitude-modulated)
function ambience(kind) {
  const { ctx, sfx } = A, n = ctx.createBufferSource(); n.buffer = A.noise(); n.loop = true; const f = ctx.createBiquadFilter(), g = ctx.createGain(), nodes = [n];
  const cfg = { fire: ['bandpass', 700, 0.6, 0.22], rain: ['highpass', 2600, 0.5, 0.12], waves: ['lowpass', 520, 0.7, 0.16], wind: ['bandpass', 420, 2.5, 0.12], crowd: ['bandpass', 650, 1.2, 0.07], canal: ['lowpass', 380, 0.7, 0.1] }[kind];
  if (!cfg) return null;
  f.type = cfg[0]; f.frequency.value = cfg[1]; f.Q.value = cfg[2]; g.gain.value = 0; g.gain.linearRampToValueAtTime(cfg[3], ctx.currentTime + 0.8);
  if (kind === 'waves' || kind === 'wind' || kind === 'crowd' || kind === 'canal') { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = kind === 'waves' ? 0.14 : kind === 'crowd' ? 3.1 : 0.2; lg.gain.value = cfg[3] * 0.7; l.connect(lg).connect(g.gain); l.start(); nodes.push(l); if (kind === 'wind') { const l2 = ctx.createGain(); l2.gain.value = 200; l.connect(l2).connect(f.frequency); } }
  n.connect(f).connect(g).connect(sfx); n.start();
  return { stop() { const t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 0.5); for (const x of nodes) x.stop(t + 0.6); } };
}
// repeating one-shots: [interval s, jitter, fn(t)]
const SHOTS = {
  fire: [0.11, 0.2, (t) => burst(t, { f: 2500 + Math.random() * 3000, dur: 0.03, v: 0.18, type: 'highpass' })],
  bell: [3.2, 0, (t) => voice('bell', midi(Math.random() < 0.5 ? 'G3' : 'C4'), t, 3, 0.9)],
  hammer: [0.9, 0.3, (t) => { tone(t, 1700 + Math.random() * 300, 0.12, 0.12, 'triangle'); tone(t, 950, 0.18, 0.1, 'square'); burst(t, { f: 3000, dur: 0.05, v: 0.15 }); }],
  piledrive: [1.4, 0.1, (t) => { tone(t, 90, 0.35, 0.4, 'sine', 45, 0.1); burst(t, { f: 300, type: 'lowpass', dur: 0.2, v: 0.35 }); }],
  march: [0.5, 0, (t) => { tone(t, 110, 0.15, 0.3, 'sine', 60, 0.1); if (Math.floor(t * 2) % 2) burst(t, { f: 1800, dur: 0.12, v: 0.12 }); }],
  gull: [3.5, 2.5, (t) => { for (let k = 0; k < 3; k++) tone(t + k * 0.22, 1500 - k * 60, 0.18, 0.05, 'triangle', 1100, 0.4); }],
  birds: [1.3, 1.2, (t) => { const n = 2 + Math.floor(Math.random() * 3); for (let k = 0; k < n; k++) tone(t + k * 0.09, 3200 + Math.random() * 1500, 0.07, 0.03, 'sine', 4800 + Math.random() * 600, 0.2); }],
  quill: [0.18, 0.25, (t) => burst(t, { f: 5000 + Math.random() * 2000, dur: 0.06 + Math.random() * 0.08, v: 0.05, q: 2 })],
  boom: [2.6, 1.5, (t) => { tone(t, 60, 1.6, 0.5, 'sine', 30, 0.5); burst(t, { f: 180, type: 'lowpass', dur: 1.3, v: 0.5, a: 0.02 }); }],
  steps: [0.55, 0.05, (t) => burst(t, { f: 900, dur: 0.07, v: 0.12, q: 0.8 })],
  oars: [2.2, 0.3, (t) => burst(t, { f: 600, dur: 0.6, v: 0.1, a: 0.15, type: 'lowpass' })],
  lock: [6, 0, (t) => { tone(t, 140, 1.2, 0.18, 'sawtooth', 120, 0.3); burst(t + 0.3, { f: 500, type: 'lowpass', dur: 2.2, v: 0.2, a: 0.6 }); }],
  coins: [1.7, 1, (t) => { for (let k = 0; k < 3; k++) tone(t + k * 0.06, 3800 + Math.random() * 900, 0.25, 0.05, 'sine', null, 0.3); }],
  clock: [1, 0, (t) => burst(t, { f: 3500, dur: 0.03, v: 0.08, q: 4 })],
  cheer: [5, 2, (t) => burst(t, { f: 900, dur: 1.4, v: 0.12, a: 0.3, q: 0.6 })],
  projector: [0.083, 0, (t) => burst(t, { f: 2200, dur: 0.02, v: 0.05, q: 3 })],
  stone: [5, 0, (t) => { tone(t, 70, 0.7, 0.45, 'sine', 40, 0.4); burst(t, { f: 250, type: 'lowpass', dur: 0.6, v: 0.4 }); }],
  train: [0.42, 0, (t) => { burst(t, { f: 260, type: 'lowpass', dur: 0.22, v: 0.25, a: 0.01 }); burst(t + 0.05, { f: 1400, dur: 0.12, v: 0.07 }); if (Math.random() < 0.06) { tone(t, 880, 1.1, 0.06, 'triangle', 860, 0.4); tone(t, 1110, 1.1, 0.05, 'triangle', 1090, 0.4); } }],
  creak: [4, 2, (t) => tone(t, 180, 0.6, 0.06, 'sawtooth', 240, 0.2)],
};

export class StoryAudio {
  constructor() { this.muted = false; try { this.muted = localStorage.getItem('lub-mute') === '1'; } catch { /* */ } this.active = []; this.amb = []; }
  start(story) {   // must be called from a user gesture (opening the film)
    if (!graph()) return; const { ctx } = A; ctx.resume?.();
    this.stopAll(); this.score = P[story.music || 'prelude_harpsi'](); this.sfx = story.sfx || []; this.scene = -2; this.lastNow = null; this.cursor = 0; this.nextShot = {};
    A.master.gain.cancelScheduledValues(ctx.currentTime); A.master.gain.setValueAtTime(this.muted ? 0 : 1.3, ctx.currentTime);
  }
  get credit() { return this.score?.credit || ''; }
  setMuted(m) { this.muted = m; try { localStorage.setItem('lub-mute', m ? '1' : '0'); } catch { /* */ } if (A) A.master.gain.setTargetAtTime(m ? 0 : 1.3, A.ctx.currentTime, 0.05); }
  stopAll(fade = 0.08) {
    if (!A) return; const t = A.ctx.currentTime;
    for (const v of this.active) { try { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, fade / 3); } catch { /* */ } }
    this.active = []; for (const a of this.amb) a?.stop(); this.amb = [];
  }
  close() { this.stopAll(0.4); if (A && A.ctx.state === 'running') setTimeout(() => { if (!document.querySelector('#story.on')) A.ctx.suspend(); }, 700); }
  // called every frame by the film player
  update(time, playing, sceneIdx) {
    if (!A || !this.score) return; const { ctx } = A;
    if (!playing) { if (ctx.state === 'running') ctx.suspend(); return; }
    if (ctx.state === 'suspended') { ctx.resume(); return; }
    const now = ctx.currentTime;
    if (this.lastNow == null || Math.abs(time - (this.lastTime + (now - this.lastNow))) > 0.25) { this.stopAll(); this.cursor = time; this.scene = -2; }   // seek / restart
    this.lastTime = time; this.lastNow = now;
    const off = now - time, S = this.score, spb = 60 / S.bpm, ahead = time + 0.35;
    if (ahead > this.cursor) {
      const b0 = this.cursor / spb, b1 = ahead / spb, put = (e, base) => { const bt = base + e.t; if (bt < b0 || bt >= b1) return; const w = off + bt * spb; if (w < now - 0.02) return; const v = voice(e.i, e.m, Math.max(now, w), e.d * spb, e.v); if (v) this.active.push(v); };
      if (S.intro) for (const e of S.intro) put(e, 0);
      if (S.loop) { const iL = S.introLen || 0; for (let k = Math.max(0, Math.floor((b0 - iL) / S.loopLen)); iL + k * S.loopLen < b1; k++) for (const e of S.loop) put(e, iL + k * S.loopLen); }
      this.cursor = ahead;
      if (this.active.length > 80) this.active = this.active.filter((v) => v.end > now);
    }
    // scene sound effects
    if (sceneIdx !== this.scene) {
      for (const a of this.amb) a?.stop(); this.amb = []; this.nextShot = {};
      if (this.scene !== -2 || sceneIdx >= 0) { burst(now, { f: 2600, dur: 0.35, v: 0.07, a: 0.08, q: 0.4 }); burst(now + 0.12, { f: 1800, dur: 0.25, v: 0.05, a: 0.05, q: 0.4 }); }   // paper rustle
      this.scene = sceneIdx;
      for (const k of (sceneIdx >= 0 && this.sfx[sceneIdx]) || []) { const a = ambience(k); if (a) this.amb.push(a); if (SHOTS[k]) this.nextShot[k] = now + 0.4 + Math.random() * 0.6; }
    }
    for (const [k, tt] of Object.entries(this.nextShot)) if (tt < now + 0.1) { const [iv, jit, fn] = SHOTS[k]; const r = fn(Math.max(now, tt)); if (r) this.active.push(r); this.nextShot[k] = tt + iv + Math.random() * jit; }
  }
}
