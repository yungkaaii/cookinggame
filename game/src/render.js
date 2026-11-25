// Beacon & Broth — rendering. One job: draw everything on the canvas — the
// lighthouse kitchen, the order board, the counter, the plate, the timer and
// the screens. All art is drawn here in code; nothing is loaded from a file.

import {
  CANVAS_W,
  CANVAS_H,
  INGREDIENTS,
  INGREDIENT_BY_ID,
  LAYOUT,
  TARGET_SCORE,
  binRect,
  ticketRect,
} from './config.js';
import { PHASE, plateIsReady } from './state.js';
import { plateItemRects, hoverTarget } from './input.js';
import { isMuted } from './audio.js';

// ---------------------------------------------------------------- helpers
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function woodFill(ctx, x, y, w, h, base, dark) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  for (let i = 1; i <= 3; i++) {
    const gy = y + (h * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x + 4, gy);
    ctx.bezierCurveTo(x + w * 0.3, gy - 3, x + w * 0.6, gy + 3, x + w - 4, gy);
    ctx.stroke();
  }
}

function text(ctx, str, x, y, size, color, font = 'bold', align = 'center') {
  ctx.fillStyle = color;
  ctx.font = `${font} ${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// ---------------------------------------------------------------- icons
// Each ingredient is a small canvas drawing, so the counter reads at a glance.
export function drawIngredientIcon(ctx, id, cx, cy, size, chopped = false) {
  const s = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (id === 'fish') {
    ctx.fillStyle = '#7fb3d5';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.95, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.8, 0);
    ctx.lineTo(s * 1.35, -s * 0.55);
    ctx.lineTo(s * 1.35, s * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a2e3d';
    ctx.beginPath();
    ctx.arc(-s * 0.45, -s * 0.12, s * 0.09, 0, Math.PI * 2);
    ctx.fill();
    if (chopped) drawChopMarks(ctx, s);
  } else if (id === 'potato') {
    ctx.fillStyle = '#d9a066';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.9, s * 0.68, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a9713f';
    for (const [ex, ey] of [[-0.3, -0.2], [0.25, 0.15], [0.05, -0.35]]) {
      ctx.beginPath();
      ctx.arc(ex * s, ey * s, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
    if (chopped) drawChopMarks(ctx, s);
  } else if (id === 'carrot') {
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s * 0.35);
    ctx.lineTo(s * 0.9, -s * 0.1);
    ctx.lineTo(s * 0.9, s * 0.25);
    ctx.lineTo(-s * 0.55, s * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#58d68d';
    ctx.lineWidth = s * 0.16;
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s * 0.35);
    ctx.lineTo(-s * 0.95, -s * 0.9);
    ctx.moveTo(-s * 0.4, -s * 0.4);
    ctx.lineTo(-s * 0.6, -s * 1.0);
    ctx.stroke();
  } else if (id === 'onion') {
    ctx.fillStyle = '#e8d5f2';
    ctx.beginPath();
    ctx.arc(0, s * 0.1, s * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b795c9';
    ctx.lineWidth = s * 0.08;
    ctx.beginPath();
    ctx.arc(0, s * 0.1, s * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, s * 0.1, s * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#58d68d';
    ctx.lineWidth = s * 0.12;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.6);
    ctx.lineTo(0, -s * 1.05);
    ctx.stroke();
  } else if (id === 'bread') {
    ctx.fillStyle = '#c98f4e';
    roundRect(ctx, -s * 0.9, -s * 0.45, s * 1.8, s * 0.9, s * 0.45);
    ctx.fill();
    ctx.fillStyle = '#f0c98f';
    roundRect(ctx, -s * 0.75, -s * 0.3, s * 1.5, s * 0.6, s * 0.3);
    ctx.fill();
    ctx.strokeStyle = '#a9713f';
    ctx.lineWidth = s * 0.07;
    for (const dx of [-0.4, 0, 0.4]) {
      ctx.beginPath();
      ctx.moveTo(dx * s, -s * 0.3);
      ctx.lineTo(dx * s, s * 0.3);
      ctx.stroke();
    }
  } else if (id === 'cheese') {
    ctx.fillStyle = '#f4d03f';
    ctx.beginPath();
    ctx.moveTo(-s * 0.85, s * 0.5);
    ctx.lineTo(s * 0.85, s * 0.5);
    ctx.lineTo(s * 0.85, -s * 0.1);
    ctx.lineTo(-s * 0.85, -s * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d4a017';
    for (const [hx, hy] of [[-0.3, 0.15], [0.3, 0.1], [0.05, -0.25]]) {
      ctx.beginPath();
      ctx.arc(hx * s, hy * s, s * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'berry') {
    ctx.fillStyle = '#8e44ad';
    for (const [bx, by, br] of [[-0.35, 0.25, 0.42], [0.35, 0.25, 0.42], [0, -0.3, 0.45]]) {
      ctx.beginPath();
      ctx.arc(bx * s, by * s, br * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#d2b4e8';
    ctx.beginPath();
    ctx.arc(-s * 0.2, -s * 0.35, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'mushroom') {
    ctx.fillStyle = '#ec7063';
    ctx.beginPath();
    ctx.arc(0, -s * 0.15, s * 0.85, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fdebd0';
    ctx.fillRect(-s * 0.28, -s * 0.15, s * 0.56, s * 0.75);
    ctx.fillStyle = '#fdebd0';
    for (const [sx, sy] of [[-0.45, -0.45], [0.1, -0.7], [0.5, -0.35]]) {
      ctx.beginPath();
      ctx.arc(sx * s, sy * s, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'egg') {
    ctx.fillStyle = '#f9e79f';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.62, s * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7dc6f';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.1, s * 0.45, s * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'herb') {
    ctx.strokeStyle = '#58d68d';
    ctx.lineWidth = s * 0.16;
    ctx.lineCap = 'round';
    for (const ang of [-0.6, 0, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(0, s * 0.7);
      ctx.quadraticCurveTo(Math.sin(ang) * s * 0.5, -s * 0.1, Math.sin(ang) * s * 0.8, -s * 0.75);
      ctx.stroke();
    }
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(0, -s * 0.75, s * 0.16, 0, Math.PI * 2);
    ctx.arc(-s * 0.5, -s * 0.6, s * 0.14, 0, Math.PI * 2);
    ctx.arc(s * 0.5, -s * 0.6, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawChopMarks(ctx, s) {
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = s * 0.09;
  ctx.beginPath();
  ctx.moveTo(-s * 0.4, -s * 0.4);
  ctx.lineTo(s * 0.4, s * 0.4);
  ctx.moveTo(s * 0.4, -s * 0.4);
  ctx.lineTo(-s * 0.4, s * 0.4);
  ctx.stroke();
}

// ---------------------------------------------------------------- kitchen
function drawWindow(ctx, now) {
  const { window: w } = LAYOUT;
  // frame
  ctx.fillStyle = '#3a2417';
  roundRect(ctx, w.x - 8, w.y - 8, w.w + 16, w.h + 16, 10);
  ctx.fill();
  // night sky
  const sky = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
  sky.addColorStop(0, '#0b1026');
  sky.addColorStop(0.55, '#14264d');
  sky.addColorStop(1, '#1d3a5f');
  ctx.fillStyle = sky;
  ctx.fillRect(w.x, w.y, w.w, w.h);
  // stars
  ctx.fillStyle = '#ffffff';
  const stars = [[40, 30], [120, 55], [210, 22], [300, 48], [380, 28], [470, 60], [520, 30], [80, 80], [250, 75], [430, 85]];
  for (const [sx, sy] of stars) {
    ctx.globalAlpha = 0.5 + 0.4 * Math.sin(now / 700 + sx);
    ctx.beginPath();
    ctx.arc(w.x + sx, w.y + sy, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // aurora ribbons
  ctx.save();
  ctx.beginPath();
  ctx.rect(w.x, w.y, w.w, w.h);
  ctx.clip();
  for (const [hue, amp, base, alpha] of [[150, 26, 60, 0.35], [190, 20, 95, 0.25], [120, 30, 30, 0.2]]) {
    ctx.beginPath();
    ctx.moveTo(w.x, w.y + base);
    for (let x = 0; x <= w.w; x += 20) {
      const y = w.y + base + Math.sin(x / 90 + now / 1400 + hue) * amp;
      ctx.lineTo(w.x + x, y);
    }
    ctx.lineTo(w.x + w.w, w.y + base + 46);
    ctx.lineTo(w.x, w.y + base + 46);
    ctx.closePath();
    ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
    ctx.fill();
  }
  // sea
  ctx.fillStyle = '#0e2a3f';
  ctx.fillRect(w.x, w.y + 150, w.w, w.h - 150);
  ctx.strokeStyle = 'rgba(127,179,213,0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const wy = w.y + 165 + i * 12;
    ctx.beginPath();
    for (let x = 0; x <= w.w; x += 24) {
      const y = wy + Math.sin(x / 40 + now / 900 + i * 2) * 3;
      if (x === 0) ctx.moveTo(w.x + x, y);
      else ctx.lineTo(w.x + x, y);
    }
    ctx.stroke();
  }
  // lighthouse on the rocks, with a rotating beam
  const lx = w.x + 430;
  const ly = w.y + 150;
  ctx.fillStyle = '#1c2733';
  ctx.beginPath();
  ctx.moveTo(lx - 70, ly + 70);
  ctx.lineTo(lx - 30, ly + 18);
  ctx.lineTo(lx + 40, ly + 18);
  ctx.lineTo(lx + 75, ly + 70);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f5f0e6';
  ctx.beginPath();
  ctx.moveTo(lx - 14, ly + 18);
  ctx.lineTo(lx - 9, ly - 62);
  ctx.lineTo(lx + 9, ly - 62);
  ctx.lineTo(lx + 14, ly + 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(lx - 12, ly - 34, 24, 12);
  ctx.fillRect(lx - 10, ly - 58, 20, 8);
  // lamp + beam
  const beamAngle = (now / 2400) % (Math.PI * 2);
  const bx = lx + Math.cos(beamAngle) * 190;
  const by = ly - 66 + Math.sin(beamAngle) * 55;
  const grad = ctx.createLinearGradient(lx, ly - 66, bx, by);
  grad.addColorStop(0, 'rgba(255, 214, 90, 0.55)');
  grad.addColorStop(1, 'rgba(255, 214, 90, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(lx, ly - 66);
  ctx.lineTo(bx + 26, by + 14);
  ctx.lineTo(bx - 26, by - 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd65a';
  ctx.beginPath();
  ctx.arc(lx, ly - 66, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // mullions
  ctx.strokeStyle = '#3a2417';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(w.x + w.w / 2, w.y);
  ctx.lineTo(w.x + w.w / 2, w.y + w.h);
  ctx.moveTo(w.x, w.y + w.h / 2);
  ctx.lineTo(w.x + w.w, w.y + w.h / 2);
  ctx.stroke();
  // sign under the window
  text(ctx, 'THE LIGHTHOUSE KITCHEN', w.x + w.w / 2, w.y + w.h + 22, 15, '#d9c9a3', 'bold');
}

function drawTopBar(ctx, state, now) {
  const { topBar } = LAYOUT;
  ctx.fillStyle = '#241a12';
  ctx.fillRect(topBar.x, topBar.y, topBar.w, topBar.h);
  ctx.fillStyle = '#3a2c1e';
  ctx.fillRect(topBar.x, topBar.y + topBar.h - 4, topBar.w, 4);
  text(ctx, 'BEACON & BROTH', 150, 32, 24, '#ffd94d', 'bold', 'left');
  text(ctx, 'lighthouse keeper’s kitchen', 150, 52, 11, '#c9b896', 'normal', 'left');

  // shift timer: dial + bar
  const { timerDial } = LAYOUT;
  const frac = state.timeLeft / 150;
  ctx.fillStyle = '#1a120b';
  ctx.beginPath();
  ctx.arc(timerDial.x, timerDial.y, timerDial.r + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = state.timeLeft <= 30 ? '#e74c3c' : '#ffd94d';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(timerDial.x, timerDial.y, timerDial.r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.stroke();
  const mm = Math.floor(state.timeLeft / 60);
  const ss = Math.floor(state.timeLeft % 60);
  text(ctx, `${mm}:${String(ss).padStart(2, '0')}`, timerDial.x, timerDial.y, 12, '#f5efe0', 'bold');
  text(ctx, 'SHIFT', timerDial.x - 40, timerDial.y, 11, '#c9b896', 'bold', 'right');

  // score + target
  text(ctx, `SCORE ${state.score}`, 1010, 26, 20, '#f5efe0', 'bold', 'right');
  text(ctx, `target ${TARGET_SCORE}   •   combo x${state.combo}`, 1010, 48, 12, state.combo > 1 ? '#ffd94d' : '#c9b896', 'bold', 'right');
  // mute + pause hints
  text(ctx, isMuted() ? 'M: sound OFF' : 'M: sound on   P: pause', 1260, 52, 11, '#8a7d68', 'normal', 'right');
}

// ---------------------------------------------------------------- board
function drawOrderBoard(ctx, state, now) {
  const { board } = LAYOUT;
  woodFill(ctx, board.x, board.y, board.w, board.h, '#6b4a2f', '#4a3220');
  ctx.strokeStyle = '#3a2417';
  ctx.lineWidth = 3;
  roundRect(ctx, board.x, board.y, board.w, board.h, 12);
  ctx.stroke();
  text(ctx, 'ORDER BOARD', board.x + board.w / 2, board.y + 18, 16, '#ffd94d', 'bold');
  if (state.orders.length === 0) {
    text(ctx, 'No orders yet —', board.x + board.w / 2, board.y + 130, 14, '#e8dcc0', 'normal');
    text(ctx, 'the sailors are coming!', board.x + board.w / 2, board.y + 152, 14, '#e8dcc0', 'normal');
  }
  state.orders.forEach((order, i) => {
    const r = ticketRect(i);
    const frac = Math.max(0, order.patience / order.patienceMax);
    const urgent = frac < 0.35;
    // paper ticket
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.rotate(urgent ? Math.sin(now / 120) * 0.01 : (i % 2 === 0 ? -0.008 : 0.008));
    ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    ctx.fillStyle = '#fdf6e3';
    roundRect(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fill();
    ctx.strokeStyle = urgent ? '#c0392b' : '#b89b6a';
    ctx.lineWidth = urgent ? 3 : 2;
    roundRect(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.stroke();
    // pin
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(r.x + r.w / 2, r.y + 6, 5, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, order.recipe.name, r.x + r.w / 2, r.y + 22, 15, '#2c1e12', 'bold');
    // ingredient icons
    order.recipe.needs.forEach((id, j) => {
      const ix = r.x + 52 + j * 56;
      drawIngredientIcon(ctx, id, ix, r.y + 52, 34);
    });
    // patience bar
    ctx.fillStyle = '#e5d9bd';
    roundRect(ctx, r.x + 14, r.y + r.h - 14, r.w - 28, 8, 4);
    ctx.fill();
    ctx.fillStyle = urgent ? '#e74c3c' : frac < 0.6 ? '#f39c12' : '#58a05c';
    roundRect(ctx, r.x + 14, r.y + r.h - 14, (r.w - 28) * frac, 8, 4);
    ctx.fill();
    ctx.restore();
  });
}

// ---------------------------------------------------------------- counter
function drawCounter(ctx, state, hover) {
  const { counter } = LAYOUT;
  woodFill(ctx, counter.x, counter.y, counter.w, counter.h, '#7a5233', '#5d3d24');
  ctx.fillStyle = '#5d3d24';
  ctx.fillRect(counter.x, counter.y, counter.w, 10);
  text(ctx, 'THE COUNTER — click an ingredient, or press its key', 640, counter.y + 12, 14, '#f0e2c0', 'bold');
  const target = hoverTarget(hover);
  INGREDIENTS.forEach((ing, i) => {
    const r = binRect(i);
    const isHover = target === `bin:${ing.id}`;
    const isChoppable = ing.needsChop;
    ctx.fillStyle = isHover ? '#8a5f3a' : '#5d3d24';
    roundRect(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 10);
    ctx.fill();
    ctx.fillStyle = '#e8dcc0';
    roundRect(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#b89b6a';
    ctx.lineWidth = 2;
    roundRect(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.stroke();
    drawIngredientIcon(ctx, ing.id, r.x + r.w / 2, r.y + 46, 52);
    text(ctx, ing.name, r.x + r.w / 2, r.y + 92, 14, '#2c1e12', 'bold');
    text(ctx, `[${ing.key}]`, r.x + r.w / 2, r.y + 110, 11, '#7a6a55', 'normal');
    if (isChoppable) {
      ctx.fillStyle = '#c0392b';
      roundRect(ctx, r.x + r.w - 34, r.y + 6, 28, 16, 8);
      ctx.fill();
      text(ctx, 'CHOP', r.x + r.w - 20, r.y + 14, 9, '#ffffff', 'bold');
    }
  });
}

// ---------------------------------------------------------------- assembly
function drawAssembly(ctx, state, hover, now) {
  const { chopBoard, plate, bell } = LAYOUT;
  const target = hoverTarget(hover);

  // chopping board
  ctx.fillStyle = target === 'board' ? '#a97c50' : '#8a5f3a';
  roundRect(ctx, chopBoard.x, chopBoard.y, chopBoard.w, chopBoard.h, 12);
  ctx.fill();
  ctx.strokeStyle = '#5d3d24';
  ctx.lineWidth = 3;
  roundRect(ctx, chopBoard.x, chopBoard.y, chopBoard.w, chopBoard.h, 12);
  ctx.stroke();
  text(ctx, 'CHOPPING BOARD', chopBoard.x + chopBoard.w / 2, chopBoard.y + 16, 12, '#f0e2c0', 'bold');
  if (state.boardItem) {
    const pulse = 1 + 0.08 * Math.sin(now / 130);
    drawIngredientIcon(ctx, state.boardItem, chopBoard.x + chopBoard.w / 2, chopBoard.y + 66, 62 * pulse, true);
    text(ctx, 'CLICK TO CHOP  [C]', chopBoard.x + chopBoard.w / 2, chopBoard.y + 112, 12, '#ffd94d', 'bold');
  } else {
    // little knife, waiting
    ctx.strokeStyle = '#d5d8dc';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(chopBoard.x + 60, chopBoard.y + 78);
    ctx.lineTo(chopBoard.x + 130, chopBoard.y + 52);
    ctx.stroke();
    ctx.strokeStyle = '#3a2417';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(chopBoard.x + 52, chopBoard.y + 82);
    ctx.lineTo(chopBoard.x + 62, chopBoard.y + 76);
    ctx.stroke();
    text(ctx, 'fish & potato come here first', chopBoard.x + chopBoard.w / 2, chopBoard.y + 112, 11, '#e8dcc0', 'normal');
  }

  // the plate
  ctx.fillStyle = '#1c2733';
  ctx.beginPath();
  ctx.ellipse(plate.x, plate.y + 10, plate.rx + 14, plate.ry + 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5f0e6';
  ctx.beginPath();
  ctx.ellipse(plate.x, plate.y, plate.rx, plate.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9a86a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(plate.x, plate.y, plate.rx - 16, plate.ry - 12, 0, 0, Math.PI * 2);
  ctx.stroke();
  const items = plateItemRects(state);
  if (items.length === 0) {
    text(ctx, 'your plate — pick ingredients', plate.x, plate.y - 2, 14, '#9a8a70', 'normal');
  } else {
    items.forEach((item) => {
      drawIngredientIcon(ctx, item.id, item.x + 30, item.y + 30, 52, INGREDIENT_BY_ID[item.id].needsChop);
    });
    text(ctx, 'click an item to take it off', plate.x, plate.y + plate.ry + 18, 11, '#8a7d68', 'normal');
  }

  // serve bell
  const ready = plateIsReady(state);
  const glow = ready ? 0.5 + 0.4 * Math.sin(now / 180) : 0;
  if (ready) {
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(bell.x, bell.y, bell.r + 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = target === 'bell' ? '#e8b93b' : '#d4a017';
  ctx.beginPath();
  ctx.arc(bell.x, bell.y, bell.r, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a6d1f';
  ctx.fillRect(bell.x - bell.r, bell.y - 4, bell.r * 2, 8);
  ctx.fillStyle = '#f4d03f';
  ctx.beginPath();
  ctx.arc(bell.x, bell.y - bell.r - 8, 7, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'SERVE', bell.x, bell.y - 8, 15, '#2c1e12', 'bold');
  text(ctx, ready ? 'dish matches an order!' : 'match a ticket to serve', bell.x, bell.y + bell.r + 16, 11, ready ? '#ffd94d' : '#c9b896', 'bold');
}

// ---------------------------------------------------------------- feedback
function drawFeedback(ctx, state) {
  if (state.message && state.elapsed - state.messageAt < 2.6) {
    const age = state.elapsed - state.messageAt;
    ctx.save();
    ctx.globalAlpha = age > 2 ? 1 - (age - 2) / 0.6 : 1;
    const color = state.messageKind === 'good' ? '#ffd94d' : '#ff8a7a';
    text(ctx, state.message, 640, 340, 22, color, 'bold');
    ctx.restore();
  }
  for (const f of state.flashes) {
    const age = state.elapsed - f.born;
    ctx.save();
    ctx.globalAlpha = 1 - age / 1.2;
    text(ctx, f.text, f.x, f.y - age * 40, 26, f.color, 'bold');
    ctx.restore();
  }
}

function drawHintBar(ctx, state) {
  const hints = '1–0 pick ingredient   •   C chop   •   SPACE serve   •   BACKSPACE clear plate   •   R restart';
  text(ctx, hints, 640, 588, 12, '#8a7d68', 'normal');
}

// ---------------------------------------------------------------- screens
function drawMenu(ctx, state, now) {
  ctx.fillStyle = 'rgba(11, 16, 38, 0.86)';
  ctx.fillRect(0, 64, CANVAS_W, CANVAS_H - 64);
  text(ctx, 'BEACON & BROTH', 640, 170, 54, '#ffd94d', 'bold');
  text(ctx, 'The lighthouse keeper’s kitchen — cook for the sailors before the light turns', 640, 214, 18, '#f5efe0', 'normal');
  const lines = [
    'Orders pin to the board. Pick ingredients from the counter,',
    'chop fish & potato on the board, build the dish on the plate,',
    'then ring the bell to serve. Fast serves earn bigger tips.',
    '',
    `One shift lasts 150 seconds. Reach ${TARGET_SCORE} points to win the shift.`,
  ];
  lines.forEach((line, i) => text(ctx, line, 640, 268 + i * 26, 16, '#e8dcc0', 'normal'));
  const pulse = 0.7 + 0.3 * Math.sin(now / 300);
  ctx.save();
  ctx.globalAlpha = pulse;
  text(ctx, 'CLICK OR PRESS ENTER TO START THE SHIFT', 640, 430, 20, '#ffd94d', 'bold');
  ctx.restore();
  text(ctx, 'Mouse + keyboard:  1–0 pick   •   C chop   •   SPACE serve   •   R restart', 640, 470, 13, '#c9b896', 'normal');
}

function drawEnd(ctx, state, now) {
  ctx.fillStyle = 'rgba(11, 16, 38, 0.93)';
  ctx.fillRect(0, 64, CANVAS_W, CANVAS_H - 64);
  const title = state.won ? 'THE LIGHT STAYS LIT!' : 'THE LIGHT WENT DARK…';
  const color = state.won ? '#ffd94d' : '#ff8a7a';
  text(ctx, title, 640, 170, 44, color, 'bold');
  const sub = state.won
    ? `Every sailor fed — ${state.score} points, target ${TARGET_SCORE} beaten.`
    : `Only ${state.score} of ${TARGET_SCORE} points. The sailors went hungry.`;
  text(ctx, sub, 640, 214, 18, '#f5efe0', 'normal');
  const stats = `Dishes served: ${state.served}    •    Orders lost: ${state.lost}    •    Wrong serves: ${state.wrongServes}    •    Best combo: x${state.combo}`;
  text(ctx, stats, 640, 268, 15, '#e8dcc0', 'normal');
  const pulse = 0.7 + 0.3 * Math.sin(now / 300);
  ctx.save();
  ctx.globalAlpha = pulse;
  text(ctx, 'CLICK OR PRESS ENTER TO COOK AGAIN', 640, 330, 20, '#ffd94d', 'bold');
  ctx.restore();
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(11, 16, 38, 0.6)';
  ctx.fillRect(0, 64, CANVAS_W, CANVAS_H - 64);
  text(ctx, 'PAUSED — press P to keep cooking', 640, 400, 26, '#f5efe0', 'bold');
}

// ---------------------------------------------------------------- main draw
export function drawGame(ctx, state, hover, now) {
  ctx.save();
  if (state.shake > 0.5) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  // wall
  const wall = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  wall.addColorStop(0, '#2c2118');
  wall.addColorStop(0.5, '#3a2c1e');
  wall.addColorStop(1, '#241a12');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  drawWindow(ctx, now);
  drawTopBar(ctx, state, now);
  drawOrderBoard(ctx, state, now);
  drawAssembly(ctx, state, hover, now);
  drawCounter(ctx, state, hover);
  drawHintBar(ctx, state);
  drawFeedback(ctx, state);

  if (state.phase === PHASE.MENU) drawMenu(ctx, state, now);
  else if (state.phase === PHASE.END) drawEnd(ctx, state, now);
  else if (state.phase === PHASE.PAUSED) drawPaused(ctx);
  ctx.restore();
}
