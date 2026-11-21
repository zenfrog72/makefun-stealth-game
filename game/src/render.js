// render.js — draws one frame of the museum.
//
// The still parts of a level (marble, rugs, walls, cover, cases, doors)
// are painted once onto a static layer; each frame then adds what moves:
// the thief's safety glow, the vision cones — amber for guards, cooling
// to red as suspicion climbs, pale cyan for cameras — the figures, their
// "?" and "!" bubbles, and floating score text. The cone polygons come
// from the same raycasts detection uses, so the picture never lies.

import { TILE, conePolygon } from './vision.js';
import { GUARD_RANGE, GUARD_HALF_FOV, CAMERA_RANGE, CAMERA_HALF_FOV } from './guards.js';
import {
  drawFloor, drawRug, drawWall, drawPedestal, drawStatue, drawPlanter,
  drawGemCase, drawTargetCase, drawExit, drawGuardFigure, drawThiefFigure, drawSpeechMark,
} from './art.js';

// buildStaticLayer paints everything about a level that only changes
// when something is picked up.
export function buildStaticLayer(world) {
  const { grid } = world;
  const layer = document.createElement('canvas');
  layer.width = grid.width * TILE;
  layer.height = grid.height * TILE;
  const ctx = layer.getContext('2d');
  // The room's surround: a dark apron beyond the walls.
  ctx.fillStyle = '#171126';
  ctx.fillRect(0, 0, layer.width, layer.height);
  for (let ty = 0; ty < grid.height; ty++) {
    for (let tx = 0; tx < grid.width; tx++) {
      const ch = grid.tileAt(tx, ty);
      if (ch === '#') { drawWall(ctx, tx, ty); continue; }
      if (ch === ',') drawRug(ctx, tx, ty); else drawFloor(ctx, tx, ty);
      const cx = tx * TILE + TILE / 2;
      const cy = ty * TILE + TILE / 2;
      if (ch === 'C') drawPedestal(ctx, tx, ty);
      else if (ch === 'S') drawStatue(ctx, tx, ty);
      else if (ch === 'B') drawPlanter(ctx, tx, ty);
      else if (ch === 'E') drawExit(ctx, tx, ty, world.targetTaken);
      else if (ch === 'g') {
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

// conePath traces one vision cone as a canvas path.
function conePath(ctx, grid, x, y, facing, halfFov, range) {
  const points = conePolygon(grid, x, y, facing, halfFov, range);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

// suspicionColour blends a cone's amber toward alarm red.
function suspicionColour(suspicion, alpha) {
  const g = Math.round(176 - suspicion * 112);
  const b = Math.round(66 - suspicion * 30);
  return `rgba(255, ${g}, ${b}, ${alpha})`;
}

// drawWorld paints the whole frame onto the page canvas.
export function drawWorld(ctx, world) {
  const { grid, player } = world;
  ctx.fillStyle = '#0b0e1a';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.translate(world.ox, world.oy);
  if (world.staticDirty || !world.staticLayer) {
    world.staticLayer = buildStaticLayer(world);
    world.staticDirty = false;
  }
  ctx.drawImage(world.staticLayer, 0, 0);

  // The thief's safety glow: a soft teal ring while no eye can see him.
  if (world.playerHidden) {
    const glow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 30);
    glow.addColorStop(0, 'rgba(64, 224, 200, 0.30)');
    glow.addColorStop(1, 'rgba(64, 224, 200, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 30, 0, Math.PI * 2);
    ctx.fill();
  }
  // Walking feet throw a faint noise ring, as far as a guard can hear.
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
    conePath(ctx, grid, camera.x, camera.y, camera.facing, CAMERA_HALF_FOV, CAMERA_RANGE);
    ctx.fillStyle = `rgba(120, 215, 255, ${camera.seeing > 0 ? 0.30 : 0.16})`;
    ctx.fill();
  }
  for (const guard of world.guards) {
    conePath(ctx, grid, guard.x, guard.y, guard.facing, GUARD_HALF_FOV, GUARD_RANGE);
    ctx.fillStyle = suspicionColour(guard.suspicion, 0.26);
    ctx.fill();
    ctx.strokeStyle = suspicionColour(guard.suspicion, 0.35);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Cameras: a dark dome and a lens that follows the sweep.
  for (const camera of world.cameras) {
    ctx.fillStyle = '#23232e';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = camera.seeing > 0 ? '#ff5a3c' : '#9adfff';
    ctx.beginPath();
    ctx.arc(camera.x + Math.cos(camera.facing) * 4.5, camera.y + Math.sin(camera.facing) * 4.5, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

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

  ctx.font = 'bold 14px Georgia, serif';
  ctx.textAlign = 'center';
  for (const floater of world.floaters) {
    ctx.fillStyle = `rgba(255, 217, 77, ${1 - floater.age / floater.life})`;
    ctx.fillText(floater.text, floater.x, floater.y - floater.age * 26);
  }
  ctx.restore();

  // Vignette, and the alarm's red pulse at the frame's edge.
  const vignette = ctx.createRadialGradient(620, 400, 320, 620, 400, 760);
  vignette.addColorStop(0, 'rgba(4, 4, 12, 0)');
  vignette.addColorStop(1, 'rgba(4, 4, 12, 0.38)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (world.alarmActive) {
    const pulse = 0.35 + Math.sin(world.elapsed * 9) * 0.18;
    ctx.strokeStyle = `rgba(255, 46, 30, ${pulse})`;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, ctx.canvas.width - 10, ctx.canvas.height - 10);
    ctx.fillStyle = `rgba(255, 46, 30, ${0.55 + Math.sin(world.elapsed * 9) * 0.2})`;
    ctx.font = 'bold 21px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('— ALARM —', ctx.canvas.width / 2, 34);
  }
}
