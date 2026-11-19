// The player on foot: movement, aiming, punching, pistol combat and entering vehicles.
import { PLAYER_CFG, WORLD_W, WORLD_H } from './config.js';
import { clamp, dist } from './random.js';

export function createPlayer(saved) {
  return {
    x: 420, y: 420, vx: 0, vy: 0, angle: 0, health: (saved && saved.health) || PLAYER_CFG.maxHealth,
    cash: (saved && saved.cash) ?? PLAYER_CFG.startCash, ammo: (saved && saved.ammo) ?? PLAYER_CFG.startAmmo,
    weapon: 'pistol', vehicle: null, attackCd: 0, muzzle: 0, walkCycle: 0, dead: false,
  };
}
export function stepPlayerOnFoot(player, dt, input, cam, collideFn) {
  const mx = input.moveX(); const my = input.moveY();
  const sprint = input.down('ShiftLeft', 'ShiftRight');
  const spd = sprint ? PLAYER_CFG.sprintSpeed : PLAYER_CFG.walkSpeed;
  const len = Math.hypot(mx, my) || 1;
  const tx = mx !== 0 || my !== 0 ? (mx / len) * spd : 0;
  const ty = mx !== 0 || my !== 0 ? (my / len) * spd : 0;
  player.vx += (tx - player.vx) * Math.min(1, dt * 12);
  player.vy += (ty - player.vy) * Math.min(1, dt * 12);
  let nx = clamp(player.x + player.vx * dt, 14, WORLD_W - 14);
  let ny = clamp(player.y + player.vy * dt, 14, WORLD_H - 14);
  if (nx > 3120) nx = 3120;
  const solved = collideFn(nx, ny, PLAYER_CFG.radius);
  player.x = solved.x; player.y = solved.y;
  player.walkCycle += Math.hypot(player.vx, player.vy) * dt * 0.06;
  // Aim at the mouse in world space.
  const wx = cam.x + input.mouse.x; const wy = cam.y + input.mouse.y;
  player.angle = Math.atan2(wy - player.y, wx - player.x);
  player.attackCd = Math.max(0, player.attackCd - dt);
  player.muzzle = Math.max(0, player.muzzle - dt);
  player.health = Math.min(PLAYER_CFG.maxHealth, player.health + dt * 0.7);
  return { wx, wy };
}
export function tryAttack(player, input) {
  const want = input.mouse.down || input.down('Space');
  if (!want || player.attackCd > 0 || player.vehicle) return null;
  if (player.ammo > 0) {
    player.attackCd = PLAYER_CFG.pistolCooldown; player.ammo -= 1; player.muzzle = 0.06;
    return { type: 'shot', x: player.x + Math.cos(player.angle) * 20, y: player.y + Math.sin(player.angle) * 20, angle: player.angle, range: PLAYER_CFG.pistolRange };
  }
  player.attackCd = 0.34;
  return { type: 'punch', x: player.x + Math.cos(player.angle) * PLAYER_CFG.punchRange, y: player.y + Math.sin(player.angle) * PLAYER_CFG.punchRange, angle: player.angle, range: PLAYER_CFG.punchRange };
}
export function nearestVehicle(player, cars, maxD) {
  let best = null; let bd = maxD;
  for (const c of cars) { const d = dist(player.x, player.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
  return best;
}
export function hurtPlayer(player, dmg) {
  player.health -= dmg;
  if (player.health <= 0) { player.health = 0; player.dead = true; }
}
