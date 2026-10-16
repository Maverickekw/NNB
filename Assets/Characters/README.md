# /Assets/Characters

Drop character models here (glTF binary, `.glb`). The game NEVER generates
character art — anything not listed in `Assets/manifest.json` renders as a
gray capsule labeled **PLACEHOLDER**.

Register each model in `Assets/manifest.json` under `characters`, keyed by the
roster id (see `src/data/roster.js`):

```json
"characters": {
  "kaito": {
    "model": "Characters/kaito.glb",
    "portrait": "Characters/kaito_portrait.png",
    "scale": 1.0,
    "rotateY": 0,
    "animations": { "skill": "Animations/kaito_skill.glb" }
  }
}
```

- `model` – required. Rigged, full-body model. It is auto-scaled to ~1.8 units
  tall and should face +Z.
- `portrait` – optional 3:4 image used on cards and the skill cut-in.
- `scale` / `rotateY` – optional fix-ups.
- `animations` – optional per-character clips (override `sharedAnimations`).

Materials are converted to the toon shader automatically (base color and
texture are kept; ramp shading, rim light, and ink outlines are added).
