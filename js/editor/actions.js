// 提取自 js/editor.js

// 拖拽擦除时记录上一个擦除的格子，避免重复擦除
let lastErasedKey = null;

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
  const typeLabel = editor.currentLiftType === 'up' ? '上升型(默认下降)' : '下降型(默认升起)';
  statusEl.textContent = `⇅ 升降墙已放置(${typeLabel})`;
}

function placeDepression(row, col) {
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

function eraseTop(row, col) {
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
  depression:  (r, c) => placeDepression(r, c),
};
