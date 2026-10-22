/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: window.JG_TITLE, // the name lives in js/title.js
  button: { top: 'var(--kh-top)' },
  cols: ['Teddy (left tray)', 'Tommy (right tray)'],
  keys: [
    ['choose a piece · move it on the board', 'W A S D', '← → ↑ ↓'],
    ['pick it up · put it down', 'F or Space', 'Enter'],
    ['corners and edges first', 'E', 'E'],
    ['call your brother (2 players: high five)', 'T', 'T'],
    ['look at the picture', 'B', 'B'],
    ['start again · pause · sound', 'N · P or Esc · M', 'N · P or Esc · M'],
    ['menu: the six pictures', '1 – 6', '1 – 6'],
    ['menu: who · players · level · pieces', '← → · ↑ ↓ · L · + –', '← → · ↑ ↓ · L · + –'],
  ],
  note: 'In 1 player both sets of keys work. Drop each piece in its place on the board: it only fits in its own place! Alone: beat your best time. Race: 🐸 Froggy (EASY) or 🦊 Foxy (NORMAL) has her own tray, and whoever empties his tray first wins. 2 players: Teddy\'s tray and Tommy\'s tray, one picture.',
  touch: 'Drag a piece onto the board, or tap a piece and then tap its place. 🖼️ puts the corners and edges first. Tap your brother\'s face (bottom right) to call him: he puts a piece in for you.',
});
Kit.lang.setup({ button: { top: 'var(--kl-top)' } });
