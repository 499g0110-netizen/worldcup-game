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
        vec3 shopRoom(vec2 p, vec3 d, float u0, float u1, float id, float night) {
          const float H = 3.0, D = 5.0;
          vec3 o = vec3(p, 0.0);
          float tx = ((d.x > 0.0 ? u1 : u0) - o.x) / d.x, ty = ((d.y > 0.0 ? H : 0.0) - o.y) / d.y, tz = D / max(d.z, 1e-4);
          float t = min(tx, min(ty, tz)); vec3 h = o + d * t;
          float kind = hash12(vec2(id, 17.0));   // 0..1 → bakery, books, fashion, café
          vec3 wall = mix(vec3(0.86,0.8,0.7), vec3(0.75,0.82,0.8), step(0.5, hash12(vec2(id, 3.0))));
          vec3 col;
          if (t == ty && d.y < 0.0) {           // floor: wood planks or checker tiles
            float plank = step(0.5, hash12(vec2(id, 5.0)));
            float ck = mod(floor(h.x * 2.0) + floor(h.z * 2.0), 2.0);
            vec3 wood = mix(vec3(0.42,0.28,0.17), vec3(0.5,0.34,0.2), hash12(vec2(floor(h.x * 4.0), id)));
            col = mix(mix(vec3(0.78,0.76,0.72), vec3(0.25,0.24,0.24), ck), wood * (0.9 + 0.1 * step(0.03, fract(h.x * 4.0))), plank);
          } else if (t == ty) {                 // ceiling with a row of lamps
            float lamp = smoothstep(0.18, 0.05, length(vec2(fract(h.x * 0.8) - 0.5, (h.z - 2.0) * 0.4)));
            col = vec3(0.92,0.9,0.86) * 0.8 + vec3(1.0,0.9,0.7) * lamp * 2.5;
          } else if (t == tz) {                 // back wall: shelves full of goods
            float shelfY = fract(h.y / 0.55), shelfRow = floor(h.y / 0.55);
            float onShelf = step(0.6, h.y) * step(h.y, 2.4);
            vec2 cell = vec2(floor(h.x / (0.12 + 0.18 * kind)), shelfRow);
            vec3 goods = vec3(hash12(cell + id), hash12(cell + id + 7.0), hash12(cell + id + 13.0));
            goods = mix(goods, vec3(0.75,0.55,0.3), step(kind, 0.25) * 0.7);   // bakery: bread tones
            float item = step(0.12, shelfY) * step(shelfY, 0.85) * step(0.15, fract(h.x / (0.12 + 0.18 * kind)));
            col = mix(wall, mix(vec3(0.35,0.25,0.18), goods, item), onShelf);
            col = mix(col, vec3(0.3,0.22,0.15), onShelf * step(shelfY, 0.08));
          } else {                              // side walls: framed pictures / racks
            float art = step(1.2, h.y) * step(h.y, 2.1) * step(0.2, fract(h.z * 0.4)) * step(fract(h.z * 0.4), 0.7);
            col = mix(wall * 0.85, vec3(0.2,0.3,0.4) + 0.4 * hash12(vec2(floor(h.z * 0.4), id)), art * 0.8);
          }
          // counter + clothes rail / display table in the middle of the room
          float tc = (1.0 - o.y) / d.y; vec3 hc = o + d * tc;
          if (d.y < 0.0 && tc > 0.0 && tc < t && hc.z > 2.2 && hc.z < 2.9 && hc.x > mix(u0, u1, 0.2) && hc.x < mix(u0, u1, 0.75)) col = mix(vec3(0.55,0.4,0.28), vec3(0.85,0.85,0.82), step(0.5, kind));
          // light falloff toward the back, warm interior light, a little brighter at night
          float fall = mix(1.0, 0.55, clamp(t / 6.0, 0.0, 1.0));
          return col * fall * (0.55 + 0.5 * night);
        }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float shop = step(vWall.x, -0.0001); float bayF = vM.x * abs(vWall.x); float bu = fract(bayF); float bayI = floor(bayF);
        float st = vM.y / 3.2; float fv = fract(st); float fl = floor(st);
        float style = vWall.y; float paintedOnly = step(1.5, style); style -= paintedOnly * 2.0;   // dormers: +2
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
        vec3 interior = vec3(0.0);
        if (glassArea > 0.5) {
          vec3 N = normalize(vWN); vec3 V = normalize(vWPos - cameraPosition);
          if (dot(V, N) > 0.0) N = -N;                  // double-sided walls: always look into the building
          vec3 T = normalize(cross(N, vec3(0.0, 1.0, 0.0)));
          float sgn = sign(dot(T, normalize(dFdx(vWPos))) * dFdx(vM.x) + dot(T, normalize(dFdy(vWPos))) * dFdy(vM.x) + 1e-6);   // match T to the direction u increases
          T *= sgn;
          vec3 d = normalize(vec3(dot(V, T), V.y, -dot(V, N)));
          float bw = 1.0 / abs(vWall.x);
          float u0 = (bayI + 0.08) * bw, u1 = (bayI + 0.92) * bw;
          interior = shopRoom(vec2(vM.x, vM.y - fl * 3.2), d, u0, u1, bayI + floor(vM.x * 0.01) * 31.0 + floor(vWPos.x) * 0.0, uNight);
          // glass: tinted, with a fresnel reflection of the sky
          float fres = pow(1.0 - clamp(dot(-V, N), 0.0, 1.0), 4.0);
          vec3 refl = mix(vec3(0.24,0.25,0.27), vec3(0.42,0.5,0.6), clamp(V.y * -3.0 + 0.3, 0.0, 1.0));   // street & facades opposite, sky only when looking up
          interior = mix(interior, refl, 0.08 + fres * 0.38);
        }
        vec3 frameCol = vec3(0.14,0.13,0.12);
        diffuseColor.rgb = mix(diffuseColor.rgb, frameCol, max(disp, shopDoor * step(0.3, bu) * step(bu, 0.7) * step(fv, 0.8)));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02), glassArea * (1.0 - mull));
        vec3 signCol = vec3(0.12 + 0.5 * hash12(vec2(floor(vM.x * 0.13), 7.0)), 0.1 + 0.3 * hash12(vec2(floor(vM.x * 0.13), 9.0)), 0.1 + 0.25 * hash12(vec2(floor(vM.x * 0.13), 11.0)));
        diffuseColor.rgb = mix(diffuseColor.rgb, signCol, fascia);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.62, vous);
        // rain streaks running down from each window sill, and a darker weathered band under the eaves
        float under = step(0.33, bu) * step(bu, 0.67) * (1.0 - step(0.27, fv)) * vWall.y * step(0.5, style);
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
  M.roof_flat = pbr('asphalt_02', 4.0, { color: 0x6a6866 });
  M.cobble = pbr('cobblestone_floor_08', 2.0, { normalStrength: 1.4 });
  M.asphalt = pbr('asphalt_02', 4.0);
  M.pave = pbr('pavement_03', 2.0);
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
