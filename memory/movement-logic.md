---
name: movement-logic
description: 主角移动全流程——tryMoveHero、getPushChain、pushChain、快照回滚
metadata:
  type: project
---

# 移动逻辑

## 入口：keydown handler（约 15 行）

```
查 KEY_DIR[e.key] → tryMoveHero(dr, dc) → 成功: meltSnow() + 更新状态文字 → render()
```

## tryMoveHero(dr, dc) → boolean

```
1. 边界检查 (nr/nc 在 0..GRID_SIZE-1)
2. 墙检查 (grid[nr][nc] === T_WALL)
3. getPushChain(nr, nc, dr, dc) — 扫描可推实体链
4. chain === null → return false（堵死）
5. 快照: snapshotCrates() + savedHero + savedBall
6. pushChain(chain, dr, dc) — 从后往前移动链中所有实体
7. hero.row = nr; hero.col = nc
8. followBall(prevRow, prevCol) → false? 回滚: restoreCrates + 恢复 hero/ball 位置 + ball.toggle() + return false
9. return true
```

## getPushChain(r, c, dr, dc) → Entity[] | null

从 (r,c) 沿 (dr,dc) 扫描，返回可推动的实体链：
- 墙或出界 → null
- entityAt 为 null（空格）→ 返回已收集的 chain
- entityAt 为实体 → 加入 chain，继续扫描下一格

## pushChain(chain, dr, dc)

从后往前移动 chain 中所有实体（避免覆盖）：
- Crate: 删旧 Map key → 更新 row/col → 建新 Map key
- Hero/Ball: 直接更新 row/col

## 回滚机制

tryMoveHero 是唯一的快照/回滚点。followBall 不再内部快照。
回滚时调用 restoreCrates + 恢复 hero/ball 位置 + ball.toggle()（开关灯切换）。

**Why:** 将 move-try-rollback 从 keydown handler 提取为独立函数，消除 followBall 内部冗余快照。
**How to apply:** 修改移动逻辑只需改 tryMoveHero；新增移动触发方式直接调用它。
