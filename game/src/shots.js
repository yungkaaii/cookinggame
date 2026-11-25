// Beacon & Broth — screenshot staging. One job: read ?shot=<scene>&seed=<n>
// and put the game into a fixed, readable state for a real render. Normal
// play never passes a shot parameter, so this never runs for a player.

import { PHASE, createGameState, startShift } from './state.js';
import { RECIPES, SHIFT_SECONDS } from './config.js';

// Build a deterministic scene. Each scene shows the kitchen at its best and
// together the four scenes show every required element: the kitchen, the
// order board, ingredients on the counter, a dish mid-assembly, the timer
// and a plate ready to serve.
export function applyShot(scene, seed) {
  const s = createGameState(seed ?? 1);
  startShift(s);
  // freeze the clock at a readable moment in the shift
  s.elapsed = 54;
  s.timeLeft = SHIFT_SECONDS - 54;
  s.score = 120;
  s.combo = 2;
  s.served = 4;
  s.spawnIn = 99; // no surprise tickets while the shot is taken
  s.orders = [];
  s.plate = [];
  s.boardItem = null;

  function pin(recipe, frac) {
    const patience = 50 - 18 * (s.elapsed / SHIFT_SECONDS);
    const order = {
      id: 100 + s.orders.length,
      recipe,
      patience: patience * frac,
      patienceMax: patience,
      bornAt: s.elapsed,
    };
    s.orders.push(order);
    return order;
  }

  if (scene === 'play') {
    // busy mid-shift: two tickets, a dish half-built on the plate
    pin(RECIPES[0], 0.62); // Lantern Chowder
    pin(RECIPES[1], 0.85); // Sailor's Stew
    s.plate = ['fish', 'potato'];
    s.boardItem = 'potato';
    s.message = 'Chop the potato, then ring the bell!';
    s.messageKind = 'good';
    s.messageAt = s.elapsed;
  } else if (scene === 'mid') {
    // a dish mid-assembly: one ticket, two items on the plate, one chopping
    pin(RECIPES[3], 0.7); // Storm Biscuit
    pin(RECIPES[2], 0.45); // Tidepool Salad
    s.plate = ['bread', 'cheese'];
    s.boardItem = 'fish';
    s.message = '';
  } else if (scene === 'serve') {
    // the plate holds a complete dish that matches the first ticket
    const first = pin(RECIPES[0], 0.78); // Lantern Chowder
    pin(RECIPES[4], 0.55); // Foghorn Pie
    s.plate = [...first.recipe.needs];
    s.bellGlow = 1;
    s.message = 'Lantern Chowder is ready — ring the bell!';
    s.messageKind = 'good';
    s.messageAt = s.elapsed;
  } else if (scene === 'win') {
    // the shift is won: end screen over the kitchen, score above target
    s.score = 430;
    s.served = 13;
    s.lost = 1;
    s.wrongServes = 0;
    s.combo = 5;
    s.phase = PHASE.END;
    s.won = true;
    s.timeLeft = 0;
  } else {
    // unknown scene: fall back to the title screen
    return createGameState(seed ?? 1);
  }
  return s;
}
