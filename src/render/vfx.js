// Skill / hit effects: additive, unlit, no outline. Pure effects geometry –
// no character art is created here.
import * as THREE from 'three';
import { noOutline } from './toon.js';

const additive = color => noOutline(new THREE.MeshBasicMaterial({
  color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
}));

const RING = new THREE.RingGeometry(0.8, 1, 48);
const SHARD = new THREE.PlaneGeometry(0.08, 0.5);
const ARC = new THREE.TorusGeometry(1, 0.06, 6, 32, Math.PI * 1.1);
const PILLAR = new THREE.CylinderGeometry(1, 1, 6, 32, 1, true);

export class VFX {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.items = [];
    this.shake = 0;
  }

  _add(mesh, life, tick) {
    this.scene.add(mesh);
    this.items.push({ mesh, life, age: 0, tick });
  }

  hitSpark(pos, color, big = false) {
    const s = big ? 1.6 : 1;
    const ring = new THREE.Mesh(RING, additive(color));
    ring.position.copy(pos);
    ring.lookAt(this.camera.position);
    this._add(ring, 0.25, (m, k) => { m.scale.setScalar((0.2 + k * 0.9) * s); m.material.opacity = 1 - k; });
    for (let i = 0; i < 7; i++) {
      const shard = new THREE.Mesh(SHARD, additive(i % 2 ? 0xffffff : color));
      shard.position.copy(pos);
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize();
      shard.lookAt(pos.clone().add(dir));
      shard.rotateX(Math.PI / 2);
      this._add(shard, 0.3, (m, k, dt) => { m.position.addScaledVector(dir, dt * 7 * s); m.material.opacity = 1 - k; });
    }
    this.shake = Math.max(this.shake, big ? 0.18 : 0.06);
  }

  slash(pos, color, flip) {
    const arc = new THREE.Mesh(ARC, additive(color));
    arc.position.copy(pos);
    arc.rotation.set(Math.PI / 2 * 0.3, 0, flip ? 2.4 : -0.6);
    this._add(arc, 0.2, (m, k) => { m.rotation.z += (flip ? -1 : 1) * 0.25; m.scale.setScalar(0.6 + k * 0.5); m.material.opacity = 1 - k; });
  }

  skillBurst(pos, color) {
    const ground = pos.clone(); ground.y = 0.05;
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(RING, additive(i === 1 ? 0xffffff : color));
      ring.position.copy(ground);
      ring.rotation.x = -Math.PI / 2;
      const delay = i * 0.08;
      this._add(ring, 0.6 + delay, (m, k, dt, age) => {
        const kk = Math.max(0, age - delay) / 0.6;
        m.scale.setScalar(0.1 + kk * 3.2);
        m.material.opacity = kk <= 0 ? 0 : 1 - kk;
      });
    }
    const pillar = new THREE.Mesh(PILLAR, additive(color));
    pillar.position.set(ground.x, 3, ground.z);
    this._add(pillar, 0.55, (m, k) => { m.scale.set(0.2 + k * 1.1, 1, 0.2 + k * 1.1); m.material.opacity = (1 - k) * 0.7; });
    this.hitSpark(pos, color, true);
    this.shake = 0.35;
  }

  telegraph(pos, duration) {
    const ring = new THREE.Mesh(RING, additive(0xff2040));
    ring.position.set(pos.x, 0.04, pos.z);
    ring.rotation.x = -Math.PI / 2;
    this._add(ring, duration, (m, k) => { m.scale.setScalar(1.2 - k * 0.6); m.material.opacity = 0.4 + 0.6 * Math.abs(Math.sin(k * 18)); });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.age += dt;
      const k = Math.min(1, it.age / it.life);
      it.tick(it.mesh, k, dt, it.age);
      if (k >= 1) {
        this.scene.remove(it.mesh);
        it.mesh.material.dispose();
        this.items.splice(i, 1);
      }
    }
    this.shake = Math.max(0, this.shake - dt * 1.2);
  }

  clear() {
    for (const it of this.items) { this.scene.remove(it.mesh); it.mesh.material.dispose(); }
    this.items.length = 0;
  }
}
