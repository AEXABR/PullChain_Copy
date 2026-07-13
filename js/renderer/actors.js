// 提取自 js/renderer.js

function drawHero(ent) {
  const x = ent.col * TILE_SIZE;
  const y = ent.row * TILE_SIZE;
  const s = TILE_SIZE / 8;

  ctx.fillStyle = '#4a3728';
  ctx.fillRect(x + s * 3, y + s * 0, s * 2, s * 2);
  ctx.fillStyle = '#f4c89a';
  ctx.fillRect(x + s * 3, y + s * 2, s * 2, s * 2);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x + s * 3, y + s * 2, s, s);
  ctx.fillRect(x + s * 5, y + s * 2, s, s);
  ctx.fillStyle = '#4488cc';
  ctx.fillRect(x + s * 2, y + s * 4, s * 4, s * 2);
  ctx.fillStyle = '#f4c89a';
  ctx.fillRect(x + s * 1, y + s * 4, s, s * 2);
  ctx.fillRect(x + s * 6, y + s * 4, s, s * 2);
  ctx.fillStyle = '#335577';
  ctx.fillRect(x + s * 2, y + s * 6, s * 2, s * 2);
  ctx.fillRect(x + s * 4, y + s * 6, s * 2, s * 2);
}

function drawBall(ball) {
  const x = ball.col * TILE_SIZE;
  const y = ball.row * TILE_SIZE;
  const s = TILE_SIZE / 8;
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;
  const r = s * 3;

  if (ball.lightOn) {
    const grad = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 1.3);
    grad.addColorStop(0, 'rgba(255, 255, 100, 0.9)');
    grad.addColorStop(0.5, 'rgba(255, 200, 30, 0.5)');
    grad.addColorStop(1, 'rgba(255, 150, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2);
    ctx.fill();

    const bodyGrad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r);
    bodyGrad.addColorStop(0, '#ffffaa');
    bodyGrad.addColorStop(0.4, '#ffee44');
    bodyGrad.addColorStop(1, '#ddaa00');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.3, cy - r * 0.35, r * 0.35, r * 0.22, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ccaa00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    const grad = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 1.3);
    grad.addColorStop(0, 'rgba(100, 100, 100, 0.4)');
    grad.addColorStop(0.5, 'rgba(80, 80, 80, 0.2)');
    grad.addColorStop(1, 'rgba(60, 60, 60, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2);
    ctx.fill();

    const bodyGrad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r);
    bodyGrad.addColorStop(0, '#aaaaaa');
    bodyGrad.addColorStop(0.4, '#888888');
    bodyGrad.addColorStop(1, '#555555');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.3, cy - r * 0.35, r * 0.35, r * 0.22, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawCrateTile(crate) {
  const row = crate.row, col = crate.col;
  const stacked = entityUnder(row, col, crate) !== null;
  const inset = stacked ? 2 : 1;
  if (crate.has(TRAITS.MELTS_IN_LIGHT)) {
    drawSnowTile(row, col, inset);
    return;
  }
  if (crate.has(TRAITS.FLYING)) {
    const foot = tileFootLevel(row, col);
    const under = entityUnder(row, col, crate);
    const groundH = under ? under.height + under.selfHeight : foot;
    const hover = Math.max(0, crate.height - groundH);
    drawMothTile(row, col, inset, hover);
    return;
  }
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const s = TILE_SIZE / 8;
  const x0 = x + s * inset, y0 = y + s * inset, w = s * (8 - inset * 2);

  ctx.fillStyle = '#8B6914';
  ctx.fillRect(x0, y0, w, w);
  const rows = Math.max(2, Math.floor(w / s));
  for (let i = 0; i < rows - 1; i++) {
    ctx.fillStyle = '#7A5C10';
    ctx.fillRect(x0 + 2, y0 + s * i + s / 2, w - 4, Math.max(1, s / 4));
  }
  ctx.strokeStyle = '#A0792B';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0 + 2, y0 + w / 2);
  ctx.lineTo(x0 + w - 2, y0 + w / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x0 + w / 2, y0 + 2);
  ctx.lineTo(x0 + w / 2, y0 + w - 2);
  ctx.stroke();
  const nail = Math.max(1, Math.floor(w / 8));
  ctx.fillStyle = '#555555';
  ctx.fillRect(x0 + 2, y0 + 2, nail, nail);
  ctx.fillRect(x0 + w - 2 - nail, y0 + 2, nail, nail);
  ctx.fillRect(x0 + 2, y0 + w - 2 - nail, nail, nail);
  ctx.fillRect(x0 + w - 2 - nail, y0 + w - 2 - nail, nail, nail);
  ctx.strokeStyle = '#6B4F12';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, w - 1);
}

function drawSnowTile(row, col, inset = 1) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const s = TILE_SIZE / 8;
  const x0 = x + s * inset, y0 = y + s * inset, w = s * (8 - inset * 2);
  const cx = x0 + w / 2, cy = y0 + w / 2;
  const rx = w / 2 - 1;
  const ry = rx * 0.78;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + ry * 0.35, rx, ry * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  const sideGrad = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
  sideGrad.addColorStop(0, '#c8dce8');
  sideGrad.addColorStop(0.3, '#d8e8f0');
  sideGrad.addColorStop(0.7, '#b0c8d8');
  sideGrad.addColorStop(1, '#90b0c0');
  ctx.fillStyle = sideGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  const topRy = ry * 0.55;
  const topGrad = ctx.createLinearGradient(cx, cy - topRy, cx, cy + topRy);
  topGrad.addColorStop(0, '#ffffff');
  topGrad.addColorStop(0.5, '#e8f4fa');
  topGrad.addColorStop(1, '#c8dce8');
  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy - ry * 0.2, rx * 0.85, topRy, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#8ab8d0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawMothTile(row, col, inset = 1, hover = 0) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const s = TILE_SIZE / 8;
  const hoverPx = Math.min(hover * s * 2, s * 4);
  const x0 = x + s * inset, y_base = y + s * inset;
  const y0 = y_base - hoverPx;
  const w = s * (8 - inset * 2);
  const cx = x0 + w / 2, cy = y0 + w / 2;

  if (hover > 0) {
    const shadowY = y_base + w / 2;
    const shadowAlpha = Math.max(0.08, 0.25 - hover * 0.06);
    const shadowScale = 1 - hover * 0.1;
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(cx, shadowY, w * 0.3 * shadowScale, w * 0.1 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#d4c8a0';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.3, cy - w * 0.1, w * 0.35, w * 0.22, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.3, cy - w * 0.1, w * 0.35, w * 0.22, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#c8b890';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.22, cy + w * 0.12, w * 0.28, w * 0.18, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.22, cy + w * 0.12, w * 0.28, w * 0.18, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#8B7355';
  ctx.fillRect(cx - w * 0.06, cy - w * 0.3, w * 0.12, w * 0.6);

  ctx.strokeStyle = '#6B5B3A';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.04, cy - w * 0.28);
  ctx.quadraticCurveTo(cx - w * 0.15, cy - w * 0.45, cx - w * 0.2, cy - w * 0.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.04, cy - w * 0.28);
  ctx.quadraticCurveTo(cx + w * 0.15, cy - w * 0.45, cx + w * 0.2, cy - w * 0.35);
  ctx.stroke();

  ctx.fillStyle = 'rgba(139, 115, 85, 0.3)';
  ctx.beginPath();
  ctx.arc(cx - w * 0.32, cy - w * 0.12, w * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + w * 0.32, cy - w * 0.12, w * 0.1, 0, Math.PI * 2);
  ctx.fill();
}
