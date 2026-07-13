// 提取自 js/engine.js

function topHeightAt(row, col, exclude) {
  let top = tileFootLevel(row, col);
  if (hero && hero !== exclude && hero.row === row && hero.col === col)
    top = Math.max(top, hero.height + hero.selfHeight);
  if (ball && ball !== exclude && ball.row === row && ball.col === col)
    top = Math.max(top, ball.height + ball.selfHeight);
  for (const c of cratesAt(row, col))
    if (c !== exclude) top = Math.max(top, c.height + c.selfHeight);
  return top;
}

function entityUnder(r, c, self) {
  const allCrates = cratesAt(r, c);
  if (allCrates.length === 2 && allCrates[1] === self) return allCrates[0];
  const check = (ent) => {
    if (!ent || ent === self || ent.row !== r || ent.col !== c) return false;
    return ent.height < self.height;
  };
  if (check(ball))   return ball;
  if (check(hero))   return hero;
  const crate = crateAt(r, c);
  if (check(crate))  return crate;
  return null;
}

function tileFootLevel(r, c) {
  let level = 0;
  const tile = grid[r][c];
  if (tile.liftWall !== null && tile.base === T_WALL) level += 1;
  if (tile.hasDepression) level -= 1;
  return level;
}

function updateEntityHeight(ent) {
  if (!ent) return;
  if (ent instanceof Crate && ent.crateKey === 'moth') return; // 飞蛾不随地形落地
  const r = ent.row, c = ent.col;
  const under = entityUnder(r, c, ent);
  if (under) {
    ent.height = under.height + under.selfHeight;
  } else {
    ent.height = tileFootLevel(r, c);
  }
}

// 把单个 crate 在 Map 中的位置从旧坐标更新到新坐标
function moveCrateInMap(crate, newRow, newCol) {
  const oldKey = K(crate.row, crate.col);
  const stackedKey = oldKey + ':1';
  if (crates.get(oldKey) === crate) crates.delete(oldKey);
  else if (crates.get(stackedKey) === crate) crates.delete(stackedKey);
  crate.row = newRow; crate.col = newCol;
  const newKey = K(newRow, newCol);
  const existing = crates.get(newKey);
  if (!existing) {
    crates.set(newKey, crate);
  } else if (crate.height < existing.height) {
    // 新来的更矮 → 放底层，原有顶上
    crates.delete(newKey);
    crates.set(newKey, crate);
    crates.set(newKey + ':1', existing);
  } else {
    // 新来的更高或同高 → 放顶层
    crates.set(newKey + ':1', crate);
  }
}

// 目标格是否已有实体占据骑乘者的高度
function riderBlocked(rider, toRow, toCol) {
  const h = rider.height;
  if (hero && hero !== rider && hero.row === toRow && hero.col === toCol && hero.height === h) return true;
  if (ball && ball !== rider && ball.row === toRow && ball.col === toCol && ball.height === h) return true;
  for (const c of cratesAt(toRow, toCol))
    if (c !== rider && c.height === h) return true;
  return false;
}

// 骑在 mover 上面的实体，跟着一起移动（递归处理多层堆叠）
function moveRiders(fromRow, fromCol, toRow, toCol, mover) {
  const moverTop = mover.height + mover.selfHeight;
  const riders = [];
  if (hero && hero !== mover && hero.row === fromRow && hero.col === fromCol
      && hero.height === moverTop) riders.push(hero);
  if (ball && ball !== mover && ball.row === fromRow && ball.col === fromCol
      && ball.height === moverTop) riders.push(ball);
  for (const c of crates.values()) {
    if (c !== mover && c.row === fromRow && c.col === fromCol
        && c.height === moverTop) riders.push(c);
  }
  for (const rider of riders) {
    if (riderBlocked(rider, toRow, toCol)) continue;
    const oldR = rider.row, oldC = rider.col;
    if (rider instanceof Crate) {
      moveCrateInMap(rider, toRow, toCol);
    } else {
      rider.row = toRow; rider.col = toCol;
    }
    moveRiders(oldR, oldC, toRow, toCol, rider);
  }
}

function syncMothHeight(crate) {
  const under = entityUnder(crate.row, crate.col, crate);
  if (under) {
    crate.height = under.height + under.selfHeight;
    return;
  }
  const tile = grid[crate.row][crate.col];
  if (tile.liftWall !== null) {
    // 站在升降墙格子上：高度跟随墙的状态
    crate.height = (tile.base === T_WALL) ? 1 : 0;
  }
  // 否则：保持当前飞行高度不变（不落地）
}

function updateAllHeights() {
  for (const crate of crates.values()) updateEntityHeight(crate);
  // 飞蛾在球和英雄之前同步——其他实体可能站在飞蛾上
  for (const crate of crates.values()) {
    if (crate.crateKey === 'moth') syncMothHeight(crate);
  }
  if (ball) updateEntityHeight(ball);
  if (hero) updateEntityHeight(hero);
}

function updateLiftWalls() {
  const wallPlates = new Map();
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c].liftWall !== null) {
        wallPlates.set(K(r, c), new Set());
      }
    }
  }
  for (const link of wireLinks) {
    const plateSet = wallPlates.get(link.wall);
    if (plateSet) plateSet.add(link.plate);
  }
  for (const [wkey, plates] of wallPlates) {
    const [wr, wc] = wkey.split(',').map(Number);
    let allPressed = plates.size > 0;
    if (allPressed) {
      for (const pk of plates) {
        const [pr, pc] = pk.split(',').map(Number);
        if (entityAt(pr, pc) === null) { allPressed = false; break; }
      }
    }
    const tile = grid[wr][wc];
    const wantsActivated = allPressed;
    // 只在墙即将变成 T_WALL（阻塞态）时检查 entityCount，防止碾压实体
    const wouldBeWall = (tile.liftWall === 'up') ? wantsActivated : !wantsActivated;
    const canActivate = wantsActivated && !(wouldBeWall && entityCount(wr, wc) >= 2);
    if (tile.liftWall === 'up') {
      tile.base = canActivate ? T_WALL : T_EMPTY;
    } else {
      tile.base = canActivate ? T_EMPTY : T_WALL;
    }
  }
}

function meltSnow() {
  if (!ball || !ball.lightOn) return;
  for (const [key, crate] of crates) {
    if (crate.crateKey !== 'snow') continue;
    if (dist(ball.row, ball.col, crate.row, crate.col) <= 1) {
      crates.delete(key);
      if (!key.endsWith(':1')) {
        const topKey = key + ':1';
        const topCrate = crates.get(topKey);
        if (topCrate) {
          crates.delete(topKey);
          crates.set(key, topCrate);
        }
      }
      grid[crate.row][crate.col].hasWater = true;
    }
  }
}

function hasLineOfSight(r1, c1, r2, c2) {
  if (r1 !== r2 && c1 !== c2) return false;
  if (r1 === r2) {
    const minC = Math.min(c1, c2);
    const maxC = Math.max(c1, c2);
    for (let c = minC + 1; c < maxC; c++) {
      if (grid[r1][c].base === T_WALL) return false;
      if (entityAt(r1, c) !== null) return false;
    }
  } else {
    const minR = Math.min(r1, r2);
    const maxR = Math.max(r1, r2);
    for (let r = minR + 1; r < maxR; r++) {
      if (grid[r][c1].base === T_WALL) return false;
      if (entityAt(r, c1) !== null) return false;
    }
  }
  return true;
}

function moveMoths() {
  if (!ball || !ball.lightOn) return;

  const moths = [];
  for (const [key, crate] of crates) {
    if (crate.crateKey === 'moth') {
      moths.push(crate);
    }
  }

  let anyMoved = true;
  while (anyMoved) {
    anyMoved = false;

    for (const crate of moths) {
      if (!ball || !ball.lightOn) return;

      const { row, col, height } = crate;

      if (row !== ball.row && col !== ball.col) continue;
      if (height !== ball.height) continue;
      if (!hasLineOfSight(row, col, ball.row, ball.col)) continue;

      const dr = Math.sign(ball.row - row);
      const dc = Math.sign(ball.col - col);
      if (dr === 0 && dc === 0) continue;

      const nr = row + dr;
      const nc = col + dc;

      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
      if (grid[nr][nc].base === T_WALL) continue;
      if (height < tileFootLevel(nr, nc)) continue;

      const heroBlock = hero && hero.row === nr && hero.col === nc
        && hero.height + hero.selfHeight > height;
      const ballBlock = ball && ball.row === nr && ball.col === nc
        && ball.height + ball.selfHeight > height;
      if (heroBlock || ballBlock) continue;

      let crateBlock = false;
      for (const c of cratesAt(nr, nc))
        if (c !== crate && c.height + c.selfHeight > height) { crateBlock = true; break; }
      if (crateBlock) continue;

      if (cratesAt(nr, nc).length >= 2) continue;

      const oldR = crate.row, oldC = crate.col;
      moveCrateInMap(crate, nr, nc);
      moveRiders(oldR, oldC, nr, nc, crate);
      anyMoved = true;
    }

    if (anyMoved) {
      updateLiftWalls();
      updateAllHeights();
    }
  }
}
