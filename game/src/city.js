// Seeded procedural city: road grid, blocks, buildings, palms, props and collision shapes.
import { WORLD_W, WORLD_H, BUILDING_COLORS } from './config.js';
import { pick, randInt, randRange } from './random.js';

export const ROAD_W = 92;
export const V_ROADS = [260, 860, 1460, 2060, 2660];
export const H_ROADS = [240, 800, 1360, 1920];

export function isOnRoad(x, y) {
  for (const rx of V_ROADS) if (Math.abs(x - rx) < ROAD_W / 2) return true;
  for (const ry of H_ROADS) if (Math.abs(y - ry) < ROAD_W / 2) return true;
  return false;
}
export function nearestRoadPoint(x, y) {
  let best = { x, y, d: 1e18 };
  for (const rx of V_ROADS) { const d = Math.abs(x - rx); if (d < best.d) best = { x: rx, y, d }; }
  for (const ry of H_ROADS) { const d = Math.abs(y - ry); if (d < best.d) best = { x, y: ry, d }; }
  return best;
}
const SIGNS = ['PALM MART', 'NEON NOODLES', 'TIDAL TACOS', 'HOTEL SOL', 'SURF & CO', 'MARINA MOTORS', 'VICE VAPES', 'CAFE AZUL', 'PAWN PALMS', 'CLUB LAGOON', 'TIKI TIRES', 'SUNSET SUSHI'];

export function generateCity(rng) {
  const buildings = []; const palms = []; const props = []; const colliders = []; const blocks = [];
  const xs = [0, ...V_ROADS.flatMap((r) => [r - ROAD_W / 2 - 14, r + ROAD_W / 2 + 14]), WORLD_W];
  const ys = [0, ...H_ROADS.flatMap((r) => [r - ROAD_W / 2 - 14, r + ROAD_W / 2 + 14]), WORLD_H];
  // Blocks sit between roads; fill each block with 1-4 buildings.
  for (let bi = 0; bi < xs.length - 1; bi += 2) {
    for (let bj = 0; bj < ys.length - 1; bj += 2) {
      const bx = xs[bi]; const by = ys[bj]; const bw = xs[bi + 1] - bx; const bh = ys[bj + 1] - by;
      if (bw < 90 || bh < 90) continue;
      if (bx > 2920) continue; // beach + water strip stays open
      blocks.push({ x: bx, y: by, w: Math.min(bw, 2952 - bx), h: bh, tone: rng() < 0.4 ? '#a9bf8a' : '#cfc7ae' });
      const downtown = bx < 1500 && by < 1150;
      const n = downtown ? randInt(rng, 2, 3) : randInt(rng, 1, 3);
      for (let k = 0; k < n; k++) {
        const w = randRange(rng, 70, Math.min(190, bw / n + 40));
        const h = randRange(rng, 60, Math.min(170, bh / n + 40));
        const x = bx + 12 + rng() * Math.max(10, bw - w - 24);
        const y = by + 12 + rng() * Math.max(10, bh - h - 24);
        if (x + w > 2940) continue; // never build on the beach or in the water
        const b = { x, y, w, h, color: pick(rng, BUILDING_COLORS), floors: randInt(rng, 2, downtown ? 9 : 4), sign: rng() < 0.42 ? pick(rng, SIGNS) : null, neon: pick(rng, ['#ff4d9d', '#2ee6e6', '#ffe14d', '#ff8c42']) };
        buildings.push(b); colliders.push({ x, y, w, h });
      }
      // Palms along block edges.
      const palmN = randInt(rng, 1, 4);
      for (let p = 0; p < palmN; p++) palms.push({ x: bx + rng() * bw, y: by + rng() * bh, s: randRange(rng, 0.8, 1.25) });
    }
  }
  // Beach palms + umbrellas.
  for (let i = 0; i < 46; i++) palms.push({ x: randRange(rng, 2760, 3060), y: rng() * WORLD_H, s: randRange(rng, 0.9, 1.4) });
  for (let i = 0; i < 22; i++) props.push({ kind: 'umbrella', x: randRange(rng, 2900, 3120), y: rng() * WORLD_H, color: pick(rng, BUILDING_COLORS) });
  for (let i = 0; i < 60; i++) {
    const onV = rng() < 0.5;
    const x = onV ? pick(rng, V_ROADS) + (rng() < 0.5 ? -62 : 62) : rng() * 2900;
    const y = onV ? rng() * WORLD_H : pick(rng, H_ROADS) + (rng() < 0.5 ? -62 : 62);
    props.push({ kind: rng() < 0.5 ? 'lamp' : 'hydrant', x, y, color: '#ffd76e' });
  }
  const garage = { x: 1460, y: 1920, label: 'CHOP GARAGE' };
  const marina = { x: 2660, y: 2240, label: 'MARINA' };
  const hospital = { x: 860, y: 800, label: 'HOSPITAL' };
  return { buildings, palms, props, colliders, blocks, garage, marina, hospital, beachX: 2960, waterX: 3140 };
}

export function collideRects(x, y, r, colliders) {
  for (const c of colliders) {
    const nx = Math.max(c.x, Math.min(x, c.x + c.w)); const ny = Math.max(c.y, Math.min(y, c.y + c.h));
    const dx = x - nx; const dy = y - ny;
    if (dx * dx + dy * dy < r * r) return { nx, ny, dx, dy, c };
  }
  return null;
}
export function resolveCircle(x, y, r, colliders) {
  const hit = collideRects(x, y, r, colliders);
  if (!hit) return { x, y, hit: false };
  let dx = hit.dx; let dy = hit.dy;
  if (dx === 0 && dy === 0) { dy = -1; }
  const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
  return { x: hit.nx + dx * (r + 1), y: hit.ny + dy * (r + 1), hit: true };
}
