// 轻量事件系统 — 让交互自然涌现，不靠特判

const _listeners = new Map(); // eventName -> Set<callback>

function on(event, fn) {
  if (!_listeners.has(event)) _listeners.set(event, new Set());
  _listeners.get(event).add(fn);
}

function off(event, fn) {
  _listeners.get(event)?.delete(fn);
}

function emit(event, data) {
  for (const fn of _listeners.get(event) || []) {
    fn(data);
  }
}

// --- 注册游戏机制（声明式，新增实体行为只需在此加 handler） ---

// 融化：光源旁带有 melts_in_light trait 的实体在回合结束时融化
on('turnEnd', () => {
  const sources = [];
  for (const ent of allEntities()) {
    if (ent.has(TRAITS.LIGHT_SOURCE) && ent.lightOn) sources.push(ent);
  }
  if (sources.length === 0) return;

  const toRemove = [];
  for (const ent of allEntities()) {
    if (!ent.has(TRAITS.MELTS_IN_LIGHT)) continue;
    for (const src of sources) {
      if (dist(src.row, src.col, ent.row, ent.col) <= 1) {
        toRemove.push(ent);
        break;
      }
    }
  }
  for (const ent of toRemove) {
    grid[ent.row][ent.col].hasWater = true;
    for (const [k, v] of crates) {
      if (v === ent) { crates.delete(k); break; }
    }
  }
});
