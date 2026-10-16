// Playable tutorial (~5 min). Teaches, in order: tap attack, swipe skill,
// cooldowns, switching, element advantage — then the gacha screen, ending with
// the starter rewards (free guaranteed 10× summon + pick-one 5★).
//
// The scripted fight can't be lost: player HP never drops below 1 and enemies
// are invulnerable until the script lets the player finish them.
// On replay (tutorial already completed) a SKIP button is shown.
import { getChar, TUTORIAL_SQUAD } from '../data/roster.js';
import { profile, update } from '../systems/save.js';
import { autoSquad } from '../systems/squad.js';
import { say, hideDialog, gesture, highlight } from '../ui/dialog.js';
import { openSummon, openPickOne } from '../ui/screens.js';

const SKIP = Symbol('skip');
const delay = ms => new Promise(r => setTimeout(r, ms));
const until = cond => new Promise(r => { const f = () => (cond() ? r() : requestAnimationFrame(f)); f(); });

function waitFor(battle, type, pred = () => true, count = 1) {
  return new Promise(resolve => {
    let n = 0;
    const fn = d => {
      if (!pred(d) || ++n < count) return;
      battle.off(type, fn);
      resolve(d);
    };
    battle.on(type, fn);
  });
}

export async function runTutorial(app, { replay = false } = {}) {
  const skipBtn = document.getElementById('tutorialSkip');
  let skip;
  const skipped = new Promise(r => { skip = r; });
  skipBtn.hidden = !replay;
  skipBtn.onclick = () => skip(SKIP);
  // Every wait races the skip button.
  const w = async p => { const v = await Promise.race([p, skipped]); if (v === SKIP) throw SKIP; return v; };

  try {
    await script(app, w, replay);
  } catch (e) {
    if (e !== SKIP) throw e;
  } finally {
    skipBtn.hidden = true;
    gesture(null);
    highlight(null);
    hideDialog();
    document.getElementById('elementChart').hidden = true;
  }
  update(s => { s.tutorialDone = true; });
  app.endBattle();
  app.goHome();
}

async function script(app, w, replay) {
  const battle = await w(app.startBattle({
    squad: TUTORIAL_SQUAD.map(getChar),
    enemies: [{ def: getChar('rusthound'), hpMult: 3 }],
    enemyAggro: false, enemyAtkMult: 0.35,
    unlosable: true, enemyInvulnerable: true,
    skillLocked: true, switchLocked: true,
    cooldownScale: 0.6,
  }));
  const hits = (n, pred = () => true) =>
    waitFor(battle, 'damage', d => d.attacker.side === 'player' && !d.skill && pred(d), n);

  // 1 — Tap attack
  await w(say('Welcome to <b>RIOT//SHIFT</b>. A gang from the Strip is moving in on your block. Let\'s get you fight-ready.', { next: true }));
  say('<b>TAP</b> the screen to attack. Tap in rhythm to chain a <b>3-hit combo</b>!');
  gesture('tap');
  await w(Promise.all([hits(6), hits(1, d => d.combo === 2)]));
  gesture(null);
  await w(say('Nice! The third hit of a combo is a heavy <b>finisher</b>.', { next: true }));

  // 2 — Swipe skill
  battle.opts.skillLocked = false;
  battle.setCooldown(0, 0);
  highlight('.squad-card.active .cd-ring');
  say('Your <b>skill</b> is charged — your card says <b>SWIPE</b>. Swipe across the screen to unleash it!');
  gesture('swipe');
  await w(waitFor(battle, 'skill-used'));
  gesture(null); highlight(null);
  await w(delay(2200));

  // 3 — Cooldowns
  const lead = battle.squad[0];
  highlight('.squad-card[data-i="0"] .cd-ring');
  say('Skills need time to <b>recharge</b>. The ring on your card shows the <b>cooldown</b>. Keep tapping attacks while it fills!');
  await w(until(() => lead.cd <= 0 || battle.active !== lead));
  battle.setCooldown(battle.activeIdx, 0);
  say('Charged! <b>SWIPE</b> again!');
  gesture('swipe');
  await w(waitFor(battle, 'skill-used'));
  gesture(null); highlight(null);
  await w(delay(2200));

  // 4 — Enemies fight back + switching
  battle.opts.enemyAggro = true;
  say('Heads up — enemies fight back. A <b>red ring</b> under your fighter means a hit is coming.');
  await w(waitFor(battle, 'telegraph'));
  battle.opts.switchLocked = false;
  highlight('.squad-card:not(.active)');
  say('Tap a <b>squad card</b> to <b>SWITCH</b> fighters. Switching out of a red ring dodges the hit!');
  await w(waitFor(battle, 'switched'));
  highlight(null);
  say('Each fighter has their own skill and cooldown — benched fighters keep charging. Land a few hits with your new fighter!');
  await w(hits(4));

  // Finish the first enemy.
  battle.opts.enemyInvulnerable = false;
  const hound = battle.enemies[0];
  hound.hp = Math.min(hound.hp, Math.round(hound.maxHp * 0.15));
  say('It\'s on its last legs. <b>Finish it!</b>');
  await w(waitFor(battle, 'victory'));

  // 5 — Element advantage
  await w(battle.spawnEnemies([{ def: getChar('phantom'), hpMult: 1.4 }]));
  battle.opts.enemyInvulnerable = true;
  battle.opts.enemyAggro = false;
  document.getElementById('elementChart').hidden = false;
  await w(say('Every fighter has an <b>element</b>. <b class="t-blaze">BLAZE</b> beats <b class="t-gale">GALE</b>, ' +
    '<b class="t-gale">GALE</b> beats <b class="t-tide">TIDE</b>, <b class="t-tide">TIDE</b> beats <b class="t-blaze">BLAZE</b>.<br>' +
    'Hitting a weakness deals <b>1.5×</b> damage. Hitting a resistance deals only 0.75×.', { next: true }));
  const ryoIdx = battle.squad.findIndex(p => p.def.element === 'blaze');
  highlight(`.squad-card[data-i="${ryoIdx}"]`);
  say(`This Street Phantom is <b class="t-gale">GALE</b>. Switch to <b>${battle.squad[ryoIdx].def.name.split(' ')[0]}</b> (<b class="t-blaze">BLAZE</b>) and hit its weakness!`);
  battle.opts.enemyAggro = true;
  await w(waitFor(battle, 'damage', d => d.attacker.side === 'player' && d.tag === 'weak'));
  highlight(null);
  battle.opts.enemyInvulnerable = false;
  say('<b>WEAK!</b> That\'s element advantage. Take it down!');
  await w(waitFor(battle, 'victory'));
  document.getElementById('elementChart').hidden = true;

  // 6 — Scripted boss fight (still unlosable)
  await w(battle.spawnEnemies([
    { def: getChar('marquee'), hpMult: 0.8, atkMult: 0.6 },
    { def: getChar('drainer'), hpMult: 0.6, atkMult: 0.5 },
  ]));
  battle.opts.enemyAtkMult = 0.6;
  for (let i = 0; i < battle.squad.length; i++) battle.setCooldown(i, 0);
  say('The boss of the Strip — <b>The Marquee</b> — is <b class="t-tide">TIDE</b>. Use everything: combos, skills, switching, and <b class="t-gale">GALE</b> to hit its weakness!');
  await w(waitFor(battle, 'victory'));
  app.endBattle();

  // 7 — Gacha screen + starter rewards
  const p = profile();
  let pulls = null;
  if (!p.starterMultiClaimed) {
    await w(say('You won your first street fight! But every crew needs fighters. Time to <b>SUMMON</b>.', { next: true }));
    await w(say('New players get a <b>FREE 10× summon</b> — with at least one <b>4★ or better</b> guaranteed!', { next: true }));
    hideDialog();
    pulls = await w(openSummon({ mode: 'starter' }));
  } else {
    await w(say('This is where you <b>SUMMON</b> new fighters with gems. (Your starter rewards were already claimed.)', { next: true }));
  }
  if (!profile().starterPickClaimed) {
    await w(say('One more gift: choose <b>any 5★ fighter</b> to join your crew!', { next: true }));
    hideDialog();
    const pick = await w(openPickOne());
    const owned = Object.keys(profile().collection).map(getChar);
    update(s => { s.squad = autoSquad(pick, pulls || owned); });
    await w(say(`<b>${pick.name}</b> joins your squad! Your crew is ready. Welcome to the Strip.`, { next: true }));
  } else if (replay) {
    await w(say('That\'s everything. Go show the Strip what you\'ve got!', { next: true }));
  }
}

// Recovery: the player left after the free summon but before picking their 5★.
export async function finishStarterPick() {
  await say('Welcome back! Don\'t forget your gift: choose <b>any 5★ fighter</b>!', { next: true });
  hideDialog();
  const pick = await openPickOne();
  update(s => {
    s.squad = autoSquad(pick, Object.keys(s.collection).map(getChar));
    s.tutorialDone = true;
  });
}
