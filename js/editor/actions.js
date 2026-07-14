// 提取自 js/editor.js

// 拖拽擦除时记录上一个擦除的格子，避免重复擦除
let lastErasedKey = null;

function setTile(row, col, value) {
  if (value === T_WALL || value === T_EMPTY) {
    const ent = entityAt(row, col);
    if (ent && ent.kind === 'hero') {
      hero = null;
      statusEl.textContent = '⚠ 角色被覆盖，已移除角色';
    } else if (ent && ent.kind === 'ball') {
      ball = null;
      statusEl.textContent = '⚠ 球被覆盖，已移除球';
    } else if (ent && ent.kind === 'crate') {
      crates.delete(K(row, col));
      crates.delete(K(row, col) + ':1');
    }
    grid[row][col].reset();
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

function placeDiagWall(row, col) {
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
  const type = CRATES[editor.currentCrateKey];
  crate.height = topHeightAt(row, col, crate);
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
  const typeLabels = { up: '上升型(默认下降)', down: '下降型(默认升起)', auto: '🟣自动型(实体踩上升起)' };
  statusEl.textContent = `⇅ 升降墙已放置(${typeLabels[editor.currentLiftType]})`;
}

function placeHighland(row, col) {
  const tile = grid[row][col];
  if (tile.base === T_WALL) {
    statusEl.textContent = '⚠ 不能把高地放在墙体上！';
    return;
  }
  if (tile.hasHighland) {
    statusEl.textContent = '⚠ 此处已有高地！';
    return;
  }
  tile.hasHighland = true;
  tile.hasWater = false;
  render();
  statusEl.textContent = '⛰️ 高地已放置（高度+1）';
}

function placeSkylight(row, col) {
  const tile = grid[row][col];
  if (tile.base === T_WALL) {
    statusEl.textContent = '⚠ 不能把天窗放在墙体上！';
    return;
  }
  if (tile.hasSkylight) {
    statusEl.textContent = '⚠ 此处已有天窗！';
    return;
  }
  tile.hasSkylight = true;
  render();
  statusEl.textContent = '🔲 天窗已放置（取消高度上限）';
}

// 擦除优先级策略表（从高到低，首个命中即执行）
const ERASE_ACTIONS = [
  {
    test: (r, c) => hero && hero.row === r && hero.col === c,
    action: (r, c) => { hero = null; return '🗑 角色已擦除'; },
  },
  {
    test: (r, c) => ball && ball.row === r && ball.col === c,
    action: (r, c) => { ball = null; return '🗑 球已擦除'; },
  },
  {
    test: (r, c) => crates.has(K(r, c) + ':1'),
    action: (r, c) => { crates.delete(K(r, c) + ':1'); return '🗑 上层箱子已擦除'; },
  },
  {
    test: (r, c) => crates.has(K(r, c)),
    action: (r, c) => { crates.delete(K(r, c)); return '🗑 箱子已擦除'; },
  },
  {
    test: (r, c) => grid[r][c].hasWeb,
    action: (r, c) => { grid[r][c].hasWeb = false; return '🗑 蜘蛛网已擦除'; },
  },
  {
    test: (r, c) => grid[r][c].isPlate,
    action: (r, c) => {
      grid[r][c].isPlate = false;
      const key = K(r, c);
      for (let i = wireLinks.length - 1; i >= 0; i--) {
        if (wireLinks[i].plate === key) wireLinks.splice(i, 1);
      }
      if (editor.wireStart === key) editor.wireStart = null;
      return '🗑 踏板已擦除';
    },
  },
  {
    test: (r, c) => grid[r][c].liftWall !== null,
    action: (r, c) => {
      grid[r][c].liftWall = null;
      grid[r][c].base = T_EMPTY;
      const key = K(r, c);
      for (let i = wireLinks.length - 1; i >= 0; i--) {
        if (wireLinks[i].wall === key) wireLinks.splice(i, 1);
      }
      if (editor.wireStart === key) editor.wireStart = null;
      return '🗑 升降墙已擦除';
    },
  },
  {
    test: (r, c) => grid[r][c].base === T_WALL && grid[r][c].diagCorner && grid[r][c].diagCorner.length > 0,
    action: (r, c) => { grid[r][c].diagCorner = null; return '🗑 斜角缺口已擦除（保留墙体）'; },
  },
  {
    test: (r, c) => grid[r][c].base === T_WALL,
    action: (r, c) => { grid[r][c].base = T_EMPTY; return '🗑 墙体已擦除'; },
  },
  {
    test: (r, c) => grid[r][c].hasHighland,
    action: (r, c) => { grid[r][c].hasHighland = false; return '🗑 高地已擦除'; },
  },
  {
    test: (r, c) => grid[r][c].hasSkylight,
    action: (r, c) => { grid[r][c].hasSkylight = false; return '🗑 天窗已擦除'; },
  },
  {
    test: (r, c) => grid[r][c].hasWater,
    action: (r, c) => { grid[r][c].hasWater = false; return '🗑 水渍已擦除'; },
  },
];

function eraseTop(row, col) {
  for (const entry of ERASE_ACTIONS) {
    if (entry.test(row, col)) {
      statusEl.textContent = entry.action(row, col);
      render();
      return;
    }
  }
  statusEl.textContent = '该格已空，无可擦除';
}

function placeHero(row, col) {
  const tile = grid[row][col];
  if (tile.base === T_WALL && tile.liftWall === null) {
    statusEl.textContent = '⚠ 不能把角色放在墙体上！';
    return;
  }
  hero = new Hero(row, col);
  hero.height = topHeightAt(row, col, hero);
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
  ball.height = topHeightAt(row, col, ball);
  setMode('play');
  statusEl.textContent = '✅ 球已放置！方向键/WASD 移动角色';
  render();
}

const PLACE_ACTIONS = {
  wall:        (r, c) => setTile(r, c, T_WALL),
  diag:        (r, c) => placeDiagWall(r, c),
  erase:       (r, c) => eraseTop(r, c),
  place_hero:  (r, c) => placeHero(r, c),
  place_ball:  (r, c) => placeBall(r, c),
  place_crate: (r, c) => placeCrate(r, c),
  web:         (r, c) => placeWeb(r, c),
  plate:       (r, c) => placePlate(r, c),
  liftwall:    (r, c) => placeLiftWall(r, c),
  highland:  (r, c) => placeHighland(r, c),
  skylight:  (r, c) => placeSkylight(r, c),
};
