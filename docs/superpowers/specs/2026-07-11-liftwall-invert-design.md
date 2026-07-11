# 升降墙新增「下降型」设计文档

## 概述

在现有「上升型」升降墙（默认下降，踩踏板升起）基础上，新增「下降型」升降墙（默认升起，踩踏板下降）。两种类型共享同一套引线/踏板系统，行为相反。

## 数据模型

```js
// 旧：const liftWalls = new Set();     // "row,col"
// 新：
const liftWalls = new Map();            // "row,col" → 'up' | 'down'
let currentLiftType = 'up';             // 当前放置类型，按钮循环切换
```

- `'up'`：上升型 — 默认下降态（可通行），踏板全踩下 → 升起（真墙阻挡）
- `'down'`：下降型 — 默认升起态（真墙阻挡），踏板全踩下 → 下降（可通行）

## 升降逻辑

`updateLiftWalls()` 按类型分支：

| 类型 | allPressed=true（踏板全踩下） | allPressed=false |
|------|------------------------------|------------------|
| `'up'` | grid → T_WALL, entity.height++ | grid → T_EMPTY, entity.height-- |
| `'down'` | grid → T_EMPTY, entity.height-- | grid → T_WALL, entity.height++ |

`'down'` 放置时初始 grid 直接设为 T_WALL（升起态真墙），实体 height 也相应 +1。

## 渲染

| 类型 | 升起态 (grid=T_WALL) | 下降态 (grid=T_EMPTY) |
|------|---------------------|----------------------|
| `'up'` | 蓝色墙 `#5566AA` | 半高虚线 |
| `'down'` | 红色墙 `#665555` | 半高虚线 |

## 编辑器

- **[0] 按钮**：循环切换 `'up'` → `'down'` → `'up'` …
- 按钮文字随类型变化：`⇅ 升墙(↑) [0]` / `⇅ 降墙(↓) [0]`
- 放置时提示当前类型

## 导出/导入

- 导出：`liftWalls: {"r,c": "up", "r,c": "down", ...}`（对象格式）
- 导入：兼容旧格式（数组 → 默认 `'up'`）

## 引线

引线系统（`wireLinks`、`wireStart`）不变，踏板↔升降墙连线不区分升降墙类型。

## 涉及文件

- `map-editor.html` — 唯一文件

## 改动清单

1. `liftWalls` Set → Map，新增 `currentLiftType`
2. `updateLiftWalls()` 按类型分支处理升降
3. `drawLiftWallTile()` 按类型选颜色（up=蓝, down=红）
4. `placeLiftWall()` 放置时根据 `currentLiftType` 写入 Map，初始 grid=T_WALL（down型）
5. 工具栏按钮循环切换类型，文字动态更新
6. `setTile()` 清理时适配 Map
7. `clearMap()` 适配 Map
8. 导出/导入适配新格式，兼容旧格式
9. 悬停高亮适配 Map
