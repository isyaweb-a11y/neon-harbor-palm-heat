// Keyboard + mouse input: held state for movement/driving, one-shot queue for actions.
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 640, y: 360, down: false, clicked: false, wx: 0, wy: 0 };
  window.addEventListener('keydown', (e) => {
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / Math.max(1, r.width));
    mouse.y = (e.clientY - r.top) * (canvas.height / Math.max(1, r.height));
  });
  canvas.addEventListener('pointerdown', (e) => { mouse.down = true; mouse.clicked = true; canvas.focus && canvas.focus(); });
  window.addEventListener('pointerup', () => { mouse.down = false; });
  return {
    keys, mouse,
    down(...codes) { return codes.some((c) => keys.has(c)); },
    wasPressed(code) { return pressed.has(code); },
    peekPressed() { return pressed; },
    consumePressed() { const p = new Set(pressed); pressed.clear(); mouse.clicked = false; return p; },
    endFrame() { pressed.clear(); mouse.clicked = false; },
    moveX() { return (this.down('KeyD', 'ArrowRight') ? 1 : 0) - (this.down('KeyA', 'ArrowLeft') ? 1 : 0); },
    moveY() { return (this.down('KeyS', 'ArrowDown') ? 1 : 0) - (this.down('KeyW', 'ArrowUp') ? 1 : 0); },
  };
}
