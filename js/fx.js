/* TT Jigsaw: effects, from Tommy's Toy Box (by way of TT Spot the Difference).
   JG.fx.flyers(scene): emoji sprites that fly, spin and fade in a 3D scene (stars, 💥, ✌️, treats).
   JG.fx.overlay: confetti and emoji on the 2D canvas over the page, in screen pixels (confetti for a win),
   drawn over the table. */
(function () {
  'use strict';
  const T = THREE;
  const JG = (window.JG = window.JG || {});
  const { emojiTexture, rand, pick } = Kit.gfx;

  // ---------------------------------------------------------------- 3D emoji flyers

  function flyers(scene, max = 48) {
    const pool = [];
    for (let i = 0; i < max; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ depthWrite: false, depthTest: false, transparent: true }));
      s.visible = false;
      s.renderOrder = 20;
      scene.add(s);
      pool.push({ s, life: 0, age: 0, vx: 0, vy: 0, vz: 0, spin: 0, g: 0, size: 1 });
    }
    let next = 0;
    return {
      // emoji at (x, y, z), velocity (vx, vy) in m/s, size in m, life in s, spin in rad/s, gravity in m/s²
      add(emoji, x, y, z, vx, vy, size, life, spin = 0, g = 6, vz = 0) {
        const f = pool[next];
        next = (next + 1) % max;
        f.s.material.map = emojiTexture(emoji);
        f.s.material.needsUpdate = true;
        f.s.material.rotation = 0;
        f.s.position.set(x, y, z);
        f.s.scale.setScalar(size);
        f.s.visible = true;
        Object.assign(f, { life, age: 0, vx, vy, vz, spin, g, size });
        return f;
      },
      update(dt) {
        for (const f of pool) {
          if (!f.s.visible) continue;
          f.age += dt;
          if (f.age >= f.life) {
            f.s.visible = false;
            continue;
          }
          f.vy -= f.g * dt;
          f.s.position.x += f.vx * dt;
          f.s.position.y += f.vy * dt;
          f.s.position.z += f.vz * dt;
          f.s.material.rotation += f.spin * dt;
          const u = f.age / f.life;
          const pop = Math.min(1, f.age / 0.12);
          f.s.scale.setScalar(f.size * (0.5 + 0.5 * pop));
          f.s.material.opacity = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
        }
      },
      clear() {
        for (const f of pool) f.s.visible = false;
      },
    };
  }

  // ---------------------------------------------------------------- 2D overlay: confetti and emoji in screen pixels

  const overlay = (function () {
    let cv = null, g = null, dpr = 1;
    const parts = [];
    const COLORS = ['#ffd400', '#ff3d7f', '#18d4ff', '#3fe0b0', '#ff8a1f', '#a77bff'];
    function init(canvas) {
      cv = canvas;
      g = cv.getContext('2d');
      resize();
    }
    function resize() {
      if (!cv) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(1, Math.round(innerWidth * dpr));
      cv.height = Math.max(1, Math.round(innerHeight * dpr));
    }
    // a burst of confetti (and optionally emoji) at screen point (x, y)
    function burst(x, y, n = 24, emojis = null, power = 1) {
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2), sp = rand(180, 520) * power;
        const emo = emojis && Math.random() < 0.4 ? pick(emojis) : null;
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 260 * power, life: rand(0.9, 1.5), age: 0,
          rot: rand(0, 6), vr: rand(-10, 10), w: rand(8, 15), h: rand(5, 9), color: pick(COLORS), emo, size: rand(26, 40),
        });
      }
      while (parts.length > 400) parts.shift();
    }
    // confetti raining down from the top edge
    function rain(n = 80) {
      for (let i = 0; i < n; i++) {
        parts.push({
          x: rand(0, innerWidth), y: rand(-200, -10), vx: rand(-60, 60), vy: rand(80, 260), life: rand(2, 3.2), age: 0,
          rot: rand(0, 6), vr: rand(-8, 8), w: rand(8, 15), h: rand(5, 9), color: pick(COLORS), emo: null, size: 0,
        });
      }
    }
    // under(g): draw the game's own marks (rings, the magnifier) first, so the confetti flies over them
    function update(dt, under) {
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, innerWidth, innerHeight);
      if (under) under(g);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life) {
          parts.splice(i, 1);
          continue;
        }
        p.vy += 700 * dt;
        p.vx *= 1 - 1.6 * dt;
        p.vy *= 1 - 0.9 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const u = p.age / p.life;
        g.globalAlpha = u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        if (p.emo) {
          g.font = `${p.size}px ${Kit.gfx.EMOJI_FONT}`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(p.emo, 0, 0);
        } else {
          g.fillStyle = p.color;
          g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 1.7)) + 1);
        }
        g.restore();
      }
      g.globalAlpha = 1;
    }
    const clear = () => { parts.length = 0; };
    return { init, resize, burst, rain, update, clear, get count() { return parts.length; } };
  })();

  JG.fx = { flyers, overlay };
})();
