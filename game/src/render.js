// World + entity drawing: golden-hour coastal city, roads, buildings, cars, people, effects, menus.
import { PALETTE, FONT, VIEW_W, VIEW_H, WORLD_W, WORLD_H } from './config.js';
import { V_ROADS, H_ROADS, ROAD_W } from './city.js';
import { drawHUD, wrapText } from './hud.js';
import { missionMarker, PALM_SPOTS } from './missions.js';

export const SCREEN_TITLE = 'title'; export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused'; export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  function resize() {
    canvas.width = VIEW_W; canvas.height = VIEW_H;
  }
  function drawBuilding(b, cam) {
    const x = b.x - cam.x; const y = b.y - cam.y;
    if (x + b.w < -40 || y + b.h < -40 || x > VIEW_W + 40 || y > VIEW_H + 40) return;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x + 7, y + 9, b.w, b.h);
    ctx.fillStyle = b.color; ctx.fillRect(x, y, b.w, b.h);
    ctx.fillStyle = 'rgba(70,45,35,0.55)'; ctx.fillRect(x + 9, y + 9, b.w - 18, b.h - 18);
    ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.fillRect(x + 9, y + 9, b.w - 18, 9);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, b.w - 2, b.h - 2);
    // Windows grid.
    ctx.fillStyle = 'rgba(255,236,170,0.75)';
    const cols = Math.max(2, Math.floor(b.w / 26)); const rows = Math.max(2, Math.floor(b.h / 24));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if ((i * 7 + j * 13 + b.floors) % 3 === 0) continue;
      ctx.fillRect(x + 10 + i * ((b.w - 18) / cols), y + 10 + j * ((b.h - 18) / rows), 9, 11);
    }
    if (b.sign) {
      ctx.font = `bold 11px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(10,10,20,0.85)'; const tw = ctx.measureText(b.sign).width + 12;
      ctx.fillRect(x + b.w / 2 - tw / 2, y + b.h - 20, tw, 16);
      ctx.fillStyle = b.neon; ctx.fillText(b.sign, x + b.w / 2, y + b.h - 8);
    }
  }
  function drawCar(car, cam, time) {
    const x = car.x - cam.x; const y = car.y - cam.y;
    if (x < -80 || y < -80 || x > VIEW_W + 80 || y > VIEW_H + 80) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-20, -8, 48, 24);
    const body = car.kind === 'police' ? '#eef1f5' : car.rival ? '#ff2e88' : car.marked ? '#ff7a45' : car.color;
    ctx.fillStyle = body; ctx.beginPath(); ctx.roundRect(-23, -11.5, 46, 23, 7); ctx.fill();
    if (car.kind === 'police') { ctx.fillStyle = PALETTE.copBlue; ctx.fillRect(-8, -11.5, 16, 23); }
    ctx.fillStyle = '#bfe9ff'; ctx.beginPath(); ctx.roundRect(-4, -9, 15, 18, 4); ctx.fill();
    ctx.fillStyle = '#223'; ctx.fillRect(-19, -12.5, 9, 4); ctx.fillRect(10, -12.5, 9, 4); ctx.fillRect(-19, 8.5, 9, 4); ctx.fillRect(10, 8.5, 9, 4);
    // Headlights + taillights.
    ctx.fillStyle = '#fff6b0'; ctx.fillRect(21, -8, 3, 5); ctx.fillRect(21, 3, 3, 5);
    ctx.fillStyle = '#ff3b30'; ctx.fillRect(-24, -8, 3, 5); ctx.fillRect(-24, 3, 3, 5);
    if (car.kind === 'police') { ctx.fillStyle = time % 0.5 < 0.25 ? '#ff3b30' : '#57b6ff'; ctx.beginPath(); ctx.arc(2, 0, 5, 0, 7); ctx.fill(); }
    if (car.marked || car.rival) { ctx.fillStyle = car.rival ? '#ff3b30' : '#ffe14d'; ctx.font = `bold 15px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('▼', 0, -20); }
    ctx.restore();
    if (car.smoke > 0.25) { ctx.fillStyle = `rgba(60,60,60,${0.25 * car.smoke})`; ctx.beginPath(); ctx.arc(x + 8, y - 10 - (time * 20 % 14), 8 + (time * 20 % 10), 0, 7); ctx.fill(); }
  }
  function drawPerson(px, py, angle, shirt, opts) {
    ctx.save(); ctx.translate(px, py); ctx.scale(1.3, 1.3);
    if (opts && opts.down) { ctx.rotate(1.4); ctx.globalAlpha = opts.alpha; }
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 3, 11, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = shirt; ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, 7); ctx.fill();
    ctx.fillStyle = PALETTE.skin; ctx.beginPath(); ctx.arc(0, 0, 5.2, 0, 7); ctx.fill();
    ctx.strokeStyle = shirt; ctx.lineWidth = 3.4;
    const sw = Math.sin((opts && opts.walk) || 0) * 5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-4, 8 + sw); ctx.moveTo(0, 0); ctx.lineTo(4, 8 - sw); ctx.stroke();
    ctx.save(); ctx.rotate(angle); ctx.strokeStyle = PALETTE.skin; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(3, -4); ctx.lineTo(11, -4); ctx.moveTo(3, 4); ctx.lineTo(11, 4); ctx.stroke(); ctx.restore();
    ctx.restore();
  }
  function drawWorld(world) {
    const cam = world.camera; const t = world.time;
    // Ground: grass/suburb base, then beach + water.
    ctx.fillStyle = PALETTE.grass; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = PALETTE.sand; ctx.fillRect(world.city.beachX - cam.x, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = PALETTE.water; ctx.fillRect(world.city.waterX - cam.x, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = PALETTE.waterDeep;
    for (let i = 0; i < 8; i++) { const wy = ((i * 340 + t * 22) % (WORLD_H + 200)) - cam.y - 100; ctx.fillRect(world.city.waterX + 40 - cam.x, wy, 130, 7); }
    ctx.fillStyle = PALETTE.foam; ctx.fillRect(world.city.waterX - 5 - cam.x, 0, 6, VIEW_H);
    // Sidewalk slabs under roads.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const rx of V_ROADS) ctx.fillRect(rx - ROAD_W / 2 - 15 - cam.x, -cam.y, ROAD_W + 30, WORLD_H);
    for (const ry of H_ROADS) ctx.fillRect(-cam.x, ry - ROAD_W / 2 - 15 - cam.y, WORLD_W, ROAD_W + 30);
    // Asphalt + lane markings.
    ctx.fillStyle = PALETTE.asphalt;
    for (const rx of V_ROADS) ctx.fillRect(rx - ROAD_W / 2 - cam.x, -cam.y, ROAD_W, WORLD_H);
    for (const ry of H_ROADS) ctx.fillRect(-cam.x, ry - ROAD_W / 2 - cam.y, WORLD_W, ROAD_W);
    ctx.fillStyle = PALETTE.lane;
    for (const rx of V_ROADS) for (let y = 0; y < WORLD_H; y += 56) ctx.fillRect(rx - 2 - cam.x, y - cam.y, 4, 30);
    for (const ry of H_ROADS) for (let x = 0; x < WORLD_W; x += 56) ctx.fillRect(x - cam.x, ry - 2 - cam.y, 30, 4);
    // Crosswalks at intersections.
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    for (const rx of V_ROADS) for (const ry of H_ROADS) {
      for (let i = -2; i <= 2; i++) { ctx.fillRect(rx - ROAD_W / 2 - cam.x, ry + i * 13 - 3 - cam.y, 14, 6); ctx.fillRect(rx + ROAD_W / 2 - 14 - cam.x, ry + i * 13 - 3 - cam.y, 14, 6); }
    }
    // City-block ground: pavement and park tones so blocks read as built-up ground, not lawn.
    for (const bl of world.city.blocks || []) {
      const x = bl.x - cam.x; const y = bl.y - cam.y;
      if (x + bl.w < 0 || y + bl.h < 0 || x > VIEW_W || y > VIEW_H) continue;
      ctx.fillStyle = bl.tone; ctx.fillRect(x, y, bl.w, bl.h);
    }
    // Buildings, props, palms.
    for (const b of world.city.buildings) drawBuilding(b, cam);
    for (const pr of world.city.props) {
      const x = pr.x - cam.x; const y = pr.y - cam.y; if (x < -30 || y < -30 || x > VIEW_W + 30 || y > VIEW_H + 30) continue;
      if (pr.kind === 'umbrella') { ctx.fillStyle = pr.color; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); }
      else if (pr.kind === 'lamp') { ctx.fillStyle = '#3a3f4a'; ctx.fillRect(x - 2, y - 2, 4, 4); ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = '#d64545'; ctx.fillRect(x - 3, y - 5, 6, 10); }
    }
    for (const pm of world.city.palms) {
      const x = pm.x - cam.x; const y = pm.y - cam.y; if (x < -40 || y < -40 || x > VIEW_W + 40 || y > VIEW_H + 40) continue;
      ctx.strokeStyle = PALETTE.palmTrunk; ctx.lineWidth = 4 * pm.s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y - 12 * pm.s); ctx.stroke();
      ctx.strokeStyle = PALETTE.palmLeaf; ctx.lineWidth = 3;
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.4; ctx.beginPath(); ctx.moveTo(x + 4, y - 12 * pm.s); ctx.lineTo(x + 4 + Math.cos(a) * 15 * pm.s, y - 12 * pm.s + Math.sin(a) * 8 * pm.s + 4); ctx.stroke(); }
    }
    // Collectible neon palms.
    PALM_SPOTS.forEach((sp, i) => {
      if (world.missions.palmsFound.includes(i)) return;
      const x = sp.x - cam.x; const y = sp.y - cam.y; if (x < -30 || x > VIEW_W + 30 || y < -30 || y > VIEW_H + 30) return;
      ctx.fillStyle = '#ff4d9d'; ctx.beginPath(); ctx.arc(x, y, 11 + Math.sin(t * 4 + i) * 2, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('🌴'.length ? 'P' : 'P', x, y + 4);
    });
    // Skid marks.
    ctx.strokeStyle = 'rgba(20,20,20,0.4)'; ctx.lineWidth = 3;
    for (const sk of world.skids) { ctx.beginPath(); ctx.moveTo(sk.x - cam.x, sk.y - cam.y); ctx.lineTo(sk.x2 - cam.x, sk.y2 - cam.y); ctx.stroke(); }
    // Mission marker pillar.
    const mk = missionMarker(world.missions, world);
    if (mk) {
      const x = mk.x - cam.x; const y = mk.y - cam.y;
      const pulse = 26 + Math.sin(t * 5) * 6;
      ctx.fillStyle = mk.color + '55'; ctx.beginPath(); ctx.arc(x, y, pulse, 0, 7); ctx.fill();
      ctx.strokeStyle = mk.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, pulse, 0, 7); ctx.stroke();
      ctx.fillStyle = mk.color; ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(mk.label, x, y - pulse - 8);
    }
    // Garage / marina pads.
    for (const pad of [world.city.garage, world.city.marina]) {
      const x = pad.x - cam.x; const y = pad.y - cam.y;
      ctx.fillStyle = 'rgba(255,210,31,0.2)'; ctx.fillRect(x - 52, y - 38, 104, 76);
      ctx.strokeStyle = '#ffd21f'; ctx.lineWidth = 2; ctx.strokeRect(x - 52, y - 38, 104, 76);
      ctx.fillStyle = '#fff'; ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(pad.label, x, y + 4);
    }
    // Cars, peds, cops.
    for (const c of world.cars) drawCar(c, cam, t);
    for (const c of world.wanted.copCars) drawCar(c, cam, t);
    if (world.rivalCar) drawCar(world.rivalCar, cam, t);
    for (const ped of world.peds) {
      const x = ped.x - cam.x; const y = ped.y - cam.y; if (x < -30 || y < -30 || x > VIEW_W + 30 || y > VIEW_H + 30) continue;
      if (ped.state === 'down') drawPerson(x, y, ped.angle, ped.shirt, { down: true, alpha: Math.max(0, ped.downTimer / 4) });
      else drawPerson(x, y, ped.angle, ped.shirt, { walk: world.time * 9 + ped.x });
    }
    for (const ped of world.wanted.copPeds) {
      const x = ped.x - cam.x; const y = ped.y - cam.y;
      if (ped.state === 'down') drawPerson(x, y, ped.angle, '#24407a', { down: true, alpha: Math.max(0, ped.downTimer / 4) });
      else drawPerson(x, y, ped.angle, '#24407a', { walk: world.time * 9 });
    }
    // Player.
    const p = world.player;
    if (!p.vehicle) {
      drawPerson(p.x - cam.x, p.y - cam.y, p.angle, PALETTE.playerShirt, { walk: p.walkCycle * 6 });
      if (p.muzzle > 0) { ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.arc(p.x - cam.x + Math.cos(p.angle) * 26, p.y - cam.y + Math.sin(p.angle) * 26, 8, 0, 7); ctx.fill(); }
    }
    // Tracers + particles.
    for (const tr of world.tracers) { ctx.strokeStyle = 'rgba(255,225,77,0.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tr.x - cam.x, tr.y - cam.y); ctx.lineTo(tr.x2 - cam.x, tr.y2 - cam.y); ctx.stroke(); }
    for (const pt of world.particles) { ctx.fillStyle = pt.color; ctx.globalAlpha = Math.max(0, pt.life / pt.max); ctx.fillRect(pt.x - cam.x - 2, pt.y - cam.y - 2, 4, 4); ctx.globalAlpha = 1; }
    // Golden-hour wash + vignette.
    ctx.fillStyle = PALETTE.skyGlow || 'rgba(255,150,60,0.10)'; ctx.fillStyle = 'rgba(255,150,60,0.10)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const grad = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(30,10,40,0.20)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  function bigPanel(title, lines, prompt, accent) {
    ctx.fillStyle = 'rgba(8,10,20,0.78)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(14,18,32,0.96)'; ctx.beginPath(); ctx.roundRect(VIEW_W / 2 - 330, 92, 660, 470, 16); ctx.fill();
    ctx.strokeStyle = accent || '#ff4d9d'; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = accent || '#ff4d9d'; ctx.font = `bold 46px ${FONT}`;
    ctx.fillText(title, VIEW_W / 2, 168);
    ctx.font = `16px ${FONT}`; ctx.fillStyle = '#e8edf5';
    lines.forEach((ln, i) => { wrapText(ctx, ln, 580).forEach((sub, j, arr) => ctx.fillText(sub, VIEW_W / 2, 208 + (i * 3 + j) * 24)); });
    ctx.font = `bold 18px ${FONT}`; ctx.fillStyle = '#ffd21f'; ctx.fillText(prompt, VIEW_W / 2, 528);
  }
  function draw(world, screen) {
    drawWorld(world);
    if (screen === SCREEN_PLAY) { drawHUD(ctx, world); return; }
    if (screen === SCREEN_PAUSED) { drawHUD(ctx, world); bigPanel('PAUSED', ['Take a breather — Neon Harbor waits.', 'Esc / P to resume · M to mute · progress auto-saves.'], 'Press Esc to resume', '#2ee6e6'); return; }
    if (screen === SCREEN_OVER) {
      const busted = world.endReason === 'busted';
      bigPanel(busted ? 'BUSTED' : 'WASTED', [busted ? 'The Harbor PD boxed you in. Mica posts your bail — at a price.' : 'You flatlined on the asphalt. The hospital patches you up — at a price.', `Cash kept: $${world.player.cash} · Mission: ${world.missions.stage + 1} · Palms: ${world.missions.palmsFound.length}/10`], 'Press Enter to keep playing', '#ff3b30'); return;
    }
    // Title screen over the live city.
    ctx.fillStyle = 'rgba(10,8,24,0.45)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe14d'; ctx.font = `bold 24px ${FONT}`; ctx.fillText('★ NEON HARBOR ★', VIEW_W / 2, 120);
    ctx.fillStyle = '#ff4d9d'; ctx.font = `bold 74px ${FONT}`; ctx.fillText('PALM HEAT', VIEW_W / 2, 192);
    ctx.fillStyle = '#fff'; ctx.font = `17px ${FONT}`;
    ctx.fillText('An original open-world crime caper in a sun-soaked harbor city.', VIEW_W / 2, 232);
    ctx.fillText('Steal cars, run Mica\'s jobs, dodge the Harbor PD, chase the sunset.', VIEW_W / 2, 258);
    ctx.fillStyle = 'rgba(14,18,32,0.92)'; ctx.beginPath(); ctx.roundRect(VIEW_W / 2 - 320, 286, 640, 168, 12); ctx.fill();
    ctx.fillStyle = '#e8edf5'; ctx.font = `15px ${FONT}`; ctx.textAlign = 'left';
    const controls = ['WASD / Arrows — move & drive      Mouse — aim · Click / Space — attack', 'E — enter / exit car (carjack!)     Shift — sprint · Space (in car) — handbrake', 'Esc / P — pause · M — mute          Wanted stars rise with witnessed crimes'];
    controls.forEach((ln, i) => ctx.fillText(ln, VIEW_W / 2 - 296, 326 + i * 30));
    ctx.textAlign = 'center'; ctx.fillStyle = '#7dff8a'; ctx.font = `bold 19px ${FONT}`;
    ctx.fillText(world.hasSave ? 'Press ENTER for NEW GAME · C to CONTINUE' : 'Press ENTER or CLICK to start', VIEW_W / 2, 500);
    ctx.fillStyle = '#c9d2e0'; ctx.font = `13px ${FONT}`;
    ctx.fillText('4 story missions · taxi fares · checkpoint races · 10 hidden neon palms · progress saves automatically', VIEW_W / 2, 532);
    drawHUD(ctx, world);
  }
  resize();
  return { draw, ctx };
}
