// PBR materials from Poly Haven CC0 sets (assets/tex, see assets/tex/LICENSES.json).
import * as THREE from 'three';

const loader = new THREE.TextureLoader();
let maxAniso = 8, TEX_DIR = 'assets/tex';
export function setAniso(a) { maxAniso = a; }
const cache = new Map();
function tex(name, srgb, repeat) {
  const key = name + repeat;
  if (cache.has(key)) return cache.get(key);
  const t = loader.load(`${TEX_DIR}/${name}.jpg`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.repeat.set(repeat, repeat);
  cache.set(key, t); return t;
}
// tile = real-world size in metres that one texture repeat covers (UVs are in metres)
export function pbr(id, tile, optsIn = {}) {
  const { normalStrength = 1, ...opts } = optsIn;
  const r = 1 / tile, hasAO = ['red_brick_03', 'cobblestone_floor_08', 'granite_tile', 'rock_04', 'rock_04_grey'].includes(id);
  const m = new THREE.MeshStandardMaterial({
    map: tex(id + '_diff', true, r), normalMap: tex(id + '_nor', false, r), roughnessMap: tex(id + '_rough', false, r),
    aoMap: hasAO ? tex(id + '_ao', false, r) : null, aoMapIntensity: 0.9, roughness: 1, metalness: 0, ...opts,
  });
  m.normalScale.set(normalStrength, normalStrength); // Poly Haven nor_gl = OpenGL convention, same as three.js
  if (m.aoMap) m.aoMap.channel = 0;
  return m;
}

/* Facade shader: windows painted procedurally from metre UVs at distance, cut out near the
 * camera where real 3D window units are instanced (see windows.js). Same bay grid on both. */
export const facadeUniforms = { uCut: { value: 130 }, uNight: { value: 0 } };
export function makeFacade(base) {
  base.vertexColors = true;
  base.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, facadeUniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aWall; varying vec4 vWall; varying vec2 vM; varying float vDist; varying vec3 vWPos; varying vec3 vWN;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvWall = aWall; vM = uv;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz; vDist = distance(vWPos, cameraPosition); vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uCut; uniform float uNight; varying vec4 vWall; varying vec2 vM; varying float vDist; varying vec3 vWPos; varying vec3 vWN;
        float hash12(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float vn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash12(i), hash12(i+vec2(1,0)), f.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), f.x), f.y); }
        // ---- interior mapping: a real-looking shop room behind the glass, ray-traced per pixel (box room, no textures)
        // p = (u along wall, v height, 0) metres; d = view ray in (along, up, into the wall); room spans [u0,u1] x [0,H] x [0,D]
        // kinds: 0 bakery · 1 clothing · 2 books · 3 café · 4 florist · 5 department store · 6 drugstore
        float shopKind(float id) { return floor(hash12(vec2(id, 17.0)) * 7.0); }
        // goods on a wall: a = horizontal coordinate along the wall, y = height
        vec3 wallGoods(float kind, float a, float y, float id, vec3 wall, out float hit) {
          hit = 0.0; vec3 c = wall;
          if (kind < 0.5) {               // bakery: baskets of bread on wooden shelves
            float row = floor(y / 0.45), fy = fract(y / 0.45), on = step(0.5, y) * step(y, 2.1);
            float loaf = step(0.15, fy) * step(fy, 0.6) * step(0.2, fract(a / 0.28)) * step(fract(a / 0.28), 0.85);
            vec3 bread = mix(vec3(0.72,0.48,0.24), vec3(0.55,0.33,0.15), hash12(vec2(floor(a / 0.28), row + id)));
            c = mix(c, mix(vec3(0.42,0.3,0.2), bread, loaf), on); hit = on;
          } else if (kind < 1.5) {        // clothing: garments hanging from a rail
            float on = step(0.75, y) * step(y, 1.85);
            float gi = floor(a / 0.1), g = step(0.12, fract(a / 0.1));
            float len = 0.75 + 0.35 * hash12(vec2(gi, id));
            float garment = g * step(1.85 - len, y);
            float pal = hash12(vec2(gi, id + 3.0));
            vec3 col = pal < 0.3 ? vec3(0.12,0.14,0.2) : pal < 0.5 ? vec3(0.85,0.83,0.78) : pal < 0.65 ? vec3(0.55,0.15,0.13) : pal < 0.8 ? vec3(0.3,0.38,0.3) : vec3(0.7,0.6,0.45);
            c = mix(c, col, on * garment); hit = on * garment;
            c = mix(c, vec3(0.6), step(1.86, y) * step(y, 1.9));   // the rail
          } else if (kind < 2.5) {        // books: dense shelving floor to ceiling
            float row = floor(y / 0.38), fy = fract(y / 0.38), on = step(0.1, y) * step(y, 2.6);
            float bi = floor(a / 0.04), book = step(0.1, fy) * step(fy, 0.82 - 0.2 * hash12(vec2(bi, row)));
            vec3 col = mix(vec3(0.2,0.18,0.16), vec3(hash12(vec2(bi, row + id)), hash12(vec2(bi + 3.0, row)), hash12(vec2(bi, row + 9.0))) * 0.6 + 0.15, step(0.15, fract(a / 0.04)));
            c = mix(c, mix(vec3(0.35,0.24,0.16), col, book), on); hit = on;
          } else if (kind < 3.5) {        // café: chalkboard menu, cups on a shelf, warm wood panelling
            c = mix(vec3(0.38,0.26,0.17), wall, step(1.1, y));
            float board = step(1.3, y) * step(y, 2.2) * step(0.3, fract(a / 3.0)) * step(fract(a / 3.0), 0.75);
            c = mix(c, vec3(0.12,0.16,0.13), board);
            float chalk = board * step(0.6, hash12(floor(vec2(a * 30.0, y * 25.0))));
            c = mix(c, vec3(0.75), chalk * step(0.7, hash12(vec2(floor(y * 12.0), id))));
            float cups = step(1.05, y) * step(y, 1.15) * step(0.6, fract(a / 0.12));
            c = mix(c, vec3(0.92), cups); hit = 0.5;
          } else if (kind < 4.5) {        // florist: tiers of buckets with flowers
            float tier = floor(y / 0.35), fy = fract(y / 0.35), on = step(0.1, y) * step(y, 1.5);
            vec2 cell = vec2(floor(a / 0.09), floor(y / 0.06));
            float bloom = step(0.45, hash12(cell + id));
            vec3 fl = hash12(cell + 2.0) < 0.33 ? vec3(0.85,0.25,0.35) : hash12(cell + 5.0) < 0.5 ? vec3(0.95,0.8,0.25) : vec3(0.9,0.88,0.85);
            vec3 col = mix(vec3(0.18,0.35,0.15), fl, bloom);
            c = mix(c, col, on * step(0.15, fy)); hit = on;
          } else if (kind < 5.5) {        // department store: white walls, bright displays, a glowing escalator band
            c = vec3(0.92,0.92,0.9);
            float shelf = step(0.4, y) * step(y, 2.0) * step(0.2, fract(a / 1.6)) * step(fract(a / 1.6), 0.8);
            float box = step(0.15, fract(y / 0.33)) * step(0.1, fract(a / 0.25));
            c = mix(c, mix(vec3(0.85), vec3(hash12(floor(vec2(a / 0.25, y / 0.33)) + id), 0.6, 0.7) * 0.7 + 0.2, box), shelf);
            float esc = step(abs(y - 0.6 - fract(a * 0.1) * 2.2), 0.08);
            c = mix(c, vec3(1.0,0.95,0.85) * 1.5, esc * 0.6); hit = shelf;
          } else {                        // drugstore (Drogeriemarkt): white gondolas packed with colourful bottles and boxes, mustard accent wall
            float row = floor(y / 0.3), fy = fract(y / 0.3), on = step(0.25, y) * step(y, 2.05);
            float cw = 0.09 + 0.08 * hash12(vec2(row, id)), ca = floor(a / cw), fa = fract(a / cw);
            float tall = 0.35 + 0.5 * hash12(vec2(ca, row + id * 3.0));
            float item = step(0.08, fy) * step(fy, 0.08 + 0.8 * tall) * step(0.1, fa) * step(fa, 0.9);
            vec3 col = 0.5 + 0.45 * cos(6.2832 * (hash12(vec2(ca * 1.7, row + id)) + vec3(0.0, 0.33, 0.67)));
            col = mix(col, vec3(0.97), step(0.7, hash12(vec2(ca, row * 5.0 + id))));
            vec3 shelf = mix(vec3(0.96), vec3(0.88), step(fy, 0.06));
            c = mix(y > 2.3 ? vec3(0.93, 0.68, 0.26) : vec3(0.97), mix(shelf, col, item), on); hit = on;
          }
          return c;
        }
        vec3 shopRoom(vec2 p, vec3 d, float u0, float u1, float id, float night, float kind) {
          const float H = 3.0, D = 6.0;
          vec3 o = vec3(p, 0.0);
          float tx = ((d.x > 0.0 ? u1 : u0) - o.x) / d.x, ty = ((d.y > 0.0 ? H : 0.0) - o.y) / d.y, tz = D / max(d.z, 1e-4);
          float t = min(tx, min(ty, tz)); vec3 h = o + d * t;
          float hitG;
          vec3 wall = kind > 4.5 ? vec3(0.93) : mix(vec3(0.86,0.8,0.7), vec3(0.75,0.82,0.8), step(0.5, hash12(vec2(id, 3.0))));
          vec3 col;
          if (t == ty && d.y < 0.0) {           // floor
            float ck = mod(floor(h.x * 2.0) + floor(h.z * 2.0), 2.0);
            vec3 wood = mix(vec3(0.42,0.28,0.17), vec3(0.5,0.34,0.2), hash12(vec2(floor(h.x * 4.0), id))) * (0.9 + 0.1 * step(0.03, fract(h.x * 4.0)));
            col = kind > 4.5 ? vec3(0.82,0.8,0.78) : (kind < 0.5 || kind > 2.5 && kind < 3.5) ? mix(vec3(0.82,0.8,0.75), vec3(0.22,0.21,0.2), ck) : wood;
          } else if (t == ty) {                 // ceiling with lamps
            float lamp = smoothstep(0.18, 0.05, length(vec2(fract(h.x * 0.8) - 0.5, (fract(h.z * 0.35) - 0.5) * 0.6)));
            col = vec3(0.92,0.9,0.86) * 0.8 + (kind > 2.5 && kind < 3.5 ? vec3(1.0,0.7,0.4) : vec3(1.0,0.95,0.85)) * lamp * 2.5;
          } else if (t == tz) col = wallGoods(kind, h.x, h.y, id, wall, hitG);
          else col = wallGoods(kind, h.z * 1.7, h.y, id + 11.0, wall * 0.85, hitG) * 0.9;
          // furniture in the middle of the room
          float tt = (0.9 - o.y) / d.y; vec3 hc = o + d * tt;
          float mid = (d.y < 0.0 && tt > 0.0 && tt < t) ? 1.0 : 0.0;
          if (mid > 0.5 && kind < 0.5 && hc.z > 1.2 && hc.z < 1.9 && hc.x > u0 + 0.4 && hc.x < u1 - 0.4) col = mix(vec3(0.85,0.82,0.75), vec3(0.7,0.45,0.22), step(0.5, fract(hc.x * 3.0)) * step(0.3, fract(hc.z * 3.0)));   // bakery glass counter with cakes
          if (mid > 0.5 && kind > 2.5 && kind < 3.5) { vec2 cc = vec2(fract(hc.x / 1.4) - 0.5, fract(hc.z / 1.6) - 0.5); if (hc.z > 0.8 && length(cc) < 0.28) col = vec3(0.88,0.85,0.8); }   // café round tables
          if (mid > 0.5 && (kind > 0.5 && kind < 1.5 || kind > 4.5) && hc.z > 2.2 && hc.z < 3.0 && hc.x > mix(u0, u1, 0.25) && hc.x < mix(u0, u1, 0.75)) col = vec3(0.8,0.78,0.74);   // display table
          if (mid > 0.5 && kind > 3.5 && kind < 4.5 && hc.z < 1.4) { float b = step(0.5, hash12(floor(hc.xz * 8.0) + id)); col = mix(vec3(0.2,0.4,0.18), vec3(0.9,0.3,0.4), b); }   // florist buckets at the window
          float fall = mix(1.0, 0.55, clamp(t / 7.0, 0.0, 1.0));
          float warm = kind > 2.5 && kind < 3.5 ? 0.85 : kind > 4.5 ? 1.15 : 1.0;
          return col * fall * warm * (0.26 + 0.8 * night);
                }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float shop = step(vWall.x, -0.0001); float bayF = vM.x * abs(vWall.x); float bu = fract(bayF); float bayI = floor(bayF);
        float st = vM.y / 3.2; float fv = fract(st); float fl = floor(st);
        float wk = floor(vWall.y / 10.0); float style = vWall.y - wk * 10.0; float paintedOnly = step(1.5, style); style -= paintedOnly * 2.0;   // dormers: +2
        float isArch = step(1.1, style);
        // segmental arch head on brick windows: round the top 12 % of the opening
        float archY = 0.8 - 0.07 * isArch * (1.0 - pow((bu - 0.5) / 0.2, 2.0));
        float inWin = step(0.5, style) * step(0.3, bu) * step(bu, 0.7) * step(0.27, fv) * step(fv, archY) * step((fl + 0.8) * 3.2 + 0.35, vWall.z);   // vWall.z = roofline here (gable windows)
        // brick soldier course over the arch (darker voussoirs)
        float vous = isArch * step(0.3 - 0.03, bu) * step(bu, 0.7 + 0.03) * step(archY, fv) * step(fv, archY + 0.05);
        float isDoor = step(0.0, vWall.w) * (1.0 - step(0.5, abs(bayI - vWall.w))) * step(fl, 0.5) * step(0.3, bu) * step(bu, 0.7) * step(fv, 0.8);
        // shop front: ground floor bays become display windows under a painted fascia
        float gf = (1.0 - step(0.5, fl)) * shop * step(0.5, style) * (1.0 - isDoor);
        float disp = gf * step(0.07, bu) * step(bu, 0.93) * step(0.05, fv) * step(fv, 0.74);
        float fascia = gf * step(0.78, fv) * step(fv, 0.92);
        inWin *= 1.0 - gf;
        float shopDoor = isDoor * shop * step(0.5, style);
        float hole = max(inWin, isDoor * (1.0 - shopDoor));
        if (hole > 0.5 && vDist < uCut && paintedOnly < 0.5) discard;
        // far LOD: painted glass + white frame + sill
        float inner = step(0.33, bu) * step(bu, 0.67) * step(0.29, fv) * step(fv, 0.78);
        vec3 glass = mix(vec3(0.08,0.10,0.12), vec3(0.32,0.38,0.42), smoothstep(0.29,0.78,fv) * 0.6);
        float lit = step(0.62, hash12(vec2(bayI, fl) + vM.x * 0.0)) * uNight;
        glass = mix(glass, vec3(1.0,0.72,0.4) * 1.6, lit);
        vec3 winCol = mix(vec3(0.86,0.85,0.82), glass, inner);
        diffuseColor.rgb = mix(diffuseColor.rgb, winCol, inWin);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16,0.12,0.09), isDoor * (1.0 - shopDoor));
        // ---- shop windows & glass doors: see-through into an interior room
        float glassArea = max(disp * step(0.1, bu) * step(bu, 0.9) * step(0.08, fv) * step(fv, 0.71), shopDoor * step(0.34, bu) * step(bu, 0.66) * step(fv, 0.72));
        float mull = 1.0 - step(0.012, abs(bu - 0.5)) * (1.0 - shopDoor);
        vec3 interior = vec3(0.0); float night_ = uNight;
        if (glassArea > 0.5) {
          vec3 N = normalize(vWN); vec3 V = normalize(vWPos - cameraPosition);
          if (dot(V, N) > 0.0) N = -N;                  // double-sided walls: always look into the building
          // tangent = world direction in which u (metres along the wall) increases: cotangent frame from screen derivatives
          vec3 dp1 = dFdx(vWPos), dp2 = dFdy(vWPos); float du1 = dFdx(vM.x), du2 = dFdy(vM.x);
          vec3 Tg = cross(dp2, N) * du1 + cross(N, dp1) * du2; Tg.y = 0.0;
          vec3 T = length(Tg) > 1e-8 ? normalize(Tg) : normalize(cross(N, vec3(0.0, 1.0, 0.0)));
          vec3 d = normalize(vec3(dot(V, T), V.y, -dot(V, N)));
          float bw = 1.0 / abs(vWall.x);
          float shopI = floor(bayI / 3.0);   // one shop spans three window bays
          float u0 = shopI * 3.0 * bw + 0.1, u1 = (shopI * 3.0 + 3.0) * bw - 0.1;
          interior = shopRoom(vec2(vM.x, vM.y - fl * 3.2), d, u0, u1, shopI + floor(vWPos.x * 0.05) * 7.0 + floor(vWPos.z * 0.05) * 13.0, uNight, mod(shopI * 3.0 + wk - 1.0, 7.0));
          // glass: tinted, with a fresnel reflection of the sky
          float fres = pow(1.0 - clamp(dot(-V, N), 0.0, 1.0), 4.0);
          vec3 refl = mix(vec3(0.24,0.25,0.27), vec3(0.42,0.5,0.6), clamp(V.y * -3.0 + 0.3, 0.0, 1.0));   // street & facades opposite, sky only when looking up
          interior = mix(interior, refl * (0.35 + 0.25 * (1.0 - night_)), 0.1 + fres * 0.5);
        }
        vec3 frameCol = vec3(0.14,0.13,0.12);
        diffuseColor.rgb = mix(diffuseColor.rgb, frameCol, max(disp, shopDoor * step(0.3, bu) * step(bu, 0.7) * step(fv, 0.8)));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02), glassArea * (1.0 - mull));
        float sk = mod(floor(bayI / 3.0) * 3.0 + wk - 1.0, 7.0);
        vec3 signCol = sk < 0.5 ? vec3(0.55,0.35,0.15) : sk < 1.5 ? vec3(0.08,0.08,0.09) : sk < 2.5 ? vec3(0.12,0.22,0.18) : sk < 3.5 ? vec3(0.35,0.12,0.1) : sk < 4.5 ? vec3(0.2,0.35,0.2) : sk < 5.5 ? vec3(0.85,0.85,0.82) : vec3(0.96,0.96,0.95);
        diffuseColor.rgb = mix(diffuseColor.rgb, signCol, fascia);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.62, vous);
        // rain streaks running down from each window sill, and a darker weathered band under the eaves
        float under = step(0.33, bu) * step(bu, 0.67) * (1.0 - step(0.27, fv)) * min(vWall.y, 1.0) * step(0.5, style);
        float drip = hash12(vec2(floor(bu * 18.0), bayI)) * smoothstep(0.27, 0.0, fv);
        diffuseColor.rgb *= 1.0 - under * drip * 0.22;
        diffuseColor.rgb *= 1.0 - 0.1 * smoothstep(vWall.z - 1.2, vWall.z, vM.y) * step(0.5, vWall.y);
        // macro variation: large soft patches so the brick / plaster tiling never repeats visibly
        float macro = vn2(vec2(vM.x * 0.18, vM.y * 0.25) + vWPos.xz * 0.013) * 0.6 + vn2(vec2(vM.x, vM.y) * 0.9) * 0.4;
        diffuseColor.rgb *= 0.88 + macro * 0.22;
        // soot / moss near the ground and darker wall ends at corners
        float edgeU = min(fract(vM.x * abs(vWall.x) / max(1.0, floor(1.0 / max(abs(vWall.x), 0.01)))), 1.0);
        diffuseColor.rgb *= 1.0 - 0.12 * (1.0 - smoothstep(0.0, 1.4, vM.y)) * vn2(vec2(vM.x * 1.5, 3.0));
        // plinth and street grime
        float plinth = 1.0 - step(0.55, vM.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.38,0.37,0.36), plinth * (1.0 - hole));
        diffuseColor.rgb *= mix(0.78, 1.0, smoothstep(0.0, 2.2, vM.y));`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.12, inWin * inner);
        roughnessFactor = mix(roughnessFactor, 0.06, glassArea);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0,0.62,0.3) * 1.4 * lit * inWin * inner;
        totalEmissiveRadiance += interior * glassArea * (1.0 - mull) * 0.85;   // lit shop interiors`);
  };
  base.customProgramCacheKey = () => 'facade';
  return base;
}

export function makeMaterials(dir = 'assets/tex') {
  TEX_DIR = dir;
  const M = {};
  M.brick = makeFacade(pbr('red_brick_03', 1.6, { normalStrength: 1.2 }));
  M.plaster = makeFacade(pbr('plastered_wall_04', 2.5, { normalStrength: 0.8 }));
  // some OSM outlines are wound inconsistently; render facades from both sides so no wall goes missing
  M.brick.side = THREE.DoubleSide; M.plaster.side = THREE.DoubleSide;
  M.roof_tile = pbr('clay_roof_tiles_02', 1.8, { vertexColors: true });
  M.roof_slate = pbr('roof_slates_02', 2.0, { color: 0x8a8f96 });
  M.roof_copper = pbr('green_metal_rust', 3.0, { color: 0x9fd8c0, metalness: 0.35, roughness: 0.9 });
  M.roof_flat = pbr('asphalt_02', 4.0, { color: 0xd4d0c8 });   // pale gravel / membrane roofs, as in the aerial photos
  M.cobble = pbr('cobblestone_floor_08', 2.0, { normalStrength: 1.4, color: 0xe6d6bf });   // warm grey-beige granite setts like the Markt photos
  M.asphalt = pbr('asphalt_02', 4.0);
  M.pave = pbr('pavement_03', 2.0, { color: 0xeadccb });
  M.grass = pbr('leafy_grass', 3.0, { color: 0x9ccf7a });   // tinted toward the lush summer green of the aerial photo
  M.granite = pbr('granite_tile', 1.2, { normalStrength: 1.5 });
  M.rock = pbr('rock_04', 1.6, { normalStrength: 1.6 });
  M.granite_grey = pbr('rock_04_grey', 1.4, { normalStrength: 2.0 }); // desaturated derivative of Poly Haven rock_04 (CC0) for Lübeck's grey granite
  M.wood = pbr('dark_wooden_planks', 1.2);
  M.quay = pbr('granite_tile', 2.0, { color: 0xb9b2a8 });
  M.kerb = pbr('granite_tile', 0.9, { color: 0xc8c4bd });
  M.marking = new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });   // thermoplastic road paint
  for (const k of ['cobble', 'asphalt', 'pave']) { M[k].polygonOffset = true; M[k].polygonOffsetFactor = -1 - (k === 'asphalt' ? 2 : k === 'cobble' ? 1 : 0); M[k].polygonOffsetUnits = -1; }
  M.grass.polygonOffset = true; M.grass.polygonOffsetFactor = -0.5;
  M.water = new THREE.MeshPhysicalMaterial({ color: 0x1c3236, roughness: 0.04, metalness: 0, envMapIntensity: 1.0, ior: 1.33, normalScale: new THREE.Vector2(0.35, 0.35) });
  return M;
}
