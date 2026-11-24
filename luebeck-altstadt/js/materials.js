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
      .replace('#include <common>', '#include <common>\nattribute vec4 aWall; varying vec4 vWall; varying vec2 vM; varying float vDist;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvWall = aWall; vM = uv;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvDist = distance((modelMatrix * vec4(transformed,1.0)).xyz, cameraPosition);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uCut; uniform float uNight; varying vec4 vWall; varying vec2 vM; varying float vDist;
        float hash12(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float bayF = vM.x * vWall.x; float bu = fract(bayF); float bayI = floor(bayF);
        float st = vM.y / 3.2; float fv = fract(st); float fl = floor(st);
        float style = vWall.y; float paintedOnly = step(1.5, style); style -= paintedOnly * 2.0;   // dormers: +2
        float isArch = step(1.1, style);
        // segmental arch head on brick windows: round the top 12 % of the opening
        float archY = 0.8 - 0.07 * isArch * (1.0 - pow((bu - 0.5) / 0.2, 2.0));
        float inWin = step(0.5, style) * step(0.3, bu) * step(bu, 0.7) * step(0.27, fv) * step(fv, archY) * step(vM.y, vWall.z - 0.2);
        // brick soldier course over the arch (darker voussoirs)
        float vous = isArch * step(0.3 - 0.03, bu) * step(bu, 0.7 + 0.03) * step(archY, fv) * step(fv, archY + 0.05);
        float isDoor = step(0.0, vWall.w) * (1.0 - step(0.5, abs(bayI - vWall.w))) * step(fl, 0.5) * step(0.3, bu) * step(bu, 0.7) * step(fv, 0.8);
        float hole = max(inWin, isDoor);
        if (hole > 0.5 && vDist < uCut && paintedOnly < 0.5) discard;
        // far LOD: painted glass + white frame + sill
        float inner = step(0.33, bu) * step(bu, 0.67) * step(0.29, fv) * step(fv, 0.78);
        vec3 glass = mix(vec3(0.08,0.10,0.12), vec3(0.32,0.38,0.42), smoothstep(0.29,0.78,fv) * 0.6);
        float lit = step(0.62, hash12(vec2(bayI, fl) + vM.x * 0.0)) * uNight;
        glass = mix(glass, vec3(1.0,0.72,0.4) * 1.6, lit);
        vec3 winCol = mix(vec3(0.86,0.85,0.82), glass, inner);
        diffuseColor.rgb = mix(diffuseColor.rgb, winCol, inWin);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16,0.12,0.09), isDoor);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.62, vous);
        // rain streaks running down from each window sill, and a darker weathered band under the eaves
        float under = step(0.33, bu) * step(bu, 0.67) * (1.0 - step(0.27, fv)) * vWall.y * step(0.5, style);
        float drip = hash12(vec2(floor(bu * 18.0), bayI)) * smoothstep(0.27, 0.0, fv);
        diffuseColor.rgb *= 1.0 - under * drip * 0.22;
        diffuseColor.rgb *= 1.0 - 0.1 * smoothstep(vWall.z - 1.2, vWall.z, vM.y) * step(0.5, vWall.y);
        // plinth and street grime
        float plinth = 1.0 - step(0.55, vM.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.38,0.37,0.36), plinth * (1.0 - hole));
        diffuseColor.rgb *= mix(0.78, 1.0, smoothstep(0.0, 2.2, vM.y));`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.12, inWin * inner);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0,0.62,0.3) * 1.4 * lit * inWin * inner;`);
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
