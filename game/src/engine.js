// engine.js — Velvet Hour's conductor: states, the loop, scoring, the
// camera alarm, the HUD, and the staged scenes the screenshots use.
//
// The game moves through title (the museum idles behind the menu),
// play, paused, caught, clear and complete — plus pose, a frozen staged
// frame the maker photographs for screenshots with ?shot=<name>, the
// same hook the kit's starter uses. This file owns the flow; the
// modules under it own the game.

import { LEVELS } from './levels.js';
import { makeGrid, TILE } from './vision.js';
import { Player } from './player.js';
import { Guard, CameraUnit, detectionRate, GUARD_RANGE, GUARD_HALF_FOV, CAMERA_RANGE, CAMERA_HALF_FOV } from './guards.js';
import { drawWorld } from './render.js';
import { SoundEngine } from './sound.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sound = new SoundEngine();

// el is a shortcut for the one lookup this file does everywhere.
function el(id) {
  return document.getElementById(id);
}

// The HUD's live elements, gathered once.
const hud = {
  level: el('hud-level'),
  target: el('hud-target'),
  gems: el('hud-gems'),
  score: el('hud-score'),
  time: el('hud-time'),
  eyeFill: el('eye-fill'),
  eye: el('hud-eye'),
  hint: el('hint'),
};
const overlay = el('overlay');
const panels = {};
for (const name of ['title', 'caught', 'clear', 'complete', 'pause']) {
  panels[name] = el('panel-' + name);
}

let state = 'title';
let world = null;
let levelIndex = 0;
let unlocked = 0;
let scoreAtLevelStart = 0;
let lastTimestamp = 0;
const keys = new Set();

// ---------------------------------------------------------------- world

// makeWorld assembles a gallery's living state from its data: the grid,
// the figures, the loot, and the score-keeping the HUD and the clear
// screen read.
function makeWorld(index) {
  const level = LEVELS[index];
  const grid = makeGrid(level.grid);
  const w = {
    level,
    grid,
    ox: Math.floor((canvas.width - grid.width * TILE) / 2),
    oy: Math.floor((canvas.height - grid.height * TILE) / 2),
    player: null,
    guards: [],
    cameras: [],
    gems: new Map(),
    gemTotal: 0,
    targetTaken: false,
    targetName: level.targetName,
    elapsed: 0,
    score: 0,
    gemsTaken: 0,
    ghost: true,
    cameraMeter: 0,
    alarmActive: false,
    alarmTimer: 0,
    alarmBeepTimer: 0,
    floaters: [],
    playerHidden: true,
    staticLayer: null,
    staticDirty: true,
    state: 'play',
    hintTimer: 0,
    hintOverride: '',
    exitWarnedAt: -99,
  };
  for (let ty = 0; ty < grid.height; ty++) {
    for (let tx = 0; tx < grid.width; tx++) {
      const ch = grid.tileAt(tx, ty);
      if (ch === 'P') {
        const middle = grid.tileCenter(tx, ty);
        w.player = new Player(middle.x, middle.y);
      } else if (ch === 'g') {
        w.gems.set(tx + ',' + ty, { tx, ty, taken: false });
        w.gemTotal++;
      }
    }
  }
  w.guards = level.guards.map((spec) => new Guard(grid, spec));
  w.cameras = level.cameras.map((spec) => new CameraUnit(grid, spec));
  return w;
}

// setPanel shows one overlay panel, or none (the game bare).
function setPanel(name) {
  overlay.classList.toggle('show', name !== null);
  for (const [key, panel] of Object.entries(panels)) {
    panel.classList.toggle('show', key === name);
  }
}

// startLevel opens a gallery with `banked` points already in hand: 0
// for a fresh run from the title, the running total when advancing,
// and the level-start total when retrying — a retry refunds the level.
function startLevel(index, banked) {
  levelIndex = index;
  world = makeWorld(index);
  world.score = banked;
  scoreAtLevelStart = banked;
  state = 'play';
  setPanel(null);
  paintHud(true);
}

function restartLevel() {
  startLevel(levelIndex, scoreAtLevelStart);
}

// ---------------------------------------------------------------- update

// What a guard's feet and voice do to the soundscape.
const guardSound = {
  onStep(guard) {
    if (!world) return;
    const dist = Math.hypot(guard.x - world.player.x, guard.y - world.player.y);
    const volume = Math.max(0, 1 - dist / (TILE * 10));
    const pan = Math.max(-1, Math.min(1, (guard.x - world.player.x) / 320));
    sound.guardStep(volume, pan);
  },
  onShout() {
    if (world) world.ghost = false;
    sound.shout();
  },
};

const thiefSound = {
  onStep(sneaking) {
    sound.thiefStep(sneaking);
  },
};

// pollKeys turns the held keys into one frame of travel input.
const MOVE_KEYS = {
  arrowleft: [-1, 0], a: [-1, 0],
  arrowright: [1, 0], d: [1, 0],
  arrowup: [0, -1], w: [0, -1],
  arrowdown: [0, 1], s: [0, 1],
};
function pollKeys() {
  const input = { x: 0, y: 0, sneak: keys.has('shift') };
  for (const [key, step] of Object.entries(MOVE_KEYS)) {
    if (!keys.has(key)) continue;
    input.x += step[0];
    input.y += step[1];
  }
  return input;
}

function spawnFloater(x, y, text) {
  world.floaters.push({ x, y, text, age: 0, life: 1.15 });
}

function takeGem(gem) {
  gem.taken = true;
  world.gemsTaken += 1;
  world.score += 100;
  world.staticDirty = true;
  const middle = world.grid.tileCenter(gem.tx, gem.ty);
  spawnFloater(middle.x, middle.y - 14, '+100');
  sound.pickup();
}

function takeTarget(tx, ty) {
  world.targetTaken = true;
  world.score += 500;
  world.staticDirty = true;
  const middle = world.grid.tileCenter(tx, ty);
  const label = '+500 ' + world.targetName.toUpperCase();
  spawnFloater(middle.x, middle.y - 16, label);
  sound.targetPickup();
  flashHint(`The ${world.targetName} is yours — reach the EXIT doors.`, 5);
}

function triggerAlarm() {
  world.alarmActive = true;
  world.alarmTimer = 5;
  world.alarmBeepTimer = 0;
  world.ghost = false;
  // Every guard who is not already hunting turns toward where the
  // thief was last seen and starts searching there.
  for (const guard of world.guards) {
    guard.lastSeen = { x: world.player.x, y: world.player.y };
    const idle = guard.mode === 'patrol' || guard.mode === 'wait' || guard.mode === 'curious';
    if (!idle) continue;
    guard.mode = 'search';
    guard.searchTimer = 3.2;
    if (guard.suspicion < 0.6) guard.suspicion = 0.6;
  }
  flashHint('The camera raised the alarm — stay unseen until it fades.', 5);
}

function updateCameras(dt) {
  let worst = 0;
  for (const camera of world.cameras) {
    camera.update(dt, world.elapsed);
    const rate = camera.detection(world.grid, world.player);
    worst = Math.max(worst, rate);
  }
  if (world.alarmActive) {
    world.alarmTimer -= dt;
    world.alarmBeepTimer -= dt;
    if (world.alarmBeepTimer <= 0) {
      world.alarmBeepTimer = 0.55;
      sound.alarmBeep();
    }
    if (world.alarmTimer <= 0) {
      world.alarmActive = false;
      world.cameraMeter = 0.3;
    }
    return worst;
  }
  if (worst > 0) {
    world.cameraMeter = Math.min(1, world.cameraMeter + worst * 0.55 * dt);
    if (world.cameraMeter >= 1) triggerAlarm();
  } else if (world.cameraMeter > 0) {
    world.cameraMeter = Math.max(0, world.cameraMeter - 0.35 * dt);
  }
  return worst;
}

function updatePlay(dt) {
  const grid = world.grid;
  const player = world.player;
  world.elapsed += dt;
  player.update(dt, pollKeys(), grid, thiefSound);
  for (const guard of world.guards) guard.update(dt, player, guardSound);
  const cameraRate = updateCameras(dt);

  // How exposed is the thief right now? It drives the glow and the eye.
  // A guard counts as seeing her while his cone holds her; a guard in
  // chase or search counts as seeing her whether or not it does.
  const exposures = world.guards.map((guard) => {
    const rate = detectionRate(grid, guard.x, guard.y, guard.facing, GUARD_RANGE, GUARD_HALF_FOV, player);
    const alerted = guard.mode === 'chase' || guard.mode === 'search';
    return { suspicion: guard.suspicion, seen: rate > 0 || alerted };
  });
  const worstSuspicion = exposures.reduce((worst, e) => Math.max(worst, e.suspicion), 0);
  const seen = cameraRate > 0 || exposures.some((e) => e.seen);
  world.playerHidden = !seen;
  world.maxSuspicion = worstSuspicion;
  if (worstSuspicion >= 0.35 && worstSuspicion < 1) sound.suspicionTick(worstSuspicion);

  // Caught: an alerted guard lays a hand on the thief.
  const caughtBy = world.guards.find((guard) => {
    const gap = Math.hypot(guard.x - player.x, guard.y - player.y);
    return guard.mode === 'chase' && gap < 30;
  });
  if (caughtBy) return onCaught();

  // Pickups and the exit, by the tile under the thief's feet.
  const tx = player.tileX();
  const ty = player.tileY();
  const ch = grid.tileAt(tx, ty);
  if (ch === 'g') {
    const gem = world.gems.get(tx + ',' + ty);
    if (gem && !gem.taken) takeGem(gem);
  } else if (ch === 'T' && !world.targetTaken) {
    takeTarget(tx, ty);
  } else if (ch === 'E') {
    if (world.targetTaken) return onCleared();
    if (world.elapsed - world.exitWarnedAt > 4) {
      world.exitWarnedAt = world.elapsed;
      flashHint(`Locked. The ${world.targetName} is still in its case.`, 3.5);
    }
  }

  for (const floater of world.floaters) floater.age += dt;
  world.floaters = world.floaters.filter((f) => f.age < f.life);
  if (world.hintTimer > 0) world.hintTimer -= dt;
  paintHud(false);
}

function onCaught() {
  state = 'caught';
  sound.caught();
  const caughtLine =
    `Spotted in ${world.level.name}. The ${world.targetName} stays in its case tonight — ` +
    'watch the patrols, keep to the rugs, and try again.';
  el('caught-text').textContent = caughtLine;
  setPanel('caught');
}

function onCleared() {
  state = 'clear';
  const timeBonus = Math.max(0, Math.round((world.level.par - world.elapsed) * 10));
  const ghostBonus = world.ghost ? 750 : 0;
  world.score += timeBonus + ghostBonus;
  unlocked = Math.max(unlocked, Math.min(LEVELS.length - 1, levelIndex + 1));
  sound.clearJingle();
  const allGems = world.gemsTaken === world.gemTotal;
  const stars = 1 + (allGems ? 1 : 0) + (allGems && world.ghost ? 1 : 0);
  document.getElementById('clear-title').textContent = world.level.name + ' — cleared';
  document.getElementById('clear-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  // The breakdown: one row per source of points, then the total.
  const breakdown = [];
  breakdown.push([`The ${world.targetName}`, 500]);
  breakdown.push([`Gems — ${world.gemsTaken} of ${world.gemTotal}`, world.gemsTaken * 100]);
  breakdown.push([`Time bonus (${clockText(world.elapsed)} against par ${clockText(world.level.par)})`, timeBonus]);
  breakdown.push([world.ghost ? 'Ghost bonus — never truly seen' : 'Ghost bonus — you were seen', ghostBonus]);
  const rowsHtml = breakdown
    .map(([label, points]) => `<div class="row"><span>${label}</span><b>+${points}</b></div>`)
    .join('');
  document.getElementById('clear-rows').innerHTML =
    rowsHtml + `<div class="row"><span>Total score</span><b>${world.score}</b></div>`;
  document.getElementById('btn-next').textContent =
    levelIndex + 1 < LEVELS.length ? 'Next gallery →' : 'Finish the night →';
  setPanel('clear');
  paintHud(true);
}

function onComplete() {
  state = 'complete';
  const doneLine =
    `Every gallery emptied, every guard none the wiser. Final score: ${world.score}. ` +
    'The Velvet Hour strikes again next weekend.';
  el('complete-text').textContent = doneLine;
  setPanel('complete');
}

// ------------------------------------------------------------------- HUD

function clockText(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

function flashHint(text, seconds) {
  world.hintOverride = text;
  world.hintTimer = seconds;
}

function paintHud(force) {
  if (!world) return;
  hud.level.textContent = `Gallery ${levelIndex + 1} — ${world.level.name}`;
  hud.target.textContent = world.targetTaken
    ? '✓ TARGET SECURED — REACH THE EXIT'
    : 'TARGET — ' + world.targetName;
  hud.target.classList.toggle('secured', world.targetTaken);
  hud.gems.textContent = `◆ ${world.gemsTaken} / ${world.gemTotal}`;
  hud.score.textContent = 'SCORE ' + world.score;
  hud.time.textContent = clockText(world.elapsed);
  const heat = Math.max(world.maxSuspicion ?? 0, world.cameras.length ? world.cameraMeter : 0);
  hud.eyeFill.style.width = Math.round(heat * 100) + '%';
  const eyeColour = heat >= 0.75 ? '#ff4a30' : heat >= 0.4 ? '#ff9a3c' : '#ffd94d';
  hud.eyeFill.style.background = eyeColour;
  hud.eye.classList.toggle('alarm', world.alarmActive);
  if (world.hintTimer > 0) {
    hud.hint.textContent = world.hintOverride;
  } else if (state === 'play') {
    const chasing = world.guards.some((g) => g.mode === 'chase');
    const curious = world.guards.some((g) => g.suspicion >= 0.4);
    if (world.alarmActive) {
      hud.hint.textContent = 'The alarm is up — break every line of sight until it fades.';
    } else if (chasing) {
      hud.hint.textContent = 'RUN — and break his line of sight. He will search where he last saw you.';
    } else if (curious) {
      hud.hint.textContent = 'A guard is suspicious — slip behind cover and let him cool down.';
    } else if (world.targetTaken) {
      hud.hint.textContent = 'Target secured — reach the green EXIT doors.';
    } else {
      hud.hint.textContent = 'Cross the gallery unseen. Rugs are shadow; pedestals and statues block sight.';
    }
  }
}

// ----------------------------------------------------------------- input

// togglePause flips between play and paused, from key or button.
function togglePause() {
  if (state === 'play') {
    state = 'paused';
    setPanel('pause');
  } else if (state === 'paused') {
    state = 'play';
    setPanel(null);
  }
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  const isArrow = key.startsWith('arrow');
  if (isArrow || key === ' ') event.preventDefault();
  sound.ensure();
  keys.add(key);
  if (key === 'p' || key === 'escape') togglePause();
  if (key === 'm') flipMute();
  if (key === 'r' && state === 'caught') restartLevel();
  if (key === 'enter' && state === 'clear') advanceFromClear();
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase());
});

function flipMute() {
  sound.setMuted(!sound.muted);
  el('btn-mute').textContent = sound.muted ? 'SOUND OFF' : 'SOUND ON';
}

function advanceFromClear() {
  if (levelIndex + 1 < LEVELS.length) {
    startLevel(levelIndex + 1, world.score);
  } else {
    onComplete();
  }
}

// Buttons: one row per button, its handler beside it.
const BUTTON_ACTIONS = [
  ['btn-pause', () => { sound.ensure(); togglePause(); }],
  ['btn-restart', () => { sound.ensure(); if (world) restartLevel(); }],
  ['btn-mute', () => { sound.ensure(); flipMute(); }],
  ['btn-retry-caught', restartLevel],
  ['btn-menu-caught', backToTitle],
  ['btn-next', advanceFromClear],
  ['btn-retry-clear', restartLevel],
  ['btn-menu-clear', backToTitle],
  ['btn-resume', () => { state = 'play'; setPanel(null); }],
  ['btn-restart-pause', restartLevel],
  ['btn-menu-pause', backToTitle],
  ['btn-again', () => startLevel(0, 0)],
  ['btn-menu-complete', backToTitle],
];
for (const [id, handler] of BUTTON_ACTIONS) {
  el(id).addEventListener('click', handler);
}

const levelButtons = el('level-buttons');
LEVELS.forEach((level, i) => {
  const button = document.createElement('button');
  button.className = 'level-btn';
  button.dataset.index = String(i);
  button.innerHTML = `<b>Gallery ${i + 1}</b><span>${level.name}</span>`;
  button.addEventListener('click', () => { sound.ensure(); sound.click(); startLevel(i, 0); });
  levelButtons.appendChild(button);
});

function backToTitle() {
  state = 'title';
  world = makeWorld(0);
  world.score = 0;
  setPanel('title');
  refreshLevelButtons();
  paintHud(true);
}

function refreshLevelButtons() {
  const buttons = levelButtons.querySelectorAll('.level-btn');
  for (const button of buttons) {
    const i = Number(button.dataset.index);
    const locked = i > unlocked;
    button.disabled = locked;
    button.classList.toggle('locked', locked);
  }
}

// ------------------------------------------------------- staged captures

// The four staged scenes, as data: which gallery, how far in, which
// gems are already lifted, where the thief stands and how she faces,
// where each posed guard stands, and what the hint bar says. stageShot
// below poses the real game from one of these rows — the starter's
// ?shot= hook, kept. Each scene is a real state of the real game (posed
// figures, real cones), never a drawing.
const SHOT_SCENES = {
  cover: {
    level: 0, elapsed: 42, gems: [[3, 10], [12, 5]],
    thief: { tx: 11, ty: 8, facing: Math.PI, sneaking: true },
    guards: [{ i: 0, tx: 15, ty: 3, faceThief: true, suspicion: 0.45, mode: 'curious' }],
    maxSuspicion: 0.45,
    hint: 'A guard is suspicious — slip behind cover and let him cool down.',
  },
  vault: {
    level: 2, elapsed: 68, gems: [[3, 2], [24, 2]],
    thief: { tx: 19, ty: 7, facing: Math.PI, sneaking: true },
    cameraFacing: 0.45,
    guards: [{ i: 1, tx: 14, ty: 8, facing: Math.PI, suspicion: 0.12 }],
    maxSuspicion: 0.12,
    hint: 'One camera watches the vault — cross while its cone sweeps away.',
  },
  alarm: {
    level: 1, elapsed: 57, gems: [[3, 1], [22, 2]],
    thief: { tx: 17, ty: 4, facing: 0, moving: true },
    guards: [
      { i: 0, tx: 13, ty: 4, facing: 0, suspicion: 1, mode: 'chase' },
      { i: 2, suspicion: 0.5 },
    ],
    maxSuspicion: 1, alarm: true,
    hint: 'RUN — and break his line of sight. He will search where he last saw you.',
  },
  clear: {
    level: 0, elapsed: 52, allGems: true, target: true, score: 1880,
    showClear: true,
  },
};

function stageShot(name) {
  const scene = SHOT_SCENES[name];
  if (!scene) return;
  levelIndex = scene.level;
  world = makeWorld(scene.level);
  world.score = 0;
  state = 'pose';
  world.state = 'pose';
  setPanel(null);
  for (const [gx, gy] of scene.gems ?? []) takeGemSilent(gx, gy);
  if (scene.allGems) {
    for (const gem of world.gems.values()) gem.taken = true;
    world.gemsTaken = world.gemTotal;
  }
  if (scene.target) {
    world.targetTaken = true;
    world.staticDirty = true;
  }
  world.elapsed = scene.elapsed;
  world.score = scene.score ?? world.score;
  if (scene.thief) {
    const middle = world.grid.tileCenter(scene.thief.tx, scene.thief.ty);
    world.player.x = middle.x;
    world.player.y = middle.y;
    world.player.facing = scene.thief.facing;
    world.player.sneaking = Boolean(scene.thief.sneaking);
    world.player.moving = Boolean(scene.thief.moving);
  }
  for (const pose of scene.guards ?? []) {
    const guard = world.guards[pose.i];
    if (pose.tx !== undefined) {
      const middle = world.grid.tileCenter(pose.tx, pose.ty);
      guard.x = middle.x;
      guard.y = middle.y;
    }
    if (pose.faceThief) {
      guard.facing = Math.atan2(world.player.y - guard.y, world.player.x - guard.x);
    } else if (pose.facing !== undefined) {
      guard.facing = pose.facing;
    }
    if (pose.suspicion !== undefined) guard.suspicion = pose.suspicion;
    if (pose.mode) guard.mode = pose.mode;
  }
  if (scene.cameraFacing !== undefined && world.cameras[0]) {
    world.cameras[0].facing = world.cameras[0].base + scene.cameraFacing;
  }
  if (scene.maxSuspicion !== undefined) world.maxSuspicion = scene.maxSuspicion;
  if (scene.alarm) world.alarmActive = true;
  if (scene.hint) flashHint(scene.hint, 999);
  if (scene.showClear) {
    document.getElementById('clear-title').textContent = 'The Marble Hall — cleared';
    document.getElementById('clear-stars').textContent = '★★★';
    document.getElementById('clear-rows').innerHTML = [
      ['The Moonstone Brooch', '+500'],
      ['Gems — 4 of 4', '+400'],
      ['Time bonus (0:52 against par 1:15)', '+230'],
      ['Ghost bonus — never truly seen', '+750'],
      ['Total score', '1880'],
    ].map(([label, value]) => `<div class="row"><span>${label}</span><b>${value}</b></div>`).join('');
    document.getElementById('btn-next').textContent = 'Next gallery →';
    setPanel('clear');
  }
  paintHud(true);
}

function takeGemSilent(tx, ty) {
  const gem = world.gems.get(tx + ',' + ty);
  if (gem && !gem.taken) {
    gem.taken = true;
    world.gemsTaken++;
    world.score += 100;
    world.staticDirty = true;
  }
}

// ------------------------------------------------------------------ loop

// idleTitle runs the museum behind the menu: guards patrol, cameras
// sweep, and nobody is there to catch — a dummy thief far off-map.
function idleTitle(dt) {
  const dummy = { x: -9999, y: -9999, moving: false, sneaking: true, inShadow: () => true };
  world.elapsed += dt;
  const quiet = { onStep() {}, onShout() {} };
  for (const guard of world.guards) guard.update(dt, dummy, quiet);
  for (const camera of world.cameras) camera.update(dt, world.elapsed);
}

function frame(timestamp) {
  const dt = Math.min(0.033, (timestamp - lastTimestamp) / 1000 || 0);
  lastTimestamp = timestamp;
  if (world) {
    world.state = state;
    if (state === 'play') updatePlay(dt);
    else if (state === 'title') idleTitle(dt);
    drawWorld(ctx, world);
  }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ boot

world = makeWorld(0);
world.score = 0;
setPanel('title');
refreshLevelButtons();
paintHud(true);

const shot = new URLSearchParams(window.location.search).get('shot');
if (shot) stageShot(shot);

// Hooks for the maker's own playtest driver: real state, honestly read.
window.VH = {
  get state() { return state; },
  get world() { return world; },
  startLevel,
  stageShot,
  LEVELS,
};

requestAnimationFrame(frame);
