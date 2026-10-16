# /Assets/Animations

Motion-captured clips (`.glb`). The animation state machine needs six states
per character:

| State    | Used for                         | Matched clip names (case-insensitive)        |
|----------|----------------------------------|----------------------------------------------|
| idle     | standing                         | idle, stand, breath                          |
| run      | moving to / from the target      | run, sprint, jog, dash                       |
| attack   | tap combo (up to 3 clips, A→Z)   | attack, combo, punch, slash, kick, strike    |
| skill    | swipe skill                      | skill, special, ult, super                   |
| hit      | taking damage                    | hit, hurt, damage, react                     |
| defeat   | KO (holds last frame)            | defeat, death, die, dead, knockout           |

Clips can be embedded in the character's own `.glb`, or listed in
`Assets/manifest.json` as shared files that every character uses:

```json
"sharedAnimations": {
  "idle": "Animations/idle.glb",
  "run": "Animations/run.glb",
  "attack": "Animations/attack_combo.glb",
  "skill": "Animations/skill.glb",
  "hit": "Animations/hit.glb",
  "defeat": "Animations/defeat.glb"
}
```

Clips loaded through the manifest are matched by their key, whatever the
clip is named inside the file. Shared clips need the same skeleton and bone
names as the model (for example, all Mixamo rigs). A missing state falls back
to the idle clip and logs a console warning.

If a file listed in the manifest holds several clips, the first clip
alphabetically is used for that state. For `attack`, the first three are used
as combo hits 1–3.
