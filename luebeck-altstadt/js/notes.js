// Music in the streets: while students practise in the Musikhochschule (and street musicians play), musical notes
// drift slowly out of the windows, sway, grow and float up into the sky before fading. Near the academy a soft
// piano (Bach, Prelude in C) is heard, synthesised with the same engine as the story films.
import * as THREE from 'three';
import { StoryAudio } from './storyaudio.js';

function noteTexture(glyph, col) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.font = '700 104px "Noto Music", "Segoe UI Symbol", "DejaVu Sans", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(255,230,160,0.9)'; g.shadowBlur = 14; g.fillStyle = col; g.fillText(glyph, 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export class FloatingNotes {
  constructor(scene, { sources, touch }) {
    this.scene = scene; this.sources = sources; this.max = touch ? 26 : 60; this.list = []; this.t = 0;
    this.mats = [['♪', '#fff6dc'], ['♫', '#ffe08a'], ['♩', '#ffffff'], ['♬', '#f6d27a']].map(([g, c]) => new THREE.SpriteMaterial({ map: noteTexture(g, c), transparent: true, depthWrite: false, fog: true }));
    this.audio = new StoryAudio(); this.playing = false; this.acc = new Map();
  }
  emit(src) {
    const m = new THREE.Sprite(this.mats[Math.floor(Math.random() * this.mats.length)].clone());
    const a = Math.random() * Math.PI * 2, r = src.r * Math.random();
    m.position.set(src.x + Math.cos(a) * r, src.y0 + Math.random() * (src.y1 - src.y0), src.z + Math.sin(a) * r);
    m.userData = { age: 0, life: 10 + Math.random() * 8, vx: (Math.random() - 0.5) * 0.4, vz: (Math.random() - 0.5) * 0.4, ph: Math.random() * 6, s0: 0.7 + Math.random() * 0.5 };
    m.scale.setScalar(0.01); this.scene.add(m); this.list.push(m);
  }
  update(dt, px, pz, storyOpen) {
    this.t += dt;
    for (const s of this.sources()) {   // time-accumulated emission: steady stream regardless of frame rate
      const d = Math.hypot(s.x - px, s.z - pz); if (d > 180) continue;
      s.__acc = (this.acc.get(s.key) || 0) + dt * s.rate; while (s.__acc >= 1 && this.list.length < this.max) { this.emit(s); s.__acc -= 1; } this.acc.set(s.key, Math.min(s.__acc, 3));
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const m = this.list[i], u = m.userData; u.age += dt;
      if (u.age > u.life) { this.scene.remove(m); m.material.dispose(); this.list.splice(i, 1); continue; }
      const k = u.age / u.life;
      m.position.x += (u.vx + Math.sin(this.t * 0.9 + u.ph) * 0.35) * dt; m.position.z += (u.vz + Math.cos(this.t * 0.7 + u.ph) * 0.35) * dt;
      m.position.y += (0.45 + k * 0.6) * dt;
      m.scale.setScalar(u.s0 * (0.4 + Math.min(1, u.age * 1.5)) * (1 + k * 1.2));
      m.material.opacity = Math.min(1, u.age * 1.2) * (1 - Math.pow(k, 2.5));
      m.material.rotation = Math.sin(this.t + u.ph) * 0.3;
    }
    // soft piano near the academy (only once the visitor has interacted with the page, and never during a film)
    const academy = this.sources().find((s) => s.music);
    const near = academy && Math.hypot(academy.x - px, academy.z - pz) < 55 && !storyOpen;
    if (near && !this.playing) { this.audio.start({ music: 'prelude_piano' }); this.playing = true; this.time = 0; }
    if (this.playing) { if (near) { this.time += dt; this.audio.update(this.time, true, -1); } else { this.audio.close(); this.playing = false; } }
  }
}
