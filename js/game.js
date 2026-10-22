/* TT Jigsaw: the game. The menu (with a puzzle putting itself together), a round (the trays, dragging, tapping, the
   keyboard cursors, the CPU friend, the race, the brother's visit), the finish, the loop and window.game for tests.
     - 👤 ALONE: every piece is yours (in both trays); a clock, and your best time for that picture and size.
     - 🐸 / 🦊 RACE: you and the CPU friend share the board, each with your own tray. First to empty his tray wins.
     - 👥 2 PLAYERS: Teddy's tray on the left, Tommy's on the right, one board. First to empty his tray wins.
   In a race the rest of the pieces fly in by themselves after the winner's last one, so the picture always finishes. */
(function () {
  'use strict';
  const JG = window.JG;
  const RU = JG.rules, BD = JG.board, ST = JG.stage, SC = JG.scenes;
  const S = Kit.sound;
  const $ = (id) => document.getElementById(id);
  const { rand } = Kit.gfx;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const NAME = { teddy: 'TEDDY', tommy: 'TOMMY', froggy: 'FROGGY', foxy: 'FOXY' };
  const EMBLEM = { froggy: '🐸', foxy: '🦊' };
  const STORE = 'jigsawTT.v1';
  const MODES = ['alone', 'race', 'two'];
  const SIZES = RU.SIZES.map((s) => s.n);

  function load() {
    let p = {};
    try {
      p = JSON.parse(localStorage.getItem(STORE) || '{}') || {};
    } catch (e) {
      p = {};
    }
    return Object.assign({ mode: 'alone', who: 'teddy', level: 'easy', n: 6, scene: 'metro', best: {} }, p);
  }
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify(prefs));
    } catch (e) { /* private mode: the game still plays */ }
  }

  let ui = null, art = {}, flyers = null;
  const kids = {}, pilots = {};
  const prefs = load();
  const cursor = () => ({ on: false, mode: 'tray', id: -1, c: -1, r: -1, hold: -1 });
  const G = {
    state: 'home', held: false, last: 0, P: null, L: null, LV: RU.LEVELS.easy, level: 'easy', mode: 'alone', who: 'teddy', n: 6, scene: 'metro', seed: 1,
    sides: [], pv: [], drags: new Map(), sel: -1, K: [cursor(), cursor()], cpu: { on: true, wait: 0, busy: -1 },
    time: 0, streak: 0, raceWon: -1, fillQ: [], fillT: 0, celebT: 0, winner: -1, panelT: 0, placedBy: [0, 0],
    wins: {}, sorted: false, frameDone: false, completions: 0, finishedEarly: 0, lastKey: -1, img: null, imgURL: '', peek: false,
    demo: null, newBest: false,
  };

  // ---------------------------------------------------------------- who's playing

  function makeSides() {
    if (G.mode === 'two') return [{ id: 'teddy', human: true, kb: 0 }, { id: 'tommy', human: true, kb: 1 }];
    if (G.mode === 'race') return [{ id: G.who, human: true, kb: 0 }, { id: G.LV.cpu, human: false, kb: -1 }];
    return [{ id: G.who, human: true, kb: 0 }, { id: G.who, human: true, kb: 0 }];
  }
  const sideColor = (t) => BD.COLORS[G.sides[t] ? G.sides[t].id : 'team'];
  const humanPile = (t) => G.sides[t] && G.sides[t].human;
  // the piles keyboard k picks from (in 1 player both sets of keys drive cursor 0)
  const pilesFor = (k) => [0, 1].filter((t) => G.sides[t] && G.sides[t].human && G.sides[t].kb === k);

  // ---------------------------------------------------------------- toasts

  function toast(text, kind = '') {
    const d = document.createElement('div');
    d.className = 'toast ' + kind;
    d.textContent = text;
    ui.toasts.appendChild(d);
    while (ui.toasts.children.length > 3) ui.toasts.firstChild.remove();
    setTimeout(() => d.remove(), kind === 'save' ? 2500 : 2100);
  }

  // ---------------------------------------------------------------- the round

  function imageSize(cols, rows) {
    const long = cols === rows ? 1100 : 1200;
    return cols >= rows ? [long, Math.round((long * rows) / cols)] : [Math.round((long * cols) / rows), long];
  }

  function startRound(o = {}) {
    if (o.scene) prefs.scene = o.scene;
    for (const k of ['mode', 'who', 'level', 'n']) if (o[k] !== undefined) prefs[k] = o[k];
    save();
    Object.assign(G, { mode: prefs.mode, who: prefs.who, level: prefs.level, n: prefs.n, scene: prefs.scene });
    G.LV = RU.LEVELS[G.level];
    G.seed = o.seed || 1 + Math.floor(Math.random() * 1e6);
    G.sides = makeSides();
    G.P = RU.makePuzzle({ n: G.n, seed: G.seed, piles: 2 });
    G.n0 = G.P.piles.map((p) => p.length);
    const [w, h] = imageSize(G.P.cols, G.P.rows);
    G.img = SC.render(G.scene, w, h);
    G.imgURL = G.img.toDataURL('image/jpeg', 0.85);
    ui.lidImg.src = G.imgURL;
    ui.peekImg.src = G.imgURL;
    Object.assign(G, {
      state: 'play', time: 0, streak: 0, raceWon: -1, fillQ: [], fillT: 0, celebT: 0, winner: -1, panelT: 0, placedBy: [0, 0],
      sorted: false, frameDone: false, sel: -1, peek: false, demo: null, newBest: false,
    });
    G.drags.clear();
    G.K = [cursor(), cursor()];
    G.cpu = { on: G.cpu.on, wait: 2 + RU.cpuEach(G.level, G.n, Math.random()), busy: -1 };
    G.pv = G.P.pieces.map((p) => ({ id: p.id, mode: 'tray', t: G.P.owner[p.id], slot: 0, x: 0, y: 0, size: 10, lift: 0, wig: 0, fly: null, ring: null, heldT: 0, home: false }));
    G.P.piles.forEach((pile, t) => pile.forEach((id, i) => (G.pv[id].slot = i)));
    layout();
    BD.setPuzzle(G.P, G.img, G.level);
    for (const v of G.pv) snapToSlot(v);
    show(ui.home, false);
    show(ui.hud, true);
    show(ui.over, false);
    show(ui.pause, false);
    show(ui.peek, false);
    hideActors();
    JG.buddy.reset();
    if (G.mode !== 'two') JG.buddy.setFor(G.who);
    setupHud();
    const sc = SC.get(G.scene);
    toast(`${sc.emoji} ${sc.name} · ${G.n} PIECES!`);
    S.music('play');
    document.body.dataset.screen = 'play';
  }

  function layout() {
    const W = Math.max(1, innerWidth), H = Math.max(1, innerHeight);
    G.L = G.state === 'home' || !G.P ? homeLayout(W, H) : BD.layout(W, H, { cols: G.P.cols, rows: G.P.rows, piles: G.n0 });
    BD.resize(W, H, G.L);
    const r = document.documentElement.style;
    r.setProperty('--top', G.L.top + 'px');
    r.setProperty('--cb', G.L.cb + 'px');
    document.body.dataset.short = G.L.short ? '1' : '0';
    document.body.dataset.shape = G.L.tall ? 'tall' : 'wide';
  }

  // the menu's table: the demo puzzle on the left (wide) or above the menu (tall), pieces scattered round it
  function homeLayout(W, H) {
    const tall = W / H < 1.05;
    const area = tall ? { x: BD.GUTTER, y: 8, w: W - BD.GUTTER - 8, h: H * 0.32 - 10 } : { x: BD.GUTTER, y: 0, w: W * 0.47 - BD.GUTTER, h: H };
    const cols = G.demo ? G.demo.P.cols : 4, rows = G.demo ? G.demo.P.rows : 3;
    let bw = area.w * (tall ? 0.56 : 0.62), bh = (bw * rows) / cols;
    if (bh > area.h * (tall ? 0.6 : 0.46)) {
      bh = area.h * (tall ? 0.6 : 0.46);
      bw = (bh * cols) / rows;
    }
    const by = tall ? area.y + (area.h - bh) / 2 : area.y + area.h * 0.4 - bh / 2;
    return { tall, short: H < 470, top: 60, cb: 84, m: 8, W, H, area, board: { x: area.x + (area.w - bw) / 2, y: by, w: bw, h: bh, cell: bw / cols }, trays: [], slot: 40, body: bw / cols };
  }

  function slotPos(v) {
    return BD.slotXY(G.L, v.t, v.slot, G.n0[v.t]);
  }
  function snapToSlot(v) {
    const s = slotPos(v);
    v.x = s.x;
    v.y = s.y;
    v.size = G.L.body;
  }

  // ---------------------------------------------------------------- moving pieces

  function fly(id, x1, y1, s1, dur, arc, done, ring = null, home = false) {
    const v = G.pv[id];
    v.mode = 'fly';
    v.home = home;
    v.ring = ring;
    v.fly = { x0: v.x, y0: v.y, s0: v.size, x1, y1, s1, u: 0, dur, arc, done };
  }
  function flyHome(id, dur, arc, done, ring) {
    const h = BD.homeXY(G.L, (G.P || G.demo.P).pieces[id]);
    fly(id, h.x, h.y, G.L.board.cell, dur, arc, done, ring, true);
  }
  function flyBack(id) {
    const v = G.pv[id];
    const s = slotPos(v);
    fly(id, s.x, s.y, G.L.body, 0.32, 0, () => (v.mode = 'tray'));
  }

  // it fits: the model already has it placed; it clicks into its home and is painted onto the board
  function land(id, who, quiet = false) {
    const v = G.pv[id];
    v.mode = 'placed';
    BD.paint(id);
    if (G.raceWon < 0 && G.state === 'play') G.placedBy[who]++;
    const h = BD.homeXY(G.L, G.P.pieces[id]);
    if (!quiet) {
      if (G.sides[who] && G.sides[who].human) {
        G.streak++;
        JG.sfx.place(G.streak);
      } else JG.sfx.rival();
      JG.fx.overlay.burst(h.x, h.y, 6, ['✨', '⭐'], 0.4);
    }
    bump(who);
    afterPlace();
  }

  // a drop that doesn't fit: the piece wiggles and slides back to its tray
  function miss(id, onBoard) {
    const v = G.pv[id];
    if (onBoard) {
      JG.sfx.miss();
      v.wig = 0.5;
      G.streak = 0;
    }
    flyBack(id);
  }

  // Drop piece `id` with its middle at screen (x, y).
  function drop(id, x, y) {
    const c = BD.toCells(G.L, x, y);
    const r = G.P.place(id, c.u, c.v, G.LV.tol, G.P.owner[id]);
    if (r === 'placed') {
      if (G.sel === id) G.sel = -1;
      flyHome(id, 0.12, 0, () => land(id, G.P.owner[id]));
      return true;
    }
    miss(id, inBoard(x, y));
    return false;
  }
  function inBoard(x, y) {
    const b = G.L.board;
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  function afterPlace() {
    if (G.state !== 'play') return;
    const P = G.P;
    if (!G.frameDone && P.pieces.every((p) => p.kind === 'middle' || P.placed[p.id])) {
      G.frameDone = true;
      if (P.count < P.n && P.pieces.some((p) => p.kind === 'middle')) toast('🖼️ THE FRAME\'S DONE!', 'buddy');
    }
    if (G.mode !== 'alone' && G.raceWon < 0) {
      for (const t of [0, 1]) {
        if (P.left(t) === 0 && !G.pv.some((v) => v.mode === 'fly' && v.home && G.P.owner[v.id] === t)) {
          raceWon(t);
          break;
        }
      }
    }
    if (P.complete() && !G.pv.some((v) => v.mode === 'fly' && v.home)) finish();
  }

  // someone emptied his tray first: everyone lets go, and the rest of the pieces fly in by themselves
  function raceWon(t) {
    G.raceWon = t;
    letGo();
    G.fillQ = G.P.pieces.filter((p) => !G.P.placed[p.id] && G.pv[p.id].mode === 'tray').map((p) => p.id);
    G.fillT = 0.5;
    toast(`${NAME[G.sides[t].id]} WINS THE RACE!`, 'save');
  }
  function updateFill(dt) {
    if (!G.fillQ.length) return;
    G.fillT -= dt;
    if (G.fillT > 0) return;
    G.fillT = Math.min(0.12, 2.4 / G.P.n);
    const id = G.fillQ.shift();
    if (G.P.placed[id] || G.pv[id].mode !== 'tray') return;
    const who = G.P.owner[id];
    flyHome(id, 0.45, G.L.board.cell * 0.5, () => {
      G.P.placeHome(id, who);
      land(id, who, true);
    });
  }

  // drop whatever is in hands (fingers, the mouse, keyboard cursors, a tap selection) back into the trays
  function letGo() {
    for (const d of G.drags.values()) if (G.pv[d.id].mode === 'drag') flyBack(d.id);
    G.drags.clear();
    for (const c of G.K) {
      if (c.mode === 'board' && c.hold >= 0 && G.pv[c.hold].mode === 'key') flyBack(c.hold);
      c.mode = 'tray';
      c.hold = -1;
    }
    G.sel = -1;
    ui.table.classList.remove('grab');
  }

  // ---------------------------------------------------------------- the CPU friend

  function updateCpu(dt) {
    if (G.mode !== 'race' || !G.cpu.on || G.raceWon >= 0 || G.state !== 'play') return;
    G.cpu.wait -= dt;
    if (G.cpu.wait > 0 || G.cpu.busy >= 0) return;
    const id = RU.pickNext(G.P, 1, Math.random, (i) => G.pv[i].mode === 'tray');
    if (id < 0) return;
    G.cpu.busy = id;
    flyHome(id, 0.9, G.L.board.cell * 0.8, () => {
      G.cpu.busy = -1;
      G.P.placeHome(id, 1);
      land(id, 1);
    }, BD.COLORS[G.sides[1].id]);
    G.cpu.wait = RU.cpuEach(G.level, G.n, Math.random());
    const p = pilots[G.sides[1].id];
    if (p && p.visible) p.react('hop');
  }

  // ---------------------------------------------------------------- sort the edges

  function sortEdges() {
    if (G.state !== 'play') return;
    for (const t of [0, 1]) {
      if (!humanPile(t)) continue;
      const order = G.P.sort(t);
      order.forEach((id, i) => (G.pv[id].slot = i));
    }
    G.sorted = true;
    JG.sfx.sort();
    toast('⭐ CORNERS FIRST, THEN THE EDGES!', 'hint');
  }

  // ---------------------------------------------------------------- input: fingers and the mouse

  function pieceAt(x, y) {
    let best = -1, bestD = Infinity;
    for (const v of G.pv) {
      if (v.mode !== 'tray') continue;
      const r = Math.max(v.size * 0.62, 20), d = Math.hypot(v.x - x, v.y - y);
      if (Math.abs(v.x - x) <= r && Math.abs(v.y - y) <= r && d < bestD) {
        best = v.id;
        bestD = d;
      }
    }
    return best;
  }

  function onDown(e) {
    gesture();
    if (G.state !== 'play') return;
    hideCursors();
    const x = e.clientX, y = e.clientY;
    const id = pieceAt(x, y);
    if (id >= 0) {
      if (!humanPile(G.pv[id].t)) {
        G.pv[id].wig = 0.4;
        toast(`${EMBLEM[G.sides[1].id]} ${NAME[G.sides[1].id]}'S PIECES!`, 'rival');
        return;
      }
      const v = G.pv[id];
      v.mode = 'drag';
      const d = { id, x, y, x0: x, y0: y, t0: performance.now(), moved: false, ox: v.x - x, oy: v.y - y, touch: e.pointerType === 'touch' || e.pointerType === 'pen' };
      G.drags.set(e.pointerId, d);
      if (G.sel >= 0 && G.sel !== id) G.sel = -1;
      try {
        ui.table.setPointerCapture(e.pointerId);
      } catch (err) { /* a synthetic event */ }
      ui.table.classList.add('grab');
      JG.sfx.pick();
      return;
    }
    // a tap on the board while a piece is chosen: try it there
    if (G.sel >= 0 && inBoard(x, y)) {
      const c = BD.toCells(G.L, x, y);
      const id2 = G.sel;
      const r = G.P.place(id2, Math.floor(c.u) + 0.5, Math.floor(c.v) + 0.5, G.LV.tol, G.P.owner[id2]);
      G.sel = -1;
      if (r === 'placed') flyHome(id2, 0.22, G.L.board.cell * 0.3, () => land(id2, G.P.owner[id2]));
      else miss(id2, true);
    } else if (G.sel >= 0) G.sel = -1;
  }
  function onMove(e) {
    const d = G.drags.get(e.pointerId);
    if (!d) return;
    d.x = e.clientX;
    d.y = e.clientY;
    if (Math.hypot(d.x - d.x0, d.y - d.y0) > 9) d.moved = true;
  }
  function onUp(e) {
    const d = G.drags.get(e.pointerId);
    if (!d) return;
    G.drags.delete(e.pointerId);
    if (!G.drags.size) ui.table.classList.remove('grab');
    const v = G.pv[d.id];
    if (v.mode !== 'drag') return;
    if (e.type === 'pointercancel') return flyBack(d.id);
    if (!d.moved && performance.now() - d.t0 < 450) {
      // a tap: choose this piece (or put it down again), then tap its place on the board
      G.sel = G.sel === d.id ? -1 : d.id;
      flyBack(d.id);
      return;
    }
    drop(d.id, v.x, v.y);
  }
  function updateDrags(dt) {
    const k = 1 - Math.exp(-18 * dt);
    for (const d of G.drags.values()) {
      const v = G.pv[d.id];
      if (v.mode !== 'drag') continue;
      // the piece grows to the board's size, a little above a finger so you can see it
      const ty = d.touch ? -G.L.board.cell * 0.32 : 0;
      d.ox += (0 - d.ox) * k;
      d.oy += (ty - d.oy) * k;
      v.x = d.x + d.ox;
      v.y = d.y + d.oy;
      v.size += (G.L.board.cell - v.size) * k;
      v.lift = Math.min(1, v.lift + dt * 6);
    }
  }

  // ---------------------------------------------------------------- input: the keyboard cursors

  function validFor(k, id) {
    return id >= 0 && G.pv[id].mode === 'tray' && pilesFor(k).includes(G.pv[id].t);
  }
  function firstFor(k, from = null) {
    let best = -1, bestD = Infinity;
    for (const v of G.pv) {
      if (!validFor(k, v.id)) continue;
      const d = from ? Math.hypot(v.x - from.x, v.y - from.y) : v.t * 1e4 + v.slot;
      if (d < bestD) {
        best = v.id;
        bestD = d;
      }
    }
    return best;
  }
  // the nearest piece in the direction pressed, among the ones this player may take
  function navTray(k, id, dx, dy) {
    const from = slotPos(G.pv[id]);
    let best = id, bestS = Infinity;
    for (const v of G.pv) {
      if (v.id === id || !validFor(k, v.id)) continue;
      const s = slotPos(v), ex = s.x - from.x, ey = s.y - from.y;
      const along = ex * dx + ey * dy, across = Math.abs(ex * dy - ey * dx);
      if (along < 4) continue;
      const score = along + across * 2.5;
      if (score < bestS) {
        bestS = score;
        best = v.id;
      }
    }
    return best;
  }
  function hideCursors() {
    G.K.forEach((c) => (c.on = false));
  }

  function keyMove(k, dx, dy) {
    if (G.state !== 'play') return;
    const c = G.K[k];
    if (!pilesFor(k).length) return;
    if (!c.on || (c.mode === 'tray' && !validFor(k, c.id))) {
      c.on = true;
      if (c.mode === 'tray' && !validFor(k, c.id)) c.id = firstFor(k, c.id >= 0 ? G.pv[c.id] : null);
      if (!(c.mode === 'board')) return;
    }
    if (c.mode === 'tray') {
      if (c.id < 0) return;
      const n = navTray(k, c.id, dx, dy);
      if (n !== c.id) JG.sfx.tick();
      c.id = n;
    } else {
      c.c += dx;
      c.r += dy;
      JG.sfx.tick();
      if (c.c < 0 || c.r < 0 || c.c >= G.P.cols || c.r >= G.P.rows) {
        // off the board: the piece goes back to its tray
        c.c = clamp(c.c, 0, G.P.cols - 1);
        c.r = clamp(c.r, 0, G.P.rows - 1);
        flyBack(c.hold);
        c.id = c.hold;
        c.hold = -1;
        c.mode = 'tray';
      }
    }
  }

  function keyAct(k) {
    if (G.state !== 'play') return;
    const c = G.K[k];
    if (!pilesFor(k).length) return;
    if (!c.on) {
      c.on = true;
      if (c.mode === 'tray' && !validFor(k, c.id)) c.id = firstFor(k);
      return;
    }
    if (c.mode === 'tray') {
      if (!validFor(k, c.id)) {
        c.id = firstFor(k);
        return;
      }
      // pick it up: it rides on a cursor over the board
      c.mode = 'board';
      c.hold = c.id;
      if (c.c < 0) {
        c.c = Math.floor(G.P.cols / 2);
        c.r = Math.floor(G.P.rows / 2);
      }
      G.pv[c.hold].mode = 'key';
      if (G.sel === c.hold) G.sel = -1;
      JG.sfx.pick();
      return;
    }
    // put it down here: it fits only at home
    const id = c.hold;
    const r = G.P.place(id, c.c + 0.5, c.r + 0.5, G.LV.tol, G.P.owner[id]);
    c.mode = 'tray';
    c.hold = -1;
    if (r === 'placed') {
      flyHome(id, 0.12, 0, () => land(id, G.P.owner[id]));
      c.id = firstFor(k, G.pv[id]);
    } else {
      miss(id, true);
      c.id = id;
    }
  }
  function updateKeyPieces(dt) {
    const k = 1 - Math.exp(-20 * dt);
    for (const c of G.K) {
      if (c.mode !== 'board' || c.hold < 0) continue;
      const v = G.pv[c.hold];
      if (v.mode !== 'key') {
        c.mode = 'tray';
        c.hold = -1;
        continue;
      }
      const b = G.L.board;
      v.x += (b.x + (c.c + 0.5) * b.cell - v.x) * k;
      v.y += (b.y + (c.r + 0.5) * b.cell - v.y) * k;
      v.size += (b.cell - v.size) * k;
      v.lift = Math.min(1, v.lift + dt * 6);
    }
  }

  const KEYS1 = { a: [0, -1, 0], d: [0, 1, 0], w: [0, 0, -1], s: [0, 0, 1] };
  const KEYS2 = { arrowleft: [1, -1, 0], arrowright: [1, 1, 0], arrowup: [1, 0, -1], arrowdown: [1, 0, 1] };
  function onKey(e) {
    const k = e.key.toLowerCase();
    if (e.repeat && !(KEYS1[k] || KEYS2[k])) return;
    gesture();
    if (k === 'm') return toggleMute();
    if (G.state === 'home') return homeKey(e, k);
    if (G.peek && (k === 'b' || k === 'escape' || k === 'enter' || k === ' ')) {
      e.preventDefault();
      return setPeek(false);
    }
    if (G.state === 'paused') {
      if (k === 'escape' || k === 'p' || k === 'enter' || k === ' ') pause(false);
      else if (k === 'n') again();
      e.preventDefault();
      return;
    }
    if (G.state === 'won') {
      if ((k === 'enter' || k === ' ') && G.panelT <= 0) again();
      else if (k === 'n' && G.panelT <= 0) nextPicture();
      else if (k === 'escape') goHome();
      e.preventDefault();
      return;
    }
    if (k === 'escape' || k === 'p') return pause(true);
    if (G.state !== 'play') return;
    const two = G.mode === 'two';
    if (KEYS1[k] || KEYS2[k]) {
      const [who, dx, dy] = KEYS1[k] || KEYS2[k];
      keyMove(two ? who : 0, dx, dy);
      e.preventDefault();
      return;
    }
    if (k === 'f' || k === ' ') keyAct(0);
    else if (k === 'enter') keyAct(two ? 1 : 0);
    else if (k === 'e') sortEdges();
    else if (k === 't') call();
    else if (k === 'b') setPeek(true);
    else if (k === 'n') again();
    else return;
    e.preventDefault();
  }

  function homeKey(e, k) {
    const n = /^[1-6]$/.test(e.key) ? +e.key : 0;
    if (n) startRound({ scene: SC.ids[n - 1] });
    else if (k === 'arrowleft' || k === 'arrowright') setPref('who', prefs.who === 'teddy' ? 'tommy' : 'teddy');
    else if (k === 'arrowup' || k === 'arrowdown') setPref('mode', MODES[(MODES.indexOf(prefs.mode) + (k === 'arrowdown' ? 1 : 2)) % 3]);
    else if (k === 'l') setPref('level', prefs.level === 'easy' ? 'normal' : 'easy');
    else if (k === '+' || k === '=' || k === '-' || k === '_') {
      const i = SIZES.indexOf(prefs.n) + (k === '-' || k === '_' ? -1 : 1);
      setPref('n', SIZES[clamp(i, 0, SIZES.length - 1)]);
    } else if (k === 'enter' || k === ' ') startRound({});
    if (k.startsWith('arrow') || k === ' ') e.preventDefault();
  }

  // ---------------------------------------------------------------- your brother, the high five

  function call() {
    if (G.state !== 'play') return 'none';
    if (G.mode === 'two') return JG.highFive.start();
    return JG.buddy.call();
  }
  const buddyApi = {
    toast,
    get flyers() { return flyers; },
    spot() {
      const L = G.L, W = innerWidth, H = innerHeight;
      return { x: W - L.cb * 1.55, y: H - Math.max(6, L.m), max: (H * 0.3) / (2 * ST.U) };
    },
    spot2() {
      const L = G.L, W = innerWidth, H = innerHeight;
      const size = Math.min(1, (H * 0.28) / (2 * ST.U));
      return { x: (L.board.x + L.board.w / 2), y: H - 6, apart: ST.U * 2.6 * size, near: ST.U * 0.55 * size, size };
    },
    face() {
      const r = ui.faceL.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    gotTreat() {
      bump(0);
    },
    canHelp() {
      return G.state === 'play' && G.raceWon < 0 && [0, 1].some((t) => humanPile(t) && G.P.piles[t].some((id) => G.pv[id].mode === 'tray'));
    },
    // he places one of your pieces: it lifts out of your tray in a gold ring and flies home
    placeOne() {
      const ok = (id) => G.pv[id].mode === 'tray';
      const piles = [0, 1].filter((t) => humanPile(t) && G.P.piles[t].some(ok));
      if (!piles.length) return -1;
      const t = piles.sort((a, b) => G.P.piles[b].filter(ok).length - G.P.piles[a].filter(ok).length)[0];
      const id = RU.pickNext(G.P, t, Math.random, ok);
      if (id < 0) return -1;
      if (G.sel === id) G.sel = -1;
      flyHome(id, 1.0, G.L.board.cell * 1.2, () => {
        G.P.placeHome(id, t);
        land(id, t);
      }, '#ffd400');
      return id;
    },
    where(id) {
      return BD.homeXY(G.L, G.P.pieces[id]);
    },
  };

  // ---------------------------------------------------------------- the finish

  function finish() {
    if (G.state !== 'play') return;
    const early = G.P.pieces.some((p) => !G.P.placed[p.id]);
    if (early) G.finishedEarly++;
    G.state = 'won';
    G.celebT = 0;
    G.panelT = 1.9;
    G.completions++;
    letGo();
    const w = G.mode === 'alone' ? 0 : G.raceWon;
    G.winner = w;
    // the records: the best time alone, wins in a race
    if (G.mode === 'alone') {
      const key = `${G.scene}:${G.n}:${G.level}`, best = prefs.best[key];
      G.newBest = !best || G.time < best;
      if (G.newBest) {
        prefs.best[key] = Math.round(G.time * 10) / 10;
        save();
      }
    } else {
      const key = winsKey();
      G.wins[key] = G.wins[key] || [0, 0];
      G.wins[key][w]++;
    }
    celebrate(w);
    JG.fx.overlay.rain(130);
    if (G.sides[w].human) JG.sfx.win();
    else JG.sfx.lose();
    S.music('over');
    setupHud();
  }
  const winsKey = () => `${G.mode}:${G.level}:${G.sides.map((s) => s.id).join('-')}`;

  // the winner's signature move on his side of the board; in a race the other one shrugs
  function celebrate(w) {
    hideActors();
    JG.buddy.reset();
    const L = G.L, W = innerWidth, H = innerHeight;
    const spots = L.tall
      ? [{ x: L.trays[0].x + L.trays[0].w * 0.5, y: L.trays[0].y + L.trays[0].h * 0.62 }, { x: L.trays[1].x + L.trays[1].w * 0.5, y: L.trays[1].y + L.trays[1].h * 0.62 }]
      : [{ x: L.trays[0].x + L.trays[0].w * 0.5, y: H - 8 }, { x: L.trays[1].x + L.trays[1].w * 0.5, y: H - 8 }];
    const size = clamp(Math.min(H * (L.tall ? 0.2 : 0.3), (L.trays[0].w * 1.4)) / (2 * ST.U), 0.5, 1.6);
    const who = G.mode === 'alone' ? [0] : [0, 1];
    for (const t of who) {
      const id = G.sides[t].id, a = kids[id] || pilots[id];
      const p = ST.stageAt(spots[t].x, spots[t].y);
      a.place(p.x, p.y, 0);
      a.setScale(size * (a.isPilot ? 0.75 : 1));
      a.face = null;
      a.visible = true;
      a.react(t === w ? 'over' : 'sulk');
    }
  }
  function hideActors() {
    for (const a of [...Object.values(kids), ...Object.values(pilots)]) {
      a.react('idle');
      a.visible = false;
    }
  }

  function showResult() {
    const w = G.winner, sw = G.sides[w];
    ui.oFace.innerHTML = '';
    const img = document.createElement('img');
    img.src = art[sw.id];
    img.alt = '';
    ui.oFace.appendChild(img);
    ui.oScore.innerHTML = '';
    const add = (html, cls = '') => {
      const s = document.createElement('span');
      if (cls) s.className = cls;
      s.innerHTML = html;
      ui.oScore.appendChild(s);
      return s;
    };
    if (G.mode === 'alone') {
      ui.oTitle.textContent = `${NAME[sw.id]} DID IT!`;
      add(`⏱️ ${clock(G.time)}`);
      const best = prefs.best[`${G.scene}:${G.n}:${G.level}`];
      if (G.newBest) add('🏆 NEW BEST!', 'best');
      else if (best) add(`🏆 ${clock(best)}`, 'best');
    } else {
      ui.oTitle.textContent = `${NAME[sw.id]} WINS!`;
      add(`<img src="${art[G.sides[0].id]}" alt=""> 🧩 ${G.placedBy[0]}`);
      add('–');
      add(`🧩 ${G.placedBy[1]} <img src="${art[G.sides[1].id]}" alt="">`);
      const wins = G.wins[winsKey()];
      if (wins) add(`🏆 ${wins[0]} – ${wins[1]}`, 'best');
    }
    show(ui.over, true);
  }

  function again() {
    show(ui.over, false);
    show(ui.pause, false);
    startRound({});
  }
  function nextPicture() {
    const i = SC.ids.indexOf(prefs.scene);
    startRound({ scene: SC.ids[(i + 1) % SC.ids.length] });
  }

  // ---------------------------------------------------------------- menus, pause, the peek

  function show(el, on) {
    el.classList.toggle('hidden', !on);
  }
  function setPref(k, v) {
    prefs[k] = v;
    if (k === 'level') prefs.n = RU.LEVELS[v].size; // EASY starts at 6 pieces, NORMAL at 35
    save();
    syncMenu();
    if (G.state !== 'home') return;
    JG.sfx.kit('click');
  }
  function syncMenu() {
    const on = (seg, v) => {
      for (const b of seg.children) b.classList.toggle('on', b.dataset.v === String(v));
    };
    on(ui.segMode, prefs.mode);
    on(ui.segWho, prefs.who);
    on(ui.segLevel, prefs.level);
    on(ui.segSize, prefs.n);
    show(ui.segWho, prefs.mode !== 'two');
    show(ui.duo, prefs.mode === 'two');
    ui.segWho.style.display = prefs.mode === 'two' ? 'none' : '';
    ui.duo.style.display = prefs.mode === 'two' ? '' : 'none';
    ui.rivalImg.src = art[RU.LEVELS[prefs.level].cpu] || '';
    for (const t of ui.tiles.children) t.classList.toggle('last', t.dataset.t === prefs.scene);
  }

  function goHome() {
    letGo();
    G.state = 'home';
    G.P = null;
    show(ui.home, true);
    show(ui.hud, false);
    show(ui.over, false);
    show(ui.pause, false);
    show(ui.peek, false);
    show(ui.callBtn, false);
    JG.buddy.reset();
    hideActors();
    syncMenu();
    newDemo();
    S.music('title');
    document.body.dataset.screen = 'home';
  }

  function pause(on) {
    if (on && (G.state === 'play' || G.state === 'won')) {
      G.pausedFrom = G.state;
      G.state = 'paused';
      show(ui.pause, true);
      S.music('pause');
    } else if (!on && G.state === 'paused') {
      G.state = G.pausedFrom || 'play';
      show(ui.pause, false);
      S.music(G.state === 'play' ? 'play' : 'over');
    }
  }
  function setPeek(on) {
    G.peek = on && G.state === 'play';
    show(ui.peek, G.peek);
  }

  function toggleMute() {
    const muted = S.toggleMute();
    ui.muteBtn.textContent = muted ? '🔇' : '🔊';
  }
  let started = false;
  function gesture() {
    if (started) return;
    started = true;
    S.init();
    S.music(G.state === 'home' ? 'title' : 'play');
  }

  // ---------------------------------------------------------------- the HUD

  const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function setupHud() {
    const [a, b] = G.sides;
    ui.faceL.src = art[a.id];
    ui.faceR.src = art[b.id];
    const wins = G.wins[winsKey()];
    ui.winsL.textContent = G.mode !== 'alone' && wins && wins[0] ? `🏆${wins[0]}` : '';
    ui.winsR.textContent = G.mode !== 'alone' && wins && wins[1] ? `🏆${wins[1]}` : '';
    const best = prefs.best[`${G.scene}:${G.n}:${G.level}`];
    ui.sideR.style.visibility = G.mode === 'alone' && !best ? 'hidden' : '';
    show(ui.callBtn, G.state !== 'home');
    ui.callFace.src = G.mode === 'two' ? art.five : art[Kit.roster.buddyFor(G.who)];
    ui.callBtn.setAttribute('aria-label', G.mode === 'two' ? 'High five' : 'Call your brother');
    ui.callBtn.title = G.mode === 'two' ? 'High five (T)' : 'Call your brother (T)';
    G.hudKey = '';
  }
  function updateHud() {
    if (G.state === 'home' || !G.P) return;
    const P = G.P;
    let key;
    if (G.mode === 'alone') {
      const left = P.left(0) + P.left(1);
      const best = prefs.best[`${G.scene}:${G.n}:${G.level}`];
      key = `a${left}|${clock(G.time)}|${best}`;
      if (key === G.hudKey) return;
      setText(ui.leftL, `🧩 ${left}`);
      ui.clock.textContent = `⏱️ ${clock(G.time)}`;
      ui.subR.textContent = '🏆';
      ui.leftR.textContent = best ? clock(best) : '';
      ui.faceR.parentElement.style.display = 'none';
    } else {
      const l0 = P.left(0), l1 = P.left(1);
      key = `r${l0}|${l1}`;
      if (key === G.hudKey) return;
      setText(ui.leftL, `🧩 ${l0}`);
      setText(ui.leftR, `🧩 ${l1}`);
      ui.clock.textContent = '';
      ui.subR.textContent = '';
      ui.faceR.parentElement.style.display = '';
      ui.sideL.classList.toggle('lead', l0 < l1);
      ui.sideR.classList.toggle('lead', l1 < l0);
    }
    G.hudKey = key;
  }
  function setText(el, t) {
    if (el.textContent === t) return;
    el.textContent = t;
  }
  function bump(t) {
    const el = t === 0 ? ui.leftL : ui.leftR;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  // ---------------------------------------------------------------- the menu's demo: a puzzle putting itself together

  function newDemo() {
    const prev = G.demo ? G.demo.scene : null;
    const ids = SC.ids.filter((i) => i !== prev);
    const scene = ids[Math.floor(Math.random() * ids.length)];
    const P = RU.makePuzzle({ n: 12, seed: 1 + Math.floor(Math.random() * 1e5), piles: 1 });
    G.demo = { scene, P, t: 0, next: 1.2, done: -1 };
    G.P = null;
    G.L = null;
    layout();
    const [w, h] = imageSize(P.cols, P.rows);
    const img = SC.render(scene, w, h);
    G.pv = P.pieces.map((p) => ({ id: p.id, mode: 'tray', t: 0, slot: 0, x: 0, y: 0, size: 10, lift: 0, wig: 0, fly: null, ring: null, heldT: 0, home: false }));
    BD.setPuzzle(P, img, 'easy');
    scatterDemo();
    showDemoKids();
  }
  // the loose pieces lie round the board, never on it and never on the boys
  function scatterDemo() {
    const D = G.demo, L = G.L, A = L.area, b = L.board, cell = b.cell, H = innerHeight;
    const r = RU.rng(D.P.seed);
    const step = cell * 1.18, spots = [];
    const kidH = H * 0.22, kidW = H * 0.09;
    for (let y = A.y + step * 0.55; y < A.y + A.h - step * 0.5; y += step) {
      for (let x = A.x + step * 0.55; x < A.x + A.w - step * 0.5; x += step) {
        if (x > b.x - cell * 0.75 && x < b.x + b.w + cell * 0.75 && y > b.y - cell * 0.75 && y < b.y + b.h + cell * 0.75) continue;
        if (!L.tall && y > H - kidH - cell * 0.5 && [0.2, 0.8].some((f) => Math.abs(x - (A.x + A.w * f)) < kidW + cell * 0.5)) continue;
        spots.push({ x, y });
      }
    }
    RU.shuffle(spots, r);
    let i = 0;
    for (const v of G.pv) {
      if (v.mode !== 'tray') continue;
      const s = spots[i++ % Math.max(1, spots.length)] || { x: A.x + A.w / 2, y: A.y + cell };
      v.x = s.x + (r() - 0.5) * cell * 0.2;
      v.y = s.y + (r() - 0.5) * cell * 0.2;
      v.size = cell * 0.9;
      v.rot = (r() - 0.5) * 0.6;
    }
  }
  function showDemoKids() {
    hideActors();
    const L = G.L;
    if (L.tall) return;
    const H = innerHeight, size = clamp((H * 0.2) / (2 * ST.U), 0.5, 1.2);
    [['teddy', L.area.x + L.area.w * 0.2], ['tommy', L.area.x + L.area.w * 0.8]].forEach(([id, x]) => {
      const a = kids[id], p = ST.stageAt(x, H - 6);
      a.place(p.x, p.y, 0);
      a.setScale(size);
      a.face = null;
      a.visible = true;
      a.react('idle');
    });
  }
  function updateDemo(dt) {
    const D = G.demo;
    if (!D) return;
    D.t += dt;
    if (D.done >= 0) {
      D.done += dt;
      if (D.done > 3.6) newDemo();
      return;
    }
    D.next -= dt;
    if (D.next > 0) return;
    D.next = 0.75;
    const left = D.P.piles[0].filter((id) => G.pv[id].mode === 'tray');
    if (!left.length) return;
    const id = RU.pickNext(D.P, 0, Math.random, (i) => G.pv[i].mode === 'tray');
    const v = G.pv[id];
    v.rot = 0;
    flyHome(id, 0.7, G.L.board.cell * 0.6, () => {
      D.P.placeHome(id, 0);
      v.mode = 'placed';
      BD.paint(id);
      if (D.P.complete()) {
        D.done = 0;
        for (const k of Object.values(kids)) if (k.visible) k.react('signature');
      }
    });
  }

  // ---------------------------------------------------------------- the loop

  function view() {
    const pieces = [], cursors = [], glow = [];
    const order = { tray: 0, key: 2, fly: 3, drag: 4 };
    const list = G.pv.filter((v) => v.mode !== 'placed').sort((a, b) => (order[a.mode] || 0) + (a.id === G.sel ? 1 : 0) - ((order[b.mode] || 0) + (b.id === G.sel ? 1 : 0)));
    const now = G.demo ? G.demo.t : G.time;
    for (const v of list) {
      const sel = v.id === G.sel;
      const corner = G.sorted && G.P && G.P.pieces[v.id].kind === 'corner' && v.mode === 'tray' && humanPile(v.t);
      pieces.push({
        id: v.id, x: v.x, y: v.y - (sel ? 6 : 0), size: v.size * (sel ? 1.15 : 1), lift: sel ? 1 : v.lift,
        rot: (v.rot || 0) + (v.wig > 0 ? Math.sin(v.wig * 40) * 0.18 * (v.wig / 0.5) : 0),
        ring: sel ? '#ffd400' : v.ring, star: corner,
      });
      if (G.P && (v.mode === 'drag' || v.mode === 'key' || sel) && v.heldT > G.LV.glow) glow.push({ id: v.id, a: 0.5 + 0.5 * Math.sin(now * 6) });
    }
    if (G.state === 'play') {
      G.K.forEach((c, k) => {
        if (!c.on || !pilesFor(k).length) return;
        const color = G.mode === 'two' ? sideColor(k) : '#ffd400';
        if (c.mode === 'tray' && c.id >= 0 && G.pv[c.id].mode === 'tray') {
          const v = G.pv[c.id];
          cursors.push({ x: v.x, y: v.y, w: G.L.slot * 0.98, h: G.L.slot * 0.98, color });
        } else if (c.mode === 'board') {
          const b = G.L.board;
          cursors.push({ x: b.x + (c.c + 0.5) * b.cell, y: b.y + (c.r + 0.5) * b.cell, w: b.cell, h: b.cell, color, dash: true });
        }
      });
    }
    const trays = G.sides.length && G.state !== 'home' ? G.sides.map((s) => ({ color: BD.COLORS[s.id], fill: tint(BD.COLORS[s.id]) })) : [];
    const ce = G.state === 'won' || (G.state === 'paused' && G.pausedFrom === 'won') ? G.celebT : G.demo && G.demo.done >= 0 ? G.demo.done : -1;
    return {
      pieces, cursors, glow, trays, ghost: G.state === 'home' ? false : G.LV.ghost,
      complete: ce >= 0 ? clamp((ce - 0.1) / 0.7, 0, 1) : 0, shine: ce >= 0 ? (ce - 0.8) / 0.9 : 0,
    };
  }
  const tint = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},0.16)`;
  };

  function step(dt) {
    dt = Math.min(dt, 0.1);
    const playing = G.state === 'play', won = G.state === 'won', paused = G.state === 'paused';
    if (!paused) {
      if (playing) G.time += dt;
      updateDrags(dt);
      updateKeyPieces(dt);
      for (const v of G.pv) {
        if (v.mode === 'fly') {
          const f = v.fly;
          f.u = Math.min(1, f.u + dt / f.dur);
          const k = 1 - Math.pow(1 - f.u, 3);
          v.x = f.x0 + (f.x1 - f.x0) * k;
          v.y = f.y0 + (f.y1 - f.y0) * k - Math.sin(Math.PI * f.u) * f.arc;
          v.size = f.s0 + (f.s1 - f.s0) * k;
          v.lift = Math.sin(Math.PI * f.u);
          if (f.u >= 1) {
            v.fly = null;
            v.lift = 0;
            v.ring = null;
            v.mode = 'tray';
            if (f.done) f.done();
          }
        } else if (v.mode === 'tray' && G.state !== 'home') {
          const s = slotPos(v), k = 1 - Math.exp(-12 * dt);
          v.x += (s.x - v.x) * k;
          v.y += (s.y - v.y) * k;
          v.size += (G.L.body - v.size) * k;
          v.lift = Math.max(0, v.lift - dt * 5);
        }
        if (v.wig > 0) v.wig = Math.max(0, v.wig - dt);
        const held = v.mode === 'drag' || v.mode === 'key' || v.id === G.sel;
        v.heldT = held ? v.heldT + dt : 0;
      }
      if (playing) {
        updateCpu(dt);
        updateFill(dt);
      }
      if (won) {
        G.celebT += dt;
        if (G.panelT > 0) {
          G.panelT -= dt;
          if (G.panelT <= 0) showResult();
        }
      }
      if (G.state === 'home') updateDemo(dt);
      JG.buddy.update(dt);
      for (const a of [...Object.values(kids), ...Object.values(pilots)]) if (a.visible) a.update(dt);
      flyers.update(dt);
    }
    updateHud();
    ui.callBtn.classList.toggle('here', JG.buddy.on);
    BD.draw(view());
    JG.fx.overlay.update(paused ? 0 : dt);
    const busy = JG.buddy.on || JG.highFive.on || Object.values(kids).some((a) => a.visible) || Object.values(pilots).some((a) => a.visible) || flyersBusy();
    ST.render(busy);
  }
  let flyT = 0;
  function flyersBusy() {
    // the flyers pool has no count: keep drawing a moment after anything that spawns them
    if (JG.buddy.on || JG.highFive.on) flyT = 2;
    return flyT > 0;
  }

  function frame(now) {
    const dt = G.last ? (now - G.last) / 1000 : 0.016;
    G.last = now;
    flyT = Math.max(0, flyT - dt);
    if (!G.held) step(dt);
    requestAnimationFrame(frame);
  }

  function onResize() {
    ST.resize();
    JG.fx.overlay.resize();
    if (G.state === 'home') {
      layout();
      if (G.demo) {
        BD.setPuzzle(G.demo.P, BD.img, 'easy');
        scatterDemo();
        showDemoKids();
      }
      step(0);
      return;
    }
    if (!G.P) return;
    // anything in the air lands now; tray pieces jump to their new slots
    for (const v of G.pv) {
      if (v.mode === 'fly' && v.fly) {
        v.fly.u = 1;
        const f = v.fly;
        v.fly = null;
        v.mode = 'tray';
        if (f.done) f.done();
      }
    }
    layout();
    BD.setPuzzle(G.P, G.img, G.level);
    for (const v of G.pv) if (v.mode === 'tray') snapToSlot(v);
    if (G.state === 'won' || (G.state === 'paused' && G.pausedFrom === 'won')) celebrate(G.winner);
    step(0); // a new canvas size wipes it: draw straight away, even while the loop is held
  }

  // ---------------------------------------------------------------- boot

  function emojiArt(e, size = 160) {
    const [c, g] = Kit.gfx.makeCanvas(size, size);
    g.font = `${Math.round(size * 0.74)}px ${Kit.gfx.EMOJI_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(e, size / 2, size * 0.54);
    return c.toDataURL('image/png');
  }

  function bindInput() {
    ui.table.addEventListener('pointerdown', onDown);
    ui.table.addEventListener('pointermove', onMove);
    ui.table.addEventListener('pointerup', onUp);
    ui.table.addEventListener('pointercancel', onUp);
    const tap = (el, fn) => el.addEventListener('click', (e) => {
      e.stopPropagation();
      gesture();
      fn();
    });
    for (const t of ui.tiles.children) tap(t, () => startRound({ scene: t.dataset.t }));
    for (const b of ui.segMode.children) tap(b, () => setPref('mode', b.dataset.v));
    for (const b of ui.segWho.children) tap(b, () => setPref('who', b.dataset.v));
    for (const b of ui.segLevel.children) tap(b, () => setPref('level', b.dataset.v));
    for (const b of ui.segSize.children) tap(b, () => setPref('n', +b.dataset.v));
    ui.callBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      gesture();
      call();
    });
    tap(ui.sortBtn, sortEdges);
    tap(ui.lid, () => setPeek(!G.peek));
    tap(ui.peek, () => setPeek(false));
    tap(ui.pauseBtn, () => pause(true));
    tap(ui.pResume, () => pause(false));
    tap(ui.pRestart, again);
    tap(ui.pHome, goHome);
    tap(ui.oAgain, again);
    tap(ui.oNext, nextPicture);
    tap(ui.oHome, goHome);
    tap(ui.muteBtn, toggleMute);
    addEventListener('keydown', onKey);
    addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', () => (document.hidden ? S.suspend() : S.resume()));
    S.onMute((m) => (ui.muteBtn.textContent = m ? '🔇' : '🔊'));
  }

  function boot() {
    ui = {
      table: $('table'), home: $('home'), hud: $('hud'), logo: $('logo'), tiles: $('tiles'),
      segMode: $('segMode'), segWho: $('segWho'), segLevel: $('segLevel'), segSize: $('segSize'), duo: $('duo'), duoA: $('duoA'), duoB: $('duoB'), rivalImg: $('rivalImg'),
      sideL: $('sideL'), sideR: $('sideR'), faceL: $('faceL'), faceR: $('faceR'), leftL: $('leftL'), leftR: $('leftR'), subL: $('subL'), subR: $('subR'),
      winsL: $('winsL'), winsR: $('winsR'), lid: $('lid'), lidImg: $('lidImg'), clock: $('clock'),
      pauseBtn: $('pauseBtn'), muteBtn: $('muteBtn'), sortBtn: $('sortBtn'), callBtn: $('callBtn'), callFace: $('callFace'),
      toasts: $('toasts'), peek: $('peek'), peekImg: $('peekImg'), over: $('over'), oFace: $('oFace'), oTitle: $('oTitle'), oScore: $('oScore'),
      oAgain: $('oAgain'), oNext: $('oNext'), oHome: $('oHome'), pause: $('pause'), pResume: $('pResume'), pRestart: $('pRestart'), pHome: $('pHome'),
    };
    // the logo: the first word small on top, the rest big ("TT" / "Jigsaw")
    const words = window.JG_TITLE.split(' ');
    ui.logo.querySelector('small').textContent = words.length > 1 ? words[0] : '';
    ui.logo.querySelector('big').textContent = words.length > 1 ? words.slice(1).join(' ') : words[0];
    ui.muteBtn.textContent = S.isMuted() ? '🔇' : '🔊';
    // the six pictures, as tiles with a little render of each
    SC.LIST.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'tile';
      b.dataset.t = s.id;
      b.title = `${s.name[0]}${s.name.slice(1).toLowerCase()} (${i + 1})`;
      b.setAttribute('aria-label', `${s.name[0]}${s.name.slice(1).toLowerCase()}`);
      b.style.setProperty('--a', s.tile[0]);
      b.style.setProperty('--b', s.tile[1]);
      b.innerHTML = `<kbd>${i + 1}</kbd><img alt="" draggable="false"><b>${s.name}</b>`;
      b.querySelector('img').src = SC.render(s.id, 240, 160).toDataURL('image/jpeg', 0.8);
      ui.tiles.appendChild(b);
    });
    BD.init(ui.table);
    ST.init($('stage'));
    JG.fx.overlay.init($('fx'));
    flyers = JG.fx.flyers(ST.scene, 60);
    for (const id of ['teddy', 'tommy']) {
      kids[id] = JG.makeActor();
      kids[id].attach(ST.scene, flyers);
      kids[id].set(id, 1);
      kids[id].visible = false;
    }
    for (const id of ['foxy', 'froggy']) {
      pilots[id] = JG.makePilot(id, EMBLEM[id], NAME[id], BD.COLORS[id]);
      pilots[id].attach(ST.scene, flyers);
      pilots[id].visible = false;
    }
    art = Kit.portraits(['teddy', 'tommy'].map((id) => Kit.roster.get(id)), { size: 160 });
    art.foxy = emojiArt('🦊');
    art.froggy = emojiArt('🐸');
    art.five = emojiArt('🙌');
    ui.segWho.children[0].querySelector('img').src = art.teddy;
    ui.segWho.children[1].querySelector('img').src = art.tommy;
    ui.duoA.src = art.teddy;
    ui.duoB.src = art.tommy;
    JG.buddy.init(buddyApi);
    bindInput();
    goHome();
    onResize();
    $('loading').classList.add('hidden');
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- test hooks (window.game)

  const pe = (type, x, y, id = 9, kind = 'mouse') => ui.table.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: id, pointerType: kind, bubbles: true, isPrimary: true, button: 0 }));
  // drag piece `id` from wherever it lies to screen (x, y), with real pointer events on the table, then let it land
  function dragTo(id, x, y, kind = 'mouse') {
    const v = G.pv[id];
    const x0 = v.x, y0 = v.y;
    pe('pointerdown', x0, y0, 9, kind);
    if (G.pv[id].mode !== 'drag') return 'not picked';
    for (let i = 1; i <= 6; i++) {
      pe('pointermove', x0 + ((x - x0) * i) / 6, y0 + ((y - y0) * i) / 6, 9, kind);
      step(1 / 60);
    }
    for (let i = 0; i < 40; i++) step(1 / 60); // settle onto the pointer
    pe('pointerup', x, y, 9, kind);
    for (let i = 0; i < 30; i++) step(1 / 60); // land, or slide back
    return G.P.placed[id] ? 'placed' : 'back';
  }
  function cellXY(c, r) {
    const b = G.L.board;
    return { x: b.x + (c + 0.5) * b.cell, y: b.y + (r + 0.5) * b.cell };
  }
  function key(k) {
    const code = k.length === 1 ? 'Key' + k.toUpperCase() : k;
    dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true }));
    dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true }));
  }

  window.game = {
    start(o = {}) {
      gesture();
      startRound(o);
      return info();
    },
    home: () => goHome(),
    step(s = 1 / 60) {
      let left = s;
      while (left > 1e-6) {
        const d = Math.min(1 / 30, left);
        step(d);
        left -= d;
      }
      return info().state;
    },
    hold(on = true) { G.held = on; },
    cpu(on) { G.cpu.on = on; },
    dragTo, cellXY, key,
    // drop piece id on board place (c, r) (its own home if c is left out)
    dropOn(id, c, r, kind) {
      const p = G.P.pieces[id];
      const at = cellXY(c === undefined ? p.c : c, r === undefined ? p.r : r);
      return dragTo(id, at.x, at.y, kind);
    },
    tapPiece(id) {
      const v = G.pv[id];
      pe('pointerdown', v.x, v.y, 11, 'touch');
      pe('pointerup', v.x, v.y, 11, 'touch');
      step(0.4);
      return G.sel;
    },
    tapCell(c, r) {
      const at = cellXY(c, r);
      pe('pointerdown', at.x, at.y, 12, 'touch');
      pe('pointerup', at.x, at.y, 12, 'touch');
      step(0.5);
    },
    sort: () => sortEdges(),
    call: () => call(),
    peek: (on) => setPeek(on),
    pause: (on) => pause(on),
    picture: (id, w = 600, h = 400) => SC.render(id, w, h).toDataURL('image/jpeg', 0.9),
    check: (o) => JG.check(o),
    prefs: () => JSON.parse(JSON.stringify(prefs)),
    setPrefs(p) {
      for (const k of Object.keys(prefs)) delete prefs[k];
      Object.assign(prefs, p);
      save();
      syncMenu();
    },
    info,
    get G() { return G; },
  };
  function info() {
    const P = G.P;
    return {
      state: G.state, mode: G.mode, who: G.who, level: G.level, n: G.n, scene: G.scene, seed: G.seed,
      sides: G.sides.map((s) => s.id),
      left: P ? [P.left(0), P.left(1)] : null, placed: P ? P.count : 0, complete: P ? P.complete() : false,
      raceWon: G.raceWon, winner: G.winner, placedBy: G.placedBy.slice(), time: +G.time.toFixed(1), sel: G.sel,
      keys: G.K.map((c) => ({ on: c.on, mode: c.mode, id: c.id, c: c.c, r: c.r, hold: c.hold })),
      completions: G.completions, finishedEarly: G.finishedEarly, sorted: G.sorted, frameDone: G.frameDone,
      buddy: JG.buddy.info(), highFive: JG.highFive.on, over: !ui.over.classList.contains('hidden'),
      layout: G.L ? { tall: G.L.tall, board: G.L.board, trays: G.L.trays, slot: G.L.slot, body: G.L.body } : null,
      modes: G.pv.reduce((m, v) => ((m[v.mode] = (m[v.mode] || 0) + 1), m), {}),
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
