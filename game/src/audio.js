// WebAudio-synthesized sound only: engine, siren, gunshots, thuds, chimes, UI and a music groove.
export function createAudio() {
  let ctx = null; let master = null; let engineOsc = null; let engineGain = null;
  let sirenOsc = null; let sirenGain = null; let musicTimer = 0; let musicStep = 0; let muted = false;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
      engineGain = ctx.createGain(); engineGain.gain.value = 0; engineOsc.connect(engineGain); engineGain.connect(master); engineOsc.start();
      sirenOsc = ctx.createOscillator(); sirenOsc.type = 'triangle'; sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0; sirenOsc.connect(sirenGain); sirenGain.connect(master); sirenOsc.start();
      return true;
    } catch { return false; }
  }
  function blip(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }
  function noise(dur, vol, freq) {
    if (!ctx || muted) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1200;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  const BASS = [55, 0, 55, 0, 65.4, 0, 49, 0, 55, 0, 55, 0, 82.4, 0, 73.4, 0];
  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    gunshot() { noise(0.16, 0.5, 2600); blip(150, 0.1, 'square', 0.25, 60); },
    punch() { noise(0.08, 0.3, 700); },
    crash(v) { noise(0.28, Math.min(0.6, 0.2 + v), 500); blip(70, 0.2, 'sawtooth', 0.2, 40); },
    pickup() { blip(880, 0.09, 'sine', 0.25); setTimeout(() => blip(1320, 0.12, 'sine', 0.25), 70); },
    chime() { blip(660, 0.12, 'sine', 0.25); setTimeout(() => blip(990, 0.16, 'sine', 0.25), 110); },
    fail() { blip(220, 0.3, 'sawtooth', 0.25, 110); },
    click() { blip(1200, 0.05, 'square', 0.12); },
    door() { blip(300, 0.08, 'square', 0.15, 180); },
    update(dt, opts) {
      if (!ctx) return;
      const speedRatio = Math.min(1, Math.abs(opts.speed || 0) / 440);
      if (engineGain) engineGain.gain.value += ((opts.driving ? 0.05 + speedRatio * 0.09 : 0) - engineGain.gain.value) * 0.2;
      if (engineOsc) engineOsc.frequency.value = 55 + speedRatio * 130;
      if (sirenGain) { const target = ((opts.wanted || 0) >= 1 && opts.playing) ? 0.035 : 0; sirenGain.gain.value += (target - sirenGain.gain.value) * 0.1; }
      if (sirenOsc && ctx) sirenOsc.frequency.value = 650 + Math.sin(ctx.currentTime * 4.2) * 180;
      if (!opts.playing || muted) return;
      musicTimer -= dt;
      if (musicTimer <= 0) {
        musicTimer = 0.24; musicStep = (musicStep + 1) % 16;
        const f = BASS[musicStep]; if (f) blip(f, 0.22, 'triangle', 0.16);
        if (musicStep % 4 === 0) noise(0.03, 0.05, 6000);
        if (musicStep % 8 === 4) blip(392, 0.2, 'sine', 0.06);
      }
    },
  };
}
