// vision.js — geometry of seeing and moving on the museum grid.
//
// The museum is measured in 40-pixel tiles. Anything tall — a wall, a
// pedestal, a statue, a planter — stops both feet and eyes; the open
// floor lets both through. Every cone the renderer paints is grown by
// the same ray march the detection code walks, so the amber shape on
// the screen and the guard's actual sight are one and the same thing.

export const TILE = 40;

// Tiles that stop a glance, and tiles that stop a step. The two sets
// happen to hold the same four characters in this museum.
const BLOCKS_VIEW = new Set(['#', 'C', 'S', 'B']);
const BLOCKS_STEP = new Set(['#', 'C', 'S', 'B']);

// Wrap a level's rows of characters in the questions the game asks of
// them: which tile is at a coordinate, does it block sight or feet,
// where is the middle of it in pixels.
export function makeGrid(rows) {
  const grid = {
    rows,
    width: rows[0].length,
    height: rows.length,
    tileAt(tx, ty) {
      const outside = tx < 0 || ty < 0 || tx >= this.width || ty >= this.height;
      return outside ? '#' : this.rows[ty][tx];
    },
    blocksSight(tx, ty) {
      return BLOCKS_VIEW.has(this.tileAt(tx, ty));
    },
    blocksMove(tx, ty) {
      return BLOCKS_STEP.has(this.tileAt(tx, ty));
    },
    // Is this pixel inside a tile feet cannot enter?
    pointBlocked(px, py) {
      return this.blocksMove(Math.floor(px / TILE), Math.floor(py / TILE));
    },
    tileCenter(tx, ty) {
      return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
    },
  };
  return grid;
}

// Bring a heading into (-PI, PI] so two headings can be compared.
function wrapHeading(a) {
  let wrapped = a % (Math.PI * 2);
  if (wrapped > Math.PI) wrapped -= Math.PI * 2;
  if (wrapped <= -Math.PI) wrapped += Math.PI * 2;
  return wrapped;
}

// angleDistance is the smallest absolute gap between two headings.
export function angleDistance(a, b) {
  return Math.abs(wrapHeading(a - b));
}

// turnToward swings a heading toward a target heading by no more than
// maxStep radians, always taking the short way around the circle.
export function turnToward(current, target, maxStep) {
  const gap = wrapHeading(target - current);
  if (Math.abs(gap) <= maxStep) return target;
  return current + Math.sign(gap) * maxStep;
}

// hasLineOfSight steps from the eye to the target in 6-pixel hops and
// reports whether any hop lands inside a tile that blocks sight. The
// tiles the two endpoints stand on are forgiven: a guard does not lose
// you for pressing against the far side of a pedestal, only for having
// the pedestal between you.
export function hasLineOfSight(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const hops = Math.ceil(dist / 6);
  const fromX = Math.floor(x0 / TILE);
  const fromY = Math.floor(y0 / TILE);
  const toX = Math.floor(x1 / TILE);
  const toY = Math.floor(y1 / TILE);
  for (let hop = 1; hop < hops; hop++) {
    const t = hop / hops;
    const tx = Math.floor((x0 + dx * t) / TILE);
    const ty = Math.floor((y0 + dy * t) / TILE);
    const onEndpoint = (tx === fromX && ty === fromY) || (tx === toX && ty === toY);
    if (onEndpoint) continue;
    if (grid.blocksSight(tx, ty)) return false;
  }
  return true;
}

// conePolygon grows one vision cone: 31 rays fanned across the field of
// view, each marching 6 pixels at a time until a sight blocker stops it
// or it runs out of range. The eye plus the ray ends is the polygon the
// renderer fills.
export function conePolygon(grid, eyeX, eyeY, facing, halfFov, range) {
  const outline = [{ x: eyeX, y: eyeY }];
  const rayCount = 30;
  for (let ray = 0; ray <= rayCount; ray++) {
    const fraction = ray / rayCount;
    const heading = facing + (2 * fraction - 1) * halfFov;
    const stepX = Math.cos(heading);
    const stepY = Math.sin(heading);
    let px = eyeX;
    let py = eyeY;
    let travelled = 0;
    while (travelled < range) {
      px += stepX * 6;
      py += stepY * 6;
      travelled += 6;
      if (grid.blocksSight(Math.floor(px / TILE), Math.floor(py / TILE))) break;
    }
    outline.push({ x: px, y: py });
  }
  return outline;
}

// slideMove shifts a circle of the given radius by (dx, dy), one axis
// at a time. An axis whose leading edge would enter a blocking tile is
// dropped, so bodies slide along walls and pedestals instead of jamming
// against them.
export function slideMove(grid, x, y, radius, dx, dy) {
  const free = (px, py) => !grid.pointBlocked(px, py);
  const probe = radius * 0.7;
  // Each axis is tried on its own: the leading edge is probed at three
  // heights, and an axis whose edge would enter a blocking tile is
  // dropped, so bodies slide along walls instead of jamming.
  const axisClear = (px, py, horizontal) => {
    if (horizontal) return free(px, py - probe) && free(px, py) && free(px, py + probe);
    return free(px - probe, py) && free(px, py) && free(px + probe, py);
  };
  if (dx !== 0) {
    const ahead = x + dx + Math.sign(dx) * radius;
    if (axisClear(ahead, y, true)) x += dx;
  }
  if (dy !== 0) {
    const ahead = y + dy + Math.sign(dy) * radius;
    if (axisClear(x, ahead, false)) y += dy;
  }
  return { x, y };
}
