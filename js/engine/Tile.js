// 提取自 js/engine.js

class Tile {
  constructor() {
    this.base = T_EMPTY;        // T_EMPTY | T_WALL
    this.diagCorner = null;     // null | ['TL','TR','BL','BR',...]  斜角墙缺口（可多个）
    this.liftWall = null;       // 'up'|'down'|null  升降墙类型
    this.isPlate = false;       // 踏板
    this.hasWater = false;      // 水渍
    this.hasWeb = false;        // 蜘蛛网
    this.hasHighland = false; // 高地（高度+1）
    this.hasSkylight = false; // 天窗（取消高度上限）
  }

  // 实体在给定高度能否站在/穿过此格
  isSolidAt(height) {
    if (this.base !== T_WALL) return false;
    // 升降墙降下时，足够高的实体可通过
    if (this.liftWall !== null) return height < this.footLevel();
    return true;
  }

  // 此格的地面高度
  footLevel() {
    let lvl = 0;
    if (this.liftWall !== null && this.base === T_WALL) lvl += 1;
    if (this.hasHighland) lvl += 1;
    return lvl;
  }

  // 此格对站在上面的实体产生的效果
  effectsOn(entity) {
    const fx = {};
    if (this.hasWeb && !entity.has(TRAITS.FLYING)) fx.rooted = true;
    return fx;
  }
  // 天窗格无高度上限，普通格为 CEILING(2)
  ceilingHeight() {
    return this.hasSkylight ? Infinity : CEILING;
  }
}
