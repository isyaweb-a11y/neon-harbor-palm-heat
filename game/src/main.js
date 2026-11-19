// Boot + fixed-timestep loop + menus/save for Neon Harbor: Palm Heat.
import { STEP, VIEW_W, VIEW_H, WORLD_W, WORLD_H } from './config.js';
import { createRandom } from './random.js';
import { createWorld, stepWorld, loadSave, writeSave, resetAfterDeath } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261119;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const input = createInput(canvas);
const saved = loadSave();
let world = createWorld(createRandom(seed), saved);
const renderer = createRenderer(canvas);
const gameHandle = { world, player: world.player };
window.__game = gameHandle;
function syncHandle() { gameHandle.world = world; gameHandle.player = world.player; gameHandle.state = world; }
syncHandle();

function announce(msg) { if (status) status.textContent = msg; }

function runShot(name) {
  stageShot(name, world, { stepWorld, input, audio, view: { VIEW_W, VIEW_H, WORLD_W, WORLD_H } });
  syncHandle();
  let painted = 0;
  function paint() {
    renderer.draw(world, SCREEN_PLAY);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint); else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let accumulator = 0; let last = performance.now();
  announce('Neon Harbor: Palm Heat. Press Enter to start.');
  function newGame() {
    try { window.localStorage.removeItem('neon-harbor-palm-heat-save-v1'); } catch { /* ignore */ }
    world = createWorld(createRandom(seed), null); syncHandle();
    screen = SCREEN_PLAY; audio.unlock(); audio.click();
    announce('Playing Neon Harbor. Follow the pink marker.');
  }
  function continueGame() { screen = SCREEN_PLAY; audio.unlock(); audio.click(); announce('Welcome back to Neon Harbor.'); }
  function frame(now) {
    requestAnimationFrame(frame);
    const dtReal = Math.min((now - last) / 1000, MAX_FRAME); last = now;
    const pressed = input.peekPressed();
    const clicked = input.mouse.clicked;
    if (pressed.size || clicked) audio.unlock();
    if (pressed.has('KeyM')) audio.toggleMute();
    if (screen === SCREEN_TITLE) {
      if (pressed.has('Enter') || clicked) { input.endFrame(); newGame(); renderer.draw(world, screen); return; }
      if (pressed.has('KeyC') && world.hasSave) { input.endFrame(); continueGame(); renderer.draw(world, screen); return; }
      accumulator += dtReal;
      while (accumulator >= STEP) { stepWorld(world, STEP, input, audio); accumulator -= STEP; }
      world.wanted.stars = 0; world.wanted.heat = 0; world.wanted.copCars = []; world.wanted.copPeds = [];
      world.player.dead = false; world.player.health = 100; world.player.vehicle = null;
      input.endFrame();
      renderer.draw(world, SCREEN_TITLE);
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (pressed.has('Escape') || pressed.has('KeyP') || pressed.has('Enter')) screen = SCREEN_PLAY;
      input.endFrame(); renderer.draw(world, screen); return;
    }
    if (screen === SCREEN_OVER) {
      if (pressed.has('Enter') || pressed.has('Space') || clicked) { resetAfterDeath(world); syncHandle(); screen = SCREEN_PLAY; }
      input.endFrame(); renderer.draw(world, screen); return;
    }
    // SCREEN_PLAY
    if (pressed.has('Escape') || pressed.has('KeyP')) { screen = SCREEN_PAUSED; writeSave(world); input.endFrame(); renderer.draw(world, screen); return; }
    accumulator += dtReal;
    let steps = 0;
    while (accumulator >= STEP && steps < 5) { stepWorld(world, STEP, input, audio); accumulator -= STEP; steps += 1; }
    if (steps === 0) stepWorld(world, STEP, input, audio);
    input.endFrame();
    if (world.player.dead) { screen = SCREEN_OVER; audio.fail(); writeSave(world); announce(world.endReason === 'busted' ? 'Busted.' : 'Wasted.'); }
    syncHandle();
    renderer.draw(world, screen);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot); else runGame();
