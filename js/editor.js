// === DOM 引用 ===
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

// 拖拽擦除时记录上一个擦除的格子，避免重复擦除
let lastErasedKey = null;

// === 地块编辑 ===
function setTile(row, col, value) {
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
    // 重置格子的全部特性
    const tile = grid[row][col];
    tile.hasWater = false;
    tile.hasWeb = false;
    tile.isPlate = false;
    tile.liftWall = null;
    tile.diagCorner = null;
    tile.hasDepression = false;
    // 清理相关引线
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

// === 放置函数 ===
function placeDiagWall(row, col) {
  if (isSolid(row, col)) {
    // 允许覆盖已有的斜角墙（更改缺口朝向）或普通墙（升级为斜角墙）
  }
  setTile(row, col, T_WALL);
  grid[row][col].diagCorner = editor.currentDiagCorner;
  render();
  statusEl.textContent = `${DIAG_SYMBOLS[editor.currentDiagCorner]} 斜角墙(${editor.currentDiagCorner}缺口)已放置`;
}

function placeCrate(row, col) {
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
  // 飞蛾初始高度：手动计算后锁定（后续 updateEntityHeight 会跳过）
  if (crate.crateKey === 'moth') {
    const under = entityUnder(row, col, crate);
    crate.height = under ? under.height + under.selfHeight : tileFootLevel(row, col);
  }
  const type = CRATES[editor.currentCrateKey];
  updateAllHeights();
  statusEl.textContent = `${type.emoji} ${type.name}已放置`;
  render();
}

function placeWeb(row, col) {
  if (grid[row][col].base === T_WALL) {
    statusEl.textContent = '⚠ 不能把蜘蛛网放在墙体上！';
    return;
  }
  grid[row][col].hasWater = false;
  grid[row][col].hasWeb = true;
  render();
  statusEl.textContent = '🕸 蜘蛛网已放置';
}

function placePlate(row, col) {
  if (grid[row][col].base === T_WALL) {
    statusEl.textContent = '⚠ 不能把踏板放在墙体上！';
    return;
  }
  grid[row][col].isPlate = true;
  render();
  statusEl.textContent = '▫ 踏板已放置';
}

function placeLiftWall(row, col) {
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

function placeDepression(row, col) {
  if (grid[row][col].base === T_WALL) {
    statusEl.textContent = '⚠ 不能把洼地放在墙体上！';
    return;
  }
  grid[row][col].hasDepression = true;
  grid[row][col].hasWater = false;
  render();
  statusEl.textContent = '\u{1F573}️ 洼地已放置（高度-1）';
}

// 从顶层逐层擦除：每次只移除格子上最上层的一个元素
function eraseTop(row, col) {
  const key = K(row, col);
  const tile = grid[row][col];

  // 1. 角色（最上层）
  if (hero && hero.row === row && hero.col === col) {
    hero = null;
    statusEl.textContent = '\u{1F5D1} 角色已擦除';
    render();
    return;
  }
  // 2. 球
  if (ball && ball.row === row && ball.col === col) {
    ball = null;
    statusEl.textContent = '\u{1F5D1} 球已擦除';
    render();
    return;
  }
  // 3. 上层箱子
  const topCrate = crates.get(key + ':1');
  if (topCrate) {
    crates.delete(key + ':1');
    statusEl.textContent = '\u{1F5D1} 上层箱子已擦除';
    render();
    return;
  }
  // 4. 底层箱子
  const bottomCrate = crates.get(key);
  if (bottomCrate) {
    crates.delete(key);
    statusEl.textContent = '\u{1F5D1} 箱子已擦除';
    render();
    return;
  }
  // 5. 蜘蛛网
  if (tile.hasWeb) {
    tile.hasWeb = false;
    statusEl.textContent = '\u{1F5D1} 蜘蛛网已擦除';
    render();
    return;
  }
  // 6. 踏板
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
  // 7. 升降墙
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
  // 8. 斜角墙 → 降级为普通墙
  if (tile.base === T_WALL && tile.diagCorner) {
    tile.diagCorner = null;
    statusEl.textContent = '\u{1F5D1} 斜角缺口已擦除（保留墙体）';
    render();
    return;
  }
  // 9. 普通墙 → 空地
  if (tile.base === T_WALL) {
    tile.base = T_EMPTY;
    statusEl.textContent = '\u{1F5D1} 墙体已擦除';
    render();
    return;
  }
  // 10. 洼地
  if (tile.hasDepression) {
    tile.hasDepression = false;
    statusEl.textContent = '\u{1F5D1} 洼地已擦除';
    render();
    return;
  }
  // 11. 水渍
  if (tile.hasWater) {
    tile.hasWater = false;
    statusEl.textContent = '\u{1F5D1} 水渍已擦除';
    render();
    return;
  }
  // 空无一物
  statusEl.textContent = '该格已空，无可擦除';
}

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

// === 画布事件处理 ===
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

function handleCanvasDown(e) {
  if (editor.mode === 'play') return;
  editor.isDrawing = true;
  const cell = getCellFromEvent(e);
  if (!cell) return;

  if (editor.mode === 'wire') {
    const key = K(cell.row, cell.col);
    if (grid[cell.row][cell.col].isPlate) {
      editor.wireStart = key;
      statusEl.textContent = `🔗 已选踏板(${key}) — 点击升降墙完成连线`;
      render();
      return;
    }
    if (grid[cell.row][cell.col].liftWall !== null && editor.wireStart) {
      wireLinks.push({ plate: editor.wireStart, wall: key });
      statusEl.textContent = `🔗 引线已连接: ${editor.wireStart} → ${key}`;
      editor.wireStart = null;
      render();
      return;
    }
    editor.wireStart = null;
    statusEl.textContent = '模式: 引线 — 点击踏板然后点击升降墙连线';
    render();
    return;
  }

  const placeActions = {
    wall:        () => setTile(cell.row, cell.col, T_WALL),
    diag:        () => placeDiagWall(cell.row, cell.col),
    erase:       () => eraseTop(cell.row, cell.col),
    place_hero:  () => placeHero(cell.row, cell.col),
    place_ball:  () => placeBall(cell.row, cell.col),
    place_crate: () => placeCrate(cell.row, cell.col),
    web:         () => placeWeb(cell.row, cell.col),
    plate:       () => placePlate(cell.row, cell.col),
    liftwall:    () => placeLiftWall(cell.row, cell.col),
    depression:  () => placeDepression(cell.row, cell.col),
  };
  if (placeActions[editor.mode]) placeActions[editor.mode]();
}

function handleCanvasMove(e) {
  const cell = getCellFromEvent(e);
  editor.hoverCell = cell;

  if (editor.mode === 'place_hero' || editor.mode === 'place_ball' || editor.mode === 'place_crate' || editor.mode === 'web' || editor.mode === 'plate' || editor.mode === 'liftwall' || editor.mode === 'wire' || editor.mode === 'depression') {
    render();
    return;
  }

  if (!editor.isDrawing) return;
  if (!cell) return;

  const dragActions = {
    wall:  () => setTile(cell.row, cell.col, T_WALL),
    diag:  () => placeDiagWall(cell.row, cell.col),
    erase: () => { const k = K(cell.row, cell.col); if (k !== lastErasedKey) { lastErasedKey = k; eraseTop(cell.row, cell.col); } },
    web:        () => placeWeb(cell.row, cell.col),
    plate:      () => placePlate(cell.row, cell.col),
    liftwall:   () => placeLiftWall(cell.row, cell.col),
    depression: () => placeDepression(cell.row, cell.col),
  };
  if (dragActions[editor.mode]) dragActions[editor.mode]();
}

function handleCanvasUp() {
  editor.isDrawing = false;
  lastErasedKey = null;
}

canvas.addEventListener('mousedown', handleCanvasDown);
canvas.addEventListener('mousemove', handleCanvasMove);
canvas.addEventListener('mouseup', handleCanvasUp);
canvas.addEventListener('mouseleave', () => {
  handleCanvasUp();
  editor.hoverCell = null;
  render();
});

// === 模式切换 ===
function setMode(newMode) {
  editor.isDrawing = false;
  editor.mode = newMode;
  allBtns.forEach(b => b.classList.remove('active'));

  const modeLabels = {
    'wall':        '模式: 画墙 — 点击/拖拽画布放置墙体',
    'diag':        `模式: 画斜角墙(${DIAG_SYMBOLS[editor.currentDiagCorner]}缺口) — 点击/拖拽画布放置`,
    'erase':       '模式: 擦除 — 点击/拖拽画布清除墙体或箱子',
    'place_hero':  '模式: 放置角色 — 点击空地放置角色',
    'place_ball':  '模式: 放置球 — 点击空地放置球（不能和角色/箱子同格）',
    'place_crate': `模式: 放置${CRATES[editor.currentCrateKey].name} — 点击空地放置`,
    'web':         '模式: 蜘蛛网 — 点击/拖拽在空地上放置蜘蛛网',
    'plate':       '模式: 踏板 — 点击空地放置踏板',
    'liftwall':    `模式: 升降墙(${editor.currentLiftType === 'up' ? '↑上升型' : '↓下降型'}) — 点击空地放置`,
    'depression':  '模式: 洼地 — 点击/拖拽在空地上放置洼地（高度-1）',
    'wire':        '模式: 引线 — 点击踏板然后点击升降墙连线',
    'play':        '模式: 操控 — 方向键/WASD 移动角色'
  };
  const activeBtns = {
    'wall': btnWall, 'diag': btnDiag, 'erase': btnErase,
    'place_hero': btnHero, 'place_ball': btnBall, 'place_crate': btnCrate, 'web': btnWeb, 'plate': btnPlate, 'liftwall': btnLiftwall, 'depression': btnDepression, 'wire': btnWire, 'play': btnPlay
  };

  activeBtns[newMode].classList.add('active');
  if (newMode === 'place_crate') updateCrateBtn();
  if (newMode === 'diag') updateDiagBtn();
  if (newMode === 'wire') editor.wireStart = null;
  if (newMode === 'liftwall') updateLiftBtn();
  statusEl.textContent = modeLabels[newMode];
  render();
}

function updateCrateBtn() {
  const type = CRATES[editor.currentCrateKey];
  btnCrate.textContent = `${type.emoji} ${type.name} [6]`;
}

function updateDiagBtn() {
  btnDiag.textContent = `${DIAG_SYMBOLS[editor.currentDiagCorner]} 斜角墙 [7]`;
}

function updateLiftBtn() {
  btnLiftwall.textContent = editor.currentLiftType === 'up' ? '⇅ 升墙(↑) [0]' : '⇅ 降墙(↓) [0]';
}

// 按钮点击：切换模式 / 循环切换子类型
document.querySelectorAll('#toolbar button[data-mode]').forEach(b =>
  b.addEventListener('click', () => {
    if (b.dataset.mode === 'place_crate' && editor.mode === 'place_crate') {
      const keys = Object.keys(CRATES);
      const idx = keys.indexOf(editor.currentCrateKey);
      editor.currentCrateKey = keys[(idx + 1) % keys.length];
      updateCrateBtn();
      statusEl.textContent = `模式: 放置${CRATES[editor.currentCrateKey].name} — 点击空地放置`;
      return;
    }
    if (b.dataset.mode === 'diag' && editor.mode === 'diag') {
      const idx = DIAG_CORNERS.indexOf(editor.currentDiagCorner);
      editor.currentDiagCorner = DIAG_CORNERS[(idx + 1) % DIAG_CORNERS.length];
      updateDiagBtn();
      statusEl.textContent = `模式: 画斜角墙(${DIAG_SYMBOLS[editor.currentDiagCorner]}缺口) — 点击/拖拽画布放置`;
      return;
    }
    if (b.dataset.mode === 'liftwall' && editor.mode === 'liftwall') {
      editor.currentLiftType = editor.currentLiftType === 'up' ? 'down' : 'up';
      updateLiftBtn();
      statusEl.textContent = `模式: 升降墙(${editor.currentLiftType === 'up' ? '↑上升型' : '↓下降型'}) — 点击空地放置`;
      return;
    }
    setMode(b.dataset.mode);
  }));

// === 导出 ===
function exportMap() {
  const tiles = [];
  const diagData = {};
  const webArr = [];
  const plateArr = [];
  const liftData = {};
  const depressionArr = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    tiles[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = grid[r][c];
      tiles[r][c] = tile.base;
      if (tile.diagCorner !== null) diagData[K(r, c)] = tile.diagCorner;
      if (tile.hasWeb) webArr.push(K(r, c));
      if (tile.isPlate) plateArr.push(K(r, c));
      if (tile.liftWall !== null) liftData[K(r, c)] = tile.liftWall;
      if (tile.hasDepression) depressionArr.push(K(r, c));
    }
  }
  for (const crate of crates.values()) {
    tiles[crate.row][crate.col] = Object.keys(CRATES).indexOf(crate.crateKey) + 2;
  }
  const data = {
    width: GRID_SIZE,
    height: GRID_SIZE,
    tiles: tiles,
    diagCorners: diagData,
    heroStart: hero ? { row: hero.row, col: hero.col } : null,
    ballStart: ball ? { row: ball.row, col: ball.col } : null,
    webTiles: webArr,
    plateTiles: plateArr,
    liftWalls: liftData,
    depressionTiles: depressionArr,
    wireLinks: wireLinks
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

// === 清空地图 ===
function clearMap() {
  if (!confirm('确定要清空整个地图吗？此操作不可撤销。')) return;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      grid[r][c] = new Tile();
    }
  }
  hero = null;
  ball = null;
  crates.clear();
  editor.currentCrateKey = 'wood';
  wireLinks.length = 0;
  editor.wireStart = null;
  updateCrateBtn();
  statusEl.textContent = '🗺 地图已清空';
  render();
}

btnClear.addEventListener('click', clearMap);

// === 键盘处理 ===
const KEY_DIR = {
  'ArrowUp':{dr:-1,dc:0},'w':{dr:-1,dc:0},'W':{dr:-1,dc:0},
  'ArrowDown':{dr:1,dc:0},'s':{dr:1,dc:0},'S':{dr:1,dc:0},
  'ArrowLeft':{dr:0,dc:-1},'a':{dr:0,dc:-1},'A':{dr:0,dc:-1},
  'ArrowRight':{dr:0,dc:1},'d':{dr:0,dc:1},'D':{dr:0,dc:1},
};
const KEY_MODE = { '1':'wall','2':'diag','3':'erase','4':'web','5':'plate','6':'liftwall','7':'depression','8':'place_hero','9':'place_ball','0':'place_crate','-':'wire' };

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (KEY_MODE[e.key]) { setMode(KEY_MODE[e.key]); return; }

  if (editor.mode === 'play' && hero) {
    const dir = KEY_DIR[e.key];
    if (dir) {
      e.preventDefault();
      if (tryMoveHero(dir.dr, dir.dc)) {
        meltSnow();
        moveMoths();
        updateLiftWalls();
        updateAllHeights();
        statusEl.textContent = `角色位置: (${hero.row}, ${hero.col})` +
          (ball ? `  球位置: (${ball.row}, ${ball.col}) [${ball.lightOn ? '💡开' : '🌑关'}]` : '') +
          (ball ? `  距离: ${dist(hero.row, hero.col, ball.row, ball.col)}` : '');
      }
      render();
    }
  }
});

// === 启动 ===
render();
