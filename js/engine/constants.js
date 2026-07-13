// 提取自 js/engine.js

const CANVAS_SIZE = 512;
const GRID_SIZE = 16;
const TILE_SIZE = CANVAS_SIZE / GRID_SIZE; // 32px

const T_EMPTY = 0;
const T_WALL  = 1;

const DIAG_CORNERS = ['TL', 'TR', 'BL', 'BR'];
const DIAG_SYMBOLS = { TL: '◤', TR: '◥', BL: '◣', BR: '◢' };
