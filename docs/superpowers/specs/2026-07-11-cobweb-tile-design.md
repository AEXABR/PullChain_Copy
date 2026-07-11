# 蜘蛛网空地设计文档

## 概述

空地变种：有蜘蛛网的空地。实体移动到该类型地块后将被粘住，不能再被推动或移动。Hero 踩上去即永久困住（陷阱）。

## 数据模型

### 新增 `webTiles` Set

- 类型：`Set<string>`，key 为 `"row,col"` 格式
- 标记哪些空地格子有蜘蛛网
- 蜘蛛网是空地的附加属性，格子本身仍是 `T_EMPTY`
- 与 `waterTiles` 互斥：在同一格放置蜘蛛网时清除水，反之亦然

### 初始化

```js
let webTiles = new Set();
```

## 核心规则

### 1. `isStuck(entity)` — 实体是否被粘住

实体所在格子 `K(entity.row, entity.col)` 在 `webTiles` 中即被粘住。

### 2. `getPushChain` 修改

扫描推链时，遇到在蜘蛛网上的实体 → 返回 `null`（视为阻塞，不可推动）。

### 3. `tryMoveHero` 修改

移动前检查 Hero 是否已在蜘蛛网上 → 是则直接返回 `false`（永久困住），不执行任何操作。

### 4. `followBall` 中的 Ball 在蜘蛛网上

Ball 粘住不动 → `followBall` 路径中 Ball 无法移动到候选格 → 距离>1 → 返回 false → `tryMoveHero` 回滚 Hero 移动，并 `ball.toggle()` 切换开关状态。**现有逻辑已自然处理，无需额外修改。**

### 5. Crate 被推到蜘蛛网上

Crate 停留在蜘蛛网格上后，后续 `getPushChain` 扫描到它时返回 null（规则2），无法再被推动。**无需额外代码。**

## 编辑器

### 工具栏

新增按钮：`🕸 蜘蛛网 [8]`，`data-mode="web"`

### 放置逻辑

- 点击/拖拽在空地上放置蜘蛛网
- 不能放在墙体上（`grid[r][c] === T_WALL` 时忽略）
- 放在已有蜘蛛网的格子上 → 无变化
- 放置蜘蛛网时清除该格的 `waterTiles`
- 快捷键 `8` 切换到此模式

### 擦除

擦除模式（`erase`）点击已放蜘蛛网的格子时，同时清除 `webTiles`。

### 清空地图

`clearMap()` 中增加 `webTiles.clear()`。

### 覆盖实体时的处理

在已有蜘蛛网的格子上放置实体不受影响（如 `place_hero`、`place_ball`、`place_crate` 只检查 `isSolid`，不检查 web）。

画墙/擦除覆盖时清除该格的 web（与 water 处理一致）。

## 渲染

### `drawWebTile(row, col)`

- 在空地底色（`#3a3a4e`）上叠加像素风白色蛛网纹理
- 蛛网设计：从中心向四角 + 四边中点辐射的细线 + 螺旋连接线
- 颜色：`rgba(255, 255, 255, 0.25)` 蛛丝线

### render() 修改

在格子绘制循环中，`waterTiles` 检查和空地绘制之间插入 `webTiles` 判断：

```
if water → drawWaterTile
else if web → drawWebTile
else → drawEmptyTile
```

## 导出

map JSON 新增 `webTiles` 字段，值为蜘蛛网坐标的 `"row,col"` 字符串数组。

> 注：当前无导入功能，后续如添加导入则需解析 `webTiles` 字段，旧版地图缺失此字段时视为空。

## 涉及文件

- `map-editor.html` — 唯一文件，所有改动在此

## 改动清单

1. 新增 `webTiles` Set 变量
2. 修改 `getPushChain` — 蜘蛛网上的实体阻塞推链
3. 修改 `tryMoveHero` — Hero 在蜘蛛网上时禁止移动
4. 工具栏新增蜘蛛网按钮
5. 新增 `drawWebTile` 渲染函数
6. 修改 `render` — 加入 web tile 渲染分支
7. 修改 `setTile` — 清理 waterTiles 处同步清理 webTiles（一行 `webTiles.delete(...)`）
8. 修改 `clearMap` — 清空 webTiles
9. 修改 `exportMap` — 导出 webTiles
10. 修改 `placeActions` / `dragActions` — 支持 web 模式
11. 快捷键 `8` → web 模式
