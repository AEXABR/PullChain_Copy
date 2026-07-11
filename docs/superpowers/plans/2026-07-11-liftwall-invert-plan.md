# 升降墙新增「下降型」实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有上升型升降墙基础上新增下降型（默认升起真墙，踏板全踩下后降为可通行），同按钮 [0] 循环切换类型。

**Architecture:** `liftWalls` 从 `Set` 改为 `Map` 存储每格类型（`'up'`|`'down'`）。`updateLiftWalls()` 按类型分支处理升降逻辑，`drawLiftWallTile()` 按类型选色（up=蓝, down=红）。其余引线/踏板系统不变。

**Tech Stack:** 单文件 `map-editor.html`，纯 JS + Canvas

## Global Constraints

- 仅修改 `map-editor.html` 一个文件
- 'up' 型升起态 = 蓝色墙 `#5566AA`，'down' 型升起态 = 红色墙 `#665555`
- 下降态统一为半高虚线
- [0] 按钮循环切换 `'up'` → `'down'` → `'up'`

---

### Task 1: 数据模型 — Set→Map + currentLiftType

**Files:**
- Modify: `map-editor.html:202`

**Interfaces:**
- Produces: `liftWalls: Map<string, 'up'|'down'>`, `currentLiftType: 'up'|'down'`

- [ ] **Step 1: 改 Set 为 Map，新增 currentLiftType**

```js
// 旧 (line 202):
const liftWalls = new Set();  // 升降墙位置 "row,col"

// 新:
const liftWalls = new Map();  // 升降墙位置 "row,col" → 'up'|'down'
let currentLiftType = 'up';   // 当前放置类型
```

- [ ] **Step 2: 刷新页面确认无报错**

打开 `map-editor.html`，F12 控制台确认无 JS 错误。

- [ ] **Step 3: Commit**

```bash
git add map-editor.html && git commit -m "refactor: liftWalls Set→Map，新增currentLiftType"
```

---

### Task 2: setTile / clearMap / 悬停适配 Map API

**Files:**
- Modify: `map-editor.html:246, 455, 1059, 1241-1247, 1263-1271`

**Interfaces:**
- Consumes: `liftWalls: Map` (from Task 1)

- [ ] **Step 1: setTile 中 liftWalls.delete 不变（Map 也有 delete）**

Line 246 `liftWalls.delete(K(row, col))` — Map 和 Set 的 delete 方法签名相同，无需改动。

- [ ] **Step 2: clearMap 中 liftWalls.clear() 不变**

Line 455 `liftWalls.clear()` — Map 也有 clear()，无需改动。

- [ ] **Step 3: 引线模式中 liftWalls.has(key) 不变**

Line 277 `liftWalls.has(key)` — Map 也有 has，无需改动。

- [ ] **Step 4: 悬停高亮中 liftWalls.has 不变**

Line 1267-1271 中 `!liftWalls.has(K(row, col))` — Map 也有 has，无需改动。

- [ ] **Step 5: 确认所有 Set→Map 兼容点无误**

所有使用 `.has()`, `.delete()`, `.clear()` 的地方与 Map API 完全兼容。后续任务中 `.add()` → `.set(key, value)` 和 `[...liftWalls]` → `Object.fromEntries(liftWalls)` 将在对应任务中修改。

- [ ] **Step 6: Commit**

```bash
git add map-editor.html && git commit -m "chore: 确认liftWalls Set→Map API兼容性"
```

---

### Task 3: placeLiftWall — 按类型写入 Map + down 型初始设墙

**Files:**
- Modify: `map-editor.html:1054-1062`

**Interfaces:**
- Consumes: `liftWalls: Map`, `currentLiftType` (from Task 1)

- [ ] **Step 1: 替换 placeLiftWall 函数**

```js
// 旧 (lines 1054-1062):
function placeLiftWall(row, col) {
  if (grid[row][col] === T_WALL) {
    statusEl.textContent = '⚠ 此处已有墙体！';
    return;
  }
  liftWalls.add(K(row, col));
  render();
  statusEl.textContent = '⇅ 升降墙已放置(下降态)';
}

// 新:
function placeLiftWall(row, col) {
  const key = K(row, col);
  if (grid[row][col] === T_WALL || liftWalls.has(key)) {
    statusEl.textContent = '⚠ 此处已有墙体或升降墙！';
    return;
  }
  liftWalls.set(key, currentLiftType);
  if (currentLiftType === 'down') {
    grid[row][col] = T_WALL;
    const ent = entityAt(row, col);
    if (ent) ent.height++;
  }
  render();
  const typeLabel = currentLiftType === 'up' ? '上升型(默认下降)' : '下降型(默认升起)';
  statusEl.textContent = `⇅ 升降墙已放置(${typeLabel})`;
}
```

- [ ] **Step 2: 测试放置**

刷新页面：
- 选上升型 [0]，点空地 → 放置成功，格子为空（下降态），状态栏显示"上升型"
- 按 [0] 切换到下降型，点另一空地 → 放置成功，格子显示蓝色墙（升起态），状态栏显示"下降型"
- 在已有升降墙格子上再点 → 提示"此处已有墙体或升降墙"

- [ ] **Step 3: Commit**

```bash
git add map-editor.html && git commit -m "feat: placeLiftWall按类型写入Map，down型初始设墙"
```

---

### Task 4: 工具栏按钮 — 循环切换 up/down

**Files:**
- Modify: `map-editor.html:355, 384-404`

**Interfaces:**
- Consumes: `currentLiftType` (from Task 1)

- [ ] **Step 1: 修改 modeLabels 中 liftwall 条目动态显示类型**

```js
// 旧 (line 355):
'plate':       '模式: 踏板 — 点击空地放置踏板',
'liftwall':    '模式: 升降墙 — 点击空地放置升降墙',
'wire':        '模式: 引线 — 点击踏板然后点击升降墙连线',

// 新:
'plate':       '模式: 踏板 — 点击空地放置踏板',
'liftwall':    `模式: 升降墙(${currentLiftType === 'up' ? '↑上升型' : '↓下降型'}) — 点击空地放置`,
'wire':        '模式: 引线 — 点击踏板然后点击升降墙连线',
```

注意：`modeLabels` 是 `setMode()` 内的局部对象，每次调用 `setMode` 时重新求值，所以模板字符串会读取最新的 `currentLiftType`。

- [ ] **Step 2: 新增 updateLiftBtn 函数 + 按钮循环切换逻辑**

在 `updateDiagBtn()` 下面新增：

```js
function updateLiftBtn() {
  btnLiftwall.textContent = `${currentLiftType === 'up' ? '⇅' : '⇅'} 升墙(↑) [0]`;
}
```

等等，两个类型需要不同文字。改为：

```js
function updateLiftBtn() {
  btnLiftwall.textContent = currentLiftType === 'up' ? '⇅ 升墙(↑) [0]' : '⇅ 降墙(↓) [0]';
}
```

- [ ] **Step 3: 在按钮点击处理器中新增 liftwall 循环逻辑**

在 `document.querySelectorAll('#toolbar button[data-mode]')` 的事件监听器中，在 `if (b.dataset.mode === 'diag' ...)` 块之后、`setMode(b.dataset.mode)` 之前插入：

```js
if (b.dataset.mode === 'liftwall' && mode === 'liftwall') {
  // 已在升降墙模式则循环切换类型
  currentLiftType = currentLiftType === 'up' ? 'down' : 'up';
  updateLiftBtn();
  statusEl.textContent = `模式: 升降墙(${currentLiftType === 'up' ? '↑上升型' : '↓下降型'}) — 点击空地放置`;
  return;
}
```

- [ ] **Step 4: 在 setMode 中调用 updateLiftBtn**

在 `setMode` 函数中，紧接 `if (newMode === 'wire') wireStart = null;` 之后新增：

```js
if (newMode === 'liftwall') updateLiftBtn();
```

- [ ] **Step 5: 测试按钮循环**

刷新页面：
- 点 [0] 按钮 → 激活升降墙模式，按钮显示"升墙(↑)"
- 再点 [0] → 切换到"降墙(↓)"
- 再点 [0] → 切回"升墙(↑)"

- [ ] **Step 6: Commit**

```bash
git add map-editor.html && git commit -m "feat: 工具栏[0]按钮循环切换升降墙up/down类型"
```

---

### Task 5: updateLiftWalls — 按类型分支升降逻辑

**Files:**
- Modify: `map-editor.html:591-623`

**Interfaces:**
- Consumes: `liftWalls: Map` (from Task 1)

- [ ] **Step 1: 替换 updateLiftWalls 函数**

```js
// 旧 (lines 591-623):
function updateLiftWalls() {
  // 为每个升降墙收集其连接的所有踏板
  const wallPlates = new Map(); // wallKey → Set of plateKeys
  for (const wkey of liftWalls) {
    wallPlates.set(wkey, new Set());
  }
  ...

// 新:
function updateLiftWalls() {
  // 为每个升降墙收集其连接的所有踏板
  const wallPlates = new Map(); // wallKey → Set of plateKeys
  for (const wkey of liftWalls.keys()) {
    wallPlates.set(wkey, new Set());
  }
  for (const link of wireLinks) {
    if (wallPlates.has(link.wall)) {
      wallPlates.get(link.wall).add(link.plate);
    }
  }
  // 判断每个墙是否应升起（所有连接的踏板都被踩下，且至少有1个连接）
  for (const [wkey, plates] of wallPlates) {
    const [wr, wc] = wkey.split(',').map(Number);
    const allPressed = plates.size > 0 && [...plates].every(pk => {
      const [pr, pc] = pk.split(',').map(Number);
      return entityAt(pr, pc) !== null;
    });
    const type = liftWalls.get(wkey) || 'up';
    if (type === 'up') {
      // 上升型：踏板全踩下 → 升起
      if (allPressed) {
        if (grid[wr][wc] !== T_WALL) {
          grid[wr][wc] = T_WALL;
          const ent = entityAt(wr, wc);
          if (ent) ent.height++;
        }
      } else {
        if (grid[wr][wc] === T_WALL) {
          const ent = entityAt(wr, wc);
          if (ent && ent.height > 0) ent.height--;
          grid[wr][wc] = T_EMPTY;
        }
      }
    } else {
      // 下降型：踏板全踩下 → 下降
      if (allPressed) {
        if (grid[wr][wc] === T_WALL) {
          const ent = entityAt(wr, wc);
          if (ent && ent.height > 0) ent.height--;
          grid[wr][wc] = T_EMPTY;
        }
      } else {
        if (grid[wr][wc] !== T_WALL) {
          grid[wr][wc] = T_WALL;
          const ent = entityAt(wr, wc);
          if (ent) ent.height++;
        }
      }
    }
  }
}
```

- [ ] **Step 2: 测试升降逻辑**

刷新页面：
- 放置一个上升型升降墙 + 一个踏板 + 引线连接它们
- 角色踩上踏板 → 墙升起（蓝色），角色离开 → 墙降下
- 放置一个下降型升降墙 + 一个踏板 + 引线连接它们
- 初始墙为升起态（红色），角色踩上踏板 → 墙降下，角色离开 → 墙升起

- [ ] **Step 3: Commit**

```bash
git add map-editor.html && git commit -m "feat: updateLiftWalls按类型分支升降逻辑"
```

---

### Task 6: drawLiftWallTile — 按类型选颜色

**Files:**
- Modify: `map-editor.html:882-913, 1241-1247`

**Interfaces:**
- Consumes: `liftWalls: Map` (from Task 1)
- Produces: `drawLiftWallTile(row, col, raised)` — 内部从 liftWalls Map 查类型

- [ ] **Step 1: 修改 drawLiftWallTile — 自动查类型选色**

```js
// 旧 (lines 882-913):
function drawLiftWallTile(row, col, raised) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const s = TILE_SIZE / 8;

  if (raised) {
    // 升起态：真墙（略红调区分普通墙）
    ctx.fillStyle = '#665555';
    ...
  } else {
    // 下降态：半高虚线
    ctx.strokeStyle = '#887777';
    ...
  }
}

// 新:
function drawLiftWallTile(row, col, raised) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const s = TILE_SIZE / 8;
  const type = liftWalls.get(K(row, col)) || 'up';

  if (raised) {
    if (type === 'up') {
      // 上升型升起态：蓝色墙
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
      // 下降型升起态：红色墙
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
    // 下降态：半高虚线（两类型相同）
    ctx.strokeStyle = '#887777';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(x + 2, y + TILE_SIZE / 2, TILE_SIZE - 4, TILE_SIZE / 2 - 2);
    ctx.setLineDash([]);
    // 底部横条（实体支撑）
    ctx.fillStyle = '#665555';
    ctx.fillRect(x, y + TILE_SIZE - 4, TILE_SIZE, 4);
  }
}
```

- [ ] **Step 2: render 中 drawLiftWallTile 调用不变**

Lines 1241-1247 中 `drawLiftWallTile(r, c, true/false)` 调用签名不变，函数内部自己查类型。

- [ ] **Step 3: 测试渲染**

刷新页面：
- 上升型升起的墙 → 蓝色
- 下降型升起的墙 → 红色
- 下降态 → 半高虚线（两种类型相同）

- [ ] **Step 4: Commit**

```bash
git add map-editor.html && git commit -m "feat: drawLiftWallTile按类型选颜色——up蓝down红"
```

---

### Task 7: 导出 — Map 序列化为对象

**Files:**
- Modify: `map-editor.html:423`

**Interfaces:**
- Consumes: `liftWalls: Map` (from Task 1)

- [ ] **Step 1: 修改导出格式**

```js
// 旧 (line 423):
liftWalls: [...liftWalls],

// 新:
liftWalls: Object.fromEntries(liftWalls),
```

- [ ] **Step 2: 测试导出**

放置几个 up 和 down 型升降墙，导出 JSON，确认 `liftWalls` 字段为对象格式如 `{"3,5":"up","7,2":"down"}`。

- [ ] **Step 3: Commit**

```bash
git add map-editor.html && git commit -m "fix: 导出liftWalls从数组改为对象格式(Map序列化)"
```

---

### Task 8: 端到端验证

- [ ] **Step 1: 完整功能测试**

刷新页面，执行以下操作：
1. 按 [0] 确认是"升墙(↑)"，在空地放置 → 半高虚线（下降态）
2. 按 [9] 在相邻格放置踏板
3. 按 [-] 进入引线模式，点踏板再点升降墙 → 引线连接
4. 按 [4] 操控角色走到踏板上 → 上升型墙升起变蓝色
5. 角色离开踏板 → 墙降回半高虚线
6. 按 [0] 两次切换到"降墙(↓)"，在另一空地放置 → 初始为红色真墙（升起态）
7. 放踏板 + 引线连接
8. 角色踩踏板 → 红色墙降为可通行
9. 角色离开踏板 → 墙恢复红色真墙
10. 导出 JSON，确认 liftWalls 格式正确

- [ ] **Step 2: Commit（如有修改）**

```bash
git add -A && git commit -m "chore: 端到端验证完成"
```
