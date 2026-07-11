# 蜘蛛网空地 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 map-editor.html 中添加蜘蛛网空地变种，实体在蜘蛛网上无法被推动/移动。

**Architecture:** 新增 `webTiles` Set（与 `waterTiles` 模式一致），修改 `getPushChain` 和 `tryMoveHero` 实现粘住逻辑，新增工具栏按钮和渲染函数。

**Tech Stack:** Vanilla JS + Canvas, single file `map-editor.html`

## Global Constraints

- 所有改动在 `map-editor.html` 单文件中
- `webTiles` 与 `waterTiles` 互斥
- 仅 `T_EMPTY` 格子上可放置蜘蛛网

---

### Task 1: 数据模型 — 新增 webTiles Set + 核心逻辑

**Files:**
- Modify: `map-editor.html`

**Interfaces:**
- Produces: `webTiles` Set (global), modifies `getPushChain`, `tryMoveHero`

- [ ] **Step 1: 新增 webTiles 变量**

在第 191 行 `waterTiles` 声明后添加：
```js
let webTiles = new Set();   // 有蜘蛛网的空地坐标 "row,col"
```

- [ ] **Step 2: 修改 getPushChain — 蜘蛛网上实体阻塞推链**

在第 145 行 `const ent = entityAt(r, c);` 之后、`if (!ent) return chain;` 之前插入：
```js
if (ent && webTiles.has(K(r, c))) return null;
```

完整上下文：
```js
const ent = entityAt(r, c);
if (ent && webTiles.has(K(r, c))) return null;  // 蜘蛛网粘住实体
if (!ent) return chain;
```

- [ ] **Step 3: 修改 tryMoveHero — Hero 在蜘蛛网上禁止移动**

在第 489 行 `function tryMoveHero(dr, dc) {` 之后、`const nr = ...` 之前插入：
```js
if (webTiles.has(K(hero.row, hero.col))) return false; // 被蜘蛛网困住
```

- [ ] **Step 4: Commit**

```bash
git add map-editor.html && git commit -m "feat: webTiles数据模型 + 粘住核心逻辑"
```

---

### Task 2: 渲染 — drawWebTile + render 分支

**Files:**
- Modify: `map-editor.html`

**Interfaces:**
- Consumes: `webTiles` Set
- Produces: `drawWebTile(row, col)` function

- [ ] **Step 1: 新增 drawWebTile 函数**

在 `drawWaterTile` 函数之后（约第 777 行）添加：
```js
function drawWebTile(row, col) {
    const x = col * TILE_SIZE;
    const y = row * TILE_SIZE;
    const s = TILE_SIZE / 8;
    const cx = x + TILE_SIZE / 2;
    const cy = y + TILE_SIZE / 2;

    // 空地底色
    ctx.fillStyle = '#3a3a4e';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // 蛛丝颜色
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;

    // 从中心向八角辐射
    const dirs = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
    for (const [dr, dc] of dirs) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + dc * s * 3.5, cy + dr * s * 3.5);
        ctx.stroke();
    }

    // 螺旋连接线（四层环）
    const rings = [
        [cx - s, cy - s, s*2, s*2],
        [cx - s*1.5, cy - s*1.5, s*3, s*3],
        [cx - s*2, cy - s*2, s*4, s*4],
        [cx - s*2.5, cy - s*2.5, s*5, s*5],
    ];
    for (const [rx, ry, rw, rh] of rings) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + rw, ry);
        ctx.lineTo(rx + rw, ry + rh);
        ctx.lineTo(rx, ry + rh);
        ctx.lineTo(rx, ry);
        ctx.stroke();
    }

    // 中心小圆点
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
}
```

- [ ] **Step 2: 修改 render() — 加入 web tile 分支**

在第 965-968 行的空地渲染分支中，在 `waterTiles` 检查和 `drawEmptyTile` 之间插入：
```js
} else if (webTiles.has(K(r, c))) {
    drawWebTile(r, c);
```

完整上下文：
```js
if (grid[r][c] === T_WALL) {
    // ... wall logic
} else if (waterTiles.has(K(r, c))) {
    drawWaterTile(r, c);
} else if (webTiles.has(K(r, c))) {
    drawWebTile(r, c);
} else {
    drawEmptyTile(r, c);
}
```

- [ ] **Step 3: 验证渲染 — 手动放置蜘蛛网测试**

临时在 `initGrid` 后添加测试代码：
```js
webTiles.add('3,3'); webTiles.add('4,4');
```
刷新页面确认蜘蛛网纹理可见。

- [ ] **Step 4: 移除测试代码，Commit**

```bash
git add map-editor.html && git commit -m "feat: drawWebTile渲染 + render分支"
```

---

### Task 3: 编辑器 — 工具栏按钮 + 放置/擦除逻辑

**Files:**
- Modify: `map-editor.html`

**Interfaces:**
- Consumes: `webTiles` Set, `setTile`, `clearMap`, `exportMap`
- Produces: `btnWeb` DOM ref, `placeWeb` function, web mode support

- [ ] **Step 1: 工具栏新增 HTML 按钮**

在第 83 行（btn-crate 之后）添加：
```html
<button id="btn-web" data-mode="web">🕸 蜘蛛网 [8]</button>
```

- [ ] **Step 2: JS 中新增 btnWeb DOM 引用**

在第 177 行（btnPlay 之后）添加：
```js
const btnWeb = document.getElementById('btn-web');
```

- [ ] **Step 3: 将 btnWeb 加入 allBtns 数组**

修改第 180 行：
```js
const allBtns = [btnWall, btnDiag, btnErase, btnHero, btnBall, btnCrate, btnWeb, btnPlay];
```

- [ ] **Step 4: modeLabels 新增 web 条目**

在第 293-301 行的 `modeLabels` 对象中添加：
```js
'web':         '模式: 蜘蛛网 — 点击/拖拽在空地上放置蜘蛛网',
```

- [ ] **Step 5: activeBtns 新增 web 映射**

在第 302-305 行的 `activeBtns` 对象中添加：
```js
'web': btnWeb,
```

- [ ] **Step 6: placeActions 新增 web 放置**

在第 244-250 行的 `placeActions` 对象中添加：
```js
web:         () => placeWeb(cell.row, cell.col),
```

- [ ] **Step 7: dragActions 新增 web 拖拽**

在第 266-270 行的 `dragActions` 对象中添加：
```js
web:  () => placeWeb(cell.row, cell.col),
```

- [ ] **Step 8: 新增 placeWeb 函数**

在 `placeCrate` 函数之后（约第 806 行）添加：
```js
function placeWeb(row, col) {
    if (grid[row][col] === T_WALL) {
        statusEl.textContent = '⚠ 不能把蜘蛛网放在墙体上！';
        return;
    }
    waterTiles.delete(K(row, col));  // 与水互斥
    webTiles.add(K(row, col));
    render();
    statusEl.textContent = '🕸 蜘蛛网已放置';
}
```

- [ ] **Step 9: 快捷键 8 → web 模式**

在第 540 行的 `KEY_MODE` 对象中添加：
```js
'8': 'web',
```

- [ ] **Step 10: 修改 setTile — 覆盖时清理 webTiles**

在第 229 行 `waterTiles.delete(K(row, col));` 之后添加：
```js
webTiles.delete(K(row, col));
```

- [ ] **Step 11: 修改 clearMap — 清空 webTiles**

在第 390 行 `waterTiles.clear();` 之后添加：
```js
webTiles.clear();
```

- [ ] **Step 12: 修改 exportMap — 导出 webTiles**

在第 360-363 行的 `data` 对象中添加：
```js
webTiles: [...webTiles],
```

- [ ] **Step 13: Commit**

```bash
git add map-editor.html && git commit -m "feat: 编辑器支持 — 蜘蛛网按钮/放置/擦除/导出"
```

---

### Task 4: 验证

- [ ] **Step 1: 打开 map-editor.html，验证所有功能**

1. 工具栏出现 🕸 蜘蛛网 [8] 按钮
2. 按 8 切换到蜘蛛网模式，在空地上点击放置，看到蛛网纹理
3. 按 2 擦除模式点击蜘蛛网，蜘蛛网被清除
4. 在地图上放 Hero、Ball、Crate
5. 放蜘蛛网在 Hero 脚下 → 按方向键 Hero 无法移动
6. 放蜘蛛网在某格，把 Crate 推到蜘蛛网上 → Crate 粘住，再次推不动
7. 放蜘蛛网在某格，把 Ball 推到蜘蛛网上 → Hero 移动时绳子拉不动 Ball，Ball toggle
8. 导出 JSON 包含 webTiles 字段
9. 清空地图正常
