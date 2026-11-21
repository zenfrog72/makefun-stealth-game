// art.js — every painter for the museum: tiles, props, cases, figures.
//
// Flat vector canvas art, drawn entirely from code — no image assets.
// The colours are chosen so the stealth reads at a glance: warm ivory
// marble where the light falls, deep burgundy rugs where it does not,
// crimson guards against both, a teal thief, amber cones. Decorative
// detail (marble veins, rug diamonds) is seeded by tile coordinates, so
// every render of a level comes out identical.
//
// Two tiny helpers do most of the drawing: box() fills a rectangle in
// one colour, disc() fills a circle, and ring() strokes one. The
// painters below read as a list of shapes, not a list of canvas calls.

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

// box fills a rectangle in the given colour.
function box(ctx, x, y, w, h, style) {
  ctx.fillStyle = style;
  ctx.fillRect(x, y, w, h);
}

// disc fills a circle in the given colour.
function disc(ctx, x, y, r, style) {
  ctx.fillStyle = style;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// ring strokes a circle in the given colour and width.
function ring(ctx, x, y, r, style, width) {
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

// One lit marble tile: two alternating ivory tones, a grout line, and —
// on seeded tiles — a single faint vein stroke across the diagonal.
export function drawFloor(ctx, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  box(ctx, x, y, TILE, TILE, (tx + ty) % 2 === 0 ? '#ddd3bf' : '#d3c8b0');
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
  box(ctx, x, y, TILE, TILE, '#571f31');
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
  box(ctx, x, y, TILE, TILE, '#3a2c44');
  box(ctx, x, y, TILE, 9, '#54436a');
  box(ctx, x, y + 9, TILE, 2, 'rgba(201, 162, 39, 0.65)');
  box(ctx, x, y + TILE - 5, TILE, 5, 'rgba(0, 0, 0, 0.25)');
}

// A display pedestal (cover): stone body, gold band, and a small
// artefact resting on top, its colour varied by the tile's seed.
export function drawPedestal(ctx, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  box(ctx, x + 3, y + TILE - 7, TILE - 4, 5, 'rgba(0,0,0,0.18)');
  box(ctx, x + 5, y + 10, TILE - 10, TILE - 12, '#8d8578');
  box(ctx, x + 3, y + 4, TILE - 6, 8, '#a39a89');
  box(ctx, x + 3, y + 12, TILE - 6, 2, GOLD);
  const seed = tileSeed(tx, ty);
  const orb = seed > 0.66 ? '#7fb3c8' : seed > 0.33 ? '#c87f9a' : '#9ac87f';
  disc(ctx, x + TILE / 2, y + 1, 4.5, orb);
}

// A statue (tall cover): plinth and a robed figure rising from it.
export function drawStatue(ctx, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  const cx = x + TILE / 2;
  box(ctx, x + 2, y + TILE - 6, TILE - 3, 5, 'rgba(0,0,0,0.20)');
  box(ctx, x + 6, y + TILE - 12, TILE - 12, 10, '#6f6a72');
  disc(ctx, cx, y + 9, 6, '#8b8694');
  ctx.fillStyle = '#8b8694';
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
  box(ctx, x + 4, y + TILE - 13, TILE - 8, 10, '#9a5a3c');
  const dark = [[13, 15, 10], [27, 13, 11], [20, 22, 12], [11, 24, 8], [29, 24, 8]];
  const light = [[16, 14, 6], [25, 18, 7], [20, 10, 5]];
  for (const blob of dark) disc(ctx, x + blob[0], y + blob[1], blob[2], '#2e6b3e');
  for (const blob of light) disc(ctx, x + blob[0], y + blob[1], blob[2], '#3c8a50');
}

// A glass loot case at a tile centre: pale glass box and the coloured
// gem inside. A taken case is drawn empty and dim.
const GEM_HUES = ['#57c7e3', '#e3577a', '#7ae38a', '#e3c357', '#b57ae3', '#e38a57', '#57e3c7'];
export function drawGemCase(ctx, cx, cy, taken, seedIndex) {
  const glass = taken ? 'rgba(160, 170, 180, 0.25)' : 'rgba(170, 220, 240, 0.30)';
  const edge = taken ? 'rgba(120, 125, 135, 0.5)' : 'rgba(220, 245, 255, 0.85)';
  box(ctx, cx - 13, cy - 13, 26, 26, glass);
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
  box(ctx, cx - 16, cy - 16, 32, 32, glass);
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
  box(ctx, x + 3, y + 3, TILE - 6, TILE - 3, open ? '#1f9d63' : '#17694a');
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
  box(ctx, x + TILE / 2 - 4, y + TILE / 2 + 1, 8, 7, '#2b2b33');
  ctx.strokeStyle = '#cfd3da';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + TILE / 2 + 1, 3.4, Math.PI, 0);
  ctx.stroke();
}

// One guard: crimson coat, gold trim, peaked cap, facing the given
// heading. Full suspicion tints the trim alarm red.
export function drawGuardFigure(ctx, x, y, facing, suspicion) {
  // The shadow is an ellipse, not a disc, so it is painted by hand.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 11, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  disc(ctx, x, y, 13, '#a31621');
  ring(ctx, x, y, 13, suspicion >= 1 ? '#ff5a3c' : GOLD, 2);
  // Shoulders and cap, rotated to the heading.
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);
  box(ctx, 2, -10, 9, 20, '#7d1019');
  disc(ctx, 3, 0, 6.5, '#2b2b33');
  box(ctx, 7, -4.5, 4, 9, GOLD);
  ctx.restore();
  disc(ctx, x + Math.cos(facing) * 4, y + Math.sin(facing) * 4, 4.6, '#f3d9c8');
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
  disc(ctx, x, y, 12, sneaking ? '#0f5e63' : '#12808a');
  ring(ctx, x, y, 12, '#0a3d42', 2);
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
  disc(ctx, 3.5, 0, 4.2, '#e8c39a');
  // Satchel on the back.
  box(ctx, -11, -4, 6, 8, '#8a5a2b');
  ctx.restore();
  ctx.globalAlpha = 1;
}

// The "?" or "!" bubble over a guard's head.
export function drawSpeechMark(ctx, x, y, mark, colour) {
  disc(ctx, x, y, 9, 'rgba(255, 252, 240, 0.95)');
  ring(ctx, x, y, 9, colour, 1.5);
  ctx.fillStyle = colour;
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mark, x, y + 0.5);
  ctx.textBaseline = 'alphabetic';
}
