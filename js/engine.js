// === 常量 ===
const CANVAS_SIZE = 512;
const GRID_SIZE = 16;
const TILE_SIZE = CANVAS_SIZE / GRID_SIZE; // 32px

// 地块类型
const T_EMPTY = 0;
const T_WALL  = 1;

// === 实体类 ===
class Entity {
  constructor(row, col) { this.row = row; this.col = col; this.height = 0; this.selfHeight = 1; }
}
class Hero  extends Entity {}
class Ball  extends Entity {
  constructor(row, col) { super(row, col); this.lightOn = true; }
  toggle() { this.lightOn = !this.lightOn; }
}
class Crate extends Entity {
  constructor(row, col, crateKey) { super(row, col); this.crateKey = crateKey; }
}

// === 箱子注册表（扩展新箱子只需在这里加一项） ===
const CRATES = {
  wood: { name: '木箱', emoji: '📦' },
  snow: { name: '雪块', emoji: '❄️' },
};

// === 斜角墙常量 ===
const DIAG_CORNERS = ['TL', 'TR', 'BL', 'BR'];
const DIAG_SYMBOLS = { TL: '◤', TR: '◥', BL: '◣', BR: '◢' };

// === 状态 ===
let mode = 'wall';          // 'wall' | 'erase' | 'place_hero' | 'place_ball' | 'play' | ...
let grid = [];              // grid[row][col]: 0=空地, 1=墙体
let hero = null;            // Hero | null
let ball = null;            // Ball | null
const crates = new Map();   // "row,col" -> Crate
let currentCrateKey = 'wood'; // 当前选中的箱子类型
let currentDiagCorner = 'TL'; // 当前斜角墙缺口朝向
let waterTiles = new Set();   // 有水贴图的空地坐标 "row,col"
let webTiles = new Set();     // 有蜘蛛网的空地坐标 "row,col"
const plateTiles = new Set(); // 踏板位置 "row,col"
const liftWalls = new Map();  // 升降墙位置 "row,col" → 'up'|'down'
let currentLiftType = 'up';   // 当前放置类型
const wireLinks = [];         // [{plate: "r,c", wall: "r,c"}, ...]
let wireStart = null;         // 引线模式：选中的踏板key
const diagCorners = new Map(); // "row,col" → 'TL'|'TR'|'BL'|'BR'  斜角墙缺口朝向
let isDrawing = false;        // 鼠标拖拽中
let hoverCell = null;         // {row, col} | null  鼠标悬停格子

// === 状态初始化 ===
function initGrid() {
  grid = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    grid[r] = new Array(GRID_SIZE).fill(T_EMPTY);
  }
}
initGrid();

// === 工具函数 ===
const K = (r, c) => `${r},${c}`;
const dist = (r1, c1, r2, c2) => Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));

function crateAt(r, c)     { return crates.get(K(r, c) + ':1') || crates.get(K(r, c)) || null; } // 优先返回上层箱子
function cratesAt(r, c)    { const a = []; const b = crates.get(K(r, c)); if (b) a.push(b); const t = crates.get(K(r, c) + ':1'); if (t) a.push(t); return a; }
function entityAt(r, c) {
  if (hero && hero.row === r && hero.col === c) return hero;
  if (ball && ball.row === r && ball.col === c) return ball;
  return crateAt(r, c);
}
// entityForPush: 推链专用，排除主角。箱子取底层（上层跟随移动）
function entityForPush(r, c) {
  if (ball && ball.row === r && ball.col === c) return ball;
  return crates.get(K(r, c)) || crates.get(K(r, c) + ':1') || null;
}
function isSolid(r, c)     { return grid[r][c] === T_WALL || crateAt(r, c) !== null; }

// crates快照（回滚用）
function snapshotCrates() {
  const snap = new Map();
  for (const [k, v] of crates) snap.set(k, new Crate(v.row, v.col, v.crateKey));
  return snap;
}
function restoreCrates(snap) { crates.clear(); for (const [k, v] of snap) crates.set(k, v); }

// 链式推动：从(r,c)沿(dr,dc)扫描，返回可推动的实体链。null=阻塞。pusherHeight=推动者脚底高度，可在首实体上叠时返回空链
function getPushChain(r, c, dr, dc, pusherHeight = -1) {
  const chain = [];
  let stepHeight = pusherHeight; // 尝试踩上该位置实体的脚底高度
  while (true) {
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return null;
    if (grid[r][c] === T_WALL && !(liftWalls.has(K(r, c)) && stepHeight >= tileFootLevel(r, c))) return null;
    const ent = entityForPush(r, c);
    if (ent && webTiles.has(K(r, c))) return null;
    if (!ent) return chain;
    // 推动者（或链中上一实体）可站到该实体上方 → 不推，返回当前链
    if (stepHeight >= ent.height + ent.selfHeight) return chain;
    if (stepHeight !== ent.height) return null;
    chain.push(ent);
    stepHeight = ent.height; // 被推实体的当前脚底高度传给下一格判定
    r += dr; c += dc;
  }
}

// 执行链式推动：从后往前移动chain中所有实体（crate同步更新Map key，叠箱同移）
function pushChain(chain, dr, dc) {
  for (let i = chain.length - 1; i >= 0; i--) {
    const ent = chain[i];
    const newR = ent.row + dr, newC = ent.col + dc;
    if (ent instanceof Crate) {
      const oldKey = K(ent.row, ent.col);
      const stackedKey = oldKey + ':1';
      const atBottom = crates.get(oldKey) === ent;
      const atTop = crates.get(stackedKey) === ent;
      let stacked = null;
      if (atBottom) {
        stacked = crates.get(stackedKey);
      } else if (atTop) {
        stacked = crates.get(oldKey);
      }
      if (atBottom) crates.delete(oldKey);
      if (atTop) crates.delete(stackedKey);
      if (stacked) {
        const sk = K(stacked.row, stacked.col);
        crates.delete(sk);
        crates.delete(sk + ':1');
      }
      ent.row = newR; ent.col = newC;
      const destKey = K(newR, newC);
      const destHadCrate = crates.has(destKey);
      if (destHadCrate) {
        crates.set(destKey + ':1', ent);
      } else {
        crates.set(destKey, ent);
      }
      if (stacked) {
        stacked.row = newR; stacked.col = newC;
        if (!destHadCrate) {
          crates.set(destKey + ':1', stacked);
        }
      }
    } else {
      ent.row = newR; ent.col = newC;
    }
  }
}

// === 实体层序与高度 ===
function entityPriority(ent) {
  if (ent instanceof Hero) return 3;
  if (ent instanceof Ball) return 2;
  if (ent instanceof Crate) return 1;
  return 0;
}

// 返回(r,c)处除self外的实体（用于判断脚下堆叠）。高度更低或在同高度下层序更低才算脚下
function entityUnder(r, c, self) {
  const allCrates = cratesAt(r, c);
  if (allCrates.length === 2 && allCrates[1] === self) return allCrates[0];
  const check = (ent) => {
    if (!ent || ent === self || ent.row !== r || ent.col !== c) return false;
    return ent.height < self.height ||
          (ent.height === self.height && entityPriority(ent) < entityPriority(self));
  };
  if (check(ball))   return ball;
  if (check(hero))   return hero;
  const crate = crateAt(r, c);
  if (check(crate))  return crate;
  return null;
}

// 格子脚底高度 = 格子基础高度(暂0) + 升降墙上升态加成(1)
function tileFootLevel(r, c) {
  let level = 0;
  if (liftWalls.has(K(r, c)) && grid[r][c] === T_WALL) level += 1;
  return level;
}

// 更新单个实体脚底高度：格子高度，或站在别的实体上→底高+该实体自身高度
function updateEntityHeight(ent) {
  if (!ent) return;
  const r = ent.row, c = ent.col;
  const under = entityUnder(r, c, ent);
  if (under) {
    ent.height = under.height + under.selfHeight;
  } else {
    ent.height = tileFootLevel(r, c);
  }
}

// 自底向上更新全部实体高度：crate → ball → hero
function updateAllHeights() {
  for (const crate of crates.values()) updateEntityHeight(crate);
  if (ball) updateEntityHeight(ball);
  if (hero) updateEntityHeight(hero);
}

// === 升降墙系统 ===
function updateLiftWalls() {
  const wallPlates = new Map();
  for (const wkey of liftWalls.keys()) {
    wallPlates.set(wkey, new Set());
  }
  for (const link of wireLinks) {
    if (wallPlates.has(link.wall)) {
      wallPlates.get(link.wall).add(link.plate);
    }
  }
  for (const [wkey, plates] of wallPlates) {
    const [wr, wc] = wkey.split(',').map(Number);
    const allPressed = plates.size > 0 && [...plates].every(pk => {
      const [pr, pc] = pk.split(',').map(Number);
      return entityAt(pr, pc) !== null;
    });
    const type = liftWalls.get(wkey) || 'up';
    if (type === 'up') {
      if (allPressed) grid[wr][wc] = T_WALL;
      else grid[wr][wc] = T_EMPTY;
    } else {
      if (allPressed) grid[wr][wc] = T_EMPTY;
      else grid[wr][wc] = T_WALL;
    }
  }
}

// === 雪块融化 ===
function meltSnow() {
  if (!ball || !ball.lightOn) return;
  for (const [key, crate] of crates) {
    if (crate.crateKey !== 'snow') continue;
    if (dist(ball.row, ball.col, crate.row, crate.col) <= 1) {
      crates.delete(key);
      if (!key.endsWith(':1')) {
        const topKey = key + ':1';
        const topCrate = crates.get(topKey);
        if (topCrate) {
          crates.delete(topKey);
          crates.set(key, topCrate);
        }
      }
      waterTiles.add(key.endsWith(':1') ? key.slice(0, -2) : key);
    }
  }
}

// === 移动系统 ===

// 斜角墙拐角→缺口映射
function diagCornersFor(dr, dc) {
  if (dr === -1 && dc === -1) return ['BL', 'TR'];
  if (dr === -1 && dc ===  1) return ['BR', 'TL'];
  if (dr ===  1 && dc === -1) return ['TL', 'BR'];
  if (dr ===  1 && dc ===  1) return ['TR', 'BL'];
  return null;
}

// 绳子跟随：主角移动后球尝试跟上，返回false则主角需撤销移动
function followBall(prevRow, prevCol) {
  if (!ball) return true;
  if (dist(hero.row, hero.col, ball.row, ball.col) <= 1) return true;
  if (webTiles.has(K(ball.row, ball.col))) return false;

  const prevBallRow = ball.row, prevBallCol = ball.col;
  const dr = Math.sign(prevRow - ball.row);
  const dc = Math.sign(prevCol - ball.col);
  const candidates = [];
  const diagRow = ball.row + dr;
  const diagCol = ball.col + dc;

  let diagCorner = null;
  let diagOk = dr === 0 || dc === 0;
  if (!diagOk) {
    const c1r = diagRow, c1c = ball.col;
    const c2r = ball.row, c2c = diagCol;
    const c1chain = getPushChain(c1r, c1c, dr, 0, ball.height);
    const c2chain = getPushChain(c2r, c2c, 0, dc, ball.height);
    const needed = diagCornersFor(dr, dc);
    const c1clear = grid[c1r] && (!isSolid(c1r, c1c) || c1chain !== null
                                   || (needed && diagCorners.get(K(c1r, c1c)) === needed[0]));
    const c2clear = grid[c2r] && (!isSolid(c2r, c2c) || c2chain !== null
                                   || (needed && diagCorners.get(K(c2r, c2c)) === needed[1]));
    if (c1clear && c2clear) {
      diagOk = true;
      diagCorner = { c1chain, c2chain };
    }
  }
  if (diagOk) candidates.push({ row: diagRow, col: diagCol, pushDr: dr, pushDc: dc, corner: diagCorner });
  if (dr !== 0 && dc !== 0) {
    candidates.push({ row: diagRow, col: ball.col, pushDr: dr, pushDc: 0 });
    candidates.push({ row: ball.row, col: diagCol, pushDr: 0,  pushDc: dc });
  }

  const isValid = (c) =>
    c.row >= 0 && c.row < GRID_SIZE && c.col >= 0 && c.col < GRID_SIZE &&
    dist(hero.row, hero.col, c.row, c.col) <= 1;

  // 第一轮：推箱子或堆叠移动
  for (const c of candidates) {
    if (!isValid(c)) continue;
    const chain = getPushChain(c.row, c.col, c.pushDr, c.pushDc, ball.height);
    if (chain === null) continue;

    const needsCorner = c.corner && (c.corner.c1chain || c.corner.c2chain);
    const needsPush = chain.length > 0;

    if (needsCorner) {
      if (c.corner.c1chain) pushChain(c.corner.c1chain, dr, 0);
      if (c.corner.c2chain) pushChain(c.corner.c2chain, 0, dc);
    }
    if (needsPush) pushChain(chain, c.pushDr, c.pushDc);
    ball.row = c.row; ball.col = c.col;
    break;
  }

  // 第二轮：纯移动（允许堆叠到实体上）
  if (dist(hero.row, hero.col, ball.row, ball.col) > 1) {
    for (const c of candidates) {
      if (!isValid(c)) continue;
      const ent = entityForPush(c.row, c.col);
      const canStep = !ent || ball.height >= ent.height + ent.selfHeight;
      const targetFoot = tileFootLevel(c.row, c.col);
      const canAccess = grid[c.row][c.col] !== T_WALL || (liftWalls.has(K(c.row, c.col)) && ball.height >= targetFoot);
      if (canStep && canAccess) {
        ball.row = c.row; ball.col = c.col;
        break;
      }
    }
  }

  if (dist(hero.row, hero.col, ball.row, ball.col) > 1) {
    ball.row = prevBallRow; ball.col = prevBallCol;
    return false;
  }
  return true;
}

// 尝试移动主角：快照→推箱→移动→跟随→失败回滚。返回 true=成功
function tryMoveHero(dr, dc) {
  if (webTiles.has(K(hero.row, hero.col))) return false;
  const nr = hero.row + dr, nc = hero.col + dc;

  if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return false;
  const targetFoot = tileFootLevel(nr, nc);
  if (grid[nr][nc] === T_WALL && !(liftWalls.has(K(nr, nc)) && hero.height >= targetFoot)) return false;

  // 主角高度 >= 目标实体顶面 → 站到同格上方（不推动）
  const targetEnt = entityAt(nr, nc);
  if (targetEnt && hero.height >= targetEnt.height + targetEnt.selfHeight) {
    const prevRow = hero.row, prevCol = hero.col;
    hero.row = nr; hero.col = nc;
    if (!followBall(prevRow, prevCol)) {
      hero.row = prevRow; hero.col = prevCol;
      if (ball) ball.toggle();
      return false;
    }
    return true;
  }

  // 站上升降墙
  if (grid[nr][nc] === T_WALL && liftWalls.has(K(nr, nc)) && !targetEnt) {
    const prevRow = hero.row, prevCol = hero.col;
    hero.row = nr; hero.col = nc;
    if (!followBall(prevRow, prevCol)) {
      hero.row = prevRow; hero.col = prevCol;
      if (ball) ball.toggle();
      return false;
    }
    return true;
  }

  // 同格双箱：跨不过上层但能站到下层上方 → 只推上层箱子
  const bottomCrate = crates.get(K(nr, nc));
  const topCrate = crates.get(K(nr, nc) + ':1');
  if (bottomCrate && topCrate && targetEnt === topCrate &&
      hero.height >= bottomCrate.height + bottomCrate.selfHeight) {
    const topDestR = nr + dr, topDestC = nc + dc;
    const topChain = getPushChain(topDestR, topDestC, dr, dc, topCrate.height);
    if (topChain !== null) {
      const savedCrates = snapshotCrates();
      const savedHero = { row: hero.row, col: hero.col };
      const savedBall = ball ? { row: ball.row, col: ball.col } : null;
      const prevRow = hero.row, prevCol = hero.col;
      if (topChain.length > 0) pushChain(topChain, dr, dc);
      crates.delete(K(nr, nc) + ':1');
      topCrate.row = topDestR; topCrate.col = topDestC;
      const destKey = K(topDestR, topDestC);
      if (crates.has(destKey)) {
        crates.set(destKey + ':1', topCrate);
      } else {
        crates.set(destKey, topCrate);
      }
      hero.row = nr; hero.col = nc;
      if (!followBall(prevRow, prevCol)) {
        restoreCrates(savedCrates);
        if (ball) { ball.row = savedBall.row; ball.col = savedBall.col; }
        hero.row = savedHero.row; hero.col = savedHero.col;
        ball.toggle();
        return false;
      }
      return true;
    }
  }

  // 链式推动扫描
  const chain = getPushChain(nr, nc, dr, dc, hero.height);
  if (chain === null) return false;

  const savedCrates = snapshotCrates();
  const savedHero = { row: hero.row, col: hero.col };
  const savedBall = ball ? { row: ball.row, col: ball.col } : null;

  const prevRow = hero.row, prevCol = hero.col;
  pushChain(chain, dr, dc);
  hero.row = nr; hero.col = nc;

  if (!followBall(prevRow, prevCol)) {
    restoreCrates(savedCrates);
    if (ball) { ball.row = savedBall.row; ball.col = savedBall.col; }
    hero.row = savedHero.row; hero.col = savedHero.col;
    ball.toggle();
    return false;
  }
  return true;
}
