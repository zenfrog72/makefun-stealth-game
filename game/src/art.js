// art.js — every painter for the museum: tiles, props, cases and figures.
//
// Flat vector canvas art, all drawn from code (no image assets). Colours
// are chosen so the stealth reads at a glance: warm ivory marble for lit
// floor, deep burgundy rugs for shadow, crimson guards against both, a
// teal thief, amber cones. Decorative detail (marble veins, rug diamonds)
// is seeded by tile coordinates so every render of a level is identical.

import { TILE } from './vision.js';

// tileSeed is a small deterministic hash of a tile's coordinates, used to
// vary decoration without any randomness between frames.
export function tileSeed(tx, ty) {
  let h = (tx * 374761393 + ty * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

export const INK = '#241f2e';
export const GOLD = '#c9a227';

// drawFloor paints one lit marble tile: two alternating ivory tones, a
// grout line, and — on seeded tiles — one faint vein stroke.
export function drawFloor(ctx, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  ctx.fillStyle = (tx + ty) % 2 === 0 ? '#ddd3bf' : '#d3c8b0';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = 'rgba(120, 105, 80, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  if (tileSeed(tx, ty) > 0.62) {
    ctx.strokeStyle = 'rgba(150, 138, 112, 0.30)';
    ctx.beginPath();
    const bend = tileSeed(ty, tx) * 14 - 7;
    ctx.moveTo(x + 4, y + TILE - 6);
    ctx.quadraticCurveTo(x + TILE / 2, y + TILE / 2 + bend, x + TILE - 5, y + 5);
    ctx.stroke();
  }
}

// drawRug paints one shadow tile: deep burgundy carpet with a darker
// border and a small gold diamond — the museum's hiding places.
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

// drawWall paints one wall tile: dark plum block with a lit top face, so
// the rooms read with a hint of height.
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

// drawPedestal paints a display pedestal (cover): stone body, gold band,
// and a small artefact resting on top, varied by seed.
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
  ctx.fillStyle = seed > 0.66 ? '#7fb3c8' : seed > 0.33 ? '#c87f9a' : '#9ac87f';
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + 1, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

// drawStatue paints a statue (tall cover): plinth and a robed figure.
export function drawStatue(ctx, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  ctx.fillStyle = 'rgba(0,0,0,0.20)';
  ctx.fillRect(x + 2, y + TILE - 6, TILE - 3, 5);
  ctx.fillStyle = '#6f6a72';
  ctx.fillRect(x + 6, y + TILE - 12, TILE - 12, 10);
  ctx.fillStyle = '#8b8694';
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + 9, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + TILE / 2 - 8, y + TILE - 12);
  ctx.quadraticCurveTo(x + TILE / 2 - 6, y + 14, x + TILE / 2, y + 13);
  ctx.quadraticCurveTo(x + TILE / 2 + 6, y + 14, x + TILE / 2 + 8, y + TILE - 12);
  ctx.closePath();
  ctx.fill();
}

// drawPlanter paints a planter (cover): terracotta box, green canopy.
export function drawPlanter(ctx, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  ctx.fillStyle = '#9a5a3c';
  ctx.fillRect(x + 4, y + TILE - 13, TILE - 8, 10);
  ctx.fillStyle = '#2e6b3e';
  for (const [dx, dy, r] of [[13, 15, 10], [27, 13, 11], [20, 22, 12], [11, 24, 8], [29, 24, 8]]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#3c8a50';
  for (const [dx, dy, r] of [[16, 14, 6], [25, 18, 7], [20, 10, 5]]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// drawGemCase paints a glass loot case at a tile centre: pale glass box
// and the coloured gem inside. A taken case is drawn empty and dim.
const GEM_HUES = ['#57c7e3', '#e3577a', '#7ae38a', '#e3c357', '#b57ae3', '#e38a57', '#57e3c7'];
export function drawGemCase(ctx, cx, cy, taken, seedIndex) {
  ctx.fillStyle = taken ? 'rgba(160, 170, 180, 0.25)' : 'rgba(170, 220, 240, 0.30)';
  ctx.fillRect(cx - 13, cy - 13, 26, 26);
  ctx.strokeStyle = taken ? 'rgba(120, 125, 135, 0.5)' : 'rgba(220, 245, 255, 0.85)';
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

// drawTargetCase paints the level's prize: a larger gold-trimmed case
// holding a glowing star artefact.
export function drawTargetCase(ctx, cx, cy, taken, pulse) {
  ctx.fillStyle = taken ? 'rgba(160, 170, 180, 0.22)' : 'rgba(255, 226, 140, 0.28)';
  ctx.fillRect(cx - 16, cy - 16, 32, 32);
  ctx.strokeStyle = taken ? 'rgba(120, 125, 135, 0.5)' : GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - 16, cy - 16, 32, 32);
  if (taken) return;
  const r = 9 + Math.sin(pulse * 3) * 1.2;
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(angle) * rad;
    const py = cy + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(146, 110, 10, 0.8)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// drawExit paints the exit doors on one tile: emerald double doors with a
// light spill; a small padlock while the target is still in its case.
export function drawExit(ctx, tx, ty, open) {
  const x = tx * TILE;
  const y = ty * TILE;
  const grad = ctx.createLinearGradient(x, y + TILE, x, y);
  grad.addColorStop(0, open ? 'rgba(64, 224, 150, 0.50)' : 'rgba(64, 160, 120, 0.22)');
  grad.addColorStop(1, 'rgba(64, 224, 150, 0)');
  ctx.fillStyle = grad;
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
  if (!open) {
    ctx.fillStyle = '#2b2b33';
    ctx.fillRect(x + TILE / 2 - 4, y + TILE / 2 + 1, 8, 7);
    ctx.strokeStyle = '#cfd3da';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + TILE / 2, y + TILE / 2 + 1, 3.4, Math.PI, 0);
    ctx.stroke();
  }
}

// drawGuardFigure paints one guard: crimson coat, gold trim, peaked cap,
// facing the given heading. Alertness tints the trim and adds a stance.
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

// drawThiefFigure paints the player: a teal hooded figure with a satchel;
// while hidden it sits a little lower and dimmer, with a soft glow ring
// drawn by the renderer when no guard can see it.
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

// drawSpeechMark paints the "?" or "!" bubble over a guard's head.
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
