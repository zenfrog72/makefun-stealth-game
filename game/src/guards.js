// guards.js — the museum's guards and cameras: patrols, suspicion,
// pursuit, and the second chance the game always gives you.
//
// A guard who glimpses you fills with suspicion — faster up close,
// slower when you sneak or keep to the rugs. At "?" he stops and
// stares; at full suspicion he shouts and gives chase. Break his line
// of sight and his nerve cools: he searches where he last saw you,
// then drifts back to his patrol with the meter draining. Cameras sweep
// on a timer and fill one shared alarm meter instead of a suspicion of
// their own.

import { TILE, hasLineOfSight, angleDistance, turnToward, slideMove } from './vision.js';

export const GUARD_RANGE = TILE * 5.5;
export const GUARD_HALF_FOV = 0.56; // ~32 degrees
export const CAMERA_RANGE = TILE * 4.6;
export const CAMERA_HALF_FOV = 0.45; // ~26 degrees

const PACE_PATROL = 56;
const PACE_SEARCH = 86;
const PACE_CHASE = 121;
const EARSHOT = TILE * 2.4;

// detectionRate is how fast, per second, one eye fills with suspicion
// of the player: zero when the player is outside the cone, beyond
// range, behind cover, or deep enough in shadow. Guards, cameras and
// the renderer's "am I hidden?" test all drink from this one spring,
// so what the game shows is the truth.
export function detectionRate(grid, eyeX, eyeY, facing, range, halfFov, player) {
  const dx = player.x - eyeX;
  const dy = player.y - eyeY;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return 0;
  const bearing = Math.atan2(dy, dx);
  if (angleDistance(bearing, facing) > halfFov) return 0;
  if (!hasLineOfSight(grid, eyeX, eyeY, player.x, player.y)) return 0;
  const inRug = player.inShadow(grid);
  if (inRug && dist > TILE * 1.6) return 0;
  let rate = 2.4 - (dist / range) * 1.9;
  if (inRug) rate *= 0.4;
  if (player.sneaking) rate *= 0.6;
  if (!player.moving) rate *= 0.85;
  return rate;
}

export class Guard {
  constructor(grid, spec) {
    this.grid = grid;
    this.path = spec.path.map((wp) => {
      const middle = grid.tileCenter(wp.x, wp.y);
      return { x: middle.x, y: middle.y, wait: wp.wait ?? 1 };
    });
    this.x = this.path[0].x;
    this.y = this.path[0].y;
    this.wpIndex = this.path.length > 1 ? 1 : 0;
    const heading = this.path[this.wpIndex];
    this.facing = Math.atan2(heading.y - this.y, heading.x - this.x);
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

  // stepTo walks the guard toward a point with wall sliding, turning
  // to face the way he travels, and fires a footstep hook as he goes.
  // It reports true once he is close enough to count as arrived.
  stepTo(dt, tx, ty, pace, hooks) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return true;
    this.facing = turnToward(this.facing, Math.atan2(dy, dx), 4.2 * dt);
    const stride = Math.min(dist, pace * dt);
    const after = slideMove(this.grid, this.x, this.y, this.radius, (dx / dist) * stride, (dy / dist) * stride);
    this.x = after.x;
    this.y = after.y;
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = 0.34;
      hooks.onStep(this);
    }
    return dist - stride < 6;
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
      const drain = player.inShadow(this.grid) ? 0.5 : 0.22;
      if (this.mode === 'patrol' || this.mode === 'wait' || this.mode === 'return') {
        this.suspicion = Math.max(0, this.suspicion - drain * dt);
      } else if (this.mode === 'curious') {
        this.suspicion = Math.max(0, this.suspicion - drain * 0.8 * dt);
      } else if (this.mode === 'chase') {
        this.suspicion = Math.max(0.55, this.suspicion - 0.1 * dt);
      }
    }

    // Hearing: walking feet nearby swing a patrolling guard's head.
    const gap = Math.hypot(player.x - this.x, player.y - this.y);
    if (player.moving && !player.sneaking && gap < EARSHOT &&
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

    if (this.mode === 'patrol') {
      if (this.suspicion >= 0.4) { this.mode = 'curious'; return; }
      if (this.noticeTimer > 0 && this.noticeAngle !== null) {
        this.facing = turnToward(this.facing, this.noticeAngle, 3.4 * dt);
        return;
      }
      const target = this.path[this.wpIndex];
      if (this.stepTo(dt, target.x, target.y, PACE_PATROL, hooks)) {
        this.mode = 'wait';
        this.waitTimer = target.wait;
        this.lookBase = this.facing;
      }
      return;
    }

    if (this.mode === 'wait') {
      if (this.suspicion >= 0.4) { this.mode = 'curious'; return; }
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
      return;
    }

    if (this.mode === 'curious') {
      const focus = sees ? player : this.lastSeen;
      if (focus) {
        this.facing = turnToward(this.facing, Math.atan2(focus.y - this.y, focus.x - this.x), 3.4 * dt);
      }
      if (this.suspicion <= 0.2) this.mode = 'patrol';
      return;
    }

    if (this.mode === 'chase') {
      const quarry = sees ? { x: player.x, y: player.y } : this.lastSeen;
      if (quarry) this.stepTo(dt, quarry.x, quarry.y, PACE_CHASE, hooks);
      if (this.loseTimer > 2.6) {
        this.mode = 'search';
        this.searchTimer = 2.3;
      }
      return;
    }

    if (this.mode === 'search') {
      const arrived = this.lastSeen
        ? this.stepTo(dt, this.lastSeen.x, this.lastSeen.y, PACE_SEARCH, hooks)
        : true;
      if (arrived) this.facing += Math.sin(this.time * 2.4) * 1.9 * dt;
      this.searchTimer -= dt;
      if (this.searchTimer <= 0) {
        this.suspicion = Math.min(this.suspicion, 0.45);
        this.mode = 'return';
      }
      return;
    }

    // return
    const waypoint = this.path[this.wpIndex];
    if (this.stepTo(dt, waypoint.x, waypoint.y, PACE_PATROL, hooks)) this.mode = 'patrol';
    if (this.suspicion >= 0.4) this.mode = 'curious';
  }
}

// CameraUnit is a ceiling camera: a fixed eye whose cone sweeps back
// and forth across its arc. It keeps no suspicion of its own — the
// engine fills a shared alarm meter from the rate this reports.
export class CameraUnit {
  constructor(grid, spec) {
    const middle = grid.tileCenter(spec.x, spec.y);
    this.x = middle.x;
    this.y = middle.y;
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
