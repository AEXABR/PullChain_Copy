---
name: crate-system
description: 箱子系统——木箱/雪块、融雪机制、水地块、绘制函数
metadata:
  type: project
---

# 箱子系统

## 箱子类型

```javascript
const CRATES = {
  wood: { name: '木箱', emoji: '📦' },
  snow: { name: '雪块', emoji: '❄️' },
};
```

木箱：标准可推箱子。雪块：球开灯时融化。

## 存储

- `crates: Map<K(r,c), Crate>` — 全局箱子注册
- `currentCrateKey: 'wood'|'snow'` — 编辑器当前放置类型
- 箱子不存 grid，grid 只存 T_EMPTY/T_WALL
- 导出时箱子编码为 2+(CRATES keys index)，即 wood=2, snow=3

## 融雪机制 (meltSnow)

```javascript
function meltSnow() {
  if (!ball || !ball.lightOn) return;
  // 遍历所有箱子，雪块且 dist(ball, crate) ≤ 1 → 删除箱子 + 标记水
}
```

- 触发时机：每次成功移动后（tryMoveHero 返回 true 时）
- 范围：球周围 Chebyshev 距离 ≤ 1（8邻格）
- 结果：crates.delete(key) + waterTiles.add(key)
- 关灯时不触发

## 水地块 (waterTiles)

- `waterTiles: Set<K(r,c)>` — 纯渲染标记
- 不影响通行（isSolid 对空地返回 false，水是空地的一种）
- 擦除或覆盖时同步清理

## 绘制

- `drawCrateTile(crate)` — 分发到具体绘制函数
- `drawSnowTile(row, col)` — 雪白底色 + 冰晶纹理 + 冰蓝边框
- `drawWaterTile(row, col)` — 蓝色波纹 + 高光波峰
- 箱子内缩一圈 (s*6)，与角色/球视觉一致

**Why:** 箱子是核心玩法元素，融雪/水系统与光照机制耦合。
**How to apply:** 新增箱子类型：CRATES 加项 → draw*Tile 函数 → drawCrateTile 分发。
