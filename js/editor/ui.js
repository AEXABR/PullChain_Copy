// 提取自 js/editor.js

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

  PLACE_ACTIONS[editor.mode]?.(cell.row, cell.col);
}

function handleCanvasMove(e) {
  const cell = getCellFromEvent(e);
  const prev = editor.hoverCell;
  const changed = (prev && !cell) || (!prev && cell) || (prev && cell && (prev.row !== cell.row || prev.col !== cell.col));
  editor.hoverCell = cell;

  if (changed && HOVER_MODES.has(editor.mode)) {
    render();
    return;
  }

  if (!editor.isDrawing || !cell) return;

  if (DRAG_MODES.has(editor.mode)) {
    if (editor.mode === 'erase') {
      const k = K(cell.row, cell.col);
      if (k !== lastErasedKey) { lastErasedKey = k; eraseTop(cell.row, cell.col); }
    } else {
      PLACE_ACTIONS[editor.mode](cell.row, cell.col);
    }
  }
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

function setMode(newMode) {
  editor.isDrawing = false;
  editor.mode = newMode;
  allBtns.forEach(b => b.classList.remove('active'));

  activeBtns[newMode].classList.add('active');
  if (newMode === 'place_crate') updateCrateBtn();
  if (newMode === 'diag') updateDiagBtn();
  if (newMode === 'wire') editor.wireStart = null;
  if (newMode === 'liftwall') updateLiftBtn();

  const dynLabels = {
    'diag':        `模式: 画斜角墙(${DIAG_SYMBOLS[editor.currentDiagCorner]}缺口) — 点击/拖拽画布放置`,
    'place_crate': `模式: 放置${CRATES[editor.currentCrateKey].name} — 点击空地放置`,
    'liftwall':    `模式: 升降墙(${{up:'↑上升型',down:'↓下降型',auto:'🟣自动型'}[editor.currentLiftType]}) — 点击空地放置`,
  };
  statusEl.textContent = dynLabels[newMode] || modeLabels[newMode];
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
  const labels = { up: '⇅ 升墙(↑) [6]', down: '⇅ 降墙(↓) [6]', auto: '🟣 自动墙(A) [6]' };
  btnLiftwall.textContent = labels[editor.currentLiftType] || labels.up;
}

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
      const cycle = { up: 'down', down: 'auto', auto: 'up' };
      editor.currentLiftType = cycle[editor.currentLiftType];
      updateLiftBtn();
      const typeLabel = { up: '↑上升型', down: '↓下降型', auto: '🟣自动型' }[editor.currentLiftType];
      statusEl.textContent = `模式: 升降墙(${typeLabel}) — 点击空地放置`;
      return;
    }
    setMode(b.dataset.mode);
  }));

function exportMap() {
  const tiles = [];
  const diagData = {};
  const webArr = [];
  const plateArr = [];
  const liftData = {};
  const highlandArr = [];
  const skylightArr = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    tiles[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = grid[r][c];
      tiles[r][c] = tile.base;
      if (tile.diagCorner !== null) diagData[K(r, c)] = tile.diagCorner;
      if (tile.hasWeb) webArr.push(K(r, c));
      if (tile.isPlate) plateArr.push(K(r, c));
      if (tile.liftWall !== null) liftData[K(r, c)] = tile.liftWall;
      if (tile.hasHighland) highlandArr.push(K(r, c));
      if (tile.hasSkylight) skylightArr.push(K(r, c));
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
    highlandTiles: highlandArr,
    skylightTiles: skylightArr,
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

const KEY_DIR = {
  'ArrowUp':{dr:-1,dc:0},'w':{dr:-1,dc:0},'W':{dr:-1,dc:0},
  'ArrowDown':{dr:1,dc:0},'s':{dr:1,dc:0},'S':{dr:1,dc:0},
  'ArrowLeft':{dr:0,dc:-1},'a':{dr:0,dc:-1},'A':{dr:0,dc:-1},
  'ArrowRight':{dr:0,dc:1},'d':{dr:0,dc:1},'D':{dr:0,dc:1},
};
const KEY_MODE = { '1':'wall','2':'diag','3':'erase','4':'web','5':'plate','6':'liftwall','7':'highland','8':'place_hero','9':'place_ball','0':'place_crate','-':'wire','=':'skylight' };

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (KEY_MODE[e.key]) { setMode(KEY_MODE[e.key]); return; }

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
});
