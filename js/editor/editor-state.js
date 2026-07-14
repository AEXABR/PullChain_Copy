// 提取自 js/engine.js + js/editor.js

// DOM 引用（脚本在 body 末尾加载，DOM 已就绪）
const btnWall = document.getElementById('btn-wall');
const btnDiag = document.getElementById('btn-diag');
const btnErase = document.getElementById('btn-erase');
const btnHero = document.getElementById('btn-hero');
const btnBall = document.getElementById('btn-ball');
const btnCrate = document.getElementById('btn-crate');
const btnWeb = document.getElementById('btn-web');
const btnPlate = document.getElementById('btn-plate');
const btnLiftwall = document.getElementById('btn-liftwall');
const btnWire = document.getElementById('btn-wire');
const btnHighland = document.getElementById('btn-highland');
const btnPlay = document.getElementById('btn-play');
const btnExport = document.getElementById('btn-export');
const btnClear = document.getElementById('btn-clear');
const allBtns = [btnWall, btnDiag, btnErase, btnHero, btnBall, btnCrate, btnWeb, btnPlate, btnLiftwall, btnHighland, btnWire, btnPlay];

// 编辑器 UI 状态
const editor = {
  mode: 'wall',
  currentCrateKey: 'wood',
  currentDiagCorner: 'TL',
  currentLiftType: 'up',
  isDrawing: false,
  hoverCell: null,
  wireStart: null,
};

// 模式元数据
const HOVER_MODES    = new Set(['place_hero','place_ball','place_crate','web','plate','liftwall','wire']);
const HIGHLIGHT_MODES = new Set(['place_hero','place_ball','place_crate','web','plate','liftwall']);
const BLOCKED_AS_WALL_MODES = new Set(['web','plate','liftwall']);
const DRAG_MODES     = new Set(['wall','diag','erase','highland']);

// 模式标签
const modeLabels = {
  'wall':        '模式: 画墙 — 点击/拖拽画布放置墙体',
  'diag':        '',
  'erase':       '模式: 擦除 — 点击/拖拽画布清除墙体或箱子',
  'place_hero':  '模式: 放置角色 — 点击空地放置角色',
  'place_ball':  '模式: 放置球 — 点击空地放置球（不能和角色/箱子同格）',
  'place_crate': '',
  'web':         '模式: 蜘蛛网 — 点击/拖拽在空地上放置蜘蛛网',
  'plate':       '模式: 踏板 — 点击空地放置踏板',
  'liftwall':    '',
  'highland':  '模式: 高地 — 点击/拖拽在空地上放置高地（高度+1）',
  'wire':        '模式: 引线 — 点击踏板然后点击升降墙连线',
  'play':        '模式: 操控 — 方向键/WASD 移动角色'
};

const activeBtns = {
  'wall': btnWall, 'diag': btnDiag, 'erase': btnErase,
  'place_hero': btnHero, 'place_ball': btnBall, 'place_crate': btnCrate, 'web': btnWeb, 'plate': btnPlate, 'liftwall': btnLiftwall, 'highland': btnHighland, 'wire': btnWire, 'play': btnPlay
};
