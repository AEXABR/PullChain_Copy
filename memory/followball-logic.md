---
name: followball-logic
description: 球跟随逻辑——绳子约束、斜角推箱、两轮候选遍历
metadata:
  type: project
---

# followBall 逻辑

## 签名与职责

`followBall(prevRow, prevCol) → boolean`

主角移动后调用。尝试让球跟上主角。只负责移动球（和推箱子），**不负责快照/回滚 crates**（由 `tryMoveHero` 统一管理）。

## 流程

```
1. !ball → return true（无球直接成功）
2. dist(hero, ball) ≤ 1 → return true（已在绳长范围内）
3. 计算球应向主角旧位置移动的方向 (dr, dc)
4. 斜角预处理：如果 dr≠0 且 dc≠0，检测对角障碍物能否推开
5. 构建候选列表 candidates[]
6. 第一轮：遍历候选，对每个候选尝试 getPushChain + pushChain（推箱子移动球）
7. 第二轮：第一轮失败则遍历候选，找空位纯移动（不推箱子）
8. 距离守卫：dist > 1 则恢复球位置，return false
9. return true
```

## 候选列表构建

- 如果斜角 OK：先加对角候选 `{diagRow, diagCol, pushDr=dr, pushDc=dc}`
- 如果 dr≠0 且 dc≠0：追加水平候选 `{diagRow, ballCol, pushDr=dr, pushDc=0}`
- 如果 dr≠0 且 dc≠0：追加垂直候选 `{ballRow, diagCol, pushDr=0, pushDc=dc}`

## 斜角预处理 (diagOk)

当球需要对角的 (c1r, c1c) 和 (c2r, c2c) 同时畅通时才允许斜角移动。
- c1 = (diagRow, ball.col) 沿垂直方向推
- c2 = (ball.row, diagCol) 沿水平方向推
- 两个方向的障碍物链都可以推走 → diagOk = true
- pushChain 在此阶段执行（状态修改在候选循环前）

## isValid 辅助

```javascript
const isValid = (c) =>
  c.row >= 0 && c.row < GRID_SIZE && c.col >= 0 && c.col < GRID_SIZE &&
  dist(hero.row, hero.col, c.row, c.col) <= 1;
```

统一检查边界 + 绳长约束，消除两轮遍历中的重复代码。

## 失败处理

- 恢复 `ball.row/col` 到 `prevBallRow/prevBallCol`
- 返回 false
- 调用方 `tryMoveHero` 负责回滚 crates + toggle 球灯

**Why:** 最复杂的游戏逻辑，理解其候选构建+两轮遍历+距离守卫是关键。
**How to apply:** 修改球跟随行为改此函数；需保持候选顺序不变以免改变游戏行为。
