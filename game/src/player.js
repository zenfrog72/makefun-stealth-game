// player.js — the thief: movement, sneaking, noise and shadow.
//
// WASD or the arrow keys move; holding Shift sneaks — slower, silent,
// and harder to spot. Walking feet are heard by nearby guards and seen
// more easily; a burgundy rug tile is shadow, where only a guard almost
// on top of you can make you out.

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

  tileChar(grid) {
    return grid.tileAt(this.tileX(), this.tileY());
  }

  // inShadow is true on a rug tile — the museum's dark carpets.
  inShadow(grid) {
    return this.tileChar(grid) === ',';
  }

  // update reads one frame of input: { x, y } as a direction of travel
  // (each -1..1) and sneak as a boolean. hooks.onStep fires per footstep.
  update(dt, input, grid, hooks) {
    const length = Math.hypot(input.x, input.y);
    this.sneaking = Boolean(input.sneak);
    this.moving = length > 0;
    if (!this.moving) {
      this.stepTimer = 0.12;
      return;
    }
    const speed = this.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const nx = (input.x / length) * speed * dt;
    const ny = (input.y / length) * speed * dt;
    const moved = slideMove(grid, this.x, this.y, this.radius, nx, ny);
    const travelled = Math.hypot(moved.x - this.x, moved.y - this.y);
    this.x = moved.x;
    this.y = moved.y;
    if (travelled > 0.01) this.facing = Math.atan2(ny, nx);
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = this.sneaking ? 0.46 : 0.31;
      hooks.onStep(this.sneaking);
    }
  }
}
