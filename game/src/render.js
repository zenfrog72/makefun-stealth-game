// render.js — draws one frame of the museum.
//
// The still parts of a level (marble, rugs, walls, cover, cases, doors)
// are painted once onto a static layer; each frame then adds what
// moves: the thief's safety glow, the vision cones — amber for guards,
// reddening as suspicion climbs, pale cyan for cameras — the figures,
// their "?" and "!" bubbles, and floating score text. The cone polygons
// come from the same raycasts detection uses, so the picture never lies.

import { TILE, conePolygon } from './vision.js';
import { GUARD_RANGE, GUARD_HALF_FOV, CAMERA_RANGE, CAMERA_HALF_FOV } from './guards.js';
import {
  drawFloor, drawRug, drawWall, drawPedestal, drawStatue, drawPlanter,
  drawGemCase, drawTargetCase, drawExit, drawGuardFigure, drawThiefFigure, drawSpeechMark,
} from './art.js';

// buildStaticLayer paints everything about a level that only changes
// when something is picked up: floor, walls, cover, cases and doors.
// Which painter each cover character maps to.
const COVER_PAINTERS = {
  C: drawPedestal,
  S: drawStatue,
  B: drawPlanter,
};

export function buildStaticLayer(world) {
  const grid = world.grid;
  const layer = document.createElement('canvas');
  layer.width = grid.width * TILE;
  layer.height = grid.height * TILE;
  const ctx = layer.getContext('2d');
  // A dark apron surrounds the room beyond its walls.
  ctx.fillStyle = '#171126';
  ctx.fillRect(0, 0, layer.width, layer.height);
  for (let ty = 0; ty < grid.height; ty++) {
    for (let tx = 0; tx < grid.width; tx++) {
      const ch = grid.tileAt(tx, ty);
      if (ch === '#') {
        drawWall(ctx, tx, ty);
        continue;
      }
      if (ch === ',') drawRug(ctx, tx, ty);
      else drawFloor(ctx, tx, ty);
      const cx = tx * TILE + TILE / 2;
      const cy = ty * TILE + TILE / 2;
      const cover = COVER_PAINTERS[ch];
      if (cover) {
        cover(ctx, tx, ty);
      } else if (ch === 'E') {
        drawExit(ctx, tx, ty, world.targetTaken);
      } else if (ch === 'g') {
        const gem = world.gems.get(tx + ',' + ty);
        drawGemCase(ctx, cx, cy, gem ? gem.taken : false, tx + ty);
      } else if (ch === 'T') {
        drawTargetCase(ctx, cx, cy, world.targetTaken, world.elapsed);
      }
    }
  }
  // A gold inlay line just inside the walls frames the room.
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(TILE + 3, TILE + 3, (grid.width - 2) * TILE - 6, (grid.height - 2) * TILE - 6);
  return layer;
}

// Trace one vision cone as a canvas path.
function traceCone(ctx, grid, x, y, facing, halfFov, range) {
  const outline = conePolygon(grid, x, y, facing, halfFov, range);
  ctx.beginPath();
  ctx.moveTo(outline[0].x, outline[0].y);
  for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i].x, outline[i].y);
  ctx.closePath();
}

// Blend a cone's amber toward alarm red as suspicion climbs.
function coneColour(suspicion, alpha) {
  const green = Math.round(176 - suspicion * 112);
  const blue = Math.round(66 - suspicion * 30);
  return `rgba(255, ${green}, ${blue}, ${alpha})`;
}

// paintCameras draws each camera's dome and the lens dot that follows
// its sweep — red while it is seeing the thief.
function paintCameras(ctx, world) {
  for (const camera of world.cameras) {
    ctx.fillStyle = '#23232e';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const lensX = camera.x + Math.cos(camera.facing) * 4.5;
    const lensY = camera.y + Math.sin(camera.facing) * 4.5;
    ctx.fillStyle = camera.seeing > 0 ? '#ff5a3c' : '#9adfff';
    ctx.beginPath();
    ctx.arc(lensX, lensY, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// paintFloaters draws the rising "+100" score texts, fading with age.
function paintFloaters(ctx, world) {
  ctx.font = 'bold 14px Georgia, serif';
  ctx.textAlign = 'center';
  for (const floater of world.floaters) {
    const fade = 1 - floater.age / floater.life;
    ctx.fillStyle = `rgba(255, 217, 77, ${fade})`;
    ctx.fillText(floater.text, floater.x, floater.y - floater.age * 26);
  }
}

// paintFrame adds the vignette darkening the frame's edge, and the
// alarm's red pulse while the alarm is up.
function paintFrame(ctx, world) {
  const shade = ctx.createRadialGradient(620, 400, 320, 620, 400, 760);
  shade.addColorStop(0, 'rgba(4, 4, 12, 0)');
  shade.addColorStop(1, 'rgba(4, 4, 12, 0.38)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (!world.alarmActive) return;
  const beat = Math.sin(world.elapsed * 9);
  ctx.strokeStyle = `rgba(255, 46, 30, ${0.35 + beat * 0.18})`;
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, ctx.canvas.width - 10, ctx.canvas.height - 10);
  ctx.fillStyle = `rgba(255, 46, 30, ${0.55 + beat * 0.2})`;
  ctx.font = 'bold 21px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('— ALARM —', ctx.canvas.width / 2, 34);
}

// drawWorld paints the whole frame onto the page canvas.
export function drawWorld(ctx, world) {
  const grid = world.grid;
  const player = world.player;
  ctx.fillStyle = '#0b0e1a';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.translate(world.ox, world.oy);
  if (world.staticDirty || !world.staticLayer) {
    world.staticLayer = buildStaticLayer(world);
    world.staticDirty = false;
  }
  ctx.drawImage(world.staticLayer, 0, 0);

  // The thief's safety glow: a soft teal ring while no eye can see her.
  if (world.playerHidden) {
    const glow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 30);
    glow.addColorStop(0, 'rgba(64, 224, 200, 0.30)');
    glow.addColorStop(1, 'rgba(64, 224, 200, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 30, 0, Math.PI * 2);
    ctx.fill();
  }
  // Walking feet throw a faint dashed noise ring, as far as a guard can hear.
  if (player.moving && !player.sneaking && world.state === 'play') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, TILE * 2.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Camera cones first (pale cyan), then guard cones over them.
  for (const camera of world.cameras) {
    traceCone(ctx, grid, camera.x, camera.y, camera.facing, CAMERA_HALF_FOV, CAMERA_RANGE);
    ctx.fillStyle = `rgba(120, 215, 255, ${camera.seeing > 0 ? 0.30 : 0.16})`;
    ctx.fill();
  }
  for (const guard of world.guards) {
    traceCone(ctx, grid, guard.x, guard.y, guard.facing, GUARD_HALF_FOV, GUARD_RANGE);
    ctx.fillStyle = coneColour(guard.suspicion, 0.26);
    ctx.fill();
    ctx.strokeStyle = coneColour(guard.suspicion, 0.35);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Cameras: a dark dome and a lens dot that follows the sweep.
  paintCameras(ctx, world);

  // Guards, then the thief, then their marks and messages.
  for (const guard of world.guards) {
    drawGuardFigure(ctx, guard.x, guard.y, guard.facing, guard.suspicion);
    if (guard.mode === 'chase' || guard.mode === 'search') {
      drawSpeechMark(ctx, guard.x, guard.y - 27, '!', '#c22e1f');
    } else if (guard.suspicion >= 0.38) {
      drawSpeechMark(ctx, guard.x, guard.y - 27, '?', '#b07d10');
    }
  }
  drawThiefFigure(ctx, player.x, player.y, player.facing, player.sneaking, world.playerHidden);

  paintFloaters(ctx, world);
  ctx.restore();

  paintFrame(ctx, world);
}
