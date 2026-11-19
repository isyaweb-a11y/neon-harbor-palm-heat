# neon-harbor-palm-heat

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/isyaweb-a11y/neon-harbor-palm-heat/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/isyaweb-a11y/neon-harbor-palm-heat/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Neon Harbor: Palm Heat** — an original open-world crime game for the browser, built from scratch with no libraries and no assets. Explore a sun-soaked harbor city on foot and by car: a seeded procedural city with a road grid, neon-signed shops, sidewalks, palm trees, a beach and water, and five districts that feel different (Downtown, Beachfront, Marina, Suburbs, Industrial), all under warm golden-hour light.

You owe the Harbor. Fixer **Mica** holds your debt — run her jobs, keep the heat off, and earn your freedom.

## What's in the game

- **Open world:** traffic AI that drives the road network and stops for obstacles, parked cars everywhere, pedestrians who wander sidewalks and crosswalks and flee speeding cars, gunfire and fights.
- **Driving & carjacking:** walk up to any car and press **E** to take it. Arcade driving with acceleration, steering, handbrake drift, tire smoke and skid marks, vehicle damage with engine smoke, and collisions with buildings, cars and pedestrians.
- **Wanted system (0–5 stars):** witnessed crimes (carjacking, assault, gunfire, hit-and-run, reckless driving, mission crimes) raise your stars. Police cruisers spawn in proportion, chase, ram and box you in; on-foot officers arrive at higher stars and shoot back at 3+ stars. Stay out of sight to cool down. Get boxed in at low speed and you're **BUSTED**; lose all health and you're **WASTED**.
- **Combat:** fists when you're out of ammo, a pistol with muzzle flash, tracers and synthesized gunshots. Downed characters fall and fade — no gore.
- **Story — 4 missions from Mica:** (1) *Hot Coral* — steal the marked coral coupe and deliver it to the Chop Garage; (2) *Tide Runner* — grab a package at the pier lockers and deliver it to Hotel Sol while police respond; (3) *Rival Heat* — chase down and stop a rival driver's pink rocket; (4) *Last Ferry* — a 90-second escape to the Marina to clear your debt. Phone-style messages from Mica brief every job.
- **Side activities:** taxi fares (**T**), a 4-checkpoint race (**R**, $300), and 10 hidden neon-palm collectibles ($75 each).
- **HUD & minimap:** health bar, cash, weapon + ammo, wanted stars, mission objective banner, speedometer and damage readout in a car, busted meter, contextual prompts, and a live minimap showing streets, your arrow, police, nearby traffic and the mission marker.
- **Menus & save:** animated title screen over the living city (New Game / Continue), pause, BUSTED/WASTED screens with restart. Cash, mission stage, ammo and collectibles auto-save to `localStorage`.
- **Sound:** everything is synthesized with WebAudio — no audio files. Engine hum tied to speed, police siren, gunshots, crash and punch thuds, pickup/mission chimes, UI clicks and a looping bass-groove soundtrack. Audio starts on your first key press or click; **M** mutes.

## Controls

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Move on foot · steer & drive in a car |
| Mouse | Aim |
| Click / Space (on foot) | Shoot pistol (or punch when out of ammo) |
| Shift | Sprint |
| E | Enter / exit a car (carjack) |
| Space (in a car) | Handbrake — drift |
| T | Call a taxi fare (on foot) |
| R | Start the checkpoint race (in a car) |
| Esc / P | Pause |
| M | Mute |
| Enter | Start / confirm / restart |

## How to play

1. Press **Enter** on the title screen. Read Mica's message at the bottom of the screen.
2. Follow the glowing objective marker (also shown on the minimap) to the coral coupe, press **E** to steal it, and drive it to the **Chop Garage**.
3. Keep an eye on your stars: the more police see, the harder they come. Break line of sight to let the heat decay.
4. Finish all four story missions to clear your debt — then keep earning with fares, races and palms in free roam.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

All static files under `game/`, no build step, no network requests. The game also supports deterministic screenshot staging via `?shot=cover|drive|chase|mission&seed=N`.

## Source layout

One clear job per file under `game/src/`: `config.js` (tuning + palette), `random.js` (seeded RNG + math), `input.js` (keyboard/mouse), `audio.js` (synth SFX + music), `city.js` (city generation + collision), `vehicles.js` (car physics + traffic AI), `pedestrians.js`, `police.js` (wanted + pursuit), `player.js` (on-foot + combat), `missions.js` (story chain + activities), `hud.js` (HUD + minimap), `render.js` (world + entity drawing), `world.js` (simulation orchestration), `shots.js` (screenshot staging), `main.js` (boot + loop).

---

<sub>Entered on [make.fun](https://make.fun/?ref=sc1d8ke0&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
