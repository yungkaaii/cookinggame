// Beacon & Broth — configuration: canvas, layout, ingredients, recipes, rules.
// One job: every tunable number and name lives here, so the rest of the game
// reads it instead of hard-coding positions or recipe data.

export const CANVAS_W = 1280;
export const CANVAS_H = 800;

// ---- shift rules -----------------------------------------------------------
export const SHIFT_SECONDS = 150; // one full shift
export const TARGET_SCORE = 400; // reach this by the end of the shift to win
export const MAX_ORDERS = 3; // tickets pinned to the board at once
export const PLATE_MAX = 4; // items the assembly plate holds
export const SERVE_BASE = 30; // points for any correct serve
export const SERVE_TIP_MAX = 20; // extra points for serving fast
export const COMBO_BONUS = 5; // per consecutive correct serve
export const WRONG_SERVE_PENALTY = 5;
export const EXPIRED_ORDER_PENALTY = 10;

// ---- ingredients -----------------------------------------------------------
export const INGREDIENTS = [
  { id: 'fish', name: 'Fish', key: '1', color: '#7fb3d5', needsChop: true },
  { id: 'potato', name: 'Potato', key: '2', color: '#d9a066', needsChop: true },
  { id: 'carrot', name: 'Carrot', key: '3', color: '#e67e22', needsChop: false },
  { id: 'onion', name: 'Onion', key: '4', color: '#d7bde2', needsChop: false },
  { id: 'bread', name: 'Bread', key: '5', color: '#c98f4e', needsChop: false },
  { id: 'cheese', name: 'Cheese', key: '6', color: '#f4d03f', needsChop: false },
  { id: 'berry', name: 'Berry', key: '7', color: '#8e44ad', needsChop: false },
  { id: 'mushroom', name: 'Mushroom', key: '8', color: '#ec7063', needsChop: false },
  { id: 'egg', name: 'Egg', key: '9', color: '#f9e79f', needsChop: false },
  { id: 'herb', name: 'Herb', key: '0', color: '#58d68d', needsChop: false },
];

export const INGREDIENT_BY_ID = Object.fromEntries(
  INGREDIENTS.map((ing) => [ing.id, ing]),
);

// ---- recipes ---------------------------------------------------------------
export const RECIPES = [
  { id: 'lantern-chowder', name: 'Lantern Chowder', needs: ['fish', 'potato', 'onion'], price: 30 },
  { id: 'sailors-stew', name: "Sailor's Stew", needs: ['potato', 'carrot', 'mushroom'], price: 30 },
  { id: 'tidepool-salad', name: 'Tidepool Salad', needs: ['carrot', 'berry', 'herb'], price: 30 },
  { id: 'storm-biscuit', name: 'Storm Biscuit', needs: ['bread', 'cheese', 'egg'], price: 30 },
  { id: 'foghorn-pie', name: 'Foghorn Pie', needs: ['fish', 'cheese', 'mushroom'], price: 30 },
  { id: 'beacon-breakfast', name: 'Beacon Breakfast', needs: ['egg', 'bread', 'berry'], price: 30 },
];

// ---- layout (canvas pixels, 1280 x 800) ------------------------------------
export const LAYOUT = {
  // top bar
  topBar: { x: 0, y: 0, w: 1280, h: 64 },
  timerDial: { x: 640, y: 32, r: 24 },
  // order board (right)
  board: { x: 968, y: 84, w: 292, h: 300 },
  ticket: { w: 268, h: 84, gap: 10 },
  // kitchen window (left, shows the night sea + lighthouse)
  window: { x: 24, y: 84, w: 560, h: 220 },
  // assembly zone (centre)
  chopBoard: { x: 120, y: 380, w: 190, h: 130 },
  plate: { x: 640, y: 445, rx: 150, ry: 62 },
  bell: { x: 980, y: 445, r: 52 },
  // ingredient counter (bottom)
  counter: { x: 0, y: 600, w: 1280, h: 200 },
  bin: { w: 112, h: 128, gap: 12, y: 628 },
};

// Bins are laid out in one row, centred, from INGREDIENTS order.
export function binRect(index) {
  const { bin, counter } = LAYOUT;
  const total = INGREDIENTS.length * bin.w + (INGREDIENTS.length - 1) * bin.gap;
  const x0 = (counter.w - total) / 2;
  return { x: x0 + index * (bin.w + bin.gap), y: bin.y, w: bin.w, h: bin.h };
}

// Ticket rect for the i-th order on the board.
export function ticketRect(index) {
  const { board, ticket } = LAYOUT;
  return {
    x: board.x + (board.w - ticket.w) / 2,
    y: board.y + 34 + index * (ticket.h + ticket.gap),
    w: ticket.w,
    h: ticket.h,
  };
}

// Small deterministic RNG for staged screenshot states.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
