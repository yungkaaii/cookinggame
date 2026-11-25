// Beacon & Broth — input. One job: turn mouse clicks and key presses into
// game actions. It knows the layout (bins, board, plate, bell, buttons) and
// hands the state module the calls; it never draws or scores anything itself.

import { LAYOUT, INGREDIENTS, binRect, ticketRect } from './config.js';
import {
  PHASE,
  pickIngredient,
  chopBoard,
  removeFromPlate,
  clearPlate,
  servePlate,
  startShift,
  plateIsReady,
} from './state.js';
import { sfx, ensureAudio, toggleMute } from './audio.js';

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function pointInEllipse(px, py, cx, cy, rx, ry) {
  const dx = (px - cx) / rx;
  const dy = (py - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

// Where the plate's items sit, so clicks can pull one off.
export function plateItemRects(state) {
  const { plate } = LAYOUT;
  const n = state.plate.length;
  if (n === 0) return [];
  const spacing = Math.min(86, (plate.rx * 2 - 40) / Math.max(1, n));
  const x0 = plate.x - ((n - 1) * spacing) / 2;
  return state.plate.map((id, i) => ({
    id,
    index: i,
    x: x0 + i * spacing - 30,
    y: plate.y - 30,
    w: 60,
    h: 60,
  }));
}

export function bindInput(canvas, state, hooks) {
  // hooks: { onStart(), onEndSound(won), onPause() } — main.js wires them.

  function toCanvasCoords(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function handleClick(px, py) {
    ensureAudio();
    if (state.phase === PHASE.MENU) {
      // anywhere on the title screen starts the shift
      sfx.click();
      startShift(state);
      hooks.onStart();
      return;
    }
    if (state.phase === PHASE.END) {
      // click the big restart button, or anywhere, to play again
      sfx.click();
      startShift(state);
      hooks.onStart();
      return;
    }
    if (state.phase === PHASE.PAUSED) {
      state.phase = PHASE.PLAYING;
      return;
    }

    // --- playing: the serve bell ---
    const { bell } = LAYOUT;
    if (pointInEllipse(px, py, bell.x, bell.y, bell.r, bell.r)) {
      const result = servePlate(state);
      if (result === 'served') sfx.serve();
      else if (result === 'wrong') sfx.error();
      return;
    }

    // --- playing: the chopping board ---
    if (pointInRect(px, py, LAYOUT.chopBoard)) {
      if (chopBoard(state)) sfx.chop();
      else if (state.boardItem) sfx.error();
      return;
    }

    // --- playing: pull an item off the plate ---
    for (const item of plateItemRects(state)) {
      if (pointInRect(px, py, item)) {
        if (removeFromPlate(state, item.index)) sfx.click();
        return;
      }
    }

    // --- playing: ingredient bins on the counter ---
    for (let i = 0; i < INGREDIENTS.length; i++) {
      if (pointInRect(px, py, binRect(i))) {
        const result = pickIngredient(state, INGREDIENTS[i].id);
        if (result === 'plate') sfx.plated();
        else if (result === 'board') sfx.pick();
        else sfx.error();
        return;
      }
    }
  }

  canvas.addEventListener('click', (event) => {
    const { x, y } = toCanvasCoords(event);
    handleClick(x, y);
  });

  // Hover feedback is read by the renderer through this shared object.
  const hover = { x: -1, y: -1 };
  canvas.addEventListener('mousemove', (event) => {
    const { x, y } = toCanvasCoords(event);
    hover.x = x;
    hover.y = y;
  });
  canvas.addEventListener('mouseleave', () => {
    hover.x = -1;
    hover.y = -1;
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();

    if (key === 'm') {
      toggleMute();
      return;
    }

    if (state.phase === PHASE.MENU) {
      if (key === 'enter' || key === ' ') {
        ensureAudio();
        sfx.click();
        startShift(state);
        hooks.onStart();
      }
      return;
    }

    if (state.phase === PHASE.END) {
      if (key === 'enter' || key === ' ' || key === 'r') {
        ensureAudio();
        sfx.click();
        startShift(state);
        hooks.onStart();
      }
      return;
    }

    if (key === 'p' || key === 'escape') {
      state.phase = state.phase === PHASE.PAUSED ? PHASE.PLAYING : PHASE.PAUSED;
      sfx.click();
      return;
    }
    if (state.phase === PHASE.PAUSED) return;

    // ingredient hotkeys 1..9, 0
    const ing = INGREDIENTS.find((g) => g.key === key);
    if (ing) {
      ensureAudio();
      const result = pickIngredient(state, ing.id);
      if (result === 'plate') sfx.plated();
      else if (result === 'board') sfx.pick();
      else sfx.error();
      return;
    }
    if (key === 'c') {
      ensureAudio();
      if (chopBoard(state)) sfx.chop();
      return;
    }
    if (key === ' ' || key === 'enter') {
      ensureAudio();
      event.preventDefault();
      const result = servePlate(state);
      if (result === 'served') sfx.serve();
      else if (result === 'wrong') sfx.error();
      return;
    }
    if (key === 'backspace') {
      if (clearPlate(state)) sfx.click();
      return;
    }
    if (key === 'r') {
      startShift(state);
      hooks.onStart();
    }
  });

  return { hover, plateIsReady };
}

// Expose what the renderer needs for hover highlights.
export function hoverTarget(hover) {
  const { x, y } = hover;
  if (x < 0) return null;
  const { bell } = LAYOUT;
  if (pointInEllipse(x, y, bell.x, bell.y, bell.r, bell.r)) return 'bell';
  if (pointInRect(x, y, LAYOUT.chopBoard)) return 'board';
  for (let i = 0; i < INGREDIENTS.length; i++) {
    if (pointInRect(x, y, binRect(i))) return `bin:${INGREDIENTS[i].id}`;
  }
  return null;
}

export { ticketRect };
