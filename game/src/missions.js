// Story chain, side activities, phone messages and collectibles for Neon Harbor.
import { dist } from './random.js';

export const FIXER = 'MICA';
export const INTRO_TEXT = 'Mica (fixer): "You owe the Harbor, kid. Do my jobs, keep the heat off, and we are square. First: lift the coral coupe I marked and drop it at my Chop Garage. — M"';

export const STORY = [
  { id: 'steal', title: 'Hot Coral', brief: 'Steal the marked coral coupe', detail: 'Get in the marked car, then deliver it to the Chop Garage.', reward: 450 },
  { id: 'package', title: 'Tide Runner', brief: 'Pick up the package at the pier lockers', detail: 'Grab the package, then drop it at Hotel Sol. Expect heat.', reward: 650 },
  { id: 'rival', title: 'Rival Heat', brief: 'Stop the rival driver', detail: 'Ram the rival car until it stops, or box it in for 3 seconds.', reward: 900 },
  { id: 'escape', title: 'Last Ferry', brief: 'Escape to the Marina — 90 seconds!', detail: 'Lose the cops or reach the Marina before the timer runs out.', reward: 1400 },
  { id: 'done', title: 'Harbor Legend', brief: 'Story complete — free roam!', detail: 'Taxi fares, checkpoint races and neon palms still pay. Keep exploring Neon Harbor.', reward: 0 },
];

export function createMissions(saved) {
  return {
    stage: (saved && saved.stage) ?? 0, phase: 'brief', timer: 0, rivalStopTime: 0,
    hasPackage: false, banner: null, bannerTimer: 0, phone: INTRO_TEXT, phoneTimer: 9,
    taxi: null, race: null, palmsFound: (saved && saved.palmsFound) || [],
    message(text, secs) { this.phone = text; this.phoneTimer = secs || 6; },
    objective() {
      const s = STORY[Math.min(this.stage, STORY.length - 1)];
      if (this.taxi) return `Taxi: pick up the fare — $${this.taxi.fare} on delivery`;
      if (this.race) return `Race: checkpoint ${this.race.next + 1}/${this.race.points.length} — ${Math.max(0, this.race.time).toFixed(0)}s left`;
      return s.brief + (this.phase === 'deliver' && s.id === 'steal' ? ' — deliver it to the Chop Garage' : '') + (this.hasPackage ? ' — deliver the package to Hotel Sol' : '');
    },
  };
}
export function missionMarker(m, world) {
  const s = STORY[Math.min(m.stage, STORY.length - 1)];
  if (m.taxi) return m.taxi.phase === 'pickup' ? { x: m.taxi.px, y: m.taxi.py, color: '#ffd21f', label: 'FARE' } : { x: m.taxi.dx, y: m.taxi.dy, color: '#ffd21f', label: 'DROP' };
  if (m.race) { const p = m.race.points[m.race.next]; return p ? { x: p.x, y: p.y, color: '#2ee6e6', label: 'RACE' } : null; }
  if (s.id === 'steal') {
    if (m.phase === 'brief' && world.markedCar) return { x: world.markedCar.x, y: world.markedCar.y, color: '#ff4d9d', label: 'STEAL' };
    return { x: world.city.garage.x, y: world.city.garage.y, color: '#ff4d9d', label: 'GARAGE' };
  }
  if (s.id === 'package') {
    if (!m.hasPackage) return { x: 2920, y: 520, color: '#2ee6e6', label: 'PACKAGE' };
    return { x: 900, y: 700, color: '#2ee6e6', label: 'HOTEL SOL' };
  }
  if (s.id === 'rival' && world.rivalCar) return { x: world.rivalCar.x, y: world.rivalCar.y, color: '#ff3b30', label: 'RIVAL' };
  if (s.id === 'escape') return { x: world.city.marina.x, y: world.city.marina.y, color: '#ffe14d', label: 'MARINA' };
  return null;
}
export const PALM_SPOTS = [
  { x: 300, y: 300 }, { x: 1500, y: 300 }, { x: 2700, y: 400 }, { x: 500, y: 1500 },
  { x: 1700, y: 1500 }, { x: 3000, y: 1300 }, { x: 900, y: 2200 }, { x: 2200, y: 2300 },
  { x: 3050, y: 2300 }, { x: 1200, y: 900 },
];
export function nearMarker(player, marker, r) {
  if (!marker) return false;
  const px = player.vehicle ? player.vehicle.x : player.x; const py = player.vehicle ? player.vehicle.y : player.y;
  return dist(px, py, marker.x, marker.y) < (r || 64);
}
