// Pedestrians: sidewalk wanderers who flee danger and can be downed (they fall and fade, non-gory).
import { PED_CFG, WORLD_W, WORLD_H } from './config.js';
import { V_ROADS, H_ROADS } from './city.js';
import { pick, randRange, clamp } from './random.js';

const SHIRTS = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a78bfa', '#f9a8d4', '#6ee7a0', '#ffffff', '#ff9f43'];
export function spawnPeds(rng) {
  const peds = [];
  for (let i = 0; i < PED_CFG.count; i++) {
    const vert = rng() < 0.5;
    const rx = pick(rng, V_ROADS); const ry = pick(rng, H_ROADS);
    peds.push({
      x: vert ? rx + (rng() < 0.5 ? -64 : 64) : rng() * 2900,
      y: vert ? rng() * WORLD_H : ry + (rng() < 0.5 ? -64 : 64),
      angle: rng() * Math.PI * 2, speed: 0, shirt: pick(rng, SHIRTS),
      state: 'walk', timer: randRange(rng, 1, 4), health: 100, downTimer: 0, cop: false, shootCd: 0,
    });
  }
  return peds;
}
export function makeCop(x, y) {
  return { x, y, angle: 0, speed: 0, shirt: '#24407a', state: 'chase', timer: 0, health: 100, downTimer: 0, cop: true, shootCd: 1 };
}
export function stepPed(ped, dt, rng, danger, playerPos) {
  if (ped.state === 'down') { ped.downTimer -= dt; return; }
  ped.timer -= dt;
  let tx = null; let ty = null; let spd = PED_CFG.walkSpeed;
  // Flee the nearest danger.
  if (danger) {
    const dx = ped.x - danger.x; const dy = ped.y - danger.y; const d = Math.hypot(dx, dy);
    if (d < 190 && d > 1) { tx = ped.x + (dx / d) * 120; ty = ped.y + (dy / d) * 120; spd = PED_CFG.fleeSpeed; ped.state = 'flee'; }
  }
  if (ped.cop && playerPos) {
    const d = Math.hypot(playerPos.x - ped.x, playerPos.y - ped.y);
    if (d > 60) { tx = playerPos.x; ty = playerPos.y; spd = 150; ped.state = 'chase'; }
    else ped.state = 'aim';
  }
  if (tx === null && ped.timer <= 0) {
    ped.timer = randRange(rng, 1.5, 4.5);
    ped.angle = rng() * Math.PI * 2;
    // Bias walking along sidewalks: snap heading to a road direction half the time.
    if (rng() < 0.5) ped.angle = pick(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]);
  }
  if (tx !== null) ped.angle = Math.atan2(ty - ped.y, tx - ped.x);
  ped.x += Math.cos(ped.angle) * spd * dt;
  ped.y += Math.sin(ped.angle) * spd * dt;
  // Keep peds out of the water and inside the world.
  ped.x = clamp(ped.x, 16, 3120); ped.y = clamp(ped.y, 16, WORLD_H - 16);
  if (ped.x > 2960) ped.x = 2960;
}
export function downPed(ped) { ped.state = 'down'; ped.downTimer = 4; ped.health = 0; }
