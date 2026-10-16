// Loads character models + animation clips ONLY from /Assets, as listed in
// Assets/manifest.json. Anything missing becomes a clearly labeled gray placeholder.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from '../../vendor/three/examples/jsm/utils/SkeletonUtils.js';
import { createToonMaterial, toonify, noOutline } from './toon.js';

const ASSET_ROOT = 'Assets/';
const TARGET_HEIGHT = 1.8;

let manifest = { characters: {}, sharedAnimations: {} };
const gltfCache = new Map();
const loader = new GLTFLoader();

export async function loadManifest() {
  try {
    const res = await fetch(ASSET_ROOT + 'manifest.json', { cache: 'no-cache' });
    if (res.ok) manifest = { characters: {}, sharedAnimations: {}, ...(await res.json()) };
  } catch (e) {
    console.warn('[assets] No Assets/manifest.json – every character will be a placeholder.', e);
  }
  return manifest;
}

export const hasModel = id => !!manifest.characters?.[id]?.model;
export const portraitUrl = id => manifest.characters?.[id]?.portrait ? ASSET_ROOT + manifest.characters[id].portrait : null;

function loadGltf(path) {
  if (!gltfCache.has(path)) gltfCache.set(path, loader.loadAsync(ASSET_ROOT + path));
  return gltfCache.get(path);
}

async function clipsFor(id, entry, gltf) {
  const clips = [...gltf.animations];
  const extra = { ...manifest.sharedAnimations, ...(entry.animations || {}) };
  for (const [state, path] of Object.entries(extra)) {
    try {
      const anim = await loadGltf(path);
      for (const c of anim.animations) {
        const clip = c.clone();
        // Prefix with the state key so the animator can find it by name.
        clip.name = `${state}|${c.name}`;
        clips.push(clip);
      }
    } catch (e) {
      console.warn(`[assets] Could not load animation "${path}" for ${id}`, e);
    }
  }
  return clips;
}

// Returns { root, clips, placeholder, height }. `root` faces local +Z.
export async function createCharacter(def) {
  const entry = manifest.characters?.[def.id];
  if (entry?.model) {
    try {
      const gltf = await loadGltf(entry.model);
      const model = SkeletonUtils.clone(gltf.scene);
      toonify(model, { rimColor: elementRim(def.element) });
      // Skinned bounds depend on posed bone matrices, which only exist after an update.
      model.updateMatrixWorld(true);
      model.traverse(o => { if (o.isSkinnedMesh) o.skeleton.update(); });
      const box = new THREE.Box3().setFromObject(model);
      const h = Math.max(0.001, box.max.y - box.min.y);
      const s = (TARGET_HEIGHT / h) * (entry.scale ?? 1);
      model.scale.setScalar(s);
      model.position.y = -box.min.y * s;
      if (entry.rotateY) model.rotation.y = entry.rotateY;
      const root = new THREE.Group();
      root.add(model);
      return { root, clips: await clipsFor(def.id, entry, gltf), placeholder: false, height: TARGET_HEIGHT * (entry.scale ?? 1) };
    } catch (e) {
      console.warn(`[assets] Failed to load model for ${def.id}; using placeholder.`, e);
    }
  }
  return { root: createPlaceholder(def), clips: [], placeholder: true, height: TARGET_HEIGHT };
}

const elementRim = el => ({ blaze: 0xff6a50, tide: 0x5ab8ff, gale: 0x6dffa8 }[el] || 0xffffff);

// Gray stand-in. NOT final art – it is labeled "PLACEHOLDER" in-world.
function createPlaceholder(def) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  rig.name = 'rig';
  root.add(rig);

  const gray = createToonMaterial({ color: 0x8a8a8a, rimColor: elementRim(def.element), rimStrength: 0.4 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 1.0, 6, 16), gray);
  body.position.y = 0.88;
  body.castShadow = true;
  rig.add(body);
  // Facing marker so you can read direction on the stand-in.
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.12), createToonMaterial({ color: 0x5a5a5a }));
  nose.position.set(0, 1.45, 0.38);
  rig.add(nose);

  const label = makeLabel(['PLACEHOLDER', def.name]);
  label.position.y = 2.25;
  root.add(label);
  root.userData.placeholderBody = body;
  return root;
}

function makeLabel(lines) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(40,40,40,0.85)';
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#bbb'; g.lineWidth = 4; g.strokeRect(2, 2, 508, 124);
  g.fillStyle = '#ddd'; g.textAlign = 'center';
  g.font = 'bold 40px sans-serif'; g.fillText(lines[0], 256, 52);
  g.font = '32px sans-serif'; g.fillText(lines[1], 256, 100);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(noOutline(new THREE.SpriteMaterial({ map: tex, depthWrite: false })));
  sprite.scale.set(1.6, 0.4, 1);
  sprite.name = 'placeholderLabel';
  return sprite;
}
