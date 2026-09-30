// Every object's voice, synthesised on the fly (no audio files). Off until the visitor turns it on; the choice is remembered.
const KEY = 'fred-sound';
let on = false, ctx = null, noise = null, master = null, lastFlap = 0;
try { on = localStorage.getItem(KEY) === 'on'; } catch {}

function audio() {
  if (!ctx) {
    const Context = window.AudioContext || window.webkitAudioContext; if (!Context) return null;
    ctx = new Context(); master = ctx.createGain(); master.gain.value = .7; master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
// A short filtered noise burst: clicks, clacks and detents.
function click(freq, length, gain, at = 0) {
  const t = ctx.currentTime + at, source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), amp = ctx.createGain();
  source.buffer = noise; source.playbackRate.value = .8 + Math.random() * .4;
  filter.type = 'bandpass'; filter.frequency.value = freq; filter.Q.value = 1.6;
  amp.gain.setValueAtTime(gain, t); amp.gain.exponentialRampToValueAtTime(.0001, t + length);
  source.connect(filter).connect(amp).connect(master); source.start(t, Math.random() * .5, length + .02);
}
function tone(freq, length, gain, { at = 0, type = 'sine', to = freq } = {}) {
  const t = ctx.currentTime + at, osc = ctx.createOscillator(), amp = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t); if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t + length);
  amp.gain.setValueAtTime(.0001, t); amp.gain.exponentialRampToValueAtTime(gain, t + .008); amp.gain.exponentialRampToValueAtTime(.0001, t + length);
  osc.connect(amp).connect(master); osc.start(t); osc.stop(t + length + .02);
}

const VOICES = {
  flap() { const now = performance.now(); if (now - lastFlap < 14) return; lastFlap = now; click(2400 + Math.random() * 900, .016, .07); click(800, .01, .04); },
  tick() { click(3400, .012, .1); },                                  // knob detent, odometer drum, cover-flow step
  reading() { click(1800, .02, .06); },                               // ticket seated / disc caught
  ok() { tone(1760, .11, .06); },                                     // the gate's beep
  error() { tone(330, .11, .07, { type: 'triangle' }); tone(330, .11, .07, { type: 'triangle', at: .16 }); },
  drive() { click(900, .03, .12); tone(70, 1.1, .035, { type: 'sawtooth', to: 190 }); },  // the tray takes the disc and spins up
  lever() { click(650, .05, .22); tone(95, .09, .12, { at: .01 }); tone(55, .5, .02, { at: .08 }); }, // clunk, then mains hum
  print() { for (let i = 0; i < 14; i++) click(1500 + Math.random() * 1200, .012, .06, i * .045); },  // dot-matrix chatter
  key() { click(1200, .025, .12); tone(160, .05, .05); },             // a key going down
  type() { click(1900 + Math.random() * 500, .02, .15); tone(120, .04, .06); click(4200, .006, .05, .014); }, // a typebar strikes the platen
  ret() { for (let i = 0; i < 12; i++) click(1400 - i * 45, .01, .05, i * .026); click(380, .06, .28, .33); tone(78, .1, .16, { at: .33 }); }, // carriage return: ratchet, then the stop
  bell() { tone(2637, .9, .07); tone(3951, .5, .018); tone(5274, .35, .012); },                            // the margin bell
  feed() { for (let i = 0; i < 9; i++) click(900 - i * 40, .014, .08, i * .055); tone(70, .5, .025, { type: 'triangle' }); }, // platen ratchet
  play() { click(700, .04, .2); tone(110, .08, .1, { at: .01 }); tone(58, .6, .03, { at: .06, type: 'sawtooth', to: 64 }); }, // PLAY latches, the capstan motor starts
  clack() { click(1500, .02, .14); click(520, .05, .2, .03); tone(140, .05, .06, { at: .03 }); },  // the cassette seated, the door shut
  wind() { for (let i = 0; i < 16; i++) click(2600 + i * 70, .012, .035, i * .03); tone(90, .5, .02, { type: 'sawtooth', to: 240 }); }, // fast wind
  halt() { click(420, .06, .22); tone(70, .12, .1); },               // the key springs up at the end of the side
  roll() { click(900, .05, .16); for (let i = 0; i < 5; i++) click(2200 - i * 260, .018, .07 - i * .01, .09 + i * .07 * (1 - i * .08)); tone(120, .08, .08, { at: .02 }); }, // a capsule falls, bounces, rolls to the flap
  paper() {                                                      // a sheet lifted off the desk: a soft rising swish
    const t = ctx.currentTime, source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), amp = ctx.createGain();
    source.buffer = noise; filter.type = 'bandpass'; filter.Q.value = .7;
    filter.frequency.setValueAtTime(1400, t); filter.frequency.exponentialRampToValueAtTime(4200, t + .28);
    amp.gain.setValueAtTime(.0001, t); amp.gain.exponentialRampToValueAtTime(.09, t + .08); amp.gain.exponentialRampToValueAtTime(.0001, t + .34);
    source.connect(filter).connect(amp).connect(master); source.start(t, Math.random() * .5, .36);
  },
};

export function play(name) {
  if (!on || !VOICES[name]) return;
  if (!audio()) return;
  try { VOICES[name](); } catch {}
}
export const soundOn = () => on;
export function setSound(value) {
  on = value; try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {}
  if (on && audio()) VOICES.tick();
}
