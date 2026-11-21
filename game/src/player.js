// player.js — the thief: how she moves, sneaks, sounds and hides.
//
// WASD or the arrows steer her; holding Shift makes her sneak — slower,
// near-silent, and harder to spot. Walking feet carry: a nearby guard
// hears them and turns his head. A burgundy rug is shadow, where only a
// guard almost standing on her can make her out at all.

import { TILE, slideMove } from './vision.js';

export const WALK_SPEED = 134;
export const SNEAK_SPEED = 74;
export const PLAYER_RADIUS = 13;

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = PLAYER_RADIUS;
    this.facing = -Math.PI / 2;
    this.moving = false;
    this.sneaking = false;
    this.stepTimer = 0;
  }

  tileX() {
    return Math.floor(this.x / TILE);
  }

  tileY() {
    return Math.floor(this.y / TILE);
  }

  // The character of the tile under her feet.
  tileChar(grid) {
    return grid.tileAt(this.tileX(), this.tileY());
  }

  // True while she stands on a rug — the museum's dark carpets.
  inShadow(grid) {
    return this.tileChar(grid) === ',';
  }

  // update moves her one frame from an input of { x, y } travel
  // direction (each -1..1) and a sneak flag. hooks.onStep fires once
  // per footstep, so the soundscape can answer her feet.
  update(dt, input, grid, hooks) {
    const reach = Math.hypot(input.x, input.y);
    this.sneaking = Boolean(input.sneak);
    this.moving = reach > 0;
    if (!this.moving) {
      this.stepTimer = 0.12;
      return;
    }
    const pace = this.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const stepX = (input.x / reach) * pace * dt;
    const stepY = (input.y / reach) * pace * dt;
    const after = slideMove(grid, this.x, this.y, this.radius, stepX, stepY);
    const covered = Math.hypot(after.x - this.x, after.y - this.y);
    this.x = after.x;
    this.y = after.y;
    if (covered > 0.01) this.facing = Math.atan2(stepY, stepX);
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = this.sneaking ? 0.46 : 0.31;
      hooks.onStep(this.sneaking);
    }
  }
}
