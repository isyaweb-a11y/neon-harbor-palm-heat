// HUD + minimap: health, cash, ammo, wanted stars, objective banner, speedo and phone messages.
import { PALETTE, FONT, VIEW_W, VIEW_H, WORLD_W, WORLD_H, districtAt } from './config.js';
import { V_ROADS, H_ROADS } from './city.js';
import { missionMarker, STORY } from './missions.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudBg; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
}
export function drawMinimap(ctx, world, x, y, size) {
  const s = size / WORLD_W; const h = size * (WORLD_H / WORLD_W);
  ctx.save();
  panel(ctx, x - 6, y - 6, size + 12, h + 12);
  ctx.fillStyle = '#274b2f'; ctx.fillRect(x, y, size, h);
  ctx.fillStyle = '#e8c98a'; ctx.fillRect(x + 2960 * s, y, (WORLD_W - 2960) * s, h);
  ctx.fillStyle = '#1f9db4'; ctx.fillRect(x + 3140 * s, y, (WORLD_W - 3140) * s, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
  for (const rx of V_ROADS) { ctx.beginPath(); ctx.moveTo(x + rx * s, y); ctx.lineTo(x + rx * s, y + h); ctx.stroke(); }
  for (const ry of H_ROADS) { ctx.beginPath(); ctx.moveTo(x, y + ry * (size / WORLD_W)); ctx.lineTo(x + size, y + ry * (size / WORLD_W)); ctx.stroke(); }
  const p = world.player; const px = p.vehicle ? p.vehicle.x : p.x; const py = p.vehicle ? p.vehicle.y : p.y;
  // Traffic hints (faint dots).
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (const c of world.cars) { if (Math.abs(c.x - px) < 700 && Math.abs(c.y - py) < 700) ctx.fillRect(x + c.x * s - 1, y + c.y * s - 1, 2, 2); }
  // Police (blue/red dots).
  for (const c of world.wanted.copCars) { ctx.fillStyle = world.time % 0.6 < 0.3 ? '#ff3b30' : '#57b6ff'; ctx.beginPath(); ctx.arc(x + c.x * s, y + c.y * s, 3, 0, 7); ctx.fill(); }
  // Mission marker.
  const mk = missionMarker(world.missions, world);
  if (mk) { ctx.fillStyle = mk.color; ctx.beginPath(); ctx.arc(x + mk.x * s, y + mk.y * s, 4.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
  // Player arrow.
  const ang = p.vehicle ? p.vehicle.angle : p.angle;
  ctx.save(); ctx.translate(x + px * s, y + py * s); ctx.rotate(ang);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -4.5); ctx.lineTo(-5, 4.5); ctx.closePath(); ctx.fill();
  ctx.restore(); ctx.restore();
}
export function drawHUD(ctx, world) {
  const p = world.player; const m = world.missions;
  ctx.textBaseline = 'alphabetic';
  // Top-left: cash + district + health.
  panel(ctx, 14, 14, 252, 86);
  ctx.font = `bold 22px ${FONT}`; ctx.fillStyle = '#7dff8a'; ctx.textAlign = 'left';
  ctx.fillText(`$${p.cash}`, 26, 44);
  ctx.font = `13px ${FONT}`; ctx.fillStyle = PALETTE.hudMuted;
  ctx.fillText(districtAt(p.vehicle ? p.vehicle.x : p.x, p.vehicle ? p.vehicle.y : p.y) + ' · Neon Harbor', 26, 64);
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(26, 74, 200, 10);
  ctx.fillStyle = PALETTE.health; ctx.fillRect(26, 74, 200 * Math.max(0, p.health / 100), 10);
  // Top-right: wanted stars.
  ctx.font = `30px ${FONT}`; ctx.textAlign = 'right';
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i < world.wanted.stars ? PALETTE.starOn : PALETTE.starOff; ctx.fillText('★', VIEW_W - 22 - (4 - i) * 30, 46); }
  if (world.wanted.bustProgress > 0.05) {
    ctx.font = `bold 16px ${FONT}`; ctx.fillStyle = '#ff5a5a'; ctx.textAlign = 'center';
    ctx.fillText('BUSTED METER — MOVE!', VIEW_W / 2, 96);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(VIEW_W / 2 - 110, 104, 220, 8);
    ctx.fillStyle = '#ff3b30'; ctx.fillRect(VIEW_W / 2 - 110, 104, 220 * Math.min(1, world.wanted.bustProgress / 1.5), 8);
  }
  // Objective banner (top centre).
  const obj = m.objective(); const story = STORY[Math.min(m.stage, STORY.length - 1)];
  ctx.font = `bold 14px ${FONT}`; const w = Math.min(560, ctx.measureText(obj).width + 90);
  panel(ctx, VIEW_W / 2 - w / 2, 14, w, 52);
  ctx.fillStyle = '#ffd21f'; ctx.textAlign = 'center'; ctx.fillText(`${story.title.toUpperCase()}`, VIEW_W / 2, 36);
  ctx.font = `14px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(obj, VIEW_W / 2, 56);
  if (m.stage === 3 && m.phase === 'run') { ctx.font = `bold 20px ${FONT}`; ctx.fillStyle = m.timer < 20 ? '#ff5a5a' : '#fff'; ctx.fillText(`${Math.max(0, m.timer).toFixed(0)}s`, VIEW_W / 2, 88); }
  // Phone message (bottom centre).
  if (m.phoneTimer > 0 && m.phone) {
    ctx.font = `14px ${FONT}`;
    const lines = wrapText(ctx, m.phone, 520);
    const panelY = VIEW_H - 108 - lines.length * 19;
    panel(ctx, VIEW_W / 2 - 280, panelY, 560, 24 + lines.length * 19);
    ctx.fillStyle = '#aee9ff'; ctx.textAlign = 'left';
    lines.forEach((ln, i) => ctx.fillText(ln, VIEW_W / 2 - 264, panelY + 27 + i * 19));
  }
  // Bottom-right: weapon/ammo + speed.
  panel(ctx, VIEW_W - 196, VIEW_H - 78, 182, 64);
  ctx.font = `bold 16px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
  ctx.fillText(p.vehicle ? 'DRIVING' : (p.ammo > 0 ? 'PISTOL' : 'FISTS'), VIEW_W - 28, VIEW_H - 48);
  ctx.font = `14px ${FONT}`; ctx.fillStyle = PALETTE.hudMuted;
  ctx.fillText(p.vehicle ? `${Math.round(Math.abs(p.vehicle.speed) * 0.36)} km/h · DMG ${Math.max(0, Math.round(p.vehicle.health))}%` : `Ammo ${p.ammo} · Palms ${m.palmsFound.length}/10`, VIEW_W - 28, VIEW_H - 26);
  // Prompt (bottom-left contextual).
  if (world.prompt) {
    ctx.font = `bold 15px ${FONT}`; const pw = ctx.measureText(world.prompt).width + 28;
    panel(ctx, 14, VIEW_H - 52, pw, 38); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(world.prompt, 28, VIEW_H - 27);
  }
  drawMinimap(ctx, world, VIEW_W - 186, 86, 168);
}
export function wrapText(ctx, text, maxW) {
  const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) { if (ctx.measureText(cur + ' ' + w).width > maxW && cur) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
  if (cur) lines.push(cur); return lines.slice(0, 3);
}
