// Wanted system + police pursuit: stars, spawning, chasing, ramming, busting and shooting.
import { POLICE_CFG, WORLD_W, WORLD_H } from './config.js';
import { makeCar } from './vehicles.js';
import { makeCop } from './pedestrians.js';
import { clamp, dist, wrapAngle } from './random.js';

export function createWanted() {
  return { stars: 0, heat: 0, lastSeenAt: 0, timeSinceSeen: 99, bustProgress: 0, copCars: [], copPeds: [] };
}
export function addCrime(wanted, amount, x, y, witnessed) {
  if (!witnessed && wanted.stars === 0 && amount < 1) return false;
  wanted.heat = Math.min(5, wanted.heat + amount);
  wanted.stars = Math.max(wanted.stars, Math.min(5, Math.floor(wanted.heat + 0.001)));
  wanted.lastSeenAt = 0; wanted.timeSinceSeen = 0;
  return true;
}
export function desiredCops(stars) { return stars <= 0 ? 0 : [0, 1, 2, 3, 4, 6][stars]; }
export function stepWanted(wanted, dt, player, rng) {
  // Police see the player when any cop is close, or a crime was just committed.
  let seen = false;
  const px = player.vehicle ? player.vehicle.x : player.x; const py = player.vehicle ? player.vehicle.y : player.y;
  for (const c of wanted.copCars) if (dist(c.x, c.y, px, py) < POLICE_CFG.sightRange) seen = true;
  for (const p of wanted.copPeds) if (p.state !== 'down' && dist(p.x, p.y, px, py) < 300) seen = true;
  if (seen) wanted.timeSinceSeen = 0; else wanted.timeSinceSeen += dt;
  if (wanted.stars > 0 && wanted.timeSinceSeen > POLICE_CFG.loseSightAfter) {
    wanted.heat = Math.max(0, wanted.heat - POLICE_CFG.decayPerSecond * dt * 4);
    if (wanted.heat <= wanted.stars - 1 + 0.02 && wanted.stars > 0) { wanted.stars -= 1; wanted.heat = wanted.stars; }
    if (wanted.stars <= 0) { wanted.heat = 0; wanted.copCars.length = 0; wanted.copPeds.length = 0; }
  }
  // Spawn cop cars just off-screen until the quota for the star level is met.
  const want = desiredCops(wanted.stars);
  const alive = wanted.copCars.filter((c) => c.health > 0);
  if (alive.length < want) {
    const a = rng() * Math.PI * 2; const d = 620;
    const car = makeCar(clamp(px + Math.cos(a) * d, 40, WORLD_W - 40), clamp(py + Math.sin(a) * d, 40, WORLD_H - 40), a + Math.PI, '#eef1f5', 'police');
    car.driver = 'police'; car.health = 120;
    wanted.copCars.push(car);
  }
  wanted.copCars = wanted.copCars.filter((c) => c.health > -40 && dist(c.x, c.y, px, py) < 1500);
  // On-foot officers appear at 3+ stars near stopped cop cars.
  if (wanted.stars >= 3 && wanted.copPeds.filter((p) => p.state !== 'down').length < wanted.stars - 1) {
    if (rng() < dt * 0.4 && wanted.copCars.length) {
      const c = wanted.copCars[0]; wanted.copPeds.push(makeCop(c.x + 30, c.y + 20));
    }
  }
  wanted.copPeds = wanted.copPeds.filter((p) => p.state !== 'down' || p.downTimer > 0);
}
export function stepCopCar(car, dt, player) {
  if (car.health <= 0) { car.speed *= Math.max(0, 1 - dt * 2); car.x += Math.cos(car.angle) * car.speed * dt; car.y += Math.sin(car.angle) * car.speed * dt; return; }
  const tx = player.vehicle ? player.vehicle.x : player.x; const ty = player.vehicle ? player.vehicle.y : player.y;
  const wantAngle = Math.atan2(ty - car.y, tx - car.x);
  const diff = wrapAngle(wantAngle - car.angle);
  const topSpeed = player.vehicle ? 430 : 300;
  car.angle += clamp(diff, -2.1 * dt, 2.1 * dt);
  const d = dist(car.x, car.y, tx, ty);
  const target = d < 40 ? 0 : topSpeed * (d > 300 ? 1 : 0.75);
  car.speed += clamp(target - car.speed, -500 * dt, 260 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 24, WORLD_W - 24); car.y = clamp(car.y, 24, WORLD_H - 24);
}
export function checkBusted(wanted, dt, player) {
  const px = player.vehicle ? player.vehicle.x : player.x; const py = player.vehicle ? player.vehicle.y : player.y;
  const speed = player.vehicle ? Math.abs(player.vehicle.speed) : 0;
  let near = false;
  for (const c of wanted.copCars) if (dist(c.x, c.y, px, py) < 95) near = true;
  for (const p of wanted.copPeds) if (p.state !== 'down' && dist(p.x, p.y, px, py) < POLICE_CFG.bustRadius) near = true;
  if (wanted.stars > 0 && near && speed < 42) wanted.bustProgress += dt; else wanted.bustProgress = Math.max(0, wanted.bustProgress - dt * 1.6);
  return wanted.bustProgress >= POLICE_CFG.bustTime;
}
