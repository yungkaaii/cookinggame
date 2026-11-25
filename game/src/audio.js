// Beacon & Broth — sounds. One job: every sound effect is a tiny WebAudio
// synth written here. No audio files, no network, nothing to load.

let audioCtx = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

// Created lazily on the first user gesture, so browsers allow it.
export function ensureAudio() {
  if (!audioCtx) {
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) audioCtx = new Ctor();
    } catch {
      audioCtx = null;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol, when = 0, lowpass = 1200) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t0);
}

export const sfx = {
  // soft pop when an ingredient is picked from the counter
  pick() {
    tone(520, 0.09, 'sine', 0.16);
    tone(780, 0.07, 'sine', 0.1, 0.03);
  },
  // knife thock on the chopping board
  chop() {
    noiseBurst(0.09, 0.35, 0, 900);
    tone(180, 0.08, 'triangle', 0.2, 0, 90);
  },
  // little two-note chime when a chopped item hops to the plate
  plated() {
    tone(660, 0.1, 'sine', 0.14);
    tone(880, 0.12, 'sine', 0.12, 0.06);
  },
  // bright arpeggio for a correct serve
  serve() {
    tone(523, 0.12, 'triangle', 0.18);
    tone(659, 0.12, 'triangle', 0.18, 0.08);
    tone(784, 0.16, 'triangle', 0.2, 0.16);
    tone(1047, 0.22, 'sine', 0.16, 0.24);
  },
  // low buzz for a wrong serve or a blocked pick
  error() {
    tone(160, 0.22, 'sawtooth', 0.14, 0, 110);
  },
  // ship's bell ding when a new order pins to the board
  order() {
    tone(1175, 0.3, 'sine', 0.14);
    tone(1568, 0.4, 'sine', 0.1, 0.05);
  },
  // short tick when the shift clock hits its last seconds
  tick() {
    tone(980, 0.05, 'square', 0.06);
  },
  // sad slide when an order expires
  expire() {
    tone(330, 0.35, 'triangle', 0.14, 0, 165);
  },
  // fanfare for a won shift
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, 'triangle', 0.18, i * 0.11));
  },
  // low phrase for a lost shift
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.15, i * 0.14));
  },
  // click on a button
  click() {
    tone(440, 0.06, 'sine', 0.12);
  },
};
