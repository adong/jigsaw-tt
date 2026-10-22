/* TT Jigsaw: the table. Everything the puzzle shows is drawn here on one 2D canvas:
     - JG.board.layout(W, H, o): where the board, the two trays and the bars go for this screen (wide: a tray each side
       of the board; tall: the board on top, the trays under it). It tries board sizes and keeps the one where both the
       board's pieces and the tray's pieces come out biggest.
     - JG.board.setPuzzle(P, image, level): the pieces' pictures (one sprite each, cut out with a bevel), and the board
       layer that placed pieces are painted onto once
     - JG.board.draw(view): the board, the ghost picture (EASY), placed pieces, the trays and every loose piece
   Piece positions are in screen pixels and belong to the game (js/game.js): this file only draws them. */
(function () {
  'use strict';
  const JG = (window.JG = window.JG || {});
  const RU = JG.rules;

  const PAD = 0.34; // room round a piece's square for its knobs (0.28 x 1.08) and outline, in pieces
  const GUTTER = 58; // the kit's ? and A文 buttons live in this strip on the left
  const B = { cv: null, g: null, dpr: 1, W: 1, H: 1, L: null, P: null, img: null, level: null, sprites: [], layer: null, layerG: null, cellPx: 0, done: 0 };

  function init(canvas) {
    B.cv = canvas;
    B.g = canvas.getContext('2d');
  }

  // the biggest square slot size that fits n slots in a w x h tray
  function slotFor(w, h, n) {
    if (n <= 0) return { s: Math.min(w, h), cols: 1, rows: 1 };
    let s = Math.floor(Math.sqrt((w * h) / n));
    while (s > 8) {
      const cols = Math.floor(w / s), rows = Math.floor(h / s);
      if (cols * rows >= n && cols > 0) return { s, cols, rows: Math.ceil(n / cols) };
      s--;
    }
    return { s: 8, cols: Math.max(1, Math.floor(w / 8)), rows: Math.ceil(n / Math.max(1, Math.floor(w / 8))) };
  }

  // o: { cols, rows, piles: [n0, n1] (pieces in each tray at the start) }
  function layout(W, H, o) {
    const m = W < 500 || H < 420 ? 6 : 10;
    const tall = W / H < 1.05;
    const short = H < 470;
    const top = Math.round(Math.max(short ? 46 : 52, Math.min(H * 0.1, 76)));
    const cb = Math.round(Math.max(short ? 54 : 66, Math.min(Math.min(W, H) * 0.12, 104))); // the round buttons at the bottom
    const nMax = Math.max(1, ...o.piles);
    const best = { score: -1 };
    if (!tall) {
      const availW = W - GUTTER - 4 * m, maxH = H - top - 2 * m, th = H - top - cb - 3 * m;
      for (let f = 0.3; f <= 0.76; f += 0.02) {
        let bw = availW * f, bh = (bw * o.rows) / o.cols;
        if (bh > maxH) {
          bh = maxH;
          bw = (bh * o.cols) / o.rows;
        }
        const cell = bw / o.cols, tw = (availW - bw) / 2;
        const sl = slotFor(tw, th, nMax);
        const body = Math.min(cell, sl.s / (1 + 2 * PAD));
        const score = Math.min(cell, body * 1.7) + 0.12 * cell;
        if (score > best.score) Object.assign(best, { score, bw, bh, cell, tw, sl, body });
      }
      const bx = GUTTER + 2 * m + best.tw, by = top + m + (H - top - 2 * m - best.bh) / 2;
      const tray = (x) => ({ x, y: top + m, w: best.tw, h: th });
      return finish({ tall, short, top, cb, m, W, H, board: { x: bx, y: by, w: best.bw, h: best.bh, cell: best.cell }, trays: [tray(GUTTER + m), tray(bx + best.bw + m)] }, o);
    }
    const availW = W - GUTTER - 2 * m, bot = cb + 2 * m, room = H - top - bot - 2 * m;
    for (let f = 0.32; f <= 0.7; f += 0.02) {
      let bh = room * f, bw = (bh * o.cols) / o.rows;
      if (bw > availW) {
        bw = availW;
        bh = (bw * o.rows) / o.cols;
      }
      const cell = bw / o.cols, tw = (availW - m) / 2, th = room - bh - m;
      const sl = slotFor(tw, th, nMax);
      const body = Math.min(cell, sl.s / (1 + 2 * PAD));
      const score = Math.min(cell, body * 1.7) + 0.12 * cell;
      if (score > best.score) Object.assign(best, { score, bw, bh, cell, tw, th, sl, body });
    }
    const bx = GUTTER + m + (availW - best.bw) / 2, by = top + m;
    const ty = by + best.bh + m;
    const tray = (x) => ({ x, y: ty, w: best.tw, h: H - bot - ty });
    return finish({ tall, short, top, cb, m, W, H, board: { x: bx, y: by, w: best.bw, h: best.bh, cell: best.cell }, trays: [tray(GUTTER + m), tray(GUTTER + m + best.tw + m)] }, o);
  }

  // each tray's slot grid, sized for the bigger pile so both trays look the same
  function finish(L, o) {
    const nMax = Math.max(1, ...o.piles);
    let s = Infinity;
    for (const t of L.trays) s = Math.min(s, slotFor(t.w, t.h, nMax).s);
    L.slot = s;
    L.body = Math.min(L.board.cell, s / (1 + 2 * PAD));
    for (const t of L.trays) {
      t.cols = Math.max(1, Math.floor(t.w / s));
      t.rowsN = Math.max(1, Math.floor(t.h / s));
    }
    return L;
  }

  // the middle of slot i in tray t (rows fill from the top, the whole grid centred in the tray)
  function slotXY(L, t, i, n) {
    const tr = L.trays[t];
    const cols = Math.min(tr.cols, Math.max(1, n));
    const rows = Math.ceil(n / tr.cols);
    const gw = cols * L.slot, gh = Math.min(rows, tr.rowsN) * L.slot;
    const c = i % tr.cols, r = Math.floor(i / tr.cols);
    return { x: tr.x + (tr.w - gw) / 2 + (c + 0.5) * L.slot, y: tr.y + Math.max(0, (tr.h - gh) / 2) + (r + 0.5) * L.slot };
  }
  // a piece's home, in screen pixels
  function homeXY(L, p) {
    return { x: L.board.x + (p.c + 0.5) * L.board.cell, y: L.board.y + (p.r + 0.5) * L.board.cell };
  }
  // a screen point → board cells (u, v), for fits()
  function toCells(L, x, y) {
    return { u: (x - L.board.x) / L.board.cell, v: (y - L.board.y) / L.board.cell };
  }

  function resize(W, H, L) {
    B.dpr = Math.min(window.devicePixelRatio || 1, 2);
    B.W = W;
    B.H = H;
    B.cv.width = Math.max(1, Math.round(W * B.dpr));
    B.cv.height = Math.max(1, Math.round(H * B.dpr));
    B.L = L;
    if (B.P) makeSprites();
  }

  // ---------------------------------------------------------------- the pieces' pictures

  function setPuzzle(P, img, level) {
    B.P = P;
    B.img = img;
    B.level = level;
    B.done = 0;
    makeSprites();
  }

  // One sprite per piece at the board's size (tray pieces are drawn smaller from it), and the board layer.
  function makeSprites() {
    const P = B.P, L = B.L;
    if (!P || !L) return;
    const cellPx = Math.max(8, Math.round(L.board.cell * B.dpr));
    B.cellPx = cellPx;
    const S = Math.ceil(cellPx * (1 + 2 * PAD)), off = cellPx * PAD;
    const k = B.img.width / P.cols / cellPx; // picture pixels per sprite pixel
    B.sprites = P.pieces.map((p) => {
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const g = c.getContext('2d');
      RU.path(g, p, off, off, cellPx);
      g.save();
      g.clip();
      g.drawImage(B.img, (p.c * cellPx - off) * k, (p.r * cellPx - off) * k, S * k, S * k, 0, 0, S, S);
      // a bevel: light along the top-left of the cut, shade along the bottom-right
      const bw = Math.max(1, cellPx * 0.035);
      g.lineWidth = bw * 2;
      g.translate(bw, bw);
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      RU.path(g, p, off, off, cellPx);
      g.stroke();
      g.translate(-2 * bw, -2 * bw);
      g.strokeStyle = 'rgba(20,18,31,0.32)';
      RU.path(g, p, off, off, cellPx);
      g.stroke();
      g.restore();
      g.lineWidth = Math.max(1, cellPx * 0.022);
      g.strokeStyle = 'rgba(20,18,31,0.55)';
      RU.path(g, p, off, off, cellPx);
      g.stroke();
      return c;
    });
    // the board layer: placed pieces, painted once each
    const bw = Math.round(L.board.w * B.dpr), bh = Math.round(L.board.h * B.dpr);
    B.layer = document.createElement('canvas');
    B.layer.width = bw + 2 * Math.ceil(off);
    B.layer.height = bh + 2 * Math.ceil(off);
    B.layerG = B.layer.getContext('2d');
    B.layerOff = Math.ceil(off);
    for (const p of P.pieces) if (P.placed[p.id]) paint(p.id);
  }

  // paint a placed piece onto the board layer
  function paint(id) {
    const p = B.P.pieces[id], s = B.sprites[id];
    if (!s) return;
    const off = B.cellPx * PAD;
    B.layerG.drawImage(s, B.layerOff + p.c * B.cellPx - off, B.layerOff + p.r * B.cellPx - off);
  }

  // ---------------------------------------------------------------- drawing

  const COLORS = { teddy: '#3c8cff', tommy: '#ff8a1f', froggy: '#2fbf4a', foxy: '#ff4f8b', team: '#ffd400' };

  // view: { pieces: [{ id, x, y, size, lift, alpha }] in draw order, trays: [{ color, glow }], glow: [{ id, a }],
  //         cursors: [{ x, y, w, h, color }], ghost, complete (0..1 the seams fading), shine (0..1) }
  function draw(view) {
    const g = B.g, L = B.L, dpr = B.dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, B.W, B.H);
    if (!L || !B.P) return;
    const bd = L.board;
    // the trays: soft felt in each player's colour
    L.trays.forEach((t, i) => {
      const tv = (view.trays && view.trays[i]) || {};
      g.fillStyle = tv.fill || 'rgba(255,255,255,0.35)';
      Kit.gfx.roundRect(g, t.x, t.y, t.w, t.h, Math.min(22, t.w * 0.08));
      g.fill();
      g.lineWidth = tv.glow ? 5 : 3;
      g.strokeStyle = tv.color || 'rgba(255,255,255,0.8)';
      g.stroke();
    });
    // the board: a wooden frame round a cream mat, the ghost picture on EASY
    const fr = Math.max(6, Math.min(18, bd.cell * 0.16));
    g.fillStyle = '#b8743a';
    Kit.gfx.roundRect(g, bd.x - fr, bd.y - fr, bd.w + 2 * fr, bd.h + 2 * fr, fr);
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = '#7a4a22';
    g.stroke();
    g.fillStyle = '#f6eedc';
    g.fillRect(bd.x, bd.y, bd.w, bd.h);
    if (view.ghost) {
      g.globalAlpha = 0.3;
      g.drawImage(B.img, bd.x, bd.y, bd.w, bd.h);
      g.globalAlpha = 1;
    }
    // faint lines where the pieces go
    g.strokeStyle = view.ghost ? 'rgba(20,18,31,0.12)' : 'rgba(150,120,80,0.28)';
    g.lineWidth = 1;
    g.beginPath();
    for (let c = 1; c < B.P.cols; c++) {
      g.moveTo(bd.x + c * bd.cell, bd.y);
      g.lineTo(bd.x + c * bd.cell, bd.y + bd.h);
    }
    for (let r = 1; r < B.P.rows; r++) {
      g.moveTo(bd.x, bd.y + r * bd.cell);
      g.lineTo(bd.x + bd.w, bd.y + r * bd.cell);
    }
    g.stroke();
    // homes glowing (EASY: the one you're holding, after a while)
    for (const gl of view.glow || []) {
      const p = B.P.pieces[gl.id];
      g.fillStyle = `rgba(255, 212, 0, ${0.25 + 0.25 * gl.a})`;
      g.fillRect(bd.x + p.c * bd.cell, bd.y + p.r * bd.cell, bd.cell, bd.cell);
    }
    // placed pieces
    const lo = B.layerOff / dpr;
    g.drawImage(B.layer, bd.x - lo, bd.y - lo, B.layer.width / dpr, B.layer.height / dpr);
    // finished: the seams fade into the whole picture, then a shine sweeps across
    if (view.complete > 0) {
      g.globalAlpha = Math.min(1, view.complete);
      g.drawImage(B.img, bd.x, bd.y, bd.w, bd.h);
      g.globalAlpha = 1;
    }
    if (view.shine > 0 && view.shine < 1) {
      g.save();
      g.beginPath();
      g.rect(bd.x, bd.y, bd.w, bd.h);
      g.clip();
      const x = bd.x - bd.w * 0.3 + view.shine * bd.w * 1.6;
      const gr = g.createLinearGradient(x - 60, 0, x + 60, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.translate(x, bd.y + bd.h / 2);
      g.rotate(0.35);
      g.fillRect(-60, -bd.h, 120, bd.h * 2);
      g.restore();
    }
    // the keyboard cursors (under the pieces they point at)
    for (const c of view.cursors || []) {
      g.lineWidth = 4;
      g.strokeStyle = c.color;
      g.setLineDash(c.dash ? [8, 6] : []);
      Kit.gfx.roundRect(g, c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, Math.min(12, c.w * 0.2));
      g.stroke();
      g.setLineDash([]);
    }
    // loose pieces: in the trays, flying, in someone's hand
    for (const v of view.pieces) {
      const s = B.sprites[v.id];
      if (!s) continue;
      const S = v.size * (1 + 2 * PAD);
      g.save();
      if (v.alpha !== undefined) g.globalAlpha = v.alpha;
      if (v.lift) {
        g.shadowColor = 'rgba(20,18,31,0.45)';
        g.shadowBlur = 10 * v.lift;
        g.shadowOffsetY = 7 * v.lift;
      }
      if (v.rot) {
        g.translate(v.x, v.y);
        g.rotate(v.rot);
        g.drawImage(s, -S / 2, -S / 2, S, S);
      } else g.drawImage(s, v.x - S / 2, v.y - S / 2, S, S);
      g.restore();
      if (v.ring) {
        g.lineWidth = 4;
        g.strokeStyle = v.ring;
        g.beginPath();
        g.arc(v.x, v.y, S * 0.5, 0, Math.PI * 2);
        g.stroke();
      }
      if (v.star) {
        // a little corner badge: 角 pieces get a ⭐ once the edges are sorted
        g.font = `${Math.max(10, v.size * 0.32)}px ${Kit.gfx.EMOJI_FONT}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('⭐', v.x + v.size * 0.42, v.y - v.size * 0.42);
      }
    }
  }

  JG.board = {
    PAD, GUTTER, COLORS, init, layout, resize, setPuzzle, paint, draw, slotXY, homeXY, toCells, slotFor,
    get L() { return B.L; },
    get sprites() { return B.sprites; },
    get img() { return B.img; },
  };
})();
