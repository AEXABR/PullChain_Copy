# Emergent Engine：消除特判，让机制自然涌现

## 目标

将 engine 中通过 if-else 特判实现的游戏机制，重构为通过多态、策略、事件驱动等模式让行为从对象自身"自然涌现"，消除外部硬编码分支。

## 核心原则

**外部 if-else 分支 → 对象自己知道该做什么。** 每一种特判都是因为外部代码在替对象做决定。把决策权还给对象，分支就消失了。

---

## 第 1 类：实体存储分支

### 现状

`moveEntityInMap` (physics.js:40-61) 通过 `if (ent.kind === 'crate')` 判断实体类型：
- crate → 操作 `crates` Map（处理堆叠 key `:1`）
- hero/ball → 直接改 `row/col` 属性

### 方案

给 Entity 基类加 `moveTo(r, c)` 多态方法，子类各自覆盖：

```
Entity.moveTo(r, c)    → 默认改 row/col
Crate.moveTo(r, c)     → 更新 crates Map，处理堆叠
```

堆叠逻辑（底层/上层 key 切换）封装在 Crate 内部，外部不感知。

### 消除的特判

`if (ent.kind === 'crate')` 整段分支，以及 `oldKey + ':1'` 这样的堆叠编码细节外泄。

### 影响范围

`moveEntityInMap` 及其调用方：`pushChain`、`moveRiders`、`processFliers`、`tryMoveHero`、`followBall`。

---

## 第 2 类：升降墙状态分支

### 现状

`updateLiftWalls` (physics.js:112-155) 通过 `if (tile.liftWall === 'auto')` / `=== 'down'` 字符串判断，分别走三种激活逻辑。天花板检查也内嵌在同一个函数里。

### 方案

`tile.liftWall` 从字符串改为策略对象：

```js
const WallBehaviors = {
  up: {
    wantsActivated(tile, plates) { /* 所有踏板被踩下 */ },
    wallWhenActivated: true,
  },
  down: {
    wantsActivated(tile, plates) { /* 所有踏板被踩下 */ },
    wallWhenActivated: false,  // 激活时反而是空地
  },
  auto: {
    wantsActivated(tile, plates) { /* 格子上有实体 */ },
    wallWhenActivated: true,
  },
};
```

`updateLiftWalls` 变为统一循环：调用 `behavior.wantsActivated()` → 检查天花板 → 设置 `tile.base`。

天花板检查也内化到 Tile 方法：`tile.wouldExceedCeiling()`。

### 消除的特判

`if (tile.liftWall === 'auto')`、`if (tile.liftWall === 'down')`、`const wouldBeWall = ... ? ... : ...` 的三元嵌套。

---

## 第 3 类：豁免/例外

### 现状

- `updateEntityHeight` (physics.js:29) — `if (ent.has(TRAITS.FLYING)) return` 跳过落地
- `syncFlyingHeight` (physics.js:88-99) — 飞行实体只站在实体/升降墙上，不落裸地
- `updateLiftWalls` (physics.js:147) — `!tile.hasSkylight` 豁免天花板检查

### 方案

把豁免逻辑内化到对象自身方法：

```
ent.wantsGroundSnap()    → 地面实体 true，飞行实体 false
tile.ceilingHeight()     → 普通格 CEILING(2)，天窗格 Infinity
tile.effectsOn(entity)   → 已有，web 对 FLYING 实体不产生 rooted
```

外部统一循环不再包含"如果是飞行实体就跳过"或"如果是天窗就跳过"的判断，只调用方法。

### 消除的特判

`if (FLYING) return`、`!hasSkylight &&` 条件短路。

---

## 第 4 类：多策略回退

### 现状

`tryMoveHero` (movement.js:121-225)：先尝试 `getPushChain(hero.height)`，失败则遍历骑乘高度 `getPushChain(riderHeight)`。

`followBall` (movement.js:41-119)：先尝试推动路径，失败则尝试"不推只移动"的简化路径，再失败则回退原位。

### 方案

策略链模式。定义策略列表，按优先级尝试：

```js
const strategies = [
  { name: 'direct',    try: () => tryPushAt(hero.height) },
  { name: 'riderH',    try: () => tryRiderHeights() },
  { name: 'stepOnly',  try: () => tryMoveWithoutPush() },
];
for (const s of strategies) {
  const result = s.try();
  if (result.success) return result;
  if (result.fatal) return false;  // 不可恢复的失败
}
return false;
```

`followBall` 同理：策略链包含"推动路径"→"不推只移"→"回退"。

### 消除的特判

`if (chain.length === 0)` 的 for 循环回退块；`followBall` 的第二遍 candidates 遍历（"fallback without push"）；第三次的"revert position"。

---

## 第 5 类：Null 检查

### 现状

- `followBall` 开头 `if (!ball) return true`
- `processFliers` 里 `if (!target.lightOn) return`
- 多处 `ball ? ... : null` 三元保护

### 方案

**事件驱动的行为注册**。跟随行为只在关联实体存在时才注册：

```js
// ball 创建时注册
if (ball) on('heroMoved', followBall);
// ball 销毁时注销
if (!ball) off('heroMoved', followBall);
```

`processFliers` 已有部分——开头检查 `sources.length === 0` 就 return。进一步：光源状态变更时注册/注销 flier 行为。

### 消除的特判

`if (!ball)` 守卫——因为 handler 根本不会被调用。`if (!target.lightOn)` 同理。

---

## 第 6 类：硬编码交互序列

### 现状

`tryMoveHero` 末尾硬编码：移动 → `followBall` → 失败回退。主循环硬编码：移动 → `updateLiftWalls` → `updateAllHeights` → `processFliers` → `emit('turnEnd')`。

新增"会跟随主角的实体"需要改 movement.js；新增"回合结束时触发的机制"需要改主循环。

### 方案

扩展现有事件系统（events.js 已有 `on/off/emit`），主循环变为：

```js
emit('beforeMove', { dr, dc });
const moved = tryMoveHero(dr, dc);
if (moved) {
  emit('afterMove', { dr, dc });
  emit('turnEnd');
}
```

各行为独立注册：
- Leash 行为 → `on('afterMove', ...)` 
- 升降墙 → `on('afterMove', updateLiftWalls)`
- 高度同步 → `on('afterMove', updateAllHeights)`
- 飞蛾飞行 → `on('turnEnd', processFliers)`
- 融雪 → `on('turnEnd', meltSnow)` （已有）

### 消除的特判

主循环中 `followBall(...)`、`updateLiftWalls()`、`updateAllHeights()`、`processFliers()` 的硬编码调用序列。

---

## 不改的部分

以下 if 判断表达的是**游戏规则本身**，不应消除：

- `tile.isSolidAt(height)` — 墙的定义
- `height < targetFoot` — 高差阻挡
- `dist(hero, ball) <= 1` — 绳子长度约束
- `tile.effectsOn(ent).rooted` — 蜘蛛网定身
- `hasLineOfSight` — 视线遮挡

---

## 实施顺序

| 步骤 | 类别 | 理由 |
|------|------|------|
| 1 | 实体存储分支 | 影响面最小，多态效果立竿见影 |
| 2 | 豁免/例外 | 方法内化，简单直接 |
| 3 | 升降墙策略 | 引入策略对象，承上启下 |
| 4 | 事件驱动交互 | 扩展事件系统，行为模块化 |
| 5 | Null 检查消除 | 依赖第 4 步的事件注册/注销 |
| 6 | 多策略回退 | 最复杂，留到最后 |

每步完成后在浏览器中验证游戏正常运行，commit 后再进行下一步。

---

## 风险控制

- 每步一个 commit，出问题 `git reset --hard` 即可回退
- 优先改内部实现，不改变外部行为
- 每一步完成后手动测试：移动、推箱子、球跟随、飞蛾飞行、升降墙、融雪
- 不做大爆炸式重构
