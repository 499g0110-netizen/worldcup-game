import * as THREE from 'three';
import facadesURL from './tex/facades.webp';
import arcadeURL from './tex/arcade.webp';
import templeURL from './tex/temple.webp';
import greenwayURL from './tex/greenway.webp';
import greenwayInURL from './tex/greenway_in.webp';
import foodURL from './tex/foodstation.webp';
import terminalURL from './tex/terminal.webp';
const loader = new THREE.TextureLoader();
const load = (u, o = {}) => { const t = loader.load(u); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (o.repeat) { t.wrapS = THREE.RepeatWrapping; t.repeat.set(o.repeat, 1); } return t; };
export const PHOTO = {
  facades: () => load(facadesURL), arcade: () => load(arcadeURL), temple: () => load(templeURL), greenway: () => load(greenwayURL),
  greenwayIn: () => load(greenwayInURL), food: () => load(foodURL), terminal: (rep) => load(terminalURL, { repeat: rep }),
};
