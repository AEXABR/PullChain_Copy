# 代码文件结构优化 — 设计文档

## 目标

将 3 个 550+ 行的 JS 文件拆分为 ~13 个聚焦的小模块，同时引入 ES modules、重组文件内部结构。

## 约束

- 零依赖，纯浏览器原生 `<script type="module">`
- 不改变任何运行时行为，纯结构重组
- 保持 engine → editor → renderer 三层依赖方向，无循环依赖

## 目标文件树

```
js/
  engine/
    constants.js      (~15 行)  CANVAS_SIZE, GRID_SIZE, TILE_SIZE, T_EMPTY, T_WALL
                                 DIAG_CORNERS, DIAG_SYMBOLS
    Tile.js           (~25 行)  Tile 类
    entities.js       (~50 行)  Entity, Hero, Ball, Crate 类 + CRATES 注册表
    state.js          (~90 行)  grid[], hero, ball, crates Map, wireLinks[]
                                 initGrid(), K(), dist(), crateAt(), cratesAt()
                                 entityCount(), entityAt(), entityForPush(), isSolid()
                                 snapshotCrates(), restoreCrates()
    movement.js       (~180 行) getPushChain(), pushChain(), diagCornersFor()
                                 followBall(), tryMoveHero()
    physics.js        (~230 行) entityPriority(), entityUnder(), tileFootLevel()
                                 updateEntityHeight(), updateAllHeights()
                                 updateLiftWalls(), meltSnow()
                                 hasLineOfSight(), moveMoths()

  editor/
    editor-state.js   (~60 行)  editor 对象, HOVER_MODES, HIGHLIGHT_MODES,
                                 BLOCKED_AS_WALL_MODES, DRAG_MODES,
                                 modeLabels, activeBtns
    actions.js        (~240 行) setTile(), placeDiagWall(), placeCrate(),
                                 placeWeb(), placePlate(), placeLiftWall(),
                                 placeDepression(), eraseTop(),
                                 placeHero(), placeBall(), PLACE_ACTIONS
    ui.js             (~280 行) DOM 引用, getCellFromEvent(),
                                 handleCanvasDown/Move/Up, setMode(),
                                 updateXxxBtn(), 按钮事件绑定,
                                 exportMap(), clearMap(), 键盘处理, 启动 render()

  renderer/
    tiles.js          (~230 行) drawEmptyTile(), drawWallTile(), drawDiagWallTile()
                                 drawWaterTile(), drawWebTile(), drawDepressionTile()
                                 drawPlateTile(), drawLiftWallTile(), drawGridLines()
    actors.js         (~230 行) drawHero(), drawBall(), drawCrateTile()
                                 drawSnowTile(), drawMothTile()
    render.js         (~200 行) drawRope(), drawWires(), render()
```

## Import 依赖图

```
constants ──┬──► Tile ──► state ──┬──► movement ──┬──► physics
             │                     │                │
             └──► entities ────────┘                │
                                                    │
             ┌──► editor-state                      │
             │                                      │
             └──────────────────────────────────────┤
                                                    ▼
                                              actions ◄── editor-state
                                                │
                                                ▼
                                         ui (入口模块)
                                                │
                                    ┌───────────┴───────────┐
                                    ▼                       ▼
                              tiles.js                actors.js
                                    │                       │
                                    └───────────┬───────────┘
                                                ▼
                                            render.js
```

**规则：**
- engine/ 文件零 DOM 依赖，纯逻辑
- editor/ 依赖 engine + editor-state，不碰 renderer
- renderer/ 依赖 engine + editor-state（读 grid/entities/hover），不碰 editor/ui
- editor-state 只被 editor 和 renderer 引用，不被 engine 引用
- `ctx`/`canvas`/`statusEl` 三个 DOM 引用保留在 HTML 内联脚本设为全局，避免为 3 个变量建额外模块

## 内部重组规则

每个文件按 `imports → 定义 → export` 顺序组织。不再需要 `// === 区块 ===` 注释。

## HTML 改动

```html
<!-- 旧：三个 script -->
<script src="js/engine.js"></script>
<script src="js/renderer.js"></script>
<script src="js/editor.js"></script>

<!-- 新：单入口 module -->
<script type="module" src="js/editor/ui.js"></script>
```

其余通过 import 链自动加载。

## 不变项

- 所有函数签名不变
- 所有变量名不变
- 所有运行时行为不变
- CSS 不动
- HTML 除 `<script>` 标签外不动
