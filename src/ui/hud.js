// In-battle HUD: squad cards (HP, skill cooldown ring, switch), floating enemy
// bars, damage/element popups, combo counter and the skill cut-in.
import { ELEMENTS } from '../data/elements.js';
import { portraitUrl } from '../render/assets.js';

const $ = sel => document.querySelector(sel);

export function portraitHTML(def, cls = '') {
  const url = portraitUrl(def.id);
  return url
    ? `<img class="portrait ${cls}" src="${url}" alt="${def.name}">`
    : `<div class="portrait placeholder ${cls}"><span>PLACEHOLDER</span><small>${def.name}</small></div>`;
}

export class HUD {
  constructor() {
    this.root = $('#hud');
    this.squadBar = $('#squadBar');
    this.bars = $('#enemyBars');
    this.popups = $('#popups');
    this.comboEl = $('#combo');
    this.cutinEl = $('#cutin');
    this.battle = null;
  }

  attach(battle) {
    this.battle = battle;
    this.root.hidden = false;
    this.squadBar.innerHTML = battle.squad.map((p, i) => `
      <button class="squad-card el-${p.def.element}" data-i="${i}" style="--el:${ELEMENTS[p.def.element].color}">
        ${portraitHTML(p.def, 'mini')}
        <div class="sc-body">
          <div class="sc-name">${p.def.name.split(' ')[0]}</div>
          <div class="hpbar"><i></i></div>
        </div>
        <div class="cd-ring"><span></span></div>
        <div class="sc-tag">ACTIVE</div>
      </button>`).join('');
    this.cards = [...this.squadBar.children];
    this.cards.forEach((c, i) => c.addEventListener('click', () => battle.switchTo(i)));
    this._buildBars();

    battle.on('wave', () => this._buildBars())
      .on('damage', d => this._onDamage(d))
      .on('evade', v => this.popup(battle.screenPos(v, 0.2), 'EVADED!', 'pop-evade'))
      .on('combo', n => this._combo(n))
      .on('cutin', a => this.cutin(a))
      .on('skill-not-ready', a => this.popup(battle.screenPos(a, 0.2), `${Math.ceil(a.cd)}s`, 'pop-cd'));
  }

  detach() {
    this.root.hidden = true;
    this.battle = null;
    this.squadBar.innerHTML = this.bars.innerHTML = this.popups.innerHTML = '';
    this.comboEl.classList.remove('show');
  }

  _buildBars() {
    const b = this.battle;
    this.bars.innerHTML = b.enemies.map(e => `
      <div class="enemy-bar ${e.def.boss ? 'boss' : ''}" style="--el:${ELEMENTS[e.def.element].color}">
        <div class="eb-name"><b>${ELEMENTS[e.def.element].name}</b> ${e.def.name}</div>
        <div class="hpbar"><i></i></div>
      </div>`).join('');
    this.barEls = [...this.bars.children];
  }

  _onDamage({ attacker, defender, dmg, tag, skill }) {
    const pos = this.battle.screenPos(defender, 0.1);
    const cls = defender.side === 'player' ? 'pop-hurt' : skill ? 'pop-skill' : 'pop-dmg';
    this.popup(pos, dmg, cls);
    if (tag === 'weak') this.popup({ ...pos, y: pos.y - 34 }, 'WEAK!', 'pop-weak', ELEMENTS[attacker.def.element].color);
    if (tag === 'resist') this.popup({ ...pos, y: pos.y - 34 }, 'RESIST', 'pop-resist');
  }

  popup({ x, y }, text, cls, color) {
    const el = document.createElement('div');
    el.className = `popup ${cls}`;
    el.textContent = text;
    el.style.left = `${x + (Math.random() - 0.5) * 30}px`;
    el.style.top = `${y}px`;
    if (color) el.style.setProperty('--c', color);
    this.popups.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  _combo(n) {
    if (n < 2) { this.comboEl.classList.remove('show'); return; }
    this.comboEl.innerHTML = `<b>${n}</b><span>HITS</span>`;
    this.comboEl.classList.remove('bump'); void this.comboEl.offsetWidth; this.comboEl.classList.add('show', 'bump');
  }

  cutin(actor) {
    const d = actor.def, el = ELEMENTS[d.element];
    this.cutinEl.style.setProperty('--el', el.color);
    this.cutinEl.innerHTML = `
      <div class="ci-band"></div>
      <div class="ci-slash"></div>
      <div class="ci-portrait">${portraitHTML(d, 'big')}</div>
      <div class="ci-text">
        <div class="ci-el">${el.name} SKILL</div>
        <div class="ci-skill">${d.skill.name}</div>
        <div class="ci-name">${d.name}</div>
      </div>`;
    this.cutinEl.hidden = false;
    this.cutinEl.classList.remove('play'); void this.cutinEl.offsetWidth; this.cutinEl.classList.add('play');
    clearTimeout(this._cutinT);
    this._cutinT = setTimeout(() => { this.cutinEl.hidden = true; }, 1300);
  }

  update() {
    const b = this.battle;
    if (!b) return;
    b.squad.forEach((p, i) => {
      const c = this.cards[i];
      const maxCd = p.def.skill.cooldown * b.opts.cooldownScale;
      c.classList.toggle('active', i === b.activeIdx);
      c.classList.toggle('ko', !p.alive);
      c.classList.toggle('ready', p.alive && p.cd <= 0);
      c.querySelector('.hpbar i').style.width = `${(p.hp / p.maxHp) * 100}%`;
      c.querySelector('.cd-ring').style.setProperty('--p', p.cd <= 0 ? 1 : 1 - p.cd / maxCd);
      c.querySelector('.cd-ring span').textContent = p.cd <= 0 ? 'SWIPE' : Math.ceil(p.cd);
    });
    b.enemies.forEach((e, i) => {
      const el = this.barEls?.[i];
      if (!el) return;
      const s = b.screenPos(e, 0.75);
      el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
      el.style.opacity = e.alive ? 1 : 0;
      el.classList.toggle('targeted', e === b.target);
      el.querySelector('.hpbar i').style.width = `${(e.hp / e.maxHp) * 100}%`;
    });
  }
}
