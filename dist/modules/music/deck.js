// The walkman's tape transport: one <audio> element played through a small "cassette" chain in Web Audio —
// a little warmth, the top end rolled off, wow & flutter on the speed, a bed of hiss — and a level for the VU needle.
// A track plays its own file when Fred has put one in audio/, otherwise Apple's 30-second preview.
export const trackSource = track => track?.audio ? new URL(`./audio/${track.audio}`, import.meta.url).href : track?.preview || '';

export function createDeck() {
  const audio = new Audio();
  audio.crossOrigin = 'anonymous'; audio.preload = 'auto';
  if ('preservesPitch' in audio) audio.preservesPitch = false;   // a tape changes pitch with speed
  let ctx = null, analyser = null, hiss = null, data = null, flutter = 0, rate = 1, running = false, ramp = 0;

  function chain() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const Context = window.AudioContext || window.webkitAudioContext; if (!Context) return;
    ctx = new Context();
    const source = ctx.createMediaElementSource(audio);
    const warm = ctx.createBiquadFilter(); warm.type = 'peaking'; warm.frequency.value = 140; warm.gain.value = 2; warm.Q.value = .7;
    const shelf = ctx.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 7000; shelf.gain.value = -4;
    const top = ctx.createBiquadFilter(); top.type = 'lowpass'; top.frequency.value = 12500; top.Q.value = .5;
    analyser = ctx.createAnalyser(); analyser.fftSize = 1024; data = new Float32Array(analyser.fftSize);
    source.connect(warm).connect(shelf).connect(top).connect(analyser).connect(ctx.destination);
    // Hiss: quiet filtered noise, only while the tape runs.
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const loop = ctx.createBufferSource(); loop.buffer = noise; loop.loop = true;
    const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 6000; band.Q.value = .4;
    hiss = ctx.createGain(); hiss.gain.value = 0;
    loop.connect(band).connect(hiss).connect(ctx.destination); loop.start();
  }
  // Wow (slow) and flutter (fast) on the playback speed; `rate` ramps for motor start and stop.
  function wobble() {
    const t = performance.now() / 1000;
    audio.playbackRate = Math.max(.07, rate * (1 + .0022 * Math.sin(t * 2 * Math.PI * .55) + .0009 * Math.sin(t * 2 * Math.PI * 6.8)));
    flutter = requestAnimationFrame(wobble);
  }
  function glide(from, to, ms) {
    cancelAnimationFrame(ramp);
    return new Promise(resolve => {
      const start = performance.now();
      const step = now => { const k = Math.min(1, (now - start) / ms); rate = from + (to - from) * (1 - (1 - k) ** 2); if (k < 1) ramp = requestAnimationFrame(step); else resolve(); };
      ramp = requestAnimationFrame(step);
    });
  }

  return {
    audio,
    load(track, at = 0) {
      const src = trackSource(track);
      if (!src) { audio.removeAttribute('src'); return; }
      if (audio.src !== src) audio.src = src;
      try { audio.currentTime = at; } catch {}
    },
    async play({ reduced = false } = {}) {
      chain(); running = true;
      if (hiss) hiss.gain.setTargetAtTime(.012, ctx.currentTime, .05);
      cancelAnimationFrame(flutter); wobble();
      rate = reduced ? 1 : .55;
      try { await audio.play(); } catch (error) { running = false; throw error; }
      if (!reduced) await glide(.55, 1, 260);
    },
    async stop({ reduced = false, wind = true } = {}) {
      if (!running) { audio.pause(); return; }
      running = false;
      if (hiss) hiss.gain.setTargetAtTime(0, ctx.currentTime, .04);
      if (!reduced && wind && !audio.paused) await glide(rate, .3, 220);
      audio.pause(); cancelAnimationFrame(flutter); cancelAnimationFrame(ramp); rate = 1;
    },
    get running() { return running; },
    // 0–1, roughly how a VU meter would read the last few milliseconds.
    level() {
      if (!analyser || !running) return 0;
      analyser.getFloatTimeDomainData(data);
      let sum = 0; for (const v of data) sum += v * v;
      return Math.min(1, Math.sqrt(sum / data.length) * 3.2);
    },
    destroy() { running = false; cancelAnimationFrame(flutter); cancelAnimationFrame(ramp); audio.pause(); audio.removeAttribute('src'); audio.load(); ctx?.close(); },
  };
}
