/* TT Jigsaw: your brother. In 1 player the other brother (Kit.roster.buddyFor: Teddy when Tommy plays,
   Tommy for Teddy) comes when called with T or his face button, any time and as often as you like. A visit:
     pop in on a little cloud (at his roster buddyScale, in a puff of stars) → hello with his signature move (Teddy's
     boxing combo or jump shot, Tommy's Y with ✌️) → toss you a treat (🍦 💧 🧃 🍪 🍉 🍌) → place one of your pieces:
     it lifts out of your tray in a gold ring and flies to its home ("TOMMY SAYS: THIS ONE GOES HERE!"), and he points
     at it → goodbye move → pop out. It counts as yours.
   Calling him again while he's there brings another treat and another piece.
   In 2 players both brothers are playing, so T is a high five (JG.highFive): they pop in, run together, slap hands
   and pop out again. It doesn't change the game. */
(function () {
  'use strict';
  const T = THREE;
  const JG = (window.JG = window.JG || {});
  const { pick, emojiTexture, rand } = Kit.gfx;

  const V = { pop: 0.35, treatAt: 2.0, helpAt: 2.6, stay: 3.2 };
  const TREATS = [['🍦', 'ICE CREAM'], ['💧', 'WATER'], ['🧃', 'JUICE BOX'], ['🍪', 'COOKIE'], ['🍉', 'WATERMELON'], ['🍌', 'BANANA']];
  const SAYS = ['THIS ONE GOES HERE!', 'I FOUND ONE!', 'HERE YOU GO!'];

  let api = null, entry = null, flyers = null, cloud = null;
  const actor = JG.makeActor();
  // phase: off | in | here | bye | out
  const b = { phase: 'off', t: 0, given: false, treatAt: V.treatAt, helped: false, placed: -1, doneAt: -1, calls: 0, treats: 0, pieces: 0, lastTreat: null, popT: 0, size: 1 };
  const treat = { sprite: null, flyT: -1, emoji: '', from: new T.Vector3(), to: new T.Vector3() };
  const tmp = new T.Vector3();

  function makeCloud() {
    const g = new T.Group();
    const m = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
    const geo = new T.SphereGeometry(1, 14, 10);
    [[0, 0, 0, 0.55], [-0.5, -0.05, 0.05, 0.38], [0.52, -0.04, 0.02, 0.4], [-0.2, 0.05, 0.3, 0.36], [0.25, 0.02, 0.32, 0.34]].forEach(([x, y, z, r]) => {
      const s = new T.Mesh(geo, m);
      s.position.set(x, y - 0.12, z);
      s.scale.set(r, r * 0.55, r);
      g.add(s);
    });
    return g;
  }

  function init(a) {
    api = a;
    flyers = a.flyers;
    const scene = JG.stage.scene;
    treat.sprite = new T.Sprite(new T.SpriteMaterial({ depthWrite: false, depthTest: false, transparent: true }));
    treat.sprite.visible = false;
    treat.sprite.renderOrder = 22;
    scene.add(treat.sprite);
    actor.attach(scene, flyers);
    actor.visible = false;
    cloud = makeCloud();
    cloud.visible = false;
    scene.add(cloud);
    hf.actors = [JG.makeActor(), JG.makeActor()];
    hf.actors.forEach((x, i) => {
      x.attach(scene, flyers);
      x.set(i ? 'tommy' : 'teddy', 1);
      x.visible = false;
    });
  }

  // The brother for this player (rebuilt only when he changes). Returns his roster entry.
  function setFor(playerId) {
    const id = Kit.roster.buddyFor(playerId);
    if (entry && entry.id === id) return entry;
    dismiss();
    entry = Kit.roster.get(id);
    actor.set(id, 1);
    const tag = Kit.gfx.nameTag(entry.name, entry.tag || '#ffb02e');
    tag.position.y = 2.75;
    actor.person.root.add(tag);
    actor.visible = false;
    return entry;
  }

  function call() {
    if (!entry) return 'none';
    b.calls++;
    if (b.phase === 'off' || b.phase === 'out') return summon();
    // another hello, another treat, another piece
    actor.react('hello');
    b.phase = 'here';
    b.t = Math.min(b.t, V.pop + 0.1);
    b.given = false;
    b.treatAt = b.t + 1.5;
    b.helped = false;
    b.doneAt = -1;
    api.toast(`${entry.name}'S HERE!`, 'buddy');
    JG.sfx.pop();
    return 'again';
  }

  function place() {
    const s = api.spot();
    b.size = Math.min(entry.buddyScale || 0.8, s.max);
    JG.stage.stageAt(s.x, s.y, tmp);
    actor.place(tmp.x, tmp.y, 0);
    cloud.position.set(tmp.x, tmp.y, 0);
    return s;
  }

  function summon() {
    Object.assign(b, { phase: 'in', t: 0, given: false, treatAt: V.treatAt, helped: false, placed: -1, doneAt: -1, popT: 0 });
    place();
    actor.setScale(0.01);
    actor.face = null;
    actor.faceDefault = Math.PI;
    actor.visible = true;
    cloud.visible = true;
    actor.react('idle');
    const p = actor.root.position;
    for (let i = 0; i < 14; i++) flyers.add(i % 3 ? '⭐' : '✨', p.x, p.y + 1, 0.5, rand(-2.5, 2.5), rand(1, 4), rand(0.3, 0.5), 0.8, rand(-4, 4), 3);
    api.toast(`${entry.name}'S HERE!`, 'buddy');
    JG.sfx.pop();
    return 'summoned';
  }

  function dismiss() {
    b.phase = 'off';
    actor.visible = false;
    if (cloud) cloud.visible = false;
    treat.flyT = -1;
    if (treat.sprite) treat.sprite.visible = false;
  }

  // A new picture (or home): he leaves straight away, and the high five stops.
  function reset() {
    dismiss();
    cancelHighFive();
  }

  // ---------------------------------------------------------------- the treat

  function giveTreat() {
    const [emoji, label] = pick(TREATS);
    treat.emoji = emoji;
    b.treats++;
    b.lastTreat = emoji;
    treat.sprite.material.map = emojiTexture(emoji);
    treat.sprite.material.needsUpdate = true;
    actor.root.updateMatrixWorld(true);
    Kit.people.handWorld(actor.person, 1, treat.from);
    treat.from.z = 1;
    treat.sprite.position.copy(treat.from);
    treat.sprite.scale.setScalar(0.8);
    treat.sprite.visible = true;
    treat.flyT = 0;
    api.toast(`${emoji} ${label} FROM ${entry.name}!`, 'treat');
    JG.sfx.kit('coin', 6);
  }

  function updateTreat(dt) {
    if (treat.flyT < 0) return;
    treat.flyT += dt / 0.7;
    const f = api.face();
    JG.stage.stageAt(f.x, f.y, treat.to);
    treat.to.z = 1;
    const k = Math.min(1, treat.flyT);
    treat.sprite.position.lerpVectors(treat.from, treat.to, k);
    treat.sprite.position.y += Math.sin(k * Math.PI) * 1.4;
    treat.sprite.material.rotation = k * Math.PI * 2;
    if (k >= 1) {
      treat.flyT = -1;
      treat.sprite.visible = false;
      treat.sprite.material.rotation = 0;
      api.gotTreat(treat.emoji);
    }
  }

  // ---------------------------------------------------------------- the visit

  function update(dt) {
    updateTreat(dt);
    updateHighFive(dt);
    if (b.phase === 'off') return;
    b.t += dt;
    const s = place();
    const full = b.size;
    if (b.phase === 'in' || b.phase === 'here' || b.phase === 'bye') {
      b.popT += dt;
      const u = Math.min(1, b.popT / V.pop);
      const spring = u < 1 ? 1 + Math.sin(u * Math.PI) * 0.25 : 1;
      actor.setScale(full * Math.max(0.01, u) * spring);
      cloud.scale.setScalar(full * Math.max(0.01, u));
    }
    if (b.phase === 'in' && b.t >= V.pop) {
      b.phase = 'here';
      actor.react('hello');
    }
    if (b.phase === 'here') {
      if (!b.given && b.t > b.treatAt - 0.35) actor.act('give', 0.6, 0, true);
      if (!b.given && b.t > b.treatAt) {
        b.given = true;
        giveTreat();
      }
      // place one of your pieces once the treat's on its way
      if (b.given && !b.helped && b.t > Math.max(V.helpAt, b.treatAt + 0.5)) {
        b.helped = true;
        const id = api.canHelp() ? api.placeOne() : -1;
        b.placed = id;
        if (id >= 0) {
          b.pieces++;
          api.toast(`${entry.name} SAYS: ${SAYS[(b.pieces - 1) % SAYS.length]}`, 'save');
          JG.sfx.sparkle();
        }
        b.doneAt = b.t;
      }
      // point at where it's going (his left or right, toward it)
      if (b.placed >= 0 && b.t - b.doneAt < V.stay) {
        const at = api.where(b.placed);
        if (at) {
          const dx = at.x - s.x;
          actor.face = Math.atan2(-Math.sign(dx || 1), -0.5);
          if (actor.mode !== 'signature') actor.act('point', 0.3, 0);
        }
      } else actor.face = null;
      if (b.doneAt >= 0 && treat.flyT < 0 && b.t > b.doneAt + V.stay) {
        b.phase = 'bye';
        b.t = 0;
        actor.face = null;
        actor.react('goodbye');
      }
    } else if (b.phase === 'bye') {
      if (b.t > 1.7) {
        b.phase = 'out';
        b.t = 0;
        JG.sfx.pop();
      }
    } else if (b.phase === 'out') {
      const u = Math.min(1, b.t / 0.25);
      actor.setScale(full * Math.max(0.01, 1 - u) * (1 + Math.sin(u * Math.PI) * 0.2));
      cloud.scale.setScalar(full * Math.max(0.01, 1 - u));
      if (u >= 1) {
        const p = actor.root.position;
        for (let i = 0; i < 8; i++) flyers.add('✨', p.x, p.y + 1, 0.5, rand(-2, 2), rand(1, 3), 0.35, 0.6, rand(-4, 4), 3);
        dismiss();
      }
    }
    actor.update(dt);
  }

  // ---------------------------------------------------------------- 2 players: the high five

  const hf = { on: false, t: 0, clapped: false, count: 0, actors: null, home: [] };
  function highFive() {
    if (hf.on) return 'busy';
    const s = api.spot2();
    hf.on = true;
    hf.t = 0;
    hf.clapped = false;
    hf.count++;
    hf.size = s.size;
    hf.home = [JG.stage.stageAt(s.x - s.apart, s.y, new T.Vector3()), JG.stage.stageAt(s.x + s.apart, s.y, new T.Vector3())];
    hf.meet = [JG.stage.stageAt(s.x - s.near, s.y, new T.Vector3()), JG.stage.stageAt(s.x + s.near, s.y, new T.Vector3())];
    hf.actors.forEach((a, i) => {
      a.place(hf.home[i].x, hf.home[i].y, 0);
      a.setScale(0.01);
      a.face = null;
      a.faceDefault = Math.PI;
      a.visible = true;
      a.react('idle');
    });
    JG.sfx.pop();
    return 'high5';
  }
  function updateHighFive(dt) {
    if (!hf.on) return;
    hf.t += dt;
    const [a, c] = hf.actors;
    const u = Math.min(1, hf.t / 0.3);
    const grow = hf.t < 2.6 ? u : Math.max(0.01, 1 - (hf.t - 2.6) / 0.25);
    a.setScale(hf.size * grow);
    c.setScale(hf.size * grow);
    if (hf.t > 0.35 && hf.t < 0.4) {
      a.moveTo(hf.meet[0].x, 0, 6);
      c.moveTo(hf.meet[1].x, 0, 6);
    }
    if (hf.t > 0.35 && !a.moving && !c.moving && !hf.clapped) {
      a.face = Math.atan2(-1, -0.4); // face each other (and a little toward us)
      c.face = Math.atan2(1, -0.4);
      if (hf.raise === undefined || hf.raise < 0) hf.raise = hf.t;
      a.act('high5', 0.8, 2.6, true);
      c.act('high5', 0.8, 2.6, true);
      if (hf.t > hf.raise + 0.28) {
        hf.clapped = true;
        JG.sfx.clap();
        const x = (a.root.position.x + c.root.position.x) / 2, y = a.root.position.y + 2.6 * hf.size;
        flyers.add('💥', x, y, 1, 0, 0.5, 1.0, 0.5, 0, 0);
        for (let i = 0; i < 8; i++) flyers.add(i % 2 ? '🙌' : '⭐', x, y, 1, rand(-2.5, 2.5), rand(1.5, 3.5), rand(0.4, 0.6), 1, rand(-3, 3), 4);
        api.toast('HIGH FIVE! 🙌', 'buddy');
      }
    }
    // keep their feet on the stage line while they run (moveTo only moves x and z)
    a.root.position.y = hf.home[0].y;
    c.root.position.y = hf.home[1].y;
    a.update(dt);
    c.update(dt);
    if (hf.t > 2.85) cancelHighFive();
  }
  function cancelHighFive() {
    if (!hf.actors) return;
    hf.on = false;
    hf.raise = -1;
    hf.actors.forEach((x) => (x.visible = false));
  }

  JG.buddy = {
    init, setFor, call, summon, dismiss, reset, update, V,
    get entry() { return entry; },
    get actor() { return actor; },
    get on() { return b.phase !== 'off'; },
    get phase() { return b.phase; },
    info() {
      return {
        phase: b.phase, id: entry && entry.id, t: +b.t.toFixed(2), given: b.given, placed: b.placed, calls: b.calls,
        treats: b.treats, pieces: b.pieces, lastTreat: b.lastTreat, pose: actor.pose, scale: +actor.scale.toFixed(2),
        visible: actor.visible, flying: treat.flyT >= 0, highFives: hf.count, highFiving: hf.on,
        highFivePoses: hf.actors ? hf.actors.map((x) => x.pose) : null,
      };
    },
  };
  JG.highFive = { start: highFive, cancel: cancelHighFive, get on() { return hf.on; } };
})();
