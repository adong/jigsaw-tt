/* TT Jigsaw: the game's own sounds, built on Kit.sound.tone / hiss (all synthesised, no files).
   JG.sfx.kit(name, ...args) plays a kit effect; the rest are ours. Every call is a silent no-op until
   Kit.sound.init() has run from the first tap, and the kit's mute switch silences them all. */
(function () {
  'use strict';
  const JG = (window.JG = window.JG || {});
  const S = Kit.sound;
  const tone = (o) => S.tone(o);
  const hiss = (o) => S.hiss(o);

  JG.sfx = {
    kit(name, ...args) {
      if (S[name]) S[name](...args);
    },
    // a piece picked up: a little lift
    pick() {
      tone({ type: 'triangle', f: 520, to: 700, dur: 0.07, vol: 0.06 });
    },
    // a piece clicks into place: a woody "tock" and a chime that climbs with each one in a row (n = 1, 2, 3...)
    place(n = 1) {
      hiss({ filter: 'bandpass', f: 900, q: 2, dur: 0.05, vol: 0.18 });
      tone({ type: 'sine', f: 180, to: 120, dur: 0.08, vol: 0.12 });
      const up = Math.pow(1.0595, Math.min(n - 1, 12) * 2);
      tone({ type: 'triangle', f: 784 * up, at: 0.04, dur: 0.12, vol: 0.07 });
      tone({ type: 'triangle', f: 1175 * up, at: 0.09, dur: 0.14, vol: 0.05 });
    },
    // not there: a soft "boop-boop" as it slides back, never harsh
    miss() {
      tone({ f: 330, to: 260, dur: 0.08, vol: 0.07 });
      tone({ f: 260, to: 220, dur: 0.1, vol: 0.07, at: 0.09 });
    },
    // the edges sorted: a shuffle of cards
    sort() {
      for (let i = 0; i < 5; i++) hiss({ filter: 'bandpass', f: 2400 + i * 300, q: 1.2, dur: 0.05, vol: 0.06, at: i * 0.05 });
      tone({ type: 'triangle', f: 660, to: 990, dur: 0.18, vol: 0.05, at: 0.22 });
    },
    // the CPU friend (or your brother) put one down: a quieter tock
    rival() {
      hiss({ filter: 'bandpass', f: 700, q: 2, dur: 0.04, vol: 0.1 });
      tone({ type: 'triangle', f: 523, dur: 0.1, vol: 0.04 });
    },
    // your brother's piece glows on its way
    sparkle() {
      [1319, 1568, 1976, 2637].forEach((f, i) => tone({ type: 'sine', f, at: i * 0.05, dur: 0.14, vol: 0.06 }));
      hiss({ filter: 'highpass', f: 6000, dur: 0.3, vol: 0.03 });
    },
    // the keyboard cursor moves
    tick() { tone({ type: 'square', f: 1200, dur: 0.02, vol: 0.015, lp: 3000 }); },
    // the picture's finished
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'square', f, at: i * 0.11, dur: 0.16, vol: 0.05, lp: 3000 }));
      [523, 659, 784].forEach((f) => tone({ type: 'triangle', f: f * 2, at: 0.46, dur: 0.6, vol: 0.08 }));
      hiss({ filter: 'highpass', f: 6000, at: 0.46, dur: 0.5, vol: 0.06 });
      [784, 988, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', f, at: 0.9 + i * 0.09, dur: 0.3, vol: 0.08 }));
    },
    // the CPU friend emptied her tray first: a soft wah-wah
    lose() {
      [392, 370, 349, 311].forEach((f, i) => tone({ type: 'triangle', f, at: i * 0.22, dur: i === 3 ? 0.5 : 0.22, vol: 0.09 }));
    },
    // your brother pops in (and out)
    pop() {
      tone({ f: 300, to: 900, dur: 0.12, vol: 0.1 });
      hiss({ f: 2000, to: 6000, dur: 0.15, vol: 0.05 });
    },
    // the high five: a clap
    clap() {
      hiss({ filter: 'bandpass', f: 1500, q: 0.8, dur: 0.09, vol: 0.22 });
      hiss({ filter: 'highpass', f: 3000, dur: 0.05, vol: 0.1, at: 0.01 });
    },
  };
})();
