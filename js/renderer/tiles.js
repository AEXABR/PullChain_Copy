// 提取自 js/renderer.js

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

function drawDiagWallTile(row, col, gaps) {
  drawWallTile(row, col);

  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const gap = TILE_SIZE / 4;
  const cornerPts = {
    TL: [[x, y], [x + gap, y], [x, y + gap]],
    TR: [[x + TILE_SIZE, y], [x + TILE_SIZE - gap, y], [x + TILE_SIZE, y + gap]],
    BL: [[x, y + TILE_SIZE], [x + gap, y + TILE_SIZE], [x, y + TILE_SIZE - gap]],
    BR: [[x + TILE_SIZE, y + TILE_SIZE], [x + TILE_SIZE - gap, y + TILE_SIZE], [x + TILE_SIZE, y + TILE_SIZE - gap]],
  };
  ctx.fillStyle = '#3a3a4e';
  for (const corner of gaps) {
    const pts = cornerPts[corner];
    if (!pts) continue;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.fill();
  }
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

function drawWaterTile(row, col) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const s = TILE_SIZE / 8;
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;
  const r = s * 3.6;

  const baseGrad = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
  baseGrad.addColorStop(0, '#225588');
  baseGrad.addColorStop(0.6, '#3377aa');
  baseGrad.addColorStop(1, '#4499bb');
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(100, 180, 220, 0.35)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * (0.25 + i * 0.2), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(180, 220, 255, 0.3)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(cx - r * 0.1, cy - r * 0.15, r * 0.5, -0.7, 1.2);
  ctx.stroke();

  ctx.strokeStyle = '#2266aa';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

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

function drawHighlandTile(row, col) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const s = TILE_SIZE / 8;

  ctx.fillStyle = '#4a4a3a';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  const grad = ctx.createRadialGradient(x + TILE_SIZE/2, y + TILE_SIZE/2, s*0.5, x + TILE_SIZE/2, y + TILE_SIZE/2, s*3.5);
  grad.addColorStop(0, '#6a6a4e');
  grad.addColorStop(0.6, '#4a4a38');
  grad.addColorStop(1, '#3a3a2e');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = 'rgba(255,255,200,0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + s, y + s, TILE_SIZE - s*2, TILE_SIZE - s*2);
}

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
