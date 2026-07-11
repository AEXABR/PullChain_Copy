# 重构移动逻辑 — 代码结构清理

日期: 2026-07-11 | 分支: entity-refactor

## 目标

清理 keydown 移动处理中的冗余代码，提取公共模式，改善函数职责分离。**不改游戏行为。**

## 改动 1：提取 `tryMoveHero(dr, dc)` 函数

将 keydown handler 中内联的 move-try-rollback 逻辑（~35行）提取为独立函数。

**签名：** `function tryMoveHero(dr, dc) → boolean`

**职责：**
1. 边界/墙检查
2. `getPushChain` 扫描可推实体链
3. 快照 crates + hero + ball 状态
4. `pushChain` + 移动 hero
5. `followBall` 绳子跟随
6. 失败则全局回滚 + `ball.toggle()`，返回 false
7. 成功返回 true

**调用方 keydown handler 简化为：**
```
查方向 → tryMoveHero(dir) → meltSnow → 更新状态文字 → render
```

## 改动 2：followBall 去除冗余快照

- 删除内部 `snapshotCrates()` / `restoreCrates()` — tryMoveHero 已负责全局回滚
- 保留 `prevBallRow`/`prevBallCol` 的保存和恢复 — 这是 followBall 自身职责

## 改动 3：followBall 辅助函数提取

- 提取 `isValid(c)` 辅助函数，合并两轮遍历中重复的边界检查 + 距离检查
- 第二轮守卫从 `ballMoved` 布尔值改为 `dist(...) > 1` 直接判断，语义更清晰
- 保持原始两轮顺序：先全部候选试推箱子，再全部候选试纯移动

## 不改的内容

- 斜角推箱子预处理逻辑（diagOk 块）保持不变
- 候选列表构建逻辑保持不变
- 距离守卫阈值（Chebyshev ≤1）不变
- meltSnow、渲染、UI 交互均不变
