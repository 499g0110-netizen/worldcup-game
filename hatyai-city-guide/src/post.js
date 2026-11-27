import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const GRADE = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.42 }, uGrain: { value: 0.035 }, uCA: { value: 0.0016 }, uNight: { value: 0.7 }, uRes: { value: new THREE.Vector2(1, 1) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `
  uniform sampler2D tDiffuse; uniform float uTime, uVig, uGrain, uCA, uNight; uniform vec2 uRes; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
  void main(){
    vec2 c = vUv-0.5; float r2 = dot(c,c);
    vec2 off = c * r2 * uCA * 6.0;
    vec3 col = vec3(texture2D(tDiffuse, vUv+off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv-off).b);
    // gentle S-curve + split-tone (teal shadows / warm highlights) – cinematic grade
    float l = dot(col, vec3(0.2126,0.7152,0.0722));
    col = mix(col, col*col*(3.0-2.0*col), 0.35);
    vec3 shadowTint = mix(vec3(0.94,1.0,1.04), vec3(0.96,0.92,1.08), uNight);
    vec3 hiTint = vec3(1.05,1.0,0.94);
    col *= mix(shadowTint, hiTint, smoothstep(0.1, 0.8, l));
    float sat = 1.08; col = mix(vec3(l), col, sat);
    float vig = smoothstep(0.85, 0.15, length(c*vec2(1.0, 0.9)));
    col *= mix(1.0, vig, uVig);
    float g = h(vUv*uRes + fract(uTime)*91.7) - 0.5;
    col += g * uGrain * (1.0 - l*0.6);
    gl_FragColor = vec4(col, 1.0);
  }`,
};

const CLAMP = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); if (any(isnan(c.rgb)) || any(isinf(c.rgb))) c.rgb = vec3(0.); c.rgb = min(c.rgb, vec3(40.0)); gl_FragColor = vec4(c.rgb, 1.0); }`,
};
const STYLE = {
  uniforms: { tDiffuse: { value: null }, uMode: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `
  uniform sampler2D tDiffuse; uniform float uMode; uniform vec2 uRes; uniform float uTime; varying vec2 vUv;
  float lum(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
  vec3 tx(vec2 o){ return texture2D(tDiffuse, vUv + o).rgb; }
  void main(){
    vec3 c0 = tx(vec2(0.));
    if (uMode < 0.5) { gl_FragColor = vec4(c0,1.); return; }
    vec2 px = 1.6/uRes;
    // pigment bleed: wobbly sampling offsets driven by low-freq noise
    vec2 wob = (vec2(vn(vUv*uRes/40.), vn(vUv*uRes/40.+7.)) - 0.5) * px * 3.0;
    vec3 b = tx(wob)*0.36 + (tx(wob+vec2(px.x,0.))+tx(wob-vec2(px.x,0.))+tx(wob+vec2(0.,px.y))+tx(wob-vec2(0.,px.y)))*0.16;
    float gx = lum(tx(vec2(px.x,0.))) - lum(tx(vec2(-px.x,0.))), gy = lum(tx(vec2(0.,px.y))) - lum(tx(vec2(0.,-px.y)));
    float edge = clamp(length(vec2(gx,gy))*3.2, 0., 1.);
    float paper = vn(vUv*uRes/3.0)*0.5 + vn(vUv*uRes/14.)*0.35 + vn(vUv*uRes/90.)*0.15;
    vec3 col;
    if (uMode < 1.5) {                           // watercolour
      vec3 q = floor(b*7.0+0.5)/7.0; col = mix(b, q, 0.35);
      col = mix(col, vec3(lum(col)), -0.12);
      col *= 1.0 - edge*0.45;                    // pigment pooling at edges
      col = mix(col, vec3(0.97,0.95,0.9), 0.07 + 0.08*(1.0-lum(col)));  // paper showing through
      col *= 0.9 + 0.16*paper;
    } else {                                     // paper-cut
      vec3 q = floor(b*4.0+0.5)/4.0; col = mix(b, q, 0.75);
      col = mix(vec3(lum(col)), col, 1.25);
      col *= 1.0 - smoothstep(0.12, 0.3, edge)*0.75;  // cut lines
      col *= 0.88 + 0.2*paper;
    }
    gl_FragColor = vec4(col, 1.0);
  }`,
};
export function createPost(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2()); const pr = renderer.getPixelRatio();
  const rt = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new ShaderPass(CLAMP));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.6, 0.85, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GRADE); composer.addPass(grade);
  const style = new ShaderPass(STYLE); composer.addPass(style);
  const setSize = (w, h) => { composer.setSize(w, h); bloom.setSize(w, h); grade.uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio()); style.uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio()); };
  setSize(size.x, size.y);
  return { composer, bloom, grade, style, setSize };
}
