/* TT Jigsaw: the pictures. Six little 3D scenes from the brothers' games, built from boxes, balls and cones with the
   kit's Teddy and Tommy in them, rendered once into a 2D canvas that the puzzle is cut from. No image files.
     JG.scenes.LIST: the six (id, emoji, name, tile colours)
     JG.scenes.render(id, w, h): a canvas w x h of that scene (cached); the camera widens or narrows to the shape,
       so the 3x2 puzzle and the 10x10 one both get the whole scene
   Every corner of every picture has something in it (clouds, balloons, stripes, sleepers...): plain sky makes pieces
   no one can place. */
(function () {
  'use strict';
  const T = THREE;
  const JG = (window.JG = window.JG || {});
  const { makeCanvas, toTexture } = Kit.gfx;

  const LIST = [
    { id: 'metro', emoji: '🚇', name: 'TRAIN TRACKS', tile: ['#d8f1ff', '#4aa3ff'] },
    { id: 'hoops', emoji: '🏀', name: 'THE COURT', tile: ['#ffe8cf', '#ff8a2a'] },
    { id: 'snow', emoji: '⛄', name: 'SNOW DAY', tile: ['#ffffff', '#9fd0ff'] },
    { id: 'soccer', emoji: '⚽', name: 'THE PITCH', tile: ['#eaffd8', '#3fbf4a'] },
    { id: 'moon', emoji: '🚀', name: 'THE MOON', tile: ['#8a6bff', '#2a1d5c'] },
    { id: 'dragon', emoji: '🐉', name: 'DRAGON BOAT', tile: ['#fff0c8', '#ff5a3d'] },
  ];

  // ---------------------------------------------------------------- little builders

  let scene = null, rnd = Math.random;
  const R = (a, b) => a + rnd() * (b - a);
  const mat = (color, o) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.75, metalness: 0 }, o));
  function add(geo, m, x, y, z, parent = scene) {
    const o = new T.Mesh(geo, typeof m === 'string' ? mat(m) : m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  const box = (w, h, d, m, x, y, z, p) => add(new T.BoxGeometry(w, h, d), m, x, y, z, p);
  const ball = (r, m, x, y, z, p, seg = 20) => add(new T.SphereGeometry(r, seg, Math.round(seg * 0.7)), m, x, y, z, p);
  const cyl = (rt, rb, h, m, x, y, z, p, seg = 20) => add(new T.CylinderGeometry(rt, rb, h, seg), m, x, y, z, p);
  const cone = (r, h, m, x, y, z, p, seg = 20) => add(new T.ConeGeometry(r, h, seg), m, x, y, z, p);
  function tex(w, h, draw, rep) {
    const [c, g] = makeCanvas(w, h);
    draw(g, w, h);
    const t = toTexture(c, !!rep);
    if (rep) t.repeat.set(rep[0], rep[1]);
    return t;
  }
  function ground(color, w, d, map, y = 0, z = 0) {
    const g = new T.Mesh(new T.PlaneGeometry(w, d), map ? new T.MeshStandardMaterial({ map, roughness: 0.95 }) : mat(color, { roughness: 0.95 }));
    g.rotation.x = -Math.PI / 2;
    g.position.set(0, y, z);
    g.receiveShadow = true;
    scene.add(g);
    return g;
  }
  // the sky: a gradient behind everything, with optional stars
  function sky(stops, stars = 0) {
    scene.background = tex(16, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      stops.forEach(([o, c]) => gr.addColorStop(o, c));
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });
    if (stars) {
      const pos = [];
      for (let i = 0; i < stars; i++) pos.push(R(-90, 90), R(-10, 70), R(-80, -60));
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      scene.add(new T.Points(geo, new T.PointsMaterial({ color: '#ffffff', size: 0.5, sizeAttenuation: true })));
    }
  }
  function lights(o = {}) {
    scene.add(new T.HemisphereLight(o.sky || '#ffffff', o.ground || '#8a7a60', o.hemi || 0.75));
    const d = new T.DirectionalLight(o.sun || '#fff6e0', o.power || 1.15);
    d.position.set(...(o.dir || [-8, 16, 12]));
    d.castShadow = true;
    d.shadow.mapSize.set(2048, 2048);
    const s = d.shadow.camera, e = o.extent || 22;
    Object.assign(s, { left: -e, right: e, top: e, bottom: -e, near: 1, far: 80 });
    d.shadow.bias = -0.0008;
    d.target.position.set(...(o.at || [0, 0, -4]));
    scene.add(d, d.target);
  }
  function cloud(x, y, z, s = 1, color = '#ffffff') {
    const g = new T.Group();
    const m = mat(color, { roughness: 1 });
    [[0, 0, 0, 1], [-1.1, -0.25, 0.1, 0.72], [1.1, -0.2, 0, 0.78], [0.45, 0.35, 0.2, 0.7], [-0.5, 0.25, -0.1, 0.66]].forEach(([a, b, c, r]) => {
      const o = ball(r, m, a, b, c, g, 14);
      o.castShadow = false;
    });
    g.position.set(x, y, z);
    g.scale.set(s * 1.3, s * 0.8, s);
    scene.add(g);
    return g;
  }
  function balloon(x, y, z, color, s = 1) {
    const b = ball(0.55 * s, mat(color, { roughness: 0.35 }), x, y, z);
    b.scale.y = 1.18;
    cone(0.12 * s, 0.2 * s, color, x, y - 0.68 * s, z);
    const str = box(0.02, 1.4 * s, 0.02, '#ffffff', x, y - 1.45 * s, z);
    str.castShadow = false;
  }
  function bird(x, y, z, s = 1) {
    const m = mat('#2a2a3a');
    const l = box(0.7 * s, 0.07, 0.12, m, x - 0.3 * s, y, z);
    l.rotation.z = 0.45;
    const r = box(0.7 * s, 0.07, 0.12, m, x + 0.3 * s, y, z);
    r.rotation.z = -0.45;
  }
  function tree(x, z, s = 1, leaf = '#3fa34d', kind = 'round') {
    cyl(0.18 * s, 0.24 * s, 1.4 * s, '#7a4b2a', x, 0.7 * s, z);
    if (kind === 'pine') {
      [0, 1, 2].forEach((i) => cone((1.3 - i * 0.32) * s, 1.5 * s, leaf, x, (1.6 + i * 0.85) * s, z, scene, 10));
    } else {
      ball(1.1 * s, leaf, x, 2.2 * s, z, scene, 14);
      ball(0.8 * s, leaf, x + 0.6 * s, 2.7 * s, z + 0.2, scene, 12);
      ball(0.7 * s, leaf, x - 0.6 * s, 2.6 * s, z - 0.1, scene, 12);
    }
  }
  function sun(x, y, z, r = 2, color = '#ffe14d') {
    const s = ball(r, new T.MeshBasicMaterial({ color }), x, y, z, scene, 24);
    s.castShadow = false;
    const glow = new T.Sprite(new T.SpriteMaterial({ map: Kit.gfx.glowTexture(), color, transparent: true, opacity: 0.55, depthWrite: false }));
    glow.position.set(x, y, z - 0.5);
    glow.scale.setScalar(r * 5);
    scene.add(glow);
  }
  // window grids for buildings and trains
  function windows(base, win, cols, rows, frame = '#ffffff') {
    return tex(256, 256, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      const cw = w / cols, rh = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          g.fillStyle = frame;
          g.fillRect(c * cw + cw * 0.18, r * rh + rh * 0.2, cw * 0.64, rh * 0.6);
          g.fillStyle = typeof win === 'function' ? win(r, c) : win;
          g.fillRect(c * cw + cw * 0.24, r * rh + rh * 0.26, cw * 0.52, rh * 0.48);
        }
      }
    });
  }
  function building(x, z, w, h, d, color) {
    const t = windows(color, () => (rnd() < 0.3 ? '#ffe9a0' : '#8fd3ff'), Math.max(2, Math.round(w / 1.3)), Math.max(2, Math.round(h / 1.6)), '#f4f1ea');
    const m = mat('#ffffff', { map: t });
    box(w, h, d, [m, m, mat(Kit.gfx.shade(color, -0.25)), m, m, m], x, h / 2, z);
    box(w + 0.3, 0.35, d + 0.3, Kit.gfx.shade(color, -0.35), x, h + 0.17, z);
  }
  // Teddy, Tommy (or a friend) in a pose, facing the camera (+z) unless told otherwise
  function kid(id, mode, phase, x, y, z, ry = Math.PI, extra) {
    const e = Kit.roster.get(id);
    const p = Kit.people.build(e.look);
    Kit.people.pose(p, phase, mode, 1);
    if (mode === 'peace' || mode === 'wave' || mode === 'idle' || mode === 'jumpshot') {
      p.legL.rotation.x *= 0.3;
      p.legR.rotation.x *= 0.3;
    }
    if (extra) extra(p);
    p.root.position.set(x, y, z);
    p.root.rotation.y = ry;
    p.root.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    scene.add(p.root);
    p.root.updateMatrixWorld(true);
    return p;
  }
  function stripes(colors, w = 256, h = 256, vertical = false) {
    return tex(w, h, (g) => {
      const n = colors.length;
      colors.forEach((c, i) => {
        g.fillStyle = c;
        if (vertical) g.fillRect((i * w) / n, 0, w / n + 1, h);
        else g.fillRect(0, (i * h) / n, w, h / n + 1);
      });
    });
  }
  function noise(base, dots, n = 1400, size = [1, 4], w = 256) {
    return tex(w, w, (g) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, w);
      for (let i = 0; i < n; i++) {
        g.fillStyle = dots[Math.floor(rnd() * dots.length)];
        const s = R(size[0], size[1]);
        g.fillRect(R(0, w), R(0, w), s, s);
      }
    }, [1, 1]);
  }

  // ---------------------------------------------------------------- the six scenes
  // Each returns its camera: { pos, look, hw, hh }, the half width and height that must show around `look`.

  const BUILD = {
    // 🚇 Metro Surfer: three tracks between the city blocks, a train with Tommy on its roof, Teddy running at us
    metro() {
      sky([[0, '#3d8fff'], [0.55, '#8fd0ff'], [1, '#e8f7ff']]);
      lights({ dir: [-10, 18, 10], extent: 26 });
      const gravel = noise('#9a8e7e', ['#7d7262', '#b3a896', '#6d6354', '#c4b9a5'], 2600, [1, 3]);
      gravel.repeat.set(10, 30);
      ground('#9a8e7e', 60, 160, gravel, 0, -50);
      const wood = mat('#6b4a2e'), rail = mat('#c9ced6', { metalness: 0.6, roughness: 0.35 });
      for (const tx of [-4, 0, 4]) {
        for (let z = 12; z > -90; z -= 1.3) box(2.6, 0.18, 0.4, wood, tx, 0.09, z);
        box(0.16, 0.22, 104, rail, tx - 0.8, 0.28, -39);
        box(0.16, 0.22, 104, rail, tx + 0.8, 0.28, -39);
      }
      // the blue train on the left track, and a red one far down the right
      const trainSide = windows('#2f6fde', '#bfe8ff', 6, 2, '#ffd23d');
      const tm = mat('#ffffff', { map: trainSide });
      box(3, 3.3, 17, [tm, tm, mat('#d9dee6'), mat('#333'), mat('#2f6fde'), tm], -4, 2.0, -11);
      const face = tex(256, 256, (g) => {
        g.fillStyle = '#2f6fde';
        g.fillRect(0, 0, 256, 256);
        g.fillStyle = '#ffd23d';
        g.fillRect(0, 150, 256, 26);
        g.fillStyle = '#bfe8ff';
        g.fillRect(34, 30, 188, 90);
        g.fillStyle = '#fff6b0';
        g.beginPath();
        g.arc(56, 210, 20, 0, 7);
        g.arc(200, 210, 20, 0, 7);
        g.fill();
      });
      box(3.02, 3.3, 0.1, mat('#ffffff', { map: face }), -4, 2.0, -2.45);
      box(3, 3.3, 14, mat('#e8463c'), 4, 2.0, -48);
      box(3.02, 1, 14.02, mat('#ffffff'), 4, 2.6, -48);
      // the city
      const cols = ['#ff7a8a', '#ffc24a', '#7ad37a', '#a58bff', '#4ac6d8', '#ff9a4a'];
      for (let i = 0; i < 9; i++) {
        building(-11 - R(0, 3), -6 - i * 9, R(5, 7), R(7, 18), R(6, 8), cols[i % cols.length]);
        building(11 + R(0, 3), -6 - i * 9, R(5, 7), R(7, 18), R(6, 8), cols[(i + 3) % cols.length]);
      }
      // a bridge across far down the line
      box(26, 1.4, 2.4, mat('#d36b3a'), 0, 8.5, -38);
      for (const x of [-7.5, 7.5]) box(1.2, 8, 1.6, mat('#b8562c'), x, 4, -38);
      // signals and coins
      for (const [x, z] of [[-6.4, 2], [6.4, -14]]) {
        cyl(0.12, 0.12, 4, '#444', x, 2, z);
        box(0.7, 1.4, 0.5, '#222', x, 4.4, z);
        ball(0.22, new T.MeshBasicMaterial({ color: '#ff4040' }), x, 4.8, z + 0.26);
        ball(0.22, new T.MeshBasicMaterial({ color: '#40ff70' }), x, 4.1, z + 0.26);
      }
      const gold = mat('#ffd23d', { metalness: 0.5, roughness: 0.3, emissive: '#7a5a00', emissiveIntensity: 0.25 });
      for (let i = 0; i < 7; i++) {
        const c = cyl(0.42, 0.42, 0.1, gold, 0, 1.1 + Math.sin(i * 0.7) * 0.3, 7 - i * 3.2, scene, 24);
        c.rotation.x = Math.PI / 2;
      }
      kid('teddy', 'run', 0.9, 0, 0.3, -1.2);
      kid('tommy', 'peace', 0, -4, 3.65, -4.5);
      cloud(-9, 15, -30, 2.2);
      cloud(8, 17, -36, 2.6);
      cloud(0, 20, -45, 2);
      cloud(15, 12, -25, 1.6);
      balloon(-1.8, 10.5, -10, '#ff3d7f');
      balloon(2.2, 12, -14, '#ffd400');
      bird(5, 14.5, -18, 1.2);
      bird(-3, 16, -22, 1);
      return { pos: [0, 6.4, 15], look: [0, 4.2, -8], hw: 10.5, hh: 6.6 };
    },

    // 🏀 Hoops: a wooden court, Teddy's jump shot at the hoop, Tommy's Y by the bench
    hoops() {
      sky([[0, '#ff9a5a'], [0.45, '#ffd08a'], [1, '#fff3d8']]);
      lights({ dir: [-12, 14, 10], sun: '#fff0d0', extent: 20 });
      const court = tex(1024, 1024, (g, w, h) => {
        for (let i = 0; i < 32; i++) {
          g.fillStyle = i % 2 ? '#e2a865' : '#d89a55';
          g.fillRect((i * w) / 32, 0, w / 32 + 1, h);
          g.fillStyle = 'rgba(120,70,30,0.25)';
          for (let j = 0; j < 6; j++) g.fillRect((i * w) / 32, R(0, h), w / 32, 2);
        }
        g.fillStyle = '#3c78d8';
        g.fillRect(w * 0.36, 0, w * 0.28, h * 0.42);
        g.strokeStyle = '#ffffff';
        g.lineWidth = 10;
        g.strokeRect(w * 0.36, 0, w * 0.28, h * 0.42);
        g.beginPath();
        g.arc(w / 2, h * 0.42, w * 0.14, 0, Math.PI);
        g.stroke();
        g.beginPath();
        g.arc(w / 2, 0, w * 0.42, 0, Math.PI);
        g.stroke();
        g.strokeRect(6, 6, w - 12, h * 2);
      });
      ground('#d89a55', 26, 22, court, 0, -6);
      // the wall at the back: bricks and a rainbow mural
      const bricks = tex(512, 256, (g, w, h) => {
        g.fillStyle = '#c4553c';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#e7d6c8';
        for (let r = 0; r < 16; r++) {
          g.fillRect(0, r * 16, w, 2);
          for (let c = 0; c < 16; c++) g.fillRect(c * 32 + (r % 2) * 16, r * 16, 2, 16);
        }
        ['#ff3d7f', '#ffd400', '#3fe0b0', '#18d4ff', '#a77bff'].forEach((c, i) => {
          g.fillStyle = c;
          g.beginPath();
          g.arc(w * 0.78, h * 1.1, 210 - i * 26, Math.PI, 0);
          g.arc(w * 0.78, h * 1.1, 186 - i * 26, 0, Math.PI, true);
          g.fill();
        });
      }, [3, 1]);
      box(40, 5, 0.6, mat('#ffffff', { map: bricks }), 0, 2.5, -17);
      // the hoop
      cyl(0.18, 0.22, 4.6, '#3a3d48', 0, 2.3, -14.6);
      box(0.3, 0.3, 1.8, '#3a3d48', 0, 4.4, -13.8);
      const bb = tex(256, 160, (g, w, h) => {
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = '#e8463c';
        g.lineWidth = 12;
        g.strokeRect(6, 6, w - 12, h - 12);
        g.strokeRect(w * 0.34, h * 0.42, w * 0.32, h * 0.44);
      });
      box(3.4, 2.1, 0.15, mat('#ffffff', { map: bb }), 0, 5.1, -12.9);
      const rim = add(new T.TorusGeometry(0.6, 0.06, 8, 24), '#ff6a1a', 0, 4.3, -12.2);
      rim.rotation.x = Math.PI / 2;
      const net = add(new T.CylinderGeometry(0.58, 0.36, 0.9, 12, 3, true), new T.MeshStandardMaterial({ color: '#ffffff', wireframe: true }), 0, 3.8, -12.2);
      net.castShadow = false;
      // Teddy's jump shot, the ball leaving his hands
      kid('teddy', 'jumpshot', 0, -1.3, 1.1, -3.5);
      const orange = tex(128, 64, (g, w, h) => {
        g.fillStyle = '#f07a1e';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = '#2a1a10';
        g.lineWidth = 3;
        for (const x of [0.25, 0.5, 0.75]) {
          g.beginPath();
          g.moveTo(w * x, 0);
          g.lineTo(w * x, h);
          g.stroke();
        }
        g.beginPath();
        g.moveTo(0, h / 2);
        g.lineTo(w, h / 2);
        g.stroke();
      });
      ball(0.42, mat('#ffffff', { map: orange }), -0.6, 5.9, -5.6);
      kid('tommy', 'peace', 0, 3.2, 0, -1.2, Math.PI - 0.35);
      // the bench, a rack of balls, a water bottle, bleachers on the left
      box(4.2, 0.2, 0.9, '#2e88d8', 6.8, 0.9, -6);
      for (const x of [5, 8.6]) box(0.2, 0.9, 0.8, '#2e88d8', x, 0.45, -6);
      for (let i = 0; i < 4; i++) ball(0.36, mat('#ffffff', { map: orange }), 7.4 + (i % 2) * 0.75, 1.3 + Math.floor(i / 2) * 0.62, -7.6);
      box(1.9, 0.12, 0.9, '#777', 7.75, 0.95, -7.6);
      cyl(0.2, 0.2, 0.7, '#3fe0b0', 5.6, 1.35, -5.8);
      const rows = ['#ff3d7f', '#ffd400', '#18d4ff', '#3fe0b0', '#a77bff'];
      for (let r = 0; r < 4; r++) {
        box(6, 0.6, 1.2, rows[r], -9.5, 0.3 + r * 0.6, -9 - r * 1.2);
        for (let k = 0; k < 6; k++) {
          if (rnd() < 0.35) continue;
          const x = -12 + k * 1 + R(-0.1, 0.1), y = 0.9 + r * 0.6, z = -9 - r * 1.2;
          box(0.6, 0.6, 0.4, rows[(r + k + 2) % 5], x, y + 0.3, z);
          ball(0.25, '#efc29c', x, y + 0.85, z);
        }
      }
      tree(-15, -20, 1.8);
      tree(14, -20, 2);
      tree(9, -21, 1.6, '#4fb35d');
      tree(-7, -21, 1.5, '#4fb35d');
      sun(11, 13, -40, 2.6, '#fff1a0');
      cloud(-10, 12, -30, 2);
      cloud(2, 14, -34, 1.6, '#fff6ee');
      cloud(-2, 9, -26, 1.2, '#fff6ee');
      balloon(-6, 9, -16, '#18d4ff');
      bird(4, 11, -24, 1.1);
      return { pos: [0, 5.2, 12], look: [0, 3.4, -6], hw: 9.6, hh: 6 };
    },

    // ⛄ Snow day: snowmen, pines, an igloo, Teddy throwing a snowball, Tommy's Y
    snow() {
      sky([[0, '#7fb8ff'], [0.6, '#cfe6ff'], [1, '#f4faff']]);
      lights({ dir: [-10, 16, 12], sky: '#eaf4ff', ground: '#9fb8d8', hemi: 0.85, power: 1.0, extent: 24 });
      const snow = noise('#f2f7ff', ['#dfe9f8', '#ffffff', '#cfdcf0', '#e8f0ff'], 2200, [2, 6]);
      snow.repeat.set(8, 8);
      ground('#f2f7ff', 80, 80, snow, 0, -20);
      // mountains far back
      [[-22, -60, 14, 20, '#9db3d6'], [-6, -66, 16, 26, '#8aa2c8'], [12, -62, 15, 22, '#a6bbdb'], [28, -58, 12, 16, '#9db3d6']].forEach(([x, z, r, h, c]) => {
        cone(r, h, c, x, h / 2, z, scene, 7);
        cone(r * 0.38, h * 0.38, '#ffffff', x, h - h * 0.19 + 0.05, z, scene, 7);
      });
      // pines with snow on top
      [[-12, -12, 1.5], [-9, -18, 1.8], [-15, -6, 1.2], [10, -14, 1.6], [14, -8, 1.3], [6, -22, 2], [-3, -24, 1.7], [17, -18, 1.9]].forEach(([x, z, s]) => {
        tree(x, z, s, '#2f7d4a', 'pine');
        cone(0.45 * s, 0.6 * s, '#ffffff', x, 3.65 * s, z, scene, 10);
      });
      // the big snowman
      const sm = (x, z, s, hat) => {
        ball(1.1 * s, '#ffffff', x, 1.0 * s, z);
        ball(0.8 * s, '#ffffff', x, 2.55 * s, z);
        ball(0.58 * s, '#ffffff', x, 3.65 * s, z);
        const n = cone(0.12 * s, 0.6 * s, '#ff8a1f', x, 3.65 * s, z + 0.75 * s);
        n.rotation.x = Math.PI / 2;
        for (const dx of [-0.2, 0.2]) ball(0.07 * s, '#222', x + dx * s, 3.82 * s, z + 0.5 * s);
        for (const dy of [2.4, 2.75, 3.1]) ball(0.08 * s, '#222', x, dy * s, z + 0.77 * s);
        const sc = add(new T.TorusGeometry(0.55 * s, 0.14 * s, 8, 20), hat, x, 3.15 * s, z);
        sc.rotation.x = Math.PI / 2;
        cyl(0.42 * s, 0.42 * s, 0.6 * s, '#26262e', x, 4.45 * s, z);
        cyl(0.62 * s, 0.62 * s, 0.08 * s, '#26262e', x, 4.15 * s, z);
        const arm = box(1.4 * s, 0.08, 0.08, '#6b4a2e', x + 1.1 * s, 2.8 * s, z);
        arm.rotation.z = 0.5;
        const arm2 = box(1.4 * s, 0.08, 0.08, '#6b4a2e', x - 1.1 * s, 2.8 * s, z);
        arm2.rotation.z = -0.6;
      };
      sm(-5.4, -4, 1, '#e8463c');
      sm(6.8, -9, 0.7, '#3c78d8');
      // the igloo
      const blocks = tex(256, 128, (g, w, h) => {
        g.fillStyle = '#f4f8ff';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = '#b8cbe6';
        g.lineWidth = 3;
        for (let r = 0; r < 8; r++) {
          g.beginPath();
          g.moveTo(0, r * 16);
          g.lineTo(w, r * 16);
          g.stroke();
          for (let c = 0; c < 8; c++) {
            g.beginPath();
            g.moveTo(c * 32 + (r % 2) * 16, r * 16);
            g.lineTo(c * 32 + (r % 2) * 16, r * 16 + 16);
            g.stroke();
          }
        }
      });
      add(new T.SphereGeometry(2.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#ffffff', { map: blocks }), 11, 0, -15);
      box(1.4, 1.5, 1.4, mat('#ffffff', { map: blocks }), 10.2, 0.75, -12.6);
      box(0.9, 1.1, 0.2, '#33405a', 10.2, 0.6, -11.9);
      // Teddy throws, Tommy cheers, a sled and a pile of snowballs
      kid('teddy', 'straight', 0, -1.6, 0, -0.6, Math.PI - 0.5);
      ball(0.25, '#ffffff', -0.4, 1.9, 0.6);
      kid('tommy', 'peace', 0, 2.2, 0, 0.6, Math.PI + 0.2);
      for (let i = 0; i < 6; i++) ball(0.28, '#ffffff', 4.4 + (i % 3) * 0.5 - (i > 2 ? -0.25 : 0), 0.28 + (i > 2 ? 0.42 : 0), 1.2);
      // the sled, a penguin, footprints and little pines at the front, so the bottom pieces aren't all white
      const sled = new T.Group();
      box(2.2, 0.22, 1, '#e8463c', 0, 0.45, 0, sled);
      box(2.4, 0.08, 0.08, '#ffd400', 0, 0.15, -0.4, sled);
      box(2.4, 0.08, 0.08, '#ffd400', 0, 0.15, 0.4, sled);
      sled.position.set(-4.6, 0, 4.2);
      sled.rotation.y = 0.5;
      scene.add(sled);
      const peng = new T.Group();
      ball(0.5, '#22252e', 0, 0.55, 0, peng).scale.y = 1.25;
      ball(0.38, '#ffffff', 0, 0.5, 0.2, peng).scale.y = 1.2;
      ball(0.32, '#22252e', 0, 1.25, 0, peng);
      const beak = cone(0.08, 0.25, '#ff9a1f', 0, 1.22, 0.36, peng);
      beak.rotation.x = Math.PI / 2;
      for (const dx of [-0.12, 0.12]) ball(0.05, '#ffffff', dx, 1.33, 0.27, peng);
      for (const dx of [-0.15, 0.15]) box(0.2, 0.06, 0.3, '#ff9a1f', dx, 0.03, 0.15, peng);
      peng.position.set(5.6, 0, 3.6);
      peng.rotation.y = -0.4;
      scene.add(peng);
      for (let i = 0; i < 9; i++) {
        const fp = box(0.22, 0.02, 0.34, '#b9cde8', 1.2 + i * 0.55 + (i % 2) * 0.1, 0.01, 6.2 - i * 0.7 + (i % 2) * 0.25);
        fp.castShadow = false;
      }
      for (const [x, z, s2] of [[-8.6, 3.5, 0.8], [8.8, 2.6, 0.9], [-9.8, -1, 1]]) {
        tree(x, z, s2, '#2f7d4a', 'pine');
        cone(0.45 * s2, 0.6 * s2, '#ffffff', x, 3.65 * s2, z, scene, 10);
      }
      const scarfC = ['#ff3d7f', '#18d4ff', '#ffd400'];
      for (let i = 0; i < 3; i++) box(0.36, 0.5, 0.12, scarfC[i], -2.8 + i * 0.5, 0.25, 5.2 + (i % 2) * 0.2).rotation.y = i * 0.6; // mittens dropped in the snow
      // falling snow
      const flake = mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.4 });
      for (let i = 0; i < 90; i++) {
        const f = ball(R(0.08, 0.16), flake, R(-14, 14), R(1, 15), R(-20, 4), scene, 6);
        f.castShadow = false;
      }
      sun(-12, 15, -50, 2.4, '#fff7c4');
      cloud(8, 15, -40, 2.4);
      cloud(-4, 18, -48, 2);
      cloud(-16, 11, -36, 1.6, '#f0f6ff');
      bird(2, 13, -26, 1.1);
      return { pos: [0, 5.6, 13], look: [0, 3.2, -6], hw: 10, hh: 6.2 };
    },

    // ⚽ Soccer: a striped pitch, Tommy in goal with his Y, Teddy running in with the ball, a crowd behind
    soccer() {
      sky([[0, '#2f7bff'], [0.6, '#88c4ff'], [1, '#dff0ff']]);
      lights({ dir: [-10, 18, 12], extent: 26 });
      const pitch = tex(512, 512, (g, w, h) => {
        for (let i = 0; i < 8; i++) {
          g.fillStyle = i % 2 ? '#4cb84a' : '#3fa63e';
          g.fillRect(0, (i * h) / 8, w, h / 8 + 1);
        }
        g.strokeStyle = '#ffffff';
        g.lineWidth = 6;
        g.strokeRect(w * 0.2, -10, w * 0.6, h * 0.36);
        g.strokeRect(w * 0.36, -10, w * 0.28, h * 0.14);
        g.beginPath();
        g.arc(w / 2, h * 0.36, w * 0.12, 0, Math.PI);
        g.stroke();
        g.beginPath();
        g.moveTo(0, h * 0.97);
        g.lineTo(w, h * 0.97);
        g.stroke();
        g.beginPath();
        g.arc(w / 2, h * 0.97, w * 0.14, Math.PI, 0);
        g.stroke();
        g.strokeRect(4, -10, w - 8, h * 2);
      });
      ground('#3fa63e', 34, 30, pitch, 0, -6);
      // the goal
      const post = mat('#ffffff', { roughness: 0.4 });
      for (const x of [-3.6, 3.6]) cyl(0.14, 0.14, 2.6, post, x, 1.3, -14);
      const bar = cyl(0.14, 0.14, 7.4, post, 0, 2.6, -14);
      bar.rotation.z = Math.PI / 2;
      const netTex = tex(128, 128, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.strokeStyle = 'rgba(255,255,255,0.95)';
        g.lineWidth = 3;
        for (let i = 0; i <= 8; i++) {
          g.beginPath();
          g.moveTo((i * w) / 8, 0);
          g.lineTo((i * w) / 8, h);
          g.moveTo(0, (i * h) / 8);
          g.lineTo(w, (i * h) / 8);
          g.stroke();
        }
      }, [5, 2]);
      const netM = new T.MeshStandardMaterial({ map: netTex, transparent: true, side: T.DoubleSide, roughness: 1 });
      const back = add(new T.PlaneGeometry(7.2, 2.6), netM, 0, 1.3, -15.6);
      back.castShadow = false;
      for (const x of [-3.6, 3.6]) {
        const s = add(new T.PlaneGeometry(1.6, 2.6), netM, x, 1.3, -14.8);
        s.rotation.y = Math.PI / 2;
        s.castShadow = false;
      }
      const top = add(new T.PlaneGeometry(7.2, 1.6), netM, 0, 2.6, -14.8);
      top.rotation.x = Math.PI / 2;
      top.castShadow = false;
      // Tommy in goal, Teddy running in, the ball in front of him
      kid('tommy', 'peace', 0, 0.3, 0, -13.2);
      kid('teddy', 'run', 2.2, -1.2, 0, -3, Math.PI + 0.4);
      const ballTex = tex(256, 128, (g, w, h) => {
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#1d1d24';
        for (let i = 0; i < 12; i++) {
          const x = ((i % 6) + (i > 5 ? 0.5 : 0)) * (w / 6) + 10, y = i > 5 ? h * 0.72 : h * 0.28;
          g.beginPath();
          for (let k = 0; k < 5; k++) g.lineTo(x + Math.cos((k * 2 * Math.PI) / 5) * 14, y + Math.sin((k * 2 * Math.PI) / 5) * 14);
          g.fill();
        }
      });
      ball(0.4, mat('#ffffff', { map: ballTex, roughness: 0.5 }), -0.3, 0.4, -5.2);
      // corner flags
      for (const x of [-15, 15]) {
        cyl(0.05, 0.05, 1.8, '#ffffff', x, 0.9, -19);
        box(0.6, 0.4, 0.04, '#ffd400', x + 0.3, 1.6, -19);
      }
      // the stand behind: rows of fans in team colours, and a TT banner
      const fans = ['#ff3d7f', '#ffd400', '#18d4ff', '#ffffff', '#ff8a1f', '#3c78d8'];
      for (let r = 0; r < 5; r++) {
        box(34, 0.8, 1.4, r % 2 ? '#c9ced6' : '#b0b6c0', 0, 0.4 + r * 0.8, -21 - r * 1.4);
        for (let k = 0; k < 30; k++) {
          if (rnd() < 0.25) continue;
          const x = -16 + k * 1.1 + R(-0.1, 0.1), y = 0.8 + r * 0.8, z = -21 - r * 1.4;
          box(0.6, 0.6, 0.4, fans[Math.floor(rnd() * fans.length)], x, y + 0.3, z);
          ball(0.24, rnd() < 0.5 ? '#efc29c' : '#b27a52', x, y + 0.82, z);
        }
      }
      const banner = tex(512, 96, (g, w, h) => {
        g.fillStyle = '#ff3d7f';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#ffd400';
        for (let i = 0; i < 9; i++) {
          g.beginPath();
          const cx = 30 + i * 56, cy = h / 2;
          for (let k = 0; k < 10; k++) g.lineTo(cx + Math.cos((k * Math.PI) / 5 - Math.PI / 2) * (k % 2 ? 9 : 22), cy + Math.sin((k * Math.PI) / 5 - Math.PI / 2) * (k % 2 ? 9 : 22));
          g.fill();
        }
        g.fillStyle = '#ffffff';
        g.font = 'bold 64px Arial Black, Arial';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('TT', w / 2, h / 2 + 3);
      });
      box(12, 1.6, 0.1, mat('#ffffff', { map: banner }), 0, 5.6, -27.6);
      // floodlights
      for (const x of [-17, 17]) {
        cyl(0.25, 0.3, 14, '#9aa0aa', x, 7, -26);
        box(3, 1.8, 0.5, '#e6e9ee', x, 14.4, -26);
        box(2.6, 1.4, 0.1, new T.MeshBasicMaterial({ color: '#fffbe0' }), x, 14.4, -25.7);
      }
      cloud(-8, 16, -40, 2.4);
      cloud(7, 18, -46, 2.8);
      cloud(-1, 12, -34, 1.4);
      balloon(10, 10, -18, '#ff3d7f');
      balloon(-11, 11, -19, '#ffd400');
      bird(3, 13, -24, 1.1);
      return { pos: [0, 6.2, 11], look: [0, 3.8, -10], hw: 10.5, hh: 6.4 };
    },

    // 🚀 The moon: a rocket, the Earth and a ringed planet, a rover, and the brothers in bubble helmets
    moon() {
      sky([[0, '#0b0624'], [0.6, '#2a1d5c'], [1, '#5a3d9c']], 900);
      lights({ dir: [-14, 12, 10], sky: '#c8c0ff', ground: '#3a3050', hemi: 0.7, power: 1.3, extent: 24 });
      const dust = tex(512, 512, (g, w, h) => {
        g.fillStyle = '#b9b4c4';
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 1800; i++) {
          g.fillStyle = ['#a6a1b3', '#cbc6d4', '#9a95a8', '#d8d4e0'][i % 4];
          g.fillRect(R(0, w), R(0, h), R(1, 4), R(1, 4));
        }
        for (let i = 0; i < 26; i++) {
          const x = R(0, w), y = R(0, h), r = R(8, 34);
          g.fillStyle = 'rgba(80,72,100,0.35)';
          g.beginPath();
          g.arc(x, y, r, 0, 7);
          g.fill();
          g.strokeStyle = 'rgba(240,236,250,0.6)';
          g.lineWidth = 3;
          g.beginPath();
          g.arc(x - 1, y - 1, r, Math.PI * 0.9, Math.PI * 1.9);
          g.stroke();
        }
      }, [4, 4]);
      ground('#b9b4c4', 80, 80, dust, 0, -20);
      for (const [x, z, r] of [[-7, 1, 1.6], [6, -3, 2.2], [-12, -10, 2.6], [11, -12, 1.8]]) {
        const c = add(new T.TorusGeometry(r, 0.3, 8, 24), '#a9a3b8', x, 0.05, z);
        c.rotation.x = Math.PI / 2;
        c.scale.z = 0.5;
      }
      // the Earth, a ringed planet, a little moon
      const earth = tex(256, 128, (g, w, h) => {
        g.fillStyle = '#2f7bff';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#3fbf4a';
        for (let i = 0; i < 14; i++) {
          g.beginPath();
          g.ellipse(R(0, w), R(20, h - 20), R(10, 30), R(8, 20), R(0, 3), 0, 7);
          g.fill();
        }
        g.fillStyle = 'rgba(255,255,255,0.85)';
        for (let i = 0; i < 10; i++) {
          g.beginPath();
          g.ellipse(R(0, w), R(10, h - 10), R(10, 26), R(3, 6), 0, 0, 7);
          g.fill();
        }
      });
      ball(4.2, mat('#ffffff', { map: earth, emissive: '#1a2a60', emissiveIntensity: 0.3 }), -14, 15, -40, scene, 32);
      ball(2.6, mat('#ff9a4a', { emissive: '#552200', emissiveIntensity: 0.3 }), 13, 16, -36, scene, 28);
      const ring = add(new T.TorusGeometry(4.2, 0.35, 6, 40), mat('#ffd98a', { emissive: '#553300', emissiveIntensity: 0.3 }), 13, 16, -36);
      ring.rotation.x = 1.2;
      ring.scale.z = 0.25;
      ball(1, mat('#e8e2ff', { emissive: '#333355', emissiveIntensity: 0.4 }), 3, 19, -38);
      // the rocket
      const body = mat('#f4f4f8', { roughness: 0.4 }), red = mat('#e8463c', { roughness: 0.5 });
      cyl(1.3, 1.3, 7, body, -7, 4.2, -9);
      cone(1.3, 2.6, red, -7, 9, -9);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + 0.4;
        const f = box(0.2, 2.2, 1.6, red, -7 + Math.cos(a) * 1.4, 1.5, -9 + Math.sin(a) * 1.4);
        f.rotation.y = -a;
      }
      for (const y of [6, 4.2]) {
        const w = cyl(0.55, 0.55, 0.2, mat('#7fd8ff', { emissive: '#1a5a80', emissiveIntensity: 0.6 }), -7, y, -7.75);
        w.rotation.x = Math.PI / 2;
      }
      cyl(1.35, 1.35, 0.5, red, -7, 2.6, -9);
      // the rover
      box(3, 0.9, 2, '#ffd400', 7.6, 1.3, -6);
      box(1.2, 0.8, 1.6, '#7fd8ff', 7.2, 2.1, -6);
      for (const [dx, dz] of [[-1.1, -1.05], [1.1, -1.05], [-1.1, 1.05], [1.1, 1.05]]) {
        const w = cyl(0.55, 0.55, 0.4, '#3a3d48', 7.6 + dx, 0.55, -6 + dz);
        w.rotation.x = Math.PI / 2;
      }
      cyl(0.05, 0.05, 1.6, '#888', 8.6, 2.5, -6.4);
      ball(0.25, '#ff3d7f', 8.6, 3.3, -6.4);
      // the TT flag
      cyl(0.06, 0.06, 3.4, '#dddddd', 2.6, 1.7, -8);
      const flag = tex(192, 128, (g, w, h) => {
        stripesOn(g, w, h, ['#18d4ff', '#ffd400', '#ff3d7f']);
        g.fillStyle = '#ffffff';
        g.font = 'bold 70px Arial Black, Arial';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('TT', w / 2, h / 2 + 4);
      });
      box(1.8, 1.2, 0.04, mat('#ffffff', { map: flag }), 3.5, 2.8, -8);
      // the brothers in bubble helmets: Teddy floating up in a jump, Tommy's Y
      const glass = new T.MeshStandardMaterial({ color: '#cfefff', transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.2, depthWrite: false });
      const helmet = (p) => {
        const h = new T.Mesh(new T.SphereGeometry(0.62, 20, 14), glass);
        h.position.set(0, 0.3, 0);
        p.head.add(h);
      };
      kid('teddy', 'jump', 0.5, -1.8, 1.6, -2, Math.PI + 0.3, helmet);
      kid('tommy', 'peace', 0, 1.6, 0, -1.2, Math.PI - 0.3, helmet);
      // a little UFO like the one on Tommy's tee
      const ufo = new T.Group();
      ball(1.2, mat('#9aa6b8', { metalness: 0.5, roughness: 0.3 }), 0, 0, 0, ufo).scale.y = 0.3;
      ball(0.55, mat('#7fffd0', { transparent: true, opacity: 0.8 }), 0, 0.3, 0, ufo);
      for (let i = 0; i < 6; i++) ball(0.12, new T.MeshBasicMaterial({ color: ['#ff3d7f', '#ffd400', '#18d4ff'][i % 3] }), Math.cos(i) * 1.05, -0.05, Math.sin(i) * 1.05, ufo);
      ufo.position.set(2, 11, -16);
      ufo.rotation.z = -0.15;
      scene.add(ufo);
      return { pos: [0, 5.4, 13], look: [0, 4.6, -8], hw: 10, hh: 6.6 };
    },

    // 🐉 Dragon boat: a red dragon boat side-on with the brothers aboard, a green boat behind, a pagoda and lanterns
    dragon() {
      sky([[0, '#ff7a6a'], [0.45, '#ffb36a'], [1, '#ffe6b0']]);
      lights({ dir: [-12, 14, 14], sun: '#ffe2c0', extent: 24 });
      const water = tex(512, 512, (g, w, h) => {
        g.fillStyle = '#2aa6c8';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(255,255,255,0.55)';
        g.lineWidth = 4;
        for (let i = 0; i < 60; i++) {
          const x = R(0, w), y = R(0, h);
          g.beginPath();
          g.arc(x, y, 14, Math.PI * 1.15, Math.PI * 1.85);
          g.stroke();
        }
        g.fillStyle = 'rgba(20,80,120,0.25)';
        for (let i = 0; i < 40; i++) g.fillRect(R(0, w), R(0, h), R(20, 60), 3);
      }, [5, 5]);
      ground('#2aa6c8', 90, 60, water, 0, -10);
      // the far bank: grass, hills, trees, a pagoda, a bridge
      box(90, 1.2, 14, '#6cc25a', 0, 0.3, -30);
      [[-20, -40, 9, '#5aaa4a'], [-4, -44, 12, '#4f9c44'], [14, -42, 10, '#5aaa4a'], [28, -38, 8, '#63b552']].forEach(([x, z, r, c]) => ball(r, c, x, 0, z, scene, 20));
      for (const [x, s] of [[-16, 1.5], [-11, 1.2], [10, 1.4], [18, 1.6], [24, 1.2]]) {
        cyl(0.18 * s, 0.24 * s, 1.4 * s, '#7a4b2a', x, 0.9 + 0.7 * s, -27);
        ball(1.1 * s, '#ff9ac2', x, 0.9 + 2.2 * s, -27, scene, 14); // blossom trees
      }
      const pag = (x, z) => {
        for (let i = 0; i < 4; i++) {
          const w = 4.2 - i * 0.8;
          box(w * 0.7, 1.6, w * 0.7, '#e84a3c', x, 1.7 + i * 2.1, z);
          const roof = cone(w * 0.85, 1, '#2e7d5a', x, 2.9 + i * 2.1, z, scene, 4);
          roof.rotation.y = Math.PI / 4;
        }
        cone(0.2, 1.4, '#ffd400', x, 10.6, z, scene, 8);
      };
      pag(-4, -30);
      box(10, 0.5, 2, '#e84a3c', 9, 2.6, -24);
      for (const x of [4.6, 13.4]) box(0.5, 2.2, 0.5, '#c23a2e', x, 1.4, -24);
      // lanterns on a string
      for (let i = 0; i < 9; i++) {
        const x = -14 + i * 3.5, y = 8 - Math.sin((i / 8) * Math.PI) * 1.6;
        const l = ball(0.5, mat('#ff3d3d', { emissive: '#aa1010', emissiveIntensity: 0.5 }), x, y, -16);
        l.scale.y = 1.2;
        cyl(0.3, 0.3, 0.12, '#ffd400', x, y + 0.6, -16);
        cyl(0.3, 0.3, 0.12, '#ffd400', x, y - 0.6, -16);
      }
      // the green boat behind
      const scales = (c1, c2) => tex(256, 64, (g, w, h) => {
        g.fillStyle = c1;
        g.fillRect(0, 0, w, h);
        g.fillStyle = c2;
        for (let r = 0; r < 3; r++) for (let c = 0; c < 17; c++) {
          g.beginPath();
          g.arc(c * 16 + (r % 2) * 8, r * 22 + 12, 9, 0, Math.PI);
          g.fill();
        }
      }, [3, 1]);
      box(12, 0.9, 1.6, mat('#ffffff', { map: scales('#2f9c5a', '#ffd400') }), 4, 0.4, -9);
      for (let i = 0; i < 5; i++) kid(['luna', 'zoom', 'bruno', 'bolt', 'luna'][i], 'grab', i * 0.6, -0.4 + i * 2, 0.1, -9, Math.PI / 2 + Math.PI).root.scale.setScalar(0.6);
      // the red dragon boat, side-on
      const hull = box(13, 1.1, 2.2, mat('#ffffff', { map: scales('#e8352c', '#ffd400') }), 0, 0.5, -1);
      hull.castShadow = true;
      box(13.2, 0.18, 2.4, '#ffd400', 0, 1.1, -1);
      // the head: neck, head, eyes, horns, a red tongue; the tail curling up
      box(1.2, 2.2, 1, '#e8352c', 6.8, 1.9, -1);
      box(2, 1.2, 1.3, '#e8352c', 7.6, 3.2, -1);
      box(1.1, 0.4, 1.1, '#ffd400', 8.3, 2.6, -1);
      for (const dz of [-0.45, 0.45]) {
        ball(0.22, '#ffffff', 7.4, 3.55, -1 + dz);
        ball(0.11, '#111', 7.55, 3.58, -1 + dz * 1.3);
        const h = cone(0.16, 0.8, '#ffd400', 7.0, 4.1, -1 + dz);
        h.rotation.z = 0.5;
      }
      cone(0.3, 0.9, '#2fbf6a', 6.6, 3.9, -1).rotation.z = 0.9;
      const tail = cone(0.5, 2.4, '#e8352c', -7, 1.8, -1);
      tail.rotation.z = 0.9;
      // the brothers aboard: Teddy on the drum, Tommy's Y at the front; friends paddling
      cyl(0.6, 0.6, 0.8, '#c23a2e', -3.6, 1.6, -1);
      cyl(0.62, 0.62, 0.06, '#f4e2c0', -3.6, 2.03, -1);
      kid('teddy', 'jab', 0, -4.8, 1.0, -1, Math.PI / 2 + Math.PI * 0.85);
      kid('tommy', 'peace', 0, 4.6, 1.0, -0.8, Math.PI - 0.2);
      for (let i = 0; i < 3; i++) {
        const p = kid(['bruno', 'zoom', 'luna'][i], 'grab', i, -1.4 + i * 1.8, 0.7, -0.6, Math.PI / 2 + Math.PI);
        p.root.scale.setScalar(0.8);
        const paddle = box(0.12, 2.4, 0.3, '#8a5a2a', -1.4 + i * 1.8, 0.8, 0.5);
        paddle.rotation.x = 0.4;
      }
      // splashes
      for (let i = 0; i < 14; i++) ball(R(0.15, 0.35), mat('#ffffff', { transparent: true, opacity: 0.85 }), R(-7, 8), R(0.1, 0.5), R(0.4, 1.2), scene, 8);
      sun(12, 11, -50, 2.6, '#fff0a0');
      cloud(-10, 14, -44, 2.2, '#fff0f0');
      cloud(4, 16, -48, 2.6, '#fff4e8');
      cloud(18, 13, -40, 1.6, '#fff0f0');
      bird(-4, 13, -30, 1.1);
      bird(1, 14.5, -34, 0.9);
      return { pos: [0, 5.4, 14], look: [0.4, 3.8, -6], hw: 10.4, hh: 6.4 };
    },
  };
  function stripesOn(g, w, h, colors) {
    colors.forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(0, (i * h) / colors.length, w, h / colors.length + 1);
    });
  }

  // ---------------------------------------------------------------- render

  let renderer = null;
  const cache = new Map();
  function getRenderer() {
    if (renderer) return renderer;
    renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    return renderer;
  }

  // The scene `id` as a w x h canvas. The camera keeps its spot and widens (or narrows) its view so the scene's
  // box (hw x hh around `look`) always fits, whatever the shape.
  function render(id, w, h) {
    const key = `${id}:${w}x${h}`;
    if (cache.has(key)) return cache.get(key);
    const r = getRenderer();
    r.setSize(w, h, false);
    scene = new T.Scene();
    rnd = JG.rules.rng(LIST.findIndex((s) => s.id === id) * 977 + 5);
    const v = (BUILD[id] || BUILD.metro)();
    const cam = new T.PerspectiveCamera(40, w / h, 0.5, 400);
    cam.position.set(...v.pos);
    cam.lookAt(...v.look);
    const dist = Math.hypot(v.pos[0] - v.look[0], v.pos[1] - v.look[1], v.pos[2] - v.look[2]);
    const half = Math.max(v.hh, v.hw / (w / h));
    cam.fov = (2 * Math.atan(half / dist) * 180) / Math.PI;
    cam.updateProjectionMatrix();
    r.render(scene, cam);
    const [c, g] = makeCanvas(w, h);
    g.drawImage(r.domElement, 0, 0);
    // tidy up the scene's GPU bits (the canvas copy is all we keep)
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      ms.forEach((m) => {
        if (m.map && m.map !== Kit.gfx.glowTexture()) m.map.dispose();
        m.dispose();
      });
    });
    if (scene.background && scene.background.dispose) scene.background.dispose();
    scene = null;
    cache.set(key, c);
    return c;
  }

  JG.scenes = { LIST, render, ids: LIST.map((s) => s.id), get: (id) => LIST.find((s) => s.id === id) || LIST[0] };
})();
