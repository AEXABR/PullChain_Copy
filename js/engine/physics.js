// 提取自 js/engine.js
// 重构：trait 替代 instanceof/crateKey，unified entitiesAt/allEntities 替代散落的 hero/ball/crates 检查

// 升降墙行为策略 — 替代 updateLiftWalls 中的 liftWall 字符串 switch
const WallBehaviors = {
  up: {
    wantsActivated(plates) {
      if (plates.size === 0) return false;
      for (const pk of plates) {
        const [pr, pc] = pk.split(',').map(Number);
        if (entityAt(pr, pc) === null) return false;
      }
      return true;
    },
    wallWhenActivated: true,
  },
  down: {
    wantsActivated(plates) {
      if (plates.size === 0) return false;
      for (const pk of plates) {
        const [pr, pc] = pk.split(',').map(Number);
        if (entityAt(pr, pc) === null) return false;
      }
      return true;
    },
    wallWhenActivated: false,
  },
  auto: {
    wantsActivated(plates, entitiesOnTile) {
      return entitiesOnTile !== null;
    },
    wallWhenActivated: true,
  },
};

function topHeightAt(row, col, exclude) {
  let top = grid[row][col].footLevel();
  for (const e of entitiesAt(row, col))
    if (e !== exclude) top = Math.max(top, e.height + e.selfHeight);
  return top;
}

function entityUnder(r, c, self) {
  // 返回 self 下方最高的实体（self 实际站在它上面）
  let best = null;
  for (const e of entitiesAt(r, c)) {
    if (e !== self && e.height < self.height) {
      if (!best || e.height > best.height) best = e;
    }
  }
  return best;
}

// 保持 editor/renderer 兼容 — 内部委托给 Tile.footLevel()
function tileFootLevel(r, c) {
  return grid[r][c].footLevel();
}

function updateEntityHeight(ent) {
  if (!ent) return;
  if (!ent.wantsGroundSnap()) return; // 飞行实体不随地形落地
  const r = ent.row, c = ent.col;
  const under = entityUnder(r, c, ent);
  if (under) {
    ent.height = under.height + under.selfHeight;
  } else {
    ent.height = grid[r][c].footLevel();
  }
}

// 把任意实体从旧坐标移动到新坐标（委托给 Entity/Crate 多态 moveTo）
function moveEntityInMap(ent, newRow, newCol) {
  ent.moveTo(newRow, newCol);
}

// 目标格是否已有实体占据骑乘者的高度
function riderBlocked(rider, toRow, toCol) {
  const h = rider.height;
  for (const e of entitiesAt(toRow, toCol))
    if (e !== rider && e.height === h) return true;
  return false;
}

// 骑在 mover 上面的实体，跟着一起移动（递归处理多层堆叠）
function moveRiders(fromRow, fromCol, toRow, toCol, mover) {
  const moverTop = mover.height + mover.selfHeight;
  const riders = [];
  for (const e of allEntities()) {
    if (e !== mover && e.row === fromRow && e.col === fromCol
        && e.height === moverTop) riders.push(e);
  }
  for (const rider of riders) {
    if (riderBlocked(rider, toRow, toCol)) continue;
    const oldR = rider.row, oldC = rider.col;
    moveEntityInMap(rider, toRow, toCol);
    moveRiders(oldR, oldC, toRow, toCol, rider);
  }
}

// 飞行实体的高度同步 — 站在实体或升降墙上，但不会落到裸地
function syncFlyingHeight(ent) {
  const under = entityUnder(ent.row, ent.col, ent);
  if (under) {
    ent.height = under.height + under.selfHeight;
    return;
  }
  const tile = grid[ent.row][ent.col];
  if (tile.liftWall !== null) {
    ent.height = (tile.base === T_WALL) ? 1 : 0;
  }
  // 否则：保持当前飞行高度不变（不落地）
}

function updateAllHeights() {
  // Pass 1: 地面实体落地
  for (const ent of allEntities()) {
    if (!ent.has(TRAITS.FLYING)) updateEntityHeight(ent);
  }
  // Pass 2: 飞行实体同步（可能站在已落地的实体上）
  for (const ent of allEntities()) {
    if (ent.has(TRAITS.FLYING)) syncFlyingHeight(ent);
  }
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
    const tile = grid[wr][wc];
    const behavior = tile.getWallBehavior();

    // 所有类型统一：behavior 自己决定激活条件
    const wantsActivated = behavior.wantsActivated(plates, entityAt(wr, wc));

    const wouldBeWall = behavior.wallWhenActivated ? wantsActivated : !wantsActivated;

    // 天花板机制：只在墙真正升高时检查
    const isRising = wouldBeWall && tile.base !== T_WALL;
    const wouldExceedCeiling = isRising && (topHeightAt(wr, wc) + 1) > tile.ceilingHeight();
    const canActivate = wantsActivated && !wouldExceedCeiling;

    tile.base = canActivated
      ? (behavior.wallWhenActivated ? T_WALL : T_EMPTY)
      : (behavior.wallWhenActivated ? T_EMPTY : T_WALL);
  }
}

// meltSnow() 已移至 events.js，通过 'turnEnd' 事件驱动
// 飞蛾趋光 — 替代原来的 moveMoths()，trait 驱动
function processFliers() {
  const sources = [];
  for (const ent of allEntities()) {
    if (ent.has(TRAITS.LIGHT_SOURCE) && ent.lightOn) sources.push(ent);
  }
  if (sources.length === 0) return;
  const target = sources[0];

  const fliers = [];
  for (const ent of allEntities()) {
    if (ent.has(TRAITS.FLIES_TOWARD_LIGHT)) fliers.push(ent);
  }

  let anyMoved = true;
  while (anyMoved) {
    anyMoved = false;
    for (const ent of fliers) {
      if (!target.lightOn) return;

      const { row, col, height } = ent;
      if (row !== target.row && col !== target.col) continue;
      if (height !== target.height) continue;
      if (!hasLineOfSight(row, col, target.row, target.col)) continue;

      const dr = Math.sign(target.row - row);
      const dc = Math.sign(target.col - col);
      if (dr === 0 && dc === 0) continue;

      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
      if (grid[nr][nc].isSolidAt(height)) continue;
      if (height < grid[nr][nc].footLevel()) continue;

      let blocked = false;
      for (const other of entitiesAt(nr, nc)) {
        if (other !== ent && other.height + other.selfHeight > height) {
          blocked = true; break;
        }
      }
      if (blocked) continue;
      if (entitiesAt(nr, nc).length >= 2) continue;

      const oldR = ent.row, oldC = ent.col;
      moveEntityInMap(ent, nr, nc);
      moveRiders(oldR, oldC, nr, nc, ent);
      anyMoved = true;
    }
    if (anyMoved) {
      updateLiftWalls();
      updateAllHeights();
    }
  }
}

function hasLineOfSight(r1, c1, r2, c2) {
  if (r1 !== r2 && c1 !== c2) return false;
  if (r1 === r2) {
    const minC = Math.min(c1, c2);
    const maxC = Math.max(c1, c2);
    for (let c = minC + 1; c < maxC; c++) {
      if (grid[r1][c].isSolidAt(0)) return false;
      for (const e of entitiesAt(r1, c))
        if (e.has(TRAITS.BLOCKS_VISION)) return false;
    }
  } else {
    const minR = Math.min(r1, r2);
    const maxR = Math.max(r1, r2);
    for (let r = minR + 1; r < maxR; r++) {
      if (grid[r][c1].isSolidAt(0)) return false;
      for (const e of entitiesAt(r, c1))
        if (e.has(TRAITS.BLOCKS_VISION)) return false;
    }
  }
  return true;
}
