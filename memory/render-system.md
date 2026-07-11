---
name: render-system
description: Canvas 渲染系统——分层绘制顺序、各 tile 绘制函数、网格线、悬停高亮
metadata:
  type: project
---

# 渲染系统

## render() 绘制顺序（分层）

```
1. 格子层: 遍历 grid[r][c] → drawWallTile / drawWaterTile / drawEmptyTile
2. 箱子层: 遍历 crates.values() → drawCrateTile（叠在格子上）
3. 网格线: drawGridLines()（半透明灰线）
4. 悬停高亮: 放置模式时绿/红半透明叠层
5. 绳子: drawRope()（角色到球的像素线）
6. 球: drawBall(ball)
7. 角色: drawHero(hero.row, hero.col)
```

## 各绘制函数

- `drawEmptyTile(r, c)` — 深灰底色 #3a3a4e
- `drawWallTile(r, c)` — 砖墙纹理，砖缝线 + 高光边
- `drawWaterTile(r, c)` — 蓝色波纹，深浅交替条纹
- `drawCrateTile(crate)` — 分发：snow→drawSnowTile，默认→木箱
- `drawSnowTile(r, c)` — 雪白底 + 冰晶菱形 + 冰蓝边框
- `drawHero(row, col)` — 像素小人：头发/脸/眼/身体/手臂/腿
- `drawBall(ball)` — 开灯=亮黄发光球(径向渐变)，关灯=灰色暗球
- `drawRope()` — 麻绳：深色轮廓线 + 主线 + 像素纹理点
- `drawGridLines()` — 0.5px 灰线，16×16 格

## 缩放

Canvas 用 CSS `image-rendering: pixelated` 保持像素风格。
`getCellFromEvent` 用 `CANVAS_SIZE / rect.width` 做坐标缩放。

## 性能

16×16 格每帧全量重绘，性能无忧。如需优化可考虑脏矩形。

**Why:** 分层绘制顺序决定了视觉遮挡关系（角色 > 球 > 绳子 > 高亮 > 网格线 > 箱子 > 水 > 空地 > 墙）。
**How to apply:** 新增 tile 类型：写 draw*Tile → render() 的条件分支中插入判断。
