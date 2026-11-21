// art.js — every painter for the museum: tiles, props, cases, figures.
//
// Flat vector canvas art, drawn entirely from code — no image assets.
// The colours are chosen so the stealth reads at a glance: warm ivory
// marble where the light falls, deep burgundy rugs where it does not,
// crimson guards against both, a teal thief, amber cones. Decorative
// detail (marble veins, rug diamonds) is seeded by tile coordinates, so
// every render of a level comes out identical.

import { TILE } from './vision.js';

// tileSeed is a small deterministic hash of a tile's coordinates. It
// varies decoration from tile to tile without any randomness between
// frames.
export function tileSeed(tx, ty) {
  let h = (tx * 374761393 + ty * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

export const INK = '#241f2e';
export const GOLD = '#c9a227';

// One lit marble tile: two alternating ivory tones, a grout line, and —
// on seeded tiles — a single faint vein stroke across the diagonal.
export function drawFloor(ctx, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  const even = (tx + ty) % 2 === 0;
  ctx.fillStyle = even ? '#ddd3bf' : '#d3c8b0';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = 'rgba(120, 105, 80, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  if (tileSeed(tx, ty) <= 0.62) return;
  const bend = tileSeed(ty, tx) * 14 - 7;
  ctx.strokeStyle = 'rgba(150, 138, 112, 0.30)';
  ctx.beginPath();
  ctx.moveTo(x + 4, y + TILE - 6);
  ctx.quadraticCurveTo(x + TILE / 2, y + TILE / 2 + bend, x + TILE - 5, y + 5);
  ctx.stroke();
}

// One shadow tile: deep burgundy carpet with a darker edge and a small
// gold diamond at its heart — the museum's hiding places.
export function drawRug(ctx, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  ctx.fillStyle = '#571f31';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = 'rgba(20, 6, 12, 0.55)';
  ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  ctx.fillStyle = 'rgba(201, 162, 39, 0.5)';
  ctx.save();
  ctx.translate(x + TILE / 2, y + TILE / 2);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-3.5, -3.5, 7, 7);
  ctx.restore();
}

// One wall tile: a dark plum block with a lit top face, so the rooms
// read with a hint of height, a gold trim line and a shaded base.
export function drawWall(ctx, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  ctx.fillStyle = '#3a2c44';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#54436a';
  ctx.fillRect(x, y, TILE, 9);
  ctx.fillStyle = 'rgba(201, 162, 39, 0.65)';
  ctx.fillRect(x, y + 9, TILE, 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(x, y + TILE - 5, TILE, 5);
}

// A display pedestal (cover): stone body, gold band, and a small
// artefact resting on top, its colour varied by the tile's seed.
export function drawPedestal(ctx, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x + 3, y + TILE - 7, TILE - 4, 5);
  ctx.fillStyle = '#8d8578';
  ctx.fillRect(x + 5, y + 10, TILE - 10, TILE - 12);
  ctx.fillStyle = '#a39a89';
  ctx.fillRect(x + 3, y + 4, TILE - 6, 8);
  ctx.fillStyle = GOLD;
  ctx.fillRect(x + 3, y + 12, TILE - 6, 2);
  const seed = tileSeed(tx, ty);
  const orb = seed > 0.66 ? '#7fb3c8' : seed > 0.33 ? '#c87f9a' : '#9ac87f';
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + 1, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

// A statue (tall cover): plinth and a robed figure rising from it.
export function drawStatue(ctx, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  const cx = x + TILE / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.20)';
  ctx.fillRect(x + 2, y + TILE - 6, TILE - 3, 5);
  ctx.fillStyle = '#6f6a72';
  ctx.fillRect(x + 6, y + TILE - 12, TILE - 12, 10);
  ctx.fillStyle = '#8b8694';
  ctx.beginPath();
  ctx.arc(cx, y + 9, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 8, y + TILE - 12);
  ctx.quadraticCurveTo(cx - 6, y + 14, cx, y + 13);
  ctx.quadraticCurveTo(cx + 6, y + 14, cx + 8, y + TILE - 12);
  ctx.closePath();
  ctx.fill();
}

// A planter (cover): terracotta box under a green canopy of blobs.
export function drawPlanter(ctx, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  ctx.fillStyle = '#9a5a3c';
  ctx.fillRect(x + 4, y + TILE - 13, TILE - 8, 10);
  const dark = [[13, 15, 10], [27, 13, 11], [20, 22, 12], [11, 24, 8], [29, 24, 8]];
  const light = [[16, 14, 6], [25, 18, 7], [20, 10, 5]];
  ctx.fillStyle = '#2e6b3e';
  for (const blob of dark) {
    ctx.beginPath();
    ctx.arc(x + blob[0], y + blob[1], blob[2], 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#3c8a50';
  for (const blob of light) {
    ctx.beginPath();
    ctx.arc(x + blob[0], y + blob[1], blob[2], 0, Math.PI * 2);
    ctx.fill();
  }
}

// A glass loot case at a tile centre: pale glass box and the coloured
// gem inside. A taken case is drawn empty and dim.
const GEM_HUES = ['#57c7e3', '#e3577a', '#7ae38a', '#e3c357', '#b57ae3', '#e38a57', '#57e3c7'];
export function drawGemCase(ctx, cx, cy, taken, seedIndex) {
  const glass = taken ? 'rgba(160, 170, 180, 0.25)' : 'rgba(170, 220, 240, 0.30)';
  const edge = taken ? 'rgba(120, 125, 135, 0.5)' : 'rgba(220, 245, 255, 0.85)';
  ctx.fillStyle = glass;
  ctx.fillRect(cx - 13, cy - 13, 26, 26);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - 13, cy - 13, 26, 26);
  if (taken) return;
  ctx.fillStyle = GEM_HUES[seedIndex % GEM_HUES.length];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-6, -6, 12, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(-6, -6, 6, 6);
  ctx.restore();
}

// The level's prize: a larger gold-trimmed case holding a glowing star
// artefact that breathes with the level clock.
export function drawTargetCase(ctx, cx, cy, taken, pulse) {
  const glass = taken ? 'rgba(160, 170, 180, 0.22)' : 'rgba(255, 226, 140, 0.28)';
  const edge = taken ? 'rgba(120, 125, 135, 0.5)' : GOLD;
  ctx.fillStyle = glass;
  ctx.fillRect(cx - 16, cy - 16, 32, 32);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - 16, cy - 16, 32, 32);
  if (taken) return;
  const radius = 9 + Math.sin(pulse * 3) * 1.2;
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  for (let point = 0; point < 10; point++) {
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const reach = point % 2 === 0 ? radius : radius * 0.45;
    const px = cx + Math.cos(angle) * reach;
    const py = cy + Math.sin(angle) * reach;
    if (point === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(146, 110, 10, 0.8)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// The exit doors on one tile: emerald double doors with a light spill
// above them and an EXIT label; a small padlock while the target is
// still in its case.
export function drawExit(ctx, tx, ty, open) {
  const x = tx * TILE;
  const y = ty * TILE;
  const spill = ctx.createLinearGradient(x, y + TILE, x, y);
  spill.addColorStop(0, open ? 'rgba(64, 224, 150, 0.50)' : 'rgba(64, 160, 120, 0.22)');
  spill.addColorStop(1, 'rgba(64, 224, 150, 0)');
  ctx.fillStyle = spill;
  ctx.fillRect(x - 2, y - 14, TILE + 4, TILE + 14);
  ctx.fillStyle = open ? '#1f9d63' : '#17694a';
  ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 3);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 3);
  ctx.beginPath();
  ctx.moveTo(x + TILE / 2, y + 3);
  ctx.lineTo(x + TILE / 2, y + TILE);
  ctx.stroke();
  ctx.fillStyle = '#ffe9a3';
  ctx.font = 'bold 8px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', x + TILE / 2, y + 12);
  if (open) return;
  ctx.fillStyle = '#2b2b33';
  ctx.fillRect(x + TILE / 2 - 4, y + TILE / 2 + 1, 8, 7);
  ctx.strokeStyle = '#cfd3da';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + TILE / 2 + 1, 3.4, Math.PI, 0);
  ctx.stroke();
}

// One guard: crimson coat, gold trim, peaked cap, facing the given
// heading. Full suspicion tints the trim alarm red.
export function drawGuardFigure(ctx, x, y, facing, suspicion) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 11, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a31621';
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = suspicion >= 1 ? '#ff5a3c' : GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Shoulders and cap, rotated to the heading.
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);
  ctx.fillStyle = '#7d1019';
  ctx.fillRect(2, -10, 9, 20);
  ctx.fillStyle = '#2b2b33';
  ctx.beginPath();
  ctx.arc(3, 0, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.fillRect(7, -4.5, 4, 9);
  ctx.restore();
  ctx.fillStyle = '#f3d9c8';
  ctx.beginPath();
  ctx.arc(x + Math.cos(facing) * 4, y + Math.sin(facing) * 4, 4.6, 0, Math.PI * 2);
  ctx.fill();
}

// The player: a teal hooded figure with a satchel; while hidden she
// sits a little dimmer, with a soft glow ring drawn by the renderer
// when no guard can see her.
export function drawThiefFigure(ctx, x, y, facing, sneaking, hidden) {
  ctx.globalAlpha = hidden ? 0.82 : 1;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + 11, 11, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = sneaking ? '#0f5e63' : '#12808a';
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0a3d42';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);
  // Hood point toward the heading, face in shadow beneath it.
  ctx.fillStyle = '#0a3d42';
  ctx.beginPath();
  ctx.moveTo(13, 0);
  ctx.lineTo(2, -7.5);
  ctx.lineTo(2, 7.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath();
  ctx.arc(3.5, 0, 4.2, 0, Math.PI * 2);
  ctx.fill();
  // Satchel on the back.
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(-11, -4, 6, 8);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// The "?" or "!" bubble over a guard's head.
export function drawSpeechMark(ctx, x, y, mark, colour) {
  ctx.fillStyle = 'rgba(255, 252, 240, 0.95)';
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = colour;
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mark, x, y + 0.5);
  ctx.textBaseline = 'alphabetic';
}
