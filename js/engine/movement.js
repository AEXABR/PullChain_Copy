// 提取自 js/engine.js

function getPushChain(r, c, dr, dc, pusherHeight = -1) {
  const chain = [];
  let stepHeight = pusherHeight;
  while (true) {
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return null;
    const tile = grid[r][c];
    if (tile.base === T_WALL && !(tile.liftWall !== null && stepHeight >= tileFootLevel(r, c))) return null;
    if (stepHeight < tileFootLevel(r, c)) return null;
    const ent = entityForPush(r, c);
    if (ent && tile.hasWeb) return null;
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
    const newR = ent.row + dr, newC = ent.col + dc;
    if (ent instanceof Crate) {
      const oldKey = K(ent.row, ent.col);
      const stackedKey = oldKey + ':1';
      const atBottom = crates.get(oldKey) === ent;
      const atTop = crates.get(stackedKey) === ent;
      let stacked = null;
      if (atBottom) {
        stacked = crates.get(stackedKey);
      } else if (atTop) {
        stacked = crates.get(oldKey);
      }
      if (atBottom) crates.delete(oldKey);
      if (atTop) crates.delete(stackedKey);
      if (stacked) {
        const sk = K(stacked.row, stacked.col);
        crates.delete(sk);
        crates.delete(sk + ':1');
      }
      ent.row = newR; ent.col = newC;
      const destKey = K(newR, newC);
      const destHadCrate = crates.has(destKey);
      if (destHadCrate) {
        crates.set(destKey + ':1', ent);
      } else {
        crates.set(destKey, ent);
      }
      if (stacked) {
        stacked.row = newR; stacked.col = newC;
        if (!destHadCrate) {
          crates.set(destKey + ':1', stacked);
        }
      }
    } else {
      ent.row = newR; ent.col = newC;
    }
  }
}

function diagCornersFor(dr, dc) {
  if (dr === -1 && dc === -1) return ['BL', 'TR'];
  if (dr === -1 && dc ===  1) return ['BR', 'TL'];
  if (dr ===  1 && dc === -1) return ['TL', 'BR'];
  if (dr ===  1 && dc ===  1) return ['TR', 'BL'];
  return null;
}

function followBall(prevRow, prevCol) {
  if (!ball) return true;
  if (dist(hero.row, hero.col, ball.row, ball.col) <= 1) return true;
  if (grid[ball.row][ball.col].hasWeb) return false;

  const prevBallRow = ball.row, prevBallCol = ball.col;
  const dr = Math.sign(prevRow - ball.row);
  const dc = Math.sign(prevCol - ball.col);
  const candidates = [];
  const diagRow = ball.row + dr;
  const diagCol = ball.col + dc;

  let diagCorner = null;
  let diagOk = dr === 0 || dc === 0;
  if (!diagOk) {
    const c1r = diagRow, c1c = ball.col;
    const c2r = ball.row, c2c = diagCol;
    const c1chain = getPushChain(c1r, c1c, dr, 0, ball.height);
    const c2chain = getPushChain(c2r, c2c, 0, dc, ball.height);
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
    candidates.push({ row: diagRow, col: ball.col, pushDr: dr, pushDc: 0 });
    candidates.push({ row: ball.row, col: diagCol, pushDr: 0,  pushDc: dc });
  }

  const isValid = (c) =>
    c.row >= 0 && c.row < GRID_SIZE && c.col >= 0 && c.col < GRID_SIZE &&
    dist(hero.row, hero.col, c.row, c.col) <= 1;

  for (const c of candidates) {
    if (!isValid(c)) continue;
    const chain = getPushChain(c.row, c.col, c.pushDr, c.pushDc, ball.height);
    if (chain === null) continue;

    const needsCorner = c.corner && (c.corner.c1chain || c.corner.c2chain);
    const needsPush = chain.length > 0;

    if (needsCorner) {
      if (c.corner.c1chain) pushChain(c.corner.c1chain, dr, 0);
      if (c.corner.c2chain) pushChain(c.corner.c2chain, 0, dc);
    }
    if (needsPush) pushChain(chain, c.pushDr, c.pushDc);
    ball.row = c.row; ball.col = c.col;
    break;
  }

  if (dist(hero.row, hero.col, ball.row, ball.col) > 1) {
    for (const c of candidates) {
      if (!isValid(c)) continue;
      const ent = entityForPush(c.row, c.col);
      const canStep = !ent || ball.height >= ent.height + ent.selfHeight;
      const targetFoot = tileFootLevel(c.row, c.col);
      const tile = grid[c.row][c.col];
      const canAccess = ball.height >= targetFoot && (tile.base !== T_WALL || tile.liftWall !== null);
      if (canStep && canAccess) {
        ball.row = c.row; ball.col = c.col;
        break;
      }
    }
  }

  if (dist(hero.row, hero.col, ball.row, ball.col) > 1) {
    ball.row = prevBallRow; ball.col = prevBallCol;
    return false;
  }
  return true;
}

function tryMoveHero(dr, dc) {
  if (grid[hero.row][hero.col].hasWeb) return false;
  const nr = hero.row + dr, nc = hero.col + dc;

  if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return false;
  const targetFoot = tileFootLevel(nr, nc);
  const targetTile = grid[nr][nc];
  if (targetTile.base === T_WALL && !(targetTile.liftWall !== null && hero.height >= targetFoot)) return false;

  if (hero.height < targetFoot) return false;

  const targetEnt = entityAt(nr, nc);
  if (targetEnt && hero.height >= targetEnt.height + targetEnt.selfHeight) {
    const prevRow = hero.row, prevCol = hero.col;
    hero.row = nr; hero.col = nc;
    if (!followBall(prevRow, prevCol)) {
      hero.row = prevRow; hero.col = prevCol;
      if (ball) ball.toggle();
      return false;
    }
    return true;
  }

  if (targetTile.base === T_WALL && !targetEnt) {
    const prevRow = hero.row, prevCol = hero.col;
    hero.row = nr; hero.col = nc;
    if (!followBall(prevRow, prevCol)) {
      hero.row = prevRow; hero.col = prevCol;
      if (ball) ball.toggle();
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
      hero.row = nr; hero.col = nc;
      if (!followBall(prevRow, prevCol)) {
        restoreCrates(savedCrates);
        if (ball) { ball.row = savedBall.row; ball.col = savedBall.col; }
        hero.row = savedHero.row; hero.col = savedHero.col;
        ball.toggle();
        return false;
      }
      return true;
    }
  }

  const chain = getPushChain(nr, nc, dr, dc, hero.height);
  if (chain === null) return false;

  const savedCrates = snapshotCrates();
  const savedHero = { row: hero.row, col: hero.col };
  const savedBall = ball ? { row: ball.row, col: ball.col } : null;

  const prevRow = hero.row, prevCol = hero.col;
  pushChain(chain, dr, dc);
  hero.row = nr; hero.col = nc;

  if (!followBall(prevRow, prevCol)) {
    restoreCrates(savedCrates);
    if (ball) { ball.row = savedBall.row; ball.col = savedBall.col; }
    hero.row = savedHero.row; hero.col = savedHero.col;
    ball.toggle();
    return false;
  }
  return true;
}
