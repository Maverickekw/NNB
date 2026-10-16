// Renderer, camera, lights and the arena set. One instance for the whole app.
import * as THREE from 'three';
import { createOutlineEffect, noOutline, createToonMaterial } from './toon.js';

export class Stage {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.outline = createOutlineEffect(this.renderer);

    this.scene = new THREE.Scene();
    this.scene.background = backdrop();
    this.scene.fog = new THREE.Fog(0x1a0d2e, 16, 34);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.lookAt = new THREE.Vector3(0, 1.0, 0);

    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-4, 9, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 6, bottom: -6 });
    this.scene.add(key);
    this.scene.add(new THREE.HemisphereLight(0xb9a6ff, 0x301030, 1.1));
    const fill = new THREE.DirectionalLight(0xff3d8b, 0.9); // magenta back light for the urban night look
    fill.position.set(6, 4, -6);
    this.scene.add(fill);

    this.scene.add(arena());
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // Portrait phones get a wider lens so the camera doesn't have to back off as far.
    this.camera.fov = aspect < 1 ? 58 : 38;
    // Keep the whole fight (about ±halfWidth units) in frame.
    const halfWidth = aspect < 1 ? 6.0 : 6.4;
    const halfV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.baseDist = Math.max(11, halfWidth / (halfV * aspect));
    this.scene.fog.near = this.baseDist + 4;
    this.scene.fog.far = this.baseDist + 24;
    this.camera.far = this.baseDist + 60;
    this.camera.updateProjectionMatrix();
    this.placeCamera(0);
  }

  placeCamera(shake) {
    const d = this.baseDist;
    this.camera.position.set(
      (Math.random() - 0.5) * shake,
      3.2 + d * 0.05 + (Math.random() - 0.5) * shake,
      d);
    this.camera.lookAt(this.lookAt);
  }

  render() { this.outline.render(this.scene, this.camera); }
}

function backdrop() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#0b0620');
  grad.addColorStop(0.55, '#3a0f4a');
  grad.addColorStop(0.75, '#ff2d6f');
  grad.addColorStop(1, '#1a0d2e');
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function arena() {
  const group = new THREE.Group();
  // Asphalt with painted crosswalk stripes.
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#26232f'; g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#f5e663';
  for (let i = 0; i < 6; i++) g.fillRect(40 + i * 76, 200, 40, 112);
  g.fillStyle = '#ff2d6f'; g.fillRect(0, 60, 512, 8); g.fillRect(0, 444, 512, 8);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 14), createToonMaterial({ map: tex, rimStrength: 0, outline: { visible: false } }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Street surface beyond the painted area, so wide/portrait framings never see past it.
  const street = new THREE.Mesh(new THREE.PlaneGeometry(200, 200),
    createToonMaterial({ color: 0x1d1a26, rimStrength: 0, outline: { visible: false } }));
  street.rotation.x = -Math.PI / 2;
  street.position.y = -0.01;
  street.receiveShadow = true;
  group.add(street);

  // Skyline silhouettes with lit windows.
  const win = noOutline(new THREE.MeshBasicMaterial({ color: 0xffd34d }));
  const dark = noOutline(new THREE.MeshBasicMaterial({ color: 0x120a22 }));
  for (let i = 0; i < 14; i++) {
    const w = 1.5 + Math.random() * 2, h = 4 + Math.random() * 9;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.5), dark);
    b.position.set(-16 + i * 2.5, h / 2, -12 - Math.random() * 4);
    group.add(b);
    for (let j = 0; j < 5; j++) {
      const wnd = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.35), win);
      wnd.position.set(b.position.x + (Math.random() - 0.5) * (w - 0.4), 1 + Math.random() * (h - 1.5), b.position.z + 0.76);
      group.add(wnd);
    }
  }
  return group;
}
