// Screenshot staging: ?shot=cover|drive|chase|mission builds a real, deterministic gameplay scene.
import { STEP } from './config.js';
import { SCREEN_PLAY } from './render.js';

// A tiny autopilot for staging: walk/drive forward so scenes look alive, never scripted art.
function autopilotStep(world, inputStub, audioStub, stepWorld, frames, drive) {
  for (let i = 0; i < frames; i++) stepWorld(world, STEP, inputStub, audioStub);
}

export function stageShot(name, world, helpers) {
  const { stepWorld, input, audio } = helpers;
  world.missions.phoneTimer = 8;
  if (name === 'drive') {
    // Put the player in a fast car on the beachfront road, heading south with traffic around.
    const car = world.cars.find((c) => c.kind === 'parked') || world.cars[0];
    car.x = 2660; car.y = 500; car.angle = Math.PI / 2; car.speed = 330; car.kind = 'parked';
    world.player.vehicle = car; car.driver = 'player';
    world.player.x = car.x; world.player.y = car.y;
    world.missions.message('Beachfront run — golden hour on Ocean Drive.', 8);
    input.keys.add('KeyW');
    autopilotStep(world, input, audio, stepWorld, 55);
    input.keys.delete('KeyW');
    world.wanted.stars = 0; world.wanted.heat = 0; world.wanted.copCars = []; world.wanted.copPeds = [];
  } else if (name === 'chase') {
    // Three-star pursuit downtown: player in the marked coupe on a straight road, cops right behind.
    const car = world.markedCar; car.x = 1080; car.y = 814; car.angle = 0; car.speed = 300;
    world.player.vehicle = car; car.driver = 'player'; world.player.x = car.x; world.player.y = car.y;
    world.missions.phase = 'deliver';
    world.missions.message('Mica: "Cops on you — lose them or reach the Chop Garage!"', 8);
    world.wanted.heat = 3.2; world.wanted.stars = 3;
    input.keys.add('KeyW');
    autopilotStep(world, input, audio, stepWorld, 34);
    input.keys.delete('KeyW');
    // Frame the pursuit: keep the player on the avenue and the nearest cruisers in shot behind.
    car.x = 1240; car.y = 814; car.angle = 0; car.speed = 300; world.player.x = car.x; world.player.y = car.y;
    world.wanted.stars = 3; world.wanted.heat = 3.2;
    world.wanted.copCars.slice(0, 3).forEach((cop, i) => {
      cop.x = car.x - 150 - i * 110; cop.y = 800 + (i % 2) * 30; cop.angle = 0; cop.speed = 290; cop.health = 120;
    });
  } else if (name === 'mission') {
    // Package mission in progress: player on foot at the pier lockers, package marker + cops nearby.
    world.missions.stage = 1; world.missions.phase = 'brief';
    world.player.x = 2820; world.player.y = 560; world.player.vehicle = null;
    world.player.angle = -0.4;
    world.missions.message('Mica: "Package is in the pier lockers — grab it and run it to Hotel Sol."', 8);
    autopilotStep(world, input, audio, stepWorld, 40);
    world.player.x = 2820; world.player.y = 560;
  } else {
    // cover (default): lively downtown street on foot, traffic + peds + HUD + minimap.
    world.player.x = 880; world.player.y = 790; world.player.angle = 0.7; world.player.vehicle = null;
    world.missions.message('Mica: "Downtown is awake. Your first job is marked in pink — go lift that coupe."', 8);
    autopilotStep(world, input, audio, stepWorld, 70);
    world.player.x = 880; world.player.y = 790; world.player.vehicle = null;
  }
  // Snap the camera onto the player so every shot is framed on the action.
  const px = world.player.vehicle ? world.player.vehicle.x : world.player.x;
  const py = world.player.vehicle ? world.player.vehicle.y : world.player.y;
  const { VIEW_W, VIEW_H, WORLD_W, WORLD_H } = helpers.view;
  world.camera.x = Math.max(0, Math.min(WORLD_W - VIEW_W, px - VIEW_W / 2));
  world.camera.y = Math.max(0, Math.min(WORLD_H - VIEW_H, py - VIEW_H / 2));
  return { screen: SCREEN_PLAY };
}
