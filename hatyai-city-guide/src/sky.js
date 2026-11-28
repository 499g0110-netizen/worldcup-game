import * as THREE from 'three';
import { clamp, lerp } from './util.js';

// ---- time-of-day keys: 0 = day, .35 = sunset, .62 = blue hour (purple), 1 = night ----
const C = (h) => new THREE.Color(h);
const KEYS = [
  { t: 0.00, zen: C('#2a68c8'), mid: C('#6fa8e6'), hor: C('#cfe3f5'), el: 52, az: 255, sun: C('#fff0d6'), si: 2.6, hs: C('#a9c6ef'), hg: C('#4a4638'), hi: 0.7, fog: C('#b4cbe2'), fd: 0.000042, win: 0.0, lamp: 0.0, stars: 0.0, bloom: 0.12, exp: 0.78, glow: 0.35, cloud: 0.52 },
  { t: 0.35, zen: C('#3a2a7a'), mid: C('#c0508a'), hor: C('#ff8f4a'), el: 3, az: 258, sun: C('#ff9550'), si: 2.1, hs: C('#8a6aa8'), hg: C('#3a2c3a'), hi: 0.62, fog: C('#c4708a'), fd: 0.00006, win: 0.45, lamp: 0.55, stars: 0.05, bloom: 0.42, exp: 1.0, glow: 1.0, cloud: 0.42 },
  { t: 0.62, zen: C('#1d0f46'), mid: C('#5c2a80'), hor: C('#b0508c'), el: -4, az: 262, sun: C('#b47ad0'), si: 0.45, hs: C('#6a66c4'), hg: C('#241c3a'), hi: 0.78, fog: C('#4e3472'), fd: 0.00006, win: 0.88, lamp: 0.92, stars: 0.35, bloom: 0.6, exp: 1.05, glow: 0.7, cloud: 0.46 },
  { t: 1.00, zen: C('#04061a'), mid: C('#0c1438'), hor: C('#222350'), el: 40, az: 100, sun: C('#93aaff'), si: 0.9, hs: C('#3a4a90'), hg: C('#24243a'), hi: 0.95, fog: C('#151b3e'), fd: 0.00008, win: 1.0, lamp: 1.0, stars: 1.0, bloom: 0.72, exp: 1.12, glow: 0.0, cloud: 0.56 },
];
const SCALARS = ['el', 'az', 'si', 'hi', 'fd', 'win', 'lamp', 'stars', 'bloom', 'exp', 'glow', 'cloud'];
const COLORS = ['zen', 'mid', 'hor', 'sun', 'hs', 'hg', 'fog'];

function sampleKeys(t) {
  t = clamp(t, 0, 1);
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
  const a = KEYS[i], b = KEYS[i + 1], k = clamp((t - a.t) / (b.t - a.t), 0, 1), s = k * k * (3 - 2 * k);
  const o = {};
  for (const n of SCALARS) o[n] = lerp(a[n], b[n], s);
  for (const n of COLORS) o[n] = a[n].clone().lerp(b[n], s);
  return o;
}

const SKY_VS = `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*p; }`;
const SKY_FS = `
precision highp float;
varying vec3 vDir;
uniform vec3 uZen, uMid, uHor, uSunCol, uSunDir, uMoonDir;
uniform float uTime, uStars, uGlow, uCloud, uMoon;
float hash(vec3 p){ p=fract(p*0.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float hash2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x), mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(17.,9.); a*=.5; } return s; }
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.30, h));
  col = mix(col, uZen, smoothstep(0.18, 0.9, h));
  float sd = max(dot(d, uSunDir), 0.);
  vec2 hs = normalize(uSunDir.xz + 1e-4);
  float az = max(dot(normalize(d.xz + 1e-4), hs), 0.);
  col += uSunCol * (pow(sd, 6.)*0.28 + pow(sd, 60.)*0.5 + pow(sd, 1400.)*6.0) * uGlow;
  col += uSunCol * pow(az, 3.) * exp(-abs(h)*6.5) * 0.55 * uGlow;
  col = mix(col, uHor*0.55, smoothstep(0.0, -0.3, h));
  // clouds
  if (h > -0.02) {
    vec2 p = d.xz / (max(h,0.) + 0.14) * 0.85 + vec2(uTime*0.004, uTime*0.0015);
    float n = fbm(p*1.6), n2 = fbm(p*1.6 + vec2(0.07,0.04)*3.0);
    float c = smoothstep(uCloud, uCloud+0.26, n);
    float edge = clamp((n2 - n)*7. + 0.5, 0., 1.);       // crude self-shadow
    vec3 lit = uSunCol*0.9 + uHor*0.5;
    vec3 cc = mix(uMid*0.55, lit, pow(az, 2.)*0.75*uGlow + 0.0) * mix(0.55, 1.15, edge);
    cc += uSunCol * pow(sd, 12.) * 0.35 * uGlow;
    col = mix(col, cc, c * smoothstep(-0.02, 0.14, h) * 0.9);
  }
  // stars + moon
  if (uStars > 0.01 && h > 0.0) {
    vec3 sp = d * 260.; vec3 id = floor(sp); float r = hash(id);
    float st = step(0.9965, r) * smoothstep(0.55, 0.0, length(fract(sp) - 0.5)) * (0.4 + 0.6*hash(id+7.));
    col += vec3(0.85,0.9,1.0) * st * uStars * smoothstep(0.02, 0.3, h) * 1.4;
  }
  float md = dot(d, uMoonDir);
  col += vec3(0.95,0.97,1.0) * smoothstep(0.99935, 0.99965, md) * uMoon * 2.2;
  col += vec3(0.4,0.5,0.9) * pow(max(md,0.), 220.) * uMoon * 0.5;
  gl_FragColor = vec4(col, 1.0);
}`;

export class Atmosphere {
  constructor(renderer, scene) {
    this.renderer = renderer; this.scene = scene;
    this.value = 0.6; this.target = 0.6; this.state = sampleKeys(0.6);
    this.u = {
      uZen: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHor: { value: new THREE.Color() },
      uSunCol: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(-1, 0.1, 0) }, uMoonDir: { value: new THREE.Vector3(1, 0.6, 0) },
      uTime: { value: 0 }, uStars: { value: 0 }, uGlow: { value: 1 }, uCloud: { value: 0.45 }, uMoon: { value: 0 },
    };
    this.skyMat = new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: this.u, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), this.skyMat);
    this.sky.scale.setScalar(45000); this.sky.renderOrder = -10; this.sky.frustumCulled = false;
    scene.add(this.sky);

    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    const sc = this.sun.shadow.camera; sc.left = -320; sc.right = 320; sc.top = 320; sc.bottom = -320; sc.near = 10; sc.far = 1400;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.6; this.sun.shadow.radius = 2.5;
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); scene.add(this.hemi);
    scene.fog = new THREE.FogExp2(0x888899, 0.00007);

    this.pm = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    this.envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), this.skyMat); this.envSky.frustumCulled = false;
    this.envScene.add(this.envSky);
    this.envTarget = null; this.lastEnv = -1; this.envTimer = 0;
    this.focus = new THREE.Vector3();
    this.update(0, this.focus, true);
  }
  set(v, instant = false) { this.target = clamp(v, 0, 1); if (instant) this.value = this.target; }
  update(dt, focus, force = false) {
    if (focus) this.focus.copy(focus);
    const rate = 0.55;
    const dv = this.target - this.value;
    this.value += Math.abs(dv) < 1e-4 ? dv : dv * Math.min(1, dt * rate * 3);
    const s = this.state = sampleKeys(this.value);
    const u = this.u;
    u.uZen.value.copy(s.zen); u.uMid.value.copy(s.mid); u.uHor.value.copy(s.hor); u.uSunCol.value.copy(s.sun);
    u.uStars.value = s.stars; u.uGlow.value = s.glow; u.uCloud.value = s.cloud; u.uTime.value += dt;
    const el = s.el * Math.PI / 180, az = s.az * Math.PI / 180;
    const L = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    u.uSunDir.value.copy(L);
    const night = clamp((this.value - 0.55) / 0.35, 0, 1);
    // moon always east-ish & high; shows at night
    u.uMoonDir.value.set(0.7, 0.55, -0.25).normalize(); u.uMoon.value = night;
    // light follows (sun when up, moon at night)
    this.sun.color.copy(s.sun); this.sun.intensity = s.si * (this.value > 0.55 ? 1.0 : 1.0);
    const f = this.focus;
    this.sun.position.copy(f).addScaledVector(L.y < 0.03 ? L.clone().setY(0.03).normalize() : L, 700);
    this.sun.target.position.copy(f); this.sun.target.updateMatrixWorld();
    this.hemi.color.copy(s.hs); this.hemi.groundColor.copy(s.hg); this.hemi.intensity = s.hi;
    this.scene.fog.color.copy(s.fog).lerp(s.hor, 0.35); this.scene.fog.density = s.fd;
    this.renderer.toneMappingExposure = s.exp;
    this.sky.position.copy(this._camPos || f);
    // env map refresh (throttled)
    this.envTimer -= dt;
    if (force || (Math.abs(this.value - this.lastEnv) > 0.012 && this.envTimer <= 0)) {
      this.lastEnv = this.value; this.envTimer = 0.35;
      const t = this.pm.fromScene(this.envScene, 0.0, 0.1, 100);
      if (this.envTarget) this.envTarget.dispose();
      this.envTarget = t; this.scene.environment = t.texture;
      this.scene.environmentIntensity = 0.9;
    }
  }
  followCamera(p) { this._camPos = p; this.sky.position.copy(p); }
}
