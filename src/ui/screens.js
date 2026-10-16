// Menu screens: title, home, summon (gacha), pick-one 5★, team, battle result.
import { ELEMENTS } from '../data/elements.js';
import { ROSTER, getChar } from '../data/roster.js';
import { summon, starterMulti, pickOneChoices, SINGLE_COST, MULTI_COST, RATES } from '../systems/gacha.js';
import { profile, update, addToCollection } from '../systems/save.js';
import { portraitHTML } from './hud.js';

const $ = sel => document.querySelector(sel);

export function show(name) {
  document.querySelectorAll('.screen').forEach(s => { s.hidden = s.id !== `screen-${name}`; });
}

const stars = n => '★'.repeat(n);

function charCard(c, { isNew = false, delay = 0, selectable = false, selected = false } = {}) {
  return `
    <div class="char-card r${c.rarity} ${selectable ? 'selectable' : ''} ${selected ? 'selected' : ''}"
         data-id="${c.id}" style="--el:${ELEMENTS[c.element].color};--d:${delay}s">
      ${isNew ? '<div class="cc-new">NEW</div>' : ''}
      ${portraitHTML(c)}
      <div class="cc-stars">${stars(c.rarity)}</div>
      <div class="cc-el">${ELEMENTS[c.element].name}</div>
      <div class="cc-name">${c.name}</div>
      <div class="cc-title">${c.title}</div>
    </div>`;
}

// ---------------- home ----------------
export function renderHome(handlers) {
  const p = profile();
  $('#homeGems').textContent = p.gems.toLocaleString();
  $('#homeSquad').innerHTML = p.squad.map(id => charCard(getChar(id))).join('') ||
    '<p class="muted">No squad yet.</p>';
  for (const [id, fn] of Object.entries(handlers)) $(`#${id}`).onclick = fn;
  show('home');
}

// ---------------- summon ----------------
// mode 'starter': only the free guaranteed multi is offered; resolves after results.
export function openSummon({ mode = 'normal', onBack } = {}) {
  return new Promise(resolve => {
    const el = $('#screen-summon');
    const p = profile();
    const starter = mode === 'starter';
    el.innerHTML = `
      <header class="bar"><h2>SUMMON</h2><div class="gems">◆ <span>${p.gems.toLocaleString()}</span></div></header>
      <div class="banner ${starter ? 'starter' : ''}">
        <div class="banner-kicker">${starter ? 'NEW PLAYER GIFT' : 'STANDARD BANNER'}</div>
        <div class="banner-title">${starter ? 'FREE 10× SUMMON' : 'STREET LEGENDS'}</div>
        <div class="banner-sub">${starter
          ? 'At least one 4★ or higher guaranteed!'
          : `5★ ${RATES[5] * 100}% · 4★ ${RATES[4] * 100}% · 10× guarantees a 4★+`}</div>
      </div>
      <div class="summon-btns">
        ${starter
          ? '<button class="btn hot big" id="pullStarter">SUMMON ×10 <small>FREE</small></button>'
          : `<button class="btn" id="pull1">SUMMON ×1 <small>◆ ${SINGLE_COST}</small></button>
             <button class="btn hot" id="pull10">SUMMON ×10 <small>◆ ${MULTI_COST}</small></button>`}
      </div>
      ${starter ? '' : '<button class="btn ghost back" id="summonBack">◀ BACK</button>'}
      <div class="results" hidden></div>`;
    show('summon');

    const doPull = async (results, cost) => {
      if (cost) {
        if (profile().gems < cost) { flash(el, 'Not enough gems'); return; }
        update(s => { s.gems -= cost; });
      }
      const owned = { ...profile().collection };
      addToCollection(results);
      await revealResults(el.querySelector('.results'), results, owned);
      if (starter) { update(s => { s.starterMultiClaimed = true; }); resolve(results); }
      else openSummon({ mode, onBack }).then(resolve);
    };

    if (starter) $('#pullStarter').onclick = () => doPull(starterMulti(), 0);
    else {
      $('#pull1').onclick = () => doPull(summon(1), SINGLE_COST);
      $('#pull10').onclick = () => doPull(summon(10), MULTI_COST);
      $('#summonBack').onclick = () => { onBack?.(); resolve(null); };
    }
  });
}

function revealResults(container, results, ownedBefore) {
  return new Promise(resolve => {
    const best = Math.max(...results.map(r => r.rarity));
    container.hidden = false;
    container.className = `results best-r${best}`;
    container.innerHTML = `
      <div class="burst"></div>
      <div class="result-grid">${results.map((c, i) => charCard(c, { isNew: !ownedBefore[c.id], delay: 0.6 + i * 0.12 })).join('')}</div>
      <button class="btn hot" id="resultsOk">OK</button>`;
    const ok = container.querySelector('#resultsOk');
    ok.style.animationDelay = `${0.8 + results.length * 0.12}s`;
    ok.onclick = () => { container.hidden = true; resolve(); };
  });
}

// ---------------- pick-one 5★ ----------------
export function openPickOne() {
  return new Promise(resolve => {
    const el = $('#screen-pick');
    let chosen = null;
    const choices = pickOneChoices();
    el.innerHTML = `
      <header class="bar"><h2>PICK-ONE 5★</h2></header>
      <p class="pick-sub">Choose any one 5★ fighter to join your crew. Choose carefully — this is a one-time gift.</p>
      <div class="pick-grid">${choices.map(c => charCard(c, { selectable: true })).join('')}</div>
      <div class="pick-detail muted">Tap a fighter to see their skill.</div>
      <button class="btn hot big" id="pickConfirm" disabled>CONFIRM</button>`;
    show('pick');
    el.querySelectorAll('.char-card').forEach(card => card.onclick = () => {
      chosen = getChar(card.dataset.id);
      el.querySelectorAll('.char-card').forEach(c => c.classList.toggle('selected', c === card));
      const s = chosen.skill;
      el.querySelector('.pick-detail').innerHTML =
        `<b style="color:${ELEMENTS[chosen.element].color}">${chosen.name}</b> — ${chosen.title}<br>
         Skill: <b>${s.name}</b> (${s.type === 'aoe' ? 'hits all enemies' : 'single target'}, ${s.cooldown}s cooldown)
         · HP ${chosen.hp} · ATK ${chosen.atk}`;
      $('#pickConfirm').disabled = false;
    });
    $('#pickConfirm').onclick = () => {
      if (!chosen) return;
      addToCollection([chosen]);
      update(s => { s.starterPickClaimed = true; });
      resolve(chosen);
    };
  });
}

// ---------------- team ----------------
export function openTeam(onDone) {
  const el = $('#screen-team');
  const p = profile();
  let squad = [...p.squad];
  const owned = ROSTER.filter(c => p.collection[c.id]).sort((a, b) => b.rarity - a.rarity);
  const render = () => {
    el.innerHTML = `
      <header class="bar"><h2>SQUAD</h2></header>
      <div class="team-slots">${[0, 1, 2].map(i => squad[i]
        ? charCard(getChar(squad[i]), { selectable: true, selected: true })
        : '<div class="char-card empty">EMPTY</div>').join('')}</div>
      <p class="muted">Tap fighters to add/remove (3 max). Mix elements to cover weaknesses.</p>
      <div class="team-roster">${owned.map(c => charCard(c, { selectable: true, selected: squad.includes(c.id) })).join('')}</div>
      <button class="btn hot" id="teamDone" ${squad.length ? '' : 'disabled'}>SAVE</button>`;
    el.querySelectorAll('.char-card.selectable').forEach(card => card.onclick = () => {
      const id = card.dataset.id;
      if (squad.includes(id)) squad = squad.filter(x => x !== id);
      else if (squad.length < 3) squad.push(id);
      render();
    });
    $('#teamDone').onclick = () => { update(s => { s.squad = squad; }); onDone(); };
  };
  render();
  show('team');
}

// ---------------- result ----------------
export function showResult(win, reward, onOk) {
  const el = $('#screen-result');
  el.innerHTML = `
    <div class="result-title ${win ? 'win' : 'lose'}">${win ? 'VICTORY' : 'DEFEAT'}</div>
    ${win ? `<div class="result-reward">+ ◆ ${reward}</div>` : '<div class="result-reward muted">Regroup and try again.</div>'}
    <button class="btn hot big" id="resultOk">CONTINUE</button>`;
  show('result');
  $('#resultOk').onclick = onOk;
}

function flash(el, msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  el.appendChild(t);
  setTimeout(() => t.remove(), 1500);
}
