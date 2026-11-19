// Neon Harbor: Palm Heat — tuning, palette and world constants in one place.
export const STEP = 1 / 60;
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const WORLD_W = 3360;
export const WORLD_H = 2520;
export const SAVE_KEY = 'neon-harbor-palm-heat-save-v1';
export const PALETTE = {
  sand: '#e8c98a', water: '#1f9db4', waterDeep: '#157a94', foam: '#eafcff',
  grass: '#7db35c', park: '#5da34a', asphalt: '#3a3f4a', asphaltDark: '#2f333d',
  lane: '#f5d76e', sidewalk: '#c9c2b4', curb: '#9d968a',
  roof: '#5b4a3f', neonPink: '#ff4d9d', neonCyan: '#2ee6e6', neonYellow: '#ffe14d',
  palmTrunk: '#8a6a45', palmLeaf: '#2e9e5b', playerShirt: '#ff5a3c', playerPants: '#2b3a67',
  skin: '#e8b08a', copBlue: '#24407a', copLight: '#ff3b30', taxi: '#ffd21f',
  hudBg: 'rgba(12,16,28,0.72)', hudText: '#ffffff', hudMuted: '#c9d2e0',
  starOn: '#ffd21f', starOff: 'rgba(255,255,255,0.25)', health: '#3ddc6f',
};
export const BUILDING_COLORS = ['#f2a65a', '#e76f8a', '#5ec8d8', '#f7e8b0', '#b388eb', '#ff8c69', '#7fd1a8', '#f4f1de'];
export const CAR_COLORS = ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#e9c46a', '#9b5de5', '#00b4d8', '#ef476f', '#ffd21f', '#f1fa8c'];
export const PLAYER_CFG = { radius: 13, walkSpeed: 172, sprintSpeed: 272, maxHealth: 100, punchRange: 36, punchDamage: 34, pistolDamage: 45, pistolRange: 540, pistolCooldown: 0.24, startCash: 120, startAmmo: 48 };
export const CAR_CFG = { width: 46, height: 23, maxSpeed: 440, reverseSpeed: 155, accel: 310, brake: 540, drag: 0.55, turnRate: 2.4, trafficSpeed: 155, trafficCount: 13, parkedCount: 15 };
export const PED_CFG = { count: 26, radius: 11, walkSpeed: 64, fleeSpeed: 168 };
export const POLICE_CFG = { sightRange: 470, loseSightAfter: 7, decayPerSecond: 0.05, bustRadius: 48, bustTime: 1.5, shootRange: 350, shootCooldown: 1.2, shootDamage: 7 };
export const DISTRICTS = [
  { name: 'Downtown', x0: 0, y0: 0, x1: 1500, y1: 1150 },
  { name: 'Beachfront', x0: 2450, y0: 0, x1: 3360, y1: 2520 },
  { name: 'Marina', x0: 1500, y0: 1650, x1: 2450, y1: 2520 },
  { name: 'Suburbs', x0: 0, y0: 1150, x1: 1500, y1: 2520 },
  { name: 'Industrial', x0: 1500, y0: 0, x1: 2450, y1: 1150 },
];
export const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';
export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d.name;
  return 'Neon Harbor';
}
