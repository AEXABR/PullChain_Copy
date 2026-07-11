---
name: editor-modes
description: 地图编辑器模式——wall/erase/place_hero/place_ball/place_crate/play 及 UI 行为
metadata:
  type: project
---

# 编辑器模式

## 六种模式

| 模式 | 按键 | 行为 |
|---|---|---|
| `wall` | [1] | 点击/拖拽画墙 |
| `erase` | [2] | 点击/拖拽擦除（墙+箱子+实体） |
| `place_hero` | [3] | 点击放置主角，放完后自动切 `place_ball` 或 `play` |
| `place_ball` | [5] | 点击放置球，放完自动切 `play` |
| `place_crate` | [6] | 点击放置箱子，再次按 [6] 循环切换箱子类型 |
| `play` | [4] | 操控模式，方向键/WASD 移动 |

## setMode(newMode)

- 更新 `mode` 变量
- 更新按钮 active 样式（查表 `activeBtns`）
- 更新状态文字（查表 `modeLabels`）
- 触发 render()

## 模式分发

mousedown/mousemove 用查表分发：
```javascript
const placeActions = { wall: () => setTile(...), erase: () => setTile(...), ... };
const dragActions  = { wall: () => setTile(...), erase: () => setTile(...) };
```

放置模式（place_*）在 mousemove 时只更新 hoverCell + render，不做拖拽行为。

## setTile 副作用

设置 tile 值时自动清理该格上的实体：
- 墙/擦除覆盖 Hero → hero = null
- 墙/擦除覆盖 Ball → ball = null
- 墙/擦除覆盖 Crate → crates.delete(key)
- 同步删除 waterTiles

## 悬停高亮

放置模式（place_hero/ball/crate）鼠标悬停时：
- 合法位置：绿色半透明
- 非法位置（堵住/实体冲突）：红色半透明

## 导出/清空

- 导出：JSON 含 width/height/tiles/heroStart/ballStart → 下载 map.json
- 清空：confirm 后重置 grid + hero + ball + crates + waterTiles

**Why:** 模式系统是编辑器核心，查表分发比 if-else 链更清晰。
**How to apply:** 新增模式：KEY_MODE 加映射 → modeLabels 加文字 → activeBtns 加按钮 → dispatch 表加处理函数。
