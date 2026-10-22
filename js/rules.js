/* TT Jigsaw: the rules, with no Three.js and no page in them, so the headless check can use them as they are.
     - SIZES: how many pieces (6 for Tommy up to 100), as columns x rows of square pieces
     - LEVELS: 🐣 EASY and 🔥 NORMAL (how close a drop must be, the ghost picture, the CPU friend's speed)
     - cut(cols, rows, seed): the pieces, with a tab or a hole on every inside edge; both sides of an edge share one curve
     - sideCurve(piece, side): one side of a piece as Bézier segments, in cell units from the piece's top-left corner
     - fits(piece, u, v, tol): a piece fits only at its own home (u, v: where its middle was dropped, in cells)
     - makePuzzle(...): the piles (one per tray), placing, sorting the edges, and completion */
(function () {
  'use strict';
  const JG = (window.JG = window.JG || {});

  // square pieces: the picture is rendered at cols:rows
  const SIZES = [
    { n: 6, cols: 3, rows: 2 },
    { n: 12, cols: 4, rows: 3 },
    { n: 20, cols: 5, rows: 4 },
    { n: 35, cols: 7, rows: 5 },
    { n: 54, cols: 9, rows: 6 },
    { n: 100, cols: 10, rows: 10 },
  ];
  const sizeOf = (n) => SIZES.find((s) => s.n === n) || SIZES[0];

  const LEVELS = {
    // tol: how far from its home a piece's middle may be dropped and still fit, in pieces
    // ghost: the picture shows faintly on the board; glow: its home glows after you've held a piece this long (s)
    // cpu: the CPU friend, and how long she takes per piece on a 6-piece puzzle (s); bigger puzzles slow her down
    easy: { id: 'easy', tol: 0.5, ghost: true, glow: 2.5, cpu: 'froggy', cpuEach: [7.5, 10.5], size: 6 },
    normal: { id: 'normal', tol: 0.32, ghost: false, glow: Infinity, cpu: 'foxy', cpuEach: [3.6, 5.2], size: 35 },
  };
  // the CPU friend's seconds per piece: more pieces to look through, more time each
  const cpuEach = (level, n, r) => {
    const [a, b] = LEVELS[level].cpuEach;
    return (a + (b - a) * r) * (1 + 0.36 * Math.log2(Math.max(1, n / 6)));
  };

  // seeded random numbers (mulberry32)
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(list, rand) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  // One knob, as four Bézier segments along an edge: u runs 0..1 along it, v sticks out (0.28 of a piece at most).
  // It's the same backwards (u → 1 - u), which is what lets both sides of an edge share one curve.
  const KNOB = [
    [[0.34, 0], [0.42, 0.04], [0.38, 0.1]],
    [[0.32, 0.2], [0.38, 0.28], [0.5, 0.28]],
    [[0.62, 0.28], [0.68, 0.2], [0.62, 0.1]],
    [[0.58, 0.04], [0.66, 0], [1, 0]],
  ];
  const KIND_ORDER = { corner: 0, edge: 1, middle: 2 };

  // The cut: every inside edge gets a knob pointing one way or the other, a little off-centre and a little bigger or
  // smaller. h[r][c] is the edge above row r (r >= 1), v[r][c] the edge left of column c (c >= 1):
  // { sign: +1 the knob points down / right, -1 up / left; t: how far off-centre; s: its size }.
  function cut(cols, rows, seed = 1) {
    const rand = rng(seed * 7919 + cols * 31 + rows);
    const edge = () => ({ sign: rand() < 0.5 ? 1 : -1, t: (rand() - 0.5) * 0.14, s: 0.9 + rand() * 0.18 });
    const h = [], v = [];
    for (let r = 0; r < rows; r++) {
      h.push([]);
      v.push([]);
      for (let c = 0; c < cols; c++) {
        h[r].push(r > 0 ? edge() : null);
        v[r].push(c > 0 ? edge() : null);
      }
    }
    const pieces = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const top = r === 0, bottom = r === rows - 1, left = c === 0, right = c === cols - 1;
        const border = (top ? 1 : 0) + (bottom ? 1 : 0) + (left ? 1 : 0) + (right ? 1 : 0);
        // each side: dir +1 = the knob sticks out of this piece, -1 = a hole, 0 = flat; t is mirrored on the sides
        // that run backwards (bottom: right to left, left: bottom to top) so both pieces draw the very same curve
        const sides = {
          top: top ? null : { dir: -h[r][c].sign, t: h[r][c].t, s: h[r][c].s },
          right: right ? null : { dir: v[r][c + 1].sign, t: v[r][c + 1].t, s: v[r][c + 1].s },
          bottom: bottom ? null : { dir: h[r + 1][c].sign, t: -h[r + 1][c].t, s: h[r + 1][c].s },
          left: left ? null : { dir: -v[r][c].sign, t: -v[r][c].t, s: v[r][c].s },
        };
        pieces.push({ id: pieces.length, r, c, kind: border >= 2 ? 'corner' : border === 1 ? 'edge' : 'middle', sides });
      }
    }
    if (JG.rules.sabotage === 'mismatch' && pieces.length > 1) {
      // one piece's right side bulges the other way from its neighbour's hole
      const p = pieces.find((x) => x.sides.right);
      p.sides.right = { ...p.sides.right, t: p.sides.right.t + 0.12 };
    }
    if (JG.rules.sabotage === 'twin' && pieces.length > 1) {
      // two pieces think they belong in the same place
      pieces[1].r = pieces[0].r;
      pieces[1].c = pieces[0].c;
    }
    return { cols, rows, seed, pieces, h, v };
  }

  const CORNERS = { top: [[0, 0], [1, 0]], right: [[1, 0], [1, 1]], bottom: [[1, 1], [0, 1]], left: [[0, 1], [0, 0]] };
  const SIDES = ['top', 'right', 'bottom', 'left'];

  // One side of a piece, clockwise, as segments [[x, y] start, then each { c1, c2, to } or { to } for a straight line],
  // in cell units from the piece's own top-left corner.
  function sideCurve(piece, side) {
    const [A, B] = CORNERS[side];
    const e = piece.sides[side];
    if (!e) return { from: A, segs: [{ to: B }] };
    const dx = B[0] - A[0], dy = B[1] - A[1];
    const nx = dy * e.dir, ny = -dx * e.dir; // the outward normal (screen y points down), turned inward for a hole
    const at = ([u, v], end) => {
      const uu = end ? u : 0.5 + (u - 0.5) * e.s + e.t, vv = v * e.s;
      return [A[0] + dx * uu + nx * vv, A[1] + dy * uu + ny * vv];
    };
    return { from: A, segs: KNOB.map(([c1, c2, to], i) => ({ c1: at(c1), c2: at(c2), to: at(to, i === KNOB.length - 1) })) };
  }

  // The whole outline, for a 2D canvas path: path(ctx, piece, x, y, size) traces it with its top-left at (x, y).
  function path(ctx, piece, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (const side of SIDES) {
      for (const s of sideCurve(piece, side).segs) {
        if (s.c1) ctx.bezierCurveTo(x + s.c1[0] * size, y + s.c1[1] * size, x + s.c2[0] * size, y + s.c2[1] * size, x + s.to[0] * size, y + s.to[1] * size);
        else ctx.lineTo(x + s.to[0] * size, y + s.to[1] * size);
      }
    }
    ctx.closePath();
  }

  // A piece fits only at its own home: (u, v) is where its middle was dropped, in pieces from the board's top-left.
  function fits(piece, u, v, tol) {
    if (JG.rules.sabotage === 'anywhere') return u >= 0 && v >= 0;
    return Math.hypot(u - (piece.c + 0.5), v - (piece.r + 0.5)) <= tol;
  }

  // corners first, then the other edge pieces, then the middle (the order otherwise kept)
  function sortEdges(ids, pieces) {
    return ids
      .map((id, i) => [id, i])
      .sort((a, b) => KIND_ORDER[pieces[a[0]].kind] - KIND_ORDER[pieces[b[0]].kind] || a[1] - b[1])
      .map((x) => x[0]);
  }

  // A puzzle in play: `piles` trays (1 alone, 2 when two race), dealt so each gets a fair share of corners and edges.
  function makePuzzle({ n = 6, seed = 1, piles = 1 } = {}) {
    const size = sizeOf(n);
    const k = cut(size.cols, size.rows, seed);
    const rand = rng(seed * 104729 + 17);
    const pieces = k.pieces;
    // deal: shuffle, line up corners / edges / middles, deal round the piles, then shuffle each pile
    const order = sortEdges(shuffle(pieces.map((p) => p.id), rand), pieces);
    const pile = Array.from({ length: piles }, () => []);
    const start = Math.floor(rand() * piles);
    order.forEach((id, i) => pile[(i + start) % piles].push(id));
    pile.forEach((p) => shuffle(p, rand));
    const owner = [];
    pile.forEach((p, t) => p.forEach((id) => (owner[id] = t)));
    const placed = new Array(pieces.length).fill(false);
    const by = new Array(pieces.length).fill(-1);
    let count = 0;
    const P = {
      n: pieces.length, cols: size.cols, rows: size.rows, seed, cut: k, pieces, piles: pile, owner, placed, by,
      get count() { return count; },
      // drop piece `id` with its middle at (u, v): placed if it fits there. `who` is the pile that gets the credit.
      place(id, u, v, tol, who = owner[id]) {
        if (placed[id]) return 'already';
        if (!fits(pieces[id], u, v, tol)) return 'no';
        placed[id] = true;
        by[id] = who;
        count++;
        const p = pile[owner[id]];
        p.splice(p.indexOf(id), 1);
        return 'placed';
      },
      // straight home (the CPU friend, your brother, the final fill)
      placeHome(id, who) {
        const p = pieces[id];
        return P.place(id, p.c + 0.5, p.r + 0.5, 0.01, who);
      },
      left: (t) => pile[t].length,
      sort(t) {
        pile[t] = sortEdges(pile[t], pieces);
        return pile[t];
      },
      // complete: every piece placed, and every place on the board filled by exactly one of them
      complete() {
        if (JG.rules.sabotage === 'early') return count >= pieces.length - 1;
        if (count !== pieces.length) return false;
        const seen = new Set();
        for (const p of pieces) {
          if (!placed[p.id]) return false;
          seen.add(p.r * size.cols + p.c);
        }
        return seen.size === size.cols * size.rows;
      },
    };
    return P;
  }

  // Which piece a helper (the CPU friend, your brother) picks next from pile t: corners and edges first, like a real
  // puzzler, then pieces next to ones already down; a bit of luck in it. ok(id) can rule pieces out (one in a hand).
  function pickNext(P, t, rand = Math.random, ok = null) {
    const ids = ok ? P.piles[t].filter(ok) : P.piles[t];
    if (!ids.length) return -1;
    let best = -1, bestScore = -1;
    for (const id of ids) {
      const p = P.pieces[id];
      let s = p.kind === 'corner' ? 3 : p.kind === 'edge' ? 2 : 0;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const q = P.pieces.find((x) => x.r === p.r + dr && x.c === p.c + dc);
        if (q && P.placed[q.id]) s += 1.5;
      }
      s += rand() * 2.5;
      if (s > bestScore) {
        bestScore = s;
        best = id;
      }
    }
    return best;
  }

  JG.rules = { SIZES, LEVELS, KIND_ORDER, SIDES, sizeOf, cpuEach, rng, shuffle, cut, sideCurve, path, fits, sortEdges, makePuzzle, pickNext, sabotage: null };
})();
