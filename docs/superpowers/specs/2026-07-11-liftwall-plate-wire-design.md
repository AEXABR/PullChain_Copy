# 升降墙 + 踏板 + 引线 设计文档

## 概述

三种新元素组合成可触发的机关系统：
- **踏板**：地面覆盖物，实体踩上触发
- **升降墙**：默认下降（可通行），所有匹配踏板被踩下时升起变真墙
- **引线**：视觉连线，连接同 ID 的踏板和升降墙

## 数据模型

```js
let plateTiles = new Map();   // "row,col" → wireId (string)
let liftWalls = new Map();    // "row,col" → wireId (string)
let currentWireId = 'A';      // 当前放置用的连线 ID
```

- 同 ID 的踏板和升降墙自动连通
- 支持 1:1、1:N、N:1、N:N
- 多个踏板：**全部**踩下墙才升起

## 实体高度

墙升起时格子上的实体 `entity.height += 1`，降回时 `height -= 1`。
Entity 基类新增 `this.height = 0`。渲染时 y 坐标上移 `height * TILE_SIZE`。

## 升降逻辑（每帧/每次移动后调用）

```
for each wireId:
    plates = 所有 plateTiles 中 id === wireId 的格子
    allPressed = plates.every(p => entityAt(p) !== null)
    for each liftWall with same id:
        if allPressed: grid[wall] = T_WALL, 实体高度+1
        else:          grid[wall] = T_EMPTY, 实体高度-1
```

## 编辑器

| 按钮 | 快捷键 | 行为 |
|---|---|---|
| `▫ 踏板 [9]` | 9 | 点击空地放置踏板，再次点击按钮循环切换 wireId(A-Z) |
| `⇅ 升降墙 [0]` | 0 | 点击空地放置升降墙，再次点击循环切换 wireId |
| 擦除模式 | 2 | 擦除踏板/升降墙 |

放置时显示当前 wireId（如"踏板 A"、"升降墙 B"）。

## 渲染

层级（从底到顶）：
1. 空地底色
2. 水
3. 引线（同 ID 的踏板↔墙连线，像素黄线）
4. 踏板图标（地面标记）
5. 蜘蛛网
6. 升降墙（下降态：半高虚线 / 上升态：真墙）
7. 实体（含 height 偏移）
8. 绳子

### 升降墙绘制
- **下降态**：底部半高横条 + 虚线边框，`isSolid`=false
- **上升态**：正常墙（或稍不同颜色区分）

### 踏板绘制
- 小方块压力板图标（像素风），地面覆盖物

### 引线绘制
- 同 wireId 的踏板中心到升降墙中心画像素线
- 颜色：`rgba(255, 220, 50, 0.6)` 金色

## 涉及文件

- `map-editor.html` — 唯一文件

## 改动清单

1. Entity 加 `height` 属性，所有 draw 函数支持 y 偏移
2. `entityAt` / `isSolid` / `setTile` 适配升降墙
3. 新增 `plateTiles` Map、`liftWalls` Map、`currentWireId`
4. `updateLiftWalls()` — 升降逻辑
5. 工具栏：踏板按钮 + 升降墙按钮 + wireId 循环
6. `drawPlateTile`、`drawLiftWall`、`drawWires` 渲染函数
7. `placePlate`、`placeLiftWall` 放置函数
8. render 层级调整
9. 导出 support
