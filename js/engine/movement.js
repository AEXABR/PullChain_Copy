// 提取自 js/engine.js
// 重构：trait 判断替代 instanceof，Tile 方法替代散落属性组合，通用堆叠推动替代球骑人特判

function getPushChain(r, c, dr, dc, pusherHeight = -1) {
  const chain = [];
  let stepHeight = pusherHeight;
  while (true) {
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return null;
    const tile = grid[r][c];
    if (tile.isSolidAt(stepHeight)) return null;
    if (stepHeight < tile.footLevel()) return null;
    const ent = entityForPush(r, c, stepHeight);
    if (ent && tile.effectsOn(ent).rooted) return null;
    if (!ent) return chain;
    if (stepHeight >= ent.height + ent.selfHeight) return chain;
    if (stepHeight !== ent.height) return null;
    chain.push(ent);
    stepHeight = ent.height;
    r += dr; c += dc;
  }
}

function pushChain(chain, dr, dc) {
  for (let i = chain.length - 1; i >= 0; i--) {
    const ent = chain[i];
    const oldR = ent.row, oldC = ent.col;
    const newR = ent.row + dr, newC = ent.col + dc;
    moveEntityInMap(ent, newR, newC);
    moveRiders(oldR, oldC, newR, newC, ent);
  }
}

function diagCornersFor(dr, dc) {
  if (dr === -1 && dc === -1) return ['BL', 'TR'];
  if (dr === -1 && dc ===  1) return ['BR', 'TL'];
  if (dr ===  1 && dc === -1) return ['TL', 'BR'];
  if (dr ===  1 && dc ===  1) return ['TR', 'BL'];
  return null;
}

// 泛化：所有带 LEASHED trait 的实体跟随 hero 移动
// 替代原来的 followBall 特判
function followLeashed(prevRow, prevCol) {
  for (const ent of allEntities()) {
    if (!ent.has(TRAITS.LEASHED)) continue;
    if (!followOneLeashed(ent, prevRow, prevCol)) return false;
  }
  return true;
}

function followOneLeashed(leashedEnt, prevRow, prevCol) {
  if (dist(hero.row, hero.col, leashedEnt.row, leashedEnt.col) <= 1) return true;
  if (grid[leashedEnt.row][leashedEnt.col].hasWeb) return false;

  const prevEntRow = leashedEnt.row, prevEntCol = leashedEnt.col;
  const dr = Math.sign(prevRow - leashedEnt.row);
  const dc = Math.sign(prevCol - leashedEnt.col);
  const candidates = [];
  const diagRow = leashedEnt.row + dr;
  const diagCol = leashedEnt.col + dc;

  let diagCorner = null;
  let diagOk = dr === 0 || dc === 0;
  if (!diagOk) {
    const c1r = diagRow, c1c = leashedEnt.col;
    const c2r = leashedEnt.row, c2c = diagCol;
    const c1chain = getPushChain(c1r, c1c, dr, 0, leashedEnt.height);
    const c2chain = getPushChain(c2r, c2c, 0, dc, leashedEnt.height);
    const needed = diagCornersFor(dr, dc);
    const c1clear = grid[c1r] && (!isSolid(c1r, c1c) || c1chain !== null
                                   || (needed && grid[c1r][c1c].diagCorner?.includes(needed[0])));
    const c2clear = grid[c2r] && (!isSolid(c2r, c2c) || c2chain !== null
                                   || (needed && grid[c2r][c2c].diagCorner?.includes(needed[1])));
    if (c1clear && c2clear) {
      diagOk = true;
      diagCorner = { c1chain, c2chain };
    }
  }
  if (diagOk) candidates.push({ row: diagRow, col: diagCol, pushDr: dr, pushDc: dc, corner: diagCorner });
  if (dr !== 0 && dc !== 0) {
    candidates.push({ row: diagRow, col: leashedEnt.col, pushDr: dr, pushDc: 0 });
    candidates.push({ row: leashedEnt.row, col: diagCol, pushDr: 0,  pushDc: dc });
  }

  const isValid = (c) =>
    c.row >= 0 && c.row < GRID_SIZE && c.col >= 0 && c.col < GRID_SIZE &&
    dist(hero.row, hero.col, c.row, c.col) <= 1;

  // 策略 1: 尝试推动路径
  for (const c of candidates) {
    if (!isValid(c)) continue;
    const chain = getPushChain(c.row, c.col, c.pushDr, c.pushDc, leashedEnt.height);
    if (chain === null) continue;

    const needsCorner = c.corner && (c.corner.c1chain || c.corner.c2chain);
    const needsPush = chain.length > 0;

    if (needsCorner) {
      if (c.corner.c1chain) pushChain(c.corner.c1chain, dr, 0);
      if (c.corner.c2chain) pushChain(c.corner.c2chain, 0, dc);
    }
    if (needsPush) pushChain(chain, c.pushDr, c.pushDc);
    leashedEnt.row = c.row; leashedEnt.col = c.col;
    moveRiders(prevEntRow, prevEntCol, leashedEnt.row, leashedEnt.col, leashedEnt);
    break;
  }

  // 策略 2: 不推只移（回退路径）
  if (dist(hero.row, hero.col, leashedEnt.row, leashedEnt.col) > 1) {
    for (const c of candidates) {
      if (!isValid(c)) continue;
      const ent = entityForPush(c.row, c.col, leashedEnt.height);
      const canStep = !ent || leashedEnt.height >= ent.height + ent.selfHeight;
      const targetFoot = grid[c.row][c.col].footLevel();
      const tile = grid[c.row][c.col];
      const canAccess = leashedEnt.height >= targetFoot && !tile.isSolidAt(leashedEnt.height);
      if (canStep && canAccess) {
        leashedEnt.row = c.row; leashedEnt.col = c.col;
        moveRiders(prevEntRow, prevEntCol, leashedEnt.row, leashedEnt.col, leashedEnt);
        break;
      }
    }
  }

  if (dist(hero.row, hero.col, leashedEnt.row, leashedEnt.col) > 1) {
    leashedEnt.row = prevEntRow; leashedEnt.col = prevEntCol;
    return false;
  }
  return true;
}

function tryMoveHero(dr, dc) {
  if (grid[hero.row][hero.col].effectsOn(hero).rooted) return false;
  const nr = hero.row + dr, nc = hero.col + dc;

  if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return false;
  const targetFoot = grid[nr][nc].footLevel();
  const targetTile = grid[nr][nc];
  if (targetTile.isSolidAt(hero.height)) return false;

  if (hero.height < targetFoot) return false;

  const targetEnt = entityAt(nr, nc);
  if (targetEnt && hero.height >= targetEnt.height + targetEnt.selfHeight) {
    const prevRow = hero.row, prevCol = hero.col;
    hero.row = nr; hero.col = nc;
    moveRiders(prevRow, prevCol, nr, nc, hero);
    if (!followLeashed(prevRow, prevCol)) {
      hero.row = prevRow; hero.col = prevCol;
      for (const ent of allEntities()) {
        if (ent.has(TRAITS.LEASHED) && ent.has(TRAITS.TOGGLE_ON_LEASH_BREAK)) ent.toggle();
      }
      return false;
    }
    return true;
  }

  // 可通行的墙体（升降墙升起但角色高度足够），没有实体阻挡 → 直接站上去
  if (targetTile.base === T_WALL && !targetEnt) {
    const prevRow = hero.row, prevCol = hero.col;
    hero.row = nr; hero.col = nc;
    moveRiders(prevRow, prevCol, nr, nc, hero);
    if (!followLeashed(prevRow, prevCol)) {
      hero.row = prevRow; hero.col = prevCol;
      for (const ent of allEntities()) {
        if (ent.has(TRAITS.LEASHED) && ent.has(TRAITS.TOGGLE_ON_LEASH_BREAK)) ent.toggle();
      }
      return false;
    }
    return true;
  }

  const bottomCrate = crates.get(K(nr, nc));
  const topCrate = crates.get(K(nr, nc) + ':1');
  if (bottomCrate && topCrate && targetEnt === topCrate &&
      hero.height >= bottomCrate.height + bottomCrate.selfHeight) {
    const topDestR = nr + dr, topDestC = nc + dc;
    const topChain = getPushChain(topDestR, topDestC, dr, dc, topCrate.height);
    if (topChain !== null) {
      const savedCrates = snapshotCrates();
      const savedHero = { row: hero.row, col: hero.col };
      const savedBall = ball ? { row: ball.row, col: ball.col } : null;
      const prevRow = hero.row, prevCol = hero.col;
      if (topChain.length > 0) pushChain(topChain, dr, dc);
      crates.delete(K(nr, nc) + ':1');
      topCrate.row = topDestR; topCrate.col = topDestC;
      const destKey = K(topDestR, topDestC);
      if (crates.has(destKey)) {
        crates.set(destKey + ':1', topCrate);
      } else {
        crates.set(destKey, topCrate);
      }
      moveRiders(nr, nc, topDestR, topDestC, topCrate);
      hero.row = nr; hero.col = nc;
      moveRiders(prevRow, prevCol, nr, nc, hero);
      if (!followLeashed(prevRow, prevCol)) {
        restoreCrates(savedCrates);
        if (ball) { ball.row = savedBall.row; ball.col = savedBall.col; }
        hero.row = savedHero.row; hero.col = savedHero.col;
        for (const ent of allEntities()) {
          if (ent.has(TRAITS.LEASHED) && ent.has(TRAITS.TOGGLE_ON_LEASH_BREAK)) ent.toggle();
        }
        return false;
      }
      return true;
    }
  }

  // 主角必须能进入目标格（高度被阻挡则直接失败）
  const chain = getPushChain(nr, nc, dr, dc, hero.height);
  if (chain === null) return false;

  // 策略链：主角高度无需推动时，尝试骑乘高度推动障碍物（副作用）
  if (chain.length === 0) {
    const heroTop = hero.height + hero.selfHeight;
    const maxHeight = topHeightAt(hero.row, hero.col, hero);
    for (let h = heroTop; h <= maxHeight; h++) {
      const altChain = getPushChain(nr, nc, dr, dc, h);
      if (altChain !== null && altChain.length > 0) {
        pushChain(altChain, dr, dc);
        break;
      }
    }
  }

  const savedCrates = snapshotCrates();
  const savedHero = { row: hero.row, col: hero.col };
  const savedBall = ball ? { row: ball.row, col: ball.col } : null;

  const prevRow = hero.row, prevCol = hero.col;
  pushChain(chain, dr, dc);
  hero.row = nr; hero.col = nc;
  moveRiders(prevRow, prevCol, nr, nc, hero);

  if (!followLeashed(prevRow, prevCol)) {
    restoreCrates(savedCrates);
    if (ball) { ball.row = savedBall.row; ball.col = savedBall.col; }
    hero.row = savedHero.row; hero.col = savedHero.col;
    for (const ent of allEntities()) {
      if (ent.has(TRAITS.LEASHED) && ent.has(TRAITS.TOGGLE_ON_LEASH_BREAK)) ent.toggle();
    }
    return false;
  }
  return true;
}
