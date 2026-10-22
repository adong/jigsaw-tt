/* 中文 for TT Jigsaw (Kit.lang). The kids', the CPU friends' and the game's names stay English;
   拼图, 边 and 角 are the words the brief asked for. */
Kit.lang.keep(['TEDDY', 'TOMMY', 'FOXY', 'FROGGY', 'Teddy', 'Tommy', 'Foxy', 'Froggy', 'TT', 'Jigsaw', window.JG_TITLE, 'Esc', 'Space', 'Enter']);

(function () {
  const PLACE = { 'TRAIN TRACKS': '火车轨道', 'THE COURT': '篮球场', 'SNOW DAY': '下雪天', 'THE PITCH': '足球场', 'THE MOON': '月球', 'DRAGON BOAT': '龙舟' };
  const Place = { 'Train tracks': '火车轨道', 'The court': '篮球场', 'Snow day': '下雪天', 'The pitch': '足球场', 'The moon': '月球', 'Dragon boat': '龙舟' };
  const dict = {
    // the menu
    '🧩 PUT THE PICTURE BACK TOGETHER!': '🧩 把图片拼回去！',
    ALONE: '自己玩', RACE: '比赛', '2 PLAYERS': '双人',
    Players: '几个人玩', 'Who are you?': '你是谁？', Level: '难度', Pieces: '几块拼图',
    // the buttons
    Pause: '暂停', 'Pause (P)': '暂停 (P)', 'Sound (M)': '声音 (M)', 'Sound on or off': '声音 开 / 关',
    'The picture': '看原图', 'The picture (B)': '看原图 (B)',
    EDGES: '拼边', 'Corners and edges first': '先拼角和边', 'Corners and edges first (E)': '先拼角和边 (E)',
    'Call your brother': '叫兄弟来帮忙', 'Call your brother (T)': '叫兄弟来帮忙 (T)', 'High five': '击掌', 'High five (T)': '击掌 (T)',
    'PLAY AGAIN': '再玩一次', 'Play again': '再玩一次', 'Next picture': '下一张图', Home: '主页', 'Keep playing': '继续玩', 'Start again': '重新开始',
    // while you play
    '🖼️ THE FRAME\'S DONE!': '🖼️ 边框拼好啦！',
    '⭐ CORNERS FIRST, THEN THE EDGES!': '⭐ 先拼角，再拼边！',
    'HIGH FIVE! 🙌': '击掌！🙌',
    '🏆 NEW BEST!': '🏆 新纪录！',
    // the ? panel
    'Teddy (left tray)': 'Teddy（左边的盘子）', 'Tommy (right tray)': 'Tommy（右边的盘子）',
    'choose a piece · move it on the board': '选一块拼图 · 在拼图板上移动',
    'pick it up · put it down': '拿起来 · 放下去',
    'corners and edges first': '先拼角和边',
    'call your brother (2 players: high five)': '叫兄弟来帮忙（双人：击掌）',
    'look at the picture': '看原图',
    'start again · pause · sound': '重新开始 · 暂停 · 声音',
    'menu: the six pictures': '菜单：六张图',
    'menu: who · players · level · pieces': '菜单：谁玩 · 几个人 · 难度 · 几块',
    'In 1 player both sets of keys work. Drop each piece in its place on the board: it only fits in its own place! Alone: beat your best time. Race: 🐸 Froggy (EASY) or 🦊 Foxy (NORMAL) has her own tray, and whoever empties his tray first wins. 2 players: Teddy\'s tray and Tommy\'s tray, one picture.':
      '单人时两组按键都能用。把每块拼图放到拼图板上它的位置：每块只能放在自己的位置！自己玩：打破你的最快纪录。比赛：🐸 Froggy（简单）或 🦊 Foxy（普通）有自己的一盘拼图，谁先拼完自己那盘谁赢。双人：Teddy 一盘，Tommy 一盘，一起拼一张图。',
    'Drag a piece onto the board, or tap a piece and then tap its place. 🖼️ puts the corners and edges first. Tap your brother\'s face (bottom right) to call him: he puts a piece in for you.':
      '把拼图拖到拼图板上，或者先点一块拼图，再点它的位置。🖼️ 把角和边排在前面。点右下角兄弟的脸叫他来：他会帮你放一块。',
  };
  for (const [en, zh] of Object.entries(PLACE)) dict[en] = zh;
  for (const [en, zh] of Object.entries(Place)) {
    dict[en] = zh;
    for (let i = 1; i <= 6; i++) dict[`${en} (${i})`] = `${zh} (${i})`;
  }
  Kit.lang.add(dict);

  const FOOD = { 'ICE CREAM': '冰淇淋', WATER: '水', 'JUICE BOX': '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉' };
  const SAYS = { 'THIS ONE GOES HERE!': '这块放这里！', 'I FOUND ONE!': '我找到一块！', 'HERE YOU GO!': '给你！' };
  const places = Object.keys(PLACE).join('|');
  Kit.lang.rule(new RegExp(`^(\\S+) (${places}) · (\\d+) PIECES!$`), (m, e, place, n) => `${e} ${PLACE[place]} · ${n} 块拼图！`);
  Kit.lang.rule(/^(\w+) WINS THE RACE!$/, '$1 赢了比赛！');
  Kit.lang.rule(/^(\S+) (\w+)'S PIECES!$/, '$1 这些是 $2 的拼图！');
  Kit.lang.rule(/^(\w+)'S HERE!$/, '$1 来啦！');
  Kit.lang.rule(/^(\S+) (ICE CREAM|WATER|JUICE BOX|COOKIE|WATERMELON|BANANA) FROM (\w+)!$/, (m, e, item, who) => `${e} ${who} 送来的${FOOD[item]}！`);
  Kit.lang.rule(/^(\w+) SAYS: (THIS ONE GOES HERE!|I FOUND ONE!|HERE YOU GO!)$/, (m, who, what) => `${who} 说：${SAYS[what]}`);
  Kit.lang.rule(/^(\w+) DID IT!$/, '$1 拼好啦！');
  Kit.lang.rule(/^(\w+) WINS!$/, '$1 赢啦！');
})();
