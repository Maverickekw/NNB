import { Stage } from './render/stage.js';
import { VFX } from './render/vfx.js';
import { loadManifest } from './render/assets.js';
import { Battle } from './battle/battle.js';
import { bindBattleInput } from './battle/input.js';
import { HUD } from './ui/hud.js';
import { show, renderHome, openSummon, openTeam, showResult } from './ui/screens.js';
import { runTutorial, finishStarterPick } from './tutorial/tutorial.js';
import { profile, update } from './systems/save.js';
import { getChar, ENEMIES } from './data/roster.js';

const canvas = document.getElementById('stage');
const loading = document.getElementById('loading');

await loadManifest();
const stage = new Stage(canvas);
const vfx = new VFX(stage.scene, stage.camera);
const hud = new HUD();
let battle = null;

const app = {
  async startBattle(config) {
    app.endBattle();
    show(null);
    loading.hidden = false;
    const b = new Battle(stage, vfx, config);
    await b.load();
    loading.hidden = true;
    battle = b;
    hud.attach(b);
    showPlaceholderNotice();
    b.on('wave', showPlaceholderNotice);
    return b;
  },
  endBattle() {
    document.getElementById('placeholderNotice').hidden = true;
    if (!battle) return;
    hud.detach();
    battle.dispose();
    battle = null;
  },
  goHome,
};

bindBattleInput(canvas, () => battle);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  battle?.update(dt);
  vfx.update(dt);
  stage.placeCamera(vfx.shake);
  stage.render();
  hud.update();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Tell the player which fighters in this fight are gray stand-ins (no model in /Assets).
function showPlaceholderNotice() {
  const names = [...battle.squad, ...battle.enemies].filter(a => a.placeholder).map(a => a.def.name);
  const el = document.getElementById('placeholderNotice');
  el.hidden = !names.length;
  if (names.length) {
    el.innerHTML = `<b>PLACEHOLDER ART</b> — no model in <code>/Assets/Characters</code> for: ${[...new Set(names)].join(', ')}`;
    console.warn('[assets] Using gray placeholders for:', names.join(', '));
  }
}

function goHome() {
  renderHome({
    btnBattle: startStreetFight,
    btnSummon: () => openSummon({ onBack: goHome }),
    btnTeam: () => openTeam(goHome),
    btnTutorial: () => runTutorial(app, { replay: true }),
  });
}

async function startStreetFight() {
  const squad = profile().squad.map(getChar).filter(Boolean);
  if (!squad.length) { openTeam(goHome); return; }
  const grunts = ENEMIES.filter(e => !e.boss);
  const count = 2 + Math.round(Math.random());
  const wave = Array.from({ length: count }, () => ({ def: grunts[Math.floor(Math.random() * grunts.length)] }));
  if (Math.random() < 0.3) wave[0] = { def: getChar('marquee') };
  const b = await app.startBattle({ squad, enemies: wave });
  const finish = win => {
    const reward = win ? 150 : 0;
    if (win) update(s => { s.gems += reward; });
    app.endBattle();
    showResult(win, reward, goHome);
  };
  b.on('victory', () => finish(true)).on('defeat', () => finish(false));
}

// ---- boot ----
document.getElementById('btnStart').onclick = async () => {
  const p = profile();
  if (!p.tutorialDone && p.starterPickClaimed) update(s => { s.tutorialDone = true; });
  if (!profile().tutorialDone && p.starterMultiClaimed) { await finishStarterPick(); goHome(); }
  else if (!profile().tutorialDone) runTutorial(app, { replay: false });
  else goHome();
};
loading.hidden = true;
show('title');
