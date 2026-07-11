// === 渲染：基础地块 ===
function drawEmptyTile(row, col) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  ctx.fillStyle = '#3a3a4e';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
}

function drawWallTile(row, col) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  ctx.fillStyle = '#555566';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = '#777788';
  ctx.lineWidth = 1;
  const third = TILE_SIZE / 3;
  ctx.beginPath();
  ctx.moveTo(x, y + third);
  ctx.lineTo(x + TILE_SIZE, y + third);
  ctx.moveTo(x, y + third * 2);
  ctx.lineTo(x + TILE_SIZE, y + third * 2);
  ctx.moveTo(x + TILE_SIZE / 2, y);
  ctx.lineTo(x + TILE_SIZE / 2, y + third);
  ctx.moveTo(x, y + third);
  ctx.lineTo(x, y + third * 2);
  ctx.moveTo(x + TILE_SIZE / 2, y + third * 2);
  ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE);
  ctx.stroke();
  ctx.strokeStyle = '#444455';
  ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(x, y + TILE_SIZE);
  ctx.lineTo(x, y);
  ctx.lineTo(x + TILE_SIZE, y);
  ctx.stroke();
}

function drawDiagWallTile(row, col, corner) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  ctx.fillStyle = '#555566';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = '#777788';
  ctx.lineWidth = 1;
  const third = TILE_SIZE / 3;
  ctx.beginPath();
  ctx.moveTo(x, y + third);
  ctx.lineTo(x + TILE_SIZE, y + third);
  ctx.moveTo(x, y + third * 2);
  ctx.lineTo(x + TILE_SIZE, y + third * 2);
  ctx.moveTo(x + TILE_SIZE / 2, y);
  ctx.lineTo(x + TILE_SIZE / 2, y + third);
  ctx.moveTo(x, y + third);
  ctx.lineTo(x, y + third * 2);
  ctx.moveTo(x + TILE_SIZE / 2, y + third * 2);
  ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE);
  ctx.stroke();
  ctx.strokeStyle = '#444455';
  ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

  // 缺口指示三角
  ctx.fillStyle = '#3a3a4e';
  const gap = TILE_SIZE / 4;
  const corners = {
    TL: [[x, y], [x + gap, y], [x, y + gap]],
    TR: [[x + TILE_SIZE, y], [x + TILE_SIZE - gap, y], [x + TILE_SIZE, y + gap]],
    BL: [[x, y + TILE_SIZE], [x + gap, y + TILE_SIZE], [x, y + TILE_SIZE - gap]],
    BR: [[x + TILE_SIZE, y + TILE_SIZE], [x + TILE_SIZE - gap, y + TILE_SIZE], [x + TILE_SIZE, y + TILE_SIZE - gap]],
  };
  const pts = corners[corner];
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  ctx.lineTo(pts[1][0], pts[1][1]);
  ctx.lineTo(pts[2][0], pts[2][1]);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(x, y + TILE_SIZE);
  ctx.lineTo(x, y);
  ctx.lineTo(x + TILE_SIZE, y);
  ctx.stroke();
}

function drawGridLines() {
  ctx.strokeStyle = '#4a4a5e';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= GRID_SIZE; i++) {
    const pos = i * TILE_SIZE;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, CANVAS_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(CANVAS_SIZE, pos);
    ctx.stroke();
  }
}

// === 渲染：角色 ===
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

// === 渲染：球 ===
function drawBall(ball) {
  const x = ball.col * TILE_SIZE;
  const y = ball.row * TILE_SIZE;
  const s = TILE_SIZE / 8;

  if (ball.lightOn) {
    const cx = x + TILE_SIZE / 2;
    const cy = y + TILE_SIZE / 2;
    const grad = ctx.createRadialGradient(cx, cy, s * 1, cx, cy, s * 3.5);
    grad.addColorStop(0, 'rgba(255, 255, 100, 0.9)');
    grad.addColorStop(0.5, 'rgba(255, 200, 30, 0.5)');
    grad.addColorStop(1, 'rgba(255, 150, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    ctx.fillStyle = '#ffee44';
    ctx.fillRect(x + s * 1, y + s * 1, s * 6, s * 6);
    ctx.fillStyle = '#ffffaa';
    ctx.fillRect(x + s * 2, y + s * 2, s * 3, s * 2);
    ctx.strokeStyle = '#ccaa00';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + s * 1 + 0.5, y + s * 1 + 0.5, s * 6 - 1, s * 6 - 1);
  } else {
    const cx = x + TILE_SIZE / 2;
    const cy = y + TILE_SIZE / 2;
    const grad = ctx.createRadialGradient(cx, cy, s * 1, cx, cy, s * 3.5);
    grad.addColorStop(0, 'rgba(100, 100, 100, 0.4)');
    grad.addColorStop(0.5, 'rgba(80, 80, 80, 0.2)');
    grad.addColorStop(1, 'rgba(60, 60, 60, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    ctx.fillStyle = '#888888';
    ctx.fillRect(x + s * 1, y + s * 1, s * 6, s * 6);
    ctx.fillStyle = '#aaaaaa';
    ctx.fillRect(x + s * 2, y + s * 2, s * 3, s * 2);
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + s * 1 + 0.5, y + s * 1 + 0.5, s * 6 - 1, s * 6 - 1);
  }
}

// === 渲染：箱子 ===
function drawCrateTile(crate) {
  const row = crate.row, col = crate.col;
  const stacked = entityUnder(row, col, crate) !== null;
  const inset = stacked ? 2 : 1;
  if (crate.crateKey === 'snow') {
    drawSnowTile(row, col, inset);
    return;
  }
  if (crate.crateKey === 'moth') {
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

  ctx.fillStyle = '#d8e8f0';
  ctx.fillRect(x0, y0, w, w);
  ctx.fillStyle = '#b8d4e8';
  ctx.fillRect(x0 + 2, y0 + 2, w - 4, w - 4);
  ctx.fillStyle = '#ffffff';
  const cx = x0 + w / 2, cy = y0 + w / 2, r = w / 4;
  ctx.fillRect(cx - r / 2, cy - r / 2, r, r);
  ctx.strokeStyle = '#8ab8d0';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, w - 1);
}

function drawMothTile(row, col, inset = 1, hover = 0) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const s = TILE_SIZE / 8;
  // 悬空：每高度单位偏移 s*2 像素，最多 s*4
  const hoverPx = Math.min(hover * s * 2, s * 4);
  const x0 = x + s * inset, y_base = y + s * inset;
  const y0 = y_base - hoverPx;
  const w = s * (8 - inset * 2);
  const cx = x0 + w / 2, cy = y0 + w / 2;

  // 悬空时画地面阴影
  if (hover > 0) {
    const shadowY = y_base + w / 2;
    const shadowAlpha = Math.max(0.08, 0.25 - hover * 0.06);
    const shadowScale = 1 - hover * 0.1;
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(cx, shadowY, w * 0.3 * shadowScale, w * 0.1 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 翅膀（左右展开）
  ctx.fillStyle = '#d4c8a0';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.3, cy - w * 0.1, w * 0.35, w * 0.22, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.3, cy - w * 0.1, w * 0.35, w * 0.22, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // 下翅（稍小）
  ctx.fillStyle = '#c8b890';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.22, cy + w * 0.12, w * 0.28, w * 0.18, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.22, cy + w * 0.12, w * 0.28, w * 0.18, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // 身体
  ctx.fillStyle = '#8B7355';
  ctx.fillRect(cx - w * 0.06, cy - w * 0.3, w * 0.12, w * 0.6);

  // 触角
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

  // 翅膀花纹
  ctx.fillStyle = 'rgba(139, 115, 85, 0.3)';
  ctx.beginPath();
  ctx.arc(cx - w * 0.32, cy - w * 0.12, w * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + w * 0.32, cy - w * 0.12, w * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

// === 渲染：踏板 ===
function drawPlateTile(row, col) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const s = TILE_SIZE / 8;
  const x0 = x + s * 2, y0 = y + s * 2, w = s * 4;

  ctx.fillStyle = '#887744';
  ctx.fillRect(x0, y0, w, w);
  ctx.fillStyle = '#aa9955';
  ctx.fillRect(x0 + 2, y0 + 2, w - 4, w - 4);
  ctx.fillStyle = '#ccbb66';
  ctx.fillRect(x0 + s, y0 + s, s * 2, s * 2);
  ctx.strokeStyle = '#665533';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, w - 1);
}

// === 渲染：升降墙 ===
function drawLiftWallTile(row, col, raised) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const s = TILE_SIZE / 8;
  const type = grid[row][col].liftWall || 'up';

  if (raised) {
    if (type === 'up') {
      ctx.fillStyle = '#5566AA';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#7788BB';
      ctx.lineWidth = 1;
      const third = TILE_SIZE / 3;
      ctx.beginPath();
      ctx.moveTo(x, y + third);
      ctx.lineTo(x + TILE_SIZE, y + third);
      ctx.moveTo(x, y + third * 2);
      ctx.lineTo(x + TILE_SIZE, y + third * 2);
      ctx.stroke();
      ctx.strokeStyle = '#445577';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    } else {
      ctx.fillStyle = '#665555';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#887777';
      ctx.lineWidth = 1;
      const third = TILE_SIZE / 3;
      ctx.beginPath();
      ctx.moveTo(x, y + third);
      ctx.lineTo(x + TILE_SIZE, y + third);
      ctx.moveTo(x, y + third * 2);
      ctx.lineTo(x + TILE_SIZE, y + third * 2);
      ctx.stroke();
      ctx.strokeStyle = '#554444';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    }
  } else {
    if (type === 'up') {
      ctx.strokeStyle = '#7788BB';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(x + 2, y + TILE_SIZE / 2, TILE_SIZE - 4, TILE_SIZE / 2 - 2);
      ctx.setLineDash([]);
      ctx.fillStyle = '#5566AA';
      ctx.fillRect(x, y + TILE_SIZE - 4, TILE_SIZE, 4);
    } else {
      ctx.strokeStyle = '#887777';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(x + 2, y + TILE_SIZE / 2, TILE_SIZE - 4, TILE_SIZE / 2 - 2);
      ctx.setLineDash([]);
      ctx.fillStyle = '#665555';
      ctx.fillRect(x, y + TILE_SIZE - 4, TILE_SIZE, 4);
    }
  }
}

// === 渲染：引线 ===
function drawWires() {
  ctx.strokeStyle = 'rgba(255, 220, 50, 0.55)';
  ctx.lineWidth = 1.5;
  for (const link of wireLinks) {
    const [pr, pc] = link.plate.split(',').map(Number);
    const [wr, wc] = link.wall.split(',').map(Number);
    const px = pc * TILE_SIZE + TILE_SIZE / 2;
    const py = pr * TILE_SIZE + TILE_SIZE / 2;
    const wx = wc * TILE_SIZE + TILE_SIZE / 2;
    const wy = wr * TILE_SIZE + TILE_SIZE / 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(wx, wy);
    ctx.stroke();
  }
  if (editor.mode === 'wire' && editor.wireStart) {
    const [sr, sc] = editor.wireStart.split(',').map(Number);
    const sx = sc * TILE_SIZE + TILE_SIZE / 2;
    const sy = sr * TILE_SIZE + TILE_SIZE / 2;
    if (editor.hoverCell) {
      const hx = editor.hoverCell.col * TILE_SIZE + TILE_SIZE / 2;
      const hy = editor.hoverCell.row * TILE_SIZE + TILE_SIZE / 2;
      ctx.strokeStyle = 'rgba(255, 220, 50, 0.35)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

// === 渲染：水 ===
function drawWaterTile(row, col) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const s = TILE_SIZE / 8;
  const x0 = x + s, y0 = y + s, w = s * 6;

  ctx.fillStyle = '#3377aa';
  ctx.fillRect(x0, y0, w, w);
  ctx.fillStyle = '#4499cc';
  ctx.fillRect(x0, y0 + s * 0, w, s);
  ctx.fillRect(x0, y0 + s * 2, w, s);
  ctx.fillRect(x0, y0 + s * 4, w, s);
  ctx.fillStyle = '#66bbee';
  ctx.fillRect(x0 + 2, y0 + s * 1, w - 4, s);
  ctx.fillRect(x0 + 2, y0 + s * 3, w - 4, s);
  ctx.fillRect(x0 + 2, y0 + s * 5, w - 4, s);
  ctx.strokeStyle = '#2266aa';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, w - 1);
}

// === 渲染：蜘蛛网 ===
function drawWebTile(row, col) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const s = TILE_SIZE / 8;
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1;
  const dirs = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
  for (const [dr, dc] of dirs) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dc * s * 3.5, cy + dr * s * 3.5);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  for (let i = 1; i <= 3; i++) {
    const r = s * i;
    ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
}

// === 渲染：绳子 ===
function drawRope() {
  if (!hero || !ball) return;

  const hx = hero.col * TILE_SIZE + TILE_SIZE / 2;
  const hy = hero.row * TILE_SIZE + TILE_SIZE / 2;
  const bx = ball.col * TILE_SIZE + TILE_SIZE / 2;
  const by = ball.row * TILE_SIZE + TILE_SIZE / 2;

  ctx.strokeStyle = '#5a4a32';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(bx, by);
  ctx.stroke();

  ctx.strokeStyle = '#c4a44a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(bx, by);
  ctx.stroke();

  const dx = bx - hx;
  const dy = by - hy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.floor(dist / 4);
  if (steps > 0) {
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = hx + dx * t;
      const py = hy + dy * t;
      ctx.fillStyle = (i % 2 === 0) ? '#b8943a' : '#d4b45a';
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }
  }
}

// === 主渲染循环 ===
function render() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 1. 空地底色
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c].base !== T_WALL) {
        drawEmptyTile(r, c);
      }
    }
  }
  // 2. 引线
  drawWires();
  // 3. 水
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = grid[r][c];
      if (tile.base !== T_WALL && tile.hasWater) {
        drawWaterTile(r, c);
      }
    }
  }
  // 4. 踏板
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c].isPlate) {
        drawPlateTile(r, c);
      }
    }
  }
  // 5. 墙、蜘蛛网、升降墙
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = grid[r][c];
      if (tile.base === T_WALL) {
        if (tile.diagCorner) {
          drawDiagWallTile(r, c, tile.diagCorner);
        } else if (tile.liftWall !== null) {
          drawLiftWallTile(r, c, true);
        } else {
          drawWallTile(r, c);
        }
      } else if (tile.liftWall !== null) {
        drawLiftWallTile(r, c, false);
      } else if (tile.hasWeb) {
        drawWebTile(r, c);
      }
    }
  }

  // 6. 箱子
  for (const crate of crates.values()) {
    drawCrateTile(crate);
  }

  // 7. 网格线
  drawGridLines();

  // 8. 悬停高亮
  if ((editor.mode === 'place_hero' || editor.mode === 'place_ball' || editor.mode === 'place_crate' || editor.mode === 'web' || editor.mode === 'plate' || editor.mode === 'liftwall') && editor.hoverCell) {
    const { row, col } = editor.hoverCell;
    const x = col * TILE_SIZE;
    const y = row * TILE_SIZE;
    const tile = grid[row][col];
    const blocked = (editor.mode === 'web' || editor.mode === 'plate' || editor.mode === 'liftwall')
      ? tile.base === T_WALL
      : editor.mode === 'wire'
      ? !editor.wireStart ? !tile.isPlate
        : tile.liftWall === null
      : tile.base === T_WALL && tile.liftWall === null;
    if (blocked) {
      ctx.fillStyle = 'rgba(255, 60, 60, 0.4)';
    } else {
      ctx.fillStyle = 'rgba(60, 255, 60, 0.3)';
    }
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  }

  // 9. 绳子
  drawRope();

  // 10. 球
  if (ball) drawBall(ball);

  // 11. 角色
  if (hero) {
    drawHero(hero);
  }
}
