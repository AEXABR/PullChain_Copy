# Emergent Engine 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 engine 中 6 类 if-else 特判逐类消除，通过多态、策略对象、事件驱动让行为从对象自身涌现。

**Architecture:** 渐进式重构，6 个独立任务。每步改 2-4 个文件，完成后浏览器验证。不改外部行为，只改内部实现。保留 `tile.liftWall` 字符串用于 JSON 序列化，通过 `getWallBehavior()` 获取策略对象。

**Tech Stack:** 纯 JavaScript（无构建工具），浏览器直接打开 `map-editor.html` 验证。

## Global Constraints

- 每步一个 commit，可独立回滚
- 不改外部行为，手动测试：移动、推箱子、球跟随、飞蛾飞行、升降墙、融雪
- `tile.liftWall` 保持字符串以兼容 JSON 序列化
- 不改 renderer 层和 editor 层的 UI 逻辑（仅涉及其调用 engine 的方式）

---

### Task 1: 实体存储分支 — Entity.moveTo 多态

**Files:**
- Modify: `js/engine/entities.js` — 加 `Entity.moveTo` 和 `Crate.moveTo`
- Modify: `js/engine/physics.js:40-61` — 简化 `moveEntityInMap`

**Interfaces:**
- Produces: `Entity.prototype.moveTo(r, c)` — 基类默认改 row/col；`Crate.prototype.moveTo(r, c)` — 覆盖，操作 crates Map

- [ ] **Step 1: 给 Entity 基类加 moveTo 方法**

编辑 `js/engine/entities.js`，在 `Entity` 类末尾加 `moveTo`：

```js
// 在 Entity 类的 has(trait) 方法之后，类的闭合 } 之前添加：
  moveTo(r, c) {
    this.row = r; this.col = c;
  }
```

- [ ] **Step 2: 给 Crate 类加 moveTo 覆盖**

编辑 `js/engine/entities.js`，在 `Crate` 类 constructor 之后加 `moveTo`：

```js
// 在 Crate 类的 constructor 闭合 } 之后，类的闭合 } 之前添加：
  moveTo(r, c) {
    // 从旧位置移除
    const oldKey = K(this.row, this.col);
    const stackedKey = oldKey + ':1';
    if (crates.get(oldKey) === this) crates.delete(oldKey);
    else if (crates.get(stackedKey) === this) crates.delete(stackedKey);

    this.row = r; this.col = c;

    // 放入新位置，处理堆叠
    const newKey = K(r, c);
    const existing = crates.get(newKey);
    if (!existing) {
      crates.set(newKey, this);
    } else if (this.height < existing.height) {
      crates.delete(newKey);
      crates.set(newKey, this);
      crates.set(newKey + ':1', existing);
    } else {
      crates.set(newKey + ':1', this);
    }
  }
```

- [ ] **Step 3: 简化 moveEntityInMap**

编辑 `js/engine/physics.js`，将整个 `moveEntityInMap` 函数替换为：

```js
function moveEntityInMap(ent, newRow, newCol) {
  ent.moveTo(newRow, newCol);
}
```

- [ ] **Step 4: 浏览器验证**

打开 `map-editor.html`，测试：
1. 放角色、放球 → 方向键移动 → 球跟随正常
2. 放箱子 → 推箱子 → 箱子移动正常
3. 堆叠两个箱子 → 推底层箱子 → 两个都移动
4. 放飞蛾 → 光球点亮 → 飞蛾飞向光源
5. 放升降墙+踏板 → 踩踏板 → 墙升降正常

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: Entity.moveTo 多态替代 moveEntityInMap 中的 kind 分支"
```

---

### Task 2: 豁免内化 — wantsGroundSnap + ceilingHeight

**Files:**
- Modify: `js/engine/entities.js` — 给 Entity 加 `wantsGroundSnap()`
- Modify: `js/engine/Tile.js` — 给 Tile 加 `ceilingHeight()`
- Modify: `js/engine/physics.js:27-37,87-99,146-147` — 简化三处豁免判断

**Interfaces:**
- Consumes: `Entity.moveTo` (Task 1)
- Produces: `Entity.prototype.wantsGroundSnap()` → bool; `Tile.prototype.ceilingHeight()` → number

- [ ] **Step 1: Entity 加 wantsGroundSnap**

编辑 `js/engine/entities.js`，在 Entity 类 `moveTo` 之后加：

```js
  // 飞行实体不自动落地（由 syncFlyingHeight 单独处理）
  wantsGroundSnap() {
    return !this.has(TRAITS.FLYING);
  }
```

- [ ] **Step 2: Tile 加 ceilingHeight**

编辑 `js/engine/Tile.js`，在 `effectsOn` 方法之后加：

```js
  // 天窗格无高度上限，普通格为 CEILING(2)
  ceilingHeight() {
    return this.hasSkylight ? Infinity : CEILING;
  }
```

- [ ] **Step 3: 简化 updateEntityHeight 中的 FLYING 豁免**

编辑 `js/engine/physics.js`，替换 `updateEntityHeight` 函数体中的特判：

```js
// 替换：
//   if (ent.has(TRAITS.FLYING)) return;
// 为：
//   if (!ent.wantsGroundSnap()) return;
```

完整替换后：

```js
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
```

- [ ] **Step 4: 简化 updateLiftWalls 中的天花板豁免**

编辑 `js/engine/physics.js`，在 `updateLiftWalls` 中替换：

```js
// 替换：
//   const wouldExceedCeiling = isRising && !tile.hasSkylight && (topHeightAt(wr, wc) + 1) > CEILING;
// 为：
//   const wouldExceedCeiling = isRising && (topHeightAt(wr, wc) + 1) > tile.ceilingHeight();
```

- [ ] **Step 5: 浏览器验证**

打开 `map-editor.html`，测试：
1. 放飞蛾 → 确认飞蛾不落地（悬浮）
2. 放天窗 → 放升降墙+箱子 → 确认天窗格升降墙不受天花板限制
3. 普通格升降墙+箱子 → 确认天花板仍生效（超限阻止升起）
4. 其他机制：角色移动、推箱子、球跟随均正常

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "refactor: wantsGroundSnap/ceilingHeight 内化豁免逻辑，消除 FLYING/hasSkylight 特判"
```

---

### Task 3: 升降墙策略对象 — WallBehaviors

**Files:**
- Modify: `js/engine/physics.js:112-155` — 加 `WallBehaviors`，重写 `updateLiftWalls`
- Modify: `js/engine/Tile.js` — 加 `getWallBehavior()`

**Interfaces:**
- Consumes: `Tile.ceilingHeight()` (Task 2)
- Produces: `WallBehaviors` 对象（含 up/down/auto），`Tile.prototype.getWallBehavior()`

- [ ] **Step 1: 在 physics.js 顶部定义 WallBehaviors**

编辑 `js/engine/physics.js`，在 `topHeightAt` 函数之前插入：

```js
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
```

- [ ] **Step 2: Tile 加 getWallBehavior**

编辑 `js/engine/Tile.js`，在 `ceilingHeight` 之后加：

```js
  getWallBehavior() {
    return this.liftWall ? WallBehaviors[this.liftWall] : null;
  }
```

- [ ] **Step 3: 重写 updateLiftWalls**

编辑 `js/engine/physics.js`，将整个 `updateLiftWalls` 替换为：

```js
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

    tile.base = canActivate
      ? (behavior.wallWhenActivated ? T_WALL : T_EMPTY)
      : (behavior.wallWhenActivated ? T_EMPTY : T_WALL);
  }
}
```

- [ ] **Step 4: 浏览器验证**

打开 `map-editor.html`，测试全部三种升降墙：
1. **上升型 (up)**：默认空地，踏板踩下→升起，踏板松开→降下
2. **下降型 (down)**：默认墙体，踏板踩下→降下，踏板松开→升起
3. **自动型 (auto)**：默认空地，实体站上去→升起，离开→降下
4. 天花板：普通格堆 2 高度+升降墙 → 阻止升起；天窗格 → 无限制
5. 引线连接踏板到升降墙：功能正常

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: WallBehaviors 策略对象替代 liftWall 字符串 switch"
```

---

### Task 4: 事件驱动主循环 — 消除硬编码调用序列

**Files:**
- Modify: `js/engine/events.js` — 在文件末尾加行为注册
- Modify: `js/editor/ui.js:229-243` — 简化 keydown handler

**Interfaces:**
- Consumes: `WallBehaviors` (Task 3), events 系统 `on/emit`
- Produces: 所有 post-move 行为通过事件注册，主循环只 emit

- [ ] **Step 1: 在 events.js 注册 post-move 行为**

编辑 `js/engine/events.js`，在现有 `turnEnd` 融雪 handler 之后追加：

```js
// --- 注册回合机制（声明式，替代主循环中的硬编码调用序列） ---

// 升降墙更新
on('turnEnd', updateLiftWalls);

// 高度同步
on('turnEnd', updateAllHeights);

// 飞蛾飞行（内部会触发升降墙+高度同步）
on('turnEnd', processFliers);

// 飞蛾飞行后再次同步高度
on('turnEnd', updateAllHeights);
```

注意：这里会注册两个 `updateAllHeights` handler（一个在 fliers 前，一个在 fliers 后）。这等价于原有行为，但会多执行一次。保持和原代码一致：原有也是 `updateAllHeights → processFliers → updateAllHeights`。不过仔细看，`processFliers` 内部已经调用了 `updateLiftWalls` 和 `updateAllHeights`（physics.js:208-209），所以原有的外部 `updateLiftWalls` + `updateAllHeights` 在 `processFliers` 之前是多余的？不不，`processFliers` 内部的更新只在"有飞蛾移动"时才触发。外部的更新是每回合都做的。所以保持两个 `updateAllHeights` 注册。

等一下——原有主循环：
```
emit('turnEnd') → melts now
updateLiftWalls()
updateAllHeights()    ← 第一次
processFliers()       ← 内部可能调 updateLiftWalls + updateAllHeights
updateAllHeights()    ← 第二次
```

如果用事件注册：
```
emit('turnEnd') → meltSnow (已有)
               → updateLiftWalls
               → updateAllHeights (第一次)
               → processFliers
               → updateAllHeights (第二次)
```

顺序正确。但 processFliers 内部还有 `updateLiftWalls()` 和 `updateAllHeights()` 调用（physics.js:208-209），那些是飞蛾移动一步后立即刷新。这是合理的。

- [ ] **Step 2: 简化 ui.js 主循环**

编辑 `js/editor/ui.js`，将第 229-243 行的 keydown handler 中的主循环替换。

找到这段代码：
```js
  if (editor.mode === 'play' && hero) {
    const dir = KEY_DIR[e.key];
    if (dir) {
      e.preventDefault();
      const moved = tryMoveHero(dir.dr, dir.dc);
      emit('turnEnd', {});
      updateLiftWalls();
      updateAllHeights();
      processFliers();
      updateAllHeights();
      statusEl.textContent = `角色位置: (${hero.row}, ${hero.col})` +
        (ball ? `  球位置: (${ball.row}, ${ball.col}) [${ball.lightOn ? '💡开' : '🌑关'}]` : '') +
        (ball ? `  距离: ${dist(hero.row, hero.col, ball.row, ball.col)}` : '');
      render();
    }
  }
```

替换为：
```js
  if (editor.mode === 'play' && hero) {
    const dir = KEY_DIR[e.key];
    if (dir) {
      e.preventDefault();
      tryMoveHero(dir.dr, dir.dc);
      emit('turnEnd', {});
      statusEl.textContent = `角色位置: (${hero.row}, ${hero.col})` +
        (ball ? `  球位置: (${ball.row}, ${ball.col}) [${ball.lightOn ? '💡开' : '🌑关'}]` : '') +
        (ball ? `  距离: ${dist(hero.row, hero.col, ball.row, ball.col)}` : '');
      render();
    }
  }
```

- [ ] **Step 3: 浏览器验证**

打开 `map-editor.html`，测试完整游戏回合：
1. 放角色球 → 移动 → 球跟随正常（followBall 仍在 tryMoveHero 内部）
2. 放踏板+升降墙 → 踩踏板 → 墙升起（turnEnd handler 触发 updateLiftWalls）
3. 放雪块 → 光球靠近 → 回合结束融化（turnEnd handler 触发 meltSnow）
4. 放飞蛾 → 光球点亮 → 飞蛾飞行（turnEnd handler 触发 processFliers）
5. 确认回合后高度正确同步

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "refactor: 事件驱动主循环，消除硬编码 updateLiftWalls/updateAllHeights/processFliers 调用序列"
```

---

### Task 5: Null 检查消除 — 泛化 followBall + processFliers 守卫

**Files:**
- Modify: `js/engine/movement.js:41-119` — `followBall` 改为遍历 leashed 实体
- Modify: `js/engine/movement.js:121-225` — `tryMoveHero` 中用泛化调用替代 `followBall`

**Interfaces:**
- Consumes: 事件系统 (Task 4), allEntities() iterator, TRAITS.LEASHED
- Produces: `followLeashed(prevRow, prevCol)` 泛化函数，替代 `followBall`

- [ ] **Step 1: 将 followBall 泛化为 followLeashed**

编辑 `js/engine/movement.js`，在 `followBall` 函数之前（或替换整个函数），改为遍历所有带有 `LEASHED` trait 的实体：

替换整个 `followBall` 函数（第 41-119 行）为：

```js
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
```

- [ ] **Step 2: 在 tryMoveHero 中将 followBall 替换为 followLeashed**

编辑 `js/engine/movement.js`，在 `tryMoveHero` 中将所有 `followBall(prevRow, prevCol)` 替换为 `followLeashed(prevRow, prevCol)`（共 4 处）。

同时将所有 `ball && ball.has(TRAITS.TOGGLE_ON_LEASH_BREAK)` 替换为对任意 LEASHED 实体的泛化处理。在每个回退块中：

```js
// 替换：
//   if (ball && ball.has(TRAITS.TOGGLE_ON_LEASH_BREAK)) ball.toggle();
// 为：
//   for (const ent of allEntities()) {
//     if (ent.has(TRAITS.LEASHED) && ent.has(TRAITS.TOGGLE_ON_LEASH_BREAK)) ent.toggle();
//   }
```

- [ ] **Step 3: 浏览器验证**

打开 `map-editor.html`，测试：
1. 只有角色没有球 → 移动正常（无 LEASHED 实体，循环空转）
2. 角色+球 → 球跟随正常，拉扯、绕障碍均正常
3. 球被蜘蛛网定住 → hero 无法移动（绳子断裂逻辑）
4. 绳子断裂 → 球 toggle（灯开关）正常

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "refactor: followLeashed 泛化替代 followBall，消除 if(!ball) null 检查"
```

---

### Task 6: 多策略回退 — 策略链模式

**Files:**
- Modify: `js/engine/movement.js:121-225` — `tryMoveHero` 改为策略链
- Modify: `js/engine/movement.js` — `followOneLeashed` 第二遍遍历改为策略链

**Interfaces:**
- Consumes: `followLeashed` (Task 5), `getPushChain`, `pushChain`
- Produces: 策略链辅助函数，`tryMoveHero` 和 `followOneLeashed` 内部使用

- [ ] **Step 1: 提取 tryMoveHero 中的推动策略**

编辑 `js/engine/movement.js`，将 `tryMoveHero` 函数替换为策略链版本。

找到从第 192 行 `const chain = getPushChain(nr, nc, dr, dc, hero.height);` 到第 224 行的部分，替换为策略链：

```js
  // 策略链：依次尝试不同高度的推动
  const pushStrategies = [hero.height];
  // 骑乘高度：如果主角上方有骑乘实体，也尝试用骑乘者的高度
  const heroTop = hero.height + hero.selfHeight;
  const maxHeight = topHeightAt(hero.row, hero.col, hero);
  for (let h = heroTop; h <= maxHeight; h++) {
    pushStrategies.push(h);
  }

  let bestChain = null;
  let bestDr = dr, bestDc = dc;
  for (const pushH of pushStrategies) {
    const chain = getPushChain(nr, nc, dr, dc, pushH);
    if (chain !== null) {
      bestChain = chain;
      break;
    }
  }

  if (bestChain === null) return false;

  const savedCrates = snapshotCrates();
  const savedHero = { row: hero.row, col: hero.col };
  const savedBall = ball ? { row: ball.row, col: ball.col } : null;

  const prevRow = hero.row, prevCol = hero.col;
  pushChain(bestChain, dr, dc);
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
```

注意：原代码在策略回退前还有"可通行的墙体"（第 146-156 行）和"双层箱子只推上层"（第 158-189 行）两个特判路径。这两个是独立的游戏机制分支（不是策略回退），保留在策略链之前。策略链只替代原来的"单一高度推动 → 骑乘高度回退"（原第 192-206 行）。

- [ ] **Step 2: 泛化 followOneLeashed 中的回退路径**

编辑 `js/engine/movement.js`，在 `followOneLeashed` 函数中，将第二遍"不推只移"的 candidates 遍历提取为独立策略。

当前第二遍（第 98-112 行等价逻辑）是在 pushChain 失败后的回退。这已经是一个策略链的雏形——不需要大改，只需把两个策略表达清楚。

在 `followOneLeashed` 的 candidates 循环之前定义策略函数：

```js
  // 策略 1: 尝试推动路径
  const tryPushPath = () => {
    for (const c of candidates) {
      if (!isValid(c)) continue;
      const chain = getPushChain(c.row, c.col, c.pushDr, c.pushDc, leashedEnt.height);
      if (chain === null) continue;
      // ... (现有推动逻辑)
      return true;
    }
    return false;
  };

  // 策略 2: 不推只移
  const tryStepOnly = () => {
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
        return true;
      }
    }
    return false;
  };

  if (tryPushPath()) return true;
  if (tryStepOnly()) return true;
```

等等——这个改动比较大，而且目前的"两遍遍历"其实已经隐含了策略链结构。与其重写为显式的策略函数，不如保持现有逻辑但加注释说明。

考虑到"最复杂，留到最后"的设计意图和第 6 步的风险，我建议这一步做最小改动：只在 `tryMoveHero` 中用策略链替换骑乘高度回退，`followOneLeashed` 保持现有两遍遍历但加注释标注策略边界。

- [ ] **Step 3: 最终浏览器验证**

打开 `map-editor.html`，完整回归测试：
1. 角色移动、推箱子（单层/双层）、球跟随、障碍绕行
2. 飞蛾趋光飞行、升降墙三种类型、踏板引线
3. 雪块融化、蜘蛛网定身
4. 堆叠实体推拉、天花板机制
5. 所有编辑器操作：放置/擦除/导出

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "refactor: pushStrategies 策略链替代骑乘高度回退特判"
```

---

## 完成检查清单

全部 6 步完成后，验证以下特判已消除：

- [x] `if (ent.kind === 'crate')` — 被 `ent.moveTo()` 多态替代
- [x] `if (ent.has(TRAITS.FLYING)) return` — 被 `ent.wantsGroundSnap()` 替代
- [x] `!tile.hasSkylight &&` — 被 `tile.ceilingHeight()` 替代
- [x] `if (tile.liftWall === 'auto')` / `=== 'down'` — 被 `WallBehaviors` 策略对象替代
- [x] `updateLiftWalls(); updateAllHeights(); processFliers(); updateAllHeights();` — 被事件注册替代
- [x] `if (!ball) return true` — 被 `followLeashed` 泛化迭代替代
- [x] `if (chain.length === 0)` 的 for 回退 — 被策略链替代

保留不变的游戏规则判断：
- `tile.isSolidAt(height)` — 墙的定义
- `height < targetFoot` — 高差阻挡
- `dist(hero, ball) <= 1` — 绳子约束
- `effectsOn(ent).rooted` — 蜘蛛网定身
- `hasLineOfSight` — 视线遮挡
