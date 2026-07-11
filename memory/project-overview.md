---
name: project-overview
description: PullChain 项目总览——是什么、技术栈、文件结构、核心概念
metadata:
  type: project
---

# PullChain 项目总览

## 是什么

一个单文件 HTML 网格推箱子解谜游戏 + 地图编辑器。主角通过一根绳子连接一个发光球，推动箱子穿过网格。球开灯时融化周围的雪块。

## 技术栈

- 纯 HTML/CSS/JS，无框架，无外部依赖
- Canvas 2D 渲染，像素风格 (pixelated)
- 单个文件 `map-editor.html`（约 850 行）

## 网格

- 16×16 网格，每格 32px，总画布 512px
- grid[row][col]: `T_EMPTY=0` 或 `T_WALL=1`
- 实体（Hero/Ball/Crate）不存储在 grid 中，各有独立变量

## 核心概念

- **主角 (Hero)**：玩家操控角色，用绳子连接球
- **球 (Ball)**：绳子另一端，有开关灯两种形态
- **箱子 (Crate)**：可推动的障碍物，有木箱/雪块两种
- **绳子 (Rope)**：主角和球之间的视觉连线
- **链式推动**：连续实体沿方向一起移动
- **斜角推箱**：球斜向移动时推开对角障碍物
- **融雪**：球开灯时周围雪块融化为水
- **水**：雪块融化后的地块标记，可通行

## 关键常量

```
GRID_SIZE=16, TILE_SIZE=32, CANVAS_SIZE=512
T_EMPTY=0, T_WALL=1
K(r,c) = `${r},${c}`  // 坐标转字符串 key
dist = Chebyshev 距离 (max of axis diffs)
```

**Why:** 项目是单文件游戏，架构简单但逻辑密集。此文件为后续会话提供快速入口。
**How to apply:** 新会话先读此文件建立全局认知，再按需读专题 memory。
