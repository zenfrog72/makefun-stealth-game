// guards.js — the museum's guards and cameras: patrols, suspicion,
// pursuit, and the second chance the game always gives you.
//
// A guard who glimpses you fills with suspicion — faster up close,
// slower when you sneak or keep to the rugs. At "?" he stops and stares;
// at full suspicion he shouts and gives chase, but break his line of
// sight and his nerve cools: he searches where he last saw you, then
// drifts back to his patrol with the meter draining. Cameras sweep on a
// timer and fill a shared alarm meter instead of a suspicion of their own.

import { TILE, hasLineOfSight, angleDistance, turnToward, slideMove } from './vision.js';

export const GUARD_RANGE = TILE * 5.5;
export const GUARD_HALF_FOV = 0.56; // ~32 degrees
export const CAMERA_RANGE = TILE * 4.6;
export const CAMERA_HALF_FOV = 0.45; // ~26 degrees

const PATROL_SPEED = 56;
const SEARCH_SPEED = 86;
const CHASE_SPEED = 121;
const HEAR_RANGE = TILE * 2.4;

// detectionRate is how fast (per second) an eye fills with suspicion of
// the player: 0 when the player is out of the cone, out of range, behind
// cover, or deep enough in shadow. Shared by guards, cameras and the
// renderer's "am I hidden?" test, so what the game shows is the truth.
export function detectionRate(grid, eyeX, eyeY, facing, range, halfFov, player) {
  const dx = player.x - eyeX;
  const dy = player.y - eyeY;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return 0;
  if (angleDistance(Math.atan2(dy, dx), facing) > halfFov) return 0;
  if (!hasLineOfSight(grid, eyeX, eyeY, player.x, player.y)) return 0;
  const shadow = player.inShadow(grid);
  if (shadow && dist > TILE * 1.6) return 0;
  let rate = 2.4 - (dist / range) * 1.9;
  if (shadow) rate *= 0.4;
  if (player.sneaking) rate *= 0.6;
  if (!player.moving) rate *= 0.85;
  return rate;
}

export class Guard {
  constructor(grid, spec) {
    this.grid = grid;
    this.path = spec.path.map((wp) => {
      const centre = grid.tileCenter(wp.x, wp.y);
      return { x: centre.x, y: centre.y, wait: wp.wait ?? 1 };
    });
    this.x = this.path[0].x;
    this.y = this.path[0].y;
    this.wpIndex = this.path.length > 1 ? 1 : 0;
    const next = this.path[this.wpIndex];
    this.facing = Math.atan2(next.y - this.y, next.x - this.x);
    this.mode = 'patrol'; // patrol | wait | curious | chase | search | return
    this.suspicion = 0;
    this.waitTimer = 0;
    this.loseTimer = 0;
    this.searchTimer = 0;
    this.lastSeen = null;
    this.lookBase = this.facing;
    this.time = 0;
    this.stepTimer = 0;
    this.noticeAngle = null;
    this.noticeTimer = 0;
    this.radius = 13;
  }

  // moveToward walks the guard toward a point with wall sliding, turning
  // to face the way he travels, and fires footstep hooks as he goes.
  moveToward(dt, tx, ty, speed, hooks) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return true;
    this.facing = turnToward(this.facing, Math.atan2(dy, dx), 4.2 * dt);
    const step = Math.min(dist, speed * dt);
    const moved = slideMove(this.grid, this.x, this.y, this.radius, (dx / dist) * step, (dy / dist) * step);
    this.x = moved.x;
    this.y = moved.y;
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = 0.34;
      hooks.onStep(this);
    }
    return dist - step < 6;
  }

  update(dt, player, hooks) {
    this.time += dt;
    const rate = detectionRate(this.grid, this.x, this.y, this.facing, GUARD_RANGE, GUARD_HALF_FOV, player);
    const sees = rate > 0;
    if (sees) {
      this.lastSeen = { x: player.x, y: player.y };
      this.loseTimer = 0;
      this.suspicion = Math.min(1, this.suspicion + rate * dt);
    } else {
      this.loseTimer += dt;
      const decay = player.inShadow(this.grid) ? 0.5 : 0.22;
      if (this.mode === 'patrol' || this.mode === 'wait' || this.mode === 'return') {
        this.suspicion = Math.max(0, this.suspicion - decay * dt);
      } else if (this.mode === 'curious') {
        this.suspicion = Math.max(0, this.suspicion - decay * 0.8 * dt);
      } else if (this.mode === 'chase') {
        this.suspicion = Math.max(0.55, this.suspicion - 0.1 * dt);
      }
    }

    // Hearing: walking feet nearby turn a patrolling guard's head.
    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
    if (player.moving && !player.sneaking && distToPlayer < HEAR_RANGE &&
        (this.mode === 'patrol' || this.mode === 'wait')) {
      this.noticeAngle = Math.atan2(player.y - this.y, player.x - this.x);
      this.noticeTimer = 0.7;
    }
    if (this.noticeTimer > 0) this.noticeTimer -= dt;

    if (this.suspicion >= 1 && this.mode !== 'chase') {
      this.mode = 'chase';
      this.loseTimer = 0;
      hooks.onShout(this);
    }

    switch (this.mode) {
      case 'patrol': {
        if (this.suspicion >= 0.4) { this.mode = 'curious'; break; }
        if (this.noticeTimer > 0 && this.noticeAngle !== null) {
          this.facing = turnToward(this.facing, this.noticeAngle, 3.4 * dt);
          break;
        }
        const wp = this.path[this.wpIndex];
        if (this.moveToward(dt, wp.x, wp.y, PATROL_SPEED, hooks)) {
          this.mode = 'wait';
          this.waitTimer = wp.wait;
          this.lookBase = this.facing;
        }
        break;
      }
      case 'wait': {
        if (this.suspicion >= 0.4) { this.mode = 'curious'; break; }
        if (this.noticeTimer > 0 && this.noticeAngle !== null) {
          this.facing = turnToward(this.facing, this.noticeAngle, 3.4 * dt);
        } else {
          this.facing = this.lookBase + Math.sin(this.time * 1.15) * 0.65;
        }
        this.waitTimer -= dt;
        if (this.waitTimer <= 0) {
          this.wpIndex = (this.wpIndex + 1) % this.path.length;
          this.mode = 'patrol';
        }
        break;
      }
      case 'curious': {
        const focus = sees ? player : this.lastSeen;
        if (focus) {
          this.facing = turnToward(this.facing, Math.atan2(focus.y - this.y, focus.x - this.x), 3.4 * dt);
        }
        if (this.suspicion <= 0.2) this.mode = 'patrol';
        break;
      }
      case 'chase': {
        const target = sees ? { x: player.x, y: player.y } : this.lastSeen;
        if (target) this.moveToward(dt, target.x, target.y, CHASE_SPEED, hooks);
        if (this.loseTimer > 2.6) {
          this.mode = 'search';
          this.searchTimer = 2.3;
        }
        break;
      }
      case 'search': {
        const atSpot = this.lastSeen
          ? this.moveToward(dt, this.lastSeen.x, this.lastSeen.y, SEARCH_SPEED, hooks)
          : true;
        if (atSpot) this.facing += Math.sin(this.time * 2.4) * 1.9 * dt;
        this.searchTimer -= dt;
        if (this.searchTimer <= 0) {
          this.suspicion = Math.min(this.suspicion, 0.45);
          this.mode = 'return';
        }
        break;
      }
      case 'return': {
        const wp = this.path[this.wpIndex];
        if (this.moveToward(dt, wp.x, wp.y, PATROL_SPEED, hooks)) this.mode = 'patrol';
        if (this.suspicion >= 0.4) this.mode = 'curious';
        break;
      }
    }
  }
}

// CameraUnit is a ceiling camera: a fixed eye whose cone sweeps back and
// forth across its arc. It has no suspicion of its own — the engine fills
// a shared alarm meter from the rate this reports.
export class CameraUnit {
  constructor(grid, spec) {
    const centre = grid.tileCenter(spec.x, spec.y);
    this.x = centre.x;
    this.y = centre.y;
    this.base = (spec.base * Math.PI) / 180;
    this.sweep = (spec.sweep * Math.PI) / 180;
    this.period = spec.period;
    this.phase = spec.x * 0.7 + spec.y * 1.3;
    this.facing = this.base;
    this.seeing = 0;
  }

  update(dt, elapsed) {
    this.facing = this.base + Math.sin((elapsed / this.period) * Math.PI * 2 + this.phase) * this.sweep;
  }

  detection(grid, player) {
    this.seeing = detectionRate(grid, this.x, this.y, this.facing, CAMERA_RANGE, CAMERA_HALF_FOV, player);
    return this.seeing;
  }
}
