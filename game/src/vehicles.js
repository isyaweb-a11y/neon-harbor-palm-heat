// Vehicles: arcade car physics, parked cars, traffic AI on the road grid, damage and smoke.
import { CAR_CFG, CAR_COLORS, WORLD_W, WORLD_H } from './config.js';
import { V_ROADS, H_ROADS } from './city.js';
import { pick, randRange, clamp, wrapAngle } from './random.js';

let NEXT_ID = 1;
export function makeCar(x, y, angle, color, kind) {
  return { id: NEXT_ID++, x, y, angle, speed: 0, steer: 0, color, kind, health: 100, driver: null, smoke: 0, skid: 0, targetSpeed: CAR_CFG.trafficSpeed, turnCooldown: 0, stopped: 0, marked: false, rival: false };
}
export function spawnTraffic(rng, city) {
  const cars = [];
  for (let i = 0; i < CAR_CFG.parkedCount; i++) {
    const vert = rng() < 0.5;
    const rx = pick(rng, V_ROADS); const ry = pick(rng, H_ROADS);
    const x = vert ? rx + (rng() < 0.5 ? -34 : 34) : rng() * 2800;
    const y = vert ? rng() * WORLD_H : ry + (rng() < 0.5 ? -34 : 34);
    const c = makeCar(x, y, vert ? (rng() < 0.5 ? -Math.PI / 2 : Math.PI / 2) : 0, pick(rng, CAR_COLORS), 'parked');
    cars.push(c);
  }
  for (let i = 0; i < CAR_CFG.trafficCount; i++) {
    const vert = rng() < 0.5;
    const rx = pick(rng, V_ROADS); const ry = pick(rng, H_ROADS);
    const c = makeCar(vert ? rx + 14 : rng() * 2800, vert ? rng() * WORLD_H : ry + 14, vert ? Math.PI / 2 : 0, pick(rng, CAR_COLORS), 'traffic');
    c.driver = 'ai'; c.speed = randRange(rng, 60, 130);
    cars.push(c);
  }
  return cars;
}
function nearIntersection(x, y) {
  for (const rx of V_ROADS) for (const ry of H_ROADS) if (Math.abs(x - rx) < 58 && Math.abs(y - ry) < 58) return { rx, ry };
  return null;
}
export function stepTrafficCar(car, dt, rng, allCars, playerPos) {
  if (car.kind !== 'traffic' || car.driver !== 'ai') return;
  car.turnCooldown -= dt;
  // Slow for a car or the player ahead.
  let desired = CAR_CFG.trafficSpeed;
  const fx = car.x + Math.cos(car.angle) * 70; const fy = car.y + Math.sin(car.angle) * 70;
  for (const o of allCars) {
    if (o === car) continue;
    const dx = o.x - fx; const dy = o.y - fy;
    if (dx * dx + dy * dy < 46 * 46) desired = 0;
  }
  if (playerPos) { const dx = playerPos.x - fx; const dy = playerPos.y - fy; if (dx * dx + dy * dy < 50 * 50) desired = 0; }
  const inter = nearIntersection(car.x, car.y);
  if (inter && car.turnCooldown <= 0 && rng() < 0.012) {
    const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    car.angle = pick(rng, dirs); car.turnCooldown = 2.5;
    car.x = inter.rx + (car.angle === 0 ? 0 : car.angle === Math.PI ? 0 : 14);
    car.y = inter.ry + (car.angle === Math.PI / 2 || car.angle === -Math.PI / 2 ? 0 : 14);
  }
  // Keep to the road: steer back toward the nearest road centre line.
  const onV = V_ROADS.some((r) => Math.abs(car.x - r) < 50);
  const onH = H_ROADS.some((r) => Math.abs(car.y - r) < 50);
  if (!onV && !onH) {
    let bx = car.x; let bd = 1e18;
    for (const r of V_ROADS) { const d = Math.abs(car.x - r); if (d < bd) { bd = d; bx = r; } }
    car.angle += clamp(wrapAngle(Math.atan2(0, bx - car.x) - car.angle), -1, 1) * dt;
    car.x += clamp(bx - car.x, -60 * dt, 60 * dt);
  }
  car.speed += clamp(desired - car.speed, -260 * dt, 180 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 30, WORLD_W - 30); car.y = clamp(car.y, 30, WORLD_H - 30);
  if (car.x < 40 || car.x > WORLD_W - 40) car.angle = Math.PI - car.angle;
  if (car.y < 40 || car.y > WORLD_H - 40) car.angle = -car.angle;
}
export function stepPlayerCar(car, dt, input) {
  const fwd = input.down('KeyW', 'ArrowUp'); const back = input.down('KeyS', 'ArrowDown');
  const left = input.down('KeyA', 'ArrowLeft'); const right = input.down('KeyD', 'ArrowRight');
  const hand = input.down('Space');
  if (fwd) car.speed += CAR_CFG.accel * dt;
  else if (back) car.speed -= (car.speed > 10 ? CAR_CFG.brake : CAR_CFG.accel * 0.7) * dt;
  else car.speed -= car.speed * CAR_CFG.drag * dt;
  if (hand) car.speed -= car.speed * 2.2 * dt;
  car.speed = clamp(car.speed, -CAR_CFG.reverseSpeed, CAR_CFG.maxSpeed * (0.45 + car.health / 200));
  const steerTarget = (left ? -1 : 0) + (right ? 1 : 0);
  car.steer += (steerTarget - car.steer) * Math.min(1, dt * 10);
  if (Math.abs(car.speed) > 4) car.angle += car.steer * CAR_CFG.turnRate * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 120) * (hand ? 1.35 : 1);
  car.skid = hand && Math.abs(car.speed) > 140 ? 1 : Math.max(0, car.skid - dt * 3);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 24, WORLD_W - 24); car.y = clamp(car.y, 24, WORLD_H - 24);
  car.smoke = car.health < 55 ? Math.min(1, car.smoke + dt) : Math.max(0, car.smoke - dt);
}
export function carCorners(car) {
  const c = Math.cos(car.angle); const s = Math.sin(car.angle);
  const hw = CAR_CFG.width / 2; const hh = CAR_CFG.height / 2;
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([lx, ly]) => ({ x: car.x + lx * c - ly * s, y: car.y + lx * s + ly * c }));
}
