// 提取自 js/engine.js

class Entity {
  constructor(row, col) { this.row = row; this.col = col; this.height = 0; this.selfHeight = 1; }
}
class Hero  extends Entity {}
class Ball  extends Entity {
  constructor(row, col) { super(row, col); this.lightOn = true; }
  toggle() { this.lightOn = !this.lightOn; }
}
class Crate extends Entity {
  constructor(row, col, crateKey) { super(row, col); this.crateKey = crateKey; }
}

const CRATES = {
  wood: { name: '木箱', emoji: '📦' },
  snow: { name: '雪块', emoji: '❄️' },
  moth: { name: '飞蛾', emoji: '🦋' },
};
