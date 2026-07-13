// 提取自 js/engine.js

let grid = [];              // grid[row][col]: Tile 对象
let hero = null;            // Hero | null
let ball = null;            // Ball | null
const crates = new Map();   // "row,col" -> Crate
const wireLinks = [];       // [{plate: "r,c", wall: "r,c"}, ...]

function initGrid() {
  grid = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    grid[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      grid[r][c] = new Tile();
    }
  }
}
initGrid();

const K = (r, c) => `${r},${c}`;
const dist = (r1, c1, r2, c2) => Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));

// --- 统一实体迭代（消除 hero/ball/crates 分支） ---

function* allEntities() {
  if (hero) yield hero;
  if (ball) yield ball;
  for (const c of crates.values()) yield c;
}

function entitiesAt(r, c) {
  const result = [];
  if (hero && hero.row === r && hero.col === c) result.push(hero);
  if (ball && ball.row === r && ball.col === c) result.push(ball);
  const key = K(r, c);
  const b = crates.get(key); if (b) result.push(b);
  const t = crates.get(key + ':1'); if (t) result.push(t);
  return result;
}

// --- 向后兼容的查询函数 ---

function crateAt(r, c) {
  const key = K(r, c);
  return crates.get(key + ':1') || crates.get(key) || null;
}

function cratesAt(r, c) {
  const a = [];
  const key = K(r, c);
  const b = crates.get(key); if (b) a.push(b);
  const t = crates.get(key + ':1'); if (t) a.push(t);
  return a;
}

function entityAt(r, c) {
  if (hero && hero.row === r && hero.col === c) return hero;
  if (ball && ball.row === r && ball.col === c) return ball;
  return crateAt(r, c);
}

function entityCount(r, c) {
  let n = 0;
  if (hero && hero.row === r && hero.col === c) n++;
  if (ball && ball.row === r && ball.col === c) n++;
  n += cratesAt(r, c).length;
  return n;
}

function entityForPush(r, c, atHeight) {
  const key = K(r, c);
  const b = crates.get(key);
  if (b && b.height === atHeight) return b;
  const t = crates.get(key + ':1');
  if (t && t.height === atHeight) return t;
  if (ball && ball.row === r && ball.col === c && ball.height === atHeight) return ball;
  return null;
}

function isSolid(r, c) {
  // 可推动实体也算障碍
  const es = entitiesAt(r, c);
  for (const e of es) if (e.has(TRAITS.PUSHABLE)) return true;
  return grid[r][c].base === T_WALL;
}

function snapshotCrates() {
  const snap = new Map();
  for (const [k, v] of crates) snap.set(k, new Crate(v.row, v.col, v.crateKey));
  return snap;
}

function restoreCrates(snap) {
  crates.clear();
  for (const [k, v] of snap) crates.set(k, v);
}
