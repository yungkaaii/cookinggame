// Beacon & Broth — entry point. One job: own the canvas, run the game loop,
// wire input to state, and hand the renderer a state to draw each frame.

import { CANVAS_W, CANVAS_H } from './config.js';
import { PHASE, createGameState, tick, startShift, servePlate, pickIngredient, chopBoard } from './state.js';
import { drawGame } from './render.js';
import { bindInput } from './input.js';
import { applyShot } from './shots.js';
import { sfx, ensureAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shotScene = params.get('shot');
const shotSeed = params.get('seed') ? Number(params.get('seed')) : 1;

let state = shotScene ? applyShot(shotScene, shotSeed) : createGameState();

const input = bindInput(canvas, state, {
  onStart() {
    // input's startShift replaced the phase; keep the same state object
  },
  onEndSound() {},
  onPause() {},
});

// The state object is replaced on restart only through startShift, which
// mutates in place, so input keeps working on the same object.
let lastNow = performance.now();
let endSoundPlayed = false;

function frame(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000);
  lastNow = now;

  if (state.phase === PHASE.PLAYING) {
    const event = tick(state, dt);
    if (event === 'tick') sfx.tick();
    else if (event === 'order') sfx.order();
    else if (event === 'expire') sfx.expire();
    else if (event === 'end') {
      endSoundPlayed = false;
    }
  }
  if (state.phase === PHASE.END && !endSoundPlayed) {
    endSoundPlayed = true;
    if (state.won) sfx.win();
    else sfx.lose();
  }
  if (state.phase !== PHASE.END) endSoundPlayed = false;

  drawGame(ctx, state, input.hover, now);
  requestAnimationFrame(frame);
}

// First gesture unlocks audio (browsers require it).
window.addEventListener('pointerdown', ensureAudio, { once: true });
window.addEventListener('keydown', ensureAudio, { once: true });

requestAnimationFrame(frame);

// Debug handle for play-testing: the test driver reads state and drives the
// same public functions a player uses. It is part of the shipped game.
window.BeaconBroth = {
  state: () => state,
  canvas: () => canvas,
  startShift: () => startShift(state),
  servePlate: () => servePlate(state),
  pickIngredient: (id) => pickIngredient(state, id),
  chopBoard: () => chopBoard(state),
};
