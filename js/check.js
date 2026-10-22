/* TT Jigsaw: the headless check, game.check(). The brief's rules: pieces fit only in place, and completion detection.
     cut       every size (6 to 100) x many seeds: one piece per place, flat sides only round the border, a knob or a
               hole on every inside side, corners / edges / middles named right, and the two sides of every inside edge
               the very same curve (so the pieces really fit together), with the knobs inside the sprite's room
     fit       every piece fits at its own home and at no other place on the board, on both levels; just inside the
               level's distance it fits, just outside it doesn't
     deal      the two trays share the pieces (all of them, once each, corners and edges split fairly); sorting puts
               corners first, then edges, then the middle, and keeps every piece
     complete  the model: wrong drops never place anything, a piece can't be placed twice, and the puzzle is complete
               only when the last piece is down
     play      whole puzzles through the real game: real pointer drags on the table (each piece first dropped in the
               wrong place, where it must slide back, then at home), taps (choose a piece, tap its place), and the
               keyboard cursor; the finish comes exactly once, only after the last piece, and a race ends when a tray is
               empty and then fills in the rest
   game.check({ sabotage }) breaks one thing on purpose and the check must fail: 'anywhere' (pieces fit anywhere),
   'early' (complete one piece too soon), 'mismatch' (one knob doesn't match its hole), 'twin' (two pieces share a place). */
(function () {
  'use strict';
  const JG = (window.JG = window.JG || {});
  const RU = JG.rules;

  function check(opts = {}) {
    const t0 = performance.now();
    const seeds = opts.seeds || 8;
    const out = { ok: true, groups: {}, failures: [], sabotage: opts.sabotage || null };
    const ok = (group, cond, msg) => {
      const g = (out.groups[group] = out.groups[group] || { pass: 0, fail: 0 });
      if (cond) g.pass++;
      else {
        g.fail++;
        out.ok = false;
        if (out.failures.length < 12) out.failures.push(`${group}: ${msg}`);
      }
    };
    RU.sabotage = opts.sabotage || null;
    const saved = window.game && window.game.prefs ? window.game.prefs() : null;
    try {
      cutCheck(ok, seeds);
      fitCheck(ok, seeds);
      dealCheck(ok, seeds);
      completeCheck(ok, seeds);
      if (window.game && opts.play !== false) playCheck(ok, opts);
    } catch (e) {
      ok('crash', false, String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e));
    } finally {
      RU.sabotage = null;
      if (saved) window.game.setPrefs(saved);
      if (window.game && opts.play !== false) window.game.home();
    }
    out.ms = Math.round(performance.now() - t0);
    return out;
  }

  // ---------------------------------------------------------------- the cut

  // a side's points in board units: its start, then every control point and end point
  function sidePoints(p, side) {
    const k = RU.sideCurve(p, side), pts = [k.from];
    for (const s of k.segs) {
      if (s.c1) pts.push(s.c1, s.c2);
      pts.push(s.to);
    }
    return pts.map(([x, y]) => [x + p.c, y + p.r]);
  }

  function cutCheck(ok, seeds) {
    for (const s of RU.SIZES) {
      for (let seed = 1; seed <= seeds; seed++) {
        const k = RU.cut(s.cols, s.rows, seed);
        const tag = `${s.n} pieces, seed ${seed}`;
        ok('cut', k.pieces.length === s.cols * s.rows, `${tag}: ${k.pieces.length} pieces`);
        const homes = new Set(k.pieces.map((p) => p.r * s.cols + p.c));
        ok('cut', homes.size === k.pieces.length && k.pieces.every((p) => p.r >= 0 && p.r < s.rows && p.c >= 0 && p.c < s.cols), `${tag}: two pieces share a place (${homes.size} places for ${k.pieces.length})`);
        const at = new Map(k.pieces.map((p) => [p.r * s.cols + p.c, p]));
        let corners = 0;
        for (const p of k.pieces) {
          const border = { top: p.r === 0, bottom: p.r === s.rows - 1, left: p.c === 0, right: p.c === s.cols - 1 };
          for (const side of RU.SIDES) {
            ok('cut', !!p.sides[side] === !border[side], `${tag}: piece ${p.id}'s ${side} side is ${p.sides[side] ? 'cut' : 'flat'} but ${border[side] ? 'is on the border' : 'has a neighbour'}`);
          }
          const nb = Object.values(border).filter(Boolean).length;
          const kind = nb >= 2 ? 'corner' : nb === 1 ? 'edge' : 'middle';
          ok('cut', p.kind === kind, `${tag}: piece ${p.id} is called ${p.kind}, it's a ${kind}`);
          if (kind === 'corner') corners++;
          // the knobs stay inside the room each sprite keeps round its square
          for (const side of RU.SIDES) {
            for (const [x, y] of sidePoints(p, side)) {
              const lx = x - p.c, ly = y - p.r, pad = JG.board ? JG.board.PAD : 0.34;
              ok('cut', lx >= -pad && lx <= 1 + pad && ly >= -pad && ly <= 1 + pad, `${tag}: piece ${p.id}'s ${side} knob sticks out of its sprite`);
            }
          }
          // both sides of an inside edge are one curve: piece A's right side, backwards, is piece B's left side
          for (const [side, other, dr, dc] of [['right', 'left', 0, 1], ['bottom', 'top', 1, 0]]) {
            if (!p.sides[side]) continue;
            const q = at.get((p.r + dr) * s.cols + p.c + dc);
            if (!q) continue;
            const a = sidePoints(p, side), b = sidePoints(q, other).reverse();
            const gap = a.length === b.length ? Math.max(...a.map((pt, i) => Math.hypot(pt[0] - b[i][0], pt[1] - b[i][1]))) : Infinity;
            ok('cut', gap < 1e-9, `${tag}: piece ${p.id}'s ${side} side doesn't fit piece ${q.id}'s ${other} side (off by ${gap.toFixed(3)} of a piece)`);
            ok('cut', p.sides[side].dir === -q.sides[other].dir, `${tag}: pieces ${p.id} and ${q.id} both have a ${p.sides[side].dir > 0 ? 'knob' : 'hole'} on their shared side`);
          }
        }
        ok('cut', corners === 4, `${tag}: ${corners} corners`);
      }
    }
  }

  // ---------------------------------------------------------------- fit only in place

  function fitCheck(ok, seeds) {
    for (const lv of Object.values(RU.LEVELS)) {
      for (const s of RU.SIZES) {
        for (let seed = 1; seed <= Math.min(seeds, 4); seed++) {
          const k = RU.cut(s.cols, s.rows, seed);
          const tag = `${lv.id} ${s.n} pieces, seed ${seed}`;
          for (const p of k.pieces) {
            for (let r = 0; r < s.rows; r++) {
              for (let c = 0; c < s.cols; c++) {
                const home = r === p.r && c === p.c;
                ok('fit', RU.fits(p, c + 0.5, r + 0.5, lv.tol) === home, `${tag}: piece ${p.id} (home ${p.c},${p.r}) ${home ? 'does not fit at home' : `fits at ${c},${r}`}`);
              }
            }
            for (let a = 0; a < 8; a++) {
              const dx = Math.cos((a * Math.PI) / 4), dy = Math.sin((a * Math.PI) / 4);
              const inside = lv.tol - 0.01, outside = lv.tol + 0.01;
              ok('fit', RU.fits(p, p.c + 0.5 + dx * inside, p.r + 0.5 + dy * inside, lv.tol), `${tag}: piece ${p.id} doesn't fit just inside its distance`);
              ok('fit', !RU.fits(p, p.c + 0.5 + dx * outside, p.r + 0.5 + dy * outside, lv.tol), `${tag}: piece ${p.id} fits just outside its distance`);
            }
          }
          // a drop off the board never fits
          ok('fit', k.pieces.every((p) => !RU.fits(p, -0.5, -0.5, lv.tol) && !RU.fits(p, s.cols + 0.5, s.rows + 0.5, lv.tol)), `${tag}: a piece fits off the board`);
        }
      }
    }
  }

  // ---------------------------------------------------------------- dealing and sorting

  function dealCheck(ok, seeds) {
    for (const s of RU.SIZES) {
      for (let seed = 1; seed <= seeds; seed++) {
        const P = RU.makePuzzle({ n: s.n, seed, piles: 2 });
        const tag = `${s.n} pieces, seed ${seed}`;
        const all = [...P.piles[0], ...P.piles[1]];
        ok('deal', all.length === P.n && new Set(all).size === P.n, `${tag}: the trays hold ${all.length} pieces (${new Set(all).size} different) of ${P.n}`);
        ok('deal', Math.abs(P.piles[0].length - P.piles[1].length) <= 1, `${tag}: trays of ${P.piles[0].length} and ${P.piles[1].length}`);
        for (const kind of ['corner', 'edge']) {
          const c = P.piles.map((pl) => pl.filter((id) => P.pieces[id].kind === kind).length);
          ok('deal', Math.abs(c[0] - c[1]) <= 1, `${tag}: ${kind}s split ${c[0]} / ${c[1]}`);
        }
        for (const t of [0, 1]) {
          const before = P.piles[t].slice().sort((a, b) => a - b).join();
          const sorted = P.sort(t);
          ok('deal', sorted.slice().sort((a, b) => a - b).join() === before, `${tag}: sorting tray ${t} lost or added pieces`);
          const ranks = sorted.map((id) => RU.KIND_ORDER[P.pieces[id].kind]);
          ok('deal', ranks.every((r, i) => i === 0 || ranks[i - 1] <= r), `${tag}: sorted tray ${t} isn't corners, then edges, then the middle`);
        }
      }
    }
  }

  // ---------------------------------------------------------------- completion, in the model

  function completeCheck(ok, seeds) {
    for (const s of RU.SIZES) {
      for (let seed = 1; seed <= seeds; seed++) {
        const P = RU.makePuzzle({ n: s.n, seed, piles: 2 });
        const rand = RU.rng(seed * 31 + 7);
        const order = RU.shuffle(P.pieces.map((p) => p.id), rand);
        const tag = `${s.n} pieces, seed ${seed}`;
        let early = -1;
        order.forEach((id, i) => {
          const p = P.pieces[id];
          // a wrong place first (the next place along, wrapping round)
          const wc = (p.c + 1 + Math.floor(rand() * (s.cols - 1))) % s.cols, wr = s.cols === 1 ? (p.r + 1) % s.rows : p.r;
          const r1 = P.place(id, wc + 0.5, wr + 0.5, RU.LEVELS.easy.tol);
          ok('complete', r1 === 'no' && !P.placed[id], `${tag}: piece ${id} was placed at ${wc},${wr}, not its home ${p.c},${p.r}`);
          const r2 = P.place(id, p.c + 0.5, p.r + 0.5, RU.LEVELS.normal.tol);
          ok('complete', r2 === 'placed', `${tag}: piece ${id} wasn't placed at home (${r2})`);
          ok('complete', P.place(id, p.c + 0.5, p.r + 0.5, 0.5) === 'already', `${tag}: piece ${id} was placed twice`);
          if (i < order.length - 1 && P.complete() && early < 0) early = i;
        });
        ok('complete', early < 0, `${tag}: complete with ${early >= 0 ? order.length - early - 1 : 0} piece(s) still to place`);
        ok('complete', P.complete() && P.count === P.n, `${tag}: not complete after every piece (${P.count} of ${P.n})`);
        ok('complete', P.left(0) === 0 && P.left(1) === 0, `${tag}: pieces left in the trays after the last one`);
      }
    }
  }

  // ---------------------------------------------------------------- whole puzzles through the real game

  function playCheck(ok, opts) {
    const g = window.game;
    const sizes = opts.sizes || [6, 12, 20];
    let run = 0;
    for (const level of ['easy', 'normal']) {
      for (const n of sizes) {
        for (const mode of ['alone', 'race', 'two']) {
          run++;
          const scene = JG.scenes.ids[run % JG.scenes.ids.length];
          g.start({ scene, n, mode, level, who: run % 2 ? 'teddy' : 'tommy', seed: 100 + run });
          g.cpu(false);
          const G = g.G, P = G.P;
          const tag = `${level} ${mode} ${n} pieces (${scene})`;
          const comps = g.info().completions;
          const humans = [0, 1].filter((t) => G.sides[t].human);
          const ids = humans.flatMap((t) => P.piles[t].slice());
          let early = false, how = 0;
          for (let i = 0; i < ids.length; i++) {
            const id = ids[i], p = P.pieces[id];
            if (P.placed[id]) continue;
            // first somewhere wrong on the board: it must come back
            const wc = (p.c + 1) % P.cols, wr = P.cols > 1 ? p.r : (p.r + 1) % P.rows;
            const r1 = g.dropOn(id, wc, wr);
            ok('play', r1 === 'back' && !P.placed[id] && G.pv[id].mode === 'tray', `${tag}: piece ${id} dropped at ${wc},${wr} (home ${p.c},${p.r}) gave "${r1}"`);
            // then home: by mouse drag, a finger drag, tap-tap, or the keyboard
            const way = how++ % 4;
            if (way === 0) g.dropOn(id, undefined, undefined, 'mouse');
            else if (way === 1) g.dropOn(id, undefined, undefined, 'touch');
            else if (way === 2) {
              g.tapPiece(id);
              ok('play', G.sel === id, `${tag}: a tap on piece ${id} didn't choose it`);
              g.tapCell(p.c, p.r);
            } else keyPlace(g, G, id);
            g.step(0.4);
            ok('play', P.placed[id], `${tag}: piece ${id} wasn't placed at home (way ${way})`);
            const last = P.count === P.n;
            if (!last && (G.state === 'won' || g.info().completions !== comps)) early = true;
            if (G.state === 'won' || G.raceWon >= 0) break;
          }
          g.step(6);
          ok('play', !early, `${tag}: finished before the last piece`);
          ok('play', G.state === 'won' && P.complete() && P.count === P.n, `${tag}: not finished at the end (state ${G.state}, ${P.count} of ${P.n})`);
          ok('play', g.info().completions === comps + 1, `${tag}: finished ${g.info().completions - comps} times`);
          ok('play', g.info().finishedEarly === 0, `${tag}: the finish came with pieces still in a tray`);
          if (mode !== 'alone') ok('play', G.raceWon === 0 || (mode === 'two' && G.raceWon >= 0), `${tag}: the race went to ${G.raceWon}`);
          ok('play', g.info().over, `${tag}: no PLAY AGAIN card`);
        }
      }
    }
  }

  // place piece id with the keyboard cursor: walk the cursor to it in the tray, pick it up, walk to its home, put it down
  function keyPlace(g, G, id) {
    const k = G.mode === 'two' ? G.pv[id].t : 0;
    const keys = k === 1 ? { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown', act: 'Enter' } : { l: 'a', r: 'd', u: 'w', d: 's', act: 'f' };
    const c = G.K[k];
    if (!c.on) g.key(keys.act);
    // the tray: move toward the piece until the cursor is on it
    for (let i = 0; i < 60 && c.id !== id; i++) {
      const a = G.pv[c.id], b = G.pv[id];
      if (!a) break;
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) > Math.abs(dy)) g.key(dx > 0 ? keys.r : keys.l);
      else g.key(dy > 0 ? keys.d : keys.u);
      g.step(1 / 30);
    }
    g.key(keys.act);
    const p = G.P.pieces[id];
    for (let i = 0; i < 30 && (c.c !== p.c || c.r !== p.r); i++) {
      if (c.c !== p.c) g.key(c.c < p.c ? keys.r : keys.l);
      else g.key(c.r < p.r ? keys.d : keys.u);
    }
    g.step(0.2);
    g.key(keys.act);
    g.step(0.3);
  }

  JG.check = check;
})();
