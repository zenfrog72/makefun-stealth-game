// vision.js — the museum grid, line of sight, cone geometry, movement.
//
// Everything in Velvet Hour is measured in 40 px tiles. Walls and tall
// cover (#, C, S, B) block both feet and eyes; the rest of the floor lets
// both through. A guard's cone is drawn from the same ray march the
// detection code runs, so the amber shape on screen is exactly what the
// guard can see — no lies, no surprises.

export const TILE = 40;

const SIGHT_BLOCKERS = new Set(['#', 'C', 'S', 'B']);
const MOVE_BLOCKERS = new Set(['#', 'C', 'S', 'B']);

// makeGrid wraps a level's rows of characters in the queries the game
// needs: what tile is here, does it block sight or feet, where is its
// centre in pixels.
export function makeGrid(rows) {
  const width = rows[0].length;
  const height = rows.length;
  return {
    rows,
    width,
    height,
    tileAt(tx, ty) {
      if (tx < 0 || ty < 0 || tx >= width || ty >= height) return '#';
      return rows[ty][tx];
    },
    blocksSight(tx, ty) {
      return SIGHT_BLOCKERS.has(this.tileAt(tx, ty));
    },
    blocksMove(tx, ty) {
      return MOVE_BLOCKERS.has(this.tileAt(tx, ty));
    },
    // Pixel-space test: is this point inside a tile that blocks feet?
    pointBlocked(px, py) {
      return this.blocksMove(Math.floor(px / TILE), Math.floor(py / TILE));
    },
    tileCenter(tx, ty) {
      return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
    },
  };
}

// hasLineOfSight walks from eye to target in 6 px steps. A step that
// lands in a sight-blocking tile breaks the line — except the tiles the
// two endpoints stand on, which never block: a guard does not lose you
// because you are hugging the far side of a pedestal.
export function hasLineOfSight(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const steps = Math.ceil(dist / 6);
  const startTileX = Math.floor(x0 / TILE);
  const startTileY = Math.floor(y0 / TILE);
  const endTileX = Math.floor(x1 / TILE);
  const endTileY = Math.floor(y1 / TILE);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((x0 + dx * t) / TILE);
    const ty = Math.floor((y0 + dy * t) / TILE);
    if (tx === startTileX && ty === startTileY) continue;
    if (tx === endTileX && ty === endTileY) continue;
    if (grid.blocksSight(tx, ty)) return false;
  }
  return true;
}

// conePolygon fans 31 rays out from the eye across the field of view;
// each ray marches 6 px at a time until it hits a sight blocker or runs
// out of range. Eye plus ray ends is the polygon the renderer fills.
export function conePolygon(grid, eyeX, eyeY, facing, halfFov, range) {
  const points = [{ x: eyeX, y: eyeY }];
  const rays = 30;
  for (let i = 0; i <= rays; i++) {
    const angle = facing - halfFov + (2 * halfFov * i) / rays;
    const stepX = Math.cos(angle);
    const stepY = Math.sin(angle);
    let travelled = 0;
    let px = eyeX;
    let py = eyeY;
    while (travelled < range) {
      px += stepX * 6;
      py += stepY * 6;
      travelled += 6;
      if (grid.blocksSight(Math.floor(px / TILE), Math.floor(py / TILE))) break;
    }
    points.push({ x: px, y: py });
  }
  return points;
}

// slideMove walks a circle of the given radius by (dx, dy), one axis at
// a time. An axis whose leading edge would enter a blocking tile is
// cancelled, so bodies slide along walls and pedestals instead of
// sticking to them.
export function slideMove(grid, x, y, radius, dx, dy) {
  const clear = (px, py) => !grid.pointBlocked(px, py);
  if (dx !== 0) {
    const nx = x + dx;
    const lead = nx + Math.sign(dx) * radius;
    if (clear(lead, y - radius * 0.7) && clear(lead, y) && clear(lead, y + radius * 0.7)) {
      x = nx;
    }
  }
  if (dy !== 0) {
    const ny = y + dy;
    const lead = ny + Math.sign(dy) * radius;
    if (clear(x - radius * 0.7, lead) && clear(x, lead) && clear(x + radius * 0.7, lead)) {
      y = ny;
    }
  }
  return { x, y };
}

// angleDistance is the smallest absolute difference between two
// headings, wrapped to [0, PI].
export function angleDistance(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// turnToward rotates a heading toward a target heading by at most
// maxStep radians, always taking the short way round the circle.
export function turnToward(current, target, maxStep) {
  let d = (target - current) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}
