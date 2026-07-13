// 提取自 js/engine.js

class Tile {
  constructor() {
    this.base = T_EMPTY;        // T_EMPTY | T_WALL
    this.diagCorner = null;     // null | ['TL','TR','BL','BR',...]  斜角墙缺口（可多个）
    this.liftWall = null;       // 'up'|'down'|null  升降墙类型
    this.isPlate = false;       // 踏板
    this.hasWater = false;      // 水渍
    this.hasWeb = false;        // 蜘蛛网
    this.hasDepression = false; // 洼地（高度-1）
  }
}
