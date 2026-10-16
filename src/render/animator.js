// Character animation state machine.
//
//   base layer : idle <-> run          (setLocomotion)
//   one-shots  : attack(1..3) | skill | hit | defeat   (trigger)
//
// Priority decides interrupts: defeat > skill > hit > attack. A one-shot can only
// interrupt a state of lower-or-equal priority, except skill which has "super armor"
// (hit cannot interrupt it). defeat is terminal. When a one-shot ends the machine
// returns to the current locomotion state.
//
// ClipAnimator drives real motion-captured clips via AnimationMixer.
// ProceduralAnimator gives gray placeholders readable motion with the same API.
import * as THREE from 'three';

export const STATES = ['idle', 'run', 'attack', 'skill', 'hit', 'defeat'];
const PRIORITY = { idle: 0, run: 0, attack: 1, hit: 2, skill: 3, defeat: 4 };

class StateMachine {
  constructor() {
    this.state = 'idle';
    this.locomotion = 'idle';
    this.remaining = 0;
    this.combo = 0;
  }
  get busy() { return PRIORITY[this.state] > 0 && this.state !== 'defeat'; }
  get dead() { return this.state === 'defeat'; }

  setLocomotion(loco) {
    this.locomotion = loco;
    if (PRIORITY[this.state] === 0 && this.state !== loco) this._enter(loco);
  }

  // Returns the one-shot's duration in seconds, or 0 if the transition was refused.
  trigger(state, { combo = 0 } = {}) {
    if (this.dead) return 0;
    const cur = PRIORITY[this.state], next = PRIORITY[state];
    if (this.state === 'skill' && state === 'hit') { this._flash(); return 0; }
    if (next < cur) return 0;
    this.combo = combo;
    const d = this._enter(state);
    this.remaining = d;
    if (state === 'hit') this._flash();
    return d;
  }

  update(dt) {
    if (PRIORITY[this.state] > 0 && this.state !== 'defeat') {
      this.remaining -= dt;
      if (this.remaining <= 0) this._enter(this.locomotion);
    }
    this._tick(dt);
  }

  // subclass hooks
  _enter() { return 0; }
  _tick() {}
  _flash() {}
}

const PATTERNS = {
  idle: /idle|stand|breath/i,
  run: /run|sprint|jog|dash/i,
  attack: /attack|combo|punch|slash|kick|strike/i,
  skill: /skill|special|ult|super/i,
  hit: /hit|hurt|damage|react/i,
  defeat: /defeat|death|die|dead|knock.?out/i,
};

export function resolveClips(clips) {
  const out = {};
  for (const state of STATES) {
    const prefixed = clips.filter(c => c.name.toLowerCase().startsWith(state + '|'));
    const found = prefixed.length ? prefixed : clips.filter(c => PATTERNS[state].test(c.name));
    found.sort((a, b) => a.name.localeCompare(b.name));
    out[state] = state === 'attack' ? found.slice(0, 3) : found.slice(0, 1);
  }
  return out;
}

const ONE_SHOT_MAX = { attack: 0.5, hit: 0.45, skill: 1.1 };

export class ClipAnimator extends StateMachine {
  constructor(root, clips) {
    super();
    this.root = root;
    this.mixer = new THREE.AnimationMixer(root);
    const found = resolveClips(clips);
    this.actions = {};
    for (const s of STATES) this.actions[s] = found[s].map(c => this.mixer.clipAction(c));
    const fallback = this.actions.idle[0] || Object.values(this.actions).flat()[0];
    for (const s of STATES) {
      if (!this.actions[s].length) {
        console.warn(`[anim] ${root.name || 'character'} has no "${s}" clip; falling back.`);
        if (fallback) this.actions[s] = [fallback];
      }
    }
    this.current = null;
    this.flashT = 0;
    this.materials = [];
    root.traverse(o => { if (o.isMesh) [].concat(o.material).forEach(m => m.emissive && this.materials.push(m)); });
    this._enter('idle');
  }

  _enter(state) {
    this.state = state;
    const list = this.actions[state];
    if (!list?.length) return 0.3;
    const action = list[Math.min(this.combo, list.length - 1)];
    const oneShot = PRIORITY[state] > 0;
    action.reset();
    action.setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = oneShot;
    const clipDur = action.getClip().duration || 0.3;
    // Speed up long mocap one-shots so taps stay responsive.
    const cap = ONE_SHOT_MAX[state];
    action.timeScale = cap && clipDur > cap ? clipDur / cap : 1;
    action.enabled = true;
    action.play();
    if (this.current && this.current !== action) this.current.crossFadeTo(action, 0.12, false);
    this.current = action;
    return clipDur / action.timeScale;
  }

  _flash() { this.flashT = 0.12; }

  _tick(dt) {
    this.mixer.update(dt);
    if (this.flashT > 0 || this._flashing) {
      this.flashT -= dt;
      this._flashing = this.flashT > 0;
      for (const m of this.materials) m.emissive.setScalar(this._flashing ? 0.8 : 0);
    }
  }
}

const DUR = { attack: 0.32, skill: 0.95, hit: 0.35, defeat: 0.8 };

export class ProceduralAnimator extends StateMachine {
  constructor(root) {
    super();
    this.rig = root.getObjectByName('rig') || root;
    this.body = root.userData.placeholderBody;
    this.t = 0;     // time in current state
    this.clock = 0; // free-running
    this.flashT = 0;
    this._enter('idle');
  }
  _enter(state) { this.state = state; this.t = 0; return DUR[state] || 0; }
  _flash() { this.flashT = 0.12; }

  _tick(dt) {
    this.t += dt; this.clock += dt;
    const r = this.rig, t = this.t, k = Math.min(1, t / (DUR[this.state] || 1));
    r.position.set(0, 0, 0); r.rotation.set(0, 0, 0); r.scale.set(1, 1, 1);
    switch (this.state) {
      case 'idle':
        r.scale.y = 1 + Math.sin(this.clock * 3) * 0.025;
        break;
      case 'run':
        r.rotation.x = 0.28;
        r.position.y = Math.abs(Math.sin(this.clock * 14)) * 0.12;
        break;
      case 'attack': {
        const lunge = Math.sin(k * Math.PI);
        r.position.z = lunge * 0.55;
        r.rotation.x = lunge * 0.35;
        r.rotation.y = (this.combo % 2 ? -1 : 1) * lunge * 0.6;
        if (this.combo === 2) r.position.y = lunge * 0.35;
        break;
      }
      case 'skill':
        r.position.y = Math.sin(k * Math.PI) * 0.9;
        r.rotation.y = k * Math.PI * 4;
        r.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.15);
        break;
      case 'hit':
        r.position.z = -Math.sin(k * Math.PI) * 0.35;
        r.rotation.x = -Math.sin(k * Math.PI) * 0.35;
        break;
      case 'defeat':
        r.rotation.x = -Math.min(1, t / 0.5) * Math.PI / 2;
        r.position.y = Math.max(-0.2, -t * 0.1) ;
        break;
    }
    if (this.body) {
      this.flashT -= dt;
      this.body.material.emissive.setScalar(this.flashT > 0 ? 0.9 : 0);
    }
  }
}

export const createAnimator = (root, clips, placeholder) =>
  placeholder || !clips.length ? new ProceduralAnimator(root) : new ClipAnimator(root, clips);
