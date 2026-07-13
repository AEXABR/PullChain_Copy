# 代码文件结构优化 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 3 个 550+ 行的 JS 全局脚本拆分为 13 个 ES 模块文件，零依赖、纯浏览器原生 `<script type="module">`。

**Architecture:** 保持 engine → editor → renderer 三层依赖方向。每个新文件按 `import → 定义 → export` 组织。engine/ 纯逻辑零 DOM，editor/ 依赖 engine + editor-state，renderer/ 依赖 engine + editor-state。`ctx`/`canvas`/`statusEl` 保留在 HTML 内联脚本设为全局。

**Tech Stack:** 纯 ES modules（浏览器原生），无构建工具

## Global Constraints

- 所有函数签名不变、变量名不变、运行时行为不变
- HTML 除 `<script>` 标签外不动，CSS 不动
- 当前 `main` 分支的工作区是干净的（无未提交改动）
- 每个新文件的 `import`/`export` 必须精确——少一个导出就会运行时 undefined

---

### Task 1: 建立分支

**Files:**
- （无文件改动）

**Interfaces:**
- Produces: 分支 `refactor/es-modules`，基于当前 main HEAD `326db21`

- [ ] **Step 1: 创建重构分支**

```bash
git checkout -b refactor/es-modules
```

- [ ] **Step 2: 确认工作区干净**

```bash
git status
```

Expected: `nothing to commit, working tree clean`

---

### Task 2: 创建零依赖的 engine 文件（constants, Tile, entities）

**Files:**
- Create: `js/engine/constants.js`
- Create: `js/engine/Tile.js`
- Create: `js/engine/entities.js`

**Interfaces:**
- Consumes: 无（这三个文件零依赖）
- Produces:
  - `constants.js`: `export const CANVAS_SIZE, GRID_SIZE, TILE_SIZE, T_EMPTY, T_WALL, DIAG_CORNERS, DIAG_SYMBOLS`
  - `Tile.js`: `export class Tile`
  - `entities.js`: `export class Entity, Hero, Ball, Crate` + `export const CRATES`

- [ ] **Step 1: 创建 `js/engine/constants.js`**

从原 `js/engine.js` 提取第 1-8 行和第 43-45 行：

```js
export const CANVAS_SIZE = 512;
export const GRID_SIZE = 16;
export const TILE_SIZE = CANVAS_SIZE / GRID_SIZE; // 32px

export const T_EMPTY = 0;
export const T_WALL  = 1;

export const DIAG_CORNERS = ['TL', 'TR', 'BL', 'BR'];
export const DIAG_SYMBOLS = { TL: '◤', TR: '◥', BL: '◣', BR: '◢' };
```

- [ ] **Step 2: 创建 `js/engine/Tile.js`**

从原 `js/engine.js` 提取第 11-21 行 Tile 类，加上 `export`：

```js
import { T_EMPTY } from './constants.js';

export class Tile {
  constructor() {
    this.base = T_EMPTY;        // T_EMPTY | T_WALL
    this.diagCorner = null;     // null | ['TL','TR','BL','BR',...]
    this.liftWall = null;       // 'up'|'down'|null
    this.isPlate = false;
    this.hasWater = false;
    this.hasWeb = false;
    this.hasDepression = false;
  }
}
```

- [ ] **Step 3: 创建 `js/engine/entities.js`**

从原 `js/engine.js` 提取第 24-34 行（Entity 类族）和第 37-41 行（CRATES）：

```js
export class Entity {
  constructor(row, col) { this.row = row; this.col = col; this.height = 0; this.selfHeight = 1; }
}
export class Hero  extends Entity {}
export class Ball  extends Entity {
  constructor(row, col) { super(row, col); this.lightOn = true; }
  toggle() { this.lightOn = !this.lightOn; }
}
export class Crate extends Entity {
  constructor(row, col, crateKey) { super(row, col); this.crateKey = crateKey; }
}

export const CRATES = {
  wood: { name: '木箱', emoji: '📦' },
  snow: { name: '雪块', emoji: '❄️' },
  moth: { name: '飞蛾', emoji: '🦋' },
};
```

- [ ] **Step 4: 验证——无运行时验证（模块尚未被加载），只确认文件存在和行数合理**

```bash
wc -l js/engine/constants.js js/engine/Tile.js js/engine/entities.js
```

Expected: ~15, ~17, ~30 行

---

### Task 3: 创建 engine/state.js

**Files:**
- Create: `js/engine/state.js`

**Interfaces:**
- Consumes: `CANVAS_SIZE, GRID_SIZE, TILE_SIZE, T_EMPTY, T_WALL` from `./constants.js`; `Tile` from `./Tile.js`; `Entity, Hero, Ball, Crate` from `./entities.js`
- Produces: `export let grid, hero, ball`; `export const crates, wireLinks`; `export function initGrid, K, dist, crateAt, cratesAt, entityCount, entityAt, entityForPush, isSolid, snapshotCrates, restoreCrates`

- [ ] **Step 1: 创建 `js/engine/state.js`**

从原 `js/engine.js` 提取以下行：
- 第 59-63 行：状态变量声明（grid, hero, ball, crates, wireLinks）
- 第 72-81 行：initGrid()
- 第 83-118 行：K, dist, crateAt, cratesAt, entityCount, entityAt, entityForPush, isSolid, snapshotCrates, restoreCrates

加上 import/export 包装：

```js
import { GRID_SIZE, T_WALL } from './constants.js';
import { Tile } from './Tile.js';
import { Crate } from './entities.js';

export let grid = [];
export let hero = null;
export let ball = null;
export const crates = new Map();
export const wireLinks = [];

export function initGrid() {
  grid = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    grid[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      grid[r][c] = new Tile();
    }
  }
}
initGrid();

export const K = (r, c) => `${r},${c}`;
export const dist = (r1, c1, r2, c2) => Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));

export function crateAt(r, c) {
  const key = K(r, c);
  return crates.get(key + ':1') || crates.get(key) || null;
}
export function cratesAt(r, c) {
  const a = [];
  const key = K(r, c);
  const b = crates.get(key); if (b) a.push(b);
  const t = crates.get(key + ':1'); if (t) a.push(t);
  return a;
}
export function entityCount(r, c) { let n = 0; if (hero && hero.row === r && hero.col === c) n++; if (ball && ball.row === r && ball.col === c) n++; const cs = cratesAt(r, c); n += cs.length; return n; }
export function entityAt(r, c) {
  if (hero && hero.row === r && hero.col === c) return hero;
  if (ball && ball.row === r && ball.col === c) return ball;
  return crateAt(r, c);
}
export function entityForPush(r, c) {
  if (ball && ball.row === r && ball.col === c) return ball;
  const key = K(r, c);
  return crates.get(key) || crates.get(key + ':1') || null;
}
export function isSolid(r, c)     { return grid[r][c].base === T_WALL || crateAt(r, c) !== null; }

export function snapshotCrates() {
  const snap = new Map();
  for (const [k, v] of crates) snap.set(k, new Crate(v.row, v.col, v.crateKey));
  return snap;
}
export function restoreCrates(snap) { crates.clear(); for (const [k, v] of snap) crates.set(k, v); }
```

**关键决策：** `grid`、`hero`、`ball` 用 `export let`（它们在运行时会被重新赋值），其余用 `export const`。

- [ ] **Step 2: 验证文件行数**

```bash
wc -l js/engine/state.js
```

Expected: ~100 行

---

### Task 4: 创建 engine/physics.js

**Files:**
- Create: `js/engine/physics.js`

**Interfaces:**
- Consumes: `GRID_SIZE, T_EMPTY, T_WALL` from `./constants.js`; `grid, hero, ball, crates, wireLinks, K, entityCount, entityAt, dist` from `./state.js`; `Crate` from `./entities.js`
- Produces: `export function entityPriority, entityUnder, tileFootLevel, updateEntityHeight, updateAllHeights, updateLiftWalls, meltSnow, hasLineOfSight, moveMoths`

- [ ] **Step 1: 创建 `js/engine/physics.js`**

从原 `js/engine.js` 提取以下行：
- 第 185-237 行：高度系统
- 第 239-271 行：updateLiftWalls
- 第 273-291 行：meltSnow
- 第 293-312 行：hasLineOfSight
- 第 314-381 行：moveMoths

加上 import/export 包装：

```js
import { GRID_SIZE, T_EMPTY, T_WALL } from './constants.js';
import { grid, hero, ball, crates, wireLinks, K, entityCount, entityAt, dist, cratesAt, crateAt } from './state.js';
import { Hero, Ball, Crate } from './entities.js';

export function entityPriority(ent) {
  if (ent instanceof Hero) return 3;
  if (ent instanceof Ball) return 2;
  if (ent instanceof Crate) return 1;
  return 0;
}

export function entityUnder(r, c, self) {
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

export function tileFootLevel(r, c) {
  let level = 0;
  const tile = grid[r][c];
  if (tile.liftWall !== null && tile.base === T_WALL) level += 1;
  if (tile.hasDepression) level -= 1;
  return level;
}

export function updateEntityHeight(ent) {
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

export function updateAllHeights() {
  for (const crate of crates.values()) updateEntityHeight(crate);
  if (ball) updateEntityHeight(ball);
  if (hero) updateEntityHeight(hero);
}

export function updateLiftWalls() {
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

export function meltSnow() {
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

export function hasLineOfSight(r1, c1, r2, c2) {
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

export function moveMoths() {
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
```

- [ ] **Step 2: 验证**

```bash
wc -l js/engine/physics.js
```

Expected: ~250 行

---

### Task 5: 创建 engine/movement.js

**Files:**
- Create: `js/engine/movement.js`

**Interfaces:**
- Consumes: `GRID_SIZE, T_WALL, DIAG_CORNERS` from `./constants.js`; `grid, hero, ball, crates, K, entityAt, entityForPush, entityCount, isSolid, snapshotCrates, restoreCrates` from `./state.js`; `Crate, Ball` from `./entities.js`; `tileFootLevel` from `./physics.js`
- Produces: `export function getPushChain, pushChain, diagCornersFor, followBall, tryMoveHero`

- [ ] **Step 1: 创建 `js/engine/movement.js`**

从原 `js/engine.js` 提取：
- 第 120-183 行：getPushChain, pushChain
- 第 386-566 行：diagCornersFor, followBall, tryMoveHero

加上 import/export：

```js
import { GRID_SIZE, T_WALL, DIAG_CORNERS } from './constants.js';
import { grid, hero, ball, crates, K, entityAt, entityForPush, entityCount, isSolid, snapshotCrates, restoreCrates } from './state.js';
import { Crate, Ball } from './entities.js';
import { tileFootLevel } from './physics.js';

export function getPushChain(r, c, dr, dc, pusherHeight = -1) {
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

export function pushChain(chain, dr, dc) {
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

export function diagCornersFor(dr, dc) {
  if (dr === -1 && dc === -1) return ['BL', 'TR'];
  if (dr === -1 && dc ===  1) return ['BR', 'TL'];
  if (dr ===  1 && dc === -1) return ['TL', 'BR'];
  if (dr ===  1 && dc ===  1) return ['TR', 'BL'];
  return null;
}

export function followBall(prevRow, prevCol) {
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

export function tryMoveHero(dr, dc) {
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
```

> **注意：** `followBall` 引用了 `GRID_SIZE`、`dist`（从 state.js 导入），以及 `tileFootLevel`（从 physics.js 导入）。`tryMoveHero` 也使用了 `entityAt`（从 state.js 导入）。

- [ ] **Step 2: 验证**

```bash
wc -l js/engine/movement.js
```

Expected: ~210 行

---

### Task 6: 创建 editor/editor-state.js

**Files:**
- Create: `js/editor/editor-state.js`

**Interfaces:**
- Consumes: 无（零依赖，纯数据结构）
- Produces: `export const editor, HOVER_MODES, HIGHLIGHT_MODES, BLOCKED_AS_WALL_MODES, DRAG_MODES, modeLabels`

- [ ] **Step 1: 创建 `js/editor/editor-state.js`**

从原 `js/engine.js` 提取第 48-57 行（editor 对象）和第 65-69 行（模式元数据 Set），从原 `js/editor.js` 提取第 389-402 行（modeLabels）：

```js
export const editor = {
  mode: 'wall',
  currentCrateKey: 'wood',
  currentDiagCorner: 'TL',
  currentLiftType: 'up',
  isDrawing: false,
  hoverCell: null,
  wireStart: null,
};

export const HOVER_MODES    = new Set(['place_hero','place_ball','place_crate','web','plate','liftwall','wire']);
export const HIGHLIGHT_MODES = new Set(['place_hero','place_ball','place_crate','web','plate','liftwall']);
export const BLOCKED_AS_WALL_MODES = new Set(['web','plate','liftwall']);
export const DRAG_MODES     = new Set(['wall','diag','erase','depression']);

export const modeLabels = {
  'wall':        '模式: 画墙 — 点击/拖拽画布放置墙体',
  'diag':        '',
  'erase':       '模式: 擦除 — 点击/拖拽画布清除墙体或箱子',
  'place_hero':  '模式: 放置角色 — 点击空地放置角色',
  'place_ball':  '模式: 放置球 — 点击空地放置球（不能和角色/箱子同格）',
  'place_crate': '',
  'web':         '模式: 蜘蛛网 — 点击/拖拽在空地上放置蜘蛛网',
  'plate':       '模式: 踏板 — 点击空地放置踏板',
  'liftwall':    '',
  'depression':  '模式: 洼地 — 点击/拖拽在空地上放置洼地（高度-1）',
  'wire':        '模式: 引线 — 点击踏板然后点击升降墙连线',
  'play':        '模式: 操控 — 方向键/WASD 移动角色'
};
```

- [ ] **Step 2: 验证**

```bash
wc -l js/editor/editor-state.js
```

Expected: ~40 行

---

### Task 7: 创建 editor/actions.js

**Files:**
- Create: `js/editor/actions.js`

**Interfaces:**
- Consumes: `T_WALL, T_EMPTY, DIAG_SYMBOLS` from `../engine/constants.js`; `grid, hero, ball, crates, wireLinks, K, entityAt` from `../engine/state.js`; `Hero, Ball, Crate, CRATES` from `../engine/entities.js`; `entityUnder, tileFootLevel, updateAllHeights` from `../engine/physics.js`; `editor` from `./editor-state.js`
- Produces: `export function setTile, placeDiagWall, placeCrate, placeWeb, placePlate, placeLiftWall, placeDepression, eraseTop`
- 注意：`placeHero`, `placeBall`, `PLACE_ACTIONS` 定义在 ui.js（因调用 `setMode`，避免循环依赖）

- [ ] **Step 1: 创建 `js/editor/actions.js`**

从原 `js/editor.js` 提取：
- 第 22-55 行：setTile
- 第 58-80 行：placeDiagWall
- 第 82-109 行：placeCrate
- 第 111-120 行：placeWeb
- 第 122-130 行：placePlate
- 第 132-145 行：placeLiftWall
- 第 147-161 行：placeDepression
- 第 164-258 行：eraseTop
- 第 260-276 行：placeHero
- 第 278-289 行：placeBall
- 第 305-316 行：PLACE_ACTIONS

加上 import/export。（actions.js 依赖 statusEl 全局变量读取和写入——`statusEl.textContent = ...` 在多处使用。保持原样使用全局 `statusEl`。）

**关键修改：** 原 `setTile` 函数引用了 `wireLinks`、`editor.wireStart`，需要从对应的 import 获取。原 `placeCrate` 调用 `updateAllHeights()` 需要从 physics 导入。原 `eraseTop` 操作 `wireLinks` 和 `editor.wireStart`。

```js
import { T_WALL, T_EMPTY, DIAG_SYMBOLS } from '../engine/constants.js';
import { grid, hero, ball, crates, wireLinks, K, entityAt } from '../engine/state.js';
import { Hero, Ball, Crate, CRATES } from '../engine/entities.js';
import { entityUnder, tileFootLevel, updateAllHeights } from '../engine/physics.js';
import { editor } from './editor-state.js';

// ====== setTile ======
export function setTile(row, col, value) {
  if (value === T_WALL || value === T_EMPTY) {
    const ent = entityAt(row, col);
    if (ent instanceof Hero) {
      hero = null;
      statusEl.textContent = '⚠ 角色被覆盖，已移除角色';
    } else if (ent instanceof Ball) {
      ball = null;
      statusEl.textContent = '⚠ 球被覆盖，已移除球';
    } else if (ent instanceof Crate) {
      crates.delete(K(row, col));
      crates.delete(K(row, col) + ':1');
    }
    const tile = grid[row][col];
    tile.hasWater = false;
    tile.hasWeb = false;
    tile.isPlate = false;
    tile.liftWall = null;
    tile.diagCorner = null;
    tile.hasDepression = false;
    const key = K(row, col);
    for (let i = wireLinks.length - 1; i >= 0; i--) {
      if (wireLinks[i].plate === key || wireLinks[i].wall === key) {
        wireLinks.splice(i, 1);
      }
    }
    if (editor.wireStart === key) editor.wireStart = null;
  }
  if (grid[row][col].base === value) return;
  grid[row][col].base = value;
  render();
}

// ====== placeDiagWall ======
export function placeDiagWall(row, col) {
  const tile = grid[row][col];
  if (tile.base !== T_WALL) {
    setTile(row, col, T_WALL);
  }
  const corners = tile.diagCorner;
  if (!corners) {
    tile.diagCorner = [editor.currentDiagCorner];
  } else {
    const idx = corners.indexOf(editor.currentDiagCorner);
    if (idx >= 0) {
      corners.splice(idx, 1);
      if (corners.length === 0) tile.diagCorner = null;
    } else {
      corners.push(editor.currentDiagCorner);
    }
  }
  render();
  const gaps = tile.diagCorner ? tile.diagCorner.map(c => DIAG_SYMBOLS[c]).join('') : '无';
  statusEl.textContent = `斜角墙 缺口: ${gaps}`;
}

// ====== placeCrate ======
export function placeCrate(row, col) {
  const tile = grid[row][col];
  if (tile.base === T_WALL && tile.liftWall === null) {
    statusEl.textContent = '⚠ 不能把箱子放在墙体上！';
    return;
  }
  const key = K(row, col);
  let crate;
  if (!crates.has(key)) {
    crate = new Crate(row, col, editor.currentCrateKey);
    crates.set(key, crate);
  } else if (!crates.has(key + ':1')) {
    crate = new Crate(row, col, editor.currentCrateKey);
    crates.set(key + ':1', crate);
  } else {
    statusEl.textContent = '⚠ 此处已有两个箱子！';
    return;
  }
  if (crate.crateKey === 'moth') {
    const under = entityUnder(row, col, crate);
    crate.height = under ? under.height + under.selfHeight : tileFootLevel(row, col);
  }
  const type = CRATES[editor.currentCrateKey];
  updateAllHeights();
  statusEl.textContent = `${type.emoji} ${type.name}已放置`;
  render();
}

// ====== placeWeb ======
export function placeWeb(row, col) {
  if (grid[row][col].base === T_WALL) {
    statusEl.textContent = '⚠ 不能把蜘蛛网放在墙体上！';
    return;
  }
  grid[row][col].hasWater = false;
  grid[row][col].hasWeb = true;
  render();
  statusEl.textContent = '🕸 蜘蛛网已放置';
}

// ====== placePlate ======
export function placePlate(row, col) {
  if (grid[row][col].base === T_WALL) {
    statusEl.textContent = '⚠ 不能把踏板放在墙体上！';
    return;
  }
  grid[row][col].isPlate = true;
  render();
  statusEl.textContent = '▫ 踏板已放置';
}

// ====== placeLiftWall ======
export function placeLiftWall(row, col) {
  const tile = grid[row][col];
  if (tile.base === T_WALL || tile.liftWall !== null) {
    statusEl.textContent = '⚠ 此处已有墙体或升降墙！';
    return;
  }
  tile.liftWall = editor.currentLiftType;
  if (editor.currentLiftType === 'down') {
    tile.base = T_WALL;
  }
  render();
  const typeLabel = editor.currentLiftType === 'up' ? '上升型(默认下降)' : '下降型(默认升起)';
  statusEl.textContent = `⇅ 升降墙已放置(${typeLabel})`;
}

// ====== placeDepression ======
export function placeDepression(row, col) {
  const tile = grid[row][col];
  if (tile.base === T_WALL) {
    statusEl.textContent = '⚠ 不能把洼地放在墙体上！';
    return;
  }
  if (tile.hasDepression) {
    statusEl.textContent = '⚠ 此处已有洼地！';
    return;
  }
  tile.hasDepression = true;
  tile.hasWater = false;
  render();
  statusEl.textContent = '\u{1F573}️ 洼地已放置（高度-1）';
}

// ====== eraseTop ======
export function eraseTop(row, col) {
  const key = K(row, col);
  const tile = grid[row][col];

  if (hero && hero.row === row && hero.col === col) {
    hero = null;
    statusEl.textContent = '\u{1F5D1} 角色已擦除';
    render();
    return;
  }
  if (ball && ball.row === row && ball.col === col) {
    ball = null;
    statusEl.textContent = '\u{1F5D1} 球已擦除';
    render();
    return;
  }
  const topCrate = crates.get(key + ':1');
  if (topCrate) {
    crates.delete(key + ':1');
    statusEl.textContent = '\u{1F5D1} 上层箱子已擦除';
    render();
    return;
  }
  const bottomCrate = crates.get(key);
  if (bottomCrate) {
    crates.delete(key);
    statusEl.textContent = '\u{1F5D1} 箱子已擦除';
    render();
    return;
  }
  if (tile.hasWeb) {
    tile.hasWeb = false;
    statusEl.textContent = '\u{1F5D1} 蜘蛛网已擦除';
    render();
    return;
  }
  if (tile.isPlate) {
    tile.isPlate = false;
    for (let i = wireLinks.length - 1; i >= 0; i--) {
      if (wireLinks[i].plate === key) wireLinks.splice(i, 1);
    }
    if (editor.wireStart === key) editor.wireStart = null;
    statusEl.textContent = '\u{1F5D1} 踏板已擦除';
    render();
    return;
  }
  if (tile.liftWall !== null) {
    tile.liftWall = null;
    tile.base = T_EMPTY;
    for (let i = wireLinks.length - 1; i >= 0; i--) {
      if (wireLinks[i].wall === key) wireLinks.splice(i, 1);
    }
    if (editor.wireStart === key) editor.wireStart = null;
    statusEl.textContent = '\u{1F5D1} 升降墙已擦除';
    render();
    return;
  }
  if (tile.base === T_WALL && tile.diagCorner && tile.diagCorner.length > 0) {
    tile.diagCorner = null;
    statusEl.textContent = '\u{1F5D1} 斜角缺口已擦除（保留墙体）';
    render();
    return;
  }
  if (tile.base === T_WALL) {
    tile.base = T_EMPTY;
    statusEl.textContent = '\u{1F5D1} 墙体已擦除';
    render();
    return;
  }
  if (tile.hasDepression) {
    tile.hasDepression = false;
    statusEl.textContent = '\u{1F5D1} 洼地已擦除';
    render();
    return;
  }
  if (tile.hasWater) {
    tile.hasWater = false;
    statusEl.textContent = '\u{1F5D1} 水渍已擦除';
    render();
    return;
  }
  statusEl.textContent = '该格已空，无可擦除';
}

> **注意：** `placeHero` 和 `placeBall` 调用了 `setMode()`——为避免循环依赖，`placeHero`/`placeBall`/`PLACE_ACTIONS` 定义在 ui.js 而非此文件。actions.js 只导出纯粹的放置/擦除函数。

- [ ] **Step 2: 验证**

```bash
wc -l js/editor/actions.js
```

Expected: ~220 行

---

### Task 8: 创建 renderer/tiles.js 和 renderer/actors.js

**Files:**
- Create: `js/renderer/tiles.js`
- Create: `js/renderer/actors.js`

**Interfaces:**
- tiles.js consumes: `CANVAS_SIZE, GRID_SIZE, TILE_SIZE` from `../engine/constants.js`; `grid` from `../engine/state.js`
- tiles.js produces: `drawEmptyTile, drawWallTile, drawDiagWallTile, drawWaterTile, drawWebTile, drawDepressionTile, drawPlateTile, drawLiftWallTile, drawGridLines`
- actors.js consumes: `TILE_SIZE` from `../engine/constants.js`; `entityUnder, tileFootLevel` from `../engine/physics.js`; `Crate` from `../engine/entities.js`
- actors.js produces: `drawHero, drawBall, drawCrateTile, drawSnowTile, drawMothTile`

- [ ] **Step 1: 创建 `js/renderer/tiles.js`**

从原 `js/renderer.js` 提取：
- 第 1-7 行：drawEmptyTile
- 第 9-37 行：drawWallTile
- 第 39-62 行：drawDiagWallTile
- 第 64-78 行：drawGridLines
- 第 342-358 行：drawPlateTile
- 第 360-416 行：drawLiftWallTile
- 第 452-493 行：drawWaterTile
- 第 495-521 行：drawWebTile
- 第 523-543 行：drawDepressionTile

```js
import { CANVAS_SIZE, GRID_SIZE, TILE_SIZE } from '../engine/constants.js';
import { grid } from '../engine/state.js';

export function drawEmptyTile(row, col) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  ctx.fillStyle = '#3a3a4e';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
}

export function drawWallTile(row, col) {
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

export function drawDiagWallTile(row, col, gaps) {
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

export function drawGridLines() {
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

export function drawPlateTile(row, col) {
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

export function drawLiftWallTile(row, col, raised) {
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

export function drawWaterTile(row, col) {
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

export function drawWebTile(row, col) {
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

export function drawDepressionTile(row, col) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const s = TILE_SIZE / 8;
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  const grad = ctx.createRadialGradient(x + TILE_SIZE/2, y + TILE_SIZE/2, s*0.5, x + TILE_SIZE/2, y + TILE_SIZE/2, s*3.5);
  grad.addColorStop(0, '#1a1a28');
  grad.addColorStop(0.6, '#252535');
  grad.addColorStop(1, '#3a3a4e');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + s, y + s, TILE_SIZE - s*2, TILE_SIZE - s*2);
}
```

- [ ] **Step 2: 创建 `js/renderer/actors.js`**

从原 `js/renderer.js` 提取：
- 第 81-101 行：drawHero
- 第 103-179 行：drawBall
- 第 181-229 行：drawCrateTile
- 第 231-274 行：drawSnowTile
- 第 276-340 行：drawMothTile

```js
import { TILE_SIZE } from '../engine/constants.js';
import { entityUnder, tileFootLevel } from '../engine/physics.js';
import { Crate } from '../engine/entities.js';

export function drawHero(ent) {
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

export function drawBall(ball) {
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

export function drawCrateTile(crate) {
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

export function drawSnowTile(row, col, inset = 1) {
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

export function drawMothTile(row, col, inset = 1, hover = 0) {
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
```

- [ ] **Step 3: 验证**

```bash
wc -l js/renderer/tiles.js js/renderer/actors.js
```

Expected: ~250 + ~260 = 510 行

---

### Task 9: 创建 renderer/render.js

**Files:**
- Create: `js/renderer/render.js`

**Interfaces:**
- Consumes: `CANVAS_SIZE, GRID_SIZE, TILE_SIZE, T_EMPTY, T_WALL` from `../engine/constants.js`; `grid, crates, ball, hero, wireLinks` from `../engine/state.js`; `entityPriority` from `../engine/physics.js`; `Hero, Ball, Crate` from `../engine/entities.js`; `editor, HIGHLIGHT_MODES, BLOCKED_AS_WALL_MODES` from `../editor/editor-state.js`; 所有 draw 函数 from `./tiles.js` 和 `./actors.js`
- Produces: `export function render`

- [ ] **Step 1: 创建 `js/renderer/render.js`**

从原 `js/renderer.js` 提取：
- 第 418-450 行：drawWires
- 第 545-581 行：drawRope
- 第 583-656 行：render

```js
import { CANVAS_SIZE, GRID_SIZE, TILE_SIZE, T_WALL } from '../engine/constants.js';
import { grid, crates, ball, hero, wireLinks } from '../engine/state.js';
import { entityPriority } from '../engine/physics.js';
import { Hero, Ball, Crate } from '../engine/entities.js';
import { editor, HIGHLIGHT_MODES, BLOCKED_AS_WALL_MODES } from '../editor/editor-state.js';
import { drawEmptyTile, drawWallTile, drawDiagWallTile, drawWaterTile, drawWebTile, drawDepressionTile, drawPlateTile, drawLiftWallTile, drawGridLines } from './tiles.js';
import { drawHero, drawBall, drawCrateTile } from './actors.js';

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

export function render() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = grid[r][c];
      if (tile.base !== T_WALL) {
        drawEmptyTile(r, c);
        if (tile.hasWater) {
          drawWaterTile(r, c);
        } else if (tile.hasDepression) {
          drawDepressionTile(r, c);
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
  allEntities.sort((a, b) => {
    if (a.height !== b.height) return a.height - b.height;
    return entityPriority(a) - entityPriority(b);
  });
  for (const ent of allEntities) {
    if (ent instanceof Hero)       drawHero(ent);
    else if (ent instanceof Ball)  drawBall(ent);
    else if (ent instanceof Crate) drawCrateTile(ent);
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
```

- [ ] **Step 2: 验证**

```bash
wc -l js/renderer/render.js
```

Expected: ~140 行

---

### Task 10: 创建 editor/ui.js（入口模块）

**Files:**
- Create: `js/editor/ui.js`

**Interfaces:**
- Consumes: 所有 engine 模块 + editor-state + actions + renderer/render
- Produces: 无 export（副作用模块：绑定事件、启动应用）
- 注意：`placeHero`, `placeBall`, `PLACE_ACTIONS` 在此文件中定义（因为它们调用 `setMode`，而 `setMode` 也在此文件中，避免循环依赖）

- [ ] **Step 1: 创建 `js/editor/ui.js`**

从原 `js/editor.js` 提取除 actions.js 和 editor-state.js 已覆盖之外的所有内容。

Content includes:
- DOM refs (btnWall, btnDiag, ...)
- lastErasedKey
- getCellFromEvent
- handleCanvasDown, handleCanvasMove, handleCanvasUp (with wire mode logic)
- Canvas event listeners
- setMode, updateCrateBtn, updateDiagBtn, updateLiftBtn
- Button click handlers (including mode cycling for crate/diag/liftwall)
- exportMap, clearMap
- Keyboard handler (KEY_DIR, KEY_MODE)
- placeHero, placeBall (defined here, not in actions.js)
- PLACE_ACTIONS (defined here, references actions.js exports + local placeHero/placeBall)
- Startup: render()

内容太多，这里给出 import 头 + 关键结构。完整实现时从原 `js/editor.js` 复制剩余代码，加上适当的 import/export 调整：

```js
import { CANVAS_SIZE, GRID_SIZE, TILE_SIZE, T_WALL, T_EMPTY, DIAG_SYMBOLS, DIAG_CORNERS } from '../engine/constants.js';
import { grid, hero, ball, crates, wireLinks, K, dist } from '../engine/state.js';
import { CRATES } from '../engine/entities.js';
import { Tile } from '../engine/Tile.js';
import { tryMoveHero } from '../engine/movement.js';
import { updateLiftWalls, meltSnow, moveMoths, updateAllHeights } from '../engine/physics.js';
import { editor, HOVER_MODES, HIGHLIGHT_MODES, BLOCKED_AS_WALL_MODES, DRAG_MODES, modeLabels } from './editor-state.js';
import * as actions from './actions.js';
import { render } from '../renderer/render.js';

// ====== DOM refs ======
const btnWall = document.getElementById('btn-wall');
const btnDiag = document.getElementById('btn-diag');
const btnErase = document.getElementById('btn-erase');
const btnHero = document.getElementById('btn-hero');
const btnBall = document.getElementById('btn-ball');
const btnCrate = document.getElementById('btn-crate');
const btnWeb = document.getElementById('btn-web');
const btnPlate = document.getElementById('btn-plate');
const btnLiftwall = document.getElementById('btn-liftwall');
const btnWire = document.getElementById('btn-wire');
const btnDepression = document.getElementById('btn-depression');
const btnPlay = document.getElementById('btn-play');
const btnExport = document.getElementById('btn-export');
const btnClear = document.getElementById('btn-clear');
const allBtns = [btnWall, btnDiag, btnErase, btnHero, btnBall, btnCrate, btnWeb, btnPlate, btnLiftwall, btnDepression, btnWire, btnPlay];

// ====== activeBtns（依赖 DOM，放在 ui.js 而非 editor-state.js） ======
const activeBtns = {
  'wall': btnWall, 'diag': btnDiag, 'erase': btnErase,
  'place_hero': btnHero, 'place_ball': btnBall, 'place_crate': btnCrate,
  'web': btnWeb, 'plate': btnPlate, 'liftwall': btnLiftwall,
  'depression': btnDepression, 'wire': btnWire, 'play': btnPlay
};

let lastErasedKey = null;

// ====== placeHero, placeBall（在 ui.js 中定义，因它们调用 setMode） ======
function placeHero(row, col) {
  const tile = grid[row][col];
  if (tile.base === T_WALL && tile.liftWall === null) {
    statusEl.textContent = '⚠ 不能把角色放在墙体上！';
    return;
  }
  hero = new (await import('../engine/entities.js')).Hero(row, col);
  // ... 这里有问题——Hero 类需要通过 import 获取。
  // 实际方案：Hero, Ball 从 entities.js import。
}
```

**发现循环依赖问题：** `placeHero` 需要 `new Hero(...)` 但 Hero 在 entities.js 中。同时 placeHero 调用 `setMode`（在 ui.js 中）。如果 placeHero 在 ui.js，那没问题——ui.js import entities.js 获取 Hero，setMode 在同文件内。

修正后的 `placeHero` 和 `placeBall`（在 ui.js 中）:

```js
import { Hero, Ball } from '../engine/entities.js';

function placeHero(row, col) {
  const tile = grid[row][col];
  if (tile.base === T_WALL && tile.liftWall === null) {
    statusEl.textContent = '⚠ 不能把角色放在墙体上！';
    return;
  }
  hero = new Hero(row, col);
  updateAllHeights();
  if (!ball) {
    setMode('place_ball');
    statusEl.textContent = '✅ 角色已放置！现在请放置球';
  } else {
    setMode('play');
    statusEl.textContent = '✅ 角色已放置！方向键/WASD 移动';
  }
  render();
}

function placeBall(row, col) {
  const tile = grid[row][col];
  if (tile.base === T_WALL && tile.liftWall === null) {
    statusEl.textContent = '⚠ 不能把球放在墙体上！';
    return;
  }
  ball = new Ball(row, col);
  updateAllHeights();
  setMode('play');
  statusEl.textContent = '✅ 球已放置！方向键/WASD 移动角色';
  render();
}

const PLACE_ACTIONS = {
  wall:        (r, c) => actions.setTile(r, c, T_WALL),
  diag:        (r, c) => actions.placeDiagWall(r, c),
  erase:       (r, c) => actions.eraseTop(r, c),
  place_hero:  (r, c) => placeHero(r, c),
  place_ball:  (r, c) => placeBall(r, c),
  place_crate: (r, c) => actions.placeCrate(r, c),
  web:         (r, c) => actions.placeWeb(r, c),
  plate:       (r, c) => actions.placePlate(r, c),
  liftwall:    (r, c) => actions.placeLiftWall(r, c),
  depression:  (r, c) => actions.placeDepression(r, c),
};
```

**完整 ui.js 结构：**
1. imports (15+ 行)
2. DOM refs + activeBtns + lastErasedKey (~25 行)
3. placeHero, placeBall, PLACE_ACTIONS (~40 行)
4. getCellFromEvent (~12 行)
5. handleCanvasDown, handleCanvasMove, handleCanvasUp + event listeners (~65 行)
6. setMode + updateXxxBtn (~55 行)
7. Button click handlers (~35 行)
8. exportMap (~50 行)
9. clearMap (~20 行)
10. KEY_DIR, KEY_MODE, keyboard handler (~35 行)
11. render() 启动调用 (1 行)

- [ ] **Step 2: 创建完整的 `js/editor/ui.js`**

从原 `js/editor.js` 提取所有剩余代码（排除已在 actions.js 和 editor-state.js 中的部分），加上上述 import 头和调整。

- [ ] **Step 3: 验证**

```bash
wc -l js/editor/ui.js
```

Expected: ~300 行

---

### Task 11: 更新 HTML 并删除旧文件

**Files:**
- Modify: `map-editor.html`
- Delete: `js/engine.js`
- Delete: `js/editor.js`
- Delete: `js/renderer.js`

- [ ] **Step 1: 更新 `map-editor.html` 的 `<script>` 标签**

将第 31-41 行替换为：

```html
  <!-- 共享 DOM 引用 -->
  <script>
    const canvas = document.getElementById('map');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');
  </script>
  <!-- ES 模块入口（通过 import 链自动加载全部依赖） -->
  <script type="module" src="js/editor/ui.js"></script>
```

- [ ] **Step 2: 删除旧文件**

```bash
rm js/engine.js js/editor.js js/renderer.js
```

- [ ] **Step 3: 确认文件结构**

```bash
find js -name '*.js' | sort
```

Expected:
```
js/editor/actions.js
js/editor/editor-state.js
js/editor/ui.js
js/engine/Tile.js
js/engine/constants.js
js/engine/entities.js
js/engine/movement.js
js/engine/physics.js
js/engine/state.js
js/renderer/actors.js
js/renderer/render.js
js/renderer/tiles.js
```

---

### Task 12: 测试并修复

**Files:**
- （潜在修改所有新文件）

- [ ] **Step 1: 在浏览器中打开 `map-editor.html`**

使用 Live Server 或直接打开文件：

```bash
# 任选其一
start map-editor.html
```

- [ ] **Step 2: 打开浏览器控制台，确认无 import 错误**

Expected: 无 `Failed to load module`、无 `is not exported`、无 `undefined` 错误。

- [ ] **Step 3: 手动测试每个功能**

- 画墙：[1] 模式，点击/拖拽画墙
- 斜角墙：[2] 模式，点击墙体添加缺口
- 擦除：[3] 模式，逐层擦除
- 蜘蛛网：[4] 模式
- 踏板 + 升降墙 + 引线：[5][6][-] 模式，连线
- 洼地：[7] 模式
- 放置角色 + 球 + 箱子：[8][9][0]
- 操控模式：方向键移动，升降墙响应，飞蛾趋光，雪块融化
- 导出 JSON + 清空地图

- [ ] **Step 4: 检查所有 console 警告/错误**

Expected: 零错误，零警告。

- [ ] **Step 5: 修复发现的问题**

如 `placeHero`、`setMode` 或其他函数有 import 问题，直接在对应文件中修正。

---

### Task 13: 提交

**Files:**
- （全部改动）

- [ ] **Step 1: 暂存并提交**

```bash
git add -A
git status
git diff --cached --stat
git commit -m "refactor: 拆分为 12 个 ES 模块文件，引入 import/export"

- engine/: constants, Tile, entities, state, movement, physics
- editor/: editor-state, actions, ui (入口)
- renderer/: tiles, actors, render
- HTML 改用 <script type=module>
- 零行为变更，纯结构重组"
```

- [ ] **Step 2: 确认 commit 干净**

```bash
git status
```

Expected: `nothing to commit, working tree clean`

---

## 验证清单

完成所有任务后确认：

- [ ] `find js -name '*.js' | wc -l` 输出 12
- [ ] 浏览器打开 `map-editor.html` 无 console 错误
- [ ] 所有编辑器功能正常（画墙/斜角/擦除/蜘蛛网/踏板/升降墙/洼地/引线/导出/清空）
- [ ] 操控模式正常（移动/推箱/球跟随/升降墙响应/飞蛾趋光/雪块融化）
- [ ] 旧文件已删除
- [ ] Commit 已提交到 `refactor/es-modules` 分支
