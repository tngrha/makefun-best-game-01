# Emberfall

Guard the last ember grove. A top-down arena survival game: waves of
"hollow" creatures approach from the edges of a dark grove, and you — the
keeper — hold them back with ember bolts.

- **Move** WASD / arrows, **aim** with the mouse, **shoot** with click or
  Space, **dash** with Shift, **pause** with P.
- Defeated hollows drop ember shards; collect them for score.
- Between waves, pick 1 of 3 ember blessings (fire rate, split shot, dash
  cooldown, max hearts, magnet, and more).
- Score grows with a combo multiplier; lose all 3 hearts and the grove
  goes dark. Best score is kept in your browser.

Original art, sound and music, all made in code: vector-drawn scenes in an
ember orange / teal palette, WebAudio-synthesised effects and a generative
ambient loop. No libraries, no network requests, no downloaded assets.

Play it: serve `game/` with any static server (`node serve.ts`, then open
http://localhost:8080) and open `game/index.html`.

## Layout

- `game/index.html` — loads the game, no network references
- `game/src/main.js` — boot and the loop; title / play / upgrade / paused / game-over
- `game/src/config.js` — tuning numbers and palette
- `game/src/world.js` — entities, waves, spawning, scoring
- `game/src/render.js` — canvas drawing for every screen
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — WebAudio sound effects and ambient music
- `game/src/upgrades.js` — the between-wave blessings
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=title|play|upgrade|over`)
- `game/src/random.js` — seeded random generator
- `main.ts` — the make.fun hand-in program (Node 22)
- `screenshots/` — 4 real renders of the game

MIT licensed.
