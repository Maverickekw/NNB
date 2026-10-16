# RIOT//SHIFT

An original mobile gacha game with a real-time squad battle system. It runs in
the browser with three.js (vendored, no build step).

```sh
npm start        # serves on http://localhost:8080 (any static server works)
npm test         # gacha / element / squad unit tests
```

## Art: what's real and what's a placeholder

The code never creates character art. Characters render from `/Assets/Characters` and
`/Assets/Animations`, registered in `Assets/manifest.json` (see the READMEs in
those folders). **No character assets exist yet**, so every fighter shows as a
gray capsule labeled `PLACEHOLDER` in the 3D scene. Cards show a striped
`PLACEHOLDER` portrait, and an on-screen notice lists which fighters are
missing art.

When you add a `.glb`:
- Materials are converted to the toon shader (`src/render/toon.js`): 3-step
  ramp, hard rim light in the fighter's element color, inverted-hull ink outline.
- Clips are mapped onto the animation state machine (`src/render/animator.js`):
  idle, run, attack ×3 combo, skill, hit, and defeat.

## Battle controls

| Action | Touch | Keyboard |
|---|---|---|
| Attack (3-hit combo) | tap | Space / J |
| Target an enemy | tap the enemy | — |
| Skill (when its ring says SWIPE) | swipe | K / ↑ |
| Switch fighter | tap a squad card | 1 / 2 / 3 |

Elements: **BLAZE > GALE > TIDE > BLAZE**. Hitting a weakness deals ×1.5
damage; hitting a resistance deals ×0.75. A red ring under your fighter
warns of an enemy attack, and switching that fighter out before it lands
evades the hit.

## New-player flow

1. Tutorial (~5 min, scripted fight that can't be lost): tap attack → swipe skill →
   cooldowns → switching → element advantage → boss.
2. Gacha screen: a free 10× summon with at least one 4★ guaranteed.
3. Pick-one 5★, which builds the starting squad automatically.

After that, "Replay Tutorial" on the home screen shows a SKIP button.
Starter rewards are granted once.

## Layout

```
src/data       roster (all original characters), elements
src/systems    gacha (pure, tested), save (localStorage), squad
src/render     stage, toon shader, asset loader + placeholders, animator, VFX
src/battle     real-time battle logic, touch/keyboard input
src/ui         HUD + skill cut-in, menu screens, tutorial dialog
src/tutorial   scripted tutorial
```
