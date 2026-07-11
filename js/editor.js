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
const btnPlay = document.getElementById('btn-play');
const btnExport = document.getElementById('btn-export');
const btnClear = document.getElementById('btn-clear');
const allBtns = [btnWall, btnDiag, btnErase, btnHero, btnBall, btnCrate, btnWeb, btnPlate, btnLiftwall, btnWire, btnPlay];

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
    waterTiles.delete(K(row, col));
    webTiles.delete(K(row, col));
    plateTiles.delete(K(row, col));
    liftWalls.delete(K(row, col));
    // 清理相关引线
    const key = K(row, col);
    for (let i = wireLinks.length - 1; i >= 0; i--) {
      if (wireLinks[i].plate === key || wireLinks[i].wall === key) {
        wireLinks.splice(i, 1);
      }
    }
    if (wireStart === key) wireStart = null;
    diagCorners.delete(K(row, col));
  }
  if (grid[row][col] === value) return;
  grid[row][col] = value;
  render();
}

// === 放置函数 ===
function placeDiagWall(row, col) {
  if (isSolid(row, col)) {
    // 允许覆盖已有的斜角墙（更改缺口朝向）或普通墙（升级为斜角墙）
  }
  setTile(row, col, T_WALL);
  diagCorners.set(K(row, col), currentDiagCorner);
  render();
  statusEl.textContent = `${DIAG_SYMBOLS[currentDiagCorner]} 斜角墙(${currentDiagCorner}缺口)已放置`;
}

function placeCrate(row, col) {
  if (grid[row][col] === T_WALL && !liftWalls.has(K(row, col))) {
    statusEl.textContent = '⚠ 不能把箱子放在墙体上！';
    return;
  }
  const key = K(row, col);
  if (!crates.has(key)) {
    crates.set(key, new Crate(row, col, currentCrateKey));
  } else if (!crates.has(key + ':1')) {
    crates.set(key + ':1', new Crate(row, col, currentCrateKey));
  } else {
    statusEl.textContent = '⚠ 此处已有两个箱子！';
    return;
  }
  const type = CRATES[currentCrateKey];
  updateAllHeights();
  statusEl.textContent = `${type.emoji} ${type.name}已放置`;
  render();
}

function placeWeb(row, col) {
  if (grid[row][col] === T_WALL) {
    statusEl.textContent = '⚠ 不能把蜘蛛网放在墙体上！';
    return;
  }
  waterTiles.delete(K(row, col));
  webTiles.add(K(row, col));
  render();
  statusEl.textContent = '🕸 蜘蛛网已放置';
}

function placePlate(row, col) {
  if (grid[row][col] === T_WALL) {
    statusEl.textContent = '⚠ 不能把踏板放在墙体上！';
    return;
  }
  plateTiles.add(K(row, col));
  render();
  statusEl.textContent = '▫ 踏板已放置';
}

function placeLiftWall(row, col) {
  const key = K(row, col);
  if (grid[row][col] === T_WALL || liftWalls.has(key)) {
    statusEl.textContent = '⚠ 此处已有墙体或升降墙！';
    return;
  }
  liftWalls.set(key, currentLiftType);
  if (currentLiftType === 'down') {
    grid[row][col] = T_WALL;
  }
  render();
  const typeLabel = currentLiftType === 'up' ? '上升型(默认下降)' : '下降型(默认升起)';
  statusEl.textContent = `⇅ 升降墙已放置(${typeLabel})`;
}

function placeHero(row, col) {
  if (grid[row][col] === T_WALL && !liftWalls.has(K(row, col))) {
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
  if (grid[row][col] === T_WALL && !liftWalls.has(K(row, col))) {
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
  if (mode === 'play') return;
  isDrawing = true;
  const cell = getCellFromEvent(e);
  if (!cell) return;

  if (mode === 'wire') {
    const key = K(cell.row, cell.col);
    if (plateTiles.has(key)) {
      wireStart = key;
      statusEl.textContent = `🔗 已选踏板(${key}) — 点击升降墙完成连线`;
      render();
      return;
    }
    if (liftWalls.has(key) && wireStart) {
      wireLinks.push({ plate: wireStart, wall: key });
      statusEl.textContent = `🔗 引线已连接: ${wireStart} → ${key}`;
      wireStart = null;
      render();
      return;
    }
    wireStart = null;
    statusEl.textContent = '模式: 引线 — 点击踏板然后点击升降墙连线';
    render();
    return;
  }

  const placeActions = {
    wall:        () => setTile(cell.row, cell.col, T_WALL),
    diag:        () => placeDiagWall(cell.row, cell.col),
    erase:       () => setTile(cell.row, cell.col, T_EMPTY),
    place_hero:  () => placeHero(cell.row, cell.col),
    place_ball:  () => placeBall(cell.row, cell.col),
    place_crate: () => placeCrate(cell.row, cell.col),
    web:         () => placeWeb(cell.row, cell.col),
    plate:       () => placePlate(cell.row, cell.col),
    liftwall:    () => placeLiftWall(cell.row, cell.col),
  };
  if (placeActions[mode]) placeActions[mode]();
}

function handleCanvasMove(e) {
  const cell = getCellFromEvent(e);
  hoverCell = cell;

  if (mode === 'place_hero' || mode === 'place_ball' || mode === 'place_crate' || mode === 'web' || mode === 'plate' || mode === 'liftwall' || mode === 'wire') {
    render();
    return;
  }

  if (!isDrawing) return;
  if (!cell) return;

  const dragActions = {
    wall:  () => setTile(cell.row, cell.col, T_WALL),
    diag:  () => placeDiagWall(cell.row, cell.col),
    erase: () => setTile(cell.row, cell.col, T_EMPTY),
    web:      () => placeWeb(cell.row, cell.col),
    plate:    () => placePlate(cell.row, cell.col),
    liftwall: () => placeLiftWall(cell.row, cell.col),
  };
  if (dragActions[mode]) dragActions[mode]();
}

function handleCanvasUp() {
  isDrawing = false;
}

canvas.addEventListener('mousedown', handleCanvasDown);
canvas.addEventListener('mousemove', handleCanvasMove);
canvas.addEventListener('mouseup', handleCanvasUp);
canvas.addEventListener('mouseleave', () => {
  handleCanvasUp();
  hoverCell = null;
  render();
});

// === 模式切换 ===
function setMode(newMode) {
  isDrawing = false;
  mode = newMode;
  allBtns.forEach(b => b.classList.remove('active'));

  const modeLabels = {
    'wall':        '模式: 画墙 — 点击/拖拽画布放置墙体',
    'diag':        `模式: 画斜角墙(${DIAG_SYMBOLS[currentDiagCorner]}缺口) — 点击/拖拽画布放置`,
    'erase':       '模式: 擦除 — 点击/拖拽画布清除墙体或箱子',
    'place_hero':  '模式: 放置角色 — 点击空地放置角色',
    'place_ball':  '模式: 放置球 — 点击空地放置球（不能和角色/箱子同格）',
    'place_crate': `模式: 放置${CRATES[currentCrateKey].name} — 点击空地放置`,
    'web':         '模式: 蜘蛛网 — 点击/拖拽在空地上放置蜘蛛网',
    'plate':       '模式: 踏板 — 点击空地放置踏板',
    'liftwall':    `模式: 升降墙(${currentLiftType === 'up' ? '↑上升型' : '↓下降型'}) — 点击空地放置`,
    'wire':        '模式: 引线 — 点击踏板然后点击升降墙连线',
    'play':        '模式: 操控 — 方向键/WASD 移动角色'
  };
  const activeBtns = {
    'wall': btnWall, 'diag': btnDiag, 'erase': btnErase,
    'place_hero': btnHero, 'place_ball': btnBall, 'place_crate': btnCrate, 'web': btnWeb, 'plate': btnPlate, 'liftwall': btnLiftwall, 'wire': btnWire, 'play': btnPlay
  };

  activeBtns[newMode].classList.add('active');
  if (newMode === 'place_crate') updateCrateBtn();
  if (newMode === 'diag') updateDiagBtn();
  if (newMode === 'wire') wireStart = null;
  if (newMode === 'liftwall') updateLiftBtn();
  statusEl.textContent = modeLabels[newMode];
  render();
}

function updateCrateBtn() {
  const type = CRATES[currentCrateKey];
  btnCrate.textContent = `${type.emoji} ${type.name} [6]`;
}

function updateDiagBtn() {
  btnDiag.textContent = `${DIAG_SYMBOLS[currentDiagCorner]} 斜角墙 [7]`;
}

function updateLiftBtn() {
  btnLiftwall.textContent = currentLiftType === 'up' ? '⇅ 升墙(↑) [0]' : '⇅ 降墙(↓) [0]';
}

// 按钮点击：切换模式 / 循环切换子类型
document.querySelectorAll('#toolbar button[data-mode]').forEach(b =>
  b.addEventListener('click', () => {
    if (b.dataset.mode === 'place_crate' && mode === 'place_crate') {
      const keys = Object.keys(CRATES);
      const idx = keys.indexOf(currentCrateKey);
      currentCrateKey = keys[(idx + 1) % keys.length];
      updateCrateBtn();
      statusEl.textContent = `模式: 放置${CRATES[currentCrateKey].name} — 点击空地放置`;
      return;
    }
    if (b.dataset.mode === 'diag' && mode === 'diag') {
      const idx = DIAG_CORNERS.indexOf(currentDiagCorner);
      currentDiagCorner = DIAG_CORNERS[(idx + 1) % DIAG_CORNERS.length];
      updateDiagBtn();
      statusEl.textContent = `模式: 画斜角墙(${DIAG_SYMBOLS[currentDiagCorner]}缺口) — 点击/拖拽画布放置`;
      return;
    }
    if (b.dataset.mode === 'liftwall' && mode === 'liftwall') {
      currentLiftType = currentLiftType === 'up' ? 'down' : 'up';
      updateLiftBtn();
      statusEl.textContent = `模式: 升降墙(${currentLiftType === 'up' ? '↑上升型' : '↓下降型'}) — 点击空地放置`;
      return;
    }
    setMode(b.dataset.mode);
  }));

// === 导出 ===
function exportMap() {
  const tiles = grid.map(row => [...row]);
  for (const crate of crates.values()) {
    tiles[crate.row][crate.col] = Object.keys(CRATES).indexOf(crate.crateKey) + 2;
  }
  const diagData = {};
  for (const [k, v] of diagCorners) diagData[k] = v;
  const data = {
    width: GRID_SIZE,
    height: GRID_SIZE,
    tiles: tiles,
    diagCorners: diagData,
    heroStart: hero ? { row: hero.row, col: hero.col } : null,
    ballStart: ball ? { row: ball.row, col: ball.col } : null,
    webTiles: [...webTiles],
    plateTiles: [...plateTiles],
    liftWalls: Object.fromEntries(liftWalls),
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
      grid[r][c] = T_EMPTY;
    }
  }
  hero = null;
  ball = null;
  crates.clear();
  currentCrateKey = 'wood';
  waterTiles.clear();
  webTiles.clear();
  plateTiles.clear();
  liftWalls.clear();
  wireLinks.length = 0;
  wireStart = null;
  diagCorners.clear();
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
const KEY_MODE = { '1':'wall','2':'erase','3':'place_hero','4':'play','5':'place_ball','6':'place_crate','7':'diag','8':'web','9':'plate','0':'liftwall','-':'wire' };

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (KEY_MODE[e.key]) { setMode(KEY_MODE[e.key]); return; }

  if (mode === 'play' && hero) {
    const dir = KEY_DIR[e.key];
    if (dir) {
      e.preventDefault();
      if (tryMoveHero(dir.dr, dir.dc)) {
        meltSnow();
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
