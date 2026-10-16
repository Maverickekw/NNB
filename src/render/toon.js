// Cel-shading: MeshToonMaterial with a hard 3-step ramp, a hard-edged rim light
// injected into the fragment shader, and thick ink outlines drawn by OutlineEffect
// (inverted hull, works with skinned meshes).
import * as THREE from 'three';
import { OutlineEffect } from '../../vendor/three/examples/jsm/effects/OutlineEffect.js';

let ramp;
function toonRamp() {
  if (ramp) return ramp;
  // shadow / mid / lit
  const data = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  ramp = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  return ramp;
}

export const OUTLINE = { thickness: 0.006, color: [0.02, 0.02, 0.05], alpha: 1, visible: true };

export function createToonMaterial({ color = 0xffffff, map = null, rimColor = 0xffffff, rimStrength = 0.55,
                                     emissive = 0x000000, outline = OUTLINE } = {}) {
  const mat = new THREE.MeshToonMaterial({ color, map, gradientMap: toonRamp(), emissive });
  mat.userData.outlineParameters = { ...outline };
  mat.userData.rim = { color: new THREE.Color(rimColor), strength: rimStrength };
  mat.onBeforeCompile = shader => {
    shader.uniforms.rimColor = { value: mat.userData.rim.color };
    shader.uniforms.rimStrength = { value: mat.userData.rim.strength };
    mat.userData.shader = shader;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimColor;\nuniform float rimStrength;')
      .replace('#include <opaque_fragment>', `
        {
          float facing = saturate(dot(normal, normalize(vViewPosition)));
          float rim = step(0.62, pow(1.0 - facing, 2.0));
          outgoingLight += rimColor * rim * rimStrength;
        }
        #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'toon-rim';
  return mat;
}

// Replace every material on an imported model with the toon material, keeping
// its base color/texture so the artist's look survives.
export function toonify(root, { rimColor } = {}) {
  root.traverse(obj => {
    if (!obj.isMesh) return;
    const convert = m => {
      const t = createToonMaterial({ color: m.color ? m.color.clone() : 0xffffff, map: m.map || null, rimColor });
      if (m.map) t.map.colorSpace = THREE.SRGBColorSpace;
      t.transparent = m.transparent; t.alphaTest = m.alphaTest; t.side = m.side;
      return t;
    };
    obj.material = Array.isArray(obj.material) ? obj.material.map(convert) : convert(obj.material);
    obj.castShadow = true;
  });
}

export function createOutlineEffect(renderer) {
  return new OutlineEffect(renderer, {
    defaultThickness: OUTLINE.thickness,
    defaultColor: OUTLINE.color,
    defaultAlpha: 1,
  });
}

// For VFX / UI-in-world objects that must not get an ink outline.
export function noOutline(material) {
  material.userData.outlineParameters = { visible: false };
  return material;
}
