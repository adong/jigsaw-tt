# TT Jigsaw

[![TT Jigsaw title screen](docs/screenshot.jpg)](https://adong.github.io/jigsaw-tt/)

Press **?** any time (or tap the round **?** button on the left edge) to see the keys. The game waits while you look.
Tap the language button under it (the A文 icon) to switch between English and 中文; the dashboard and every game remember the choice.

Jigsaw puzzles of six little 3D scenes from the brothers' games: the train tracks, the basketball court, a snow day, the soccer pitch, the moon and a dragon boat race. 6 pieces for Tommy, up to 100 for Teddy. Drop each piece in its place on the board (it only fits in its own place), sort the corners and edges first, race 🐸 Froggy or 🦊 Foxy, or race each other on one picture. Your brother comes to put a piece in for you whenever you call him.

**中文：** 拼图！六张 3D 小图（火车轨道、篮球场、下雪天、足球场、月球、龙舟），从 6 块到 100 块。每块拼图只能放在自己的位置，可以先拼角和边；自己玩打破最快纪录，或者和 🐸 Froggy、🦊 Foxy 比赛，双人 Teddy 和 Tommy 一起拼一张图、比谁先拼完自己那盘。随时可以叫兄弟来帮你放一块。

A jigsaw game starring Teddy and Tommy, built with Claude Code from plain JavaScript and Three.js on the shared Claude Games kit. Each picture is a little diorama built from boxes, balls and cones with the kit's blocky Teddy and Tommy in it, rendered once in the browser at the puzzle's shape and then cut into pieces with real knobs and holes. There are no image, model or audio files: Froggy and Foxy are emoji on podiums, and every sound is synthesised.

The name lives in one constant, `JG_TITLE` in `js/title.js`, and the page title, the logo and the ? panel read it from there.

## Play

- **Double-click `index.html`.** It works offline because Three.js and the kit are copied into `kit/`. Without internet the title font falls back to Arial Black.
- **Send one file:** `dist/jigsaw-tt.html` is the whole game in one page. AirDrop or email it, then open it in a browser.
- Rebuild that file after any edit: `python3 kit/tools/bundle.py . --name jigsaw-tt`

## The pictures and the pieces

- **Six pictures**, the tiles on the menu (keys **1 – 6**): 🚇 **TRAIN TRACKS** (Tommy on the roof of a train, Teddy running down the tracks between the city blocks), 🏀 **THE COURT** (Teddy's jump shot, Tommy's Y by the bench), ⛄ **SNOW DAY** (snowmen, an igloo, a penguin, Teddy throwing a snowball), ⚽ **THE PITCH** (Tommy in goal, Teddy running in with the ball, a TT banner), 🚀 **THE MOON** (a rocket, the Earth, a ringed planet, a rover and both boys in bubble helmets), 🐉 **DRAGON BOAT** (Teddy on the drum, Tommy at the dragon's head, lanterns and a pagoda). Every corner of every picture has something in it, so no piece is plain sky.
- **How many pieces** (keys **+ –** on the menu): **6** (3 × 2), **12** (4 × 3), **20** (5 × 4), **35** (7 × 5), **54** (9 × 6) or **100** (10 × 10). The pieces are always square; the picture is rendered at the puzzle's own shape, and the camera widens so the whole scene is in every one.
- **The cut:** every inside edge has a knob on one side and the matching hole on the other, a little off-centre and a little bigger or smaller each time, so the pieces look like a real jigsaw's. The four corners and the edge pieces have flat sides.
- **🐣 EASY** (the default, for Tommy, 5): starts at 6 pieces. The picture shows faintly on the board, a drop counts within half a piece of the right place, and if you hold a piece for 2.5 s its place glows.
- **🔥 NORMAL** (for Teddy, 8): starts at 35 pieces. An empty board with faint lines, and a drop must be within a third of a piece. The little picture in the top bar (tap it, or **B**) shows the whole picture big.

## Rules

- **Pieces fit only in their own place.** Drop a piece near its place on the board and it clicks in (a "tock" and a chime that climbs with each one in a row); anywhere else it wiggles and slides back to its tray. Placed pieces stay put.
- **🖼️ EDGES** (or **E**) sorts your tray: the corners first (each gets a ⭐), then the other edge pieces, then the middle. "🖼️ THE FRAME'S DONE!" when the last edge piece goes in.
- **👤 ALONE:** every piece is yours, in both trays. A clock runs; your **best time** for each picture, size and level is kept on this device ("🏆 NEW BEST!").
- **🐸 / 🦊 RACE (1 player):** you and the CPU friend share the board, each with your own tray (dealt fairly: the same number of corners and edges). **🐸 Froggy** on EASY puts a piece in every 7.5 – 10.5 s (on 6 pieces; bigger puzzles slow her down, up to about 2.4 × on 100), **🦊 Foxy** on NORMAL every 3.6 – 5.2 s (the same slowing). She picks corners and edges first, like a real puzzler. Her tray is hers: tap it and she says so. **Whoever empties his tray first wins.**
- **👥 2 PLAYERS:** Teddy's tray on the left, Tommy's on the right, one picture. First to empty his tray wins.
- **The finish:** in a race the rest of the pieces fly in by themselves after the winner's last one, so the picture always finishes. Then the seams fade, a shine sweeps across, confetti rains, the winner does his signature move beside the board (Teddy's boxing combo or his 🏀 jump shot, Tommy's Y with peace fingers ✌️; Froggy and Foxy spin on their podiums) and the other one shrugs. The card shows the time and best time (alone) or the pieces each put in and the **🏆 races won**, which add up for the same players and level until the page is closed. **PLAY AGAIN** cuts the same picture a new way; ➡️ is the next picture; 🏠 is the menu.

## Controls

| | Teddy (left tray) | Tommy (right tray) | Touch |
|---|---|---|---|
| choose a piece · move it on the board | W A S D | ← → ↑ ↓ | |
| pick it up · put it down | F or Space | Enter | drag it onto the board, or tap it and then tap its place |
| corners and edges first | E | E | 🖼️ EDGES (bottom left) |
| call your brother (2 players: high five) | T | T | his face, bottom right (🙌 in 2 players) |
| look at the picture | B | B | the little picture in the top bar |
| start again · pause · sound | N · P or Esc · M | N · P or Esc · M | 🔄 on the pause screen · ⏸️ · 🔊 |
| menu: the six pictures | 1 – 6 | | the tiles |
| menu: who · players · level · pieces | ← → · ↑ ↓ · L · + – | | the buttons under the tiles |

- **In 1 player both sets of keys work.** The first key shows a yellow square round a piece in your tray; the arrows move it from piece to piece, and pick-up takes the piece onto the board, where a dashed square shows the place it's over. Put it down: it clicks in if that's its place, or slides back to the tray. Moving off the edge of the board puts it back too.
- **Fingers:** on an iPad each finger drags its own piece, so two can play at once. A dragged piece grows to the board's size and rides a little above the finger so you can see it.
- **Layouts:** on a wide screen the board is in the middle with a tray each side, ⏸️ and 🔊 at the top right, 🖼️ at the bottom left and your brother at the bottom right. On a tall screen the board is on top and the two trays under it, with ⏸️ and 🔊 down in the bottom strip. The kit's ? and language buttons have a strip of their own on the left edge, so they never cover a piece. The game picks the board size that keeps both the board's pieces and the tray pieces as big as it can.

## Call your brother (companion mode)

**1 player (alone or racing):** call the other brother with **T** or by tapping his face (bottom right), **any time and as often as you like** (`Kit.roster.buddyFor`: Tommy for Teddy, Teddy for Tommy).

- **He pops in** on a little cloud by his button, in a puff of stars, at his roster `buddyScale`, with his name tag.
- **He says hi** with his signature move (Tommy's Y with peace fingers, Teddy's boxing combo or jump shot) and **tosses you a treat** (🍦 💧 🧃 🍪 🍉 🍌) that flies to your face in the top bar: "🧃 JUICE BOX FROM TOMMY!"
- **Then he places one of your pieces:** it lifts out of your tray in a gold ring and flies to its place, and he points at it: **"TOMMY SAYS: THIS ONE GOES HERE!"** (then "I FOUND ONE!", "HERE YOU GO!"). He picks the way a real puzzler would: corners and edges first, then pieces next to ones already down. It counts as yours, in a race too.
- After a few seconds he does his goodbye move and pops out. **Call him again** (while he's there or after) and he says hi again, brings another treat and places another piece.

**2 players:** both brothers are playing, so **T** (or 🙌) is a **high five**: they pop in at the bottom, run together, slap hands (💥 🙌) and pop out. It doesn't change the game.

## Make it yours

- `js/title.js`: the game's name.
- `js/rules.js`: `SIZES` (how many pieces), `LEVELS` (how close a drop must be, the ghost picture, the glow, the CPU friend and her speed), `KNOB` (the shape of a knob).
- `js/scenes.js`: the six pictures (`LIST` and `BUILD`).

## How it works, and how it's tested

- `js/rules.js` has no Three.js and no page in it: the cut (every inside edge stored once and drawn from both sides), `sideCurve` and `path` (the outline as Bézier curves), `fits` (a piece fits only at its own home), and `makePuzzle` (the trays, placing, sorting and completion).
- `js/board.js` lays out the board and trays for the screen, cuts each piece's sprite out of the rendered picture with a bevel, paints placed pieces onto a board layer once, and draws the table each frame. `js/game.js` has the rounds, the input and the loop.
- Console hooks (`window.game`):

```js
game.start({ scene: 'moon', n: 35, mode: 'race', level: 'normal', who: 'teddy', seed: 9 })   // straight into a puzzle
game.dropOn(4)          // drag piece 4 to its home with real pointer events on the table (dropOn(4, c, r): somewhere else)
game.tapPiece(4); game.tapCell(2, 1)   // choose a piece with a tap, then tap a place
game.key('f')           // a key press
game.sort()             // 🖼️ EDGES
game.call()             // call your brother (2 players: high five)
game.cpu(false)         // stop the CPU friend (for tests)
game.step(2)            // advance 2 s and draw (when the browser tab's animation is throttled)
game.hold(true)         // freeze the live loop, so only game.step() moves time
game.check()            // the headless check below; game.check({ sabotage: 'early' }) proves it can fail
game.info()             // state, trays, placed, the race, keyboard cursors, your brother, the layout
```

The check runs in headless Chrome from a terminal (no server needed), with every sabotage after it:

```bash
URL="file://$PWD/index.html" node tools/shoot.js tools/check.json docs
```

**The check** (`game.check()`, `js/check.js`):

- **cut:** every size (6 to 100) × 8 seeds: one piece per place, flat sides only on the border, a knob or a hole on every inside side, corners / edges / middles named right (exactly 4 corners), every knob inside its sprite's room, and **both sides of every inside edge the very same curve** (every control point within a billionth of a piece), one with a knob and one with a hole.
- **fit (pieces fit only in place):** on both levels, every piece fits at its own home and at **no other place on the board**; just inside the level's distance it fits, just outside it doesn't (8 directions); off the board never.
- **deal:** the two trays hold every piece once, within one of each other, with the corners and the edge pieces split fairly; sorting puts corners, then edges, then the middle, and keeps every piece.
- **complete (completion detection):** each piece dropped in a wrong place first (never placed), then at home; a piece can't be placed twice; **complete only after the last piece**, and the trays empty.
- **play:** whole puzzles through the real game, EASY and NORMAL × 6, 12, 20 pieces × alone, race and 2 players: every piece first dragged to a wrong place with real pointer events (it must slide back to its tray), then home by a mouse drag, a finger drag, tap-then-tap, or the keyboard cursor (in turn). The finish comes **exactly once and only after the last piece**, a race ends when a tray is empty and fills in the rest, and the PLAY AGAIN card shows.
- **It can fail:** `game.check({ sabotage })` breaks one thing: `anywhere` (pieces fit anywhere), `early` (complete one piece too soon), `mismatch` (one knob shifted off its hole), `twin` (two pieces share a place). Each makes the check fail, with the first failure naming it (for example "piece 0's right side doesn't fit piece 1's left side (off by 0.120 of a piece)", "complete with 1 piece(s) still to place").
- **At the last run:** all passed: cut 97,864, fit 146,872, deal 384, complete 5,592, play 440. Every sabotage failed it.
- **The browser** (headless Chrome over the DevTools protocol, `tools/shoot.js`, from `file://`, muted): real mouse drags (a wrong place slides back, the right place clicks in), real clicks (tap a piece, tap its place), the menu keys (↑ ↓ ← → L + – and 2 to start), E, T (your brother's visit, treat and piece), the ? panel freezing the clock and any key closing it, P and Esc pausing and resuming, the live keyboard cursor, Froggy putting pieces in by herself in real time, Enter on the card for PLAY AGAIN; the 🔊 button and M checked with a stand-in so the game was never unmuted. No page errors. Layouts at 1200×750, 1024×768, 768×1024 (100 pieces), 390×844 and 740×360 (menu, play, your brother, the finish). 中文: every screen visited (menu, play, sorting, your brother's visit, the ? panel, pause, the picture, the finish alone and in a race, Froggy's pieces, the high five) with `Kit.lang.untranslated()` `[]` throughout (a planted string was caught). English: no Chinese on the page except the kit's language button.

## Files

```
index.html              page, HUD, menus, panels (CSS inline)
js/title.js             the game's name (one constant)
js/rules.js             sizes, levels, the cut, fitting, the trays and completion (no Three.js)
js/scenes.js            the six pictures, built and rendered with Three.js
js/board.js             the layout, the pieces' sprites, the board layer and drawing the table
js/stage.js             the see-through layer where the boys, Froggy and Foxy stand
js/actor.js             a boy on the stage: poses, reactions, treats; Froggy and Foxy on podiums (from TT Spot the Difference)
js/buddy.js             your brother's visit and the piece he places, and the 2-player high five
js/fx.js                emoji flyers and confetti
js/sfx.js               the game's own synth sounds (on Kit.sound)
js/check.js             the headless check (game.check)
js/game.js              the menu and its self-building demo, rounds, input, the CPU friend, the finish, the loop and window.game
js/keys.js              the ? panel's keys (Kit.help)
js/zh.js                the 中文 words (Kit.lang)
kit/                    the shared kit, copied by ../kit/tools/sync.py (don't edit here)
tools/shoot.js          headless Chrome steps: screenshots, real input (clicks, drags, keys), the check
tools/check.json        the check and every sabotage (see above)
tools/shots.json        docs/screenshot.jpg: URL="file://$PWD/index.html" node tools/shoot.js tools/shots.json docs 1200 750
dist/jigsaw-tt.html     the whole game in one page
```

## Not verified

- Sound: every test ran muted, so nothing was heard; the sounds were only checked in code.
- Real touch devices: drags and taps were tested with synthetic pointer events and real mouse events, and two fingers dragging at once only in code, not on a real iPad or phone.
- How hard it really is for the boys: whether Froggy is slow enough for Tommy, Foxy quick enough for Teddy, and whether 54 or 100 pieces on a phone (pieces about 30 px in the tray) is too small; 100 is meant for an iPad or a laptop.
- Double-click from Finder, and the iPad home-screen icon.
