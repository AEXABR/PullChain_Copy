---
name: entity-system
description: Entity 类体系——Hero/Ball/Crate、grid 存储、crates Map、waterTiles Set
metadata:
  type: project
---

# Entity 系统

## 类体系

```javascript
class Entity { constructor(row, col) { this.row = row; this.col = col; } }
class Hero  extends Entity {}
class Ball  extends Entity {
  constructor(row, col) { super(row, col); this.lightOn = true; }
  toggle() { this.lightOn = !this.lightOn; }
}
class Crate extends Entity {
  constructor(row, col, crateKey) { super(row, col); this.crateKey = crateKey; }
}
```

## 全局状态变量

- `hero: Hero | null` — 主角实例
- `ball: Ball | null` — 球实例，带 `lightOn` 属性
- `crates: Map<"row,col", Crate>` — 所有箱子，key 为坐标字符串
- `waterTiles: Set<"row,col">` — 有水贴图的空地坐标
- `grid[row][col]: 0|1` — 只存墙/空地，实体不存 grid

## 箱子注册表

```javascript
const CRATES = {
  wood: { name: '木箱', emoji: '📦' },
  snow: { name: '雪块', emoji: '❄️' },
};
```

扩展新箱子类型只需在 CRATES 中加一项 + 写一个 `draw*Tile` 函数。

## 查询函数

- `entityAt(r, c)` — 返回该格实体（Hero > Ball > Crate），无则 null
- `crateAt(r, c)` — 返回 Crate 或 null
- `isSolid(r, c)` — 墙或箱子阻档
- `K(r, c)` — `"r,c"` 字符串 key

## 快照/回滚

```javascript
snapshotCrates()  // 深拷贝 crates Map（每个 Crate 新建）
restoreCrates(snap)  // 清空 crates，从快照恢复
```

### 导出格式

tiles 中: 0=空地, 1=墙, 2+=箱子(按 CRATES keys 顺序偏移)
heroStart/ballStart: {row, col} | null

**Why:** Entity 从 grid 中分离是 commit 7cce6b4 的核心重构，简化了 entityAt 和碰撞检测。
**How to apply:** 新增实体子类继承 Entity，注册表加项，不碰 grid 结构。
