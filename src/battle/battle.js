// Real-time squad battle.
//
// The active fighter stands at the front; the two benched fighters wait behind
// and keep charging their skill cooldowns. TAP = basic attack (3-hit combo),
// SWIPE = skill (when its cooldown is ready), squad card = switch fighter.
// Enemies telegraph their attacks with a red ring; switching the targeted fighter
// out before the hit lands evades it.
import * as THREE from 'three';
import { createCharacter } from '../render/assets.js';
import { createAnimator } from '../render/animator.js';
import { elementMultiplier, ELEMENTS } from '../data/elements.js';

const PLAYER_SLOTS = [new THREE.Vector3(-2.0, 0, 0.4), new THREE.Vector3(-4.4, 0, -1.4), new THREE.Vector3(-4.9, 0, 1.7)];
const ENEMY_SLOTS = [new THREE.Vector3(2.4, 0, 0.4), new THREE.Vector3(3.9, 0, -1.5), new THREE.Vector3(4.3, 0, 1.8)];
const FACE_RIGHT = Math.PI / 2, FACE_LEFT = -Math.PI / 2;
const RUN_SPEED = 10;
const COMBO_WINDOW = 0.9;      // seconds after an attack in which the next tap continues the chain
const RETURN_DELAY = 1.6;      // idle time before the active fighter jogs back to their spot
const SWITCH_COOLDOWN = 1.5;
const TELEGRAPH = 0.75;
const COMBO_POWER = [1.0, 1.1, 1.5];
const CUTIN_REAL_SECONDS = 1.3;

export class Battle {
  constructor(stage, vfx, { squad, enemies, ...opts }) {
    this.stage = stage;
    this.vfx = vfx;
    this.squadDefs = squad;
    this.enemySpecs = enemies;
    this.opts = {
      enemyAggro: true,        // enemies attack on their own
      enemyAtkMult: 1,
      unlosable: false,        // player fighters never drop below 1 HP
      enemyInvulnerable: false,// enemies never drop below 1 HP
      skillLocked: false,
      switchLocked: false,
      cooldownScale: 1,        // multiplies skill cooldowns (tutorial shortens them)
      ...opts,
    };
    this.listeners = {};
    this.timers = [];          // battle-time timers (slowed during cut-ins)
    this.realTimers = [];      // wall-clock timers
    this.timeScale = 1;
    this.squad = [];
    this.enemies = [];
    this.activeIdx = 0;
    this.targetIdx = 0;
    this.switchCd = 0;
    this.combo = { count: 0, timer: 0 };
    this.chainStep = -1;
    this.sinceAttack = 99;
    this.bufferedTap = false;
    this.casting = false;
    this.over = false;
    this.raycaster = new THREE.Raycaster();
  }

  on(type, fn) { (this.listeners[type] ||= []).push(fn); return this; }
  off(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter(f => f !== fn); }
  emit(type, data) { for (const fn of [...(this.listeners[type] || [])]) fn(data); }

  async load() {
    this.squad = await Promise.all(this.squadDefs.map((def, i) => this._makeActor(def, 'player', i)));
    await this.spawnEnemies(this.enemySpecs);
    this.emit('ready');
  }

  async _makeActor(def, side, slot, mults = {}) {
    const { root, clips, placeholder, height } = await createCharacter(def);
    root.name = def.id;
    const pos = (side === 'player' ? PLAYER_SLOTS : ENEMY_SLOTS)[slot].clone();
    root.position.copy(pos);
    root.rotation.y = side === 'player' ? FACE_RIGHT : FACE_LEFT;
    this.stage.scene.add(root);
    const maxHp = Math.round(def.hp * (mults.hpMult ?? 1));
    return {
      def, side, slot, root, height, placeholder,
      anim: createAnimator(root, clips, placeholder),
      hp: maxHp, maxHp,
      atk: def.atk * (mults.atkMult ?? 1),
      alive: true,
      cd: def.skill ? def.skill.cooldown * 0.5 * this.opts.cooldownScale : 0, // start half-charged
      move: null,
      attackTimer: def.attackEvery ? rand(...def.attackEvery) + slot * 0.8 : 0,
    };
  }

  // Replace the enemy wave. specs: [{ def, hpMult?, atkMult? }]
  async spawnEnemies(specs) {
    for (const e of this.enemies) this.stage.scene.remove(e.root);
    this.enemies = await Promise.all(specs.map((s, i) => this._makeActor(s.def, 'enemy', i, s)));
    this.targetIdx = 0;
    this.over = false;
    this.emit('wave', this.enemies);
  }

  get active() { return this.squad[this.activeIdx]; }
  get target() {
    if (!this.enemies[this.targetIdx]?.alive) this.targetIdx = this.enemies.findIndex(e => e.alive);
    return this.enemies[this.targetIdx];
  }

  // ---------------- input ----------------
  tap(ndc) {
    if (this.over) return;
    if (ndc) {
      this.raycaster.setFromCamera(ndc, this.stage.camera);
      const hit = this.raycaster.intersectObjects(this.enemies.filter(e => e.alive).map(e => e.root), true)[0];
      if (hit) {
        const idx = this.enemies.findIndex(e => isAncestor(e.root, hit.object));
        if (idx >= 0) { this.targetIdx = idx; this.emit('target', this.enemies[idx]); }
      }
    }
    this.attack();
  }

  attack() {
    const a = this.active;
    if (this.over || !a?.alive || this.casting || !this.target) return;
    if (a.anim.state === 'attack' || a.anim.state === 'hit') { this.bufferedTap = true; return; }
    this._approach(a, () => this._strike(a));
  }

  skill() {
    const a = this.active;
    if (this.over || !a?.alive || this.casting || !this.target) return false;
    if (this.opts.skillLocked) return false;
    if (a.cd > 0) { this.emit('skill-not-ready', a); return false; }
    this.casting = true;
    this.bufferedTap = false;
    a.move = null;
    a.anim.setLocomotion('idle');
    this.emit('cutin', a);
    this.timeScale = 0.04;
    this.realTimers.push({ t: CUTIN_REAL_SECONDS, fn: () => {
      this.timeScale = 1;
      this._approach(a, () => this._castSkill(a));
    } });
    return true;
  }

  switchTo(i) {
    const next = this.squad[i];
    if (this.over || i === this.activeIdx || !next?.alive || this.casting) return false;
    if (this.opts.switchLocked || this.switchCd > 0) return false;
    const prev = this.active;
    const benchSlot = next.slot;
    next.slot = 0; prev.slot = benchSlot;
    this.activeIdx = i;
    this.switchCd = SWITCH_COOLDOWN;
    this.bufferedTap = false;
    this.chainStep = -1;
    if (prev.alive) this._moveTo(prev, PLAYER_SLOTS[benchSlot]);
    this._moveTo(next, PLAYER_SLOTS[0]);
    this.emit('switched', { from: prev, to: next });
    return true;
  }

  setCooldown(i, seconds) { if (this.squad[i]) this.squad[i].cd = seconds; }

  // ---------------- actions ----------------
  _attackSpot(target) { return target.root.position.clone().add(new THREE.Vector3(-1.35, 0, 0)); }

  _approach(a, then) {
    const spot = this._attackSpot(this.target);
    if (a.root.position.distanceTo(spot) > 0.15) this._moveTo(a, spot, then);
    else { a.root.rotation.y = FACE_RIGHT; then(); }
  }

  _moveTo(actor, dest, onArrive) {
    actor.move = { dest: dest.clone(), onArrive };
    actor.anim.setLocomotion('run');
  }

  _strike(a) {
    const t = this.target;
    if (!t) return;
    this.chainStep = this.sinceAttack < COMBO_WINDOW ? (this.chainStep + 1) % 3 : 0;
    const step = this.chainStep;
    const dur = a.anim.trigger('attack', { combo: step }) || 0.3;
    this.sinceAttack = 0;
    this._after(dur * 0.45, () => {
      if (!t.alive || !a.alive) return;
      const p = this._chest(t);
      this.vfx.slash(p, ELEMENTS[a.def.element].color, step % 2 === 1);
      this.vfx.hitSpark(p, ELEMENTS[a.def.element].color, step === 2);
      this._damage(a, t, COMBO_POWER[step], { combo: step });
    });
    this._after(dur * 0.7, () => {
      if (this.bufferedTap && a === this.active) { this.bufferedTap = false; this.attack(); }
    });
  }

  _castSkill(a) {
    const sk = a.def.skill;
    const dur = a.anim.trigger('skill') || 0.9;
    this._after(dur * 0.5, () => {
      const targets = sk.type === 'aoe' ? this.enemies.filter(e => e.alive) : [this.target].filter(Boolean);
      for (const t of targets) {
        this.vfx.skillBurst(this._chest(t), ELEMENTS[a.def.element].color);
        this._damage(a, t, sk.power, { skill: true });
      }
    });
    this._after(dur, () => { this.casting = false; });
    a.cd = sk.cooldown * this.opts.cooldownScale;
    this.emit('skill-used', a);
  }

  _enemyAttack(e) {
    const victim = this.active;
    if (!victim?.alive) return;
    const spot = victim.root.position.clone();
    this.vfx.telegraph(spot, TELEGRAPH);
    this.emit('telegraph', { enemy: e, victim });
    this._after(TELEGRAPH, () => {
      if (!e.alive || this.over) return;
      e.anim.trigger('attack', { combo: 0 });
      this._after(0.15, () => {
        if (!e.alive || this.over) return;
        if (victim !== this.active || victim.root.position.distanceTo(spot) > 1.2) {
          this.emit('evade', victim);
          return;
        }
        this.vfx.hitSpark(this._chest(victim), 0xff2040);
        this._damage(e, victim, this.opts.enemyAtkMult);
      });
    });
  }

  _damage(attacker, defender, power, extra = {}) {
    if (!defender.alive) return;
    const { mult, tag } = elementMultiplier(attacker.def.element, defender.def.element);
    const dmg = Math.max(1, Math.round(attacker.atk * power * mult * rand(0.92, 1.08)));
    const floor = (defender.side === 'player' && this.opts.unlosable) ||
                  (defender.side === 'enemy' && this.opts.enemyInvulnerable) ? 1 : 0;
    defender.hp = Math.max(floor, defender.hp - dmg);
    if (attacker.side === 'player') {
      this.combo.count++;
      this.combo.timer = 2;
      this.emit('combo', this.combo.count);
    }
    this.emit('damage', { attacker, defender, dmg, tag, ...extra });
    if (defender.hp <= 0) this._kill(defender);
    else defender.anim.trigger('hit');
  }

  _kill(actor) {
    actor.alive = false;
    actor.move = null;
    actor.anim.trigger('defeat');
    this.emit('defeated', actor);
    if (actor.side === 'enemy') {
      if (this.enemies.every(e => !e.alive)) this._end('victory');
    } else if (this.squad.every(p => !p.alive)) {
      this._end('defeat');
    } else if (actor === this.active) {
      this.switchCd = 0;
      const next = this.squad.findIndex(p => p.alive);
      this._after(0.6, () => this.switchTo(next));
    }
  }

  _end(result) {
    this.over = true;
    this.casting = false;
    this._after(1.2, () => this.emit(result));
  }

  _after(t, fn) { this.timers.push({ t, fn }); }
  _chest(actor) { return actor.root.position.clone().add(new THREE.Vector3(0, actor.height * 0.6, 0)); }

  // ---------------- frame ----------------
  update(realDt) {
    const dt = realDt * this.timeScale;
    runTimers(this.realTimers, realDt);
    runTimers(this.timers, dt);

    this.switchCd = Math.max(0, this.switchCd - dt);
    this.sinceAttack += dt;
    if (this.combo.timer > 0 && (this.combo.timer -= dt) <= 0) { this.combo.count = 0; this.emit('combo', 0); }

    for (const p of this.squad) if (p.alive && !this.casting) p.cd = Math.max(0, p.cd - dt);

    const a = this.active;
    if (a?.alive && !a.move && !this.casting && a.anim.state === 'idle' && this.sinceAttack > RETURN_DELAY &&
        a.root.position.distanceTo(PLAYER_SLOTS[0]) > 0.2) {
      this._moveTo(a, PLAYER_SLOTS[0]);
    }

    if (this.opts.enemyAggro && !this.over && !this.casting) {
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if ((e.attackTimer -= dt) <= 0) {
          e.attackTimer = rand(...e.def.attackEvery) + TELEGRAPH;
          this._enemyAttack(e);
        }
      }
    }

    for (const actor of [...this.squad, ...this.enemies]) {
      this._updateMove(actor, dt);
      actor.anim.update(dt);
    }
  }

  _updateMove(actor, dt) {
    const m = actor.move;
    if (!m || !actor.alive) return;
    const pos = actor.root.position;
    const to = m.dest.clone().sub(pos);
    const dist = to.length();
    const step = RUN_SPEED * dt;
    if (dist <= step) {
      pos.copy(m.dest);
      actor.move = null;
      actor.anim.setLocomotion('idle');
      actor.root.rotation.y = actor.side === 'player' ? FACE_RIGHT : FACE_LEFT;
      m.onArrive?.();
    } else {
      pos.addScaledVector(to.normalize(), step);
      actor.root.rotation.y = Math.atan2(to.x, to.z);
    }
  }

  // Screen position (CSS pixels) of a point above an actor.
  screenPos(actor, yOffset = 0) {
    const v = actor.root.position.clone();
    v.y += actor.height + yOffset;
    v.project(this.stage.camera);
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight, visible: v.z < 1 };
  }

  dispose() {
    for (const a of [...this.squad, ...this.enemies]) this.stage.scene.remove(a.root);
    this.vfx.clear();
    this.listeners = {};
    this.timers = []; this.realTimers = [];
  }
}

function runTimers(list, dt) {
  // Timers may schedule new timers; iterate over a snapshot.
  const due = [];
  for (let i = list.length - 1; i >= 0; i--) {
    if ((list[i].t -= dt) <= 0) { due.push(list[i]); list.splice(i, 1); }
  }
  due.reverse().forEach(t => t.fn());
}

const rand = (a, b) => a + Math.random() * (b - a);
function isAncestor(root, obj) {
  for (let o = obj; o; o = o.parent) if (o === root) return true;
  return false;
}
