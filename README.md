# makefun-stealth-game

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/zenfrog72/makefun-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/zenfrog72/makefun-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**Velvet Hour** — a museum stealth caper in four galleries, drawn and played entirely from code. Midnight: slip past guards whose amber vision cones redden as their suspicion climbs, keep to the burgundy rugs where the light cannot follow, lift each gallery's prize from its gold case, and walk out of the green doors unseen. Break a guard's line of sight and his nerve cools — he searches where he last saw you, then gives up, so you always get a second chance. Walking feet are heard as well as seen; hold Shift to sneak. Later galleries add sweeping security cameras whose alarm summons every guard at once.

- **Four galleries**: The Marble Hall, The Sculpture Garden, The Vault Gallery, The Star Sapphire — 12 patrolling guards, 3 cameras, 20 gems, 4 target artefacts.
- **A fair detection system**: distance, light, shadow, posture and noise all feed each guard's suspicion meter; "?" means curious, "!" means a chase you can still escape.
- **Score and stars**: gems, the target, a time bonus against par, and a 750-point ghost bonus for never being truly seen.
- **Synthesised sound**: footsteps (the guards' are panned and faded by distance, so your ears find patrols before your eyes do), suspicion ticks, alarms and chimes — no audio files.
- **Original everything**: idea, art, names and sound made for this bounty; the game is plain static files with no build step and no network request.

## Run it

Play the game by serving `game/` with any static file server and opening it in desktop Chrome:

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080 — WASD / arrows move, Shift sneaks, P pauses, M mutes
```

Hand the entry in (copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's vendored library):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `main.ts` — the hand-in program (Node 22, standard library only).
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `game/index.html`, `game/style.css` — the page, its HUD and menus.
- `game/src/` — the game itself, one job per file: `engine.js` (states, loop, scoring, alarm, staged captures), `levels.js` (the four galleries as data), `vision.js` (grid line-of-sight and cone geometry), `guards.js` (patrols, suspicion, pursuit, cameras), `player.js` (movement, sneaking, noise, shadow), `render.js` (the frame painter), `art.js` (tiles, props and figures), `sound.js` (the WebAudio soundscape).
- `screenshots/` — four captures of the game running, taken by its maker.

---
<sub>Entered on [make.fun](https://make.fun/?ref=pcjmcqh3&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
