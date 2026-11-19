// Simulation orchestration: owns all state and steps every system in a fixed order.
import { STEP, VIEW_W, VIEW_H, WORLD_W, WORLD_H, SAVE_KEY, PLAYER_CFG } from './config.js';
import { generateCity, resolveCircle, isOnRoad } from './city.js';
import { spawnTraffic, stepTrafficCar, stepPlayerCar, makeCar } from './vehicles.js';
import { spawnPeds, stepPed, downPed } from './pedestrians.js';
import { createWanted, addCrime, stepWanted, stepCopCar, checkBusted } from './police.js';
import { createPlayer, stepPlayerOnFoot, tryAttack, nearestVehicle, hurtPlayer } from './player.js';
import { createMissions, missionMarker, nearMarker, PALM_SPOTS, STORY } from './missions.js';
import { clamp, dist } from './random.js';

export function loadSave() {
  try { const raw = window.localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function writeSave(world) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ cash: world.player.cash, ammo: world.player.ammo, health: Math.max(40, world.player.health), stage: world.missions.stage, palmsFound: world.missions.palmsFound }));
  } catch { /* storage off: progress lasts this visit */ }
}

export function createWorld(rng, saved) {
  const city = generateCity(rng);
  const player = createPlayer(saved);
  if (saved && saved.stage > 0) { /* continue near downtown */ player.x = 420; player.y = 420; }
  const cars = spawnTraffic(rng, city);
  // The marked coral coupe for mission 1 sits downtown, easy to find.
  const markedCar = makeCar(884, 560, Math.PI / 2, '#ff7a45', 'parked'); markedCar.marked = true; cars.push(markedCar);
  const world = {
    rng, city, player, cars, markedCar, rivalCar: null,
    peds: spawnPeds(rng), wanted: createWanted(), missions: createMissions(saved),
    camera: { x: 0, y: 0 }, time: 0, particles: [], tracers: [], skids: [],
    prompt: '', shake: 0, endReason: '', hasSave: !!saved, danger: null, saveTimer: 0,
    addParticles(x, y, color, n, spd) {
      for (let i = 0; i < n; i++) { const a = rng() * Math.PI * 2; const s = (0.3 + rng() * 0.7) * (spd || 90); world.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, max: 0.5, color }); }
    },
    crime(amount, x, y) {
      // Witnessed if a ped or cop is within sight and roughly facing the scene.
      let witnessed = world.wanted.copCars.length > 0 || world.wanted.copPeds.length > 0;
      if (!witnessed) for (const p of world.peds) { if (p.state !== 'down' && dist(p.x, p.y, x, y) < 260) { witnessed = true; break; } }
      if (addCrime(world.wanted, amount, x, y, witnessed || amount >= 1)) world.danger = { x, y, t: 1.2 };
    },
  };
  return world;
}

export function resetAfterDeath(world) {
  world.player.health = 80; world.player.dead = false;
  world.player.cash = Math.max(0, world.player.cash - 150);
  world.player.vehicle = null;
  world.player.x = world.city.hospital.x + 60; world.player.y = world.city.hospital.y + 60;
  world.wanted.stars = 0; world.wanted.heat = 0; world.wanted.copCars = []; world.wanted.copPeds = []; world.wanted.bustProgress = 0;
  world.missions.timer = 0; if (world.missions.stage === 3) world.missions.phase = 'brief';
  writeSave(world);
}

function completeMission(world, audio) {
  const m = world.missions; const s = STORY[m.stage];
  world.player.cash += s.reward; world.player.ammo += 12;
  m.stage = Math.min(m.stage + 1, STORY.length - 1); m.phase = 'brief'; m.hasPackage = false;
  if (m.stage === 1) m.message('Mica: "Clean lift. Next: a package waits at the pier lockers, east beach. Drop it at Hotel Sol. Cops sniff around that pier — move."', 8);
  else if (m.stage === 2) m.message('Mica: "A rival crew runs my streets. Their pink rocket is prowling Industrial. Stop that car — ram it or box it in."', 8);
  else if (m.stage === 3) { m.message('Mica: "Last job. Heat is coming hard — get to the Marina in 90 seconds and the debt is DONE."', 8); m.timer = 90; m.phase = 'run'; world.crime(2.2, world.player.x, world.player.y); }
  else m.message('Mica: "Debt paid, legend made. Neon Harbor is yours — fares, races and palms still pay. 🌴"', 9);
  audio.chime(); writeSave(world);
}

function stepMissions(world, dt, audio) {
  const m = world.missions; const p = world.player;
  m.phoneTimer = Math.max(0, m.phoneTimer - dt);
  const s = STORY[Math.min(m.stage, STORY.length - 1)];
  const marker = missionMarker(m, world);
  // Taxi side job: offer when on foot near a ped-less corner, accept with T handled in main via prompt.
  if (m.taxi) {
    const tgt = m.taxi.phase === 'pickup' ? { x: m.taxi.px, y: m.taxi.py } : { x: m.taxi.dx, y: m.taxi.dy };
    if (dist(p.vehicle ? p.vehicle.x : p.x, p.vehicle ? p.vehicle.y : p.y, tgt.x, tgt.y) < 62) {
      if (m.taxi.phase === 'pickup' && p.vehicle) { m.taxi.phase = 'dropoff'; m.message('Fare: "Marina side, fast — there is a tip in it!"', 4); audio.pickup(); }
      else if (m.taxi.phase === 'dropoff') { p.cash += m.taxi.fare; m.message(`Fare paid $${m.taxi.fare}. Press T near a corner for another fare.`, 5); m.taxi = null; audio.chime(); writeSave(world); }
    }
  }
  if (m.race) {
    m.race.time -= dt;
    const pt = m.race.points[m.race.next];
    if (pt && p.vehicle && dist(p.vehicle.x, p.vehicle.y, pt.x, pt.y) < 70) { m.race.next += 1; audio.pickup(); world.addParticles(pt.x, pt.y, '#2ee6e6', 14, 130); }
    if (m.race.next >= m.race.points.length) { p.cash += 300; m.message('Race won! +$300. Press R downtown for another run.', 5); m.race = null; audio.chime(); writeSave(world); }
    else if (m.race.time <= 0) { m.message('Race timed out. Press R to try again.', 4); m.race = null; audio.fail(); }
  }
  // Collectibles.
  PALM_SPOTS.forEach((sp, i) => {
    if (m.palmsFound.includes(i)) return;
    const px = p.vehicle ? p.vehicle.x : p.x; const py = p.vehicle ? p.vehicle.y : p.y;
    if (dist(px, py, sp.x, sp.y) < 40) { m.palmsFound.push(i); p.cash += 75; m.message(`Neon palm ${m.palmsFound.length}/10 found! +$75`, 3.5); audio.pickup(); world.addParticles(sp.x, sp.y, '#ff4d9d', 16, 120); writeSave(world); }
  });
  if (s.id === 'steal') {
    if (m.phase === 'brief' && p.vehicle === world.markedCar) { m.phase = 'deliver'; m.message('Mica: "That\'s the coupe! Bring it to the Chop Garage, south Marina road."', 5); }
    else if (m.phase === 'deliver' && p.vehicle === world.markedCar && nearMarker(p, { x: world.city.garage.x, y: world.city.garage.y }, 78)) completeMission(world, audio);
  } else if (s.id === 'package') {
    if (!m.hasPackage && !p.vehicle && dist(p.x, p.y, 2920, 520) < 52) { m.hasPackage = true; m.message('Package grabbed! Deliver it to Hotel Sol — heat incoming!', 5); world.crime(1.4, p.x, p.y); audio.pickup(); }
    else if (m.hasPackage && dist(p.vehicle ? p.vehicle.x : p.x, p.vehicle ? p.vehicle.y : p.y, 900, 700) < 78) completeMission(world, audio);
  } else if (s.id === 'rival') {
    if (!world.rivalCar) {
      world.rivalCar = makeCar(2060, 500, 0, '#ff2e88', 'traffic'); world.rivalCar.rival = true; world.rivalCar.driver = 'rival'; world.rivalCar.health = 90; world.rivalCar.speed = 120;
    }
    const rc = world.rivalCar;
    if (rc.health <= 18 || (p.vehicle && dist(p.vehicle.x, p.vehicle.y, rc.x, rc.y) < 60 && Math.abs(rc.speed) < 24)) {
      m.rivalStopTime += dt;
      if (m.rivalStopTime > 2.2 || rc.health <= 5) { world.rivalCar = null; m.rivalStopTime = 0; completeMission(world, audio); }
    } else m.rivalStopTime = Math.max(0, m.rivalStopTime - dt);
  } else if (s.id === 'escape' && m.phase === 'run') {
    m.timer -= dt;
    if (nearMarker(p, { x: world.city.marina.x, y: world.city.marina.y }, 84)) { world.wanted.stars = 0; world.wanted.heat = 0; world.wanted.copCars = []; world.wanted.copPeds = []; completeMission(world, audio); }
    else if (m.timer <= 0) { m.message('Mica: "Too slow — the ferry left. Heat dies down, try the run again."', 6); m.timer = 90; world.wanted.heat = Math.max(0, world.wanted.heat - 1); audio.fail(); }
  }
}

export function stepWorld(world, dt, input, audio) {
  const p = world.player; const rng = world.rng;
  world.time += dt;
  if (world.danger) { world.danger.t -= dt; if (world.danger.t <= 0) world.danger = null; }
  world.prompt = '';
  // --- Player / vehicle ---
  if (p.vehicle) {
    const car = p.vehicle;
    const prevSpeed = car.speed;
    stepPlayerCar(car, dt, input);
    // Collide with buildings.
    const solved = resolveCircle(car.x, car.y, 24, world.city.colliders);
    if (solved.hit) {
      if (Math.abs(prevSpeed) > 130) { car.health -= 9; world.shake = Math.min(14, Math.abs(prevSpeed) / 28); audio.crash(Math.abs(prevSpeed) / 440); world.addParticles(car.x, car.y, '#ffd76e', 10, 140); }
      car.x = solved.x; car.y = solved.y; car.speed *= -0.25;
    }
    if (car.skid > 0 && rng() < 0.7) world.skids.push({ x: car.x - Math.cos(car.angle) * 16, y: car.y - Math.sin(car.angle) * 16, x2: car.x - Math.cos(car.angle) * 22, y2: car.y - Math.sin(car.angle) * 22 });
    if (world.skids.length > 260) world.skids.splice(0, world.skids.length - 260);
    p.x = car.x; p.y = car.y;
    // Run-over checks (non-gory: peds dive away mostly; a hit downs + crime).
    for (const ped of world.peds) {
      if (ped.state === 'down') continue;
      if (Math.abs(car.speed) > 60 && dist(car.x, car.y, ped.x, ped.y) < 30) {
        if (rng() < 0.55) { ped.x += (ped.x - car.x) * 1.4; ped.y += (ped.y - car.y) * 1.4; }
        else { downPed(ped); world.crime(1.1, car.x, car.y); world.addParticles(ped.x, ped.y, '#ffffff', 8, 90); audio.punch(); }
      }
    }
    // Car-vs-car collisions.
    const others = [...world.cars, ...world.wanted.copCars]; if (world.rivalCar) others.push(world.rivalCar);
    for (const o of others) {
      if (o === car) continue;
      const d = dist(car.x, car.y, o.x, o.y);
      if (d < 44 && d > 0.01) {
        const push = (44 - d) / 2; const nx = (o.x - car.x) / d; const ny = (o.y - car.y) / d;
        o.x += nx * push; o.y += ny * push; car.x -= nx * push; car.y -= ny * push;
        const impact = Math.abs(car.speed - (o.speed || 0));
        if (impact > 90) { o.health -= impact * 0.09; car.health -= impact * 0.05; world.shake = Math.min(12, impact / 30); audio.crash(impact / 400); world.addParticles(o.x, o.y, '#ffb347', 8, 120); if (o.rival) world.crime(0.4, o.x, o.y); }
        o.speed = (o.speed || 0) * 0.4;
      }
    }
    if (input.wasPressed('KeyE')) {
      p.vehicle = null; car.driver = null; if (car.kind === 'traffic') car.kind = 'parked';
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34; p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
      audio.door();
    }
    world.prompt = 'E — exit car · Space — handbrake drift';
  } else {
    stepPlayerOnFoot(p, dt, input, world.camera, (x, y, r) => resolveCircle(x, y, r, world.city.colliders));
    // Attack resolution.
    const atk = tryAttack(p, input);
    if (atk) {
      if (atk.type === 'shot') {
        audio.gunshot(); world.crime(0.9, p.x, p.y);
        let hx = atk.x + Math.cos(atk.angle) * atk.range; let hy = atk.y + Math.sin(atk.angle) * atk.range; let hitSomething = false;
        const targets = [...world.peds, ...world.wanted.copPeds];
        for (const t of targets) {
          if (t.state === 'down') continue;
          // Distance from target to the shot ray.
          const tProj = (t.x - atk.x) * Math.cos(atk.angle) + (t.y - atk.y) * Math.sin(atk.angle);
          if (tProj < 0 || tProj > atk.range) continue;
          const perp = Math.abs(-(t.x - atk.x) * Math.sin(atk.angle) + (t.y - atk.y) * Math.cos(atk.angle));
          if (perp < 15) { t.health -= PLAYER_CFG.pistolDamage; hx = t.x; hy = t.y; hitSomething = true; if (t.health <= 0) { downPed(t); world.crime(t.cop ? 1.6 : 1.2, t.x, t.y); } break; }
        }
        if (!hitSomething) for (const c of [...world.cars, ...world.wanted.copCars]) {
          const tProj = (c.x - atk.x) * Math.cos(atk.angle) + (c.y - atk.y) * Math.sin(atk.angle);
          if (tProj < 0 || tProj > atk.range) continue;
          const perp = Math.abs(-(c.x - atk.x) * Math.sin(atk.angle) + (c.y - atk.y) * Math.cos(atk.angle));
          if (perp < 26) { c.health -= 16; hx = c.x; hy = c.y; break; }
        }
        world.tracers.push({ x: atk.x, y: atk.y, x2: hx, y2: hy, life: 0.07 });
        world.addParticles(hx, hy, '#ffe14d', 4, 70);
      } else {
        audio.punch();
        for (const t of [...world.peds, ...world.wanted.copPeds]) {
          if (t.state !== 'down' && dist(atk.x, atk.y, t.x, t.y) < 24) { t.health -= PLAYER_CFG.punchDamage; world.addParticles(t.x, t.y, '#ffffff', 6, 80); if (t.health <= 0) { downPed(t); world.crime(t.cop ? 1.4 : 1.0, t.x, t.y); } else world.crime(0.7, t.x, t.y); break; }
        }
      }
    }
    // Enter vehicle.
    const near = nearestVehicle(p, [...world.cars, ...world.wanted.copCars], 52);
    if (near) {
      world.prompt = near.kind === 'police' ? 'E — steal the police cruiser (!)' : 'E — enter car';
      if (input.wasPressed('KeyE')) {
        const wasParked = near.kind === 'parked'; const hadDriver = near.driver === 'ai';
        p.vehicle = near; near.driver = 'player';
        if (near.kind === 'traffic' || near.kind === 'police') world.crime(near.kind === 'police' ? 1.8 : 1.1, near.x, near.y);
        else if (!wasParked) world.crime(0.8, near.x, near.y);
        if (hadDriver) world.crime(1.1, near.x, near.y);
        audio.door();
      }
    }
    // Side-job offers.
    if (!world.missions.taxi && !p.vehicle) world.prompt = world.prompt || 'T — call a taxi fare · R — checkpoint race (in a car)';
    if (input.wasPressed('KeyT') && !world.missions.taxi) {
      world.missions.taxi = { phase: 'pickup', px: clamp(p.x + 260, 80, 3000), py: clamp(p.y + 120, 80, WORLD_H - 80), dx: world.city.marina.x, dy: world.city.marina.y, fare: 130 };
      world.missions.message('Dispatch: "Fare waiting nearby — pick them up in any car, drop at the Marina."', 5); audio.click();
    }
  }
  if (input.wasPressed('KeyR') && p.vehicle && !world.missions.race) {
    world.missions.race = { points: [{ x: 1460, y: 800 }, { x: 2060, y: 1360 }, { x: 2660, y: 800 }, { x: 2660, y: 1920 }], next: 0, time: 75 };
    world.missions.message('Race started! Hit every glowing checkpoint in 75s for $300.', 5); audio.click();
  }
  // --- Traffic, rival, peds, police ---
  for (const c of world.cars) if (c !== p.vehicle) stepTrafficCar(c, dt, rng, world.cars, p.vehicle ? null : p);
  if (world.rivalCar) {
    const rc = world.rivalCar;
    // Rival flees the player, fast and sloppy.
    const fleeA = Math.atan2(rc.y - p.y, rc.x - p.x);
    rc.angle += clamp(((fleeA - rc.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -1.6 * dt, 1.6 * dt);
    rc.speed += clamp((rc.health <= 18 ? 0 : 330) - rc.speed, -300 * dt, 200 * dt);
    rc.x += Math.cos(rc.angle) * rc.speed * dt; rc.y += Math.sin(rc.angle) * rc.speed * dt;
    rc.x = clamp(rc.x, 30, WORLD_W - 30); rc.y = clamp(rc.y, 30, WORLD_H - 30);
    const solved = resolveCircle(rc.x, rc.y, 24, world.city.colliders); if (solved.hit) { rc.x = solved.x; rc.y = solved.y; rc.health -= 4; rc.speed *= -0.3; }
  }
  const dangerPos = world.danger || (p.vehicle && Math.abs(p.vehicle.speed) > 250 ? p.vehicle : null);
  for (const ped of world.peds) stepPed(ped, dt, rng, dangerPos, null);
  stepWanted(world.wanted, dt, p, rng);
  for (const c of world.wanted.copCars) if (c !== p.vehicle) stepCopCar(c, dt, p);
  for (const ped of world.wanted.copPeds) {
    stepPed(ped, dt, rng, null, p.vehicle ? null : p);
    // Cops shoot back at 3+ stars when the player is on foot and in range.
    if (ped.state !== 'down' && !p.vehicle && world.wanted.stars >= 3) {
      ped.shootCd -= dt;
      const d = dist(ped.x, ped.y, p.x, p.y);
      if (ped.shootCd <= 0 && d < 340 && d > 40) {
        ped.shootCd = 1.2; audio.gunshot();
        world.tracers.push({ x: ped.x, y: ped.y, x2: p.x, y2: p.y, life: 0.07 });
        if (rng() < 0.55) { hurtPlayer(p, 7); world.addParticles(p.x, p.y, '#ff6b6b', 4, 60); }
      }
    }
    // Cop car rams can hurt a pedestrian player slightly on hard hits.
  }
  if (p.vehicle && Math.abs(p.vehicle.speed) > 200) world.crime(0.12 * dt * 10, p.vehicle.x, p.vehicle.y); // reckless driving slowly heats
  // Busted check.
  if (checkBusted(world.wanted, dt, p)) { p.dead = true; world.endReason = 'busted'; }
  if (p.health <= 0) { p.dead = true; world.endReason = 'wasted'; }
  stepMissions(world, dt, audio);
  // Fx lifetimes.
  for (const pt of world.particles) { pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; }
  world.particles = world.particles.filter((pt) => pt.life > 0);
  for (const tr of world.tracers) tr.life -= dt;
  world.tracers = world.tracers.filter((tr) => tr.life > 0);
  for (const ped of [...world.peds, ...world.wanted.copPeds]) if (ped.state === 'down' && ped.downTimer <= 0 && rng() < dt * 0.2) { ped.state = 'walk'; ped.health = 60; ped.x += 30; }
  // Camera: smooth follow with driving lookahead.
  const focusX = p.vehicle ? p.vehicle.x + Math.cos(p.vehicle.angle) * p.vehicle.speed * 0.32 : p.x;
  const focusY = p.vehicle ? p.vehicle.y + Math.sin(p.vehicle.angle) * p.vehicle.speed * 0.32 : p.y;
  world.camera.x += (clamp(focusX - VIEW_W / 2, 0, WORLD_W - VIEW_W) - world.camera.x) * Math.min(1, dt * 5);
  world.camera.y += (clamp(focusY - VIEW_H / 2, 0, WORLD_H - VIEW_H) - world.camera.y) * Math.min(1, dt * 5);
  if (world.shake > 0) { world.camera.x += (rng() - 0.5) * world.shake; world.camera.y += (rng() - 0.5) * world.shake; world.shake = Math.max(0, world.shake - dt * 26); }
  world.saveTimer -= dt;
  if (world.saveTimer <= 0) { world.saveTimer = 6; writeSave(world); }
  audio.update(dt, { driving: !!p.vehicle, speed: p.vehicle ? p.vehicle.speed : 0, wanted: world.wanted.stars, playing: true });
  return world;
}
export { STEP };
