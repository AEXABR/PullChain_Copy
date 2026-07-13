// 提取自 js/engine.js

function entityPriority(ent) {
  if (ent instanceof Hero) return 3;
  if (ent instanceof Ball) return 2;
  if (ent instanceof Crate) return 1;
  return 0;
}

function entityUnder(r, c, self) {
  const allCrates = cratesAt(r, c);
  if (allCrates.length === 2 && allCrates[1] === self) return allCrates[0];
  const check = (ent) => {
    if (!ent || ent === self || ent.row !== r || ent.col !== c) return false;
    return ent.height < self.height ||
          (ent.height === self.height && entityPriority(ent) < entityPriority(self));
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
  if (ent instanceof Crate && ent.crateKey === 'moth') return;
  const r = ent.row, c = ent.col;
  const under = entityUnder(r, c, ent);
  if (under) {
    ent.height = under.height + under.selfHeight;
  } else {
    ent.height = tileFootLevel(r, c);
  }
}

function updateAllHeights() {
  for (const crate of crates.values()) updateEntityHeight(crate);
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
    const canRaise = allPressed && entityCount(wr, wc) < 2;
    if (tile.liftWall === 'up') {
      tile.base = canRaise ? T_WALL : T_EMPTY;
    } else {
      tile.base = canRaise ? T_EMPTY : T_WALL;
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
    if (crate.crateKey === 'moth' && !key.endsWith(':1')) {
      moths.push(crate);
    }
  }

  for (const crate of moths) {
    while (true) {
      if (!ball || !ball.lightOn) break;

      const { row, col, height } = crate;

      if (row !== ball.row && col !== ball.col) break;

      if (height !== ball.height) break;

      if (!hasLineOfSight(row, col, ball.row, ball.col)) break;

      const dr = Math.sign(ball.row - row);
      const dc = Math.sign(ball.col - col);

      if (dr === 0 && dc === 0) break;

      const nr = row + dr;
      const nc = col + dc;

      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) break;

      if (grid[nr][nc].base === T_WALL) break;

      if (height < tileFootLevel(nr, nc)) break;

      const destEnt = entityAt(nr, nc);
      if (destEnt && destEnt.height + destEnt.selfHeight > height) break;

      if (crates.has(K(nr, nc))) break;

      const oldKey = K(row, col);
      crates.delete(oldKey);
      crate.row = nr;
      crate.col = nc;
      crates.set(K(nr, nc), crate);

      updateLiftWalls();
    }
  }
}
