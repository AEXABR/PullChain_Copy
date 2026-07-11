# 移动逻辑重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 清理 keydown 移动处理中的冗余代码，提取 tryMoveHero 公共函数，snapshot/restore 职责归一到调用方。

**Architecture:** 单文件 `map-editor.html` 内重构。新增 `tryMoveHero(dr, dc)` → boolean 函数承担完整的 move-try-rollback 循环；keydown handler 简化为方向查询 + tryMoveHero + meltSnow + render；followBall 去除内部 crates 快照/回滚（调用方已负责）。

**Tech Stack:** 纯 JavaScript (ES6+)，无外部依赖。

## Global Constraints

- 游戏行为完全不变（推箱子、绳子跟随、斜角推、融雪）
- 不新增全局变量
- 保持现有命名风格（camelCase 函数、snake_case 常量）

---

### Task 1: 新增 `tryMoveHero(dr, dc)` 函数

**Files:**
- Modify: `map-editor.html` — 在 `meltSnow()` 函数之前插入新函数

**Interfaces:**
- Consumes: `getPushChain`, `pushChain`, `followBall`, `snapshotCrates`, `restoreCrates`, `hero`, `ball`, `grid`, `GRID_SIZE`, `T_WALL`
- Produces: `tryMoveHero(dr, dc) → boolean`

- [ ] **Step 1: 插入 tryMoveHero 函数**

在 `meltSnow()` 函数定义之前（第436行前），插入以下代码：

```javascript
    // 尝试移动主角：快照→推箱→移动→跟随→失败回滚。返回 true=成功
    function tryMoveHero(dr, dc) {
      const nr = hero.row + dr, nc = hero.col + dc;

      // 边界 / 墙检查
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return false;
      if (grid[nr][nc] === T_WALL) return false;

      // 链式推动扫描
      const chain = getPushChain(nr, nc, dr, dc);
      if (chain === null) return false;

      // 快照（回滚用）
      const savedCrates = snapshotCrates();
      const savedHero = { row: hero.row, col: hero.col };
      const savedBall = ball ? { row: ball.row, col: ball.col } : null;

      // 执行：推箱子 + 移动主角
      const prevRow = hero.row, prevCol = hero.col;
      pushChain(chain, dr, dc);
      hero.row = nr; hero.col = nc;

      // 绳子跟随
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

- [ ] **Step 2: 刷新浏览器，确认页面无 JS 错误**

打开 `map-editor.html`，检查浏览器 Console 无报错。新函数定义了但尚未被调用，不应影响现有功能。

- [ ] **Step 3: Commit**

```bash
git add map-editor.html && git commit -m "feat: 新增 tryMoveHero(dr, dc) 函数（尚未接入调用方）"
```

---

### Task 2: 重构 keydown handler 调用 tryMoveHero

**Files:**
- Modify: `map-editor.html` — keydown handler (第457-502行)

**Interfaces:**
- Consumes: `tryMoveHero` (from Task 1), `meltSnow`, `render`, `KEY_DIR`, `KEY_MODE`, `setMode`, `hero`, `ball`, `mode`, `dist`
- Produces: (none new — 修改现有 handler 行为)

- [ ] **Step 1: 替换 keydown 中 play 模式的移动逻辑**

找到 keydown handler 中 `if (mode === 'play' && hero)` 块（第461-501行），将整个 if 体替换为：

```javascript
      if (mode === 'play' && hero) {
        const dir = KEY_DIR[e.key];
        if (dir) {
          e.preventDefault();
          if (tryMoveHero(dir.dr, dir.dc)) {
            meltSnow();
            statusEl.textContent = `角色位置: (${hero.row}, ${hero.col})` +
              (ball ? `  球位置: (${ball.row}, ${ball.col}) [${ball.lightOn ? '💡开' : '🌑关'}]` : '') +
              (ball ? `  距离: ${dist(hero.row, hero.col, ball.row, ball.col)}` : '');
          }
          render();
        }
      }
```

具体操作：删除原第461-501行的 41 行代码，替换为上面 15 行。

- [ ] **Step 2: 验证编辑器模式仍正常**

浏览器中测试：
- 画墙、擦除、放角色、放球、放箱子 — 均正常
- 切换到操控模式，方向键移动角色 — 移动正常
- 球跟随 — 正常
- 推箱子 — 正常
- 开灯融雪 — 正常

- [ ] **Step 3: Commit**

```bash
git add map-editor.html && git commit -m "refactor: keydown handler 接入 tryMoveHero，从41行缩减到15行"
```

---

### Task 3: followBall 去冗余 + 提取 isValid 辅助

**Files:**
- Modify: `map-editor.html` — `followBall` 函数 (第372-434行)

**Interfaces:**
- Consumes: `getPushChain`, `pushChain`, `dist`, `isSolid`, `ball`, `hero`, `grid`, `GRID_SIZE`, `crates`
- Produces: `followBall(prevRow, prevCol) → boolean`（签名不变，行为不变）

- [ ] **Step 1: 修改 followBall 函数**

将 `followBall` 函数体（第372-434行）替换为：

```javascript
    function followBall(prevRow, prevCol) {
      if (!ball) return true;
      if (dist(hero.row, hero.col, ball.row, ball.col) <= 1) return true;

      const prevBallRow = ball.row, prevBallCol = ball.col;
      const dr = Math.sign(prevRow - ball.row);
      const dc = Math.sign(prevCol - ball.col);
      const candidates = [];
      const diagRow = ball.row + dr;
      const diagCol = ball.col + dc;

      let diagOk = dr === 0 || dc === 0;
      if (!diagOk) {
        const c1r = diagRow, c1c = ball.col;
        const c2r = ball.row, c2c = diagCol;
        const c1chain = getPushChain(c1r, c1c, dr, 0);
        const c2chain = getPushChain(c2r, c2c, 0, dc);
        const c1clear = grid[c1r] && (!isSolid(c1r, c1c) || c1chain !== null);
        const c2clear = grid[c2r] && (!isSolid(c2r, c2c) || c2chain !== null);
        if (c1clear && c2clear) {
          if (c1chain) pushChain(c1chain, dr, 0);
          if (c2chain) pushChain(c2chain, 0, dc);
          diagOk = true;
        }
      }
      if (diagOk) candidates.push({ row: diagRow, col: diagCol, pushDr: dr, pushDc: dc });
      if (dr !== 0 && dc !== 0) {
        candidates.push({ row: diagRow, col: ball.col, pushDr: dr, pushDc: 0 });
        candidates.push({ row: ball.row, col: diagCol, pushDr: 0,  pushDc: dc });
      }

      const isValid = (c) =>
        c.row >= 0 && c.row < GRID_SIZE && c.col >= 0 && c.col < GRID_SIZE &&
        dist(hero.row, hero.col, c.row, c.col) <= 1;

      // 第一轮：尝试推箱子移动
      for (const c of candidates) {
        if (!isValid(c)) continue;
        const chain = getPushChain(c.row, c.col, c.pushDr, c.pushDc);
        if (chain && chain.length > 0) {
          pushChain(chain, c.pushDr, c.pushDc);
          ball.row = c.row; ball.col = c.col;
          break;
        }
      }

      // 第二轮：推不动则尝试纯移动（不推箱子）
      if (dist(hero.row, hero.col, ball.row, ball.col) > 1) {
        for (const c of candidates) {
          if (!isValid(c)) continue;
          if (!isSolid(c.row, c.col)) {
            ball.row = c.row; ball.col = c.col;
            break;
          }
        }
      }

      // 距离守卫：仍然太远则恢复球位置
      if (dist(hero.row, hero.col, ball.row, ball.col) > 1) {
        ball.row = prevBallRow; ball.col = prevBallCol;
        return false;
      }
      return true;
    }
```

**相比原版的具体变化：**
- 删除 `const savedCrates = snapshotCrates();`（原376行）
- 删除 `restoreCrates(savedCrates);`（原430行）
- 删除 `let ballMoved = false;` 及相关赋值（原404, 413, 423, 426行）
- 新增 `const isValid = (c) => ...` 辅助函数
- 两轮遍历中 `if (c.row < 0 || ...) continue; if (dist(...) > 1) continue;` 替换为 `if (!isValid(c)) continue;`
- 第二轮守卫从 `if (!ballMoved)` 改为 `if (dist(hero.row, hero.col, ball.row, ball.col) > 1)`

- [ ] **Step 2: 完整功能验证**

浏览器中测试所有场景：

**基础移动：**
- [ ] 方向键移动角色（上下左右，WASD）
- [ ] 球在1格内不移动
- [ ] 球在2格外跟随移动

**推箱子：**
- [ ] 单箱子直线推
- [ ] 链式推动（多个箱子排成线）
- [ ] 箱子被墙挡住无法推动

**斜角场景：**
- [ ] 球斜角推箱子（两个方向各一个箱子）
- [ ] 球斜角时单轴移动候选（水平/垂直各一个候选）

**开灯融雪：**
- [ ] 放置雪块箱子
- [ ] 球开灯时，相邻雪块融化为水
- [ ] 关灯时不融化

**回滚场景：**
- [ ] 推动后球无法跟随（绳子太远），角色和箱子回滚，球开关灯
- [ ] 推箱子链被墙挡住，角色不动

- [ ] **Step 3: Commit**

```bash
git add map-editor.html && git commit -m "refactor: followBall去除冗余快照，提取isValid辅助函数"
```

---

### Task 4: 清理 — 删除设计文档

**Files:**
- Delete: `docs/superpowers/specs/2026-07-11-refactor-move-logic-design.md`
- Delete: `docs/superpowers/plans/2026-07-11-refactor-move-logic.md`（本文件，实现完成后）
- Delete: `docs/superpowers/` 目录（如果为空）

- [ ] **Step 1: 删除临时文档**

```bash
rm docs/superpowers/specs/2026-07-11-refactor-move-logic-design.md
rm docs/superpowers/plans/2026-07-11-refactor-move-logic.md
rmdir docs/superpowers/specs docs/superpowers/plans docs/superpowers docs 2>/dev/null; true
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "chore: 删除重构设计/计划文档"
```
