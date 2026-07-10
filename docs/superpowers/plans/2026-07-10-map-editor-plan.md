# 像素方块地图编辑器 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个纯前端像素风格地图编辑器——单 HTML 文件，Canvas 渲染，支持绘墙/擦除/放置角色/操控角色移动/导出 JSON。

**Architecture:** 单一 HTML 文件内联所有 CSS 和 JS。Canvas 负责全部渲染（网格、墙体纹理、角色像素小人），工具栏用 HTML 按钮控制编辑模式。状态集中在顶层变量中，渲染是纯函数，事件直接绑定 canvas 和键盘。

**Tech Stack:** HTML5 Canvas, 原生 JavaScript, CSS3（无框架，无依赖）

## Global Constraints

- 单文件 `map-editor.html`，浏览器打开即用
- 网格默认 16×16，tileSize 根据画布大小自动计算
- grid 存储数字（0=空地, 1=墙体），预留扩展地形类型
- 四种模式：画墙(wall)、擦除(erase)、放置角色(place_hero)、操控(play)
- 操控模式下方向键/WASD 移动角色，不可穿墙
- 导出 JSON 格式触发浏览器下载
- 像素风格：砖块纹理墙体、像素小人角色、复古配色

---

### Task 1: HTML 骨架 + Canvas 初始化 + 像素风 CSS

**Files:**
- Create: `map-editor.html`

**Interfaces:**
- Consumes: (none — first task)
- Produces:
  - Canvas: `<canvas id="map" width="512" height="512">`
  - 工具栏按钮: `#btn-wall`, `#btn-erase`, `#btn-hero`, `#btn-play`, `#btn-export`
  - 状态提示条: `#status`
  - CSS 变量: `--bg`, `--text`, `--btn-bg`, `--btn-active`, `--canvas-bg`
  - 画布尺寸常量: `CANVAS_SIZE = 512`, `GRID_SIZE = 16`

- [ ] **Step 1: 创建 HTML 文件，搭建骨架**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>像素地图编辑器</title>
<style>
  :root {
    --bg: #1a1a2e;
    --surface: #16213e;
    --text: #e0e0e0;
    --accent: #e94560;
    --btn-bg: #0f3460;
    --btn-active: #e94560;
    --canvas-bg: #2a2a3e;
    --wall-color: #555566;
    --wall-line: #777788;
    --empty-color: #3a3a4e;
    --grid-line: #4a4a5e;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Courier New', monospace;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    padding: 20px;
  }
  h1 {
    font-size: 24px;
    letter-spacing: 4px;
    margin-bottom: 16px;
    image-rendering: pixelated;
    text-transform: uppercase;
  }
  #toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }
  #toolbar button {
    background: var(--btn-bg);
    color: var(--text);
    border: 2px solid #4a4a6e;
    padding: 8px 16px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    cursor: pointer;
    image-rendering: pixelated;
    transition: background 0.1s;
  }
  #toolbar button:hover { border-color: var(--accent); }
  #toolbar button.active {
    background: var(--btn-active);
    border-color: var(--btn-active);
  }
  #status {
    font-size: 13px;
    margin-bottom: 10px;
    color: #aaa;
    min-height: 20px;
  }
  canvas {
    border: 2px solid #4a4a6e;
    image-rendering: pixelated;
    cursor: crosshair;
    background: var(--canvas-bg);
  }
</style>
</head>
<body>
  <h1>Map Editor</h1>
  <div id="toolbar">
    <button id="btn-wall" class="active">🖼 画墙 [1]</button>
    <button id="btn-erase">🗑 擦除 [2]</button>
    <button id="btn-hero">🧍 放角色 [3]</button>
    <button id="btn-play">▶ 操控 [4]</button>
    <button id="btn-export">💾 导出</button>
  </div>
  <div id="status">模式: 画墙 — 点击/拖拽画布放置墙体</div>
  <canvas id="map" width="512" height="512"></canvas>

  <script>
    // === 常量 ===
    const CANVAS_SIZE = 512;
    const GRID_SIZE = 16;
    const TILE_SIZE = CANVAS_SIZE / GRID_SIZE; // 32px

    // === DOM 引用 ===
    const canvas = document.getElementById('map');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');
    const btnWall = document.getElementById('btn-wall');
    const btnErase = document.getElementById('btn-erase');
    const btnHero = document.getElementById('btn-hero');
    const btnPlay = document.getElementById('btn-play');
    const btnExport = document.getElementById('btn-export');
    const allBtns = [btnWall, btnErase, btnHero, btnPlay];

    // === 状态 ===
    let mode = 'wall';          // 'wall' | 'erase' | 'place_hero' | 'play'
    let grid = [];              // grid[row][col]: 0=空地, 1=墙体
    let hero = null;            // {row, col} | null
    let isDrawing = false;      // 鼠标拖拽中
    let hoverCell = null;       // {row, col} | null  鼠标悬停格子

    // === 状态初始化 ===
    function initGrid() {
      grid = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        grid[r] = new Array(GRID_SIZE).fill(0);
      }
    }
    initGrid();

    console.log('Map Editor initialized:', { grid, mode, hero, TILE_SIZE });
  </script>
</body>
</html>
```

- [ ] **Step 2: 浏览器打开验证**

打开 `map-editor.html`，确认：标题、5 个按钮、512×512 画布、深色背景均显示正常。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: HTML 骨架 + Canvas 初始化 + 像素风 CSS"
```

---

### Task 2: 网格渲染 —— 空地 + 墙体砖块纹理

**Files:**
- Modify: `map-editor.html` — 替换 `<script>` 末尾（在 initGrid() 之后）

**Interfaces:**
- Consumes: `ctx`, `GRID_SIZE`, `TILE_SIZE`, `grid`, `hero`, `mode`, `hoverCell` (from Task 1)
- Produces:
  - `render()` — 无参数，读取 `grid`/`hero`/`hoverCell`，完整绘制一帧
  - `drawWallTile(row, col)` — 绘制砖块纹理
  - `drawEmptyTile(row, col)` — 绘制空地
  - `drawGridLines()` — 绘制网格线

- [ ] **Step 1: 添加渲染函数**

在 `<script>` 中 `initGrid()` 之后添加：

```javascript
// === 渲染 ===
function drawEmptyTile(row, col) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  ctx.fillStyle = '#3a3a4e';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
}

function drawWallTile(row, col) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  // 底色
  ctx.fillStyle = '#555566';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  // 砖缝横线（1/3 和 2/3 位置）
  ctx.strokeStyle = '#777788';
  ctx.lineWidth = 1;
  const third = TILE_SIZE / 3;
  ctx.beginPath();
  ctx.moveTo(x, y + third);
  ctx.lineTo(x + TILE_SIZE, y + third);
  ctx.moveTo(x, y + third * 2);
  ctx.lineTo(x + TILE_SIZE, y + third * 2);
  // 砖缝竖线（偏移排列）
  ctx.moveTo(x + TILE_SIZE / 2, y);
  ctx.lineTo(x + TILE_SIZE / 2, y + third);
  ctx.moveTo(x, y + third);
  ctx.lineTo(x, y + third * 2);
  ctx.moveTo(x + TILE_SIZE / 2, y + third * 2);
  ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE);
  ctx.stroke();
  // 边框
  ctx.strokeStyle = '#444455';
  ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
}

function drawGridLines() {
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

function render() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 1. 绘制所有格子
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 1) {
        drawWallTile(r, c);
      } else {
        drawEmptyTile(r, c);
      }
    }
  }

  // 2. 网格线
  drawGridLines();

  // 3. 悬停高亮（放置角色模式）
  if (mode === 'place_hero' && hoverCell) {
    const { row, col } = hoverCell;
    const x = col * TILE_SIZE;
    const y = row * TILE_SIZE;
    if (grid[row][col] === 1) {
      // 墙上 — 红色
      ctx.fillStyle = 'rgba(255, 60, 60, 0.4)';
    } else {
      // 空地 — 绿色
      ctx.fillStyle = 'rgba(60, 255, 60, 0.3)';
    }
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  }

  // 4. 角色
  if (hero) {
    drawHero(hero.row, hero.col);
  }
}

// 首次渲染
render();
```

- [ ] **Step 2: 添加初始测试墙体验证渲染**

在 `initGrid()` 后添加几块测试墙体：

```javascript
// 测试墙体（验证后删除）
grid[2][3] = 1;
grid[2][4] = 1;
grid[3][3] = 1;
grid[7][7] = 1;
grid[7][8] = 1;
grid[8][7] = 1;
grid[8][8] = 1;
render();
```

- [ ] **Step 3: 浏览器打开验证**

刷新 `map-editor.html`，确认：16×16 网格线可见、深色空地格、测试墙体呈砖块纹理（灰底 + 砖缝线）。

- [ ] **Step 4: 删除测试墙体代码，保留干净的 render() 调用**

```javascript
// 删除测试墙体那几行，只保留：
render();
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: 网格渲染 —— 空地 + 墙体砖块纹理"
```

---

### Task 3: 鼠标交互 —— 画墙模式（点按 + 拖拽）

**Files:**
- Modify: `map-editor.html` — 在 `<script>` 中添加事件处理

**Interfaces:**
- Consumes: `canvas`, `GRID_SIZE`, `TILE_SIZE`, `grid`, `mode`, `isDrawing`
- Produces:
  - `getCellFromEvent(e)` → `{row, col} | null` — 鼠标坐标转格子坐标
  - `setTile(row, col, value)` — 设置格子值并重绘
  - `canvas` 事件监听器: `mousedown`, `mousemove`, `mouseup`, `mouseleave`

- [ ] **Step 1: 添加坐标工具函数和事件处理**

在 `render()` 调用之前添加：

```javascript
// === 事件处理 ===
function getCellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_SIZE / rect.width;
  const scaleY = CANVAS_SIZE / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;
  const col = Math.floor(mx / TILE_SIZE);
  const row = Math.floor(my / TILE_SIZE);
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
  return { row, col };
}

function setTile(row, col, value) {
  if (grid[row][col] === value) return; // 不变不重绘
  grid[row][col] = value;
  render();
}

function handleCanvasDown(e) {
  if (mode === 'play') return;
  isDrawing = true;
  const cell = getCellFromEvent(e);
  if (!cell) return;

  if (mode === 'wall') {
    setTile(cell.row, cell.col, 1);
  } else if (mode === 'erase') {
    setTile(cell.row, cell.col, 0);
  } else if (mode === 'place_hero') {
    placeHero(cell.row, cell.col);
  }
}

function handleCanvasMove(e) {
  const cell = getCellFromEvent(e);
  hoverCell = cell;

  if (mode === 'place_hero') {
    render(); // 重绘悬停高亮
    return;
  }

  if (!isDrawing) return;
  if (!cell) return;

  if (mode === 'wall') {
    setTile(cell.row, cell.col, 1);
  } else if (mode === 'erase') {
    setTile(cell.row, cell.col, 0);
  }
}

function handleCanvasUp() {
  isDrawing = false;
}

canvas.addEventListener('mousedown', handleCanvasDown);
canvas.addEventListener('mousemove', handleCanvasMove);
canvas.addEventListener('mouseup', handleCanvasUp);
canvas.addEventListener('mouseleave', handleCanvasUp);
```

- [ ] **Step 2: 验证画墙**

打开浏览器，确认默认"画墙"模式，点击或在画布上拖拽，对应格子变为砖块纹理。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 画墙模式 —— 鼠标点击/拖拽放置墙体"
```

---

### Task 4: 模式切换 —— 工具栏按钮 + 键盘快捷键

**Files:**
- Modify: `map-editor.html` — 添加按钮事件和模式切换逻辑

**Interfaces:**
- Consumes: `btnWall`, `btnErase`, `btnHero`, `btnPlay`, `allBtns`, `mode`, `statusEl`
- Produces:
  - `setMode(newMode)` — 切换模式、更新按钮高亮、更新状态文字
  - 按钮 click 事件 + 键盘 1/2/3/4 快捷键

- [ ] **Step 1: 添加模式切换函数和按钮事件**

在事件处理代码之后添加：

```javascript
// === 模式切换 ===
function setMode(newMode) {
  mode = newMode;
  allBtns.forEach(b => b.classList.remove('active'));

  const modeLabels = {
    'wall':        '模式: 画墙 — 点击/拖拽画布放置墙体',
    'erase':       '模式: 擦除 — 点击/拖拽画布清除墙体',
    'place_hero':  '模式: 放置角色 — 点击空地放置角色',
    'play':        '模式: 操控 — 方向键/WASD 移动角色'
  };
  const activeBtns = {
    'wall': btnWall, 'erase': btnErase,
    'place_hero': btnHero, 'play': btnPlay
  };

  activeBtns[newMode].classList.add('active');
  statusEl.textContent = modeLabels[newMode];
  render(); // 更新悬停/高亮
}

btnWall.addEventListener('click', () => setMode('wall'));
btnErase.addEventListener('click', () => setMode('erase'));
btnHero.addEventListener('click', () => setMode('place_hero'));
btnPlay.addEventListener('click', () => setMode('play'));

// 键盘快捷键
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === '1') setMode('wall');
  if (e.key === '2') setMode('erase');
  if (e.key === '3') setMode('place_hero');
  if (e.key === '4') setMode('play');
});
```

- [ ] **Step 2: 验证模式切换**

浏览器中验证：点击各按钮或按 1/2/3/4，按钮高亮切换，状态文字更新。

- [ ] **Step 3: 验证擦除模式**

切换到擦除模式，在已有墙体上拖拽/点击，墙体被清除。

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: 模式切换 —— 工具栏按钮 + 数字键 1-4 快捷键 + 擦除模式"
```

---

### Task 5: 角色放置 + 像素小人绘制

**Files:**
- Modify: `map-editor.html` — 添加 `drawHero()` 和 `placeHero()` 函数

**Interfaces:**
- Consumes: `hero`, `TILE_SIZE`, `grid`, `mode`
- Produces:
  - `drawHero(row, col)` — 在指定格子绘制像素小人
  - `placeHero(row, col)` — 放置角色到空地（墙上拒绝）

- [ ] **Step 1: 添加 drawHero 和 placeHero 函数**

在 `render()` 函数之前添加：

```javascript
// === 角色 ===
function drawHero(row, col) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const s = TILE_SIZE / 8; // 将格子分成 8×8 像素网格

  // 头发（深棕，顶部 2×3）
  ctx.fillStyle = '#4a3728';
  ctx.fillRect(x + s * 3, y + s * 0, s * 2, s * 2);

  // 脸（肤色，第2-3行）
  ctx.fillStyle = '#f4c89a';
  ctx.fillRect(x + s * 3, y + s * 2, s * 2, s * 2);

  // 眼睛（黑点）
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x + s * 3, y + s * 2, s, s);
  ctx.fillRect(x + s * 5, y + s * 2, s, s);

  // 身体（蓝色衬衫）
  ctx.fillStyle = '#4488cc';
  ctx.fillRect(x + s * 2, y + s * 4, s * 4, s * 2);

  // 手臂
  ctx.fillStyle = '#f4c89a';
  ctx.fillRect(x + s * 1, y + s * 4, s, s * 2);
  ctx.fillRect(x + s * 6, y + s * 4, s, s * 2);

  // 腿（深蓝裤子）
  ctx.fillStyle = '#335577';
  ctx.fillRect(x + s * 2, y + s * 6, s * 2, s * 2);
  ctx.fillRect(x + s * 4, y + s * 6, s * 2, s * 2);
}

function placeHero(row, col) {
  if (grid[row][col] === 1) {
    statusEl.textContent = '⚠ 不能把角色放在墙体上！';
    return;
  }
  hero = { row, col };
  setMode('play'); // 放置后自动切换到操控模式
  statusEl.textContent = '✅ 角色已放置！方向键/WASD 移动';
  render();
}
```

- [ ] **Step 2: 验证角色放置**

浏览器中：画一些墙 → 按 3 切换到放置角色 → 鼠标移到空地显示绿色高亮 → 移到墙体显示红色 → 点击空地放置角色 → 自动切换到操控模式，像素小人出现。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 角色放置 + 像素小人绘制 + 悬停高亮预览"
```

---

### Task 6: 角色移动 —— 键盘控制

**Files:**
- Modify: `map-editor.html` — 扩展键盘事件处理

**Interfaces:**
- Consumes: `hero`, `grid`, `GRID_SIZE`, `mode`
- Produces: 键盘事件中新增方向移动逻辑

- [ ] **Step 1: 添加角色移动逻辑**

在已有的键盘事件监听器中，在快捷键判断之后添加移动逻辑。找到 `document.addEventListener('keydown', (e) => { ... })` 块，在其内部快捷键 `if` 之后补充：

```javascript
  // 角色移动（仅操控模式且有角色时）
  if (mode === 'play' && hero) {
    let { row, col } = hero;
    const keyMap = {
      'ArrowUp':    { dr: -1, dc:  0 }, 'w': { dr: -1, dc:  0 }, 'W': { dr: -1, dc:  0 },
      'ArrowDown':  { dr:  1, dc:  0 }, 's': { dr:  1, dc:  0 }, 'S': { dr:  1, dc:  0 },
      'ArrowLeft':  { dr:  0, dc: -1 }, 'a': { dr:  0, dc: -1 }, 'A': { dr:  0, dc: -1 },
      'ArrowRight': { dr:  0, dc:  1 }, 'd': { dr:  0, dc:  1 }, 'D': { dr:  0, dc:  1 },
    };
    const dir = keyMap[e.key];
    if (dir) {
      e.preventDefault();
      const nr = row + dir.dr;
      const nc = col + dir.dc;
      // 边界检查
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return;
      // 墙体检查
      if (grid[nr][nc] === 1) return;
      hero = { row: nr, col: nc };
      statusEl.textContent = `角色位置: (${nr}, ${nc})`;
      render();
    }
  }
```

注意：这段代码要和已有的快捷键判断在同一个 `keydown` 监听器内，放在 `if (e.key === '4')` 之后。

- [ ] **Step 2: 验证角色移动**

浏览器中：放置角色 → 按方向键或 WASD → 角色在空地间移动，遇到墙体停止，不越界。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 角色移动 —— 方向键/WASD 控制，不可穿墙"
```

---

### Task 7: JSON 导出

**Files:**
- Modify: `map-editor.html` — 添加导出按钮事件

**Interfaces:**
- Consumes: `grid`, `hero`, `GRID_SIZE`, `btnExport`
- Produces: 浏览器下载 `.json` 文件

- [ ] **Step 1: 添加导出函数**

在模式切换代码之后添加：

```javascript
// === 导出 ===
function exportMap() {
  const data = {
    width: GRID_SIZE,
    height: GRID_SIZE,
    tiles: grid.map(row => [...row]),
    heroStart: hero ? { row: hero.row, col: hero.col } : null
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'map.json';
  a.click();
  URL.revokeObjectURL(url);
  statusEl.textContent = '💾 地图已导出为 map.json';
}

btnExport.addEventListener('click', exportMap);
```

- [ ] **Step 2: 验证导出**

浏览器中：画一些墙、放置角色 → 点击导出 → 浏览器下载 `map.json` → 用文本编辑器打开验证格式正确。

```json
{
  "width": 16,
  "height": 16,
  "tiles": [[0,0,...], ...],
  "heroStart": { "row": 7, "col": 8 }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: JSON 导出 —— 含网格数据 + 角色初始位置"
```

---

### Task 8: 综合打磨 —— 视觉润色 + 空白地图按钮

**Files:**
- Modify: `map-editor.html`

**Interfaces:**
- Consumes: 所有已有接口
- Produces: 新增 #btn-clear 按钮 + `clearMap()` 函数 + 视觉微调

- [ ] **Step 1: 添加"清空地图"按钮**

在 HTML 工具栏中 export 按钮之前插入：

```html
<button id="btn-clear">🗺 清空</button>
```

- [ ] **Step 2: 添加 clearMap 函数**

在导出代码之后：

```javascript
// === 清空地图 ===
function clearMap() {
  if (!confirm('确定要清空整个地图吗？此操作不可撤销。')) return;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      grid[r][c] = 0;
    }
  }
  hero = null;
  statusEl.textContent = '🗺 地图已清空';
  render();
}

const btnClear = document.getElementById('btn-clear');
btnClear.addEventListener('click', clearMap);
```

- [ ] **Step 3: 视觉微调**

在 CSS 中添加画布阴影、微调按钮间距：

```css
canvas {
  box-shadow: 0 0 20px rgba(233, 69, 96, 0.15);
}
#toolbar button:active {
  transform: translateY(1px);
}
```

在 `<script>` 渲染函数中，墙体边框内外做微妙高光：

在 `drawWallTile` 函数的最后（`strokeRect` 之后）补充：

```javascript
  // 微妙高光（左上角亮边）
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(x, y + TILE_SIZE);
  ctx.lineTo(x, y);
  ctx.lineTo(x + TILE_SIZE, y);
  ctx.stroke();
```

- [ ] **Step 4: 最终全流程验证**

浏览器中完整走一遍：
1. 画墙模式拖拽画一排墙 ✅
2. 擦除模式清除部分墙体 ✅
3. 放置角色到空地 ✅
4. 操控模式下方向键/WASD 移动 ✅
5. 角色不能穿墙/越界 ✅
6. 导出 JSON 文件 ✅
7. 清空地图 ✅
8. 所有按钮和快捷键正常 ✅

- [ ] **Step 5: 最终 Commit**

```bash
git add -A && git commit -m "feat: 清空按钮 + 视觉润色 + 最终打磨"
```

---
