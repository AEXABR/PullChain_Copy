// 提取自 js/renderer.js

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

function render() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = grid[r][c];
      if (tile.base !== T_WALL) {
        drawEmptyTile(r, c);
        if (tile.hasWater) {
          drawWaterTile(r, c);
        } else if (tile.hasHighland) {
          drawHighlandTile(r, c);
        }
        if (tile.isPlate) drawPlateTile(r, c);
        if (tile.liftWall !== null) {
          drawLiftWallTile(r, c, false);
        } else if (tile.hasWeb) {
          drawWebTile(r, c);
        }
      } else {
        if (tile.diagCorner && tile.diagCorner.length > 0) {
          drawDiagWallTile(r, c, tile.diagCorner);
        } else if (tile.liftWall !== null) {
          drawLiftWallTile(r, c, true);
        } else {
          drawWallTile(r, c);
        }
      }
    }
  }

  const allEntities = [];
  for (const crate of crates.values()) allEntities.push(crate);
  if (ball) allEntities.push(ball);
  if (hero) allEntities.push(hero);
  allEntities.sort((a, b) => a.height - b.height);
  for (const ent of allEntities) {
    if (ent.kind === 'hero')       drawHero(ent);
    else if (ent.kind === 'ball')  drawBall(ent);
    else if (ent.kind === 'crate') drawCrateTile(ent);
  }
  // 天窗渲染在实体之上，避免被遮住
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c].hasSkylight) drawSkylightTile(r, c);
    }
  }

  drawGridLines();

  if (HIGHLIGHT_MODES.has(editor.mode) && editor.hoverCell) {
    const { row, col } = editor.hoverCell;
    const x = col * TILE_SIZE;
    const y = row * TILE_SIZE;
    const tile = grid[row][col];
    const blocked = BLOCKED_AS_WALL_MODES.has(editor.mode)
      ? tile.base === T_WALL
      : tile.base === T_WALL && tile.liftWall === null;
    if (blocked) {
      ctx.fillStyle = 'rgba(255, 60, 60, 0.4)';
    } else {
      ctx.fillStyle = 'rgba(60, 255, 60, 0.3)';
    }
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  }

  drawRope();
  drawWires();
}

render();
