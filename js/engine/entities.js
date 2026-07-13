// 提取自 js/engine.js

const TRAITS = {
  PLAYER:                'player',
  LIGHT_SOURCE:          'light_source',
  LEASHED:               'leashed',
  TOGGLE_ON_LEASH_BREAK: 'toggle_on_leash_break',
  PUSHABLE:              'pushable',
  STACKABLE:             'stackable',
  FLYING:                'flying',
  FLIES_TOWARD_LIGHT:    'flies_toward_light',
  MELTS_IN_LIGHT:        'melts_in_light',
  BLOCKS_VISION:         'blocks_vision',
};

class Entity {
  constructor(row, col) {
    this.row = row; this.col = col; this.height = 0; this.selfHeight = 1;
    this.traits = new Set();
    this.kind = 'entity';
  }
  has(trait) { return this.traits.has(trait); }
}

class Hero extends Entity {
  constructor(row, col) {
    super(row, col);
    this.kind = 'hero';
    this.traits.add(TRAITS.PLAYER);
    this.traits.add(TRAITS.BLOCKS_VISION);
  }
}

class Ball extends Entity {
  constructor(row, col) {
    super(row, col);
    this.kind = 'ball';
    this.lightOn = true;
    this.traits.add(TRAITS.LIGHT_SOURCE);
    this.traits.add(TRAITS.LEASHED);
    this.traits.add(TRAITS.TOGGLE_ON_LEASH_BREAK);
    this.traits.add(TRAITS.BLOCKS_VISION);
  }
  toggle() { this.lightOn = !this.lightOn; }
}

class Crate extends Entity {
  constructor(row, col, crateKey) {
    super(row, col);
    this.kind = 'crate';
    this.crateKey = crateKey;
    this.traits.add(TRAITS.PUSHABLE);
    this.traits.add(TRAITS.STACKABLE);
    this.traits.add(TRAITS.BLOCKS_VISION);
    if (crateKey === 'moth') {
      this.traits.add(TRAITS.FLYING);
      this.traits.add(TRAITS.FLIES_TOWARD_LIGHT);
    }
    if (crateKey === 'snow') {
      this.traits.add(TRAITS.MELTS_IN_LIGHT);
    }
  }
}

const CRATES = {
  wood: { name: '木箱', emoji: '📦' },
  snow: { name: '雪块', emoji: '❄️' },
  moth: { name: '飞蛾', emoji: '🦋' },
};
