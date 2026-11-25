// Beacon & Broth — game state and rules. One job: the shift, the orders, the
// plate, the chopping board, the score. No drawing, no input, no sound here —
// callers (main.js, input.js) drive these functions and read the state back.

import {
  INGREDIENTS,
  INGREDIENT_BY_ID,
  RECIPES,
  SHIFT_SECONDS,
  TARGET_SCORE,
  MAX_ORDERS,
  PLATE_MAX,
  SERVE_BASE,
  SERVE_TIP_MAX,
  COMBO_BONUS,
  WRONG_SERVE_PENALTY,
  EXPIRED_ORDER_PENALTY,
  mulberry32,
} from './config.js';

export const PHASE = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  END: 'end',
};

let orderSeq = 0;

export function createGameState(seed = null) {
  const rng = seed === null ? Math.random : mulberry32(seed);
  return {
    phase: PHASE.MENU,
    rng,
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    score: 0,
    combo: 0,
    served: 0,
    lost: 0,
    wrongServes: 0,
    orders: [], // { id, recipe, patience, patienceMax, bornAt }
    plate: [], // ingredient ids, in pick order
    boardItem: null, // ingredient id waiting on the chopping board, or null
    boardChopped: false,
    spawnIn: 1.5, // seconds until the next order pins
    won: false,
    message: '', // floating feedback text
    messageAt: 0,
    messageKind: '',
    lastTickSecond: -1,
    flashes: [], // { x, y, text, color, born } floating score popups
    bellGlow: 0, // 0..1, lights the serve bell when the plate matches an order
    shake: 0, // screen shake magnitude, decays
  };
}

export function startShift(state) {
  state.phase = PHASE.PLAYING;
  state.timeLeft = SHIFT_SECONDS;
  state.elapsed = 0;
  state.score = 0;
  state.combo = 0;
  state.served = 0;
  state.lost = 0;
  state.wrongServes = 0;
  state.orders = [];
  state.plate = [];
  state.boardItem = null;
  state.boardChopped = false;
  state.spawnIn = 1.2;
  state.won = false;
  state.message = '';
  state.flashes = [];
  state.lastTickSecond = -1;
  spawnOrder(state);
}

export function patienceFor(state) {
  // Orders get less patient as the shift wears on: 50s early, 32s late.
  const p = state.elapsed / SHIFT_SECONDS;
  return 50 - 18 * p;
}

export function spawnIntervalFor(state) {
  // New tickets pin faster as the shift wears on: 12s early, 7s late.
  const p = state.elapsed / SHIFT_SECONDS;
  return 12 - 5 * p;
}

export function spawnOrder(state) {
  if (state.orders.length >= MAX_ORDERS) return null;
  const recipe = RECIPES[Math.floor(state.rng() * RECIPES.length)];
  const patience = patienceFor(state);
  const order = {
    id: ++orderSeq,
    recipe,
    patience,
    patienceMax: patience,
    bornAt: state.elapsed,
  };
  state.orders.push(order);
  return order;
}

// The order (if any) whose recipe exactly matches the plate's contents.
export function matchingOrder(state) {
  if (state.plate.length === 0) return null;
  const plateSet = [...state.plate].sort().join(',');
  return state.orders.find((o) => [...o.recipe.needs].sort().join(',') === plateSet) ?? null;
}

export function plateIsReady(state) {
  return matchingOrder(state) !== null;
}

function showMessage(state, text, kind) {
  state.message = text;
  state.messageKind = kind;
  state.messageAt = state.elapsed;
}

function addFlash(state, x, y, text, color) {
  state.flashes.push({ x, y, text, color, born: state.elapsed });
}

// Pick an ingredient from the counter. Choppable ones go to the board first;
// the rest land straight on the plate. Returns 'plate' | 'board' | 'blocked'.
export function pickIngredient(state, ingredientId) {
  if (state.phase !== PHASE.PLAYING) return 'blocked';
  const ing = INGREDIENT_BY_ID[ingredientId];
  if (!ing) return 'blocked';
  if (ing.needsChop) {
    if (state.boardItem !== null) return 'blocked'; // board is busy
    if (state.plate.length >= PLATE_MAX) return 'blocked';
    state.boardItem = ingredientId;
    state.boardChopped = false;
    return 'board';
  }
  if (state.plate.length >= PLATE_MAX) return 'blocked';
  state.plate.push(ingredientId);
  return 'plate';
}

// Chop the item waiting on the board; it hops onto the plate.
export function chopBoard(state) {
  if (state.phase !== PHASE.PLAYING) return false;
  if (state.boardItem === null || state.boardChopped) return false;
  if (state.plate.length >= PLATE_MAX) return false;
  state.boardChopped = true;
  state.plate.push(state.boardItem);
  state.boardItem = null;
  state.boardChopped = false;
  return true;
}

// Pull one item off the plate (click it to take it back).
export function removeFromPlate(state, index) {
  if (state.phase !== PHASE.PLAYING) return false;
  if (index < 0 || index >= state.plate.length) return false;
  state.plate.splice(index, 1);
  return true;
}

export function clearPlate(state) {
  if (state.phase !== PHASE.PLAYING) return false;
  state.plate = [];
  return true;
}

// Ring the bell: serve the plate if it matches an open order.
export function servePlate(state) {
  if (state.phase !== PHASE.PLAYING) return 'blocked';
  if (state.plate.length === 0) return 'blocked';
  const order = matchingOrder(state);
  if (!order) {
    state.score = Math.max(0, state.score - WRONG_SERVE_PENALTY);
    state.combo = 0;
    state.wrongServes++;
    showMessage(state, 'No order wants that dish!', 'bad');
    state.shake = 6;
    return 'wrong';
  }
  const patienceFrac = Math.max(0, order.patience / order.patienceMax);
  const tip = Math.round(SERVE_TIP_MAX * patienceFrac);
  const points = SERVE_BASE + tip + state.combo * COMBO_BONUS;
  state.score += points;
  state.combo++;
  state.served++;
  state.orders = state.orders.filter((o) => o.id !== order.id);
  state.plate = [];
  showMessage(state, `Served ${order.recipe.name}! +${points}`, 'good');
  addFlash(state, 640, 420, `+${points}`, '#ffd94d');
  if (state.score >= TARGET_SCORE) {
    showMessage(state, `Target ${TARGET_SCORE} reached — keep serving!`, 'good');
  }
  return 'served';
}

export function endShift(state) {
  state.phase = PHASE.END;
  state.won = state.score >= TARGET_SCORE;
}

// Advance the clock by dt seconds. Returns an event tag for sound cues.
export function tick(state, dt) {
  if (state.phase !== PHASE.PLAYING) return null;
  state.elapsed += dt;
  state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);
  state.bellGlow = plateIsReady(state) ? Math.min(1, state.bellGlow + dt * 4) : 0;
  state.shake = Math.max(0, state.shake - dt * 30);

  // floating score popups fade after 1.2s
  state.flashes = state.flashes.filter((f) => state.elapsed - f.born < 1.2);

  // last-10-seconds tick
  let event = null;
  const sec = Math.ceil(state.timeLeft);
  if (state.timeLeft <= 10.5 && sec !== state.lastTickSecond) {
    state.lastTickSecond = sec;
    event = 'tick';
  }

  // orders lose patience; an expired ticket is lost
  for (const order of [...state.orders]) {
    order.patience -= dt;
    if (order.patience <= 0) {
      state.orders = state.orders.filter((o) => o.id !== order.id);
      state.score = Math.max(0, state.score - EXPIRED_ORDER_PENALTY);
      state.combo = 0;
      state.lost++;
      showMessage(state, `${order.recipe.name} sailed away… −${EXPIRED_ORDER_PENALTY}`, 'bad');
      event = 'expire';
    }
  }

  // new tickets pin to the board on a schedule
  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    if (spawnOrder(state)) event = event ?? 'order';
    state.spawnIn = spawnIntervalFor(state) * (0.8 + state.rng() * 0.4);
  }

  if (state.timeLeft <= 0) {
    endShift(state);
    return 'end';
  }
  return event;
}

export function ingredientList() {
  return INGREDIENTS;
}
